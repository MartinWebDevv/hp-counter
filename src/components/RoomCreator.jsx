import React, { useState } from 'react';

const gold = '#c9a961';
const dark = '#1a0f0a';
const darker = '#0f0805';

const TIER_COLORS = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)',  text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
};

const TIER_WEIGHTS_DEFAULT = { Common: 60, Rare: 30, Legendary: 10 };

const inputStyle = {
  background: '#120a06', border: '1px solid #5a4a3a', borderRadius: '6px',
  padding: '0.5rem 0.75rem', color: gold, fontFamily: 'inherit',
  fontSize: '0.9rem', width: '100%', outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  color: '#8b7355', fontSize: '0.75rem', fontWeight: '700',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.3rem',
};

const sectionStyle = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,97,0.2)',
  borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
};

const sectionTitle = {
  color: gold, fontSize: '0.85rem', fontWeight: '800',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem',
};

const Toggle = ({ value, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
    <div onClick={onChange} style={{
      width: '40px', height: '22px', borderRadius: '11px',
      background: value ? '#7c3aed' : '#374151',
      border: `2px solid ${value ? '#a78bfa' : '#4b5563'}`,
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: '2px', left: value ? '18px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: value ? '#e9d5ff' : '#9ca3af', transition: 'left 0.2s' }} />
    </div>
    <span style={{ color: '#9ca3af', fontSize: '0.82rem', fontWeight: '600' }}>{label}</span>
  </label>
);

/**
 * RoomCreator
 * Core room details only — betrayal, locked factions, and character presence
 * are managed from buttons on the RoomCard itself.
 */
const RoomCreator = ({ initialRoom, onSave, onClose, lootPool = [] }) => {
  const [room, setRoom] = useState({ ...initialRoom });

  const set = (field, value) => setRoom(prev => ({ ...prev, [field]: value }));

  // ── Loot: weighted mode ──────────────────────────────────────────────────
  const setWeight = (tier, value) => setRoom(prev => ({
    ...prev,
    lootTierWeights: { ...(prev.lootTierWeights || TIER_WEIGHTS_DEFAULT), [tier]: Math.max(0, parseInt(value) || 0) },
  }));

  const weights = room.lootTierWeights || TIER_WEIGHTS_DEFAULT;
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  // ── Loot: preloaded mode ─────────────────────────────────────────────────
  const togglePreload = (itemId) => {
    const prev = room.lootPreloadedItems || [];
    const has = prev.includes(itemId);
    set('lootPreloadedItems', has ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const availableLoot = lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key');

  const handleSave = () => {
    if (!room.name?.trim()) { alert('Room must have a name.'); return; }
    onSave(room);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: `linear-gradient(145deg,${dark},${darker})`, border: `3px solid ${gold}`, borderRadius: '14px', padding: '1.5rem', width: '95%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>

        <h2 style={{ color: gold, fontSize: '1.4rem', fontFamily: '"Cinzel",Georgia,serif', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>
          {initialRoom.name ? `✏️ Edit: ${initialRoom.name}` : '🚪 Create Room'}
        </h2>

        {/* ── Room Details ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>🚪 Room Details</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Room Name</label>
            <input style={inputStyle} value={room.name} onChange={e => set('name', e.target.value)} placeholder='e.g. The Blood Toll' autoFocus />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '64px', lineHeight: 1.4 }} value={room.description} onChange={e => set('description', e.target.value)} placeholder='What players encounter in this room...' />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Min Units Required</label>
              <input style={inputStyle} type='number' min='0' value={room.minUnits} onChange={e => set('minUnits', e.target.value)} placeholder='0 = any' />
            </div>
            <div>
              <label style={labelStyle}>Round Timer</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <Toggle value={room.timerEnabled} onChange={() => set('timerEnabled', !room.timerEnabled)} label='' />
                {room.timerEnabled && <input style={{ ...inputStyle, width: '80px', textAlign: 'center' }} type='number' min='1' value={room.timerRounds} onChange={e => set('timerRounds', e.target.value)} placeholder='3' />}
                {room.timerEnabled && <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>rounds</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Behaviour ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>⚙️ Behaviour</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <Toggle value={room.resetsOnEntry}     onChange={() => set('resetsOnEntry',     !room.resetsOnEntry)}     label='Resets on each new entry' />
            <Toggle value={room.permanentlySolved} onChange={() => set('permanentlySolved', !room.permanentlySolved)} label='Permanently solved once passed' />
            <Toggle value={room.hiddenCostEnabled} onChange={() => set('hiddenCostEnabled', !room.hiddenCostEnabled)} label='Has HP Cost' />
            <Toggle value={room.betrayalEnabled}   onChange={() => set('betrayalEnabled',   !room.betrayalEnabled)}   label='Enable betrayal tracking' />
          </div>
          {room.hiddenCostEnabled && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={labelStyle}>HP Cost Value</label>
              <input style={inputStyle} value={room.hiddenCostValue} onChange={e => set('hiddenCostValue', e.target.value)} placeholder='e.g. 2 HP per character inside' />
            </div>
          )}
        </div>

        {/* ── Loot Reward ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>🎁 Loot Reward</div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[{ value: 'none', label: '✕ None' }, { value: 'weighted', label: '🎲 Weighted Random' }, { value: 'preloaded', label: '📋 Set Items' }].map(opt => (
              <div key={opt.value} onClick={() => set('lootMode', opt.value)} style={{
                flex: 1, textAlign: 'center', padding: '0.45rem 0.25rem',
                background: (room.lootMode || 'none') === opt.value ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${(room.lootMode || 'none') === opt.value ? gold : 'rgba(90,74,58,0.3)'}`,
                borderRadius: '6px', cursor: 'pointer',
                color: (room.lootMode || 'none') === opt.value ? gold : '#4b5563',
                fontWeight: '800', fontSize: '0.72rem',
              }}>{opt.label}</div>
            ))}
          </div>

          {/* Weighted */}
          {room.lootMode === 'weighted' && (
            <>
              <div style={{ marginBottom: '0.65rem' }}>
                <label style={labelStyle}>Items to Drop</label>
                <input style={{ ...inputStyle, width: '80px' }} type='number' min='1' max='10'
                  value={room.lootItemCount || 1}
                  onChange={e => set('lootItemCount', Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <label style={labelStyle}>Tier Weights (total: {totalWeight}%)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {['Common', 'Rare', 'Legendary'].map(tier => {
                  const tc = TIER_COLORS[tier];
                  const pct = totalWeight > 0 ? Math.round(((weights[tier] || 0) / totalWeight) * 100) : 0;
                  return (
                    <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: tc.text, fontWeight: '800', fontSize: '0.78rem', width: '72px' }}>{tier}</span>
                      <input type='number' min='0' max='100' value={weights[tier] || 0} onChange={e => setWeight(tier, e.target.value)} style={{ ...inputStyle, width: '64px', padding: '0.35rem 0.5rem', textAlign: 'center' }} />
                      <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: tc.text, borderRadius: '3px', transition: 'width 0.2s' }} />
                      </div>
                      <span style={{ color: '#4b5563', fontSize: '0.68rem', fontWeight: '700', width: '30px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
              {availableLoot.length === 0 && <div style={{ color: '#ef4444', fontSize: '0.68rem', marginTop: '0.4rem' }}>⚠️ No items in loot pool — add items in the Loot tab first.</div>}
            </>
          )}

          {/* Preloaded */}
          {room.lootMode === 'preloaded' && (
            availableLoot.length === 0 ? (
              <div style={{ color: '#ef4444', fontSize: '0.72rem' }}>⚠️ No items in loot pool yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '200px', overflowY: 'auto' }}>
                {availableLoot.map(item => {
                  const tc = TIER_COLORS[item.tier] || TIER_COLORS.Common;
                  const sel = (room.lootPreloadedItems || []).includes(item.id);
                  return (
                    <div key={item.id} onClick={() => togglePreload(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: sel ? tc.bg : 'rgba(0,0,0,0.3)', border: `2px solid ${sel ? tc.border : 'rgba(90,74,58,0.3)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, border: `2px solid ${sel ? tc.text : '#4b5563'}`, background: sel ? tc.text : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900' }}>{sel && '✓'}</div>
                      <span style={{ color: sel ? tc.text : '#6b7280', fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>📦 {item.name}</span>
                      <span style={{ color: '#4b5563', fontSize: '0.65rem' }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ── DM Notes ── */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>DM Notes (private)</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '52px', lineHeight: 1.4, fontSize: '0.82rem', color: '#8b7355' }} value={room.notes} onChange={e => set('notes', e.target.value)} placeholder='Private reminders, contingencies...' />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button onClick={handleSave} style={{ padding: '0.9rem', background: 'linear-gradient(135deg,#059669,#047857)', border: '2px solid #10b981', color: '#d1fae5', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '1rem' }}>✓ Save Room</button>
          <button onClick={onClose} style={{ padding: '0.9rem', background: 'linear-gradient(135deg,#b91c1c,#991b1b)', border: '2px solid #dc2626', color: '#fecaca', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '800', fontSize: '1rem' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default RoomCreator;