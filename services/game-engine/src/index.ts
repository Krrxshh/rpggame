/**
 * Game Engine Service - Barrel Export
 */

export * from './types';
export * from './combat';
export * from './validation';
export * from './physics';

// Action RPG exports - explicit to avoid conflicts
export { 
  updatePlayerController, 
  INITIAL_PLAYER_STATE, 
  DEFAULT_CONFIG,
  applyDamageToPlayer,
  type PlayerState,
  type InputState,
  type ControllerConfig,
} from './playerController';

export * from './enemyAI';
export * from './skills';
export * from './items';
export * from './safeZone';
export * from './resting';
export * from './weaponSystem';
export * from './inputManager';
export * from './enhancedPhysics';
export * from './bossTemplate';
// Enhanced safe zone with explicit aliases to avoid conflicts
export {
  generateSafeZones as generateEnhancedSafeZones,
  SAFE_ZONE_TYPES,
  executeRest as executeEnhancedRest,
  canEnemyEnterZone,
  getEnemyAvoidanceDirection,
  createCheckpoint,
  getLastCheckpoint,
  type Checkpoint,
} from './enhancedSafeZone';
