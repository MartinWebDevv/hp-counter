import React from 'react';
import { colors, surfaces, fonts, btn, text } from '../../theme';
import { writePendingRequest } from '../../services/gameStateService';
import { COMMANDER_STATS } from '../../data/commanderStats';
import { FACTION_STATS } from '../../data/factionStats';

const EndTurnButton = ({ lobbyCode, player, pColor }) => {
  const [sending, setSending] = React.useState(false);
  const [sent,    setSent]    = React.useState(false);

  const handleEndTurn = async () => {
    if (!lobbyCode || !player || sending || sent) return;
    setSending(true);
    try {
      const reqId = `endturn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:       'endTurn',
        reqId,
        playerId:   player.id,
        playerName: player.playerName,
        timestamp:  Date.now(),
      });
      setSent(true);
      // Reset after a few seconds so they can re-request if DM denies
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleEndTurn}
      disabled={sending || sent}
      style={{
        padding: '0.3rem 0.7rem',
        background: sent
          ? 'rgba(34,197,94,0.1)'
          : `${pColor}18`,
        border: `1px solid ${sent ? 'rgba(34,197,94,0.4)' : pColor + '50'}`,
        borderRadius: '8px',
        color: sent ? '#86efac' : pColor,
        cursor: sending || sent ? 'not-allowed' : 'pointer',
        fontFamily: fonts.body,
        fontWeight: '800',
        fontSize: '0.65rem',
        letterSpacing: '0.05em',
        flexShrink: 0,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {sent ? '⏳ Waiting...' : '⏭️ End Turn'}
    </button>
  );
};

// ── Player Stats Panel ────────────────────────────────────────────────────────
const PlayerStatsPanel = ({ player }) => {
  const isUncivilized = player.faction === 'Uncivilized';
  const [subtypeView, setSubtypeView] = React.useState('caveman');

  const cmdStats = COMMANDER_STATS[player.faction] || COMMANDER_STATS[player.commander] || {};
  const rawFacStats = FACTION_STATS[player.faction] || {};
  // For Uncivilized pick the right subtype stats; for others use directly
  const facStats = isUncivilized
    ? (rawFacStats[subtypeView] || {})
    : rawFacStats;

  const statRow = (label, cmdVal, facVal) => (
    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{label}</span>
      <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{cmdVal ?? '—'}</span>
      <span style={{ color: colors.purpleLight, fontWeight: '800', fontSize: '0.72rem', textAlign: 'center' }}>{facVal ?? '—'}</span>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginTop: '0.75rem' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          📊 Stats Reference
        </div>
        {/* Uncivilized subtype toggle */}
        {isUncivilized && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setSubtypeView('caveman')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'caveman' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'caveman' ? 'rgba(251,191,36,0.1)' : 'transparent', color: subtypeView === 'caveman' ? '#fbbf24' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🪨 Caveman</button>
            <button
              onClick={() => setSubtypeView('dinosaur')}
              style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: `1px solid ${subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}`, background: subtypeView === 'dinosaur' ? 'rgba(52,211,153,0.1)' : 'transparent', color: subtypeView === 'dinosaur' ? '#6ee7b7' : colors.textFaint, fontFamily: fonts.body, fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }}
            >🦕 Dinosaur</button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', padding: '0.4rem 0.85rem 0.3rem', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stat</span>
        <span style={{ color: colors.gold, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          👑 {player.commanderStats?.customName || player.commander || 'Commander'}
        </span>
        <span style={{ color: colors.purpleLight, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          {isUncivilized ? (subtypeView === 'dinosaur' ? '🦕 Dinosaur' : '🪨 Caveman') : `🛡️ ${player.faction || 'Faction'}`}
        </span>
      </div>

      {/* Stat rows */}
      <div style={{ padding: '0.25rem 0.85rem 0.75rem' }}>
        {statRow('Walk',         cmdStats.walk,          facStats.walk)}
        {statRow('Run',          cmdStats.run,           facStats.run)}
        {statRow('Shoot Range',  cmdStats.shootRange,    facStats.shootRange)}
        {statRow('Sp. Range',    cmdStats.specialRange ? `${cmdStats.specialRange}"` : null, facStats.specialRange ? `${facStats.specialRange}"` : null)}
        {statRow('Attacks/Hit',  cmdStats.attacksPerHit, facStats.attacksPerHit)}
        {statRow('Roll to Heal', cmdStats.rollToHeal ? `${cmdStats.rollToHeal}+` : null, facStats.rollToHeal ? `${facStats.rollToHeal}+` : null)}
      </div>
    </div>
  );
};

// ── Read-only NPC Card ────────────────────────────────────────────────────────

export { EndTurnButton, PlayerStatsPanel };