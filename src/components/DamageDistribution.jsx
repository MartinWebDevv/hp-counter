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
            const attacker = players.find(p => String(p.id) === String(calculatorData.attackerId));
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
          const attacker = players.find(p => String(p.id) === String(calculatorData.attackerId));
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
  const perPlayerDamage = calculatorData.perPlayerDamage || null; // set in split NPC attack mode

  // ── Per-player pool helpers (split mode) ─────────────────────────────────
  const uniquePlayerIds = perPlayerDamage
    ? [...new Set(targets.filter(t => t.playerId).map(t => t.playerId))]
    : [];

  // For each player, how much have they distributed so far
  const playerDistributed = (pid) =>
    targets
      .filter(t => t.playerId === pid)
      .reduce((s, t) => s + (damageDistribution[`${pid}-${t.unitType}`] || 0), 0);

  const playerRemaining = (pid) => (perPlayerDamage[pid] || 0) - playerDistributed(pid);

  // All players fully allocated → Apply enabled
  const splitAllAllocated = perPlayerDamage
    ? uniquePlayerIds.every(pid => playerRemaining(pid) === 0)
    : true;

  const canApply = perPlayerDamage ? splitAllAllocated : remaining === 0;

  // Helper — get status effects for a unit
  const getUnitEffects = (player, unitType) => {
    if (!player) return [];
    if (unitType === 'commander') return player.commanderStats?.statusEffects || [];
    const idx = unitType === 'special' ? 0 : parseInt((unitType||'').replace('soldier',''));
    return player.subUnits?.[idx]?.statusEffects || [];
  };

  // Attacker info for counter strike display
  const attackerPlayer = players.find(p => String(p.id) === String(calculatorData.attackerId));
  const atkType = calculatorData.attackingUnitType || 'commander';
  const attackerUnitName = atkType === 'commander'
    ? (attackerPlayer?.commanderStats?.customName || attackerPlayer?.commander || 'Commander')
    : atkType === 'special' ? (attackerPlayer?.subUnits?.[0]?.name?.trim() || 'Special')
    : (attackerPlayer?.subUnits?.[parseInt(atkType.replace('soldier',''))]?.name?.trim() || 'Soldier ' + atkType.replace('soldier',''));

  // Single target: pre-fill full damage
  const singleInitDone = React.useRef(false);
  React.useEffect(() => {
    if (singleInitDone.current) return;
    if (targets.length !== 1 || totalDamage <= 0) return;
    singleInitDone.current = true;
    const target = targets[0];
    const key = target.isNPC ? `npc-${target.npcId}` : `${target.playerId}-${target.unitType}`;
    onUpdateDistribution(key, totalDamage);
  }, [targets.length, totalDamage]);

  // Multiple targets: auto-distribute evenly on mount
  // In split mode, distribute each player's pool evenly across their own units
  const autoInitDone = React.useRef(false);
  React.useEffect(() => {
    if (autoInitDone.current) return;
    if (targets.length <= 1 || totalDamage <= 0) return;
    autoInitDone.current = true;
    if (perPlayerDamage) {
      // Split mode — distribute each player's pool across their units
      uniquePlayerIds.forEach(pid => {
        const pool = perPlayerDamage[pid] || 0;
        const pTargets = targets.filter(t => t.playerId === pid);
        if (!pTargets.length) return;
        const perUnit = Math.floor(pool / pTargets.length);
        const rem = pool % pTargets.length;
        pTargets.forEach((t, idx) => {
          onUpdateDistribution(`${pid}-${t.unitType}`, perUnit + (idx < rem ? 1 : 0));
        });
      });
    } else {
      const perTarget = Math.floor(totalDamage / targets.length);
      const remainder = totalDamage % targets.length;
      targets.forEach((target, idx) => {
        const key = target.isNPC ? `npc-${target.npcId}` : `${target.playerId}-${target.unitType}`;
        onUpdateDistribution(key, perTarget + (idx < remainder ? 1 : 0));
      });
    }
  }, [targets.length, totalDamage]);

  const handleDistributionChange = (key, value) => {
    onUpdateDistribution(key, Math.max(0, parseInt(value) || 0));
  };

  const autoDistribute = (pidFilter = null) => {
    if (perPlayerDamage && pidFilter) {
      // Distribute a single player's pool across their units
      const pool = perPlayerDamage[pidFilter] || 0;
      const pTargets = targets.filter(t => t.playerId === pidFilter);
      if (!pTargets.length) return;
      const perUnit = Math.floor(pool / pTargets.length);
      const rem = pool % pTargets.length;
      pTargets.forEach((t, idx) => {
        onUpdateDistribution(`${pidFilter}-${t.unitType}`, perUnit + (idx < rem ? 1 : 0));
      });
    } else {
      const perTarget = Math.floor(totalDamage / targets.length);
      const remainder = totalDamage % targets.length;
      targets.forEach((target, idx) => {
        const key = target.isNPC ? `npc-${target.npcId}` : `${target.playerId}-${target.unitType}`;
        onUpdateDistribution(key, perTarget + (idx < remainder ? 1 : 0));
      });
    }
  };

  const handleApply = (distOverride) => {
    if (!canApply) return;
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

        {/* ── Split mode: per-player locked pools ── */}
        {perPlayerDamage ? (
          <>
            {uniquePlayerIds.map(pid => {
              const pool = perPlayerDamage[pid] || 0;
              const rem = playerRemaining(pid);
              const pTargets = targets.filter(t => t.playerId === pid);
              const player = players.find(p => String(p.id) === String(pid));
              const pColor = player?.playerColor || gold;
              return (
                <div key={pid} style={{ marginBottom: "1rem", border: `2px solid ${rem === 0 ? "rgba(34,197,94,0.4)" : pColor + "55"}`, borderRadius: "10px", overflow: "hidden" }}>
                  {/* Player header */}
                  <div style={{ background: pColor + "18", padding: "0.6rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${pColor}30` }}>
                    <div>
                      <span style={{ color: pColor, fontWeight: "900", fontSize: "0.9rem", fontFamily: '"Cinzel",Georgia,serif' }}>{player?.playerName || pid}</span>
                      <span style={{ color: "#6b7280", fontSize: "0.68rem", marginLeft: "0.5rem" }}>{pTargets.length} unit{pTargets.length !== 1 ? "s" : ""} targeted</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#fecaca", fontWeight: "900", fontFamily: '"Cinzel",Georgia,serif', fontSize: "1.1rem" }}>{pool}hp</span>
                      {pTargets.length > 1 && (
                        <button onClick={() => autoDistribute(pid)} style={{ padding: "0.2rem 0.55rem", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: "20px", color: "#c4b5fd", cursor: "pointer", fontFamily: '"Cinzel",Georgia,serif', fontWeight: "800", fontSize: "0.6rem" }}>
                          ⚡ Even
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Remaining indicator */}
                  <div style={{ padding: "0.3rem 0.85rem", background: rem === 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)", borderBottom: `1px solid ${rem === 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}` }}>
                    <span style={{ color: rem === 0 ? "#86efac" : "#fca5a5", fontSize: "0.65rem", fontWeight: "800" }}>
                      {rem === 0 ? "✓ Fully allocated" : `⚠️ ${Math.abs(rem)}hp ${rem > 0 ? "remaining" : "over-allocated"}`}
                    </span>
                  </div>
                  {/* Units */}
                  <div style={{ padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {pTargets.map(target => {
                      const key = `${pid}-${target.unitType}`;
                      const currentDamage = damageDistribution[key] || 0;
                      let unitName = "";
                      let unitHP = 0;
                      if (target.unitType === "commander") {
                        unitName = player?.commanderStats?.customName || player?.commander || "Commander";
                        unitHP = player?.commanderStats?.hp || 0;
                      } else {
                        const idx = target.unitType === "special" ? 0 : parseInt(target.unitType.replace("soldier", ""));
                        const unit = player?.subUnits?.[idx];
                        unitName = unit?.name?.trim() ? unit.name : (target.unitType === "special" ? "Special" : `Soldier ${idx}`);
                        unitHP = unit?.hp || 0;
                      }
                      const icon = target.unitType === "commander" ? "⚔️" : target.unitType === "special" ? "⭐" : "🛡️";
                      const hasCS = getUnitEffects(player, target.unitType).some(ef => ef.type === "counterStrike");
                      const reflectDmg = Math.ceil(currentDamage / 2);
                      return (
                        <React.Fragment key={key}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.5rem 0.6rem", background: currentDamage > 0 ? "#2a1810" : "rgba(0,0,0,0.2)", border: `1px solid ${currentDamage > 0 ? gold : "#3a2a1a"}`, borderRadius: hasCS && currentDamage > 0 ? "6px 6px 0 0" : "6px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: gold, fontSize: "0.85rem", fontWeight: "800" }}>{icon} {unitName}</div>
                              <div style={{ color: "#6b7280", fontSize: "0.68rem" }}>{unitHP}hp remaining</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <button onClick={() => handleDistributionChange(key, currentDamage - 1)} disabled={currentDamage === 0} style={distBtn(currentDamage === 0)}>−</button>
                              <input type="number" min="0" value={currentDamage} onChange={e => handleDistributionChange(key, e.target.value)} style={distInput} />
                              <button onClick={() => handleDistributionChange(key, currentDamage + 1)} style={distBtn(false)}>+</button>
                              <span style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: "bold", minWidth: "40px" }}>{currentDamage}hp</span>
                            </div>
                          </div>
                          {hasCS && currentDamage > 0 && (
                            <div style={{ padding: "0.5rem 0.75rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", borderTop: "none", borderRadius: "0 0 6px 6px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.9rem" }}>⚡</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: "#fbbf24", fontSize: "0.72rem", fontWeight: "800" }}>COUNTER STRIKE</div>
                                <div style={{ color: "#9ca3af", fontSize: "0.68rem", marginTop: "0.1rem" }}>Attacker takes {reflectDmg}hp reflected</div>
                              </div>
                              <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "1rem", fontFamily: '"Cinzel",Georgia,serif' }}>{reflectDmg}hp</span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* Standard mode: single shared pool */}
            <div style={{ background: "#0a0503", padding: "1rem", borderRadius: "6px", border: "2px solid " + gold, marginBottom: "1rem", textAlign: "center" }}>
              <div style={{ color: gold, fontSize: "0.875rem", marginBottom: "0.25rem" }}>Total Damage Available</div>
              <div style={{ color: "#fecaca", fontSize: "2rem", fontWeight: "bold", fontFamily: '"Cinzel", Georgia, serif' }}>{totalDamage}hp</div>
            </div>
            <div style={{ textAlign: "center", marginBottom: "1rem", padding: "0.5rem", background: remaining === 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", borderRadius: "6px", border: "1px solid", borderColor: remaining === 0 ? "#22c55e" : "#ef4444" }}>
              <span style={{ color: remaining === 0 ? "#86efac" : "#fca5a5", fontSize: "0.875rem", fontWeight: "bold" }}>
                {remaining === 0 ? "✓ All damage distributed!" : `⚠️ ${Math.abs(remaining)}hp ${remaining > 0 ? "remaining" : "over-allocated"}`}
              </span>
            </div>
            {targets.length > 1 && (
              <button onClick={() => autoDistribute()} style={{ width: "100%", background: "linear-gradient(to bottom, #7c3aed, #6d28d9)", border: "2px solid #a78bfa", color: "#e9d5ff", padding: "0.5rem", borderRadius: "6px", cursor: "pointer", fontFamily: '"Cinzel", Georgia, serif', fontWeight: "bold", fontSize: "0.875rem", marginBottom: "1rem" }}>
                ⚡ Auto-Distribute Evenly
              </button>
            )}
            <div style={{ background: "#0a0503", padding: "0.75rem", borderRadius: "6px", border: "1px solid #5a4a3a", marginBottom: "1rem", maxHeight: "300px", overflowY: "auto" }}>
              {targets.map((target) => {
                if (target.isNPC) {
                  const npc = npcs.find(n => n.id === target.npcId);
                  if (!npc) return null;
                  const key = `npc-${npc.id}`;
                  const currentDamage = damageDistribution[key] || 0;
                  const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
                  const hpColor = hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444";
                  return (
                    <div key={key} style={{ padding: "0.75rem", marginBottom: "0.5rem", background: currentDamage > 0 ? "#1a0805" : "transparent", border: currentDamage > 0 ? "1px solid #ef4444" : "1px solid #3a2a1a", borderRadius: "6px", borderLeft: "3px solid #ef4444" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#fca5a5", fontSize: "0.95rem", fontWeight: "bold" }}>👾 {npc.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                            <div style={{ flex: 1, height: "4px", background: "rgba(0,0,0,0.5)", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor, borderRadius: "2px" }} />
                            </div>
                            <span style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "600", flexShrink: 0 }}>{npc.hp}/{npc.maxHp}hp</span>
                            <span style={{ color: "#5eead4", fontSize: "0.72rem", fontWeight: "700" }}>🛡️{npc.armor}+</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button onClick={() => handleDistributionChange(key, currentDamage - 1)} disabled={currentDamage === 0} style={distBtn(currentDamage === 0)}>−</button>
                        <input type="number" min="0" value={currentDamage} onChange={e => handleDistributionChange(key, e.target.value)} style={distInput} />
                        <button onClick={() => handleDistributionChange(key, currentDamage + 1)} style={distBtn(false)}>+</button>
                        <span style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: "bold", minWidth: "40px" }}>{currentDamage}hp</span>
                      </div>
                    </div>
                  );
                }
                const targetPlayer = players.find(p => String(p.id) === String(target.playerId));
                if (!targetPlayer || targetPlayer.isAbsent) return null;
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
                  unitName = unit?.name?.trim() ? unit.name : (target.unitType === "special" ? "Special" : `Soldier ${idx}`);
                  unitHP = unit?.hp || 0;
                }
                const hasCounterStrike = getUnitEffects(targetPlayer, target.unitType).some(ef => ef.type === "counterStrike");
                const reflectDmg = Math.ceil(currentDamage / 2);
                return (
                  <React.Fragment key={key}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.75rem", marginBottom: hasCounterStrike && currentDamage > 0 ? "0" : "0.5rem", background: currentDamage > 0 ? "#2a1810" : "transparent", border: currentDamage > 0 ? "1px solid " + gold : "1px solid #3a2a1a", borderRadius: hasCounterStrike && currentDamage > 0 ? "6px 6px 0 0" : "6px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: gold, fontSize: "0.875rem", fontWeight: "bold" }}>{targetPlayer.playerName || "Player"}</div>
                        <div style={{ color: "#8b7355", fontSize: "0.75rem" }}>
                          {target.unitType === "commander" ? "⚔️" : target.unitType === "special" ? "⭐" : "🛡️"}{" "}{unitName} ({unitHP}hp)
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button onClick={() => handleDistributionChange(key, currentDamage - 1)} disabled={currentDamage === 0} style={distBtn(currentDamage === 0)}>−</button>
                        <input type="number" min="0" max={unitHP} value={currentDamage} onChange={e => handleDistributionChange(key, e.target.value)} style={distInput} />
                        <button onClick={() => handleDistributionChange(key, currentDamage + 1)} disabled={currentDamage >= unitHP} style={distBtn(currentDamage >= unitHP)}>+</button>
                        <span style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: "bold", minWidth: "40px" }}>{currentDamage}hp</span>
                      </div>
                    </div>
                    {hasCounterStrike && currentDamage > 0 && (
                      <div style={{ padding: "0.5rem 0.75rem", marginBottom: "0.5rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", borderTop: "none", borderRadius: "0 0 6px 6px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.9rem" }}>⚡</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#fbbf24", fontSize: "0.72rem", fontWeight: "800", letterSpacing: "0.05em" }}>COUNTER STRIKE</div>
                          <div style={{ color: "#9ca3af", fontSize: "0.68rem", marginTop: "0.1rem" }}>{attackerPlayer ? attackerPlayer.playerName + "'s " + attackerUnitName : "Attacker"} takes {reflectDmg}hp reflected</div>
                        </div>
                        <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "1rem", fontFamily: '"Cinzel",Georgia,serif' }}>{reflectDmg}hp</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => handleApply(damageDistribution)} disabled={!canApply} style={{
            flex: 1,
            background: canApply ? "linear-gradient(to bottom, #15803d, #14532d)" : "#1a0f0a",
            color: canApply ? "#86efac" : "#4a3322",
            padding: "0.75rem", borderRadius: "6px", border: "2px solid",
            borderColor: canApply ? "#16a34a" : "#4a3322",
            cursor: canApply ? "pointer" : "not-allowed",
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