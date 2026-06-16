import React from 'react';
import { colors, surfaces, fonts, btn, tierColors, hpBarColor, text, insetSection, pill } from '../../theme';
import { writePendingRequest, resolvePendingChoice } from '../../services/gameStateService';
import { getSlotCount, getHeldCount } from '../lootUtils';

const TIER_ORDER = { Common: 0, Rare: 1, Legendary: 2 };
const sortItems = (items) => [...(items || [])].sort((a, b) => {
  if (a.isQuestItem && !b.isQuestItem) return 1;
  if (!a.isQuestItem && b.isQuestItem) return -1;
  return (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
});

const ItemChoiceScreen = ({ choice, lobbyCode, myPlayer, allPlayers, npcs, onSubmit }) => {
  const [expandedPlayerId, setExpandedPlayerId] = React.useState(null);
  const [selectedTarget,   setSelectedTarget]   = React.useState(null); // { type:'self'|'enemy'|'destroyItem', unitKey, unitLabel, playerId, npcId, ... }
  const [selectedDestroyItem, setSelectedDestroyItem] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  const effectType = choice.itemEffect;

  // Effects that target own units
  const SELF_TARGET = ['heal','maxHP','attackBonus','defenseBonus','shieldWall','counterStrike','cleanse','fullCleanse','resurrect','extraSlot','theGuy'];
  // Effects that target enemies
  const ENEMY_TARGET = ['poisonVial','stunGrenade','attackDebuffItem','defenseDebuffItem','marked'];
  const IS_DESTROY   = effectType === 'destroyItem';
  const isSelf       = SELF_TARGET.includes(effectType);
  const isEnemy      = ENEMY_TARGET.includes(effectType);

  const effectLabels = {
    heal: '💚 Heal', maxHP: '❤️ Max HP Boost', attackBonus: '⚔️↑ Attack Bonus',
    defenseBonus: '🛡️↑ Defense Bonus', shieldWall: '🛡️ Shield Wall',
    counterStrike: '⚡ Counter Strike', cleanse: '✨ Cleanse',
    fullCleanse: '✨✨ Full Cleanse', resurrect: '💫 Resurrect', extraSlot: '🎒 Extra Item Slot',
    poisonVial: '🧪 Poison Vial', stunGrenade: '💣 Stun Grenade',
    attackDebuffItem: '⚔️↓ Attack Debuff', defenseDebuffItem: '🛡️↓ Defense Debuff',
    marked: '🎯 Marked', destroyItem: '💥 Destroy Item',
  };

  const submitChoice = async () => {
    if (!selectedTarget || sending) return;
    if (IS_DESTROY && !selectedDestroyItem) return;
    setSending(true);
    try {
      const reqId = `itemChoice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await writePendingRequest(lobbyCode, reqId, {
        type:              'itemChoice',
        reqId,
        choiceId:          choice.choiceId,
        playerId:          myPlayer?.id,
        playerName:        myPlayer?.playerName,
        itemId:            choice.itemId,
        itemName:          choice.itemName,
        itemEffect:        effectType,
        targetType:        selectedTarget.type,
        targetUnitKey:     selectedTarget.unitKey   || null,
        targetUnitLabel:   selectedTarget.unitLabel || null,
        targetPlayerId:    selectedTarget.playerId  || null,
        targetNpcId:       selectedTarget.npcId     || null,
        targetName:        selectedTarget.name       || null,
        // Destroy item specific
        destroyItemId:     selectedDestroyItem?.id   || null,
        destroyedItemName: selectedDestroyItem?.name || null,
        timestamp:         Date.now(),
      });
      onSubmit();
    } finally {
      setSending(false);
    }
  };

  // ── Own-unit list (for self-targeting effects) ────────────────────────────
  const buildOwnUnits = () => {
    if (!myPlayer) return [];
    const units = [];
    const cmdAlive = !myPlayer.commanderStats?.isDead && (myPlayer.commanderStats?.hp ?? 0) > 0;
    const cmdDown  = myPlayer.commanderStats?.isDead || (myPlayer.commanderStats?.hp ?? 0) <= 0;

    // Resurrect targets downed units; everything else targets alive units
    if (effectType === 'resurrect') {
      if (cmdDown) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp <= 0 && (u.livesRemaining ?? 0) > 0) {
          units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
        }
      });
    } else {
      if (cmdAlive) units.push({ unitKey: 'commander', unitLabel: myPlayer.commanderStats?.customName || myPlayer.commander || 'Commander', hp: myPlayer.commanderStats?.hp ?? 0, maxHp: myPlayer.commanderStats?.maxHp ?? 1 });
      (myPlayer.subUnits || []).forEach((u, i) => {
        if (u.hp > 0) units.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
      });
    }
    return units;
  };

  // ── Enemy player list (for destroy item) ─────────────────────────────────
  const enemyPlayers = (allPlayers || []).filter(p => p.id !== myPlayer?.id && !p.commanderStats?.isDead && !p.isAbsent);

  const canSubmit = selectedTarget && (!IS_DESTROY || selectedDestroyItem);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(145deg,#160e0e,#0e0808)', border: '2px solid rgba(201,169,97,0.4)', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>✦</div>
          <div style={{ color: colors.gold, fontFamily: '"Cinzel",Georgia,serif', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.08em' }}>
            {effectLabels[effectType] || 'Use Item'}
          </div>
          <div style={{ color: colors.textFaint, fontSize: '0.72rem', marginTop: '0.25rem' }}>{choice.itemName} — choose a target</div>
        </div>

        {/* ── Self-targeting: own units ── */}
        {isSelf && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {effectType === 'resurrect' ? 'Downed Units' : 'Your Units'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {buildOwnUnits().map(({ unitKey, unitLabel, hp, maxHp }) => {
                const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.type === 'self';
                const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                return (
                  <button
                    key={unitKey}
                    onClick={() => setSelectedTarget({ type: 'self', unitKey, unitLabel, name: unitLabel })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(201,169,97,0.12)' : 'rgba(0,0,0,0.3)', border: `1px solid ${isSelected ? 'rgba(201,169,97,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ flex: 1, color: isSelected ? colors.gold : colors.textPrimary, fontWeight: '700', fontSize: '0.85rem' }}>{unitLabel}</span>
                    <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                    {isSelected && <span style={{ color: colors.gold, fontSize: '0.75rem' }}>✓</span>}
                  </button>
                );
              })}
              {buildOwnUnits().length === 0 && (
                <div style={{ color: colors.textFaint, fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No valid targets</div>
              )}
            </div>
          </>
        )}

        {/* ── Enemy-targeting: NPC + player units ── */}
        {isEnemy && (
          <>
            {/* NPC targets */}
            {npcs.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enemies</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {npcs.map(npc => {
                    const isSelected = selectedTarget?.npcId === npc.id;
                    return (
                      <button
                        key={npc.id}
                        onClick={() => setSelectedTarget({ type: 'enemy', npcId: npc.id, name: npc.name, unitLabel: npc.name })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: fonts.body, textAlign: 'left' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: '#fecaca', fontWeight: '700', fontSize: '0.85rem' }}>{npc.name}</span>
                        <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{npc.hp}/{npc.maxHp} HP</span>
                        {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Enemy player unit targets */}
            {enemyPlayers.length > 0 && (
              <>
                <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Players</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {enemyPlayers.map(ep => {
                    const isExpanded = expandedPlayerId === ep.id;
                    const pColor = ep.playerColor || colors.blue;
                    const unitOptions = [];
                    if ((ep.commanderStats?.hp ?? 0) > 0) {
                      unitOptions.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', hp: ep.commanderStats.hp, maxHp: ep.commanderStats.maxHp });
                    }
                    (ep.subUnits || []).forEach((u, i) => {
                      if (u.hp > 0) unitOptions.push({ unitKey: i === 0 ? 'special' : `soldier${i}`, unitLabel: u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`), hp: u.hp, maxHp: u.maxHp });
                    });
                    return (
                      <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                        <button onClick={() => setExpandedPlayerId(isExpanded ? null : ep.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                          <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                            {unitOptions.map(({ unitKey, unitLabel, hp, maxHp }) => {
                              const isSelected = selectedTarget?.unitKey === unitKey && selectedTarget?.playerId === ep.id;
                              const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                              return (
                                <button key={unitKey} onClick={() => setSelectedTarget({ type: 'enemy', playerId: ep.id, unitKey, unitLabel, name: `${ep.playerName} — ${unitLabel}` })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.85rem', background: isSelected ? pColor + '15' : 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: fonts.body }}>
                                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                                  <span style={{ flex: 1, color: isSelected ? pColor : colors.purpleLight, fontWeight: '700', fontSize: '0.8rem', textAlign: 'left' }}>{unitLabel}</span>
                                  <span style={{ color: colors.textFaint, fontSize: '0.65rem' }}>{hp}/{maxHp} HP</span>
                                  {isSelected && <span style={{ color: pColor, fontSize: '0.75rem' }}>✓</span>}
                                </button>
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
          </>
        )}

        {/* ── Destroy Item: pick enemy player → see their units + items ── */}
        {IS_DESTROY && (
          <>
            <div style={{ color: colors.textFaint, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Choose Target Player</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {enemyPlayers.map(ep => {
                const isExpanded = expandedPlayerId === ep.id;
                const pColor = ep.playerColor || colors.blue;
                // Gather all units with items
                const unitsWithItems = [];
                const cmdItems = sortItems((ep.inventory || []).filter(it => it.heldBy === 'commander'));
                if ((ep.commanderStats?.hp ?? 0) > 0 && cmdItems.length > 0) {
                  unitsWithItems.push({ unitKey: 'commander', unitLabel: ep.commanderStats?.customName || ep.commander || 'Commander', items: cmdItems });
                }
                (ep.subUnits || []).forEach((u, i) => {
                  if (u.hp <= 0) return;
                  const uKey = i === 0 ? 'special' : `soldier${i}`;
                  const uLabel = u.name?.trim() || (i === 0 ? 'Special' : `Soldier ${i}`);
                  const unitItems = sortItems((ep.inventory || []).filter(it => it.heldBy === uKey));
                  if (unitItems.length > 0) unitsWithItems.push({ unitKey: uKey, unitLabel: uLabel, items: unitItems });
                });
                return (
                  <div key={ep.id} style={{ border: `1px solid ${isExpanded ? pColor + '60' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <button onClick={() => { setExpandedPlayerId(isExpanded ? null : ep.id); setSelectedTarget(null); setSelectedDestroyItem(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', background: isExpanded ? pColor + '12' : 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontFamily: fonts.body }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: '0.85rem', textAlign: 'left' }}>{ep.playerName}</span>
                      <span style={{ color: colors.textFaint, fontSize: '0.7rem' }}>{isExpanded ? '▾' : '▸'}</span>
                    </button>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                        {unitsWithItems.length === 0 && (
                          <div style={{ color: colors.textFaint, fontSize: '0.75rem', padding: '0.75rem 0.85rem' }}>No items to destroy</div>
                        )}
                        {unitsWithItems.map(({ unitKey, unitLabel, items }) => {
                          const icon = unitKey === 'commander' ? '👑' : unitKey === 'special' ? '⭐' : '🛡️';
                          return (
                            <div key={unitKey} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '0.4rem 0.85rem' }}>
                              <div style={{ color: colors.purpleLight, fontSize: '0.72rem', fontWeight: '800', marginBottom: '0.3rem' }}>{icon} {unitLabel}</div>
                              {items.map(item => {
                                const isSelected = selectedDestroyItem?.id === item.id;
                                return (
                                  <button key={item.id} onClick={() => { setSelectedTarget({ type: 'destroyItem', playerId: ep.id, name: ep.playerName }); setSelectedDestroyItem(item); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', marginBottom: '0.2rem', background: isSelected ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.2)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '6px', cursor: 'pointer', fontFamily: fonts.body }}>
                                    <span style={{ fontSize: '0.85rem' }}>📦</span>
                                    <span style={{ flex: 1, color: isSelected ? '#fca5a5' : colors.textPrimary, fontWeight: '700', fontSize: '0.78rem', textAlign: 'left' }}>{item.name}</span>
                                    <span style={{ color: colors.textFaint, fontSize: '0.6rem' }}>{item.tier}</span>
                                    {isSelected && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>✓</span>}
                                  </button>
                                );
                              })}
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

        {/* Submit */}
        <button
          onClick={submitChoice}
          disabled={!canSubmit || sending}
          style={{ width: '100%', padding: '0.85rem', background: canSubmit ? 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(21,128,61,0.2))' : 'rgba(0,0,0,0.2)', border: `1px solid ${canSubmit ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: canSubmit ? '#86efac' : colors.textDisabled, cursor: canSubmit && !sending ? 'pointer' : 'not-allowed', fontFamily: fonts.body, fontWeight: '800', fontSize: '0.9rem' }}
        >
          {sending ? '...' : '✓ Confirm Choice'}
        </button>
      </div>
    </div>
  );
};

export default ItemChoiceScreen;