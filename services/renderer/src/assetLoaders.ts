/**
 * Asset Loaders
 * GLTF/GLB/FBX/OBJ loaders with caching
 * NEW FILE
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Asset cache
const modelCache = new Map<string, THREE.Object3D>();
const gltfCache = new Map<string, GLTF>();
const loadingPromises = new Map<string, Promise<THREE.Object3D>>();

// Loaders (singleton)
let gltfLoader: GLTFLoader | null = null;
let fbxLoader: FBXLoader | null = null;
let objLoader: OBJLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
  }
  return gltfLoader;
}

function getFBXLoader(): FBXLoader {
  if (!fbxLoader) {
    fbxLoader = new FBXLoader();
  }
  return fbxLoader;
}

function getOBJLoader(): OBJLoader {
  if (!objLoader) {
    objLoader = new OBJLoader();
  }
  return objLoader;
}

export interface LoadedAsset {
  model: THREE.Object3D;
  animations: THREE.AnimationClip[];
  mixer?: THREE.AnimationMixer;
}

export async function loadGLTF(path: string): Promise<LoadedAsset> {
  // Check cache
  if (gltfCache.has(path)) {
    const cached = gltfCache.get(path)!;
    return {
      model: cached.scene.clone(),
      animations: cached.animations,
    };
  }
  
  const loader = getGLTFLoader();
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  
  return new Promise((resolve, reject) => {
    loader.load(
      fullPath,
      (gltf) => {
        gltfCache.set(path, gltf);
        
        // Setup shadows
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        resolve({
          model: gltf.scene.clone(),
          animations: gltf.animations,
        });
      },
      undefined,
      (error) => {
        console.error(`[AssetLoader] Failed to load GLTF: ${path}`, error);
        reject(error);
      }
    );
  });
}

export async function loadFBX(path: string): Promise<LoadedAsset> {
  // Check cache
  if (modelCache.has(path)) {
    return {
      model: modelCache.get(path)!.clone(),
      animations: [],
    };
  }
  
  const loader = getFBXLoader();
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  
  return new Promise((resolve, reject) => {
    loader.load(
      fullPath,
      (fbx) => {
        modelCache.set(path, fbx);
        
        // Setup shadows
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Extract animations
        const animations = fbx.animations || [];
        
        resolve({
          model: fbx.clone(),
          animations,
        });
      },
      undefined,
      (error) => {
        console.error(`[AssetLoader] Failed to load FBX: ${path}`, error);
        reject(error);
      }
    );
  });
}

export async function loadOBJ(path: string): Promise<LoadedAsset> {
  // Check cache
  if (modelCache.has(path)) {
    return {
      model: modelCache.get(path)!.clone(),
      animations: [],
    };
  }
  
  const loader = getOBJLoader();
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  
  return new Promise((resolve, reject) => {
    loader.load(
      fullPath,
      (obj) => {
        modelCache.set(path, obj);
        
        // Setup shadows
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        resolve({
          model: obj.clone(),
          animations: [],
        });
      },
      undefined,
      (error) => {
        console.error(`[AssetLoader] Failed to load OBJ: ${path}`, error);
        reject(error);
      }
    );
  });
}

export async function loadAsset(path: string): Promise<LoadedAsset> {
  const ext = path.split('.').pop()?.toLowerCase();
  
  // Prevent duplicate loading
  if (loadingPromises.has(path)) {
    const cachedModel = await loadingPromises.get(path);
    return { model: cachedModel!.clone(), animations: [] };
  }
  
  let loadPromise: Promise<LoadedAsset>;
  
  switch (ext) {
    case 'glb':
    case 'gltf':
      loadPromise = loadGLTF(path);
      break;
    case 'fbx':
      loadPromise = loadFBX(path);
      break;
    case 'obj':
      loadPromise = loadOBJ(path);
      break;
    default:
      console.warn(`[AssetLoader] Unsupported format: ${ext}`);
      return createPlaceholder();
  }
  
  return loadPromise;
}

// Create placeholder mesh for unsupported/failed assets
function createPlaceholder(): LoadedAsset {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff00ff, wireframe: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'placeholder';
  return { model: mesh, animations: [] };
}

// Animation helpers
export function createAnimationMixer(model: THREE.Object3D, animations: THREE.AnimationClip[]): THREE.AnimationMixer {
  const mixer = new THREE.AnimationMixer(model);
  return mixer;
}

export function playAnimation(mixer: THREE.AnimationMixer, clip: THREE.AnimationClip, loop: boolean = true): THREE.AnimationAction {
  const action = mixer.clipAction(clip);
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.play();
  return action;
}

export function findAnimationByName(animations: THREE.AnimationClip[], namePattern: string): THREE.AnimationClip | undefined {
  const lowerPattern = namePattern.toLowerCase();
  return animations.find(clip => clip.name.toLowerCase().includes(lowerPattern));
}

// Preload commonly used assets
export async function preloadAssets(paths: string[]): Promise<void> {
  await Promise.all(paths.map(path => loadAsset(path).catch(() => null)));
}

export default {
  loadAsset,
  loadGLTF,
  loadFBX,
  loadOBJ,
  createAnimationMixer,
  playAnimation,
  findAnimationByName,
  preloadAssets,
};
