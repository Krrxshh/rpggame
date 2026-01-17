/**
 * EnhancedGameScene.tsx
 * CHANGELOG v1.0.0: Integrated game scene with all new systems
 * - Uses CharacterRig for player
 * - AAACamera with collision
 * - Water, vegetation, fog
 * - Enhanced enemy AI and bosses
 * - Post-processing effects
 */

'use client';

import { useRef, useEffect, useCallback, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Renderer
import { CharacterRig } from './CharacterRig';
import { AAACamera, Crosshair, PointerLockOverlay } from './AAACamera';
import { Water, SimpleWater } from './Water';
import { VolumetricFog, GroundFog, getFogColorForTime } from './VolumetricFog';
import { DenseVegetation } from './DenseVegetation';
import { PostProcessing, VignetteEffect } from './PostProcessing';
import { DynamicLighting, DynamicSkyFog } from './WorldTimeManager';
import { RainSystem } from './RainSystem';
import { Clouds } from './Clouds';

// Game Engine
import {
  updatePlayerController,
  DEFAULT_CONFIG,
  applyDamageToPlayer,
  type PlayerState,
  INITIAL_PLAYER_STATE,
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
  createBossState,
  updateBoss,
  damageBoss,
  parryBoss,
  BOSS_MOVESETS,
  type BossState,
} from '../../game-engine/src/bossTemplate';
import {
  checkSafeZone,
  createSafeZoneState,
  generateSafeZones,
  executeRest,
  canEnemyEnterZone,
} from '../../game-engine/src/enhancedSafeZone';
import { createTimeState, updateTimeState, type TimeState } from './DayNightCycle';
import { createWeatherState, type WeatherState } from './WeatherSystem';
import { createRNG, type RNG } from '../../utils/src/rng';

// State
import { useActionGameStore } from '../../state/src/actionGameStore';

// UI
import { HUD, DamageFlash, HealFlash } from '../../ui/src/EnhancedUI';

// === TYPES ===

interface GameState {
  player: PlayerState;
  enemies: EnemyAIState[];
  boss: BossState | null;
  worldTime: TimeState;
  weather: WeatherState;
  safeZoneState: ReturnType<typeof createSafeZoneState>;
  cameraYaw: number;
  damageFlash: boolean;
  healFlash: boolean;
}

// === INPUT HOOK ===

function useInput() {
  const [input, setInput] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    dodge: false,
    attack: false,
    heavyAttack: false,
    block: false,
    mouseX: 0,
    mouseY: 0,
    skill1: false,
    skill2: false,
    skill3: false,
    skill4: false,
    item1: false,
    item2: false,
    item3: false,
    item4: false,
    rest: false,
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: true })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: true })); break;
        case 'KeyA': setInput(i => ({ ...i, left: true })); break;
        case 'KeyD': setInput(i => ({ ...i, right: true })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: true })); break;
        case 'Space': case 'KeyC':
          setInput(i => ({ ...i, dodge: true }));
          setTimeout(() => setInput(i => ({ ...i, dodge: false })), 100);
          break;
        case 'KeyR': setInput(i => ({ ...i, rest: true })); break;
        case 'Digit1': setInput(i => ({ ...i, skill1: true })); break;
        case 'Digit2': setInput(i => ({ ...i, skill2: true })); break;
        case 'Digit3': setInput(i => ({ ...i, skill3: true })); break;
        case 'Digit4': setInput(i => ({ ...i, skill4: true })); break;
        case 'Digit5': setInput(i => ({ ...i, item1: true })); break;
        case 'Digit6': setInput(i => ({ ...i, item2: true })); break;
        case 'Digit7': setInput(i => ({ ...i, item3: true })); break;
        case 'Digit8': setInput(i => ({ ...i, item4: true })); break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setInput(i => ({ ...i, forward: false })); break;
        case 'KeyS': setInput(i => ({ ...i, backward: false })); break;
        case 'KeyA': setInput(i => ({ ...i, left: false })); break;
        case 'KeyD': setInput(i => ({ ...i, right: false })); break;
        case 'ShiftLeft': setInput(i => ({ ...i, sprint: false })); break;
        case 'KeyR': setInput(i => ({ ...i, rest: false })); break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
          setInput(i => ({ ...i, skill1: false, skill2: false, skill3: false, skill4: false }));
          break;
        case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8':
          setInput(i => ({ ...i, item1: false, item2: false, item3: false, item4: false }));
          break;
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

