import React from 'react';
import { fonts, colors } from '../theme';
import { FACTIONS } from '../data/factions';
import { COMMANDER_STATS } from '../data/commanderStats';

const PLAYER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const DEFAULT_SQUAD_NAMES = ['Special', 'Soldier 1', 'Soldier 2', 'Soldier 3', 'Soldier 4'];

/**
 * CharacterCreator
 * Two-step wizard:
 *   Step 1 — pick faction → pick commander
 *   Step 2 — name commander + squad units
 */
const CharacterCreator = ({ onComplete, lobbyCode }) => {
  const [step,              setStep]             = React.useState(1);
  const [selectedFaction,   setSelectedFaction]   = React.useState(null);
  const [selectedCommander, setSelectedCommander] = React.useState(null);
  const [playerName,        setPlayerName]        = React.useState('');
  const [commanderName,     setCommanderName]     = React.useState('');
  const [squadNames,        setSquadNames]        = React.useState(['', '', '', '', '']);
  const [playerColor,       setPlayerColor]       = React.useState(PLAYER_COLORS[0]);

  const factionList    = Object.keys(FACTIONS);
  const commanderList  = selectedFaction ? FACTIONS[selectedFaction] : [];
  const stats          = selectedCommander ? COMMANDER_STATS[selectedCommander] : null;

  const handleFactionSelect = (faction) => {
    setSelectedFaction(faction);
    setSelectedCommander(null);
  };

  const handleCommanderSelect = (commander) => {
    setSelectedCommander(commander);
  };

  const goToStep2 = () => {
    if (!selectedFaction || !selectedCommander) return;
    setCommanderName(selectedCommander); // pre-fill with commander name
    setStep(2);
  };

  const handleComplete = () => {
    const finalPlayerName    = playerName.trim()    || selectedCommander;
    const finalCommanderName = commanderName.trim() || selectedCommander;
    const finalSquadNames    = squadNames.map((n, i) => n.trim() || DEFAULT_SQUAD_NAMES[i]);

    onComplete({
      faction:       selectedFaction,
      commander:     selectedCommander,
      playerName:    finalPlayerName,
      commanderName: finalCommanderName,
      squadNames:    finalSquadNames,
      playerColor,
    });
  };

  // ── Step 1: Faction + Commander ───────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>⚔️</div>
            <h2 style={titleStyle}>Choose Your Faction</h2>
            <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Lobby: <span style={{ color: colors.gold, letterSpacing: '0.1em' }}>{lobbyCode}</span></div>
          </div>

          {/* Faction grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={sectionLabel}>Faction</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {factionList.map(faction => (
                <button
                  key={faction}
                  onClick={() => handleFactionSelect(faction)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    background: selectedFaction === faction ? 'rgba(201,169,97,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${selectedFaction === faction ? colors.gold : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    fontFamily: fonts.body, fontWeight: '700',
                    fontSize: '0.78rem', color: selectedFaction === faction ? colors.gold : colors.textMuted,
                    textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  {faction}
                </button>
              ))}
            </div>
          </div>

          {/* Commander list */}
          {selectedFaction && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={sectionLabel}>Commander</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {commanderList.map(commander => {
                  const s = COMMANDER_STATS[commander];
                  const isSelected = selectedCommander === commander;
                  return (
                    <button
                      key={commander}
                      onClick={() => handleCommanderSelect(commander)}
                      style={{
                        padding: '0.85rem 1rem',
                        background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${isSelected ? colors.gold : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '10px', cursor: 'pointer',
                        fontFamily: fonts.body, textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: isSelected ? colors.gold : colors.textPrimary, marginBottom: '0.3rem' }}>
                        {isSelected ? '▶ ' : ''}{commander}
                      </div>
                      {s && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {[
                            { label: 'Walk',    value: s.walk },
                            { label: 'Run',     value: s.run  },
                            { label: 'Shoot',   value: s.shootRange },
                            { label: 'Attacks', value: '×' + s.attacksPerHit },
                            { label: 'Heal/Revive', value: s.rollToHeal + '+' },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ fontSize: '0.65rem' }}>
                              <span style={{ color: colors.textFaint }}>{label}: </span>
                              <span style={{ color: isSelected ? colors.amber : colors.textMuted, fontWeight: '700' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={goToStep2}
            disabled={!selectedFaction || !selectedCommander}
            style={primaryBtn(!selectedFaction || !selectedCommander)}
          >
            Next — Name Your Units →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Naming + Color ────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>✍️</div>
          <h2 style={titleStyle}>Name Your Units</h2>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Leave blank for default names</div>
        </div>

        {/* Player name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={sectionLabel}>Player Name</div>
          <input
            autoFocus
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder='Your name (e.g. Martin)'
            maxLength={30}
            style={inputStyle}
          />
        </div>

        {/* Commander name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={sectionLabel}>Commander Name</div>
          <input
            value={commanderName}
            onChange={e => setCommanderName(e.target.value)}
            placeholder={selectedCommander}
            maxLength={30}
            style={inputStyle}
          />
        </div>

        {/* Squad names */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={sectionLabel}>Unit Names</div>
          {squadNames.map((name, i) => (
            <input
              key={i}
              value={name}
              onChange={e => {
                const next = [...squadNames];
                next[i] = e.target.value;
                setSquadNames(next);
              }}
              placeholder={DEFAULT_SQUAD_NAMES[i]}
              maxLength={24}
              style={{ ...inputStyle, marginBottom: i < 4 ? '0.45rem' : 0 }}
            />
          ))}
        </div>

        {/* Player color */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={sectionLabel}>Player Color</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PLAYER_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setPlayerColor(color)}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: color,
                  border: playerColor === color ? '3px solid #fff' : '3px solid transparent',
                  cursor: 'pointer',
                  boxShadow: playerColor === color ? `0 0 10px ${color}` : 'none',
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '10px', marginBottom: '1.25rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Summary</div>
          <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.9rem' }}>{commanderName.trim() || selectedCommander}</div>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.15rem' }}>{selectedFaction} · {selectedCommander}</div>
        </div>

        <button onClick={handleComplete} style={primaryBtn(false)}>
          ⚔️ Enter the Lobby
        </button>

        <button onClick={() => setStep(1)} style={ghostBtn}>
          ← Back
        </button>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  fontFamily: fonts.body, padding: '2rem',
};

const cardStyle = {
  background: 'linear-gradient(145deg, #160e0e, #0e0808)',
  border: '1px solid rgba(201,169,97,0.2)',
  borderRadius: '16px', padding: '2rem',
  width: '100%', maxWidth: '480px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
  maxHeight: '90vh', overflowY: 'auto',
};

const titleStyle = {
  fontFamily: '"Cinzel", Georgia, serif',
  color: colors.gold, fontSize: '1.3rem',
  fontWeight: '900', letterSpacing: '0.1em',
  margin: '0 0 0.25rem',
};

const sectionLabel = {
  color: colors.textFaint, fontSize: '0.62rem',
  letterSpacing: '0.12em', textTransform: 'uppercase',
  marginBottom: '0.5rem', fontWeight: '800',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(201,169,97,0.25)',
  borderRadius: '8px', padding: '0.7rem 0.9rem',
  color: colors.textPrimary, fontFamily: fonts.body,
  fontSize: '0.88rem', outline: 'none',
};

const primaryBtn = (disabled) => ({
  width: '100%', padding: '1rem',
  background: disabled ? 'rgba(0,0,0,0.2)' : 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
  border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : '#ef4444'}`,
  color: disabled ? colors.textFaint : '#fecaca',
  borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: fonts.body, fontWeight: '800',
  fontSize: '0.95rem', letterSpacing: '0.08em',
  marginBottom: '0.6rem', transition: 'all 0.2s',
});

const ghostBtn = {
  width: '100%', padding: '0.7rem',
  background: 'transparent', border: 'none',
  color: colors.textFaint, cursor: 'pointer',
  fontFamily: fonts.body, fontSize: '0.8rem',
};

export default CharacterCreator;
