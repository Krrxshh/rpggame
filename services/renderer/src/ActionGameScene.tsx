'use client';

/**
 * Action Game Scene
 * Main R3F scene for action RPG gameplay
 * NEW FILE - game scene component
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerCamera, useCameraShake, useZoom } from './PlayerCamera';
import { EnvironmentManager } from './EnvironmentManager';
import { useActionGameStore } from '../../state/src/actionGameStore';
import {
  updatePlayerController,
  DEFAULT_CONFIG,
  type InputState,
} from '../../game-engine/src/playerController';
import { updateWorldState, getLoadedChunks, CHUNK_SIZE } from '../../content-generator/src/regionGenerator';

// === INPUT HANDLER ===

function useKeyboardInput(): InputState {
  const [input, setInput] = useState<InputState>({
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
        case 'KeyC':
        case 'ControlLeft':
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

// === PLAYER MESH ===

function PlayerMesh({ position, rotation, isAttacking, isDodging, isBlocking }: {
  position: { x: number; y: number; z: number };
  rotation: number;
  isAttacking: boolean;
  isDodging: boolean;
  isBlocking: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position.x, position.y + 1, position.z);
      meshRef.current.rotation.y = rotation;
      
      // Visual feedback
      const scale = isAttacking ? 1.2 : isDodging ? 0.8 : 1;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.3, 1, 8, 16]} />
      <meshStandardMaterial 
        color={isBlocking ? '#4488ff' : isDodging ? '#88ff88' : '#cc8844'} 
        emissive={isAttacking ? '#ff4400' : '#000000'}
        emissiveIntensity={isAttacking ? 0.5 : 0}
      />
    </mesh>
  );
}

// === OBSTACLE MESH ===

function ObstacleMesh({ obstacle }: { 
  obstacle: { position: { x: number; y: number; z: number }; radius: number; height: number; type: string } 
}) {
  const color = obstacle.type === 'tree' ? '#2a4a2a' : 
                obstacle.type === 'rock' ? '#5a5a5a' : 
                obstacle.type === 'pillar' ? '#6a5a4a' : '#4a3a3a';
  
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

// === GAME LOOP ===

function GameLoop({ input }: { input: InputState }) {
  const player = useActionGameStore(s => s.player);
  const cameraRotation = useActionGameStore(s => s.cameraRotation);
  const world = useActionGameStore(s => s.world);
  const setPlayer = useActionGameStore(s => s.setPlayer);
  const setWorld = useActionGameStore(s => s.setWorld);
  const setCameraRotation = useActionGameStore(s => s.setCameraRotation);
  
  const { shake } = useCameraShake();
  const { zoom, attackZoom } = useZoom();
  
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    
    // Update player
    const obstacles = world ? getLoadedChunks(world).flatMap(c => 
      c.obstacles.map(o => ({ position: { x: o.position.x, z: o.position.z }, radius: o.radius }))
    ) : [];
    
    const { state: newPlayer, attackResult } = updatePlayerController(
      player,
      input,
      DEFAULT_CONFIG,
      dt,
      cameraRotation,
      obstacles,
      20
    );
    
    setPlayer(newPlayer);
    
    if (attackResult?.hitFrame) {
      attackZoom();
      shake(0.3);
    }
    
    // Update world chunks
    if (world) {
      const newWorld = updateWorldState(world, { x: newPlayer.position.x, z: newPlayer.position.z });
      if (newWorld !== world) setWorld(newWorld);
    }
  });
  
  const chunks = world ? getLoadedChunks(world) : [];
  const currentChunk = chunks[0];
  
  return (
    <>
      <PlayerCamera 
        targetPosition={player.position}
        onRotationChange={setCameraRotation}
        zoomTarget={zoom}
      />
      
      <EnvironmentManager
        worldProgress={world?.worldProgress ?? 0}
        fogDensity={currentChunk?.fogDensity ?? 0.05}
        fogColor={currentChunk?.palette.background ?? '#1a1a1a'}
        lightingPreset={currentChunk?.lightingPreset ?? 'dark'}
      />
      
      <PlayerMesh 
        position={player.position}
        rotation={player.rotation}
        isAttacking={player.isAttacking}
        isDodging={player.isDodging}
        isBlocking={player.isBlocking}
      />
      
      <Ground />
      
      {chunks.flatMap(chunk => 
        chunk.obstacles.map(obs => (
          <ObstacleMesh key={obs.id} obstacle={obs} />
        ))
      )}
      
      <directionalLight position={[10, 20, 10]} intensity={0.5} castShadow />
    </>
  );
}

// === MAIN SCENE ===

export function ActionGameScene() {
  const input = useKeyboardInput();
  
  return (
    <Canvas shadows camera={{ fov: 60, near: 0.1, far: 500 }} onContextMenu={e => e.preventDefault()}>
      <GameLoop input={input} />
    </Canvas>
  );
}

export default ActionGameScene;
