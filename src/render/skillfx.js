// v2: draws what the fusion skills do (docs/v2/SPEC.md section 6).
//   - the instant effects, from `skillFx` events: ring (an expanding ring), burst (particles), beam
//     (a lance, a rail, a log, a charge: a band racing to its end), bolt (a jagged lightning bolt),
//     slam (a ground hit: a dust ring, cracks and dust), sweep (a sickle of wind across every lane),
//     text (a short floating word, tr('fx.<key>'))
//   - every frame, the skills' standing pieces from run.defense: zones by kind (lava, web, cloud, sand,
//     snow, twister, field), walls across lanes, flower traps, locust and spider minions, and tethers
//     from a summoned pet to a foe
// The new foe status marks are drawn with each foe (src/render/foes.js), the blocks' marks (rime
// armour, pollen, Moss Spring) with each block (src/render/blocks.js): they move with their sprites.
// Photosafe (src/ux/photosafe.js): every instant effect books its light first and is drawn thinner,
// smaller, fewer or not at all when the budget is short; nothing is additive. A standing piece never
// flashes: it rises over PIECE.rise, holds at least PIECE.hold and falls over PIECE.fall (its rise and
// its fall more than a second apart at any game speed), at alphas a stain or a haze would have.
// Reduce motion: nothing sweeps or races (an effect fades in place), zones and minions hold still.
// Light on phones: a piece is one container with a shape drawn once (again only when the stage
// resizes) that is moved, turned and faded each frame; at most CAPS of each are drawn.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { FIELD, GRID, laneX } from '../config.js';
import { ELEMENTS, fusionOf } from '../sim/classes.js';
import { has, tr } from '../i18n/index.js';
import { tone } from '../art/tokens.js';
import { BURST, DOT, LINE, TEXT, textInk } from '../ux/photosafe.js';
import { softDot } from './textures.js';
import { blobPts, hash01i, smooth } from './vfx-fallback.js';

const INK = 0x2b1d2e;
const CREAM = 0xfffaf2;
const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c ?? '#ffffff').replace('#', ''), 16));
const css = (n) => `#${n.toString(16).padStart(6, '0')}`;
const toneN = (c, k) => hex(tone(css(hex(c)), k));
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => 1 - (1 - clamp01(k)) ** 3;

/** A minion is drawn this much bigger than its shape (about 0.6 world units long: it reads on a phone). */
const MINION_SIZE = 1.35;
/** A standing piece's life (real seconds): rise, the least it holds, fall. */
export const PIECE = { rise: 0.45, hold: 1.2, fall: 0.7 };
/** The most of each drawn at once (the rest are skipped: phones stay light). */
export const CAPS = { zones: 12, walls: 8, traps: 16, minions: 32, tethers: 12, lines: 24, texts: 6 };
/** The zones' looks: their most alpha (a ground stain, an air haze), how many bits they draw. */
export const ZONE = { lava: 0.88, web: 0.8, field: 0.5, fill: 0.08, haze: 0.42, puffs: 7, flakes: 36, streaks: 10, snowHaze: 4 };
/** The zone kinds drawn in the air over the foes (the rest lie on the ground under them). */
export const AIR = new Set(['cloud', 'sand', 'snow', 'twister']);
/**
 * The instant effects (world units, seconds): a ring's stroke and life, a beam's race and life, a bolt's
 * width and life, a slam's life and cracks, a sweep's crossing, a word's height and life.
 */
export const SKILL_FX = {
  ring: { w: 0.12, ink: 0.06, life: 0.5 },
  beam: { race: 0.12, life: 0.45, core: 0.35 },
  bolt: { w: 0.22, core: 0.08, life: 0.32, step: 0.6, jag: 0.32 },
  slam: { w: 0.14, life: 0.6, cracks: 6, crackLife: 0.9 },
  sweep: { cross: 0.38, life: 0.55, span: 9.2 },
  text: { h: 0.42, life: 0.9, rise: 0.9, pop: 1.25 },
};

