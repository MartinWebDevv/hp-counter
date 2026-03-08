import React, { useState } from 'react';

const gold = '#c9a961';
const dark = '#1a0f0a';
const darker = '#0f0805';

const TIER_COLORS_NPC = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
  Quest:     { border: 'rgba(234,179,8,0.6)',   text: '#fde68a', bg: 'rgba(234,179,8,0.1)'    },
};


/**
 * NPCCreator
 * Full NPC stat block builder — name, HP, armor, move, attacks, phases.
 * Used by the DM to create/edit NPCs on the fly in Campaign mode.
 */
const NPCCreator = ({ initialNPC, onSave, onClose, blankAttack, blankPhase, lootPool = [] }) => {
  const [npc, setNpc] = useState(() => ({
    ...initialNPC,
    attacks: initialNPC.attacks?.length ? initialNPC.attacks : [blankAttack()],
    phases: initialNPC.phases || [],
    hasPhases: initialNPC.hasPhases || false,
    lootTable: initialNPC.lootTable || [],
  }));

  // ── Field helpers ────────────────────────────────────────────────────────

  const set = (field, value) => setNpc(prev => ({ ...prev, [field]: value }));

  const setAttack = (index, field, value) => {
    setNpc(prev => {
      const attacks = prev.attacks.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      );
      return { ...prev, attacks };
    });
  };

  const addAttack = () => setNpc(prev => ({
    ...prev,
    attacks: [...prev.attacks, blankAttack()]
  }));

  const removeAttack = (index) => setNpc(prev => ({
    ...prev,
    attacks: prev.attacks.filter((_, i) => i !== index)
  }));

  // ── Phase helpers ────────────────────────────────────────────────────────

  const addPhase = () => {
    setNpc(prev => {
      const phaseNumber = prev.phases.length + 2;
      // Inherit from the previous phase if one exists, otherwise from base NPC stats.
      // The DM only needs to type what actually changes.
      const source = prev.phases.length > 0
        ? prev.phases[prev.phases.length - 1]
        : prev;

      const inherited = {
        ...blankPhase(phaseNumber),
        armor:       source.armor       ?? prev.armor,
        attackBonus: source.attackBonus ?? prev.attackBonus,
        walk:        source.walk        || prev.walk,
        run:         source.run         || prev.run,
        // Deep-copy attacks so edits don't mutate the source phase
        attacks: (source.attacks || prev.attacks).map(a => ({ ...a, id: `${a.id}_p${phaseNumber}` })),
      };

      return { ...prev, phases: [...prev.phases, inherited] };
    });
  };

  const removePhase = (phaseIndex) => {
    setNpc(prev => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== phaseIndex)
    }));
  };

  // ── Loot helpers ────────────────────────────────────────────────────────

  const toggleLootItem = (poolItem) => setNpc(prev => {
    const already = (prev.lootTable || []).some(it => it.id === poolItem.id);
    return {
      ...prev,
      lootTable: already
        ? prev.lootTable.filter(it => it.id !== poolItem.id)
        : [...(prev.lootTable || []), poolItem],
    };
  });

  const removeLootItem = (id) => setNpc(prev => ({
    ...prev,
    lootTable: (prev.lootTable || []).filter(it => it.id !== id),
  }));

  const setPhaseField = (phaseIndex, field, value) => {
    setNpc(prev => {
      const phases = prev.phases.map((p, i) =>
        i === phaseIndex ? { ...p, [field]: value } : p
      );
      return { ...prev, phases };
    });
  };

  const setPhaseAttack = (phaseIndex, attackIndex, field, value) => {
    setNpc(prev => {
      const phases = prev.phases.map((p, pi) => {
        if (pi !== phaseIndex) return p;
        const attacks = p.attacks.map((a, ai) =>
          ai === attackIndex ? { ...a, [field]: value } : a
        );
        return { ...p, attacks };
      });
      return { ...prev, phases };
    });
  };

  const addPhaseAttack = (phaseIndex) => {
    setNpc(prev => {
      const phases = prev.phases.map((p, pi) =>
        pi === phaseIndex
          ? { ...p, attacks: [...p.attacks, blankAttack()] }
          : p
      );
      return { ...prev, phases };
    });
  };

  const removePhaseAttack = (phaseIndex, attackIndex) => {
    setNpc(prev => {
      const phases = prev.phases.map((p, pi) => {
        if (pi !== phaseIndex) return p;
        return { ...p, attacks: p.attacks.filter((_, ai) => ai !== attackIndex) };
      });
      return { ...prev, phases };
    });
  };

  // ── Validation & Save ────────────────────────────────────────────────────

  const validate = () => {
    if (!npc.name.trim()) return 'NPC must have a name.';
    if (!npc.hp || npc.hp < 1) return 'HP must be at least 1.';
    if (npc.armor < 0) return 'Armor cannot be negative.';
    for (let i = 0; i < npc.attacks.length; i++) {
      if (!npc.attacks[i].name.trim()) return `Attack ${i + 1} needs a name.`;
      if (!npc.attacks[i].numRolls || npc.attacks[i].numRolls < 1) return `Attack ${i + 1} needs at least 1 roll.`;
    }
    if (npc.hasPhases) {
      for (let i = 0; i < npc.phases.length; i++) {
        const p = npc.phases[i];
        if (p.triggerHP === '' || p.triggerHP === null || p.triggerHP === undefined) {
          return `Phase ${i + 2} needs a trigger HP.`;
        }
        if (parseInt(p.triggerHP) === 0 && (!p.resurrectHP || p.resurrectHP < 1)) {
          return `Phase ${i + 2} triggers at 0 HP — please set a resurrection HP.`;
        }
        for (let j = 0; j < p.attacks.length; j++) {
          if (!p.attacks[j].name.trim()) return `Phase ${i + 2}, Attack ${j + 1} needs a name.`;
        }
      }
    }
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) { alert(error); return; }
    const hp = parseInt(npc.hp);
    onSave({
      ...npc,
      hp,
      maxHp: hp,
      armor: parseInt(npc.armor) || 0,
      attackBonus: parseInt(npc.attackBonus) || 0,
      attacks: npc.attacks.map(a => ({
        ...a,
        numRolls: parseInt(a.numRolls) || 1,
      })),
      phases: npc.hasPhases ? npc.phases.map(p => ({
        ...p,
        triggerHP: parseInt(p.triggerHP) || 0,
        resurrectHP: p.resurrectHP ? parseInt(p.resurrectHP) : null,
        armor: p.armor !== '' && p.armor !== null ? parseInt(p.armor) : null,
        attackBonus: p.attackBonus !== '' && p.attackBonus !== null ? parseInt(p.attackBonus) : null,
        attacks: p.attacks.map(a => ({
          ...a,
          numRolls: parseInt(a.numRolls) || 1,
        })),
      })) : [],
    });
  };

  // ── Shared input style ───────────────────────────────────────────────────

  const inputStyle = {
    background: '#120a06',
    border: '1px solid #5a4a3a',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    color: gold,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    width: '100%',
  };

  const labelStyle = {
    color: '#8b7355',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '0.3rem',
  };

  const sectionStyle = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(201, 169, 97, 0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1rem',
  };

  const sectionTitleStyle = {
    color: gold,
    fontSize: '0.85rem',
    fontWeight: '800',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '0.75rem',
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: `linear-gradient(145deg, ${dark}, ${darker})`,
          border: `3px solid ${gold}`,
          borderRadius: '14px',
          padding: '1.5rem',
          width: '95%',
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.95)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <h2 style={{
          color: gold,
          fontSize: '1.4rem',
          fontFamily: '"Cinzel", Georgia, serif',
          textAlign: 'center',
          marginBottom: '1.5rem',
          letterSpacing: '0.1em',
        }}>
          {initialNPC.name ? `✏️ Edit: ${initialNPC.name}` : '👾 Create NPC'}
        </h2>

        {/* ── Base Stats ── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>⚔️ Base Stats</div>

          {/* Name */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>NPC Name</label>
            <input
              style={inputStyle}
              value={npc.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. The Sleeping Giant"
            />
          </div>

          {/* HP + Armor + Attack Bonus */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>HP</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={npc.hp}
                onChange={e => set('hp', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Armor Floor</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="20"
                value={npc.armor}
                onChange={e => set('armor', e.target.value)}
                placeholder="0 = none"
              />
              <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                Min defense roll
              </span>
            </div>
            <div>
              <label style={labelStyle}>Attack Bonus</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="20"
                value={npc.attackBonus ?? 0}
                onChange={e => set('attackBonus', e.target.value)}
                placeholder="0 = none"
              />
              <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                Added to every attack roll
              </span>
            </div>
          </div>

          {/* Move */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Walk</label>
              <input
                style={inputStyle}
                value={npc.walk}
                onChange={e => set('walk', e.target.value)}
                placeholder='e.g. 6"'
              />
            </div>
            <div>
              <label style={labelStyle}>Run</label>
              <input
                style={inputStyle}
                value={npc.run}
                onChange={e => set('run', e.target.value)}
                placeholder='e.g. 12"'
              />
            </div>
          </div>
        </div>

        {/* ── Attacks ── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🗡️ Attacks</div>
          {npc.attacks.map((attack, i) => (
            <AttackRow
              key={attack.id}
              attack={attack}
              index={i}
              canRemove={npc.attacks.length > 1}
              onChange={(field, value) => setAttack(i, field, value)}
              onRemove={() => removeAttack(i)}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          ))}
          <button
            onClick={addAttack}
            style={addBtnStyle}
          >
            + Add Attack
          </button>
        </div>

        {/* ── Phases Toggle ── */}
        <div style={{ ...sectionStyle, borderColor: npc.hasPhases ? 'rgba(139,92,246,0.5)' : 'rgba(201,169,97,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: npc.hasPhases ? '1rem' : 0 }}>
            <div style={sectionTitleStyle}>🔄 Phases</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <span style={{ color: '#8b7355', fontSize: '0.8rem' }}>Does this NPC have phases?</span>
              <div
                onClick={() => set('hasPhases', !npc.hasPhases)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: npc.hasPhases ? '#7c3aed' : '#374151',
                  border: npc.hasPhases ? '2px solid #a78bfa' : '2px solid #4b5563',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: npc.hasPhases ? '20px' : '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: npc.hasPhases ? '#e9d5ff' : '#9ca3af',
                  transition: 'left 0.2s',
                }} />
              </div>
            </label>
          </div>

          {npc.hasPhases && (
            <>
              {npc.phases.length === 0 && (
                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  No phases yet. Add a phase below — Phase 1 is always the base stats above.
                </p>
              )}

              {npc.phases.map((phase, pi) => (
                <PhaseSection
                  key={phase.id}
                  phase={phase}
                  phaseIndex={pi}
                  onFieldChange={(field, value) => setPhaseField(pi, field, value)}
                  onAddAttack={() => addPhaseAttack(pi)}
                  onRemoveAttack={(ai) => removePhaseAttack(pi, ai)}
                  onAttackChange={(ai, field, value) => setPhaseAttack(pi, ai, field, value)}
                  onRemovePhase={() => removePhase(pi)}
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />
              ))}

              <button onClick={addPhase} style={addBtnStyle}>
                + Add Phase {npc.phases.length + 2}
              </button>
            </>
          )}
        </div>

        {/* ── Loot Table ── */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,97,0.2)',
          borderRadius: '8px', padding: '1rem', marginBottom: '1rem',
        }}>
          <div style={{ color: gold, fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            🎁 Loot Table
            <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', marginLeft: '0.4rem' }}>
              ({(npc.lootTable || []).length} selected)
            </span>
          </div>

          {lootPool.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '0.8rem', margin: 0 }}>
              No items in loot pool yet — add items in the 🎁 Loot tab first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '220px', overflowY: 'auto' }}>
              {lootPool.map(poolItem => {
                const selected = (npc.lootTable || []).some(it => it.id === poolItem.id);
                const c = poolItem.isQuestItem ? TIER_COLORS_NPC.Quest : (TIER_COLORS_NPC[poolItem.tier] || TIER_COLORS_NPC.Common);
                return (
                  <div key={poolItem.id} onClick={() => toggleLootItem(poolItem)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: selected ? c.bg : 'rgba(0,0,0,0.25)',
                    border: `2px solid ${selected ? c.border : 'rgba(55,65,81,0.4)'}`,
                    borderRadius: '6px', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                      border: `2px solid ${selected ? c.text : '#4b5563'}`,
                      background: selected ? c.text : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', color: '#000', fontWeight: '900',
                    }}>{selected && '✓'}</div>
                    <span style={{ flex: 1, color: selected ? c.text : '#6b7280', fontWeight: '800', fontSize: '0.82rem' }}>
                      {poolItem.isQuestItem ? '🗝️ ' : '📦 '}{poolItem.name}
                    </span>
                    <span style={{
                      padding: '0.1rem 0.35rem', background: `${c.text}18`,
                      border: `1px solid ${c.border}`, borderRadius: '4px',
                      color: c.text, fontSize: '0.58rem', fontWeight: '800',
                    }}>{poolItem.tier}</span>
                    {poolItem.isQuestItem && (
                      <span style={{ color: '#fde68a', fontSize: '0.58rem', fontWeight: '800' }}>QUEST</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected preview */}
          {(npc.lootTable || []).length > 0 && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {(npc.lootTable || []).map(it => (
                <span key={it.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.15rem 0.5rem',
                  background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)',
                  borderRadius: '4px', color: gold, fontSize: '0.65rem', fontWeight: '700',
                }}>
                  {it.name}
                  <span onClick={e => { e.stopPropagation(); removeLootItem(it.id); }} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: '900', marginLeft: '0.1rem' }}>✕</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #059669, #047857)',
              border: '2px solid #10b981',
              color: '#d1fae5',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '800',
              fontSize: '1rem',
              letterSpacing: '0.05em',
            }}
          >
            ✓ Save NPC
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
              border: '2px solid #dc2626',
              color: '#fecaca',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '800',
              fontSize: '1rem',
            }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AttackRow sub-component ──────────────────────────────────────────────────

const AttackRow = ({ attack, index, canRemove, onChange, onRemove, inputStyle, labelStyle }) => (
  <div style={{
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '0.5rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
      <span style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: '700' }}>Attack {index + 1}</span>
      {canRemove && (
        <button onClick={onRemove} style={removeBtnStyle}>✕</button>
      )}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <div>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={attack.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="e.g. Stomp"
        />
      </div>
      <div>
        <label style={labelStyle}>Die Type</label>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={attack.dieType}
          onChange={e => onChange('dieType', e.target.value)}
        >
          <option value="d20">D20</option>
          <option value="d10">D10</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}># Rolls</label>
        <input
          style={inputStyle}
          type="number"
          min="1"
          max="10"
          value={attack.numRolls}
          onChange={e => onChange('numRolls', e.target.value)}
        />
      </div>
    </div>
    <div>
      <label style={labelStyle}>Range</label>
      <input
        style={inputStyle}
        value={attack.range || ''}
        onChange={e => onChange('range', e.target.value)}
        placeholder='e.g. 6" melee, 18" throw'
      />
    </div>
  </div>
);

// ── PhaseSection sub-component ───────────────────────────────────────────────

const PhaseSection = ({
  phase, phaseIndex,
  onFieldChange, onAddAttack, onRemoveAttack, onAttackChange, onRemovePhase,
  inputStyle, labelStyle,
}) => {
  const isResurrection = parseInt(phase.triggerHP) === 0;

  return (
    <div style={{
      background: 'rgba(124,58,237,0.08)',
      border: '2px solid rgba(139,92,246,0.35)',
      borderRadius: '10px',
      padding: '1rem',
      marginBottom: '0.75rem',
    }}>
      {/* Phase header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
          PHASE {phaseIndex + 2}
        </div>
        <button onClick={onRemovePhase} style={removeBtnStyle}>✕ Remove Phase</button>
      </div>

      {/* Phase label */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Phase Label (shown in DM panel)</label>
        <input
          style={inputStyle}
          value={phase.label}
          onChange={e => onFieldChange('label', e.target.value)}
          placeholder={`Phase ${phaseIndex + 2}`}
        />
      </div>

      {/* Trigger HP */}
      <div style={{ display: 'grid', gridTemplateColumns: isResurrection ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Trigger at HP</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            value={phase.triggerHP}
            onChange={e => onFieldChange('triggerHP', e.target.value)}
            placeholder="e.g. 15 or 0 for resurrection"
          />
          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
            {isResurrection ? '⚡ 0 HP = Resurrection phase' : 'Phase triggers when NPC reaches this HP'}
          </span>
        </div>
        {isResurrection && (
          <div>
            <label style={labelStyle}>Resurrect with HP</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={phase.resurrectHP || ''}
              onChange={e => onFieldChange('resurrectHP', e.target.value)}
              placeholder="e.g. 20"
            />
            <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>NPC comes back with this HP</span>
          </div>
        )}
      </div>

      {/* Optional overrides */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>New Name (optional — leave blank to keep current)</label>
        <input
          style={inputStyle}
          value={phase.name}
          onChange={e => onFieldChange('name', e.target.value)}
          placeholder="e.g. The Giant — Enraged"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Armor Floor</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            value={phase.armor ?? ''}
            onChange={e => onFieldChange('armor', e.target.value)}
            placeholder="Inherits"
          />
        </div>
        <div>
          <label style={labelStyle}>Atk Bonus</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            value={phase.attackBonus ?? ''}
            onChange={e => onFieldChange('attackBonus', e.target.value)}
            placeholder="Inherits"
          />
        </div>
        <div>
          <label style={labelStyle}>Walk</label>
          <input
            style={inputStyle}
            value={phase.walk}
            onChange={e => onFieldChange('walk', e.target.value)}
            placeholder='Inherits'
          />
        </div>
        <div>
          <label style={labelStyle}>Run</label>
          <input
            style={inputStyle}
            value={phase.run}
            onChange={e => onFieldChange('run', e.target.value)}
            placeholder='Inherits'
          />
        </div>
      </div>

      {/* Phase attacks */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Attacks in this phase</label>
        {phase.attacks.map((attack, ai) => (
          <AttackRow
            key={attack.id}
            attack={attack}
            index={ai}
            canRemove={phase.attacks.length > 1}
            onChange={(field, value) => onAttackChange(ai, field, value)}
            onRemove={() => onRemoveAttack(ai)}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
          />
        ))}
        <button onClick={onAddAttack} style={{ ...addBtnStyle, marginTop: '0.25rem' }}>
          + Add Attack
        </button>
      </div>
    </div>
  );
};

// ── Shared button styles ─────────────────────────────────────────────────────

const addBtnStyle = {
  width: '100%',
  padding: '0.6rem',
  background: 'rgba(59,130,246,0.15)',
  border: '1px dashed #3b82f6',
  color: '#93c5fd',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: '700',
  fontSize: '0.85rem',
  marginTop: '0.25rem',
};

const removeBtnStyle = {
  padding: '0.2rem 0.5rem',
  background: 'rgba(185,28,28,0.2)',
  border: '1px solid #991b1b',
  color: '#fca5a5',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.75rem',
  fontWeight: '700',
};

export default NPCCreator;