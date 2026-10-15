// 2048 block views: slide animation between cells, merge (both parents slide
// into the target cell, then the new block pops), spawn pop-in, class glow,
// ultimate charge ring, recoil + muzzle flash when firing.
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { GRID, cellX, cellY } from '../config.js';
import { ELEMENTS, fusionOf, milestonePieces } from '../sim/classes.js';
import { blockTex, softDot, sparkTex, BLOCK_PX } from './textures.js';
import { BURST, HIT_TINT, TILE_GLOW } from '../ux/photosafe.js';

const SLIDE = 0.11;
const ease = (t) => 1 - (1 - t) ** 3;
const hex = (c) => parseInt(c.replace('#', ''), 16);

const mixColor = (a, b, k) => {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
};

function drawMilestone(g, tier, U) {
  g.clear();
  const lit = milestonePieces(tier);
  if (lit < 0) return; // below 16 (no class yet) or an ultimate (nothing left to reach)
  const half = GRID.cell * U * 0.43;
  const inset = GRID.cell * U * 0.13;
  const w = 0.12 * U;
  // top, right, bottom, left: each piece runs along the middle of one edge
  const sides = [
    [-half + inset, -half, half - inset, -half],
    [half, -half + inset, half, half - inset],
    [half - inset, half, -half + inset, half],
    [-half, half - inset, -half, -half + inset],
  ];
  const goal = tier < 8 ? 0xffe27a : 0xffb3ff; // gold toward fusion, pink toward the ultimate
  sides.forEach(([x0, y0, x1, y1], i) => {
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w + 0.07 * U, color: 0x2a1c22, alpha: 0.85, cap: 'round' });
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w, color: i < lit ? goal : 0xffffff, alpha: i < lit ? 1 : 0.22, cap: 'round' });
  });
}

