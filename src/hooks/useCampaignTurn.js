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
  const [npcBuffModal,  setNpcBuffModal]  = useState(null); // { sourceNpcId, sourceNpcName, attack, selectedNpcIds }

  const openRebuttal = (npcId, aggressorPlayerId, aggressorUnitTypes) => {
    const npc = getNPCById(npcId);
    if (!npc || !npc.active || npc.isDead) return;
    if (npc.hasRebuttal === false) return; // rebuttal disabled for this NPC
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
    // Players always in order — skip absent players
    const order = [];
    players.forEach(p => {
      if (p.isAbsent) return;
      order.push({ type: 'player', id: p.id });
    });

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
    // Include the current player in the acted set (endTurn adds them, but we check first)
    const playersWhoActedIncludingCurrent = [...playersWhoActedThisRound, current.id];
    const allPlayersActed = freshOrder
      .filter(e => e.type === 'player')
      .every(e => playersWhoActedIncludingCurrent.includes(e.id));

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

  const applyNPCDamage = (distributionOverride) => {
    if (!npcAttackData) return;
    const dist = distributionOverride || npcDamageDistribution;
    // DamageDistribution already enforces remaining === 0 before calling onApply,
    // so we trust the distribution passed in rather than re-checking against totalDamage.

    // Group targets by player so we apply all damage in one updatePlayer call per player
    // (multiple forEach calls for the same player would overwrite each other)
    const killerLabel = npcAttackData.isSquad
      ? (npcAttackData.squadMembers?.map(m => m.npcName).join(', ') || 'NPC Squad')
      : (npcAttackData.npcName || 'NPC');
    const attackEffect = npcAttackData.isSquad ? null : npcAttackData.attack?.attackEffect;

    const targetsByPlayer = {};
    (npcAttackData.targetSquadMembers || []).forEach(target => {
      const dmg = dist[`${target.playerId}-${target.unitType}`] || 0;
      if (dmg <= 0) return;
      if (!targetsByPlayer[target.playerId]) targetsByPlayer[target.playerId] = [];
      targetsByPlayer[target.playerId].push({ ...target, dmg });
    });

    Object.entries(targetsByPlayer).forEach(([playerIdStr, targets]) => {
      const player = players.find(p => String(p.id) === playerIdStr);
      if (!player) return;

      let newCmdStats = { ...player.commanderStats };
      let newSubs = [...(player.subUnits || [])];
      let newReviveQueue = [...(player.reviveQueue || [])];
      let cmdUpdated = false;

      targets.forEach(({ unitType, dmg: rawDmg }) => {
        // Shield Wall — unit takes 0 damage this round
        const getUnitEffects = (unitType) => {
          if (unitType === 'commander') return newCmdStats.statusEffects || [];
          const idx = unitType === 'special' ? 0 : parseInt((unitType||'').replace('soldier',''));
          return newSubs[idx]?.statusEffects || [];
        };
        const hasShield = getUnitEffects(unitType).some(ef => ef.type === 'shieldWall');
        const dmg = hasShield ? 0 : rawDmg;
        if (unitType === 'commander') {
          cmdUpdated = true;
          const newHp = Math.max(0, newCmdStats.hp - dmg);
          newCmdStats = { ...newCmdStats, hp: newHp };
          if (attackEffect) {
            if (attackEffect.type === 'poison') {
              newCmdStats.statusEffects = [...(newCmdStats.statusEffects || []), { type: 'poison', value: attackEffect.value || 2, duration: attackEffect.duration || 2 }];
              if (onCreateTimer) onCreateTimer(`🤢 Poison — ${newCmdStats?.customName || player.commander}`, attackEffect.duration || 2, [{ type: 'player', playerId: player.id, unitType: 'commander' }]);
            }
            if (attackEffect.type === 'stun') {
              newCmdStats.statusEffects = [...(newCmdStats.statusEffects || []), { type: 'stun', duration: attackEffect.duration || 1 }];
              if (onCreateTimer) onCreateTimer(`💫 Stun — ${newCmdStats?.customName || player.commander}`, attackEffect.duration || 1, [{ type: 'player', playerId: player.id, unitType: 'commander' }]);
            }
            if (['attackBuff','defenseBuff','attackDebuff','defenseDebuff'].includes(attackEffect.type)) {
              const cmdLabel = newCmdStats?.customName || player.commander || 'Commander';
              const buffEntry = { type: attackEffect.type, value: attackEffect.value || 2, duration: attackEffect.permanent ? null : (attackEffect.duration || 2), permanent: !!attackEffect.permanent };
              newCmdStats.statusEffects = [...(newCmdStats.statusEffects || []), buffEntry];
              if (!attackEffect.permanent && onCreateTimer) onCreateTimer(`${attackEffect.type.includes('Debuff') ? '↓' : '↑'} ${attackEffect.type} — ${cmdLabel}`, attackEffect.duration || 2, [{ type: 'player', playerId: player.id, unitType: 'commander' }]);
              addLog(`${attackEffect.type.includes('Debuff') ? '↓' : '↑'} ${player.playerName}'s ${cmdLabel} ${attackEffect.type} ${attackEffect.type.includes('Debuff') ? 'reduced' : 'boosted'} by ${attackEffect.value || 2}${attackEffect.permanent ? ' (permanent)' : ` for ${attackEffect.duration || 2} rounds`}`);
            }
          }
          if (newHp === 0 && player.commanderStats.hp > 0) {
            const cmdLabel = newCmdStats.customName || player.commander || 'Commander';
            addLog(`💀 ${killerLabel} has killed ${player.playerName}'s ${cmdLabel}. Damage dealt: ${dmg}hp.`);
          }
        } else {
          const idx = unitType === 'special' ? 0 : parseInt(unitType.replace('soldier', ''));
          const unit = newSubs[idx];
          const newHp = unit ? Math.max(0, unit.hp - dmg) : 0;
          const justDied = unit && unit.hp > 0 && newHp === 0;
          let updatedUnit = { ...(newSubs[idx] || {}), hp: newHp };
          if (attackEffect) {
            const uLabel = unit?.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`);
            if (attackEffect.type === 'poison') {
              updatedUnit.statusEffects = [...(updatedUnit.statusEffects || []), { type: 'poison', value: attackEffect.value || 2, duration: attackEffect.duration || 2 }];
              if (onCreateTimer) onCreateTimer(`🤢 Poison — ${player.playerName}'s ${uLabel}`, attackEffect.duration || 2, [{ type: 'player', playerId: player.id, unitType }]);
            }
            if (attackEffect.type === 'stun') {
              updatedUnit.statusEffects = [...(updatedUnit.statusEffects || []), { type: 'stun', duration: attackEffect.duration || 1 }];
              if (onCreateTimer) onCreateTimer(`💫 Stun — ${player.playerName}'s ${uLabel}`, attackEffect.duration || 1, [{ type: 'player', playerId: player.id, unitType }]);
            }
            if (['attackBuff','defenseBuff','attackDebuff','defenseDebuff'].includes(attackEffect.type)) {
              const buffEntry = { type: attackEffect.type, value: attackEffect.value || 2, duration: attackEffect.permanent ? null : (attackEffect.duration || 2), permanent: !!attackEffect.permanent };
              updatedUnit.statusEffects = [...(updatedUnit.statusEffects || []), buffEntry];
              if (!attackEffect.permanent && onCreateTimer) onCreateTimer(`${attackEffect.type.includes('Debuff') ? '↓' : '↑'} ${attackEffect.type} — ${player.playerName}'s ${uLabel}`, attackEffect.duration || 2, [{ type: 'player', playerId: player.id, unitType }]);
              addLog(`${attackEffect.type.includes('Debuff') ? '↓' : '↑'} ${player.playerName}'s ${uLabel} ${attackEffect.type} ${attackEffect.type.includes('Debuff') ? 'reduced' : 'boosted'} by ${attackEffect.value || 2}${attackEffect.permanent ? ' (permanent)' : ` for ${attackEffect.duration || 2} rounds`}`);
            }
          }
          newSubs = newSubs.map((u, i) => i === idx ? updatedUnit : u);
          if (justDied) {
            const unitLabel = unit.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`);
            addLog(`💀 ${killerLabel} has killed ${player.playerName}'s ${unitLabel}. Damage dealt: ${dmg}hp.`);
            const unitItems = (player.inventory || []).filter(it => it.heldBy === unitType);
            if (unitItems.length > 0 && onUnitDiedRef.current) {
              onUnitDiedRef.current({ unitLabel, items: unitItems, playerId: player.id });
            }
            const lives = unit?.livesRemaining ?? unit?.revives ?? 1;
            if (lives > 0 && !newReviveQueue.includes(idx)) newReviveQueue = [...newReviveQueue, idx];
          }
        }
        trackVP(playerIdStr, 'damageTaken', dmg);
      });

      const allDead = newSubs.every(u => u.hp === 0);
      if (allDead) {
        newReviveQueue = [];
        newSubs = newSubs.map(u => ({ ...u, livesRemaining: 0, revives: 0 }));
      }
      const updates = { subUnits: newSubs, reviveQueue: newReviveQueue };
      if (cmdUpdated) updates.commanderStats = newCmdStats;
      updatePlayer(player.id, updates);
    });

    // CounterStrike — if any targeted unit has counterStrike, reflect half damage to NPC
    (npcAttackData.targetSquadMembers || []).forEach(target => {
      const tp = players.find(p => p.id === target.playerId);
      if (!tp) return;
      const dmg = dist[`${target.playerId}-${target.unitType}`] || 0;
      if (dmg <= 0) return;
      const getEfx = (p, unitType) => {
        if (unitType === 'commander') return p.commanderStats?.statusEffects || [];
        const idx = unitType === 'special' ? 0 : parseInt((unitType || '').replace('soldier', ''));
        return p.subUnits?.[idx]?.statusEffects || [];
      };
      const hasCounter = getEfx(tp, target.unitType).some(ef => ef.type === 'counterStrike');
      if (!hasCounter) return;
      const reflect = Math.ceil(dmg / 2);
      const attackingNpc = getNPCById(npcAttackData.npcId);
      if (attackingNpc) {
        const newHp = Math.max(0, attackingNpc.hp - reflect);
        applyDamageToNPC(attackingNpc.id, reflect, tp.playerName, 'Counter Strike', 'Counter');
        addLog(`⚡ Counter Strike! ${tp.playerName} reflected ${reflect}hp back to "${attackingNpc.name}"`);
      }
    });

    const npc = getNPCById(npcAttackData.npcId);
    const targets = (npcAttackData.targetSquadMembers || [])
      .filter(t => dist[`${t.playerId}-${t.unitType}`] > 0)
      .map(t => {
        const tp = players.find(p => p.id === t.playerId);
        const dmg = dist[`${t.playerId}-${t.unitType}`];
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

  // ── NPC Buff/Debuff modal ─────────────────────────────────────────────────

  const openNpcBuffModal = (npcId, attackIndex) => {
    const npc = getNPCById(npcId);
    if (!npc) return;
    const attack = npc.attacks[attackIndex];
    // Support both dedicated buff type (buffEffect) and action attacks with attackEffect
    const hasBuff = attack?.buffEffect || (attack?.attackEffect && ['attackBuff','defenseBuff','attackDebuff','defenseDebuff'].includes(attack.attackEffect?.type));
    if (!hasBuff) return;
    setNpcBuffModal({ sourceNpcId: npcId, sourceNpcName: npc.name, attack, selectedNpcIds: [] });
  };

  const toggleNpcBuffTarget = (npcId) => {
    setNpcBuffModal(prev => {
      if (!prev) return prev;
      const already = prev.selectedNpcIds.includes(npcId);
      return { ...prev, selectedNpcIds: already ? prev.selectedNpcIds.filter(id => id !== npcId) : [...prev.selectedNpcIds, npcId] };
    });
  };

  const applyNpcBuff = () => {
    if (!npcBuffModal) return;
    const { attack, selectedNpcIds, sourceNpcName } = npcBuffModal;
    // Resolve effect from buffEffect (dedicated buff type) or attackEffect (legacy action type)
    let ef, effectType, isBuff, label;
    if (attack.buffEffect) {
      ef = attack.buffEffect;
      isBuff = (ef.value ?? 0) >= 0;
      effectType = ef.stat === 'attack'
        ? (isBuff ? 'attackBuff' : 'attackDebuff')
        : (isBuff ? 'defenseBuff' : 'defenseDebuff');
      label = ef.stat === 'attack'
        ? (isBuff ? '⚔️↑ Atk Buff' : '⚔️↓ Atk Debuff')
        : (isBuff ? '🛡️↑ Def Buff' : '🛡️↓ Def Debuff');
    } else {
      ef = attack.attackEffect;
      isBuff = ['attackBuff', 'defenseBuff'].includes(ef?.type);
      effectType = ef?.type;
      label = ef?.type === 'attackBuff' ? '⚔️↑ Atk Buff'
        : ef?.type === 'defenseBuff'  ? '🛡️↑ Def Buff'
        : ef?.type === 'attackDebuff' ? '⚔️↓ Atk Debuff'
        : '🛡️↓ Def Debuff';
    }
    if (!ef || selectedNpcIds.length === 0) { setNpcBuffModal(null); return; }
    const absValue = Math.abs(ef.value ?? 2);
    setNpcs(prev => prev.map(n => {
      if (!selectedNpcIds.includes(n.id)) return n;
      const entry = { type: effectType, value: absValue, duration: ef.permanent ? null : (ef.duration ?? 2), permanent: !!ef.permanent };
      const updated = { ...n, statusEffects: [...(n.statusEffects || []), entry] };
      addLog(`${isBuff ? '↑' : '↓'} ${sourceNpcName} applied ${label} to "${n.name}" ${isBuff ? '+' : '-'}${absValue}${ef.permanent ? ' (permanent)' : ` for ${ef.duration ?? 2}r`}`);
      if (!ef.permanent && onCreateTimer) onCreateTimer(`${label} — ${n.name}`, ef.duration ?? 2, []);
      return updated;
    }));
    setNpcBuffModal(null);
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
    npcBuffModal,
    setNpcBuffModal,
    openNpcBuffModal,
    toggleNpcBuffTarget,
    applyNpcBuff,
  };
};