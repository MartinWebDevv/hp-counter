import React from 'react';
import { fonts, colors } from '../theme';

// ── Typewriter hook ────────────────────────────────────────────────────────
const useTypewriter = (text, speed = 45, startDelay = 600) => {
  const [displayed, setDisplayed] = React.useState('');
  React.useEffect(() => {
    setDisplayed('');
    let i = 0;
    const start = setTimeout(() => {
      const tick = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(tick);
      }, speed);
      return () => clearInterval(tick);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text]);
  return displayed;
};

// ── Ember particle ─────────────────────────────────────────────────────────
const Ember = ({ style }) => (
  <div style={{
    position: 'absolute',
    width: '2px', height: '2px',
    borderRadius: '50%',
    background: 'rgba(201,169,97,0.7)',
    boxShadow: '0 0 4px rgba(201,169,97,0.5)',
    pointerEvents: 'none',
    ...style,
  }} />
);

const EMBERS = [
  { left: '48%',  animationDelay: '0s',    animationDuration: '4.2s' },
  { left: '45%',  animationDelay: '0.7s',  animationDuration: '3.8s' },
  { left: '51%',  animationDelay: '1.3s',  animationDuration: '4.8s' },
  { left: '43%',  animationDelay: '2.1s',  animationDuration: '3.5s' },
  { left: '53%',  animationDelay: '0.4s',  animationDuration: '5.1s' },
  { left: '50%',  animationDelay: '1.8s',  animationDuration: '4.0s' },
  { left: '46%',  animationDelay: '2.8s',  animationDuration: '3.6s' },
  { left: '55%',  animationDelay: '0.9s',  animationDuration: '4.5s' },
];

