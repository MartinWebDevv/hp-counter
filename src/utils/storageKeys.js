/**
 * storageKeys.js
 * Central registry of all localStorage keys used by the app.
 * Change a key name here and it updates everywhere.
 *
 * Prefix convention: bt_ (Battle Tracker)
 * Previously used the legacy prefix "hpCounter" — all migrated here.
 */

export const STORAGE_KEYS = {
  // Game state
  players:        'bt_players',
  round:          'bt_round',
  log:            'bt_log',
  gameMode:       'bt_gameMode',
  customSettings: 'bt_customSettings',
  playerIndex:    'bt_playerIndex',
  gameStarted:    'bt_gameStarted',
  lootPool:       'bt_lootPool',

  // NPCs
  npcs:           'bt_npcs',
  pastNPCs:       'bt_pastSessionNPCs',

  // Chests
  chests:         'bt_chests',
  pastChests:     'bt_pastSessionChests',

  // Timers & Tokens
  roundTimers:    'bt_roundTimers',
  tokens:         'bt_commanderTokens',
  tokensEnabled:  'bt_tokensEnabled',

  // VP / Sessions
  vpStats:        'bt_vpStats',
  sessionCount:   'bt_sessionCount',

  // App session (separate — used by App.jsx)
  appSession:     'bt_session',
};
