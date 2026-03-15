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
    (playerId) => { roundTimers.onPlayerTurnEnd(playerId); tokensOnRoundRef.current?.(playerId); }
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
  const campaign = useCampaignTurn(
    players, activeNPCs, getNPCById, playersWhoActedThisRound, currentRound,
    endTurn, addLog, updatePlayer, setNpcs, applyDamageToNPC, vp.trackVP,
    () => { roundTimers.onRoundAdvance(); }
  );
  // Wire lastAttackerIdRef
  lastAttackerIdRef.current = campaign.lastAttackerIdRef.current;

  // ── Damage calculation ────────────────────────────────────────────────────
  const {
    showCalculator, showDamageDistribution, calculatorData, damageDistribution,
    openCalculator, closeCalculator, updateDamageDistribution,
    setShowDamageDistribution, setCalculatorData, applyDamage,
  } = useDamageCalculation(players, addLog, npcs);

  // ── Squad revive ──────────────────────────────────────────────────────────
  const [squadRevivePlayerId, setSquadRevivePlayerId] = React.useState(null);
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
    const state = { players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex, playersWhoActedThisRound, gameStarted, npcs, lootPool, chests, vpStats: vp.vpStats, savedAt: new Date().toISOString() };
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
              const hasActed = isPlayer ? playersWhoActedThisRound.includes(entity.id) : campaign.npcsWhoActedThisRound.includes(entity.id);
              return (
                <div key={entry.id} style={{ ...styles.sidebarPlayer, background: isCurr ? (isPlayer ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.2))' : 'linear-gradient(135deg,rgba(220,38,38,0.15),rgba(185,28,28,0.1))') : hasActed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', borderLeft: isCurr ? `4px solid ${isPlayer?(entity.playerColor||'#8b5cf6'):'#ef4444'}` : hasActed ? '4px solid #22c55e' : '4px solid transparent' }}>
                  <div style={styles.sidebarPlayerHeader}>
                    <span style={{ ...styles.sidebarPlayerName, color: isCurr ? (isPlayer?(entity.playerColor||'#8b5cf6'):'#fca5a5') : '#d4af37' }}>{isPlayer ? entity.playerName : `👾 ${entity.name}`}</span>
                    {isCurr && <span style={{ color: isPlayer?'#8b5cf6':'#ef4444' }}>▶</span>}
                    {!isCurr && hasActed && <span style={{ color: '#22c55e' }}>✓</span>}
                  </div>
                  <div style={styles.sidebarPlayerInfo}>{isPlayer ? `${entity.commanderStats.customName||entity.commander} • ${entity.commanderStats.hp}/${entity.commanderStats.maxHp}hp` : `${entity.hp}/${entity.maxHp}hp • 🛡️${entity.armor}+`}</div>
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
              onOpenNPCAttack={campaign.openNPCAttack}
              onOpenNPCSquadAttack={campaign.openNPCSquadAttack}
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

          {isCampaign && activePanel === 'loot' && (
            <LootPanel players={players} lootPool={lootPool} setLootPool={setLootPool} onGiveItem={loot.handleDropLoot} />
          )}

          {isCampaign && activePanel === 'chests' && (
            <ChestPanel players={players} lootPool={lootPool} chests={chests} setChests={setChests} onGiveLoot={loot.handleChestLoot} onConsumeKey={(playerId, newInventory) => updatePlayer(playerId, { inventory: newInventory })} />
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
                }
                (updP.subUnits||[]).forEach((u,i) => {
                  const origU = (origP.subUnits||[])[i];
                  const unitType = u.unitType||(i===0?'special':`soldier${i}`);
                  if (origU && origU.hp>0 && u.hp===0) loot.checkForSteal(calculatorData?.attackerId, calculatorData?.attackingUnitType||'commander', updP.id, unitType);
                });
              });
              updatedPlayers.forEach(p => updatePlayer(p.id, p));
              if (calc?.targetSquadMembers) {
                const atk = players.find(p=>p.id===calc?.attackerId);
                calc.targetSquadMembers.forEach(t => {
                  if (!t.isNPC) return;
                  const dmg = damageDistribution[`npc-${t.npcId}`]||0;
                  if (dmg > 0) {
                    campaign.lastAttackerIdRef.current = calc?.attackerId??null;
                    applyDamageToNPC(t.npcId, dmg, atk?.playerName||'Unknown', loot.unitNameByType(atk, calc?.attackingUnitType||'commander'));
                    if (calc?.attackerId) vp.trackVP(calc.attackerId,'npcDamage',dmg);
                  }
                });
              }
            });
          }}
          onClose={() => setShowDamageDistribution(false)}
        />
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
          onUseCurrentStats={vp.handleEndSession}
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

