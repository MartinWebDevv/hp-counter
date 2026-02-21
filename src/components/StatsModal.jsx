import React, { useState } from "react";

const COMMANDER_STATS = {
  "Lord Fantastic": {
    walk: '6"',
    run: '12"',
    shootRange: '8"',
    shootDamage: "1hp",
    rollToHit: "2+",
    rollToBlock: "2+",
    attacksPerHit: "4x",
    meleeDamage: "5hp",
    rollToHeal: "2+",
    special: '4"/2hp',
    shootAbility: "⛔",
    specialAbility: "💔",
  },
  "The Gray": {
    walk: '6"',
    run: '12"',
    shootRange: '12"',
    shootDamage: "1hp",
    rollToHit: "4+",
    rollToBlock: "5+",
    attacksPerHit: "2x",
    meleeDamage: "2hp",
    rollToHeal: "5+",
    special: '6"/2hp',
    shootAbility: "",
    specialAbility: "",
  },
  "Prisma K": {
    walk: '5"',
    run: '12"',
    shootRange: '8"',
    shootDamage: "1hp",
    rollToHit: "2+",
    rollToBlock: "2+",
    attacksPerHit: "4x",
    meleeDamage: "5hp",
    rollToHeal: "2+",
    special: '4"/2hp',
    shootAbility: "⛔",
    specialAbility: "💔",
  },
  "Murder Bot 9000": {
    walk: '4"',
    run: '12"',
    shootRange: '12"',
    shootDamage: "1hp",
    rollToHit: "3+",
    rollToBlock: "2+",
    attacksPerHit: "4x",
    meleeDamage: "4hp",
    rollToHeal: "3+",
    special: '4"/2hp',
    shootAbility: "⛔",
    specialAbility: "💔",
  },
  "Ganj the Squatch": {
    walk: '8"',
    run: '12"',
    shootRange: '16"',
    shootDamage: "1hp",
    rollToHit: "3+",
    rollToBlock: "4+",
    attacksPerHit: "2x",
    meleeDamage: "3hp",
    rollToHeal: "4+",
    special: '8"/2hp',
    shootAbility: "",
    specialAbility: "💔",
  },
  "Selfcentrica Space Pony Princess": {
    walk: '8"',
    run: '24"',
    shootRange: '8"',
    shootDamage: "1hp",
    rollToHit: "3+",
    rollToBlock: "3+",
    attacksPerHit: "2x",
    meleeDamage: "4hp",
    rollToHeal: "4+",
    special: '4"/2hp',
    shootAbility: "⛔",
    specialAbility: "💔",
  },
  Kronk: {
    walk: '8"',
    run: '12"',
    shootRange: '12"',
    shootDamage: "1hp",
    rollToHit: "3+",
    rollToBlock: "3+",
    attacksPerHit: "2x",
    meleeDamage: "4hp",
    rollToHeal: "4+",
    special: '4"/2hp',
    shootAbility: "⛔",
    specialAbility: "⛔",
  },
  "Queen of Fandom": {
    walk: '6"',
    run: '12"',
    shootRange: '8"',
    shootDamage: "1hp",
    rollToHit: "2+",
    rollToBlock: "3+",
    attacksPerHit: "4x",
    meleeDamage: "4hp",
    rollToHeal: "3+",
    special: '6"/2hp',
    shootAbility: "⛔",
    specialAbility: "💔",
  },
  "Kandu Krow": {
    walk: '6"',
    run: '18"',
    shootRange: '12"',
    shootDamage: "1hp",
    rollToHit: "2+",
    rollToBlock: "4+",
    attacksPerHit: "2x",
    meleeDamage: "3hp",
    rollToHeal: "4+",
    special: '6"/2hp',
    shootAbility: "",
    specialAbility: "⛔",
  },
  "The Glitch": {
    walk: '8"',
    run: '16"',
    shootRange: '16"',
    shootDamage: "1hp",
    rollToHit: "4+",
    rollToBlock: "5+",
    attacksPerHit: "2x",
    meleeDamage: "2hp",
    rollToHeal: "5+",
    special: '8"/2hp',
    shootAbility: "",
    specialAbility: "",
  },
};

const FACTION_STATS = {
  "Red Rovers": {
    walk: '6"',
    run: '12"',
    rollToHit: "4+",
    rollToBlock: "4+",
    rollToHeal: "4+",
    shootRange: '12"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '6"/2hp',
  },
  "Space Aliens": {
    walk: '6"',
    run: '12"',
    rollToHit: "3+",
    rollToBlock: "5+",
    rollToHeal: "4+",
    shootRange: '12"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '6"/2hp',
  },
  "NoLobe Zombies": {
    walk: '4"',
    run: '12"',
    rollToHit: "6+",
    rollToBlock: "3+",
    rollToHeal: "2+",
    shootRange: '8"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '4"/2hp',
  },
  "Murder Bots": {
    walk: '4"',
    run: '12"',
    rollToHit: "5+",
    rollToBlock: "3+",
    rollToHeal: "3+",
    shootRange: '8"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '4"/2hp',
  },
  Monster: {
    walk: '8"',
    run: '12"',
    rollToHit: "3+",
    rollToBlock: "5+",
    rollToHeal: "5+",
    shootRange: '16"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '8"/2hp',
  },
  "Space Pony": {
    walk: '8"',
    run: '12"',
    rollToHit: "2+",
    rollToBlock: "5+",
    rollToHeal: "6+",
    shootRange: '8"',
    shootDamage: "1hp",
    attacksPerHit: "1x",
    meleeDamage: "1hp",
    special: '8"/2hp',
  },
};

