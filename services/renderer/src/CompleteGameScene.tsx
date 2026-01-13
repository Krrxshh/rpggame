'use client';

/**
 * Complete Game Scene with Asset Integration
 * Uses real 3D models, environment, day/night, weather
 */

import { useRef, useEffect, useCallback, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, ContactShadows, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { AssetPlayer } from './AssetPlayer';
import { AssetEnemy } from './AssetEnemy';
import { EnvironmentSpawner } from './EnvironmentSpawner';
import { ImprovedCamera, getCameraRelativeDirection } from './ImprovedCamera';
import { useActionGameStore } from '../../state/src/actionGameStore';
import {
  updatePlayerController,
  DEFAULT_CONFIG,
  applyDamageToPlayer,
  type InputState,
} from '../../game-engine/src/playerController';
import {
  createEnemyAI,
  updateEnemyAI,
  applyDamageToEnemy,
  checkAttackHit,
  type EnemyAIState,
  BASIC_ATTACKS,
} from '../../game-engine/src/enemyAI';
import { generateBoss } from '../../content-generator/src/bossGenerator';
import { createRNG } from '../../utils/src/rng';

// === INPUT HANDLER ===
function useGameInput(): InputState & { skillKeys: boolean[] } {
  const [input, setInput] = useState<InputState & { skillKeys: boolean[] }>({
    forward: false, backward: false, left: false, right: false,
    sprint: false, dodge: false, attack: false, heavyAttack: false, block: false,
    mouseX: 0, mouseY: 0,
    skillKeys: [false, false, false, false],
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: true })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: true })); break;
        case 'KeyA': setInput(i => ({ ...i, left: true })); break;
        case 'KeyD': setInput(i => ({ ...i, right: true })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: true })); break;
        case 'Space': 
          setInput(i => ({ ...i, dodge: true }));
          setTimeout(() => setInput(i => ({ ...i, dodge: false })), 100);
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: false })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: false })); break;
        case 'KeyA': setInput(i => ({ ...i, left: false })); break;
        case 'KeyD': setInput(i => ({ ...i, right: false })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: false })); break;
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) setInput(i => ({ ...i, attack: true }));
      if (e.button === 2) setInput(i => ({ ...i, block: true }));
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setInput(i => ({ ...i, attack: false }));
      if (e.button === 2) setInput(i => ({ ...i, block: false }));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  return input;
}

// === TERRAIN ===
function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
      <planeGeometry args={[500, 500, 100, 100]} />
      <meshStandardMaterial 
        color="#3a5a3a" 
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

// === GAME LOOP ===
interface GameLoopProps {
  input: InputState & { skillKeys: boolean[] };
  timeOfDay: number;
  onPlayerDeath: () => void;
  onEnemyKill: (isBoss: boolean) => void;
}

