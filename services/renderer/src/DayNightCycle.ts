/**
 * Day/Night Cycle System
 * Sun position, lighting, and sky color based on time
 * NEW FILE
 */

import * as THREE from 'three';

export interface TimeState {
  hours: number; // 0-24
  minutes: number; // 0-60
  dayProgress: number; // 0-1 (0 = midnight, 0.5 = noon)
  isDaytime: boolean;
  phase: 'night' | 'dawn' | 'day' | 'dusk';
}

export interface DayNightConfig {
  timeScale: number; // Real seconds per in-game minute (default: 1)
  sunriseHour: number;
  sunsetHour: number;
  dawnDuration: number; // Hours
  duskDuration: number;
}

export const DEFAULT_CONFIG: DayNightConfig = {
  timeScale: 1,
  sunriseHour: 6,
  sunsetHour: 18,
  dawnDuration: 1,
  duskDuration: 1,
};

// Color palettes for different times
const SKY_COLORS = {
  night: new THREE.Color(0x0a0a1a),
  dawn: new THREE.Color(0x4a2a3a),
  day: new THREE.Color(0x87ceeb),
  dusk: new THREE.Color(0x8a4a3a),
};

const SUN_COLORS = {
  night: new THREE.Color(0x2a3a5a),
  dawn: new THREE.Color(0xffa040),
  day: new THREE.Color(0xffffff),
  dusk: new THREE.Color(0xff6030),
};

const FOG_COLORS = {
  night: new THREE.Color(0x0a0a15),
  dawn: new THREE.Color(0x5a4050),
  day: new THREE.Color(0x88aacc),
  dusk: new THREE.Color(0x5a3040),
};

export function createTimeState(hour: number = 12): TimeState {
  return updateTimeState({ hours: hour, minutes: 0, dayProgress: 0, isDaytime: true, phase: 'day' }, 0, DEFAULT_CONFIG);
}

export function updateTimeState(
  state: TimeState,
  deltaSeconds: number,
  config: DayNightConfig
): TimeState {
  // Advance time
  const totalMinutes = state.hours * 60 + state.minutes + (deltaSeconds / config.timeScale);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  
  // Calculate day progress (0 = midnight, 0.5 = noon, 1 = next midnight)
  const dayProgress = hours / 24 + minutes / (24 * 60);
  
  // Determine phase
  const { sunriseHour, sunsetHour, dawnDuration, duskDuration } = config;
  let phase: TimeState['phase'];
  
  if (hours >= sunriseHour - dawnDuration && hours < sunriseHour) {
    phase = 'dawn';
  } else if (hours >= sunriseHour && hours < sunsetHour - duskDuration) {
    phase = 'day';
  } else if (hours >= sunsetHour - duskDuration && hours < sunsetHour) {
    phase = 'dusk';
  } else {
    phase = 'night';
  }
  
  const isDaytime = phase === 'day' || phase === 'dawn' || phase === 'dusk';
  
  return { hours, minutes, dayProgress, isDaytime, phase };
}

export function getSunPosition(timeState: TimeState): THREE.Vector3 {
  // Sun rises in east (+X), peaks at noon, sets in west (-X)
  // Angle from 0 (sunrise) to PI (sunset)
  const { hours, minutes } = timeState;
  const timeDecimal = hours + minutes / 60;
  
  // Map time to sun angle (6am = 0, 12pm = PI/2, 6pm = PI)
  const sunAngle = ((timeDecimal - 6) / 12) * Math.PI;
  
  const height = Math.sin(sunAngle) * 100;
  const distance = Math.cos(sunAngle) * 100;
  
  // Clamp below horizon at night
  const y = Math.max(height, -50);
  
  return new THREE.Vector3(distance, y, 0);
}

export function getSunIntensity(timeState: TimeState): number {
  const { phase, hours, minutes } = timeState;
  const timeDecimal = hours + minutes / 60;
  
  switch (phase) {
    case 'night':
      return 0.1; // Moon light
    case 'dawn':
      // Fade in from 5am to 6am
      const dawnProgress = (timeDecimal - 5) / 1;
      return 0.1 + dawnProgress * 0.9;
    case 'day':
      // Peak at noon
      const noonDistance = Math.abs(timeDecimal - 12);
      return 1.0 - noonDistance * 0.05;
    case 'dusk':
      // Fade out from 5pm to 6pm
      const duskProgress = (timeDecimal - 17) / 1;
      return 1.0 - duskProgress * 0.9;
    default:
      return 0.5;
  }
}

export function getSunColor(timeState: TimeState): THREE.Color {
  return interpolatePhaseColor(timeState, SUN_COLORS);
}

export function getSkyColor(timeState: TimeState): THREE.Color {
  return interpolatePhaseColor(timeState, SKY_COLORS);
}

export function getFogColor(timeState: TimeState): THREE.Color {
  return interpolatePhaseColor(timeState, FOG_COLORS);
}

function interpolatePhaseColor(
  timeState: TimeState,
  colors: Record<TimeState['phase'], THREE.Color>
): THREE.Color {
  const { phase, hours, minutes } = timeState;
  const timeDecimal = hours + minutes / 60;
  const color = colors[phase].clone();
  
  // Smooth transitions between phases
  if (phase === 'dawn') {
    const t = (timeDecimal - 5) / 1;
    color.lerpColors(colors.night, colors.dawn, t);
  } else if (phase === 'dusk') {
    const t = (timeDecimal - 17) / 1;
    color.lerpColors(colors.day, colors.dusk, t);
  }
  
  return color;
}

export function getAmbientIntensity(timeState: TimeState): number {
  const { phase } = timeState;
  switch (phase) {
    case 'night': return 0.15;
    case 'dawn': case 'dusk': return 0.3;
    case 'day': return 0.5;
    default: return 0.3;
  }
}

export default {
  createTimeState,
  updateTimeState,
  getSunPosition,
  getSunIntensity,
  getSunColor,
  getSkyColor,
  getFogColor,
  getAmbientIntensity,
};
