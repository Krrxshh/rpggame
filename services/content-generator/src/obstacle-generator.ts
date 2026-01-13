/**
 * Obstacle and Hazard Generator
 * Procedural obstacle and hazard placement
 */

import type { RNG } from '../../utils/src/rng';
import type { Arena, Obstacle, ObstacleType, HazardZone, HazardType } from '../../game-engine/src/types';
import { MAX_OBSTACLES_PER_FLOOR, MAX_HAZARDS_PER_FLOOR } from '../../game-engine/src/types';
import { distance2D } from '../../utils/src/math';

const OBSTACLE_TYPES: ObstacleType[] = ['cover', 'pillar', 'platform', 'blocker'];
const HAZARD_TYPES: HazardType[] = ['damage', 'slow', 'knockback'];

/**
 * Generate obstacles for an arena
 */
export function generateObstacles(
  arena: Arena,
  floorNumber: number,
  rng: RNG
): Obstacle[] {
  // Number of obstacles scales with floor and arena size
  const baseCount = Math.min(3 + Math.floor(floorNumber / 3), MAX_OBSTACLES_PER_FLOOR);
  const count = rng.range(Math.max(1, baseCount - 2), baseCount);
  
  const obstacles: Obstacle[] = [];
  const minDistance = 2.5; // Minimum distance between obstacles
  
  for (let i = 0; i < count; i++) {
    const obstacle = generateSingleObstacle(arena, obstacles, rng, floorNumber);
    if (obstacle) {
      obstacles.push(obstacle);
    }
  }
  
  return obstacles;
}

/**
 * Generate a single obstacle that doesn't overlap existing ones
 */
function generateSingleObstacle(
  arena: Arena,
  existing: Obstacle[],
  rng: RNG,
  floorNumber: number
): Obstacle | null {
  const maxAttempts = 20;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random position within arena (with margin)
    const angle = rng.rangeFloat(0, Math.PI * 2);
    const distFromCenter = rng.rangeFloat(arena.radius * 0.2, arena.radius * 0.75);
    
    const position = {
      x: Math.cos(angle) * distFromCenter,
      y: Math.sin(angle) * distFromCenter,
      z: 0,
    };
    
    // Check distance from existing obstacles
    let valid = true;
    for (const other of existing) {
      const dist = distance2D(position, { x: other.position.x, y: other.position.y });
      if (dist < 2.5) {
        valid = false;
        break;
      }
    }
    
    // Check not too close to center (spawn area)
    if (distance2D(position, { x: 0, y: 0 }) < 3) {
      valid = false;
    }
    
    if (!valid) continue;
    
    // Generate obstacle properties
    const type = rng.pick(OBSTACLE_TYPES);
    const obstacle: Obstacle = {
      type,
      position,
      size: getObstacleSize(type, rng),
      provideCover: type === 'cover' || type === 'pillar',
      destructible: rng.chance(0.2) && floorNumber > 5,
    };
    
    if (type === 'pillar') {
      obstacle.radius = rng.rangeFloat(0.5, 1.2);
    }
    
    return obstacle;
  }
  
  return null;
}

/**
 * Get obstacle size based on type
 */
function getObstacleSize(
  type: ObstacleType,
  rng: RNG
): { width: number; height: number; depth: number } {
  switch (type) {
    case 'cover':
      return {
        width: rng.rangeFloat(1.5, 3),
        height: rng.rangeFloat(1, 1.5),
        depth: rng.rangeFloat(0.5, 1),
      };
    
    case 'pillar':
      const pillarSize = rng.rangeFloat(0.8, 1.5);
      return {
        width: pillarSize,
        height: rng.rangeFloat(2, 4),
        depth: pillarSize,
      };
    
    case 'platform':
      return {
        width: rng.rangeFloat(2, 4),
        height: rng.rangeFloat(0.3, 0.6),
        depth: rng.rangeFloat(2, 4),
      };
    
    case 'blocker':
      return {
        width: rng.rangeFloat(1, 2),
        height: rng.rangeFloat(1.5, 3),
        depth: rng.rangeFloat(1, 2),
      };
    
    default:
      return { width: 1, height: 1, depth: 1 };
  }
}

/**
 * Generate hazard zones for an arena
 */
export function generateHazards(
  arena: Arena,
  obstacles: Obstacle[],
  floorNumber: number,
  hazardColor: string,
  rng: RNG
): HazardZone[] {
  // No hazards on first few floors
  if (floorNumber < 3) {
    return [];
  }
  
  // Number of hazards scales with floor
  const maxHazards = Math.min(1 + Math.floor(floorNumber / 4), MAX_HAZARDS_PER_FLOOR);
  const count = rng.range(0, maxHazards);
  
  const hazards: HazardZone[] = [];
  
  for (let i = 0; i < count; i++) {
    const hazard = generateSingleHazard(arena, obstacles, hazards, hazardColor, rng);
    if (hazard) {
      hazards.push(hazard);
    }
  }
  
  return hazards;
}

/**
 * Generate a single hazard zone
 */
function generateSingleHazard(
  arena: Arena,
  obstacles: Obstacle[],
  existing: HazardZone[],
  hazardColor: string,
  rng: RNG
): HazardZone | null {
  const maxAttempts = 15;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = rng.rangeFloat(0, Math.PI * 2);
    const distFromCenter = rng.rangeFloat(arena.radius * 0.3, arena.radius * 0.8);
    
    const position = {
      x: Math.cos(angle) * distFromCenter,
      y: Math.sin(angle) * distFromCenter,
    };
    
    const radius = rng.rangeFloat(1.5, 3);
    
    // Check overlap with obstacles
    let valid = true;
    for (const obs of obstacles) {
      if (distance2D(position, { x: obs.position.x, y: obs.position.y }) < radius + 1) {
        valid = false;
        break;
      }
    }
    
    // Check overlap with existing hazards
    for (const other of existing) {
      if (distance2D(position, { x: other.position.x, y: other.position.y }) < radius + other.radius + 1) {
        valid = false;
        break;
      }
    }
    
    if (!valid) continue;
    
    const type = rng.pick(HAZARD_TYPES);
    
    return {
      type,
      position,
      radius,
      damage: type === 'damage' ? rng.range(1, 2) : 0,
      timing: {
        active: rng.chance(0.5),
        interval: rng.range(2000, 4000),
        duration: rng.range(1000, 2000),
        offset: rng.range(0, 1000),
      },
      visualHint: hazardColor,
    };
  }
  
  return null;
}
