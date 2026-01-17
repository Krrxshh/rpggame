/**
 * Enhanced UI Components
 * CHANGELOG v1.0.0: Title screen, death screen, HUD
 * - Title: Typography, background VFX, seed + quality selector
 * - Death: Cinematic summary, retry, copy seed
 * - HUD: Health, stamina, quickslots, cooldowns, minimap
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// === STYLES ===

const styles = {
  // Title Screen
  titleContainer: {
    position: 'fixed' as const,
    inset: 0,
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Cinzel', 'Times New Roman', serif",
    color: '#e0d8c8',
    overflow: 'hidden',
  },
  titleBg: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(139, 69, 19, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(30, 60, 90, 0.2) 0%, transparent 50%)',
  },
  titleParticles: {
    position: 'absolute' as const,
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none' as const,
  },
  titleText: {
    fontSize: 'clamp(2rem, 8vw, 6rem)',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    textShadow: '0 0 40px rgba(255, 170, 80, 0.5), 0 4px 12px rgba(0,0,0,0.8)',
    marginBottom: '0.5em',
    zIndex: 1,
    background: 'linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #cc5500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
    letterSpacing: '0.3em',
    opacity: 0.7,
    marginBottom: '3em',
    zIndex: 1,
  },
  menuContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    alignItems: 'center',
    zIndex: 1,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    opacity: 0.8,
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0.8rem 1.5rem',
    color: '#e0d8c8',
    fontSize: '1rem',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
    width: '200px',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  select: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '0.8rem 1.5rem',
    color: '#e0d8c8',
    fontSize: '1rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
  },
  button: {
    background: 'linear-gradient(135deg, rgba(200,150,50,0.3) 0%, rgba(120,80,30,0.3) 100%)',
    border: '1px solid rgba(255,200,100,0.3)',
    borderRadius: '8px',
    padding: '1rem 3rem',
    color: '#ffd700',
    fontSize: '1.1rem',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1rem',
  },
  
  // Death Screen
  deathContainer: {
    position: 'fixed' as const,
    inset: 0,
    background: 'linear-gradient(180deg, rgba(20,0,0,0.95) 0%, rgba(40,10,10,0.98) 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Cinzel', 'Times New Roman', serif",
    color: '#cc8888',
    animation: 'fadeIn 1s ease-out',
  },
  deathTitle: {
    fontSize: 'clamp(2rem, 6vw, 4rem)',
    fontWeight: 700,
    color: '#aa2222',
    textShadow: '0 0 30px rgba(180,0,0,0.6)',
    marginBottom: '1em',
    letterSpacing: '0.2em',
  },
  deathStats: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '2em',
    textAlign: 'center' as const,
  },
  stat: {
    fontSize: '1rem',
    opacity: 0.8,
  },
  statValue: {
    fontSize: '1.2rem',
    color: '#ffaa88',
  },
  deathButtons: {
    display: 'flex',
    gap: '1rem',
  },
  
  // HUD
  hudContainer: {
    position: 'fixed' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    fontFamily: "'Rajdhani', system-ui, sans-serif",
  },
  healthBar: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '20px',
    width: '280px',
  },
  barBackground: {
    height: '20px',
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.15)',
  },
  barFill: (percent: number, color: string) => ({
    height: '100%',
    width: `${percent}%`,
    background: `linear-gradient(90deg, ${color} 0%, ${color}88 100%)`,
    transition: 'width 0.3s ease-out',
    boxShadow: `0 0 10px ${color}66`,
  }),
  barLabel: {
    position: 'absolute' as const,
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  quickSlots: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
  },
  quickSlot: (active: boolean, hasItem: boolean) => ({
    width: '50px',
    height: '50px',
    background: active ? 'rgba(255,200,100,0.3)' : hasItem ? 'rgba(100,100,100,0.4)' : 'rgba(50,50,50,0.4)',
    border: `2px solid ${active ? '#ffcc66' : hasItem ? '#666' : '#333'}`,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#fff',
    position: 'relative' as const,
  }),
  slotKey: {
    position: 'absolute' as const,
    top: '2px',
    left: '4px',
    fontSize: '10px',
    opacity: 0.6,
  },
  slotCount: {
    position: 'absolute' as const,
    bottom: '2px',
    right: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  cooldown: (percent: number) => ({
    position: 'absolute' as const,
    inset: 0,
    background: `conic-gradient(transparent ${percent}%, rgba(0,0,0,0.7) ${percent}%)`,
    borderRadius: '6px',
  }),
  minimap: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    width: '150px',
    height: '150px',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  minimapPlayer: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '8px',
    height: '8px',
    background: '#4488ff',
    borderRadius: '50%',
    boxShadow: '0 0 6px #4488ff',
  },
  bossHealth: {
    position: 'absolute' as const,
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '400px',
    textAlign: 'center' as const,
  },
  bossName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ff8866',
    marginBottom: '8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
};

// === TITLE SCREEN ===

interface TitleScreenProps {
  onStart: (seed: string, quality: string) => void;
  defaultSeed?: string;
}

export function TitleScreen({ onStart, defaultSeed = '' }: TitleScreenProps) {
  const [seed, setSeed] = useState(defaultSeed || String(Date.now()));
  const [quality, setQuality] = useState('medium');
  
  const handleStart = useCallback(() => {
    onStart(seed, quality);
  }, [seed, quality, onStart]);
  
  const randomizeSeed = useCallback(() => {
    setSeed(String(Date.now()));
  }, []);
  
  return (
    <div style={styles.titleContainer}>
      <div style={styles.titleBg} />
      
      {/* Floating particles */}
      <div style={styles.titleParticles}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              background: `rgba(255, ${150 + i * 5}, ${50 + i * 3}, ${0.3 + (i % 5) * 0.1})`,
              borderRadius: '50%',
              left: `${(i * 47) % 100}%`,
              top: `${(i * 31) % 100}%`,
              animation: `float ${3 + i % 3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      <h1 style={styles.titleText}>ENDLESS REALM</h1>
      <p style={styles.subtitle}>PROCEDURAL ACTION RPG</p>
      
      <div style={styles.menuContainer}>
        <div style={styles.inputGroup}>
          <span style={styles.label}>WORLD SEED</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={styles.input}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Enter seed..."
            />
            <button
              style={{ ...styles.select, padding: '0.8rem 1rem' }}
              onClick={randomizeSeed}
            >
              🎲
            </button>
          </div>
        </div>
        
        <div style={styles.inputGroup}>
          <span style={styles.label}>GRAPHICS QUALITY</span>
          <select
            style={styles.select}
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>
        
        <button style={styles.button} onClick={handleStart}>
          BEGIN JOURNEY
        </button>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-20px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        button:hover {
          filter: brightness(1.2);
          transform: scale(1.02);
        }
        input:focus, select:focus {
          border-color: rgba(255,200,100,0.5);
          box-shadow: 0 0 15px rgba(255,200,100,0.2);
        }
      `}</style>
    </div>
  );
}

