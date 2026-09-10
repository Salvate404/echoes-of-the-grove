import type { GameState } from './state';
import type { DialogueLine, GamePhase } from './types';

export class UIManager {
  private root: HTMLElement;
  private onStart?: () => void;
  private onDialogueAdvance?: () => void;

  constructor(rootId: string) {
    this.root = document.getElementById(rootId)!;
    this.buildDOM();
  }

  setCallbacks(cbs: {
    onStart: () => void;
    onDialogueAdvance: () => void;
    onFullscreen: () => void;
  }): void {
    this.onStart = cbs.onStart;
    this.onDialogueAdvance = cbs.onDialogueAdvance;
    document.getElementById('btn-fullscreen')?.addEventListener('click', cbs.onFullscreen);
    document.getElementById('btn-start')?.addEventListener('click', () => this.onStart?.());
    document.getElementById('btn-restart')?.addEventListener('click', () => this.onStart?.());
    document.getElementById('dialogue-box')?.addEventListener('click', () => this.onDialogueAdvance?.());
  }

  private buildDOM(): void {
    this.root.innerHTML = `
      <div id="title-screen" class="screen-overlay">
        <h1>Echoes of the Grove</h1>
        <h2>Ecos da Clareira</h2>
        <p>Um herói desperta junto a uma clareira corrompida. O Ancião pede ajuda para purificar a Pedra-Coração nas ruínas. Derrote o Guardião e restaure o bosque!</p>
        <button id="btn-start" class="btn-primary">Iniciar Jornada</button>
      </div>

      <div id="victory-screen" class="screen-overlay hidden">
        <h1>Clareira Restaurada!</h1>
        <p>A Pedra-Coração brilha novamente. O bosque desperta e a corrupção se dissipa. Você salvou a clareira!</p>
        <button id="btn-restart" class="btn-primary">Jogar Novamente</button>
      </div>

      <div id="defeat-screen" class="screen-overlay hidden">
        <h1>Você Caiu...</h1>
        <p>A corrupção prevaleceu desta vez. Levante-se e tente novamente.</p>
        <button id="btn-restart" class="btn-primary">Tentar Novamente</button>
      </div>

      <div id="hud" class="hidden">
        <div class="hud-top">
          <div class="stat-bars">
            <div class="bar-row">
              <span class="bar-label">HP</span>
              <div class="bar-track"><div id="bar-hp" class="bar-fill hp" style="width:100%"></div></div>
            </div>
            <div class="bar-row">
              <span class="bar-label">ST</span>
              <div class="bar-track"><div id="bar-stamina" class="bar-fill stamina" style="width:100%"></div></div>
            </div>
          </div>
          <div class="quest-tracker">
            <h3>Missões</h3>
            <div id="quest-list"></div>
          </div>
          <div class="hud-buttons">
            <button id="btn-fullscreen" class="hud-btn">⛶ Tela Cheia</button>
          </div>
        </div>
        <div id="crosshair"></div>
        <div id="interact-prompt" class="hidden">[E] Interagir</div>
      </div>

      <div id="dialogue-box" class="hidden">
        <div class="speaker" id="dialogue-speaker"></div>
        <div class="text" id="dialogue-text"></div>
        <div class="continue">Clique ou pressione E para continuar ▶</div>
      </div>

      <div id="inventory-panel" class="panel hidden">
        <h3>Inventário [I]</h3>
        <ul id="inventory-list"></ul>
        <div class="close-hint">Pressione I ou Esc para fechar</div>
      </div>

      <div id="map-panel" class="panel hidden">
        <h3>Mapa [M]</h3>
        <canvas id="map-canvas" width="320" height="240"></canvas>
        <div class="close-hint">Pressione M ou Esc para fechar</div>
      </div>

      <div id="mobile-controls">
        <div id="joystick-zone"><div id="joystick-base"><div id="joystick-stick"></div></div></div>
        <div class="mobile-actions">
          <button id="btn-interact" class="mobile-btn">E</button>
          <button id="btn-attack" class="mobile-btn attack">⚔</button>
        </div>
      </div>

      <div id="damage-flash"></div>
    `;
  }

