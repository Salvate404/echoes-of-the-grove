export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
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
  respawn: boolean;
}

export class PlayerEntity {
  x: number;
  y: number;
  dir: Direction = 'down';
  radius = 10;
  attackTimer = 0;
  invincibleTimer = 0;
  isAttacking = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  spriteName(): `player_${Direction}` {
    return `player_${this.dir}`;
  }
}

export class EnemyEntity {
  data: EnemyData;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hitFlash = 0;

  constructor(id: string, x: number, y: number, opts: Partial<EnemyData> = {}) {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.data = {
      id,
      hp: opts.hp ?? 30,
      maxHp: opts.maxHp ?? opts.hp ?? 30,
      damage: opts.damage ?? 8,
      speed: opts.speed ?? 70,
      isBoss: opts.isBoss ?? false,
      aggroRange: opts.aggroRange ?? 140,
      attackRange: opts.attackRange ?? 28,
      attackCooldown: opts.attackCooldown ?? 1.2,
      lastAttack: 0,
      dead: false,
      respawn: opts.respawn ?? !opts.isBoss,
    };
  }

  takeDamage(amount: number): boolean {
    if (this.data.dead) return false;
    this.data.hp -= amount;
    this.hitFlash = 0.15;
    if (this.data.hp <= 0) {
      this.data.dead = true;
      this.data.hp = 0;
      return true;
    }
    return false;
  }
}

export class NPCEntity {
  id: string;
  name: string;
  x: number;
  y: number;

  constructor(id: string, name: string, tx: number, ty: number, tileSize: number) {
    this.id = id;
    this.name = name;
    this.x = tx * tileSize + tileSize / 2;
    this.y = ty * tileSize + tileSize / 2;
  }
}

export interface HerbSpot {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}

export function createHerbs(): HerbSpot[] {
  const spots: [string, number, number][] = [
    ['h1', 15, 58],
    ['h2', 45, 55],
    ['h3', 12, 68],
    ['h4', 48, 68],
    ['h5', 30, 52],
  ];
  return spots.map(([id, tx, ty]) => ({
    id,
    x: tx * 32 + 16,
    y: ty * 32 + 16,
    collected: false,
  }));
}

export function createWolves(): EnemyEntity[] {
  const positions: [string, number, number][] = [
    ['wolf1', 14, 55],
    ['wolf2', 44, 52],
    ['wolf3', 22, 48],
    ['wolf4', 38, 60],
    ['wolf5', 16, 62],
  ];
  return positions.map(([id, tx, ty]) =>
    new EnemyEntity(id, tx * 32 + 16, ty * 32 + 16, { hp: 30, maxHp: 30, damage: 8, speed: 75 })
  );
}

export function createBoss(x: number, y: number): EnemyEntity {
  return new EnemyEntity('boss', x, y, {
    hp: 150,
    maxHp: 150,
    damage: 15,
    speed: 55,
    isBoss: true,
    aggroRange: 200,
    attackRange: 36,
    attackCooldown: 1.5,
    respawn: false,
  });
}

export function getAttackHitbox(
  player: PlayerEntity
): { x: number; y: number; w: number; h: number } {
  const reach = 28;
  const size = 24;
  switch (player.dir) {
    case 'down':
      return { x: player.x - size / 2, y: player.y + 4, w: size, h: reach };
    case 'up':
      return { x: player.x - size / 2, y: player.y - reach - 4, w: size, h: reach };
    case 'left':
      return { x: player.x - reach - 4, y: player.y - size / 2, w: reach, h: size };
    case 'right':
      return { x: player.x + 4, y: player.y - size / 2, w: reach, h: size };
  }
}

export function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  bx: number,
  by: number,
  br: number
): boolean {
  const closestX = Math.max(a.x, Math.min(bx, a.x + a.w));
  const closestY = Math.max(a.y, Math.min(by, a.y + a.h));
  const dx = bx - closestX;
  const dy = by - closestY;
  return dx * dx + dy * dy < br * br;
}
