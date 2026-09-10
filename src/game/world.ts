import * as THREE from 'three';
import type { HerbSpot } from './types';

export interface WorldObjects {
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  elderPos: THREE.Vector3;
  healerPos: THREE.Vector3;
  heartstonePos: THREE.Vector3;
  bossSpawn: THREE.Vector3;
  herbSpots: HerbSpot[];
  groundY: number;
}

export function buildWorld(): WorldObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2a1a);
  scene.fog = new THREE.Fog(0x1a2a1a, 40, 120);

  const colliders: THREE.Box3[] = [];

  // Lighting
  const ambient = new THREE.AmbientLight(0x668866, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  const groundY = 0;

  // Ground - grove area
  const groveGround = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshLambertMaterial({ color: 0x2d4a2d })
  );
  groveGround.rotation.x = -Math.PI / 2;
  groveGround.receiveShadow = true;
  scene.add(groveGround);

  // Path to ruins
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 40),
    new THREE.MeshLambertMaterial({ color: 0x4a4035 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -50);
  scene.add(path);

  // Ruins ground
  const ruinsGround = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x3a3530 })
  );
  ruinsGround.rotation.x = -Math.PI / 2;
  ruinsGround.position.set(0, 0.01, -90);
  scene.add(ruinsGround);

  // Corrupted trees in grove
  for (let i = 0; i < 18; i++) {
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 50 + 10;
    if (Math.abs(x) < 6 && z < 0) continue; // keep path clear
    addTree(scene, colliders, x, z, true);
  }

  // Normal trees near spawn
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 30 + 20;
    const z = (Math.random() - 0.5) * 30 + 20;
    addTree(scene, colliders, x, z, false);
  }

  // Elder camp
  const campPos = new THREE.Vector3(-8, 0, 12);
  addCamp(scene, campPos);

  // Healer hut
  const healerPos = new THREE.Vector3(12, 0, 8);
  addHut(scene, healerPos, 0x6a4a3a);

  // Ruins structures
  addRuinPillar(scene, colliders, -10, -85);
  addRuinPillar(scene, colliders, 10, -85);
  addRuinPillar(scene, colliders, -10, -95);
  addRuinPillar(scene, colliders, 10, -95);

  // Broken arch
  const arch = new THREE.Group();
  const archMat = new THREE.MeshLambertMaterial({ color: 0x6a6560 });
  const leftP = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), archMat);
  leftP.position.set(-4, 3, -90);
  leftP.castShadow = true;
  const rightP = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), archMat);
  rightP.position.set(4, 3, -90);
  rightP.castShadow = true;
  const topP = new THREE.Mesh(new THREE.BoxGeometry(9, 1.5, 1.5), archMat);
  topP.position.set(0, 6, -90);
  topP.castShadow = true;
  arch.add(leftP, rightP, topP);
  scene.add(arch);
  colliders.push(new THREE.Box3().setFromObject(leftP));
  colliders.push(new THREE.Box3().setFromObject(rightP));

  // Heartstone
  const heartstonePos = new THREE.Vector3(0, 1.5, -92);
  const heartstone = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.2, 0),
    new THREE.MeshLambertMaterial({
      color: 0x8844cc,
      emissive: 0x440066,
      emissiveIntensity: 0.5,
    })
  );
  heartstone.position.copy(heartstonePos);
  heartstone.castShadow = true;
  scene.add(heartstone);

  // Glow ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.1, -92);
  scene.add(ring);

  // Herb spots
  const herbSpots: HerbSpot[] = [
    { id: 'h1', collected: false, x: 15, z: -5 },
    { id: 'h2', collected: false, x: -18, z: -8 },
    { id: 'h3', collected: false, x: 22, z: 5 },
    { id: 'h4', collected: false, x: -12, z: -20 },
    { id: 'h5', collected: false, x: 8, z: -25 },
  ];

  for (const spot of herbSpots) {
    addHerb(scene, spot.x, spot.z);
  }

  // Link herb groups to spots by position
  scene.traverse((obj) => {
    if (obj.name !== 'herb' || !(obj instanceof THREE.Group)) return;
    const spot = herbSpots.find(
      (s) => s.x === obj.position.x && s.z === obj.position.z
    );
    if (spot) spot.mesh = obj;
  });

  // Boundary walls (invisible colliders)
  const bounds = [
    { x: 0, z: 40, w: 82, d: 2 },
    { x: 0, z: -110, w: 42, d: 2 },
    { x: -41, z: 0, w: 2, d: 82 },
    { x: 41, z: 0, w: 2, d: 82 },
    { x: -21, z: -90, w: 2, d: 42 },
    { x: 21, z: -90, w: 2, d: 42 },
  ];
  for (const b of bounds) {
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(b.x - b.w / 2, -1, b.z - b.d / 2),
        new THREE.Vector3(b.x + b.w / 2, 10, b.z + b.d / 2)
      )
    );
  }

  const bossSpawn = new THREE.Vector3(0, 0, -88);
  const elderPos = campPos.clone();
  elderPos.y = 0;

  return {
    scene,
    colliders,
    elderPos,
    healerPos,
    heartstonePos,
    bossSpawn,
    herbSpots,
    groundY,
  };
}

