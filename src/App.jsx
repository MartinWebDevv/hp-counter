import React from "react";
import HPCounter from "./components/HPCounter";
import HomeScreen from "./components/HomeScreen";
import CreateLobby from "./components/CreateLobby";
import LoadGameLobby from "./components/LoadGameLobby";
import CharacterCreator from "./components/CharacterCreator";
import PlayerCharacterSelect from "./components/PlayerCharacterSelect";
import PlayerWaitingRoom from "./components/PlayerWaitingRoom";
import PlayerGameView from "./components/PlayerGameView";
import './styles/fullscreen.css';
import './styles/scrollbar.css';
import './styles/mobileResponsive.css';
import { joinLobby, addPlayerToLobby, ensureAuth } from "./services/lobbyService";

// screens: 'home' | 'offline' | 'create' | 'load-game' | 'character-create' | 'character-select' | 'player-waiting' | 'gm-game' | 'player-game'
function App() {
  const [screen,       setScreen]       = React.useState('home');
  const [lobbyCode,    setLobbyCode]    = React.useState(null);
  const [gmUid,        setGmUid]        = React.useState(null);
  const [playerData,   setPlayerData]   = React.useState(null);
  const [initialState, setInitialState] = React.useState(null);
  const [joinError,    setJoinError]    = React.useState('');
  const [joining,      setJoining]      = React.useState(false);
  const [myUid,        setMyUid]        = React.useState(null);

  // Home
  if (screen === 'home') {
    return (
      <HomeScreen
        onCreateLobby={() => setScreen('create')}
        onLoadGame={() => setScreen('load-game')}
        onJoinLobby={async (code) => {
          setJoinError('');
          setJoining(true);
          try {
            await ensureAuth();
            const { auth } = await import('./firebase');
            const uid = auth.currentUser?.uid;
            setMyUid(uid);
            const { isGM, code: validCode, data } = await joinLobby(code);
            setLobbyCode(validCode);
            if (isGM) {
              setScreen('gm-game');
            } else if (data?.isLoadedGame) {
              setScreen('character-select');
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

  if (screen === 'offline') return <HPCounter />;

  if (screen === 'create') {
    return (
      <CreateLobby
        onBack={() => setScreen('home')}
        onGameStart={({ lobbyCode: code, gmUid: uid, initialState: state }) => {
          setLobbyCode(code); setGmUid(uid); setInitialState(state); setScreen('gm-game');
        }}
      />
    );
  }

  if (screen === 'load-game') {
    return (
      <LoadGameLobby
        onBack={() => setScreen('home')}
        onGameStart={({ lobbyCode: code, gmUid: uid, initialState: state }) => {
          setLobbyCode(code); setGmUid(uid); setInitialState(state); setScreen('gm-game');
        }}
      />
    );
  }

  if (screen === 'character-select') {
    return (
      <PlayerCharacterSelect
        lobbyCode={lobbyCode}
        myUid={myUid}
        onClaimCharacter={async (claimedPlayer) => {
          await addPlayerToLobby(lobbyCode, myUid, {
            playerName:    claimedPlayer.playerName,
            commanderName: claimedPlayer.playerName,
            faction:       claimedPlayer.faction,
            commander:     claimedPlayer.commander,
            playerColor:   claimedPlayer.playerColor,
          });
          setPlayerData({ ...claimedPlayer, uid: myUid });
          setScreen('player-waiting');
        }}
        onCreateNew={() => setScreen('character-create')}
      />
    );
  }

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

  if (screen === 'player-waiting') {
    return (
      <PlayerWaitingRoom
        lobbyCode={lobbyCode}
        playerData={playerData}
        onGameStart={() => setScreen('player-game')}
      />
    );
  }

  if (screen === 'gm-game') {
    return <HPCounter lobbyCode={lobbyCode} gmUid={gmUid} isMultiplayer initialGameState={initialState} />;
  }

  if (screen === 'player-game') {
    return <PlayerGameView lobbyCode={lobbyCode} playerData={playerData} />;
  }

  return null;
}

export default App;