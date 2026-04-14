import React from 'react';
import { fonts, colors } from '../theme';

/**
 * HomeScreen
 * The landing page everyone sees first.
 * Three paths: Create (become GM), Join (enter lobby code), Play Offline (existing solo app).
 */
const HomeScreen = ({ onCreateLobby, onJoinLobby, onLoadGame, onPlayOffline, joinError = '', joining = false }) => {
  const [joinMode, setJoinMode]   = React.useState(false);
  const [lobbyCode, setLobbyCode] = React.useState('');
  const [error, setError]         = React.useState('');

  const handleJoin = () => {
    const code = lobbyCode.trim().toUpperCase();
    if (code.length < 4) { setError('Please enter a valid lobby code.'); return; }
    setError('');
    onJoinLobby(code);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0505, #100808)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.body,
      padding: '2rem',
    }}>

      {/* Logo / Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>⚔️</div>
        <h1 style={{
          fontFamily: '"Cinzel", Georgia, serif',
          color: colors.gold,
          fontSize: '2.2rem',
          fontWeight: '900',
          letterSpacing: '0.12em',
          margin: '0 0 0.5rem',
          textShadow: `0 0 30px ${colors.amber}40`,
        }}>BATTLE TRACKER</h1>
        <div style={{ color: colors.textMuted, fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          CAMPAIGN MANAGER
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'linear-gradient(145deg, #160e0e, #0e0808)',
        border: '1px solid rgba(201,169,97,0.2)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
      }}>

        {!joinMode ? (
          <>
            <div style={{ color: colors.textMuted, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.75rem' }}>
              How are you playing today?
            </div>

            {/* Create */}
            <button
              onClick={onCreateLobby}
              style={{
                width: '100%', padding: '1.1rem',
                background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
                border: '2px solid #ef4444',
                color: '#fecaca',
                borderRadius: '10px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '800',
                fontSize: '1rem', letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(239,68,68,0.2)',
                marginBottom: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              👑 Create Lobby
              <div style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.7, marginTop: '0.2rem', textTransform: 'none', letterSpacing: '0.03em' }}>
                Start a new session as Game Master
              </div>
            </button>

            {/* Join */}
            <button
              onClick={() => setJoinMode(true)}
              style={{
                width: '100%', padding: '1.1rem',
                background: 'linear-gradient(135deg, #1e3a5f, #1a3352)',
                border: '2px solid #3b82f6',
                color: '#bfdbfe',
                borderRadius: '10px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '800',
                fontSize: '1rem', letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(59,130,246,0.15)',
                marginBottom: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              🎮 Join Lobby
              <div style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.7, marginTop: '0.2rem', textTransform: 'none', letterSpacing: '0.03em' }}>
                Enter a lobby code from your Game Master
              </div>
            </button>

            {/* Load Game */}
            <button
              onClick={onLoadGame}
              style={{
                width: '100%', padding: '1.1rem',
                background: 'linear-gradient(135deg, #1a2e1a, #142614)',
                border: '2px solid #4ade80',
                color: '#bbf7d0',
                borderRadius: '10px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '800',
                fontSize: '1rem', letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(74,222,128,0.15)',
                marginBottom: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              📂 Load Game
              <div style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.7, marginTop: '0.2rem', textTransform: 'none', letterSpacing: '0.03em' }}>
                Continue a campaign from a save file
              </div>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Offline */}
            <button
              onClick={onPlayOffline}
              style={{
                width: '100%', padding: '0.85rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: colors.textMuted,
                borderRadius: '10px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '700',
                fontSize: '0.85rem', letterSpacing: '0.06em',
                transition: 'all 0.2s',
              }}
            >
              🖥️ Play Offline
              <div style={{ fontSize: '0.62rem', fontWeight: '600', opacity: 0.6, marginTop: '0.2rem', letterSpacing: '0.03em' }}>
                Solo mode — no internet required
              </div>
            </button>
          </>
        ) : (
          <>
            {/* Join flow */}
            <div style={{ color: colors.textMuted, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.5rem' }}>
              Enter Lobby Code
            </div>

            <input
              autoFocus
              value={lobbyCode}
              onChange={e => { setLobbyCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder='e.g. WOLF-7842'
              maxLength={12}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: `2px solid ${error ? colors.red : 'rgba(59,130,246,0.4)'}`,
                borderRadius: '10px',
                padding: '1rem',
                color: '#bfdbfe',
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: '1.4rem',
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: '0.2em',
                outline: 'none',
                marginBottom: '0.5rem',
              }}
            />

            {(error || joinError) && (
              <div style={{ color: colors.red, fontSize: '0.72rem', textAlign: 'center', marginBottom: '0.75rem' }}>{error || joinError}</div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: '100%', padding: '1rem',
                background: 'linear-gradient(135deg, #1e3a5f, #1a3352)',
                border: '2px solid #3b82f6',
                color: '#bfdbfe',
                borderRadius: '10px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '800',
                fontSize: '0.95rem', letterSpacing: '0.08em',
                marginBottom: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {joining ? '⏳ Verifying...' : '🎮 Join Session'}
            </button>

            <button
              onClick={() => { setJoinMode(false); setLobbyCode(''); setError(''); }}
              style={{
                width: '100%', padding: '0.7rem',
                background: 'transparent',
                border: 'none',
                color: colors.textFaint,
                cursor: 'pointer',
                fontFamily: fonts.body,
                fontSize: '0.8rem',
              }}
            >
              ← Back
            </button>
          </>
        )}
      </div>

      <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '2rem', letterSpacing: '0.08em' }}>
        BATTLE TRACKER · CAMPAIGN MANAGER
      </div>
    </div>
  );
};

export default HomeScreen;