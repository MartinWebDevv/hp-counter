import React from 'react';
import { colors, surfaces, fonts, btn, hpBarColor } from '../../theme';

const ReadOnlyNPCCard = ({ npc, onShowMoveset }) => {
  const pct    = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
  const active = npc.active && !npc.isDead;
  const dead   = npc.isDead;
  const dotColor    = dead ? '#4b5563' : active ? '#ef4444' : '#6b7280';
  const borderColor = dead ? 'rgba(75,85,99,0.2)' : active ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.2)';
  const hasMoveset  = active && ((npc.attacks || []).length > 0);
  return (
    <div
      onClick={() => hasMoveset && onShowMoveset?.(npc)}
      style={{
        background: 'linear-gradient(145deg,#160e0e,#0e0808)',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px', padding: '1rem',
        opacity: dead ? 0.4 : active ? 1 : 0.65,
        cursor: hasMoveset ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: active ? '0.75rem' : 0 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, boxShadow: active ? `0 0 6px ${dotColor}` : 'none', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: dead ? '#6b7280' : active ? '#fecaca' : colors.textMuted, fontWeight: '800', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{npc.name || 'Unknown'}</div>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.1rem' }}>
            {dead ? '💀 Defeated' : active ? '⚔️ In Battle' : '⏳ Staging'}
          </div>
        </div>
        {active && <div style={{ color: colors.amber, fontWeight: '700', fontSize: '0.82rem', flexShrink: 0 }}>{npc.hp} / {npc.maxHp}</div>}
        {hasMoveset && <div style={{ color: colors.textFaint, fontSize: '0.65rem', flexShrink: 0 }}>Moves ▸</div>}
      </div>
      {active && (
        <>
          <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: hpBarColor(pct), borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.4rem', marginTop: '0.6rem' }}>
            {[
              { label: 'Attack', value: npc.attackBonus != null ? `+${npc.attackBonus}` : '—', color: '#fca5a5', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
              { label: 'Armor',  value: npc.armor != null ? `${npc.armor}+` : '—',             color: '#93c5fd', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
              { label: 'Walk',   value: npc.walk  || '—',                                       color: '#fbbf24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)' },
              { label: 'Run',    value: npc.run   || '—',                                       color: '#fde68a', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '6px', padding: '0.3rem', textAlign: 'center' }}>
                <div style={{ color: color, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{label}</div>
                <div style={{ color: color, fontWeight: '800', fontSize: '0.78rem', marginTop: '0.1rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── NPC Moveset Modal ─────────────────────────────────────────────────────────
const NPCMovesetModal = ({ npc, onClose }) => {
  // Determine which attacks to show based on currentPhase
  // currentPhase 0 = Phase 1 (npc.attacks), 1+ = npc.phases[currentPhase-1].attacks
  const phase = npc.currentPhase || 0;
  let attacks = npc.attacks || [];
  let phaseLabel = null;
  if (npc.hasPhases && npc.phases?.length > 0 && phase > 0) {
    const phaseData = npc.phases[phase - 1];
    if (phaseData) {
      attacks = phaseData.attacks || [];
      phaseLabel = phaseData.label ? `Phase ${phaseData.phaseNumber}: ${phaseData.label}` : `Phase ${phaseData.phaseNumber}`;
    }
  } else if (npc.hasPhases && npc.phases?.length > 0) {
    phaseLabel = 'Phase 1';
  }

  const typeIcon = (type) => {
    if (type === 'buff')  return '✨';
    if (type === 'spawn') return '🐾';
    return '⚔️';
  };
  const typeColor = (type) => {
    if (type === 'buff')  return '#a78bfa';
    if (type === 'spawn') return '#fbbf24';
    return '#fecaca';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem', boxSizing: 'border-box' }}>
      <div className="pv-modal-inner" onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(239,68,68,0.4)', borderRadius: '14px', padding: '1.5rem', width: 'calc(100% - 2rem)', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: '#fecaca', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            {npc.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {phaseLabel && (
              <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px', padding: '0.2rem 0.65rem', color: '#fca5a5', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.06em' }}>
                🔥 {phaseLabel}
              </span>
            )}
            <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>
              {npc.hp}/{npc.maxHp} HP · 🛡️{npc.armor}+ · Atk +{npc.attackBonus}
            </span>
          </div>
        </div>

        {/* Moves */}
        <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
          Moveset ({attacks.length})
        </div>
        {attacks.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No moves defined</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.1rem' }}>
          {attacks.map((atk, i) => {
            const EFFECT_META = {
              poison:        { icon: '🤢', label: 'Poison',      color: '#4ade80',  bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.4)'  },
              burn:          { icon: '🔥', label: 'Burn',        color: '#fb923c',  bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.4)'  },
              stun:          { icon: '💫', label: 'Stun',        color: '#fbbf24',  bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.4)'  },
              attackDebuff:  { icon: '⚔️↓', label: 'Atk Debuff', color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)'   },
              defenseDebuff: { icon: '🛡️↓', label: 'Def Debuff', color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)'   },
            };
            const ef   = atk.attackEffect;
            const meta = ef ? EFFECT_META[ef.type] : null;
            const isStun  = ef?.type === 'stun';
            const valLine = meta && !isStun && ef.value ? `-${ef.value}hp/rd` : null;
            const durLine = meta ? (ef.permanent ? 'permanent' : ef.duration ? `${ef.duration}rds` : null) : null;

            return (
            <div key={atk.id || i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(239,68,68,0.12)`, borderLeft: `3px solid ${typeColor(atk.attackType)}`, borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              {/* Row 1: icon + name + dice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{typeIcon(atk.attackType)}</span>
                <span style={{ flex: 1, color: typeColor(atk.attackType), fontWeight: '800', fontSize: '0.85rem' }}>{atk.name}</span>
                {atk.numRolls > 0 && (
                  <span style={{ color: colors.amber, fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.numRolls}{atk.dieType}
                  </span>
                )}
                {atk.attackType === 'spawn' && atk.spawnNumRolls > 0 && (
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.75rem', flexShrink: 0 }}>
                    {atk.spawnNumRolls}{atk.spawnDieType}
                  </span>
                )}
                {atk.buffEffect && (
                  <span style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.72rem', flexShrink: 0 }}>
                    +{atk.buffEffect.value} {atk.buffEffect.stat}
                  </span>
                )}
              </div>
              {/* Row 2: effect + gate pills */}
              {meta && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingLeft: '1.35rem', marginBottom: '0.25rem' }}>
                  <span style={{ padding: '0.15rem 0.55rem', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: '20px', color: meta.color, fontSize: '0.63rem', fontWeight: '800' }}>
                    {meta.icon} {meta.label}{valLine ? ` ${valLine}` : ''}{durLine ? ` · ${durLine}` : ''}
                  </span>
                  {ef.damageGate > 0 && (
                    <span style={{ padding: '0.15rem 0.55rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: '20px', color: '#fb923c', fontSize: '0.63rem', fontWeight: '800' }}>
                      triggers at {ef.damageGate}+ dmg
                    </span>
                  )}
                </div>
              )}
              {atk.range && (
                <div style={{ color: colors.textMuted, fontSize: '0.65rem', paddingLeft: '1.35rem', marginBottom: atk.description ? '0.15rem' : 0 }}>
                  📍 {atk.range}
                </div>
              )}
              {atk.description && (
                <div style={{ color: colors.textFaint, fontSize: '0.63rem', paddingLeft: '1.35rem', fontStyle: 'italic' }}>
                  {atk.description}
                </div>
              )}
              {atk.attackType === 'spawn' && atk.spawnPresets?.length > 0 && (
                <div style={{ color: '#fbbf24', fontSize: '0.62rem', paddingLeft: '1.35rem', marginTop: '0.15rem' }}>
                  Spawns from: {atk.spawnPresets.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontSize: '0.82rem' }}>
          Close
        </button>
      </div>
    </div>
  );
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const EmptyState = ({ icon, text: msg }) => (
  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: colors.textFaint }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
    <div style={{ fontSize: '0.85rem' }}>{msg}</div>
  </div>
);

const navBtn = (disabled) => ({
  width: '40px', height: '40px', borderRadius: '8px',
  background: disabled ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)',
  border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'}`,
  color: disabled ? colors.textFaint : colors.textPrimary,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: fonts.body, fontWeight: '900', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});

const centeredPage = {
  minHeight: '100svh',
  background: 'linear-gradient(145deg,#0a0505,#100808)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

// Inject turnPulse animation once
if (typeof document !== 'undefined' && !document.getElementById('turnPulseStyle')) {
  const style = document.createElement('style');
  style.id = 'turnPulseStyle';
  style.textContent = `
    @keyframes turnPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.85); }
    }
    @keyframes turnFlashAnim {
      0%   { background: rgba(201,169,97,0.35); }
      40%  { background: rgba(201,169,97,0.15); }
      100% { background: rgba(201,169,97,0); }
    }
  `;
  document.head.appendChild(style);
}

if (typeof document !== 'undefined' && !document.getElementById('pvMobileStyle')) {
  const style = document.createElement('style');
  style.id = 'pvMobileStyle';
  style.textContent = `
    /* ── Global: prevent horizontal scroll on all narrow screens ── */
    html, body {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }

    /* ── Player View narrow screens ─────────────────────────────── */
    @media screen and (max-width: 480px) {

      /* Outer container: never scroll sideways */
      .pv-root {
        overflow-x: hidden !important;
        width: 100vw !important;
        max-width: 100vw !important;
      }

      /* Tab bar: equal width tabs, no overflow */
      .pv-tabs button {
        padding: 0.65rem 0.25rem !important;
        font-size: 0.65rem !important;
        min-width: 0 !important;
      }

      /* Content area: never wider than viewport */
      .pv-content {
        width: 100vw !important;
        max-width: 100vw !important;
        padding-left: 0.75rem !important;
        padding-right: 0.75rem !important;
        overflow-x: hidden !important;
      }

      /* Turn indicator: tighter */
      .pv-turn-bar {
        padding: 0.4rem 0.75rem !important;
        min-height: 32px !important;
      }

      /* Content area: full width, comfortable padding */
      .pv-content {
        padding: 0.75rem !important;
        padding-bottom: 4rem !important;
      }

      /* Commander attack buttons: slightly smaller text */
      .pv-cmd-attacks button {
        padding: 0.55rem 0.25rem !important;
        font-size: 0.72rem !important;
        letter-spacing: 0 !important;
      }

      /* Squad unit attack buttons: full width row */
      .pv-unit-attacks {
        display: flex !important;
        gap: 0.4rem !important;
      }
      .pv-unit-attacks button {
        flex: 1 !important;
        padding: 0.45rem 0 !important;
        font-size: 0.72rem !important;
      }

      /* Inventory section: readable item names */
      .pv-inventory-item {
        padding: 0.6rem 0.75rem !important;
      }
      .pv-inventory-item .item-name {
        font-size: 0.82rem !important;
      }
      .pv-inventory-item .item-desc {
        font-size: 0.62rem !important;
      }

      /* Stats panel: tighter rows */
      .pv-stats-row {
        padding: 0.25rem 0 !important;
        font-size: 0.68rem !important;
      }

      /* NPC cards: comfortable */
      .pv-npc-card {
        padding: 0.85rem !important;
      }

      /* NPC filter pills: wrap nicely */
      .pv-npc-filters {
        gap: 0.3rem !important;
        flex-wrap: wrap !important;
      }
      .pv-npc-filters button {
        padding: 0.28rem 0.6rem !important;
        font-size: 0.65rem !important;
      }

      /* Modals: full width minus safe margin */
      .pv-modal-inner {
        width: calc(100vw - 2rem) !important;
        max-width: none !important;
        padding: 1.25rem !important;
        border-radius: 12px !important;
      }

      /* Player carousel nav */
      .pv-carousel-nav {
        gap: 0.35rem !important;
      }

      /* Victory tab: readable */
      .pv-victory-row {
        font-size: 0.78rem !important;
        padding: 0.5rem !important;
      }
    }

    /* ── Shared: always prevent horizontal scroll ────────────────── */
    .pv-root {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }

    /* Carousel nav: always constrained */
    .pv-carousel-nav {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* ── Mobile: hide arrows under 600px, use swipe instead ────── */
    @media screen and (max-width: 600px) {
      .pv-carousel-arrow {
        display: none !important;
      }
      .pv-carousel-nav {
        justify-content: center !important;
      }
      .pv-carousel-nav > div {
        flex: unset !important;
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export { ReadOnlyNPCCard, NPCMovesetModal, EmptyState, navBtn, centeredPage };
