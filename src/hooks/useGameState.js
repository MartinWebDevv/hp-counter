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

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedPlayers = localStorage.getItem('hpCounterPlayers');
      const savedRound = localStorage.getItem('hpCounterRound');
      const savedLog = localStorage.getItem('hpCounterLog');
      const savedMode = localStorage.getItem('hpCounterGameMode');
      const savedCustomSettings = localStorage.getItem('hpCounterCustomSettings');
      const savedPlayerIndex = localStorage.getItem('hpCounterCurrentPlayerIndex');
      
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
      if (savedRound) setCurrentRound(parseInt(savedRound));
      if (savedLog) setCombatLog(JSON.parse(savedLog));
      if (savedMode) setGameMode(savedMode);
      if (savedCustomSettings) setCustomModeSettings(JSON.parse(savedCustomSettings));
      if (savedPlayerIndex) setCurrentPlayerIndex(parseInt(savedPlayerIndex));
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
      if (customModeSettings) {
        localStorage.setItem('hpCounterCustomSettings', JSON.stringify(customModeSettings));
      }
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }, [players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex]);

  // Get current mode config
  const getModeValues = () => {
    if (gameMode === 'custom' && customModeSettings) {
      return customModeSettings;
    }
    return getModeConfig(gameMode);
  };

  const addPlayer = () => {
    const modeConfig = getModeValues();
    
    const newPlayer = {
      id: Date.now(),
      playerName: `Player ${players.length + 1}`,
      faction: 'Red Rovers',
      commander: 'Lord Fantastic',
      playerColor: '#3b82f6', // Default blue
      isSquad: false,
      selectedUnit: 'commander',
      commanderStats: {
        hp: modeConfig.commanderHP,
        maxHp: modeConfig.commanderHP,
        cooldownRounds: 0, // Changed from boolean to counter
        revives: modeConfig.commanderRevives,
        isDead: false
      },
      subUnits: Array(5).fill(null).map((_, i) => ({
        hp: modeConfig.squadHP,
        maxHp: modeConfig.squadHP,
        name: '',
        unitType: i === 0 ? 'special' : 'soldier',
        revives: modeConfig.squadRevives
      })),
      squadMembers: [],
      actionHistory: []
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
    
    // Adjust current player index if needed
    if (fromIndex === currentPlayerIndex) {
      setCurrentPlayerIndex(toIndex);
    } else if (fromIndex < currentPlayerIndex && toIndex >= currentPlayerIndex) {
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    } else if (fromIndex > currentPlayerIndex && toIndex <= currentPlayerIndex) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    }
  };

  const updatePlayer = (playerId, updates) => {
    // Save snapshot before update
    setActionHistory(prev => [...prev, { 
      players, 
      currentRound, 
      combatLog, 
      currentPlayerIndex, 
      playersWhoActedThisRound 
    }].slice(-10)); // Keep last 10
    
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
        // Creating squad - activate special unit and first two soldiers
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
        // Disbanding squad
        return {
          ...player,
          isSquad: false,
          squadMembers: [],
          selectedUnit: 'commander'
        };
      }
    }));
  };

  const useRevive = (playerId) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      
      // Check if can revive
      if (player.commanderStats.revives <= 0 || player.commanderStats.hp > 0) {
        return player;
      }
      
      // Use a revive and restore half HP, set new maxHP
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
    }));
    
    const player = players.find(p => p.id === playerId);
    if (player) {
      const newMaxHP = Math.floor(player.commanderStats.maxHp / 2);
      addLog(`${player.playerName}'s commander revived with ${newMaxHP}hp (new max)!`);
    }
  };

  const changeGameMode = (newMode, customSettings = null) => {
    if (players.length > 0) {
      const confirm = window.confirm(
        'Changing game mode will reset all players. Continue?'
      );
      if (!confirm) return false;
    }
    
    setGameMode(newMode);
    if (newMode === 'custom') {
      setCustomModeSettings(customSettings);
    }
    setPlayers([]);
    setCombatLog([]);
    setCurrentRound(1);
    
    addLog(`Game mode changed to ${getModeConfig(newMode).name}`);
    return true;
  };

  const endTurn = () => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    // Mark this player as having acted
    const newPlayersWhoActed = [...playersWhoActedThisRound, currentPlayer.id];
    setPlayersWhoActedThisRound(newPlayersWhoActed);

    // Get alive players
    const alivePlayers = players.filter(p => p.commanderStats.hp > 0);
    
    // Check if all alive players have acted
    const allPlayersActed = alivePlayers.every(p => newPlayersWhoActed.includes(p.id));

    if (allPlayersActed) {
      // New round - decrement cooldowns and reset
      setPlayers(prev => prev.map(player => ({
        ...player,
        commanderStats: {
          ...player.commanderStats,
          cooldownRounds: Math.max(0, (player.commanderStats.cooldownRounds || 0) - 1)
        }
      })));
      
      setCurrentRound(prev => prev + 1);
      setPlayersWhoActedThisRound([]);
      setCurrentPlayerIndex(0);
      addLog(`----- Round ${currentRound + 1} -----`);
    } else {
      // Find next alive player
      let nextIndex = (currentPlayerIndex + 1) % players.length;
      while (nextIndex !== currentPlayerIndex && 
             (players[nextIndex].commanderStats.hp === 0 || 
              newPlayersWhoActed.includes(players[nextIndex].id))) {
        nextIndex = (nextIndex + 1) % players.length;
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

  return {
    players,
    currentRound,
    combatLog,
    gameMode,
    customModeSettings,
    currentPlayerIndex,
    playersWhoActedThisRound,
    setPlayers,
    addPlayer,
    removePlayer,
    reorderPlayers,
    updatePlayer,
    toggleSquad,
    useRevive,
    changeGameMode,
    getModeValues,
    endTurn,
    undo,
    addLog,
    clearLog,
    resetGame
  };
};