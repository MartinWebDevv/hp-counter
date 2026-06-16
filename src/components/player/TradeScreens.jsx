import React from 'react';
import { colors, surfaces, fonts, btn, tierColors, text } from '../../theme';
import { writePendingRequest, resolvePendingChoice } from '../../services/gameStateService';
import { getSlotCount, getHeldCount } from '../lootUtils';

const PassChoiceScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedPlayerId, setSelectedPlayerId] = React.useState('');
  const [mode,             setMode]             = React.useState(null); // 'give' | 'trade'
  const [sending,          setSending]          = React.useState(false);

  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;
  const item = freshMe ? (freshMe.inventory || []).find(it => it.id === choice.itemId) || null : null;

  const targetPlayer = allPlayers.find(p => String(p.id) === String(selectedPlayerId));
  const canConfirm   = !!(selectedPlayerId && mode);

  const tierColors2 = {
    Common:    { text: '#d1d5db', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' },
    Rare:      { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
    Legendary: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.35)'  },
  };
  const tc = item ? (tierColors2[item.tier] || tierColors2.Common) : tierColors2.Common;

  const handleSubmit = async () => {
    if (!canConfirm || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:               'itemChoice',
        reqId,
        choiceId:           choice.choiceId,
        playerId:           myPlayer?.id,
        playerName:         myPlayer?.playerName,
        itemId:             choice.itemId || item?.id,
        itemName:           choice.itemName || item?.name,
        itemEffect:         'passChoice',
        passTargetPlayerId: selectedPlayerId,
        passMode:           mode,
        timestamp:          Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🤝</div>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>Pass Item</div>
          <div style={{ color: colors.textFaint, fontSize: '0.7rem', marginTop: '0.25rem' }}>
            Passing: <span style={{ color: tc.text, fontWeight: '800' }}>{item?.name || choice.itemName}</span>
          </div>
        </div>

        {/* Player picker */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Who receives this item?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {allPlayers.filter(p => !p.isAbsent).map(p => {
              const isMe     = String(p.id) === String(myPlayer?.id);
              const selected = String(p.id) === String(selectedPlayerId);
              const pColor   = p.playerColor || colors.blue;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPlayerId(String(p.id)); setMode(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 0.85rem',
                    background: selected ? `${pColor}18` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selected ? pColor + '60' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: selected ? pColor : colors.textPrimary, fontWeight: '700', fontSize: '0.88rem' }}>
                    {p.playerName}{isMe ? ' (you)' : ''}
                  </span>
                  {selected && <span style={{ color: pColor, fontSize: '0.65rem', fontWeight: '800' }}>▸</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Give / Trade — shown once a player is selected */}
        {selectedPlayerId && (
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>How?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => setMode('give')}
                style={{
                  padding: '0.75rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                  background: mode === 'give' ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(0,0,0,0.35)',
                  border: `2px solid ${mode === 'give' ? '#10b981' : 'rgba(90,74,58,0.3)'}`,
                  color: mode === 'give' ? '#d1fae5' : colors.textSecondary,
                }}>🎁 Give</button>
              <button
                onClick={() => setMode('trade')}
                style={{
                  padding: '0.75rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                  background: mode === 'trade' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(0,0,0,0.35)',
                  border: `2px solid ${mode === 'trade' ? '#a78bfa' : 'rgba(90,74,58,0.3)'}`,
                  color: mode === 'trade' ? '#e9d5ff' : colors.textSecondary,
                }}>⇄ Trade</button>
            </div>
            {mode === 'give' && (
              <div style={{ color: '#86efac', fontSize: '0.68rem', marginTop: '0.5rem', padding: '0.5rem 0.65rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px' }}>
                🎁 <strong style={{ color: colors.gold }}>{targetPlayer?.playerName}</strong> will receive the item and choose which character to place it on.
              </div>
            )}
            {mode === 'trade' && (
              <div style={{ color: colors.amber, fontSize: '0.68rem', marginTop: '0.5rem', padding: '0.5rem 0.65rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px' }}>
                ⇄ <strong style={{ color: colors.gold }}>{targetPlayer?.playerName}</strong> will see your item and pick one of theirs to offer back.
              </div>
            )}
          </div>
        )}

        {/* Confirm / Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button onClick={onSubmit} style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>✕ Cancel</button>
          <button onClick={handleSubmit} disabled={!canConfirm || sending} style={{ padding: '0.85rem', background: canConfirm ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canConfirm ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canConfirm ? '#86efac' : colors.textDisabled, cursor: canConfirm && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>
            {sending ? '⏳ Sending...' : '✓ Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Trade & Gift screens — shown to the right player via pendingChoices routing
// ─────────────────────────────────────────────────────────────────────────────

// Shown to the TRADE TARGET: "Player X wants to trade Y — pick what you offer back or deny"
const TradeRequestScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedItemId, setSelectedItemId] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;
  const myItems = (freshMe?.inventory || []);

  const tc = { Common: { text: '#d1d5db', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' }, Rare: { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' }, Legendary: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)' }, Quest: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)' } };

  const respond = async (action, offeredItemId = null) => {
    if (sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const offeredItem = myItems.find(it => it.id === offeredItemId);
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice', reqId,
        choiceId:            choice.choiceId,
        playerId:            myPlayer?.id,
        playerName:          myPlayer?.playerName,
        itemId:              choice.offeredItemId,
        itemName:            choice.offeredItemName,
        itemEffect:          'passChoice',
        passMode:            'trade',
        passTargetPlayerId:  choice.initiatorPlayerId,
        passTargetPlayerUid: choice.initiatorPlayerUid,
        passTradeItemId:     offeredItemId || null,
        passTradeItemName:   offeredItem?.name || null,
        passTradeItemTier:   offeredItem?.tier || null,
        passTradeItemDesc:   offeredItem?.description || null,
        tradeAction:         action,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(167,139,250,0.5)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⇄</div>
          <div style={{ color: '#a78bfa', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>Trade Request</div>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.3rem' }}>
            <strong style={{ color: colors.gold }}>{choice.initiatorPlayerName}</strong> wants to trade with you
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.1rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>They're offering</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem' }}>{choice.offeredItemIsQuest ? '🗝️' : '📦'}</span>
            <span style={{ color: colors.gold, fontWeight: '800', fontSize: '0.92rem', flex: 1 }}>{choice.offeredItemName}</span>
            <span style={{ color: colors.textFaint, fontSize: '0.65rem', fontWeight: '700' }}>{choice.offeredItemTier}</span>
          </div>
          {choice.offeredItemDescription && <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.25rem', paddingLeft: '1.5rem' }}>{choice.offeredItemDescription}</div>}
        </div>

        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Pick what you offer in return</div>
          {myItems.length === 0 ? (
            <div style={{ color: colors.textFaint, fontSize: '0.78rem', textAlign: 'center', padding: '1rem 0' }}>You have no items</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {myItems.map(it => {
                const c = it.isQuestItem ? tc.Quest : (tc[it.tier] || tc.Common);
                const sel = selectedItemId === it.id;
                const unitLabel = it.heldBy === 'commander' ? (freshMe?.commanderStats?.customName || freshMe?.commander || 'Commander')
                  : it.heldBy === 'special' ? (freshMe?.subUnits?.[0]?.name?.trim() || 'Special')
                  : (() => { const idx = parseInt((it.heldBy||'').replace('soldier','')); return freshMe?.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`; })();
                return (
                  <div key={it.id} onClick={() => setSelectedItemId(sel ? null : it.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', background: sel ? c.bg : 'rgba(0,0,0,0.3)', border: `1px solid ${sel ? c.border : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{it.isQuestItem ? '🗝️' : '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: sel ? c.text : colors.textPrimary, fontWeight: '700', fontSize: '0.82rem' }}>{it.name}</div>
                      <div style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{it.isQuestItem ? 'Quest' : it.tier} · {unitLabel}</div>
                    </div>
                    {sel && <span style={{ color: '#4ade80', fontSize: '0.75rem', flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={() => selectedItemId && respond('offer', selectedItemId)} disabled={!selectedItemId || sending}
            style={{ padding: '0.85rem', borderRadius: '10px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem', cursor: selectedItemId && !sending ? 'pointer' : 'not-allowed', background: selectedItemId ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(109,40,217,0.3))' : 'rgba(0,0,0,0.2)', border: `1px solid ${selectedItemId ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.06)'}`, color: selectedItemId ? '#e9d5ff' : colors.textDisabled }}
          >{sending ? '⏳ Sending...' : '⇄ Offer This Item'}</button>
          <button onClick={() => respond('deny')} disabled={sending}
            style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
          >✕ Deny Trade</button>
        </div>
      </div>
    </div>
  );
};

// Shown to INITIATOR: their item vs what target offered — Accept or Deny
const TradeReviewScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [sending, setSending] = React.useState(false);
  const tc = { Common: { text: '#d1d5db', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' }, Rare: { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' }, Legendary: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)' } };
  const c = tc[choice.counterItemTier] || tc.Common;

  const respond = async (action) => {
    if (sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice', reqId,
        choiceId:            choice.choiceId,
        playerId:            myPlayer?.id,
        playerName:          myPlayer?.playerName,
        itemId:              choice.myItemId,
        itemName:            choice.myItemName,
        itemEffect:          'passChoice',
        passMode:            'trade',
        passTargetPlayerId:  choice.targetPlayerId2,
        passTargetPlayerUid: choice.targetPlayerUid2,  // player2's uid (targetPlayerUid is player1's routing uid)
        passTradeItemId:     choice.counterItemId || null,
        tradeAction:         action,
        timestamp: Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(251,191,36,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⇄</div>
          <div style={{ color: colors.amber, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>Trade Offer</div>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.3rem' }}>
            <strong style={{ color: colors.purpleLight }}>{choice.targetPlayerName}</strong> is offering to trade
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>You give</div>
            <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>📦</div>
            <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.8rem' }}>{choice.myItemName}</div>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{choice.myItemTier}</div>
          </div>
          <div style={{ color: colors.textFaint, fontSize: '1.2rem', textAlign: 'center' }}>⇄</div>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ color: colors.textFaint, fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>You receive</div>
            <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>📦</div>
            <div style={{ color: c.text, fontWeight: '800', fontSize: '0.8rem' }}>{choice.counterItemName}</div>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{choice.counterItemTier}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={() => respond('accept')} disabled={sending}
            style={{ padding: '0.85rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', color: '#86efac', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
          >{sending ? '⏳...' : '✓ Accept Trade'}</button>
          <button onClick={() => respond('cancel')} disabled={sending}
            style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}
          >✕ Deny Trade</button>
        </div>
      </div>
    </div>
  );
};

const GiftNoticeScreen = ({ choice, lobbyCode, myPlayer, allPlayers, onSubmit }) => {
  const [selectedUnitKey, setSelectedUnitKey] = React.useState('');
  const [swapItemId, setSwapItemId] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const freshMe = allPlayers.find(p => String(p.id) === String(myPlayer?.id)) || myPlayer;

  const getAllUnits = (p) => {
    if (!p) return [];
    const us = [{ key: 'commander', label: p.commanderStats?.customName || p.commander || 'Commander', hp: p.commanderStats?.hp || 0, maxHp: p.commanderStats?.maxHp || 1 }];
    (p.subUnits || []).forEach((u, i) => us.push({ key: i === 0 ? 'special' : `soldier${i}`, label: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp }));
    return us;
  };
  const getSlots = (p, unitKey) => {
    const fromItems = (p?.inventory || []).filter(it => it.heldBy === unitKey && it.effect?.type === 'extraSlot').length;
    let fromUnit = 0;
    if (unitKey === 'commander') { fromUnit = p?.commanderStats?.bonusSlots || 0; }
    else { const idx = unitKey === 'special' ? 0 : parseInt((unitKey || '').replace('soldier', '')); fromUnit = p?.subUnits?.[idx]?.bonusSlots || 0; }
    return 1 + fromItems + fromUnit;
  };
  const getHeld = (p, unitKey) => (p?.inventory || []).filter(it => it.heldBy === unitKey && !it.isQuestItem && it.effect?.type !== 'key').length;
  const unitIsFull = (p, unitKey) => getHeld(p, unitKey) >= getSlots(p, unitKey);

  const units = getAllUnits(freshMe);
  const selectedUnitFull = selectedUnitKey ? unitIsFull(freshMe, selectedUnitKey) : false;
  const heldBySelected = selectedUnitKey ? (freshMe?.inventory || []).filter(it => it.heldBy === selectedUnitKey && !it.isQuestItem && it.effect?.type !== 'key') : [];
  const canConfirm = !!(selectedUnitKey && (!selectedUnitFull || swapItemId));

  const tc = { Common: { text: '#d1d5db', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' }, Rare: { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' }, Legendary: { text: '#fde68a', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)' } };
  const itemTc = tc[choice.offeredItemTier] || tc.Common;

  const handleConfirm = async () => {
    if (!canConfirm || sending) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type: 'itemChoice', reqId,
        choiceId:           choice.choiceId,
        playerId:           myPlayer?.id,
        playerName:         myPlayer?.playerName,
        itemId:             choice.offeredItemId,
        itemName:           choice.offeredItemName,
        itemEffect:         'passChoice',
        passMode:           'give',
        passTargetPlayerId: myPlayer?.id,
        passTargetUnitType: selectedUnitKey,
        swapItemId:         swapItemId || null,
        tradeAction:        'giftPlaced',
        timestamp:          Date.now(),
      });
      onSubmit();
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(34,197,94,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🎁</div>
          <div style={{ color: '#86efac', fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>Item Received!</div>
          <div style={{ color: colors.textMuted, fontSize: '0.72rem', marginTop: '0.3rem' }}>
            <strong style={{ color: colors.gold }}>{choice.initiatorPlayerName}</strong> gave you an item
          </div>
        </div>

        {/* The item */}
        <div style={{ background: itemTc.bg, border: `1px solid ${itemTc.border}`, borderRadius: '10px', padding: '0.85rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📦</span>
          <div>
            <div style={{ color: itemTc.text, fontWeight: '800', fontSize: '0.92rem' }}>{choice.offeredItemName}</div>
            {choice.offeredItemDescription && <div style={{ color: colors.textFaint, fontSize: '0.65rem', marginTop: '0.15rem' }}>{choice.offeredItemDescription}</div>}
            <div style={{ color: itemTc.text, fontSize: '0.62rem', fontWeight: '700', marginTop: '0.1rem' }}>{choice.offeredItemTier}</div>
          </div>
        </div>

        {/* Unit picker */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Assign to which unit?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {units.map(u => {
              const full = unitIsFull(freshMe, u.key);
              const sel = selectedUnitKey === u.key;
              const dead = u.hp === 0;
              return (
                <div key={u.key} onClick={() => !dead && (setSelectedUnitKey(u.key), setSwapItemId(null))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', borderRadius: '8px', cursor: dead ? 'not-allowed' : 'pointer', background: sel ? 'rgba(201,169,97,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${sel ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.07)'}`, opacity: dead ? 0.35 : 1 }}>
                  <span style={{ flex: 1, color: sel ? colors.gold : colors.textPrimary, fontWeight: '700', fontSize: '0.82rem' }}>{u.label}</span>
                  {full && <span style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800' }}>FULL</span>}
                  {!full && !dead && <span style={{ color: '#4ade80', fontSize: '0.6rem', fontWeight: '800' }}>OPEN</span>}
                  {dead && <span style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800' }}>DEAD</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Swap picker if unit is full */}
        {selectedUnitKey && selectedUnitFull && heldBySelected.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#f97316', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>⚠️ Unit full — drop one to make room</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {heldBySelected.map(it => {
                const c = tc[it.tier] || tc.Common;
                const sel = swapItemId === it.id;
                return (
                  <div key={it.id} onClick={() => setSwapItemId(sel ? null : it.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', borderRadius: '7px', cursor: 'pointer', background: sel ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${sel ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>📦</span>
                    <span style={{ flex: 1, color: sel ? '#fca5a5' : colors.textPrimary, fontWeight: '700', fontSize: '0.8rem' }}>{it.name}</span>
                    <span style={{ color: c.text, fontSize: '0.62rem', fontWeight: '800', flexShrink: 0 }}>{it.tier}</span>
                    {sel && <span style={{ color: '#f87171', fontSize: '0.7rem', flexShrink: 0 }}>🗑 Drop</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={handleConfirm} disabled={!canConfirm || sending} style={{ width: '100%', padding: '0.85rem', background: canConfirm ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canConfirm ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canConfirm ? '#86efac' : colors.textDisabled, cursor: canConfirm && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.88rem' }}>
          {sending ? '⏳ Placing...' : '✓ Place Item'}
        </button>
      </div>
    </div>
  );
};

// Shown to both players as a result notification (denied, cancelled, etc.)
const TradeResultScreen = ({ choice, onSubmit }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4200, padding: '1rem' }}>
    <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.95)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{choice.resultIcon || '❌'}</div>
      <div style={{ color: colors.textPrimary, fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{choice.resultTitle || 'Trade ended'}</div>
      <div style={{ color: colors.textMuted, fontSize: '0.78rem', marginBottom: '1.25rem' }}>{choice.resultMessage || ''}</div>
      <button onClick={onSubmit} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem' }}>
        OK
      </button>
    </div>
  </div>
);


export { PassChoiceScreen, TradeRequestScreen, TradeReviewScreen, GiftNoticeScreen, TradeResultScreen };
