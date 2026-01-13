'use client';

/**
 * Main Menu with Day/Night Toggle
 * UPDATED - added time of day selection
 */

import { useState } from 'react';
import { useGameStore } from '../../state/src/game-store';
import { SwordIcon, ShieldIcon, PotionIcon, SkullIcon, SettingsIcon } from './Icons';
import styles from './MainMenu.module.css';

interface MainMenuProps {
  onTimeSelect?: (hour: number) => void;
}

export function MainMenu({ onTimeSelect }: MainMenuProps) {
  const [seedInput, setSeedInput] = useState('');
  const [selectedTime, setSelectedTime] = useState(12);
  const startGame = useGameStore((state) => state.startGame);
  const highScore = useGameStore((state) => state.highScore);
  const gamePhase = useGameStore((state) => state.phase);
  
  const handleStart = () => {
    onTimeSelect?.(selectedTime);
    startGame(seedInput.trim() || Date.now().toString());
  };
  
  const handleRandomSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setSeedInput(randomSeed);
  };
  
  const timePresets = [
    { label: 'Dawn', hour: 6, icon: '🌅', color: '#ffa060' },
    { label: 'Day', hour: 12, icon: '☀️', color: '#ffee44' },
    { label: 'Dusk', hour: 18, icon: '🌆', color: '#ff6040' },
    { label: 'Night', hour: 0, icon: '🌙', color: '#4466aa' },
  ];
  
  if (gamePhase !== 'menu') return null;
  
  return (
    <div className={styles.menu}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <SkullIcon size={48} color="#cc2222" />
        </div>
        
        {/* Title */}
        <h1 className={styles.title}>
          <span className={styles.titleMain}>ABYSS</span>
          <span className={styles.titleSub}>Endless Descent</span>
        </h1>
        
        <p className={styles.subtitle}>
          Into darkness, we descend...
        </p>
        
        {/* Time of Day Selection */}
        <div className={styles.timeSection}>
          <label className={styles.label}>Time of Day</label>
          <div className={styles.timeButtons}>
            {timePresets.map(preset => (
              <button
                key={preset.hour}
                className={`${styles.timeBtn} ${selectedTime === preset.hour ? styles.timeBtnActive : ''}`}
                onClick={() => setSelectedTime(preset.hour)}
                style={{ borderColor: selectedTime === preset.hour ? preset.color : undefined }}
              >
                <span className={styles.timeIcon}>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Seed Input */}
        <div className={styles.seedSection}>
          <label className={styles.label}>Soul Signature</label>
          <div className={styles.inputRow}>
            <input
              type="text"
              className={styles.seedInput}
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="Enter your fate..."
              maxLength={20}
            />
            <button 
              className={styles.randomBtn}
              onClick={handleRandomSeed}
              title="Random destiny"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="14" y="4" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="4" y="14" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Start Button */}
        <button className={styles.startButton} onClick={handleStart}>
          <SwordIcon size={20} color="#cc8888" />
          <span>Begin Descent</span>
        </button>
        
        {/* High Score */}
        {highScore > 0 && (
          <div className={styles.highScore}>
            <SkullIcon size={16} color="#8a6060" />
            <span>Enemies Defeated: {highScore}</span>
          </div>
        )}
        
        {/* Controls */}
        <div className={styles.controls}>
          <h3>
            <SettingsIcon size={14} color="#5a4040" />
            <span>Controls</span>
          </h3>
          <ul>
            <li><strong>WASD</strong> — Move</li>
            <li><strong>Mouse</strong> — Look (click to lock)</li>
            <li><strong>Left Click</strong> — Attack</li>
            <li><strong>Right Click</strong> — Block</li>
            <li><strong>Space</strong> — Dodge</li>
            <li><strong>Shift</strong> — Sprint</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.bgDecor} />
    </div>
  );
}

export default MainMenu;
