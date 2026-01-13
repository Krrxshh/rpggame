'use client';

/**
 * Arena Component
 * Renders the procedural arena floor and boundaries
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorStore } from '../../state/src/floor-store';
import { getArenaVertices } from '../../content-generator/src/arena-generator';

export function Arena() {
  const currentFloor = useFloorStore((state) => state.currentFloor);
  const floorRef = useRef<THREE.Mesh>(null);
  const boundaryRef = useRef<THREE.LineLoop>(null);
  
  // Generate arena geometry
  const { floorGeometry, boundaryGeometry, obstacleData } = useMemo(() => {
    if (!currentFloor) {
      return {
        floorGeometry: new THREE.CircleGeometry(10, 32),
        boundaryGeometry: null,
        obstacleData: [],
      };
    }
    
    const { arena, obstacles } = currentFloor;
    
    // Create floor geometry based on shape
    let floorGeo: THREE.BufferGeometry;
    
    switch (arena.shape) {
      case 'circle':
        floorGeo = new THREE.CircleGeometry(arena.radius, 64);
        break;
      case 'ring':
        floorGeo = new THREE.RingGeometry(arena.innerRadius || 2, arena.radius, 64);
        break;
      case 'square':
        floorGeo = new THREE.PlaneGeometry(arena.radius * 2, arena.radius * 2);
        break;
      case 'octagon': {
        const vertices = getArenaVertices(arena, 8);
        const shape = new THREE.Shape();
        shape.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          shape.lineTo(vertices[i].x, vertices[i].y);
        }
        shape.closePath();
        floorGeo = new THREE.ShapeGeometry(shape);
        break;
      }
      default:
        floorGeo = new THREE.CircleGeometry(arena.radius, 64);
    }
    
    floorGeo.rotateX(-Math.PI / 2);
    
    // Create boundary line
    const boundaryVertices = getArenaVertices(arena, 64);
    const points = boundaryVertices.map(v => new THREE.Vector3(v.x, 0.1, v.y));
    points.push(points[0].clone()); // Close the loop
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(points);
    
    return {
      floorGeometry: floorGeo,
      boundaryGeometry: boundaryGeo,
      obstacleData: obstacles,
    };
  }, [currentFloor]);
  
  // Subtle animation
  useFrame((state) => {
    if (boundaryRef.current) {
      const material = boundaryRef.current.material as THREE.LineBasicMaterial;
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      material.opacity = pulse;
    }
  });
  
  if (!currentFloor) return null;
  
  const { palette } = currentFloor;
  
  return (
    <group>
      {/* Arena Floor */}
      <mesh
        ref={floorRef}
        geometry={floorGeometry}
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={palette.primary}
          roughness={0.8}
          metalness={0.2}
          envMapIntensity={0.3}
        />
      </mesh>
      
      {/* Arena Boundary Glow */}
      {boundaryGeometry && (
        <lineLoop ref={boundaryRef} geometry={boundaryGeometry}>
          <lineBasicMaterial
            color={palette.accent}
            transparent
            opacity={0.7}
            linewidth={2}
          />
        </lineLoop>
      )}
      
      {/* Obstacles */}
      {obstacleData.map((obstacle, index) => (
        <mesh
          key={`obstacle-${index}`}
          position={[obstacle.position.x, obstacle.size.height / 2, obstacle.position.y]}
          castShadow
          receiveShadow
        >
          {obstacle.radius ? (
            <cylinderGeometry args={[obstacle.radius, obstacle.radius, obstacle.size.height, 16]} />
          ) : (
            <boxGeometry args={[obstacle.size.width, obstacle.size.height, obstacle.size.depth]} />
          )}
          <meshStandardMaterial
            color={palette.secondary}
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>
      ))}
      
      {/* Hazard Zones */}
      {currentFloor.hazards.map((hazard, index) => (
        <mesh
          key={`hazard-${index}`}
          position={[hazard.position.x, 0.05, hazard.position.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[hazard.radius, 32]} />
          <meshBasicMaterial
            color={hazard.visualHint}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
      
      {/* Ground Grid */}
      <gridHelper
        args={[40, 40, palette.secondary, palette.secondary]}
        position={[0, 0.01, 0]}
        material-opacity={0.1}
        material-transparent
      />
    </group>
  );
}

export default Arena;
