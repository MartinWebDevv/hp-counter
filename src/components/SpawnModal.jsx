import React from 'react';
import { colors, surfaces, fonts, btn } from '../theme';

const SpawnModal = ({ attack, parentName, presets, hasPresets, onSpawn, onClose }) => {

  const items = hasPresets ? presets : [{ name: attack.name || 'Spawn', hp: 10, armor: 0, attackBonus: 0 }];
  const [quantities, setQuantities] = React.useState(items.map(() => 0));

  const setQty = (i, val) => {
    const v = Math.max(0, parseInt(val) || 0);
    setQuantities(prev => { const n = [...prev]; n[i] = v; return n; });
  };

  const totalSpawning = quantities.reduce((s, v) => s + v, 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: '3px solid #10b981', borderRadius: '12px', padding: '1.5rem', width: '420px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🐣</div>
          <div style={{ color: '#d1fae5', fontWeight: '900', fontSize: '1.05rem', fontFamily: '"Cinzel",Georgia,serif' }}>{attack.name || 'Spawn Attack'}</div>
          {attack.description && <div style={{ color: colors.textMuted, fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.2rem' }}>{attack.description}</div>}
          {attack.spawnDieType && <div style={{ color: '#86efac', fontSize: '0.75rem', marginTop: '0.25rem' }}>💡 Roll {attack.spawnDieType.toUpperCase()} × {attack.spawnNumRolls || 1} to determine quantity</div>}
        </div>

        <div style={{ color: colors.textMuted, fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>How many of each?</div>

        {items.map((preset, pi) => (
          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#86efac', fontWeight: '800', fontSize: '0.9rem' }}>{preset.name || `Type ${pi+1}`}</div>
              <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.15rem' }}>HP: {preset.hp || 10} · Armor: {preset.armor || 0} · Atk: +{preset.attackBonus || 0}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setQty(pi, (quantities[pi] || 0) - 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input
                type='number' min='0' max='20'
                value={quantities[pi]}
                onChange={e => setQty(pi, e.target.value)}
                style={{ width: '48px', background: '#1a0f0a', color: '#d1fae5', border: '2px solid rgba(74,222,128,0.4)', borderRadius: '6px', padding: '0.35rem', fontSize: '1.1rem', fontWeight: '900', textAlign: 'center', fontFamily: '"Cinzel",Georgia,serif' }}
              />
              <button onClick={() => setQty(pi, (quantities[pi] || 0) + 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        ))}

        {totalSpawning > 0 && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', marginBottom: '1rem', marginTop: '0.25rem' }}>
            <div style={{ color: colors.textMuted, fontSize: '0.7rem' }}>
              Naming: <span style={{ color: '#86efac' }}>{parentName ? `${parentName}'s ` : ''}{items[0]?.name || 'NPC'} 1, 2, 3...</span>
            </div>
            <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.15rem' }}>All spawned NPCs will be immediately activated.</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onSpawn(quantities)}
            disabled={totalSpawning === 0}
            style={{ flex: 1, padding: '0.75rem', background: totalSpawning > 0 ? 'linear-gradient(135deg,#065f46,#047857)' : '#1a0f0a', border: `2px solid ${totalSpawning > 0 ? '#10b981' : colors.textDisabled}`, color: totalSpawning > 0 ? '#d1fae5' : colors.textDisabled, borderRadius: '8px', cursor: totalSpawning > 0 ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}>
            🐣 Spawn {totalSpawning > 0 ? `(${totalSpawning})` : ''}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid #374151', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '700', fontSize: '0.85rem', color: colors.textMuted }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpawnModal;
