import React, { useState } from 'react';
import { colors, surfaces, borders, fonts, btn, tierColors, inputStyle as themeInput } from '../theme';



const TIER_COLORS = {
  Common:    { border: 'rgba(156,163,175,0.5)', text: colors.textSecondary, bg: 'rgba(156,163,175,0.08)' },
  Rare:      { border: 'rgba(139,92,246,0.5)',  text: '#a78bfa', bg: 'rgba(139,92,246,0.08)'  },
  Legendary: { border: 'rgba(245,158,11,0.5)',  text: '#fbbf24', bg: 'rgba(245,158,11,0.08)'  },
};

const STATUS_CONFIG = {
  Idle:   { color: colors.textMuted, bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)', dot: colors.textFaint,  label: '⬜ Idle'    },
  Active: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.5)',   dot: '#eab308',  label: '⚡ Active'  },
  Passed: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.5)',   dot: '#22c55e',  label: '✓ Passed'  },
  Failed: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.5)',  dot: '#ef4444',  label: '✗ Failed'  },
  Locked: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.5)',  dot: '#a855f7',  label: '🔒 Locked' },
};

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 };
const modal = { background: 'linear-gradient(145deg,#1a0f0a,#0f0805)', border: `3px solid ${colors.gold}`, borderRadius: '12px', padding: '1.5rem', width: '95%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' };
const modalTitle = { color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', textAlign: 'center', marginBottom: '1rem', letterSpacing: '0.08em' };

// ── Activate Modal ────────────────────────────────────────────────────────────
const ActivateModal = ({ room, players, onConfirm, onClose }) => {
  const [selected, setSelected] = useState(room.charactersPresent || []);
  const min = parseInt(room.minUnits) || 0;

  const unitLabel = (player, unitType) => {
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  };

  const allUnits = players.flatMap(p => [
    { playerId: p.id, playerName: p.playerName, playerColor: p.playerColor, unitType: 'commander', label: unitLabel(p, 'commander') },
    ...(p.subUnits || []).map((u, i) => ({
      playerId: p.id, playerName: p.playerName, playerColor: p.playerColor,
      unitType: i === 0 ? 'special' : `soldier${i}`, label: unitLabel(p, i === 0 ? 'special' : `soldier${i}`),
    })),
  ]);

  const isSelected = (playerId, unitType) => selected.some(s => s.playerId === playerId && s.unitType === unitType);

  const toggle = (playerId, unitType) => {
    const key = `${playerId}-${unitType}`;
    if (isSelected(playerId, unitType)) {
      setSelected(prev => prev.filter(s => !(s.playerId === playerId && s.unitType === unitType)));
    } else {
      setSelected(prev => [...prev, { playerId, unitType }]);
    }
  };

  const meetsMin = selected.length >= min;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modal}>
        <div style={modalTitle}>⚡ Activate Room</div>
        <div style={{ color: colors.textMuted, fontSize: '0.72rem', textAlign: 'center', marginBottom: '1rem' }}>
          {room.name} — select who's entering
        </div>

        {/* Min units warning */}
        {min > 0 && (
          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '7px', marginBottom: '0.75rem', background: meetsMin ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${meetsMin ? 'rgba(74,222,128,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
            <span style={{ color: meetsMin ? '#4ade80' : '#f87171', fontWeight: '800', fontSize: '0.75rem' }}>
              {meetsMin ? `✓ ${selected.length} of ${min} minimum met` : `⚠️ Need at least ${min} unit${min !== 1 ? 's' : ''} to enter this room (${selected.length} selected)`}
            </span>
          </div>
        )}

        {/* Unit picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem' }}>
          {allUnits.map(u => {
            const sel = isSelected(u.playerId, u.unitType);
            const isLockedOut = (room.lockedOutUnits || []).some(l => l.playerId === u.playerId && l.unitType === u.unitType);
            return (
              <div key={`${u.playerId}-${u.unitType}`} onClick={() => !isLockedOut && toggle(u.playerId, u.unitType)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: isLockedOut ? 'not-allowed' : 'pointer', opacity: isLockedOut ? 0.4 : 1, background: sel ? 'rgba(251,191,36,0.1)' : surfaces.inset, border: `1px solid ${sel ? 'rgba(251,191,36,0.45)' : isLockedOut ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${sel ? '#fbbf24' : colors.textFaint}`, background: sel ? '#fbbf24' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900', flexShrink: 0 }}>{sel && '✓'}</div>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.playerColor || colors.gold, flexShrink: 0 }} />
                <span style={{ color: sel ? '#fbbf24' : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{u.playerName} · {u.label}</span>
                {isLockedOut && <span style={{ color: '#c084fc', fontSize: '0.62rem', fontWeight: '800' }}>🔒 Locked Out</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button disabled={!meetsMin} onClick={() => meetsMin && onConfirm(selected)} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: meetsMin ? 'pointer' : 'not-allowed', background: meetsMin ? 'linear-gradient(135deg,#059669,#047857)' : '#0a0503', border: `2px solid ${meetsMin ? '#10b981' : colors.textDisabled}`, color: meetsMin ? '#d1fae5' : colors.textDisabled }}>⚡ Activate</button>
          <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Betrayal Modal ────────────────────────────────────────────────────────────
const BetrayalModal = ({ room, players, onConfirm, onClose }) => {
  const [betrayers, setBetray] = useState(room.betrayers || []);

  const unitLabel = (player, unitType) => {
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  };

  const presentSet = new Set(presentSnapshot.map(c => `${c.playerId}-${c.unitType}`));

  const allUnits = players.flatMap(p => [
    { playerId: p.id, playerName: p.playerName, playerColor: p.playerColor, unitType: 'commander', label: unitLabel(p, 'commander') },
    ...(p.subUnits || []).map((u, i) => ({
      playerId: p.id, playerName: p.playerName, playerColor: p.playerColor,
      unitType: i === 0 ? 'special' : `soldier${i}`, label: unitLabel(p, i === 0 ? 'special' : `soldier${i}`),
    })),
  ]).filter(u => presentSet.has(`${u.playerId}-${u.unitType}`));

  const isBetray = (playerId, unitType) => betrayers.some(b => b.playerId === playerId && b.unitType === unitType);

  const toggle = (playerId, unitType, playerName, label) => {
    if (isBetray(playerId, unitType)) {
      setBetray(prev => prev.filter(b => !(b.playerId === playerId && b.unitType === unitType)));
    } else {
      setBetray(prev => [...prev, { playerId, unitType, playerName, label }]);
    }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modal}>
        <div style={modalTitle}>🐍 Who's the Betrayer?</div>

        {/* Current betrayers */}
        {betrayers.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Already Betrayed</div>
            {betrayers.map(b => (
              <div key={`${b.playerId}-${b.unitType}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🐍</span>
                <span style={{ color: '#fca5a5', fontWeight: '800', fontSize: '0.78rem', flex: 1 }}>{b.playerName}'s {b.label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Select Betrayer(s)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
          {allUnits.map(u => {
            const sel = isBetray(u.playerId, u.unitType);
            return (
              <div key={`${u.playerId}-${u.unitType}`} onClick={() => toggle(u.playerId, u.unitType, u.playerName, u.label)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.7rem', borderRadius: '7px', cursor: 'pointer', background: sel ? 'rgba(239,68,68,0.1)' : surfaces.inset, border: `1px solid ${sel ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${sel ? '#ef4444' : colors.textFaint}`, background: sel ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#fff', fontWeight: '900', flexShrink: 0 }}>{sel && '🐍'}</div>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.playerColor || colors.gold, flexShrink: 0 }} />
                <span style={{ color: sel ? '#fca5a5' : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{u.playerName} · {u.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={() => onConfirm(betrayers)} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'linear-gradient(135deg,#059669,#047857)', border: '2px solid #10b981', color: '#d1fae5' }}>✓ Confirm</button>
          <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Locked Out Modal ──────────────────────────────────────────────────────────
const LockedOutModal = ({ room, players, onConfirm, onClose }) => {
  const [locked, setLocked] = useState(room.lockedOutUnits || []);

  const unitLabel = (player, unitType) => {
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  };

  const allUnits = players.flatMap(p => [
    { playerId: p.id, playerName: p.playerName, playerColor: p.playerColor, unitType: 'commander', label: unitLabel(p, 'commander') },
    ...(p.subUnits || []).map((u, i) => ({
      playerId: p.id, playerName: p.playerName, playerColor: p.playerColor,
      unitType: i === 0 ? 'special' : `soldier${i}`, label: unitLabel(p, i === 0 ? 'special' : `soldier${i}`),
    })),
  ]);

  const isLocked = (playerId, unitType) => locked.some(l => l.playerId === playerId && l.unitType === unitType);

  const toggle = (playerId, unitType, playerName, label) => {
    if (isLocked(playerId, unitType)) {
      setLocked(prev => prev.filter(l => !(l.playerId === playerId && l.unitType === unitType)));
    } else {
      setLocked(prev => [...prev, { playerId, unitType, playerName, label }]);
    }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modal}>
        <div style={modalTitle}>🔒 Locked Out</div>

        {/* Currently locked */}
        {locked.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: '#c084fc', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Currently Locked Out</div>
            {locked.map(l => (
              <div key={`${l.playerId}-${l.unitType}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '6px', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🔒</span>
                <span style={{ color: '#c084fc', fontWeight: '800', fontSize: '0.78rem', flex: 1 }}>{l.playerName}'s {l.label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ color: colors.textMuted, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Toggle Lock Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
          {allUnits.map(u => {
            const sel = isLocked(u.playerId, u.unitType);
            return (
              <div key={`${u.playerId}-${u.unitType}`} onClick={() => toggle(u.playerId, u.unitType, u.playerName, u.label)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.7rem', borderRadius: '7px', cursor: 'pointer', background: sel ? 'rgba(192,132,252,0.1)' : surfaces.inset, border: `1px solid ${sel ? 'rgba(192,132,252,0.45)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${sel ? '#a855f7' : colors.textFaint}`, background: sel ? '#a855f7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>{sel && '🔒'}</div>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.playerColor || colors.gold, flexShrink: 0 }} />
                <span style={{ color: sel ? '#c084fc' : colors.textSecondary, fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{u.playerName} · {u.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={() => onConfirm(locked)} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'linear-gradient(135deg,#059669,#047857)', border: '2px solid #10b981', color: '#d1fae5' }}>✓ Confirm</button>
          <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Loot Roll Modal ───────────────────────────────────────────────────────────
const LootRollModal = ({ room, lootPool, onClose }) => {
  const [rolled, setRolled] = useState(null);

  const availableLoot = lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key');

  const rollLoot = () => {
    const mode = room.lootMode || 'none';
    if (mode === 'none') return;

    let dropped = [];

    if (mode === 'preloaded') {
      dropped = (room.lootPreloadedItems || [])
        .map(id => availableLoot.find(i => i.id === id))
        .filter(Boolean);
    } else if (mode === 'weighted') {
      const weights = room.lootTierWeights || { Common: 60, Rare: 30, Legendary: 10 };
      const tiers = ['Common', 'Rare', 'Legendary'];
      const total = tiers.reduce((s, t) => s + (weights[t] || 0), 0);
      const count = room.lootItemCount || 1;
      if (total === 0) { setRolled([]); return; }

      for (let i = 0; i < count; i++) {
        let rand = Math.random() * total;
        let chosenTier = 'Common';
        for (const tier of tiers) { rand -= (weights[tier] || 0); if (rand <= 0) { chosenTier = tier; break; } }
        const pool = availableLoot.filter(it => it.tier === chosenTier);
        if (pool.length > 0) dropped.push(pool[Math.floor(Math.random() * pool.length)]);
        else if (availableLoot.length > 0) dropped.push(availableLoot[Math.floor(Math.random() * availableLoot.length)]);
      }
    }
    setRolled(dropped);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modal, maxWidth: '400px' }}>
        <div style={modalTitle}>🎲 Room Loot</div>

        {!rolled ? (
          <button onClick={rollLoot} style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg,#92400e,#78350f)', border: '2px solid #eab308', color: '#fde68a', borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '1rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            🎲 Roll Loot
          </button>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: colors.gold, fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>✨ Loot Dropped</div>
            {rolled.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.85rem', padding: '1rem' }}>No items dropped.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {rolled.map((item, i) => {
                  const tc = TIER_COLORS[item.tier] || TIER_COLORS.Common;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: tc.bg, border: `2px solid ${tc.border}`, borderRadius: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>📦</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: tc.text, fontWeight: '900', fontSize: '0.88rem' }}>{item.name}</div>
                        {item.description && <div style={{ color: colors.textMuted, fontSize: '0.68rem' }}>{item.description}</div>}
                      </div>
                      <span style={{ padding: '0.1rem 0.4rem', background: `${tc.text}18`, border: `1px solid ${tc.border}`, borderRadius: '4px', color: tc.text, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>{item.tier}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setRolled(null)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.45rem', background: surfaces.inset, border: '1px solid rgba(90,74,58,0.3)', borderRadius: '6px', color: colors.textMuted, fontFamily: fonts.body, fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer' }}>🔄 Reroll</button>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '0.6rem', background: 'rgba(127,29,29,0.2)', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>✕ Close</button>
      </div>
    </div>
  );
};


// ── LootDisburseModal ─────────────────────────────────────────────────────────
const LootDisburseModal = ({ items, players, presentSnapshot = [], onGiveLoot, onClose }) => {
  const [assignments, setAssignments] = useState(() => items.map(() => null));

  const unitLabel = (player, unitType) => {
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  };

  const presentSet = new Set(presentSnapshot.map(c => `${c.playerId}-${c.unitType}`));

  const allUnits = players.flatMap(p => [
    { playerId: p.id, playerName: p.playerName, playerColor: p.playerColor, unitType: 'commander', label: unitLabel(p, 'commander') },
    ...(p.subUnits || []).map((u, i) => ({
      playerId: p.id, playerName: p.playerName, playerColor: p.playerColor,
      unitType: i === 0 ? 'special' : `soldier${i}`, label: unitLabel(p, i === 0 ? 'special' : `soldier${i}`),
    })),
  ]).filter(u => presentSet.has(`${u.playerId}-${u.unitType}`));

  const allAssigned = assignments.every(a => a !== null);

  const handleConfirm = () => {
    assignments.forEach((assignment, i) => {
      if (assignment && items[i]) {
        onGiveLoot(items[i], assignment.playerId, assignment.unitType);
      }
    });
    onClose();
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modal, maxWidth: '460px' }}>
        <div style={modalTitle}>🎁 Distribute Room Loot</div>
        <div style={{ color: colors.textMuted, fontSize: '0.72rem', textAlign: 'center', marginBottom: '1rem' }}>
          Assign each item to a unit
        </div>

        {items.map((item, i) => {
          const tc = TIER_COLORS[item?.tier] || TIER_COLORS.Common;
          const assigned = assignments[i];
          return (
            <div key={i} style={{ marginBottom: '0.75rem' }}>
              {/* Item header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: assigned ? 'rgba(74,222,128,0.08)' : tc.bg, border: `2px solid ${assigned ? 'rgba(74,222,128,0.4)' : tc.border}`, borderRadius: '8px 8px 0 0', marginBottom: '0' }}>
                <span style={{ fontSize: '1rem' }}>📦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: assigned ? '#86efac' : tc.text, fontWeight: '900', fontSize: '0.85rem' }}>{item?.name || 'Item'}</div>
                  {item?.description && <div style={{ color: colors.textMuted, fontSize: '0.65rem' }}>{item.description}</div>}
                </div>
                <span style={{ color: tc.text, fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.35rem', background: `${tc.text}18`, border: `1px solid ${tc.border}`, borderRadius: '4px' }}>{item?.tier}</span>
                {assigned && <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: '800' }}>✓ {assigned.playerName} · {assigned.label}</span>}
              </div>

              {/* Unit picker */}
              {!assigned && (
                <div style={{ background: surfaces.insetDeep, border: `2px solid ${colors.gold}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {allUnits.map(u => (
                    <div key={`${u.playerId}-${u.unitType}`} onClick={() => setAssignments(prev => { const next = [...prev]; next[i] = u; return next; })} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '5px', cursor: 'pointer', marginBottom: '0.15rem', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,169,97,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.playerColor || colors.gold, flexShrink: 0 }} />
                      <span style={{ color: colors.textSecondary, fontSize: '0.78rem', fontWeight: '700', flex: 1 }}>{u.playerName} · {u.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button disabled={!allAssigned} onClick={allAssigned ? handleConfirm : undefined} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: allAssigned ? 'pointer' : 'not-allowed', background: allAssigned ? 'linear-gradient(135deg,#059669,#047857)' : '#0a0503', border: `2px solid ${allAssigned ? '#10b981' : colors.textDisabled}`, color: allAssigned ? '#d1fae5' : colors.textDisabled }}>✓ Give Loot</button>
          <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5' }}>✕ Skip</button>
        </div>
      </div>
    </div>
  );
};

// ── UnlockModal ───────────────────────────────────────────────────────────────
const UnlockModal = ({ room, onConfirm, onClose }) => {
  const [toUnlock, setToUnlock] = useState([]);
  const locked = room.lockedOutUnits || [];

  const toggle = (playerId, unitType) => {
    const key = `${playerId}-${unitType}`;
    setToUnlock(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleConfirm = () => {
    const remaining = locked.filter(l => !toUnlock.includes(`${l.playerId}-${l.unitType}`));
    onConfirm(remaining);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={{ ...modal, maxWidth: '380px' }}>
        <div style={modalTitle}>🔓 Unlock Units</div>
        {locked.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.textFaint, fontSize: '0.85rem', padding: '1rem' }}>No one is locked out.</div>
        ) : (
          <>
            <div style={{ color: colors.textMuted, fontSize: '0.72rem', textAlign: 'center', marginBottom: '0.75rem' }}>Select units to unlock</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
              {locked.map(l => {
                const key = `${l.playerId}-${l.unitType}`;
                const sel = toUnlock.includes(key);
                return (
                  <div key={key} onClick={() => toggle(l.playerId, l.unitType)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer', background: sel ? 'rgba(74,222,128,0.1)' : surfaces.inset, border: `1px solid ${sel ? 'rgba(74,222,128,0.45)' : 'rgba(192,132,252,0.35)'}` }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${sel ? '#4ade80' : '#a855f7'}`, background: sel ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000', fontWeight: '900', flexShrink: 0 }}>{sel && '✓'}</div>
                    <span style={{ fontSize: '0.85rem' }}>{sel ? '🔓' : '🔒'}</span>
                    <span style={{ color: sel ? '#4ade80' : '#c084fc', fontWeight: '800', fontSize: '0.82rem', flex: 1 }}>{l.playerName}'s {l.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button disabled={toUnlock.length === 0} onClick={toUnlock.length > 0 ? handleConfirm : undefined} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: toUnlock.length > 0 ? 'pointer' : 'not-allowed', background: toUnlock.length > 0 ? 'linear-gradient(135deg,#059669,#047857)' : '#0a0503', border: `2px solid ${toUnlock.length > 0 ? '#10b981' : colors.textDisabled}`, color: toUnlock.length > 0 ? '#d1fae5' : colors.textDisabled }}>🔓 Unlock</button>
          <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '8px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(127,29,29,0.3)', border: '2px solid #7f1d1d', color: '#fca5a5' }}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── RoomCard ──────────────────────────────────────────────────────────────────
const RoomCard = ({
  room, players = [], lootPool = [],
  onEdit, onDelete, onArchive, onSetStatus, onPass, onFail, onUpdate, onGiveLoot,
}) => {
  const [showActivate,      setShowActivate]      = useState(false);
  const [showBetrayal,      setShowBetrayal]      = useState(false);
  const [lootRollResult,    setLootRollResult]    = useState(null); // items rolled on pass
  const [showLootDisburse,  setShowLootDisburse]  = useState(false);
  const [presentSnapshot,   setPresentSnapshot]   = useState([]); // characters present at time of pass

  const sc = STATUS_CONFIG[room.status] || STATUS_CONFIG.Idle;

  const unitLabel = (player, unitType) => {
    if (unitType === 'commander') return player.commanderStats?.customName || player.commander || 'Commander';
    if (unitType === 'special') return player.subUnits?.[0]?.name?.trim() || 'Special';
    const idx = parseInt(unitType.replace('soldier', ''));
    return player.subUnits?.[idx]?.name?.trim() || `Soldier ${idx}`;
  };

  const handleActivate = (characters) => {
    onUpdate({ status: 'Active', charactersPresent: characters });
    setShowActivate(false);
  };

  // Reset room state — preserves lockedOutUnits and HP cost value/toggle
  const resetRoom = (extraChanges = {}) => {
    onUpdate({
      charactersPresent: [],
      betrayers: [],
      hiddenCostRevealed: false, // reveal state resets, value persists
      ...extraChanges,
    });
  };

  // Roll loot from room settings
  const rollRoomLoot = () => {
    const mode = room.lootMode || 'none';
    if (mode === 'none') return [];
    const available = lootPool.filter(i => !i.isQuestItem && i.effect?.type !== 'key');
    if (available.length === 0) return [];

    if (mode === 'preloaded') {
      return (room.lootPreloadedItems || []).map(id => available.find(i => i.id === id)).filter(Boolean);
    }

    const weights = room.lootTierWeights || { Common: 60, Rare: 30, Legendary: 10 };
    const tiers = ['Common', 'Rare', 'Legendary'];
    const total = tiers.reduce((s, t) => s + (weights[t] || 0), 0);
    if (total === 0) return [];
    const count = room.lootItemCount || 1;
    const dropped = [];
    for (let i = 0; i < count; i++) {
      let rand = Math.random() * total;
      let tier = 'Common';
      for (const t of tiers) { rand -= (weights[t] || 0); if (rand <= 0) { tier = t; break; } }
      const pool = available.filter(it => it.tier === tier);
      const src  = pool.length > 0 ? pool : available;
      dropped.push(src[Math.floor(Math.random() * src.length)]);
    }
    return dropped;
  };

  // Handle Pass button
  const handlePass = () => {
    const hasLoot = room.lootMode && room.lootMode !== 'none' && lootPool.length > 0;
    if (hasLoot) {
      const rolled = rollRoomLoot();
      setLootRollResult(rolled);
      setPresentSnapshot(room.charactersPresent || []);
      setShowLootDisburse(true);
    }
    // Reset if resetsOnEntry OR permanentlySolved
    if (room.resetsOnEntry || room.permanentlySolved) {
      resetRoom({ status: 'Passed' });
    } else {
      onUpdate({ status: 'Passed', charactersPresent: [] });
    }
  };

  // Handle Fail button
  const handleFail = () => {
    if (room.resetsOnEntry || room.permanentlySolved) {
      resetRoom({ status: 'Failed' });
    } else {
      onUpdate({ status: 'Failed' });
    }
  };

  // Handle Locked Out — lock everyone currently present, reset room
  const handleLockedOut = () => {
    const currentlyPresent = room.charactersPresent || [];
    const existingLocked = room.lockedOutUnits || [];
    const newLocked = [...existingLocked];
    currentlyPresent.forEach(ch => {
      if (!newLocked.some(l => l.playerId === ch.playerId && l.unitType === ch.unitType)) {
        const p = players.find(pl => pl.id === ch.playerId);
        if (p) newLocked.push({ playerId: ch.playerId, unitType: ch.unitType, playerName: p.playerName, label: unitLabel(p, ch.unitType) });
      }
    });
    resetRoom({ lockedOutUnits: newLocked, status: 'Locked' });
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(17,24,39,0.95),rgba(31,41,55,0.85))', borderRadius: '12px', padding: '1rem', fontFamily: '"Rajdhani","Cinzel",sans-serif', boxShadow: room.status === 'Active' ? '0 0 24px rgba(251,191,36,0.2),0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05)', border: `2px solid ${sc.border}`, opacity: room.archived ? 0.5 : 1, transition: 'all 0.3s' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(201,169,97,0.2)' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, background: sc.dot, boxShadow: room.status === 'Active' ? `0 0 8px ${sc.dot}` : 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: colors.gold, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name || 'Unnamed Room'}</div>
          <div style={{ color: colors.textMuted, fontSize: '0.7rem', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
            {sc.label}
            {room.minUnits ? ` • Min ${room.minUnits}` : ''}
            {room.permanentlySolved ? ' • 🔓 Solved' : ''}
            {room.timerEnabled && room.timerRounds ? ` • ⏱ ${room.timerRounds}r` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={onEdit}    style={{ padding: '0.25rem 0.55rem', background: 'rgba(201,169,97,0.1)',  border: '1px solid rgba(201,169,97,0.35)', borderRadius: '5px', color: colors.gold,     cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem' }}>✏️</button>
          <button onClick={onArchive} style={{ padding: '0.25rem 0.55rem', background: 'rgba(0,0,0,0.25)',      border: '1px solid rgba(90,74,58,0.3)',   borderRadius: '5px', color: colors.textMuted, cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem' }}>📁</button>
          <button onClick={onDelete}  style={{ padding: '0.25rem 0.55rem', background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(127,29,29,0.4)',  borderRadius: '5px', color: '#fca5a5',cursor: 'pointer', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.68rem' }}>🗑</button>
        </div>
      </div>

      {/* ── Description ── */}
      {room.description && (
        <div style={{ color: colors.textMuted, fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', borderLeft: `3px solid ${sc.border}` }}>{room.description}</div>
      )}

      {/* ── Hidden cost ── */}
      {/* DM Notes */}
      {room.notes && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.65rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(90,74,58,0.25)', borderRadius: '6px', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem' }}>&#128221;</span>
          <span style={{ color: colors.textMuted, fontSize: '0.7rem', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.notes}</span>
        </div>
      )}

      {room.hiddenCostEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', marginBottom: '0.65rem' }}>
          <span style={{ color: '#f87171', fontSize: '0.72rem', fontWeight: '800', flex: 1 }}>💰 {room.hiddenCostRevealed ? (room.hiddenCostValue || 'No value set') : '??? HP Cost'}</span>
          {!room.hiddenCostRevealed && <button onClick={() => onUpdate({ hiddenCostRevealed: true })} style={{ padding: '0.18rem 0.55rem', borderRadius: '5px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.62rem', cursor: 'pointer', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>Reveal HP Cost</button>}
        </div>
      )}

      {/* ── Characters present ── */}
      {(room.charactersPresent || []).length > 0 && (
        <div style={{ marginBottom: '0.65rem' }}>
          <div style={{ color: colors.textMuted, fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Inside Room</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {room.charactersPresent.map(ch => {
              const p = players.find(pl => pl.id === ch.playerId);
              if (!p) return null;
              return <div key={`${ch.playerId}-${ch.unitType}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', background: 'rgba(0,0,0,0.35)', border: `1px solid ${p.playerColor || colors.gold}35`, borderRadius: '20px' }}><div style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.playerColor || colors.gold }} /><span style={{ color: colors.textSecondary, fontSize: '0.62rem', fontWeight: '700' }}>{p.playerName} · {unitLabel(p, ch.unitType)}</span></div>;
            })}
          </div>
        </div>
      )}

      {/* ── Betrayers ── */}
      {(room.betrayers || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.65rem' }}>
          {room.betrayers.map(b => <span key={`${b.playerId}-${b.unitType}`} style={{ padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '20px', color: '#fca5a5', fontSize: '0.62rem', fontWeight: '800' }}>🐍 {b.playerName}'s {b.label}</span>)}
        </div>
      )}

      {/* ── Locked out ── */}
      {(room.lockedOutUnits || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.65rem' }}>
          {room.lockedOutUnits.map(l => <span key={`${l.playerId}-${l.unitType}`} onClick={() => onUpdate({ lockedOutUnits: room.lockedOutUnits.filter(x => !(x.playerId === l.playerId && x.unitType === l.unitType)) })} style={{ padding: '0.15rem 0.5rem', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.35)', borderRadius: '20px', color: '#c084fc', fontSize: '0.62rem', fontWeight: '800', cursor: 'pointer' }} title='Click to unlock'>🔒 {l.playerName}'s {l.label}</span>)}
        </div>
      )}

      {/* ── Status buttons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <button key={s} onClick={() => onSetStatus(s)} style={{ padding: '0.3rem 0.2rem', borderRadius: '5px', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.55rem', cursor: 'pointer', textAlign: 'center', background: room.status === s ? cfg.bg : surfaces.inset, border: `1px solid ${room.status === s ? cfg.border : 'rgba(55,65,81,0.4)'}`, color: room.status === s ? cfg.color : colors.textFaint }}>{cfg.label}</button>
        ))}
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginBottom: '0.35rem' }}>
        <button onClick={() => setShowActivate(true)} style={{ padding: '0.5rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>⚡ Activate</button>
        {room.lootMode && room.lootMode !== 'none' && <button onClick={() => { const rolled = rollRoomLoot(); setLootRollResult(rolled); setPresentSnapshot(room.charactersPresent || []); setShowLootDisburse(true); }} style={{ padding: '0.5rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.4)', color: colors.gold }}>🎲 Roll Loot</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: room.betrayalEnabled ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '0.35rem' }}>
        <button onClick={handlePass} style={{ padding: '0.45rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }}>✓ Pass</button>
        <button onClick={handleFail} style={{ padding: '0.45rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>✗ Fail</button>
        <button onClick={handleLockedOut} style={{ padding: '0.45rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.4)', color: '#c084fc' }}>🔒 Locked Out</button>
        {room.betrayalEnabled && <button onClick={() => setShowBetrayal(true)} style={{ padding: '0.45rem', borderRadius: '7px', fontFamily: fonts.body, fontWeight: '900', fontSize: '0.72rem', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>🐍 Betrayal</button>}
      </div>

      {/* ── Modals ── */}
      {showActivate && <ActivateModal room={room} players={players} onConfirm={handleActivate} onClose={() => setShowActivate(false)} />}
      {showBetrayal && <BetrayalModal room={room} players={players} onConfirm={b => { onUpdate({ betrayers: b }); setShowBetrayal(false); }} onClose={() => setShowBetrayal(false)} />}
      {showLootDisburse && lootRollResult && <LootDisburseModal items={lootRollResult} players={players} presentSnapshot={presentSnapshot} onGiveLoot={onGiveLoot} onClose={() => { setShowLootDisburse(false); setLootRollResult(null); setPresentSnapshot([]); }} />}
    </div>
  );
};

export default RoomCard;