// ── Main component ─────────────────────────────────────────────────────────
const HomeScreen = ({ onCreateLobby, onJoinLobby, onLoadGame, onPlayOffline, joinError = '', joining = false }) => {
  const [joinMode,  setJoinMode]  = React.useState(false);
  const [lobbyCode, setLobbyCode] = React.useState('');
  const [error,     setError]     = React.useState('');
  const [mounted,   setMounted]   = React.useState(false);

  const tagline = useTypewriter('Roll dice. Deal damage. Survive.', 42, 800);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleJoin = () => {
    const code = lobbyCode.trim().toUpperCase();
    if (code.length < 4) { setError('Please enter a valid lobby code.'); return; }
    setError('');
    onJoinLobby(code);
  };

  // Staggered entrance: opacity + translateY, each button 120ms apart
  const btnEntrance = (i) => ({
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.45s ease ${i * 120}ms, transform 0.45s ease ${i * 120}ms`,
  });

  return (
    <div className="bt-page" style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #0c0606 0%, #100808 50%, #0a0404 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: fonts.body, padding: '2rem',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ── Ember particles ─────────────────────────────────────────────── */}
      {EMBERS.map((e, i) => (
        <Ember key={i} style={{
          bottom: '35%',
          left: e.left,
          animation: `emberFloat ${e.animationDuration} ease-in infinite ${e.animationDelay}`,
        }} />
      ))}

      {/* ── Grain overlay ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
        backgroundSize: '180px 180px',
        opacity: 0.6,
      }} />

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.75rem', position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* Emoji — no scale animation, just smooth opacity glow */}
        <div style={{ fontSize: '3.5rem', marginBottom: '0.7rem', lineHeight: 1,
          filter: 'drop-shadow(0 0 14px rgba(201,169,97,0.55))',
          animation: 'emblGlow 4s ease-in-out infinite',
        }}>⚔️</div>

        {/* Title */}
        <h1 style={{
          fontFamily: '"Cinzel", Georgia, serif',
          color: colors.gold, fontSize: '2.2rem', fontWeight: '900',
          letterSpacing: '0.14em', margin: '0 0 0.2rem',
          animation: 'titleGlow 4s ease-in-out infinite',
        }}>BATTLE TRACKER</h1>

        {/* Gold rule under title */}
        <div style={{
          width: '80px', height: '1px', margin: '0.5rem auto 0.65rem',
          background: 'linear-gradient(90deg, transparent, rgba(201,169,97,0.7), transparent)',
          animation: 'ruleGlow 4s ease-in-out infinite',
        }} />

        {/* Sub-label */}
        <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          Campaign Manager
        </div>

        {/* Typewriter tagline */}
        <div style={{ color: 'rgba(201,169,97,0.5)', fontSize: '0.8rem', letterSpacing: '0.04em', fontStyle: 'italic', minHeight: '1.2em' }}>
          {tagline}<span style={{ animation: 'blink 1s step-end infinite', opacity: tagline.length < 32 ? 1 : 0 }}>|</span>
        </div>
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, #180e0e, #0e0808)',
        border: '1px solid rgba(201,169,97,0.18)',
        borderRadius: '16px', padding: '2.25rem',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
        position: 'relative', zIndex: 1,
      }}>

        {!joinMode ? (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.75rem', ...btnEntrance(0) }}>
              How are you playing today?
            </div>

            {/* Create */}
            <button onClick={onCreateLobby} className="hs-btn hs-red" style={{ ...btnStyle, ...btnEntrance(1), background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)', border: '2px solid #ef4444', color: '#fecaca', boxShadow: '0 4px 18px rgba(239,68,68,0.18)', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '1rem' }}>👑 Create Lobby</span>
              <span style={subLabel}>Start a new session as Game Master</span>
            </button>

            {/* Join */}
            <button onClick={() => setJoinMode(true)} className="hs-btn hs-blue" style={{ ...btnStyle, ...btnEntrance(2), background: 'linear-gradient(135deg, #1e3a5f, #1a3352)', border: '2px solid #3b82f6', color: '#bfdbfe', boxShadow: '0 4px 18px rgba(59,130,246,0.12)', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '1rem' }}>🎮 Join Lobby</span>
              <span style={subLabel}>Enter a lobby code from your Game Master</span>
            </button>

            {/* Load */}
            <button onClick={onLoadGame} className="hs-btn hs-green" style={{ ...btnStyle, ...btnEntrance(3), background: 'linear-gradient(135deg, #1a2e1a, #142614)', border: '2px solid #4ade80', color: '#bbf7d0', boxShadow: '0 4px 18px rgba(74,222,128,0.1)', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '1rem' }}>📂 Load Game</span>
              <span style={subLabel}>Continue a campaign from a save file</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0', ...btnEntrance(4) }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ color: colors.textFaint, fontSize: '0.6rem', letterSpacing: '0.12em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* Offline */}
            <button onClick={onPlayOffline} className="hs-btn" style={{ ...btnStyle, ...btnEntrance(5), background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', color: colors.textMuted }}>
              <span style={{ fontSize: '0.9rem' }}>🖥️ Play Offline</span>
              <span style={subLabel}>Solo mode — no internet required</span>
            </button>
          </>
        ) : (
          <>
            <div style={{ color: colors.textMuted, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.5rem' }}>
              Enter Lobby Code
            </div>

            <input
              autoFocus
              value={lobbyCode}
              onChange={e => { setLobbyCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. WOLF-7842"
              maxLength={12}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: `2px solid ${error ? '#ef4444' : 'rgba(59,130,246,0.4)'}`,
                borderRadius: '10px', padding: '1rem',
                color: '#bfdbfe',
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: '1.4rem', fontWeight: '900',
                textAlign: 'center', letterSpacing: '0.2em',
                outline: 'none', marginBottom: '0.5rem',
              }}
            />

            {(error || joinError) && (
              <div style={{ color: '#f87171', fontSize: '0.72rem', textAlign: 'center', marginBottom: '0.75rem' }}>{error || joinError}</div>
            )}

            <button onClick={handleJoin} disabled={joining} className="hs-btn hs-blue"
              style={{ ...btnStyle, background: 'linear-gradient(135deg, #1e3a5f, #1a3352)', border: '2px solid #3b82f6', color: '#bfdbfe', marginBottom: '0.75rem', marginTop: '0.25rem' }}>
              {joining ? '⏳ Verifying...' : '🎮 Join Session'}
            </button>

            <button onClick={() => { setJoinMode(false); setLobbyCode(''); setError(''); }}
              style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: 'none', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.8rem' }}>
              ← Back
            </button>
          </>
        )}
      </div>

      <div style={{ color: 'rgba(201,169,97,0.2)', fontSize: '0.58rem', marginTop: '2rem', letterSpacing: '0.14em', zIndex: 1 }}>
        BATTLE TRACKER · CAMPAIGN MANAGER
      </div>

      {/* ── All animations ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes emblGlow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(201,169,97,0.4)); opacity: 0.9; }
          50%       { filter: drop-shadow(0 0 22px rgba(201,169,97,0.75)); opacity: 1; }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(201,169,97,0.3), 0 0 40px rgba(201,169,97,0.08); }
          50%       { text-shadow: 0 0 35px rgba(201,169,97,0.6), 0 0 70px rgba(201,169,97,0.18); }
        }
        @keyframes ruleGlow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes emberFloat {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 0.8; }
          80%  { opacity: 0.4; }
          100% { transform: translateY(-120px) translateX(var(--drift, 8px)) scale(0.4); opacity: 0; }
        }

        /* Button hover — border glow slide-in, no translateY jitter */
        .hs-btn {
          display: flex; flex-direction: column; align-items: flex-start;
          text-align: left; position: relative; overflow: hidden;
        }
        .hs-btn::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 0; transition: width 0.5s ease;
          border-radius: 8px 0 0 8px;
        }
        .hs-red::before   { background: rgba(239,68,68,0.25); }
        .hs-blue::before  { background: rgba(59,130,246,0.2); }
        .hs-green::before { background: rgba(74,222,128,0.18); }
        .hs-btn:hover::before { width: 100%; }
        .hs-btn:hover { filter: brightness(1.1); }
        .hs-btn:active { transform: scale(0.975); transition: transform 0.1s; }
      `}</style>
    </div>
  );
};

// ── Shared styles ──────────────────────────────────────────────────────────
const btnStyle = {
  width: '100%', padding: '1rem 1.1rem',
  borderRadius: '10px', cursor: 'pointer',
  fontFamily: fonts.body, fontWeight: '800',
  fontSize: '1rem', letterSpacing: '0.08em',
  textTransform: 'uppercase',
  transition: 'filter 0.2s, transform 0.1s',
  gap: '0.15rem',
};

const subLabel = {
  fontSize: '0.63rem', fontWeight: '600',
  opacity: 0.65, textTransform: 'none',
  letterSpacing: '0.02em', display: 'block',
  marginTop: '0.15rem',
};

export default HomeScreen;