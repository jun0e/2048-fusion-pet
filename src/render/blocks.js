// 2048 block views: slide animation between cells, merge (both parents slide
// into the target cell, then the new block pops), spawn pop-in, class glow,
// ultimate charge ring, recoil + muzzle flash when firing. The creature on the tile
// sells its attack's stage (src/art/attack-vfx.js petPose): a wind-up before each shot
// (WIND_UP s of real time at any speed: 16 hops, 32–64 crouch, 128 crouches and recoils),
// and a Pride Pounce cub leaps onto its prey and back, with an afterimage from 32.
// Nothing is additive: the class glow is a tinted soft dot under the tile and the muzzle
// flash a white silhouette of the tile, both in normal blend below the flash thresholds
// (photosafe.js TILE_GLOW).
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { GRID, cellX, cellY } from '../config.js';
import { ELEMENTS, fusionOf, milestonePieces } from '../sim/classes.js';
import { LADDER, createSimRate, has, ladderStage, leapAt, petPose, windUpAt } from '../art/attack-vfx.js';
import { blockTex, softDot, sparkTex, BLOCK_PX } from './textures.js';
import { createAfterimage } from './trails.js';
import { BURST, HIT_TINT, TILE_GLOW } from '../ux/photosafe.js';

const SLIDE = 0.11;
const FOLLOW = 0.22; // seconds of follow-through after a shot
const ease = (t) => 1 - (1 - t) ** 3;
const smooth = (t) => t * t * (3 - 2 * t);
const hex = (c) => parseInt(c.replace('#', ''), 16);

const mixColor = (a, b, k) => {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
};

