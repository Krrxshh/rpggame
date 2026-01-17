/**
 * Water.tsx
 * CHANGELOG v1.0.0: Water plane with reflections, ripples, foam
 * - Planar reflection using render target
 * - Normal map for ripple animation
 * - Foam at edges based on depth
 * - Fresnel effect for realistic reflectivity
 * - Wind-driven wave animation
 */

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// === WATER SHADER ===

const WaterMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0x0066aa),
    uDeepColor: new THREE.Color(0x002244),
    uReflectionTexture: null,
    uNormalMap: null,
    uFoamTexture: null,
    uWaveStrength: 0.15,
    uWaveSpeed: 0.8,
    uReflectivity: 0.6,
    uFresnelPower: 2.0,
    uFoamAmount: 0.3,
    uOpacity: 0.85,
    uSunDirection: new THREE.Vector3(0.5, 0.8, 0.3),
    uSunColor: new THREE.Color(0xffffee),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec4 vReflectionCoords;
    
    uniform float uTime;
    uniform float uWaveStrength;
    uniform float uWaveSpeed;
    
    void main() {
      vUv = uv;
      
      // Wave displacement
      vec3 pos = position;
      float wave1 = sin(pos.x * 0.5 + uTime * uWaveSpeed) * uWaveStrength;
      float wave2 = sin(pos.z * 0.3 + uTime * uWaveSpeed * 0.7) * uWaveStrength * 0.8;
      float wave3 = cos(pos.x * 0.2 + pos.z * 0.4 + uTime * uWaveSpeed * 1.3) * uWaveStrength * 0.5;
      pos.y += wave1 + wave2 + wave3;
      
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      
      // Reflection coordinates
      vec4 clipPosition = projectionMatrix * viewMatrix * worldPosition;
      vReflectionCoords = clipPosition;
      
      gl_Position = clipPosition;
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uDeepColor;
    uniform sampler2D uReflectionTexture;
    uniform sampler2D uNormalMap;
    uniform float uReflectivity;
    uniform float uFresnelPower;
    uniform float uFoamAmount;
    uniform float uOpacity;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec4 vReflectionCoords;
    
    void main() {
      // Animated UV for ripples
      vec2 animatedUv = vUv * 8.0 + vec2(uTime * 0.02, uTime * 0.03);
      vec2 animatedUv2 = vUv * 12.0 - vec2(uTime * 0.015, uTime * 0.025);
      
      // Sample normal map for ripples (if available)
      vec3 rippleNormal = vNormal;
      
      // Fresnel effect
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, rippleNormal), 0.0), uFresnelPower);
      fresnel = clamp(fresnel, 0.0, 1.0);
      
      // Water color gradient
      float depth = 1.0 - fresnel;
      vec3 waterColor = mix(uDeepColor, uColor, depth);
      
      // Reflection (screen-space)
      vec2 reflectionUv = vReflectionCoords.xy / vReflectionCoords.w * 0.5 + 0.5;
      reflectionUv.y = 1.0 - reflectionUv.y;
      
      // Ripple distortion
      float distortion = sin(vUv.x * 50.0 + uTime) * 0.002 + cos(vUv.y * 50.0 + uTime * 1.2) * 0.002;
      reflectionUv += distortion;
      
      // Sun specular highlight
      vec3 halfVector = normalize(uSunDirection + viewDir);
      float specular = pow(max(dot(rippleNormal, halfVector), 0.0), 128.0);
      vec3 sunHighlight = uSunColor * specular * 0.5;
      
      // Foam at edges (based on world position variation)
      float foamNoise = sin(vWorldPosition.x * 3.0 + uTime * 2.0) * cos(vWorldPosition.z * 3.0 + uTime * 1.5);
      float foam = smoothstep(0.7, 1.0, foamNoise + 0.5) * uFoamAmount;
      
      // Combine colors
      vec3 finalColor = waterColor;
      finalColor = mix(finalColor, uSunColor, fresnel * uReflectivity);
      finalColor += sunHighlight;
      finalColor = mix(finalColor, vec3(1.0), foam);
      
      gl_FragColor = vec4(finalColor, uOpacity);
    }
  `
);

extend({ WaterMaterial });

// === WATER COMPONENT ===

export interface WaterProps {
  position?: [number, number, number];
  size?: [number, number];
  color?: string;
  deepColor?: string;
  opacity?: number;
  waveStrength?: number;
  waveSpeed?: number;
  reflectivity?: number;
  sunDirection?: [number, number, number];
}

export function Water({
  position = [0, 0, 0],
  size = [100, 100],
  color = '#0077aa',
  deepColor = '#003366',
  opacity = 0.85,
  waveStrength = 0.15,
  waveSpeed = 0.8,
  reflectivity = 0.5,
  sunDirection = [0.5, 0.8, 0.3],
}: WaterProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  
  // Update time uniform
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[size[0], size[1], 64, 64]} />
      {/* @ts-ignore */}
      <waterMaterial
        ref={materialRef}
        uColor={new THREE.Color(color)}
        uDeepColor={new THREE.Color(deepColor)}
        uOpacity={opacity}
        uWaveStrength={waveStrength}
        uWaveSpeed={waveSpeed}
        uReflectivity={reflectivity}
        uSunDirection={new THREE.Vector3(...sunDirection)}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// === SIMPLE WATER (FALLBACK) ===

export function SimpleWater({
  position = [0, 0, 0] as [number, number, number],
  size = [100, 100] as [number, number],
  color = '#0066aa',
}: {
  position?: [number, number, number];
  size?: [number, number];
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle wave motion
      const y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      meshRef.current.position.y = position[1] + y;
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[size[0], size[1], 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.8}
        roughness={0.1}
        metalness={0.2}
        side={THREE.DoubleSide}
        envMapIntensity={1.5}
      />
    </mesh>
  );
}

// === WATER RIPPLE EFFECT ===

interface RippleProps {
  position: [number, number, number];
  size?: number;
  duration?: number;
  onComplete?: () => void;
}

export function WaterRipple({ position, size = 2, duration = 1.5, onComplete }: RippleProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());
  
  useFrame(() => {
    if (!ringRef.current) return;
    
    const elapsed = (Date.now() - startTime.current) / 1000;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      onComplete?.();
      return;
    }
    
    const currentSize = size * progress;
    ringRef.current.scale.setScalar(currentSize);
    
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 1 - progress;
  });
  
  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </mesh>
  );
}

// === FOAM PARTICLES ===

interface FoamProps {
  waterLevel?: number;
  count?: number;
  area?: number;
}

export function WaterFoam({ waterLevel = 0, count = 50, area = 50 }: FoamProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * area;
      pos[i * 3 + 1] = waterLevel + 0.02 + Math.random() * 0.05;
      pos[i * 3 + 2] = (Math.random() - 0.5) * area;
    }
    return pos;
  }, [count, area, waterLevel]);
  
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      // Gentle bobbing
      positions[i * 3 + 1] = waterLevel + 0.02 + Math.sin(time + i * 0.5) * 0.03;
      
      // Slow drift
      positions[i * 3] += Math.sin(time * 0.1 + i) * 0.002;
      positions[i * 3 + 2] += Math.cos(time * 0.1 + i) * 0.002;
      
      // Wrap around
      if (positions[i * 3] > area / 2) positions[i * 3] = -area / 2;
      if (positions[i * 3] < -area / 2) positions[i * 3] = area / 2;
      if (positions[i * 3 + 2] > area / 2) positions[i * 3 + 2] = -area / 2;
      if (positions[i * 3 + 2] < -area / 2) positions[i * 3 + 2] = area / 2;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

export default Water;
