import React from 'react';
import RoomCard    from './RoomCard';
import RoomCreator from './RoomCreator';

const gold = '#c9a961';

/**
 * RoomsPanel
 * Renders room cards in a 2-column grid (same as DMPanel/NPCCard layout).
 * DM uses ADD ROOM button to open RoomCreator modal.
 */
const RoomsPanel = ({
  rooms,
  visibleRooms,
  players = [],
  lootPool = [],
  showRoomCreator,
  editingRoomId,
  blankRoom,
  openCreator,
  closeCreator,
  saveRoom,
  onDeleteRoom,
  onArchiveRoom,
  onPassRoom,
  onFailRoom,
  onSetStatus,
  onUpdateRoom,
  onGiveLoot,
}) => {
  const editingRoom = editingRoomId ? rooms.find(r => r.id === editingRoomId) : null;

  return (
    <div style={{ width: '100%' }}>

      {/* Add Room button — matches Add NPC style */}
      <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        <button onClick={() => openCreator(null)} style={{
          padding: '1rem 2.5rem',
          background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
          border: '2px solid #3b82f6',
          color: '#dbeafe',
          borderRadius: '10px', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: '800', fontSize: '1rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
        }}>
          🚪 ADD ROOM
        </button>
      </div>

      {/* Empty state */}
      {visibleRooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#4b5563' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚪</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>No rooms yet</div>
          <div style={{ fontSize: '0.85rem' }}>Click ADD ROOM to create trap rooms and encounter locations.</div>
        </div>
      )}

      {/* Room grid — same 2-column layout as NPC cards */}
      {visibleRooms.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: visibleRooms.length === 1 ? '1fr' : '48% 48%',
          gap: '1%',
          padding: '0 0.5%',
          maxWidth: visibleRooms.length === 1 ? '50%' : '100%',
          margin: visibleRooms.length === 1 ? '0 auto' : '0',
        }}>
          {visibleRooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              players={players}
              onEdit={() => openCreator(room.id)}
              onDelete={() => onDeleteRoom(room.id)}
              onArchive={() => onArchiveRoom(room.id)}
              onSetStatus={status => onSetStatus(room.id, status)}
              onPass={() => onPassRoom(room.id)}
              onFail={() => onFailRoom(room.id)}
              onUpdate={changes => onUpdateRoom(room.id, changes)}
              lootPool={lootPool}
              onGiveLoot={onGiveLoot}
            />
          ))}
        </div>
      )}

      {/* Room Creator Modal */}
      {showRoomCreator && (
        <RoomCreator
          initialRoom={editingRoom || blankRoom()}
          onSave={saveRoom}
          onClose={closeCreator}
          players={players}
          lootPool={lootPool}
        />
      )}
    </div>
  );
};

export default RoomsPanel;