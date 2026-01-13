'use client';

/**
 * Asset-based Enemy Component
 * Stylized procedural mesh to avoid texture issues
 * SIMPLIFIED
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { EnemyAIState } from '../../game-engine/src/enemyAI';

interface AssetEnemyProps {
  enemy: EnemyAIState;
  isBoss?: boolean;
}

export function AssetEnemy({ enemy, isBoss }: AssetEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hpPercent = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(enemy.position.x, enemy.position.y, enemy.position.z);
      groupRef.current.rotation.y = enemy.rotation;
      
      // Bobbing animation
      const bob = Math.sin(Date.now() * 0.004) * 0.05;
      groupRef.current.position.y = enemy.position.y + bob;
      
      // State-based scale
      const stateScale = enemy.currentState === 'telegraph' ? 1.15 : enemy.isStaggered ? 0.9 : 1;
      const bossScale = isBoss ? 1.5 : 1;
      groupRef.current.scale.setScalar(stateScale * bossScale);
    }
  });
  
  if (enemy.hp <= 0) return null;
  
  // Color based on state
  const getColor = () => {
    if (enemy.currentState === 'telegraph') return '#ffcc00';
    if (enemy.currentState === 'attack') return '#ff4400';
    if (enemy.isStaggered) return '#888888';
    return isBoss ? '#aa2200' : '#cc4444';
  };
  
  const color = getColor();
  const emissiveIntensity = enemy.currentState === 'telegraph' ? 0.5 : 0.1;
  
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, isBoss ? 1.2 : 0.9, 0]} castShadow>
        <capsuleGeometry args={[isBoss ? 0.45 : 0.3, isBoss ? 1.2 : 0.8, 8, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, isBoss ? 2.1 : 1.6, 0]} castShadow>
        <sphereGeometry args={[isBoss ? 0.3 : 0.2, 16, 16]} />
        <meshStandardMaterial 
          color={isBoss ? '#551111' : '#664444'}
          roughness={0.7}
        />
      </mesh>
      
      {/* Eyes (glowing) */}
      <mesh position={[isBoss ? 0.12 : 0.08, isBoss ? 2.15 : 1.65, isBoss ? 0.2 : 0.15]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[isBoss ? -0.12 : -0.08, isBoss ? 2.15 : 1.65, isBoss ? 0.2 : 0.15]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Weapon for boss */}
      {isBoss && (
        <mesh position={[0.7, 1, 0]} rotation={[0, 0, -0.5]} castShadow>
          <boxGeometry args={[0.15, 1.5, 0.15]} />
          <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      
      {/* Telegraph indicator */}
      {enemy.currentState === 'telegraph' && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* HP Bar */}
      <Html position={[0, isBoss ? 3 : 2.2, 0]} center>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: isBoss ? '80px' : '50px',
            height: '6px',
            background: '#222',
            borderRadius: '3px',
            overflow: 'hidden',
            border: '1px solid #444',
          }}>
            <div style={{
              width: `${hpPercent * 100}%`,
              height: '100%',
              background: hpPercent > 0.5 ? '#44cc44' : hpPercent > 0.25 ? '#cccc44' : '#cc4444',
              transition: 'width 0.2s',
            }} />
          </div>
          {isBoss && (
            <div style={{ 
              color: '#ff6644', 
              fontSize: '10px', 
              marginTop: '2px',
              fontWeight: 'bold',
              textShadow: '0 0 5px #ff4400',
            }}>
              BOSS
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export default AssetEnemy;
