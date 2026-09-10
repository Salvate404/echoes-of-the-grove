import { Game } from './game/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const game = new Game(canvas);

// Prevent context menu on long press (mobile)
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

export { game };
