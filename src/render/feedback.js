// Readable effect feedback, in the way RPGs and casual games show what just happened (the user, 2026-10-23:
// "heal have green +, ice lance have a trail and impact frame, etc"). On top of the attacks' own shapes
// (src/render/attacks.js, shots.js) and the foes' statuses (src/render/foes.js):
//   heal     a healed block sends up green "+" marks over a soft green pulse, whatever healed it
//            (Nature's regrowth, regen, Moss Spring, a frost flower, a wave's refill)
//   impact   a heavy hit lands with an impact frame: a comic star behind the strike, the foe's white
//            flash and a short hold with a shake (hit-stop, the view only), and its element's shards.
//            The ice lance's every hit, a metal bite, a crit and a skill's slam
//   trail    the ice lance sheds frost motes along its flight
//   sparks   every hit by a pet shows its element's signature spark: embers, frost, a zap, bubbles,
//            chips, a swirl, a glint, leaves
//   status   the first time a status lands on a foe, its word pops over it (BURN, SLOW, FROZEN, STUN…)
//   buffs    a pet fed a buff sends up the icon of each stat it gained (src/ui/icons.js)
// Everything books its light in the local budget (src/ux/photosafe.js), keeps to rate limits (one pop
// per foe at a time, a few a second over the field), and nothing is additive. Reduce motion keeps the
// marks and drops the motion: no hold, no shake, no drifting bits.
import { Container, Sprite, Texture } from 'pixi.js';
import { BURST, POINT, spriteLit } from '../ux/photosafe.js';
import { ELEMENTS } from '../sim/classes.js';
import { ELEMENT_STATS } from '../sim/skills/data.js';
import { softDot, sparkTex, ringTex } from './textures.js';
import { FEEDBACK_TEXTURES, PILL } from './feedback-textures.js';

/**
 * Heals: the share of its max health a block must gain before its "+" shows, how often per block, and how
 * long a heal waits for room in the light budget (a Nature pulse's thorns fill it for a moment: its "+"
 * then rise as the thorns fade).
 */
export const HEAL = { minShare: 0.02, gap: 0.45, max: 3, retry: 0.7, plus: { size: 0.72, rise: 1.15, life: 0.9, spread: 0.6, lit: 0.42 }, pulse: { r0: 0.4, r1: 1.0, life: 0.4 } };
/** The impact frame: the star's size and life (world units, s), the foe's hold, the shards. */
export const IMPACT = {
  star: { size: 1.35, from: 0.55, life: 0.15, alpha: 0.92, lit: 0.42 },
  hold: 0.075,
  shards: { ice: 7, earth: 6, metal: 5, other: 4 },
  shard: { size: 0.26, speed: 5, gravity: -12, life: 0.45, lit: 0.3 },
  crit: 0.75, // a crit's star, as a share of the full one (no hold: crits come often)
};
/**
 * The frost the ice lance sheds: one mote every `every` world units of flight, in ice blues deep enough
 * to read on the pale lanes; every `twinkle.every`th one an inked star that spins and shrinks away.
 * Sizes are world units: a phone shows about 24 px a unit, and a soft dot reads at about half its box.
 */
export const TRAIL = { every: 0.3, size: 0.42, life: 0.6, colors: [0x5fb8f0, 0x8fd3ff, 0x3f9ee0], lit: 0.5, twinkle: { every: 3, size: 0.52, color: 0xe4f7ff, lit: 0.42 } };
/** A frost mote's light at its biggest (a dot, or a twinkle): what the audit books for each. */
export const MOTE_LIT = Math.max(spriteLit(TRAIL.size * 1.1, TRAIL.size * 1.1, TRAIL.lit), spriteLit(TRAIL.twinkle.size, TRAIL.twinkle.size, TRAIL.twinkle.lit));
/**
 * Status pops: their life and rise, their height on screen (world units), how far over the foe's head
 * they start (above where its damage numbers rise: fx.js), their pop-in, and the limits. A pop the light
 * budget refuses (the hit that brought the status is lighting up the field) waits `retry` s at most.
 */
