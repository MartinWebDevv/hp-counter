import { useEffect, useRef, useCallback } from 'react';
import { writeGameState, subscribeGameState } from '../services/gameStateService';

/**
 * useFirestoreSync
 *
 * GM side: debounces writes of the full game state to Firestore whenever
 *          any part of it changes.
 *
 * Player side: subscribes to Firestore and calls onRemoteUpdate whenever
 *              the GM pushes a new state.
 *
 * @param {object} params
 * @param {string}   params.lobbyCode      - Firestore campaign doc id
 * @param {boolean}  params.isGM           - true = writer, false = reader
 * @param {object}   params.gameState      - current full state snapshot (GM only)
 * @param {function} params.onRemoteUpdate - called with new state (player only)
 * @param {number}   [params.debounceMs]   - write debounce delay (default 1000ms)
 */
const useFirestoreSync = ({
  lobbyCode,
  isGM,
  gameState,
  onRemoteUpdate,
  debounceMs = 1000,
}) => {
  const timerRef       = useRef(null);
  const lastWrittenRef = useRef(null);
  const isMounted      = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── GM: debounced write ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isGM || !lobbyCode || !gameState) return;

    // Skip if state hasn't meaningfully changed (simple JSON comparison)
    const snapshot = JSON.stringify(gameState);
    if (snapshot === lastWrittenRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!isMounted.current) return;
      try {
        await writeGameState(lobbyCode, gameState);
        lastWrittenRef.current = snapshot;
      } catch (err) {
        console.error('[FirestoreSync] Write failed:', err);
      }
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [gameState, lobbyCode, isGM, debounceMs]);

  // ── Player: subscribe to remote changes ───────────────────────────────────
  useEffect(() => {
    if (isGM || !lobbyCode || !onRemoteUpdate) return;

    const unsub = subscribeGameState(lobbyCode, (remoteState) => {
      if (isMounted.current) onRemoteUpdate(remoteState);
    });

    return () => unsub();
  }, [lobbyCode, isGM, onRemoteUpdate]);

  // ── Force flush — call before navigating away ─────────────────────────────
  const flushNow = useCallback(async () => {
    if (!isGM || !lobbyCode || !gameState) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    await writeGameState(lobbyCode, gameState);
  }, [isGM, lobbyCode, gameState]);

  return { flushNow };
};

export default useFirestoreSync;