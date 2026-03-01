import { useState, useEffect } from 'react';
import { getModeConfig, DEFAULT_MODE } from '../data/gameModes';

/**
 * Custom hook for managing game state
 * Handles players, rounds, combat log, game modes, and persistence
 */
export const useGameState = () => {
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [combatLog, setCombatLog] = useState([]);
  const [gameMode, setGameMode] = useState(DEFAULT_MODE);
  const [customModeSettings, setCustomModeSettings] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playersWhoActedThisRound, setPlayersWhoActedThisRound] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedPlayers = localStorage.getItem('hpCounterPlayers');
      const savedRound = localStorage.getItem('hpCounterRound');
      const savedLog = localStorage.getItem('hpCounterLog');
      const savedMode = localStorage.getItem('hpCounterGameMode');
      const savedCustomSettings = localStorage.getItem('hpCounterCustomSettings');
      const savedPlayerIndex = localStorage.getItem('hpCounterCurrentPlayerIndex');
      const savedGameStarted = localStorage.getItem('hpCounterGameStarted');
      
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
      if (savedRound) setCurrentRound(parseInt(savedRound));
      if (savedLog) setCombatLog(JSON.parse(savedLog));
      if (savedMode) setGameMode(savedMode);
      if (savedCustomSettings) setCustomModeSettings(JSON.parse(savedCustomSettings));
      if (savedPlayerIndex) setCurrentPlayerIndex(parseInt(savedPlayerIndex));
      if (savedGameStarted) setGameStarted(JSON.parse(savedGameStarted));
    } catch (error) {
      console.error('Error loading saved game state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('hpCounterPlayers', JSON.stringify(players));
      localStorage.setItem('hpCounterRound', currentRound.toString());
      localStorage.setItem('hpCounterLog', JSON.stringify(combatLog));
      localStorage.setItem('hpCounterGameMode', gameMode);
      localStorage.setItem('hpCounterCurrentPlayerIndex', currentPlayerIndex.toString());
      localStorage.setItem('hpCounterGameStarted', JSON.stringify(gameStarted));
      if (customModeSettings) {
        localStorage.setItem('hpCounterCustomSettings', JSON.stringify(customModeSettings));
      }
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }, [players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex, gameStarted]);

  // Get current mode config
  const getModeValues = () => {
    if (gameMode === 'custom' && customModeSettings) {
      return customModeSettings;
    }
    return getModeConfig(gameMode);
  };

  // Get lives per soldier based on game mode
  const getSoldierLives = () => {
    const mode = getModeValues();
    // D20 mode = 1 life, Classic mode = 2 lives
    // Check for explicit soldierLives in config, else fallback by name
    if (mode.soldierLives !== undefined) return mode.soldierLives;
    return mode.name?.toLowerCase().includes('classic') ? 2 : 1;
  };

  const addPlayer = () => {
    const modeConfig = getModeValues();
    const soldierLives = getSoldierLives();
    
    const newPlayer = {
      id: Date.now(),
      playerName: `Player ${players.length + 1}`,
      faction: 'Red Rovers',
      commander: 'Lord Fantastic',
      playerColor: '#3b82f6',
      isSquad: false,
      selectedUnit: 'commander',
      commanderStats: {
        hp: modeConfig.commanderHP,
        maxHp: modeConfig.commanderHP,
        cooldownRounds: 0,
        revives: modeConfig.commanderRevives,
        isDead: false
      },
      subUnits: Array(5).fill(null).map((_, i) => ({
        hp: modeConfig.squadHP,
        maxHp: modeConfig.squadHP,
        name: '',
        unitType: i === 0 ? 'special' : 'soldier',
        revives: modeConfig.squadRevives,
        livesRemaining: soldierLives,
      })),
      squadMembers: [],
      actionHistory: [],
      // Revive queue: array of unit indices (0=special, 1-4=soldiers) in death order
      reviveQueue: [],
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const removePlayer = (playerId) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const reorderPlayers = (fromIndex, toIndex) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      const [moved] = newPlayers.splice(fromIndex, 1);
      newPlayers.splice(toIndex, 0, moved);
      return newPlayers;
    });
    
    if (fromIndex === currentPlayerIndex) {
      setCurrentPlayerIndex(toIndex);
    } else if (fromIndex < currentPlayerIndex && toIndex >= currentPlayerIndex) {
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    } else if (fromIndex > currentPlayerIndex && toIndex <= currentPlayerIndex) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    }
  };

  const updatePlayer = (playerId, updates) => {
    setActionHistory(prev => [...prev, { 
      players, 
      currentRound, 
      combatLog, 
      currentPlayerIndex, 
      playersWhoActedThisRound 
    }].slice(-10));
    
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    ));
  };

  const undo = () => {
    if (actionHistory.length === 0) {
      alert('Nothing to undo!');
      return;
    }
    
    const lastState = actionHistory[actionHistory.length - 1];
    setPlayers(lastState.players);
    setCurrentRound(lastState.currentRound);
    setCombatLog(lastState.combatLog);
    setCurrentPlayerIndex(lastState.currentPlayerIndex);
    setPlayersWhoActedThisRound(lastState.playersWhoActedThisRound);
    setActionHistory(prev => prev.slice(0, -1));
  };

  const toggleSquad = (playerId) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      
      if (!player.isSquad) {
        return {
          ...player,
          isSquad: true,
          squadMembers: [
            { index: 0, unitType: 'special', active: true },
            { index: 1, unitType: 'soldier1', active: true },
            { index: 2, unitType: 'soldier2', active: true }
          ]
        };
      } else {
        return {
          ...player,
          isSquad: false,
          squadMembers: [],
          selectedUnit: 'commander'
        };
      }
    }));
  };

  const useRevive = (playerId, isSuccessful = true) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      
      if (player.commanderStats.revives <= 0 || player.commanderStats.hp > 0) {
        return player;
      }
      
      if (isSuccessful) {
        const newMaxHP = Math.floor(player.commanderStats.maxHp / 2);
        const restoredHP = newMaxHP;
        
        return {
          ...player,
          commanderStats: {
            ...player.commanderStats,
            hp: restoredHP,
            maxHp: newMaxHP,
            revives: player.commanderStats.revives - 1,
            isDead: false
          }
        };
      } else {
        return {
          ...player,
          commanderStats: {
            ...player.commanderStats,
            hp: 0,
            revives: 0,
            isDead: true
          }
        };
      }
    }));
    
    const player = players.find(p => p.id === playerId);
    if (player) {
      if (isSuccessful) {
        const newMaxHP = Math.floor(player.commanderStats.maxHp / 2);
        addLog(`${player.playerName}'s commander revived with ${newMaxHP}hp (new max)!`);
      } else {
        addLog(`${player.playerName}'s commander failed to revive - eliminated from game!`);
      }
    }
  };

  /**
   * Check if all 5 soldiers are dead → squad wipe
   * Clears queue and zeroes out all livesRemaining
   */
  const checkSquadWipe = (player) => {
    const allDead = player.subUnits.every(unit => unit.hp === 0);
    if (!allDead) return player;

    // Squad wipe! Clear queue and set all lives to 0
    addLog(`💀 SQUAD WIPE! ${player.playerName}'s entire squad is eliminated!`);
    return {
      ...player,
      reviveQueue: [],
      subUnits: player.subUnits.map(unit => ({
        ...unit,
        livesRemaining: 0,
        revives: 0,
      })),
    };
  };

  /**
   * Process one revive attempt for the first soldier in the queue.
   * isSuccessful=true  → revive at half HP, remove from queue, decrement livesRemaining
   * isSuccessful=false → stay in queue (no life lost per spec)
   */
  const processSquadRevive = (playerId, isSuccessful) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;

      const queue = player.reviveQueue || [];
      if (queue.length === 0) return player;

      const unitIndex = queue[0]; // First in queue gets the attempt
      const unit = player.subUnits[unitIndex];

      if (!unit) return player;

      if (isSuccessful) {
        const newMaxHP = Math.floor(unit.maxHp / 2);
        const restoredHP = newMaxHP;

        const newSubUnits = player.subUnits.map((u, i) =>
          i === unitIndex
            ? {
                ...u,
                hp: restoredHP,
                maxHp: newMaxHP,
                livesRemaining: Math.max(0, (u.livesRemaining ?? 1) - 1),
              }
            : u
        );

        const newQueue = queue.slice(1); // Remove from front of queue

        const updatedPlayer = {
          ...player,
          subUnits: newSubUnits,
          reviveQueue: newQueue,
        };

        addLog(`✅ ${player.playerName}'s ${unit.name || `Unit ${unitIndex}`} revived with ${restoredHP}hp!`);
        return updatedPlayer;
      } else {
        // Fail: stays in queue, no life lost
        addLog(`❌ ${player.playerName}'s ${unit.name || `Unit ${unitIndex}`} failed to revive - still in queue.`);
        return player; // No change
      }
    }));
  };

  const changeGameMode = (newMode, customSettings = null) => {
    const newModeConfig = newMode === 'custom' && customSettings 
      ? customSettings 
      : getModeConfig(newMode);

    const soldierLives = newModeConfig.soldierLives ?? 
      (newModeConfig.name?.toLowerCase().includes('classic') ? 2 : 1);
    
    if (players.length > 0) {
      setPlayers(prev => prev.map(player => ({
        ...player,
        commanderStats: {
          ...player.commanderStats,
          hp: newModeConfig.commanderHP,
          maxHp: newModeConfig.commanderHP,
          revives: newModeConfig.commanderRevives,
          cooldownRounds: 0,
          isDead: false
        },
        subUnits: player.subUnits.map(unit => ({
          ...unit,
          hp: newModeConfig.squadHP,
          maxHp: newModeConfig.squadHP,
          revives: newModeConfig.squadRevives,
          livesRemaining: soldierLives,
        })),
        reviveQueue: [],
      })));
    }
    
    setGameMode(newMode);
    if (newMode === 'custom') {
      setCustomModeSettings(customSettings);
    }
    
    setCombatLog([]);
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setPlayersWhoActedThisRound([]);
    setGameStarted(false);
    
    addLog(`Game mode changed to ${newModeConfig.name}`);
    return true;
  };

  const isPlayerFullyDead = (player) => {
    const commanderDead = player.commanderStats.hp === 0 && 
                         (player.commanderStats.revives || 0) === 0;
    
    const allSquadDead = player.subUnits.every(unit => 
      unit.hp === 0 && (unit.revives || 0) === 0
    );
    
    return commanderDead && allSquadDead;
  };

  const startGame = () => {
    if (players.length === 0) {
      alert('Add at least one player to start!');
      return;
    }
    setGameStarted(true);
    setCurrentPlayerIndex(0);
    setPlayersWhoActedThisRound([]);
    addLog(`----- Game Started - Round ${currentRound} -----`);
  };

  const endTurn = () => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    const newPlayersWhoActed = [...playersWhoActedThisRound, currentPlayer.id];
    setPlayersWhoActedThisRound(newPlayersWhoActed);

    const alivePlayers = players.filter(p => !isPlayerFullyDead(p));
    
    if (alivePlayers.length === 0) {
      alert('All players are eliminated! Game Over!');
      return;
    }
    
    const allPlayersActed = alivePlayers.every(p => newPlayersWhoActed.includes(p.id));

    if (allPlayersActed) {
      setPlayers(prev => prev.map(player => ({
        ...player,
        commanderStats: {
          ...player.commanderStats,
          cooldownRounds: Math.max(0, (player.commanderStats.cooldownRounds || 0) - 1)
        }
      })));
      
      setCurrentRound(prev => prev + 1);
      setPlayersWhoActedThisRound([]);
      
      let firstAliveIndex = 0;
      while (firstAliveIndex < players.length && isPlayerFullyDead(players[firstAliveIndex])) {
        firstAliveIndex++;
      }
      setCurrentPlayerIndex(firstAliveIndex);
      addLog(`----- Round ${currentRound + 1} -----`);
    } else {
      let nextIndex = (currentPlayerIndex + 1) % players.length;
      let attempts = 0;
      while (attempts < players.length && 
             (isPlayerFullyDead(players[nextIndex]) || 
              newPlayersWhoActed.includes(players[nextIndex].id))) {
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
      }
      
      if (attempts >= players.length) {
        console.error('Could not find next player');
        return;
      }
      
      setCurrentPlayerIndex(nextIndex);
    }
  };

  const addLog = (message) => {
    setCombatLog(prev => [{
      id: Date.now(),
      round: currentRound,
      message,
      timestamp: new Date().toISOString()
    }, ...prev]);
  };

  const clearLog = () => {
    setCombatLog([]);
  };

  const resetGame = () => {
    if (window.confirm('Reset the entire game? This will clear all players and combat log.')) {
      setPlayers([]);
      setCurrentRound(1);
      setCombatLog([]);
      setCurrentPlayerIndex(0);
      setPlayersWhoActedThisRound([]);
      localStorage.removeItem('hpCounterPlayers');
      localStorage.removeItem('hpCounterRound');
      localStorage.removeItem('hpCounterLog');
      localStorage.removeItem('hpCounterCurrentPlayerIndex');
    }
  };

  const loadGameState = (gameState) => {
    setPlayers(gameState.players || []);
    setCurrentRound(gameState.currentRound || 1);
    setCombatLog(gameState.combatLog || []);
    setGameMode(gameState.gameMode || 'd20');
    if (gameState.customModeSettings) {
      setCustomModeSettings(gameState.customModeSettings);
    }
    setCurrentPlayerIndex(gameState.currentPlayerIndex || 0);
    setPlayersWhoActedThisRound(gameState.playersWhoActedThisRound || []);
    setGameStarted(gameState.gameStarted || false);
  };

  return {
    players,
    currentRound,
    combatLog,
    gameMode,
    customModeSettings,
    currentPlayerIndex,
    playersWhoActedThisRound,
    gameStarted,
    setPlayers,
    addPlayer,
    removePlayer,
    reorderPlayers,
    updatePlayer,
    toggleSquad,
    useRevive,
    changeGameMode,
    getModeValues,
    getSoldierLives,
    startGame,
    endTurn,
    undo,
    addLog,
    clearLog,
    resetGame,
    loadGameState,
    processSquadRevive,
    checkSquadWipe,
  };
};