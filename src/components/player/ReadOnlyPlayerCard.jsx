import React from 'react';
import { colors, borders, fonts, btn, hpBarColor, tierColors, text, insetSection, pill, cardShell } from '../../theme';
import { COMMANDER_STATS } from '../../data/commanderStats';
import { FACTION_STATS } from '../../data/factionStats';
import { getSlotCount, getHeldCount } from '../lootUtils';
import { writePendingRequest } from '../../services/gameStateService';

// Sort order: Common → Rare → Legendary → Quest items at bottom
const TIER_ORDER = { Common: 0, Rare: 1, Legendary: 2 };
const sortItems = (items) => [...(items || [])].sort((a, b) => {
  if (a.isQuestItem && !b.isQuestItem) return 1;
  if (!a.isQuestItem && b.isQuestItem) return -1;
  return (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
});

// Item tag styles — controls USE button visibility and display
const TAG_STYLES = {
  reactive:  { color: '#a78bfa', label: 'Reactive',   icon: '⚡', desc: 'Use any time' },
  combat:    { color: '#f87171', label: 'Combat',     icon: '🗡️', desc: 'Use inside calculator' },
  prebattle: { color: '#38bdf8', label: 'Pre-Battle', icon: '🌅', desc: 'Use before battle' },
  quest:     { color: '#fde68a', label: 'Quest',      icon: '🗝️', desc: 'Carried only' },
};
const getItemTag = (item) =>
  TAG_STYLES[item.tag] || (item.isQuestItem ? TAG_STYLES.quest : TAG_STYLES.reactive);

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
  const [sendingId,        setSendingId]        = React.useState(null); // item.id currently being sent
  const [sendingAttack,    setSendingAttack]    = React.useState(false); // attack request in-flight
  const [deathFlashing,    setDeathFlashing]    = React.useState({});
  const prevHPRef = React.useRef({});

  // Detect HP → 0 transitions and trigger flash
  React.useEffect(() => {
    const prev = prevHPRef.current;
    const newFlashing = {};
    const cmdHp = player.commanderStats?.hp ?? 0;
    if ((prev.commander ?? cmdHp) > 0 && cmdHp === 0) newFlashing.commander = true;
    (player.subUnits || []).forEach((u, i) => {
      const key = `unit_${i}`;
      if ((prev[key] ?? u.hp) > 0 && u.hp === 0) newFlashing[key] = true;
    });
    if (Object.keys(newFlashing).length > 0) {
      setDeathFlashing(f => ({ ...f, ...newFlashing }));
      const t = setTimeout(() => setDeathFlashing({}), 750);
      return () => clearTimeout(t);
    }
    prevHPRef.current = {
      commander: cmdHp,
      ...(player.subUnits || []).reduce((acc, u, i) => ({ ...acc, [`unit_${i}`]: u.hp }), {}),
    };
  });
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
    if (!lobbyCode || sendingAttack) return;
    setSendingAttack(true);
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
      setSendingAttack(false);
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
              <div key={index}
                className={deathFlashing[`unit_${index}`] ? 'unit-death-flash' : ''}
                style={{ padding: '0.75rem', background: isPermaDead ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)', borderBottom: index < (player.subUnits || []).length - 1 ? `1px solid ${colors.purpleBorder}` : 'none', opacity: isPermaDead ? 0.3 : unitDead ? 0.55 : 1, filter: isPermaDead ? 'grayscale(1)' : 'none', position: 'relative' }}>
                {isPermaDead && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', marginBottom: '8px', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '2rem', opacity: 0.22 }}>💀</span>
                  </div>
                )}
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
            const tag = getItemTag(item);

            // Combat items only usable inside the calculator — never show USE on tile
            const isCombatOnly = item.tag === 'combat' || ['rerollAttack','rerollDefense','forceAttackReroll','forceDefenseReroll','diceSwap','closecall'].includes(item.effect?.type);
            const isQuestTag   = item.isQuestItem || item.tag === 'quest';
            const isPreBattle  = item.tag === 'prebattle';

            const isSelfTarget = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'].includes(item.effect?.type);
            const isEnemyTarget = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'].includes(item.effect?.type);
            const isGlobal = ['npcPlague','playerPlague','crownsFavor','nullify','mirror'].includes(item.effect?.type);
            const hasUseLogic = ['heal','maxHP','attackBonus','defenseBonus','manual','destroyItem','extraSlot','theGuy'].includes(item.effect?.type) || isSelfTarget || isEnemyTarget || isGlobal;

            // Pre-battle items behave the same as reactive — USE button always visible.
            // The tag is informational; the DM enforces timing via the approval window.
            const showUseButton = isOwnCard && !isQuestTag && !isCombatOnly && hasUseLogic;

            const sending = sendingId === item.id;

            const sendItemRequest = async (action) => {
              if (!isOwnCard || !lobbyCode || sendingId) return;
              setSendingId(item.id);
              try {
                const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                await writePendingRequest(lobbyCode, reqId, {
                  type: 'useItem',
                  reqId,
                  playerId:        player.id,
                  playerName:      player.playerName,
                  itemId:          item.id,
                  itemName:        item.name,
                  itemDescription: item.description || '',
                  itemEffect:      item.effect?.type || 'none',
                  itemTag:         item.tag || (item.isQuestItem ? 'quest' : 'reactive'),
                  action,
                  timestamp: Date.now(),
                });
              } finally {
                setSendingId(null);
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
              <div key={item.id} style={{ padding: '0.65rem 0.85rem', borderLeft: `3px solid ${tc.text}`, borderBottom: i < inventory.length - 1 ? '1px solid rgba(201,169,97,0.07)' : 'none', opacity: canUse ? 1 : 0.4 }}>
                {/* Row 1: tag dot + icon + name + description + tier badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span title={`${tag.label} — ${tag.desc}`} style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, marginTop: '0.35rem', background: tag.color, boxShadow: `0 0 4px ${tag.color}88` }} />
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
                {/* Row 2: holder label + type note + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.6rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {heldByLabel}{item.effect?.uses !== 0 && usesLeft !== 999 && ` · ${usesLeft} use${usesLeft !== 1 ? 's' : ''} left`}
                    {isCombatOnly && !isQuestTag && <span style={{ color: tag.color, marginLeft: '0.3rem' }}>· {tag.icon} calc only</span>}
                    {isPreBattle && <span style={{ color: tag.color, marginLeft: '0.3rem' }}>· {tag.icon} pre-battle</span>}
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
                      {(
                        <button onClick={() => sendItemRequest('pass')} disabled={sending}
                          style={{ ...pill(colors.textMuted, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.35)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🤝 PASS</button>
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
                  <button key={npc.id} onClick={() => sendAttackRequest({ id: npc.id, type: 'npc', name: npc.name })} disabled={sendingAttack}
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
                                disabled={sendingAttack}
                                style={{ width: '100%', padding: '0.6rem', background: pColor + '20', border: `1px solid ${pColor}50`, borderRadius: '7px', color: pColor, fontWeight: '800', fontSize: '0.78rem', fontFamily: fonts.body, cursor: sendingAttack ? 'not-allowed' : 'pointer' }}
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
                  (async () => {
                    if (!isOwnCard || !lobbyCode || sendingId) return;
                    setSendingId(ci.id);
                    try {
                      const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                      await writePendingRequest(lobbyCode, reqId, {
                        type: 'useItem', reqId,
                        playerId:        player.id,
                        playerName:      player.playerName,
                        itemId:          ci.id,
                        itemName:        ci.name,
                        itemDescription: ci.description || '',
                        itemEffect:      ci.effect?.type || 'none',
                        itemTag:         ci.tag || (ci.isQuestItem ? 'quest' : 'reactive'),
                        action:          'use',
                        timestamp:       Date.now(),
                      });
                    } finally { setSendingId(null); }
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
        if (!validRoll || sendingId) return;
        setSendingId(gi.id);
        try {
          const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await writePendingRequest(lobbyCode, reqId, {
            type: 'useItem',
            reqId,
            playerId: player.id,
            playerName: player.playerName,
            itemId: gi.id,
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
          setSendingId(null);
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
              <button onClick={handleSend} disabled={!validRoll || sendingId} style={{ padding: '0.85rem', background: validRoll ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${validRoll ? 'rgba(34,197,94,0.4)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: validRoll ? '#86efac' : colors.textDisabled, cursor: validRoll ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✦ Send to DM</button>
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

export default ReadOnlyPlayerCard;