import fs from "node:fs";
import path from "node:path";
import { JINN_HOME } from "../shared/paths.js";
import { logger } from "../shared/logger.js";

const STATE_FILE = path.join(JINN_HOME, "office-state.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: "desk" | "room" | "wall";
  sprite: string; // CSS colour or emoji for v1
}

export interface Decoration {
  id: string;          // unique placement ID
  itemId: string;      // references StoreItem.id
  room: string;        // department/room ID
  owner: string;       // employee name who placed it
  x: number;           // relative x position (0-100 percentage)
  y: number;           // relative y position (0-100 percentage)
  placedAt: string;    // ISO date
}

export interface Wallet {
  balance: number;
  totalEarned: number;
  lastUpdated: string;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface OfficeState {
  wallets: Record<string, Wallet>;              // employee name → wallet
  inventory: Record<string, InventoryItem[]>;   // employee name → items
  decorations: Decoration[];
  version: number;
}

// ---------------------------------------------------------------------------
// Default store catalog (hardcoded for v1)
// ---------------------------------------------------------------------------

export const STORE_CATALOG: StoreItem[] = [
  // Desk items
  { id: "plant-small", name: "Small Plant", description: "A tiny desk succulent", cost: 5, category: "desk", sprite: "🌱" },
  { id: "plant-medium", name: "Potted Plant", description: "A leafy desk plant", cost: 10, category: "desk", sprite: "🪴" },
  { id: "coffee-mug", name: "Coffee Mug", description: "Essential for productivity", cost: 3, category: "desk", sprite: "☕" },
  { id: "rubber-duck", name: "Rubber Duck", description: "Debug companion", cost: 8, category: "desk", sprite: "🦆" },
  { id: "desk-lamp", name: "Desk Lamp", description: "Warm ambient lighting", cost: 15, category: "desk", sprite: "💡" },
  { id: "monitor-extra", name: "Extra Monitor", description: "More screens, more productivity", cost: 50, category: "desk", sprite: "🖥️" },
  { id: "nameplate", name: "Nameplate", description: "A fancy desk nameplate", cost: 12, category: "desk", sprite: "📛" },
  { id: "photo-frame", name: "Photo Frame", description: "A small picture frame", cost: 7, category: "desk", sprite: "🖼️" },
  { id: "stress-ball", name: "Stress Ball", description: "Squeeze away the bugs", cost: 4, category: "desk", sprite: "🔴" },
  { id: "headset", name: "Gaming Headset", description: "For 'meetings'", cost: 25, category: "desk", sprite: "🎧" },

  // Room items
  { id: "rug-small", name: "Small Rug", description: "Cozy floor covering", cost: 20, category: "room", sprite: "🟫" },
  { id: "rug-large", name: "Large Rug", description: "Premium floor rug", cost: 40, category: "room", sprite: "🟧" },
  { id: "whiteboard", name: "Whiteboard", description: "For brainstorming sessions", cost: 30, category: "room", sprite: "📋" },
  { id: "coffee-machine", name: "Coffee Machine", description: "Department caffeine supply", cost: 60, category: "room", sprite: "☕" },
  { id: "bookshelf", name: "Bookshelf", description: "Knowledge storage unit", cost: 35, category: "room", sprite: "📚" },
  { id: "bean-bag", name: "Bean Bag", description: "Casual seating", cost: 25, category: "room", sprite: "🫘" },
  { id: "standing-desk", name: "Standing Desk", description: "For the health-conscious", cost: 45, category: "room", sprite: "🪜" },
  { id: "mini-fridge", name: "Mini Fridge", description: "Cold drinks on demand", cost: 40, category: "room", sprite: "🧊" },

  // Wall items
  { id: "poster-motivational", name: "Motivational Poster", description: "Hang in there!", cost: 8, category: "wall", sprite: "🖼️" },
  { id: "poster-cat", name: "Cat Poster", description: "Because internet", cost: 10, category: "wall", sprite: "🐱" },
  { id: "clock", name: "Wall Clock", description: "Time is money", cost: 15, category: "wall", sprite: "🕐" },
  { id: "diploma", name: "Diploma", description: "Proof of excellence", cost: 20, category: "wall", sprite: "📜" },
  { id: "dartboard", name: "Dartboard", description: "Stress relief target", cost: 18, category: "wall", sprite: "🎯" },
  { id: "neon-sign", name: "Neon Sign", description: "Cool vibes only", cost: 35, category: "wall", sprite: "✨" },
  { id: "trophy-case", name: "Trophy Case", description: "Display achievements", cost: 50, category: "wall", sprite: "🏆" },
];

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function defaultState(): OfficeState {
  return {
    wallets: {},
    inventory: {},
    decorations: [],
    version: 1,
  };
}

export function loadOfficeState(): OfficeState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(raw) as OfficeState;
    }
  } catch (err) {
    logger.warn(`Failed to load office state: ${err}`);
  }
  return defaultState();
}

