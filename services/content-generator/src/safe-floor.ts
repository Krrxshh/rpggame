/**
 * Safe Floor Fallback
 * Guaranteed valid floor when generation fails
 */

import type { FloorPayload, LightingPreset } from '../../game-engine/src/types';

/**
 * Create a safe fallback floor that always passes validation
 */
export function createSafeFloor(floorNumber: number, seed: number): FloorPayload {
  const radius = 10;
  
  return {
    floorNumber,
    seed,
    arena: {
      shape: 'circle',
      radius,
      center: { x: 0, y: 0 },
      bounds: {
        minX: -radius,
        maxX: radius,
        minY: -radius,
        maxY: radius,
      },
    },
    enemy: {
      id: `safe-enemy-${floorNumber}`,
      name: 'Training Dummy',
      hp: Math.max(1, 3 + floorNumber),
      maxHp: Math.max(1, 3 + floorNumber),
      attack: {
        power: Math.min(3, 1 + Math.floor(floorNumber / 3)),
        accuracy: 0.7,
      },
      position: { x: 0, y: 4, z: 0 },
      behavior: 'defensive',
      visualType: 'sphere',
      color: '#ff4444',
    },
    obstacles: [
      {
        type: 'cover',
        position: { x: -3, y: 0, z: 0 },
        size: { width: 2, height: 1.2, depth: 0.8 },
        provideCover: true,
        destructible: false,
      },
      {
        type: 'cover',
        position: { x: 3, y: 0, z: 0 },
        size: { width: 2, height: 1.2, depth: 0.8 },
        provideCover: true,
        destructible: false,
      },
    ],
    hazards: [],
    playerSpawn: {
      position: { x: 0, y: -4, z: 0 },
      facing: Math.PI / 2,
    },
    enemySpawn: {
      position: { x: 0, y: 4, z: 0 },
      facing: -Math.PI / 2,
    },
    palette: {
      background: '#1a1a2e',
      primary: '#4a4a8a',
      secondary: '#6a6aaa',
      accent: '#8888ff',
      enemy: '#ff4444',
      hazard: '#ff8800',
    },
    lightingPreset: 'dark' as LightingPreset,
  };
}
