import React from 'react';

const gold = '#c9a961';

/**
 * NPCCard
 * Matches the PlayerCard layout language — full standalone card,
 * nothing hidden in collapsed panels, everything breathes in its own box.
 */
const NPCCard = ({
  npc,
  isCurrentTurn = false,
  hasActedThisRound = false,
  onActivate,
  onDeactivate,
  onEdit,
  onRemove,
  onHPChange,
  onTriggerPhase,
  onOpenNPCAttack,
  players = [],
  onDropLoot,
}) => {
  const [manualHP, setManualHP] = React.useState('');
  const [showLootModal, setShowLootModal] = React.useState(false);
  const [selectedLootIdx, setSelectedLootIdx] = React.useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState('');
  const [selectedUnitType, setSelectedUnitType] = React.useState('');

  const hpPercent = npc.maxHp > 0 ? (npc.hp / npc.maxHp) * 100 : 0;
  const hpBarColor = hpPercent > 50
    ? 'linear-gradient(to right, #16a34a, #22c55e)'
    : hpPercent > 25
      ? 'linear-gradient(to right, #ca8a04, #eab308)'
      : 'linear-gradient(to right, #dc2626, #ef4444)';

  const hasNextPhase = npc.hasPhases && npc.currentPhase < (npc.phases?.length || 0);
  const nextPhase = hasNextPhase ? npc.phases[npc.currentPhase] : null;
  const currentPhaseName = npc.currentPhase > 0
    ? (npc.phases[npc.currentPhase - 1]?.label || `Phase ${npc.currentPhase + 1}`)
    : 'Phase 1';

  const handleSetHP = () => {
    const val = parseInt(manualHP);
    if (!isNaN(val)) {
      onHPChange(npc.id, val);
      setManualHP('');
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.85))',
      borderRadius: '12px',
      padding: '1rem',
      fontFamily: '"Rajdhani", "Cinzel", sans-serif',
      boxShadow: isCurrentTurn
        ? '0 0 24px rgba(239, 68, 68, 0.4), 0 8px 32px rgba(0,0,0,0.6)'
        : '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      border: isCurrentTurn
        ? '3px solid #ef4444'
        : npc.isDead
          ? '2px solid #450a0a'
          : npc.active
            ? '2px solid rgba(239, 68, 68, 0.5)'
            : '2px solid rgba(201, 169, 97, 0.3)',
      opacity: npc.isDead ? 0.5 : 1,
      transition: 'all 0.3s',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(201, 169, 97, 0.2)',
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          flexShrink: 0,
          background: npc.isDead ? '#450a0a' : npc.active ? '#ef4444' : '#4b5563',
          boxShadow: npc.active && !npc.isDead ? '0 0 8px #ef4444' : 'none',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: gold,
            fontSize: '1.1rem',
            fontWeight: '800',
            letterSpacing: '0.05em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {npc.name || 'Unnamed NPC'}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            {npc.active ? '⚔️ In Battle' : npc.isDead ? '💀 Defeated' : '💤 Standby'}
            {npc.hasPhases && ` • ${currentPhaseName}`}
          </div>
        </div>

        {isCurrentTurn && (
          <div style={{
            padding: '0.25rem 0.75rem',
            background: 'linear-gradient(to bottom, #dc2626, #b91c1c)',
            border: '2px solid #ef4444',
            borderRadius: '6px',
            color: '#fecaca',
            fontSize: '0.75rem',
            fontWeight: '800',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            NPC TURN
          </div>
        )}
        {!isCurrentTurn && hasActedThisRound && (
          <div style={{
            padding: '0.25rem 0.75rem',
            background: 'rgba(22, 163, 74, 0.2)',
            border: '1px solid #16a34a',
            borderRadius: '6px',
            color: '#86efac',
            fontSize: '0.75rem',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            ✓ ACTED
          </div>
        )}

        <button onClick={() => onEdit(npc.id)} title="Edit NPC" style={iconBtnStyle('#3b82f6')}>✏️</button>
        <button onClick={() => onRemove(npc.id)} title="Remove NPC" style={iconBtnStyle('#dc2626')}>✕</button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}>
        {[
          { label: 'Armor Floor', value: `${npc.armor}+`,            color: '#5eead4' },
          { label: 'Atk Bonus',   value: `+${npc.attackBonus || 0}`, color: '#fbbf24' },
          { label: 'Walk',        value: npc.walk || '—',            color: '#a78bfa' },
          { label: 'Run',         value: npc.run  || '—',            color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(201,169,97,0.15)',
            borderRadius: '8px',
            padding: '0.5rem 0.25rem',
            textAlign: 'center',
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>
              {label}
            </div>
            <div style={{ color, fontSize: '0.9rem', fontWeight: '800' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* HP section */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <span style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Hit Points
          </span>
          <span style={{ color: '#fde68a', fontSize: '1rem', fontWeight: '700' }}>
            {npc.hp} / {npc.maxHp}
          </span>
        </div>

        <div style={{
          width: '100%', height: '8px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '4px', overflow: 'hidden',
          marginBottom: '0.75rem',
        }}>
          <div style={{
            width: `${hpPercent}%`, height: '100%',
            background: hpBarColor,
            transition: 'width 0.4s ease',
            borderRadius: '4px',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onHPChange(npc.id, npc.hp - 1)}
            disabled={npc.hp === 0 || npc.isDead}
            style={hpBtnStyle(npc.hp === 0 || npc.isDead)}
          >−</button>

          <input
            type="number"
            value={manualHP}
            onChange={e => setManualHP(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetHP()}
            placeholder={String(npc.hp)}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              color: '#fbbf24',
              fontSize: '1rem',
              fontWeight: '700',
              fontFamily: 'inherit',
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}
          />

          <button
            onClick={handleSetHP}
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
              border: '2px solid rgba(245,158,11,0.5)',
              color: '#fbbf24',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '800',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >SET</button>

          <button
            onClick={() => onHPChange(npc.id, npc.hp + 1)}
            disabled={npc.hp >= npc.maxHp}
            style={hpBtnStyle(npc.hp >= npc.maxHp)}
          >+</button>
        </div>
      </div>

      {/* Attacks */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}>
        <div style={{
          color: '#f59e0b',
          fontSize: '1rem',
          fontWeight: '800',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}>
          ⚔️ Attacks
        </div>

        {npc.attacks?.map((attack, i) => (
          <div key={attack.id || i} style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: i < npc.attacks.length - 1 ? '0.5rem' : 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: gold, fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                  {attack.name || `Attack ${i + 1}`}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    color: '#c4b5fd',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                  }}>
                    {attack.dieType?.toUpperCase()} × {attack.numRolls}
                  </span>
                  {attack.range && (
                    <span style={{
                      background: 'rgba(20,184,166,0.1)',
                      border: '1px solid rgba(20,184,166,0.3)',
                      borderRadius: '4px',
                      padding: '0.2rem 0.5rem',
                      color: '#5eead4',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}>
                      📏 {attack.range}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onOpenNPCAttack(npc.id, i)}
                disabled={!npc.active || npc.isDead}
                style={{
                  padding: '0.5rem 0.85rem',
                  background: (!npc.active || npc.isDead)
                    ? 'rgba(0,0,0,0.2)'
                    : 'linear-gradient(135deg, #b91c1c, #991b1b)',
                  border: '2px solid',
                  borderColor: (!npc.active || npc.isDead) ? '#374151' : '#dc2626',
                  color: (!npc.active || npc.isDead) ? '#4b5563' : '#fecaca',
                  borderRadius: '8px',
                  cursor: (!npc.active || npc.isDead) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                ⚔️ USE
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Phase tracker */}
      {npc.hasPhases && npc.phases?.length > 0 && (
        <div style={{
          background: 'rgba(124,58,237,0.08)',
          border: '2px solid rgba(139,92,246,0.3)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              🔄 {currentPhaseName}
            </div>
            {hasNextPhase && (
              <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                Next: <span style={{ color: '#a78bfa' }}>{nextPhase.label}</span> at{' '}
                {nextPhase.triggerHP === 0
                  ? <span style={{ color: '#ef4444' }}>death (resurrects {nextPhase.resurrectHP}hp)</span>
                  : <span style={{ color: '#fbbf24' }}>{nextPhase.triggerHP}hp</span>
                }
              </div>
            )}
            {!hasNextPhase && (
              <div style={{ color: '#4b5563', fontSize: '0.72rem' }}>Final phase active</div>
            )}
          </div>
          {hasNextPhase && (
            <button
              onClick={() => onTriggerPhase(npc.id)}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: '2px solid #a78bfa',
                color: '#e9d5ff',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ⚡ Trigger
            </button>
          )}
        </div>
      )}

      {/* Drop Loot button — only shown if NPC has loot defined */}
      {(npc.lootTable?.length > 0) && (
        <button
          onClick={() => { setShowLootModal(true); setSelectedLootIdx(0); setSelectedPlayerId(''); setSelectedUnitType(''); }}
          style={{
            width: '100%', padding: '0.65rem', marginBottom: '0.5rem',
            background: 'rgba(139,92,246,0.12)', border: '2px solid rgba(139,92,246,0.4)',
            color: '#c4b5fd', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.85rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >🎁 Drop Loot</button>
      )}

      {/* Activate / Deactivate / Defeated */}
      {npc.isDead ? (
        <div style={{
          textAlign: 'center',
          color: '#6b1414',
          fontSize: '0.9rem',
          fontWeight: '800',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '0.65rem',
          border: '2px solid #450a0a',
          borderRadius: '8px',
          background: 'rgba(69,10,10,0.15)',
        }}>
          💀 DEFEATED
        </div>
      ) : (
        <button
          onClick={() => npc.active ? onDeactivate(npc.id) : onActivate(npc.id)}
          style={{
            width: '100%',
            padding: '0.85rem',
            background: npc.active
              ? 'rgba(0,0,0,0.3)'
              : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: '2px solid',
            borderColor: npc.active ? '#374151' : '#ef4444',
            color: npc.active ? '#6b7280' : '#fecaca',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: '800',
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: npc.active ? 'none' : '0 4px 12px rgba(239,68,68,0.25)',
            transition: 'all 0.2s',
          }}
        >
          {npc.active ? '💤 Deactivate' : '⚡ Activate into Battle'}
        </button>
      )}
      {/* Loot Drop Modal */}
      {showLootModal && (
        <div
          onClick={() => setShowLootModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
              border: '3px solid ' + gold, borderRadius: '12px',
              padding: '1.5rem', width: '420px', maxWidth: '95%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <h3 style={{
              color: gold, fontSize: '1.2rem', marginBottom: '1.25rem',
              textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif',
            }}>🎁 Drop Loot</h3>

            {/* Select loot item */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#8b7355', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Select Item
              </label>
              {npc.lootTable.map((item, i) => (
                <div
                  key={item.id || i}
                  onClick={() => setSelectedLootIdx(i)}
                  style={{
                    padding: '0.6rem 0.85rem', marginBottom: '0.4rem',
                    background: selectedLootIdx === i ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${selectedLootIdx === i ? 'rgba(139,92,246,0.6)' : 'rgba(90,74,58,0.4)'}`,
                    borderRadius: '6px', cursor: 'pointer', borderLeft: '3px solid rgba(139,92,246,0.5)',
                  }}
                >
                  <div style={{ color: '#c4b5fd', fontWeight: '800', fontSize: '0.85rem' }}>{item.name || '(unnamed)'}</div>
                  {item.description && <div style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '0.15rem' }}>{item.description}</div>}
                </div>
              ))}
            </div>

            {/* Select player */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#8b7355', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Give To Player
              </label>
              <select
                value={selectedPlayerId}
                onChange={e => { setSelectedPlayerId(e.target.value); setSelectedUnitType(''); }}
                style={{
                  width: '100%', background: '#0a0503', color: gold,
                  padding: '0.65rem', borderRadius: '6px', border: '2px solid #5a4a3a',
                  fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                <option value="">Select player...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.playerName || 'Player'}</option>
                ))}
              </select>
            </div>

            {/* Select unit */}
            {selectedPlayerId && (() => {
              const player = players.find(p => p.id === parseInt(selectedPlayerId));
              if (!player) return null;
              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ color: '#8b7355', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    Assign to Unit
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {/* Commander */}
                    <div
                      onClick={() => setSelectedUnitType('commander')}
                      style={{
                        padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                        background: selectedUnitType === 'commander' ? 'rgba(201,169,97,0.15)' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${selectedUnitType === 'commander' ? gold : 'rgba(90,74,58,0.4)'}`,
                        color: gold, fontSize: '0.82rem', fontWeight: '700',
                      }}
                    >
                      ⚔️ {player.commanderStats?.customName || player.commander || 'Commander'}
                    </div>
                    {/* Subunits */}
                    {player.subUnits?.map((unit, idx) => {
                      const unitType = idx === 0 ? 'special' : `soldier${idx}`;
                      const label = unit.name?.trim() ? unit.name : (idx === 0 ? '⭐ Special' : `🛡️ Soldier ${idx}`);
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedUnitType(unitType)}
                          style={{
                            padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                            background: selectedUnitType === unitType ? 'rgba(167,139,250,0.15)' : 'rgba(0,0,0,0.3)',
                            border: `2px solid ${selectedUnitType === unitType ? '#a78bfa' : 'rgba(90,74,58,0.4)'}`,
                            color: '#a78bfa', fontSize: '0.82rem', fontWeight: '700',
                          }}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Confirm / Cancel */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                disabled={!selectedPlayerId || !selectedUnitType}
                onClick={() => {
                  const item = npc.lootTable[selectedLootIdx];
                  if (!item || !selectedPlayerId || !selectedUnitType) return;
                  onDropLoot(parseInt(selectedPlayerId), selectedUnitType, { ...item, unitType: selectedUnitType });
                  setShowLootModal(false);
                }}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: (selectedPlayerId && selectedUnitType) ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
                  border: '2px solid', borderColor: (selectedPlayerId && selectedUnitType) ? '#10b981' : '#374151',
                  color: (selectedPlayerId && selectedUnitType) ? '#d1fae5' : '#4a3322',
                  borderRadius: '8px', cursor: (selectedPlayerId && selectedUnitType) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
                }}
              >✓ Give Item</button>
              <button
                onClick={() => setShowLootModal(false)}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'linear-gradient(135deg, #7f1d1d, #5f1a1a)',
                  border: '2px solid #991b1b', color: '#fecaca', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
                }}
              >✕ Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const hpBtnStyle = (disabled) => ({
  background: disabled
    ? 'rgba(0,0,0,0.2)'
    : 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
  border: '2px solid',
  borderColor: disabled ? '#374151' : 'rgba(245,158,11,0.5)',
  color: disabled ? '#374151' : '#fbbf24',
  padding: '0.65rem 1.25rem',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
  fontWeight: '800',
  fontSize: '1.2rem',
  transition: 'all 0.2s',
  flexShrink: 0,
});

const iconBtnStyle = (color) => ({
  background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${color}50`,
  color: color,
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  flexShrink: 0,
});

export default NPCCard;