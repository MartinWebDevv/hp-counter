// Shared loot slot utilities — kept separate so Vite Fast Refresh
// doesn't choke on non-component exports mixed into component files.

export const getSlotCount = (p, unitType) => {
  if (!p) return 1;
  // Count extra slots from items still in inventory (legacy) + from unit's bonusSlots field
  const fromItems = (p.inventory || []).filter(
    it => it.heldBy === unitType && it.effect?.type === 'extraSlot'
  ).length;
  let fromUnit = 0;
  if (unitType === 'commander') {
    fromUnit = p.commanderStats?.bonusSlots || 0;
  } else {
    const idx = unitType === 'special' ? 0 : parseInt((unitType || '').replace('soldier', ''));
    fromUnit = p.subUnits?.[idx]?.bonusSlots || 0;
  }
  return 1 + fromItems + fromUnit;
};

export const getHeldCount = (p, unitType) => {
  if (!p) return 0;
  // Keys and quest items are slot-free — they never count against the unit's item limit
  return (p.inventory || []).filter(it =>
    it.heldBy === unitType &&
    !it.isQuestItem &&
    it.effect?.type !== 'key'
  ).length;
};

export const unitIsFull = (p, unitType) =>
  getHeldCount(p, unitType) >= getSlotCount(p, unitType);