/** The textures and the word maker skillfx draws with (tests pass stand-ins: Node has no canvas text). */
const SKILL_TEXTURES = {
  softDot,
  text: (word) => new Text({ text: word, style: { fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif', fontWeight: '800', fontSize: 44, fill: 0xffffff, stroke: { color: INK, width: 9, join: 'round' } } }),
};

/** A skill word's text: tr('fx.<key>') (a key may come with its 'fx.' or without); a key the tables lack yet shows as its own words ("shatter" → "Shatter"). */
export function fxWord(key) {
  const k = String(key ?? '');
  const full = k.startsWith('fx.') ? k : `fx.${k}`;
  if (has(full)) return tr(full);
  const bare = full.slice(3).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').trim().toLowerCase();
  return bare ? bare[0].toUpperCase() + bare.slice(1) : '';
}

/** Points of a jagged bolt from (x0, y0) to (x1, y1): a bend every SKILL_FX.bolt.step, each up to `jag` to the side (seeded). */
export function boltPoints(x0, y0, x1, y1, seed = 1) {
  const B = SKILL_FX.bolt;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.round(L / B.step));
  const nx = L > 0 ? -(y1 - y0) / L : 0;
  const ny = L > 0 ? (x1 - x0) / L : 0;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const off = i === 0 || i === n ? 0 : (hash01i(seed * 131 + i) - 0.5) * 2 * B.jag;
    pts.push({ x: x0 + (x1 - x0) * f + nx * off, y: y0 + (y1 - y0) * f + ny * off });
  }
  return pts;
}

/** A standing piece's alpha `age` s after it appeared, `gone` s after the sim dropped it (null while it stands). */
export function pieceAlpha(age, gone = null) {
  const rise = clamp01(age / PIECE.rise);
  if (gone == null) return rise;
  return rise * clamp01(1 - gone / PIECE.fall);
}

export function createSkillFx({ stage, fx, art = null, tx = SKILL_TEXTURES } = {}) {
  const { layers } = stage;
  const ground = new Container(); // ground zones: under the foes (over the lanes, the decals and puddles)
  layers.path.addChild(ground);
  const air = new Container(); // air zones and tethers: over the foes, under the shots' bits
  layers.shots.addChild(air);
  const lineLayer = new Container(); // instant lines and rings
  layers.fx.addChild(lineLayer);
  const textLayer = new Container();
  layers.numbers.addChild(textLayer);
  const depth = layers.enemies; // walls, traps and minions stand among the foes, by depth
  depth.sortableChildren = true;

  const zones = new Map();
  const walls = new Map();
  const traps = new Map();
  const minions = new Map();
  const tethers = new Map();
  const lines = []; // { g, t, life, draw(g, k, t) }
  const texts = []; // { o, x, y, t }
  const textPool = [];
  let time = 0;
  let serial = 0;
  let lastSim = null; // the sim's clock as last seen (a wall cracks on sim time)
  const idOf = new WeakMap(); // pieces the sim sent without an id

  const U = () => stage.view.U;
  const sx = (x) => stage.sx(x);
  const sy = (y) => stage.sy(y);
  const reduced = () => stage.reduced;

  // --- the standing pieces: one keyed view per sim piece, risen, held and fallen ------------------

  /**
   * Keep `map`'s views in step with the sim's `list`: a new piece makes its view, a kept one updates,
   * one the sim dropped holds until its least `hold` is up (a zone: PIECE.hold; a flower, a minion or
   * a wall ends at once: `end` bursts it), then falls; a fallen view is destroyed.
   */
  function keep(map, list, cap, make, update, end, hold = 0) {
    const seen = new Set();
    const items = list ?? [];
    for (let i = 0; i < items.length && seen.size < cap; i++) {
      const it = items[i];
      if (!it) continue;
      let id = it.id;
      if (id == null) {
        if (!idOf.has(it)) idOf.set(it, `auto${++serial}`);
        id = idOf.get(it);
      }
      seen.add(id);
      let v = map.get(id);
      if (v && it.kind != null && v.kind != null && it.kind !== v.kind && (map === zones || map === minions)) {
        // the sim gave this id to another kind of piece: a new view for it
        v.c.destroy({ children: true });
        map.delete(id);
        v = null;
      }
      if (!v) {
        v = make(it);
        if (!v) continue;
        v.age = 0;
        v.gone = null;
        map.set(id, v);
      } else if (v.gone != null) v.gone = null; // back again (the sim kept it after all)
      v.it = it;
    }
    for (const [id, v] of map) {
      v.age += v.dt;
      if (!seen.has(id)) {
        if (v.gone == null) {
          v.gone = 0;
          v.ended = false;
        }
        // a zone the sim drops early still holds its least time: its rise and fall a second apart
        const least = hold > 0 ? PIECE.rise + hold : 0;
        if (v.age < least) v.gone = 0;
        else v.gone += v.dt;
        if (!v.ended && v.age >= least) {
          v.ended = true;
          end?.(v);
        }
      } else v.ended = false;
      const a = pieceAlpha(v.age, v.gone);
      if (v.gone != null && v.gone >= PIECE.fall) {
        v.c.destroy({ children: true });
        map.delete(id);
        continue;
      }
      update(v, v.it, a);
    }
  }

  // --- zones -----------------------------------------------------------------------------------------

  /** `n` dashes round a circle of radius R at the origin, each `share` of its slot (each its own subpath: one stroke after). */
  function dashes(g, R, n, share) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      g.moveTo(Math.cos(a0) * R, Math.sin(a0) * R).arc(0, 0, R, a0, a0 + ((Math.PI * 2) / n) * share);
    }
  }

  function makeZone(z) {
    const c = new Container();
    const g = new Graphics();
    c.addChild(g);
    (AIR.has(z.kind) ? air : ground).addChild(c);
    const v = { c, g, kind: z.kind, color: hex(z.color ?? ELEMENTS.fire.color), U: 0, r: 0, seed: (hash01i(++serial) * 1000) | 0, bits: [], spin: 0, dt: 0 };
    // the bits that move: puffs of a cloud or a sandstorm, a blizzard's flakes, a twister's rings
    const dot = tx.softDot();
    const flakes = Math.max(10, Math.min(ZONE.flakes, Math.round((z.r ?? 3) ** 2 * 0.8))); // a blizzard over the whole field gets them all
    const n = z.kind === 'cloud' ? ZONE.puffs : z.kind === 'sand' ? ZONE.puffs + ZONE.streaks : z.kind === 'snow' ? ZONE.snowHaze + flakes : z.kind === 'lava' ? 3 : 0;
    for (let i = 0; i < n; i++) {
      const s = new Sprite(dot);
      s.anchor.set(0.5);
      c.addChild(s);
      v.bits.push({ s, a: hash01i(v.seed + i * 7) * Math.PI * 2, d: hash01i(v.seed + i * 13), k: hash01i(v.seed + i * 29) });
    }
    if (z.kind === 'twister') {
      v.rings = [0, 1, 2, 3, 4].map(() => {
        const r = new Graphics();
        c.addChild(r);
        return r;
      });
    }
    return v;
  }

  /** A zone's shape, drawn once for its radius and the stage's U (again when either changes). */
  function shapeZone(v, z) {
    const u = U();
    const R = Math.max(0.2, z.r ?? 1) * u;
    const g = v.g.clear();
    const col = v.color;
    if (v.kind === 'lava') {
      // a molten pool: a dark basalt rim, the red melt glowing yellow at its heart, dark crust plates
      // floating on it with bright seams between them
      const pts = (k, amp, seed, cx = 0, cy = 0) => blobPts(cx, cy, R * k, 11, amp, v.seed + seed);
      smooth(g, pts(1, 0.12, 1));
      g.fill({ color: 0x3a1d16 }).stroke({ width: 0.045 * u, color: INK, alpha: 0.8 });
      smooth(g, pts(0.86, 0.14, 2));
      g.fill({ color: 0xd2401d });
      smooth(g, pts(0.62, 0.18, 3));
      g.fill({ color: col });
      smooth(g, pts(0.34, 0.22, 4));
      g.fill({ color: 0xffe27a });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + v.seed * 0.01;
        const d = R * (0.52 + 0.12 * (i % 2));
        smooth(g, blobPts(Math.cos(a) * d, Math.sin(a) * d * 0.9, R * 0.17, 7, 0.3, v.seed + 10 + i));
        g.fill({ color: 0x4a2318 }).stroke({ width: 0.03 * u, color: 0xffb347, alpha: 0.9 });
      }
    } else if (v.kind === 'web') {
      // a spider web: spokes and sagging rings in cream threads, a faint venom tint inside
      const spokes = 8;
      g.circle(0, 0, R).fill({ color: col, alpha: 0.12 });
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + 0.2;
        g.moveTo(0, 0).lineTo(Math.cos(a) * R, Math.sin(a) * R);
      }
      for (const k of [0.3, 0.55, 0.8, 1]) {
        for (let i = 0; i <= spokes; i++) {
          const a0 = ((i % spokes) / spokes) * Math.PI * 2 + 0.2;
          const a1 = (((i + 1) % spokes) / spokes) * Math.PI * 2 + 0.2;
          const p0 = [Math.cos(a0) * R * k, Math.sin(a0) * R * k];
          const p1 = [Math.cos(a1) * R * k, Math.sin(a1) * R * k];
          const m = [(p0[0] + p1[0]) * 0.44, (p0[1] + p1[1]) * 0.44]; // it sags toward the middle
          if (i === 0) g.moveTo(p0[0], p0[1]);
          if (i < spokes) g.quadraticCurveTo(m[0], m[1], p1[0], p1[1]);
        }
      }
      g.stroke({ width: 0.035 * u, color: CREAM, alpha: 0.9, cap: 'round', join: 'round' });
      g.circle(0, 0, R * 0.08).fill({ color: toneN(col, -0.3) });
    } else if (v.kind === 'twister') {
      // its pull on the ground: a faint swirl round its eye
      dashes(g, R, 3, 1.4 / ((Math.PI * 2) / 3));
      g.stroke({ width: 0.05 * u, color: col, alpha: 0.45, cap: 'round' });
      g.circle(0, 0, R * 0.32).fill({ color: col, alpha: 0.12 });
    } else if (v.kind === 'snow') {
      g.circle(0, 0, R).fill({ color: 0xffffff, alpha: ZONE.fill });
    } else if (v.kind === 'cloud' || v.kind === 'sand') {
      g.circle(0, 0, R).fill({ color: col, alpha: ZONE.fill });
    } else {
      // a field (and any kind the renderer does not know yet): a dashed ring round a faint fill
      g.circle(0, 0, R).fill({ color: col, alpha: ZONE.fill });
      dashes(g, R, Math.max(10, Math.round((Math.PI * 2 * R) / (0.5 * u))), 0.55);
      g.stroke({ width: 0.07 * u, color: col, alpha: 0.95, cap: 'round' });
    }
    v.U = u;
    v.r = z.r;
  }

  function updateZone(v, z, a) {
    const u = U();
    if (v.U !== u || v.r !== z.r) shapeZone(v, z);
    const still = reduced();
    v.c.position.set(sx(z.x), sy(z.y));
    const R = Math.max(0.2, z.r ?? 1) * u;
    const t = time;
    const most = v.kind === 'lava' ? ZONE.lava : v.kind === 'web' ? ZONE.web : v.kind === 'field' ? ZONE.field : 1;
    v.c.alpha = a * most;
    if (v.kind === 'field' && !still) v.g.rotation = t * 0.25;
    if (v.kind === 'web' && !still) v.g.rotation = Math.sin(t * 0.8 + v.seed) * 0.02;
    if (v.kind === 'twister') {
      // a funnel of rings over its eye, widening as it rises, swaying, turning
      const col = v.color;
      v.rings.forEach((r, i) => {
        const w = (0.35 + i * 0.3) * u;
        const y = -(0.25 + i * 0.42) * u;
        const sway = still ? 0 : Math.sin(t * 5 + i * 0.9) * 0.12 * u * (i / 4);
        r.clear()
          .ellipse(sway, y, w, w * 0.32)
          .stroke({ width: 0.11 * u, color: col, alpha: 0.85 })
          .ellipse(sway, y, w * 0.86, w * 0.26)
          .stroke({ width: 0.04 * u, color: CREAM, alpha: 0.9 });
      });
      if (!still) v.g.rotation = t * 1.4;
    }
    // the bits: puffs drift round, flakes fall, sand streaks blow across, lava bubbles swell and pop
    for (let i = 0; i < v.bits.length; i++) {
      const b = v.bits[i];
      const s = b.s;
      if (v.kind === 'cloud') {
        const ang = b.a + (still ? 0 : t * (0.18 + b.k * 0.2));
        const d = R * (0.15 + b.d * 0.5);
        s.position.set(Math.cos(ang) * d, Math.sin(ang) * d * 0.8);
        s.width = s.height = R * (0.8 + b.k * 0.6);
        s.tint = i % 3 === 2 ? toneN(v.color, -0.25) : v.color;
        s.alpha = ZONE.haze * (0.8 + 0.2 * Math.sin(t * 0.9 + i));
      } else if (v.kind === 'sand') {
        if (i < ZONE.puffs) {
          const ang = b.a + (still ? 0 : t * 0.3);
          const d = R * (0.2 + b.d * 0.5);
          s.position.set(Math.cos(ang) * d, Math.sin(ang) * d * 0.7);
          s.width = s.height = R * (0.7 + b.k * 0.5);
          s.tint = i % 2 ? toneN(v.color, -0.3) : v.color; // ochre and sand: the storm darkens the lane
          s.alpha = ZONE.haze;
        } else {
          // a streak blowing across, wrapping inside the storm: dark grit and pale dust in turn, so it reads on the sand lanes
          const span = 2 * R;
          const x = still ? (b.d - 0.5) * span : ((((b.d + t * (0.35 + b.k * 0.3)) % 1) + 1) % 1 - 0.5) * span;
          const y = (b.k - 0.5) * 1.6 * R;
          const inside = Math.max(0, 1 - (x * x + y * y) / (R * R));
          s.position.set(x, y);
          s.width = 0.65 * u;
          s.height = 0.1 * u;
          s.tint = i % 2 ? 0x8a6a3c : toneN(v.color, 0.45);
          s.alpha = 0.85 * Math.sqrt(inside);
        }
      } else if (v.kind === 'snow' && i < ZONE.snowHaze) {
        // a white haze drifting through the blizzard (the whiteout), under its flakes
        const ang = b.a + (still ? 0 : t * 0.12);
        const d = R * (0.2 + b.d * 0.45);
        s.position.set(Math.cos(ang) * d, Math.sin(ang) * d * 0.8);
        s.width = s.height = R * (0.9 + b.k * 0.5);
        s.tint = 0xffffff;
        s.alpha = ZONE.haze * 0.55;
      } else if (v.kind === 'snow') {
        // flakes falling slant through the blizzard, wrapping inside it
        const fall = still ? b.d : (((b.d + t * (0.12 + b.k * 0.1)) % 1) + 1) % 1;
        const x = (b.k - 0.5) * 2 * R + (still ? 0 : Math.sin(t * 1.3 + i) * 0.2 * u) - fall * 0.4 * R;
        const y = (fall - 0.5) * 2 * R;
        const inside = Math.max(0, 1 - (x * x + y * y) / (R * R));
        s.position.set(x, y);
        s.width = s.height = (0.16 + b.k * 0.1) * u;
        s.tint = 0xf4fbff;
        s.alpha = 0.95 * Math.sqrt(inside);
      } else if (v.kind === 'lava') {
        const cycle = still ? 0.5 : (t * (0.45 + b.k * 0.3) + b.d) % 1;
        s.position.set(Math.cos(b.a) * R * 0.45 * b.d, Math.sin(b.a) * R * 0.45 * b.d);
        s.width = s.height = (0.18 + cycle * 0.3) * u;
        s.tint = toneN(v.color, 0.6);
        s.alpha = 0.75 * Math.sin(cycle * Math.PI);
      }
    }
    // a twister's flame specks whirl up its funnel (booked, small)
    if (v.kind === 'twister' && !still && a > 0.5 && Math.random() < v.dt * 6 && fx.flashAll(DOT.share * 0.18 * 0.18, 0.5)) {
      const up = Math.random() * 1.8;
      const side = Math.random() < 0.5 ? -1 : 1;
      fx.particle(tx.softDot(), z.x + side * (0.2 + up * 0.35), z.y + 0.2 + up, { vx: -side * 1.4, vy: 0.9, life: 0.5, size: 0.18, grow: -0.12, color: Math.random() < 0.5 ? 0xffd36b : v.color });
    }
    // embers off the lava now and then (booked, small)
    if (v.kind === 'lava' && !still && a > 0.5 && Math.random() < v.dt * 2.5 && fx.flashAll(DOT.share * 0.16 * 0.16, 0.6)) {
      const ang = Math.random() * Math.PI * 2;
      fx.particle(tx.softDot(), z.x + Math.cos(ang) * (z.r ?? 1) * 0.5, z.y + Math.sin(ang) * (z.r ?? 1) * 0.4, { vy: 1.2, vx: (Math.random() - 0.5) * 0.4, life: 0.6, size: 0.16, grow: -0.1, color: Math.random() < 0.5 ? 0xffd36b : 0xff7a3d });
    }
  }

  // --- walls: a glacier across its lanes, rising from the ground, cracking as it ages, shattering ----

  function makeWall(w) {
    const c = new Container();
    c.skillDepth = true; // drawn among the foes by its base line (src/kv/roam.js leaves it be)
    const g = new Graphics();
    const cracks = new Graphics();
    c.addChild(g, cracks);
    depth.addChild(c);
    return { c, g, cracks, color: hex(w.color ?? '#9fc5e8'), U: 0, key: '', born: time, dt: 0 };
  }

  function shapeWall(v, w) {
    const u = U();
    const lanes = [...(w.lanes ?? [])].sort((a, b) => a - b);
    v.key = lanes.join(',');
    v.U = u;
    const g = v.g.clear();
    const cr = v.cracks.clear();
    if (!lanes.length) return;
    const x0 = laneX(lanes[0]);
    v.cx = (x0 + laneX(lanes.at(-1))) / 2;
    const col = v.color;
    const half = GRID.cell * 0.48 * u;
    const H = 1.35 * u;
    for (const l of lanes) {
      const x = (laneX(l) - v.cx) * u;
      // an ice block: its face, a darker right facet, a light top, an ink outline; icicles at its foot
      g.roundRect(x - half, -H, 2 * half, H, 0.16 * u).fill({ color: toneN(col, 0.25) }).stroke({ width: 0.05 * u, color: INK });
      g.moveTo(x + half * 0.35, -H + 0.06 * u).lineTo(x + half - 0.03 * u, -H * 0.62).lineTo(x + half - 0.03 * u, -0.05 * u).lineTo(x + half * 0.2, -0.05 * u).closePath().fill({ color: toneN(col, -0.12), alpha: 0.9 });
      g.roundRect(x - half + 0.08 * u, -H + 0.08 * u, 2 * half - 0.16 * u, 0.22 * u, 0.08 * u).fill({ color: 0xffffff, alpha: 0.75 });
      g.moveTo(x - half * 0.6, -H * 0.75).lineTo(x - half * 0.25, -H * 0.42).stroke({ width: 0.06 * u, color: 0xffffff, alpha: 0.85, cap: 'round' });
      for (let i = 0; i < 3; i++) {
        const ix = x - half * 0.6 + i * half * 0.6;
        g.moveTo(ix - 0.08 * u, 0).lineTo(ix, 0.16 * u).lineTo(ix + 0.08 * u, 0).closePath().fill({ color: toneN(col, 0.4) });
      }
      // its cracks, shown as it nears its end
      cr.moveTo(x - half * 0.1, -H * 0.95).lineTo(x + half * 0.15, -H * 0.62).lineTo(x - half * 0.05, -H * 0.4).lineTo(x + half * 0.3, -H * 0.12);
      cr.moveTo(x + half * 0.15, -H * 0.62).lineTo(x + half * 0.55, -H * 0.55);
    }
    cr.stroke({ width: 0.035 * u, color: INK, alpha: 0.8, cap: 'round', join: 'round' });
  }

  function updateWall(v, w, a) {
    const lanes = [...(w.lanes ?? [])].sort((p, q) => p - q).join(',');
    if (v.U !== U() || v.key !== lanes) shapeWall(v, w);
    const y = sy(w.y ?? FIELD.gateY);
    v.c.position.set(sx(v.cx ?? 0), y);
    v.c.zIndex = y;
    // it rises from the ground (with a little overshoot), and sinks as it melts away
    const still = reduced();
    const rise = still ? 1 : 1 + Math.sin(clamp01(v.age / 0.3) * Math.PI) * 0.06;
    const up = still ? 1 : ease(v.age / 0.25);
    const sink = v.gone != null && !still ? 1 - ease(v.gone / PIECE.fall) * 0.5 : 1;
    v.c.scale.set(1, up * rise * sink);
    v.c.alpha = a;
    // it cracks over the last quarter of its time (its sim `dur`, on the sim's clock)
    const dur = w.dur ?? 6;
    const lived = v.simAge ?? 0;
    v.simAge = lived + (v.simDt ?? 0);
    v.cracks.alpha = v.gone != null ? 1 : clamp01((v.simAge / Math.max(0.1, dur) - 0.72) / 0.2);
  }

  function endWall(v) {
    // it bursts: ice shards fly where each block stood
    const it = v.it;
    for (const l of it.lanes ?? []) fx.burst(laneX(l), (it.y ?? 0) + 0.6, [v.color, 0xffffff, toneN(v.color, 0.4)], 10, { speed: 4.5, size: 0.26, life: 0.5, gravity: -9 });
  }

  // --- traps: flowers in the foes' path ------------------------------------------------------------

  function makeTrap(p) {
    const c = new Container();
    c.skillDepth = true;
    const ring = new Graphics();
    const flower = new Graphics();
    c.addChild(ring, flower);
    depth.addChild(c);
    return { c, ring, flower, color: hex(p.color ?? '#7fffd4'), U: 0, r: 0, seed: ++serial, dt: 0 };
  }

  function shapeTrap(v, p) {
    const u = U();
    v.U = u;
    v.r = p.r;
    const col = v.color;
    // its reach on the ground: a dashed ring
    const R = Math.max(0.3, p.r ?? 1) * u;
    v.ring.clear();
    dashes(v.ring, R, Math.max(8, Math.round((Math.PI * 2 * R) / (0.45 * u))), 0.45);
    v.ring.stroke({ width: 0.05 * u, color: col, alpha: 0.9, cap: 'round' });
    // the flower: a stem and two leaves, five petals in its colour round a cream heart, ink outlines
    const f = v.flower.clear();
    const s = 0.34 * u;
    f.moveTo(0, 0).quadraticCurveTo(0.04 * u, -0.25 * u, 0, -0.42 * u).stroke({ width: 0.05 * u, color: 0x2e8b57, cap: 'round' });
    f.ellipse(-0.1 * u, -0.16 * u, 0.1 * u, 0.045 * u).fill({ color: 0x5fbf4a }).stroke({ width: 0.02 * u, color: INK });
    f.ellipse(0.1 * u, -0.22 * u, 0.1 * u, 0.045 * u).fill({ color: 0x5fbf4a }).stroke({ width: 0.02 * u, color: INK });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      f.ellipse(Math.cos(a) * s * 0.42, -0.5 * u + Math.sin(a) * s * 0.42, s * 0.3, s * 0.3).fill({ color: col }).stroke({ width: 0.025 * u, color: INK });
    }
    f.circle(0, -0.5 * u, s * 0.24).fill({ color: CREAM }).stroke({ width: 0.025 * u, color: INK });
    f.circle(0, -0.5 * u, s * 0.08).fill({ color: toneN(col, -0.35) });
  }

  function updateTrap(v, p, a) {
    if (v.U !== U() || v.r !== p.r) shapeTrap(v, p);
    const y = sy(p.y);
    v.c.position.set(sx(p.x), y);
    v.c.zIndex = y;
    v.c.alpha = a;
    const still = reduced();
    const pop = still ? 1 : 1 + Math.sin(clamp01(v.age / 0.3) * Math.PI) * 0.25;
    v.flower.scale.set(ease(still ? 1 : v.age / 0.3) * pop);
    v.flower.rotation = still ? 0 : Math.sin(time * 1.6 + v.seed) * 0.08;
    v.ring.alpha = 0.3 + (still ? 0 : 0.1 * Math.sin(time * 2 + v.seed));
  }

  function endTrap(v) {
    const it = v.it;
    fx.burst(it.x, it.y + 0.5, [v.color, CREAM, 0x5fbf4a], 10, { speed: 3.5, size: 0.24, life: 0.45, gravity: -5 });
  }

  // --- minions: ember locusts and spiderlings, among the foes ---------------------------------------

  function makeMinion(m) {
    const c = new Container();
    c.skillDepth = true;
    const shadow = new Graphics();
    const body = new Graphics();
    c.addChild(shadow, body);
    depth.addChild(c);
    return { c, shadow, body, kind: m.kind === 'spider' ? 'spider' : 'locust', color: hex(m.color ?? '#d4e157'), U: 0, x: m.x, y: m.y, face: 1, step: hash01i(++serial) * 6, moved: 0, dt: 0 };
  }

  function shapeMinion(v) {
    const u = U();
    v.U = u;
    const col = v.color;
    v.shadow.clear().ellipse(0, 0, 0.24 * u, 0.08 * u).fill({ color: INK, alpha: 0.28 });
    const b = v.body.clear();
    if (v.kind === 'spider') {
      // a spiderling: eight legs, a round body and a head with two bright eyes
      for (let i = 0; i < 4; i++) {
        const yy = (-0.06 + i * 0.05) * u;
        b.moveTo(-0.05 * u, yy).lineTo(-0.2 * u, yy - 0.08 * u).lineTo(-0.27 * u, yy + 0.05 * u);
        b.moveTo(0.05 * u, yy).lineTo(0.2 * u, yy - 0.08 * u).lineTo(0.27 * u, yy + 0.05 * u);
      }
      b.stroke({ width: 0.035 * u, color: INK, cap: 'round', join: 'round' });
      b.circle(-0.04 * u, -0.04 * u, 0.13 * u).fill({ color: col }).stroke({ width: 0.03 * u, color: INK });
      b.circle(0.1 * u, -0.06 * u, 0.08 * u).fill({ color: toneN(col, -0.25) }).stroke({ width: 0.03 * u, color: INK });
      b.circle(0.12 * u, -0.08 * u, 0.022 * u).circle(0.08 * u, -0.08 * u, 0.022 * u).fill({ color: 0xffffff });
    } else {
      // an ember locust: a long body in its colour, a darker head, cream wings (they beat: scale), ember dots
      b.ellipse(-0.02 * u, -0.06 * u, 0.2 * u, 0.08 * u).fill({ color: col }).stroke({ width: 0.03 * u, color: INK });
      b.circle(0.17 * u, -0.08 * u, 0.07 * u).fill({ color: toneN(col, -0.3) }).stroke({ width: 0.03 * u, color: INK });
      b.circle(0.19 * u, -0.1 * u, 0.018 * u).fill({ color: 0xffffff });
      b.circle(-0.1 * u, -0.06 * u, 0.025 * u).circle(-0.02 * u, -0.05 * u, 0.025 * u).fill({ color: 0xff7a3d });
      v.wings ??= new Graphics();
      if (!v.wings.parent) v.c.addChild(v.wings);
      v.wings.clear().ellipse(-0.04 * u, -0.16 * u, 0.15 * u, 0.06 * u).fill({ color: CREAM, alpha: 0.85 }).stroke({ width: 0.02 * u, color: INK, alpha: 0.8 });
    }
  }

  function updateMinion(v, m, a) {
    if (v.U !== U()) shapeMinion(v);
    v.c.scale.set(MINION_SIZE);
    const u = U();
    const still = reduced();
    const dx = m.x - v.x;
    const moving = Math.hypot(dx, m.y - v.y) > 1e-4;
    if (Math.abs(dx) > 1e-3) v.face = dx > 0 ? 1 : -1;
    v.x = m.x;
    v.y = m.y;
    v.moved = moving ? 0.15 : Math.max(0, v.moved - v.dt);
    const y = sy(m.y);
    v.c.position.set(sx(m.x), y);
    v.c.zIndex = y;
    v.c.alpha = a;
    v.step += v.dt * (v.moved > 0 ? 14 : 3);
    const pop = still ? 1 : ease(v.age / 0.2);
    const flyer = v.kind === 'locust';
    const hover = flyer ? (0.32 + (still ? 0 : Math.sin(v.step * 0.5) * 0.05)) * u : 0;
    v.body.position.set(0, -hover);
    v.body.scale.set(v.face * pop, pop * (still || flyer ? 1 : 1 + Math.sin(v.step) * 0.06));
    if (v.wings) {
      v.wings.position.set(0, -hover);
      v.wings.scale.set(v.face * pop, pop * (still ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(v.step * 2))));
    }
    v.shadow.scale.set(flyer ? 0.8 : 1);
  }

  function endMinion(v) {
    fx.burst(v.x, v.y + 0.3, [v.color, 0xffffff], 6, { speed: 2.5, size: 0.2, life: 0.35, gravity: -3 });
  }

  // --- tethers: from a summoned pet to its foe ---------------------------------------------------------

  function makeTether(t) {
    const c = new Container();
    const g = new Graphics();
    c.addChild(g);
    air.addChild(c);
    return { c, g, seed: hash01i(++serial) * 6, color: 0xffffff, a: null, b: null, dt: 0 };
  }

  function updateTether(v, t, a, run) {
    const tile = run.tiles.find((x) => x.id === t.tileId);
    const foe = (run.enemies ?? []).find((e) => e.id === t.enemyId);
    // the ends as last seen: a gone foe or pet leaves the tether where it was while it fades
    if (tile?.summon) v.a = { x: tile.summon.x, y: tile.summon.y + 0.55 };
    if (foe && !foe.dead) v.b = { x: foe.x, y: foe.y + 0.3 };
    if (tile) v.color = hex(fusionOf(tile.cls)?.color ?? ELEMENTS[tile.cls?.element]?.color ?? '#ffffff');
    const g = v.g.clear();
    v.c.alpha = a;
    if (!v.a || !v.b) return;
    const u = U();
    const still = reduced();
    const x0 = sx(v.a.x);
    const y0 = sy(v.a.y);
    const x1 = sx(v.b.x);
    const y1 = sy(v.b.y);
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 2) return;
    const nx = -(y1 - y0) / L;
    const ny = (x1 - x0) / L;
    const n = Math.max(6, Math.round(L / (0.25 * u)));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const w = Math.sin(f * Math.PI) * 0.12 * u * Math.sin(f * Math.PI * 3 + (still ? 0 : time * 6) + v.seed);
      pts.push([x0 + (x1 - x0) * f + nx * w, y0 + (y1 - y0) * f + ny * w]);
    }
    const path = () => pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    path();
    g.stroke({ width: 0.14 * u, color: INK, alpha: 0.85, cap: 'round', join: 'round' });
    path();
    g.stroke({ width: 0.08 * u, color: v.color, cap: 'round', join: 'round' });
    // where it holds its foe: a clamp ring
    g.circle(x1, y1, 0.16 * u).stroke({ width: 0.06 * u, color: INK }).circle(x1, y1, 0.16 * u).stroke({ width: 0.03 * u, color: v.color });
  }

  // --- the instant effects ---------------------------------------------------------------------------

  /** A line effect drawn each frame of its life: draw(g, k (0–1 of its life), t s). */
  function line(life, draw) {
    if (lines.length >= CAPS.lines) {
      const old = lines.shift();
      old.g.destroy();
    }
    const g = new Graphics();
    lineLayer.addChild(g);
    const l = { g, t: 0, life, draw };
    lines.push(l);
    draw(g, 0, 0);
    return l;
  }

  function ring(e, color) {
    const r = Math.max(0.3, e.r ?? 1);
    const S = SKILL_FX.ring;
    const k = fx.flashShare(2 * Math.PI * r * (S.w + S.ink), S.life, LINE.minShare); // its ink edge changes the ground too
    if (!k) return;
    const w = S.w * k;
    const ink = S.ink * k;
    const still = reduced();
    line(S.life, (g, f) => {
      const u = U();
      const rr = (still ? r : r * (0.3 + 0.7 * ease(f / 0.6))) * u;
      const alpha = f < 0.4 ? 1 : 1 - (f - 0.4) / 0.6;
      g.clear().circle(sx(e.x), sy(e.y), rr).stroke({ width: (w + ink) * u, color: INK, alpha: alpha * 0.5 }).circle(sx(e.x), sy(e.y), rr).stroke({ width: w * u, color, alpha });
    });
  }

  function burst(e, color) {
    const n = Math.max(1, Math.min(40, Math.round(e.n ?? 12)));
    const still = reduced();
    fx.burst(e.x, e.y, [color, 0xffffff, toneN(color, 0.4)], n, { speed: still ? 1 : 5, size: 0.28, life: 0.55, gravity: still ? 0 : -3 });
  }

  function beam(e, color) {
    const B = SKILL_FX.beam;
    const x1 = e.x1 ?? e.x;
    const y1 = e.y1 ?? e.y;
    const w0 = Math.max(0.1, e.w ?? 0.5);
    const len = Math.hypot(x1 - e.x, y1 - e.y);
    const k = fx.flashShare(len * w0, B.life, LINE.minShare);
    if (!k) return;
    const w = w0 * k;
    const still = reduced();
    line(B.life, (g, f, t) => {
      const u = U();
      const head = still ? 1 : ease(t / B.race);
      const hx = e.x + (x1 - e.x) * head;
      const hy = e.y + (y1 - e.y) * head;
      const alpha = f < 0.5 ? 1 : 1 - (f - 0.5) / 0.5;
      const thin = 1 - 0.35 * f; // it narrows as it fades
      g.clear()
        .moveTo(sx(e.x), sy(e.y))
        .lineTo(sx(hx), sy(hy))
        .stroke({ width: w * thin * u, color, alpha: alpha * 0.75, cap: 'round' })
        .moveTo(sx(e.x), sy(e.y))
        .lineTo(sx(hx), sy(hy))
        .stroke({ width: w * B.core * thin * u, color: CREAM, alpha, cap: 'round' });
    });
    fx.burst(x1, y1, [color, 0xffffff], 6, { speed: 3, size: 0.22, life: 0.35, gravity: 0 });
  }

  function bolt(e, color) {
    const B = SKILL_FX.bolt;
    const x1 = e.x1 ?? e.x;
    const y1 = e.y1 ?? e.y;
    const pts = boltPoints(e.x, e.y, x1, y1, ++serial);
    const len = Math.hypot(x1 - e.x, y1 - e.y) * 1.15;
    const k = fx.flashShare(len * B.w, B.life, LINE.minShare);
    if (!k) return;
    line(B.life, (g, f) => {
      const u = U();
      const alpha = f < 0.35 ? 1 : 1 - (f - 0.35) / 0.65; // it fades, never flickers
      const path = () => pts.forEach((p, i) => (i ? g.lineTo(sx(p.x), sy(p.y)) : g.moveTo(sx(p.x), sy(p.y))));
      g.clear();
      path();
      g.stroke({ width: B.w * k * u, color, alpha, cap: 'round', join: 'round' });
      path();
      g.stroke({ width: B.core * k * u, color: 0xffffff, alpha, cap: 'round', join: 'round' });
    });
    if (fx.flashAll(2 * BURST.spark * 0.3 * 0.3, 0.3)) fx.burst(x1, y1, [color, 0xffffff], 4, { speed: 2.5, size: 0.24, life: 0.3, gravity: 0 });
  }

  function slam(e, color) {
    const S = SKILL_FX.slam;
    const r = Math.max(0.4, e.r ?? 1.2);
    const k = fx.flashShare(2 * Math.PI * r * S.w + S.cracks * r * 0.7 * 0.05, S.crackLife, LINE.minShare);
    if (!k) return;
    const still = reduced();
    const dust = toneN(color, 0.55);
    const seed = ++serial;
    line(S.crackLife, (g, f, t) => {
      const u = U();
      const cx = sx(e.x);
      const cy = sy(e.y);
      g.clear();
      // the ground cracks from where it hit
      const ca = 1 - f;
      for (let i = 0; i < S.cracks; i++) {
        const a = (i / S.cracks) * Math.PI * 2 + hash01i(seed + i) * 0.6;
        const L = r * (0.45 + hash01i(seed * 3 + i) * 0.35) * u;
        g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * L * 0.5 + Math.sin(a) * 0.08 * u, cy + Math.sin(a) * L * 0.5).lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      }
      g.stroke({ width: 0.05 * k * u, color: INK, alpha: 0.75 * ca, cap: 'round', join: 'round' });
      // the dust ring rolls out over the first part of its life
      const rf = clamp01(t / S.life);
      if (rf < 1) {
        const rr = (still ? r : r * (0.25 + 0.75 * ease(rf))) * u;
        g.circle(cx, cy, rr).stroke({ width: S.w * k * u, color: dust, alpha: 1 - rf });
      }
    });
    if (!still) stage.shake?.(3);
    if (fx.flashAll(4 * DOT.share * 0.4 * 0.4, 0.5)) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        fx.particle(tx.softDot(), e.x + Math.cos(a) * r * 0.5, e.y + Math.sin(a) * r * 0.4, { vx: still ? 0 : Math.cos(a) * 1.5, vy: still ? 0 : Math.sin(a) * 1.2 + 0.4, life: 0.5, size: 0.4, grow: 0.2, color: dust, alpha: 0.7, drag: 2 });
      }
    }
  }

  function sweep(e, color) {
    const S = SKILL_FX.sweep;
    const w = Math.max(0.15, e.w ?? 0.6);
    const k = fx.flashShare(S.span * w * 0.5, S.life, LINE.minShare); // the crescent is drawn tapering: half its band lights
    if (!k) return;
    const still = reduced();
    const y = e.y ?? 12;
    const x0 = -S.span / 2;
    line(S.life, (g, f, t) => {
      const u = U();
      const head = still ? 1 : ease(t / S.cross);
      const hx = x0 + S.span * head;
      const tail = Math.max(x0, hx - (still ? S.span : 4.5));
      const alpha = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4;
      g.clear();
      // a sickle of wind: a crescent bowed toward the gates, thickest at its head
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = i / n;
        const b = (i + 1) / n;
        const xa = tail + (hx - tail) * a;
        const xb = tail + (hx - tail) * b;
        const bow = (x) => Math.sin(((x - tail) / Math.max(0.01, hx - tail)) * Math.PI) * w * 0.8;
        g.moveTo(sx(xa), sy(y + bow(xa))).lineTo(sx(xb), sy(y + bow(xb))).stroke({ width: w * k * u * (0.25 + 0.75 * b), color, alpha: alpha * (0.3 + 0.7 * b), cap: 'round' });
      }
      g.moveTo(sx(Math.max(tail, hx - 1.2)), sy(y)).lineTo(sx(hx), sy(y)).stroke({ width: w * 0.3 * k * u, color: CREAM, alpha, cap: 'round' });
    });
  }

  function text(e, color) {
    const word = fxWord(e.key);
    if (!word || e.x == null) return;
    const T = SKILL_FX.text;
    const u = U();
    const px = Math.max(TEXT.minPx, T.h * u);
    if (!fx.flashAll(textInk(word, px, u), T.life)) return; // whole, or not at all (textInk books its pop: TEXT.peak)
    let o = textPool.pop();
    if (!o) o = tx.text(word);
    else if ('text' in o) o.text = word;
    o.anchor?.set?.(0.5);
    textLayer.addChild(o);
    o.visible = true;
    o.tint = color === 0xffffff ? 0xffffff : liftTint(color);
    if (texts.length >= CAPS.texts) recycle(texts.shift());
    texts.push({ o, x: e.x, y: (e.y ?? 0) + 0.6, t: 0, px });
  }

  const liftTint = (c) => {
    const lift = (v) => Math.round(v * 0.6 + 255 * 0.4);
    return (lift((c >> 16) & 255) << 16) | (lift((c >> 8) & 255) << 8) | lift(c & 255);
  };

  function recycle(tt) {
    tt.o.visible = false;
    textPool.push(tt.o);
  }

  // --- the frame -------------------------------------------------------------------------------------

  function onEvent(e) {
    if (e?.type !== 'skillFx') return;
    const color = hex(e.color ?? '#ffffff');
    switch (e.fx) {
      case 'ring':
        return ring(e, color);
      case 'burst':
        return burst(e, color);
      case 'beam':
        return beam(e, color);
      case 'bolt':
        return bolt(e, color);
      case 'slam':
        return slam(e, color);
      case 'sweep':
        return sweep(e, color);
      case 'text':
        return text(e, color);
      default:
        return undefined;
    }
  }

  function update(run, dt) {
    time += dt;
    const d = run?.defense ?? {};
    const simNow = run?.time ?? time;
    const simDt = Math.max(0, simNow - (lastSim ?? simNow));
    lastSim = simNow;
    for (const map of [zones, walls, traps, minions, tethers])
      for (const v of map.values()) {
        v.dt = dt;
        v.simDt = simDt;
      }
    keep(zones, d.zones ?? run?.zones, CAPS.zones, (z) => { const v = makeZone(z); v.dt = dt; return v; }, updateZone, null, PIECE.hold);
    keep(walls, d.walls ?? run?.walls, CAPS.walls, (w) => { const v = makeWall(w); v.dt = dt; v.simDt = simDt; return v; }, updateWall, endWall);
    keep(traps, d.traps ?? run?.traps, CAPS.traps, (p) => { const v = makeTrap(p); v.dt = dt; return v; }, updateTrap, endTrap);
    keep(minions, d.minions ?? run?.minions, CAPS.minions, (m) => { const v = makeMinion(m); v.dt = dt; return v; }, updateMinion, endMinion);
    keep(tethers, d.tethers ?? run?.tethers, CAPS.tethers, (t) => { const v = makeTether(t); v.dt = dt; return v; }, (v, t, a) => updateTether(v, t, a, run));
    // the instant lines, and the words floating up
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.t += dt;
      if (l.t >= l.life) {
        l.g.destroy();
        lines.splice(i, 1);
        continue;
      }
      l.draw(l.g, l.t / l.life, l.t);
    }
    const T = SKILL_FX.text;
    for (let i = texts.length - 1; i >= 0; i--) {
      const tt = texts[i];
      tt.t += dt;
      const f = tt.t / T.life;
      if (f >= 1) {
        recycle(tt);
        texts.splice(i, 1);
        continue;
      }
      const still = reduced();
      const pop = still || f > 0.15 ? 1 : T.pop - (T.pop - 1) * (f / 0.15);
      tt.o.position.set(sx(tt.x), sy(tt.y + (still ? 0 : T.rise * ease(f))));
      tt.o.scale.set((tt.px / 44) * pop);
      tt.o.alpha = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4;
    }
  }

  function reset() {
    for (const map of [zones, walls, traps, minions, tethers]) {
      for (const v of map.values()) v.c.destroy({ children: true });
      map.clear();
    }
    for (const l of lines) l.g.destroy();
    lines.length = 0;
    for (const tt of texts) recycle(tt);
    texts.length = 0;
    lastSim = null;
  }

  return {
    onEvent,
    update,
    reset,
    /** What is drawn now (for tests and checks): the standing pieces by kind, the live lines and words. */
    get drawn() {
      return {
        zones: [...zones.values()].map((v) => ({ kind: v.kind, alpha: v.c.alpha, layer: v.c.parent === air ? 'air' : 'ground', x: v.c.position.x, y: v.c.position.y })),
        walls: [...walls.values()].map((v) => ({ alpha: v.c.alpha, z: v.c.zIndex, scaleY: v.c.scale.y, cracks: v.cracks.alpha })),
        traps: [...traps.values()].map((v) => ({ alpha: v.c.alpha, z: v.c.zIndex })),
        minions: [...minions.values()].map((v) => ({ kind: v.kind, alpha: v.c.alpha, face: v.face, z: v.c.zIndex })),
        tethers: [...tethers.values()].map((v) => ({ alpha: v.c.alpha, a: v.a, b: v.b, color: v.color })),
        lines: lines.length,
        texts: texts.map((tt) => ({ word: tt.o.text, alpha: tt.o.alpha })),
      };
    },
  };
}
