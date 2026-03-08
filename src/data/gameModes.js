/**
 * Game Mode Configurations
 * Defines the rules and settings for each game mode
 */

export const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Mode',
    description: 'Traditional roll-to-hit system with standard HP values',
    commanderHP: 15,
    squadHP: 8,
    commanderRevives: 2,
    squadRevives: 2,
    squadLives: 2,
    diceSystem: 'roll-to-hit',
    icon: '⚔️'
  },
  d20: {
    id: 'd20',
    name: 'D20/D10 Mode',
    description: 'Commanders roll D20, squads roll D10',
    commanderHP: 20,
    squadHP: 10,
    commanderRevives: 1,
    squadRevives: 1,
    squadLives: 1,
    diceSystem: 'd20',
    icon: '🎲'
  },
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
    icon: '🗺️'
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
    icon: '⚙️'
  }
};

export const DEFAULT_MODE = 'classic';

/**
 * Get mode configuration by ID
 */
export const getModeConfig = (modeId) => {
  return GAME_MODES[modeId] || GAME_MODES[DEFAULT_MODE];
};

/**
 * Validate custom mode settings
 */
export const validateCustomMode = (settings) => {
  const errors = [];

  if (!settings.commanderHP || settings.commanderHP < 1) {
    errors.push('Commander HP must be at least 1');
  }

  if (!settings.squadHP || settings.squadHP < 1) {
    errors.push('Squad HP must be at least 1');
  }

  if (settings.commanderRevives < 0) {
    errors.push('Commander revives cannot be negative');
  }

  if (settings.squadRevives < 0) {
    errors.push('Squad revives cannot be negative');
  }

  if (settings.squadLives === undefined || settings.squadLives < 1) {
    errors.push('Squad lives must be at least 1');
  }

  return errors;
};