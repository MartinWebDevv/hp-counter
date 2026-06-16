import { useState, useEffect, useCallback } from 'react';
import { getModeConfig, DEFAULT_MODE } from '../data/gameModes';

// ── localStorage key constants — change the prefix here only ─────────────────
const LS = {
  players:      'bt_players',
  round:        'bt_round',
  log:          'bt_log',
  gameMode:     'bt_gameMode',
  customSettings:'bt_customSettings',
  playerIndex:  'bt_playerIndex',
  gameStarted:  'bt_gameStarted',
  lootPool:     'bt_lootPool',
};

/** Clear revival immunity for a given player object. Pure — returns new object. */
const clearRevivalImmunity = (player) => {
  const hasImmune = player.subUnits.some(u => u.revivedOnPlayerId === player.id);
  if (!hasImmune) return player;
  return {
    ...player,
    subUnits: player.subUnits.map(u =>
      u.revivedOnPlayerId === player.id ? { ...u, revivedOnPlayerId: null } : u
    ),
  };
};

/**
 * useGameState
 * Manages players, rounds, combat log, game modes, and local persistence.
 */
export const useGameState = (onRoundAdvance = null, onPlayerTurnEnd = null) => {
  const [players,                  setPlayers]                  = useState([]);
  const [currentRound,             setCurrentRound]             = useState(1);
  const [combatLog,                setCombatLog]                = useState([]);
  const [gameMode,                 setGameMode]                 = useState(DEFAULT_MODE);
  const [customModeSettings,       setCustomModeSettings]       = useState(null);
  const [currentPlayerIndex,       setCurrentPlayerIndex]       = useState(0);
  const [playersWhoActedThisRound, setPlayersWhoActedThisRound] = useState([]);
  const [actionHistory,            setActionHistory]            = useState([]);
  const [gameStarted,              setGameStarted]              = useState(false);
  const [lootPool,                 setLootPool]                 = useState(() => {
    try {
      const saved = localStorage.getItem(LS.lootPool);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── Persistence: load on mount ────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedPlayers      = localStorage.getItem(LS.players);
      const savedRound        = localStorage.getItem(LS.round);
      const savedLog          = localStorage.getItem(LS.log);
      const savedMode         = localStorage.getItem(LS.gameMode);
      const savedCustom       = localStorage.getItem(LS.customSettings);
      const savedIndex        = localStorage.getItem(LS.playerIndex);
      const savedGameStarted  = localStorage.getItem(LS.gameStarted);

      if (savedPlayers) {
        const parsed = JSON.parse(savedPlayers);
        // Clear session-only flags on restore — they only apply in live multiplayer
        setPlayers(parsed.map(p => ({ ...p, isAbsent: false, isManual: false, isLeft: false })));
      }
      if (savedRound)       setCurrentRound(parseInt(savedRound, 10));
      if (savedLog)         setCombatLog(JSON.parse(savedLog));
      if (savedMode)        setGameMode(savedMode);
      if (savedCustom)      setCustomModeSettings(JSON.parse(savedCustom));
      if (savedIndex)       setCurrentPlayerIndex(parseInt(savedIndex, 10));
      if (savedGameStarted) setGameStarted(JSON.parse(savedGameStarted));
    } catch (err) {
      console.error('Error loading saved game state:', err);
    }
  }, []);

  // ── Persistence: save on change ───────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS.players,     JSON.stringify(players));
      localStorage.setItem(LS.round,       currentRound.toString());
      localStorage.setItem(LS.log,         JSON.stringify(combatLog));
      localStorage.setItem(LS.gameMode,    gameMode);
      localStorage.setItem(LS.playerIndex, currentPlayerIndex.toString());
      localStorage.setItem(LS.gameStarted, JSON.stringify(gameStarted));
      localStorage.setItem(LS.lootPool,    JSON.stringify(lootPool));
      if (customModeSettings) {
        localStorage.setItem(LS.customSettings, JSON.stringify(customModeSettings));
      }
    } catch (err) {
      console.error('Error saving game state:', err);
    }
  }, [players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex, gameStarted, lootPool]);

  // ── Mode helpers ──────────────────────────────────────────────────────────

  const getModeValues = useCallback(() => {
    if (gameMode === 'custom' && customModeSettings) return customModeSettings;
    return getModeConfig(gameMode);
  }, [gameMode, customModeSettings]);

  /** FIXED: reads `squadLives` (was mistakenly reading `soldierLives`). */
  const getSquadLives = useCallback(() => {
    const mode = getModeValues();
    return mode.squadLives ?? 1;
  }, [getModeValues]);

  // ── Player CRUD ───────────────────────────────────────────────────────────

  const addPlayer = useCallback(() => {
    const modeConfig  = getModeValues();
    const squadLives  = getSquadLives();

    const newPlayer = {
      id:            Date.now(),
      playerName:    `Player ${players.length + 1}`,
      faction:       'Red Rovers',
      commander:     'Lord Fantastic',
      playerColor:   '#3b82f6',
      isSquad:       false,
      selectedUnit:  'commander',
      commanderStats: {
        hp:             modeConfig.commanderHP,
        maxHp:          modeConfig.commanderHP,
        baseMaxHp:      modeConfig.commanderHP,
        cooldownRounds: 0,
        revives:        modeConfig.commanderRevives,
        isDead:         false,
      },
      subUnits: Array(5).fill(null).map((_, i) => ({
        hp:             modeConfig.squadHP,
        maxHp:          modeConfig.squadHP,
        baseMaxHp:      modeConfig.squadHP,
        name:           '',
        unitType:       i === 0 ? 'special' : 'soldier',
        revives:        modeConfig.squadRevives,
        livesRemaining: squadLives,
      })),
      squadMembers:  [],
      actionHistory: [],
      reviveQueue:   [],
      inventory:     [],
    };
    setPlayers(prev => [...prev, newPlayer]);
  }, [players.length, getModeValues, getSquadLives]);

  const removePlayer = useCallback((playerId) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  const reorderPlayers = useCallback((fromIndex, toIndex) => {
    setPlayers(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setCurrentPlayerIndex(prev => {
      if (fromIndex === prev)                               return toIndex;
      if (fromIndex < prev && toIndex >= prev)             return prev - 1;
      if (fromIndex > prev && toIndex <= prev)             return prev + 1;
      return prev;
    });
  }, []);

  const updatePlayer = useCallback((playerId, updates) => {
    setActionHistory(prev => [...prev, {
      players, currentRound, combatLog, currentPlayerIndex, playersWhoActedThisRound,
    }].slice(-10));

    setPlayers(prev => prev.map(p =>
      String(p.id) === String(playerId) ? { ...p, ...updates } : p
    ));
  }, [players, currentRound, combatLog, currentPlayerIndex, playersWhoActedThisRound]);

  const undo = useCallback(() => {
    if (actionHistory.length === 0) return;
    const last = actionHistory[actionHistory.length - 1];
    setPlayers(last.players);
    setCurrentRound(last.currentRound);
    setCombatLog(last.combatLog);
    setCurrentPlayerIndex(last.currentPlayerIndex);
    setPlayersWhoActedThisRound(last.playersWhoActedThisRound);
    setActionHistory(prev => prev.slice(0, -1));
  }, [actionHistory]);

  const toggleSquad = useCallback((playerId) => {
    setPlayers(prev => prev.map(p => {
      if (String(p.id) !== String(playerId)) return p;
      if (!p.isSquad) {
        return {
          ...p,
          isSquad: true,
          squadMembers: [
            { index: 0, unitType: 'special',  active: true },
            { index: 1, unitType: 'soldier1', active: true },
            { index: 2, unitType: 'soldier2', active: true },
          ],
        };
      }
      return { ...p, isSquad: false, squadMembers: [], selectedUnit: 'commander' };
    }));
  }, []);

  // ── Revive ────────────────────────────────────────────────────────────────

  const useRevive = useCallback((playerId, isSuccessful = true) => {
    setPlayers(prev => prev.map(player => {
      if (String(player.id) !== String(playerId)) return player;
      if (player.commanderStats.revives <= 0 || player.commanderStats.hp > 0) return player;

      if (isSuccessful) {
        const baseMax  = player.commanderStats.baseMaxHp || player.commanderStats.maxHp;
        const newMaxHP = Math.floor(player.commanderStats.maxHp / 2);
        // Log inside the setter so the HP value is always accurate
        addLog(
          `${player.playerName}'s ${player.commanderStats?.customName || player.commander || 'Commander'} revived with ${newMaxHP}hp (new max)!`,
          'combat'
        );
        return {
          ...player,
          commanderStats: {
            ...player.commanderStats,
            hp:       newMaxHP,
            maxHp:    newMaxHP,
            baseMaxHp: baseMax,
            revives:  player.commanderStats.revives - 1,
            isDead:   false,
          },
        };
      }

      addLog(
        `${player.playerName}'s ${player.commanderStats?.customName || player.commander || 'Commander'} failed to revive — eliminated from the game!`,
        'combat'
      );
      return {
        ...player,
        commanderStats: {
          ...player.commanderStats,
          hp:      0,
          revives: 0,
          isDead:  true,
        },
      };
    }));
  }, []);  // addLog is stable — declared below with no deps

  const processSquadRevive = useCallback((playerId, isSuccessful) => {
    setPlayers(prev => prev.map(player => {
      if (String(player.id) !== String(playerId)) return player;

      const queue = player.reviveQueue || [];
      if (queue.length === 0) return player;

      const unitIndex = queue[0];
      const unit      = player.subUnits[unitIndex];
      if (!unit) return player;

      if (isSuccessful) {
        const baseMax   = unit.baseMaxHp || unit.maxHp;
        const newMaxHP  = Math.floor(unit.maxHp / 2);
        const newSubs   = player.subUnits.map((u, i) =>
          i === unitIndex
            ? { ...u, hp: newMaxHP, maxHp: newMaxHP, baseMaxHp: baseMax,
                livesRemaining: Math.max(0, (u.livesRemaining ?? 1) - 1),
                revivedOnPlayerId: player.id }
            : u
        );
        addLog(`✅ ${player.playerName}'s ${unit.name || `Unit ${unitIndex + 1}`} revived with ${newMaxHP}hp! (immune this round)`, 'combat');
        return { ...player, subUnits: newSubs, reviveQueue: queue.slice(1) };
      }

      addLog(`❌ ${player.playerName}'s ${unit.name || `Unit ${unitIndex + 1}`} failed to revive — still in queue.`, 'combat');
      return player;
    }));
  }, []);

  // ── Squad wipe (exported for external callers, also used internally) ──────
  const checkSquadWipe = useCallback((player) => {
    if (!player.subUnits.every(u => u.hp === 0)) return player;
    addLog(`💀 SQUAD WIPE! ${player.playerName}'s entire squad is eliminated!`, 'combat');
    return {
      ...player,
      reviveQueue: [],
      subUnits: player.subUnits.map(u => ({ ...u, livesRemaining: 0, revives: 0 })),
    };
  }, []);

  // ── Game mode ─────────────────────────────────────────────────────────────

  const changeGameMode = useCallback((newMode, customSettings = null) => {
    const cfg        = newMode === 'custom' && customSettings ? customSettings : getModeConfig(newMode);
    const squadLives = cfg.squadLives ?? 1;

    if (players.length > 0) {
      setPlayers(prev => prev.map(p => ({
        ...p,
        commanderStats: {
          ...p.commanderStats,
          hp: cfg.commanderHP, maxHp: cfg.commanderHP,
          revives: cfg.commanderRevives, cooldownRounds: 0, isDead: false,
        },
        subUnits: p.subUnits.map(u => ({
          ...u,
          hp: cfg.squadHP, maxHp: cfg.squadHP,
          revives: cfg.squadRevives, livesRemaining: squadLives,
        })),
        reviveQueue: [],
      })));
    }

    setGameMode(newMode);
    if (newMode === 'custom') setCustomModeSettings(customSettings);

    setCombatLog([]);
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setPlayersWhoActedThisRound([]);
    setGameStarted(false);

    addLog(`Game mode changed to ${cfg.name}`, 'system');
    return true;
  }, [players]);

  // ── Status helpers ────────────────────────────────────────────────────────

  const isPlayerFullyDead = useCallback((player) => {
    if (player.isAbsent) return true;
    const cmdDead    = player.commanderStats.hp === 0 && (player.commanderStats.revives || 0) === 0;
    const squadDead  = player.subUnits.every(u => u.hp === 0 && (u.revives || 0) === 0);
    return cmdDead && squadDead;
  }, []);

  // ── Turn management ───────────────────────────────────────────────────────

  const addLog = useCallback((message, category = 'system') => {
    setCombatLog(prev => [{
      id:        Date.now(),
      round:     currentRound,
      message,
      category,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, [currentRound]);

  const startGame = useCallback(() => {
    if (players.length === 0) return;
    setGameStarted(true);
    setCurrentPlayerIndex(0);
    setPlayersWhoActedThisRound([]);
    addLog(`----- Game Started - Round ${currentRound} -----`, 'system');
  }, [players.length, currentRound, addLog]);

  /**
   * Campaign-safe side-effects only — fires cooldowns + timer callbacks.
   * Campaign mode owns index / acted-list advancement via useCampaignTurn.
   */
  const endTurnSideEffectsOnly = useCallback((playerId) => {
    setPlayers(prev => prev.map(p => {
      if (String(p.id) !== String(playerId)) return p;
      return {
        ...p,
        commanderStats: {
          ...p.commanderStats,
          cooldownRounds: Math.max(0, (p.commanderStats?.cooldownRounds || 0) - 1),
        },
      };
    }));
    if (onPlayerTurnEnd) onPlayerTurnEnd(playerId);
  }, [onPlayerTurnEnd]);

  const endTurn = useCallback(() => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    // Decrement cooldown for the current player
    setPlayers(prev => prev.map(p => {
      if (p.id !== currentPlayer.id) return p;
      return {
        ...p,
        commanderStats: {
          ...p.commanderStats,
          cooldownRounds: Math.max(0, (p.commanderStats?.cooldownRounds || 0) - 1),
        },
      };
    }));

    if (onPlayerTurnEnd) onPlayerTurnEnd(currentPlayer.id);

    const newActed      = [...playersWhoActedThisRound, currentPlayer.id];
    const alivePlayers  = players.filter(p => !isPlayerFullyDead(p));

    if (alivePlayers.length === 0) return;

    setPlayersWhoActedThisRound(newActed);

    const allActed = alivePlayers.every(p => newActed.includes(p.id));

    if (allActed) {
      // ── New round ─────────────────────────────────────────────────────────
      let firstAlive = 0;
      while (firstAlive < players.length && isPlayerFullyDead(players[firstAlive])) firstAlive++;

      setPlayers(prev => prev.map(p =>
        p.id === players[firstAlive]?.id ? clearRevivalImmunity(p) : p
      ));

      setCurrentRound(prev => prev + 1);
      setPlayersWhoActedThisRound([]);
      setCurrentPlayerIndex(firstAlive);
      if (onRoundAdvance) onRoundAdvance();
      addLog(`----- Round ${currentRound + 1} -----`, 'system');
    } else {
      // ── Next player in this round ─────────────────────────────────────────
      let nextIdx  = (currentPlayerIndex + 1) % players.length;
      let attempts = 0;
      while (
        attempts < players.length &&
        (isPlayerFullyDead(players[nextIdx]) || newActed.includes(players[nextIdx].id))
      ) {
        nextIdx = (nextIdx + 1) % players.length;
        attempts++;
      }

      if (attempts >= players.length) {
        console.error('[useGameState] Could not find next player');
        return;
      }

      setPlayers(prev => prev.map(p =>
        p.id === players[nextIdx]?.id ? clearRevivalImmunity(p) : p
      ));
      setCurrentPlayerIndex(nextIdx);
    }
  }, [players, currentPlayerIndex, playersWhoActedThisRound, currentRound, isPlayerFullyDead, onRoundAdvance, onPlayerTurnEnd, addLog]);

  // ── Game lifecycle ────────────────────────────────────────────────────────

  const clearLog = useCallback(() => setCombatLog([]), []);

  const resetGame = useCallback(() => {
    if (window.confirm('Reset the entire game? This will clear all players and combat log.')) {
      setPlayers([]);
      setCurrentRound(1);
      setCombatLog([]);
      setCurrentPlayerIndex(0);
      setPlayersWhoActedThisRound([]);
      setLootPool([]);
      Object.values(LS).forEach(key => {
        try { localStorage.removeItem(key); } catch {}
      });
      // NPC storage is managed separately
      try { localStorage.removeItem('bt_npcs'); } catch {}
    }
  }, []);

  const loadGameState = useCallback((state) => {
    setPlayers(state.players || []);
    setCurrentRound(state.currentRound || 1);
    setCombatLog(state.combatLog || []);
    setGameMode(state.gameMode || 'd20');
    if (state.customModeSettings) setCustomModeSettings(state.customModeSettings);
    setCurrentPlayerIndex(state.currentPlayerIndex || 0);
    setPlayersWhoActedThisRound(state.playersWhoActedThisRound || []);
    setGameStarted(state.gameStarted || false);
  }, []);

  const startNewSession = useCallback((resetNPCsFn) => {
    const modeConfig = getModeValues();
    const squadLives = getSquadLives();

    setPlayers(prev => prev.map(player => {
      const cmdMax  = player.commanderStats.baseMaxHp || player.commanderStats.maxHp || 20;
      return {
        ...player,
        selectedUnit: 'commander',
        commanderStats: {
          ...player.commanderStats,
          hp: cmdMax, maxHp: cmdMax, baseMaxHp: cmdMax,
          revives: modeConfig.commanderRevives,
          isDead: false, cooldownRounds: 0, statusEffects: [],
        },
        subUnits: (player.subUnits || []).map(unit => {
          const unitMax = unit.baseMaxHp || unit.maxHp || 10;
          return {
            ...unit,
            hp: unitMax, maxHp: unitMax, baseMaxHp: unitMax,
            revives: modeConfig.squadRevives,
            livesRemaining: squadLives,
            revivedOnPlayerId: null,
            statusEffects: [],
          };
        }),
        reviveQueue:         [],
        pendingAttackBonus:  0,
        pendingDefenseBonus: 0,
        firstStrike:         false,
      };
    }));

    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setPlayersWhoActedThisRound([]);
    setGameStarted(false);
    if (resetNPCsFn) resetNPCsFn();
    addLog('🔄 New session started — all units restored. Loot and chests preserved.', 'system');
  }, [getModeValues, getSquadLives, addLog]);

  return {
    // State
    players, currentRound, combatLog, gameMode, customModeSettings,
    currentPlayerIndex, playersWhoActedThisRound, gameStarted, lootPool,
    // Setters (exposed for campaign mode's direct control)
    setPlayers, setCurrentRound, setPlayersWhoActedThisRound, setLootPool,
    // Player management
    addPlayer, removePlayer, reorderPlayers, updatePlayer,
    toggleSquad, useRevive, processSquadRevive, checkSquadWipe,
    // Mode
    changeGameMode, getModeValues, getSquadLives,
    // Turn
    startGame, endTurn, endTurnSideEffectsOnly, undo,
    // Log
    addLog, clearLog,
    // Lifecycle
    resetGame, loadGameState, startNewSession,
    isPlayerFullyDead,
  };
};
