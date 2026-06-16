/**
 * gameModes.js
 * Game mode configurations — single source of truth.
 *
 * FIXED: Standardized on `squadLives` everywhere.
 *        Previously `useGameState` was reading a non-existent `soldierLives`
 *        field, causing squad lives to always fall back to 1.
 */

export const GAME_MODES = {
  campaign: {
    id: 'campaign',
    name: 'Campaign Mode',
    description: 'Full narrative campaign with NPCs, loot, and DM tools',
    commanderHP: 20,
    squadHP: 10,
    commanderRevives: 1,
    squadRevives: 1,
    squadLives: 1,
    diceSystem: 'd20',
    icon: '🗺️',
  },
  custom: {
    id: 'custom',
    name: 'Custom Mode',
    description: 'Configure your own HP, revives, and dice mechanics',
    commanderHP: null,
    squadHP: null,
    commanderRevives: null,
    squadRevives: null,
    squadLives: null,
    diceSystem: 'custom',
    icon: '⚙️',
  },
};

export const DEFAULT_MODE = 'campaign';

/** Get mode configuration by ID. Falls back to campaign if unknown. */
export const getModeConfig = (modeId) => GAME_MODES[modeId] ?? GAME_MODES[DEFAULT_MODE];

/** Validate custom mode settings. Returns an array of error strings. */
export const validateCustomMode = (settings) => {
  const errors = [];

  if (!settings.commanderHP || settings.commanderHP < 1)
    errors.push('Commander HP must be at least 1');

  if (!settings.squadHP || settings.squadHP < 1)
    errors.push('Squad HP must be at least 1');

  if (settings.commanderRevives < 0)
    errors.push('Commander revives cannot be negative');

  if (settings.squadRevives < 0)
    errors.push('Squad revives cannot be negative');

  if (settings.squadLives === undefined || settings.squadLives < 1)
    errors.push('Squad lives must be at least 1');

  return errors;
};