const whites = new WeakMap(); // texture → its white silhouette (null when it cannot be read back)
/** A white silhouette of a tile's texture (its alpha, filled white), built once: the muzzle flash, in normal blend. */
function whiteOf(tex) {
  if (!tex || tex === Texture.EMPTY) return null;
  if (whites.has(tex)) return whites.get(tex);
  let out = null;
  try {
    const r = tex.source.resolution ?? 1;
    const f = tex.frame;
    const c = document.createElement('canvas'); // the tile's size, so the flash scales with the tile
    c.width = Math.max(1, Math.round(f.width));
    c.height = Math.max(1, Math.round(f.height));
    const g = c.getContext('2d');
    g.drawImage(tex.source.resource, f.x * r, f.y * r, f.width * r, f.height * r, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    out = Texture.from(c);
  } catch {
    out = null; // no flash rather than an additive one
  }
  whites.set(tex, out);
  return out;
}

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
  const echoLayer = new Container(); // a leaping cub's afterimage, over the field
  stage.layers.shots.addChild(echoLayer);
  const views = new Map();
  const ghosts = [];
  const live = new Set(); // reused each frame
  const simRate = createSimRate(); // the game speed, so a wind-up lasts WIND_UP s of real time
  let lastMoves = -1;
  let slideT = 1;
  let time = 0;
  let selected = null; // tile id picked to show its range

  function makeView() {
    const c = new Container();
    const glow = new Sprite(softDot()); // normal blend: a tinted haze, at most TILE_GLOW.glow
    glow.anchor.set(0.5);
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
    const flash = new Sprite(); // the muzzle flash: a white silhouette of the tile, normal blend
    flash.anchor.set(0.5);
    flash.alpha = 0;
    const charge = new Graphics();
    const milestone = new Graphics(); // the 4-piece border: progress to the next milestone
    const sel = new Graphics();
    c.addChild(body, creature, overlay, flash, milestone, charge, sel);
    layer.addChild(c);
    // wind: the wind-up (0–1); left/period: the sim's cooldown as last seen and its full length; pose/hop: reused each frame
    return { c, glow, body, creature, overlay, flash, milestone, msKey: '', charge, sel, key: '', pop: 0, punch: 0, appear: 1, delay: 0, crop: 0, maxW: Infinity, egg: false, wind: 0, follow: 0, left: 0, period: Infinity, aim: { x: 0, y: 1 }, pose: {}, hop: {}, leap: null, echo: null };
  }

  const dropView = (v) => {
    v.c.destroy({ children: true });
    v.glow.destroy();
    v.echo?.destroy();
  };

  /**
   * The creature's pose for its attack's stage: the wind-up rises before a shot (WIND_UP s of real
   * time at any game speed, from the sim's cooldown: defense.cooldownLeft, read only) and settles
   * if no shot comes; the follow-through falls after a shot. None under Reduce motion. → petPose or null
   */
  function windUp(v, t, run, dt, reduced, rate) {
    if (reduced || !t.cls.element || t.tier < 4) {
      v.wind = v.follow = 0;
      return null;
    }
    const left = run.defense.cooldownLeft?.(t.id) ?? 0;
    if (left > v.left + 1e-6) v.period = left; // a shot just reset it: its full length
    v.left = left;
    const want = windUpAt(left, rate, v.period);
    v.wind = want >= v.wind ? want : Math.max(0, v.wind - dt / 0.1);
    v.follow = Math.max(0, v.follow - dt / FOLLOW);
    return petPose(ladderStage(t.tier), smooth(v.wind), v.follow, v.aim, v.pose);
  }

  const keyOf = (t) => `${t.tier}.${t.cls.element ?? ''}.${t.cls.fusion ?? ''}.${t.cls.ultimate ?? ''}`;

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const reduced = stage.reduced;
    const grid = run.grid;
    if (grid.moves !== lastMoves) {
      lastMoves = grid.moves;
      slideT = 0;
    }
    slideT = Math.min(1, slideT + dt / SLIDE);
    const e = ease(slideT);
    const rate = simRate.update(run.time ?? 0, dt);
    live.clear();

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
        v.flash.texture = whiteOf(v.body.texture) ?? Texture.EMPTY; // the same size as the tile's: it scales with it
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
        // the attack's wind-up and follow-through (cells)
        const pose = v.egg ? null : windUp(v, t, run, dt, reduced, rate);
        if (pose) {
          const cell = GRID.cell * U;
          v.creature.scale.x *= pose.sx;
          v.creature.scale.y *= pose.sy;
          v.creature.position.x += pose.x * cell;
          v.creature.position.y -= pose.y * cell;
          v.creature.rotation += pose.rot;
        }
        // Pride Pounce: the cub leaps onto its prey and bounds back; from 32 its afterimage follows
        const L = v.leap ? leapAt(time - v.leap.t0, v.hop) : null;
        if (L) {
          v.creature.position.x += v.leap.dx * L.k * U;
          v.creature.position.y -= (v.leap.dy * L.k + L.lift) * U;
        } else v.leap = null;
        const step = L && t.cls.element === 'metal' ? LADDER.metal[ladderStage(t.tier)] : null;
        const n = step && has(step, 'ghosts') ? step.ghosts : 0;
        if (n || v.echo) {
          v.echo ??= createAfterimage(echoLayer, 3);
          v.echo.push(dt, v.c.position.x + v.creature.position.x, v.c.position.y + v.creature.position.y, v.creature.scale.x, v.creature.scale.y, v.creature.rotation);
          v.echo.draw(n, v.creature.texture, 0xffffff, 0.5, 1);
        }
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
        // photosafe: at most TILE_GLOW.glow, so a legend's colours taking turns stay below the threshold
        v.glow.alpha = Math.min(TILE_GLOW.glow, (els.length === 3 ? 0.6 : els.length === 2 ? 0.42 : 0.26) * (useArt ? 0.3 : 1));
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
        dropView(v);
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
        dropView(g.v);
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
      if (v) {
        v.punch = 1;
        v.wind = 0;
        v.follow = 1;
        if (e.target) {
          const dx = e.target.x - e.x;
          const dy = e.target.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          v.aim.x = dx / d;
          v.aim.y = dy / d;
          if (e.pattern === 'pounce' && v.creature.visible && !v.egg && !stage.reduced) v.leap = { t0: time, dx, dy };
        }
      }
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
    for (const v of views.values()) dropView(v);
    views.clear();
    for (const g of ghosts) dropView(g.v);
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
