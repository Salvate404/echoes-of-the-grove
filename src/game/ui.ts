import type { GameState } from './state';
import type { DialogueLine, GamePhase } from './types';
import { drawMinimap, type Tile } from './map';

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
        <p>Um herói desperta junto a uma clareira corrompida. Explore o mapa top-down, fale com NPCs, complete missões e purifique a Pedra-Coração nas ruínas ao norte!</p>
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

  drawMinimapFromTiles(
    tiles: Tile[][],
    playerX: number,
    playerY: number,
    npcs: { x: number; y: number; color: string }[],
    enemies: { x: number; y: number; boss?: boolean }[]
  ): void {
    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawMinimap(ctx, tiles, playerX, playerY, npcs, enemies);
  }
}
