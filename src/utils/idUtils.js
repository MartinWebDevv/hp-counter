/**
 * idUtils.js
 * Centralized ID generation. Previously copy-pasted throughout the codebase
 * with inconsistent random suffix lengths (5, 6, or 7 chars).
 * All generated IDs use an 8-char suffix for better collision resistance.
 */

/**
 * Generate a prefixed unique ID.
 * @param {string} prefix  e.g. 'npc' | 'loot' | 'timer'
 * @returns {string}       e.g. 'npc_lp4j2t_a8f3k2mn'
 */
export const generateId = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
