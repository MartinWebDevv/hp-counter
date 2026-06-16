import { colors, fonts, surfaces } from '../theme';

const settingsBtn = (bg, border, color) => ({
  width: '100%', padding: '0.85rem 1rem', textAlign: 'left',
  background: bg, border: `1px solid ${border}`, borderRadius: '8px',
  color, fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem',
  cursor: 'pointer', transition: 'all 0.15s',
});

const styles = {
  container: {
    minHeight: '100vh', height: '100vh',
    background: 'radial-gradient(ellipse at top, #12071a 0%, #08040e 50%, #000000 100%)',
    color: colors.textPrimary, fontFamily: fonts.body,
    padding: '0.75rem', overflow: 'auto',
  },
  header: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    gap: '0.65rem', marginBottom: '0.75rem', padding: '0.65rem 1.25rem',
    background: 'rgba(139,92,246,0.07)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  titleSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' },
  title: {
    fontSize: '1.85rem', margin: 0, fontWeight: '900', letterSpacing: '0.12em',
    fontFamily: fonts.display,
    color: colors.gold,
    background: `linear-gradient(135deg, ${colors.gold}, #d97706)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: { fontSize: '0.68rem', color: colors.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase' },
  headerControls: { display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  currentPlayerDisplay: {
    display: 'flex', flexDirection: 'column', padding: '0.45rem 0.85rem',
    background: colors.purpleSubtle, border: `1px solid ${colors.purpleBorder}`, borderRadius: '8px',
  },
  currentPlayerLabel: { fontSize: '0.6rem', color: colors.purpleLight, letterSpacing: '0.1em', fontWeight: '800' },
  currentPlayerName: { fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.04em' },
  modeDisplay: {
    display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem',
    background: colors.amberSubtle, border: `1px solid ${colors.amberBorder}`,
    borderRadius: '8px', transition: 'all 0.2s', userSelect: 'none',
  },
  modeIcon: { fontSize: '1.1rem' },
  modeText: { fontSize: '0.78rem', color: colors.amber, fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' },
  roundDisplay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.45rem 0.85rem',
    background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px',
  },
  roundLabel: { fontSize: '0.6rem', color: '#5eead4', letterSpacing: '0.1em', fontWeight: '800' },
  roundNumber: { fontSize: '1.2rem', color: '#14b8a6', fontWeight: '900', lineHeight: '1' },
  endTurnBtn: { padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg, #059669, #047857)', border: '1px solid #10b981', color: '#d1fae5', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' },
  viewModeBtn: { padding: '0.7rem 1.4rem', background: 'rgba(30,64,175,0.4)', border: `1px solid ${colors.blue}`, color: '#dbeafe', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' },
  statsBtn: { padding: '0.7rem 1.4rem', background: colors.amberSubtle, border: `1px solid ${colors.amberBorder}`, color: colors.amber, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' },
  undoBtn: { padding: '0.7rem 1.4rem', background: 'rgba(202,138,4,0.2)', border: '1px solid #eab308', color: '#fef3c7', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' },
  resetBtn: { padding: '0.7rem 1.4rem', background: colors.redSubtle, border: `1px solid ${colors.red}`, color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' },
  resetCombatBtn: { padding: '0.45rem 0.85rem', background: colors.redSubtle, border: `1px solid ${colors.redBorder}`, borderRadius: '8px', color: '#fca5a5', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', fontFamily: fonts.body, letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  saveBtn: { padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg, #0891b2, #0e7490)', border: '1px solid #06b6d4', color: '#cffafe', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', transition: 'all 0.2s' },
  loadBtn: { padding: '0.7rem 1.4rem', background: colors.purpleSubtle, border: `1px solid ${colors.purple}`, color: '#f3e8ff', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', transition: 'all 0.2s' },
  addPlayerSection: { marginBottom: '0.75rem', textAlign: 'center' },
  addPlayerBtn: { padding: '0.85rem 2rem', background: 'rgba(30,64,175,0.4)', border: `1px solid ${colors.blue}`, color: '#dbeafe', borderRadius: '10px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s' },
  sidebar: { width: '260px', minWidth: '260px', background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '1.1rem', height: 'fit-content', position: 'sticky', top: '1rem' },
  sidebarTitle: { color: colors.amber, fontSize: '0.85rem', marginTop: 0, marginBottom: '0.85rem', fontFamily: fonts.display, fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' },
  sidebarPlayer: { padding: '0.65rem', marginBottom: '0.4rem', borderRadius: '8px', cursor: 'grab', transition: 'all 0.15s' },
  sidebarPlayerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' },
  sidebarPlayerName: { fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.04em' },
  sidebarPlayerInfo: { fontSize: '0.72rem', color: colors.textMuted },
};

// ── TokenNotificationToast ───────────────────────────────────────────────────────

const TokenNotificationToast = ({ notifications }) => {
  if (notifications.length === 0) return null;
  const n = notifications[0];
  return (
    <div style={{ position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ background: 'linear-gradient(135deg,#1a0f0a,#0f0805)', border: '2px solid rgba(201,169,97,0.5)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
          <div>
            <div style={{ color: '#c9a961', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>COMMANDER TOKEN</div>
            <div style={{ color: '#e8dcc4', fontWeight: '700', fontSize: '0.82rem' }}>{n.message}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── TimerExpiredToast ─────────────────────────────────────────────────────────

const TimerExpiredToast = ({ notifications }) => {
  if (notifications.length === 0) return null;
  const n = notifications[0];
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
      <div style={{ background: 'linear-gradient(135deg,#1a0f0a,#0f0805)', border: '2px solid rgba(99,102,241,0.6)', borderRadius: '10px', padding: '0.75rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '220px', animation: 'fadeInUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⏱</span>
          <div>
            <div style={{ color: '#a5b4fc', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em' }}>TIMER ENDED</div>
            <div style={{ color: '#c9a961', fontWeight: '800', fontSize: '0.9rem' }}>{n.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};


export { settingsBtn, styles, TokenNotificationToast, TimerExpiredToast };
