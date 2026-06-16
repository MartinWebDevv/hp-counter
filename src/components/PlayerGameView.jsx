import React from 'react';
import { colors, borders, fonts, hpBarColor, text, btn, tierColors, cardShell, insetSection, pill } from '../theme';
import { subscribeGameState, writePendingRequest, subscribePendingRequests, subscribePendingChoices, resolvePendingChoice, writePlayerNotes, subscribePlayerNotes } from '../services/gameStateService';
import { markPlayerLeft, subscribeGameEnded } from '../services/lobbyService';
import { getSlotCount, getHeldCount } from './lootUtils';

// Sort items: Common → Rare → Legendary → Quest at bottom
const TIER_ORDER = { Common: 0, Rare: 1, Legendary: 2 };
const sortItems = (items) => [...(items || [])].sort((a, b) => {
  if (a.isQuestItem && !b.isQuestItem) return 1;
  if (!a.isQuestItem && b.isQuestItem) return -1;
  return (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
});


import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';
import ItemChoiceScreen from './player/ItemChoiceScreen';
import ReadOnlyPlayerCard from './player/ReadOnlyPlayerCard';
import { GuyTargetPickScreen, GuyItemPickScreen } from './player/GuyScreens';
import { PassChoiceScreen, TradeRequestScreen, TradeReviewScreen, GiftNoticeScreen, TradeResultScreen } from './player/TradeScreens';
import { EndTurnButton, PlayerStatsPanel } from './player/PlayerUtils';
import { ReadOnlyNPCCard, NPCMovesetModal, EmptyState, navBtn, centeredPage } from './player/ReadOnlyNPCCard';

/**
 * PlayerGameView
 * The in-game screen for players (non-GM).
 * Read-only live view of the game state, synced from Firestore.
 * Tabs: My Character | Players | NPCs | Victory
 */
const TAG_STYLES = {
  reactive:  { color: '#a78bfa', label: 'Reactive',   icon: '⚡', desc: 'Use any time' },
  combat:    { color: '#f87171', label: 'Combat',     icon: '🗡️', desc: 'Use inside calculator' },
  prebattle: { color: '#38bdf8', label: 'Pre-Battle', icon: '🌅', desc: 'Use before battle' },
  quest:     { color: '#fde68a', label: 'Quest',      icon: '🗝️', desc: 'Carried only' },
};
const getItemTag = (item) =>
  TAG_STYLES[item.tag] || (item.isQuestItem ? TAG_STYLES.quest : TAG_STYLES.reactive);

const PlayerGameView = ({ lobbyCode, playerData, onLeaveGame = null }) => {
  const [gameState,   setGameState]   = React.useState(null);
  const [activeTab,     setActiveTab]     = React.useState('mine');
  const [playerIdx,     setPlayerIdx]     = React.useState(0);
  const [deniedToast,   setDeniedToast]   = React.useState(false);
  const [pendingChoice, setPendingChoice] = React.useState(null);
  const [destroyNotice, setDestroyNotice] = React.useState(null);
  const [npcFilter,     setNpcFilter]     = React.useState('All');
  const [movesetNpc,    setMovesetNpc]    = React.useState(null);
  const [logOpen,       setLogOpen]       = React.useState(false);
  const logCollapseRef    = React.useRef(null);
  const prevCombatIdRef   = React.useRef(null);
  const [ceremonyVP,    setCeremonyVP]    = React.useState({});
  const ceremonyAnimRef   = React.useRef(false);
  const vpCeremonyRef     = React.useRef(false);
  const [ceremonyDismissed, setCeremonyDismissed] = React.useState(false);

  // Reset dismissed when a new ceremony starts
  React.useEffect(() => {
    if (vpCeremonyRef.current) setCeremonyDismissed(false);
  }, [vpCeremonyRef.current]); // tracks vpCeremonyActive before gameState is available

  // Unconditional hook — runs every render but only acts when a new combat entry arrives
  React.useEffect(() => {
    const log = gameState?.combatLog || [];
    const sessionIdx = log.findIndex(e => e.message?.includes('New session started'));
    const sessionLog = sessionIdx === -1 ? log : log.slice(0, sessionIdx);
    const entries = sessionLog.filter(e => e.category === 'combat');
    const latest  = entries[0]?.id || null;
    if (latest && latest !== prevCombatIdRef.current) {
      prevCombatIdRef.current = latest;
      setLogOpen(true);
      if (logCollapseRef.current) clearTimeout(logCollapseRef.current);
      logCollapseRef.current = setTimeout(() => setLogOpen(false), 8000);
    }
  });

  // VP count-up animation when ceremony screen opens
  React.useEffect(() => {
    if (!vpCeremonyRef.current) { ceremonyAnimRef.current = false; return; }
    if (ceremonyAnimRef.current) return;
    ceremonyAnimRef.current = true;
    const getTotalVP = (p) => {
      const s = vpStats[p.id] || {};
      return (s.sessionAwards || []).reduce((t, a) => t + (a.pts || 0), 0)
           + (s.manualAwards  || []).reduce((t, a) => t + (a.points || 0), 0);
    };
    const targets = {};
    players.forEach(p => { targets[p.id] = getTotalVP(p); });
    const steps = 30; const duration = 900; const interval = duration / steps;
    let step = 0;
    const tick = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setCeremonyVP(() => {
        const d = {};
        players.forEach(p => { d[p.id] = Math.round((targets[p.id] || 0) * eased); });
        return d;
      });
      if (step >= steps) clearInterval(tick);
    }, interval);
    return () => clearInterval(tick);
  }, [vpCeremonyRef.current]);
  const [turnFlash,     setTurnFlash]     = React.useState(false);
  const [playerNotes,   setPlayerNotes]   = React.useState([]);
  const [notesDraft,    setNotesDraft]    = React.useState('');
  const [noteColor,     setNoteColor]     = React.useState('#fbbf24');
  const seenDenials = React.useRef(new Set());
  const seenChoices = React.useRef(new Set());
  const touchStartX = React.useRef(null);
  const prevIsMyTurn = React.useRef(false);

  // ── Live Firestore subscription ───────────────────────────────────────────
  React.useEffect(() => {
    if (!lobbyCode) return;
    const unsub = subscribeGameState(lobbyCode, (state) => {
      setGameState(state);
      // Detect if this player was kicked — their record will have isAbsent: true
      if (playerData?.uid || playerData?.id) {
        const myRecord = (state.players || []).find(p =>
          (playerData.uid && p.uid === playerData.uid) ||
          (playerData.id && String(p.id) === String(playerData.id))
        );
        if (myRecord?.isAbsent) {
          if (onLeaveGame) onLeaveGame();
        }
      }
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid, playerData?.id, onLeaveGame]);

  // ── Watch for GM denial notices ───────────────────────────────────────────
  React.useEffect(() => {
    if (!lobbyCode || !playerData?.uid) return;
    const unsub = subscribePendingRequests(lobbyCode, (requests) => {
      Object.values(requests).forEach(req => {
        if (
          req?.type === 'denied' &&
          req?.targetPlayerId === playerData.uid &&
          !seenDenials.current.has(req.reqId)
        ) {
          seenDenials.current.add(req.reqId);
          setDeniedToast(true);
          setTimeout(() => setDeniedToast(false), 3500);
        }
      });
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid]);

  // ── Watch for GM-approved item choices (pendingChoices → this player) ─────
  React.useEffect(() => {
    if (!lobbyCode || !playerData?.uid) return;
    const unsub = subscribePendingChoices(lobbyCode, (choices) => {
      Object.values(choices).forEach(choice => {
        if (!choice || seenChoices.current.has(choice.choiceId)) return;

        // destroyNotice targets the victim player
        if (choice.type === 'destroyNotice' && choice.targetPlayerId === playerData.uid) {
          seenChoices.current.add(choice.choiceId);
          setDestroyNotice(choice);
          return;
        }

        // Normal choice screens target the item user or trade participant
        const tradeTypes = ['tradeRequest', 'tradeReview', 'tradeResult', 'giftNotice'];
        if (choice.targetPlayerUid === playerData.uid && choice.type !== 'destroyNotice') {
          seenChoices.current.add(choice.choiceId);
          setPendingChoice(choice);
        }
      });
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid]);

  // ── Player notes — private per player, stored in Firestore by uid ─────────
  React.useEffect(() => {
    const uid = playerData?.uid;
    if (!uid) return;
    const unsub = subscribePlayerNotes(uid, (notes) => setPlayerNotes(notes));
    return () => unsub();
  }, [playerData?.uid]);

  const saveNote = async () => {
    if (!notesDraft.trim() || !playerData?.uid) return;
    const note = { id: Date.now(), text: notesDraft.trim(), color: noteColor, createdAt: new Date().toLocaleString() };
    const updated = [note, ...playerNotes];
    setPlayerNotes(updated);
    setNotesDraft('');
    try { await writePlayerNotes(playerData.uid, updated); } catch {}
  };

  const deletePlayerNote = async (id) => {
    const updated = playerNotes.filter(n => n.id !== id);
    setPlayerNotes(updated);
    try { await writePlayerNotes(playerData?.uid, updated); } catch {}
  };

  const editPlayerNote = async (id, text) => {
    const updated = playerNotes.map(n => n.id === id ? { ...n, text } : n);
    setPlayerNotes(updated);
    try { await writePlayerNotes(playerData?.uid, updated); } catch {}
  };

  // ── Watch for GM ending the game — redirect all players to home ───────────
  React.useEffect(() => {
    if (!lobbyCode || !onLeaveGame) return;
    const unsub = subscribeGameEnded(lobbyCode, () => { onLeaveGame(); });
    return () => unsub();
  }, [lobbyCode, onLeaveGame]);

  // ── Flash the screen when it becomes MY turn ──────────────────────────────
  // Must be above the early return. Derives isMyTurn inline from gameState.
  React.useEffect(() => {
    if (!gameState) return;
    const gs = gameState;
    const allPlayers = gs.players || [];
    const cpIdx = gs.currentPlayerIndex ?? 0;
    const ccpId = gs.currentCampaignPlayerId ?? null;
    const isCampaign = gs.gameMode === 'campaign';
    const turnPlayer = isCampaign
      ? (ccpId ? allPlayers.find(p => p.id === ccpId) || null : null)
      : (allPlayers[cpIdx] || null);
    const myTurn = !!(turnPlayer && (
      turnPlayer.uid === playerData?.uid ||
      (playerData?.id && String(turnPlayer.id) === String(playerData.id))
    ));
    if (myTurn && !prevIsMyTurn.current) {
      setTurnFlash(true);
      const t = setTimeout(() => setTurnFlash(false), 800);
      prevIsMyTurn.current = true;
      return () => clearTimeout(t);
    }
    if (!myTurn) prevIsMyTurn.current = false;
  }, [gameState, playerData?.uid, playerData?.id]);

  if (!gameState) {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚔️</div>
        <div style={{ color: colors.textMuted, fontFamily: fonts.body }}>Connecting to session...</div>
      </div>
    );
  }

  const players      = gameState.players     || [];
  const allNpcs      = (gameState.npcs       || []).filter(n => !n.isDead);
  const npcs         = allNpcs.filter(n => n.active);
  const vpStats      = gameState.vpStats     || {};
  const currentRound = gameState.currentRound || 1;
  const combatLog    = gameState.combatLog   || [];
  const vpCeremonyActive   = gameState.vpCeremonyActive   || false;
  vpCeremonyRef.current    = vpCeremonyActive;
  const vpCeremonyFinished = gameState.vpCeremonyFinished || false;
  const vpCeremonySession  = gameState.vpCeremonySession  || '';
  const vpAwardShowcase    = gameState.vpAwardShowcase    || null;
  // Only show entries from the current session — everything after the last "new session" marker
  // Log is newest-first, so find the first (most recent) new-session entry and take everything before it
  const lastSessionIdx = combatLog.findIndex(e => e.message?.includes('New session started'));
  const currentSessionLog = lastSessionIdx === -1 ? combatLog : combatLog.slice(0, lastSessionIdx);
  const combatEntries  = currentSessionLog.filter(e => e.category === 'combat').slice(0, 20);
  const latestCombatId = combatEntries[0]?.id || null;

  // Find this player's own entry by uid (must be before turn derivation)
  // Use id as fallback for mid-session joiners whose uid may not have synced yet
  const myPlayer = players.find(p => p.uid === playerData?.uid)
    || players.find(p => String(p.id) === String(playerData?.id))
    || null;

  // Derive whose turn it is
  // Standard mode: currentPlayerIndex is an index into the full players array
  // Campaign mode: currentCampaignPlayerId is the exact player id whose turn it is
  const currentPlayerIndex     = gameState.currentPlayerIndex     ?? 0;
  const currentCampaignPlayerId = gameState.currentCampaignPlayerId ?? null;
  const isCampaignMode          = gameState.gameMode === 'campaign';

  const activeTurnPlayer = isCampaignMode
    ? (currentCampaignPlayerId ? players.find(p => p.id === currentCampaignPlayerId) || null : null)
    : (players[currentPlayerIndex] || null);

  const isMyTurn = !!(activeTurnPlayer && (
    activeTurnPlayer.uid === playerData?.uid ||
    activeTurnPlayer.id  === myPlayer?.id
  ));

  // Filter out absent players for the Players tab carousel
  const visiblePlayers = players.filter(p => !p.isAbsent);

  // Clamp playerIdx for carousel
  const safeIdx = Math.min(playerIdx, Math.max(0, visiblePlayers.length - 1));

  const tabs = [
    { id: 'mine',    label: '⚔️ Mine'    },
    { id: 'players', label: '👥 Players' },
    { id: 'npcs',    label: '👾 NPCs'    },
    { id: 'notes',   label: '📝 Notes'   },
    { id: 'victory', label: '🏆 Victory' },
  ];

  // ── VP Ceremony Screen — takes over when GM begins awards ─────────────────
  if (vpCeremonyActive && !ceremonyDismissed) {
    const getTotalVP = (p) => {
      const s = vpStats[p.id] || {};
      return (s.sessionAwards || []).reduce((t, a) => t + (a.pts || 0), 0)
           + (s.manualAwards  || []).reduce((t, a) => t + (a.points || 0), 0);
    };
    const ranked    = [...players].sort((a, b) => getTotalVP(b) - getTotalVP(a));
    const rankBadge = ['🥇','🥈','🥉'];
    // Use myPlayer only — no ranked[0] fallback (would show wrong player's data to everyone)
    const me        = myPlayer || null;
    const myRank    = me ? ranked.findIndex(p => p.id === me.id) : -1;
    const myStats   = me ? (vpStats[me.id] || {}) : {};
    // Filter sessionAwards to current session only
    const mySessionAwards = vpCeremonySession
      ? (myStats.sessionAwards || []).filter(a => a.sessionName === vpCeremonySession)
      : (myStats.sessionAwards || []);
    // Filter manualAwards to current session only — stamped by runAwardsFromData
    const myManualAwards = (myStats.manualAwards || []).filter(a =>
      !a.sessionName || a.sessionName === vpCeremonySession
    );
    const myAwards  = [...mySessionAwards, ...myManualAwards];
    const myVP      = myAwards.reduce((t, a) => t + (a.pts || a.points || 0), 0);
    const isFirst   = me && myRank === 0;
    const pColor    = me?.playerColor || colors.gold;

    // ── Phase 1: Mirror the GM's award card ──
    // ── Phase 1: Mirror the GM's award card ──
    if (!vpCeremonyFinished) {
      const award = vpAwardShowcase?.awards?.[vpAwardShowcase.index] || null;
      const total = vpAwardShowcase?.awards?.length || 0;
      const idx   = vpAwardShowcase?.index ?? 0;
      const sessionName = vpAwardShowcase?.sessionName || '';

      const valLabel = award ? (() => {
        if (award.isManual)                          return award.label;
        if (award.categoryId === 'itemsObtained')    return `${award.value} items obtained`;
        if (award.categoryId === 'leastDeaths')      return `only ${award.value} revives used`;
        if (award.categoryId === 'immortal')         return 'not a single death all session';
        if (award.categoryId === 'leastDamageTaken') return `only ${award.value} damage taken`;
        if (award.categoryId === 'finalBossKill')    return 'delivered the killing blow';
        if (award.categoryId === 'firstBlood')       return 'drew first blood this session';
        if (award.categoryId === 'warmonger')        return `initiated ${award.value} attacks`;
        return `${award.value} damage dealt`;
      })() : null;

      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: fonts.body }}>
          {award ? (
            <div style={{ background: '#1a0f0a', border: '3px solid rgba(251,191,36,0.7)', borderRadius: '16px', padding: '2rem 1.5rem', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
                {sessionName} · Award {idx + 1} of {total}
              </div>
              <div style={{ fontSize: '5rem', marginBottom: '0.75rem', lineHeight: 1 }}>{award.icon}</div>
              <div style={{ color: colors.textSecondary, fontWeight: '800', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{award.label}</div>
              {award.desc && <div style={{ color: colors.textFaint, fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.85rem', fontStyle: 'italic' }}>{award.desc}</div>}
              <div style={{ color: award.playerColor || colors.gold, fontWeight: '900', fontSize: '2rem', marginBottom: '0.4rem', textShadow: `0 0 20px ${award.playerColor || colors.gold}66` }}>
                {award.playerName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {valLabel && <div style={{ color: colors.textMuted, fontSize: '0.82rem', padding: '0.35rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>{valLabel}</div>}
                <div style={{ padding: '0.5rem 2rem', background: 'rgba(251,191,36,0.12)', border: '2px solid rgba(251,191,36,0.5)', borderRadius: '10px', color: '#fbbf24', fontWeight: '900', fontSize: '1.75rem', letterSpacing: '0.05em' }}>+{award.pts} VP</div>
              </div>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                Waiting for GM to continue...
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'crownBounce 1.5s ease-in-out infinite' }}>🏆</div>
              <div style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.14em' }}>SESSION AWARDS</div>
              <div style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '0.5rem' }}>The GM is presenting awards...</div>
            </div>
          )}
          <style>{`
            @keyframes crownBounce {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-8px) scale(1.1); }
            }
          `}</style>
        </div>
      );
    }

    // ── Phase 2: Final sheet — shown after GM clicks Finish ──
    return (
      <div style={{ minHeight: '100svh', background: me ? `radial-gradient(ellipse at center, ${pColor}12 0%, #0a0404 60%)` : 'linear-gradient(145deg,#0a0505,#100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: fonts.body, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '1.5rem 1rem', paddingTop: '3rem', boxSizing: 'border-box', position: 'relative' }}>

        {/* X dismiss button */}
        <button onClick={() => setCeremonyDismissed(true)} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.35rem', display: 'inline-block', animation: isFirst ? 'crownBounce 2s ease-in-out infinite' : 'none' }}>
            {me ? (rankBadge[myRank] || `#${myRank + 1}`) : '🏆'}
          </div>
          <div style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.14em' }}>FINAL STANDINGS</div>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Session complete</div>
        </div>

        {/* My VP card */}
        {me && (
          <div style={{ background: `linear-gradient(135deg, ${pColor}18, rgba(0,0,0,0.5))`, border: `2px solid ${pColor}40`, borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '380px', textAlign: 'center', marginBottom: '1.25rem', animation: isFirst ? 'vpGoldGlow 4s ease-in-out infinite' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pColor, boxShadow: `0 0 8px ${pColor}` }} />
              <div style={{ color: pColor, fontWeight: '900', fontSize: '0.9rem' }}>{me.playerName}</div>
            </div>
            {/* Overall total across all sessions */}
            <div style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '4rem', fontWeight: '900', lineHeight: 1, textShadow: `0 0 30px ${colors.amber}60` }}>{getTotalVP(me)}</div>
            <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.35rem' }}>
              Total Victory Points · Rank {myRank + 1} of {ranked.length}
            </div>
            {myVP > 0 && (
              <div style={{ marginTop: '0.5rem', padding: '0.2rem 0.75rem', background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '6px', display: 'inline-block' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>Earned this session: </span>
                <span style={{ color: colors.gold, fontWeight: '900', fontSize: '0.72rem', fontFamily: fonts.display }}>+{myVP}</span>
              </div>
            )}
          </div>
        )}

        {/* My awards — VP total + 2 column grid */}
        {myAwards.length > 0 && (
          <div style={{ width: '100%', maxWidth: '380px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ color: colors.textFaint, fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: '800' }}>
                Your Awards This Session
              </div>
              <div style={{ padding: '0.15rem 0.6rem', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '6px', color: '#fbbf24', fontWeight: '900', fontSize: '0.78rem', fontFamily: fonts.display }}>
                +{myVP} VP total
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {myAwards.map((a, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,97,0.18)', borderRadius: '10px', textAlign: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{a.icon || '🏅'}</span>
                  <div style={{ color: colors.textPrimary, fontWeight: '800', fontSize: '0.72rem', lineHeight: 1.2 }}>{a.label || a.reason || 'Award'}</div>
                  {a.desc && <div style={{ color: colors.textFaint, fontSize: '0.58rem', lineHeight: 1.3 }}>{a.desc}</div>}
                  <div style={{ padding: '0.2rem 0.65rem', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px', color: '#fbbf24', fontWeight: '900', fontSize: '0.88rem', fontFamily: fonts.display, marginTop: '0.1rem' }}>
                    +{a.pts || a.points || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {myAwards.length === 0 && (
          <div style={{ width: '100%', maxWidth: '380px', marginBottom: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', textAlign: 'center', color: colors.textFaint, fontSize: '0.75rem' }}>
            No awards earned this session
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '2rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: '800' }}>Overall Standings</div>
          {ranked.map((p, i) => {
            const vp   = getTotalVP(p);
            const isMe = me && p.id === me.id;
            const pCol = p.playerColor || colors.gold;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', background: isMe ? `${pCol}12` : 'rgba(0,0,0,0.25)', border: `1px solid ${isMe ? pCol + '35' : 'rgba(255,255,255,0.05)'}`, borderRadius: '8px', marginBottom: '0.3rem', boxShadow: i === 0 ? '0 0 12px rgba(251,191,36,0.08)' : 'none' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, display: 'inline-block', animation: i === 0 ? 'crownPulse 2.5s ease-in-out infinite' : 'none' }}>{rankBadge[i] || `#${i+1}`}</span>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: pCol, flexShrink: 0 }} />
                <span style={{ flex: 1, color: isMe ? pCol : colors.textPrimary, fontWeight: isMe ? '900' : '700', fontSize: '0.82rem' }}>
                  {p.playerName}{isMe && <span style={{ color: pCol, fontSize: '0.6rem', marginLeft: '0.3rem' }}>· you</span>}
                </span>
                <span style={{ fontFamily: fonts.display, color: i === 0 ? colors.gold : colors.textMuted, fontWeight: '900', fontSize: '1rem' }}>{vp}</span>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes crownBounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-6px) scale(1.12); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pv-root" style={{ height: 'auto', minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overflowX: 'hidden', background: 'linear-gradient(145deg,#0a0505,#100808)', fontFamily: fonts.body, paddingBottom: '5rem', width: '100%', boxSizing: 'border-box' }}>

      {/* Your turn flash overlay */}
      {turnFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', animation: 'turnFlashAnim 0.8s ease-out forwards' }} />
      )}

      {/* Denied toast */}
      {deniedToast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg,#1a0505,#0f0303)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '10px', padding: '0.75rem 1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', gap: '0.6rem', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '1.1rem' }}>🚫</span>
          <span style={{ color: '#fca5a5', fontWeight: '800', fontSize: '0.88rem', fontFamily: fonts.body }}>The GM has denied your request</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerData?.playerName || playerData?.commanderName || 'Player'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerData?.faction} · Lobby: {lobbyCode}
          </div>
        </div>
        <div style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.25)', borderRadius: '8px', padding: '0.35rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Round</div>
          <div style={{ color: colors.gold, fontWeight: '900', fontSize: '1.1rem', lineHeight: 1 }}>{currentRound}</div>
        </div>
        {onLeaveGame && (
          <button
            onClick={async () => {
              if (!window.confirm('Leave this game? The GM will take control of your character.')) return;
              try {
                await markPlayerLeft(lobbyCode, playerData?.uid, playerData?.playerName || 'Player');
              } catch {}
              onLeaveGame();
            }}
            style={{ padding: '0.4rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.65rem', letterSpacing: '0.05em', flexShrink: 0 }}
          >🚪 Leave</button>
        )}
      </div>

      {/* Tab bar */}
      <div className="pv-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '0.75rem 0.5rem', border: 'none', cursor: 'pointer',
            background: 'transparent', fontFamily: fonts.body, fontWeight: '700',
            fontSize: '0.72rem', whiteSpace: 'nowrap',
            color: activeTab === tab.id ? colors.gold : colors.textMuted,
            borderBottom: `2px solid ${activeTab === tab.id ? colors.gold : 'transparent'}`,
            transition: 'all 0.15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Turn indicator — always rendered, shows last known turn player to prevent flicker */}
      {(() => {
        const turnPlayer = activeTurnPlayer;
        const pColor = turnPlayer?.playerColor || colors.gold;
        return (
          <div style={{
            padding: '0.5rem 1rem',
            background: isMyTurn
              ? `linear-gradient(90deg, ${pColor}18, transparent)`
              : 'rgba(0,0,0,0.3)',
            borderBottom: `1px solid ${isMyTurn ? pColor + '40' : 'rgba(255,255,255,0.04)'}`,
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            minHeight: '36px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: pColor,
              boxShadow: turnPlayer ? `0 0 8px ${pColor}` : 'none',
              flexShrink: 0,
              animation: turnPlayer ? 'turnPulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '0.4rem' }}>
                {isMyTurn ? 'YOUR TURN' : 'ACTIVE TURN'}
              </span>
              <span style={{
                color: isMyTurn ? pColor : colors.textPrimary,
                fontWeight: '800', fontSize: '0.82rem',
              }}>
                {isMyTurn ? "It's your turn!" : (turnPlayer?.playerName || '—')}
              </span>
            </div>
            {isMyTurn && !isCampaignMode && (
              <span style={{ color: pColor, fontSize: '0.7rem', fontWeight: '800', animation: 'turnPulse 1.5s ease-in-out infinite' }}>⚔️</span>
            )}
            {isMyTurn && isCampaignMode && (
              <EndTurnButton lobbyCode={lobbyCode} player={myPlayer} pColor={pColor} />
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="pv-content" style={{ padding: '1rem', maxWidth: '700px', width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingBottom: '3rem', overflowX: 'hidden' }}>

        {/* ── My Character ─────────────────────────────────────────────── */}
        {activeTab === 'mine' && (
          myPlayer
            ? (
              <>
                <ReadOnlyPlayerCard player={myPlayer} highlight isOwnCard lobbyCode={lobbyCode} npcs={npcs} allPlayers={players} />
                <PlayerStatsPanel player={myPlayer} />
              </>
            )
            : <EmptyState icon="👤" text="Your character hasn't been added to the game yet." />
        )}

        {/* ── Players carousel ─────────────────────────────────────────── */}
        {activeTab === 'players' && (
          visiblePlayers.length === 0
            ? <EmptyState icon="👥" text="No players in the session yet." />
            : (() => {
              const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
              const handleTouchEnd = (e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) < 40) return;
                if (dx < 0) setPlayerIdx(i => Math.min(visiblePlayers.length - 1, i + 1));
                if (dx > 0) setPlayerIdx(i => Math.max(0, i - 1));
                touchStartX.current = null;
              };
              return (
                <div style={{ width: '100%', minWidth: 0 }}>
                  {/* Dot indicator row — arrows hidden on touch screens via CSS, dots always shown */}
                  <div className="pv-carousel-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
                    <button className="pv-carousel-arrow" onClick={() => setPlayerIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0} style={navBtn(safeIdx === 0)}>←</button>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ color: colors.textMuted, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Player {safeIdx + 1} of {visiblePlayers.length}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        {visiblePlayers.map((p, i) => (
                          <div key={p.id} onClick={() => setPlayerIdx(i)} style={{ width: i === safeIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === safeIdx ? (p.playerColor || colors.gold) : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all 0.2s' }} />
                        ))}
                      </div>
                    </div>
                    <button className="pv-carousel-arrow" onClick={() => setPlayerIdx(i => Math.min(visiblePlayers.length - 1, i + 1))} disabled={safeIdx === visiblePlayers.length - 1} style={navBtn(safeIdx === visiblePlayers.length - 1)}>→</button>
                  </div>
                  {/* Card — swipeable on touch */}
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{ width: '100%', overflow: 'hidden', boxSizing: 'border-box', touchAction: 'pan-y' }}
                  >
                    <ReadOnlyPlayerCard player={visiblePlayers[safeIdx]} />
                  </div>
                </div>
              );
            })()
        )}

        {/* ── NPCs ─────────────────────────────────────────────────────── */}
        {activeTab === 'npcs' && (() => {
          const allGameNpcs = gameState.npcs || [];
          const filteredNpcs = npcFilter === 'All'
            ? allGameNpcs
            : npcFilter === 'Active'
              ? allGameNpcs.filter(n => n.active && !n.isDead)
              : npcFilter === 'Inactive'
                ? allGameNpcs.filter(n => !n.active && !n.isDead)
                : allGameNpcs.filter(n => n.isDead);

          return (
            <>
              {/* Filter pills */}
              <div className="pv-npc-filters" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                {['All', 'Active', 'Inactive', 'Dead'].map(f => (
                  <button key={f} onClick={() => setNpcFilter(f)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer',
                    fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem', letterSpacing: '0.05em',
                    border: `1px solid ${npcFilter === f
                      ? f === 'Active' ? 'rgba(239,68,68,0.6)'
                        : f === 'Dead' ? 'rgba(107,114,128,0.6)'
                        : f === 'Inactive' ? 'rgba(201,169,97,0.4)'
                        : 'rgba(255,255,255,0.2)'
                      : 'rgba(255,255,255,0.08)'}`,
                    background: npcFilter === f
                      ? f === 'Active' ? 'rgba(239,68,68,0.12)'
                        : f === 'Dead' ? 'rgba(107,114,128,0.12)'
                        : f === 'Inactive' ? 'rgba(201,169,97,0.08)'
                        : 'rgba(255,255,255,0.06)'
                      : 'transparent',
                    color: npcFilter === f
                      ? f === 'Active' ? '#fca5a5'
                        : f === 'Dead' ? '#9ca3af'
                        : f === 'Inactive' ? colors.gold
                        : colors.textPrimary
                      : colors.textFaint,
                  }}>{f} {f !== 'All' && `(${
                    f === 'Active' ? allGameNpcs.filter(n => n.active && !n.isDead).length
                    : f === 'Inactive' ? allGameNpcs.filter(n => !n.active && !n.isDead).length
                    : allGameNpcs.filter(n => n.isDead).length
                  })`}</button>
                ))}
              </div>
              {filteredNpcs.length === 0
                ? <EmptyState icon="👾" text={`No ${npcFilter.toLowerCase()} enemies.`} />
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredNpcs.map(npc => (
                      <ReadOnlyNPCCard key={npc.id} npc={npc} onShowMoveset={setMovesetNpc} />
                    ))}
                  </div>
                )
              }
            </>
          );
        })()}

        {/* ── Victory ───────────────────────────────────────────────────── */}
        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ padding: '0 0.25rem', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {/* Color picker + composer */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.35)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em' }}>COLOR</span>
                {['#fbbf24','#86efac','#f9a8d4','#93c5fd','#fca5a5','#c4b5fd'].map(c => (
                  <div key={c} onClick={() => setNoteColor(c)} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0, border: noteColor === c ? '2px solid white' : '2px solid transparent', touchAction: 'manipulation' }} />
                ))}
              </div>
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(90,74,58,0.4)', borderRadius: '8px', color: colors.textPrimary, padding: '0.6rem 0.75rem', fontFamily: fonts.body, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', marginBottom: '0.5rem' }}
              />
              <button onClick={saveNote} disabled={!notesDraft.trim()} style={{ width: '100%', padding: '0.75rem', background: notesDraft.trim() ? 'linear-gradient(135deg,rgba(201,169,97,0.2),rgba(120,80,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${notesDraft.trim() ? 'rgba(201,169,97,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '8px', color: notesDraft.trim() ? colors.gold : colors.textDisabled, cursor: notesDraft.trim() ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', touchAction: 'manipulation' }}>
                📝 Save Note
              </button>
            </div>

            {/* Notes list */}
            {playerNotes.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.78rem', padding: '2rem 1rem' }}>No notes yet. Write something above.</div>
            )}
            {playerNotes.map(note => (
              <div key={note.id} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${note.color || '#fbbf24'}40`, borderLeft: `3px solid ${note.color || '#fbbf24'}`, borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => editPlayerNote(note.id, e.currentTarget.textContent)}
                    style={{ color: colors.textPrimary, fontSize: '0.85rem', lineHeight: '1.5', flex: 1, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.2em' }}
                  >
                    {note.text}
                  </div>
                  <button onClick={() => deletePlayerNote(note.id)} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '1rem', padding: '0', flexShrink: 0, touchAction: 'manipulation' }}>✕</button>
                </div>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', marginTop: '0.35rem' }}>{note.createdAt} · Tap to edit</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'victory' && (() => {
          // ── VP helpers (match DM logic exactly) ──────────────────────
          const getTotalVP = (playerId) => {
            const s = vpStats[playerId] || {};
            const fromSessions = (s.sessionAwards || []).reduce((acc, a) => acc + (a.pts || 0), 0);
            const fromManual   = (s.manualAwards  || []).reduce((acc, a) => acc + (a.points || 0), 0);
            return fromSessions + fromManual;
          };

          const LIVE_STAT_ROWS = [
            { key: 'npcDamage',     label: '🐉 NPC Damage',       unit: 'hp'      },
            { key: 'pvpDamage',     label: '⚔️ PvP Damage',       unit: 'hp'      },
            { key: 'damageTaken',   label: '🛡️ Damage Taken',     unit: 'hp'      },
            { key: 'itemsObtained', label: '📦 Items Obtained',   unit: 'items'   },
            { key: 'revivesUsed',   label: '💀 Revives Used',     unit: 'times'   },
            { key: 'finalBossKill', label: '👑 Final Boss Kill',  unit: ''        },
            { key: 'firstBlood',    label: '🩸 First Blood',      unit: ''        },
            { key: 'warmonger',     label: '⚡ Attacks Made',     unit: 'attacks' },
          ];

          const ranked = [...players]
            .map(p => ({ ...p, totalVP: getTotalVP(p.id) }))
            .sort((a, b) => b.totalVP - a.totalVP);

          const rankBadge = ['👑', '🥈', '🥉'];

          // ── Per-player expandable card ────────────────────────────────
          const VPCard = ({ p, rank }) => {
            const [open, setOpen] = React.useState(false);
            const isMe    = myPlayer && String(p.id) === String(myPlayer.id);
            const pColor  = p.playerColor || colors.blue;
            const s       = vpStats[p.id] || {};
            const sessionAwards = s.sessionAwards || [];
            const manualAwards  = s.manualAwards  || [];
            const isFirst = rank === 0;

            // Group session awards by session name
            const sessionGroups = sessionAwards.reduce((acc, a) => {
              const key = a.sessionName || 'Unnamed Session';
              if (!acc[key]) acc[key] = [];
              acc[key].push(a);
              return acc;
            }, {});
            const sessionNames = Object.keys(sessionGroups);

            // Live stats — only non-zero rows
            const liveRows = LIVE_STAT_ROWS.filter(r => (s[r.key] || 0) > 0 || r.key === 'finalBossKill' && s[r.key]);
            const hasAnyLive = liveRows.length > 0;
            const hasHistory = sessionAwards.length > 0 || manualAwards.length > 0;

            return (
              <div style={{
                background: isFirst ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${isFirst ? 'rgba(201,169,97,0.25)' : open && isMe ? pColor + '40' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}>
                {/* Row */}
                <div
                  onClick={() => isMe && setOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    cursor: isMe ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ color: isFirst ? colors.gold : colors.textFaint, fontWeight: '900', fontSize: '1.1rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                    {rankBadge[rank] || `#${rank + 1}`}
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isMe ? pColor : colors.textPrimary, fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.playerName}{isMe ? ' (you)' : ''}
                    </div>
                    <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>{p.faction}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: isFirst ? colors.gold : colors.amber, fontWeight: '900', fontSize: '1.3rem', lineHeight: 1 }}>
                      {p.totalVP}
                      <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '600', marginLeft: '0.2rem' }}>VP</span>
                    </div>
                    {isMe && (
                      <div style={{ color: colors.textFaint, fontSize: '0.58rem', marginTop: '0.2rem', fontWeight: '700' }}>
                        {open ? 'tap to close ▲' : 'tap for details ▼'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded breakdown — only for own card */}
                {open && isMe && (
                  <div style={{ borderTop: `1px solid ${pColor}25`, padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)' }}>

                    {/* Live session stats */}
                    <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      📊 Live Session Stats
                    </div>
                    {hasAnyLive ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.85rem' }}>
                        {LIVE_STAT_ROWS.map(r => {
                          const val = s[r.key] || 0;
                          if (!val) return null;
                          const display = r.key === 'finalBossKill' ? (val > 0 ? 'YES' : null) : val;
                          if (!display) return null;
                          return (
                            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${pColor}20`, borderRadius: '6px' }}>
                              <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{r.label}</span>
                              <span style={{ color: pColor, fontSize: '0.72rem', fontWeight: '900' }}>
                                {display}{r.unit ? ` ${r.unit}` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: colors.textFaint, fontSize: '0.72rem', textAlign: 'center', padding: '0.5rem', marginBottom: '0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        No stats recorded this session yet.
                      </div>
                    )}

                    {/* Session award history */}
                    {sessionNames.length > 0 && (
                      <>
                        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                          🏆 Award History
                        </div>
                        {sessionNames.map(sessName => (
                          <div key={sessName} style={{ marginBottom: '0.6rem' }}>
                            <div style={{ color: colors.amber, fontSize: '0.62rem', fontWeight: '800', marginBottom: '0.3rem' }}>
                              📅 {sessName}
                            </div>
                            {sessionGroups[sessName].map((a, ai) => (
                              <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.55rem', background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.15)', borderRadius: '5px', marginBottom: '0.18rem' }}>
                                <span style={{ color: colors.textPrimary, fontSize: '0.72rem', fontWeight: '700' }}>{a.icon} {a.label}</span>
                                <span style={{ color: colors.gold, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.pts} VP</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Manual / DM awards */}
                    {manualAwards.length > 0 && (
                      <>
                        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', marginTop: sessionNames.length > 0 ? '0.25rem' : 0 }}>
                          🏅 DM Awards
                        </div>
                        {manualAwards.map((a, ai) => (
                          <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.55rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '5px', marginBottom: '0.18rem' }}>
                            <span style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '700' }}>🏅 {a.reason}</span>
                            <span style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>+{a.points} VP</span>
                          </div>
                        ))}
                      </>
                    )}

                    {!hasAnyLive && !hasHistory && (
                      <div style={{ color: colors.textFaint, fontSize: '0.72rem', textAlign: 'center', padding: '0.5rem' }}>
                        No awards yet this campaign.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          };

          return players.length === 0
            ? <EmptyState icon="🏆" text="No players yet." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>
                  Victory Points
                </div>
                {ranked.map((p, i) => <VPCard key={p.id} p={p} rank={i} />)}
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', textAlign: 'center', marginTop: '0.25rem' }}>
                  Tap your name to see your full breakdown
                </div>
              </div>
            );
        })()}

        {/* ── Combat Log Strip ─────────────────────────────────────────── */}
        {combatEntries.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            {/* Toggle button */}
            <button
              onClick={() => setLogOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.85rem',
                background: logOpen ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${logOpen ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: logOpen ? '8px 8px 0 0' : '8px',
                cursor: 'pointer', fontFamily: fonts.body,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ color: colors.textMuted, fontWeight: '800', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                ⚔️ Combat Log
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '0.05rem 0.45rem', color: '#f87171', fontSize: '0.65rem', fontWeight: '800' }}>
                  {combatEntries.length}
                </span>
                <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{logOpen ? '▲' : '▼'}</span>
              </span>
            </button>
            {/* Log entries */}
            {logOpen && (
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                maxHeight: '220px', overflowY: 'auto',
              }}>
                {combatEntries.map((entry, i) => (
                  <div key={entry.id || i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    padding: '0.45rem 0.85rem',
                    borderBottom: i < combatEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span style={{
                      color: colors.textFaint, fontSize: '0.58rem', fontWeight: '700',
                      flexShrink: 0, marginTop: '0.1rem', whiteSpace: 'nowrap',
                    }}>R{entry.round}</span>
                    <span style={{ color: colors.textSecondary, fontSize: '0.72rem', lineHeight: '1.35' }}>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Item Choice Screen — shown after GM approves a choice-required item ── */}
      {pendingChoice && pendingChoice.type === 'passChoice' && (
        <PassChoiceScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'tradeRequest' && (
        <TradeRequestScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'tradeReview' && (
        <TradeReviewScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'giftNotice' && (
        <GiftNoticeScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'tradeResult' && (
        <TradeResultScreen
          choice={pendingChoice}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'guyTargetPick' && (
        <GuyTargetPickScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          npcs={(gameState?.npcs || []).filter(n => n.active && !n.isDead)}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice.type === 'guyItemPick' && (
        <GuyItemPickScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          onSubmit={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && !['passChoice','guyItemPick','guyTargetPick','tradeRequest','tradeReview','tradeResult','giftNotice'].includes(pendingChoice.type) && (
        <ItemChoiceScreen
          choice={pendingChoice}
          lobbyCode={lobbyCode}
          myPlayer={gameState?.players?.find(p => p.uid === playerData?.uid) || gameState?.players?.find(p => String(p.id) === String(playerData?.id)) || null}
          allPlayers={gameState?.players || []}
          npcs={(gameState?.npcs || []).filter(n => n.active && !n.isDead)}
          onSubmit={() => setPendingChoice(null)}
        />
      )}

      {/* ── NPC Moveset Modal ── */}
      {movesetNpc && <NPCMovesetModal npc={movesetNpc} onClose={() => setMovesetNpc(null)} />}

      {/* ── Destroy Notice — shown to player whose item was destroyed ── */}
      {destroyNotice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💥</div>
            <div style={{ color: '#fca5a5', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem' }}>Item Destroyed</div>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Destroyed by</div>
              <div style={{ color: '#fca5a5', fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.6rem' }}>{destroyNotice.byPlayerName}</div>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Item Lost</div>
              <div style={{ color: colors.amber, fontWeight: '800', fontSize: '0.95rem' }}>"{destroyNotice.destroyedItemName}"</div>
            </div>
            <button
              onClick={() => setDestroyNotice(null)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
            >Acknowledge</button>
          </div>
        </div>
      )}
    </div>
  );
};


export default PlayerGameView;