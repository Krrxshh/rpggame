/**
 * Generator Tests
 * Tests for floor generation and validation
 */

import { describe, it, expect } from 'vitest';
import { generateFloor, quickGenerateFloor } from '../../content-generator/src/floor-generator';
import { validateFloorPayload } from '../../game-engine/src/validation';
import { createRNG } from '../../utils/src/rng';

describe('Floor Generator', () => {
  describe('generateFloor', () => {
    it('should generate valid floor for floor 1', () => {
      const floor = generateFloor(1, 12345);
      const validation = validateFloorPayload(floor);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should generate valid floors for multiple floor numbers', () => {
      const seeds = [12345, 54321, 99999];
      const floorNumbers = [1, 5, 10, 20, 50];
      
      for (const seed of seeds) {
        for (const floorNum of floorNumbers) {
          const floor = generateFloor(floorNum, seed);
          const validation = validateFloorPayload(floor);
          
          expect(validation.valid).toBe(true);
          expect(floor.floorNumber).toBe(floorNum);
        }
      }
    });
    
    it('should produce identical floors for same seed', () => {
      const floor1 = generateFloor(5, 'test-seed');
      const floor2 = generateFloor(5, 'test-seed');
      
      expect(floor1.arena.shape).toBe(floor2.arena.shape);
      expect(floor1.arena.radius).toBe(floor2.arena.radius);
      expect(floor1.enemy.hp).toBe(floor2.enemy.hp);
      expect(floor1.enemy.name).toBe(floor2.enemy.name);
      expect(floor1.obstacles.length).toBe(floor2.obstacles.length);
      expect(floor1.lightingPreset).toBe(floor2.lightingPreset);
    });
    
    it('should produce different floors for different seeds', () => {
      const floor1 = generateFloor(5, 'seed-a');
      const floor2 = generateFloor(5, 'seed-b');
      
      // Very unlikely to match on all properties
      const same = 
        floor1.arena.shape === floor2.arena.shape &&
        floor1.enemy.name === floor2.enemy.name &&
        floor1.lightingPreset === floor2.lightingPreset;
      
      expect(same).toBe(false);
    });
    
    it('should scale enemy HP with floor number', () => {
      const floor1 = generateFloor(1, 42);
      const floor10 = generateFloor(10, 42);
      const floor20 = generateFloor(20, 42);
      
      expect(floor10.enemy.maxHp).toBeGreaterThan(floor1.enemy.maxHp);
      expect(floor20.enemy.maxHp).toBeGreaterThan(floor10.enemy.maxHp);
    });
    
    it('should have valid palette with all required colors', () => {
      const floor = generateFloor(5, 12345);
      
      expect(floor.palette.background).toBeDefined();
      expect(floor.palette.primary).toBeDefined();
      expect(floor.palette.secondary).toBeDefined();
      expect(floor.palette.accent).toBeDefined();
      expect(floor.palette.enemy).toBeDefined();
      expect(floor.palette.hazard).toBeDefined();
      
      // All should be valid hex colors
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(floor.palette.background).toMatch(hexRegex);
      expect(floor.palette.primary).toMatch(hexRegex);
    });
    
    it('should place player and enemy spawns inside arena', () => {
      for (let i = 0; i < 20; i++) {
        const floor = generateFloor(i + 1, 12345 + i);
        
        const playerDist = Math.sqrt(
          floor.playerSpawn.position.x ** 2 + 
          floor.playerSpawn.position.y ** 2
        );
        const enemyDist = Math.sqrt(
          floor.enemySpawn.position.x ** 2 + 
          floor.enemySpawn.position.y ** 2
        );
        
        expect(playerDist).toBeLessThanOrEqual(floor.arena.radius);
        expect(enemyDist).toBeLessThanOrEqual(floor.arena.radius);
      }
    });
    
    it('should not generate hazards on first 2 floors', () => {
      const floor1 = generateFloor(1, 12345);
      const floor2 = generateFloor(2, 12345);
      
      expect(floor1.hazards.length).toBe(0);
      expect(floor2.hazards.length).toBe(0);
    });
  });
  
  describe('validation', () => {
    it('should catch invalid enemy HP', () => {
      const floor = quickGenerateFloor(5, 12345);
      floor.enemy.hp = 0;
      
      const validation = validateFloorPayload(floor);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('HP'))).toBe(true);
    });
    
    it('should catch spawns too close together', () => {
      const floor = quickGenerateFloor(5, 12345);
      floor.playerSpawn.position = { x: 0, y: 0, z: 0 };
      floor.enemySpawn.position = { x: 0.5, y: 0.5, z: 0 };
      
      const validation = validateFloorPayload(floor);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('close'))).toBe(true);
    });
    
    it('should catch too many obstacles', () => {
      const floor = quickGenerateFloor(5, 12345);
      
      // Add lots of obstacles
      for (let i = 0; i < 20; i++) {
        floor.obstacles.push({
          type: 'pillar',
          position: { x: i, y: i, z: 0 },
          size: { width: 1, height: 2, depth: 1 },
          provideCover: false,
          destructible: false,
        });
      }
      
      const validation = validateFloorPayload(floor);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('obstacles'))).toBe(true);
    });
    
    it('should catch enemy attack power exceeding max', () => {
      const floor = quickGenerateFloor(5, 12345);
      floor.enemy.attack.power = 99;
      
      const validation = validateFloorPayload(floor);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('attack power'))).toBe(true);
    });
  });
});
