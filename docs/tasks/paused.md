# Paused Tasks

## Turn-Based System (REMOVED)
Turn-based combat has been completely removed in favor of real-time action combat.
All turn-based related code can be found in git history if needed.

## Skeletal Animation Retargeting
**Status:** Awaiting actual skeleton analysis
**Reason:** Need to test with real character/animation asset combinations

Tasks:
- Analyze bone hierarchies from character and animation GLTFs
- Create mapping table for common bone name variants
- Implement runtime retargeting for Mixamo → custom rigs
- Add tolerance for bone rotation differences

## Ray Tracing / Path Tracing
**Status:** Waiting for WebGPU browser support
**Reason:** WebGPU required for compute shaders

Current workarounds in place:
- Screen-space reflections (SSR)
- Enhanced PBR with environment mapping
- Wetness-driven specular for rain

## Terrain System
**Status:** Designing heightmap format
**Reason:** Need to define data format before implementation

Options:
- PNG heightmaps (simple, limited precision)
- Float32 binary (precise, larger files)
- Procedural noise (infinite, deterministic)

## Multiplayer/Networking
**Status:** Architecture design phase
**Reason:** Major undertaking requiring careful planning

Considerations:
- State synchronization strategy
- Authoritative vs P2P
- Latency compensation
- Deterministic simulation requirements
