import { GameState } from './state';
import { InputManager } from './input';
import { UIManager } from './ui';
import {
  MAP_W,
  MAP_H,
  TILE_SIZE,
  buildMap,
  resolveMovement,
  drawMapLayer,
  type Prop,
  type Tile,
} from './map';
import {
  PlayerEntity,
  EnemyEntity,
  NPCEntity,
  createHerbs,
  createWolves,
  createBoss,
  getAttackHitbox,
  aabbOverlap,
  type HerbSpot,
  type Direction,
} from './entities';
import { drawSprite, getSprite } from './sprites';
import type { DialogueLine, FloatingText } from './types';

const SPAWN_TX = 30;
const SPAWN_TY = 72;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private animId = 0;

  private state = new GameState();
  private input = new InputManager();
  private ui = new UIManager('ui-root');

  private mapData = buildMap();
  private tiles: Tile[][] = this.mapData.tiles;
  private props: Prop[] = this.mapData.props;

  private player = new PlayerEntity(
    SPAWN_TX * TILE_SIZE + TILE_SIZE / 2,
    SPAWN_TY * TILE_SIZE + TILE_SIZE / 2
  );
  private npcs: NPCEntity[] = [
    new NPCEntity('elder', 'Ancião Thalen', 26, 68, TILE_SIZE),
    new NPCEntity('healer', 'Curandeira Mira', 34, 68, TILE_SIZE),
  ];
  private enemies: EnemyEntity[] = createWolves();
  private herbs: HerbSpot[] = createHerbs();
  private boss: EnemyEntity | null = null;

  private dialogueQueue: DialogueLine[] = [];
  private dialogueIndex = 0;
  private attackCooldown = 0;
  private interactCooldown = 0;
  private bossSpawned = false;
  private heartstoneActive = false;
  private floatingTexts: FloatingText[] = [];
  private heartstonePulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.ui.setCallbacks({
      onStart: () => this.startGame(),
      onDialogueAdvance: () => this.advanceDialogue(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.loop(0);
  }

  private startGame(): void {
    this.state.reset();
    this.state.phase = 'playing';
    this.player.x = SPAWN_TX * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = SPAWN_TY * TILE_SIZE + TILE_SIZE / 2;
    this.player.dir = 'up';
    this.player.attackTimer = 0;
    this.player.invincibleTimer = 0;
    this.player.isAttacking = false;

    this.bossSpawned = false;
    this.boss = null;
    this.heartstoneActive = false;
    this.dialogueQueue = [];
    this.floatingTexts = [];

    for (const e of this.enemies) {
      e.data.dead = false;
      e.data.hp = e.data.maxHp;
      e.x = e.homeX;
      e.y = e.homeY;
      e.hitFlash = 0;
    }

    for (const h of this.herbs) h.collected = false;

    this.ui.setPhase('playing');
    this.ui.updateHUD(this.state);
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  private onResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private loop = (time: number): void => {
    this.animId = requestAnimationFrame(this.loop);
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.input.endFrame();
  };

  private update(dt: number): void {
    if (this.state.phase === 'title' || this.state.phase === 'victory' || this.state.phase === 'defeat') {
      return;
    }

    this.input.update();

    if (this.state.phase === 'dialogue') {
      if (this.input.consumeInteractHeld() && this.interactCooldown <= 0) {
        this.advanceDialogue();
        this.interactCooldown = 0.25;
      }
      this.interactCooldown -= dt;
      return;
    }

    if (this.input.consumeKey('KeyI')) {
      this.state.phase = this.state.phase === 'inventory' ? 'playing' : 'inventory';
      this.ui.setPhase(this.state.phase);
    }
    if (this.input.consumeKey('KeyM')) {
      this.state.phase = this.state.phase === 'map' ? 'playing' : 'map';
      this.ui.setPhase(this.state.phase);
    }
    if (this.input.consumeKey('Escape') && (this.state.phase === 'inventory' || this.state.phase === 'map')) {
      this.state.phase = 'playing';
      this.ui.setPhase('playing');
    }

    if (this.state.phase === 'inventory' || this.state.phase === 'map') {
      this.ui.updateHUD(this.state);
      return;
    }

    this.updateMovement(dt);
    this.state.regenStamina(dt);
    this.updateCombat(dt);
    this.updateEnemies(dt);
    this.updateInteract();
    this.updateBossSpawn();
    this.updateFloatingTexts(dt);
    this.attackCooldown -= dt;
    this.interactCooldown -= dt;
    if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= dt;
    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
    }
    if (this.boss && this.boss.hitFlash > 0) this.boss.hitFlash -= dt;
    this.ui.updateHUD(this.state);
  }

  private updateMovement(dt: number): void {
    const mx = this.input.moveX;
    const my = this.input.moveY;
    if (mx === 0 && my === 0) return;

    const sprint = this.input.sprint && this.state.useStamina(30 * dt);
    const speed = this.state.stats.speed * (sprint ? 1.5 : 1);

    if (Math.abs(mx) > Math.abs(my)) {
      this.player.dir = mx > 0 ? 'right' : 'left';
    } else {
      this.player.dir = my > 0 ? 'down' : 'up';
    }

    const moved = resolveMovement(
      this.tiles,
      this.player.x,
      this.player.y,
      mx * speed * dt,
      my * speed * dt,
      this.player.radius
    );
    this.player.x = moved.x;
    this.player.y = moved.y;
  }

  private updateCombat(dt: number): void {
    if (this.attackCooldown > 0) {
      if (this.player.attackTimer > 0) this.player.attackTimer -= dt;
      return;
    }

    if (this.input.consumeAttack() && this.state.useStamina(12)) {
      this.player.isAttacking = true;
      this.player.attackTimer = 0.2;
      this.attackCooldown = 0.45;

      const hitbox = getAttackHitbox(this.player);
      const targets = this.boss && !this.boss.data.dead ? [...this.enemies, this.boss] : [...this.enemies];

      for (const enemy of targets) {
        if (enemy.data.dead) continue;
        if (aabbOverlap(hitbox, enemy.x, enemy.y, enemy.data.isBoss ? 20 : 14)) {
          const killed = enemy.takeDamage(this.state.stats.damage);
          this.spawnFloat(enemy.x, enemy.y - 20, `-${this.state.stats.damage}`, '#ff6666');
          if (killed) {
            if (enemy.data.isBoss) {
              this.state.bossDefeated = true;
              this.heartstoneActive = true;
              this.spawnFloat(enemy.x, enemy.y - 36, 'Guardião derrotado!', '#ffdd55');
            } else {
              this.state.killWolf();
            }
          }
        }
      }
    }

    if (this.player.attackTimer > 0) {
      this.player.attackTimer -= dt;
      if (this.player.attackTimer <= 0) this.player.isAttacking = false;
    }
  }

  private updateEnemies(dt: number): void {
    const all = this.boss && !this.boss.data.dead ? [...this.enemies, this.boss] : [...this.enemies];
    const now = performance.now() / 1000;

    for (const enemy of all) {
      if (enemy.data.dead) continue;

      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);

      if (dist < enemy.data.aggroRange) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const len = Math.hypot(dx, dy);

        if (len > enemy.data.attackRange) {
          const moved = resolveMovement(
            this.tiles,
            enemy.x,
            enemy.y,
            (dx / len) * enemy.data.speed * dt,
            (dy / len) * enemy.data.speed * dt,
            enemy.data.isBoss ? 18 : 12
          );
          enemy.x = moved.x;
          enemy.y = moved.y;
        } else if (now - enemy.data.lastAttack > enemy.data.attackCooldown) {
          enemy.data.lastAttack = now;
          if (this.player.invincibleTimer <= 0) {
            const dead = this.state.takeDamage(enemy.data.damage);
            this.player.invincibleTimer = 0.7;
            this.ui.flashDamage();
            this.spawnFloat(this.player.x, this.player.y - 24, `-${enemy.data.damage}`, '#ff4444');
            if (dead) {
              this.state.phase = 'defeat';
              this.ui.setPhase('defeat');
            }
          }
        }
      } else if (enemy.data.respawn && dist > 200) {
        enemy.x += (enemy.homeX - enemy.x) * 2 * dt;
        enemy.y += (enemy.homeY - enemy.y) * 2 * dt;
      }
    }
  }

  private updateInteract(): void {
    let target: string | null = null;
    let prompt = '';

    for (const npc of this.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 96) {
        target = npc.id;
        prompt = `[E] Falar com ${npc.name}`;
        break;
      }
    }

    if (!target) {
      for (const h of this.herbs) {
        if (h.collected) continue;
        const dist = Math.hypot(this.player.x - h.x, this.player.y - h.y);
        if (dist < 28) {
          target = `herb_${h.id}`;
          prompt = '[E] Coletar erva';
          break;
        }
      }
    }

    if (!target && this.heartstoneActive) {
      const hs = this.props.find((p) => p.type === 'heartstone');
      if (hs) {
        const hx = hs.tx * TILE_SIZE + TILE_SIZE / 2;
        const hy = hs.ty * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.hypot(this.player.x - hx, this.player.y - hy);
        if (dist < 36) {
          target = 'heartstone';
          prompt = '[E] Purificar Pedra-Coração';
        }
      }
    }

    this.ui.showInteractPrompt(!!target, prompt);

    if (this.input.consumeInteract() && target && this.interactCooldown <= 0) {
      this.interactCooldown = 0.35;
      this.handleInteract(target);
    }
  }

  private handleInteract(target: string): void {
    if (target === 'elder') this.startElderDialogue();
    else if (target === 'healer') this.startHealerDialogue();
    else if (target.startsWith('herb_')) {
      const id = target.replace('herb_', '');
      const spot = this.herbs.find((h) => h.id === id);
      if (spot && !spot.collected) {
        spot.collected = true;
        this.state.collectHerb();
        this.spawnFloat(spot.x, spot.y - 16, '+Erva', '#88ff88');
        if (this.state.getQuest('herbs')?.completed && this.state.herbQuestStarted) {
          this.queueDialogue([
            { speaker: 'Curandeira Mira', text: 'Excelente! Suas ervas fortaleceram sua vitalidade. (+30 HP máximo)' },
          ]);
        }
      }
    } else if (target === 'heartstone') {
      this.state.completeMainQuest();
      this.ui.setPhase('victory');
    }
  }

  private startElderDialogue(): void {
    if (!this.state.mainQuestStarted) {
      this.state.startMainQuest();
      this.state.wolfQuestStarted = true;
      this.queueDialogue([
        { speaker: 'Ancião Thalen', text: 'Bem-vindo, viajante. A clareira está corrompida... A Pedra-Coração nas ruínas ao norte precisa ser purificada.' },
        { speaker: 'Ancião Thalen', text: 'Um Guardião sombrio a protege. Derrote-o e toque na pedra. Fortaleça-se — elimine os lobos e visite a curandeira Mira.' },
        { speaker: 'Ancião Thalen', text: 'Vá com coragem, herói. O bosque conta com você!' },
      ]);
    } else if (this.state.bossDefeated) {
      this.queueDialogue([
        { speaker: 'Ancião Thalen', text: 'O Guardião caiu! Toque na Pedra-Coração nas ruínas para completar o ritual.' },
      ]);
    } else {
      this.queueDialogue([
        { speaker: 'Ancião Thalen', text: 'Siga o caminho ao norte até as ruínas. Derrote o Guardião e purifique a Pedra-Coração.' },
      ]);
    }
  }

  private startHealerDialogue(): void {
    if (!this.state.herbQuestStarted) {
      this.state.herbQuestStarted = true;
      this.queueDialogue([
        { speaker: 'Curandeira Mira', text: 'Colete 3 ervas verdes espalhadas pela clareira — elas aumentarão sua resistência.' },
      ]);
    } else if (this.state.getQuest('herbs')?.completed) {
      this.queueDialogue([
        { speaker: 'Curandeira Mira', text: 'Suas ervas já fizeram efeito. Vá em paz e cuide-se na batalha.' },
      ]);
    } else {
      const prog = this.state.getQuest('herbs')?.progress ?? 0;
      this.queueDialogue([
        { speaker: 'Curandeira Mira', text: `Continue coletando ervas (${prog}/3). Elas brilham em verde pela clareira.` },
      ]);
    }
  }

  private queueDialogue(lines: DialogueLine[]): void {
    this.dialogueQueue = lines;
    this.dialogueIndex = 0;
    this.state.phase = 'dialogue';
    this.ui.setPhase('dialogue');
    this.ui.showDialogue(lines[0]);
  }

  private advanceDialogue(): void {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueQueue.length) {
      this.dialogueQueue = [];
      this.state.phase = 'playing';
      this.ui.setPhase('playing');
      this.ui.showDialogue(null);
    } else {
      this.ui.showDialogue(this.dialogueQueue[this.dialogueIndex]);
    }
  }

  private updateBossSpawn(): void {
    if (this.bossSpawned) return;
    if (this.player.y < 22 * TILE_SIZE) {
      this.bossSpawned = true;
      this.boss = createBoss(30 * TILE_SIZE + 16, 14 * TILE_SIZE + 16);
    }
  }

  private spawnFloat(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({ x, y, text, life: 1, color });
  }

  private updateFloatingTexts(dt: number): void {
    this.floatingTexts = this.floatingTexts.filter((f) => {
      f.life -= dt;
      f.y -= 30 * dt;
      return f.life > 0;
    });
  }

  private getCamera(): { x: number; y: number } {
    const viewW = this.canvas.width;
    const viewH = this.canvas.height;
    const mapW = MAP_W * TILE_SIZE;
    const mapH = MAP_H * TILE_SIZE;
    let camX = this.player.x - viewW / 2;
    let camY = this.player.y - viewH / 2;
    camX = Math.max(0, Math.min(mapW - viewW, camX));
    camY = Math.max(0, Math.min(mapH - viewH, camY));
    return { x: camX, y: camY };
  }

  private render(): void {
    if (this.state.phase === 'title' || this.state.phase === 'victory' || this.state.phase === 'defeat') {
      this.ctx.fillStyle = '#0a0f0a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const { x: camX, y: camY } = this.getCamera();
    const viewW = this.canvas.width;
    const viewH = this.canvas.height;

    this.ctx.fillStyle = '#1a2a1a';
    this.ctx.fillRect(0, 0, viewW, viewH);

    drawMapLayer(this.ctx, this.tiles, this.props, camX, camY, viewW, viewH);

    // Herbs
    for (const h of this.herbs) {
      if (h.collected) continue;
      const sx = h.x - camX;
      const sy = h.y - camY;
      if (sx > -32 && sx < viewW + 32 && sy > -32 && sy < viewH + 32) {
        drawSprite(this.ctx, 'herb', sx, sy);
      }
    }

    // NPCs
    for (const npc of this.npcs) {
      const sx = npc.x - camX;
      const sy = npc.y - camY;
      drawSprite(this.ctx, npc.id === 'elder' ? 'elder' : 'healer', sx, sy, 1.25);
      const near = Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < 96;
      this.ctx.font = '10px sans-serif';
      this.ctx.fillStyle = '#e8f5e0';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(npc.name.split(' ').pop()!, sx, sy - 20);
      if (near) {
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.fillStyle = '#ffdd55';
        this.ctx.fillText('!', sx, sy - 32);
      }
    }

    // Enemies
    const allEnemies = this.boss && !this.boss.data.dead ? [...this.enemies, this.boss] : this.enemies;
    for (const e of allEnemies) {
      if (e.data.dead) continue;
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (e.hitFlash > 0) {
        this.ctx.globalAlpha = 0.5 + Math.sin(e.hitFlash * 40) * 0.5;
      }
      drawSprite(this.ctx, e.data.isBoss ? 'boss' : 'wolf', sx, sy);
      this.ctx.globalAlpha = 1;

      // HP bar for boss
      if (e.data.isBoss) {
        const bw = 48;
        const pct = e.data.hp / e.data.maxHp;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(sx - bw / 2, sy - 28, bw, 5);
        this.ctx.fillStyle = '#9933cc';
        this.ctx.fillRect(sx - bw / 2, sy - 28, bw * pct, 5);
      }
    }

    // Player
    const px = this.player.x - camX;
    const py = this.player.y - camY;
    if (this.player.invincibleTimer > 0) {
      this.ctx.globalAlpha = 0.5 + Math.sin(this.player.invincibleTimer * 20) * 0.3;
    }
    drawSprite(this.ctx, this.player.spriteName(), px, py);
    this.ctx.globalAlpha = 1;

    // Attack slash
    if (this.player.isAttacking) {
      this.ctx.save();
      this.ctx.translate(px, py);
      const rot: Record<Direction, number> = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
      this.ctx.rotate(rot[this.player.dir]);
      this.ctx.drawImage(getSprite('slash'), -16, -16, 32, 32);
      this.ctx.restore();
    }

    // Heartstone glow when active
    if (this.heartstoneActive) {
      this.heartstonePulse += 0.05;
      const hs = this.props.find((p) => p.type === 'heartstone');
      if (hs) {
        const sx = hs.tx * TILE_SIZE + TILE_SIZE / 2 - camX;
        const sy = hs.ty * TILE_SIZE + TILE_SIZE / 2 - camY;
        this.ctx.strokeStyle = `rgba(136,255,136,${0.4 + Math.sin(this.heartstonePulse) * 0.3})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 20 + Math.sin(this.heartstonePulse) * 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // Floating damage text
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    for (const f of this.floatingTexts) {
      this.ctx.globalAlpha = f.life;
      this.ctx.fillStyle = f.color;
      this.ctx.fillText(f.text, f.x - camX, f.y - camY);
    }
    this.ctx.globalAlpha = 1;

    // Minimap when open
    if (this.state.phase === 'map') {
      this.ui.drawMinimapFromTiles(
        this.tiles,
        this.player.x,
        this.player.y,
        this.npcs.map((n) => ({ x: n.x, y: n.y, color: n.id === 'elder' ? '#aa88ff' : '#88cc88' })),
        allEnemies.filter((e) => !e.data.dead).map((e) => ({
          x: e.x,
          y: e.y,
          boss: e.data.isBoss,
        }))
      );
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.animId);
  }
}
