import { useState, useEffect, useRef } from 'react';
import { generateId } from '../utils/idUtils';

const NPC_STORAGE_KEY = 'bt_npcs';

/**
 * useNPCState
 * Manages all NPC state for Campaign mode.
 */
export const useNPCState = (addLog, onNPCKilled) => {
  const [npcs,           setNpcs]           = useState(() => {
    try {
      const saved = localStorage.getItem(NPC_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showNPCCreator, setShowNPCCreator] = useState(false);
  const [editingNPCId,   setEditingNPCId]   = useState(null);
  const onEvolveRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(NPC_STORAGE_KEY, JSON.stringify(npcs)); }
    catch (e) { console.error('Error saving NPCs:', e); }
  }, [npcs]);

  // ── Blank constructors ────────────────────────────────────────────────────

  const blankAttack = () => ({
    id:           generateId('atk'),
    name:         '',
    attackType:   'attack',
    dieType:      'd20',
    numRolls:     1,
    range:        '',
    spawnText:    '',
    spawnDieType: '',
    spawnNumRolls:1,
    spawnPresets: [],
    description:  '',
    attackEffect: null,
    buffEffect:   null,
  });

  const blankPhase = (phaseNumber) => ({
    id:          generateId('phase'),
    phaseNumber,
    label:       `Phase ${phaseNumber}`,
    triggerHP:   0,
    triggerType: 'hp',
    resurrectHP: null,
    name:        '',
    armor:       null,
    attackBonus: null,
    walk:        '',
    run:         '',
    attacks:     [blankAttack()],
  });

  const blankEvolution = (evoNumber) => ({
    id:          generateId('evo'),
    evoNumber,
    name:        '',
    triggerType: 'hp',
    triggerHP:   0,
    newMaxHP:    20,
    armor:       null,
    attackBonus: null,
    walk:        '',
    run:         '',
    attacks:     [blankAttack()],
    triggered:   false,
  });

  const blankNPC = () => ({
    id:           generateId('npc'),
    name:         '',
    hp:           20,
    maxHp:        20,
    armor:        0,
    attackBonus:  0,
    walk:         '6"',
    run:          '12"',
    attacks:      [blankAttack()],
    hasPhases:    false,
    phases:       [],
    currentPhase: 0,
    hasEvolutions:false,
    evolutions:   [],
    active:       false,
    isDead:       false,
    isFinalBoss:  false,
    hasRebuttal:  true,
  });

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreator  = (npcId = null) => { setEditingNPCId(npcId); setShowNPCCreator(true); };
  const closeCreator = ()              => { setShowNPCCreator(false); setEditingNPCId(null); };

  const saveNPC = (npcData) => {
    setNpcs(prev => {
      const exists = prev.find(n => n.id === npcData.id);
      if (exists) return prev.map(n => n.id === npcData.id ? { ...npcData } : n);
      return [...prev, { ...npcData, active: Boolean(npcData.active), isDead: false, currentPhase: 0 }];
    });
    addLog(`📋 NPC "${npcData.name}" ${editingNPCId ? 'updated' : 'created'}.`);
    closeCreator();
  };

  const removeNPC = (npcId) => {
    const npc = npcs.find(n => n.id === npcId);
    setNpcs(prev => prev.filter(n => n.id !== npcId));
    if (npc) addLog(`🗑️ NPC "${npc.name}" removed.`);
  };

  const duplicateNPC = (npcId) => {
    const original = npcs.find(n => n.id === npcId);
    if (!original) return;
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      id:                generateId('npc'),
      name:              `${original.name} (Copy)`,
      hp:                original.maxHp,
      active:            false,
      isDead:            false,
      currentPhase:      0,
      attackCount:       0,
      phaseJustTriggered:false,
    };
    copy.attacks = (copy.attacks || []).map(a => ({ ...a, id: generateId('atk') }));
    copy.phases  = (copy.phases  || []).map(p => ({
      ...p,
      id:      generateId('phase'),
      attacks: (p.attacks || []).map(a => ({ ...a, id: generateId('atk') })),
    }));
    setNpcs(prev => [...prev, copy]);
    addLog(`📋 NPC "${original.name}" duplicated.`);
  };

  // ── Activation ────────────────────────────────────────────────────────────

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

  // ── HP & Damage ───────────────────────────────────────────────────────────

  const applyDamageToNPC = (npcId, damageAmount, killerName = null, killerUnit = null) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;

      const newHP  = Math.max(0, n.hp - damageAmount);
      let updated  = { ...n, hp: newHP };

      addLog(`💥 "${n.name}" took ${damageAmount} damage. HP: ${newHP}/${n.maxHp}`);

      if (n.hasPhases && n.phases.length > 0) {
        updated = checkPhaseTransition(updated);
      }

      if (newHP === 0 && !updated.phaseJustTriggered) {
        updated = { ...updated, isDead: true, active: false };
        const killLine = killerName
          ? `💀 ${killerName}'s ${killerUnit} killed ${n.name}. Damage dealt: ${damageAmount}hp.`
          : `💀 ${n.name} has been defeated!`;
        addLog(killLine);

        if (onNPCKilled) {
          const hasWeighted  = n.lootMode === 'weighted' && (n.lootItemCount || 1) > 0;
          const hasPreloaded = (n.lootTable || []).length > 0;
          if (hasWeighted || hasPreloaded || n.isFinalBoss) {
            setTimeout(() => onNPCKilled({ ...updated, lootTable: n.lootTable }), 50);
          }
        }
      }

      // FIXED: use spread to omit phaseJustTriggered rather than `delete` (mutation anti-pattern)
      const { phaseJustTriggered: _, ...cleaned } = updated;
      return cleaned;
    }));
  };

  const setNPCHP = (npcId, newHP) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId) return n;
      const clamped = Math.max(0, Math.min(n.maxHp, newHP));
      let updated = {
        ...n, hp: clamped,
        isDead: clamped === 0,
        diedInSession: clamped === 0 ? (n.diedInSession || 'Session 1') : n.diedInSession,
      };
      if (updated.hasPhases    && updated.phases.length > 0)   updated = checkPhaseTransition(updated);
      if (updated.hasEvolutions && updated.evolutions?.length > 0) updated = checkEvolutionTransition(updated, onEvolveRef.current);
      return updated;
    }));
  };

  // ── Phase logic ───────────────────────────────────────────────────────────

  const checkPhaseTransition = (npc) => {
    if (!npc.hasPhases || !npc.phases.length) return npc;

    const nextPhaseIdx = npc.currentPhase;
    if (nextPhaseIdx >= npc.phases.length) return npc;

    const nextPhase = npc.phases[nextPhaseIdx];
    if ((nextPhase.triggerType || 'hp') === 'manual') return npc;

    const triggered = nextPhase.triggerHP === 0 ? npc.hp === 0 : npc.hp <= nextPhase.triggerHP;
    if (!triggered) return npc;

    const resurrectHP          = nextPhase.triggerHP === 0 ? (nextPhase.resurrectHP || 20) : null;
    const phaseAttacksFilled   = nextPhase.attacks?.some(a => a.name?.trim());

    let updated = {
      ...npc,
      currentPhase:       nextPhaseIdx + 1,
      phaseJustTriggered: true,
      name:        nextPhase.name?.trim()                                           ? nextPhase.name        : npc.name,
      armor:       nextPhase.armor       != null && nextPhase.armor       !== ''    ? nextPhase.armor       : npc.armor,
      attackBonus: nextPhase.attackBonus != null && nextPhase.attackBonus !== ''    ? nextPhase.attackBonus : npc.attackBonus,
      walk:        nextPhase.walk?.trim()                                           ? nextPhase.walk        : npc.walk,
      run:         nextPhase.run?.trim()                                            ? nextPhase.run         : npc.run,
      attacks:     phaseAttacksFilled                                               ? nextPhase.attacks     : npc.attacks,
    };

    if (resurrectHP) {
      updated = { ...updated, hp: resurrectHP, maxHp: resurrectHP, isDead: false, active: true };
    }

    addLog(`🔄 "${npc.name}" entered ${nextPhase.label || `Phase ${nextPhaseIdx + 1}`}!`);
    return updated;
  };

  const triggerNextPhase = (npcId, targetPhaseIndex = null) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId || !n.hasPhases || n.phases.length === 0) return n;

      const phaseIdx = targetPhaseIndex !== null ? targetPhaseIndex : n.currentPhase;
      if (phaseIdx >= n.phases.length) return n;

      const nextPhase          = n.phases[phaseIdx];
      const resurrectHP        = nextPhase.triggerHP === 0 ? (nextPhase.resurrectHP || 20) : null;
      const phaseAttacksFilled = nextPhase.attacks?.some(a => a.name?.trim());

      let updated = {
        ...n,
        currentPhase: phaseIdx + 1,
        name:        nextPhase.name?.trim()                                           ? nextPhase.name        : n.name,
        armor:       nextPhase.armor       != null && nextPhase.armor       !== ''    ? nextPhase.armor       : n.armor,
        attackBonus: nextPhase.attackBonus != null && nextPhase.attackBonus !== ''    ? nextPhase.attackBonus : n.attackBonus,
        walk:        nextPhase.walk?.trim()                                           ? nextPhase.walk        : n.walk,
        run:         nextPhase.run?.trim()                                            ? nextPhase.run         : n.run,
        attacks:     phaseAttacksFilled                                               ? nextPhase.attacks     : n.attacks,
      };

      if (resurrectHP) {
        updated = { ...updated, hp: resurrectHP, maxHp: resurrectHP, isDead: false, active: true };
      }

      addLog(`🔄 DM triggered: "${n.name}" → ${nextPhase.label || `Phase ${phaseIdx + 1}`}!`);
      return updated;
    }));
  };

  // ── Evolution logic ───────────────────────────────────────────────────────

  const applyEvolution = (npc, nextEvo, onEvolve) => {
    const oldName          = npc.name;
    const newName          = nextEvo.name?.trim() ? nextEvo.name : `${npc.name} Ascended`;
    const newMaxHP         = parseInt(nextEvo.newMaxHP, 10) || 20;
    const evoAttacksFilled = nextEvo.attacks?.some(a => a.name?.trim());

    const updated = {
      ...npc,
      name:         newName,
      maxHp:        newMaxHP,
      hp:           newMaxHP,
      isDead:       false,
      active:       npc.isDead ? true : npc.active,
      armor:        nextEvo.armor       != null && nextEvo.armor       !== '' ? parseInt(nextEvo.armor,       10) : npc.armor,
      attackBonus:  nextEvo.attackBonus != null && nextEvo.attackBonus !== '' ? parseInt(nextEvo.attackBonus, 10) : npc.attackBonus,
      walk:         nextEvo.walk?.trim() ? nextEvo.walk : npc.walk,
      run:          nextEvo.run?.trim()  ? nextEvo.run  : npc.run,
      attacks:      evoAttacksFilled ? nextEvo.attacks : npc.attacks,
      currentPhase: 0,
      phases:       nextEvo.phases?.length ? nextEvo.phases : [],
      hasPhases:    !!(nextEvo.phases?.length),
      evolutions:   npc.evolutions.map(e => e.id === nextEvo.id ? { ...e, triggered: true } : e),
    };

    addLog(`⚡ "${oldName}" evolved into "${newName}"! HP reset to ${newMaxHP}/${newMaxHP}!`, 'combat');
    if (onEvolve) onEvolve({ oldName, newName, newMaxHP });
    return updated;
  };

  const checkEvolutionTransition = (npc, onEvolve = null) => {
    if (!npc.hasEvolutions || !npc.evolutions?.length) return npc;
    const nextEvo = npc.evolutions.find(e => !e.triggered && (e.triggerType || 'hp') === 'hp');
    if (!nextEvo || npc.hp > nextEvo.triggerHP) return npc;

    const updated = applyEvolution(npc, nextEvo, onEvolve);
    // Clear transient flag after a tick so it doesn't persist in Firestore
    setTimeout(() => {
      setNpcs(prev => prev.map(n => n.evolutionJustTriggered ? { ...n, evolutionJustTriggered: false } : n));
    }, 0);
    return { ...updated, evolutionJustTriggered: true };
  };

  const triggerNextEvolution = (npcId, onEvolve = null) => {
    setNpcs(prev => prev.map(n => {
      if (n.id !== npcId || !n.hasEvolutions || !n.evolutions?.length) return n;
      const nextEvo = n.evolutions.find(e => !e.triggered);
      if (!nextEvo) return n;
      const cb = onEvolveRef.current || onEvolve;
      return applyEvolution(n, nextEvo, cb);
    }));
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetAllNPCs = () => {
    setNpcs(prev => prev.map(n => ({
      ...n,
      hp:                 n.maxHp,
      isDead:             false,
      active:             false,
      currentPhase:       0,       // FIXED: was `currentPhaseIndex` (wrong field)
      phaseJustTriggered: false,
      attackCount:        0,
    })));
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeNPCs   = npcs.filter(n =>  n.active && !n.isDead);
  const inactiveNPCs = npcs.filter(n => !n.active && !n.isDead);
  const deadNPCs     = npcs.filter(n =>  n.isDead);
  const getNPCById   = (id) => npcs.find(n => n.id === id);

  return {
    npcs, setNpcs,
    activeNPCs, inactiveNPCs, deadNPCs,
    showNPCCreator, editingNPCId,
    blankNPC, blankAttack, blankPhase, blankEvolution,
    openCreator, closeCreator,
    saveNPC, removeNPC, duplicateNPC,
    activateNPC, deactivateNPC,
    applyDamageToNPC, setNPCHP,
    triggerNextPhase, triggerNextEvolution,
    getNPCById, resetAllNPCs,
    setOnEvolve: (fn) => { onEvolveRef.current = fn; },
  };
};
