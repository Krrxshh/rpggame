/**
 * Action RPG Game Store
 * Zustand store for real-time action RPG state
 * NEW FILE - extends state
 */

import { create } from 'zustand';
import type { PlayerState } from '../../game-engine/src/playerController';
import { INITIAL_PLAYER_STATE } from '../../game-engine/src/playerController';
import type { Chunk, WorldState } from '../../content-generator/src/regionGenerator';
import { createWorldState } from '../../content-generator/src/regionGenerator';
import type { Inventory } from '../../game-engine/src/items';
import { createInventory, addItemToInventory } from '../../game-engine/src/items';
import type { SkillState } from '../../game-engine/src/skills';
import { createSkillState, SKILLS } from '../../game-engine/src/skills';

export type GamePhase = 'menu' | 'loading' | 'playing' | 'paused' | 'gameover' | 'victory';

interface ActionGameState {
  // Core
  phase: GamePhase;
  seed: string;
  
  // Player
  player: PlayerState;
  cameraRotation: number;
  
  // World
  world: WorldState | null;
  currentChunk: Chunk | null;
  
  // Combat
  enemiesDefeated: number;
  bossesDefeated: number;
  
  // Skills
  skillStates: SkillState[];
  mana: number;
  maxMana: number;
  
  // Inventory
  inventory: Inventory;
  
  // Actions
  startGame: (seed: string) => void;
  setPlayer: (player: PlayerState) => void;
  setCameraRotation: (rotation: number) => void;
  setWorld: (world: WorldState) => void;
  setCurrentChunk: (chunk: Chunk) => void;
  updateSkillCooldowns: (deltaTime: number) => void;
  useMana: (amount: number) => boolean;
  regenMana: (amount: number) => void;
  addItem: (itemId: string, quantity: number) => void;
  setPhase: (phase: GamePhase) => void;
  gameOver: () => void;
  enemyDefeated: (isBoss: boolean) => void;
  reset: () => void;
}

export const useActionGameStore = create<ActionGameState>((set, get) => ({
  phase: 'menu',
  seed: '',
  player: { ...INITIAL_PLAYER_STATE },
  cameraRotation: 0,
  world: null,
  currentChunk: null,
  enemiesDefeated: 0,
  bossesDefeated: 0,
  skillStates: [
    createSkillState('fireball'),
    createSkillState('frostNova'),
    createSkillState('powerStrike'),
    createSkillState('warCry'),
  ],
  mana: 100,
  maxMana: 100,
  inventory: (() => {
    let inv = createInventory(20);
    inv = addItemToInventory(inv, 'healthPotion', 3).inventory;
    inv = addItemToInventory(inv, 'staminaElixir', 2).inventory;
    return inv;
  })(),
  
  startGame: (seed) => set({
    phase: 'playing',
    seed,
    player: { ...INITIAL_PLAYER_STATE },
    world: createWorldState(seed),
    enemiesDefeated: 0,
    bossesDefeated: 0,
    mana: 100,
  }),
  
  setPlayer: (player) => set({ player }),
  setCameraRotation: (cameraRotation) => set({ cameraRotation }),
  setWorld: (world) => set({ world }),
  setCurrentChunk: (currentChunk) => set({ currentChunk }),
  
  updateSkillCooldowns: (deltaTime) => set((state) => ({
    skillStates: state.skillStates.map(s => ({
      ...s,
      currentCooldown: Math.max(0, s.currentCooldown - deltaTime),
    })),
  })),
  
  useMana: (amount) => {
    const { mana } = get();
    if (mana >= amount) {
      set({ mana: mana - amount });
      return true;
    }
    return false;
  },
  
  regenMana: (amount) => set((state) => ({
    mana: Math.min(state.maxMana, state.mana + amount),
  })),
  
  addItem: (itemId, quantity) => set((state) => ({
    inventory: addItemToInventory(state.inventory, itemId, quantity).inventory,
  })),
  
  setPhase: (phase) => set({ phase }),
  gameOver: () => set({ phase: 'gameover' }),
  enemyDefeated: (isBoss) => set((state) => ({
    enemiesDefeated: state.enemiesDefeated + 1,
    bossesDefeated: state.bossesDefeated + (isBoss ? 1 : 0),
  })),
  
  reset: () => set({
    phase: 'menu',
    seed: '',
    player: { ...INITIAL_PLAYER_STATE },
    world: null,
    currentChunk: null,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    mana: 100,
  }),
}));

export default useActionGameStore;
