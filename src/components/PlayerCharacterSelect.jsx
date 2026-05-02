import React from 'react';
import { fonts, colors, tierColors } from '../theme';
import { subscribeLobby } from '../services/lobbyService';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

/**
 * PlayerCharacterSelect
 * Shown when a player joins a loaded-game lobby.
 * They can claim a returning character or create a new one.
 * Phase: 'choose' | 'preview' | 'confirm' | 'new-character'
 */
const PlayerCharacterSelect = ({ lobbyCode, myUid, onClaimCharacter, onCreateNew }) => {
  const [saveSlots,   setSaveSlots]   = React.useState({});
  const [metadata,    setMetadata]    = React.useState(null);
  const [phase,       setPhase]       = React.useState('choose');
  const [selected,    setSelected]    = React.useState(null); // { playerId, slot }
  const [claiming,    setClaiming]    = React.useState(false);
  const unsubRef = React.useRef(null);

  // ── Subscribe to save slots in real time ───────────────────────────────────
  React.useEffect(() => {
    const ref = doc(db, 'campaigns', lobbyCode);
    unsubRef.current = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSaveSlots(data.saveSlots || {});
        setMetadata(data.saveMetadata || null);
      }
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [lobbyCode]);

  // ── Claim a character ──────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      const ref  = doc(db, 'campaigns', lobbyCode);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const gameAlreadyStarted = data.gameStarted || false;

      // Always claim the save slot and clear left flag
      const updates = {
        [`saveSlots.${selected.playerId}.claimedByUid`]: myUid,
        [`saveSlots.${selected.playerId}.isLeft`]:        false,
        [`saveSlots.${selected.playerId}.lockedInAt`]:    Date.now(),
      };

      // If game already running, patch the live player record and write a rejoin notice
      if (gameAlreadyStarted && data.gameState?.players) {
        const updatedPlayers = data.gameState.players.map(p =>
          String(p.id) === String(selected.playerId)
            ? { ...p, uid: myUid, isAbsent: false, isManual: false, isLeft: false }
            : p
        );
        updates['gameState.players'] = updatedPlayers;

        const noticeId = `rejoin_${myUid}_${Date.now()}`;
        updates[`playerRejoin.${noticeId}`] = {
          uid:        myUid,
          playerId:   String(selected.playerId),
          playerName: selected.slot.playerData.playerName,
          timestamp:  Date.now(),
        };
      }

      await updateDoc(ref, updates);
      onClaimCharacter({ ...selected.slot.playerData, uid: myUid, id: String(selected.playerId) });
    } catch (err) {
      console.error('Claim failed:', err);
      setClaiming(false);
    }
  };

  const slotList = Object.entries(saveSlots);
  const availableSlots = slotList.filter(([, s]) => !s.isAbsent && !s.claimedByUid);
  const myClaimedSlot  = slotList.find(([, s]) => s.claimedByUid === myUid);

  // Already claimed — just show confirmation
  if (myClaimedSlot) {
    const p = myClaimedSlot[1].playerData;
    return (
      <div className="bt-page" style={page}>
        <div className="bt-card" style={card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✅</div>
            <h2 style={heading}>CHARACTER CLAIMED</h2>
          </div>
          <CharacterCard player={p} />
          <div style={{ color: colors.textFaint, fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', padding: '0.75rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
            ⏳ Waiting for the Game Master to start...
          </div>
        </div>
      </div>
    );
  }

  // ── Choose screen ──────────────────────────────────────────────────────────
  if (phase === 'choose') {
    return (
      <div className="bt-page" style={page}>
        <div className="bt-card" style={{ ...card, maxWidth: '460px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>⚔️</div>
            <h2 style={heading}>JOIN SESSION</h2>
            {metadata && (
              <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>
                Continuing from Round {metadata.currentRound}
              </div>
            )}
          </div>

          {/* Returning characters */}
          {availableSlots.length > 0 && (
            <>
              <div style={sectionLabel}>Returning Characters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.1rem' }}>
                {slotList.map(([playerId, slot]) => {
                  const p        = slot.playerData;
                  const isAbsent = slot.isAbsent;
                  const isManual = slot.isManual || false;
                  const claimed  = !!slot.claimedByUid;
                  const isMine   = slot.claimedByUid === myUid;
                  // Absent slots ARE claimable — player joining mid-session takes over
                  // Manual means GM is actively playing them — not claimable
                  // Claimed by someone else — not claimable
                  const disabled = isManual || (claimed && !isMine);

                  return (
                    <button
                      key={playerId}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setSelected({ playerId, slot });
                        setPhase('preview');
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        padding: '0.75rem 0.9rem',
                        background: disabled ? 'rgba(0,0,0,0.2)' : isAbsent ? 'rgba(107,114,128,0.06)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${isManual ? 'rgba(245,158,11,0.25)' : isAbsent ? 'rgba(107,114,128,0.3)' : claimed ? 'rgba(34,197,94,0.25)' : `${p.playerColor || colors.blue}30`}`,
                        borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily: fonts.body, textAlign: 'left',
                        opacity: disabled ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: isAbsent ? '#6b7280' : isManual ? '#f59e0b' : p.playerColor || colors.blue, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: disabled ? colors.textMuted : isAbsent ? colors.textMuted : colors.textPrimary, fontWeight: '700', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.playerName}
                        </div>
                        <div style={{ color: colors.textFaint, fontSize: '0.63rem', marginTop: '0.08rem' }}>
                          {p.faction} · {p.commander}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {isManual
                          ? <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: '800' }}>🎮 GM</span>
                          : isAbsent
                            ? <span style={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: '800' }}>😴 Claim</span>
                            : claimed
                              ? <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: '800' }}>TAKEN</span>
                              : <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>▸ Select</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Create new */}
          <button onClick={onCreateNew} style={secondaryBtn}>
            ✨ Create New Character
            <div style={{ fontSize: '0.62rem', fontWeight: '600', opacity: 0.7, marginTop: '0.15rem', textTransform: 'none' }}>
              Join as a brand new player
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Preview screen ─────────────────────────────────────────────────────────
  if (phase === 'preview' && selected) {
    const p          = selected.slot.playerData;
    const cmdStats   = COMMANDER_STATS[p.commander] || {};
    const facStats   = FACTION_STATS[p.faction] || {};

    return (
      <div className="bt-page" style={page}>
        <div className="bt-card" style={{ ...card, maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>⚔️</div>
            <h2 style={heading}>YOUR CHARACTER</h2>
            <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginTop: '0.2rem' }}>Review before confirming</div>
          </div>

          <CharacterCard player={p} showFull />

          {/* Stats panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <StatBlock title={`${p.commander} Stats`} icon="👑" stats={[
              { label: 'Walk',         value: cmdStats.walk        || '—' },
              { label: 'Run',          value: cmdStats.run         || '—' },
              { label: 'Shoot',        value: cmdStats.shootRange  || '—' },
              { label: 'Sp. Range',    value: cmdStats.specialRange ? `${cmdStats.specialRange}"` : '—' },
              { label: 'Attacks',      value: cmdStats.attacksPerHit || '—' },
              { label: 'Roll to Heal', value: cmdStats.rollToHeal ? `${cmdStats.rollToHeal}+` : '—' },
            ]} />
            <StatBlock title={`${p.faction} Faction`} icon="🛡️" stats={[
              { label: 'Walk',         value: facStats.walk       || '—' },
              { label: 'Run',          value: facStats.run        || '—' },
              { label: 'Shoot',        value: facStats.shootRange || '—' },
              { label: 'Sp. Range',    value: facStats.specialRange ? `${facStats.specialRange}"` : '—' },
              { label: 'Attacks',      value: facStats.attacksPerHit || '—' },
              { label: 'Roll to Heal', value: facStats.rollToHeal ? `${facStats.rollToHeal}+` : '—' },
            ]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <button
              onClick={() => { setPhase('choose'); setSelected(null); }}
              style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '700', fontSize: '0.85rem' }}
            >← Back</button>
            <button
              onClick={handleClaim}
              disabled={claiming}
              style={{ padding: '0.85rem', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: claiming ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
            >
              {claiming ? '⏳ Claiming...' : '✓ Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ── Character Card ─────────────────────────────────────────────────────────
const CharacterCard = ({ player: p, showFull = false }) => {
  const hp    = p.commanderStats?.hp    ?? 0;
  const maxHp = p.commanderStats?.maxHp ?? 1;
  const pct   = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpColor = pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444';

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${p.playerColor || colors.blue}30`, borderRadius: '10px', padding: '0.9rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: showFull ? '0.75rem' : 0 }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.playerColor || colors.blue, boxShadow: `0 0 8px ${p.playerColor || colors.blue}`, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: p.playerColor || colors.gold, fontWeight: '800', fontSize: '0.95rem' }}>{p.playerName}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.05rem' }}>{p.faction} · {p.commander}</div>
        </div>
        <div style={{ color: colors.amber, fontWeight: '700', fontSize: '0.82rem' }}>{hp}/{maxHp} HP</div>
      </div>

      {showFull && (
        <>
          {/* HP bar */}
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.6rem' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: hpColor, borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>

          {/* Inventory */}
          {(p.inventory || []).length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Items</div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {(p.inventory || []).map((item, i) => {
                  const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                  return (
                    <span key={i} style={{ padding: '0.2rem 0.5rem', background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: '5px', color: tc.text, fontSize: '0.65rem', fontWeight: '700' }}>
                      {item.isQuestItem ? '🗝️' : '📦'} {item.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Squad */}
          {(p.subUnits || []).length > 0 && (
            <div>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                Squad — {(p.subUnits || []).filter(u => u.hp > 0).length}/{(p.subUnits || []).length} alive
              </div>
              {(p.subUnits || []).map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0', opacity: u.hp <= 0 ? 0.35 : 1 }}>
                  <span style={{ fontSize: '0.7rem' }}>{i === 0 ? '⭐' : '🛡️'}</span>
                  <span style={{ color: colors.purpleLight, fontSize: '0.75rem', fontWeight: '600', flex: 1 }}>{u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`)}</span>
                  {u.unitSubType && (
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: u.unitSubType === 'dinosaur' ? '#6ee7b7' : '#fbbf24' }}>
                      {u.unitSubType === 'dinosaur' ? '🦕' : '🪨'}
                    </span>
                  )}
                  <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{u.hp}/{u.maxHp}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Stat Block ─────────────────────────────────────────────────────────────
const StatBlock = ({ title, icon, stats }) => (
  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem' }}>
    <div style={{ color: colors.gold, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
      {icon} {title}
    </div>
    {stats.map(({ label, value }) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{label}</span>
        <span style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.72rem' }}>{value}</span>
      </div>
    ))}
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────
const page = {
  height: 'auto', minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'flex-start',
  fontFamily: fonts.body, padding: '1.5rem',
  paddingTop: '2rem', paddingBottom: '3rem', boxSizing: 'border-box',
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

const sectionLabel = {
  color: colors.textFaint,
  fontSize: '0.62rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '0.6rem',
};

const secondaryBtn = {
  width: '100%',
  padding: '0.95rem',
  background: 'linear-gradient(135deg, #1e3a5f, #1a3352)',
  border: '2px solid #3b82f6',
  color: '#bfdbfe',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontWeight: '800',
  fontSize: '0.9rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  boxShadow: '0 6px 20px rgba(59,130,246,0.15)',
};

export default PlayerCharacterSelect;