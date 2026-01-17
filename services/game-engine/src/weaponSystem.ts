/**
 * WeaponSystem.ts
 * CHANGELOG v1.0.0: Weapon attachment and swing mechanics
 * - Transform-based swing arcs
 * - Hit window collision sweeps
 * - Weapon type definitions with stats
 * - Bone attachment transforms
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export type WeaponType = 'sword' | 'axe' | 'hammer' | 'spear' | 'staff' | 'unarmed';

export interface WeaponStats {
  id: string;
  name: string;
  type: WeaponType;
  damage: number;
  speed: number; // Attack speed multiplier
  range: number; // Attack range
  staminaCost: number;
  heavyMultiplier: number;
  staggerPower: number;
  blockEfficiency: number; // For shields
  assetPath?: string;
}

export interface WeaponSwingArc {
  startAngle: number; // Radians
  endAngle: number;
  duration: number; // Seconds
  hitWindowStart: number; // 0-1 normalized time
  hitWindowEnd: number;
}

export interface SwingState {
  isSwinging: boolean;
  progress: number; // 0-1
  currentAngle: number;
  inHitWindow: boolean;
  hasHit: boolean;
  isHeavy: boolean;
}

// === WEAPON DEFINITIONS ===

export const WEAPONS: Record<string, WeaponStats> = {
  unarmed: {
    id: 'unarmed',
    name: 'Fists',
    type: 'unarmed',
    damage: 5,
    speed: 1.5,
    range: 1.5,
    staminaCost: 5,
    heavyMultiplier: 1.5,
    staggerPower: 0.2,
    blockEfficiency: 0.2,
  },
  basicSword: {
    id: 'basicSword',
    name: 'Iron Sword',
    type: 'sword',
    damage: 15,
    speed: 1.0,
    range: 2.5,
    staminaCost: 12,
    heavyMultiplier: 2.0,
    staggerPower: 0.5,
    blockEfficiency: 0.4,
    assetPath: 'Assets/Weapons/GLTF/Sword_1.gltf',
  },
  greatSword: {
    id: 'greatSword',
    name: 'Great Sword',
    type: 'sword',
    damage: 25,
    speed: 0.7,
    range: 3.0,
    staminaCost: 20,
    heavyMultiplier: 2.5,
    staggerPower: 0.8,
    blockEfficiency: 0.5,
    assetPath: 'Assets/Weapons/GLTF/Sword_2.gltf',
  },
  battleAxe: {
    id: 'battleAxe',
    name: 'Battle Axe',
    type: 'axe',
    damage: 22,
    speed: 0.8,
    range: 2.5,
    staminaCost: 18,
    heavyMultiplier: 2.3,
    staggerPower: 0.9,
    blockEfficiency: 0.3,
    assetPath: 'Assets/Weapons/GLTF/Axe_1.gltf',
  },
  warHammer: {
    id: 'warHammer',
    name: 'War Hammer',
    type: 'hammer',
    damage: 30,
    speed: 0.6,
    range: 2.2,
    staminaCost: 25,
    heavyMultiplier: 3.0,
    staggerPower: 1.0,
    blockEfficiency: 0.3,
    assetPath: 'Assets/Weapons/GLTF/Hammer_1.gltf',
  },
  spear: {
    id: 'spear',
    name: 'Spear',
    type: 'spear',
    damage: 18,
    speed: 1.1,
    range: 4.0,
    staminaCost: 14,
    heavyMultiplier: 1.8,
    staggerPower: 0.4,
    blockEfficiency: 0.3,
    assetPath: 'Assets/Weapons/GLTF/Spear_1.gltf',
  },
  magicStaff: {
    id: 'magicStaff',
    name: 'Magic Staff',
    type: 'staff',
    damage: 10,
    speed: 0.9,
    range: 3.0,
    staminaCost: 10,
    heavyMultiplier: 1.5,
    staggerPower: 0.3,
    blockEfficiency: 0.2,
    assetPath: 'Assets/Weapons/GLTF/Staff_1.gltf',
  },
};

// === SWING ARCS ===

const SWING_ARCS: Record<WeaponType, { light: WeaponSwingArc; heavy: WeaponSwingArc }> = {
  sword: {
    light: {
      startAngle: -Math.PI / 3,
      endAngle: Math.PI / 3,
      duration: 0.35,
      hitWindowStart: 0.2,
      hitWindowEnd: 0.7,
    },
    heavy: {
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 2,
      duration: 0.6,
      hitWindowStart: 0.3,
      hitWindowEnd: 0.6,
    },
  },
  axe: {
    light: {
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 4,
      duration: 0.4,
      hitWindowStart: 0.3,
      hitWindowEnd: 0.65,
    },
    heavy: {
      startAngle: -Math.PI * 0.7,
      endAngle: Math.PI / 3,
      duration: 0.7,
      hitWindowStart: 0.35,
      hitWindowEnd: 0.6,
    },
  },
  hammer: {
    light: {
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 6,
      duration: 0.5,
      hitWindowStart: 0.4,
      hitWindowEnd: 0.7,
    },
    heavy: {
      startAngle: -Math.PI * 0.8,
      endAngle: Math.PI / 4,
      duration: 0.9,
      hitWindowStart: 0.4,
      hitWindowEnd: 0.6,
    },
  },
  spear: {
    light: {
      startAngle: 0,
      endAngle: 0, // Thrust, not swing
      duration: 0.3,
      hitWindowStart: 0.4,
      hitWindowEnd: 0.8,
    },
    heavy: {
      startAngle: 0,
      endAngle: 0,
      duration: 0.5,
      hitWindowStart: 0.35,
      hitWindowEnd: 0.7,
    },
  },
  staff: {
    light: {
      startAngle: -Math.PI / 4,
      endAngle: Math.PI / 4,
      duration: 0.3,
      hitWindowStart: 0.2,
      hitWindowEnd: 0.75,
    },
    heavy: {
      startAngle: -Math.PI / 3,
      endAngle: Math.PI / 3,
      duration: 0.5,
      hitWindowStart: 0.3,
      hitWindowEnd: 0.65,
    },
  },
  unarmed: {
    light: {
      startAngle: -Math.PI / 6,
      endAngle: Math.PI / 6,
      duration: 0.2,
      hitWindowStart: 0.2,
      hitWindowEnd: 0.8,
    },
    heavy: {
      startAngle: -Math.PI / 4,
      endAngle: Math.PI / 4,
      duration: 0.35,
      hitWindowStart: 0.3,
      hitWindowEnd: 0.7,
    },
  },
};

// === SWING STATE MANAGEMENT ===

export function createSwingState(): SwingState {
  return {
    isSwinging: false,
    progress: 0,
    currentAngle: 0,
    inHitWindow: false,
    hasHit: false,
    isHeavy: false,
  };
}

export function startSwing(
  state: SwingState,
  weapon: WeaponStats,
  isHeavy: boolean
): SwingState {
  if (state.isSwinging) return state;
  
  const arc = SWING_ARCS[weapon.type][isHeavy ? 'heavy' : 'light'];
  
  return {
    isSwinging: true,
    progress: 0,
    currentAngle: arc.startAngle,
    inHitWindow: false,
    hasHit: false,
    isHeavy,
  };
}

export function updateSwing(
  state: SwingState,
  weapon: WeaponStats,
  deltaTime: number
): SwingState {
  if (!state.isSwinging) return state;
  
  const arc = SWING_ARCS[weapon.type][state.isHeavy ? 'heavy' : 'light'];
  const duration = arc.duration / weapon.speed;
  
  const newProgress = state.progress + deltaTime / duration;
  
  if (newProgress >= 1) {
    return {
      ...state,
      isSwinging: false,
      progress: 0,
      currentAngle: 0,
      inHitWindow: false,
    };
  }
  
  // Calculate current angle
  const t = newProgress;
  const currentAngle = arc.startAngle + (arc.endAngle - arc.startAngle) * t;
  
  // Check hit window
  const inHitWindow = t >= arc.hitWindowStart && t <= arc.hitWindowEnd;
  
  return {
    ...state,
    progress: newProgress,
    currentAngle,
    inHitWindow,
  };
}

// === HIT DETECTION ===

export interface HitResult {
  hit: boolean;
  damage: number;
  stagger: boolean;
  criticalHit: boolean;
}

export function checkWeaponHit(
  swing: SwingState,
  weapon: WeaponStats,
  playerPos: { x: number; z: number },
  playerRotation: number,
  targetPos: { x: number; z: number },
  targetRadius: number,
  rng: RNG
): HitResult {
  const noHit: HitResult = { hit: false, damage: 0, stagger: false, criticalHit: false };
  
  if (!swing.isSwinging || !swing.inHitWindow || swing.hasHit) {
    return noHit;
  }
  
  // Distance check
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  if (distance > weapon.range + targetRadius) {
    return noHit;
  }
  
  // Angle check
  const angleToTarget = Math.atan2(dx, -dz);
  let angleDiff = angleToTarget - playerRotation;
  
  // Normalize angle
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
  // Swing arc check
  const arc = SWING_ARCS[weapon.type][swing.isHeavy ? 'heavy' : 'light'];
  const swingRange = Math.abs(arc.endAngle - arc.startAngle);
  
  if (Math.abs(angleDiff) > swingRange / 2 + 0.5) {
    return noHit;
  }
  
  // Calculate damage
  const baseDamage = weapon.damage * (swing.isHeavy ? weapon.heavyMultiplier : 1);
  const variance = rng.rangeFloat(-0.1, 0.1);
  const criticalHit = rng.chance(0.1); // 10% crit chance
  const critMultiplier = criticalHit ? 1.5 : 1;
  
  const damage = Math.floor(baseDamage * (1 + variance) * critMultiplier);
  const stagger = swing.isHeavy || rng.chance(weapon.staggerPower);
  
  return {
    hit: true,
    damage,
    stagger,
    criticalHit,
  };
}

// === WEAPON ATTACHMENT TRANSFORMS ===

export interface WeaponTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const WEAPON_TRANSFORMS: Record<WeaponType, WeaponTransform> = {
  sword: {
    position: [0, 0.15, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: 1.0,
  },
  axe: {
    position: [0, 0.2, 0],
    rotation: [-Math.PI / 2, 0, Math.PI / 4],
    scale: 1.1,
  },
  hammer: {
    position: [0, 0.25, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: 1.2,
  },
  spear: {
    position: [0, 0.1, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: 1.0,
  },
  staff: {
    position: [0, 0.1, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: 1.0,
  },
  unarmed: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
  },
};

// === GET WEAPON FROM MANIFEST ===

export function getWeaponById(id: string): WeaponStats | null {
  return WEAPONS[id] || null;
}

export function getWeaponsByType(type: WeaponType): WeaponStats[] {
  return Object.values(WEAPONS).filter(w => w.type === type);
}

export default {
  WEAPONS,
  SWING_ARCS,
  WEAPON_TRANSFORMS,
  createSwingState,
  startSwing,
  updateSwing,
  checkWeaponHit,
  getWeaponById,
  getWeaponsByType,
};
