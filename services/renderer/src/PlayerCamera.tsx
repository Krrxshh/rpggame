'use client';

/**
 * Player Camera Component
 * Third-person camera with smooth follow, mouse look, zoom, and shake
 * NEW FILE - R3F camera controller for action RPG
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// === TYPES ===

export interface CameraConfig {
  distance: number;
  height: number;
  lookAtHeight: number;
  smoothing: number;
  rotationSmoothingX: number;
  rotationSmoothingY: number;
  minPitch: number;
  maxPitch: number;
  sensitivity: number;
  invertY: boolean;
  zoomSpeed: number;
  minZoom: number;
  maxZoom: number;
}

export interface CameraState {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  zoom: number;
  targetZoom: number;
  shakeIntensity: number;
  shakeDecay: number;
}

// === DEFAULT CONFIG ===

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  distance: 8,
  height: 4,
  lookAtHeight: 1.5,
  smoothing: 0.1,
  rotationSmoothingX: 0.15,
  rotationSmoothingY: 0.1,
  minPitch: -0.5,
  maxPitch: 1.2,
  sensitivity: 0.002,
  invertY: false,
  zoomSpeed: 0.5,
  minZoom: 4,
  maxZoom: 15,
};

// === COMPONENT ===

interface PlayerCameraProps {
  targetPosition: { x: number; y: number; z: number };
  config?: Partial<CameraConfig>;
  onRotationChange?: (yaw: number) => void;
  shakeAmount?: number;
  zoomTarget?: number;
}

export function PlayerCamera({
  targetPosition,
  config: configOverride,
  onRotationChange,
  shakeAmount = 0,
  zoomTarget,
}: PlayerCameraProps) {
  const { camera, gl } = useThree();
  const config = { ...DEFAULT_CAMERA_CONFIG, ...configOverride };
  
  const stateRef = useRef<CameraState>({
    yaw: 0,
    pitch: 0.4,
    targetYaw: 0,
    targetPitch: 0.4,
    zoom: config.distance,
    targetZoom: config.distance,
    shakeIntensity: 0,
    shakeDecay: 0.9,
  });
  
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const smoothedPosition = useRef(new THREE.Vector3(0, 0, 0));
  
  // Pointer lock handling
  const handlePointerLockChange = useCallback(() => {
    setIsPointerLocked(document.pointerLockElement === gl.domElement);
  }, [gl.domElement]);
  
  const handleClick = useCallback(() => {
    if (!isPointerLocked) {
      gl.domElement.requestPointerLock();
    }
  }, [gl.domElement, isPointerLocked]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isPointerLocked) return;
    
    const state = stateRef.current;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    state.targetYaw -= movementX * config.sensitivity;
    
    const pitchDelta = movementY * config.sensitivity * (config.invertY ? -1 : 1);
    state.targetPitch = Math.max(
      config.minPitch,
      Math.min(config.maxPitch, state.targetPitch + pitchDelta)
    );
  }, [isPointerLocked, config.sensitivity, config.invertY, config.minPitch, config.maxPitch]);
  
  const handleWheel = useCallback((event: WheelEvent) => {
    const state = stateRef.current;
    const delta = event.deltaY > 0 ? 1 : -1;
    state.targetZoom = Math.max(
      config.minZoom,
      Math.min(config.maxZoom, state.targetZoom + delta * config.zoomSpeed)
    );
  }, [config.minZoom, config.maxZoom, config.zoomSpeed]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isPointerLocked) {
      document.exitPointerLock();
    }
  }, [isPointerLocked]);
  
  // Setup event listeners
  useEffect(() => {
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleWheel);
    document.addEventListener('keydown', handleKeyDown);
    gl.domElement.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [handlePointerLockChange, handleMouseMove, handleWheel, handleKeyDown, handleClick, gl.domElement]);
  
  // Update shake
  useEffect(() => {
    if (shakeAmount > 0) {
      stateRef.current.shakeIntensity = shakeAmount;
    }
  }, [shakeAmount]);
  
  // Update zoom target
  useEffect(() => {
    if (zoomTarget !== undefined) {
      stateRef.current.targetZoom = zoomTarget;
    }
  }, [zoomTarget]);
  
  // Frame update
  useFrame(() => {
    const state = stateRef.current;
    
    // Smooth rotation
    state.yaw += (state.targetYaw - state.yaw) * config.rotationSmoothingX;
    state.pitch += (state.targetPitch - state.pitch) * config.rotationSmoothingY;
    state.zoom += (state.targetZoom - state.zoom) * 0.1;
    
    // Callback for player rotation
    if (onRotationChange) {
      onRotationChange(state.yaw);
    }
    
    // Calculate camera position based on yaw and pitch
    const horizontalDistance = state.zoom * Math.cos(state.pitch);
    const verticalDistance = state.zoom * Math.sin(state.pitch);
    
    const cameraX = targetPosition.x + Math.sin(state.yaw) * horizontalDistance;
    const cameraY = targetPosition.y + config.height + verticalDistance;
    const cameraZ = targetPosition.z + Math.cos(state.yaw) * horizontalDistance;
    
    // Smooth position
    smoothedPosition.current.lerp(
      new THREE.Vector3(cameraX, cameraY, cameraZ),
      config.smoothing
    );
    
    // Apply shake
    let shakeX = 0;
    let shakeY = 0;
    if (state.shakeIntensity > 0.01) {
      shakeX = (Math.random() - 0.5) * state.shakeIntensity;
      shakeY = (Math.random() - 0.5) * state.shakeIntensity;
      state.shakeIntensity *= state.shakeDecay;
    }
    
    // Set camera position and look at target
    camera.position.set(
      smoothedPosition.current.x + shakeX,
      smoothedPosition.current.y + shakeY,
      smoothedPosition.current.z
    );
    
    camera.lookAt(
      targetPosition.x,
      targetPosition.y + config.lookAtHeight,
      targetPosition.z
    );
  });
  
  return null;
}

// === CAMERA SHAKE HOOK ===

export function useCameraShake() {
  const [shakeAmount, setShakeAmount] = useState(0);
  
  const shake = useCallback((intensity: number) => {
    setShakeAmount(intensity);
    setTimeout(() => setShakeAmount(0), 50);
  }, []);
  
  return { shakeAmount, shake };
}

// === ZOOM HOOK ===

export function useZoom(baseZoom: number = 8) {
  const [zoom, setZoom] = useState(baseZoom);
  
  const attackZoom = useCallback(() => {
    setZoom(baseZoom * 0.85);
    setTimeout(() => setZoom(baseZoom), 200);
  }, [baseZoom]);
  
  return { zoom, setZoom, attackZoom };
}

export default PlayerCamera;
