import { useState, useEffect } from 'react';

const NPC_STORAGE_KEY = 'hpCounterNPCs';

/**
 * useNPCState
 * Manages all NPC state for Campaign mode.
 * NPCs are created on the fly by the DM, can be activated into turn rotation,
 * have armor floors, custom attacks, and optional phases.
 */
export const useNPCState = (addLog, onNPCKilled) => {
  const [npcs, setNpcs] = useState(() => {
    try {
      const saved = localStorage.getItem(NPC_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showNPCCreator, setShowNPCCreator] = useState(false);
  const [editingNPCId, setEditingNPCId] = useState(null);

  // Persist NPCs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(NPC_STORAGE_KEY, JSON.stringify(npcs));
    } catch (e) {
      console.error('Error saving NPCs:', e);
    }
  }, [npcs]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const generateId = () => `npc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  /**
   * Build a blank attack object
   */
  const blankAttack = () => ({
    id: generateId(),
    name: '',
    attackType: 'attack',  // 'attack' | 'action' | 'spawn'
    dieType: 'd20',
    numRolls: 1,
    range: '',
    spawnText: '',         // used when attackType === 'spawn'
    spawnDieType: '',      // optional dice for spawn (e.g. 'd6')
    spawnNumRolls: 1,      // how many of that die to roll
    spawnPresets: [],      // [{ name, hp, maxHp, armor, attackBonus }] preset NPCs to spawn
    description: '',       // used for action/spawn type
    attackEffect: null,    // { type: 'poison'|'stun', value?, duration? }
  });

  /**
   * Build a blank phase object (inherits base stats shape)
   */
  const blankPhase = (phaseNumber) => ({
    id: generateId(),
    phaseNumber,
    label: `Phase ${phaseNumber}`,
    triggerHP: 0,           // HP at which this phase triggers
    triggerType: 'hp',      // 'hp' | 'manual'
    resurrectHP: null,      // if triggerHP === 0, NPC comes back at this HP
    name: '',               // optional new name
    armor: null,            // if null, inherits from previous phase
    attackBonus: null,      // if null, inherits from previous phase
    walk: '',
    run: '',
    attacks: [blankAttack()],
  });

  /**
   * Build a fresh NPC shell for the creator form
   */
  const blankNPC = () => ({
    id: generateId(),
    name: '',
    hp: 20,
    maxHp: 20,
    armor: 0,             // minimum defense floor
    attackBonus: 0,       // flat bonus added to every attack roll
    walk: '6"',
    run: '12"',
    attacks: [blankAttack()],
    hasPhases: false,
    phases: [],           // array of phase objects
    currentPhase: 0,      // index into phases array (0 = base)
    active: false,        // whether this NPC is in the turn rotation
    isDead: false,
    isFinalBoss: false,   // marks this NPC for Final Boss Kill VP award
  });

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreator = (npcId = null) => {
    setEditingNPCId(npcId);
    setShowNPCCreator(true);
  };

  const closeCreator = () => {
    setShowNPCCreator(false);
    setEditingNPCId(null);
  };

  /**
   * Save NPC (create or update)
   * npcData is the full NPC object from the creator form
   */
  const saveNPC = (npcData) => {
    setNpcs(prev => {
      const exists = prev.find(n => n.id === npcData.id);
      if (exists) {
        return prev.map(n => n.id === npcData.id ? { ...npcData } : n);
      }
      // Respect active flag if explicitly set (e.g. spawned NPCs), otherwise default false
      return [...prev, { ...npcData, active: npcData.active === true ? true : false, isDead: false, currentPhase: 0 }];
    });
    addLog(`📋 NPC "${npcData.name}" ${editingNPCId ? 'updated' : 'created'}.`);
    closeCreator();
  };

  const removeNPC = (npcId) => {
    const npc = npcs.find(n => n.id === npcId);
    setNpcs(prev => prev.filter(n => n.id !== npcId));
    if (npc) addLog(`🗑️ NPC "${npc.name}" removed.`);
  };

  // ── Activation ───────────────────────────────────────────────────────────

  const activateNPC = (npcId) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;
      addLog(`⚡ "${n.name}" activated and enters the battle!`);
      return { ...n, active: true };
    }));
  };

  const deactivateNPC = (npcId) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;
      addLog(`💤 "${n.name}" deactivated and leaves the battle.`);
      return { ...n, active: false };
    }));
  };

  // ── HP & Damage ──────────────────────────────────────────────────────────

  /**
   * Apply damage to an NPC. Handles phase transitions automatically.
   * Returns the updated NPC for logging.
   */
  const applyDamageToNPC = (npcId, damageAmount, killerName = null, killerUnit = null) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;

      const newHP = Math.max(0, n.hp - damageAmount);
      let updated = { ...n, hp: newHP };

      addLog(`💥 "${n.name}" took ${damageAmount} damage. HP: ${newHP}/${n.maxHp}`);

      // Check phase transitions if NPC has phases
      if (n.hasPhases && n.phases.length > 0) {
        updated = checkPhaseTransition(updated);
      }

      // Check death (no phases left or final phase)
      if (newHP === 0 && !updated.phaseJustTriggered) {
        updated.isDead = true;
        updated.active = false;
        const killLine = killerName
          ? `💀 ${killerName}'s ${killerUnit} killed ${n.name}. Damage dealt: ${damageAmount}hp.`
          : `💀 ${n.name} has been defeated!`;
        addLog(killLine);
        // Fire loot callback — weighted loot OR preloaded table OR final boss
        if (onNPCKilled) {
          const payload = { ...updated, lootTable: n.lootTable };
          const hasWeighted = n.lootMode === 'weighted' && (n.lootItemCount || 1) > 0;
          const hasPreloaded = (n.lootTable || []).length > 0;
          if (hasWeighted || hasPreloaded || n.isFinalBoss) {
            setTimeout(() => onNPCKilled(payload), 50);
          }
        }
      }

      // Clear the flag after using it
      delete updated.phaseJustTriggered;

      return updated;
    }));
  };

  /**
   * Heal / manually set NPC HP (DM override)
   */
  const setNPCHP = (npcId, newHP) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;
      const clamped = Math.max(0, Math.min(n.maxHp, newHP));
      let updated = { ...n, hp: clamped, isDead: clamped === 0, diedInSession: clamped === 0 ? (n.diedInSession || 'Session 1') : n.diedInSession };
      if (updated.hasPhases && updated.phases.length > 0) {
        updated = checkPhaseTransition(updated);
      }
      return updated;
    }));
  };

  // ── Phase Logic ──────────────────────────────────────────────────────────

  /**
   * Check whether the NPC's current HP triggers a phase transition.
   * Phases are checked in order. Returns the mutated NPC object.
   */
  const checkPhaseTransition = (npc) => {
    if (!npc.hasPhases || !npc.phases.length) return npc;

    // Phases are 0-indexed. currentPhase = 0 means base stats are active.
    // Phase index in the phases array corresponds to the NEXT phase to enter.
    const nextPhaseIndex = npc.currentPhase; // index into npc.phases[]
    if (nextPhaseIndex >= npc.phases.length) return npc; // all phases exhausted

    const nextPhase = npc.phases[nextPhaseIndex];

    // Manual phases never auto-trigger — DM triggers them from the card
    if ((nextPhase.triggerType || 'hp') === 'manual') return npc;

    // Check HP trigger
    const triggered =
      nextPhase.triggerHP === 0
        ? npc.hp === 0
        : npc.hp <= nextPhase.triggerHP;

    if (!triggered) return npc;

    // Trigger the phase
    const resurrectHP = nextPhase.triggerHP === 0 ? (nextPhase.resurrectHP || 20) : null;

    // Only apply a phase field if the DM actually filled it in —
    // blank fields inherit the current live value unchanged.
    const phaseAttacksFilled = nextPhase.attacks?.some(a => a.name?.trim());

    let updated = {
      ...npc,
      currentPhase: nextPhaseIndex + 1,
      phaseJustTriggered: true,
      name:         nextPhase.name?.trim()                                         ? nextPhase.name         : npc.name,
      armor:        (nextPhase.armor !== null && nextPhase.armor !== '')            ? nextPhase.armor        : npc.armor,
      attackBonus:  (nextPhase.attackBonus !== null && nextPhase.attackBonus !== '') ? nextPhase.attackBonus : npc.attackBonus,
      walk:         nextPhase.walk?.trim()                                          ? nextPhase.walk         : npc.walk,
      run:          nextPhase.run?.trim()                                           ? nextPhase.run          : npc.run,
      attacks:      phaseAttacksFilled                                              ? nextPhase.attacks      : npc.attacks,
    };

    // Resurrection case
    if (nextPhase.triggerHP === 0 && resurrectHP) {
      updated.hp = resurrectHP;
      updated.maxHp = resurrectHP;
      updated.isDead = false;
      updated.active = true;
    }

    addLog(`🔄 "${npc.name}" entered ${nextPhase.label || `Phase ${nextPhaseIndex + 1}`}!`);

    return updated;
  };

  /**
   * DM manually triggers next phase
   */
  const triggerNextPhase = (npcId) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;
      if (!n.hasPhases || n.currentPhase >= n.phases.length) return n;

      const nextPhase = n.phases[n.currentPhase];
      const resurrectHP = nextPhase.triggerHP === 0 ? (nextPhase.resurrectHP || 20) : null;

      const phaseAttacksFilled = nextPhase.attacks?.some(a => a.name?.trim());

      let updated = {
        ...n,
        currentPhase: n.currentPhase + 1,
        name:         nextPhase.name?.trim()                                          ? nextPhase.name         : n.name,
        armor:        (nextPhase.armor !== null && nextPhase.armor !== '')             ? nextPhase.armor        : n.armor,
        attackBonus:  (nextPhase.attackBonus !== null && nextPhase.attackBonus !== '') ? nextPhase.attackBonus  : n.attackBonus,
        walk:         nextPhase.walk?.trim()                                           ? nextPhase.walk         : n.walk,
        run:          nextPhase.run?.trim()                                            ? nextPhase.run          : n.run,
        attacks:      phaseAttacksFilled                                               ? nextPhase.attacks      : n.attacks,
      };

      if (resurrectHP) {
        updated.hp = resurrectHP;
        updated.maxHp = resurrectHP;
        updated.isDead = false;
        updated.active = true;
      }

      addLog(`🔄 DM triggered: "${n.name}" → ${nextPhase.label || `Phase ${n.currentPhase + 1}`}!`);
      return updated;
    }));
  };

  // ── Getters ───────────────────────────────────────────────────────────────

  const activeNPCs = npcs.filter(n => n.active && !n.isDead);
  const inactiveNPCs = npcs.filter(n => !n.active && !n.isDead);
  const deadNPCs = npcs.filter(n => n.isDead);

  const getNPCById = (id) => npcs.find(n => n.id === id);

  const resetAllNPCs = () => {
    setNpcs(prev => prev.map(n => ({
      ...n,
      hp: n.maxHp,
      isDead: false,
      active: false,
      currentPhaseIndex: 0,
      phaseJustTriggered: false,
      attackCount: 0,
    })));
  };

  return {
    npcs,
    setNpcs,
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
    resetAllNPCs,
  };
};