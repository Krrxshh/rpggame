/**
 * Game State Store
 * Zustand store for overall game state and settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamePhase } from '../../game-engine/src/types';
import type { RNG } from '../../utils/src/rng';
import { createRNG } from '../../utils/src/rng';

interface GameState {
  // State
  phase: GamePhase;
  seed: string;
  floorNumber: number;
  totalEnemiesDefeated: number;
  startTime: number;
  rng: RNG | null;
  highScore: number;
  
  // Actions
  startGame: (seed: string) => void;
  setPhase: (phase: GamePhase) => void;
  advanceFloor: () => void;
  defeatedEnemy: () => void;
  gameOver: (victory: boolean) => void;
  returnToMenu: () => void;
  getRng: () => RNG;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  seed: '',
  floorNumber: 0,
  totalEnemiesDefeated: 0,
  startTime: 0,
  rng: null,
  highScore: 0,

  startGame: (seed: string) => {
    const rng = createRNG(seed || Date.now().toString());
    set({
      phase: 'playing',
      seed: seed || rng.getSeed().toString(),
      floorNumber: 1,
      totalEnemiesDefeated: 0,
      startTime: Date.now(),
      rng,
    });
  },

  setPhase: (phase: GamePhase) => {
    set({ phase });
  },

  advanceFloor: () => {
    set((state) => ({
      floorNumber: state.floorNumber + 1,
      phase: 'transition',
    }));
  },

  defeatedEnemy: () => {
    set((state) => ({
      totalEnemiesDefeated: state.totalEnemiesDefeated + 1,
    }));
  },

  gameOver: (victory: boolean) => {
    const state = get();
    const newHighScore = state.floorNumber > state.highScore 
      ? state.floorNumber 
      : state.highScore;
    
    set({
      phase: victory ? 'victory' : 'gameover',
      highScore: newHighScore,
    });
  },

  returnToMenu: () => {
    set({
      phase: 'menu',
      seed: '',
      floorNumber: 0,
      totalEnemiesDefeated: 0,
      rng: null,
    });
  },

  getRng: () => {
    const state = get();
    if (!state.rng) {
      throw new Error('Game not started - no RNG available');
    }
    return state.rng;
  },
}));

// Settings store with persistence
interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  masterVolume: number;
  showMinimap: boolean;
  showFps: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  sensitivity: number;
  invertY: boolean;
  
  // Actions
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleMinimap: () => void;
  setShowMinimap: (show: boolean) => void;
  toggleFps: () => void;
  setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;
  setSensitivity: (sensitivity: number) => void;
  setInvertY: (invert: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.7,
      sfxVolume: 0.8,
      masterVolume: 0.7,
      showMinimap: true,
      showFps: false,
      graphicsQuality: 'high',
      sensitivity: 1,
      invertY: false,

      setMusicVolume: (volume: number) => set({ musicVolume: volume }),
      setSfxVolume: (volume: number) => set({ sfxVolume: volume }),
      setMasterVolume: (volume: number) => set({ masterVolume: volume }),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      setShowMinimap: (show: boolean) => set({ showMinimap: show }),
      toggleFps: () => set((state) => ({ showFps: !state.showFps })),
      setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
      setSensitivity: (sensitivity: number) => set({ sensitivity }),
      setInvertY: (invertY: boolean) => set({ invertY }),
    }),
    {
      name: 'roguelike-settings',
    }
  )
);


// Selectors
export const selectGamePhase = (state: GameState) => state.phase;
export const selectFloorNumber = (state: GameState) => state.floorNumber;
export const selectSeed = (state: GameState) => state.seed;
export const selectIsPlaying = (state: GameState) => 
  state.phase === 'playing' || state.phase === 'combat' || state.phase === 'transition';
export const selectHighScore = (state: GameState) => state.highScore;
