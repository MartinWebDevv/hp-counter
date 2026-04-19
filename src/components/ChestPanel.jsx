import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors, inputStyle as themeInput } from '../theme';



const TIER_COLORS = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: colors.textSecondary, bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
};

const TIER_WEIGHTS_DEFAULT = { Common: 60, Rare: 30, Legendary: 10 };

const blankChest = () => ({
  id: `chest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  description: '',
  requiredKeyName: '',       // exact item name required to open
  itemCount: 1,              // how many items drop on open
  mode: 'weighted',          // 'weighted' | 'preloaded'
  tierWeights: { ...TIER_WEIGHTS_DEFAULT },
  preloadedItems: [],        // item ids from loot pool (mode=preloaded)
  isOpened: false,
  openedBy: null,            // playerName
  droppedItems: [],          // items that actually dropped
});

// ── Chest Creator ─────────────────────────────────────────────────────────────

const ChestCreator = ({ onSave, onCancel, lootPool, initialChest = null }) => {
  const [chest, setChest] = useState(() => initialChest ? { ...initialChest } : blankChest());

  const set = (field, value) => setChest(prev => ({ ...prev, [field]: value }));
  const setWeight = (tier, value) => setChest(prev => ({
    ...prev,
    tierWeights: { ...prev.tierWeights, [tier]: Math.max(0, parseInt(value) || 0) },
  }));

  const totalWeight = Object.values(chest.tierWeights).reduce((s, v) => s + v, 0);

  const togglePreload = (itemId) => {
    setChest(prev => {
      const already = prev.preloadedItems.includes(itemId);
      return {
        ...prev,
        preloadedItems: already
          ? prev.preloadedItems.filter(id => id !== itemId)
          : [...prev.preloadedItems, itemId],
      };
    });
  };

  const canSave = chest.name.trim() && (
    chest.mode === 'weighted'
      ? totalWeight > 0 && chest.itemCount >= 1
      : chest.preloadedItems.length > 0
  );

  return (
    <div style={{
      background: 'surfaces.elevated',
      border: `2px solid ${colors.gold}`, borderRadius: '10px',
      padding: '1.25rem', marginBottom: '1rem',
    }}>
      <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.95rem', marginBottom: '1rem', letterSpacing: '0.08em' }}>
        📦 New Chest
      </div>

      {/* Name */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Chest Name</label>
        <input style={inputStyle} value={chest.name}
          onChange={e => set('name', e.target.value)} placeholder="e.g. Iron Chest, Boss Vault" />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Description / DM Note</label>
        <textarea style={{ ...inputStyle, minHeight: '52px', resize: 'vertical', lineHeight: '1.4' }}
          value={chest.description}
          onChange={e => set('description', e.target.value)}
          placeholder="e.g. Hidden behind the altar, smells of old magic..." />
      </div>

      {/* Required key */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Required Key Name (exact item name)</label>
        <input style={inputStyle} value={chest.requiredKeyName}
          onChange={e => set('requiredKeyName', e.target.value)}
          placeholder="e.g. Fang Key I  — leave blank for no key required" />
        {chest.requiredKeyName.trim() && (
          <div style={{ color: colors.textMuted, fontSize: '0.68rem', marginTop: '0.25rem' }}>
            Player must hold an item named exactly <span style={{ color: colors.gold }}>"{chest.requiredKeyName.trim()}"</span> to open this chest.
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Loot Mode</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'weighted', label: '🎲 Weighted Random' },
            { value: 'preloaded', label: '📋 Pre-loaded Items' },
          ].map(opt => (
            <div key={opt.value} onClick={() => set('mode', opt.value)} style={{
              flex: 1, textAlign: 'center', padding: '0.5rem',
              background: chest.mode === opt.value ? 'rgba(201,169,97,0.12)' : surfaces.inset,
              border: `2px solid ${chest.mode === opt.value ? colors.gold : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '6px', cursor: 'pointer',
              color: chest.mode === opt.value ? colors.gold : colors.textFaint,
              fontWeight: '800', fontSize: '0.78rem',
            }}>{opt.label}</div>
          ))}
        </div>
      </div>

      {/* Weighted mode */}
      {chest.mode === 'weighted' && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Items to Drop</label>
            <input style={{ ...inputStyle, width: '80px' }} type="number" min="1" max="10"
              value={chest.itemCount}
              onChange={e => set('itemCount', Math.max(1, parseInt(e.target.value) || 1))} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Tier Weights (total: {totalWeight}%)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {['Common', 'Rare', 'Legendary'].map(tier => {
                const c = TIER_COLORS[tier];
                const pct = totalWeight > 0 ? Math.round((chest.tierWeights[tier] / totalWeight) * 100) : 0;
                return (
                  <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: c.text, fontWeight: '800', fontSize: '0.78rem', width: '72px' }}>{tier}</span>
                    <input type="number" min="0" max="100" value={chest.tierWeights[tier]}
                      onChange={e => setWeight(tier, e.target.value)}
                      style={{ ...inputStyle, width: '64px', padding: '0.35rem 0.5rem', textAlign: 'center' }} />
                    <div style={{ flex: 1, height: '6px', background: surfaces.insetDeep, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c.text, borderRadius: '3px', transition: 'width 0.2s' }} />
                    </div>
                    <span style={{ color: colors.textFaint, fontSize: '0.68rem', fontWeight: '700', width: '30px', textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
            {lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key').length === 0 && (
              <div style={{ color: '#ef4444', fontSize: '0.68rem', marginTop: '0.4rem' }}>
                ⚠️ No non-quest items in loot pool — add items in the Loot tab first.
              </div>
            )}
          </div>
        </>
      )}

      {/* Pre-loaded mode */}
      {chest.mode === 'preloaded' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Select Items ({chest.preloadedItems.length} selected)</label>
          {lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key').length === 0 ? (
            <div style={{ color: '#ef4444', fontSize: '0.72rem' }}>⚠️ No non-quest items in loot pool yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '200px', overflowY: 'auto' }}>
              {lootPool.filter(item => !item.isQuestItem && item.effect?.type !== 'key').map(item => {
                const c = TIER_COLORS[item.tier] || TIER_COLORS.Common;
                const selected = chest.preloadedItems.includes(item.id);
                return (
                  <div key={item.id} onClick={() => togglePreload(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: selected ? c.bg : surfaces.inset,
                    border: `2px solid ${selected ? c.border : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '6px', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                      border: `2px solid ${selected ? c.text : colors.textFaint}`,
                      background: selected ? c.text : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', color: '#000', fontWeight: '900',
                    }}>{selected && '✓'}</div>
                    <span style={{ color: c.text, fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{item.name}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{item.tier}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button disabled={!canSave} onClick={() => onSave(chest)} style={{
          flex: 1, padding: '0.65rem',
          background: canSave ? 'linear-gradient(135deg, #059669, #047857)' : '#1a0f0a',
          border: '2px solid', borderColor: canSave ? '#10b981' : colors.textDisabled,
          color: canSave ? '#d1fae5' : '#4a3322',
          borderRadius: '8px', cursor: canSave ? 'pointer' : 'not-allowed',
          fontFamily: fonts.body, fontWeight: '800', fontSize: '0.875rem',
        }}>✓ Create Chest</button>
        <button onClick={onCancel} style={{
          flex: 1, padding: '0.65rem',
          background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
          color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
          fontFamily: fonts.body, fontWeight: '800', fontSize: '0.875rem',
        }}>✕ Cancel</button>
      </div>
    </div>
  );
};

// ── Open Chest Modal ──────────────────────────────────────────────────────────

const OpenChestModal = ({ chest, players, lootPool, onConfirm, onClose }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [rolled, setRolled] = useState(null); // array of dropped items after roll

  const player = players.find(p => String(p.id) === String(selectedPlayerId));

  // Check if player holds the required key
  const playerHasKey = (p) => {
    if (!chest.requiredKeyName.trim()) return true;
    return (p?.inventory || []).some(
      it => it.name.trim().toLowerCase() === chest.requiredKeyName.trim().toLowerCase()
    );
  };

  const rollLoot = () => {
    if (!player) return;
    let dropped = [];

    if (chest.mode === 'preloaded') {
      // All pre-loaded items drop
      dropped = chest.preloadedItems
        .map(id => lootPool.find(i => i.id === id))
        .filter(Boolean)
        .filter(it => !it.isQuestItem && it.effect?.type !== 'key');
    } else {
      // Weighted random roll
      const tiers = ['Common', 'Rare', 'Legendary'];
      const weights = chest.tierWeights;
      const total = tiers.reduce((s, t) => s + (weights[t] || 0), 0);
      if (total === 0) return;

      for (let i = 0; i < chest.itemCount; i++) {
        // Roll tier
        let rand = Math.random() * total;
        let chosenTier = 'Common';
        for (const tier of tiers) {
          rand -= (weights[tier] || 0);
          if (rand <= 0) { chosenTier = tier; break; }
        }
        // Pick random item of that tier from pool
        const pool = lootPool.filter(it => it.tier === chosenTier && !it.isQuestItem && it.effect?.type !== 'key');
        if (pool.length > 0) {
          dropped.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
          // Fallback: any item from pool
          if (lootPool.length > 0) {
            dropped.push(lootPool[Math.floor(Math.random() * lootPool.length)]);
          }
        }
      }
    }
    setRolled(dropped);
  };

  const hasKey = player ? playerHasKey(player) : false;
  const canRoll = player && hasKey && !rolled;
  const canConfirm = rolled && rolled.length > 0;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'surfaces.elevated',
        border: `3px solid ${colors.gold}`, borderRadius: '12px',
        padding: '1.5rem', width: '420px', maxWidth: '95%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>
            {chest.isOpened ? '📭' : '📦'}
          </div>
          <div style={{ color: colors.gold, fontWeight: '900', fontSize: '1.1rem', fontFamily: fonts.display }}>
            {chest.name}
          </div>
          {chest.description && (
            <div style={{ color: colors.textMuted, fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
              {chest.description}
            </div>
          )}
          {chest.requiredKeyName && (
            <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.6rem', background: 'rgba(201,169,97,0.1)',
              border: '1px solid rgba(201,169,97,0.3)', borderRadius: '5px' }}>
              <span style={{ fontSize: '0.75rem' }}>🔑</span>
              <span style={{ color: colors.textMuted, fontSize: '0.68rem', fontWeight: '800' }}>
                Requires: {chest.requiredKeyName}
              </span>
            </div>
          )}
        </div>

        {/* Player select */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Who is opening this chest?</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }}
            value={selectedPlayerId}
            onChange={e => { setSelectedPlayerId(e.target.value); setRolled(null); }}>
            <option value="">Select player...</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.playerName || 'Player'}</option>)}
          </select>
        </div>

        {/* Key check */}
        {player && chest.requiredKeyName.trim() && (
          <div style={{
            padding: '0.6rem 0.85rem', borderRadius: '8px', marginBottom: '1rem',
            background: hasKey ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${hasKey ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <span style={{ color: hasKey ? '#86efac' : '#fca5a5', fontWeight: '800', fontSize: '0.8rem' }}>
              {hasKey
                ? `✓ ${player.playerName} holds "${chest.requiredKeyName}" — chest can be opened`
                : `✗ ${player.playerName} does not hold "${chest.requiredKeyName}"`}
            </span>
          </div>
        )}

        {/* Roll button */}
        {!rolled && (
          <button onClick={rollLoot} disabled={!canRoll} style={{
            width: '100%', padding: '0.85rem',
            background: canRoll ? 'linear-gradient(135deg, #92400e, #78350f)' : '#1a0f0a',
            border: `2px solid ${canRoll ? '#eab308' : colors.textDisabled}`,
            color: canRoll ? '#fde68a' : '#4a3322',
            borderRadius: '8px', cursor: canRoll ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '1rem',
            letterSpacing: '0.05em', marginBottom: '1rem',
          }}>🎲 Open Chest</button>
        )}

        {/* Rolled results */}
        {rolled && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '0.6rem', textAlign: 'center' }}>
              ✨ Loot Dropped
            </div>
            {rolled.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.85rem', padding: '1rem' }}>
                The chest was empty.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {rolled.map((item, i) => {
                  const c = TIER_COLORS[item.tier] || TIER_COLORS.Common;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.6rem 0.85rem',
                      background: c.bg, border: `2px solid ${c.border}`,
                      borderRadius: '8px',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>📦</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: c.text, fontWeight: '900', fontSize: '0.88rem' }}>{item.name}</div>
                        {item.description && (
                          <div style={{ color: colors.textMuted, fontSize: '0.68rem' }}>{item.description}</div>
                        )}
                      </div>
                      <span style={{
                        padding: '0.1rem 0.4rem', background: `${c.text}18`,
                        border: `1px solid ${c.border}`, borderRadius: '4px',
                        color: c.text, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
                      }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Confirm / cancel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canConfirm && (
            <button onClick={() => onConfirm(chest.id, selectedPlayerId, rolled)} style={{
              flex: 1, padding: '0.75rem',
              background: 'linear-gradient(135deg, #059669, #047857)',
              border: '2px solid #10b981', color: '#d1fae5',
              borderRadius: '8px', cursor: 'pointer',
              fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem',
            }}>✓ Give Loot to {player?.playerName}</button>
          )}
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem',
            background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d',
            color: '#fca5a5', borderRadius: '8px', cursor: 'pointer',
            fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem',
          }}>✕ {rolled ? 'Cancel' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Chest Card ────────────────────────────────────────────────────────────────

const ChestCard = ({ chest, onOpen, onDelete, onDuplicate, onEdit }) => {
  return (
    <div style={{
      background: surfaces.insetDeep,
      border: chest.isOpened ? '2px solid rgba(75,85,99,0.4)' : `2px solid rgba(201,169,97,0.35)`,
      borderLeft: chest.isOpened ? '4px solid #374151' : `4px solid ${colors.gold}`,
      borderRadius: '8px', padding: '0.85rem', marginBottom: '0.6rem',
      opacity: chest.isOpened ? 0.6 : 1,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{chest.isOpened ? '📭' : '📦'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ color: chest.isOpened ? colors.textFaint : colors.gold, fontWeight: '900', fontSize: '0.9rem' }}>
              {chest.name}
            </span>
            {chest.isOpened && (
              <span style={{
                padding: '0.1rem 0.4rem', background: 'rgba(75,85,99,0.2)',
                border: '1px solid #374151', borderRadius: '4px',
                color: colors.textMuted, fontSize: '0.6rem', fontWeight: '800',
              }}>OPENED</span>
            )}
          </div>
          {chest.description && (
            <div style={{ color: colors.textMuted, fontSize: '0.72rem', fontStyle: 'italic', marginBottom: '0.3rem' }}>
              {chest.description}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem' }}>
            {chest.requiredKeyName && (
              <span style={{
                padding: '0.1rem 0.45rem', background: 'rgba(201,169,97,0.08)',
                border: '1px solid rgba(201,169,97,0.3)', borderRadius: '4px',
                color: colors.textMuted, fontSize: '0.62rem', fontWeight: '700',
              }}>🔑 {chest.requiredKeyName}</span>
            )}
            {!chest.requiredKeyName && (
              <span style={{
                padding: '0.1rem 0.45rem', background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)', borderRadius: '4px',
                color: '#4ade80', fontSize: '0.62rem', fontWeight: '700',
              }}>🔓 No key needed</span>
            )}
            <span style={{
              padding: '0.1rem 0.45rem', background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px',
              color: '#93c5fd', fontSize: '0.62rem', fontWeight: '700',
            }}>
              {chest.mode === 'preloaded'
                ? `📋 ${chest.preloadedItems.length} item${chest.preloadedItems.length !== 1 ? 's' : ''}`
                : `🎲 ${chest.itemCount} drop${chest.itemCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          {chest.isOpened && chest.openedBy && (
            <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.3rem' }}>
              Opened by {chest.openedBy} · {chest.droppedItems?.map(i => i.name).join(', ') || 'nothing'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
          {!chest.isOpened && (
            <button onClick={() => onOpen(chest)} style={{
              padding: '0.35rem 0.75rem',
              background: 'linear-gradient(135deg, rgba(146,64,14,0.3), rgba(120,53,15,0.2))',
              border: '2px solid rgba(234,179,8,0.5)',
              color: '#fde68a', borderRadius: '6px', cursor: 'pointer',
              fontFamily: fonts.body, fontWeight: '800', fontSize: '0.72rem',
            }}>🔓 Open</button>
          )}
          <button onClick={() => onEdit(chest)} title="Edit chest" style={{
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '4px', color: '#c4b5fd', fontSize: '0.65rem',
            fontWeight: '900', padding: '0.2rem 0.45rem', cursor: 'pointer',
          }}>✏️</button>
          <button onClick={() => onDuplicate(chest)} title="Duplicate chest" style={{
            background: 'rgba(14,116,144,0.2)', border: '1px solid rgba(6,182,212,0.35)',
            borderRadius: '4px', color: '#67e8f9', fontSize: '0.65rem',
            fontWeight: '900', padding: '0.2rem 0.45rem', cursor: 'pointer',
          }}>⧉</button>
          <button onClick={() => onDelete(chest.id)} style={{
            background: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d',
            borderRadius: '4px', color: '#fca5a5', fontSize: '0.65rem',
            fontWeight: '900', padding: '0.2rem 0.4rem', cursor: 'pointer',
          }}>✕</button>
        </div>
      </div>
    </div>
  );
};

// ── Main ChestPanel ───────────────────────────────────────────────────────────

const ChestPanel = ({ players, lootPool, chests, setChests, onGiveLoot, onConsumeKey }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [editingChest, setEditingChest] = useState(null);
  const [openingChest, setOpeningChest] = useState(null);

  const handleSave = (chest) => {
    if (editingChest) {
      // Editing existing chest — replace in place, preserve opened state
      setChests(prev => prev.map(c => c.id === chest.id ? { ...chest, isOpened: c.isOpened, openedBy: c.openedBy, droppedItems: c.droppedItems } : c));
      setEditingChest(null);
    } else {
      setChests(prev => [...prev, chest]);
    }
    setShowCreator(false);
  };

  const handleDelete = (chestId) => {
    setChests(prev => prev.filter(c => c.id !== chestId));
  };

  const handleDuplicate = (chest) => {
    const copy = {
      ...JSON.parse(JSON.stringify(chest)),
      id: `chest_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: `${chest.name} (Copy)`,
      isOpened: false,
      openedBy: null,
      droppedItems: [],
    };
    setChests(prev => [...prev, copy]);
  };

  const handleConfirmOpen = (chestId, playerId, droppedItems) => {
    const player = players.find(p => String(p.id) === String(playerId));
    // Mark chest as opened
    setChests(prev => prev.map(c => c.id !== chestId ? c : {
      ...c,
      isOpened: true,
      openedBy: player?.playerName || 'Unknown',
      droppedItems,
    }));
    // Give each dropped item to the player, passing the requiredKeyName so it gets consumed on confirm
    const chest = chests.find(c => c.id === chestId);
    const requiredKeyName = chest?.requiredKeyName?.trim() || null;
    droppedItems.forEach(item => onGiveLoot(item, playerId, requiredKeyName));
    // If no items dropped (empty chest), still need to consume the key
    if (droppedItems.length === 0 && requiredKeyName && player) {
      if (onConsumeKey) onConsumeKey(playerId, (player.inventory || []).filter(
        it => it.name.trim().toLowerCase() !== requiredKeyName.toLowerCase()
      ));
    }
    setOpeningChest(null);
  };

  const unopened = chests.filter(c => !c.isOpened);
  const opened = chests.filter(c => c.isOpened);

  return (
    <div style={{ width: '100%' }}>
      {/* Create button */}
      <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        <button onClick={() => setShowCreator(true)} style={{
          padding: '1rem 2.5rem',
          background: 'linear-gradient(135deg, #78350f, #92400e)',
          border: '2px solid #eab308', color: '#fde68a',
          borderRadius: '10px', cursor: 'pointer',
          fontFamily: fonts.body, fontWeight: '800', fontSize: '1rem',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(234,179,8,0.2)',
        }}>📦 CREATE CHEST</button>
      </div>

      {/* Creator form */}
      {showCreator && (
        <ChestCreator
          onSave={handleSave}
          onCancel={() => { setShowCreator(false); setEditingChest(null); }}
          lootPool={lootPool}
          initialChest={editingChest}
        />
      )}

      {/* Empty state */}
      {chests.length === 0 && !showCreator && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: colors.textFaint }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', color: colors.textMuted }}>
            No chests yet
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Click CREATE CHEST to add lockboxes to your map.
          </div>
        </div>
      )}

      {/* Unopened chests */}
      {unopened.length > 0 && (
        <>
          <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            🔒 Locked / Available ({unopened.length})
          </div>
          {unopened.map(chest => (
            <ChestCard key={chest.id} chest={chest}
              onOpen={setOpeningChest} onDelete={handleDelete} onDuplicate={handleDuplicate} onEdit={chest => { setEditingChest(chest); setShowCreator(true); }} />
          ))}
        </>
      )}

      {/* Opened chests */}
      {opened.length > 0 && (
        <>
          <div style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em',
            textTransform: 'uppercase', margin: '0.75rem 0 0.5rem' }}>
            📭 Opened ({opened.length})
          </div>
          {opened.map(chest => (
            <ChestCard key={chest.id} chest={chest}
              onOpen={setOpeningChest} onDelete={handleDelete} onDuplicate={handleDuplicate} onEdit={chest => { setEditingChest(chest); setShowCreator(true); }} />
          ))}
        </>
      )}

      {/* Open chest modal */}
      {openingChest && (
        <OpenChestModal
          chest={openingChest}
          players={players}
          lootPool={lootPool}
          onConfirm={handleConfirmOpen}
          onClose={() => setOpeningChest(null)}
        />
      )}
    </div>
  );
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = {
  color: colors.textMuted, fontSize: '0.72rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.35rem',
};

const inputStyle = {
  width: '100%', background: '#0a0503', color: colors.gold,
  padding: '0.6rem 0.75rem', borderRadius: '6px',
  border: borders.warm, fontFamily: fonts.body,
  fontSize: '0.875rem', boxSizing: 'border-box',
};

export default ChestPanel;