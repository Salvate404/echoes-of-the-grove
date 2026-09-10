export type GamePhase = 'title' | 'playing' | 'dialogue' | 'inventory' | 'map' | 'victory' | 'defeat';

export interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progress?: number;
  target?: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  speed: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}
