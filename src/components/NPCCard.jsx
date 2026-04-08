import React from 'react';
import {
  colors, surfaces, borders, fonts, text, btn, hpBarColor,
  insetSection, pill, tierColors,
} from '../theme';

const NPCCard = ({
  npc,
  isCurrentTurn = false,
  hasActedThisRound = false,
  onActivate,
  onDeactivate,
  onEdit,
  onRemove,
  onHPChange,
  onTriggerPhase,
  onOpenNPCAttack,
  onSpawnAttack,
  onIncrementAttack,
  players = [],
  onDropLoot,
  getTimersForNPC = () => [],
  onUpdateNPC = () => {},
  onDuplicate = () => {},
}) => {
  const [manualHP, setManualHP] = React.useState('');
  const [showPhaseMenu, setShowPhaseMenu] = React.useState(false);

  const hpPercent = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
  const hasNextPhase = npc.hasPhases && npc.currentPhase < (npc.phases?.length || 0);
  const currentPhaseName = npc.currentPhase > 0
    ? (npc.phases[npc.currentPhase - 1]?.label || `Phase ${npc.currentPhase + 1}`)
    : 'Phase 1';

  const handleSetHP = () => {
    const val = parseInt(manualHP);
    if (!isNaN(val)) { onHPChange(npc.id, val); setManualHP(''); }
  };

  const cardBorder = isCurrentTurn
    ? `2px solid ${colors.red}`
    : npc.isDead
      ? `1px solid ${colors.redDeep}`
      : npc.active
        ? `1px solid rgba(239,68,68,0.3)`
        : borders.default;

  return (
    <div style={{
      background: npc.active && !npc.isDead
        ? 'linear-gradient(145deg, #160e0e, #0e0808)'
        : surfaces.card,
      borderRadius: '12px', padding: '1rem', fontFamily: fonts.body,
      boxShadow: isCurrentTurn
        ? `0 0 20px ${colors.red}50, 0 8px 32px rgba(0,0,0,0.7)`
        : '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
      border: cardBorder,
      opacity: npc.isDead ? 0.5 : 1,
      transition: 'all 0.3s',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        marginBottom: '0.75rem', paddingBottom: '0.65rem',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
          background: npc.isDead ? colors.redDeep : npc.active ? colors.red : colors.textFaint,
          boxShadow: npc.active && !npc.isDead ? `0 0 7px ${colors.red}` : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...text.cardTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {npc.name || 'Unnamed NPC'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.68rem', letterSpacing: '0.06em', marginTop: '0.1rem' }}>
            {npc.active ? '⚔️ In Battle' : npc.isDead ? '💀 Defeated' : '💤 Standby'}
            {npc.hasPhases && ` · ${currentPhaseName}`}
          </div>
        </div>
        {isCurrentTurn && <div style={pill(colors.red, colors.redSubtle, colors.redBorder)}>NPC TURN</div>}
        {!isCurrentTurn && hasActedThisRound && <div style={pill(colors.green, colors.greenSubtle, colors.greenBorder)}>✓ ACTED</div>}
        {npc.hasPhases && npc.phases?.length > 0 && (
          <>
            <div style={{
              padding: '0.22rem 0.5rem', background: 'rgba(139,92,246,0.1)',
              border: `1px solid ${colors.purpleBorder}`, borderRadius: '6px',
              color: colors.purpleLight, fontSize: '0.66rem', fontWeight: '800',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{currentPhaseName}</div>
            {npc.hasPhases && npc.phases?.length > 0 && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setShowPhaseMenu(s => !s)} style={{
                  padding: '0.22rem 0.6rem',
                  background: 'linear-gradient(135deg, #5b21b6, #4c1d95)',
                  border: `1px solid ${colors.purpleLight}60`, borderRadius: '6px',
                  color: '#e9d5ff', fontSize: '0.66rem', fontWeight: '800',
                  cursor: 'pointer', fontFamily: fonts.body,
                  whiteSpace: 'nowrap',
                }}>⚡ Phase {showPhaseMenu ? '▲' : '▼'}</button>
                {showPhaseMenu && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 50,
                    background: surfaces.elevated, border: `1px solid ${colors.purpleBorder}`,
                    borderRadius: '8px', padding: '0.4rem', minWidth: '160px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  }}>
                    <div style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.5rem 0.4rem' }}>Jump to phase:</div>
                    {npc.phases.map((phase, idx) => {
                      const isCurrent = idx + 1 === npc.currentPhase;
                      return (
                        <div key={phase.id || idx} onClick={() => { if (!isCurrent) { onTriggerPhase(npc.id, idx); } setShowPhaseMenu(false); }} style={{
                          padding: '0.4rem 0.6rem', borderRadius: '5px', cursor: isCurrent ? 'default' : 'pointer',
                          background: isCurrent ? colors.purpleSubtle : 'transparent',
                          color: isCurrent ? colors.purpleLight : colors.textSecondary,
                          fontSize: '0.72rem', fontWeight: '700',
                          opacity: isCurrent ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                          {isCurrent && <span style={{ color: colors.purpleLight }}>▶</span>}
                          {phase.label || `Phase ${idx + 1}`}
                          {phase.triggerType === 'manual' && <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>manual</span>}
                          {phase.triggerType !== 'manual' && phase.triggerHP > 0 && <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>≤{phase.triggerHP}hp</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <button onClick={() => onDuplicate(npc.id)} title="Duplicate NPC" style={btn.icon(colors.tealLight)}>⧉</button>
        <button onClick={() => onEdit(npc.id)} title="Edit NPC" style={btn.icon(colors.blue)}>✏️</button>
        <button onClick={() => onRemove(npc.id)} title="Remove NPC" style={btn.icon('#fca5a5')}>✕</button>
      </div>

      {/* Status Effects */}
      {(npc.statusEffects || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
          {(npc.statusEffects || []).map((ef, ei) => {
            const dur = ef.permanent ? '∞' : (ef.duration ? ef.duration + 'r' : '');
            const label = ef.type === 'poison'        ? '🤢 Poison ' + (ef.value || 2) + 'hp×' + dur
                        : ef.type === 'stun'          ? '💫 Stun ' + dur
                        : ef.type === 'attackDebuff'  ? '⚔️↓ -' + (ef.value || 2) + ' Atk ' + dur
                        : ef.type === 'defenseDebuff' ? '🛡️↓ -' + (ef.value || 2) + ' Def ' + dur
                        : ef.type === 'attackBuff'    ? '⚔️↑ +' + (ef.value || 2) + ' Atk ' + dur
                        : ef.type === 'defenseBuff'   ? '🛡️↑ +' + (ef.value || 2) + ' Def ' + dur
                        : ef.type === 'marked'        ? '🎯 Marked ' + dur
                        : ef.type;
            const col = ef.type === 'poison'        ? { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.35)' }
                      : ef.type === 'stun'          ? { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.35)' }
                      : ef.type === 'marked'        ? { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' }
                      : ef.type.includes('Debuff')  ? { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.35)' }
                      : { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' };
            return (
              <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.45rem', background: col.bg, border: '1px solid ' + col.border, borderRadius: '20px' }}>
                <span style={{ color: col.color, fontSize: '0.62rem', fontWeight: '800' }}>{label}</span>
                <button
                  onClick={() => onUpdateNPC(npc.id, { statusEffects: (npc.statusEffects || []).filter((_, i) => i !== ei) })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: col.color, fontSize: '0.6rem', fontWeight: '900', padding: '0', lineHeight: 1, opacity: 0.7 }}
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {[
          { label: 'Armor',     value: `${npc.armor}+`,            color: colors.tealLight   },
          { label: 'Atk Bonus', value: `+${npc.attackBonus || 0}`, color: colors.amber       },
          { label: 'Walk',      value: npc.walk || '—',            color: colors.purpleLight },
          { label: 'Run',       value: npc.run  || '—',            color: colors.purpleLight },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(0,0,0,0.3)', border: borders.default, borderRadius: '7px', padding: '0.45rem 0.25rem', textAlign: 'center' }}>
            <div style={{ ...text.statLabel, marginBottom: '0.18rem' }}>{label}</div>
            <div style={{ color, fontSize: '0.88rem', fontWeight: '800' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* HP section */}
      <div style={{ ...insetSection('default'), marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
          <span style={{ color: colors.amber, fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hit Points</span>
          <span style={{ color: colors.amber, fontSize: '0.88rem', fontWeight: '700' }}>{npc.hp} / {npc.maxHp}</span>
        </div>
        <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ width: `${hpPercent}%`, height: '100%', background: hpBarColor(hpPercent), transition: 'width 0.4s ease', borderRadius: '3px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button onClick={() => onHPChange(npc.id, npc.hp - 1)} disabled={npc.hp === 0 || npc.isDead} style={btn.hp(npc.hp === 0 || npc.isDead)}>−</button>
          <input
            type="number" value={manualHP}
            onChange={e => setManualHP(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetHP()}
            placeholder={String(npc.hp)}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${colors.amberBorder}`, borderRadius: '7px',
              padding: '0.55rem 0.75rem', color: colors.amber,
              fontSize: '0.95rem', fontWeight: '700', fontFamily: fonts.body,
              textAlign: 'center', outline: 'none',
            }}
          />
          <button onClick={handleSetHP} style={{
            background: colors.amberSubtle, border: `1px solid ${colors.amberBorder}`,
            color: colors.amber, padding: '0.55rem 0.7rem', borderRadius: '7px',
            cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.73rem',
            letterSpacing: '0.05em', flexShrink: 0,
          }}>SET</button>
          <button onClick={() => onHPChange(npc.id, npc.hp + 1)} disabled={npc.hp >= npc.maxHp} style={btn.hp(npc.hp >= npc.maxHp)}>+</button>
        </div>
      </div>

      {/* Attacks */}
      <div style={{
        background: 'rgba(0,0,0,0.28)', border: borders.default,
        borderRadius: '10px', padding: '0.85rem',
        marginBottom: '0.75rem',
        display: 'flex', flexDirection: 'column', height: '260px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ color: colors.amber, fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Attacks</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
            <span style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.05em' }}>TIMES ATTACKED:</span>
            <span style={{ minWidth: '22px', textAlign: 'center', color: (npc.attackCount || 0) > 0 ? colors.amber : colors.textFaint, fontWeight: '900', fontSize: '0.88rem' }}>{npc.attackCount || 0}</span>
            <button onClick={() => onIncrementAttack && onIncrementAttack(npc.id)} style={{ padding: '0.12rem 0.42rem', background: colors.amberSubtle, border: `1px solid ${colors.amberBorder}`, borderRadius: '4px', cursor: 'pointer', color: colors.amber, fontWeight: '900', fontSize: '0.72rem', fontFamily: fonts.body }}>+1</button>
            <button onClick={() => onIncrementAttack && onIncrementAttack(npc.id, true)} style={{ padding: '0.12rem 0.38rem', background: 'rgba(75,85,99,0.18)', border: `1px solid rgba(75,85,99,0.3)`, borderRadius: '4px', cursor: 'pointer', color: colors.textFaint, fontWeight: '900', fontSize: '0.62rem', fontFamily: fonts.body }}>↺</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
          {npc.attacks?.map((attack, i) => {
            const type = attack.attackType || 'attack';
            const isSpawn  = type === 'spawn';
            const isAction = type === 'action';
            const isDisabled = isSpawn ? npc.isDead : (!npc.active || npc.isDead);
            const accentColor = isSpawn ? '#10b981' : isAction ? colors.purple : colors.red;
            const accentBg    = isSpawn ? 'rgba(6,95,70,0.35)' : isAction ? 'rgba(76,29,149,0.35)' : 'rgba(185,28,28,0.35)';
            const rowBorder   = isSpawn ? 'rgba(74,222,128,0.15)' : isAction ? colors.purpleBorder : 'rgba(255,255,255,0.05)';

            return (
              <div key={attack.id || i} style={{
                background: 'rgba(0,0,0,0.28)', border: `1px solid ${rowBorder}`,
                borderRadius: '7px', padding: '0.6rem',
                marginBottom: i < npc.attacks.length - 1 ? '0.38rem' : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.32rem', marginBottom: '0.22rem' }}>
                      {isSpawn  && <span style={pill('#86efac', 'rgba(74,222,128,0.1)', 'rgba(74,222,128,0.28)')}>🐣 SPAWN</span>}
                      {isAction && <span style={pill(colors.purpleLight, colors.purpleSubtle, colors.purpleBorder)}>✦ ACTION</span>}
                      <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.88rem' }}>{attack.name || `Attack ${i + 1}`}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {!isSpawn && !isAction && <span style={pill(colors.purpleLight, colors.purpleSubtle, colors.purpleBorder)}>{attack.dieType?.toUpperCase()} × {attack.numRolls}</span>}
                      {!isSpawn && !isAction && attack.range && <span style={pill(colors.tealLight, colors.tealSubtle, colors.tealBorder)}>📏 {attack.range}</span>}
                      {isSpawn && attack.spawnText && <span style={pill('#86efac', 'rgba(74,222,128,0.08)', 'rgba(74,222,128,0.22)')}>🐣 {attack.spawnText}</span>}
                      {isSpawn && attack.spawnDieType && <span style={pill('#86efac', 'rgba(74,222,128,0.08)', 'rgba(74,222,128,0.18)')}>{attack.spawnDieType.toUpperCase()} × {attack.spawnNumRolls || 1}</span>}
                      {(isAction || isSpawn) && attack.description && <span style={{ color: colors.textMuted, fontSize: '0.68rem', fontStyle: 'italic' }}>{attack.description}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isSpawn) { if (onSpawnAttack) onSpawnAttack(attack, npc.name); }
                      else if (!isAction) onOpenNPCAttack(npc.id, i);
                    }}
                    disabled={isDisabled}
                    style={{
                      padding: '0.38rem 0.7rem',
                      background: isDisabled ? 'rgba(0,0,0,0.15)' : accentBg,
                      border: `1px solid ${isDisabled ? colors.textDisabled : accentColor}`,
                      color: isDisabled ? colors.textDisabled : '#fff',
                      borderRadius: '6px', cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontFamily: fonts.body, fontWeight: '700', fontSize: '0.75rem',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                    }}
                  >{isSpawn ? '🐣 SPAWN' : isAction ? '✦ USE' : '⚔️ USE'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activate / Deactivate / Defeated */}
      {npc.isDead ? (
        <div style={{
          textAlign: 'center', color: colors.redDeep, fontSize: '0.82rem',
          fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase',
          padding: '0.6rem', border: `1px solid ${colors.redDeep}`,
          borderRadius: '8px', background: 'rgba(127,29,29,0.07)',
        }}>💀 DEFEATED</div>
      ) : (
        <button
          onClick={() => npc.active ? onDeactivate(npc.id) : onActivate(npc.id)}
          style={{
            width: '100%', padding: '0.78rem',
            background: npc.active ? 'rgba(0,0,0,0.22)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: `1px solid ${npc.active ? colors.textDisabled : colors.red}`,
            color: npc.active ? colors.textMuted : '#fecaca',
            borderRadius: '8px', cursor: 'pointer',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: npc.active ? 'none' : `0 4px 12px ${colors.red}28`,
            transition: 'all 0.2s',
          }}
        >{npc.active ? '💤 Deactivate' : '⚡ Activate into Battle'}</button>
      )}
    </div>
  );
};

export default NPCCard;