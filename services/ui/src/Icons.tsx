/**
 * SVG Icons Component
 * Game icons as React components - no emojis
 */

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// === COMBAT ICONS ===

export function SwordIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 3L5 17M5 17H8M5 17V14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 7L17 9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 21L6 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function ShieldIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3L4 7V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V7L12 3Z" 
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function DashIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 4L19 12L13 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 4L11 12L5 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  );
}

// === SKILL ICONS ===

export function FireballIcon({ size = 24, color = '#ff6644', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="6" fill={color} opacity="0.3"/>
      <circle cx="12" cy="12" r="4" fill={color} opacity="0.6"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
      <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke={color} strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

export function FrostIcon({ size = 24, color = '#44aaff', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2V22M2 12H22M5 5L19 19M19 5L5 19" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" fill={color} opacity="0.3"/>
    </svg>
  );
}

export function PowerIcon({ size = 24, color = '#ffaa44', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L14 10H20L15 14L17 22L12 17L7 22L9 14L4 10H10L12 2Z" 
        fill={color} stroke={color} strokeWidth="1"/>
    </svg>
  );
}

export function BuffIcon({ size = 24, color = '#88ff88', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4L14 8L18 8L15 11L16 16L12 13L8 16L9 11L6 8L10 8L12 4Z" 
        fill={color} stroke={color} strokeWidth="1"/>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
    </svg>
  );
}

// === ITEM ICONS ===

export function PotionIcon({ size = 24, color = '#ff4444', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 3H15V6L18 12V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V12L9 6V3Z" 
        stroke={color} strokeWidth="2"/>
      <rect x="8" y="12" width="8" height="7" rx="1" fill={color} opacity="0.5"/>
      <rect x="10" y="3" width="4" height="2" fill={color}/>
    </svg>
  );
}

export function StaminaPotionIcon({ size = 24, color = '#44aacc', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 3H15V6L18 12V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V12L9 6V3Z" 
        stroke={color} strokeWidth="2"/>
      <rect x="8" y="12" width="8" height="7" rx="1" fill={color} opacity="0.5"/>
      <path d="M10 15L12 13L14 15" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

export function AttackPotionIcon({ size = 24, color = '#ff8844', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 3H15V6L18 12V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V12L9 6V3Z" 
        stroke={color} strokeWidth="2"/>
      <rect x="8" y="12" width="8" height="7" rx="1" fill={color} opacity="0.5"/>
      <path d="M12 13V17M10 15H14" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// === UI ICONS ===

export function HeartIcon({ size = 24, color = '#ff4444', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"/>
    </svg>
  );
}

export function LightningIcon({ size = 24, color = '#44aacc', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
    </svg>
  );
}

export function SkullIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="10" r="7" stroke={color} strokeWidth="2"/>
      <circle cx="9" cy="9" r="1.5" fill={color}/>
      <circle cx="15" cy="9" r="1.5" fill={color}/>
      <path d="M9 17V21M12 17V21M15 17V21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function CrosshairIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2"/>
      <path d="M12 4V8M12 16V20M4 12H8M16 12H20" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function SettingsIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
      <path d="M12 1V4M12 20V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H4M20 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" 
        stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function MapIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9 3V18M15 6V21" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function VolumeIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11 5L6 9H2V15H6L11 19V5Z" fill={color}/>
      <path d="M15 9C16.5 10 16.5 14 15 15M18 6C21 9 21 15 18 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// === MINIMAP ICONS ===

export function PlayerDotIcon({ size = 12, color = '#44ff88', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className={className}>
      <circle cx="6" cy="6" r="5" fill={color} stroke="#fff" strokeWidth="1"/>
      <path d="M6 2L6 6" stroke="#fff" strokeWidth="1.5"/>
    </svg>
  );
}

export function EnemyDotIcon({ size = 12, color = '#ff4444', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className={className}>
      <circle cx="6" cy="6" r="4" fill={color}/>
    </svg>
  );
}

export function BossDotIcon({ size = 16, color = '#ff8800', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
      <polygon points="8,1 10,6 15,6 11,9 13,15 8,11 3,15 5,9 1,6 6,6" fill={color}/>
    </svg>
  );
}

export default {
  SwordIcon,
  ShieldIcon,
  DashIcon,
  FireballIcon,
  FrostIcon,
  PowerIcon,
  BuffIcon,
  PotionIcon,
  HeartIcon,
  LightningIcon,
  SkullIcon,
  CrosshairIcon,
  SettingsIcon,
  MapIcon,
};
