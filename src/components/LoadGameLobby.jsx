import React from 'react';
import { fonts, colors } from '../theme';
import { createLobby, subscribeLobby, updateLobbyMeta } from '../services/lobbyService';
import { writeGameState } from '../services/gameStateService';
import { getModeConfig } from '../data/gameModes';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * LoadGameLobby
 * GM flow for loading a save file into a new online lobby.
 * Phases: 'pick' → 'preview' → 'waiting' (lobby with save slots)
 */
const LoadGameLobby = ({ onGameStart, onBack }) => {
  const [phase,      setPhase]      = React.useState('pick');   // 'pick' | 'preview' | 'creating' | 'waiting' | 'error'
  const [saveData,   setSaveData]   = React.useState(null);
  const [fileName,   setFileName]   = React.useState('');
  const [error,      setError]      = React.useState('');
  const [lobbyCode,  setLobbyCode]  = React.useState('');
  const [gmUid,      setGmUid]      = React.useState('');
  const [lobbyData,  setLobbyData]  = React.useState({});
  const [saveSlots,  setSaveSlots]  = React.useState({}); // { [playerId]: { playerData, claimedByUid, isAbsent, isManual } }
  const [copied,     setCopied]     = React.useState(false);
  const fileInputRef = React.useRef(null);
  const unsubRef     = React.useRef(null);

  // ── File reading ───────────────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file) => {
    if (!file.name.endsWith('.json')) { setError('Please select a valid .json save file.'); return; }
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.players || !Array.isArray(data.players) || data.players.length === 0) {
          setError('Invalid save file — no players found.');
          return;
        }
        setSaveData(data);
        setPhase('preview');
      } catch {
        setError('Could not parse file. Make sure it is a valid Battle Tracker save.');
      }
    };
    reader.readAsText(file);
  };

  // ── Create lobby with save data ────────────────────────────────────────────
  const handleCreateLobby = async () => {
    setPhase('creating');
    try {
      const { code, uid } = await createLobby();
      setLobbyCode(code);
      setGmUid(uid);

      // Build save slots — one per player in the save file
      const slots = {};
      (saveData.players || []).forEach(p => {
        slots[p.id] = {
          playerData:   p,
          claimedByUid: null,
          isAbsent:     false,
        };
      });

      // Write save slots and isLoadedGame flag to Firestore
      const ref = doc(db, 'campaigns', code);
      await updateDoc(ref, {
        isLoadedGame: true,
        saveSlots:    slots,
        saveMetadata: {
          fileName,
          currentRound: saveData.currentRound || 1,
          playerCount:  saveData.players?.length || 0,
          savedAt:      saveData.savedAt || null,
        },
      });

      setSaveSlots(slots);
      setPhase('waiting');

      // Subscribe to live lobby updates
      unsubRef.current = subscribeLobby(code, (data) => {
        setLobbyData(data);
        if (data.saveSlots) setSaveSlots(data.saveSlots);
      });
    } catch (err) {
      setError(err.message);
      setPhase('preview');
    }
  };

  // ── Cycle slot state: default → manual → absent → default ─────────────────
  const cycleSlotState = async (playerId) => {
    const slot = saveSlots[playerId] || {};
    // Only cycle if not already claimed by a player
    if (slot.claimedByUid) return;
    const wasAbsent = slot.isAbsent || false;
    const wasManual = slot.isManual || false;
    // Cycle: default → manual → absent → default
    let nextAbsent = false;
    let nextManual = false;
    if (!wasManual && !wasAbsent) { nextManual = true; }
    else if (wasManual)           { nextAbsent = true; nextManual = false; }
    else                          { nextAbsent = false; nextManual = false; }
    const ref = doc(db, 'campaigns', lobbyCode);
    await updateDoc(ref, {
      [`saveSlots.${playerId}.isAbsent`]: nextAbsent,
      [`saveSlots.${playerId}.isManual`]: nextManual,
    });
    setSaveSlots(prev => ({ ...prev, [playerId]: { ...prev[playerId], isAbsent: nextAbsent, isManual: nextManual } }));
  };

  // ── Start game ────────────────────────────────────────────────────────────
  const handleStartGame = async () => {
    // Build full game state from save file
    const joinedPlayers = Object.values(lobbyData.players || {});

    // Map claimed save-file players: find which saved player each joined uid claimed
    const claimedMap = {}; // uid → playerId
    Object.entries(saveSlots).forEach(([playerId, slot]) => {
      if (slot.claimedByUid) claimedMap[slot.claimedByUid] = playerId;
    });

    // Build final player array:
    // 1. Claimed save-file players — full saved state, uid updated to claimer's uid, active
    // 2. Manual save-file players — full saved state, active (GM controls them)
    // 3. Absent save-file players — full saved state, isAbsent: true
    // 4. Unclaimed non-manual non-absent players — isAbsent: true (no one picked them)
    // 5. New players who created characters — fresh state
    const finalPlayers = [];

    // Saved players
    Object.entries(saveSlots).forEach(([playerId, slot]) => {
      const isManual  = slot.isManual  || false;
      const isAbsent  = slot.isAbsent  || false;
      const isClaimed = !!slot.claimedByUid;
      const player = {
        ...slot.playerData,
        isAbsent:  isAbsent || (!isClaimed && !isManual),
        isManual:  isManual,
      };
      if (isClaimed) {
        player.uid      = slot.claimedByUid;
        player.isAbsent = false;
        player.isManual = false;
      }
      finalPlayers.push(player);
    });

    // New players who created fresh characters
    joinedPlayers.forEach(joined => {
      const isClaimer = Object.values(claimedMap).length > 0 && claimedMap[joined.uid];
      if (!isClaimer) {
        // This player created a new character — they're not claiming a save slot
        const isAlreadyIn = finalPlayers.some(p => p.uid === joined.uid);
        if (!isAlreadyIn) {
          const config = getModeConfig('campaign');
          finalPlayers.push({
            id:           joined.uid || `player_${Date.now()}`,
            uid:          joined.uid || null,
            playerName:   joined.playerName || joined.commanderName || 'Player',
            faction:      joined.faction || 'Red Rovers',
            commander:    joined.commander || 'Lord Fantastic',
            playerColor:  joined.playerColor || '#3b82f6',
            isAbsent:     false,
            isSquad:      false,
            selectedUnit: 'commander',
            commanderStats: {
              hp: config.commanderHP, maxHp: config.commanderHP, baseMaxHp: config.commanderHP,
              cooldownRounds: 0, revives: config.commanderRevives, isDead: false,
            },
            subUnits: Array(5).fill(null).map((_, i) => ({
              hp: config.squadHP, maxHp: config.squadHP, baseMaxHp: config.squadHP,
              name: (joined.squadNames || [])[i] || '',
              unitType: i === 0 ? 'special' : 'soldier',
              revives: config.squadRevives, livesRemaining: config.squadLives ?? 1,
            })),
            squadMembers: [], actionHistory: [], reviveQueue: [], inventory: [],
          });
        }
      }
    });

    // Sort: locked-in players first (by lockedInAt ascending), then absent/unclaimed at bottom
    const getPlayerTime = (p) => {
      const slot = Object.values(saveSlots).find(s => s.claimedByUid === p.uid);
      if (slot?.lockedInAt) return slot.lockedInAt;
      const lobbyPlayer = joinedPlayers.find(jp => jp.uid === p.uid);
      if (lobbyPlayer?.joinedAt?.toMillis) return lobbyPlayer.joinedAt.toMillis();
      if (typeof lobbyPlayer?.joinedAt === 'number') return lobbyPlayer.joinedAt;
      return Infinity;
    };
    finalPlayers.sort((a, b) => {
      if (a.isAbsent && !b.isAbsent) return 1;
      if (!a.isAbsent && b.isAbsent) return -1;
      return getPlayerTime(a) - getPlayerTime(b);
    });

    // Build full game state from save file + updated players
    const initialState = {
      ...saveData,
      players:                  finalPlayers,
      gameStarted:              true,
      playersWhoActedThisRound: saveData.playersWhoActedThisRound || [],
    };

    await writeGameState(lobbyCode, initialState);
    await updateLobbyMeta(lobbyCode, { gameStarted: true });
    if (unsubRef.current) unsubRef.current();
    onGameStart({ lobbyCode, gmUid, initialState });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  React.useEffect(() => {
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // ── Pick file screen ───────────────────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
            <h2 style={heading}>LOAD GAME</h2>
            <div style={subText}>Select your campaign save file to continue</div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(201,169,97,0.35)',
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(201,169,97,0.04)',
              marginBottom: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⬆️</div>
            <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Drop your save file here
            </div>
            <div style={{ color: colors.textFaint, fontSize: '0.72rem' }}>
              or click to browse — .json files only
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={e => readFile(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {error && <div style={errorText}>{error}</div>}

          <button onClick={onBack} style={backBtn}>← Back to Home</button>
        </div>
      </div>
    );
  }

  // ── Preview screen ─────────────────────────────────────────────────────────
  if (phase === 'preview') {
    const players = saveData?.players || [];
    return (
      <div style={page}>
        <div style={{ ...card, maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>📋</div>
            <h2 style={heading}>SAVE FILE PREVIEW</h2>
            <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>
              {fileName}
            </div>
          </div>

          {/* Summary */}
          <div style={infoBox}>
            <Row label="Round" value={`Round ${saveData?.currentRound || 1}`} />
            <Row label="Players" value={players.length} />
            <Row label="NPCs" value={(saveData?.npcs || []).filter(n => !n.isDead).length + ' active'} />
            <Row label="Loot Pool" value={(saveData?.lootPool || []).length + ' items'} />
          </div>

          {/* Player list preview */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={sectionLabel}>Players in this save</div>
            {players.map((p, i) => (
              <div key={p.id || i} style={playerRow}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.playerColor || '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.88rem' }}>{p.playerName}</div>
                  <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>
                    {p.commander} · {p.faction} · {p.commanderStats?.hp ?? '?'}/{p.commanderStats?.maxHp ?? '?'} HP
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div style={errorText}>{error}</div>}

          <button onClick={handleCreateLobby} style={primaryBtn}>
            ✓ Create Lobby with this Save
            <div style={{ fontSize: '0.62rem', fontWeight: '600', opacity: 0.7, marginTop: '0.2rem', textTransform: 'none' }}>
              Players will join and claim their characters
            </div>
          </button>
          <button onClick={() => { setPhase('pick'); setSaveData(null); setError(''); }} style={backBtn}>
            ← Choose Different File
          </button>
        </div>
      </div>
    );
  }

  // ── Creating ───────────────────────────────────────────────────────────────
  if (phase === 'creating') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <div style={{ color: colors.textMuted, fontFamily: fonts.body }}>Setting up your lobby...</div>
      </div>
    );
  }

  // ── Waiting room ───────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    const joinedPlayers = Object.values(lobbyData.players || {});
    const slotList      = Object.entries(saveSlots)
      .sort(([, a], [, b]) => {
        // Locked-in players (have lockedInAt) sort first by time, then unclaimed at bottom
        const aClaimed = !!a.claimedByUid;
        const bClaimed = !!b.claimedByUid;
        if (aClaimed && !bClaimed) return -1;
        if (!aClaimed && bClaimed) return 1;
        if (aClaimed && bClaimed) return (a.lockedInAt || 0) - (b.lockedInAt || 0);
        return 0;
      });
    const allClaimed    = slotList.filter(([, s]) => !s.isAbsent && !s.isManual).every(([, s]) => s.claimedByUid);

    return (
      <div style={{ height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', fontFamily: fonts.body }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>👑</div>
            <h2 style={heading}>LOADED GAME LOBBY</h2>
            <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.2rem' }}>
              Round {saveData?.currentRound || 1} · {saveData?.players?.length} returning players
            </div>
          </div>

          {/* Lobby code */}
          <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '2px solid rgba(201,169,97,0.35)', borderRadius: '14px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lobby Code</div>
            <div style={{ fontFamily: '"Cinzel", Georgia, serif', color: colors.gold, fontSize: '2rem', fontWeight: '900', letterSpacing: '0.18em', textShadow: `0 0 24px ${colors.amber}50`, marginBottom: '0.85rem' }}>
              {lobbyCode}
            </div>
            <button onClick={copyCode} style={{ padding: '0.45rem 1.1rem', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,169,97,0.1)', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(201,169,97,0.3)'}`, color: copied ? '#4ade80' : colors.gold, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>

          {/* Save file player slots */}
          <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Returning Players — {slotList.filter(([, s]) => s.claimedByUid).length} claimed · {slotList.filter(([, s]) => s.isManual).length} manual · {slotList.filter(([, s]) => s.isAbsent).length} absent
            </div>
            {slotList.map(([playerId, slot]) => {
              const p       = slot.playerData;
              const absent  = slot.isAbsent || false;
              const manual  = slot.isManual  || false;
              const claimed = !!slot.claimedByUid;
              const dotColor   = absent ? '#6b7280' : manual ? '#f59e0b' : p.playerColor || '#3b82f6';
              const bgColor    = absent ? 'rgba(0,0,0,0.4)' : manual ? 'rgba(245,158,11,0.06)' : claimed ? 'rgba(34,197,94,0.06)' : 'rgba(0,0,0,0.25)';
              const borderColor = absent ? 'rgba(107,114,128,0.2)' : manual ? 'rgba(245,158,11,0.25)' : claimed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)';
              // Cycle button label shows what the NEXT state will be
              const cycleLabel = absent ? '↩ Reset' : manual ? 'Absent' : 'Manual';
              const cycleBg    = absent ? 'rgba(34,197,94,0.1)'  : manual ? 'rgba(107,114,128,0.15)' : 'rgba(245,158,11,0.1)';
              const cycleBorder = absent ? 'rgba(34,197,94,0.3)' : manual ? 'rgba(107,114,128,0.3)'  : 'rgba(245,158,11,0.3)';
              const cycleColor  = absent ? '#4ade80'              : manual ? '#9ca3af'                : '#fbbf24';
              return (
                <div key={playerId} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', marginBottom: '0.4rem', opacity: absent ? 0.55 : 1 }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: absent ? colors.textMuted : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.playerName}
                    </div>
                    <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.05rem' }}>
                      {p.commander} · {p.faction} · {p.commanderStats?.hp}/{p.commanderStats?.maxHp} HP
                    </div>
                  </div>
                  {absent  ? <span style={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em', flexShrink: 0 }}>ABSENT</span>
                  : manual  ? <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em', flexShrink: 0 }}>🎮 MANUAL</span>
                  : claimed ? <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: '800', flexShrink: 0 }}>✓ CLAIMED</span>
                  :           <span style={{ color: colors.textFaint, fontSize: '0.65rem', flexShrink: 0 }}>waiting...</span>}
                  {!claimed && (
                    <button
                      onClick={() => cycleSlotState(playerId)}
                      title="Cycle: Available → Manual → Absent → Available"
                      style={{ flexShrink: 0, padding: '0.3rem 0.55rem', background: cycleBg, border: `1px solid ${cycleBorder}`, borderRadius: '6px', color: cycleColor, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.6rem', fontWeight: '800' }}
                    >
                      {cycleLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New players who created characters */}
          {joinedPlayers.length > 0 && (() => {
            const newPlayers = joinedPlayers.filter(jp => !Object.values(saveSlots).some(s => s.claimedByUid === jp.uid));
            if (newPlayers.length === 0) return null;
            return (
              <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1rem' }}>
                <div style={{ color: '#a78bfa', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  New Players ({newPlayers.length})
                </div>
                {newPlayers.map((p, i) => (
                  <div key={p.uid || i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.75rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '8px', marginBottom: i < newPlayers.length - 1 ? '0.4rem' : 0 }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.playerColor || '#8b5cf6', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{p.playerName || p.commanderName || 'New Player'}</div>
                      <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.05rem' }}>{p.commander} · {p.faction}</div>
                    </div>
                    <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800' }}>NEW</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Start game */}
          <button onClick={handleStartGame} style={primaryBtn}>
            ⚔️ Start Game
            <div style={{ fontSize: '0.62rem', fontWeight: '600', opacity: 0.7, marginTop: '0.15rem', textTransform: 'none', letterSpacing: '0.03em' }}>
              {allClaimed
                ? 'All active players have claimed their characters'
                : 'Unclaimed players will be marked absent for this session'}
            </div>
          </button>

          <button onClick={onBack} style={backBtn}>← Back to Home</button>
        </div>
      </div>
    );
  }

  return null;
};

// ── Shared sub-components ──────────────────────────────────────────────────
const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    <span style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{value}</span>
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────
const page = {
  height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'flex-start',
  fontFamily: fonts.body, padding: '1.5rem',
  paddingTop: '2rem', paddingBottom: '3rem',
  boxSizing: 'border-box',
};

const centeredPage = {
  ...page, justifyContent: 'center',
};

const card = {
  background: 'linear-gradient(145deg, #160e0e, #0e0808)',
  border: '1px solid rgba(201,169,97,0.2)',
  borderRadius: '16px',
  padding: '2rem',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
};

const heading = {
  fontFamily: '"Cinzel", Georgia, serif',
  color: colors.gold,
  fontSize: '1.3rem',
  fontWeight: '900',
  letterSpacing: '0.12em',
  margin: '0',
};

const subText = {
  color: colors.textMuted,
  fontSize: '0.75rem',
  marginTop: '0.35rem',
};

const infoBox = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '0.85rem 1rem',
  marginBottom: '1.1rem',
};

const sectionLabel = {
  color: colors.textFaint,
  fontSize: '0.62rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '0.6rem',
};

const playerRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  padding: '0.55rem 0.75rem',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '8px',
  marginBottom: '0.35rem',
};

const primaryBtn = {
  width: '100%',
  padding: '1rem',
  background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
  border: '2px solid #ef4444',
  color: '#fecaca',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontWeight: '800',
  fontSize: '0.95rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  boxShadow: '0 6px 20px rgba(239,68,68,0.2)',
  marginBottom: '0.75rem',
};

const backBtn = {
  width: '100%',
  padding: '0.65rem',
  background: 'transparent',
  border: 'none',
  color: colors.textFaint,
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontSize: '0.8rem',
  textAlign: 'center',
};

const errorText = {
  color: '#fca5a5',
  fontSize: '0.75rem',
  textAlign: 'center',
  marginBottom: '0.75rem',
  padding: '0.5rem',
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: '8px',
};

export default LoadGameLobby;