function GameLoop({ input, timeOfDay, onPlayerDeath, onEnemyKill }: GameLoopProps) {
  const store = useActionGameStore();
  const { scene } = useThree();
  
  const enemiesRef = useRef<EnemyAIState[]>([]);
  const rngRef = useRef(createRNG(Date.now()));
  const lastSpawnCheck = useRef(0);
  const [shake, setShake] = useState(0);
  const [, forceUpdate] = useState(0);
  
  // Initial enemy spawn
  useEffect(() => {
    if (enemiesRef.current.length === 0) {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const dist = 15 + Math.random() * 10;
        enemiesRef.current.push(
          createEnemyAI(
            `enemy-${i}`, 
            { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
            50 + store.enemiesDefeated * 5,
            rngRef.current
          )
        );
      }
    }
  }, [store.enemiesDefeated]);
  
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { player, cameraRotation, setPlayer, setCameraRotation } = store;
    
    // Apply camera-relative movement
    const moveDir = getCameraRelativeDirection(input, cameraRotation);
    const modifiedInput = {
      ...input,
      forward: moveDir.z < -0.3,
      backward: moveDir.z > 0.3,
      left: moveDir.x < -0.3,
      right: moveDir.x > 0.3,
    };
    
    // Update player
    const { state: newPlayer, attackResult } = updatePlayerController(
      player, modifiedInput, DEFAULT_CONFIG, dt, cameraRotation, [], 20 + player.attackBuff
    );
    
    // Player attacks enemies
    if (attackResult?.hitFrame) {
      setShake(0.3);
      
      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i];
        if (enemy.hp <= 0) continue;
        
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 3) {
          const angleToEnemy = Math.atan2(dx, -dz);
          const angleDiff = Math.abs(((angleToEnemy - player.rotation + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (angleDiff < Math.PI / 3) {
            enemiesRef.current[i] = applyDamageToEnemy(enemy, attackResult.damage, attackResult.isHeavy);
            setShake(0.5);
            
            if (enemiesRef.current[i].hp <= 0) {
              onEnemyKill(enemy.id.startsWith('boss'));
            }
          }
        }
      }
    }
    
    // Update enemies
    for (let i = 0; i < enemiesRef.current.length; i++) {
      const enemy = enemiesRef.current[i];
      if (enemy.hp <= 0) continue;
      
      const { state: updatedEnemy, attackHit } = updateEnemyAI(
        enemy,
        { x: newPlayer.position.x, z: newPlayer.position.z },
        dt,
        rngRef.current,
        undefined,
        BASIC_ATTACKS
      );
      
      enemiesRef.current[i] = updatedEnemy;
      
      // Enemy attacks player
      if (attackHit) {
        const hit = checkAttackHit(
          attackHit, 
          { x: enemy.position.x, z: enemy.position.z }, 
          enemy.rotation, 
          { x: newPlayer.position.x, z: newPlayer.position.z }
        );
        
        if (hit) {
          const { state: damagedPlayer, actualDamage, wasParried } = applyDamageToPlayer(newPlayer, attackHit.damage);
          
          if (wasParried) {
            enemiesRef.current[i] = applyDamageToEnemy(updatedEnemy, 0, true);
            setShake(0.3);
          } else if (actualDamage > 0) {
            setPlayer(damagedPlayer);
            setShake(0.6);
            if (damagedPlayer.hp <= 0) {
              onPlayerDeath();
            }
            return;
          }
        }
      }
    }
    
    setPlayer(newPlayer);
    
    // Spawn more enemies
    lastSpawnCheck.current += dt;
    if (lastSpawnCheck.current > 5 && enemiesRef.current.filter(e => e.hp > 0).length < 5) {
      lastSpawnCheck.current = 0;
      const angle = rngRef.current.rangeFloat(0, Math.PI * 2);
      const dist = rngRef.current.rangeFloat(20, 35);
      const isBoss = rngRef.current.chance(0.15);
      
      enemiesRef.current.push(
        createEnemyAI(
          `${isBoss ? 'boss' : 'enemy'}-${Date.now()}`,
          { x: newPlayer.position.x + Math.cos(angle) * dist, y: 0, z: newPlayer.position.z + Math.sin(angle) * dist },
          isBoss ? 150 + store.enemiesDefeated * 10 : 50 + store.enemiesDefeated * 5,
          rngRef.current
        )
      );
    }
    
    // Decay shake
    if (shake > 0) setShake(Math.max(0, shake - dt * 2));
    
    forceUpdate(v => v + 1);
  });
  
  // Calculate sun position based on time
  const sunPosition = [
    Math.cos((timeOfDay / 24) * Math.PI * 2 - Math.PI / 2) * 100,
    Math.sin((timeOfDay / 24) * Math.PI * 2 - Math.PI / 2) * 100 + 20,
    50,
  ] as [number, number, number];
  
  const isNight = timeOfDay < 6 || timeOfDay > 18;
  
  return (
    <>
      {/* Camera */}
      <ImprovedCamera
        targetPosition={store.player.position}
        onRotationChange={store.setCameraRotation}
        shakeAmount={shake}
      />
      
      {/* Sky & Lighting */}
      <Sky 
        sunPosition={sunPosition}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={isNight ? 0.1 : 3}
      />
      <ambientLight intensity={isNight ? 0.15 : 0.4} />
      <directionalLight
        position={sunPosition}
        intensity={isNight ? 0.2 : 1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        color={isNight ? '#4466aa' : '#ffffee'}
      />
      
      {/* Fog */}
      <fog attach="fog" args={[isNight ? '#0a0a1a' : '#88aacc', 50, 200]} />
      
      {/* Player with actual model */}
      <AssetPlayer state={store.player} />
      
      {/* Enemies with actual models */}
      {enemiesRef.current.map(enemy => (
        <AssetEnemy key={enemy.id} enemy={enemy} isBoss={enemy.id.startsWith('boss')} />
      ))}
      
      {/* Terrain */}
      <Terrain />
      
      {/* Environment with real assets */}
      <EnvironmentSpawner 
        seed={store.seed || 'default'}
        radius={80}
        centerX={0}
        centerZ={0}
        density={1.5}
      />
      
      {/* Ground shadows */}
      <ContactShadows 
        position={[0, 0, 0]}
        opacity={0.4}
        scale={100}
        blur={2}
        far={20}
      />
    </>
  );
}

// === MAIN SCENE ===
interface CompleteGameSceneProps {
  timeOfDay?: number;
}

export function CompleteGameScene({ timeOfDay = 12 }: CompleteGameSceneProps) {
  const input = useGameInput();
  const store = useActionGameStore();
  
  const handlePlayerDeath = useCallback(() => {
    store.setPhase('gameover');
  }, [store]);
  
  const handleEnemyKill = useCallback((isBoss: boolean) => {
    store.enemyDefeated(isBoss);
  }, [store]);
  
  return (
    <Canvas 
      shadows 
      camera={{ fov: 60, near: 0.1, far: 500 }} 
      onContextMenu={e => e.preventDefault()}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <GameLoop 
          input={input} 
          timeOfDay={timeOfDay}
          onPlayerDeath={handlePlayerDeath} 
          onEnemyKill={handleEnemyKill} 
        />
      </Suspense>
      <Stats />
    </Canvas>
  );
}

export default CompleteGameScene;
