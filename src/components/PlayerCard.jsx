import React from 'react';
import { FACTIONS } from '../data/factions';
import { getUnitName } from '../utils/statsUtils';

const PlayerCard = ({ 
  player, 
  onUpdate, 
  onRemove, 
  onToggleSquad,
  onOpenCalculator,
  onUseRevive,
  onOpenSquadRevive,
  allPlayers,
  isCurrentTurn = false,
  hasActedThisRound = false,
  onOpenDestroyModal,
  onOpenHandOff,
  onCommanderDied,
  getTimersForPlayerUnit,
  getTokenForPlayer,
}) => {
  const [showSquad, setShowSquad] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [showReviveModal, setShowReviveModal] = React.useState(false);
  const [healTargetItem, setHealTargetItem] = React.useState(null); // { item, itemIndex } — waiting for unit selection
  const [maxHpTargetItem, setMaxHpTargetItem] = React.useState(null); // same shape, for maxHP items
  
  const reviveQueue = player.reviveQueue || [];
  const [deathLootModal, setDeathLootModal] = React.useState(null); // { unitLabel, items }
  const aliveUnits = player.subUnits.filter(u => u.hp > 0).length;
  const totalUnits = player.subUnits.length;

  const handlePlayerNameChange = (e) => onUpdate(player.id, { playerName: e.target.value });

  const handleFactionChange = (e) => {
    const newFaction = e.target.value;
    const commanders = FACTIONS[newFaction] || [];
    onUpdate(player.id, { faction: newFaction, commander: commanders[0] || '' });
  };

  const handleCommanderChange = (e) => onUpdate(player.id, { commander: e.target.value });

  const handleCommanderHPChange = (delta) => {
    const currentHP = player.commanderStats.hp;
    const newHP = Math.max(0, Math.min(player.commanderStats.maxHp, currentHP + delta));
    const justDied = currentHP > 0 && newHP === 0;
    onUpdate(player.id, {
      commanderStats: {
        ...player.commanderStats,
        hp: newHP,
        isDead: justDied ? true : (newHP > 0 ? false : player.commanderStats.isDead)
      }
    });
    if (justDied) {
      const cmdItems = (player.inventory || []).filter(it => it.heldBy === 'commander');
      if (cmdItems.length > 0) {
        const label = player.commanderStats?.customName || player.commander || 'Commander';
        setDeathLootModal({ unitLabel: label, items: cmdItems });
      }
    }
  };

  const handleSubUnitHPChange = (index, delta) => {
    const unit = player.subUnits[index];
    const currentHP = unit.hp;
    const newHP = Math.max(0, Math.min(unit.maxHp, currentHP + delta));
    const justDied = currentHP > 0 && newHP === 0;
    const newSubUnits = player.subUnits.map((u, i) => i !== index ? u : { ...u, hp: newHP });
    let newReviveQueue = [...reviveQueue];
    const lives = unit.livesRemaining ?? unit.revives ?? 1;
    if (justDied && lives > 0 && !newReviveQueue.includes(index)) {
      newReviveQueue = [...newReviveQueue, index];
    }
    if (justDied) {
      const unitType = index === 0 ? 'special' : `soldier${index}`;
      const unitItems = (player.inventory || []).filter(it => it.heldBy === unitType);
      if (unitItems.length > 0) {
        const label = unit.name?.trim() || (index === 0 ? 'Special' : `Soldier ${index}`);
        setDeathLootModal({ unitLabel: label, items: unitItems });
      }
    }
    const allDead = newSubUnits.every(u => u.hp === 0);
    let finalSubUnits = newSubUnits;
    if (allDead) {
      newReviveQueue = [];
      finalSubUnits = newSubUnits.map(u => ({ ...u, livesRemaining: 0, revives: 0 }));
    }
    onUpdate(player.id, { subUnits: finalSubUnits, reviveQueue: newReviveQueue });
  };

  const handleSubUnitNameChange = (index, name) => {
    onUpdate(player.id, { subUnits: player.subUnits.map((u, i) => i === index ? { ...u, name } : u) });
  };

  const getQueuePosition = (unitIndex) => {
    const pos = reviveQueue.indexOf(unitIndex);
    return pos === -1 ? 0 : pos + 1;
  };

  const removeFromQueue = (unitIndex) => {
    const newQueue = reviveQueue.filter(i => i !== unitIndex);
    const newSubUnits = player.subUnits.map((u, i) =>
      i === unitIndex ? { ...u, hp: 1 } : u
    );
    onUpdate(player.id, { reviveQueue: newQueue, subUnits: newSubUnits });
  };

  const cmdHP = player.commanderStats.hp;
  const cmdMaxHP = player.commanderStats.maxHp;
  const cmdHPPct = cmdMaxHP > 0 ? (cmdHP / cmdMaxHP) * 100 : 0;
  const cmdHPColor = cmdHPPct > 50
    ? 'linear-gradient(to right, #16a34a, #22c55e)'
    : cmdHPPct > 25
      ? 'linear-gradient(to right, #ca8a04, #eab308)'
      : 'linear-gradient(to right, #dc2626, #ef4444)';
  const cmdDead = cmdHP === 0;
  const revives = player.commanderStats.revives || 0;
  const cooldown = player.commanderStats.cooldownRounds || 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.85))',
      borderRadius: '12px',
      padding: '0.85rem',
      fontFamily: '"Rajdhani", "Cinzel", sans-serif',
      boxShadow: isCurrentTurn
        ? `0 0 20px ${player.playerColor || '#3b82f6'}80, 0 8px 32px rgba(0,0,0,0.6)`
        : '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      border: isCurrentTurn
        ? `3px solid ${player.playerColor || '#3b82f6'}`
        : hasActedThisRound
          ? '2px solid #16a34a'
          : '2px solid rgba(212,175,55,0.3)',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <input
          type="color"
          value={player.playerColor || '#3b82f6'}
          onChange={(e) => onUpdate(player.id, { playerColor: e.target.value })}
          style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          type="text"
          value={player.playerName}
          onChange={handlePlayerNameChange}
          style={{
            flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fbbf24',
            fontSize: '1rem', fontWeight: '700', fontFamily: 'inherit', letterSpacing: '0.05em',
          }}
          placeholder="Player Name"
        />
        {isCurrentTurn && <Badge color="#3b82f6" text="YOUR TURN" />}
        {!isCurrentTurn && hasActedThisRound && <Badge color="#16a34a" text="✓ ACTED" dim />}
        {/* Setup toggle */}
        <button
          onClick={() => setShowSetup(s => !s)}
          title="Faction & Commander setup"
          style={{
            background: showSetup ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${showSetup ? '#7c3aed' : 'rgba(201,169,97,0.2)'}`,
            color: showSetup ? '#c4b5fd' : '#6b7280',
            width: '30px', height: '30px', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
          }}
        >⚙️</button>
        <button onClick={() => onRemove(player.id)} style={rmBtn} title="Remove">✕</button>
      </div>

      {/* ── Setup: Faction + Commander (collapsed by default) ── */}
      {showSetup && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select value={player.faction} onChange={handleFactionChange} style={selectStyle}>
            {Object.keys(FACTIONS).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={player.commander} onChange={handleCommanderChange} style={selectStyle}>
            {FACTIONS[player.faction]?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* ── Commander block ── */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        border: cmdDead ? '2px solid #7f1d1d' : '1px solid rgba(139,92,246,0.2)',
        borderRadius: '10px',
        padding: '0.75rem',
        marginBottom: '0.6rem',
        opacity: cmdDead ? 0.7 : 1,
        transition: 'all 0.3s',
      }}>
        {/* Commander name + cooldown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={player.commanderStats.customName || player.commander}
            onChange={(e) => onUpdate(player.id, { commanderStats: { ...player.commanderStats, customName: e.target.value }})}
            style={{ background: 'transparent', border: 'none', color: '#d4af37', outline: 'none', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase', minWidth: '80px' }}
            placeholder={player.commander}
          />
          <div style={{
            padding: '0.2rem 0.6rem',
            background: cooldown > 0 ? 'linear-gradient(to bottom, #991b1b, #7f1d1d)' : 'rgba(255,255,255,0.07)',
            border: '1px solid', borderColor: cooldown > 0 ? '#dc2626' : 'rgba(255,255,255,0.1)',
            borderRadius: '6px', color: cooldown > 0 ? '#fca5a5' : '#6b7280',
            fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em',
          }}>
            {cooldown > 0 ? `🔴 CD:${cooldown}` : '⭕ Ready'}
          </div>
        </div>

        {/* HP bar + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={() => handleCommanderHPChange(-1)} disabled={cmdDead} style={hpBtn(cmdDead)}>−</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ color: '#fde68a', fontSize: '0.85rem', fontWeight: '700' }}>{cmdHP} / {cmdMaxHP} HP</span>
              {/* Revive pips inline */}
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {[...Array(2)].map((_, i) => (
                  <div key={i} style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    border: '2px solid', borderColor: i < revives ? '#60a5fa' : '#374151',
                    background: i < revives ? 'radial-gradient(circle, #3b82f6, #1e40af)' : '#111',
                    boxShadow: i < revives ? '0 0 6px #3b82f680' : 'none',
                  }} />
                ))}
                <button
                  onClick={() => setShowReviveModal(true)}
                  disabled={cmdHP > 0 || revives === 0}
                  style={{
                    background: revives > 0 && cmdDead ? 'linear-gradient(to bottom, #1e40af, #1e3a8a)' : 'rgba(0,0,0,0.3)',
                    color: revives > 0 && cmdDead ? '#bfdbfe' : '#374151',
                    border: '1px solid', borderColor: revives > 0 && cmdDead ? '#2563eb' : '#374151',
                    borderRadius: '5px', padding: '0.1rem 0.4rem',
                    cursor: revives > 0 && cmdDead ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', fontWeight: '700', fontSize: '0.7rem',
                  }}
                >⟲</button>
              </div>
            </div>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${cmdHPPct}%`, height: '100%', background: cmdHPColor, transition: 'width 0.3s ease', borderRadius: '3px' }} />
            </div>
          </div>
          <button onClick={() => handleCommanderHPChange(1)} disabled={cmdHP === cmdMaxHP} style={hpBtn(cmdHP === cmdMaxHP)}>+</button>
        </div>

        {/* Commander status effects */}
        {(player.commanderStats.statusEffects || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', margin: '0.2rem 0' }}>
            {(player.commanderStats.statusEffects || []).map((effect, ei) => {
              const label = effect.type === 'poison' ? `🤢 Poison ${effect.value}hp × ${effect.duration}r` : effect.type === 'stun' ? `💫 Stun ${effect.duration}r` : `⚡ ${effect.type}`;
              const colors = effect.type === 'poison' ? { color: '#86efac', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)' } : { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)' };
              return (
                <span key={ei} title='Click to remove' onClick={() => {
                  const newStats = { ...player.commanderStats, statusEffects: (player.commanderStats.statusEffects || []).filter((_, i) => i !== ei) };
                  onUpdate(player.id, { commanderStats: newStats });
                }} style={{ fontSize: '0.65rem', fontWeight: '800', borderRadius: '4px', padding: '0.1rem 0.4rem', cursor: 'pointer', color: colors.color, background: colors.bg, border: `1px solid ${colors.border}` }}>
                  {label} ✕
                </span>
              );
            })}
          </div>
        )}

        {/* Commander item holding tokens */}
        {(() => {
          const heldItems = (player.inventory || []).filter(it => it.heldBy === 'commander');
          if (heldItems.length === 0) return null;
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', margin: '0.3rem 0' }}>
              {heldItems.map((heldItem, hi) => {
                const tierColor = heldItem.isQuestItem ? '#fde68a' : ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[heldItem.tier] || '#9ca3af');
                return (
                  <div key={hi} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.15rem 0.45rem',
                    background: `${tierColor}18`,
                    border: `1px solid ${tierColor}50`,
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.7rem' }}>{heldItem.isQuestItem ? '🗝️' : '📦'}</span>
                    <span style={{ color: tierColor, fontSize: '0.62rem', fontWeight: '800' }}>{heldItem.name}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {[
            { label: '🎯 Shoot', action: 'shoot' },
            { label: '⚔️ Melee', action: 'melee' },
            { label: '⚡ Special', action: 'special', disabled: cooldown > 0 },
          ].map(({ label, action, disabled: extraDisabled }) => {
            const dis = cmdDead || extraDisabled;
            return (
              <button
                key={action}
                onClick={() => onOpenCalculator(player.id, action, 'commander')}
                disabled={dis}
                style={actionBtn(dis)}
              >{label}</button>
            );
          })}
        </div>
      </div>

      {/* ── Squad section header (always visible) ── */}
      <div
        onClick={() => setShowSquad(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.55rem 0.75rem',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: showSquad ? '8px 8px 0 0' : '8px',
          cursor: 'pointer', userSelect: 'none',
          marginBottom: showSquad ? 0 : '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: '#8b7355', fontSize: '0.75rem' }}>{showSquad ? '▼' : '▶'}</span>
          <span style={{ color: '#c4b5fd', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Squad
          </span>
          <span style={{ color: aliveUnits === 0 ? '#dc2626' : '#6b7280', fontSize: '0.78rem', fontWeight: '600' }}>
            {aliveUnits}/{totalUnits} alive
          </span>
          {reviveQueue.length > 0 && (
            <span style={{
              background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)',
              borderRadius: '4px', padding: '0.1rem 0.4rem',
              color: '#fbbf24', fontSize: '0.68rem', fontWeight: '800',
            }}>
              ⚕️ {reviveQueue.length} queue
            </span>
          )}
        </div>
        {/* Revive squad button inline in header */}
        {reviveQueue.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSquadRevive(player.id); }}
            style={{
              padding: '0.25rem 0.65rem',
              background: 'linear-gradient(135deg, #92400e, #78350f)',
              border: '2px solid #eab308',
              color: '#fde68a',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '800',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >⚕️ Revive</button>
        )}
      </div>

      {/* ── Squad units (expanded) ── */}
      {showSquad && (
        <div style={{
          border: '1px solid rgba(139,92,246,0.2)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          overflow: 'hidden',
          marginBottom: '0.6rem',
        }}>
          {player.subUnits.map((unit, index) => {
            const isDead = unit.hp === 0;
            const queuePos = getQueuePosition(index);
            const isInQueue = queuePos > 0;
            const livesRemaining = unit.livesRemaining ?? unit.revives ?? 0;
            const isPermaDead = isDead && livesRemaining === 0;
            const unitHPPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
            const unitHPColor = unitHPPct > 50
              ? 'linear-gradient(to right, #16a34a, #22c55e)'
              : unitHPPct > 25
                ? 'linear-gradient(to right, #ca8a04, #eab308)'
                : 'linear-gradient(to right, #dc2626, #ef4444)';

            return (
              <div key={index} style={{
                padding: '0.65rem 0.75rem',
                background: isPermaDead ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                borderBottom: index < player.subUnits.length - 1 ? '1px solid rgba(139,92,246,0.12)' : 'none',
                opacity: isPermaDead ? 0.35 : isDead ? 0.6 : 1,
                filter: isPermaDead ? 'grayscale(1)' : 'none',
                transition: 'all 0.3s',
              }}>
                {/* Unit top row: name + status + lives */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <input
                    type="text"
                    value={unit.name}
                    onChange={(e) => handleSubUnitNameChange(index, e.target.value)}
                    placeholder={index === 0 ? '⭐ Special' : `🛡️ Soldier ${index}`}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(139,92,246,0.25)', borderRadius: '5px',
                      padding: '0.3rem 0.5rem', color: '#c4b5fd',
                      fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: '600',
                    }}
                  />
                  {/* Lives pips */}
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        border: '2px solid', borderColor: i < livesRemaining ? '#eab308' : '#374151',
                        background: i < livesRemaining ? 'radial-gradient(circle, #eab308, #92400e)' : '#111',
                        boxShadow: i < livesRemaining ? '0 0 5px #eab30870' : 'none',
                      }} />
                    ))}
                  </div>
                  {!isDead && unit.revivedOnPlayerId && (
                    <span
                      title='Click to remove immunity'
                      onClick={e => {
                        e.stopPropagation();
                        const newSubs = player.subUnits.map((u, si) =>
                          si === index ? { ...u, revivedOnPlayerId: null } : u
                        );
                        onUpdate(player.id, { subUnits: newSubs });
                      }}
                      style={{
                        fontSize: '0.65rem', fontWeight: '800',
                        color: '#67e8f9', background: 'rgba(6,182,212,0.12)',
                        border: '1px solid rgba(6,182,212,0.4)',
                        borderRadius: '4px', padding: '0.1rem 0.4rem',
                        cursor: 'pointer',
                      }}>🛡️ IMMUNE ✕</span>
                  )}
                  {/* Status effect tags */}
                  {!isDead && (unit.statusEffects || []).map((effect, ei) => {
                    const tagStyle = { fontSize: '0.65rem', fontWeight: '800', borderRadius: '4px', padding: '0.1rem 0.4rem', cursor: 'pointer' };
                    const label = effect.type === 'poison'
                      ? `🤢 Poison ${effect.value}hp × ${effect.duration}r`
                      : effect.type === 'stun'
                      ? `💫 Stun ${effect.duration}r`
                      : `⚡ ${effect.type}`;
                    const colors = effect.type === 'poison'
                      ? { color: '#86efac', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)' }
                      : { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)' };
                    return (
                      <span key={ei}
                        title='Click to remove effect'
                        onClick={e => {
                          e.stopPropagation();
                          const newSubs = player.subUnits.map((u, si) =>
                            si === index ? { ...u, statusEffects: (u.statusEffects || []).filter((_, i) => i !== ei) } : u
                          );
                          onUpdate(player.id, { subUnits: newSubs });
                        }}
                        style={{ ...tagStyle, color: colors.color, background: colors.bg, border: `1px solid ${colors.border}` }}>
                        {label} ✕
                      </span>
                    );
                  })}

                  {isDead && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: '800',
                        color: isInQueue ? '#fde68a' : '#7f1d1d',
                        background: isInQueue ? 'rgba(234,179,8,0.1)' : 'rgba(127,29,29,0.2)',
                        border: `1px solid ${isInQueue ? 'rgba(234,179,8,0.4)' : '#450a0a'}`,
                        borderRadius: '4px', padding: '0.1rem 0.4rem',
                      }}>
                        {isInQueue ? `💀 #${queuePos}` : '💀 GONE'}
                      </span>
                      {isInQueue && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                          title="Remove from queue (restore to 1hp)"
                          style={{
                            background: 'rgba(127,29,29,0.4)',
                            border: '1px solid #7f1d1d',
                            borderRadius: '3px',
                            color: '#fca5a5',
                            fontSize: '0.6rem',
                            fontWeight: '900',
                            padding: '0.1rem 0.3rem',
                            cursor: 'pointer',
                            lineHeight: 1,
                          }}
                        >✕</button>
                      )}
                    </div>
                  )}
                </div>

                {/* HP + actions on one row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button onClick={() => handleSubUnitHPChange(index, -1)} disabled={isDead} style={smallHPBtn(isDead)}>−</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#a78bfa', fontSize: '0.78rem', fontWeight: '700' }}>{unit.hp}/{unit.maxHp}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${unitHPPct}%`, height: '100%', background: unitHPColor, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <button onClick={() => handleSubUnitHPChange(index, 1)} disabled={unit.hp === unit.maxHp} style={smallHPBtn(unit.hp === unit.maxHp)}>+</button>
                  <button
                    onClick={() => onOpenCalculator(player.id, 'shoot', index === 0 ? 'special' : `soldier${index}`)}
                    disabled={isDead} style={unitActBtn(isDead)}
                  >🎯</button>
                  <button
                    onClick={() => onOpenCalculator(player.id, 'melee', index === 0 ? 'special' : `soldier${index}`)}
                    disabled={isDead} style={unitActBtn(isDead)}
                  >⚔️</button>
                </div>

                {/* Item holding tokens */}
                {(() => {
                  const unitType = index === 0 ? 'special' : `soldier${index}`;
                  const heldItems = (player.inventory || []).filter(it => it.heldBy === unitType);
                  if (heldItems.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                      {heldItems.map((heldItem, hi) => {
                        const tierColor = heldItem.isQuestItem ? '#fde68a' : ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[heldItem.tier] || '#9ca3af');
                        return (
                          <div key={hi} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.15rem 0.45rem',
                            background: `${tierColor}18`,
                            border: `1px solid ${tierColor}50`,
                            borderRadius: '4px',
                          }}>
                            <span style={{ fontSize: '0.7rem' }}>{heldItem.isQuestItem ? '🗝️' : '📦'}</span>
                            <span style={{ color: tierColor, fontSize: '0.62rem', fontWeight: '800' }}>{heldItem.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inventory ── */}
      {(player.firstStrike || (player.inventory?.length > 0)) && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(201,169,97,0.2)',
          borderRadius: '10px',
          overflow: 'hidden',
          marginTop: '0.5rem',
        }}>
          <div style={{
            padding: '0.4rem 0.85rem',
            borderBottom: '1px solid rgba(201,169,97,0.15)',
            color: '#8b7355', fontSize: '0.65rem', fontWeight: '800',
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>🎒 Inventory</div>

          {/* First Strike token */}
          {player.firstStrike && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.85rem',
              padding: '0.6rem 0.85rem',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(161,98,7,0.06))',
              borderLeft: '3px solid #f59e0b',
              borderBottom: (player.inventory?.length > 0) ? '1px solid rgba(201,169,97,0.12)' : 'none',
            }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>First Strike</div>
                <div style={{ color: '#92640a', fontSize: '0.72rem', fontWeight: '600' }}>+2 bonus to next attack vs NPC</div>
              </div>
              <div style={{
                padding: '0.15rem 0.5rem', background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.4)', borderRadius: '5px',
                color: '#f59e0b', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em', flexShrink: 0,
              }}>TOKEN</div>
            </div>
          )}

          {/* Loot items */}
          {(player.inventory || []).map((item, i, arr) => {
            const tierColor = item.isQuestItem ? '#fde68a' : ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af');
            const usesLeft = item.effect?.uses === 0 ? Infinity : (item.effect?.usesRemaining ?? item.effect?.uses ?? 1);
            const canUse = !item.effect || item.effect.type === 'manual' || usesLeft > 0;
            const isAuto = ['heal','maxHP','attackBonus','defenseBonus'].includes(item.effect?.type);
            const isManual = item.effect?.type === 'manual';
            const isDestroyItem = item.effect?.type === 'destroyItem';
            const isKey = item.effect?.type === 'key';
            const showUseButton = !item.isQuestItem && (isAuto || isManual || isDestroyItem);

            const handleUseKey = () => {
              const newInventory = (player.inventory || []).filter((_, idx) => idx !== i);
              onUpdate(player.id, { inventory: newInventory });
            };

            const handleUse = () => {
              if (!canUse) return;
              const ef = item.effect;
              const newUsesRemaining = !ef || ef.uses === 0 ? Infinity : usesLeft - 1;
              const consumed = newUsesRemaining <= 0;
              const newInventory = (player.inventory || [])
                .map((it, idx) => idx !== i ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
                .filter((it, idx) => idx !== i ? true : !consumed);

              if (ef?.type === 'heal') {
                // Open unit picker modal instead of applying directly
                setHealTargetItem({ item, itemIndex: i });
                return; // don't apply yet
              } else if (ef?.type === 'maxHP') {
                // Open unit picker modal
                setMaxHpTargetItem({ item, itemIndex: i });
                return;
              } else if (ef?.type === 'attackBonus' || ef?.type === 'defenseBonus') {
                const bonusKey = ef.type === 'attackBonus' ? 'pendingAttackBonus' : 'pendingDefenseBonus';
                onUpdate(player.id, { [bonusKey]: (player[bonusKey] || 0) + ef.value, inventory: newInventory });
              } else if (ef?.type === 'destroyItem') {
                // Open destroy item modal — DM picks target
                if (onOpenDestroyModal) onOpenDestroyModal(player);
                return;
              } else {
                // Manual or forceReroll — just decrement
                onUpdate(player.id, { inventory: newInventory });
              }
            };

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.85rem',
                borderLeft: `3px solid ${tierColor}`,
                borderBottom: i < arr.length - 1 ? '1px solid rgba(201,169,97,0.1)' : 'none',
                opacity: canUse ? 1 : 0.45,
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: tierColor, fontWeight: '800', fontSize: '0.82rem', marginBottom: '0.1rem' }}>{item.name}</div>
                  {item.description && <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>{item.description}</div>}
                  <div style={{ color: '#4b5563', fontSize: '0.62rem', marginTop: '0.1rem' }}>
                    held by {item.heldBy === 'commander'
                      ? (player.commanderStats?.customName || player.commander || 'Commander')
                      : (() => {
                          if (item.heldBy === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
                          const idx = parseInt((item.heldBy || '').replace('soldier', ''));
                          if (!isNaN(idx)) return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
                          return item.heldBy;
                        })()}
                    {item.effect?.uses !== 0 && usesLeft !== Infinity && ` · ${usesLeft} use${usesLeft !== 1 ? 's' : ''} left`}
                  </div>
                </div>
                {item.isQuestItem && (
                  <span style={{ padding: '0.1rem 0.35rem', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '4px', color: '#fde68a', fontSize: '0.58rem', fontWeight: '800', flexShrink: 0 }}>QUEST</span>
                )}
                <span style={{
                  padding: '0.1rem 0.4rem', background: `${tierColor}18`,
                  border: `1px solid ${tierColor}40`, borderRadius: '4px',
                  color: tierColor, fontSize: '0.6rem', fontWeight: '800',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>{item.tier}</span>
                {showUseButton && (
                  <button onClick={handleUse} disabled={!canUse} style={{
                    padding: '0.25rem 0.6rem',
                    background: canUse ? `${tierColor}22` : 'transparent',
                    border: `1px solid ${canUse ? tierColor + '60' : '#374151'}`,
                    borderRadius: '5px', cursor: canUse ? 'pointer' : 'not-allowed',
                    color: canUse ? tierColor : '#374151',
                    fontSize: '0.65rem', fontWeight: '900', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}>USE</button>
                )}
                {isKey && (
                  <button onClick={handleUseKey} style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(201,169,97,0.12)',
                    border: '1px solid rgba(201,169,97,0.5)',
                    borderRadius: '5px', cursor: 'pointer',
                    color: '#c9a961',
                    fontSize: '0.65rem', fontWeight: '900', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}>🔑 USE</button>
                )}
                {/* Pass item to another unit */}
                {!item.isQuestItem && onOpenHandOff && (
                  <button onClick={() => onOpenHandOff(player, item.heldBy, item)} style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: '5px', cursor: 'pointer',
                    color: '#a5b4fc',
                    fontSize: '0.65rem', fontWeight: '900', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}>🤝 PASS</button>
                )}
                {/* Manual drop — remove item from inventory */}
                {!item.isQuestItem && (
                  <button onClick={() => {
                    if (!window.confirm(`Drop "${item.name}"? It will be removed from inventory.`)) return;
                    onUpdate(player.id, { inventory: (player.inventory || []).filter((_, idx) => idx !== i) });
                  }} style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(127,29,29,0.15)',
                    border: '1px solid rgba(127,29,29,0.4)',
                    borderRadius: '5px', cursor: 'pointer',
                    color: '#fca5a5',
                    fontSize: '0.65rem', fontWeight: '900', flexShrink: 0,
                    fontFamily: 'inherit',
                  }}>🗑 DROP</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Death Loot Drop Modal ── */}
      {deathLootModal && (
        <div onClick={() => setDeathLootModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '3px solid rgba(239,68,68,0.6)', borderRadius: '12px', padding: '1.5rem', width: '360px', maxWidth: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💀</div>
              <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: '"Cinzel",Georgia,serif' }}>{deathLootModal.unitLabel} has fallen!</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>They dropped the following items:</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {deathLootModal.items.map(item => {
                const tc = { Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af';
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: `${tc}12`, border: `1px solid ${tc}35`, borderRadius: '7px' }}>
                    <span>{item.isQuestItem ? '🗝️' : '📦'}</span>
                    <span style={{ color: tc, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{item.name}</span>
                    <span style={{ color: '#4b5563', fontSize: '0.62rem' }}>{item.tier}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => {
              // Remove all dropped items from inventory
              const droppedIds = new Set(deathLootModal.items.map(it => it.id));
              onUpdate(player.id, { inventory: (player.inventory || []).filter(it => !droppedIds.has(it.id)) });
              setDeathLootModal(null);
            }} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg,#b91c1c,#991b1b)', border: '2px solid #dc2626', color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem' }}>
              🗺️ Items Dropped — Remove from Inventory
            </button>
          </div>
        </div>
      )}

      {/* ── Max HP Target Modal ── */}
      {maxHpTargetItem && (() => {
        const { item, itemIndex } = maxHpTargetItem;
        const ef = item.effect;
        const tierColor = { Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af';
        const usesLeft = ef.uses === 0 ? Infinity : (ef.usesRemaining ?? ef.uses ?? 1);
        const newUsesRemaining = ef.uses === 0 ? Infinity : usesLeft - 1;
        const consumed = newUsesRemaining <= 0;

        const applyMaxHPToUnit = (unitKey) => {
          const newInventory = (player.inventory || [])
            .map((it, idx) => idx !== itemIndex ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
            .filter((it, idx) => idx !== itemIndex ? true : !consumed);

          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            onUpdate(player.id, { commanderStats: { ...cs, maxHp: cs.maxHp + ef.value, hp: cs.hp + ef.value }, inventory: newInventory });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            const newSubs = player.subUnits.map((u, si) =>
              si === idx ? { ...u, maxHp: u.maxHp + ef.value, hp: u.hp + ef.value } : u
            );
            onUpdate(player.id, { subUnits: newSubs, inventory: newInventory });
          }
          setMaxHpTargetItem(null);
        };

        const units = [
          {
            key: 'commander',
            label: player.commanderStats?.customName || player.commander || 'Commander',
            icon: '⚔️',
            hp: player.commanderStats.hp,
            maxHp: player.commanderStats.maxHp,
            isDead: player.commanderStats.hp === 0,
          },
          ...player.subUnits.map((u, idx) => ({
            key: idx === 0 ? 'special' : `soldier${idx}`,
            label: u.name?.trim() ? u.name : (idx === 0 ? 'Special' : `Soldier ${idx}`),
            icon: idx === 0 ? '⭐' : '🛡️',
            hp: u.hp,
            maxHp: u.maxHp,
            isDead: u.hp === 0,
          })),
        ];

        return (
          <div
            onClick={() => setMaxHpTargetItem(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: `3px solid ${tierColor}`,
              borderRadius: '12px', padding: '1.5rem',
              width: '360px', maxWidth: '95%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>❤️</div>
                <div style={{ color: tierColor, fontWeight: '900', fontSize: '1rem', fontFamily: '"Cinzel", Georgia, serif' }}>
                  {item.name}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Increases max HP by <span style={{ color: '#fca5a5', fontWeight: '800' }}>+{ef.value}</span> — choose a unit
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {units.map(u => {
                  const hpPct = u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0;
                  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                  const disabled = u.isDead;
                  return (
                    <div
                      key={u.key}
                      onClick={() => !disabled && applyMaxHPToUnit(u.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        background: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)',
                        border: `2px solid ${disabled ? '#374151' : 'rgba(90,74,58,0.5)'}`,
                        borderRadius: '8px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.35 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{u.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: disabled ? '#4b5563' : '#e8dcc4', fontWeight: '700', fontSize: '0.85rem' }}>
                          {u.label}
                          {disabled && (
                            <span style={{ color: '#7f1d1d', fontSize: '0.65rem', fontWeight: '800', marginLeft: '0.4rem' }}>DEAD</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>
                            {u.hp}/{u.maxHp}
                          </span>
                        </div>
                      </div>
                      {!disabled && (
                        <span style={{ color: '#fca5a5', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>
                          →{u.maxHp + ef.value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setMaxHpTargetItem(null)} style={{
                width: '100%', padding: '0.65rem',
                background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
                color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: '800', fontSize: '0.875rem',
              }}>✕ Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* ── Heal Target Modal ── */}
      {healTargetItem && (() => {
        const { item, itemIndex } = healTargetItem;
        const ef = item.effect;
        const tierColor = { Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af';
        const usesLeft = ef.uses === 0 ? Infinity : (ef.usesRemaining ?? ef.uses ?? 1);
        const newUsesRemaining = ef.uses === 0 ? Infinity : usesLeft - 1;
        const consumed = newUsesRemaining <= 0;

        const applyHealToUnit = (unitKey) => {
          const newInventory = (player.inventory || [])
            .map((it, idx) => idx !== itemIndex ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
            .filter((it, idx) => idx !== itemIndex ? true : !consumed);

          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            const healed = Math.min(cs.maxHp - cs.hp, ef.value);
            onUpdate(player.id, { commanderStats: { ...cs, hp: cs.hp + healed }, inventory: newInventory });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            const newSubs = player.subUnits.map((u, si) =>
              si === idx ? { ...u, hp: Math.min(u.maxHp, u.hp + ef.value) } : u
            );
            onUpdate(player.id, { subUnits: newSubs, inventory: newInventory });
          }
          setHealTargetItem(null);
        };

        // Build unit list: commander + all subunits
        const units = [
          {
            key: 'commander',
            label: player.commanderStats?.customName || player.commander || 'Commander',
            icon: '⚔️',
            hp: player.commanderStats.hp,
            maxHp: player.commanderStats.maxHp,
            isDead: player.commanderStats.hp === 0,
          },
          ...player.subUnits.map((u, idx) => ({
            key: idx === 0 ? 'special' : `soldier${idx}`,
            label: u.name?.trim() ? u.name : (idx === 0 ? 'Special' : `Soldier ${idx}`),
            icon: idx === 0 ? '⭐' : '🛡️',
            hp: u.hp,
            maxHp: u.maxHp,
            isDead: u.hp === 0,
          })),
        ];

        return (
          <div
            onClick={() => setHealTargetItem(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: `3px solid ${tierColor}`,
              borderRadius: '12px', padding: '1.5rem',
              width: '360px', maxWidth: '95%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>💚</div>
                <div style={{ color: tierColor, fontWeight: '900', fontSize: '1rem', fontFamily: '"Cinzel", Georgia, serif' }}>
                  {item.name}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Heals <span style={{ color: '#86efac', fontWeight: '800' }}>+{ef.value} HP</span> — choose a unit
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {units.map(u => {
                  const hpPct = u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0;
                  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                  const isFull = u.hp === u.maxHp;
                  const disabled = u.isDead;
                  return (
                    <div
                      key={u.key}
                      onClick={() => !disabled && applyHealToUnit(u.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        background: disabled ? 'rgba(0,0,0,0.2)' : isFull ? 'rgba(34,197,94,0.05)' : 'rgba(0,0,0,0.35)',
                        border: `2px solid ${disabled ? '#374151' : isFull ? 'rgba(34,197,94,0.25)' : 'rgba(90,74,58,0.5)'}`,
                        borderRadius: '8px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.35 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{u.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: disabled ? '#4b5563' : '#e8dcc4', fontWeight: '700', fontSize: '0.85rem' }}>
                          {u.label}
                          {isFull && !disabled && (
                            <span style={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: '800', marginLeft: '0.4rem' }}>FULL</span>
                          )}
                          {disabled && (
                            <span style={{ color: '#7f1d1d', fontSize: '0.65rem', fontWeight: '800', marginLeft: '0.4rem' }}>DEAD</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>
                            {u.hp}/{u.maxHp}
                          </span>
                        </div>
                      </div>
                      {!disabled && (
                        <span style={{
                          color: '#86efac', fontSize: '0.72rem', fontWeight: '800',
                          flexShrink: 0, opacity: isFull ? 0.4 : 1,
                        }}>+{Math.min(u.maxHp - u.hp, ef.value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setHealTargetItem(null)} style={{
                width: '100%', padding: '0.65rem',
                background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
                color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: '800', fontSize: '0.875rem',
              }}>✕ Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* ── Commander Revive Modal ── */}
      {showReviveModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowReviveModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
            border: '3px solid #d4af37', borderRadius: '12px', padding: '2rem',
            maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          }}>
            <h3 style={{ color: '#d4af37', fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif' }}>
              🎲 Revive Roll
            </h3>
            <p style={{ color: '#e8dcc4', textAlign: 'center', marginBottom: '2rem', fontSize: '1rem' }}>
              Was the revive roll successful?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0 1.5rem', justifyItems: 'center' }}>
              <button
                onClick={() => { onUseRevive(player.id, true); setShowReviveModal(false); }}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #059669, #047857)', border: '2px solid #10b981', color: '#d1fae5', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >✓ Successful</button>
              <button
                onClick={() => { onUseRevive(player.id, false); setShowReviveModal(false); }}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #b91c1c, #991b1b)', border: '2px solid #dc2626', color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
              >✗ Unsuccessful</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Shared micro-styles ───────────────────────────────────────────────────────

const Badge = ({ color, text, dim }) => (
  <div style={{
    padding: '0.2rem 0.6rem',
    background: dim ? `rgba(${color === '#16a34a' ? '22,163,74' : '59,130,246'},0.2)` : `linear-gradient(to bottom, ${color}, ${color}cc)`,
    border: `${dim ? '1px' : '2px'} solid ${color}`,
    borderRadius: '6px',
    color: dim ? '#86efac' : '#dbeafe',
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }}>{text}</div>
);

const rmBtn = {
  background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
  border: '1px solid #dc2626', color: '#fecaca',
  padding: '0.35rem 0.6rem', borderRadius: '6px',
  cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0,
};

const selectStyle = {
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '8px', padding: '0.5rem 0.65rem', color: '#e8dcc4',
  fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: '600',
};

const hpBtn = (disabled) => ({
  background: disabled ? 'rgba(0,0,0,0.2)' : 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
  border: '2px solid', borderColor: disabled ? '#374151' : 'rgba(245,158,11,0.5)',
  color: disabled ? '#374151' : '#fbbf24',
  padding: '0.5rem 1rem', borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', fontWeight: '800', fontSize: '1.1rem', flexShrink: 0,
});

const actionBtn = (disabled) => ({
  background: disabled ? 'linear-gradient(135deg, #374151, #1f2937)' : 'linear-gradient(135deg, #1e40af, #1e3a8a)',
  border: '2px solid', borderColor: disabled ? '#4b5563' : '#3b82f6',
  color: disabled ? '#6b7280' : '#dbeafe',
  padding: '0.65rem 0.5rem', borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', fontWeight: '700', fontSize: '0.82rem',
  letterSpacing: '0.04em', textTransform: 'uppercase',
  opacity: disabled ? 0.5 : 1,
});

const smallHPBtn = (disabled) => ({
  background: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(139,92,246,0.2)',
  border: '2px solid', borderColor: disabled ? '#374151' : 'rgba(139,92,246,0.5)',
  color: disabled ? '#374151' : '#c4b5fd',
  width: '34px', height: '34px', borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: '800', fontSize: '1.1rem', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});

const unitActBtn = (disabled) => ({
  background: disabled ? 'rgba(0,0,0,0.2)' : 'linear-gradient(135deg, #1e40af, #1e3a8a)',
  border: '1px solid', borderColor: disabled ? '#374151' : '#3b82f6',
  color: disabled ? '#4b5563' : '#dbeafe',
  width: '34px', height: '34px', borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});

export default PlayerCard;