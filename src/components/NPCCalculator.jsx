import React from 'react';
import { colors, surfaces, fonts, btn } from '../theme';
import DamageDistribution from './DamageDistribution';

const NPCCalculator = ({ npcAttackData, players, npcs = [], onClose, onProceed, onUpdatePlayer = () => {}, onAddLog = () => {}, onCreateTimer = null }) => {
  const isSquad   = !!npcAttackData.isSquad;
  const members   = npcAttackData.squadMembers || [];

  const [squadRollIndex,     setSquadRollIndex]     = React.useState(0);
  const [memberRolls,        setMemberRolls]        = React.useState([]);
  const [currentMemberRolls, setCurrentMemberRolls] = React.useState([]);
  const [rolls,        setRolls]        = React.useState([]);
  const [totalDamage,  setTotalDamage]  = React.useState(0);
  const [atkRoll,      setAtkRoll]      = React.useState('');
  const [defRoll,      setDefRoll]      = React.useState('');
  const [targets,      setTargets]      = React.useState(npcAttackData.targetSquadMembers || []);
  const [errorMsg,     setErrorMsg]     = React.useState('');
  const [showItemPanel,    setShowItemPanel]    = React.useState(false);
  const [activeAtkBonus,   setActiveAtkBonus]   = React.useState(0);
  const [activeDefBonus,   setActiveDefBonus]   = React.useState(0);
  const [showClosecall,    setShowClosecall]    = React.useState(false);
  const [closecallOwner,   setClosecallOwner]   = React.useState(null);
  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = React.useState(
    npcAttackData.prefilledPlayerId ? String(npcAttackData.prefilledPlayerId) : ''
  );
  const [expandedPlayers, setExpandedPlayers] = React.useState({});

  // ── Interaction-based multi-player state ─────────────────────────────────
  // isInteractionMode: triggers whenever targets span multiple players (replaces old isSplitMode)
  // Each interaction = full dice pool against one group:
  //   - commander alone if targeted
  //   - all squad units together if any targeted
  // Order: player by player, commander first then squad within each player
  // interactionRolls[i] = array of roll objects for interaction i
  const [interactionIndex, setInteractionIndex] = React.useState(0);
  const [interactionRolls, setInteractionRolls] = React.useState([]); // [[roll,...], ...]

  const currentMember = isSquad ? members[squadRollIndex] : null;
  const attack        = isSquad ? currentMember?.attack : npcAttackData.attack;
  const attackBonus   = isSquad ? (currentMember?.attackBonus || 0) : (npcAttackData.attackBonus || 0);
  const npcName       = isSquad ? currentMember?.npcName : npcAttackData.npcName;
  const numRolls      = attack?.numRolls || 1;
  const dieType       = attack?.dieType || 'd20';

  // NPC's own status-based attack debuff/buff
  const npcSelf          = !isSquad ? npcs.find(n => n.id === npcAttackData.npcId) : null;
  const npcSelfAtkDebuff = (npcSelf?.statusEffects || []).filter(ef => ef.type === 'attackDebuff').reduce((s, ef) => s + (ef.value||0), 0);
  const npcSelfAtkBuff   = (npcSelf?.statusEffects || []).filter(ef => ef.type === 'attackBuff').reduce((s, ef) => s + (ef.value||0), 0);
  const dieMax        = dieType === 'd20' ? 20 : dieType === 'd10' ? 10 : dieType === 'd6' ? 6 : 4;

  // Build ordered interaction list from current targets
  // Each player gets: commander interaction (if targeted), then squad interaction (if any squad targeted)
  const buildInteractions = (targetList) => {
    const uniquePids = [...new Set(targetList.map(t => t.playerId).filter(Boolean))];
    const interactions = [];
    uniquePids.forEach(pid => {
      const pTargets = targetList.filter(t => t.playerId === pid);
      const cmdTarget = pTargets.find(t => t.unitType === 'commander');
      const squadTargets = pTargets.filter(t => t.unitType !== 'commander');
      if (cmdTarget) interactions.push({ playerId: pid, targets: [cmdTarget], isCommander: true });
      if (squadTargets.length > 0) interactions.push({ playerId: pid, targets: squadTargets, isCommander: false });
    });
    return interactions;
  };

  const uniqueTargetPlayerIds = [...new Set(targets.map(t => t.playerId).filter(Boolean))];
  const isInteractionMode = !isSquad && uniqueTargetPlayerIds.length > 1;
  const interactions      = isInteractionMode ? buildInteractions(targets) : [];
  const currentInteraction = isInteractionMode ? (interactions[interactionIndex] || null) : null;
  const currentInteractionRolls = isInteractionMode ? (interactionRolls[interactionIndex] || []) : [];
  const interactionDoneForCurrent = currentInteractionRolls.length >= numRolls;
  const interactionAllDone = isInteractionMode && interactionIndex >= interactions.length - 1 && interactionDoneForCurrent;

  const activeRolls       = isSquad ? currentMemberRolls : rolls;
  const allDoneForCurrent = isInteractionMode ? interactionDoneForCurrent : (activeRolls.length >= numRolls);
  const isLastMember      = isSquad ? squadRollIndex >= members.length - 1 : true;
  const allDone           = isInteractionMode ? interactionAllDone : (isSquad ? (allDoneForCurrent && isLastMember) : allDoneForCurrent);

  const squadRunningTotal  = memberRolls.reduce((sum, mr) => sum + mr.reduce((s, r) => s + r.dmg, 0), 0);
  const currentMemberTotal = currentMemberRolls.reduce((s, r) => s + r.dmg, 0);
  const interactionTotal   = [...interactionRolls, currentInteractionRolls].flat().reduce((s, r) => s + r.dmg, 0);
  const displayTotal       = isInteractionMode ? interactionTotal : (isSquad ? (squadRunningTotal + currentMemberTotal) : totalDamage);

  const addRoll = () => {
    const atk = parseInt(atkRoll) || 0;
    const def = parseInt(defRoll) || 0;
    const finalAtk = atk + attackBonus + activeAtkBonus + npcSelfAtkBuff - npcSelfAtkDebuff;

    // Auto-apply defenseBuff status effect from targeted player's commander
    // Reads from the first targeted player — consumed after first roll (duration: 1)
    const firstTargetPlayerId = targets.length > 0 ? targets[0].playerId : null;
    const firstTargetPlayer = firstTargetPlayerId ? players.find(p => String(p.id) === String(firstTargetPlayerId)) : null;
    const targetDefBuffVal = (firstTargetPlayer?.commanderStats?.statusEffects || [])
      .filter(ef => ef.type === 'defenseBuff')
      .reduce((s, ef) => s + (ef.value || 0), 0);

    const finalDef = def + activeDefBonus + targetDefBuffVal;
    const dmg = Math.max(0, finalAtk - finalDef);
    const roll = { atk, bonus: attackBonus + activeAtkBonus, atkDebuff: npcSelfAtkDebuff, atkBuff: npcSelfAtkBuff, finalAtk, def: finalDef, dmg };
    if (isInteractionMode) {
      setInteractionRolls(prev => {
        const next = [...prev];
        if (!next[interactionIndex]) next[interactionIndex] = [];
        next[interactionIndex] = [...next[interactionIndex], roll];
        return next;
      });
    } else if (isSquad) {
      setCurrentMemberRolls(prev => [...prev, roll]);
    } else {
      setRolls(prev => [...prev, roll]);
      setTotalDamage(prev => prev + dmg);
    }
    setAtkRoll(''); setDefRoll('');
    setActiveAtkBonus(0); setActiveDefBonus(0);

    // Consume defenseBuff status effect after it's been applied to this roll
    if (targetDefBuffVal > 0 && firstTargetPlayer) {
      const newEffects = (firstTargetPlayer.commanderStats.statusEffects || []).reduce((acc, ef) => {
        if (ef.type !== 'defenseBuff') { acc.push(ef); return acc; }
        const newDur = (ef.duration || 1) - 1;
        if (newDur > 0) acc.push({ ...ef, duration: newDur });
        return acc;
      }, []);
      onUpdatePlayer(firstTargetPlayer.id, { commanderStats: { ...firstTargetPlayer.commanderStats, statusEffects: newEffects } });
      onAddLog(`🛡️↑ ${firstTargetPlayer.playerName}'s +${targetDefBuffVal} defense buff consumed`, 'combat');
    }
  };

  const advanceToNextInteraction = () => {
    setInteractionIndex(prev => prev + 1);
    setAtkRoll(''); setDefRoll('');
    setActiveAtkBonus(0); setActiveDefBonus(0);
  };

  const advanceToNextMember = () => {
    setMemberRolls([...memberRolls, currentMemberRolls]);
    setCurrentMemberRolls([]);
    setSquadRollIndex(prev => prev + 1);
    setAtkRoll(''); setDefRoll('');
  };

  const toggleTarget = (playerId, unitType) => {
    const key = `${playerId}-${unitType}`;
    setTargets(prev => prev.find(t => `${t.playerId}-${t.unitType}` === key)
      ? prev.filter(t => `${t.playerId}-${t.unitType}` !== key)
      : [...prev, { playerId, unitType }]
    );
  };

  const handleProceed = () => {
    if (!allDone) { setErrorMsg('Complete all rolls first.'); return; }
    if (targets.length === 0) { setErrorMsg('Select at least one target.'); return; }

    if (isInteractionMode) {
      // Build per-player damage totals from all interactions
      const perPlayerDamage = {};
      const allInteractionRolls = [...interactionRolls];
      // include current interaction rolls if they exist
      if (currentInteractionRolls.length > 0 && !allInteractionRolls[interactionIndex]) {
        allInteractionRolls[interactionIndex] = currentInteractionRolls;
      }
      interactions.forEach((interaction, idx) => {
        const pid = interaction.playerId;
        const iRolls = allInteractionRolls[idx] || [];
        const dmg = iRolls.reduce((s, r) => s + r.dmg, 0);
        perPlayerDamage[pid] = (perPlayerDamage[pid] || 0) + dmg;
      });
      const finalTotal = Object.values(perPlayerDamage).reduce((s, d) => s + d, 0);
      const allRollsFlat = allInteractionRolls.flat();
      // Pre-seed distribution: each player's pool spread evenly across their targets
      const preSeedDist = {};
      targets.forEach(t => {
        const playerTotal = perPlayerDamage[t.playerId] || 0;
        const playerTargets = targets.filter(pt => pt.playerId === t.playerId);
        const perUnit = playerTargets.length > 0 ? Math.floor(playerTotal / playerTargets.length) : 0;
        preSeedDist[`${t.playerId}-${t.unitType}`] = perUnit;
      });
      onProceed({ ...npcAttackData, totalDamage: finalTotal, d20Rolls: allRollsFlat, targetSquadMembers: targets, perPlayerDamage, preSeedDistribution: preSeedDist });
      return;
    }

    let finalRolls, finalTotal;
    if (isSquad) {
      const allRolls = [...memberRolls, currentMemberRolls];
      finalRolls = allRolls.flat();
      finalTotal = finalRolls.reduce((s, r) => s + r.dmg, 0);
    } else { finalRolls = rolls; finalTotal = totalDamage; }
    onProceed({ ...npcAttackData, totalDamage: finalTotal, d20Rolls: finalRolls, targetSquadMembers: targets });
  };

  const inputStyle = { background: '#1a0f0a', color: colors.gold, padding: '0.75rem', borderRadius: '6px', border: '2px solid #5a4a3a', fontSize: '1.5rem', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold', width: '100%' };

  const DEFENDER_TYPES = ['defenseBonus','rerollDefense','forceAttackReroll','closecall','diceSwap'];
  const targetedPlayerIds = [...new Set(targets.map(t => t.playerId).filter(Boolean))];
  const itemPlayers = targetedPlayerIds.length > 0
    ? players.filter(p => targetedPlayerIds.includes(p.id))
    : selectedTargetPlayerId
      ? players.filter(p => p.id === selectedTargetPlayerId)
      : [];
  const allCalcItems = (() => {
    const raw = itemPlayers.flatMap(p =>
      (p.inventory || [])
        .filter(it => { const t = it.effect?.type; return DEFENDER_TYPES.includes(t); })
        .map(it => {
          const usesLeft = it.effect.uses === 0 ? Infinity : (it.effect.usesRemaining ?? it.effect.uses ?? 1);
          const unitName = it.heldBy === 'commander'
            ? (p.commanderStats?.customName || p.commander || 'Commander')
            : it.heldBy === 'special' ? (p.subUnits?.[0]?.name?.trim() || 'Special')
            : (p.subUnits?.[parseInt(it.heldBy?.replace('soldier',''))]?.name?.trim() || it.heldBy);
          return { ...it, usesLeft, playerName: p.playerName, unitName, owner: p };
        })
        .filter(it => it.usesLeft > 0)
    );
    // Deduplicate — same player + same item name + same effect type only shows once
    const seen = new Set();
    return raw.filter(it => {
      const key = `${it.owner?.id}-${it.name}-${it.effect?.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Shared consume helper — decrements uses, removes if consumed, returns live player or null
  const consumeFromInventory = (item) => {
    if (!item.owner?.id) return null;
    const livePlayer = players.find(p => p.id === item.owner.id);
    if (!livePlayer) return null;
    const liveItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!liveItem) return null;
    const newUsesRemaining = liveItem.effect.uses === 0 ? Infinity : ((liveItem.effect.usesRemaining ?? liveItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    onAddLog(`🎒 ${livePlayer.playerName}'s ${item.unitName} used "${item.name}"`);
    return livePlayer;
  };

  // Used by the dropdown list (no effect, just consume)
  const consumeNPCItem = (item) => { consumeFromInventory(item); setShowItemPanel(false); };

  // Reroll — clears the relevant input so DM re-enters
  const npcConsumeReroll = (item, clearFn) => {
    if (consumeFromInventory(item)) clearFn('');
  };

  // Bonus — adds to next roll then clears
  const npcConsumeBonus = (item, bonusType) => {
    if (!consumeFromInventory(item)) return;
    if (bonusType === 'attack') setActiveAtkBonus(prev => prev + (item.effect?.value || 0));
    else setActiveDefBonus(prev => prev + (item.effect?.value || 0));
  };

  // Dice swap — swaps current atkRoll ↔ defRoll
  const npcConsumeDiceSwap = (item) => {
    if (!consumeFromInventory(item)) return;
    const tmp = atkRoll; setAtkRoll(defRoll); setDefRoll(tmp);
  };

  // Close call — shows overlay and closes calculator
  const npcConsumeClosecall = (item) => {
    const owner = consumeFromInventory(item);
    if (!owner) return;
    setClosecallOwner(owner);
    setShowClosecall(true);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '1.5rem', maxWidth: '720px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 0 1px rgba(201,169,97,0.1), 0 24px 64px rgba(0,0,0,0.95)' }}>

        {/* Title */}
        <h3 style={{ color: colors.gold, fontSize: '1.4rem', marginBottom: '0.75rem', textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', textShadow: '2px 2px 4px rgba(0,0,0,1)' }}>
          {isSquad ? '⚔️ NPC Squad Attack' : '👾 NPC Attack'}
        </h3>

        {/* Attacker info bar — mirrors PvP "Attacker:" line */}
        <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.875rem' }}>
          <span style={{ color: colors.textMuted, fontWeight: '700' }}>Attacker: </span>
          <span style={{ color: '#fca5a5', fontWeight: '800' }}>{npcName}</span>
          {attack?.name && <span style={{ color: colors.textMuted }}> — {attack.name}</span>}
          <span style={{ color: colors.textMuted, marginLeft: '0.5rem' }}>({dieType.toUpperCase()} × {numRolls}</span>
          {attackBonus > 0 && <span style={{ color: '#fbbf24', marginLeft: '0.25rem' }}>+{attackBonus} bonus</span>}
          <span style={{ color: colors.textMuted }}>)</span>
          {!isSquad && numRolls > 1 && <span style={{ color: '#a78bfa', marginLeft: '0.5rem', fontSize: '0.78rem' }}>Roll {Math.min(activeRolls.length + 1, numRolls)}/{numRolls}</span>}
        </div>

        {/* Squad progress */}
        {isSquad && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem' }}>
              {members.map((m, i) => (
                <div key={m.npcId} style={{ flex: 1, padding: '0.3rem 0.4rem', borderRadius: '6px', textAlign: 'center', background: i < squadRollIndex ? 'rgba(74,222,128,0.12)' : i === squadRollIndex ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${i < squadRollIndex ? 'rgba(74,222,128,0.4)' : i === squadRollIndex ? 'rgba(239,68,68,0.4)' : 'rgba(90,74,58,0.3)'}` }}>
                  <div style={{ color: i < squadRollIndex ? '#4ade80' : i === squadRollIndex ? '#fca5a5' : colors.textFaint, fontSize: '0.62rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i < squadRollIndex ? '✓ ' : i === squadRollIndex ? '▶ ' : ''}{m.npcName}
                  </div>
                  <div style={{ color: i === squadRollIndex ? '#f87171' : colors.textFaint, fontSize: '0.58rem' }}>{m.attack?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use Item panel */}
        {allCalcItems.filter(it => !['closecall','diceSwap'].includes(it.effect?.type)).length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <button onClick={() => setShowItemPanel(s => !s)} style={{ width: '100%', padding: '0.45rem', background: showItemPanel ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${showItemPanel ? 'rgba(99,102,241,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: showItemPanel ? '6px 6px 0 0' : '6px', color: showItemPanel ? '#a5b4fc' : colors.textMuted, fontFamily: fonts.body, fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer' }}>
              🎒 Use Item ({allCalcItems.filter(it => !['closecall','diceSwap'].includes(it.effect?.type)).length} available) {showItemPanel ? '▲' : '▼'}
            </button>
            {showItemPanel && (
              <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(99,102,241,0.3)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.5rem' }}>
                {allCalcItems.filter(it => !['closecall','diceSwap'].includes(it.effect?.type)).map((item, idx) => {
                  const tc = ({ Common: colors.textSecondary, Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || colors.textSecondary);
                  const typeLabel = { attackBonus: `⚔️ +${item.effect?.value} Atk Bonus`, defenseBonus: `🛡️ +${item.effect?.value} Def Bonus`, rerollAttack: '⟳ Reroll Attack', rerollDefense: '⟳ Reroll Defense', forceAttackReroll: '⚡ Force NPC Reroll', forceDefenseReroll: '⚡ Force Defender Reroll', diceSwap: '⇅ Swap Dice', closecall: '🛡️ Close Call' }[item.effect?.type] || item.effect?.type;
                  return (
                    <div key={idx} onClick={() => consumeNPCItem(item)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', marginBottom: '0.2rem', background: `${tc}10`, border: `1px solid ${tc}30`, borderRadius: '6px', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: tc, fontWeight: '800', fontSize: '0.78rem' }}>{item.name}</div>
                        <div style={{ color: colors.textMuted, fontSize: '0.62rem' }}>{item.playerName} · {item.unitName} · {typeLabel}</div>
                      </div>
                      <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{item.usesLeft === Infinity ? '∞' : item.usesLeft}✕</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Target selector — collapsible per player */}
        <div style={{ marginBottom: '1rem', background: '#0a0503', padding: '0.85rem', borderRadius: '8px', border: '1px solid #5a4a3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ color: colors.gold, fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.05em' }}>Select Targets:</div>
            {targets.length > 0 && (
              <div style={{ color: '#a78bfa', fontSize: '0.68rem', fontWeight: '700' }}>{targets.length} unit{targets.length !== 1 ? 's' : ''} selected</div>
            )}
          </div>
          {players.map(player => {
            const liveUnits = [
              player.commanderStats.hp > 0 ? { unitType: 'commander', name: player.commanderStats.customName || player.commander, hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, icon: '⚔️', color: colors.gold } : null,
              ...(player.subUnits || []).map((unit, idx) => {
                if (unit.hp === 0 || unit.revivedOnPlayerId) return null;
                const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                return { unitType, name: unit.name || (idx === 0 ? 'Special' : `Soldier ${idx}`), hp: unit.hp, maxHp: unit.maxHp, icon: idx === 0 ? '⭐' : '🛡️', color: '#c4b5fd' };
              }),
            ].filter(Boolean);
            if (liveUnits.length === 0) return null;
            const isExpanded = !!expandedPlayers[player.id];
            const selectedCount = targets.filter(t => t.playerId === player.id).length;
            return (
              <div key={player.id} style={{ marginBottom: '0.4rem' }}>
                {/* Player row — clickable to expand/collapse */}
                <div
                  onClick={() => setExpandedPlayers(prev => ({ ...prev, [player.id]: !prev[player.id] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: selectedCount > 0 ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selectedCount > 0 ? 'rgba(201,169,97,0.35)' : 'rgba(90,74,58,0.3)'}`,
                    borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ color: colors.textMuted, fontSize: '0.7rem', fontWeight: '900', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ color: selectedCount > 0 ? colors.gold : colors.textSecondary, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{player.playerName}</span>
                  {selectedCount > 0 && (
                    <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '20px', padding: '0.1rem 0.45rem' }}>
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                {/* Units — shown when expanded */}
                {isExpanded && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(90,74,58,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {liveUnits.map(unit => {
                      const isSel = !!targets.find(t => t.playerId === player.id && t.unitType === unit.unitType);
                      return (
                        <div key={unit.unitType} onClick={() => toggleTarget(player.id, unit.unitType)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', background: isSel ? `${unit.color}15` : 'rgba(0,0,0,0.3)', border: `2px solid ${isSel ? unit.color : 'rgba(90,74,58,0.3)'}`, borderRadius: '6px', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, border: `2px solid ${isSel ? unit.color : '#5a4a3a'}`, background: isSel ? unit.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{isSel ? '✓' : ''}</div>
                          <span style={{ color: isSel ? unit.color : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{unit.icon} {unit.name}</span>
                          <span style={{ color: colors.textMuted, fontSize: '0.68rem' }}>{unit.hp}/{unit.maxHp}hp</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Interaction mode: progress strip ── */}
        {isInteractionMode && (
          <div style={{ marginBottom: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
            <div style={{ color: '#a78bfa', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              ⚔️ {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} · {dieType.toUpperCase()} × {numRolls} each
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {interactions.map((interaction, idx) => {
                const p = players.find(pl => String(pl.id) === String(interaction.playerId));
                const iRolls = interactionRolls[idx] || [];
                const done   = iRolls.length >= numRolls;
                const isCurr = idx === interactionIndex && !interactionAllDone;
                const dmgTotal = iRolls.reduce((s, r) => s + r.dmg, 0);
                const label = interaction.isCommander ? `${p?.playerName} — Commander` : `${p?.playerName} — Squad (${interaction.targets.length} unit${interaction.targets.length !== 1 ? 's' : ''})`;
                return (
                  <div key={idx} style={{
                    padding: '0.25rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: done ? 'rgba(34,197,94,0.08)' : isCurr ? 'rgba(167,139,250,0.12)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : isCurr ? 'rgba(167,139,250,0.4)' : 'rgba(90,74,58,0.2)'}`,
                  }}>
                    <span style={{ color: done ? '#4ade80' : isCurr ? '#c4b5fd' : colors.textFaint, fontSize: '0.6rem', fontWeight: '900', minWidth: '0.8rem' }}>
                      {done ? '✓' : isCurr ? '▶' : `${idx + 1}`}
                    </span>
                    <span style={{ color: done ? '#86efac' : isCurr ? '#e9d5ff' : colors.textMuted, fontSize: '0.65rem', fontWeight: '800', flex: 1 }}>{label}</span>
                    {done && <span style={{ color: '#86efac', fontSize: '0.62rem', fontWeight: '700' }}>{dmgTotal}hp</span>}
                    {!done && isCurr && <span style={{ color: '#a78bfa', fontSize: '0.6rem' }}>Roll {(interactionRolls[idx] || []).length + 1}/{numRolls}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VS header + side pills + roll inputs */}
        {!allDoneForCurrent && (
          <div style={{ background: '#0a0503', padding: '1rem', borderRadius: '8px', border: `2px solid ${isInteractionMode ? '#a78bfa' : colors.gold}`, marginBottom: '1rem' }}>

            {/* Interaction mode label */}
            {isInteractionMode && currentInteraction && (() => {
              const p = players.find(pl => String(pl.id) === String(currentInteraction.playerId));
              const label = currentInteraction.isCommander
                ? `${p?.playerName || ''} — Commander`
                : `${p?.playerName || ''} — Squad (${currentInteraction.targets.length} unit${currentInteraction.targets.length !== 1 ? 's' : ''})`;
              return (
                <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ color: p?.playerColor || '#a78bfa', fontWeight: '900', fontSize: '0.85rem', fontFamily: '"Cinzel",Georgia,serif' }}>
                    {label}
                  </span>
                  <span style={{ color: colors.textFaint, fontSize: '0.68rem', marginLeft: '0.4rem' }}>
                    · Roll {currentInteractionRolls.length + 1} of {numRolls}
                  </span>
                </div>
              );
            })()}

            {/* VS matchup row — mirrors PvP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Attacker</div>
                <div style={{ color: '#fca5a5', fontSize: '1.4rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif' }}>
                  {dieType.toUpperCase()}
                  {attackBonus > 0 && <span style={{ color: '#fbbf24', fontSize: '0.8rem', marginLeft: '0.25rem' }}>+{attackBonus}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                  {isInteractionMode ? `Roll ${currentInteractionRolls.length + 1} of ${numRolls}` : isSquad ? `Roll ${Math.min(activeRolls.length + 1, numRolls)} of ${numRolls}` : numRolls > 1 ? `Roll ${Math.min(activeRolls.length + 1, numRolls)} of ${numRolls}` : 'Roll 1 of 1'}
                </div>
                <div style={{ color: '#5a4a3a', fontSize: '1.6rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif', lineHeight: 1 }}>VS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Defender</div>
                <div style={{ color: '#86efac', fontSize: '1.4rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif' }}>D10</div>
              </div>
            </div>

            {/* Two-column inputs — pills sit below each input */}
            {(() => {
              const pillAction = (it) => {
                const t = it.effect?.type;
                if (t === 'rerollAttack')       return () => npcConsumeReroll(it, setAtkRoll);
                if (t === 'forceDefenseReroll') return () => npcConsumeReroll(it, setDefRoll);
                if (t === 'rerollDefense')      return () => npcConsumeReroll(it, setDefRoll);
                if (t === 'forceAttackReroll')  return () => npcConsumeReroll(it, setAtkRoll);
                if (t === 'attackBonus')        return () => npcConsumeBonus(it, 'attack');
                if (t === 'defenseBonus')       return () => npcConsumeBonus(it, 'defense');
                if (t === 'diceSwap')           return () => npcConsumeDiceSwap(it);
                if (t === 'closecall')          return () => npcConsumeClosecall(it);
                return () => consumeNPCItem(it);
              };
              const pill = (item, label, color) => (
                <button key={item.id} onClick={pillAction(item)}
                  style={{ padding: '0.18rem 0.55rem', background: 'rgba(0,0,0,0.35)', border: `1px solid ${color}55`, borderRadius: '20px', cursor: 'pointer', color, fontFamily: fonts.body, fontWeight: '800', fontSize: '0.62rem' }}>
                  {label} <span style={{ color: colors.textFaint, fontSize: '0.55rem' }}>{item.playerName} · {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕</span>
                </button>
              );
              const atkItems = allCalcItems.filter(it => ['rerollAttack','attackBonus','forceAttackReroll'].includes(it.effect?.type));
              const defItems = allCalcItems.filter(it => ['rerollDefense','defenseBonus','forceDefenseReroll','closecall','diceSwap'].includes(it.effect?.type));
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  {/* Attacker column */}
                  <div>
                    <label style={{ color: '#fca5a5', fontSize: '0.72rem', fontWeight: '800', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Attacker Roll ({dieType.toUpperCase()})
                    </label>
                    <input type='number' min='1' max={dieMax} value={atkRoll} onChange={e => setAtkRoll(e.target.value)} placeholder={`1–${dieMax}`} style={{ ...inputStyle, border: '2px solid rgba(239,68,68,0.5)', marginBottom: '0.4rem' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {activeAtkBonus > 0 && <span style={{ padding: '0.18rem 0.5rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '20px', color: '#86efac', fontSize: '0.62rem', fontWeight: '800' }}>⚔️ +{activeAtkBonus} active</span>}
                      {atkItems.map(it => {
                        const t = it.effect?.type;
                        const lbl = t === 'attackBonus' ? `⚔️ +${it.effect?.value} Atk` : t === 'rerollAttack' ? '⟳ Reroll Atk' : '⚡ Force NPC Reroll';
                        return pill(it, lbl, '#fca5a5');
                      })}
                    </div>
                  </div>
                  {/* Defender column */}
                  <div>
                    <label style={{ color: '#86efac', fontSize: '0.72rem', fontWeight: '800', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Defender Roll (D10)
                    </label>
                    <input type='number' min='1' max='20' value={defRoll} onChange={e => setDefRoll(e.target.value)} placeholder='Roll...' style={{ ...inputStyle, border: '2px solid rgba(34,197,94,0.5)', marginBottom: '0.4rem' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {activeDefBonus > 0 && <span style={{ padding: '0.18rem 0.5rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '20px', color: '#93c5fd', fontSize: '0.62rem', fontWeight: '800' }}>🛡️ +{activeDefBonus} active</span>}
                      {defItems.map(it => {
                        const t = it.effect?.type;
                        const lbl = t === 'defenseBonus' ? `🛡️ +${it.effect?.value} Def` : t === 'rerollDefense' ? '⟳ Reroll Def' : t === 'forceDefenseReroll' ? '⚡ Force Def Reroll' : t === 'closecall' ? '🛡️ Close Call' : '⇅ Swap Dice';
                        return pill(it, lbl, '#86efac');
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
            <button onClick={addRoll} disabled={!atkRoll || !defRoll} style={{ width: '100%', padding: '0.75rem', background: (atkRoll && defRoll) ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(0,0,0,0.3)', color: (atkRoll && defRoll) ? '#e9d5ff' : colors.textDisabled, border: `2px solid ${(atkRoll && defRoll) ? '#a78bfa' : '#1f2937'}`, borderRadius: '8px', cursor: (atkRoll && defRoll) ? 'pointer' : 'not-allowed', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              + Add Roll
            </button>
          </div>
        )}

        {/* Interaction mode: Next button — shows after current interaction's rolls are done */}
        {isInteractionMode && interactionDoneForCurrent && interactionIndex < interactions.length - 1 && (
          <button onClick={advanceToNextInteraction} style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem', background: 'linear-gradient(135deg,rgba(167,139,250,0.25),rgba(139,92,246,0.25))', border: '2px solid #a78bfa', borderRadius: '8px', color: '#e9d5ff', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ▶ Next →
          </button>
        )}

        {/* NPC self attack debuff/buff badges */}
        {(npcSelfAtkDebuff > 0 || npcSelfAtkBuff > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
            {npcSelfAtkBuff > 0 && <span style={{ padding: '0.35rem 0.8rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)', borderRadius: '6px', color: '#4ade80', fontSize: '0.72rem', fontWeight: '800' }}>⚔️↑ +{npcSelfAtkBuff} NPC Atk Buff</span>}
            {npcSelfAtkDebuff > 0 && <span style={{ padding: '0.35rem 0.8rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '6px', color: '#f87171', fontSize: '0.72rem', fontWeight: '800' }}>⚔️↓ -{npcSelfAtkDebuff} NPC Atk Debuff</span>}
          </div>
        )}


        {/* Roll history — interaction mode shows completed interactions + live current; standard shows activeRolls */}
        {isInteractionMode ? (
          <>
            {interactionRolls.map((iRolls, idx) => {
              if (!iRolls || !iRolls.length) return null;
              const interaction = interactions[idx];
              if (!interaction) return null;
              const p = players.find(pl => String(pl.id) === String(interaction.playerId));
              const label = interaction.isCommander ? `${p?.playerName} — Commander` : `${p?.playerName} — Squad`;
              const dmgTotal = iRolls.reduce((s, r) => s + r.dmg, 0);
              return (
                <div key={idx} style={{ background: 'rgba(74,222,128,0.06)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.2)', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: iRolls.length > 0 ? '0.3rem' : 0 }}>
                    <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: '800' }}>✓ {label}</span>
                    <span style={{ color: '#86efac', fontSize: '0.65rem', fontWeight: '700' }}>{dmgTotal}hp</span>
                  </div>
                  {iRolls.map((r, i) => {
                    const hit = r.dmg > 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.2rem 0', borderTop: '1px solid rgba(90,74,58,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '0.78rem' }}>⚔️ {r.atk}{r.bonus > 0 && <span style={{ color: '#fbbf24' }}>+{r.bonus}</span>}</span>
                          <span style={{ color: colors.textFaint, fontSize: '0.68rem' }}>vs</span>
                          <span style={{ color: '#86efac', fontWeight: '700', fontSize: '0.78rem' }}>🛡️ {r.def}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: hit ? '#fbbf24' : '#4ade80', fontSize: '0.6rem', fontWeight: '700' }}>{hit ? '💥 HIT' : '🛡️ BLOCKED'}</span>
                          <span style={{ color: hit ? '#fecaca' : '#4ade80', fontWeight: '900', fontSize: '0.85rem', fontFamily: '"Cinzel",Georgia,serif', minWidth: '40px', textAlign: 'right' }}>{hit ? `${r.dmg}hp` : '0hp'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {currentInteractionRolls.length > 0 && !interactionAllDone && (() => {
              const p = players.find(pl => String(pl.id) === String(currentInteraction?.playerId));
              const label = currentInteraction?.isCommander ? `${p?.playerName} — Commander` : `${p?.playerName} — Squad`;
              return (
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.3)', marginBottom: '0.75rem' }}>
                  <div style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{label}</div>
                  {currentInteractionRolls.map((r, i) => {
                    const hit = r.dmg > 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: i < currentInteractionRolls.length - 1 ? '1px solid rgba(90,74,58,0.2)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '0.82rem' }}>⚔️ {r.atk}{r.bonus > 0 && <span style={{ color: '#fbbf24' }}>+{r.bonus}</span>}</span>
                          <span style={{ color: colors.textFaint, fontSize: '0.72rem' }}>vs</span>
                          <span style={{ color: '#86efac', fontWeight: '700', fontSize: '0.82rem' }}>🛡️ {r.def}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: hit ? '#fbbf24' : '#4ade80', fontSize: '0.65rem', fontWeight: '700' }}>{hit ? '💥 HIT' : '🛡️ BLOCKED'}</span>
                          <span style={{ color: hit ? '#fecaca' : '#4ade80', fontWeight: '900', fontSize: '0.9rem', fontFamily: '"Cinzel",Georgia,serif', minWidth: '48px', textAlign: 'right' }}>{hit ? `${r.dmg}hp` : '0hp'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        ) : activeRolls.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(90,74,58,0.4)', marginBottom: '0.75rem' }}>
            {isSquad && <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{npcName}</div>}
            {activeRolls.map((r, i) => {
              const hit = r.dmg > 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: i < activeRolls.length - 1 ? '1px solid rgba(90,74,58,0.2)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '0.82rem' }}>⚔️ {r.atk}{r.bonus > 0 && <span style={{ color: '#fbbf24' }}>+{r.bonus}</span>}{r.atkBuff > 0 && <span style={{ color: '#4ade80' }}>+{r.atkBuff}</span>}{r.atkDebuff > 0 && <span style={{ color: '#f87171' }}>-{r.atkDebuff}</span>}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.72rem' }}>vs</span>
                    <span style={{ color: '#86efac', fontWeight: '700', fontSize: '0.82rem' }}>🛡️ {r.def}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: hit ? '#fbbf24' : '#4ade80', fontSize: '0.65rem', fontWeight: '700' }}>{hit ? '💥 HIT' : '🛡️ BLOCKED'}</span>
                    <span style={{ color: hit ? '#fecaca' : '#4ade80', fontWeight: '900', fontSize: '0.9rem', fontFamily: '"Cinzel",Georgia,serif', minWidth: '48px', textAlign: 'right' }}>{hit ? `${r.dmg}hp` : '0hp'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Previous squad members */}
        {isSquad && memberRolls.some(mr => mr.length > 0) && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {memberRolls.map((mr, mi) => mr.length > 0 && (
              <div key={mi} style={{ background: 'rgba(74,222,128,0.06)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: '800' }}>✓ {members[mi]?.npcName}</span>
                <span style={{ color: '#86efac', fontSize: '0.72rem', fontWeight: '700' }}>{mr.reduce((s, r) => s + r.dmg, 0)}hp</span>
              </div>
            ))}
          </div>
        )}

        {/* Advance squad */}
        {isSquad && allDoneForCurrent && !isLastMember && (
          <button onClick={advanceToNextMember} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', border: '2px solid #3b82f6', color: '#dbeafe', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ➡️ Next: {members[squadRollIndex + 1]?.npcName} — {members[squadRollIndex + 1]?.attack?.name}
          </button>
        )}

        {/* Total damage */}
        <div style={{ background: '#0a0503', border: `2px solid ${colors.gold}`, borderRadius: '8px', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: displayTotal > 0 ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)' : 'none' }} />
          <div style={{ color: colors.textMuted, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Damage</div>
          <div style={{ color: displayTotal > 0 ? '#fecaca' : '#4ade80', fontSize: '2.75rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif', lineHeight: 1 }}>{displayTotal}</div>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.2rem' }}>hit points</div>
        </div>

        {/* Close Call epic modal — matches PvP */}
        {showClosecall && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(ellipse at center, rgba(15,5,2,0.97) 0%, rgba(0,0,0,0.99) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '380px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '0.75rem', lineHeight: 1 }}>🛡️</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0.15em', fontFamily: '"Cinzel", Georgia, serif', background: 'linear-gradient(135deg, #fca5a5, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                CLOSE CALL
              </div>
              <div style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: '700', marginBottom: '0.35rem', letterSpacing: '0.08em' }}>
                {closecallOwner?.playerName || 'The Defender'} activated
              </div>
              <div style={{ color: colors.textMuted, fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                The attack is completely negated.<br/>No damage. No effect. It never happened.
              </div>
              <div style={{ display: 'inline-block', padding: '0.4rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.1em', marginBottom: '2rem' }}>
                DAMAGE NEGATED
              </div>
              <br/>
              <button onClick={() => { setShowClosecall(false); onClose(); }} style={{ padding: '0.75rem 2.5rem', background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: '2px solid #ef4444', borderRadius: '10px', color: '#fecaca', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
                ✕ Close
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '7px', marginBottom: '0.75rem', color: '#fca5a5', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Proceed / Cancel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleProceed} disabled={!allDone || targets.length === 0} style={{ flex: 1, padding: '0.85rem', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.95rem', borderRadius: '8px', cursor: (allDone && targets.length > 0) ? 'pointer' : 'not-allowed', background: (allDone && targets.length > 0) ? 'linear-gradient(135deg,#15803d,#14532d)' : 'rgba(0,0,0,0.3)', color: (allDone && targets.length > 0) ? '#d1fae5' : colors.textDisabled, border: `2px solid ${(allDone && targets.length > 0) ? '#16a34a' : '#1f2937'}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Proceed</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', background: 'linear-gradient(135deg,#7f1d1d,#5f1a1a)', color: '#fecaca', border: '2px solid #991b1b', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default NPCCalculator;
