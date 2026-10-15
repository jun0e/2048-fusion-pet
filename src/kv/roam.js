// Roaming fusions: at 256 a fusion hops out of its tile, which stays on the board as
// its den (number, split plate, both glyphs), and roams the field. It walks to the lane
// under the most pressure, idles, and shoots from where it stands. Where it goes is sim
// state (src/sim/roam.js, tile.roam), so a replay plays out the same; this layer only
// draws it. Legendaries glide instead of stepping, hover over a detached shadow and carry
// their apex halo. Motion by stage follows the style brief: fusions ≤5% squash with a
// weighty step, legendaries none.
import { Container, Graphics, Sprite } from 'pixi.js';
import { GRID } from '../config.js';
import { fusionOf } from '../sim/classes.js';
import { shadowTex, softDot } from '../render/textures.js';
import { createRng } from '../sim/rng.js';

const hex = (c) => parseInt(c.replace('#', ''), 16);

export function createRoamers(stage, fx, art, { seed = 4096 } = {}) {
  // looks only (breathing phase, sparkles): the walking is the sim's
  const rng = createRng(seed);
  const rand = () => rng.next();
  const layer = new Container();
  layer.sortableChildren = true; // nearer pets (lower on screen) draw in front
  const enemies = stage.layers.enemies;
  enemies.parent.addChildAt(layer, enemies.parent.getChildIndex(enemies) + 1);
  const views = new Map();
  let time = 0;

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
    body.anchor.set(0.5, 0.89); // re-set per texture from art.roamerFit
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
      x: t.roam.x,
      y: t.roam.y,
      facing: t.roam.facing,
      walkFacing: t.roam.facing, // the sim's facing as last seen: a turn there overrides a punch's
      punch: 0,
      still: 0, // seconds since the sim last moved it
      phase: rand() * 6,
      key: '',
    };
    fx.burst(t.x, t.y, [hex(fusionOf(t.cls).color), 0xffffff, 0xffe27a], 26, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
    fx.ring(t.x, t.y, 0xffffff, 0.4, 2.2, 0.4);
    return v;
  }

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const live = new Set();
    const list = [];
    for (const t of run.tiles) {
      if (!t.roam) continue; // the sim adds it to a fusion (createRun({ roaming: true }))
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
        v.fit = art.roamerFit(t.cls); // code-drawn canvases are padded, generated sprites trimmed
        v.body.anchor.set(0.5, v.fit.feet);
        v.halo.visible = legend;
        if (legend) v.halo.texture = art.halo(t.cls.ultimate);
        v.ring.clear();
        v.ring.ellipse(0, 0, 0.62 * U, 0.2 * U).stroke({ width: 0.08 * U, color: hex(fu.color), alpha: 0.85 });
        v.ring.ellipse(0, 0, 0.62 * U, 0.2 * U).stroke({ width: 0.025 * U, color: 0xffffff, alpha: 0.7 });
        v.glow.tint = hex(legend ? '#ffe9a8' : fu.color);
      }
      v.punch = Math.max(0, v.punch - dt * 7);
      // where the sim has it; a paused game holds it still (no walking in place)
      const r = t.roam;
      v.still = r.x === v.x && r.y === v.y ? v.still + dt : 0;
      const moving = r.moving && r.hatch >= 1 && v.still < 0.1;
      v.x = r.x;
      v.y = r.y;
      if (r.facing !== v.walkFacing) v.facing = v.walkFacing = r.facing;

      // view
      const px = art.style === 'pixel';
      const tex = v.body.texture;
      let s = Math.min((GRID.cell * U * v.fit.height) / (tex.height || 1), (GRID.cell * U * v.fit.maxW) / (tex.width || 1)); // the creature itself is ~1.0–1.2 cells
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
