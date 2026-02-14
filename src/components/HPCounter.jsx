import React, { useState, useEffect } from 'react';

// Faction data
const FACTIONS = {
  'Red Rovers': ['Lord Fantastic', 'Murder Bot 9000', 'Ganj the Squatch', 'Kandu Krow', 'The Glitch'],
  'Space Aliens': ['The Gray', 'Prisma K', 'Selfcentrica Space Pony Princess', 'Queen of Fandom'],
  'NoLobe Zombies': ['Prisma K', 'The Gray'],
  'Murder Bots': ['Murder Bot 9000', 'Lord Fantastic'],
  'Monster': ['Ganj the Squatch', 'Kandu Krow'],
  'Space Pony': ['Selfcentrica Space Pony Princess', 'Queen of Fandom', 'The Glitch'],
  'Uncivilized': ['Kronk']
};

// Commander stats data
const COMMANDER_STATS = {
  'Lord Fantastic': {
    walk: '6"',
    run: '12"',
    shootRange: '8"',
    shootDamage: '1hp',
    rollToHit: '2+',
    rollToBlock: '2+',
    attacksPerHit: '4x',
    meleeDamage: '5hp',
    rollToHeal: '2+',
    special: '4"/2hp',
    shootAbility: '⛔',
    specialAbility: '💔'
  },
  'The Gray': {
    walk: '6"',
    run: '12"',
    shootRange: '12"',
    shootDamage: '1hp',
    rollToHit: '4+',
    rollToBlock: '5+',
    attacksPerHit: '2x',
    meleeDamage: '2hp',
    rollToHeal: '5+',
    special: '6"/2hp',
    shootAbility: '',
    specialAbility: ''
  },
  'Prisma K': {
    walk: '5"',
    run: '12"',
    shootRange: '8"',
    shootDamage: '1hp',
    rollToHit: '2+',
    rollToBlock: '2+',
    attacksPerHit: '4x',
    meleeDamage: '5hp',
    rollToHeal: '2+',
    special: '4"/2hp',
    shootAbility: '⛔',
    specialAbility: '💔'
  },
  'Murder Bot 9000': {
    walk: '4"',
    run: '12"',
    shootRange: '12"',
    shootDamage: '1hp',
    rollToHit: '3+',
    rollToBlock: '2+',
    attacksPerHit: '4x',
    meleeDamage: '4hp',
    rollToHeal: '3+',
    special: '4"/2hp',
    shootAbility: '⛔',
    specialAbility: '💔'
  },
  'Ganj the Squatch': {
    walk: '8"',
    run: '12"',
    shootRange: '16"',
    shootDamage: '1hp',
    rollToHit: '3+',
    rollToBlock: '4+',
    attacksPerHit: '2x',
    meleeDamage: '3hp',
    rollToHeal: '4+',
    special: '8"/2hp',
    shootAbility: '',
    specialAbility: '💔'
  },
  'Selfcentrica Space Pony Princess': {
    walk: '8"',
    run: '24"',
    shootRange: '8"',
    shootDamage: '1hp',
    rollToHit: '3+',
    rollToBlock: '3+',
    attacksPerHit: '2x',
    meleeDamage: '4hp',
    rollToHeal: '4+',
    special: '4"/2hp',
    shootAbility: '⛔',
    specialAbility: '💔'
  },
  'Kronk': {
    walk: '8"',
    run: '12"',
    shootRange: '12"',
    shootDamage: '1hp',
    rollToHit: '3+',
    rollToBlock: '3+',
    attacksPerHit: '2x',
    meleeDamage: '4hp',
    rollToHeal: '4+',
    special: '4"/2hp',
    shootAbility: '⛔',
    specialAbility: '⛔'
  },
  'Queen of Fandom': {
    walk: '6"',
    run: '12"',
    shootRange: '8"',
    shootDamage: '1hp',
    rollToHit: '2+',
    rollToBlock: '3+',
    attacksPerHit: '4x',
    meleeDamage: '4hp',
    rollToHeal: '3+',
    special: '6"/2hp',
    shootAbility: '⛔',
    specialAbility: '💔'
  },
  'Kandu Krow': {
    walk: '6"',
    run: '18"',
    shootRange: '12"',
    shootDamage: '1hp',
    rollToHit: '2+',
    rollToBlock: '4+',
    attacksPerHit: '2x',
    meleeDamage: '3hp',
    rollToHeal: '4+',
    special: '6"/2hp',
    shootAbility: '',
    specialAbility: '⛔'
  },
  'The Glitch': {
    walk: '8"',
    run: '16"',
    shootRange: '16"',
    shootDamage: '1hp',
    rollToHit: '4+',
    rollToBlock: '5+',
    attacksPerHit: '2x',
    meleeDamage: '2hp',
    rollToHeal: '5+',
    special: '8"/2hp',
    shootAbility: '',
    specialAbility: ''
  }
};

