import { useState, useEffect } from 'react';

// ── Award categories ──────────────────────────────────────────────────────────
export const AWARD_CATS = [
  { id: 'npcDamage',        label: 'Monster Hunter',  icon: '🐉', pts: 1, statKey: 'npcDamage',      higher: true  },
  { id: 'pvpDamage',        label: 'The Reaper',      icon: '⚔️',  pts: 1, statKey: 'pvpDamage',     higher: true  },
  { id: 'damageTaken',      label: 'Punching Bag',    icon: '🛡️',  pts: 1, statKey: 'damageTaken',   higher: true  },
  { id: 'leastDamageTaken', label: 'Ghost Protocol',  icon: '🧊', pts: 1, statKey: 'damageTaken',   higher: false },
  // Immortal MUST run before leastDeaths — Immortal winners are excluded from leastDeaths
  { id: 'immortal',         label: 'Immortal',        icon: '✨', pts: 2, statKey: 'revivesUsed',   higher: false, zeroOnly: true },
  { id: 'leastDeaths',      label: 'Least Deaths',    icon: '💪', pts: 1, statKey: 'revivesUsed',   higher: false },
  { id: 'itemsObtained',    label: 'Scavenger',       icon: '📦', pts: 1, statKey: 'itemsObtained', higher: true  },
  { id: 'finalBossKill',    label: 'Kingslayer',      icon: '👑', pts: 2, statKey: 'finalBossKill', higher: true  },
  { id: 'firstBlood',       label: 'First Blood',     icon: '🩸', pts: 1, statKey: 'firstBlood',    higher: true  },
  { id: 'warmonger',        label: 'Warmonger',       icon: '⚡', pts: 1, statKey: 'warmonger',     higher: true  },
];

const LS_STATS = 'bt_vpStats';
const LS_COUNT = 'bt_sessionCount';

const LIVE_STAT_KEYS = ['npcDamage', 'pvpDamage', 'damageTaken', 'revivesUsed', 'finalBossKill', 'warmonger', 'firstBlood', 'itemsObtained'];

/**
 * useVPState
 * Tracks per-player stats, runs end-of-session award ceremonies, and manages the VP archive.
 * Renamed from UseVPState (uppercase U was a naming convention violation).
 */
