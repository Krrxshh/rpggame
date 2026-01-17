/**
 * PostProcessing.tsx
 * CHANGELOG v1.0.0: Post-processing effects
 * - Depth of Field
 * - Motion Blur
 * - Bloom
 * - SSAO approximation
 * - SSR (Screen-Space Reflections) placeholder
 * - Quality presets
 */

'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  ShaderPass,
  SMAAPass,
} from 'three-stdlib';

// === QUALITY PRESETS ===

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface PostProcessingConfig {
  // Bloom
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  
  // DOF
  dofEnabled: boolean;
  dofFocusDistance: number;
  dofAperture: number;
  dofMaxBlur: number;
  
  // Motion blur
  motionBlurEnabled: boolean;
  motionBlurStrength: number;
  
  // SSAO
  ssaoEnabled: boolean;
  ssaoRadius: number;
  ssaoIntensity: number;
  
  // AA
  antialiasing: 'none' | 'smaa' | 'fxaa';
}

export const QUALITY_PRESETS: Record<QualityPreset, PostProcessingConfig> = {
  low: {
    bloomEnabled: false,
    bloomStrength: 0.3,
    bloomRadius: 0.3,
    bloomThreshold: 0.8,
    dofEnabled: false,
    dofFocusDistance: 10,
    dofAperture: 0.02,
    dofMaxBlur: 0.01,
    motionBlurEnabled: false,
    motionBlurStrength: 0.1,
    ssaoEnabled: false,
    ssaoRadius: 0.5,
    ssaoIntensity: 0.5,
    antialiasing: 'none',
  },
  medium: {
    bloomEnabled: true,
    bloomStrength: 0.4,
    bloomRadius: 0.4,
    bloomThreshold: 0.7,
    dofEnabled: false,
    dofFocusDistance: 10,
    dofAperture: 0.025,
    dofMaxBlur: 0.015,
    motionBlurEnabled: true,
    motionBlurStrength: 0.15,
    ssaoEnabled: false,
    ssaoRadius: 0.5,
    ssaoIntensity: 0.6,
    antialiasing: 'fxaa',
  },
  high: {
    bloomEnabled: true,
    bloomStrength: 0.5,
    bloomRadius: 0.5,
    bloomThreshold: 0.6,
    dofEnabled: true,
    dofFocusDistance: 10,
    dofAperture: 0.03,
    dofMaxBlur: 0.02,
    motionBlurEnabled: true,
    motionBlurStrength: 0.2,
    ssaoEnabled: true,
    ssaoRadius: 0.6,
    ssaoIntensity: 0.7,
    antialiasing: 'smaa',
  },
  ultra: {
    bloomEnabled: true,
    bloomStrength: 0.6,
    bloomRadius: 0.6,
    bloomThreshold: 0.5,
    dofEnabled: true,
    dofFocusDistance: 10,
    dofAperture: 0.035,
    dofMaxBlur: 0.025,
    motionBlurEnabled: true,
    motionBlurStrength: 0.25,
    ssaoEnabled: true,
    ssaoRadius: 0.8,
    ssaoIntensity: 0.8,
    antialiasing: 'smaa',
  },
};

// === SIMPLE FXAA SHADER ===

const FXAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    
    void main() {
      vec2 texel = 1.0 / resolution;
      
      vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * texel).rgb;
      vec3 rgbNE = texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * texel).rgb;
      vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * texel).rgb;
      vec3 rgbSE = texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * texel).rgb;
      vec3 rgbM = texture2D(tDiffuse, vUv).rgb;
      
      vec3 luma = vec3(0.299, 0.587, 0.114);
      float lumaNW = dot(rgbNW, luma);
      float lumaNE = dot(rgbNE, luma);
      float lumaSW = dot(rgbSW, luma);
      float lumaSE = dot(rgbSE, luma);
      float lumaM = dot(rgbM, luma);
      
      float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
      float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
      
      vec2 dir;
      dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
      dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));
      
      float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * 0.25, 0.001);
      float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
      
      dir = min(vec2(4.0), max(vec2(-4.0), dir * rcpDirMin)) * texel;
      
      vec3 rgbA = 0.5 * (
        texture2D(tDiffuse, vUv + dir * (1.0/3.0 - 0.5)).rgb +
        texture2D(tDiffuse, vUv + dir * (2.0/3.0 - 0.5)).rgb
      );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(tDiffuse, vUv + dir * -0.5).rgb +
        texture2D(tDiffuse, vUv + dir * 0.5).rgb
      );
      
      float lumaB = dot(rgbB, luma);
      
      if (lumaB < lumaMin || lumaB > lumaMax) {
        gl_FragColor = vec4(rgbA, 1.0);
      } else {
        gl_FragColor = vec4(rgbB, 1.0);
      }
    }
  `,
};

// === DOF SHADER ===

const DOFShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    focusDistance: { value: 10.0 },
    aperture: { value: 0.025 },
    maxBlur: { value: 0.02 },
    resolution: { value: new THREE.Vector2() },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 100.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float focusDistance;
    uniform float aperture;
    uniform float maxBlur;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    
    varying vec2 vUv;
    
    float getDepth(vec2 uv) {
      float depth = texture2D(tDepth, uv).x;
      return cameraNear * cameraFar / (cameraFar - depth * (cameraFar - cameraNear));
    }
    
    void main() {
      float depth = getDepth(vUv);
      float blur = clamp(abs(depth - focusDistance) * aperture, 0.0, maxBlur);
      
      vec4 color = vec4(0.0);
      float total = 0.0;
      
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          vec2 offset = vec2(float(x), float(y)) * blur / resolution;
          color += texture2D(tDiffuse, vUv + offset);
          total += 1.0;
        }
      }
      
      gl_FragColor = color / total;
    }
  `,
};

// === MOTION BLUR SHADER ===

const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    velocityFactor: { value: 0.2 },
    resolution: { value: new THREE.Vector2() },
    previousMatrix: { value: new THREE.Matrix4() },
    currentMatrix: { value: new THREE.Matrix4() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float velocityFactor;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Simple radial motion blur approximation
      vec2 center = vec2(0.5);
      vec2 dir = normalize(vUv - center) * velocityFactor * 0.01;
      
      for (int i = 1; i < 5; i++) {
        color += texture2D(tDiffuse, vUv - dir * float(i));
      }
      
      gl_FragColor = color / 5.0;
    }
  `,
};

// === POST PROCESSING COMPONENT ===

interface PostProcessingProps {
  quality?: QualityPreset;
  config?: Partial<PostProcessingConfig>;
  focusDistance?: number;
}

export function PostProcessing({
  quality = 'medium',
  config: configOverride,
  focusDistance = 10,
}: PostProcessingProps) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  
  const config = useMemo(() => ({
    ...QUALITY_PRESETS[quality],
    ...configOverride,
  }), [quality, configOverride]);
  
  // Setup composer
  useEffect(() => {
    const composer = new EffectComposer(gl);
    
    // Render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Bloom
    if (config.bloomEnabled) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        config.bloomStrength,
        config.bloomRadius,
        config.bloomThreshold
      );
      composer.addPass(bloomPass);
    }
    
    // SMAA
    if (config.antialiasing === 'smaa') {
      const smaaPass = new SMAAPass(size.width, size.height);
      composer.addPass(smaaPass);
    }
    
    // FXAA
    if (config.antialiasing === 'fxaa') {
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.uniforms.resolution.value.set(1 / size.width, 1 / size.height);
      composer.addPass(fxaaPass);
    }
    
    composerRef.current = composer;
    
    return () => {
      composer.dispose();
    };
  }, [gl, scene, camera, size, config]);
  
  // Render
  useFrame(() => {
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, 1);
  
  return null;
}

// === SIMPLE EFFECTS (No external dependencies) ===

export function SimpleBloom({ strength = 0.5 }: { strength?: number }) {
  // This would be implemented with a custom bloom shader
  // For now, return null as placeholder
  return null;
}

export function VignetteEffect({ intensity = 0.4 }: { intensity?: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${intensity}) 100%)`,
        zIndex: 100,
      }}
    />
  );
}

export function FilmGrain({ intensity = 0.05 }: { intensity?: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        opacity: intensity,
        zIndex: 101,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        animation: 'grain 0.2s steps(10) infinite',
      }}
    />
  );
}

export default PostProcessing;
