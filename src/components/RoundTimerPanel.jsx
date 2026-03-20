import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, text, inputStyle, selectStyle } from '../theme';

const labelStyle = {
  color: colors.textMuted, fontSize: '0.68rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.3rem',
};

const themedInput = {
  ...inputStyle,
  width: '100%', boxSizing: 'border-box',
  fontSize: '0.85rem',
};

const RoundTimerPanel = ({
  timers = [], players = [], npcs = [],
  onCreateTimer, onDeleteTimer, onAdjustTimer, onUpdateTimer,
}) => {
  const [name,     setName]     = useState('');
  const [duration, setDuration] = useState('');
  const [targets,  setTargets]  = useState([]);

  const handleCreate = () => {
    if (!name.trim() || !duration) return;
    onCreateTimer(name, duration, targets);
    setName(''); setDuration(''); setTargets([]);
  };

  const togglePlayerUnit = (playerId, unitType) => {
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
        else { const idx = parseInt(tgt.unitType.replace('soldier', '')); labels.push(`${p.playerName}'s ${p.subUnits?.[idx]?.name || `Soldier ${idx}`}`); }
      } else if (tgt.type === 'npc') {
        const n = npcs.find(nc => nc.id === tgt.npcId);
        if (n) labels.push(`👾 ${n.name}`);
      }
    });
    return labels;
  };

  const canCreate = name.trim() && duration && parseInt(duration) > 0;

  const chipBtn = (selected, color) => ({
    padding: '0.22rem 0.5rem', borderRadius: '20px', fontSize: '0.62rem',
    fontWeight: '800', cursor: 'pointer', fontFamily: fonts.body,
    background: selected ? `${color}20` : 'rgba(0,0,0,0.3)',
    border: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
    color: selected ? color : colors.textFaint,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ width: '100%' }}>

      {/* Create new timer */}
      <div style={{
        background: surfaces.card, border: borders.warm,
        borderRadius: '10px', padding: '1.1rem', marginBottom: '1.25rem',
      }}>
        <div style={{ color: colors.gold, fontWeight: '900', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem', fontFamily: fonts.display }}>
          ⏱ New Timer
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', marginBottom: '0.65rem' }}>
          <div>
            <label style={labelStyle}>Timer Name</label>
            <input style={themedInput} value={name} onChange={e => setName(e.target.value)}
              placeholder='e.g. Poison, Stun, Immunity...'
              onKeyDown={e => e.key === 'Enter' && canCreate && handleCreate()} />
          </div>
          <div style={{ minWidth: '80px' }}>
            <label style={labelStyle}>Rounds</label>
            <input style={{ ...themedInput, textAlign: 'center' }} type='number' min='1' max='99'
              value={duration} onChange={e => setDuration(e.target.value)} placeholder='3' />
          </div>
        </div>

        {(players.length > 0 || npcs.filter(n => !n.isDead).length > 0) && (
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={labelStyle}>Attach to Units (optional)</label>
            <div style={{
              background: 'rgba(0,0,0,0.25)', border: borders.default,
              borderRadius: '7px', padding: '0.6rem', maxHeight: '180px', overflowY: 'auto',
            }}>
              {players.map(player => {
                const allUnits = [
                  { unitType: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander' },
                  ...(player.subUnits || []).map((u, idx) => ({
                    unitType: idx === 0 ? 'special' : `soldier${idx}`,
                    label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`),
                  })),
                ];
                return (
                  <div key={player.id} style={{ marginBottom: '0.45rem' }}>
                    <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '700', marginBottom: '0.22rem', letterSpacing: '0.05em' }}>{player.playerName}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {allUnits.map(u => {
                        const sel = isPlayerUnitSelected(player.id, u.unitType);
                        return <button key={u.unitType} onClick={() => togglePlayerUnit(player.id, u.unitType)} style={chipBtn(sel, colors.purpleLight)}>{u.label}</button>;
                      })}
                    </div>
                  </div>
                );
              })}
              {npcs.filter(n => !n.isDead).length > 0 && (
                <div>
                  <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '700', marginBottom: '0.22rem', letterSpacing: '0.05em' }}>NPCs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {npcs.filter(n => !n.isDead).map(npc => {
                      const sel = isNPCSelected(npc.id);
                      return <button key={npc.id} onClick={() => toggleNPC(npc.id)} style={chipBtn(sel, '#fca5a5')}>👾 {npc.name}</button>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={!canCreate} style={{
          width: '100%', padding: '0.6rem', borderRadius: '8px',
          fontFamily: fonts.body, fontWeight: '900', fontSize: '0.82rem',
          cursor: canCreate ? 'pointer' : 'not-allowed',
          background: canCreate ? 'linear-gradient(135deg, #4c1d95, #3b0764)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${canCreate ? colors.purple : 'rgba(255,255,255,0.06)'}`,
          color: canCreate ? '#e9d5ff' : colors.textFaint,
          transition: 'all 0.15s',
        }}>+ Create Timer</button>
      </div>

      {/* Active timers list */}
      {timers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: colors.textFaint }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱</div>
          <div style={{ fontWeight: '700', color: colors.textMuted, marginBottom: '0.25rem' }}>No active timers</div>
          <div style={{ fontSize: '0.78rem' }}>Create a timer above to track round-based effects.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {timers.map(timer => {
            const targetLabels = getTargetLabels(timer);
            const urgent  = timer.remaining <= 1;
            const warning = timer.remaining <= 3 && timer.remaining > 1;
            const accentColor = urgent ? colors.red : warning ? colors.amber : colors.purple;
            const accentBg    = urgent ? colors.redSubtle : warning ? colors.amberSubtle : colors.purpleSubtle;
            const accentBorder = urgent ? colors.redBorder : warning ? colors.amberBorder : colors.purpleBorder;

            return (
              <div key={timer.id} style={{
                background: accentBg, border: `1px solid ${accentBorder}`,
                borderRadius: '10px', padding: '0.75rem 0.9rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {/* Round counter stepper */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '44px' }}>
                    <button onClick={() => onAdjustTimer(timer.id, 1)} style={{
                      background: 'rgba(0,0,0,0.25)', border: borders.default,
                      borderRadius: '4px 4px 0 0', color: colors.textSecondary,
                      cursor: 'pointer', padding: '0.08rem 0.45rem',
                      fontSize: '0.65rem', fontFamily: fonts.body, width: '100%',
                    }}>▲</button>
                    <div style={{
                      background: 'rgba(0,0,0,0.4)', border: `1px solid ${accentBorder}`,
                      padding: '0.18rem 0.45rem', textAlign: 'center', width: '100%',
                    }}>
                      <div style={{ color: accentColor, fontWeight: '900', fontSize: '1.1rem', lineHeight: 1 }}>{timer.remaining}</div>
                      <div style={{ color: colors.textFaint, fontSize: '0.5rem', fontWeight: '700' }}>RND</div>
                    </div>
                    <button onClick={() => onAdjustTimer(timer.id, -1)} disabled={timer.remaining <= 0} style={{
                      background: 'rgba(0,0,0,0.25)', border: borders.default,
                      borderRadius: '0 0 4px 4px', color: timer.remaining <= 0 ? colors.textDisabled : colors.textSecondary,
                      cursor: timer.remaining <= 0 ? 'not-allowed' : 'pointer',
                      padding: '0.08rem 0.45rem', fontSize: '0.65rem', fontFamily: fonts.body, width: '100%',
                    }}>▼</button>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.gold, fontWeight: '900', fontSize: '0.88rem', marginBottom: '0.12rem' }}>{timer.name}</div>
                    {targetLabels.length > 0 ? (
                      <div style={{ color: colors.textMuted, fontSize: '0.62rem', lineHeight: 1.4 }}>{targetLabels.join(' · ')}</div>
                    ) : (
                      <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontStyle: 'italic' }}>No units attached</div>
                    )}
                    <div style={{ color: colors.textFaint, fontSize: '0.58rem', marginTop: '0.15rem' }}>
                      Started at {timer.duration} round{timer.duration !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <button onClick={() => onDeleteTimer(timer.id)} style={btn.danger()}>✕</button>
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