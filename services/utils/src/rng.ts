/**
 * Seedable Pseudo-Random Number Generator using Mulberry32
 * Deterministic RNG - same seed always produces same sequence
 */

/**
 * Mulberry32 PRNG algorithm
 * Returns a function that generates values in [0, 1)
 */
export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a 32-bit integer for use as seed
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * RNG interface for type safety
 */
export interface RNG {
  /** Get next random value in [0, 1) */
  next(): number;
  /** Get random integer in [min, max] inclusive */
  range(min: number, max: number): number;
  /** Get random float in [min, max) */
  rangeFloat(min: number, max: number): number;
  /** Returns true with given probability (0-1) */
  chance(probability: number): boolean;
  /** Pick random element from array */
  pick<T>(array: T[]): T;
  /** Shuffle array in place */
  shuffle<T>(array: T[]): T[];
  /** Get current seed */
  getSeed(): number;
}

/**
 * Create a seedable RNG instance
 */
export function createRNG(seed: number | string): RNG {
  const numericSeed = typeof seed === 'string' ? hashString(seed) : seed;
  const generator = mulberry32(numericSeed);

  return {
    next: generator,

    range(min: number, max: number): number {
      return Math.floor(generator() * (max - min + 1)) + min;
    },

    rangeFloat(min: number, max: number): number {
      return generator() * (max - min) + min;
    },

    chance(probability: number): boolean {
      return generator() < probability;
    },

    pick<T>(array: T[]): T {
      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      return array[Math.floor(generator() * array.length)];
    },

    shuffle<T>(array: T[]): T[] {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(generator() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },

    getSeed(): number {
      return numericSeed;
    },
  };
}
