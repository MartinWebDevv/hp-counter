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
  onRoundAdvance = null
) => {
  const [campaignTurnIndex,     setCampaignTurnIndex]     = useState(0);
  const [npcsWhoActedThisRound, setNpcsWhoActedThisRound] = useState([]);

  // ── NPC Attack calculator state ───────────────────────────────────────────
  const [npcAttackData,              setNpcAttackData]              = useState(null);
  const [showNPCCalculator,          setShowNPCCalculator]          = useState(false);
  const [npcDamageDistribution,      setNpcDamageDistribution]      = useState({});
  const [showNPCDamageDistribution,  setShowNPCDamageDistribution]  = useState(false);

  // ── First Strike state ────────────────────────────────────────────────────
  const [firstStrikeModal,    setFirstStrikeModal]    = useState(null); // { npcId }
  const [firstStrikeSelected, setFirstStrikeSelected] = useState([]);

  const lastAttackerIdRef = useRef(null);

  // ── Turn order ────────────────────────────────────────────────────────────

  const buildTurnOrder = () => {
    const order = [];
    players.forEach(p => order.push({ type: 'player', id: p.id }));
    activeNPCs.forEach(n => order.push({ type: 'npc', id: n.id }));
    return order;
  };

  const endCampaignTurn = () => {
    const campaignTurnOrder = buildTurnOrder();
    if (campaignTurnOrder.length === 0) return;

    const current = campaignTurnOrder[campaignTurnIndex];
    if (!current) return;

    if (current.type === 'npc') {
      setNpcsWhoActedThisRound(prev => [...prev, current.id]);
    }

    const freshOrder = buildTurnOrder();
    const allActed = freshOrder.every(entry => {
      if (entry.type === 'player') return playersWhoActedThisRound.includes(entry.id);
      return npcsWhoActedThisRound.includes(entry.id);
    });

    let nextIndex = (campaignTurnIndex + 1) % Math.max(freshOrder.length, 1);

    if (allActed || freshOrder.length === 0) {
      setCampaignTurnIndex(0);
      setNpcsWhoActedThisRound([]);
      addLog(`----- Round ${currentRound + 1} -----`);
      if (onRoundAdvance) onRoundAdvance();
    } else {
      let attempts = 0;
      while (attempts < freshOrder.length) {
        const candidate = freshOrder[nextIndex];
        if (!candidate) break;
        if (candidate.type === 'player') {
          const p = players.find(pl => pl.id === candidate.id);
          if (p && !playersWhoActedThisRound.includes(p.id)) break;
        } else {
          const n = getNPCById(candidate.id);
          if (n && n.active && !n.isDead && !npcsWhoActedThisRound.includes(n.id)) break;
        }
        nextIndex = (nextIndex + 1) % freshOrder.length;
        attempts++;
      }
      setCampaignTurnIndex(nextIndex);
    }

    if (current.type === 'player') endTurn();
  };

  // ── NPC Attack ────────────────────────────────────────────────────────────

  const openNPCAttack = (npcId, attackIndex) => {
    const npc = getNPCById(npcId);
    if (!npc) return;
    const attack = npc.attacks[attackIndex];
    setNpcAttackData({
      npcId,
      npcName: npc.name,
      attackIndex,
      attack,
      armor: npc.armor,
      attackBonus: npc.attackBonus || 0,
      targetId: null,
      targetSquadMembers: [],
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
      alert('Please distribute all damage before applying!');
      return;
    }

    (npcAttackData.targetSquadMembers || []).forEach(target => {
      const dmg = npcDamageDistribution[`${target.playerId}-${target.unitType}`] || 0;
      if (dmg <= 0) return;

      const player = players.find(p => p.id === target.playerId);
      if (!player) return;

      if (target.unitType === 'commander') {
        updatePlayer(player.id, {
          commanderStats: { ...player.commanderStats, hp: Math.max(0, player.commanderStats.hp - dmg) },
        });
      } else {
        const idx = target.unitType === 'special' ? 0 : parseInt(target.unitType.replace('soldier', ''));
        const newSubs = (player.subUnits || []).map((u, i) => i === idx ? { ...u, hp: Math.max(0, u.hp - dmg) } : u);
        updatePlayer(player.id, { subUnits: newSubs });
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

    addLog(`👾 "${npc?.name}" used "${npcAttackData.attack?.name}" → ${targets}`);
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
    closeNPCCalculator,
    applyNPCDamage,
    handleActivateNPC,
    toggleFirstStrikePlayer,
    confirmActivation,
    handlePlayerAttackNPC,
    handleIncrementAttack,
  };
};