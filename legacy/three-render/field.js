// The sky field above the crate: 6 light-ribbon lanes, portals at the top
// (Slime Legion's spawn row), a castle battlement on top of the crate, and the
// lane telegraph for the coming wave.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { propMaterial } from './materials.js';
import { BOARD, FIELD, laneX } from '../config.js';

const W = BOARD.halfWidth;
const LANE_W = (W * 2) / FIELD.lanes;

function buildCastle() {
  const k = new Kit();
  const y0 = BOARD.height + 0.2;
  const stone = '#d8cfc2';
  const stoneDark = '#a99c8c';
  // wall band and merlons across the crate top
  k.box(W * 2 + 1.1, 0.42, 0.7, stoneDark, { y: y0, z: 0.9 }, 0.2);
  const merlons = 9;
  for (let i = 0; i < merlons; i++) {
    const x = -W - 0.2 + ((W * 2 + 0.4) * i) / (merlons - 1);
    k.box(0.42, 0.36, 0.7, stone, { x, y: y0 + 0.42, z: 0.9 }, 0.15);
  }
  // corner towers with roofs and flags
  for (const side of [-1, 1]) {
    const x = side * (W + 0.55);
    k.cyl(0.55, 0.62, 1.7, 10, stone, { x, y: y0 - 0.6, z: 0.6 }, 0.25);
    k.cone(0.72, 1.0, 10, '#b86b5a', { x, y: y0 + 1.1, z: 0.6 }, 0.15);
    k.cyl(0.03, 0.03, 0.7, 4, '#6b4a33', { x, y: y0 + 2.0, z: 0.6 });
    k.box(0.38, 0.22, 0.03, side < 0 ? '#ff8fb0' : '#8fd0ff', { x: x + 0.2, y: y0 + 2.4, z: 0.6 });
  }
  return k.build();
}

export function createField(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const height = FIELD.spawnY - FIELD.gateY;
  const midY = (FIELD.spawnY + FIELD.gateY) / 2;

  // lane ribbons: faint by default, tinted when telegraphed
  const ribbonGeo = new THREE.PlaneGeometry(LANE_W * 0.9, height);
  const lanes = [];
  for (let i = 0; i < FIELD.lanes; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
    const m = new THREE.Mesh(ribbonGeo, mat);
    m.position.set(laneX(i), midY, -1.2);
    group.add(m);
    lanes.push(m);
  }

  // portals
  const portalGeo = new THREE.TorusGeometry(0.42, 0.09, 8, 24);
  const portalCore = new THREE.CircleGeometry(0.38, 24);
  const portals = [];
  for (let i = 0; i < FIELD.lanes; i++) {
    const ring = new THREE.Mesh(portalGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#9d7bff').multiplyScalar(1.6), toneMapped: false }));
    const core = new THREE.Mesh(portalCore, new THREE.MeshBasicMaterial({ color: '#5b3fd1', transparent: true, opacity: 0.55, depthWrite: false }));
    ring.position.set(laneX(i), FIELD.spawnY + 0.35, -0.6);
    core.position.copy(ring.position);
    group.add(ring, core);
    portals.push({ ring, core });
  }

  const castle = new THREE.Mesh(buildCastle(), propMaterial({ rim: 0.2 }));
  castle.castShadow = true;
  castle.receiveShadow = true;
  group.add(castle);

  const calm = new THREE.Color('#ffffff');
  const warn = new THREE.Color('#7dff9a');
  const boss = new THREE.Color('#ff5a5a');
  const tmp = new THREE.Color();
  let time = 0;

  /** phase: 'plan' | 'settle' | 'battle' | …  wave: { lanes, bossLane } */
  function update(dt, run) {
    time += dt;
    const wave = run.wave;
    const telegraph = run.phase === 'plan' || run.phase === 'settle';
    for (let i = 0; i < FIELD.lanes; i++) {
      const attacked = wave.lanes.includes(i);
      const isBoss = wave.boss && wave.bossLane === i;
      const m = lanes[i].material;
      if (attacked && telegraph) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4 + i);
        m.color.copy(isBoss ? boss : warn);
        m.opacity = 0.14 + 0.12 * pulse;
      } else if (attacked && run.phase === 'battle') {
        m.color.copy(isBoss ? boss : calm);
        m.opacity = isBoss ? 0.18 : 0.14;
      } else {
        m.color.copy(calm);
        m.opacity = 0.06;
      }
      const p = portals[i];
      const active = attacked && run.phase !== 'over';
      p.ring.rotation.z = time * (active ? 1.6 : 0.4);
      const s = active ? 1 + 0.06 * Math.sin(time * 5 + i) : 0.75;
      p.ring.scale.setScalar(s);
      p.core.scale.setScalar(s);
      tmp.set(isBoss ? '#ff4d6d' : '#9d7bff').multiplyScalar(active ? 1.8 : 0.6);
      p.ring.material.color.copy(tmp);
      p.core.material.opacity = active ? 0.6 : 0.2;
    }
  }

  return { update };
}