// Faction stats data
const FACTION_STATS = {
  'Red Rovers': {
    walk: '6"',
    run: '12"',
    rollToHit: '4+',
    rollToBlock: '4+',
    rollToHeal: '4+',
    shootRange: '12"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '6"/2hp'
  },
  'Space Aliens': {
    walk: '6"',
    run: '12"',
    rollToHit: '3+',
    rollToBlock: '5+',
    rollToHeal: '4+',
    shootRange: '12"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '6"/2hp'
  },
  'NoLobe Zombies': {
    walk: '4"',
    run: '12"',
    rollToHit: '6+',
    rollToBlock: '3+',
    rollToHeal: '2+',
    shootRange: '8"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '4"/2hp'
  },
  'Murder Bots': {
    walk: '4"',
    run: '12"',
    rollToHit: '5+',
    rollToBlock: '3+',
    rollToHeal: '3+',
    shootRange: '8"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '4"/2hp'
  },
  'Monster': {
    walk: '8"',
    run: '12"',
    rollToHit: '3+',
    rollToBlock: '5+',
    rollToHeal: '5+',
    shootRange: '16"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '8"/2hp'
  },
  'Space Pony': {
    walk: '8"',
    run: '12"',
    rollToHit: '2+',
    rollToBlock: '5+',
    rollToHeal: '6+',
    shootRange: '8"',
    shootDamage: '1hp',
    attacksPerHit: '1x',
    meleeDamage: '1hp',
    special: '8"/2hp'
  },
  'Uncivilized': {
    caveman: {
      walk: '6"',
      run: '12"',
      rollToHit: '5+',
      rollToBlock: '3+',
      rollToHeal: '5+',
      shootRange: '8"',
      shootDamage: '1hp',
      attacksPerHit: '2x',
      meleeDamage: '1hp',
      special: '4"/2hp',
      specialAbility: '⛔'
    },
    dinosaur: {
      walk: '8"',
      run: '16"',
      rollToHit: '5+',
      rollToBlock: '3+',
      rollToHeal: '5+',
      shootRange: '8"',
      shootDamage: '1hp',
      attacksPerHit: '2x',
      meleeDamage: '1hp',
      special: '4"/1hp',
      specialAbility: '💔'
    }
  }
};

