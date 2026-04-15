import React from 'react';
import { fonts, colors } from '../theme';
import { subscribeLobby } from '../services/lobbyService';

/**
 * PlayerWaitingRoom
 * Shown after a player completes character creation.
 * Listens for the GM to start the game.
 */
const PlayerWaitingRoom = ({ lobbyCode, playerData, onGameStart }) => {
  const [players,     setPlayers]     = React.useState({});
  const [gameStarted, setGameStarted] = React.useState(false);
  const unsubRef = React.useRef(null);

  React.useEffect(() => {
    unsubRef.current = subscribeLobby(lobbyCode, (data) => {
      setPlayers(data.players || {});
      if (data.gameStarted) {
        setGameStarted(true);
        onGameStart(data);
      }
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [lobbyCode]);

  const playerList = Object.values(players);

  if (gameStarted) {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚔️</div>
        <div style={{ color: colors.gold, fontFamily: fonts.body, fontWeight: '800', fontSize: '1.1rem' }}>Game starting...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: fonts.body, padding: '2rem', paddingTop: '2.5rem', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎮</div>
          <h2 style={{ fontFamily: '"Cinzel", Georgia, serif', color: colors.gold, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '0.1em', margin: '0 0 0.4rem' }}>
            WAITING FOR GM
          </h2>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>
            Lobby: <span style={{ color: colors.gold, letterSpacing: '0.12em' }}>{lobbyCode}</span>
          </div>
        </div>

        {/* Player's own card */}
        <div style={{ background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.25)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Character</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: playerData.playerColor, boxShadow: `0 0 8px ${playerData.playerColor}`, flexShrink: 0 }} />
            <div>
              <div style={{ color: colors.gold, fontWeight: '800', fontSize: '1rem' }}>{playerData.commanderName}</div>
              <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.1rem' }}>{playerData.faction} · {playerData.commander}</div>
            </div>
          </div>
        </div>

        {/* All players in lobby */}
        <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Players in Lobby ({playerList.length})
          </div>
          {playerList.length === 0 ? (
            <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '0.75rem 0' }}>Just you so far...</div>
          ) : (
            playerList.map((p, i) => (
              <div key={p.uid || i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: i < playerList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.playerColor || '#4ade80', flexShrink: 0 }} />
                <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', flex: 1 }}>{p.commanderName || 'Unknown'}</div>
                <div style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{p.faction}</div>
              </div>
            ))
          )}
        </div>

        {/* Pulse indicator */}
        <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.75rem', letterSpacing: '0.06em' }}>
          <span style={{ display: 'inline-block', animation: 'pulse 2s infinite' }}>⏳</span> Waiting for the Game Master to start...
        </div>
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

export default PlayerWaitingRoom;