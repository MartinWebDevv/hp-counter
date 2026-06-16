import React from 'react';
import { colors, surfaces, fonts, btn, tierColors } from '../theme';

const PvPDeathModal = ({ unitLabel, playerName, items, playerId, victimUnitType, attackerPlayer, attackerUnitType, onConfirm, onClose }) => {
  // selections[itemId] = null | 'drop' | { unitType, droppedItemId }
  const [selections,   setSelections]   = React.useState(() => Object.fromEntries(items.map(it => [it.id, null])));
  const [expandedItem, setExpandedItem] = React.useState(null); // item.id whose unit picker is open

  const allDecided   = items.every(it => selections[it.id] !== null);
  const droppedItems = items.filter(it => selections[it.id] === 'drop');
  const takenItems   = items.filter(it => selections[it.id] !== null && selections[it.id] !== 'drop');

  const tc = (item) => item.isQuestItem ? '#fde68a' : ({ Common: colors.textSecondary, Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || colors.textSecondary);

  const unitName = (player, unitType) => {
    if (!player) return unitType;
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt((unitType || '').replace('soldier', ''));
    return !isNaN(idx) ? (player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`) : unitType;
  };

  const getAllUnits = (player) => {
    if (!player) return [];
    const units = [{ unitType: 'commander', label: unitName(player, 'commander'), hp: player.commanderStats?.hp ?? 0, maxHp: player.commanderStats?.maxHp ?? 1, isDead: (player.commanderStats?.hp ?? 0) === 0 }];
    (player.subUnits || []).forEach((u, i) => {
      units.push({ unitType: i === 0 ? 'special' : `soldier${i}`, label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp, isDead: u.hp === 0 });
    });
    return units;
  };

  // Count pending "take" assignments for slot tracking
  const pendingTakeByUnit = (excludeItemId) => {
    const counts = {};
    items.forEach(it => {
      if (it.id === excludeItemId) return;
      const sel = selections[it.id];
      if (sel && sel !== 'drop') counts[sel.unitType] = (counts[sel.unitType] || 0) + 1;
    });
    return counts;
  };

  const assignTake = (item, unitType) => {
    const pending = pendingTakeByUnit(item.id);
    const slots = attackerPlayer ? getSlotCount(attackerPlayer, unitType) : 1;
    const held  = attackerPlayer ? getHeldCount(attackerPlayer, unitType) : 0;
    const isFull = !item.isQuestItem && (held + (pending[unitType] || 0) >= slots);
    const swapItem = isFull ? (attackerPlayer?.inventory || []).find(it => it.heldBy === unitType && !it.isQuestItem) : null;
    setSelections(p => ({ ...p, [item.id]: { unitType, droppedItemId: swapItem?.id || null } }));
    setExpandedItem(null);
  };

  const hpBar = (hp, maxHp, isDead) => (
    <div style={{ width: '48px', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${isDead ? 0 : (hp/maxHp)*100}%`, height: '100%', background: isDead ? '#374151' : hp/maxHp > 0.5 ? '#22c55e' : hp/maxHp > 0.25 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: surfaces.elevated, border: `2px solid ${colors.redBorder}`, borderRadius: '12px', padding: '1.5rem', width: '440px', maxWidth: '95%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>⚔️</div>
          <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display, marginBottom: '0.3rem' }}>
            {playerName}'s {unitLabel} has fallen!
          </div>
          <div style={{ color: colors.textMuted, fontSize: '0.78rem', lineHeight: 1.5 }}>
            Killed by <span style={{ color: colors.amber, fontWeight: '800' }}>{attackerPlayer?.playerName}'s {unitName(attackerPlayer, attackerUnitType)}</span>
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginTop: '0.25rem' }}>Choose what happens to each dropped item:</div>
        </div>

        {/* Per-item decision */}
        {items.map(item => {
          const color = tc(item);
          const sel   = selections[item.id];
          const isTake = sel !== null && sel !== 'drop';
          const isDrop = sel === 'drop';
          const isOpen = expandedItem === item.id;
          const assignedUnitName = isTake ? unitName(attackerPlayer, sel.unitType) : null;
          const units = getAllUnits(attackerPlayer);

          return (
            <div key={item.id} style={{ marginBottom: '0.75rem' }}>
              {/* Item info row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.85rem', background: `${color}10`, border: `1px solid ${isTake ? colors.greenBorder : isDrop ? 'rgba(255,255,255,0.06)' : `${color}30`}`, borderRadius: '8px 8px 0 0' }}>
                <span style={{ fontSize: '1rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: isTake ? colors.greenLight : isDrop ? colors.textFaint : color, fontWeight: '800', fontSize: '0.85rem' }}>{item.name}</div>
                  {item.description && <div style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{item.description}</div>}
                </div>
                <span style={{ color, fontSize: '0.58rem', fontWeight: '800', background: `${color}18`, border: `1px solid ${color}30`, borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                  {item.isQuestItem ? 'Quest' : item.tier}
                </span>
              </div>

              {/* Take / Drop toggle row */}
              <div style={{ display: 'flex', border: `1px solid rgba(255,255,255,0.06)`, borderTop: 'none', borderRadius: isDrop || (isTake && !isOpen) ? '0 0 8px 8px' : '0' }}>
                <button
                  onClick={() => {
                    if (isDrop || !isTake) { setExpandedItem(item.id); setSelections(p => ({ ...p, [item.id]: null })); }
                    else setExpandedItem(isOpen ? null : item.id);
                  }}
                  style={{ flex: 1, padding: '0.45rem 0.5rem', background: isTake ? colors.greenSubtle : 'rgba(0,0,0,0.35)', border: 'none', borderRight: `1px solid rgba(255,255,255,0.06)`, color: isTake ? colors.greenLight : colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.72rem', transition: 'all 0.15s' }}>
                  {isTake ? `✓ ${assignedUnitName} ${isOpen ? '▲' : '▼'}` : '⚔️ Take'}
                </button>
                <button
                  onClick={() => { setSelections(p => ({ ...p, [item.id]: 'drop' })); setExpandedItem(null); }}
                  style={{ flex: 1, padding: '0.45rem 0.5rem', background: isDrop ? colors.redSubtle : 'rgba(0,0,0,0.35)', border: 'none', color: isDrop ? '#fca5a5' : colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.72rem', transition: 'all 0.15s' }}>
                  {isDrop ? '✓ DROP' : '🗺️ Drop on Map'}
                </button>
              </div>

              {/* Unit picker — expands when Take is clicked */}
              {isOpen && attackerPlayer && (
                <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${colors.goldBorder}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.65rem' }}>
                  <div style={{ color: colors.textMuted, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Assign to {attackerPlayer.playerName}'s unit:</div>
                  {units.map(u => {
                    const pending = pendingTakeByUnit(item.id);
                    const slots = getSlotCount(attackerPlayer, u.unitType);
                    const held  = getHeldCount(attackerPlayer, u.unitType);
                    const full  = !item.isQuestItem && (held + (pending[u.unitType] || 0) >= slots);
                    const disabled = u.isDead;
                    const isSwap = full && !disabled;
                    const swapItem = isSwap ? (attackerPlayer.inventory || []).find(it => it.heldBy === u.unitType && !it.isQuestItem) : null;
                    return (
                      <div key={u.unitType}>
                        <div onClick={() => !disabled && assignTake(item, u.unitType)} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.7rem', marginBottom: swapItem ? 0 : '0.25rem', background: disabled ? 'rgba(0,0,0,0.15)' : isSwap ? 'rgba(249,115,22,0.06)' : 'rgba(0,0,0,0.35)', border: `1px solid ${disabled ? colors.textDisabled : isSwap ? 'rgba(249,115,22,0.35)' : colors.goldBorder}`, borderRadius: swapItem ? '6px 6px 0 0' : '6px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
                          <span style={{ color: disabled ? colors.textFaint : isSwap ? '#f97316' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem', flex: 1 }}>{u.label}</span>
                          {hpBar(u.hp, u.maxHp, u.isDead)}
                          {isSwap && <span style={{ color: '#f97316', fontSize: '0.58rem', fontWeight: '800' }}>↕ SWAP</span>}
                          {u.isDead && <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800' }}>DEAD</span>}
                        </div>
                        {swapItem && (
                          <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.25rem 0.7rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: colors.textMuted, fontSize: '0.6rem' }}>Drops: </span>
                            <span style={{ color: colors.amber, fontSize: '0.6rem', fontWeight: '800' }}>{swapItem.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        {takenItems.length > 0 && (
          <div style={{ padding: '0.45rem 0.75rem', background: colors.greenSubtle, border: `1px solid ${colors.greenBorder}`, borderRadius: '6px', marginBottom: '0.5rem', color: colors.greenLight, fontSize: '0.72rem', fontWeight: '700' }}>
            ⚔️ {takenItems.length} item{takenItems.length !== 1 ? 's' : ''} assigned to {attackerPlayer?.playerName}'s units
          </div>
        )}
        {droppedItems.length > 0 && (
          <div style={{ padding: '0.45rem 0.75rem', background: 'rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '6px', marginBottom: '0.5rem', color: colors.textFaint, fontSize: '0.72rem' }}>
            🗺️ {droppedItems.length} item{droppedItems.length !== 1 ? 's' : ''} left on the map for the DM.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
          <button disabled={!allDecided} onClick={() => onConfirm(takenItems.map(it => ({ ...it, unitType: selections[it.id]?.unitType, droppedItemId: selections[it.id]?.droppedItemId || null })), droppedItems)} style={{ flex: 2, padding: '0.75rem', background: allDecided ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(0,0,0,0.3)', border: `1px solid ${allDecided ? '#10b981' : 'rgba(255,255,255,0.06)'}`, color: allDecided ? '#d1fae5' : colors.textDisabled, borderRadius: '8px', cursor: allDecided ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem', transition: 'all 0.15s' }}>✓ Confirm</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: colors.redSubtle, border: `1px solid ${colors.redBorder}`, color: '#fca5a5', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PvPDeathModal;
