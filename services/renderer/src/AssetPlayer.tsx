'use client';

/**
 * Asset-based Player Component
 * Uses simple procedural mesh - 3D model loading as fallback
 * SIMPLIFIED to avoid texture loading issues
 */

import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerState } from '../../game-engine/src/playerController';

interface AssetPlayerProps {
  state: PlayerState;
}

// Stylized player mesh (no external textures needed)
function StylizedPlayerMesh({ state }: AssetPlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position.x, state.position.y, state.position.z);
      groupRef.current.rotation.y = state.rotation;
      
      // Animation through scaling
      const breathe = 1 + Math.sin(Date.now() * 0.003) * 0.02;
      const actionScale = state.isAttacking ? 1.1 : state.isDodging ? 0.85 : state.isBlocking ? 0.95 : 1;
      groupRef.current.scale.setScalar(breathe * actionScale);
    }
  });
  
  const bodyColor = state.isBlocking ? '#4488ff' : state.isDodging ? '#88ff88' : state.isAttacking ? '#ff8844' : '#cc8844';
  const isActive = state.isAttacking || state.isDodging;
  
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial 
          color={bodyColor} 
          emissive={isActive ? bodyColor : '#000'} 
          emissiveIntensity={isActive ? 0.3 : 0}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ddb599" roughness={0.8} />
      </mesh>
      
      {/* Weapon (right hand) */}
      <group position={[0.4, 0.8, 0]} rotation={[0, 0, state.isAttacking ? -0.8 : -0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.05, 0.4, 0.15]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      
      {/* Shield (left hand) - visible when blocking */}
      {state.isBlocking && (
        <mesh position={[-0.5, 0.9, 0.2]} rotation={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.1, 0.5, 0.4]} />
          <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.4} />
        </mesh>
      )}
      
      {/* Attack slash effect */}
      {state.isAttacking && (
        <mesh position={[0.8, 1, -0.5]} rotation={[0, 0.5, 0.3]}>
          <torusGeometry args={[0.5, 0.05, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Dodge trail */}
      {state.isDodging && (
        <mesh position={[0, 0.9, 0.5]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial color="#88ff88" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

export function AssetPlayer({ state }: AssetPlayerProps) {
  return <StylizedPlayerMesh state={state} />;
}

export default AssetPlayer;
