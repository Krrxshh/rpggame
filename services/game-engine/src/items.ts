/**
 * Items & Inventory System
 * Potions, consumables, and inventory management
 * NEW FILE - extends game-engine
 */

import type { RNG } from '../../utils/src/rng';

// === TYPES ===

export type ItemType = 'consumable' | 'equipment' | 'material';
export type ConsumableEffect = 'heal' | 'attackBuff' | 'defenseBuff' | 'staminaRestore' | 'manaRestore';

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  stackable: boolean;
  maxStack: number;
  effect?: ConsumableEffect;
  effectValue?: number;
  effectDuration?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  slot: number;
}

export interface Inventory {
  items: InventoryItem[];
  maxSlots: number;
  quickSlots: (string | null)[]; // Item IDs in quick slots 1-4
}

export interface ItemUseResult {
  success: boolean;
  item: InventoryItem | null;
  effect: {
    heal?: number;
    attackBuff?: number;
    defenseBuff?: number;
    staminaRestore?: number;
    manaRestore?: number;
    duration?: number;
  };
  message: string;
}

// === ITEM DEFINITIONS ===

export const ITEMS: Record<string, ItemDefinition> = {
  // Potions
  healthPotion: {
    id: 'healthPotion',
    name: 'Health Potion',
    type: 'consumable',
    description: 'Restores 50 HP.',
    stackable: true,
    maxStack: 10,
    effect: 'heal',
    effectValue: 50,
    rarity: 'common',
  },
  greatHealthPotion: {
    id: 'greatHealthPotion',
    name: 'Great Health Potion',
    type: 'consumable',
    description: 'Restores 100 HP.',
    stackable: true,
    maxStack: 5,
    effect: 'heal',
    effectValue: 100,
    rarity: 'uncommon',
  },
  staminaElixir: {
    id: 'staminaElixir',
    name: 'Stamina Elixir',
    type: 'consumable',
    description: 'Restores 50 Stamina.',
    stackable: true,
    maxStack: 10,
    effect: 'staminaRestore',
    effectValue: 50,
    rarity: 'common',
  },
  
  // Buff potions
  attackPotion: {
    id: 'attackPotion',
    name: 'Berserker Brew',
    type: 'consumable',
    description: 'Increases attack by 20 for 30 seconds.',
    stackable: true,
    maxStack: 5,
    effect: 'attackBuff',
    effectValue: 20,
    effectDuration: 30,
    rarity: 'uncommon',
  },
  defensePotion: {
    id: 'defensePotion',
    name: 'Iron Skin Elixir',
    type: 'consumable',
    description: 'Increases defense by 15 for 30 seconds.',
    stackable: true,
    maxStack: 5,
    effect: 'defenseBuff',
    effectValue: 15,
    effectDuration: 30,
    rarity: 'uncommon',
  },
  
  // Rare potions
  mightyPotion: {
    id: 'mightyPotion',
    name: 'Potion of Might',
    type: 'consumable',
    description: 'Fully restores HP and grants +30 attack for 60 seconds.',
    stackable: true,
    maxStack: 3,
    effect: 'attackBuff',
    effectValue: 30,
    effectDuration: 60,
    rarity: 'rare',
  },
};

// === INVENTORY MANAGEMENT ===

export function createInventory(maxSlots: number = 20): Inventory {
  return {
    items: [],
    maxSlots,
    quickSlots: [null, null, null, null],
  };
}

export function addItemToInventory(
  inventory: Inventory,
  itemId: string,
  quantity: number = 1
): { inventory: Inventory; overflow: number } {
  const itemDef = ITEMS[itemId];
  if (!itemDef) {
    return { inventory, overflow: quantity };
  }
  
  const newInventory = { ...inventory, items: [...inventory.items] };
  let remaining = quantity;
  
  // Try to stack with existing items
  if (itemDef.stackable) {
    for (const item of newInventory.items) {
      if (item.itemId === itemId && item.quantity < itemDef.maxStack) {
        const canAdd = Math.min(remaining, itemDef.maxStack - item.quantity);
        item.quantity += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) break;
      }
    }
  }
  
  // Add to new slots
  while (remaining > 0 && newInventory.items.length < newInventory.maxSlots) {
    const addAmount = itemDef.stackable ? Math.min(remaining, itemDef.maxStack) : 1;
    newInventory.items.push({
      itemId,
      quantity: addAmount,
      slot: newInventory.items.length,
    });
    remaining -= addAmount;
  }
  
  return { inventory: newInventory, overflow: remaining };
}

export function removeItemFromInventory(
  inventory: Inventory,
  itemId: string,
  quantity: number = 1
): { inventory: Inventory; removed: number } {
  const newInventory = { ...inventory, items: [...inventory.items] };
  let toRemove = quantity;
  let removed = 0;
  
  for (let i = newInventory.items.length - 1; i >= 0 && toRemove > 0; i--) {
    const item = newInventory.items[i];
    if (item.itemId === itemId) {
      const removeAmount = Math.min(toRemove, item.quantity);
      item.quantity -= removeAmount;
      toRemove -= removeAmount;
      removed += removeAmount;
      
      if (item.quantity <= 0) {
        newInventory.items.splice(i, 1);
      }
    }
  }
  
  // Re-assign slot numbers
  newInventory.items.forEach((item, index) => {
    item.slot = index;
  });
  
  return { inventory: newInventory, removed };
}

