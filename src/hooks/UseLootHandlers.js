import { useState } from 'react';

/**
 * useLootHandlers
 * All loot-related state and handlers extracted from HPCounter.
 * Covers: NPC loot, chest loot, DM drops, item steal, item destroy, hand-off.
 */
export const useLootHandlers = (players, updatePlayer, addLog, trackVP) => {
  const [npcLootClaim,   setNpcLootClaim]   = useState(null); // { npc, player }
  const [chestLootClaim, setChestLootClaim] = useState(null); // { items, player, requiredKeyName }
  const [stealModal,     setStealModal]     = useState(null); // { attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems }
  const [destroyModal,   setDestroyModal]   = useState(null); // { attackerPlayer, targetPlayer, targetUnitType, allPlayers }
  const [handOffModal,   setHandOffModal]   = useState(null); // { sourcePlayer, sourceUnitType, item }
  const [droppedItems,   setDroppedItems]   = useState([]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const buildLootItem = (item) => {
    const effect = item.effect || { type: 'manual', uses: 1 };
    return {
      id: item.id || `loot_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: item.name || 'Unknown Item',
      description: item.description || '',
      tier: item.tier || 'Common',
      isQuestItem: item.isQuestItem || false,
      // uses === 0 means unlimited; store 0 (not Infinity) so Firestore can serialize it
      effect: { ...effect, usesRemaining: effect.uses === 0 ? 0 : (effect.usesRemaining ?? effect.uses ?? 1) },
      heldBy: item.heldBy || null,
    };
  };

  const unitDisplayName = (player, heldBy) => {
    if (!heldBy) return 'unassigned';
    if (heldBy === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    return player.subUnits?.find(u => u.unitType === heldBy)?.name || heldBy;
  };

  const unitNameByType = (player, unitType) => {
    if (!unitType || unitType === 'commander') return player?.commanderStats?.customName || player?.commander || 'Commander';
    if (unitType === 'special') return player?.subUnits?.[0]?.name || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player?.subUnits?.[idx]?.name || `Unit ${idx}`;
  };

  // ── NPC loot ──────────────────────────────────────────────────────────────

  const handleConfirmNpcLoot = (assignedItems) => {
    if (!npcLootClaim) return;
    const { player } = npcLootClaim;
    const droppedIds = assignedItems.map(it => it.droppedItemId).filter(Boolean);
    const newItems = assignedItems.map(buildLootItem);
    let inv = (player.inventory || []).filter(it => !droppedIds.includes(it.id));
    inv = [...inv, ...newItems];
    updatePlayer(player.id, { inventory: inv });
    newItems.forEach(it => {
      const unitLabel = unitNameByType(player, it.heldBy);
      const dropped = droppedIds.length ? assignedItems.find(a => a.droppedItemId && a.heldBy === it.heldBy) : null;
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
    const victimPlayer  = players.find(p => p.id === victimPlayerId);
    const attackerPlayer = players.find(p => p.id === attackerPlayerId);
    if (!victimPlayer || !attackerPlayer) return;
    const victimItems = (victimPlayer.inventory || []).filter(it => it.heldBy === victimUnitType);
    if (victimItems.length === 0) return;
    setStealModal({ attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems });
  };

  const handleConfirmSteal = (takenItems, droppedItemsList, attackerUnitType) => {
    if (!stealModal) return;
    const { attackerPlayer, victimPlayer, victimUnitType } = stealModal;
    const remainingVictimInventory = (victimPlayer.inventory || []).filter(
      it => !(it.heldBy === victimUnitType && (takenItems.find(t => t.id === it.id) || droppedItemsList.find(d => d.id === it.id)))
    );
    updatePlayer(victimPlayer.id, { inventory: remainingVictimInventory });
    if (takenItems.length > 0) {
      const newItems = takenItems.map(it => ({ ...it, heldBy: attackerUnitType }));
      updatePlayer(attackerPlayer.id, { inventory: [...(attackerPlayer.inventory || []), ...newItems] });
      takenItems.forEach(it => addLog(`⚔️ ${attackerPlayer.playerName} stole "${it.name}" from ${victimPlayer.playerName}`));
    }
    if (droppedItemsList.length > 0) {
      setDroppedItems(prev => [...prev, ...droppedItemsList.map(it => ({ item: it, label: `${victimPlayer.playerName}'s ${victimUnitType}` }))]);
      droppedItemsList.forEach(it => addLog(`🗺️ "${it.name}" was dropped on the map`));
    }
    setStealModal(null);
  };

  // ── Destroy item ──────────────────────────────────────────────────────────

  const handleConfirmDestroy = (itemId) => {
    if (!destroyModal) return;
    // Remove destroyed item from target
    const targetPlayer = (destroyModal.allPlayers || players).find(p => (p.inventory || []).some(it => it.id === itemId));
    if (!targetPlayer) return;
    const item = (targetPlayer.inventory || []).find(it => it.id === itemId);
    if (!item) return;
    updatePlayer(targetPlayer.id, { inventory: (targetPlayer.inventory || []).filter(it => it.id !== itemId) });
    addLog(`💥 "${item.name}" was destroyed from ${targetPlayer.playerName}'s ${unitDisplayName(targetPlayer, item.heldBy)}`);
    // Consume the attacker's destroyItem from their inventory
    if (destroyModal.attackerItem && destroyModal.attackerPlayer) {
      const { attackerPlayer, attackerItem } = destroyModal;
      updatePlayer(attackerPlayer.id, { inventory: attackerItem.newInventory });
      addLog(`💥 ${attackerPlayer.playerName} used "${attackerItem.item.name}"`);
    }
    setDestroyModal(null);
  };

  // ── Chest loot ────────────────────────────────────────────────────────────

  // Called with ALL items from a chest at once to avoid React batch-update race
  const handleChestLoot = (items, playerId, requiredKeyName) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;
    const itemArray = Array.isArray(items) ? items : [items];
    const lootItems = itemArray.map(item => ({
      id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: item.name,
      description: item.description,
      tier: item.tier || 'Common',
      isQuestItem: item.isQuestItem || false,
      effect: { ...item.effect, usesRemaining: item.effect?.uses ?? 1 },
    }));
    setChestLootClaim({ player, items: lootItems, requiredKeyName: requiredKeyName || null });
  };

  const handleConfirmChestLoot = (assignedItems) => {
    if (!chestLootClaim) return;
    const { player, requiredKeyName } = chestLootClaim;
    const droppedIds = assignedItems.map(it => it.droppedItemId).filter(Boolean);
    const newItems = assignedItems.map(buildLootItem);
    let baseInventory = player.inventory || [];
    if (requiredKeyName?.trim()) {
      const nameLC = requiredKeyName.trim().toLowerCase();
      // Prefer a key-typed item with matching name; fall back to name-only match
      let keyIdx = baseInventory.findIndex(it =>
        it.effect?.type === 'key' &&
        it.name.trim().toLowerCase() === nameLC
      );
      if (keyIdx === -1) {
        keyIdx = baseInventory.findIndex(it => it.name.trim().toLowerCase() === nameLC);
      }
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
      const dropped = assignedItems.find(a => a.droppedItemId && a.heldBy === it.heldBy);
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
    const lootItem = {
      id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: item.name,
      description: item.description,
      tier: item.tier,
      effect: item.effect,
      heldBy: unitType,
      isQuestItem: item.isQuestItem || false,
    };
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

  // ── Hand Off (any unit → any unit) ────────────────────────────────────────

  const openHandOff = (sourcePlayer, sourceUnitType, item) => {
    setHandOffModal({ sourcePlayer, sourceUnitType, item });
  };

  const handleConfirmHandOff = (targetPlayerId, targetUnitType, mode, targetDroppedItem = null) => {
    if (!handOffModal) return;
    const { sourcePlayer, sourceUnitType, item } = handOffModal;

    // Always use fresh player data from the players array
    const freshSource = players.find(p => String(p.id) === String(sourcePlayer.id));
    const freshTarget = players.find(p => String(p.id) === String(targetPlayerId));
    if (!freshSource || !freshTarget) return;

    const isSamePlayer = String(freshSource.id) === String(freshTarget.id);
    const sourceUnitLabel = unitNameByType(freshSource, sourceUnitType);
    const targetUnitLabel = unitNameByType(freshTarget, targetUnitType);

    if (mode === 'give') {
      if (isSamePlayer) {
        // Moving between own units — do both operations atomically on one inventory
        let inv = (freshSource.inventory || []).filter(it => it.id !== item.id);
        if (targetDroppedItem) inv = inv.filter(it => it.id !== targetDroppedItem.id);
        inv = [...inv, { ...item, heldBy: targetUnitType }];
        updatePlayer(freshSource.id, { inventory: inv });
        addLog(`🔀 ${freshSource.playerName} moved "${item.name}" from ${sourceUnitLabel} to ${targetUnitLabel}`);
      } else {
        // Different players — remove from source first, then add to target
        const newSourceInv = (freshSource.inventory || []).filter(it => it.id !== item.id);
        updatePlayer(freshSource.id, { inventory: newSourceInv });

        let newTargetInv = (freshTarget.inventory || []);
        if (targetDroppedItem) newTargetInv = newTargetInv.filter(it => it.id !== targetDroppedItem.id);
        newTargetInv = [...newTargetInv, { ...item, heldBy: targetUnitType }];
        updatePlayer(String(targetPlayerId), { inventory: newTargetInv });

        addLog(`🎁 ${freshSource.playerName}'s ${sourceUnitLabel} gave "${item.name}" to ${freshTarget.playerName}'s ${targetUnitLabel}`);
      }
    } else if (mode === 'trade') {
      if (!targetDroppedItem) return;
      const tradedItem = (freshTarget.inventory || []).find(it => it.id === targetDroppedItem.id);
      if (!tradedItem) return;

      if (isSamePlayer) {
        // Swapping items between own units atomically
        let inv = (freshSource.inventory || [])
          .filter(it => it.id !== item.id && it.id !== tradedItem.id);
        inv = [...inv,
          { ...item, heldBy: targetUnitType },
          { ...tradedItem, heldBy: sourceUnitType },
        ];
        updatePlayer(freshSource.id, { inventory: inv });
        addLog(`⇄ ${freshSource.playerName} swapped "${item.name}" (${sourceUnitLabel}) with "${tradedItem.name}" (${targetUnitLabel})`);
      } else {
        // Cross-player trade — update both inventories independently
        const newSourceInv = (freshSource.inventory || [])
          .filter(it => it.id !== item.id)
          .concat({ ...tradedItem, heldBy: sourceUnitType });
        updatePlayer(freshSource.id, { inventory: newSourceInv });

        const newTargetInv = (freshTarget.inventory || [])
          .filter(it => it.id !== tradedItem.id)
          .concat({ ...item, heldBy: targetUnitType });
        updatePlayer(String(targetPlayerId), { inventory: newTargetInv });

        addLog(`⇄ ${freshSource.playerName}'s ${sourceUnitLabel} traded "${item.name}" with ${freshTarget.playerName}'s ${targetUnitLabel} for "${tradedItem.name}"`);
      }
    }

    setHandOffModal(null);
  };

  return {
    // State
    npcLootClaim,   setNpcLootClaim,
    chestLootClaim, setChestLootClaim,
    stealModal,     setStealModal,
    destroyModal,   setDestroyModal,
    handOffModal,   setHandOffModal,
    droppedItems,
    // Helpers
    buildLootItem,
    unitDisplayName,
    unitNameByType,
    // Handlers
    handleConfirmNpcLoot,
    checkForSteal,
    handleConfirmSteal,
    handleConfirmDestroy,
    handleChestLoot,
    handleConfirmChestLoot,
    handleDropLoot,
    openHandOff,
    handleConfirmHandOff,
  };
};