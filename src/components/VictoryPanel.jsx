import React, { useState } from 'react';

const gold = '#c9a961';

const inputStyle = {
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,169,97,0.3)',
  borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#e5d5b5',
  fontFamily: 'inherit', fontSize: '0.8rem', width: '100%', outline: 'none',
};

const CATS = [
  { id: 'npcDamage',    label: 'Most NPC Damage',      icon: '🐉', pts: 1 },
  { id: 'pvpDamage',    label: 'Most Player Damage',   icon: '⚔️',  pts: 1 },
  { id: 'damageTaken',  label: 'Most Damage Taken',    icon: '🛡️',  pts: 1 },
  { id: 'itemsObtained',label: 'Most Items Obtained',  icon: '📦', pts: 1 },
  { id: 'leastDeaths',  label: 'Fewest Revives Used',  icon: '💪', pts: 1 },
  { id: 'finalBossKill',label: 'Final Boss Kill',      icon: '👑', pts: 2 },
];

const VictoryPanel = ({ players, vpStats, onAwardPoints }) => {
  const [manualAward, setManualAward] = useState({ playerId: '', points: 1, reason: '', categoryId: 'finalBossKill' });
  const [showManual, setShowManual] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [selectedSession, setSelectedSession] = useState({}); // { [playerId]: sessionName }

  if (!players || players.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#4b5563' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <div style={{ fontWeight: '700', color: '#6b7280' }}>No players yet</div>
      </div>
    );
  }

  // Total VP = all session awards + pending manual awards
  const getTotalVP = (player) => {
    const stats = vpStats[player.id] || {};
    const sessionTotal = (stats.sessionAwards || []).reduce((s, a) => s + (a.pts || 0), 0);
    const manualTotal = (stats.manualAwards || []).reduce((s, a) => s + (a.points || 0), 0);
    return sessionTotal + manualTotal;
  };

  // Live session stats (not yet awarded)
  const getLiveStats = (player) => {
    const s = vpStats[player.id] || {};
    return {
      npcDamage: s.npcDamage || 0,
      pvpDamage: s.pvpDamage || 0,
      damageTaken: s.damageTaken || 0,
      itemsObtained: vpStats[player.id]?.itemsObtained || 0,
      revivesUsed: s.revivesUsed || 0,
      finalBossKill: s.finalBossKill || 0,
    };
  };

  const ranked = [...players].sort((a, b) => getTotalVP(b) - getTotalVP(a));
  const rankBadge = ['🥇', '🥈', '🥉'];
  const rankColor = ['#fbbf24', '#9ca3af', '#b45309'];

  const handleAward = () => {
    if (!manualAward.playerId || !manualAward.reason.trim()) return;
    onAwardPoints(parseInt(manualAward.playerId) || manualAward.playerId, manualAward.points, manualAward.reason, manualAward.categoryId);
    setManualAward(prev => ({ ...prev, points: 1, reason: '' }));
    setShowManual(false);
  };

  // Group session awards by session name for a player
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
    if (a.categoryId === 'npcDamage')        return `${a.value}hp dealt`;
    if (a.categoryId === 'pvpDamage')        return `${a.value}hp dealt`;
    if (a.categoryId === 'damageTaken')      return `${a.value}hp taken`;
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

      {/* ── Leaderboard ── */}
      <div style={{ marginBottom: '1rem' }}>
        {ranked.map((player, ri) => {
          const vp = getTotalVP(player);
          const live = getLiveStats(player);
          const stats = vpStats[player.id] || {};
          const sessionAwards = stats.sessionAwards || [];
          const manualAwards = stats.manualAwards || [];
          const isExpanded = expanded[player.id];
          const color = rankColor[ri] || '#6b7280';
          const sessions = groupBySessions(sessionAwards);

          return (
            <div key={player.id} style={{
              background: ri === 0 ? 'rgba(251,191,36,0.06)' : 'rgba(0,0,0,0.35)',
              border: `2px solid ${ri === 0 ? 'rgba(251,191,36,0.35)' : 'rgba(90,74,58,0.3)'}`,
              borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.6rem',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{rankBadge[ri] || `#${ri+1}`}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: player.playerColor || gold, fontWeight: '900', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.playerName}</div>
                  <div style={{ color: '#4b5563', fontSize: '0.68rem', fontWeight: '600' }}>{sessionAwards.length} award{sessionAwards.length !== 1 ? 's' : ''} across {sessions.length} session{sessions.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color, fontWeight: '900', fontSize: '1.6rem', lineHeight: 1 }}>{vp}</div>
                  <div style={{ color: '#4b5563', fontSize: '0.58rem', fontWeight: '700', letterSpacing: '0.08em' }}>VP TOTAL</div>
                </div>
                <button onClick={() => setExpanded(prev => ({ ...prev, [player.id]: !prev[player.id] }))} style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.4)', borderRadius: '6px',
                  padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#6b7280', fontSize: '0.7rem',
                  fontFamily: 'inherit', fontWeight: '700', flexShrink: 0,
                }}>{isExpanded ? '▲' : '▼'}</button>
              </div>

              {/* Award icon strip */}
              {sessionAwards.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.55rem' }}>
                  {sessionAwards.map((a, i) => (
                    <span key={i} title={`${a.label} — ${a.sessionName}`} style={{
                      padding: '0.1rem 0.4rem', fontSize: '0.62rem', fontWeight: '800',
                      background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)',
                      borderRadius: '4px', color: gold,
                    }}>{a.icon} +{a.pts}</span>
                  ))}
                  {manualAwards.map((a, i) => (
                    <span key={`m${i}`} title={a.reason} style={{
                      padding: '0.1rem 0.4rem', fontSize: '0.62rem', fontWeight: '800',
                      background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '4px', color: '#c4b5fd',
                    }}>🏅 +{a.points}</span>
                  ))}
                </div>
              )}

              {/* Expanded breakdown */}
              {isExpanded && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(90,74,58,0.3)', paddingTop: '0.75rem' }}>

                  {/* Live this-session stats */}
                  <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Live Stats (current session)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.75rem' }}>
                    {[
                      ['🐉 NPC Damage', live.npcDamage],
                      ['⚔️ PvP Damage', live.pvpDamage],
                      ['🛡️ Damage Taken', live.damageTaken],
                      ['📦 Items Obtained', live.itemsObtained],
                      ['💀 Revives Used', live.revivesUsed],
                      ['👑 Boss Kill', live.finalBossKill > 0 ? 'YES' : '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <span style={{ color: '#4b5563', fontSize: '0.68rem', fontWeight: '700' }}>{label}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: '900' }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Session award history */}
                  {sessions.length > 0 && (() => {
                    const activeSess = selectedSession[player.id] || sessions[0]?.[0];
                    const activeAwards = sessions.find(([n]) => n === activeSess)?.[1] || [];
                    return (
                      <>
                        <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Award History</div>
                        {/* Session selector tabs */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                          {sessions.map(([sessionName, sAwards]) => {
                            const isActive = sessionName === activeSess;
                            return (
                              <button key={sessionName} onClick={() => setSelectedSession(prev => ({ ...prev, [player.id]: sessionName }))}
                                style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: `1px solid ${isActive ? gold : 'rgba(201,169,97,0.25)'}`, background: isActive ? 'rgba(201,169,97,0.15)' : 'transparent', color: isActive ? gold : '#6b7280', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                📅 {sessionName}
                                <span style={{ marginLeft: '0.3rem', opacity: 0.6 }}>({sAwards.length})</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Awards for selected session */}
                        {activeAwards.map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.6rem', background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.15)', borderRadius: '5px', marginBottom: '0.2rem', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ color: '#d1d5db', fontSize: '0.73rem', fontWeight: '700' }}>{a.icon} {a.label}</span>
                              {formatAwardValue(a) && (
                                <span style={{ color: '#6b7280', fontSize: '0.63rem', fontWeight: '600' }}>{formatAwardValue(a)}</span>
                              )}
                            </div>
                            <span style={{ color: gold, fontSize: '0.75rem', fontWeight: '900', flexShrink: 0 }}>+{a.pts} VP</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {/* Pending manual awards */}
                  {manualAwards.length > 0 && (
                    <>
                      <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Pending DM Awards</div>
                      {manualAwards.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.6rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '5px', marginBottom: '0.2rem' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>🏅 {a.reason}</span>
                          <span style={{ color: '#c4b5fd', fontSize: '0.75rem', fontWeight: '900', flexShrink: 0 }}>+{a.points} VP</span>
                        </div>
                      ))}
                    </>
                  )}

                  {sessionAwards.length === 0 && manualAwards.length === 0 && (
                    <div style={{ color: '#374151', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem' }}>No awards yet this campaign.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Category legend ── */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ color: gold, fontWeight: '800', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Points Per Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
          {CATS.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.78rem' }}>{cat.icon}</span>
              <span style={{ flex: 1, color: '#6b7280', fontSize: '0.62rem', fontWeight: '700' }}>{cat.label}</span>
              <span style={{ color: gold, fontSize: '0.7rem', fontWeight: '900', flexShrink: 0 }}>{cat.pts} VP</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DM Manual Award ── */}
      <button onClick={() => setShowManual(!showManual)} style={{
        width: '100%', padding: '0.6rem',
        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.4)',
        borderRadius: '8px', color: '#c4b5fd', fontWeight: '800', fontSize: '0.78rem',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em',
      }}>🏅 DM AWARD POINTS {showManual ? '▲' : '▼'}</button>

      {showManual && (
        <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '0.85rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Player</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={manualAward.playerId} onChange={e => setManualAward(p => ({ ...p, playerId: e.target.value }))}>
              <option value="">— Select Player —</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Category</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={manualAward.categoryId} onChange={e => setManualAward(p => ({ ...p, categoryId: e.target.value }))}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Points</label>
              <input type="number" min="1" max="99" style={inputStyle} value={manualAward.points} onChange={e => setManualAward(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div style={{ marginBottom: '0.6rem' }}>
            <label style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Reason</label>
            <input style={inputStyle} value={manualAward.reason} onChange={e => setManualAward(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Dealt final blow to The Sleeping Giant" />
          </div>
          <button onClick={handleAward} disabled={!manualAward.playerId || !manualAward.reason.trim()} style={{
            width: '100%', padding: '0.6rem',
            background: manualAward.playerId && manualAward.reason.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${manualAward.playerId && manualAward.reason.trim() ? '#8b5cf6' : 'rgba(55,65,81,0.4)'}`,
            borderRadius: '6px', color: manualAward.playerId && manualAward.reason.trim() ? '#ede9fe' : '#374151',
            fontWeight: '900', fontSize: '0.82rem', cursor: manualAward.playerId && manualAward.reason.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}>🏅 AWARD POINTS</button>
        </div>
      )}
    </div>
  );
};

export default VictoryPanel;