import React, { useState } from 'react';

const gold = '#c9a961';

const TIERS = ['Common', 'Rare', 'Legendary'];

const EFFECT_TYPES = [
  { value: 'manual',             label: '📋 Manual / DM handles at table' },
  { value: 'attackBonus',        label: '⚔️ Attack Roll Bonus' },
  { value: 'defenseBonus',       label: '🛡️ Defense Roll Bonus' },
  { value: 'rerollAttack',       label: '⟳ Reroll Own Attack' },
  { value: 'rerollDefense',      label: '⟳ Reroll Own Defense' },
  { value: 'forceAttackReroll',  label: '⚡ Force Enemy Attack Reroll' },
  { value: 'forceDefenseReroll', label: '⚡ Force Enemy Defense Reroll' },
  { value: 'heal',               label: '💚 Heal HP' },
  { value: 'maxHP',              label: '❤️ Increase Max HP' },
  { value: 'extraSlot',          label: '🎒 Extra Carrying Slot' },
  { value: 'key',                label: '🔑 Key' },
  { value: 'destroyItem',        label: '💥 Destroy Enemy Item' },
];

const TIER_COLORS = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
  Quest:     { border: 'rgba(234,179,8,0.6)',   text: '#fde68a', bg: 'rgba(234,179,8,0.1)'    },
};