// === DEATH SCREEN ===

interface DeathScreenProps {
  seed: string;
  enemiesDefeated: number;
  timePlayed: number; // seconds
  floorReached?: number;
  onRetry: () => void;
  onMainMenu: () => void;
}

export function DeathScreen({
  seed,
  enemiesDefeated,
  timePlayed,
  floorReached = 1,
  onRetry,
  onMainMenu,
}: DeathScreenProps) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(seed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [seed]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };
  
  return (
    <div style={styles.deathContainer}>
      <h1 style={styles.deathTitle}>YOU DIED</h1>
      
      <div style={styles.deathStats}>
        <p style={styles.stat}>
          Enemies Defeated: <span style={styles.statValue}>{enemiesDefeated}</span>
        </p>
        <p style={styles.stat}>
          Time Survived: <span style={styles.statValue}>{formatTime(timePlayed)}</span>
        </p>
        <p style={styles.stat}>
          World Seed: <span style={styles.statValue}>{seed}</span>
        </p>
      </div>
      
      <div style={styles.deathButtons}>
        <button style={styles.button} onClick={onRetry}>
          TRY AGAIN
        </button>
        <button style={styles.button} onClick={copyToClipboard}>
          {copied ? 'COPIED!' : 'COPY SEED'}
        </button>
        <button style={{ ...styles.button, opacity: 0.7 }} onClick={onMainMenu}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}

// === HUD ===

interface HUDProps {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana?: number;
  maxMana?: number;
  quickSlots: { icon: string; count: number; cooldown: number }[];
  skillSlots: { icon: string; cooldown: number; maxCooldown: number }[];
  bossName?: string;
  bossHp?: number;
  bossMaxHp?: number;
  playerPos?: { x: number; z: number };
  enemies?: { x: number; z: number }[];
  safeZones?: { x: number; z: number }[];
}

