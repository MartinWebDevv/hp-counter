import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hpCounterCommanderTokens';

/**
 * useCommanderTokens
 *
 * Token lifecycle:
 *  1. Commander dies → token created (status: 'cooldown' if has revives, else 'unclaimed')
 *  2. Cooldown counts down each round → becomes 'unclaimed' when it reaches 0
 *  3. DM claims for a faction → status: 'held', heldByPlayerId set
 *  4. Original commander revives → token auto-returned, status: 'returned' briefly, then deleted
 *  5. If commander has no revives on death → immediately 'unclaimed', no cooldown
 */
export const useCommanderTokens = (addLog) => {
  const [tokens, setTokens] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [tokenNotifications, setTokenNotifications] = useState([]);
  const [tokensEnabled, setTokensEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hpCounterTokensEnabled') || 'false'); }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); } catch {}
  }, [tokens]);

  useEffect(() => {
    try { localStorage.setItem('hpCounterTokensEnabled', JSON.stringify(tokensEnabled)); } catch {}
  }, [tokensEnabled]);

  // Auto-dismiss notifications after 4s
  useEffect(() => {
    if (tokenNotifications.length === 0) return;
    const id = setTimeout(() => setTokenNotifications(prev => prev.slice(1)), 4000);
    return () => clearTimeout(id);
  }, [tokenNotifications]);

  const notify = (message, icon = '🪙') => {
    setTokenNotifications(prev => [...prev, { id: Date.now(), message, icon }]);
  };

  const generateId = () => `token_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // ── Token creation ────────────────────────────────────────────────────────

  /**
   * Called when a commander dies.
   * hasRevives: whether the commander still has revives remaining.
   */
  const createToken = (player, hasRevives) => {
    if (!tokensEnabled) return;

    const commanderName = player.commanderStats?.customName || player.commander || 'Commander';
    const token = {
      id: generateId(),
      playerId: player.id,
      playerName: player.playerName,
      playerColor: player.playerColor || '#3b82f6',
      commanderName,
      status: hasRevives ? 'cooldown' : 'unclaimed', // 'cooldown' | 'unclaimed' | 'held'
      cooldownRoundsLeft: hasRevives ? 3 : 0,
      heldByPlayerId: null,
      heldByPlayerName: null,
      createdAt: Date.now(),
    };

    setTokens(prev => [...prev, token]);

    if (hasRevives) {
      addLog(`🪙 ${player.playerName}'s commander token dropped — claimable in 3 rounds`);
      notify(`${commanderName}'s token dropped — 3 round cooldown`, '🪙');
    } else {
      addLog(`🪙 ${player.playerName}'s commander token dropped — immediately claimable`);
      notify(`${commanderName}'s token is up for grabs!`, '🪙');
    }
  };

  // ── Player turn end → decrement cooldowns ────────────────────────────────

  const onPlayerTurnEnd = (playerId) => {
    setTokens(prev => prev.map(t => {
      if (t.status !== 'cooldown') return t;
      // Only tick if this is the token owner's player turn
      if (t.playerId !== playerId) return t;
      const newCooldown = t.cooldownRoundsLeft - 1;
      if (newCooldown <= 0) {
        addLog(`🪙 ${t.playerName}'s commander token is now claimable!`);
        notify(`${t.commanderName}'s token is now claimable!`, '🪙');
        return { ...t, status: 'unclaimed', cooldownRoundsLeft: 0 };
      }
      return { ...t, cooldownRoundsLeft: newCooldown };
    }));
  };

  // ── DM claims token for a faction ────────────────────────────────────────

  const claimToken = (tokenId, claimingPlayer) => {
    setTokens(prev => prev.map(t => {
      if (t.id !== tokenId) return t;
      addLog(`🪙 ${claimingPlayer.playerName} claimed ${t.playerName}'s commander token`);
      notify(`${claimingPlayer.playerName} claimed ${t.commanderName}'s token!`, '🪙');
      return { ...t, status: 'held', heldByPlayerId: claimingPlayer.id, heldByPlayerName: claimingPlayer.playerName };
    }));
  };

  // ── Commander revives → auto-return token ────────────────────────────────

  /**
   * Call this whenever a commander successfully revives.
   * Finds their token (if any) and returns it.
   */
  const onCommanderRevived = (playerId) => {
    setTokens(prev => {
      const token = prev.find(t => t.playerId === playerId);
      if (!token) return prev;

      if (token.status === 'held' && token.heldByPlayerName) {
        addLog(`🪙 ${token.commanderName}'s token was automatically returned from ${token.heldByPlayerName}`);
        notify(`${token.commanderName}'s token returned to owner!`, '🪙');
      } else {
        addLog(`🪙 ${token.commanderName}'s token reclaimed on revive`);
      }

      // Remove the token — commander is back
      return prev.filter(t => t.playerId !== playerId);
    });
  };

  // ── Manual delete (DM cleanup) ────────────────────────────────────────────

  const deleteToken = (tokenId) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  const getTokenForPlayer = (playerId) => tokens.find(t => t.playerId === playerId) || null;
  const getTokensHeldByPlayer = (playerId) => tokens.filter(t => t.heldByPlayerId === playerId);
  const unclaimedTokens = tokens.filter(t => t.status === 'unclaimed');
  const cooldownTokens  = tokens.filter(t => t.status === 'cooldown');
  const heldTokens      = tokens.filter(t => t.status === 'held');

  const resetAllTokens = () => {
    setTokens([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return {
    tokens,
    tokenNotifications,
    tokensEnabled,
    setTokensEnabled,
    unclaimedTokens,
    cooldownTokens,
    heldTokens,
    createToken,
    onPlayerTurnEnd,
    claimToken,
    onCommanderRevived,
    deleteToken,
    getTokenForPlayer,
    getTokensHeldByPlayer,
    resetAllTokens,
  };
};