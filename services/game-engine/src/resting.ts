/**
 * Resting System
 * HP recovery, time advancement, savepoints
 * NEW FILE
 */

import type { PlayerState } from './playerController';
import type { TimeState } from '../../renderer/src/DayNightCycle';

export interface RestState {
  isResting: boolean;
  restProgress: number; // 0-1
  restDuration: number; // seconds
  healPerSecond: number;
  staminaRegenMultiplier: number;
}

export interface RestResult {
  player: PlayerState;
  timeAdvanced: number; // hours
  wasInterrupted: boolean;
}

export const DEFAULT_REST_CONFIG = {
  restDuration: 5, // seconds in real time
  healAmount: 100, // Total HP healed
  staminaRegenMultiplier: 5,
  timeAdvanceHours: 6,
};

export function createRestState(): RestState {
  return {
    isResting: false,
    restProgress: 0,
    restDuration: DEFAULT_REST_CONFIG.restDuration,
    healPerSecond: DEFAULT_REST_CONFIG.healAmount / DEFAULT_REST_CONFIG.restDuration,
    staminaRegenMultiplier: DEFAULT_REST_CONFIG.staminaRegenMultiplier,
  };
}

export function startResting(restState: RestState): RestState {
  return {
    ...restState,
    isResting: true,
    restProgress: 0,
  };
}

export function updateResting(
  restState: RestState,
  player: PlayerState,
  deltaSeconds: number
): { restState: RestState; player: PlayerState; completed: boolean } {
  if (!restState.isResting) {
    return { restState, player, completed: false };
  }
  
  const newProgress = restState.restProgress + deltaSeconds / restState.restDuration;
  const healAmount = restState.healPerSecond * deltaSeconds;
  const staminaAmount = 10 * restState.staminaRegenMultiplier * deltaSeconds;
  
  const newPlayer = {
    ...player,
    hp: Math.min(player.maxHp, player.hp + healAmount),
    stamina: Math.min(player.maxStamina, player.stamina + staminaAmount),
  };
  
  if (newProgress >= 1) {
    // Rest complete
    return {
      restState: {
        ...restState,
        isResting: false,
        restProgress: 1,
      },
      player: {
        ...newPlayer,
        hp: player.maxHp, // Full heal on complete
        stamina: player.maxStamina,
      },
      completed: true,
    };
  }
  
  return {
    restState: {
      ...restState,
      restProgress: newProgress,
    },
    player: newPlayer,
    completed: false,
  };
}

export function cancelResting(restState: RestState): RestState {
  return {
    ...restState,
    isResting: false,
    restProgress: 0,
  };
}

export function canRest(
  player: PlayerState,
  isInSafeZone: boolean,
  hasRestPoint: boolean
): { canRest: boolean; reason?: string } {
  if (!isInSafeZone) {
    return { canRest: false, reason: 'Must be in a safe zone to rest' };
  }
  
  if (!hasRestPoint) {
    return { canRest: false, reason: 'No rest point nearby' };
  }
  
  if (player.hp >= player.maxHp && player.stamina >= player.maxStamina) {
    return { canRest: false, reason: 'Already at full health' };
  }
  
  return { canRest: true };
}

export default {
  createRestState,
  startResting,
  updateResting,
  cancelResting,
  canRest,
  DEFAULT_REST_CONFIG,
};