export function HUD({
  hp,
  maxHp,
  stamina,
  maxStamina,
  mana = 0,
  maxMana = 0,
  quickSlots,
  skillSlots,
  bossName,
  bossHp,
  bossMaxHp,
  playerPos,
  enemies = [],
  safeZones = [],
}: HUDProps) {
  const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const staminaPercent = maxStamina > 0 ? (stamina / maxStamina) * 100 : 0;
  const manaPercent = maxMana > 0 ? (mana / maxMana) * 100 : 0;
  
  return (
    <div style={styles.hudContainer}>
      {/* Health Bar */}
      <div style={styles.healthBar}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ position: 'relative', ...styles.barBackground }}>
            <div style={styles.barFill(hpPercent, '#cc4444')} />
            <span style={styles.barLabel}>{Math.ceil(hp)} / {maxHp}</span>
          </div>
        </div>
        
        {/* Stamina Bar */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ position: 'relative', ...styles.barBackground, height: '12px' }}>
            <div style={styles.barFill(staminaPercent, '#44aa44')} />
          </div>
        </div>
        
        {/* Mana Bar */}
        {maxMana > 0 && (
          <div>
            <div style={{ position: 'relative', ...styles.barBackground, height: '12px' }}>
              <div style={styles.barFill(manaPercent, '#4466cc')} />
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Slots */}
      <div style={styles.quickSlots}>
        {/* Skills 1-4 */}
        {skillSlots.map((slot, i) => {
          const cdPercent = slot.maxCooldown > 0 ? (1 - slot.cooldown / slot.maxCooldown) * 100 : 100;
          return (
            <div key={`skill-${i}`} style={styles.quickSlot(false, true)}>
              <span style={styles.slotKey}>{i + 1}</span>
              <span>{slot.icon}</span>
              {slot.cooldown > 0 && <div style={styles.cooldown(cdPercent)} />}
            </div>
          );
        })}
        
        <div style={{ width: '10px' }} />
        
        {/* Items 5-8 */}
        {quickSlots.map((slot, i) => (
          <div key={`item-${i}`} style={styles.quickSlot(false, slot.count > 0)}>
            <span style={styles.slotKey}>{i + 5}</span>
            <span>{slot.icon}</span>
            {slot.count > 0 && <span style={styles.slotCount}>{slot.count}</span>}
          </div>
        ))}
      </div>
      
      {/* Boss Health */}
      {bossName && bossHp !== undefined && bossMaxHp !== undefined && (
        <div style={styles.bossHealth}>
          <div style={styles.bossName}>{bossName}</div>
          <div style={{ ...styles.barBackground, height: '16px' }}>
            <div style={styles.barFill((bossHp / bossMaxHp) * 100, '#ff6644')} />
          </div>
        </div>
      )}
      
      {/* Minimap */}
      <div style={styles.minimap}>
        <div style={styles.minimapPlayer} />
        
        {/* Enemies */}
        {playerPos && enemies.map((enemy, i) => {
          const relX = (enemy.x - playerPos.x) * 2;
          const relZ = (enemy.z - playerPos.z) * 2;
          if (Math.abs(relX) > 70 || Math.abs(relZ) > 70) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `calc(50% + ${relX}px)`,
                top: `calc(50% + ${relZ}px)`,
                width: '4px',
                height: '4px',
                background: '#ff4444',
                borderRadius: '50%',
              }}
            />
          );
        })}
        
        {/* Safe zones */}
        {playerPos && safeZones.map((zone, i) => {
          const relX = (zone.x - playerPos.x) * 2;
          const relZ = (zone.z - playerPos.z) * 2;
          if (Math.abs(relX) > 70 || Math.abs(relZ) > 70) return null;
          return (
            <div
              key={`zone-${i}`}
              style={{
                position: 'absolute',
                left: `calc(50% + ${relX}px)`,
                top: `calc(50% + ${relZ}px)`,
                width: '8px',
                height: '8px',
                background: '#44ff44',
                borderRadius: '50%',
                opacity: 0.6,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// === DAMAGE FLASH ===

export function DamageFlash({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(180,0,0,0.4) 100%)',
        animation: 'damageFlash 0.3s ease-out forwards',
        zIndex: 200,
      }}
    >
      <style>{`
        @keyframes damageFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// === HEAL FLASH ===

export function HealFlash({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(80,200,80,0.3) 0%, transparent 70%)',
        animation: 'healFlash 0.5s ease-out forwards',
        zIndex: 200,
      }}
    >
      <style>{`
        @keyframes healFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default { TitleScreen, DeathScreen, HUD, DamageFlash, HealFlash };
