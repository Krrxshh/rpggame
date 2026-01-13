/**
 * Enemy AI System
 * Finite-state machine for real-time enemy behavior
 * NEW FILE - extends game-engine for action RPG enemies
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export type AIState = 'idle' | 'wander' | 'chase' | 'attack' | 'telegraph' | 'recover' | 'stagger' | 'retreat';

export interface EnemyAIState {
  id: string;
  currentState: AIState;
  stateTimer: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  velocity: { x: number; z: number };
  hp: number;
  maxHp: number;
  isStaggered: boolean;
  staggerTimer: number;
  targetPosition: { x: number; z: number } | null;
  currentAttack: AttackPattern | null;
  attackCooldown: number;
  aggroRange: number;
  attackRange: number;
  moveSpeed: number;
  lastKnownPlayerPos: { x: number; z: number } | null;
}

export interface AttackPattern {
  id: string;
  name: string;
  telegraphTime: number; // Seconds to telegraph before attack
  windupTime: number; // Seconds of wind-up animation
  executeTime: number; // Seconds of attack execution
  recoveryTime: number; // Seconds of recovery after attack
  damage: number;
  range: number;
  aoeRadius: number; // 0 for single target
  isProjectile: boolean;
  projectileSpeed: number;
  movementType: 'stationary' | 'charge' | 'retreat' | 'circle';
}

export interface AIConfig {
  baseAggroRange: number;
  baseAttackRange: number;
  baseMoveSpeed: number;
  wanderRadius: number;
  idleDuration: { min: number; max: number };
  wanderDuration: { min: number; max: number };
  retreatDistance: number;
  staggerDuration: number;
}

// === DEFAULT CONFIG ===

export const DEFAULT_AI_CONFIG: AIConfig = {
  baseAggroRange: 15,
  baseAttackRange: 2.5,
  baseMoveSpeed: 3,
  wanderRadius: 5,
  idleDuration: { min: 1, max: 3 },
  wanderDuration: { min: 2, max: 5 },
  retreatDistance: 6,
  staggerDuration: 0.8,
};

// === BASIC ATTACK PATTERNS ===

export const BASIC_ATTACKS: AttackPattern[] = [
  {
    id: 'swing',
    name: 'Basic Swing',
    telegraphTime: 0.3,
    windupTime: 0.4,
    executeTime: 0.2,
    recoveryTime: 0.5,
    damage: 15,
    range: 2.5,
    aoeRadius: 0,
    isProjectile: false,
    projectileSpeed: 0,
    movementType: 'stationary',
  },
  {
    id: 'charge',
    name: 'Charge Attack',
    telegraphTime: 0.6,
    windupTime: 0.3,
    executeTime: 0.4,
    recoveryTime: 0.8,
    damage: 25,
    range: 6,
    aoeRadius: 1.5,
    isProjectile: false,
    projectileSpeed: 0,
    movementType: 'charge',
  },
  {
    id: 'slam',
    name: 'Ground Slam',
    telegraphTime: 0.8,
    windupTime: 0.5,
    executeTime: 0.3,
    recoveryTime: 1.0,
    damage: 30,
    range: 3,
    aoeRadius: 3,
    isProjectile: false,
    projectileSpeed: 0,
    movementType: 'stationary',
  },
];

// === STATE MACHINE ===

export function createEnemyAI(
  id: string,
  position: { x: number; y: number; z: number },
  hp: number,
  rng: RNG,
  config: AIConfig = DEFAULT_AI_CONFIG
): EnemyAIState {
  return {
    id,
    currentState: 'idle',
    stateTimer: rng.rangeFloat(config.idleDuration.min, config.idleDuration.max),
    position: { ...position },
    rotation: rng.rangeFloat(0, Math.PI * 2),
    velocity: { x: 0, z: 0 },
    hp,
    maxHp: hp,
    isStaggered: false,
    staggerTimer: 0,
    targetPosition: null,
    currentAttack: null,
    attackCooldown: 0,
    aggroRange: config.baseAggroRange,
    attackRange: config.baseAttackRange,
    moveSpeed: config.baseMoveSpeed,
    lastKnownPlayerPos: null,
  };
}

export function updateEnemyAI(
  state: EnemyAIState,
  playerPosition: { x: number; z: number },
  deltaTime: number,
  rng: RNG,
  config: AIConfig = DEFAULT_AI_CONFIG,
  attacks: AttackPattern[] = BASIC_ATTACKS
): { state: EnemyAIState; attackHit: AttackPattern | null } {
  const newState = { ...state };
  let attackHit: AttackPattern | null = null;
  
  // Calculate distance to player
  const dx = playerPosition.x - state.position.x;
  const dz = playerPosition.z - state.position.z;
  const distToPlayer = Math.sqrt(dx * dx + dz * dz);
  
  // Update timers
  newState.stateTimer -= deltaTime;
  newState.attackCooldown = Math.max(0, state.attackCooldown - deltaTime);
  
  // Stagger handling
  if (state.isStaggered) {
    newState.staggerTimer -= deltaTime;
    if (newState.staggerTimer <= 0) {
      newState.isStaggered = false;
      newState.currentState = 'recover';
      newState.stateTimer = 0.5;
    }
    return { state: newState, attackHit: null };
  }
  
  // State machine
  switch (state.currentState) {
    case 'idle':
      newState.velocity = { x: 0, z: 0 };
      
      // Check for player in aggro range
      if (distToPlayer < state.aggroRange) {
        newState.currentState = 'chase';
        newState.lastKnownPlayerPos = { ...playerPosition };
      } else if (newState.stateTimer <= 0) {
        // Transition to wander
        newState.currentState = 'wander';
        newState.stateTimer = rng.rangeFloat(config.wanderDuration.min, config.wanderDuration.max);
        
        // Pick random wander target
        const angle = rng.rangeFloat(0, Math.PI * 2);
        const dist = rng.rangeFloat(2, config.wanderRadius);
        newState.targetPosition = {
          x: state.position.x + Math.cos(angle) * dist,
          z: state.position.z + Math.sin(angle) * dist,
        };
      }
      break;
      
    case 'wander':
      if (newState.targetPosition) {
        const toDist = getDistanceToTarget(state.position, newState.targetPosition);
        
        if (toDist < 0.5 || newState.stateTimer <= 0) {
          // Reached target or timeout
          newState.currentState = 'idle';
          newState.stateTimer = rng.rangeFloat(config.idleDuration.min, config.idleDuration.max);
          newState.velocity = { x: 0, z: 0 };
        } else {
          // Move toward target
          const dir = normalizeDirection(state.position, newState.targetPosition);
          newState.velocity = { x: dir.x * state.moveSpeed * 0.5, z: dir.z * state.moveSpeed * 0.5 };
          newState.rotation = Math.atan2(dir.x, -dir.z);
        }
      }
      
      // Check for player
      if (distToPlayer < state.aggroRange) {
        newState.currentState = 'chase';
        newState.lastKnownPlayerPos = { ...playerPosition };
      }
      break;
      
    case 'chase':
      newState.lastKnownPlayerPos = { ...playerPosition };
      
      // Face player
      newState.rotation = Math.atan2(dx, -dz);
      
      if (distToPlayer < state.attackRange && state.attackCooldown <= 0) {
        // In range, attack!
        newState.currentState = 'telegraph';
        newState.currentAttack = rng.pick(attacks);
        newState.stateTimer = newState.currentAttack.telegraphTime;
        newState.velocity = { x: 0, z: 0 };
      } else if (distToPlayer < state.aggroRange) {
        // Chase player
        const dir = normalizeDirection(state.position, playerPosition);
        newState.velocity = { x: dir.x * state.moveSpeed, z: dir.z * state.moveSpeed };
      } else {
        // Lost aggro
        newState.currentState = 'idle';
        newState.stateTimer = rng.rangeFloat(config.idleDuration.min, config.idleDuration.max);
        newState.velocity = { x: 0, z: 0 };
      }
      break;
      
    case 'telegraph':
      // Show attack warning
      if (newState.stateTimer <= 0 && state.currentAttack) {
        newState.currentState = 'attack';
        newState.stateTimer = state.currentAttack.windupTime + state.currentAttack.executeTime;
      }
      break;
      
    case 'attack':
      // Execute attack
      if (state.currentAttack) {
        // Check if we're in execute phase (past windup)
        const timeInAttack = (state.currentAttack.windupTime + state.currentAttack.executeTime) - state.stateTimer;
        const isExecuting = timeInAttack >= state.currentAttack.windupTime;
        
        // Movement during attack
        if (state.currentAttack.movementType === 'charge' && isExecuting) {
          const dir = normalizeDirection(state.position, playerPosition);
          newState.velocity = { x: dir.x * state.moveSpeed * 3, z: dir.z * state.moveSpeed * 3 };
        }
        
        // Hit detection on first execute frame
        if (isExecuting && timeInAttack < state.currentAttack.windupTime + deltaTime * 2) {
          attackHit = state.currentAttack;
        }
        
        if (newState.stateTimer <= 0) {
          newState.currentState = 'recover';
          newState.stateTimer = state.currentAttack.recoveryTime;
          newState.attackCooldown = 1.5 + rng.rangeFloat(0, 1);
          newState.velocity = { x: 0, z: 0 };
        }
      }
      break;
      
    case 'recover':
      newState.velocity = { x: 0, z: 0 };
      
      if (newState.stateTimer <= 0) {
        newState.currentState = 'chase';
        newState.currentAttack = null;
      }
      break;
      
    case 'stagger':
      newState.velocity = { x: 0, z: 0 };
      break;
      
    case 'retreat':
      // Move away from player
      const awayDir = normalizeDirection(playerPosition, state.position);
      newState.velocity = { x: awayDir.x * state.moveSpeed, z: awayDir.z * state.moveSpeed };
      
      if (distToPlayer > config.retreatDistance || newState.stateTimer <= 0) {
        newState.currentState = 'chase';
      }
      break;
  }
  
  // Apply velocity
  newState.position.x += newState.velocity.x * deltaTime;
  newState.position.z += newState.velocity.z * deltaTime;
  
  return { state: newState, attackHit };
}

// === DAMAGE HANDLING ===

export function applyDamageToEnemy(
  state: EnemyAIState,
  damage: number,
  isHeavyAttack: boolean,
  config: AIConfig = DEFAULT_AI_CONFIG
): EnemyAIState {
  const newState = { ...state };
  
  newState.hp = Math.max(0, state.hp - damage);
  
  // Heavy attacks stagger
  if (isHeavyAttack && !state.isStaggered) {
    newState.isStaggered = true;
    newState.staggerTimer = config.staggerDuration;
    newState.currentState = 'stagger';
    newState.currentAttack = null;
  }
  
  return newState;
}

// === HELPERS ===

function getDistanceToTarget(
  pos: { x: number; z: number },
  target: { x: number; z: number }
): number {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function normalizeDirection(
  from: { x: number; z: number },
  to: { x: number; z: number }
): { x: number; z: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.001) return { x: 0, z: 0 };
  return { x: dx / dist, z: dz / dist };
}

// === HIT DETECTION ===

export function checkAttackHit(
  attack: AttackPattern,
  enemyPos: { x: number; z: number },
  enemyRotation: number,
  playerPos: { x: number; z: number }
): boolean {
  const dx = playerPos.x - enemyPos.x;
  const dz = playerPos.z - enemyPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  // AoE attacks
  if (attack.aoeRadius > 0) {
    return dist < attack.aoeRadius;
  }
  
  // Directional attacks
  if (dist > attack.range) return false;
  
  // Check if player is in front cone (90 degrees)
  const angleToPlayer = Math.atan2(dx, -dz);
  const angleDiff = Math.abs(normalizeAngle(angleToPlayer - enemyRotation));
  return angleDiff < Math.PI / 4;
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export default {
  createEnemyAI,
  updateEnemyAI,
  applyDamageToEnemy,
  checkAttackHit,
  BASIC_ATTACKS,
};