const HPCounter = () => {
  const [players, setPlayers] = useState([]);
  const [turnCounter, setTurnCounter] = useState(1);

  // Auto-disable cooldowns after 1 turn has passed
  useEffect(() => {
    setPlayers(prevPlayers => prevPlayers.map(p => {
      // Check if commander cooldown should be disabled
      const shouldDisableCooldown = p.commanderStats.cooldown && 
                                      p.commanderStats.cooldownTurn !== null && 
                                      turnCounter > p.commanderStats.cooldownTurn + 1;
      
      if (shouldDisableCooldown) {
        return {
          ...p,
          commanderStats: {
            ...p.commanderStats,
            cooldown: false,
            cooldownTurn: null
          }
        };
      }
      return p;
    }));
  }, [turnCounter]);

  const createNewPlayer = () => ({
    id: Date.now(),
    playerName: '',
    faction: '',
    commander: '',
    showDropdowns: true,
    commanderStats: {
      currentHP: 15,
      maxHP: 15,
      revives: 2,
      isDead: false,
      cooldown: false,
      cooldownTurn: null // Track which turn cooldown was activated
    },
    subUnits: Array(5).fill(null).map((_, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: '',
      unitType: '',
      currentHP: 8,
      maxHP: 8,
      revives: 2,
      isDead: false,
      cooldown: false
    }))
  });

  const addPlayer = () => {
    setPlayers([...players, createNewPlayer()]);
  };

  const resetPlayer = (playerId) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          commanderStats: {
            currentHP: 15,
            maxHP: 15,
            revives: 2,
            isDead: false,
            cooldown: false,
            cooldownTurn: null
          },
          subUnits: p.subUnits.map(unit => ({
            ...unit,
            currentHP: 8,
            maxHP: 8,
            revives: 2,
            isDead: false,
            cooldown: false
          }))
        };
      }
      return p;
    }));
  };

  const toggleCommanderCooldown = (playerId) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const newCooldown = !p.commanderStats.cooldown;
        return {
          ...p,
          commanderStats: {
            ...p.commanderStats,
            cooldown: newCooldown,
            cooldownTurn: newCooldown ? turnCounter : null
          }
        };
      }
      return p;
    }));
  };

  const toggleSubUnitCooldown = (playerId, subUnitId) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const subUnits = p.subUnits.map(unit => {
          if (unit.id === subUnitId) {
            return { ...unit, cooldown: !unit.cooldown };
          }
          return unit;
        });
        return { ...p, subUnits };
      }
      return p;
    }));
  };

  const removePlayer = (playerId) => {
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const updatePlayer = (playerId, field, value) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const updated = { ...p, [field]: value };
        // Reset commander when faction changes
        if (field === 'faction') {
          updated.commander = '';
        }
        return updated;
      }
      return p;
    }));
  };

  const updateCommanderHP = (playerId, delta) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const stats = { ...p.commanderStats };
        const newHP = Math.max(0, Math.min(stats.maxHP, stats.currentHP + delta));
        const isDead = newHP === 0 && stats.revives === 0;
        stats.currentHP = newHP;
        stats.isDead = isDead;
        return { ...p, commanderStats: stats };
      }
      return p;
    }));
  };

  const useRevive = (playerId, isCommander = true, subUnitId = null) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        if (isCommander) {
          const stats = { ...p.commanderStats };
          if (stats.revives > 0) {
            stats.revives -= 1;
            stats.maxHP = Math.floor(stats.maxHP / 2);
            stats.currentHP = stats.maxHP;
            stats.isDead = false; // Reset isDead when reviving
          }
          return { ...p, commanderStats: stats };
        } else {
          const subUnits = p.subUnits.map(unit => {
            if (unit.id === subUnitId && unit.revives > 0) {
              const newMaxHP = Math.floor(unit.maxHP / 2);
              const newRevives = unit.revives - 1;
              return {
                ...unit,
                revives: newRevives,
                maxHP: newMaxHP,
                currentHP: newMaxHP,
                isDead: false // Reset isDead when reviving
              };
            }
            return unit;
          });
          return { ...p, subUnits };
        }
      }
      return p;
    }));
  };

  const updateSubUnitHP = (playerId, subUnitId, delta) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const subUnits = p.subUnits.map(unit => {
          if (unit.id === subUnitId) {
            const newHP = Math.max(0, Math.min(unit.maxHP, unit.currentHP + delta));
            const isDead = newHP === 0 && unit.revives === 0;
            return { ...unit, currentHP: newHP, isDead };
          }
          return unit;
        });
        return { ...p, subUnits };
      }
      return p;
    }));
  };

  const updateSubUnit = (playerId, subUnitId, field, value) => {
    setPlayers(players.map(p => {
      if (p.id === playerId) {
        const subUnits = p.subUnits.map(unit => {
          if (unit.id === subUnitId) {
            return { ...unit, [field]: value };
          }
          return unit;
        });
        return { ...p, subUnits };
      }
      return p;
    }));
  };

  const toggleDropdowns = (playerId) => {
    setPlayers(players.map(p => 
      p.id === playerId ? { ...p, showDropdowns: !p.showDropdowns } : p
    ));
  };

  const getHPColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGradientStyle = (current, max) => {
    const percentage = (current / max) * 100;
    // Green to Yellow to Red gradient
    let color;
    if (percentage >= 50) {
      // Green to Yellow (100% -> 50%)
      const greenToYellow = ((percentage - 50) / 50) * 100;
      color = `rgb(${255 - greenToYellow * 2.55}, 255, 0)`;
    } else {
      // Yellow to Red (50% -> 0%)
      const yellowToRed = (percentage / 50) * 100;
      color = `rgb(255, ${yellowToRed * 2.55}, 0)`;
    }
    return { backgroundColor: color, width: `${percentage}%` };
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(to bottom, #0a0604, #1a0f0a, #0a0604)',
      padding: '2rem',
      fontFamily: '"Cinzel", Georgia, serif',
      margin: 0,
      boxSizing: 'border-box',
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(139, 92, 46, 0.05) 0%, transparent 50%), 
        radial-gradient(circle at 80% 80%, rgba(139, 92, 46, 0.05) 0%, transparent 50%),
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)
      `,
      position: 'relative'
    }}>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=MedievalSharp&display=swap');
      `}</style>
      <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: '#c9a961',
          marginBottom: '1rem',
          textAlign: 'center',
          textShadow: '4px 4px 8px rgba(0,0,0,1), 0 0 30px rgba(201, 169, 97, 0.4), 0 0 10px rgba(0,0,0,0.8)',
          letterSpacing: '6px',
          fontFamily: '"Cinzel", Georgia, serif',
          borderBottom: '4px double #c9a961',
          borderTop: '4px double #c9a961',
          paddingBottom: '1rem',
          paddingTop: '1rem',
          position: 'relative',
          background: 'linear-gradient(to bottom, rgba(26, 15, 10, 0.8), rgba(15, 8, 5, 0.9))',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        }}>⚔ SPACE WARS ⚔</h1>

        {/* Turn Counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '3px double #c9a961',
          boxShadow: '0 10px 30px rgba(0,0,0,0.9), inset 0 2px 8px rgba(201, 169, 97, 0.15), 0 0 20px rgba(201, 169, 97, 0.1)',
          maxWidth: '500px',
          margin: '0 auto 2rem auto',
          position: 'relative'
        }}>
          <button
            onClick={() => setTurnCounter(Math.max(1, turnCounter - 1))}
            style={{
              background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
              color: '#fecaca',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '600',
              border: '2px solid #dc2626',
              cursor: 'pointer',
              fontSize: '1.25rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #7f1d1d, #991b1b)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #991b1b, #7f1d1d)'}
          >
            -
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#c9a961',
              textShadow: '3px 3px 6px rgba(0,0,0,1), 0 0 15px rgba(201, 169, 97, 0.4)',
              fontFamily: '"Cinzel", Georgia, serif',
              minWidth: '150px',
              textAlign: 'center'
            }}>
              Turn {turnCounter}
            </div>
            
            {/* Reset Button */}
            <button
              onClick={() => {
                setTurnCounter(1);
                // Reset all commander cooldowns
                setPlayers(players.map(p => ({
                  ...p,
                  commanderStats: {
                    ...p.commanderStats,
                    cooldown: false,
                    cooldownTurn: null
                  }
                })));
              }}
              style={{
                background: 'linear-gradient(to bottom, #92400e, #78350f)',
                color: '#fef3c7',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontWeight: '600',
                border: '2px solid #a16207',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: '"Cinzel", Georgia, serif',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #a16207, #92400e)'}
              onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #92400e, #78350f)'}
            >
              🔄 Reset
            </button>
          </div>
          
          <button
            onClick={() => setTurnCounter(turnCounter + 1)}
            style={{
              background: 'linear-gradient(to bottom, #15803d, #14532d)',
              color: '#86efac',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '600',
              border: '2px solid #16a34a',
              cursor: 'pointer',
              fontSize: '1.25rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #14532d, #15803d)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #15803d, #14532d)'}
          >
            +
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {players.map((player) => (
            <div key={player.id} style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.9), inset 0 1px 4px rgba(201, 169, 97, 0.1), 0 0 15px rgba(0,0,0,0.8)',
              border: '3px solid #5a4a3a',
              borderTop: '3px solid #6b5a4a',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Player Name"
                  value={player.playerName}
                  onChange={(e) => updatePlayer(player.id, 'playerName', e.target.value)}
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    background: '#1a0f0a',
                    color: '#d4af37',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    flex: '1',
                    marginRight: '1rem',
                    border: '2px solid #6b4423',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => resetPlayer(player.id)}
                    style={{
                      background: 'linear-gradient(to bottom, #4a5568, #2d3748)',
                      color: '#e2e8f0',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      border: '2px solid #4a5568',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontFamily: '"Cinzel", Georgia, serif'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #5a6678, #3d4858)'}
                    onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #4a5568, #2d3748)'}
                  >
                    🔄 Reset
                  </button>
                  <button
                    onClick={() => removePlayer(player.id)}
                    style={{
                      background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)',
                      color: '#fecaca',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      border: '2px solid #991b1b',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontFamily: '"Cinzel", Georgia, serif'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #991b1b, #7f1d1d)'}
                    onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)'}
                  >
                    ❌ Remove
                  </button>
                </div>
              </div>

              {/* Dropdowns */}
              {player.showDropdowns && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <select
                    value={player.faction}
                    onChange={(e) => updatePlayer(player.id, 'faction', e.target.value)}
                    style={{
                      background: '#1a0f0a',
                      color: '#d4af37',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '2px solid #6b4423',
                      outline: 'none',
                      fontSize: '1rem',
                      fontFamily: '"Cinzel", Georgia, serif',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select Faction</option>
                    {Object.keys(FACTIONS).map(faction => (
                      <option key={faction} value={faction}>{faction}</option>
                    ))}
                  </select>

                  <select
                    value={player.commander}
                    onChange={(e) => updatePlayer(player.id, 'commander', e.target.value)}
                    disabled={!player.faction}
                    style={{
                      background: '#1a0f0a',
                      color: '#d4af37',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '2px solid #6b4423',
                      outline: 'none',
                      fontSize: '1rem',
                      fontFamily: '"Cinzel", Georgia, serif',
                      cursor: player.faction ? 'pointer' : 'not-allowed',
                      opacity: player.faction ? 1 : 0.5
                    }}
                  >
                    <option value="">Select Commander</option>
                    {player.faction && FACTIONS[player.faction].map(cmd => (
                      <option key={cmd} value={cmd}>{cmd}</option>
                    ))}
                  </select>
                </div>
              )}

              {player.faction && player.commander && (
                <button
                  onClick={() => toggleDropdowns(player.id)}
                  style={{
                    color: '#93c5fd',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: '"Cinzel", Georgia, serif',
                    transition: 'color 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#60a5fa'}
                  onMouseLeave={(e) => e.target.style.color = '#93c5fd'}
                >
                  {player.showDropdowns ? '▲ Collapse' : '▼ Expand'} Dropdowns
                </button>
              )}

              {/* Commander Section */}
              {player.commander && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(145deg, #120a06, #0a0503)',
                  borderRadius: '10px',
                  transition: 'opacity 0.3s',
                  opacity: player.commanderStats.isDead ? 0.3 : 1,
                  border: '2px solid #c9a961',
                  borderLeft: '4px solid #c9a961',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.8), inset 0 1px 3px rgba(201, 169, 97, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#c9a961',
                      textShadow: '2px 2px 4px rgba(0,0,0,1), 0 0 10px rgba(201, 169, 97, 0.3)',
                      margin: 0
                    }}>⚔️ {player.commander}</h3>
                    
                    {/* Commander Stats */}
                    {COMMANDER_STATS[player.commander] && (
                      <div style={{
                        background: '#0a0503',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #5a4a3a',
                        flex: 1,
                        marginLeft: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)'
                      }}>
                        {/* Row 1: Movement & Combat */}
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '0.25rem',
                          fontSize: '0.875rem',
                          color: '#c9a961'
                        }}>
                          <span style={{ minWidth: '2.5rem' }}>🚶{COMMANDER_STATS[player.commander].walk}</span>
                          <span style={{ minWidth: '3rem' }}>🏃{COMMANDER_STATS[player.commander].run}</span>
                          <span style={{ minWidth: '5.5rem' }}>
                            🎯{COMMANDER_STATS[player.commander].shootRange}/{COMMANDER_STATS[player.commander].shootDamage}
                            {COMMANDER_STATS[player.commander].shootAbility && ` ${COMMANDER_STATS[player.commander].shootAbility}`}
                          </span>
                          <span style={{ minWidth: '2.5rem' }}>⚔️{COMMANDER_STATS[player.commander].rollToHit}</span>
                          <span style={{ minWidth: '2.5rem' }}>🛡️{COMMANDER_STATS[player.commander].rollToBlock}</span>
                        </div>
                        {/* Row 2: Damage & Healing */}
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#c9a961'
                        }}>
                          <span style={{ minWidth: '2.5rem' }}>💥{COMMANDER_STATS[player.commander].attacksPerHit}</span>
                          <span style={{ minWidth: '3rem' }}>🗡️{COMMANDER_STATS[player.commander].meleeDamage}</span>
                          <span style={{ minWidth: '5.5rem' }}>
                            ⚡{COMMANDER_STATS[player.commander].special}
                            {COMMANDER_STATS[player.commander].specialAbility && ` ${COMMANDER_STATS[player.commander].specialAbility}`}
                          </span>
                          <span style={{ minWidth: '2.5rem' }}>💚{COMMANDER_STATS[player.commander].rollToHeal}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* HP Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c9a961', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>HP</span>
                      <span style={{ fontWeight: 'bold', color: '#c9a961' }}>{player.commanderStats.currentHP} / {player.commanderStats.maxHP}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '1.5rem',
                      background: '#0a0503',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '2px solid #5a4a3a',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)'
                    }}>
                      <div
                        style={Object.assign(
                          { height: '100%', transition: 'all 0.3s' },
                          getGradientStyle(player.commanderStats.currentHP, player.commanderStats.maxHP)
                        )}
                      />
                    </div>
                  </div>

                  {/* Revive Circles */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[...Array(2)].map((_, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '999px',
                          border: '3px solid',
                          borderColor: idx < player.commanderStats.revives ? '#60a5fa' : '#4a3322',
                          background: idx < player.commanderStats.revives ? 
                            'radial-gradient(circle, #3b82f6, #1e40af)' : '#1a0f0a',
                          transition: 'all 0.3s',
                          boxShadow: idx < player.commanderStats.revives ? '0 0 10px #3b82f6' : 'none'
                        }}
                      />
                    ))}
                    {/* Cooldown Token (non-clickable) */}
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '999px',
                        border: '3px solid',
                        borderColor: player.commanderStats.cooldown ? '#eab308' : '#4a3322',
                        background: player.commanderStats.cooldown ? 
                          'radial-gradient(circle, #fbbf24, #eab308)' : '#1a0f0a',
                        transition: 'all 0.3s',
                        boxShadow: player.commanderStats.cooldown ? '0 0 10px #eab308' : 'none'
                      }}
                    />
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateCommanderHP(player.id, 1)}
                      disabled={player.commanderStats.isDead}
                      style={{
                        background: player.commanderStats.isDead ? '#1a0f0a' : 'linear-gradient(to bottom, #15803d, #14532d)',
                        color: player.commanderStats.isDead ? '#4a3322' : '#86efac',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: '2px solid',
                        borderColor: player.commanderStats.isDead ? '#4a3322' : '#16a34a',
                        cursor: player.commanderStats.isDead ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontSize: '1rem'
                      }}
                    >
                      + HP
                    </button>
                    <button
                      onClick={() => updateCommanderHP(player.id, -1)}
                      disabled={player.commanderStats.isDead}
                      style={{
                        background: player.commanderStats.isDead ? '#1a0f0a' : 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
                        color: player.commanderStats.isDead ? '#4a3322' : '#fecaca',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: '2px solid',
                        borderColor: player.commanderStats.isDead ? '#4a3322' : '#dc2626',
                        cursor: player.commanderStats.isDead ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontSize: '1rem'
                      }}
                    >
                      - HP
                    </button>
                    <button
                      onClick={() => useRevive(player.id, true)}
                      disabled={player.commanderStats.revives === 0}
                      style={{
                        background: player.commanderStats.revives === 0 ? '#1a0f0a' : 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
                        color: player.commanderStats.revives === 0 ? '#4a3322' : '#bfdbfe',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: '2px solid',
                        borderColor: player.commanderStats.revives === 0 ? '#4a3322' : '#2563eb',
                        cursor: player.commanderStats.revives === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontSize: '1rem'
                      }}
                    >
                      ⟲ Revive
                    </button>
                    <button
                      onClick={() => toggleCommanderCooldown(player.id)}
                      style={{
                        background: player.commanderStats.cooldown ? 
                          'linear-gradient(to bottom, #ca8a04, #a16207)' : 
                          'linear-gradient(to bottom, #78716c, #57534e)',
                        color: player.commanderStats.cooldown ? '#fef3c7' : '#d6d3d1',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: '2px solid',
                        borderColor: player.commanderStats.cooldown ? '#eab308' : '#78716c',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontSize: '1rem',
                        boxShadow: player.commanderStats.cooldown ? '0 0 10px #eab308' : 'none'
                      }}
                    >
                      ⏱ Cooldown
                    </button>
                  </div>
                </div>
              )}

              {/* Sub Units */}
              {player.commander && (
                <div>
                  {/* Faction Name Header */}
                  <h4 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: '#c9a961',
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                    textShadow: '2px 2px 4px rgba(0,0,0,1)',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}>
                    {player.faction}
                  </h4>

                  {/* Faction Stats */}
                  {player.faction && FACTION_STATS[player.faction] && (
                    <div style={{
                      background: '#1a0f0a',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      border: '1px solid #4a3322'
                    }}>
                      {player.faction === 'Uncivilized' ? (
                        // Special handling for Uncivilized - show both Caveman and Dinosaur stats
                        <>
                          {/* Caveman Stats */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              fontWeight: 'bold',
                              marginBottom: '0.25rem',
                              fontFamily: '"Cinzel", Georgia, serif',
                              textAlign: 'center'
                            }}>
                              🦴 Caveman
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginBottom: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              justifyContent: 'center'
                            }}>
                              <span style={{ minWidth: '2rem' }}>🚶{FACTION_STATS['Uncivilized'].caveman.walk}</span>
                              <span style={{ minWidth: '2.5rem' }}>🏃{FACTION_STATS['Uncivilized'].caveman.run}</span>
                              <span style={{ minWidth: '3.5rem' }}>🎯{FACTION_STATS['Uncivilized'].caveman.shootRange}/{FACTION_STATS['Uncivilized'].caveman.shootDamage}</span>
                              <span style={{ minWidth: '2rem' }}>⚔️{FACTION_STATS['Uncivilized'].caveman.rollToHit}</span>
                              <span style={{ minWidth: '2rem' }}>🛡️{FACTION_STATS['Uncivilized'].caveman.rollToBlock}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              justifyContent: 'center'
                            }}>
                              <span style={{ minWidth: '2rem' }}>💥{FACTION_STATS['Uncivilized'].caveman.attacksPerHit}</span>
                              <span style={{ minWidth: '2.5rem' }}>🗡️{FACTION_STATS['Uncivilized'].caveman.meleeDamage}</span>
                              <span style={{ minWidth: '3.5rem' }}>⚡{FACTION_STATS['Uncivilized'].caveman.special} {FACTION_STATS['Uncivilized'].caveman.specialAbility}</span>
                              <span style={{ minWidth: '2rem' }}>💚{FACTION_STATS['Uncivilized'].caveman.rollToHeal}</span>
                            </div>
                          </div>
                          {/* Dinosaur Stats */}
                          <div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              fontWeight: 'bold',
                              marginBottom: '0.25rem',
                              fontFamily: '"Cinzel", Georgia, serif',
                              textAlign: 'center'
                            }}>
                              🦖 Dinosaur
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginBottom: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              justifyContent: 'center'
                            }}>
                              <span style={{ minWidth: '2rem' }}>🚶{FACTION_STATS['Uncivilized'].dinosaur.walk}</span>
                              <span style={{ minWidth: '2.5rem' }}>🏃{FACTION_STATS['Uncivilized'].dinosaur.run}</span>
                              <span style={{ minWidth: '3.5rem' }}>🎯{FACTION_STATS['Uncivilized'].dinosaur.shootRange}/{FACTION_STATS['Uncivilized'].dinosaur.shootDamage}</span>
                              <span style={{ minWidth: '2rem' }}>⚔️{FACTION_STATS['Uncivilized'].dinosaur.rollToHit}</span>
                              <span style={{ minWidth: '2rem' }}>🛡️{FACTION_STATS['Uncivilized'].dinosaur.rollToBlock}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#d4af37',
                              justifyContent: 'center'
                            }}>
                              <span style={{ minWidth: '2rem' }}>💥{FACTION_STATS['Uncivilized'].dinosaur.attacksPerHit}</span>
                              <span style={{ minWidth: '2.5rem' }}>🗡️{FACTION_STATS['Uncivilized'].dinosaur.meleeDamage}</span>
                              <span style={{ minWidth: '3.5rem' }}>⚡{FACTION_STATS['Uncivilized'].dinosaur.special} {FACTION_STATS['Uncivilized'].dinosaur.specialAbility}</span>
                              <span style={{ minWidth: '2rem' }}>💚{FACTION_STATS['Uncivilized'].dinosaur.rollToHeal}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Regular faction stats
                        <>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginBottom: '0.25rem',
                            fontSize: '0.75rem',
                            color: '#d4af37',
                            justifyContent: 'center'
                          }}>
                            <span style={{ minWidth: '2rem' }}>🚶{FACTION_STATS[player.faction].walk}</span>
                            <span style={{ minWidth: '2.5rem' }}>🏃{FACTION_STATS[player.faction].run}</span>
                            <span style={{ minWidth: '3.5rem' }}>🎯{FACTION_STATS[player.faction].shootRange}/{FACTION_STATS[player.faction].shootDamage}</span>
                            <span style={{ minWidth: '2rem' }}>⚔️{FACTION_STATS[player.faction].rollToHit}</span>
                            <span style={{ minWidth: '2rem' }}>🛡️{FACTION_STATS[player.faction].rollToBlock}</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            color: '#d4af37',
                            justifyContent: 'center'
                          }}>
                            <span style={{ minWidth: '2rem' }}>💥{FACTION_STATS[player.faction].attacksPerHit}</span>
                            <span style={{ minWidth: '2.5rem' }}>🗡️{FACTION_STATS[player.faction].meleeDamage}</span>
                            <span style={{ minWidth: '3.5rem' }}>⚡{FACTION_STATS[player.faction].special}</span>
                            <span style={{ minWidth: '2rem' }}>💚{FACTION_STATS[player.faction].rollToHeal}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                  {player.subUnits.map((unit, index) => (
                    <div
                      key={unit.id}
                      style={{
                        background: index === 0 
                          ? 'linear-gradient(145deg, #3d2f1a, #2a1f10)' 
                          : 'linear-gradient(145deg, #2a1810, #1f120c)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        transition: 'opacity 0.3s',
                        opacity: unit.isDead ? 0.4 : 1,
                        border: index === 0 ? '2px solid #d4af37' : '2px solid #6b4423',
                        position: 'relative',
                        boxShadow: index === 0 ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none'
                      }}
                    >
                      {/* Gold star for special soldier */}
                      {index === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          fontSize: '1rem',
                          filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.8))'
                        }}>
                          ⭐
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Name"
                        value={unit.name}
                        onChange={(e) => updateSubUnit(player.id, unit.id, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1a0f0a',
                          color: '#d4af37',
                          padding: '0.5rem 0.25rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          marginBottom: '0.5rem',
                          border: '1px solid #4a3322',
                          outline: 'none',
                          fontFamily: '"Cinzel", Georgia, serif',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Uncivilized Dropdown */}
                      {player.faction === 'Uncivilized' && (
                        <select
                          value={unit.unitType}
                          onChange={(e) => updateSubUnit(player.id, unit.id, 'unitType', e.target.value)}
                          style={{
                            width: '100%',
                            background: '#1a0f0a',
                            color: '#d4af37',
                            padding: '0.5rem 0.25rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            marginBottom: '0.5rem',
                            border: '1px solid #4a3322',
                            outline: 'none',
                            fontFamily: '"Cinzel", Georgia, serif',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Select Type</option>
                          <option value="Caveman">Caveman</option>
                          <option value="Dinosaur">Dinosaur</option>
                        </select>
                      )}

                      {/* HP Bar */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{
                          color: '#e2e8f0',
                          fontSize: '0.75rem',
                          marginBottom: '0.25rem',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {unit.currentHP}/{unit.maxHP}
                        </div>
                        <div style={{
                          width: '100%',
                          height: '1rem',
                          background: '#1a0f0a',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          border: '1px solid #4a3322'
                        }}>
                          <div
                            style={Object.assign(
                              { height: '100%', transition: 'all 0.3s' },
                              getGradientStyle(unit.currentHP, unit.maxHP)
                            )}
                          />
                        </div>
                      </div>

                      {/* Revive Circles */}
                      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
                        {[...Array(2)].map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '1rem',
                              height: '1rem',
                              borderRadius: '999px',
                              border: '2px solid',
                              borderColor: idx < unit.revives ? '#60a5fa' : '#4a3322',
                              background: idx < unit.revives ? 
                                'radial-gradient(circle, #3b82f6, #1e40af)' : '#1a0f0a',
                              transition: 'all 0.3s',
                              boxShadow: idx < unit.revives ? '0 0 5px #3b82f6' : 'none'
                            }}
                          />
                        ))}
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => updateSubUnitHP(player.id, unit.id, 1)}
                            disabled={unit.isDead}
                            style={{
                              flex: 1,
                              background: unit.isDead ? '#1a0f0a' : 'linear-gradient(to bottom, #15803d, #14532d)',
                              color: unit.isDead ? '#4a3322' : '#86efac',
                              fontSize: '0.75rem',
                              padding: '0.375rem',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: unit.isDead ? '#4a3322' : '#16a34a',
                              cursor: unit.isDead ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontFamily: '"Cinzel", Georgia, serif'
                            }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => updateSubUnitHP(player.id, unit.id, -1)}
                            disabled={unit.isDead}
                            style={{
                              flex: 1,
                              background: unit.isDead ? '#1a0f0a' : 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
                              color: unit.isDead ? '#4a3322' : '#fecaca',
                              fontSize: '0.75rem',
                              padding: '0.375rem',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: unit.isDead ? '#4a3322' : '#dc2626',
                              cursor: unit.isDead ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontFamily: '"Cinzel", Georgia, serif'
                            }}
                          >
                            -
                          </button>
                        </div>
                        <button
                          onClick={() => useRevive(player.id, false, unit.id)}
                          disabled={unit.revives === 0}
                          style={{
                            width: '100%',
                            background: unit.revives === 0 ? '#1a0f0a' : 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
                            color: unit.revives === 0 ? '#4a3322' : '#bfdbfe',
                            fontSize: '0.75rem',
                            padding: '0.375rem',
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: unit.revives === 0 ? '#4a3322' : '#2563eb',
                            cursor: unit.revives === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontFamily: '"Cinzel", Georgia, serif'
                          }}
                        >
                          ⟲
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Player Button */}
          <button
            onClick={addPlayer}
            style={{
              gridColumn: '1 / -1',
              width: '100%',
              background: 'linear-gradient(to bottom, #854d0e, #713f12)',
              color: '#fef3c7',
              fontSize: '2rem',
              fontWeight: 'bold',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(254, 243, 199, 0.1)',
              border: '3px solid #d4af37',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontFamily: '"Cinzel", Georgia, serif',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.background = 'linear-gradient(to bottom, #a16207, #854d0e)';
              e.target.style.boxShadow = '0 12px 35px rgba(212, 175, 55, 0.4), inset 0 2px 4px rgba(254, 243, 199, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.background = 'linear-gradient(to bottom, #854d0e, #713f12)';
              e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(254, 243, 199, 0.1)';
            }}
          >
            ⚔️ + Add Warrior ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};

export default HPCounter;