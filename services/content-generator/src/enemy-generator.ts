/**
 * Enemy Generator
 * Procedural enemy generation with scaling difficulty
 */

import type { RNG } from '../../utils/src/rng';
import type { Enemy } from '../../game-engine/src/types';
import { MAX_ENEMY_ATTACK_POWER } from '../../game-engine/src/types';

const ENEMY_NAMES = [
  'Shadow Lurker',
  'Void Walker',
  'Crystal Golem',
  'Flame Wraith',
  'Thunder Beast',
  'Frost Sentinel',
  'Dark Knight',
  'Chaos Imp',
  'Doom Bringer',
  'Soul Reaver',
  'Blade Dancer',
  'Storm Herald',
  'Death Weaver',
  'Iron Colossus',
  'Phantom Stalker',
];

const ENEMY_VISUALS: Enemy['visualType'][] = ['sphere', 'cube', 'pyramid', 'complex'];
const ENEMY_BEHAVIORS: Enemy['behavior'][] = ['aggressive', 'defensive', 'random'];

/**
 * Generate an enemy for a floor
 */
export function generateEnemy(floorNumber: number, rng: RNG, enemyColor: string): Enemy {
  // Calculate scaled HP: 3 + floor * 1.5
  const baseHp = 3 + Math.floor(floorNumber * 1.5);
  const hpVariance = rng.range(-1, 2);
  const hp = Math.max(1, baseHp + hpVariance);
  
  // Attack power scales but caps at max
  const baseAttack = 1 + Math.floor(floorNumber * 0.4);
  const attackVariance = rng.range(-1, 1);
  const attackPower = Math.min(
    MAX_ENEMY_ATTACK_POWER,
    Math.max(1, baseAttack + attackVariance)
  );
  
  // Accuracy improves slightly with floor
  const accuracy = Math.min(0.95, 0.7 + floorNumber * 0.02);
  
  // Pick visual type
  const visualType = selectVisualType(floorNumber, rng);
  
  // Pick behavior
  const behavior = selectBehavior(floorNumber, rng);
  
  // Pick name
  const name = selectName(floorNumber, rng);
  
  return {
    id: `enemy-floor-${floorNumber}`,
    name,
    hp,
    maxHp: hp,
    attack: {
      power: attackPower,
      accuracy,
    },
    position: { x: 0, y: 0, z: 0 }, // Will be set by spawn point
    behavior,
    visualType,
    color: enemyColor,
  };
}

/**
 * Select visual type based on floor and RNG
 */
function selectVisualType(floorNumber: number, rng: RNG): Enemy['visualType'] {
  if (floorNumber <= 3) {
    return rng.pick(['sphere', 'cube']);
  }
  if (floorNumber <= 7) {
    return rng.pick(['sphere', 'cube', 'pyramid']);
  }
  return rng.pick(ENEMY_VISUALS);
}

/**
 * Select behavior based on floor and RNG
 */
function selectBehavior(floorNumber: number, rng: RNG): Enemy['behavior'] {
  if (floorNumber <= 2) {
    return 'random';
  }
  return rng.pick(ENEMY_BEHAVIORS);
}

/**
 * Select enemy name
 */
function selectName(floorNumber: number, rng: RNG): string {
  const baseName = rng.pick(ENEMY_NAMES);
  
  // Add prefix for higher floors
  if (floorNumber >= 15) {
    return `Legendary ${baseName}`;
  }
  if (floorNumber >= 10) {
    return `Elite ${baseName}`;
  }
  if (floorNumber >= 5) {
    return `Greater ${baseName}`;
  }
  
  return baseName;
}

/**
 * Get enemy difficulty rating (1-10)
 */
export function getEnemyDifficulty(enemy: Enemy): number {
  const hpScore = Math.min(5, enemy.hp / 5);
  const attackScore = Math.min(3, enemy.attack.power / 3);
  const accuracyScore = enemy.attack.accuracy * 2;
  
  return Math.min(10, Math.round(hpScore + attackScore + accuracyScore));
}
