'use client';

/**
 * Complete Game Scene - ENHANCED
 * Full integration of all new systems:
 * - AAACamera with collision
 * - Proper camera-relative movement
 * - Water, fog, dense vegetation
 * - Potions, abilities, weapons
 * - Post-processing effects
 */

import { useRef, useEffect, useCallback, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Enhanced Components
import { AAACamera, Crosshair, PointerLockOverlay } from './AAACamera';
import { SimpleWater } from './Water';
import { GroundFog, getFogColorForTime } from './VolumetricFog';
import { EnvironmentSpawner } from './EnvironmentSpawner';

// Game Engine
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
  BASIC_ATTACKS,
} from '../../game-engine/src/enemyAI';
import { 
  useItem, 
  getQuickSlotItem,
  ITEMS,
  type Inventory,
  type ItemUseResult,
} from '../../game-engine/src/items';
import {
  updateSkillCooldowns,
  canUseSkill,
  SKILLS,
  type SkillState,
} from '../../game-engine/src/skills';
import { createRNG, type RNG } from '../../utils/src/rng';

// UI Effects
import { DamageFlash, HealFlash } from '../../ui/src/EnhancedUI';

// === ENHANCED INPUT HANDLER ===
interface GameInput extends InputState {
  skillKeys: boolean[];
  itemKeys: boolean[];
  interact: boolean;
  rest: boolean;
}

function useGameInput(): GameInput {
  const [input, setInput] = useState<GameInput>({
    forward: false, backward: false, left: false, right: false,
    sprint: false, dodge: false, attack: false, heavyAttack: false, block: false,
    mouseX: 0, mouseY: 0,
    skillKeys: [false, false, false, false],
    itemKeys: [false, false, false, false],
    interact: false,
    rest: false,
  });
  
  const attackHoldStart = useRef(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        // Movement
        case 'KeyW': setInput(i => ({ ...i, forward: true })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: true })); break;
        case 'KeyA': setInput(i => ({ ...i, left: true })); break;
        case 'KeyD': setInput(i => ({ ...i, right: true })); break;
        case 'ShiftLeft': case 'ShiftRight': 
          setInput(i => ({ ...i, sprint: true })); break;
        case 'Space': case 'KeyC': case 'ControlLeft':
          setInput(i => ({ ...i, dodge: true }));
          setTimeout(() => setInput(i => ({ ...i, dodge: false })), 150);
          break;
        // Skills (1-4)
        case 'Digit1': setInput(i => ({ ...i, skillKeys: [true, i.skillKeys[1], i.skillKeys[2], i.skillKeys[3]] })); break;
        case 'Digit2': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], true, i.skillKeys[2], i.skillKeys[3]] })); break;
        case 'Digit3': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], i.skillKeys[1], true, i.skillKeys[3]] })); break;
        case 'Digit4': setInput(i => ({ ...i, skillKeys: [i.skillKeys[0], i.skillKeys[1], i.skillKeys[2], true] })); break;
        // Items (5-8)
        case 'Digit5': setInput(i => ({ ...i, itemKeys: [true, i.itemKeys[1], i.itemKeys[2], i.itemKeys[3]] })); break;
        case 'Digit6': setInput(i => ({ ...i, itemKeys: [i.itemKeys[0], true, i.itemKeys[2], i.itemKeys[3]] })); break;
        case 'Digit7': setInput(i => ({ ...i, itemKeys: [i.itemKeys[0], i.itemKeys[1], true, i.itemKeys[3]] })); break;
        case 'Digit8': setInput(i => ({ ...i, itemKeys: [i.itemKeys[0], i.itemKeys[1], i.itemKeys[2], true] })); break;
        // Interact/Rest
        case 'KeyE': setInput(i => ({ ...i, interact: true })); break;
        case 'KeyR': setInput(i => ({ ...i, rest: true })); break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: false })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: false })); break;
        case 'KeyA': setInput(i => ({ ...i, left: false })); break;
        case 'KeyD': setInput(i => ({ ...i, right: false })); break;
        case 'ShiftLeft': case 'ShiftRight': 
          setInput(i => ({ ...i, sprint: false })); break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
          setInput(i => ({ ...i, skillKeys: [false, false, false, false] })); break;
        case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8':
          setInput(i => ({ ...i, itemKeys: [false, false, false, false] })); break;
        case 'KeyE': setInput(i => ({ ...i, interact: false })); break;
        case 'KeyR': setInput(i => ({ ...i, rest: false })); break;
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        attackHoldStart.current = Date.now();
        setInput(i => ({ ...i, attack: true }));
      }
      if (e.button === 2) setInput(i => ({ ...i, block: true }));
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        const holdTime = Date.now() - attackHoldStart.current;
        const isHeavy = holdTime >= 300;
        setInput(i => ({ ...i, attack: false, heavyAttack: isHeavy }));
        setTimeout(() => setInput(i => ({ ...i, heavyAttack: false })), 50);
      }
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

