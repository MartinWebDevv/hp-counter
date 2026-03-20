import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors } from '../theme';

/**
 * CommanderTokenBadge
 * Shows below the commander HP bar when a token is in play for this player.
 *
 * Props:
 *   token — the token object from useCommanderTokens (or null)
 */
const CommanderTokenBadge = ({ token }) => {
  const [hovered, setHovered] = useState(false);
  if (!token) return null;

  const config = {
    cooldown:  { color: colors.amber,          bg: colors.amberSubtle,  border: colors.amberBorder,  label: `🪙 Token — ${token.cooldownRoundsLeft}r cooldown` },
    unclaimed: { color: colors.green,          bg: colors.greenSubtle,  border: colors.greenBorder,  label: '🪙 Token — Unclaimed' },
    held:      { color: '#fca5a5',              bg: colors.redSubtle,    border: colors.redBorder,    label: `🪙 Token — Held by ${token.heldByPlayerName}` },
  }[token.status] || { color: colors.textSecondary, bg: 'transparent', border: 'rgba(255,255,255,0.06)', label: '🪙 Token' };

  const tooltip = {
    cooldown:  `Your token dropped. Other factions can claim it in ${token.cooldownRoundsLeft} round${token.cooldownRoundsLeft !== 1 ? 's' : ''}.`,
    unclaimed: 'Your token is unclaimed — any faction can pick it up.',
    held:      `${token.heldByPlayerName} is holding your token.`,
  }[token.status] || '';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', display: 'inline-flex', marginTop: '0.3rem' }}
    >
      <div style={{
        padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800',
        background: config.bg, border: `1px solid ${config.border}`, color: config.color,
        cursor: 'default', userSelect: 'none',
      }}>
        {config.label}
      </div>

      {hovered && tooltip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: surfaces.elevated, border: '1px solid rgba(201,169,97,0.4)', borderRadius: '6px',
          padding: '0.35rem 0.65rem', whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none',
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '0.7rem' }}>{tooltip}</div>
          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(201,169,97,0.4)' }} />
        </div>
      )}
    </div>
  );
};

export default CommanderTokenBadge;