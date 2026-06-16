import React from 'react';
import { fonts, colors } from '../theme';
import { FACTIONS } from '../data/factions';
import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

const PLAYER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const DEFAULT_SQUAD_NAMES = ['Special', 'Soldier 1', 'Soldier 2', 'Soldier 3', 'Soldier 4'];

// Build inverse map: commander → [factions]
const COMMANDER_TO_FACTIONS = {};
Object.entries(FACTIONS).forEach(([faction, commanders]) => {
  commanders.forEach(commander => {
    if (!COMMANDER_TO_FACTIONS[commander]) COMMANDER_TO_FACTIONS[commander] = [];
    COMMANDER_TO_FACTIONS[commander].push(faction);
  });
});

// Unique sorted commander list
const ALL_COMMANDERS = Object.keys(COMMANDER_STATS).sort();

// Stat row helper — shared between commander and faction tiles
const StatRow = ({ stats, isSelected, isCommander }) => {
  const s = stats;
  if (!s) return null;
  const items = isCommander
    ? [
        { label: 'Walk',    value: s.walk },
        { label: 'Run',     value: s.run  },
        { label: 'Shoot',   value: s.shootRange },
        { label: 'Attacks', value: '×' + s.attacksPerHit },
        { label: 'Heal',    value: s.rollToHeal + '+' },
      ]
    : [
        { label: 'Walk',    value: s.walk },
        { label: 'Run',     value: s.run  },
        { label: 'Shoot',   value: s.shootRange },
        { label: 'Attacks', value: '×' + s.attacksPerHit },
        { label: 'Heal',    value: s.rollToHeal + '+' },
      ];
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ fontSize: '0.65rem' }}>
          <span style={{ color: colors.textFaint }}>{label}: </span>
          <span style={{ color: isSelected ? colors.amber : colors.textMuted, fontWeight: '700' }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * CharacterCreator — two-step wizard:
 *   Step 1: pick Commander → pick Faction
 *   Step 2: name commander + squad units + pick color
 */
const CharacterCreator = ({ onComplete, onBack, lobbyCode }) => {
  const [step,              setStep]             = React.useState(1);
  const [selectedCommander, setSelectedCommander] = React.useState(null);
  const [selectedFaction,   setSelectedFaction]   = React.useState(null);
  const [playerName,        setPlayerName]        = React.useState('');
  const [commanderName,     setCommanderName]     = React.useState('');
  const [squadNames,        setSquadNames]        = React.useState(['', '', '', '', '']);
  const [squadSubTypes,     setSquadSubTypes]     = React.useState(['caveman', 'caveman', 'caveman', 'caveman', 'caveman']);
  const [playerColor,       setPlayerColor]       = React.useState(PLAYER_COLORS[0]);

  // Factions available for the selected commander
  const availableFactions = selectedCommander ? (COMMANDER_TO_FACTIONS[selectedCommander] || []) : [];

  const handleCommanderSelect = (commander) => {
    setSelectedCommander(commander);
    setSelectedFaction(null); // reset faction when commander changes
  };

  const goToStep2 = () => {
    if (!selectedCommander || !selectedFaction) return;
    setCommanderName(selectedCommander);
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
      squadSubTypes: selectedFaction === 'Uncivilized' ? squadSubTypes : squadSubTypes.map(() => null),
      playerColor,
    });
  };

  // ── Step 1: Commander → Faction ───────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>

          {/* Header — fixed at top */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>⚔️</div>
            <h2 style={titleStyle}>Choose Your Commander</h2>
            <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>
              Lobby: <span style={{ color: colors.gold, letterSpacing: '0.1em' }}>{lobbyCode}</span>
            </div>
          </div>

          {/* Scrollable content area */}
          <div style={scrollAreaStyle}>

            {/* Commander list — 2 column grid */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionLabel}>Commander</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {ALL_COMMANDERS.map(commander => {
                  const s = COMMANDER_STATS[commander];
                  const isSelected = selectedCommander === commander;
                  return (
                    <button
                      key={commander}
                      onClick={() => handleCommanderSelect(commander)}
                      style={{
                        padding: '0.75rem 0.75rem',
                        background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${isSelected ? colors.gold : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '10px', cursor: 'pointer',
                        fontFamily: fonts.body, textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        fontWeight: '800', fontSize: '0.82rem',
                        color: isSelected ? colors.gold : colors.textPrimary,
                        marginBottom: s ? '0.2rem' : 0,
                        lineHeight: '1.2',
                      }}>
                        {isSelected ? '▶ ' : ''}{commander}
                      </div>
                      <StatRow stats={s} isSelected={isSelected} isCommander />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Faction list — shown after commander is picked */}
            {selectedCommander && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={sectionLabel}>Faction</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {availableFactions.map(faction => {
                    const rawStats = FACTION_STATS[faction];
                    // Uncivilized has sub-types — show both
                    const isUncivilized = faction === 'Uncivilized';
                    const isSelected    = selectedFaction === faction;
                    return (
                      <button
                        key={faction}
                        onClick={() => setSelectedFaction(faction)}
                        style={{
                          padding: '0.85rem 1rem',
                          background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                          border: `2px solid ${isSelected ? colors.gold : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '10px', cursor: 'pointer',
                          fontFamily: fonts.body, textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          fontWeight: '800', fontSize: '0.9rem',
                          color: isSelected ? colors.gold : colors.textPrimary,
                          marginBottom: '0.25rem',
                        }}>
                          {isSelected ? '▶ ' : ''}{faction}
                        </div>

                        {isUncivilized ? (
                          // Show both caveman and dinosaur stats
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div>
                              <div style={{ fontSize: '0.62rem', color: colors.textFaint, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>🪨 Caveman</div>
                              <StatRow stats={rawStats?.caveman} isSelected={isSelected} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.62rem', color: colors.textFaint, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>🦕 Dinosaur</div>
                              <StatRow stats={rawStats?.dinosaur} isSelected={isSelected} />
                            </div>
                          </div>
                        ) : (
                          <StatRow stats={rawStats} isSelected={isSelected} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Buttons — pinned at bottom, never scrolls away */}
          <div style={{ flexShrink: 0, paddingTop: '0.75rem' }}>
            <button
              onClick={goToStep2}
              disabled={!selectedCommander || !selectedFaction}
              style={primaryBtn(!selectedCommander || !selectedFaction)}
            >
              Next — Name Your Units →
            </button>
            {onBack && (
              <button onClick={onBack} style={ghostBtn}>
                ← Back to Character Select
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── Step 2: Naming + Color ────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>✍️</div>
          <h2 style={titleStyle}>Name Your Units</h2>
          <div style={{ color: colors.textMuted, fontSize: '0.75rem' }}>Leave blank for default names</div>
        </div>

        {/* Scrollable fields */}
        <div style={scrollAreaStyle}>

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
              <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: i < 4 ? '0.45rem' : 0 }}>
                <input
                  value={name}
                  onChange={e => {
                    const next = [...squadNames];
                    next[i] = e.target.value;
                    setSquadNames(next);
                  }}
                  placeholder={DEFAULT_SQUAD_NAMES[i]}
                  maxLength={24}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                {selectedFaction === 'Uncivilized' && (
                  <select
                    value={squadSubTypes[i]}
                    onChange={e => {
                      const next = [...squadSubTypes];
                      next[i] = e.target.value;
                      setSquadSubTypes(next);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${squadSubTypes[i] === 'dinosaur' ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
                      borderRadius: '7px', padding: '0.38rem 0.45rem',
                      color: squadSubTypes[i] === 'dinosaur' ? '#6ee7b7' : '#fbbf24',
                      fontFamily: fonts.body, fontSize: '0.7rem', fontWeight: '800',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <option value="caveman">🪨 Caveman</option>
                    <option value="dinosaur">🦕 Dinosaur</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Player color */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={sectionLabel}>Player Color</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PLAYER_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setPlayerColor(color)}
                  style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%', background: color,
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
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '10px', marginBottom: '0.5rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Summary</div>
            <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.9rem' }}>{commanderName.trim() || selectedCommander}</div>
            <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.15rem' }}>{selectedFaction} · {selectedCommander}</div>
          </div>

        </div>

        {/* Action buttons — pinned at bottom */}
        <div style={{ flexShrink: 0, paddingTop: '0.75rem' }}>
          <button onClick={handleComplete} style={primaryBtn(false)}>
            ⚔️ Enter the Lobby
          </button>
          <button onClick={() => setStep(1)} style={ghostBtn}>
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle = {
  height: '100vh',
  background: 'linear-gradient(145deg, #0a0505, #100808)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: fonts.body,
  padding: '1rem',
  boxSizing: 'border-box',
  overflowY: 'auto',
};

const cardStyle = {
  background: 'linear-gradient(145deg, #160e0e, #0e0808)',
  border: '1px solid rgba(201,169,97,0.2)',
  borderRadius: '16px',
  padding: '1.75rem',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
  // Key fix: card is a flex column with a fixed max height
  // the scroll area grows, the button never gets pushed off screen
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100svh - 2rem)',
  boxSizing: 'border-box',
};

// The middle section scrolls; header and button do not
const scrollAreaStyle = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  paddingRight: '0.25rem', // small offset so scrollbar doesn't clip content
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