const UNCIVILIZED_STATS = {
  Caveman: {
    walk: '6"',
    run: '12"',
    rollToHit: "5+",
    rollToBlock: "3+",
    rollToHeal: "5+",
    shootRange: '8"',
    shootDamage: "1hp",
    attacksPerHit: "2x",
    meleeDamage: "1hp",
    special: '4"/2hp',
    specialAbility: "⛔",
  },
  Dinosaur: {
    walk: '8"',
    run: '16"',
    rollToHit: "5+",
    rollToBlock: "3+",
    rollToHeal: "5+",
    shootRange: '8"',
    shootDamage: "1hp",
    attacksPerHit: "2x",
    meleeDamage: "1hp",
    special: '4"/1hp',
    specialAbility: "💔",
  },
};

const StatsModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("commanders");

  const gold = "#c9a961";

  const renderRow = (name, s) => (
    <tr key={name}>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: gold,
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
          fontWeight: "bold",
          fontFamily: '"Cinzel", Georgia, serif',
        }}
      >
        {name}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        🚶{s.walk}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        🏃{s.run}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        🎯{s.shootRange}/{s.shootDamage} {s.shootAbility || ""}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        ⚔️{s.rollToHit}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        🛡️{s.rollToBlock}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        💥{s.attacksPerHit}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        🗡️{s.meleeDamage}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        💚{s.rollToHeal}
      </td>
      <td
        style={{
          padding: "0.5rem 0.75rem",
          color: "#d4af37",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a1a0a",
          whiteSpace: "nowrap",
        }}
      >
        ⚡{s.special} {s.specialAbility || ""}
      </td>
    </tr>
  );

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
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a0f0a, #0f0805)",
          border: "3px solid " + gold,
          borderRadius: "12px",
          padding: "2rem",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              color: gold,
              fontFamily: '"Cinzel", Georgia, serif',
              fontSize: "1.5rem",
              margin: 0,
            }}
          >
            📊 Stats Reference
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "linear-gradient(to bottom, #991b1b, #7f1d1d)",
              border: "2px solid #dc2626",
              color: "#fecaca",
              padding: "0.4rem 0.9rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}
        >
          <button
            onClick={() => setActiveTab("commanders")}
            style={{
              padding: "0.5rem 1.25rem",
              background:
                activeTab === "commanders"
                  ? "linear-gradient(to bottom, #92400e, #78350f)"
                  : "rgba(0,0,0,0.3)",
              border:
                "2px solid " +
                (activeTab === "commanders" ? "#a16207" : "#3a2a1a"),
              color: activeTab === "commanders" ? "#fef3c7" : "#a08050",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "0.875rem",
            }}
          >
            ⚔️ Commanders
          </button>
          <button
            onClick={() => setActiveTab("factions")}
            style={{
              padding: "0.5rem 1.25rem",
              background:
                activeTab === "factions"
                  ? "linear-gradient(to bottom, #92400e, #78350f)"
                  : "rgba(0,0,0,0.3)",
              border:
                "2px solid " +
                (activeTab === "factions" ? "#a16207" : "#3a2a1a"),
              color: activeTab === "factions" ? "#fef3c7" : "#a08050",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: "bold",
              fontSize: "0.875rem",
            }}
          >
            🛡️ Factions
          </button>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            padding: "0.75rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
            border: "1px solid #3a2a1a",
            marginBottom: "1.5rem",
          }}
        >
          {[
            ["🚶 Walk", "walk"],
            ["🏃 Run", "run"],
            ["🎯 Shoot Range/Dmg", "shoot"],
            ["⚔️ Roll to Hit", "hit"],
            ["🛡️ Roll to Block", "block"],
            ["💥 Attacks/Hit", "attacks"],
            ["🗡️ Melee Dmg", "melee"],
            ["💚 Roll to Heal", "heal"],
            ["⚡ Special", "special"],
            ["⛔ No Ability", "no"],
            ["💔 Breaks Cooldown", "breaks"],
          ].map((item) => (
            <span
              key={item[1]}
              style={{ color: "#d4af37", fontSize: "0.75rem" }}
            >
              {item[0]}
            </span>
          ))}
        </div>

        {/* Table header row */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: "6px",
            border: "1px solid #3a2a1a",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#0a0503",
            }}
          >
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.4)" }}>
                {[
                  "Name",
                  "Walk",
                  "Run",
                  "Shoot",
                  "Hit",
                  "Block",
                  "Attacks",
                  "Melee",
                  "Heal",
                  "Special",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      color: gold,
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      borderBottom: "1px solid #3a2a1a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTab === "commanders" &&
                Object.entries(COMMANDER_STATS).map(([name, s]) =>
                  renderRow(name, s),
                )}
              {activeTab === "factions" && (
                <>
                  {Object.entries(FACTION_STATS).map(([name, s]) =>
                    renderRow(name, s),
                  )}
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "0.5rem",
                        color: gold,
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontWeight: "bold",
                        background: "rgba(0,0,0,0.4)",
                        textAlign: "center",
                        fontSize: "0.8rem",
                        borderBottom: "1px solid #2a1a0a",
                      }}
                    >
                      ─── Uncivilized ───
                    </td>
                  </tr>
                  {Object.entries(UNCIVILIZED_STATS).map(([name, s]) =>
                    renderRow(name, s),
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
