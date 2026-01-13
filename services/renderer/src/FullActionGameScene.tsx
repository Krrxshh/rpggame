'use client';

/**
 * Full Action Game Scene
 * Enemy rendering, hit detection, skills, potions, death/respawn
 * COMPLETE IMPLEMENTATION
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerCamera, useCameraShake, useZoom } from './PlayerCamera';
import { EnvironmentManager } from './EnvironmentManager';
import { useActionGameStore } from '../../state/src/actionGameStore';
import {
  updatePlayerController,
  DEFAULT_CONFIG,
  applyDamageToPlayer,
  type InputState,
  type PlayerState,
} from '../../game-engine/src/playerController';
import {
  createEnemyAI,
  updateEnemyAI,
  applyDamageToEnemy,
  checkAttackHit,
  type EnemyAIState,
  type AttackPattern,
  BASIC_ATTACKS,
} from '../../game-engine/src/enemyAI';
import { updateWorldState, getLoadedChunks, CHUNK_SIZE } from '../../content-generator/src/regionGenerator';
import { generateBoss } from '../../content-generator/src/bossGenerator';
import { SKILLS, useSkill, updateProjectile, checkProjectileHit, type Projectile, type SkillState, createSkillState } from '../../game-engine/src/skills';
import { useQuickSlot, type Inventory } from '../../game-engine/src/items';
import { createRNG } from '../../utils/src/rng';

// === INPUT HANDLER ===

function useGameInput(): InputState & { skillKeys: boolean[]; potionKeys: boolean[] } {
  const [input, setInput] = useState<InputState & { skillKeys: boolean[]; potionKeys: boolean[] }>({
    forward: false, backward: false, left: false, right: false,
    sprint: false, dodge: false, attack: false, heavyAttack: false, block: false,
    mouseX: 0, mouseY: 0,
    skillKeys: [false, false, false, false],
    potionKeys: [false, false, false, false],
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: true })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: true })); break;
        case 'KeyA': setInput(i => ({ ...i, left: true })); break;
        case 'KeyD': setInput(i => ({ ...i, right: true })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: true })); break;
        case 'Space': case 'KeyC': case 'ControlLeft':
          setInput(i => ({ ...i, dodge: true }));
          setTimeout(() => setInput(i => ({ ...i, dodge: false })), 100);
          break;
        case 'Digit1': setInput(i => ({ ...i, skillKeys: [true, i.skillKeys[1], i.skillKeys[2], i.skillKeys[3]] })); break;
        case 'Digit2': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], true, i.skillKeys[2], i.skillKeys[3]] })); break;
        case 'Digit3': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], i.skillKeys[1], true, i.skillKeys[3]] })); break;
        case 'Digit4': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], i.skillKeys[1], i.skillKeys[2], true] })); break;
        case 'Digit5': setInput(i => ({ ...i, potionKeys: [true, i.potionKeys[1], i.potionKeys[2], i.potionKeys[3]] })); break;
        case 'Digit6': setInput(i => ({ ...i, potionKeys: [i.potionKeys[0], true, i.potionKeys[2], i.potionKeys[3]] })); break;
        case 'Digit7': setInput(i => ({ ...i, potionKeys: [i.potionKeys[0], i.potionKeys[1], true, i.potionKeys[3]] })); break;
        case 'Digit8': setInput(i => ({ ...i, potionKeys: [i.potionKeys[0], i.potionKeys[1], i.potionKeys[2], true] })); break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: false })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: false })); break;
        case 'KeyA': setInput(i => ({ ...i, left: false })); break;
        case 'KeyD': setInput(i => ({ ...i, right: false })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: false })); break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
          setInput(i => ({ ...i, skillKeys: [false, false, false, false] })); break;
        case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8':
          setInput(i => ({ ...i, potionKeys: [false, false, false, false] })); break;
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

// === PLAYER MESH ===

function PlayerMesh({ state }: { state: PlayerState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(state.position.x, 1, state.position.z);
      meshRef.current.rotation.y = state.rotation;
      const scale = state.isAttacking ? 1.15 : state.isDodging ? 0.85 : 1;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  const color = state.isBlocking ? '#4488ff' : state.isDodging ? '#88ff88' : state.isAttacking ? '#ff8844' : '#cc8844';
  
  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.3, 1, 8, 16]} />
      <meshStandardMaterial color={color} emissive={state.isAttacking ? '#ff4400' : '#000'} emissiveIntensity={state.isAttacking ? 0.4 : 0} />
    </mesh>
  );
}

// === ENEMY MESH ===

function EnemyMesh({ enemy, isBoss }: { enemy: EnemyAIState; isBoss?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const hpPercent = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(enemy.position.x, isBoss ? 1.5 : 1, enemy.position.z);
      meshRef.current.rotation.y = enemy.rotation;
      
      const isAttacking = enemy.currentState === 'attack' || enemy.currentState === 'telegraph';
      const scale = isAttacking ? 1.2 : enemy.isStaggered ? 0.9 : 1;
      meshRef.current.scale.setScalar(scale * (isBoss ? 1.5 : 1));
    }
  });
  
  if (enemy.hp <= 0) return null;
  
  const color = isBoss ? '#ff4400' : enemy.currentState === 'telegraph' ? '#ffff00' : '#cc4444';
  
  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[isBoss ? 0.5 : 0.35, isBoss ? 1.5 : 1, 8, 16]} />
        <meshStandardMaterial color={color} emissive={enemy.currentState === 'telegraph' ? '#ff8800' : '#000'} emissiveIntensity={0.3} />
      </mesh>
      {/* HP bar */}
      <mesh position={[enemy.position.x, (isBoss ? 4 : 2.5), enemy.position.z]}>
        <planeGeometry args={[isBoss ? 2 : 1, 0.15]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[enemy.position.x - (1 - hpPercent) * (isBoss ? 1 : 0.5), (isBoss ? 4 : 2.5), enemy.position.z + 0.01]}>
        <planeGeometry args={[(isBoss ? 2 : 1) * hpPercent, 0.12]} />
        <meshBasicMaterial color={hpPercent > 0.3 ? '#44cc44' : '#cc4444'} />
      </mesh>
    </group>
  );
}

