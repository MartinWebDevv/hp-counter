import React from 'react';
import { fonts, colors } from '../theme';
import { subscribeLobby } from '../services/lobbyService';
import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

const PlayerWaitingRoom = ({ lobbyCode, playerData, onGameStart, onBack }) => {
  const [players,     setPlayers]     = React.useState({});
  const [gameStarted, setGameStarted] = React.useState(false);
  const [dotCount,    setDotCount]    = React.useState(1);
  const unsubRef = React.useRef(null);

  // Lobby subscription
  React.useEffect(() => {
    unsubRef.current = subscribeLobby(lobbyCode, (data) => {
      setPlayers(data.players || {});
      if (data.gameStarted && !gameStarted) {
        setGameStarted(true);
        // Show the transition screen briefly before handing off
        setTimeout(() => onGameStart(data), 2000);
      }
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [lobbyCode]);

  // Animated ellipsis
  React.useEffect(() => {
    const t = setInterval(() => setDotCount(d => d === 3 ? 1 : d + 1), 600);
    return () => clearInterval(t);
  }, []);

  const playerList     = Object.values(players);
  const cmdStats       = COMMANDER_STATS[playerData?.commander] || null;
  const factionStats   = FACTION_STATS[playerData?.faction] || null;
  const isUncivilized  = playerData?.faction === 'Uncivilized';
  const pColor         = playerData?.playerColor || colors.gold;
  const dots           = '.'.repeat(dotCount);

  if (gameStarted) {
    return (
      <div style={{
        ...centeredPage,
        background: `radial-gradient(ellipse at center, ${pColor}22 0%, #0a0505 65%)`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Animated background ring */}
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          borderRadius: '50%',
          border: `2px solid ${pColor}30`,
          animation: 'ringPulse 1.2s ease-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          borderRadius: '50%',
          border: `2px solid ${pColor}50`,
          animation: 'ringPulse 1.2s ease-out infinite 0.3s',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ textAlign: 'center', zIndex: 1, padding: '2rem' }}>
          {/* Crossed swords */}
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'swordClash 0.6s ease-out forwards' }}>
            ⚔️
          </div>

          <div style={{ color: pColor, fontFamily: fonts.display, fontWeight: '900', fontSize: '1.8rem', letterSpacing: '0.18em', marginBottom: '0.4rem', animation: 'fadeUp 0.5s ease-out forwards', textShadow: `0 0 30px ${pColor}80` }}>
            BATTLE BEGINS
          </div>

          <div style={{ color: colors.textMuted, fontFamily: fonts.display, fontSize: '0.85rem', letterSpacing: '0.15em', marginBottom: '0.5rem', animation: 'fadeUp 0.5s ease-out 0.15s both' }}>
            {playerData?.playerName || playerData?.commanderName}
          </div>

          <div style={{ color: colors.textFaint, fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '1.75rem', animation: 'fadeUp 0.5s ease-out 0.25s both' }}>
            {playerData?.commander} · {playerData?.faction}
          </div>

          {/* Progress bar */}
          <div style={{ width: '200px', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', margin: '0 auto' }}>
            <div style={{
              height: '100%', background: pColor,
              borderRadius: '2px',
              animation: 'fillBar 1.8s linear forwards',
              boxShadow: `0 0 8px ${pColor}`,
            }} />
          </div>
        </div>

        <style>{`
          @keyframes ringPulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes swordClash {
            0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fillBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: fonts.body, padding: '1.5rem', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>⚔️</div>
          <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.12em', margin: '0 0 0.3rem' }}>
            BATTLE TRACKER
          </h2>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginBottom: '0.25rem' }}>
            Lobby: <span style={{ color: colors.gold, letterSpacing: '0.12em', fontWeight: '800' }}>{lobbyCode}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.85rem', background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '20px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'waitPulse 1.4s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.08em' }}>Waiting for GM{dots}</span>
          </div>
        </div>

        {/* ── Your Character Card ─────────────────────────────────────── */}
        <div style={{ background: `linear-gradient(135deg, ${pColor}0d, rgba(0,0,0,0.4))`, border: `2px solid ${pColor}40`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          {/* Color accent stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: pColor, borderRadius: '4px 0 0 4px' }} />
          <div style={{ paddingLeft: '0.75rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: '800' }}>Your Character</div>

            {/* Name + color dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: pColor, boxShadow: `0 0 10px ${pColor}`, flexShrink: 0 }} />
              <div style={{ color: pColor, fontWeight: '900', fontSize: '1.1rem', fontFamily: fonts.display }}>{playerData?.playerName || playerData?.commanderName || '—'}</div>
            </div>

            {/* Commander + Faction */}
            <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginBottom: '0.85rem', paddingLeft: '1.6rem' }}>
              {playerData?.commander} · <span style={{ color: colors.textPrimary }}>{playerData?.faction}</span>
            </div>

            {/* Commander stat block */}
            {cmdStats && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: '800' }}>Commander</div>
                <StatGrid stats={cmdStats} color={pColor} />
              </div>
            )}

            {/* Faction stat block */}
            {factionStats && !isUncivilized && (
              <div>
                <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: '800' }}>Squad · {playerData?.faction}</div>
                <StatGrid stats={factionStats} color={pColor} />
              </div>
            )}

            {/* Uncivilized — two unit types */}
            {isUncivilized && factionStats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: '800' }}>🪨 Caveman</div>
                  <StatGrid stats={factionStats.caveman} color={pColor} />
                </div>
                <div>
                  <div style={{ color: colors.textFaint, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: '800' }}>🦕 Dinosaur</div>
                  <StatGrid stats={factionStats.dinosaur} color={pColor} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Lobby Roster ────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: '800' }}>
            Players in Lobby
            <span style={{ color: colors.textPrimary, marginLeft: '0.4rem', fontFamily: fonts.display }}>{playerList.length}</span>
          </div>
          {playerList.length === 0 ? (
            <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem 0' }}>Just you so far...</div>
          ) : (
            playerList.map((p, i) => {
              const isMe = p.uid === playerData?.uid;
              return (
                <div key={p.uid || i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: i < playerList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.playerColor || '#4ade80', boxShadow: `0 0 6px ${p.playerColor || '#4ade80'}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: isMe ? pColor : colors.textPrimary, fontWeight: '800', fontSize: '0.83rem' }}>
                      {p.playerName || p.commanderName || 'Unknown'}
                    </span>
                    {isMe && <span style={{ color: pColor, fontSize: '0.6rem', marginLeft: '0.35rem', fontWeight: '700' }}>· you</span>}
                  </div>
                  <div style={{ color: colors.textFaint, fontSize: '0.63rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                    {p.commander} · {p.faction}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Bottom tip ──────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.05em', lineHeight: '1.6', marginBottom: '1rem' }}>
          Review your stats above while you wait.<br />The GM will start the session when everyone's ready.
        </div>

      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes waitPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ── Stat grid helper ─────────────────────────────────────────────────────────
const StatGrid = ({ stats, color }) => {
  if (!stats) return null;
  const items = [
    { label: 'Walk',    value: stats.walk },
    { label: 'Run',     value: stats.run  },
    { label: 'Shoot',   value: stats.shootRange },
    { label: 'Attacks', value: '×' + stats.attacksPerHit },
    { label: 'Heal',    value: stats.rollToHeal + '+' },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}22`, borderRadius: '6px', minWidth: '44px' }}>
          <span style={{ color: colors.textFaint, fontSize: '0.5rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
          <span style={{ color, fontWeight: '800', fontSize: '0.78rem', fontFamily: fonts.display }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

const centeredPage = {
  minHeight: '100svh', background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  fontFamily: fonts.body,
};

export default PlayerWaitingRoom;