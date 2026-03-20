import React, { useState } from 'react';
import { getUnitStats, getUnitName } from '../utils/statsUtils';

const CalculatorD20 = ({ 
  data, 
  players,
  npcs = [],
  onClose: onCloseRaw,
  onProceedToDistribution,
  onEndTurn = null,
  gameMode = 'd20',
  firstStrike = false,
  onUpdatePlayer = () => {},
  onAddLog = () => {},
}) => {
  const [calculatorData, setCalculatorData] = React.useState({ targetNPCId: null, targetNPCIds: [], ...data });
  const [attackRolls, setAttackRolls] = useState([]);
  const [currentAttackIndex, setCurrentAttackIndex] = useState(0);
  const [attackerRoll, setAttackerRoll] = useState('');
  const [defenderRoll, setDefenderRoll] = useState('');
  const [totalDamage, setTotalDamage] = useState(0);
  const [showBonusPrompt, setShowBonusPrompt] = useState(null);
  const [activeAttackBonus, setActiveAttackBonus] = useState(0);
  const [activeDefenseBonus, setActiveDefenseBonus] = useState(0);
  const [bonusPromptShown, setBonusPromptShown] = useState(false);
  const [consumedItems, setConsumedItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showClosecall, setShowClosecall] = useState(false);
  const [closecallOwner, setClosecallOwner] = useState(null);
  const [expandedPlayers, setExpandedPlayers] = useState({});

  // Refund all consumed items then close
  const onClose = () => {
    consumedItems.forEach(({ owner, originalItem }) => {
      const currentPlayer = players.find(p => p.id === owner.id);
      if (!currentPlayer) return;
      const alreadyHas = (currentPlayer.inventory || []).find(it => it.id === originalItem.id);
      if (alreadyHas) {
        // Item still there — restore uses
        onUpdatePlayer(owner.id, { inventory: (currentPlayer.inventory || []).map(it => it.id === originalItem.id ? originalItem : it) });
      } else {
        // Item was fully consumed — re-add it
        onUpdatePlayer(owner.id, { inventory: [...(currentPlayer.inventory || []), originalItem] });
      }
    });
    onCloseRaw();
  };

  if (!calculatorData) return null;

  const attacker = players.find(p => p.id === calculatorData.attackerId);
  if (!attacker) return null;

  const gold = '#c9a961';

  // Defender player (PvP only — NPC targets have no inventory)
  // targetId is { playerId, unitType } — extract playerId
  // Fall back to first targetSquadMembers player if targetId not set
  const defenderPlayerId = calculatorData.targetId?.playerId
    ?? calculatorData.targetId
    ?? calculatorData.targetSquadMembers?.[0]?.playerId
    ?? null;
  const defender = defenderPlayerId ? players.find(p => p.id === defenderPlayerId) : null;

  // Helper: scan a player's full inventory for a given effect type
  const scanInventory = (player, effectType) => {
    if (!player) return [];
    return (player.inventory || []).filter(item => {
      if (item.effect?.type !== effectType) return false;
      const usesLeft = item.effect.uses === 0 ? Infinity : (item.effect.usesRemaining ?? item.effect.uses ?? 1);
      return usesLeft > 0;
    }).map(item => ({
      ...item,
      usesLeft: item.effect.uses === 0 ? Infinity : (item.effect.usesRemaining ?? item.effect.uses ?? 1),
    }));
  };

  // Attacker side — attacker's own reroll OR defender forcing attacker reroll
  const attackerRerollItems  = scanInventory(attacker, 'rerollAttack');      // attacker uses own item
  const forceAttackRerollItems = scanInventory(defender, 'forceAttackReroll'); // defender forces attacker reroll

  // Defender side — defender's own reroll OR attacker forcing defender reroll
  const defenderRerollItems    = scanInventory(defender, 'rerollDefense');      // defender uses own item
  const forceDefenseRerollItems = scanInventory(attacker, 'forceDefenseReroll'); // attacker forces defender reroll

  // Dice swap — either player can hold this; only usable when both rolls are entered
  const attackerSwapItems = scanInventory(attacker, 'diceSwap');
  const defenderSwapItems = scanInventory(defender, 'diceSwap');
  const allSwapItems = [
    ...attackerSwapItems.map(it => ({ ...it, owner: attacker, ownerLabel: 'Attacker' })),
    ...defenderSwapItems.map(it => ({ ...it, owner: defender, ownerLabel: 'Defender' })),
  ];

  // Attack/Defense bonus items — usable directly from inside the calculator
  const attackBonusItems  = scanInventory(attacker, 'attackBonus');
  const defenseBonusItems = scanInventory(defender, 'defenseBonus');

  // Close Call — scan defender + any targeted squad members for closecall items
  const allTargetedPlayers = (() => {
    const found = new Map();
    if (defender) found.set(defender.id, defender);
    (calculatorData.targetSquadMembers || []).forEach(t => {
      if (!t.isNPC && t.playerId) {
        const p = players.find(pl => pl.id === t.playerId);
        if (p) found.set(p.id, p);
      }
    });
    return [...found.values()];
  })();
  const closecallItems = allTargetedPlayers.flatMap(p =>
    scanInventory(p, 'closecall').map(it => ({ ...it, closecallOwner: p }))
  );

  // Get the attacking unit's pending bonuses
  const attackingUnit = calculatorData.attackingUnitType === 'commander'
    ? null
    : (() => {
        const idx = calculatorData.attackingUnitType === 'special' ? 0 : parseInt(calculatorData.attackingUnitType.replace('soldier', ''));
        return attacker.subUnits?.[idx];
      })();
  const pendingAttackBonus = (attackingUnit?.pendingAttackBonus || 0) + (attacker.commanderStats?.pendingAttackBonus || 0);
  const pendingDefenseBonus = attackingUnit?.pendingDefenseBonus || attacker.commanderStats?.pendingDefenseBonus || 0;

  // Show prompt once when first roll is about to happen
  React.useEffect(() => {
    if (bonusPromptShown || attackRolls.length > 0) return;
    if (pendingAttackBonus > 0) {
      setShowBonusPrompt({ type: 'attack', value: pendingAttackBonus });
      setBonusPromptShown(true);
    } else if (pendingDefenseBonus > 0) {
      setShowBonusPrompt({ type: 'defense', value: pendingDefenseBonus });
      setBonusPromptShown(true);
    }
  }, [bonusPromptShown, attackRolls.length, pendingAttackBonus, pendingDefenseBonus]);

  // Determine dice types based on attacker and defender
  //
  // NPC:                attacker mirrors their own type (cmd=D20, soldier=D10)
  // Cmd vs Cmd:         D20 v D20
  // Cmd vs Solo Soldier:D10 v D10
  // Cmd vs Squad:       D20 v D20
  // Soldier vs anything:D10 v D10

  const getAttackerDiceType = () => {
    // NPC target — follows attacker unit type
    if (calculatorData.targetNPCId) {
      return calculatorData.attackingUnitType === 'commander' ? 'D20' : 'D10';
    }

    if (calculatorData.attackingUnitType === 'commander') {
      const targetIsCommander =
        calculatorData.targetId?.unitType === 'commander' ||
        calculatorData.targetSquadMembers?.some(t => t.unitType === 'commander');
      if (targetIsCommander) return 'D20'; // Cmd vs Cmd

      const isTargetingSquad =
        calculatorData.targetIsSquad ||
        (calculatorData.targetSquadMembers && calculatorData.targetSquadMembers.length > 1);
      if (isTargetingSquad) return 'D20'; // Cmd vs Squad

      return 'D10'; // Cmd vs Solo Soldier
    }

    return 'D10'; // Soldiers always D10
  };

  const getDefenderDiceType = () => {
    // NPC target — mirrors attacker
    if (calculatorData.targetNPCId) {
      return calculatorData.attackingUnitType === 'commander' ? 'D20' : 'D10';
    }

    if (calculatorData.attackingUnitType === 'commander') {
      const targetIsCommander =
        calculatorData.targetId?.unitType === 'commander' ||
        calculatorData.targetSquadMembers?.some(t => t.unitType === 'commander');
      if (targetIsCommander) return 'D20'; // Cmd vs Cmd

      const isTargetingSquad =
        calculatorData.targetIsSquad ||
        (calculatorData.targetSquadMembers && calculatorData.targetSquadMembers.length > 1);
      if (isTargetingSquad) return 'D20'; // Cmd vs Squad

      return 'D10'; // Cmd vs Solo Soldier
    }

    return 'D10'; // Soldier vs anything → D10
  };

  // Check if attacker is special unit (gets +1)
  const isAttackerSpecial = () => {
    return calculatorData.attackingUnitType === 'special';
  };

  // Get number of attacks
  const getNumAttacks = () => {
    if (calculatorData.attackerIsSquad) {
      // For squad attacks, each member gets their attacksPerHit
      let totalAttacks = 0;
      
      // Count initiating unit's attacks
      const initiatorStats = getUnitStats(attacker, calculatorData.attackingUnitType);
      totalAttacks += initiatorStats?.attacksPerHit || 1;
      
      // Count each squad member's attacks
      calculatorData.attackerSquadMembers?.forEach(memberType => {
        const memberStats = getUnitStats(attacker, memberType);
        totalAttacks += memberStats?.attacksPerHit || 1;
      });
      
      return totalAttacks;
    }
    
    // Solo unit - use their attacksPerHit (2 for Uncivilized)
    const attackerStats = getUnitStats(attacker, calculatorData.attackingUnitType);
    return attackerStats?.attacksPerHit || 1;
  };

  const numAttacks = getNumAttacks();
  const attackerDice = getAttackerDiceType();
  const defenderDice = getDefenderDiceType();

  // Calculate damage for current roll
  const calculateRollDamage = () => {
    const atkRoll = parseInt(attackerRoll) || 0;
    const defRoll = parseInt(defenderRoll) || 0;
    
    // Apply +1 bonus logic:
    // - Commander using special action: EVERY roll gets +1
    // - Solo special soldier attacking: gets +1
    // - Squad with special soldier: ONLY first roll gets +1
    let isSpecialBonus = false;
    
    if (calculatorData.attackingUnitType === 'commander' && calculatorData.action === 'special') {
      // Commander special: always +1
      isSpecialBonus = true;
    } else if (!calculatorData.attackerIsSquad) {
      // Solo attack: special unit gets +1
      isSpecialBonus = isAttackerSpecial();
    } else if (calculatorData.attackerIsSquad) {
      // Squad attack: only first roll gets +1 if squad has special soldier
      const isFirstRoll = currentAttackIndex === 0;
      const hasSpecialInSquad = 
        calculatorData.attackingUnitType === 'special' || 
        calculatorData.attackerSquadMembers?.includes('special');
      isSpecialBonus = isFirstRoll && hasSpecialInSquad;
    }
    
    const baseRoll = isSpecialBonus ? atkRoll + 1 : atkRoll;
    const finalAtkRoll = (firstStrike ? baseRoll + 2 : baseRoll) + activeAttackBonus;

    // Apply NPC armor floor to defense roll
    const firstNPCId = (calculatorData.targetNPCIds?.[0]) || calculatorData.targetNPCId;
    const targetNPC = firstNPCId ? npcs.find(n => n.id === firstNPCId) : null;
    const effectiveDefRoll = targetNPC
      ? Math.max(defRoll, targetNPC.armor || 0)
      : defRoll;

    // Defender must roll >= attacker to block
    if (effectiveDefRoll >= finalAtkRoll) return 0;
    return finalAtkRoll - effectiveDefRoll;
  };

  const handleAddRoll = () => {
    const damage = calculateRollDamage();
    
    // Check if this roll gets special bonus (same logic as calculateRollDamage)
    let isSpecialBonus = false;
    
    if (calculatorData.attackingUnitType === 'commander' && calculatorData.action === 'special') {
      isSpecialBonus = true;
    } else if (!calculatorData.attackerIsSquad) {
      isSpecialBonus = isAttackerSpecial();
    } else if (calculatorData.attackerIsSquad) {
      const isFirstRoll = currentAttackIndex === 0;
      const hasSpecialInSquad = 
        calculatorData.attackingUnitType === 'special' || 
        calculatorData.attackerSquadMembers?.includes('special');
      isSpecialBonus = isFirstRoll && hasSpecialInSquad;
    }
    
    const firstNPCId2 = (calculatorData.targetNPCIds?.[0]) || calculatorData.targetNPCId;
    const targetNPCForRoll = firstNPCId2 ? npcs.find(n => n.id === firstNPCId2) : null;
    const rawDef = parseInt(defenderRoll);
    const effectiveDef = (targetNPCForRoll
      ? Math.max(rawDef, targetNPCForRoll.armor || 0)
      : rawDef) + activeDefenseBonus;

    const newRoll = {
      attackerRoll: parseInt(attackerRoll),
      defenderRoll: rawDef,
      effectiveDefenderRoll: effectiveDef,
      damage,
      isSpecial: isSpecialBonus,
      isFirstStrike: firstStrike,
      armorFloored: targetNPCForRoll && effectiveDef > rawDef,
      attackBonusApplied: activeAttackBonus || 0,
      defenseBonusApplied: activeDefenseBonus || 0,
    };
    
    const newAttackRolls = [...attackRolls, newRoll];
    const newTotal = totalDamage + damage;
    
    setAttackRolls(newAttackRolls);
    setTotalDamage(newTotal);
    setErrorMsg('');
    setCurrentAttackIndex(currentAttackIndex + 1);
    setAttackerRoll('');
    setDefenderRoll('');
    // Bonus is one-shot — clear after this roll
    setActiveAttackBonus(0);
    setActiveDefenseBonus(0);
  };

  const handleProceed = () => {
    if (attackRolls.length !== numAttacks) {
      setErrorMsg(`Complete all ${numAttacks} attack rolls first.`);
      return;
    }

    // Check target selection
    if (calculatorData.targetNPCIds?.length > 0) {
      // NPC target — valid, proceed
    } else if (calculatorData.targetIsSquad) {
      if (!calculatorData.targetSquadMembers || calculatorData.targetSquadMembers.length === 0) {
        setErrorMsg('Select at least one squad member to target.');
        return;
      }
    } else {
      if (!calculatorData.targetId) {
        setErrorMsg('Please select a target.');
        return;
      }
    }

    // Create targetSquadMembers array
    let targetMembers;
    if (calculatorData.targetNPCIds?.length > 0) {
      // Multiple NPC targets — one entry per NPC
      targetMembers = (calculatorData.targetNPCIds || []).map(npcId => ({ isNPC: true, npcId }));
    } else if (calculatorData.targetNPCId) {
      targetMembers = [{ isNPC: true, npcId: calculatorData.targetNPCId }];
    } else if (calculatorData.targetIsSquad && calculatorData.targetSquadMembers?.length > 0) {
      targetMembers = calculatorData.targetSquadMembers;
    } else {
      targetMembers = [{
        playerId: calculatorData.targetId.playerId,
        unitType: calculatorData.targetId.unitType
      }];
    }

    // Pass data with total damage to distribution
    const updatedData = {
      ...calculatorData,
      totalDamage,
      d20Rolls: attackRolls,
      targetSquadMembers: targetMembers
    };

    onProceedToDistribution(updatedData);
  };

  const canAddRoll = attackerRoll && defenderRoll && currentAttackIndex < numAttacks;

  // Consume one use of a reroll item and clear the appropriate roll input
  const consumeRerollItem = (item, owner, clearRoll) => {
    if (!owner) return;
    const livePlayer = players.find(p => p.id === owner.id) || owner;
    const originalItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!originalItem) return;
    const newUsesRemaining = originalItem.effect.uses === 0 ? Infinity : ((originalItem.effect.usesRemaining ?? originalItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    setConsumedItems(prev => [...prev, { owner: livePlayer, item: { ...originalItem, effect: { ...originalItem.effect, usesRemaining: newUsesRemaining } }, originalItem }]);
    clearRoll('');
  };
  // Consume a diceSwap item and swap the two current roll inputs
  const consumeDiceSwap = (item, owner) => {
    if (!attackerRoll || !defenderRoll) return;
    const livePlayer = players.find(p => p.id === owner.id) || owner;
    const liveItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!liveItem) return;
    const newUsesRemaining = liveItem.effect.uses === 0 ? Infinity : ((liveItem.effect.usesRemaining ?? liveItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    const tmp = attackerRoll;
    setAttackerRoll(defenderRoll);
    setDefenderRoll(tmp);
  };

  // Consume an attackBonus or defenseBonus item — bonus applies to NEXT roll only, then clears
  const consumeBonusItem = (item, owner, bonusType) => {
    if (!owner) return;
    const livePlayer = players.find(p => p.id === owner.id) || owner;
    const liveItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!liveItem) return;
    const newUsesRemaining = liveItem.effect.uses === 0 ? Infinity : ((liveItem.effect.usesRemaining ?? liveItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    setConsumedItems(prev => [...prev, { owner: livePlayer, item: { ...liveItem, effect: { ...liveItem.effect, usesRemaining: newUsesRemaining } }, originalItem: liveItem }]);
    if (bonusType === 'attack') setActiveAttackBonus(prev => prev + (liveItem.effect?.value || 0));
    else setActiveDefenseBonus(prev => prev + (liveItem.effect?.value || 0));
  };

  // Consume a Close Call item — negate this entire interaction
  const consumeClosecall = (item) => {
    const ownerSnap = item.closecallOwner || defender;
    if (!ownerSnap) return;
    const livePlayer = players.find(p => p.id === ownerSnap.id) || ownerSnap;
    const liveItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!liveItem) return;
    const newUsesRemaining = liveItem.effect.uses === 0 ? Infinity : ((liveItem.effect.usesRemaining ?? liveItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    setClosecallOwner(livePlayer);
    setShowClosecall(true);
    onAddLog(`🛡️ ${livePlayer.playerName} used Close Call — the attack was completely negated`);
  };

  const allRollsComplete = attackRolls.length === numAttacks;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
          border: '3px solid ' + gold,
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '95%',
          width: '1200px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        }}
      >
        {/* Bonus Prompt */}
        {showBonusPrompt && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(76,29,149,0.1))',
            border: '2px solid rgba(167,139,250,0.5)', borderRadius: '10px',
            padding: '1rem', marginBottom: '1.25rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>✨</div>
            <div style={{ color: '#e9d5ff', fontWeight: '900', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              {showBonusPrompt.type === 'attack' ? 'Attack Bonus Available' : 'Defense Bonus Available'}
            </div>
            <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
              +{showBonusPrompt.value} to {showBonusPrompt.type === 'attack' ? 'attack' : 'defense'} rolls this sequence. Use it?
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  if (showBonusPrompt.type === 'attack') setActiveAttackBonus(showBonusPrompt.value);
                  else setActiveDefenseBonus(showBonusPrompt.value);
                  setShowBonusPrompt(null);
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  border: '2px solid #10b981', color: '#d1fae5', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.85rem',
                }}>✓ Use Bonus</button>
              <button
                onClick={() => setShowBonusPrompt(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
                  color: '#fca5a5', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.85rem',
                }}>✗ Save for Later</button>
            </div>
          </div>
        )}

        {/* Active bonus indicators */}
        {(activeAttackBonus > 0 || activeDefenseBonus > 0) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
            {activeAttackBonus > 0 && (
              <span style={{
                padding: '0.2rem 0.6rem', background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.4)', borderRadius: '5px',
                color: '#86efac', fontSize: '0.72rem', fontWeight: '800',
              }}>⚔️ +{activeAttackBonus} ATK BONUS ACTIVE</span>
            )}
            {activeDefenseBonus > 0 && (
              <span style={{
                padding: '0.2rem 0.6rem', background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.4)', borderRadius: '5px',
                color: '#93c5fd', fontSize: '0.72rem', fontWeight: '800',
              }}>🛡️ +{activeDefenseBonus} DEF BONUS ACTIVE</span>
            )}
          </div>
        )}

        {/* Use Item panel */}
        {(() => {
          const CALC_ITEM_TYPES = ['rerollAttack','rerollDefense','forceAttackReroll','forceDefenseReroll','attackBonus','defenseBonus','diceSwap','closecall'];
          const allCalcItems = [attacker, defender].filter(Boolean).flatMap(p =>
            (p.inventory || [])
              .filter(it => CALC_ITEM_TYPES.includes(it.effect?.type))
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
          if (allCalcItems.length === 0) return null;
          return (
            <div style={{ marginBottom: '0.75rem' }}>
              <button onClick={() => setShowItemPanel(s => !s)} style={{
                width: '100%', padding: '0.45rem', background: showItemPanel ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${showItemPanel ? 'rgba(99,102,241,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: showItemPanel ? '6px 6px 0 0' : '6px',
                color: showItemPanel ? '#a5b4fc' : '#6b7280', fontFamily: 'inherit', fontWeight: '800',
                fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '0.05em',
              }}>
                🎒 Use Item ({allCalcItems.length} available) {showItemPanel ? '▲' : '▼'}
              </button>
              {showItemPanel && (
                <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(99,102,241,0.3)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.5rem' }}>
                  {(() => {
                    // Group items by player
                    const groups = {};
                    const groupOrder = [];
                    allCalcItems.forEach(item => {
                      if (!groups[item.playerName]) { groups[item.playerName] = []; groupOrder.push(item.playerName); }
                      groups[item.playerName].push(item);
                    });
                    return groupOrder.map(playerName => (
                      <div key={playerName} style={{ marginBottom: '0.5rem' }}>
                        {/* Player header */}
                        <div style={{ color: '#8b7355', fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.4rem', marginBottom: '0.25rem', borderBottom: '1px solid rgba(90,74,58,0.3)' }}>
                          {playerName}
                        </div>
                        {groups[playerName].map((item, idx) => {
                          const tc = ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af');
                          const typeLabel = {
                            rerollAttack: '⟳ Reroll Attack', rerollDefense: '⟳ Reroll Defense',
                            forceAttackReroll: '⚡ Force Attacker Reroll', forceDefenseReroll: '⚡ Force Defender Reroll',
                            attackBonus: `⚔️ +${item.effect?.value} Atk Bonus`, defenseBonus: `🛡️ +${item.effect?.value} Def Bonus`,
                            diceSwap: '⇅ Swap Dice Rolls', closecall: '🛡️ Close Call',
                          }[item.effect?.type] || item.effect?.type;
                          const handleUse = () => {
                            if (item.effect?.type === 'rerollAttack') consumeRerollItem({ ...item, usesLeft: item.usesLeft }, item.owner, setAttackerRoll);
                            else if (item.effect?.type === 'rerollDefense') consumeRerollItem({ ...item, usesLeft: item.usesLeft }, item.owner, setDefenderRoll);
                            else if (item.effect?.type === 'forceAttackReroll') consumeRerollItem({ ...item, usesLeft: item.usesLeft }, item.owner, setAttackerRoll);
                            else if (item.effect?.type === 'forceDefenseReroll') consumeRerollItem({ ...item, usesLeft: item.usesLeft }, item.owner, setDefenderRoll);
                            else if (item.effect?.type === 'attackBonus') consumeBonusItem({ ...item, usesLeft: item.usesLeft }, item.owner, 'attack');
                            else if (item.effect?.type === 'defenseBonus') consumeBonusItem({ ...item, usesLeft: item.usesLeft }, item.owner, 'defense');
                            else if (item.effect?.type === 'diceSwap') consumeDiceSwap({ ...item, usesLeft: item.usesLeft, owner: item.owner, ownerLabel: item.playerName }, item.owner);
                            else if (item.effect?.type === 'closecall') consumeClosecall({ ...item, usesLeft: item.usesLeft, closecallOwner: item.owner });
                            setShowItemPanel(false);
                          };
                          return (
                            <div key={idx} onClick={handleUse} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', marginBottom: '0.2rem', background: `${tc}10`, border: `1px solid ${tc}25`, borderRadius: '6px', cursor: 'pointer' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: tc, fontWeight: '800', fontSize: '0.78rem' }}>{item.name}</div>
                                <div style={{ color: '#6b7280', fontSize: '0.62rem' }}>{item.unitName} · {typeLabel}</div>
                              </div>
                              <span style={{ color: '#4b5563', fontSize: '0.62rem', flexShrink: 0 }}>{item.usesLeft === Infinity ? '∞' : item.usesLeft}✕</span>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          );
        })()}

        {/* Title */}
        <h3 style={{
          color: gold,
          fontSize: '1.5rem',
          marginBottom: '1rem',
          textAlign: 'center',
          fontFamily: '"Cinzel", Georgia, serif',
          textShadow: '2px 2px 4px rgba(0,0,0,1)',
        }}>
          🎲 D20 Combat Roll
        </h3>

        {/* Attacker Info */}
        <div style={{ marginBottom: '1rem', color: gold, fontSize: '0.875rem' }}>
          <strong>Attacker:</strong> {calculatorData.attackerName} - {calculatorData.attackingUnitType}
          {(isAttackerSpecial() || calculatorData.action === 'special') && (
            <span style={{ color: '#fbbf24' }}> (+1 Special)</span>
          )}
        </div>

        {/* Squad Attack Checkbox - Only for non-commanders */}
        {calculatorData.attackingUnitType !== 'commander' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: gold,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={!!calculatorData.attackerIsSquad}
                onChange={(e) => {
                  setCalculatorData({
                    ...calculatorData,
                    attackerIsSquad: e.target.checked,
                    attackerSquadMembers: [],
                  });
                  // Reset rolls when toggling
                  setAttackRolls([]);
                  setCurrentAttackIndex(0);
                  setTotalDamage(0);
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <strong>Form Attacker Squad?</strong>
            </label>
          </div>
        )}

        {/* Squad Member Selection - Only if Squad Attack is checked */}
        {calculatorData.attackerIsSquad && calculatorData.attackingUnitType !== 'commander' && (
          <div style={{
            background: '#0a0503',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #5a4a3a',
            marginBottom: '1rem',
          }}>
            <div style={{ color: gold, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Select attacking squad members (max 3):
            </div>
            {attacker.subUnits.map((unit, idx) => {
              if (unit.hp === 0) return null;
              const unitType = idx === 0 ? 'special' : `soldier${idx}`;
              const isInitiator = unitType === calculatorData.attackingUnitType;
              const isSelected = isInitiator || calculatorData.attackerSquadMembers?.includes(unitType);
              const canSelect = isSelected || (calculatorData.attackerSquadMembers?.length || 0) < 2; // Max 3 total (initiator + 2 more)

              return (
                <label key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  marginBottom: '0.25rem',
                  background: isSelected ? '#2a1810' : 'transparent',
                  border: isSelected ? '1px solid ' + gold : '1px solid transparent',
                  borderRadius: '4px',
                  color: '#8b7355',
                  fontSize: '0.75rem',
                  cursor: isInitiator ? 'not-allowed' : (canSelect ? 'pointer' : 'not-allowed'),
                  opacity: isInitiator ? 0.7 : (canSelect ? 1 : 0.5),
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isInitiator || !canSelect}
                    onChange={(e) => {
                      let newMembers = [...(calculatorData.attackerSquadMembers || [])];
                      if (e.target.checked) {
                        newMembers.push(unitType);
                      } else {
                        newMembers = newMembers.filter(m => m !== unitType);
                      }
                      setCalculatorData({
                        ...calculatorData,
                        attackerSquadMembers: newMembers,
                      });
                      // Reset rolls when changing squad
                      setAttackRolls([]);
                      setCurrentAttackIndex(0);
                      setTotalDamage(0);
                    }}
                    style={{ width: '14px', height: '14px' }}
                  />
                  {unit.name || (idx === 0 ? '⭐ Special' : `🛡️ Soldier ${idx}`)} ({unit.hp}hp)
                  {isInitiator && <span style={{ color: gold }}> (initiator)</span>}
                </label>
              );
            })}
          </div>
        )}

        {/* Target Squad Checkbox */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: gold,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={!!calculatorData.targetIsSquad}
              onChange={(e) => {
                setCalculatorData({
                  ...calculatorData,
                  targetIsSquad: e.target.checked,
                  targetSquadMembers: [],
                  targetId: null,
                });
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <strong>Target Squad?</strong>
          </label>
        </div>

        {/* Target Selection */}
        {!calculatorData.targetIsSquad ? (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              <strong>Select Target:</strong>
            </label>

            {/* Player rows — collapsible */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {players
                .filter(p => p.id !== calculatorData.attackerId)
                .filter(p => p.commanderStats.hp > 0 || p.subUnits.some(u => u.hp > 0))
                .map(p => {
                  const isExpanded = !!expandedPlayers[p.id];
                  const isSelectedPlayer = calculatorData.targetId?.playerId === p.id;
                  const liveUnits = [
                    p.commanderStats.hp > 0 ? { unitType: 'commander', name: p.commanderStats?.customName || p.commander, hp: p.commanderStats.hp, icon: '⚔️' } : null,
                    ...(p.subUnits || []).map((u, idx) => {
                      if (u.hp === 0 || u.revivedOnPlayerId) return null;
                      return { unitType: idx === 0 ? 'special' : `soldier${idx}`, name: u.name || (idx === 0 ? 'Special' : `Soldier ${idx}`), hp: u.hp, icon: idx === 0 ? '⭐' : '🛡️' };
                    }),
                  ].filter(Boolean);

                  return (
                    <div key={p.id}>
                      {/* Player header row */}
                      <div
                        onClick={() => {
                          setExpandedPlayers(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                          // Clear selection if clicking a different player
                          if (calculatorData.targetId?.playerId && calculatorData.targetId.playerId !== p.id) {
                            setCalculatorData({ ...calculatorData, targetId: null, targetNPCIds: [], targetNPCId: null });
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.75rem',
                          background: isSelectedPlayer ? 'rgba(201,169,97,0.1)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${isSelectedPlayer ? 'rgba(201,169,97,0.4)' : 'rgba(90,74,58,0.3)'}`,
                          borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                          cursor: 'pointer', userSelect: 'none',
                        }}
                      >
                        <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: '900', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                        <span style={{ color: isSelectedPlayer ? gold : '#9ca3af', fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{p.playerName}</span>
                        {isSelectedPlayer && calculatorData.targetId?.unitType && (
                          <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '20px', padding: '0.1rem 0.45rem' }}>
                            {calculatorData.targetId.unitType === 'commander' ? '⚔️' : calculatorData.targetId.unitType === 'special' ? '⭐' : '🛡️'} selected
                          </span>
                        )}
                      </div>

                      {/* Unit list */}
                      {isExpanded && (
                        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(90,74,58,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.35rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {liveUnits.map(unit => {
                            const isSel = isSelectedPlayer && calculatorData.targetId?.unitType === unit.unitType;
                            return (
                              <div
                                key={unit.unitType}
                                onClick={() => setCalculatorData({
                                  ...calculatorData,
                                  targetId: { playerId: p.id, unitType: unit.unitType },
                                  targetNPCIds: [], targetNPCId: null,
                                })}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                                  padding: '0.4rem 0.65rem',
                                  background: isSel ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                                  border: `2px solid ${isSel ? gold : 'rgba(90,74,58,0.3)'}`,
                                  borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                }}
                              >
                                <div style={{ width: '13px', height: '13px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${isSel ? gold : '#5a4a3a'}`, background: isSel ? gold : 'transparent' }} />
                                <span style={{ color: isSel ? gold : '#9ca3af', fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{unit.icon} {unit.name}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.68rem' }}>{unit.hp}hp</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* ── OR Target NPC ── */}
            {npcs.filter(n => n.active && !n.isDead).length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                  <span style={{ color: '#5a4a3a', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>OR TARGET NPC{(calculatorData.targetNPCIds?.length || 0) > 0 && <span style={{ color: '#ef4444', marginLeft: '0.4rem' }}>({calculatorData.targetNPCIds.length} selected)</span>}</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {npcs.filter(n => n.active && !n.isDead).map(npc => {
                    const ids = calculatorData.targetNPCIds || [];
                    const isSelected = ids.includes(npc.id);
                    const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
                    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                    return (
                      <div key={npc.id} onClick={() => {
                        const newIds = isSelected ? ids.filter(id => id !== npc.id) : [...ids, npc.id];
                        setCalculatorData({ ...calculatorData, targetNPCIds: newIds, targetNPCId: newIds[0] || null, targetId: null, targetSquadMembers: [] });
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.85rem',
                        background: isSelected ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${isSelected ? '#ef4444' : 'rgba(90,74,58,0.5)'}`,
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isSelected ? '#ef4444' : '#5a4a3a'}`, background: isSelected ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: '900' }}>{isSelected && '✓'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: isSelected ? '#fca5a5' : '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>{npc.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>{npc.hp}/{npc.maxHp}hp</span>
                          </div>
                        </div>
                        <div style={{ padding: '0.15rem 0.5rem', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)', borderRadius: '5px', color: '#5eead4', fontSize: '0.68rem', fontWeight: '800', flexShrink: 0 }}>🛡️{npc.armor}+</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Squad Target Selection
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              <strong>Select Targets:</strong>
            </label>

            {/* Player rows — collapsible */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {players
                .filter(p => p.id !== calculatorData.attackerId)
                .filter(p => p.commanderStats.hp > 0 || p.subUnits.some(u => u.hp > 0))
                .map(p => {
                  const isExpanded = !!expandedPlayers[`squad-${p.id}`];
                  const selectedCount = (calculatorData.targetSquadMembers || []).filter(m => m.playerId === p.id).length;
                  const liveUnits = [
                    ...(p.subUnits || []).map((u, idx) => {
                      if (u.hp === 0 || u.revivedOnPlayerId) return null;
                      return { unitType: idx === 0 ? 'special' : `soldier${idx}`, name: u.name || (idx === 0 ? 'Special' : `Soldier ${idx}`), hp: u.hp, icon: idx === 0 ? '⭐' : '🛡️', unitIndex: idx };
                    }),
                  ].filter(Boolean);
                  if (liveUnits.length === 0) return null;

                  return (
                    <div key={p.id}>
                      <div
                        onClick={() => setExpandedPlayers(prev => ({ ...prev, [`squad-${p.id}`]: !prev[`squad-${p.id}`] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.75rem',
                          background: selectedCount > 0 ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${selectedCount > 0 ? 'rgba(201,169,97,0.35)' : 'rgba(90,74,58,0.3)'}`,
                          borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                          cursor: 'pointer', userSelect: 'none',
                        }}
                      >
                        <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: '900', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                        <span style={{ color: selectedCount > 0 ? gold : '#9ca3af', fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{p.playerName}</span>
                        {selectedCount > 0 && (
                          <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '20px', padding: '0.1rem 0.45rem' }}>
                            {selectedCount} selected
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(90,74,58,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.35rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {liveUnits.map(unit => {
                            const isSel = (calculatorData.targetSquadMembers || []).some(m => m.playerId === p.id && m.unitType === unit.unitType);
                            const canSelect = isSel || (calculatorData.targetSquadMembers?.length || 0) < 3;
                            return (
                              <div
                                key={unit.unitType}
                                onClick={() => {
                                  if (!canSelect) return;
                                  let newTargets = [...(calculatorData.targetSquadMembers || [])];
                                  if (isSel) {
                                    newTargets = newTargets.filter(m => !(m.playerId === p.id && m.unitType === unit.unitType));
                                  } else {
                                    newTargets.push({ playerId: p.id, unitType: unit.unitType, unitIndex: unit.unitIndex });
                                  }
                                  setCalculatorData({ ...calculatorData, targetId: { playerId: p.id }, targetSquadMembers: newTargets, targetNPCIds: [], targetNPCId: null });
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                                  padding: '0.4rem 0.65rem',
                                  background: isSel ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                                  border: `2px solid ${isSel ? gold : 'rgba(90,74,58,0.3)'}`,
                                  borderRadius: '6px', cursor: canSelect ? 'pointer' : 'not-allowed',
                                  opacity: canSelect ? 1 : 0.5, userSelect: 'none',
                                }}
                              >
                                <div style={{ width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, border: `2px solid ${isSel ? gold : '#5a4a3a'}`, background: isSel ? gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{isSel ? '✓' : ''}</div>
                                <span style={{ color: isSel ? gold : '#9ca3af', fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{unit.icon} {unit.name}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.68rem' }}>{unit.hp}hp</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* ── OR Target NPC ── */}
            {npcs.filter(n => n.active && !n.isDead).length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                  <span style={{ color: '#5a4a3a', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>OR TARGET NPC{(calculatorData.targetNPCIds?.length || 0) > 0 && <span style={{ color: '#ef4444', marginLeft: '0.4rem' }}>({calculatorData.targetNPCIds.length} selected)</span>}</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {npcs.filter(n => n.active && !n.isDead).map(npc => {
                    const ids = calculatorData.targetNPCIds || [];
                    const isSelected = ids.includes(npc.id);
                    const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
                    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                    return (
                      <div key={npc.id} onClick={() => {
                        const newIds = isSelected ? ids.filter(id => id !== npc.id) : [...ids, npc.id];
                        setCalculatorData({ ...calculatorData, targetNPCIds: newIds, targetNPCId: newIds[0] || null, targetId: null, targetSquadMembers: [] });
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.85rem',
                        background: isSelected ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${isSelected ? '#ef4444' : 'rgba(90,74,58,0.5)'}`,
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isSelected ? '#ef4444' : '#5a4a3a'}`, background: isSelected ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: '900' }}>{isSelected && '✓'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: isSelected ? '#fca5a5' : '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>{npc.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>{npc.hp}/{npc.maxHp}hp</span>
                          </div>
                        </div>
                        <div style={{ padding: '0.15rem 0.5rem', background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)', borderRadius: '5px', color: '#5eead4', fontSize: '0.68rem', fontWeight: '800', flexShrink: 0 }}>🛡️{npc.armor}+</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dice Info */}
        <div style={{
          background: '#0a0503',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #5a4a3a',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ color: gold, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Roll {currentAttackIndex + 1} of {numAttacks}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.875rem' }}>
            <div>
              <div style={{ color: '#8b7355', fontSize: '0.75rem' }}>Attacker</div>
              <div style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 'bold' }}>{attackerDice}</div>
            </div>
            <div style={{ color: '#8b7355', fontSize: '2rem' }}>VS</div>
            <div>
              <div style={{ color: '#8b7355', fontSize: '0.75rem' }}>Defender</div>
              <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>{defenderDice}</div>
            </div>
          </div>
        </div>

        {/* Close Call + Dice Swap — always visible at top */}
        {(closecallItems.length > 0 || allSwapItems.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
            {allSwapItems.map(item => (
              <button key={item.id} onClick={() => consumeDiceSwap(item, item.owner)}
                style={{
                  padding: '0.35rem 1rem',
                  background: 'rgba(99,102,241,0.12)',
                  border: '2px solid rgba(99,102,241,0.5)',
                  borderRadius: '20px', cursor: 'pointer',
                  color: '#a5b4fc', fontFamily: 'inherit',
                  fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.05em',
                }}>
                ⇅ Swap Dice
                <span style={{ color: '#4b5563', marginLeft: '0.3rem', fontSize: '0.62rem' }}>
                  {item.owner?.playerName} · {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                </span>
              </button>
            ))}
            {closecallItems.map(item => (
              <button key={item.id} onClick={() => consumeClosecall(item)}
                style={{
                  padding: '0.35rem 1rem',
                  background: 'rgba(239,68,68,0.12)',
                  border: '2px solid rgba(239,68,68,0.5)',
                  borderRadius: '20px', cursor: 'pointer',
                  color: '#fca5a5', fontFamily: 'inherit',
                  fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.05em',
                }}>
                🛡️ Close Call
                <span style={{ color: '#4b5563', marginLeft: '0.3rem', fontSize: '0.62rem' }}>
                  {(item.closecallOwner || defender)?.playerName} · {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Roll Inputs */}
        {!allRollsComplete && (
          <div style={{
            background: '#0a0503',
            padding: '1rem',
            borderRadius: '6px',
            border: '2px solid ' + gold,
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Attacker Roll ({attackerDice}):
                </label>
                {/* Attacker reroll buttons — always shown when items exist, before typing */}
                {(() => {
                  const allAtkRerolls = [
                    ...attackerRerollItems.map(it => ({ ...it, label: '⟳ REROLL MY ATTACK', color: '#86efac', owner: attacker })),
                    ...forceAttackRerollItems.map(it => ({ ...it, label: '⚡ FORCE ATTACKER REROLL', color: '#fca5a5', owner: defender })),
                  ];
                  if (allAtkRerolls.length === 0) return null;
                  return (
                    <div style={{ marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {allAtkRerolls.map(item => (
                        <button key={item.id} onClick={() => consumeRerollItem(item, item.owner, setAttackerRoll)}
                          style={{
                            padding: '0.2rem 0.6rem',
                            background: 'rgba(0,0,0,0.35)',
                            border: `1px solid ${item.color}50`,
                            borderRadius: '20px', cursor: 'pointer',
                            color: item.color, fontFamily: 'inherit',
                            fontWeight: '800', fontSize: '0.65rem',
                          }}>
                          {item.label}
                          <span style={{ color: '#6b7280', marginLeft: '0.3rem', fontSize: '0.58rem', fontStyle: 'italic' }}>
                            {item.owner?.playerName || ''}
                          </span>
                          <span style={{ color: '#4b5563', marginLeft: '0.25rem', fontSize: '0.58rem' }}>
                            {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {/* Attack bonus item buttons */}
                {attackBonusItems.length > 0 && (
                  <div style={{ marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {attackBonusItems.map(item => (
                      <button key={item.id} onClick={() => consumeBonusItem(item, attacker, 'attack')}
                        style={{
                          padding: '0.2rem 0.6rem',
                          background: activeAttackBonus > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.08)',
                          border: `1px solid ${activeAttackBonus > 0 ? 'rgba(34,197,94,0.7)' : 'rgba(34,197,94,0.4)'}`,
                          borderRadius: '20px', cursor: 'pointer',
                          color: '#86efac', fontFamily: 'inherit',
                          fontWeight: '800', fontSize: '0.65rem',
                        }}>
                        ⚔️ +{item.effect?.value} atk
                        <span style={{ color: '#6b7280', marginLeft: '0.3rem', fontSize: '0.58rem', fontStyle: 'italic' }}>
                          {attacker?.playerName || ''}
                        </span>
                        <span style={{ color: '#4b5563', marginLeft: '0.25rem', fontSize: '0.58rem' }}>
                          {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="number"
                  min="1"
                  max={attackerDice === 'D20' ? 20 : 10}
                  value={attackerRoll}
                  onChange={(e) => setAttackerRoll(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #5a4a3a',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              {/* Defense bonus item buttons */}
              {defenseBonusItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', margin: '0.4rem 0' }}>
                  {defenseBonusItems.map(item => (
                    <button key={item.id} onClick={() => consumeBonusItem(item, defender, 'defense')}
                      style={{
                        padding: '0.2rem 0.6rem',
                        background: activeDefenseBonus > 0 ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.08)',
                        border: `1px solid ${activeDefenseBonus > 0 ? 'rgba(59,130,246,0.7)' : 'rgba(59,130,246,0.4)'}`,
                        borderRadius: '20px', cursor: 'pointer',
                        color: '#93c5fd', fontFamily: 'inherit',
                        fontWeight: '800', fontSize: '0.65rem',
                      }}>
                      🛡️ +{item.effect?.value} def
                      <span style={{ color: '#6b7280', marginLeft: '0.3rem', fontSize: '0.58rem', fontStyle: 'italic' }}>
                        {defender?.playerName || ''}
                      </span>
                      <span style={{ color: '#4b5563', marginLeft: '0.25rem', fontSize: '0.58rem' }}>
                        {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                      </span>
                    </button>
                  ))}
                </div>
              )}



              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Defender Roll ({defenderDice}):
                </label>
                {/* Defender reroll buttons — always shown when items exist, before typing */}
                {(() => {
                  const allDefRerolls = [
                    ...defenderRerollItems.map(it => ({ ...it, label: '⟳ REROLL MY DEFENSE', color: '#86efac', owner: defender })),
                    ...forceDefenseRerollItems.map(it => ({ ...it, label: '⚡ FORCE DEFENDER REROLL', color: '#fca5a5', owner: attacker })),
                  ];
                  if (allDefRerolls.length === 0) return null;
                  return (
                    <div style={{ marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {allDefRerolls.map(item => (
                        <button key={item.id} onClick={() => consumeRerollItem(item, item.owner, setDefenderRoll)}
                          style={{
                            padding: '0.2rem 0.6rem',
                            background: 'rgba(0,0,0,0.35)',
                            border: `1px solid ${item.color}50`,
                            borderRadius: '20px', cursor: 'pointer',
                            color: item.color, fontFamily: 'inherit',
                            fontWeight: '800', fontSize: '0.65rem',
                          }}>
                          {item.label}
                          <span style={{ color: '#6b7280', marginLeft: '0.3rem', fontSize: '0.58rem', fontStyle: 'italic' }}>
                            {item.owner?.playerName || ''}
                          </span>
                          <span style={{ color: '#4b5563', marginLeft: '0.25rem', fontSize: '0.58rem' }}>
                            {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <input
                  type="number"
                  min="1"
                  max={defenderDice === 'D20' ? 20 : 10}
                  value={defenderRoll}
                  onChange={(e) => setDefenderRoll(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #5a4a3a',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleAddRoll}
              disabled={!canAddRoll}
              style={{
                width: '100%',
                background: canAddRoll ? 'linear-gradient(to bottom, #7c3aed, #6d28d9)' : '#1a0f0a',
                color: canAddRoll ? '#e9d5ff' : '#4a3322',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '2px solid',
                borderColor: canAddRoll ? '#a78bfa' : '#4a3322',
                cursor: canAddRoll ? 'pointer' : 'not-allowed',
                fontFamily: '"Cinzel", Georgia, serif',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              + Add Roll
            </button>
          </div>
        )}

        {/* Roll History */}
        {attackRolls.length > 0 && (
          <div style={{
            background: '#0a0503',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid #5a4a3a',
            marginBottom: '1rem',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <div style={{ color: gold, fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Roll History:
            </div>
            {attackRolls.map((roll, idx) => (
              <div key={idx} style={{
                padding: '0.5rem',
                marginBottom: '0.25rem',
                background: '#1a0f0a',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#8b7355' }}>
                  Roll {idx + 1}: {roll.attackerRoll}
                  {roll.isSpecial && <span style={{ color: '#fbbf24' }}>+1</span>}
                  {roll.isFirstStrike && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚡+2</span>}
                  {roll.attackBonusApplied > 0 && <span style={{ color: '#86efac', fontWeight: 'bold' }}>+{roll.attackBonusApplied}</span>}
                  {' '}vs{' '}
                  {roll.armorFloored
                    ? <><span style={{ color: '#6b7280', textDecoration: 'line-through' }}>{roll.defenderRoll}</span><span style={{ color: '#5eead4' }}> {roll.effectiveDefenderRoll}</span><span style={{ color: '#374151', fontSize: '0.7rem' }}> 🛡️floor</span></>
                    : roll.defenderRoll
                  }
                  {roll.defenseBonusApplied > 0 && <span style={{ color: '#93c5fd', fontWeight: 'bold' }}>+{roll.defenseBonusApplied}</span>}
                </span>
                <span style={{ color: roll.damage > 0 ? '#fecaca' : '#86efac', fontWeight: 'bold' }}>
                  {roll.damage > 0 ? `${roll.damage}hp` : 'BLOCKED'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total Damage */}
        <div style={{
          background: '#0a0503',
          padding: '1rem',
          borderRadius: '6px',
          border: '2px solid ' + gold,
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ color: gold, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Total Damage
          </div>
          <div style={{ color: '#fecaca', fontSize: '2rem', fontWeight: 'bold', fontFamily: '"Cinzel", Georgia, serif' }}>
            {totalDamage}hp
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleProceed}
            disabled={!allRollsComplete || (!calculatorData.targetId && !(calculatorData.targetNPCIds?.length > 0) && !calculatorData.targetNPCId)}
            style={{
              flex: 1,
              background: (allRollsComplete && (calculatorData.targetId || calculatorData.targetNPCIds?.length > 0 || calculatorData.targetNPCId)) ? 'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a',
              color: (allRollsComplete && (calculatorData.targetId || calculatorData.targetNPCId)) ? '#86efac' : '#4a3322',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: (allRollsComplete && (calculatorData.targetId || calculatorData.targetNPCId)) ? '#16a34a' : '#4a3322',
              cursor: (allRollsComplete && (calculatorData.targetId || calculatorData.targetNPCId)) ? 'pointer' : 'not-allowed',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            ✓ Proceed
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)',
              color: '#fecaca',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid #991b1b',
              cursor: 'pointer',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            ✕ Cancel
          </button>
        </div>
      {/* Close Call epic modal */}
      {showClosecall && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(ellipse at center, rgba(15,5,2,0.97) 0%, rgba(0,0,0,0.99) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '380px', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.75rem', lineHeight: 1 }}>🛡️</div>
            <div style={{
              fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0.15em',
              fontFamily: '"Cinzel", Georgia, serif',
              background: 'linear-gradient(135deg, #fca5a5, #ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
            }}>CLOSE CALL</div>
            <div style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: '700', marginBottom: '0.35rem', letterSpacing: '0.08em' }}>
              {(closecallOwner || defender)?.playerName || 'The Defender'} activated
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              The attack is completely negated.<br/>No damage. No effect. It never happened.
            </div>
            <div style={{
              display: 'inline-block', padding: '0.4rem 1.5rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px', color: '#fca5a5', fontSize: '0.72rem',
              fontWeight: '800', letterSpacing: '0.1em', marginBottom: '2rem',
            }}>DAMAGE NEGATED</div>
            <br/>
            <button onClick={() => { setShowClosecall(false); onCloseRaw(); if (onEndTurn) onEndTurn(); }} style={{
              padding: '0.75rem 2.5rem',
              background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              border: '2px solid #ef4444', borderRadius: '10px',
              color: '#fecaca', fontFamily: 'inherit', fontWeight: '900',
              fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.1em',
            }}>✕ Close</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CalculatorD20;