/**
 * CharacterRig.tsx
 * CHANGELOG v1.0.0: Full character rig with skeleton, animations, weapon attach
 * - Loads GLTF character models from asset manifest
 * - Animation mixer with state-based blending
 * - Weapon attachment via bone search (RightHand, Hand_R, R_Hand variants)
 * - Fallback procedural mesh if skeleton mismatch
 */

'use client';

import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PlayerState } from '../../game-engine/src/playerController';

// === TYPES ===

export interface CharacterRigProps {
  state: PlayerState;
  characterPath?: string;
  animationLibraryPath?: string;
  weaponPath?: string;
  scale?: number;
}

export interface AnimationState {
  current: string;
  action: THREE.AnimationAction | null;
  mixer: THREE.AnimationMixer | null;
}

// Bone name variants for weapon attachment
const WEAPON_BONE_NAMES = [
  'RightHand', 'Hand_R', 'R_Hand', 'hand_r', 'hand.R',
  'mixamorig:RightHand', 'Bip001_R_Hand', 'Bone_RHand',
  'RightHandIndex1', 'Hand_Right', 'hand_right'
];

// === BONE UTILITIES ===

function findBoneByName(skeleton: THREE.SkeletonHelper | THREE.Object3D, names: string[]): THREE.Bone | null {
  let foundBone: THREE.Bone | null = null;
  
  skeleton.traverse((child) => {
    if (foundBone) return;
    if (child instanceof THREE.Bone) {
      const lowerName = child.name.toLowerCase();
      for (const name of names) {
        if (lowerName.includes(name.toLowerCase())) {
          foundBone = child;
          return;
        }
      }
    }
  });
  
  return foundBone;
}

function attachToSkeleton(
  model: THREE.Object3D,
  weaponModel: THREE.Object3D | null,
  boneNames: string[]
): boolean {
  if (!weaponModel) return false;
  
  const bone = findBoneByName(model, boneNames);
  if (bone) {
    bone.add(weaponModel);
    weaponModel.position.set(0, 0, 0);
    weaponModel.rotation.set(0, 0, 0);
    return true;
  }
  
  // TODO: Log skeleton mismatch for future retargeting
  console.warn('[CharacterRig] Could not find weapon bone. Available bones:');
  model.traverse((child) => {
    if (child instanceof THREE.Bone) {
      console.warn(`  - ${child.name}`);
    }
  });
  
  return false;
}

// === ANIMATION MAPPER ===

type AnimationType = 'idle' | 'walk' | 'run' | 'attack' | 'heavyAttack' | 'dodge' | 'block' | 'hit' | 'death';

const ANIMATION_NAME_MAP: Record<AnimationType, string[]> = {
  idle: ['idle', 'stand', 'breathe'],
  walk: ['walk', 'walking'],
  run: ['run', 'running', 'sprint'],
  attack: ['attack', 'slash', 'swing', 'hit'],
  heavyAttack: ['heavy', 'power', 'strong'],
  dodge: ['dodge', 'roll', 'evade'],
  block: ['block', 'guard', 'defend', 'shield'],
  hit: ['hit', 'damage', 'hurt', 'stagger'],
  death: ['death', 'die', 'dead', 'fall'],
};

function findAnimationClip(animations: THREE.AnimationClip[], type: AnimationType): THREE.AnimationClip | null {
  const keywords = ANIMATION_NAME_MAP[type];
  
  for (const clip of animations) {
    const lowerName = clip.name.toLowerCase();
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return clip;
      }
    }
  }
  
  return null;
}

function getAnimationTypeFromState(state: PlayerState): AnimationType {
  if (state.hp <= 0) return 'death';
  if (state.isDodging) return 'dodge';
  if (state.isBlocking) return 'block';
  if (state.isAttacking && state.attackCombo === 2) return 'heavyAttack';
  if (state.isAttacking) return 'attack';
  
  const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
  if (speed > 6) return 'run';
  if (speed > 0.5) return 'walk';
  
  return 'idle';
}

// === LOADED CHARACTER ===

interface LoadedCharacterProps {
  state: PlayerState;
  characterPath: string;
  animationLibraryPath?: string;
  weaponPath?: string;
  scale: number;
}

