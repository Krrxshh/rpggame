/**
 * Asset Registry
 * Reads manifest and provides API to query assets by role
 * NEW FILE
 */

import manifestData from '../../../docs/asset_manifest.json';

export interface AssetEntry {
  id: string;
  path: string;
  ext: string;
  usable: boolean;
  role: string;
  hasAnimations?: boolean;
  notes?: string;
}

interface AssetManifest {
  categories: {
    environment: {
      trees: AssetEntry[];
      rocks: AssetEntry[];
      vegetation: AssetEntry[];
    };
    characters: AssetEntry[];
    animations: AssetEntry[];
    weapons: AssetEntry[];
    textures: AssetEntry[];
  };
}

const manifest = manifestData as AssetManifest;

// Cache flattened lists
const allEnvironmentAssets: AssetEntry[] = [
  ...manifest.categories.environment.trees,
  ...manifest.categories.environment.rocks,
  ...manifest.categories.environment.vegetation,
];

export function getEnvironmentAssets(type?: 'trees' | 'rocks' | 'vegetation'): AssetEntry[] {
  if (!type) return allEnvironmentAssets;
  return manifest.categories.environment[type] || [];
}

export function getTreeAssets(): AssetEntry[] {
  return manifest.categories.environment.trees;
}

export function getRockAssets(): AssetEntry[] {
  return manifest.categories.environment.rocks;
}

export function getVegetationAssets(): AssetEntry[] {
  return manifest.categories.environment.vegetation;
}

export function getCharacterAssets(): AssetEntry[] {
  return manifest.categories.characters;
}

export function getWeaponAssets(): AssetEntry[] {
  return manifest.categories.weapons;
}

export function getAnimationAssets(): AssetEntry[] {
  return manifest.categories.animations;
}

export function getTextureAssets(): AssetEntry[] {
  return manifest.categories.textures;
}

export function getAssetById(id: string): AssetEntry | undefined {
  const allAssets = [
    ...allEnvironmentAssets,
    ...manifest.categories.characters,
    ...manifest.categories.weapons,
    ...manifest.categories.animations,
    ...manifest.categories.textures,
  ];
  return allAssets.find(a => a.id === id);
}

export function getRandomAsset(assets: AssetEntry[], rng: { range: (min: number, max: number) => number }): AssetEntry {
  const idx = rng.range(0, assets.length - 1);
  return assets[idx];
}

export default {
  getEnvironmentAssets,
  getTreeAssets,
  getRockAssets,
  getVegetationAssets,
  getCharacterAssets,
  getWeaponAssets,
  getAnimationAssets,
  getTextureAssets,
  getAssetById,
  getRandomAsset,
};
