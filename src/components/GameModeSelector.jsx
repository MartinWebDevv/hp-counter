import React, { useState } from 'react';
import { GAME_MODES, validateCustomMode } from '../data/gameModes';

const GameModeSelector = ({ currentMode, onModeChange, onClose }) => {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [customSettings, setCustomSettings] = useState({
    commanderHP: 15,
    squadHP: 8,
    commanderRevives: 2,
    squadRevives: 2,
    squadLives: 2
  });
  const [errors, setErrors] = useState([]);

  const handleModeSelect = (modeId) => {
    setSelectedMode(modeId);
    setErrors([]);
  };

  const handleCustomChange = (field, value) => {
    setCustomSettings(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const handleConfirm = () => {
    if (selectedMode === 'custom') {
      const validationErrors = validateCustomMode(customSettings);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      const success = onModeChange(selectedMode, customSettings);
      if (success) onClose();
    } else {
      const success = onModeChange(selectedMode);
      if (success) onClose();
    }
  };

  const gold = '#c9a961';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
          border: '3px solid ' + gold,
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        }}
      >
        <h2 style={{
          color: gold,
          fontSize: '1.75rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontFamily: '"Cinzel", Georgia, serif',
          textShadow: '2px 2px 4px rgba(0,0,0,1)',
        }}>
          Select Game Mode
        </h2>

        {/* Mode Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {Object.values(GAME_MODES).map(mode => (
            <div
              key={mode.id}
              onClick={() => handleModeSelect(mode.id)}
              style={{
                background: selectedMode === mode.id ? '#2a1810' : '#0a0503',
                border: '2px solid',
                borderColor: selectedMode === mode.id ? gold : '#5a4a3a',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem' }}>{mode.icon}</span>
                <div>
                  <h3 style={{
                    color: gold,
                    margin: 0,
                    fontSize: '1.2rem',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}>
                    {mode.name}
                  </h3>
                  <p style={{
                    color: '#8b7355',
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem'
                  }}>
                    {mode.description}
                  </p>
                </div>
              </div>

              {mode.id !== 'custom' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#8b7355'
                }}>
                  <div>Commander HP: {mode.commanderHP}</div>
                  <div>Squad HP: {mode.squadHP}</div>
                  <div>Commander Revives: {mode.commanderRevives}</div>
                  <div>Squad Revives: {mode.squadRevives}</div>
                  <div>Squad Lives: {mode.squadLives}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Mode Settings */}
        {selectedMode === 'custom' && (
          <div style={{
            background: '#0a0503',
            border: '2px solid ' + gold,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{
              color: gold,
              marginTop: 0,
              marginBottom: '1rem',
              fontFamily: '"Cinzel", Georgia, serif'
            }}>
              Custom Settings
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Commander HP:
                </label>
                <input
                  type="number"
                  min="1"
                  value={customSettings.commanderHP}
                  onChange={(e) => handleCustomChange('commanderHP', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}
                />
              </div>

              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Squad HP:
                </label>
                <input
                  type="number"
                  min="1"
                  value={customSettings.squadHP}
                  onChange={(e) => handleCustomChange('squadHP', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}
                />
              </div>

              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Commander Revives:
                </label>
                <input
                  type="number"
                  min="0"
                  value={customSettings.commanderRevives}
                  onChange={(e) => handleCustomChange('commanderRevives', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}
                />
              </div>

              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Squad Revives:
                </label>
                <input
                  type="number"
                  min="0"
                  value={customSettings.squadRevives}
                  onChange={(e) => handleCustomChange('squadRevives', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}
                />
              </div>

              <div>
                <label style={{ color: gold, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Squad Lives:
                </label>
                <input
                  type="number"
                  min="1"
                  value={customSettings.squadLives}
                  onChange={(e) => handleCustomChange('squadLives', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a0f0a',
                    color: gold,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #5a4a3a',
                    fontFamily: '"Cinzel", Georgia, serif'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{
            background: 'rgba(127, 29, 29, 0.3)',
            border: '1px solid #7f1d1d',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            {errors.map((error, idx) => (
              <div key={idx} style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                • {error}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: 'linear-gradient(to bottom, #15803d, #14532d)',
              color: '#86efac',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid #16a34a',
              cursor: 'pointer',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            ✓ Confirm
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'linear-gradient(to bottom, #7f1d1d, #5f1a1a)',
              color: '#fecaca',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid #991b1b',
              cursor: 'pointer',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelector;