import React, { useState, useRef, useEffect } from 'react';
import { colors, surfaces, borders, fonts, btn } from '../theme';

const FILTERS = [
  { id: 'all',    label: '📜 All'    },
  { id: 'combat', label: '⚔️ Combat' },
  { id: 'items',  label: '📦 Items'  },
  { id: 'vp',     label: '🏆 VP'     },
  { id: 'system', label: '⚙️ System' },
];

// Colour the left border based on category
const categoryBorder = {
  combat: '#ef4444',
  items:  '#a78bfa',
  vp:     '#fbbf24',
  system: 'rgba(201,169,97,0.4)',
};

const LogPanel = ({ battleLog = [], onClearLog }) => {
  const [showLog,    setShowLog]    = useState(false);
  const [activeFilter, setFilter]  = useState('all');
  const logEndRef = useRef(null);
  const scrollRef = useRef(null);

  const handleFilterChange = (id) => {
    setFilter(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const filtered = activeFilter === 'all'
    ? battleLog
    : battleLog.filter(e => (e.category || 'system') === activeFilter);

  // Also reset as safety net after render
  useEffect(() => {
    if (showLog && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeFilter, showLog]);

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
          whiteSpace: 'nowrap',
        }}
      >
        📜 {showLog ? 'Hide' : 'Show'} Log {battleLog.length > 0 && `(${battleLog.length})`}
      </button>

      {showLog && (
        <div style={{
          background: surfaces.elevated,
          border: borders.warm,
          borderRadius: '8px',
          padding: '0.85rem',
          marginTop: '0.75rem',
          marginBottom: '1.5rem',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        }}>
          {/* Header row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${colors.goldBorder}`,
            paddingBottom: '0.5rem', marginBottom: '0.6rem',
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

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
            {FILTERS.map(f => {
              const count = f.id === 'all'
                ? battleLog.length
                : battleLog.filter(e => (e.category || 'system') === f.id).length;
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    border: `1px solid ${active ? colors.goldBorder : 'rgba(255,255,255,0.08)'}`,
                    background: active ? colors.amberSubtle : 'transparent',
                    color: active ? colors.amber : colors.textFaint,
                    fontSize: '0.65rem', fontWeight: '800',
                    cursor: 'pointer', fontFamily: fonts.body,
                    letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {f.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            style={{ maxHeight: '260px', overflowY: 'auto' }}
          >
            {filtered.length === 0 ? (
              <p style={{ color: colors.textFaint, textAlign: 'center', fontSize: '0.8rem', margin: 0, padding: '0.75rem 0' }}>
                No {activeFilter === 'all' ? '' : activeFilter + ' '}events yet...
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {filtered.map(entry => (
                  <div key={entry.id} style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.38rem 0.6rem',
                    borderRadius: '5px',
                    borderLeft: `3px solid ${categoryBorder[entry.category || 'system'] || categoryBorder.system}`,
                    fontSize: '0.78rem',
                    color: colors.textSecondary,
                    lineHeight: '1.35',
                  }}>
                    <span style={{ fontWeight: '800', color: colors.gold, marginRight: '0.3rem' }}>
                      R{entry.round}
                    </span>
                    {entry.message}
                    <span style={{ float: 'right', color: colors.textFaint, fontSize: '0.65rem', marginLeft: '0.5rem' }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogPanel;