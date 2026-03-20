import React from 'react';
import { useGameState }        from '../hooks/useGameState';
import { useDamageCalculation } from '../hooks/useDamageCalculation';
import { useNPCState }          from '../hooks/useNPCState';
import { useVPState }           from '../hooks/useVPState';
import { useLootHandlers }      from '../hooks/useLootHandlers';
import { useCampaignTurn }      from '../hooks/useCampaignTurn';

import PlayerCard          from './PlayerCard';
import Calculator          from './Calculator';
import DamageDistribution  from './DamageDistribution';
import LogPanel            from './LogPanel';
import StatsModal          from './StatsModal';
import GameModeSelector    from './GameModeSelector';
import SquadReviveModal    from './SquadReviveModal';
import DMPanel             from './DMPanel';
import DMSidebar           from './DMSidebar';
import LootPanel           from './LootPanel';
import ChestPanel          from './ChestPanel';
import VictoryPanel        from './VictoryPanel';
import HandOffModal        from './HandOffModal';
import { NpcLootModal, StealLootModal, DestroyItemModal } from './LootModals';
import { getModeConfig }   from '../data/gameModes';
import { useRoundTimers }       from '../hooks/useRoundTimers';
import { useRooms }             from '../hooks/useRooms';
import RoomsPanel              from './RoomsPanel';
import { useCommanderTokens }  from '../hooks/useCommanderTokens';
import RoundTimerPanel         from './RoundTimerPanel';
import CommanderTokenPanel     from './CommanderTokenPanel';

const gold = '#c9a961';

