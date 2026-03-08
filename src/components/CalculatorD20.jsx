import React, { useState } from 'react';
import { getUnitStats, getUnitName } from '../utils/statsUtils';

const CalculatorD20 = ({ 
  data, 
  players,
  npcs = [],
  onClose, 
  onProceedToDistribution,
  gameMode = 'd20',
  firstStrike = false,
  onUpdatePlayer = () => {},
}) => {
  const [calculatorData, setCalculatorData] = React.useState({ targetNPCId: null, ...data });
  const [attackRolls, setAttackRolls] = useState([]);
  const [currentAttackIndex, setCurrentAttackIndex] = useState(0);
  const [attackerRoll, setAttackerRoll] = useState('');
  const [defenderRoll, setDefenderRoll] = useState('');
  const [totalDamage, setTotalDamage] = useState(0);
  const [showBonusPrompt, setShowBonusPrompt] = useState(null); // { type: 'attack'|'defense', value, itemName }
  const [activeAttackBonus, setActiveAttackBonus] = useState(0);
  const [activeDefenseBonus, setActiveDefenseBonus] = useState(0);
  const [bonusPromptShown, setBonusPromptShown] = useState(false);

  if (!calculatorData) return null;

  const attacker = players.find(p => p.id === calculatorData.attackerId);
  if (!attacker) return null;

  const gold = '#c9a961';

  // Defender player (PvP only — NPC targets have no inventory)
  const defender = players.find(p => p.id === (calculatorData.targetId?.playerId ?? calculatorData.targetId));

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
    const finalAtkRoll = (firstStrike && calculatorData.targetNPCId ? baseRoll + 2 : baseRoll) + activeAttackBonus;

    // Apply NPC armor floor to defense roll
    const targetNPC = calculatorData.targetNPCId
      ? npcs.find(n => n.id === calculatorData.targetNPCId)
      : null;
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
    
    const targetNPCForRoll = calculatorData.targetNPCId
      ? npcs.find(n => n.id === calculatorData.targetNPCId)
      : null;
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
      isFirstStrike: firstStrike && !!calculatorData.targetNPCId,
      armorFloored: targetNPCForRoll && effectiveDef > rawDef,
    };
    
    const newAttackRolls = [...attackRolls, newRoll];
    const newTotal = totalDamage + damage;
    
    setAttackRolls(newAttackRolls);
    setTotalDamage(newTotal);
    setCurrentAttackIndex(currentAttackIndex + 1);
    setAttackerRoll('');
    setDefenderRoll('');
  };

  const handleProceed = () => {
    if (attackRolls.length !== numAttacks) {
      alert(`Please complete all ${numAttacks} attack rolls!`);
      return;
    }

    // Check target selection
    if (calculatorData.targetNPCId) {
      // NPC target — valid, proceed
    } else if (calculatorData.targetIsSquad) {
      if (!calculatorData.targetSquadMembers || calculatorData.targetSquadMembers.length === 0) {
        alert('Please select at least one squad member to target!');
        return;
      }
    } else {
      if (!calculatorData.targetId) {
        alert('Please select a target!');
        return;
      }
    }

    // Create targetSquadMembers array
    let targetMembers;
    if (calculatorData.targetNPCId) {
      // NPC target — encode as a special member entry
      targetMembers = [{
        isNPC: true,
        npcId: calculatorData.targetNPCId,
      }];
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
    const newUsesRemaining = item.effect.uses === 0 ? Infinity : (item.usesLeft - 1);
    const consumed = newUsesRemaining <= 0;
    const newInventory = (owner.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(owner.id, { inventory: newInventory });
    clearRoll('');
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
          // Single Target - Two Step Selection
          <div style={{ marginBottom: '1rem' }}>
            {/* Step 1: Select Target Player */}
            <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              <strong>Select Target Player:</strong>
            </label>
            <select
              value={calculatorData.targetId?.playerId || ''}
              onChange={(e) => {
                setCalculatorData({
                  ...calculatorData,
                  targetId: e.target.value ? { playerId: parseInt(e.target.value), unitType: null } : null,
                });
              }}
              style={{
                width: '100%',
                background: '#0a0503',
                color: gold,
                padding: '0.75rem',
                borderRadius: '6px',
                border: '2px solid #5a4a3a',
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginBottom: '0.5rem',
              }}
            >
              <option value="">Select Player...</option>
              {players
                .filter(p => p.id !== calculatorData.attackerId)
                .filter(p => p.commanderStats.hp > 0 || p.subUnits.some(u => u.hp > 0))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.playerName || 'Player'}
                  </option>
                ))}
            </select>

            {/* ── OR Target NPC ── */}
            {npcs.filter(n => n.active && !n.isDead).length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.6rem',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                  <span style={{ color: '#5a4a3a', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>OR TARGET NPC</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {npcs.filter(n => n.active && !n.isDead).map(npc => {
                    const isSelected = calculatorData.targetNPCId === npc.id;
                    const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
                    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                    return (
                      <div
                        key={npc.id}
                        onClick={() => setCalculatorData({
                          ...calculatorData,
                          targetNPCId: isSelected ? null : npc.id,
                          targetId: null,
                          targetSquadMembers: [],
                        })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 0.85rem',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))'
                            : 'rgba(0,0,0,0.3)',
                          border: `2px solid ${isSelected ? '#ef4444' : 'rgba(90,74,58,0.5)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {/* Selection indicator */}
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSelected ? '#ef4444' : '#5a4a3a'}`,
                          background: isSelected ? '#ef4444' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', color: '#fff', fontWeight: '900',
                        }}>{isSelected && '✓'}</div>

                        {/* NPC info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: isSelected ? '#fca5a5' : '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>
                            {npc.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>
                              {npc.hp}/{npc.maxHp}hp
                            </span>
                          </div>
                        </div>

                        {/* Armor floor badge */}
                        <div style={{
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
                          borderRadius: '5px', color: '#5eead4',
                          fontSize: '0.68rem', fontWeight: '800', flexShrink: 0,
                        }}>🛡️{npc.armor}+</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Select Target Unit - Only show if player selected and no NPC selected */}
            {!calculatorData.targetNPCId && calculatorData.targetId?.playerId && (() => {
              const targetPlayer = players.find(p => p.id === calculatorData.targetId.playerId);
              if (!targetPlayer) return null;

              return (
                <div>
                  <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Select Target Unit:</strong>
                  </label>
                  <div style={{
                    background: '#0a0503',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '2px solid #5a4a3a',
                  }}>
                    {/* Commander option - only if alive */}
                    {targetPlayer.commanderStats.hp > 0 && (
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        background: calculatorData.targetId.unitType === 'commander' 
                          ? 'rgba(201, 169, 97, 0.2)' 
                          : 'transparent',
                        borderRadius: '4px',
                        color: gold,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="radio"
                          name="targetUnit"
                          checked={calculatorData.targetId.unitType === 'commander'}
                          onChange={() => {
                            setCalculatorData({
                              ...calculatorData,
                              targetId: { 
                                playerId: calculatorData.targetId.playerId, 
                                unitType: 'commander' 
                              },
                            });
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        ⚔️ {targetPlayer.commanderCustomName || targetPlayer.commander} ({targetPlayer.commanderStats.hp}hp)
                      </label>
                    )}

                    {/* Squad members - only alive and non-immune ones */}
                    {targetPlayer.subUnits.map((unit, idx) => {
                      if (unit.hp === 0) return null;
                      if (unit.revivedOnPlayerId) return null; // immune this round
                      const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                      return (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            background: calculatorData.targetId.unitType === unitType
                              ? 'rgba(201, 169, 97, 0.2)'
                              : 'transparent',
                            borderRadius: '4px',
                            color: gold,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="targetUnit"
                            checked={calculatorData.targetId.unitType === unitType}
                            onChange={() => {
                              setCalculatorData({
                                ...calculatorData,
                                targetId: { 
                                  playerId: calculatorData.targetId.playerId, 
                                  unitType 
                                },
                              });
                            }}
                            style={{ width: '16px', height: '16px' }}
                          />
                          {idx === 0 ? '⭐' : '🛡️'} {unit.name || (idx === 0 ? 'Special Unit' : `Soldier ${idx}`)} ({unit.hp}hp)
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          // Squad Target Selection
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              <strong>Select Target Player:</strong>
            </label>
            <select
              value={calculatorData.targetId?.playerId || ''}
              onChange={(e) => {
                setCalculatorData({
                  ...calculatorData,
                  targetId: e.target.value ? { playerId: parseInt(e.target.value) } : null,
                  targetSquadMembers: [],
                });
              }}
              style={{
                width: '100%',
                background: '#0a0503',
                color: gold,
                padding: '0.75rem',
                borderRadius: '6px',
                border: '2px solid #5a4a3a',
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginBottom: '0.5rem',
              }}
            >
              <option value="">Select Player...</option>
              {players
                .filter(p => p.id !== calculatorData.attackerId)
                .filter(p => p.commanderStats.hp > 0 || p.subUnits.some(u => u.hp > 0))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.playerName || 'Player'}
                  </option>
                ))}
            </select>

            {/* ── OR Target NPC ── */}
            {npcs.filter(n => n.active && !n.isDead).length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.6rem',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                  <span style={{ color: '#5a4a3a', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>OR TARGET NPC</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.2)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {npcs.filter(n => n.active && !n.isDead).map(npc => {
                    const isSelected = calculatorData.targetNPCId === npc.id;
                    const hpPct = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
                    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
                    return (
                      <div
                        key={npc.id}
                        onClick={() => setCalculatorData({
                          ...calculatorData,
                          targetNPCId: isSelected ? null : npc.id,
                          targetId: null,
                          targetSquadMembers: [],
                        })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 0.85rem',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))'
                            : 'rgba(0,0,0,0.3)',
                          border: `2px solid ${isSelected ? '#ef4444' : 'rgba(90,74,58,0.5)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {/* Selection indicator */}
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSelected ? '#ef4444' : '#5a4a3a'}`,
                          background: isSelected ? '#ef4444' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', color: '#fff', fontWeight: '900',
                        }}>{isSelected && '✓'}</div>

                        {/* NPC info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: isSelected ? '#fca5a5' : '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>
                            {npc.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', flexShrink: 0 }}>
                              {npc.hp}/{npc.maxHp}hp
                            </span>
                          </div>
                        </div>

                        {/* Armor floor badge */}
                        <div style={{
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
                          borderRadius: '5px', color: '#5eead4',
                          fontSize: '0.68rem', fontWeight: '800', flexShrink: 0,
                        }}>🛡️{npc.armor}+</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Squad Member Selection */}
            {!calculatorData.targetNPCId && calculatorData.targetId?.playerId && (() => {
              const targetPlayer = players.find(p => p.id === calculatorData.targetId.playerId);
              if (!targetPlayer) return null;

              return (
                <div style={{
                  background: '#0a0503',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #5a4a3a',
                }}>
                  <div style={{ color: gold, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    Select squad members (1-3):
                  </div>
                  {targetPlayer.subUnits.map((unit, idx) => {
                    if (unit.hp === 0) return null;
                    if (unit.revivedOnPlayerId) return null; // immune this round
                    const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                    const isSelected = calculatorData.targetSquadMembers?.some(m => m.unitType === unitType);
                    const canSelect = isSelected || (calculatorData.targetSquadMembers?.length || 0) < 3;

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
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        opacity: canSelect ? 1 : 0.5,
                      }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={(e) => {
                            let newTargets = [...(calculatorData.targetSquadMembers || [])];
                            if (e.target.checked) {
                              newTargets.push({
                                playerId: calculatorData.targetId.playerId,
                                unitType,
                                unitIndex: idx,
                              });
                            } else {
                              newTargets = newTargets.filter(m => m.unitType !== unitType);
                            }
                            setCalculatorData({
                              ...calculatorData,
                              targetSquadMembers: newTargets,
                            });
                          }}
                          style={{ width: '14px', height: '14px' }}
                        />
                        {unit.name || (idx === 0 ? '⭐ Special' : `🛡️ Soldier ${idx}`)} ({unit.hp}hp)
                      </label>
                    );
                  })}
                </div>
              );
            })()}
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
                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {allAtkRerolls.map(item => (
                        <button key={item.id} onClick={() => consumeRerollItem(item, item.owner, setAttackerRoll)}
                          style={{
                            width: '100%', padding: '0.45rem',
                            background: 'rgba(0,0,0,0.4)',
                            border: `2px solid ${item.color}60`,
                            borderRadius: '7px', cursor: 'pointer',
                            color: item.color, fontFamily: 'inherit',
                            fontWeight: '800', fontSize: '0.72rem', letterSpacing: '0.05em',
                          }}>
                          {item.label}
                          <span style={{ color: '#6b7280', fontWeight: '600', marginLeft: '0.4rem' }}>
                            · {item.name}
                          </span>
                          <span style={{ color: '#4b5563', fontWeight: '600', marginLeft: '0.3rem' }}>
                            [{item.owner?.playerName} / {item.heldBy}] · {item.usesLeft === Infinity ? '∞' : item.usesLeft} left
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
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
                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {allDefRerolls.map(item => (
                        <button key={item.id} onClick={() => consumeRerollItem(item, item.owner, setDefenderRoll)}
                          style={{
                            width: '100%', padding: '0.45rem',
                            background: 'rgba(0,0,0,0.4)',
                            border: `2px solid ${item.color}60`,
                            borderRadius: '7px', cursor: 'pointer',
                            color: item.color, fontFamily: 'inherit',
                            fontWeight: '800', fontSize: '0.72rem', letterSpacing: '0.05em',
                          }}>
                          {item.label}
                          <span style={{ color: '#6b7280', fontWeight: '600', marginLeft: '0.4rem' }}>
                            · {item.name}
                          </span>
                          <span style={{ color: '#4b5563', fontWeight: '600', marginLeft: '0.3rem' }}>
                            [{item.owner?.playerName} / {item.heldBy}] · {item.usesLeft === Infinity ? '∞' : item.usesLeft} left
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
                  {' '}vs{' '}
                  {roll.armorFloored
                    ? <><span style={{ color: '#6b7280', textDecoration: 'line-through' }}>{roll.defenderRoll}</span><span style={{ color: '#5eead4' }}> {roll.effectiveDefenderRoll}</span><span style={{ color: '#374151', fontSize: '0.7rem' }}> 🛡️floor</span></>
                    : roll.defenderRoll
                  }
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
            disabled={!allRollsComplete || (!calculatorData.targetId && !calculatorData.targetNPCId)}
            style={{
              flex: 1,
              background: (allRollsComplete && (calculatorData.targetId || calculatorData.targetNPCId)) ? 'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a',
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
      </div>
    </div>
  );
};

export default CalculatorD20;