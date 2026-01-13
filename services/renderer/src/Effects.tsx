'use client';

/**
 * Effects Component
 * Postprocessing effects using @react-three/postprocessing
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useSettingsStore } from '../../state/src/game-store';
import { useFloorStore } from '../../state/src/floor-store';

export function Effects() {
  const graphicsQuality = useSettingsStore((state) => state.graphicsQuality);
  const currentFloor = useFloorStore((state) => state.currentFloor);
  
  // Adjust effects based on quality
  const bloomIntensity = graphicsQuality === 'high' ? 0.8 : 0.5;
  
  // Adjust effects based on lighting preset
  const getPresetEffects = () => {
    if (!currentFloor) return { bloom: 0.6, vignette: 0.4 };
    
    switch (currentFloor.lightingPreset) {
      case 'neon':
        return { bloom: 1.2, vignette: 0.5 };
      case 'wireframe':
        return { bloom: 1.5, vignette: 0.6 };
      case 'dark':
        return { bloom: 0.4, vignette: 0.7 };
      case 'pastel':
        return { bloom: 0.3, vignette: 0.2 };
      case 'sunset':
        return { bloom: 0.8, vignette: 0.5 };
      default:
        return { bloom: 0.6, vignette: 0.4 };
    }
  };
  
  const presetEffects = getPresetEffects();
  
  return (
    <EffectComposer multisampling={graphicsQuality === 'high' ? 8 : 4}>
      <Bloom
        intensity={bloomIntensity * presetEffects.bloom}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={presetEffects.vignette}
      />
    </EffectComposer>
  );
}

export default Effects;
