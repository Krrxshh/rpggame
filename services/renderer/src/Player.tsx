'use client';

/**
 * Player Component
 * Animated player mesh with shader material
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../state/src/player-store';
import { useFloorStore } from '../../state/src/floor-store';

export function Player() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const position = usePlayerStore((state) => state.position);
  const hp = usePlayerStore((state) => state.hp);
  const maxHp = usePlayerStore((state) => state.maxHp);
  const inCover = usePlayerStore((state) => state.inCover);
  const currentFloor = useFloorStore((state) => state.currentFloor);
  
  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle hover animation
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Rotate slowly
      meshRef.current.rotation.y += 0.01;
    }
    
    if (glowRef.current) {
      // Pulsing glow based on HP
      const hpRatio = hp / maxHp;
      const pulseSpeed = 3 - hpRatio * 2; // Faster pulse when low HP
      const pulse = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.3;
      glowRef.current.scale.setScalar(pulse);
      
      // Color shift based on HP
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      if (hpRatio < 0.3) {
        material.color.setHex(0xff4444); // Red when low
      } else if (hpRatio < 0.6) {
        material.color.setHex(0xffaa44); // Orange when medium
      } else {
        material.color.setHex(0x44ff88); // Green when healthy
      }
    }
  });
  
  if (!currentFloor) return null;
  
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Main Player Mesh */}
      <mesh ref={meshRef} castShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshPhysicalMaterial
          color="#88ccff"
          roughness={0.2}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
      
      {/* HP Glow Ring */}
      <mesh ref={glowRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial
          color="#44ff88"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Cover Indicator */}
      {inCover && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#4488ff" />
        </mesh>
      )}
      
      {/* Point Light for player */}
      <pointLight
        color="#88ccff"
        intensity={0.5}
        distance={5}
        position={[0, 1, 0]}
      />
    </group>
  );
}

export default Player;
