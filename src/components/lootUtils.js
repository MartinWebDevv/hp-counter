// Shared loot slot utilities — kept separate so Vite Fast Refresh
// doesn't choke on non-component exports mixed into component files.

export const getSlotCount = (p, unitType) => {
  if (!p) return 1;
  const extra = (p.inventory || []).filter(
    it => it.heldBy === unitType && it.effect?.type === 'extraSlot'
  ).length;
  return 1 + extra;
};

export const getHeldCount = (p, unitType) => {
  if (!p) return 0;
  return (p.inventory || []).filter(it => it.heldBy === unitType && !it.isQuestItem).length;
};

export const unitIsFull = (p, unitType) =>
  getHeldCount(p, unitType) >= getSlotCount(p, unitType);