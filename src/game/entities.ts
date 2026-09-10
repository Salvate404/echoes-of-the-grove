import * as THREE from 'three';
import type { EnemyData } from './types';

export class PlayerEntity {
  mesh: THREE.Group;
  position = new THREE.Vector3(0, 0, 25);
  yaw = 0;
  attackTimer = 0;
  invincibleTimer = 0;
  isAttacking = false;

  constructor() {
    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x4488cc })
    );
    body.position.y = 1;
    body.castShadow = true;
    this.mesh.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffcc99 })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    this.mesh.add(head);

    // Sword
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.8, 0.05),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
    );
    sword.position.set(0.5, 1.2, 0.3);
    sword.name = 'sword';
    this.mesh.add(sword);

    this.mesh.position.copy(this.position);
  }

  syncMesh(): void {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }
}

export class EnemyEntity {
  mesh: THREE.Group;
  data: EnemyData;
  position: THREE.Vector3;
  homePosition: THREE.Vector3;
  attackAnim = 0;

  constructor(
    id: string,
    position: THREE.Vector3,
    opts: Partial<EnemyData> = {}
  ) {
    this.position = position.clone();
    this.homePosition = position.clone();
    this.data = {
      id,
      hp: opts.hp ?? 30,
      maxHp: opts.maxHp ?? opts.hp ?? 30,
      damage: opts.damage ?? 8,
      speed: opts.speed ?? 4,
      isBoss: opts.isBoss ?? false,
      aggroRange: opts.aggroRange ?? 12,
      attackRange: opts.attackRange ?? 1.8,
      attackCooldown: opts.attackCooldown ?? 1.2,
      lastAttack: 0,
      dead: false,
      respawn: opts.respawn ?? !opts.isBoss,
    };

    this.mesh = new THREE.Group();

    const scale = this.data.isBoss ? 2.5 : 1;
    const color = this.data.isBoss ? 0x6622aa : 0x555555;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8 * scale, 0.6 * scale, 1.2 * scale),
      new THREE.MeshLambertMaterial({ color })
    );
    body.position.y = 0.5 * scale;
    body.castShadow = true;
    this.mesh.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.6 * scale),
      new THREE.MeshLambertMaterial({ color: this.data.isBoss ? 0x9933cc : 0x444444 })
    );
    head.position.set(0, 0.9 * scale, 0.4 * scale);
    head.castShadow = true;
    this.mesh.add(head);

    if (!this.data.isBoss) {
      // Wolf ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.3, 4),
          new THREE.MeshLambertMaterial({ color: 0x444444 })
        );
        ear.position.set(side * 0.2, 1.2, 0.3);
        this.mesh.add(ear);
      }
    }

    this.mesh.position.copy(this.position);
  }

  syncMesh(): void {
    if (this.data.dead) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.mesh.position.copy(this.position);
  }

  takeDamage(amount: number): boolean {
    if (this.data.dead) return false;
    this.data.hp -= amount;
    if (this.data.hp <= 0) {
      this.data.dead = true;
      this.data.hp = 0;
      return true;
    }
    return false;
  }
}

export class NPCEntity {
  mesh: THREE.Group;
  position: THREE.Vector3;
  id: string;
  name: string;

  constructor(id: string, name: string, position: THREE.Vector3, robeColor: number) {
    this.id = id;
    this.name = name;
    this.position = position.clone();

    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: robeColor })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    this.mesh.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffcc99 })
    );
    head.position.y = 1.6;
    this.mesh.add(head);

    if (id === 'elder') {
      const staff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6),
        new THREE.MeshLambertMaterial({ color: 0x6a4a2a })
      );
      staff.position.set(0.4, 1, 0);
      this.mesh.add(staff);
    }

    this.mesh.position.copy(this.position);
  }
}

export function createWolfPack(): { id: string; pos: THREE.Vector3 }[] {
  return [
    { id: 'wolf1', pos: new THREE.Vector3(-15, 0, -5) },
    { id: 'wolf2', pos: new THREE.Vector3(10, 0, -15) },
    { id: 'wolf3', pos: new THREE.Vector3(-5, 0, -20) },
    { id: 'wolf4', pos: new THREE.Vector3(18, 0, -10) },
    { id: 'wolf5', pos: new THREE.Vector3(-20, 0, 0) },
  ];
}

export function createBoss(position: THREE.Vector3): EnemyEntity {
  return new EnemyEntity('boss', position, {
    hp: 150,
    maxHp: 150,
    damage: 18,
    speed: 3.5,
    isBoss: true,
    aggroRange: 20,
    attackRange: 3,
    attackCooldown: 1.8,
    respawn: false,
  });
}