const HPCounter = () => {
  // ── Round timers (init first so callback is ready for useGameState) ────────
  const roundTimers = useRoundTimers();
  // addLogRef — lets tokens use addLog before it's in scope
  const addLogRef = React.useRef(() => {});
  const tokensOnRoundRef = React.useRef(null);

  // ── Core game state ───────────────────────────────────────────────────────
  const {
    players, currentRound, combatLog, gameMode, customModeSettings,
    currentPlayerIndex, playersWhoActedThisRound, gameStarted,
    setPlayers, addPlayer, removePlayer, reorderPlayers, updatePlayer,
    toggleSquad, useRevive: useReviveBase, changeGameMode, getModeValues, startGame,
    endTurn, undo, addLog, clearLog, loadGameState, processSquadRevive,
    lootPool, setLootPool, startNewSession,
  } = useGameState(
    () => { roundTimers.onRoundAdvance(); },
    (playerId) => { roundTimers.onPlayerTurnEnd(playerId); tokensOnRoundRef.current?.(playerId); tickStatusForPlayerRef.current?.(playerId); }
  );

  // Keep addLogRef current each render
  addLogRef.current = addLog;





  // ── Rooms ────────────────────────────────────────────────────────────────
  const roomsState = useRooms();

  // ── Commander tokens (after addLog is available) ──────────────────────────
  const tokens = useCommanderTokens((...args) => addLogRef.current(...args));
  tokensOnRoundRef.current = tokens.onPlayerTurnEnd;

  // Wrap useRevive to handle token return on revive
  const useRevive = (playerId, isSuccessful) => {
    const player = players.find(p => p.id === playerId);
    if (player && isSuccessful) tokens.onCommanderRevived(playerId);
    useReviveBase(playerId, isSuccessful);
  };


  // ── Chest state ───────────────────────────────────────────────────────────
  const [chests, setChests] = React.useState(() => {
    try { const s = localStorage.getItem('hpCounterChests'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('hpCounterChests', JSON.stringify(chests)); } catch {}
  }, [chests]);

  // ── VP state ──────────────────────────────────────────────────────────────
  const vp = useVPState(players, addLog);

  // ── NPC state ─────────────────────────────────────────────────────────────
  // We need loot.setNpcLootClaim and campaign.lastAttackerIdRef before useNPCState,
  // but they depend on useNPCState themselves. Use refs to break the circular dep.
  const npcLootClaimSetterRef  = React.useRef(null);
  const lastAttackerIdRef      = React.useRef(null);

  // Past session NPC archive — persisted to localStorage
  const [pastSessionNPCs, setPastSessionNPCs] = React.useState(() => {
    try { const s = localStorage.getItem('hpCounterPastSessionNPCs'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const archiveNPCsRef = React.useRef(null);

  // Persist past session NPCs to localStorage
  React.useEffect(() => {
    try { localStorage.setItem('hpCounterPastSessionNPCs', JSON.stringify(pastSessionNPCs)); } catch {}
  }, [pastSessionNPCs]);

  // Past session Chest archive — persisted to localStorage
  const [pastSessionChests, setPastSessionChests] = React.useState(() => {
    try { const s = localStorage.getItem('hpCounterPastSessionChests'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  // Persist past session Chests to localStorage
  React.useEffect(() => {
    try { localStorage.setItem('hpCounterPastSessionChests', JSON.stringify(pastSessionChests)); } catch {}
  }, [pastSessionChests]);

  const {
    npcs, activeNPCs, inactiveNPCs, deadNPCs,
    showNPCCreator, editingNPCId,
    blankNPC, blankAttack, blankPhase,
    openCreator, closeCreator, saveNPC, removeNPC,
    activateNPC, deactivateNPC,
    applyDamageToNPC, setNPCHP, triggerNextPhase, getNPCById, setNpcs, resetAllNPCs,
  } = useNPCState(addLog, (killedNPC) => {
    const attackingPlayer = players.find(p => p.id === lastAttackerIdRef.current) || null;
    const hasLoot = killedNPC.lootMode === 'weighted'
      ? (killedNPC.lootItemCount || 1) > 0
      : (killedNPC.lootTable?.length > 0);
    if (hasLoot && npcLootClaimSetterRef.current) {
      let resolvedLootTable = killedNPC.lootTable || [];
      if (killedNPC.lootMode === 'weighted') {
        const available = lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key');
        const weights = killedNPC.lootTierWeights || { Common: 60, Rare: 30, Legendary: 10 };
        const tiers = ['Common', 'Rare', 'Legendary'];
        const total = tiers.reduce((s, t) => s + (weights[t] || 0), 0);
        const count = killedNPC.lootItemCount || 1;
        resolvedLootTable = [];
        if (total > 0 && available.length > 0) {
          for (let i = 0; i < count; i++) {
            let rand = Math.random() * total;
            let tier = 'Common';
            for (const t of tiers) { rand -= (weights[t] || 0); if (rand <= 0) { tier = t; break; } }
            const pool = available.filter(it => it.tier === tier);
            const src = pool.length > 0 ? pool : available;
            resolvedLootTable.push(src[Math.floor(Math.random() * src.length)]);
          }
        }
      }
      if (resolvedLootTable.length > 0) {
        npcLootClaimSetterRef.current({ npc: { ...killedNPC, lootTable: resolvedLootTable }, player: attackingPlayer });
      }
    }
    if (killedNPC.isFinalBoss && attackingPlayer) {
      vp.trackVP(attackingPlayer.id, 'finalBossKill', 1);
      addLog(`👑 ${attackingPlayer.playerName} dealt the killing blow to ${killedNPC.name}!`);
    }
  });

  // ── Loot handlers ─────────────────────────────────────────────────────────
  const loot = useLootHandlers(players, updatePlayer, addLog, vp.trackVP);
  // Wire the ref so useNPCState callback can reach setNpcLootClaim
  npcLootClaimSetterRef.current = loot.setNpcLootClaim;

  // ── Campaign turn management ───────────────────────────────────────────────
  // ── Status effect tick (fires every round advance) ────────────────────────
  // ── Per-player status effect tick ─────────────────────────────────────────
  // Uses a ref so it always captures the latest players/updatePlayer/addLog
  const tickStatusForPlayerRef = React.useRef(null);
  tickStatusForPlayerRef.current = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    let changed = false;
    let newCmdStats = { ...player.commanderStats };
    let newSubUnits = (player.subUnits || []).map(u => ({ ...u }));

    // Tick commander effects
    if ((newCmdStats.statusEffects || []).length > 0) {
      const next = [];
      for (const effect of newCmdStats.statusEffects) {
        if (effect.type === 'poison') {
          const dmg = effect.value || 0;
          newCmdStats.hp = Math.max(0, newCmdStats.hp - dmg);
          addLog(`🤢 ${player.playerName}'s ${newCmdStats.customName || player.commander} took ${dmg}hp poison damage`);
          changed = true;
        }
        const dur = (effect.duration || 1) - 1;
        if (dur > 0) {
          next.push({ ...effect, duration: dur });
        } else {
          addLog(`✨ ${effect.type} wore off on ${player.playerName}'s ${newCmdStats.customName || player.commander}`);
          changed = true;
        }
      }
      newCmdStats.statusEffects = next;
    }

    // Tick subunit effects
    newSubUnits = newSubUnits.map((unit, idx) => {
      if (!(unit.statusEffects || []).length) return unit;
      changed = true;
      let hp = unit.hp;
      const next = [];
      const uName = unit.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`);
      for (const effect of unit.statusEffects) {
        if (effect.type === 'poison') {
          const dmg = effect.value || 0;
          hp = Math.max(0, hp - dmg);
          addLog(`🤢 ${player.playerName}'s ${uName} took ${dmg}hp poison damage`);
        }
        const dur = (effect.duration || 1) - 1;
        if (dur > 0) {
          next.push({ ...effect, duration: dur });
        } else {
          addLog(`✨ ${effect.type} wore off on ${player.playerName}'s ${uName}`);
        }
      }
      return { ...unit, hp, statusEffects: next };
    });

    if (changed) {
      updatePlayer(player.id, { commanderStats: newCmdStats, subUnits: newSubUnits });
    }
  };

  const campaign = useCampaignTurn(
    players, activeNPCs, getNPCById, playersWhoActedThisRound, currentRound,
    endTurn, addLog, updatePlayer, setNpcs, applyDamageToNPC, vp.trackVP,
    () => { roundTimers.onRoundAdvance(); },
    (deathData) => setDeathLootModal(deathData)
  );

  // archiveNPCsRef — snapshot all current NPCs then clear for new session
  archiveNPCsRef.current = (sessionName) => {
    const snapshot = npcs.map(npc => ({
      id: npc.id, name: npc.name, hp: npc.hp, maxHp: npc.maxHp,
      status: npc.isDead ? 'defeated' : npc.active ? 'active' : 'inactive',
    }));
    if (snapshot.length > 0) {
      setPastSessionNPCs(prev => [...prev, { sessionName, npcs: snapshot }]);
    }
    // Archive chests snapshot
    if (chests.length > 0) {
      const chestSnapshot = chests.map(c => ({
        id: c.id, name: c.name, description: c.description,
        isOpened: c.isOpened, openedBy: c.openedBy || null,
        droppedItems: c.droppedItems || [],
      }));
      setPastSessionChests(prev => [...prev, { sessionName, chests: chestSnapshot }]);
    }
    setNpcs([]);
    setChests([]);
  };

  // ── Damage calculation ────────────────────────────────────────────────────
  const {
    showCalculator, showDamageDistribution, calculatorData, damageDistribution,
    openCalculator, closeCalculator, updateDamageDistribution,
    setShowDamageDistribution, setCalculatorData, applyDamage,
  } = useDamageCalculation(players, addLog, npcs);

  // ── Squad revive ──────────────────────────────────────────────────────────
  const [squadRevivePlayerId, setSquadRevivePlayerId] = React.useState(null);
  const [deathLootModal, setDeathLootModal] = React.useState(null); // { unitLabel, items, playerId }
  const [spawnModal, setSpawnModal] = React.useState(null); // { attack } — confirm before creating NPC
  const setDeathLootModalRef = React.useRef(null);
  setDeathLootModalRef.current = setDeathLootModal;
  const squadRevivePlayer = squadRevivePlayerId ? players.find(p => p.id === squadRevivePlayerId) : null;
  const handleSquadRevive = (playerId, isSuccessful) => {
    processSquadRevive(playerId, isSuccessful);
    vp.trackVP(playerId, 'revivesUsed', 1);
    setSquadRevivePlayerId(null);
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activePanel,      setActivePanel]      = React.useState('players');
  const [showStats,        setShowStats]        = React.useState(false);
  const [showModeSelector, setShowModeSelector] = React.useState(false);
  const [viewMode,         setViewMode]         = React.useState('all');
  const [draggedIndex,     setDraggedIndex]     = React.useState(null);

  const isCampaign = gameMode === 'campaign';

  // ── Derived turn info ─────────────────────────────────────────────────────
  const campaignTurnOrder       = isCampaign ? campaign.buildTurnOrder() : [];
  const currentCampaignTurn     = campaignTurnOrder[campaign.campaignTurnIndex] || null;
  const currentCampaignPlayerId = currentCampaignTurn?.type === 'player' ? currentCampaignTurn.id : null;
  const currentCampaignNPCId    = currentCampaignTurn?.type === 'npc'    ? currentCampaignTurn.id : null;

  const currentModeConfig = getModeConfig(gameMode);
  const currentPlayer     = isCampaign
    ? players.find(p => p.id === currentCampaignPlayerId)
    : players[currentPlayerIndex];
  const displayedPlayers  = viewMode === 'current' && currentPlayer ? [currentPlayer] : players;
  const activeTurnLabel   = isCampaign && currentCampaignNPCId
    ? `👾 ${getNPCById(currentCampaignNPCId)?.name || 'NPC'}'s Turn`
    : currentPlayer ? currentPlayer.playerName : null;

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (e, i)  => { setDraggedIndex(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e)     => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop      = (e, di) => { e.preventDefault(); if (draggedIndex === null || draggedIndex === di) return; reorderPlayers(draggedIndex, di); setDraggedIndex(null); };
  const handleDragEnd   = ()      => setDraggedIndex(null);

  // ── Save / Load ───────────────────────────────────────────────────────────
  const saveGameToFile = () => {
    const state = { players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex, playersWhoActedThisRound, gameStarted, npcs, lootPool, chests, vpStats: vp.vpStats, rooms: roomsState.rooms, pastSessionNPCs, pastSessionChests, savedAt: new Date().toISOString() };
    const blob  = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = `battle-tracker-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const loadGameFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const state = JSON.parse(ev.target.result);
          if (!state.players || !Array.isArray(state.players)) { alert('Invalid save file!'); return; }
          loadGameState(state);
          if (state.npcs)     setNpcs(state.npcs);
          if (state.lootPool) setLootPool(state.lootPool);
          if (state.chests)   setChests(state.chests);
          if (state.vpStats)  vp.setVpStats(state.vpStats);
          // Restore session NPC archive from file, or clear if this save doesn't have one
          setPastSessionNPCs(state.pastSessionNPCs || []);
          try { localStorage.setItem('hpCounterPastSessionNPCs', JSON.stringify(state.pastSessionNPCs || [])); } catch {};
          // Restore session Chest archive
          setPastSessionChests(state.pastSessionChests || []);
          try { localStorage.setItem('hpCounterPastSessionChests', JSON.stringify(state.pastSessionChests || [])); } catch {};
          if (state.rooms) {
            roomsState.setRooms(state.rooms);
            try { localStorage.setItem('hpCounterRooms', JSON.stringify(state.rooms)); } catch {}
          }
          addLog(`Game loaded from ${new Date(state.savedAt).toLocaleString()}`);
          alert('Game loaded successfully!');
        } catch { alert('Failed to load save file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNewSession = () => {
    if (!window.confirm('Start New Session?\n\nPlayer + NPC HP and revives reset. Timers and tokens cleared. Rooms reset. Loot and chests are preserved.')) return;
    startNewSession(resetAllNPCs);
    vp.resetLiveVPTrackers();
    tokens.resetAllTokens();
    roundTimers.resetAllTimers();
    roomsState.newSessionReset();
  };

  const handleEndSessionFromFileUI = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const state = JSON.parse(ev.target.result);
          if (!state.players || !Array.isArray(state.players)) { alert('Invalid save file!'); return; }
          vp.handleEndSessionFromFile(state, file.name);
        } catch { alert('Failed to read save file.'); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>⚔️ BATTLE TRACKER</h1>
          <div style={styles.subtitle}>Game Master Control Panel</div>
        </div>
        <div style={styles.headerControls}>
          {activeTurnLabel && (
            <div style={styles.currentPlayerDisplay}>
              <div style={styles.currentPlayerLabel}>{isCampaign && currentCampaignNPCId ? 'NPC TURN' : 'ACTIVE PLAYER'}</div>
              <div style={{ ...styles.currentPlayerName, color: isCampaign && currentCampaignNPCId ? '#fca5a5' : '#a78bfa' }}>{activeTurnLabel}</div>
            </div>
          )}
          <div onClick={() => setShowModeSelector(true)} title='Change game mode' style={{ ...styles.modeDisplay, cursor: 'pointer' }}>
            <span style={styles.modeIcon}>{currentModeConfig.icon}</span>
            <span style={styles.modeText}>{currentModeConfig.name}</span>
          </div>
          <div style={styles.roundDisplay}>
            <div style={styles.roundLabel}>ROUND</div>
            <div style={styles.roundNumber}>{currentRound}</div>
          </div>
          <button onClick={() => {
            if (!gameStarted) { startGame(); campaign.setCampaignTurnIndex(0); }
            else { isCampaign ? campaign.endCampaignTurn() : endTurn(); }
          }} style={styles.endTurnBtn}>
            {!gameStarted ? '▶️ START GAME' : (() => {
              if (isCampaign) {
                const allActed = campaignTurnOrder.every(e => e.type === 'player' ? playersWhoActedThisRound.includes(e.id) : campaign.npcsWhoActedThisRound.includes(e.id));
                return allActed ? '🔄 END ROUND' : '➡️ END TURN';
              }
              const alive = players.filter(p => p.commanderStats.hp > 0);
              const acted = alive.filter(p => playersWhoActedThisRound.includes(p.id));
              return (currentPlayer && acted.length === alive.length - 1) ? '🔄 END ROUND' : '➡️ END TURN';
            })()}
          </button>
          <button onClick={() => setViewMode(v => v === 'all' ? 'current' : 'all')} style={styles.viewModeBtn} disabled={!currentPlayer}>{viewMode === 'all' ? '👤 FOCUS' : '👥 ALL'}</button>
          <button onClick={() => setShowStats(true)} style={styles.statsBtn}>📊 STATS</button>
          <button onClick={undo} style={styles.undoBtn}>↩️ UNDO</button>
          <button onClick={() => {
            if (!window.confirm('Reset the entire game? This will clear all players, NPCs, loot, chests, and progress.')) return;
            ['hpCounterPlayers','hpCounterRound','hpCounterLog','hpCounterGameMode','hpCounterCustomSettings','hpCounterCurrentPlayerIndex','hpCounterGameStarted','hpCounterLootPool','hpCounterNPCs','hpCounterChests','hpCounterVPStats'].forEach(k => localStorage.removeItem(k));
            window.location.reload();
          }} style={styles.resetBtn}>🔄 RESET</button>
        </div>
      </div>

      {/* Log + session controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <div style={{ flex: 1 }}><LogPanel battleLog={combatLog} onClearLog={clearLog} /></div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => vp.setEndSessionModal(true)} style={{ ...styles.resetCombatBtn, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>🏆 End Session</button>
          <button onClick={handleNewSession}  style={styles.resetCombatBtn}>🔄 New Session</button>
          <button onClick={saveGameToFile}    style={styles.saveBtn}>💾 SAVE</button>
          <button onClick={loadGameFromFile}  style={styles.loadBtn}>📂 LOAD</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>

        {/* Campaign sidebar nav */}
        {isCampaign && (
          <DMSidebar
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            activeNPCsCount={activeNPCs.length}
            unopenedChestCount={chests.filter(c => !c.isOpened).length}
            activeTimersCount={roundTimers.timers.length}
            activeRoomsCount={roomsState.activeRooms.length}
          />
        )}

        {/* Turn order sidebar */}
        {viewMode === 'current' && !isCampaign && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {players.map((player, index) => {
              const isCurr   = index === currentPlayerIndex;
              const hasActed = playersWhoActedThisRound.includes(player.id);
              const isDead   = player.commanderStats.hp === 0;
              return (
                <div key={player.id} draggable onDragStart={e => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, index)} onDragEnd={handleDragEnd}
                  style={{ ...styles.sidebarPlayer, background: isCurr ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.2))' : hasActed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', borderLeft: isCurr ? `4px solid ${player.playerColor||'#8b5cf6'}` : hasActed ? '4px solid #22c55e' : '4px solid transparent', opacity: isDead ? 0.4 : 1 }}>
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurr ? (player.playerColor||'#8b5cf6') : '#d4af37' }}>{player.playerName||`Player ${index+1}`}</span>
                    {isCurr && <span style={{ color: player.playerColor||'#8b5cf6' }}>▶</span>}
                    {!isCurr && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                    {isDead && <span>💀</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>{player.commanderStats.customName||player.commander} • {player.commanderStats.hp}/{player.commanderStats.maxHp}hp</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Campaign turn order sidebar */}
        {isCampaign && viewMode === 'current' && activePanel === 'players' && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {campaignTurnOrder.map((entry, index) => {
              const isCurr   = index === campaign.campaignTurnIndex;
              const isPlayer = entry.type === 'player';
              const entity   = isPlayer ? players.find(p => p.id === entry.id) : getNPCById(entry.id);
              if (!entity) return null;
              const hasActed = isPlayer ? playersWhoActedThisRound.includes(entity.id) : false;

              if (!isPlayer) {
                // NPCs are visual markers only — show as a retaliation window indicator
                return (
                  <div key={`npc-${entry.id}`} style={{ ...styles.sidebarPlayer, background: 'rgba(239,68,68,0.05)', borderLeft: '4px solid rgba(239,68,68,0.3)', opacity: 0.75 }}>
                    <div style={styles.sidebarPlayerHeader}>
                      <span style={{ ...styles.sidebarPlayerName, color: '#9ca3af', fontSize: '0.72rem' }}>👾 {entity.name}</span>
                      <span style={{ color: '#4b5563', fontSize: '0.6rem' }}>⚔️ retaliate</span>
                    </div>
                    <div style={{ ...styles.sidebarPlayerInfo, color: '#4b5563' }}>{entity.hp}/{entity.maxHp}hp • 🛡️{entity.armor}+</div>
                  </div>
                );
              }

              return (
                <div key={entry.id} style={{ ...styles.sidebarPlayer, background: isCurr ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.2))' : hasActed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', borderLeft: isCurr ? `4px solid ${entity.playerColor||'#8b5cf6'}` : hasActed ? '4px solid #22c55e' : '4px solid transparent' }}>
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurr ? (entity.playerColor||'#8b5cf6') : '#d4af37' }}>{entity.playerName}</span>
                    {isCurr && <span style={{ color: entity.playerColor||'#8b5cf6' }}>▶</span>}
                    {!isCurr && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>{entity.commanderStats.customName||entity.commander} • {entity.commanderStats.hp}/{entity.commanderStats.maxHp}hp</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Panel content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Players */}
          {(!isCampaign || activePanel === 'players') && (
            <div style={styles.addPlayerSection}>
              <button onClick={addPlayer} style={styles.addPlayerBtn}>+ ADD PLAYER</button>
            </div>
          )}
          {(!isCampaign || activePanel === 'players') && (
            <div style={{ display: players.length === 0 ? 'block' : 'grid', gridTemplateColumns: players.length === 1 ? '1fr' : viewMode === 'current' ? '1fr' : '48% 48%', gap: '1%', padding: '0 0.5%', maxWidth: players.length === 1 ? '50%' : '100%', margin: players.length === 1 ? '0 auto' : '0' }}>
              {players.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#4b5563' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>No players yet</div>
                  <div style={{ fontSize: '0.85rem' }}>Click ADD PLAYER to bring combatants into the battle.</div>
                </div>
              )}
              {displayedPlayers.map(player => {
                const actualIndex    = players.findIndex(p => p.id === player.id);
                const isBeingDragged = draggedIndex === actualIndex;
                const isThisTurn     = isCampaign ? player.id === currentCampaignPlayerId : actualIndex === currentPlayerIndex;
                return (
                  <div key={player.id} draggable={viewMode==='all'} onDragStart={e => viewMode==='all'&&handleDragStart(e,actualIndex)} onDragOver={viewMode==='all'?handleDragOver:undefined} onDrop={e => viewMode==='all'&&handleDrop(e,actualIndex)} onDragEnd={viewMode==='all'?handleDragEnd:undefined} style={{ opacity: isBeingDragged?0.5:1, cursor: viewMode==='all'?'grab':'default', transition: 'opacity 0.2s' }}>
                    <PlayerCard
                      player={player}
                      onUpdate={updatePlayer}
                      onRemove={removePlayer}
                      onToggleSquad={toggleSquad}
                      onOpenCalculator={(attackerId, action, unitType) => {
                        if (attackerId) vp.trackVP(attackerId, 'warmonger', 1);
                        openCalculator(attackerId, action, unitType);
                      }}
                      onUseRevive={useRevive}
                      onOpenSquadRevive={id => setSquadRevivePlayerId(id)}
                      onCommanderDied={(p) => tokens.createToken(p, (p.commanderStats?.revives || 0) > 0)}
                      allPlayers={players}
                      isCurrentTurn={isThisTurn}
                      hasActedThisRound={playersWhoActedThisRound.includes(player.id)}
                      onOpenDestroyModal={(attackerPlayer, attackerItem) => loot.setDestroyModal({ attackerPlayer, attackerItem: attackerItem || null, targetPlayer: null, targetUnitType: null, allPlayers: players })}
                      onOpenHandOff={(srcPlayer, srcUnitType, item) => loot.openHandOff(srcPlayer, srcUnitType, item)}
                      getTimersForPlayerUnit={roundTimers.getTimersForPlayerUnit}
                      getTokenForPlayer={tokens.getTokenForPlayer}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {isCampaign && activePanel === 'dm' && (
            <DMPanel
              npcs={npcs} activeNPCs={activeNPCs} inactiveNPCs={inactiveNPCs} deadNPCs={deadNPCs}
              showNPCCreator={showNPCCreator} editingNPCId={editingNPCId}
              blankNPC={blankNPC} blankAttack={blankAttack} blankPhase={blankPhase}
              openCreator={openCreator} closeCreator={closeCreator}
              saveNPC={saveNPC} removeNPC={removeNPC}
              activateNPC={campaign.handleActivateNPC}
              deactivateNPC={deactivateNPC}
              onHPChange={setNPCHP}
              onTriggerPhase={triggerNextPhase}
              currentRound={currentRound}
              onOpenNPCAttack={campaign.openNPCAttack}
              onOpenNPCSquadAttack={campaign.openNPCSquadAttack}
              onSpawnAttack={(attack, npcName) => setSpawnModal({ attack, parentNPCName: npcName })}
              getNPCById={getNPCById}
              currentTurnId={currentCampaignNPCId}
              onIncrementAttack={campaign.handleIncrementAttack}
              npcsWhoActedThisRound={campaign.npcsWhoActedThisRound}
              players={players}
              onDropLoot={loot.handleDropLoot}
              lootPool={lootPool}
              getTimersForNPC={roundTimers.getTimersForNPC}
            />
          )}

          {/* ── Session NPC Archive — own div, sibling to DMPanel, no stacking conflicts ── */}
          {isCampaign && activePanel === 'dm' && pastSessionNPCs.length > 0 && (
            <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...pastSessionNPCs].reverse().map((session, si) => <SessionArchiveEntry key={si} session={session} />)}
            </div>
          )}

          {isCampaign && activePanel === 'loot' && (
            <LootPanel players={players} lootPool={lootPool} setLootPool={setLootPool} onGiveItem={loot.handleDropLoot} />
          )}

          {isCampaign && activePanel === 'chests' && (
            <ChestPanel players={players} lootPool={lootPool} chests={chests} setChests={setChests} onGiveLoot={loot.handleChestLoot} onConsumeKey={(playerId, newInventory) => updatePlayer(playerId, { inventory: newInventory })} />
          )}

          {/* ── Session Chest Archive ── */}
          {isCampaign && activePanel === 'chests' && pastSessionChests.length > 0 && (
            <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                📅 Past Sessions
              </div>
              {[...pastSessionChests].reverse().map((session, si) => (
                <SessionChestArchiveEntry key={si} session={session} />
              ))}
            </div>
          )}

          {isCampaign && activePanel === 'vp' && (
            <VictoryPanel players={players} vpStats={vp.vpStats} onAwardPoints={vp.awardVPPoints} />
          )}

          {isCampaign && activePanel === 'rooms' && (
            <RoomsPanel
              rooms={roomsState.rooms}
              visibleRooms={roomsState.visibleRooms}
              players={players}
              lootPool={lootPool}
              showRoomCreator={roomsState.showRoomCreator}
              editingRoomId={roomsState.editingRoomId}
              blankRoom={roomsState.blankRoom}
              openCreator={roomsState.openCreator}
              closeCreator={roomsState.closeCreator}
              saveRoom={roomsState.saveRoom}
              onDeleteRoom={roomsState.deleteRoom}
              onArchiveRoom={roomsState.archiveRoom}
              onPassRoom={roomsState.passRoom}
              onFailRoom={roomsState.failRoom}
              onSetStatus={roomsState.onSetStatus}
              onUpdateRoom={roomsState.updateRoom}
              onGiveLoot={loot.handleDropLoot}
            />
          )}

          {isCampaign && activePanel === 'timers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <CommanderTokenPanel
              tokens={tokens.tokens}
              players={players}
              tokensEnabled={tokens.tokensEnabled}
              setTokensEnabled={tokens.setTokensEnabled}
              onClaim={tokens.claimToken}
              onDelete={tokens.deleteToken}
            />
            <RoundTimerPanel
              timers={roundTimers.timers}
              players={players}
              npcs={npcs}
              onCreateTimer={roundTimers.createTimer}
              onDeleteTimer={roundTimers.deleteTimer}
              onAdjustTimer={roundTimers.adjustTimer}
              onUpdateTimer={roundTimers.updateTimer}
            />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {showCalculator && (() => {
        const attacker = players.find(p => p.id === calculatorData?.attackerId);
        return (
          <Calculator
            data={calculatorData} players={players} npcs={activeNPCs}
            onClose={closeCalculator}
            onProceedToDistribution={(data) => {
              campaign.handlePlayerAttackNPC(data);
              setCalculatorData(data);
              setShowDamageDistribution(true);
              // pending bonus state removed — bonuses handled directly in calculator
            }}
            gameMode={isCampaign ? 'd20' : gameMode}
            firstStrike={attacker?.firstStrike === true}
            onUpdatePlayer={updatePlayer}
            onAddLog={addLog}
            onEndTurn={isCampaign ? campaign.endCampaignTurn : endTurn}
          />
        );
      })()}

      {showDamageDistribution && (
        <DamageDistribution
          calculatorData={calculatorData} players={players} npcs={activeNPCs}
          damageDistribution={damageDistribution}
          onUpdateDistribution={updateDamageDistribution}
          onApply={() => {
            applyDamage((updatedPlayers) => {
              const calc       = calculatorData;
              const attackerId = calc?.attackerId;
              if (attackerId) {
                const anyDmg = (calc?.targetSquadMembers||[]).some(t => {
                  const key = t.isNPC ? `npc-${t.npcId}` : `${t.playerId}-${t.unitType}`;
                  return (damageDistribution[key]||0) > 0;
                });
                if (anyDmg && !vp.firstBloodAwarded) {
                  vp.trackVP(attackerId, 'firstBlood', 1);
                  vp.setFirstBloodAwarded(true);
                  addLog(`🩸 First Blood! ${players.find(p=>p.id===attackerId)?.playerName||'Unknown'} draws first!`);
                }
                calc?.targetSquadMembers?.forEach(target => {
                  if (target.isNPC) return;
                  const dmg = damageDistribution[`${target.playerId}-${target.unitType}`]||0;
                  if (dmg > 0) { vp.trackVP(attackerId,'pvpDamage',dmg); vp.trackVP(target.playerId,'damageTaken',dmg); }
                });
              }
              updatedPlayers.forEach(updP => {
                const origP = players.find(p => p.id === updP.id);
                if (!origP || updP.id === calculatorData?.attackerId) return;
                if (!origP.commanderStats?.isDead && updP.commanderStats?.hp === 0) {
                  loot.checkForSteal(calculatorData?.attackerId, calculatorData?.attackingUnitType||'commander', updP.id, 'commander');
                  const cmdItems = (origP.inventory||[]).filter(it => it.heldBy === 'commander');
                  if (cmdItems.length > 0) setDeathLootModal({ unitLabel: origP.commanderStats?.customName||origP.commander||'Commander', items: cmdItems, playerId: origP.id });
                }
                (updP.subUnits||[]).forEach((u,i) => {
                  const origU = (origP.subUnits||[])[i];
                  const unitType = i===0?'special':`soldier${i}`;
                  if (origU && origU.hp>0 && u.hp===0) {
                    loot.checkForSteal(calculatorData?.attackerId, calculatorData?.attackingUnitType||'commander', updP.id, unitType);
                    const unitItems = (origP.inventory||[]).filter(it => it.heldBy === unitType);
                    if (unitItems.length > 0) setDeathLootModal({ unitLabel: origU.name?.trim()||(i===0?'Special':`Soldier ${i}`), items: unitItems, playerId: origP.id });
                  }
                });
              });
              updatedPlayers.forEach(p => updatePlayer(p.id, p));
              if (calc?.targetSquadMembers) {
                const atk = players.find(p=>p.id===calc?.attackerId);
                calc.targetSquadMembers.forEach(t => {
                  if (!t.isNPC) return;
                  const dmg = damageDistribution[`npc-${t.npcId}`]||0;
                  // Check synchronously if this hit will kill the NPC
                  const npcSnapshot = getNPCById(t.npcId);
                  const willDie = npcSnapshot && (npcSnapshot.hp - dmg) <= 0;
                  if (dmg > 0) {
                    campaign.lastAttackerIdRef.current = calc?.attackerId??null;
                    lastAttackerIdRef.current = calc?.attackerId??null;
                    applyDamageToNPC(t.npcId, dmg, atk?.playerName||'Unknown', loot.unitNameByType(atk, calc?.attackingUnitType||'commander'), `Round ${currentRound}`);
                    if (calc?.attackerId) vp.trackVP(calc.attackerId,'npcDamage',dmg);
                  }
                  // Only rebuttal if NPC survives this hit
                  if (!willDie) {
                    const attackingUnitType = calc?.attackingUnitType || 'commander';
                    campaign.openRebuttal(t.npcId, calc?.attackerId, [attackingUnitType]);
                  }
                });
              }
            });
          }}
          onClose={() => setShowDamageDistribution(false)}
        />
      )}

      {/* Spawn confirm modal (#10) */}
      {spawnModal && (() => {
        const attack = spawnModal.attack;
        const parentName = spawnModal.parentNPCName || '';
        const presets = attack.spawnPresets || [];
        const hasPresets = presets.length > 0;
        return (
          <SpawnModal
            attack={attack}
            parentName={parentName}
            presets={presets}
            hasPresets={hasPresets}
            onSpawn={(quantities) => {
              const prefix = parentName ? `${parentName}'s ` : '';
              let globalCount = 1;
              let totalSpawned = 0;
              if (hasPresets) {
                presets.forEach((preset, pi) => {
                  const cnt = quantities[pi] || 0;
                  const pName = preset.name || `Type ${pi+1}`;
                  for (let i = 0; i < cnt; i++) {
                    const newNPC = blankNPC();
                    newNPC.name = `${prefix}${pName} ${globalCount++}`;
                    newNPC.hp = preset.hp || 10;
                    newNPC.maxHp = preset.hp || 10;
                    newNPC.armor = preset.armor || 0;
                    newNPC.attackBonus = preset.attackBonus || 0;
                    newNPC.active = true;
                    newNPC.lootMode = 'weighted';
                    newNPC.lootTierWeights = { Common: 60, Rare: 30, Legendary: 10 };
                    newNPC.lootItemCount = 1;
                    saveNPC(newNPC);
                    totalSpawned++;
                  }
                });
              } else {
                const cnt = quantities[0] || 0;
                const baseName = attack.name || 'Spawn';
                for (let i = 0; i < cnt; i++) {
                  const newNPC = blankNPC();
                  newNPC.name = `${prefix}${baseName} ${globalCount++}`;
                  newNPC.active = true;
                  newNPC.lootMode = 'weighted';
                  newNPC.lootTierWeights = { Common: 60, Rare: 30, Legendary: 10 };
                  newNPC.lootItemCount = 1;
                  saveNPC(newNPC);
                  totalSpawned++;
                }
              }
              if (totalSpawned > 0) addLog(`🐣 ${totalSpawned} NPC(s) spawned by ${parentName || 'unknown'}!`);
              setSpawnModal(null);
            }}
            onClose={() => setSpawnModal(null)}
          />
        );
      })()}

      {/* Rebuttal modal (#8) */}
      {campaign.rebuttalModal && (
        <div onClick={campaign.dismissRebuttal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '3px solid #ef4444', borderRadius: '12px', padding: '1.5rem', width: '380px', maxWidth: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⚔️</div>
              <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel",Georgia,serif' }}>
                {campaign.rebuttalModal.npcName} Retaliates?
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.25rem' }}>Is this NPC in range to counter-attack?</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {campaign.rebuttalModal.attacks.map((atk, i) => (
                <button key={i} onClick={() => campaign.confirmRebuttal(i)} style={{
                  padding: '0.75rem 1rem', background: 'linear-gradient(135deg,rgba(185,28,28,0.3),rgba(153,27,27,0.2))',
                  border: '2px solid #dc2626', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: '800', fontSize: '0.88rem', color: '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ flex: 1, textAlign: 'left' }}>⚔️ {atk.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>{atk.dieType?.toUpperCase()} × {atk.numRolls}</span>
                </button>
              ))}
            </div>
            <button onClick={campaign.dismissRebuttal} style={{
              width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)',
              border: '1px solid #374151', borderRadius: '8px', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: '700', fontSize: '0.85rem', color: '#6b7280',
            }}>✕ Not in Range</button>
          </div>
        </div>
      )}

      {loot.npcLootClaim   && <NpcLootModal npc={loot.npcLootClaim.npc} player={loot.npcLootClaim.player} players={players} onConfirm={loot.handleConfirmNpcLoot} onClose={() => loot.setNpcLootClaim(null)} />}
      {loot.chestLootClaim && <NpcLootModal npc={{ name:'📦 Chest Loot', lootTable: loot.chestLootClaim.items }} player={loot.chestLootClaim.player} players={players} onConfirm={loot.handleConfirmChestLoot} onClose={() => loot.setChestLootClaim(null)} />}
      {loot.stealModal     && <StealLootModal {...loot.stealModal} onConfirm={loot.handleConfirmSteal} onClose={() => loot.setStealModal(null)} />}
      {loot.destroyModal   && <DestroyItemModal {...loot.destroyModal} allPlayers={loot.destroyModal.allPlayers||players} onConfirm={loot.handleConfirmDestroy} onClose={() => loot.setDestroyModal(null)} />}
      {loot.handOffModal   && (
        <HandOffModal
          sourcePlayer={loot.handOffModal.sourcePlayer}
          sourceUnitType={loot.handOffModal.sourceUnitType}
          item={loot.handOffModal.item}
          players={players}
          onConfirm={loot.handleConfirmHandOff}
          onClose={() => loot.setHandOffModal(null)}
        />
      )}

      {campaign.showNPCCalculator && campaign.npcAttackData && (
        <NPCCalculator
          npcAttackData={campaign.npcAttackData} players={players}
          onClose={campaign.closeNPCCalculator}
          onUpdatePlayer={updatePlayer}
          onAddLog={addLog}
          onCreateTimer={roundTimers.createTimer}
          onProceed={(updatedData) => { campaign.setNpcAttackData(updatedData); campaign.setShowNPCCalculator(false); campaign.setShowNPCDamageDistribution(true); }}
        />
      )}
      {campaign.showNPCDamageDistribution && campaign.npcAttackData && (
        <DamageDistribution
          calculatorData={{ ...campaign.npcAttackData, attackerId: campaign.npcAttackData.npcId, attackerIsNPC: true }}
          players={players} npcs={[]}
          damageDistribution={campaign.npcDamageDistribution}
          onUpdateDistribution={(key, val) => campaign.setNpcDamageDistribution(prev => ({ ...prev, [key]: val }))}
          onApply={campaign.applyNPCDamage}
          onClose={() => campaign.setShowNPCDamageDistribution(false)}
        />
      )}

      {campaign.firstStrikeModal && (
        <FirstStrikeModal
          players={players}
          selected={campaign.firstStrikeSelected}
          onToggle={campaign.toggleFirstStrikePlayer}
          onConfirm={(award) => campaign.confirmActivation(activateNPC, award)}
        />
      )}

      {squadRevivePlayer && <SquadReviveModal player={squadRevivePlayer} onRevive={handleSquadRevive} onClose={() => setSquadRevivePlayerId(null)} />}
      {showStats         && <StatsModal onClose={() => setShowStats(false)} />}
      {showModeSelector  && <GameModeSelector currentMode={gameMode} onModeChange={changeGameMode} onClose={() => setShowModeSelector(false)} />}

      {vp.endSessionModal && (
        <EndSessionModal
          sessionNameInput={vp.sessionNameInput}
          setSessionNameInput={vp.setSessionNameInput}
          onUseCurrentStats={() => { archiveNPCsRef.current?.(vp.sessionNameInput.trim() || 'Unnamed Session'); vp.handleEndSession(); }}
          onFromFile={handleEndSessionFromFileUI}
          onClose={() => { vp.setEndSessionModal(false); vp.setSessionNameInput(''); }}
        />
      )}
      {vp.manualStatsModal && (
        <ManualStatsModal
          data={vp.manualStatsModal}
          onChange={(playerId, key, val) => vp.setManualStatsModal(prev => ({ ...prev, stats: { ...prev.stats, [playerId]: { ...(prev.stats[playerId]||{}), [key]: val===''?'':Number(val) } } }))}
          onConfirm={() => {
            const ms = vp.manualStatsModal;
            const builtVp = {};
            ms.players.forEach(p => {
              const s = ms.stats[p.id]||{};
              builtVp[p.id] = { npcDamage:Number(s.npcDamage)||0, pvpDamage:Number(s.pvpDamage)||0, damageTaken:Number(s.damageTaken)||0, revivesUsed:Number(s.revivesUsed)||0, finalBossKill:Number(s.finalBossKill)||0, warmonger:Number(s.warmonger)||0, firstBlood:Number(s.firstBlood)||0 };
            });
            vp.runAwardsFromData(ms.players, builtVp, ms.sessionName);
            vp.setManualStatsModal(null);
          }}
          onClose={() => vp.setManualStatsModal(null)}
        />
      )}
      {/* Death loot drop modal */}
      {deathLootModal && (
        <div onClick={() => setDeathLootModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '3px solid rgba(239,68,68,0.6)', borderRadius: '12px', padding: '1.5rem', width: '360px', maxWidth: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💀</div>
              <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: '"Cinzel",Georgia,serif' }}>{deathLootModal.unitLabel} has fallen!</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>Items dropped:</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {deathLootModal.items.map(item => {
                const tc = item.isQuestItem ? '#fde68a' : ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af');
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: `${tc}12`, border: `1px solid ${tc}35`, borderRadius: '7px' }}>
                    <span>{item.isQuestItem ? '🗝️' : '📦'}</span>
                    <span style={{ color: tc, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{item.name}</span>
                    <span style={{ color: '#4b5563', fontSize: '0.62rem' }}>{item.tier}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => {
              const droppedIds = new Set(deathLootModal.items.map(it => it.id));
              const p = players.find(pl => pl.id === deathLootModal.playerId);
              if (p) updatePlayer(p.id, { inventory: (p.inventory||[]).filter(it => !droppedIds.has(it.id)) });
              setDeathLootModal(null);
            }} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg,#b91c1c,#991b1b)', border: '2px solid #dc2626', color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem' }}>
              🗺️ Remove from Inventory
            </button>
          </div>
        </div>
      )}

      <TimerExpiredToast notifications={roundTimers.expiredNotifications} />
      <TokenNotificationToast notifications={tokens.tokenNotifications} />

      {vp.awardShowcase && (
        <AwardShowcase
          showcase={vp.awardShowcase}
          onPrev={()   => vp.setAwardShowcase(prev => ({ ...prev, index: prev.index-1 }))}
          onNext={()   => vp.setAwardShowcase(prev => ({ ...prev, index: prev.index+1 }))}
          onFinish={()  => vp.setAwardShowcase(null)}
        />
      )}
    </div>
  );
};

// ── NPCCalculator (inline) ────────────────────────────────────────────────────

// ── NPCCalculator (inline) ────────────────────────────────────────────────────

const NPCCalculator = ({ npcAttackData, players, onClose, onProceed, onUpdatePlayer = () => {}, onAddLog = () => {}, onCreateTimer = null }) => {
  const isSquad   = !!npcAttackData.isSquad;
  const members   = npcAttackData.squadMembers || [];

  const [squadRollIndex,     setSquadRollIndex]     = React.useState(0);
  const [memberRolls,        setMemberRolls]        = React.useState([]);
  const [currentMemberRolls, setCurrentMemberRolls] = React.useState([]);
  const [rolls,        setRolls]        = React.useState([]);
  const [totalDamage,  setTotalDamage]  = React.useState(0);
  const [atkRoll,      setAtkRoll]      = React.useState('');
  const [defRoll,      setDefRoll]      = React.useState('');
  const [targets,      setTargets]      = React.useState(npcAttackData.targetSquadMembers || []);
  const [errorMsg,     setErrorMsg]     = React.useState('');
  const [showItemPanel,    setShowItemPanel]    = React.useState(false);
  const [activeAtkBonus,   setActiveAtkBonus]   = React.useState(0);
  const [activeDefBonus,   setActiveDefBonus]   = React.useState(0);
  const [showClosecall,    setShowClosecall]    = React.useState(false);
  const [closecallOwner,   setClosecallOwner]   = React.useState(null);
  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = React.useState(
    npcAttackData.prefilledPlayerId ? String(npcAttackData.prefilledPlayerId) : ''
  );
  const [expandedPlayers, setExpandedPlayers] = React.useState({});

  const currentMember = isSquad ? members[squadRollIndex] : null;
  const attack        = isSquad ? currentMember?.attack : npcAttackData.attack;
  const attackBonus   = isSquad ? (currentMember?.attackBonus || 0) : (npcAttackData.attackBonus || 0);
  const npcName       = isSquad ? currentMember?.npcName : npcAttackData.npcName;
  const numRolls      = attack?.numRolls || 1;
  const dieType       = attack?.dieType || 'd20';
  const dieMax        = dieType === 'd20' ? 20 : dieType === 'd10' ? 10 : dieType === 'd6' ? 6 : 4;

  const activeRolls       = isSquad ? currentMemberRolls : rolls;
  const allDoneForCurrent = activeRolls.length >= numRolls;
  const isLastMember      = isSquad ? squadRollIndex >= members.length - 1 : true;
  const allDone           = isSquad ? (allDoneForCurrent && isLastMember) : allDoneForCurrent;

  const squadRunningTotal  = memberRolls.reduce((sum, mr) => sum + mr.reduce((s, r) => s + r.dmg, 0), 0);
  const currentMemberTotal = currentMemberRolls.reduce((s, r) => s + r.dmg, 0);
  const displayTotal       = isSquad ? (squadRunningTotal + currentMemberTotal) : totalDamage;

  const addRoll = () => {
    const atk = parseInt(atkRoll) || 0;
    const def = parseInt(defRoll) || 0;
    const finalAtk = atk + attackBonus + activeAtkBonus;
    const finalDef = def + activeDefBonus;
    const dmg = Math.max(0, finalAtk - finalDef);
    const roll = { atk, bonus: attackBonus + activeAtkBonus, finalAtk, def: finalDef, dmg };
    if (isSquad) { setCurrentMemberRolls(prev => [...prev, roll]); }
    else { setRolls(prev => [...prev, roll]); setTotalDamage(prev => prev + dmg); }
    setAtkRoll(''); setDefRoll('');
    setActiveAtkBonus(0); setActiveDefBonus(0);
  };

  const advanceToNextMember = () => {
    setMemberRolls([...memberRolls, currentMemberRolls]);
    setCurrentMemberRolls([]);
    setSquadRollIndex(prev => prev + 1);
    setAtkRoll(''); setDefRoll('');
  };

  const toggleTarget = (playerId, unitType) => {
    const key = `${playerId}-${unitType}`;
    setTargets(prev => prev.find(t => `${t.playerId}-${t.unitType}` === key)
      ? prev.filter(t => `${t.playerId}-${t.unitType}` !== key)
      : [...prev, { playerId, unitType }]
    );
  };

  const handleProceed = () => {
    if (!allDone) { setErrorMsg('Complete all rolls first.'); return; }
    if (targets.length === 0) { setErrorMsg('Select at least one target.'); return; }
    let finalRolls, finalTotal;
    if (isSquad) {
      const allRolls = [...memberRolls, currentMemberRolls];
      finalRolls = allRolls.flat();
      finalTotal = finalRolls.reduce((s, r) => s + r.dmg, 0);
    } else { finalRolls = rolls; finalTotal = totalDamage; }
    onProceed({ ...npcAttackData, totalDamage: finalTotal, d20Rolls: finalRolls, targetSquadMembers: targets });
  };

  const inputStyle = { background: '#1a0f0a', color: gold, padding: '0.75rem', borderRadius: '6px', border: '2px solid #5a4a3a', fontSize: '1.5rem', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold', width: '100%' };

  const DEFENDER_TYPES = ['defenseBonus','rerollDefense','forceAttackReroll','closecall','diceSwap'];
  const targetedPlayerIds = [...new Set(targets.map(t => t.playerId).filter(Boolean))];
  const itemPlayers = targetedPlayerIds.length > 0
    ? players.filter(p => targetedPlayerIds.includes(p.id))
    : selectedTargetPlayerId
      ? players.filter(p => p.id === parseInt(selectedTargetPlayerId))
      : [];
  const allCalcItems = (() => {
    const raw = itemPlayers.flatMap(p =>
      (p.inventory || [])
        .filter(it => { const t = it.effect?.type; return DEFENDER_TYPES.includes(t); })
        .map(it => {
          const usesLeft = it.effect.uses === 0 ? Infinity : (it.effect.usesRemaining ?? it.effect.uses ?? 1);
          const unitName = it.heldBy === 'commander'
            ? (p.commanderStats?.customName || p.commander || 'Commander')
            : it.heldBy === 'special' ? (p.subUnits?.[0]?.name?.trim() || 'Special')
            : (p.subUnits?.[parseInt(it.heldBy?.replace('soldier',''))]?.name?.trim() || it.heldBy);
          return { ...it, usesLeft, playerName: p.playerName, unitName, owner: p };
        })
        .filter(it => it.usesLeft > 0)
    );
    // Deduplicate — same player + same item name + same effect type only shows once
    const seen = new Set();
    return raw.filter(it => {
      const key = `${it.owner?.id}-${it.name}-${it.effect?.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Shared consume helper — decrements uses, removes if consumed, returns live player or null
  const consumeFromInventory = (item) => {
    if (!item.owner?.id) return null;
    const livePlayer = players.find(p => p.id === item.owner.id);
    if (!livePlayer) return null;
    const liveItem = (livePlayer.inventory || []).find(it => it.id === item.id);
    if (!liveItem) return null;
    const newUsesRemaining = liveItem.effect.uses === 0 ? Infinity : ((liveItem.effect.usesRemaining ?? liveItem.effect.uses ?? 1) - 1);
    const consumed = isFinite(newUsesRemaining) && newUsesRemaining <= 0;
    const newInventory = (livePlayer.inventory || [])
      .map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: newUsesRemaining } })
      .filter(it => it.id !== item.id ? true : !consumed);
    onUpdatePlayer(livePlayer.id, { inventory: newInventory });
    onAddLog(`🎒 ${livePlayer.playerName}'s ${item.unitName} used "${item.name}"`);
    return livePlayer;
  };

  // Used by the dropdown list (no effect, just consume)
  const consumeNPCItem = (item) => { consumeFromInventory(item); setShowItemPanel(false); };

  // Reroll — clears the relevant input so DM re-enters
  const npcConsumeReroll = (item, clearFn) => {
    if (consumeFromInventory(item)) clearFn('');
  };

  // Bonus — adds to next roll then clears
  const npcConsumeBonus = (item, bonusType) => {
    if (!consumeFromInventory(item)) return;
    if (bonusType === 'attack') setActiveAtkBonus(prev => prev + (item.effect?.value || 0));
    else setActiveDefBonus(prev => prev + (item.effect?.value || 0));
  };

  // Dice swap — swaps current atkRoll ↔ defRoll
  const npcConsumeDiceSwap = (item) => {
    if (!consumeFromInventory(item)) return;
    const tmp = atkRoll; setAtkRoll(defRoll); setDefRoll(tmp);
  };

  // Close call — shows overlay and closes calculator
  const npcConsumeClosecall = (item) => {
    const owner = consumeFromInventory(item);
    if (!owner) return;
    setClosecallOwner(owner);
    setShowClosecall(true);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `2px solid ${gold}`, borderRadius: '12px', padding: '1.5rem', maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 0 1px rgba(201,169,97,0.1), 0 24px 64px rgba(0,0,0,0.95)' }}>

        {/* Title */}
        <h3 style={{ color: gold, fontSize: '1.4rem', marginBottom: '0.75rem', textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', textShadow: '2px 2px 4px rgba(0,0,0,1)' }}>
          {isSquad ? '⚔️ NPC Squad Attack' : '👾 NPC Attack'}
        </h3>

        {/* Attacker info bar — mirrors PvP "Attacker:" line */}
        <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.875rem' }}>
          <span style={{ color: '#8b7355', fontWeight: '700' }}>Attacker: </span>
          <span style={{ color: '#fca5a5', fontWeight: '800' }}>{npcName}</span>
          {attack?.name && <span style={{ color: '#6b7280' }}> — {attack.name}</span>}
          <span style={{ color: '#8b7355', marginLeft: '0.5rem' }}>({dieType.toUpperCase()} × {numRolls}</span>
          {attackBonus > 0 && <span style={{ color: '#fbbf24', marginLeft: '0.25rem' }}>+{attackBonus} bonus</span>}
          <span style={{ color: '#8b7355' }}>)</span>
          {!isSquad && numRolls > 1 && <span style={{ color: '#a78bfa', marginLeft: '0.5rem', fontSize: '0.78rem' }}>Roll {Math.min(activeRolls.length + 1, numRolls)}/{numRolls}</span>}
        </div>

        {/* Squad progress */}
        {isSquad && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem' }}>
              {members.map((m, i) => (
                <div key={m.npcId} style={{ flex: 1, padding: '0.3rem 0.4rem', borderRadius: '6px', textAlign: 'center', background: i < squadRollIndex ? 'rgba(74,222,128,0.12)' : i === squadRollIndex ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${i < squadRollIndex ? 'rgba(74,222,128,0.4)' : i === squadRollIndex ? 'rgba(239,68,68,0.4)' : 'rgba(90,74,58,0.3)'}` }}>
                  <div style={{ color: i < squadRollIndex ? '#4ade80' : i === squadRollIndex ? '#fca5a5' : '#4b5563', fontSize: '0.62rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i < squadRollIndex ? '✓ ' : i === squadRollIndex ? '▶ ' : ''}{m.npcName}
                  </div>
                  <div style={{ color: i === squadRollIndex ? '#f87171' : '#4b5563', fontSize: '0.58rem' }}>{m.attack?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use Item panel */}
        {allCalcItems.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <button onClick={() => setShowItemPanel(s => !s)} style={{ width: '100%', padding: '0.45rem', background: showItemPanel ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.3)', border: `1px solid ${showItemPanel ? 'rgba(99,102,241,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: showItemPanel ? '6px 6px 0 0' : '6px', color: showItemPanel ? '#a5b4fc' : '#6b7280', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer' }}>
              🎒 Use Item ({allCalcItems.length} available) {showItemPanel ? '▲' : '▼'}
            </button>
            {showItemPanel && (
              <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(99,102,241,0.3)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.5rem' }}>
                {allCalcItems.map((item, idx) => {
                  const tc = ({ Common: '#9ca3af', Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || '#9ca3af');
                  const typeLabel = { attackBonus: `⚔️ +${item.effect?.value} Atk Bonus`, defenseBonus: `🛡️ +${item.effect?.value} Def Bonus`, rerollAttack: '⟳ Reroll Attack', rerollDefense: '⟳ Reroll Defense', forceAttackReroll: '⚡ Force NPC Reroll', forceDefenseReroll: '⚡ Force Defender Reroll', diceSwap: '⇅ Swap Dice', closecall: '🛡️ Close Call' }[item.effect?.type] || item.effect?.type;
                  return (
                    <div key={idx} onClick={() => consumeNPCItem(item)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', marginBottom: '0.2rem', background: `${tc}10`, border: `1px solid ${tc}30`, borderRadius: '6px', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: tc, fontWeight: '800', fontSize: '0.78rem' }}>{item.name}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.62rem' }}>{item.playerName} · {item.unitName} · {typeLabel}</div>
                      </div>
                      <span style={{ color: '#4b5563', fontSize: '0.6rem' }}>{item.usesLeft === Infinity ? '∞' : item.usesLeft}✕</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Target selector — collapsible per player */}
        <div style={{ marginBottom: '1rem', background: '#0a0503', padding: '0.85rem', borderRadius: '8px', border: '1px solid #5a4a3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ color: gold, fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.05em' }}>Select Targets:</div>
            {targets.length > 0 && (
              <div style={{ color: '#a78bfa', fontSize: '0.68rem', fontWeight: '700' }}>{targets.length} unit{targets.length !== 1 ? 's' : ''} selected</div>
            )}
          </div>
          {players.map(player => {
            const liveUnits = [
              player.commanderStats.hp > 0 ? { unitType: 'commander', name: player.commanderStats.customName || player.commander, hp: player.commanderStats.hp, maxHp: player.commanderStats.maxHp, icon: '⚔️', color: gold } : null,
              ...(player.subUnits || []).map((unit, idx) => {
                if (unit.hp === 0 || unit.revivedOnPlayerId) return null;
                const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                return { unitType, name: unit.name || (idx === 0 ? 'Special' : `Soldier ${idx}`), hp: unit.hp, maxHp: unit.maxHp, icon: idx === 0 ? '⭐' : '🛡️', color: '#c4b5fd' };
              }),
            ].filter(Boolean);
            if (liveUnits.length === 0) return null;
            const isExpanded = !!expandedPlayers[player.id];
            const selectedCount = targets.filter(t => t.playerId === player.id).length;
            return (
              <div key={player.id} style={{ marginBottom: '0.4rem' }}>
                {/* Player row — clickable to expand/collapse */}
                <div
                  onClick={() => setExpandedPlayers(prev => ({ ...prev, [player.id]: !prev[player.id] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: selectedCount > 0 ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selectedCount > 0 ? 'rgba(201,169,97,0.35)' : 'rgba(90,74,58,0.3)'}`,
                    borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: '900', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ color: selectedCount > 0 ? gold : '#9ca3af', fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{player.playerName}</span>
                  {selectedCount > 0 && (
                    <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '20px', padding: '0.1rem 0.45rem' }}>
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                {/* Units — shown when expanded */}
                {isExpanded && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(90,74,58,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {liveUnits.map(unit => {
                      const isSel = !!targets.find(t => t.playerId === player.id && t.unitType === unit.unitType);
                      return (
                        <div key={unit.unitType} onClick={() => toggleTarget(player.id, unit.unitType)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', background: isSel ? `${unit.color}15` : 'rgba(0,0,0,0.3)', border: `2px solid ${isSel ? unit.color : 'rgba(90,74,58,0.3)'}`, borderRadius: '6px', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, border: `2px solid ${isSel ? unit.color : '#5a4a3a'}`, background: isSel ? unit.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{isSel ? '✓' : ''}</div>
                          <span style={{ color: isSel ? unit.color : '#9ca3af', fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{unit.icon} {unit.name}</span>
                          <span style={{ color: '#6b7280', fontSize: '0.68rem' }}>{unit.hp}/{unit.maxHp}hp</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* VS header + side pills + roll inputs */}
        {!allDoneForCurrent && (
          <div style={{ background: '#0a0503', padding: '1rem', borderRadius: '8px', border: `2px solid ${gold}`, marginBottom: '1rem' }}>

            {/* VS matchup row — mirrors PvP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Attacker</div>
                <div style={{ color: '#fca5a5', fontSize: '1.4rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif' }}>
                  {dieType.toUpperCase()}
                  {attackBonus > 0 && <span style={{ color: '#fbbf24', fontSize: '0.8rem', marginLeft: '0.25rem' }}>+{attackBonus}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                  {isSquad ? `Roll ${Math.min(activeRolls.length + 1, numRolls)} of ${numRolls}` : numRolls > 1 ? `Roll ${Math.min(activeRolls.length + 1, numRolls)} of ${numRolls}` : 'Roll 1 of 1'}
                </div>
                <div style={{ color: '#5a4a3a', fontSize: '1.6rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif', lineHeight: 1 }}>VS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Defender</div>
                <div style={{ color: '#86efac', fontSize: '1.4rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif' }}>D10</div>
              </div>
            </div>

            {/* Side-specific item pills */}
            {(() => {
              const defItems = allCalcItems.filter(it => DEFENDER_TYPES.includes(it.effect?.type) && it.effect?.type !== 'diceSwap');
              const swapItems = allCalcItems.filter(it => it.effect?.type === 'diceSwap');
              const hasAny = defItems.length > 0 || swapItems.length > 0;
              if (!hasAny) return null;
              const pillBtn = (item, label, color, onClick) => (
                <button key={item.id} onClick={onClick} style={{ padding: '0.18rem 0.55rem', background: 'rgba(0,0,0,0.35)', border: `1px solid ${color}50`, borderRadius: '20px', cursor: 'pointer', color, fontFamily: 'inherit', fontWeight: '800', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                  {label} <span style={{ color: '#4b5563', fontSize: '0.55rem' }}>{item.playerName} · {item.usesLeft === Infinity ? '∞' : item.usesLeft}✕</span>
                </button>
              );
              const typeLabel = (t, val) => ({ attackBonus: `⚔️ +${val} Atk`, rerollAttack: '⟳ Reroll Atk', forceDefenseReroll: '⚡ Force Def Reroll', defenseBonus: `🛡️ +${val} Def`, rerollDefense: '⟳ Reroll Def', forceAttackReroll: '⚡ Force NPC Reroll', closecall: '🛡️ Close Call' }[t] || t);
              const pillAction = (it) => {
                const t = it.effect?.type;
                if (t === 'rerollAttack')       return () => npcConsumeReroll(it, setAtkRoll);
                if (t === 'forceDefenseReroll') return () => npcConsumeReroll(it, setDefRoll);
                if (t === 'rerollDefense')      return () => npcConsumeReroll(it, setDefRoll);
                if (t === 'forceAttackReroll')  return () => npcConsumeReroll(it, setAtkRoll);
                if (t === 'attackBonus')        return () => npcConsumeBonus(it, 'attack');
                if (t === 'defenseBonus')       return () => npcConsumeBonus(it, 'defense');
                if (t === 'diceSwap')           return () => npcConsumeDiceSwap(it);
                if (t === 'closecall')          return () => npcConsumeClosecall(it);
                return () => consumeNPCItem(it);
              };
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
                  {defItems.map(it => pillBtn(it, typeLabel(it.effect?.type, it.effect?.value), '#86efac', pillAction(it)))}
                  {swapItems.map(it => pillBtn(it, '⇅ Swap Dice', '#a5b4fc', pillAction(it)))}
                </div>
              );
            })()}

            {/* Active bonus indicators */}
            {(activeAtkBonus > 0 || activeDefBonus > 0) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
                {activeAtkBonus > 0 && <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '5px', color: '#86efac', fontSize: '0.72rem', fontWeight: '800' }}>⚔️ +{activeAtkBonus} ATK BONUS ACTIVE</span>}
                {activeDefBonus > 0 && <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '5px', color: '#93c5fd', fontSize: '0.72rem', fontWeight: '800' }}>🛡️ +{activeDefBonus} DEF BONUS ACTIVE</span>}
              </div>
            )}

            {/* Two-column inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ color: '#fca5a5', fontSize: '0.72rem', fontWeight: '800', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Attacker Roll ({dieType.toUpperCase()})
                </label>
                <input type='number' min='1' max={dieMax} value={atkRoll} onChange={e => setAtkRoll(e.target.value)} placeholder={`1–${dieMax}`} style={{ ...inputStyle, border: '2px solid rgba(239,68,68,0.5)' }} />
              </div>
              <div>
                <label style={{ color: '#86efac', fontSize: '0.72rem', fontWeight: '800', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Defender Roll (D10)
                </label>
                <input type='number' min='1' max='20' value={defRoll} onChange={e => setDefRoll(e.target.value)} placeholder='Roll...' style={{ ...inputStyle, border: '2px solid rgba(34,197,94,0.5)' }} />
              </div>
            </div>
            <button onClick={addRoll} disabled={!atkRoll || !defRoll} style={{ width: '100%', padding: '0.75rem', background: (atkRoll && defRoll) ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(0,0,0,0.3)', color: (atkRoll && defRoll) ? '#e9d5ff' : '#374151', border: `2px solid ${(atkRoll && defRoll) ? '#a78bfa' : '#1f2937'}`, borderRadius: '8px', cursor: (atkRoll && defRoll) ? 'pointer' : 'not-allowed', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              + Add Roll
            </button>
          </div>
        )}

        {/* Roll history — with hit/miss like PvP */}
        {activeRolls.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(90,74,58,0.4)', marginBottom: '0.75rem' }}>
            {isSquad && <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{npcName}</div>}
            {activeRolls.map((r, i) => {
              const hit = r.dmg > 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: i < activeRolls.length - 1 ? '1px solid rgba(90,74,58,0.2)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '0.82rem' }}>⚔️ {r.atk}{r.bonus > 0 && <span style={{ color: '#fbbf24' }}>+{r.bonus}</span>}</span>
                    <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>vs</span>
                    <span style={{ color: '#86efac', fontWeight: '700', fontSize: '0.82rem' }}>🛡️ {r.def}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: hit ? '#fbbf24' : '#4ade80', fontSize: '0.65rem', fontWeight: '700' }}>{hit ? '💥 HIT' : '🛡️ BLOCKED'}</span>
                    <span style={{ color: hit ? '#fecaca' : '#4ade80', fontWeight: '900', fontSize: '0.9rem', fontFamily: '"Cinzel",Georgia,serif', minWidth: '48px', textAlign: 'right' }}>{hit ? `${r.dmg}hp` : '0hp'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Previous squad members */}
        {isSquad && memberRolls.some(mr => mr.length > 0) && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {memberRolls.map((mr, mi) => mr.length > 0 && (
              <div key={mi} style={{ background: 'rgba(74,222,128,0.06)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: '800' }}>✓ {members[mi]?.npcName}</span>
                <span style={{ color: '#86efac', fontSize: '0.72rem', fontWeight: '700' }}>{mr.reduce((s, r) => s + r.dmg, 0)}hp</span>
              </div>
            ))}
          </div>
        )}

        {/* Advance squad */}
        {isSquad && allDoneForCurrent && !isLastMember && (
          <button onClick={advanceToNextMember} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', border: '2px solid #3b82f6', color: '#dbeafe', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ➡️ Next: {members[squadRollIndex + 1]?.npcName} — {members[squadRollIndex + 1]?.attack?.name}
          </button>
        )}

        {/* Total damage */}
        <div style={{ background: '#0a0503', border: `2px solid ${gold}`, borderRadius: '8px', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: displayTotal > 0 ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)' : 'none' }} />
          <div style={{ color: '#8b7355', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Damage</div>
          <div style={{ color: displayTotal > 0 ? '#fecaca' : '#4ade80', fontSize: '2.75rem', fontWeight: '900', fontFamily: '"Cinzel",Georgia,serif', lineHeight: 1 }}>{displayTotal}</div>
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>hit points</div>
        </div>

        {/* Close Call epic modal — matches PvP */}
        {showClosecall && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(ellipse at center, rgba(15,5,2,0.97) 0%, rgba(0,0,0,0.99) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '380px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '0.75rem', lineHeight: 1 }}>🛡️</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0.15em', fontFamily: '"Cinzel", Georgia, serif', background: 'linear-gradient(135deg, #fca5a5, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                CLOSE CALL
              </div>
              <div style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: '700', marginBottom: '0.35rem', letterSpacing: '0.08em' }}>
                {closecallOwner?.playerName || 'The Defender'} activated
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                The attack is completely negated.<br/>No damage. No effect. It never happened.
              </div>
              <div style={{ display: 'inline-block', padding: '0.4rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.1em', marginBottom: '2rem' }}>
                DAMAGE NEGATED
              </div>
              <br/>
              <button onClick={() => { setShowClosecall(false); onClose(); }} style={{ padding: '0.75rem 2.5rem', background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: '2px solid #ef4444', borderRadius: '10px', color: '#fecaca', fontFamily: 'inherit', fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
                ✕ Close
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '7px', marginBottom: '0.75rem', color: '#fca5a5', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Proceed / Cancel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleProceed} disabled={!allDone || targets.length === 0} style={{ flex: 1, padding: '0.85rem', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.95rem', borderRadius: '8px', cursor: (allDone && targets.length > 0) ? 'pointer' : 'not-allowed', background: (allDone && targets.length > 0) ? 'linear-gradient(135deg,#15803d,#14532d)' : 'rgba(0,0,0,0.3)', color: (allDone && targets.length > 0) ? '#d1fae5' : '#374151', border: `2px solid ${(allDone && targets.length > 0) ? '#16a34a' : '#1f2937'}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Proceed</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', background: 'linear-gradient(135deg,#7f1d1d,#5f1a1a)', color: '#fecaca', border: '2px solid #991b1b', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};


// ── SessionChestArchiveEntry (inline) ───────────────────────────────────────
const SessionChestArchiveEntry = ({ session }) => {
  const gold = '#c9a961';
  const [open, setOpen] = React.useState(false);
  const opened   = session.chests.filter(c => c.isOpened).length;
  const unopened = session.chests.filter(c => !c.isOpened).length;
  return (
    <div style={{ border: '1px solid rgba(75,85,99,0.4)', borderRadius: '10px', background: 'rgba(0,0,0,0.25)' }}>
      <div onClick={() => setOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer' }}>
        <span style={{ fontSize: '0.9rem' }}>📅</span>
        <span style={{ color: gold, fontWeight: '800', fontSize: '0.85rem', flex: 1, fontFamily: '"Cinzel",Georgia,serif' }}>{session.sessionName}</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {opened   > 0 && <span style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '700' }}>📭{opened}</span>}
          {unopened > 0 && <span style={{ color: '#fde68a', fontSize: '0.65rem', fontWeight: '700' }}>📦{unopened}</span>}
        </div>
        <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(75,85,99,0.25)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {session.chests.map(chest => (
            <div key={chest.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0.65rem',
              background: chest.isOpened ? 'rgba(75,85,99,0.08)' : 'rgba(201,169,97,0.06)',
              border: `1px solid ${chest.isOpened ? 'rgba(75,85,99,0.3)' : 'rgba(201,169,97,0.2)'}`,
              borderRadius: '6px', opacity: chest.isOpened ? 0.7 : 1,
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{chest.isOpened ? '📭' : '📦'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: chest.isOpened ? '#6b7280' : gold, fontWeight: '800', fontSize: '0.85rem' }}>{chest.name}</div>
                {chest.isOpened && chest.openedBy && (
                  <div style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                    Opened by {chest.openedBy}
                    {chest.droppedItems?.length > 0 && ` · ${chest.droppedItems.map(i => i.name).join(', ')}`}
                  </div>
                )}
              </div>
              <span style={{
                padding: '0.1rem 0.4rem', fontSize: '0.6rem', fontWeight: '800', borderRadius: '20px', flexShrink: 0,
                color: chest.isOpened ? '#6b7280' : '#fde68a',
                background: chest.isOpened ? 'rgba(75,85,99,0.15)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${chest.isOpened ? 'rgba(75,85,99,0.3)' : 'rgba(234,179,8,0.25)'}`,
              }}>{chest.isOpened ? 'OPENED' : 'UNOPENED'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── SessionArchiveEntry (inline) ────────────────────────────────────────────
const SessionArchiveEntry = ({ session }) => {
  const gold = '#c9a961';
  const [open, setOpen] = React.useState(false);
  const defeated = session.npcs.filter(n => n.status === 'defeated').length;
  const active   = session.npcs.filter(n => n.status === 'active').length;
  const inactive = session.npcs.filter(n => n.status === 'inactive').length;
  const tagFor = (status) => {
    if (status === 'defeated') return { label: '💀 Defeated', color: '#6b7280', border: 'rgba(75,85,99,0.3)',  bg: 'rgba(75,85,99,0.08)' };
    if (status === 'active')   return { label: '⚔️ Active',   color: '#fca5a5', border: 'rgba(239,68,68,0.25)', bg: 'rgba(239,68,68,0.07)' };
    return                            { label: '😴 Inactive', color: '#8b7355', border: 'rgba(139,115,85,0.2)', bg: 'rgba(139,115,85,0.06)' };
  };
  return (
    <div style={{ border: '1px solid rgba(75,85,99,0.4)', borderRadius: '10px', background: 'rgba(0,0,0,0.25)' }}>
      <div onClick={() => setOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer' }}>
        <span style={{ fontSize: '0.9rem' }}>📅</span>
        <span style={{ color: gold, fontWeight: '800', fontSize: '0.85rem', flex: 1, fontFamily: '"Cinzel",Georgia,serif' }}>{session.sessionName}</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {defeated > 0  && <span style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '700' }}>💀{defeated}</span>}
          {active > 0    && <span style={{ color: '#fca5a5', fontSize: '0.65rem', fontWeight: '700' }}>⚔️{active}</span>}
          {inactive > 0  && <span style={{ color: '#8b7355', fontSize: '0.65rem', fontWeight: '700' }}>😴{inactive}</span>}
        </div>
        <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(75,85,99,0.25)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {session.npcs.map(npc => {
            const tag = tagFor(npc.status);
            return (
              <div key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: '6px' }}>
                <span style={{ color: npc.status === 'defeated' ? '#4b5563' : '#9ca3af', fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{npc.name}</span>
                <span style={{ color: '#6b7280', fontSize: '0.68rem' }}>{npc.hp}/{npc.maxHp}hp</span>
                <span style={{ color: tag.color, fontSize: '0.62rem', fontWeight: '800', padding: '0.1rem 0.4rem', background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: '20px' }}>{tag.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── SpawnModal (inline) ─────────────────────────────────────────────────────

const SpawnModal = ({ attack, parentName, presets, hasPresets, onSpawn, onClose }) => {
  const gold = '#c9a961';
  const items = hasPresets ? presets : [{ name: attack.name || 'Spawn', hp: 10, armor: 0, attackBonus: 0 }];
  const [quantities, setQuantities] = React.useState(items.map(() => 1));

  const setQty = (i, val) => {
    const v = Math.max(0, parseInt(val) || 0);
    setQuantities(prev => { const n = [...prev]; n[i] = v; return n; });
  };

  const totalSpawning = quantities.reduce((s, v) => s + v, 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '3px solid #10b981', borderRadius: '12px', padding: '1.5rem', width: '420px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🐣</div>
          <div style={{ color: '#d1fae5', fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel",Georgia,serif' }}>{attack.name || 'Spawn Attack'}</div>
          {attack.description && <div style={{ color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.2rem' }}>{attack.description}</div>}
          {attack.spawnDieType && <div style={{ color: '#86efac', fontSize: '0.75rem', marginTop: '0.25rem' }}>💡 Roll {attack.spawnDieType.toUpperCase()} × {attack.spawnNumRolls || 1} to determine quantity</div>}
        </div>

        <div style={{ color: '#8b7355', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>How many of each?</div>

        {items.map((preset, pi) => (
          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#86efac', fontWeight: '800', fontSize: '0.9rem' }}>{preset.name || `Type ${pi+1}`}</div>
              <div style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '0.15rem' }}>HP: {preset.hp || 10} · Armor: {preset.armor || 0} · Atk: +{preset.attackBonus || 0}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setQty(pi, (quantities[pi] || 0) - 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input
                type='number' min='0' max='20'
                value={quantities[pi]}
                onChange={e => setQty(pi, e.target.value)}
                style={{ width: '48px', background: '#1a0f0a', color: '#d1fae5', border: '2px solid rgba(74,222,128,0.4)', borderRadius: '6px', padding: '0.35rem', fontSize: '1.1rem', fontWeight: '900', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif' }}
              />
              <button onClick={() => setQty(pi, (quantities[pi] || 0) + 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        ))}

        {totalSpawning > 0 && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', marginBottom: '1rem', marginTop: '0.25rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>
              Naming: <span style={{ color: '#86efac' }}>{parentName ? `${parentName}'s ` : ''}{items[0]?.name || 'NPC'} 1, 2, 3...</span>
            </div>
            <div style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '0.15rem' }}>All spawned NPCs will be immediately activated.</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onSpawn(quantities)}
            disabled={totalSpawning === 0}
            style={{ flex: 1, padding: '0.75rem', background: totalSpawning > 0 ? 'linear-gradient(135deg,#065f46,#047857)' : '#1a0f0a', border: `2px solid ${totalSpawning > 0 ? '#10b981' : '#374151'}`, color: totalSpawning > 0 ? '#d1fae5' : '#374151', borderRadius: '8px', cursor: totalSpawning > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem' }}>
            🐣 Spawn {totalSpawning > 0 ? `(${totalSpawning})` : ''}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid #374151', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '0.85rem', color: '#6b7280' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── FirstStrikeModal (inline) ─────────────────────────────────────────────────

const FirstStrikeModal = ({ players, selected, onToggle, onConfirm }) => {
  const [awarding, setAwarding] = React.useState(null);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000}}>
      <div style={{background:'linear-gradient(145deg,#1a0f0a,#0f0805)',border:'3px solid #f59e0b',borderRadius:'14px',padding:'1.75rem',width:'90%',maxWidth:'420px',boxShadow:'0 0 40px rgba(245,158,11,0.2),0 24px 64px rgba(0,0,0,0.95)',fontFamily:'"Rajdhani","Cinzel",sans-serif'}}>
        <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⚡</div>
          <h2 style={{color:'#f59e0b',fontSize:'1.3rem',fontFamily:'"Cinzel",Georgia,serif',fontWeight:'900',letterSpacing:'0.1em',margin:'0 0 0.5rem'}}>FIRST STRIKE</h2>
          <p style={{color:'#8b7355',fontSize:'0.85rem',margin:0}}>Does this activation grant a First Strike bonus?</p>
        </div>
        {awarding===null&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
          <button onClick={()=>setAwarding(true)} style={{padding:'1rem',background:'linear-gradient(135deg,#ca8a04,#a16207)',border:'2px solid #f59e0b',color:'#fef3c7',borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontWeight:'800',fontSize:'1.1rem'}}>⚡ YES</button>
          <button onClick={()=>onConfirm(false)} style={{padding:'1rem',background:'rgba(0,0,0,0.4)',border:'2px solid #374151',color:'#6b7280',borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontWeight:'800',fontSize:'1.1rem'}}>✕ NO</button>
        </div>}
        {awarding===true&&<>
          <p style={{color:'#f59e0b',fontSize:'0.85rem',fontWeight:'700',marginBottom:'0.75rem',textAlign:'center',letterSpacing:'0.08em',textTransform:'uppercase'}}>Select player(s)</p>
          <div style={{marginBottom:'1rem'}}>
            {players.map(player=>{
              const has=player.firstStrike===true, isSel=selected.includes(player.id), disabled=has&&!isSel;
              return <div key={player.id} onClick={()=>!disabled&&onToggle(player.id)} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',marginBottom:'0.4rem',borderRadius:'8px',border:'2px solid',borderColor:isSel?'#f59e0b':disabled?'#1f1108':'rgba(201,169,97,0.2)',background:isSel?'rgba(245,158,11,0.12)':disabled?'rgba(0,0,0,0.1)':'rgba(0,0,0,0.3)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1}}>
                <div style={{width:'20px',height:'20px',borderRadius:'4px',border:'2px solid',borderColor:isSel?'#f59e0b':'#4b5563',background:isSel?'#f59e0b':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',color:'#000',fontWeight:'900',flexShrink:0}}>{isSel&&'✓'}</div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:player.playerColor||'#3b82f6',flexShrink:0}}/>
                <span style={{color:isSel?'#fbbf24':disabled?'#4b5563':gold,fontWeight:'700',fontSize:'0.95rem',flex:1}}>{player.playerName||'Player'}</span>
                {has&&<span style={{color:'#f59e0b',fontSize:'0.7rem',fontWeight:'700'}}>⚡ HAS BONUS</span>}
              </div>;
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
            <button onClick={()=>onConfirm(true)} disabled={selected.length===0} style={{padding:'0.85rem',background:selected.length>0?'linear-gradient(135deg,#ca8a04,#a16207)':'rgba(0,0,0,0.3)',border:'2px solid',borderColor:selected.length>0?'#f59e0b':'#374151',color:selected.length>0?'#fef3c7':'#4b5563',borderRadius:'8px',cursor:selected.length>0?'pointer':'not-allowed',fontFamily:'inherit',fontWeight:'800'}}>⚡ Award</button>
            <button onClick={()=>setAwarding(null)} style={{padding:'0.85rem',background:'rgba(0,0,0,0.3)',border:'2px solid #374151',color:'#6b7280',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit',fontWeight:'700'}}>← Back</button>
          </div>
        </>}
      </div>
    </div>
  );
};

// ── EndSessionModal (inline) ──────────────────────────────────────────────────

const EndSessionModal = ({ sessionNameInput, setSessionNameInput, onUseCurrentStats, onFromFile, onClose }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
    <div style={{background:'#1a0f0a',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'12px',padding:'1.5rem',width:'100%',maxWidth:'480px'}}>
      <div style={{color:'#fbbf24',fontWeight:'900',fontSize:'1.1rem',letterSpacing:'0.08em',marginBottom:'0.25rem'}}>🏆 END SESSION</div>
      <div style={{color:'#6b7280',fontSize:'0.75rem',marginBottom:'1rem'}}>Give this session a name, then calculate awards.</div>
      <input style={{background:'rgba(0,0,0,0.5)',border:'1px solid rgba(201,169,97,0.4)',borderRadius:'8px',padding:'0.6rem 0.85rem',color:'#e5d5b5',fontFamily:'inherit',fontSize:'0.9rem',width:'100%',outline:'none',marginBottom:'1rem',boxSizing:'border-box'}} value={sessionNameInput} onChange={e=>setSessionNameInput(e.target.value)} placeholder='e.g. The Sleeping Giant' onKeyDown={e=>e.key==='Enter'&&onUseCurrentStats()} autoFocus/>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <button onClick={onUseCurrentStats} style={{flex:2,padding:'0.65rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:'inherit',fontSize:'0.85rem'}}>⚡ Use Current Stats</button>
        <button onClick={onFromFile} style={{flex:1,padding:'0.65rem',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(201,169,97,0.3)',borderRadius:'8px',color:'#c9a961',fontWeight:'800',cursor:'pointer',fontFamily:'inherit',fontSize:'0.78rem'}}>📂 From File</button>
      </div>
      <button onClick={onClose} style={{width:'100%',padding:'0.5rem',background:'transparent',border:'none',color:'#4b5563',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'0.78rem'}}>Cancel</button>
    </div>
  </div>
);

// ── ManualStatsModal (inline) ─────────────────────────────────────────────────

const STAT_FIELDS = [
  { key:'npcDamage',    label:'🐉 NPC Damage' },
  { key:'pvpDamage',    label:'⚔️ PvP Damage' },
  { key:'damageTaken',  label:'🛡️ Damage Taken' },
  { key:'revivesUsed',  label:'💪 Times Revived' },
  { key:'finalBossKill',label:'👑 Boss Kill (0/1)' },
  { key:'warmonger',    label:'⚡ Attacks' },
  { key:'firstBlood',   label:'🩸 First Blood (0/1)' },
];

const ManualStatsModal = ({ data, onChange, onConfirm, onClose }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:2001,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
    <div style={{background:'#1a0f0a',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'12px',padding:'1.5rem',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{color:'#fbbf24',fontWeight:'900',fontSize:'1rem',marginBottom:'0.25rem'}}>📋 ENTER SESSION STATS</div>
      <div style={{color:'#6b7280',fontSize:'0.72rem',marginBottom:'1.25rem'}}>No VP data found. Enter what you remember — leave blank for 0.</div>
      {(data.players||[]).map(p=>(
        <div key={p.id} style={{background:'rgba(0,0,0,0.3)',border:`1px solid ${p.playerColor||'#555'}40`,borderRadius:'8px',padding:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{color:p.playerColor||gold,fontWeight:'800',fontSize:'0.85rem',marginBottom:'0.6rem'}}>{p.playerName}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
            {STAT_FIELDS.map(f=>(
              <div key={f.key}>
                <div style={{color:'#6b7280',fontSize:'0.6rem',fontWeight:'700',marginBottom:'2px'}}>{f.label}</div>
                <input type='number' min='0' style={{background:'rgba(0,0,0,0.5)',border:'1px solid rgba(201,169,97,0.25)',borderRadius:'6px',padding:'0.3rem 0.5rem',color:'#e5d5b5',fontFamily:'inherit',fontSize:'0.8rem',width:'100%',outline:'none',boxSizing:'border-box'}} value={data.stats[p.id]?.[f.key]??''} onChange={e=>onChange(p.id,f.key,e.target.value)} placeholder='0'/>
              </div>
            ))}
            <div>
              <div style={{color:'#6b7280',fontSize:'0.6rem',fontWeight:'700',marginBottom:'2px'}}>📦 Items</div>
              <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(201,169,97,0.15)',borderRadius:'6px',padding:'0.3rem 0.5rem',color:'#9ca3af',fontSize:'0.8rem'}}>{(p.inventory||[]).length} (auto)</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
        <button onClick={onClose} style={{flex:1,padding:'0.65rem',background:'transparent',border:'1px solid rgba(90,74,58,0.4)',borderRadius:'8px',color:'#6b7280',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        <button onClick={onConfirm} style={{flex:2,padding:'0.65rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:'inherit'}}>Calculate Awards →</button>
      </div>
    </div>
  </div>
);

// ── AwardShowcase (inline) ────────────────────────────────────────────────────

const AwardShowcase = ({ showcase, onPrev, onNext, onFinish }) => {
  const { awards, index, sessionName } = showcase;
  const award=awards[index], isFirst=index===0, isLast=index===awards.length-1;
  const valLabel = () => {
    if (award.isManual)                          return award.label;
    if (award.categoryId==='itemsObtained')      return `${award.value} items obtained`;
    if (award.categoryId==='leastDeaths')        return `only ${award.value} revives used`;
    if (award.categoryId==='immortal')           return 'not a single death all session';
    if (award.categoryId==='leastDamageTaken')   return `only ${award.value} damage taken`;
    if (award.categoryId==='finalBossKill')      return 'delivered the killing blow';
    if (award.categoryId==='firstBlood')         return 'drew first blood this session';
    if (award.categoryId==='warmonger')          return `initiated ${award.value} attacks`;
    return `${award.value} damage dealt`;
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:2002,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#1a0f0a',border:'3px solid rgba(251,191,36,0.7)',borderRadius:'16px',padding:'2rem 1.5rem',width:'100%',maxWidth:'440px',textAlign:'center'}}>
        <div style={{color:'#6b7280',fontSize:'0.62rem',fontWeight:'800',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'1.75rem'}}>{sessionName} · Award {index+1} of {awards.length}</div>
        <div style={{fontSize:'5rem',marginBottom:'0.75rem',lineHeight:1}}>{award.icon}</div>
        <div style={{color:'#9ca3af',fontWeight:'800',fontSize:'0.72rem',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'0.5rem'}}>{award.label}</div>
        <div style={{color:award.playerColor||gold,fontWeight:'900',fontSize:'2rem',marginBottom:'0.4rem',textShadow:`0 0 20px ${award.playerColor||gold}66`}}>{award.playerName}</div>
        <div style={{color:'#6b7280',fontSize:'0.8rem',marginBottom:'1.5rem'}}>{valLabel()}</div>
        <div style={{display:'inline-block',padding:'0.5rem 2rem',background:'rgba(251,191,36,0.12)',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'10px',color:'#fbbf24',fontWeight:'900',fontSize:'1.75rem',letterSpacing:'0.05em',marginBottom:'2rem'}}>+{award.pts} VP</div>
        <div style={{display:'flex',gap:'0.75rem'}}>
          <button disabled={isFirst} onClick={onPrev} style={{flex:1,padding:'0.75rem',background:'rgba(0,0,0,0.3)',border:`1px solid ${isFirst?'transparent':'rgba(90,74,58,0.4)'}`,borderRadius:'8px',color:isFirst?'#1f2937':'#9ca3af',fontWeight:'800',cursor:isFirst?'default':'pointer',fontFamily:'inherit'}}>← Prev</button>
          {isLast
            ? <button onClick={onFinish} style={{flex:2,padding:'0.75rem',background:'linear-gradient(135deg,#065f46,#047857)',border:'2px solid #10b981',borderRadius:'8px',color:'#d1fae5',fontWeight:'900',cursor:'pointer',fontFamily:'inherit',fontSize:'0.95rem'}}>✓ Finish</button>
            : <button onClick={onNext}   style={{flex:2,padding:'0.75rem',background:'linear-gradient(135deg,#92400e,#78350f)',border:'2px solid #fbbf24',borderRadius:'8px',color:'#fbbf24',fontWeight:'900',cursor:'pointer',fontFamily:'inherit',fontSize:'0.95rem'}}>Next →</button>
          }
        </div>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: { minHeight:'100vh', height:'100vh', background:'radial-gradient(ellipse at top,#1a0f1e 0%,#0a0507 50%,#000000 100%)', color:'#e8dcc4', fontFamily:'"Rajdhani","Cinzel",sans-serif', padding:'0.75rem', overflow:'auto' },
  header: { display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem', padding:'1rem 1.5rem', background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(99,102,241,0.05))', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)' },
  titleSection: { display:'flex', flexDirection:'column', alignItems:'center', gap:'0.25rem' },
  title: { fontSize:'2rem', margin:0, fontWeight:'800', letterSpacing:'0.1em', background:'linear-gradient(135deg,#f59e0b,#d97706)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', textShadow:'0 0 30px rgba(245,158,11,0.3)' },
  subtitle: { fontSize:'0.75rem', color:'#8b7355', letterSpacing:'0.15em', textTransform:'uppercase' },
  headerControls: { display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap', justifyContent:'center' },
  currentPlayerDisplay: { display:'flex', flexDirection:'column', padding:'0.5rem 1rem', background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.5)', borderRadius:'8px', boxShadow:'0 0 20px rgba(139,92,246,0.2)' },
  currentPlayerLabel: { fontSize:'0.65rem', color:'#c4b5fd', letterSpacing:'0.1em', fontWeight:'700' },
  currentPlayerName: { fontSize:'1rem', fontWeight:'700', letterSpacing:'0.05em' },
  modeDisplay: { display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 1rem', background:'rgba(245,158,11,0.1)', border:'2px solid rgba(245,158,11,0.4)', borderRadius:'8px', transition:'all 0.2s', userSelect:'none' },
  modeIcon: { fontSize:'1.2rem' },
  modeText: { fontSize:'0.85rem', color:'#fbbf24', fontWeight:'700', letterSpacing:'0.05em', textTransform:'uppercase' },
  roundDisplay: { display:'flex', flexDirection:'column', alignItems:'center', padding:'0.5rem 1rem', background:'rgba(20,184,166,0.1)', border:'1px solid rgba(20,184,166,0.4)', borderRadius:'8px' },
  roundLabel: { fontSize:'0.65rem', color:'#5eead4', letterSpacing:'0.1em', fontWeight:'700' },
  roundNumber: { fontSize:'1.25rem', color:'#14b8a6', fontWeight:'800', lineHeight:'1' },
  endTurnBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#059669,#047857)', border:'1px solid #10b981', color:'#d1fae5', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:'0 4px 12px rgba(16,185,129,0.3)', transition:'all 0.2s' },
  viewModeBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#1e40af,#1e3a8a)', border:'1px solid #3b82f6', color:'#dbeafe', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', boxShadow:'0 4px 12px rgba(59,130,246,0.2)', transition:'all 0.2s' },
  statsBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.1))', border:'1px solid #f59e0b', color:'#fde68a', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', boxShadow:'0 4px 12px rgba(245,158,11,0.15)', transition:'all 0.2s' },
  undoBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#ca8a04,#a16207)', border:'1px solid #eab308', color:'#fef3c7', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', boxShadow:'0 4px 12px rgba(234,179,8,0.2)', transition:'all 0.2s' },
  resetBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#b91c1c,#991b1b)', border:'1px solid #dc2626', color:'#fecaca', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', boxShadow:'0 4px 12px rgba(220,38,38,0.3)', transition:'all 0.2s' },
  resetCombatBtn: { padding:'0.5rem 1rem', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'8px', color:'#fca5a5', fontWeight:'800', fontSize:'0.75rem', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.05em', whiteSpace:'nowrap' },
  saveBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#0891b2,#0e7490)', border:'2px solid #06b6d4', color:'#cffafe', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', textTransform:'uppercase', boxShadow:'0 4px 12px rgba(6,182,212,0.3)', transition:'all 0.2s' },
  loadBtn: { padding:'0.85rem 1.75rem', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'2px solid #a78bfa', color:'#f3e8ff', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'0.95rem', textTransform:'uppercase', boxShadow:'0 4px 12px rgba(167,139,250,0.3)', transition:'all 0.2s' },
  addPlayerSection: { marginBottom:'0.75rem', textAlign:'center' },
  addPlayerBtn: { padding:'1rem 2.5rem', background:'linear-gradient(135deg,#1e40af,#1e3a8a)', border:'2px solid #3b82f6', color:'#dbeafe', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'1rem', letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:'0 8px 24px rgba(59,130,246,0.3)', transition:'all 0.2s' },
  sidebar: { width:'280px', minWidth:'280px', background:'linear-gradient(135deg,rgba(17,24,39,0.8),rgba(31,41,55,0.6))', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'12px', padding:'1.25rem', height:'fit-content', position:'sticky', top:'1rem', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' },
  sidebarTitle: { color:'#f59e0b', fontSize:'1rem', marginTop:0, marginBottom:'1rem', fontFamily:'inherit', fontWeight:'800', letterSpacing:'0.1em', textTransform:'uppercase' },
  sidebarPlayer: { padding:'0.75rem', marginBottom:'0.5rem', borderRadius:'8px', cursor:'grab', transition:'all 0.2s' },
  sidebarPlayerHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.25rem' },
  sidebarPlayerName: { fontWeight:'700', fontSize:'0.875rem', letterSpacing:'0.05em' },
  sidebarPlayerInfo: { fontSize:'0.75rem', color:'#9ca3af' },
};

// ── TokenNotificationToast ───────────────────────────────────────────────────────

const TokenNotificationToast = ({ notifications }) => {
  if (notifications.length === 0) return null;
  const n = notifications[0];
  return (
    <div style={{ position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ background: 'linear-gradient(135deg,#1a0f0a,#0f0805)', border: '2px solid rgba(201,169,97,0.5)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
          <div>
            <div style={{ color: '#c9a961', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>COMMANDER TOKEN</div>
            <div style={{ color: '#e8dcc4', fontWeight: '700', fontSize: '0.82rem' }}>{n.message}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── TimerExpiredToast ─────────────────────────────────────────────────────────

const TimerExpiredToast = ({ notifications }) => {
  if (notifications.length === 0) return null;
  const n = notifications[0];
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
      <div style={{ background: 'linear-gradient(135deg,#1a0f0a,#0f0805)', border: '2px solid rgba(99,102,241,0.6)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '220px', animation: 'fadeInUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⏱</span>
          <div>
            <div style={{ color: '#a5b4fc', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>TIMER ENDED</div>
            <div style={{ color: '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>{n.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HPCounter;