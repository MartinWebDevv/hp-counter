import React, { useState } from 'react';

/**
 * RoundTimerBadge
 * Small badge shown on unit/NPC cards for each latched timer.
 * Hovering shows the timer name as a tooltip.
 *
 * Props:
 *   timers  — array of timer objects (already filtered for this unit)
 */
const RoundTimerBadge = ({ timers = [] }) => {
  const [hoveredId, setHoveredId] = useState(null);

  if (timers.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
      {timers.map(timer => (
        <div
          key={timer.id}
          onMouseEnter={() => setHoveredId(timer.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        >
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.15rem 0.45rem',
            background: timer.remaining <= 1
              ? 'rgba(239,68,68,0.18)'
              : timer.remaining <= 3
                ? 'rgba(251,191,36,0.15)'
                : 'rgba(99,102,241,0.15)',
            border: `1px solid ${timer.remaining <= 1 ? 'rgba(239,68,68,0.5)' : timer.remaining <= 3 ? 'rgba(251,191,36,0.4)' : 'rgba(99,102,241,0.4)'}`,
            borderRadius: '20px',
            cursor: 'default',
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '0.6rem' }}>⏱</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: '800',
              color: timer.remaining <= 1 ? '#fca5a5' : timer.remaining <= 3 ? '#fbbf24' : '#a5b4fc',
              lineHeight: 1,
            }}>
              {timer.remaining}
            </span>
          </div>

          {/* Tooltip */}
          {hoveredId === timer.id && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0a0503',
              border: '1px solid rgba(201,169,97,0.4)',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              whiteSpace: 'nowrap',
              zIndex: 9999,
              pointerEvents: 'none',
            }}>
              <div style={{ color: '#c9a961', fontSize: '0.7rem', fontWeight: '800' }}>{timer.name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.62rem' }}>{timer.remaining} round{timer.remaining !== 1 ? 's' : ''} left</div>
              {/* Arrow */}
              <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(201,169,97,0.4)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RoundTimerBadge;