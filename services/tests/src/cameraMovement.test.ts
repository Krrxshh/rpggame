/**
 * Camera Movement Tests
 * Tests camera-relative direction calculation
 */

import { describe, it, expect } from 'vitest';
import { getCameraRelativeDirection } from '../../renderer/src/ImprovedCamera';

describe('Camera-Relative Movement', () => {
  describe('getCameraRelativeDirection', () => {
    it('should return zero when no input', () => {
      const dir = getCameraRelativeDirection(
        { forward: false, backward: false, left: false, right: false },
        0
      );
      expect(dir.x).toBe(0);
      expect(dir.z).toBe(0);
    });
    
    it('should move forward relative to camera yaw 0', () => {
      const dir = getCameraRelativeDirection(
        { forward: true, backward: false, left: false, right: false },
        0
      );
      expect(dir.z).toBeLessThan(0); // Forward is -Z when yaw = 0
      expect(Math.abs(dir.x)).toBeLessThan(0.01);
    });
    
    it('should move right when pressing right', () => {
      const dir = getCameraRelativeDirection(
        { forward: false, backward: false, left: false, right: true },
        0
      );
      expect(dir.x).toBeGreaterThan(0); // Right is +X when yaw = 0
    });
    
    it('should rotate movement with camera yaw', () => {
      const yaw90 = Math.PI / 2; // 90 degrees
      const dir = getCameraRelativeDirection(
        { forward: true, backward: false, left: false, right: false },
        yaw90
      );
      // Forward with 90 degree yaw should be mostly +X
      expect(Math.abs(dir.x)).toBeGreaterThan(0.5);
    });
    
    it('should normalize diagonal movement', () => {
      const dir = getCameraRelativeDirection(
        { forward: true, backward: false, left: true, right: false },
        0
      );
      const length = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      expect(length).toBeCloseTo(1, 3);
    });
  });
});
