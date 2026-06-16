import React from 'react';
import { colors, fonts } from '../theme';

const SessionChestArchiveEntry = ({ session, onDelete }) => {

  const [open, setOpen] = React.useState(false);
  const opened   = session.chests.filter(c => c.isOpened).length;
  const unopened = session.chests.filter(c => !c.isOpened).length;
  return (
    <div style={{ border: '1px solid rgba(75,85,99,0.4)', borderRadius: '10px', background: 'rgba(0,0,0,0.25)' }}>
      <div onClick={() => setOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer' }}>
        <span style={{ fontSize: '0.9rem' }}>📅</span>
        <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.85rem', flex: 1, fontFamily: '"Cinzel",Georgia,serif' }}>{session.sessionName}</span>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {opened   > 0 && <span style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700' }}>📭{opened}</span>}
          {unopened > 0 && <span style={{ color: '#fde68a', fontSize: '0.65rem', fontWeight: '700' }}>📦{unopened}</span>}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete archive "${session.sessionName}"?`)) onDelete(); }}
              style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d', borderRadius: '4px', color: '#fca5a5', fontSize: '0.6rem', fontWeight: '900', padding: '0.15rem 0.35rem', cursor: 'pointer', flexShrink: 0 }}>✕</button>
          )}
        </div>
        <span style={{ color: colors.textFaint, fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(75,85,99,0.25)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {session.chests.map(chest => (
            <div key={chest.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0.65rem',
              background: chest.isOpened ? 'rgba(75,85,99,0.08)' : 'rgba(201,169,97,0.06)',
              border: `1px solid ${chest.isOpened ? 'rgba(75,85,99,0.3)' : 'rgba(201,169,97,0.2)'}`,
              borderRadius: '6px', opacity: chest.isOpened ? 0.7 : 1,
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{chest.isOpened ? '📭' : '📦'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: chest.isOpened ? colors.textMuted : colors.gold, fontWeight: '800', fontSize: '0.85rem' }}>{chest.name}</div>
                {chest.isOpened && chest.openedBy && (
                  <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.15rem' }}>
                    Opened by {chest.openedBy}
                    {chest.droppedItems?.length > 0 && ` · ${chest.droppedItems.map(i => i.name).join(', ')}`}
                  </div>
                )}
              </div>
              <span style={{
                padding: '0.1rem 0.4rem', fontSize: '0.6rem', fontWeight: '800', borderRadius: '20px', flexShrink: 0,
                color: chest.isOpened ? colors.textMuted : '#fde68a',
                background: chest.isOpened ? 'rgba(75,85,99,0.15)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${chest.isOpened ? 'rgba(75,85,99,0.3)' : 'rgba(234,179,8,0.25)'}`,
              }}>{chest.isOpened ? 'OPENED' : 'UNOPENED'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ── SessionRoomArchiveEntry (inline) ─────────────────────────────────────────
const SessionRoomArchiveEntry = ({ session }) => {
  const [open, setOpen] = React.useState(false);
  const passed  = session.rooms.filter(r => r.status === 'Passed').length;
  const failed  = session.rooms.filter(r => r.status === 'Failed').length;
  const idle    = session.rooms.filter(r => r.status !== 'Passed' && r.status !== 'Failed').length;

  const statusStyle = (status) => {
    if (status === 'Passed') return { label: '✅ Passed',  color: colors.green,       border: colors.greenBorder,  bg: colors.greenSubtle  };
    if (status === 'Failed') return { label: '❌ Failed',  color: '#fca5a5',           border: colors.redBorder,    bg: colors.redSubtle    };
    if (status === 'Active') return { label: '⚔️ Active',  color: '#fca5a5',           border: colors.redBorder,    bg: colors.redSubtle    };
    if (status === 'Locked') return { label: '🔒 Locked',  color: colors.amber,        border: colors.amberBorder,  bg: colors.amberSubtle  };
    return                          { label: '😴 Idle',    color: colors.textMuted,    border: 'rgba(75,85,99,0.3)', bg: 'rgba(75,85,99,0.06)' };
  };

  return (
    <div style={{ border: '1px solid rgba(75,85,99,0.4)', borderRadius: '10px', background: 'rgba(0,0,0,0.25)' }}>
      <div onClick={() => setOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer' }}>
        <span style={{ fontSize: '0.9rem' }}>📅</span>
        <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.85rem', flex: 1, fontFamily: fonts.display }}>{session.sessionName}</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {passed > 0 && <span style={{ color: colors.green,    fontSize: '0.65rem', fontWeight: '700' }}>✅{passed}</span>}
          {failed > 0 && <span style={{ color: '#fca5a5',        fontSize: '0.65rem', fontWeight: '700' }}>❌{failed}</span>}
          {idle   > 0 && <span style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700' }}>🚪{idle}</span>}
        </div>
        <span style={{ color: colors.textFaint, fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(75,85,99,0.25)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {session.rooms.map(room => {
            const tag = statusStyle(room.status);
            return (
              <div key={room.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0.65rem', background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: '6px' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚪</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: room.status === 'Passed' ? colors.green : room.status === 'Failed' ? '#fca5a5' : colors.textSecondary, fontWeight: '800', fontSize: '0.85rem' }}>{room.name}</div>
                  {room.description && <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.1rem' }}>{room.description}</div>}
                </div>
                <span style={{ padding: '0.1rem 0.4rem', fontSize: '0.6rem', fontWeight: '800', borderRadius: '20px', flexShrink: 0, color: tag.color, background: tag.bg, border: `1px solid ${tag.border}` }}>{tag.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── SessionArchiveEntry (inline) ────────────────────────────────────────────
const SessionArchiveEntry = ({ session, onDelete }) => {

  const [open, setOpen] = React.useState(false);
  const defeated = session.npcs.filter(n => n.status === 'defeated').length;
  const active   = session.npcs.filter(n => n.status === 'active').length;
  const inactive = session.npcs.filter(n => n.status === 'inactive').length;
  const tagFor = (status) => {
    if (status === 'defeated') return { label: '💀 Defeated', color: colors.textMuted, border: 'rgba(75,85,99,0.3)',  bg: 'rgba(75,85,99,0.08)' };
    if (status === 'active')   return { label: '⚔️ Active',   color: '#fca5a5', border: 'rgba(239,68,68,0.25)', bg: 'rgba(239,68,68,0.07)' };
    return                            { label: '😴 Inactive', color: colors.textMuted, border: 'rgba(139,115,85,0.2)', bg: 'rgba(139,115,85,0.06)' };
  };
  return (
    <div style={{ border: '1px solid rgba(75,85,99,0.4)', borderRadius: '10px', background: 'rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer' }} onClick={() => setOpen(s => !s)}>
        <span style={{ fontSize: '0.9rem' }}>📅</span>
        <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.85rem', flex: 1, fontFamily: '"Cinzel",Georgia,serif' }}>{session.sessionName}</span>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {defeated > 0  && <span style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700' }}>💀{defeated}</span>}
          {active > 0    && <span style={{ color: '#fca5a5', fontSize: '0.65rem', fontWeight: '700' }}>⚔️{active}</span>}
          {inactive > 0  && <span style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700' }}>😴{inactive}</span>}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete archive "${session.sessionName}"?`)) onDelete(); }}
              style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d', borderRadius: '4px', color: '#fca5a5', fontSize: '0.6rem', fontWeight: '900', padding: '0.15rem 0.35rem', cursor: 'pointer', flexShrink: 0 }}>✕</button>
          )}
        </div>
        <span style={{ color: colors.textFaint, fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(75,85,99,0.25)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {session.npcs.map(npc => {
            const tag = tagFor(npc.status);
            return (
              <div key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: '6px' }}>
                <span style={{ color: npc.status === 'defeated' ? colors.textFaint : colors.textSecondary, fontWeight: '800', fontSize: '0.85rem', flex: 1 }}>{npc.name}</span>
                <span style={{ color: colors.textMuted, fontSize: '0.68rem' }}>{npc.hp}/{npc.maxHp}hp</span>
                <span style={{ color: tag.color, fontSize: '0.62rem', fontWeight: '800', padding: '0.1rem 0.4rem', background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: '20px' }}>{tag.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── SpawnModal (inline) ─────────────────────────────────────────────────────

export { SessionChestArchiveEntry, SessionRoomArchiveEntry, SessionArchiveEntry };