// === GAME LOOP ===

interface GameLoopProps {
  input: ReturnType<typeof useInput>;
  gameState: React.MutableRefObject<GameState>;
  rng: RNG;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  onPlayerDeath: () => void;
  onDamage: () => void;
  onHeal: () => void;
}

function GameLoop({ input, gameState, rng, quality, onPlayerDeath, onDamage, onHeal }: GameLoopProps) {
  const [, forceUpdate] = useState(0);
  
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const state = gameState.current;
    
    // Update world time
    state.worldTime = updateTimeState(state.worldTime, dt, { timeScale: 60, sunriseHour: 6, sunsetHour: 18, dawnDuration: 1, duskDuration: 1 });
    
    // Update weather (handled externally)
    
    // Check safe zone
    state.safeZoneState = checkSafeZone(
      state.safeZoneState,
      { x: state.player.position.x, z: state.player.position.z }
    );
    
    // Rest in safe zone
    if (input.rest && state.safeZoneState.isInSafeZone) {
      const restResult = executeRest(
        state.safeZoneState,
        state.player.hp,
        state.player.maxHp,
        state.player.stamina,
        state.player.maxStamina,
        100, // mana
        100, // max mana
        state.worldTime.hours
      );
      
      if (restResult) {
        state.safeZoneState = restResult.state;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + restResult.result.hpRestored);
        state.player.stamina = state.player.maxStamina;
        state.worldTime.hours = restResult.newTime;
        onHeal();
      }
    }
    
    // Update player (disable combat in safe zone)
    const obstacles = [{
      position: { x: 0, z: 0 },
      radius: 0,
    }]; // Would be populated from world
    
    const { state: newPlayer, attackResult } = updatePlayerController(
      state.player,
      input,
      DEFAULT_CONFIG,
      dt,
      state.cameraYaw,
      obstacles,
      20 + state.player.attackBuff
    );
    state.player = newPlayer;
    
    // Player attack hit detection
    if (attackResult?.hitFrame && !state.safeZoneState.isInSafeZone) {
      // Check enemies
      for (let i = 0; i < state.enemies.length; i++) {
        const enemy = state.enemies[i];
        if (enemy.hp <= 0) continue;
        
        const dx = enemy.position.x - state.player.position.x;
        const dz = enemy.position.z - state.player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 3) {
          state.enemies[i] = applyDamageToEnemy(enemy, attackResult.damage, attackResult.isHeavy);
        }
      }
      
      // Check boss
      if (state.boss && state.boss.hp > 0) {
        const dx = state.boss.position.x - state.player.position.x;
        const dz = state.boss.position.z - state.player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 4) {
          state.boss = damageBoss(state.boss, attackResult.damage, attackResult.isHeavy);
        }
      }
    }
    
    // Update enemies
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0) continue;
      
      // Check if enemy can be in safe zone
      if (!canEnemyEnterZone({ x: enemy.position.x, z: enemy.position.z }, state.safeZoneState.zones)) {
        continue; // Skip update, enemy is blocked
      }
      
      const { state: updatedEnemy, attackHit } = updateEnemyAI(
        enemy,
        { x: state.player.position.x, z: state.player.position.z },
        dt,
        rng,
        undefined,
        BASIC_ATTACKS
      );
      state.enemies[i] = updatedEnemy;
      
      if (attackHit) {
        const hit = checkAttackHit(
          attackHit,
          { x: enemy.position.x, z: enemy.position.z },
          enemy.rotation,
          { x: state.player.position.x, z: state.player.position.z }
        );
        
        if (hit) {
          const { state: damagedPlayer, actualDamage, wasParried } = applyDamageToPlayer(
            state.player,
            attackHit.damage
          );
          
          if (wasParried) {
            state.enemies[i] = applyDamageToEnemy(updatedEnemy, 0, true);
          } else if (actualDamage > 0) {
            state.player = damagedPlayer;
            onDamage();
            
            if (damagedPlayer.hp <= 0) {
              onPlayerDeath();
            }
          }
        }
      }
    }
    
    // Update boss
    if (state.boss && state.boss.hp > 0) {
      const result = updateBoss(
        state.boss,
        { x: state.player.position.x, z: state.player.position.z },
        dt,
        BOSS_MOVESETS.brute,
        rng
      );
      state.boss = result.state;
      
      if (result.hitPlayer && !state.safeZoneState.isInSafeZone) {
        const { state: damagedPlayer, actualDamage, wasParried } = applyDamageToPlayer(
          state.player,
          result.damage
        );
        
        if (wasParried && result.canBeParried) {
          state.boss = parryBoss(state.boss);
        } else if (actualDamage > 0) {
          state.player = damagedPlayer;
          onDamage();
          
          if (damagedPlayer.hp <= 0) {
            onPlayerDeath();
          }
        }
      }
    }
    
    // Force re-render
    forceUpdate(v => v + 1);
  });
  
  const state = gameState.current;
  const fogColor = getFogColorForTime(state.worldTime.hours);
  
  return (
    <>
      {/* Camera */}
      <AAACamera
        targetPosition={state.player.position}
        onRotationChange={(yaw) => { state.cameraYaw = yaw; }}
      />
      
      {/* Lighting - direct implementation without dynamic props */}
      <ambientLight intensity={state.worldTime.phase === 'day' ? 0.5 : 0.2} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={state.worldTime.phase === 'day' ? 0.8 : 0.3}
        castShadow
      />
      
      {/* Player */}
      <CharacterRig
        state={state.player}
        scale={1}
      />
      
      {/* Enemies */}
      {state.enemies.map(enemy => (
        enemy.hp > 0 && (
          <mesh
            key={enemy.id}
            position={[enemy.position.x, 1, enemy.position.z]}
            rotation={[0, enemy.rotation, 0]}
          >
            <capsuleGeometry args={[0.35, 1, 8, 16]} />
            <meshStandardMaterial
              color={enemy.currentState === 'telegraph' ? '#ffff00' : '#cc4444'}
              emissive={enemy.currentState === 'telegraph' ? '#ff8800' : '#000'}
              emissiveIntensity={0.3}
            />
          </mesh>
        )
      ))}
      
      {/* Boss */}
      {state.boss && state.boss.hp > 0 && (
        <mesh
          position={[state.boss.position.x, 1.5, state.boss.position.z]}
          rotation={[0, state.boss.rotation, 0]}
        >
          <capsuleGeometry args={[0.6, 2, 8, 16]} />
          <meshStandardMaterial
            color={state.boss.isEnraged ? '#ff2200' : '#ff6600'}
            emissive={state.boss.phase === 'telegraph' ? '#ffaa00' : '#000'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Environment */}
      <SimpleWater position={[0, -0.5, 0]} size={[200, 200]} color="#003355" />
      
      {quality !== 'low' && (
        <GroundFog color={fogColor} height={3} density={0.4} />
      )}
      
      <DenseVegetation
        area={{ minX: -80, maxX: 80, minZ: -80, maxZ: 80 }}
        seed={12345}
        useProcedural={true}
      />
      
      {/* Safe zone markers */}
      {state.safeZoneState.zones.map(zone => (
        <group key={zone.id} position={[zone.position.x, 0, zone.position.z]}>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[zone.radius - 0.5, zone.radius, 32]} />
            <meshBasicMaterial
              color="#44ff44"
              transparent
              opacity={zone.id === state.safeZoneState.currentZone?.id ? 0.5 : 0.2}
            />
          </mesh>
        </group>
      ))}
      
      {/* Weather - conditional rain */}
      {state.weather.type === 'rain' && <RainSystem />}
      
      <Clouds />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />
    </>
  );
}

