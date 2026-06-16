import React from 'react';
import HPCounter             from './components/HPCounter';
import HomeScreen            from './components/HomeScreen';
import CreateLobby           from './components/CreateLobby';
import LoadGameLobby         from './components/LoadGameLobby';
import CharacterCreator      from './components/CharacterCreator';
import PlayerCharacterSelect from './components/PlayerCharacterSelect';
import PlayerWaitingRoom     from './components/PlayerWaitingRoom';
import PlayerGameView        from './components/PlayerGameView';
import './styles/fullscreen.css';
import './styles/scrollbar.css';
import './styles/mobileResponsive.css';

// FIXED: was dynamically imported 4+ times — now a single static import
import { joinLobby, addPlayerToLobby, ensureAuth, subscribeGameEnded, endGame } from './services/lobbyService';
import { getDoc, doc } from 'firebase/firestore';
import { db }          from './firebase';

// ── Session persistence ────────────────────────────────────────────────────────
const SESSION_KEY = 'bt_session';

const saveSession  = (data)  => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {} };
const loadSession  = ()      => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }    catch { return null; } };
const clearSession = ()      => { try { localStorage.removeItem(SESSION_KEY); }                    catch {} };

// screens: 'home'|'offline'|'create'|'load-game'|'character-create'|'character-select'|'player-waiting'|'gm-game'|'player-game'|'restoring'
function App() {
  const [screen,       setScreen]       = React.useState('restoring');
  const [lobbyCode,    setLobbyCode]    = React.useState(null);
  const [gmUid,        setGmUid]        = React.useState(null);
  const [playerData,   setPlayerData]   = React.useState(null);
  const [initialState, setInitialState] = React.useState(null);
  const [joinError,    setJoinError]    = React.useState('');
  const [joining,      setJoining]      = React.useState(false);
  const [myUid,        setMyUid]        = React.useState(null);

  // ── Shared helpers ────────────────────────────────────────────────────────

  const goHome = React.useCallback(() => {
    clearSession();
    setLobbyCode(null); setGmUid(null); setPlayerData(null);
    setInitialState(null); setMyUid(null);
    setScreen('home');
  }, []);

  const tryEndGame = React.useCallback(async (code) => {
    if (!code) return;
    try { await endGame(code); } catch {}
  }, []);

  // ── Tab close: end game so players don't get stuck ───────────────────────
  React.useEffect(() => {
    const handleUnload = () => {
      if (screen === 'gm-game' && lobbyCode) endGame(lobbyCode).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [screen, lobbyCode]);

  // ── Subscribe to gameEnded when we have a lobbyCode ──────────────────────
  React.useEffect(() => {
    if (!lobbyCode || screen === 'home' || screen === 'restoring') return;
    const unsub = subscribeGameEnded(lobbyCode, goHome);
    return () => unsub();
  }, [lobbyCode, screen, goHome]);

  // ── Session restore on mount ──────────────────────────────────────────────
  React.useEffect(() => {
    const restore = async () => {
      const session = loadSession();
      if (!session?.lobbyCode || !session?.screen) { setScreen('home'); return; }

      try {
        await ensureAuth();
        const { auth } = await import('./firebase');
        const uid      = auth.currentUser?.uid;

        const snap = await getDoc(doc(db, 'campaigns', session.lobbyCode));
        if (!snap.exists() || snap.data().gameEnded) { clearSession(); setScreen('home'); return; }

        setLobbyCode(session.lobbyCode);
        if (session.gmUid)     setGmUid(session.gmUid);
        if (session.playerData) setPlayerData(session.playerData);
        setMyUid(session.myUid || uid);

        const s = session.screen;
        if      (s === 'gm-game')        setScreen('gm-game');
        else if (s === 'player-game')    setScreen('player-game');
        else if (s === 'player-waiting') setScreen('player-waiting');
        else                             setScreen('home');
      } catch {
        clearSession();
        setScreen('home');
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── End game handlers ─────────────────────────────────────────────────────

  const handleEndGame = React.useCallback(async () => {
    await tryEndGame(lobbyCode);
    goHome();
  }, [lobbyCode, tryEndGame, goHome]);

  const handleGMGoHome = React.useCallback(async () => {
    await tryEndGame(lobbyCode);
    goHome();
  }, [lobbyCode, tryEndGame, goHome]);

  // ── Join lobby handler ────────────────────────────────────────────────────

  const handleJoinLobby = React.useCallback(async (code) => {
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
        setGmUid(uid);
        saveSession({ screen: 'gm-game', lobbyCode: validCode, gmUid: uid });
        setScreen('gm-game');
      } else if (data?.isLoadedGame) {
        saveSession({ screen: 'character-select', lobbyCode: validCode, myUid: uid });
        setScreen('character-select');
      } else {
        // FIXED: duplicate branch — gameStarted and default were identical
        saveSession({ screen: 'character-create', lobbyCode: validCode, myUid: uid });
        setScreen('character-create');
      }
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  }, []);

  // ── Screens ───────────────────────────────────────────────────────────────

  if (screen === 'restoring') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#0a0505,#100808)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a961', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.15em' }}>
          ⚔️ Reconnecting...
        </div>
      </div>
    );
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        onCreateLobby={() => setScreen('create')}
        onLoadGame={() => setScreen('load-game')}
        onJoinLobby={handleJoinLobby}
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
        onBack={async () => { await tryEndGame(lobbyCode); goHome(); }}
        onGameStart={({ lobbyCode: code, gmUid: uid, initialState: state }) => {
          setLobbyCode(code); setGmUid(uid); setInitialState(state);
          saveSession({ screen: 'gm-game', lobbyCode: code, gmUid: uid });
          setScreen('gm-game');
        }}
      />
    );
  }

  if (screen === 'load-game') {
    return (
      <LoadGameLobby
        onBack={async () => { await tryEndGame(lobbyCode); goHome(); }}
        onGameStart={({ lobbyCode: code, gmUid: uid, initialState: state }) => {
          setLobbyCode(code); setGmUid(uid); setInitialState(state);
          saveSession({ screen: 'gm-game', lobbyCode: code, gmUid: uid });
          setScreen('gm-game');
        }}
      />
    );
  }

  if (screen === 'character-select') {
    return (
      <PlayerCharacterSelect
        lobbyCode={lobbyCode}
        myUid={myUid}
        onClaimCharacter={async (claimed) => {
          await addPlayerToLobby(lobbyCode, myUid, {
            playerName:    claimed.playerName,
            commanderName: claimed.playerName,
            faction:       claimed.faction,
            commander:     claimed.commander,
            playerColor:   claimed.playerColor,
          });
          const pd = { ...claimed, uid: myUid };
          setPlayerData(pd);
          saveSession({ screen: 'player-game', lobbyCode, myUid, playerData: pd });
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
        onBack={() => setScreen('character-select')}
        onComplete={async (charData) => {
          const { auth } = await import('./firebase');
          const uid      = auth.currentUser?.uid;
          await addPlayerToLobby(lobbyCode, uid, charData);
          const pd = { ...charData, uid };
          setPlayerData(pd);
          saveSession({ screen: 'player-game', lobbyCode, myUid: uid, playerData: pd });
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
        onGameStart={() => {
          saveSession({ screen: 'player-game', lobbyCode, myUid, playerData });
          setScreen('player-game');
        }}
      />
    );
  }

  if (screen === 'gm-game') {
    return (
      <HPCounter
        lobbyCode={lobbyCode}
        gmUid={gmUid}
        isMultiplayer
        initialGameState={initialState}
        onEndGame={handleEndGame}
      />
    );
  }

  if (screen === 'player-game') {
    return (
      <PlayerGameView
        lobbyCode={lobbyCode}
        playerData={playerData}
        onLeaveGame={goHome}
      />
    );
  }

  return null;
}

export default App;
