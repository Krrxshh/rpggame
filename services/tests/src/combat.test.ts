/**
 * Combat Tests
 * Tests for deterministic combat system
 */

import { describe, it, expect } from 'vitest';
import { 
  executeAction, 
  applyResultToPlayer, 
  applyResultToEnemy,
  createTurnState,
  advanceTurn 
} from '../../game-engine/src/combat';
import { createRNG } from '../../utils/src/rng';
import type { Player, Enemy } from '../../game-engine/src/types';
import { INITIAL_PLAYER } from '../../game-engine/src/types';

function createTestPlayer(): Player {
  return {
    ...INITIAL_PLAYER,
    position: { x: 0, y: 0, z: 0 },
  };
}

function createTestEnemy(): Enemy {
  return {
    id: 'test-enemy',
    name: 'Test Enemy',
    hp: 10,
    maxHp: 10,
    attack: { power: 2, accuracy: 0.8 },
    position: { x: 0, y: 5, z: 0 },
    behavior: 'aggressive',
    visualType: 'sphere',
    color: '#ff0000',
  };
}

describe('Combat System', () => {
  describe('executeAction - attack', () => {
    it('should deal damage with attack action', () => {
      const player = createTestPlayer();
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      const rng = createRNG(12345);
      
      const result = executeAction('attack', player, enemy, turnState, rng);
      
      expect(result.action).toBe('attack');
      expect(result.playerDamageDealt).toBeGreaterThan(0);
    });
    
    it('should be deterministic with same seed', () => {
      const player = createTestPlayer();
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      
      const result1 = executeAction('attack', player, enemy, turnState, createRNG(42));
      const result2 = executeAction('attack', player, enemy, turnState, createRNG(42));
      
      expect(result1.playerDamageDealt).toBe(result2.playerDamageDealt);
      expect(result1.playerDamageTaken).toBe(result2.playerDamageTaken);
    });
  });
  
  describe('executeAction - defend', () => {
    it('should grant defense bonus', () => {
      const player = createTestPlayer();
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      const rng = createRNG(12345);
      
      const result = executeAction('defend', player, enemy, turnState, rng);
      
      expect(result.action).toBe('defend');
      expect(result.turnDefenseBonus).toBe(2);
      expect(result.playerDamageTaken).toBe(0); // No counterattack when defending
    });
  });
  
  describe('executeAction - item', () => {
    it('should heal player when item not used', () => {
      const player = createTestPlayer();
      player.hp = 5; // Damage the player first
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      const rng = createRNG(12345);
      
      const result = executeAction('item', player, enemy, turnState, rng);
      
      expect(result.action).toBe('item');
      expect(result.success).toBe(true);
      expect(result.playerHealed).toBe(3);
    });
    
    it('should fail when item already used', () => {
      const player = createTestPlayer();
      player.itemUsed = true;
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      const rng = createRNG(12345);
      
      const result = executeAction('item', player, enemy, turnState, rng);
      
      expect(result.success).toBe(false);
      expect(result.playerHealed).toBe(0);
    });
  });
  
  describe('executeAction - risky', () => {
    it('should either crit or self-damage', () => {
      const player = createTestPlayer();
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      
      // Run multiple times to see both outcomes
      let crits = 0;
      let selfDamages = 0;
      
      for (let i = 0; i < 100; i++) {
        const rng = createRNG(i);
        const result = executeAction('risky', player, enemy, turnState, rng);
        
        if (result.critical) {
          crits++;
          expect(result.playerDamageDealt).toBeGreaterThan(0);
        } else if (result.playerDamageTaken > 0 && !result.dodged) {
          selfDamages++;
        }
      }
      
      // Should have some of each (roughly 50% each)
      expect(crits).toBeGreaterThan(30);
      expect(selfDamages).toBeGreaterThan(0);
    });
    
    it('should deal double damage on crit', () => {
      const player = createTestPlayer();
      const enemy = createTestEnemy();
      const turnState = createTurnState();
      
      // Find a seed that results in crit
      let critResult = null;
      for (let seed = 0; seed < 100; seed++) {
        const rng = createRNG(seed);
        const result = executeAction('risky', player, enemy, turnState, rng);
        if (result.critical) {
          critResult = result;
          break;
        }
      }
      
      expect(critResult).not.toBeNull();
      expect(critResult!.playerDamageDealt).toBeGreaterThanOrEqual(player.atk * 2 - 2);
    });
  });
  
  describe('applyResultToPlayer', () => {
    it('should apply damage correctly', () => {
      const player = createTestPlayer();
      const result = {
        action: 'attack' as const,
        success: true,
        playerDamageDealt: 0,
        playerDamageTaken: 3,
        playerHealed: 0,
        enemyDefeated: false,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 0,
      };
      
      const newPlayer = applyResultToPlayer(player, result);
      
      expect(newPlayer.hp).toBe(player.hp - 3);
    });
    
    it('should not exceed max HP when healing', () => {
      const player = createTestPlayer();
      player.hp = 9;
      const result = {
        action: 'item' as const,
        success: true,
        playerDamageDealt: 0,
        playerDamageTaken: 0,
        playerHealed: 5,
        enemyDefeated: false,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 0,
      };
      
      const newPlayer = applyResultToPlayer(player, result);
      
      expect(newPlayer.hp).toBe(10); // Max HP
    });
    
    it('should mark item as used', () => {
      const player = createTestPlayer();
      const result = {
        action: 'item' as const,
        success: true,
        playerDamageDealt: 0,
        playerDamageTaken: 0,
        playerHealed: 3,
        enemyDefeated: false,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 0,
      };
      
      const newPlayer = applyResultToPlayer(player, result);
      
      expect(newPlayer.itemUsed).toBe(true);
    });
  });
  
  describe('applyResultToEnemy', () => {
    it('should apply damage correctly', () => {
      const enemy = createTestEnemy();
      const result = {
        action: 'attack' as const,
        success: true,
        playerDamageDealt: 5,
        playerDamageTaken: 0,
        playerHealed: 0,
        enemyDefeated: false,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 0,
      };
      
      const newEnemy = applyResultToEnemy(enemy, result);
      
      expect(newEnemy.hp).toBe(enemy.hp - 5);
    });
    
    it('should not go below 0 HP', () => {
      const enemy = createTestEnemy();
      enemy.hp = 3;
      const result = {
        action: 'attack' as const,
        success: true,
        playerDamageDealt: 10,
        playerDamageTaken: 0,
        playerHealed: 0,
        enemyDefeated: true,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 0,
      };
      
      const newEnemy = applyResultToEnemy(enemy, result);
      
      expect(newEnemy.hp).toBe(0);
    });
  });
  
  describe('turn management', () => {
    it('should create initial turn state', () => {
      const turnState = createTurnState();
      
      expect(turnState.turnNumber).toBe(1);
      expect(turnState.playerDefenseBonus).toBe(0);
      expect(turnState.enemyDefenseBonus).toBe(0);
    });
    
    it('should advance turn correctly', () => {
      const turnState = createTurnState();
      const result = {
        action: 'defend' as const,
        success: true,
        playerDamageDealt: 0,
        playerDamageTaken: 0,
        playerHealed: 0,
        enemyDefeated: false,
        critical: false,
        dodged: false,
        message: 'test',
        turnDefenseBonus: 2,
      };
      
      const newTurnState = advanceTurn(turnState, result);
      
      expect(newTurnState.turnNumber).toBe(2);
      expect(newTurnState.playerDefenseBonus).toBe(2);
    });
  });
  
  describe('full combat sequence', () => {
    it('should be fully reproducible with same seed', () => {
      const seed = 'combat-test-123';
      
      const sequence1 = simulateCombatSequence(seed);
      const sequence2 = simulateCombatSequence(seed);
      
      expect(sequence1).toEqual(sequence2);
    });
  });
});

function simulateCombatSequence(seed: string): number[] {
  const rng = createRNG(seed);
  const player = createTestPlayer();
  const enemy = createTestEnemy();
  let turnState = createTurnState();
  
  const results: number[] = [];
  const actions: ('attack' | 'defend' | 'risky')[] = ['attack', 'defend', 'risky'];
  
  for (let i = 0; i < 10; i++) {
    const action = actions[i % actions.length];
    const result = executeAction(action, player, enemy, turnState, rng);
    results.push(result.playerDamageDealt, result.playerDamageTaken);
    turnState = advanceTurn(turnState, result);
  }
  
  return results;
}