function addTree(
  scene: THREE.Scene,
  colliders: THREE.Box3[],
  x: number,
  z: number,
  corrupted: boolean
): void {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 3, 6),
    new THREE.MeshLambertMaterial({ color: corrupted ? 0x3a2030 : 0x4a3020 })
  );
  trunk.position.set(x, 1.5, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(2, 4, 6),
    new THREE.MeshLambertMaterial({ color: corrupted ? 0x4a2060 : 0x2a6a2a })
  );
  foliage.position.set(x, 4.5, z);
  foliage.castShadow = true;
  scene.add(foliage);

  colliders.push(
    new THREE.Box3(
      new THREE.Vector3(x - 0.8, 0, z - 0.8),
      new THREE.Vector3(x + 0.8, 5, z + 0.8)
    )
  );
}

function addCamp(scene: THREE.Scene, pos: THREE.Vector3): void {
  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xff6622 })
  );
  fire.position.set(pos.x, 0.5, pos.z);
  scene.add(fire);

  const log1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3020 })
  );
  log1.rotation.z = Math.PI / 2;
  log1.position.set(pos.x - 0.5, 0.15, pos.z);
  scene.add(log1);
}

function addHut(scene: THREE.Scene, pos: THREE.Vector3, color: number): void {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.5, 4),
    new THREE.MeshLambertMaterial({ color })
  );
  base.position.set(pos.x, 1.25, pos.z);
  base.castShadow = true;
  scene.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.5, 2, 4),
    new THREE.MeshLambertMaterial({ color: 0x5a3a2a })
  );
  roof.position.set(pos.x, 3.5, pos.z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);
}

function addRuinPillar(
  scene: THREE.Scene,
  colliders: THREE.Box3[],
  x: number,
  z: number
): void {
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 5, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x7a7570 })
  );
  pillar.position.set(x, 2.5, z);
  pillar.castShadow = true;
  scene.add(pillar);
  colliders.push(new THREE.Box3().setFromObject(pillar));
}

function addHerb(scene: THREE.Scene, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.name = 'herb';

  const herb = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0x44cc66 })
  );
  herb.position.y = 0.3;
  group.add(herb);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 4),
    new THREE.MeshLambertMaterial({ color: 0x338844 })
  );
  stem.position.y = 0.15;
  group.add(stem);

  scene.add(group);
  return group;
}

export function resolveCollision(
  pos: THREE.Vector3,
  colliders: THREE.Box3[],
  radius: number
): THREE.Vector3 {
  const result = pos.clone();
  for (const box of colliders) {
    const closest = new THREE.Vector3(
      THREE.MathUtils.clamp(result.x, box.min.x, box.max.x),
      result.y,
      THREE.MathUtils.clamp(result.z, box.min.z, box.max.z)
    );
    const dx = result.x - closest.x;
    const dz = result.z - closest.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      result.x += dx * push;
      result.z += dz * push;
    }
  }
  return result;
}