export const useVPState = (players, addLog) => {
  const [vpStats, setVpStats] = useState(() => {
    try { const s = localStorage.getItem(LS_STATS); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  const [sessionCount,       setSessionCount]       = useState(() => {
    try { return parseInt(localStorage.getItem(LS_COUNT) || '0', 10); } catch { return 0; }
  });

  const [firstBloodAwarded,  setFirstBloodAwarded]  = useState(false);
  const [awardShowcase,      setAwardShowcase]       = useState(null);
  const [endSessionModal,    setEndSessionModal]     = useState(false);
  const [vpCeremonyActive,   setVpCeremonyActive]   = useState(false);
  const [vpCeremonyFinished, setVpCeremonyFinished] = useState(false);
  const [vpCeremonySession,  setVpCeremonySession]  = useState('');
  const [sessionNameInput,   setSessionNameInput]   = useState('');
  const [manualStatsModal,   setManualStatsModal]   = useState(null);

  // Single source of truth for persistence — all internal mutations go through here
  const persistVpStats = (next) => {
    setVpStats(next);
    try { localStorage.setItem(LS_STATS, JSON.stringify(next)); } catch {}
  };

  const persistSessionCount = (n) => {
    setSessionCount(n);
    try { localStorage.setItem(LS_COUNT, String(n)); } catch {}
  };

  // ── Stat tracking ──────────────────────────────────────────────────────────

  const trackVP = (playerId, statKey, delta) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (player?.isAbsent) return;

    setVpStats(prev => {
      const next = {
        ...prev,
        [playerId]: {
          ...(prev[playerId] || {}),
          [statKey]: ((prev[playerId]?.[statKey]) || 0) + delta,
        },
      };
      // Persist here so we don't need a separate useEffect watching vpStats
      try { localStorage.setItem(LS_STATS, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const awardVPPoints = (playerId, points, reason, categoryId) => {
    // FIXED: was using loose `==` which could silently match wrong types
    const player = players.find(p => String(p.id) === String(playerId));

    setVpStats(prev => {
      const next = {
        ...prev,
        [playerId]: {
          ...(prev[playerId] || {}),
          manualAwards: [
            ...(prev[playerId]?.manualAwards || []),
            { points, reason, categoryId, awardedAt: new Date().toISOString() },
          ],
        },
      };
      try { localStorage.setItem(LS_STATS, JSON.stringify(next)); } catch {}
      return next;
    });

    addLog(`🏅 ${player?.playerName || 'Player'} awarded ${points} VP — ${reason}`, 'vp');
  };

  // ── Awards engine ──────────────────────────────────────────────────────────

  const runAwardsFromData = (sourcePlayers, sourceVpStats, sessionName) => {
    const awards     = [];
    const newVpStats = JSON.parse(JSON.stringify(sourceVpStats));

    // Stamp any unsessioned manual awards with the session name
    Object.keys(newVpStats).forEach(pid => {
      if (newVpStats[pid].manualAwards) {
        newVpStats[pid].manualAwards = newVpStats[pid].manualAwards.map(a =>
          a.sessionName ? a : { ...a, sessionName }
        );
      }
    });

    const eligiblePlayers = sourcePlayers.filter(p => !p.isAbsent);
    const immortalWinners = new Set();

    const grantAward = (cat, player, value) => {
      awards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts,
                    playerId: player.id, playerName: player.playerName,
                    playerColor: player.playerColor, value, sessionName });
      const pid = player.id;
      if (!newVpStats[pid]) newVpStats[pid] = {};
      if (!newVpStats[pid].sessionAwards) newVpStats[pid].sessionAwards = [];
      newVpStats[pid].sessionAwards.push({
        categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts,
        sessionName, value, awardedAt: new Date().toISOString(),
      });
    };

    AWARD_CATS.forEach(cat => {
      const scores = eligiblePlayers.map(p => ({
        player: p,
        val:    (sourceVpStats[p.id]?.[cat.statKey]) || 0,
      }));
      if (scores.length === 0) return;

      if (cat.zeroOnly) {
        scores.filter(s => s.val === 0).forEach(({ player }) => {
          immortalWinners.add(String(player.id));
          grantAward(cat, player, 0);
        });
        return;
      }

      const pool = cat.id === 'leastDeaths'
        ? scores.filter(s => !immortalWinners.has(String(s.player.id)))
        : scores;

      if (pool.length === 0) return;

      const top = cat.higher
        ? Math.max(...pool.map(s => s.val))
        : Math.min(...pool.map(s => s.val));

      if (cat.higher  && top <= 0)                       return;
      if (!cat.higher && pool.every(s => s.val === 0))   return;

      pool.filter(s => s.val === top).forEach(({ player }) => grantAward(cat, player, top));
    });

    persistVpStats(newVpStats);
    persistSessionCount(sessionCount + 1);
    setEndSessionModal(false);
    setSessionNameInput('');

    if (awards.length === 0) {
      alert('No tracked stats to award — try entering stats manually.');
      return;
    }

    setAwardShowcase({ awards, index: 0, sessionName });
    setVpCeremonyActive(true);
    setVpCeremonyFinished(false);
    setVpCeremonySession(sessionName);
  };

  const handleEndSession = () => {
    const name = sessionNameInput.trim() || 'Unnamed Session';
    runAwardsFromData(players, vpStats, name);
  };

  const handleEndSessionFromFile = (state, fileName) => {
    const sessionName      = sessionNameInput.trim() || fileName.replace('.json', '') || 'Imported Session';
    const importedVpStats  = state.vpStats  || {};
    const importedPlayers  = state.players  || [];

    const hasAnyStats = importedPlayers.some(p => {
      const s = importedVpStats[p.id] || {};
      return LIVE_STAT_KEYS.some(k => (s[k] || 0) > 0);
    });

    setEndSessionModal(false);
    setSessionNameInput('');

    if (hasAnyStats) {
      runAwardsFromData(importedPlayers, importedVpStats, sessionName);
    } else {
      const initStats = {};
      importedPlayers.forEach(p => { initStats[p.id] = {}; });
      setManualStatsModal({ players: importedPlayers, stats: initStats, sessionName });
    }
  };

  const deleteSession = (sessionName) => {
    setVpStats(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      Object.keys(next).forEach(id => {
        if (next[id].sessionAwards) {
          next[id].sessionAwards = next[id].sessionAwards.filter(a => a.sessionName !== sessionName);
        }
      });
      try { localStorage.setItem(LS_STATS, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetLiveVPTrackers = () => {
    setVpStats(prev => {
      const next = {};
      Object.keys(prev).forEach(id => {
        next[id] = { ...prev[id] };
        LIVE_STAT_KEYS.forEach(k => { next[id][k] = 0; });
      });
      try { localStorage.setItem(LS_STATS, JSON.stringify(next)); } catch {}
      return next;
    });
    setFirstBloodAwarded(false);
  };

  return {
    vpStats, setVpStats: persistVpStats, saveVpStats: persistVpStats,
    sessionCount,
    firstBloodAwarded, setFirstBloodAwarded,
    awardShowcase,     setAwardShowcase,
    endSessionModal,   setEndSessionModal,
    vpCeremonyActive,  setVpCeremonyActive,
    vpCeremonyFinished,setVpCeremonyFinished,
    vpCeremonySession,
    sessionNameInput,  setSessionNameInput,
    manualStatsModal,  setManualStatsModal,
    trackVP, awardVPPoints,
    runAwardsFromData, handleEndSession, handleEndSessionFromFile,
    resetLiveVPTrackers, deleteSession,
    AWARD_CATS,
  };
};