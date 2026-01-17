/**
 * VolumetricFog.tsx
 * CHANGELOG v1.0.0: Depth-based volumetric fog with time-of-day color
 * - Noise-based density variation
 * - Height-based falloff
 * - Color based on sun position
 * - Quality-dependent slices
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// === FOG SHADER ===

const VolumetricFogMaterial = shaderMaterial(
  {
    uTime: 0,
    uFogColor: new THREE.Color(0x888888),
    uFogDensity: 0.015,
    uFogHeight: 20,
    uFogFalloff: 0.1,
    uNoiseScale: 0.02,
    uNoiseStrength: 0.3,
    uCameraPos: new THREE.Vector3(),
    uNear: 0.1,
    uFar: 100,
  },
  // Vertex shader
  `
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform float uFogHeight;
    uniform float uFogFalloff;
    uniform float uNoiseScale;
    uniform float uNoiseStrength;
    uniform vec3 uCameraPos;
    
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    // Simple 3D noise
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      return mix(
        mix(
          mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
          f.y
        ),
        mix(
          mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
          f.y
        ),
        f.z
      );
    }
    
    void main() {
      // Distance from camera
      float dist = distance(vWorldPosition, uCameraPos);
      
      // Height-based density
      float heightFactor = exp(-vWorldPosition.y * uFogFalloff);
      heightFactor = clamp(heightFactor, 0.0, 1.0);
      
      // Noise-based variation
      vec3 noisePos = vWorldPosition * uNoiseScale + vec3(uTime * 0.05, 0.0, uTime * 0.03);
      float noiseVal = noise3D(noisePos) * uNoiseStrength;
      
      // Calculate fog amount
      float fogAmount = 1.0 - exp(-dist * uFogDensity * (1.0 + noiseVal) * heightFactor);
      fogAmount = clamp(fogAmount, 0.0, 0.95);
      
      // Apply fog color
      gl_FragColor = vec4(uFogColor, fogAmount);
    }
  `
);

extend({ VolumetricFogMaterial });

// === VOLUMETRIC FOG COMPONENT ===

export interface VolumetricFogProps {
  color?: string;
  density?: number;
  height?: number;
  falloff?: number;
  noiseScale?: number;
  noiseStrength?: number;
  slices?: number; // Quality
}

export function VolumetricFog({
  color = '#8899aa',
  density = 0.015,
  height = 30,
  falloff = 0.08,
  noiseScale = 0.02,
  noiseStrength = 0.25,
  slices = 8,
}: VolumetricFogProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<any[]>([]);
  
  // Create fog planes at different distances
  const planes = useMemo(() => {
    const result = [];
    for (let i = 0; i < slices; i++) {
      const distance = 10 + (i / slices) * 100;
      const size = 200 + i * 50;
      result.push({ distance, size });
    }
    return result;
  }, [slices]);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Update each material
    materialsRef.current.forEach((mat, i) => {
      if (mat) {
        mat.uTime = state.clock.elapsedTime;
        mat.uCameraPos.copy(camera.position);
      }
    });
    
    // Position planes relative to camera
    groupRef.current.position.set(
      camera.position.x,
      0,
      camera.position.z
    );
  });
  
  return (
    <group ref={groupRef}>
      {planes.map((plane, i) => (
        <mesh
          key={i}
          position={[0, plane.distance * 0.1, -plane.distance]}
          rotation={[-Math.PI / 4, 0, 0]}
        >
          <planeGeometry args={[plane.size, plane.size * 0.5]} />
          {/* @ts-ignore */}
          <volumetricFogMaterial
            ref={(el: any) => { materialsRef.current[i] = el; }}
            uFogColor={new THREE.Color(color)}
            uFogDensity={density}
            uFogHeight={height}
            uFogFalloff={falloff}
            uNoiseScale={noiseScale}
            uNoiseStrength={noiseStrength}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// === SIMPLE FOG (FALLBACK) ===

export interface SimpleFogProps {
  color?: string;
  near?: number;
  far?: number;
}

export function SimpleFog({ color = '#888888', near = 10, far = 100 }: SimpleFogProps) {
  const { scene } = useThree();
  
  useMemo(() => {
    scene.fog = new THREE.Fog(color, near, far);
    return () => {
      scene.fog = null;
    };
  }, [scene, color, near, far]);
  
  return null;
}

// === GROUND FOG ===

export interface GroundFogProps {
  color?: string;
  height?: number;
  density?: number;
  area?: number;
}

export function GroundFog({
  color = '#aabbcc',
  height = 2,
  density = 0.6,
  area = 100,
}: GroundFogProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x;
      meshRef.current.position.z = camera.position.z;
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={[0, height / 2, 0]}
      rotation={[0, 0, 0]}
    >
      <boxGeometry args={[area, height, area]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={density * 0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// === TIME-OF-DAY FOG COLOR ===

export function getFogColorForTime(
  timeOfDay: number, // 0-24
  baseFogColor: string = '#888888'
): string {
  // Dawn: 5-7, Day: 7-18, Dusk: 18-20, Night: 20-5
  
  const dawn = { r: 255, g: 180, b: 150 };
  const day = { r: 200, g: 210, b: 220 };
  const dusk = { r: 255, g: 150, b: 100 };
  const night = { r: 30, g: 40, b: 60 };
  
  let color = day;
  
  if (timeOfDay >= 5 && timeOfDay < 7) {
    // Dawn
    const t = (timeOfDay - 5) / 2;
    color = lerpColor(night, dawn, t);
  } else if (timeOfDay >= 7 && timeOfDay < 8) {
    // Dawn to day
    const t = timeOfDay - 7;
    color = lerpColor(dawn, day, t);
  } else if (timeOfDay >= 8 && timeOfDay < 18) {
    // Day
    color = day;
  } else if (timeOfDay >= 18 && timeOfDay < 19) {
    // Day to dusk
    const t = timeOfDay - 18;
    color = lerpColor(day, dusk, t);
  } else if (timeOfDay >= 19 && timeOfDay < 21) {
    // Dusk to night
    const t = (timeOfDay - 19) / 2;
    color = lerpColor(dusk, night, t);
  } else {
    // Night
    color = night;
  }
  
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export default VolumetricFog;