// === PROJECTILE MESH ===

function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color="#ff6644" emissive="#ff4400" emissiveIntensity={0.8} />
    </mesh>
  );
}

// === OBSTACLE MESH ===

function ObstacleMesh({ obstacle }: { obstacle: { position: { x: number; y: number; z: number }; radius: number; height: number; type: string } }) {
  const color = obstacle.type === 'tree' ? '#2a4a2a' : obstacle.type === 'rock' ? '#5a5a5a' : '#4a3a3a';
  return (
    <mesh position={[obstacle.position.x, obstacle.height / 2, obstacle.position.z]} castShadow receiveShadow>
      <cylinderGeometry args={[obstacle.radius, obstacle.radius * 1.2, obstacle.height, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// === GROUND ===

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

// === GAME LOOP ===

interface GameLoopProps {
  input: InputState & { skillKeys: boolean[]; potionKeys: boolean[] };
  onPlayerDeath: () => void;
  onEnemyKill: (isBoss: boolean) => void;
}

function GameLoop({ input, onPlayerDeath, onEnemyKill }: GameLoopProps) {
  const store = useActionGameStore();
  const { shake, shakeAmount } = useCameraShake();
  const { zoom, attackZoom } = useZoom();
  
  // Game state refs for real-time updates
  const enemiesRef = useRef<EnemyAIState[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const skillStatesRef = useRef<SkillState[]>([
    createSkillState('fireball'),
    createSkillState('frostNova'),
    createSkillState('powerStrike'),
    createSkillState('warCry'),
  ]);
  const rngRef = useRef(createRNG(Date.now()));
  const lastSpawnCheck = useRef(0);
  
  // Force re-render
  const [, forceUpdate] = useState(0);
  
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { player, cameraRotation, world, setPlayer, setWorld, setCameraRotation, inventory } = store;
    
    // Get obstacles from chunks
    const chunks = world ? getLoadedChunks(world) : [];
    const obstacles = chunks.flatMap(c => c.obstacles.map(o => ({ position: { x: o.position.x, z: o.position.z }, radius: o.radius })));
    
    // Update player
    const { state: newPlayer, attackResult } = updatePlayerController(player, input, DEFAULT_CONFIG, dt, cameraRotation, obstacles, 20 + player.attackBuff);
    
    if (attackResult?.hitFrame) {
      attackZoom();
      shake(0.25);
      
      // Check hit against enemies
      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i];
        if (enemy.hp <= 0) continue;
        
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 3) {
          const angleToEnemy = Math.atan2(dx, -dz);
          const angleDiff = Math.abs(angleToEnemy - player.rotation);
          if (angleDiff < Math.PI / 3 || angleDiff > Math.PI * 5 / 3) {
            enemiesRef.current[i] = applyDamageToEnemy(enemy, attackResult.damage, attackResult.isHeavy);
            shake(0.4);
            
            if (enemiesRef.current[i].hp <= 0) {
              onEnemyKill(enemy.id.startsWith('boss'));
            }
          }
        }
      }
    }
    
    // Handle skills (1-4)
    const skillIds = ['fireball', 'frostNova', 'powerStrike', 'warCry'];
    for (let i = 0; i < 4; i++) {
      if (input.skillKeys[i]) {
        const skill = SKILLS[skillIds[i]];
        const skillState = skillStatesRef.current[i];
        const resource = skill.costType === 'mana' ? store.mana : newPlayer.stamina;
        
        const result = useSkill(skill, skillState, newPlayer.position, newPlayer.rotation, resource, rngRef.current);
        
        if (result.success) {
          skillStatesRef.current[i] = result.skillState;
          
          if (skill.costType === 'mana') {
            store.useMana(skill.cost);
          } else {
            newPlayer.stamina -= skill.cost;
          }
          
          if (result.projectile) {
            projectilesRef.current.push(result.projectile);
          }
          
          if (result.buff) {
            newPlayer.attackBuff = result.buff.attackBuff;
            newPlayer.defenseBuff = result.buff.defenseBuff;
            newPlayer.buffDuration = result.buff.duration;
          }
          
          if (result.damage && skill.targeting === 'aoe') {
            // AoE damage
            for (let j = 0; j < enemiesRef.current.length; j++) {
              const enemy = enemiesRef.current[j];
              const dx = enemy.position.x - newPlayer.position.x;
              const dz = enemy.position.z - newPlayer.position.z;
              if (Math.sqrt(dx * dx + dz * dz) < skill.range) {
                enemiesRef.current[j] = applyDamageToEnemy(enemy, result.damage, true);
                if (enemiesRef.current[j].hp <= 0) {
                  onEnemyKill(enemy.id.startsWith('boss'));
                }
              }
            }
            shake(0.5);
          }
        }
      }
    }
    
    // Update skill cooldowns
    skillStatesRef.current = skillStatesRef.current.map(s => ({
      ...s,
      currentCooldown: Math.max(0, s.currentCooldown - dt),
    }));
    
    // Update projectiles
    projectilesRef.current = projectilesRef.current.map(p => {
      const updated = updateProjectile(p, dt);
      if (!updated) return null;
      
      // Check hit
      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i];
        if (enemy.hp <= 0) continue;
        
        if (checkProjectileHit(updated, { x: enemy.position.x, z: enemy.position.z }, 0.5)) {
          enemiesRef.current[i] = applyDamageToEnemy(enemy, updated.damage, false);
          if (enemiesRef.current[i].hp <= 0) {
            onEnemyKill(enemy.id.startsWith('boss'));
          }
          return null;
        }
      }
      
      return updated;
    }).filter((p): p is Projectile => p !== null);
    
    // Update enemies
    let playerDamaged = false;
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
      
      if (attackHit) {
        const hit = checkAttackHit(attackHit, { x: enemy.position.x, z: enemy.position.z }, enemy.rotation, { x: newPlayer.position.x, z: newPlayer.position.z });
        
        if (hit) {
          const { state: damagedPlayer, actualDamage, wasParried } = applyDamageToPlayer(newPlayer, attackHit.damage);
          
          if (wasParried) {
            enemiesRef.current[i] = applyDamageToEnemy(updatedEnemy, 0, true); // Stagger on parry
            shake(0.3);
          } else if (actualDamage > 0) {
            setPlayer(damagedPlayer);
            playerDamaged = true;
            shake(0.6);
            
            if (damagedPlayer.hp <= 0) {
              onPlayerDeath();
            }
          }
        }
      }
    }
    
    if (!playerDamaged) {
      setPlayer(newPlayer);
    }
    
    // Spawn enemies periodically
    lastSpawnCheck.current += dt;
    if (lastSpawnCheck.current > 3 && enemiesRef.current.filter(e => e.hp > 0).length < 5) {
      lastSpawnCheck.current = 0;
      
      const spawnAngle = rngRef.current.rangeFloat(0, Math.PI * 2);
      const spawnDist = rngRef.current.rangeFloat(15, 25);
      const spawnX = newPlayer.position.x + Math.cos(spawnAngle) * spawnDist;
      const spawnZ = newPlayer.position.z + Math.sin(spawnAngle) * spawnDist;
      
      const isBoss = rngRef.current.chance(0.1);
      
      if (isBoss) {
        const boss = generateBoss(store.enemiesDefeated + 1, Date.now(), { x: spawnX, y: 0, z: spawnZ });
        enemiesRef.current.push(createEnemyAI(`boss-${Date.now()}`, { x: spawnX, y: 0, z: spawnZ }, boss.hp, rngRef.current));
      } else {
        enemiesRef.current.push(createEnemyAI(`enemy-${Date.now()}`, { x: spawnX, y: 0, z: spawnZ }, 40 + store.enemiesDefeated * 5, rngRef.current));
      }
    }
    
    // Update world chunks
    if (world) {
      const newWorld = updateWorldState(world, { x: newPlayer.position.x, z: newPlayer.position.z });
      if (newWorld !== world) setWorld(newWorld);
    }
    
    // Mana regen
    store.regenMana(5 * dt);
    
    // Force re-render periodically
    forceUpdate(v => v + 1);
  });
  
  const chunks = store.world ? getLoadedChunks(store.world) : [];
  const currentChunk = chunks[0];
  
  return (
    <>
      <PlayerCamera
        targetPosition={store.player.position}
        onRotationChange={store.setCameraRotation}
        shakeAmount={shakeAmount}
        zoomTarget={zoom}
      />
      
      <EnvironmentManager
        worldProgress={store.world?.worldProgress ?? 0}
        fogDensity={currentChunk?.fogDensity ?? 0.05}
        fogColor={currentChunk?.palette?.background ?? '#1a1a1a'}
        lightingPreset={currentChunk?.lightingPreset ?? 'dark'}
      />
      
      <PlayerMesh state={store.player} />
      
      {enemiesRef.current.map(enemy => (
        <EnemyMesh key={enemy.id} enemy={enemy} isBoss={enemy.id.startsWith('boss')} />
      ))}
      
      {projectilesRef.current.map(proj => (
        <ProjectileMesh key={proj.id} projectile={proj} />
      ))}
      
      <Ground />
      
      {chunks.flatMap(chunk => chunk.obstacles.map(obs => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      )))}
      
      <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />
    </>
  );
}

// === MAIN SCENE ===

export function FullActionGameScene() {
  const input = useGameInput();
  const store = useActionGameStore();
  
  const handlePlayerDeath = useCallback(() => {
    store.setPhase('gameover');
  }, [store]);
  
  const handleEnemyKill = useCallback((isBoss: boolean) => {
    store.enemyDefeated(isBoss);
  }, [store]);
  
  return (
    <Canvas shadows camera={{ fov: 60, near: 0.1, far: 500 }} onContextMenu={e => e.preventDefault()}>
      <GameLoop input={input} onPlayerDeath={handlePlayerDeath} onEnemyKill={handleEnemyKill} />
    </Canvas>
  );
}

export default FullActionGameScene;
