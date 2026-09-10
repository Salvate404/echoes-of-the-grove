import { drawSprite } from './sprites';

export const TILE_SIZE = 32;

export enum Tile {
  GRASS = 0,
  PATH = 1,
  TREE = 2,
  CORRUPT_TREE = 3,
  RUINS = 4,
  WATER = 5,
}

export const MAP_W = 60;
export const MAP_H = 80;

export interface Prop {
  type: 'campfire' | 'hut' | 'pillar' | 'heartstone';
  tx: number;
  ty: number;
}

export function isSolid(tile: Tile): boolean {
  return tile === Tile.TREE || tile === Tile.CORRUPT_TREE || tile === Tile.WATER;
}

export function buildMap(): { tiles: Tile[][]; props: Prop[] } {
  const tiles: Tile[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => Tile.GRASS)
  );

  // Ruins region (north)
  for (let y = 0; y < 22; y++) {
    for (let x = 0; x < MAP_W; x++) {
      tiles[y][x] = Tile.RUINS;
    }
  }

  // Path north-south through center
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 28; x <= 31; x++) {
      if (tiles[y][x] !== Tile.RUINS || y < 22) {
        tiles[y][x] = Tile.PATH;
      }
    }
  }

  // Corruption pool in ruins
  for (let y = 4; y < 10; y++) {
    for (let x = 24; x < 36; x++) {
      tiles[y][x] = Tile.WATER;
    }
  }
  tiles[8][29] = Tile.RUINS;
  tiles[8][30] = Tile.RUINS;

  // Scatter trees in grove (south)
  const treePositions: [number, number, boolean][] = [
    [8, 55, true], [12, 62, true], [18, 58, true], [22, 70, false],
    [35, 55, true], [42, 62, true], [48, 58, true], [50, 70, false],
    [10, 45, true], [50, 45, true], [15, 75, false], [45, 75, false],
    [5, 65, true], [54, 65, true], [20, 50, true], [40, 50, true],
    [8, 72, true], [52, 72, true], [25, 42, true], [35, 42, true],
    [6, 50, false], [53, 50, false], [30, 40, false],
  ];

  for (const [tx, ty, corrupt] of treePositions) {
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
      if (tiles[ty][tx] === Tile.GRASS) {
        tiles[ty][tx] = corrupt ? Tile.CORRUPT_TREE : Tile.TREE;
      }
    }
  }

  // Border trees
  for (let x = 0; x < MAP_W; x++) {
    tiles[MAP_H - 1][x] = Tile.TREE;
    tiles[MAP_H - 2][x] = x % 3 === 0 ? Tile.CORRUPT_TREE : Tile.TREE;
  }
  for (let y = 0; y < MAP_H; y++) {
    tiles[y][0] = Tile.TREE;
    tiles[y][MAP_W - 1] = Tile.TREE;
  }

  const props: Prop[] = [
    { type: 'campfire', tx: 25, ty: 67 },
    { type: 'hut', tx: 35, ty: 67 },
    { type: 'pillar', tx: 22, ty: 14 },
    { type: 'pillar', tx: 37, ty: 14 },
    { type: 'pillar', tx: 22, ty: 6 },
    { type: 'pillar', tx: 37, ty: 6 },
    { type: 'heartstone', tx: 29, ty: 8 },
  ];

  return { tiles, props };
}

export function tileAt(tiles: Tile[][], tx: number, ty: number): Tile {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return Tile.TREE;
  return tiles[ty][tx];
}

export function checkCollision(
  tiles: Tile[][],
  x: number,
  y: number,
  radius: number
): boolean {
  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];
  for (const [px, py] of points) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    if (isSolid(tileAt(tiles, tx, ty))) return true;
  }
  return false;
}

