// Commander stats — single source of truth
// Fields displayed: walk, run, shootRange, attacksPerHit, rollToHeal
// specialRange and specialDamage kept for game mechanics (used by calculator/NPC system)
export const COMMANDER_STATS = {
  'Lord Fantastic': {
    walk: '6"', run: '12"', shootRange: '8"',
    attacksPerHit: 4, rollToHeal: 2,
    specialRange: 4, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '💔',
  },
  'The Gray': {
    walk: '6"', run: '12"', shootRange: '12"',
    attacksPerHit: 2, rollToHeal: 5,
    specialRange: 6, specialDamage: 2,
    shootAbility: '', specialAbility: '',
  },
  'Prisma K': {
    walk: '5"', run: '12"', shootRange: '8"',
    attacksPerHit: 4, rollToHeal: 2,
    specialRange: 4, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '💔',
  },
  'Murder Bot 9000': {
    walk: '4"', run: '12"', shootRange: '12"',
    attacksPerHit: 4, rollToHeal: 3,
    specialRange: 4, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '💔',
  },
  'Ganj the Squatch': {
    walk: '8"', run: '12"', shootRange: '16"',
    attacksPerHit: 2, rollToHeal: 4,
    specialRange: 8, specialDamage: 2,
    shootAbility: '', specialAbility: '💔',
  },
  'Selfcentrica Space Pony Princess': {
    walk: '8"', run: '24"', shootRange: '8"',
    attacksPerHit: 2, rollToHeal: 4,
    specialRange: 4, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '💔',
  },
  'Kronk': {
    walk: '8"', run: '12"', shootRange: '12"',
    attacksPerHit: 2, rollToHeal: 4,
    specialRange: 4, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '⛔',
  },
  'Queen of Fandom': {
    walk: '6"', run: '12"', shootRange: '8"',
    attacksPerHit: 4, rollToHeal: 3,
    specialRange: 6, specialDamage: 2,
    shootAbility: '⛔', specialAbility: '💔',
  },
  'Kandu Krow': {
    walk: '6"', run: '18"', shootRange: '12"',
    attacksPerHit: 2, rollToHeal: 4,
    specialRange: 6, specialDamage: 2,
    shootAbility: '', specialAbility: '⛔',
  },
  'The Glitch': {
    walk: '8"', run: '16"', shootRange: '16"',
    attacksPerHit: 2, rollToHeal: 5,
    specialRange: 8, specialDamage: 2,
    shootAbility: '', specialAbility: '',
  },
};