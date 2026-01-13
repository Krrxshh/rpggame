'use client';

/**
 * Minimap Component with SVG Icons
 * 2D overview with player/enemy/boss dots
 * UPDATED - replaced emojis with SVG dots
 */

import { useMemo } from 'react';
import { useFloorStore } from '../../state/src/floor-store';
import { usePlayerStore } from '../../state/src/player-store';
import { useSettingsStore } from '../../state/src/game-store';
import { PlayerDotIcon, EnemyDotIcon, BossDotIcon } from './Icons';
import styles from './Minimap.module.css';

const MINIMAP_SIZE = 160;
const SCALE = 5;

interface MinimapEnemy {
  id: string;
  position: { x: number; y: number };
  type: 'minion' | 'elite' | 'boss';
  hp: number;
}

interface MinimapProps {
  enemies?: MinimapEnemy[];
  worldProgress?: number;
}

export function Minimap({ enemies = [], worldProgress = 0 }: MinimapProps) {
  const currentFloor = useFloorStore((state) => state.currentFloor);
  const enemy = useFloorStore((state) => state.enemy);
  const playerPosition = usePlayerStore((state) => state.position);
  const showMinimap = useSettingsStore((state) => state.showMinimap);
  
  const minimapData = useMemo(() => {
    if (!currentFloor) return null;
    
    const { arena, obstacles, hazards } = currentFloor;
    const center = MINIMAP_SIZE / 2;
    
    const scalePos = (x: number, y: number) => ({
      x: center + x * SCALE,
      y: center - y * SCALE,
    });
    
    return {
      arena,
      obstacles: obstacles.map(o => ({
        ...scalePos(o.position.x, o.position.y),
        width: (o.size.width || o.radius || 1) * SCALE * 2,
        height: (o.size.depth || o.radius || 1) * SCALE * 2,
      })),
      hazards: hazards.map(h => ({
        ...scalePos(h.position.x, h.position.y),
        radius: h.radius * SCALE,
      })),
      arenaRadius: arena.radius * SCALE,
      center,
    };
  }, [currentFloor]);
  
  if (!showMinimap || !minimapData || !currentFloor) return null;
  
  const playerPos = {
    x: minimapData.center + playerPosition.x * SCALE,
    y: minimapData.center - playerPosition.z * SCALE,
  };
  
  const enemyPos = enemy ? {
    x: minimapData.center + enemy.position.x * SCALE,
    y: minimapData.center - enemy.position.y * SCALE,
  } : null;
  
  return (
    <div className={styles.minimapContainer}>
      <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} className={styles.minimap}>
        {/* Arena Background */}
        <circle
          cx={minimapData.center}
          cy={minimapData.center}
          r={minimapData.arenaRadius}
          fill={currentFloor.palette.primary}
          fillOpacity={0.3}
          stroke={currentFloor.palette.accent}
          strokeWidth={2}
        />
        
        {/* Hazards */}
        {minimapData.hazards.map((hazard, i) => (
          <circle
            key={`hazard-${i}`}
            cx={hazard.x}
            cy={hazard.y}
            r={hazard.radius}
            fill={currentFloor.palette.hazard}
            fillOpacity={0.4}
          />
        ))}
        
        {/* Obstacles */}
        {minimapData.obstacles.map((obs, i) => (
          <rect
            key={`obs-${i}`}
            x={obs.x - obs.width / 2}
            y={obs.y - obs.height / 2}
            width={obs.width}
            height={obs.height}
            fill="#444"
            stroke="#666"
            strokeWidth={0.5}
          />
        ))}
        
        {/* Additional enemies */}
        {enemies.filter(e => e.hp > 0).map((e) => (
          <g key={e.id} transform={`translate(${minimapData.center + e.position.x * SCALE - 6}, ${minimapData.center - e.position.y * SCALE - 6})`}>
            {e.type === 'boss' ? (
              <BossDotIcon size={12} color="#ff8800" />
            ) : e.type === 'elite' ? (
              <EnemyDotIcon size={10} color="#ff6644" />
            ) : (
              <EnemyDotIcon size={8} color="#ff4444" />
            )}
          </g>
        ))}
        
        {/* Main enemy */}
        {enemyPos && enemy && enemy.hp > 0 && (
          <g transform={`translate(${enemyPos.x - 6}, ${enemyPos.y - 6})`}>
            <EnemyDotIcon size={12} color={currentFloor.palette.enemy} />
          </g>
        )}
        
        {/* Player */}
        <g transform={`translate(${playerPos.x - 6}, ${playerPos.y - 6})`}>
          <PlayerDotIcon size={12} color="#44ff88" />
        </g>
      </svg>
      
      <div className={styles.label}>
        <span>MAP</span>
        {worldProgress > 0 && <span className={styles.progress}>{Math.floor(worldProgress * 100)}%</span>}
      </div>
    </div>
  );
}

export default Minimap;
