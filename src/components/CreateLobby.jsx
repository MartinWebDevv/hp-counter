import React from 'react';
import { fonts, colors } from '../theme';
import { createLobby, createLobbyWithCode, subscribeLobby, updateLobbyMeta } from '../services/lobbyService';
import { buildInitialGameState, writeGameState } from '../services/gameStateService';

/**
 * CreateLobby
 * Step 1: GM picks a lobby code (generated or custom)
 * Step 2: Waiting room — shows code, live player list, Start Game button
 */
const CreateLobby = ({ onGameStart, onBack }) => {
  // Step 1 state
  const [step,          setStep]          = React.useState('pick');   // 'pick' | 'waiting' | 'error'
  const [generated,     setGenerated]     = React.useState('');       // auto-generated code
  const [customCode,    setCustomCode]    = React.useState('');       // what GM types
  const [useCustom,     setUseCustom]     = React.useState(false);
  const [creating,      setCreating]      = React.useState(false);
  const [codeError,     setCodeError]     = React.useState('');

  // Step 2 state
  const [lobbyCode,     setLobbyCode]     = React.useState('');
  const [gmUid,         setGmUid]         = React.useState('');
  const [players,       setPlayers]       = React.useState({});
  const [error,         setError]         = React.useState('');
  const [copied,        setCopied]        = React.useState(false);
  const unsubRef = React.useRef(null);

  // Generate a code on mount for the GM to see
  React.useEffect(() => {
    const words    = ['BEAR','WOLF','IRON','FIRE','GOLD','DARK','STORM','BLADE','CROW','VIPER','RUNE','FROST','EMBER','TITAN','SHADOW','DRAGON','OAK','STEEL','BONE','DUSK','MOON','SUN','VOID','BLOOD'];
    const digits   = '23456789';
    const word     = words[Math.floor(Math.random() * words.length)];
    const nums     = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
    setGenerated(`${word}-${nums}`);
  }, []);

  // ── Code validation ──────────────────────────────────────────────────────
  const validateCode = (raw) => {
    if (!raw.trim()) return 'Enter a lobby code.';
    if (raw.length < 4)  return 'Code must be at least 4 characters.';
    if (raw.length > 10) return 'Code must be 10 characters or fewer.';
    if (!/^[A-Z0-9-]+$/.test(raw)) return 'Letters, numbers, and hyphens only — no spaces or symbols.';
    return '';
  };

  const handleCustomChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCustomCode(val);
    setCodeError('');
  };

  // ── Create lobby ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const finalCode = useCustom ? customCode : generated;
    const validationError = useCustom ? validateCode(customCode) : '';
    if (validationError) { setCodeError(validationError); return; }

    setCreating(true);
    setCodeError('');
    try {
      let result;
      if (useCustom) {
        result = await createLobbyWithCode(finalCode);
      } else {
        // Use the generated code — createLobby auto-ensures uniqueness
        // but we want to use OUR generated code, so use createLobbyWithCode
        result = await createLobbyWithCode(finalCode);
      }
      const { code, uid } = result;
      setLobbyCode(code);
      setGmUid(uid);
      setStep('waiting');

      unsubRef.current = subscribeLobby(code, (data) => {
        setPlayers(data.players || {});
      });
    } catch (err) {
      setCodeError(err.message || 'Failed to create lobby.');
      setCreating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartGame = async () => {
    const initialState = buildInitialGameState({ players }, 'campaign');
    await writeGameState(lobbyCode, initialState);
    await updateLobbyMeta(lobbyCode, { gameStarted: true });
    onGameStart({ lobbyCode, gmUid, players, initialState });
  };

  React.useEffect(() => {
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  const playerList = Object.values(players);

  // ── Error screen ─────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div style={{ color: '#f87171', fontFamily: fonts.body, marginBottom: '1rem' }}>{error}</div>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>
    );
  }

  // ── Step 1: Pick code ─────────────────────────────────────────────────────
  if (step === 'pick') {
    const displayCode = useCustom ? customCode : generated;
    const isValid     = useCustom ? !validateCode(customCode) : true;

    return (
      <div style={{ minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.body, padding: '2rem', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👑</div>
            <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.12em', margin: '0 0 0.4rem' }}>
              CREATE LOBBY
            </h2>
            <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>
              Choose your lobby code
            </div>
          </div>

          {/* Code display / input */}
          <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: `2px solid ${codeError ? '#ef4444' : 'rgba(201,169,97,0.35)'}`, borderRadius: '14px', padding: '1.75rem', textAlign: 'center', marginBottom: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Lobby Code
            </div>

            {useCustom ? (
              <input
                autoFocus
                value={customCode}
                onChange={handleCustomChange}
                placeholder="e.g. SERAVAHN"
                maxLength={10}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(0,0,0,0.4)',
                  border: `2px solid ${codeError ? '#ef4444' : 'rgba(201,169,97,0.4)'}`,
                  borderRadius: '10px', padding: '0.85rem',
                  color: colors.gold,
                  fontFamily: fonts.display,
                  fontSize: '1.8rem', fontWeight: '900',
                  textAlign: 'center', letterSpacing: '0.18em',
                  outline: 'none', marginBottom: '0.5rem',
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            ) : (
              <div style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0.18em', textShadow: `0 0 24px ${colors.amber}50`, marginBottom: '0.75rem' }}>
                {generated}
              </div>
            )}

            {codeError && (
              <div style={{ color: '#f87171', fontSize: '0.72rem', marginBottom: '0.5rem' }}>{codeError}</div>
            )}

            {/* Toggle custom */}
            <button
              onClick={() => { setUseCustom(u => !u); setCustomCode(''); setCodeError(''); }}
              style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.7rem', textDecoration: 'underline', padding: '0.2rem' }}
            >
              {useCustom ? '← Use generated code' : '✏️ Use my own code'}
            </button>
          </div>

          {/* Rules hint when custom is on */}
          {useCustom && (
            <div style={{ background: 'rgba(201,169,97,0.05)', border: '1px solid rgba(201,169,97,0.15)', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1rem', color: colors.textFaint, fontSize: '0.65rem', lineHeight: '1.6' }}>
              4–10 characters · Letters, numbers, hyphens only · Auto-uppercased · No spaces
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={creating || (useCustom && !customCode.trim())}
            style={{
              width: '100%', padding: '1.1rem',
              background: creating || (useCustom && !customCode.trim()) ? 'rgba(0,0,0,0.3)' : 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
              border: `2px solid ${creating || (useCustom && !customCode.trim()) ? 'rgba(255,255,255,0.08)' : '#ef4444'}`,
              color: creating || (useCustom && !customCode.trim()) ? colors.textFaint : '#fecaca',
              borderRadius: '10px', cursor: creating || (useCustom && !customCode.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: fonts.body, fontWeight: '800', fontSize: '1rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              boxShadow: '0 6px 20px rgba(239,68,68,0.2)',
              marginBottom: '0.75rem', transition: 'all 0.2s',
            }}
          >
            {creating ? '⏳ Creating...' : '👑 Create Lobby'}
          </button>

          <button onClick={onBack} style={backBtn}>← Back to Home</button>
        </div>
      </div>
    );
  }

  // ── Step 2: Waiting room ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100svh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(145deg, #0a0505, #100808)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: fonts.body, padding: '2rem', paddingTop: '2.5rem', paddingBottom: '3rem', boxSizing: 'border-box' }}>

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👑</div>
          <h2 style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.12em', margin: 0 }}>
            GAME MASTER LOBBY
          </h2>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.4rem' }}>
            Share this code with your players
          </div>
        </div>

        {/* Code display */}
        <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '2px solid rgba(201,169,97,0.35)', borderRadius: '14px', padding: '1.75rem', textAlign: 'center', marginBottom: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            Lobby Code
          </div>
          <div style={{ fontFamily: fonts.display, color: colors.gold, fontSize: '2.4rem', fontWeight: '900', letterSpacing: '0.18em', textShadow: `0 0 24px ${colors.amber}50`, marginBottom: '1rem' }}>
            {lobbyCode}
          </div>
          <button onClick={copyCode} style={{ padding: '0.5rem 1.25rem', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,169,97,0.1)', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(201,169,97,0.3)'}`, color: copied ? '#4ade80' : colors.gold, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '700', fontSize: '0.78rem', letterSpacing: '0.08em', transition: 'all 0.2s' }}>
            {copied ? '✓ Copied!' : '📋 Copy Code'}
          </button>
        </div>

        {/* Players list */}
        <div style={{ background: 'linear-gradient(145deg, #160e0e, #0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
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
              <div key={p.uid || i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: i < playerList.length - 1 ? '0.4rem' : 0 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.playerColor || '#4ade80', boxShadow: `0 0 6px ${p.playerColor || '#4ade80'}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: colors.textPrimary, fontWeight: '700', fontSize: '0.88rem' }}>{p.playerName || p.commanderName || 'Unnamed Player'}</div>
                  {(p.commander || p.faction) && (
                    <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>{p.commander} · {p.faction}</div>
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
          style={{ width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)', border: '2px solid #ef4444', color: '#fecaca', borderRadius: '10px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 6px 20px rgba(239,68,68,0.2)', marginBottom: '0.75rem', transition: 'all 0.2s' }}
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
  minHeight: '100svh', background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  fontFamily: fonts.body,
};

const backBtn = {
  width: '100%', padding: '0.7rem',
  background: 'transparent', border: 'none',
  color: colors.textFaint, cursor: 'pointer',
  fontFamily: fonts.body, fontSize: '0.8rem', textAlign: 'center',
};

export default CreateLobby;