/**
 * RNG Tests
 * Tests for seedable PRNG reproducibility
 */

import { describe, it, expect } from 'vitest';
import { createRNG, mulberry32, hashString } from '../../utils/src/rng';

describe('RNG', () => {
  describe('mulberry32', () => {
    it('should produce deterministic sequence for same seed', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(12345);
      
      const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];
      
      expect(seq1).toEqual(seq2);
    });
    
    it('should produce different sequences for different seeds', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(54321);
      
      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];
      
      expect(seq1).not.toEqual(seq2);
    });
    
    it('should produce values in range [0, 1)', () => {
      const rng = mulberry32(42);
      
      for (let i = 0; i < 1000; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });
  
  describe('hashString', () => {
    it('should produce consistent hash for same string', () => {
      const hash1 = hashString('test-seed');
      const hash2 = hashString('test-seed');
      
      expect(hash1).toBe(hash2);
    });
    
    it('should produce different hashes for different strings', () => {
      const hash1 = hashString('seed-a');
      const hash2 = hashString('seed-b');
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should always produce positive numbers', () => {
      const testStrings = ['test', 'hello', 'world', '12345', 'abc-xyz'];
      
      for (const str of testStrings) {
        expect(hashString(str)).toBeGreaterThanOrEqual(0);
      }
    });
  });
  
  describe('createRNG', () => {
    it('should create RNG from numeric seed', () => {
      const rng = createRNG(12345);
      
      expect(rng.getSeed()).toBe(12345);
      expect(typeof rng.next()).toBe('number');
    });
    
    it('should create RNG from string seed', () => {
      const rng = createRNG('my-seed');
      
      expect(rng.getSeed()).toBe(hashString('my-seed'));
    });
    
    it('range should return integers in specified range', () => {
      const rng = createRNG(42);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.range(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
    
    it('rangeFloat should return floats in specified range', () => {
      const rng = createRNG(42);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.rangeFloat(0.5, 1.5);
        expect(value).toBeGreaterThanOrEqual(0.5);
        expect(value).toBeLessThan(1.5);
      }
    });
    
    it('chance should respect probability', () => {
      const rng = createRNG(42);
      let trueCount = 0;
      const trials = 10000;
      
      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.3)) trueCount++;
      }
      
      // Should be roughly 30% (allowing for variance)
      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.35);
    });
    
    it('pick should return elements from array', () => {
      const rng = createRNG(42);
      const options = ['a', 'b', 'c', 'd'];
      
      for (let i = 0; i < 50; i++) {
        const picked = rng.pick(options);
        expect(options).toContain(picked);
      }
    });
    
    it('shuffle should return same elements in different order', () => {
      const rng = createRNG(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle([...original]);
      
      expect(shuffled.sort()).toEqual(original.sort());
    });
    
    it('shuffle should be deterministic', () => {
      const rng1 = createRNG(42);
      const rng2 = createRNG(42);
      
      const shuffled1 = rng1.shuffle([1, 2, 3, 4, 5]);
      const shuffled2 = rng2.shuffle([1, 2, 3, 4, 5]);
      
      expect(shuffled1).toEqual(shuffled2);
    });
  });
  
  describe('reproducibility', () => {
    it('entire game session should be reproducible with same seed', () => {
      const seed = 'game-session-123';
      
      // Simulate two identical game sessions
      const session1 = simulateGameSession(seed);
      const session2 = simulateGameSession(seed);
      
      expect(session1).toEqual(session2);
    });
  });
});

// Helper to simulate a game session
function simulateGameSession(seed: string): number[] {
  const rng = createRNG(seed);
  const results: number[] = [];
  
  // Simulate 50 random events
  for (let i = 0; i < 50; i++) {
    results.push(rng.range(0, 100));
  }
  
  return results;
}
