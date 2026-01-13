/**
 * Color utility functions for procedural palette generation
 */

import type { RNG } from './rng';

/**
 * RGB color type (0-255)
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color type (h: 0-360, s: 0-100, l: 0-100)
 */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert HSL to hex string
 */
export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Lighting preset types
 */
export type LightingPreset = 'neon' | 'lowpoly' | 'pastel' | 'wireframe' | 'dark' | 'sunset';

/**
 * Color palette for a floor
 */
export interface ColorPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  enemy: string;
  hazard: string;
}

/**
 * Generate a procedural color palette based on lighting preset
 */
export function generatePalette(rng: RNG, preset: LightingPreset): ColorPalette {
  const baseHue = rng.range(0, 360);
  
  switch (preset) {
    case 'neon': {
      const saturation = rng.range(80, 100);
      return {
        background: hslToHex(baseHue, 30, 8),
        primary: hslToHex(baseHue, saturation, 50),
        secondary: hslToHex((baseHue + 60) % 360, saturation, 45),
        accent: hslToHex((baseHue + 180) % 360, saturation, 55),
        enemy: hslToHex((baseHue + 120) % 360, saturation, 50),
        hazard: hslToHex(0, 100, 50),
      };
    }
    
    case 'lowpoly': {
      const saturation = rng.range(40, 60);
      return {
        background: hslToHex(baseHue, 20, 15),
        primary: hslToHex(baseHue, saturation, 45),
        secondary: hslToHex((baseHue + 40) % 360, saturation, 40),
        accent: hslToHex((baseHue + 200) % 360, saturation, 50),
        enemy: hslToHex((baseHue + 150) % 360, saturation, 45),
        hazard: hslToHex(30, 80, 50),
      };
    }
    
    case 'pastel': {
      const saturation = rng.range(50, 70);
      const lightness = rng.range(70, 85);
      return {
        background: hslToHex(baseHue, 30, 90),
        primary: hslToHex(baseHue, saturation, lightness),
        secondary: hslToHex((baseHue + 30) % 360, saturation, lightness - 5),
        accent: hslToHex((baseHue + 180) % 360, saturation, lightness),
        enemy: hslToHex((baseHue + 90) % 360, saturation, lightness - 10),
        hazard: hslToHex(350, 70, 70),
      };
    }
    
    case 'wireframe': {
      return {
        background: '#0a0a0a',
        primary: '#00ff88',
        secondary: '#00cc66',
        accent: '#ffffff',
        enemy: '#ff3366',
        hazard: '#ffaa00',
      };
    }
    
    case 'dark': {
      const saturation = rng.range(20, 40);
      return {
        background: hslToHex(baseHue, 15, 5),
        primary: hslToHex(baseHue, saturation, 25),
        secondary: hslToHex((baseHue + 20) % 360, saturation, 20),
        accent: hslToHex((baseHue + 180) % 360, 60, 40),
        enemy: hslToHex(0, 50, 35),
        hazard: hslToHex(30, 70, 35),
      };
    }
    
    case 'sunset': {
      return {
        background: hslToHex(250, 40, 12),
        primary: hslToHex(30, 80, 50),
        secondary: hslToHex(350, 70, 45),
        accent: hslToHex(45, 90, 55),
        enemy: hslToHex(280, 60, 45),
        hazard: hslToHex(0, 85, 50),
      };
    }
    
    default:
      return generatePalette(rng, 'neon');
  }
}

/**
 * Interpolate between two colors
 */
export function lerpColor(color1: RGB, color2: RGB, t: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t),
  };
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: Math.min(255, Math.max(0, Math.round(rgb.r * (1 + percent / 100)))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * (1 + percent / 100)))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * (1 + percent / 100)))),
  });
}
