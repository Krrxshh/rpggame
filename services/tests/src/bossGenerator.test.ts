/**
 * Boss Generator Tests
 * Tests for procedural boss generation and validation
 */

import { describe, it, expect } from 'vitest';
import { generateBoss, validateBoss } from '../../content-generator/src/bossGenerator';

describe('Boss Generator', () => {
  describe('generateBoss', () => {
    it('should generate boss with at least 3 attacks', () => {
      const boss = generateBoss(5, 12345, { x: 0, y: 0, z: 0 });
      
      expect(boss.attacks.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should generate boss with valid HP', () => {
      const boss = generateBoss(5, 12345, { x: 0, y: 0, z: 0 });
      
      expect(boss.hp).toBeGreaterThan(0);
      expect(boss.maxHp).toBe(boss.hp);
    });
    
    it('should generate deterministic boss with same seed', () => {
      const boss1 = generateBoss(5, 'test-seed', { x: 0, y: 0, z: 0 });
      const boss2 = generateBoss(5, 'test-seed', { x: 0, y: 0, z: 0 });
      
      expect(boss1.name).toBe(boss2.name);
      expect(boss1.hp).toBe(boss2.hp);
      expect(boss1.attacks.length).toBe(boss2.attacks.length);
    });
    
    it('should scale HP with floor number', () => {
      const bossFloor1 = generateBoss(1, 12345, { x: 0, y: 0, z: 0 });
      const bossFloor10 = generateBoss(10, 12345, { x: 0, y: 0, z: 0 });
      
      expect(bossFloor10.hp).toBeGreaterThan(bossFloor1.hp);
    });
    
    it('should assign tier based on floor', () => {
      const normalBoss = generateBoss(3, 12345, { x: 0, y: 0, z: 0 });
      const eliteBoss = generateBoss(10, 12345, { x: 0, y: 0, z: 0 });
      const legendaryBoss = generateBoss(20, 12345, { x: 0, y: 0, z: 0 });
      
      expect(normalBoss.tier).toBe('normal');
      expect(eliteBoss.tier).toBe('elite');
      expect(legendaryBoss.tier).toBe('legendary');
    });
  });
  
  describe('validateBoss', () => {
    it('should validate valid boss', () => {
      const boss = generateBoss(5, 12345, { x: 0, y: 0, z: 0 });
      const result = validateBoss(boss);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should fail validation for boss with no HP', () => {
      const boss = generateBoss(5, 12345, { x: 0, y: 0, z: 0 });
      boss.hp = 0;
      
      const result = validateBoss(boss);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Boss HP must be positive');
    });
    
    it('should fail validation for boss with fewer than 3 attacks', () => {
      const boss = generateBoss(5, 12345, { x: 0, y: 0, z: 0 });
      boss.attacks = boss.attacks.slice(0, 2);
      
      const result = validateBoss(boss);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Boss needs at least 3 attacks');
    });
  });
});
