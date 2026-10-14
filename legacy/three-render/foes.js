// Enemy visuals: small procedural critters/heroes per type (kit-built, cached),
// flapping wings for fliers, status tints and HP bars. Placeholder art for the
// prototype — shapes and colours only, enough to read type, health and status.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { ENEMY_TYPES } from '../sim/enemies.js';

const _c = new THREE.Color();

function accessory(k, type, def, s) {
  switch (type) {
    case 'hoodedFlier':
    case 'ringMonk':
      k.cone(s * 0.75, s * 0.9, 8, type === 'ringMonk' ? '#8a5a2b' : '#c9a23f', { y: s * 0.55 });
      if (type === 'ringMonk') k.add(new THREE.TorusGeometry(s * 0.45, s * 0.07, 6, 16), '#ffd76b', { x: s * 0.9, y: 0, rz: Math.PI / 2 });
      break;
    case 'armoredSoldier':
    case 'villager':
      k.cyl(s * 0.62, s * 0.7, s * 0.45, 10, type === 'armoredSoldier' ? '#c9d2e0' : '#c59a5b', { y: s * 0.5 });
      if (type === 'villager') k.box(s * 0.08, s * 1.6, s * 0.08, '#8a6a43', { x: s * 0.85, y: -s * 0.6 });
      break;
    case 'ninja':
      k.cyl(s * 1.02, s * 1.02, s * 0.2, 12, '#d84a4a', { y: s * 0.15 });
      break;
    case 'flameSprite':
    case 'phoenix':
      k.cone(s * 0.45, s * 0.9, 6, '#ffd36b', { y: s * 0.7 });
      break;
    case 'wyvern':
    case 'redDragon':
    case 'dragonRider':
      k.cone(s * 0.14, s * 0.5, 5, '#f2e6d0', { x: -s * 0.4, y: s * 0.8, rz: 0.4 });
      k.cone(s * 0.14, s * 0.5, 5, '#f2e6d0', { x: s * 0.4, y: s * 0.8, rz: -0.4 });
      break;
    case 'leafSprite':
      k.cone(s * 0.5, s * 0.6, 4, '#4fae4a', { y: s * 0.8, rz: 0.3 });
      break;
    case 'pixie':
    case 'axolotlFairy':
      k.add(new THREE.TorusGeometry(s * 0.5, s * 0.08, 6, 14), '#ffe08a', { y: s * 0.85, rx: Math.PI / 2 });
      break;
    default:
      break;
  }
  if (def.boss) {
    // crown
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.cone(s * 0.13, s * 0.35, 4, '#ffd34d', { x: Math.cos(a) * s * 0.42, y: s * 1.0, z: Math.sin(a) * s * 0.42 });
    }
    k.cyl(s * 0.5, s * 0.5, s * 0.14, 14, '#ffc12e', { y: s * 0.86 });
  }
}

function buildBody(type) {
  const def = ENEMY_TYPES[type];
  const s = def.size;
  const k = new Kit();
  k.sphere(s, 18, 12, def.color, { sy: 0.95 }, 0.25);
  k.sphere(s * 0.62, 14, 10, _c.set(def.color).lerp(new THREE.Color('#ffffff'), 0.45).getStyle(), { y: -s * 0.18, z: s * 0.46, sy: 0.8, sz: 0.6 });
  for (const side of [-1, 1]) {
    k.sphere(s * 0.2, 10, 8, '#ffffff', { x: side * s * 0.34, y: s * 0.18, z: s * 0.82 });
    k.sphere(s * 0.11, 8, 6, '#2b2230', { x: side * s * 0.34, y: s * 0.18, z: s * 0.99 });
  }
  accessory(k, type, def, s);
  return k.build();
}

function buildWings(type) {
  const def = ENEMY_TYPES[type];
  const s = def.size;
  const k = new Kit();
  const tint = ['wyvern', 'redDragon', 'phoenix', 'dragonRider'].includes(type) ? def.color : '#e6f3ff';
  for (const side of [-1, 1]) {
    k.sphere(s * 0.55, 10, 6, tint, { x: side * s * 1.05, y: s * 0.25, z: -s * 0.2, sx: 1.1, sy: 0.55, sz: 0.18, rz: side * 0.35 });
  }
  return k.build();
}

