/**
 * BossTemplate.ts
 * CHANGELOG v1.0.0: Boss combat patterns and templates
 * - Moveset definitions (telegraph, windup, execute, recover)
 * - Boss state machine
 * - Attack pattern sequencing
 * - VFX/sound hook integration points
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export type BossPhase = 'idle' | 'telegraph' | 'windup' | 'execute' | 'recover' | 'stagger' | 'enrage';

export interface BossAttack {
  id: string;
  name: string;
  telegraphDuration: number; // Time showing intent
  windupDuration: number; // Charging up
  executeDuration: number; // Active attack frames
  recoverDuration: number; // Vulnerability window
  damage: number;
  range: number;
  arcWidth: number; // Degrees
  staggerPower: number;
  canBeParried: boolean;
  vfxId?: string;
  soundId?: string;
}

export interface BossMoveset {
  attacks: BossAttack[];
  comboPatterns: string[][]; // Sequences of attack IDs
  enrageThreshold: number; // HP percentage
  enrageSpeedMultiplier: number;
  enrageDamageMultiplier: number;
}

export interface BossState {
  id: string;
  name: string;
  phase: BossPhase;
  phaseTimer: number;
  currentAttack: BossAttack | null;
  comboIndex: number;
  currentCombo: string[] | null;
  hp: number;
  maxHp: number;
  isEnraged: boolean;
  position: { x: number; y: number; z: number };
  rotation: number;
  staggerTimer: number;
  lastAttackTime: number;
  attackCooldown: number;
}

// === BOSS ATTACK DEFINITIONS ===

export const BOSS_ATTACKS: Record<string, BossAttack> = {
  // Ground Slam
  groundSlam: {
    id: 'groundSlam',
    name: 'Ground Slam',
    telegraphDuration: 0.8,
    windupDuration: 0.4,
    executeDuration: 0.3,
    recoverDuration: 1.2,
    damage: 40,
    range: 6,
    arcWidth: 360,
    staggerPower: 1.0,
    canBeParried: false,
    vfxId: 'vfx_ground_crack',
    soundId: 'snd_slam',
  },
  
  // Sweep Attack
  horizontalSweep: {
    id: 'horizontalSweep',
    name: 'Horizontal Sweep',
    telegraphDuration: 0.5,
    windupDuration: 0.3,
    executeDuration: 0.25,
    recoverDuration: 0.8,
    damage: 25,
    range: 4,
    arcWidth: 180,
    staggerPower: 0.6,
    canBeParried: true,
    vfxId: 'vfx_sweep',
    soundId: 'snd_swing',
  },
  
  // Overhead Smash
  overheadSmash: {
    id: 'overheadSmash',
    name: 'Overhead Smash',
    telegraphDuration: 0.9,
    windupDuration: 0.5,
    executeDuration: 0.2,
    recoverDuration: 1.5,
    damage: 55,
    range: 3,
    arcWidth: 90,
    staggerPower: 1.2,
    canBeParried: true,
    vfxId: 'vfx_smash',
    soundId: 'snd_heavy_impact',
  },
  
  // Charge Attack
  chargeAttack: {
    id: 'chargeAttack',
    name: 'Charge',
    telegraphDuration: 0.6,
    windupDuration: 0.2,
    executeDuration: 0.8,
    recoverDuration: 1.8,
    damage: 35,
    range: 8,
    arcWidth: 60,
    staggerPower: 0.9,
    canBeParried: false,
    vfxId: 'vfx_dust_trail',
    soundId: 'snd_charge',
  },
  
  // Quick Jab
  quickJab: {
    id: 'quickJab',
    name: 'Quick Jab',
    telegraphDuration: 0.15,
    windupDuration: 0.1,
    executeDuration: 0.15,
    recoverDuration: 0.4,
    damage: 15,
    range: 2.5,
    arcWidth: 60,
    staggerPower: 0.2,
    canBeParried: true,
    soundId: 'snd_quick_attack',
  },
  
  // Spinning Attack
  spinAttack: {
    id: 'spinAttack',
    name: 'Spinning Attack',
    telegraphDuration: 0.4,
    windupDuration: 0.3,
    executeDuration: 0.6,
    recoverDuration: 1.0,
    damage: 30,
    range: 5,
    arcWidth: 360,
    staggerPower: 0.7,
    canBeParried: false,
    vfxId: 'vfx_spin',
    soundId: 'snd_spin',
  },
  
  // Roar (AoE stun)
  battleRoar: {
    id: 'battleRoar',
    name: 'Battle Roar',
    telegraphDuration: 1.0,
    windupDuration: 0.5,
    executeDuration: 0.4,
    recoverDuration: 0.6,
    damage: 10,
    range: 8,
    arcWidth: 360,
    staggerPower: 0.8,
    canBeParried: false,
    vfxId: 'vfx_roar_wave',
    soundId: 'snd_roar',
  },
};

// === MOVESET TEMPLATES ===

export const BOSS_MOVESETS: Record<string, BossMoveset> = {
  brute: {
    attacks: [
      BOSS_ATTACKS.groundSlam,
      BOSS_ATTACKS.horizontalSweep,
      BOSS_ATTACKS.overheadSmash,
      BOSS_ATTACKS.chargeAttack,
    ],
    comboPatterns: [
      ['horizontalSweep', 'horizontalSweep', 'overheadSmash'],
      ['chargeAttack', 'groundSlam'],
      ['overheadSmash', 'horizontalSweep'],
    ],
    enrageThreshold: 0.3,
    enrageSpeedMultiplier: 1.4,
    enrageDamageMultiplier: 1.3,
  },
  
  agile: {
    attacks: [
      BOSS_ATTACKS.quickJab,
      BOSS_ATTACKS.horizontalSweep,
      BOSS_ATTACKS.spinAttack,
      BOSS_ATTACKS.chargeAttack,
    ],
    comboPatterns: [
      ['quickJab', 'quickJab', 'horizontalSweep'],
      ['spinAttack', 'quickJab'],
      ['chargeAttack', 'spinAttack'],
      ['quickJab', 'quickJab', 'quickJab', 'spinAttack'],
    ],
    enrageThreshold: 0.25,
    enrageSpeedMultiplier: 1.6,
    enrageDamageMultiplier: 1.2,
  },
  
  giant: {
    attacks: [
      BOSS_ATTACKS.groundSlam,
      BOSS_ATTACKS.overheadSmash,
      BOSS_ATTACKS.battleRoar,
    ],
    comboPatterns: [
      ['battleRoar', 'groundSlam'],
      ['overheadSmash', 'groundSlam'],
      ['overheadSmash', 'overheadSmash'],
    ],
    enrageThreshold: 0.2,
    enrageSpeedMultiplier: 1.2,
    enrageDamageMultiplier: 1.5,
  },
};

// === BOSS STATE MANAGEMENT ===

export function createBossState(
  id: string,
  name: string,
  hp: number,
  position: { x: number; y: number; z: number }
): BossState {
  return {
    id,
    name,
    phase: 'idle',
    phaseTimer: 0,
    currentAttack: null,
    comboIndex: 0,
    currentCombo: null,
    hp,
    maxHp: hp,
    isEnraged: false,
    position,
    rotation: 0,
    staggerTimer: 0,
    lastAttackTime: 0,
    attackCooldown: 2,
  };
}

// === BOSS AI UPDATE ===

export interface BossUpdateResult {
  state: BossState;
  hitPlayer: boolean;
  damage: number;
  canBeParried: boolean;
  vfxTrigger?: string;
  soundTrigger?: string;
}

export function updateBoss(
  state: BossState,
  playerPos: { x: number; z: number },
  deltaTime: number,
  moveset: BossMoveset,
  rng: RNG
): BossUpdateResult {
  const newState = { ...state };
  let hitPlayer = false;
  let damage = 0;
  let canBeParried = false;
  let vfxTrigger: string | undefined;
  let soundTrigger: string | undefined;
  
  // Check enrage
  if (!newState.isEnraged && newState.hp / newState.maxHp <= moveset.enrageThreshold) {
    newState.isEnraged = true;
    vfxTrigger = 'vfx_enrage';
    soundTrigger = 'snd_enrage_roar';
  }
  
  // Speed multiplier for enrage
  const speedMult = newState.isEnraged ? moveset.enrageSpeedMultiplier : 1;
  const damageMult = newState.isEnraged ? moveset.enrageDamageMultiplier : 1;
  
  // Handle stagger
  if (newState.staggerTimer > 0) {
    newState.staggerTimer -= deltaTime;
    newState.phase = 'stagger';
    return { state: newState, hitPlayer, damage, canBeParried, vfxTrigger, soundTrigger };
  }
  
  // Update phase timer
  newState.phaseTimer -= deltaTime * speedMult;
  
  // Face player
  const dx = playerPos.x - state.position.x;
  const dz = playerPos.z - state.position.z;
  const targetRotation = Math.atan2(dx, -dz);
  
  // Smooth rotation (except during execute)
  if (state.phase !== 'execute') {
    let rotDiff = targetRotation - state.rotation;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    newState.rotation += rotDiff * Math.min(1, 5 * deltaTime);
  }
  
  // Distance to player
  const distToPlayer = Math.sqrt(dx * dx + dz * dz);
  
  // Phase state machine
  switch (state.phase) {
    case 'idle':
      // Move toward player if far
      if (distToPlayer > 10) {
        const moveSpeed = 4 * speedMult;
        const moveDir = { x: dx / distToPlayer, z: dz / distToPlayer };
        newState.position.x += moveDir.x * moveSpeed * deltaTime;
        newState.position.z += moveDir.z * moveSpeed * deltaTime;
      }
      
      // Start attack if in range and cooldown passed
      newState.lastAttackTime += deltaTime;
      if (distToPlayer < 8 && newState.lastAttackTime >= newState.attackCooldown) {
        // Select attack or continue combo
        if (!newState.currentCombo || newState.comboIndex >= newState.currentCombo.length) {
          // Start new combo
          newState.currentCombo = rng.pick(moveset.comboPatterns);
          newState.comboIndex = 0;
        }
        
        const attackId = newState.currentCombo[newState.comboIndex];
        const attack = moveset.attacks.find(a => a.id === attackId);
        
        if (attack) {
          newState.currentAttack = attack;
          newState.phase = 'telegraph';
          newState.phaseTimer = attack.telegraphDuration / speedMult;
          newState.lastAttackTime = 0;
          
          // Randomize next cooldown
          newState.attackCooldown = rng.rangeFloat(1, 2.5);
        }
      }
      break;
      
    case 'telegraph':
      if (newState.phaseTimer <= 0 && newState.currentAttack) {
        newState.phase = 'windup';
        newState.phaseTimer = newState.currentAttack.windupDuration / speedMult;
        soundTrigger = newState.currentAttack.soundId;
      }
      break;
      
    case 'windup':
      if (newState.phaseTimer <= 0 && newState.currentAttack) {
        newState.phase = 'execute';
        newState.phaseTimer = newState.currentAttack.executeDuration / speedMult;
        vfxTrigger = newState.currentAttack.vfxId;
      }
      break;
      
    case 'execute':
      if (newState.currentAttack) {
        // Check if player is hit
        const attack = newState.currentAttack;
        
        if (distToPlayer <= attack.range) {
          // Angle check
          let angleToPlayer = Math.atan2(dx, -dz) - state.rotation;
          while (angleToPlayer > Math.PI) angleToPlayer -= Math.PI * 2;
          while (angleToPlayer < -Math.PI) angleToPlayer += Math.PI * 2;
          
          const halfArc = (attack.arcWidth * Math.PI / 180) / 2;
          
          if (Math.abs(angleToPlayer) <= halfArc) {
            hitPlayer = true;
            damage = Math.floor(attack.damage * damageMult);
            canBeParried = attack.canBeParried;
          }
        }
        
        // Move forward during charge attacks
        if (attack.id === 'chargeAttack') {
          const chargeSpeed = 15 * speedMult;
          newState.position.x += Math.sin(state.rotation) * chargeSpeed * deltaTime;
          newState.position.z += -Math.cos(state.rotation) * chargeSpeed * deltaTime;
        }
      }
      
      if (newState.phaseTimer <= 0 && newState.currentAttack) {
        newState.phase = 'recover';
        newState.phaseTimer = newState.currentAttack.recoverDuration / speedMult;
        newState.comboIndex++;
      }
      break;
      
    case 'recover':
      if (newState.phaseTimer <= 0) {
        newState.phase = 'idle';
        newState.currentAttack = null;
      }
      break;
      
    case 'stagger':
      // Already handled above
      if (newState.staggerTimer <= 0) {
        newState.phase = 'idle';
      }
      break;
  }
  
  return { state: newState, hitPlayer, damage, canBeParried, vfxTrigger, soundTrigger };
}

// === DAMAGE HANDLING ===

export function damageBoss(
  state: BossState,
  damage: number,
  stagger: boolean
): BossState {
  const newState = { ...state };
  newState.hp = Math.max(0, state.hp - damage);
  
  if (stagger && state.phase === 'recover') {
    // Extra stagger during recovery
    newState.staggerTimer = 1.5;
    newState.phase = 'stagger';
  } else if (stagger) {
    newState.staggerTimer = 0.8;
    newState.phase = 'stagger';
  }
  
  return newState;
}

// === PARRY HANDLING ===

export function parryBoss(state: BossState): BossState {
  const newState = { ...state };
  newState.staggerTimer = 2.0;
  newState.phase = 'stagger';
  newState.currentCombo = null;
  newState.comboIndex = 0;
  return newState;
}

export default {
  BOSS_ATTACKS,
  BOSS_MOVESETS,
  createBossState,
  updateBoss,
  damageBoss,
  parryBoss,
};
