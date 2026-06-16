import React from 'react';
import { useGameState }        from '../hooks/useGameState';
import { colors, surfaces, borders, fonts, btn } from '../theme';
import { useDamageCalculation } from '../hooks/useDamageCalculation';
import { useNPCState }          from '../hooks/useNPCState';
import { useVPState }           from '../hooks/useVPState';
import { useLootHandlers }      from '../hooks/useLootHandlers';
import { useCampaignTurn }      from '../hooks/useCampaignTurn';
import { doc, updateDoc }       from 'firebase/firestore';
import { db }                   from '../firebase';

import PlayerCard          from './PlayerCard';
import Calculator          from './Calculator';
import DamageDistribution  from './DamageDistribution';
import LogPanel            from './LogPanel';
import StatsModal          from './StatsModal';
import GameModeSelector    from './GameModeSelector';
import SquadReviveModal    from './SquadReviveModal';
import DMPanel             from './DMPanel';
import DMSidebar           from './DMSidebar';
import NPCCard             from './NPCCard';
import LootPanel           from './LootPanel';
import ChestPanel          from './ChestPanel';
import VictoryPanel        from './VictoryPanel';
import HandOffModal        from './HandOffModal';
import { NpcLootModal, StealLootModal, DestroyItemModal } from './LootModals';
import { getSlotCount, getHeldCount } from './lootUtils';
import { getModeConfig }   from '../data/gameModes';
import { useRoundTimers }       from '../hooks/useRoundTimers';
import DMToolsPanel            from './DMToolsPanel';
import { useCommanderTokens }  from '../hooks/useCommanderTokens';
import RoundTimerPanel         from './RoundTimerPanel';
import CommanderTokenPanel     from './CommanderTokenPanel';
import useFirestoreSync        from '../hooks/useFirestoreSync';
import { subscribePendingRequests, resolvePendingRequest, writePendingChoice, resolvePendingChoice, subscribePendingChoices } from '../services/gameStateService';
import { subscribePlayerLeft, subscribePlayerRejoin, markPlayerLeft } from '../services/lobbyService';
import NPCCalculator from './NPCCalculator';
import { SessionChestArchiveEntry, SessionRoomArchiveEntry, SessionArchiveEntry } from './SessionArchiveEntries';
import SpawnModal from './SpawnModal';
import FirstStrikeModal from './FirstStrikeModal';
import { EndSessionModal, ManualStatsModal, STAT_FIELDS } from './SessionModals';
import AwardShowcase from './AwardShowcase';
import PvPDeathModal from './PvPDeathModal';
import { settingsBtn, styles, TokenNotificationToast, TimerExpiredToast } from './GMStyles';




