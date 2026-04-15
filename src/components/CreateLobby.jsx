import React from 'react';
import { fonts, colors } from '../theme';
import { createLobby, subscribeLobby, updateLobbyMeta } from '../services/lobbyService';
import { buildInitialGameState, writeGameState } from '../services/gameStateService';

/**
 * CreateLobby
 * GM-only waiting room. Creates the lobby, shows the code,
 * lists players as they join, and lets GM start the game.
 */
const CreateLobby = ({ onGameStart, onBack }) => {
  const [status,    setStatus]    = React.useState('creating'); // 'creating' | 'waiting' | 'error'
  const [lobbyCode, setLobbyCode] = React.useState('');
  const [gmUid,     setGmUid]     = React.useState('');
  const [players,   setPlayers]   = React.useState({});
  const [error,     setError]     = React.useState('');
  const [copied,    setCopied]    = React.useState(false);
  const unsubRef = React.useRef(null);

  // Create the lobby as soon as this screen mounts
  React.useEffect(() => {
    let cancelled = false;
    createLobby()
      .then(({ code, uid }) => {
        if (cancelled) return;
        setLobbyCode(code);
        setGmUid(uid);
        setStatus('waiting');

        // Subscribe to real-time updates so we see players joining live
        unsubRef.current = subscribeLobby(code, (data) => {
          if (!cancelled) setPlayers(data.players || {});
        });
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setStatus('error'); }
      });

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartGame = async () => {
    // Build initial game state from lobby players and push to Firestore
    const lobbyData       = { players };
    const initialState    = buildInitialGameState(lobbyData, 'campaign');
    await writeGameState(lobbyCode, initialState);
    await updateLobbyMeta(lobbyCode, { gameStarted: true });
    onGameStart({ lobbyCode, gmUid, players, initialState });
  };

  const playerList = Object.values(players);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === 'creating') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <div style={{ color: colors.textMuted, fontFamily: fonts.body }}>Creating your lobby...</div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div style={{ color: colors.red, fontFamily: fonts.body, marginBottom: '1rem' }}>{error}</div>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: fonts.body, padding: '2rem', paddingTop: '2.5rem', paddingBottom: '3rem', boxSizing: 'border-box' }}>

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👑</div>
          <h2 style={{ fontFamily: '"Cinzel", Georgia, serif', color: colors.gold, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.12em', margin: 0 }}>
            GAME MASTER LOBBY
          </h2>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.4rem' }}>
            Share this code with your players
          </div>
        </div>

        {/* Lobby code display */}
        <div style={{
          background: 'linear-gradient(145deg, #160e0e, #0e0808)',
          border: '2px solid rgba(201,169,97,0.35)',
          borderRadius: '14px',
          padding: '1.75rem',
          textAlign: 'center',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        }}>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            Lobby Code
          </div>
          <div style={{
            fontFamily: '"Cinzel", Georgia, serif',
            color: colors.gold,
            fontSize: '2.4rem',
            fontWeight: '900',
            letterSpacing: '0.18em',
            textShadow: `0 0 24px ${colors.amber}50`,
            marginBottom: '1rem',
          }}>
            {lobbyCode}
          </div>
          <button onClick={copyCode} style={{
            padding: '0.5rem 1.25rem',
            background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,169,97,0.1)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(201,169,97,0.3)'}`,
            color: copied ? '#4ade80' : colors.gold,
            borderRadius: '8px', cursor: 'pointer',
            fontFamily: fonts.body, fontWeight: '700', fontSize: '0.78rem',
            letterSpacing: '0.08em', transition: 'all 0.2s',
          }}>
            {copied ? '✓ Copied!' : '📋 Copy Code'}
          </button>
        </div>

        {/* Players list */}
        <div style={{
          background: 'linear-gradient(145deg, #160e0e, #0e0808)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
            Players Joined ({playerList.length})
          </div>

          {playerList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: colors.textFaint, fontSize: '0.82rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              Waiting for players to join...
            </div>
          ) : (
            playerList.map((p, i) => (
              <div key={p.uid || i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                marginBottom: i < playerList.length - 1 ? '0.4rem' : 0,
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.88rem' }}>
                    {p.commanderName || p.playerName || 'Unnamed Player'}
                  </div>
                  {p.faction && (
                    <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>{p.faction}</div>
                  )}
                </div>
                <div style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: '700' }}>JOINED</div>
              </div>
            ))
          )}
        </div>

        {/* Start Game */}
        <button
          onClick={handleStartGame}
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
            marginBottom: '0.75rem',
            transition: 'all 0.2s',
          }}
        >
          ⚔️ Start Game
          <div style={{ fontSize: '0.62rem', fontWeight: '600', opacity: 0.7, marginTop: '0.15rem', textTransform: 'none', letterSpacing: '0.03em' }}>
            {playerList.length === 0 ? 'You can start alone and players can join mid-session' : `Start with ${playerList.length} player${playerList.length !== 1 ? 's' : ''}`}
          </div>
        </button>

        <button onClick={onBack} style={backBtn}>← Back to Home</button>
      </div>
    </div>
  );
};

const centeredPage = {
  height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

const backBtn = {
  width: '100%', padding: '0.7rem',
  background: 'transparent', border: 'none',
  color: colors.textFaint, cursor: 'pointer',
  fontFamily: fonts.body, fontSize: '0.8rem',
  textAlign: 'center',
};

export default CreateLobby;