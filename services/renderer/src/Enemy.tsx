'use client';

/**
 * Enemy Component
 * Procedural enemy mesh with visual type variations
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorStore } from '../../state/src/floor-store';
import type { Enemy as EnemyType } from '../../game-engine/src/types';

export function Enemy() {
  const meshRef = useRef<THREE.Mesh>(null);
  const eyesRef = useRef<THREE.Group>(null);
  
  const enemy = useFloorStore((state) => state.enemy);
  const currentFloor = useFloorStore((state) => state.currentFloor);
  
  // Create geometry based on enemy visual type
  const geometry = useMemo(() => {
    if (!enemy) return new THREE.SphereGeometry(0.6, 16, 16);
    
    switch (enemy.visualType) {
      case 'sphere':
        return new THREE.SphereGeometry(0.6, 32, 32);
      case 'cube':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'pyramid':
        return new THREE.ConeGeometry(0.6, 1.2, 4);
      case 'complex':
        return new THREE.IcosahedronGeometry(0.7, 1);
      default:
        return new THREE.SphereGeometry(0.6, 16, 16);
    }
  }, [enemy?.visualType]);
  
  // Animation
  useFrame((state) => {
    if (!meshRef.current || !enemy) return;
    
    const isAlive = enemy.hp > 0;
    
    if (isAlive) {
      // Menacing hover
      meshRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
      
      // Slow rotation
      meshRef.current.rotation.y += 0.015;
      
      // Aggressive shake when low HP
      const hpRatio = enemy.hp / enemy.maxHp;
      if (hpRatio < 0.3) {
        meshRef.current.position.x += (Math.random() - 0.5) * 0.02;
        meshRef.current.position.z += (Math.random() - 0.5) * 0.02;
      }
    } else {
      // Death animation - sink and fade
      meshRef.current.position.y = Math.max(-1, meshRef.current.position.y - 0.05);
      meshRef.current.rotation.x += 0.1;
    }
    
    // Eyes tracking (look at camera)
    if (eyesRef.current && isAlive) {
      eyesRef.current.lookAt(state.camera.position);
    }
  });
  
  if (!enemy || !currentFloor) return null;
  
  const isAlive = enemy.hp > 0;
  const hpRatio = enemy.hp / enemy.maxHp;
  
  return (
    <group position={[enemy.position.x, 0, enemy.position.y]}>
      {/* Main Enemy Mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        visible={isAlive || enemy.hp > -5} // Fade after death
      >
        <meshPhysicalMaterial
          color={enemy.color}
          roughness={0.4}
          metalness={0.6}
          emissive={enemy.color}
          emissiveIntensity={isAlive ? 0.2 + (1 - hpRatio) * 0.3 : 0}
          transparent={!isAlive}
          opacity={isAlive ? 1 : 0.5}
        />
      </mesh>
      
      {/* Enemy Eyes */}
      {isAlive && (
        <group ref={eyesRef} position={[0, 0.8, 0]}>
          <mesh position={[-0.2, 0.1, 0.4]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          <mesh position={[0.2, 0.1, 0.4]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      )}
      
      {/* HP Indicator Ring */}
      {isAlive && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8 * hpRatio, 0.9, 32]} />
          <meshBasicMaterial
            color={hpRatio > 0.5 ? '#ff4444' : '#ff8800'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
      
      {/* Enemy Aura */}
      {isAlive && (
        <pointLight
          color={enemy.color}
          intensity={0.8}
          distance={6}
          position={[0, 1, 0]}
        />
      )}
      
      {/* Danger Indicator for high-power enemies */}
      {isAlive && enemy.attack.power >= 4 && (
        <mesh position={[0, 2, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  );
}

export default Enemy;
