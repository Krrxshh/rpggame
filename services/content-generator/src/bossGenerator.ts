/**
 * Boss Generator - Procedural boss with attack patterns
 * NEW FILE - extends content-generator
 */

import type { RNG } from '../../utils/src/rng';
import { createRNG } from '../../utils/src/rng';

export interface BossAttack {
  id: string;
  name: string;
  telegraphTime: number;
  windupTime: number;
  executeTime: number;
  recoveryTime: number;
  damage: number;
  range: number;
  aoeRadius: number;
  isProjectile: boolean;
  projectileSpeed: number;
  movementType: 'stationary' | 'charge' | 'retreat';
}

export interface BossPayload {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attacks: BossAttack[];
  moveSpeed: number;
  aggroRange: number;
  position: { x: number; y: number; z: number };
  tier: 'normal' | 'elite' | 'legendary';
}

const BOSS_NAMES = [
  'Hollow Knight', 'Storm Brute', 'Thorn Witch', 'Dark Warden',
  'Ashen Lord', 'Crystal Sentinel', 'Plague Bearer', 'Shadow Wraith',
];

const ATTACK_BANK: Omit<BossAttack, 'id'>[] = [
  { name: 'Cleave', telegraphTime: 0.4, windupTime: 0.3, executeTime: 0.2, recoveryTime: 0.5, damage: 20, range: 3, aoeRadius: 0, isProjectile: false, projectileSpeed: 0, movementType: 'stationary' },
  { name: 'Ground Slam', telegraphTime: 0.8, windupTime: 0.5, executeTime: 0.3, recoveryTime: 1.0, damage: 35, range: 0, aoeRadius: 4, isProjectile: false, projectileSpeed: 0, movementType: 'stationary' },
  { name: 'Charge', telegraphTime: 0.6, windupTime: 0.2, executeTime: 0.5, recoveryTime: 0.8, damage: 30, range: 8, aoeRadius: 1.5, isProjectile: false, projectileSpeed: 0, movementType: 'charge' },
  { name: 'Dark Bolt', telegraphTime: 0.5, windupTime: 0.3, executeTime: 0.1, recoveryTime: 0.4, damage: 15, range: 12, aoeRadius: 0, isProjectile: true, projectileSpeed: 15, movementType: 'stationary' },
  { name: 'Spinning Slash', telegraphTime: 0.4, windupTime: 0.2, executeTime: 0.4, recoveryTime: 0.6, damage: 25, range: 3.5, aoeRadius: 3.5, isProjectile: false, projectileSpeed: 0, movementType: 'stationary' },
  { name: 'Leap Strike', telegraphTime: 0.7, windupTime: 0.4, executeTime: 0.3, recoveryTime: 0.9, damage: 40, range: 6, aoeRadius: 2, isProjectile: false, projectileSpeed: 0, movementType: 'charge' },
];

export function generateBoss(
  floorNumber: number,
  seed: number | string,
  position: { x: number; y: number; z: number }
): BossPayload {
  const rng = createRNG(typeof seed === 'string' ? hashSeed(seed) : seed);
  
  const tier: BossPayload['tier'] = 
    floorNumber >= 15 ? 'legendary' : 
    floorNumber >= 8 ? 'elite' : 'normal';
  
  const tierMultiplier = tier === 'legendary' ? 2.5 : tier === 'elite' ? 1.7 : 1;
  const name = rng.pick(BOSS_NAMES);
  const prefix = tier === 'legendary' ? 'Legendary ' : tier === 'elite' ? 'Greater ' : '';
  
  const attackCount = rng.range(3, 6);
  const shuffled = rng.shuffle([...ATTACK_BANK]);
  const attacks: BossAttack[] = shuffled.slice(0, attackCount).map((atk, i) => ({
    ...atk,
    id: `attack-${i}`,
    damage: Math.floor(atk.damage * tierMultiplier * (1 + floorNumber * 0.05)),
  }));
  
  const baseHp = 150 + floorNumber * 20;
  
  return {
    id: `boss-${seed}-${floorNumber}`,
    name: `${prefix}${name}`,
    hp: Math.floor(baseHp * tierMultiplier),
    maxHp: Math.floor(baseHp * tierMultiplier),
    attacks,
    moveSpeed: 3 + rng.rangeFloat(0, 1),
    aggroRange: 15 + floorNumber * 0.5,
    position: { ...position },
    tier,
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return Math.abs(hash);
}

export function validateBoss(boss: BossPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (boss.hp <= 0) errors.push('Boss HP must be positive');
  if (boss.attacks.length < 3) errors.push('Boss needs at least 3 attacks');
  if (!boss.name) errors.push('Boss needs a name');
  return { valid: errors.length === 0, errors };
}

export default { generateBoss, validateBoss };
