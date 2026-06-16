import React from 'react';
import { colors, surfaces, fonts, btn, hpBarColor, text } from '../../theme';
import { writePendingRequest, resolvePendingChoice } from '../../services/gameStateService';

const GuyTargetPickScreen = ({ choice, lobbyCode, myPlayer, allPlayers, npcs, onSubmit }) => {
  const [step, setStep] = React.useState('type'); // 'type' | 'npc' | 'player'
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedTarget, setSelectedTarget] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const dice = choice.dice || '1d10';
  const numRolls = choice.numRolls || 1;
  const dieType = choice.dieType || 'd10';

  const enemyPlayers = (allPlayers || []).filter(p =>
    p.id !== myPlayer?.id && !p.isAbsent && !p.commanderStats?.isDead && (p.commanderStats?.hp ?? 0) > 0
  );

  const submit = async () => {
    if (!selectedTarget || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice', reqId,
        choiceId: choice.choiceId,
        playerId: myPlayer?.id,
        playerName: myPlayer?.playerName,
        itemEffect: 'guyAttack',
        targetType: selectedTarget.type,
        targetNpcId: selectedTarget.npcId || null,
        targetPlayerId: selectedTarget.playerId || null,
        targetUnitKey: selectedTarget.unitKey || null,
        targetUnitLabel: selectedTarget.unitLabel || null,
        targetName: selectedTarget.name || null,
        guyNumRolls: numRolls,
        guyDieType: dieType,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  const orangeBorder = 'rgba(249,115,22,0.5)';
  const containerStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' };
  const boxStyle = { background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: `2px solid ${orangeBorder}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎯</div>
          <div style={{ color: '#fb923c', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>The Guy — Pick a Target</div>
          <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>{dice} unblockable damage</div>
        </div>

        {/* Step 1 — choose type */}
        {step === 'type' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <button onClick={() => setStep('npc')} disabled={npcs.length === 0} style={{
              padding: '1.1rem 0.5rem', borderRadius: '10px', cursor: npcs.length > 0 ? 'pointer' : 'not-allowed',
              background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)',
              color: npcs.length > 0 ? '#fca5a5' : colors.textDisabled,
              fontFamily: fonts.body, fontWeight: '900', fontSize: '0.9rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>👾</div>
              NPC
              {npcs.length === 0 && <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>None active</div>}
            </button>
            <button onClick={() => setStep('player')} disabled={enemyPlayers.length === 0} style={{
              padding: '1.1rem 0.5rem', borderRadius: '10px', cursor: enemyPlayers.length > 0 ? 'pointer' : 'not-allowed',
              background: 'rgba(139,92,246,0.1)', border: '2px solid rgba(139,92,246,0.4)',
              color: enemyPlayers.length > 0 ? '#c4b5fd' : colors.textDisabled,
              fontFamily: fonts.body, fontWeight: '900', fontSize: '0.9rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>⚔️</div>
              Player
              {enemyPlayers.length === 0 && <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>None available</div>}
            </button>
          </div>
        )}

        {/* Step 2a — NPC list */}
        {step === 'npc' && (
          <>
            <button onClick={() => { setStep('type'); setSelectedTarget(null); }} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.75rem', padding: 0 }}>← Back</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
              {npcs.map(npc => {
                const isSelected = selectedTarget?.npcId === npc.id;
                return (
                  <div key={npc.id} onClick={() => setSelectedTarget({ type: 'npc', npcId: npc.id, name: npc.name })} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                    background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.3)',
                    border: `2px solid ${isSelected ? '#f97316' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    <span style={{ color: isSelected ? '#fdba74' : '#fca5a5', fontWeight: '800', fontSize: '0.85rem' }}>👾 {npc.name}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{npc.hp}/{npc.maxHp}hp · 🛡️{npc.armor}+</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2b — Player list with expandable units */}
        {step === 'player' && (
          <>
            <button onClick={() => { setStep('type'); setSelectedTarget(null); setExpandedPlayerId(null); }} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.75rem', padding: 0 }}>← Back</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {enemyPlayers.map(p => {
                const isExpanded = expandedPlayerId === p.id;
                const units = [
                  { key: 'commander', label: p.commanderStats?.customName || p.commander || 'Commander', hp: p.commanderStats?.hp, maxHp: p.commanderStats?.maxHp },
                  ...(p.subUnits || []).filter(u => u.hp > 0).map((u, i) => ({
                    key: i === 0 ? 'special' : `soldier${i}`,
                    label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`),
                    hp: u.hp, maxHp: u.maxHp,
                  })),
                ];
                return (
                  <div key={p.id}>
                    {/* Player name row — click to expand */}
                    <div onClick={() => setExpandedPlayerId(isExpanded ? null : p.id)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.55rem 0.75rem', borderRadius: isExpanded ? '8px 8px 0 0' : '8px', cursor: 'pointer',
                      background: isExpanded ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${isExpanded ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)'}`,
                      borderBottom: isExpanded ? '1px solid rgba(139,92,246,0.2)' : undefined,
                    }}>
                      <span style={{ color: p.playerColor || '#c4b5fd', fontWeight: '900', fontSize: '0.85rem' }}>{p.playerName}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▲' : '▼'} {units.length} unit{units.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Unit list — shown when expanded */}
                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.25)', border: '2px solid rgba(139,92,246,0.2)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.4rem' }}>
                        {units.map(u => {
                          const isSelected = selectedTarget?.playerId === p.id && selectedTarget?.unitKey === u.key;
                          return (
                            <div key={u.key} onClick={() => setSelectedTarget({ type: 'player', playerId: p.id, unitKey: u.key, unitLabel: u.label, name: `${p.playerName} — ${u.label}` })} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.2rem',
                              background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.2)',
                              border: `2px solid ${isSelected ? '#f97316' : 'rgba(139,92,246,0.15)'}`,
                            }}>
                              <span style={{ color: isSelected ? '#fdba74' : colors.textSecondary, fontWeight: '700', fontSize: '0.8rem' }}>{u.label}</span>
                              <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{u.hp}/{u.maxHp}hp</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Selected target summary */}
        {selectedTarget && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
            <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '800' }}>TARGET: </span>
            <span style={{ color: '#fdba74', fontWeight: '800', fontSize: '0.8rem' }}>{selectedTarget.name}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button onClick={onSubmit} style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
          <button onClick={submit} disabled={!selectedTarget || sending} style={{ padding: '0.85rem', background: selectedTarget ? 'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(180,60,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${selectedTarget ? 'rgba(249,115,22,0.5)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: selectedTarget ? '#fdba74' : colors.textDisabled, cursor: selectedTarget ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>🎯 Confirm Target</button>
        </div>
      </div>
    </div>
  );
};

// ── Guy Item Pick Screen ──────────────────────────────────────────────────────
// Shown to the player after The Guy (Legendary) roll 1.
// Player picks any Common or Rare item from the loot pool.
const GuyItemPickScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [selectedUnitKey, setSelectedUnitKey] = React.useState('');
  const [swapItemId, setSwapItemId] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const lootPool = choice.lootPool || [];
  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;

  const allUnits = freshMe ? [
    { key: 'commander', label: freshMe.commanderStats?.customName || freshMe.commander || 'Commander' },
    ...(freshMe.subUnits || []).map((u, i) => ({
      key: i === 0 ? 'special' : `soldier${i}`,
      label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`),
    })),
  ] : [];

  const unitIsFull = (unitKey) => {
    if (!freshMe || !selectedItem) return false;
    const held = (freshMe.inventory || []).filter(it => it.heldBy === unitKey && !it.isQuestItem).length;
    const slots = 1 + ((freshMe.commanderStats?.bonusSlots || 0));
    const unit = unitKey === 'commander' ? null : (freshMe.subUnits || [])[unitKey === 'special' ? 0 : parseInt(unitKey.replace('soldier',''))];
    const unitSlots = unitKey === 'commander' ? slots : 1 + (unit?.bonusSlots || 0);
    return held >= unitSlots;
  };

  const selectedUnitFull = selectedUnitKey ? unitIsFull(selectedUnitKey) : false;
  const heldItems = selectedUnitFull
    ? (freshMe?.inventory || []).filter(it => it.heldBy === selectedUnitKey && !it.isQuestItem)
    : [];
  const canConfirm = !!selectedItem && !!selectedUnitKey && (!selectedUnitFull || !!swapItemId);

  const submit = async () => {
    if (!canConfirm || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice',
        reqId,
        choiceId: choice.choiceId,
        playerId: myPlayer?.id,
        playerName: myPlayer?.playerName,
        itemEffect: 'theGuyLegendary1',
        targetType: 'self',
        targetUnitKey: selectedUnitKey,
        targetUnitLabel: allUnits.find(u => u.key === selectedUnitKey)?.label || selectedUnitKey,
        guyPickedItem: selectedItem,
        swapItemId: swapItemId || null,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(251,191,36,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎲</div>
          <div style={{ color: '#fbbf24', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1.05rem', letterSpacing: '0.08em' }}>The Guy — Legendary</div>
          <div style={{ color: colors.textFaint, fontSize: '0.68rem', marginTop: '0.25rem' }}>Choose any Common or Rare item</div>
        </div>

        {/* Item list */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Available Items</div>
          {lootPool.length === 0 && <div style={{ color: colors.textFaint, fontSize: '0.72rem' }}>No Common or Rare items in the loot pool.</div>}
          {lootPool.map(it => {
            const tc = tierColors[it.tier] || tierColors.Common;
            const isSelected = selectedItem?.id === it.id;
            return (
              <div key={it.id} onClick={() => { setSelectedItem(it); setSelectedUnitKey(''); setSwapItemId(null); }} style={{
                padding: '0.5rem 0.7rem', borderRadius: '7px', cursor: 'pointer', marginBottom: '0.3rem',
                background: isSelected ? 'rgba(251,191,36,0.1)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${isSelected ? 'rgba(251,191,36,0.5)' : tc.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: tc.text, fontWeight: '800', fontSize: '0.82rem' }}>{it.name}</span>
                  <span style={{ color: tc.text, fontSize: '0.6rem', fontWeight: '700', opacity: 0.8 }}>{it.tier}</span>
                </div>
                {it.description && <div style={{ color: colors.textFaint, fontSize: '0.62rem', marginTop: '0.2rem', lineHeight: '1.3' }}>{it.description}</div>}
              </div>
            );
          })}
        </div>

        {/* Unit picker */}
        {selectedItem && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Assign to Unit</div>
            {allUnits.map(u => {
              const full = unitIsFull(u.key);
              const isSelected = selectedUnitKey === u.key;
              return (
                <div key={u.key} onClick={() => { setSelectedUnitKey(u.key); setSwapItemId(null); }} style={{
                  padding: '0.4rem 0.7rem', borderRadius: '7px', cursor: 'pointer', marginBottom: '0.3rem',
                  background: isSelected ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${isSelected ? 'rgba(34,197,94,0.4)' : full ? 'rgba(249,115,22,0.3)' : 'rgba(90,74,58,0.3)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isSelected ? '#86efac' : colors.textSecondary, fontWeight: '800', fontSize: '0.8rem' }}>{u.label}</span>
                    {full && <span style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800' }}>{isSelected ? '↕ SWAP' : 'FULL'}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Swap picker */}
        {selectedUnitFull && heldItems.length > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '8px', padding: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ color: '#f97316', fontSize: '0.65rem', fontWeight: '900', marginBottom: '0.4rem' }}>↕ Unit is full — choose item to drop:</div>
            {heldItems.map(it => (
              <div key={it.id} onClick={() => setSwapItemId(it.id)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.25rem',
                background: swapItemId === it.id ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,0.3)',
                border: `2px solid ${swapItemId === it.id ? '#f97316' : 'rgba(249,115,22,0.2)'}`,
              }}>
                <span style={{ color: swapItemId === it.id ? '#fdba74' : colors.amber, fontWeight: '800', fontSize: '0.78rem' }}>{it.name}</span>
                {swapItemId === it.id && <span style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800' }}>✓ DROP</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button onClick={onSubmit} style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: colors.textFaint, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
          <button onClick={submit} disabled={!canConfirm || sending} style={{ padding: '0.85rem', background: canConfirm ? 'linear-gradient(135deg,rgba(251,191,36,0.2),rgba(180,130,0,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canConfirm ? 'rgba(251,191,36,0.4)' : 'rgba(90,74,58,0.3)'}`, borderRadius: '10px', color: canConfirm ? '#fbbf24' : colors.textDisabled, cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✦ Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ── Pass Choice Screen ────────────────────────────────────────────────────────
// Shown to the item owner after the GM approves their pass request.
// Step 1: pick who to pass to. Step 2: pick Give or Trade.
// The recipient handles unit placement on their screen.

export { GuyTargetPickScreen, GuyItemPickScreen };