// === ENHANCED PLAYER MESH ===
function PlayerMesh({ state }: { state: PlayerState }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position.x, state.position.y, state.position.z);
      groupRef.current.rotation.y = state.rotation;
      
      // Action-based scale
      const breathe = 1 + Math.sin(Date.now() * 0.003) * 0.015;
      const action = state.isAttacking ? 1.08 : state.isDodging ? 0.9 : state.isBlocking ? 0.95 : 1;
      groupRef.current.scale.setScalar(breathe * action);
    }
  });
  
  const bodyColor = state.isBlocking ? '#3366cc' : state.isDodging ? '#66cc66' : 
                    state.isAttacking ? '#cc6633' : '#8b6914';
  const isActive = state.isAttacking || state.isDodging || state.isBlocking;
  const emissiveColor = state.isBlocking ? '#2244aa' : state.isDodging ? '#44aa44' : 
                        state.isAttacking ? '#aa4422' : '#000000';
  
  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.7, 12, 20]} />
        <meshStandardMaterial 
          color={bodyColor} 
          roughness={0.5} 
          metalness={0.3}
          emissive={emissiveColor}
          emissiveIntensity={isActive ? 0.4 : 0}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshStandardMaterial color="#ddb599" roughness={0.7} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[0.35, 1.0, 0]} rotation={[0, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.08, 0.35, 8, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      <mesh position={[-0.35, 1.0, 0]} rotation={[0, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.08, 0.35, 8, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 8, 12]} />
        <meshStandardMaterial color="#443322" roughness={0.8} />
      </mesh>
      <mesh position={[-0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 8, 12]} />
        <meshStandardMaterial color="#443322" roughness={0.8} />
      </mesh>
      
      {/* Weapon (right hand) */}
      <group 
        position={[0.45, 0.9, 0.1]} 
        rotation={[
          state.isAttacking ? -1.2 : -0.3, 
          0, 
          state.isAttacking ? -0.8 : -0.2
        ]}
      >
        {/* Handle */}
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.04, 0.5, 0.12]} />
          <meshStandardMaterial color="#888899" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Crossguard */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.2, 0.04, 0.06]} />
          <meshStandardMaterial color="#665544" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      
      {/* Shield (left, visible when blocking) */}
      {state.isBlocking && (
        <mesh position={[-0.5, 0.95, 0.25]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.08, 0.55, 0.4]} />
          <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
      
      {/* Attack slash VFX */}
      {state.isAttacking && (
        <mesh position={[0.6, 1.0, -0.3]} rotation={[0, 0.4, 0.2]}>
          <torusGeometry args={[0.45, 0.04, 6, 20, Math.PI * 0.8]} />
          <meshBasicMaterial color="#ffbb44" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Dodge trail VFX */}
      {state.isDodging && (
        <>
          <mesh position={[0, 0.9, 0.4]}>
            <sphereGeometry args={[0.5, 12, 12]} />
            <meshBasicMaterial color="#88ffaa" transparent opacity={0.25} />
          </mesh>
          <mesh position={[0, 0.9, 0.7]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshBasicMaterial color="#88ffaa" transparent opacity={0.15} />
          </mesh>
        </>
      )}
      
      {/* Parry flash */}
      {state.parryWindow > 0 && (
        <mesh position={[-0.5, 1.0, 0.3]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// === ENEMY MESH ===
function EnemyMesh({ enemy }: { enemy: EnemyAIState }) {
  const groupRef = useRef<THREE.Group>(null);
  const isBoss = enemy.id.startsWith('boss');
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(enemy.position.x, enemy.position.y, enemy.position.z);
      groupRef.current.rotation.y = enemy.rotation;
    }
  });
  
  if (enemy.hp <= 0) return null;
  
  const scale = isBoss ? 1.6 : 1;
  const color = isBoss ? '#882222' : '#664422';
  const isTelegraph = enemy.currentState === 'telegraph';
  const isAttacking = enemy.currentState === 'attack';
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial 
          color={isTelegraph ? '#ffcc00' : isAttacking ? '#ff4400' : color}
          emissive={isTelegraph ? '#ff8800' : '#000'}
          emissiveIntensity={isTelegraph ? 0.5 : 0}
          roughness={0.6}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#553333" roughness={0.7} />
      </mesh>
      
      {/* Weapon */}
      <group position={[0.4, 0.8, 0]} rotation={[0, 0, isAttacking ? -1.2 : -0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      
      {/* Telegraph warning ring */}
      {isTelegraph && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.0, 24]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Health bar */}
      <group position={[0, 2.2, 0]}>
        <mesh>
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[(1 - enemy.hp / enemy.maxHp) * -0.5, 0, 0.01]} scale={[enemy.hp / enemy.maxHp, 1, 1]}>
          <planeGeometry args={[1, 0.08]} />
          <meshBasicMaterial color={isBoss ? '#ff4444' : '#44ff44'} />
        </mesh>
      </group>
    </group>
  );
}

// === TERRAIN ===
function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
      <planeGeometry args={[600, 600, 128, 128]} />
      <meshStandardMaterial 
        color="#3a5a2a" 
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

// === CAMERA-RELATIVE MOVEMENT HELPER ===
function getCameraRelativeMovement(
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean },
  cameraYaw: number
): { x: number; z: number } {
  let moveX = 0;
  let moveZ = 0;
  
  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  
  if (moveX === 0 && moveZ === 0) return { x: 0, z: 0 };
  
  const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
  moveX /= length;
  moveZ /= length;
  
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  
  return {
    x: moveX * cos - moveZ * sin,
    z: moveX * sin + moveZ * cos,
  };
}

// === GAME LOOP ===
interface GameLoopProps {
  input: GameInput;
  timeOfDay: number;
  onPlayerDeath: () => void;
  onEnemyKill: (isBoss: boolean) => void;
  onHeal: () => void;
  onDamage: () => void;
}

function GameLoop({ input, timeOfDay, onPlayerDeath, onEnemyKill, onHeal, onDamage }: GameLoopProps) {
  const store = useActionGameStore();
  const { scene } = useThree();
  
  const enemiesRef = useRef<EnemyAIState[]>([]);
  const rngRef = useRef(createRNG(store.seed || Date.now().toString()));
  const lastSpawnCheck = useRef(0);
  const cameraYawRef = useRef(0);
  const [, forceUpdate] = useState(0);
  
  // Initial enemy spawn
  useEffect(() => {
    if (enemiesRef.current.length === 0) {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const dist = 18 + Math.random() * 12;
        enemiesRef.current.push(
          createEnemyAI(
            `enemy-${i}`, 
            { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
            60 + store.enemiesDefeated * 8,
            rngRef.current
          )
        );
      }
    }
  }, [store.enemiesDefeated, store.seed]);
  
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { player, setPlayer, inventory, skillStates, mana, useMana, regenMana } = store;
    
    // === CAMERA-RELATIVE MOVEMENT ===
    const movement = getCameraRelativeMovement(input, cameraYawRef.current);
    
    // Create modified input based on camera-relative direction
    const modifiedInput: InputState = {
      ...input,
      forward: movement.z < -0.1,
      backward: movement.z > 0.1,
      left: movement.x < -0.1,
      right: movement.x > 0.1,
    };
    
    // === UPDATE PLAYER ===
    const { state: newPlayer, attackResult } = updatePlayerController(
      player, 
      modifiedInput, 
      DEFAULT_CONFIG, 
      dt, 
      cameraYawRef.current,
      [], 
      25 + player.attackBuff
    );
    
    // === SKILL COOLDOWNS ===
    store.updateSkillCooldowns(dt);
    
    // === MANA REGEN ===
    regenMana(5 * dt);
    
    // === SKILL EXECUTION ===
    for (let i = 0; i < 4; i++) {
      if (input.skillKeys[i]) {
        const skill = skillStates[i];
        if (skill && skill.currentCooldown <= 0) {
          const skillDef = SKILLS[skill.skillId];
          if (skillDef && mana >= skillDef.cost && useMana(skillDef.cost)) {
            // Start cooldown
            skill.currentCooldown = skillDef.cooldown;
            // Skill effect would spawn projectile/AOE here
          }
        }
      }
    }
    
    // === POTION USE ===
    for (let i = 0; i < 4; i++) {
      if (input.itemKeys[i]) {
        const slotItem = inventory.quickSlots[i];
        if (slotItem) {
          const result: ItemUseResult = useItem(inventory, slotItem, newPlayer.hp, newPlayer.maxHp);
          if (result.success && result.effect) {
            // Apply effects
            let healAmount = 0;
            let staminaAmount = 0;
            
            if (result.effect.heal) {
              healAmount = result.effect.heal;
            }
            if (result.effect.staminaRestore) {
              staminaAmount = result.effect.staminaRestore;
            }
            
            if (healAmount > 0 || staminaAmount > 0) {
              onHeal();
              setPlayer({ 
                ...newPlayer, 
                hp: Math.min(newPlayer.maxHp, newPlayer.hp + healAmount),
                stamina: Math.min(newPlayer.maxStamina, newPlayer.stamina + staminaAmount),
              });
              // Consume item
              store.addItem(slotItem, -1);
              return;
            }
          }
        }
      }
    }
    
    // === PLAYER ATTACKS ENEMIES ===
    if (attackResult?.hitFrame) {
      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i];
        if (enemy.hp <= 0) continue;
        
        const dx = enemy.position.x - newPlayer.position.x;
        const dz = enemy.position.z - newPlayer.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 3.5) {
          // Check angle - use player rotation for facing
          const angleToEnemy = Math.atan2(dx, -dz);
          let angleDiff = angleToEnemy - newPlayer.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          if (Math.abs(angleDiff) < Math.PI / 2.5) {
            enemiesRef.current[i] = applyDamageToEnemy(enemy, attackResult.damage, attackResult.isHeavy);
            
            if (enemiesRef.current[i].hp <= 0) {
              onEnemyKill(enemy.id.startsWith('boss'));
            }
          }
        }
      }
    }
    
    // === UPDATE ENEMIES ===
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
          const { state: damagedPlayer, actualDamage, wasParried } = applyDamageToPlayer(
            newPlayer, 
            attackHit.damage
          );
          
          if (wasParried) {
            enemiesRef.current[i] = applyDamageToEnemy(updatedEnemy, 0, true);
          } else if (actualDamage > 0) {
            setPlayer(damagedPlayer);
            onDamage();
            
            if (damagedPlayer.hp <= 0) {
              onPlayerDeath();
            }
            return;
          }
        }
      }
    }
    
    setPlayer(newPlayer);
    
    // === SPAWN MORE ENEMIES ===
    lastSpawnCheck.current += dt;
    const aliveCount = enemiesRef.current.filter(e => e.hp > 0).length;
    
    if (lastSpawnCheck.current > 6 && aliveCount < 6) {
      lastSpawnCheck.current = 0;
      const angle = rngRef.current.rangeFloat(0, Math.PI * 2);
      const dist = rngRef.current.rangeFloat(25, 45);
      const isBoss = rngRef.current.chance(0.12);
      
      enemiesRef.current.push(
        createEnemyAI(
          `${isBoss ? 'boss' : 'enemy'}-${Date.now()}`,
          { 
            x: newPlayer.position.x + Math.cos(angle) * dist, 
            y: 0, 
            z: newPlayer.position.z + Math.sin(angle) * dist 
          },
          isBoss ? 180 + store.enemiesDefeated * 15 : 60 + store.enemiesDefeated * 8,
          rngRef.current
        )
      );
    }
    
    forceUpdate(v => v + 1);
  });
  
  // Sun/lighting
  const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
  const sunPosition: [number, number, number] = [
    Math.cos(sunAngle) * 100,
    Math.sin(sunAngle) * 80 + 20,
    50,
  ];
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  const isDusk = timeOfDay >= 17 && timeOfDay <= 19;
  const isDawn = timeOfDay >= 5 && timeOfDay <= 7;
  
  const fogColor = getFogColorForTime(timeOfDay);
  
  return (
    <>
      {/* Camera with collision */}
      <AAACamera
        targetPosition={store.player.position}
        onRotationChange={(yaw) => { cameraYawRef.current = yaw; store.setCameraRotation(yaw); }}
      />
      
      {/* Sky */}
      <Sky 
        sunPosition={sunPosition}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={isNight ? 0.05 : isDusk || isDawn ? 1 : 3}
      />
      
      {/* Lighting */}
      <ambientLight intensity={isNight ? 0.12 : isDusk || isDawn ? 0.3 : 0.45} />
      <directionalLight
        position={sunPosition}
        intensity={isNight ? 0.15 : isDusk || isDawn ? 0.6 : 1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        color={isNight ? '#4466aa' : isDusk ? '#ffaa66' : isDawn ? '#ffccaa' : '#ffffee'}
      />
      
      {/* Fog */}
      <fog attach="fog" args={[fogColor, 40, 180]} />
      <GroundFog color={fogColor} height={5} density={0.4} area={150} />
      
      {/* Player */}
      <PlayerMesh state={store.player} />
      
      {/* Enemies */}
      {enemiesRef.current.map(enemy => (
        <EnemyMesh key={enemy.id} enemy={enemy} />
      ))}
      
      {/* Terrain */}
      <Terrain />
      
      {/* Water */}
      <SimpleWater position={[60, -0.3, 60]} size={[100, 100]} color="#004466" />
      <SimpleWater position={[-70, -0.3, 40]} size={[60, 60]} color="#003355" />
      
      {/* Environment with HIGH density */}
      <EnvironmentSpawner 
        seed={store.seed || 'default'}
        radius={100}
        centerX={0}
        centerZ={0}
        density={3.5}
      />
      
      {/* Ground shadows */}
      <ContactShadows 
        position={[0, 0, 0]}
        opacity={0.5}
        scale={120}
        blur={2.5}
        far={25}
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
  
  const [damageFlash, setDamageFlash] = useState(false);
  const [healFlash, setHealFlash] = useState(false);
  
  const handlePlayerDeath = useCallback(() => {
    store.setPhase('gameover');
  }, [store]);
  
  const handleEnemyKill = useCallback((isBoss: boolean) => {
    store.enemyDefeated(isBoss);
  }, [store]);
  
  const handleDamage = useCallback(() => {
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);
  }, []);
  
  const handleHeal = useCallback(() => {
    setHealFlash(true);
    setTimeout(() => setHealFlash(false), 500);
  }, []);
  
  return (
    <>
      <Canvas 
        shadows 
        camera={{ fov: 60, near: 0.1, far: 500 }} 
        onContextMenu={e => e.preventDefault()}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <GameLoop 
            input={input} 
            timeOfDay={timeOfDay}
            onPlayerDeath={handlePlayerDeath} 
            onEnemyKill={handleEnemyKill}
            onDamage={handleDamage}
            onHeal={handleHeal}
          />
        </Suspense>
      </Canvas>
      
      {/* UI Overlays */}
      <PointerLockOverlay message="Click to control camera" />
      <Crosshair />
      <DamageFlash active={damageFlash} />
      <HealFlash active={healFlash} />
      
      {/* Vignette effect (inline) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)',
        zIndex: 100,
      }} />
    </>
  );
}

export default CompleteGameScene;
