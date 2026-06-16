import { useState } from 'react';
import { unitNameByType } from '../utils/unitUtils';
import { generateId } from '../utils/idUtils';

/**
 * useLootHandlers
 * All loot-related state and handlers.
 * Covers: NPC loot, chest loot, DM drops, item steal, item destroy, hand-off.
 * Renamed from UseLootHandlers (uppercase U violated hooks convention).
 */
export const useLootHandlers = (players, updatePlayer, addLog, trackVP) => {
  const [npcLootClaim,   setNpcLootClaim]   = useState(null);
  const [chestLootClaim, setChestLootClaim] = useState(null);
  const [stealModal,     setStealModal]     = useState(null);
  const [destroyModal,   setDestroyModal]   = useState(null);
  const [handOffModal,   setHandOffModal]   = useState(null);
  const [droppedItems,   setDroppedItems]   = useState([]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * FIXED: `handleChestLoot` was bypassing this function and building items
   * inline — which broke the `uses === 0` (unlimited) handling.
   * Now all item construction goes through here.
   */
  const buildLootItem = (item) => {
    const effect = item.effect || { type: 'manual', uses: 1 };
    const tag    = item.tag || (item.isQuestItem ? 'quest' : 'reactive');
    return {
      id:          item.id || generateId('loot'),
      name:        item.name        || 'Unknown Item',
      description: item.description || '',
      tier:        item.tier        || 'Common',
      tag,
      isQuestItem: item.isQuestItem || tag === 'quest',
      // uses === 0 means unlimited — store 0 (not Infinity) so Firestore can serialize it
      effect: {
        ...effect,
        usesRemaining: effect.uses === 0 ? 0 : (effect.usesRemaining ?? effect.uses ?? 1),
      },
      heldBy: item.heldBy || null,
    };
  };

  const unitDisplayName = (player, heldBy) => {
    if (!heldBy) return 'unassigned';
    if (heldBy === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    return player.subUnits?.find(u => u.unitType === heldBy)?.name || heldBy;
  };

  // ── NPC loot ──────────────────────────────────────────────────────────────

  const handleConfirmNpcLoot = (assignedItems) => {
    if (!npcLootClaim) return;
    const { player }  = npcLootClaim;
    const droppedIds  = assignedItems.map(it => it.droppedItemId).filter(Boolean);
    const newItems    = assignedItems.map(buildLootItem);
    let   inv         = (player.inventory || []).filter(it => !droppedIds.includes(it.id));
    inv = [...inv, ...newItems];
    updatePlayer(player.id, { inventory: inv });
    newItems.forEach(it => {
      const unitLabel = unitNameByType(player, it.heldBy);
      const dropped   = droppedIds.length ? assignedItems.find(a => a.droppedItemId && a.heldBy === it.heldBy) : null;
      if (dropped?.droppedItemId) {
        const droppedName = (player.inventory || []).find(i => i.id === dropped.droppedItemId)?.name || 'item';
        addLog(`↕ ${player.playerName}'s ${unitLabel} swapped "${droppedName}" for "${it.name}"`);
      } else {
        addLog(`📦 ${player.playerName}'s ${unitLabel} received: ${it.name}`);
      }
    });
    trackVP(player.id, 'itemsObtained', newItems.length);
    setNpcLootClaim(null);
  };

  // ── Steal loot ────────────────────────────────────────────────────────────

  const checkForSteal = (attackerPlayerId, attackerUnitType, victimPlayerId, victimUnitType) => {
    const victimPlayer   = players.find(p => p.id === victimPlayerId);
    const attackerPlayer = players.find(p => p.id === attackerPlayerId);
    if (!victimPlayer || !attackerPlayer) return;
    const victimItems = (victimPlayer.inventory || []).filter(it => it.heldBy === victimUnitType);
    if (victimItems.length === 0) return;
    setStealModal({ attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems });
  };

  const handleConfirmSteal = (takenItems, droppedItemsList, attackerUnitType) => {
    if (!stealModal) return;
    const { attackerPlayer, victimPlayer, victimUnitType } = stealModal;
    const remainingVictim = (victimPlayer.inventory || []).filter(
      it => !(it.heldBy === victimUnitType && (takenItems.find(t => t.id === it.id) || droppedItemsList.find(d => d.id === it.id)))
    );
    updatePlayer(victimPlayer.id, { inventory: remainingVictim });
    if (takenItems.length > 0) {
      const newItems = takenItems.map(it => ({ ...it, heldBy: attackerUnitType }));
      updatePlayer(attackerPlayer.id, { inventory: [...(attackerPlayer.inventory || []), ...newItems] });
      takenItems.forEach(it => addLog(`⚔️ ${attackerPlayer.playerName} stole "${it.name}" from ${victimPlayer.playerName}`));
    }
    if (droppedItemsList.length > 0) {
      setDroppedItems(prev => [...prev, ...droppedItemsList.map(it => ({
        item: it, label: `${victimPlayer.playerName}'s ${victimUnitType}`,
      }))]);
      droppedItemsList.forEach(it => addLog(`🗺️ "${it.name}" was dropped on the map`));
    }
    setStealModal(null);
  };

  // ── Destroy item ──────────────────────────────────────────────────────────

  const handleConfirmDestroy = (itemId) => {
    if (!destroyModal) return;
    const targetPlayer = (destroyModal.allPlayers || players).find(p => (p.inventory || []).some(it => it.id === itemId));
    if (!targetPlayer) return;
    const item = (targetPlayer.inventory || []).find(it => it.id === itemId);
    if (!item) return;
    updatePlayer(targetPlayer.id, { inventory: (targetPlayer.inventory || []).filter(it => it.id !== itemId) });
    addLog(`💥 "${item.name}" was destroyed from ${targetPlayer.playerName}'s ${unitDisplayName(targetPlayer, item.heldBy)}`);
    if (destroyModal.attackerItem && destroyModal.attackerPlayer) {
      const { attackerPlayer, attackerItem } = destroyModal;
      updatePlayer(attackerPlayer.id, { inventory: attackerItem.newInventory });
      addLog(`💥 ${attackerPlayer.playerName} used "${attackerItem.item.name}"`);
    }
    setDestroyModal(null);
  };

  // ── Chest loot ────────────────────────────────────────────────────────────

  const handleChestLoot = (items, playerId, requiredKeyName) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;
    const itemArray = Array.isArray(items) ? items : [items];
    // FIXED: now routes through buildLootItem so unlimited items (uses===0) are handled correctly
    const lootItems = itemArray.map(buildLootItem);
    setChestLootClaim({ player, items: lootItems, requiredKeyName: requiredKeyName || null });
  };

  const handleConfirmChestLoot = (assignedItems) => {
    if (!chestLootClaim) return;
    const { player, requiredKeyName } = chestLootClaim;
    const droppedIds = assignedItems.map(it => it.droppedItemId).filter(Boolean);
    const newItems   = assignedItems.map(buildLootItem);

    let baseInventory = player.inventory || [];
    if (requiredKeyName?.trim()) {
      const nameLC = requiredKeyName.trim().toLowerCase();
      let keyIdx = baseInventory.findIndex(it => it.effect?.type === 'key' && it.name.trim().toLowerCase() === nameLC);
      if (keyIdx === -1) keyIdx = baseInventory.findIndex(it => it.name.trim().toLowerCase() === nameLC);
      if (keyIdx !== -1) {
        addLog(`🔑 "${baseInventory[keyIdx].name}" was used to open the chest.`, 'items');
        baseInventory = baseInventory.filter((_, i) => i !== keyIdx);
      }
    }

    let inv = baseInventory.filter(it => !droppedIds.includes(it.id));
    inv = [...inv, ...newItems];
    updatePlayer(player.id, { inventory: inv });

    newItems.forEach(it => {
      const unitLabel = unitNameByType(player, it.heldBy);
      const dropped   = assignedItems.find(a => a.droppedItemId && a.heldBy === it.heldBy);
      if (dropped?.droppedItemId) {
        const droppedName = (player.inventory || []).find(i => i.id === dropped.droppedItemId)?.name || 'item';
        addLog(`↕ ${player.playerName}'s ${unitLabel} swapped "${droppedName}" for "${it.name}"`);
      } else {
        addLog(`📦 ${player.playerName}'s ${unitLabel} received: ${it.name}`);
      }
    });
    trackVP(player.id, 'itemsObtained', newItems.length);
    setChestLootClaim(null);
  };

  // ── DM manual drop ────────────────────────────────────────────────────────

  const handleDropLoot = (item, playerId, unitType, droppedItem = null) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;
    const lootItem = buildLootItem({ ...item, heldBy: unitType });
    const unitLabel = unitNameByType(player, unitType);
    let newInventory = [...(player.inventory || []), lootItem];
    if (droppedItem) {
      newInventory = newInventory.filter(it => it.id !== droppedItem.id);
      addLog(`↕ ${player.playerName}'s ${unitLabel} swapped "${droppedItem.name}" for "${item.name}"`);
    } else {
      addLog(`🎁 ${player.playerName}'s ${unitLabel} received: ${item.name}`);
    }
    updatePlayer(playerId, { inventory: newInventory });
    if (!item.isQuestItem) trackVP(playerId, 'itemsObtained', 1);
  };

  // ── Hand Off ──────────────────────────────────────────────────────────────

  const openHandOff = (sourcePlayer, sourceUnitType, item) => {
    setHandOffModal({ sourcePlayer, sourceUnitType, item });
  };

  const handleConfirmHandOff = (targetPlayerId, targetUnitType, mode, targetDroppedItem = null) => {
    if (!handOffModal) return;
    const { sourcePlayer, sourceUnitType, item } = handOffModal;

    const freshSource = players.find(p => String(p.id) === String(sourcePlayer.id));
    const freshTarget = players.find(p => String(p.id) === String(targetPlayerId));
    if (!freshSource || !freshTarget) return;

    const isSamePlayer   = String(freshSource.id) === String(freshTarget.id);
    const srcLabel       = unitNameByType(freshSource, sourceUnitType);
    const tgtLabel       = unitNameByType(freshTarget, targetUnitType);

    if (mode === 'give') {
      if (isSamePlayer) {
        let inv = (freshSource.inventory || []).filter(it => it.id !== item.id);
        if (targetDroppedItem) inv = inv.filter(it => it.id !== targetDroppedItem.id);
        updatePlayer(freshSource.id, { inventory: [...inv, { ...item, heldBy: targetUnitType }] });
        addLog(`🔀 ${freshSource.playerName} moved "${item.name}" from ${srcLabel} to ${tgtLabel}`);
      } else {
        updatePlayer(freshSource.id, { inventory: (freshSource.inventory || []).filter(it => it.id !== item.id) });
        let newTargetInv = freshTarget.inventory || [];
        if (targetDroppedItem) newTargetInv = newTargetInv.filter(it => it.id !== targetDroppedItem.id);
        updatePlayer(String(targetPlayerId), { inventory: [...newTargetInv, { ...item, heldBy: targetUnitType }] });
        addLog(`🎁 ${freshSource.playerName}'s ${srcLabel} gave "${item.name}" to ${freshTarget.playerName}'s ${tgtLabel}`);
      }
    } else if (mode === 'trade') {
      if (!targetDroppedItem) return;
      const tradedItem = (freshTarget.inventory || []).find(it => it.id === targetDroppedItem.id);
      if (!tradedItem) return;

      if (isSamePlayer) {
        let inv = (freshSource.inventory || []).filter(it => it.id !== item.id && it.id !== tradedItem.id);
        inv = [...inv, { ...item, heldBy: targetUnitType }, { ...tradedItem, heldBy: sourceUnitType }];
        updatePlayer(freshSource.id, { inventory: inv });
        addLog(`⇄ ${freshSource.playerName} swapped "${item.name}" (${srcLabel}) with "${tradedItem.name}" (${tgtLabel})`);
      } else {
        updatePlayer(freshSource.id, {
          inventory: (freshSource.inventory || []).filter(it => it.id !== item.id).concat({ ...tradedItem, heldBy: sourceUnitType }),
        });
        updatePlayer(String(targetPlayerId), {
          inventory: (freshTarget.inventory || []).filter(it => it.id !== tradedItem.id).concat({ ...item, heldBy: targetUnitType }),
        });
        addLog(`⇄ ${freshSource.playerName}'s ${srcLabel} traded "${item.name}" with ${freshTarget.playerName}'s ${tgtLabel} for "${tradedItem.name}"`);
      }
    }

    setHandOffModal(null);
  };

  return {
    npcLootClaim,   setNpcLootClaim,
    chestLootClaim, setChestLootClaim,
    stealModal,     setStealModal,
    destroyModal,   setDestroyModal,
    handOffModal,   setHandOffModal,
    droppedItems,
    buildLootItem,
    unitDisplayName,
    unitNameByType,
    handleConfirmNpcLoot,
    checkForSteal, handleConfirmSteal,
    handleConfirmDestroy,
    handleChestLoot, handleConfirmChestLoot,
    handleDropLoot,
    openHandOff, handleConfirmHandOff,
  };
};
