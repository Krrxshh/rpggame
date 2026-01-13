/**
 * Safe Zone System
 * Safe areas where enemies don't spawn/attack
 * NEW FILE
 */

export interface SafeZone {
  id: string;
  center: { x: number; z: number };
  radius: number;
  type: 'campfire' | 'shrine' | 'village' | 'checkpoint';
  hasRestPoint: boolean;
  name: string;
}

export interface SafeZoneState {
  zones: SafeZone[];
  playerInSafeZone: boolean;
  currentZone: SafeZone | null;
  safeMode: boolean; // Global safe mode toggle for exploration
}

export function createSafeZoneState(): SafeZoneState {
  return {
    zones: [],
    playerInSafeZone: false,
    currentZone: null,
    safeMode: false,
  };
}

export function addSafeZone(
  state: SafeZoneState,
  zone: Omit<SafeZone, 'id'>
): SafeZoneState {
  const id = `zone-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    ...state,
    zones: [...state.zones, { ...zone, id }],
  };
}

export function isPositionInSafeZone(
  state: SafeZoneState,
  position: { x: number; z: number }
): { inZone: boolean; zone: SafeZone | null } {
  for (const zone of state.zones) {
    const dx = position.x - zone.center.x;
    const dz = position.z - zone.center.z;
    const distSq = dx * dx + dz * dz;
    
    if (distSq < zone.radius * zone.radius) {
      return { inZone: true, zone };
    }
  }
  return { inZone: false, zone: null };
}

export function updatePlayerSafeZone(
  state: SafeZoneState,
  playerPosition: { x: number; z: number }
): SafeZoneState {
  const { inZone, zone } = isPositionInSafeZone(state, playerPosition);
  
  if (inZone === state.playerInSafeZone && zone?.id === state.currentZone?.id) {
    return state;
  }
  
  return {
    ...state,
    playerInSafeZone: inZone,
    currentZone: zone,
  };
}

export function toggleSafeMode(state: SafeZoneState): SafeZoneState {
  return {
    ...state,
    safeMode: !state.safeMode,
  };
}

export function isEnemyAllowedAt(
  state: SafeZoneState,
  enemyPosition: { x: number; z: number }
): boolean {
  if (state.safeMode) return false;
  
  const { inZone } = isPositionInSafeZone(state, enemyPosition);
  return !inZone;
}

export function getRestPoints(state: SafeZoneState): SafeZone[] {
  return state.zones.filter(z => z.hasRestPoint);
}

export default {
  createSafeZoneState,
  addSafeZone,
  isPositionInSafeZone,
  updatePlayerSafeZone,
  toggleSafeMode,
  isEnemyAllowedAt,
  getRestPoints,
};
