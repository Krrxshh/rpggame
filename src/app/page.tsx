'use client';

/**
 * Main Game Page - Complete Asset Integration
 * Uses real 3D models, day/night selection, full environment
 */

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useActionGameStore } from '../../services/state/src/actionGameStore';
import { useGameStore } from '../../services/state/src/game-store';
import { ActionHUD } from '../../services/ui/src/ActionHUD';
import { MainMenu } from '../../services/ui/src/MainMenu';
import { SettingsMenu } from '../../services/ui/src/SettingsMenu';
import { Minimap } from '../../services/ui/src/Minimap';
import { SettingsIcon } from '../../services/ui/src/Icons';

// Dynamic import for R3F (SSR disabled)
const CompleteGameScene = dynamic(
  () => import('../../services/renderer/src/CompleteGameScene').then(mod => mod.CompleteGameScene),
  { ssr: false, loading: () => <LoadingScreen /> }
);

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0505 0%, #150808 100%)',
      color: '#666',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading Assets...</div>
      <div style={{
        width: '200px',
        height: '4px',
        background: '#222',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, #cc4444, #ff6666)',
          animation: 'loading 1.5s ease-in-out infinite',
        }} />
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

export default function GamePage() {
  const actionStore = useActionGameStore();
  const gameStore = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  const phase = actionStore.phase !== 'menu' ? actionStore.phase : gameStore.phase;
  
  // Handle game start from main menu
  useEffect(() => {
    if (gameStore.phase === 'playing' && actionStore.phase === 'menu') {
      actionStore.startGame(gameStore.seed);
    }
  }, [gameStore.phase, gameStore.seed, actionStore]);
  
  // Track pointer lock
  useEffect(() => {
    const handleLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);
  
  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && actionStore.phase === 'playing') {
        setShowSettings(s => !s);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [actionStore.phase]);
  
  const isPlaying = phase === 'playing' || phase === 'transition' || phase === 'combat';
  
  const hudSkills = [
    { id: 'fireball', name: 'Fireball', cooldown: 0, maxCooldown: 2, type: 'magic' as const },
    { id: 'frostNova', name: 'Frost Nova', cooldown: 0, maxCooldown: 8, type: 'magic' as const },
    { id: 'powerStrike', name: 'Power Strike', cooldown: 0, maxCooldown: 4, type: 'strength' as const },
    { id: 'warCry', name: 'War Cry', cooldown: 0, maxCooldown: 20, type: 'strength' as const },
  ];
  
  const hudPotions = [
    { id: 'health', name: 'Health Potion', count: 3, slot: 0, type: 'health' as const },
    { id: 'stamina', name: 'Stamina Elixir', count: 2, slot: 1, type: 'stamina' as const },
  ];
  
  return (
    <main className="game-container">
      {/* Main Menu with time selection */}
      <MainMenu onTimeSelect={setTimeOfDay} />
      
      {/* Game Over Screen */}
      {actionStore.phase === 'gameover' && (
        <div className="gameover-overlay">
          <h1>YOU DIED</h1>
          <div className="stats">
            <p>Enemies Defeated: <strong>{actionStore.enemiesDefeated}</strong></p>
            <p>Bosses Slain: <strong>{actionStore.bossesDefeated}</strong></p>
          </div>
          <button onClick={() => { 
            actionStore.reset(); 
            gameStore.setPhase('menu'); 
          }}>
            Return to Menu
          </button>
        </div>
      )}
      
      {/* 3D Game with assets */}
      {isPlaying && (
        <>
          <CompleteGameScene timeOfDay={timeOfDay} />
          
          {/* Pointer lock hint */}
          {!isPointerLocked && (
            <div className="pointer-hint">
              Click to control camera
            </div>
          )}
          
          <ActionHUD
            hp={actionStore.player.hp}
            maxHp={actionStore.player.maxHp}
            stamina={actionStore.player.stamina}
            maxStamina={actionStore.player.maxStamina}
            floorNumber={actionStore.enemiesDefeated + 1}
            seed={actionStore.seed}
            enemiesDefeated={actionStore.enemiesDefeated}
            skills={actionStore.skillStates.map((s, i) => {
              const skillDef = require('../../services/game-engine/src/skills').SKILLS[s.skillId];
              return {
                id: s.skillId,
                name: s.skillId,
                cooldown: s.currentCooldown,
                maxCooldown: skillDef?.cooldown || 5,
                type: (i < 2 ? 'magic' : 'strength') as 'magic' | 'strength',
              };
            })}
            potions={[
              { id: 'health', name: 'Health Potion', count: actionStore.inventory.items.find(i => i.itemId === 'healthPotion')?.quantity || 0, slot: 0, type: 'health' as const },
              { id: 'stamina', name: 'Stamina Elixir', count: actionStore.inventory.items.find(i => i.itemId === 'staminaElixir')?.quantity || 0, slot: 1, type: 'stamina' as const },
            ]}
            isBlocking={actionStore.player.isBlocking}
            isDodging={actionStore.player.isDodging}
            isAttacking={actionStore.player.isAttacking}
          />
          
          <Minimap worldProgress={0} />
          
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={24} color="#888" />
          </button>
          
          {/* Time indicator */}
          <div className="time-indicator">
            {timeOfDay < 6 || timeOfDay > 18 ? '🌙' : timeOfDay < 8 ? '🌅' : timeOfDay > 16 ? '🌆' : '☀️'} 
            {timeOfDay}:00
          </div>
        </>
      )}
      
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      <style jsx>{`
        .game-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          background: #0a0a0a;
        }
        
        .gameover-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
        }
        
        .gameover-overlay h1 {
          font-size: 72px;
          color: #cc2222;
          margin: 0 0 30px 0;
          font-family: 'Times New Roman', serif;
          letter-spacing: 15px;
          text-shadow: 0 0 30px rgba(200, 50, 50, 0.5);
        }
        
        .stats {
          margin-bottom: 30px;
        }
        
        .gameover-overlay p {
          color: #888;
          margin: 10px 0;
          font-size: 18px;
        }
        
        .gameover-overlay strong {
          color: #cc8888;
          font-size: 24px;
        }
        
        .gameover-overlay button {
          margin-top: 20px;
          padding: 15px 50px;
          background: linear-gradient(135deg, #442222 0%, #331111 100%);
          border: 1px solid #663333;
          color: #cc8888;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Times New Roman', serif;
          letter-spacing: 3px;
        }
        
        .gameover-overlay button:hover {
          background: linear-gradient(135deg, #553333 0%, #442222 100%);
          color: #ffaaaa;
          transform: translateY(-2px);
        }
        
        .pointer-hint {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: #888;
          padding: 20px 40px;
          border-radius: 8px;
          font-size: 16px;
          pointer-events: none;
          z-index: 500;
          border: 1px solid #333;
        }
        
        .settings-btn {
          position: fixed;
          top: 20px;
          right: 280px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(100, 100, 100, 0.3);
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s;
        }
        
        .settings-btn:hover {
          background: rgba(50, 50, 50, 0.8);
        }
        
        .time-indicator {
          position: fixed;
          top: 20px;
          left: 200px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(100, 100, 100, 0.3);
          border-radius: 8px;
          padding: 8px 16px;
          color: #aaa;
          font-size: 14px;
          z-index: 100;
        }
      `}</style>
    </main>
  );
}
