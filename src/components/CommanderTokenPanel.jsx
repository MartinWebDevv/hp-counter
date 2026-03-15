import React from 'react';

const gold = '#c9a961';

/**
 * CommanderTokenPanel
 * Shows in the DM sidebar under a dedicated section.
 * Displays cooldown tokens, unclaimed tokens, and held tokens.
 * DM can claim unclaimed tokens for any faction, or manually delete tokens.
 *
 * Props:
 *   tokens           — all tokens
 *   players          — all players (for claim picker)
 *   tokensEnabled    — bool
 *   setTokensEnabled — setter
 *   onClaim(tokenId, claimingPlayer)
 *   onDelete(tokenId)
 */
const CommanderTokenPanel = ({
  tokens = [],
  players = [],
  tokensEnabled,
  setTokensEnabled,
  onClaim,
  onDelete,
}) => {
  const [claimingTokenId, setClaimingTokenId] = React.useState(null);

  const cooldown   = tokens.filter(t => t.status === 'cooldown');
  const unclaimed  = tokens.filter(t => t.status === 'unclaimed');
  const held       = tokens.filter(t => t.status === 'held');

  const handleClaim = (tokenId, player) => {
    onClaim(tokenId, player);
    setClaimingTokenId(null);
  };

  const statusBadge = (t) => {
    if (t.status === 'cooldown')  return { label: `${t.cooldownRoundsLeft}r cooldown`, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' };
    if (t.status === 'unclaimed') return { label: 'Unclaimed',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.35)' };
    if (t.status === 'held')      return { label: `Held by ${t.heldByPlayerName}`, color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' };
    return { label: t.status, color: '#9ca3af', bg: 'transparent', border: 'rgba(90,74,58,0.3)' };
  };

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(90,74,58,0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
        <div>
          <div style={{ color: gold, fontWeight: '800', fontSize: '0.82rem' }}>🪙 Commander Tokens</div>
          <div style={{ color: '#6b7280', fontSize: '0.65rem', marginTop: '0.15rem' }}>Drop tokens on commander death</div>
        </div>
        <button onClick={() => setTokensEnabled(!tokensEnabled)} style={{
          padding: '0.35rem 0.85rem', borderRadius: '20px', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer',
          background: tokensEnabled ? 'rgba(74,222,128,0.15)' : 'rgba(0,0,0,0.4)',
          border: `2px solid ${tokensEnabled ? '#4ade80' : 'rgba(90,74,58,0.4)'}`,
          color: tokensEnabled ? '#4ade80' : '#6b7280',
        }}>
          {tokensEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!tokensEnabled && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4b5563' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>🪙</div>
          <div style={{ fontSize: '0.8rem' }}>Commander Tokens are off for this session.</div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>Toggle ON above to enable.</div>
        </div>
      )}

      {tokensEnabled && tokens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4b5563' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>🪙</div>
          <div style={{ fontSize: '0.8rem' }}>No tokens in play.</div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>Tokens drop automatically when a commander dies.</div>
        </div>
      )}

      {tokensEnabled && tokens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...cooldown, ...unclaimed, ...held].map(token => {
            const badge    = statusBadge(token);
            const isClaiming = claimingTokenId === token.id;

            return (
              <div key={token.id} style={{ background: badge.bg, border: `2px solid ${badge.border}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                {/* Token header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: isClaiming ? '0.75rem' : '0' }}>
                  {/* Color dot */}
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: token.playerColor, flexShrink: 0, boxShadow: `0 0 6px ${token.playerColor}` }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: gold, fontWeight: '900', fontSize: '0.88rem' }}>🪙 {token.commanderName}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.65rem' }}>{token.playerName}</div>
                  </div>

                  {/* Status badge */}
                  <div style={{ padding: '0.2rem 0.55rem', background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '20px', color: badge.color, fontSize: '0.62rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    {token.status === 'unclaimed' && (
                      <button onClick={() => setClaimingTokenId(isClaiming ? null : token.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.65rem', cursor: 'pointer', background: isClaiming ? 'rgba(201,169,97,0.15)' : 'rgba(74,222,128,0.12)', border: `1px solid ${isClaiming ? gold : 'rgba(74,222,128,0.4)'}`, color: isClaiming ? gold : '#4ade80' }}>
                        {isClaiming ? '✕' : 'Claim'}
                      </button>
                    )}
                    <button onClick={() => onDelete(token.id)} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.65rem', cursor: 'pointer', background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(127,29,29,0.4)', color: '#fca5a5' }}>✕</button>
                  </div>
                </div>

                {/* Claim picker */}
                {isClaiming && (
                  <div>
                    <div style={{ color: '#8b7355', fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Claim for:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {players
                        .filter(p => p.id !== token.playerId)
                        .map(p => (
                          <button key={p.id} onClick={() => handleClaim(token.id, p)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.45rem 0.7rem', borderRadius: '7px', fontFamily: 'inherit', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                            background: 'rgba(0,0,0,0.35)', border: `1px solid ${p.playerColor || '#3b82f6'}40`,
                            color: '#e8dcc4',
                          }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.playerColor || '#3b82f6', flexShrink: 0 }} />
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