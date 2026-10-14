// The container (a wooden crate open at the front) sitting on a small grassy
// island, plus the danger line. All static geometry is merged into a couple
// of meshes with baked vertex colours.
import * as THREE from 'three';
import { Kit, hash01 } from './kit.js';
import { propMaterial } from './materials.js';
import { BOARD } from '../config.js';

const W = BOARD.halfWidth;
const DEPTH_BACK = -2.9; // balls live on z = 0; the back panel sits behind the biggest ball
const DEPTH_FRONT = 1.2;
const WALL_T = 0.42;
const WOOD = '#c99766';
const WOOD_LIGHT = '#e2b886';
const WOOD_DARK = '#9a6b45';

function buildCrate() {
  const k = new Kit();
  const top = BOARD.height + 0.3;
  const depth = DEPTH_FRONT - DEPTH_BACK;
  const zMid = (DEPTH_FRONT + DEPTH_BACK) / 2;

  // floor tray
  k.box(W * 2 + WALL_T * 2, 0.55, depth + 0.3, WOOD_DARK, { y: -0.55, z: zMid }, 0.25);
  k.box(W * 2, 0.06, depth, WOOD_LIGHT, { y: -0.06, z: zMid });

  // side walls: stacked planks with alternating tones and a light front trim
  for (const side of [-1, 1]) {
    const x = side * (W + WALL_T / 2);
    const planks = 7;
    const ph = (top + 0.55) / planks;
    for (let i = 0; i < planks; i++) {
      k.box(WALL_T, ph - 0.03, depth, i % 2 ? WOOD : WOOD_LIGHT, { x, y: -0.55 + i * ph, z: zMid }, 0.15);
    }
    k.box(WALL_T + 0.08, top + 0.55, 0.16, WOOD_DARK, { x, y: -0.55, z: DEPTH_FRONT }, 0.2);
    k.box(WALL_T + 0.08, top + 0.55, 0.16, WOOD_DARK, { x, y: -0.55, z: DEPTH_BACK }, 0.2);
    k.box(WALL_T + 0.16, 0.18, depth + 0.3, WOOD_DARK, { x, y: top, z: zMid });
    // little lantern-cap on each front post
    k.sphere(0.22, 10, 6, '#f2cf7a', { x, y: top + 0.3, z: DEPTH_FRONT });
  }

  // back panel: vertical slats
  const slats = 9;
  const sw = (W * 2) / slats;
  for (let i = 0; i < slats; i++) {
    const tint = 0.92 + hash01(i, 3) * 0.12;
    const c = new THREE.Color('#f3e2c7').multiplyScalar(tint);
    k.box(sw - 0.04, top, 0.16, c, { x: -W + sw * (i + 0.5), y: 0, z: DEPTH_BACK - 0.08 }, 0.12);
  }
  // two cross beams on the back for a crate read
  for (const y of [BOARD.height * 0.33, BOARD.height * 0.7]) {
    k.box(W * 2, 0.22, 0.12, WOOD, { y, z: DEPTH_BACK + 0.03 });
  }
  return k.build();
}

function buildIsland() {
  const k = new Kit();
  // grassy top and earthy underside
  k.cyl(11, 11.5, 1.2, 28, '#8fcf7a', { y: -1.75 }, 0.2);
  k.cyl(11.5, 6, 3.2, 28, '#b58a64', { y: -4.95 }, 0.45);
  // trees and bushes around the crate (deterministic scatter)
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const a = hash01(i, 1) * Math.PI * 2;
    const r = 5.6 + hash01(i, 2) * 4.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.6 - 2.5;
    if (Math.abs(x) < W + 1.2 && z > -4.5) continue; // keep the crate front clear
    spots.push([x, z, i]);
  }
  for (const [x, z, i] of spots) {
    const kind = hash01(i, 7);
    const y = -0.55;
    if (kind < 0.55) {
      const h = 1.4 + hash01(i, 4) * 1.6;
      k.cyl(0.14, 0.2, h * 0.45, 6, '#8a5a3a', { x, y, z });
      const greens = ['#6fbf73', '#83c96d', '#5aa86a', '#9fd27a'];
      const g = greens[Math.floor(hash01(i, 5) * greens.length)];
      k.ico(0.7 + h * 0.18, 1, g, { x, y: y + h * 0.55, z, sy: 0.9 }, 0.25);
      k.ico(0.5 + h * 0.12, 1, g, { x: x + 0.3, y: y + h * 0.8, z: z + 0.1 }, 0.2);
    } else if (kind < 0.85) {
      k.ico(0.55 + hash01(i, 6) * 0.3, 1, '#9ad37f', { x, y: y + 0.25, z, sy: 0.75 }, 0.3);
      const flower = ['#f7a8c4', '#ffe08a', '#ffffff', '#c6a8ff'][i % 4];
      k.ico(0.1, 0, flower, { x: x + 0.25, y: y + 0.62, z: z + 0.2 });
      k.ico(0.1, 0, flower, { x: x - 0.2, y: y + 0.55, z: z + 0.3 });
    } else {
      k.ico(0.35 + hash01(i, 8) * 0.35, 0, '#c9c2b8', { x, y: y + 0.1, z, sy: 0.7 }, 0.3);
    }
  }
  return k.build();
}

function buildDangerLine() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0.55, toneMapped: false });
  const dashes = 14;
  const len = (W * 2) / dashes;
  const dash = new THREE.BoxGeometry(len * 0.55, 0.07, 0.04);
  for (let i = 0; i < dashes; i++) {
    const m = new THREE.Mesh(dash, mat);
    m.position.set(-W + len * (i + 0.5), BOARD.dangerY, DEPTH_BACK + 0.12);
    g.add(m);
  }
  // matching ticks on the wall fronts so the line also reads at the ball plane
  for (const side of [-1, 1]) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), mat);
    tick.position.set(side * (W + WALL_T / 2), BOARD.dangerY, DEPTH_FRONT + 0.1);
    g.add(tick);
  }
  return { group: g, mat };
}

export function createBoard(scene) {
  const crate = new THREE.Mesh(buildCrate(), propMaterial({ rim: 0.18 }));
  crate.castShadow = true;
  crate.receiveShadow = true;
  const island = new THREE.Mesh(buildIsland(), propMaterial({ flat: true, rim: 0.25 }));
  island.castShadow = true;
  island.receiveShadow = true;
  const danger = buildDangerLine();
  scene.add(crate, island, danger.group);

  const calm = new THREE.Color('#ff9a8a');
  const hot = new THREE.Color('#ff3b3b');
  function setDanger(level, time) {
    const pulse = level > 0 ? 0.5 + 0.5 * Math.sin(time * (6 + level * 10)) : 0;
    danger.mat.opacity = 0.45 + level * 0.45 * (0.6 + 0.4 * pulse);
    danger.mat.color.copy(calm).lerp(hot, level);
  }

  return { setDanger, depthBack: DEPTH_BACK };
}