const HPCounter = ({ lobbyCode = null, gmUid = null, isMultiplayer = false, initialGameState = null, onEndGame = null }) => {
  // ── Round timers (init first so callback is ready for useGameState) ────────
  const roundTimers = useRoundTimers();
  // addLogRef — lets tokens use addLog before it's in scope
  const addLogRef = React.useRef(() => {});
  const tokensOnRoundRef = React.useRef(null);

  // ── Core game state ───────────────────────────────────────────────────────
  const {
    players, currentRound, combatLog, gameMode, customModeSettings,
    currentPlayerIndex, playersWhoActedThisRound, setPlayersWhoActedThisRound, gameStarted,
    setPlayers, addPlayer, removePlayer, reorderPlayers, updatePlayer,
    toggleSquad, useRevive: useReviveBase, changeGameMode, getModeValues, startGame,
    endTurn, endTurnSideEffectsOnly, undo, addLog, clearLog, loadGameState, processSquadRevive,
    lootPool, setLootPool, startNewSession, setCurrentRound,
  } = useGameState(
    () => { roundTimers.onRoundAdvance(); },
    (playerId) => { roundTimers.onPlayerTurnEnd(playerId); tokensOnRoundRef.current?.(playerId); tickNPCEffectsForPlayer(playerId); }
  );

  // Keep addLogRef current each render
  addLogRef.current = addLog;

  // ── Multiplayer: initial load ref (effect placed after useNPCState) ────────
  const initialStateLoaded = React.useRef(false);





  // ── Rooms ────────────────────────────────────────────────────────────────

  // ── Commander tokens (after addLog is available) ──────────────────────────
  const tokens = useCommanderTokens((...args) => addLogRef.current(...args));
  tokensOnRoundRef.current = tokens.onPlayerTurnEnd;

  // Wrap useRevive to handle token return on revive and VP tracking
  const useRevive = (playerId, isSuccessful) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (player && isSuccessful) {
      tokens.onCommanderRevived(playerId);
      vp.trackVP(playerId, 'revivesUsed', 1);
    }
    useReviveBase(playerId, isSuccessful);
  };


  // ── Firestore sync moved below — needs npcs, chests, rooms, tokens, vp ────

  // ── Chest state ───────────────────────────────────────────────────────────
  const [chests, setChests] = React.useState(() => {
    try { const s = localStorage.getItem('bt_chests'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('bt_chests', JSON.stringify(chests)); } catch {}
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
    try { const s = localStorage.getItem('bt_pastSessionNPCs'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const archiveNPCsRef = React.useRef(null);

  // Persist past session NPCs to localStorage
  React.useEffect(() => {
    try { localStorage.setItem('bt_pastSessionNPCs', JSON.stringify(pastSessionNPCs)); } catch {}
  }, [pastSessionNPCs]);

  // Past session Chest archive — persisted to localStorage
  const [pastSessionChests, setPastSessionChests] = React.useState(() => {
    try { const s = localStorage.getItem('bt_pastSessionChests'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  // Persist past session Chests to localStorage
  React.useEffect(() => {
    try { localStorage.setItem('bt_pastSessionChests', JSON.stringify(pastSessionChests)); } catch {}
  }, [pastSessionChests]);

  const {
    npcs, activeNPCs, inactiveNPCs, deadNPCs,
    showNPCCreator, editingNPCId,
    blankNPC, blankAttack, blankPhase,
    openCreator, closeCreator, saveNPC, removeNPC, duplicateNPC,
    activateNPC, deactivateNPC,
    applyDamageToNPC, setNPCHP, triggerNextPhase, triggerNextEvolution, getNPCById, setNpcs, resetAllNPCs,
    setOnEvolve,
  } = useNPCState(addLog, (killedNPC) => {
    const attackingPlayer = players.find(p => String(p.id) === String(lastAttackerIdRef.current)) || null;
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
      addLog(`👑 ${attackingPlayer.playerName} dealt the killing blow to ${killedNPC.name}!`, 'combat');
    }
  });

  // ── Loot handlers ─────────────────────────────────────────────────────────
  const loot = useLootHandlers(players, updatePlayer, addLog, vp.trackVP);
  // Wire the ref so useNPCState callback can reach setNpcLootClaim
  npcLootClaimSetterRef.current = loot.setNpcLootClaim;

  // ── Multiplayer: load initial state (all hooks are ready now) ────────────
  React.useEffect(() => {
    if (isMultiplayer && initialGameState && !initialStateLoaded.current) {
      initialStateLoaded.current = true;
      loadGameState(initialGameState);
      if (initialGameState.npcs?.length) setNpcs(initialGameState.npcs);
      if (initialGameState.chests?.length) setChests(initialGameState.chests);
      if (initialGameState.lootPool?.length) setLootPool(initialGameState.lootPool);
      // Restore vpStats from save file — overrides stale localStorage data
      // Also zero out live session trackers so npcDamage etc don't bleed in
      if (initialGameState.dmNotes) setDmNotes(initialGameState.dmNotes);
      if (initialGameState.vpStats) {
        const restoredVp = {};
        Object.entries(initialGameState.vpStats).forEach(([pid, pdata]) => {
          restoredVp[pid] = {
            ...pdata,
            // Zero live trackers so current session starts fresh
            npcDamage: 0, pvpDamage: 0, damageTaken: 0,
            revivesUsed: 0, finalBossKill: 0, warmonger: 0,
            firstBlood: 0, itemsObtained: 0, leastDeaths: 0,
            leastDamageTaken: 0,
          };
        });
        vp.saveVpStats(restoredVp);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer, initialGameState]);

  // ── Firestore sync — GM writes full state on every change ────────────────
  // ── DM Notes — persisted in save file, not localStorage ─────────────────
  const [dmNotes, setDmNotes] = React.useState([]);

  // Use a ref so campaign turn data can be included without hoisting issues
  const campaignPlayerIdRef = React.useRef(null);
  const activePanelRef = React.useRef('players'); // tracks activePanel for use in sync hook

  useFirestoreSync({
    lobbyCode,
    isGM: isMultiplayer,
    gameState: isMultiplayer ? {
      players, currentRound, combatLog, gameMode,
      currentPlayerIndex, gameStarted, lootPool,
      playersWhoActedThisRound,
      currentCampaignPlayerId: campaignPlayerIdRef.current,
      npcs, chests,
      roundTimers:        roundTimers.timers,
      commanderTokens:    tokens.tokens,
      vpStats:            vp.vpStats,
      dmNotes,
      vpCeremonyActive:   vp.vpCeremonyActive,
      vpCeremonyFinished: vp.vpCeremonyFinished,
      vpCeremonySession:  vp.vpCeremonySession,
      // Current award card — synced so players see same card as GM in real time
      // Only send when showcase is active — null on Finish so player switches to final sheet
      vpAwardShowcase:    vp.awardShowcase ? {
        awards:      vp.awardShowcase.awards,
        index:       vp.awardShowcase.index,
        sessionName: vp.awardShowcase.sessionName,
      } : null,
    } : null,
    debounceMs: vp.vpCeremonyActive ? 0 : 800,
  });

  // ── GM: subscribe to player attack requests ───────────────────────────────
  const [pendingRequests, setPendingRequests] = React.useState({});
  React.useEffect(() => {
    if (!isMultiplayer || !lobbyCode) return;
    const unsub = subscribePendingRequests(lobbyCode, setPendingRequests);
    return () => unsub();
  }, [isMultiplayer, lobbyCode]);

  // ── Auto-process trade/gift responses outside of render ───────────────────
  // firstPassChoice with a tradeAction must be handled in a useEffect, NOT during
  // render — calling setGmTradeResult during render causes an infinite re-render loop.
  const handledTradeRefs = React.useRef(new Set());
  React.useEffect(() => {
    if (!isMultiplayer) return;
    const passChoices = Object.values(pendingRequests).filter(
      r => r?.type === 'itemChoice' && r?.itemEffect === 'passChoice' && r?.tradeAction
    );
    passChoices.forEach(req => {
      if (handledTradeRefs.current.has(req.reqId)) return;
      handledTradeRefs.current.add(req.reqId);
      handleTradeGiftResponse(req);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequests, isMultiplayer]);

  // ── GM: player-left toast ─────────────────────────────────────────────────
  const [leftToasts,     setLeftToasts]     = React.useState([]);
  const seenLeftNotices = React.useRef(new Set());
  React.useEffect(() => {
    if (!isMultiplayer || !lobbyCode) return;
    const unsub = subscribePlayerLeft(lobbyCode, (notices) => {
      Object.values(notices).forEach(n => {
        if (!n || seenLeftNotices.current.has(n.timestamp)) return;
        seenLeftNotices.current.add(n.timestamp);
        const id = n.timestamp;
        setLeftToasts(prev => [...prev, { id, playerName: n.playerName }]);
        // Mark the player as left in game state
        setPlayers(prev => prev.map(p =>
          p.uid === n.uid ? { ...p, isLeft: true, isAbsent: true } : p
        ));
        addLog(`🚪 ${n.playerName} has left the game`, 'system');
        // Auto-dismiss toast after 5s
        setTimeout(() => setLeftToasts(prev => prev.filter(t => t.id !== id)), 5000);
      });
    });
    return () => unsub();
  }, [isMultiplayer, lobbyCode]);

  // ── GM: player-rejoin toast ───────────────────────────────────────────────
  const [rejoinToasts,     setRejoinToasts]     = React.useState([]);
  const seenRejoinNotices = React.useRef(new Set());
  React.useEffect(() => {
    if (!isMultiplayer || !lobbyCode) return;
    const unsub = subscribePlayerRejoin(lobbyCode, (notices) => {
      Object.values(notices).forEach(n => {
        if (!n || seenRejoinNotices.current.has(n.timestamp)) return;
        seenRejoinNotices.current.add(n.timestamp);
        const id = n.timestamp;
        setRejoinToasts(prev => [...prev, { id, playerName: n.playerName }]);
        // Update local GM state by playerId (uid was null for absent players)
        setPlayers(prev => prev.map(p =>
          String(p.id) === String(n.playerId)
            ? { ...p, uid: n.uid, isAbsent: false, isManual: false, isLeft: false }
            : p
        ));
        addLog(`🔄 ${n.playerName} has rejoined the game`, 'system');
        setTimeout(() => setRejoinToasts(prev => prev.filter(t => t.id !== id)), 5000);
      });
    });
    return () => unsub();
  }, [isMultiplayer, lobbyCode]);

  // First pending attack request (show one at a time)
  const firstRequest = Object.values(pendingRequests).find(r => r?.type === 'attack');
  // First pending item request (shown when no attack request is pending)
  const firstItemRequest = !firstRequest ? Object.values(pendingRequests).find(r => r?.type === 'useItem') : null;
  // First pending item choice (player made their choice, GM confirms to execute)
  const firstItemChoice = (!firstRequest && !firstItemRequest)
    ? Object.values(pendingRequests).find(r => r?.type === 'itemChoice' && r?.itemEffect !== 'passChoice')
    : null;
  // First pending pass choice (player chose where to send item, GM confirms hand-off)
  const firstPassChoice = (!firstRequest && !firstItemRequest && !firstItemChoice)
    ? Object.values(pendingRequests).find(r => r?.type === 'itemChoice' && r?.itemEffect === 'passChoice')
    : null;
  // First pending end turn request
  const firstEndTurnRequest = Object.values(pendingRequests).find(r => r?.type === 'endTurn') || null;

  // Total queued requests behind whatever is currently showing
  const totalAttackQueue = Object.values(pendingRequests).filter(r => r?.type === 'attack').length;
  const totalItemQueue   = Object.values(pendingRequests).filter(r => r?.type === 'useItem').length;
  const totalChoiceQueue = Object.values(pendingRequests).filter(r => r?.type === 'itemChoice').length;
  // Combined behind-the-current count
  const queueBehindAttack = totalAttackQueue - 1 + totalItemQueue + totalChoiceQueue;
  const queueBehindItem   = totalItemQueue - 1 + totalChoiceQueue;

  // ── GM: execute an approved item choice from the player ───────────────────
  const handleExecuteItemChoice = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    // Also clear the pending choice that triggered this
    if (req.choiceId) resolvePendingChoice(lobbyCode, req.choiceId);

    const player = players.find(p => String(p.id) === String(req.playerId));
    if (!player) return;

    // Look up by id — never by index (inventory may be sorted differently than when request was sent)
    const item = req.itemId
      ? (player.inventory || []).find(it => it.id === req.itemId)
      : null;
    const effectType = req.itemEffect;

    // ── The Guy unblockable attack — player attacks target ─────────────────
    if (effectType === 'guyAttack') {
      const numRolls = req.guyNumRolls || 1;
      const dieType  = req.guyDieType  || 'd10';
      const targetLabel = req.targetName || req.targetUnitLabel || 'Target';
      const npcId = req.targetNpcId || null;

      addLog(`🎲 The Guy — ${player.playerName} rolls ${numRolls}${dieType} unblockable vs ${targetLabel}`, 'combat');

      // Open the player-direction calculator (attacker = player, target = NPC or player unit)
      // openCalculator sets up the base data, then we patch in the target and Guy-specific fields
      openCalculator(player.id, 'attack', 'commander');

      // Patch calculatorData with target and Guy-specific overrides
      // We do this via setCalculatorData which is exposed from useDamageCalculation
      const hasPlayerTarget = !!(req.targetPlayerId && req.targetUnitKey);
      const guyAttackData = {
        attackerId: player.id,
        attackerName: player.playerName,
        attackingUnitType: 'commander',
        attackerIsSquad: false,
        attackerSquadMembers: [],
        action: 'attack',
        npcs,
        // Guy-specific
        isGuyAttack: true,
        unblockable: true,
        guyNumRolls: numRolls,
        guyDieType: dieType,
        // Target — NPC path
        targetNPCId: npcId || null,
        targetNPCIds: npcId ? [npcId] : [],
        // Target — player path
        targetId: hasPlayerTarget
          ? { playerId: req.targetPlayerId, unitType: req.targetUnitKey }
          : null,
        targetSquadMembers: hasPlayerTarget
          ? [{ playerId: req.targetPlayerId, unitType: req.targetUnitKey }]
          : [],
        targetIsSquad: hasPlayerTarget,
        squadMemberHits: {},
        soloHits: 0,
      };
      setCalculatorDataDirect(guyAttackData);
      return;
    }

    // ── Own-unit targeting effects ──────────────────────────────────────────
    if (req.targetType === 'self') {
      const unitKey = req.targetUnitKey;
      const isCommander = unitKey === 'commander';
      const unitIdx = unitKey === 'special' ? 0 : parseInt((unitKey || '').replace('soldier', ''));

      if (effectType === 'heal') {
        const healAmt = item?.effect?.value || 0;
        if (isCommander) {
          const newHp = Math.min(player.commanderStats.hp + healAmt, player.commanderStats.maxHp);
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, hp: newHp } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, hp: Math.min(u.hp + healAmt, u.maxHp) } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`💚 ${player.playerName}'s ${req.targetUnitLabel} healed ${healAmt}hp`, 'combat');
      } else if (effectType === 'maxHP') {
        const boost = item?.effect?.value || 0;
        if (isCommander) {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, maxHp: player.commanderStats.maxHp + boost, hp: player.commanderStats.hp + boost } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, maxHp: u.maxHp + boost, hp: u.hp + boost } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`❤️ ${player.playerName}'s ${req.targetUnitLabel} max HP +${boost}`, 'combat');
      } else if (effectType === 'attackBonus' || effectType === 'defenseBonus') {
        const bonus = item?.effect?.value || 1;
        const effectName = effectType === 'attackBonus' ? 'attackBuff' : 'defenseBuff';
        const label = effectType === 'attackBonus' ? '⚔️↑' : '🛡️↑';
        const newEffect = { type: effectName, value: bonus, duration: item?.effect?.duration || 1 };
        if (isCommander) {
          const existing = player.commanderStats.statusEffects || [];
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...existing, newEffect] } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [...(u.statusEffects || []), newEffect] } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`${label} ${player.playerName}'s ${req.targetUnitLabel} +${bonus}`, 'combat');
      } else if (effectType === 'shieldWall') {
        const newEffect = { type: 'shieldWall', duration: 1, shieldedPlayerId: player.id };
        if (isCommander) {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...(player.commanderStats.statusEffects || []), newEffect] } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [...(u.statusEffects || []), newEffect] } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`🛡️ Shield Wall applied to ${player.playerName}'s ${req.targetUnitLabel}`, 'combat');
      } else if (effectType === 'counterStrike') {
        const newEffect = { type: 'counterStrike', duration: item?.effect?.duration || 1 };
        if (isCommander) {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...(player.commanderStats.statusEffects || []), newEffect] } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [...(u.statusEffects || []), newEffect] } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`⚡ Counter Strike applied to ${player.playerName}'s ${req.targetUnitLabel}`, 'combat');
      } else if (effectType === 'cleanse') {
        if (isCommander) {
          const effects = (player.commanderStats.statusEffects || []);
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: effects.slice(0, -1) } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: (u.statusEffects || []).slice(0, -1) } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`✨ ${player.playerName}'s ${req.targetUnitLabel} cleansed one status effect`, 'combat');
      } else if (effectType === 'fullCleanse') {
        if (isCommander) {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [] } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [] } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`✨✨ ${player.playerName}'s ${req.targetUnitLabel} fully cleansed`, 'combat');
      } else if (effectType === 'resurrect') {
        const reviveHp = 5;
        const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, hp: reviveHp, livesRemaining: Math.max(0, (u.livesRemaining ?? 0) - 1) } : u);
        updatePlayer(player.id, { subUnits: newSubs });
        addLog(`💫 ${player.playerName}'s ${req.targetUnitLabel} resurrected at ${reviveHp}hp`, 'combat');
      } else if (effectType === 'extraSlot') {
        if (isCommander) {
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, bonusSlots: (player.commanderStats.bonusSlots || 0) + 1 } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, bonusSlots: (u.bonusSlots || 0) + 1 } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`🎒 ${player.playerName}'s ${req.targetUnitLabel} gained an extra item slot`, 'items');
      }

      // Remove item after use (unless uses remaining)
      if (item) {
        const uses = item.effect?.uses ?? 1;
        const usesRemaining = item.effect?.usesRemaining ?? uses;
        if (uses === 0) {
          // unlimited — don't remove
        } else if (usesRemaining <= 1) {
          updatePlayer(player.id, { inventory: (player.inventory || []).filter(it => it.id !== item.id) });
        } else {
          const newInv = (player.inventory || []).map(it =>
            it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: usesRemaining - 1 } }
          );
          updatePlayer(player.id, { inventory: newInv });
        }
      }

      // Guy Legendary 1 — player picked an item, assign it to their chosen unit
      if (effectType === 'theGuyLegendary1' && req.guyPickedItem) {
        const pickedItem = { ...req.guyPickedItem, id: `guy_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, heldBy: req.targetUnitKey, effect: { ...req.guyPickedItem.effect, usesRemaining: req.guyPickedItem.effect?.uses ?? 1 } };
        const freshPlayer = players.find(p => String(p.id) === String(req.playerId));
        if (freshPlayer) {
          let newInv = [...(freshPlayer.inventory || [])];
          if (req.swapItemId) newInv = newInv.filter(it => it.id !== req.swapItemId);
          newInv = [...newInv, pickedItem];
          updatePlayer(req.playerId, { inventory: newInv });
          addLog(`🎲 The Guy (Legendary) — ${player.playerName} received ${pickedItem.name}`, 'items');
        }
        return;
      }
    }

    // ── Enemy targeting effects ─────────────────────────────────────────────
    if (req.targetType === 'enemy') {
      const targetPlayerId = req.targetPlayerId;
      const targetNpcId    = req.targetNpcId;
      const unitKey        = req.targetUnitKey;
      const isNPC          = !!targetNpcId;

      if (isNPC) {
        // Apply status effect directly to NPC (applyDamageToNPC doesn't support effects)
        const npc = npcs.find(n => n.id === targetNpcId);
        if (!npc) return;
        const dur = item?.effect?.duration || 2;
        const val = item?.effect?.value || item?.effect?.damagePerRound || 1;
        let statusEntry = null;
        let logMsg = '';
        if (effectType === 'poisonVial') {
          statusEntry = { type: 'poison', value: val, duration: dur, permanent: false, sourcePlayerId: player.id };
          logMsg = `🧪 ${player.playerName} poisoned ${npc.name} (${val}hp×${dur}r)`;
        } else if (effectType === 'stunGrenade') {
          statusEntry = { type: 'stun', duration: 1, permanent: false, sourcePlayerId: player.id };
          logMsg = `💣 ${player.playerName} stunned ${npc.name}`;
        } else if (effectType === 'attackDebuffItem') {
          statusEntry = { type: 'attackDebuff', value: item?.effect?.debuffValue || 1, duration: dur, permanent: false, sourcePlayerId: player.id };
          logMsg = `⚔️↓ ${player.playerName} debuffed ${npc.name}'s attack`;
        } else if (effectType === 'defenseDebuffItem') {
          statusEntry = { type: 'defenseDebuff', value: item?.effect?.debuffValue || 1, duration: dur, permanent: false, sourcePlayerId: player.id };
          logMsg = `🛡️↓ ${player.playerName} debuffed ${npc.name}'s defense`;
        } else if (effectType === 'marked') {
          statusEntry = { type: 'marked', duration: 1, permanent: false, sourcePlayerId: player.id };
          logMsg = `🎯 ${player.playerName} marked ${npc.name}`;
        }
        if (!statusEntry) return;
        setNpcs(prev => prev.map(n => n.id === targetNpcId ? { ...n, statusEffects: [...(n.statusEffects || []), statusEntry] } : n));
        addLog(logMsg, 'combat');
      } else {
        // Apply to enemy player unit
        const targetPlayer = players.find(p => String(p.id) === String(targetPlayerId));
        if (!targetPlayer) return;
        const isCommander = unitKey === 'commander';
        const unitIdx = unitKey === 'special' ? 0 : parseInt((unitKey || '').replace('soldier', ''));
        const dur = item?.effect?.duration || 2;
        const val = item?.effect?.value || item?.effect?.damagePerRound || 1;
        const newEffect = (() => {
          if (effectType === 'poisonVial')        return { type: 'poison',       value: val,                          duration: dur };
          if (effectType === 'stunGrenade')        return { type: 'stun',                                              duration: 1   };
          if (effectType === 'attackDebuffItem')   return { type: 'attackDebuff', value: item?.effect?.debuffValue || 1, duration: dur };
          if (effectType === 'defenseDebuffItem')  return { type: 'defenseDebuff',value: item?.effect?.debuffValue || 1, duration: dur };
          if (effectType === 'marked')             return { type: 'marked',                                            duration: 1   };
          return null;
        })();
        if (!newEffect) return;
        if (isCommander) {
          updatePlayer(targetPlayerId, { commanderStats: { ...targetPlayer.commanderStats, statusEffects: [...(targetPlayer.commanderStats.statusEffects || []), newEffect] } });
        } else {
          const newSubs = (targetPlayer.subUnits || []).map((u, i) => i === unitIdx ? { ...u, statusEffects: [...(u.statusEffects || []), newEffect] } : u);
          updatePlayer(targetPlayerId, { subUnits: newSubs });
        }
        const effectLabels = { poisonVial: '🧪 Poisoned', stunGrenade: '💣 Stunned', attackDebuffItem: '⚔️↓ Attack Debuffed', defenseDebuffItem: '🛡️↓ Defense Debuffed', marked: '🎯 Marked' };
        addLog(`${effectLabels[effectType] || effectType}: ${player.playerName} → ${targetPlayer.playerName}'s ${req.targetUnitLabel}`, 'combat');
      }

      // Remove item after use
      if (item) {
        updatePlayer(player.id, { inventory: (player.inventory || []).filter(it => it.id !== item.id) });
      }
    }

    // ── Destroy Item ────────────────────────────────────────────────────────
    if (req.targetType === 'destroyItem') {
      const targetPlayer = players.find(p => String(p.id) === String(req.targetPlayerId));
      if (!targetPlayer) return;
      const newInv = (targetPlayer.inventory || []).filter(it => it.id !== req.destroyItemId);
      updatePlayer(req.targetPlayerId, { inventory: newInv });

      // Notify the targeted player
      const noticeId = `destroyed_${Date.now()}`;
      writePendingChoice(lobbyCode, noticeId, {
        choiceId: noticeId,
        type: 'destroyNotice',
        targetPlayerUid: targetPlayer.uid,
        targetPlayerId:  targetPlayer.id,
        destroyedItemName: req.destroyedItemName,
        byPlayerName:    player.playerName,
        timestamp: Date.now(),
      });
      setTimeout(() => resolvePendingChoice(lobbyCode, noticeId), 6000);

      // Remove destroyer's item too
      if (item) updatePlayer(player.id, { inventory: (player.inventory || []).filter(it => it.id !== item.id) });
      addLog(`💥 ${player.playerName} destroyed ${targetPlayer.playerName}'s "${req.destroyedItemName}"`, 'items');
      if (item) setLastItemPlayed({ item, sourcePlayerId: player.id });
    }
    // Track last item played for Mirror — covers self, enemy, and destroy paths
    if (item && req.targetType !== 'destroyItem') setLastItemPlayed({ item, sourcePlayerId: player.id });
  };

  const handleExecutePassChoice = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    if (req.choiceId) resolvePendingChoice(lobbyCode, req.choiceId);

    const freshSource = players.find(p => String(p.id) === String(req.playerId));
    const freshTarget = players.find(p => String(p.id) === String(req.passTargetPlayerId));
    if (!freshSource || !freshTarget) return;

    const item = req.itemId ? (freshSource.inventory || []).find(it => it.id === req.itemId) : null;
    if (!item) return;

    const sourceUnitLabel = loot.unitNameByType(freshSource, item.heldBy);
    const targetUnitLabel = loot.unitNameByType(freshTarget, req.passTargetUnitType);

    if (req.passMode === 'give') {
      // ── GIVE: remove item from source, send giftNotice to target so they place it ──
      const newSourceInv = (freshSource.inventory || []).filter(it => it.id !== item.id);
      updatePlayer(freshSource.id, { inventory: newSourceInv });

      // Write giftNotice to the target player
      const noticeId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      writePendingChoice(lobbyCode, noticeId, {
        choiceId:              noticeId,
        type:                  'giftNotice',
        targetPlayerUid:       freshTarget.uid,
        targetPlayerId:        freshTarget.id,
        initiatorPlayerName:   freshSource.playerName,
        initiatorPlayerId:     freshSource.id,
        offeredItemId:         item.id,
        offeredItemName:       item.name,
        offeredItemTier:       item.tier,
        offeredItemDescription: item.description,
        offeredItemEffect:     item.effect,
        offeredItemHeldBy:     req.passTargetUnitType,
        timestamp:             Date.now(),
      });
      addLog(`🎁 ${freshSource.playerName}'s ${sourceUnitLabel} gave "${item.name}" to ${freshTarget.playerName} — awaiting placement`, 'items');

    } else if (req.passMode === 'trade') {
      // ── TRADE INITIATION: send tradeRequest to target player ──
      const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      writePendingChoice(lobbyCode, tradeId, {
        choiceId:              tradeId,
        type:                  'tradeRequest',
        targetPlayerUid:       freshTarget.uid,
        targetPlayerId:        freshTarget.id,
        initiatorPlayerName:   freshSource.playerName,
        initiatorPlayerId:     freshSource.id,
        initiatorPlayerUid:    freshSource.uid,
        initiatorUnitType:     item.heldBy,
        offeredItemId:         item.id,
        offeredItemName:       item.name,
        offeredItemTier:       item.tier,
        offeredItemDescription: item.description,
        offeredItemIsQuest:    item.isQuestItem || false,
        targetUnitType:        req.passTargetUnitType,
        timestamp:             Date.now(),
      });
      addLog(`⇄ ${freshSource.playerName} initiated a trade with ${freshTarget.playerName} — awaiting response`, 'items');
    }
  };

  // ── Handle trade/gift responses that come back as itemChoice pending requests ──
  const handleTradeGiftResponse = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    if (req.choiceId) resolvePendingChoice(lobbyCode, req.choiceId);

    const action = req.tradeAction;

    // ── Gift placed: target chose a unit — execute immediately, no GM window needed ──
    if (action === 'giftPlaced') {
      const freshTarget = players.find(p => String(p.id) === String(req.playerId));
      if (!freshTarget) return;
      let newInv = [...(freshTarget.inventory || [])];
      if (req.swapItemId) newInv = newInv.filter(it => it.id !== req.swapItemId);
      // Look up item across all players — source already removed it on approve
      let giftItem = null;
      players.forEach(p => { const f = (p.inventory || []).find(it => it.id === req.itemId); if (f) giftItem = f; });
      if (!giftItem) {
        giftItem = { id: req.itemId, name: req.itemName, tier: req.itemTier || 'Common', heldBy: req.passTargetUnitType, effect: req.offeredItemEffect || { type: 'manual', uses: 1, usesRemaining: 1 }, description: req.offeredItemDescription || '', isQuestItem: false };
      }
      newInv = [...newInv, { ...giftItem, heldBy: req.passTargetUnitType }];
      updatePlayer(freshTarget.id, { inventory: newInv });
      const unitLabel = loot.unitNameByType(freshTarget, req.passTargetUnitType);
      addLog(`🎁 ${freshTarget.playerName}'s ${unitLabel} received "${req.itemName}"`, 'items');
      return;
    }

    // ── Trade: target offered an item back ──
    if (action === 'offer') {
      const initiator = players.find(p => String(p.id) === String(req.passTargetPlayerId));
      const target    = players.find(p => String(p.id) === String(req.playerId));
      if (!initiator || !target) return;
      const counterItem = (target.inventory || []).find(it => it.id === req.passTradeItemId);
      // Send tradeReview to initiator (player1)
      const reviewId = `tradereview_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      writePendingChoice(lobbyCode, reviewId, {
        choiceId:              reviewId,
        type:                  'tradeReview',
        targetPlayerUid:       req.passTargetPlayerUid || initiator.uid,  // ← player1.uid (who sees this)
        targetPlayerId:        initiator.id,
        initiatorPlayerName:   initiator.playerName,
        targetPlayerName:      target.playerName,
        targetPlayerId2:       target.id,       // player2's id (for accept to find them)
        targetPlayerUid2:      target.uid,      // player2's uid (renamed — NOT targetPlayerUid to avoid overwrite)
        targetUnitType:        req.passTargetUnitType,
        myItemId:              req.itemId,
        myItemName:            req.itemName,
        myItemTier:            req.itemTier,
        counterItemId:         counterItem?.id,
        counterItemName:       counterItem?.name,
        counterItemTier:       counterItem?.tier,
        counterItemDescription: counterItem?.description,
        timestamp:             Date.now(),
      });
      addLog(`⇄ ${target.playerName} offered "${counterItem?.name || 'an item'}" in return — awaiting ${initiator.playerName}'s decision`, 'items');
      return;
    }

    // ── Trade: target denied — notify initiator, no GM window needed ──
    if (action === 'deny') {
      const initiator = players.find(p => String(p.id) === String(req.passTargetPlayerId));
      const target    = players.find(p => String(p.id) === String(req.playerId));
      if (!initiator) return;
      const resultId = `result_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      writePendingChoice(lobbyCode, resultId, {
        choiceId:        resultId,
        type:            'tradeResult',
        targetPlayerUid: req.passTargetPlayerUid || initiator.uid,
        resultIcon:      '❌',
        resultTitle:     'Trade Denied',
        resultMessage:   `${target?.playerName || 'The other player'} declined your trade offer.`,
        timestamp:       Date.now(),
      });
      addLog(`❌ ${target?.playerName || 'Player'} denied the trade with ${initiator.playerName}`, 'items');
      return;
    }

    // ── Trade: initiator accepted — show GM final confirmation window ──
    if (action === 'accept') {
      const freshSource = players.find(p => String(p.id) === String(req.playerId));           // player1 (initiator)
      const freshTarget = players.find(p => String(p.id) === String(req.passTargetPlayerId)); // player2 (target)
      if (!freshSource || !freshTarget) return;
      const myItem    = (freshSource.inventory || []).find(it => it.id === req.itemId);
      const theirItem = (freshTarget.inventory || []).find(it => it.id === req.passTradeItemId);
      if (!myItem || !theirItem) return;
      setGmTradeResult({
        outcome:    'accepted',
        p1Name:     freshSource.playerName, p1Item: myItem.name,    p1ItemId: myItem.id,    p1Id: freshSource.id,
        p2Name:     freshTarget.playerName, p2Item: theirItem.name, p2ItemId: theirItem.id, p2Id: freshTarget.id,
        // Each item keeps its current heldBy — the traded item lands on the same unit slot
        p1HeldBy:   myItem.heldBy,     // unit on player1 that receives theirItem
        p2HeldBy:   theirItem.heldBy,  // unit on player2 that receives myItem
        execReq:    req,
      });
      return;
    }

    // ── Trade: initiator countered (bounce trade request back to target) ──
    if (action === 'counter') {
      const initiator = players.find(p => String(p.id) === String(req.playerId));
      const target    = players.find(p => String(p.id) === String(req.passTargetPlayerId));
      if (!initiator || !target) return;
      const myItem = (initiator.inventory || []).find(it => it.id === req.itemId);
      if (!myItem) return;
      const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      writePendingChoice(lobbyCode, tradeId, {
        choiceId:              tradeId,
        type:                  'tradeRequest',
        targetPlayerUid:       req.passTargetPlayerUid || target.uid,
        targetPlayerId:        target.id,
        initiatorPlayerName:   initiator.playerName,
        initiatorPlayerId:     initiator.id,
        initiatorPlayerUid:    initiator.uid,
        initiatorUnitType:     myItem.heldBy,
        offeredItemId:         myItem.id,
        offeredItemName:       myItem.name,
        offeredItemTier:       myItem.tier,
        offeredItemDescription: myItem.description,
        targetUnitType:        req.passTargetUnitType,
        isCounter:             true,
        timestamp:             Date.now(),
      });
      addLog(`🔄 ${initiator.playerName} countered — trade sent back to ${target.playerName}`, 'items');
      return;
    }

    // ── Trade: initiator denied/cancelled — notify target, no GM window needed ──
    if (action === 'cancel') {
      const initiator = players.find(p => String(p.id) === String(req.playerId));
      const target    = players.find(p => String(p.id) === String(req.passTargetPlayerId));
      if (target?.uid) {
        const resultId = `result_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        writePendingChoice(lobbyCode, resultId, {
          choiceId:        resultId,
          type:            'tradeResult',
          targetPlayerUid: req.passTargetPlayerUid || target.uid,
          resultIcon:      '❌',
          resultTitle:     'Trade Cancelled',
          resultMessage:   `${initiator?.playerName || 'The other player'} declined the trade.`,
          timestamp:       Date.now(),
        });
      }
      addLog(`❌ Trade cancelled by ${initiator?.playerName || 'player'}`, 'items');
      return;
    }
  };

  const handleApproveRequest = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    const attacker = players.find(p => String(p.id) === String(req.playerId));
    if (!attacker) return;

    // Build target data from the request
    const isNPCTarget    = req.targetType === 'npc';
    const targetNPCId    = isNPCTarget ? req.targetId : null;
    const targetPlayerId = !isNPCTarget ? req.targetId : null;

    // Build target squad members for DamageDistribution
    // NPC target: use existing targetNPCIds path
    // Player target with specific units: build from targetUnitKeys
    // Player target without units (legacy): target the whole player (commander)
    let targetSquadMembers = [];
    if (isNPCTarget) {
      const targetNPC = npcs.find(n => n.id === req.targetId);
      if (targetNPC) {
        targetSquadMembers = [{ isNPC: true, npcId: targetNPC.id, name: targetNPC.name }];
      }
    } else if (Array.isArray(req.targetUnitKeys) && req.targetUnitKeys.length > 0) {
      // New flow: player selected specific units
      req.targetUnitKeys.forEach((unitKey, i) => {
        targetSquadMembers.push({
          isNPC: false,
          playerId: req.targetId,
          unitType: unitKey,
          name: req.targetUnitLabels?.[i] || unitKey,
        });
      });
    } else {
      // Legacy fallback: just the commander
      targetSquadMembers = [{
        isNPC: false,
        playerId: req.targetId,
        unitType: 'commander',
        name: req.targetName,
      }];
    }
    // (calculator counts initiator separately via attackingUnitType)
    const isSquad = req.isSquadAttack && Array.isArray(req.squadUnits) && req.squadUnits.length > 0;
    const squadMembers = isSquad
      ? req.squadUnits.filter(k => k !== req.unitKey)
      : [];
    const squadMemberHits = {};
    if (isSquad) {
      // Initiator gets a hits entry too
      squadMemberHits[req.unitKey] = 0;
      squadMembers.forEach(uKey => { squadMemberHits[uKey] = 0; });
    }

    // openCalculator sets showCalculator + seeds basic data, then we override with full pre-fill
    openCalculator(req.playerId, req.action, req.unitKey);
    // Override with fully pre-filled data (target, squad) — runs synchronously after openCalculator
    setCalculatorData({
      attackerId:           req.playerId,
      attackerName:         attacker.playerName,
      attackingUnitType:    req.unitKey,
      attackerIsSquad:      isSquad,
      attackerSquadMembers: squadMembers,
      squadMemberHits,
      action:               req.action,
      // Pre-fill NPC target
      targetNPCId,
      targetNPCIds:         targetNPCId ? [targetNPCId] : [],
      // Pre-fill player target
      // Always use the targetSquadMembers path for player targets —
      // setting targetId with no unitType causes a crash in CalculatorD20
      targetId:             null,
      targetIsSquad:        targetSquadMembers.length > 0,
      targetSquadMembers,
      soloHits:             0,
      npcs,
    });
  };

  const handleDenyRequest = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    // Write a brief "denied" notice the player can detect
    import('../services/gameStateService').then(({ writePendingRequest }) => {
      const noticeId = `deny_${req.reqId}`;
      writePendingRequest(lobbyCode, noticeId, {
        type: 'denied',
        reqId: noticeId,
        targetPlayerId: req.playerId,
        timestamp: Date.now(),
      });
      // Auto-clear after 4 seconds
      setTimeout(() => resolvePendingRequest(lobbyCode, noticeId), 4000);
    });
  };

  // Effect types that require the player to make a choice before GM executes
  const PLAYER_CHOICE_EFFECTS = [
    // Enemy targeting
    'poisonVial', 'stunGrenade', 'attackDebuffItem', 'defenseDebuffItem', 'marked', 'destroyItem',
    // Own unit targeting
    'heal', 'maxHP', 'shieldWall', 'counterStrike',
    'cleanse', 'fullCleanse', 'resurrect', 'extraSlot',
  ];

  const handleApproveItemRequest = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    const player = players.find(p => String(p.id) === String(req.playerId));
    if (!player) return;

    // Auto-execute simple destructive actions — no choice needed
    if (req.action === 'drop' || req.action === 'useKey') {
      if (item) updatePlayer(player.id, { inventory: (player.inventory || []).filter(it => it.id !== item.id) });
      return;
    }

    // The Guy — open specialized DM confirm modal
    if (req.action === 'use' && req.itemEffect === 'theGuy') {
      setGuyTargetUnit(null);
      setGuyConfirmModal({ req, player });
      return;
    }

    // attackBonus / defenseBonus — auto-execute, no player picker needed
    // Sets pending bonus on the player; calculator picks it up on next roll
    if (req.action === 'use' && (req.itemEffect === 'attackBonus' || req.itemEffect === 'defenseBonus')) {
      const item = req.itemId ? (player.inventory || []).find(it => it.id === req.itemId) : null;
      if (item) {
        const bonusKey = req.itemEffect === 'attackBonus' ? 'pendingAttackBonus' : 'pendingDefenseBonus';
        const val = item.effect?.value || 1;
        const label = req.itemEffect === 'attackBonus' ? '⚔️↑' : '🛡️↑';
        // Consume item
        const uses = item.effect?.uses ?? 1;
        const usesRemaining = item.effect?.usesRemaining ?? uses;
        let newInv;
        if (uses === 0) {
          newInv = player.inventory; // unlimited
        } else if (usesRemaining <= 1) {
          newInv = (player.inventory || []).filter(it => it.id !== item.id);
        } else {
          newInv = (player.inventory || []).map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: usesRemaining - 1 } });
        }
        updatePlayer(player.id, { [bonusKey]: (player[bonusKey] || 0) + val, inventory: newInv });
        setLastItemPlayed({ item, sourcePlayerId: player.id });
        addLog(`${label} ${player.playerName} primed +${val} ${req.itemEffect === 'attackBonus' ? 'attack' : 'defense'} bonus — applies on next roll`, 'items');
      }
      return;
    }

    // For 'use' — check if this effect needs a player-side choice
    if (req.action === 'use' && PLAYER_CHOICE_EFFECTS.includes(req.itemEffect)) {
      const choiceId = `choice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      writePendingChoice(lobbyCode, choiceId, {
        choiceId,
        targetPlayerUid: player.uid,
        targetPlayerId:  player.id,
        playerName:      player.playerName,
        itemId:          req.itemId,
        itemName:        req.itemName,
        itemEffect:      req.itemEffect,
        // Pass full game context the player needs to make their choice
        allPlayers:      players.map(p => ({
          id: p.id, uid: p.uid, playerName: p.playerName, playerColor: p.playerColor,
          commanderStats: p.commanderStats,
          subUnits: p.subUnits,
          inventory: p.inventory,
          commander: p.commander,
        })),
        npcs: npcs.filter(n => n.active && !n.isDead).map(n => ({ id: n.id, name: n.name, hp: n.hp, maxHp: n.maxHp })),
        timestamp: Date.now(),
      });
      return;
    }

    // 'pass' — send the player a picker so they choose target player + unit
    if (req.action === 'pass') {
      const choiceId = `passchoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      writePendingChoice(lobbyCode, choiceId, {
        choiceId,
        type:            'passChoice',
        targetPlayerUid: player.uid,
        targetPlayerId:  player.id,
        playerName:      player.playerName,
        itemId:          req.itemId,
        itemName:        req.itemName,
        itemEffect:      req.itemEffect,
        timestamp:       Date.now(),
      });
      return;
    }

    // ── 'use' with no-target / global effects — auto-execute on approval ───
    if (req.action === 'use') {
      const item = req.itemId
        ? (player.inventory || []).find(it => it.id === req.itemId)
        : null;
      const ef   = item?.effect;
      if (!ef) return;

      const dmgPerRound = ef.damagePerRound || 2;
      const duration    = ef.duration || 3;

      const consumeItem = () => {
        // Always track this as the last-played item (for Mirror to copy)
        setLastItemPlayed({ item, sourcePlayerId: player.id });
        // Re-read fresh player inventory to avoid stale closure
        const fresh = players.find(p => String(p.id) === String(req.playerId));
        if (!fresh) return;
        const uses          = ef.uses ?? 1;
        const usesRemaining = ef.usesRemaining ?? uses;
        if (uses === 0) return; // unlimited — keep in inventory, tracking already done above
        if (usesRemaining <= 1) {
          updatePlayer(player.id, { inventory: (fresh.inventory || []).filter(it => it.id !== item.id) });
        } else {
          const newInv = (fresh.inventory || []).map(it =>
            it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: usesRemaining - 1 } }
          );
          updatePlayer(player.id, { inventory: newInv });
        }
      };

      if (ef.type === 'npcPlague') {
        const poisonEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false, sourcePlayerId: player.id };
        setNpcs(prev => prev.map(n =>
          n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), poisonEntry] } : n
        ));
        consumeItem();
        addLog(`☠️ ${player.playerName} unleashed NPC Plague! All active NPCs are poisoned (${dmgPerRound}hp×${duration}r).`, 'items');
        return;
      }

      if (ef.type === 'playerPlague') {
        const poisonEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false };
        players.forEach(p => {
          if (String(p.id) === String(player.id)) return;
          const newCmdStats = { ...p.commanderStats, statusEffects: [...(p.commanderStats.statusEffects || []), poisonEntry] };
          const newSubs     = (p.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), poisonEntry] } : u);
          updatePlayer(p.id, { commanderStats: newCmdStats, subUnits: newSubs });
        });
        consumeItem();
        addLog(`☠️ ${player.playerName} unleashed Player Plague! All enemy units are poisoned (${dmgPerRound}hp×${duration}r).`, 'items');
        return;
      }

      if (ef.type === 'crownsFavor') {
        const buffDuration = ef.duration || 1;
        const buffEntry    = { type: 'attackBuff', value: 1, duration: buffDuration, permanent: false };
        const freshSrc     = players.find(p => String(p.id) === String(player.id));
        if (freshSrc) {
          const newCmdStats = { ...freshSrc.commanderStats, statusEffects: [...(freshSrc.commanderStats.statusEffects || []), buffEntry] };
          const newSubs     = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), buffEntry] } : u);
          updatePlayer(freshSrc.id, { commanderStats: newCmdStats, subUnits: newSubs });
        }
        consumeItem();
        addLog(`👑 Crown's Favor! ${player.playerName}'s faction gains +1 to all rolls for ${buffDuration} round(s).`, 'items');
        return;
      }

      if (ef.type === 'nullify') {
        const lastEf = lastItemPlayed?.item?.effect;
        const effectTypeToRemove = lastEf ? ({
          poisonVial: 'poison', npcPlague: 'poison', playerPlague: 'poison',
          stunGrenade: 'stun', attackDebuffItem: 'attackDebuff',
          defenseDebuffItem: 'defenseDebuff', marked: 'marked',
          shieldWall: 'shieldWall', counterStrike: 'counterStrike',
          attackBonus: 'attackBuff', crownsFavor: 'attackBuff',
          defenseBonus: 'defenseBuff',
        }[lastEf.type] || null) : null;
        const removeLastEffect = (effects) => {
          if (effectTypeToRemove) {
            const idx = [...effects].reverse().findIndex(e => e.type === effectTypeToRemove);
            if (idx !== -1) return effects.filter((_, i) => i !== effects.length - 1 - idx);
          }
          return effects.length > 0 ? effects.slice(0, -1) : [];
        };
        const freshSrc = players.find(p => String(p.id) === String(player.id));
        if (freshSrc) {
          const newCmdStats = { ...freshSrc.commanderStats, statusEffects: removeLastEffect(freshSrc.commanderStats.statusEffects || []) };
          const newSubs     = (freshSrc.subUnits || []).map(u => ({ ...u, statusEffects: removeLastEffect(u.statusEffects || []) }));
          updatePlayer(freshSrc.id, { commanderStats: newCmdStats, subUnits: newSubs });
        }
        consumeItem();
        const label = effectTypeToRemove ? (lastItemPlayed?.item?.name || 'last effect') : 'last effect';
        addLog(`🚫 ${player.playerName} used Nullify — ${label} removed from all own units!`, 'items');
        return;
      }

      if (ef.type === 'mirror') {
        if (!lastItemPlayed) {
          addLog(`🪞 Mirror failed — no item has been played yet.`, 'items');
          consumeItem();
          return;
        }
        const { item: mirroredItem } = lastItemPlayed;
        const mef = mirroredItem.effect;
        if (mef?.type === 'mirror' || mef?.type === 'nullify') {
          addLog(`🪞 Mirror cannot copy Mirror or Nullify.`, 'items');
          consumeItem();
          return;
        }
        const enemyTargetTypes = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'];
        const globalTypes      = ['npcPlague','playerPlague','crownsFavor'];
        const selfTypes        = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'];
        if (enemyTargetTypes.includes(mef?.type)) {
          // Need a target — open enemy picker with the mirrored item
          setEnemyItemModal({ sourcePlayer: player, item: { ...mirroredItem, id: `mirror_${Date.now()}` }, isMirror: true, originalItemId: item.id, mirrorSourcePlayerId: player.id });
          setEnemyTargetMode(null);
          updatePlayer(player.id, { inventory: (player.inventory || []).filter(it => it.id !== item.id) });
          setLastItemPlayed({ item, sourcePlayerId: player.id });
        } else if (globalTypes.includes(mef?.type)) {
          const mDmg = mef.damagePerRound || 2;
          const mDur = mef.duration || 3;
          const poisonEntry = { type: 'poison', value: mDmg, duration: mDur, permanent: false };
          if (mef.type === 'npcPlague') {
            setNpcs(prev => prev.map(n => n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), poisonEntry] } : n));
            addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — all active NPCs poisoned (${mDmg}hp×${mDur}r)!`, 'items');
          } else if (mef.type === 'playerPlague') {
            players.forEach(p => {
              if (String(p.id) === String(player.id)) return;
              const newCmd  = { ...p.commanderStats, statusEffects: [...(p.commanderStats.statusEffects || []), poisonEntry] };
              const newSubs = (p.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), poisonEntry] } : u);
              updatePlayer(p.id, { commanderStats: newCmd, subUnits: newSubs });
            });
            addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — all enemy units poisoned (${mDmg}hp×${mDur}r)!`, 'items');
          } else if (mef.type === 'crownsFavor') {
            const mBufDur = mef.duration || 1;
            const buffEntry = { type: 'attackBuff', value: 1, duration: mBufDur, permanent: false };
            const freshSrc  = players.find(p => String(p.id) === String(player.id));
            if (freshSrc) {
              const newCmd  = { ...freshSrc.commanderStats, statusEffects: [...(freshSrc.commanderStats.statusEffects || []), buffEntry] };
              const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), buffEntry] } : u);
              updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
            }
            addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — faction gains +1 to all rolls for ${mBufDur} round(s)!`, 'items');
          }
          consumeItem();
        } else if (selfTypes.includes(mef?.type)) {
          const freshSrc = players.find(p => String(p.id) === String(player.id));
          if (freshSrc) {
            const mDuration2 = mef.duration || 1;
            const addEff = (effects, entry) => [...(effects || []), entry];
            if (mef.type === 'shieldWall') {
              const entry   = { type: 'shieldWall', shieldedPlayerId: player.id, duration: mDuration2, permanent: false };
              const newCmd  = { ...freshSrc.commanderStats, statusEffects: addEff(freshSrc.commanderStats.statusEffects, entry) };
              const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: addEff(u.statusEffects, entry) } : u);
              updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
              addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — Shield Wall active!`, 'items');
            } else if (mef.type === 'counterStrike') {
              const entry   = { type: 'counterStrike', duration: mDuration2, permanent: false };
              const newCmd  = { ...freshSrc.commanderStats, statusEffects: addEff(freshSrc.commanderStats.statusEffects, entry) };
              const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: addEff(u.statusEffects, entry) } : u);
              updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
              addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — Counter Strike active!`, 'items');
            } else {
              // cleanse, fullCleanse, resurrect need a unit choice — log it for the DM
              addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}" — select a unit on their card.`, 'items');
            }
          }
          consumeItem();
        } else {
          consumeItem();
          addLog(`🪞 ${player.playerName} mirrored "${mirroredItem.name}"!`, 'items');
        }
        return;
      }

      // 'manual' and any unrecognised effect — just consume the item, DM narrates the effect
      if (ef.type === 'manual' || ef.type === 'none') {
        consumeItem();
        addLog(`✦ ${player.playerName} used "${req.itemName}".`, 'items');
        return;
      }
    }
  };

  // ── The Guy — execute the rolled outcome ──────────────────────────────────
  const handleExecuteGuy = (req, player, extraData = {}) => {
    const { guyRoll, itemTier } = req;
    const tier = itemTier || 'Common';

    // Remove the item from inventory first (one-time use) — look up by id
    const removeItem = (p) => {
      if (!req.itemId) return;
      updatePlayer(p.id, { inventory: (p.inventory || []).filter(it => it.id !== req.itemId) });
    };

    if (tier === 'Common') {
      if (guyRoll === 1) {
        // +2 attack buff on commander (consumed on next calculator roll)
        const newEffect = { type: 'attackBuff', value: 2, duration: 1, permanent: false };
        const existing = player.commanderStats.statusEffects || [];
        updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...existing, newEffect] } });
        addLog(`🎲 The Guy (Common) — ${player.playerName} gets +2 to next attack roll`, 'combat');
        removeItem(player);
      } else if (guyRoll === 2) {
        // Heal 2HP — DM picks unit via guyUnitTarget passed in extraData
        const { targetUnitKey, targetUnitLabel } = extraData;
        if (!targetUnitKey) return; // needs unit selection first
        const isCommander = targetUnitKey === 'commander';
        const unitIdx = targetUnitKey === 'special' ? 0 : parseInt((targetUnitKey || '').replace('soldier', ''));
        if (isCommander) {
          const newHp = Math.min(player.commanderStats.hp + 2, player.commanderStats.maxHp);
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, hp: newHp } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, hp: Math.min(u.hp + 2, u.maxHp) } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`🎲 The Guy (Common) — healed ${player.playerName}'s ${targetUnitLabel} 2hp`, 'combat');
        removeItem(player);
      } else if (guyRoll === 3) {
        // Send player a target picker — they choose NPC or player unit, then DM gets calculator
        addLog(`🎲 The Guy (Common) — ${player.playerName} picks a target for 1d10 unblockable damage`, 'combat');
        removeItem(player);
        setGuyConfirmModal(null);
        const choiceId = `choice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        writePendingChoice(lobbyCode, choiceId, {
          choiceId, type: 'guyTargetPick',
          targetPlayerUid: player.uid,
          targetPlayerId: player.id,
          playerName: player.playerName,
          dice: '1d10', numRolls: 1, dieType: 'd10',
          timestamp: Date.now(),
        });
        return;
      } else if (guyRoll === 4) {
        // Cleanse squad units of poison, burn, stun
        const cleansedSubs = (player.subUnits || []).map(u => ({
          ...u,
          statusEffects: (u.statusEffects || []).filter(ef => !['poison','burn','stun'].includes(ef.type)),
        }));
        updatePlayer(player.id, { subUnits: cleansedSubs });
        addLog(`🎲 The Guy (Common) — ${player.playerName}'s squad cleansed of poison, burn & stun`, 'combat');
        removeItem(player);
      }
    } else if (tier === 'Rare') {
      if (guyRoll === 1) {
        // Heal 5HP — needs unit selection
        const { targetUnitKey, targetUnitLabel } = extraData;
        if (!targetUnitKey) return;
        const isCommander = targetUnitKey === 'commander';
        const unitIdx = targetUnitKey === 'special' ? 0 : parseInt((targetUnitKey || '').replace('soldier', ''));
        if (isCommander) {
          const newHp = Math.min(player.commanderStats.hp + 5, player.commanderStats.maxHp);
          updatePlayer(player.id, { commanderStats: { ...player.commanderStats, hp: newHp } });
        } else {
          const newSubs = (player.subUnits || []).map((u, i) => i === unitIdx ? { ...u, hp: Math.min(u.hp + 5, u.maxHp) } : u);
          updatePlayer(player.id, { subUnits: newSubs });
        }
        addLog(`🎲 The Guy (Rare) — healed ${player.playerName}'s ${targetUnitLabel} 5hp`, 'combat');
        removeItem(player);
      } else if (guyRoll === 2) {
        // Extra 10" movement — visual status badge on commander, DM removes manually
        const newEffect = { type: 'movementBoost', value: 10, duration: 999, permanent: true };
        const existing = player.commanderStats.statusEffects || [];
        updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...existing, newEffect] } });
        addLog(`🎲 The Guy (Rare) — ${player.playerName} gets +10″ movement`, 'combat');
        removeItem(player);
      } else if (guyRoll === 3) {
        // Send player a target picker — they choose NPC or player unit, then DM gets calculator
        addLog(`🎲 The Guy (Rare) — ${player.playerName} picks a target for 2d10 unblockable damage`, 'combat');
        removeItem(player);
        setGuyConfirmModal(null);
        const choiceId = `choice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        writePendingChoice(lobbyCode, choiceId, {
          choiceId, type: 'guyTargetPick',
          targetPlayerUid: player.uid,
          targetPlayerId: player.id,
          playerName: player.playerName,
          dice: '2d10', numRolls: 2, dieType: 'd10',
          timestamp: Date.now(),
        });
        return;
      } else if (guyRoll === 4) {
        // +5 defense buff on commander
        const newEffect = { type: 'defenseBuff', value: 5, duration: 1, permanent: false };
        const existing = player.commanderStats.statusEffects || [];
        updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...existing, newEffect] } });
        addLog(`🎲 The Guy (Rare) — ${player.playerName} gets +5 to next defense roll`, 'combat');
        removeItem(player);
      }
    } else if (tier === 'Legendary') {
      if (guyRoll === 1) {
        // Send player a loot picker (Common + Rare items from pool)
        removeItem(player);
        const choiceId = `choice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        writePendingChoice(lobbyCode, choiceId, {
          choiceId,
          type: 'guyItemPick',
          targetPlayerUid: player.uid,
          targetPlayerId: player.id,
          playerName: player.playerName,
          lootPool: lootPool.filter(it => ['Common','Rare'].includes(it.tier)),
          timestamp: Date.now(),
        });
        addLog(`🎲 The Guy (Legendary) — ${player.playerName} picks a Common or Rare item`, 'items');
      } else if (guyRoll === 2) {
        // Poison all NPCs (npcPlague)
        const poisonEntry = { type: 'poison', value: 2, duration: 2, permanent: false, sourcePlayerId: player.id };
        setNpcs(prev => prev.map(n => n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), poisonEntry] } : n));
        addLog(`🎲 The Guy (Legendary) — ${player.playerName} poisoned all NPCs`, 'combat');
        removeItem(player);
      } else if (guyRoll === 3) {
        // Close Call — absorb next damage instance
        const newEffect = { type: 'closeCall', duration: 999, permanent: true };
        const existing = player.commanderStats.statusEffects || [];
        updatePlayer(player.id, { commanderStats: { ...player.commanderStats, statusEffects: [...existing, newEffect] } });
        addLog(`🎲 The Guy (Legendary) — ${player.playerName} will absorb their next hit`, 'combat');
        removeItem(player);
      } else if (guyRoll === 4) {
        // Revive — needs unit selection from extraData
        const { targetUnitKey, targetUnitLabel } = extraData;
        if (!targetUnitKey) return;
        const unitIdx = targetUnitKey === 'special' ? 0 : parseInt((targetUnitKey || '').replace('soldier', ''));
        const newSubs = (player.subUnits || []).map((u, i) => {
          if (i !== unitIdx) return u;
          return { ...u, hp: u.maxHp, livesRemaining: 0 };
        });
        updatePlayer(player.id, { subUnits: newSubs });
        addLog(`🎲 The Guy (Legendary) — ${player.playerName}'s ${targetUnitLabel} revived at full HP`, 'combat');
        removeItem(player);
      }
    }
    setGuyConfirmModal(null);
  };

  const handleDenyItemRequest = (req) => {
    resolvePendingRequest(lobbyCode, req.reqId);
    import('../services/gameStateService').then(({ writePendingRequest }) => {
      const noticeId = `deny_${req.reqId}`;
      writePendingRequest(lobbyCode, noticeId, {
        type: 'denied',
        reqId: noticeId,
        targetPlayerId: req.playerId,
        timestamp: Date.now(),
      });
      setTimeout(() => resolvePendingRequest(lobbyCode, noticeId), 4000);
    });
  };

  // ── Campaign turn management ───────────────────────────────────────────────
  // ── Status effect tick (fires every round advance) ────────────────────────
  // ── Per-player status effect tick ─────────────────────────────────────────
  // Uses a ref so it always captures the latest players/updatePlayer/addLog
  const tickStatusForPlayerRef = React.useRef(null);
  tickStatusForPlayerRef.current = (playerId) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;

    let changed = false;
    let newCmdStats = { ...player.commanderStats };
    let newSubUnits = (player.subUnits || []).map(u => ({ ...u }));

    // Shield Wall — remove from ALL players' units where shieldedPlayerId === this player's turn
    // (Shield Wall lasts from when applied until this player's next turn starts)
    players.forEach(p => {
      let pCmdChanged = false;
      let pSubChanged = false;
      const filteredCmd = (p.commanderStats.statusEffects || []).filter(ef => {
        if (ef.type === 'shieldWall' && ef.shieldedPlayerId === playerId) { pCmdChanged = true; return false; }
        return true;
      });
      const filteredSubs = (p.subUnits || []).map(u => {
        const filtered = (u.statusEffects || []).filter(ef => {
          if (ef.type === 'shieldWall' && ef.shieldedPlayerId === playerId) { pSubChanged = true; return false; }
          return true;
        });
        return pSubChanged ? { ...u, statusEffects: filtered } : u;
      });
      if (pCmdChanged || pSubChanged) {
        updatePlayer(p.id, {
          commanderStats: pCmdChanged ? { ...p.commanderStats, statusEffects: filteredCmd } : p.commanderStats,
          subUnits: filteredSubs,
        });
        addLog(`🛡️ Shield Wall expired on ${p.playerName}'s units (${player.playerName}'s turn started)`, 'combat');
      }
    });

    // Tick commander effects
    if ((newCmdStats.statusEffects || []).length > 0) {
      const next = [];
      for (const effect of newCmdStats.statusEffects) {
        if (effect.type === 'poison') {
          const dmg = effect.value || 0;
          newCmdStats.hp = Math.max(0, newCmdStats.hp - dmg);
          if (dmg > 0) vp.trackVP(player.id, 'damageTaken', dmg);
          addLog(`🤢 ${player.playerName}'s ${newCmdStats.customName || player.commander} took ${dmg}hp poison damage`, 'combat');
          changed = true;
        }
        if (effect.type === 'burn') {
          const dmg = effect.value || 0;
          newCmdStats.hp = Math.max(0, newCmdStats.hp - dmg);
          if (dmg > 0) vp.trackVP(player.id, 'damageTaken', dmg);
          addLog(`🔥 ${player.playerName}'s ${newCmdStats.customName || player.commander} took ${dmg}hp burn damage`, 'combat');
          changed = true;
        }
        const dur = (effect.duration || 1) - 1;
        if (dur > 0) {
          next.push({ ...effect, duration: dur });
        } else {
          const expireLabel = { poison: '🤢 Poison', burn: '🔥 Burn', shieldWall: '🛡️ Shield Wall', counterStrike: '⚡ Counter Strike', marked: '🎯 Marked', stun: '💫 Stun', attackBuff: '⚔️↑ Atk Buff', defenseBuff: '🛡️↑ Def Buff', attackDebuff: '⚔️↓ Atk Debuff', defenseDebuff: '🛡️↓ Def Debuff' }[effect.type] || effect.type;
          addLog(`${expireLabel} expired on ${player.playerName}'s ${newCmdStats.customName || player.commander}`, 'combat');
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
          if (dmg > 0) vp.trackVP(player.id, 'damageTaken', dmg);
          addLog(`🤢 ${player.playerName}'s ${uName} took ${dmg}hp poison damage`, 'combat');
        }
        if (effect.type === 'burn') {
          const dmg = effect.value || 0;
          hp = Math.max(0, hp - dmg);
          if (dmg > 0) vp.trackVP(player.id, 'damageTaken', dmg);
          addLog(`🔥 ${player.playerName}'s ${uName} took ${dmg}hp burn damage`, 'combat');
        }
        const dur = (effect.duration || 1) - 1;
        if (dur > 0) {
          next.push({ ...effect, duration: dur });
        } else {
          const expLabel = { poison: '🤢 Poison', burn: '🔥 Burn', shieldWall: '🛡️ Shield Wall', counterStrike: '⚡ Counter Strike', marked: '🎯 Marked', stun: '💫 Stun', attackBuff: '⚔️↑ Atk Buff', defenseBuff: '🛡️↑ Def Buff', attackDebuff: '⚔️↓ Atk Debuff', defenseDebuff: '🛡️↓ Def Debuff' }[effect.type] || effect.type;
          addLog(`${expLabel} expired on ${player.playerName}'s ${uName}`, 'combat');
        }
      }
      return { ...unit, hp, statusEffects: next };
    });

    if (changed) {
      updatePlayer(player.id, { commanderStats: newCmdStats, subUnits: newSubUnits });
    }
  };

  // ── Tick NPC status effects ──────────────────────────────────────────────
  // Effects with sourcePlayerId tick at end of that player's turn (same as player effects)
  // Effects without sourcePlayerId (NPC-sourced) tick once per round

  const tickNPCEffectsForPlayer = React.useCallback((playerId) => {
    setNpcs(prev => prev.map(npc => {
      if (!npc.active || npc.isDead) return npc;
      const effects = npc.statusEffects || [];
      const hasPlayerEffects = effects.some(ef => String(ef.sourcePlayerId) === String(playerId));
      if (!hasPlayerEffects) return npc;
      let hp = npc.hp;
      const next = [];
      for (const ef of effects) {
        if (String(ef.sourcePlayerId) !== String(playerId)) { next.push(ef); continue; }
        if (ef.type === 'poison') { const dmg = ef.value || 2; hp = Math.max(0, hp - dmg); if (dmg > 0) vp.trackVP(playerId, 'npcDamage', dmg); addLog(`🤢 NPC "${npc.name}" took ${dmg}hp poison damage`, 'combat'); }
        if (ef.type === 'burn')   { const dmg = ef.value || 2; hp = Math.max(0, hp - dmg); if (dmg > 0) vp.trackVP(playerId, 'npcDamage', dmg); addLog(`🔥 NPC "${npc.name}" took ${dmg}hp burn damage`, 'combat'); }
        if (ef.permanent) { next.push(ef); continue; }
        const dur = (ef.duration || 1) - 1;
        if (dur > 0) { next.push({ ...ef, duration: dur }); }
        else {
          const expLabel = { poison:'🤢 Poison', burn:'🔥 Burn', stun:'💫 Stun', marked:'🎯 Marked', attackDebuff:'⚔️↓ Atk Debuff', defenseDebuff:'🛡️↓ Def Debuff', attackBuff:'⚔️↑ Atk Buff', defenseBuff:'🛡️↑ Def Buff' }[ef.type] || ef.type;
          addLog(`${expLabel} expired on NPC "${npc.name}"`, 'combat');
        }
      }
      const justDied = npc.hp > 0 && hp <= 0;
      if (justDied) addLog(`💀 NPC "${npc.name}" was killed by a status effect!`, 'combat');
      return { ...npc, hp, isDead: justDied ? true : npc.isDead, statusEffects: next };
    }));
  }, [addLog]);

  // Global tick at round advance — only for effects with no sourcePlayerId (NPC-originated effects)
  const tickNPCStatusRef = React.useRef(null);
  tickNPCStatusRef.current = () => {
    setNpcs(prev => prev.map(npc => {
      if (!npc.active || npc.isDead) return npc;
      const effects = npc.statusEffects || [];
      const hasGlobal = effects.some(ef => !ef.sourcePlayerId);
      if (!hasGlobal) return npc;
      let hp = npc.hp;
      const next = [];
      for (const ef of effects) {
        if (ef.sourcePlayerId) { next.push(ef); continue; }
        if (ef.type === 'poison') { const dmg = ef.value || 2; hp = Math.max(0, hp - dmg); addLog(`🤢 NPC "${npc.name}" took ${dmg}hp poison damage`, 'combat'); }
        if (ef.type === 'burn')   { const dmg = ef.value || 2; hp = Math.max(0, hp - dmg); addLog(`🔥 NPC "${npc.name}" took ${dmg}hp burn damage`, 'combat'); }
        if (ef.permanent) { next.push(ef); continue; }
        const dur = (ef.duration || 1) - 1;
        if (dur > 0) { next.push({ ...ef, duration: dur }); }
        else {
          const expLabel = { poison:'🤢 Poison', burn:'🔥 Burn', stun:'💫 Stun', marked:'🎯 Marked', attackDebuff:'⚔️↓ Atk Debuff', defenseDebuff:'🛡️↓ Def Debuff', attackBuff:'⚔️↑ Atk Buff', defenseBuff:'🛡️↑ Def Buff' }[ef.type] || ef.type;
          addLog(`${expLabel} expired on NPC "${npc.name}"`, 'combat');
        }
      }
      const justDied = npc.hp > 0 && hp <= 0;
      if (justDied) addLog(`💀 NPC "${npc.name}" was killed by a status effect!`, 'combat');
      return { ...npc, hp, isDead: justDied ? true : npc.isDead, statusEffects: next };
    }));
  };

  const campaign = useCampaignTurn(
    players, activeNPCs, getNPCById, playersWhoActedThisRound, currentRound,
    endTurnSideEffectsOnly, addLog, updatePlayer, setNpcs, applyDamageToNPC, vp.trackVP,
    () => { roundTimers.onRoundAdvance(); tickNPCStatusRef.current?.(); },
    (deathData) => setDeathLootModal(deathData),
    null, // onCreateTimer — passed per-call not globally
    (playerId) => { tickStatusForPlayerRef.current?.(playerId); }, // onTurnStart
    (data) => setGuyCloseCallModal(data), // onGuyCloseCall
    setPlayersWhoActedThisRound,  // direct setter — campaign owns acted list
    setCurrentRound               // direct setter — campaign owns round counter
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
    setShowDamageDistribution, closeCalculatorKeepDistribution, setCalculatorData, setCalculatorDataDirect, applyDamage,
  } = useDamageCalculation(players, addLog, npcs);

  // ── Squad revive ──────────────────────────────────────────────────────────
  const [squadRevivePlayerId, setSquadRevivePlayerId] = React.useState(null);
  const [deathLootModal, setDeathLootModal] = React.useState(null); // { unitLabel, playerName, items, playerId } — NPC killed player unit
  const [pvpDeathModal,  setPvpDeathModal]  = React.useState(null); // { unitLabel, playerName, items, playerId, attackerPlayer, attackerUnitType }
  const [spawnModal, setSpawnModal] = React.useState(null);
  const [guyConfirmModal, setGuyConfirmModal] = React.useState(null); // { req, player } — The Guy DM confirm
  const [guyTargetUnit, setGuyTargetUnit] = React.useState(null); // { unitKey, label } — unit picked in Guy modal
  const [guyCloseCallModal, setGuyCloseCallModal] = React.useState(null);
  const [gmTradeResult, setGmTradeResult] = React.useState(null); // { outcome, p1Name, p1Item, p2Name, p2Item }
  const [enemyItemModal, setEnemyItemModal] = React.useState(null); // { sourcePlayer, item, isMirror, originalItemId }
  const [lastItemPlayed, setLastItemPlayed] = React.useState(null); // { item, sourcePlayerId }
  const [enemyTargetMode, setEnemyTargetMode] = React.useState(null); // 'npc' | 'player' // { attack } — confirm before creating NPC
  const setDeathLootModalRef = React.useRef(null);
  setDeathLootModalRef.current = setDeathLootModal;
  const setPvpDeathModalRef = React.useRef(null);
  setPvpDeathModalRef.current = setPvpDeathModal;
  const squadRevivePlayer = squadRevivePlayerId ? players.find(p => String(p.id) === String(squadRevivePlayerId)) : null;
  const handleSquadRevive = (playerId, isSuccessful) => {
    processSquadRevive(playerId, isSuccessful);
    vp.trackVP(playerId, 'revivesUsed', 1);
    setSquadRevivePlayerId(null);
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activePanel,      setActivePanel]      = React.useState('players');
  activePanelRef.current = activePanel; // keep ref current for sync hook
  const [showStats,        setShowStats]        = React.useState(false);
  const [showModeSelector, setShowModeSelector] = React.useState(false);
  const [viewMode,         setViewMode]         = React.useState('all');
  const [gameSettingsOpen, setGameSettingsOpen] = React.useState(true);
  const [draggedIndex,     setDraggedIndex]     = React.useState(null);

  const isCampaign = gameMode === 'campaign';

  // ── Mobile detection (GM side) ────────────────────────────────────────────
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  // ── Derived turn info ─────────────────────────────────────────────────────
  const campaignTurnOrder       = isCampaign ? campaign.buildTurnOrder() : [];
  const currentCampaignTurn     = campaignTurnOrder[campaign.campaignTurnIndex] || null;
  const currentCampaignPlayerId = currentCampaignTurn?.type === 'player' ? currentCampaignTurn.id : null;
  const currentNonRebuttalNPC   = (currentCampaignTurn?.type === 'npc' && currentCampaignTurn.isRebuttal === false)
    ? getNPCById(currentCampaignTurn.id) : null;
  const currentCampaignNPCId    = null; // NPCs are visual-only in turn order — they never hold the active turn

  // Keep ref in sync so the main useFirestoreSync always has the latest value
  campaignPlayerIdRef.current = currentCampaignPlayerId;

  const currentModeConfig = getModeConfig(gameMode);
  const currentPlayer     = isCampaign
    ? players.find(p => String(p.id) === String(currentCampaignPlayerId))
    : players[currentPlayerIndex];
  // Absent players pushed to the bottom of the GM view
  const displayedPlayers = (viewMode === 'current' && currentPlayer ? [currentPlayer] : players)
    .slice()
    .sort((a, b) => {
      if (a.isAbsent === b.isAbsent) return 0;
      return a.isAbsent ? 1 : -1;
    });
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
    const state = { players, currentRound, combatLog, gameMode, customModeSettings, currentPlayerIndex, playersWhoActedThisRound, gameStarted, npcs, lootPool, chests, vpStats: vp.vpStats, pastSessionNPCs, pastSessionChests, dmNotes, savedAt: new Date().toISOString() };
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
          // In offline mode, clear all session-specific flags — absent/manual/left only apply in live multiplayer
          if (!isMultiplayer && state.players) {
            state.players = state.players.map(p => ({ ...p, isAbsent: false, isManual: false, isLeft: false }));
          }
          loadGameState(state);
          if (state.npcs)     setNpcs(state.npcs);
          if (state.lootPool) setLootPool(state.lootPool);
          if (state.chests)   setChests(state.chests);
          if (state.vpStats) {
            // Restore historical awards but zero live trackers for a fresh session
            const restoredVp = {};
            Object.entries(state.vpStats).forEach(([pid, pdata]) => {
              restoredVp[pid] = {
                ...pdata,
                npcDamage: 0, pvpDamage: 0, damageTaken: 0,
                revivesUsed: 0, finalBossKill: 0, warmonger: 0,
                firstBlood: 0, itemsObtained: 0, leastDeaths: 0,
                leastDamageTaken: 0,
              };
            });
            vp.saveVpStats(restoredVp);
          }
          // Restore session NPC archive from file, or clear if this save doesn't have one
          setPastSessionNPCs(state.pastSessionNPCs || []);
          try { localStorage.setItem('bt_pastSessionNPCs', JSON.stringify(state.pastSessionNPCs || [])); } catch {};
          // Restore session Chest archive
          setPastSessionChests(state.pastSessionChests || []);
          try { localStorage.setItem('bt_pastSessionChests', JSON.stringify(state.pastSessionChests || [])); } catch {};
          if (state.dmNotes) setDmNotes(state.dmNotes);
          addLog(`Game loaded from ${new Date(state.savedAt).toLocaleString()}`, 'system');
          alert('Game loaded successfully!');
        } catch { alert('Failed to load save file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Kick player (GM action) ─────────────────────────────────────────────────
  const handleKick = async (playerId, mode) => {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;
    if (mode === 'absent') {
      updatePlayer(playerId, { isAbsent: true, isManual: true, isLeft: false });
      addLog(`😴 ${player.playerName} was marked absent by GM`, 'system');
    } else if (mode === 'left') {
      updatePlayer(playerId, { isAbsent: true, isLeft: true, isManual: false });
      addLog(`🚪 ${player.playerName} was kicked — slot available for rejoin`, 'system');
      if (isMultiplayer && lobbyCode && player.uid) {
        try { await markPlayerLeft(lobbyCode, player.uid, player.playerName); } catch {}
      }
    }
  };

  const handleNewSession = () => {
    if (!window.confirm('Start New Session?\n\nPlayer + NPC HP and revives reset. Timers and tokens cleared. Loot and chests are preserved.')) return;
    // Archive NPCs and chests from this session before resetting
    const sessionLabel = `Session ${new Date().toLocaleDateString()}`;
    archiveNPCsRef.current?.(sessionLabel);
    startNewSession(resetAllNPCs);
    vp.resetLiveVPTrackers();
    tokens.resetAllTokens();
    roundTimers.resetAllTimers();
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
        {/* Left: Round + Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div style={styles.roundDisplay}>
            <div style={styles.roundLabel}>ROUND</div>
            <div style={styles.roundNumber}>{currentRound}</div>
          </div>
          <div style={{ ...styles.modeDisplay, cursor: 'default' }}>
            <span style={styles.modeIcon}>{currentModeConfig.icon}</span>
            <span style={styles.modeText}>{currentModeConfig.name}</span>
          </div>
        </div>

        {/* Center: Active player */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {activeTurnLabel && (
            <div style={styles.currentPlayerDisplay}>
              <div style={styles.currentPlayerLabel}>{isCampaign && currentCampaignNPCId ? 'NPC TURN' : 'ACTIVE PLAYER'}</div>
              <div style={{ ...styles.currentPlayerName, color: isCampaign && currentCampaignNPCId ? '#fca5a5' : '#a78bfa' }}>{activeTurnLabel}</div>
            </div>
          )}
        </div>

        {/* Right: Stats, Focus/All, End Turn */}
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setShowStats(true)} style={styles.statsBtn}>📊 STATS</button>
          <button onClick={() => setViewMode(v => v === 'all' ? 'current' : 'all')} style={styles.viewModeBtn} disabled={!currentPlayer}>{viewMode === 'all' ? '👤 FOCUS' : '👥 ALL'}</button>
          <button onClick={() => {
            if (!gameStarted) { startGame(); campaign.setCampaignTurnIndex(0); }
            else { isCampaign ? campaign.endCampaignTurn() : endTurn(); }
          }} style={styles.endTurnBtn}>
            {!gameStarted ? '▶️ START GAME' : (() => {
              if (isCampaign) {
                const allActed = campaignTurnOrder.filter(e => e.type === 'player').every(e => playersWhoActedThisRound.includes(e.id));
                return allActed ? '🔄 END ROUND' : '➡️ END TURN';
              }
              const alive = players.filter(p => p.commanderStats.hp > 0);
              const acted = alive.filter(p => playersWhoActedThisRound.includes(p.id));
              return (currentPlayer && acted.length === alive.length - 1) ? '🔄 END ROUND' : '➡️ END TURN';
            })()}
          </button>
        </div>
      </div>

      {/* Log panel — desktop only */}
      {!isMobile && (
        <div style={{ marginBottom: '1rem' }}>
          <LogPanel battleLog={combatLog} onClearLog={clearLog} />
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: isMobile ? '5.5rem' : 0 }}>

        {/* Campaign sidebar nav */}
        {isCampaign && (
          <DMSidebar
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            activeNPCsCount={activeNPCs.length}
            unopenedChestCount={chests.filter(c => !c.isOpened).length}
            activeTimersCount={roundTimers.timers.length}
          />
        )}

        {/* Campaign turn order sidebar */}
        {isCampaign && viewMode === 'current' && activePanel === 'players' && (
          <div style={{ ...styles.sidebar, top: 0 }}>
            <h3 style={styles.sidebarTitle}>⚔️ TURN ORDER</h3>
            {campaignTurnOrder.map((entry, index) => {
              const isPlayer    = entry.type === 'player';
              const isNonReb    = entry.type === 'npc' && entry.isRebuttal === false;
              const isRebuttal  = entry.type === 'npc' && entry.isRebuttal !== false;
              const isCurr      = index === campaign.campaignTurnIndex;
              const entity      = isPlayer ? players.find(p => p.id === entry.id) : getNPCById(entry.id);
              if (!entity) return null;
              const hasActed    = isPlayer ? playersWhoActedThisRound.includes(entity.id) : false;

              if (isRebuttal) {
                return (
                  <div key={`npc-reb-${entry.id}`} style={{ ...styles.sidebarPlayer, background: 'rgba(239,68,68,0.05)', borderLeft: '4px solid rgba(239,68,68,0.3)', opacity: 0.75 }}>
                    <div style={styles.sidebarPlayerHeader}>
                      <span style={{ ...styles.sidebarPlayerName, color: colors.textSecondary, fontSize: '0.72rem' }}>👾 {entity.name}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>⚔️ retaliate</span>
                    </div>
                    <div style={{ ...styles.sidebarPlayerInfo, color: colors.textFaint }}>{entity.hp}/{entity.maxHp}hp • 🛡️{entity.armor}+</div>
                  </div>
                );
              }

              if (isNonReb) {
                return (
                  <div key={`npc-nr-${entry.id}`} style={{ ...styles.sidebarPlayer, background: isCurr ? 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(185,28,28,0.2))' : 'rgba(239,68,68,0.05)', borderLeft: `4px solid ${isCurr ? '#f87171' : 'rgba(239,68,68,0.35)'}` }}>
                    <div style={styles.sidebarPlayerHeader}>
                      <span style={{ ...styles.sidebarPlayerName, color: isCurr ? '#fca5a5' : colors.textSecondary, fontSize: '0.75rem' }}>👾 {entity.name}</span>
                      {isCurr && <span style={{ color: '#f87171' }}>▶</span>}
                    </div>
                    <div style={{ ...styles.sidebarPlayerInfo, color: colors.textFaint }}>{entity.hp}/{entity.maxHp}hp • 🛡️{entity.armor}+</div>
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
          {(!isCampaign || activePanel === 'players') && viewMode !== 'current' && (
            <div style={styles.addPlayerSection}>
              <button onClick={addPlayer} style={styles.addPlayerBtn}>+ ADD PLAYER</button>
            </div>
          )}

          {/* Non-rebuttal NPC turn — show enlarged NPC card in focus mode */}
          {isCampaign && viewMode === 'current' && activePanel === 'players' && currentNonRebuttalNPC && (
            <div style={{ padding: '0.5rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: '#f87171', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: fonts.display }}>
                  👾 NPC TURN — {currentNonRebuttalNPC.name}
                </span>
              </div>
              <NPCCard
                npc={currentNonRebuttalNPC}
                isCurrentTurn={true}
                hasActedThisRound={campaign.npcsWhoActedThisRound?.includes(currentNonRebuttalNPC.id)}
                onActivate={(id) => campaign.handleActivateNPC(id)}
                onDeactivate={(id) => deactivateNPC(id)}
                onEdit={() => {}}
                onRemove={() => {}}
                onHPChange={(id, hp) => { setNPCHP(id, hp); }}
                onTriggerPhase={(id) => triggerNextPhase(id)}
                onTriggerEvolution={(id) => triggerNextEvolution(id)}
                onOpenNPCAttack={(npcId, attackIndex, opts) => campaign.openNPCAttack(npcId, attackIndex, opts)}
                onSpawnAttack={(attack, parentName) => setSpawnModal({ attack, parentNPCName: parentName })}
                onIncrementAttack={(npcId, reset) => campaign.handleIncrementAttack(npcId, reset)}
                players={players}
                onDropLoot={(npc) => loot.setDeathLootModal({ ...npc, lootTable: npc.lootTable })}
                getTimersForNPC={roundTimers.getTimersForNPC || (() => [])}
                onUpdateNPC={(id, updates) => setNpcs(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))}
                onDuplicate={() => {}}
              />
            </div>
          )}

          {(!isCampaign || activePanel === 'players') && !(isCampaign && viewMode === 'current' && currentNonRebuttalNPC) && (
            isMobile ? (
              <div style={{ width: '100%' }}>
                {/* Lobby code above carousel — mobile only */}
                {isMultiplayer && lobbyCode && (
                  <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '0.35rem 1rem', background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.25)', borderRadius: '8px' }}>
                      <span style={{ color: colors.textFaint, fontSize: '0.5rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lobby</span>
                      <span style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.12em' }}>{lobbyCode}</span>
                    </div>
                  </div>
                )}
                {displayedPlayers.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <button onClick={() => setCarouselIndex(i => Math.max(0, i - 1))} disabled={carouselIndex === 0} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: carouselIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: '1.2rem', padding: '0.3rem 0.9rem', cursor: carouselIndex === 0 ? 'default' : 'pointer', fontFamily: fonts.body }}>‹</button>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: '700' }}>{carouselIndex + 1} / {displayedPlayers.length}</span>
                    <button onClick={() => setCarouselIndex(i => Math.min(displayedPlayers.length - 1, i + 1))} disabled={carouselIndex === displayedPlayers.length - 1} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: carouselIndex === displayedPlayers.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: '1.2rem', padding: '0.3rem 0.9rem', cursor: carouselIndex === displayedPlayers.length - 1 ? 'default' : 'pointer', fontFamily: fonts.body }}>›</button>
                  </div>
                )}
                {displayedPlayers.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.6rem' }}>
                    {displayedPlayers.map((_, di) => (
                      <div key={di} onClick={() => setCarouselIndex(di)} style={{ width: di === carouselIndex ? '18px' : '7px', height: '7px', borderRadius: '20px', background: di === carouselIndex ? '#8b5cf6' : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.2s' }} />
                    ))}
                  </div>
                )}
                {(() => {
                  const player = displayedPlayers[Math.min(carouselIndex, displayedPlayers.length - 1)];
                  if (!player) return null;
                  const actualIndex = players.findIndex(p => String(p.id) === String(player.id));
                  const isThisTurn  = isCampaign ? String(player.id) === String(currentCampaignPlayerId) : actualIndex === currentPlayerIndex;
                  return (
                    <div key={player.id} style={{ width: '100%' }}>
                      <PlayerCard
                        player={player}
                        onUpdate={updatePlayer}
                        onRemove={removePlayer}
                        onKick={isMultiplayer ? handleKick : undefined}
                        onToggleSquad={toggleSquad}
                        onOpenCalculator={(attackerId, action, unitType) => { openCalculator(attackerId, action, unitType); }}
                        onUseRevive={useRevive}
                        onOpenSquadRevive={id => setSquadRevivePlayerId(id)}
                        onCommanderDied={(p) => tokens.createToken(p, (p.commanderStats?.revives || 0) > 0)}
                        allPlayers={players}
                        isCurrentTurn={isThisTurn}
                        hasActedThisRound={playersWhoActedThisRound.includes(player.id)}
                        onOpenDestroyModal={(attackerPlayer, attackerItem) => loot.setDestroyModal({ attackerPlayer, attackerItem: attackerItem || null, targetPlayer: null, targetUnitType: null, allPlayers: players })}
                        onOpenHandOff={(srcPlayer, srcUnitType, item) => loot.openHandOff(srcPlayer, srcUnitType, item)}
                        isDM={true}
                        getTokenForPlayer={tokens.getTokenForPlayer}
                        isFocusMode={viewMode === 'current'}
                        onUseItemOnEnemy={(srcPlayer, item) => { setEnemyItemModal({ sourcePlayer: srcPlayer, item, isMirror: false }); setEnemyTargetMode(null); }}
                        onTrackLastItem={(srcPlayer, item) => setLastItemPlayed({ item, sourcePlayerId: srcPlayer.id })}
                        onNullifyLastEffect={(playerId) => {
                          const p = players.find(pl => String(pl.id) === String(playerId));
                          if (!p) return;
                          const lastEf = lastItemPlayed?.item?.effect;
                          const effectTypeToRemove = lastEf ? { poisonVial: 'poison', npcPlague: 'poison', playerPlague: 'poison', stunGrenade: 'stun', attackDebuffItem: 'attackDebuff', defenseDebuffItem: 'defenseDebuff', marked: 'marked', shieldWall: 'shieldWall', counterStrike: 'counterStrike', attackBonus: 'attackBuff', crownsFavor: 'attackBuff', defenseBonus: 'defenseBuff' }[lastEf.type] : null;
                          const removeEffect = (effects) => { if (effectTypeToRemove) { const idx = [...effects].reverse().findIndex(ef => ef.type === effectTypeToRemove); if (idx !== -1) { const ri = effects.length - 1 - idx; return effects.filter((_, i) => i !== ri); } } return effects.length > 0 ? effects.slice(0, -1) : []; };
                          updatePlayer(playerId, { commanderStats: { ...p.commanderStats, statusEffects: removeEffect(p.commanderStats.statusEffects || []) }, subUnits: (p.subUnits || []).map(u => ({ ...u, statusEffects: removeEffect(u.statusEffects || []) })) });
                          addLog('🚫 ' + p.playerName + ' used Nullify — ' + (effectTypeToRemove ? lastItemPlayed.item.name : 'last effect') + ' removed from all units!', 'items');
                        }}
                        onUseGlobalItem={(srcPlayer, item) => {
                          const ef = item.effect;
                          const consume = () => { const freshSrc = players.find(p => String(p.id) === String(srcPlayer.id)); if (!freshSrc) return; const uses = item.effect?.uses ?? 1; const usesRemaining = item.effect?.usesRemaining ?? uses; if (uses === 0) return; if (usesRemaining <= 1) { updatePlayer(freshSrc.id, { inventory: (freshSrc.inventory || []).filter(it => it.id !== item.id) }); } else { updatePlayer(freshSrc.id, { inventory: (freshSrc.inventory || []).map(it => it.id !== item.id ? it : { ...it, effect: { ...it.effect, usesRemaining: usesRemaining - 1 } }) }); } };
                          setLastItemPlayed({ item, sourcePlayerId: srcPlayer.id });
                          if (ef?.type === 'npcPlague') { const dmgPerRound = ef.value || 2; const duration = ef.duration || 2; setNpcs(prev => prev.map(n => n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), { type: 'poison', value: dmgPerRound, duration, permanent: false, sourcePlayerId: srcPlayer.id }] } : n)); consume(); addLog(`☠️ ${srcPlayer.playerName} unleashed NPC Plague! All active NPCs are poisoned (${dmgPerRound}hp×${duration}r).`, 'items'); }
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ display: players.length === 0 ? 'block' : 'grid', gridTemplateColumns: players.length === 1 ? '1fr' : viewMode === 'current' ? '1fr' : '48% 48%', gap: '1%', padding: '0 0.5%', maxWidth: players.length === 1 ? '50%' : '100%', margin: players.length === 1 ? '0 auto' : '0' }}>
              {players.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: colors.textFaint }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: colors.textMuted }}>No players yet</div>
                  <div style={{ fontSize: '0.85rem' }}>Click ADD PLAYER to bring combatants into the battle.</div>
                </div>
              )}
              {displayedPlayers.map(player => {
                const actualIndex    = players.findIndex(p => String(p.id) === String(player.id));
                const isBeingDragged = draggedIndex === actualIndex;
                const isThisTurn     = isCampaign ? String(player.id) === String(currentCampaignPlayerId) : actualIndex === currentPlayerIndex;
                return (
                  <div key={player.id} draggable={viewMode==='all'} onDragStart={e => viewMode==='all'&&handleDragStart(e,actualIndex)} onDragOver={viewMode==='all'?handleDragOver:undefined} onDrop={e => viewMode==='all'&&handleDrop(e,actualIndex)} onDragEnd={viewMode==='all'?handleDragEnd:undefined} style={{ opacity: isBeingDragged?0.5:1, cursor: viewMode==='all'?'grab':'default', transition: 'opacity 0.2s' }}>
                    <PlayerCard
                      player={player}
                      onUpdate={updatePlayer}
                      onRemove={removePlayer}
                      onKick={isMultiplayer ? handleKick : undefined}
                      onToggleSquad={toggleSquad}
                      onOpenCalculator={(attackerId, action, unitType) => {
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
                      isDM={true}
                      getTimersForPlayerUnit={roundTimers.getTimersForPlayerUnit}
                      getTokenForPlayer={tokens.getTokenForPlayer}
                      isFocusMode={viewMode === 'current'}
                      onUseItemOnEnemy={(srcPlayer, item) => { setEnemyItemModal({ sourcePlayer: srcPlayer, item, isMirror: false }); setEnemyTargetMode(null); }}
                      onTrackLastItem={(srcPlayer, item) => setLastItemPlayed({ item, sourcePlayerId: srcPlayer.id })}
                      onNullifyLastEffect={(playerId) => {
                        const p = players.find(pl => String(pl.id) === String(playerId));
                        if (!p) return;
                        // Find the effect type from the last item played
                        const lastEf = lastItemPlayed?.item?.effect;
                        const effectTypeToRemove = lastEf ? {
                          poisonVial: 'poison', npcPlague: 'poison', playerPlague: 'poison',
                          stunGrenade: 'stun', attackDebuffItem: 'attackDebuff',
                          defenseDebuffItem: 'defenseDebuff', marked: 'marked',
                          shieldWall: 'shieldWall', counterStrike: 'counterStrike',
                          attackBonus: 'attackBuff', crownsFavor: 'attackBuff',
                          defenseBonus: 'defenseBuff',
                        }[lastEf.type] : null;
                        const removeEffect = (effects) => {
                          if (effectTypeToRemove) {
                            // Remove the most recent instance of that specific effect type
                            const idx = [...effects].reverse().findIndex(ef => ef.type === effectTypeToRemove);
                            if (idx !== -1) {
                              const realIdx = effects.length - 1 - idx;
                              return effects.filter((_, i) => i !== realIdx);
                            }
                          }
                          // Fallback: remove last effect
                          return effects.length > 0 ? effects.slice(0, -1) : [];
                        };
                        const newCmdStats = { ...p.commanderStats, statusEffects: removeEffect(p.commanderStats.statusEffects || []) };
                        const newSubs = (p.subUnits || []).map(u => ({ ...u, statusEffects: removeEffect(u.statusEffects || []) }));
                        updatePlayer(playerId, { commanderStats: newCmdStats, subUnits: newSubs });
                        const label = effectTypeToRemove ? lastItemPlayed.item.name : 'last effect';
                        addLog('🚫 ' + p.playerName + ' used Nullify — ' + label + ' removed from all units!', 'items');
                      }}
                      onUseGlobalItem={(srcPlayer, item) => {
                        const ef = item.effect;
                        const dmgPerRound = ef.damagePerRound || 2;
                        const duration = ef.duration || 3;
                        const consume = () => {
                          const freshSrc = players.find(p => String(p.id) === String(srcPlayer.id));
                          if (!freshSrc) return;
                          updatePlayer(srcPlayer.id, { inventory: (freshSrc.inventory || []).filter(it => it.id !== item.id) });
                          setLastItemPlayed({ item, sourcePlayerId: srcPlayer.id });
                        };
                        if (ef?.type === 'npcPlague') {
                          // Poison all active NPCs
                          const poisonEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false };
                          setNpcs(prev => prev.map(n => n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), poisonEntry] } : n));
                          consume();
                          addLog(`☠️ ${srcPlayer.playerName} unleashed NPC Plague! All active NPCs are poisoned (${dmgPerRound}hp×${duration}r).`, 'items');
                        } else if (ef?.type === 'playerPlague') {
                          // Poison all enemy players' units
                          const poisonEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false };
                          players.forEach(p => {
                            if (String(p.id) === String(srcPlayer.id)) return;
                            const newCmdStats = { ...p.commanderStats, statusEffects: [...(p.commanderStats.statusEffects || []), poisonEntry] };
                            const newSubs = (p.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), poisonEntry] } : u);
                            updatePlayer(p.id, { commanderStats: newCmdStats, subUnits: newSubs });
                          });
                          consume();
                          addLog(`☠️ ${srcPlayer.playerName} unleashed Player Plague! All enemy units are poisoned (${dmgPerRound}hp×${duration}r).`, 'items');
                        } else if (ef?.type === 'crownsFavor') {
                          const buffDuration = ef.duration || 1;
                          const buffEntry = { type: 'attackBuff', value: 1, duration: buffDuration, permanent: false };
                          const freshSrc = players.find(p => String(p.id) === String(srcPlayer.id));
                          if (freshSrc) {
                            const newCmdStats = { ...freshSrc.commanderStats, statusEffects: [...(freshSrc.commanderStats.statusEffects || []), buffEntry] };
                            const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), buffEntry] } : u);
                            updatePlayer(freshSrc.id, { commanderStats: newCmdStats, subUnits: newSubs });
                          }
                          consume();
                          addLog(`👑 Crown's Favor! ${srcPlayer.playerName}'s faction gains +1 to all rolls for ${buffDuration} round(s).`, 'items');
                        } else if (ef?.type === 'mirror') {
                          // Mirror — re-fire the last item played
                          if (!lastItemPlayed) {
                            addLog(`🪞 Mirror failed — no item has been played yet.`, 'items');
                            return;
                          }
                          const { item: mirroredItem } = lastItemPlayed;
                          const mef = mirroredItem.effect;
                          if (mef?.type === 'mirror' || mef?.type === 'nullify') {
                            addLog(`🪞 Mirror cannot copy Mirror or Nullify.`, 'items');
                            return;
                          }
                          // For enemy-targeted items, open enemy picker with mirrored item
                          const enemyTargetTypes = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'];
                          const globalTypes = ['npcPlague','playerPlague','crownsFavor'];
                          const selfTypes = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'];
                          if (enemyTargetTypes.includes(mef?.type)) {
                            setEnemyItemModal({ sourcePlayer: srcPlayer, item: { ...mirroredItem, id: `mirror_${Date.now()}` }, isMirror: true, originalItemId: item.id, mirrorSourcePlayerId: srcPlayer.id }); setEnemyTargetMode(null);
                            const freshSrc2 = players.find(p => String(p.id) === String(srcPlayer.id));
                            if (freshSrc2) updatePlayer(srcPlayer.id, { inventory: (freshSrc2.inventory || []).filter(it => it.id !== item.id) });
                          } else if (globalTypes.includes(mef?.type)) {
                            // Re-apply the global effect for the mirror user
                            const mDmgPerRound = mef.damagePerRound || 2;
                            const mDuration = mef.duration || 3;
                            const poisonEntry = { type: 'poison', value: mDmgPerRound, duration: mDuration, permanent: false };
                            if (mef.type === 'npcPlague') {
                              setNpcs(prev => prev.map(n => n.active && !n.isDead ? { ...n, statusEffects: [...(n.statusEffects || []), poisonEntry] } : n));
                              addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — all active NPCs poisoned (${mDmgPerRound}hp×${mDuration}r)!`, 'items');
                            } else if (mef.type === 'playerPlague') {
                              players.forEach(p => {
                                if (String(p.id) === String(srcPlayer.id)) return;
                                const newCmdStats = { ...p.commanderStats, statusEffects: [...(p.commanderStats.statusEffects || []), poisonEntry] };
                                const newSubs = (p.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), poisonEntry] } : u);
                                updatePlayer(p.id, { commanderStats: newCmdStats, subUnits: newSubs });
                              });
                              addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — all enemy units poisoned (${mDmgPerRound}hp×${mDuration}r)!`, 'items');
                            } else if (mef.type === 'crownsFavor') {
                              const mBufDur = mef.duration || 1;
                              const buffEntry = { type: 'attackBuff', value: 1, duration: mBufDur, permanent: false };
                              const freshSrc = players.find(p => String(p.id) === String(srcPlayer.id));
                              if (freshSrc) {
                                const newCmd = { ...freshSrc.commanderStats, statusEffects: [...(freshSrc.commanderStats.statusEffects || []), buffEntry] };
                                const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: [...(u.statusEffects || []), buffEntry] } : u);
                                updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
                              }
                              addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — faction gains +1 to all rolls for ${mBufDur} round(s)!`, 'items');
                            }
                            consume();
                          } else if (selfTypes.includes(mef?.type)) {
                            // Self-targeted items — apply to the mirror user's own units
                            const freshSrc = players.find(p => String(p.id) === String(srcPlayer.id));
                            if (freshSrc) {
                              const mDuration2 = mef.duration || 1;
                              const addEffect = (effects, entry) => [...(effects || []), entry];
                              if (mef.type === 'shieldWall') {
                                const entry = { type: 'shieldWall', shieldedPlayerId: srcPlayer.id, duration: mDuration2, permanent: false };
                                const newCmd = { ...freshSrc.commanderStats, statusEffects: addEffect(freshSrc.commanderStats.statusEffects, entry) };
                                const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: addEffect(u.statusEffects, entry) } : u);
                                updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
                                addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — Shield Wall active!`, 'items');
                              } else if (mef.type === 'counterStrike') {
                                const entry = { type: 'counterStrike', duration: mDuration2, permanent: false };
                                const newCmd = { ...freshSrc.commanderStats, statusEffects: addEffect(freshSrc.commanderStats.statusEffects, entry) };
                                const newSubs = (freshSrc.subUnits || []).map(u => u.hp > 0 ? { ...u, statusEffects: addEffect(u.statusEffects, entry) } : u);
                                updatePlayer(freshSrc.id, { commanderStats: newCmd, subUnits: newSubs });
                                addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — Counter Strike active!`, 'items');
                              } else {
                                // cleanse, fullCleanse, resurrect — open the unit picker for the mirror user
                                addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}" — select a unit.`, 'items');
                              }
                            }
                            consume();
                          } else {
                            consume();
                            addLog(`🪞 ${srcPlayer.playerName} mirrored "${mirroredItem.name}"!`, 'items');
                          }
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
            )
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
              onTriggerEvolution={triggerNextEvolution}
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
              onUpdateNPC={(npcId, updates) => setNpcs(prev => prev.map(n => n.id === npcId ? { ...n, ...updates } : n))}
              onDuplicateNPC={duplicateNPC}
            />
          )}

          {/* ── Session NPC Archive — own div, sibling to DMPanel, no stacking conflicts ── */}
          {isCampaign && activePanel === 'dm' && pastSessionNPCs.length > 0 && (
            <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>📅 Past Sessions</div>
              {[...pastSessionNPCs].reverse().map((session, si, arr) => (
                <SessionArchiveEntry key={si} session={session}
                  onDelete={() => setPastSessionNPCs(prev => prev.filter((_, i) => i !== (arr.length - 1 - si)))}
                />
              ))}
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
              <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                📅 Past Sessions
              </div>
              {[...pastSessionChests].reverse().map((session, si, arr) => (
                <SessionChestArchiveEntry key={si} session={session}
                  onDelete={() => setPastSessionChests(prev => prev.filter((_, i) => i !== (arr.length - 1 - si)))}
                />
              ))}
            </div>
          )}

          {isCampaign && activePanel === 'vp' && (
            <VictoryPanel players={players} vpStats={vp.vpStats} onAwardPoints={vp.awardVPPoints} onDeleteSession={vp.deleteSession} onUpdateVpStats={vp.saveVpStats} onClearTrackers={vp.resetLiveVPTrackers} isMobile={isMobile} />
          )}

          {isCampaign && activePanel === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <DMToolsPanel
                players={players}
                npcs={activeNPCs}
                currentRound={currentRound}
                updatePlayer={updatePlayer}
                setNpcs={setNpcs}
                addLog={addLog}
                dmNotes={dmNotes}
                setDmNotes={setDmNotes}
                onSetRound={(n) => {
                  setCurrentRound(n);
                  addLog(`📋 DM set round to ${n}`, 'system');
                }}
                onAdvanceRound={() => {
                  setCurrentRound(prev => prev + 1);
                  addLog(`----- Round ${currentRound + 1} -----`, 'system');
                  if (roundTimers.onRoundAdvance) roundTimers.onRoundAdvance();
                }}
              />
            </div>
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
        {/* Settings panel — available on all screen sizes */}
          {isCampaign && activePanel === 'settings' && (() => {
            return (
              <div style={{ padding: '1rem 0.5rem', maxWidth: '480px', margin: '0 auto' }}>

                {/* Lobby code */}
                {isMultiplayer && lobbyCode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '10px', marginBottom: '1rem' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lobby Code</span>
                    <span style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.14em' }}>{lobbyCode}</span>
                  </div>
                )}

                {/* Game Settings collapsible */}
                <button
                  onClick={() => setGameSettingsOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.9rem', background: gameSettingsOpen ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.3)', border: `1px solid ${gameSettingsOpen ? 'rgba(201,169,97,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: gameSettingsOpen ? '10px 10px 0 0' : '10px', cursor: 'pointer', fontFamily: fonts.body, marginBottom: 0, transition: 'all 0.2s' }}
                >
                  <span style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>⚙️ Game Settings</span>
                  <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{gameSettingsOpen ? '▲' : '▼'}</span>
                </button>

                {gameSettingsOpen && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(201,169,97,0.15)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button onClick={() => setShowModeSelector(true)} style={settingsBtn('rgba(139,92,246,0.1)', 'rgba(139,92,246,0.35)', '#c4b5fd')}>🎮 Change Game Mode</button>
                    <button onClick={() => vp.setEndSessionModal(true)} style={settingsBtn('rgba(251,191,36,0.1)', 'rgba(251,191,36,0.4)', '#fbbf24')}>🏆 End Session</button>
                    <button onClick={handleNewSession} style={settingsBtn('rgba(139,92,246,0.08)', 'rgba(139,92,246,0.3)', '#c4b5fd')}>🔄 New Session</button>
                    {isMultiplayer && onEndGame && (
                      <button onClick={() => { if (window.confirm('End Game for all players? Everyone will be returned to the home screen.')) onEndGame(); }} style={settingsBtn('rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)', '#fca5a5')}>🚪 End Game</button>
                    )}
                    <button onClick={saveGameToFile} style={settingsBtn('rgba(34,197,94,0.1)', 'rgba(34,197,94,0.35)', '#86efac')}>💾 Save Game</button>
                    <button onClick={loadGameFromFile} style={settingsBtn('rgba(99,102,241,0.1)', 'rgba(99,102,241,0.35)', '#a5b4fc')}>📂 Load Game</button>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <button onClick={() => {
                        if (!window.confirm('Hard reset the entire app?\n\nThis will wipe all players, NPCs, loot, sessions, VP history, timers, tokens, and past session archives. This cannot be undone.')) return;
                        const clearEmpty = ['bt_roundTimers','bt_commanderTokens','bt_npcs','bt_chests','bt_pastSessionNPCs','bt_pastSessionChests'];
                        const clearRemove = ['bt_players','bt_round','bt_log','bt_gameMode','bt_customSettings','bt_playerIndex','bt_gameStarted','bt_lootPool','bt_vpStats','bt_sessionCount','bt_tokensEnabled','bt_archivedLoot'];
                        clearEmpty.forEach(k => { try { localStorage.setItem(k, '[]'); } catch {} });
                        clearRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
                        window.location.reload();
                      }} style={settingsBtn('rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)', '#fca5a5')}>⚠️ Hard Reset App</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
              closeCalculatorKeepDistribution();
            }}
            gameMode="campaign"
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
          onApply={(distributionOverride) => {
            const calc       = calculatorData;
            const attackerId = calc?.attackerId;

            // ── Pre-compute which units will die and how before any state changes ──
            const pvpTargets = new Set(
              (calc?.targetSquadMembers||[])
                .filter(t => !t.isNPC && (damageDistribution[`${t.playerId}-${t.unitType}`]||0) > 0)
                .map(t => `${t.playerId}-${t.unitType}`)
            );

            // Snapshot deaths: { steal: [{attackerId, attackerUnitType, victimPlayerId, unitType}], drop: [{unitLabel, items, playerId}] }
            const pendingSteal = [];
            const pendingDrop  = [];

            players.forEach(origP => {
              if (origP.id === attackerId) return;
              if (origP.isAbsent) return;
              const dmgKey = (unitType) => damageDistribution[`${origP.id}-${unitType}`] || 0;

              // Commander
              if (!origP.commanderStats?.isDead) {
                const dmg = dmgKey('commander');
                if (origP.commanderStats.hp > 0 && origP.commanderStats.hp - dmg <= 0) {
                  const wasTargeted = pvpTargets.has(`${origP.id}-commander`);
                  const cmdItems = (origP.inventory||[]).filter(it => it.heldBy === 'commander');
                  if (wasTargeted && cmdItems.length > 0) {
                    pendingSteal.push({ attackerId, attackerUnitType: calc?.attackingUnitType||'commander', unitLabel: origP.commanderStats?.customName||origP.commander||'Commander', victimPlayerId: origP.id, unitType: 'commander', victimItems: cmdItems, victimPlayer: origP });
                  } else if (!wasTargeted && cmdItems.length > 0) {
                    pendingDrop.push({ unitLabel: origP.commanderStats?.customName||origP.commander||'Commander', playerName: origP.playerName, items: cmdItems, playerId: origP.id });
                  }
                }
              }

              // Squad units
              (origP.subUnits||[]).forEach((u, i) => {
                const unitType = i===0?'special':`soldier${i}`;
                const dmg = dmgKey(unitType);
                if (u.hp > 0 && u.hp - dmg <= 0) {
                  const wasTargeted = pvpTargets.has(`${origP.id}-${unitType}`);
                  const unitItems = (origP.inventory||[]).filter(it => it.heldBy === unitType);
                  if (wasTargeted && unitItems.length > 0) {
                    pendingSteal.push({ attackerId, attackerUnitType: calc?.attackingUnitType||'commander', unitLabel: u.name?.trim()||(i===0?'Special':`Soldier ${i}`), victimPlayerId: origP.id, unitType, victimItems: unitItems, victimPlayer: origP });
                  } else if (!wasTargeted && unitItems.length > 0) {
                    pendingDrop.push({ unitLabel: u.name?.trim()||(i===0?'Special':`Soldier ${i}`), playerName: origP.playerName, items: unitItems, playerId: origP.id });
                  }
                }
              });
            });

            // VP tracking
            if (attackerId) {
              const anyDmg = (calc?.targetSquadMembers||[]).some(t => {
                const key = t.isNPC ? `npc-${t.npcId}` : `${t.playerId}-${t.unitType}`;
                return (damageDistribution[key]||0) > 0;
              });
              if (anyDmg) {
                // Warmonger: count completed attacks that deal real damage
                vp.trackVP(attackerId, 'warmonger', 1);
                if (!vp.firstBloodAwarded) {
                  vp.trackVP(attackerId, 'firstBlood', 1);
                  vp.setFirstBloodAwarded(true);
                  addLog(`🩸 First Blood! ${players.find(p=>p.id===attackerId)?.playerName||'Unknown'} draws first!`, 'vp');
                }
              }
              calc?.targetSquadMembers?.forEach(target => {
                if (target.isNPC) return;
                const dmg = damageDistribution[`${target.playerId}-${target.unitType}`]||0;
                if (dmg > 0) { vp.trackVP(attackerId,'pvpDamage',dmg); vp.trackVP(target.playerId,'damageTaken',dmg); }
              });
            }

            // Close modal and apply HP changes
            setShowDamageDistribution(false);
            applyDamage((updatedPlayers) => {
              updatedPlayers.forEach(p => updatePlayer(p.id, p));

              // Trigger loot modals after HP state has been committed
              setTimeout(() => {
                if (pendingSteal.length > 0) {
                  const s = pendingSteal[0];
                  setPvpDeathModalRef.current({
                    unitLabel: s.unitLabel,
                    playerName: s.victimPlayer.playerName,
                    items: s.victimItems,
                    playerId: s.victimPlayer.id,
                    victimUnitType: s.unitType,
                    attackerPlayer: players.find(p => p.id === s.attackerId) || s.victimPlayer,
                    attackerUnitType: s.attackerUnitType,
                  });
                } else if (pendingDrop.length > 0) {
                  setDeathLootModalRef.current(pendingDrop[0]);
                }
              }, 50);

              if (calc?.targetSquadMembers) {
                const atk = players.find(p=>p.id===calc?.attackerId);
                calc.targetSquadMembers.forEach(t => {
                  if (!t.isNPC) return;
                  const dmg = (distributionOverride||damageDistribution)[`npc-${t.npcId}`]||0;
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
            }, distributionOverride, (data) => {
              addLog(`🛡️ The Guy took ${data.damage}hp damage for ${data.playerName}!`, 'combat');
              setGuyCloseCallModal(data);
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
                    // Apply move set: preset's own moves take priority, else inherit spawn move's attacks
                    if (preset.attacks && preset.attacks.length > 0) {
                      newNPC.attacks = preset.attacks.map(m => ({
                        name: m.name || '',
                        attackType: 'attack',
                        dieType: m.dieType || 'd20',
                        numRolls: parseInt(m.numRolls) || 1,
                        range: m.range || '',
                        attackBonus: 0,
                        attackEffect: null,
                        buffEffect: null,
                      }));
                    } else if (attack.attacks && attack.attacks.length > 0) {
                      newNPC.attacks = attack.attacks;
                    }
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
                  // Inherit move set from the spawn attack
                  if (attack.attacks && attack.attacks.length > 0) {
                    newNPC.attacks = attack.attacks;
                  }
                  saveNPC(newNPC);
                  totalSpawned++;
                }
              }
              if (totalSpawned > 0) addLog(`🐣 ${totalSpawned} NPC(s) spawned by ${parentName || 'unknown'}!`, 'combat');
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
              <div style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '0.25rem' }}>Is this NPC in range to counter-attack?</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {campaign.rebuttalModal.attacks.map((atk, i) => (
                <button key={i} onClick={() => campaign.confirmRebuttal(i)} style={{
                  padding: '0.75rem 1rem', background: 'linear-gradient(135deg,rgba(185,28,28,0.3),rgba(153,27,27,0.2))',
                  border: '2px solid #dc2626', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem', color: '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ flex: 1, textAlign: 'left' }}>⚔️ {atk.name}</span>
                  <span style={{ color: colors.textMuted, fontSize: '0.72rem' }}>{atk.dieType?.toUpperCase()} × {atk.numRolls}</span>
                </button>
              ))}
            </div>
            <button onClick={campaign.dismissRebuttal} style={{
              width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)',
              border: '1px solid #374151', borderRadius: '8px', cursor: 'pointer',
              fontFamily: fonts.body, fontWeight: '700', fontSize: '0.85rem', color: colors.textMuted,
            }}>✕ Not in Range</button>
          </div>
        </div>
      )}

      {/* ── GM: Player Attack Approval Modal ── */}
      {isMultiplayer && firstRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>
                {firstRequest.action === 'shoot' ? '🎯' : firstRequest.action === 'melee' ? '⚔️' : '⚡'}
              </div>
              <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                Attack Request
              </div>
              {queueBehindAttack > 0 && (
                <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px' }}>
                  <span style={{ color: '#fca5a5', fontSize: '0.65rem', fontWeight: '800' }}>+{queueBehindAttack} more pending</span>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</span>
                <span style={{ color: colors.gold, fontWeight: '700', fontSize: '0.85rem' }}>{firstRequest.playerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit</span>
                <span style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{firstRequest.unitLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action</span>
                <span style={{ color: colors.amber, fontWeight: '700', fontSize: '0.85rem', textTransform: 'capitalize' }}>{firstRequest.action}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target</span>
                <span style={{ color: firstRequest.targetType === 'npc' ? '#fecaca' : colors.blueLight, fontWeight: '700', fontSize: '0.85rem' }}>{firstRequest.targetName}</span>
              </div>
              {firstRequest.targetType === 'player' && firstRequest.targetUnitLabels?.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Units</span>
                  <span style={{ color: colors.purpleLight, fontWeight: '700', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px', textAlign: 'right' }}>
                    {firstRequest.targetUnitLabels.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                onClick={() => handleDenyRequest(firstRequest)}
                style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >
                ✕ Deny
              </button>
              <button
                onClick={() => handleApproveRequest(firstRequest)}
                style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >
                ✓ Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GM: Player Item Request Modal ── */}
      {isMultiplayer && firstItemRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>
                {firstItemRequest.action === 'drop' ? '🗑️' : firstItemRequest.action === 'useKey' ? '🔑' : firstItemRequest.action === 'pass' ? '🤝' : '✦'}
              </div>
              <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                Item Request
              </div>
              {queueBehindItem > 0 && (
                <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px' }}>
                  <span style={{ color: '#fca5a5', fontSize: '0.65rem', fontWeight: '800' }}>+{queueBehindItem} more pending</span>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</span>
                <span style={{ color: colors.gold, fontWeight: '700', fontSize: '0.85rem' }}>{firstItemRequest.playerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Item</span>
                <span style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{firstItemRequest.itemName}</span>
              </div>
              {firstItemRequest.itemDescription && (
                <div style={{ marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '0.72rem', lineHeight: '1.4', fontStyle: 'italic' }}>{firstItemRequest.itemDescription}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action</span>
                <span style={{ color: colors.amber, fontWeight: '700', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {firstItemRequest.action === 'useKey' ? 'Use Key' : firstItemRequest.action}
                </span>
              </div>
              {firstItemRequest.itemEffect && firstItemRequest.itemEffect !== 'none' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Effect</span>
                  <span style={{ color: colors.textMuted, fontWeight: '700', fontSize: '0.85rem' }}>{{
                    heal: '💚 Heal', maxHP: '❤️ Max HP Boost', attackBonus: '⚔️↑ Attack Bonus',
                    defenseBonus: '🛡️↑ Defense Bonus', shieldWall: '🛡️ Shield Wall',
                    counterStrike: '⚡ Counter Strike', cleanse: '✨ Cleanse',
                    fullCleanse: '✨✨ Full Cleanse', resurrect: '💫 Resurrect',
                    extraSlot: '🎒 Extra Item Slot', poisonVial: '🧪 Poison Vial',
                    stunGrenade: '💣 Stun Grenade', attackDebuffItem: '⚔️↓ Attack Debuff',
                    defenseDebuffItem: '🛡️↓ Defense Debuff', marked: '🎯 Marked',
                    destroyItem: '💥 Destroy Item', npcPlague: '☠️ NPC Plague',
                    playerPlague: '☠️ Player Plague', crownsFavor: '👑 Crown\'s Favor',
                    nullify: '🚫 Nullify', mirror: '🪞 Mirror', theGuy: '🎲 The Guy',
                    manual: '📋 Manual — see description above',
                  }[firstItemRequest.itemEffect] || firstItemRequest.itemEffect}</span>
                </div>
              )}
              {firstItemRequest.itemTag && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tag</span>
                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: {reactive:'#a78bfa',combat:'#f87171',prebattle:'#38bdf8',quest:'#fde68a'}[firstItemRequest.itemTag] || colors.textMuted }}>
                    {{'reactive':'⚡ Reactive','combat':'🗡️ Combat','prebattle':'🌅 Pre-Battle','quest':'🗝️ Quest'}[firstItemRequest.itemTag] || firstItemRequest.itemTag}
                  </span>
                </div>
              )}
            </div>

            {firstItemRequest.action === 'use' && !['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked','destroyItem','heal','maxHP','attackBonus','defenseBonus','shieldWall','counterStrike','cleanse','fullCleanse','resurrect','extraSlot'].includes(firstItemRequest.itemEffect) && (
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem', color: '#86efac', fontSize: '0.72rem' }}>
                ✓ Approving will automatically apply this effect and remove the item from inventory.
              </div>
            )}
            {firstItemRequest.action === 'pass' && (
              <div style={{ background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem', color: colors.amber, fontSize: '0.72rem' }}>
                🤝 Approving allows <strong>{firstItemRequest.playerName}</strong> to choose who to pass <strong>{firstItemRequest.itemName}</strong> to and whether to give or trade.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                onClick={() => handleDenyItemRequest(firstItemRequest)}
                style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >
                ✕ Deny
              </button>
              <button
                onClick={() => handleApproveItemRequest(firstItemRequest)}
                style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >
                ✓ Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GM: The Guy Confirm Modal ── */}
      {guyConfirmModal && isMultiplayer && (() => {
        const { req, player } = guyConfirmModal;
        const tier = req.itemTier || 'Common';
        const roll = req.guyRoll;
        const tierColor = { Common: colors.gold, Rare: '#a78bfa', Legendary: '#fbbf24' }[tier] || colors.gold;
        const tierBorder = { Common: 'rgba(201,169,97,0.4)', Rare: 'rgba(139,92,246,0.4)', Legendary: 'rgba(251,191,36,0.4)' }[tier] || 'rgba(201,169,97,0.4)';

        // Outcomes that need a unit picker on the DM side
        const needsUnitPicker = (tier === 'Common' && roll === 2) || (tier === 'Rare' && roll === 1) || (tier === 'Legendary' && roll === 4);
        // For revive, only show dead units with 0 revives
        const isRevive = tier === 'Legendary' && roll === 4;

        const unitOptions = (() => {
          if (!needsUnitPicker) return [];
          const units = [];
          if (!isRevive) {
            units.push({ key: 'commander', label: player.commanderStats?.customName || player.commander || 'Commander', hp: player.commanderStats?.hp, maxHp: player.commanderStats?.maxHp });
          }
          (player.subUnits || []).forEach((u, i) => {
            const key = i === 0 ? 'special' : `soldier${i}`;
            if (isRevive) {
              if (u.hp <= 0 && (u.livesRemaining ?? 1) <= 0) units.push({ key, label: u.name || key, hp: u.hp, maxHp: u.maxHp });
            } else {
              units.push({ key, label: u.name || key, hp: u.hp, maxHp: u.maxHp });
            }
          });
          return units;
        })();

        const canExecute = !needsUnitPicker || !!guyTargetUnit;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: '1rem' }}>
            <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${tierBorder}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎲</div>
                <div style={{ color: tierColor, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.08em' }}>The Guy — {tier}</div>
              </div>

              {/* Info rows */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Player', value: player.playerName, color: colors.gold },
                  { label: 'Item', value: req.itemName, color: colors.textPrimary },
                  { label: 'Tier', value: tier, color: tierColor },
                  { label: 'Rolled', value: `${roll} / 4`, color: tierColor },
                  { label: 'Effect', value: req.guyOutcomeLabel, color: '#86efac' },
                ].filter(Boolean).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{label}</span>
                    <span style={{ color, fontWeight: '700', fontSize: '0.82rem', textAlign: 'right', flex: 1 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Unit picker for heal/revive outcomes */}
              {needsUnitPicker && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    {isRevive ? 'Choose unit to revive (0hp, 0 revives):' : 'Choose unit to heal:'}
                  </div>
                  {unitOptions.length === 0 && (
                    <div style={{ color: '#f87171', fontSize: '0.72rem' }}>No eligible units found.</div>
                  )}
                  {unitOptions.map(u => (
                    <div key={u.key} onClick={() => setGuyTargetUnit({ unitKey: u.key, label: u.label })} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.45rem 0.7rem', borderRadius: '7px', cursor: 'pointer', marginBottom: '0.3rem',
                      background: guyTargetUnit?.unitKey === u.key ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${guyTargetUnit?.unitKey === u.key ? 'rgba(34,197,94,0.5)' : 'rgba(90,74,58,0.3)'}`,
                    }}>
                      <span style={{ color: guyTargetUnit?.unitKey === u.key ? '#86efac' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem' }}>{u.label}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.68rem' }}>{u.hp}/{u.maxHp}hp</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button onClick={() => setGuyConfirmModal(null)} style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Deny</button>
                <button disabled={!canExecute} onClick={() => handleExecuteGuy(req, player, guyTargetUnit ? { targetUnitKey: guyTargetUnit.unitKey, targetUnitLabel: guyTargetUnit.label } : {})} style={{ padding: '0.85rem', background: canExecute ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canExecute ? 'rgba(34,197,94,0.4)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: canExecute ? '#86efac' : colors.textDisabled, cursor: canExecute ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✓ Execute</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GM: Trade/Gift Final Confirmation ── */}
      {gmTradeResult && (() => {
        const r = gmTradeResult;

        const executeAndClose = () => {
          if (r.outcome === 'accepted') {
            const src = players.find(p => String(p.id) === String(r.p1Id));
            const tgt = players.find(p => String(p.id) === String(r.p2Id));
            if (src && tgt) {
              const myItem    = (src.inventory || []).find(it => it.id === r.p1ItemId);
              const theirItem = (tgt.inventory || []).find(it => it.id === r.p2ItemId);
              if (myItem && theirItem) {
                updatePlayer(src.id, { inventory: (src.inventory || []).filter(it => it.id !== myItem.id).concat({ ...theirItem, heldBy: r.p1HeldBy }) });
                updatePlayer(tgt.id, { inventory: (tgt.inventory || []).filter(it => it.id !== theirItem.id).concat({ ...myItem, heldBy: r.p2HeldBy }) });
                addLog(`✅ Trade complete: ${src.playerName} gave "${myItem.name}" ⇄ ${tgt.playerName} gave "${theirItem.name}"`, 'items');
              }
            }
          }
          setGmTradeResult(null);
        };

        // GM sees final confirmation only for accepted trades
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: '1rem' }}>
            <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(34,197,94,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⇄</div>
                <div style={{ color: '#86efac', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>Trade Agreed</div>
                <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.3rem' }}>Both players have accepted. Execute to swap items.</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{r.p1Name}</div>
                    <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.82rem' }}>{r.p1Item}</div>
                  </div>
                  <div style={{ color: colors.textFaint, fontSize: '1.2rem' }}>⇄</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{r.p2Name}</div>
                    <div style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.82rem' }}>{r.p2Item}</div>
                  </div>
                </div>
              </div>
              <button onClick={executeAndClose} style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>
                ✓ Execute Trade
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── The Guy Close Call epic modal ── */}
      {guyCloseCallModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(ellipse at center, rgba(10,7,0,0.97) 0%, rgba(0,0,0,0.99) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.75rem', lineHeight: 1 }}>🎲</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0.15em', fontFamily: '"Cinzel", Georgia, serif', background: 'linear-gradient(135deg, #fde68a, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
              THE GUY
            </div>
            <div style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: '700', marginBottom: '0.35rem', letterSpacing: '0.08em' }}>
              Legendary Protection
            </div>
            <div style={{ color: '#fde68a', fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              The Guy took {guyCloseCallModal.damage}hp damage for {guyCloseCallModal.playerName}
            </div>
            <div style={{ color: colors.textMuted, fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              The attack is completely negated.<br/>No damage. No effect. He handled it.
            </div>
            <div style={{ display: 'inline-block', padding: '0.4rem 1.5rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.1em', marginBottom: '2rem' }}>
              DAMAGE NEGATED
            </div>
            <br/>
            <button onClick={() => setGuyCloseCallModal(null)} style={{ padding: '0.75rem 2.5rem', background: 'linear-gradient(135deg, #78350f, #92400e)', border: '2px solid #d97706', borderRadius: '10px', color: '#fde68a', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* ── GM: Player Item Choice Confirmation ── */}
      {isMultiplayer && firstItemChoice && (() => {
        const req = firstItemChoice;
        const effectLabels = {
          heal: '💚 Heal', maxHP: '❤️ Max HP Boost', attackBonus: '⚔️↑ Attack Bonus',
          defenseBonus: '🛡️↑ Defense Bonus', shieldWall: '🛡️ Shield Wall',
          counterStrike: '⚡ Counter Strike', cleanse: '✨ Cleanse',
          fullCleanse: '✨✨ Full Cleanse', resurrect: '💫 Resurrect', extraSlot: '🎒 Extra Item Slot',
          poisonVial: '🧪 Poison Vial', stunGrenade: '💣 Stun Grenade',
          attackDebuffItem: '⚔️↓ Attack Debuff', defenseDebuffItem: '🛡️↓ Defense Debuff',
          marked: '🎯 Marked', destroyItem: '💥 Destroy Item',
        };
        const isEnemy  = req.targetType === 'enemy';
        const isSelf   = req.targetType === 'self';
        const isDestroy = req.targetType === 'destroyItem';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
            <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>✦</div>
                <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                  Item Effect — Confirm
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Player',  value: req.playerName,      color: colors.gold },
                  { label: 'Item',    value: req.itemName,         color: colors.textPrimary },
                  { label: 'Effect',  value: effectLabels[req.itemEffect] || req.itemEffect, color: colors.amber },
                  isSelf    && { label: 'Target Unit', value: req.targetUnitLabel, color: colors.purpleLight },
                  isEnemy   && { label: 'Target',      value: req.targetName,      color: '#fecaca' },
                  isEnemy   && req.targetUnitLabel && { label: 'Unit', value: req.targetUnitLabel, color: '#fecaca' },
                  isDestroy && { label: 'Destroying',  value: `"${req.destroyedItemName}"`, color: '#f87171' },
                  isDestroy && { label: 'From',        value: req.targetName,      color: '#fecaca' },
                ].filter(Boolean).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                    <span style={{ color, fontWeight: '700', fontSize: '0.85rem', textAlign: 'right', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button
                  onClick={() => { resolvePendingRequest(lobbyCode, req.reqId); if (req.choiceId) resolvePendingChoice(lobbyCode, req.choiceId); }}
                  style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
                >✕ Cancel</button>
                <button
                  onClick={() => handleExecuteItemChoice(req)}
                  style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
                >✓ Execute</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GM: Pass Choice Confirmation — player has chosen who + give/trade, GM approves to execute ── */}
      {isMultiplayer && firstPassChoice && !firstPassChoice.tradeAction && (() => {
        const req          = firstPassChoice;
        const sourcePlayer = players.find(p => String(p.id) === String(req.playerId));
        const targetPlayer = players.find(p => String(p.id) === String(req.passTargetPlayerId));
        if (!sourcePlayer || !targetPlayer) return null;
        const sourceItem   = req.itemId ? (sourcePlayer.inventory || []).find(it => it.id === req.itemId) : null;
        const isGive       = req.passMode === 'give';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
            <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${isGive ? 'rgba(34,197,94,0.4)' : 'rgba(167,139,250,0.4)'}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{isGive ? '🎁' : '⇄'}</div>
                <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                  {isGive ? 'Item Gift — Confirm' : 'Item Trade — Confirm'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'From', value: sourcePlayer.playerName, color: colors.gold },
                  { label: 'Item', value: sourceItem?.name || req.itemName, color: colors.textPrimary },
                  { label: 'To',   value: targetPlayer.playerName, color: colors.purpleLight },
                  { label: 'Mode', value: isGive ? 'Give (no return)' : 'Trade (target picks counter-item)', color: isGive ? '#86efac' : '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{label}</span>
                    <span style={{ color, fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button onClick={() => { resolvePendingRequest(lobbyCode, req.reqId); if (req.choiceId) resolvePendingChoice(lobbyCode, req.choiceId); }}
                  style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Deny</button>
                <button onClick={() => handleExecutePassChoice(req)}
                  style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✓ Approve</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GM: End Turn Request Modal ── */}
      {isMultiplayer && firstEndTurnRequest && !firstRequest && !firstItemRequest && !firstItemChoice && !firstPassChoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(16,185,129,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>⏭️</div>
              <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                End Turn Request
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</span>
                <span style={{ color: colors.gold, fontWeight: '700', fontSize: '0.9rem' }}>{firstEndTurnRequest.playerName}</span>
              </div>
              <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginTop: '0.6rem', lineHeight: 1.4 }}>
                Wants to end their turn and pass to the next player.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                onClick={() => handleDenyItemRequest(firstEndTurnRequest)}
                style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >✕ Deny</button>
              <button
                onClick={() => {
                  resolvePendingRequest(lobbyCode, firstEndTurnRequest.reqId);
                  addLog(`⏭️ ${firstEndTurnRequest.playerName} ended their turn.`, 'system');
                  campaign.endCampaignTurn();
                }}
                style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.2))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '10px', color: '#6ee7b7', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
              >✓ Approve</button>
            </div>
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
          npcAttackData={campaign.npcAttackData} players={players} npcs={npcs}
          onClose={campaign.closeNPCCalculator}
          onUpdatePlayer={updatePlayer}
          onAddLog={addLog}
          onCreateTimer={roundTimers.createTimer}
          onProceed={(updatedData) => {
            const seed = updatedData.preSeedDistribution || {};
            campaign.setNpcDamageDistribution(seed);
            campaign.setNpcAttackData(updatedData);
            campaign.setShowNPCCalculator(false);
            campaign.setShowNPCDamageDistribution(true);
          }}
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
          onUseCurrentStats={() => { vp.handleEndSession(); }}
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
      {/* ── NPC killed player unit — acknowledge and remove items ── */}
      {deathLootModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surfaces.elevated, border: `2px solid ${colors.redBorder}`, borderRadius: '12px', padding: '1.5rem', width: '390px', maxWidth: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💀</div>
              <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display }}>
                {deathLootModal.playerName ? `${deathLootModal.playerName}'s ` : ''}{deathLootModal.unitLabel} has fallen!
              </div>
              <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {deathLootModal.items.length === 1 ? 'This item was' : 'These items were'} dropped:
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {deathLootModal.items.map(item => {
                const tc = item.isQuestItem ? '#fde68a' : ({ Common: colors.textSecondary, Rare: '#a78bfa', Legendary: '#fbbf24' }[item.tier] || colors.textSecondary);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: `${tc}12`, border: `1px solid ${tc}35`, borderRadius: '7px' }}>
                    <span>{item.isQuestItem ? '🗝️' : '📦'}</span>
                    <span style={{ color: tc, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{item.name}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{item.isQuestItem ? 'Quest' : item.tier}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => {
              const droppedIds = new Set(deathLootModal.items.map(it => it.id));
              const p = players.find(pl => pl.id === deathLootModal.playerId);
              if (p) updatePlayer(p.id, { inventory: (p.inventory||[]).filter(it => !droppedIds.has(it.id)) });
              setDeathLootModal(null);
            }} style={{ width: '100%', padding: '0.75rem', background: colors.redSubtle, border: `1px solid ${colors.red}`, color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}>
              ✓ Acknowledged — Remove from Inventory
            </button>
          </div>
        </div>
      )}

      {/* ── Player killed player unit — take or drop ── */}
      {pvpDeathModal && (
        <PvPDeathModal
          {...pvpDeathModal}
          attackerPlayer={players.find(p => p.id === pvpDeathModal.attackerPlayer?.id) || pvpDeathModal.attackerPlayer}
          onConfirm={(takenItems, droppedItems) => {
            const { items, playerId, attackerPlayer, unitLabel, playerName } = pvpDeathModal;
            const allIds = new Set(items.map(it => it.id));
            const victim = players.find(p => String(p.id) === String(playerId));
            if (victim) updatePlayer(victim.id, { inventory: (victim.inventory||[]).filter(it => !allIds.has(it.id)) });
            if (takenItems.length > 0) {
              const freshAtk = players.find(p => p.id === attackerPlayer?.id);
              if (freshAtk) {
                // Each takenItem has { unitType, droppedItemId } in its selection
                // Remove any swapped-out items first, then add taken items with correct heldBy
                let newInv = [...(freshAtk.inventory||[])];
                takenItems.forEach(it => {
                  if (it.droppedItemId) newInv = newInv.filter(inv => inv.id !== it.droppedItemId);
                  newInv.push({ ...it, heldBy: it.unitType || attackerPlayer?.attackerUnitType });
                  addLog(`⚔️ ${freshAtk.playerName}'s ${loot.unitNameByType(freshAtk, it.unitType)} took "${it.name}" from ${playerName}'s ${unitLabel}`, 'items');
                });
                updatePlayer(freshAtk.id, { inventory: newInv });
              }
            }
            droppedItems.forEach(it => addLog(`🗺️ "${it.name}" dropped on the map by ${playerName}'s ${unitLabel}`), 'items');
            setPvpDeathModal(null);
          }}
          onClose={() => setPvpDeathModal(null)}
        />
      )}


      {/* ── Enemy Item Targeting Modal ── */}
      {enemyItemModal && (() => {
        const { sourcePlayer, item, isMirror, originalItemId } = enemyItemModal;
        const ef = item.effect;
        const dmgPerRound = ef.damagePerRound || 2;
        const duration = ef.duration || 1;
        const debuffVal = ef.debuffValue || 2;

        const consume = () => {
          if (!isMirror) {
            // Use item.id for non-mirror items; for mirror we already removed the source item when opening
            const freshSrc = players.find(p => String(p.id) === String(sourcePlayer.id));
            if (freshSrc) updatePlayer(sourcePlayer.id, { inventory: (freshSrc.inventory || []).filter(it => it.id !== item.id) });
          }
          setLastItemPlayed({ item, sourcePlayerId: sourcePlayer.id });
        };

        const targetMode = enemyTargetMode;
        const setTargetMode = setEnemyTargetMode;

        const applyToPlayerUnit = (targetPlayerId, unitType) => {
          const target = players.find(p => String(p.id) === String(targetPlayerId));
          if (!target) return;
          let statusEntry = null;
          if (ef.type === 'poisonVial')             statusEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false };
          else if (ef.type === 'stunGrenade')        statusEntry = { type: 'stun', duration, permanent: false };
          else if (ef.type === 'attackDebuffItem')   statusEntry = { type: 'attackDebuff', value: debuffVal, duration, permanent: false };
          else if (ef.type === 'defenseDebuffItem')  statusEntry = { type: 'defenseDebuff', value: debuffVal, duration, permanent: false };
          else if (ef.type === 'marked')             statusEntry = { type: 'marked', duration, permanent: false };
          if (!statusEntry) return;
          if (unitType === 'commander') {
            updatePlayer(target.id, { commanderStats: { ...target.commanderStats, statusEffects: [...(target.commanderStats.statusEffects || []), statusEntry] } });
          } else {
            const idx = unitType === 'special' ? 0 : parseInt(unitType.replace('soldier', ''));
            const newSubs = (target.subUnits || []).map((u, si) => si === idx ? { ...u, statusEffects: [...(u.statusEffects || []), statusEntry] } : u);
            updatePlayer(target.id, { subUnits: newSubs });
          }
          consume();
          addLog(`${isMirror ? '🪞 Mirror: ' : ''}${item.name} → ${target.playerName}'s ${unitType}`, 'items');
          setEnemyItemModal(null);
        };

        const applyToNPC = (npcId) => {
          let statusEntry = null;
          if (ef.type === 'poisonVial')             statusEntry = { type: 'poison', value: dmgPerRound, duration, permanent: false };
          else if (ef.type === 'stunGrenade')        statusEntry = { type: 'stun', duration, permanent: false };
          else if (ef.type === 'attackDebuffItem')   statusEntry = { type: 'attackDebuff', value: debuffVal, duration, permanent: false };
          else if (ef.type === 'defenseDebuffItem')  statusEntry = { type: 'defenseDebuff', value: debuffVal, duration, permanent: false };
          else if (ef.type === 'marked')             statusEntry = { type: 'marked', duration, permanent: false };
          if (!statusEntry) return;
          setNpcs(prev => prev.map(n => n.id === npcId ? { ...n, statusEffects: [...(n.statusEffects || []), statusEntry] } : n));
          const npc = npcs.find(n => n.id === npcId);
          consume();
          addLog(`${isMirror ? '🪞 Mirror: ' : ''}${item.name} → NPC "${npc?.name}"`, 'items');
          setEnemyItemModal(null);
        };

        const icon = ef.type === 'poisonVial' ? '🧪' : ef.type === 'stunGrenade' ? '💣' : ef.type === 'attackDebuffItem' ? '⚔️↓' : ef.type === 'defenseDebuffItem' ? '🛡️↓' : '🎯';
        const accentColor = ef.type === 'marked' ? '#f87171' : ef.type === 'poisonVial' ? '#4ade80' : ef.type === 'stunGrenade' ? '#fbbf24' : '#fca5a5';
        const accentBg = ef.type === 'marked' ? 'rgba(239,68,68,0.15)' : ef.type === 'poisonVial' ? 'rgba(34,197,94,0.12)' : ef.type === 'stunGrenade' ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)';
        const accentBorder = ef.type === 'marked' ? 'rgba(239,68,68,0.5)' : ef.type === 'poisonVial' ? 'rgba(34,197,94,0.4)' : ef.type === 'stunGrenade' ? 'rgba(251,191,36,0.4)' : 'rgba(239,68,68,0.4)';

        const enemies = players.filter(p => p.id !== sourcePlayer.id);
        const availableNPCs = activeNPCs.filter(n => !n.isDead);

        return (
          <div onClick={() => { setEnemyItemModal(null); setEnemyTargetMode(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `2px solid ${accentBorder}`, borderRadius: '12px', padding: '1.5rem', width: '440px', maxWidth: '95%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>{icon}</div>
                <div style={{ color: accentColor, fontWeight: '900', fontSize: '1rem', fontFamily: '"Cinzel",Georgia,serif' }}>{isMirror ? '🪞 ' : ''}{item.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  {ef.type === 'poisonVial' ? `${dmgPerRound}hp/round × ${duration}r` : ef.type === 'stunGrenade' ? `Stun ${duration}r` : ef.type === 'attackDebuffItem' ? `-${debuffVal} Atk × ${duration}r` : ef.type === 'defenseDebuffItem' ? `-${debuffVal} Def × ${duration}r` : `Marked ${duration}r`}
                </div>
              </div>

              {/* Step 1 — choose NPC or Player */}
              {!targetMode && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                  <button onClick={() => setTargetMode('npc')} style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.12)', border: `1px solid ${accentBorder}`, borderRadius: '8px', cursor: 'pointer', color: accentColor, fontFamily: '"Rajdhani",sans-serif', fontWeight: '800', fontSize: '0.9rem' }}>
                    👾 Target NPC<br/><span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: '600' }}>{availableNPCs.length} available</span>
                  </button>
                  <button onClick={() => setTargetMode('player')} style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.12)', border: `1px solid ${accentBorder}`, borderRadius: '8px', cursor: 'pointer', color: accentColor, fontFamily: '"Rajdhani",sans-serif', fontWeight: '800', fontSize: '0.9rem' }}>
                    🧑 Target Player<br/><span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: '600' }}>{enemies.length} player{enemies.length !== 1 ? 's' : ''}</span>
                  </button>
                </div>
              )}

              {/* Step 2a — NPC list */}
              {targetMode === 'npc' && (
                <div>
                  <button onClick={() => setTargetMode(null)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: '"Rajdhani",sans-serif' }}>← Back</button>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {availableNPCs.map(n => (
                      <div key={n.id} onClick={() => applyToNPC(n.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', background: accentBg, border: `1px solid ${accentBorder}` }}>
                        <span style={{ flex: 1, color: accentColor, fontWeight: '800', fontSize: '0.85rem' }}>{n.name}</span>
                        <span style={{ color: '#9ca3af', fontSize: '0.68rem' }}>{n.hp}/{n.maxHp}hp</span>
                      </div>
                    ))}
                    {availableNPCs.length === 0 && <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem', fontSize: '0.8rem' }}>No active NPCs</div>}
                  </div>
                </div>
              )}

              {/* Step 2b — Player unit list */}
              {targetMode === 'player' && (
                <div>
                  <button onClick={() => setTargetMode(null)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: '"Rajdhani",sans-serif' }}>← Back</button>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {enemies.map(enemy => {
                      const units = [
                        { unitType: 'commander', label: enemy.commanderStats?.customName || enemy.commander || 'Commander', icon: '⚔️', hp: enemy.commanderStats.hp, maxHp: enemy.commanderStats.maxHp },
                        ...(enemy.subUnits || []).filter(u => u.hp > 0).map((u, idx) => ({ unitType: idx === 0 ? 'special' : `soldier${idx}`, label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`), icon: idx === 0 ? '⭐' : '🛡️', hp: u.hp, maxHp: u.maxHp })),
                      ].filter(u => u.hp > 0);
                      return (
                        <div key={enemy.id} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{enemy.playerName}</div>
                          {units.map(u => (
                            <div key={u.unitType} onClick={() => applyToPlayerUnit(enemy.id, u.unitType)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.25rem', background: accentBg, border: `1px solid ${accentBorder}` }}>
                              <span>{u.icon}</span>
                              <span style={{ flex: 1, color: accentColor, fontWeight: '800', fontSize: '0.85rem' }}>{u.label}</span>
                              <span style={{ color: '#9ca3af', fontSize: '0.68rem' }}>{u.hp}/{u.maxHp}hp</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => { setEnemyItemModal(null); setEnemyTargetMode(null); }} style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontFamily: '"Rajdhani",sans-serif', fontWeight: '800', fontSize: '0.9rem' }}>✕ Cancel</button>
            </div>
          </div>
        );
      })()}

      <TimerExpiredToast notifications={roundTimers.expiredNotifications} />
      <TokenNotificationToast notifications={tokens.tokenNotifications} />

      {vp.awardShowcase && (
        <AwardShowcase
          showcase={vp.awardShowcase}
          onPrev={()   => vp.setAwardShowcase(prev => ({ ...prev, index: prev.index-1 }))}
          onNext={()   => vp.setAwardShowcase(prev => ({ ...prev, index: prev.index+1 }))}
          onFinish={()  => { vp.setAwardShowcase(null); vp.setVpCeremonyFinished(true); }}
        />
      )}
      {/* ── Player left toasts ── */}
      {isMultiplayer && leftToasts.length > 0 && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
          {leftToasts.map(t => (
            <div key={t.id} style={{ background: 'linear-gradient(135deg,#1a0f0a,#0f0805)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🚪</span>
                <div>
                  <div style={{ color: '#fca5a5', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>LEFT THE GAME</div>
                  <div style={{ color: '#e8dcc4', fontWeight: '700', fontSize: '0.82rem' }}>{t.playerName}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Player rejoin toasts ── */}
      {isMultiplayer && rejoinToasts.length > 0 && (
        <div style={{ position: 'fixed', top: leftToasts.length > 0 ? '5rem' : '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
          {rejoinToasts.map(t => (
            <div key={t.id} style={{ background: 'linear-gradient(135deg,#0a1a0f,#050f08)', border: '2px solid rgba(34,197,94,0.5)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔄</span>
                <div>
                  <div style={{ color: '#86efac', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>REJOINED</div>
                  <div style={{ color: '#e8dcc4', fontWeight: '700', fontSize: '0.82rem' }}>{t.playerName}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HPCounter;