export function resolveMovement(
  tiles: Tile[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number
): { x: number; y: number } {
  let nx = x + dx;
  let ny = y;

  if (!checkCollision(tiles, nx, ny, radius)) {
    x = nx;
  } else {
    // Slide along X
    nx = x + dx * 0.5;
    if (!checkCollision(tiles, nx, ny, radius * 0.8)) x = nx;
  }

  ny = y + dy;
  if (!checkCollision(tiles, x, ny, radius)) {
    y = ny;
  } else {
    ny = y + dy * 0.5;
    if (!checkCollision(tiles, x, ny, radius * 0.8)) y = ny;
  }

  x = Math.max(radius, Math.min(MAP_W * TILE_SIZE - radius, x));
  y = Math.max(radius, Math.min(MAP_H * TILE_SIZE - radius, y));
  return { x, y };
}

const tileSprite: Record<Tile, 'grass' | 'path' | 'ruins' | 'water' | 'tree' | 'corrupt_tree'> = {
  [Tile.GRASS]: 'grass',
  [Tile.PATH]: 'path',
  [Tile.TREE]: 'tree',
  [Tile.CORRUPT_TREE]: 'corrupt_tree',
  [Tile.RUINS]: 'ruins',
  [Tile.WATER]: 'water',
};

export function drawMapLayer(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  props: Prop[],
  camX: number,
  camY: number,
  viewW: number,
  viewH: number
): void {
  const startTx = Math.max(0, Math.floor(camX / TILE_SIZE));
  const startTy = Math.max(0, Math.floor(camY / TILE_SIZE));
  const endTx = Math.min(MAP_W, Math.ceil((camX + viewW) / TILE_SIZE) + 1);
  const endTy = Math.min(MAP_H, Math.ceil((camY + viewH) / TILE_SIZE) + 1);

  for (let ty = startTy; ty < endTy; ty++) {
    for (let tx = startTx; tx < endTx; tx++) {
      const tile = tiles[ty][tx];
      const sx = tx * TILE_SIZE - camX;
      const sy = ty * TILE_SIZE - camY;
      drawSprite(ctx, tileSprite[tile], sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
    }
  }

  for (const prop of props) {
    const sx = prop.tx * TILE_SIZE + TILE_SIZE / 2 - camX;
    const sy = prop.ty * TILE_SIZE + TILE_SIZE / 2 - camY;
    if (sx > -40 && sx < viewW + 40 && sy > -40 && sy < viewH + 40) {
      drawSprite(ctx, prop.type, sx, sy);
    }
  }
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  playerX: number,
  playerY: number,
  npcs: { x: number; y: number; color: string }[],
  enemies: { x: number; y: number; boss?: boolean }[]
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scaleX = w / MAP_W;
  const scaleY = h / MAP_H;

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const tile = tiles[ty][tx];
      const colors: Record<Tile, string> = {
        [Tile.GRASS]: '#2d4a2d',
        [Tile.PATH]: '#4a4035',
        [Tile.TREE]: '#1a3a1a',
        [Tile.CORRUPT_TREE]: '#3a2050',
        [Tile.RUINS]: '#3a3530',
        [Tile.WATER]: '#2a4466',
      };
      ctx.fillStyle = colors[tile];
      ctx.fillRect(tx * scaleX, ty * scaleY, scaleX + 0.5, scaleY + 0.5);
    }
  }

  for (const npc of npcs) {
    const mx = (npc.x / (MAP_W * TILE_SIZE)) * w;
    const my = (npc.y / (MAP_H * TILE_SIZE)) * h;
    ctx.fillStyle = npc.color;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  for (const e of enemies) {
    const mx = (e.x / (MAP_W * TILE_SIZE)) * w;
    const my = (e.y / (MAP_H * TILE_SIZE)) * h;
    ctx.fillStyle = e.boss ? '#9933cc' : '#888';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  const px = (playerX / (MAP_W * TILE_SIZE)) * w;
  const py = (playerY / (MAP_H * TILE_SIZE)) * h;
  ctx.fillStyle = '#4488cc';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
}
