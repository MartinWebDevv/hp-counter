import React from "react";
import { getUnitName, getUnitStats } from "../utils/statsUtils";

const DamageDistribution = ({
  calculatorData,
  players,
  damageDistribution,
  onUpdateDistribution,
  onApply,
  onClose,
}) => {
  if (!calculatorData) return null;

  const gold = "#c9a961";

  // Calculate total damage available
  const calculateTotalDamage = () => {
    // Check if D20 mode data exists (priority check)
    if (calculatorData.totalDamage !== undefined) {
      console.log("D20 Mode - Total damage:", calculatorData.totalDamage);
      return calculatorData.totalDamage;
    }

    console.log("=== DEBUGGING DAMAGE CALCULATION ===");
    console.log("calculatorData:", calculatorData);
    console.log("attackerIsSquad:", calculatorData.attackerIsSquad);
    console.log("soloHits:", calculatorData.soloHits);
    console.log("squadMemberHits:", calculatorData.squadMemberHits);

    // Classic mode calculation
    if (calculatorData.attackerIsSquad) {
      let total = 0;
      Object.entries(calculatorData.squadMemberHits || {}).forEach(
        ([unitType, hits]) => {
          const attacker = players.find(
            (p) => p.id === calculatorData.attackerId,
          );
          if (!attacker) return;

          const memberStats = getUnitStats(attacker, unitType);
          console.log(`Unit ${unitType}: hits=${hits}, stats=`, memberStats);

          if (!memberStats) return;

          const damagePerHit =
            calculatorData.action === "shoot"
              ? memberStats.shootDamage
              : calculatorData.action === "melee"
                ? memberStats.meleeDamage
                : memberStats.specialDamage || 2;

          console.log(
            `  damagePerHit=${damagePerHit}, total damage=${hits * damagePerHit}`,
          );
          total += hits * damagePerHit;
        },
      );
      console.log("Total damage (squad):", total);
      return total;
    } else {
      const attacker = players.find((p) => p.id === calculatorData.attackerId);
      if (!attacker) return 0;

      const attackingUnitStats = getUnitStats(
        attacker,
        calculatorData.attackingUnitType,
      );

      console.log("Attacking unit stats:", attackingUnitStats);
      console.log("Solo hits:", calculatorData.soloHits);

      if (!attackingUnitStats) return 0;

      const damagePerHit =
        calculatorData.action === "shoot"
          ? attackingUnitStats.shootDamage
          : calculatorData.action === "melee"
            ? attackingUnitStats.meleeDamage
            : attackingUnitStats.specialDamage || 2;

      console.log("Damage per hit:", damagePerHit);
      console.log(
        "Total damage (solo):",
        (calculatorData.soloHits || 0) * damagePerHit,
      );

      return (calculatorData.soloHits || 0) * damagePerHit;
    }
  };

  const totalDamage = calculateTotalDamage();
  const totalDistributed = Object.values(damageDistribution).reduce(
    (sum, val) => sum + val,
    0,
  );
  const remaining = totalDamage - totalDistributed;

  // Get target info (MOVE THIS UP)
  const targets = calculatorData.targetSquadMembers || [];

  // Auto-handle single target ONLY for Classic mode
  React.useEffect(() => {
    // Skip auto-apply for D20 mode - let user see the distribution
    if (calculatorData.totalDamage !== undefined) return;
    
    if (targets.length === 1 && totalDamage > 0 && totalDistributed === 0) {
      const target = targets[0];
      const targetKey = `${target.playerId}-${target.unitType}`;

      // Auto-assign all damage
      onUpdateDistribution(targetKey, totalDamage);

      // Auto-apply after brief delay
      setTimeout(() => {
        onApply();
      }, 500);
    }
  }, [
    targets.length,
    totalDamage,
    totalDistributed,
    onUpdateDistribution,
    onApply,
  ]);

  const handleDistributionChange = (targetKey, value) => {
    const numValue = parseInt(value) || 0;
    onUpdateDistribution(targetKey, Math.max(0, numValue));
  };

  const handleApply = () => {
    if (remaining !== 0) {
      alert(`You must distribute all ${totalDamage}hp before applying!`);
      return;
    }
    onApply();
  };

  // Auto-distribute remaining damage evenly
  const autoDistribute = () => {
    const perTarget = Math.floor(totalDamage / targets.length);
    const remainder = totalDamage % targets.length;

    const newDistribution = {};
    targets.forEach((target, idx) => {
      const key = `${target.playerId}-${target.unitType}`;
      newDistribution[key] = perTarget + (idx < remainder ? 1 : 0);
    });

    Object.entries(newDistribution).forEach(([key, value]) => {
      onUpdateDistribution(key, value);
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a0f0a, #0f0805)",
          border: "3px solid " + gold,
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "95%",
          width: "1000px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Title */}
        <h3
          style={{
            color: gold,
            fontSize: "1.5rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontFamily: '"Cinzel", Georgia, serif',
            textShadow: "2px 2px 4px rgba(0,0,0,1)",
          }}
        >
          💥 Distribute Damage
        </h3>

        {/* Total Damage Display */}
        <div
          style={{
            background: "#0a0503",
            padding: "1rem",
            borderRadius: "6px",
            border: "2px solid " + gold,
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: gold,
              fontSize: "0.875rem",
              marginBottom: "0.25rem",
            }}
          >
            Total Damage Available
          </div>
          <div
            style={{
              color: "#fecaca",
              fontSize: "2rem",
              fontWeight: "bold",
              fontFamily: '"Cinzel", Georgia, serif',
            }}
          >
            {totalDamage}hp
          </div>
        </div>

        {/* Remaining Counter */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "1rem",
            padding: "0.5rem",
            background:
              remaining === 0
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: remaining === 0 ? "#22c55e" : "#ef4444",
          }}
        >
          <span
            style={{
              color: remaining === 0 ? "#86efac" : "#fca5a5",
              fontSize: "0.875rem",
              fontWeight: "bold",
            }}
          >
            {remaining === 0
              ? "✓ All damage distributed!"
              : `⚠️ ${Math.abs(remaining)}hp ${remaining > 0 ? "remaining" : "over-allocated"}`}
          </span>
        </div>

        {/* Auto Distribute Button */}
        <button
          onClick={autoDistribute}
          style={{
            width: "100%",
            background: "linear-gradient(to bottom, #7c3aed, #6d28d9)",
            border: "2px solid #a78bfa",
            color: "#e9d5ff",
            padding: "0.5rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: '"Cinzel", Georgia, serif',
            fontWeight: "bold",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          ⚡ Auto-Distribute Evenly
        </button>

        {/* Target Distribution */}
        <div
          style={{
            background: "#0a0503",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #5a4a3a",
            marginBottom: "1rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {targets.map((target) => {
            const targetPlayer = players.find((p) => p.id === target.playerId);
            if (!targetPlayer) return null;

            const targetKey = `${target.playerId}-${target.unitType}`;
            const currentDamage = damageDistribution[targetKey] || 0;

            // Get unit info
            let unitName = "";
            let unitHP = 0;

            if (target.unitType === "commander") {
              unitName = targetPlayer.commander || "Commander";
              unitHP = targetPlayer.commanderStats.hp;
            } else {
              const idx =
                target.unitType === "special"
                  ? 0
                  : parseInt(target.unitType.replace("soldier", ""));
              const unit = targetPlayer.subUnits[idx];
              unitName =
                target.unitType === "special" ? "Special" : `Soldier ${idx}`;
              unitHP = unit.hp;
            }

            return (
              <div
                key={targetKey}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                  background: currentDamage > 0 ? "#2a1810" : "transparent",
                  border:
                    currentDamage > 0
                      ? "1px solid " + gold
                      : "1px solid #3a2a1a",
                  borderRadius: "6px",
                }}
              >
                {/* Target Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: gold,
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                    }}
                  >
                    {targetPlayer.playerName || "Player"}
                  </div>
                  <div style={{ color: "#8b7355", fontSize: "0.75rem" }}>
                    {target.unitType === "commander"
                      ? "⚔️"
                      : target.unitType === "special"
                        ? "⭐"
                        : "🛡️"}{" "}
                    {unitName} ({unitHP}hp)
                  </div>
                </div>

                {/* Damage Input */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    onClick={() =>
                      handleDistributionChange(targetKey, currentDamage - 1)
                    }
                    disabled={currentDamage === 0}
                    style={{
                      background:
                        currentDamage === 0
                          ? "#1a0f0a"
                          : "rgba(255, 255, 255, 0.1)",
                      border: "1px solid #5a4a3a",
                      color: currentDamage === 0 ? "#4a3322" : gold,
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      cursor: currentDamage === 0 ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={unitHP}
                    value={currentDamage}
                    onChange={(e) =>
                      handleDistributionChange(targetKey, e.target.value)
                    }
                    style={{
                      width: "60px",
                      background: "#1a0f0a",
                      color: gold,
                      padding: "0.5rem",
                      borderRadius: "4px",
                      border: "1px solid #5a4a3a",
                      textAlign: "center",
                      fontSize: "1rem",
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontWeight: "bold",
                    }}
                  />

                  <button
                    onClick={() =>
                      handleDistributionChange(targetKey, currentDamage + 1)
                    }
                    disabled={currentDamage >= unitHP}
                    style={{
                      background:
                        currentDamage >= unitHP
                          ? "#1a0f0a"
                          : "rgba(255, 255, 255, 0.1)",
                      border: "1px solid #5a4a3a",
                      color: currentDamage >= unitHP ? "#4a3322" : gold,
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      cursor:
                        currentDamage >= unitHP ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    +
                  </button>

                  <span
                    style={{
                      color: "#fecaca",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                      minWidth: "40px",
                    }}
                  >
                    {currentDamage}hp
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleApply}
            disabled={remaining !== 0}
            style={{
              flex: 1,
              background:
                remaining === 0
                  ? "linear-gradient(to bottom, #15803d, #14532d)"
                  : "#1a0f0a",
              color: remaining === 0 ? "#86efac" : "#4a3322",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "2px solid",
              borderColor: remaining === 0 ? "#16a34a" : "#4a3322",
              cursor: remaining === 0 ? "pointer" : "not-allowed",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            ✓ Apply Damage
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "linear-gradient(to bottom, #7f1d1d, #5f1a1a)",
              color: "#fecaca",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "2px solid #991b1b",
              cursor: "pointer",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DamageDistribution;