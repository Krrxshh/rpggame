/**
 * Player State Store
 * Zustand store for player state management
 */

import { create } from 'zustand';
import type { Player } from '../../game-engine/src/types';
import { INITIAL_PLAYER } from '../../game-engine/src/types';

interface PlayerState extends Player {
  // Actions
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  useItem: () => boolean;
  enterCover: () => void;
  leaveCover: () => void;
  setDefense: (amount: number) => void;
  setPosition: (x: number, y: number, z: number) => void;
  reset: () => void;
  resetForNewFloor: () => void;
}

const createInitialState = (): Player => ({
  ...INITIAL_PLAYER,
  position: { x: 0, y: 0, z: 0 },
});

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...createInitialState(),

  takeDamage: (amount: number) => {
    set((state) => ({
      hp: Math.max(0, state.hp - amount),
    }));
  },

  heal: (amount: number) => {
    set((state) => ({
      hp: Math.min(state.maxHp, state.hp + amount),
    }));
  },

  useItem: () => {
    const state = get();
    if (state.itemUsed) {
      return false;
    }
    set({
      itemUsed: true,
      hp: Math.min(state.maxHp, state.hp + 3),
    });
    return true;
  },

  enterCover: () => {
    set({ inCover: true });
  },

  leaveCover: () => {
    set({ inCover: false });
  },

  setDefense: (amount: number) => {
    set({ defense: amount });
  },

  setPosition: (x: number, y: number, z: number) => {
    set({ position: { x, y, z } });
  },

  reset: () => {
    set(createInitialState());
  },

  resetForNewFloor: () => {
    set({
      itemUsed: false,
      inCover: false,
      defense: 0,
    });
  },
}));

// Selectors
export const selectPlayerHp = (state: PlayerState) => state.hp;
export const selectPlayerMaxHp = (state: PlayerState) => state.maxHp;
export const selectIsPlayerAlive = (state: PlayerState) => state.hp > 0;
export const selectPlayerPosition = (state: PlayerState) => state.position;
