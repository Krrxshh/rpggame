# Open Tasks

## High Priority
- [ ] Wire WorldTimeProvider into main game scene
- [ ] Integrate asset models with environment spawner
- [ ] Add rest UI when near campfire

## Medium Priority
- [ ] Implement WebGPU path tracer (experimental)
  - Requires: WebGPU support, PathTracingRenderer
  - Gate behind `--enable-experimental-pathtracer` flag
- [ ] Retarget animation skeletons for imported characters
  - Tool: Blender or Mixamo
- [ ] Add sound effect hooks for environment & combat

## Low Priority
- [ ] Convert any future Unity/Unreal assets
  - Use: `FBX2glTF` or Blender export
  - Command: `npx fbx2gltf -i input.fbx -o output.glb`
- [ ] Add equipment system for weapons
- [ ] Implement more weather types (snow, fog only)
- [ ] Add procedural dungeon interiors

## Future
- [ ] Mobile touch controls
- [ ] Multiplayer sync (experimental)
- [ ] Procedural quests
