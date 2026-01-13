'use client';

/**
 * Action RPG HUD Component
 * Health, stamina, skills, potions with SVG icons
 * UPDATED - removed emojis, added SVG icons
 */

import { HeartIcon, LightningIcon, SwordIcon, ShieldIcon, DashIcon, PotionIcon, FireballIcon, FrostIcon, PowerIcon, BuffIcon } from './Icons';
import styles from './ActionHUD.module.css';

interface SkillInfo {
  id: string;
  name: string;
  cooldown: number;
  maxCooldown: number;
  type: 'magic' | 'strength';
}

interface PotionInfo {
  id: string;
  name: string;
  count: number;
  slot: number;
  type: 'health' | 'stamina' | 'attack' | 'defense';
}

interface ActionHUDProps {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  floorNumber: number;
  seed: string;
  enemiesDefeated: number;
  skills: SkillInfo[];
  potions: PotionInfo[];
  isBlocking: boolean;
  isDodging: boolean;
  isAttacking: boolean;
}

const SKILL_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  fireball: FireballIcon,
  frostNova: FrostIcon,
  powerStrike: PowerIcon,
  warCry: BuffIcon,
};

const POTION_COLORS: Record<string, string> = {
  health: '#ff4444',
  stamina: '#44aacc',
  attack: '#ff8844',
  defense: '#4488ff',
};

export function ActionHUD({
  hp,
  maxHp,
  stamina,
  maxStamina,
  floorNumber,
  seed,
  enemiesDefeated,
  skills,
  potions,
  isBlocking,
  isDodging,
  isAttacking,
}: ActionHUDProps) {
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const staminaPercent = Math.max(0, (stamina / maxStamina) * 100);
  
  const getHpColor = (p: number) => p > 60 ? '#44cc44' : p > 30 ? '#ccaa44' : '#cc4444';
  
  const copySeed = () => {
    navigator.clipboard.writeText(seed);
  };
  
  return (
    <div className={styles.hud}>
      {/* Health & Stamina Bars */}
      <div className={styles.bars}>
        <div className={styles.barContainer}>
          <HeartIcon size={18} color={getHpColor(hpPercent)} />
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${hpPercent}%`, background: getHpColor(hpPercent) }} />
            <span className={styles.barText}>{hp}/{maxHp}</span>
          </div>
        </div>
        <div className={styles.barContainer}>
          <LightningIcon size={18} color="#44aacc" />
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${staminaPercent}%`, background: '#44aacc' }} />
            <span className={styles.barText}>{Math.floor(stamina)}/{maxStamina}</span>
          </div>
        </div>
      </div>
      
      {/* Status Indicators */}
      <div className={styles.status}>
        {isBlocking && <div className={styles.statusItem}><ShieldIcon size={28} color="#4488ff" /></div>}
        {isDodging && <div className={styles.statusItem}><DashIcon size={28} color="#88ff88" /></div>}
        {isAttacking && <div className={styles.statusItem}><SwordIcon size={28} color="#ff8844" /></div>}
      </div>
      
      {/* Skills */}
      <div className={styles.skills}>
        {skills.map((skill, i) => {
          const Icon = SKILL_ICONS[skill.id] || PowerIcon;
          const onCooldown = skill.cooldown > 0;
          return (
            <div key={skill.id} className={`${styles.skill} ${onCooldown ? styles.skillCooldown : ''}`}>
              <div className={styles.skillKey}>{i + 1}</div>
              <Icon size={28} color={onCooldown ? '#666' : skill.type === 'magic' ? '#88aaff' : '#ffaa88'} />
              {onCooldown && (
                <div className={styles.cooldownOverlay}>
                  {Math.ceil(skill.cooldown)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Potions */}
      <div className={styles.potions}>
        {potions.map((pot) => (
          <div key={pot.slot} className={styles.potion}>
            <div className={styles.potionKey}>{pot.slot + 5}</div>
            <PotionIcon size={24} color={POTION_COLORS[pot.type] || '#888'} />
            <div className={styles.potionCount}>{pot.count}</div>
          </div>
        ))}
      </div>
      
      {/* Info */}
      <div className={styles.info}>
        <div className={styles.floorBadge}>Floor {floorNumber}</div>
        <div className={styles.killCount}>
          <SwordIcon size={14} color="#888" /> {enemiesDefeated}
        </div>
        <button className={styles.seedBtn} onClick={copySeed} title="Copy seed">
          {seed.slice(0, 8)}...
        </button>
      </div>
      
      {/* Controls Hint */}
      <div className={styles.controls}>
        <span>WASD</span>
        <span>Space Dodge</span>
        <span>LMB Attack</span>
        <span>RMB Block</span>
        <span>1-4 Skills</span>
        <span>5-8 Items</span>
      </div>
    </div>
  );
}

export default ActionHUD;
