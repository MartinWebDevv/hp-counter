/**
 * unitUtils.js
 * Shared helpers for resolving unit display names and types.
 * Extracted from UseLootHandlers and useCampaignTurn (were identical copies).
 */

/**
 * Returns the display name of a unit on a player.
 * @param {object} player
 * @param {string} unitType  'commander' | 'special' | 'soldier1' | 'soldier2' ...
 */
export const unitNameByType = (player, unitType) => {
  if (!unitType || unitType === 'commander') {
    return player?.commanderStats?.customName || player?.commander || 'Commander';
  }
  if (unitType === 'special') {
    return player?.subUnits?.[0]?.name || 'Special';
  }
  const idx = parseInt(unitType.replace('soldier', ''), 10);
  return player?.subUnits?.[idx]?.name || `Unit ${idx}`;
};

/**
 * Returns the display label for a unit slot, with the player's name prepended.
 * e.g. "Alice's Kronk" or "Bob's Soldier 2"
 */
export const unitDisplayLabel = (player, unitType) => {
  const name = unitNameByType(player, unitType);
  return `${player?.playerName || 'Unknown'}'s ${name}`;
};

/**
 * Converts a unitType string to a subUnits array index.
 * 'special' → 0, 'soldier1' → 1, 'soldier2' → 2, etc.
 */
export const unitTypeToIndex = (unitType) => {
  if (unitType === 'special') return 0;
  return parseInt(unitType.replace('soldier', ''), 10);
};
