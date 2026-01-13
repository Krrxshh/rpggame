/**
 * Player Controller Tests
 * Tests for WASD movement, dodge, attack, and blocking
 */

import { describe, it, expect } from 'vitest';
import {
  updatePlayerController,
  INITIAL_PLAYER_STATE,
  DEFAULT_CONFIG,
  processDodge,
  processAttack,
  applyDamageToPlayer,
  type PlayerState,
  type InputState,
} from '../../game-engine/src/playerController';

const createEmptyInput = (): InputState => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  dodge: false,
  attack: false,
  heavyAttack: false,
  block: false,
  mouseX: 0,
  mouseY: 0,
});

describe('Player Controller', () => {
  describe('movement', () => {
    it('should move forward when W pressed', () => {
      const input = { ...createEmptyInput(), forward: true };
      const { state } = updatePlayerController(
        INITIAL_PLAYER_STATE,
        input,
        DEFAULT_CONFIG,
        0.016,
        0,
        [],
        20
      );
      
      expect(state.velocity.z).toBeLessThan(0);
    });
    
    it('should move backward when S pressed', () => {
      const input = { ...createEmptyInput(), backward: true };
      const { state } = updatePlayerController(
        INITIAL_PLAYER_STATE,
        input,
        DEFAULT_CONFIG,
        0.016,
        0,
        [],
        20
      );
      
      expect(state.velocity.z).toBeGreaterThan(0);
    });
  });
  
  describe('dodge', () => {
    it('should set isDodging and isInvulnerable when dodge pressed', () => {
      const state = { ...INITIAL_PLAYER_STATE, stamina: 100 };
      const input = { ...createEmptyInput(), dodge: true };
      
      const newState = processDodge(state, input, DEFAULT_CONFIG, 0.016);
      
      expect(newState.isDodging).toBe(true);
      expect(newState.isInvulnerable).toBe(true);
    });
    
    it('should consume stamina when dodging', () => {
      const state = { ...INITIAL_PLAYER_STATE, stamina: 100 };
      const input = { ...createEmptyInput(), dodge: true };
      
      const newState = processDodge(state, input, DEFAULT_CONFIG, 0.016);
      
      expect(newState.stamina).toBe(100 - DEFAULT_CONFIG.dodgeStaminaCost);
    });
    
    it('should not dodge when stamina insufficient', () => {
      const state = { ...INITIAL_PLAYER_STATE, stamina: 5 };
      const input = { ...createEmptyInput(), dodge: true };
      
      const newState = processDodge(state, input, DEFAULT_CONFIG, 0.016);
      
      expect(newState.isDodging).toBe(false);
    });
  });
  
  describe('attack', () => {
    it('should deal damage when attacking', () => {
      const state = { ...INITIAL_PLAYER_STATE, stamina: 100 };
      const input = { ...createEmptyInput(), attack: true };
      
      const result = processAttack(state, input, DEFAULT_CONFIG, 0.016, 20);
      
      expect(result.hitFrame).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
    });
    
    it('should increment combo counter', () => {
      const state = { ...INITIAL_PLAYER_STATE, stamina: 100, attackCombo: 0 };
      const input = { ...createEmptyInput(), attack: true };
      
      const result = processAttack(state, input, DEFAULT_CONFIG, 0.016, 20);
      
      expect(result.state.attackCombo).toBe(1);
    });
  });
  
  describe('damage', () => {
    it('should not take damage when invulnerable', () => {
      const state = { ...INITIAL_PLAYER_STATE, isInvulnerable: true };
      
      const result = applyDamageToPlayer(state, 50);
      
      expect(result.actualDamage).toBe(0);
    });
    
    it('should reduce damage when blocking', () => {
      const state = { ...INITIAL_PLAYER_STATE, isBlocking: true, parryWindow: 0 };
      
      const result = applyDamageToPlayer(state, 50);
      
      expect(result.actualDamage).toBeLessThan(50);
    });
    
    it('should parry when in parry window', () => {
      const state = { ...INITIAL_PLAYER_STATE, isBlocking: true, parryWindow: 5 };
      
      const result = applyDamageToPlayer(state, 50);
      
      expect(result.wasParried).toBe(true);
      expect(result.actualDamage).toBe(0);
    });
  });
});
