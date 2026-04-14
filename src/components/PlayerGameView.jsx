import React from 'react';
import { colors, borders, fonts, hpBarColor, text, btn, tierColors, cardShell, insetSection, pill } from '../theme';
import { subscribeGameState, writePendingRequest, subscribePendingRequests, subscribePendingChoices, resolvePendingChoice } from '../services/gameStateService';
import { markPlayerLeft, subscribeGameEnded } from '../services/lobbyService';
import { getSlotCount, getHeldCount } from './lootUtils';
import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

/**
 * PlayerGameView
 * The in-game screen for players (non-GM).
 * Read-only live view of the game state, synced from Firestore.
 * Tabs: My Character | Players | NPCs | Victory
 */
const PlayerGameView = ({ lobbyCode, playerData, onLeaveGame = null }) => {
  const [gameState,   setGameState]   = React.useState(null);
  const [activeTab,     setActiveTab]     = React.useState('mine');
  const [playerIdx,     setPlayerIdx]     = React.useState(0);
  const [deniedToast,   setDeniedToast]   = React.useState(false);
  const [pendingChoice, setPendingChoice] = React.useState(null);
  const [destroyNotice, setDestroyNotice] = React.useState(null);
  const [npcFilter,     setNpcFilter]     = React.useState('All');
  const [movesetNpc,    setMovesetNpc]    = React.useState(null);
  const seenDenials = React.useRef(new Set());
  const seenChoices = React.useRef(new Set());

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

        // Normal choice screens target the item user
        if (choice.targetPlayerUid === playerData.uid && choice.type !== 'destroyNotice') {
          seenChoices.current.add(choice.choiceId);
          setPendingChoice(choice);
        }
      });
    });
    return () => unsub();
  }, [lobbyCode, playerData?.uid]);

  // ── Watch for GM ending the game — redirect all players to home ───────────
  React.useEffect(() => {
    if (!lobbyCode || !onLeaveGame) return;
    const unsub = subscribeGameEnded(lobbyCode, () => { onLeaveGame(); });
    return () => unsub();
  }, [lobbyCode, onLeaveGame]);

  if (!gameState) {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚔️</div>
        <div style={{ color: colors.textMuted, fontFamily: fonts.body }}>Connecting to session...</div>
      </div>
    );
  }

  const players     = gameState.players     || [];
  const allNpcs     = (gameState.npcs       || []).filter(n => !n.isDead);
  const npcs        = allNpcs.filter(n => n.active); // active-only for attack modal
  const vpStats     = gameState.vpStats     || {};
  const currentRound = gameState.currentRound || 1;

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
    { id: 'victory', label: '🏆 Victory' },
  ];

  return (
    <div className="pv-root" style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(145deg,#0a0505,#100808)', fontFamily: fonts.body, paddingBottom: '5rem', width: '100%', boxSizing: 'border-box' }}>

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
            {isMyTurn && (
              <span style={{ color: pColor, fontSize: '0.7rem', fontWeight: '800', animation: 'turnPulse 1.5s ease-in-out infinite' }}>⚔️</span>
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="pv-content" style={{ padding: '1rem', maxWidth: '700px', width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingBottom: '3rem' }}>

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
            : (
              <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                {/* Navigation */}
                <div className="pv-carousel-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', width: '100%', minWidth: 0 }}>
                  <button
                    onClick={() => setPlayerIdx(i => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                    style={navBtn(safeIdx === 0)}
                  >←</button>
                  <div style={{ flex: 1, textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ color: colors.textMuted, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Player {safeIdx + 1} of {visiblePlayers.length}
                    </div>
                    {/* Player selector dots */}
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      {visiblePlayers.map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => setPlayerIdx(i)}
                          style={{
                            width: i === safeIdx ? '20px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: i === safeIdx ? (p.playerColor || colors.gold) : 'rgba(255,255,255,0.15)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setPlayerIdx(i => Math.min(visiblePlayers.length - 1, i + 1))}
                    disabled={safeIdx === visiblePlayers.length - 1}
                    style={navBtn(safeIdx === visiblePlayers.length - 1)}
                  >→</button>
                </div>
                <ReadOnlyPlayerCard player={visiblePlayers[safeIdx]} />
              </div>
            )
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
        {activeTab === 'victory' && (
          players.length === 0
            ? <EmptyState icon="🏆" text="No players yet." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Victory Points
                </div>
                {[...players]
                  .map(p => ({ ...p, totalVP: Object.values(vpStats[p.id] || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0) }))
                  .sort((a, b) => b.totalVP - a.totalVP)
                  .map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: i === 0 ? 'rgba(201,169,97,0.08)' : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${i === 0 ? 'rgba(201,169,97,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '10px',
                    }}>
                      <div style={{ color: i === 0 ? colors.gold : colors.textFaint, fontWeight: '900', fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>
                        {i === 0 ? '👑' : `#${i + 1}`}
                      </div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.playerColor || '#3b82f6', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.9rem' }}>{p.playerName}</div>
                        <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>{p.faction}</div>
                      </div>
                      <div style={{ color: i === 0 ? colors.gold : colors.amber, fontWeight: '900', fontSize: '1.3rem' }}>
                        {p.totalVP}
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '600', marginLeft: '0.2rem' }}>VP</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )
        )}
      </div>

      {/* ── Item Choice Screen — shown after GM approves a choice-required item ── */}
      {pendingChoice && (
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

// ── Item Choice Screen ────────────────────────────────────────────────────────
const ItemChoiceScreen = ({ choice, lobbyCode, myPlayer, allPlayers, npcs, onSubmit }) => {
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedTarget,   setSelectedTarget]   = React.useState(null); // { type:'self'|'enemy'|'destroyItem', unitKey, unitLabel, playerId, npcId, ... }
  const [selectedDestroyItem, setSelectedDestroyItem] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const effectType = choice.itemEffect;

  // Effects that target own units
  const SELF_TARGET = ['heal','maxHP','attackBonus','defenseBonus','shieldWall','counterStrike','cleanse','fullCleanse','resurrect','extraSlot'];
  // Effects that target enemies
  const ENEMY_TARGET = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'];
  const IS_DESTROY   = effectType === 'destroyItem';
  const isSelf       = SELF_TARGET.includes(effectType);
  const isEnemy      = ENEMY_TARGET.includes(effectType);

  const effectLabels = {
    heal: '💚 Heal', maxHP: '❤️ Max HP Boost', attackBonus: '⚔️↑ Attack Bonus',
    defenseBonus: '🛡️↑ Defense Bonus', shieldWall: '🛡️ Shield Wall',
    counterStrike: '⚡ Counter Strike', cleanse: '✨ Cleanse',
    fullCleanse: '✨✨ Full Cleanse', resurrect: '💫 Resurrect', extraSlot: '🎒 Extra Item Slot',
    poisonVial: '🧪 Poison Vial', stunGrenade: '💣 Stun Grenade',
    attackDebuffItem: '⚔️↓ Attack Debuff', defenseDebuffItem: '🛡️↓ Defense Debuff',
    marked: '🎯 Marked', destroyItem: '💥 Destroy Item',
  };

  const submitChoice = async () => {
    if (!selectedTarget || sending) return;
    if (IS_DESTROY && !selectedDestroyItem) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:              'itemChoice',
        reqId,
        choiceId:          choice.choiceId,
        playerId:          myPlayer?.id,
        playerName:        myPlayer?.playerName,
        itemIndex:         choice.itemIndex,
        itemName:          choice.itemName,
        itemEffect:        effectType,
        targetType:        selectedTarget.type,
        targetUnitKey:     selectedTarget.unitKey   || null,
        targetUnitLabel:   selectedTarget.unitLabel || null,
        targetPlayerId:    selectedTarget.playerId  || null,
        targetNpcId:       selectedTarget.npcId     || null,
        targetName:        selectedTarget.name       || null,
        // Destroy item specific
        destroyItemId:     selectedDestroyItem?.id   || null,
        destroyedItemName: selectedDestroyItem?.name || null,
        timestamp:         Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  // ── Own-unit list (for self-targeting effects) ────────────────────────────
  const buildOwnUnits = () => {
    if (!myPlayer) return [];
    const units = [];
    const cmdAlive = !myPlayer.commanderStats?.isDead && (myPlayer.commanderStats?.hp ?? 0) > 0;
    const cmdDown  = myPlayer.commanderStats?.isDead || (myPlayer.commanderStats?.hp ?? 0) <= 0;

    // Resurrect targets downed units; everything else targets alive units
    if (effectType === 'resurrect') {
      if (cmdDown) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp <= 0 && (u.livesRemaining ?? 0) > 0) {
          units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
        }
      });
    } else {
      if (cmdAlive) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp > 0) units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
      });
    }
    return units;
  };

  // ── Enemy player list (for destroy item) ─────────────────────────────────
  const enemyPlayers = (allPlayers || []).filter(p => p.id !== myPlayer?.id && !p.commanderStats?.isDead && !p.isAbsent);

  const canSubmit = selectedTarget && (!IS_DESTROY || selectedDestroyItem);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>✦</div>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>
            {effectLabels[effectType] || 'Use Item'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.72rem', marginTop: '0.25rem' }}>{choice.itemName} — choose a target</div>
        </div>

        {/* ── Self-targeting: own units ── */}
        {isSelf && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {effectType === 'resurrect' ? 'Downed Units' : 'Your Units'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {buildOwnUnits().map(({ unitKey, unitLabel, hp, maxHp }) => {
                const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.type === 'self';
                const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                return (
                  <button
                    key={unitKey}
                    onClick={() => setSelectedTarget({ type: 'self', unitKey, unitLabel, name: unitLabel })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)', border: `1px solid ${isSelected ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ flex: 1, color: isSelected ? colors.gold : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{unitLabel}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                    {isSelected && <span style={{ color: colors.gold, fontSize: '0.75rem' }}>✓</span>}
                  </button>
                );
              })}
              {buildOwnUnits().length === 0 && (
                <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No valid targets</div>
              )}
            </div>
          </>
        )}

        {/* ── Enemy-targeting: NPC + player units ── */}
        {isEnemy && (
          <>
            {/* NPC targets */}
            {npcs.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enemies</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {npcs.map(npc => {
                    const isSelected = selectedTarget?.npcId === npc.id;
                    return (
                      <button
                        key={npc.id}
                        onClick={() => setSelectedTarget({ type: 'enemy', npcId: npc.id, name: npc.name, unitLabel: npc.name })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: '#fecaca', fontWeight: '700', fontSize: '0.85rem' }}>{npc.name}</span>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{npc.hp}/{npc.maxHp} HP</span>
                        {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Enemy player unit targets */}
            {enemyPlayers.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Players</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {enemyPlayers.map(ep => {
                    const isExpanded = expandedPlayerId === ep.id;
                    const pColor = ep.playerColor || colors.blue;
                    const unitOptions = [];
                    if ((ep.commanderStats?.hp ?? 0) > 0) {
                      unitOptions.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', hp: ep.commanderStats.hp, maxHp: ep.commanderStats.maxHp });
                    }
                    (ep.subUnits || []).forEach((u, i) => {
                      if (u.hp > 0) unitOptions.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
                    });
                    return (
                      <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                        <button onClick={() => setExpandedPlayerId(isExpanded ? null : ep.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                          <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                            {unitOptions.map(({ unitKey, unitLabel, hp, maxHp }) => {
                              const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.playerId === ep.id;
                              const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                              return (
                                <button key={unitKey} onClick={() => setSelectedTarget({ type: 'enemy', playerId: ep.id, unitKey, unitLabel, name: `${ep.playerName} — ${unitLabel}` })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.85rem', background: isSelected ? pColor + '15' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: fonts.body }}>
                                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                                  <span style={{ flex: 1, color: isSelected ? pColor : colors.purpleLight, fontWeight: '700', fontSize: '0.8rem', textAlign: 'left' }}>{unitLabel}</span>
                                  <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                                  {isSelected && <span style={{ color: pColor, fontSize: '0.75rem' }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Destroy Item: pick enemy player → see their units + items ── */}
        {IS_DESTROY && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Choose Target Player</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {enemyPlayers.map(ep => {
                const isExpanded = expandedPlayerId === ep.id;
                const pColor = ep.playerColor || colors.blue;
                // Gather all units with items
                const unitsWithItems = [];
                const cmdItems = (ep.inventory || []).filter(it => it.heldBy === 'commander' && !it.isQuestItem);
                if ((ep.commanderStats?.hp ?? 0) > 0 && cmdItems.length > 0) {
                  unitsWithItems.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', items: cmdItems });
                }
                (ep.subUnits || []).forEach((u, i) => {
                  if (u.hp <= 0) return;
                  const uKey = i === 0 ? 'special' : `soldier${i}`;
                  const uLabel = u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                  const unitItems = (ep.inventory || []).filter(it => it.heldBy === uKey && !it.isQuestItem);
                  if (unitItems.length > 0) unitsWithItems.push({ unitKey: uKey, unitLabel: uLabel, items: unitItems });
                });
                return (
                  <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <button onClick={() => { setExpandedPlayerId(isExpanded ? null : ep.id); setSelectedTarget(null); setSelectedDestroyItem(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                    </button>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                        {unitsWithItems.length === 0 && (
                          <div style={{ color: colors.textFaint, fontSize: '0.75rem', padding: '0.75rem 0.85rem' }}>No items to destroy</div>
                        )}
                        {unitsWithItems.map(({ unitKey, unitLabel, items }) => {
                          const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                          return (
                            <div key={unitKey} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '0.4rem 0.85rem' }}>
                              <div style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '800', marginBottom: '0.3rem' }}>{icon} {unitLabel}</div>
                              {items.map(item => {
                                const isSelected = selectedDestroyItem?.id === item.id;
                                return (
                                  <button key={item.id} onClick={() => { setSelectedTarget({ type: 'destroyItem', playerId: ep.id, name: ep.playerName }); setSelectedDestroyItem(item); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', marginBottom: '0.2rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.2)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '6px', cursor: 'pointer', fontFamily: fonts.body }}>
                                    <span style={{ fontSize: '0.85rem' }}>📦</span>
                                    <span style={{ flex: 1, color: isSelected ? '#fca5a5' : colors.textPrimary, fontWeight: '700', fontSize: '0.78rem', textAlign: 'left' }}>{item.name}</span>
                                    <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{item.tier}</span>
                                    {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Submit */}
        <button
          onClick={submitChoice}
          disabled={!canSubmit || sending}
          style={{ width: '100%', padding: '0.85rem', background: canSubmit ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canSubmit ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canSubmit ? '#86efac' : colors.textDisabled, cursor: canSubmit && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}
        >
          {sending ? '...' : '✓ Confirm Choice'}
        </button>
      </div>
    </div>
  );
};
const ReadOnlyPlayerCard = ({
  player,
  highlight = false,
  isOwnCard = false,
  lobbyCode = null,
  npcs = [],
  allPlayers = [],
}) => {
  const [showSquad,        setShowSquad]        = React.useState(true);
  const [attackModal,      setAttackModal]      = React.useState(null);
  const [sending,          setSending]          = React.useState(false);
  const [squadAttack,      setSquadAttack]      = React.useState(false);
  const [squadUnits,       setSquadUnits]       = React.useState([]);
  const [expandedTargetId, setExpandedTargetId] = React.useState(null);
  const [targetUnitKeys,   setTargetUnitKeys]   = React.useState([]);

  const cmdHp      = player.commanderStats?.hp    ?? 0;
  const cmdMaxHp   = player.commanderStats?.maxHp ?? 1;
  const cmdPct     = Math.max(0, Math.min(100, (cmdHp / cmdMaxHp) * 100));
  const isDead     = player.commanderStats?.isDead;
  const inventory  = player.inventory || [];

  const pColor   = player.playerColor || colors.blue;
  const revives  = player.commanderStats?.revives || 0;
  const cooldown = player.commanderStats?.cooldownRounds || 0;
  const cmdName  = player.commanderStats?.customName || player.commander || 'Commander';
  const aliveUnits = (player.subUnits || []).filter(u => u.hp > 0).length;
  const totalUnits = (player.subUnits || []).length;
  const reviveQueue = player.reviveQueue || [];

  const openAttack = (unitKey, action, unitLabel) => {
    if (!isOwnCard) return;
    setSquadAttack(false);
    setSquadUnits([]);
    setExpandedTargetId(null);
    setTargetUnitKeys([]);
    setAttackModal({ unitKey, action, unitLabel });
  };

  const isCommanderAttack = attackModal?.unitKey === 'commander';

  const toggleSquadUnit = (unitKey) => {
    setSquadUnits(prev => {
      if (prev.includes(unitKey)) return prev.filter(k => k !== unitKey);
      if (prev.length >= 3) return prev; // max 3 units
      return [...prev, unitKey];
    });
  };

  const sendAttackRequest = async (target) => {
    if (!lobbyCode || sending) return;
    setSending(true);
    try {
      const reqId = `atk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const squadMembers = (!isCommanderAttack && squadAttack && squadUnits.length > 0)
        ? squadUnits
        : null;
      const isPlayerTarget = target.type === 'player';
      const resolvedTargetUnits = isPlayerTarget && targetUnitKeys.length > 0 ? targetUnitKeys : null;
      await writePendingRequest(lobbyCode, reqId, {
        type:             'attack',
        reqId,
        playerId:         player.id,
        playerName:       player.playerName,
        unitKey:          attackModal.unitKey,
        unitLabel:        attackModal.unitLabel,
        action:           attackModal.action,
        targetId:         target.id,
        targetType:       target.type,
        targetName:       target.name,
        isSquadAttack:    !!squadMembers,
        squadUnits:       squadMembers,
        targetUnitKeys:   resolvedTargetUnits ? resolvedTargetUnits.map(t => t.unitKey)   : null,
        targetUnitLabels: resolvedTargetUnits ? resolvedTargetUnits.map(t => t.unitLabel) : null,
        timestamp:        Date.now(),
      });
    } finally {
      setSending(false);
      setSquadAttack(false);
      setSquadUnits([]);
      setExpandedTargetId(null);
      setTargetUnitKeys([]);
      setAttackModal(null);
    }
  };

  return (
    <>
    <div style={{ ...cardShell(false, pColor, false), opacity: isDead ? 0.55 : 1, border: highlight ? `2px solid ${pColor}` : undefined, width: '100%', boxSizing: 'border-box', minWidth: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: pColor, boxShadow: `0 0 8px ${pColor}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: pColor, fontWeight: '800', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.playerName || 'Player'}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>{player.faction} · {player.commander}</div>
        </div>
        {isDead && <span style={pill('#ef4444', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)')}>💀 DOWN</span>}
      </div>

      {/* ── Commander block ── */}
      <div style={{ ...insetSection(isDead ? 'dead' : 'default'), marginBottom: '0.6rem', opacity: isDead ? 0.72 : 1 }}>
        {/* Name + cooldown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontFamily: fonts.display, fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.gold }}>
            {cmdName}
          </span>
          <div style={{ padding: '0.18rem 0.55rem', background: cooldown > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cooldown > 0 ? colors.redBorder : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', color: cooldown > 0 ? '#fca5a5' : colors.textFaint, fontSize: '0.68rem', fontWeight: '800' }}>
            {cooldown > 0 ? `🔴 CD:${cooldown}` : '⭕ Ready'}
          </div>
        </div>

        {/* HP bar + revive pips */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ color: colors.amber, fontSize: '0.85rem', fontWeight: '700' }}>{cmdHp} / {cmdMaxHp} HP</span>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ width: '11px', height: '11px', borderRadius: '50%', border: `2px solid ${i < revives ? colors.blue : colors.textDisabled}`, background: i < revives ? `radial-gradient(circle, ${colors.blue}, #1e3a8a)` : '#0a0a0a', boxShadow: i < revives ? `0 0 5px ${colors.blue}70` : 'none' }} />
              ))}
            </div>
          </div>
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${cmdPct}%`, height: '100%', background: hpBarColor(cmdPct), transition: 'width 0.3s ease', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Commander loot slot */}
        {(() => {
          const heldItems = inventory.filter(it => it.heldBy === 'commander');
          const slotCount = getSlotCount(player, 'commander');
          const heldCount = getHeldCount(player, 'commander');
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', flexShrink: 0 }}>🎒 {heldCount}/{slotCount}</span>
              {heldItems.map((item, hi) => {
                const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                return <div key={hi} style={pill(tc.text, tc.bg, tc.border)}><span style={{ marginRight: '0.2rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>{item.name}</div>;
              })}
            </div>
          );
        })()}

        {/* Commander attack buttons */}
        {isOwnCard && (
          <div className="pv-cmd-attacks" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {[
              { label: '🎯 Shoot',   action: 'shoot'   },
              { label: '⚔️ Melee',   action: 'melee'   },
              { label: '⚡ Special', action: 'special', disabled: cooldown > 0 },
            ].map(({ label, action, disabled: extra }) => {
              const dis = !!isDead || !!extra;
              return (
                <button key={action} onClick={() => openAttack('commander', action, cmdName)} disabled={dis} style={btn.primary(dis)}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Squad header ── */}
      <div onClick={() => setShowSquad(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.purpleBorder}`, borderRadius: showSquad ? '8px 8px 0 0' : '8px', cursor: 'pointer', userSelect: 'none', marginBottom: showSquad ? 0 : '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: colors.textFaint, fontSize: '0.7rem', display: 'inline-block', transform: showSquad ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
          <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Squad</span>
          <span style={{ color: aliveUnits === 0 ? colors.red : colors.textMuted, fontSize: '0.75rem', fontWeight: '600' }}>{aliveUnits}/{totalUnits} alive</span>
          {reviveQueue.length > 0 && <span style={pill(colors.amber, colors.amberSubtle, colors.amberBorder)}>⚕️ {reviveQueue.length} queue</span>}
        </div>
      </div>

      {/* ── Squad units ── */}
      {showSquad && (
        <div style={{ border: `1px solid ${colors.purpleBorder}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ overflowX: 'hidden' }}>
          {(player.subUnits || []).map((unit, index) => {
            const unitDead = unit.hp === 0;
            const livesRemaining = unit.livesRemaining ?? unit.revives ?? 0;
            const isPermaDead = unitDead && livesRemaining === 0;
            const queuePos = reviveQueue.indexOf(index);
            const isInQueue = queuePos >= 0;
            const unitHPPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
            const unitKey = index === 0 ? 'special' : `soldier${index}`;
            const heldItems = inventory.filter(it => it.heldBy === unitKey);
            const slotCount = getSlotCount(player, unitKey);
            const heldCount = getHeldCount(player, unitKey);
            const unitLabel = unit.name?.trim() || (index === 0 ? 'Special' : `Soldier ${index}`);
            return (
              <div key={index} style={{ padding: '0.75rem', background: isPermaDead ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)', borderBottom: index < (player.subUnits || []).length - 1 ? `1px solid ${colors.purpleBorder}` : 'none', opacity: isPermaDead ? 0.3 : unitDead ? 0.55 : 1, filter: isPermaDead ? 'grayscale(1)' : 'none' }}>
                {/* Unit name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  <span style={{ flex: 1, color: colors.purpleLight, fontWeight: '700', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {index === 0 ? '⭐ ' : '🛡️ '}{unitLabel}
                  </span>
                  {/* Uncivilized subtype badge */}
                  {unit.unitSubType && (
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', flexShrink: 0, color: unit.unitSubType === 'dinosaur' ? '#6ee7b7' : '#fbbf24' }}>
                      {unit.unitSubType === 'dinosaur' ? '🦕' : '🪨'}
                    </span>
                  )}
                  {/* Lives pips */}
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', border: `2px solid ${i < livesRemaining ? '#eab308' : colors.textDisabled}`, background: i < livesRemaining ? 'radial-gradient(circle, #eab308, #92400e)' : '#0a0a0a', boxShadow: i < livesRemaining ? '0 0 4px #eab30870' : 'none' }} />
                    ))}
                  </div>
                  {unitDead && (
                    <span style={pill(isInQueue ? colors.amber : '#7f1d1d', isInQueue ? colors.amberSubtle : 'rgba(127,29,29,0.15)', isInQueue ? colors.amberBorder : '#450a0a')}>
                      {isInQueue ? `💀 #${queuePos + 1}` : '💀 GONE'}
                    </span>
                  )}
                </div>
                {/* HP display */}
                <div style={{ marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ color: colors.purpleLight, fontSize: '0.82rem', fontWeight: '700' }}>{unit.hp}/{unit.maxHp} HP</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${unitHPPct}%`, height: '100%', background: hpBarColor(unitHPPct), transition: 'width 0.3s ease', borderRadius: '3px' }} />
                  </div>
                </div>
                {/* Attack buttons */}
                {isOwnCard && (
                  <div className="pv-unit-attacks" style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <button onClick={() => openAttack(unitKey, 'shoot', unitLabel)} disabled={unitDead}
                      style={{ flex: 1, padding: '0.4rem 0', background: unitDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${unitDead ? colors.textDisabled : colors.blueBorder}`, color: unitDead ? colors.textDisabled : colors.blueLight, borderRadius: '6px', cursor: unitDead ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: '800' }}>
                      🎯 Shoot
                    </button>
                    <button onClick={() => openAttack(unitKey, 'melee', unitLabel)} disabled={unitDead}
                      style={{ flex: 1, padding: '0.4rem 0', background: unitDead ? 'transparent' : colors.blueSubtle, border: `1px solid ${unitDead ? colors.textDisabled : colors.blueBorder}`, color: unitDead ? colors.textDisabled : colors.blueLight, borderRadius: '6px', cursor: unitDead ? 'not-allowed' : 'pointer', fontFamily: fonts.body, fontSize: '0.72rem', fontWeight: '800' }}>
                      ⚔️ Melee
                    </button>
                  </div>
                )}
                {/* Unit loot slot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ ...pill(colors.textFaint, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.3)'), fontSize: '0.6rem', fontWeight: '800', flexShrink: 0 }}>🎒 {heldCount}/{slotCount}</span>
                  {heldItems.map((item, hi) => {
                    const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
                    return <div key={hi} style={pill(tc.text, tc.bg, tc.border)}><span style={{ marginRight: '0.2rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>{item.name}</div>;
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ── Inventory ── */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: borders.warm, borderRadius: '10px', overflow: 'hidden', marginTop: '0.5rem' }}>
        <div style={{ padding: '0.35rem 0.85rem', borderBottom: '1px solid rgba(201,169,97,0.1)', ...text.sectionLabel }}>🎒 Inventory</div>
        {inventory.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: '0.75rem', textAlign: 'center', padding: '0.85rem' }}>No items</div>
        )}
        <div style={{ overflowX: 'hidden' }}>
          {inventory.map((item, i) => {
            const tc = item.isQuestItem ? tierColors.Quest : (tierColors[item.tier] || tierColors.Common);
            const usesLeft = item.effect?.uses === 0 ? 999 : (item.effect?.usesRemaining ?? item.effect?.uses ?? 1);
            const canUse = !item.effect || item.effect.type === 'manual' || usesLeft > 0;
            const isKey = item.effect?.type === 'key';
            const isSelfTarget = ['cleanse','fullCleanse','shieldWall','counterStrike','resurrect'].includes(item.effect?.type);
            const isEnemyTarget = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'].includes(item.effect?.type);
            const isGlobal = ['npcPlague','playerPlague','crownsFavor','nullify','mirror'].includes(item.effect?.type);
            const showUseButton = !item.isQuestItem && !isKey && (
              ['heal','maxHP','attackBonus','defenseBonus','manual','destroyItem','extraSlot'].includes(item.effect?.type)
              || isSelfTarget || isEnemyTarget || isGlobal
            );

            const sendItemRequest = async (action) => {
              if (!isOwnCard || !lobbyCode || sending) return;
              setSending(true);
              try {
                const reqId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                await writePendingRequest(lobbyCode, reqId, {
                  type: 'useItem',
                  reqId,
                  playerId: player.id,
                  playerName: player.playerName,
                  itemIndex: i,
                  itemName: item.name,
                  itemEffect: item.effect?.type || 'none',
                  action,
                  timestamp: Date.now(),
                });
              } finally {
                setSending(false);
              }
            };

            const heldByLabel = item.heldBy === 'commander'
              ? (player.commanderStats?.customName || player.commander || 'Commander')
              : item.heldBy === 'special'
                ? (player.subUnits?.[0]?.name?.trim() || 'Special')
                : (() => {
                    const idx = parseInt((item.heldBy || '').replace('soldier', ''));
                    return !isNaN(idx) ? (player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`) : item.heldBy;
                  })();

            return (
              <div key={i} style={{ padding: '0.65rem 0.85rem', borderLeft: `3px solid ${tc.text}`, borderBottom: i < inventory.length - 1 ? '1px solid rgba(201,169,97,0.07)' : 'none', opacity: canUse ? 1 : 0.4 }}>
                {/* Row 1: icon + name + description + tier badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: '0.05rem' }}>{item.isQuestItem ? '🗝️' : '📦'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: tc.text, fontWeight: '700', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    {item.description && (
                      <div style={{ color: colors.textFaint, fontSize: '0.63rem', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0, alignItems: 'center' }}>
                    {item.isQuestItem && <span style={pill('#fde68a', 'rgba(234,179,8,0.1)', 'rgba(234,179,8,0.35)')}>QUEST</span>}
                    <span style={pill(tc.color || tc.text, tc.subtle || tc.bg, tc.border)}>{item.isQuestItem ? 'Quest' : item.tier}</span>
                  </div>
                </div>
                {/* Row 2: holder label + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: colors.textFaint, fontSize: '0.6rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {heldByLabel}{item.effect?.uses !== 0 && usesLeft !== 999 && ` · ${usesLeft} use${usesLeft !== 1 ? 's' : ''} left`}
                  </span>
                  {isOwnCard && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      {showUseButton && (
                        <button onClick={() => sendItemRequest('use')} disabled={!canUse || sending}
                          style={{ ...pill(canUse ? tc.text : colors.textDisabled, canUse ? (tc.subtle || tc.bg) : 'rgba(0,0,0,0.2)', canUse ? tc.border : 'rgba(90,74,58,0.2)'), cursor: canUse && !sending ? 'pointer' : 'not-allowed', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body, border: `1px solid ${canUse ? tc.border : 'rgba(90,74,58,0.2)'}` }}>✦ USE</button>
                      )}
                      {isKey && (
                        <button onClick={() => sendItemRequest('useKey')} disabled={sending}
                          style={{ ...pill(colors.amber, colors.amberSubtle, colors.amberBorder), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🔑 USE</button>
                      )}
                      {!item.isQuestItem && (
                        <button onClick={() => sendItemRequest('pass')} disabled={sending}
                          style={{ ...pill(colors.textMuted, 'rgba(0,0,0,0.25)', 'rgba(90,74,58,0.35)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🤝 PASS</button>
                      )}
                      {!item.isQuestItem && (
                        <button onClick={() => { if (window.confirm(`Drop "${item.name}"?`)) sendItemRequest('drop'); }} disabled={sending}
                          style={{ ...pill('#f87171', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)'), cursor: 'pointer', fontSize: '0.65rem', fontWeight: '800', fontFamily: fonts.body }}>🗑</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Attack target modal ── */}
    {attackModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(201,169,97,0.3)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Title */}
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
            {attackModal.action === 'shoot' ? '🎯 Shoot' : attackModal.action === 'melee' ? '⚔️ Melee' : '⚡ Special'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginBottom: '1.1rem' }}>
            {attackModal.unitLabel} — pick a target
          </div>

          {/* Squad attack toggle — only for non-commander units */}
          {!isCommanderAttack && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={squadAttack}
                  onChange={e => { setSquadAttack(e.target.checked); setSquadUnits(e.target.checked ? [attackModal.unitKey] : []); }}
                  style={{ width: '16px', height: '16px', accentColor: colors.purple, cursor: 'pointer' }}
                />
                <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.78rem', letterSpacing: '0.05em' }}>Squad Attack</span>
              </label>

              {/* Unit picker dropdown */}
              {squadAttack && (
                <div style={{ marginTop: '0.6rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.purpleBorder}`, borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Select Units</span>
                    <span style={{ color: squadUnits.length >= 3 ? colors.amber : colors.textFaint, fontSize: '0.6rem', fontWeight: '700' }}>{squadUnits.length}/3</span>
                  </div>
                  {(player.subUnits || []).map((unit, i) => {
                    const uKey = i === 0 ? 'special' : `soldier${i}`;
                    const uLabel = unit.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                    const dead = unit.hp <= 0;
                    const atCap = squadUnits.length >= 3 && !squadUnits.includes(uKey);
                    const disabled = dead || atCap;
                    return (
                      <label key={uKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={squadUnits.includes(uKey)}
                          onChange={() => toggleSquadUnit(uKey)}
                          style={{ width: '14px', height: '14px', accentColor: colors.purple, cursor: disabled ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ color: colors.purpleLight, fontSize: '0.78rem', fontWeight: '700' }}>
                          {i === 0 ? '⭐' : '🛡️'} {uLabel}
                        </span>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem', marginLeft: 'auto' }}>{unit.hp}/{unit.maxHp}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NPC targets */}
          {npcs.length > 0 && (
            <>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enemies</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {npcs.map(npc => (
                  <button key={npc.id} onClick={() => sendAttackRequest({ id: npc.id, type: 'npc', name: npc.name })} disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: '#fecaca', fontWeight: '700', fontSize: '0.85rem' }}>{npc.name}</div>
                      <div style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{npc.hp}/{npc.maxHp} HP</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Player targets */}
          {allPlayers.filter(p => p.id !== player.id && !p.commanderStats?.isDead && !p.isAbsent).length > 0 && (
            <>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {allPlayers.filter(p => p.id !== player.id && !p.commanderStats?.isDead && !p.isAbsent).map(enemyPlayer => {
                  const isExpanded = expandedTargetId === enemyPlayer.id;
                  const pColor = enemyPlayer.playerColor || colors.blue;

                  const unitOptions = [];
                  if (!enemyPlayer.commanderStats?.isDead && (enemyPlayer.commanderStats?.hp ?? 0) > 0) {
                    const cmdName = enemyPlayer.commanderStats?.customName || enemyPlayer.commander || 'Commander';
                    unitOptions.push({ unitKey: 'commander', unitLabel: cmdName, hp: enemyPlayer.commanderStats.hp, maxHp: enemyPlayer.commanderStats.maxHp });
                  }
                  (enemyPlayer.subUnits || []).forEach((unit, i) => {
                    if (unit.hp <= 0) return;
                    const uKey = i === 0 ? 'special' : `soldier${i}`;
                    const uLabel = unit.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                    unitOptions.push({ unitKey: uKey, unitLabel: uLabel, hp: unit.hp, maxHp: unit.maxHp });
                  });

                  const toggleEnemyUnit = (unitKey, unitLabel) => {
                    setTargetUnitKeys(prev => {
                      const exists = prev.find(t => t.unitKey === unitKey && t.playerId === enemyPlayer.id);
                      if (exists) return prev.filter(t => !(t.unitKey === unitKey && t.playerId === enemyPlayer.id));
                      if (prev.length >= 3) return prev;
                      return [...prev, { playerId: enemyPlayer.id, unitKey, unitLabel }];
                    });
                  };

                  const selectedForThisPlayer = targetUnitKeys.filter(t => t.playerId === enemyPlayer.id);
                  const totalSelected = targetUnitKeys.length;

                  return (
                    <div key={enemyPlayer.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                      <button
                        onClick={() => {
                          setExpandedTargetId(isExpanded ? null : enemyPlayer.id);
                          setTargetUnitKeys(prev => prev.filter(t => t.playerId === enemyPlayer.id));
                        }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{enemyPlayer.playerName}</span>
                        {selectedForThisPlayer.length > 0 && (
                          <span style={{ color: colors.amber, fontSize: '0.65rem', fontWeight: '800' }}>{selectedForThisPlayer.length} selected</span>
                        )}
                        <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ padding: '0.4rem 0.85rem 0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Choose targets (max 3)</span>
                            <span style={{ color: totalSelected >= 3 ? colors.amber : colors.textFaint, fontSize: '0.62rem', fontWeight: '700' }}>{totalSelected}/3</span>
                          </div>
                          {unitOptions.map(({ unitKey, unitLabel, hp, maxHp }) => {
                            const isChecked = targetUnitKeys.some(t => t.unitKey === unitKey && t.playerId === enemyPlayer.id);
                            const atCap = totalSelected >= 3 && !isChecked;
                            const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                            const labelColor = unitKey === 'commander' ? colors.gold : colors.purpleLight;
                            return (
                              <label key={unitKey} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.85rem', cursor: atCap ? 'not-allowed' : 'pointer', opacity: atCap ? 0.35 : 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <input
                                  type="checkbox"
                                  disabled={atCap}
                                  checked={isChecked}
                                  onChange={() => toggleEnemyUnit(unitKey, unitLabel)}
                                  style={{ width: '14px', height: '14px', accentColor: pColor, cursor: atCap ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                                />
                                <span style={{ flex: 1, color: labelColor, fontWeight: '700', fontSize: '0.8rem' }}>{icon} {unitLabel}</span>
                                <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                              </label>
                            );
                          })}
                          {selectedForThisPlayer.length > 0 && (
                            <div style={{ padding: '0.5rem 0.85rem 0.65rem' }}>
                              <button
                                onClick={() => sendAttackRequest({ id: enemyPlayer.id, type: 'player', name: enemyPlayer.playerName })}
                                disabled={sending}
                                style={{ width: '100%', padding: '0.6rem', background: pColor + '20', border: `1px solid ${pColor}50`, borderRadius: '7px', color: pColor, fontWeight: '800', fontSize: '0.78rem', fontFamily: fonts.body, cursor: sending ? 'not-allowed' : 'pointer' }}
                              >
                                ⚔️ Attack {selectedForThisPlayer.length} unit{selectedForThisPlayer.length > 1 ? 's' : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {npcs.length === 0 && allPlayers.filter(p => p.id !== player.id).length === 0 && (
            <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No targets available</div>
          )}

          <button onClick={() => setAttackModal(null)} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.82rem' }}>
            Cancel
          </button>
        </div>
      </div>
    )}
    </>
  );
};

// ── Player Stats Panel ────────────────────────────────────────────────────────
const PlayerStatsPanel = ({ player }) => {
  const isUncivilized = player.faction === 'Uncivilized';
  const [subtypeView, setSubtypeView] = React.useState('caveman');

  const cmdStats = COMMANDER_STATS[player.faction] || COMMANDER_STATS[player.commander] || {};
  const rawFacStats = FACTION_STATS[player.faction] || {};
  // For Uncivilized pick the right subtype stats; for others use directly
  const facStats = isUncivilized
    ? (rawFacStats[subtypeView] || {})
    : rawFacStats;

  const statRow = (label, cmdVal, facVal) => (
    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{label}</span>
      <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{cmdVal ?? '—'}</span>
      <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{facVal ?? '—'}</span>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginTop: '0.75rem' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          📊 Stats Reference
        </div>
        {/* Uncivilized subtype toggle */}
        {isUncivilized && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setSubtypeView('caveman')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'caveman' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'caveman' ? 'rgba(251,191,36,0.1)' : 'transparent', color: subtypeView === 'caveman' ? '#fbbf24' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🪨 Caveman</button>
            <button
              onClick={() => setSubtypeView('dinosaur')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.1)' : 'transparent', color: subtypeView === 'dinosaur' ? '#6ee7b7' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🦕 Dinosaur</button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.4rem 0.85rem 0.3rem', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stat</span>
        <span style={{ color: colors.gold, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          👑 {player.commanderStats?.customName || player.commander || 'Commander'}
        </span>
        <span style={{ color: colors.purpleLight, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          {isUncivilized ? (subtypeView === 'dinosaur' ? '🦕 Dinosaur' : '🪨 Caveman') : `🛡️ ${player.faction || 'Faction'}`}
        </span>
      </div>

      {/* Stat rows */}
      <div style={{ padding: '0.25rem 0.85rem 0.75rem' }}>
        {statRow('Walk',         cmdStats.walk,          facStats.walk)}
        {statRow('Run',          cmdStats.run,           facStats.run)}
        {statRow('Shoot Range',  cmdStats.shootRange,    facStats.shootRange)}
        {statRow('Sp. Range',    cmdStats.specialRange ? `${cmdStats.specialRange}"` : null, facStats.specialRange ? `${facStats.specialRange}"` : null)}
        {statRow('Attacks/Hit',  cmdStats.attacksPerHit, facStats.attacksPerHit)}
        {statRow('Roll to Heal', cmdStats.rollToHeal ? `${cmdStats.rollToHeal}+` : null, facStats.rollToHeal ? `${facStats.rollToHeal}+` : null)}
      </div>
    </div>
  );
};

// ── Read-only NPC Card ────────────────────────────────────────────────────────
const ReadOnlyNPCCard = ({ npc, onShowMoveset }) => {
  const pct    = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
  const active = npc.active && !npc.isDead;
  const dead   = npc.isDead;
  const dotColor    = dead ? '#4b5563' : active ? '#ef4444' : '#6b7280';
  const borderColor = dead ? 'rgba(75,85,99,0.2)' : active ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.2)';
  const hasMoveset  = active && ((npc.attacks || []).length > 0);
  return (
    <div
      onClick={() => hasMoveset && onShowMoveset?.(npc)}
      style={{
        background: 'linear-gradient(145deg,#160e0e,#0e0808)',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px', padding: '1rem',
        opacity: dead ? 0.4 : active ? 1 : 0.65,
        cursor: hasMoveset ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: active ? '0.75rem' : 0 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, boxShadow: active ? `0 0 6px ${dotColor}` : 'none', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: dead ? '#6b7280' : active ? '#fecaca' : colors.textMuted, fontWeight: '800', fontSize: '0.95rem' }}>{npc.name || 'Unknown'}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>
            {dead ? '💀 Defeated' : active ? '⚔️ In Battle' : '⏳ Staging'}
          </div>
        </div>
        {active && <div style={{ color: colors.amber, fontWeight: '700', fontSize: '0.82rem' }}>{npc.hp} / {npc.maxHp}</div>}
        {hasMoveset && <div style={{ color: colors.textFaint, fontSize: '0.65rem' }}>⚔️ Moves ▸</div>}
      </div>
      {active && (
        <>
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: hpBarColor(pct), borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', marginTop: '0.6rem' }}>
            {[
              { label: 'Armor', value: `${npc.armor}+` },
              { label: 'Walk',  value: npc.walk  || '—' },
              { label: 'Run',   value: npc.run   || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.3)', border: borders.default, borderRadius: '6px', padding: '0.3rem', textAlign: 'center' }}>
                <div style={{ color: colors.textFaint, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.78rem', marginTop: '0.1rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── NPC Moveset Modal ─────────────────────────────────────────────────────────
const NPCMovesetModal = ({ npc, onClose }) => {
  // Determine which attacks to show based on currentPhase
  // currentPhase 0 = Phase 1 (npc.attacks), 1+ = npc.phases[currentPhase-1].attacks
  const phase = npc.currentPhase || 0;
  let attacks = npc.attacks || [];
  let phaseLabel = null;
  if (npc.hasPhases && npc.phases?.length > 0 && phase > 0) {
    const phaseData = npc.phases[phase - 1];
    if (phaseData) {
      attacks = phaseData.attacks || [];
      phaseLabel = phaseData.label ? `Phase ${phaseData.phaseNumber}: ${phaseData.label}` : `Phase ${phaseData.phaseNumber}`;
    }
  } else if (npc.hasPhases && npc.phases?.length > 0) {
    phaseLabel = 'Phase 1';
  }

  const typeIcon = (type) => {
    if (type === 'buff')  return '✨';
    if (type === 'spawn') return '🐾';
    return '⚔️';
  };
  const typeColor = (type) => {
    if (type === 'buff')  return '#a78bfa';
    if (type === 'spawn') return '#fbbf24';
    return '#fecaca';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem', boxSizing: 'border-box' }}>
      <div className="pv-modal-inner" onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(239,68,68,0.4)', borderRadius: '14px', padding: '1.5rem', width: 'calc(100% - 2rem)', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: '#fecaca', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            {npc.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {phaseLabel && (
              <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px', padding: '0.2rem 0.65rem', color: '#fca5a5', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.06em' }}>
                🔥 {phaseLabel}
              </span>
            )}
            <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>
              {npc.hp}/{npc.maxHp} HP · 🛡️{npc.armor}+ · Atk +{npc.attackBonus}
            </span>
          </div>
        </div>

        {/* Moves */}
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
          Moveset ({attacks.length})
        </div>
        {attacks.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No moves defined</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.1rem' }}>
          {attacks.map((atk, i) => (
            <div key={atk.id || i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(239,68,68,0.12)`, borderLeft: `3px solid ${typeColor(atk.attackType)}`, borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: atk.range || atk.description ? '0.3rem' : 0 }}>
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{typeIcon(atk.attackType)}</span>
                <span style={{ flex: 1, color: typeColor(atk.attackType), fontWeight: '800', fontSize: '0.85rem' }}>{atk.name}</span>
                {atk.numRolls > 0 && (
                  <span style={{ color: colors.amber, fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.numRolls}{atk.dieType}
                  </span>
                )}
                {atk.attackType === 'spawn' && atk.spawnNumRolls > 0 && (
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.spawnNumRolls}{atk.spawnDieType}
                  </span>
                )}
                {atk.buffEffect && (
                  <span style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.72rem', flexShrink: 0 }}>
                    +{atk.buffEffect.value} {atk.buffEffect.stat}
                  </span>
                )}
              </div>
              {atk.range && (
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', paddingLeft: '1.35rem', marginBottom: atk.description ? '0.15rem' : 0 }}>
                  📍 {atk.range}
                </div>
              )}
              {atk.description && (
                <div style={{ color: colors.textFaint, fontSize: '0.63rem', paddingLeft: '1.35rem', fontStyle: 'italic' }}>
                  {atk.description}
                </div>
              )}
              {atk.attackType === 'spawn' && atk.spawnPresets?.length > 0 && (
                <div style={{ color: '#fbbf24', fontSize: '0.62rem', paddingLeft: '1.35rem', marginTop: '0.15rem' }}>
                  Spawns from: {atk.spawnPresets.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.82rem' }}>
          Close
        </button>
      </div>
    </div>
  );
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const EmptyState = ({ icon, text: msg }) => (
  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: colors.textFaint }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
    <div style={{ fontSize: '0.85rem' }}>{msg}</div>
  </div>
);

const navBtn = (disabled) => ({
  width: '40px', height: '40px', borderRadius: '8px',
  background: disabled ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)',
  border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'}`,
  color: disabled ? colors.textFaint : colors.textPrimary,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: fonts.body, fontWeight: '900', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});

const centeredPage = {
  minHeight: '100vh',
  background: 'linear-gradient(145deg,#0a0505,#100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

// Inject turnPulse animation once
if (typeof document !== 'undefined' && !document.getElementById('turnPulseStyle')) {
  const style = document.createElement('style');
  style.id = 'turnPulseStyle';
  style.textContent = `
    @keyframes turnPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.85); }
    }
  `;
  document.head.appendChild(style);
}

if (typeof document !== 'undefined' && !document.getElementById('pvMobileStyle')) {
  const style = document.createElement('style');
  style.id = 'pvMobileStyle';
  style.textContent = `
    /* ── Player View portrait mobile ───────────────────────────── */
    @media screen and (max-width: 480px) and (orientation: portrait) {

      /* Outer container: never scroll sideways */
      .pv-root {
        overflow-x: hidden !important;
        width: 100% !important;
      }

      /* Tab bar: equal width tabs, no overflow */
      .pv-tabs button {
        padding: 0.65rem 0.25rem !important;
        font-size: 0.65rem !important;
        min-width: 0 !important;
      }

      /* Turn indicator: tighter */
      .pv-turn-bar {
        padding: 0.4rem 0.75rem !important;
        min-height: 32px !important;
      }

      /* Content area: full width, comfortable padding */
      .pv-content {
        padding: 0.75rem !important;
        padding-bottom: 4rem !important;
      }

      /* Commander attack buttons: slightly smaller text */
      .pv-cmd-attacks button {
        padding: 0.55rem 0.25rem !important;
        font-size: 0.72rem !important;
        letter-spacing: 0 !important;
      }

      /* Squad unit attack buttons: full width row */
      .pv-unit-attacks {
        display: flex !important;
        gap: 0.4rem !important;
      }
      .pv-unit-attacks button {
        flex: 1 !important;
        padding: 0.45rem 0 !important;
        font-size: 0.72rem !important;
      }

      /* Inventory section: readable item names */
      .pv-inventory-item {
        padding: 0.6rem 0.75rem !important;
      }
      .pv-inventory-item .item-name {
        font-size: 0.82rem !important;
      }
      .pv-inventory-item .item-desc {
        font-size: 0.62rem !important;
      }

      /* Stats panel: tighter rows */
      .pv-stats-row {
        padding: 0.25rem 0 !important;
        font-size: 0.68rem !important;
      }

      /* NPC cards: comfortable */
      .pv-npc-card {
        padding: 0.85rem !important;
      }

      /* NPC filter pills: wrap nicely */
      .pv-npc-filters {
        gap: 0.3rem !important;
        flex-wrap: wrap !important;
      }
      .pv-npc-filters button {
        padding: 0.28rem 0.6rem !important;
        font-size: 0.65rem !important;
      }

      /* Modals: full width minus safe margin */
      .pv-modal-inner {
        width: calc(100vw - 2rem) !important;
        max-width: none !important;
        padding: 1.25rem !important;
        border-radius: 12px !important;
      }

      /* Player carousel nav */
      .pv-carousel-nav {
        gap: 0.35rem !important;
      }

      /* Victory tab: readable */
      .pv-victory-row {
        font-size: 0.78rem !important;
        padding: 0.5rem !important;
      }
    }

    /* ── Shared: always prevent horizontal scroll ────────────────── */
    .pv-root {
      overflow-x: hidden;
      max-width: 100vw;
    }
  `;
  document.head.appendChild(style);
}

export default PlayerGameView;