const blankItem = () => ({
  id: `loot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  name: '',
  description: '',
  tier: 'Common',
  isQuestItem: false,
  effect: { type: 'manual', value: 0, uses: 1 },
});

// ── Item Creator ─────────────────────────────────────────────────────────────

const ItemCreator = ({ onSave, onCancel }) => {
  const [item, setItem] = useState(blankItem());

  const set = (field, value) => setItem(prev => ({ ...prev, [field]: value }));
  const setEffect = (field, value) => setItem(prev => ({
    ...prev, effect: { ...prev.effect, [field]: value },
  }));

  const needsValue = ['attackBonus', 'defenseBonus', 'heal', 'maxHP'].includes(item.effect.type);
  const isDestroyItem = item.effect.type === 'destroyItem';
  const isExtraSlot = item.effect.type === 'extraSlot';
  const needsUses  = !['manual', 'extraSlot', 'key', 'destroyItem'].includes(item.effect.type);

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
      border: `2px solid ${gold}`, borderRadius: '10px',
      padding: '1.25rem', marginBottom: '1rem',
    }}>
      <div style={{ color: gold, fontWeight: '800', fontSize: '0.95rem', marginBottom: '1rem', letterSpacing: '0.08em' }}>
        ✨ New Loot Item
      </div>

      {/* Name */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Item Name</label>
        <input style={inputStyle} value={item.name}
          onChange={e => set('name', e.target.value)} placeholder="e.g. Ancient Blade" />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', lineHeight: '1.4' }}
          value={item.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What does this item do?" />
      </div>

      {/* Tier — hidden for quest items */}
      {!item.isQuestItem && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Tier</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {TIERS.map(t => {
              const c = TIER_COLORS[t];
              const sel = item.tier === t;
              return (
                <div key={t} onClick={() => set('tier', t)} style={{
                  flex: 1, textAlign: 'center', padding: '0.4rem',
                  background: sel ? c.bg : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${sel ? c.border : 'rgba(90,74,58,0.3)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: sel ? c.text : '#4b5563',
                  fontWeight: '800', fontSize: '0.78rem', letterSpacing: '0.08em',
                }}>{t}</div>
              );
            })}
          </div>
        </div>
      )}
      {item.isQuestItem && (
        <div style={{ marginBottom: '0.75rem', padding: '0.4rem 0.75rem',
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>🗝️</span>
          <span style={{ color: '#fde68a', fontWeight: '800', fontSize: '0.78rem' }}>Quest Tier — no slot cost · cannot be in chests · cannot be destroyed</span>
        </div>
      )}

      {/* Effect type */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Effect Type</label>
        <select style={{ ...inputStyle, cursor: 'pointer' }}
          value={item.effect.type}
          onChange={e => setEffect('type', e.target.value)}>
          {EFFECT_TYPES.map(et => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>
      </div>

      {/* Effect value + uses */}
      {(needsValue || needsUses) && (
        <div style={{ display: 'grid', gridTemplateColumns: needsValue && needsUses ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {needsValue && (
            <div>
              <label style={labelStyle}>Value</label>
              <input style={inputStyle} type="number" min="1" max="99"
                value={item.effect.value}
                onChange={e => setEffect('value', parseInt(e.target.value) || 0)} />
            </div>
          )}
          {needsUses && (
            <div>
              <label style={labelStyle}>Uses (0 = unlimited)</label>
              <input style={inputStyle} type="number" min="0" max="99"
                value={item.effect.uses}
                onChange={e => setEffect('uses', parseInt(e.target.value) || 0)} />
            </div>
          )}
        </div>
      )}

      {/* Quest Item toggle */}
      <div onClick={() => {
        const next = !item.isQuestItem;
        setItem(prev => ({ ...prev, isQuestItem: next, tier: next ? 'Quest' : 'Common' }));
      }} style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 0.85rem', marginBottom: '0.75rem',
        background: item.isQuestItem ? 'rgba(234,179,8,0.1)' : 'rgba(0,0,0,0.3)',
        border: `2px solid ${item.isQuestItem ? 'rgba(234,179,8,0.5)' : 'rgba(90,74,58,0.3)'}`,
        borderRadius: '8px', cursor: 'pointer',
      }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
          border: `2px solid ${item.isQuestItem ? '#eab308' : '#4b5563'}`,
          background: item.isQuestItem ? '#eab308' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', color: '#000', fontWeight: '900',
        }}>{item.isQuestItem && '✓'}</div>
        <div>
          <div style={{ color: item.isQuestItem ? '#fde68a' : '#6b7280', fontWeight: '800', fontSize: '0.82rem' }}>
            🗝️ Quest Item
          </div>
          <div style={{ color: '#4b5563', fontSize: '0.65rem' }}>
            Does not count toward carrying slots · Cannot be destroyed · Can be stolen if unit is killed
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          disabled={!item.name.trim()}
          onClick={() => onSave(item)}
          style={{
            flex: 1, padding: '0.65rem',
            background: item.name.trim() ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
            border: '2px solid', borderColor: item.name.trim() ? '#10b981' : '#374151',
            color: item.name.trim() ? '#d1fae5' : '#4a3322',
            borderRadius: '8px', cursor: item.name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.875rem',
          }}>✓ Create Item</button>
        <button onClick={onCancel} style={{
          flex: 1, padding: '0.65rem',
          background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
          color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: '800', fontSize: '0.875rem',
        }}>✕ Cancel</button>
      </div>
    </div>
  );
};

// ── Give to Player Modal ──────────────────────────────────────────────────────

const GiveModal = ({ item, players, onConfirm, onClose }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState('');

  const player = players.find(p => p.id === parseInt(selectedPlayerId));
  const canConfirm = selectedPlayerId && selectedUnitType;

  // Returns how many slots a unit has (base 1, +1 per extraSlot item held)
  const getSlotCount = (p, unitType) => {
    if (!p) return 1;
    const extraSlots = (p.inventory || []).filter(
      it => it.heldBy === unitType && it.effect?.type === 'extraSlot'
    ).length;
    return 1 + extraSlots;
  };

  // Returns how many items a unit is currently holding (quest items don't count)
  const getHeldCount = (p, unitType) => {
    if (!p) return 0;
    return (p.inventory || []).filter(it => it.heldBy === unitType && !it.isQuestItem).length;
  };

  const unitIsFull = (p, unitType) => {
    return getHeldCount(p, unitType) >= getSlotCount(p, unitType);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1a0f0a, #0f0805)',
        border: `3px solid ${gold}`, borderRadius: '12px',
        padding: '1.5rem', width: '400px', maxWidth: '95%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
      }}>
        <h3 style={{ color: gold, fontSize: '1.1rem', marginBottom: '0.25rem', fontFamily: '"Cinzel", Georgia, serif', textAlign: 'center' }}>
          🎁 Give Item
        </h3>
        <div style={{ color: '#8b7355', fontSize: '0.78rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          {item.name}
        </div>

        {/* Player */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Player</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }}
            value={selectedPlayerId}
            onChange={e => { setSelectedPlayerId(e.target.value); setSelectedUnitType(''); }}>
            <option value="">Select player...</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.playerName || 'Player'}</option>)}
          </select>
        </div>

        {/* Unit */}
        {player && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Assign to Unit</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(() => {
                const full = unitIsFull(player, 'commander');
                return (
                  <div
                    onClick={() => !full && setSelectedUnitType('commander')}
                    style={{
                      ...unitRow(selectedUnitType === 'commander', gold),
                      opacity: full ? 0.4 : 1,
                      cursor: full ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⚔️ {player.commanderStats?.customName || player.commander || 'Commander'}
                    {full && <span style={{ color: '#ef4444', fontSize: '0.62rem', fontWeight: '800', marginLeft: '0.5rem' }}>FULL</span>}
                  </div>
                );
              })()}
              {player.subUnits?.map((unit, idx) => {
                const ut = idx === 0 ? 'special' : `soldier${idx}`;
                const label = unit.name?.trim() ? unit.name : (idx === 0 ? '⭐ Special' : `🛡️ Soldier ${idx}`);
                const full = unitIsFull(player, ut);
                return (
                  <div
                    key={idx}
                    onClick={() => !full && setSelectedUnitType(ut)}
                    style={{
                      ...unitRow(selectedUnitType === ut, '#a78bfa'),
                      opacity: full ? 0.4 : 1,
                      cursor: full ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {label}
                    {full && <span style={{ color: '#ef4444', fontSize: '0.62rem', fontWeight: '800', marginLeft: '0.5rem' }}>FULL</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button disabled={!canConfirm} onClick={() => canConfirm && onConfirm(parseInt(selectedPlayerId), selectedUnitType)}
            style={{
              flex: 1, padding: '0.75rem',
              background: canConfirm ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
              border: '2px solid', borderColor: canConfirm ? '#10b981' : '#374151',
              color: canConfirm ? '#d1fae5' : '#4a3322', borderRadius: '8px',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
            }}>✓ Give</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
            color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.9rem',
          }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Loot Item Card ────────────────────────────────────────────────────────────

const LootItemCard = ({ item, players, onGive, onDelete }) => {
  const [showGive, setShowGive] = useState(false);
  const c = item.isQuestItem ? TIER_COLORS.Quest : (TIER_COLORS[item.tier] || TIER_COLORS.Common);
  const effectLabel = EFFECT_TYPES.find(e => e.value === item.effect?.type)?.label || '📋 Manual';

  return (
    <>
      <div style={{
        background: 'rgba(0,0,0,0.4)', border: `2px solid ${c.border}`,
        borderLeft: `4px solid ${c.border}`, borderRadius: '8px',
        padding: '0.85rem', marginBottom: '0.6rem',
        transition: 'all 0.2s',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ color: c.text, fontWeight: '900', fontSize: '0.9rem' }}>{item.name}</span>
              <span style={{
                padding: '0.1rem 0.45rem', background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: '4px', color: c.text, fontSize: '0.62rem', fontWeight: '800',
                letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
              }}>{item.isQuestItem ? '🗝️ Quest' : item.tier}</span>
            </div>
            {item.description && (
              <div style={{ color: '#6b7280', fontSize: '0.75rem', lineHeight: '1.4' }}>{item.description}</div>
            )}
          </div>
          <button onClick={() => onDelete(item.id)} style={{
            background: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d',
            borderRadius: '4px', color: '#fca5a5', fontSize: '0.65rem',
            fontWeight: '900', padding: '0.2rem 0.4rem', cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Effect badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.15rem 0.5rem', background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(90,74,58,0.4)', borderRadius: '4px',
              color: '#8b7355', fontSize: '0.68rem', fontWeight: '700',
            }}>{effectLabel}</span>
            {item.effect?.type !== 'manual' && (
              <>
                {item.effect?.value > 0 && (
                  <span style={{
                    padding: '0.15rem 0.5rem', background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px',
                    color: '#86efac', fontSize: '0.68rem', fontWeight: '700',
                  }}>+{item.effect.value}</span>
                )}
                <span style={{
                  padding: '0.15rem 0.5rem', background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px',
                  color: '#93c5fd', fontSize: '0.68rem', fontWeight: '700',
                }}>{item.effect?.uses === 0 ? '∞ uses' : `${item.effect?.uses} use${item.effect?.uses !== 1 ? 's' : ''}`}</span>
              </>
            )}
          </div>
          <button onClick={() => setShowGive(true)} style={{
            padding: '0.35rem 0.85rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))',
            border: '2px solid rgba(139,92,246,0.5)',
            color: '#c4b5fd', borderRadius: '6px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.75rem',
            letterSpacing: '0.05em',
          }}>🎁 Give</button>
        </div>
      </div>

      {showGive && (
        <GiveModal
          item={item}
          players={players}
          onConfirm={(playerId, unitType) => { onGive(item, playerId, unitType); setShowGive(false); }}
          onClose={() => setShowGive(false)}
        />
      )}
    </>
  );
};

// ── Main LootPanel ────────────────────────────────────────────────────────────

const LootPanel = ({ players, lootPool = [], setLootPool, onGiveItem }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [filterTier, setFilterTier] = useState('All');

  const handleSave = (item) => {
    setLootPool(prev => [...prev, item]);
    setShowCreator(false);
  };

  const handleDelete = (itemId) => {
    setLootPool(prev => prev.filter(i => i.id !== itemId));
  };

  const filtered = filterTier === 'All'
    ? lootPool
    : lootPool.filter(i => i.tier === filterTier);

  return (
    <div style={{ width: '100%' }}>

      {/* Create button */}
      <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        <button
          onClick={() => setShowCreator(true)}
          style={{
            padding: '1rem 2.5rem',
            background: 'linear-gradient(135deg, #4c1d95, #3b0764)',
            border: '2px solid #7c3aed', color: '#e9d5ff',
            borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '1rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}
        >✨ CREATE ITEM</button>
      </div>

      {/* Creator form */}
      {showCreator && (
        <ItemCreator onSave={handleSave} onCancel={() => setShowCreator(false)} />
      )}

      {/* Tier filter */}
      {lootPool.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
          {['All', ...TIERS, 'Quest'].map(t => {
            const c = t === 'All' ? { border: 'rgba(201,169,97,0.4)', text: gold, bg: 'rgba(201,169,97,0.08)' } : TIER_COLORS[t];
            const sel = filterTier === t;
            return (
              <div key={t} onClick={() => setFilterTier(t)} style={{
                padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                background: sel ? c.bg : 'rgba(0,0,0,0.3)',
                border: `1px solid ${sel ? c.border : 'rgba(90,74,58,0.3)'}`,
                color: sel ? c.text : '#4b5563',
                fontWeight: '800', fontSize: '0.72rem', letterSpacing: '0.08em',
              }}>{t}</div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {lootPool.length === 0 && !showCreator && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#4b5563' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>
            No loot items yet
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Click CREATE ITEM to build your loot pool.
          </div>
        </div>
      )}

      {/* Item cards */}
      {filtered.map(item => (
        <LootItemCard
          key={item.id}
          item={item}
          players={players}
          onGive={onGiveItem}
          onDelete={handleDelete}
        />
      ))}

      {filtered.length === 0 && lootPool.length > 0 && (
        <div style={{ textAlign: 'center', color: '#4b5563', padding: '2rem', fontSize: '0.85rem' }}>
          No {filterTier} items in pool.
        </div>
      )}
    </div>
  );
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = {
  color: '#8b7355', fontSize: '0.72rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.35rem',
};

const inputStyle = {
  width: '100%', background: '#0a0503', color: gold,
  padding: '0.6rem 0.75rem', borderRadius: '6px',
  border: '1px solid #5a4a3a', fontFamily: 'inherit',
  fontSize: '0.875rem', boxSizing: 'border-box',
};

const unitRow = (selected, color) => ({
  padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
  background: selected ? `rgba(${color === gold ? '201,169,97' : '167,139,250'},0.12)` : 'rgba(0,0,0,0.3)',
  border: `2px solid ${selected ? color : 'rgba(90,74,58,0.3)'}`,
  color: selected ? color : '#6b7280',
  fontWeight: '700', fontSize: '0.82rem', transition: 'all 0.15s',
});

export default LootPanel;