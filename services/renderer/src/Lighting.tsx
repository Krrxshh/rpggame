'use client';

/**
 * Lighting Component
 * Three-point lighting setup with dynamic color
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorStore } from '../../state/src/floor-store';
import { useSettingsStore } from '../../state/src/game-store';

export function Lighting() {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);
  const rimLightRef = useRef<THREE.SpotLight>(null);
  
  const currentFloor = useFloorStore((state) => state.currentFloor);
  const graphicsQuality = useSettingsStore((state) => state.graphicsQuality);
  
  // Subtle light animation
  useFrame((state) => {
    if (keyLightRef.current) {
      // Gentle sway
      keyLightRef.current.position.x = 10 + Math.sin(state.clock.elapsedTime * 0.3) * 2;
    }
    
    if (fillLightRef.current) {
      // Pulse intensity
      fillLightRef.current.intensity = 0.4 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  // Get lighting colors from floor preset
  const getLightColors = () => {
    if (!currentFloor) {
      return {
        ambient: '#1a1a2e',
        key: '#ffffff',
        fill: '#4466aa',
        rim: '#ff6600',
      };
    }
    
    switch (currentFloor.lightingPreset) {
      case 'neon':
        return {
          ambient: '#0a0a1a',
          key: '#ffffff',
          fill: '#ff00ff',
          rim: '#00ffff',
        };
      case 'lowpoly':
        return {
          ambient: '#1a2030',
          key: '#ffeedd',
          fill: '#6688aa',
          rim: '#ff8844',
        };
      case 'pastel':
        return {
          ambient: '#f0e8f0',
          key: '#ffffff',
          fill: '#aabbff',
          rim: '#ffaacc',
        };
      case 'wireframe':
        return {
          ambient: '#000000',
          key: '#00ff88',
          fill: '#004422',
          rim: '#00ff88',
        };
      case 'dark':
        return {
          ambient: '#050508',
          key: '#aaaaaa',
          fill: '#222255',
          rim: '#553322',
        };
      case 'sunset':
        return {
          ambient: '#1a0a1a',
          key: '#ffddaa',
          fill: '#ff6644',
          rim: '#aa44ff',
        };
      default:
        return {
          ambient: '#1a1a2e',
          key: '#ffffff',
          fill: '#4466aa',
          rim: '#ff6600',
        };
    }
  };
  
  const colors = getLightColors();
  const shadowMapSize = graphicsQuality === 'high' ? 2048 : graphicsQuality === 'medium' ? 1024 : 512;
  
  return (
    <>
      {/* Ambient Light */}
      <ambientLight color={colors.ambient} intensity={0.3} />
      
      {/* Key Light (main directional) */}
      <directionalLight
        ref={keyLightRef}
        color={colors.key}
        intensity={1.2}
        position={[10, 15, 5]}
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />
      
      {/* Fill Light */}
      <pointLight
        ref={fillLightRef}
        color={colors.fill}
        intensity={0.5}
        position={[-8, 8, -5]}
        distance={30}
      />
      
      {/* Rim Light (back light) */}
      <spotLight
        ref={rimLightRef}
        color={colors.rim}
        intensity={0.8}
        position={[0, 5, -15]}
        angle={0.5}
        penumbra={0.5}
        distance={40}
      />
      
      {/* Ground Bounce Light */}
      <pointLight
        color={currentFloor?.palette?.primary || '#444466'}
        intensity={0.2}
        position={[0, -2, 0]}
        distance={20}
      />
      
      {/* Hemisphere Light for sky/ground gradient */}
      <hemisphereLight
        color="#aaccff"
        groundColor="#221122"
        intensity={0.3}
      />
    </>
  );
}

export default Lighting;
