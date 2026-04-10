import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getModeConfig } from '../data/gameModes';

// ── Convert a lobby player (from CharacterCreator) → game player object ────────
export const lobbyPlayerToGamePlayer = (lobbyPlayer, gameMode = 'campaign') => {
  const config      = getModeConfig(gameMode);
  const soldierLives = config.squadLives ?? 1;

  return {
    id:           lobbyPlayer.uid || `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    uid:          lobbyPlayer.uid || null,   // Firebase uid — null for manually added players
    playerName:   lobbyPlayer.playerName    || lobbyPlayer.commanderName || lobbyPlayer.commander || 'Player',
    faction:      lobbyPlayer.faction       || 'Red Rovers',
    commander:    lobbyPlayer.commander     || 'Lord Fantastic',
    playerColor:  lobbyPlayer.playerColor   || '#3b82f6',
    isSquad:      false,
    selectedUnit: 'commander',
    commanderStats: {
      hp:           config.commanderHP,
      maxHp:        config.commanderHP,
      baseMaxHp:    config.commanderHP,
      cooldownRounds: 0,
      revives:      config.commanderRevives,
      isDead:       false,
    },
    subUnits: Array(5).fill(null).map((_, i) => ({
      hp:             config.squadHP,
      maxHp:          config.squadHP,
      baseMaxHp:      config.squadHP,
      name:           (lobbyPlayer.squadNames || [])[i] || '',
      unitType:       i === 0 ? 'special' : 'soldier',
      revives:        config.squadRevives,
      livesRemaining: soldierLives,
    })),
    squadMembers:  [],
    actionHistory: [],
    reviveQueue:   [],
    inventory:     [],
  };
};

// ── Build the initial game state from lobby data ──────────────────────────────
export const buildInitialGameState = (lobbyData, gameMode = 'campaign') => {
  const lobbyPlayers = Object.values(lobbyData.players || {});
  const gamePlayers  = lobbyPlayers.map(p => lobbyPlayerToGamePlayer(p, gameMode));

  return {
    players:                  gamePlayers,
    currentRound:             1,
    combatLog:                [],
    gameMode,
    currentPlayerIndex:       0,
    playersWhoActedThisRound: [],
    gameStarted:              true,
    lootPool:                 [],
    npcs:                     [],
    vpStats:                  {},
    roundTimers:              [],
    commanderTokens:          [],
    rooms:                    [],
    chests:                   [],
  };
};

// ── Sanitize for Firestore: remove undefined/Infinity/NaN ────────────────────
// Undefined keys are skipped entirely (not written as null) so that item effect
// objects arrive intact on the player side — writing null for undefined fields
// would corrupt effect data like usesRemaining, type, description, etc.
const sanitize = (val) => {
  if (val === undefined) return undefined;
  if (val === Infinity || val === -Infinity || (typeof val === 'number' && isNaN(val))) return 0;
  if (Array.isArray(val)) return val.map(sanitize).filter(v => v !== undefined);
  if (val !== null && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) {
      const v = sanitize(val[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return val;
};

// ── Write full game state to Firestore ────────────────────────────────────────
export const writeGameState = async (lobbyCode, gameState) => {
  const ref = doc(db, 'campaigns', lobbyCode);
  await updateDoc(ref, { gameState: sanitize(gameState) });
};

// ── Read game state once from Firestore ───────────────────────────────────────
export const readGameState = async (lobbyCode) => {
  const ref  = doc(db, 'campaigns', lobbyCode);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().gameState || null;
};

// ── Subscribe to game state changes ──────────────────────────────────────────
export const subscribeGameState = (lobbyCode, callback) => {
  const ref = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.gameState) callback(data.gameState);
    }
  });
};

// ── Write a pending request (player action waiting for GM approval) ───────────
export const writePendingRequest = async (lobbyCode, requestId, request) => {
  const ref = doc(db, 'campaigns', lobbyCode);
  await updateDoc(ref, { [`pendingRequests.${requestId}`]: request });
};

// ── Resolve (remove) a pending request ───────────────────────────────────────
export const resolvePendingRequest = async (lobbyCode, requestId) => {
  const ref = doc(db, 'campaigns', lobbyCode);
  await updateDoc(ref, { [`pendingRequests.${requestId}`]: null });
};

// ── Subscribe to pending requests ────────────────────────────────────────────
export const subscribePendingRequests = (lobbyCode, callback) => {
  const ref = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const requests = snap.data().pendingRequests || {};
      // Filter out nulls (resolved requests)
      const active = Object.fromEntries(
        Object.entries(requests).filter(([, v]) => v !== null)
      );
      callback(active);
    }
  });
};