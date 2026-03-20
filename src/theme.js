/**
 * theme.js
 * Central design token system for the DM Tracker app.
 * Import what you need — colors, surfaces, typography, shared button styles.
 */

// ── Color Palette ─────────────────────────────────────────────────────────────

export const colors = {
  // Gold — headings and section titles ONLY
  gold:        '#c9a961',
  goldDim:     'rgba(201,169,97,0.5)',
  goldSubtle:  'rgba(201,169,97,0.12)',
  goldBorder:  'rgba(201,169,97,0.25)',

  // Amber — HP values, damage, urgent numbers
  amber:       '#f59e0b',
  amberDim:    'rgba(245,158,11,0.5)',
  amberSubtle: 'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.3)',

  // Purple — interactive elements, player actions, "do something"
  purple:       '#8b5cf6',
  purpleDim:    'rgba(139,92,246,0.5)',
  purpleSubtle: 'rgba(139,92,246,0.12)',
  purpleBorder: 'rgba(139,92,246,0.25)',
  purpleLight:  '#c4b5fd',

  // Teal — stats, passive info, armor/defense values
  teal:        '#14b8a6',
  tealDim:     'rgba(20,184,166,0.5)',
  tealSubtle:  'rgba(20,184,166,0.1)',
  tealBorder:  'rgba(20,184,166,0.3)',
  tealLight:   '#5eead4',

  // Red — NPC indicators, danger, death
  red:         '#ef4444',
  redDim:      'rgba(239,68,68,0.5)',
  redSubtle:   'rgba(239,68,68,0.1)',
  redBorder:   'rgba(239,68,68,0.3)',
  redDeep:     '#7f1d1d',

  // Green — alive, success, healed
  green:       '#22c55e',
  greenSubtle: 'rgba(34,197,94,0.12)',
  greenBorder: 'rgba(34,197,94,0.3)',
  greenLight:  '#86efac',

  // Blue — player turn, revives
  blue:        '#3b82f6',
  blueSubtle:  'rgba(59,130,246,0.15)',
  blueBorder:  'rgba(59,130,246,0.4)',
  blueLight:   '#93c5fd',

  // Neutrals
  textPrimary:   '#e8dcc4',
  textSecondary: '#9ca3af',
  textMuted:     '#6b7280',
  textFaint:     '#4b5563',
  textDisabled:  '#374151',
};

// ── Tier Colors ───────────────────────────────────────────────────────────────

export const tierColors = {
  Common:    { text: '#9ca3af', border: 'rgba(156,163,175,0.4)', bg: 'rgba(156,163,175,0.08)', subtle: 'rgba(156,163,175,0.05)' },
  Rare:      { text: '#a78bfa', border: 'rgba(139,92,246,0.4)',  bg: 'rgba(139,92,246,0.08)',  subtle: 'rgba(139,92,246,0.05)'  },
  Legendary: { text: '#fbbf24', border: 'rgba(245,158,11,0.45)', bg: 'rgba(245,158,11,0.08)',  subtle: 'rgba(245,158,11,0.05)'  },
  Quest:     { text: '#fde68a', border: 'rgba(234,179,8,0.5)',   bg: 'rgba(234,179,8,0.1)',    subtle: 'rgba(234,179,8,0.05)'   },
};

// ── Surfaces (layered backgrounds) ───────────────────────────────────────────

export const surfaces = {
  page:     '#080604',                                                  // outermost background
  card:     'linear-gradient(145deg, #141210, #0e0c0a)',               // player/NPC cards
  cardAlt:  'linear-gradient(145deg, #111820, #0d1520)',               // NPC cards (slightly cooler)
  elevated: 'linear-gradient(145deg, #1c1610, #150e09)',               // modals, creator forms
  inset:    'rgba(0,0,0,0.35)',                                         // inset sections within cards
  insetDeep:'rgba(0,0,0,0.5)',                                          // deeper inset sections
  overlay:  'rgba(0,0,0,0.88)',                                         // modal backdrops
};

// ── Border styles ─────────────────────────────────────────────────────────────

export const borders = {
  default:    '1px solid rgba(255,255,255,0.06)',    // subtle default card border
  warm:       '1px solid rgba(201,169,97,0.18)',     // warm accent border
  section:    '1px solid rgba(255,255,255,0.05)',    // inner section dividers
  active:     (color) => `2px solid ${color}`,       // active state (pass a color)
  glow:       (color) => `0 0 20px ${color}40, 0 8px 32px rgba(0,0,0,0.7)`, // box-shadow glow
};

// ── Typography ────────────────────────────────────────────────────────────────

export const fonts = {
  display: '"Cinzel", Georgia, serif',   // headings, card titles only
  body:    '"Rajdhani", sans-serif',     // everything else
};

export const text = {
  cardTitle:    { fontFamily: fonts.display, fontSize: '1rem',    fontWeight: '800', color: colors.gold,          letterSpacing: '0.06em' },
  sectionLabel: { fontFamily: fonts.body,    fontSize: '0.68rem', fontWeight: '800', color: colors.textMuted,     letterSpacing: '0.12em', textTransform: 'uppercase' },
  statValue:    { fontFamily: fonts.body,    fontSize: '0.88rem', fontWeight: '800', color: colors.textPrimary },
  statLabel:    { fontFamily: fonts.body,    fontSize: '0.62rem', fontWeight: '700', color: colors.textFaint,     letterSpacing: '0.07em', textTransform: 'uppercase' },
  bodySmall:    { fontFamily: fonts.body,    fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary },
  hpValue:      { fontFamily: fonts.body,    fontSize: '0.85rem', fontWeight: '700', color: colors.amber },
};

// ── Button styles ─────────────────────────────────────────────────────────────

