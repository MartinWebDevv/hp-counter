import { useState } from 'react';

const AWARD_CATS = [
  { id: 'npcDamage',        label: 'Monster Hunter',  icon: '🐉', pts: 1, statKey: 'npcDamage',      higher: true  },
  { id: 'pvpDamage',        label: 'The Reaper',      icon: '⚔️',  pts: 1, statKey: 'pvpDamage',     higher: true  },
  { id: 'damageTaken',      label: 'Punching Bag',    icon: '🛡️',  pts: 1, statKey: 'damageTaken',   higher: true  },
  { id: 'leastDamageTaken', label: 'Ghost Protocol',  icon: '🧊', pts: 1, statKey: 'damageTaken',   higher: false },
  { id: 'leastDeaths',      label: 'Least Deaths',    icon: '💪', pts: 1, statKey: 'revivesUsed',   higher: false },
  { id: 'immortal',         label: 'Immortal',        icon: '✨', pts: 2, statKey: 'revivesUsed',   higher: false, zeroOnly: true },
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
    addLog(`🏅 ${player?.playerName || 'Player'} awarded ${points} VP — ${reason}`);
  };

  // ── Awards engine ──────────────────────────────────────────────────────────

  const runAwardsFromData = (sourcePlayers, sourceVpStats, sessionName) => {
    const awards = [];
    const newVpStats = JSON.parse(JSON.stringify(vpStats));

    AWARD_CATS.forEach(cat => {
      const scores = sourcePlayers.map(p => {
        const s = sourceVpStats[p.id] || {};
        return { player: p, val: s[cat.statKey] || 0 };
      });
      if (scores.length === 0) return;

      if (cat.zeroOnly) {
        scores.filter(s => s.val === 0).forEach(({ player }) => {
          awards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, playerId: player.id, playerName: player.playerName, playerColor: player.playerColor, value: 0, sessionName });
          const pid = player.id;
          if (!newVpStats[pid]) newVpStats[pid] = {};
          if (!newVpStats[pid].sessionAwards) newVpStats[pid].sessionAwards = [];
          newVpStats[pid].sessionAwards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, sessionName, value: 0, awardedAt: new Date().toISOString() });
        });
        return;
      }

      const top = cat.higher
        ? Math.max(...scores.map(s => s.val))
        : Math.min(...scores.map(s => s.val));
      if (cat.higher && top <= 0) return;
      if (!cat.higher && scores.every(s => s.val === 0)) return;

      scores.filter(s => s.val === top).forEach(({ player }) => {
        awards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, playerId: player.id, playerName: player.playerName, playerColor: player.playerColor, value: top, sessionName });
        const pid = player.id;
        if (!newVpStats[pid]) newVpStats[pid] = {};
        if (!newVpStats[pid].sessionAwards) newVpStats[pid].sessionAwards = [];
        newVpStats[pid].sessionAwards.push({ categoryId: cat.id, label: cat.label, icon: cat.icon, pts: cat.pts, sessionName, value: top, awardedAt: new Date().toISOString() });
      });
    });

    // Manual awards
    sourcePlayers.forEach(p => {
      (sourceVpStats[p.id]?.manualAwards || []).forEach(a => {
        awards.push({ categoryId: a.categoryId, label: a.reason, icon: '🏅', pts: a.points, playerId: p.id, playerName: p.playerName, playerColor: p.playerColor, value: a.points, sessionName, isManual: true });
        const pid = p.id;
        if (!newVpStats[pid]) newVpStats[pid] = {};
        if (!newVpStats[pid].sessionAwards) newVpStats[pid].sessionAwards = [];
        newVpStats[pid].sessionAwards.push({ categoryId: a.categoryId, label: a.reason, icon: '🏅', pts: a.points, sessionName, awardedAt: a.awardedAt || new Date().toISOString() });
      });
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
    AWARD_CATS,
  };
};