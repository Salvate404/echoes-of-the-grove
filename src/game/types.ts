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

export interface EnemyData {
  id: string;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  isBoss: boolean;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  lastAttack: number;
  dead: boolean;
  respawn?: boolean;
}

export interface HerbSpot {
  id: string;
  collected: boolean;
  x: number;
  z: number;
  mesh?: { visible: boolean };
}