export function createFoeView(scene) {
  const bodyGeo = {};
  const wingGeo = {};
  const geoFor = (type) => (bodyGeo[type] ??= buildBody(type));
  const wingsFor = (type) => (wingGeo[type] ??= buildWings(type));

  const barGeo = new THREE.PlaneGeometry(1, 1);
  const views = new Map();
  const pool = [];

  function make(e) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const body = new THREE.Mesh(geoFor(e.type), mat);
    body.castShadow = true;
    const wings = new THREE.Mesh(wingsFor(e.type), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
    const barBg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: '#2b2230', transparent: true, opacity: 0.6, depthTest: false }));
    const barFg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: '#7dde6a', depthTest: false }));
    barBg.renderOrder = 10;
    barFg.renderOrder = 11;
    g.add(body, wings, barBg, barFg);
    scene.add(g);
    return { g, body, wings, barBg, barFg, mat, type: e.type, seed: Math.random() * 10 };
  }

  function acquire(e) {
    let v = pool.find((p) => p.type === e.type);
    if (v) {
      pool.splice(pool.indexOf(v), 1);
      v.g.visible = true;
    } else v = make(e);
    return v;
  }

  let time = 0;
  function sync(enemies, dt) {
    time += dt;
    const live = new Set();
    for (const e of enemies) {
      live.add(e.id);
      let v = views.get(e.id);
      if (!v) {
        v = acquire(e);
        views.set(e.id, v);
      }
      const def = e.def;
      const frozen = e.freezeT > 0;
      const bob = frozen ? 0 : Math.sin(time * 6 + v.seed) * 0.08;
      v.g.position.set(e.x, e.y + bob, 0.3);
      const flap = frozen ? 0.2 : Math.sin(time * (def.flying ? 18 : 9) + v.seed);
      v.wings.visible = !!def.flying;
      v.wings.scale.set(1, 0.65 + 0.35 * Math.abs(flap), 1);
      v.body.rotation.z = frozen ? 0 : Math.sin(time * 8 + v.seed) * 0.08;

      // status tint (emissive), strongest wins: hit flash > frozen > burn > poison > chill
      const em = v.mat.emissive;
      if (e.flash > 0) em.setRGB(0.9, 0.9, 0.9);
      else if (frozen) em.setRGB(0.15, 0.55, 0.9);
      else if (e.burn.stacks > 0) em.setRGB(0.6 + 0.2 * Math.sin(time * 20), 0.22, 0.02);
      else if (e.poison.stacks > 0) em.setRGB(0.12, 0.45, 0.08);
      else if (e.chillT > 0) em.setRGB(0.05, 0.22, 0.4);
      else em.setRGB(0, 0, 0);

      const ratio = Math.max(0, e.hp / e.maxHp);
      const show = e.boss || ratio < 0.999;
      v.barBg.visible = v.barFg.visible = show;
      if (show) {
        const w = e.boss ? 2.2 : 0.95;
        const top = def.size * (e.boss ? 1.5 : 1.25);
        v.barBg.scale.set(w, e.boss ? 0.18 : 0.12, 1);
        v.barBg.position.set(0, top, 0.9);
        v.barFg.scale.set(w * ratio, e.boss ? 0.13 : 0.08, 1);
        v.barFg.position.set(-w * (1 - ratio) * 0.5, top, 0.91);
        v.barFg.material.color.setRGB(1 - ratio * 0.6, 0.35 + ratio * 0.55, 0.3);
      }
    }
    for (const [id, v] of views) {
      if (!live.has(id)) {
        v.g.visible = false;
        pool.push(v);
        views.delete(id);
      }
    }
  }

  function reset() {
    for (const v of views.values()) {
      v.g.visible = false;
      pool.push(v);
    }
    views.clear();
  }

  return { sync, reset };
}