export function getItemCount(inventory: Inventory, itemId: string): number {
  return inventory.items
    .filter(item => item.itemId === itemId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

// === QUICK SLOTS ===

export function setQuickSlot(
  inventory: Inventory,
  slotIndex: number,
  itemId: string | null
): Inventory {
  if (slotIndex < 0 || slotIndex >= 4) return inventory;
  
  const newQuickSlots = [...inventory.quickSlots];
  newQuickSlots[slotIndex] = itemId;
  
  return { ...inventory, quickSlots: newQuickSlots };
}

export function getQuickSlotItem(
  inventory: Inventory,
  slotIndex: number
): { itemDef: ItemDefinition | null; count: number } {
  if (slotIndex < 0 || slotIndex >= 4) return { itemDef: null, count: 0 };
  
  const itemId = inventory.quickSlots[slotIndex];
  if (!itemId) return { itemDef: null, count: 0 };
  
  const itemDef = ITEMS[itemId];
  const count = getItemCount(inventory, itemId);
  
  return { itemDef: itemDef || null, count };
}

// === ITEM USE ===

export function useItem(
  inventory: Inventory,
  itemId: string,
  currentHp: number,
  maxHp: number
): ItemUseResult {
  const itemDef = ITEMS[itemId];
  if (!itemDef) {
    return { success: false, item: null, effect: {}, message: 'Unknown item' };
  }
  
  if (itemDef.type !== 'consumable') {
    return { success: false, item: null, effect: {}, message: 'Item not consumable' };
  }
  
  const count = getItemCount(inventory, itemId);
  if (count <= 0) {
    return { success: false, item: null, effect: {}, message: 'No items remaining' };
  }
  
  // Calculate effect
  const effect: ItemUseResult['effect'] = {};
  
  switch (itemDef.effect) {
    case 'heal':
      const healAmount = Math.min(itemDef.effectValue || 0, maxHp - currentHp);
      effect.heal = healAmount;
      break;
    case 'attackBuff':
      effect.attackBuff = itemDef.effectValue;
      effect.duration = itemDef.effectDuration;
      // Also full heal for mighty potion
      if (itemId === 'mightyPotion') {
        effect.heal = maxHp - currentHp;
      }
      break;
    case 'defenseBuff':
      effect.defenseBuff = itemDef.effectValue;
      effect.duration = itemDef.effectDuration;
      break;
    case 'staminaRestore':
      effect.staminaRestore = itemDef.effectValue;
      break;
    case 'manaRestore':
      effect.manaRestore = itemDef.effectValue;
      break;
  }
  
  const invItem = inventory.items.find(i => i.itemId === itemId);
  
  return {
    success: true,
    item: invItem || null,
    effect,
    message: `Used ${itemDef.name}`,
  };
}

export function useQuickSlot(
  inventory: Inventory,
  slotIndex: number,
  currentHp: number,
  maxHp: number
): { result: ItemUseResult; inventory: Inventory } {
  const { itemDef, count } = getQuickSlotItem(inventory, slotIndex);
  
  if (!itemDef || count <= 0) {
    return {
      result: { success: false, item: null, effect: {}, message: 'Empty slot' },
      inventory,
    };
  }
  
  const result = useItem(inventory, itemDef.id, currentHp, maxHp);
  
  if (result.success) {
    const { inventory: newInventory } = removeItemFromInventory(inventory, itemDef.id, 1);
    return { result, inventory: newInventory };
  }
  
  return { result, inventory };
}

// === LOOT GENERATION ===

export function generateLoot(
  floorNumber: number,
  rng: RNG
): { itemId: string; quantity: number }[] {
  const loot: { itemId: string; quantity: number }[] = [];
  
  // Base drop chance
  const dropChance = 0.3 + floorNumber * 0.02;
  
  if (rng.chance(dropChance)) {
    // Common items
    if (rng.chance(0.6)) {
      loot.push({ itemId: 'healthPotion', quantity: rng.range(1, 3) });
    }
    if (rng.chance(0.4)) {
      loot.push({ itemId: 'staminaElixir', quantity: rng.range(1, 2) });
    }
    
    // Uncommon items (higher floors)
    if (floorNumber >= 3 && rng.chance(0.3)) {
      loot.push({ itemId: rng.pick(['attackPotion', 'defensePotion']), quantity: 1 });
    }
    if (floorNumber >= 5 && rng.chance(0.2)) {
      loot.push({ itemId: 'greatHealthPotion', quantity: 1 });
    }
    
    // Rare items (higher floors)
    if (floorNumber >= 10 && rng.chance(0.1)) {
      loot.push({ itemId: 'mightyPotion', quantity: 1 });
    }
  }
  
  return loot;
}

export default {
  ITEMS,
  createInventory,
  addItemToInventory,
  removeItemFromInventory,
  getItemCount,
  setQuickSlot,
  getQuickSlotItem,
  useItem,
  useQuickSlot,
  generateLoot,
};
