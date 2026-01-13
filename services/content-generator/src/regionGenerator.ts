/**
 * Region Generator - Procedural chunked world for action RPG
 * NEW FILE - extends content-generator
 */

import type { RNG } from '../../utils/src/rng';
import { createRNG } from '../../utils/src/rng';
import { generatePalette, type LightingPreset } from '../../utils/src/color';

export type BiomeType = 'darkForest' | 'mistlands' | 'cursedSwamp' | 'ashenPlains';

export interface ChunkPosition { x: number; z: number; }

export interface ChunkObstacle {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  height: number;
  type: 'tree' | 'rock' | 'pillar' | 'ruin';
}

export interface Chunk {
  id: string;
  position: ChunkPosition;
  seed: number;
  biome: BiomeType;
  palette: ReturnType<typeof generatePalette>;
  lightingPreset: LightingPreset;
  fogDensity: number;
  obstacles: ChunkObstacle[];
  worldProgress: number;
}

export const CHUNK_SIZE = 40;
export const LOAD_RADIUS = 2;

export function getChunkKey(pos: ChunkPosition): string {
  return `${pos.x},${pos.z}`;
}

export function getChunkForPosition(worldX: number, worldZ: number): ChunkPosition {
  return { x: Math.floor(worldX / CHUNK_SIZE), z: Math.floor(worldZ / CHUNK_SIZE) };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function generateChunk(
  position: ChunkPosition,
  baseSeed: number | string,
  worldProgress: number = 0
): Chunk {
  const chunkSeed = hashSeed(`${baseSeed}-chunk-${position.x}-${position.z}`);
  const rng = createRNG(chunkSeed);
  
  const biomes: BiomeType[] = ['darkForest', 'mistlands', 'cursedSwamp', 'ashenPlains'];
  const dist = Math.sqrt(position.x ** 2 + position.z ** 2);
  const biome = biomes[Math.floor(dist % biomes.length)];
  
  const presets: LightingPreset[] = ['dark', 'pastel', 'neon', 'sunset'];
  const lightingPreset = presets[biomes.indexOf(biome)];
  const palette = generatePalette(rng, lightingPreset);
  
  const obstacles: ChunkObstacle[] = [];
  const count = rng.range(8, 16);
  const chunkWorldX = position.x * CHUNK_SIZE;
  const chunkWorldZ = position.z * CHUNK_SIZE;
  
  for (let i = 0; i < count; i++) {
    obstacles.push({
      id: `obs-${position.x}-${position.z}-${i}`,
      position: {
        x: chunkWorldX + rng.rangeFloat(2, CHUNK_SIZE - 2),
        y: 0,
        z: chunkWorldZ + rng.rangeFloat(2, CHUNK_SIZE - 2),
      },
      radius: rng.rangeFloat(0.8, 2),
      height: rng.rangeFloat(2, 6),
      type: rng.pick(['tree', 'rock', 'pillar', 'ruin']),
    });
  }
  
  return {
    id: getChunkKey(position),
    position,
    seed: chunkSeed,
    biome,
    palette,
    lightingPreset,
    fogDensity: 0.08 * (1 - worldProgress * 0.5),
    obstacles,
    worldProgress,
  };
}

export interface WorldState {
  seed: string | number;
  chunks: Map<string, Chunk>;
  loadedChunks: Set<string>;
  worldProgress: number;
}

export function createWorldState(seed: string | number): WorldState {
  return { seed, chunks: new Map(), loadedChunks: new Set(), worldProgress: 0 };
}

export function updateWorldState(state: WorldState, playerPos: { x: number; z: number }): WorldState {
  const newState = { ...state, chunks: new Map(state.chunks), loadedChunks: new Set(state.loadedChunks) };
  const playerChunk = getChunkForPosition(playerPos.x, playerPos.z);
  
  for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      const pos = { x: playerChunk.x + dx, z: playerChunk.z + dz };
      const key = getChunkKey(pos);
      if (!newState.chunks.has(key)) {
        newState.chunks.set(key, generateChunk(pos, state.seed, state.worldProgress));
      }
      newState.loadedChunks.add(key);
    }
  }
  return newState;
}

export function getLoadedChunks(state: WorldState): Chunk[] {
  return Array.from(state.loadedChunks).map(k => state.chunks.get(k)!).filter(Boolean);
}

export default { generateChunk, createWorldState, updateWorldState, getLoadedChunks, CHUNK_SIZE };