export const POP = { life: 1.0, rise: 0.45, h: 0.5, above: 0.7, popIn: 0.12, scale: 1.35, perFoe: 0.8, perSecond: 4, max: 16, lit: 0.6, retry: 0.4 };
/** Buff icons rising from a fed pet. */
export const BUFF = { size: 0.5, rise: 1.0, life: 1.0, lit: 0.45 };
/** A one-off mark the light budget refused (a buff icon, a refill "+") tries again for this long (s), this many at most. */
export const LATER = { retry: 0.6, max: 24 };

/**
 * Every hit's signature spark, by its pet's element (`plain` for a block's pebble). Sizes are world units
 * (a phone shows about 24 px a unit): big enough to tell apart on a phone, few enough for the many hits.
 */
export const SPARKS = {
  fire: { tex: 'spark', n: 3, colors: [0xff8a3d, 0xffd34a], size: 0.3, vx: 1.2, vy: [1.5, 3], gravity: 3, life: 0.35 },
  ice: { tex: 'shard', n: 3, colors: [0xbfeaff, 0xffffff], size: 0.32, vx: 2, vy: [0.6, 2.2], gravity: -8, life: 0.4, spin: 10 },
  lightning: { tex: 'star', n: 1, colors: [0xfff6a8], size: 0.62, life: 0.12, still: true, also: { tex: 'spark', n: 2, colors: [0xfff6a8, 0x7fb8ff], size: 0.26, vx: 2.5, vy: [-1, 1.5], gravity: 0, life: 0.2 } },
  poison: { tex: 'bubble', n: 3, colors: [0xb46cff, 0x9be15d], size: 0.28, vx: 0.6, vy: [0.6, 1.4], gravity: 1, life: 0.6 },
  earth: { tex: 'shard', n: 3, colors: [0xa07850, 0xc9a582], size: 0.3, vx: 2, vy: [1, 2.6], gravity: -10, life: 0.4, spin: 8 },
  wind: { tex: 'ring', n: 1, colors: [0xbff7e6], size: 0.36, grow: 0.8, life: 0.25, still: true },
  metal: { tex: 'spark', n: 3, colors: [0xffd34a, 0xffffff], size: 0.3, vx: 2.5, vy: [0.5, 2], gravity: -6, life: 0.3 },
  nature: { tex: 'leaf', n: 2, colors: [0xffffff], size: 0.36, vx: 1, vy: [0.8, 1.6], gravity: -2, life: 0.65, spin: 4 },
  plain: { tex: 'dot', n: 2, colors: [0xd9d2c5], size: 0.22, vx: 1.5, vy: [0.5, 1.5], gravity: -6, life: 0.3 },
};
/** Sparks: at most one burst per foe this often (s), and this many a second over the field. */
export const SPARK_LIMIT = { perFoe: 0.12, perSecond: 40 };
/**
 * The lowest marks (a hit's sparks, the lance's frost) show only while the light budget holds less than
 * this share of its cap: the rest stays free for what matters more (impact stars, pops, heals, numbers).
 */
export const LOW_ROOM = 0.5;
/** The impact star's colour by element (the shards take it too). */
export const IMPACT_COLOR = { ice: 0xbfeaff, metal: 0xffd34a, fire: 0xffa25e, lightning: 0xfff3a0, earth: 0xd8b88a, wind: 0xc8f7ea, poison: 0xd6a8ff, nature: 0xc4f09a };

/**
 * The statuses a pop can name, the strongest first: when two land together, the first one shows.
 * `on(e)`: whether foe `e` has it now (src/sim/defense.js's timers and stacks).
 */
