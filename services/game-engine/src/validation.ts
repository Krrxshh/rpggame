/**
 * Floor Payload Validation
 * Ensures generated floors meet game requirements
 */

import type { 
  FloorPayload, 
  ValidationResult, 
  Arena,
  Obstacle,
  SpawnPoint 
} from './types';
import { 
  MAX_OBSTACLES_PER_FLOOR, 
  MAX_HAZARDS_PER_FLOOR,
  MAX_ENEMY_ATTACK_POWER,
  MIN_ARENA_RADIUS,
  MAX_ARENA_RADIUS 
} from './types';
import { distance2D, insideCircle, insideRect, insideOctagon } from '../../utils/src/math';

/**
 * Validate a floor payload
 */
export function validateFloorPayload(payload: FloorPayload): ValidationResult {
  const errors: string[] = [];

  // Validate enemy HP
  if (payload.enemy.hp < 1) {
    errors.push('Enemy HP must be >= 1');
  }

  // Validate palette
  const paletteKeys = ['background', 'primary', 'secondary', 'accent', 'enemy', 'hazard'];
  const missingPalette = paletteKeys.filter(
    (key) => !payload.palette[key as keyof typeof payload.palette]
  );
  if (missingPalette.length > 0) {
    errors.push(`Palette missing colors: ${missingPalette.join(', ')}`);
  }

  // Validate arena radius
  if (payload.arena.radius < MIN_ARENA_RADIUS) {
    errors.push(`Arena radius ${payload.arena.radius} is below minimum ${MIN_ARENA_RADIUS}`);
  }
  if (payload.arena.radius > MAX_ARENA_RADIUS) {
    errors.push(`Arena radius ${payload.arena.radius} exceeds maximum ${MAX_ARENA_RADIUS}`);
  }

  // Validate player spawn is inside arena
  if (!isPointInsideArena(
    { x: payload.playerSpawn.position.x, y: payload.playerSpawn.position.y },
    payload.arena
  )) {
    errors.push('Player spawn is outside arena bounds');
  }

  // Validate enemy spawn is inside arena
  if (!isPointInsideArena(
    { x: payload.enemySpawn.position.x, y: payload.enemySpawn.position.y },
    payload.arena
  )) {
    errors.push('Enemy spawn is outside arena bounds');
  }

  // Validate spawns don't overlap with obstacles
  for (const obstacle of payload.obstacles) {
    if (spawnOverlapsObstacle(payload.playerSpawn, obstacle)) {
      errors.push('Player spawn overlaps with obstacle');
    }
    if (spawnOverlapsObstacle(payload.enemySpawn, obstacle)) {
      errors.push('Enemy spawn overlaps with obstacle');
    }
  }

  // Validate enemy attack power
  if (payload.enemy.attack.power > MAX_ENEMY_ATTACK_POWER) {
    errors.push(`Enemy attack power ${payload.enemy.attack.power} exceeds max ${MAX_ENEMY_ATTACK_POWER}`);
  }

  // Validate obstacle count
  if (payload.obstacles.length > MAX_OBSTACLES_PER_FLOOR) {
    errors.push(`Too many obstacles: ${payload.obstacles.length} > ${MAX_OBSTACLES_PER_FLOOR}`);
  }

  // Validate hazard count
  if (payload.hazards.length > MAX_HAZARDS_PER_FLOOR) {
    errors.push(`Too many hazards: ${payload.hazards.length} > ${MAX_HAZARDS_PER_FLOOR}`);
  }

  // Validate spawns have minimum distance
  const spawnDistance = distance2D(
    { x: payload.playerSpawn.position.x, y: payload.playerSpawn.position.y },
    { x: payload.enemySpawn.position.x, y: payload.enemySpawn.position.y }
  );
  if (spawnDistance < 4) {
    errors.push('Spawns are too close together');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a point is inside the arena
 */
export function isPointInsideArena(
  point: { x: number; y: number },
  arena: Arena
): boolean {
  switch (arena.shape) {
    case 'circle':
      return insideCircle(point, arena.center, arena.radius);
    
    case 'ring':
      const outerOk = insideCircle(point, arena.center, arena.radius);
      const innerOk = !insideCircle(point, arena.center, arena.innerRadius || 0);
      return outerOk && innerOk;
    
    case 'octagon':
      return insideOctagon(point, arena.center, arena.radius);
    
    case 'square':
      return insideRect(point, arena.center, arena.radius, arena.radius);
    
    case 'irregular':
      // Fallback to circle for irregular shapes
      return insideCircle(point, arena.center, arena.radius * 0.85);
    
    default:
      return insideCircle(point, arena.center, arena.radius);
  }
}

/**
 * Check if spawn point overlaps with obstacle
 */
function spawnOverlapsObstacle(spawn: SpawnPoint, obstacle: Obstacle): boolean {
  const spawnRadius = 1; // Player/enemy collision radius
  const obstacleRadius = obstacle.radius || 
    Math.max(obstacle.size.width, obstacle.size.depth) / 2;
  
  const dx = spawn.position.x - obstacle.position.x;
  const dy = spawn.position.y - obstacle.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  return dist < spawnRadius + obstacleRadius + 0.5; // 0.5 buffer
}

/**
 * Quick validation for critical checks only
 */
export function quickValidate(payload: FloorPayload): boolean {
  return (
    payload.enemy.hp >= 1 &&
    payload.arena.radius >= MIN_ARENA_RADIUS &&
    payload.arena.radius <= MAX_ARENA_RADIUS &&
    payload.obstacles.length <= MAX_OBSTACLES_PER_FLOOR
  );
}
