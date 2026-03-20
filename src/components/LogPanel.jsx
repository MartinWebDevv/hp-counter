import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn } from '../theme';

const LogPanel = ({ battleLog = [], onClearLog }) => {
  const [showLog, setShowLog] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowLog(!showLog)}
        style={{
          background: showLog ? colors.amberSubtle : 'rgba(0,0,0,0.3)',
          color: showLog ? colors.amber : colors.textMuted,
          padding: '0.45rem 1rem',
          borderRadius: '6px',
          fontWeight: '800',
          border: `1px solid ${showLog ? colors.amberBorder : 'rgba(255,255,255,0.06)'}`,
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontFamily: fonts.body,
          letterSpacing: '0.05em',
          transition: 'all 0.2s',
        }}
      >
        📜 {showLog ? 'Hide' : 'Show'} Battle Log
      </button>

      {showLog && (
        <div style={{
          background: surfaces.elevated,
          border: borders.warm,
          borderRadius: '8px',
          padding: '0.85rem',
          marginTop: '0.75rem',
          marginBottom: '1.5rem',
          maxHeight: '280px',
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${colors.goldBorder}`,
            paddingBottom: '0.5rem', marginBottom: '0.65rem',
          }}>
            <h3 style={{
              color: colors.gold, fontSize: '1rem', margin: 0,
              fontFamily: fonts.display, letterSpacing: '0.06em',
            }}>
              Battle Chronicle
            </h3>
            {battleLog.length > 0 && onClearLog && (
              <button onClick={onClearLog} style={btn.danger()}>🗑️ Clear</button>
            )}
          </div>

          {battleLog.length === 0 ? (
            <p style={{ color: colors.textFaint, textAlign: 'center', fontSize: '0.8rem' }}>
              No events recorded yet...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {battleLog.map(entry => (
                <div key={entry.id} style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '5px',
                  borderLeft: `2px solid ${colors.goldBorder}`,
                  fontSize: '0.78rem',
                  color: colors.textSecondary,
                }}>
                  <span style={{ fontWeight: '800', color: colors.gold }}>Round {entry.round}</span>
                  {' — '}
                  {entry.message}
                  <span style={{ float: 'right', color: colors.textFaint, fontSize: '0.68rem' }}>
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