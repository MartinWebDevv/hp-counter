import React from 'react';

const gold = '#c9a961';

const NAV_ITEMS = [
  { id: 'players', label: 'Players',  icon: '👥', color: '#93c5fd', activeColor: '#1e40af', activeBorder: '#3b82f6' },
  { id: 'dm',      label: 'NPCs',     icon: '👾', color: '#fca5a5', activeColor: '#7c1d1d', activeBorder: '#ef4444' },
  { id: 'loot',    label: 'Loot',     icon: '🎁', color: '#e9d5ff', activeColor: '#4c1d95', activeBorder: '#a78bfa' },
  { id: 'chests',  label: 'Chests',   icon: '📦', color: '#fde68a', activeColor: '#78350f', activeBorder: '#eab308' },
  { id: 'vp',      label: 'Victory',  icon: '🏆', color: '#93c5fd', activeColor: '#1e3a8a', activeBorder: '#3b82f6' },
  { id: 'rooms',   label: 'Rooms',    icon: '🚪', color: '#fcd34d', activeColor: '#78350f', activeBorder: '#d97706' },
  { id: 'timers',  label: 'Timers',   icon: '⏱️',  color: '#c4b5fd', activeColor: '#4c1d95', activeBorder: '#7c3aed' },
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
  const getBadge = (id) => {
    if (id === 'dm'     && activeNPCsCount     > 0) return activeNPCsCount;
    if (id === 'chests' && unopenedChestCount  > 0) return unopenedChestCount;
    if (id === 'timers' && activeTimersCount    > 0) return activeTimersCount;
    if (id === 'rooms'  && activeRoomsCount     > 0) return activeRoomsCount;
    return null;
  };

  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      width: '80px',
      minWidth: '80px',
      paddingTop: '0.25rem',
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              padding: '0.65rem 0.4rem',
              background: isActive
                ? `linear-gradient(135deg, ${item.activeColor}, ${item.activeColor}cc)`
                : 'rgba(0,0,0,0.35)',
              border: `2px solid ${isActive ? item.activeBorder : 'rgba(90,74,58,0.25)'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              boxShadow: isActive ? `0 4px 12px ${item.activeBorder}33` : 'none',
            }}
          >
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: '0.58rem',
              fontWeight: '800',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: isActive ? item.color : '#6b7280',
            }}>
              {item.label}
            </span>

            {/* Badge */}
            {badge !== null && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: item.id === 'chests' ? '#eab308' : item.id === 'timers' ? '#7c3aed' : item.id === 'rooms' ? '#d97706' : '#dc2626',
                color: item.id === 'chests' ? '#1a0f0a' : '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.6rem',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default DMSidebar;