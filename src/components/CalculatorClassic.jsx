import React from "react";
import { getUnitStats, getUnitName } from "../utils/statsUtils";

const Calculator = ({
  data,
  players,
  onClose,
  onProceedToDistribution,
  gameMode = "classic", // TODO: Mode-aware for future d20/d10 implementation
}) => {
  const [calculatorData, setCalculatorData] = React.useState(data);

  if (!calculatorData) return null;

  const attacker = players.find((p) => p.id === calculatorData.attackerId);
  if (!attacker) return null;

  const gold = "#c9a961";

  // Helper to get damage per hit for a unit
  const getDamagePerHit = (unitStats) => {
    if (calculatorData.action === "shoot") return unitStats.shootDamage || 1;
    if (calculatorData.action === "melee") return unitStats.meleeDamage || 1;
    if (calculatorData.action === "special")
      return unitStats.specialDamage || 2;
    return 0;
  };

  // Calculate total damage
  const calculateTotalDamage = () => {
    if (calculatorData.attackerIsSquad) {
      let total = 0;
      Object.entries(calculatorData.squadMemberHits || {}).forEach(
        ([unitType, hits]) => {
          const memberStats = getUnitStats(attacker, unitType);
          if (memberStats && hits > 0) {
            total += hits * getDamagePerHit(memberStats);
          }
        },
      );
      return total;
    } else {
      const attackingUnitStats = getUnitStats(
        attacker,
        calculatorData.attackingUnitType,
      );
      if (!attackingUnitStats) return 0;
      return (
        (calculatorData.soloHits || 0) * getDamagePerHit(attackingUnitStats)
      );
    }
  };

  const totalDamage = calculateTotalDamage();

  const handleProceed = () => {
    if (!calculatorData.targetId) return;

    // Prepare target squad members array
    let targetMembers = [];

    if (
      calculatorData.targetIsSquad &&
      calculatorData.targetSquadMembers?.length > 0
    ) {
      // Multiple targets selected
      targetMembers = calculatorData.targetSquadMembers;
    } else {
      // Single target - create array with one target
      targetMembers = [
        {
          playerId: calculatorData.targetId.playerId,
          unitType: calculatorData.targetId.unitType,
        },
      ];
    }

    // Pass updated data with targetSquadMembers populated
    onProceedToDistribution({
      ...calculatorData,
      targetSquadMembers: targetMembers,
    });
  };

  const canProceed = calculatorData.targetId && totalDamage > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a0f0a, #0f0805)",
          border: "3px solid " + gold,
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
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
          {calculatorData.action === "special"
            ? "⚡ Special Weapon"
            : calculatorData.action === "melee"
              ? "⚔️ Melee Attack"
              : "🎯 Ranged Attack"}
        </h3>

        {/* Attacker Info */}
        <div
          style={{ marginBottom: "1rem", color: gold, fontSize: "0.875rem" }}
        >
          <strong>Attacker:</strong> {calculatorData.attackerName} -{" "}
          {calculatorData.attackingUnitType === "commander"
            ? "⚔️ Commander"
            : calculatorData.attackingUnitType === "special"
              ? "⭐ Special"
              : `🛡️ ${calculatorData.attackingUnitType.replace("soldier", "Soldier ")}`}
        </div>

        {/* Attacker Squad Checkbox - Only for squad members, not commander */}
        {calculatorData.attackingUnitType !== "commander" && (
          <div
            style={{
              background: "#0a0503",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "2px solid " + gold,
              marginBottom: "1rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: gold,
                fontSize: "0.875rem",
                cursor: "pointer",
                marginBottom: calculatorData.attackerIsSquad ? "0.75rem" : "0",
              }}
            >
              <input
                type="checkbox"
                checked={!!calculatorData.attackerIsSquad}
                onChange={(e) => {
                  setCalculatorData({
                    ...calculatorData,
                    attackerIsSquad: e.target.checked,
                    attackerSquadMembers: e.target.checked
                      ? [calculatorData.attackingUnitType]
                      : [],
                  });
                }}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <strong>
                Form Attacker Squad? (up to 3 units attack together)
              </strong>
            </label>

            {/* Attacker Squad Member Selection */}
            {calculatorData.attackerIsSquad && (
              <div>
                <div
                  style={{
                    color: "#8b7355",
                    fontSize: "0.7rem",
                    marginBottom: "0.5rem",
                    paddingLeft: "1.5rem",
                  }}
                >
                  Select squad members (max 3):
                </div>
                {attacker.subUnits.map((unit, idx) => {
                  if (unit.hp === 0) return null;
                  const unitType = idx === 0 ? "special" : `soldier${idx}`;
                  const isSelected =
                    calculatorData.attackerSquadMembers?.includes(unitType);
                  const canSelect =
                    isSelected ||
                    (calculatorData.attackerSquadMembers?.length || 0) < 3;

                  return (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem",
                        marginBottom: "0.25rem",
                        marginLeft: "1.5rem",
                        background: isSelected ? "#2a1810" : "transparent",
                        border: isSelected
                          ? "1px solid " + gold
                          : "1px solid transparent",
                        borderRadius: "4px",
                        color: isSelected ? gold : "#8b7355",
                        fontSize: "0.75rem",
                        cursor: canSelect ? "pointer" : "not-allowed",
                        opacity: canSelect ? 1 : 0.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={(e) => {
                          let newMembers = [
                            ...(calculatorData.attackerSquadMembers || []),
                          ];
                          if (e.target.checked) {
                            newMembers.push(unitType);
                          } else {
                            newMembers = newMembers.filter(
                              (m) => m !== unitType,
                            );
                          }
                          setCalculatorData({
                            ...calculatorData,
                            attackerSquadMembers: newMembers,
                          });
                        }}
                        style={{ width: "14px", height: "14px" }}
                      />
                      {unit.name || (idx === 0 ? "⭐ Special" : `🛡️ Soldier ${idx}`)} (
                      {unit.hp}hp)
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Target Squad Checkbox */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: gold,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!calculatorData.targetIsSquad}
              onChange={(e) => {
                setCalculatorData({
                  ...calculatorData,
                  targetIsSquad: e.target.checked,
                  targetSquadMembers: [],
                  targetId: null,
                });
              }}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <strong>Target Squad?</strong>
          </label>
        </div>

        {/* Target Selection */}
        {!calculatorData.targetIsSquad ? (
          // Single Target
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                color: gold,
                fontSize: "0.875rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              <strong>Select Target:</strong>
            </label>
            <select
              value={
                calculatorData.targetId
                  ? `${calculatorData.targetId.playerId}-${calculatorData.targetId.unitType}`
                  : ""
              }
              onChange={(e) => {
                const [playerId, unitType] = e.target.value.split("-");
                setCalculatorData({
                  ...calculatorData,
                  targetId: playerId
                    ? { playerId: parseInt(playerId), unitType }
                    : null,
                });
              }}
              style={{
                width: "100%",
                background: "#0a0503",
                color: gold,
                padding: "0.75rem",
                borderRadius: "6px",
                border: "2px solid #5a4a3a",
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <option value="">Select Target...</option>
              {players
                .filter((p) => p.id !== calculatorData.attackerId)
                .map((p) => (
                  <optgroup key={p.id} label={p.playerName || "Player"}>
                    <option value={`${p.id}-commander`}>
                      ⚔️ {p.commander} ({p.commanderStats.hp}hp)
                    </option>
                    {p.subUnits.map((unit, idx) => (
                      <option
                        key={idx}
                        value={`${p.id}-${idx === 0 ? "special" : `soldier${idx}`}`}
                      >
                        {idx === 0 ? "⭐" : "🛡️"}{" "}
                        {unit.name || (idx === 0 ? "Special" : `Soldier ${idx + 1}`)} (
                        {unit.hp}hp)
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </div>
        ) : (
          // Squad Target Selection
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                color: gold,
                fontSize: "0.875rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              <strong>Select Target Player:</strong>
            </label>
            <select
              value={calculatorData.targetId?.playerId || ""}
              onChange={(e) => {
                setCalculatorData({
                  ...calculatorData,
                  targetId: e.target.value
                    ? { playerId: parseInt(e.target.value) }
                    : null,
                  targetSquadMembers: [],
                });
              }}
              style={{
                width: "100%",
                background: "#0a0503",
                color: gold,
                padding: "0.75rem",
                borderRadius: "6px",
                border: "2px solid #5a4a3a",
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: "0.875rem",
                cursor: "pointer",
                marginBottom: "0.75rem",
              }}
            >
              <option value="">Select Player...</option>
              {players
                .filter((p) => p.id !== calculatorData.attackerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.playerName || "Player"}
                  </option>
                ))}
            </select>

            {/* Squad Member Selection */}
            {calculatorData.targetId?.playerId &&
              (() => {
                const targetPlayer = players.find(
                  (p) => p.id === calculatorData.targetId.playerId,
                );
                if (!targetPlayer) return null;

                return (
                  <div
                    style={{
                      background: "#0a0503",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #5a4a3a",
                    }}
                  >
                    <div
                      style={{
                        color: gold,
                        fontSize: "0.75rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Select squad members (1-3):
                    </div>
                    {targetPlayer.subUnits.map((unit, idx) => {
                      if (unit.hp === 0) return null;
                      const unitType = idx === 0 ? "special" : `soldier${idx}`;
                      const isSelected =
                        calculatorData.targetSquadMembers?.some(
                          (m) => m.unitType === unitType,
                        );
                      const canSelect =
                        isSelected ||
                        (calculatorData.targetSquadMembers?.length || 0) < 3;

                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem",
                            marginBottom: "0.25rem",
                            background: isSelected ? "#2a1810" : "transparent",
                            border: isSelected
                              ? "1px solid " + gold
                              : "1px solid transparent",
                            borderRadius: "4px",
                            color: "#8b7355",
                            fontSize: "0.75rem",
                            cursor: canSelect ? "pointer" : "not-allowed",
                            opacity: canSelect ? 1 : 0.5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={(e) => {
                              let newTargets = [
                                ...(calculatorData.targetSquadMembers || []),
                              ];
                              if (e.target.checked) {
                                newTargets.push({
                                  playerId: calculatorData.targetId.playerId,
                                  unitType,
                                  unitIndex: idx,
                                });
                              } else {
                                newTargets = newTargets.filter(
                                  (m) => m.unitType !== unitType,
                                );
                              }
                              setCalculatorData({
                                ...calculatorData,
                                targetSquadMembers: newTargets,
                              });
                            }}
                            style={{ width: "14px", height: "14px" }}
                          />
                          {unit.name || (idx === 0 ? "⭐ Special" : `🛡️ Soldier ${idx + 1}`)} (
                          {unit.hp}hp)
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        )}

        {/* Hit Input */}
        {calculatorData.attackerIsSquad ? (
          // Squad Hit Input (for selected attacking squad members)
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                color: gold,
                fontSize: "0.875rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              <strong>Enter hits for each attacking squad member:</strong>
            </label>
            <div
              style={{
                background: "#0a0503",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid #5a4a3a",
              }}
            >
              {(calculatorData.attackerSquadMembers || []).map((unitType) => {
                const idx =
                  unitType === "special"
                    ? 0
                    : parseInt(unitType.replace("soldier", ""));
                const unit = attacker.subUnits[idx];
                const memberStats = getUnitStats(attacker, unitType);
                const maxHits = memberStats?.attacksPerHit || 1;
                const damagePerHit = memberStats
                  ? getDamagePerHit(memberStats)
                  : 0;
                const currentHits =
                  (calculatorData.squadMemberHits || {})[unitType] || 0;

                return (
                  <div
                    key={unitType}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      marginBottom: "0.25rem",
                      background: currentHits > 0 ? "#2a1810" : "transparent",
                      border:
                        currentHits > 0
                          ? "1px solid " + gold
                          : "1px solid transparent",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ flex: 1, color: gold }}>
                      {unitType === "special"
                        ? "⭐ Special"
                        : `🛡️ ${unitType.replace("soldier", "Soldier ")}`}
                      <span style={{ color: "#8b7355", marginLeft: "0.5rem" }}>
                        ({damagePerHit}hp per hit, max {maxHits})
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ color: "#8b7355" }}>Hits:</span>
                      <input
                        type="number"
                        min="0"
                        max={maxHits}
                        value={currentHits}
                        onChange={(e) => {
                          const newHits = Math.min(
                            maxHits,
                            Math.max(0, parseInt(e.target.value) || 0),
                          );
                          setCalculatorData({
                            ...calculatorData,
                            squadMemberHits: {
                              ...(calculatorData.squadMemberHits || {}),
                              [unitType]: newHits,
                            },
                          });
                        }}
                        style={{
                          width: "50px",
                          background: "#1a0f0a",
                          color: gold,
                          padding: "0.25rem",
                          borderRadius: "4px",
                          border: "1px solid #5a4a3a",
                          textAlign: "center",
                          fontSize: "0.75rem",
                        }}
                      />
                      <span
                        style={{
                          color: "#fecaca",
                          fontSize: "0.75rem",
                          minWidth: "40px",
                        }}
                      >
                        = {currentHits * damagePerHit}hp
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Solo Hit Input (single unit attacking)
          (() => {
            const attackingUnitStats = getUnitStats(
              attacker,
              calculatorData.attackingUnitType,
            );
            if (!attackingUnitStats) return null;

            return (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    color: gold,
                    fontSize: "0.875rem",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  <strong>Number of Successful Hits:</strong>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    max={attackingUnitStats.attacksPerHit}
                    value={calculatorData.soloHits || 0}
                    onChange={(e) => {
                      const newHits = Math.min(
                        attackingUnitStats.attacksPerHit,
                        Math.max(0, parseInt(e.target.value) || 0),
                      );
                      setCalculatorData({
                        ...calculatorData,
                        soloHits: newHits,
                        stats: attackingUnitStats, // Store stats for later use
                      });
                    }}
                    style={{
                      width: "80px",
                      background: "#0a0503",
                      color: gold,
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "2px solid #5a4a3a",
                      textAlign: "center",
                      fontSize: "1rem",
                      fontFamily: '"Cinzel", Georgia, serif',
                    }}
                  />
                  <span style={{ color: "#8b7355", fontSize: "0.875rem" }}>
                    (out of {attackingUnitStats.attacksPerHit} possible)
                  </span>
                </div>
              </div>
            );
          })()
        )}

        {/* Total Damage Display */}
        {totalDamage >= 0 && (
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
                marginBottom: "0.5rem",
              }}
            >
              Total Damage
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
        )}

        {/* TODO: Mode indicator for future d20/d10 implementation */}
        {/* {gameMode !== 'classic' && (
          <div style={{ marginBottom: '1rem', color: '#8b7355', fontSize: '0.75rem', textAlign: 'center' }}>
            Mode: {gameMode}
          </div>
        )} */}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            style={{
              flex: 1,
              background: canProceed
                ? "linear-gradient(to bottom, #15803d, #14532d)"
                : "#1a0f0a",
              color: canProceed ? "#86efac" : "#4a3322",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "2px solid",
              borderColor: canProceed ? "#16a34a" : "#4a3322",
              cursor: canProceed ? "pointer" : "not-allowed",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            ✓ Proceed
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

export default Calculator;