  setPhase(phase: GamePhase): void {
    document.getElementById('title-screen')?.classList.toggle('hidden', phase !== 'title');
    document.getElementById('victory-screen')?.classList.toggle('hidden', phase !== 'victory');
    document.getElementById('defeat-screen')?.classList.toggle('hidden', phase !== 'defeat');
    const inGame = ['playing', 'dialogue', 'inventory', 'map'].includes(phase);
    document.getElementById('hud')?.classList.toggle('hidden', !inGame);
    document.getElementById('dialogue-box')?.classList.toggle('hidden', phase !== 'dialogue');
    document.getElementById('inventory-panel')?.classList.toggle('hidden', phase !== 'inventory');
    document.getElementById('map-panel')?.classList.toggle('hidden', phase !== 'map');
  }

  updateHUD(state: GameState): void {
    const hpPct = (state.stats.hp / state.stats.maxHp) * 100;
    const stPct = (state.stats.stamina / state.stats.maxStamina) * 100;
    const hpBar = document.getElementById('bar-hp');
    const stBar = document.getElementById('bar-stamina');
    if (hpBar) hpBar.style.width = `${hpPct}%`;
    if (stBar) stBar.style.width = `${stPct}%`;

    const questList = document.getElementById('quest-list');
    if (questList) {
      questList.innerHTML = state.quests
        .filter((q) => {
          if (q.id === 'main') return state.mainQuestStarted;
          if (q.id === 'herbs') return state.herbQuestStarted;
          if (q.id === 'wolves') return state.wolfQuestStarted;
          return false;
        })
        .map((q) => {
          const prog =
            q.target && q.progress !== undefined
              ? ` (${q.progress}/${q.target})`
              : '';
          const cls = q.completed ? 'quest-item done' : 'quest-item';
          return `<div class="${cls}">${q.title}${prog}</div>`;
        })
        .join('');
    }

    const invList = document.getElementById('inventory-list');
    if (invList) {
      invList.innerHTML = state.inventory
        .map((i) => `<li>${i.name}${i.count > 1 ? ` x${i.count}` : ''}</li>`)
        .join('');
    }
  }

  showInteractPrompt(show: boolean, text = '[E] Interagir'): void {
    const el = document.getElementById('interact-prompt');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('hidden', !show);
  }

  showDialogue(line: DialogueLine | null): void {
    const speaker = document.getElementById('dialogue-speaker');
    const text = document.getElementById('dialogue-text');
    if (speaker) speaker.textContent = line?.speaker ?? '';
    if (text) text.textContent = line?.text ?? '';
  }

  flashDamage(): void {
    const el = document.getElementById('damage-flash');
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 150);
  }

  drawMap(
    playerX: number,
    playerZ: number,
    npcs: { x: number; z: number; color: string }[],
    enemies: { x: number; z: number; boss?: boolean }[]
  ): void {
    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, w, h);

    const scale = 1.8;
    const ox = w / 2;
    const oz = h * 0.55;

    const toScreen = (x: number, z: number) => ({
      sx: ox + x * scale,
      sz: oz + z * scale,
    });

    // Grove
    ctx.fillStyle = '#2d4a2d';
    ctx.fillRect(ox - 70 * scale, oz - 10 * scale, 140 * scale, 60 * scale);

    // Path
    ctx.fillStyle = '#4a4035';
    ctx.fillRect(ox - 4 * scale, oz - 50 * scale, 8 * scale, 80 * scale);

    // Ruins
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(ox - 20 * scale, oz - 110 * scale, 40 * scale, 40 * scale);

    // Heartstone
    const hs = toScreen(0, -92);
    ctx.fillStyle = '#aa66ff';
    ctx.beginPath();
    ctx.arc(hs.sx, hs.sz, 5, 0, Math.PI * 2);
    ctx.fill();

    for (const npc of npcs) {
      const p = toScreen(npc.x, npc.z);
      ctx.fillStyle = npc.color;
      ctx.fillRect(p.sx - 3, p.sz - 3, 6, 6);
    }

    for (const e of enemies) {
      if (e.boss) continue;
      const p = toScreen(e.x, e.z);
      ctx.fillStyle = '#888';
      ctx.fillRect(p.sx - 2, p.sz - 2, 4, 4);
    }

    const pp = toScreen(playerX, playerZ);
    ctx.fillStyle = '#4488cc';
    ctx.beginPath();
    ctx.arc(pp.sx, pp.sz, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7cfc7c';
    ctx.font = '11px sans-serif';
    ctx.fillText('Clareira', ox - 60 * scale, oz + 55 * scale);
    ctx.fillText('Ruínas', ox - 15 * scale, oz - 115 * scale);
  }
}
