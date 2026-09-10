# Echoes of the Grove

Browser-based 3D third-person RPG prototype (Zelda-like feel). Built with **Vite + TypeScript + Three.js**.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: http://localhost:5173) in Chrome or another modern browser.

Build for static deployment:

```bash
npm run build
npm run preview
```

Output goes to `dist/` and can be hosted on any static file server (Netlify, GitHub Pages, etc.).

## Story

You wake near a corrupted grove. The Elder asks you to purify the **Heartstone** in the northern ruins by defeating its guardian. Side quests help you grow stronger before the final fight.

## Controls

### Desktop

| Key | Action |
|-----|--------|
| **W A S D** | Move |
| **Mouse** | Look around (click canvas to lock pointer) |
| **Shift** | Sprint (uses stamina) |
| **J** | Attack |
| **E** | Interact (NPCs, herbs, Heartstone) |
| **I** | Inventory panel |
| **M** | Map panel |
| **Esc** | Close panels |
| **⛶ Tela Cheia** | Fullscreen toggle (HUD button) |

### Mobile (landscape recommended)

| Control | Action |
|---------|--------|
| **Virtual joystick** (bottom-left) | Move |
| **E button** | Interact |
| **⚔ button** | Attack |
| **⛶ Tela Cheia** | Fullscreen |

## Gameplay loop

1. **Title screen** → click *Iniciar Jornada*
2. Talk to the **Ancião** (Elder) at the camp (west side of spawn) to start the main quest
3. Talk to **Curandeira Mira** (healer hut, east) for the herb side quest — collect 3 green herbs (+30 max HP)
4. Defeat **3 wolves** in the grove for a weapon upgrade (+10 damage, blessed sword)
5. Follow the path **north** to the ruins; the **Guardian boss** spawns when you approach
6. Defeat the boss, then interact with the **Heartstone** to win

## HUD

- **HP** and **Stamina** bars (top-left)
- **Quest tracker** (top-center) — active quests and progress
- **Inventory** (I) — items and equipped weapon
- **Map** (M) — grove, path, ruins, and your position

## Tech stack

- [Vite](https://vitejs.dev/) — dev server & bundler
- [TypeScript](https://www.typescriptlang.org/)
- [Three.js](https://threejs.org/) — WebGL 3D rendering

No external assets; all geometry is procedural low-poly primitives.
