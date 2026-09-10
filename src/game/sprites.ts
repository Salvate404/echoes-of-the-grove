/** Procedural pixel-art sprites drawn to offscreen canvases */

export type SpriteName =
  | 'player_down'
  | 'player_up'
  | 'player_left'
  | 'player_right'
  | 'tree'
  | 'corrupt_tree'
  | 'grass'
  | 'path'
  | 'ruins'
  | 'water'
  | 'herb'
  | 'wolf'
  | 'boss'
  | 'elder'
  | 'healer'
  | 'heartstone'
  | 'campfire'
  | 'hut'
  | 'pillar'
  | 'slash';

const cache = new Map<SpriteName, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = 1
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function drawPlayer(ctx: CanvasRenderingContext2D, facing: 'down' | 'up' | 'left' | 'right'): void {
  // Body
  px(ctx, 7, 8, '#4488cc', 2);
  px(ctx, 6, 10, '#336699', 4);
  px(ctx, 7, 6, '#ffcc99', 2);
  px(ctx, 6, 5, '#553322', 4); // hair
  px(ctx, 7, 7, '#221100', 1); // eyes
  px(ctx, 8, 7, '#221100', 1);
  // Legs
  px(ctx, 7, 14, '#223355', 1);
  px(ctx, 9, 14, '#223355', 1);
  // Sword arm varies by direction
  if (facing === 'down') {
    px(ctx, 11, 10, '#aaaacc', 1);
    px(ctx, 12, 11, '#aaaacc', 1);
  } else if (facing === 'up') {
    px(ctx, 5, 10, '#aaaacc', 1);
    px(ctx, 4, 9, '#aaaacc', 1);
  } else if (facing === 'left') {
    px(ctx, 4, 10, '#aaaacc', 1);
    px(ctx, 3, 11, '#aaaacc', 1);
    px(ctx, 2, 12, '#aaaacc', 1);
  } else {
    px(ctx, 12, 10, '#aaaacc', 1);
    px(ctx, 13, 11, '#aaaacc', 1);
    px(ctx, 14, 12, '#aaaacc', 1);
  }
}

