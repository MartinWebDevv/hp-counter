import React from "react";
import { useGameState } from "../hooks/useGameState";
import { useDamageCalculation } from "../hooks/useDamageCalculation";
import { useNPCState } from "../hooks/useNPCState";
import { NpcLootModal, StealLootModal, DestroyItemModal } from "./LootModals";

const gold = '#c9a961';
import PlayerCard from "./PlayerCard";
import Calculator from "./Calculator";
import DamageDistribution from "./DamageDistribution";
import LogPanel from "./LogPanel";
import StatsModal from "./StatsModal";
import GameModeSelector from "./GameModeSelector";
import SquadReviveModal from "./SquadReviveModal";
import DMPanel from "./DMPanel";
import LootPanel from "./LootPanel";
import ChestPanel from "./ChestPanel";
import { getModeConfig } from "../data/gameModes";

const HPCounter = () => {
  // ── Game state ────────────────────────────────────────────────────────────
  const {
    players,
    currentRound,
    combatLog,
    gameMode,
    customModeSettings,
    currentPlayerIndex,
    playersWhoActedThisRound,
    gameStarted,
    setPlayers,
    addPlayer,
    removePlayer,
    reorderPlayers,
    updatePlayer,
    toggleSquad,
    useRevive,
    changeGameMode,
    getModeValues,
    startGame,
    endTurn,
    undo,
    addLog,
    clearLog,
    loadGameState,
    processSquadRevive,
    lootPool,
    setLootPool,
    resetCombat,
  } = useGameState();

  // ── Chest state ────────────────────────────────────────────────────────────
  const [chests, setChests] = React.useState(() => {
    try {
      const saved = localStorage.getItem('hpCounterChests');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('hpCounterChests', JSON.stringify(chests)); }
    catch (e) { console.error('Error saving chests:', e); }
  }, [chests]);

  // ── NPC state (campaign mode) ─────────────────────────────────────────────
  const {
    npcs,
    activeNPCs,
    inactiveNPCs,
    deadNPCs,
    showNPCCreator,
    editingNPCId,
    blankNPC,
    blankAttack,
    blankPhase,
    openCreator,
    closeCreator,
    saveNPC,
    removeNPC,
    activateNPC,
    deactivateNPC,
    applyDamageToNPC,
    setNPCHP,
    triggerNextPhase,
    getNPCById,
    setNpcs,
  } = useNPCState(addLog, (killedNPC) => {
    const attackingPlayer = players.find(p => p.id === lastAttackerIdRef.current) || null;
    setNpcLootClaim({ npc: killedNPC, player: attackingPlayer });
  });

  // ── Campaign turn rotation ─────────────────────────────────────────────────
  // ── Loot modal states ──────────────────────────────────────────────────────
  const [npcLootClaim, setNpcLootClaim] = React.useState(null);   // {npc, player}
  const [chestLootClaim, setChestLootClaim] = React.useState(null); // {items, player}
  const lastAttackerIdRef = React.useRef(null); // tracks who last attacked for NPC loot
  const [stealModal, setStealModal] = React.useState(null);        // {attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems}
  const [destroyModal, setDestroyModal] = React.useState(null);    // {attackerPlayer, targetPlayer, targetUnitType, itemId}
  const [droppedItems, setDroppedItems] = React.useState([]);      // [{item, label}] shown in log

  // Turn order = players + active NPCs interleaved.
  // turnOrder is an array of { type: 'player'|'npc', id }
  const [campaignTurnIndex, setCampaignTurnIndex] = React.useState(0);
  const [npcsWhoActedThisRound, setNpcsWhoActedThisRound] = React.useState([]);

  const isCampaign = gameMode === 'campaign';

  // Build the turn order list for campaign mode
  const buildTurnOrder = () => {
    const order = [];
    players.forEach(p => order.push({ type: 'player', id: p.id }));
    activeNPCs.forEach(n => order.push({ type: 'npc', id: n.id }));
    return order;
  };

  const campaignTurnOrder = isCampaign ? buildTurnOrder() : [];
  const currentCampaignTurn = campaignTurnOrder[campaignTurnIndex] || null;

  // Who is "current" in campaign mode
  const currentCampaignPlayerId = currentCampaignTurn?.type === 'player' ? currentCampaignTurn.id : null;
  const currentCampaignNPCId = currentCampaignTurn?.type === 'npc' ? currentCampaignTurn.id : null;

  // Sync currentPlayerIndex with campaign turn for PlayerCard highlighting
  const effectivePlayerIndex = isCampaign
    ? players.findIndex(p => p.id === currentCampaignPlayerId)
    : currentPlayerIndex;

  // ── Damage calculation ────────────────────────────────────────────────────
  const {
    showCalculator,
    showDamageDistribution,
    calculatorData,
    damageDistribution,
    openCalculator,
    closeCalculator,
    updateDamageDistribution,
    setShowDamageDistribution,
    setCalculatorData,
    applyDamage,
  } = useDamageCalculation(players, addLog);

  // ── NPC Attack (NPC → Player) calculator ─────────────────────────────────
  const [npcAttackData, setNpcAttackData] = React.useState(null);
  const [showNPCCalculator, setShowNPCCalculator] = React.useState(false);
  const [npcDamageDistribution, setNpcDamageDistribution] = React.useState({});
  const [showNPCDamageDistribution, setShowNPCDamageDistribution] = React.useState(false);

  const openNPCAttack = (npcId, attackIndex) => {
    const npc = getNPCById(npcId);
    if (!npc) return;
    const attack = npc.attacks[attackIndex];
    setNpcAttackData({
      npcId,
      npcName: npc.name,
      attackIndex,
      attack,
      armor: npc.armor,
      attackBonus: npc.attackBonus || 0,
      targetId: null,
      targetSquadMembers: [],
      targetIsSquad: false,
      totalDamage: 0,
      d20Rolls: [],
    });
    setShowNPCCalculator(true);
  };

  const closeNPCCalculator = () => {
    setShowNPCCalculator(false);
    setShowNPCDamageDistribution(false);
    setNpcAttackData(null);
    setNpcDamageDistribution({});
  };

  // Apply NPC damage to players
  const applyNPCDamage = () => {
    if (!npcAttackData) return;

    const totalDistributed = Object.values(npcDamageDistribution).reduce((s, v) => s + v, 0);
    if (totalDistributed !== npcAttackData.totalDamage) {
      alert("Please distribute all damage before applying!");
      return;
    }

    // Apply damage to targeted player units
    const updatedPlayers = players.map(player => {
      const playerUpdates = { ...player };
      let hasChanges = false;

      (npcAttackData.targetSquadMembers || []).forEach(target => {
        if (target.playerId !== player.id) return;
        const dmg = npcDamageDistribution[`${target.playerId}-${target.unitType}`] || 0;
        if (dmg <= 0) return;
        hasChanges = true;

        if (target.unitType === 'commander') {
          playerUpdates.commanderStats = {
            ...playerUpdates.commanderStats,
            hp: Math.max(0, playerUpdates.commanderStats.hp - dmg),
          };
        } else {
          const idx = target.unitType === 'special' ? 0 : parseInt(target.unitType.replace('soldier', ''));
          playerUpdates.subUnits = (playerUpdates.subUnits || player.subUnits).map((u, i) =>
            i === idx ? { ...u, hp: Math.max(0, u.hp - dmg) } : u
          );
        }
      });

      return hasChanges ? playerUpdates : player;
    });

    updatedPlayers.forEach(p => updatePlayer(p.id, p));

    const npc = getNPCById(npcAttackData.npcId);
    const targets = (npcAttackData.targetSquadMembers || [])
      .filter(t => npcDamageDistribution[`${t.playerId}-${t.unitType}`] > 0)
      .map(t => {
        const tp = players.find(p => p.id === t.playerId);
        const dmg = npcDamageDistribution[`${t.playerId}-${t.unitType}`];
        return `${tp?.playerName || 'Unknown'}'s ${t.unitType} (${dmg}hp)`;
      }).join(', ');

    addLog(`👾 "${npc?.name}" used "${npcAttackData.attack?.name}" → ${targets}`);
    closeNPCCalculator();
  };

  // ── Campaign end turn ──────────────────────────────────────────────────────
  const endCampaignTurn = () => {
    if (!gameStarted) return;
    if (campaignTurnOrder.length === 0) return;

    const current = campaignTurnOrder[campaignTurnIndex];
    if (!current) return;

    if (current.type === 'npc') {
      setNpcsWhoActedThisRound(prev => [...prev, current.id]);
    }

    // Rebuild turn order (NPCs may have been activated/deactivated)
    const freshOrder = buildTurnOrder();
    const allActed = freshOrder.every(entry => {
      if (entry.type === 'player') return playersWhoActedThisRound.includes(entry.id);
      return npcsWhoActedThisRound.includes(entry.id);
    });

    let nextIndex = (campaignTurnIndex + 1) % Math.max(freshOrder.length, 1);

    if (allActed || freshOrder.length === 0) {
      // End of round
      setCampaignTurnIndex(0);
      setNpcsWhoActedThisRound([]);
      addLog(`----- Round ${currentRound + 1} -----`);
    } else {
      // Skip dead/inactive entries
      let attempts = 0;
      while (attempts < freshOrder.length) {
        const candidate = freshOrder[nextIndex];
        if (!candidate) break;
        if (candidate.type === 'player') {
          const p = players.find(pl => pl.id === candidate.id);
          if (p && !playersWhoActedThisRound.includes(p.id)) break;
        } else {
          const n = getNPCById(candidate.id);
          if (n && n.active && !n.isDead && !npcsWhoActedThisRound.includes(n.id)) break;
        }
        nextIndex = (nextIndex + 1) % freshOrder.length;
        attempts++;
      }
      setCampaignTurnIndex(nextIndex);
    }

    // Delegate player turns to existing endTurn for player entries
    if (current.type === 'player') {
      endTurn();
    }
  };

  // ── Panel view (players vs DM) ─────────────────────────────────────────────
  // 'players' | 'dm'
  const [activePanel, setActivePanel] = React.useState('players');

  // ── Other UI state ─────────────────────────────────────────────────────────
  const [showStats, setShowStats] = React.useState(false);
  const [showModeSelector, setShowModeSelector] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('all');
  const [draggedIndex, setDraggedIndex] = React.useState(null);

  // ── First Strike state ───────────────────────────────────────────────────
  const [firstStrikeModal, setFirstStrikeModal] = React.useState(null); // { npcId } when open
  const [firstStrikeSelected, setFirstStrikeSelected] = React.useState([]);

  // Intercept activateNPC to prompt for First Strike
  const handleActivateNPC = (npcId) => {
    setFirstStrikeSelected([]);
    setFirstStrikeModal({ npcId });
  };

  const confirmActivation = (awardFirstStrike) => {
    if (!firstStrikeModal) return;
    activateNPC(firstStrikeModal.npcId);
    if (awardFirstStrike && firstStrikeSelected.length > 0) {
      firstStrikeSelected.forEach(playerId => {
        updatePlayer(playerId, { firstStrike: true });
      });
      const names = firstStrikeSelected
        .map(id => players.find(p => p.id === id)?.playerName || 'Unknown')
        .join(', ');
      addLog(`⚡ First Strike awarded to: ${names}!`);
    }
    setFirstStrikeModal(null);
    setFirstStrikeSelected([]);
  };

  const toggleFirstStrikePlayer = (playerId) => {
    setFirstStrikeSelected(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Clear First Strike token when a player attacks an NPC
  const handlePlayerAttackNPC = (attackData) => {
    const attacker = players.find(p => p.id === attackData?.attackerId);
    const targetsNPC = attackData?.targetSquadMembers?.some(t => t.isNPC);
    if (attacker?.firstStrike && targetsNPC) {
      updatePlayer(attacker.id, { firstStrike: false });
      addLog(`⚡ ${attacker.playerName} used their First Strike bonus!`);
    }
  };

  const [squadRevivePlayerId, setSquadRevivePlayerId] = React.useState(null);
  const squadRevivePlayer = squadRevivePlayerId
    ? players.find(p => p.id === squadRevivePlayerId)
    : null;

  const handleOpenSquadRevive = (playerId) => setSquadRevivePlayerId(playerId);
  const handleCloseSquadRevive = () => setSquadRevivePlayerId(null);

  const buildLootItem = (item) => {
    const effect = item.effect || { type: 'manual', uses: 1 };
    return {
      id: item.id || `loot_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      name: item.name || 'Unknown Item',
      description: item.description || '',
      tier: item.tier || 'Common',
      isQuestItem: item.isQuestItem || false,
      effect: { ...effect, usesRemaining: effect.uses === 0 ? Infinity : (effect.usesRemaining ?? effect.uses ?? 1) },
      heldBy: item.heldBy || null,
    };
  };

  const unitDisplayName = (player, heldBy) => {
    if (!heldBy) return 'unassigned';
    if (heldBy === 'commander') return 'Commander';
    return player.subUnits?.find(u => u.unitType === heldBy)?.name || heldBy;
  };

  const handleConfirmNpcLoot = (assignedItems) => {
    if (!npcLootClaim) return;
    const { player } = npcLootClaim;
    const newItems = assignedItems.map(buildLootItem);
    updatePlayer(player.id, { inventory: [...(player.inventory || []), ...newItems] });
    newItems.forEach(it => addLog(`📦 ${player.playerName}'s ${unitDisplayName(player, it.heldBy)} received: ${it.name}`));
    setNpcLootClaim(null);
  };

  // ── Steal loot: when a player kills an enemy unit with items ───────────────
  const checkForSteal = (attackerPlayerId, attackerUnitType, victimPlayerId, victimUnitType) => {
    const victimPlayer = players.find(p => p.id === victimPlayerId);
    const attackerPlayer = players.find(p => p.id === attackerPlayerId);
    if (!victimPlayer || !attackerPlayer) return;
    const victimItems = (victimPlayer.inventory || []).filter(it => it.heldBy === victimUnitType);
    if (victimItems.length === 0) return;
    setStealModal({ attackerPlayer, attackerUnitType, victimPlayer, victimUnitType, victimItems });
  };

  const handleConfirmSteal = (takenItems, droppedItemsList, attackerUnitType) => {
    if (!stealModal) return;
    const { attackerPlayer, victimPlayer, victimUnitType } = stealModal;
    // Remove items from victim
    const remainingVictimInventory = (victimPlayer.inventory || []).filter(
      it => !(it.heldBy === victimUnitType && (takenItems.find(t => t.id === it.id) || droppedItemsList.find(d => d.id === it.id)))
    );
    updatePlayer(victimPlayer.id, { inventory: remainingVictimInventory });
    // Give taken items to attacker
    if (takenItems.length > 0) {
      const newItems = takenItems.map(it => ({ ...it, heldBy: attackerUnitType }));
      updatePlayer(attackerPlayer.id, { inventory: [...(attackerPlayer.inventory || []), ...newItems] });
      takenItems.forEach(it => addLog(`⚔️ ${attackerPlayer.playerName} stole "${it.name}" from ${victimPlayer.playerName}`));
    }
    // Log dropped items
    if (droppedItemsList.length > 0) {
      setDroppedItems(prev => [...prev, ...droppedItemsList.map(it => ({ item: it, label: `${victimPlayer.playerName}'s ${victimUnitType}` }))]);
      droppedItemsList.forEach(it => addLog(`🗺️ "${it.name}" was dropped on the map`));
    }
    setStealModal(null);
  };

  // ── Destroy item ───────────────────────────────────────────────────────────
  const handleConfirmDestroy = (itemId) => {
    if (!destroyModal) return;
    // Find which player actually holds this item
    const targetPlayer = (destroyModal.allPlayers || players).find(p =>
      (p.inventory || []).some(it => it.id === itemId)
    );
    if (!targetPlayer) return;
    const item = (targetPlayer.inventory || []).find(it => it.id === itemId);
    if (!item) return;
    updatePlayer(targetPlayer.id, { inventory: (targetPlayer.inventory || []).filter(it => it.id !== itemId) });
    addLog(`💥 "${item.name}" was destroyed from ${targetPlayer.playerName}'s ${item.heldBy}`);
    setDestroyModal(null);
  };

  const handleChestLoot = (item, playerId, requiredKeyName) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    // Accumulate all chest items then open the unit picker once
    setChestLootClaim(prev => {
      const existingItems = prev?.player?.id === playerId ? (prev.items || []) : [];
      const newItem = {
        id: `loot_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        name: item.name,
        description: item.description,
        tier: item.tier || 'Common',
        isQuestItem: item.isQuestItem || false,
        effect: { ...item.effect, usesRemaining: item.effect?.uses ?? 1 },
      };
      return { player, items: [...existingItems, newItem], requiredKeyName: requiredKeyName || prev?.requiredKeyName || null };
    });
  };

  const handleConfirmChestLoot = (assignedItems) => {
    if (!chestLootClaim) return;
    const { player, requiredKeyName } = chestLootClaim;
    const newItems = assignedItems.map(buildLootItem);
    // Remove key from inventory and add new items in one update
    let baseInventory = player.inventory || [];
    if (requiredKeyName?.trim()) {
      const keyIdx = baseInventory.findIndex(it => it.name.trim().toLowerCase() === requiredKeyName.trim().toLowerCase());
      if (keyIdx !== -1) baseInventory = baseInventory.filter((_, i) => i !== keyIdx);
    }
    updatePlayer(player.id, { inventory: [...baseInventory, ...newItems] });
    newItems.forEach(it => addLog(`📦 ${player.playerName}'s ${unitDisplayName(player, it.heldBy)} received: ${it.name}`));
    setChestLootClaim(null);
  };

  const handleDropLoot = (item, playerId, unitType) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const lootItem = {
      id: `loot_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      name: item.name,
      description: item.description,
      tier: item.tier,
      effect: item.effect,
      heldBy: unitType,
    };
    updatePlayer(playerId, { inventory: [...(player.inventory || []), lootItem] });
    const unitLabel = unitType === 'commander' ? 'Commander' : unitType;
    addLog(`🎁 ${player.playerName}'s ${unitLabel} received: ${item.name}`);
  };
  const handleSquadRevive = (playerId, isSuccessful) => {
    processSquadRevive(playerId, isSuccessful);
    handleCloseSquadRevive();
  };

  // ── Save / Load ────────────────────────────────────────────────────────────
  const saveGameToFile = () => {
    const gameState = {
      players, currentRound, combatLog, gameMode,
      customModeSettings, currentPlayerIndex,
      playersWhoActedThisRound, gameStarted,
      npcs, lootPool, chests,
      savedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `battle-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadGameFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const state = JSON.parse(event.target.result);
          if (!state.players || !Array.isArray(state.players)) {
            alert('Invalid save file!'); return;
          }
          loadGameState(state);
          if (state.npcs) setNpcs(state.npcs);
          if (state.lootPool) setLootPool(state.lootPool);
          if (state.chests) setChests(state.chests);
          addLog(`Game loaded from ${new Date(state.savedAt).toLocaleString()}`);
          alert('Game loaded successfully!');
        } catch {
          alert('Failed to load save file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    reorderPlayers(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentModeConfig = getModeConfig(gameMode);
  const currentPlayer = isCampaign
    ? players.find(p => p.id === currentCampaignPlayerId)
    : players[currentPlayerIndex];
  const displayedPlayers = viewMode === 'current' && currentPlayer ? [currentPlayer] : players;

  // Who is active this turn for display
  const activeTurnLabel = isCampaign && currentCampaignNPCId
    ? `👾 ${getNPCById(currentCampaignNPCId)?.name || 'NPC'}'s Turn`
    : currentPlayer
      ? currentPlayer.playerName
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>⚔️ BATTLE TRACKER</h1>
          <div style={styles.subtitle}>Game Master Control Panel</div>
        </div>

        <div style={styles.headerControls}>
          {activeTurnLabel && (
            <div style={styles.currentPlayerDisplay}>
              <div style={styles.currentPlayerLabel}>
                {isCampaign && currentCampaignNPCId ? 'NPC TURN' : 'ACTIVE PLAYER'}
              </div>
              <div style={{
                ...styles.currentPlayerName,
                color: isCampaign && currentCampaignNPCId ? '#fca5a5' : '#a78bfa',
              }}>
                {activeTurnLabel}
              </div>
            </div>
          )}

          <div
            onClick={() => setShowModeSelector(true)}
            title="Change game mode"
            style={{ ...styles.modeDisplay, cursor: 'pointer' }}
          >
            <span style={styles.modeIcon}>{currentModeConfig.icon}</span>
            <span style={styles.modeText}>{currentModeConfig.name}</span>
          </div>

          <div style={styles.roundDisplay}>
            <div style={styles.roundLabel}>ROUND</div>
            <div style={styles.roundNumber}>{currentRound}</div>
          </div>

          <button
            onClick={() => {
              if (!gameStarted) {
                startGame();
                setCampaignTurnIndex(0);
              } else {
                isCampaign ? endCampaignTurn() : endTurn();
              }
            }}
            style={styles.endTurnBtn}
          >
            {!gameStarted
              ? '▶️ START GAME'
              : (() => {
                  if (isCampaign) {
                    const freshOrder = buildTurnOrder();
                    const allActed = freshOrder.every(entry => {
                      if (entry.type === 'player') return playersWhoActedThisRound.includes(entry.id);
                      return npcsWhoActedThisRound.includes(entry.id);
                    });
                    return allActed ? '🔄 END ROUND' : '➡️ END TURN';
                  }
                  const alivePlayers = players.filter(p => p.commanderStats.hp > 0);
                  const acted = alivePlayers.filter(p => playersWhoActedThisRound.includes(p.id));
                  const isLast = currentPlayer && acted.length === alivePlayers.length - 1;
                  return isLast ? '🔄 END ROUND' : '➡️ END TURN';
                })()
            }
          </button>

          <button onClick={() => setViewMode(viewMode === 'all' ? 'current' : 'all')} style={styles.viewModeBtn} disabled={!currentPlayer}>
            {viewMode === 'all' ? '👤 FOCUS' : '👥 ALL'}
          </button>
          <button onClick={() => setShowStats(true)} style={styles.statsBtn}>📊 STATS</button>
          <button onClick={undo} style={styles.undoBtn}>↩️ UNDO</button>
          <button onClick={() => {
            if (window.confirm('Reset the entire game? This will clear all players, NPCs, loot, chests, and progress.')) {
              localStorage.removeItem('hpCounterPlayers');
              localStorage.removeItem('hpCounterRound');
              localStorage.removeItem('hpCounterLog');
              localStorage.removeItem('hpCounterGameMode');
              localStorage.removeItem('hpCounterCustomSettings');
              localStorage.removeItem('hpCounterCurrentPlayerIndex');
              localStorage.removeItem('hpCounterGameStarted');
              localStorage.removeItem('hpCounterLootPool');
              localStorage.removeItem('hpCounterNPCs');
              localStorage.removeItem('hpCounterChests');
              window.location.reload();
            }
          }} style={styles.resetBtn}>🔄 RESET</button>
        </div>
      </div>

      {/* ── Log + Save/Load ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <LogPanel battleLog={combatLog} onClearLog={clearLog} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => {
            if (window.confirm('Reset Combat? All units will be restored to full HP and revives. Loot, NPCs, and chests are kept.')) {
              resetCombat();
            }
          }} style={styles.resetCombatBtn}>🔄 Reset Combat</button>
          <button onClick={saveGameToFile} style={styles.saveBtn}>💾 SAVE</button>
          <button onClick={loadGameFromFile} style={styles.loadBtn}>📂 LOAD</button>
        </div>
      </div>

      {/* ── Campaign tab switcher ── */}
      {isCampaign && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.4)',
            border: '2px solid rgba(201,169,97,0.25)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setActivePanel('players')}
              style={{
                padding: '0.85rem 1.75rem',
                background: activePanel === 'players'
                  ? 'linear-gradient(135deg, #1e40af, #1e3a8a)'
                  : 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(201,169,97,0.2)',
                color: activePanel === 'players' ? '#93c5fd' : '#6b7280',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
                boxShadow: activePanel === 'players' ? '0 4px 12px rgba(59,130,246,0.2)' : 'none',
              }}
            >
              👥 Players
            </button>
            <button
              onClick={() => setActivePanel('dm')}
              style={{
                padding: '0.85rem 1.75rem',
                background: activePanel === 'dm'
                  ? 'linear-gradient(135deg, #7c1d1d, #6b1a1a)'
                  : 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(201,169,97,0.2)',
                color: activePanel === 'dm' ? '#fca5a5' : '#6b7280',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
                position: 'relative',
                boxShadow: activePanel === 'dm' ? '0 4px 12px rgba(239,68,68,0.2)' : 'none',
              }}
            >
              👾 NPC
              {activeNPCs.length > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: '#dc2626', color: '#fff', borderRadius: '50%',
                  width: '16px', height: '16px', fontSize: '0.65rem', fontWeight: '900',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{activeNPCs.length}</span>
              )}
            </button>
            <button
              onClick={() => setActivePanel('loot')}
              style={{
                padding: '0.85rem 1.75rem',
                background: activePanel === 'loot'
                  ? 'linear-gradient(135deg, #4c1d95, #3b0764)'
                  : 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(201,169,97,0.2)',
                color: activePanel === 'loot' ? '#e9d5ff' : '#6b7280',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
                boxShadow: activePanel === 'loot' ? '0 4px 12px rgba(124,58,237,0.2)' : 'none',
              }}
            >
              🎁 Loot
            </button>
            <button
              onClick={() => setActivePanel('chests')}
              style={{
                padding: '0.85rem 1.75rem',
                background: activePanel === 'chests'
                  ? 'linear-gradient(135deg, #78350f, #92400e)'
                  : 'transparent',
                border: 'none',
                color: activePanel === 'chests' ? '#fde68a' : '#6b7280',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
                position: 'relative',
                boxShadow: activePanel === 'chests' ? '0 4px 12px rgba(234,179,8,0.2)' : 'none',
              }}
            >
              📦 Chests
              {chests.filter(c => !c.isOpened).length > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: '#eab308', color: '#1a0f0a', borderRadius: '50%',
                  width: '16px', height: '16px', fontSize: '0.65rem', fontWeight: '900',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{chests.filter(c => !c.isOpened).length}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Add Player button ── */}
      {(!isCampaign || activePanel === 'players') && (
        <div style={styles.addPlayerSection}>
          <button onClick={addPlayer} style={styles.addPlayerBtn}>+ ADD PLAYER</button>
        </div>
      )}


      {/* ── Main Content ── */}
      <div style={styles.playersContainer}>

        {/* Turn order sidebar (non-campaign focus mode) */}
        {viewMode === 'current' && !isCampaign && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {players.map((player, index) => {
              const isCurrent = index === currentPlayerIndex;
              const hasActed = playersWhoActedThisRound.includes(player.id);
              const isDead = player.commanderStats.hp === 0;
              const isBeingDragged = draggedIndex === index;
              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.sidebarPlayer,
                    background: isCurrent ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))' : hasActed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                    borderLeft: isCurrent ? `4px solid ${player.playerColor || '#8b5cf6'}` : hasActed ? '4px solid #22c55e' : '4px solid transparent',
                    opacity: isBeingDragged ? 0.5 : (isDead ? 0.4 : 1),
                  }}
                >
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurrent ? (player.playerColor || '#8b5cf6') : '#d4af37' }}>
                      {player.playerName || `Player ${index + 1}`}
                    </span>
                    {isCurrent && <span style={{ color: player.playerColor || '#8b5cf6' }}>▶</span>}
                    {!isCurrent && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                    {isDead && <span>💀</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>
                    {player.commanderStats.customName || player.commander} • {player.commanderStats.hp}/{player.commanderStats.maxHp}hp
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Campaign turn order sidebar */}
        {isCampaign && viewMode === 'current' && activePanel === 'players' && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {campaignTurnOrder.map((entry, index) => {
              const isCurrent = index === campaignTurnIndex;
              const isPlayer = entry.type === 'player';
              const entity = isPlayer
                ? players.find(p => p.id === entry.id)
                : getNPCById(entry.id);
              if (!entity) return null;
              const hasActed = isPlayer
                ? playersWhoActedThisRound.includes(entity.id)
                : npcsWhoActedThisRound.includes(entity.id);

              return (
                <div key={entry.id} style={{
                  ...styles.sidebarPlayer,
                  background: isCurrent
                    ? isPlayer
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))'
                      : 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(185,28,28,0.1))'
                    : hasActed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  borderLeft: isCurrent
                    ? `4px solid ${isPlayer ? (entity.playerColor || '#8b5cf6') : '#ef4444'}`
                    : hasActed ? '4px solid #22c55e' : '4px solid transparent',
                }}>
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurrent ? (isPlayer ? (entity.playerColor || '#8b5cf6') : '#fca5a5') : '#d4af37' }}>
                      {isPlayer ? entity.playerName : `👾 ${entity.name}`}
                    </span>
                    {isCurrent && <span style={{ color: isPlayer ? '#8b5cf6' : '#ef4444' }}>▶</span>}
                    {!isCurrent && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>
                    {isPlayer
                      ? `${entity.commanderStats.customName || entity.commander} • ${entity.commanderStats.hp}/${entity.commanderStats.maxHp}hp`
                      : `${entity.hp}/${entity.maxHp}hp • 🛡️${entity.armor}+`
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Player cards panel ── */}
        {(!isCampaign || activePanel === 'players') && (
          <div style={{
            display: players.length === 0 ? 'block' : 'grid',
            gridTemplateColumns: players.length === 1 ? '1fr' : viewMode === 'current' ? '1fr' : '48% 48%',
            gap: '1%',
            padding: '0 0.5%',
            width: '100%',
            justifyContent: players.length === 1 ? 'center' : 'flex-start',
            maxWidth: players.length === 1 ? '50%' : '100%',
            margin: players.length === 1 ? '0 auto' : '0',
            flex: viewMode === 'current' ? 1 : 'initial',
          }}>
            {players.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: '#4b5563',
                gridColumn: '1 / -1',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>
                  No players yet
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Click ADD PLAYER to bring combatants into the battle.
                </div>
              </div>
            )}

            {displayedPlayers.map((player) => {
              const actualIndex = players.findIndex(p => p.id === player.id);
              const isBeingDragged = draggedIndex === actualIndex;
              const isThisTurn = isCampaign
                ? player.id === currentCampaignPlayerId
                : actualIndex === currentPlayerIndex;

              return (
                <div
                  key={player.id}
                  draggable={viewMode === 'all'}
                  onDragStart={(e) => viewMode === 'all' && handleDragStart(e, actualIndex)}
                  onDragOver={viewMode === 'all' ? handleDragOver : undefined}
                  onDrop={(e) => viewMode === 'all' && handleDrop(e, actualIndex)}
                  onDragEnd={viewMode === 'all' ? handleDragEnd : undefined}
                  style={{ opacity: isBeingDragged ? 0.5 : 1, cursor: viewMode === 'all' ? 'grab' : 'default', transition: 'opacity 0.2s' }}
                >
                  <PlayerCard
                    player={player}
                    onUpdate={updatePlayer}
                    onRemove={removePlayer}
                    onToggleSquad={toggleSquad}
                    onOpenCalculator={openCalculator}
                    onUseRevive={useRevive}
                    onOpenSquadRevive={handleOpenSquadRevive}
                    allPlayers={players}
                    isCurrentTurn={isThisTurn}
                    hasActedThisRound={playersWhoActedThisRound.includes(player.id)}
                    onOpenDestroyModal={(attackerPlayer) => {
                      // Open with no target yet — DestroyItemModal has its own target picker
                      setDestroyModal({ attackerPlayer, targetPlayer: null, targetUnitType: null, allPlayers: players });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Loot Panel (campaign only) ── */}
        {isCampaign && activePanel === 'chests' && (
          <div style={{ width: '100%', padding: '0 0.5%' }}>
            <ChestPanel
              players={players}
              lootPool={lootPool}
              chests={chests}
              setChests={setChests}
              onGiveLoot={handleChestLoot}
              onConsumeKey={(playerId, newInventory) => updatePlayer(playerId, { inventory: newInventory })}
            />
          </div>
        )}

        {isCampaign && activePanel === 'loot' && (
          <div style={{ width: '100%', padding: '0 0.5%' }}>
            <LootPanel
              players={players}
              lootPool={lootPool}
              setLootPool={setLootPool}
              onGiveItem={handleDropLoot}
            />
          </div>
        )}

        {/* ── DM Panel (campaign only) ── */}
        {isCampaign && activePanel === 'dm' && (
          <div style={{ flex: 1 }}>
            <DMPanel
              npcs={npcs}
              activeNPCs={activeNPCs}
              inactiveNPCs={inactiveNPCs}
              deadNPCs={deadNPCs}
              showNPCCreator={showNPCCreator}
              editingNPCId={editingNPCId}
              blankNPC={blankNPC}
              blankAttack={blankAttack}
              blankPhase={blankPhase}
              openCreator={openCreator}
              closeCreator={closeCreator}
              saveNPC={saveNPC}
              removeNPC={removeNPC}
              activateNPC={handleActivateNPC}
              deactivateNPC={deactivateNPC}
              onHPChange={setNPCHP}
              onTriggerPhase={triggerNextPhase}
              onOpenNPCAttack={openNPCAttack}
              getNPCById={getNPCById}
              currentTurnId={currentCampaignNPCId}
              npcsWhoActedThisRound={npcsWhoActedThisRound}
              players={players}
              onDropLoot={handleDropLoot}
              lootPool={lootPool}
            />
          </div>
        )}
      </div>

      {/* ── Calculators & Modals ── */}

      {/* Player attacks player/NPC */}
      {showCalculator && (() => {
        const attacker = players.find(p => p.id === calculatorData?.attackerId);
        const attackerHasFirstStrike = attacker?.firstStrike === true;
        return (
          <Calculator
            data={calculatorData}
            players={players}
            npcs={activeNPCs}
            onClose={closeCalculator}
            onProceedToDistribution={(data) => {
              handlePlayerAttackNPC(data);
              setCalculatorData(data);
              setShowDamageDistribution(true);
              // Clear pending bonuses from the attacking unit
              const atk = players.find(p => p.id === data.attackerId);
              if (atk) {
                if (data.attackingUnitType === 'commander') {
                  updatePlayer(atk.id, { commanderStats: { ...atk.commanderStats, pendingAttackBonus: 0, pendingDefenseBonus: 0 } });
                } else {
                  const idx = data.attackingUnitType === 'special' ? 0 : parseInt(data.attackingUnitType.replace('soldier', ''));
                  const newSubs = atk.subUnits.map((u, i) => i === idx ? { ...u, pendingAttackBonus: 0, pendingDefenseBonus: 0 } : u);
                  updatePlayer(atk.id, { subUnits: newSubs });
                }
              }
            }}
            gameMode={isCampaign ? 'd20' : gameMode}
            firstStrike={attackerHasFirstStrike}
            onUpdatePlayer={updatePlayer}
          />
        );
      })()}

      {showDamageDistribution && (
        <DamageDistribution
          calculatorData={calculatorData}
          players={players}
          npcs={activeNPCs}
          damageDistribution={damageDistribution}
          onUpdateDistribution={updateDamageDistribution}
          onApply={() => {
            applyDamage((updatedPlayers) => {
              // Detect newly killed player units — check for steal
              updatedPlayers.forEach(updatedP => {
                const originalP = players.find(p => p.id === updatedP.id);
                if (!originalP || updatedP.id === calculatorData?.attackerId) return;
                // Commander death check
                if (!originalP.commanderStats?.isDead && updatedP.commanderStats?.hp === 0) {
                  checkForSteal(calculatorData?.attackerId, calculatorData?.attackerUnitType || 'commander', updatedP.id, 'commander');
                }
                // SubUnit death check
                (updatedP.subUnits || []).forEach((u, i) => {
                  const origU = (originalP.subUnits || [])[i];
                  const unitType = u.unitType || (i === 0 ? 'special' : `soldier${i}`);
                  if (origU && origU.hp > 0 && u.hp === 0) {
                    checkForSteal(calculatorData?.attackerId, calculatorData?.attackerUnitType || 'commander', updatedP.id, unitType);
                  }
                });
              });
              updatedPlayers.forEach(p => updatePlayer(p.id, p));
              // Also apply NPC damage if any targeted NPCs
              if (calculatorData?.targetSquadMembers) {
                calculatorData.targetSquadMembers.forEach(t => {
                  if (t.isNPC) {
                    const dmg = damageDistribution[`npc-${t.npcId}`] || 0;
                    if (dmg > 0) {
                      lastAttackerIdRef.current = calculatorData?.attackerId ?? null;
                      applyDamageToNPC(t.npcId, dmg);
                    }
                  }
                });
              }
            });
          }}
          onClose={() => setShowDamageDistribution(false)}
        />
      )}

      {/* ── NPC Loot Assignment Modal ── */}
      {npcLootClaim && (
        <NpcLootModal
          npc={npcLootClaim.npc}
          player={npcLootClaim.player}
          players={players}
          onConfirm={handleConfirmNpcLoot}
          onClose={() => setNpcLootClaim(null)}
        />
      )}

      {/* ── Chest Loot Assignment Modal ── */}
      {chestLootClaim && (
        <NpcLootModal
          npc={{ name: '📦 Chest Loot', lootTable: chestLootClaim.items }}
          player={chestLootClaim.player}
          players={players}
          onConfirm={handleConfirmChestLoot}
          onClose={() => setChestLootClaim(null)}
        />
      )}

      {/* ── Steal Loot Modal ── */}
      {stealModal && (
        <StealLootModal
          attackerPlayer={stealModal.attackerPlayer}
          attackerUnitType={stealModal.attackerUnitType}
          victimPlayer={stealModal.victimPlayer}
          victimUnitType={stealModal.victimUnitType}
          victimItems={stealModal.victimItems}
          onConfirm={handleConfirmSteal}
          onClose={() => setStealModal(null)}
        />
      )}

      {/* ── Destroy Item Modal ── */}
      {destroyModal && (
        <DestroyItemModal
          attackerPlayer={destroyModal.attackerPlayer}
          targetPlayer={destroyModal.targetPlayer}
          targetUnitType={destroyModal.targetUnitType}
          allPlayers={destroyModal.allPlayers || players}
          onConfirm={handleConfirmDestroy}
          onClose={() => setDestroyModal(null)}
        />
      )}

      {/* NPC attacks player */}
      {showNPCCalculator && npcAttackData && (
        <NPCCalculator
          npcAttackData={npcAttackData}
          players={players}
          onClose={closeNPCCalculator}
          onProceed={(updatedData) => {
            setNpcAttackData(updatedData);
            setShowNPCCalculator(false);
            setShowNPCDamageDistribution(true);
          }}
        />
      )}

      {showNPCDamageDistribution && npcAttackData && (
        <DamageDistribution
          calculatorData={{
            ...npcAttackData,
            attackerId: npcAttackData.npcId,
            attackerIsNPC: true,
          }}
          players={players}
          npcs={[]}
          damageDistribution={npcDamageDistribution}
          onUpdateDistribution={(key, val) => setNpcDamageDistribution(prev => ({ ...prev, [key]: val }))}
          onApply={applyNPCDamage}
          onClose={() => setShowNPCDamageDistribution(false)}
        />
      )}

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showModeSelector && (
        <GameModeSelector
          currentMode={gameMode}
          onModeChange={changeGameMode}
          onClose={() => setShowModeSelector(false)}
        />
      )}

      {squadRevivePlayer && (
        <SquadReviveModal
          player={squadRevivePlayer}
          onRevive={handleSquadRevive}
          onClose={handleCloseSquadRevive}
        />
      )}

      {/* ── First Strike Modal ── */}
      {firstStrikeModal && (
        <FirstStrikeModal
          players={players}
          selected={firstStrikeSelected}
          onToggle={toggleFirstStrikePlayer}
          onConfirm={confirmActivation}
        />
      )}
    </div>
  );
};

// ── NPCCalculator ─────────────────────────────────────────────────────────────
// Inline component: NPC uses its attack (with defined die type & rolls) against players.
// Uses same D20 roll mechanic — attacker roll vs defender roll, NPC has armor floor.

const NPCCalculator = ({ npcAttackData, players, onClose, onProceed }) => {
  const [rolls, setRolls] = React.useState([]);
  const [atkRoll, setAtkRoll] = React.useState('');
  const [defRoll, setDefRoll] = React.useState('');
  const [totalDamage, setTotalDamage] = React.useState(0);
  const [targetSquadMembers, setTargetSquadMembers] = React.useState([]);

  const gold = '#c9a961';
  const attack = npcAttackData.attack;
  const numRolls = attack?.numRolls || 1;
  const dieType = attack?.dieType || 'd20';
  const dieMax = dieType === 'd20' ? 20 : 10;
  const allRollsDone = rolls.length >= numRolls;

  const addRoll = () => {
    const atk = parseInt(atkRoll) || 0;
    const bonus = parseInt(npcAttackData.attackBonus) || 0;
    const finalAtk = atk + bonus;
    const def = parseInt(defRoll) || 0;
    const dmg = Math.max(0, finalAtk - def);
    setRolls(prev => [...prev, { atk, bonus, finalAtk, def, dmg }]);
    setTotalDamage(prev => prev + dmg);
    setAtkRoll('');
    setDefRoll('');
  };

  const toggleTarget = (playerId, unitType) => {
    const key = `${playerId}-${unitType}`;
    setTargetSquadMembers(prev => {
      const exists = prev.find(t => `${t.playerId}-${t.unitType}` === key);
      if (exists) return prev.filter(t => `${t.playerId}-${t.unitType}` !== key);
      return [...prev, { playerId, unitType }];
    });
  };

  const handleProceed = () => {
    if (rolls.length < numRolls) { alert(`Complete all ${numRolls} rolls first!`); return; }
    if (targetSquadMembers.length === 0) { alert('Select at least one target!'); return; }
    onProceed({ ...npcAttackData, totalDamage, d20Rolls: rolls, targetSquadMembers });
  };

  const inputStyle = {
    background: '#1a0f0a', color: gold,
    padding: '0.75rem', borderRadius: '6px',
    border: '2px solid #5a4a3a',
    fontSize: '1.5rem', textAlign: 'center',
    fontFamily: '"Cinzel", Georgia, serif', fontWeight: 'bold',
    width: '100%',
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(145deg, #1a0f0a, #0f0805)', border: `3px solid ${gold}`, borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}
      >
        <h3 style={{ color: gold, fontFamily: '"Cinzel", Georgia, serif', textAlign: 'center', marginBottom: '1rem', fontSize: '1.2rem' }}>
          👾 {npcAttackData.npcName} — {attack?.name}
        </h3>

        <div style={{ textAlign: 'center', color: '#8b7355', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {dieType.toUpperCase()} × {numRolls} rolls
          &nbsp;|&nbsp; Roll {Math.min(rolls.length + 1, numRolls)} of {numRolls}
        </div>

        {/* Target selection */}
        <div style={{ marginBottom: '1rem', background: '#0a0503', padding: '0.75rem', borderRadius: '6px', border: '1px solid #5a4a3a' }}>
          <div style={{ color: gold, fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>SELECT TARGETS:</div>
          {players.map(player => (
            <div key={player.id} style={{ marginBottom: '0.35rem' }}>
              <div style={{ color: '#8b7355', fontSize: '0.75rem', marginBottom: '0.2rem' }}>{player.playerName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {/* Commander */}
                {player.commanderStats.hp > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: gold, fontSize: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={!!targetSquadMembers.find(t => t.playerId === player.id && t.unitType === 'commander')}
                      onChange={() => toggleTarget(player.id, 'commander')}
                    />
                    ⚔️ {player.commanderStats.customName || player.commander} ({player.commanderStats.hp}hp)
                  </label>
                )}
                {/* Squad */}
                {player.subUnits.map((unit, idx) => unit.hp > 0 && (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#c4b5fd', fontSize: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={!!targetSquadMembers.find(t => t.playerId === player.id && t.unitType === (idx === 0 ? 'special' : `soldier${idx}`))}
                      onChange={() => toggleTarget(player.id, idx === 0 ? 'special' : `soldier${idx}`)}
                    />
                    {idx === 0 ? '⭐' : '🛡️'} {unit.name || (idx === 0 ? 'Special' : `Soldier ${idx}`)} ({unit.hp}hp)
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Roll input */}
        {!allRollsDone && (
          <div style={{ background: '#0a0503', border: `2px solid ${gold}`, borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ color: gold, fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>NPC Roll ({dieType.toUpperCase()})</label>
                <input type="number" min="1" max={dieMax} value={atkRoll} onChange={e => setAtkRoll(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: gold, fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Player Defense (D10)</label>
                <input type="number" min="1" max="10" value={defRoll} onChange={e => setDefRoll(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <button
              onClick={addRoll}
              disabled={!atkRoll || !defRoll}
              style={{
                width: '100%', padding: '0.65rem',
                background: (atkRoll && defRoll) ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#1a0f0a',
                color: (atkRoll && defRoll) ? '#e9d5ff' : '#4a3322',
                border: '2px solid', borderColor: (atkRoll && defRoll) ? '#a78bfa' : '#4a3322',
                borderRadius: '6px', cursor: (atkRoll && defRoll) ? 'pointer' : 'not-allowed',
                fontFamily: '"Cinzel", Georgia, serif', fontWeight: 'bold',
              }}
            >
              + Add Roll
            </button>
          </div>
        )}

        {/* Roll history */}
        {rolls.length > 0 && (
          <div style={{ background: '#0a0503', padding: '0.75rem', borderRadius: '6px', border: '1px solid #5a4a3a', marginBottom: '1rem' }}>
            {rolls.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#8b7355' }}>
                Roll {i + 1}: {r.atk}{r.bonus > 0 ? <span style={{color:'#fbbf24'}}>+{r.bonus}</span> : ''} vs {r.def}
              </span>
                <span style={{ color: r.dmg > 0 ? '#fecaca' : '#86efac', fontWeight: 'bold' }}>
                  {r.dmg > 0 ? `${r.dmg}hp` : 'BLOCKED'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div style={{ background: '#0a0503', border: `2px solid ${gold}`, borderRadius: '6px', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ color: gold, fontSize: '0.8rem' }}>Total Damage</div>
          <div style={{ color: '#fecaca', fontSize: '2rem', fontWeight: 'bold', fontFamily: '"Cinzel", Georgia, serif' }}>{totalDamage}hp</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleProceed}
            disabled={!allRollsDone || targetSquadMembers.length === 0}
            style={{
              flex: 1, padding: '0.75rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 'bold', fontSize: '1rem', borderRadius: '6px', cursor: (allRollsDone && targetSquadMembers.length > 0) ? 'pointer' : 'not-allowed',
              background: (allRollsDone && targetSquadMembers.length > 0) ? 'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a',
              color: (allRollsDone && targetSquadMembers.length > 0) ? '#86efac' : '#4a3322',
              border: '2px solid', borderColor: (allRollsDone && targetSquadMembers.length > 0) ? '#16a34a' : '#4a3322',
            }}
          >
            ✓ Proceed
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)', color: '#fecaca', border: '2px solid #991b1b', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 'bold' }}>
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── FirstStrikeModal ─────────────────────────────────────────────────────────
// Shown when DM activates an NPC — asks if First Strike applies and who gets it.

const FirstStrikeModal = ({ players, selected, onToggle, onConfirm }) => {
  const [awarding, setAwarding] = React.useState(null); // null = undecided, true, false
  const gold = '#c9a961';

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <div style={{
        background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
        border: '3px solid #f59e0b',
        borderRadius: '14px',
        padding: '1.75rem',
        width: '90%',
        maxWidth: '420px',
        boxShadow: '0 0 40px rgba(245,158,11,0.2), 0 24px 64px rgba(0,0,0,0.95)',
        fontFamily: '"Rajdhani", "Cinzel", sans-serif',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
          <h2 style={{
            color: '#f59e0b',
            fontSize: '1.3rem',
            fontFamily: '"Cinzel", Georgia, serif',
            fontWeight: '900',
            letterSpacing: '0.1em',
            margin: 0,
            marginBottom: '0.5rem',
          }}>
            FIRST STRIKE
          </h2>
          <p style={{ color: '#8b7355', fontSize: '0.85rem', margin: 0 }}>
            Does this activation grant a First Strike bonus?
          </p>
        </div>

        {/* Yes / No — shown first */}
        {awarding === null && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => setAwarding(true)}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #ca8a04, #a16207)',
                border: '2px solid #f59e0b',
                color: '#fef3c7',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
              }}
            >
              ⚡ YES
            </button>
            <button
              onClick={() => onConfirm(false)}
              style={{
                padding: '1rem',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid #374151',
                color: '#6b7280',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
              }}
            >
              ✕ NO
            </button>
          </div>
        )}

        {/* Player picker — shown after YES */}
        {awarding === true && (
          <>
            <p style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Select player(s)
            </p>

            <div style={{ marginBottom: '1rem' }}>
              {players.map(player => {
                const alreadyHasBonus = player.firstStrike === true;
                const isSelected = selected.includes(player.id);
                const disabled = alreadyHasBonus && !isSelected;

                return (
                  <div
                    key={player.id}
                    onClick={() => !disabled && onToggle(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      marginBottom: '0.4rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: isSelected
                        ? '#f59e0b'
                        : disabled ? '#1f1108' : 'rgba(201,169,97,0.2)',
                      background: isSelected
                        ? 'rgba(245,158,11,0.12)'
                        : disabled ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '20px', height: '20px',
                      borderRadius: '4px',
                      border: '2px solid',
                      borderColor: isSelected ? '#f59e0b' : '#4b5563',
                      background: isSelected ? '#f59e0b' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.75rem',
                      color: '#000',
                      fontWeight: '900',
                    }}>
                      {isSelected && '✓'}
                    </div>

                    {/* Color dot */}
                    <div style={{
                      width: '10px', height: '10px',
                      borderRadius: '50%',
                      background: player.playerColor || '#3b82f6',
                      flexShrink: 0,
                    }} />

                    <span style={{
                      color: isSelected ? '#fbbf24' : disabled ? '#4b5563' : gold,
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      flex: 1,
                    }}>
                      {player.playerName || `Player`}
                    </span>

                    {alreadyHasBonus && (
                      <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: '700' }}>
                        ⚡ HAS BONUS
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => onConfirm(true)}
                disabled={selected.length === 0}
                style={{
                  padding: '0.85rem',
                  background: selected.length > 0
                    ? 'linear-gradient(135deg, #ca8a04, #a16207)'
                    : 'rgba(0,0,0,0.3)',
                  border: '2px solid',
                  borderColor: selected.length > 0 ? '#f59e0b' : '#374151',
                  color: selected.length > 0 ? '#fef3c7' : '#4b5563',
                  borderRadius: '8px',
                  cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  letterSpacing: '0.05em',
                }}
              >
                ⚡ Award
              </button>
              <button
                onClick={() => setAwarding(null)}
                style={{
                  padding: '0.85rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid #374151',
                  color: '#6b7280',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                }}
              >
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    minHeight: "100vh", height: "100vh",
    background: "radial-gradient(ellipse at top, #1a0f1e 0%, #0a0507 50%, #000000 100%)",
    color: "#e8dcc4",
    fontFamily: '"Rajdhani", "Cinzel", sans-serif',
    padding: "0.75rem", overflow: "auto",
  },
  header: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
    marginBottom: "0.75rem", padding: "1rem 1.5rem",
    background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.05))",
    border: "1px solid rgba(139,92,246,0.3)", borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  titleSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" },
  title: {
    fontSize: "2rem", margin: 0, fontWeight: "800", letterSpacing: "0.1em",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    textShadow: "0 0 30px rgba(245,158,11,0.3)",
  },
  subtitle: { fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.15em", textTransform: "uppercase" },
  headerControls: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  currentPlayerDisplay: {
    display: "flex", flexDirection: "column", padding: "0.5rem 1rem",
    background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.5)",
    borderRadius: "8px", boxShadow: "0 0 20px rgba(139,92,246,0.2)",
  },
  currentPlayerLabel: { fontSize: "0.65rem", color: "#c4b5fd", letterSpacing: "0.1em", fontWeight: "700" },
  currentPlayerName: { fontSize: "1rem", fontWeight: "700", letterSpacing: "0.05em" },
  modeDisplay: {
    display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem",
    background: "rgba(245,158,11,0.1)", border: "2px solid rgba(245,158,11,0.4)", borderRadius: "8px",
    transition: "all 0.2s", userSelect: "none",
  },
  modeIcon: { fontSize: "1.2rem" },
  modeText: { fontSize: "0.85rem", color: "#fbbf24", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" },
  roundDisplay: {
    display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 1rem",
    background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.4)", borderRadius: "8px",
  },
  roundLabel: { fontSize: "0.65rem", color: "#5eead4", letterSpacing: "0.1em", fontWeight: "700" },
  roundNumber: { fontSize: "1.25rem", color: "#14b8a6", fontWeight: "800", lineHeight: "1" },
  endTurnBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #059669, #047857)",
    border: "1px solid #10b981", color: "#d1fae5", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem", letterSpacing: "0.1em",
    textTransform: "uppercase", boxShadow: "0 4px 12px rgba(16,185,129,0.3)", transition: "all 0.2s",
  },

  viewModeBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #1e40af, #1e3a8a)",
    border: "1px solid #3b82f6", color: "#dbeafe", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(59,130,246,0.2)", transition: "all 0.2s",
  },
  modeBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "1px solid #a78bfa", color: "#f3e8ff", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(124,58,237,0.2)", transition: "all 0.2s",
  },
  statsBtn: {
    padding: "0.85rem 1.75rem",
    background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
    border: "1px solid #f59e0b", color: "#fde68a", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(245,158,11,0.15)", transition: "all 0.2s",
  },
  undoBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #ca8a04, #a16207)",
    border: "1px solid #eab308", color: "#fef3c7", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(234,179,8,0.2)", transition: "all 0.2s",
  },
  resetBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #b91c1c, #991b1b)",
    border: "1px solid #dc2626", color: "#fecaca", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(220,38,38,0.3)", transition: "all 0.2s",
  },
  resetCombatBtn: {
    padding: '0.5rem 1rem',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontWeight: '800',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  saveBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #0891b2, #0e7490)",
    border: "2px solid #06b6d4", color: "#cffafe", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem", textTransform: "uppercase",
    boxShadow: "0 4px 12px rgba(6,182,212,0.3)", transition: "all 0.2s",
  },
  loadBtn: {
    padding: "0.85rem 1.75rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "2px solid #a78bfa", color: "#f3e8ff", borderRadius: "8px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem", textTransform: "uppercase",
    boxShadow: "0 4px 12px rgba(167,139,250,0.3)", transition: "all 0.2s",
  },
  addPlayerSection: { marginBottom: "0.75rem", textAlign: "center" },
  addPlayerBtn: {
    padding: "1rem 2.5rem", background: "linear-gradient(135deg, #1e40af, #1e3a8a)",
    border: "2px solid #3b82f6", color: "#dbeafe", borderRadius: "10px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "800", fontSize: "1rem", letterSpacing: "0.1em",
    textTransform: "uppercase", boxShadow: "0 8px 24px rgba(59,130,246,0.3)", transition: "all 0.2s",
  },
  playersContainer: { display: 'flex', gap: '1rem' },
  sidebar: {
    width: '280px', minWidth: '280px',
    background: 'linear-gradient(135deg, rgba(17,24,39,0.8), rgba(31,41,55,0.6))',
    border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '1.25rem',
    height: 'fit-content', position: 'sticky', top: '1rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  sidebarTitle: {
    color: '#f59e0b', fontSize: '1rem', marginTop: 0, marginBottom: '1rem',
    fontFamily: "inherit", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase",
  },
  sidebarPlayer: { padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '8px', cursor: 'grab', transition: 'all 0.2s' },
  sidebarPlayerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' },
  sidebarPlayerName: { fontWeight: '700', fontSize: '0.875rem', letterSpacing: '0.05em' },
  sidebarPlayerInfo: { fontSize: '0.75rem', color: '#9ca3af' },
};

export default HPCounter;