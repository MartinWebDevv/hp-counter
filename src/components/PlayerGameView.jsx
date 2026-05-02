import React from 'react';
import { colors, borders, fonts, hpBarColor, text, btn, tierColors, cardShell, insetSection, pill } from '../theme';
import { subscribeGameState, writePendingRequest, subscribePendingRequests, subscribePendingChoices, resolvePendingChoice, writePlayerNotes, subscribePlayerNotes } from '../services/gameStateService';
import { markPlayerLeft, subscribeGameEnded } from '../services/lobbyService';
import { getSlotCount, getHeldCount } from './lootUtils';

// Sort items: Common → Rare → Legendary → Quest at bottom
const TIER_ORDER = { Common: 0, Rare: 1, Legendary: 2 };
const sortItems = (items) => [...(items || [])].sort((a, b) => {
  if (a.isQuestItem && !b.isQuestItem) return 1;
  if (!a.isQuestItem && b.isQuestItem) return -1;
  return (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
});


import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

/**
 * PlayerGameView
 * The in-game screen for players (non-GM).
 * Read-only live view of the game state, synced from Firestore.
 * Tabs: My Character | Players | NPCs | Victory
 */
const PlayerGameView = ({ lobbyCode, playerData, onLeaveGame = null }) => {
  const [gameState,   setGameState]   = React.useState(null);
  const [activeTab,     setActiveTab]     = React.useState('mine');
  const [playerIdx,     setPlayerIdx]     = React.useState(0);
  const [deniedToast,   setDeniedToast]   = React.useState(false);
  const [pendingChoice, setPendingChoice] = React.useState(null);
  const [destroyNotice, setDestroyNotice] = React.useState(null);
  const [npcFilter,     setNpcFilter]     = React.useState('All');
  const [movesetNpc,    setMovesetNpc]    = React.useState(null);
  const [turnFlash,     setTurnFlash]     = React.useState(false);
  const [playerNotes,   setPlayerNotes]   = React.useState([]);
  const [notesDraft,    setNotesDraft]    = React.useState('');
  const [noteColor,     setNoteColor]     = React.useState('#fbbf24');
  const seenDenials = React.useRef(new Set());
  const seenChoices = React.useRef(new Set());
  const touchStartX = React.useRef(null);
  const prevIsMyTurn = React.useRef(false);

  // ── Live Firestore subscription ───────────────────────────────────────────
  React.useEffect(() => {
    if (!lobbyCode) return;
    const unsub = subscribeGameState(lobbyCode, (state) => {
      setGameState(state);
      // Detect if this player was kicked — their record will have isAbsent: true
      if (playerData?.uid || playerData?.id) {
        const myRecord = (state.players || []).find(p =>
          (playerData.uid && p.uid === playerData.uid) ||
          (playerData.id && String(p.id) === String(playerData.id))
        );
        if (myRecord?.isAbsent) {
          if (onLeaveGame) onLeaveGame();
        }
      }
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid, playerData?.id, onLeaveGame]);

  // ── Watch for GM denial notices ───────────────────────────────────────────
  React.useEffect(() => {
    if (!lobbyCode || !playerData?.uid) return;
    const unsub = subscribePendingRequests(lobbyCode, (requests) => {
      Object.values(requests).forEach(req => {
        if (
          req?.type === 'denied' &&
          req?.targetPlayerId === playerData.uid &&
          !seenDenials.current.has(req.reqId)
        ) {
          seenDenials.current.add(req.reqId);
          setDeniedToast(true);
          setTimeout(() => setDeniedToast(false), 3500);
        }
      });
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid]);

  // ── Watch for GM-approved item choices (pendingChoices → this player) ─────
  React.useEffect(() => {
    if (!lobbyCode || !playerData?.uid) return;
    const unsub = subscribePendingChoices(lobbyCode, (choices) => {
      Object.values(choices).forEach(choice => {
        if (!choice || seenChoices.current.has(choice.choiceId)) return;

        // destroyNotice targets the victim player
        if (choice.type === 'destroyNotice' && choice.targetPlayerId === playerData.uid) {
          seenChoices.current.add(choice.choiceId);
          setDestroyNotice(choice);
          return;
        }

        // Normal choice screens target the item user
        if (choice.targetPlayerUid === playerData.uid && choice.type !== 'destroyNotice') {
          seenChoices.current.add(choice.choiceId);
          setPendingChoice(choice);
        }
      });
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid]);

  // ── Player notes — private per player, stored in Firestore by uid ─────────
  React.useEffect(() => {
    const uid = playerData?.uid;
    if (!uid) return;
    const unsub = subscribePlayerNotes(uid, (notes) => setPlayerNotes(notes));
    return () => unsub();
  }, [playerData?.uid]);

  const saveNote = async () => {
    if (!notesDraft.trim() || !playerData?.uid) return;
    const note = { id: Date.now(), text: notesDraft.trim(), color: noteColor, createdAt: new Date().toLocaleString() };
    const updated = [note, ...playerNotes];
    setPlayerNotes(updated);
    setNotesDraft('');
    try { await writePlayerNotes(playerData.uid, updated); } catch {}
  };

  const deletePlayerNote = async (id) => {
    const updated = playerNotes.filter(n => n.id !== id);
    setPlayerNotes(updated);
    try { await writePlayerNotes(playerData?.uid, updated); } catch {}
  };

  const editPlayerNote = async (id, text) => {
    const updated = playerNotes.map(n => n.id === id ? { ...n, text } : n);
    setPlayerNotes(updated);
    try { await writePlayerNotes(playerData?.uid, updated); } catch {}
  };

  // ── Watch for GM ending the game — redirect all players to home ───────────
  React.useEffect(() => {
    if (!lobbyCode || !onLeaveGame) return;
    const unsub = subscribeGameEnded(lobbyCode, () => { onLeaveGame(); });
    return () => unsub();
  }, [lobbyCode, onLeaveGame]);

  // ── Flash the screen when it becomes MY turn ──────────────────────────────
  // Must be above the early return. Derives isMyTurn inline from gameState.
  React.useEffect(() => {
    if (!gameState) return;
    const gs = gameState;
    const allPlayers = gs.players || [];
    const cpIdx = gs.currentPlayerIndex ?? 0;
    const ccpId = gs.currentCampaignPlayerId ?? null;
    const isCampaign = gs.gameMode === 'campaign';
    const turnPlayer = isCampaign
      ? (ccpId ? allPlayers.find(p => p.id === ccpId) || null : null)
      : (allPlayers[cpIdx] || null);
    const myTurn = !!(turnPlayer && (
      turnPlayer.uid === playerData?.uid ||
      (playerData?.id && String(turnPlayer.id) === String(playerData.id))
    ));
    if (myTurn && !prevIsMyTurn.current) {
      setTurnFlash(true);
      const t = setTimeout(() => setTurnFlash(false), 800);
      prevIsMyTurn.current = true;
      return () => clearTimeout(t);
    }
    if (!myTurn) prevIsMyTurn.current = false;
  }, [gameState, playerData?.uid, playerData?.id]);

  if (!gameState) {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚔️</div>
        <div style={{ color: colors.textMuted, fontFamily: fonts.body }}>Connecting to session...</div>
      </div>
    );
  }

  const players     = gameState.players     || [];
  const allNpcs     = (gameState.npcs       || []).filter(n => !n.isDead);
  const npcs        = allNpcs.filter(n => n.active); // active-only for attack modal
  const vpStats     = gameState.vpStats     || {};
  const currentRound = gameState.currentRound || 1;

  // Find this player's own entry by uid (must be before turn derivation)
  // Use id as fallback for mid-session joiners whose uid may not have synced yet
  const myPlayer = players.find(p => p.uid === playerData?.uid)
    || players.find(p => String(p.id) === String(playerData?.id))
    || null;

  // Derive whose turn it is
  // Standard mode: currentPlayerIndex is an index into the full players array
  // Campaign mode: currentCampaignPlayerId is the exact player id whose turn it is
  const currentPlayerIndex     = gameState.currentPlayerIndex     ?? 0;
  const currentCampaignPlayerId = gameState.currentCampaignPlayerId ?? null;
  const isCampaignMode          = gameState.gameMode === 'campaign';

  const activeTurnPlayer = isCampaignMode
    ? (currentCampaignPlayerId ? players.find(p => p.id === currentCampaignPlayerId) || null : null)
    : (players[currentPlayerIndex] || null);

  const isMyTurn = !!(activeTurnPlayer && (
    activeTurnPlayer.uid === playerData?.uid ||
    activeTurnPlayer.id  === myPlayer?.id
  ));

  // Filter out absent players for the Players tab carousel
  const visiblePlayers = players.filter(p => !p.isAbsent);

  // Clamp playerIdx for carousel
  const safeIdx = Math.min(playerIdx, Math.max(0, visiblePlayers.length - 1));

  const tabs = [
    { id: 'mine',    label: '⚔️ Mine'    },
    { id: 'players', label: '👥 Players' },
    { id: 'npcs',    label: '👾 NPCs'    },
    { id: 'notes',   label: '📝 Notes'   },
    { id: 'victory', label: '🏆 Victory' },
  ];

  return (
    <div className="pv-root" style={{ height: 'auto', minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overflowX: 'hidden', background: 'linear-gradient(145deg,#0a0505,#100808)', fontFamily: fonts.body, paddingBottom: '5rem', width: '100%', boxSizing: 'border-box' }}>

      {/* Your turn flash overlay */}
      {turnFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', animation: 'turnFlashAnim 0.8s ease-out forwards' }} />
      )}

      {/* Denied toast */}
      {deniedToast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg,#1a0505,#0f0303)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '10px', padding: '0.75rem 1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', gap: '0.6rem', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '1.1rem' }}>🚫</span>
          <span style={{ color: '#fca5a5', fontWeight: '800', fontSize: '0.88rem', fontFamily: fonts.body }}>The GM has denied your request</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerData?.playerName || playerData?.commanderName || 'Player'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerData?.faction} · Lobby: {lobbyCode}
          </div>
        </div>
        <div style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.25)', borderRadius: '8px', padding: '0.35rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Round</div>
          <div style={{ color: colors.gold, fontWeight: '900', fontSize: '1.1rem', lineHeight: 1 }}>{currentRound}</div>
        </div>
        {onLeaveGame && (
          <button
            onClick={async () => {
              if (!window.confirm('Leave this game? The GM will take control of your character.')) return;
              try {
                await markPlayerLeft(lobbyCode, playerData?.uid, playerData?.playerName || 'Player');
              } catch {}
              onLeaveGame();
            }}
            style={{ padding: '0.4rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.65rem', letterSpacing: '0.05em', flexShrink: 0 }}
          >🚪 Leave</button>
        )}
      </div>

      {/* Tab bar */}
      <div className="pv-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '0.75rem 0.5rem', border: 'none', cursor: 'pointer',
            background: 'transparent', fontFamily: fonts.body, fontWeight: '700',
            fontSize: '0.72rem', whiteSpace: 'nowrap',
            color: activeTab === tab.id ? colors.gold : colors.textMuted,
            borderBottom: `2px solid ${activeTab === tab.id ? colors.gold : 'transparent'}`,
            transition: 'all 0.15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Turn indicator — always rendered, shows last known turn player to prevent flicker */}
      {(() => {
        const turnPlayer = activeTurnPlayer;
        const pColor = turnPlayer?.playerColor || colors.gold;
        return (
          <div style={{
            padding: '0.5rem 1rem',
            background: isMyTurn
              ? `linear-gradient(90deg, ${pColor}18, transparent)`
              : 'rgba(0,0,0,0.3)',
            borderBottom: `1px solid ${isMyTurn ? pColor + '40' : 'rgba(255,255,255,0.04)'}`,
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            minHeight: '36px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: pColor,
              boxShadow: turnPlayer ? `0 0 8px ${pColor}` : 'none',
              flexShrink: 0,
              animation: turnPlayer ? 'turnPulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '0.4rem' }}>
                {isMyTurn ? 'YOUR TURN' : 'ACTIVE TURN'}
              </span>
              <span style={{
                color: isMyTurn ? pColor : colors.textPrimary,
                fontWeight: '800', fontSize: '0.82rem',
              }}>
                {isMyTurn ? "It's your turn!" : (turnPlayer?.playerName || '—')}
              </span>
            </div>
            {isMyTurn && !isCampaignMode && (
              <span style={{ color: pColor, fontSize: '0.7rem', fontWeight: '800', animation: 'turnPulse 1.5s ease-in-out infinite' }}>⚔️</span>
            )}
            {isMyTurn && isCampaignMode && (
              <EndTurnButton lobbyCode={lobbyCode} player={myPlayer} pColor={pColor} />
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="pv-content" style={{ padding: '1rem', maxWidth: '700px', width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingBottom: '3rem', overflowX: 'hidden' }}>

        {/* ── My Character ─────────────────────────────────────────────── */}
        {activeTab === 'mine' && (
          myPlayer
            ? (
              <>
                <ReadOnlyPlayerCard player={myPlayer} highlight isOwnCard lobbyCode={lobbyCode} npcs={npcs} allPlayers={players} />
                <PlayerStatsPanel player={myPlayer} />
              </>
            )
            : <EmptyState icon="👤" text="Your character hasn't been added to the game yet." />
        )}

        {/* ── Players carousel ─────────────────────────────────────────── */}
        {activeTab === 'players' && (
          visiblePlayers.length === 0
            ? <EmptyState icon="👥" text="No players in the session yet." />
            : (() => {
              const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
              const handleTouchEnd = (e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) < 40) return;
                if (dx < 0) setPlayerIdx(i => Math.min(visiblePlayers.length - 1, i + 1));
                if (dx > 0) setPlayerIdx(i => Math.max(0, i - 1));
                touchStartX.current = null;
              };
              return (
                <div style={{ width: '100%', minWidth: 0 }}>
                  {/* Dot indicator row — arrows hidden on touch screens via CSS, dots always shown */}
                  <div className="pv-carousel-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
                    <button className="pv-carousel-arrow" onClick={() => setPlayerIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0} style={navBtn(safeIdx === 0)}>←</button>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ color: colors.textMuted, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Player {safeIdx + 1} of {visiblePlayers.length}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        {visiblePlayers.map((p, i) => (
                          <div key={p.id} onClick={() => setPlayerIdx(i)} style={{ width: i === safeIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === safeIdx ? (p.playerColor || colors.gold) : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all 0.2s' }} />
                        ))}
                      </div>
                    </div>
                    <button className="pv-carousel-arrow" onClick={() => setPlayerIdx(i => Math.min(visiblePlayers.length - 1, i + 1))} disabled={safeIdx === visiblePlayers.length - 1} style={navBtn(safeIdx === visiblePlayers.length - 1)}>→</button>
                  </div>
                  {/* Card — swipeable on touch */}
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{ width: '100%', overflow: 'hidden', boxSizing: 'border-box', touchAction: 'pan-y' }}
                  >
                    <ReadOnlyPlayerCard player={visiblePlayers[safeIdx]} />
                  </div>
                </div>
              );
            })()
        )}

        {/* ── NPCs ─────────────────────────────────────────────────────── */}
        {activeTab === 'npcs' && (() => {
          const allGameNpcs = gameState.npcs || [];
          const filteredNpcs = npcFilter === 'All'
            ? allGameNpcs
            : npcFilter === 'Active'
              ? allGameNpcs.filter(n => n.active && !n.isDead)
              : npcFilter === 'Inactive'
                ? allGameNpcs.filter(n => !n.active && !n.isDead)
                : allGameNpcs.filter(n => n.isDead);

          return (
            <>
              {/* Filter pills */}
              <div className="pv-npc-filters" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                {['All', 'Active', 'Inactive', 'Dead'].map(f => (
                  <button key={f} onClick={() => setNpcFilter(f)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer',
                    fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', letterSpacing: '0.05em',
                    border: `1px solid ${npcFilter === f
                      ? f === 'Active' ? 'rgba(239,68,68,0.6)'
                        : f === 'Dead' ? 'rgba(107,114,128,0.6)'
                        : f === 'Inactive' ? 'rgba(201,169,97,0.4)'
                        : 'rgba(255,255,255,0.2)'
                      : 'rgba(255,255,255,0.08)'}`,
                    background: npcFilter === f
                      ? f === 'Active' ? 'rgba(239,68,68,0.12)'
                        : f === 'Dead' ? 'rgba(107,114,128,0.12)'
                        : f === 'Inactive' ? 'rgba(201,169,97,0.08)'
                        : 'rgba(255,255,255,0.06)'
                      : 'transparent',
                    color: npcFilter === f
                      ? f === 'Active' ? '#fca5a5'
                        : f === 'Dead' ? '#9ca3af'
                        : f === 'Inactive' ? colors.gold
                        : colors.textPrimary
                      : colors.textFaint,
                  }}>{f} {f !== 'All' && `(${
                    f === 'Active' ? allGameNpcs.filter(n => n.active && !n.isDead).length
                    : f === 'Inactive' ? allGameNpcs.filter(n => !n.active && !n.isDead).length
                    : allGameNpcs.filter(n => n.isDead).length
                  })`}</button>
                ))}
              </div>
              {filteredNpcs.length === 0
                ? <EmptyState icon="👾" text={`No ${npcFilter.toLowerCase()} enemies.`} />
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredNpcs.map(npc => (
                      <ReadOnlyNPCCard key={npc.id} npc={npc} onShowMoveset={setMovesetNpc} />
                    ))}
                  </div>
                )
              }
            </>
          );
        })()}

        {/* ── Victory ───────────────────────────────────────────────────── */}
        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ padding: '0 0.25rem', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {/* Color picker + composer */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.35)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em' }}>COLOR</span>
                {['#fbbf24','#86efac','#f9a8d4','#93c5fd','#fca5a5','#c4b5fd'].map(c => (
                  <div key={c} onClick={() => setNoteColor(c)} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0, border: noteColor === c ? '2px solid white' : '2px solid transparent', touchAction: 'manipulation' }} />
                ))}
              </div>
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(90,74,58,0.4)', borderRadius: '8px', color: colors.textPrimary, padding: '0.6rem 0.75rem', fontFamily: fonts.body, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', marginBottom: '0.5rem' }}
              />
              <button onClick={saveNote} disabled={!notesDraft.trim()} style={{ width: '100%', padding: '0.75rem', background: notesDraft.trim() ? 'linear-gradient(135deg,rgba(201,169,97,0.2),rgba(120,80,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${notesDraft.trim() ? 'rgba(201,169,97,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '8px', color: notesDraft.trim() ? colors.gold : colors.textDisabled, cursor: notesDraft.trim() ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', touchAction: 'manipulation' }}>
                📝 Save Note
              </button>
            </div>

            {/* Notes list */}
            {playerNotes.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.78rem', padding: '2rem 1rem' }}>No notes yet. Write something above.</div>
            )}
            {playerNotes.map(note => (
              <div key={note.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${note.color || '#fbbf24'}40`, borderLeft: `3px solid ${note.color || '#fbbf24'}`, borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => editPlayerNote(note.id, e.currentTarget.textContent)}
                    style={{ color: colors.textPrimary, fontSize: '0.85rem', lineHeight: '1.5', flex: 1, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.2em' }}
                  >
                    {note.text}
                  </div>
                  <button onClick={() => deletePlayerNote(note.id)} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '1rem', padding: '0', flexShrink: 0, touchAction: 'manipulation' }}>✕</button>
                </div>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', marginTop: '0.35rem' }}>{note.createdAt} · Tap to edit</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'victory' && (() => {
          // ── VP helpers (match DM logic exactly) ──────────────────────
          const getTotalVP = (playerId) => {
            const s = vpStats[playerId] || {};
            const fromSessions = (s.sessionAwards || []).reduce((acc, a) => acc + (a.pts || 0), 0);
            const fromManual   = (s.manualAwards  || []).reduce((acc, a) => acc + (a.points || 0), 0);
            return fromSessions + fromManual;
          };

          const LIVE_STAT_ROWS = [
            { key: 'npcDamage',     label: '🐉 NPC Damage',       unit: 'hp'      },
            { key: 'pvpDamage',     label: '⚔️ PvP Damage',       unit: 'hp'      },
            { key: 'damageTaken',   label: '🛡️ Damage Taken',     unit: 'hp'      },
            { key: 'itemsObtained', label: '📦 Items Obtained',   unit: 'items'   },
            { key: 'revivesUsed',   label: '💀 Revives Used',     unit: 'times'   },
            { key: 'finalBossKill', label: '👑 Final Boss Kill',  unit: ''        },
            { key: 'firstBlood',    label: '🩸 First Blood',      unit: ''        },
            { key: 'warmonger',     label: '⚡ Attacks Made',     unit: 'attacks' },
          ];

          const ranked = [...players]
            .map(p => ({ ...p, totalVP: getTotalVP(p.id) }))
            .sort((a, b) => b.totalVP - a.totalVP);

          const rankBadge = ['👑', '🥈', '🥉'];

          // ── Per-player expandable card ────────────────────────────────
          const VPCard = ({ p, rank }) => {
            const [open, setOpen] = React.useState(false);
            const isMe    = myPlayer && String(p.id) === String(myPlayer.id);
            const pColor  = p.playerColor || colors.blue;
            const s       = vpStats[p.id] || {};
            const sessionAwards = s.sessionAwards || [];
            const manualAwards  = s.manualAwards  || [];
            const isFirst = rank === 0;

            // Group session awards by session name
            const sessionGroups = sessionAwards.reduce((acc, a) => {
              const key = a.sessionName || 'Unnamed Session';
              if (!acc[key]) acc[key] = [];
              acc[key].push(a);
              return acc;
            }, {});
            const sessionNames = Object.keys(sessionGroups);

            // Live stats — only non-zero rows
            const liveRows = LIVE_STAT_ROWS.filter(r => (s[r.key] || 0) > 0 || r.key === 'finalBossKill' && s[r.key]);
            const hasAnyLive = liveRows.length > 0;
            const hasHistory = sessionAwards.length > 0 || manualAwards.length > 0;

            return (
              <div style={{
                background: isFirst ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${isFirst ? 'rgba(201,169,97,0.25)' : open && isMe ? pColor + '40' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}>
                {/* Row */}
                <div
                  onClick={() => isMe && setOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    cursor: isMe ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ color: isFirst ? colors.gold : colors.textFaint, fontWeight: '900', fontSize: '1.1rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                    {rankBadge[rank] || `#${rank + 1}`}
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isMe ? pColor : colors.textPrimary, fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.playerName}{isMe ? ' (you)' : ''}
                    </div>
                    <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>{p.faction}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: isFirst ? colors.gold : colors.amber, fontWeight: '900', fontSize: '1.3rem', lineHeight: 1 }}>
                      {p.totalVP}
                      <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '600', marginLeft: '0.2rem' }}>VP</span>
                    </div>
                    {isMe && (
                      <div style={{ color: colors.textFaint, fontSize: '0.58rem', marginTop: '0.2rem', fontWeight: '700' }}>
                        {open ? 'tap to close ▲' : 'tap for details ▼'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded breakdown — only for own card */}
                {open && isMe && (
                  <div style={{ borderTop: `1px solid ${pColor}25`, padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)' }}>

                    {/* Live session stats */}
                    <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      📊 Live Session Stats
                    </div>
                    {hasAnyLive ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.85rem' }}>
                        {LIVE_STAT_ROWS.map(r => {
                          const val = s[r.key] || 0;
                          if (!val) return null;
                          const display = r.key === 'finalBossKill' ? (val > 0 ? 'YES' : null) : val;
                          if (!display) return null;
                          return (
                            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${pColor}20`, borderRadius: '6px' }}>
                              <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{r.label}</span>
                              <span style={{ color: pColor, fontSize: '0.72rem', fontWeight: '900' }}>
                                {display}{r.unit ? ` ${r.unit}` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: colors.textFaint, fontSize: '0.72rem', textAlign: 'center', padding: '0.5rem', marginBottom: '0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        No stats recorded this session yet.
                      </div>
                    )}

                    {/* Session award history */}
                    {sessionNames.length > 0 && (
                      <>
                        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                          🏆 Award History
                        </div>
                        {sessionNames.map(sessName => (
                          <div key={sessName} style={{ marginBottom: '0.6rem' }}>
                            <div style={{ color: colors.amber, fontSize: '0.62rem', fontWeight: '800', marginBottom: '0.3rem' }}>
                              📅 {sessName}
                            </div>
                            {sessionGroups[sessName].map((a, ai) => (
                              <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.55rem', background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.15)', borderRadius: '5px', marginBottom: '0.18rem' }}>
                                <span style={{ color: colors.textPrimary, fontSize: '0.72rem', fontWeight: '700' }}>{a.icon} {a.label}</span>
                                <span style={{ color: colors.gold, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.pts} VP</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Manual / DM awards */}
                    {manualAwards.length > 0 && (
                      <>
                        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', marginTop: sessionNames.length > 0 ? '0.25rem' : 0 }}>
                          🏅 DM Awards
                        </div>
                        {manualAwards.map((a, ai) => (
                          <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.55rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '5px', marginBottom: '0.18rem' }}>
                            <span style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '700' }}>🏅 {a.reason}</span>
                            <span style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.points} VP</span>
                          </div>
                        ))}
                      </>
                    )}

                    {!hasAnyLive && !hasHistory && (
                      <div style={{ color: colors.textFaint, fontSize: '0.72rem', textAlign: 'center', padding: '0.5rem' }}>
                        No awards yet this campaign.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          };

          return players.length === 0
            ? <EmptyState icon="🏆" text="No players yet." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>
                  Victory Points
                </div>
                {ranked.map((p, i) => <VPCard key={p.id} p={p} rank={i} />)}
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', textAlign: 'center', marginTop: '0.25rem' }}>
                  Tap your name to see your full breakdown
                </div>
              </div>
            );
        })()}
      </div>

      {/* ── Item Choice Screen — shown after GM approves a choice-required item ── */}
      {pendingChoice && pendingChoice.type === 'passChoice' && (
        <PassChoiceScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'guyTargetPick' && (
        <GuyTargetPickScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          npcs={(gameState?.npcs || []).filter(n => n.active && !n.isDead)}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'guyItemPick' && (
        <GuyItemPickScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type !== 'passChoice' && pendingChoice.type !== 'guyItemPick' && pendingChoice.type !== 'guyTargetPick' && (
        <ItemChoiceScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          npcs={(gameState?.npcs || []).filter(n => n.active && !n.isDead)}
          onSubmit={() => setPendingChoice(null)}
        />
      )}

      {/* ── NPC Moveset Modal ── */}
      {movesetNpc && <NPCMovesetModal npc={movesetNpc} onClose={() => setMovesetNpc(null)} />}

      {/* ── Destroy Notice — shown to player whose item was destroyed ── */}
      {destroyNotice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💥</div>
            <div style={{ color: '#fca5a5', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem' }}>Item Destroyed</div>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Destroyed by</div>
              <div style={{ color: '#fca5a5', fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.6rem' }}>{destroyNotice.byPlayerName}</div>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Item Lost</div>
              <div style={{ color: colors.amber, fontWeight: '800', fontSize: '0.95rem' }}>"{destroyNotice.destroyedItemName}"</div>
            </div>
            <button
              onClick={() => setDestroyNotice(null)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
            >Acknowledge</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Item Choice Screen ────────────────────────────────────────────────────────
const ItemChoiceScreen = ({ choice, lobbyCode, myPlayer, allPlayers, npcs, onSubmit }) => {
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedTarget,   setSelectedTarget]   = React.useState(null); // { type:'self'|'enemy'|'destroyItem', unitKey, unitLabel, playerId, npcId, ... }
  const [selectedDestroyItem, setSelectedDestroyItem] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const effectType = choice.itemEffect;

  // Effects that target own units
  const SELF_TARGET = ['heal','maxHP','attackBonus','defenseBonus','shieldWall','counterStrike','cleanse','fullCleanse','resurrect','extraSlot','theGuy'];
  // Effects that target enemies
  const ENEMY_TARGET = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'];
  const IS_DESTROY   = effectType === 'destroyItem';
  const isSelf       = SELF_TARGET.includes(effectType);
  const isEnemy      = ENEMY_TARGET.includes(effectType);

  const effectLabels = {
    heal: '💚 Heal', maxHP: '❤️ Max HP Boost', attackBonus: '⚔️↑ Attack Bonus',
    defenseBonus: '🛡️↑ Defense Bonus', shieldWall: '🛡️ Shield Wall',
    counterStrike: '⚡ Counter Strike', cleanse: '✨ Cleanse',
    fullCleanse: '✨✨ Full Cleanse', resurrect: '💫 Resurrect', extraSlot: '🎒 Extra Item Slot',
    poisonVial: '🧪 Poison Vial', stunGrenade: '💣 Stun Grenade',
    attackDebuffItem: '⚔️↓ Attack Debuff', defenseDebuffItem: '🛡️↓ Defense Debuff',
    marked: '🎯 Marked', destroyItem: '💥 Destroy Item',
  };

  const submitChoice = async () => {
    if (!selectedTarget || sending) return;
    if (IS_DESTROY && !selectedDestroyItem) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:              'itemChoice',
        reqId,
        choiceId:          choice.choiceId,
        playerId:          myPlayer?.id,
        playerName:        myPlayer?.playerName,
        itemIndex:         choice.itemIndex,
        itemName:          choice.itemName,
        itemEffect:        effectType,
        targetType:        selectedTarget.type,
        targetUnitKey:     selectedTarget.unitKey   || null,
        targetUnitLabel:   selectedTarget.unitLabel || null,
        targetPlayerId:    selectedTarget.playerId  || null,
        targetNpcId:       selectedTarget.npcId     || null,
        targetName:        selectedTarget.name       || null,
        // Destroy item specific
        destroyItemId:     selectedDestroyItem?.id   || null,
        destroyedItemName: selectedDestroyItem?.name || null,
        timestamp:         Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  // ── Own-unit list (for self-targeting effects) ────────────────────────────
  const buildOwnUnits = () => {
    if (!myPlayer) return [];
    const units = [];
    const cmdAlive = !myPlayer.commanderStats?.isDead && (myPlayer.commanderStats?.hp ?? 0) > 0;
    const cmdDown  = myPlayer.commanderStats?.isDead || (myPlayer.commanderStats?.hp ?? 0) <= 0;

    // Resurrect targets downed units; everything else targets alive units
    if (effectType === 'resurrect') {
      if (cmdDown) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp <= 0 && (u.livesRemaining ?? 0) > 0) {
          units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
        }
      });
    } else {
      if (cmdAlive) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp > 0) units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
      });
    }
    return units;
  };

  // ── Enemy player list (for destroy item) ─────────────────────────────────
  const enemyPlayers = (allPlayers || []).filter(p => p.id !== myPlayer?.id && !p.commanderStats?.isDead && !p.isAbsent);

  const canSubmit = selectedTarget && (!IS_DESTROY || selectedDestroyItem);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>✦</div>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>
            {effectLabels[effectType] || 'Use Item'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.72rem', marginTop: '0.25rem' }}>{choice.itemName} — choose a target</div>
        </div>

        {/* ── Self-targeting: own units ── */}
        {isSelf && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {effectType === 'resurrect' ? 'Downed Units' : 'Your Units'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {buildOwnUnits().map(({ unitKey, unitLabel, hp, maxHp }) => {
                const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.type === 'self';
                const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                return (
                  <button
                    key={unitKey}
                    onClick={() => setSelectedTarget({ type: 'self', unitKey, unitLabel, name: unitLabel })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)', border: `1px solid ${isSelected ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ flex: 1, color: isSelected ? colors.gold : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{unitLabel}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                    {isSelected && <span style={{ color: colors.gold, fontSize: '0.75rem' }}>✓</span>}
                  </button>
                );
              })}
              {buildOwnUnits().length === 0 && (
                <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No valid targets</div>
              )}
            </div>
          </>
        )}

        {/* ── Enemy-targeting: NPC + player units ── */}
        {isEnemy && (
          <>
            {/* NPC targets */}
            {npcs.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enemies</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {npcs.map(npc => {
                    const isSelected = selectedTarget?.npcId === npc.id;
                    return (
                      <button
                        key={npc.id}
                        onClick={() => setSelectedTarget({ type: 'enemy', npcId: npc.id, name: npc.name, unitLabel: npc.name })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: '#fecaca', fontWeight: '700', fontSize: '0.85rem' }}>{npc.name}</span>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{npc.hp}/{npc.maxHp} HP</span>
                        {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Enemy player unit targets */}
            {enemyPlayers.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Players</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {enemyPlayers.map(ep => {
                    const isExpanded = expandedPlayerId === ep.id;
                    const pColor = ep.playerColor || colors.blue;
                    const unitOptions = [];
                    if ((ep.commanderStats?.hp ?? 0) > 0) {
                      unitOptions.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', hp: ep.commanderStats.hp, maxHp: ep.commanderStats.maxHp });
                    }
                    (ep.subUnits || []).forEach((u, i) => {
                      if (u.hp > 0) unitOptions.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
                    });
                    return (
                      <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                        <button onClick={() => setExpandedPlayerId(isExpanded ? null : ep.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                          <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                            {unitOptions.map(({ unitKey, unitLabel, hp, maxHp }) => {
                              const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.playerId === ep.id;
                              const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                              return (
                                <button key={unitKey} onClick={() => setSelectedTarget({ type: 'enemy', playerId: ep.id, unitKey, unitLabel, name: `${ep.playerName} — ${unitLabel}` })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.85rem', background: isSelected ? pColor + '15' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: fonts.body }}>
                                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                                  <span style={{ flex: 1, color: isSelected ? pColor : colors.purpleLight, fontWeight: '700', fontSize: '0.8rem', textAlign: 'left' }}>{unitLabel}</span>
                                  <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                                  {isSelected && <span style={{ color: pColor, fontSize: '0.75rem' }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Destroy Item: pick enemy player → see their units + items ── */}
        {IS_DESTROY && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Choose Target Player</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {enemyPlayers.map(ep => {
                const isExpanded = expandedPlayerId === ep.id;
                const pColor = ep.playerColor || colors.blue;
                // Gather all units with items
                const unitsWithItems = [];
                const cmdItems = sortItems((ep.inventory || []).filter(it => it.heldBy === 'commander'));
                if ((ep.commanderStats?.hp ?? 0) > 0 && cmdItems.length > 0) {
                  unitsWithItems.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', items: cmdItems });
                }
                (ep.subUnits || []).forEach((u, i) => {
                  if (u.hp <= 0) return;
                  const uKey = i === 0 ? 'special' : `soldier${i}`;
                  const uLabel = u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                  const unitItems = sortItems((ep.inventory || []).filter(it => it.heldBy === uKey));
                  if (unitItems.length > 0) unitsWithItems.push({ unitKey: uKey, unitLabel: uLabel, items: unitItems });
                });
                return (
                  <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <button onClick={() => { setExpandedPlayerId(isExpanded ? null : ep.id); setSelectedTarget(null); setSelectedDestroyItem(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                    </button>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                        {unitsWithItems.length === 0 && (
                          <div style={{ color: colors.textFaint, fontSize: '0.75rem', padding: '0.75rem 0.85rem' }}>No items to destroy</div>
                        )}
                        {unitsWithItems.map(({ unitKey, unitLabel, items }) => {
                          const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                          return (
                            <div key={unitKey} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '0.4rem 0.85rem' }}>
                              <div style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '800', marginBottom: '0.3rem' }}>{icon} {unitLabel}</div>
                              {items.map(item => {
                                const isSelected = selectedDestroyItem?.id === item.id;
                                return (
                                  <button key={item.id} onClick={() => { setSelectedTarget({ type: 'destroyItem', playerId: ep.id, name: ep.playerName }); setSelectedDestroyItem(item); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', marginBottom: '0.2rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.2)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '6px', cursor: 'pointer', fontFamily: fonts.body }}>
                                    <span style={{ fontSize: '0.85rem' }}>📦</span>
                                    <span style={{ flex: 1, color: isSelected ? '#fca5a5' : colors.textPrimary, fontWeight: '700', fontSize: '0.78rem', textAlign: 'left' }}>{item.name}</span>
                                    <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{item.tier}</span>
                                    {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Submit */}
        <button
          onClick={submitChoice}
          disabled={!canSubmit || sending}
          style={{ width: '100%', padding: '0.85rem', background: canSubmit ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canSubmit ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canSubmit ? '#86efac' : colors.textDisabled, cursor: canSubmit && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}
        >
          {sending ? '...' : '✓ Confirm Choice'}
        </button>
      </div>
    </div>
  );
};
const ReadOnlyPlayerCard = ({
  player,
  highlight = false,
  isOwnCard = false,
  lobbyCode = null,
  npcs = [],
  allPlayers = [],
}) => {
  const [showSquad,        setShowSquad]        = React.useState(true);
  const [attackModal,      setAttackModal]      = React.useState(null);
  const [sending,          setSending]          = React.useState(false);
  const [squadAttack,      setSquadAttack]      = React.useState(false);
  const [squadUnits,       setSquadUnits]       = React.useState([]);
  const [expandedTargetId, setExpandedTargetId] = React.useState(null);
  const [targetUnitKeys,   setTargetUnitKeys]   = React.useState([]);
  const [confirmItem,      setConfirmItem]      = React.useState(null); // { item, index } — one-use confirm modal
  const [guyModal,         setGuyModal]         = React.useState(null); // { item, index } — The Guy 1d4 roll modal
  const [guyRoll,          setGuyRoll]          = React.useState('');   // The Guy 1d4 input

  const cmdHp      = player.commanderStats?.hp    ?? 0;
  const cmdMaxHp   = player.commanderStats?.maxHp ?? 1;
  const cmdPct     = Math.max(0, Math.min(100, (cmdHp / cmdMaxHp) * 100));
  const isDead     = player.commanderStats?.isDead;
  const inventory  = player.inventory || [];

  const pColor   = player.playerColor || colors.blue;
  const revives  = player.commanderStats?.revives || 0;
  const cooldown = player.commanderStats?.cooldownRounds || 0;
  const cmdName  = player.commanderStats?.customName || player.commander || 'Commander';
  const aliveUnits = (player.subUnits || []).filter(u => u.hp > 0).length;
  const totalUnits = (player.subUnits || []).length;
  const reviveQueue = player.reviveQueue || [];

  const openAttack = (unitKey, action, unitLabel) => {
    if (!isOwnCard) return;
    setSquadAttack(false);
    setSquadUnits([]);
    setExpandedTargetId(null);
    setTargetUnitKeys([]);
    setAttackModal({ unitKey, action, unitLabel });
  };

  const isCommanderAttack = attackModal?.unitKey === 'commander';

  const toggleSquadUnit = (unitKey) => {
    setSquadUnits(prev => {
      if (prev.includes(unitKey)) return prev.filter(k => k !== unitKey);
      if (prev.length >= 3) return prev; // max 3 units
      return [...prev, unitKey];
    });
  };

  const sendAttackRequest = async (target) => {
    if (!lobbyCode || sending) return;
    setSending(true);
    try {
      const reqId = `atk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const squadMembers = (!isCommanderAttack && squadAttack && squadUnits.length > 0)
        ? squadUnits
        : null;
      const isPlayerTarget = target.type === 'player';
      const resolvedTargetUnits = isPlayerTarget && targetUnitKeys.length > 0 ? targetUnitKeys : null;
      await writePendingRequest(lobbyCode, reqId, {
        type:             'attack',
        reqId,
        playerId:         player.id,
        playerName:       player.playerName,
        unitKey:          attackModal.unitKey,
        unitLabel:        attackModal.unitLabel,
        action:           attackModal.action,
        targetId:         target.id,
        targetType:       target.type,
        targetName:       target.name,
        isSquadAttack:    !!squadMembers,
        squadUnits:       squadMembers,
        targetUnitKeys:   resolvedTargetUnits ? resolvedTargetUnits.map(t => t.unitKey)   : null,
        targetUnitLabels: resolvedTargetUnits ? resolvedTargetUnits.map(t => t.unitLabel) : null,
        timestamp:        Date.now(),
      });
    } finally {
      setSending(false);
      setSquadAttack(false);
      setSquadUnits([]);
      setExpandedTargetId(null);
      setTargetUnitKeys([]);
      setAttackModal(null);
    }
  };

  return (
    <>
    <div style={{ ...cardShell(false, pColor, false), opacity: isDead ? 0.55 : 1, border: highlight ? `2px solid ${pColor}` : undefined, width: '100%', boxSizing: 'border-box', minWidth: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: pColor, boxShadow: `0 0 8px ${pColor}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: pColor, fontWeight: '800', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.playerName || 'Player'}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>{player.faction} · {player.commander}</div>
        </div>
        {isDead && <span style={pill('#ef4444', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)')}>💀 DOWN</span>}
      </div>

      {/* ── Commander block ── */}
      <div style={{ ...insetSection(isDead ? 'dead' : 'default'), marginBottom: '0.6rem', opacity: isDead ? 0.72 : 1 }}>
        {/* Name + cooldown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontFamily: fonts.display, fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.gold }}>
            {cmdName}
          </span>
          <div style={{ padding: '0.18rem 0.55rem', background: cooldown > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cooldown > 0 ? colors.redBorder : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', color: cooldown > 0 ? '#fca5a5' : colors.textFaint, fontSize: '0.68rem', fontWeight: '800' }}>
            {cooldown > 0 ? `🔴 CD:${cooldown}` : '⭕ Ready'}
          </div>
        </div>

        {/* HP bar + revive pips */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ color: colors.amber, fontSize: '0.85rem', fontWeight: '700' }}>{cmdHp} / {cmdMaxHp} HP</span>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ width: '11px', height: '11px', borderRadius: '50%', border: `2px solid ${i < revives ? colors.blue : colors.textDisabled}`, background: i < revives ? `radial-gradient(circle, ${colors.blue}, #1e3a8a)` : '#0a0a0a', boxShadow: i < revives ? `0 0 5px ${colors.blue}70` : 'none' }} />
              ))}
            </div>
          </div>
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${cmdPct}%`, height: '100%', background: hpBarColor(cmdPct), transition: 'width 0.3s ease', borderRadius: '3px' }} />
          </div>
          {/* Commander status effects */}
          {(player.commanderStats?.statusEffects || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
              {(player.commanderStats.statusEffects).map((ef, ei) => {
                const dur = ef.permanent ? '∞' : `${ef.duration}r`;
                const statusMeta = {
                  poison:       { label: `🤢 Poison ${ef.value}hp`, color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)' },
                  burn:         { label: `🔥 Burn ${ef.value}hp`,   color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)' },
                  stun:         { label: '💫 Stun',                  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
                  shieldWall:   { label: '🛡️ Shield',               color: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)' },
                  counterStrike:{ label: '⚡ Counter',               color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
                  movementBoost:{ label: '🏃 +10″ Move',            color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.4)' },
                  closeCall:    { label: '🛡️ Close Call',            color: '#f9a8d4', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.4)' },
                  attackBuff:   { label: `⚔️↑ +${ef.value}`,        color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)' },
                  defenseBuff:  { label: `🛡️↑ +${ef.value}`,        color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
                  attackDebuff: { label: `⚔️↓ -${ef.value}`,        color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                  defenseDebuff:{ label: `🛡️↓ -${ef.value}`,        color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                  marked:       { label: '🎯 Marked',                color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                }[ef.type] || { label: ef.type, color: colors.textFaint, bg: 'rgba(0,0,0,0.2)', border: 'rgba(90,74,58,0.3)' };
                return (
                  <span key={ei} style={{ padding: '0.1rem 0.4rem', background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, borderRadius: '20px', color: statusMeta.color, fontSize: '0.58rem', fontWeight: '800' }}>
                    {statusMeta.label} {dur}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Commander loot slot */}
        {(() => {
          const heldItems = sortItems(inventory.filter(it => it.heldBy === 'commander'));
          const slotCount = getSlotCount(player, 'commander');
          const heldCount = getHeldCount(player, 'commander');
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', flexShrink: 0 }}>🎒 {heldCount}/{slotCount}</span>
              {heldItems.map((item, hi) => {
                const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                return <div key={hi} style={pill(tc.text, tc.bg, tc.border)}><span style={{ marginRight: '0.2rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>{item.name}</div>;
              })}
            </div>
          );
        })()}

        {/* Commander attack buttons */}
        {isOwnCard && (
          <div className="pv-cmd-attacks" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {[
              { label: '🎯 Shoot',   action: 'shoot'   },
              { label: '⚔️ Melee',   action: 'melee'   },
              { label: '⚡ Special', action: 'special', disabled: cooldown > 0 },
            ].map(({ label, action, disabled: extra }) => {
              const dis = !!isDead || !!extra;
              return (
                <button key={action} onClick={() => openAttack('commander', action, cmdName)} disabled={dis} style={btn.primary(dis)}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Squad header ── */}
      <div onClick={() => setShowSquad(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.purpleBorder}`, borderRadius: showSquad ? '8px 8px 0 0' : '8px', cursor: 'pointer', userSelect: 'none', marginBottom: showSquad ? 0 : '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: colors.textFaint, fontSize: '0.7rem', display: 'inline-block', transform: showSquad ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
          <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Squad</span>
          <span style={{ color: aliveUnits === 0 ? colors.red : colors.textMuted, fontSize: '0.75rem', fontWeight: '600' }}>{aliveUnits}/{totalUnits} alive</span>
          {reviveQueue.length > 0 && <span style={pill(colors.amber, colors.amberSubtle, colors.amberBorder)}>⚕️ {reviveQueue.length} queue</span>}
        </div>
      </div>

      {/* ── Squad units ── */}
      {showSquad && (
        <div style={{ border: `1px solid ${colors.purpleBorder}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ overflowX: 'hidden' }}>
          {(player.subUnits || []).map((unit, index) => {
            const unitDead = unit.hp === 0;
            const livesRemaining = unit.livesRemaining ?? unit.revives ?? 0;
            const isPermaDead = unitDead && livesRemaining === 0;
            const queuePos = reviveQueue.indexOf(index);
            const isInQueue = queuePos >= 0;
            const unitHPPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
            const unitKey = index === 0 ? 'special' : `soldier${index}`;
            const heldItems = sortItems(inventory.filter(it => it.heldBy === unitKey));
            const slotCount = getSlotCount(player, unitKey);
            const heldCount = getHeldCount(player, unitKey);
            const unitLabel = unit.name?.trim() || (index === 0 ? 'Special' : `Soldier ${index}`);
            return (
              <div key={index} style={{ padding: '0.75rem', background: isPermaDead ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)', borderBottom: index < (player.subUnits || []).length - 1 ? `1px solid ${colors.purpleBorder}` : 'none', opacity: isPermaDead ? 0.3 : unitDead ? 0.55 : 1, filter: isPermaDead ? 'grayscale(1)' : 'none' }}>
                {/* Unit name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  <span style={{ flex: 1, color: colors.purpleLight, fontWeight: '700', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {index === 0 ? '⭐ ' : '🛡️ '}{unitLabel}
                  </span>
                  {/* Uncivilized subtype badge */}
                  {unit.unitSubType && (
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, color: unit.unitSubType === 'dinosaur' ? '#6ee7b7' : '#fbbf24' }}>
                      {unit.unitSubType === 'dinosaur' ? '🦕' : '🪨'}
                    </span>
                  )}
                  {/* Lives pips */}
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', border: `2px solid ${i < livesRemaining ? '#eab308' : colors.textDisabled}`, background: i < livesRemaining ? 'radial-gradient(circle, #eab308, #92400e)' : '#0a0a0a', boxShadow: i < livesRemaining ? '0 0 4px #eab30870' : 'none' }} />
                    ))}
                  </div>
                  {unitDead && (
                    <span style={pill(isInQueue ? colors.amber : '#7f1d1d', isInQueue ? colors.amberSubtle : 'rgba(127,29,29,0.15)', isInQueue ? colors.amberBorder : '#450a0a')}>
                      {isInQueue ? `💀 #${queuePos + 1}` : '💀 GONE'}
                    </span>
                  )}
                </div>
                {/* HP display */}
                <div style={{ marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ color: colors.purpleLight, fontSize: '0.82rem', fontWeight: '700' }}>{unit.hp}/{unit.maxHp} HP</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${unitHPPct}%`, height: '100%', background: hpBarColor(unitHPPct), transition: 'width 0.3s ease', borderRadius: '3px' }} />
                  </div>
                  {/* Unit status effects */}
                  {(unit.statusEffects || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                      {(unit.statusEffects).map((ef, ei) => {
                        const dur = ef.permanent ? '∞' : `${ef.duration}r`;
                        const statusMeta = {
                          poison:       { label: `🤢 ${ef.value}hp`, color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)' },
                          burn:         { label: `🔥 ${ef.value}hp`, color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)' },
                          stun:         { label: '💫 Stun',           color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
                          shieldWall:   { label: '🛡️',               color: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)' },
                          counterStrike:{ label: '⚡',                color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
                          movementBoost:{ label: '🏃+10″',            color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.4)' },
                          closeCall:    { label: '🛡️CC',              color: '#f9a8d4', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.4)' },
                          attackBuff:   { label: `⚔️↑+${ef.value}`,  color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)' },
                          defenseBuff:  { label: `🛡️↑+${ef.value}`,  color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
                          attackDebuff: { label: `⚔️↓-${ef.value}`,  color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                          defenseDebuff:{ label: `🛡️↓-${ef.value}`,  color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                          marked:       { label: '🎯',                color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
                        }[ef.type] || { label: ef.type, color: colors.textFaint, bg: 'rgba(0,0,0,0.2)', border: 'rgba(90,74,58,0.3)' };
                        return (
                          <span key={ei} style={{ padding: '0.1rem 0.35rem', background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, borderRadius: '20px', color: statusMeta.color, fontSize: '0.55rem', fontWeight: '800' }}>
                            {statusMeta.label} {dur}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Attack buttons */}
                {isOwnCard && (
                  <div className="pv-unit-attacks" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <button onClick={() => openAttack(unitKey, 'shoot', unitLabel)} disabled={unitDead}
                      style={{ flex: 1, padding: '0.4rem 0', background: unitDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${unitDead ? colors.textDisabled : colors.blueBorder}`, color: unitDead ? colors.textDisabled : colors.blueLight, borderRadius: '6px', cursor: unitDead ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: '800' }}>
                      🎯 Shoot
                    </button>
                    <button onClick={() => openAttack(unitKey, 'melee', unitLabel)} disabled={unitDead}
                      style={{ flex: 1, padding: '0.4rem 0', background: unitDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${unitDead ? colors.textDisabled : colors.blueBorder}`, color: unitDead ? colors.textDisabled : colors.blueLight, borderRadius: '6px', cursor: unitDead ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: '800' }}>
                      ⚔️ Melee
                    </button>
                  </div>
                )}
                {/* Unit loot slot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', flexShrink: 0 }}>🎒 {heldCount}/{slotCount}</span>
                  {heldItems.map((item, hi) => {
                    const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                    return <div key={hi} style={pill(tc.text, tc.bg, tc.border)}><span style={{ marginRight: '0.2rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>{item.name}</div>;
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ── Inventory ── */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: borders.warm, borderRadius: '10px', overflow: 'hidden', marginTop: '0.5rem' }}>
        <div style={{ padding: '0.35rem 0.85rem', borderBottom: '1px solid rgba(201,169,97,0.1)', ...text.sectionLabel }}>🎒 Inventory</div>
        {inventory.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: '0.75rem', textAlign: 'center', padding: '0.85rem' }}>No items</div>
        )}
        <div style={{ overflowX: 'hidden' }}>
          {sortItems(inventory).map((item, i) => {
            const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
            const usesLeft = item.effect?.uses === 0 ? 999 : (item.effect?.usesRemaining ?? item.effect?.uses ?? 1);
            const canUse = !item.effect || item.effect.type === 'manual' || usesLeft > 0;
            const isKey = item.effect?.type === 'key';
            const isSelfTarget = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'].includes(item.effect?.type);
            const isEnemyTarget = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'].includes(item.effect?.type);
            const isGlobal = ['npcPlague','playerPlague','crownsFavor','nullify','mirror'].includes(item.effect?.type);
            const showUseButton = !item.isQuestItem && !isKey && (
              ['heal','maxHP','attackBonus','defenseBonus','manual','destroyItem','extraSlot','theGuy'].includes(item.effect?.type)
              || isSelfTarget || isEnemyTarget || isGlobal
            );

            const sendItemRequest = async (action) => {
              if (!isOwnCard || !lobbyCode || sending) return;
              setSending(true);
              try {
                const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                await writePendingRequest(lobbyCode, reqId, {
                  type: 'useItem',
                  reqId,
                  playerId: player.id,
                  playerName: player.playerName,
                  itemIndex: i,
                  itemName: item.name,
                  itemEffect: item.effect?.type || 'none',
                  action,
                  timestamp: Date.now(),
                });
              } finally {
                setSending(false);
              }
            };

            const heldByLabel = item.heldBy === 'commander'
              ? (player.commanderStats?.customName || player.commander || 'Commander')
              : item.heldBy === 'special'
                ? (player.subUnits?.[0]?.name?.trim() || 'Special')
                : (() => {
                    const idx = parseInt((item.heldBy || '').replace('soldier', ''));
                    return !isNaN(idx) ? (player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`) : item.heldBy;
                  })();

            return (
              <div key={i} style={{ padding: '0.65rem 0.85rem', borderLeft: `3px solid ${tc.text}`, borderBottom: i < inventory.length - 1 ? '1px solid rgba(201,169,97,0.07)' : 'none', opacity: canUse ? 1 : 0.4 }}>
                {/* Row 1: icon + name + description + tier badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: '0.05rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: tc.text, fontWeight: '700', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    {item.description && (
                      <div style={{ color: colors.textFaint, fontSize: '0.63rem', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0, alignItems: 'center' }}>
                    {item.isQuestItem && <span style={pill('#fde68a', 'rgba(234,179,8,0.1)', 'rgba(234,179,8,0.35)')}>QUEST</span>}
                    <span style={pill(tc.color || tc.text, tc.subtle || tc.bg, tc.border)}>{item.isQuestItem ? 'Quest' : item.tier}</span>
                  </div>
                </div>
                {/* Row 2: holder label + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.6rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {heldByLabel}{item.effect?.uses !== 0 && usesLeft !== 999 && ` · ${usesLeft} use${usesLeft !== 1 ? 's' : ''} left`}
                  </span>
                  {isOwnCard && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      {showUseButton && (
                        <button onClick={() => {
                          if (item.effect?.type === 'theGuy') {
                            setGuyRoll('');
                            setGuyModal({ item, index: i });
                            return;
                          }
                          const isOneUse = item.effect?.uses !== 0 && usesLeft === 1;
                          if (isOneUse) {
                            setConfirmItem({ item, index: i });
                          } else {
                            sendItemRequest('use');
                          }
                        }} disabled={!canUse || sending}
                          style={{ ...pill(canUse ? tc.text : colors.textDisabled, canUse ? (tc.subtle || tc.bg) : 'rgba(0,0,0,0.2)', canUse ? tc.border : 'rgba(90,74,58,0.2)'), cursor: canUse && !sending ? 'pointer' : 'not-allowed', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body, border: `1px solid ${canUse ? tc.border : 'rgba(90,74,58,0.2)'}` }}>✦ USE</button>
                      )}
                      {isKey && (
                        <button onClick={() => sendItemRequest('useKey')} disabled={sending}
                          style={{ ...pill(colors.amber, colors.amberSubtle, colors.amberBorder), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🔑 USE</button>
                      )}
                      {!item.isQuestItem && (
                        <button onClick={() => sendItemRequest('pass')} disabled={sending}
                          style={{ ...pill(colors.textMuted, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.35)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🤝 PASS</button>
                      )}
                      {!item.isQuestItem && (
                        <button onClick={() => { if (window.confirm(`Drop "${item.name}"?`)) sendItemRequest('drop'); }} disabled={sending}
                          style={{ ...pill('#f87171', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🗑</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Attack target modal ── */}
    {attackModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(201,169,97,0.3)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Title */}
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
            {attackModal.action === 'shoot' ? '🎯 Shoot' : attackModal.action === 'melee' ? '⚔️ Melee' : '⚡ Special'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginBottom: '1.1rem' }}>
            {attackModal.unitLabel} — pick a target
          </div>

          {/* Squad attack toggle — only for non-commander units */}
          {!isCommanderAttack && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={squadAttack}
                  onChange={e => { setSquadAttack(e.target.checked); setSquadUnits(e.target.checked ? [attackModal.unitKey] : []); }}
                  style={{ width: '16px', height: '16px', accentColor: colors.purple, cursor: 'pointer' }}
                />
                <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.78rem', letterSpacing: '0.05em' }}>Squad Attack</span>
              </label>

              {/* Unit picker dropdown */}
              {squadAttack && (
                <div style={{ marginTop: '0.6rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.purpleBorder}`, borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Select Units</span>
                    <span style={{ color: squadUnits.length >= 3 ? colors.amber : colors.textFaint, fontSize: '0.6rem', fontWeight: '700' }}>{squadUnits.length}/3</span>
                  </div>
                  {(player.subUnits || []).map((unit, i) => {
                    const uKey = i === 0 ? 'special' : `soldier${i}`;
                    const uLabel = unit.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                    const dead = unit.hp <= 0;
                    const atCap = squadUnits.length >= 3 && !squadUnits.includes(uKey);
                    const disabled = dead || atCap;
                    return (
                      <label key={uKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={squadUnits.includes(uKey)}
                          onChange={() => toggleSquadUnit(uKey)}
                          style={{ width: '14px', height: '14px', accentColor: colors.purple, cursor: disabled ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ color: colors.purpleLight, fontSize: '0.78rem', fontWeight: '700' }}>
                          {i === 0 ? '⭐' : '🛡️'} {uLabel}
                        </span>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem', marginLeft: 'auto' }}>{unit.hp}/{unit.maxHp}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NPC targets */}
          {npcs.length > 0 && (
            <>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enemies</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {npcs.map(npc => (
                  <button key={npc.id} onClick={() => sendAttackRequest({ id: npc.id, type: 'npc', name: npc.name })} disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: '#fecaca', fontWeight: '700', fontSize: '0.85rem' }}>{npc.name}</div>
                      <div style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{npc.hp}/{npc.maxHp} HP</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Player targets */}
          {allPlayers.filter(p => p.id !== player.id && !p.commanderStats?.isDead && !p.isAbsent).length > 0 && (
            <>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {allPlayers.filter(p => p.id !== player.id && !p.commanderStats?.isDead && !p.isAbsent).map(enemyPlayer => {
                  const isExpanded = expandedTargetId === enemyPlayer.id;
                  const pColor = enemyPlayer.playerColor || colors.blue;

                  const unitOptions = [];
                  if (!enemyPlayer.commanderStats?.isDead && (enemyPlayer.commanderStats?.hp ?? 0) > 0) {
                    const cmdName = enemyPlayer.commanderStats?.customName || enemyPlayer.commander || 'Commander';
                    unitOptions.push({ unitKey: 'commander', unitLabel: cmdName, hp: enemyPlayer.commanderStats.hp, maxHp: enemyPlayer.commanderStats.maxHp });
                  }
                  (enemyPlayer.subUnits || []).forEach((unit, i) => {
                    if (unit.hp <= 0) return;
                    const uKey = i === 0 ? 'special' : `soldier${i}`;
                    const uLabel = unit.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                    unitOptions.push({ unitKey: uKey, unitLabel: uLabel, hp: unit.hp, maxHp: unit.maxHp });
                  });

                  const toggleEnemyUnit = (unitKey, unitLabel) => {
                    setTargetUnitKeys(prev => {
                      const exists = prev.find(t => t.unitKey === unitKey && t.playerId === enemyPlayer.id);
                      if (exists) return prev.filter(t => !(t.unitKey === unitKey && t.playerId === enemyPlayer.id));
                      if (prev.length >= 3) return prev;
                      return [...prev, { playerId: enemyPlayer.id, unitKey, unitLabel }];
                    });
                  };

                  const selectedForThisPlayer = targetUnitKeys.filter(t => t.playerId === enemyPlayer.id);
                  const totalSelected = targetUnitKeys.length;

                  return (
                    <div key={enemyPlayer.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                      <button
                        onClick={() => {
                          setExpandedTargetId(isExpanded ? null : enemyPlayer.id);
                          setTargetUnitKeys(prev => prev.filter(t => t.playerId === enemyPlayer.id));
                        }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{enemyPlayer.playerName}</span>
                        {selectedForThisPlayer.length > 0 && (
                          <span style={{ color: colors.amber, fontSize: '0.65rem', fontWeight: '800' }}>{selectedForThisPlayer.length} selected</span>
                        )}
                        <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ padding: '0.4rem 0.85rem 0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Choose targets (max 3)</span>
                            <span style={{ color: totalSelected >= 3 ? colors.amber : colors.textFaint, fontSize: '0.62rem', fontWeight: '700' }}>{totalSelected}/3</span>
                          </div>
                          {unitOptions.map(({ unitKey, unitLabel, hp, maxHp }) => {
                            const isChecked = targetUnitKeys.some(t => t.unitKey === unitKey && t.playerId === enemyPlayer.id);
                            const atCap = totalSelected >= 3 && !isChecked;
                            const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                            const labelColor = unitKey === 'commander' ? colors.gold : colors.purpleLight;
                            return (
                              <label key={unitKey} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.85rem', cursor: atCap ? 'not-allowed' : 'pointer', opacity: atCap ? 0.35 : 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <input
                                  type="checkbox"
                                  disabled={atCap}
                                  checked={isChecked}
                                  onChange={() => toggleEnemyUnit(unitKey, unitLabel)}
                                  style={{ width: '14px', height: '14px', accentColor: pColor, cursor: atCap ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                                />
                                <span style={{ flex: 1, color: labelColor, fontWeight: '700', fontSize: '0.8rem' }}>{icon} {unitLabel}</span>
                                <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                              </label>
                            );
                          })}
                          {selectedForThisPlayer.length > 0 && (
                            <div style={{ padding: '0.5rem 0.85rem 0.65rem' }}>
                              <button
                                onClick={() => sendAttackRequest({ id: enemyPlayer.id, type: 'player', name: enemyPlayer.playerName })}
                                disabled={sending}
                                style={{ width: '100%', padding: '0.6rem', background: pColor + '20', border: `1px solid ${pColor}50`, borderRadius: '7px', color: pColor, fontWeight: '800', fontSize: '0.78rem', fontFamily: fonts.body, cursor: sending ? 'not-allowed' : 'pointer' }}
                              >
                                ⚔️ Attack {selectedForThisPlayer.length} unit{selectedForThisPlayer.length > 1 ? 's' : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {npcs.length === 0 && allPlayers.filter(p => p.id !== player.id).length === 0 && (
            <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No targets available</div>
          )}

          <button onClick={() => setAttackModal(null)} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.82rem' }}>
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* ── One-use item confirmation modal ── */}
    {confirmItem && (() => {
      const { item: ci, index: ci_idx } = confirmItem;
      const ciTc = ci.isQuestItem ? tierColors.Quest : (tierColors[ci.tier] || tierColors.Common);
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4100, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${ciTc.border}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.95)', textAlign: 'center' }}>

            {/* Icon + title */}
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✦</div>
            <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              Use Item?
            </div>

            {/* Item info */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${ciTc.border}`, borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: ci.description ? '0.4rem' : 0 }}>
                <span style={{ fontSize: '1rem' }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: ciTc.text, fontWeight: '800', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.name}</div>
                  <div style={{ color: ciTc.text, fontSize: '0.62rem', fontWeight: '700', opacity: 0.7, marginTop: '0.1rem' }}>{ci.tier} · 1 use remaining</div>
                </div>
              </div>
              {ci.description && (
                <div style={{ color: colors.textFaint, fontSize: '0.7rem', lineHeight: '1.4', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {ci.description}
                </div>
              )}
            </div>

            <div style={{ color: colors.textFaint, fontSize: '0.72rem', marginBottom: '1.25rem' }}>
              This item will be <span style={{ color: '#fca5a5', fontWeight: '800' }}>consumed</span> after use. The GM will process the effect.
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                onClick={() => setConfirmItem(null)}
                style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >✕ Cancel</button>
              <button
                onClick={() => {
                  setConfirmItem(null);
                  // Build a scoped sendItemRequest for this specific item index
                  (async () => {
                    if (!isOwnCard || !lobbyCode || sending) return;
                    setSending(true);
                    try {
                      const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                      const { writePendingRequest } = await import('../services/gameStateService');
                      await writePendingRequest(lobbyCode, reqId, {
                        type: 'useItem', reqId,
                        playerId:   player.id,
                        playerName: player.playerName,
                        itemIndex:  ci_idx,
                        itemName:   ci.name,
                        itemEffect: ci.effect?.type || 'none',
                        action:     'use',
                        timestamp:  Date.now(),
                      });
                    } finally { setSending(false); }
                  })();
                }}
                style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >✦ Confirm Use</button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── The Guy modal ── */}
    {guyModal && (() => {
      const { item: gi, index: gi_idx } = guyModal;
      const tier = gi.tier || 'Common';
      const tc = tierColors[tier] || tierColors.Common;

      const GUY_OUTCOMES = {
        Common: [
          { roll: 1, label: '+2 to your next attack roll' },
          { roll: 2, label: 'Heal 2HP to one of your units' },
          { roll: 3, label: 'Roll 1d10 — unblockable damage to a target' },
          { roll: 4, label: 'Cleanse all squad units of poison, burn & stun' },
        ],
        Rare: [
          { roll: 1, label: 'Heal 5HP to one of your units' },
          { roll: 2, label: 'Extra 10″ movement (active until DM removes)' },
          { roll: 3, label: 'Roll 2d10 — unblockable damage to a target' },
          { roll: 4, label: '+5 to your next defense roll' },
        ],
        Legendary: [
          { roll: 1, label: 'Choose any Common or Rare item from the loot pool' },
          { roll: 2, label: 'Poison all active NPCs' },
          { roll: 3, label: 'Absorb your next instance of damage (Close Call)' },
          { roll: 4, label: 'Revive one dead unit to full HP' },
        ],
      };

      const outcomes = GUY_OUTCOMES[tier] || GUY_OUTCOMES.Common;
      const rollNum = parseInt(guyRoll);
      const validRoll = rollNum >= 1 && rollNum <= 4;
      const selectedOutcome = validRoll ? outcomes[rollNum - 1] : null;

      const handleSend = async () => {
        if (!validRoll || sending) return;
        setSending(true);
        try {
          const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await writePendingRequest(lobbyCode, reqId, {
            type: 'useItem',
            reqId,
            playerId: player.id,
            playerName: player.playerName,
            itemIndex: gi_idx,
            itemName: gi.name,
            itemEffect: 'theGuy',
            itemTier: tier,
            guyRoll: rollNum,
            guyOutcomeLabel: selectedOutcome?.label,
            action: 'use',
            timestamp: Date.now(),
          });
          setGuyModal(null);
        } finally {
          setSending(false);
        }
      };

      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${tc.border}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎲</div>
              <div style={{ color: tc.text, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.08em' }}>The Guy — {tier}</div>
              <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>Roll 1d4 at the table</div>
            </div>

            {/* Outcome table */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${tc.border}`, borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ color: tc.text, fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Possible Outcomes</div>
              {outcomes.map(o => (
                <div key={o.roll} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.3rem 0', borderBottom: o.roll < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: tc.text, fontWeight: '900', fontSize: '0.78rem', minWidth: '1rem', flexShrink: 0 }}>{o.roll}</span>
                  <span style={{ color: colors.textSecondary, fontSize: '0.72rem', lineHeight: '1.35' }}>{o.label}</span>
                </div>
              ))}
            </div>

            {/* Roll input */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Enter your roll (1–4)</div>
              <input
                type="number" min="1" max="4"
                value={guyRoll}
                onChange={e => setGuyRoll(e.target.value)}
                style={{ width: '100%', padding: '0.7rem', background: 'rgba(0,0,0,0.4)', border: `2px solid ${validRoll ? tc.border : 'rgba(90,74,58,0.4)'}`, borderRadius: '8px', color: validRoll ? tc.text : colors.textMuted, fontSize: '1.1rem', fontWeight: '900', textAlign: 'center', fontFamily: fonts.body, boxSizing: 'border-box', outline: 'none' }}
                placeholder="—"
              />
            </div>

            {/* Selected outcome highlight */}
            {selectedOutcome && (
              <div style={{ background: 'rgba(34,197,94,0.06)', border: `1px solid ${tc.border}`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem' }}>
                <div style={{ color: tc.text, fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Roll {rollNum} Result</div>
                <div style={{ color: colors.textPrimary, fontSize: '0.8rem', fontWeight: '700', lineHeight: '1.35' }}>{selectedOutcome.label}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button onClick={() => setGuyModal(null)} style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
              <button onClick={handleSend} disabled={!validRoll || sending} style={{ padding: '0.85rem', background: validRoll ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${validRoll ? 'rgba(34,197,94,0.4)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: validRoll ? '#86efac' : colors.textDisabled, cursor: validRoll ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✦ Send to DM</button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
};

// ── Guy Target Pick Screen ────────────────────────────────────────────────────
// Two-step: first choose NPC or Player, then pick from list.
// Player targets expand on click to show their units.
const GuyTargetPickScreen = ({ choice, lobbyCode, myPlayer, allPlayers, npcs, onSubmit }) => {
  const [step, setStep] = React.useState('type'); // 'type' | 'npc' | 'player'
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedTarget, setSelectedTarget] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const dice = choice.dice || '1d10';
  const numRolls = choice.numRolls || 1;
  const dieType = choice.dieType || 'd10';

  const enemyPlayers = (allPlayers || []).filter(p =>
    p.id !== myPlayer?.id && !p.isAbsent && !p.commanderStats?.isDead && (p.commanderStats?.hp ?? 0) > 0
  );

  const submit = async () => {
    if (!selectedTarget || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice', reqId,
        choiceId: choice.choiceId,
        playerId: myPlayer?.id,
        playerName: myPlayer?.playerName,
        itemEffect: 'guyAttack',
        targetType: selectedTarget.type,
        targetNpcId: selectedTarget.npcId || null,
        targetPlayerId: selectedTarget.playerId || null,
        targetUnitKey: selectedTarget.unitKey || null,
        targetUnitLabel: selectedTarget.unitLabel || null,
        targetName: selectedTarget.name || null,
        guyNumRolls: numRolls,
        guyDieType: dieType,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  const orangeBorder = 'rgba(249,115,22,0.5)';
  const containerStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' };
  const boxStyle = { background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${orangeBorder}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎯</div>
          <div style={{ color: '#fb923c', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>The Guy — Pick a Target</div>
          <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>{dice} unblockable damage</div>
        </div>

        {/* Step 1 — choose type */}
        {step === 'type' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <button onClick={() => setStep('npc')} disabled={npcs.length === 0} style={{
              padding: '1.1rem 0.5rem', borderRadius: '10px', cursor: npcs.length > 0 ? 'pointer' : 'not-allowed',
              background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)',
              color: npcs.length > 0 ? '#fca5a5' : colors.textDisabled,
              fontFamily: fonts.body, fontWeight: '900', fontSize: '0.9rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>👾</div>
              NPC
              {npcs.length === 0 && <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>None active</div>}
            </button>
            <button onClick={() => setStep('player')} disabled={enemyPlayers.length === 0} style={{
              padding: '1.1rem 0.5rem', borderRadius: '10px', cursor: enemyPlayers.length > 0 ? 'pointer' : 'not-allowed',
              background: 'rgba(139,92,246,0.1)', border: '2px solid rgba(139,92,246,0.4)',
              color: enemyPlayers.length > 0 ? '#c4b5fd' : colors.textDisabled,
              fontFamily: fonts.body, fontWeight: '900', fontSize: '0.9rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>⚔️</div>
              Player
              {enemyPlayers.length === 0 && <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>None available</div>}
            </button>
          </div>
        )}

        {/* Step 2a — NPC list */}
        {step === 'npc' && (
          <>
            <button onClick={() => { setStep('type'); setSelectedTarget(null); }} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.75rem', padding: 0 }}>← Back</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
              {npcs.map(npc => {
                const isSelected = selectedTarget?.npcId === npc.id;
                return (
                  <div key={npc.id} onClick={() => setSelectedTarget({ type: 'npc', npcId: npc.id, name: npc.name })} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                    background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${isSelected ? '#f97316' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    <span style={{ color: isSelected ? '#fdba74' : '#fca5a5', fontWeight: '800', fontSize: '0.85rem' }}>👾 {npc.name}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{npc.hp}/{npc.maxHp}hp · 🛡️{npc.armor}+</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2b — Player list with expandable units */}
        {step === 'player' && (
          <>
            <button onClick={() => { setStep('type'); setSelectedTarget(null); setExpandedPlayerId(null); }} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.75rem', padding: 0 }}>← Back</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {enemyPlayers.map(p => {
                const isExpanded = expandedPlayerId === p.id;
                const units = [
                  { key: 'commander', label: p.commanderStats?.customName || p.commander || 'Commander', hp: p.commanderStats?.hp, maxHp: p.commanderStats?.maxHp },
                  ...(p.subUnits || []).filter(u => u.hp > 0).map((u, i) => ({
                    key: i === 0 ? 'special' : `soldier${i}`,
                    label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`),
                    hp: u.hp, maxHp: u.maxHp,
                  })),
                ];
                return (
                  <div key={p.id}>
                    {/* Player name row — click to expand */}
                    <div onClick={() => setExpandedPlayerId(isExpanded ? null : p.id)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.55rem 0.75rem', borderRadius: isExpanded ? '8px 8px 0 0' : '8px', cursor: 'pointer',
                      background: isExpanded ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${isExpanded ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)'}`,
                      borderBottom: isExpanded ? '1px solid rgba(139,92,246,0.2)' : undefined,
                    }}>
                      <span style={{ color: p.playerColor || '#c4b5fd', fontWeight: '900', fontSize: '0.85rem' }}>{p.playerName}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▲' : '▼'} {units.length} unit{units.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Unit list — shown when expanded */}
                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.25)', border: '2px solid rgba(139,92,246,0.2)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.4rem' }}>
                        {units.map(u => {
                          const isSelected = selectedTarget?.playerId === p.id && selectedTarget?.unitKey === u.key;
                          return (
                            <div key={u.key} onClick={() => setSelectedTarget({ type: 'player', playerId: p.id, unitKey: u.key, unitLabel: u.label, name: `${p.playerName} — ${u.label}` })} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.2rem',
                              background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.2)',
                              border: `2px solid ${isSelected ? '#f97316' : 'rgba(139,92,246,0.15)'}`,
                            }}>
                              <span style={{ color: isSelected ? '#fdba74' : colors.textSecondary, fontWeight: '700', fontSize: '0.8rem' }}>{u.label}</span>
                              <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{u.hp}/{u.maxHp}hp</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Selected target summary */}
        {selectedTarget && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
            <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800' }}>TARGET: </span>
            <span style={{ color: '#fdba74', fontWeight: '800', fontSize: '0.8rem' }}>{selectedTarget.name}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button onClick={onSubmit} style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
          <button onClick={submit} disabled={!selectedTarget || sending} style={{ padding: '0.85rem', background: selectedTarget ? 'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(180,60,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${selectedTarget ? 'rgba(249,115,22,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: selectedTarget ? '#fdba74' : colors.textDisabled, cursor: selectedTarget ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>🎯 Confirm Target</button>
        </div>
      </div>
    </div>
  );
};

// ── Guy Item Pick Screen ──────────────────────────────────────────────────────
// Shown to the player after The Guy (Legendary) roll 1.
// Player picks any Common or Rare item from the loot pool.
const GuyItemPickScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [selectedUnitKey, setSelectedUnitKey] = React.useState('');
  const [swapItemId, setSwapItemId] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const lootPool = choice.lootPool || [];
  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;

  const allUnits = freshMe ? [
    { key: 'commander', label: freshMe.commanderStats?.customName || freshMe.commander || 'Commander' },
    ...(freshMe.subUnits || []).map((u, i) => ({
      key: i === 0 ? 'special' : `soldier${i}`,
      label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`),
    })),
  ] : [];

  const unitIsFull = (unitKey) => {
    if (!freshMe || !selectedItem) return false;
    const held = (freshMe.inventory || []).filter(it => it.heldBy === unitKey && !it.isQuestItem).length;
    const slots = 1 + ((freshMe.commanderStats?.bonusSlots || 0));
    const unit = unitKey === 'commander' ? null : (freshMe.subUnits || [])[unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier',''))];
    const unitSlots = unitKey === 'commander' ? slots : 1 + (unit?.bonusSlots || 0);
    return held >= unitSlots;
  };

  const selectedUnitFull = selectedUnitKey ? unitIsFull(selectedUnitKey) : false;
  const heldItems = selectedUnitFull
    ? (freshMe?.inventory || []).filter(it => it.heldBy === selectedUnitKey && !it.isQuestItem)
    : [];
  const canConfirm = !!selectedItem && !!selectedUnitKey && (!selectedUnitFull || !!swapItemId);

  const submit = async () => {
    if (!canConfirm || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice',
        reqId,
        choiceId: choice.choiceId,
        playerId: myPlayer?.id,
        playerName: myPlayer?.playerName,
        itemEffect: 'theGuyLegendary1',
        targetType: 'self',
        targetUnitKey: selectedUnitKey,
        targetUnitLabel: allUnits.find(u => u.key === selectedUnitKey)?.label || selectedUnitKey,
        guyPickedItem: selectedItem,
        swapItemId: swapItemId || null,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(251,191,36,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎲</div>
          <div style={{ color: '#fbbf24', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.08em' }}>The Guy — Legendary</div>
          <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>Choose any Common or Rare item</div>
        </div>

        {/* Item list */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Available Items</div>
          {lootPool.length === 0 && <div style={{ color: colors.textFaint, fontSize: '0.72rem' }}>No Common or Rare items in the loot pool.</div>}
          {lootPool.map(it => {
            const tc = tierColors[it.tier] || tierColors.Common;
            const isSelected = selectedItem?.id === it.id;
            return (
              <div key={it.id} onClick={() => { setSelectedItem(it); setSelectedUnitKey(''); setSwapItemId(null); }} style={{
                padding: '0.5rem 0.7rem', borderRadius: '7px', cursor: 'pointer', marginBottom: '0.3rem',
                background: isSelected ? 'rgba(251,191,36,0.1)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${isSelected ? 'rgba(251,191,36,0.5)' : tc.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: tc.text, fontWeight: '800', fontSize: '0.82rem' }}>{it.name}</span>
                  <span style={{ color: tc.text, fontSize: '0.6rem', fontWeight: '700', opacity: 0.8 }}>{it.tier}</span>
                </div>
                {it.description && <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.2rem', lineHeight: '1.3' }}>{it.description}</div>}
              </div>
            );
          })}
        </div>

        {/* Unit picker */}
        {selectedItem && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Assign to Unit</div>
            {allUnits.map(u => {
              const full = unitIsFull(u.key);
              const isSelected = selectedUnitKey === u.key;
              return (
                <div key={u.key} onClick={() => { setSelectedUnitKey(u.key); setSwapItemId(null); }} style={{
                  padding: '0.4rem 0.7rem', borderRadius: '7px', cursor: 'pointer', marginBottom: '0.3rem',
                  background: isSelected ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${isSelected ? 'rgba(34,197,94,0.4)' : full ? 'rgba(249,115,22,0.3)' : 'rgba(90,74,58,0.3)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isSelected ? '#86efac' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem' }}>{u.label}</span>
                    {full && <span style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800' }}>{isSelected ? '↕ SWAP' : 'FULL'}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Swap picker */}
        {selectedUnitFull && heldItems.length > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '8px', padding: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ color: '#f97316', fontSize: '0.65rem', fontWeight: '900', marginBottom: '0.4rem' }}>↕ Unit is full — choose item to drop:</div>
            {heldItems.map(it => (
              <div key={it.id} onClick={() => setSwapItemId(it.id)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.25rem',
                background: swapItemId === it.id ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${swapItemId === it.id ? '#f97316' : 'rgba(249,115,22,0.2)'}`,
              }}>
                <span style={{ color: swapItemId === it.id ? '#fdba74' : colors.amber, fontWeight: '800', fontSize: '0.78rem' }}>{it.name}</span>
                {swapItemId === it.id && <span style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800' }}>✓ DROP</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button onClick={onSubmit} style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
          <button onClick={submit} disabled={!canConfirm || sending} style={{ padding: '0.85rem', background: canConfirm ? 'linear-gradient(135deg,rgba(251,191,36,0.2),rgba(180,130,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canConfirm ? 'rgba(251,191,36,0.4)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: canConfirm ? '#fbbf24' : colors.textDisabled, cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✦ Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ── Pass Choice Screen ────────────────────────────────────────────────────────
// Shown to the item owner after the GM approves their pass request.
// Player picks a target player + unit → auto-detects give vs trade → confirms.
// Then writes an itemChoice back so the GM can do a final hand-off approval.
const PassChoiceScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedPlayerId, setSelectedPlayerId] = React.useState('');
  const [selectedUnitType, setSelectedUnitType] = React.useState('');
  const [tradeItem,        setTradeItem]        = React.useState(null);
  const [sending,          setSending]          = React.useState(false);

  // The item being passed (look it up from the live allPlayers snapshot for freshest inventory)
  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;
  const item = freshMe ? (freshMe.inventory || [])[choice.itemIndex] : null;

  // Unit helpers
  const getAllUnits = (player) => {
    const units = [{
      unitType: 'commander',
      label: player.commanderStats?.customName || player.commander || 'Commander',
      hp: player.commanderStats?.hp || 0,
      maxHp: player.commanderStats?.maxHp || 1,
      isDead: (player.commanderStats?.hp || 0) === 0,
    }];
    (player.subUnits || []).forEach((u, idx) => {
      units.push({
        unitType: idx === 0 ? 'special' : `soldier${idx}`,
        label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`),
        hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0,
      });
    });
    return units;
  };

  const getSlots = (p, unitType) => {
    const fromItems = (p.inventory || []).filter(it => it.heldBy === unitType && it.effect?.type === 'extraSlot').length;
    let fromUnit = 0;
    if (unitType === 'commander') { fromUnit = p.commanderStats?.bonusSlots || 0; }
    else { const idx = unitType === 'special' ? 0 : parseInt((unitType||'').replace('soldier','')); fromUnit = p.subUnits?.[idx]?.bonusSlots || 0; }
    return 1 + fromItems + fromUnit;
  };
  const getHeld  = (p, unitType) => (p.inventory || []).filter(it => it.heldBy === unitType && !it.isQuestItem).length;
  const isFull   = (p, unitType) => getHeld(p, unitType) >= getSlots(p, unitType);

  const targetPlayer  = allPlayers.find(p => String(p.id) === String(selectedPlayerId));
  const targetUnits   = targetPlayer ? getAllUnits(targetPlayer) : [];

  // Items the selected unit already holds (for trade)
  const unitHeldItems = targetPlayer && selectedUnitType
    ? (targetPlayer.inventory || []).filter(it => it.heldBy === selectedUnitType && !it.isQuestItem)
    : [];

  const unitFull = targetPlayer && selectedUnitType ? isFull(targetPlayer, selectedUnitType) : false;

  // Auto-mode: if target unit has no items → give; if it does → trade required
  const mode = unitHeldItems.length === 0 ? 'give' : 'trade';

  // Source unit label (where item currently lives)
  const sourceUnitLabel = !item ? '' : (() => {
    const ut = item.heldBy;
    if (!ut || ut === 'commander') return freshMe?.commanderStats?.customName || freshMe?.commander || 'Commander';
    if (ut === 'special') return freshMe?.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(ut.replace('soldier', ''));
    return freshMe?.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  })();

  const canConfirm = !!(selectedPlayerId && selectedUnitType && (mode === 'give' || (mode === 'trade' && tradeItem)));

  const handleSelectUnit = (unitType) => {
    setSelectedUnitType(unitType);
    setTradeItem(null);
  };

  const handleSubmit = async () => {
    if (!canConfirm || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:               'itemChoice',
        reqId,
        choiceId:           choice.choiceId,
        playerId:           myPlayer?.id,
        playerName:         myPlayer?.playerName,
        itemIndex:          choice.itemIndex,
        itemName:           choice.itemName || item?.name,
        itemEffect:         'passChoice',   // sentinel so GM routes to firstPassChoice
        // Pass-specific fields
        passTargetPlayerId: selectedPlayerId,
        passTargetUnitType: selectedUnitType,
        passMode:           mode,
        passTradeItemId:    tradeItem?.id || null,
        timestamp:          Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  const tierColors2 = {
    Common:    { text: '#d1d5db', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' },
    Rare:      { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
    Legendary: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.35)'  },
  };
  const tc = item ? (tierColors2[item.tier] || tierColors2.Common) : tierColors2.Common;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🤝</div>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>
            Pass Item
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginTop: '0.25rem' }}>
            Choose who receives <span style={{ color: tc.text, fontWeight: '800' }}>{item?.name || choice.itemName}</span>
            {sourceUnitLabel && <span style={{ color: colors.textFaint }}> from {sourceUnitLabel}</span>}
          </div>
        </div>

        {/* Player picker */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
            Receiving Player
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {allPlayers.filter(p => !p.isAbsent).map(p => {
              const isMe     = String(p.id) === String(myPlayer?.id);
              const selected = String(p.id) === String(selectedPlayerId);
              const pColor   = p.playerColor || colors.blue;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPlayerId(String(p.id)); setSelectedUnitType(''); setTradeItem(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    background: selected ? `${pColor}18` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selected ? pColor + '60' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: selected ? pColor : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>
                    {p.playerName}{isMe ? ' (you)' : ''}
                  </span>
                  {selected && <span style={{ color: pColor, fontSize: '0.65rem', fontWeight: '800' }}>▸</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unit picker */}
        {targetPlayer && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              Receiving Unit
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {targetUnits.map(u => {
                const isSelf    = String(targetPlayer.id) === String(myPlayer?.id) && u.unitType === item?.heldBy;
                const full      = !item?.isQuestItem && isFull(targetPlayer, u.unitType) && unitHeldItems.length === 0;
                const selected  = selectedUnitType === u.unitType;
                const unitItems = (targetPlayer.inventory || []).filter(it => it.heldBy === u.unitType && !it.isQuestItem);
                const disabled  = u.isDead || isSelf;
                return (
                  <div
                    key={u.unitType}
                    onClick={() => !disabled && handleSelectUnit(u.unitType)}
                    style={{
                      padding: '0.6rem 0.85rem', borderRadius: '8px',
                      background: selected ? 'rgba(201,169,97,0.1)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${selected ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.35 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: selected ? colors.gold : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', flex: 1 }}>
                        {u.unitType === 'commander' ? '👑' : u.unitType === 'special' ? '⭐' : '🛡️'} {u.label}
                      </span>
                      {isSelf  && <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800' }}>SOURCE</span>}
                      {u.isDead && <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800' }}>DEAD</span>}
                      {unitItems.length > 0 && (
                        <span style={{ color: colors.amber, fontSize: '0.65rem', fontWeight: '800' }}>
                          {unitItems.length} item{unitItems.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {unitItems.length === 0 && !u.isDead && !isSelf && (
                        <span style={{ color: '#4ade80', fontSize: '0.6rem', fontWeight: '800' }}>OPEN</span>
                      )}
                    </div>
                    {/* Show items on this unit so player knows what they'd be trading */}
                    {selected && unitItems.length > 0 && (
                      <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                          ⇄ Trade required — select item to receive back
                        </div>
                        {unitItems.map(it => {
                          const itc = tierColors2[it.tier] || tierColors2.Common;
                          return (
                            <div
                              key={it.id}
                              onClick={e => { e.stopPropagation(); setTradeItem(tradeItem?.id === it.id ? null : it); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.4rem 0.6rem', marginTop: '0.25rem',
                                background: tradeItem?.id === it.id ? `${itc.bg}` : 'rgba(0,0,0,0.2)',
                                border: `1px solid ${tradeItem?.id === it.id ? itc.border : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: '6px', cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>📦</span>
                              <span style={{ flex: 1, color: tradeItem?.id === it.id ? itc.text : colors.textPrimary, fontWeight: '700', fontSize: '0.8rem' }}>{it.name}</span>
                              <span style={{ color: itc.text, fontSize: '0.62rem', fontWeight: '800', flexShrink: 0 }}>{it.tier}</span>
                              {tradeItem?.id === it.id && <span style={{ color: '#4ade80', fontSize: '0.7rem', flexShrink: 0 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary box */}
        {canConfirm && (
          <div style={{ background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '1rem', fontSize: '0.72rem' }}>
            {mode === 'give' ? (
              <span style={{ color: '#86efac' }}>
                🎁 <strong style={{ color: colors.gold }}>{item?.name}</strong> will be given to <strong style={{ color: colors.purpleLight }}>{targetPlayer?.playerName}</strong>. Awaiting GM approval.
              </span>
            ) : (
              <span style={{ color: colors.amber }}>
                ⇄ <strong style={{ color: colors.gold }}>{item?.name}</strong> trades with <strong style={{ color: colors.amber }}>{tradeItem?.name}</strong> from <strong style={{ color: colors.purpleLight }}>{targetPlayer?.playerName}</strong>. Awaiting GM approval.
              </span>
            )}
          </div>
        )}

        {/* Confirm / Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button
            onClick={onSubmit}
            style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
          >✕ Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canConfirm || sending}
            style={{ padding: '0.85rem', background: canConfirm ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canConfirm ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canConfirm ? '#86efac' : colors.textDisabled, cursor: canConfirm && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
          >{sending ? '⏳ Sending...' : '✓ Confirm Pass'}</button>
        </div>
      </div>
    </div>
  );
};

// ── End Turn Button ───────────────────────────────────────────────────────────
const EndTurnButton = ({ lobbyCode, player, pColor }) => {
  const [sending, setSending] = React.useState(false);
  const [sent,    setSent]    = React.useState(false);

  const handleEndTurn = async () => {
    if (!lobbyCode || !player || sending || sent) return;
    setSending(true);
    try {
      const reqId = `endturn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:       'endTurn',
        reqId,
        playerId:   player.id,
        playerName: player.playerName,
        timestamp:  Date.now(),
      });
      setSent(true);
      // Reset after a few seconds so they can re-request if DM denies
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleEndTurn}
      disabled={sending || sent}
      style={{
        padding: '0.3rem 0.7rem',
        background: sent
          ? 'rgba(34,197,94,0.1)'
          : `${pColor}18`,
        border: `1px solid ${sent ? 'rgba(34,197,94,0.4)' : pColor + '50'}`,
        borderRadius: '8px',
        color: sent ? '#86efac' : pColor,
        cursor: sending || sent ? 'not-allowed' : 'pointer',
        fontFamily: fonts.body,
        fontWeight: '800',
        fontSize: '0.65rem',
        letterSpacing: '0.05em',
        flexShrink: 0,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {sent ? '⏳ Waiting...' : '⏭️ End Turn'}
    </button>
  );
};

// ── Player Stats Panel ────────────────────────────────────────────────────────
const PlayerStatsPanel = ({ player }) => {
  const isUncivilized = player.faction === 'Uncivilized';
  const [subtypeView, setSubtypeView] = React.useState('caveman');

  const cmdStats = COMMANDER_STATS[player.faction] || COMMANDER_STATS[player.commander] || {};
  const rawFacStats = FACTION_STATS[player.faction] || {};
  // For Uncivilized pick the right subtype stats; for others use directly
  const facStats = isUncivilized
    ? (rawFacStats[subtypeView] || {})
    : rawFacStats;

  const statRow = (label, cmdVal, facVal) => (
    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{label}</span>
      <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{cmdVal ?? '—'}</span>
      <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{facVal ?? '—'}</span>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginTop: '0.75rem' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          📊 Stats Reference
        </div>
        {/* Uncivilized subtype toggle */}
        {isUncivilized && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setSubtypeView('caveman')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'caveman' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'caveman' ? 'rgba(251,191,36,0.1)' : 'transparent', color: subtypeView === 'caveman' ? '#fbbf24' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🪨 Caveman</button>
            <button
              onClick={() => setSubtypeView('dinosaur')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.1)' : 'transparent', color: subtypeView === 'dinosaur' ? '#6ee7b7' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🦕 Dinosaur</button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.4rem 0.85rem 0.3rem', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stat</span>
        <span style={{ color: colors.gold, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          👑 {player.commanderStats?.customName || player.commander || 'Commander'}
        </span>
        <span style={{ color: colors.purpleLight, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          {isUncivilized ? (subtypeView === 'dinosaur' ? '🦕 Dinosaur' : '🪨 Caveman') : `🛡️ ${player.faction || 'Faction'}`}
        </span>
      </div>

      {/* Stat rows */}
      <div style={{ padding: '0.25rem 0.85rem 0.75rem' }}>
        {statRow('Walk',         cmdStats.walk,          facStats.walk)}
        {statRow('Run',          cmdStats.run,           facStats.run)}
        {statRow('Shoot Range',  cmdStats.shootRange,    facStats.shootRange)}
        {statRow('Sp. Range',    cmdStats.specialRange ? `${cmdStats.specialRange}"` : null, facStats.specialRange ? `${facStats.specialRange}"` : null)}
        {statRow('Attacks/Hit',  cmdStats.attacksPerHit, facStats.attacksPerHit)}
        {statRow('Roll to Heal', cmdStats.rollToHeal ? `${cmdStats.rollToHeal}+` : null, facStats.rollToHeal ? `${facStats.rollToHeal}+` : null)}
      </div>
    </div>
  );
};

// ── Read-only NPC Card ────────────────────────────────────────────────────────
const ReadOnlyNPCCard = ({ npc, onShowMoveset }) => {
  const pct    = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
  const active = npc.active && !npc.isDead;
  const dead   = npc.isDead;
  const dotColor    = dead ? '#4b5563' : active ? '#ef4444' : '#6b7280';
  const borderColor = dead ? 'rgba(75,85,99,0.2)' : active ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.2)';
  const hasMoveset  = active && ((npc.attacks || []).length > 0);
  return (
    <div
      onClick={() => hasMoveset && onShowMoveset?.(npc)}
      style={{
        background: 'linear-gradient(145deg,#160e0e,#0e0808)',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px', padding: '1rem',
        opacity: dead ? 0.4 : active ? 1 : 0.65,
        cursor: hasMoveset ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: active ? '0.75rem' : 0 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, boxShadow: active ? `0 0 6px ${dotColor}` : 'none', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: dead ? '#6b7280' : active ? '#fecaca' : colors.textMuted, fontWeight: '800', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{npc.name || 'Unknown'}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>
            {dead ? '💀 Defeated' : active ? '⚔️ In Battle' : '⏳ Staging'}
          </div>
        </div>
        {active && <div style={{ color: colors.amber, fontWeight: '700', fontSize: '0.82rem', flexShrink: 0 }}>{npc.hp} / {npc.maxHp}</div>}
        {hasMoveset && <div style={{ color: colors.textFaint, fontSize: '0.65rem', flexShrink: 0 }}>Moves ▸</div>}
      </div>
      {active && (
        <>
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: hpBarColor(pct), borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.4rem', marginTop: '0.6rem' }}>
            {[
              { label: 'Attack', value: npc.attackBonus != null ? `+${npc.attackBonus}` : '—', color: '#fca5a5', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
              { label: 'Armor',  value: npc.armor != null ? `${npc.armor}+` : '—',             color: '#93c5fd', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
              { label: 'Walk',   value: npc.walk  || '—',                                       color: '#fbbf24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)' },
              { label: 'Run',    value: npc.run   || '—',                                       color: '#fde68a', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '6px', padding: '0.3rem', textAlign: 'center' }}>
                <div style={{ color: color, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{label}</div>
                <div style={{ color: color, fontWeight: '800', fontSize: '0.78rem', marginTop: '0.1rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── NPC Moveset Modal ─────────────────────────────────────────────────────────
const NPCMovesetModal = ({ npc, onClose }) => {
  // Determine which attacks to show based on currentPhase
  // currentPhase 0 = Phase 1 (npc.attacks), 1+ = npc.phases[currentPhase-1].attacks
  const phase = npc.currentPhase || 0;
  let attacks = npc.attacks || [];
  let phaseLabel = null;
  if (npc.hasPhases && npc.phases?.length > 0 && phase > 0) {
    const phaseData = npc.phases[phase - 1];
    if (phaseData) {
      attacks = phaseData.attacks || [];
      phaseLabel = phaseData.label ? `Phase ${phaseData.phaseNumber}: ${phaseData.label}` : `Phase ${phaseData.phaseNumber}`;
    }
  } else if (npc.hasPhases && npc.phases?.length > 0) {
    phaseLabel = 'Phase 1';
  }

  const typeIcon = (type) => {
    if (type === 'buff')  return '✨';
    if (type === 'spawn') return '🐾';
    return '⚔️';
  };
  const typeColor = (type) => {
    if (type === 'buff')  return '#a78bfa';
    if (type === 'spawn') return '#fbbf24';
    return '#fecaca';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem', boxSizing: 'border-box' }}>
      <div className="pv-modal-inner" onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(239,68,68,0.4)', borderRadius: '14px', padding: '1.5rem', width: 'calc(100% - 2rem)', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: '#fecaca', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            {npc.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {phaseLabel && (
              <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px', padding: '0.2rem 0.65rem', color: '#fca5a5', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.06em' }}>
                🔥 {phaseLabel}
              </span>
            )}
            <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>
              {npc.hp}/{npc.maxHp} HP · 🛡️{npc.armor}+ · Atk +{npc.attackBonus}
            </span>
          </div>
        </div>

        {/* Moves */}
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
          Moveset ({attacks.length})
        </div>
        {attacks.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No moves defined</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.1rem' }}>
          {attacks.map((atk, i) => (
            <div key={atk.id || i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(239,68,68,0.12)`, borderLeft: `3px solid ${typeColor(atk.attackType)}`, borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: atk.range || atk.description ? '0.3rem' : 0 }}>
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{typeIcon(atk.attackType)}</span>
                <span style={{ flex: 1, color: typeColor(atk.attackType), fontWeight: '800', fontSize: '0.85rem' }}>{atk.name}</span>
                {atk.numRolls > 0 && (
                  <span style={{ color: colors.amber, fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.numRolls}{atk.dieType}
                  </span>
                )}
                {atk.attackType === 'spawn' && atk.spawnNumRolls > 0 && (
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.spawnNumRolls}{atk.spawnDieType}
                  </span>
                )}
                {atk.buffEffect && (
                  <span style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.72rem', flexShrink: 0 }}>
                    +{atk.buffEffect.value} {atk.buffEffect.stat}
                  </span>
                )}
              </div>
              {atk.range && (
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', paddingLeft: '1.35rem', marginBottom: atk.description ? '0.15rem' : 0 }}>
                  📍 {atk.range}
                </div>
              )}
              {atk.description && (
                <div style={{ color: colors.textFaint, fontSize: '0.63rem', paddingLeft: '1.35rem', fontStyle: 'italic' }}>
                  {atk.description}
                </div>
              )}
              {atk.attackType === 'spawn' && atk.spawnPresets?.length > 0 && (
                <div style={{ color: '#fbbf24', fontSize: '0.62rem', paddingLeft: '1.35rem', marginTop: '0.15rem' }}>
                  Spawns from: {atk.spawnPresets.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.82rem' }}>
          Close
        </button>
      </div>
    </div>
  );
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const EmptyState = ({ icon, text: msg }) => (
  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: colors.textFaint }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
    <div style={{ fontSize: '0.85rem' }}>{msg}</div>
  </div>
);

const navBtn = (disabled) => ({
  width: '40px', height: '40px', borderRadius: '8px',
  background: disabled ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)',
  border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'}`,
  color: disabled ? colors.textFaint : colors.textPrimary,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: fonts.body, fontWeight: '900', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});

const centeredPage = {
  minHeight: '100svh',
  background: 'linear-gradient(145deg,#0a0505,#100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

// Inject turnPulse animation once
if (typeof document !== 'undefined' && !document.getElementById('turnPulseStyle')) {
  const style = document.createElement('style');
  style.id = 'turnPulseStyle';
  style.textContent = `
    @keyframes turnPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.85); }
    }
    @keyframes turnFlashAnim {
      0%   { background: rgba(201,169,97,0.35); }
      40%  { background: rgba(201,169,97,0.15); }
      100% { background: rgba(201,169,97,0); }
    }
  `;
  document.head.appendChild(style);
}

if (typeof document !== 'undefined' && !document.getElementById('pvMobileStyle')) {
  const style = document.createElement('style');
  style.id = 'pvMobileStyle';
  style.textContent = `
    /* ── Global: prevent horizontal scroll on all narrow screens ── */
    html, body {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }

    /* ── Player View narrow screens ─────────────────────────────── */
    @media screen and (max-width: 480px) {

      /* Outer container: never scroll sideways */
      .pv-root {
        overflow-x: hidden !important;
        width: 100vw !important;
        max-width: 100vw !important;
      }

      /* Tab bar: equal width tabs, no overflow */
      .pv-tabs button {
        padding: 0.65rem 0.25rem !important;
        font-size: 0.65rem !important;
        min-width: 0 !important;
      }

      /* Content area: never wider than viewport */
      .pv-content {
        width: 100vw !important;
        max-width: 100vw !important;
        padding-left: 0.75rem !important;
        padding-right: 0.75rem !important;
        overflow-x: hidden !important;
      }

      /* Turn indicator: tighter */
      .pv-turn-bar {
        padding: 0.4rem 0.75rem !important;
        min-height: 32px !important;
      }

      /* Content area: full width, comfortable padding */
      .pv-content {
        padding: 0.75rem !important;
        padding-bottom: 4rem !important;
      }

      /* Commander attack buttons: slightly smaller text */
      .pv-cmd-attacks button {
        padding: 0.55rem 0.25rem !important;
        font-size: 0.72rem !important;
        letter-spacing: 0 !important;
      }

      /* Squad unit attack buttons: full width row */
      .pv-unit-attacks {
        display: flex !important;
        gap: 0.4rem !important;
      }
      .pv-unit-attacks button {
        flex: 1 !important;
        padding: 0.45rem 0 !important;
        font-size: 0.72rem !important;
      }

      /* Inventory section: readable item names */
      .pv-inventory-item {
        padding: 0.6rem 0.75rem !important;
      }
      .pv-inventory-item .item-name {
        font-size: 0.82rem !important;
      }
      .pv-inventory-item .item-desc {
        font-size: 0.62rem !important;
      }

      /* Stats panel: tighter rows */
      .pv-stats-row {
        padding: 0.25rem 0 !important;
        font-size: 0.68rem !important;
      }

      /* NPC cards: comfortable */
      .pv-npc-card {
        padding: 0.85rem !important;
      }

      /* NPC filter pills: wrap nicely */
      .pv-npc-filters {
        gap: 0.3rem !important;
        flex-wrap: wrap !important;
      }
      .pv-npc-filters button {
        padding: 0.28rem 0.6rem !important;
        font-size: 0.65rem !important;
      }

      /* Modals: full width minus safe margin */
      .pv-modal-inner {
        width: calc(100vw - 2rem) !important;
        max-width: none !important;
        padding: 1.25rem !important;
        border-radius: 12px !important;
      }

      /* Player carousel nav */
      .pv-carousel-nav {
        gap: 0.35rem !important;
      }

      /* Victory tab: readable */
      .pv-victory-row {
        font-size: 0.78rem !important;
        padding: 0.5rem !important;
      }
    }

    /* ── Shared: always prevent horizontal scroll ────────────────── */
    .pv-root {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }

    /* Carousel nav: always constrained */
    .pv-carousel-nav {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* ── Mobile: hide arrows under 600px, use swipe instead ────── */
    @media screen and (max-width: 600px) {
      .pv-carousel-arrow {
        display: none !important;
      }
      .pv-carousel-nav {
        justify-content: center !important;
      }
      .pv-carousel-nav > div {
        flex: unset !important;
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default PlayerGameView;