export function saveOfficeState(state: OfficeState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    logger.error(`Failed to save office state: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Wallet operations
// ---------------------------------------------------------------------------

export function getWallet(state: OfficeState, employee: string): Wallet {
  if (!state.wallets[employee]) {
    state.wallets[employee] = { balance: 0, totalEarned: 0, lastUpdated: new Date().toISOString() };
  }
  return state.wallets[employee];
}

export function creditCoins(state: OfficeState, employee: string, amount: number): Wallet {
  const wallet = getWallet(state, employee);
  wallet.balance += amount;
  wallet.totalEarned += amount;
  wallet.lastUpdated = new Date().toISOString();
  return wallet;
}

export function debitCoins(state: OfficeState, employee: string, amount: number): boolean {
  const wallet = getWallet(state, employee);
  if (wallet.balance < amount) return false;
  wallet.balance -= amount;
  wallet.lastUpdated = new Date().toISOString();
  return true;
}

// ---------------------------------------------------------------------------
// Token-to-coin conversion
// ---------------------------------------------------------------------------

const TOKENS_PER_COIN = 1000;

/** Convert tokens used in a session to coins. Call after session completes. */
export function convertTokensToCoins(state: OfficeState, employee: string, tokensUsed: number): number {
  const coins = Math.floor(tokensUsed / TOKENS_PER_COIN);
  if (coins > 0) {
    creditCoins(state, employee, coins);
    saveOfficeState(state);
  }
  return coins;
}

// ---------------------------------------------------------------------------
// Inventory operations
// ---------------------------------------------------------------------------

export function getInventory(state: OfficeState, employee: string): InventoryItem[] {
  if (!state.inventory[employee]) {
    state.inventory[employee] = [];
  }
  return state.inventory[employee];
}

export function addToInventory(state: OfficeState, employee: string, itemId: string, quantity = 1): void {
  const inv = getInventory(state, employee);
  const existing = inv.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    inv.push({ itemId, quantity });
  }
}

export function removeFromInventory(state: OfficeState, employee: string, itemId: string): boolean {
  const inv = getInventory(state, employee);
  const idx = inv.findIndex((i) => i.itemId === itemId);
  if (idx === -1 || inv[idx].quantity <= 0) return false;
  inv[idx].quantity -= 1;
  if (inv[idx].quantity <= 0) inv.splice(idx, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export function purchaseItem(
  state: OfficeState,
  employee: string,
  itemId: string,
): { success: boolean; error?: string } {
  const item = STORE_CATALOG.find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Item not found" };

  if (!debitCoins(state, employee, item.cost)) {
    return { success: false, error: "Insufficient coins" };
  }

  addToInventory(state, employee, itemId);
  saveOfficeState(state);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Decorations
// ---------------------------------------------------------------------------

export function placeDecoration(
  state: OfficeState,
  itemId: string,
  room: string,
  owner: string,
  x: number,
  y: number,
): { success: boolean; error?: string; decoration?: Decoration } {
  // Must have item in inventory
  if (!removeFromInventory(state, owner, itemId)) {
    return { success: false, error: "Item not in inventory" };
  }

  const decoration: Decoration = {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    room,
    owner,
    x,
    y,
    placedAt: new Date().toISOString(),
  };

  state.decorations.push(decoration);
  saveOfficeState(state);
  return { success: true, decoration };
}

export function removeDecoration(
  state: OfficeState,
  decorationId: string,
  requestedBy: string,
): { success: boolean; error?: string } {
  const idx = state.decorations.findIndex((d) => d.id === decorationId);
  if (idx === -1) return { success: false, error: "Decoration not found" };

  const dec = state.decorations[idx];
  // Return item to owner's inventory
  addToInventory(state, dec.owner, dec.itemId);
  state.decorations.splice(idx, 1);
  saveOfficeState(state);
  return { success: true };
}