export const STATUSES = [
  { kind: 'frozen', on: (e) => e.freezeT > 0 },
  { kind: 'stun', on: (e) => e.stunT > 0 },
  { kind: 'root', on: (e) => e.rootT > 0 },
  { kind: 'sleep', on: (e) => e.sleepT > 0 },
  { kind: 'fear', on: (e) => e.fearT > 0 },
  { kind: 'blind', on: (e) => e.blindT > 0 },
  { kind: 'melt', on: (e) => e.vulnT > 0 },
  { kind: 'burn', on: (e) => (e.burn?.stacks ?? 0) > 0 },
  { kind: 'poison', on: (e) => (e.poison?.stacks ?? 0) > 0 },
  { kind: 'bleed', on: (e) => e.bleedT > 0 },
  { kind: 'weak', on: (e) => e.weakT > 0 },
  { kind: 'slow', on: (e) => e.chillT > 0 && !(e.freezeT > 0) },
];

/** The statuses foe `e` has now, as a set of kinds. */
export const statusesOf = (e) => new Set(STATUSES.filter((s) => s.on(e)).map((s) => s.kind));

/** The status to pop: the strongest one in `now` that was not in `before` (null when none is new). */
export function newStatus(before, now) {
  for (const s of STATUSES) if (now.has(s.kind) && !before?.has(s.kind)) return s.kind;
  return null;
}