// === MAIN SCENE ===

interface EnhancedGameSceneProps {
  seed?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  onDeath?: () => void;
}

export function EnhancedGameScene({
  seed = 'default',
  quality = 'medium',
  onDeath,
}: EnhancedGameSceneProps) {
  const input = useInput();
  const rng = useRef(createRNG(seed)).current;
  
  const gameState = useRef<GameState>({
    player: { ...INITIAL_PLAYER_STATE },
    enemies: [
      createEnemyAI('enemy-1', { x: 10, y: 0, z: 10 }, 50, rng),
      createEnemyAI('enemy-2', { x: -10, y: 0, z: 15 }, 50, rng),
      createEnemyAI('enemy-3', { x: 15, y: 0, z: -5 }, 50, rng),
    ],
    boss: createBossState('boss-1', 'Dark Guardian', 500, { x: 30, y: 0, z: 30 }),
    worldTime: createTimeState(10),
    weather: createWeatherState(),
    safeZoneState: createSafeZoneState(
      generateSafeZones(12345, { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, 3, rng)
    ),
    cameraYaw: 0,
    damageFlash: false,
    healFlash: false,
  });
  
  const [damageFlash, setDamageFlash] = useState(false);
  const [healFlash, setHealFlash] = useState(false);
  
  const handlePlayerDeath = useCallback(() => {
    onDeath?.();
  }, [onDeath]);
  
  const handleDamage = useCallback(() => {
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);
  }, []);
  
  const handleHeal = useCallback(() => {
    setHealFlash(true);
    setTimeout(() => setHealFlash(false), 500);
  }, []);
  
  const state = gameState.current;
  
  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 500 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Suspense fallback={null}>
          <GameLoop
            input={input}
            gameState={gameState}
            rng={rng}
            quality={quality}
            onPlayerDeath={handlePlayerDeath}
            onDamage={handleDamage}
            onHeal={handleHeal}
          />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <PointerLockOverlay message="Click to play" />
      <Crosshair />
      
      <HUD
        hp={state.player.hp}
        maxHp={state.player.maxHp}
        stamina={state.player.stamina}
        maxStamina={state.player.maxStamina}
        mana={100}
        maxMana={100}
        quickSlots={[
          { icon: '🧪', count: 3, cooldown: 0 },
          { icon: '⚡', count: 2, cooldown: 0 },
          { icon: '🛡️', count: 1, cooldown: 0 },
          { icon: '💪', count: 1, cooldown: 0 },
        ]}
        skillSlots={[
          { icon: '🔥', cooldown: 0, maxCooldown: 2 },
          { icon: '❄️', cooldown: 0, maxCooldown: 8 },
          { icon: '⚔️', cooldown: 0, maxCooldown: 4 },
          { icon: '💨', cooldown: 0, maxCooldown: 20 },
        ]}
        bossName={state.boss && state.boss.hp > 0 ? state.boss.name : undefined}
        bossHp={state.boss?.hp}
        bossMaxHp={state.boss?.maxHp}
        playerPos={{ x: state.player.position.x, z: state.player.position.z }}
        enemies={state.enemies.filter(e => e.hp > 0).map(e => ({ x: e.position.x, z: e.position.z }))}
        safeZones={state.safeZoneState.zones.map(z => ({ x: z.position.x, z: z.position.z }))}
      />
      
      {state.safeZoneState.isInSafeZone && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,100,0,0.8)',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'system-ui',
        }}>
          Safe Zone - Press R to Rest
        </div>
      )}
      
      <VignetteEffect intensity={0.3} />
      <DamageFlash active={damageFlash} />
      <HealFlash active={healFlash} />
    </>
  );
}

export default EnhancedGameScene;
