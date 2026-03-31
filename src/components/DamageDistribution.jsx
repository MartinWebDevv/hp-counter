import React from "react";
import { getUnitName, getUnitStats } from "../utils/statsUtils";

const DamageDistribution = ({
  calculatorData,
  players,
  npcs = [],
  damageDistribution,
  onUpdateDistribution,
  onApply,
  onClose,
}) => {
  if (!calculatorData) return null;

  const gold = "#c9a961";

  const totalDamage = calculatorData.totalDamage !== undefined
    ? calculatorData.totalDamage
    : (() => {
        if (calculatorData.attackerIsSquad) {
          let total = 0;
          Object.entries(calculatorData.squadMemberHits || {}).forEach(([unitType, hits]) => {
            const attacker = players.find(p => p.id === calculatorData.attackerId);
            if (!attacker) return;
            const memberStats = getUnitStats(attacker, unitType);
            if (!memberStats) return;
            const dmg = calculatorData.action === "shoot" ? memberStats.shootDamage
              : calculatorData.action === "melee" ? memberStats.meleeDamage
              : memberStats.specialDamage || 2;
            total += hits * dmg;
          });
          return total;
        } else {
          const attacker = players.find(p => p.id === calculatorData.attackerId);
          if (!attacker) return 0;
          const stats = getUnitStats(attacker, calculatorData.attackingUnitType);
          if (!stats) return 0;
          const dmg = calculatorData.action === "shoot" ? stats.shootDamage
            : calculatorData.action === "melee" ? stats.meleeDamage
            : stats.specialDamage || 2;
          return (calculatorData.soloHits || 0) * dmg;
        }
      })();

  const totalDistributed = Object.values(damageDistribution).reduce((sum, v) => sum + v, 0);
  const remaining = totalDamage - totalDistributed;

  const targets = calculatorData.targetSquadMembers || [];

  // Single target: pre-fill the full damage amount (DM still clicks Apply)
  const singleInitDone = React.useRef(false);
  React.useEffect(() => {
    if (singleInitDone.current) return;
    if (targets.length !== 1 || totalDamage <= 0) return;
    singleInitDone.current = true;
    const target = targets[0];
    const key = target.isNPC ? `npc-${target.npcId}` : `${target.playerId}-${target.unitType}`;
    onUpdateDistribution(key, totalDamage);
  }, [targets.length, totalDamage]);

  // Multiple targets: auto-distribute evenly once on mount
  const autoInitDone = React.useRef(false);
  React.useEffect(() => {
    if (autoInitDone.current) return;
    if (targets.length <= 1 || totalDamage <= 0) return;
    autoInitDone.current = true;
    const perTarget = Math.floor(totalDamage / targets.length);
    const remainder = totalDamage % targets.length;
    targets.forEach((target, idx) => {
      const key = target.isNPC ? `npc-${target.npcId}` : `${target.playerId}-${target.unitType}`;
      onUpdateDistribution(key, perTarget + (idx < remainder ? 1 : 0));
    });
  }, [targets.length, totalDamage]);

  const handleDistributionChange = (key, value) => {
    onUpdateDistribution(key, Math.max(0, parseInt(value) || 0));
  };

  const autoDistribute = () => {
    const perTarget = Math.floor(totalDamage / targets.length);
    const remainder = totalDamage % targets.length;
    targets.forEach((target, idx) => {
      const key = target.isNPC
        ? `npc-${target.npcId}`
        : `${target.playerId}-${target.unitType}`;
      onUpdateDistribution(key, perTarget + (idx < remainder ? 1 : 0));
    });
  };

  const handleApply = (distOverride) => {
    if (remaining !== 0) return;
    onApply(distOverride || damageDistribution);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a0f0a, #0f0805)",
          border: "3px solid " + gold,
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "95%", width: "1000px",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Title */}
        <h3 style={{
          color: gold, fontSize: "1.5rem", marginBottom: "1rem",
          textAlign: "center", fontFamily: '"Cinzel", Georgia, serif',
          textShadow: "2px 2px 4px rgba(0,0,0,1)",
        }}>
          💥 Distribute Damage
        </h3>

        {/* Total */}
        <div style={{
          background: "#0a0503", padding: "1rem", borderRadius: "6px",
          border: "2px solid " + gold, marginBottom: "1rem", textAlign: "center",
        }}>
          <div style={{ color: gold, fontSize: "0.875rem", marginBottom: "0.25rem" }}>Total Damage Available</div>
          <div style={{ color: "#fecaca", fontSize: "2rem", fontWeight: "bold", fontFamily: '"Cinzel", Georgia, serif' }}>
            {totalDamage}hp
          </div>
        </div>

        {/* Remaining */}
        <div style={{
          textAlign: "center", marginBottom: "1rem", padding: "0.5rem",
          background: remaining === 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
          borderRadius: "6px", border: "1px solid",
          borderColor: remaining === 0 ? "#22c55e" : "#ef4444",
        }}>
          <span style={{ color: remaining === 0 ? "#86efac" : "#fca5a5", fontSize: "0.875rem", fontWeight: "bold" }}>
            {remaining === 0
              ? "✓ All damage distributed!"
              : `⚠️ ${Math.abs(remaining)}hp ${remaining > 0 ? "remaining" : "over-allocated"}`}
          </span>
        </div>

        {/* Auto distribute */}
        {targets.length > 1 && (
          <button
            onClick={autoDistribute}
            style={{
              width: "100%",
              background: "linear-gradient(to bottom, #7c3aed, #6d28d9)",
              border: "2px solid #a78bfa", color: "#e9d5ff",
              padding: "0.5rem", borderRadius: "6px", cursor: "pointer",
              fontFamily: '"Cinzel", Georgia, serif', fontWeight: "bold",
              fontSize: "0.875rem", marginBottom: "1rem",
            }}
          >
            ⚡ Auto-Distribute Evenly
          </button>
        )}

        {/* Target rows */}
        <div style={{
          background: "#0a0503", padding: "0.75rem", borderRadius: "6px",
          border: "1px solid #5a4a3a", marginBottom: "1rem",
          maxHeight: "300px", overflowY: "auto",
        }}>
          {targets.map((target) => {
            // ── NPC target ──────────────────────────────────────────────────
            if (target.isNPC) {
              const npc = npcs.find(n => n.id === target.npcId);
              if (!npc) return null;
              const key = `npc-${npc.id}`;
              const currentDamage = damageDistribution[key] || 0;
              const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
              const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';

              return (
                <div key={key} style={{
                  padding: "0.75rem", marginBottom: "0.5rem",
                  background: currentDamage > 0 ? "#1a0805" : "transparent",
                  border: currentDamage > 0 ? "1px solid #ef4444" : "1px solid #3a2a1a",
                  borderRadius: "6px",
                  borderLeft: "3px solid #ef4444",
                }}>
                  {/* NPC name + HP bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fca5a5", fontSize: "0.95rem", fontWeight: "bold" }}>
                        👾 {npc.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                        <div style={{ flex: 1, height: "4px", background: "rgba(0,0,0,0.5)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor, borderRadius: "2px" }} />
                        </div>
                        <span style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "600", flexShrink: 0 }}>
                          {npc.hp}/{npc.maxHp}hp
                        </span>
                        <span style={{ color: "#5eead4", fontSize: "0.72rem", fontWeight: "700" }}>
                          🛡️{npc.armor}+
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Damage controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button onClick={() => handleDistributionChange(key, currentDamage - 1)}
                      disabled={currentDamage === 0}
                      style={distBtn(currentDamage === 0)}>−</button>
                    <input
                      type="number" min="0" value={currentDamage}
                      onChange={e => handleDistributionChange(key, e.target.value)}
                      style={distInput}
                    />
                    <button onClick={() => handleDistributionChange(key, currentDamage + 1)}
                      style={distBtn(false)}>+</button>
                    <span style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: "bold", minWidth: "40px" }}>
                      {currentDamage}hp
                    </span>
                  </div>
                </div>
              );
            }

            // ── Player target ────────────────────────────────────────────────
            const targetPlayer = players.find(p => p.id === target.playerId);
            if (!targetPlayer) return null;

            const key = `${target.playerId}-${target.unitType}`;
            const currentDamage = damageDistribution[key] || 0;

            let unitName = "";
            let unitHP = 0;
            if (target.unitType === "commander") {
              unitName = targetPlayer.commanderStats?.customName || targetPlayer.commander || "Commander";
              unitHP = targetPlayer.commanderStats.hp;
            } else {
              const idx = target.unitType === "special" ? 0 : parseInt(target.unitType.replace("soldier", ""));
              const unit = targetPlayer.subUnits[idx];
              const fallback = target.unitType === "special" ? "Special" : `Soldier ${idx}`;
              unitName = unit?.name?.trim() ? unit.name : fallback;
              unitHP = unit?.hp || 0;
            }

            return (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "0.5rem", padding: "0.75rem", marginBottom: "0.5rem",
                background: currentDamage > 0 ? "#2a1810" : "transparent",
                border: currentDamage > 0 ? "1px solid " + gold : "1px solid #3a2a1a",
                borderRadius: "6px",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: gold, fontSize: "0.875rem", fontWeight: "bold" }}>
                    {targetPlayer.playerName || "Player"}
                  </div>
                  <div style={{ color: "#8b7355", fontSize: "0.75rem" }}>
                    {target.unitType === "commander" ? "⚔️" : target.unitType === "special" ? "⭐" : "🛡️"}{" "}
                    {unitName} ({unitHP}hp)
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button onClick={() => handleDistributionChange(key, currentDamage - 1)}
                    disabled={currentDamage === 0} style={distBtn(currentDamage === 0)}>−</button>
                  <input
                    type="number" min="0" max={unitHP} value={currentDamage}
                    onChange={e => handleDistributionChange(key, e.target.value)}
                    style={distInput}
                  />
                  <button onClick={() => handleDistributionChange(key, currentDamage + 1)}
                    disabled={currentDamage >= unitHP} style={distBtn(currentDamage >= unitHP)}>+</button>
                  <span style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: "bold", minWidth: "40px" }}>
                    {currentDamage}hp
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => handleApply(damageDistribution)} disabled={remaining !== 0} style={{
            flex: 1,
            background: remaining === 0 ? "linear-gradient(to bottom, #15803d, #14532d)" : "#1a0f0a",
            color: remaining === 0 ? "#86efac" : "#4a3322",
            padding: "0.75rem", borderRadius: "6px", border: "2px solid",
            borderColor: remaining === 0 ? "#16a34a" : "#4a3322",
            cursor: remaining === 0 ? "pointer" : "not-allowed",
            fontFamily: '"Cinzel", Georgia, serif', fontWeight: "bold", fontSize: "1rem",
          }}>✓ Apply Damage</button>
          <button onClick={onClose} style={{
            flex: 1,
            background: "linear-gradient(to bottom, #7f1d1d, #5f1a1a)",
            color: "#fecaca", padding: "0.75rem", borderRadius: "6px",
            border: "2px solid #991b1b", cursor: "pointer",
            fontFamily: '"Cinzel", Georgia, serif', fontWeight: "bold", fontSize: "1rem",
          }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

const distBtn = (disabled) => ({
  background: disabled ? "#1a0f0a" : "rgba(255,255,255,0.1)",
  border: "1px solid #5a4a3a",
  color: disabled ? "#4a3322" : "#c9a961",
  padding: "0.25rem 0.5rem", borderRadius: "4px",
  cursor: disabled ? "not-allowed" : "pointer", fontWeight: "bold",
});

const distInput = {
  width: "60px", background: "#1a0f0a", color: "#c9a961",
  padding: "0.5rem", borderRadius: "4px", border: "1px solid #5a4a3a",
  textAlign: "center", fontSize: "1rem",
  fontFamily: '"Cinzel", Georgia, serif', fontWeight: "bold",
};

export default DamageDistribution;