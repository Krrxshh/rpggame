'use client';

/**
 * Action Buttons Component
 * Combat action selection UI
 */

import { useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { usePlayerStore } from '../../state/src/player-store';
import { useFloorStore } from '../../state/src/floor-store';
import { useGameStore } from '../../state/src/game-store';
import { executeAction, applyResultToEnemy } from '../../game-engine/src/combat';
import type { CombatAction, Player } from '../../game-engine/src/types';
import styles from './ActionButtons.module.css';

interface SpawnParticlesFunc {
  (position: THREE.Vector3, count: number, color: string, speed?: number): void;
}

export function ActionButtons() {
  // Select individual properties to avoid infinite loop
  const hp = usePlayerStore((state) => state.hp);
  const maxHp = usePlayerStore((state) => state.maxHp);
  const atk = usePlayerStore((state) => state.atk);
  const defense = usePlayerStore((state) => state.defense);
  const dodgeChance = usePlayerStore((state) => state.dodgeChance);
  const position = usePlayerStore((state) => state.position);
  const itemUsed = usePlayerStore((state) => state.itemUsed);
  const inCover = usePlayerStore((state) => state.inCover);
  const takeDamage = usePlayerStore((state) => state.takeDamage);
  const heal = usePlayerStore((state) => state.heal);
  const setPlayerItemUsed = usePlayerStore((state) => state.useItem);
  
  // Memoize player object for combat
  const player = useMemo((): Player => ({
    hp,
    maxHp,
    atk,
    defense,
    dodgeChance,
    position,
    itemUsed,
    inCover,
  }), [hp, maxHp, atk, defense, dodgeChance, position, itemUsed, inCover]);
  
  const enemy = useFloorStore((state) => state.enemy);
  const turnState = useFloorStore((state) => state.turnState);
  const setEnemy = useFloorStore((state) => state.setEnemy);
  const advanceFloorTurn = useFloorStore((state) => state.advanceTurn);
  const addCombatLog = useFloorStore((state) => state.addCombatLog);
  
  const gamePhase = useGameStore((state) => state.phase);
  const getRng = useGameStore((state) => state.getRng);
  const advanceFloor = useGameStore((state) => state.advanceFloor);
  const defeatedEnemy = useGameStore((state) => state.defeatedEnemy);
  const gameOver = useGameStore((state) => state.gameOver);
  
  const handleAction = useCallback((action: CombatAction) => {
    if (!enemy || enemy.hp <= 0 || hp <= 0) return;
    
    try {
      const rng = getRng();
      
      // Execute combat action
      const result = executeAction(action, player, enemy, turnState, rng);
      
      // Apply results
      if (result.playerDamageDealt > 0) {
        const newEnemy = applyResultToEnemy(enemy, result);
        setEnemy(newEnemy);
        
        // Spawn hit particles
        if (typeof window !== 'undefined') {
          const spawnParticles = (window as unknown as { spawnParticles?: SpawnParticlesFunc }).spawnParticles;
          if (spawnParticles) {
            spawnParticles(
              new THREE.Vector3(enemy.position.x, 0.8, enemy.position.y),
              result.critical ? 20 : 10,
              enemy.color,
              result.critical ? 4 : 2
            );
          }
        }
        
        // Check victory
        if (newEnemy.hp <= 0) {
          defeatedEnemy();
          addCombatLog('🎉 Enemy defeated! Advancing to next floor...');
          setTimeout(() => advanceFloor(), 1500);
          return;
        }
      }
      
      if (result.playerDamageTaken > 0) {
        takeDamage(result.playerDamageTaken);
        
        // Check game over
        if (hp - result.playerDamageTaken <= 0) {
          addCombatLog('💀 You have been defeated!');
          setTimeout(() => gameOver(false), 1500);
          return;
        }
      }
      
      if (result.playerHealed > 0 && result.success) {
        heal(result.playerHealed);
        setPlayerItemUsed();
      }
      
      // Add to combat log
      addCombatLog(result.message);
      
      // Advance turn
      advanceFloorTurn(result.turnDefenseBonus);
      
    } catch (error) {
      console.error('Combat action error:', error);
    }
  }, [enemy, player, hp, turnState, getRng, setEnemy, takeDamage, heal, setPlayerItemUsed, addCombatLog, advanceFloorTurn, defeatedEnemy, advanceFloor, gameOver]);
  
  const isDisabled = !enemy || enemy.hp <= 0 || hp <= 0 || gamePhase !== 'playing';
  
  return (
    <div className={styles.actionButtons}>
      <button
        className={`${styles.button} ${styles.attack}`}
        onClick={() => handleAction('attack')}
        disabled={isDisabled}
      >
        <span className={styles.icon}>⚔️</span>
        <span className={styles.label}>Attack</span>
        <span className={styles.hint}>Deal {atk} damage</span>
      </button>
      
      <button
        className={`${styles.button} ${styles.defend}`}
        onClick={() => handleAction('defend')}
        disabled={isDisabled}
      >
        <span className={styles.icon}>🛡️</span>
        <span className={styles.label}>Defend</span>
        <span className={styles.hint}>+2 defense this turn</span>
      </button>
      
      <button
        className={`${styles.button} ${styles.item}`}
        onClick={() => handleAction('item')}
        disabled={isDisabled || itemUsed}
      >
        <span className={styles.icon}>💊</span>
        <span className={styles.label}>Item</span>
        <span className={styles.hint}>
          {itemUsed ? 'Already used' : 'Heal 3 HP'}
        </span>
      </button>
      
      <button
        className={`${styles.button} ${styles.risky}`}
        onClick={() => handleAction('risky')}
        disabled={isDisabled}
      >
        <span className={styles.icon}>🎲</span>
        <span className={styles.label}>Risky</span>
        <span className={styles.hint}>50% crit / 50% self-damage</span>
      </button>
    </div>
  );
}

export default ActionButtons;
