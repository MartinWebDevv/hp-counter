import { COMMANDER_STATS } from '../data/commanderStats';
import { FACTION_STATS } from '../data/factionStats';

/**
 * Parse a numeric value from a string (e.g., "5hp" -> 5, "3x" -> 3)
 */
export const parseNumber = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const match = str.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

/**
 * Get display name for a unit
 */
export const getUnitName = (player, unitType) => {
  const playerName = player.playerName || 'Player';
  
  if (unitType === 'commander') {
    return `${playerName}'s ${player.commander || 'Commander'}`;
  }
  
  if (unitType === 'special') {
    const unitName = player.subUnits[0]?.name;
    const unitTypeLabel = player.faction === 'Uncivilized' ? player.subUnits[0]?.unitType : '';
    return `${playerName}'s Special Soldier${unitTypeLabel ? ` (${unitTypeLabel})` : ''}${unitName ? ` ${unitName}` : ''}`;
  }
  
  const soldierIndex = parseNumber(unitType.replace('soldier', ''));
  const unitName = player.subUnits[soldierIndex]?.name;
  return `${playerName}'s Soldier ${soldierIndex + 1}${unitName ? ` (${unitName})` : ''}`;
};

/**
 * Get stats for a specific unit
 */
export const getUnitStats = (player, unitType) => {
  if (unitType === 'commander') {
    const stats = COMMANDER_STATS[player.commander];
    return stats ? {
      shootDamage: parseNumber(stats.shootDamage) || 1,
      meleeDamage: parseNumber(stats.meleeDamage) || 1,
      attacksPerHit: parseNumber(stats.attacksPerHit) || 1,
      specialDamage: stats.specialDamage || 2,
      shootRange: stats.shootRange,
      specialRange: stats.specialRange,
      rollToHit: stats.rollToHit,
      rollToBlock: stats.rollToBlock,
      rollToHeal: stats.rollToHeal
    } : null;
  }
  
  let factionStats = FACTION_STATS[player.faction];
  if (!factionStats) return null;
  
  // Handle Uncivilized faction special case
  if (player.faction === 'Uncivilized') {
    const unitIndex = unitType === 'special' ? 0 : parseNumber(unitType.replace('soldier', ''));
    const unitTypeLabel = player.subUnits[unitIndex]?.unitType?.toLowerCase();
    
    if (unitTypeLabel === 'caveman') {
      factionStats = FACTION_STATS['Uncivilized'].caveman;
    } else if (unitTypeLabel === 'gladiator') {
      factionStats = FACTION_STATS['Uncivilized'].gladiator;
    } else {
      factionStats = FACTION_STATS['Uncivilized'].caveman;
    }
  }
  
  if (unitType === 'special') {
    return {
      shootDamage: factionStats.specialDamage || 2,
      meleeDamage: parseNumber(factionStats.meleeDamage) || 1,
      attacksPerHit: parseNumber(factionStats.attacksPerHit) || 1,
      specialDamage: factionStats.specialDamage || 2,
      shootRange: factionStats.shootRange,
      specialRange: factionStats.specialRange,
      rollToHit: factionStats.rollToHit,
      rollToBlock: factionStats.rollToBlock,
      rollToHeal: factionStats.rollToHeal
    };
  }
  
  return {
    shootDamage: parseNumber(factionStats.shootDamage) || 1,
    meleeDamage: parseNumber(factionStats.meleeDamage) || 1,
    attacksPerHit: parseNumber(factionStats.attacksPerHit) || 1,
    specialDamage: factionStats.specialDamage || 2,
    shootRange: factionStats.shootRange,
    specialRange: factionStats.specialRange,
    rollToHit: factionStats.rollToHit,
    rollToBlock: factionStats.rollToBlock,
    rollToHeal: factionStats.rollToHeal
  };
};

/**
 * Calculate total potential damage for a squad
 */
export const calculateSquadDamage = (player, action, getUnitStatsFn = getUnitStats) => {
  if (!player.isSquad || !player.squadMembers || player.squadMembers.length === 0) {
    const stats = getUnitStatsFn(player, player.selectedUnit);
    if (!stats) return 0;
    
    const attacksPerHit = stats.attacksPerHit || 1;
    const damagePerHit = action === 'shoot' ? (stats.shootDamage || 1) :
                        action === 'melee' ? (stats.meleeDamage || 1) :
                        (stats.specialDamage || 2);
    
    return attacksPerHit * damagePerHit;
  }
  
  let totalDamage = 0;
  player.squadMembers.forEach((member, index) => {
    if (!member.active) return;
    
    const unitType = index === 0 ? 'special' : `soldier${index}`;
    const stats = getUnitStatsFn(player, unitType);
    if (!stats) return;
    
    const attacksPerHit = stats.attacksPerHit || 1;
    const damagePerHit = action === 'shoot' ? (stats.shootDamage || 1) :
                        action === 'melee' ? (stats.meleeDamage || 1) :
                        (stats.specialDamage || 2);
    
    totalDamage += attacksPerHit * damagePerHit;
  });
  
  return totalDamage;
};

/**
 * Calculate total available damage based on hits rolled
 */
export const calculateTotalAvailableDamage = (attackerData, squadMemberHits, players) => {
  const attacker = players.find(p => p.id === attackerData.attackerId);
  let totalAvailableDamage = 0;
  
  if (attackerData.attackerIsSquad) {
    Object.entries(squadMemberHits || {}).forEach(([memberIndex, hits]) => {
      if (hits > 0) {
        const unitType = parseInt(memberIndex) === 0 ? 'special' : `soldier${memberIndex}`;
        const memberStats = getUnitStats(attacker, unitType);
        if (memberStats) {
          const damagePerHit = attackerData.action === 'shoot' ? memberStats.shootDamage :
            attackerData.action === 'melee' ? memberStats.meleeDamage :
            memberStats.specialDamage || 2;
          totalAvailableDamage += hits * damagePerHit;
        }
      }
    });
  } else {
    const stats = attackerData.stats;
    const damagePerHit = attackerData.action === 'shoot' ? (stats?.shootDamage || 1) :
      attackerData.action === 'melee' ? (stats?.meleeDamage || 1) :
      (stats?.specialDamage || 2);
    totalAvailableDamage = (attackerData.soloHits || 0) * damagePerHit;
  }
  
  return totalAvailableDamage;
};
