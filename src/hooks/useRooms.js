import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hpCounterRooms';

/**
 * useRooms
 * Manages trap room state for campaign mode.
 * All attributes are DM-defined — nothing is hardcoded.
 */
export const useRooms = () => {
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);

  const [rooms, setRooms] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms)); } catch {}
  }, [rooms]);

  const generateId = () => `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // ── Default blank room ────────────────────────────────────────────────────

  const blankRoom = () => ({
    id: generateId(),
    name: '',
    description: '',
    notes: '',

    // Mechanics
    minUnits: '',
    resetsOnEntry: true,
    permanentlySolved: false,

    // Status
    status: 'Idle', // 'Idle' | 'Active' | 'Passed' | 'Failed' | 'Locked'

    // Optional toggleable features
    hiddenCostEnabled: false,
    hiddenCostValue: '',
    hiddenCostRevealed: false,

    timerEnabled: false,
    timerRounds: '',

    betrayalEnabled: false,
    betrayers: [],        // [{ playerId, unitType, playerName, label }]

    lockedOutUnits: [],   // [{ playerId, unitType, playerName, label }]

    // Loot
    lootMode: 'none',          // 'none' | 'weighted' | 'preloaded'
    lootItemCount: 1,
    lootTierWeights: { Common: 60, Rare: 30, Legendary: 10 },
    lootPreloadedItems: [],    // item ids from loot pool

    // Characters present (array of { playerId, unitType })
    charactersPresent: [],

    createdAt: Date.now(),
  });

  // ── Creator modal ─────────────────────────────────────────────────────────

  const openCreator = (roomId = null) => {
    setEditingRoomId(roomId);
    setShowRoomCreator(true);
  };

  const closeCreator = () => {
    setShowRoomCreator(false);
    setEditingRoomId(null);
  };

  const saveRoom = (roomData) => {
    setRooms(prev => {
      const exists = prev.find(r => r.id === roomData.id);
      if (exists) return prev.map(r => r.id === roomData.id ? { ...roomData } : r);
      return [...prev, { ...roomData, status: roomData.status || 'Idle' }];
    });
    closeCreator();
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createRoom = () => {
    const room = blankRoom();
    setRooms(prev => [...prev, room]);
    return room.id;
  };

  const updateRoom = (roomId, changes) => {
    setRooms(prev => prev.map(r => r.id !== roomId ? r : { ...r, ...changes }));
  };

  const deleteRoom = (roomId) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const archiveRoom = (roomId) => {
    setRooms(prev => prev.map(r => r.id !== roomId ? r : { ...r, archived: !r.archived }));
  };

  // ── Pass / Fail ───────────────────────────────────────────────────────────

  const passRoom = (roomId) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const next = { ...r, status: 'Passed' };
      if (!r.resetsOnEntry) next.permanentlySolved = true;
      return next;
    }));
  };

  const failRoom = (roomId) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const next = { ...r, status: 'Failed' };
      if (r.resetsOnEntry) {
        // Reset variable fields on fail
        next.hiddenCostRevealed = false;
        next.betrayedByFaction = null;
        next.charactersPresent = [];
      }
      return next;
    }));
  };

  // ── Characters present ────────────────────────────────────────────────────

  const addCharacterToRoom = (roomId, playerId, unitType) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const already = r.charactersPresent.some(c => c.playerId === playerId && c.unitType === unitType);
      if (already) return r;
      return { ...r, charactersPresent: [...r.charactersPresent, { playerId, unitType }] };
    }));
  };

  const removeCharacterFromRoom = (roomId, playerId, unitType) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return { ...r, charactersPresent: r.charactersPresent.filter(c => !(c.playerId === playerId && c.unitType === unitType)) };
    }));
  };

  const clearRoomCharacters = (roomId) => {
    setRooms(prev => prev.map(r => r.id !== roomId ? r : { ...r, charactersPresent: [] }));
  };

  // ── Locked out factions ───────────────────────────────────────────────────

  const toggleLockedFaction = (roomId, factionName) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const locked = r.lockedOutFactions || [];
      const already = locked.includes(factionName);
      return { ...r, lockedOutFactions: already ? locked.filter(f => f !== factionName) : [...locked, factionName] };
    }));
  };

  const onSetStatus = (roomId, status) => {
    setRooms(prev => prev.map(r => r.id !== roomId ? r : { ...r, status }));
  };

  // Hard reset — deletes all rooms
  const resetAllRooms = () => {
    setRooms([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Soft reset — keeps rooms but clears all session state fully
  const newSessionReset = () => {
    setRooms(prev => prev.map(r => ({
      ...r,
      status: 'Idle',
      charactersPresent: [],
      betrayers: [],
      hiddenCostRevealed: false,
      permanentlySolved: false,
      lockedOutUnits: [],
    })));
  };

  const activeRooms   = rooms.filter(r => !r.archived && r.status === 'Active');
  const visibleRooms  = rooms.filter(r => !r.archived);

  return {
    rooms,
    setRooms,
    visibleRooms,
    activeRooms,
    showRoomCreator,
    editingRoomId,
    blankRoom,
    openCreator,
    closeCreator,
    saveRoom,
    createRoom,
    onSetStatus,
    updateRoom,
    deleteRoom,
    archiveRoom,
    passRoom,
    failRoom,
    addCharacterToRoom,
    removeCharacterFromRoom,
    clearRoomCharacters,
    toggleLockedFaction,
    resetAllRooms,
    newSessionReset,
  };
};