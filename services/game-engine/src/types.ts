/**
 * Game Engine Types
 * Core type definitions for the roguelike game
 */

// ==================== ARENA TYPES ====================

export type ArenaShape = 'circle' | 'ring' | 'octagon' | 'square' | 'irregular';

export interface Arena {
  shape: ArenaShape;
  radius: number;
  innerRadius?: number; // For ring shape
  center: { x: number; y: number };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

// ==================== OBSTACLE TYPES ====================

export type ObstacleType = 'cover' | 'pillar' | 'platform' | 'blocker';

export interface Obstacle {
  type: ObstacleType;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  radius?: number; // For circular obstacles
  provideCover: boolean;
  destructible: boolean;
}

// ==================== HAZARD TYPES ====================

export type HazardType = 'damage' | 'slow' | 'knockback';

export interface HazardZone {
  type: HazardType;
  position: { x: number; y: number };
  radius: number;
  damage: number;
  timing: {
    active: boolean;
    interval: number; // ms between activations
    duration: number; // ms active time
    offset: number; // ms initial offset
  };
  visualHint: string; // color hex
}

// ==================== SPAWN TYPES ====================

export interface SpawnPoint {
  position: { x: number; y: number; z: number };
  facing: number; // radians
}

// ==================== ENTITY TYPES ====================

export interface Player {
  hp: number;
  maxHp: number;
  atk: number;
  defense: number;
  dodgeChance: number;
  position: { x: number; y: number; z: number };
  itemUsed: boolean;
  inCover: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: {
    power: number;
    accuracy: number;
  };
  position: { x: number; y: number; z: number };
  behavior: 'aggressive' | 'defensive' | 'random';
  visualType: 'sphere' | 'cube' | 'pyramid' | 'complex';
  color: string;
}

// ==================== COMBAT TYPES ====================

export type CombatAction = 'attack' | 'defend' | 'item' | 'risky';

export interface CombatResult {
  action: CombatAction;
  success: boolean;
  playerDamageDealt: number;
  playerDamageTaken: number;
  playerHealed: number;
  enemyDefeated: boolean;
  critical: boolean;
  dodged: boolean;
  message: string;
  turnDefenseBonus: number;
}

export interface TurnState {
  turnNumber: number;
  playerDefenseBonus: number;
  enemyDefenseBonus: number;
}

// ==================== FLOOR TYPES ====================

export type LightingPreset = 'neon' | 'lowpoly' | 'pastel' | 'wireframe' | 'dark' | 'sunset';

export interface FloorPayload {
  floorNumber: number;
  seed: number;
  arena: Arena;
  enemy: Enemy;
  obstacles: Obstacle[];
  hazards: HazardZone[];
  playerSpawn: SpawnPoint;
  enemySpawn: SpawnPoint;
  palette: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    enemy: string;
    hazard: string;
  };
  lightingPreset: LightingPreset;
}

// ==================== VALIDATION TYPES ====================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ==================== GAME STATE TYPES ====================

export type GamePhase = 'menu' | 'playing' | 'combat' | 'victory' | 'gameover' | 'transition';

export interface GameState {
  phase: GamePhase;
  seed: string;
  floorNumber: number;
  totalEnemiesDefeated: number;
  startTime: number;
}

// ==================== CONSTANTS ====================

export const INITIAL_PLAYER: Omit<Player, 'position'> = {
  hp: 10,
  maxHp: 10,
  atk: 2,
  defense: 0,
  dodgeChance: 0.05,
  itemUsed: false,
  inCover: false,
};

export const MAX_OBSTACLES_PER_FLOOR = 12;
export const MAX_HAZARDS_PER_FLOOR = 5;
export const MAX_ENEMY_ATTACK_POWER = 8;
export const MIN_ARENA_RADIUS = 8;
export const MAX_ARENA_RADIUS = 20;
