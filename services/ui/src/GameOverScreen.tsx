'use client';

/**
 * Game Over Screen Component
 * Victory and defeat screens
 */

import { useGameStore } from '../../state/src/game-store';
import { usePlayerStore } from '../../state/src/player-store';
import { useFloorStore } from '../../state/src/floor-store';
import styles from './GameOverScreen.module.css';

export function GameOverScreen() {
  const gamePhase = useGameStore((state) => state.phase);
  const floorNumber = useGameStore((state) => state.floorNumber);
  const seed = useGameStore((state) => state.seed);
  const totalDefeated = useGameStore((state) => state.totalEnemiesDefeated);
  const returnToMenu = useGameStore((state) => state.returnToMenu);
  const startGame = useGameStore((state) => state.startGame);
  
  const resetPlayer = usePlayerStore((state) => state.reset);
  const resetFloor = useFloorStore((state) => state.reset);
  
  if (gamePhase !== 'gameover' && gamePhase !== 'victory') return null;
  
  const isVictory = gamePhase === 'victory';
  
  const handlePlayAgain = () => {
    resetPlayer();
    resetFloor();
    startGame(seed); // Replay with same seed
  };
  
  const handleNewGame = () => {
    resetPlayer();
    resetFloor();
    returnToMenu();
  };
  
  return (
    <div className={`${styles.screen} ${isVictory ? styles.victory : styles.defeat}`}>
      <div className={styles.content}>
        {/* Title */}
        <h1 className={styles.title}>
          {isVictory ? '🎉 VICTORY!' : '💀 GAME OVER'}
        </h1>
        
        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Floor Reached</span>
            <span className={styles.statValue}>{floorNumber}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Enemies Defeated</span>
            <span className={styles.statValue}>{totalDefeated}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Seed</span>
            <span className={styles.statSeed}>{seed}</span>
          </div>
        </div>
        
        {/* Quote */}
        <p className={styles.quote}>
          {isVictory 
            ? 'You conquered the infinite arena!'
            : 'The arena claims another warrior...'}
        </p>
        
        {/* Buttons */}
        <div className={styles.buttons}>
          <button className={styles.replayBtn} onClick={handlePlayAgain}>
            🔄 Replay (Same Seed)
          </button>
          <button className={styles.menuBtn} onClick={handleNewGame}>
            🏠 New Game
          </button>
        </div>
        
        {/* Share hint */}
        <p className={styles.shareHint}>
          Share seed <strong>{seed}</strong> with friends to challenge them!
        </p>
      </div>
    </div>
  );
}

export default GameOverScreen;
