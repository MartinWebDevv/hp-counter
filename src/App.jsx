import React from "react";
import HPCounter from "./components/HPCounter";
import HomeScreen from "./components/HomeScreen";
import CreateLobby from "./components/CreateLobby";
import CharacterCreator from "./components/CharacterCreator";
import PlayerWaitingRoom from "./components/PlayerWaitingRoom";
import PlayerGameView from "./components/PlayerGameView";
import './styles/fullscreen.css';
import './styles/scrollbar.css';
import './styles/mobileResponsive.css';
import { joinLobby, addPlayerToLobby } from "./services/lobbyService";

// screens: 'home' | 'offline' | 'create' | 'join' | 'character-create' | 'player-waiting' | 'gm-game' | 'player-game'
function App() {
  const [screen,        setScreen]        = React.useState('home');
  const [lobbyCode,     setLobbyCode]     = React.useState(null);
  const [gmUid,         setGmUid]         = React.useState(null);
  const [playerData,    setPlayerData]    = React.useState(null);
  const [initialState,  setInitialState]  = React.useState(null);
  const [joinError,     setJoinError]     = React.useState('');
  const [joining,       setJoining]       = React.useState(false);

  // ── Home ──────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <HomeScreen
        onCreateLobby={() => setScreen('create')}
        onJoinLobby={async (code) => {
          setJoinError('');
          setJoining(true);
          try {
            const { isGM, code: validCode } = await joinLobby(code);
            setLobbyCode(validCode);
            if (isGM) {
              // GM returning to their session
              setScreen('gm-game');
            } else {
              setScreen('character-create');
            }
          } catch (err) {
            setJoinError(err.message);
          } finally {
            setJoining(false);
          }
        }}
        onPlayOffline={() => setScreen('offline')}
        joinError={joinError}
        joining={joining}
      />
    );
  }

  // ── Offline ───────────────────────────────────────────────────────────────
  if (screen === 'offline') {
    return <HPCounter />;
  }

  // ── Create Lobby (GM) ─────────────────────────────────────────────────────
  if (screen === 'create') {
    return (
      <CreateLobby
        onBack={() => setScreen('home')}
        onGameStart={({ lobbyCode: code, gmUid: uid, initialState: state }) => {
          setLobbyCode(code);
          setGmUid(uid);
          setInitialState(state);
          setScreen('gm-game');
        }}
      />
    );
  }

  // ── Character Creator (new player joining) ────────────────────────────────
  if (screen === 'character-create') {
    return (
      <CharacterCreator
        lobbyCode={lobbyCode}
        onComplete={async (charData) => {
          const { auth } = await import('./firebase');
          const uid = auth.currentUser?.uid;
          await addPlayerToLobby(lobbyCode, uid, charData);
          setPlayerData({ ...charData, uid });
          setScreen('player-waiting');
        }}
      />
    );
  }

  // ── Player Waiting Room ───────────────────────────────────────────────────
  if (screen === 'player-waiting') {
    return (
      <PlayerWaitingRoom
        lobbyCode={lobbyCode}
        playerData={playerData}
        onGameStart={() => {
          setScreen('player-game');
        }}
      />
    );
  }

  // ── GM in-game ────────────────────────────────────────────────────────────
  if (screen === 'gm-game') {
    return <HPCounter lobbyCode={lobbyCode} gmUid={gmUid} isMultiplayer initialGameState={initialState} />;
  }

  // ── Player in-game ────────────────────────────────────────────────────────
  if (screen === 'player-game') {
    return <PlayerGameView lobbyCode={lobbyCode} playerData={playerData} />;
  }

  return null;
}

export default App;
