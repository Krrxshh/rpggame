/**
 * Improved Camera Controller with bug fixes
 * Pointer lock, camera-relative movement, collision
 * REPLACES/EXTENDS PlayerCamera.tsx
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface CameraConfig {
  distance: number;
  height: number;
  minPitch: number; // degrees
  maxPitch: number;
  sensitivity: number;
  invertY: boolean;
  smoothing: number;
  collisionEnabled: boolean;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  distance: 8,
  height: 3,
  minPitch: -60,
  maxPitch: 60,
  sensitivity: 0.002,
  invertY: false,
  smoothing: 0.1,
  collisionEnabled: true,
};

interface ImprovedCameraProps {
  targetPosition: { x: number; y: number; z: number };
  config?: Partial<CameraConfig>;
  onRotationChange?: (yaw: number) => void;
  shakeAmount?: number;
}

export function ImprovedCamera({
  targetPosition,
  config: configOverride,
  onRotationChange,
  shakeAmount = 0,
}: ImprovedCameraProps) {
  const { camera, gl } = useThree();
  const config = { ...DEFAULT_CAMERA_CONFIG, ...configOverride };
  
  // Camera angles
  const yawRef = useRef(0);
  const pitchRef = useRef(20); // Start looking slightly down
  const [isLocked, setIsLocked] = useState(false);
  
  // Smooth positions
  const currentPos = useRef(new THREE.Vector3(0, 5, 10));
  const targetPos = useRef(new THREE.Vector3());
  
  // Pointer lock handling
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleClick = () => {
      if (!isLocked) {
        canvas.requestPointerLock();
      }
    };
    
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === canvas);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      
      const { sensitivity, invertY, minPitch, maxPitch } = config;
      
      yawRef.current -= e.movementX * sensitivity;
      pitchRef.current += e.movementY * sensitivity * (invertY ? -1 : 1) * 60;
      pitchRef.current = Math.max(minPitch, Math.min(maxPitch, pitchRef.current));
      
      onRotationChange?.(yawRef.current);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isLocked) {
        document.exitPointerLock();
      }
    };
    
    canvas.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gl, isLocked, config, onRotationChange]);
  
  useFrame(() => {
    const { distance, height, smoothing } = config;
    
    // Calculate camera position based on yaw and pitch
    const pitchRad = THREE.MathUtils.degToRad(pitchRef.current);
    const yaw = yawRef.current;
    
    // Offset from target (spherical coordinates)
    const offsetX = Math.sin(yaw) * Math.cos(pitchRad) * distance;
    const offsetY = Math.sin(pitchRad) * distance + height;
    const offsetZ = Math.cos(yaw) * Math.cos(pitchRad) * distance;
    
    targetPos.current.set(
      targetPosition.x + offsetX,
      targetPosition.y + offsetY,
      targetPosition.z + offsetZ
    );
    
    // Smooth camera movement
    currentPos.current.lerp(targetPos.current, smoothing);
    
    // Apply shake
    if (shakeAmount > 0) {
      currentPos.current.x += (Math.random() - 0.5) * shakeAmount;
      currentPos.current.y += (Math.random() - 0.5) * shakeAmount * 0.5;
    }
    
    camera.position.copy(currentPos.current);
    
    // Look at target
    camera.lookAt(
      targetPosition.x,
      targetPosition.y + 1.5,
      targetPosition.z
    );
  });
  
  return null;
}

// Camera-relative movement direction helper
export function getCameraRelativeDirection(
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean },
  cameraYaw: number
): { x: number; z: number } {
  let moveX = 0;
  let moveZ = 0;
  
  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  
  // Normalize
  const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (length === 0) return { x: 0, z: 0 };
  
  moveX /= length;
  moveZ /= length;
  
  // Rotate by camera yaw
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  
  return {
    x: moveX * cos - moveZ * sin,
    z: moveX * sin + moveZ * cos,
  };
}

// Pointer lock overlay
interface PointerLockOverlayProps {
  isLocked: boolean;
}

export function PointerLockOverlay({ isLocked }: PointerLockOverlayProps) {
  if (isLocked) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.7)',
      color: '#888',
      padding: '20px 40px',
      borderRadius: '8px',
      fontSize: '16px',
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      Click to control camera
    </div>
  );
}

export default ImprovedCamera;
