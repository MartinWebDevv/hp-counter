import React, { useState } from 'react';
import { getUnitStats, getUnitName } from '../utils/statsUtils';

const CalculatorD20 = ({ 
  data, 
  players, 
  onClose, 
  onProceedToDistribution 
}) => {
  const [calculatorData, setCalculatorData] = React.useState(data);
  const [attackRolls, setAttackRolls] = useState([]);
  const [currentAttackIndex, setCurrentAttackIndex] = useState(0);
  const [attackerRoll, setAttackerRoll] = useState('');
  const [defenderRoll, setDefenderRoll] = useState('');
  const [totalDamage, setTotalDamage] = useState(0);

  if (!calculatorData) return null;

  const attacker = players.find(p => p.id === calculatorData.attackerId);
  if (!attacker) return null;

  const gold = '#c9a961';

  // Determine dice types based on attacker and defender
  const getAttackerDiceType = () => {
    if (calculatorData.attackingUnitType === 'commander') {
      // Check if target is a commander (single target or in squad)
      const targetIsCommander = 
        calculatorData.targetId?.unitType === 'commander' ||
        calculatorData.targetSquadMembers?.some(t => t.unitType === 'commander');
      
      if (targetIsCommander) {
        return 'D20'; // Commander vs Commander → D20
      }
      
      // Commander attacking soldiers - check if squad or solo
      const isTargetingSquad = calculatorData.targetSquadMembers && calculatorData.targetSquadMembers.length > 1;
      if (isTargetingSquad) {
        return 'D20'; // Commander vs Squad → Commander uses D20
      }
      // Commander vs Solo Soldier → Commander uses D10
      return 'D10';
    }
    return 'D10'; // Soldiers always use D10
  };

  const getDefenderDiceType = () => {
    // Check if defender is a commander (single target or in squad)
    const defenderIsCommander = 
      calculatorData.targetId?.unitType === 'commander' ||
      calculatorData.targetSquadMembers?.some(t => t.unitType === 'commander');
    
    if (defenderIsCommander && calculatorData.attackingUnitType === 'commander') {
      return 'D20'; // Commander vs Commander → both D20
    }
    
    // All other scenarios: defender uses D10
    return 'D10';
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
    
    const finalAtkRoll = isSpecialBonus ? atkRoll + 1 : atkRoll;
    
    // Defender must roll >= attacker to block
    if (defRoll >= finalAtkRoll) return 0;
    return finalAtkRoll - defRoll;
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
    
    const newRoll = {
      attackerRoll: parseInt(attackerRoll),
      defenderRoll: parseInt(defenderRoll),
      damage,
      isSpecial: isSpecialBonus
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
    if (calculatorData.targetIsSquad) {
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
    if (calculatorData.targetIsSquad && calculatorData.targetSquadMembers?.length > 0) {
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
                marginBottom: '1rem',
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

            {/* Step 2: Select Target Unit - Only show if player selected */}
            {calculatorData.targetId?.playerId && (() => {
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

                    {/* Squad members - only alive ones */}
                    {targetPlayer.subUnits.map((unit, idx) => {
                      if (unit.hp === 0) return null;
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
                marginBottom: '0.75rem',
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

            {/* Squad Member Selection */}
            {calculatorData.targetId?.playerId && (() => {
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
                  Roll {idx + 1}: {roll.attackerRoll}{roll.isSpecial && <span style={{ color: '#fbbf24' }}>+1</span>} vs {roll.defenderRoll}
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
            disabled={!allRollsComplete || !calculatorData.targetId}
            style={{
              flex: 1,
              background: (allRollsComplete && calculatorData.targetId) ? 'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a',
              color: (allRollsComplete && calculatorData.targetId) ? '#86efac' : '#4a3322',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: (allRollsComplete && calculatorData.targetId) ? '#16a34a' : '#4a3322',
              cursor: (allRollsComplete && calculatorData.targetId) ? 'pointer' : 'not-allowed',
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