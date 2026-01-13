'use client';

/**
 * Particles Component
 * Instanced particle system for combat effects
 */

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorStore } from '../../state/src/floor-store';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 200;
const PARTICLE_SIZE = 0.15;

export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  const currentFloor = useFloorStore((state) => state.currentFloor);
  const enemy = useFloorStore((state) => state.enemy);
  
  // Initialize particles array
  useMemo(() => {
    particlesRef.current = [];
  }, []);
  
  // Spawn particles
  const spawnParticles = useCallback((
    position: THREE.Vector3,
    count: number,
    color: string,
    speed: number = 2
  ) => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) {
        // Reuse oldest particle
        particlesRef.current.shift();
      }
      
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const velocityMag = speed * (0.5 + Math.random() * 0.5);
      
      particlesRef.current.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * velocityMag,
          Math.sin(elevation) * velocityMag + 2,
          Math.sin(angle) * Math.cos(elevation) * velocityMag
        ),
        color: new THREE.Color(color),
        size: PARTICLE_SIZE * (0.5 + Math.random() * 0.5),
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
      });
    }
  }, []);
  
  // Expose spawn function globally for combat effects
  useMemo(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { spawnParticles: typeof spawnParticles }).spawnParticles = spawnParticles;
    }
  }, [spawnParticles]);
  
  // Update particles
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const particles = particlesRef.current;
    const gravity = -5;
    
    // Update each particle
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      
      // Remove dead particles
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      
      // Physics
      p.velocity.y += gravity * delta;
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      
      // Bounce off ground
      if (p.position.y < 0.1) {
        p.position.y = 0.1;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
      }
    }
    
    // Update instanced mesh
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < particles.length) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const scale = p.size * (1 - lifeRatio * 0.5); // Shrink over time
        
        tempObject.position.copy(p.position);
        tempObject.scale.setScalar(scale);
        tempObject.updateMatrix();
        
        meshRef.current.setMatrixAt(i, tempObject.matrix);
        
        // Fade color
        tempColor.copy(p.color).multiplyScalar(1 - lifeRatio * 0.5);
        meshRef.current.setColorAt(i, tempColor);
      } else {
        // Hide unused particles
        tempObject.position.set(0, -100, 0);
        tempObject.scale.setScalar(0);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  // Spawn ambient particles occasionally
  useFrame((state) => {
    if (!currentFloor || !enemy) return;
    
    // Ambient particles based on enemy state
    if (enemy.hp > 0 && Math.random() < 0.02) {
      spawnParticles(
        new THREE.Vector3(enemy.position.x, 0.5, enemy.position.y),
        1,
        enemy.color,
        0.5
      );
    }
  });
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.8}
        vertexColors
      />
    </instancedMesh>
  );
}

export default Particles;
