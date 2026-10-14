// Roaming fusions (key-visual demo): at 256 a fusion hops out of its tile, which
// stays on the board as its den (number, split plate, both glyphs), and roams the
// field. It walks to the lane under the most pressure, idles, and shoots from where
// it stands (defense.js reads tile.roam). Legendaries glide instead of stepping,
// hover over a detached shadow and carry their apex halo. Motion by stage follows
// the style brief: fusions ≤5% squash with a weighty step, legendaries none.
import { Container, Graphics, Sprite } from 'pixi.js';
import { GRID, GRID_TOP, FIELD, cellX } from '../config.js';
import { fusionOf } from '../sim/classes.js';
import { shadowTex, softDot } from '../render/textures.js';
import { createRng } from '../sim/rng.js';

const hex = (c) => parseInt(c.replace('#', ''), 16);
const Y_MIN = GRID_TOP + 1.1;
const Y_MAX = FIELD.spawnY - 2.4;
const X_MAX = GRID.cell * 1.8;
const ART_FEET = 0.89; // feet sit near the bottom of the creature canvas

export function createRoamers(stage, fx, art, { seed = 4096 } = {}) {
  // seeded, so the sticker and pixel maps on the compare page play out the same
  const rng = createRng(seed);
  const rand = () => rng.next();
  const layer = new Container();
  layer.sortableChildren = true; // nearer pets (lower on screen) draw in front
  const enemies = stage.layers.enemies;
  enemies.parent.addChildAt(layer, enemies.parent.getChildIndex(enemies) + 1);
  const views = new Map();
  let time = 0;

  const isFusion = (t) => t.tier >= 8 && !!t.cls.fusion;

  function make(t) {
    const c = new Container();
    const shadow = new Sprite(shadowTex());
    shadow.anchor.set(0.5);
    const ring = new Graphics();
    const glow = new Sprite(softDot());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    const halo = new Sprite();
    halo.anchor.set(0.5);
    const body = new Sprite();
    body.anchor.set(0.5, ART_FEET);
    c.addChild(shadow, ring, glow, halo, body);
    layer.addChild(c);
    const v = {
      c,
      shadow,
      ring,
      glow,
      halo,
      body,
      id: t.id,
      x: t.x,
      y: t.y,
      tx: t.x,
      ty: Y_MIN + 1,
      hatch: 0, // 0 → 1: the hop out of the den
      x0: t.x,
      y0: t.y,
      idle: 0,
      think: 0,
      facing: -1,
      punch: 0,
      phase: rand() * 6,
      key: '',
      home: views.size % 4,
    };
    pickSpot(v, null);
    fx.burst(t.x, t.y, [hex(fusionOf(t.cls).color), 0xffffff, 0xffe27a], 26, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
    fx.ring(t.x, t.y, 0xffffff, 0.4, 2.2, 0.4);
    return v;
  }

  /** Where to go next: under the most pressed lane, a little above the leading foe. */
  function pickSpot(v, run) {
    let lane = null;
    let lead = null;
    if (run) {
      const press = [0, 0, 0, 0];
      for (const e of run.enemies) {
        if (e.dead || e.gone) continue;
        const k = 1 / Math.max(1, e.y - GRID_TOP);
        press[e.lane] += k;
        if (!lead || e.y < lead.y) lead = e;
      }
      // spread out: a lane another pet already covers counts for less
      const taken = [0, 0, 0, 0];
      for (const o of views.values()) if (o !== v) taken[Math.max(0, Math.min(3, Math.round((o.tx - cellX(0)) / GRID.cell)))] += 1;
      const score = press.map((p, i) => p - taken[i] * 1.5 + (i === v.home ? 0.08 : 0));
      const best = score.indexOf(Math.max(...score));
      if (press.some((p) => p > 0)) lane = best;
    }
    if (lane != null) {
      const ahead = run.enemies.filter((e) => !e.dead && e.lane === lane).reduce((m, e) => (!m || e.y < m.y ? e : m), null);
      v.tx = cellX(lane) + (rand() - 0.5) * 1.1;
      v.ty = Math.max(Y_MIN, Math.min(Y_MAX, (ahead?.y ?? Y_MIN + 3) - 2.6 - rand() * 1.2));
    } else {
      // nothing to fight: amble around its home lane
      v.tx = Math.max(-X_MAX, Math.min(X_MAX, cellX(v.home ?? 0) + (rand() - 0.5) * 1.6));
      v.ty = Y_MIN + rand() * 3.2;
    }
    v.think = 2.6 + rand() * 1.8;
  }

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const live = new Set();
    const list = [];
    for (const t of run.tiles) {
      if (!isFusion(t)) {
        if (t.roam) delete t.roam;
        continue;
      }
      live.add(t.id);
      let v = views.get(t.id);
      if (!v) {
        v = make(t);
        views.set(t.id, v);
      }
      list.push([t, v]);
    }
    for (const [t, v] of list) {
      const legend = !!t.cls.ultimate;
      const fu = fusionOf(t.cls);
      const key = `${art.style}.${t.cls.element}.${t.cls.fusion}.${t.cls.ultimate ?? ''}`;
      if (key !== v.key) {
        v.key = key;
        v.body.texture = art.roamer(t.cls);
        v.halo.visible = legend;
        if (legend) v.halo.texture = art.halo(t.cls.ultimate);
        v.ring.clear();
        v.ring.ellipse(0, 0, 0.62 * U, 0.2 * U).stroke({ width: 0.08 * U, color: hex(fu.color), alpha: 0.85 });
        v.ring.ellipse(0, 0, 0.62 * U, 0.2 * U).stroke({ width: 0.025 * U, color: 0xffffff, alpha: 0.7 });
        v.glow.tint = hex(legend ? '#ffe9a8' : fu.color);
      }
      v.punch = Math.max(0, v.punch - dt * 7);
      let moving = false;
      if (v.hatch < 1) {
        // the hop out of the den: an arc up to its first spot
        v.hatch = Math.min(1, v.hatch + dt / 0.7);
        const k = v.hatch;
        v.x = v.x0 + (v.tx - v.x0) * k;
        v.y = v.y0 + (v.ty - v.y0) * k + Math.sin(k * Math.PI) * 2.2;
      } else {
        v.think -= dt;
        const dx = v.tx - v.x;
        const dy = v.ty - v.y;
        const d = Math.hypot(dx, dy);
        if (v.idle > 0) v.idle -= dt;
        else if (d > 0.08) {
          const sp = (legend ? 1.15 : 1.7) * dt;
          v.x += (dx / d) * Math.min(sp, d);
          v.y += (dy / d) * Math.min(sp, d);
          moving = true;
          if (Math.abs(dx) > 0.05) v.facing = dx > 0 ? 1 : -1;
        } else {
          v.idle = 0.8 + rand() * 1.4;
        }
        if (v.think <= 0 && v.idle <= 0) pickSpot(v, run);
        // keep a little room between pets
        for (const [, o] of list) {
          if (o === v) continue;
          const ox = v.x - o.x;
          const oy = v.y - o.y;
          const od = Math.hypot(ox, oy);
          if (od > 0 && od < 2.3) {
            v.x += (ox / od) * (2.3 - od) * dt * 2.5;
            v.y += (oy / od) * (2.3 - od) * dt * 2.5;
          }
        }
        v.x = Math.max(-X_MAX, Math.min(X_MAX, v.x));
        v.y = Math.max(Y_MIN, Math.min(Y_MAX, v.y));
      }
      t.roam = { x: v.x, y: v.y };

      // view
      const px = art.style === 'pixel';
      const size = GRID.cell * U * (legend ? 1.62 : 1.42); // canvas height: the creature itself is ~1.0–1.2 cells
      let s = size / (v.body.texture.height || 1);
      if (px) s = Math.max(1, Math.round(s * 2) / 2); // half-pixel steps keep pixel art crisp-ish
      const sx = stage.sx(v.x);
      const sy = stage.sy(v.y);
      v.c.position.set(sx, sy);
      v.c.zIndex = -v.y;
      const step = moving ? Math.abs(Math.sin(time * 9 + v.phase)) : 0;
      const breathe = Math.sin(time * (legend ? 1.9 : 4.2) + v.phase);
      const hover = legend ? (0.32 + 0.1 * breathe) * U : step * 0.12 * U;
      const squash = legend ? 0 : (moving ? 0.05 * (1 - step) : 0.02 * breathe) + v.punch * 0.06;
      v.body.position.set(0, -hover);
      v.body.scale.set(s * (1 + squash * 0.6) * -v.facing, s * (1 - squash));
      v.body.rotation = moving && !legend ? Math.sin(time * 9 + v.phase) * 0.05 : 0;
      v.shadow.width = GRID.cell * U * (legend ? 0.62 : 0.9);
      v.shadow.height = GRID.cell * U * (legend ? 0.18 : 0.26);
      v.shadow.alpha = legend ? 0.55 : 0.85;
      v.ring.alpha = 0.55 + 0.25 * Math.sin(time * 3 + v.phase);
      v.glow.visible = legend;
      if (legend) {
        v.glow.position.set(0, -GRID.cell * U * 0.9 - hover);
        v.glow.width = v.glow.height = GRID.cell * U * 2.2;
        v.glow.alpha = 0.32 + 0.12 * breathe;
        v.halo.position.set(0, -GRID.cell * U * 1.32 - hover);
        const hs = (GRID.cell * U * 1.05) / (v.halo.texture.height || 1);
        v.halo.scale.set(px ? Math.max(1, Math.round(hs * 2) / 2) : hs);
        v.halo.rotation = time * 0.4;
      }
      // a soft cream sparkle now and then on legends: majestic, not noisy
      if (legend && rand() < dt * 1.5) fx.burst(v.x + (rand() - 0.5) * 1.4, v.y + 1.6 + rand() * 1.2, [0xfff4c2, 0xffffff], 1, { speed: 0.4, size: 0.16, life: 0.9, gravity: -0.6 });
    }
    for (const [id, v] of views) {
      if (live.has(id)) continue;
      fx.burst(v.x, v.y + 0.8, [0xffffff, 0xffe27a, 0xff9db0], 24, { speed: 4, size: 0.26, life: 0.6, gravity: -3 });
      v.c.destroy({ children: true });
      views.delete(id);
    }
  }

  function onEvent(e) {
    if (e.type === 'fire') {
      const v = views.get(e.id);
      if (v) {
        v.punch = 1;
        if (e.target) v.facing = e.target.x > v.x ? 1 : -1;
      }
    }
  }

  return {
    sync,
    onEvent,
    /** Screen position of a tile's roaming creature (for namecard ribbons). */
    where(id) {
      const v = views.get(id);
      return v ? { x: v.x, y: v.y } : null;
    },
    refresh() {
      for (const v of views.values()) v.key = '';
    },
    reset() {
      for (const v of views.values()) v.c.destroy({ children: true });
      views.clear();
    },
  };
}
