import React from 'react';
import { colors, fonts, surfaces, borders } from '../theme';

const NAV_ITEMS = [
  { id: 'players', label: 'Players', icon: '👥', color: colors.blueLight,   activeBg: 'rgba(30,64,175,0.5)',  activeBorder: colors.blue   },
  { id: 'dm',      label: 'NPCs',    icon: '👾', color: '#fca5a5',           activeBg: 'rgba(124,29,29,0.5)',  activeBorder: colors.red    },
  { id: 'loot',    label: 'Loot',    icon: '🎁', color: colors.purpleLight,  activeBg: 'rgba(76,29,149,0.5)',  activeBorder: colors.purple },
  { id: 'chests',  label: 'Chests',  icon: '📦', color: '#fde68a',           activeBg: 'rgba(120,53,15,0.5)',  activeBorder: '#eab308'     },
  { id: 'vp',      label: 'Victory', icon: '🏆', color: colors.amber,        activeBg: 'rgba(30,58,138,0.5)',  activeBorder: colors.blue   },
  { id: 'rooms',   label: 'DM Tools', icon: '🛠️', color: '#fcd34d',           activeBg: 'rgba(120,53,15,0.5)',  activeBorder: '#d97706'     },
  { id: 'timers',   label: 'Timers',   icon: '⏱️', color: colors.purpleLight,  activeBg: 'rgba(76,29,149,0.5)',  activeBorder: colors.purple },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: '#94a3b8',           activeBg: 'rgba(30,41,59,0.6)',   activeBorder: '#64748b'     },
];

/**
 * DMSidebar
 * Left-side vertical navigation for campaign mode.
 * Replaces the flat horizontal tab bar.
 *
 * Props:
 *   activePanel        — current panel id
 *   setActivePanel     — setter
 *   activeNPCsCount    — badge count for NPC tab
 *   unopenedChestCount — badge count for Chests tab
 */
const DMSidebar = ({ activePanel, setActivePanel, activeNPCsCount = 0, unopenedChestCount = 0, activeTimersCount = 0, activeRoomsCount = 0 }) => {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getBadge = (id) => {
    if (id === 'dm'     && activeNPCsCount    > 0) return activeNPCsCount;
    if (id === 'chests' && unopenedChestCount > 0) return unopenedChestCount;
    if (id === 'timers' && activeTimersCount  > 0) return activeTimersCount;
    if (id === 'rooms') return null;
    return null;
  };

  // ── Mobile: fixed bottom tab bar ─────────────────────────────────────────
  if (isMobile) {
    return (
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
        background: 'linear-gradient(180deg,rgba(8,4,14,0.98),rgba(4,2,8,1))',
        borderTop: '1px solid rgba(139,92,246,0.3)',
        display: 'flex', overflowX: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        WebkitOverflowScrolling: 'touch',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
        scrollbarWidth: 'none',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePanel === item.id;
          const badge = getBadge(item.id);
          return (
            <button key={item.id} onClick={() => setActivePanel(item.id)} style={{
              flex: '1 0 auto', minWidth: '52px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '0.5rem 0.25rem 0.45rem',
              background: isActive ? item.activeBg : 'transparent',
              border: 'none',
              borderTop: `2px solid ${isActive ? item.activeBorder : 'transparent'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '0.48rem', fontWeight: '800', color: isActive ? item.color : colors.textFaint, marginTop: '0.15rem', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.label}</span>
              {badge !== null && (
                <span style={{ position: 'absolute', top: '2px', right: '4px', background: item.id === 'chests' ? '#eab308' : item.id === 'timers' ? colors.purple : colors.red, color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // ── Desktop: vertical sidebar ─────────────────────────────────────────────
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
      width: '76px', minWidth: '76px',
      paddingTop: '0.25rem',
      position: 'sticky', top: 0, alignSelf: 'flex-start',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = activePanel === item.id;
        const badge    = getBadge(item.id);
        return (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            title={item.label}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '0.22rem', padding: '0.6rem 0.35rem',
              background: isActive ? item.activeBg : 'rgba(0,0,0,0.3)',
              border: `1px solid ${isActive ? item.activeBorder : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '10px', cursor: 'pointer',
              fontFamily: fonts.body,
              transition: 'all 0.15s',
              boxShadow: isActive ? `0 4px 12px ${item.activeBorder}30` : 'none',
            }}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: '0.56rem', fontWeight: '800',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              color: isActive ? item.color : colors.textFaint,
            }}>{item.label}</span>

            {badge !== null && (
              <span style={{
                position: 'absolute', top: '3px', right: '3px',
                background: item.id === 'chests' ? '#eab308' : item.id === 'timers' ? colors.purple : item.id === 'rooms' ? '#d97706' : colors.red,
                color: item.id === 'chests' ? '#1a0f0a' : '#fff',
                borderRadius: '50%', width: '15px', height: '15px',
                fontSize: '0.55rem', fontWeight: '900',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default DMSidebar;