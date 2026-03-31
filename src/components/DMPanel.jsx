import React from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors } from '../theme';
import NPCCard from './NPCCard';
import NPCCreator from './NPCCreator';



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
  onOpenNPCSquadAttack,
  getNPCById,
  currentTurnId,
  npcsWhoActedThisRound,
  players = [],
  onDropLoot,
  lootPool = [],
  onIncrementAttack,
  onSpawnAttack,
  getTimersForNPC = () => [],
  currentRound = 1,
  onOpenNpcBuff,
  onUpdateNPC,
}) => {
  const editingNPC = editingNPCId ? getNPCById(editingNPCId) : null;
  const [squadMode,        setSquadMode]        = React.useState(false);
  const [squadSelected,    setSquadSelected]    = React.useState({}); // { npcId: attackIndex }
  const [search,           setSearch]           = React.useState('');
  const [filterStatus,     setFilterStatus]     = React.useState('all'); // 'all' | 'active' | 'inactive'

  const orderedNPCs = [...activeNPCs, ...inactiveNPCs];

  const filteredNPCs = orderedNPCs.filter(npc => {
    const matchesSearch = !search.trim() || npc.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = filterStatus === 'all'
      ? true
      : filterStatus === 'active'   ? npc.active && !npc.isDead
      : /* inactive */                !npc.active && !npc.isDead;
    return matchesSearch && matchesStatus;
  });
  const toggleSquadNPC = (npcId) => {
    setSquadSelected(prev => {
      if (npcId in prev) {
        const next = { ...prev };
        delete next[npcId];
        return next;
      }
      // Default to first attack
      const npc = getNPCById(npcId);
      return { ...prev, [npcId]: 0 };
    });
  };

  const setSquadAttackIndex = (npcId, attackIndex) => {
    setSquadSelected(prev => ({ ...prev, [npcId]: attackIndex }));
  };

  const launchSquadAttack = () => {
    const squadNPCIds = Object.keys(squadSelected);
    if (squadNPCIds.length < 2) return;
    const squadMembers = squadNPCIds.map(npcId => {
      const npc = getNPCById(npcId);
      const attackIndex = squadSelected[npcId];
      return { npcId, npcName: npc.name, attackIndex, attack: npc.attacks[attackIndex], armor: npc.armor, attackBonus: npc.attackBonus || 0 };
    });
    onOpenNPCSquadAttack(squadMembers);
    setSquadMode(false);
    setSquadSelected({});
  };

  const squadCount = Object.keys(squadSelected).length;

  return (
    <div style={{ width: '100%' }}>

      {/* Header buttons */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => openCreator(null)}
          style={{
            padding: '1rem 2.5rem',
            background: 'linear-gradient(135deg, #7c1d1d, #6b1a1a)',
            border: '2px solid #ef4444',
            color: '#fecaca',
            borderRadius: '10px',
            cursor: 'pointer',
            fontFamily: fonts.body,
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
        {activeNPCs.length >= 2 && (
          <button
            onClick={() => { setSquadMode(s => !s); setSquadSelected({}); }}
            style={{
              padding: '1rem 1.5rem',
              background: squadMode ? 'linear-gradient(135deg,#4c1d95,#3b0764)' : 'rgba(124,58,237,0.15)',
              border: `2px solid ${squadMode ? '#a78bfa' : 'rgba(124,58,237,0.5)'}`,
              color: squadMode ? '#e9d5ff' : '#a78bfa',
              borderRadius: '10px', cursor: 'pointer',
              fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
          >
            ⚔️ {squadMode ? 'Cancel Squad' : 'Squad Attack'}
          </button>
        )}
      </div>

      {/* Search + Filter bar */}
      {npcs.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: colors.textFaint, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search NPCs...'
              style={{
                width: '100%', boxSizing: 'border-box',
                background: surfaces.inset, border: borders.default,
                borderRadius: '8px', padding: '0.5rem 0.6rem 0.5rem 1.8rem',
                color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>✕</button>
            )}
          </div>
          {/* Status filter chips */}
          {['all', 'active', 'inactive'].map(f => {
            const labels = { all: '⚡ All', active: '✅ Active', inactive: '😴 Inactive' };
            const active = filterStatus === f;
            return (
              <button key={f} onClick={() => setFilterStatus(f)} style={{
                padding: '0.45rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                fontFamily: fonts.body, fontWeight: '800', fontSize: '0.72rem',
                background: active ? (f === 'active' ? colors.greenSubtle : f === 'inactive' ? 'rgba(99,102,241,0.15)' : colors.amberSubtle) : 'rgba(0,0,0,0.25)',
                border: `1px solid ${active ? (f === 'active' ? colors.greenBorder : f === 'inactive' ? 'rgba(99,102,241,0.4)' : colors.amberBorder) : 'rgba(255,255,255,0.06)'}`,
                color: active ? (f === 'active' ? colors.green : f === 'inactive' ? '#a5b4fc' : colors.amber) : colors.textMuted,
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>{labels[f]}</button>
            );
          })}
        </div>
      )}

      {/* Squad launch bar */}
      {squadMode && (
        <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(124,58,237,0.1)', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, color: '#c4b5fd', fontSize: '0.82rem', fontWeight: '700' }}>
            {squadCount === 0 ? 'Select 2+ active NPCs to form a squad' : `${squadCount} NPC${squadCount !== 1 ? 's' : ''} selected`}
          </div>
          <button
            disabled={squadCount < 2}
            onClick={launchSquadAttack}
            style={{
              padding: '0.55rem 1.25rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.82rem', cursor: squadCount >= 2 ? 'pointer' : 'not-allowed',
              background: squadCount >= 2 ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : surfaces.elevated,
              border: `2px solid ${squadCount >= 2 ? '#a78bfa' : colors.textDisabled}`,
              color: squadCount >= 2 ? '#e9d5ff' : colors.textDisabled,
            }}
          >
            ⚔️ Launch Attack
          </button>
        </div>
      )}

      {/* Empty state */}
      {npcs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: colors.textFaint,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👾</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: colors.textMuted }}>
            No NPCs yet
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Click ADD NPC to create enemies, bosses, or creatures for your campaign.
          </div>
        </div>
      )}

      {/* NPC grid — same 2-column layout as player cards */}
      {npcs.length > 0 && (
        <div style={{ position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: filteredNPCs.length === 1 ? '1fr' : '48% 48%',
          gap: '1%',
          padding: '0 0.5%',
          maxWidth: filteredNPCs.length === 1 ? '50%' : '100%',
          margin: filteredNPCs.length === 1 ? '0 auto' : '0',
          alignItems: 'start',
        }}>
          {filteredNPCs.map(npc => (
            <div key={npc.id} style={{ position: 'relative', isolation: 'isolate' }}>
              {/* Squad mode overlay */}
              {squadMode && !npc.isDead && npc.active && (
                <div
                  onClick={() => toggleSquadNPC(npc.id)}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer',
                    borderRadius: '12px',
                    background: npc.id in squadSelected ? 'rgba(124,58,237,0.15)' : 'rgba(0,0,0,0.35)',
                    border: `3px solid ${npc.id in squadSelected ? '#a78bfa' : 'rgba(124,58,237,0.2)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                    padding: '0.75rem',
                    backdropFilter: npc.id in squadSelected ? 'none' : 'brightness(0.7)',
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: npc.id in squadSelected ? '#7c3aed' : 'rgba(0,0,0,0.6)', border: `3px solid ${npc.id in squadSelected ? '#e9d5ff' : 'rgba(124,58,237,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e9d5ff', fontWeight: '900', fontSize: '0.9rem', marginBottom: npc.id in squadSelected ? '0.5rem' : 0 }}>
                    {npc.id in squadSelected ? '✓' : '+'}
                  </div>
                  {npc.id in squadSelected && (npc.attacks || []).filter(a => (a.attackType || 'attack') === 'attack').length > 1 && (
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%' }}>
                      <div style={{ color: '#c4b5fd', fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem', textAlign: 'center' }}>Attack</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center' }}>
                        {npc.attacks.map((atk, realIdx) => (atk.attackType || 'attack') !== 'attack' ? null : (
                          <button key={realIdx} onClick={() => setSquadAttackIndex(npc.id, realIdx)} style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.62rem', cursor: 'pointer', background: squadSelected[npc.id] === realIdx ? 'rgba(167,139,250,0.3)' : 'rgba(0,0,0,0.5)', border: `1px solid ${squadSelected[npc.id] === realIdx ? '#a78bfa' : 'rgba(124,58,237,0.3)'}`, color: squadSelected[npc.id] === realIdx ? '#e9d5ff' : '#7c3aed' }}>
                            {atk.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {npc.id in squadSelected && (npc.attacks || []).filter(a => (a.attackType || 'attack') === 'attack').length === 1 && (
                    <div style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '700' }}>{(npc.attacks || []).find(a => (a.attackType || 'attack') === 'attack')?.name}</div>
                  )}
                </div>
              )}
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
              onSpawnAttack={onSpawnAttack}
              onIncrementAttack={onIncrementAttack}
              players={players}
              onDropLoot={onDropLoot}
              getTimersForNPC={getTimersForNPC}
              onOpenNpcBuff={onOpenNpcBuff}
              onUpdateNPC={onUpdateNPC}
            />
            </div>
          ))}
        </div>
        </div>
      )}



      {/* No results state */}
      {npcs.length > 0 && filteredNPCs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: colors.textFaint }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <div style={{ fontWeight: '700', color: colors.textMuted, marginBottom: '0.25rem' }}>No NPCs match</div>
          <div style={{ fontSize: '0.8rem' }}>Try a different search or filter.</div>
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