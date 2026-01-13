'use client';

/**
 * Procedural Clouds Component
 * Layered cloud planes with noise
 * NEW FILE
 */

import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { useWorldTime } from './WorldTimeManager';

// Cloud shader material
const CloudMaterial = shaderMaterial(
  {
    uTime: 0,
    uCloudCoverage: 0.3,
    uSpeed: 1.0,
    uColor1: new THREE.Color(1, 1, 1),
    uColor2: new THREE.Color(0.8, 0.85, 0.9),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform float uCloudCoverage;
    uniform float uSpeed;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;
    
    // Simple noise function
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = vUv * 4.0;
      uv.x += uTime * uSpeed * 0.05;
      
      float n = fbm(uv);
      
      // Threshold based on coverage
      float threshold = 1.0 - uCloudCoverage;
      float cloud = smoothstep(threshold - 0.1, threshold + 0.2, n);
      
      vec3 color = mix(uColor2, uColor1, cloud);
      float alpha = cloud * 0.7;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ CloudMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      cloudMaterial: any;
    }
  }
}

interface CloudLayerProps {
  height: number;
  scale: number;
  speed: number;
}

function CloudLayer({ height, scale, speed }: CloudLayerProps) {
  const { weather, time } = useWorldTime();
  const materialRef = useRef<any>(null);
  
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta * speed;
      materialRef.current.uCloudCoverage = weather.cloudCoverage;
    }
  });
  
  return (
    <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[500, 500]} />
      <cloudMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function Clouds() {
  return (
    <group>
      <CloudLayer height={80} scale={1} speed={1} />
      <CloudLayer height={100} scale={1.5} speed={0.7} />
      <CloudLayer height={120} scale={2} speed={0.5} />
    </group>
  );
}

export default Clouds;
