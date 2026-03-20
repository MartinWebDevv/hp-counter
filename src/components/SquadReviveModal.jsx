import React from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors, inputStyle as themeInput } from '../theme';

/**
 * SquadReviveModal
 * Shows the revive queue for a player's squad.
 * Player gets 1 revive attempt per turn - always attempts the first unit in queue.
 * SUCCESS: Revive at half HP, remove from queue, decrement livesRemaining.
 * FAIL: Stay in queue, no life lost.
 */
const SquadReviveModal = ({ player, onRevive, onClose }) => {
  if (!player) return null;

  const queue = player.reviveQueue || [];
  const firstInQueue = queue.length > 0 ? queue[0] : null;
  const unitToRevive = firstInQueue !== null ? player.subUnits[firstInQueue] : null;

  const getUnitLabel = (index) => {
    const unit = player.subUnits[index];
    if (!unit) return `Unit ${index}`;
    if (unit.name) return unit.name;
    return index === 0 ? '⭐ Special Unit' : `🛡️ Soldier ${index}`;
  };

  const getLivesDisplay = (unit) => {
    const lives = unit?.livesRemaining ?? unit?.revives ?? 0;
    return lives;
  };

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
    >
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚕️</div>
          <h2 style={titleStyle}>SQUAD REVIVE</h2>
          <p style={subtitleStyle}>{player.playerName}</p>
        </div>

        {/* Queue Display */}
        {queue.length === 0 ? (
          <div style={emptyQueueStyle}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ color: '#86efac', fontWeight: '700' }}>No units in revive queue</p>
            <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>All squad members are alive or permanently eliminated.</p>
          </div>
        ) : (
          <>
            {/* Queue List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={queueLabelStyle}>REVIVE QUEUE ({queue.length} unit{queue.length !== 1 ? 's' : ''})</p>
              <div style={queueListStyle}>
                {queue.map((unitIndex, pos) => {
                  const unit = player.subUnits[unitIndex];
                  const isNext = pos === 0;
                  const lives = getLivesDisplay(unit);
                  return (
                    <div key={unitIndex} style={{
                      ...queueItemStyle,
                      background: isNext
                        ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(161, 98, 7, 0.15))'
                        : 'rgba(0,0,0,0.3)',
                      border: isNext
                        ? '2px solid #eab308'
                        : '1px solid rgba(139, 92, 246, 0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isNext ? '#eab308' : colors.textFaint,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          fontSize: '0.85rem',
                          color: isNext ? surfaces.elevated : colors.textSecondary,
                          flexShrink: 0,
                        }}>
                          {pos + 1}
                        </div>
                        <div>
                          <div style={{
                            color: isNext ? '#fde68a' : '#d1d5db',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                          }}>
                            {getUnitLabel(unitIndex)}
                            {isNext && <span style={{ marginLeft: '0.5rem', color: '#eab308', fontSize: '0.75rem' }}>← NEXT</span>}
                          </div>
                          <div style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>
                            💀 Dead • {lives} {lives === 1 ? 'life' : 'lives'} remaining
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revive Attempt Section */}
            {unitToRevive && (
              <div style={reviveAttemptStyle}>
                <p style={attemptLabelStyle}>
                  REVIVE ATTEMPT FOR:{' '}
                  <span style={{ color: '#fbbf24' }}>{getUnitLabel(firstInQueue)}</span>
                </p>
                <p style={attemptInfoStyle}>
                  Will revive at{' '}
                  <strong style={{ color: '#86efac' }}>
                    {Math.floor(unitToRevive.maxHp / 2)} HP
                  </strong>
                  {' '}(half of {unitToRevive.maxHp} max).
                  {' '}Lives remaining after success:{' '}
                  <strong style={{ color: '#fca5a5' }}>
                    {Math.max(0, getLivesDisplay(unitToRevive) - 1)}
                  </strong>
                </p>

                <div style={btnRowStyle}>
                  <button
                    onClick={() => onRevive(player.id, true)}
                    style={successBtnStyle}
                  >
                    ✓ REVIVE SUCCESS
                  </button>
                  <button
                    onClick={() => onRevive(player.id, false)}
                    style={failBtnStyle}
                  >
                    ✗ REVIVE FAILED
                  </button>
                </div>

                <p style={failNoteStyle}>
                  ⚠️ On fail, no revive occurs and the queue is unchanged.
                </p>
              </div>
            )}
          </>
        )}

        {/* Close */}
        <button onClick={onClose} style={closeBtnStyle}>
          CLOSE
        </button>
      </div>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalStyle = {
  background: surfaces.elevated,
  border: `2px solid `,
  borderRadius: '14px',
  padding: '2rem',
  maxWidth: '480px',
  width: '92%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.95), 0 0 40px rgba(212, 175, 55, 0.1)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const titleStyle = {
  margin: 0,
  color: colors.gold,
  fontSize: '1.5rem',
  fontWeight: '900',
  letterSpacing: '0.15em',
  fontFamily: fonts.display,
};

const subtitleStyle = {
  margin: '0.25rem 0 0',
  color: colors.textMuted,
  fontSize: '0.9rem',
  letterSpacing: '0.1em',
};

const emptyQueueStyle = {
  textAlign: 'center',
  padding: '2rem',
  background: 'rgba(22, 163, 74, 0.1)',
  border: '1px solid rgba(22, 163, 74, 0.3)',
  borderRadius: '10px',
  marginBottom: '1.5rem',
};

const queueLabelStyle = {
  color: colors.textMuted,
  fontSize: '0.75rem',
  fontWeight: '700',
  letterSpacing: '0.15em',
  marginBottom: '0.75rem',
};

const queueListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const queueItemStyle = {
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  transition: 'all 0.2s',
};

const reviveAttemptStyle = {
  background: 'rgba(0,0,0,0.4)',
  border: '2px solid rgba(212, 175, 55, 0.4)',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const attemptLabelStyle = {
  color: colors.textMuted,
  fontSize: '0.75rem',
  fontWeight: '700',
  letterSpacing: '0.1em',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
};

const attemptInfoStyle = {
  color: '#e8dcc4',
  fontSize: '0.9rem',
  marginBottom: '1.25rem',
  lineHeight: '1.5',
};

const btnRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const successBtnStyle = {
  padding: '1rem',
  background: 'linear-gradient(135deg, #059669, #047857)',
  border: '2px solid #10b981',
  color: '#d1fae5',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontWeight: '800',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
};

const failBtnStyle = {
  padding: '1rem',
  background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
  border: '2px solid #dc2626',
  color: '#fecaca',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontWeight: '800',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
};

const failNoteStyle = {
  color: colors.textFaint,
  fontSize: '0.75rem',
  textAlign: 'center',
  margin: 0,
};

const closeBtnStyle = {
  width: '100%',
  padding: '0.85rem',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  color: '#a78bfa',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: fonts.body,
  fontWeight: '700',
  fontSize: '0.9rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

export default SquadReviveModal;