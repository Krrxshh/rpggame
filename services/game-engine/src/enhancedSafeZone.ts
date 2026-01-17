/**
 * Enhanced Safe Zone System
 * CHANGELOG v1.0.0: Safe zones with rest mechanics
 * - Zone detection and transition
 * - Rest prompt and healing
 * - Time advancement
 * - Checkpoint saving
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export interface SafeZone {
  id: string;
  name: string;
  position: { x: number; z: number };
  radius: number;
  type: 'campfire' | 'shrine' | 'village' | 'cave';
  hasRested: boolean;
  discoveredAt: number | null;
}

export interface RestResult {
  hpRestored: number;
  staminaRestored: number;
  manaRestored: number;
  timeAdvanced: number; // Hours
  buffApplied?: { type: string; duration: number };
}

export interface SafeZoneState {
  zones: SafeZone[];
  currentZone: SafeZone | null;
  isInSafeZone: boolean;
  canRest: boolean;
  restProgress: number;
  lastRestTime: number;
}

// === CONSTANTS ===

export const SAFE_ZONE_TYPES = {
  campfire: {
    healMultiplier: 1.0,
    timeAdvance: 6,
    radius: 5,
    buffType: null,
  },
  shrine: {
    healMultiplier: 1.2,
    timeAdvance: 4,
    radius: 8,
    buffType: 'blessing',
  },
  village: {
    healMultiplier: 1.5,
    timeAdvance: 8,
    radius: 20,
    buffType: null,
  },
  cave: {
    healMultiplier: 0.8,
    timeAdvance: 6,
    radius: 10,
    buffType: 'shelter',
  },
};

// === ZONE GENERATION ===

export function generateSafeZones(
  worldSeed: number,
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  density: number, // Zones per 200x200 area
  rng: RNG
): SafeZone[] {
  const zones: SafeZone[] = [];
  
  const areaWidth = area.maxX - area.minX;
  const areaHeight = area.maxZ - area.minZ;
  const areaSize = areaWidth * areaHeight;
  const zoneCount = Math.floor(density * areaSize / 40000);
  
  const types: Array<'campfire' | 'shrine' | 'village' | 'cave'> = ['campfire', 'shrine', 'village', 'cave'];
  const typeWeights = [5, 2, 1, 3];
  const totalWeight = typeWeights.reduce((a, b) => a + b, 0);
  
  for (let i = 0; i < zoneCount; i++) {
    // Pick type
    let roll = rng.rangeFloat(0, totalWeight);
    let typeIndex = 0;
    for (let j = 0; j < types.length; j++) {
      roll -= typeWeights[j];
      if (roll <= 0) {
        typeIndex = j;
        break;
      }
    }
    
    const type = types[typeIndex];
    const typeConfig = SAFE_ZONE_TYPES[type];
    
    const x = rng.rangeFloat(area.minX + 20, area.maxX - 20);
    const z = rng.rangeFloat(area.minZ + 20, area.maxZ - 20);
    
    zones.push({
      id: `zone-${worldSeed}-${i}`,
      name: generateZoneName(type, rng),
      position: { x, z },
      radius: typeConfig.radius * rng.rangeFloat(0.8, 1.2),
      type,
      hasRested: false,
      discoveredAt: null,
    });
  }
  
  return zones;
}

function generateZoneName(type: 'campfire' | 'shrine' | 'village' | 'cave', rng: RNG): string {
  const prefixes = {
    campfire: ['Traveler\'s', 'Wanderer\'s', 'Hunter\'s', 'Old'],
    shrine: ['Ancient', 'Sacred', 'Forgotten', 'Spirit'],
    village: ['Quiet', 'Hidden', 'Mountain', 'Forest'],
    cave: ['Dark', 'Crystal', 'Echo', 'Shadow'],
  };
  
  const suffixes = {
    campfire: ['Rest', 'Camp', 'Fire', 'Haven'],
    shrine: ['Shrine', 'Altar', 'Stone', 'Monument'],
    village: ['Village', 'Settlement', 'Hamlet', 'Outpost'],
    cave: ['Cave', 'Cavern', 'Hollow', 'Grotto'],
  };
  
  const prefix = rng.pick(prefixes[type]);
  const suffix = rng.pick(suffixes[type]);
  
  return `${prefix} ${suffix}`;
}

// === STATE MANAGEMENT ===

export function createSafeZoneState(zones: SafeZone[] = []): SafeZoneState {
  return {
    zones,
    currentZone: null,
    isInSafeZone: false,
    canRest: true,
    restProgress: 0,
    lastRestTime: 0,
  };
}

export function checkSafeZone(
  state: SafeZoneState,
  playerPos: { x: number; z: number }
): SafeZoneState {
  const newState = { ...state };
  
  let foundZone: SafeZone | null = null;
  
  for (const zone of state.zones) {
    const dx = playerPos.x - zone.position.x;
    const dz = playerPos.z - zone.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < zone.radius) {
      foundZone = zone;
      
      // Mark as discovered
      if (!zone.discoveredAt) {
        const zoneIndex = state.zones.findIndex(z => z.id === zone.id);
        if (zoneIndex >= 0) {
          newState.zones = [...state.zones];
          newState.zones[zoneIndex] = { ...zone, discoveredAt: Date.now() };
        }
      }
      break;
    }
  }
  
  newState.currentZone = foundZone;
  newState.isInSafeZone = !!foundZone;
  
  return newState;
}

// === REST MECHANIC ===

export function executeRest(
  state: SafeZoneState,
  playerHp: number,
  maxHp: number,
  playerStamina: number,
  maxStamina: number,
  playerMana: number,
  maxMana: number,
  currentTime: number // World time in hours
): { state: SafeZoneState; result: RestResult; newTime: number } | null {
  if (!state.currentZone || !state.isInSafeZone) {
    return null;
  }
  
  const zone = state.currentZone;
  const typeConfig = SAFE_ZONE_TYPES[zone.type];
  
  // Calculate restoration
  const hpRestored = Math.floor((maxHp - playerHp) * typeConfig.healMultiplier);
  const staminaRestored = maxStamina - playerStamina;
  const manaRestored = maxMana - playerMana;
  
  // Time advancement
  const timeAdvanced = typeConfig.timeAdvance;
  const newTime = (currentTime + timeAdvanced) % 24;
  
  // Buff from shrine
  let buffApplied: { type: string; duration: number } | undefined;
  if (typeConfig.buffType) {
    buffApplied = {
      type: typeConfig.buffType,
      duration: 300, // 5 minutes
    };
  }
  
  // Update state  
  const newState = { ...state };
  const zoneIndex = state.zones.findIndex(z => z.id === zone.id);
  if (zoneIndex >= 0) {
    newState.zones = [...state.zones];
    newState.zones[zoneIndex] = { ...zone, hasRested: true };
  }
  newState.lastRestTime = Date.now();
  
  return {
    state: newState,
    result: {
      hpRestored,
      staminaRestored,
      manaRestored,
      timeAdvanced,
      buffApplied,
    },
    newTime,
  };
}

// === ENEMY RESTRICTION ===

export function canEnemyEnterZone(
  enemyPos: { x: number; z: number },
  zones: SafeZone[]
): boolean {
  for (const zone of zones) {
    const dx = enemyPos.x - zone.position.x;
    const dz = enemyPos.z - zone.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < zone.radius * 1.5) {
      // Enemies can't enter extended safe zone area
      return false;
    }
  }
  
  return true;
}

export function getEnemyAvoidanceDirection(
  enemyPos: { x: number; z: number },
  zones: SafeZone[]
): { x: number; z: number } | null {
  for (const zone of zones) {
    const dx = enemyPos.x - zone.position.x;
    const dz = enemyPos.z - zone.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < zone.radius * 2 && distance > 0.1) {
      // Push enemy away from zone
      return {
        x: dx / distance,
        z: dz / distance,
      };
    }
  }
  
  return null;
}

// === CHECKPOINT SYSTEM ===

export interface Checkpoint {
  zoneId: string;
  position: { x: number; y: number; z: number };
  timestamp: number;
  worldTime: number;
}

export function createCheckpoint(
  zone: SafeZone,
  playerY: number,
  worldTime: number
): Checkpoint {
  return {
    zoneId: zone.id,
    position: { x: zone.position.x, y: playerY, z: zone.position.z },
    timestamp: Date.now(),
    worldTime,
  };
}

export function getLastCheckpoint(checkpoints: Checkpoint[]): Checkpoint | null {
  if (checkpoints.length === 0) return null;
  return checkpoints.reduce((latest, cp) => 
    cp.timestamp > latest.timestamp ? cp : latest
  );
}

export default {
  SAFE_ZONE_TYPES,
  generateSafeZones,
  createSafeZoneState,
  checkSafeZone,
  executeRest,
  canEnemyEnterZone,
  getEnemyAvoidanceDirection,
  createCheckpoint,
  getLastCheckpoint,
};
