'use client';

/**
 * Game Canvas Component
 * Main R3F Canvas with camera, lighting, and postprocessing
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import { useSettingsStore } from '../../state/src/game-store';
import { Lighting } from './Lighting';
import { Effects } from './Effects';
import { Arena } from './Arena';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Particles } from './Particles';

interface GameCanvasProps {
  children?: React.ReactNode;
}

export function GameCanvas({ children }: GameCanvasProps) {
  const graphicsQuality = useSettingsStore((state) => state.graphicsQuality);
  
  const dpr = graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? 1.5 : 2;
  
  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: graphicsQuality !== 'low',
        powerPreference: 'high-performance',
        alpha: false,
      }}
      shadows={graphicsQuality === 'high'}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[0, 15, 12]}
          fov={50}
          near={0.1}
          far={100}
        />
        
        {/* Camera Controls - limited for gameplay */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          target={[0, 0, 0]}
        />
        
        {/* Environment for reflections */}
        <Environment preset="night" />
        
        {/* Scene Content */}
        <Lighting />
        <Arena />
        <Player />
        <Enemy />
        <Particles />
        
        {/* Postprocessing Effects */}
        {graphicsQuality !== 'low' && <Effects />}
        
        {/* Custom children */}
        {children}
      </Suspense>
    </Canvas>
  );
}

export default GameCanvas;
