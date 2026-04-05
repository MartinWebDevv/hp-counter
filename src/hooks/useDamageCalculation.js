import { useState } from "react";
import { calculateTotalAvailableDamage } from "../utils/statsUtils";

/**
 * Custom hook for managing damage calculation and distribution
 */
export const useDamageCalculation = (players, addLog, npcs = []) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDamageDistribution, setShowDamageDistribution] = useState(false);
  const [calculatorData, setCalculatorData] = useState(null);
  const [damageDistribution, setDamageDistribution] = useState({});

  const openCalculator = (
    attackerId,
    action,
    attackingUnitType = "commander",
  ) => {
    const attacker = players.find((p) => p.id === attackerId);
    if (!attacker) return;

    setCalculatorData({
      attackerId,
      attackerName: attacker.playerName,
      attackingUnitType,
      attackerIsSquad: false,
      attackerSquadMembers: [],
      action,
      targetId: null,
      squadMemberHits: {},
      soloHits: 0,
      targetSquadMembers: [],
      targetIsSquad: false,
      npcs,
    });
    setShowCalculator(true);
  };

  const closeCalculator = () => {
    setShowCalculator(false);
    setShowDamageDistribution(false);
    setCalculatorData(null);
    setDamageDistribution({});
  };

  // Closes the roll calculator but keeps distribution state intact for the distribution modal
  const closeCalculatorKeepDistribution = () => {
    setShowCalculator(false);
  };

  const updateCalculatorHits = (updates) => {
    setCalculatorData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const updateDamageDistribution = (targetKey, damage) => {
    setDamageDistribution((prev) => ({
      ...prev,
      [targetKey]: damage,
    }));
  };

  /**
   * Add a unit index to a player's reviveQueue if not already queued.
   * Returns the updated reviveQueue array.
   */
  const addToReviveQueue = (player, unitIndex) => {
    const queue = player.reviveQueue || [];
    if (queue.includes(unitIndex)) return queue; // already in queue
    return [...queue, unitIndex];
  };

  const applyDamage = (onPlayersUpdate) => {
    if (!calculatorData) return;

    let totalAvailable;
    if (calculatorData.totalDamage !== undefined) {
      totalAvailable = calculatorData.totalDamage;
    } else {
      totalAvailable = calculateTotalAvailableDamage(
        calculatorData,
        calculatorData.squadMemberHits,
        players,
      );
    }

    const totalDistributed = Object.values(damageDistribution).reduce(
      (sum, val) => sum + val,
      0,
    );

    if (totalDistributed !== totalAvailable) {
      alert("Please distribute all damage before applying!");
      return;
    }

    // Apply damage to each target, tracking newly-killed soldiers for revive queue
    const updatedPlayers = players.map((player) => {
      const playerUpdates = { ...player };
      let hasChanges = false;

      // Set cooldown if attacker used special
      if (player.id === calculatorData.attackerId && 
          calculatorData.action === 'special' && 
          calculatorData.attackingUnitType === 'commander') {
        hasChanges = true;
        playerUpdates.commanderStats = {
          ...playerUpdates.commanderStats,
          cooldownRounds: 2
        };
      }

      // Apply damage to targeted units
      calculatorData.targetSquadMembers.forEach((target) => {
        if (target.playerId !== player.id) return;

        const damageKey = `${target.playerId}-${target.unitType}`;
        const damageAmount = damageDistribution[damageKey] || 0;

        if (damageAmount > 0) {
          hasChanges = true;

          if (target.unitType === "commander") {
            playerUpdates.commanderStats = {
              ...playerUpdates.commanderStats,
              hp: Math.max(0, playerUpdates.commanderStats.hp - damageAmount),
            };
          } else {
            // Determine unit index
            const unitIndex =
              target.unitType === "special"
                ? 0
                : parseInt(target.unitType.replace("soldier", ""));

            const currentUnit = (playerUpdates.subUnits || player.subUnits)[unitIndex];
            const wasAlive = currentUnit.hp > 0;
            const newHP = Math.max(0, currentUnit.hp - damageAmount);
            const justDied = wasAlive && newHP === 0;

            playerUpdates.subUnits = (playerUpdates.subUnits || player.subUnits).map((unit, idx) =>
              idx === unitIndex
                ? { ...unit, hp: newHP }
                : unit,
            );

            // Add to revive queue if this soldier just died and has lives remaining
            if (justDied) {
              const updatedUnit = playerUpdates.subUnits[unitIndex];
              const livesRemaining = updatedUnit.livesRemaining ?? updatedUnit.revives ?? 1;
              if (livesRemaining > 0) {
                playerUpdates.reviveQueue = addToReviveQueue(playerUpdates, unitIndex);
              }
            }
          }
        }
      });

      // Check for squad wipe after all damage applied
      if (hasChanges && playerUpdates.subUnits) {
        const allDead = playerUpdates.subUnits.every(u => u.hp === 0);
        if (allDead) {
          // Squad wipe: clear queue, zero out all lives
          playerUpdates.reviveQueue = [];
          playerUpdates.subUnits = playerUpdates.subUnits.map(u => ({
            ...u,
            livesRemaining: 0,
            revives: 0,
          }));
        }
      }

      return hasChanges ? playerUpdates : player;
    });

    // CounterStrike — reflect ceil(dmg/2) back to attacker for any targeted unit with counterStrike
    let counterStrikeLog = [];
    const updatedWithCounter = updatedPlayers.map(player => {
      calculatorData.targetSquadMembers.forEach(target => {
        if (target.playerId !== player.id) return;
        const dmg = damageDistribution[`${target.playerId}-${target.unitType}`] || 0;
        if (dmg <= 0) return;

        const getEffects = (p, unitType) => {
          if (unitType === 'commander') return p.commanderStats?.statusEffects || [];
          const idx = unitType === 'special' ? 0 : parseInt((unitType||'').replace('soldier',''));
          return p.subUnits?.[idx]?.statusEffects || [];
        };
        if (!getEffects(player, target.unitType).some(ef => ef.type === 'counterStrike')) return;

        const reflect = Math.ceil(dmg / 2);
        counterStrikeLog.push({ targetPlayerId: player.id, reflect });
      });

      return player;
    });

    // Apply counter strike damage to attacker
    const attackerPlayer = players.find(p => p.id === calculatorData.attackerId);
    let finalPlayers = updatedWithCounter;
    if (counterStrikeLog.length > 0 && attackerPlayer) {
      const totalReflect = counterStrikeLog.reduce((s, r) => s + r.reflect, 0);
      const atkType = calculatorData.attackingUnitType;
      finalPlayers = updatedWithCounter.map(p => {
        if (p.id !== calculatorData.attackerId) return p;
        if (atkType === 'commander') {
          return { ...p, commanderStats: { ...p.commanderStats, hp: Math.max(0, p.commanderStats.hp - totalReflect) } };
        } else {
          const idx = atkType === 'special' ? 0 : parseInt(atkType.replace('soldier',''));
          return { ...p, subUnits: (p.subUnits||[]).map((u, si) => si === idx ? { ...u, hp: Math.max(0, u.hp - totalReflect) } : u) };
        }
      });
      counterStrikeLog.forEach(({ reflect }) => {
        addLog('⚡ Counter Strike! Reflected ' + reflect + 'hp back to ' + (attackerPlayer.playerName || 'attacker'));
      });
    }

    if (onPlayersUpdate) {
      onPlayersUpdate(finalPlayers);
    }

    // Log the action
    const attacker = players.find(p => p.id === calculatorData.attackerId);
    
    let attackerName = '';
    if (calculatorData.attackingUnitType === 'commander') {
      attackerName = attacker?.commanderStats?.customName || attacker?.commander || 'Commander';
    } else if (calculatorData.attackingUnitType === 'special') {
      attackerName = attacker?.subUnits?.[0]?.name || 'Special';
    } else {
      const soldierIndex = parseInt(calculatorData.attackingUnitType.replace('soldier', ''));
      attackerName = attacker?.subUnits?.[soldierIndex]?.name || `Unit ${soldierIndex}`;
    }

    const actionVerb =
      calculatorData.action === "shoot"
        ? "shot"
        : calculatorData.action === "melee"
          ? "attacked"
          : "used special weapon on";

    // Build target details — handles both player and NPC targets
    const allTargetDetails = [];

    // Player targets
    calculatorData.targetSquadMembers
      .filter((m) => !m.isNPC && damageDistribution[`${m.playerId}-${m.unitType}`] > 0)
      .forEach((m) => {
        const target = players.find((p) => p.id === m.playerId);
        const damage = damageDistribution[`${m.playerId}-${m.unitType}`];
        let unitName = '';
        if (m.unitType === 'commander') {
          unitName = target?.commanderStats?.customName || target?.commander || 'Commander';
        } else if (m.unitType === 'special') {
          unitName = target?.subUnits?.[0]?.name || 'Special';
        } else {
          const soldierIndex = parseInt(m.unitType.replace('soldier', ''));
          unitName = target?.subUnits?.[soldierIndex]?.name || `Unit ${soldierIndex}`;
        }
        allTargetDetails.push(`${target?.playerName || 'Unknown'}'s ${unitName} for ${damage}hp`);
      });

    // NPC targets
    calculatorData.targetSquadMembers
      .filter((m) => m.isNPC && damageDistribution[`npc-${m.npcId}`] > 0)
      .forEach((m) => {
        const npc = (calculatorData.npcs || []).find(n => n.id === m.npcId);
        const damage = damageDistribution[`npc-${m.npcId}`];
        allTargetDetails.push(`${npc?.name || 'NPC'} for ${damage}hp`);
      });

    const targetDetails = allTargetDetails.join(', ') || 'no targets';
    addLog(`${attacker?.playerName || 'Unknown'}'s ${attackerName} ${actionVerb} ${targetDetails}`);

    closeCalculator();
  };

  return {
    showCalculator,
    showDamageDistribution,
    calculatorData,
    damageDistribution,
    openCalculator,
    closeCalculator,
    closeCalculatorKeepDistribution,
    updateCalculatorHits,
    updateDamageDistribution,
    setShowDamageDistribution,
    setCalculatorData,
    applyDamage,
  };
};