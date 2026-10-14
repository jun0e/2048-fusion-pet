// Renders sim balls: glossy sphere + rolling number decal, with render-only
// juice (squash on impact, pop on merge). Also the waiting ball and aim guide.
import * as THREE from 'three';
import { BOARD, RULES, TIER_COLORS, GLOW_FROM_TIER, MAX_TIER, tierRadius, tierValue } from '../config.js';
import { ballMaterial } from './materials.js';
import { ELEMENTS } from '../sim/classes.js';

const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
const CAP_ANGLE = 0.8; // radians: how much of the sphere front the number decal covers

function numberTexture(tier) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const text = String(tierValue(tier));
  const px = [0, 170, 170, 150, 122, 100, 86][Math.min(text.length, 6)];
  g.font = `800 ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const dark = new THREE.Color(TIER_COLORS[tier]).offsetHSL(0, 0.05, -0.32).getStyle();
  g.lineJoin = 'round';
  g.lineWidth = px * 0.2;
  g.strokeStyle = dark;
  g.strokeText(text, size / 2, size / 2 + px * 0.06);
  g.fillStyle = '#ffffff';
  g.fillText(text, size / 2, size / 2 + px * 0.06);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Spherical cap facing +z with planar-projected UVs, so the number reads flat.
function capGeometry() {
  const g = new THREE.SphereGeometry(1.012, 40, 14, 0, Math.PI * 2, 0, CAP_ANGLE);
  g.rotateX(Math.PI / 2);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const span = Math.sin(CAP_ANGLE);
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / (2 * span) + 0.5, pos.getY(i) / (2 * span) + 0.5);
  }
  return g;
}

class Spring {
  v = 0;
  x = 0;
  constructor(k = 220, c = 14) {
    this.k = k;
    this.c = c;
  }
  step(dt) {
    const a = -this.k * this.x - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
  }
}

export function createBallView(scene) {
  const sphereGeo = new THREE.SphereGeometry(1, 36, 22);
  const capGeo = capGeometry();
  const tiers = [];
  for (let t = 1; t <= MAX_TIER; t++) {
    tiers[t] = {
      ball: ballMaterial(TIER_COLORS[t], { glow: t >= GLOW_FROM_TIER }),
      label: new THREE.MeshBasicMaterial({ map: numberTexture(t), transparent: true, depthWrite: false }),
    };
  }

  // class rings: one per chosen stage (element, fusion, ultimate), in element colours
  const ringGeo = new THREE.TorusGeometry(1, 0.045, 6, 48);
  const ringMats = {};
  const ringMat = (el, bright) =>
    (ringMats[el + bright] ??= new THREE.MeshBasicMaterial({
      color: new THREE.Color(ELEMENTS[el].color).multiplyScalar(bright ? 2.6 : 1.15),
      toneMapped: false,
    }));

  function makeVisual(tier) {
    const outer = new THREE.Group(); // position + squash (does not roll)
    const inner = new THREE.Group(); // rolls with the ball
    const sphere = new THREE.Mesh(sphereGeo, tiers[tier].ball);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    const cap = new THREE.Mesh(capGeo, tiers[tier].label);
    cap.renderOrder = 2;
    inner.add(sphere, cap);
    outer.add(inner);
    const rings = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(ringGeo, ringMat('fire', false));
      m.scale.setScalar(1.1 + i * 0.13);
      m.visible = false;
      m.renderOrder = 3;
      outer.add(m);
      return m;
    });
    scene.add(outer);
    return { outer, inner, sphere, cap, rings, tier, squash: new Spring(260, 12), pop: new Spring(180, 9) };
  }

  function syncRings(v, cls) {
    const els = [cls?.element, cls?.fusion, cls?.ultimate].filter(Boolean);
    const ultimate = els.length === 3;
    for (let i = 0; i < 3; i++) {
      const r = v.rings[i];
      r.visible = i < els.length;
      if (r.visible) {
        r.material = ringMat(els[i], ultimate);
        r.rotation.z = time * (0.6 + i * 0.35) * (i % 2 ? -1 : 1);
        r.rotation.x = Math.sin(time * 0.9 + i) * 0.25;
      }
    }
  }

  function setTier(vis, tier) {
    vis.tier = tier;
    vis.sphere.material = tiers[tier].ball;
    vis.cap.material = tiers[tier].label;
  }

  const views = new Map(); // ball id → visual
  const pool = [];

  function acquire(tier) {
    const v = pool.pop();
    if (v) {
      setTier(v, tier);
      v.outer.visible = true;
      v.squash.x = v.squash.v = v.pop.x = v.pop.v = 0;
      return v;
    }
    return makeVisual(tier);
  }

  function release(v) {
    v.outer.visible = false;
    pool.push(v);
  }

  // --- waiting ball + aim guide -------------------------------------------
  const waiting = makeVisual(1);
  waiting.sphere.castShadow = true;
  const dotGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 });
  const MAX_DOTS = 48;
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, MAX_DOTS);
  dots.count = 0;
  dots.frustumCulled = false;
  scene.add(dots);
  const _m = new THREE.Matrix4();

  function landingY(balls, x, r) {
    let y = r;
    for (const b of balls) {
      const dx = Math.abs(b.x - x);
      const R = b.r + r;
      if (dx < R) y = Math.max(y, b.y + Math.sqrt(R * R - dx * dx));
    }
    return y;
  }

  let time = 0;
  function sync(game, alpha, dt) {
    time += dt;
    const live = new Set();
    for (const b of game.balls) {
      live.add(b.id);
      let v = views.get(b.id);
      if (!v) {
        v = acquire(b.tier);
        views.set(b.id, v);
        if (b.growT < 1) v.pop.v = 6; // merged ball: overshoot pop
      }
      if (v.tier !== b.tier) setTier(v, b.tier);
      const x = b.rx0 + (b.x - b.rx0) * alpha;
      const y = b.ry0 + (b.y - b.ry0) * alpha;
      if (b.impact > 4) v.squash.v -= Math.min(5, b.impact * 0.22);
      v.squash.step(dt);
      v.pop.step(dt);
      const sq = Math.max(-0.28, Math.min(0.2, v.squash.x));
      const s = b.r * (1 + v.pop.x * 0.35);
      v.outer.position.set(x, y + sq * b.r * 0.5, 0);
      v.outer.scale.set(s * (1 - sq * 0.6), s * (1 + sq), s * (1 - sq * 0.6));
      v.inner.rotation.z = b.angle;
      syncRings(v, b.cls);
    }
    for (const [id, v] of views) {
      if (!live.has(id)) {
        release(v);
        views.delete(id);
      }
    }

    // waiting ball: grows back in as the cooldown ends, bobs gently
    const tier = game.current;
    if (waiting.tier !== tier) setTier(waiting, tier);
    const r = tierRadius(tier);
    const ready = 1 - game.cooldown / RULES.dropCooldown;
    const grow = game.over ? 0 : 1 - (1 - Math.min(1, ready * 1.3)) ** 3;
    waiting.outer.visible = grow > 0.01;
    waiting.outer.position.set(game.aimX, BOARD.dropY + Math.sin(time * 3) * 0.06, 0);
    waiting.outer.scale.setScalar(r * grow);
    waiting.inner.rotation.z = Math.sin(time * 1.6) * 0.15;
    syncRings(waiting, null);

    // dotted guide from the waiting ball to where it would land
    let n = 0;
    if (!game.over && grow > 0.6) {
      const yTop = BOARD.dropY - r - 0.25;
      const yEnd = landingY(game.balls, game.aimX, r);
      const step = 0.34;
      const phase = (time * 1.2) % step;
      for (let y = yTop - phase; y > yEnd && n < MAX_DOTS; y -= step) {
        _m.makeTranslation(game.aimX, y, 0);
        dots.setMatrixAt(n++, _m);
      }
    }
    dots.count = n;
    dots.instanceMatrix.needsUpdate = true;
  }

  function reset() {
    for (const v of views.values()) release(v);
    views.clear();
  }

  return { sync, reset };
}
