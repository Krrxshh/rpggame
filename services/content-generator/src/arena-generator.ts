/**
 * Arena Generator
 * Procedural arena generation with multiple shapes
 */

import type { RNG } from '../../utils/src/rng';
import type { Arena, ArenaShape } from '../../game-engine/src/types';
import { MIN_ARENA_RADIUS, MAX_ARENA_RADIUS } from '../../game-engine/src/types';

const ARENA_SHAPES: ArenaShape[] = ['circle', 'ring', 'octagon', 'square', 'irregular'];

/**
 * Generate an arena for a floor
 */
export function generateArena(floorNumber: number, rng: RNG): Arena {
  // Arena gets slightly larger on higher floors
  const sizeScale = Math.min(floorNumber / 20, 1);
  const baseRadius = MIN_ARENA_RADIUS + (MAX_ARENA_RADIUS - MIN_ARENA_RADIUS) * sizeScale * 0.5;
  const radiusVariance = rng.rangeFloat(-2, 2);
  const radius = Math.max(MIN_ARENA_RADIUS, Math.min(MAX_ARENA_RADIUS, baseRadius + radiusVariance));
  
  // Pick arena shape based on floor and RNG
  const shape = selectArenaShape(floorNumber, rng);
  
  const arena: Arena = {
    shape,
    radius,
    center: { x: 0, y: 0 },
    bounds: {
      minX: -radius,
      maxX: radius,
      minY: -radius,
      maxY: radius,
    },
  };
  
  // Add inner radius for ring shape
  if (shape === 'ring') {
    arena.innerRadius = radius * rng.rangeFloat(0.3, 0.5);
  }
  
  return arena;
}

/**
 * Select arena shape based on floor and RNG
 */
function selectArenaShape(floorNumber: number, rng: RNG): ArenaShape {
  // First few floors are simpler shapes
  if (floorNumber <= 2) {
    return rng.pick(['circle', 'square']);
  }
  
  if (floorNumber <= 5) {
    return rng.pick(['circle', 'square', 'octagon']);
  }
  
  // Higher floors can have any shape
  return rng.pick(ARENA_SHAPES);
}

/**
 * Get arena vertices for rendering (polygon approximation)
 */
export function getArenaVertices(arena: Arena, segments: number = 32): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = [];
  
  switch (arena.shape) {
    case 'circle':
    case 'ring':
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        vertices.push({
          x: arena.center.x + Math.cos(angle) * arena.radius,
          y: arena.center.y + Math.sin(angle) * arena.radius,
        });
      }
      break;
    
    case 'octagon':
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
        vertices.push({
          x: arena.center.x + Math.cos(angle) * arena.radius,
          y: arena.center.y + Math.sin(angle) * arena.radius,
        });
      }
      break;
    
    case 'square':
      vertices.push(
        { x: arena.center.x - arena.radius, y: arena.center.y - arena.radius },
        { x: arena.center.x + arena.radius, y: arena.center.y - arena.radius },
        { x: arena.center.x + arena.radius, y: arena.center.y + arena.radius },
        { x: arena.center.x - arena.radius, y: arena.center.y + arena.radius }
      );
      break;
    
    case 'irregular':
      // Wobbly circle
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wobble = 0.85 + 0.15 * Math.sin(angle * 3) * Math.cos(angle * 2);
        vertices.push({
          x: arena.center.x + Math.cos(angle) * arena.radius * wobble,
          y: arena.center.y + Math.sin(angle) * arena.radius * wobble,
        });
      }
      break;
  }
  
  return vertices;
}