export function createBlocks(stage, fx, { art = null } = {}) {
  // glows live in their own layer under every block, so they never wash out a neighbour
  const glowLayer = new Container();
  const layer = new Container();
  stage.layers.tiles.addChild(glowLayer, layer);
  const views = new Map();
  const ghosts = [];
  let lastMoves = -1;
  let slideT = 1;
  let time = 0;
  let selected = null; // tile id picked to show its range

  function makeView() {
    const c = new Container();
    const glow = new Sprite(softDot());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glowLayer.addChild(glow);
    const body = new Sprite();
    body.anchor.set(0.5);
    // key-visual art layer: the creature peeks over the bottom edge, the number sits on top
    const creature = new Sprite();
    creature.anchor.set(0.5, 1);
    creature.visible = false;
    const overlay = new Sprite();
    overlay.anchor.set(0.5);
    overlay.visible = false;
    const flash = new Sprite();
    flash.anchor.set(0.5);
    flash.blendMode = 'add';
    flash.alpha = 0;
    const charge = new Graphics();
    const milestone = new Graphics(); // the 4-piece border: progress to the next milestone
    const sel = new Graphics();
    c.addChild(body, creature, overlay, flash, milestone, charge, sel);
    layer.addChild(c);
    return { c, glow, body, creature, overlay, flash, milestone, msKey: '', charge, sel, key: '', pop: 0, punch: 0, appear: 1, delay: 0, crop: 0, maxW: Infinity, egg: false };
  }

  const keyOf = (t) => `${t.tier}.${t.cls.element ?? ''}.${t.cls.fusion ?? ''}.${t.cls.ultimate ?? ''}`;

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const grid = run.grid;
    if (grid.moves !== lastMoves) {
      lastMoves = grid.moves;
      slideT = 0;
    }
    slideT = Math.min(1, slideT + dt / SLIDE);
    const e = ease(slideT);
    const live = new Set();

    for (const t of run.tiles) {
      live.add(t.id);
      let v = views.get(t.id);
      if (!v) {
        v = makeView();
        views.set(t.id, v);
        // new this move: wait for the slide, then pop in
        const fresh = t.bornAt === grid.moves && lastMoves > 0;
        v.appear = fresh || t.mergedFrom ? 0 : 1;
        v.delay = fresh || t.mergedFrom ? SLIDE * 0.9 : 0;
        if (t.mergedFrom) v.pop = 1;
      }
      const useArt = art && art.style !== 'classic';
      const key = `${keyOf(t)}.${useArt ? art.style : 'classic'}`;
      if (key !== v.key) {
        v.key = key;
        if (useArt) {
          const a = art.tile(t);
          v.body.texture = a.plate;
          v.overlay.texture = a.overlay;
          v.overlay.visible = true;
          v.creature.texture = a.creature ?? Texture.EMPTY;
          v.creature.visible = !!a.creature;
          v.crop = a.crop;
          v.maxW = a.maxW ?? Infinity;
          v.egg = a.egg;
        } else {
          v.body.texture = blockTex(t.tier, t.cls);
          v.overlay.visible = false;
          v.creature.visible = false;
        }
        v.flash.texture = v.body.texture;
      }
      // position: slide from the previous cell
      const fx0 = cellX(t.fromCol);
      const fy0 = cellY(t.fromRow);
      const x = fx0 + (t.x - fx0) * e;
      const y = fy0 + (t.y - fy0) * e;
      v.c.position.set(stage.sx(x), stage.sy(y));
      v.glow.position.copyFrom(v.c.position);
      // siege: hit = red tint + shudder, repaired = green flash (health itself stays hidden). The red
      // holds while hits keep coming and then fades (photosafe: no blinking with every hit).
      if (v.hurtHold > 0) v.hurtHold -= dt;
      else v.hurt = Math.max(0, (v.hurt ?? 0) - dt * HIT_TINT.decay);
      v.shudder = Math.max(0, (v.shudder ?? 0) - dt * 4); // each hit: a short shudder
      v.healed = Math.max(0, (v.healed ?? 0) - dt * 3);
      if (v.shudder > 0) v.c.position.x += Math.sin(time * 90 + t.id) * 0.06 * U * v.shudder;
      v.body.tint = v.hurt > 0.02 ? mixColor(0xffffff, 0xff6a6a, v.hurt) : v.healed > 0.02 ? mixColor(0xffffff, 0x8dff9d, v.healed * TILE_GLOW.heal) : 0xffffff; // the heal's green stays below the flash threshold

      if (v.delay > 0) v.delay -= dt;
      else v.appear = Math.min(1, v.appear + dt / 0.12);
      v.pop = Math.max(0, v.pop - dt * 4);
      v.punch = Math.max(0, v.punch - dt * 9);
      const popS = v.appear < 1 ? ease(v.appear) : 1 + Math.sin(v.pop * Math.PI) * 0.18;
      const scale0 = (GRID.cell * U) / (v.body.texture.width || BLOCK_PX);
      const s = scale0 * popS * (1 + v.punch * 0.07);
      v.body.scale.set(s, s * (1 - v.punch * 0.05));
      v.flash.scale.copyFrom(v.body.scale);
      v.flash.alpha = v.punch * TILE_GLOW.muzzle; // the muzzle flash stays below the flash threshold
      if (v.overlay.visible) v.overlay.scale.copyFrom(v.body.scale);
      if (v.creature.visible) {
        // babies bob fast and squashy, bigger ones slower (motion by stage, style brief)
        const ct = v.creature.texture;
        const cs = Math.min((GRID.cell * U * v.crop) / (ct.height || 1), (GRID.cell * U * v.maxW) / (ct.width || 1)) * popS; // wide pets (orca, snake) are capped by width
        const stage = Math.max(0, t.tier - 4);
        const w = v.egg ? 3 : stage < 2 ? 8.4 : 6;
        const amp = v.egg ? 0 : stage < 2 ? 0.05 : 0.035;
        const ph = Math.sin(time * w + t.id * 1.7);
        const squash = Math.sin(v.pop * Math.PI) * 0.22 + v.punch * 0.08;
        v.creature.scale.set(cs * (1 - amp * 0.6 * ph + squash * 0.5), cs * (1 + amp * ph - squash));
        v.creature.position.set(0, GRID.cell * U * 0.43 * popS);
        v.creature.rotation = v.egg ? Math.sin(time * (t.tier >= 3 ? 9 : 2.4) + t.id) * (t.tier >= 3 ? 0.06 : 0.03) * (t.tier >= 3 && Math.sin(time * 0.9 + t.id) > 0.4 ? 1 : 0.4) : 0;
      }

      // class glow
      const els = t.tier >= 4 ? [t.cls.element, t.cls.fusion, t.cls.ultimate].filter(Boolean) : [];
      if (els.length) {
        const col = els[Math.floor(time * 1.5) % els.length];
        const fu = els.length === 2 ? fusionOf(t.cls) : null;
        v.glow.visible = true;
        v.glow.tint = hex(fu ? fu.color : ELEMENTS[col].color);
        const big = els.length === 3 ? 1.9 : els.length === 2 ? 1.6 : 1.4;
        v.glow.width = v.glow.height = GRID.cell * U * big * popS * (1 + 0.06 * Math.sin(time * 4 + t.id));
        // with creature art the glow is a whisper: colour and shape carry the class
        v.glow.alpha = (els.length === 3 ? 0.6 : els.length === 2 ? 0.42 : 0.26) * (useArt ? 0.3 : 1);
      } else v.glow.visible = false;

      // the 4-piece border: one piece per merge toward the next milestone.
      // 16 → 32 → 64 → 128 → 256 (fusion), then 512 → 1024 → 2048 → 4096 (ultimate)
      const msKey = `${t.tier}:${Math.round(U * 10)}`;
      if (msKey !== v.msKey) {
        v.msKey = msKey;
        drawMilestone(v.milestone, t.tier, U);
      }

      // picked (its range is showing): a pulsing gold frame
      v.sel.clear();
      if (t.id === selected) {
        const half = GRID.cell * U * (0.5 + 0.03 * Math.sin(time * 8));
        v.sel.roundRect(-half, -half, half * 2, half * 2, 0.36 * U).stroke({ width: 0.12 * U, color: 0xffd34a, alpha: 0.95 });
        v.sel.roundRect(-half, -half, half * 2, half * 2, 0.36 * U).stroke({ width: 0.04 * U, color: 0xffffff });
      }

      // ultimate charge ring
      v.charge.clear();
      if (t.cls.ultimate && t.prof?.signature) {
        const f = Math.min(1, run.defense.sigCharge(t.id) / t.prof.signature.period);
        const r = GRID.cell * U * 0.5;
        v.charge.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f).stroke({ width: 0.09 * U, color: 0xffe27a, alpha: 0.95, cap: 'round' });
      }
    }

    for (const [id, v] of views) {
      if (!live.has(id)) {
        v.c.destroy({ children: true });
        v.glow.destroy();
        views.delete(id);
      }
    }

    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      g.t += dt;
      const k = ease(Math.min(1, g.t / SLIDE));
      g.v.c.position.set(stage.sx(g.x0 + (g.x1 - g.x0) * k), stage.sy(g.y0 + (g.y1 - g.y0) * k));
      if (g.shrink) {
        g.v.c.scale.set(1 - k);
        g.v.c.alpha = 1 - k;
      }
      if (g.t >= SLIDE) {
        g.v.c.destroy({ children: true });
        g.v.glow.destroy();
        ghosts.splice(i, 1);
      }
    }
  }

  function onEvent(e) {
    if (e.type === 'merge') {
      for (const id of e.from) {
        const v = views.get(id);
        if (!v) continue;
        views.delete(id);
        v.glow.visible = false;
        const x0 = (v.c.position.x - stage.view.ox) / stage.view.U;
        const y0 = (stage.view.oy - v.c.position.y) / stage.view.U;
        ghosts.push({ v, x0, y0, x1: e.x, y1: e.y, t: 0 });
      }
    } else if (e.type === 'fire') {
      const v = views.get(e.id);
      if (v) v.punch = 1;
      if (e.target) {
        const dx = e.target.x - e.x;
        const dy = e.target.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        // the muzzle spark takes from the light budget (many turrets fire at once)
        if (fx.flashAll(BURST.spark * 0.36, 0.12)) fx.particle(sparkTex(), e.x + (dx / d) * 0.75, e.y + (dy / d) * 0.75, { life: 0.12, size: 0.6, grow: -0.3, color: e.colors.at(-1) });
      }
    } else if (e.type === 'remove') {
      // sold: the block shrinks away in a puff of gold; destroyed: it shrinks as it shatters (main.js adds the blast)
      const v = views.get(e.id);
      if (v) {
        views.delete(e.id);
        v.glow.visible = false;
        ghosts.push({ v, x0: e.x, y0: e.y, x1: e.x, y1: e.y, t: 0, shrink: true });
      }
      if (e.reason !== 'destroyed') fx.burst(e.x, e.y, [0xffd34a, 0xffffff, 0xe89a16], 18, { speed: 4, size: 0.24, life: 0.45, gravity: -6 });
    } else if (e.type === 'tileHit') {
      const v = views.get(e.id);
      if (v) {
        v.hurt = 1;
        v.hurtHold = HIT_TINT.hold;
        v.shudder = 1;
      }
    } else if (e.type === 'tileHeal') {
      const v = views.get(e.id);
      if (v) v.healed = 1;
    } else if (e.type === 'classed' || e.type === 'promote') {
      const v = views.get(e.tileId ?? e.id);
      if (v) v.pop = 1;
    }
  }

  function reset() {
    for (const v of views.values()) {
      v.c.destroy({ children: true });
      v.glow.destroy();
    }
    views.clear();
    for (const g of ghosts) {
      g.v.c.destroy({ children: true });
      g.v.glow.destroy();
    }
    ghosts.length = 0;
    lastMoves = -1;
  }

  return {
    sync,
    onEvent,
    reset,
    /** Rebuild every block's textures (the art style changed). */
    refresh() {
      for (const v of views.values()) v.key = '';
    },
    /** Highlight one tile (or null) as picked. */
    select(id) {
      selected = id;
    },
  };
}
