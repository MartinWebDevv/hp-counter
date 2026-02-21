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
    diceSystem: 'roll-to-hit', // 2+, 3+, 4+, 5+, 6+
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
    diceSystem: 'd20', // D20 for commanders, D10 for squads
    icon: '🎲'
  },
  custom: {
    id: 'custom',
    name: 'Custom Mode',
    description: 'Configure your own HP, revives, and dice mechanics',
    commanderHP: null, // User configurable
    squadHP: null,
    commanderRevives: null,
    squadRevives: null,
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
  
  return errors;
};