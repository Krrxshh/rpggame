/**
 * Enhanced Physics System
 * CHANGELOG v1.0.0: Improved physics with capsule collision, slopes, friction
 * - Capsule-based player collision
 * - Ground detection with normal
 * - Slope handling with slide prevention
 * - Friction and velocity damping
 * - Gravity with terminal velocity
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export interface PhysicsConfig {
  gravity: number;
  terminalVelocity: number;
  groundFriction: number;
  airFriction: number;
  slopeLimit: number; // Max slope angle in degrees
  stepHeight: number;
  capsuleRadius: number;
  capsuleHeight: number;
}

export interface PhysicsState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  isGrounded: boolean;
  groundNormal: { x: number; y: number; z: number };
  isSlidingOnSlope: boolean;
}

export interface CollisionShape {
  type: 'sphere' | 'box' | 'capsule' | 'plane';
  position: { x: number; y: number; z: number };
  // Sphere/Capsule
  radius?: number;
  height?: number;
  // Box
  halfExtents?: { x: number; y: number; z: number };
  // Plane
  normal?: { x: number; y: number; z: number };
}

// === DEFAULTS ===

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 20,
  terminalVelocity: 50,
  groundFriction: 12,
  airFriction: 0.5,
  slopeLimit: 45,
  stepHeight: 0.3,
  capsuleRadius: 0.35,
  capsuleHeight: 1.8,
};

export function createPhysicsState(
  x: number = 0,
  y: number = 0,
  z: number = 0
): PhysicsState {
  return {
    position: { x, y, z },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: false,
    groundNormal: { x: 0, y: 1, z: 0 },
    isSlidingOnSlope: false,
  };
}

// === VECTOR UTILITIES ===

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = length(v);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function scale(v: { x: number; y: number; z: number }, s: number): { x: number; y: number; z: number } {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function add(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

// === GROUND CHECK ===

export function checkGround(
  position: { x: number; y: number; z: number },
  groundLevel: number,
  config: PhysicsConfig
): { isGrounded: boolean; normal: { x: number; y: number; z: number }; groundY: number } {
  const capsuleBottom = position.y;
  const groundDistance = capsuleBottom - groundLevel;
  
  if (groundDistance <= config.stepHeight) {
    return {
      isGrounded: true,
      normal: { x: 0, y: 1, z: 0 },
      groundY: groundLevel,
    };
  }
  
  return {
    isGrounded: false,
    normal: { x: 0, y: 1, z: 0 },
    groundY: groundLevel,
  };
}

// === SLOPE CHECK ===

export function checkSlope(
  normal: { x: number; y: number; z: number },
  slopeLimit: number
): { canWalk: boolean; slideDirection: { x: number; z: number } } {
  const slopeLimitRad = (slopeLimit * Math.PI) / 180;
  const upDot = normal.y;
  const slopeAngle = Math.acos(Math.abs(upDot));
  
  if (slopeAngle > slopeLimitRad) {
    // Too steep - calculate slide direction
    const slideDir = normalize({ x: -normal.x, y: 0, z: -normal.z });
    return {
      canWalk: false,
      slideDirection: { x: slideDir.x, z: slideDir.z },
    };
  }
  
  return { canWalk: true, slideDirection: { x: 0, z: 0 } };
}

// === CAPSULE VS SPHERE COLLISION ===

export function capsuleSphereCollision(
  capsulePos: { x: number; y: number; z: number },
  capsuleRadius: number,
  capsuleHeight: number,
  spherePos: { x: number; y: number; z: number },
  sphereRadius: number
): { collision: boolean; penetration: number; normal: { x: number; y: number; z: number } } {
  // Capsule as line segment from bottom to top
  const halfHeight = capsuleHeight / 2 - capsuleRadius;
  const capsuleBottom = { x: capsulePos.x, y: capsulePos.y + capsuleRadius, z: capsulePos.z };
  const capsuleTop = { x: capsulePos.x, y: capsulePos.y + capsuleHeight - capsuleRadius, z: capsulePos.z };
  
  // Find closest point on capsule line segment to sphere center
  const line = sub(capsuleTop, capsuleBottom);
  const lineLen = length(line);
  
  let t = 0;
  if (lineLen > 0.001) {
    const toSphere = sub(spherePos, capsuleBottom);
    t = Math.max(0, Math.min(1, dot(toSphere, line) / (lineLen * lineLen)));
  }
  
  const closest = add(capsuleBottom, scale(line, t));
  const diff = sub(spherePos, closest);
  const dist = length(diff);
  const minDist = capsuleRadius + sphereRadius;
  
  if (dist >= minDist) {
    return { collision: false, penetration: 0, normal: { x: 0, y: 0, z: 0 } };
  }
  
  const normal = dist > 0.001 ? normalize(diff) : { x: 0, y: 1, z: 0 };
  
  return {
    collision: true,
    penetration: minDist - dist,
    normal,
  };
}

// === MAIN PHYSICS UPDATE ===

export function updatePhysics(
  state: PhysicsState,
  inputVelocity: { x: number; z: number },
  obstacles: CollisionShape[],
  deltaTime: number,
  config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): PhysicsState {
  const dt = Math.min(deltaTime, 0.05); // Cap delta time
  const newState = { ...state };
  
  // === APPLY INPUT VELOCITY ===
  newState.velocity.x = inputVelocity.x;
  newState.velocity.z = inputVelocity.z;
  
  // === GROUND CHECK ===
  const ground = checkGround(state.position, 0, config);
  newState.isGrounded = ground.isGrounded;
  newState.groundNormal = ground.normal;
  
  // === GRAVITY ===
  if (!newState.isGrounded) {
    newState.velocity.y -= config.gravity * dt;
    newState.velocity.y = Math.max(-config.terminalVelocity, newState.velocity.y);
  } else {
    if (newState.velocity.y < 0) {
      newState.velocity.y = 0;
    }
    
    // Check slope
    const slope = checkSlope(newState.groundNormal, config.slopeLimit);
    newState.isSlidingOnSlope = !slope.canWalk;
    
    if (newState.isSlidingOnSlope) {
      // Apply slide velocity
      const slideSpeed = config.gravity * 0.5;
      newState.velocity.x += slope.slideDirection.x * slideSpeed * dt;
      newState.velocity.z += slope.slideDirection.z * slideSpeed * dt;
    }
  }
  
  // === FRICTION ===
  const friction = newState.isGrounded ? config.groundFriction : config.airFriction;
  const frictionFactor = Math.exp(-friction * dt);
  
  // Only apply friction to horizontal velocity when not moving
  if (inputVelocity.x === 0 && inputVelocity.z === 0) {
    newState.velocity.x *= frictionFactor;
    newState.velocity.z *= frictionFactor;
  }
  
  // === INTEGRATE POSITION ===
  newState.position.x += newState.velocity.x * dt;
  newState.position.y += newState.velocity.y * dt;
  newState.position.z += newState.velocity.z * dt;
  
  // === OBSTACLE COLLISION ===
  for (const obstacle of obstacles) {
    if (obstacle.type === 'sphere' && obstacle.radius) {
      const result = capsuleSphereCollision(
        newState.position,
        config.capsuleRadius,
        config.capsuleHeight,
        obstacle.position,
        obstacle.radius
      );
      
      if (result.collision) {
        // Push out
        newState.position.x -= result.normal.x * result.penetration;
        newState.position.y -= result.normal.y * result.penetration;
        newState.position.z -= result.normal.z * result.penetration;
        
        // Cancel velocity in collision direction
        const velDotNormal = dot(newState.velocity, result.normal);
        if (velDotNormal < 0) {
          newState.velocity.x -= result.normal.x * velDotNormal;
          newState.velocity.y -= result.normal.y * velDotNormal;
          newState.velocity.z -= result.normal.z * velDotNormal;
        }
      }
    }
  }
  
  // === GROUND CLAMP ===
  if (newState.position.y < 0) {
    newState.position.y = 0;
    if (newState.velocity.y < 0) {
      newState.velocity.y = 0;
    }
    newState.isGrounded = true;
  }
  
  return newState;
}

// === JUMP ===

export function applyJump(
  state: PhysicsState,
  jumpForce: number
): PhysicsState {
  if (!state.isGrounded) return state;
  
  return {
    ...state,
    velocity: { ...state.velocity, y: jumpForce },
    isGrounded: false,
  };
}

// === IMPULSE ===

export function applyImpulse(
  state: PhysicsState,
  impulse: { x: number; y: number; z: number }
): PhysicsState {
  return {
    ...state,
    velocity: add(state.velocity, impulse),
  };
}

// === KNOCKBACK ===

export function applyKnockback(
  state: PhysicsState,
  direction: { x: number; z: number },
  force: number,
  upForce: number = 2
): PhysicsState {
  const dir = normalize({ x: direction.x, y: 0, z: direction.z });
  
  return {
    ...state,
    velocity: {
      x: state.velocity.x + dir.x * force,
      y: upForce,
      z: state.velocity.z + dir.z * force,
    },
    isGrounded: false,
  };
}

export default {
  DEFAULT_PHYSICS_CONFIG,
  createPhysicsState,
  updatePhysics,
  applyJump,
  applyImpulse,
  applyKnockback,
  checkGround,
  checkSlope,
};
