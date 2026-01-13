/**
 * Day/Night Cycle Tests
 * Tests sun position, intensity, and phase transitions
 */

import { describe, it, expect } from 'vitest';
import {
  createTimeState,
  updateTimeState,
  getSunPosition,
  getSunIntensity,
  DEFAULT_CONFIG,
} from '../../renderer/src/DayNightCycle';

describe('DayNightCycle', () => {
  describe('createTimeState', () => {
    it('should create state with noon time', () => {
      const state = createTimeState(12);
      expect(state.hours).toBe(12);
      expect(state.phase).toBe('day');
    });
    
    it('should create state with midnight time', () => {
      const state = createTimeState(0);
      expect(state.hours).toBe(0);
      expect(state.phase).toBe('night');
    });
  });
  
  describe('updateTimeState', () => {
    it('should advance time correctly', () => {
      const state = createTimeState(10);
      const updated = updateTimeState(state, 60, DEFAULT_CONFIG); // 60 seconds = 60 minutes = 1 hour
      expect(updated.hours).toBeGreaterThanOrEqual(10);
      expect(updated.minutes + updated.hours * 60).toBeGreaterThan(10 * 60);
    });
    
    it('should wrap around at 24 hours', () => {
      const state = createTimeState(23);
      const updated = updateTimeState(state, 120 * 60, DEFAULT_CONFIG); // 120 minutes
      expect(updated.hours).toBeLessThan(24);
    });
  });
  
  describe('getSunPosition', () => {
    it('should return high position at noon', () => {
      const state = createTimeState(12);
      const pos = getSunPosition(state);
      expect(pos.y).toBeGreaterThan(50);
    });
    
    it('should return low position at night', () => {
      const state = createTimeState(0);
      const pos = getSunPosition(state);
      expect(pos.y).toBeLessThan(0);
    });
  });
  
  describe('getSunIntensity', () => {
    it('should return high intensity at noon', () => {
      const state = createTimeState(12);
      const intensity = getSunIntensity(state);
      expect(intensity).toBeGreaterThan(0.9);
    });
    
    it('should return low intensity at night', () => {
      const state = createTimeState(2);
      const intensity = getSunIntensity(state);
      expect(intensity).toBeLessThan(0.2);
    });
  });
});
