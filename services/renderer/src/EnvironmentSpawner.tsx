'use client';

/**
 * Environment Spawner
 * Procedurally places trees, rocks, grass using actual assets
 * FIXED - correct asset paths
 */

import { useMemo, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createRNG } from '../../utils/src/rng';

interface EnvironmentSpawnerProps {
  seed: string | number;
  radius: number;
  centerX: number;
  centerZ: number;
  density?: number;
}

// Individual tree model
function TreeModel({ position, scale, rotation, variant }: { position: [number, number, number]; scale: number; rotation: number; variant: number }) {
  const paths = [
    '/Assets/Environment/glTF/CommonTree_1.gltf',
    '/Assets/Environment/glTF/CommonTree_2.gltf',
    '/Assets/Environment/glTF/DeadTree_1.gltf',
  ];
  const { scene } = useGLTF(paths[variant % paths.length]);
  const cloned = useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={cloned} 
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
    />
  );
}

// Rock model - using correct paths
function RockModel({ position, scale, rotation, variant }: { position: [number, number, number]; scale: number; rotation: number; variant: number }) {
  const paths = [
    '/Assets/Environment/glTF/Rock_Medium_1.gltf',
    '/Assets/Environment/glTF/Rock_Medium_2.gltf',
    '/Assets/Environment/glTF/Rock_Medium_3.gltf',
  ];
  const { scene } = useGLTF(paths[variant % paths.length]);
  const cloned = useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={cloned} 
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
    />
  );
}

// Bush model  
function BushModel({ position, scale }: { position: [number, number, number]; scale: number }) {
  const { scene } = useGLTF('/Assets/Environment/glTF/Bush_Common.gltf');
  const cloned = useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={cloned} 
      position={position}
      scale={scale}
    />
  );
}

// Simple grass (procedural fallback since grass models may not load well)
function GrassPatch({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <coneGeometry args={[0.1, 0.4, 4]} />
      <meshStandardMaterial color="#4a6a3a" />
    </mesh>
  );
}

// Fallback for loading
function EnvironmentFallback() {
  return (
    <group>
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[(i - 5) * 8, 2, (i % 3) * 10 - 15]} castShadow>
          <coneGeometry args={[1.5, 4, 8]} />
          <meshStandardMaterial color="#2a4a2a" />
        </mesh>
      ))}
    </group>
  );
}

export function EnvironmentSpawner({ seed, radius, centerX, centerZ, density = 1 }: EnvironmentSpawnerProps) {
  const rng = useMemo(() => createRNG(seed), [seed]);
  
  // Generate spawn positions
  const spawns = useMemo(() => {
    const trees: { x: number; z: number; scale: number; rotation: number; variant: number }[] = [];
    const rocks: { x: number; z: number; scale: number; rotation: number; variant: number }[] = [];
    const bushes: { x: number; z: number; scale: number }[] = [];
    const grass: { x: number; z: number; scale: number }[] = [];
    
    const treeCount = Math.floor(12 * density);
    const rockCount = Math.floor(8 * density);
    const bushCount = Math.floor(15 * density);
    const grassCount = Math.floor(40 * density);
    
    // Trees - avoid center
    for (let i = 0; i < treeCount; i++) {
      const angle = rng.rangeFloat(0, Math.PI * 2);
      const dist = rng.rangeFloat(15, radius);
      trees.push({
        x: centerX + Math.cos(angle) * dist,
        z: centerZ + Math.sin(angle) * dist,
        scale: rng.rangeFloat(0.6, 1.2),
        rotation: rng.rangeFloat(0, Math.PI * 2),
        variant: rng.range(0, 2),
      });
    }
    
    // Rocks
    for (let i = 0; i < rockCount; i++) {
      const angle = rng.rangeFloat(0, Math.PI * 2);
      const dist = rng.rangeFloat(10, radius);
      rocks.push({
        x: centerX + Math.cos(angle) * dist,
        z: centerZ + Math.sin(angle) * dist,
        scale: rng.rangeFloat(0.3, 1.0),
        rotation: rng.rangeFloat(0, Math.PI * 2),
        variant: rng.range(0, 2),
      });
    }
    
    // Bushes
    for (let i = 0; i < bushCount; i++) {
      const angle = rng.rangeFloat(0, Math.PI * 2);
      const dist = rng.rangeFloat(8, radius);
      bushes.push({
        x: centerX + Math.cos(angle) * dist,
        z: centerZ + Math.sin(angle) * dist,
        scale: rng.rangeFloat(0.4, 0.9),
      });
    }
    
    // Grass
    for (let i = 0; i < grassCount; i++) {
      const angle = rng.rangeFloat(0, Math.PI * 2);
      const dist = rng.rangeFloat(5, radius);
      grass.push({
        x: centerX + Math.cos(angle) * dist,
        z: centerZ + Math.sin(angle) * dist,
        scale: rng.rangeFloat(0.5, 1.5),
      });
    }
    
    return { trees, rocks, bushes, grass };
  }, [seed, radius, centerX, centerZ, density, rng]);
  
  return (
    <Suspense fallback={<EnvironmentFallback />}>
      <group>
        {/* Trees */}
        {spawns.trees.map((t, i) => (
          <TreeModel 
            key={`tree-${i}`} 
            position={[t.x, 0, t.z]} 
            scale={t.scale} 
            rotation={t.rotation}
            variant={t.variant}
          />
        ))}
        
        {/* Rocks */}
        {spawns.rocks.map((r, i) => (
          <RockModel 
            key={`rock-${i}`} 
            position={[r.x, 0, r.z]} 
            scale={r.scale} 
            rotation={r.rotation}
            variant={r.variant}
          />
        ))}
        
        {/* Bushes */}
        {spawns.bushes.map((b, i) => (
          <BushModel 
            key={`bush-${i}`} 
            position={[b.x, 0, b.z]} 
            scale={b.scale}
          />
        ))}
        
        {/* Grass patches (procedural) */}
        {spawns.grass.map((g, i) => (
          <GrassPatch 
            key={`grass-${i}`} 
            position={[g.x, 0, g.z]} 
            scale={g.scale}
          />
        ))}
      </group>
    </Suspense>
  );
}

// Preload common assets with CORRECT paths
useGLTF.preload('/Assets/Environment/glTF/CommonTree_1.gltf');
useGLTF.preload('/Assets/Environment/glTF/CommonTree_2.gltf');
useGLTF.preload('/Assets/Environment/glTF/DeadTree_1.gltf');
useGLTF.preload('/Assets/Environment/glTF/Rock_Medium_1.gltf');
useGLTF.preload('/Assets/Environment/glTF/Rock_Medium_2.gltf');
useGLTF.preload('/Assets/Environment/glTF/Bush_Common.gltf');

export default EnvironmentSpawner;
