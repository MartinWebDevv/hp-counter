import React, { useState } from 'react';

const LogPanel = ({ battleLog = [], onClearLog }) => {
  const [showLog, setShowLog] = useState(false);

  return (
    <div>
      {/* Toggle Button */}
      <button
        onClick={() => setShowLog(!showLog)}
        style={{
          background: 'linear-gradient(to bottom, #92400e, #78350f)',
          color: '#fef3c7',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          fontWeight: '600',
          border: '2px solid #a16207',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontFamily: '"Cinzel", Georgia, serif',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to bottom, #a16207, #92400e)'}
        onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to bottom, #92400e, #78350f)'}
      >
        📜 {showLog ? 'Hide' : 'Show'} Battle Log
      </button>

      {/* Log Panel */}
      {showLog && (
        <div style={{
          background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
          border: '2px solid #c9a961',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          marginBottom: '2rem',
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #c9a961',
            paddingBottom: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <h3 style={{
              color: '#c9a961',
              fontSize: '1.25rem',
              margin: 0,
              fontFamily: '"Cinzel", Georgia, serif',
            }}>
              Battle Chronicle
            </h3>

            {/* Clear Log Button */}
            {battleLog.length > 0 && onClearLog && (
              <button
                onClick={onClearLog}
                style={{
                  background: 'transparent',
                  border: '1px solid #7f1d1d',
                  color: '#fca5a5',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontFamily: '"Cinzel", Georgia, serif',
                }}
              >
                🗑️ Clear
              </button>
            )}
          </div>

          {/* Log Entries */}
          {battleLog.length === 0 ? (
            <p style={{
              color: '#c9a961',
              textAlign: 'center',
              fontSize: '0.875rem',
              opacity: 0.7
            }}>
              No events recorded yet...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {battleLog.map(entry => (
                <div key={entry.id} style={{
                  background: '#0a0503',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  borderLeft: '3px solid #c9a961',
                  fontSize: '0.875rem',
                  color: '#c9a961'
                }}>
                  <span style={{ fontWeight: 'bold' }}>Round {entry.round}</span>
                  {' - '}
                  {entry.message}
                  <span style={{
                    float: 'right',
                    opacity: 0.7,
                    fontSize: '0.75rem'
                  }}>
                    {entry.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogPanel;