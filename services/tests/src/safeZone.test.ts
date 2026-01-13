/**
 * Safe Zone Tests
 * Tests safe zone detection and enemy restrictions
 */

import { describe, it, expect } from 'vitest';
import {
  createSafeZoneState,
  addSafeZone,
  isPositionInSafeZone,
  updatePlayerSafeZone,
  isEnemyAllowedAt,
  toggleSafeMode,
} from '../../game-engine/src/safeZone';

describe('SafeZone', () => {
  describe('addSafeZone', () => {
    it('should add zone to state', () => {
      let state = createSafeZoneState();
      state = addSafeZone(state, {
        center: { x: 0, z: 0 },
        radius: 10,
        type: 'campfire',
        hasRestPoint: true,
        name: 'Test Camp',
      });
      
      expect(state.zones).toHaveLength(1);
      expect(state.zones[0].name).toBe('Test Camp');
    });
  });
  
  describe('isPositionInSafeZone', () => {
    it('should detect position inside zone', () => {
      let state = createSafeZoneState();
      state = addSafeZone(state, {
        center: { x: 10, z: 10 },
        radius: 5,
        type: 'campfire',
        hasRestPoint: true,
        name: 'Camp',
      });
      
      const result = isPositionInSafeZone(state, { x: 12, z: 10 });
      expect(result.inZone).toBe(true);
      expect(result.zone?.name).toBe('Camp');
    });
    
    it('should detect position outside zone', () => {
      let state = createSafeZoneState();
      state = addSafeZone(state, {
        center: { x: 10, z: 10 },
        radius: 5,
        type: 'campfire',
        hasRestPoint: true,
        name: 'Camp',
      });
      
      const result = isPositionInSafeZone(state, { x: 50, z: 50 });
      expect(result.inZone).toBe(false);
      expect(result.zone).toBeNull();
    });
  });
  
  describe('isEnemyAllowedAt', () => {
    it('should disallow enemies in safe zones', () => {
      let state = createSafeZoneState();
      state = addSafeZone(state, {
        center: { x: 0, z: 0 },
        radius: 10,
        type: 'shrine',
        hasRestPoint: false,
        name: 'Shrine',
      });
      
      expect(isEnemyAllowedAt(state, { x: 5, z: 0 })).toBe(false);
    });
    
    it('should allow enemies outside safe zones', () => {
      let state = createSafeZoneState();
      state = addSafeZone(state, {
        center: { x: 0, z: 0 },
        radius: 10,
        type: 'shrine',
        hasRestPoint: false,
        name: 'Shrine',
      });
      
      expect(isEnemyAllowedAt(state, { x: 50, z: 50 })).toBe(true);
    });
    
    it('should disallow all enemies in safe mode', () => {
      let state = createSafeZoneState();
      state = toggleSafeMode(state);
      
      expect(isEnemyAllowedAt(state, { x: 100, z: 100 })).toBe(false);
    });
  });
});