/** A token bucket: `perSecond` takes a second at most, refilled as time goes (`take(t)` → whether one is free; `give()` hands one back). */
export function rateLimit(perSecond) {
  let tokens = perSecond;
  let last = 0;
  return {
    take(t) {
      tokens = Math.min(perSecond, tokens + (t - last) * perSecond);
      last = t;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
    give() {
      tokens = Math.min(perSecond, tokens + 1);
    },
  };
}

/**
 * One foe's status pops, step by step (the renderer and the flash audit share it). `s` is its record
 * { st: its statuses last step, next: when it may pop again, pending }; `now` its statuses now. A new
 * status waits to pop (the strongest first) until the foe may pop again, POP.retry s at most, and while
 * it lasts. → the status to pop now, or null. Call popShown(s, time) once it shows; then set s.st = now.
 */
export function popKind(s, now, time) {
  const fresh = newStatus(s.st, now);
  if (fresh) s.pending = { kind: fresh, until: time + POP.retry };
  const p = s.pending;
  if (p && (time > p.until || !now.has(p.kind))) s.pending = null;
  return s.pending && time >= s.next ? s.pending.kind : null;
}

/** A foe's pop showed: the next waits POP.perFoe s. */
export function popShown(s, time) {
  s.next = time + POP.perFoe;
  s.pending = null;
}

/** How many "+" marks a heal of `share` (of the block's max health) sends up: 1, 2 or 3. */
export const plusCount = (share) => (share < 0.06 ? 1 : share < 0.2 ? 2 : HEAL.max);
/** The `i`th "+" mark's size (world units): the first is the biggest. */
export const plusSize = (i) => HEAL.plus.size * (i === 0 ? 1 : 0.8);

/** A status pop's width over its height at its widest (a longer word is condensed): what the flash audit books for it. */
export const PILL_ASPECT = PILL.aspect;
/** The ice lance's flight speed (world units a second: DEFENSE.turret.projectileSpeed × its shoot.speed), for the audit's motes. */
export const LANCE_SPEED = 9;

/** An impact frame's items: its star (whole or not at all), its shards (as many as fit) and its foe's hold flash. */
function impactItems(el, share = 1, hold = 0, foeSize = 1) {
  const { star, shard } = IMPACT;
  const size = star.size * share;
  const n = Math.round((IMPACT.shards[el] ?? IMPACT.shards.other) * share);
  const out = [
    { kind: 'feedback', lit: spriteLit(size, size, star.lit), life: star.life, all: true },
    { kind: 'feedback', lit: n * shard.size * shard.size * shard.lit, life: shard.life, min: 0.3 },
  ];
  if (hold > 0) out.push({ kind: 'feedback', lit: 0.47 * foeSize * foeSize, life: Math.min(0.12, hold), all: true }); // photosafe FOE_FLASH.share
  return out;
}

/** A spark recipe's item (as many bits as fit, at least half; none over LOW_ROOM of the cap). */
const sparkItem = (r) => ({ kind: 'feedback', lit: r.n * (r.size + (r.grow ?? 0)) ** 2 * BURST.perSize2, life: r.life, min: 0.5, room: LOW_ROOM });

/**
 * What an event's readable feedback books in the light budget (the renderer below books the same; the
 * flash audit, tools/flash-audit.mjs, models it from this). Rate limits are left to the caller: this is
 * one event's worth. `statusPop` is the audit's own event for a pop (the renderer finds them each frame).
 * `room`: the lowest marks show only while the budget holds less than this share of its cap (LOW_ROOM).
 * → [{ kind, lit, life, all | min, room? }]
 */
export function feedbackLight(e, { foeSize = 1 } = {}) {
  switch (e.type) {
    case 'hit': {
      if (!(e.amount > 0)) return [];
      const r = SPARKS[e.element] ?? SPARKS.plain;
      const out = e.thorns ? [] : [sparkItem(r), ...(r.also ? [sparkItem(r.also)] : [])];
      if (e.crit) out.push(...impactItems(e.element ?? 'metal', IMPACT.crit));
      return out;
    }
    case 'bite':
      return impactItems('metal', 1, IMPACT.hold, foeSize);
    case 'impact':
      return e.pattern === 'lance' && !e.miss ? impactItems('ice', 1, IMPACT.hold, foeSize) : [];
    case 'skillFx':
      return e.fx === 'slam' ? impactItems('ice', Math.min(1.3, 0.7 + (e.r ?? 1) * 0.15)) : []; // (ice: the most shards)
    case 'fire': {
      if (e.pattern !== 'lance' || !e.target) return [];
      // its motes: one every TRAIL.every units, each alive TRAIL.life s, so about this many at once
      const flight = Math.hypot(e.target.x - e.x, e.target.y - e.y) / LANCE_SPEED;
      const atOnce = Math.min(Math.ceil((flight * LANCE_SPEED) / TRAIL.every), Math.ceil(TRAIL.life / (TRAIL.every / LANCE_SPEED)));
      return [{ kind: 'feedback', lit: atOnce * MOTE_LIT, life: flight + TRAIL.life, min: 0, room: LOW_ROOM }];
    }
    case 'tileHeal': {
      // as many "+" as the biggest heal sends up (the renderer shows a block's heals at most every HEAL.gap s)
      let lit = 0;
      for (let i = 0; i < HEAL.max; i++) lit += spriteLit(plusSize(i) * POP.scale, plusSize(i) * POP.scale, HEAL.plus.lit);
      return [{ kind: 'feedback', lit, life: HEAL.plus.life + 0.08 * (HEAL.max - 1), all: true }];
    }
    case 'buffed': {
      const n = Object.values(e.gain ?? {}).reduce((k, v) => k + Math.min(2, v), 0);
      return n ? [{ kind: 'feedback', lit: n * spriteLit(BUFF.size * POP.scale, BUFF.size * POP.scale, BUFF.lit), life: BUFF.life, all: true }] : [];
    }
    case 'statusPop':
      return [{ kind: 'feedback', lit: spriteLit(POP.h * PILL_ASPECT * POP.scale, POP.h * POP.scale, POP.lit), life: POP.life, all: true }];
    default:
      return [];
  }
}

const hexOf = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * `foes` is src/render/foes.js (its `punch` holds a struck foe and flashes it; `viewOf` where it is
 * drawn). `tx`: the stickers (src/render/feedback-textures.js); `icons(key)`: a stat icon's texture, or
 * null while it loads.
 */
export function createFeedback({ stage, fx, foes = null, tx = FEEDBACK_TEXTURES, dot = softDot, spark = sparkTex, ring = ringTex, icons = statIconTexture } = {}) {
  const layer = new Container();
  stage.layers.numbers?.addChild(layer);
  let time = 0;
  let run = null; // the run the last update saw (heals and statuses are read from it)
  const hp = new Map(); // tile id → { hp, acc, next }
  const seen = new Map(); // foe id → { st: Set, next }
  const popRate = rateLimit(POP.perSecond);
  const sparkRate = rateLimit(SPARK_LIMIT.perSecond);
  const sparkNext = new Map(); // foe id → time its next spark may show
  let motes = 0; // the lance's frost motes so far (every TRAIL.twinkle.every-th twinkles)
  let quietUntil = -1; // a wave's refill heals every block at once: its "+" are its own (refill)
  const pops = []; // { sp, x, y, t, life, k } floating stickers: "+" marks, status pills, buff icons
  const spare = [];
  let later = []; // { show, until }: one-off marks the light budget refused, tried again each frame until `until`

  const texOf = (k) => (k === 'dot' ? dot() : k === 'spark' ? spark() : k === 'ring' ? ring() : tx[k]());

  /** A floating sticker (a "+", a status pill, a buff icon): it pops in, rises and fades. */
  function float(texture, x, y, { size, rise, life, lit, delay = 0, dx = 0, popIn = POP.popIn, scale = POP.scale, wide = false }) {
    if (pops.length >= POP.max * 3) return false;
    const w = wide ? size * (texture.width / Math.max(1, texture.height)) : size;
    if (!fx.flashAll(spriteLit(w * scale, size * scale, lit), life, delay)) return false;
    const sp = spare.pop() ?? new Sprite(Texture.EMPTY);
    sp.texture = texture;
    sp.anchor?.set?.(0.5);
    sp.visible = false;
    if (!sp.parent) layer.addChild(sp);
    pops.push({ sp, x, y, dx, t: -delay, life, rise, size, popIn, scale, wide });
    return true;
  }

  // --- heals --------------------------------------------------------------------------------------

  /** One-off mark: `show()` now, or (refused by the light budget) each frame for LATER.retry s, until it shows. */
  function soon(show) {
    if (!show() && later.length < LATER.max) later.push({ show, until: time + LATER.retry });
  }

  /** A block healed by `share` of its max health: green "+" marks rise, over a soft green pulse. → how many showed (0: no room) */
  function healAt(x, y, share) {
    const n = plusCount(share);
    const { plus, pulse } = HEAL;
    let shown = 0;
    for (let i = 0; i < n; i++) {
      const dx = n === 1 ? 0 : ((i / (n - 1)) * 2 - 1) * plus.spread * 0.5;
      if (float(tx.plus(), x + dx, y + 0.1 + (i % 2) * 0.12, { size: plusSize(i), rise: plus.rise * (stage.reduced ? 0.3 : 1), life: plus.life, lit: plus.lit, delay: i * 0.08 })) shown += 1;
    }
    if (shown) fx.ring?.(x, y, 0x52d36b, pulse.r0, pulse.r1, pulse.life);
    return shown;
  }

  function watchHeals(tiles) {
    const live = new Set();
    for (const t of tiles) {
      live.add(t.id);
      const max = t.maxHp || 1;
      let h = hp.get(t.id);
      if (!h) {
        hp.set(t.id, { hp: t.hp, acc: 0, next: 0 });
        continue;
      }
      if (t.hp > h.hp + 1e-6) h.acc += (t.hp - h.hp) / max;
      h.hp = t.hp;
      if (h.acc >= HEAL.minShare && time >= h.next) {
        if (time < quietUntil || healAt(t.x, t.y, h.acc)) {
          // shown (or the wave's refill, which shows its own "+")
          h.acc = 0;
          h.next = time + HEAL.gap;
          h.since = null;
        } else if (h.since == null) h.since = time; // no room in the light budget: it tries again
        else if (time - h.since > HEAL.retry) {
          h.acc = 0; // too late to read as this heal's
          h.since = null;
        }
      }
    }
    for (const id of hp.keys()) if (!live.has(id)) hp.delete(id);
  }

  // --- impact frames, sparks, the lance's frost --------------------------------------------------

  /** The foe nearest (x, y) within `r` world units, or null. */
  function foeNear(x, y, r = 1.2) {
    let best = null;
    let bd = r;
    for (const e of run?.enemies ?? []) {
      if (e.dead || e.gone) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        best = e;
        bd = d;
      }
    }
    return best;
  }

  /**
   * An impact frame at (x, y): a comic star in the element's colour, the struck foe's flash and hold
   * (hit-stop, `hold` s; none under Reduce motion), and its element's shards. `share` scales it (a crit's is smaller).
   */
  function impact(x, y, el, { foeId = null, share = 1, hold = IMPACT.hold } = {}) {
    const color = IMPACT_COLOR[el] ?? 0xffffff;
    const { star, shard } = IMPACT;
    const size = star.size * share;
    if (fx.flashAll(spriteLit(size, size, star.lit), star.life)) {
      fx.particle(tx.star(), x, y + 0.15, { life: star.life, size: size * star.from, grow: size * (1 - star.from), color, alpha: star.alpha, rot: rand(0, Math.PI) });
    }
    const n = Math.round((IMPACT.shards[el] ?? IMPACT.shards.other) * share);
    const k = fx.flashShare(n * shard.size * shard.size * shard.lit, shard.life, 0.3);
    const m = Math.round(n * k);
    const still = stage.reduced ? 0.25 : 1;
    for (let i = 0; i < m; i++) {
      const a = (i / Math.max(1, m)) * Math.PI * 2 + rand(-0.3, 0.3);
      const v = shard.speed * rand(0.6, 1.1) * still;
      fx.particle(el === 'ice' || el === 'earth' || el === 'metal' ? tx.shard() : spark(), x, y + 0.15, { vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1.5 * still, gravity: shard.gravity * still, drag: 1.5, life: shard.life, size: shard.size * rand(0.8, 1.2), color, spin: rand(-12, 12) * still, rot: a });
    }
    if (foeId != null && hold > 0 && !stage.reduced) foes?.punch?.(foeId, { hold });
  }

  /** A pet's hit on foe `e`: its element's signature spark (rate-limited per foe and over the field). */
  function sparkAt(ev) {
    if (ev.thorns || fx.lit > POINT.cap * LOW_ROOM) return;
    const recipe = SPARKS[ev.element] ?? SPARKS.plain;
    if ((sparkNext.get(ev.id) ?? 0) > time || !sparkRate.take(time)) return;
    sparkNext.set(ev.id, time + SPARK_LIMIT.perFoe);
    burstOf(recipe, ev.x, ev.y + 0.3);
    if (recipe.also) burstOf(recipe.also, ev.x, ev.y + 0.3);
  }

  function burstOf(r, x, y) {
    const lit = r.n * (r.size + (r.grow ?? 0)) ** 2 * BURST.perSize2;
    const k = fx.flashShare(lit, r.life, 0.5);
    const n = Math.round(r.n * k);
    const still = stage.reduced ? 0.2 : 1;
    for (let i = 0; i < n; i++) {
      fx.particle(texOf(r.tex), x + (r.still ? 0 : rand(-0.15, 0.15)), y, {
        vx: r.still ? 0 : rand(-r.vx, r.vx) * still,
        vy: r.still ? 0 : rand(r.vy[0], r.vy[1]) * still,
        gravity: (r.gravity ?? 0) * still,
        drag: 1,
        life: r.life * rand(0.85, 1.15),
        size: r.size * rand(0.85, 1.15),
        grow: r.grow ?? 0,
        color: r.colors[i % r.colors.length],
        spin: rand(-(r.spin ?? 0), r.spin ?? 0) * still,
        rot: rand(0, Math.PI * 2),
      });
    }
  }

  /** The ice lance's frost: a mote at (x, y) along its flight (the shots view calls it every TRAIL.every units). */
  function frostMote(x, y) {
    if (fx.lit > POINT.cap * LOW_ROOM) return;
    motes += 1;
    const still = stage.reduced ? 0 : 1;
    const jx = x + rand(-0.06, 0.06);
    const jy = y + rand(-0.06, 0.06);
    if (motes % TRAIL.twinkle.every === 0) {
      const tw = TRAIL.twinkle;
      if (!fx.flashAll(spriteLit(tw.size, tw.size, tw.lit), TRAIL.life)) return;
      fx.particle(tx.star(), jx, jy, { life: TRAIL.life, size: tw.size, grow: -tw.size * 0.8, color: tw.color, spin: 6 * still, rot: rand(0, Math.PI) });
      return;
    }
    const size = TRAIL.size * rand(0.8, 1.1);
    if (!fx.flashAll(spriteLit(size, size, TRAIL.lit), TRAIL.life)) return;
    fx.particle(dot(), jx, jy, { vx: rand(-0.4, 0.4) * still, vy: rand(-0.2, 0.4) * still, drag: 2, life: TRAIL.life, size, color: TRAIL.colors[Math.floor(Math.random() * TRAIL.colors.length)] });
  }

  // --- statuses -----------------------------------------------------------------------------------

  function watchStatuses(enemies) {
    const live = new Set();
    for (const e of enemies) {
      if (e.dead || e.gone) continue;
      live.add(e.id);
      const now = statusesOf(e);
      const s = seen.get(e.id);
      if (!s) {
        seen.set(e.id, { st: now, next: 0 });
        continue;
      }
      const kind = popKind(s, now, time);
      if (kind && popRate.take(time)) {
        const at = foes?.viewOf?.(e.id);
        const fan = at?.fan ?? 0;
        const size = e.boss ? 1.6 : 1;
        if (float(tx.pill(kind), e.x + fan, e.y + 0.85 * size + POP.above, { size: POP.h, rise: POP.rise * (stage.reduced ? 0.3 : 1), life: POP.life, lit: POP.lit, wide: true })) popShown(s, time);
        else popRate.give(); // the light budget is full this moment: it tries again (POP.retry s at most)
      }
      s.st = now;
    }
    for (const id of seen.keys()) if (!live.has(id)) seen.delete(id);
  }

  // --- events -------------------------------------------------------------------------------------

  function onEvent(e) {
    switch (e.type) {
      case 'hit':
        if (e.amount > 0) sparkAt(e);
        if (e.crit && e.amount > 0) impact(e.x, e.y + 0.2, e.element ?? 'metal', { share: IMPACT.crit, hold: 0 });
        break;
      case 'bite':
        // Metal's bite on a weak foe: a heavy hit
        impact(e.x, e.y + 0.2, 'metal', { foeId: e.id ?? foeNear(e.x, e.y)?.id ?? null });
        break;
      case 'skillFx':
        if (e.fx === 'slam') impact(e.x, e.y, firstElementOf(e), { share: Math.min(1.3, 0.7 + (e.r ?? 1) * 0.15), hold: 0 });
        break;
      case 'tilesRestored':
        // the wave's refill: each block that had lost health shows one "+" (not three)
        quietUntil = time + 0.05;
        for (const t of run?.tiles ?? []) {
          const h = hp.get(t.id);
          if (h && h.hp < t.maxHp - 1e-6) soon(() => float(tx.plus(), t.x, t.y + 0.1, { size: HEAL.plus.size * 0.8, rise: HEAL.plus.rise * 0.8, life: HEAL.plus.life, lit: HEAL.plus.lit }));
          if (h) h.hp = t.hp;
        }
        break;
      case 'buffed':
        for (const [el, n] of Object.entries(e.gain ?? {})) {
          const texture = icons(ELEMENT_STATS[el]?.stat);
          if (!texture) continue;
          for (let i = 0; i < Math.min(2, n); i++) soon(() => float(texture, e.x + i * 0.3 - (Math.min(2, n) - 1) * 0.15, e.y + 0.3, { size: BUFF.size, rise: BUFF.rise, life: BUFF.life, lit: BUFF.lit, delay: i * 0.12 }));
        }
        break;
      default:
    }
  }

  /** Which element a skill's effect belongs to, by its colour (the fusion's own colour has its main element's family). */
  function firstElementOf(e) {
    const c = hexOf(e.color ?? 0xffffff);
    let best = 'earth';
    let bd = Infinity;
    for (const [k, el] of Object.entries(ELEMENTS)) {
      const v = hexOf(el.color);
      const d = Math.abs(((v >> 16) & 255) - ((c >> 16) & 255)) + Math.abs(((v >> 8) & 255) - ((c >> 8) & 255)) + Math.abs((v & 255) - (c & 255));
      if (d < bd) {
        best = k;
        bd = d;
      }
    }
    return best;
  }

  // --- each frame ---------------------------------------------------------------------------------

  function update(dt, r = run) {
    time += dt;
    run = r;
    if (later.length) later = later.filter((l) => time <= l.until && !l.show());
    if (r) {
      watchHeals(r.tiles ?? []);
      watchStatuses(r.enemies ?? []);
    }
    const U = stage.view.U;
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      if (p.t < 0) continue;
      if (p.t >= p.life) {
        p.sp.visible = false;
        pops.splice(i, 1);
        spare.push(p.sp);
        continue;
      }
      const f = p.t / p.life;
      const ease = 1 - (1 - f) ** 3;
      const pop = p.t < p.popIn ? p.scale - (p.scale - 1) * (p.t / p.popIn) : 1;
      const h = p.size * U * pop;
      const tex = p.sp.texture;
      const w = p.wide ? (h * (tex.width || 1)) / Math.max(1, tex.height || 1) : h;
      p.sp.visible = true;
      p.sp.position?.set?.(stage.sx(p.x + p.dx), stage.sy(p.y + p.rise * ease));
      if (p.sp.width !== undefined) {
        p.sp.width = w;
        p.sp.height = h;
      }
      p.sp.alpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
    }
  }

  function reset() {
    for (const p of pops) {
      p.sp.visible = false;
      spare.push(p.sp);
    }
    pops.length = 0;
    later = [];
    hp.clear();
    seen.clear();
    sparkNext.clear();
  }

  /** The ice lance landed (src/render/shots.js): its impact frame on the foe it struck. */
  function lanceHit(e) {
    impact(e.x, e.y + 0.3, 'ice', { foeId: foeNear(e.x, e.y)?.id ?? null });
  }

  return {
    onEvent,
    update,
    reset,
    impact,
    lanceHit,
    frostMote,
    healAt,
    /** How many stickers float now (for checks). */
    get floating() {
      return pops.length;
    },
  };
}

// --- stat icons as textures (the cards' icons, src/ui/icons.js, drawn into the canvas) ---------------

const iconCache = new Map();

/** A stat's icon texture, from the cards' SVG (made once, loaded in the background): null until it is ready, or without a DOM. */
export function statIconTexture(key) {
  if (!key || typeof globalThis.Image === 'undefined') return null;
  if (iconCache.has(key)) return iconCache.get(key);
  iconCache.set(key, null);
  import('../ui/icons.js')
    .then(({ icon }) => {
      const svg = icon(key, { size: 64 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const img = new Image();
      img.onload = () => iconCache.set(key, Texture.from(img));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    })
    .catch(() => {});
  return null;
}
