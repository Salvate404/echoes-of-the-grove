import * as THREE from 'three';
import { GameState } from './state';
import { InputManager } from './input';
import { UIManager } from './ui';
import { buildWorld, resolveCollision } from './world';
import {
  PlayerEntity,
  EnemyEntity,
  NPCEntity,
  createWolfPack,
  createBoss,
} from './entities';
import type { DialogueLine, HerbSpot } from './types';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private state = new GameState();
  private input: InputManager;
  private ui: UIManager;

  private world = buildWorld();
  private player = new PlayerEntity();
  private npcs: NPCEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private boss: EnemyEntity | null = null;
  private herbSpots: HerbSpot[] = [];

  private cameraYaw = 0;
  private cameraPitch = 0.3;
  private cameraDistance = 8;

  private dialogueQueue: DialogueLine[] = [];
  private dialogueIndex = 0;
  private interactTarget: string | null = null;
  private attackCooldown = 0;
  private interactCooldown = 0;
  private bossSpawned = false;
  private heartstoneActive = false;

  private animId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new InputManager(canvas);
    this.ui = new UIManager('ui-root');

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    this.ui.setCallbacks({
      onStart: () => this.startGame(),
      onDialogueAdvance: () => this.advanceDialogue(),
      onFullscreen: () => this.toggleFullscreen(),
    });

    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    this.setupScene();
    this.loop();
  }

  private setupScene(): void {
    this.world.scene.add(this.player.mesh);

    this.npcs.push(new NPCEntity('elder', 'Ancião Thalen', this.world.elderPos, 0x5a4a8a));
    this.npcs.push(new NPCEntity('healer', 'Curandeira Mira', this.world.healerPos, 0x6a8a5a));
    for (const npc of this.npcs) {
      this.world.scene.add(npc.mesh);
    }

    for (const w of createWolfPack()) {
      const enemy = new EnemyEntity(w.id, w.pos);
      this.enemies.push(enemy);
      this.world.scene.add(enemy.mesh);
    }

    this.herbSpots = this.world.herbSpots.map((h) => ({ ...h }));
  }

  private startGame(): void {
    this.state.reset();
    this.state.phase = 'playing';
    this.player.position.set(0, 0, 25);
    this.player.yaw = Math.PI;
    this.player.attackTimer = 0;
    this.player.invincibleTimer = 0;
    this.player.isAttacking = false;
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.3;
    this.bossSpawned = false;
    this.heartstoneActive = false;
    this.dialogueQueue = [];
    this.interactTarget = null;

    for (const e of this.enemies) {
      e.data.dead = false;
      e.data.hp = e.data.maxHp;
      e.position.copy(e.homePosition);
      e.syncMesh();
    }

    for (const h of this.herbSpots) {
      h.collected = false;
    }
    for (const h of this.herbSpots) {
      if (h.mesh) h.mesh.visible = true;
    }

    const existingBoss = this.boss;
    if (existingBoss) {
      this.world.scene.remove(existingBoss.mesh);
    }
    this.boss = null;

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
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    this.animId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.input.update();
    this.update(dt);
    this.render();
  };

  private update(dt: number): void {
    if (this.state.phase === 'title' || this.state.phase === 'victory' || this.state.phase === 'defeat') {
      return;
    }

    if (this.state.phase === 'dialogue') {
      if (this.input.interactPressed && this.interactCooldown <= 0) {
        this.advanceDialogue();
        this.interactCooldown = 0.3;
      }
      this.interactCooldown -= dt;
      return;
    }

    // Panel toggles
    if (this.input.keys.has('KeyI') && !this.prevKeyI) {
      this.state.phase = this.state.phase === 'inventory' ? 'playing' : 'inventory';
      this.ui.setPhase(this.state.phase);
    }
    if (this.input.keys.has('KeyM') && !this.prevKeyM) {
      this.state.phase = this.state.phase === 'map' ? 'playing' : 'map';
      this.ui.setPhase(this.state.phase);
      if (this.state.phase === 'map') this.updateMap();
    }
    if (this.input.keys.has('Escape')) {
      if (this.state.phase === 'inventory' || this.state.phase === 'map') {
        this.state.phase = 'playing';
        this.ui.setPhase('playing');
      }
    }
    this.prevKeyI = this.input.keys.has('KeyI');
    this.prevKeyM = this.input.keys.has('KeyM');

    if (this.state.phase === 'inventory' || this.state.phase === 'map') {
      if (this.state.phase === 'map') this.updateMap();
      this.ui.updateHUD(this.state);
      return;
    }

    // Camera rotation
    const md = this.input.consumeMouseDelta();
    if (this.input.mouseLocked || this.input.isMobile()) {
      const sens = this.input.isMobile() ? 0 : 0.003;
      if (!this.input.isMobile()) {
        this.cameraYaw -= md.x * sens;
        this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - md.y * sens, 0.1, 1.2);
      }
    }

    // Movement
    const speed = this.state.stats.speed * (this.input.sprint && this.state.useStamina(30 * dt) ? 1.6 : 1);
    let moveX = this.input.moveX;
    let moveZ = this.input.moveZ;

    if (moveX !== 0 || moveZ !== 0) {
      const camForward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      const camRight = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
      const moveDir = new THREE.Vector3()
        .addScaledVector(camRight, moveX)
        .addScaledVector(camForward, -moveZ);
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        this.player.position.x += moveDir.x * speed * dt;
        this.player.position.z += moveDir.z * speed * dt;
        this.player.yaw = Math.atan2(moveDir.x, moveDir.z);
        if (this.input.isMobile()) {
          this.cameraYaw = THREE.MathUtils.lerp(this.cameraYaw, this.player.yaw, 8 * dt);
        }
      }
    }

    this.player.position.copy(
      resolveCollision(this.player.position, this.world.colliders, 0.5)
    );
    this.player.syncMesh();

    this.state.regenStamina(dt);
    this.updateCombat(dt);
    this.updateEnemies(dt);
    this.updateInteract();
    this.updateBossSpawn();
    this.updateCamera();
    this.ui.updateHUD(this.state);

    if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= dt;
    this.attackCooldown -= dt;
    this.interactCooldown -= dt;
  }

  private prevKeyI = false;
  private prevKeyM = false;

  private updateCamera(): void {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      Math.sin(this.cameraPitch) * this.cameraDistance,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance
    );
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  private updateCombat(dt: number): void {
    if (this.attackCooldown > 0) return;

    if (this.input.attackPressed && this.state.useStamina(15)) {
      this.player.isAttacking = true;
      this.player.attackTimer = 0.35;
      this.attackCooldown = 0.5;

      const attackPos = this.player.position.clone();
      const forward = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
      attackPos.addScaledVector(forward, 1.2);

      const range = 2.2;
      const allEnemies = this.boss && !this.boss.data.dead ? [...this.enemies, this.boss] : this.enemies;

      for (const enemy of allEnemies) {
        if (enemy.data.dead) continue;
        const dist = enemy.position.distanceTo(attackPos);
        if (dist < range) {
          const killed = enemy.takeDamage(this.state.stats.damage);
          enemy.syncMesh();
          if (killed) {
            if (enemy.data.isBoss) {
              this.state.bossDefeated = true;
              this.heartstoneActive = true;
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
    const allEnemies = this.boss && !this.boss.data.dead ? [...this.enemies, this.boss] : this.enemies;

    for (const enemy of allEnemies) {
      if (enemy.data.dead) continue;

      const dist = enemy.position.distanceTo(this.player.position);
      const now = performance.now() / 1000;

      if (dist < enemy.data.aggroRange) {
        const dir = this.player.position.clone().sub(enemy.position);
        dir.y = 0;
        if (dir.lengthSq() > 0.01) {
          dir.normalize();
          if (dist > enemy.data.attackRange) {
            const next = enemy.position.clone().addScaledVector(dir, enemy.data.speed * dt);
            enemy.position.copy(resolveCollision(next, this.world.colliders, 0.5));
            enemy.mesh.rotation.y = Math.atan2(dir.x, dir.z);
          } else if (now - enemy.data.lastAttack > enemy.data.attackCooldown) {
            enemy.data.lastAttack = now;
            if (this.player.invincibleTimer <= 0) {
              const dead = this.state.takeDamage(enemy.data.damage);
              this.player.invincibleTimer = 0.8;
              this.ui.flashDamage();
              if (dead) {
                this.state.phase = 'defeat';
                this.ui.setPhase('defeat');
              }
            }
          }
        }
      } else if (enemy.data.respawn && dist > 25) {
        enemy.position.lerp(enemy.homePosition, 2 * dt);
      }

      enemy.syncMesh();
    }
  }

  private updateInteract(): void {
    const interactRange = 2.5;
    this.interactTarget = null;
    let promptText = '';

    for (const npc of this.npcs) {
      const dist = this.player.position.distanceTo(npc.position);
      if (dist < interactRange) {
        this.interactTarget = npc.id;
        promptText = `[E] Falar com ${npc.name}`;
        break;
      }
    }

    if (!this.interactTarget) {
      for (let i = 0; i < this.herbSpots.length; i++) {
        const h = this.herbSpots[i];
        if (h.collected) continue;
        const dist = Math.hypot(this.player.position.x - h.x, this.player.position.z - h.z);
        if (dist < 1.5) {
          this.interactTarget = `herb_${h.id}`;
          promptText = '[E] Coletar erva';
          break;
        }
      }
    }

    if (!this.interactTarget && this.heartstoneActive) {
      const dist = this.player.position.distanceTo(this.world.heartstonePos);
      if (dist < 3) {
        this.interactTarget = 'heartstone';
        promptText = '[E] Purificar Pedra-Coração';
      }
    }

    this.ui.showInteractPrompt(!!this.interactTarget, promptText);

    if (this.input.interactPressed && this.interactTarget && this.interactCooldown <= 0) {
      this.interactCooldown = 0.4;
      this.handleInteract(this.interactTarget);
    }
  }

  private handleInteract(target: string): void {
    if (target === 'elder') {
      this.startElderDialogue();
    } else if (target === 'healer') {
      this.startHealerDialogue();
    } else if (target.startsWith('herb_')) {
      const id = target.replace('herb_', '');
      const spot = this.herbSpots.find((h) => h.id === id);
      if (spot && !spot.collected) {
        spot.collected = true;
        if (spot.mesh) spot.mesh.visible = false;
        this.state.collectHerb();
        if (this.state.getQuest('herbs')?.completed && this.state.herbQuestStarted) {
          this.queueDialogue([
            { speaker: 'Curandeira Mira', text: 'Excelente! Estas ervas fortaleceram sua vitalidade. (+30 HP máximo)' },
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
        { speaker: 'Ancião Thalen', text: 'Um Guardião sombrio a protege. Derrote-o e toque na pedra. Mas antes, fortaleça-se — elimine os lobos e visite a curandeira Mira.' },
        { speaker: 'Ancião Thalen', text: 'Vá com coragem, herói. O bosque conta com você!' },
      ]);
    } else if (this.state.bossDefeated) {
      this.queueDialogue([
        { speaker: 'Ancião Thalen', text: 'O Guardião caiu! Agora, toque na Pedra-Coração nas ruínas para completar o ritual.' },
      ]);
    } else {
      this.queueDialogue([
        { speaker: 'Ancião Thalen', text: 'A corrupção se espalha... Derrote o Guardião nas ruínas ao norte e purifique a Pedra-Coração.' },
      ]);
    }
  }

  private startHealerDialogue(): void {
    if (!this.state.herbQuestStarted) {
      this.state.herbQuestStarted = true;
      this.queueDialogue([
        { speaker: 'Curandeira Mira', text: 'Vejo feridas em sua alma, herói. Colete 3 ervas verdes espalhadas pela clareira — elas aumentarão sua resistência.' },
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
    const dist = this.player.position.distanceTo(this.world.bossSpawn);
    if (dist < 25) {
      this.bossSpawned = true;
      this.boss = createBoss(this.world.bossSpawn);
      this.world.scene.add(this.boss.mesh);
    }
  }

  private updateMap(): void {
    this.ui.drawMap(
      this.player.position.x,
      this.player.position.z,
      this.npcs.map((n) => ({
        x: n.position.x,
        z: n.position.z,
        color: n.id === 'elder' ? '#aa88ff' : '#88cc88',
      })),
      this.enemies
        .filter((e) => !e.data.dead)
        .map((e) => ({ x: e.position.x, z: e.position.z }))
    );
  }

  private render(): void {
    // Animate heartstone
    this.world.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.OctahedronGeometry) {
        obj.rotation.y += 0.01;
        const mat = obj.material as THREE.MeshLambertMaterial;
        if (this.state.bossDefeated) {
          mat.emissive.setHex(0x006622);
          mat.color.setHex(0x44ff88);
        }
      }
    });

    this.renderer.render(this.world.scene, this.camera);
  }

  destroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
  }
}
