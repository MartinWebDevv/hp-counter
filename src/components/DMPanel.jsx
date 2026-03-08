import React from 'react';
import NPCCard from './NPCCard';
import NPCCreator from './NPCCreator';

const gold = '#c9a961';

/**
 * DMPanel
 * Renders NPC cards in the same grid layout as player cards.
 * Each NPC gets its own full standalone card — no sidebar, no collapsed panels.
 */
const DMPanel = ({
  npcs,
  activeNPCs,
  inactiveNPCs,
  deadNPCs,
  showNPCCreator,
  editingNPCId,
  blankNPC,
  blankAttack,
  blankPhase,
  openCreator,
  closeCreator,
  saveNPC,
  removeNPC,
  activateNPC,
  deactivateNPC,
  onHPChange,
  onTriggerPhase,
  onOpenNPCAttack,
  getNPCById,
  currentTurnId,
  npcsWhoActedThisRound,
  players = [],
  onDropLoot,
  lootPool = [],
}) => {
  const editingNPC = editingNPCId ? getNPCById(editingNPCId) : null;

  // Ordered display: active first, then standby, then defeated
  const orderedNPCs = [...activeNPCs, ...inactiveNPCs, ...deadNPCs];

  return (
    <div style={{ width: '100%' }}>

      {/* Add NPC button — matches Add Player style */}
      <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        <button
          onClick={() => openCreator(null)}
          style={{
            padding: '1rem 2.5rem',
            background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
            border: '2px solid #ef4444',
            color: '#fecaca',
            borderRadius: '10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: '800',
            fontSize: '1rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
            transition: 'all 0.2s',
          }}
        >
          👾 ADD NPC
        </button>
      </div>

      {/* Empty state */}
      {npcs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: '#4b5563',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👾</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>
            No NPCs yet
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Click ADD NPC to create enemies, bosses, or creatures for your campaign.
          </div>
        </div>
      )}

      {/* NPC grid — same 2-column layout as player cards */}
      {npcs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: orderedNPCs.length === 1 ? '1fr' : '48% 48%',
          gap: '1%',
          padding: '0 0.5%',
          maxWidth: orderedNPCs.length === 1 ? '50%' : '100%',
          margin: orderedNPCs.length === 1 ? '0 auto' : '0',
        }}>
          {orderedNPCs.map(npc => (
            <NPCCard
              key={npc.id}
              npc={npc}
              isCurrentTurn={npc.id === currentTurnId}
              hasActedThisRound={npcsWhoActedThisRound?.includes(npc.id)}
              onActivate={activateNPC}
              onDeactivate={deactivateNPC}
              onEdit={openCreator}
              onRemove={removeNPC}
              onHPChange={onHPChange}
              onTriggerPhase={onTriggerPhase}
              onOpenNPCAttack={onOpenNPCAttack}
              players={players}
              onDropLoot={onDropLoot}
            />
          ))}
        </div>
      )}

      {/* NPC Creator Modal */}
      {showNPCCreator && (
        <NPCCreator
          initialNPC={editingNPC || blankNPC()}
          onSave={saveNPC}
          onClose={closeCreator}
          blankAttack={blankAttack}
          blankPhase={blankPhase}
          lootPool={lootPool}
        />
      )}
    </div>
  );
};

export default DMPanel;