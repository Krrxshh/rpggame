/**
 * Player Controller
 * Free-roam WASD movement, dodge, attack, block for action RPG
 * NEW FILE - extends game-engine for real-time controls
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export interface PlayerState {
  // Position
  position: { x: number; y: number; z: number };
  rotation: number; // Y-axis rotation in radians
  velocity: { x: number; z: number };
  
  // Stats
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegenRate: number;
  
  // Combat state
  isAttacking: boolean;
  isBlocking: boolean;
  isDodging: boolean;
  isInvulnerable: boolean;
  attackCombo: number; // 0, 1, 2 for combo chain
  attackCooldown: number;
  dodgeCooldown: number;
  blockTimer: number;
  parryWindow: number; // Frames remaining in parry window
  
  // Buffs
  attackBuff: number;
  defenseBuff: number;
  buffDuration: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  dodge: boolean;
  attack: boolean;
  heavyAttack: boolean;
  block: boolean;
  mouseX: number;
  mouseY: number;
}

export interface ControllerConfig {
  moveSpeed: number;
  sprintMultiplier: number;
  rotationSpeed: number;
  dodgeSpeed: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  dodgeStaminaCost: number;
  attackStaminaCost: number;
  heavyAttackStaminaCost: number;
  blockStaminaDrain: number;
  parryWindowFrames: number;
  invulnerabilityFrames: number;
  attackComboCooldown: number;
  comboWindowFrames: number;
}

// === CONSTANTS ===

export const DEFAULT_CONFIG: ControllerConfig = {
  moveSpeed: 5,
  sprintMultiplier: 1.6,
  rotationSpeed: 0.003,
  dodgeSpeed: 12,
  dodgeDuration: 0.3,
  dodgeCooldown: 0.8,
  dodgeStaminaCost: 20,
  attackStaminaCost: 15,
  heavyAttackStaminaCost: 30,
  blockStaminaDrain: 5,
  parryWindowFrames: 8,
  invulnerabilityFrames: 12,
  attackComboCooldown: 0.4,
  comboWindowFrames: 20,
};

export const INITIAL_PLAYER_STATE: PlayerState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  velocity: { x: 0, z: 0 },
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  staminaRegenRate: 15,
  isAttacking: false,
  isBlocking: false,
  isDodging: false,
  isInvulnerable: false,
  attackCombo: 0,
  attackCooldown: 0,
  dodgeCooldown: 0,
  blockTimer: 0,
  parryWindow: 0,
  attackBuff: 0,
  defenseBuff: 0,
  buffDuration: 0,
};

// === COLLISION ===

export interface Obstacle {
  position: { x: number; z: number };
  radius: number;
}

export function checkCollision(
  playerX: number,
  playerZ: number,
  playerRadius: number,
  obstacles: Obstacle[]
): boolean {
  for (const obs of obstacles) {
    const dx = playerX - obs.position.x;
    const dz = playerZ - obs.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < playerRadius + obs.radius) {
      return true;
    }
  }
  return false;
}

export function resolveCollision(
  playerX: number,
  playerZ: number,
  playerRadius: number,
  obstacles: Obstacle[]
): { x: number; z: number } {
  let newX = playerX;
  let newZ = playerZ;
  
  for (const obs of obstacles) {
    const dx = newX - obs.position.x;
    const dz = newZ - obs.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = playerRadius + obs.radius;
    
    if (dist < minDist && dist > 0.001) {
      // Push player out
      const pushDist = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      newX += nx * pushDist;
      newZ += nz * pushDist;
    }
  }
  
  return { x: newX, z: newZ };
}

// === MOVEMENT ===

export function processMovement(
  state: PlayerState,
  input: InputState,
  config: ControllerConfig,
  deltaTime: number,
  cameraRotation: number
): PlayerState {
  const newState = { ...state };
  
  // Calculate movement direction relative to camera
  let moveX = 0;
  let moveZ = 0;
  
  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  
  // Normalize
  const moveMag = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (moveMag > 0) {
    moveX /= moveMag;
    moveZ /= moveMag;
  }
  
  // Rotate movement by camera rotation
  const cosRot = Math.cos(cameraRotation);
  const sinRot = Math.sin(cameraRotation);
  const worldMoveX = moveX * cosRot - moveZ * sinRot;
  const worldMoveZ = moveX * sinRot + moveZ * cosRot;
  
  // Apply speed
  let speed = config.moveSpeed;
  if (input.sprint && state.stamina > 5) {
    speed *= config.sprintMultiplier;
    newState.stamina = Math.max(0, state.stamina - 10 * deltaTime);
  }
  
  // Can't move while attacking or dodging
  if (!state.isAttacking && !state.isDodging) {
    newState.velocity.x = worldMoveX * speed;
    newState.velocity.z = worldMoveZ * speed;
    
    // Update rotation to face movement direction
    if (moveMag > 0.1) {
      newState.rotation = Math.atan2(worldMoveX, -worldMoveZ);
    }
  }
  
  // Apply velocity
  newState.position.x += newState.velocity.x * deltaTime;
  newState.position.z += newState.velocity.z * deltaTime;
  
  return newState;
}

// === DODGE ===

export function processDodge(
  state: PlayerState,
  input: InputState,
  config: ControllerConfig,
  deltaTime: number
): PlayerState {
  const newState = { ...state };
  
  // Cooldown tick
  if (newState.dodgeCooldown > 0) {
    newState.dodgeCooldown -= deltaTime;
  }
  
  // Start dodge
  if (input.dodge && !state.isDodging && !state.isAttacking && state.dodgeCooldown <= 0 && state.stamina >= config.dodgeStaminaCost) {
    newState.isDodging = true;
    newState.isInvulnerable = true;
    newState.stamina -= config.dodgeStaminaCost;
    newState.dodgeCooldown = config.dodgeDuration;
    
    // Dodge in facing direction
    const dodgeX = Math.sin(state.rotation) * config.dodgeSpeed;
    const dodgeZ = -Math.cos(state.rotation) * config.dodgeSpeed;
    newState.velocity.x = dodgeX;
    newState.velocity.z = dodgeZ;
  }
  
  // End dodge
  if (state.isDodging && newState.dodgeCooldown <= 0) {
    newState.isDodging = false;
    newState.isInvulnerable = false;
    newState.dodgeCooldown = config.dodgeCooldown;
    newState.velocity.x = 0;
    newState.velocity.z = 0;
  }
  
  return newState;
}

// === ATTACK ===

export interface AttackResult {
  state: PlayerState;
  hitFrame: boolean;
  damage: number;
  isHeavy: boolean;
}

export function processAttack(
  state: PlayerState,
  input: InputState,
  config: ControllerConfig,
  deltaTime: number,
  baseAttack: number
): AttackResult {
  const newState = { ...state };
  let hitFrame = false;
  let damage = 0;
  let isHeavy = false;
  
  // Cooldown tick
  if (newState.attackCooldown > 0) {
    newState.attackCooldown -= deltaTime;
    if (newState.attackCooldown <= 0) {
      newState.isAttacking = false;
    }
  }
  
  // Light attack
  if (input.attack && !state.isAttacking && !state.isDodging && !state.isBlocking && state.stamina >= config.attackStaminaCost) {
    newState.isAttacking = true;
    newState.stamina -= config.attackStaminaCost;
    newState.attackCooldown = config.attackComboCooldown;
    newState.attackCombo = (state.attackCombo + 1) % 3;
    
    // Calculate damage with combo bonus
    const comboMultiplier = 1 + state.attackCombo * 0.15;
    damage = Math.floor((baseAttack + state.attackBuff) * comboMultiplier);
    hitFrame = true;
    
    // Lunge forward
    const lungeX = Math.sin(state.rotation) * 2;
    const lungeZ = -Math.cos(state.rotation) * 2;
    newState.velocity.x = lungeX;
    newState.velocity.z = lungeZ;
  }
  
  // Heavy attack
  if (input.heavyAttack && !state.isAttacking && !state.isDodging && !state.isBlocking && state.stamina >= config.heavyAttackStaminaCost) {
    newState.isAttacking = true;
    newState.stamina -= config.heavyAttackStaminaCost;
    newState.attackCooldown = config.attackComboCooldown * 1.5;
    newState.attackCombo = 0;
    
    damage = Math.floor((baseAttack + state.attackBuff) * 2);
    hitFrame = true;
    isHeavy = true;
  }
  
  return { state: newState, hitFrame, damage, isHeavy };
}

// === BLOCK & PARRY ===

export function processBlock(
  state: PlayerState,
  input: InputState,
  config: ControllerConfig,
  deltaTime: number
): PlayerState {
  const newState = { ...state };
  
  // Parry window tick
  if (newState.parryWindow > 0) {
    newState.parryWindow -= 1;
  }
  
  // Start blocking
  if (input.block && !state.isBlocking && !state.isAttacking && !state.isDodging) {
    newState.isBlocking = true;
    newState.parryWindow = config.parryWindowFrames;
    newState.blockTimer = 0;
  }
  
  // Continue blocking
  if (state.isBlocking && input.block) {
    newState.blockTimer += deltaTime;
    newState.stamina = Math.max(0, state.stamina - config.blockStaminaDrain * deltaTime);
    
    // Stop blocking if stamina depleted
    if (newState.stamina <= 0) {
      newState.isBlocking = false;
    }
  }
  
  // Stop blocking
  if (state.isBlocking && !input.block) {
    newState.isBlocking = false;
  }
  
  return newState;
}

// === STAMINA REGEN ===

export function processStamina(
  state: PlayerState,
  deltaTime: number
): PlayerState {
  const newState = { ...state };
  
  // Regen when not attacking or blocking
  if (!state.isAttacking && !state.isBlocking && !state.isDodging) {
    newState.stamina = Math.min(state.maxStamina, state.stamina + state.staminaRegenRate * deltaTime);
  }
  
  return newState;
}

// === BUFF PROCESSING ===

export function processBuffs(
  state: PlayerState,
  deltaTime: number
): PlayerState {
  const newState = { ...state };
  
  if (state.buffDuration > 0) {
    newState.buffDuration -= deltaTime;
    if (newState.buffDuration <= 0) {
      newState.attackBuff = 0;
      newState.defenseBuff = 0;
    }
  }
  
  return newState;
}

// === MAIN UPDATE ===

export function updatePlayerController(
  state: PlayerState,
  input: InputState,
  config: ControllerConfig,
  deltaTime: number,
  cameraRotation: number,
  obstacles: Obstacle[],
  baseAttack: number
): { state: PlayerState; attackResult: AttackResult | null } {
  let newState = { ...state };
  let attackResult: AttackResult | null = null;
  
  // Process systems
  newState = processDodge(newState, input, config, deltaTime);
  
  const attack = processAttack(newState, input, config, deltaTime, baseAttack);
  newState = attack.state;
  if (attack.hitFrame) {
    attackResult = attack;
  }
  
  newState = processBlock(newState, input, config, deltaTime);
  newState = processMovement(newState, input, config, deltaTime, cameraRotation);
  newState = processStamina(newState, deltaTime);
  newState = processBuffs(newState, deltaTime);
  
  // Resolve collisions
  const resolved = resolveCollision(newState.position.x, newState.position.z, 0.5, obstacles);
  newState.position.x = resolved.x;
  newState.position.z = resolved.z;
  
  return { state: newState, attackResult };
}

// === DAMAGE HANDLING ===

export function applyDamageToPlayer(
  state: PlayerState,
  damage: number
): { state: PlayerState; actualDamage: number; wasParried: boolean } {
  const newState = { ...state };
  let actualDamage = damage;
  let wasParried = false;
  
  // Invulnerable (dodge i-frames)
  if (state.isInvulnerable) {
    return { state: newState, actualDamage: 0, wasParried: false };
  }
  
  // Parry
  if (state.isBlocking && state.parryWindow > 0) {
    wasParried = true;
    return { state: newState, actualDamage: 0, wasParried: true };
  }
  
  // Block
  if (state.isBlocking) {
    actualDamage = Math.floor(damage * 0.3);
    newState.stamina = Math.max(0, state.stamina - damage * 0.5);
  }
  
  // Defense buff
  if (state.defenseBuff > 0) {
    actualDamage = Math.max(1, actualDamage - state.defenseBuff);
  }
  
  newState.hp = Math.max(0, state.hp - actualDamage);
  
  return { state: newState, actualDamage, wasParried };
}

export default {
  INITIAL_PLAYER_STATE,
  DEFAULT_CONFIG,
  updatePlayerController,
  applyDamageToPlayer,
};
