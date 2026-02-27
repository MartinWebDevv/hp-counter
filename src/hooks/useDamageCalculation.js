import { useState } from "react";
import { calculateTotalAvailableDamage } from "../utils/statsUtils";

/**
 * Custom hook for managing damage calculation and distribution
 */
export const useDamageCalculation = (players, addLog) => {
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
      attackingUnitType, // Which unit is initiating the attack
      attackerIsSquad: false, // Will be toggled in Calculator UI
      attackerSquadMembers: [], // Will be populated if squad checkbox is checked
      action, // 'shoot', 'melee', or 'special'
      targetId: null,
      squadMemberHits: {},
      soloHits: 0,
      targetSquadMembers: [],
      targetIsSquad: false,
    });
    setShowCalculator(true);
  };

  const closeCalculator = () => {
    setShowCalculator(false);
    setShowDamageDistribution(false);
    setCalculatorData(null);
    setDamageDistribution({});
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

  const applyDamage = (onPlayersUpdate) => {
    if (!calculatorData) return;

    // Calculate total available damage
    let totalAvailable;
    if (calculatorData.totalDamage !== undefined) {
      // D20 mode - use the totalDamage directly
      totalAvailable = calculatorData.totalDamage;
    } else {
      // Classic mode - calculate from hits
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

    // Apply damage to each target
    const updatedPlayers = players.map((player) => {
      const playerUpdates = { ...player };
      let hasChanges = false;

      // Check if this player used special action (set cooldown)
      if (player.id === calculatorData.attackerId && 
          calculatorData.action === 'special' && 
          calculatorData.attackingUnitType === 'commander') {
        hasChanges = true;
        playerUpdates.commanderStats = {
          ...playerUpdates.commanderStats,
          cooldownRounds: 2 // Set 2-round cooldown
        };
      }

      // Check each target for this player
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
            const unitIndex =
              target.unitType === "special"
                ? 0
                : parseInt(target.unitType.replace("soldier", ""));

            playerUpdates.subUnits = playerUpdates.subUnits.map((unit, idx) =>
              idx === unitIndex
                ? { ...unit, hp: Math.max(0, unit.hp - damageAmount) }
                : unit,
            );
          }
        }
      });

      return hasChanges ? playerUpdates : player;
    });

    // Update players through callback
    if (onPlayersUpdate) {
      onPlayersUpdate(updatedPlayers);
    }

    // Log the action
    const attacker = players.find(p => p.id === calculatorData.attackerId);
    
    // Get attacker's name (with custom name support)
    let attackerName = '';
    if (calculatorData.attackingUnitType === 'commander') {
      attackerName = attacker?.commanderCustomName || attacker?.commander || 'Commander';
    } else if (calculatorData.attackingUnitType === 'special') {
      attackerName = attacker?.subUnits[0]?.name || 'Special Unit';
    } else {
      const soldierIndex = parseInt(calculatorData.attackingUnitType.replace('soldier', ''));
      attackerName = attacker?.subUnits[soldierIndex]?.name || `Soldier ${soldierIndex}`;
    }

    const actionVerb =
      calculatorData.action === "shoot"
        ? "shot"
        : calculatorData.action === "melee"
          ? "attacked"
          : "used special weapon on";

    const targetDetails = calculatorData.targetSquadMembers
      .filter((m) => damageDistribution[`${m.playerId}-${m.unitType}`] > 0)
      .map((m) => {
        const target = players.find((p) => p.id === m.playerId);
        const damage = damageDistribution[`${m.playerId}-${m.unitType}`];
        
        // Get target's custom name
        let unitName = '';
        if (m.unitType === 'commander') {
          unitName = target?.commanderCustomName || target?.commander || 'Commander';
        } else if (m.unitType === 'special') {
          unitName = target?.subUnits[0]?.name || 'Special Unit';
        } else {
          const soldierIndex = parseInt(m.unitType.replace('soldier', ''));
          unitName = target?.subUnits[soldierIndex]?.name || `Soldier ${soldierIndex}`;
        }
        
        return `${target?.playerName || "Unknown"}'s ${unitName} (${damage}hp)`;
      })
      .join(", ");

    addLog(`${attacker?.playerName || "Unknown"}'s ${attackerName} ${actionVerb} ${targetDetails}`);

    // Close modals
    closeCalculator();
  };

  return {
    showCalculator,
    showDamageDistribution,
    calculatorData,
    damageDistribution,
    openCalculator,
    closeCalculator,
    updateCalculatorHits,
    updateDamageDistribution,
    setShowDamageDistribution,
    setCalculatorData,
    applyDamage,
  };
};