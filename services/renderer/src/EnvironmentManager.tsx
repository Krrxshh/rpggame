'use client';

/**
 * Environment Manager
 * Controls fog, palette transitions, and world atmosphere
 * NEW FILE - extends renderer
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LightingPreset } from '../../utils/src/color';

interface EnvironmentManagerProps {
  worldProgress: number; // 0-1, affects brightness
  fogDensity: number;
  fogColor: string;
  lightingPreset: LightingPreset;
}

export function EnvironmentManager({
  worldProgress,
  fogDensity,
  fogColor,
  lightingPreset,
}: EnvironmentManagerProps) {
  const { scene, gl } = useThree();
  const targetFogDensity = useRef(fogDensity);
  const targetFogColor = useRef(new THREE.Color(fogColor));
  
  // Update targets when props change
  useEffect(() => {
    targetFogDensity.current = fogDensity * (1 - worldProgress * 0.4);
    targetFogColor.current = new THREE.Color(fogColor);
  }, [fogDensity, fogColor, worldProgress]);
  
  // Setup fog
  useEffect(() => {
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    scene.background = new THREE.Color(fogColor).multiplyScalar(0.3);
    
    return () => {
      scene.fog = null;
    };
  }, [scene, fogColor, fogDensity]);
  
  // Smooth transitions
  useFrame(() => {
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      scene.fog.density += (targetFogDensity.current - scene.fog.density) * 0.02;
      scene.fog.color.lerp(targetFogColor.current, 0.02);
      
      if (scene.background instanceof THREE.Color) {
        const targetBg = targetFogColor.current.clone().multiplyScalar(0.2 + worldProgress * 0.1);
        scene.background.lerp(targetBg, 0.02);
      }
    }
  });
  
  // Ambient lighting based on preset and progress
  const ambientIntensity = useMemo(() => {
    const baseIntensity = lightingPreset === 'dark' ? 0.2 : 0.4;
    return baseIntensity + worldProgress * 0.3;
  }, [lightingPreset, worldProgress]);
  
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <hemisphereLight
        color="#ffffff"
        groundColor={fogColor}
        intensity={0.3 + worldProgress * 0.2}
      />
    </>
  );
}

export default EnvironmentManager;
