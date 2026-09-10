# Echoes of the Grove

2D top-down Zelda-like RPG for browser (desktop + mobile). Built with **Vite + TypeScript + Canvas 2D**.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: http://localhost:5173).

Static deploy (Vercel, Netlify, etc.):

```bash
npm run build
```

Output in `dist/`.

## Story

You wake in a corrupted grove. The **Ancião** asks you to purify the **Pedra-Coração** in the northern ruins. Side quests with the **Curandeira** (herbs → +30 HP) and wolf hunting (+10 damage) help you prepare for the **Guardião** boss.

## Controls

### Desktop

| Key | Action |
|-----|--------|
| **W A S D** or **Arrow keys** | Move |
| **Shift** | Sprint (uses stamina) |
| **J** | Attack |
| **E** | Interact (NPCs, herbs, Heartstone) |
| **I** | Inventory |
| **M** | Map |
| **Esc** | Close panels |
| **⛶ Tela Cheia** | Fullscreen |

No pointer lock required — movement works immediately after starting.

### Mobile (landscape recommended)

| Control | Action |
|---------|--------|
| **Virtual joystick** (bottom-left) | Move |
| **E button** | Interact |
| **⚔ button** | Attack |
| **⛶ Tela Cheia** | Fullscreen |

## Gameplay loop

1. **Iniciar Jornada** on the title screen
2. Talk to **Ancião Thalen** (camp, west) → main quest
3. Talk to **Curandeira Mira** (hut, east) → collect 3 green herbs
4. Defeat 3 **wolves** for a weapon upgrade
5. Walk **north** along the path to the ruins → boss spawns
6. Defeat the **Guardião** → interact with the **Pedra-Coração** → victory

## Tech

- **Vite** — bundler & dev server
- **TypeScript**
- **Canvas 2D** — rendering with procedural pixel-art sprites
- Tilemap collision, no Three.js or WebGL dependency
