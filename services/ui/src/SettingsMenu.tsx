'use client';

/**
 * Settings Menu Component
 * Sensitivity, invert Y, graphics quality
 */

import { useState } from 'react';
import { useSettingsStore } from '../../state/src/game-store';
import { SettingsIcon, VolumeIcon } from './Icons';
import styles from './SettingsMenu.module.css';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const settings = useSettingsStore();
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.overlay}>
      <div className={styles.menu}>
        <div className={styles.header}>
          <SettingsIcon size={24} color="#888" />
          <h2>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.section}>
          <h3>Controls</h3>
          
          <div className={styles.setting}>
            <label>Mouse Sensitivity</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={settings.sensitivity || 1}
              onChange={(e) => settings.setSensitivity?.(parseFloat(e.target.value))}
            />
            <span>{(settings.sensitivity || 1).toFixed(1)}</span>
          </div>
          
          <div className={styles.setting}>
            <label>Invert Y Axis</label>
            <button
              className={`${styles.toggle} ${settings.invertY ? styles.on : ''}`}
              onClick={() => settings.setInvertY?.(!settings.invertY)}
            >
              {settings.invertY ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        
        <div className={styles.section}>
          <h3>Graphics</h3>
          
          <div className={styles.setting}>
            <label>Quality</label>
            <select
              value={settings.graphicsQuality || 'medium'}
              onChange={(e) => settings.setGraphicsQuality?.(e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className={styles.setting}>
            <label>Show Minimap</label>
            <button
              className={`${styles.toggle} ${settings.showMinimap ? styles.on : ''}`}
              onClick={() => settings.setShowMinimap?.(!settings.showMinimap)}
            >
              {settings.showMinimap ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        
        <div className={styles.section}>
          <h3><VolumeIcon size={16} color="#888" /> Audio</h3>
          
          <div className={styles.setting}>
            <label>Master Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.masterVolume ?? 0.7}
              onChange={(e) => settings.setMasterVolume?.(parseFloat(e.target.value))}
            />
            <span>{Math.round((settings.masterVolume ?? 0.7) * 100)}%</span>
          </div>
          
          <div className={styles.setting}>
            <label>SFX Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.sfxVolume ?? 0.8}
              onChange={(e) => settings.setSfxVolume?.(parseFloat(e.target.value))}
            />
            <span>{Math.round((settings.sfxVolume ?? 0.8) * 100)}%</span>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsMenu;
