# Free-Roam Open World - Architecture Plan

## Overview
Enhanced from action RPG to open-world exploration with:
- Asset integration (glTF/FBX models, animations)
- Day/night cycle with dynamic lighting
- Weather system (rain, fog, clouds)
- Safe zones and resting mechanics
- Improved shaders and camera

## New Systems Added (v2.0.0)

### Character & Animation Pipeline
```
CharacterRig.tsx → Skeleton loading, animation mixer, bone search
  - Supports RightHand, Hand_R, R_Hand variants for weapon attach
  - Procedural fallback for missing skeletons
  - Animation state machine (idle, walk, run, attack, dodge, block)
```

### AAA Camera System
```
AAACamera.tsx → Third-person with collision
  - Pointer lock with smooth interpolation
  - Raycast collision to prevent clipping
  - Attack zoom, aim mode orbit
  - Shake on hit with decay
```

### Weapon System
```
weaponSystem.ts → Stats, swing arcs, hit windows
  - Timed collision sweeps
  - Weapon type transforms
  - Combo chain support
```

### Physics Upgrade
```
enhancedPhysics.ts → Capsule collision, slopes
  - Slope limit with slide prevention
  - Ground friction vs air friction
  - Knockback and impulse system
```

### Boss Templates
```
bossTemplate.ts → Movesets and phases
  - Telegraph → Windup → Execute → Recover
  - Combo patterns
  - Enrage at HP threshold
  - Parry stagger bonus
```

### Environment Upgrades
```
Water.tsx → Shader-based waves, fresnel, foam
VolumetricFog.tsx → Noise-based depth fog
DenseVegetation.tsx → Instanced trees/rocks/grass with LOD
```

### Post-Processing
```
PostProcessing.tsx → Quality presets
  - Bloom, DOF, motion blur
  - FXAA/SMAA antialiasing
  - Vignette, film grain
```

### UI Polish
```
EnhancedUI.tsx → Premium screens
  - Title: Animated particles, seed selector
  - Death: Stats summary, retry, copy seed
  - HUD: Health bars, quickslots, minimap
```

### Input System
```
inputManager.ts → Centralized input
  - Pointer lock management
  - Keybinding configuration
  - Attack hold detection for heavy attacks
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

## TODO: Skeletal Retargeting
- Some animation clips may need retargeting to character rigs
- Log warnings for skeleton mismatches
- Implement runtime bone remapping

## TODO: Sound Hooks
- VFX triggers emit sound IDs
- Boss attacks have soundId fields
- Implement audio manager integration

## TODO: WebGPU Path Tracing
For future hardware ray tracing, see `docs/tasks/open.md`.
