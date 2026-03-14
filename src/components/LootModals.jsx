import React, { useState } from 'react';
import { getSlotCount, getHeldCount, unitIsFull } from './lootUtils';

const gold = '#c9a961';

const TIER_COLORS = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
  Quest:     { border: 'rgba(234,179,8,0.6)',   text: '#fde68a', bg: 'rgba(234,179,8,0.1)'    },
};


const getAllUnits = (player) => {
  if (!player) return [];
  const units = [{ unitType: 'commander', label: 'Commander', hp: player.commanderStats?.hp ?? 0, maxHp: player.commanderStats?.maxHp ?? 0, isDead: player.commanderStats?.isDead ?? false }];
  if (player.subUnits && player.subUnits.length > 0) {
    player.subUnits.forEach((u, i) => {
      const unitType = u.unitType || (i === 0 ? 'special' : `soldier${i}`);
      units.push({ unitType, label: u.name || unitType, hp: u.hp ?? 0, maxHp: u.maxHp ?? 0, isDead: u.hp === 0 });
    });
  }
  return units;
};

const UnitPicker = ({ player, selectedUnit, onSelect, checkFull, item }) => {
  const units = getAllUnits(player);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {units.map(u => {
        const full = checkFull && !item?.isQuestItem && unitIsFull(player, u.unitType);
        const selected = selectedUnit === u.unitType;
        const disabled = u.isDead || full;
        return (
          <div key={u.unitType} onClick={() => !disabled && onSelect(u.unitType)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.55rem 0.85rem',
            background: selected ? 'rgba(201,169,97,0.12)' : disabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)',
            border: `2px solid ${selected ? gold : disabled ? 'rgba(55,65,81,0.5)' : 'rgba(90,74,58,0.3)'}`,
            borderRadius: '7px', cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: selected ? gold : disabled ? '#4b5563' : '#9ca3af', fontWeight: '800', fontSize: '0.82rem' }}>
                {u.label}
              </span>
            </div>
            {/* HP bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '60px', height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0}%`, height: '100%', background: u.isDead ? '#374151' : '#22c55e', borderRadius: '3px' }} />
              </div>
              <span style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '700', minWidth: '36px' }}>{u.hp}/{u.maxHp}</span>
            </div>
            {full && !item?.isQuestItem && <span style={{ color: '#ef4444', fontSize: '0.6rem', fontWeight: '800' }}>FULL</span>}
            {u.isDead && <span style={{ color: '#6b7280', fontSize: '0.6rem', fontWeight: '800' }}>DEAD</span>}
            {item?.isQuestItem && !u.isDead && <span style={{ color: '#fde68a', fontSize: '0.6rem', fontWeight: '800' }}>QUEST</span>}
          </div>
        );
      })}
    </div>
  );
};

// ── NPC Loot Modal ────────────────────────────────────────────────────────────
// Shows after an NPC is killed. Player assigns each dropped item to a unit.

export const NpcLootModal = ({ npc, player: initPlayer, players, onConfirm, onClose }) => {
  const lootTable = npc.lootTable || [];
  const [selectedPlayerId, setSelectedPlayerId] = useState(initPlayer?.id ? String(initPlayer.id) : '');
  const [expandedItem, setExpandedItem] = useState(null); // index of item whose unit picker is open
  const [assignments, setAssignments] = useState(() => lootTable.map(() => null));

  const player = initPlayer || (players || []).find(p => p.id === parseInt(selectedPlayerId));
  const allAssigned = assignments.every(a => a !== null);
  const getUnitType = (a) => (typeof a === 'object' && a !== null) ? a.unitType : a;
  const getDroppedId = (a) => (typeof a === 'object' && a !== null) ? a.droppedItemId : null;

  const handleConfirm = () => {
    const result = lootTable.map((item, i) => ({
      ...item,
      heldBy: getUnitType(assignments[i]),
      droppedItemId: getDroppedId(assignments[i]),
    }));
    onConfirm(result);
  };

  const assign = (itemIndex, unitType) => {
    const isSwap = !lootTable[itemIndex]?.isQuestItem && unitIsFull(player, unitType);
    const dropped = isSwap ? (player?.inventory || []).find(it => it.heldBy === unitType && !it.isQuestItem) : null;
    setAssignments(prev => { const next = [...prev]; next[itemIndex] = { unitType, droppedItemId: dropped?.id || null }; return next; });
    setExpandedItem(null);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 3000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
        border: `3px solid ${gold}`, borderRadius: '12px',
        padding: '1.5rem', width: '440px', maxWidth: '95%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💀</div>
          <div style={{ color: gold, fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel", Georgia, serif' }}>
            {npc.name} Defeated!
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.25rem' }}>
            Assign each item to a unit
          </div>
        </div>

        {/* Player picker (if not pre-set) */}
        {!initPlayer && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#8b7355', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
              Who dealt the killing blow?
            </label>
            <select value={selectedPlayerId} onChange={e => { setSelectedPlayerId(e.target.value); setAssignments(lootTable.map(() => null)); setExpandedItem(null); }} style={{
              width: '100%', background: '#0a0503', color: gold,
              padding: '0.6rem 0.75rem', borderRadius: '6px',
              border: '1px solid #5a4a3a', fontFamily: 'inherit', fontSize: '0.875rem',
            }}>
              <option value="">Select player...</option>
              {(players || []).map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
        )}

        {/* Item cards */}
        {lootTable.map((item, i) => {
          const tier = item.isQuestItem ? 'Quest' : (item.tier || 'Common');
          const c = TIER_COLORS[tier] || TIER_COLORS.Common;
          const assigned = assignments[i];
          const isOpen = expandedItem === i;
          const units = player ? getAllUnits(player) : [];

          return (
            <div key={item.id || i} style={{ marginBottom: '0.6rem' }}>
              {/* Clickable item row */}
              <div
                onClick={() => player && setExpandedItem(isOpen ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  background: assigned ? 'rgba(34,197,94,0.08)' : c.bg,
                  border: `2px solid ${assigned ? 'rgba(34,197,94,0.4)' : isOpen ? gold : c.border}`,
                  borderRadius: isOpen ? '8px 8px 0 0' : '8px',
                  cursor: player ? 'pointer' : 'default',
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: assigned ? '#86efac' : c.text, fontWeight: '900', fontSize: '0.88rem' }}>
                    {item.name || 'Unnamed Item'}
                  </div>
                  {item.description && <div style={{ color: '#6b7280', fontSize: '0.67rem' }}>{item.description}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                  <span style={{ padding: '0.1rem 0.4rem', background: `${c.text}18`, border: `1px solid ${c.border}`, borderRadius: '4px', color: c.text, fontSize: '0.58rem', fontWeight: '800' }}>{tier}</span>
                  {item.isQuestItem && <span style={{ padding: '0.1rem 0.35rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '4px', color: '#fde68a', fontSize: '0.58rem', fontWeight: '800' }}>QUEST</span>}
                </div>
                <div style={{ color: assigned ? '#4ade80' : '#6b7280', fontSize: '0.75rem', flexShrink: 0 }}>
                  {assigned ? `✓ ${getUnitType(assigned) === 'commander' ? player?.commanderStats?.customName || player?.commander || 'Commander' : (player?.subUnits?.find(u => u.unitType === getUnitType(assigned))?.name || getUnitType(assigned))}` : (player ? (isOpen ? '▲' : '▼ Assign') : '—')}
                </div>
              </div>

              {/* Expanded unit picker */}
              {isOpen && player && (
                <div style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: `2px solid ${gold}`, borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '0.75rem',
                }}>
                  <div style={{ color: '#8b7355', fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Assign to unit:
                  </div>
                  {units.map(u => {
                    const full = !item.isQuestItem && unitIsFull(player, u.unitType);
                    const disabled = u.isDead;
                    const isSwap = full && !u.isDead;
                    const currentItem = isSwap
                      ? (player.inventory || []).find(it => it.heldBy === u.unitType && !it.isQuestItem)
                      : null;
                    return (
                      <div key={u.unitType}>
                        <div onClick={() => !disabled && assign(i, u.unitType)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.5rem 0.75rem', marginBottom: currentItem ? '0' : '0.3rem',
                          background: disabled ? 'rgba(0,0,0,0.2)' : isSwap ? 'rgba(249,115,22,0.07)' : 'rgba(0,0,0,0.4)',
                          border: `1px solid ${disabled ? 'rgba(55,65,81,0.4)' : isSwap ? 'rgba(249,115,22,0.4)' : 'rgba(201,169,97,0.25)'}`,
                          borderRadius: currentItem ? '6px 6px 0 0' : '6px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.45 : 1,
                        }}>
                          <span style={{ color: disabled ? '#4b5563' : isSwap ? '#f97316' : '#9ca3af', fontWeight: '800', fontSize: '0.8rem', flex: 1 }}>
                            {u.label}
                          </span>
                          <div style={{ width: '50px', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0}%`, height: '100%', background: u.isDead ? '#374151' : '#22c55e', borderRadius: '2px' }} />
                          </div>
                          <span style={{ color: '#4b5563', fontSize: '0.62rem', minWidth: '32px', textAlign: 'right' }}>{u.hp}/{u.maxHp}</span>
                          {isSwap && <span style={{ color: '#f97316', fontSize: '0.58rem', fontWeight: '800' }}>↕ SWAP</span>}
                          {u.isDead && <span style={{ color: '#6b7280', fontSize: '0.58rem', fontWeight: '800' }}>DEAD</span>}
                        </div>
                        {currentItem && (
                          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.3)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.3rem 0.75rem', marginBottom: '0.3rem' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.62rem' }}>Drops: </span>
                            <span style={{ color: '#fbbf24', fontSize: '0.62rem', fontWeight: '800' }}>{currentItem.name}</span>
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

        {/* No player selected hint */}
        {!player && (
          <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.8rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
            Select the killing player above to assign items.
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button disabled={!allAssigned || !player} onClick={handleConfirm} style={{
            flex: 1, padding: '0.75rem',
            background: (allAssigned && player) ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
            border: `2px solid ${(allAssigned && player) ? '#10b981' : '#374151'}`,
            color: (allAssigned && player) ? '#d1fae5' : '#4a3322',
            borderRadius: '8px', cursor: (allAssigned && player) ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>✓ Confirm Loot</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
            color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>Skip</button>
        </div>
      </div>
    </div>
  );
};

// ── Steal Loot Modal ──────────────────────────────────────────────────────────
// Shows when a player kills an enemy unit that holds items.
// attackerPlayer = player who got the kill, attackerUnitType = unit they used
// victimPlayer = player whose unit died, victimUnitType = unit that died
// victimItems = items held by the dead unit

export const StealLootModal = ({ attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems, onConfirm, onClose }) => {
  // selections: map itemId → 'take' | 'drop' | null
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(victimItems.map(it => [it.id, null]))
  );

  const attackerFull = unitIsFull(attackerPlayer, attackerUnitType);
  const attackerSlots = getSlotCount(attackerPlayer, attackerUnitType);
  const attackerHeld = getHeldCount(attackerPlayer, attackerUnitType);
  const takenCount = Object.values(selections).filter(v => v === 'take').length;
  const availableSlots = attackerSlots - attackerHeld;

  const allDecided = victimItems.every(it => selections[it.id] !== null);

  const toggleItem = (itemId, item) => {
    setSelections(prev => {
      const current = prev[itemId];
      if (item.isQuestItem) {
        // Quest items can always be taken (no slot check)
        return { ...prev, [itemId]: current === 'take' ? 'drop' : 'take' };
      }
      if (current === 'take') {
        return { ...prev, [itemId]: 'drop' };
      }
      // Check if attacker has room
      const nonQuestTaken = victimItems.filter(it => !it.isQuestItem && prev[it.id] === 'take').length;
      if (nonQuestTaken >= availableSlots) return prev; // full
      return { ...prev, [itemId]: 'take' };
    });
  };

  const handleConfirm = () => {
    const taken = victimItems.filter(it => selections[it.id] === 'take');
    const dropped = victimItems.filter(it => selections[it.id] === 'drop');
    onConfirm(taken, dropped, attackerUnitType);
  };

  const attackerUnits = getAllUnits(attackerPlayer);
  const attackerUnit = attackerUnits.find(u => u.unitType === attackerUnitType);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 3000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
        border: `3px solid rgba(239,68,68,0.6)`, borderRadius: '12px',
        padding: '1.5rem', width: '440px', maxWidth: '95%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⚔️</div>
          <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel", Georgia, serif' }}>
            Unit Eliminated!
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
            <span style={{ color: '#f87171' }}>{victimPlayer.playerName}'s {victimUnitType === 'commander' ? 'Commander' : victimUnitType}</span> was killed by{' '}
            <span style={{ color: gold }}>{attackerPlayer.playerName}'s {attackerUnit?.label || attackerUnitType}</span>
          </div>
        </div>

        {/* Attacker slot info */}
        <div style={{
          padding: '0.5rem 0.85rem', marginBottom: '1rem',
          background: attackerFull ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${attackerFull ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`,
          borderRadius: '7px',
        }}>
          <span style={{ color: attackerFull ? '#fca5a5' : '#86efac', fontWeight: '800', fontSize: '0.78rem' }}>
            {attackerPlayer.playerName}'s {attackerUnit?.label}: {attackerHeld}/{attackerSlots} slots used
            {attackerFull ? ' — FULL (can only take quest items)' : ` — ${availableSlots} slot${availableSlots !== 1 ? 's' : ''} available`}
          </span>
        </div>

        {/* Items */}
        <div style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Items on {victimUnitType === 'commander' ? 'Commander' : victimUnitType} — choose fate:
        </div>

        {victimItems.map(item => {
          const tier = item.isQuestItem ? 'Quest' : (item.tier || 'Common');
          const c = TIER_COLORS[tier] || TIER_COLORS.Common;
          const sel = selections[item.id];
          const canTake = item.isQuestItem || (getHeldCount(attackerPlayer, attackerUnitType) + victimItems.filter(it => !it.isQuestItem && selections[it.id] === 'take').length < attackerSlots);

          return (
            <div key={item.id} style={{ marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.85rem', background: c.bg, border: `2px solid ${c.border}`, borderRadius: '8px', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '1rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: c.text, fontWeight: '900', fontSize: '0.85rem' }}>{item.name}</div>
                  {item.description && <div style={{ color: '#6b7280', fontSize: '0.65rem' }}>{item.description}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-end' }}>
                  <span style={{ color: c.text, fontSize: '0.6rem', fontWeight: '800' }}>{tier}</span>
                  {item.isQuestItem && <span style={{ color: '#fde68a', fontSize: '0.6rem', fontWeight: '800' }}>QUEST</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => toggleItem(item.id, item)} disabled={sel !== 'take' && !canTake} style={{
                  flex: 1, padding: '0.4rem',
                  background: sel === 'take' ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${sel === 'take' ? '#22c55e' : 'rgba(55,65,81,0.5)'}`,
                  color: sel === 'take' ? '#86efac' : (canTake || sel === 'take') ? '#6b7280' : '#374151',
                  borderRadius: '6px', cursor: (sel !== 'take' && !canTake) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontWeight: '800', fontSize: '0.72rem',
                }}>
                  {sel === 'take' ? '✓ TAKE' : item.isQuestItem ? '🗝️ Take Quest Item' : canTake ? 'Take' : 'No room'}
                </button>
                <button onClick={() => setSelections(prev => ({ ...prev, [item.id]: 'drop' }))} style={{
                  flex: 1, padding: '0.4rem',
                  background: sel === 'drop' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${sel === 'drop' ? '#ef4444' : 'rgba(55,65,81,0.5)'}`,
                  color: sel === 'drop' ? '#fca5a5' : '#6b7280',
                  borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: '800', fontSize: '0.72rem',
                }}>
                  {sel === 'drop' ? '✓ DROP' : 'Drop on ground'}
                </button>
              </div>
            </div>
          );
        })}

        <div style={{ color: '#4b5563', fontSize: '0.68rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
          💡 Dropped items are placed on the map — any player can pick them up later.
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button disabled={!allDecided} onClick={handleConfirm} style={{
            flex: 1, padding: '0.75rem',
            background: allDecided ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
            border: `2px solid ${allDecided ? '#10b981' : '#374151'}`,
            color: allDecided ? '#d1fae5' : '#4a3322',
            borderRadius: '8px', cursor: allDecided ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>✓ Confirm</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
            color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Destroy Item Modal ────────────────────────────────────────────────────────
// Step 1: pick target player + unit. Step 2: pick item to destroy.
// allPlayers is passed when no target is pre-selected.

export const DestroyItemModal = ({ attackerPlayer, targetPlayer: initTarget, targetUnitType: initUnit, allPlayers, onConfirm, onClose }) => {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState(initTarget?.id ? String(initTarget.id) : '');
  const [targetUnitType, setTargetUnitType] = useState(initUnit || '');

  const otherPlayers = (allPlayers || []).filter(p => p.id !== attackerPlayer?.id);
  const targetPlayer = initTarget || otherPlayers.find(p => p.id === parseInt(targetPlayerId));

  const availableUnits = targetPlayer ? getAllUnits(targetPlayer).filter(u => !u.isDead) : [];
  const targetItems = targetPlayer && targetUnitType
    ? (targetPlayer.inventory || []).filter(it => it.heldBy === targetUnitType && !it.isQuestItem)
    : [];

  const unitLabel = targetUnitType === 'commander' ? 'Commander' : targetUnitType;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 3000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
        border: `3px solid rgba(239,68,68,0.6)`, borderRadius: '12px',
        padding: '1.5rem', width: '420px', maxWidth: '95%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💥</div>
          <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel", Georgia, serif' }}>
            Destroy Item
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '0.25rem' }}>
            Quest items are immune. Non-quest items only.
          </div>
        </div>

        {/* Target player picker (if not pre-set) */}
        {!initTarget && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Target Player</label>
            <select style={selectStyle} value={targetPlayerId} onChange={e => { setTargetPlayerId(e.target.value); setTargetUnitType(''); setSelectedItemId(null); }}>
              <option value="">Select player...</option>
              {otherPlayers.map(p => <option key={p.id} value={p.id}>{p.playerName}</option>)}
            </select>
          </div>
        )}

        {/* Target unit picker */}
        {targetPlayer && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Target Unit</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {availableUnits.map(u => (
                <div key={u.unitType} onClick={() => { setTargetUnitType(u.unitType); setSelectedItemId(null); }} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.45rem 0.75rem',
                  background: targetUnitType === u.unitType ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${targetUnitType === u.unitType ? 'rgba(239,68,68,0.5)' : 'rgba(55,65,81,0.4)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                }}>
                  <span style={{ color: targetUnitType === u.unitType ? '#fca5a5' : '#9ca3af', fontWeight: '800', fontSize: '0.8rem', flex: 1 }}>{u.label}</span>
                  <span style={{ color: '#4b5563', fontSize: '0.62rem' }}>{u.hp}/{u.maxHp} HP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item list */}
        {targetPlayer && targetUnitType && (
          targetItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4b5563', padding: '1rem', fontSize: '0.85rem' }}>
              No destroyable items on this unit.
              {(targetPlayer.inventory || []).some(it => it.heldBy === targetUnitType && it.isQuestItem) && (
                <div style={{ color: '#fde68a', fontSize: '0.72rem', marginTop: '0.4rem' }}>Quest items cannot be destroyed.</div>
              )}
            </div>
          ) : (
            <>
              <label style={{ ...labelStyle, marginBottom: '0.4rem', display: 'block' }}>Choose item to destroy:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {targetItems.map(item => {
                  const tier = item.tier || 'Common';
                  const c = TIER_COLORS[tier] || TIER_COLORS.Common;
                  const selected = selectedItemId === item.id;
                  return (
                    <div key={item.id} onClick={() => setSelectedItemId(item.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.65rem 0.85rem',
                      background: selected ? 'rgba(239,68,68,0.15)' : c.bg,
                      border: `2px solid ${selected ? '#ef4444' : c.border}`,
                      borderRadius: '8px', cursor: 'pointer',
                    }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? '#ef4444' : '#4b5563'}`, background: selected ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#fff' }}>{selected && '✓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: selected ? '#fca5a5' : c.text, fontWeight: '900', fontSize: '0.85rem' }}>{item.name}</div>
                        {item.description && <div style={{ color: '#6b7280', fontSize: '0.65rem' }}>{item.description}</div>}
                      </div>
                      <span style={{ color: c.text, fontSize: '0.6rem', fontWeight: '800' }}>{tier}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button disabled={!selectedItemId} onClick={() => onConfirm(selectedItemId)} style={{
            flex: 1, padding: '0.75rem',
            background: selectedItemId ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : '#1a0f0a',
            border: `2px solid ${selectedItemId ? '#ef4444' : '#374151'}`,
            color: selectedItemId ? '#fca5a5' : '#4a3322',
            borderRadius: '8px', cursor: selectedItemId ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>💥 Destroy Item</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            background: 'rgba(55,65,81,0.3)', border: '2px solid #374151',
            color: '#9ca3af', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const labelStyle = { color: '#8b7355', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' };
const selectStyle = { width: '100%', background: '#0a0503', color: '#c9a961', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #5a4a3a', fontFamily: 'inherit', fontSize: '0.875rem', boxSizing: 'border-box', cursor: 'pointer' };