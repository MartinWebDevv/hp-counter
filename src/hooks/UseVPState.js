import { useState } from 'react';

const AWARD_CATS = [
  { id: 'npcDamage',        label: 'Monster Hunter',  icon: '🐉', pts: 1, statKey: 'npcDamage',      higher: true  },
  { id: 'pvpDamage',        label: 'The Reaper',      icon: '⚔️',  pts: 1, statKey: 'pvpDamage',     higher: true  },
  { id: 'damageTaken',      label: 'Punching Bag',    icon: '🛡️',  pts: 1, statKey: 'damageTaken',   higher: true  },
  { id: 'leastDamageTaken', label: 'Ghost Protocol',  icon: '🧊', pts: 1, statKey: 'damageTaken',   higher: false },
  // Immortal MUST run before leastDeaths — players who get Immortal are excluded from leastDeaths
  { id: 'immortal',         label: 'Immortal',        icon: '✨', pts: 2, statKey: 'revivesUsed',   higher: false, zeroOnly: true },
  { id: 'leastDeaths',      label: 'Least Deaths',    icon: '💪', pts: 1, statKey: 'revivesUsed',   higher: false },
  { id: 'itemsObtained',    label: 'Scavenger',       icon: '📦', pts: 1, statKey: 'itemsObtained', higher: true  },
  { id: 'finalBossKill',    label: 'Kingslayer',      icon: '👑', pts: 2, statKey: 'finalBossKill', higher: true  },
  { id: 'firstBlood',       label: 'First Blood',     icon: '🩸', pts: 1, statKey: 'firstBlood',    higher: true  },
  { id: 'warmonger',        label: 'Warmonger',       icon: '⚡', pts: 1, statKey: 'warmonger',     higher: true  },
];

export { AWARD_CATS };

export const useVPState = (players, addLog) => {
  const [vpStats, setVpStats] = useState(() => {
    try { const s = localStorage.getItem('hpCounterVPStats'); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  const [sessionCount, setSessionCount] = useState(() => {
    try { return parseInt(localStorage.getItem('hpCounterSessionCount') || '0'); } catch { return 0; }
  });

  const [firstBloodAwarded, setFirstBloodAwarded] = useState(false);
  const [awardShowcase, setAwardShowcase]       = useState(null);
  const [endSessionModal, setEndSessionModal]   = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [manualStatsModal, setManualStatsModal] = useState(null);

  // Persist vpStats
  const saveVpStats = (next) => {
    setVpStats(next);
    try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
  };

  const saveSessionCount = (n) => {
    setSessionCount(n);
    try { localStorage.setItem('hpCounterSessionCount', String(n)); } catch {}
  };

  // ── Stat tracking ──────────────────────────────────────────────────────────

  const trackVP = (playerId, statKey, delta) => {
    // Don't award VP to absent players
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
      try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const awardVPPoints = (playerId, points, reason, categoryId) => {
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
      try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
      return next;
    });
    const player = players.find(p => p.id == playerId);
    addLog(`🏅 ${player?.playerName || 'Player'} awarded ${points} VP — ${reason}`, 'vp');
  };

  // ── Awards engine ──────────────────────────────────────────────────────────

  const runAwardsFromData = (sourcePlayers, sourceVpStats, sessionName) => {
    const awards = [];
    const newVpStats = JSON.parse(JSON.stringify(vpStats));

    // Absent players never receive VP awards
    const eligiblePlayers = sourcePlayers.filter(p => !p.isAbsent);

    // Track Immortal winners so they are excluded from Least Deaths
    const immortalWinners = new Set();

    const grantAward = (cat, player, value) => {
      awards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, playerId: player.id, playerName: player.playerName, playerColor: player.playerColor, value, sessionName });
      const pid = player.id;
      if (!newVpStats[pid]) newVpStats[pid] = {};
      if (!newVpStats[pid].sessionAwards) newVpStats[pid].sessionAwards = [];
      newVpStats[pid].sessionAwards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, sessionName, value, awardedAt: new Date().toISOString() });
    };

    AWARD_CATS.forEach(cat => {
      const scores = eligiblePlayers.map(p => {
        const s = sourceVpStats[p.id] || {};
        return { player: p, val: s[cat.statKey] || 0 };
      });
      if (scores.length === 0) return;

      // ── Immortal: all players with zero revives get it; they are excluded from Least Deaths ──
      if (cat.zeroOnly) {
        scores.filter(s => s.val === 0).forEach(({ player }) => {
          immortalWinners.add(String(player.id));
          grantAward(cat, player, 0);
        });
        return;
      }

      // ── Least Deaths: exclude anyone who already received Immortal this session ──
      const pool = cat.id === 'leastDeaths'
        ? scores.filter(s => !immortalWinners.has(String(s.player.id)))
        : scores;

      if (pool.length === 0) return;

      const top = cat.higher
        ? Math.max(...pool.map(s => s.val))
        : Math.min(...pool.map(s => s.val));

      if (cat.higher && top <= 0) return;
      if (!cat.higher && pool.every(s => s.val === 0)) return;

      const winners = pool.filter(s => s.val === top);
      // Award to all tied players (ties are valid — only skip if no clear winner
      // because of zero-stat categories already handled above)
      winners.forEach(({ player }) => grantAward(cat, player, top));
    });

    saveVpStats(newVpStats);
    saveSessionCount(sessionCount + 1);
    setEndSessionModal(false);
    setSessionNameInput('');

    if (awards.length === 0) {
      alert('No tracked stats to award — try entering stats manually.');
      return;
    }
    setAwardShowcase({ awards, index: 0, sessionName });
  };

  const handleEndSession = () => {
    const name = sessionNameInput.trim() || 'Unnamed Session';
    runAwardsFromData(players, vpStats, name);
  };

  const handleEndSessionFromFile = (state, fileName) => {
    const sessionName = sessionNameInput.trim() || fileName.replace('.json', '') || 'Imported Session';
    const importedVpStats = state.vpStats || {};
    const importedPlayers = state.players || [];

    const hasAnyStats = importedPlayers.some(p => {
      const s = importedVpStats[p.id] || {};
      return (s.npcDamage || 0) + (s.pvpDamage || 0) + (s.damageTaken || 0) + (s.revivesUsed || 0) + (s.finalBossKill || 0) + (s.warmonger || 0) > 0;
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
      try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetLiveVPTrackers = () => {
    setVpStats(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = {
          ...next[id],
          npcDamage: 0, pvpDamage: 0, damageTaken: 0,
          revivesUsed: 0, finalBossKill: 0, warmonger: 0,
          firstBlood: 0, itemsObtained: 0,
        };
      });
      try { localStorage.setItem('hpCounterVPStats', JSON.stringify(next)); } catch {}
      return next;
    });
    setFirstBloodAwarded(false);
  };

  return {
    vpStats,
    setVpStats,
    saveVpStats,
    sessionCount,
    firstBloodAwarded,
    setFirstBloodAwarded,
    awardShowcase,
    setAwardShowcase,
    endSessionModal,
    setEndSessionModal,
    sessionNameInput,
    setSessionNameInput,
    manualStatsModal,
    setManualStatsModal,
    trackVP,
    awardVPPoints,
    runAwardsFromData,
    handleEndSession,
    handleEndSessionFromFile,
    resetLiveVPTrackers,
    deleteSession,
    AWARD_CATS,
  };
};