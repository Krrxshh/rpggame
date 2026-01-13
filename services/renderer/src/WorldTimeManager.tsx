'use client';

/**
 * World Time Manager - React component
 * Manages day/night cycle, weather, and provides context
 * NEW FILE
 */

import { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createTimeState,
  updateTimeState,
  getSunPosition,
  getSunIntensity,
  getSunColor,
  getSkyColor,
  getFogColor,
  getAmbientIntensity,
  DEFAULT_CONFIG as DAY_CONFIG,
  type TimeState,
} from './DayNightCycle';
import {
  createWeatherState,
  updateWeatherState,
  requestWeather,
  DEFAULT_WEATHER_CONFIG,
  type WeatherState,
  type WeatherType,
} from './WeatherSystem';

interface WorldTimeContextType {
  time: TimeState;
  weather: WeatherState;
  setTimeOfDay: (hour: number) => void;
  advanceTime: (hours: number) => void;
  setWeather: (type: WeatherType) => void;
  isPaused: boolean;
  setPaused: (paused: boolean) => void;
}

const WorldTimeContext = createContext<WorldTimeContextType | null>(null);

export function useWorldTime() {
  const ctx = useContext(WorldTimeContext);
  if (!ctx) throw new Error('useWorldTime must be used within WorldTimeProvider');
  return ctx;
}

interface WorldTimeProviderProps {
  children: React.ReactNode;
  initialHour?: number;
  timeScale?: number;
}

export function WorldTimeProvider({ children, initialHour = 10, timeScale = 1 }: WorldTimeProviderProps) {
  const [time, setTime] = useState(() => createTimeState(initialHour));
  const [weather, setWeatherState] = useState(() => createWeatherState());
  const [isPaused, setIsPaused] = useState(false);
  
  const config = { ...DAY_CONFIG, timeScale };
  
  // Update time and weather each frame
  useFrame((_, delta) => {
    if (isPaused) return;
    
    setTime(prev => updateTimeState(prev, delta / 60, config)); // delta in seconds, divide by 60 for minutes
    setWeatherState(prev => updateWeatherState(prev, delta, DEFAULT_WEATHER_CONFIG));
  });
  
  const setTimeOfDay = useCallback((hour: number) => {
    setTime(createTimeState(hour));
  }, []);
  
  const advanceTime = useCallback((hours: number) => {
    setTime(prev => updateTimeState(prev, hours * 60 * config.timeScale, config));
  }, [config]);
  
  const setWeather = useCallback((type: WeatherType) => {
    setWeatherState(prev => requestWeather(prev, type));
  }, []);
  
  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);
  
  return (
    <WorldTimeContext.Provider value={{ time, weather, setTimeOfDay, advanceTime, setWeather, isPaused, setPaused }}>
      {children}
    </WorldTimeContext.Provider>
  );
}

// Lighting component that responds to day/night
export function DynamicLighting() {
  const { time, weather } = useWorldTime();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  useFrame(() => {
    if (!sunRef.current || !ambientRef.current) return;
    
    const sunPos = getSunPosition(time);
    sunRef.current.position.copy(sunPos);
    
    const baseIntensity = getSunIntensity(time);
    const weatherDim = 1 - weather.cloudCoverage * 0.6;
    sunRef.current.intensity = baseIntensity * weatherDim;
    
    const sunColor = getSunColor(time);
    sunRef.current.color.copy(sunColor);
    
    ambientRef.current.intensity = getAmbientIntensity(time) * (0.5 + weather.cloudCoverage * 0.3);
  });
  
  return (
    <>
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <ambientLight ref={ambientRef} />
    </>
  );
}

// Dynamic sky and fog
export function DynamicSkyFog() {
  const { time, weather } = useWorldTime();
  const { scene } = require('@react-three/fiber').useThree();
  
  useFrame(() => {
    const skyColor = getSkyColor(time);
    const fogColor = getFogColor(time);
    
    // Blend with weather
    if (weather.cloudCoverage > 0.5) {
      skyColor.lerp(new THREE.Color(0x555566), weather.cloudCoverage - 0.5);
      fogColor.lerp(new THREE.Color(0x444455), weather.cloudCoverage - 0.5);
    }
    
    scene.background = skyColor;
    
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(fogColor, 0.05);
      const targetDensity = 0.02 + weather.fogDensity;
      scene.fog.density += (targetDensity - scene.fog.density) * 0.02;
    } else {
      scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.02 + weather.fogDensity);
    }
  });
  
  return null;
}

export default WorldTimeProvider;
