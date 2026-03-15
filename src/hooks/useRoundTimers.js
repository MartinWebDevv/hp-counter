import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hpCounterRoundTimers';

/**
 * useRoundTimers
 * Manages named round timers that can be latched to player units and/or NPCs.
 * Auto-decrements when the global round counter advances.
 * Auto-deletes and notifies when a timer reaches 0.
 */
export const useRoundTimers = () => {
  const [timers, setTimers] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  // Toast notifications for expired timers: [{ id, name }]
  const [expiredNotifications, setExpiredNotifications] = useState([]);

  // Persist whenever timers change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timers)); } catch {}
  }, [timers]);

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (expiredNotifications.length === 0) return;
    const id = setTimeout(() => {
      setExpiredNotifications(prev => prev.slice(1));
    }, 4000);
    return () => clearTimeout(id);
  }, [expiredNotifications]);

  const generateId = () => `timer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a new timer.
   * @param {string} name
   * @param {number} duration  — rounds remaining
   * @param {Array}  targets   — [{ type: 'player'|'npc', playerId?, unitType?, npcId? }]
   */
  const createTimer = (name, duration, targets = []) => {
    const timer = {
      id: generateId(),
      name: name.trim() || 'Timer',
      duration: Math.max(1, parseInt(duration) || 1),
      remaining: Math.max(1, parseInt(duration) || 1),
      targets,
      createdAt: Date.now(),
    };
    setTimers(prev => [...prev, timer]);
    return timer.id;
  };

  const updateTimer = (timerId, changes) => {
    setTimers(prev => prev.map(t => t.id !== timerId ? t : { ...t, ...changes }));
  };

  const deleteTimer = (timerId) => {
    setTimers(prev => prev.filter(t => t.id !== timerId));
  };

  const adjustTimer = (timerId, delta) => {
    setTimers(prev => prev.map(t => {
      if (t.id !== timerId) return t;
      return { ...t, remaining: Math.max(0, t.remaining + delta) };
    }));
  };

  // ── Auto-decrement helpers ───────────────────────────────────────────────

  const decrementTimers = useCallback((filterFn) => {
    setTimers(prev => {
      const expired = [];
      const surviving = [];
      prev.forEach(t => {
        if (!filterFn(t)) { surviving.push(t); return; }
        const newRemaining = t.remaining - 1;
        if (newRemaining <= 0) {
          expired.push({ id: t.id, name: t.name });
        } else {
          surviving.push({ ...t, remaining: newRemaining });
        }
      });
      if (expired.length > 0) setExpiredNotifications(p => [...p, ...expired]);
      return surviving;
    });
  }, []);

  /**
   * Called when the global round counter increments (all players acted).
   * Only decrements timers with NO player targets (global timers).
   * Timers latched to players are decremented by onPlayerTurnEnd instead.
   */
  // Global round advance: only truly untargeted timers (no players, no NPCs)
  const onRoundAdvance = useCallback(() => {
    decrementTimers(t => t.targets.length === 0);
  }, [decrementTimers]);

  /**
   * Called when a specific player ends their turn.
   * Decrements timers that have at least one target matching this playerId.
   */
  // Player turn end: player-latched timers tick for that player; NPC timers tick every player turn
  const onPlayerTurnEnd = useCallback((playerId) => {
    decrementTimers(t =>
      t.targets.some(tgt => tgt.type === 'player' && tgt.playerId === playerId) ||
      (t.targets.length > 0 && t.targets.every(tgt => tgt.type === 'npc'))
    );
  }, [decrementTimers]);

  // ── Queries ───────────────────────────────────────────────────────────────

  /** Get all timers latched to a specific player unit */
  const getTimersForPlayerUnit = (playerId, unitType) =>
    timers.filter(t =>
      t.targets.some(tgt => tgt.type === 'player' && tgt.playerId === playerId && tgt.unitType === unitType)
    );

  /** Get all timers latched to a specific NPC */
  const getTimersForNPC = (npcId) =>
    timers.filter(t =>
      t.targets.some(tgt => tgt.type === 'npc' && tgt.npcId === npcId)
    );

  const resetAllTimers = () => {
    setTimers([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return {
    timers,
    expiredNotifications,
    createTimer,
    updateTimer,
    deleteTimer,
    adjustTimer,
    onRoundAdvance,
    onPlayerTurnEnd,
    getTimersForPlayerUnit,
    getTimersForNPC,
    resetAllTimers,
  };
};