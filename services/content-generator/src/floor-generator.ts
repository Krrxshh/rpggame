/**
 * Floor Generator
 * Main procedural floor generation with validation and retry
 */

import type { RNG } from '../../utils/src/rng';
import { createRNG } from '../../utils/src/rng';
import { generatePalette, type LightingPreset } from '../../utils/src/color';
import type { FloorPayload, SpawnPoint, Arena } from '../../game-engine/src/types';
import { validateFloorPayload } from '../../game-engine/src/validation';
import { generateArena } from './arena-generator';
import { generateEnemy } from './enemy-generator';
import { generateObstacles, generateHazards } from './obstacle-generator';
import { createSafeFloor } from './safe-floor';

const LIGHTING_PRESETS: LightingPreset[] = ['neon', 'lowpoly', 'pastel', 'wireframe', 'dark', 'sunset'];
const MAX_GENERATION_RETRIES = 3;

/**
 * Generate a complete floor with validation and retry
 */
export function generateFloor(
  floorNumber: number,
  baseSeed: number | string,
  retryCount: number = 0
): FloorPayload {
  // Create floor-specific seed
  const floorSeed = typeof baseSeed === 'string'
    ? hashFloorSeed(baseSeed, floorNumber, retryCount)
    : baseSeed + floorNumber * 1000 + retryCount * 100;
  
  const rng = createRNG(floorSeed);
  
  // Generate arena
  const arena = generateArena(floorNumber, rng);
  
  // Generate lighting and palette
  const lightingPreset = selectLightingPreset(floorNumber, rng);
  const palette = generatePalette(rng, lightingPreset);
  
  // Generate obstacles and hazards
  const obstacles = generateObstacles(arena, floorNumber, rng);
  const hazards = generateHazards(arena, obstacles, floorNumber, palette.hazard, rng);
  
  // Generate spawns
  const playerSpawn = generatePlayerSpawn(arena, obstacles, rng);
  const enemySpawn = generateEnemySpawn(arena, obstacles, playerSpawn, rng);
  
  // Generate enemy
  const enemy = generateEnemy(floorNumber, rng, palette.enemy);
  enemy.position = { ...enemySpawn.position };
  
  const payload: FloorPayload = {
    floorNumber,
    seed: floorSeed,
    arena,
    enemy,
    obstacles,
    hazards,
    playerSpawn,
    enemySpawn,
    palette,
    lightingPreset,
  };
  
  // Validate
  const validation = validateFloorPayload(payload);
  
  if (!validation.valid) {
    console.warn(`Floor ${floorNumber} validation failed (attempt ${retryCount + 1}):`, validation.errors);
    
    if (retryCount < MAX_GENERATION_RETRIES) {
      return generateFloor(floorNumber, baseSeed, retryCount + 1);
    }
    
    // Fallback to safe floor
    console.warn(`Using safe floor for floor ${floorNumber}`);
    return createSafeFloor(floorNumber, floorSeed);
  }
  
  return payload;
}

/**
 * Hash a string seed with floor number
 */
function hashFloorSeed(baseSeed: string, floorNumber: number, retry: number): number {
  const combined = `${baseSeed}-floor${floorNumber}-retry${retry}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Select lighting preset based on floor
 */
function selectLightingPreset(floorNumber: number, rng: RNG): LightingPreset {
  // Certain presets unlock at higher floors
  if (floorNumber <= 2) {
    return rng.pick(['lowpoly', 'pastel']);
  }
  if (floorNumber <= 5) {
    return rng.pick(['lowpoly', 'pastel', 'neon']);
  }
  return rng.pick(LIGHTING_PRESETS);
}

/**
 * Generate player spawn point
 */
function generatePlayerSpawn(
  arena: Arena,
  obstacles: Array<{ position: { x: number; y: number }; radius?: number }>,
  rng: RNG
): SpawnPoint {
  const maxAttempts = 30;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Player spawns in bottom half of arena
    const angle = rng.rangeFloat(-Math.PI * 0.8, -Math.PI * 0.2);
    const dist = arena.radius * rng.rangeFloat(0.4, 0.7);
    
    const position = {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      z: 0,
    };
    
    // Check not overlapping obstacles
    let valid = true;
    for (const obs of obstacles) {
      const dx = position.x - obs.position.x;
      const dy = position.y - obs.position.y;
      const distToObs = Math.sqrt(dx * dx + dy * dy);
      if (distToObs < (obs.radius || 1.5) + 1.5) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      return {
        position,
        facing: Math.PI / 2, // Facing up
      };
    }
  }
  
  // Fallback: center-bottom
  return {
    position: { x: 0, y: -arena.radius * 0.5, z: 0 },
    facing: Math.PI / 2,
  };
}

/**
 * Generate enemy spawn point
 */
function generateEnemySpawn(
  arena: Arena,
  obstacles: Array<{ position: { x: number; y: number }; radius?: number }>,
  playerSpawn: SpawnPoint,
  rng: RNG
): SpawnPoint {
  const maxAttempts = 30;
  const minDistFromPlayer = 4;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Enemy spawns in top half of arena
    const angle = rng.rangeFloat(Math.PI * 0.2, Math.PI * 0.8);
    const dist = arena.radius * rng.rangeFloat(0.4, 0.7);
    
    const position = {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      z: 0,
    };
    
    // Check distance from player
    const dx = position.x - playerSpawn.position.x;
    const dy = position.y - playerSpawn.position.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    if (distToPlayer < minDistFromPlayer) continue;
    
    // Check not overlapping obstacles
    let valid = true;
    for (const obs of obstacles) {
      const odx = position.x - obs.position.x;
      const ody = position.y - obs.position.y;
      const distToObs = Math.sqrt(odx * odx + ody * ody);
      if (distToObs < (obs.radius || 1.5) + 1.5) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      return {
        position,
        facing: -Math.PI / 2, // Facing down toward player
      };
    }
  }
  
  // Fallback: center-top
  return {
    position: { x: 0, y: arena.radius * 0.5, z: 0 },
    facing: -Math.PI / 2,
  };
}

/**
 * Quick generate for testing/preview (skips validation)
 */
export function quickGenerateFloor(floorNumber: number, seed: number): FloorPayload {
  const rng = createRNG(seed + floorNumber * 1000);
  const arena = generateArena(floorNumber, rng);
  const lightingPreset = selectLightingPreset(floorNumber, rng);
  const palette = generatePalette(rng, lightingPreset);
  const obstacles = generateObstacles(arena, floorNumber, rng);
  const hazards = generateHazards(arena, obstacles, floorNumber, palette.hazard, rng);
  const playerSpawn = generatePlayerSpawn(arena, obstacles, rng);
  const enemySpawn = generateEnemySpawn(arena, obstacles, playerSpawn, rng);
  const enemy = generateEnemy(floorNumber, rng, palette.enemy);
  enemy.position = { ...enemySpawn.position };
  
  return {
    floorNumber,
    seed: seed + floorNumber * 1000,
    arena,
    enemy,
    obstacles,
    hazards,
    playerSpawn,
    enemySpawn,
    palette,
    lightingPreset,
  };
}
