import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors, inputStyle as themeInput } from '../theme';
import { unitIsFull, getHeldCount } from './lootUtils';



const getAllUnits = (player) => {
  const units = [
    {
      unitType: 'commander',
      label: player.commanderStats?.customName || player.commander || 'Commander',
      hp: player.commanderStats?.hp || 0,
      maxHp: player.commanderStats?.maxHp || 1,
      isDead: (player.commanderStats?.hp || 0) === 0,
    },
  ];
  (player.subUnits || []).forEach((u, idx) => {
    units.push({
      unitType: idx === 0 ? 'special' : `soldier${idx}`,
      label: u.name?.trim() || (idx === 0 ? 'Special' : `Soldier ${idx}`),
      hp: u.hp,
      maxHp: u.maxHp,
      isDead: u.hp === 0,
    });
  });
  return units;
};

/**
 * HandOffModal
 * Allows any unit to give or trade an item with any other unit.
 *
 * Props:
 *   sourcePlayer    — player who owns the item being handed off
 *   sourceUnitType  — unit type holding the item
 *   item            — the item being handed off
 *   players         — all players
 *   onConfirm(targetPlayerId, targetUnitType, mode, targetDroppedItem)
 *   onClose
 */
const HandOffModal = ({ sourcePlayer, sourceUnitType, item, players, onConfirm, onClose }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState('');
  const [mode, setMode] = useState(null); // 'give' | 'trade'
  const [tradeItem, setTradeItem] = useState(null); // item from target to trade back

  const targetPlayer = players.find(p => p.id === selectedPlayerId);

  // Get items held by target unit (for trade selection)
  const targetUnitItems = targetPlayer && selectedUnitType
    ? (targetPlayer.inventory || []).filter(it => it.heldBy === selectedUnitType && !it.isQuestItem)
    : [];

  const targetIsFull = targetPlayer && selectedUnitType
    ? unitIsFull(targetPlayer, selectedUnitType)
    : false;

  const canTrade = targetUnitItems.length > 0;
  const canConfirm = selectedPlayerId && selectedUnitType && mode &&
    (mode === 'give' || (mode === 'trade' && tradeItem));

  const handleSelectUnit = (unitType) => {
    setSelectedUnitType(unitType);
    setMode(null);
    setTradeItem(null);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(selectedPlayerId, selectedUnitType, mode, tradeItem);
  };

  const labelStyle = { color: colors.textMuted, fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, #1a0f0a, #0f0805)', border: `3px solid ${colors.gold}`, borderRadius: '12px', padding: '1.5rem', width: '460px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🤝</div>
          <div style={{ color: colors.gold, fontWeight: '900', fontSize: '1rem', fontFamily: fonts.display }}>HAND OFF ITEM</div>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.2rem' }}>
            Giving: <span style={{ color: '#fbbf24', fontWeight: '800' }}>{item.name}</span>
            {' '}from <span style={{ color: colors.textSecondary }}>{sourcePlayer.playerName}</span>
          </div>
        </div>

        {/* Target player picker */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Receiving Player</label>
          <select
            value={selectedPlayerId}
            onChange={e => { setSelectedPlayerId(e.target.value); setSelectedUnitType(''); setMode(null); setTradeItem(null); }}
            style={{ width: '100%', background: '#0a0503', color: colors.gold, padding: '0.6rem 0.75rem', borderRadius: '6px', border: borders.warm, fontFamily: fonts.body, fontSize: '0.875rem' }}
          >
            <option value=''>Select player...</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.playerName}{p.id === sourcePlayer.id ? ' (self)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Target unit picker */}
        {targetPlayer && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Receiving Unit</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {getAllUnits(targetPlayer).map(u => {
                const isFull = !item.isQuestItem && unitIsFull(targetPlayer, u.unitType);
                const selected = selectedUnitType === u.unitType;
                const isSelf = targetPlayer.id === sourcePlayer.id && u.unitType === sourceUnitType;
                return (
                  <div key={u.unitType} onClick={() => !u.isDead && !isSelf && handleSelectUnit(u.unitType)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.55rem 0.85rem',
                    background: selected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.35)',
                    border: `2px solid ${selected ? colors.gold : isFull ? 'rgba(249,115,22,0.3)' : 'rgba(90,74,58,0.3)'}`,
                    borderRadius: '7px', cursor: (u.isDead || isSelf) ? 'not-allowed' : 'pointer',
                    opacity: (u.isDead || isSelf) ? 0.4 : 1,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: selected ? colors.gold : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem' }}>{u.label}</span>
                      {isSelf && <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '700', marginLeft: '0.4rem' }}>SOURCE</span>}
                    </div>
                    <div style={{ width: '50px', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${u.maxHp > 0 ? (u.hp / u.maxHp) * 100 : 0}%`, height: '100%', background: u.isDead ? colors.textDisabled : '#22c55e' }} />
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.62rem', minWidth: '32px' }}>{u.hp}/{u.maxHp}</span>
                    {isFull && !selected && <span style={{ color: '#f97316', fontSize: '0.58rem', fontWeight: '800' }}>FULL</span>}
                    {u.isDead && <span style={{ color: colors.textMuted, fontSize: '0.58rem', fontWeight: '800' }}>DEAD</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode picker — Give or Trade */}
        {selectedUnitType && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Transfer Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={() => { setMode('give'); setTradeItem(null); }} style={{
                padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
                background: mode === 'give' ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(0,0,0,0.35)',
                border: `2px solid ${mode === 'give' ? '#10b981' : 'rgba(90,74,58,0.3)'}`,
                color: mode === 'give' ? '#d1fae5' : colors.textSecondary,
              }}>🎁 Give</button>
              <button
                onClick={() => canTrade && setMode('trade')}
                disabled={!canTrade}
                title={!canTrade ? 'Target unit holds no items to trade' : ''}
                style={{
                  padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.82rem',
                  cursor: canTrade ? 'pointer' : 'not-allowed',
                  background: mode === 'trade' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(0,0,0,0.35)',
                  border: `2px solid ${mode === 'trade' ? '#a78bfa' : 'rgba(90,74,58,0.3)'}`,
                  color: mode === 'trade' ? '#e9d5ff' : canTrade ? colors.textSecondary : colors.textDisabled,
                  opacity: canTrade ? 1 : 0.4,
                }}>⇄ Trade</button>
            </div>
          </div>
        )}

        {/* Trade item picker */}
        {mode === 'trade' && targetUnitItems.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>They give in return</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {targetUnitItems.map(it => (
                <div key={it.id} onClick={() => setTradeItem(it)} style={{
                  padding: '0.55rem 0.85rem', borderRadius: '7px', cursor: 'pointer',
                  background: tradeItem?.id === it.id ? 'rgba(167,139,250,0.12)' : 'rgba(0,0,0,0.35)',
                  border: `2px solid ${tradeItem?.id === it.id ? '#a78bfa' : 'rgba(90,74,58,0.3)'}`,
                }}>
                  <span style={{ color: tradeItem?.id === it.id ? '#e9d5ff' : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem' }}>{it.name}</span>
                  <span style={{ color: colors.textMuted, fontSize: '0.65rem', marginLeft: '0.5rem' }}>{it.tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Give swap warning */}
        {mode === 'give' && targetIsFull && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ color: '#f97316', fontSize: '0.68rem', fontWeight: '900', marginBottom: '0.2rem' }}>⚠️ Unit is full</div>
            <div style={{ color: colors.textSecondary, fontSize: '0.68rem' }}>
              The receiving unit will need to drop their current item to accept this one. Consider using Trade instead.
            </div>
          </div>
        )}

        {/* Confirm / Cancel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button disabled={!canConfirm} onClick={handleConfirm} style={{
            flex: 1, padding: '0.75rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem', cursor: canConfirm ? 'pointer' : 'not-allowed',
            background: canConfirm ? 'linear-gradient(135deg, #059669, #047857)' : surfaces.elevated,
            border: `2px solid ${canConfirm ? '#10b981' : colors.textDisabled}`,
            color: canConfirm ? '#d1fae5' : '#4a3322',
          }}>✓ Confirm</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default HandOffModal;