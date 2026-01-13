/**
 * Math utility functions for game calculations
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation - find t given value in range [a, b]
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * Remap value from one range to another
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/**
 * 2D Vector type
 */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * 3D Vector type
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate 2D distance between two points
 */
export function distance2D(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate 3D distance between two points
 */
export function distance3D(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a 2D vector
 */
export function normalize2D(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Normalize a 3D vector
 */
export function normalize3D(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Check if point is inside a circle
 */
export function insideCircle(point: Vec2, center: Vec2, radius: number): boolean {
  return distance2D(point, center) <= radius;
}

/**
 * Check if point is inside a rectangle (axis-aligned)
 */
export function insideRect(
  point: Vec2,
  center: Vec2,
  halfWidth: number,
  halfHeight: number
): boolean {
  return (
    Math.abs(point.x - center.x) <= halfWidth &&
    Math.abs(point.y - center.y) <= halfHeight
  );
}

/**
 * Check if point is inside an octagon
 */
export function insideOctagon(point: Vec2, center: Vec2, radius: number): boolean {
  const dx = Math.abs(point.x - center.x);
  const dy = Math.abs(point.y - center.y);
  
  // Octagon is defined by: |x| + |y| <= r * sqrt(2) and |x|, |y| <= r
  const octagonFactor = radius * 0.9239; // cos(22.5°)
  const cornerCut = radius * 0.3827; // sin(22.5°)
  
  if (dx > radius || dy > radius) return false;
  if (dx + dy <= radius + cornerCut) return true;
  return false;
}

/**
 * Check if two circles overlap
 */
export function circlesOverlap(
  c1: Vec2,
  r1: number,
  c2: Vec2,
  r2: number
): boolean {
  return distance2D(c1, c2) < r1 + r2;
}

/**
 * Check if two AABBs overlap
 */
export function aabbOverlap(
  a: { center: Vec2; halfWidth: number; halfHeight: number },
  b: { center: Vec2; halfWidth: number; halfHeight: number }
): boolean {
  return (
    Math.abs(a.center.x - b.center.x) < a.halfWidth + b.halfWidth &&
    Math.abs(a.center.y - b.center.y) < a.halfHeight + b.halfHeight
  );
}

/**
 * Generate a point on a circle
 */
export function pointOnCircle(center: Vec2, radius: number, angle: number): Vec2 {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

/**
 * Smoothstep interpolation
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Ease in-out cubic
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Angle between two 2D points in radians
 */
export function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
