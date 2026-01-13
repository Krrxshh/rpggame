/**
 * Weather System
 * Rain, fog, wetness effects
 * NEW FILE
 */

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm';

export interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  wetness: number; // 0-1, accumulates during rain
  cloudCoverage: number; // 0-1
  fogDensity: number;
  windSpeed: number;
  windDirection: number; // radians
  transitionProgress: number; // 0-1, for smooth transitions
  targetType: WeatherType;
}

export interface WeatherConfig {
  rainAccumulationRate: number; // Wetness per second during rain
  dryingRate: number; // Wetness decrease per second when clear
  transitionDuration: number; // Seconds to transition between weather
}

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  rainAccumulationRate: 0.1,
  dryingRate: 0.02,
  transitionDuration: 30,
};

const WEATHER_PARAMS: Record<WeatherType, {
  cloudCoverage: number;
  fogDensity: number;
  windSpeed: number;
}> = {
  clear: { cloudCoverage: 0.1, fogDensity: 0.02, windSpeed: 1 },
  cloudy: { cloudCoverage: 0.6, fogDensity: 0.04, windSpeed: 3 },
  rain: { cloudCoverage: 0.85, fogDensity: 0.08, windSpeed: 5 },
  storm: { cloudCoverage: 1.0, fogDensity: 0.12, windSpeed: 10 },
};

export function createWeatherState(): WeatherState {
  return {
    type: 'clear',
    intensity: 0,
    wetness: 0,
    cloudCoverage: 0.1,
    fogDensity: 0.02,
    windSpeed: 1,
    windDirection: 0,
    transitionProgress: 1,
    targetType: 'clear',
  };
}

export function updateWeatherState(
  state: WeatherState,
  deltaSeconds: number,
  config: WeatherConfig
): WeatherState {
  const newState = { ...state };
  
  // Handle weather transition
  if (state.transitionProgress < 1) {
    newState.transitionProgress = Math.min(1, state.transitionProgress + deltaSeconds / config.transitionDuration);
    
    const currentParams = WEATHER_PARAMS[state.type];
    const targetParams = WEATHER_PARAMS[state.targetType];
    const t = newState.transitionProgress;
    
    newState.cloudCoverage = lerp(currentParams.cloudCoverage, targetParams.cloudCoverage, t);
    newState.fogDensity = lerp(currentParams.fogDensity, targetParams.fogDensity, t);
    newState.windSpeed = lerp(currentParams.windSpeed, targetParams.windSpeed, t);
    
    if (newState.transitionProgress >= 1) {
      newState.type = state.targetType;
    }
  }
  
  // Update intensity based on weather type
  const isRaining = state.type === 'rain' || state.type === 'storm' || 
    (state.transitionProgress < 1 && (state.targetType === 'rain' || state.targetType === 'storm'));
  
  if (isRaining) {
    newState.intensity = state.type === 'storm' ? 1.0 : 0.6;
    newState.wetness = Math.min(1, state.wetness + config.rainAccumulationRate * deltaSeconds);
  } else {
    newState.intensity = Math.max(0, state.intensity - 0.1 * deltaSeconds);
    newState.wetness = Math.max(0, state.wetness - config.dryingRate * deltaSeconds);
  }
  
  // Animate wind direction slowly
  newState.windDirection = state.windDirection + deltaSeconds * 0.05;
  
  return newState;
}

export function requestWeather(
  state: WeatherState,
  type: WeatherType
): WeatherState {
  if (state.type === type && state.targetType === type) {
    return state;
  }
  
  return {
    ...state,
    targetType: type,
    transitionProgress: 0,
  };
}

export function getWetnessRoughnessModifier(wetness: number): number {
  // Wet surfaces are smoother (lower roughness)
  return 1 - wetness * 0.4;
}

export function getWetnessMetalnessModifier(wetness: number): number {
  // Wet surfaces appear slightly more metallic due to specular
  return wetness * 0.2;
}

export function getRainParticleCount(state: WeatherState): number {
  if (state.type === 'clear' || state.type === 'cloudy') return 0;
  if (state.type === 'storm') return 5000;
  return Math.floor(state.intensity * 3000);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default {
  createWeatherState,
  updateWeatherState,
  requestWeather,
  getWetnessRoughnessModifier,
  getWetnessMetalnessModifier,
  getRainParticleCount,
};
