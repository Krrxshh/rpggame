'use client';

/**
 * Rain Particle System
 * Instanced rain with splashes
 * NEW FILE
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldTime } from './WorldTimeManager';
import { getRainParticleCount } from './WeatherSystem';

const RAIN_HEIGHT = 30;
const RAIN_SPREAD = 50;
const RAIN_SPEED = 25;

export function RainSystem() {
  const { weather } = useWorldTime();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particleCount = useMemo(() => getRainParticleCount(weather), [weather.type, weather.intensity]);
  
  // Initialize rain particles
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < 5000; i++) {
      data.push({
        x: (Math.random() - 0.5) * RAIN_SPREAD * 2,
        y: Math.random() * RAIN_HEIGHT,
        z: (Math.random() - 0.5) * RAIN_SPREAD * 2,
        speed: 0.8 + Math.random() * 0.4,
      });
    }
    return data;
  }, []);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame((state, delta) => {
    if (!meshRef.current || particleCount === 0) return;
    
    const playerPos = state.camera.position;
    
    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      
      // Move rain down
      p.y -= RAIN_SPEED * p.speed * delta;
      
      // Reset when below ground
      if (p.y < 0) {
        p.y = RAIN_HEIGHT;
        p.x = playerPos.x + (Math.random() - 0.5) * RAIN_SPREAD * 2;
        p.z = playerPos.z + (Math.random() - 0.5) * RAIN_SPREAD * 2;
      }
      
      // Add wind offset
      const windOffset = Math.sin(weather.windDirection) * weather.windSpeed * 0.1;
      
      dummy.position.set(p.x + windOffset, p.y, p.z);
      dummy.scale.set(0.02, 0.3 + weather.intensity * 0.2, 0.02);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = particleCount;
  });
  
  if (particleCount === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 5000]} frustumCulled={false}>
      <cylinderGeometry args={[0.01, 0.01, 1, 4]} />
      <meshBasicMaterial color="#aaccff" transparent opacity={0.4} />
    </instancedMesh>
  );
}

export default RainSystem;
