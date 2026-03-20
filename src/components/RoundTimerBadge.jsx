import React, { useState } from 'react';
import { colors, surfaces, borders, fonts } from '../theme';

const RoundTimerBadge = ({ timers = [] }) => {
  const [hoveredId, setHoveredId] = useState(null);
  if (timers.length === 0) return null;

  const timerColor = (remaining) =>
    remaining <= 1 ? '#fca5a5' : remaining <= 3 ? colors.amber : '#a5b4fc';
  const timerBg = (remaining) =>
    remaining <= 1 ? 'rgba(239,68,68,0.15)' : remaining <= 3 ? colors.amberSubtle : 'rgba(99,102,241,0.12)';
  const timerBorder = (remaining) =>
    remaining <= 1 ? 'rgba(239,68,68,0.4)' : remaining <= 3 ? colors.amberBorder : 'rgba(99,102,241,0.35)';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
      {timers.map(timer => (
        <div
          key={timer.id}
          onMouseEnter={() => setHoveredId(timer.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.18rem',
            padding: '0.12rem 0.4rem',
            background: timerBg(timer.remaining),
            border: `1px solid ${timerBorder(timer.remaining)}`,
            borderRadius: '20px',
            cursor: 'default', userSelect: 'none',
          }}>
            <span style={{ fontSize: '0.58rem' }}>⏱</span>
            <span style={{
              fontSize: '0.62rem', fontWeight: '800',
              color: timerColor(timer.remaining), lineHeight: 1,
            }}>{timer.remaining}</span>
          </div>

          {hoveredId === timer.id && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
              transform: 'translateX(-50%)',
              background: surfaces.elevated,
              border: `1px solid ${colors.goldBorder}`,
              borderRadius: '6px', padding: '0.28rem 0.55rem',
              whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none',
            }}>
              <div style={{ color: colors.gold, fontSize: '0.68rem', fontWeight: '800' }}>{timer.name}</div>
              <div style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{timer.remaining} round{timer.remaining !== 1 ? 's' : ''} left</div>
              <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${colors.goldBorder}` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RoundTimerBadge;