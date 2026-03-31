import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors } from '../theme';





const TIER_WEIGHTS_DEFAULT = { Common: 60, Rare: 30, Legendary: 10 };

const TIER_COLORS_NPC = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: colors.textSecondary, bg: 'rgba(156,163,175,0.08)' },
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
    lootMode: initialNPC.lootMode || 'preloaded',   // 'preloaded' | 'weighted'
    lootItemCount: initialNPC.lootItemCount || 1,
    lootTierWeights: initialNPC.lootTierWeights || { Common: 60, Rare: 30, Legendary: 10 },
    isFinalBoss: initialNPC.isFinalBoss || false,
    hasRebuttal: initialNPC.hasRebuttal !== false, // default true
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

  const setLootWeight = (tier, value) => setNpc(prev => ({
    ...prev,
    lootTierWeights: { ...(prev.lootTierWeights || TIER_WEIGHTS_DEFAULT), [tier]: Math.max(0, parseInt(value) || 0) },
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
      if ((npc.attacks[i].attackType || 'attack') === 'attack' && (!npc.attacks[i].numRolls || npc.attacks[i].numRolls < 1)) return `Attack ${i + 1} needs at least 1 roll.`;
    }
    if (npc.hasPhases) {
      for (let i = 0; i < npc.phases.length; i++) {
        const p = npc.phases[i];
        if ((p.triggerType || 'hp') === 'hp') {
          if (p.triggerHP === '' || p.triggerHP === null || p.triggerHP === undefined) {
            return `Phase ${i + 2} needs a trigger HP.`;
          }
          if (parseInt(p.triggerHP) === 0 && (!p.resurrectHP || p.resurrectHP < 1)) {
            return `Phase ${i + 2} triggers at 0 HP — please set a resurrection HP.`;
          }
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
      lootMode: npc.lootMode || 'preloaded',
      lootItemCount: parseInt(npc.lootItemCount) || 1,
      lootTierWeights: npc.lootTierWeights || TIER_WEIGHTS_DEFAULT,
      maxHp: hp,
      armor: parseInt(npc.armor) || 0,
      attackBonus: parseInt(npc.attackBonus) || 0,
      attacks: npc.attacks.map(a => ({
        ...a,
        attackType: a.attackType || 'attack',
        numRolls: (a.attackType || 'attack') === 'attack' ? (parseInt(a.numRolls) || 1) : 0,
        spawnText: a.spawnText || '',
        spawnDieType: a.spawnDieType || '',
        spawnNumRolls: parseInt(a.spawnNumRolls) || 1,
        spawnPresets: (a.spawnPresets || []).map(p => ({
          ...p,
          attacks: (p.attacks || []).map(m => ({
            name: m.name || '',
            range: m.range || '',
            dieType: m.dieType || 'd20',
            numRolls: parseInt(m.numRolls) || 1,
            attackType: 'attack',
          })),
        })),
        attacks: a.attacks || [],
        description: a.description || '',
        attackEffect: a.attackEffect || null,
        buffEffect: a.buffEffect || null,
      })),
      phases: npc.hasPhases ? npc.phases.map(p => ({
        ...p,
        triggerType: p.triggerType || 'hp',
        triggerHP: (p.triggerType || 'hp') === 'manual' ? -1 : (parseInt(p.triggerHP) || 0),
        resurrectHP: p.resurrectHP ? parseInt(p.resurrectHP) : null,
        armor: p.armor !== '' && p.armor !== null ? parseInt(p.armor) : null,
        attackBonus: p.attackBonus !== '' && p.attackBonus !== null ? parseInt(p.attackBonus) : null,
        attacks: p.attacks.map(a => ({
          ...a,
          attackType: a.attackType || 'attack',
          numRolls: (a.attackType || 'attack') === 'attack' ? (parseInt(a.numRolls) || 1) : 0,
          spawnText: a.spawnText || '',
          spawnDieType: a.spawnDieType || '',
          spawnNumRolls: parseInt(a.spawnNumRolls) || 1,
          spawnPresets: (a.spawnPresets || []).map(p => ({
            ...p,
            attacks: (p.attacks || []).map(m => ({
              name: m.name || '',
              range: m.range || '',
              dieType: m.dieType || 'd20',
              numRolls: parseInt(m.numRolls) || 1,
              attackType: 'attack',
            })),
          })),
          description: a.description || '',
          attackEffect: a.attackEffect || null,
          buffEffect: a.buffEffect || null,
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
    color: colors.gold,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
  };

  const labelStyle = {
    color: colors.textMuted,
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
    color: colors.gold,
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
          background: surfaces.elevated,
          border: `3px solid ${colors.gold}`,
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
          color: colors.gold,
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
              <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>
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
              <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>
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
              <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>Does this NPC have phases?</span>
              <div
                onClick={() => set('hasPhases', !npc.hasPhases)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: npc.hasPhases ? '#7c3aed' : colors.textDisabled,
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
                  background: npc.hasPhases ? '#e9d5ff' : colors.textSecondary,
                  transition: 'left 0.2s',
                }} />
              </div>
            </label>
          </div>

          {npc.hasPhases && (
            <>
              {npc.phases.length === 0 && (
                <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
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

        {/* ── Final Boss Toggle ── */}
        <div onClick={() => set('isFinalBoss', !npc.isFinalBoss)} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0.85rem', marginBottom: '0.75rem',
          background: npc.isFinalBoss ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.25)',
          border: `2px solid ${npc.isFinalBoss ? 'rgba(220,38,38,0.6)' : 'rgba(90,74,58,0.3)'}`,
          borderRadius: '8px', cursor: 'pointer',
        }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
            border: `2px solid ${npc.isFinalBoss ? '#ef4444' : colors.textFaint}`,
            background: npc.isFinalBoss ? '#ef4444' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', color: '#fff', fontWeight: '900',
          }}>{npc.isFinalBoss && '✓'}</div>
          <div>
            <div style={{ color: npc.isFinalBoss ? '#fca5a5' : colors.textMuted, fontWeight: '800', fontSize: '0.82rem' }}>
              👑 Final Boss
            </div>
            <div style={{ color: colors.textFaint, fontSize: '0.68rem', fontWeight: '600' }}>
              Killing blow awards Final Boss Kill VP to the attacker
            </div>
          </div>
        </div>

        {/* ── Rebuttal Toggle ── */}
        <div onClick={() => set('hasRebuttal', !npc.hasRebuttal)} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0.85rem', marginBottom: '0.75rem',
          background: npc.hasRebuttal ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.25)',
          border: `2px solid ${npc.hasRebuttal ? 'rgba(124,58,237,0.5)' : 'rgba(90,74,58,0.3)'}`,
          borderRadius: '8px', cursor: 'pointer',
        }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
            border: `2px solid ${npc.hasRebuttal ? '#a78bfa' : colors.textFaint}`,
            background: npc.hasRebuttal ? '#7c3aed' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', color: '#fff', fontWeight: '900',
          }}>{npc.hasRebuttal && '✓'}</div>
          <div>
            <div style={{ color: npc.hasRebuttal ? '#c4b5fd' : colors.textMuted, fontWeight: '800', fontSize: '0.82rem' }}>
              ⚔️ Has Rebuttal Action
            </div>
            <div style={{ color: colors.textFaint, fontSize: '0.68rem', fontWeight: '600' }}>
              When checked, a rebuttal window opens after this NPC is attacked
            </div>
          </div>
        </div>

        {/* ── Loot Table ── */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,97,0.2)',
          borderRadius: '8px', padding: '1rem', marginBottom: '1rem',
        }}>
          <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            🎁 Loot Drop
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[{ value: 'preloaded', label: '📋 Set Items' }, { value: 'weighted', label: '🎲 Weighted Random' }].map(opt => (
              <div key={opt.value} onClick={() => set('lootMode', opt.value)} style={{
                flex: 1, textAlign: 'center', padding: '0.45rem',
                background: npc.lootMode === opt.value ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${npc.lootMode === opt.value ? colors.gold : 'rgba(90,74,58,0.3)'}`,
                borderRadius: '6px', cursor: 'pointer',
                color: npc.lootMode === opt.value ? colors.gold : colors.textFaint,
                fontWeight: '800', fontSize: '0.78rem',
              }}>{opt.label}</div>
            ))}
          </div>

          {lootPool.length === 0 ? (
            <p style={{ color: colors.textFaint, fontSize: '0.8rem', margin: 0 }}>
              No items in loot pool yet — add items in the 🎁 Loot tab first.
            </p>
          ) : (
            <>
              {/* Weighted mode */}
              {npc.lootMode === 'weighted' && (() => {
                const weights = npc.lootTierWeights || TIER_WEIGHTS_DEFAULT;
                const totalW = Object.values(weights).reduce((s, v) => s + v, 0);
                return (
                  <>
                    <div style={{ marginBottom: '0.65rem' }}>
                      <label style={labelStyle}>Items to Drop</label>
                      <input style={{ ...inputStyle, width: '80px', textAlign: 'center' }} type="number" min="1" max="10"
                        value={npc.lootItemCount || 1}
                        onChange={e => set('lootItemCount', Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                    <label style={labelStyle}>Tier Weights (total: {totalW}%)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {['Common', 'Rare', 'Legendary'].map(tier => {
                        const tc = TIER_COLORS_NPC[tier];
                        const pct = totalW > 0 ? Math.round(((weights[tier] || 0) / totalW) * 100) : 0;
                        return (
                          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ color: tc.text, fontWeight: '800', fontSize: '0.78rem', width: '72px' }}>{tier}</span>
                            <input type="number" min="0" max="100" value={weights[tier] || 0}
                              onChange={e => setLootWeight(tier, e.target.value)}
                              style={{ ...inputStyle, width: '64px', padding: '0.35rem 0.5rem', textAlign: 'center' }} />
                            <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: tc.text, borderRadius: '3px', transition: 'width 0.2s' }} />
                            </div>
                            <span style={{ color: colors.textFaint, fontSize: '0.68rem', fontWeight: '700', width: '30px', textAlign: 'right' }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Quest item guaranteed drops — available in both modes */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(234,179,8,0.2)' }}>
                <label style={{ ...labelStyle, color: '#fde68a' }}>🗝️ Guaranteed Quest Item Drop (optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {lootPool.filter(it => it.isQuestItem).length === 0 ? (
                    <div style={{ color: colors.textFaint, fontSize: '0.75rem' }}>No quest items in loot pool.</div>
                  ) : lootPool.filter(it => it.isQuestItem).map(poolItem => {
                    const selected = (npc.lootTable || []).some(it => it.id === poolItem.id);
                    return (
                      <div key={poolItem.id} onClick={() => toggleLootItem(poolItem)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.4rem 0.75rem',
                        background: selected ? 'rgba(234,179,8,0.1)' : 'rgba(0,0,0,0.25)',
                        border: `2px solid ${selected ? 'rgba(234,179,8,0.5)' : 'rgba(55,65,81,0.4)'}`,
                        borderRadius: '6px', cursor: 'pointer',
                      }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, border: `2px solid ${selected ? '#fde68a' : colors.textFaint}`, background: selected ? '#fde68a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{selected && '✓'}</div>
                        <span style={{ flex: 1, color: selected ? '#fde68a' : colors.textMuted, fontWeight: '800', fontSize: '0.82rem' }}>🗝️ {poolItem.name}</span>
                        <span style={{ color: '#fde68a', fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.35rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px' }}>QUEST</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preloaded mode */}
              {npc.lootMode !== 'weighted' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {lootPool.map(poolItem => {
                    const selected = (npc.lootTable || []).some(it => it.id === poolItem.id);
                    const tc = poolItem.isQuestItem ? TIER_COLORS_NPC.Quest : (TIER_COLORS_NPC[poolItem.tier] || TIER_COLORS_NPC.Common);
                    return (
                      <div key={poolItem.id} onClick={() => toggleLootItem(poolItem)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.5rem 0.75rem',
                        background: selected ? tc.bg : 'rgba(0,0,0,0.25)',
                        border: `2px solid ${selected ? tc.border : 'rgba(55,65,81,0.4)'}`,
                        borderRadius: '6px', cursor: 'pointer',
                      }}>
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                          border: `2px solid ${selected ? tc.text : colors.textFaint}`,
                          background: selected ? tc.text : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.55rem', color: '#000', fontWeight: '900',
                        }}>{selected && '✓'}</div>
                        <span style={{ flex: 1, color: selected ? tc.text : colors.textMuted, fontWeight: '800', fontSize: '0.82rem' }}>
                          {poolItem.isQuestItem ? '🗝️ ' : '📦 '}{poolItem.name}
                        </span>
                        <span style={{
                          padding: '0.1rem 0.35rem', background: `${tc.text}18`,
                          border: `1px solid ${tc.border}`, borderRadius: '4px',
                          color: tc.text, fontSize: '0.58rem', fontWeight: '800',
                        }}>{poolItem.tier}</span>
                        {poolItem.isQuestItem && (
                          <span style={{ color: '#fde68a', fontSize: '0.58rem', fontWeight: '800' }}>QUEST</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected preview (preloaded) */}
              {npc.lootMode !== 'weighted' && (npc.lootTable || []).length > 0 && (
                <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {(npc.lootTable || []).map(it => (
                    <span key={it.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.15rem 0.5rem',
                      background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)',
                      borderRadius: '4px', color: colors.gold, fontSize: '0.65rem', fontWeight: '700',
                    }}>
                      {it.name}
                      <span onClick={e => { e.stopPropagation(); removeLootItem(it.id); }} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: '900', marginLeft: '0.1rem' }}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </>
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
              fontFamily: fonts.body,
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
              fontFamily: fonts.body,
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

const ATTACK_TYPES = [
  { value: 'attack', label: '⚔️ Attack',     color: '#fca5a5' },
  { value: 'action', label: '✦ Action',      color: '#a78bfa' },
  { value: 'spawn',  label: '🐣 Spawn',      color: '#86efac' },
  { value: 'buff',   label: '✨ Buff/Debuff', color: '#fbbf24' },
];

const AttackRow = ({ attack, index, canRemove, onChange, onRemove, inputStyle, labelStyle }) => {
  const type = attack.attackType || 'attack';
  const typeConfig = ATTACK_TYPES.find(t => t.value === type) || ATTACK_TYPES[0];
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${type === 'attack' ? 'rgba(139,92,246,0.25)' : type === 'spawn' ? 'rgba(74,222,128,0.25)' : type === 'buff' ? 'rgba(251,191,36,0.25)' : 'rgba(167,139,250,0.25)'}`,
      borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {ATTACK_TYPES.map(t => (
            <button key={t.value} onClick={() => onChange('attackType', t.value)} style={{
              padding: '0.2rem 0.55rem', borderRadius: '20px', fontFamily: fonts.body,
              fontWeight: '800', fontSize: '0.62rem', cursor: 'pointer',
              background: type === t.value ? `rgba(${t.value === 'attack' ? '239,68,68' : t.value === 'action' ? '139,92,246' : t.value === 'buff' ? '251,191,36' : '74,222,128'},0.15)` : 'rgba(0,0,0,0.3)',
              border: `1px solid ${type === t.value ? t.color : 'rgba(90,74,58,0.3)'}`,
              color: type === t.value ? t.color : colors.textFaint,
            }}>{t.label}</button>
          ))}
        </div>
        {canRemove && <button onClick={onRemove} style={removeBtnStyle}>✕</button>}
      </div>

      {/* Name — always shown */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={attack.name} onChange={e => onChange('name', e.target.value)}
          placeholder={type === 'spawn' ? 'e.g. Summon Minions' : type === 'action' ? 'e.g. Enrage' : 'e.g. Stomp'} />
      </div>

      {/* Attack-only fields: die type, rolls, range */}
      {type === 'attack' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={labelStyle}>Die Type</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={attack.dieType} onChange={e => onChange('dieType', e.target.value)}>
                <option value="d4">D4</option>
                <option value="d6">D6</option>
                <option value="d10">D10</option>
                <option value="d20">D20</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}># Rolls</label>
              <input style={inputStyle} type="number" min="1" max="10" value={attack.numRolls} onChange={e => onChange('numRolls', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Range</label>
            <input style={inputStyle} value={attack.range || ''} onChange={e => onChange('range', e.target.value)} placeholder='e.g. 6" melee, 18" throw' />
          </div>
        </>
      )}

      {/* Action-only: description */}
      {type === 'action' && (
        <div>
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} value={attack.description || ''} onChange={e => onChange('description', e.target.value)}
            placeholder='e.g. Increases armor by 2 until next turn' />
        </div>
      )}

      {/* Buff/Debuff-only fields */}
      {type === 'buff' && (() => {
        const ef = attack.buffEffect || { stat: 'attack', value: 2, duration: 2, permanent: false };
        const isBuff = ef.value >= 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Stat choice */}
            <div>
              <label style={labelStyle}>Affects</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[{ value: 'attack', label: '⚔️ Attack Power' }, { value: 'defense', label: '🛡️ Defense Power' }].map(opt => (
                  <div key={opt.value} onClick={() => onChange('buffEffect', { ...ef, stat: opt.value })}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '7px', cursor: 'pointer', textAlign: 'center',
                      background: ef.stat === opt.value ? 'rgba(251,191,36,0.12)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${ef.stat === opt.value ? 'rgba(251,191,36,0.5)' : 'rgba(90,74,58,0.3)'}`,
                      color: ef.stat === opt.value ? '#fbbf24' : colors.textFaint,
                      fontWeight: '800', fontSize: '0.75rem', fontFamily: fonts.body,
                    }}>{opt.label}</div>
                ))}
              </div>
            </div>

            {/* Value — positive = buff, negative = debuff */}
            <div>
              <label style={labelStyle}>Value <span style={{ color: colors.textFaint, fontWeight: '400' }}>(positive = buff, negative = debuff)</span></label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button type='button' onClick={() => onChange('buffEffect', { ...ef, value: ef.value > 0 ? -Math.abs(ef.value) : Math.abs(ef.value) })}
                  style={{ padding: '0.4rem 0.75rem', background: isBuff ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${isBuff ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: '6px', cursor: 'pointer', color: isBuff ? '#4ade80' : '#f87171', fontWeight: '800', fontSize: '0.75rem', fontFamily: fonts.body, whiteSpace: 'nowrap' }}>
                  {isBuff ? '↑ Buff' : '↓ Debuff'}
                </button>
                <input style={{ ...inputStyle, flex: 1, textAlign: 'center' }} type='number'
                  value={ef.value}
                  onChange={e => onChange('buffEffect', { ...ef, value: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Duration */}
            {!ef.permanent && (
              <div>
                <label style={labelStyle}>Duration (rounds) <span style={{ color: colors.textFaint, fontWeight: '400' }}>— leave blank to make permanent</span></label>
                <input style={inputStyle} type='number' min='1'
                  value={ef.duration ?? 2}
                  onChange={e => onChange('buffEffect', { ...ef, duration: parseInt(e.target.value) || 2 })} />
              </div>
            )}

            {/* Permanent toggle */}
            <div onClick={() => onChange('buffEffect', { ...ef, permanent: !ef.permanent, duration: ef.permanent ? 2 : null })}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                background: ef.permanent ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${ef.permanent ? 'rgba(251,191,36,0.35)' : 'rgba(90,74,58,0.3)'}`,
              }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                border: `2px solid ${ef.permanent ? '#fbbf24' : colors.textFaint}`,
                background: ef.permanent ? '#fbbf24' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.55rem', color: '#000', fontWeight: '900',
              }}>{ef.permanent && '✓'}</div>
              <span style={{ color: ef.permanent ? '#fbbf24' : colors.textMuted, fontSize: '0.72rem', fontWeight: '700' }}>
                Permanent — lasts until DM removes it manually
              </span>
            </div>
          </div>
        );
      })()}

      {/* Spawn-only: preset NPC builder */}
      {type === 'spawn' && (
        <>
          {/* Optional dice roll */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Dice Roll (optional — determines quantity)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select style={{ ...inputStyle, width: 'auto', flex: 1 }}
                value={attack.spawnDieType || ''}
                onChange={e => onChange('spawnDieType', e.target.value)}>
                <option value=''>No roll — fixed count</option>
                <option value='d4'>D4</option>
                <option value='d6'>D6</option>
                <option value='d10'>D10</option>
                <option value='d20'>D20</option>
              </select>
              {attack.spawnDieType && (
                <>
                  <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>×</span>
                  <input style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
                    type='number' min='1' max='10'
                    value={attack.spawnNumRolls || 1}
                    onChange={e => onChange('spawnNumRolls', Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </>
              )}
            </div>
          </div>

          {/* Preset NPC templates */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={labelStyle}>Spawn Presets</label>
              <button type='button' onClick={() => onChange('spawnPresets', [...(attack.spawnPresets || []), { name: '', hp: 10, maxHp: 10, armor: 0, attackBonus: 0, attacks: [] }])}
                style={{ padding: '0.2rem 0.55rem', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: '5px', cursor: 'pointer', color: '#86efac', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>
                + Add NPC Type
              </button>
            </div>
            {(attack.spawnPresets || []).length === 0 && (
              <div style={{ color: colors.textFaint, fontSize: '0.72rem', fontStyle: 'italic', padding: '0.4rem' }}>Add NPC types that will be spawned when this attack is used.</div>
            )}
            {(attack.spawnPresets || []).map((preset, pi) => {
              const updatePreset = (updates) => {
                const p = [...(attack.spawnPresets||[])];
                p[pi] = { ...p[pi], ...updates };
                onChange('spawnPresets', p);
              };
              const presetMoves = preset.attacks || [];
              const addPresetMove = () => {
                updatePreset({ attacks: [...presetMoves, { name: '', range: '', dieType: 'd20', numRolls: 1 }] });
              };
              const updatePresetMove = (mi, field, val) => {
                const moves = [...presetMoves];
                moves[mi] = { ...moves[mi], [field]: val };
                updatePreset({ attacks: moves });
              };
              const removePresetMove = (mi) => {
                updatePreset({ attacks: presetMoves.filter((_, i) => i !== mi) });
              };
              return (
                <div key={pi} style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', padding: '0.6rem', marginBottom: '0.4rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#86efac', fontSize: '0.72rem', fontWeight: '800' }}>NPC Type {pi + 1}</span>
                    <button type='button' onClick={() => onChange('spawnPresets', (attack.spawnPresets || []).filter((_, i) => i !== pi))}
                      style={{ padding: '0.1rem 0.4rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', cursor: 'pointer', color: '#fca5a5', fontSize: '0.6rem', fontFamily: fonts.body }}>✕</button>
                  </div>

                  {/* Name */}
                  <div style={{ marginBottom: '0.4rem' }}>
                    <label style={labelStyle}>NPC Name</label>
                    <input style={inputStyle} value={preset.name}
                      onChange={e => updatePreset({ name: e.target.value })}
                      placeholder='e.g. Cave Troll' />
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label style={labelStyle}>HP</label>
                      <input style={inputStyle} type='number' min='1' value={preset.hp}
                        onChange={e => updatePreset({ hp: parseInt(e.target.value)||1, maxHp: parseInt(e.target.value)||1 })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Armor</label>
                      <input style={inputStyle} type='number' min='0' value={preset.armor || 0}
                        onChange={e => updatePreset({ armor: parseInt(e.target.value)||0 })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Atk Bonus</label>
                      <input style={inputStyle} type='number' min='0' value={preset.attackBonus || 0}
                        onChange={e => updatePreset({ attackBonus: parseInt(e.target.value)||0 })} />
                    </div>
                  </div>

                  {/* Move set */}
                  <div style={{ borderTop: '1px solid rgba(74,222,128,0.15)', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ ...labelStyle, margin: 0 }}>Move Set</label>
                      <button type='button' onClick={addPresetMove}
                        style={{ padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '5px', cursor: 'pointer', color: '#86efac', fontSize: '0.62rem', fontWeight: '800', fontFamily: fonts.body }}>
                        + Add Move
                      </button>
                    </div>

                    {presetMoves.length === 0 && (
                      <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontStyle: 'italic', padding: '0.25rem 0' }}>
                        No moves — will inherit parent spawn move set.
                      </div>
                    )}

                    {presetMoves.map((move, mi) => (
                      <div key={mi} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '5px', padding: '0.45rem', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <input style={{ ...inputStyle, flex: 2, fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                            value={move.name} placeholder='Move name'
                            onChange={e => updatePresetMove(mi, 'name', e.target.value)} />
                          <input style={{ ...inputStyle, flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                            value={move.range || ''} placeholder='Range'
                            onChange={e => updatePresetMove(mi, 'range', e.target.value)} />
                          <button type='button' onClick={() => removePresetMove(mi)}
                            style={{ padding: '0.25rem 0.45rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', cursor: 'pointer', color: '#fca5a5', fontSize: '0.6rem', fontFamily: fonts.body, flexShrink: 0 }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                          <div>
                            <label style={labelStyle}>Die Type</label>
                            <select style={{ ...inputStyle, cursor: 'pointer', fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                              value={move.dieType || 'd20'}
                              onChange={e => updatePresetMove(mi, 'dieType', e.target.value)}>
                              <option value='d4'>D4</option>
                              <option value='d6'>D6</option>
                              <option value='d10'>D10</option>
                              <option value='d20'>D20</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}># Rolls</label>
                            <input style={{ ...inputStyle, fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                              type='number' min='1' max='10'
                              value={move.numRolls || 1}
                              onChange={e => updatePresetMove(mi, 'numRolls', parseInt(e.target.value)||1)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <label style={labelStyle}>Description (optional)</label>
            <input style={inputStyle} value={attack.description || ''} onChange={e => onChange('description', e.target.value)}
              placeholder='e.g. Appears at the cave entrance' />
          </div>
          <div style={{ padding: '0.4rem 0.6rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', color: '#86efac', fontSize: '0.68rem', fontWeight: '600' }}>
            💡 Each NPC type can have its own moves. If none are added, the spawned NPC inherits this spawn attack's move set.
          </div>
        </>
      )}

      {/* Attack effect — available on attack type */}
      {type === 'attack' && (
        <div style={{ marginTop: '0.5rem' }}>
          <label style={labelStyle}>Apply Effect (optional)</label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            {[
              { value: null,            label: 'None',            defaults: null },
              { value: 'poison',        label: '🤢 Poison',       defaults: { value: 2, duration: 2, permanent: false } },
              { value: 'stun',          label: '💫 Stun',         defaults: { value: 0, duration: 1, permanent: false } },
              { value: 'attackDebuff',  label: '⚔️↓ Atk Debuff',  defaults: { value: 2, duration: 2, permanent: false } },
              { value: 'defenseDebuff', label: '🛡️↓ Def Debuff',  defaults: { value: 2, duration: 2, permanent: false } },
            ].map(opt => {
              const isActive = opt.value === null ? !attack.attackEffect : attack.attackEffect?.type === opt.value;
              return (
                <div key={String(opt.value)} onClick={() => onChange('attackEffect', opt.defaults ? { type: opt.value, ...opt.defaults } : null)}
                  style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.68rem', fontFamily: fonts.body,
                    background: isActive ? 'rgba(167,139,250,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${isActive ? '#a78bfa' : 'rgba(90,74,58,0.3)'}`,
                    color: isActive ? '#a78bfa' : colors.textFaint,
                  }}>{opt.label}</div>
              );
            })}
          </div>

          {/* Effect config — shared value + duration + permanent toggle */}
          {attack.attackEffect && (() => {
            const ef = attack.attackEffect;
            const isPoison = ef.type === 'poison';
            const isStun   = ef.type === 'stun';
            const isBuff   = ['attackDebuff','defenseDebuff'].includes(ef.type);
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: isStun ? '1fr' : '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  {!isStun && (
                    <div>
                      <label style={labelStyle}>{isPoison ? 'Damage per Round' : 'Modifier Value'}</label>
                      <input style={inputStyle} type='number' min='1' value={ef.value || 2}
                        onChange={e => onChange('attackEffect', { ...ef, value: parseInt(e.target.value)||1 })} />
                    </div>
                  )}
                  {!ef.permanent && (
                    <div>
                      <label style={labelStyle}>Duration (rounds)</label>
                      <input style={inputStyle} type='number' min='1' value={ef.duration || 2}
                        onChange={e => onChange('attackEffect', { ...ef, duration: parseInt(e.target.value)||1 })} />
                    </div>
                  )}
                </div>
                {isBuff && (
                  <div onClick={() => onChange('attackEffect', { ...ef, permanent: !ef.permanent, duration: ef.permanent ? 2 : null })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', background: ef.permanent ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.25)', border: `1px solid ${ef.permanent ? 'rgba(245,158,11,0.4)' : 'rgba(90,74,58,0.3)'}` }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${ef.permanent ? '#fbbf24' : colors.textFaint}`, background: ef.permanent ? '#fbbf24' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{ef.permanent && '✓'}</div>
                    <span style={{ color: ef.permanent ? colors.amber : colors.textMuted, fontSize: '0.72rem', fontWeight: '700' }}>Permanent (lasts until manually removed)</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

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

      {/* Trigger type toggle */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Trigger Type</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[{ value: 'hp', label: '❤️ HP Threshold' }, { value: 'manual', label: '🎯 Manual' }].map(opt => (
            <div key={opt.value} onClick={() => onFieldChange('triggerType', opt.value)} style={{
              flex: 1, textAlign: 'center', padding: '0.45rem',
              background: (phase.triggerType || 'hp') === opt.value ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.3)',
              border: `2px solid ${(phase.triggerType || 'hp') === opt.value ? '#a78bfa' : 'rgba(90,74,58,0.3)'}`,
              borderRadius: '6px', cursor: 'pointer',
              color: (phase.triggerType || 'hp') === opt.value ? '#a78bfa' : colors.textFaint,
              fontWeight: '800', fontSize: '0.78rem',
            }}>{opt.label}</div>
          ))}
        </div>
        {(phase.triggerType || 'hp') === 'manual' && (
          <div style={{ color: colors.textMuted, fontSize: '0.7rem', marginTop: '0.3rem' }}>
            DM activates this phase manually from the NPC card.
          </div>
        )}
      </div>

      {/* Trigger HP — only shown for HP trigger type */}
      {(phase.triggerType || 'hp') === 'hp' && (
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
          <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>
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
            <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>NPC comes back with this HP</span>
          </div>
        )}
      </div>
      )}

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
  fontFamily: fonts.body,
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
  fontFamily: fonts.body,
  fontSize: '0.75rem',
  fontWeight: '700',
};

export default NPCCreator;