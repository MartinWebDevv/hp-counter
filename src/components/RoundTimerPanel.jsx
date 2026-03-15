import React, { useState } from 'react';

const gold = '#c9a961';

const labelStyle = {
  color: '#8b7355', fontSize: '0.68rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.3rem',
};

const inputStyle = {
  background: '#0a0503', color: gold,
  border: '1px solid #5a4a3a', borderRadius: '6px',
  padding: '0.45rem 0.65rem', fontFamily: 'inherit',
  fontSize: '0.85rem', width: '100%', outline: 'none',
  boxSizing: 'border-box',
};

/**
 * RoundTimerPanel
 * DM interface for creating and managing round timers.
 *
 * Props:
 *   timers            — all current timers from useRoundTimers
 *   players           — all players (for target selection)
 *   npcs              — all NPCs (for target selection)
 *   onCreateTimer     — (name, duration, targets) => void
 *   onDeleteTimer     — (timerId) => void
 *   onAdjustTimer     — (timerId, delta) => void
 *   onUpdateTimer     — (timerId, changes) => void
 */
const RoundTimerPanel = ({
  timers = [],
  players = [],
  npcs = [],
  onCreateTimer,
  onDeleteTimer,
  onAdjustTimer,
  onUpdateTimer,
}) => {
  const [name,     setName]     = useState('');
  const [duration, setDuration] = useState('');
  const [targets,  setTargets]  = useState([]); // [{ type, playerId?, unitType?, npcId? }]

  const handleCreate = () => {
    if (!name.trim() || !duration) return;
    onCreateTimer(name, duration, targets);
    setName('');
    setDuration('');
    setTargets([]);
  };

  const togglePlayerUnit = (playerId, unitType) => {
    const key = `player-${playerId}-${unitType}`;
    setTargets(prev => {
      const exists = prev.find(t => t.type === 'player' && t.playerId === playerId && t.unitType === unitType);
      if (exists) return prev.filter(t => !(t.type === 'player' && t.playerId === playerId && t.unitType === unitType));
      return [...prev, { type: 'player', playerId, unitType }];
    });
  };

  const toggleNPC = (npcId) => {
    setTargets(prev => {
      const exists = prev.find(t => t.type === 'npc' && t.npcId === npcId);
      if (exists) return prev.filter(t => !(t.type === 'npc' && t.npcId === npcId));
      return [...prev, { type: 'npc', npcId }];
    });
  };

  const isPlayerUnitSelected = (playerId, unitType) =>
    targets.some(t => t.type === 'player' && t.playerId === playerId && t.unitType === unitType);

  const isNPCSelected = (npcId) =>
    targets.some(t => t.type === 'npc' && t.npcId === npcId);

  const getTargetLabels = (timer) => {
    const labels = [];
    timer.targets.forEach(tgt => {
      if (tgt.type === 'player') {
        const p = players.find(pl => pl.id === tgt.playerId);
        if (!p) return;
        if (tgt.unitType === 'commander') labels.push(`${p.playerName}'s ${p.commanderStats?.customName || p.commander || 'Commander'}`);
        else if (tgt.unitType === 'special') labels.push(`${p.playerName}'s ${p.subUnits?.[0]?.name || 'Special'}`);
        else {
          const idx = parseInt(tgt.unitType.replace('soldier', ''));
          labels.push(`${p.playerName}'s ${p.subUnits?.[idx]?.name || `Soldier ${idx}`}`);
        }
      } else if (tgt.type === 'npc') {
        const n = npcs.find(nc => nc.id === tgt.npcId);
        if (n) labels.push(`👾 ${n.name}`);
      }
    });
    return labels;
  };

  const canCreate = name.trim() && duration && parseInt(duration) > 0;

  return (
    <div style={{ width: '100%' }}>

      {/* Create new timer */}
      <div style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '2px solid rgba(201,169,97,0.3)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ color: gold, fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: '"Cinzel",Georgia,serif' }}>
          ⏱ New Timer
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Timer Name</label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g. Poison, Stun, Immunity...'
              onKeyDown={e => e.key === 'Enter' && canCreate && handleCreate()}
            />
          </div>
          <div style={{ minWidth: '90px' }}>
            <label style={labelStyle}>Rounds</label>
            <input
              style={{ ...inputStyle, textAlign: 'center' }}
              type='number' min='1' max='99'
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder='3'
            />
          </div>
        </div>

        {/* Target selection */}
        {(players.length > 0 || npcs.filter(n => !n.isDead).length > 0) && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Attach to Units (optional)</label>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.3)', borderRadius: '8px', padding: '0.65rem', maxHeight: '200px', overflowY: 'auto' }}>

              {/* Players */}
              {players.map(player => {
                const allUnits = [
                  { unitType: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander' },
                  ...(player.subUnits || []).map((u, idx) => ({
                    unitType: idx === 0 ? 'special' : `soldier${idx}`,
                    label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`),
                  })),
                ];
                return (
                  <div key={player.id} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '700', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{player.playerName}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {allUnits.map(u => {
                        const sel = isPlayerUnitSelected(player.id, u.unitType);
                        return (
                          <button key={u.unitType} onClick={() => togglePlayerUnit(player.id, u.unitType)} style={{
                            padding: '0.25rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
                            background: sel ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${sel ? '#6366f1' : 'rgba(90,74,58,0.3)'}`,
                            color: sel ? '#a5b4fc' : '#6b7280',
                          }}>{u.label}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Active NPCs */}
              {npcs.filter(n => !n.isDead).length > 0 && (
                <div>
                  <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '700', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>NPCs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {npcs.filter(n => !n.isDead).map(npc => {
                      const sel = isNPCSelected(npc.id);
                      return (
                        <button key={npc.id} onClick={() => toggleNPC(npc.id)} style={{
                          padding: '0.25rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
                          background: sel ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${sel ? '#ef4444' : 'rgba(90,74,58,0.3)'}`,
                          color: sel ? '#fca5a5' : '#6b7280',
                        }}>👾 {npc.name}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={!canCreate} style={{
          width: '100%', padding: '0.65rem', borderRadius: '8px', fontFamily: 'inherit', fontWeight: '900', fontSize: '0.85rem', cursor: canCreate ? 'pointer' : 'not-allowed',
          background: canCreate ? 'linear-gradient(135deg,#4c1d95,#3b0764)' : 'rgba(0,0,0,0.3)',
          border: `2px solid ${canCreate ? '#7c3aed' : 'rgba(90,74,58,0.3)'}`,
          color: canCreate ? '#e9d5ff' : '#4b5563',
        }}>
          + Create Timer
        </button>
      </div>

      {/* Active timers list */}
      {timers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#4b5563' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>No active timers</div>
          <div style={{ fontSize: '0.8rem' }}>Create a timer above to track round-based effects.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {timers.map(timer => {
            const targetLabels = getTargetLabels(timer);
            const urgent = timer.remaining <= 1;
            const warning = timer.remaining <= 3 && timer.remaining > 1;
            const borderColor = urgent ? 'rgba(239,68,68,0.5)' : warning ? 'rgba(251,191,36,0.4)' : 'rgba(99,102,241,0.35)';
            const bgColor     = urgent ? 'rgba(239,68,68,0.07)' : warning ? 'rgba(251,191,36,0.06)' : 'rgba(99,102,241,0.07)';

            return (
              <div key={timer.id} style={{ background: bgColor, border: `2px solid ${borderColor}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Round counter */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' }}>
                    <button onClick={() => onAdjustTimer(timer.id, 1)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.3)', borderRadius: '4px 4px 0 0', color: '#9ca3af', cursor: 'pointer', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontFamily: 'inherit', width: '100%' }}>▲</button>
                    <div style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${borderColor}`, padding: '0.2rem 0.5rem', textAlign: 'center', width: '100%' }}>
                      <div style={{ color: urgent ? '#fca5a5' : warning ? '#fbbf24' : '#a5b4fc', fontWeight: '900', fontSize: '1.2rem', lineHeight: 1 }}>{timer.remaining}</div>
                      <div style={{ color: '#4b5563', fontSize: '0.55rem', fontWeight: '700' }}>ROUNDS</div>
                    </div>
                    <button onClick={() => onAdjustTimer(timer.id, -1)} disabled={timer.remaining <= 0} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.3)', borderRadius: '0 0 4px 4px', color: timer.remaining <= 0 ? '#1f2937' : '#9ca3af', cursor: timer.remaining <= 0 ? 'not-allowed' : 'pointer', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontFamily: 'inherit', width: '100%' }}>▼</button>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: gold, fontWeight: '900', fontSize: '0.9rem', marginBottom: '0.15rem' }}>{timer.name}</div>
                    {targetLabels.length > 0 ? (
                      <div style={{ color: '#6b7280', fontSize: '0.65rem', lineHeight: 1.4 }}>
                        {targetLabels.join(' · ')}
                      </div>
                    ) : (
                      <div style={{ color: '#374151', fontSize: '0.65rem', fontStyle: 'italic' }}>No units attached</div>
                    )}
                    <div style={{ color: '#4b5563', fontSize: '0.6rem', marginTop: '0.2rem' }}>
                      Started at {timer.duration} round{timer.duration !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => onDeleteTimer(timer.id)} style={{ background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(127,29,29,0.4)', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', padding: '0.35rem 0.55rem', fontSize: '0.7rem', fontFamily: 'inherit', flexShrink: 0 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoundTimerPanel;