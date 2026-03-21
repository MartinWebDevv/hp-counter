import React, { useState } from 'react';
import { getSlotCount, getHeldCount, unitIsFull } from './lootUtils';
import { colors, surfaces, borders, fonts, btn, tierColors } from '../theme';

const labelStyle = {
  color: colors.textMuted, fontSize: '0.68rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.35rem',
};

const selectStyle = {
  width: '100%', background: 'rgba(0,0,0,0.4)',
  color: colors.gold, padding: '0.55rem 0.7rem',
  borderRadius: '6px', border: `1px solid rgba(201,169,97,0.25)`,
  fontFamily: fonts.body, fontSize: '0.875rem', boxSizing: 'border-box', cursor: 'pointer',
};

const TIERS = { Common: tierColors.Common, Rare: tierColors.Rare, Legendary: tierColors.Legendary, Quest: tierColors.Quest };

const getAllUnits = (player) => {
  if (!player) return [];
  const units = [{ unitType: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', hp: player.commanderStats?.hp ?? 0, maxHp: player.commanderStats?.maxHp ?? 0, isDead: player.commanderStats?.isDead ?? false }];
  if (player.subUnits?.length > 0) {
    player.subUnits.forEach((u, i) => {
      const unitType = i === 0 ? 'special' : `soldier${i}`;
      const label = u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
      units.push({ unitType, label, hp: u.hp ?? 0, maxHp: u.maxHp ?? 0, isDead: u.hp === 0 });
    });
  }
  return units;
};

const modalShell = {
  background: surfaces.elevated, borderRadius: '12px',
  padding: '1.5rem', maxWidth: '95%',
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
};

const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: surfaces.overlay, display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 3000,
};

const hpBar = (hp, maxHp, isDead) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
    <div style={{ width: '55px', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${maxHp > 0 ? (hp / maxHp) * 100 : 0}%`, height: '100%', background: isDead ? colors.textDisabled : colors.green, borderRadius: '2px' }} />
    </div>
    <span style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '700', minWidth: '34px' }}>{hp}/{maxHp}</span>
  </div>
);

// ── NPC Loot Modal ─────────────────────────────────────────────────────────────

export const NpcLootModal = ({ npc, player: initPlayer, players, onConfirm, onClose }) => {
  const lootTable = npc.lootTable || [];
  const [selectedPlayerId, setSelectedPlayerId] = useState(initPlayer?.id ? String(initPlayer.id) : '');
  const [expandedItem, setExpandedItem] = useState(null);
  const [assignments, setAssignments] = useState(() => lootTable.map(() => null));

  const player = initPlayer || (players || []).find(p => p.id === parseInt(selectedPlayerId));
  const allAssigned = assignments.every(a => a !== null);
  const getUnitType = (a) => (typeof a === 'object' && a !== null) ? a.unitType : a;
  const getDroppedId = (a) => (typeof a === 'object' && a !== null) ? a.droppedItemId : null;

  const handleConfirm = () => {
    const result = lootTable.map((item, i) => ({ ...item, heldBy: getUnitType(assignments[i]), droppedItemId: getDroppedId(assignments[i]) }));
    onConfirm(result);
  };

  // Count how many non-quest items are being assigned to each unit in this modal session
  const getPendingCounts = (currentAssignments, excludeIndex = -1) => {
    const counts = {};
    currentAssignments.forEach((a, idx) => {
      if (!a || idx === excludeIndex) return;
      const ut = typeof a === 'object' ? a.unitType : a;
      if (!lootTable[idx]?.isQuestItem) counts[ut] = (counts[ut] || 0) + 1;
    });
    return counts;
  };

  const isUnitFullWithPending = (unitType, excludeIndex, isQuestItem) => {
    if (isQuestItem) return false;
    const pending = getPendingCounts(assignments, excludeIndex);
    const slotCount = getSlotCount(player, unitType);
    const heldCount = getHeldCount(player, unitType);
    return heldCount + (pending[unitType] || 0) >= slotCount;
  };

  const assign = (itemIndex, unitType) => {
    const isQuestItem = lootTable[itemIndex]?.isQuestItem;
    const isFull = isUnitFullWithPending(unitType, itemIndex, isQuestItem);
    const dropped = isFull ? (player?.inventory || []).find(it => it.heldBy === unitType && !it.isQuestItem) : null;
    setAssignments(prev => { const next = [...prev]; next[itemIndex] = { unitType, droppedItemId: dropped?.id || null }; return next; });
    setExpandedItem(null);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalShell, width: '440px', border: `1px solid ${colors.goldBorder}` }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>💀</div>
          <div style={{ color: colors.gold, fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display }}>{npc.name} Defeated!</div>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.2rem' }}>Assign each item to a unit</div>
        </div>

        {!initPlayer && (
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={labelStyle}>Who dealt the killing blow?</label>
            <select value={selectedPlayerId} onChange={e => { setSelectedPlayerId(e.target.value); setAssignments(lootTable.map(() => null)); setExpandedItem(null); }} style={selectStyle}>
              <option value="">Select player...</option>
              {(players || []).map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
        )}

        {lootTable.map((item, i) => {
          const tier = item.isQuestItem ? 'Quest' : (item.tier || 'Common');
          const c = TIERS[tier] || tierColors.Common;
          const assigned = assignments[i];
          const isOpen = expandedItem === i;
          const units = player ? getAllUnits(player) : [];

          return (
            <div key={item.id || i} style={{ marginBottom: '0.55rem' }}>
              <div onClick={() => player && setExpandedItem(isOpen ? null : i)} style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.65rem 0.85rem',
                background: assigned ? colors.greenSubtle : c.bg,
                border: `1px solid ${assigned ? colors.greenBorder : isOpen ? colors.goldBorder : c.border}`,
                borderRadius: isOpen ? '8px 8px 0 0' : '8px',
                cursor: player ? 'pointer' : 'default', transition: 'border-color 0.15s',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: assigned ? colors.greenLight : c.text, fontWeight: '900', fontSize: '0.85rem' }}>{item.name || 'Unnamed Item'}</div>
                  {item.description && <div style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{item.description}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                  <span style={{ padding: '0.08rem 0.35rem', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '4px', color: c.text, fontSize: '0.58rem', fontWeight: '800' }}>{tier}</span>
                </div>
                <div style={{ color: assigned ? colors.green : colors.textMuted, fontSize: '0.72rem', flexShrink: 0 }}>
                  {assigned ? `✓ ${getUnitType(assigned)}` : (player ? (isOpen ? '▲' : '▼ Assign') : '—')}
                </div>
              </div>

              {isOpen && player && (
                <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${colors.goldBorder}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.65rem' }}>
                  <div style={{ color: colors.textMuted, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Assign to unit:</div>
                  {units.map(u => {
                    const full = isUnitFullWithPending(u.unitType, i, item.isQuestItem);
                    const disabled = u.isDead;
                    const isSwap = full && !u.isDead;
                    const currentItem = isSwap ? (player.inventory || []).find(it => it.heldBy === u.unitType && !it.isQuestItem) : null;
                    return (
                      <div key={u.unitType}>
                        <div onClick={() => !disabled && assign(i, u.unitType)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.55rem',
                          padding: '0.45rem 0.7rem', marginBottom: currentItem ? 0 : '0.25rem',
                          background: disabled ? 'rgba(0,0,0,0.15)' : isSwap ? 'rgba(249,115,22,0.06)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${disabled ? colors.textDisabled : isSwap ? 'rgba(249,115,22,0.35)' : colors.goldBorder}`,
                          borderRadius: currentItem ? '6px 6px 0 0' : '6px',
                          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
                        }}>
                          <span style={{ color: disabled ? colors.textFaint : isSwap ? '#f97316' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem', flex: 1 }}>{u.label}</span>
                          {hpBar(u.hp, u.maxHp, u.isDead)}
                          {isSwap && <span style={{ color: '#f97316', fontSize: '0.58rem', fontWeight: '800' }}>↕ SWAP</span>}
                          {u.isDead && <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800' }}>DEAD</span>}
                        </div>
                        {currentItem && (
                          <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.25rem 0.7rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: colors.textMuted, fontSize: '0.6rem' }}>Drops: </span>
                            <span style={{ color: colors.amber, fontSize: '0.6rem', fontWeight: '800' }}>{currentItem.name}</span>
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

        {!player && (
          <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.78rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
            Select the killing player above to assign items.
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.4rem' }}>
          <button disabled={!allAssigned || !player} onClick={handleConfirm} style={{
            flex: 1, padding: '0.7rem',
            background: (allAssigned && player) ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${(allAssigned && player) ? '#10b981' : colors.textDisabled}`,
            color: (allAssigned && player) ? '#d1fae5' : colors.textDisabled,
            borderRadius: '8px', cursor: (allAssigned && player) ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '0.875rem',
          }}>✓ Confirm Loot</button>
          <button onClick={onClose} style={{ ...btn.danger(), flex: 1, padding: '0.7rem', fontSize: '0.875rem' }}>Skip</button>
        </div>
      </div>
    </div>
  );
};

// ── Steal Loot Modal ───────────────────────────────────────────────────────────

export const StealLootModal = ({ attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems, onConfirm, onClose }) => {
  const [selections, setSelections] = useState(() => Object.fromEntries(victimItems.map(it => [it.id, null])));

  const attackerSlots = getSlotCount(attackerPlayer, attackerUnitType);
  const attackerHeld  = getHeldCount(attackerPlayer, attackerUnitType);
  const attackerFull  = unitIsFull(attackerPlayer, attackerUnitType);
  const availableSlots = attackerSlots - attackerHeld;
  const allDecided = victimItems.every(it => selections[it.id] !== null);

  const toggleItem = (itemId, item) => {
    setSelections(prev => {
      const current = prev[itemId];
      if (item.isQuestItem) return { ...prev, [itemId]: current === 'take' ? 'drop' : 'take' };
      if (current === 'take') return { ...prev, [itemId]: 'drop' };
      const nonQuestTaken = victimItems.filter(it => !it.isQuestItem && prev[it.id] === 'take').length;
      if (nonQuestTaken >= availableSlots) return prev;
      return { ...prev, [itemId]: 'take' };
    });
  };

  const handleConfirm = () => {
    onConfirm(victimItems.filter(it => selections[it.id] === 'take'), victimItems.filter(it => selections[it.id] === 'drop'), attackerUnitType);
  };

  const attackerUnit = getAllUnits(attackerPlayer).find(u => u.unitType === attackerUnitType);

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalShell, width: '440px', border: `1px solid ${colors.redBorder}` }}>
        <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>⚔️</div>
          <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display }}>Unit Eliminated!</div>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
            <span style={{ color: '#f87171' }}>{victimPlayer.playerName}'s {victimUnitType}</span> was killed by{' '}
            <span style={{ color: colors.gold }}>{attackerPlayer.playerName}'s {attackerUnit?.label || attackerUnitType}</span>
          </div>
        </div>

        <div style={{
          padding: '0.45rem 0.8rem', marginBottom: '0.85rem',
          background: attackerFull ? colors.redSubtle : colors.greenSubtle,
          border: `1px solid ${attackerFull ? colors.redBorder : colors.greenBorder}`,
          borderRadius: '7px',
        }}>
          <span style={{ color: attackerFull ? '#fca5a5' : colors.greenLight, fontWeight: '800', fontSize: '0.75rem' }}>
            {attackerPlayer.playerName}'s {attackerUnit?.label}: {attackerHeld}/{attackerSlots} slots used
            {attackerFull ? ' — FULL (quest items only)' : ` — ${availableSlots} slot${availableSlots !== 1 ? 's' : ''} available`}
          </span>
        </div>

        <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Items on {victimUnitType} — choose fate:
        </div>

        {victimItems.map(item => {
          const tier = item.isQuestItem ? 'Quest' : (item.tier || 'Common');
          const c = TIERS[tier] || tierColors.Common;
          const sel = selections[item.id];
          const canTake = item.isQuestItem || (attackerHeld + victimItems.filter(it => !it.isQuestItem && selections[it.id] === 'take').length < attackerSlots);

          return (
            <div key={item.id} style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 0.8rem', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.95rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: c.text, fontWeight: '900', fontSize: '0.83rem' }}>{item.name}</div>
                  {item.description && <div style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{item.description}</div>}
                </div>
                <span style={{ color: c.text, fontSize: '0.58rem', fontWeight: '800' }}>{tier}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => toggleItem(item.id, item)} disabled={sel !== 'take' && !canTake} style={{
                  flex: 1, padding: '0.38rem',
                  background: sel === 'take' ? colors.greenSubtle : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${sel === 'take' ? colors.greenBorder : colors.textDisabled}`,
                  color: sel === 'take' ? colors.greenLight : (canTake ? colors.textMuted : colors.textDisabled),
                  borderRadius: '6px', cursor: (sel !== 'take' && !canTake) ? 'not-allowed' : 'pointer',
                  fontFamily: fonts.body, fontWeight: '800', fontSize: '0.7rem',
                }}>{sel === 'take' ? '✓ TAKE' : item.isQuestItem ? '🗝️ Take' : canTake ? 'Take' : 'No room'}</button>
                <button onClick={() => setSelections(prev => ({ ...prev, [item.id]: 'drop' }))} style={{
                  flex: 1, padding: '0.38rem',
                  background: sel === 'drop' ? colors.redSubtle : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${sel === 'drop' ? colors.redBorder : colors.textDisabled}`,
                  color: sel === 'drop' ? '#fca5a5' : colors.textMuted,
                  borderRadius: '6px', cursor: 'pointer',
                  fontFamily: fonts.body, fontWeight: '800', fontSize: '0.7rem',
                }}>{sel === 'drop' ? '✓ DROP' : 'Drop'}</button>
              </div>
            </div>
          );
        })}

        <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginBottom: '0.85rem', padding: '0.45rem 0.7rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
          💡 Dropped items are placed on the map — any player can pick them up later.
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button disabled={!allDecided} onClick={handleConfirm} style={{
            flex: 1, padding: '0.7rem',
            background: allDecided ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${allDecided ? '#10b981' : colors.textDisabled}`,
            color: allDecided ? '#d1fae5' : colors.textDisabled,
            borderRadius: '8px', cursor: allDecided ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '0.875rem',
          }}>✓ Confirm</button>
          <button onClick={onClose} style={{ ...btn.danger(), flex: 1, padding: '0.7rem', fontSize: '0.875rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Destroy Item Modal ─────────────────────────────────────────────────────────

export const DestroyItemModal = ({ attackerPlayer, targetPlayer: initTarget, targetUnitType: initUnit, allPlayers, onConfirm, onClose }) => {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState(initTarget?.id ? String(initTarget.id) : '');
  const [targetUnitType, setTargetUnitType] = useState(initUnit || '');

  const otherPlayers = (allPlayers || []).filter(p => p.id !== attackerPlayer?.id);
  const targetPlayer = initTarget || otherPlayers.find(p => p.id === parseInt(targetPlayerId));

  const availableUnits = targetPlayer ? getAllUnits(targetPlayer).filter(u => {
    if (u.isDead) return false;
    return (targetPlayer.inventory || []).some(it => it.heldBy === u.unitType && !it.isQuestItem);
  }) : [];

  const targetItems = targetPlayer && targetUnitType
    ? (targetPlayer.inventory || []).filter(it => it.heldBy === targetUnitType && !it.isQuestItem)
    : [];

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalShell, width: '420px', border: `1px solid ${colors.redBorder}` }}>
        <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>💥</div>
          <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display }}>Destroy Item</div>
          <div style={{ color: colors.textMuted, fontSize: '0.7rem', marginTop: '0.2rem' }}>Quest items are immune.</div>
        </div>

        {!initTarget && (
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={labelStyle}>Target Player</label>
            <select style={selectStyle} value={targetPlayerId} onChange={e => { setTargetPlayerId(e.target.value); setTargetUnitType(''); setSelectedItemId(null); }}>
              <option value="">Select player...</option>
              {otherPlayers.map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
        )}

        {targetPlayer && (
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={labelStyle}>Target Unit</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {availableUnits.map(u => (
                <div key={u.unitType} onClick={() => { setTargetUnitType(u.unitType); setSelectedItemId(null); }} style={{
                  display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0.7rem',
                  background: targetUnitType === u.unitType ? colors.redSubtle : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${targetUnitType === u.unitType ? colors.redBorder : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                }}>
                  <span style={{ color: targetUnitType === u.unitType ? '#fca5a5' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem', flex: 1 }}>{u.label}</span>
                  <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{u.hp}/{u.maxHp} HP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {targetPlayer && targetUnitType && (
          targetItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textFaint, padding: '0.85rem', fontSize: '0.82rem' }}>
              No destroyable items on this unit.
              {(targetPlayer.inventory || []).some(it => it.heldBy === targetUnitType && it.isQuestItem) && (
                <div style={{ color: '#fde68a', fontSize: '0.7rem', marginTop: '0.35rem' }}>Quest items cannot be destroyed.</div>
              )}
            </div>
          ) : (
            <>
              <label style={{ ...labelStyle, marginBottom: '0.35rem', display: 'block' }}>Choose item to destroy:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
                {targetItems.map(item => {
                  const c = TIERS[item.tier || 'Common'] || tierColors.Common;
                  const selected = selectedItemId === item.id;
                  return (
                    <div key={item.id} onClick={() => setSelectedItemId(item.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 0.8rem',
                      background: selected ? colors.redSubtle : c.bg,
                      border: `1px solid ${selected ? colors.red : c.border}`,
                      borderRadius: '8px', cursor: 'pointer',
                    }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? colors.red : colors.textFaint}`, background: selected ? colors.red : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', color: '#fff' }}>{selected && '✓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: selected ? '#fca5a5' : c.text, fontWeight: '900', fontSize: '0.83rem' }}>{item.name}</div>
                        {item.description && <div style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{item.description}</div>}
                      </div>
                      <span style={{ color: c.text, fontSize: '0.58rem', fontWeight: '800' }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button disabled={!selectedItemId} onClick={() => onConfirm(selectedItemId)} style={{
            flex: 1, padding: '0.7rem',
            background: selectedItemId ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${selectedItemId ? colors.red : colors.textDisabled}`,
            color: selectedItemId ? '#fca5a5' : colors.textDisabled,
            borderRadius: '8px', cursor: selectedItemId ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '0.875rem',
          }}>💥 Destroy Item</button>
          <button onClick={onClose} style={{ ...btn.secondary(), flex: 1, padding: '0.7rem', fontSize: '0.875rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};