export const btn = {
  // Primary — main action per section
  primary: (disabled = false) => ({
    background: disabled
      ? 'rgba(0,0,0,0.3)'
      : 'linear-gradient(135deg, #1e40af, #1e3a8a)',
    border: `2px solid ${disabled ? colors.textDisabled : colors.blue}`,
    color: disabled ? colors.textDisabled : colors.blueLight,
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fonts.body,
    fontWeight: '800',
    fontSize: '0.82rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  }),

  // Secondary — supporting actions, outlined
  secondary: (disabled = false) => ({
    background: 'transparent',
    border: `1px solid ${disabled ? colors.textDisabled : colors.purpleBorder}`,
    color: disabled ? colors.textDisabled : colors.purpleLight,
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fonts.body,
    fontWeight: '800',
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
  }),

  // Danger — destructive actions
  danger: (disabled = false) => ({
    background: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(127,29,29,0.25)',
    border: `1px solid ${disabled ? colors.textDisabled : 'rgba(239,68,68,0.45)'}`,
    color: disabled ? colors.textDisabled : '#fca5a5',
    padding: '0.35rem 0.6rem',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fonts.body,
    fontWeight: '800',
    fontSize: '0.75rem',
    transition: 'all 0.15s',
  }),

  // HP +/- buttons (commander)
  hp: (disabled = false) => ({
    background: disabled
      ? 'rgba(0,0,0,0.2)'
      : `linear-gradient(135deg, ${colors.amberSubtle}, rgba(217,119,6,0.08))`,
    border: `2px solid ${disabled ? colors.textDisabled : colors.amberBorder}`,
    color: disabled ? colors.textDisabled : colors.amber,
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fonts.body,
    fontWeight: '800',
    fontSize: '1.1rem',
    flexShrink: 0,
    transition: 'all 0.15s',
  }),

  // HP +/- buttons (squad units, smaller)
  hpSmall: (disabled = false) => ({
    background: disabled ? 'rgba(0,0,0,0.2)' : colors.purpleSubtle,
    border: `2px solid ${disabled ? colors.textDisabled : colors.purpleBorder}`,
    color: disabled ? colors.textDisabled : colors.purpleLight,
    width: '32px', height: '32px',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '800', fontSize: '1rem', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }),

  // Icon button (edit, remove, small square)
  icon: (color = colors.textMuted) => ({
    background: 'rgba(0,0,0,0.3)',
    border: `1px solid ${color}40`,
    color,
    width: '30px', height: '30px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', flexShrink: 0,
    transition: 'all 0.15s',
  }),
};

// ── HP bar colors ─────────────────────────────────────────────────────────────

export const hpBarColor = (pct) =>
  pct > 50
    ? 'linear-gradient(to right, #16a34a, #22c55e)'
    : pct > 25
      ? 'linear-gradient(to right, #ca8a04, #eab308)'
      : 'linear-gradient(to right, #dc2626, #ef4444)';

// ── Card shell ────────────────────────────────────────────────────────────────

export const cardShell = (isCurrentTurn, playerColor, hasActedThisRound, isDead = false) => ({
  background: surfaces.card,
  borderRadius: '12px',
  padding: '0.85rem',
  fontFamily: fonts.body,
  boxShadow: isCurrentTurn
    ? borders.glow(playerColor || colors.blue)
    : '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
  border: isCurrentTurn
    ? `2px solid ${playerColor || colors.blue}`
    : hasActedThisRound
      ? `2px solid ${colors.green}80`
      : borders.default,
  opacity: isDead ? 0.55 : 1,
  transition: 'box-shadow 0.3s, border-color 0.3s',
});

// ── Inset section (commander block, squad block, etc.) ────────────────────────

export const insetSection = (variant = 'default') => {
  const variants = {
    default: { background: surfaces.inset,    border: borders.section },
    dead:    { background: surfaces.insetDeep, border: `1px solid ${colors.redDeep}` },
    purple:  { background: surfaces.inset,    border: `1px solid ${colors.purpleBorder}` },
    amber:   { background: surfaces.inset,    border: `1px solid ${colors.amberBorder}` },
    gold:    { background: surfaces.inset,    border: borders.warm },
  };
  return {
    ...(variants[variant] || variants.default),
    borderRadius: '10px',
    padding: '0.75rem',
    transition: 'all 0.3s',
  };
};

// ── Status pill / badge ───────────────────────────────────────────────────────

export const pill = (color, bg, border) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.15rem 0.5rem',
  background: bg || `${color}18`,
  border: `1px solid ${border || color + '45'}`,
  borderRadius: '20px',
  color,
  fontSize: '0.65rem',
  fontWeight: '800',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
});

// ── Input styles ──────────────────────────────────────────────────────────────

export const inputStyle = {
  background: 'rgba(0,0,0,0.35)',
  border: `1px solid ${colors.amberBorder}`,
  borderRadius: '7px',
  padding: '0.45rem 0.7rem',
  color: colors.amber,
  fontSize: '0.95rem',
  fontWeight: '700',
  fontFamily: fonts.body,
  letterSpacing: '0.04em',
  outline: 'none',
};

export const selectStyle = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${colors.purpleBorder}`,
  borderRadius: '8px',
  padding: '0.5rem 0.65rem',
  color: colors.textPrimary,
  fontFamily: fonts.body,
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
};

// ── Modal shell ───────────────────────────────────────────────────────────────

export const modalShell = (accentColor = colors.gold) => ({
  background: surfaces.elevated,
  border: `2px solid ${accentColor}`,
  borderRadius: '14px',
  padding: '1.5rem',
  boxShadow: `0 24px 64px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.03)`,
  maxHeight: '90vh',
  overflowY: 'auto',
});

export const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: surfaces.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};