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
  const [roundCounter, setRoundCounter] = useState(1);
  const [battleLog, setBattleLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState(null);
  const [showDamageDistribution, setShowDamageDistribution] = useState(false);
  const [damageDistribution, setDamageDistribution] = useState({});
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'current'
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showInitiative, setShowInitiative] = useState(true);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setBattleLog(prev => [{
      id: Date.now(),
      round: roundCounter,
      message,
      timestamp
    }, ...prev].slice(0, 50)); // Keep last 50 entries
  };

  const getColorTheme = (theme) => {
    const themes = {
      default: { border: '#5a4a3a', borderTop: '#6b5a4a', glow: 'rgba(0,0,0,0)', borderWidth: '3px' },
      red: { border: '#7f1d1d', borderTop: '#991b1b', glow: 'rgba(127, 29, 29, 0.2)', borderWidth: '5px' },
      blue: { border: '#1e3a8a', borderTop: '#1e40af', glow: 'rgba(30, 58, 138, 0.2)', borderWidth: '5px' },
      green: { border: '#14532d', borderTop: '#15803d', glow: 'rgba(20, 83, 45, 0.2)', borderWidth: '5px' },
      purple: { border: '#581c87', borderTop: '#6b21a8', glow: 'rgba(88, 28, 135, 0.2)', borderWidth: '5px' },
      orange: { border: '#9a3412', borderTop: '#c2410c', glow: 'rgba(154, 52, 18, 0.2)', borderWidth: '5px' }
    };
    return themes[theme] || themes.default;
  };

  const logAction = (playerName, action, target = '') => {
    const messages = {
      shoot: `${playerName} fired a shot${target ? ` at ${target}` : ''}`,
      melee: `${playerName} attacked in melee${target ? ` against ${target}` : ''}`,
      miss: `${playerName} missed their attack`,
      block: `${playerName} blocked an attack`,
      heal: `${playerName} healed${target ? ` ${target}` : ''}`
    };
    addLog(messages[action] || `${playerName}: ${action}`);
  };

  // Auto-disable cooldowns after 1 round has passed
  useEffect(() => {
    setPlayers(prevPlayers => prevPlayers.map(p => {
      // Check if commander cooldown should be disabled (1 round passed)
      const shouldDisableCooldown = p.commanderStats.cooldown && 
                                      p.commanderStats.cooldownRound !== null && 
                                      roundCounter > p.commanderStats.cooldownRound + 1;
      
      if (shouldDisableCooldown) {
        addLog(`${p.playerName || 'Player'}'s commander cooldown expired`);
        return {
          ...p,
          commanderStats: {
            ...p.commanderStats,
            cooldown: false,
            cooldownRound: null
          }
        };
      }
      return p;
    }));
  }, [roundCounter]);

  const createNewPlayer = () => ({
    id: Date.now(),
    playerName: '',
    faction: '',
    commander: '',
    showDropdowns: true,
    notes: '',
    colorTheme: 'default', // default, red, blue, green, purple, orange
    selectedUnit: 'commander', // commander, special, soldier1-4
    isSquad: false,
    squadMembers: [], // Array of unit indices (0-4) that are in the squad
    commanderStats: {
      currentHP: 15,
      maxHP: 15,
      revives: 2,
      isDead: false,
      cooldown: false,
      cooldownRound: null // Track which round cooldown was activated
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
    const newPlayer = createNewPlayer();
    setPlayers([...players, newPlayer]);
    addLog('New player added to battle');
  };

  const removePlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    setPlayers(players.filter(p => p.id !== playerId));
    addLog(`${player?.playerName || 'Player'} removed from battle`);
  };

  const saveGame = () => {
    const gameState = {
      players,
      roundCounter,
      currentPlayerIndex,
      battleLog,
      timestamp: new Date().toISOString()
    };
    const dataStr = JSON.stringify(gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `space-wars-save-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addLog('Game saved successfully');
  };

  const loadGame = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gameState = JSON.parse(e.target.result);
        setPlayers(gameState.players || []);
        setRoundCounter(gameState.roundCounter || 1);
        setCurrentPlayerIndex(gameState.currentPlayerIndex || 0);
        setBattleLog(gameState.battleLog || []);
        addLog('Game loaded successfully');
      } catch (error) {
        alert('Error loading game file');
      }
    };
    reader.readAsText(file);
  };

  const resetPlayerAttackState = (playerId) => {
    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isSquad: false,
          squadMembers: [],
          selectedUnit: 'commander'
        };
      }
      return p;
    }));
  };

  const endTurn = () => {
    const currentPlayer = players[currentPlayerIndex];
    const playerName = currentPlayer?.playerName || 'Player';
    
    // Reset current player's attack state
    if (currentPlayer) {
      resetPlayerAttackState(currentPlayer.id);
    }
    
    addLog(`${playerName} ended their turn`);
    
    // Check if this is the last player
    const isLastPlayer = currentPlayerIndex === players.length - 1;
    
    if (isLastPlayer) {
      // Last player finished - advance round and go back to player 1
      addLog(`--- Round ${roundCounter} ended ---`);
      setRoundCounter(roundCounter + 1);
      addLog(`=== Round ${roundCounter + 1} begins ===`);
      setCurrentPlayerIndex(0);
    } else {
      // Not last player - just advance to next player
      if (viewMode === 'current') {
        nextPlayer();
      }
    }
  };

  const nextPlayer = () => {
    if (players.length === 0) return;
    setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
  };

  const previousPlayer = () => {
    if (players.length === 0) return;
    setCurrentPlayerIndex((currentPlayerIndex - 1 + players.length) % players.length);
  };

  const goToPlayer = (index) => {
    setCurrentPlayerIndex(index);
  };

  const newRound = () => {
    setPlayers(players.map(p => ({
      ...p,
      commanderStats: {
        currentHP: 15,
        maxHP: 15,
        revives: 2,
        isDead: false,
        cooldown: false,
        cooldownRound: null
      },
      subUnits: p.subUnits.map(unit => ({
        ...unit,
        currentHP: 8,
        maxHP: 8,
        revives: 2,
        isDead: false,
        cooldown: false
      }))
    })));
    setRoundCounter(1);
    setCurrentPlayerIndex(0);
    addLog('=== NEW ROUND STARTED ===');
  };

  const fullReset = () => {
    setPlayers(players.map(p => ({
      ...p,
      selectedUnit: 'commander',
      commanderStats: {
        currentHP: 15,
        maxHP: 15,
        revives: 2,
        isDead: false,
        cooldown: false,
        cooldownRound: null
      },
      subUnits: p.subUnits.map(unit => ({
        ...unit,
        currentHP: 8,
        maxHP: 8,
        revives: 2,
        isDead: false,
        cooldown: false
      }))
    })));
    setRoundCounter(1);
    setCurrentPlayerIndex(0);
    setBattleLog([]);
    addLog('=== FULL RESET - BATTLE LOG CLEARED ===');
  };

  const getUnitName = (player, unitType) => {
    const playerName = player.playerName || 'Player';
    if (unitType === 'commander') {
      return `${playerName}'s ${player.commander || 'Commander'}`;
    }
    if (unitType === 'special') {
      const unitName = player.subUnits[0]?.name;
      const unitTypeLabel = player.faction === 'Uncivilized' ? player.subUnits[0]?.unitType : '';
      return `${playerName}'s Special Soldier${unitTypeLabel ? ` (${unitTypeLabel})` : ''}${unitName ? ` ${unitName}` : ''}`;
    }
    const soldierIndex = parseInt(unitType.replace('soldier', ''));
    const unitName = player.subUnits[soldierIndex]?.name;
    return `${playerName}'s Soldier ${soldierIndex + 1}${unitName ? ` (${unitName})` : ''}`;
  };

  const getUnitStats = (player, unitType) => {
    if (unitType === 'commander') {
      const stats = COMMANDER_STATS[player.commander];
      return stats ? {
        shootDamage: parseInt(stats.shootDamage) || 1,
        meleeDamage: parseInt(stats.meleeDamage.replace('hp', '')) || 1,
        attacksPerHit: parseInt(stats.attacksPerHit.replace('x', '')) || 1,
        specialDamage: parseInt(stats.special.split('/')[1]?.replace('hp', '')) || 2
      } : null;
    }
    
    let factionStats = FACTION_STATS[player.faction];
    if (!factionStats) return null;
    
    // Handle Uncivilized faction special case
    if (player.faction === 'Uncivilized') {
      const unitIndex = unitType === 'special' ? 0 : parseInt(unitType.replace('soldier', ''));
      const unitTypeLabel = player.subUnits[unitIndex]?.unitType?.toLowerCase();
      
      if (unitTypeLabel === 'caveman') {
        factionStats = FACTION_STATS['Uncivilized'].caveman;
      } else if (unitTypeLabel === 'dinosaur') {
        factionStats = FACTION_STATS['Uncivilized'].dinosaur;
      } else {
        // Default to caveman if not set
        factionStats = FACTION_STATS['Uncivilized'].caveman;
      }
    }
    
    if (unitType === 'special') {
      return {
        shootDamage: parseInt(factionStats.special?.split('/')[1]?.replace('hp', '')) || 2,
        meleeDamage: parseInt(factionStats.meleeDamage?.replace('hp', '')) || 1,
        attacksPerHit: parseInt(factionStats.attacksPerHit?.replace('x', '')) || 1
      };
    }
    
    return {
      shootDamage: parseInt(factionStats.shootDamage?.replace('hp', '')) || 1,
      meleeDamage: parseInt(factionStats.meleeDamage?.replace('hp', '')) || 1,
      attacksPerHit: parseInt(factionStats.attacksPerHit?.replace('x', '')) || 1
    };
  };

  const calculateSquadDamage = (player, action) => {
    // If not a squad, just use the selected unit's stats
    if (!player.isSquad || !player.squadMembers || player.squadMembers.length === 0) {
      const stats = getUnitStats(player, player.selectedUnit);
      if (!stats) return 0;
      
      const attacksPerHit = stats.attacksPerHit || 1;
      let damagePerHit = 0;
      
      if (action === 'shoot') {
        damagePerHit = stats.shootDamage || 1;
      } else if (action === 'melee') {
        damagePerHit = stats.meleeDamage || 1;
      } else if (action === 'special') {
        damagePerHit = stats.specialDamage || 2;
      }
      
      return attacksPerHit * damagePerHit;
    }
    
    // Squad attack - calculate each member's contribution
    let totalDamage = 0;
    
    player.squadMembers.forEach(memberIndex => {
      const unitType = memberIndex === 0 ? 'special' : `soldier${memberIndex}`;
      const memberStats = getUnitStats(player, unitType);
      
      if (!memberStats) return;
      
      const attacksPerHit = memberStats.attacksPerHit || 1;
      let damagePerHit = 0;
      
      if (action === 'shoot') {
        damagePerHit = memberStats.shootDamage || 1;
      } else if (action === 'melee') {
        damagePerHit = memberStats.meleeDamage || 1;
      } else if (action === 'special') {
        damagePerHit = memberStats.specialDamage || 2;
      }
      
      totalDamage += (attacksPerHit * damagePerHit);
    });
    
    return totalDamage;
  };

  const openCalculator = (attackerId, action) => {
    const attacker = players.find(p => p.id === attackerId);
    if (!attacker) return;
    
    const totalDamage = calculateSquadDamage(attacker, action);
    
    setCalculatorData({
      attackerId,
      attackerName: getUnitName(attacker, attacker.selectedUnit),
      action,
      stats: getUnitStats(attacker, attacker.selectedUnit),
      attackerIsSquad: attacker.isSquad || false,
      attackerSquadSize: (attacker.squadMembers || []).length || 1,
      squadMemberHits: {}, // Object mapping memberIndex to hit count
      soloHits: 0, // Hit count for solo attacks
      totalDamage,
      targetId: null,
      targetIsSquad: false,
      targetSquadMembers: [],
      healTargets: [],
      hits: 1
    });
    setShowCalculator(true);
  };

  const applyCalculatedDamage = () => {
    if (!calculatorData || !calculatorData.targetId) return;
    
    const target = players.find(p => p.id === calculatorData.targetId.playerId);
    if (!target) return;
    
    const { action, attackerIsSquad, soloHits, squadMemberHits } = calculatorData;
    let damage = 0;
    
    // Calculate total damage
    if (attackerIsSquad) {
      // Squad attack - sum damage from each member's hits
      const attacker = players.find(p => p.id === calculatorData.attackerId);
      Object.entries(squadMemberHits || {}).forEach(([memberIndex, hits]) => {
        if (hits > 0) {
          const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
          const memberStats = getUnitStats(attacker, unitType);
          if (memberStats) {
            const damagePerHit = action === 'shoot' ? memberStats.shootDamage :
              action === 'melee' ? memberStats.meleeDamage :
              memberStats.specialDamage || 2;
            damage += hits * damagePerHit;
          }
        }
      });
    } else {
      // Solo attack - calculate from solo hits
      const stats = calculatorData.stats;
      const damagePerHit = action === 'shoot' ? (stats?.shootDamage || 1) :
        action === 'melee' ? (stats?.meleeDamage || 1) :
        (stats?.specialDamage || 2);
      damage = (soloHits || 0) * damagePerHit;
    }
    
    const targetUnitType = calculatorData.targetId.unitType;
    const targetName = getUnitName(target, targetUnitType);
    
    // Apply damage
    if (targetUnitType === 'commander') {
      updateCommanderHP(target.id, -damage);
    } else {
      const soldierIndex = targetUnitType === 'special' ? 0 : parseInt(targetUnitType.replace('soldier', ''));
      updateSubUnitHP(target.id, target.subUnits[soldierIndex].id, -damage);
    }
    
    // Log action with appropriate verb
    const actionVerb = action === 'shoot' ? 'shot' : action === 'melee' ? 'attacked' : 'used special weapon on';
    const totalHits = attackerIsSquad ? 
      Object.values(squadMemberHits || {}).reduce((sum, hits) => sum + hits, 0) : 
      (soloHits || 0);
    addLog(`${calculatorData.attackerName} ${actionVerb} ${targetName} for ${damage}hp (${totalHits} hit${totalHits !== 1 ? 's' : ''})`);
    
    // Apply cooldown if special weapon was used by commander
    if (action === 'special' && !attackerIsSquad) {
      const attacker = players.find(p => p.id === calculatorData.attackerId);
      if (attacker && !attacker.commanderStats.cooldown) {
        toggleCommanderCooldown(calculatorData.attackerId);
      }
    }
    
    setShowCalculator(false);
    setCalculatorData(null);
  };

  const handleDragStart = (playerId) => {
    setDraggedPlayer(playerId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetPlayerId) => {
    if (!draggedPlayer || draggedPlayer === targetPlayerId) return;
    
    const draggedIndex = players.findIndex(p => p.id === draggedPlayer);
    const targetIndex = players.findIndex(p => p.id === targetPlayerId);
    
    const newPlayers = [...players];
    const [removed] = newPlayers.splice(draggedIndex, 1);
    newPlayers.splice(targetIndex, 0, removed);
    
    setPlayers(newPlayers);
    setDraggedPlayer(null);
    addLog('Player order changed');
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
            cooldownRound: null
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
    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === playerId) {
        const newCooldown = !p.commanderStats.cooldown;
        return {
          ...p,
          commanderStats: {
            ...p.commanderStats,
            cooldown: newCooldown,
            cooldownRound: newCooldown ? roundCounter : null
          }
        };
      }
      return p;
    }));
  };

  const toggleSubUnitCooldown = (playerId, subUnitId) => {
    setPlayers(prevPlayers => prevPlayers.map(p => {
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
    setPlayers(prevPlayers => prevPlayers.map(p => {
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
    setPlayers(prevPlayers => prevPlayers.map(p => {
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
    setPlayers(prevPlayers => prevPlayers.map(p => {
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

        {/* Round Counter */}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#c9a961',
              textShadow: '3px 3px 6px rgba(0,0,0,1), 0 0 15px rgba(201, 169, 97, 0.4)',
              fontFamily: '"Cinzel", Georgia, serif',
              minWidth: '150px',
              textAlign: 'center'
            }}>
              Round {roundCounter}
            </div>
            <button
              onClick={endTurn}
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
              End Turn ⚔
            </button>
          </div>
        </div>

        {/* Control Panel */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={saveGame}
            style={{
              background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
              color: '#bfdbfe',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              border: '2px solid #2563eb',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e3a8a, #1e40af)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e40af, #1e3a8a)'}
          >
            💾 Save Game
          </button>
          <label style={{
            background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
            color: '#bfdbfe',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: '600',
            border: '2px solid #2563eb',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: '"Cinzel", Georgia, serif',
            transition: 'all 0.3s',
            display: 'inline-block'
          }}>
            📂 Load Game
            <input type="file" accept=".json" onChange={loadGame} style={{ display: 'none' }} />
          </label>
          <button
            onClick={fullReset}
            style={{
              background: 'linear-gradient(to bottom, #92400e, #78350f)',
              color: '#fef3c7',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              border: '2px solid #a16207',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #a16207, #92400e)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #92400e, #78350f)'}
          >
            ⚠️ Full Reset
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            style={{
              background: 'linear-gradient(to bottom, #92400e, #78350f)',
              color: '#fef3c7',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              border: '2px solid #a16207',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #a16207, #92400e)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #92400e, #78350f)'}
          >
            📜 {showLog ? 'Hide' : 'Show'} Battle Log
          </button>
          <div style={{ width: '2px', height: '30px', background: '#5a4a3a' }}></div>
          <button
            onClick={() => {
              setViewMode(viewMode === 'all' ? 'current' : 'all');
              if (viewMode === 'all' && players.length > 0) {
                setCurrentPlayerIndex(0);
              }
            }}
            style={{
              background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
              color: '#bfdbfe',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              border: '2px solid #2563eb',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: '"Cinzel", Georgia, serif',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e3a8a, #1e40af)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e40af, #1e3a8a)'}
          >
            {viewMode === 'all' ? '⚔️ Current Player' : '📋 View All'}
          </button>
        </div>

        {/* Battle Log */}
        {showLog && (
          <div style={{
            background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
            border: '2px solid #c9a961',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{
              color: '#c9a961',
              fontSize: '1.25rem',
              marginBottom: '0.75rem',
              textAlign: 'center',
              fontFamily: '"Cinzel", Georgia, serif',
              borderBottom: '2px solid #c9a961',
              paddingBottom: '0.5rem'
            }}>Battle Chronicle</h3>
            {battleLog.length === 0 ? (
              <p style={{ color: '#c9a961', textAlign: 'center', fontSize: '0.875rem' }}>
                No events recorded yet...
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {battleLog.map(entry => (
                  <div key={entry.id} style={{
                    background: '#0a0503',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    borderLeft: '3px solid #c9a961',
                    fontSize: '0.875rem',
                    color: '#c9a961'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Round {entry.round}</span> - {entry.message}
                    <span style={{ float: 'right', opacity: 0.7, fontSize: '0.75rem' }}>{entry.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Initiative Sidebar - Only in Play Mode */}
          {viewMode === 'current' && showInitiative && (
            <div style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: '2px solid #c9a961',
              borderRadius: '8px',
              padding: '1rem',
              width: '200px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.8)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                borderBottom: '2px solid #c9a961',
                paddingBottom: '0.5rem'
              }}>
                <h3 style={{
                  color: '#c9a961',
                  fontSize: '1rem',
                  fontFamily: '"Cinzel", Georgia, serif',
                  margin: 0
                }}>Initiative</h3>
                <button
                  onClick={() => setShowInitiative(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#c9a961',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >×</button>
              </div>
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => goToPlayer(idx)}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    background: idx === currentPlayerIndex ? '#2a1810' : '#0a0503',
                    border: idx === currentPlayerIndex ? '2px solid #c9a961' : '1px solid #5a4a3a',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    color: idx === currentPlayerIndex ? '#c9a961' : '#8b7355',
                    fontSize: '0.875rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: idx === currentPlayerIndex ? 'bold' : 'normal'
                  }}>
                    {idx + 1}. {p.playerName || 'Player'}
                  </div>
                  <div style={{
                    color: '#8b7355',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    Commander: {p.commanderStats.currentHP}/{p.commanderStats.maxHP}hp
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'current' && !showInitiative && (
            <button
              onClick={() => setShowInitiative(true)}
              style={{
                background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
                color: '#bfdbfe',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '2px solid #2563eb',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: '"Cinzel", Georgia, serif',
                writingMode: 'vertical-rl',
                height: '120px'
              }}
            >
              📜 Initiative
            </button>
          )}

          {/* Player Tiles Container */}
          <div style={{ flex: 1 }}>
            {/* Player Indicator - Only in Play Mode */}
            {viewMode === 'current' && players.length > 0 && (
              <div style={{
                background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
                border: '2px solid #c9a961',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
              }}>
                <div style={{
                  color: '#c9a961',
                  fontSize: '1.25rem',
                  fontFamily: '"Cinzel", Georgia, serif',
                  fontWeight: 'bold'
                }}>
                  Player {currentPlayerIndex + 1} of {players.length}
                </div>
              </div>
            )}

            {/* Player Tiles Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: viewMode === 'current' ? '1fr' : 'repeat(2, 1fr)', 
              gap: '1.5rem' 
            }}>
          {(viewMode === 'current' ? [players[currentPlayerIndex]].filter(Boolean) : players).map((player) => {
            const theme = getColorTheme(player.colorTheme);
            return (
            <div 
              key={player.id} 
              draggable={viewMode === 'all'}
              onDragStart={() => viewMode === 'all' && handleDragStart(player.id)}
              onDragOver={viewMode === 'all' ? handleDragOver : undefined}
              onDrop={() => viewMode === 'all' && handleDrop(player.id)}
              style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: `0 12px 40px rgba(0,0,0,0.9), inset 0 1px 4px rgba(201, 169, 97, 0.1), 0 0 15px ${theme.glow}`,
              border: `${theme.borderWidth} solid ${theme.border}`,
              borderTop: `${theme.borderWidth} solid ${theme.borderTop}`,
              position: 'relative',
              cursor: viewMode === 'all' ? 'grab' : 'default'
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

              {/* Color Theme & Notes */}
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={player.colorTheme}
                  onChange={(e) => updatePlayer(player.id, 'colorTheme', e.target.value)}
                  style={{
                    background: '#1a0f0a',
                    color: '#c9a961',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="default">⚫ Default</option>
                  <option value="red">🔴 Red</option>
                  <option value="blue">🔵 Blue</option>
                  <option value="green">🟢 Green</option>
                  <option value="purple">🟣 Purple</option>
                  <option value="orange">🟠 Orange</option>
                </select>
                <input
                  type="text"
                  placeholder="GM Notes..."
                  value={player.notes}
                  onChange={(e) => updatePlayer(player.id, 'notes', e.target.value)}
                  style={{
                    flex: 1,
                    background: '#1a0f0a',
                    color: '#c9a961',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.75rem',
                    fontStyle: 'italic'
                  }}
                />
              </div>

              {/* Quick Actions */}
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.5rem',
                background: '#0a0503',
                borderRadius: '6px',
                border: '1px solid #5a4a3a'
              }}>
                {/* Unit Selector */}
                <select
                  value={player.selectedUnit}
                  onChange={(e) => updatePlayer(player.id, 'selectedUnit', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: '#c9a961',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.75rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  <option value="commander">⚔️ {player.commander || 'Commander'}</option>
                  <option value="special">⭐ Special Soldier{player.subUnits[0]?.name ? ` (${player.subUnits[0].name})` : ''}</option>
                  {[1, 2, 3, 4].map(i => (
                    <option key={i} value={`soldier${i}`}>
                      🛡️ Soldier {i + 1}{player.subUnits[i]?.name ? ` (${player.subUnits[i].name})` : ''}
                    </option>
                  ))}
                </select>

                {/* Squad Selection - Only for Soldiers */}
                {player.selectedUnit !== 'commander' && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#c9a961',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginBottom: '0.5rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={!!player.isSquad}
                        onChange={(e) => {
                          const currentUnitIndex = player.selectedUnit === 'special' ? 0 : 
                                                  parseInt(player.selectedUnit.replace('soldier', ''));
                          
                          if (e.target.checked) {
                            setPlayers(players.map(p => {
                              if (p.id === player.id) {
                                return {
                                  ...p,
                                  isSquad: true,
                                  squadMembers: [currentUnitIndex]
                                };
                              }
                              return p;
                            }));
                          } else {
                            setPlayers(players.map(p => {
                              if (p.id === player.id) {
                                return {
                                  ...p,
                                  isSquad: false,
                                  squadMembers: []
                                };
                              }
                              return p;
                            }));
                          }
                        }}
                        style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                      />
                      <strong>Squad?</strong>
                    </label>

                    {player.isSquad && (
                      <div style={{
                        background: '#0a0503',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #5a4a3a',
                        fontSize: '0.7rem'
                      }}>
                        <div style={{ color: '#8b7355', marginBottom: '0.25rem' }}>
                          Select squad (up to 3, including initiator):
                        </div>
                        {[0, 1, 2, 3, 4].map(idx => {
                          const currentUnitIndex = player.selectedUnit === 'special' ? 0 : 
                                                  parseInt(player.selectedUnit.replace('soldier', ''));
                          const isInitiator = idx === currentUnitIndex;
                          const isSelected = (player.squadMembers || []).includes(idx);
                          const canSelect = isInitiator || isSelected || (player.squadMembers || []).length < 3;
                          const unit = player.subUnits[idx];
                          
                          if (unit.isDead) return null;

                          const label = idx === 0 ? 
                            `⭐ Special Soldier${unit.name ? ` (${unit.name})` : ''} - Tile 1` :
                            `🛡️ Soldier ${idx + 1}${unit.name ? ` (${unit.name})` : ''} - Tile ${idx + 1}`;

                          return (
                            <label key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem',
                              marginBottom: '0.15rem',
                              background: isSelected ? '#2a1810' : 'transparent',
                              border: isSelected ? '1px solid #c9a961' : '1px solid transparent',
                              borderRadius: '3px',
                              color: isInitiator ? '#c9a961' : '#8b7355',
                              cursor: canSelect && !isInitiator ? 'pointer' : 'not-allowed',
                              opacity: canSelect ? 1 : 0.5
                            }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isInitiator || !canSelect}
                                onChange={(e) => {
                                  if (isInitiator) return;
                                  
                                  setPlayers(players.map(p => {
                                    if (p.id === player.id) {
                                      let newSquad = [...(p.squadMembers || [])];
                                      if (e.target.checked) {
                                        newSquad.push(idx);
                                      } else {
                                        newSquad = newSquad.filter(i => i !== idx);
                                      }
                                      return { ...p, squadMembers: newSquad };
                                    }
                                    return p;
                                  }));
                                }}
                                style={{ width: '12px', height: '12px' }}
                              />
                              {label} ({unit.currentHP}/{unit.maxHP}hp)
                              {isInitiator && <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>(Initiator)</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => openCalculator(player.id, 'shoot')}
                  style={{
                    flex: '1 1 auto',
                    background: 'linear-gradient(to bottom, #854d0e, #713f12)',
                    color: '#fef3c7',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #a16207',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                  title="Calculate shooting damage"
                >
                  🎯 Shoot
                </button>
                <button
                  onClick={() => openCalculator(player.id, 'melee')}
                  style={{
                    flex: '1 1 auto',
                    background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)',
                    color: '#fecaca',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #991b1b',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                  title="Calculate melee damage"
                >
                  ⚔️ Melee
                </button>
                {/* Special Weapon - Only for Commander */}
                {player.selectedUnit === 'commander' && (
                  <button
                    onClick={() => {
                      if (!player.commanderStats.cooldown) {
                        openCalculator(player.id, 'special');
                      }
                    }}
                    disabled={player.commanderStats.cooldown}
                    style={{
                      flex: '1 1 auto',
                      background: player.commanderStats.cooldown ? 
                        '#1a0f0a' : 
                        'linear-gradient(to bottom, #6b21a8, #581c87)',
                      color: player.commanderStats.cooldown ? '#4a3322' : '#e9d5ff',
                      padding: '0.375rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: player.commanderStats.cooldown ? '#4a3322' : '#7e22ce',
                      cursor: player.commanderStats.cooldown ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontWeight: '600',
                      minWidth: '60px',
                      opacity: player.commanderStats.cooldown ? 0.5 : 1
                    }}
                    title={player.commanderStats.cooldown ? 'On cooldown - cannot use' : 'Use special weapon'}
                  >
                    ⚡ Special
                  </button>
                )}
                <button
                  onClick={() => openCalculator(player.id, 'heal')}
                  style={{
                    flex: '1 1 auto',
                    background: 'linear-gradient(to bottom, #15803d, #14532d)',
                    color: '#86efac',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #16a34a',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: '600',
                    minWidth: '55px'
                  }}
                  title="Calculate healing"
                >
                  💚 Heal
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
            );
          })}
            </div>

            {/* Navigation Buttons - Only in Play Mode */}
            {viewMode === 'current' && players.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={previousPlayer}
                  style={{
                    background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
                    color: '#bfdbfe',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #2563eb',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e3a8a, #1e40af)'}
                  onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e40af, #1e3a8a)'}
                >
                  ← Previous Player
                </button>
                <button
                  onClick={nextPlayer}
                  style={{
                    background: 'linear-gradient(to bottom, #1e40af, #1e3a8a)',
                    color: '#bfdbfe',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #2563eb',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e3a8a, #1e40af)'}
                  onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #1e40af, #1e3a8a)'}
                >
                  Next Player →
                </button>
              </div>
            )}
          </div>
        </div>

          {/* Add Player Button - Only in Setup Mode */}
          {viewMode === 'all' && (
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
          )}

        {/* Calculator Modal */}
        {showCalculator && calculatorData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowCalculator(false)}
          >
            <div style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: '3px solid #c9a961',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                color: '#c9a961',
                fontSize: '1.5rem',
                marginBottom: '1rem',
                textAlign: 'center',
                fontFamily: '"Cinzel", Georgia, serif',
                textShadow: '2px 2px 4px rgba(0,0,0,1)'
              }}>
                {calculatorData.action === 'heal' ? '💚 Healing Calculator' : 
                 calculatorData.action === 'special' ? '⚡ Special Weapon Calculator' : 
                 '⚔️ Damage Calculator'}
              </h3>

              <div style={{ marginBottom: '1rem', color: '#c9a961', fontSize: '0.875rem' }}>
                <strong>Attacker:</strong> {calculatorData.attackerName}
              </div>

              {/* Target Squad Selection */}
              {calculatorData.action !== 'heal' && (
                <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#c9a961',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}>
                  <input
                    type="checkbox"
                    checked={!!calculatorData.targetIsSquad}
                    onChange={(e) => {
                      setCalculatorData({
                        ...calculatorData,
                        targetIsSquad: e.target.checked,
                        targetSquadMembers: [],
                        targetId: null
                      });
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <strong>Target Squad?</strong>
                </label>
              </div>
              )}

              {/* Target Selector - Only for attack actions */}
              {calculatorData.action !== 'heal' && (
                <>
                  {!calculatorData.targetIsSquad ? (
                    // Single Target Selection
                    <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                      <strong>Target:</strong>
                    </label>
                <select
                  value={calculatorData.targetId ? `${calculatorData.targetId.playerId}-${calculatorData.targetId.unitType}` : ''}
                  onChange={(e) => {
                    const [playerId, unitType] = e.target.value.split('-');
                    setCalculatorData({
                      ...calculatorData,
                      targetId: playerId ? { playerId: parseInt(playerId), unitType } : null
                    });
                  }}
                  style={{
                    width: '100%',
                    background: '#0a0503',
                    color: '#c9a961',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Target...</option>
                  {players.filter(p => 
                    calculatorData.action === 'heal' ? 
                      p.id === calculatorData.attackerId : 
                      p.id !== calculatorData.attackerId
                  ).map(p => (
                    <optgroup key={p.id} label={p.playerName || 'Player'} style={{ color: '#c9a961' }}>
                      <option value={`${p.id}-commander`}>
                        ⚔️ {p.commander || 'Commander'} ({p.commanderStats.currentHP}hp)
                      </option>
                      <option value={`${p.id}-special`}>
                        ⭐ Special Soldier{p.subUnits[0]?.name ? ` (${p.subUnits[0].name})` : ''} ({p.subUnits[0]?.currentHP}hp)
                      </option>
                      {[1, 2, 3, 4].map(i => (
                        <option key={i} value={`${p.id}-soldier${i}`}>
                          🛡️ Soldier {i + 1}{p.subUnits[i]?.name ? ` (${p.subUnits[i].name})` : ''} ({p.subUnits[i]?.currentHP}hp)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              ) : (
                // Squad Target Selection (select player first, then soldiers)
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Select Target Player:</strong>
                  </label>
                  <select
                    value={calculatorData.targetId?.playerId || ''}
                    onChange={(e) => {
                      setCalculatorData({
                        ...calculatorData,
                        targetId: e.target.value ? { playerId: parseInt(e.target.value) } : null,
                        targetSquadMembers: []
                      });
                    }}
                    style={{
                      width: '100%',
                      background: '#0a0503',
                      color: '#c9a961',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '2px solid #5a4a3a',
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <option value="">Select Player...</option>
                    {players.filter(p => 
                      calculatorData.action === 'heal' ? 
                        p.id === calculatorData.attackerId : 
                        p.id !== calculatorData.attackerId
                    ).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.playerName || 'Player'}
                      </option>
                    ))}
                  </select>

                  {calculatorData.targetId?.playerId && (
                    <div style={{
                      background: '#0a0503',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #5a4a3a'
                    }}>
                      <div style={{ color: '#c9a961', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        Select squad members to target (1-3):
                      </div>
                      {(() => {
                        const targetPlayer = players.find(p => p.id === calculatorData.targetId.playerId);
                        if (!targetPlayer) return null;
                        
                        return [0, 1, 2, 3, 4].map(idx => {
                          const unit = targetPlayer.subUnits[idx];
                          if (unit.isDead) return null;

                          const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                          const isSelected = calculatorData.targetSquadMembers.some(m => m.unitType === unitType);
                          const canSelect = isSelected || calculatorData.targetSquadMembers.length < 3;

                          const label = idx === 0 ?
                            `⭐ Special Soldier${unit.name ? ` (${unit.name})` : ''} - Tile 1` :
                            `🛡️ Soldier ${idx + 1}${unit.name ? ` (${unit.name})` : ''} - Tile ${idx + 1}`;

                          return (
                            <label key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              marginBottom: '0.25rem',
                              background: isSelected ? '#2a1810' : 'transparent',
                              border: isSelected ? '1px solid #c9a961' : '1px solid transparent',
                              borderRadius: '4px',
                              color: '#8b7355',
                              fontSize: '0.75rem',
                              cursor: canSelect ? 'pointer' : 'not-allowed',
                              opacity: canSelect ? 1 : 0.5
                            }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!canSelect}
                                onChange={(e) => {
                                  let newTargets = [...calculatorData.targetSquadMembers];
                                  if (e.target.checked) {
                                    newTargets.push({
                                      playerId: calculatorData.targetId.playerId,
                                      unitType,
                                      unitIndex: idx
                                    });
                                  } else {
                                    newTargets = newTargets.filter(m => m.unitType !== unitType);
                                  }
                                  setCalculatorData({
                                    ...calculatorData,
                                    targetSquadMembers: newTargets
                                  });
                                }}
                                style={{ width: '14px', height: '14px' }}
                              />
                              {label} ({unit.currentHP}/{unit.maxHP}hp)
                            </label>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
                </>
              )}

              {/* Multi-Heal Selection - Always shown for heal */}
              {calculatorData.action === 'heal' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Select units to heal:</strong>
                  </label>
                  <div style={{
                    background: '#0a0503',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #5a4a3a'
                  }}>
                    {(() => {
                      const healer = players.find(p => p.id === calculatorData.attackerId);
                      if (!healer) return null;

                      const allUnits = [
                        { 
                          type: 'commander', 
                          index: -1, 
                          name: healer.commander || 'Commander', 
                          hp: healer.commanderStats.currentHP, 
                          maxHP: healer.commanderStats.maxHP,
                          revives: healer.commanderStats.revives,
                          isDead: healer.commanderStats.isDead
                        },
                        ...healer.subUnits.map((unit, idx) => ({
                          type: idx === 0 ? 'special' : `soldier${idx}`,
                          index: idx,
                          name: unit.name || (idx === 0 ? 'Special Soldier' : `Soldier ${idx + 1}`),
                          hp: unit.currentHP,
                          maxHP: unit.maxHP,
                          revives: unit.revives,
                          isDead: unit.isDead
                        }))
                      ].filter(u => {
                        // Can only heal if: NOT permanently dead AND needs healing
                        const isPermanentlyDead = u.isDead && u.revives === 0;
                        const needsHealing = u.hp < u.maxHP;
                        return !isPermanentlyDead && needsHealing;
                      });

                      if (allUnits.length === 0) {
                        return <div style={{ color: '#8b7355', fontSize: '0.75rem', textAlign: 'center' }}>
                          All units are at full health or permanently dead!
                        </div>;
                      }

                      return allUnits.map(unit => {
                        const key = `${healer.id}-${unit.type}`;
                        const isSelected = (calculatorData.healTargets || []).some(t => t.key === key);

                        const label = unit.type === 'commander' ? `⚔️ ${unit.name}` :
                          unit.type === 'special' ? `⭐ ${unit.name}` :
                          `🛡️ ${unit.name}`;

                        return (
                          <label key={key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: isSelected ? '#2a1810' : 'transparent',
                            border: isSelected ? '1px solid #c9a961' : '1px solid transparent',
                            borderRadius: '4px',
                            color: '#c9a961',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  let newTargets = [...(calculatorData.healTargets || [])];
                                  if (e.target.checked) {
                                    newTargets.push({
                                      key,
                                      playerId: healer.id,
                                      unitType: unit.type,
                                      unitIndex: unit.index
                                    });
                                  } else {
                                    newTargets = newTargets.filter(t => t.key !== key);
                                  }
                                  setCalculatorData({
                                    ...calculatorData,
                                    healTargets: newTargets
                                  });
                                }}
                                style={{ width: '14px', height: '14px' }}
                              />
                              {label}
                            </div>
                            <span style={{ color: '#8b7355', fontSize: '0.7rem' }}>
                              ({unit.hp}/{unit.maxHP}hp)
                            </span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Old Target Selector - REMOVE THIS */}
              <div style={{ marginBottom: '1rem', display: 'none' }}>
                <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  <strong>Target:</strong>
                </label>
                <select
                  value={calculatorData.targetId ? `${calculatorData.targetId.playerId}-${calculatorData.targetId.unitType}` : ''}
                  onChange={(e) => {
                    const [playerId, unitType] = e.target.value.split('-');
                    setCalculatorData({
                      ...calculatorData,
                      targetId: playerId ? { playerId: parseInt(playerId), unitType } : null
                    });
                  }}
                  style={{
                    width: '100%',
                    background: '#0a0503',
                    color: '#c9a961',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Target...</option>
                  {players.map(p => (
                    <optgroup key={p.id} label={p.playerName || 'Player'} style={{ color: '#c9a961' }}>
                      <option value={`${p.id}-commander`}>
                        ⚔️ {p.commander || 'Commander'} ({p.commanderStats.currentHP}hp)
                      </option>
                      <option value={`${p.id}-special`}>
                        ⭐ Special Soldier{p.subUnits[0]?.name ? ` (${p.subUnits[0].name})` : ''} ({p.subUnits[0]?.currentHP}hp)
                      </option>
                      {[1, 2, 3, 4].map(i => (
                        <option key={i} value={`${p.id}-soldier${i}`}>
                          🛡️ Soldier {i + 1}{p.subUnits[i]?.name ? ` (${p.subUnits[i].name})` : ''} ({p.subUnits[i]?.currentHP}hp)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Squad Hit Selection - Which members successfully hit */}
              {calculatorData.action !== 'heal' && calculatorData.attackerIsSquad && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Squad Attack - Enter hits for each member:</strong>
                  </label>
                  <div style={{
                    background: '#0a0503',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #5a4a3a'
                  }}>
                    {(() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      if (!attacker) return null;
                      
                      return (attacker.squadMembers || []).map((memberIndex, idx) => {
                        const unit = attacker.subUnits[memberIndex];
                        const isSpecial = memberIndex === 0;
                        const label = isSpecial ?
                          `⭐ Special Soldier${unit.name ? ` (${unit.name})` : ''}` :
                          `🛡️ Soldier ${memberIndex + 1}${unit.name ? ` (${unit.name})` : ''}`;
                        
                        const unitType = isSpecial ? 'special' : `soldier${memberIndex}`;
                        const memberStats = getUnitStats(attacker, unitType);
                        const damagePerHit = memberStats ? (
                          calculatorData.action === 'shoot' ? memberStats.shootDamage :
                          calculatorData.action === 'melee' ? memberStats.meleeDamage :
                          memberStats.specialDamage || 2
                        ) : 0;
                        
                        const maxHits = memberStats?.attacksPerHit || 1;
                        const currentHits = (calculatorData.squadMemberHits || {})[memberIndex] || 0;

                        return (
                          <div key={memberIndex} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: currentHits > 0 ? '#2a1810' : 'transparent',
                            border: currentHits > 0 ? '1px solid #c9a961' : '1px solid transparent',
                            borderRadius: '4px',
                            color: '#c9a961',
                            fontSize: '0.75rem'
                          }}>
                            <div style={{ flex: 1 }}>
                              {label}
                              <span style={{ color: '#8b7355', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                                ({damagePerHit}hp per hit, max {maxHits})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: '#8b7355', fontSize: '0.7rem' }}>Hits:</span>
                              <input
                                type="number"
                                min="0"
                                max={maxHits}
                                value={currentHits}
                                onChange={(e) => {
                                  const newHits = Math.min(maxHits, Math.max(0, parseInt(e.target.value) || 0));
                                  setCalculatorData({
                                    ...calculatorData,
                                    squadMemberHits: {
                                      ...(calculatorData.squadMemberHits || {}),
                                      [memberIndex]: newHits
                                    }
                                  });
                                }}
                                style={{
                                  width: '50px',
                                  background: '#1a0f0a',
                                  color: '#c9a961',
                                  padding: '0.25rem',
                                  borderRadius: '4px',
                                  border: '1px solid #5a4a3a',
                                  textAlign: 'center',
                                  fontSize: '0.75rem'
                                }}
                              />
                              <span style={{ color: '#fecaca', fontSize: '0.75rem', minWidth: '40px' }}>
                                = {currentHits * damagePerHit}hp
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Solo Hit Counter */}
              {calculatorData.action !== 'heal' && !calculatorData.attackerIsSquad && calculatorData.stats && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Number of Successful Hits:</strong>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="0"
                      max={calculatorData.stats.attacksPerHit}
                      value={calculatorData.soloHits || 0}
                      onChange={(e) => {
                        const newHits = Math.min(
                          calculatorData.stats.attacksPerHit, 
                          Math.max(0, parseInt(e.target.value) || 0)
                        );
                        setCalculatorData({
                          ...calculatorData,
                          soloHits: newHits
                        });
                      }}
                      style={{
                        width: '80px',
                        background: '#0a0503',
                        color: '#c9a961',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '2px solid #5a4a3a',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontFamily: '"Cinzel", Georgia, serif'
                      }}
                    />
                    <span style={{ color: '#8b7355', fontSize: '0.875rem' }}>
                      (out of {calculatorData.stats.attacksPerHit} possible)
                    </span>
                  </div>
                </div>
              )}

              {/* Calculation Display */}
              {calculatorData.stats && calculatorData.action !== 'heal' && (
                <div style={{
                  background: '#0a0503',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '2px solid #c9a961',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  {calculatorData.attackerIsSquad ? (
                    // Squad damage display - calculate from individual hit counters
                    (() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      let totalHitDamage = 0;
                      
                      Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                        const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                        const memberStats = getUnitStats(attacker, unitType);
                        if (memberStats && hits > 0) {
                          const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                            calculatorData.action === 'melee' ? memberStats.meleeDamage :
                            memberStats.specialDamage || 2;
                          totalHitDamage += hits * damagePerHit;
                        }
                      });
                      
                      return (
                        <div>
                          <div style={{ color: '#c9a961', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Squad Attack
                          </div>
                          <div style={{ color: '#c9a961', fontSize: '1rem', fontWeight: 'bold', fontFamily: '"Cinzel", Georgia, serif' }}>
                            Total Damage:
                            <span style={{ color: '#fecaca', fontSize: '2rem', marginLeft: '0.5rem', display: 'block' }}>
                              {totalHitDamage}hp
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Single unit damage display
                    (() => {
                      const damagePerHit = calculatorData.action === 'shoot' ? calculatorData.stats.shootDamage :
                        calculatorData.action === 'melee' ? calculatorData.stats.meleeDamage :
                        calculatorData.stats.specialDamage || 2;
                      const totalDamage = (calculatorData.soloHits || 0) * damagePerHit;
                      
                      return (
                        <div style={{ color: '#c9a961', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: '"Cinzel", Georgia, serif' }}>
                          {calculatorData.soloHits || 0} hit{calculatorData.soloHits !== 1 ? 's' : ''} × {damagePerHit}hp =
                          <span style={{ color: '#fecaca', fontSize: '1.5rem', marginLeft: '0.5rem', display: 'block' }}>
                            {totalDamage}hp
                          </span>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Heal Amount Input */}
              {calculatorData.action === 'heal' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: '#c9a961', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>HP to Heal:</strong>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={calculatorData.healAmount || 1}
                    onChange={(e) => setCalculatorData({ ...calculatorData, healAmount: parseInt(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      background: '#0a0503',
                      color: '#c9a961',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '2px solid #5a4a3a',
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => {
                    if (calculatorData.action === 'heal') {
                      // Multi-heal (always for heal action)
                      if (!calculatorData.healTargets || calculatorData.healTargets.length === 0) return;
                      
                      const healAmount = calculatorData.healAmount || 1;
                      const healedNames = [];
                      
                      calculatorData.healTargets.forEach(target => {
                        const player = players.find(p => p.id === target.playerId);
                        if (!player) return;
                        
                        const targetName = getUnitName(player, target.unitType);
                        
                        if (target.unitType === 'commander') {
                          updateCommanderHP(player.id, healAmount);
                        } else {
                          const unitId = player.subUnits[target.unitIndex].id;
                          updateSubUnitHP(player.id, unitId, healAmount);
                        }
                        
                        healedNames.push(targetName);
                      });
                      
                      addLog(`${calculatorData.attackerName} healed ${healedNames.join(', ')} for ${healAmount}hp each`);
                      setShowCalculator(false);
                      setCalculatorData(null);
                    } else {
                      // Damage (check if targeting squad)
                      if (calculatorData.targetIsSquad && calculatorData.targetSquadMembers.length > 0) {
                        // Open damage distribution modal
                        const initialDistribution = {};
                        calculatorData.targetSquadMembers.forEach(member => {
                          const key = `${member.playerId}-${member.unitType}`;
                          initialDistribution[key] = 0;
                        });
                        setDamageDistribution(initialDistribution);
                        setShowDamageDistribution(true);
                      } else {
                        // Single target - apply directly
                        applyCalculatedDamage();
                      }
                    }
                  }}
                  disabled={calculatorData.action === 'heal' ? 
                    (!calculatorData.healTargets || calculatorData.healTargets.length === 0) :
                    !calculatorData.targetId
                  }
                  style={{
                    flex: 1,
                    background: (() => {
                      const isEnabled = calculatorData.action === 'heal' ? 
                        (calculatorData.healTargets && calculatorData.healTargets.length > 0) :
                        calculatorData.targetId;
                      return isEnabled ? 'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a';
                    })(),
                    color: (() => {
                      const isEnabled = calculatorData.action === 'heal' ? 
                        (calculatorData.healTargets && calculatorData.healTargets.length > 0) :
                        calculatorData.targetId;
                      return isEnabled ? '#86efac' : '#4a3322';
                    })(),
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: (() => {
                      const isEnabled = calculatorData.action === 'heal' ? 
                        (calculatorData.healTargets && calculatorData.healTargets.length > 0) :
                        calculatorData.targetId;
                      return isEnabled ? '#16a34a' : '#4a3322';
                    })(),
                    cursor: (() => {
                      const isEnabled = calculatorData.action === 'heal' ? 
                        (calculatorData.healTargets && calculatorData.healTargets.length > 0) :
                        calculatorData.targetId;
                      return isEnabled ? 'pointer' : 'not-allowed';
                    })(),
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  ✓ Apply
                </button>
                <button
                  onClick={() => {
                    setShowCalculator(false);
                    setCalculatorData(null);
                  }}
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
                    fontSize: '1rem'
                  }}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Damage Distribution Modal */}
        {showDamageDistribution && calculatorData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => {
            setShowDamageDistribution(false);
            setDamageDistribution({});
          }}
          >
            <div style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: '3px solid #c9a961',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                color: '#c9a961',
                fontSize: '1.5rem',
                marginBottom: '1rem',
                textAlign: 'center',
                fontFamily: '"Cinzel", Georgia, serif',
                textShadow: '2px 2px 4px rgba(0,0,0,1)'
              }}>
                Distribute Damage
              </h3>

              {/* Total Damage Display */}
              {(() => {
                const attacker = players.find(p => p.id === calculatorData.attackerId);
                let totalAvailableDamage = 0;
                
                if (calculatorData.attackerIsSquad) {
                  Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                    if (hits > 0) {
                      const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                      const memberStats = getUnitStats(attacker, unitType);
                      if (memberStats) {
                        const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                          calculatorData.action === 'melee' ? memberStats.meleeDamage :
                          memberStats.specialDamage || 2;
                        totalAvailableDamage += hits * damagePerHit;
                      }
                    }
                  });
                } else {
                  const stats = calculatorData.stats;
                  const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                    calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                    (stats?.specialDamage || 2);
                  totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                }

                const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                const remaining = totalAvailableDamage - totalDistributed;

                return (
                  <div style={{
                    background: '#0a0503',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '2px solid #c9a961',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#c9a961', fontSize: '1rem', marginBottom: '0.5rem' }}>
                      Total Damage: <strong>{totalAvailableDamage}hp</strong>
                    </div>
                    <div style={{ 
                      color: remaining === 0 ? '#86efac' : remaining < 0 ? '#fecaca' : '#fef3c7', 
                      fontSize: '0.875rem' 
                    }}>
                      Remaining: <strong>{remaining}hp</strong>
                      {remaining < 0 && <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem' }}>⚠️ Over-allocated!</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Target List with Damage Distribution */}
              <div style={{ marginBottom: '1.5rem' }}>
                {calculatorData.targetSquadMembers.map(member => {
                  const target = players.find(p => p.id === member.playerId);
                  if (!target) return null;

                  const key = `${member.playerId}-${member.unitType}`;
                  const currentDamage = damageDistribution[key] || 0;
                  
                  let unitName, currentHP, maxHP;
                  if (member.unitType === 'commander') {
                    unitName = `⚔️ ${target.commander || 'Commander'}`;
                    currentHP = target.commanderStats.currentHP;
                    maxHP = target.commanderStats.maxHP;
                  } else {
                    const unit = target.subUnits[member.unitIndex];
                    unitName = member.unitIndex === 0 ?
                      `⭐ Special Soldier${unit.name ? ` (${unit.name})` : ''}` :
                      `🛡️ Soldier ${member.unitIndex + 1}${unit.name ? ` (${unit.name})` : ''}`;
                    currentHP = unit.currentHP;
                    maxHP = unit.maxHP;
                  }

                  return (
                    <div key={key} style={{
                      background: '#0a0503',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: currentDamage > 0 ? '2px solid #c9a961' : '1px solid #5a4a3a',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <div>
                          <div style={{ color: '#c9a961', fontSize: '0.875rem', fontWeight: 'bold' }}>
                            {target.playerName || 'Player'}'s {unitName}
                          </div>
                          <div style={{ color: '#8b7355', fontSize: '0.75rem' }}>
                            Current HP: {currentHP}/{maxHP}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <button
                            onClick={() => {
                              setDamageDistribution({
                                ...damageDistribution,
                                [key]: Math.max(0, currentDamage - 1)
                              });
                            }}
                            style={{
                              background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)',
                              color: '#fecaca',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '2px solid #991b1b',
                              cursor: 'pointer',
                              fontFamily: '"Cinzel", Georgia, serif',
                              fontWeight: 'bold',
                              fontSize: '1.25rem',
                              width: '40px',
                              height: '40px'
                            }}
                          >
                            −
                          </button>
                          <div style={{
                            background: '#1a0f0a',
                            color: '#fecaca',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '2px solid #c9a961',
                            fontFamily: '"Cinzel", Georgia, serif',
                            fontWeight: 'bold',
                            fontSize: '1.5rem',
                            minWidth: '60px',
                            textAlign: 'center'
                          }}>
                            {currentDamage}hp
                          </div>
                          <button
                            onClick={() => {
                              setDamageDistribution({
                                ...damageDistribution,
                                [key]: currentDamage + 1
                              });
                            }}
                            style={{
                              background: 'linear-gradient(to bottom, #15803d, #14532d)',
                              color: '#86efac',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '2px solid #16a34a',
                              cursor: 'pointer',
                              fontFamily: '"Cinzel", Georgia, serif',
                              fontWeight: 'bold',
                              fontSize: '1.25rem',
                              width: '40px',
                              height: '40px'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => {
                    setShowDamageDistribution(false);
                    setDamageDistribution({});
                  }}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(to bottom, #4a5568, #2d3748)',
                    color: '#e2e8f0',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #4a5568',
                    cursor: 'pointer',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Calculate total
                    const attacker = players.find(p => p.id === calculatorData.attackerId);
                    let totalAvailableDamage = 0;
                    
                    if (calculatorData.attackerIsSquad) {
                      Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                        if (hits > 0) {
                          const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                          const memberStats = getUnitStats(attacker, unitType);
                          if (memberStats) {
                            const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                              calculatorData.action === 'melee' ? memberStats.meleeDamage :
                              memberStats.specialDamage || 2;
                            totalAvailableDamage += hits * damagePerHit;
                          }
                        }
                      });
                    } else {
                      const stats = calculatorData.stats;
                      const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                        calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                        (stats?.specialDamage || 2);
                      totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                    }

                    const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                    
                    if (totalDistributed !== totalAvailableDamage) {
                      alert(`Please distribute exactly ${totalAvailableDamage}hp. Currently distributed: ${totalDistributed}hp`);
                      return;
                    }

                    // Apply distributed damage
                    Object.entries(damageDistribution).forEach(([key, damage]) => {
                      if (damage > 0) {
                        const [playerIdStr, unitType] = key.split('-');
                        const playerId = parseInt(playerIdStr);
                        const target = players.find(p => p.id === playerId);
                        
                        if (!target) return;
                        
                        if (unitType === 'commander') {
                          updateCommanderHP(playerId, -damage);
                        } else {
                          const member = calculatorData.targetSquadMembers.find(m => 
                            m.playerId === playerId && m.unitType === unitType
                          );
                          
                          if (member && target.subUnits[member.unitIndex]) {
                            const unitId = target.subUnits[member.unitIndex].id;
                            updateSubUnitHP(playerId, unitId, -damage);
                          }
                        }
                      }
                    });

                    // Log the action
                    const actionVerb = calculatorData.action === 'shoot' ? 'shot' : 
                                      calculatorData.action === 'melee' ? 'attacked' : 
                                      'used special weapon on';
                    const targetNames = calculatorData.targetSquadMembers
                      .filter(m => damageDistribution[`${m.playerId}-${m.unitType}`] > 0)
                      .map(m => {
                        const target = players.find(p => p.id === m.playerId);
                        const damage = damageDistribution[`${m.playerId}-${m.unitType}`];
                        return `${getUnitName(target, m.unitType)} (${damage}hp)`;
                      })
                      .join(', ');
                    
                    addLog(`${calculatorData.attackerName} ${actionVerb} ${targetNames}`);

                    // Apply cooldown if special weapon was used by commander
                    if (calculatorData.action === 'special' && !calculatorData.attackerIsSquad) {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      if (attacker && !attacker.commanderStats.cooldown) {
                        toggleCommanderCooldown(calculatorData.attackerId);
                      }
                    }

                    // Close modals
                    setShowDamageDistribution(false);
                    setDamageDistribution({});
                    setShowCalculator(false);
                    setCalculatorData(null);
                  }}
                  disabled={(() => {
                    const attacker = players.find(p => p.id === calculatorData.attackerId);
                    let totalAvailableDamage = 0;
                    
                    if (calculatorData.attackerIsSquad) {
                      Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                        if (hits > 0) {
                          const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                          const memberStats = getUnitStats(attacker, unitType);
                          if (memberStats) {
                            const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                              calculatorData.action === 'melee' ? memberStats.meleeDamage :
                              memberStats.specialDamage || 2;
                            totalAvailableDamage += hits * damagePerHit;
                          }
                        }
                      });
                    } else {
                      const stats = calculatorData.stats;
                      const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                        calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                        (stats?.specialDamage || 2);
                      totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                    }

                    const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                    return totalDistributed !== totalAvailableDamage;
                  })()}
                  style={{
                    flex: 1,
                    background: (() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      let totalAvailableDamage = 0;
                      
                      if (calculatorData.attackerIsSquad) {
                        Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                          if (hits > 0) {
                            const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                            const memberStats = getUnitStats(attacker, unitType);
                            if (memberStats) {
                              const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                                calculatorData.action === 'melee' ? memberStats.meleeDamage :
                                memberStats.specialDamage || 2;
                              totalAvailableDamage += hits * damagePerHit;
                            }
                          }
                        });
                      } else {
                        const stats = calculatorData.stats;
                        const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                          calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                          (stats?.specialDamage || 2);
                        totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                      }

                      const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                      return totalDistributed === totalAvailableDamage ? 
                        'linear-gradient(to bottom, #15803d, #14532d)' : '#1a0f0a';
                    })(),
                    color: (() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      let totalAvailableDamage = 0;
                      
                      if (calculatorData.attackerIsSquad) {
                        Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                          if (hits > 0) {
                            const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                            const memberStats = getUnitStats(attacker, unitType);
                            if (memberStats) {
                              const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                                calculatorData.action === 'melee' ? memberStats.meleeDamage :
                                memberStats.specialDamage || 2;
                              totalAvailableDamage += hits * damagePerHit;
                            }
                          }
                        });
                      } else {
                        const stats = calculatorData.stats;
                        const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                          calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                          (stats?.specialDamage || 2);
                        totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                      }

                      const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                      return totalDistributed === totalAvailableDamage ? '#86efac' : '#4a3322';
                    })(),
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: (() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      let totalAvailableDamage = 0;
                      
                      if (calculatorData.attackerIsSquad) {
                        Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                          if (hits > 0) {
                            const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                            const memberStats = getUnitStats(attacker, unitType);
                            if (memberStats) {
                              const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                                calculatorData.action === 'melee' ? memberStats.meleeDamage :
                                memberStats.specialDamage || 2;
                              totalAvailableDamage += hits * damagePerHit;
                            }
                          }
                        });
                      } else {
                        const stats = calculatorData.stats;
                        const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                          calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                          (stats?.specialDamage || 2);
                        totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                      }

                      const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                      return totalDistributed === totalAvailableDamage ? '#16a34a' : '#4a3322';
                    })(),
                    cursor: (() => {
                      const attacker = players.find(p => p.id === calculatorData.attackerId);
                      let totalAvailableDamage = 0;
                      
                      if (calculatorData.attackerIsSquad) {
                        Object.entries(calculatorData.squadMemberHits || {}).forEach(([memberIndex, hits]) => {
                          if (hits > 0) {
                            const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
                            const memberStats = getUnitStats(attacker, unitType);
                            if (memberStats) {
                              const damagePerHit = calculatorData.action === 'shoot' ? memberStats.shootDamage :
                                calculatorData.action === 'melee' ? memberStats.meleeDamage :
                                memberStats.specialDamage || 2;
                              totalAvailableDamage += hits * damagePerHit;
                            }
                          }
                        });
                      } else {
                        const stats = calculatorData.stats;
                        const damagePerHit = calculatorData.action === 'shoot' ? (stats?.shootDamage || 1) :
                          calculatorData.action === 'melee' ? (stats?.meleeDamage || 1) :
                          (stats?.specialDamage || 2);
                        totalAvailableDamage = (calculatorData.soloHits || 0) * damagePerHit;
                      }

                      const totalDistributed = Object.values(damageDistribution).reduce((sum, val) => sum + val, 0);
                      return totalDistributed === totalAvailableDamage ? 'pointer' : 'not-allowed';
                    })(),
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  ✓ Apply Damage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HPCounter;