import React from 'react';
import { FACTIONS } from '../data/factions';
import { getUnitName } from '../utils/statsUtils';

/**
 * PlayerCard Component
 * Displays and manages a single player's state.
 * Now supports squad revive queue system.
 */
const PlayerCard = ({ 
  player, 
  onUpdate, 
  onRemove, 
  onToggleSquad,
  onOpenCalculator,
  onUseRevive,
  onOpenSquadRevive,  // NEW: opens SquadReviveModal for this player
  allPlayers,
  isCurrentTurn = false,
  hasActedThisRound = false
}) => {
  const [showSquad, setShowSquad] = React.useState(true);
  const [showReviveModal, setShowReviveModal] = React.useState(false);
  const [reviveType, setReviveType] = React.useState('commander');
  
  const reviveQueue = player.reviveQueue || [];

  const handlePlayerNameChange = (e) => {
    onUpdate(player.id, { playerName: e.target.value });
  };

  const handleFactionChange = (e) => {
    const newFaction = e.target.value;
    const commanders = FACTIONS[newFaction] || [];
    onUpdate(player.id, {
      faction: newFaction,
      commander: commanders[0] || ''
    });
  };

  const handleCommanderChange = (e) => {
    onUpdate(player.id, { commander: e.target.value });
  };

  const handleCommanderHPChange = (delta) => {
    const currentHP = player.commanderStats.hp;
    const newHP = Math.max(0, Math.min(
      player.commanderStats.maxHp,
      currentHP + delta
    ));
    
    const justDied = currentHP > 0 && newHP === 0;
    
    onUpdate(player.id, {
      commanderStats: {
        ...player.commanderStats,
        hp: newHP,
        isDead: justDied ? true : (newHP > 0 ? false : player.commanderStats.isDead)
      }
    });
  };

  const handleSubUnitHPChange = (index, delta) => {
    const unit = player.subUnits[index];
    const currentHP = unit.hp;
    const newHP = Math.max(0, Math.min(unit.maxHp, currentHP + delta));
    const justDied = currentHP > 0 && newHP === 0;

    const newSubUnits = player.subUnits.map((u, i) => {
      if (i !== index) return u;
      return { ...u, hp: newHP };
    });

    // Determine updated revive queue
    let newReviveQueue = [...reviveQueue];
    const lives = unit.livesRemaining ?? unit.revives ?? 1;
    if (justDied && lives > 0 && !newReviveQueue.includes(index)) {
      newReviveQueue = [...newReviveQueue, index];
    }

    // Squad wipe check
    const allDead = newSubUnits.every(u => u.hp === 0);
    let finalSubUnits = newSubUnits;
    if (allDead) {
      newReviveQueue = [];
      finalSubUnits = newSubUnits.map(u => ({
        ...u,
        livesRemaining: 0,
        revives: 0,
      }));
    }

    onUpdate(player.id, { subUnits: finalSubUnits, reviveQueue: newReviveQueue });
  };

  const handleSubUnitNameChange = (index, name) => {
    const newSubUnits = player.subUnits.map((unit, i) => 
      i === index ? { ...unit, name } : unit
    );
    onUpdate(player.id, { subUnits: newSubUnits });
  };

  // Get the queue position for a given unit index (1-based), or 0 if not in queue
  const getQueuePosition = (unitIndex) => {
    const pos = reviveQueue.indexOf(unitIndex);
    return pos === -1 ? 0 : pos + 1;
  };

  return (
    <div style={{
      ...styles.card,
      border: isCurrentTurn 
        ? `3px solid ${player.playerColor || '#3b82f6'}`
        : hasActedThisRound 
          ? '2px solid #16a34a'
          : '2px solid rgba(212, 175, 55, 0.3)',
      boxShadow: isCurrentTurn 
        ? `0 0 20px ${player.playerColor || '#3b82f6'}80`
        : 'none',
    }}>
      {/* Header */}
      <div style={styles.header}>
        <input
          type="color"
          value={player.playerColor || '#3b82f6'}
          onChange={(e) => onUpdate(player.id, { playerColor: e.target.value })}
          style={{
            width: '30px',
            height: '30px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Player Color"
        />
        <input
          type="text"
          value={player.playerName}
          onChange={handlePlayerNameChange}
          style={styles.nameInput}
          placeholder="Player Name"
        />
        {isCurrentTurn && (
          <div style={{
            padding: '0.25rem 0.75rem',
            background: 'linear-gradient(to bottom, #3b82f6, #2563eb)',
            border: '2px solid #60a5fa',
            borderRadius: '6px',
            color: '#dbeafe',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginLeft: '0.5rem',
          }}>
            YOUR TURN
          </div>
        )}
        {!isCurrentTurn && hasActedThisRound && (
          <div style={{
            padding: '0.25rem 0.75rem',
            background: 'rgba(22, 163, 74, 0.2)',
            border: '1px solid #16a34a',
            borderRadius: '6px',
            color: '#86efac',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginLeft: '0.5rem',
          }}>
            ✓ ACTED
          </div>
        )}
        <button
          onClick={() => onRemove(player.id)}
          style={styles.removeBtn}
          title="Remove Player"
        >
          ✕
        </button>
      </div>

      {/* Faction & Commander Selection */}
      <div style={styles.selectionRow}>
        <select
          value={player.faction}
          onChange={handleFactionChange}
          style={styles.select}
        >
          {Object.keys(FACTIONS).map(faction => (
            <option key={faction} value={faction}>
              {faction}
            </option>
          ))}
        </select>

        <select
          value={player.commander}
          onChange={handleCommanderChange}
          style={styles.select}
        >
          {FACTIONS[player.faction]?.map(commander => (
            <option key={commander} value={commander}>
              {commander}
            </option>
          ))}
        </select>
      </div>

      {/* Commander Section */}
      <div style={{
        ...styles.section,
        opacity: player.commanderStats.hp === 0 ? 0.5 : 1,
        filter: player.commanderStats.hp === 0 ? 'grayscale(0.8)' : 'none',
        border: player.commanderStats.hp === 0 ? '2px solid #7f1d1d' : 'none',
        transition: 'all 0.3s'
      }}>
        <div style={styles.sectionHeader}>
          <input
            type="text"
            value={player.commanderStats.customName || player.commander}
            onChange={(e) => onUpdate(player.id, {
              commanderStats: {
                ...player.commanderStats,
                customName: e.target.value
              }
            })}
            style={{
              ...styles.sectionTitle,
              background: 'transparent',
              border: 'none',
              color: '#d4af37',
              outline: 'none',
              width: 'auto',
              minWidth: '100px',
              cursor: 'text'
            }}
            placeholder={player.commander}
          />
          <div style={{
            ...styles.cooldownBtn,
            background: (player.commanderStats.cooldownRounds || 0) > 0
              ? 'linear-gradient(to bottom, #991b1b, #7f1d1d)'
              : 'rgba(255, 255, 255, 0.1)',
            cursor: 'default'
          }}>
            {(player.commanderStats.cooldownRounds || 0) > 0 
              ? `🔴 CD: ${player.commanderStats.cooldownRounds}` 
              : '⭕ Ready'}
          </div>
        </div>

        <div style={styles.hpRow}>
          <button
            onClick={() => handleCommanderHPChange(-1)}
            style={styles.hpBtn}
            disabled={player.commanderStats.hp === 0}
          >
            -
          </button>
          
          <div style={{ ...styles.hpDisplay, flexDirection: 'column', gap: '0.25rem' }}>
            <span style={styles.hpText}>
              {player.commanderStats.hp} / {player.commanderStats.maxHp} HP
            </span>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(player.commanderStats.hp / player.commanderStats.maxHp) * 100}%`,
                height: '100%',
                background: player.commanderStats.hp > player.commanderStats.maxHp * 0.5 
                  ? 'linear-gradient(to right, #16a34a, #22c55e)' 
                  : player.commanderStats.hp > player.commanderStats.maxHp * 0.25
                    ? 'linear-gradient(to right, #ca8a04, #eab308)'
                    : 'linear-gradient(to right, #dc2626, #ef4444)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          
          <button
            onClick={() => handleCommanderHPChange(1)}
            style={styles.hpBtn}
            disabled={player.commanderStats.hp === player.commanderStats.maxHp}
          >
            +
          </button>
        </div>

        {/* Revive Tokens & Revive Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[...Array(2)].map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  border: '3px solid',
                  borderColor: idx < (player.commanderStats.revives || 0) ? '#60a5fa' : '#4a3322',
                  background: idx < (player.commanderStats.revives || 0)
                    ? 'radial-gradient(circle, #3b82f6, #1e40af)'
                    : '#1a0f0a',
                  transition: 'all 0.3s',
                  boxShadow: idx < (player.commanderStats.revives || 0) ? '0 0 10px #3b82f6' : 'none',
                }}
                title={`Revive ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              setReviveType('commander');
              setShowReviveModal(true);
            }}
            disabled={player.commanderStats.hp > 0 || (player.commanderStats.revives || 0) === 0}
            style={{
              flex: 1,
              background: (player.commanderStats.revives || 0) > 0
                ? 'linear-gradient(to bottom, #1e40af, #1e3a8a)'
                : '#1a0f0a',
              color: (player.commanderStats.revives || 0) > 0
                ? '#bfdbfe'
                : '#4a3322',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: (player.commanderStats.revives || 0) > 0
                ? '#2563eb'
                : '#4a3322',
              cursor: (player.commanderStats.hp === 0 && (player.commanderStats.revives || 0) > 0)
                ? 'pointer'
                : 'not-allowed',
              fontFamily: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            ⟲ Revive
          </button>
        </div>

        {/* Commander Action Buttons */}
        <div style={styles.actionBtns}>
          <button
            onClick={() => onOpenCalculator(player.id, 'shoot', 'commander')}
            style={{
              ...styles.actionBtn,
              ...(player.commanderStats.hp === 0 && {
                background: 'linear-gradient(135deg, #374151, #1f2937)',
                border: '2px solid #4b5563',
                color: '#6b7280',
                cursor: 'not-allowed',
                opacity: 0.5,
                boxShadow: 'none',
              })
            }}
            disabled={player.commanderStats.hp === 0}
          >
            🎯 Shoot
          </button>
          <button
            onClick={() => onOpenCalculator(player.id, 'melee', 'commander')}
            style={{
              ...styles.actionBtn,
              ...(player.commanderStats.hp === 0 && {
                background: 'linear-gradient(135deg, #374151, #1f2937)',
                border: '2px solid #4b5563',
                color: '#6b7280',
                cursor: 'not-allowed',
                opacity: 0.5,
                boxShadow: 'none',
              })
            }}
            disabled={player.commanderStats.hp === 0}
          >
            ⚔️ Melee
          </button>
          <button
            onClick={() => onOpenCalculator(player.id, 'special', 'commander')}
            style={{
              ...styles.actionBtn,
              ...((player.commanderStats.hp === 0 || (player.commanderStats.cooldownRounds || 0) > 0) && {
                background: 'linear-gradient(135deg, #374151, #1f2937)',
                border: '2px solid #4b5563',
                color: '#6b7280',
                cursor: 'not-allowed',
                opacity: 0.5,
                boxShadow: 'none',
              })
            }}
            disabled={player.commanderStats.hp === 0 || (player.commanderStats.cooldownRounds || 0) > 0}
          >
            ⚡ Special
          </button>
        </div>

        {/* ── REVIVE SQUAD Button ── */}
        <button
          onClick={() => onOpenSquadRevive(player.id)}
          disabled={reviveQueue.length === 0}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.65rem',
            background: reviveQueue.length > 0
              ? 'linear-gradient(135deg, #92400e, #78350f)'
              : 'rgba(0,0,0,0.3)',
            border: reviveQueue.length > 0
              ? '2px solid #eab308'
              : '1px solid #374151',
            color: reviveQueue.length > 0 ? '#fde68a' : '#4b5563',
            borderRadius: '8px',
            cursor: reviveQueue.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            fontWeight: '800',
            fontSize: '0.85rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: reviveQueue.length > 0 ? '0 4px 16px rgba(234, 179, 8, 0.25)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          ⚕️ REVIVE SQUAD
          {reviveQueue.length > 0 && (
            <span style={{
              background: '#eab308',
              color: '#1a0f0a',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '900',
            }}>
              {reviveQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* Sub-Units Section */}
      <div style={styles.section}>
        <div style={{
          ...styles.sectionHeader,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setShowSquad(!showSquad)}
        >
          <h3 style={styles.sectionTitle}>
            {showSquad ? '▼' : '▶'} Squad Members (5)
            {reviveQueue.length > 0 && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7rem',
                color: '#fbbf24',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
                verticalAlign: 'middle',
              }}>
                ⚕️ {reviveQueue.length} in queue
              </span>
            )}
          </h3>
          <span style={{ color: '#8b7355', fontSize: '0.8rem' }}>
            {showSquad ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
        
        {showSquad && player.subUnits.map((unit, index) => {
          const isDead = unit.hp === 0;
          const queuePos = getQueuePosition(index);
          const isInQueue = queuePos > 0;
          const livesRemaining = unit.livesRemaining ?? unit.revives ?? 0;
          const isPermaDead = isDead && livesRemaining === 0;

          return (
            <div key={index} style={{
              ...styles.unitCard,
              opacity: isPermaDead ? 0.3 : isDead ? 0.65 : 1,
              filter: isPermaDead ? 'grayscale(1)' : isDead ? 'grayscale(0.5)' : 'none',
              border: isPermaDead
                ? '2px solid #450a0a'
                : isInQueue
                  ? '2px solid rgba(234, 179, 8, 0.5)'
                  : isDead
                    ? '2px solid #7f1d1d'
                    : '1px solid rgba(212, 175, 55, 0.2)',
              transition: 'all 0.3s',
              position: 'relative',
            }}>
              {/* Dead badge + queue number overlay */}
              {isDead && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  zIndex: 1,
                }}>
                  {isInQueue ? (
                    <div style={{
                      background: 'linear-gradient(135deg, #92400e, #78350f)',
                      border: '2px solid #eab308',
                      borderRadius: '20px',
                      padding: '0.15rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: '900',
                      color: '#fde68a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      💀 <span>#{queuePos}</span>
                    </div>
                  ) : (
                    <div style={{
                      background: '#1a0000',
                      border: '1px solid #450a0a',
                      borderRadius: '20px',
                      padding: '0.15rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#7f1d1d',
                    }}>
                      💀 GONE
                    </div>
                  )}
                </div>
              )}

              {/* Unit Header */}
              <div style={styles.unitHeader}>
                <input
                  type="text"
                  value={unit.name}
                  onChange={(e) => handleSubUnitNameChange(index, e.target.value)}
                  placeholder={index === 0 ? '⭐ Special Unit' : `🛡️ Soldier ${index}`}
                  style={styles.unitNameInput}
                />
              </div>

              {/* HP Controls */}
              <div style={styles.unitHPRow}>
                <button
                  onClick={() => handleSubUnitHPChange(index, -1)}
                  style={styles.smallBtn}
                  disabled={isDead}
                >
                  -
                </button>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ ...styles.unitHP, textAlign: 'center' }}>
                    {unit.hp}/{unit.maxHp} HP
                  </span>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(unit.hp / unit.maxHp) * 100}%`,
                      height: '100%',
                      background: unit.hp > unit.maxHp * 0.5 
                        ? 'linear-gradient(to right, #16a34a, #22c55e)' 
                        : unit.hp > unit.maxHp * 0.25
                          ? 'linear-gradient(to right, #ca8a04, #eab308)'
                          : 'linear-gradient(to right, #dc2626, #ef4444)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
                
                <button
                  onClick={() => handleSubUnitHPChange(index, 1)}
                  style={styles.smallBtn}
                  disabled={unit.hp === unit.maxHp}
                >
                  +
                </button>
              </div>

              {/* Lives remaining pips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600' }}>LIVES:</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[...Array(2)].map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: idx < livesRemaining ? '#eab308' : '#374151',
                        background: idx < livesRemaining
                          ? 'radial-gradient(circle, #eab308, #92400e)'
                          : '#111',
                        boxShadow: idx < livesRemaining ? '0 0 6px #eab30880' : 'none',
                        transition: 'all 0.3s',
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: '#78716c', fontSize: '0.7rem' }}>
                  {livesRemaining} remaining
                </span>
              </div>

              {/* Unit Action Buttons */}
              <div style={styles.unitActionBtns}>
                <button
                  onClick={() => onOpenCalculator(player.id, 'shoot', index === 0 ? 'special' : `soldier${index}`)}
                  style={{
                    ...styles.unitActionBtn,
                    ...(isDead && {
                      background: 'linear-gradient(135deg, #374151, #1f2937)',
                      border: '2px solid #4b5563',
                      color: '#6b7280',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                      boxShadow: 'none',
                    })
                  }}
                  disabled={isDead}
                >
                  🎯 SHOOT
                </button>
                <button
                  onClick={() => onOpenCalculator(player.id, 'melee', index === 0 ? 'special' : `soldier${index}`)}
                  style={{
                    ...styles.unitActionBtn,
                    ...(isDead && {
                      background: 'linear-gradient(135deg, #374151, #1f2937)',
                      border: '2px solid #4b5563',
                      color: '#6b7280',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                      boxShadow: 'none',
                    })
                  }}
                  disabled={isDead}
                >
                  ⚔️ MELEE
                </button>
              </div>
            </div>
          );
        })}


      </div>

      {/* Commander Revive Confirmation Modal */}
      {showReviveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowReviveModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: '3px solid #d4af37',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <h3 style={{
              color: '#d4af37',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              textAlign: 'center',
              fontFamily: '"Cinzel", Georgia, serif',
            }}>
              🎲 Revive Roll
            </h3>
            
            <p style={{
              color: '#e8dcc4',
              textAlign: 'center',
              marginBottom: '2rem',
              fontSize: '1rem',
            }}>
              Was the revive roll successful?
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              padding: '0 1.5rem',
              justifyItems: 'center',
            }}>
              <button
                onClick={() => {
                  onUseRevive(player.id, true);
                  setShowReviveModal(false);
                }}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  border: '2px solid #10b981',
                  color: '#d1fae5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: '700',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                ✓ Successful
              </button>
              
              <button
                onClick={() => {
                  onUseRevive(player.id, false);
                  setShowReviveModal(false);
                }}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
                  border: '2px solid #dc2626',
                  color: '#fecaca',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: '700',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                ✗ Unsuccessful
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.85))',
    borderRadius: '12px',
    padding: '1rem',
    fontFamily: '"Rajdhani", "Cinzel", sans-serif',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    maxHeight: '85vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
  },
  nameInput: {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    color: '#fbbf24',
    fontSize: '1.1rem',
    fontWeight: '700',
    fontFamily: 'inherit',
    letterSpacing: '0.05em',
  },
  removeBtn: {
    background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
    border: '1px solid #dc2626',
    color: '#fecaca',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '1rem',
  },
  selectionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  select: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    padding: '0.65rem',
    color: '#e8dcc4',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  section: {
    marginBottom: '0.75rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    margin: 0,
    color: '#f59e0b',
    fontSize: '1rem',
    fontWeight: '800',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  cooldownBtn: {
    padding: '0.35rem 0.75rem',
    border: '1px solid',
    borderRadius: '6px',
    fontFamily: 'inherit',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  hpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  hpBtn: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
    border: '2px solid rgba(245, 158, 11, 0.5)',
    color: '#fbbf24',
    padding: '0.65rem 1.25rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '800',
    fontSize: '1.2rem',
    transition: 'all 0.2s',
  },
  hpDisplay: {
    flex: 1,
    padding: '0.5rem',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
  },
  hpText: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fde68a',
    letterSpacing: '0.05em',
  },
  actionBtns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
    border: '2px solid #3b82f6',
    color: '#dbeafe',
    padding: '0.85rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '700',
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    transition: 'all 0.2s',
  },
  reviveBtn: {
    background: 'linear-gradient(135deg, #0891b2, #0e7490)',
    border: '2px solid #06b6d4',
    color: '#cffafe',
    padding: '0.65rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '700',
    fontSize: '0.85rem',
    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
    transition: 'all 0.2s',
  },
  unitCard: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '0.5rem',
  },
  unitNameInput: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    padding: '0.5rem',
    color: '#c4b5fd',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  unitHPRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  unitHP: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#a78bfa',
  },
  smallBtn: {
    background: 'rgba(139, 92, 246, 0.2)',
    border: '2px solid rgba(139, 92, 246, 0.5)',
    color: '#c4b5fd',
    padding: '0.85rem 1.25rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '1.2rem',
    minWidth: '50px',
    minHeight: '50px',
  },
  unitActionBtns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  unitActionBtn: {
    background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
    border: '2px solid #3b82f6',
    color: '#dbeafe',
    padding: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '700',
    fontSize: '0.95rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    minHeight: '54px',
  },
  unitActions: {
    display: 'flex',
    gap: '0.35rem',
    flexWrap: 'wrap',
  },
  iconBtn: {
    background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
    border: '1px solid #3b82f6',
    color: '#dbeafe',
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  reviveCircle: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid',
    marginRight: '0.25rem',
  },
  unitHeader: {
    marginBottom: '0.25rem',
  },
};

export default PlayerCard;