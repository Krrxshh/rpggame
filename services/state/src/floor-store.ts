/**
 * Floor State Store
 * Zustand store for current floor and enemy state
 */

import { create } from 'zustand';
import type { FloorPayload, Enemy, TurnState } from '../../game-engine/src/types';
import { createTurnState } from '../../game-engine/src/combat';

interface FloorState {
  // State
  currentFloor: FloorPayload | null;
  enemy: Enemy | null;
  turnState: TurnState;
  combatLog: string[];
  
  // Actions
  setFloor: (floor: FloorPayload) => void;
  setEnemy: (enemy: Enemy) => void;
  damageEnemy: (amount: number) => void;
  advanceTurn: (defenseBonus: number) => void;
  addCombatLog: (message: string) => void;
  clearCombatLog: () => void;
  reset: () => void;
}

export const useFloorStore = create<FloorState>((set, get) => ({
  currentFloor: null,
  enemy: null,
  turnState: createTurnState(),
  combatLog: [],

  setFloor: (floor: FloorPayload) => {
    set({
      currentFloor: floor,
      enemy: { ...floor.enemy },
      turnState: createTurnState(),
      combatLog: [],
    });
  },

  setEnemy: (enemy: Enemy) => {
    set({ enemy });
  },

  damageEnemy: (amount: number) => {
    const state = get();
    if (!state.enemy) return;
    
    set({
      enemy: {
        ...state.enemy,
        hp: Math.max(0, state.enemy.hp - amount),
      },
    });
  },

  advanceTurn: (defenseBonus: number) => {
    set((state) => ({
      turnState: {
        turnNumber: state.turnState.turnNumber + 1,
        playerDefenseBonus: defenseBonus,
        enemyDefenseBonus: 0,
      },
    }));
  },

  addCombatLog: (message: string) => {
    set((state) => ({
      combatLog: [...state.combatLog, message].slice(-10), // Keep last 10 messages
    }));
  },

  clearCombatLog: () => {
    set({ combatLog: [] });
  },

  reset: () => {
    set({
      currentFloor: null,
      enemy: null,
      turnState: createTurnState(),
      combatLog: [],
    });
  },
}));

// Selectors
export const selectCurrentFloor = (state: FloorState) => state.currentFloor;
export const selectEnemy = (state: FloorState) => state.enemy;
export const selectEnemyHp = (state: FloorState) => state.enemy?.hp ?? 0;
export const selectIsEnemyDefeated = (state: FloorState) => 
  state.enemy !== null && state.enemy.hp <= 0;
export const selectCombatLog = (state: FloorState) => state.combatLog;
export const selectTurnNumber = (state: FloorState) => state.turnState.turnNumber;
