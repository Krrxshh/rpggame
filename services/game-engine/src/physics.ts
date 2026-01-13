/**
 * Physics-Lite System
 * Simple collision detection for arena boundaries and obstacles
 */

import type { Arena, Obstacle } from './types';
import { distance2D, insideCircle, insideRect, circlesOverlap } from '../../utils/src/math';
import type { Vec2 as UtilVec2 } from '../../utils/src/math';

// Re-export Vec2 as Position for convenience
export type Position = UtilVec2;

/**
 * Collision result
 */
export interface CollisionResult {
  collides: boolean;
  obstacle?: Obstacle;
  penetration?: { x: number; y: number };
}

/**
 * Check if position collides with any obstacle
 */
export function checkObstacleCollision(
  position: Position,
  radius: number,
  obstacles: Obstacle[]
): CollisionResult {
  for (const obstacle of obstacles) {
    if (obstacle.radius) {
      // Circle obstacle
      if (circlesOverlap(
        position, radius,
        { x: obstacle.position.x, y: obstacle.position.y }, obstacle.radius
      )) {
        return {
          collides: true,
          obstacle,
          penetration: calculateCirclePenetration(
            position, radius,
            { x: obstacle.position.x, y: obstacle.position.y }, obstacle.radius
          ),
        };
      }
    } else {
      // Box obstacle - treat as AABB
      const halfWidth = obstacle.size.width / 2;
      const halfDepth = obstacle.size.depth / 2;
      if (circleRectCollision(
        position, radius,
        { x: obstacle.position.x, y: obstacle.position.y }, halfWidth, halfDepth
      )) {
        return {
          collides: true,
          obstacle,
        };
      }
    }
  }

  return { collides: false };
}

/**
 * Calculate penetration vector for circle-circle collision
 */
function calculateCirclePenetration(
  pos1: Position,
  r1: number,
  pos2: Position,
  r2: number
): { x: number; y: number } {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) {
    return { x: r1 + r2, y: 0 };
  }
  
  const overlap = (r1 + r2) - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  
  return { x: nx * overlap, y: ny * overlap };
}

/**
 * Check circle-rectangle collision
 */
function circleRectCollision(
  circlePos: Position,
  circleRadius: number,
  rectCenter: Position,
  halfWidth: number,
  halfHeight: number
): boolean {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(
    rectCenter.x - halfWidth,
    Math.min(circlePos.x, rectCenter.x + halfWidth)
  );
  const closestY = Math.max(
    rectCenter.y - halfHeight,
    Math.min(circlePos.y, rectCenter.y + halfHeight)
  );
  
  const distX = circlePos.x - closestX;
  const distY = circlePos.y - closestY;
  
  return (distX * distX + distY * distY) < (circleRadius * circleRadius);
}

/**
 * Check if position is inside arena bounds
 */
export function isInsideArena(position: Position, arena: Arena): boolean {
  switch (arena.shape) {
    case 'circle':
      return insideCircle(position, arena.center, arena.radius);
    
    case 'ring':
      const outerOk = insideCircle(position, arena.center, arena.radius);
      const innerClear = !insideCircle(position, arena.center, arena.innerRadius || 0);
      return outerOk && innerClear;
    
    case 'octagon':
      // Simplified octagon check using inscribed circle
      return insideCircle(position, arena.center, arena.radius * 0.92);
    
    case 'square':
      return insideRect(position, arena.center, arena.radius, arena.radius);
    
    case 'irregular':
      // Use 85% of radius for irregular shapes
      return insideCircle(position, arena.center, arena.radius * 0.85);
    
    default:
      return insideCircle(position, arena.center, arena.radius);
  }
}

/**
 * Constrain position to arena bounds
 */
export function constrainToArena(position: Position, arena: Arena): Position {
  const dist = distance2D(position, arena.center);
  
  if (dist <= arena.radius) {
    return position;
  }
  
  // Push back to edge
  const factor = arena.radius / dist;
  return {
    x: arena.center.x + (position.x - arena.center.x) * factor,
    y: arena.center.y + (position.y - arena.center.y) * factor,
  };
}

/**
 * Resolve collision by pushing position out
 */
export function resolveCollision(
  position: Position,
  collision: CollisionResult
): Position {
  if (!collision.collides || !collision.penetration) {
    return position;
  }
  
  return {
    x: position.x + collision.penetration.x,
    y: position.y + collision.penetration.y,
  };
}

/**
 * Check line of sight between two positions
 */
export function hasLineOfSight(
  from: Position,
  to: Position,
  obstacles: Obstacle[]
): boolean {
  const samples = 10;
  
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const samplePos: Position = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    
    const collision = checkObstacleCollision(samplePos, 0.1, obstacles);
    if (collision.collides) {
      return false;
    }
  }
  
  return true;
}

/**
 * Find nearest cover position
 */
export function findNearestCover(
  position: Position,
  obstacles: Obstacle[]
): Position | null {
  let nearest: Position | null = null;
  let nearestDist = Infinity;
  
  for (const obstacle of obstacles) {
    if (!obstacle.provideCover) continue;
    
    const coverPos: Position = {
      x: obstacle.position.x,
      y: obstacle.position.y,
    };
    
    const dist = distance2D(position, coverPos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = coverPos;
    }
  }
  
  return nearest;
}