const NPCCalculator = ({ npcAttackData, players, onClose, onProceed }) => {
  const isSquad   = !!npcAttackData.isSquad;
  const members   = npcAttackData.squadMembers || [];

  // For squad: track which member we're on and accumulate rolls per member
  const [squadRollIndex,  setSquadRollIndex]  = React.useState(0); // which member is rolling
  const [memberRolls,     setMemberRolls]     = React.useState([]); // [[rolls for member0], [rolls for member1], ...]
  const [currentMemberRolls, setCurrentMemberRolls] = React.useState([]);

  // For solo: original state
  const [rolls,        setRolls]        = React.useState([]);
  const [totalDamage,  setTotalDamage]  = React.useState(0);

  const [atkRoll,  setAtkRoll]  = React.useState('');
  const [defRoll,  setDefRoll]  = React.useState('');
  const [targets,  setTargets]  = React.useState([]);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Current NPC being rolled
  const currentMember   = isSquad ? members[squadRollIndex] : null;
  const attack          = isSquad ? currentMember?.attack : npcAttackData.attack;
  const attackBonus     = isSquad ? (currentMember?.attackBonus || 0) : (npcAttackData.attackBonus || 0);
  const npcName         = isSquad ? currentMember?.npcName : npcAttackData.npcName;
  const numRolls        = attack?.numRolls || 1;
  const dieType         = attack?.dieType || 'd20';
  const dieMax          = dieType === 'd20' ? 20 : dieType === 'd10' ? 10 : dieType === 'd6' ? 6 : 4;

  const activeRolls     = isSquad ? currentMemberRolls : rolls;
  const allDoneForCurrent = activeRolls.length >= numRolls;
  const isLastMember    = isSquad ? squadRollIndex >= members.length - 1 : true;
  const allSquadDone    = isSquad ? (allDoneForCurrent && isLastMember) : allDoneForCurrent;
  const allDone         = isSquad ? allSquadDone : allDoneForCurrent;

  // Running total across all squad members
  const squadRunningTotal = memberRolls.reduce((sum, mRolls) => sum + mRolls.reduce((s, r) => s + r.dmg, 0), 0);
  const currentMemberTotal = currentMemberRolls.reduce((s, r) => s + r.dmg, 0);
  const displayTotal = isSquad ? (squadRunningTotal + currentMemberTotal) : totalDamage;

  const addRoll = () => {
    const atk = parseInt(atkRoll) || 0;
    const def = parseInt(defRoll) || 0;
    const finalAtk = atk + attackBonus;
    const dmg = Math.max(0, finalAtk - def);
    const roll = { atk, bonus: attackBonus, finalAtk, def, dmg };

    if (isSquad) {
      setCurrentMemberRolls(prev => [...prev, roll]);
    } else {
      setRolls(prev => [...prev, roll]);
      setTotalDamage(prev => prev + dmg);
    }
    setAtkRoll(''); setDefRoll('');
  };

  const advanceToNextMember = () => {
    // Save current member's rolls
    const savedRolls = [...memberRolls, currentMemberRolls];
    setMemberRolls(savedRolls);
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
    if (!allDone) { setErrorMsg(`Complete all rolls first.`); return; }
    if (targets.length === 0) { setErrorMsg('Select at least one target.'); return; }

    let finalRolls, finalTotal;
    if (isSquad) {
      const allRolls = [...memberRolls, currentMemberRolls];
      finalRolls = allRolls.flat();
      finalTotal = finalRolls.reduce((s, r) => s + r.dmg, 0);
    } else {
      finalRolls = rolls;
      finalTotal = totalDamage;
    }
    onProceed({ ...npcAttackData, totalDamage: finalTotal, d20Rolls: finalRolls, targetSquadMembers: targets });
  };

  const inputStyle = { background: '#1a0f0a', color: gold, padding: '0.75rem', borderRadius: '6px', border: '2px solid #5a4a3a', fontSize: '1.5rem', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold', width: '100%' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `3px solid ${gold}`, borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <h3 style={{ color: gold, fontFamily: '"Cinzel",Georgia,serif', textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.2rem' }}>
          {isSquad ? '⚔️ NPC Squad Attack' : `👾 ${npcName} — ${attack?.name}`}
        </h3>

        {/* Squad progress bar */}
        {isSquad && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {members.map((m, i) => (
                <div key={m.npcId} style={{ flex: 1, padding: '0.3rem 0.4rem', borderRadius: '6px', textAlign: 'center', background: i < squadRollIndex ? 'rgba(74,222,128,0.12)' : i === squadRollIndex ? 'rgba(124,58,237,0.2)' : 'rgba(0,0,0,0.3)', border: `1px solid ${i < squadRollIndex ? 'rgba(74,222,128,0.4)' : i === squadRollIndex ? '#a78bfa' : 'rgba(90,74,58,0.3)'}` }}>
                  <div style={{ color: i < squadRollIndex ? '#4ade80' : i === squadRollIndex ? '#e9d5ff' : '#4b5563', fontSize: '0.62rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i < squadRollIndex ? '✓ ' : i === squadRollIndex ? '▶ ' : ''}{m.npcName}
                  </div>
                  <div style={{ color: i === squadRollIndex ? '#a78bfa' : '#4b5563', fontSize: '0.58rem' }}>{m.attack?.name}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: '#a78bfa', fontSize: '0.78rem', fontWeight: '700' }}>
              {npcName} — {attack?.name} · {dieType.toUpperCase()} × {numRolls} · Roll {Math.min(activeRolls.length + 1, numRolls)} of {numRolls}
            </div>
          </div>
        )}

        {!isSquad && (
          <div style={{ textAlign: 'center', color: '#8b7355', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {dieType.toUpperCase()} × {numRolls} | Roll {Math.min(rolls.length + 1, numRolls)} of {numRolls}
          </div>
        )}

        {/* Target selector */}
        <div style={{ marginBottom: '1rem', background: '#0a0503', padding: '0.75rem', borderRadius: '6px', border: '1px solid #5a4a3a' }}>
          <div style={{ color: gold, fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>SELECT TARGETS:</div>
          {players.map(player => (
            <div key={player.id} style={{ marginBottom: '0.35rem' }}>
              <div style={{ color: '#8b7355', fontSize: '0.75rem', marginBottom: '0.2rem' }}>{player.playerName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {player.commanderStats.hp > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: gold, fontSize: '0.75rem' }}>
                    <input type='checkbox' checked={!!targets.find(t => t.playerId === player.id && t.unitType === 'commander')} onChange={() => toggleTarget(player.id, 'commander')} />
                    ⚔️ {player.commanderStats.customName || player.commander} ({player.commanderStats.hp}hp)
                  </label>
                )}
                {player.subUnits.map((unit, idx) => unit.hp > 0 && (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#c4b5fd', fontSize: '0.75rem' }}>
                    <input type='checkbox' checked={!!targets.find(t => t.playerId === player.id && t.unitType === (idx === 0 ? 'special' : `soldier${idx}`))} onChange={() => toggleTarget(player.id, idx === 0 ? 'special' : `soldier${idx}`)} />
                    {idx === 0 ? '⭐' : '🛡️'} {unit.name || (idx === 0 ? 'Special' : `Soldier ${idx}`)} ({unit.hp}hp)
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Roll input */}
        {!allDoneForCurrent && (
          <div style={{ background: '#0a0503', border: `2px solid ${gold}`, borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ color: gold, fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>NPC Roll ({dieType.toUpperCase()})</label>
                <input type='number' min='1' max={dieMax} value={atkRoll} onChange={e => setAtkRoll(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: gold, fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Player Defense (D10)</label>
                <input type='number' min='1' max='10' value={defRoll} onChange={e => setDefRoll(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <button onClick={addRoll} disabled={!atkRoll || !defRoll} style={{ width: '100%', padding: '0.65rem', background: (atkRoll && defRoll) ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#1a0f0a', color: (atkRoll && defRoll) ? '#e9d5ff' : '#4a3322', border: '2px solid', borderColor: (atkRoll && defRoll) ? '#a78bfa' : '#4a3322', borderRadius: '6px', cursor: (atkRoll && defRoll) ? 'pointer' : 'not-allowed', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold' }}>
              + Add Roll
            </button>
          </div>
        )}

        {/* Current member rolls history */}
        {activeRolls.length > 0 && (
          <div style={{ background: '#0a0503', padding: '0.75rem', borderRadius: '6px', border: '1px solid #5a4a3a', marginBottom: '0.5rem' }}>
            {isSquad && <div style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{npcName}</div>}
            {activeRolls.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.2rem 0' }}>
                <span style={{ color: '#8b7355' }}>Roll {i + 1}: {r.atk}{r.bonus > 0 && <span style={{ color: '#fbbf24' }}>+{r.bonus}</span>} vs {r.def}</span>
                <span style={{ color: r.dmg > 0 ? '#fecaca' : '#86efac', fontWeight: 'bold' }}>{r.dmg > 0 ? `${r.dmg}hp` : 'BLOCKED'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Previous squad member rolls */}
        {isSquad && memberRolls.some(mr => mr.length > 0) && (
          <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {memberRolls.map((mr, mi) => mr.length > 0 && (
              <div key={mi} style={{ background: 'rgba(74,222,128,0.06)', padding: '0.4rem 0.65rem', borderRadius: '5px', border: '1px solid rgba(74,222,128,0.2)' }}>
                <span style={{ color: '#4ade80', fontSize: '0.62rem', fontWeight: '800' }}>✓ {members[mi]?.npcName}</span>
                <span style={{ color: '#6b7280', fontSize: '0.62rem', marginLeft: '0.5rem' }}>{mr.reduce((s, r) => s + r.dmg, 0)}hp</span>
              </div>
            ))}
          </div>
        )}

        {/* Advance to next NPC (squad mode) */}
        {isSquad && allDoneForCurrent && !isLastMember && (
          <button onClick={advanceToNextMember} style={{ width: '100%', padding: '0.65rem', marginBottom: '0.75rem', background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', border: '2px solid #3b82f6', color: '#dbeafe', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold' }}>
            ➡️ Next: {members[squadRollIndex + 1]?.npcName} — {members[squadRollIndex + 1]?.attack?.name}
          </button>
        )}

        {/* Total damage */}
        <div style={{ background: '#0a0503', border: `2px solid ${gold}`, borderRadius: '6px', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ color: gold, fontSize: '0.8rem' }}>Total Damage</div>
          <div style={{ color: '#fecaca', fontSize: '2rem', fontWeight: 'bold', fontFamily: '"Cinzel",Georgia,serif' }}>{displayTotal}hp</div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '7px', marginBottom: '0.75rem', color: '#fca5a5', fontSize: '0.78rem', fontWeight: '700', textAlign: 'center' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Proceed / Cancel */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleProceed} disabled={!allDone || targets.length === 0} style={{ flex: 1, padding: '0.75rem', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold', fontSize: '1rem', borderRadius: '6px', cursor: (allDone && targets.length > 0) ? 'pointer' : 'not-allowed', background: (allDone && targets.length > 0) ? 'linear-gradient(to bottom,#15803d,#14532d)' : '#1a0f0a', color: (allDone && targets.length > 0) ? '#86efac' : '#4a3322', border: '2px solid', borderColor: (allDone && targets.length > 0) ? '#16a34a' : '#4a3322' }}>✓ Proceed</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(to bottom,#7f1d1d,#5f1a1a)', color: '#fecaca', border: '2px solid #991b1b', borderRadius: '6px', cursor: 'pointer', fontFamily: '"Cinzel",Georgia,serif', fontWeight: 'bold' }}>✕ Cancel</button>
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