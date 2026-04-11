import { db, auth } from '../firebase';
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, collection,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// ── Lobby code generator ──────────────────────────────────────────────────────
// Format: WORD-1234  (avoids confusing chars like 0/O, 1/I/L)
const WORDS = [
  'BEAR', 'WOLF', 'IRON', 'FIRE', 'GOLD', 'DARK', 'STORM', 'BLADE',
  'CROW', 'VIPER', 'RUNE', 'FROST', 'EMBER', 'TITAN', 'SHADOW', 'DRAGON',
  'OAK', 'STEEL', 'BONE', 'DUSK', 'MOON', 'SUN', 'VOID', 'BLOOD',
];
const SAFE_DIGITS = '23456789';

const generateLobbyCode = () => {
  const word   = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Array.from({ length: 4 }, () => SAFE_DIGITS[Math.floor(Math.random() * SAFE_DIGITS.length)]).join('');
  return `${word}-${digits}`;
};

// ── Ensure unique code ────────────────────────────────────────────────────────
const getUniqueLobbyCode = async () => {
  let code, exists;
  do {
    code   = generateLobbyCode();
    exists = (await getDoc(doc(db, 'campaigns', code))).exists();
  } while (exists);
  return code;
};

// ── Sign in anonymously (idempotent) ─────────────────────────────────────────
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser;
};

// ── Create a new lobby (GM) ───────────────────────────────────────────────────
export const createLobby = async () => {
  const user = await ensureAuth();
  const code = await getUniqueLobbyCode();

  const campaignRef = doc(db, 'campaigns', code);
  await setDoc(campaignRef, {
    lobbyCode:    code,
    gmId:         user.uid,
    createdAt:    serverTimestamp(),
    gameStarted:  false,
    gameMode:     'campaign',
    players:      {},   // { uid: { playerName, faction, commander, ... } }
    gameState:    null, // full game state written here once game starts
    pendingRequests: {},
  });

  return { code, uid: user.uid };
};

// ── Join an existing lobby (Player) ──────────────────────────────────────────
export const joinLobby = async (lobbyCode) => {
  const user = await ensureAuth();
  const code = lobbyCode.trim().toUpperCase();

  const campaignRef = doc(db, 'campaigns', code);
  const snap        = await getDoc(campaignRef);

  if (!snap.exists()) {
    throw new Error('Lobby not found. Check the code and try again.');
  }

  const data = snap.data();

  // If this uid is the GM, treat as GM returning
  const isGM = data.gmId === user.uid;

  return { code, uid: user.uid, isGM, data };
};

// ── Subscribe to lobby state changes ─────────────────────────────────────────
export const subscribeLobby = (lobbyCode, callback) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(campaignRef, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
};

// ── Add a player slot to the lobby (called after character creation) ──────────
export const addPlayerToLobby = async (lobbyCode, uid, playerData) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  await updateDoc(campaignRef, {
    [`players.${uid}`]: {
      uid,
      joinedAt: serverTimestamp(),
      ready: false,
      ...playerData,
    },
  });
};

// ── Update lobby meta (game started, game mode, etc.) ────────────────────────
export const updateLobbyMeta = async (lobbyCode, updates) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  await updateDoc(campaignRef, updates);
};

// ── End Game — sets gameEnded flag, all clients redirect to home ──────────────
export const endGame = async (lobbyCode) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  await updateDoc(campaignRef, { gameEnded: true });
};

// ── Subscribe to gameEnded flag ───────────────────────────────────────────────
export const subscribeGameEnded = (lobbyCode, callback) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(campaignRef, (snap) => {
    if (snap.exists() && snap.data().gameEnded === true) {
      callback();
    }
  });
};

// ── Mark a player as left for this session ────────────────────────────────────
export const markPlayerLeft = async (lobbyCode, uid, playerName) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  const timestamp = Date.now();
  const noticeId = `left_${uid}_${timestamp}`;
  // Find and clear the save slot claim so the player can rejoin
  const snap = await getDoc(campaignRef);
  const updates = {
    [`playerLeft.${noticeId}`]: { uid, playerName, timestamp },
  };
  if (snap.exists()) {
    const saveSlots = snap.data().saveSlots || {};
    Object.entries(saveSlots).forEach(([playerId, slot]) => {
      if (slot.claimedByUid === uid) {
        updates[`saveSlots.${playerId}.claimedByUid`] = null;
        updates[`saveSlots.${playerId}.isLeft`] = true;
      }
    });
  }
  await updateDoc(campaignRef, updates);
};

// ── Subscribe to playerLeft notices ──────────────────────────────────────────
export const subscribePlayerLeft = (lobbyCode, callback) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(campaignRef, (snap) => {
    if (snap.exists()) {
      const notices = snap.data().playerLeft || {};
      callback(notices);
    }
  });
};
// ── Subscribe to player rejoin notices ────────────────────────────────────────
export const subscribePlayerRejoin = (lobbyCode, callback) => {
  const campaignRef = doc(db, 'campaigns', lobbyCode);
  return onSnapshot(campaignRef, (snap) => {
    if (snap.exists()) {
      const notices = snap.data().playerRejoin || {};
      callback(notices);
    }
  });
};