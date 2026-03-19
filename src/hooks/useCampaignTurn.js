import { useState, useRef } from 'react';

/**
 * useCampaignTurn
 * Manages campaign-mode turn rotation, NPC attack calculator, and First Strike.
 */
export const useCampaignTurn = (
  players,
  activeNPCs,
  getNPCById,
  playersWhoActedThisRound,
  currentRound,
  endTurn,
  addLog,
  updatePlayer,
  setNpcs,
  applyDamageToNPC,
  trackVP,
  onRoundAdvance = null,
  onUnitDied = null,
  onCreateTimer = null
) => {
  // Store callbacks in refs so closures always call the latest version
  const onRoundAdvanceRef = useRef(onRoundAdvance);
  onRoundAdvanceRef.current = onRoundAdvance;
  const onUnitDiedRef = useRef(onUnitDied);
  onUnitDiedRef.current = onUnitDied;

  const [campaignTurnIndex,     setCampaignTurnIndex]     = useState(0);
  const [npcsWhoActedThisRound, setNpcsWhoActedThisRound] = useState([]);

  // ── NPC Attack calculator state ───────────────────────────────────────────
  const [npcAttackData,              setNpcAttackData]              = useState(null);
  const [showNPCCalculator,          setShowNPCCalculator]          = useState(false);
  const [isSquadAttack,              setIsSquadAttack]              = useState(false);
  const [npcDamageDistribution,      setNpcDamageDistribution]      = useState({});
  const [showNPCDamageDistribution,  setShowNPCDamageDistribution]  = useState(false);

  // ── Rebuttal state (#8) ──────────────────────────────────────────────────
  const [rebuttalModal, setRebuttalModal] = useState(null); // { npcId, npcName, attacks }

  const openRebuttal = (npcId, aggressorPlayerId, aggressorUnitTypes) => {
    const npc = getNPCById(npcId);
    if (!npc || !npc.active || npc.isDead) return;
    const attackMoves = (npc.attacks || []).filter(a => (a.attackType || 'attack') === 'attack');
    if (attackMoves.length === 0) return;
    setRebuttalModal({ npcId, npcName: npc.name, attacks: attackMoves, aggressorPlayerId, aggressorUnitTypes: aggressorUnitTypes || [] });
  };

  const confirmRebuttal = (attackIndex) => {
    if (!rebuttalModal) return;
    openNPCAttack(rebuttalModal.npcId, attackIndex, {
      prefilledPlayerId: rebuttalModal.aggressorPlayerId,
      prefilledUnitTypes: rebuttalModal.aggressorUnitTypes,
    });
    setRebuttalModal(null);
  };

  const dismissRebuttal = () => setRebuttalModal(null);

  // ── First Strike state ────────────────────────────────────────────────────
  const [firstStrikeModal,    setFirstStrikeModal]    = useState(null); // { npcId }
  const [firstStrikeSelected, setFirstStrikeSelected] = useState([]);

  const lastAttackerIdRef = useRef(null);
  const [lastAggressors, setLastAggressors] = useState({}); // { npcId: playerId }

  // ── Turn order ────────────────────────────────────────────────────────────

  const buildTurnOrder = () => {
    // Players always in order
    const order = [];
    players.forEach(p => order.push({ type: 'player', id: p.id }));

    // Only include NPCs that have been aggroed — insert after their last aggressor
    activeNPCs.forEach(npc => {
      const aggressorId = lastAggressors[npc.id];
      if (!aggressorId) return; // not yet aggroed — hidden from turn order
      const idx = order.findIndex(e => e.type === 'player' && e.id === aggressorId);
      if (idx !== -1) {
        order.splice(idx + 1, 0, { type: 'npc', id: npc.id });
      } else {
        order.push({ type: 'npc', id: npc.id });
      }
    });
    return order;
  };

  const endCampaignTurn = () => {
    const campaignTurnOrder = buildTurnOrder();
    if (campaignTurnOrder.length === 0) return;

    const current = campaignTurnOrder[campaignTurnIndex];
    if (!current) return;

    // NPCs never hold the active turn — only players advance the turn counter
    // NPC slots are just visual markers showing the DM their retaliation window
    if (current.type === 'npc') {
      // Skip past this NPC slot automatically
      const freshOrder = buildTurnOrder();
      let nextIndex = (campaignTurnIndex + 1) % Math.max(freshOrder.length, 1);
      let attempts = 0;
      while (attempts < freshOrder.length) {
        const candidate = freshOrder[nextIndex];
        if (!candidate || candidate.type === 'player') break;
        nextIndex = (nextIndex + 1) % freshOrder.length;
        attempts++;
      }
      setCampaignTurnIndex(nextIndex);
      return;
    }

    // current is a player — normal flow
    const freshOrder = buildTurnOrder();
    const allPlayersActed = freshOrder
      .filter(e => e.type === 'player')
      .every(e => playersWhoActedThisRound.includes(e.id));

    let nextIndex = (campaignTurnIndex + 1) % Math.max(freshOrder.length, 1);

    if (allPlayersActed) {
      setCampaignTurnIndex(0);
      setNpcsWhoActedThisRound([]);
      addLog(`----- Round ${currentRound + 1} -----`);
      if (onRoundAdvanceRef.current) onRoundAdvanceRef.current();
    } else {
      // Skip NPC slots and already-acted players
      let attempts = 0;
      while (attempts < freshOrder.length) {
        const candidate = freshOrder[nextIndex];
        if (!candidate) break;
        if (candidate.type === 'player' && !playersWhoActedThisRound.includes(candidate.id)) break;
        nextIndex = (nextIndex + 1) % freshOrder.length;
        attempts++;
      }
      setCampaignTurnIndex(nextIndex);
    }

    endTurn(); // fires onPlayerTurnEnd → status ticks for this player
  };

  // ── NPC Attack ────────────────────────────────────────────────────────────

  const openNPCAttack = (npcId, attackIndex, prefilled = {}) => {
    const npc = getNPCById(npcId);
    if (!npc) return;
    const attack = npc.attacks[attackIndex];
    // Build prefilled targets from aggressor info
    const prefilledTargets = prefilled.prefilledPlayerId
      ? (prefilled.prefilledUnitTypes || []).map(unitType => ({ playerId: prefilled.prefilledPlayerId, unitType }))
      : [];
    setNpcAttackData({
      npcId,
      npcName: npc.name,
      attackIndex,
      attack,
      armor: npc.armor,
      attackBonus: npc.attackBonus || 0,
      prefilledPlayerId: prefilled.prefilledPlayerId || null,
      targetSquadMembers: prefilledTargets,
      targetIsSquad: false,
      totalDamage: 0,
      d20Rolls: [],
    });
    setShowNPCCalculator(true);
  };

  const closeNPCCalculator = () => {
    setShowNPCCalculator(false);
    setShowNPCDamageDistribution(false);
    setNpcAttackData(null);
    setNpcDamageDistribution({});
    setIsSquadAttack(false);
  };

  // ── NPC Squad Attack ──────────────────────────────────────────────────────
  // squadMembers: [{ npcId, npcName, attackIndex, attack, armor, attackBonus }]
  const openNPCSquadAttack = (squadMembers) => {
    setNpcAttackData({
      isSquad: true,
      squadMembers,
      // For squad: no single npcId/attack — calculator sequences through members
      targetId: null,
      targetSquadMembers: [],
      targetIsSquad: false,
      totalDamage: 0,
      d20Rolls: [],
    });
    setIsSquadAttack(true);
    setShowNPCCalculator(true);
  };

  const unitNameByType = (player, unitType) => {
    if (!unitType || unitType === 'commander') return player?.commanderStats?.customName || player?.commander || 'Commander';
    if (unitType === 'special') return player?.subUnits?.[0]?.name || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player?.subUnits?.[idx]?.name || `Unit ${idx}`;
  };

  const applyNPCDamage = () => {
    if (!npcAttackData) return;
    const totalDistributed = Object.values(npcDamageDistribution).reduce((s, v) => s + v, 0);
    if (totalDistributed !== npcAttackData.totalDamage) {
      return;
    }

    (npcAttackData.targetSquadMembers || []).forEach(target => {
      const dmg = npcDamageDistribution[`${target.playerId}-${target.unitType}`] || 0;
      if (dmg <= 0) return;

      const player = players.find(p => p.id === target.playerId);
      if (!player) return;

      // Get attack effect — from single attack or from squad member's attack
      const attackEffect = npcAttackData.isSquad
        ? null // squad attacks don't apply effects (each member would need its own target)
        : npcAttackData.attack?.attackEffect;

      if (target.unitType === 'commander') {
        const newHp = Math.max(0, player.commanderStats.hp - dmg);
        const newCmdStats = { ...player.commanderStats, hp: newHp };
        if (attackEffect && dmg > 0) {
          if (attackEffect.type === 'poison') {
            newCmdStats.statusEffects = [...(player.commanderStats.statusEffects || []), { type: 'poison', value: attackEffect.value || 2, duration: attackEffect.duration || 2 }];
            if (onCreateTimer) onCreateTimer(
              `🤢 Poison — ${player.commanderStats?.customName || player.commander}`,
              attackEffect.duration || 2,
              [{ type: 'player', playerId: player.id, unitType: 'commander' }]
            );
          }
          if (attackEffect.type === 'stun') {
            newCmdStats.statusEffects = [...(player.commanderStats.statusEffects || []), { type: 'stun', duration: attackEffect.duration || 1 }];
            if (onCreateTimer) onCreateTimer(
              `💫 Stun — ${player.commanderStats?.customName || player.commander}`,
              attackEffect.duration || 1,
              [{ type: 'player', playerId: player.id, unitType: 'commander' }]
            );
          }
        }
        if (newHp === 0 && player.commanderStats.hp > 0) {
          const killerLabel = npcAttackData.isSquad
            ? (npcAttackData.squadMembers?.map(m => m.npcName).join(', ') || 'NPC Squad')
            : (npcAttackData.npcName || 'NPC');
          const cmdLabel = player.commanderStats.customName || player.commander || 'Commander';
          addLog(`💀 ${killerLabel} has killed ${player.playerName}'s ${cmdLabel}. Damage dealt: ${dmg}hp.`);
        }
        updatePlayer(player.id, { commanderStats: newCmdStats });
      } else {
        const idx = target.unitType === 'special' ? 0 : parseInt(target.unitType.replace('soldier', ''));
        const unit = (player.subUnits || [])[idx];
        const newHp = unit ? Math.max(0, unit.hp - dmg) : 0;
        const justDied = unit && unit.hp > 0 && newHp === 0;
        let updatedUnit = { ...((player.subUnits || [])[idx] || {}), hp: newHp };
        if (attackEffect && dmg > 0) {
          const unitType = idx === 0 ? 'special' : `soldier${idx}`;
          const uLabel = unit?.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`);
          if (attackEffect.type === 'poison') {
            updatedUnit.statusEffects = [...(updatedUnit.statusEffects || []), { type: 'poison', value: attackEffect.value || 2, duration: attackEffect.duration || 2 }];
            if (onCreateTimer) onCreateTimer(
              `🤢 Poison — ${player.playerName}'s ${uLabel}`,
              attackEffect.duration || 2,
              [{ type: 'player', playerId: player.id, unitType }]
            );
          }
          if (attackEffect.type === 'stun') {
            updatedUnit.statusEffects = [...(updatedUnit.statusEffects || []), { type: 'stun', duration: attackEffect.duration || 1 }];
            if (onCreateTimer) onCreateTimer(
              `💫 Stun — ${player.playerName}'s ${uLabel}`,
              attackEffect.duration || 1,
              [{ type: 'player', playerId: player.id, unitType }]
            );
          }
        }
        const newSubs = (player.subUnits || []).map((u, i) => i === idx ? updatedUnit : u);

        if (justDied) {
          const unitType = idx === 0 ? 'special' : `soldier${idx}`;
          const unitLabel = unit.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`);
          const killerLabel = npcAttackData.isSquad
            ? (npcAttackData.squadMembers?.map(m => m.npcName).join(', ') || 'NPC Squad')
            : (npcAttackData.npcName || 'NPC');
          addLog(`💀 ${killerLabel} has killed ${player.playerName}'s ${unitLabel}. Damage dealt: ${dmg}hp.`);
          const unitItems = (player.inventory || []).filter(it => it.heldBy === unitType);
          if (unitItems.length > 0 && onUnitDiedRef.current) {
            onUnitDiedRef.current({ unitLabel, items: unitItems, playerId: player.id });
          }
        }

        // Revive queue — same logic as PlayerCard.handleSubUnitHPChange
        let newReviveQueue = [...(player.reviveQueue || [])];
        const lives = unit?.livesRemaining ?? unit?.revives ?? 1;
        if (justDied && lives > 0 && !newReviveQueue.includes(idx)) {
          newReviveQueue = [...newReviveQueue, idx];
        }
        const allDead = newSubs.every(u => u.hp === 0);
        let finalSubs = newSubs;
        if (allDead) {
          newReviveQueue = [];
          finalSubs = newSubs.map(u => ({ ...u, livesRemaining: 0, revives: 0 }));
        }
        updatePlayer(player.id, { subUnits: finalSubs, reviveQueue: newReviveQueue });
      }
      trackVP(target.playerId, 'damageTaken', dmg);
    });

    const npc = getNPCById(npcAttackData.npcId);
    const targets = (npcAttackData.targetSquadMembers || [])
      .filter(t => npcDamageDistribution[`${t.playerId}-${t.unitType}`] > 0)
      .map(t => {
        const tp = players.find(p => p.id === t.playerId);
        const dmg = npcDamageDistribution[`${t.playerId}-${t.unitType}`];
        return `${tp?.playerName || 'Unknown'}'s ${unitNameByType(tp, t.unitType)} for ${dmg}hp`;
      }).join(', ');

    if (npcAttackData.isSquad) {
      const names = (npcAttackData.squadMembers || []).map(m => m.npcName).join(', ');
      addLog(`👾 Squad [${names}] attacked → ${targets}`);
    } else {
      const npc = getNPCById(npcAttackData.npcId);
      addLog(`👾 "${npc?.name}" used "${npcAttackData.attack?.name}" → ${targets}`);
    }
    closeNPCCalculator();
  };

  // ── First Strike ──────────────────────────────────────────────────────────

  const handleActivateNPC = (npcId) => {
    setFirstStrikeSelected([]);
    setFirstStrikeModal({ npcId });
  };

  const toggleFirstStrikePlayer = (playerId) => {
    setFirstStrikeSelected(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const confirmActivation = (activateNPCFn, awardFirstStrike) => {
    if (!firstStrikeModal) return;
    activateNPCFn(firstStrikeModal.npcId);
    if (awardFirstStrike && firstStrikeSelected.length > 0) {
      firstStrikeSelected.forEach(playerId => updatePlayer(playerId, { firstStrike: true }));
      const names = firstStrikeSelected
        .map(id => players.find(p => p.id === id)?.playerName || 'Unknown')
        .join(', ');
      addLog(`⚡ First Strike awarded to: ${names}!`);
    }
    setFirstStrikeModal(null);
    setFirstStrikeSelected([]);
  };

  const handlePlayerAttackNPC = (attackData) => {
    const attacker = players.find(p => p.id === attackData?.attackerId);
    const targetsNPC = attackData?.targetSquadMembers?.some(t => t.isNPC);
    if (attacker?.firstStrike && targetsNPC) {
      updatePlayer(attacker.id, { firstStrike: false });
      addLog(`⚡ ${attacker.playerName} used their First Strike bonus!`);
    }
    // Track last aggressor for each targeted NPC (#9)
    if (attackData?.attackerId && targetsNPC) {
      const newAggressors = { ...lastAggressors };
      (attackData.targetSquadMembers || []).forEach(t => {
        if (t.isNPC) newAggressors[t.npcId] = attackData.attackerId;
      });
      setLastAggressors(newAggressors);
    }
  };

  // ── Increment NPC attack counter ──────────────────────────────────────────

  const handleIncrementAttack = (npcId, reset) => {
    setNpcs(prev => prev.map(n => n.id !== npcId ? n : { ...n, attackCount: reset ? 0 : (n.attackCount || 0) + 1 }));
  };

  return {
    campaignTurnIndex,
    setCampaignTurnIndex,
    npcsWhoActedThisRound,
    setNpcsWhoActedThisRound,
    npcAttackData,
    setNpcAttackData,
    showNPCCalculator,
    setShowNPCCalculator,
    npcDamageDistribution,
    setNpcDamageDistribution,
    showNPCDamageDistribution,
    setShowNPCDamageDistribution,
    firstStrikeModal,
    firstStrikeSelected,
    lastAttackerIdRef,
    buildTurnOrder,
    endCampaignTurn,
    openNPCAttack,
    openNPCSquadAttack,
    isSquadAttack,
    closeNPCCalculator,
    applyNPCDamage,
    handleActivateNPC,
    toggleFirstStrikePlayer,
    confirmActivation,
    handlePlayerAttackNPC,
    handleIncrementAttack,
    lastAggressors,
    onCreateTimer,
    rebuttalModal,
    openRebuttal,
    confirmRebuttal,
    dismissRebuttal,
  };
};