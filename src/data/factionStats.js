// Faction squad unit stats — single source of truth
// Fields displayed: walk, run, shootRange, attacksPerHit, rollToHeal
// specialRange kept for game mechanics
export const FACTION_STATS = {
  'Red Rovers': {
    walk: '6"', run: '12"', shootRange: '12"',
    attacksPerHit: 1, rollToHeal: 4, specialRange: 6,
  },
  'Space Aliens': {
    walk: '6"', run: '12"', shootRange: '12"',
    attacksPerHit: 1, rollToHeal: 4, specialRange: 6,
  },
  'NoLobe Zombies': {
    walk: '4"', run: '12"', shootRange: '8"',
    attacksPerHit: 1, rollToHeal: 2, specialRange: 4,
  },
  'Murder Bots': {
    walk: '4"', run: '12"', shootRange: '8"',
    attacksPerHit: 1, rollToHeal: 3, specialRange: 4,
  },
  'Monster': {
    walk: '8"', run: '12"', shootRange: '16"',
    attacksPerHit: 1, rollToHeal: 5, specialRange: 8,
  },
  'Space Pony': {
    walk: '8"', run: '12"', shootRange: '16"',
    attacksPerHit: 1, rollToHeal: 6, specialRange: 8,
  },
  'Uncivilized': {
    caveman: {
      walk: '6"', run: '12"', shootRange: '8"',
      attacksPerHit: 1, rollToHeal: 5, specialRange: 6,
    },
    dinosaur: {
      walk: '8"', run: '16"', shootRange: '8"',
      attacksPerHit: 1, rollToHeal: 5, specialRange: 6,
    },
  },
};