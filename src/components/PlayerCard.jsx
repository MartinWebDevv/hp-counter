import React from 'react';
import { FACTIONS } from '../data/factions';
import { getUnitName } from '../utils/statsUtils';
import { getSlotCount, getHeldCount } from './lootUtils';
import {
  colors, surfaces, borders, fonts, text, btn, hpBarColor,
  cardShell, insetSection, pill, inputStyle, selectStyle, tierColors,
} from '../theme';

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
  onUseItemOnEnemy,
  onNullifyLastEffect,
  onTrackLastItem,
  onUseGlobalItem,
}) => {
  const [showSquad, setShowSquad] = React.useState(true);
  const [showSetup, setShowSetup] = React.useState(false);
  const [showReviveModal, setShowReviveModal] = React.useState(false);
  const [healTargetItem, setHealTargetItem] = React.useState(null);
  const [maxHpTargetItem, setMaxHpTargetItem] = React.useState(null);
  const [extraSlotItem, setExtraSlotItem] = React.useState(null);
  const [cleanseItem, setCleanseItem] = React.useState(null);       // { item, itemIndex, fullCleanse }
  const [resurrectItem, setResurrectItem] = React.useState(null);   // { item, itemIndex }
  const [shieldWallItem, setShieldWallItem] = React.useState(null); // { item, itemIndex }

  const reviveQueue = player.reviveQueue || [];
  const [deathLootModal, setDeathLootModal] = React.useState(null);
  const [maxHpEditModal, setMaxHpEditModal] = React.useState(null); // { unitKey: 'commander'|'special'|'soldier1'... }
  const [maxHpEditValue, setMaxHpEditValue] = React.useState('');
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
        isDead: justDied ? true : (newHP > 0 ? false : player.commanderStats.isDead),
      },
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
    const newSubUnits = player.subUnits.map((u, i) => i === unitIndex ? { ...u, hp: 1 } : u);
    onUpdate(player.id, { reviveQueue: newQueue, subUnits: newSubUnits });
  };

  const cmdHP    = player.commanderStats.hp;
  const cmdMaxHP = player.commanderStats.maxHp;
  const cmdHPPct = cmdMaxHP > 0 ? (cmdHP / cmdMaxHP) * 100 : 0;
  const cmdDead  = cmdHP === 0;
  const revives  = player.commanderStats.revives || 0;
  const cooldown = player.commanderStats.cooldownRounds || 0;
  const pColor   = player.playerColor || colors.blue;

  return (
    <div style={{ ...cardShell(isCurrentTurn, pColor, hasActedThisRound), opacity: player.isAbsent ? 0.45 : 1, filter: player.isAbsent ? 'grayscale(0.7)' : 'none', pointerEvents: player.isAbsent ? 'none' : 'auto', position: 'relative' }}>

      {/* Absent overlay badge */}
      {player.isAbsent && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(107,114,128,0.9)', border: '1px solid rgba(107,114,128,0.5)', borderRadius: '6px', padding: '0.2rem 0.55rem', color: '#d1d5db', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 10 }}>
          😴 Absent
        </div>
      )}

      {/* Manual badge — GM controlled, fully interactive */}
      {player.isManual && !player.isAbsent && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '6px', padding: '0.2rem 0.55rem', color: '#fbbf24', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 10 }}>
          🎮 Manual
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        marginBottom: '0.75rem', paddingBottom: '0.65rem',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <input
          type="color"
          value={pColor}
          onChange={(e) => onUpdate(player.id, { playerColor: e.target.value })}
          style={{ width: '26px', height: '26px', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          type="text"
          value={player.playerName}
          onChange={handlePlayerNameChange}
          style={{ ...inputStyle, flex: 1, color: pColor, borderColor: `${pColor}50` }}
          placeholder="Player Name"
        />
        {isCurrentTurn && <StatusBadge color={pColor} text="YOUR TURN" />}
        {!isCurrentTurn && hasActedThisRound && <StatusBadge color={colors.green} text="✓ ACTED" dim />}
        <button
          onClick={() => setShowSetup(s => !s)}
          title="Faction & Commander setup"
          style={{
            ...btn.icon(showSetup ? colors.purpleLight : colors.textFaint),
            border: `1px solid ${showSetup ? colors.purpleBorder : 'rgba(255,255,255,0.06)'}`,
            background: showSetup ? colors.purpleSubtle : 'rgba(0,0,0,0.3)',
          }}
        >⚙️</button>
        <button onClick={() => onRemove(player.id)} style={btn.icon('#fca5a5')} title="Remove">✕</button>
      </div>

      {/* ── Setup: Faction + Commander ── */}
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
        ...insetSection(cmdDead ? 'dead' : 'default'),
        marginBottom: '0.6rem',
        opacity: cmdDead ? 0.72 : 1,
      }}>
        {/* Commander name + cooldown row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={player.commanderStats.customName || player.commander}
            onChange={(e) => onUpdate(player.id, { commanderStats: { ...player.commanderStats, customName: e.target.value } })}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: fonts.display, fontWeight: '800', fontSize: '0.9rem',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: colors.gold, minWidth: '80px',
            }}
            placeholder={player.commander}
          />
          <div style={{
            padding: '0.18rem 0.55rem',
            background: cooldown > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${cooldown > 0 ? colors.redBorder : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '20px',
            color: cooldown > 0 ? '#fca5a5' : colors.textFaint,
            fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.05em',
          }}>
            {cooldown > 0 ? `🔴 CD:${cooldown}` : '⭕ Ready'}
          </div>
        </div>

        {/* HP bar + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={() => handleCommanderHPChange(-1)} disabled={cmdDead} style={btn.hp(cmdDead)}>−</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span onClick={() => { setMaxHpEditModal({ unitKey: 'commander' }); setMaxHpEditValue(String(cmdMaxHP)); }} style={{ color: colors.amber, fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }} title="Click to set max HP">{cmdHP} / {cmdMaxHP} HP</span>
              {/* Revive pips */}
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {[...Array(2)].map((_, i) => (
                  <div key={i} style={{
                    width: '11px', height: '11px', borderRadius: '50%',
                    border: `2px solid ${i < revives ? colors.blue : colors.textDisabled}`,
                    background: i < revives ? `radial-gradient(circle, ${colors.blue}, #1e3a8a)` : '#0a0a0a',
                    boxShadow: i < revives ? `0 0 5px ${colors.blue}70` : 'none',
                  }} />
                ))}
                <button
                  onClick={() => setShowReviveModal(true)}
                  disabled={cmdHP > 0 || revives === 0}
                  style={{
                    ...btn.icon(revives > 0 && cmdDead ? colors.blueLight : colors.textDisabled),
                    width: '22px', height: '22px', fontSize: '0.65rem',
                    background: revives > 0 && cmdDead ? colors.blueSubtle : 'transparent',
                    border: `1px solid ${revives > 0 && cmdDead ? colors.blueBorder : colors.textDisabled}`,
                    cursor: revives > 0 && cmdDead ? 'pointer' : 'not-allowed',
                  }}
                >⟲</button>
              </div>
            </div>
            <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${cmdHPPct}%`, height: '100%', background: hpBarColor(cmdHPPct), transition: 'width 0.3s ease', borderRadius: '3px' }} />
            </div>
          </div>
          <button onClick={() => handleCommanderHPChange(1)} disabled={cmdHP === cmdMaxHP} style={btn.hp(cmdHP === cmdMaxHP)}>+</button>
        </div>

        {/* Status effects */}
        {(player.commanderStats.statusEffects || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.35rem' }}>
            {(player.commanderStats.statusEffects || []).map((effect, ei) => {
              const dur = effect.permanent ? '∞' : `${effect.duration}r`;
              const label = effect.type === 'poison' ? `🤢 Poison ${effect.value}hp×${dur}`
                : effect.type === 'stun'          ? `💫 Stun ${dur}`
                : effect.type === 'attackBuff'    ? `⚔️↑ +${effect.value} Atk ${dur}`
                : effect.type === 'defenseBuff'   ? `🛡️↑ +${effect.value} Def ${dur}`
                : effect.type === 'attackDebuff'  ? `⚔️↓ -${effect.value} Atk ${dur}`
                : effect.type === 'defenseDebuff' ? `🛡️↓ -${effect.value} Def ${dur}`
                : effect.type === 'shieldWall'    ? `🛡️ Shield Wall ${dur}`
                : effect.type === 'counterStrike' ? `⚡ Counter Strike ${dur}`
                : effect.type === 'marked'        ? `🎯 Marked ${dur}`
                : `⚡ ${effect.type}`;
              const c = effect.type === 'poison' ? { color: colors.greenLight, bg: colors.greenSubtle, border: colors.greenBorder }
                : effect.type === 'stun' ? { color: colors.amber, bg: colors.amberSubtle, border: colors.amberBorder }
                : effect.type === 'shieldWall' ? { color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.4)' }
                : effect.type === 'counterStrike' ? { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.4)' }
                : effect.type === 'marked' ? { color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.5)' }
                : effect.type.includes('Buff')   ? { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.4)' }
                : { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)' };
              return (
                <span key={ei} onClick={() => {
                  const newStats = { ...player.commanderStats, statusEffects: (player.commanderStats.statusEffects || []).filter((_, i) => i !== ei) };
                  onUpdate(player.id, { commanderStats: newStats });
                }} style={{ ...pill(c.color, c.bg, c.border), cursor: 'pointer', fontSize: '0.62rem' }}>
                  {label} ✕
                </span>
              );
            })}
          </div>
        )}

        {/* Commander slot indicator + held items */}
        {(() => {
          const heldItems = (player.inventory || []).filter(it => it.heldBy === 'commander');
          const slotCount = getSlotCount(player, 'commander');
          const heldCount = getHeldCount(player, 'commander');
          return (
            <div style={{ marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.02em', flexShrink: 0 }}>
                  🎒 {heldCount}/{slotCount}
                </span>
                {heldItems.map((item, hi) => {
                const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                return (
                  <div key={hi} style={{ ...pill(tc.text, tc.bg, tc.border) }}>
                    <span style={{ marginRight: '0.2rem', fontSize: '0.7rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                    {item.name}
                  </div>
                );
                })}
              </div>
            </div>
          );
        })()}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {[
            { label: '🎯 Shoot',   action: 'shoot'   },
            { label: '⚔️ Melee',   action: 'melee'   },
            { label: '⚡ Special', action: 'special', disabled: cooldown > 0 },
          ].map(({ label, action, disabled: extra }) => {
            const dis = cmdDead || extra;
            return (
              <button key={action} onClick={() => onOpenCalculator(player.id, action, 'commander')} disabled={dis} style={btn.primary(dis)}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Squad header ── */}
      <div
        onClick={() => setShowSquad(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${colors.purpleBorder}`,
          borderRadius: showSquad ? '8px 8px 0 0' : '8px',
          cursor: 'pointer', userSelect: 'none',
          marginBottom: showSquad ? 0 : '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: colors.textFaint, fontSize: '0.7rem', transition: 'transform 0.15s', display: 'inline-block', transform: showSquad ? 'rotate(90deg)' : 'none' }}>▶</span>
          <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Squad</span>
          <span style={{ color: aliveUnits === 0 ? colors.red : colors.textMuted, fontSize: '0.75rem', fontWeight: '600' }}>
            {aliveUnits}/{totalUnits} alive
          </span>
          {reviveQueue.length > 0 && (
            <span style={pill(colors.amber, colors.amberSubtle, colors.amberBorder)}>
              ⚕️ {reviveQueue.length} queue
            </span>
          )}
        </div>
        {reviveQueue.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSquadRevive(player.id); }}
            style={{
              padding: '0.22rem 0.6rem',
              background: 'linear-gradient(135deg, #92400e, #78350f)',
              border: `1px solid ${colors.amber}`,
              color: '#fde68a', borderRadius: '6px', cursor: 'pointer',
              fontFamily: fonts.body, fontWeight: '800', fontSize: '0.7rem',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >⚕️ Revive</button>
        )}
      </div>

      {/* ── Squad units ── */}
      {showSquad && (
        <div style={{
          border: `1px solid ${colors.purpleBorder}`,
          borderTop: 'none', borderRadius: '0 0 8px 8px',
          overflow: 'hidden', marginBottom: '0.6rem',
        }}>
          <div style={{
            maxHeight: 'calc(3 * 120px)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
          {player.subUnits.map((unit, index) => {
            const isDead = unit.hp === 0;
            const queuePos = getQueuePosition(index);
            const isInQueue = queuePos > 0;
            const livesRemaining = unit.livesRemaining ?? unit.revives ?? 0;
            const isPermaDead = isDead && livesRemaining === 0;
            const unitHPPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;

            return (
              <div key={index} style={{
                padding: '0.6rem 0.75rem',
                background: isPermaDead ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)',
                borderBottom: index < player.subUnits.length - 1 ? `1px solid ${colors.purpleBorder}` : 'none',
                opacity: isPermaDead ? 0.3 : isDead ? 0.55 : 1,
                filter: isPermaDead ? 'grayscale(1)' : 'none',
                transition: 'all 0.3s',
              }}>
                {/* Unit top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                  <input
                    type="text"
                    value={unit.name}
                    onChange={(e) => handleSubUnitNameChange(index, e.target.value)}
                    placeholder={index === 0 ? '⭐ Special' : `🛡️ Soldier ${index}`}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${colors.purpleBorder}`, borderRadius: '5px',
                      padding: '0.28rem 0.5rem', color: colors.purpleLight,
                      fontFamily: fonts.body, fontSize: '0.8rem', fontWeight: '600',
                      outline: 'none',
                    }}
                  />
                  {/* Uncivilized subtype dropdown */}
                  {player.faction === 'Uncivilized' && (
                    <select
                      value={unit.unitSubType || 'caveman'}
                      onChange={e => {
                        const newSubs = player.subUnits.map((u, si) =>
                          si === index ? { ...u, unitSubType: e.target.value } : u
                        );
                        onUpdate(player.id, { subUnits: newSubs });
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${unit.unitSubType === 'dinosaur' ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
                        borderRadius: '5px', padding: '0.2rem 0.3rem',
                        color: unit.unitSubType === 'dinosaur' ? '#6ee7b7' : '#fbbf24',
                        fontFamily: fonts.body, fontSize: '0.65rem', fontWeight: '800',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <option value="caveman">🪨</option>
                      <option value="dinosaur">🦕</option>
                    </select>
                  )}
                  {/* Lives pips */}
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} style={{
                        width: '9px', height: '9px', borderRadius: '50%',
                        border: `2px solid ${i < livesRemaining ? '#eab308' : colors.textDisabled}`,
                        background: i < livesRemaining ? 'radial-gradient(circle, #eab308, #92400e)' : '#0a0a0a',
                        boxShadow: i < livesRemaining ? '0 0 4px #eab30870' : 'none',
                      }} />
                    ))}
                  </div>
                  {/* Immune badge */}
                  {!isDead && unit.revivedOnPlayerId && (
                    <span onClick={e => {
                      e.stopPropagation();
                      const newSubs = player.subUnits.map((u, si) => si === index ? { ...u, revivedOnPlayerId: null } : u);
                      onUpdate(player.id, { subUnits: newSubs });
                    }} style={{ ...pill('#67e8f9', 'rgba(6,182,212,0.1)', 'rgba(6,182,212,0.35)'), cursor: 'pointer', fontSize: '0.6rem' }}>
                      🛡️ IMMUNE ✕
                    </span>
                  )}
                  {/* Status effects */}
                  {!isDead && (unit.statusEffects || []).map((effect, ei) => {
                    const dur = effect.permanent ? '∞' : `${effect.duration}r`;
                    const label = effect.type === 'poison' ? `🤢 ${effect.value}×${dur}`
                      : effect.type === 'stun'          ? `💫 ${dur}`
                      : effect.type === 'attackBuff'    ? `⚔️↑+${effect.value} ${dur}`
                      : effect.type === 'defenseBuff'   ? `🛡️↑+${effect.value} ${dur}`
                      : effect.type === 'attackDebuff'  ? `⚔️↓-${effect.value} ${dur}`
                      : effect.type === 'defenseDebuff' ? `🛡️↓-${effect.value} ${dur}`
                      : effect.type === 'shieldWall'    ? `🛡️ Shield ${dur}`
                      : effect.type === 'counterStrike' ? `⚡ Counter ${dur}`
                      : effect.type === 'marked'        ? `🎯 Marked ${dur}`
                      : `⚡`;
                    const c = effect.type === 'poison' ? { color: colors.greenLight, bg: colors.greenSubtle, border: colors.greenBorder }
                      : effect.type === 'stun' ? { color: colors.amber, bg: colors.amberSubtle, border: colors.amberBorder }
                      : effect.type === 'shieldWall' ? { color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.4)' }
                      : effect.type === 'counterStrike' ? { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.4)' }
                      : effect.type === 'marked' ? { color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.5)' }
                      : effect.type.includes('Buff')   ? { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.4)' }
                      : { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)' };
                    return (
                      <span key={ei} onClick={e => {
                        e.stopPropagation();
                        const newSubs = player.subUnits.map((u, si) => si === index ? { ...u, statusEffects: (u.statusEffects || []).filter((_, i) => i !== ei) } : u);
                        onUpdate(player.id, { subUnits: newSubs });
                      }} style={{ ...pill(c.color, c.bg, c.border), cursor: 'pointer', fontSize: '0.6rem' }}>
                        {label} ✕
                      </span>
                    );
                  })}
                  {/* Dead badge */}
                  {isDead && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={pill(
                        isInQueue ? colors.amber : '#7f1d1d',
                        isInQueue ? colors.amberSubtle : 'rgba(127,29,29,0.15)',
                        isInQueue ? colors.amberBorder : '#450a0a',
                      )}>
                        {isInQueue ? `💀 #${queuePos}` : '💀 GONE'}
                      </span>
                      {isInQueue && (
                        <button onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                          style={{ ...btn.danger(), padding: '0.1rem 0.3rem', fontSize: '0.58rem' }}>✕</button>
                      )}
                    </div>
                  )}
                </div>

                {/* HP + action row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button onClick={() => handleSubUnitHPChange(index, -1)} disabled={isDead} style={btn.hpSmall(isDead)}>−</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.18rem' }}>
                      <span onClick={() => { const uk = index === 0 ? 'special' : `soldier${index}`; setMaxHpEditModal({ unitKey: uk, index }); setMaxHpEditValue(String(unit.maxHp)); }} style={{ color: colors.purpleLight, fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }} title="Click to set max HP">{unit.hp}/{unit.maxHp}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${unitHPPct}%`, height: '100%', background: hpBarColor(unitHPPct), transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <button onClick={() => handleSubUnitHPChange(index, 1)} disabled={unit.hp === unit.maxHp} style={btn.hpSmall(unit.hp === unit.maxHp)}>+</button>
                  <button onClick={() => onOpenCalculator(player.id, 'shoot', index === 0 ? 'special' : `soldier${index}`)} disabled={isDead}
                    style={{ ...btn.hpSmall(isDead), background: isDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${isDead ? colors.textDisabled : colors.blueBorder}`, color: isDead ? colors.textDisabled : colors.blueLight }}>
                    🎯
                  </button>
                  <button onClick={() => onOpenCalculator(player.id, 'melee', index === 0 ? 'special' : `soldier${index}`)} disabled={isDead}
                    style={{ ...btn.hpSmall(isDead), background: isDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${isDead ? colors.textDisabled : colors.blueBorder}`, color: isDead ? colors.textDisabled : colors.blueLight }}>
                    ⚔️
                  </button>
                </div>

                {/* Unit slot indicator + held items */}
                {(() => {
                  const unitType = index === 0 ? 'special' : `soldier${index}`;
                  const heldItems = (player.inventory || []).filter(it => it.heldBy === unitType);
                  const slotCount = getSlotCount(player, unitType);
                  const heldCount = getHeldCount(player, unitType);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.02em', flexShrink: 0 }}>
                        🎒 {heldCount}/{slotCount}
                      </span>
                      {heldItems.map((item, hi) => {
                        const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                        return (
                          <div key={hi} style={pill(tc.text, tc.bg, tc.border)}>
                            <span style={{ marginRight: '0.2rem', fontSize: '0.68rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                            {item.name}
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
        </div>
      )}

      {/* ── Inventory ── */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        border: borders.warm,
        borderRadius: '10px',
        overflow: 'hidden',
        marginTop: '0.5rem',
      }}>
          <div style={{
            padding: '0.35rem 0.85rem',
            borderBottom: `1px solid rgba(201,169,97,0.1)`,
            ...text.sectionLabel,
          }}>🎒 Inventory</div>

          {/* First Strike */}
          {player.firstStrike && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.55rem 0.85rem',
              background: colors.amberSubtle,
              borderLeft: `3px solid ${colors.amber}`,
              borderBottom: player.inventory?.length > 0 ? `1px solid rgba(201,169,97,0.1)` : 'none',
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: colors.amber, fontWeight: '900', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>First Strike</div>
                <div style={{ color: '#92640a', fontSize: '0.68rem', fontWeight: '600' }}>+2 bonus to next attack vs NPC</div>
              </div>
              <span style={pill(colors.amber, colors.amberSubtle, colors.amberBorder)}>TOKEN</span>
            </div>
          )}

          {/* Loot items */}
          <div style={{ maxHeight: 'calc(3 * 72px)', overflowY: 'auto', overflowX: 'hidden' }}>
          {(() => {
            const items = player.inventory || [];
            const emptySlots = Math.max(0, 3 - items.length);
            return [...Array(emptySlots)].map((_, ei) => (
              <div key={`empty-${ei}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.55rem 0.85rem', height: '72px', boxSizing: 'border-box',
                borderBottom: ei < emptySlots - 1 || items.length > 0 ? `1px solid rgba(201,169,97,0.05)` : 'none',
                opacity: 0.25,
              }}>
                <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>📦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.textFaint, fontWeight: '600', fontSize: '0.75rem', fontStyle: 'italic' }}>Empty slot</div>
                </div>
              </div>
            ));
          })()}
          {(player.inventory || []).map((item, i, arr) => {
            const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
            const usesLeft = item.effect?.uses === 0 ? Infinity : (item.effect?.usesRemaining ?? item.effect?.uses ?? 1);
            const canUse = !item.effect || item.effect.type === 'manual' || usesLeft > 0;
            const isAuto = ['heal', 'maxHP', 'attackBonus', 'defenseBonus'].includes(item.effect?.type);
            const isManual = item.effect?.type === 'manual';
            const isDestroyItem = item.effect?.type === 'destroyItem';
            const isKey = item.effect?.type === 'key';
            const isExtraSlot = item.effect?.type === 'extraSlot';
            const isSelfTarget = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'].includes(item.effect?.type);
            const isEnemyTarget = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'].includes(item.effect?.type);
            const isGlobal = ['npcPlague','playerPlague','crownsFavor','nullify','mirror'].includes(item.effect?.type);
            const showUseButton = !item.isQuestItem && (isAuto || isManual || isDestroyItem || isExtraSlot || isSelfTarget || isEnemyTarget || isGlobal);

            const handleUseKey = () => {
              onUpdate(player.id, { inventory: (player.inventory || []).filter((_, idx) => idx !== i) });
            };

            const handleUse = () => {
              if (!canUse) return;
              const ef = item.effect;
              const newUsesRemaining = !ef || ef.uses === 0 ? Infinity : usesLeft - 1;
              const consumed = newUsesRemaining <= 0;
              const newInventory = (player.inventory || [])
                .map((it, idx) => idx !== i ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
                .filter((it, idx) => idx !== i ? true : !consumed);

              if (ef?.type === 'heal') { setHealTargetItem({ item, itemIndex: i }); return; }
              if (ef?.type === 'maxHP') { setMaxHpTargetItem({ item, itemIndex: i }); return; }
              if (ef?.type === 'attackBonus' || ef?.type === 'defenseBonus') {
                const bonusKey = ef.type === 'attackBonus' ? 'pendingAttackBonus' : 'pendingDefenseBonus';
                onUpdate(player.id, { [bonusKey]: (player[bonusKey] || 0) + ef.value, inventory: newInventory });
              } else if (ef?.type === 'extraSlot') {
                setExtraSlotItem({ item, itemIndex: i });
                return;
              } else if (ef?.type === 'cleanse' || ef?.type === 'fullCleanse') {
                setCleanseItem({ item, itemIndex: i, fullCleanse: ef.type === 'fullCleanse' });
                return;
              } else if (ef?.type === 'resurrect') {
                setResurrectItem({ item, itemIndex: i });
                return;
              } else if (ef?.type === 'shieldWall' || ef?.type === 'counterStrike') {
                if (onTrackLastItem) onTrackLastItem(player, item);
                setShieldWallItem({ item, itemIndex: i });
                return;
              } else if (ef?.type === 'poisonVial' || ef?.type === 'stunGrenade' || ef?.type === 'attackDebuffItem' || ef?.type === 'defenseDebuffItem' || ef?.type === 'marked') {
                if (onTrackLastItem) onTrackLastItem(player, item);
                if (onUseItemOnEnemy) { onUseItemOnEnemy(player, item, i); return; }
              } else if (ef?.type === 'nullify') {
                if (onNullifyLastEffect) { onNullifyLastEffect(player.id); }
                const newInventory = (player.inventory || []).filter((_, idx) => idx !== i);
                onUpdate(player.id, { inventory: newInventory });
                return;
              } else if (ef?.type === 'npcPlague' || ef?.type === 'playerPlague' || ef?.type === 'crownsFavor' || ef?.type === 'mirror') {
                if (onUseGlobalItem) { onUseGlobalItem(player, item, i); return; }
              } else if (ef?.type === 'destroyItem') {
                if (onOpenDestroyModal) onOpenDestroyModal(player);
                return;
              } else {
                onUpdate(player.id, { inventory: newInventory });
              }
            };

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.55rem 0.85rem',
                borderLeft: `3px solid ${tc.text}`,
                borderBottom: i < arr.length - 1 ? `1px solid rgba(201,169,97,0.08)` : 'none',
                opacity: canUse ? 1 : 0.4,
              }}>
                <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: tc.text, fontWeight: '800', fontSize: '0.82rem', marginBottom: '0.08rem' }}>{item.name}</div>
                  {item.description && (
                    <div style={{ color: colors.textMuted, fontSize: '0.65rem', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '0.06rem' }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ color: colors.textFaint, fontSize: '0.6rem', marginTop: '0.08rem' }}>
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
                {item.isQuestItem && <span style={pill('#fde68a', 'rgba(234,179,8,0.1)', 'rgba(234,179,8,0.35)')}>QUEST</span>}
                <span style={pill(tc.text, tc.subtle || tc.bg, tc.border)}>{item.isQuestItem ? 'Quest' : item.tier}</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {showUseButton && (
                    <button onClick={handleUse} disabled={!canUse} style={{ ...pill(canUse ? tc.text : colors.textDisabled, canUse ? (tc.subtle || tc.bg) : 'rgba(0,0,0,0.2)', canUse ? tc.border : 'rgba(90,74,58,0.2)'), cursor: canUse ? 'pointer' : 'not-allowed', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body, border: `1px solid ${canUse ? tc.border : 'rgba(90,74,58,0.2)'}` }}>✦ USE</button>
                  )}
                  {isKey && (
                    <button onClick={handleUseKey} style={{ ...pill(colors.amber, colors.amberSubtle, colors.amberBorder), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🔑 USE</button>
                  )}
                  {!item.isQuestItem && onOpenHandOff && (
                    <button onClick={() => onOpenHandOff(player, item.heldBy, item)} style={{ ...pill(colors.textMuted, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.35)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🤝 PASS</button>
                  )}
                  {!item.isQuestItem && (
                    <button onClick={() => {
                      if (!window.confirm(`Drop "${item.name}"?`)) return;
                      onUpdate(player.id, { inventory: (player.inventory || []).filter((_, idx) => idx !== i) });
                    }} style={{ ...pill('#f87171', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🗑</button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

      {/* ── Max HP Edit Modal ── */}
      {maxHpEditModal && (() => {
        const isCommander = maxHpEditModal.unitKey === 'commander';
        const applyMaxHpEdit = () => {
          const val = parseInt(maxHpEditValue);
          if (!val || val < 1) return;
          if (isCommander) {
            const cs = player.commanderStats;
            const newHp = Math.min(cs.hp, val);
            onUpdate(player.id, { commanderStats: { ...cs, maxHp: val, baseMaxHp: val, hp: newHp } });
          } else {
            const idx = maxHpEditModal.index;
            onUpdate(player.id, { subUnits: (player.subUnits || []).map((u, si) => {
              if (si !== idx) return u;
              return { ...u, maxHp: val, baseMaxHp: val, hp: Math.min(u.hp, val) };
            })});
          }
          setMaxHpEditModal(null);
          setMaxHpEditValue('');
        };
        const label = isCommander
          ? (player.commanderStats?.customName || player.commander || 'Commander')
          : (player.subUnits?.[maxHpEditModal.index]?.name?.trim() || (maxHpEditModal.index === 0 ? 'Special' : `Soldier ${maxHpEditModal.index}`));
        return (
          <div onClick={() => { setMaxHpEditModal(null); setMaxHpEditValue(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '2px solid #c9a961', borderRadius: '12px', padding: '1.5rem', width: '300px', maxWidth: '95%' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>❤️</div>
                <div style={{ color: '#c9a961', fontWeight: '900', fontSize: '0.95rem', fontFamily: '"Cinzel",Georgia,serif' }}>Set Max HP</div>
                <div style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: '0.2rem' }}>{label}</div>
              </div>
              <input
                type="number" min="1" max="999" autoFocus
                value={maxHpEditValue}
                onChange={e => setMaxHpEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyMaxHpEdit(); if (e.key === 'Escape') { setMaxHpEditModal(null); setMaxHpEditValue(''); } }}
                style={{ width: '100%', background: '#0f0805', color: '#c9a961', border: '2px solid #c9a961', borderRadius: '8px', padding: '0.75rem', fontSize: '1.5rem', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={applyMaxHpEdit} style={{ flex: 1, background: 'linear-gradient(to bottom,#15803d,#14532d)', border: '2px solid #16a34a', color: '#86efac', padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem' }}>✓ Set</button>
                <button onClick={() => { setMaxHpEditModal(null); setMaxHpEditValue(''); }} style={{ flex: 1, background: 'linear-gradient(to bottom,#7f1d1d,#5f1a1a)', border: '2px solid #991b1b', color: '#fecaca', padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem' }}>✕ Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Death Loot Modal ── */}
      {deathLootModal && (
        <div onClick={() => setDeathLootModal(null)} style={{ position: 'fixed', inset: 0, background: surfaces.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: surfaces.elevated, border: `2px solid ${colors.redBorder}`,
            borderRadius: '12px', padding: '1.5rem', width: '340px', maxWidth: '95%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>💀</div>
              <div style={{ fontFamily: fonts.display, color: '#fca5a5', fontWeight: '900', fontSize: '0.95rem' }}>{deathLootModal.unitLabel} has fallen!</div>
              <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.2rem' }}>They dropped the following items:</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
              {deathLootModal.items.map(item => {
                const tc = tierColors[item.tier] || tierColors.Common;
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.7rem', background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: '7px' }}>
                    <span>{item.isQuestItem ? '🗝️' : '📦'}</span>
                    <span style={{ color: tc.text, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{item.name}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{item.tier}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => {
              const droppedIds = new Set(deathLootModal.items.map(it => it.id));
              onUpdate(player.id, { inventory: (player.inventory || []).filter(it => !droppedIds.has(it.id)) });
              setDeathLootModal(null);
            }} style={{ width: '100%', padding: '0.7rem', background: 'linear-gradient(135deg, #b91c1c, #991b1b)', border: `2px solid ${colors.red}`, color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>
              🗺️ Items Dropped — Remove from Inventory
            </button>
          </div>
        </div>
      )}

      {/* ── Max HP Target Modal ── */}
      {maxHpTargetItem && (() => {
        const { item, itemIndex } = maxHpTargetItem;
        const ef = item.effect;
        const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
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
            onUpdate(player.id, { subUnits: player.subUnits.map((u, si) => si === idx ? { ...u, maxHp: u.maxHp + ef.value, hp: u.hp + ef.value } : u), inventory: newInventory });
          }
          setMaxHpTargetItem(null);
        };

        const units = [
          { key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, isDead: player.commanderStats.hp === 0 },
          ...player.subUnits.map((u, idx) => ({ key: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 })),
        ];

        return (
          <UnitPickerModal title={item.name} subtitle={`Increases max HP by +${ef.value} — choose a unit`} icon="❤️" accentColor={tc.text}
            units={units} onPick={applyMaxHPToUnit} onClose={() => setMaxHpTargetItem(null)}
            rightLabel={(u) => !u.isDead ? `→${u.maxHp + ef.value}` : null} rightColor="#fca5a5" />
        );
      })()}

      {/* ── Extra Slot Unit Picker ── */}
      {extraSlotItem && (() => {
        const { item, itemIndex } = extraSlotItem;
        const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);

        const applyExtraSlot = (unitKey) => {
          // Remove the item from inventory (consumed)
          const newInventory = (player.inventory || []).filter((_, idx) => idx !== itemIndex);
          // Increment bonusSlots on the chosen unit
          let updates = { inventory: newInventory };
          if (unitKey === 'commander') {
            updates.commanderStats = { ...player.commanderStats, bonusSlots: (player.commanderStats.bonusSlots || 0) + 1 };
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            updates.subUnits = (player.subUnits || []).map((u, si) =>
              si === idx ? { ...u, bonusSlots: (u.bonusSlots || 0) + 1 } : u
            );
          }
          onUpdate(player.id, updates);
          setExtraSlotItem(null);
        };

        const units = [
          { key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, isDead: player.commanderStats.hp === 0 },
          ...(player.subUnits || []).map((u, idx) => ({ key: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 })),
        ];

        return (
          <UnitPickerModal title={item.name} subtitle="Choose which unit receives the extra carrying slot" icon="🎒" accentColor={tc.text}
            units={units} onPick={applyExtraSlot} onClose={() => setExtraSlotItem(null)}
            rightLabel={(u) => !u.isDead ? '+1 slot' : null} rightColor="#fbbf24" />
        );
      })()}


      {/* ── Cleanse / Full Cleanse Modal ── */}
      {cleanseItem && (() => {
        const { item, itemIndex, fullCleanse } = cleanseItem;
        const tc = tierColors[item.tier] || tierColors.Common;

        const applyCleanseToUnit = (unitKey) => {
          const newInventory = (player.inventory || []).filter((_, idx) => idx !== itemIndex);
          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            const newEffects = fullCleanse ? [] : (cs.statusEffects || []).slice(1);
            onUpdate(player.id, { inventory: newInventory, commanderStats: { ...cs, statusEffects: newEffects } });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            const newSubs = (player.subUnits || []).map((u, si) =>
              si !== idx ? u : { ...u, statusEffects: fullCleanse ? [] : (u.statusEffects || []).slice(1) }
            );
            onUpdate(player.id, { inventory: newInventory, subUnits: newSubs });
          }
          setCleanseItem(null);
        };

        const units = [
          { key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, isDead: player.commanderStats.hp === 0 },
          ...(player.subUnits || []).map((u, idx) => ({ key: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 })),
        ];
        return (
          <UnitPickerModal title={item.name} subtitle={fullCleanse ? 'Remove ALL status effects — choose a unit' : 'Remove one status effect — choose a unit'} icon={fullCleanse ? '✨✨' : '✨'} accentColor={tc.text}
            units={units} onPick={applyCleanseToUnit} onClose={() => setCleanseItem(null)} />
        );
      })()}

      {/* ── Shield Wall / Counter Strike Modal ── */}
      {shieldWallItem && (() => {
        const { item, itemIndex } = shieldWallItem;
        const tc = tierColors[item.tier] || tierColors.Common;
        const isCounter = item.effect?.type === 'counterStrike';
        const effectType = isCounter ? 'counterStrike' : 'shieldWall';

        const applyToUnit = (unitKey) => {
          const newInventory = (player.inventory || []).filter((_, idx) => idx !== itemIndex);
          const entry = { type: effectType, duration: 1, permanent: false };
          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            onUpdate(player.id, { inventory: newInventory, commanderStats: { ...cs, statusEffects: [...(cs.statusEffects || []), entry] } });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            const newSubs = (player.subUnits || []).map((u, si) =>
              si !== idx ? u : { ...u, statusEffects: [...(u.statusEffects || []), entry] }
            );
            onUpdate(player.id, { inventory: newInventory, subUnits: newSubs });
          }
          setShieldWallItem(null);
        };

        const units = [
          { key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, isDead: player.commanderStats.hp === 0 },
          ...(player.subUnits || []).map((u, idx) => ({ key: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 })),
        ];
        return (
          <UnitPickerModal title={item.name}
            subtitle={isCounter ? 'Reflects half damage when attacked — choose a unit' : 'Cannot be targeted this round — choose a unit'}
            icon={isCounter ? '⚡' : '🛡️'} accentColor={tc.text}
            units={units} onPick={applyToUnit} onClose={() => setShieldWallItem(null)} />
        );
      })()}

      {/* ── Resurrect Modal ── */}
      {resurrectItem && (() => {
        const { item, itemIndex } = resurrectItem;
        const tc = tierColors[item.tier] || tierColors.Common;

        const applyResurrect = (unitKey) => {
          const newInventory = (player.inventory || []).filter((_, idx) => idx !== itemIndex);
          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            onUpdate(player.id, { inventory: newInventory, commanderStats: { ...cs, hp: 5, isDead: false } });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            const newSubs = (player.subUnits || []).map((u, si) =>
              si !== idx ? u : { ...u, hp: 5, livesRemaining: (u.livesRemaining || 0) }
            );
            const newReviveQueue = (player.reviveQueue || []).filter(qi => qi !== idx);
            onUpdate(player.id, { inventory: newInventory, subUnits: newSubs, reviveQueue: newReviveQueue });
          }
          setResurrectItem(null);
        };

        // Only show dead units
        const units = [
          ...(player.commanderStats.hp === 0 ? [{ key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: 0, maxHp: player.commanderStats.maxHp, isDead: true }] : []),
          ...(player.subUnits || []).filter(u => u.hp === 0).map((u, _) => {
            const origIdx = player.subUnits.indexOf(u);
            return { key: origIdx === 0 ? 'special' : `soldier${origIdx}`, label: u.name?.trim() || (origIdx === 0 ? 'Special' : `Soldier ${origIdx}`), icon: origIdx === 0 ? '⭐' : '🛡️', hp: 0, maxHp: u.maxHp, isDead: true };
          }),
        ];
        return (
          <UnitPickerModal title={item.name} subtitle="Revive a defeated unit at 5HP — choose who" icon="💫" accentColor={tc.text}
            units={units.length > 0 ? units : [{ key: '__none', label: 'No defeated units', icon: '✓', hp: 1, maxHp: 1, isDead: false }]}
            onPick={(k) => { if (k !== '__none') applyResurrect(k); else setResurrectItem(null); }}
            onClose={() => setResurrectItem(null)}
            rightLabel={(u) => !u.isDead ? null : '→ 5hp'} rightColor="#4ade80" />
        );
      })()}

      {/* ── Heal Target Modal ── */}
      {healTargetItem && (() => {
        const { item, itemIndex } = healTargetItem;
        const ef = item.effect;
        const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
        const usesLeft = ef.uses === 0 ? Infinity : (ef.usesRemaining ?? ef.uses ?? 1);
        const newUsesRemaining = ef.uses === 0 ? Infinity : usesLeft - 1;
        const consumed = newUsesRemaining <= 0;

        const applyHealToUnit = (unitKey) => {
          const newInventory = (player.inventory || [])
            .map((it, idx) => idx !== itemIndex ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
            .filter((it, idx) => idx !== itemIndex ? true : !consumed);
          if (unitKey === 'commander') {
            const cs = player.commanderStats;
            onUpdate(player.id, { commanderStats: { ...cs, hp: Math.min(cs.maxHp, cs.hp + ef.value) }, inventory: newInventory });
          } else {
            const idx = unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier', ''));
            onUpdate(player.id, { subUnits: player.subUnits.map((u, si) => si === idx ? { ...u, hp: Math.min(u.maxHp, u.hp + ef.value) } : u), inventory: newInventory });
          }
          setHealTargetItem(null);
        };

        const units = [
          { key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', icon: '⚔️', hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, isDead: player.commanderStats.hp === 0 },
          ...player.subUnits.map((u, idx) => ({ key: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 })),
        ];

        return (
          <UnitPickerModal title={item.name} subtitle={`Heals +${ef.value} HP — choose a unit`} icon="💚" accentColor={tc.text}
            units={units} onPick={applyHealToUnit} onClose={() => setHealTargetItem(null)}
            rightLabel={(u) => !u.isDead ? `+${Math.min(u.maxHp - u.hp, ef.value)}` : null} rightColor={colors.greenLight} />
        );
      })()}

      {/* ── Commander Revive Modal ── */}
      {showReviveModal && (
        <div style={{ position: 'fixed', inset: 0, background: surfaces.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowReviveModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: surfaces.elevated, border: `2px solid ${colors.gold}`,
            borderRadius: '12px', padding: '2rem', maxWidth: '460px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          }}>
            <h3 style={{ color: colors.gold, fontSize: '1.4rem', marginBottom: '0.75rem', textAlign: 'center', fontFamily: fonts.display }}>
              🎲 Revive Roll
            </h3>
            <p style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
              Was the revive roll successful?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => { onUseRevive(player.id, true); setShowReviveModal(false); }}
                style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #059669, #047857)', border: '2px solid #10b981', color: '#d1fae5', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                ✓ Successful
              </button>
              <button onClick={() => { onUseRevive(player.id, false); setShowReviveModal(false); }}
                style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #b91c1c, #991b1b)', border: '2px solid #dc2626', color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                ✗ Unsuccessful
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const StatusBadge = ({ color, text: label, dim }) => (
  <div style={{
    padding: '0.18rem 0.55rem',
    background: dim ? `${color}22` : `linear-gradient(to bottom, ${color}, ${color}cc)`,
    border: `${dim ? '1px' : '2px'} solid ${color}`,
    borderRadius: '20px',
    color: dim ? color : '#fff',
    fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em',
    whiteSpace: 'nowrap', flexShrink: 0,
  }}>{label}</div>
);

// Reusable unit picker modal used for Heal + MaxHP
const UnitPickerModal = ({ title, subtitle, icon, accentColor, units, onPick, onClose, rightLabel, rightColor }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: surfaces.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: surfaces.elevated, border: `2px solid ${accentColor}`,
      borderRadius: '12px', padding: '1.5rem', width: '340px', maxWidth: '95%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{icon}</div>
        <div style={{ fontFamily: fonts.display, color: accentColor, fontWeight: '900', fontSize: '0.95rem' }}>{title}</div>
        <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.2rem' }} dangerouslySetInnerHTML={{ __html: subtitle }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
        {units.map(u => {
          const hpPct = u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0;
          const disabled = u.isDead;
          return (
            <div key={u.key} onClick={() => !disabled && onPick(u.key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
              background: disabled ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)',
              border: `1px solid ${disabled ? colors.textDisabled : 'rgba(90,74,58,0.4)'}`,
              borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{u.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: disabled ? colors.textFaint : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>
                  {u.label}
                  {disabled && <span style={{ color: colors.redDeep, fontSize: '0.62rem', fontWeight: '800', marginLeft: '0.4rem' }}>DEAD</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${hpPct}%`, height: '100%', background: hpBarColor(hpPct), borderRadius: '2px' }} />
                  </div>
                  <span style={{ color: colors.textMuted, fontSize: '0.7rem', fontWeight: '600', flexShrink: 0 }}>{u.hp}/{u.maxHp}</span>
                </div>
              </div>
              {rightLabel && rightLabel(u) && (
                <span style={{ color: rightColor, fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>{rightLabel(u)}</span>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onClose} style={{ ...btn.danger(), width: '100%', padding: '0.65rem', fontSize: '0.875rem', justifyContent: 'center' }}>✕ Cancel</button>
    </div>
  </div>
);

export default PlayerCard;