function buildSprite(name: SpriteName): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(32, 32);

  switch (name) {
    case 'player_down':
    case 'player_up':
    case 'player_left':
    case 'player_right':
      drawPlayer(ctx, name.replace('player_', '') as 'down' | 'up' | 'left' | 'right');
      break;

    case 'grass':
      ctx.fillStyle = '#3a6b3a';
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 8; i++) {
        px(ctx, (i * 5 + 2) % 30, (i * 7 + 3) % 28, i % 2 ? '#458545' : '#2f5a2f');
      }
      break;

    case 'path':
      ctx.fillStyle = '#6b5a45';
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 6; i++) {
        px(ctx, (i * 6) % 28, (i * 4 + 2) % 28, '#5a4a38');
      }
      break;

    case 'ruins':
      ctx.fillStyle = '#5a5550';
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 10; i++) {
        px(ctx, (i * 4) % 30, (i * 5) % 30, '#4a4540');
      }
      break;

    case 'water':
      ctx.fillStyle = '#2a4466';
      ctx.fillRect(0, 0, 32, 32);
      px(ctx, 4, 6, '#3a5588');
      px(ctx, 14, 12, '#3a5588');
      px(ctx, 22, 20, '#3a5588');
      break;

    case 'tree':
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 32, 32);
      px(ctx, 14, 18, '#5a3a20', 4);
      px(ctx, 15, 14, '#5a3a20', 2);
      for (let y = 4; y < 18; y++) {
        const w = y < 8 ? 3 : y < 12 ? 5 : 7;
        px(ctx, 16 - Math.floor(w / 2), y, '#2a7a2a', w);
      }
      px(ctx, 13, 6, '#3a9a3a', 2);
      break;

    case 'corrupt_tree':
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 32, 32);
      px(ctx, 14, 18, '#3a2030', 4);
      for (let y = 4; y < 18; y++) {
        const w = y < 8 ? 3 : y < 12 ? 5 : 7;
        px(ctx, 16 - Math.floor(w / 2), y, '#5a2080', w);
      }
      px(ctx, 12, 8, '#8844cc', 2);
      px(ctx, 18, 12, '#6622aa', 1);
      break;

    case 'herb':
      px(ctx, 15, 20, '#338844', 2);
      px(ctx, 14, 18, '#44cc66');
      px(ctx, 16, 17, '#55ee77');
      px(ctx, 15, 16, '#88ff99');
      px(ctx, 14, 14, '#aaffaa', 2);
      break;

    case 'wolf':
      px(ctx, 8, 14, '#666677', 6);
      px(ctx, 18, 14, '#666677', 6);
      px(ctx, 10, 10, '#555566', 8);
      px(ctx, 12, 8, '#444455', 4);
      px(ctx, 11, 9, '#ff2222');
      px(ctx, 14, 9, '#ff2222');
      px(ctx, 9, 7, '#555566', 2);
      px(ctx, 16, 7, '#555566', 2);
      px(ctx, 20, 12, '#666677', 3);
      break;

    case 'boss':
      px(ctx, 4, 10, '#6622aa', 10);
      px(ctx, 6, 6, '#9933cc', 8);
      px(ctx, 8, 4, '#aa44ee', 6);
      px(ctx, 10, 8, '#ff2222');
      px(ctx, 14, 8, '#ff2222');
      px(ctx, 8, 12, '#440066', 4);
      px(ctx, 18, 14, '#6622aa', 6);
      px(ctx, 2, 16, '#6622aa', 4);
      px(ctx, 20, 18, '#6622aa', 4);
      break;

    case 'elder':
      px(ctx, 10, 8, '#ffcc99', 4);
      px(ctx, 9, 7, '#cccccc', 6);
      px(ctx, 8, 12, '#5a4a8a', 6);
      px(ctx, 7, 14, '#4a3a7a', 8);
      px(ctx, 6, 18, '#3a2a6a', 4);
      px(ctx, 18, 12, '#6a5a3a', 2);
      px(ctx, 19, 10, '#6a5a3a', 1);
      break;

    case 'healer':
      px(ctx, 10, 8, '#ffcc99', 4);
      px(ctx, 10, 7, '#664422', 4);
      px(ctx, 8, 12, '#6a9a5a', 6);
      px(ctx, 7, 14, '#5a8a4a', 8);
      px(ctx, 11, 11, '#88cc88', 2);
      break;

    case 'heartstone':
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#8844cc';
      ctx.beginPath();
      ctx.moveTo(16, 6);
      ctx.lineTo(24, 16);
      ctx.lineTo(16, 26);
      ctx.lineTo(8, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#aa66ff';
      ctx.beginPath();
      ctx.moveTo(16, 10);
      ctx.lineTo(20, 16);
      ctx.lineTo(16, 22);
      ctx.lineTo(12, 16);
      ctx.closePath();
      ctx.fill();
      break;

    case 'campfire':
      px(ctx, 14, 20, '#5a3a20', 4);
      px(ctx, 13, 16, '#ff6622');
      px(ctx, 15, 15, '#ffaa33');
      px(ctx, 14, 14, '#ffdd55');
      break;

    case 'hut':
      px(ctx, 6, 16, '#6a4a3a', 12);
      px(ctx, 8, 10, '#5a3a2a', 8);
      ctx.fillStyle = '#5a3a2a';
      ctx.beginPath();
      ctx.moveTo(4, 16);
      ctx.lineTo(16, 6);
      ctx.lineTo(28, 16);
      ctx.closePath();
      ctx.fill();
      px(ctx, 14, 18, '#3a2a1a', 4);
      break;

    case 'pillar':
      px(ctx, 10, 8, '#7a7570', 6);
      px(ctx, 9, 6, '#8a8580', 8);
      px(ctx, 10, 4, '#9a9590', 6);
      break;

    case 'slash':
      ctx.strokeStyle = 'rgba(255,255,200,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 16, 14, -0.8, 0.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
  }

  return c;
}

export function getSprite(name: SpriteName): HTMLCanvasElement {
  if (!cache.has(name)) cache.set(name, buildSprite(name));
  return cache.get(name)!;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  x: number,
  y: number,
  scale = 1
): void {
  const spr = getSprite(name);
  const w = spr.width * scale;
  const h = spr.height * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
}
