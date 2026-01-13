/**
 * Deterministic Combat System
 * All combat outcomes are determined by the seeded RNG
 */

import type { RNG } from '../../utils/src/rng';
import type { Player, Enemy, CombatAction, CombatResult, TurnState } from './types';

/**
 * Execute a combat action with deterministic results
 */
export function executeAction(
  action: CombatAction,
  player: Player,
  enemy: Enemy,
  turnState: TurnState,
  rng: RNG
): CombatResult {
  const result: CombatResult = {
    action,
    success: true,
    playerDamageDealt: 0,
    playerDamageTaken: 0,
    playerHealed: 0,
    enemyDefeated: false,
    critical: false,
    dodged: false,
    message: '',
    turnDefenseBonus: 0,
  };

  switch (action) {
    case 'attack':
      result.playerDamageDealt = calculateAttackDamage(player, enemy, rng);
      result.message = `Dealt ${result.playerDamageDealt} damage!`;
      break;

    case 'defend':
      result.turnDefenseBonus = 2;
      result.message = 'Raised defense for this turn!';
      break;

    case 'item':
      if (player.itemUsed) {
        result.success = false;
        result.message = 'Item already used this floor!';
      } else {
        result.playerHealed = 3;
        result.message = 'Used item, healed 3 HP!';
      }
      break;

    case 'risky':
      const riskySuccess = rng.chance(0.5);
      if (riskySuccess) {
        // Critical hit - 2x damage
        result.critical = true;
        result.playerDamageDealt = calculateAttackDamage(player, enemy, rng) * 2;
        result.message = `CRITICAL HIT! Dealt ${result.playerDamageDealt} damage!`;
      } else {
        // Self damage
        const selfDamage = Math.ceil(player.atk * 0.5);
        result.playerDamageTaken = selfDamage;
        result.message = `Risky move failed! Took ${selfDamage} self-damage!`;
      }
      break;
  }

  // Enemy counterattack (unless defending or already took self-damage)
  if (action !== 'defend' && result.playerDamageTaken === 0) {
    const enemyDamage = calculateEnemyDamage(enemy, player, turnState, rng);
    if (enemyDamage > 0) {
      result.playerDamageTaken = enemyDamage;
      result.message += ` Enemy attacks for ${enemyDamage}!`;
    } else {
      result.dodged = true;
      result.message += ' You dodged the attack!';
    }
  }

  // Check if enemy is defeated
  if (enemy.hp - result.playerDamageDealt <= 0) {
    result.enemyDefeated = true;
    result.message += ' Enemy defeated!';
  }

  return result;
}

/**
 * Calculate player attack damage
 */
function calculateAttackDamage(player: Player, enemy: Enemy, rng: RNG): number {
  const baseDamage = player.atk;
  // Small variance ±1
  const variance = rng.range(-1, 1);
  // Cover bonus
  const coverBonus = player.inCover ? 1 : 0;
  
  return Math.max(1, baseDamage + variance + coverBonus);
}

/**
 * Calculate enemy attack damage
 */
function calculateEnemyDamage(
  enemy: Enemy,
  player: Player,
  turnState: TurnState,
  rng: RNG
): number {
  // Check if player dodges
  if (rng.chance(player.dodgeChance)) {
    return 0;
  }

  const baseDamage = enemy.attack.power;
  const defense = player.defense + turnState.playerDefenseBonus;
  const coverReduction = player.inCover ? 1 : 0;

  return Math.max(0, baseDamage - defense - coverReduction);
}

/**
 * Apply combat result to player
 */
export function applyResultToPlayer(player: Player, result: CombatResult): Player {
  let newHp = player.hp - result.playerDamageTaken + result.playerHealed;
  newHp = Math.min(newHp, player.maxHp);
  newHp = Math.max(newHp, 0);

  return {
    ...player,
    hp: newHp,
    itemUsed: result.action === 'item' && result.success ? true : player.itemUsed,
  };
}

/**
 * Apply combat result to enemy
 */
export function applyResultToEnemy(enemy: Enemy, result: CombatResult): Enemy {
  return {
    ...enemy,
    hp: Math.max(0, enemy.hp - result.playerDamageDealt),
  };
}

/**
 * Check if player is alive
 */
export function isPlayerAlive(player: Player): boolean {
  return player.hp > 0;
}

/**
 * Check if enemy is alive
 */
export function isEnemyAlive(enemy: Enemy): boolean {
  return enemy.hp > 0;
}

/**
 * Create initial turn state
 */
export function createTurnState(): TurnState {
  return {
    turnNumber: 1,
    playerDefenseBonus: 0,
    enemyDefenseBonus: 0,
  };
}

/**
 * Advance turn state
 */
export function advanceTurn(turnState: TurnState, result: CombatResult): TurnState {
  return {
    turnNumber: turnState.turnNumber + 1,
    playerDefenseBonus: result.turnDefenseBonus,
    enemyDefenseBonus: 0,
  };
}
