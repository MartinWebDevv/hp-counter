import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, pill, inputStyle } from '../theme';

const themedInput = { ...inputStyle, width: '100%', fontSize: '0.8rem' };

const CATS = [
  { id: 'npcDamage',     label: 'Most NPC Damage',     icon: '🐉', pts: 1 },
  { id: 'pvpDamage',     label: 'Most Player Damage',  icon: '⚔️',  pts: 1 },
  { id: 'damageTaken',   label: 'Most Damage Taken',   icon: '🛡️',  pts: 1 },
  { id: 'itemsObtained', label: 'Most Items Obtained', icon: '📦', pts: 1 },
  { id: 'leastDeaths',   label: 'Fewest Revives Used', icon: '💪', pts: 1 },
  { id: 'finalBossKill', label: 'Final Boss Kill',     icon: '👑', pts: 2 },
];

const VictoryPanel = ({ players, vpStats, onAwardPoints, onDeleteSession, onUpdateVpStats, onClearTrackers }) => {
  const [manualAward, setManualAward] = useState({ playerId: '', points: 1, reason: '', categoryId: 'finalBossKill' });
  const [showManual, setShowManual] = useState(false);
  const [showDeleteSession, setShowDeleteSession] = useState(false);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState(null); // sessionName
  const [clearConfirm, setClearConfirm] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [selectedSession, setSelectedSession] = useState({});
  const [editingVP, setEditingVP] = useState({}); // { [playerId]: draftValue }
  const [addBubbleModal, setAddBubbleModal] = useState(null); // playerId

  if (!players || players.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: colors.textFaint }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <div style={{ fontWeight: '700', color: colors.textMuted }}>No players yet</div>
      </div>
    );
  }

  const getTotalVP = (player) => {
    const stats = vpStats[player.id] || {};
    return (stats.sessionAwards || []).reduce((s, a) => s + (a.pts || 0), 0)
         + (stats.manualAwards  || []).reduce((s, a) => s + (a.points || 0), 0);
  };

  const getLiveStats = (player) => {
    const s = vpStats[player.id] || {};
    return {
      npcDamage:    s.npcDamage    || 0,
      pvpDamage:    s.pvpDamage    || 0,
      damageTaken:  s.damageTaken  || 0,
      itemsObtained: s.itemsObtained || 0,
      revivesUsed:  s.revivesUsed  || 0,
      finalBossKill: s.finalBossKill || 0,
    };
  };

  const ranked = [...players].sort((a, b) => getTotalVP(b) - getTotalVP(a));

  // All unique session names across all players
  const allSessionNames = [...new Set(
    Object.values(vpStats).flatMap(s => (s.sessionAwards || []).map(a => a.sessionName).filter(Boolean))
  )];
  const rankBadge = ['🥇', '🥈', '🥉'];
  const rankColor = [colors.amber, colors.textSecondary, '#b45309'];

  const handleAward = () => {
    if (!manualAward.playerId || !manualAward.reason.trim()) return;
    onAwardPoints(parseInt(manualAward.playerId) || manualAward.playerId, manualAward.points, manualAward.reason, manualAward.categoryId);
    setManualAward(prev => ({ ...prev, points: 1, reason: '' }));
    setShowManual(false);
  };

  const formatAwardValue = (a) => {
    if (!a.value && a.value !== 0) return '';
    if (a.isManual) return '';
    if (a.categoryId === 'itemsObtained')    return `${a.value} items`;
    if (a.categoryId === 'leastDeaths')      return `${a.value} revives used`;
    if (a.categoryId === 'immortal')         return 'zero deaths';
    if (a.categoryId === 'leastDamageTaken') return `${a.value}hp taken`;
    if (a.categoryId === 'finalBossKill')    return 'killing blow';
    if (a.categoryId === 'firstBlood')       return 'first hit';
    if (a.categoryId === 'warmonger')        return `${a.value} attacks`;
    if (['npcDamage','pvpDamage','damageTaken'].includes(a.categoryId)) return `${a.value}hp`;
    return a.value ? `${a.value}` : '';
  };

  const groupBySessions = (awards) => {
    const map = {};
    (awards || []).forEach(a => {
      const key = a.sessionName || 'Unknown Session';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map);
  };

  return (
    <div style={{ width: '100%' }}>

      {/* Leaderboard */}
      <div style={{ marginBottom: '1rem' }}>
        {ranked.map((player, ri) => {
          const vp = getTotalVP(player);
          const live = getLiveStats(player);
          const stats = vpStats[player.id] || {};
          const sessionAwards = stats.sessionAwards || [];
          const manualAwards  = stats.manualAwards  || [];
          const isExpanded = expanded[player.id];
          const color = rankColor[ri] || colors.textMuted;
          const sessions = groupBySessions(sessionAwards);

          return (
            <div key={player.id} style={{
              background: ri === 0 ? 'rgba(251,191,36,0.05)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${ri === 0 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '10px', padding: '0.8rem 0.9rem', marginBottom: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{rankBadge[ri] || `#${ri+1}`}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: player.playerColor || colors.gold, fontWeight: '900', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.playerName}</div>
                  <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '600' }}>{sessionAwards.length} award{sessionAwards.length !== 1 ? 's' : ''} across {sessions.length} session{sessions.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {editingVP[player.id] !== undefined ? (
                    <input
                      type="number"
                      autoFocus
                      value={editingVP[player.id]}
                      onChange={e => setEditingVP(prev => ({ ...prev, [player.id]: e.target.value }))}
                      onBlur={() => {
                        const newTotal = parseInt(editingVP[player.id]);
                        if (!isNaN(newTotal) && onUpdateVpStats) {
                          const diff = newTotal - vp;
                          if (diff !== 0) {
                            onUpdateVpStats(prev => {
                              const next = { ...prev, [player.id]: { ...(prev[player.id] || {}), manualAwards: [...(prev[player.id]?.manualAwards || []), { points: diff, reason: 'Manual VP adjustment', awardedAt: new Date().toISOString() }] } };
                              try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
                              return next;
                            });
                          }
                        }
                        setEditingVP(prev => { const n = { ...prev }; delete n[player.id]; return n; });
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingVP(prev => { const n = { ...prev }; delete n[player.id]; return n; }); }}
                      style={{ width: '56px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}`, borderRadius: '6px', color, fontWeight: '900', fontSize: '1.4rem', textAlign: 'center', padding: '0.1rem 0.2rem', fontFamily: 'inherit' }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingVP(prev => ({ ...prev, [player.id]: String(vp) }))}
                      title="Click to edit VP total"
                      style={{ color, fontWeight: '900', fontSize: '1.5rem', lineHeight: 1, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}
                    >{vp}</div>
                  )}
                  <div style={{ color: colors.textFaint, fontSize: '0.55rem', fontWeight: '700', letterSpacing: '0.08em' }}>VP TOTAL</div>
                </div>
                <button onClick={() => setExpanded(prev => ({ ...prev, [player.id]: !prev[player.id] }))} style={{
                  ...btn.icon(colors.textMuted), width: '28px', height: '28px', fontSize: '0.65rem',
                }}>{isExpanded ? '▲' : '▼'}</button>
              </div>

              {/* Award icon strip — click to remove, + to add */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.22rem', marginTop: '0.5rem', alignItems: 'center' }}>
                {sessionAwards.map((a, i) => (
                  <span key={i} title={`${a.label} — ${a.sessionName} (click to remove)`}
                    onClick={() => {
                      if (!onUpdateVpStats) return;
                      onUpdateVpStats(prev => {
                        const playerStats = prev[player.id] || {};
                        const updated = { ...playerStats, sessionAwards: (playerStats.sessionAwards || []).filter((_, idx) => idx !== i) };
                        const next = { ...prev, [player.id]: updated };
                        try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
                        return next;
                      });
                    }}
                    style={{ ...pill(colors.gold, colors.goldSubtle, colors.goldBorder), cursor: 'pointer' }}>
                    {a.icon} +{a.pts} ✕
                  </span>
                ))}
                {manualAwards.map((a, i) => (
                  <span key={`m${i}`} title={`${a.reason} (click to remove)`}
                    onClick={() => {
                      if (!onUpdateVpStats) return;
                      onUpdateVpStats(prev => {
                        const playerStats = prev[player.id] || {};
                        const updated = { ...playerStats, manualAwards: (playerStats.manualAwards || []).filter((_, idx) => idx !== i) };
                        const next = { ...prev, [player.id]: updated };
                        try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
                        return next;
                      });
                    }}
                    style={{ ...pill(colors.purpleLight, colors.purpleSubtle, colors.purpleBorder), cursor: 'pointer' }}>
                    🏅 +{a.points} ✕
                  </span>
                ))}
                {onUpdateVpStats && (
                  <button
                    onClick={() => setAddBubbleModal(player.id)}
                    style={{ ...pill(colors.textFaint, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.1)'), cursor: 'pointer', fontFamily: 'inherit', border: '1px dashed rgba(255,255,255,0.2)' }}
                    title="Add VP category bubble"
                  >＋</button>
                )}
              </div>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div style={{ marginTop: '0.65rem', borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: '0.65rem' }}>
                  <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Live Stats (current session)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.65rem' }}>
                    {[
                      ['🐉 NPC Damage', live.npcDamage],
                      ['⚔️ PvP Damage',  live.pvpDamage],
                      ['🛡️ Dmg Taken',   live.damageTaken],
                      ['📦 Items',       live.itemsObtained],
                      ['💀 Revives',     live.revivesUsed],
                      ['👑 Boss Kill',   live.finalBossKill > 0 ? 'YES' : '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.22rem 0.45rem', background: 'rgba(0,0,0,0.28)', borderRadius: '4px' }}>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{label}</span>
                        <span style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '900' }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {sessions.length > 0 && (() => {
                    const activeSess = selectedSession[player.id] || sessions[0]?.[0];
                    const activeAwards = sessions.find(([n]) => n === activeSess)?.[1] || [];
                    return (
                      <>
                        <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Award History</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                          {sessions.map(([sessionName, sAwards]) => {
                            const isActive = sessionName === activeSess;
                            return (
                              <button key={sessionName} onClick={() => setSelectedSession(prev => ({ ...prev, [player.id]: sessionName }))} style={{
                                padding: '0.2rem 0.55rem', borderRadius: '20px',
                                border: `1px solid ${isActive ? colors.goldBorder : 'rgba(255,255,255,0.06)'}`,
                                background: isActive ? colors.goldSubtle : 'transparent',
                                color: isActive ? colors.gold : colors.textFaint,
                                fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer',
                                fontFamily: fonts.body, whiteSpace: 'nowrap',
                              }}>📅 {sessionName} <span style={{ opacity: 0.6 }}>({sAwards.length})</span></button>
                            );
                          })}
                        </div>
                        {activeAwards.map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.55rem', background: colors.goldSubtle, border: `1px solid ${colors.goldBorder}`, borderRadius: '5px', marginBottom: '0.18rem', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ color: colors.textPrimary, fontSize: '0.72rem', fontWeight: '700' }}>{a.icon} {a.label}</span>
                              {formatAwardValue(a) && <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{formatAwardValue(a)}</span>}
                            </div>
                            <span style={{ color: colors.gold, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.pts} VP</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {manualAwards.length > 0 && (
                    <>
                      <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem', marginTop: '0.5rem' }}>Pending DM Awards</div>
                      {manualAwards.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.22rem 0.55rem', background: colors.purpleSubtle, border: `1px solid ${colors.purpleBorder}`, borderRadius: '5px', marginBottom: '0.18rem' }}>
                          <span style={{ color: colors.textSecondary, fontSize: '0.7rem' }}>🏅 {a.reason}</span>
                          <span style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.points} VP</span>
                        </div>
                      ))}
                    </>
                  )}

                  {sessionAwards.length === 0 && manualAwards.length === 0 && (
                    <div style={{ color: colors.textFaint, fontSize: '0.72rem', textAlign: 'center', padding: '0.5rem' }}>No awards yet this campaign.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category legend */}
      <div style={{ background: 'rgba(0,0,0,0.28)', border: borders.default, borderRadius: '8px', padding: '0.7rem', marginBottom: '0.85rem' }}>
        <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: fonts.display }}>Points Per Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
          {CATS.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.22rem 0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.75rem' }}>{cat.icon}</span>
              <span style={{ flex: 1, color: colors.textFaint, fontSize: '0.6rem', fontWeight: '700' }}>{cat.label}</span>
              <span style={{ color: colors.gold, fontSize: '0.68rem', fontWeight: '900', flexShrink: 0 }}>{cat.pts} VP</span>
            </div>
          ))}
        </div>
      </div>

      {/* DM Manual Award */}
      <button onClick={() => setShowManual(!showManual)} style={{
        width: '100%', padding: '0.55rem',
        background: showManual ? colors.purpleSubtle : 'rgba(0,0,0,0.28)',
        border: `1px solid ${showManual ? colors.purpleBorder : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '8px', color: showManual ? colors.purpleLight : colors.textMuted,
        fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer',
        fontFamily: fonts.body, letterSpacing: '0.05em',
        transition: 'all 0.15s',
      }}>🏅 DM AWARD POINTS {showManual ? '▲' : '▼'}</button>

      {showManual && (
        <div style={{ marginTop: '0.4rem', background: 'rgba(0,0,0,0.28)', border: `1px solid ${colors.purpleBorder}`, borderRadius: '8px', padding: '0.8rem' }}>
          <div style={{ marginBottom: '0.45rem' }}>
            <label style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.22rem' }}>Player</label>
            <select style={{ ...themedInput, cursor: 'pointer' }} value={manualAward.playerId} onChange={e => setManualAward(p => ({ ...p, playerId: e.target.value }))}>
              <option value="">— Select Player —</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
            <div>
              <label style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.22rem' }}>Category</label>
              <select style={{ ...themedInput, cursor: 'pointer' }} value={manualAward.categoryId} onChange={e => setManualAward(p => ({ ...p, categoryId: e.target.value }))}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.22rem' }}>Points</label>
              <input type="number" min="1" max="99" style={themedInput} value={manualAward.points} onChange={e => setManualAward(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div style={{ marginBottom: '0.55rem' }}>
            <label style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.22rem' }}>Reason</label>
            <input style={themedInput} value={manualAward.reason} onChange={e => setManualAward(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Dealt final blow to The Sleeping Giant" />
          </div>
          <button onClick={handleAward} disabled={!manualAward.playerId || !manualAward.reason.trim()} style={{
            width: '100%', padding: '0.55rem',
            background: manualAward.playerId && manualAward.reason.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${manualAward.playerId && manualAward.reason.trim() ? colors.purple : 'rgba(55,65,81,0.4)'}`,
            borderRadius: '6px',
            color: manualAward.playerId && manualAward.reason.trim() ? '#ede9fe' : colors.textDisabled,
            fontWeight: '900', fontSize: '0.8rem',
            cursor: manualAward.playerId && manualAward.reason.trim() ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body,
          }}>🏅 AWARD POINTS</button>
        </div>
      )}

      {/* ── Clear Current Session Trackers ── */}
      {onClearTrackers && (
        <div style={{ marginTop: '0.5rem' }}>
          {!clearConfirm ? (
            <button onClick={() => setClearConfirm(true)} style={{
              width: '100%', padding: '0.55rem',
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '8px', color: colors.amber,
              fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer',
              fontFamily: fonts.body, letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}>🧹 CLEAR SESSION TRACKERS</button>
          ) : (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ flex: 1, color: colors.textMuted, fontSize: '0.72rem', fontWeight: '700' }}>
                Reset all live VP trackers (npc damage, pvp, etc.) to 0? Historical awards are kept.
              </span>
              <button onClick={() => { onClearTrackers(); setClearConfirm(false); }} style={{ padding: '0.3rem 0.65rem', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px', color: colors.amber, fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Clear</button>
              <button onClick={() => setClearConfirm(false)} style={{ padding: '0.3rem 0.55rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: colors.textMuted, fontFamily: fonts.body, fontWeight: '700', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Session VP ── */}
      <button onClick={() => setShowDeleteSession(!showDeleteSession)} style={{
        width: '100%', padding: '0.55rem', marginTop: '0.5rem',
        background: showDeleteSession ? colors.redSubtle : 'rgba(0,0,0,0.28)',
        border: `1px solid ${showDeleteSession ? colors.redBorder : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '8px', color: showDeleteSession ? '#fca5a5' : colors.textMuted,
        fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer',
        fontFamily: fonts.body, letterSpacing: '0.05em',
        transition: 'all 0.15s',
      }}>🗑️ DELETE SESSION VP {showDeleteSession ? '▲' : '▼'}</button>

      {showDeleteSession && (
        <div style={{ marginTop: '0.4rem', background: 'rgba(0,0,0,0.28)', border: `1px solid ${colors.redBorder}`, borderRadius: '8px', padding: '0.8rem' }}>
          {allSessionNames.length === 0 ? (
            <div style={{ color: colors.textFaint, fontSize: '0.78rem', textAlign: 'center', padding: '0.5rem' }}>No sessions recorded yet.</div>
          ) : (
            <>
              <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Select a session to remove all its VP awards from every player:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {allSessionNames.map(name => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', background: 'rgba(0,0,0,0.25)', border: `1px solid ${colors.redBorder}`, borderRadius: '6px' }}>
                    <span style={{ flex: 1, color: colors.textPrimary, fontSize: '0.8rem', fontWeight: '700' }}>📅 {name}</span>
                    {deleteSessionConfirm === name ? (
                      <>
                        <span style={{ color: '#fca5a5', fontSize: '0.72rem', fontWeight: '700' }}>Are you sure?</span>
                        <button onClick={() => { onDeleteSession(name); setDeleteSessionConfirm(null); }} style={{ padding: '0.25rem 0.6rem', background: colors.redSubtle, border: `1px solid ${colors.red}`, borderRadius: '5px', color: '#fca5a5', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer' }}>✓ Yes, delete</button>
                        <button onClick={() => setDeleteSessionConfirm(null)} style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '5px', color: colors.textMuted, fontFamily: fonts.body, fontWeight: '700', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteSessionConfirm(name)} style={{ padding: '0.25rem 0.6rem', background: colors.redSubtle, border: `1px solid ${colors.redBorder}`, borderRadius: '5px', color: '#fca5a5', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer' }}>🗑️ Delete</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add Bubble Modal ── */}
      {addBubbleModal && (
        <div onClick={() => setAddBubbleModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `2px solid ${colors.goldBorder}`, borderRadius: '14px', padding: '1.5rem', width: '300px', maxWidth: '95%', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
            <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.95rem', textAlign: 'center', marginBottom: '1rem' }}>Add VP Bubble</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {CATS.map(cat => (
                <button key={cat.id} onClick={() => {
                  if (!onUpdateVpStats) return;
                  const pid = addBubbleModal;
                  onUpdateVpStats(prev => {
                    const playerStats = prev[pid] || {};
                    const newAward = { label: cat.label, icon: cat.icon, pts: cat.pts, sessionName: 'Manual', categoryId: cat.id, awardedAt: new Date().toISOString() };
                    const next = { ...prev, [pid]: { ...playerStats, sessionAwards: [...(playerStats.sessionAwards || []), newAward] } };
                    try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
                    return next;
                  });
                  setAddBubbleModal(null);
                }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.goldBorder}`, borderRadius: '8px', color: colors.gold, cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '0.82rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>+{cat.pts} VP</span>
                </button>
              ))}
            </div>
            <button onClick={() => setAddBubbleModal(null)} style={{ width: '100%', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VictoryPanel;