'use client';

/**
 * HUD Component
 * Heads-up display showing HP, floor, and game info
 */

import { usePlayerStore } from '../../state/src/player-store';
import { useFloorStore } from '../../state/src/floor-store';
import { useGameStore } from '../../state/src/game-store';
import styles from './HUD.module.css';

export function HUD() {
  const playerHp = usePlayerStore((state) => state.hp);
  const playerMaxHp = usePlayerStore((state) => state.maxHp);
  const itemUsed = usePlayerStore((state) => state.itemUsed);
  
  const enemy = useFloorStore((state) => state.enemy);
  const turnNumber = useFloorStore((state) => state.turnState?.turnNumber ?? 1);
  const combatLog = useFloorStore((state) => state.combatLog);
  
  const floorNumber = useGameStore((state) => state.floorNumber);
  const seed = useGameStore((state) => state.seed);
  const totalDefeated = useGameStore((state) => state.totalEnemiesDefeated);
  
  const playerHpPercent = playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0;
  const enemyHpPercent = enemy && enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
  
  const getHpBarColor = (percent: number) => {
    if (percent > 60) return '#44ff88';
    if (percent > 30) return '#ffaa44';
    return '#ff4444';
  };
  
  const seedDisplay = seed ? seed.slice(0, 8) : '';
  
  return (
    <div className={styles.hud}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        {/* Player Info */}
        <div className={styles.playerInfo}>
          <div className={styles.label}>PLAYER</div>
          <div className={styles.hpBar}>
            <div 
              className={styles.hpFill}
              style={{ 
                width: `${playerHpPercent}%`,
                backgroundColor: getHpBarColor(playerHpPercent)
              }}
            />
            <span className={styles.hpText}>{playerHp}/{playerMaxHp}</span>
          </div>
          <div className={styles.itemStatus}>
            Item: {itemUsed ? '❌ Used' : '✅ Ready'}
          </div>
        </div>
        
        {/* Floor Info */}
        <div className={styles.floorInfo}>
          <div className={styles.floorNumber}>FLOOR {floorNumber}</div>
          <div className={styles.turnNumber}>Turn {turnNumber}</div>
          <div className={styles.seed}>Seed: {seedDisplay}...</div>
        </div>
        
        {/* Enemy Info */}
        <div className={styles.enemyInfo}>
          <div className={styles.label}>{enemy?.name || 'ENEMY'}</div>
          <div className={styles.hpBar}>
            <div 
              className={styles.hpFillEnemy}
              style={{ 
                width: `${enemyHpPercent}%`,
              }}
            />
            <span className={styles.hpText}>
              {enemy?.hp ?? 0}/{enemy?.maxHp ?? 0}
            </span>
          </div>
          {enemy && (
            <div className={styles.enemyStats}>
              ATK: {enemy.attack.power} | {enemy.behavior.toUpperCase()}
            </div>
          )}
        </div>
      </div>
      
      {/* Combat Log */}
      <div className={styles.combatLog}>
        {combatLog.slice(-3).map((log, i) => (
          <div key={i} className={styles.logEntry}>
            {log}
          </div>
        ))}
      </div>
      
      {/* Stats */}
      <div className={styles.stats}>
        <span>Enemies Defeated: {totalDefeated}</span>
      </div>
    </div>
  );
}

export default HUD;
