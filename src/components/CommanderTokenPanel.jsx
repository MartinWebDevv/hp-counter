import React from 'react';
import { colors, surfaces, borders, fonts, btn, pill } from '../theme';

const CommanderTokenPanel = ({
  tokens = [], players = [],
  tokensEnabled, setTokensEnabled,
  onClaim, onDelete,
}) => {
  const [claimingTokenId, setClaimingTokenId] = React.useState(null);

  const cooldown  = tokens.filter(t => t.status === 'cooldown');
  const unclaimed = tokens.filter(t => t.status === 'unclaimed');
  const held      = tokens.filter(t => t.status === 'held');

  const handleClaim = (tokenId, player) => {
    onClaim(tokenId, player);
    setClaimingTokenId(null);
  };

  const statusStyle = (t) => {
    if (t.status === 'cooldown')  return { label: `${t.cooldownRoundsLeft}r cooldown`, color: colors.amber,  bg: colors.amberSubtle,  border: colors.amberBorder  };
    if (t.status === 'unclaimed') return { label: 'Unclaimed',                          color: colors.green,  bg: colors.greenSubtle,  border: colors.greenBorder  };
    if (t.status === 'held')      return { label: `Held by ${t.heldByPlayerName}`,      color: '#fca5a5',     bg: colors.redSubtle,    border: colors.redBorder    };
    return { label: t.status, color: colors.textSecondary, bg: 'transparent', border: borders.default };
  };

  return (
    <div>
      {/* Toggle row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.65rem 0.85rem',
        background: 'rgba(0,0,0,0.3)', border: borders.default,
        borderRadius: '8px', marginBottom: '0.85rem',
      }}>
        <div>
          <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.8rem' }}>🪙 Commander Tokens</div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>Drop tokens on commander death</div>
        </div>
        <button onClick={() => setTokensEnabled(!tokensEnabled)} style={{
          padding: '0.3rem 0.75rem', borderRadius: '20px',
          fontFamily: fonts.body, fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer',
          background: tokensEnabled ? colors.greenSubtle : 'rgba(0,0,0,0.4)',
          border: `1px solid ${tokensEnabled ? colors.green : 'rgba(255,255,255,0.06)'}`,
          color: tokensEnabled ? colors.green : colors.textFaint,
          transition: 'all 0.15s',
        }}>
          {tokensEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!tokensEnabled && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: colors.textFaint }}>
          <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🪙</div>
          <div style={{ fontSize: '0.78rem' }}>Commander Tokens are off for this session.</div>
          <div style={{ fontSize: '0.68rem', marginTop: '0.25rem' }}>Toggle ON above to enable.</div>
        </div>
      )}

      {tokensEnabled && tokens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: colors.textFaint }}>
          <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🪙</div>
          <div style={{ fontSize: '0.78rem' }}>No tokens in play.</div>
          <div style={{ fontSize: '0.68rem', marginTop: '0.25rem' }}>Tokens drop automatically when a commander dies.</div>
        </div>
      )}

      {tokensEnabled && tokens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...cooldown, ...unclaimed, ...held].map(token => {
            const badge = statusStyle(token);
            const isClaiming = claimingTokenId === token.id;

            return (
              <div key={token.id} style={{
                background: badge.bg, border: `1px solid ${badge.border}`,
                borderRadius: '10px', padding: '0.75rem 0.9rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: isClaiming ? '0.65rem' : 0 }}>
                  <div style={{
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: token.playerColor, flexShrink: 0,
                    boxShadow: `0 0 5px ${token.playerColor}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.gold, fontWeight: '900', fontSize: '0.85rem' }}>🪙 {token.commanderName}</div>
                    <div style={{ color: colors.textFaint, fontSize: '0.62rem' }}>{token.playerName}</div>
                  </div>
                  <div style={pill(badge.color, badge.bg, badge.border)}>{badge.label}</div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    {token.status === 'unclaimed' && (
                      <button onClick={() => setClaimingTokenId(isClaiming ? null : token.id)} style={{
                        padding: '0.25rem 0.55rem', borderRadius: '6px',
                        fontFamily: fonts.body, fontWeight: '800', fontSize: '0.62rem', cursor: 'pointer',
                        background: isClaiming ? colors.goldSubtle : colors.greenSubtle,
                        border: `1px solid ${isClaiming ? colors.goldBorder : colors.greenBorder}`,
                        color: isClaiming ? colors.gold : colors.green,
                      }}>{isClaiming ? '✕' : 'Claim'}</button>
                    )}
                    <button onClick={() => onDelete(token.id)} style={btn.danger()}>✕</button>
                  </div>
                </div>

                {isClaiming && (
                  <div>
                    <div style={{ color: colors.textMuted, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Claim for:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {players.filter(p => p.id !== token.playerId).map(p => (
                        <button key={p.id} onClick={() => handleClaim(token.id, p)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.45rem',
                          padding: '0.4rem 0.65rem', borderRadius: '7px',
                          fontFamily: fonts.body, fontWeight: '700', fontSize: '0.78rem',
                          cursor: 'pointer', textAlign: 'left',
                          background: 'rgba(0,0,0,0.3)',
                          border: `1px solid ${p.playerColor || colors.blue}30`,
                          color: colors.textPrimary,
                        }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.playerColor || colors.blue, flexShrink: 0 }} />
                          {p.playerName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommanderTokenPanel;