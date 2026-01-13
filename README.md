# Infinite Roguelike

A procedurally generated infinite 3D action roguelike built with Next.js, Three.js, and React Three Fiber. Features deterministic seeded gameplay for reproducible runs.

## Features

- 🎮 **Infinite Floors** - Fight one enemy per floor, progress forever
- 🎲 **Seeded Generation** - Same seed = same game, share with friends
- ⚔️ **4 Combat Actions** - Attack, Defend, Item, Risky
- 🏟️ **5 Arena Shapes** - Circle, ring, octagon, square, irregular
- 🎨 **6 Lighting Presets** - Neon, lowpoly, pastel, wireframe, dark, sunset
- 🔮 **Procedural Visuals** - All assets generated, no external files
- 📊 **Deterministic Combat** - Every outcome is reproducible

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open in browser
open http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |

## Project Structure

```
services/
├── content-generator/  # Floor, arena, enemy generation
├── game-engine/        # Combat, validation, physics
├── renderer/           # R3F scene components
├── shaders/            # GLSL vertex/fragment shaders
├── state/              # Zustand state stores
├── tests/              # Vitest test suites
├── ui/                 # React UI components
└── utils/              # RNG, math, color helpers

src/app/
└── page.tsx            # Main game entry point

docs/
├── plan.md             # Architecture documentation
└── tasks/              # Open/paused task lists
```

## How to Play

1. **Enter a seed** (or leave blank for random)
2. **Click START GAME**
3. **Choose actions** each turn:
   - **Attack** - Deal base damage to enemy
   - **Defend** - Reduce incoming damage, skip counterattack
   - **Item** - Heal 3 HP (once per floor)
   - **Risky** - 50% chance for double damage, 50% chance for self-damage
4. **Defeat the enemy** to advance to next floor
5. **Don't die** - Game over if HP reaches 0

## Seed Replay Guide

The game is fully deterministic. To replay a run:

1. Note your seed (shown in HUD)
2. Start a new game with the same seed
3. Make the same action choices
4. Observe identical outcomes

This works because:
- All RNG uses Mulberry32 PRNG seeded from your input
- Combat math is deterministic
- Floor generation uses floor-specific sub-seeds

Share interesting seeds with friends to challenge them!

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test services/tests/src/rng.test.ts
```

Tests cover:
- RNG reproducibility
- Floor generation validity
- Combat determinism
- Validation rules

## Technology Stack

- **Framework**: Next.js 16
- **3D Engine**: Three.js + React Three Fiber
- **State**: Zustand
- **Styling**: CSS Modules
- **Testing**: Vitest
- **Language**: TypeScript

## Development Notes

### Adding New Arena Shapes

1. Add shape name to `ArenaShape` type in `game-engine/src/types.ts`
2. Add geometry in `Arena.tsx`
3. Add boundary check in `validation.ts`
4. Add selection logic in `arena-generator.ts`

### Adding New Enemy Types

1. Add visual type to `Enemy` type
2. Add geometry in `Enemy.tsx`
3. Add selection logic in `enemy-generator.ts`

### Adding New Lighting Presets

1. Add preset name to `LightingPreset` type
2. Add colors in `color.ts` `generatePalette()`
3. Add lighting in `Lighting.tsx` `getLightColors()`
4. Add effects in `Effects.tsx` `getPresetEffects()`

## License

MIT