function LoadedCharacter({ state, characterPath, animationLibraryPath, weaponPath, scale }: LoadedCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentAnimTypeRef = useRef<AnimationType>('idle');
  
  // Load character
  const { scene: characterScene, animations: charAnims } = useGLTF(characterPath) as GLTF & { scene: THREE.Group };
  
  // Load animation library if provided
  const animLibrary = animationLibraryPath ? useGLTF(animationLibraryPath) as GLTF : null;
  
  // Load weapon if provided
  const weaponGltf = weaponPath ? useGLTF(weaponPath) as GLTF : null;
  
  // Clone and setup
  const characterClone = useMemo(() => {
    const clone = characterScene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [characterScene]);
  
  // Setup mixer and attach weapon
  useEffect(() => {
    if (!characterClone) return;
    
    // Create animation mixer
    mixerRef.current = new THREE.AnimationMixer(characterClone);
    
    // Combine animations
    const allAnimations = [
      ...(charAnims || []),
      ...(animLibrary?.animations || []),
    ];
    
    // Play idle by default
    const idleClip = findAnimationClip(allAnimations, 'idle');
    if (idleClip && mixerRef.current) {
      const action = mixerRef.current.clipAction(idleClip);
      action.play();
      currentActionRef.current = action;
    }
    
    // Attach weapon
    if (weaponGltf?.scene) {
      const weaponClone = weaponGltf.scene.clone();
      weaponClone.scale.setScalar(1);
      attachToSkeleton(characterClone, weaponClone, WEAPON_BONE_NAMES);
    }
    
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [characterClone, charAnims, animLibrary, weaponGltf]);
  
  // Update animation and transform each frame
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Update position and rotation
    groupRef.current.position.set(state.position.x, state.position.y, state.position.z);
    groupRef.current.rotation.y = state.rotation;
    
    // Update scale based on action
    const actionScale = state.isAttacking ? 1.05 : state.isDodging ? 0.9 : 1;
    groupRef.current.scale.setScalar(scale * actionScale);
    
    // Update animation
    const newAnimType = getAnimationTypeFromState(state);
    
    if (newAnimType !== currentAnimTypeRef.current && mixerRef.current) {
      const allAnimations = [
        ...(charAnims || []),
        ...(animLibrary?.animations || []),
      ];
      
      const newClip = findAnimationClip(allAnimations, newAnimType);
      
      if (newClip) {
        const newAction = mixerRef.current.clipAction(newClip);
        
        // Crossfade
        if (currentActionRef.current) {
          newAction.reset();
          newAction.setEffectiveTimeScale(1);
          newAction.setEffectiveWeight(1);
          newAction.crossFadeFrom(currentActionRef.current, 0.2, true);
        }
        
        newAction.play();
        currentActionRef.current = newAction;
        currentAnimTypeRef.current = newAnimType;
      }
    }
    
    // Update mixer
    mixerRef.current?.update(delta);
  });
  
  return (
    <group ref={groupRef}>
      <primitive object={characterClone} />
    </group>
  );
}

// === FALLBACK PROCEDURAL CHARACTER ===

function ProceduralCharacter({ state, scale }: { state: PlayerState; scale: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(state.position.x, state.position.y, state.position.z);
      groupRef.current.rotation.y = state.rotation;
      
      // Breathing animation
      const breathe = 1 + Math.sin(Date.now() * 0.003) * 0.02;
      const actionScale = state.isAttacking ? 1.1 : state.isDodging ? 0.85 : state.isBlocking ? 0.95 : 1;
      groupRef.current.scale.setScalar(scale * breathe * actionScale);
    }
  });
  
  const bodyColor = state.isBlocking ? '#4488ff' : state.isDodging ? '#88ff88' : state.isAttacking ? '#ff8844' : '#cc8844';
  const isActive = state.isAttacking || state.isDodging;
  
  // Weapon swing animation
  const weaponRotation = state.isAttacking 
    ? [-0.3, 0, -0.8 - Math.sin(Date.now() * 0.02) * 0.5] 
    : [-0.3, 0, -0.3];
  
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
      <group position={[0.4, 0.8, 0]} rotation={weaponRotation as [number, number, number]}>
        {/* Handle */}
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.6, 8]} />
          <meshStandardMaterial color="#5c3317" roughness={0.8} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.06, 0.5, 0.02]} />
          <meshStandardMaterial 
            color="#b0b0b0" 
            metalness={0.9} 
            roughness={0.2}
            emissive={state.isAttacking ? '#ff8800' : '#000'}
            emissiveIntensity={state.isAttacking ? 0.3 : 0}
          />
        </mesh>
        {/* Guard */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.15, 0.03, 0.08]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} />
        </mesh>
      </group>
      
      {/* Left arm */}
      <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} />
      </mesh>
      
      {/* Shield (left hand) - visible when blocking */}
      {state.isBlocking && (
        <group position={[-0.5, 0.9, 0.3]} rotation={[0, 0.5, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 6]} />
            <meshStandardMaterial 
              color="#5a5a5a" 
              metalness={0.8} 
              roughness={0.3}
              emissive="#4488ff"
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Shield emblem */}
          <mesh position={[0, 0, 0.03]}>
            <circleGeometry args={[0.15, 6]} />
            <meshStandardMaterial color="#8b7355" metalness={0.5} />
          </mesh>
        </group>
      )}
      
      {/* Attack slash effect */}
      {state.isAttacking && (
        <mesh position={[0.8, 1, -0.5]} rotation={[0, 0.5 + Math.sin(Date.now() * 0.02) * 0.3, 0.3]}>
          <torusGeometry args={[0.5, 0.03, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Dodge trail */}
      {state.isDodging && (
        <mesh position={[0, 0.9, 0.5]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#88ff88" transparent opacity={0.25} />
        </mesh>
      )}
      
      {/* Parry flash effect */}
      {state.isBlocking && state.parryWindow > 0 && (
        <mesh position={[-0.5, 0.9, 0.35]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// === MAIN COMPONENT ===

export function CharacterRig({
  state,
  characterPath,
  animationLibraryPath,
  weaponPath,
  scale = 1,
}: CharacterRigProps) {
  const [loadError, setLoadError] = useState(false);
  
  // If no character path or error, use procedural
  if (!characterPath || loadError) {
    return <ProceduralCharacter state={state} scale={scale} />;
  }
  
  return (
    <Suspense fallback={<ProceduralCharacter state={state} scale={scale} />}>
      <LoadedCharacter
        state={state}
        characterPath={characterPath}
        animationLibraryPath={animationLibraryPath}
        weaponPath={weaponPath}
        scale={scale}
      />
    </Suspense>
  );
}

// Preload utility
export function preloadCharacterAssets(paths: string[]) {
  paths.forEach(path => {
    if (path) useGLTF.preload(path);
  });
}

export default CharacterRig;
