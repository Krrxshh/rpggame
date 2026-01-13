/**
 * Skills System
 * Magic and strength skill trees for action RPG
 * NEW FILE - extends game-engine
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export type SkillType = 'magic' | 'strength';
export type SkillTargeting = 'projectile' | 'aoe' | 'self' | 'cone';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  targeting: SkillTargeting;
  level: number;
  maxLevel: number;
  cooldown: number; // Base cooldown in seconds
  cost: number; // Mana or stamina cost
  costType: 'mana' | 'stamina';
  damage: number; // Base damage
  range: number; // Range or radius
  duration: number; // Effect duration (for buffs/AoE)
  description: string;
}

export interface SkillState {
  skillId: string;
  currentCooldown: number;
  isActive: boolean;
  activeTimer: number;
}

export interface Projectile {
  id: string;
  skillId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  damage: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
}

export interface AoEEffect {
  id: string;
  skillId: string;
  position: { x: number; z: number };
  radius: number;
  damage: number;
  duration: number;
  tickRate: number;
  lastTick: number;
}

// === SKILL DEFINITIONS ===

export const SKILLS: Record<string, Skill> = {
  // Magic skills
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    type: 'magic',
    targeting: 'projectile',
    level: 1,
    maxLevel: 5,
    cooldown: 2,
    cost: 20,
    costType: 'mana',
    damage: 25,
    range: 15,
    duration: 0,
    description: 'Launch a fireball at enemies.',
  },
  frostNova: {
    id: 'frostNova',
    name: 'Frost Nova',
    type: 'magic',
    targeting: 'aoe',
    level: 1,
    maxLevel: 5,
    cooldown: 8,
    cost: 35,
    costType: 'mana',
    damage: 40,
    range: 5,
    duration: 0.5,
    description: 'Freeze all enemies in a radius around you.',
  },
  arcaneShield: {
    id: 'arcaneShield',
    name: 'Arcane Shield',
    type: 'magic',
    targeting: 'self',
    level: 1,
    maxLevel: 5,
    cooldown: 15,
    cost: 40,
    costType: 'mana',
    damage: 0,
    range: 0,
    duration: 5,
    description: 'Create a shield that absorbs damage.',
  },
  
  // Strength skills
  powerStrike: {
    id: 'powerStrike',
    name: 'Power Strike',
    type: 'strength',
    targeting: 'cone',
    level: 1,
    maxLevel: 5,
    cooldown: 4,
    cost: 25,
    costType: 'stamina',
    damage: 50,
    range: 3,
    duration: 0,
    description: 'A devastating heavy attack that staggers enemies.',
  },
  warCry: {
    id: 'warCry',
    name: 'War Cry',
    type: 'strength',
    targeting: 'self',
    level: 1,
    maxLevel: 5,
    cooldown: 20,
    cost: 30,
    costType: 'stamina',
    damage: 0,
    range: 0,
    duration: 10,
    description: 'Increase attack damage for a duration.',
  },
  groundSlam: {
    id: 'groundSlam',
    name: 'Ground Slam',
    type: 'strength',
    targeting: 'aoe',
    level: 1,
    maxLevel: 5,
    cooldown: 10,
    cost: 40,
    costType: 'stamina',
    damage: 60,
    range: 4,
    duration: 0,
    description: 'Slam the ground, damaging all nearby enemies.',
  },
};

// === SKILL STATE MANAGEMENT ===

export function createSkillState(skillId: string): SkillState {
  return {
    skillId,
    currentCooldown: 0,
    isActive: false,
    activeTimer: 0,
  };
}

export function updateSkillCooldowns(
  skills: SkillState[],
  deltaTime: number
): SkillState[] {
  return skills.map(skill => ({
    ...skill,
    currentCooldown: Math.max(0, skill.currentCooldown - deltaTime),
    activeTimer: skill.isActive ? skill.activeTimer - deltaTime : 0,
    isActive: skill.isActive && skill.activeTimer > deltaTime,
  }));
}

export function canUseSkill(
  skillState: SkillState,
  skill: Skill,
  currentResource: number
): boolean {
  return skillState.currentCooldown <= 0 && currentResource >= skill.cost;
}

// === SKILL EXECUTION ===

export interface SkillUseResult {
  success: boolean;
  skillState: SkillState;
  projectile?: Projectile;
  aoeEffect?: AoEEffect;
  buff?: { attackBuff: number; defenseBuff: number; duration: number };
  damage?: number;
  message: string;
}

export function useSkill(
  skill: Skill,
  skillState: SkillState,
  playerPos: { x: number; y: number; z: number },
  playerRotation: number,
  currentResource: number,
  rng: RNG
): SkillUseResult {
  if (!canUseSkill(skillState, skill, currentResource)) {
    return {
      success: false,
      skillState,
      message: skillState.currentCooldown > 0 ? 'Skill on cooldown' : 'Not enough resources',
    };
  }
  
  const newSkillState: SkillState = {
    ...skillState,
    currentCooldown: skill.cooldown,
    isActive: skill.duration > 0,
    activeTimer: skill.duration,
  };
  
  // Calculate damage with level scaling
  const levelDamage = skill.damage * (1 + (skill.level - 1) * 0.2);
  const variance = rng.rangeFloat(-0.1, 0.1);
  const finalDamage = Math.floor(levelDamage * (1 + variance));
  
  switch (skill.targeting) {
    case 'projectile': {
      // Create projectile
      const speed = 15;
      const projectile: Projectile = {
        id: `proj-${Date.now()}-${rng.range(0, 9999)}`,
        skillId: skill.id,
        position: { 
          x: playerPos.x, 
          y: playerPos.y + 1, 
          z: playerPos.z 
        },
        velocity: {
          x: Math.sin(playerRotation) * speed,
          y: 0,
          z: -Math.cos(playerRotation) * speed,
        },
        damage: finalDamage,
        radius: 0.5,
        lifetime: 0,
        maxLifetime: skill.range / speed,
      };
      return {
        success: true,
        skillState: newSkillState,
        projectile,
        message: `Cast ${skill.name}!`,
      };
    }
    
    case 'aoe': {
      // Create AoE effect
      const aoeEffect: AoEEffect = {
        id: `aoe-${Date.now()}-${rng.range(0, 9999)}`,
        skillId: skill.id,
        position: { x: playerPos.x, z: playerPos.z },
        radius: skill.range,
        damage: finalDamage,
        duration: Math.max(0.1, skill.duration),
        tickRate: 0.5,
        lastTick: 0,
      };
      return {
        success: true,
        skillState: newSkillState,
        aoeEffect,
        damage: finalDamage,
        message: `Used ${skill.name}!`,
      };
    }
    
    case 'self': {
      // Self-buff
      const buff = skill.id === 'warCry' 
        ? { attackBuff: 15, defenseBuff: 0, duration: skill.duration }
        : { attackBuff: 0, defenseBuff: 20, duration: skill.duration };
      return {
        success: true,
        skillState: newSkillState,
        buff,
        message: `Activated ${skill.name}!`,
      };
    }
    
    case 'cone': {
      // Cone attack (instant damage in front)
      return {
        success: true,
        skillState: newSkillState,
        damage: finalDamage,
        message: `${skill.name} deals ${finalDamage} damage!`,
      };
    }
    
    default:
      return {
        success: false,
        skillState,
        message: 'Unknown skill type',
      };
  }
}

// === PROJECTILE UPDATES ===

export function updateProjectile(
  projectile: Projectile,
  deltaTime: number
): Projectile | null {
  const newProjectile = { ...projectile };
  
  newProjectile.position.x += projectile.velocity.x * deltaTime;
  newProjectile.position.y += projectile.velocity.y * deltaTime;
  newProjectile.position.z += projectile.velocity.z * deltaTime;
  newProjectile.lifetime += deltaTime;
  
  if (newProjectile.lifetime >= newProjectile.maxLifetime) {
    return null; // Expired
  }
  
  return newProjectile;
}

export function checkProjectileHit(
  projectile: Projectile,
  targetPos: { x: number; z: number },
  targetRadius: number
): boolean {
  const dx = projectile.position.x - targetPos.x;
  const dz = projectile.position.z - targetPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < projectile.radius + targetRadius;
}

// === AOE UPDATES ===

export function updateAoE(
  aoe: AoEEffect,
  deltaTime: number
): AoEEffect | null {
  const newAoe = { ...aoe };
  newAoe.duration -= deltaTime;
  
  if (newAoe.duration <= 0) {
    return null;
  }
  
  return newAoe;
}

export function checkAoEHit(
  aoe: AoEEffect,
  targetPos: { x: number; z: number }
): boolean {
  const dx = aoe.position.x - targetPos.x;
  const dz = aoe.position.z - targetPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < aoe.radius;
}

export default {
  SKILLS,
  createSkillState,
  updateSkillCooldowns,
  canUseSkill,
  useSkill,
  updateProjectile,
  checkProjectileHit,
  updateAoE,
  checkAoEHit,
};
