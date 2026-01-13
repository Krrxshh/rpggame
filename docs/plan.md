# Free-Roam Open World - Architecture Plan

## Overview
Enhanced from action RPG to open-world exploration with:
- Asset integration (glTF/FBX models, animations)
- Day/night cycle with dynamic lighting
- Weather system (rain, fog, clouds)
- Safe zones and resting mechanics
- Improved shaders and camera

## New Systems Added

### Asset Pipeline
```
assetRegistry.ts → getEnvironmentAssets(), getCharacterAssets()
assetLoaders.ts → loadGLTF(), loadFBX(), animation support
asset_manifest.json → 245 usable assets cataloged
```

### Day/Night & Weather
```
DayNightCycle.ts → Sun position, colors, phases
WeatherSystem.ts → Rain, fog, wetness transitions
WorldTimeManager.tsx → React context, dynamic lighting
RainSystem.tsx → Instanced particles
Clouds.tsx → Procedural shader clouds
```

### Safe Zones & Resting
```
safeZone.ts → Zone detection, enemy restrictions, safe mode
resting.ts → HP recovery, time advancement
```

### Camera & Input Fixes
```
ImprovedCamera.tsx → Pointer lock, pitch clamp, collision
getCameraRelativeDirection() → WASD relative to camera
```

### New Shaders
```
pbr_wetness.frag → Roughness modulation for rain
volumetric_fog.frag → Depth-based noise fog
```

## Asset Manifest Summary
| Category | Count | Format |
|----------|-------|--------|
| Trees | 15 | GLTF |
| Rocks | 7 | GLTF |
| Vegetation | 9 | GLTF |
| Characters | 2 | GLTF |
| Animations | 1 | GLB |
| Weapons | 83+ | GLTF |
| Textures | 20+ | PNG |

## Ray Tracing Note
Real hardware-accelerated ray tracing (RTX-style) requires WebGPU + platform support. Current implementation uses:
- Screen-space reflections (SSR)
- Enhanced PBR materials
- Wetness-driven specular

For future path tracing, see `docs/tasks/open.md` for WebGPU integration task.
