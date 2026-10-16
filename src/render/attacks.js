// The basic attacks drawn from their events (the sim has already applied the hits), staged by
// src/art/attack-vfx.js LADDER so that every stage adds one visible thing:
//   breath   Ember Breath: embers fan up the cone; then a flame tongue rolls up it; then a
//            smoking scorch stays; a fusion's add-on rides the tongue; an apex licks twice
//   gust     Wing Gust: a ribbon races up the lane with a swirl at its head and feathers in it;
//            pushed foes slide over a streak; at 128 the neighbouring lanes get thinner ribbons
//   pulse    Bramble Shell: a bramble arc sweeps once round the tile, thorns prick what it
//            roots; then tendrils reach the rooted foes; then blossoms open on the ring
//   quake    Quake Stomp: cracks up each lane it covers and a dust wave; then hopping pebbles;
//            then a second wave
//   pounce   Pride Pounce: the claw slash where the cub lands (src/render/blocks.js and
//            src/kv/roam.js make the pet leap); then a gold glint on the prey
//   ping     Echo Harpoon's ping: a ring closing on its prey (src/render/shots.js throws the harpoon)
//   chain    Horn Arc and every chain: bolt links with an element edge and a cream core; then
//            sparks cling to the struck; then twin links
// …and the war around them: sky strikes, meteors, drip ropes, kills, stuns, freezes, bites,
// weakened foes and pushed ones. Sprites come from textures.js vfxTex (generated, else
// code-drawn), all in normal blend. Everything that appears in place books its light first
// (attackLight → bookPlan) and is drawn inside the box it booked, from the moment it booked, for
// no longer than it booked: smaller, thinner, fewer or not at all when the budget is short.
// Each draw names the plan item that pays for it (`book`; 'moves' for the moving bodies, which
// are exempt), so test/attack-render.test.js holds every draw to its booking. Reduce motion:
// pieces and bits hold their place, ribbons fade in place.
import { FIELD, GRID, laneX } from '../config.js';
import { ADDON, ARC_MID, LIFE_JITTER, LINK_OVERLAP, METEOR, PULSE_FOES, ROPE_SAG, STRIKE, VFX_ASPECT, VFX_GROW as G, VFX_SIZE as S, VFX_TIME as T, attackLight, crackLength, gustLength, has, lanesOf } from '../art/attack-vfx.js';
import { linkCoreTex, pingTex, poofTex, projTex, softDot, sparkTex, vfxTex } from './textures.js';
import { foeDrawSize } from '../art/foe-roster.js';
import { RIBBON_POINTS } from './trails.js';

/** The textures the attacks draw with (tests pass stand-ins of the same sizes). */
export const ATTACK_TEXTURES = { vfxTex, linkCoreTex, pingTex, poofTex, projTex, softDot, sparkTex };

const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const SKY = FIELD.spawnY - STRIKE.top; // where sky strikes come from: the gates

/** Mix two 0xRRGGBB colours: k = 0 gives a, 1 gives b. */
export function mixColor(a, b, k) {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
}

/** Book an attack's plan (src/art/attack-vfx.js attackLight) in the light budget, each item from its delay on: key → the share granted (0: skip it). */
export function bookPlan(fx, plan) {
  const got = {};
  if (!plan) return got;
  for (const it of plan.items) got[it.key] = it.all ? (fx.flashAll(it.lit, it.life, it.delay ?? 0) ? 1 : 0) : fx.flashShare(it.lit, it.life, it.min ?? 0, it.delay ?? 0);
  return got;
}

/** How many of `n` bits (or whole pieces) the budget allowed: never more than its share of them. */
export const allowed = (n, share) => Math.floor((n ?? 0) * (share ?? 0) + 1e-9);

/** A square box `w` across, as trails.piece/decal take it (the sprite fits inside). */
const box = (w) => ({ w, h: w, fit: true });

export function createAttacks(stage, fx, trails, tx = ATTACK_TEXTURES) {
  const vfx = tx.vfxTex;
  const anims = []; // per frame: fn(dt) → true when done (ribbons racing, meteors falling, ropes fading)
  const hits = []; // this frame's struck foes { id, x, y }, in order: where tendrils and thorns go
  let serial = 0;
  const still = () => stage.reduced;
  const move = () => (stage.reduced ? 0.2 : 1); // Reduce motion: bits barely drift
  const plan = (e) => attackLight(e, { reduced: still() });

  /**
   * n bits of `el`'s `piece`: a burst (o.dir/spread aim it), pooled fx particles, booked by the
   * caller as plan item `o.book`. They live LIFE_JITTER–1 × o.life (never longer than booked),
   * from o.delay on.
   */
  function bits(el, piece, n, x, y, o = {}) {
    const tex = vfx(el, piece);
    const m = move();
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + rand(-1, 1) * (o.spread ?? Math.PI) : rand(0, Math.PI * 2);
      const sp = (o.speed ?? 2) * rand(0.6, 1.2);
      fx.particle(tex, x + rand(-1, 1) * (o.jitter ?? 0.2), y + rand(-1, 1) * (o.jitter ?? 0.2), {
        vx: ((o.vx ?? 0) + Math.cos(a) * sp) * m,
        vy: ((o.vy ?? 0) + Math.sin(a) * sp) * m,
        life: (o.life ?? 0.5) * rand(LIFE_JITTER, 1),
        size: (o.size ?? S.addon) * rand(0.85, 1.15), // the plan books 1.15 × size (BIT_JITTER)
        grow: o.grow ?? 0,
        gravity: (o.gravity ?? 0) * m,
        drag: o.drag ?? 1.5,
        spin: rand(-1, 1) * (o.spin ?? 5) * m,
        rot: rand(0, Math.PI * 2),
        color: o.tint ?? 0xffffff,
        alpha: o.alpha ?? 1,
        delay: o.delay ?? 0,
        book: o.book,
      });
    }
  }
  /** The fusion rule's add-on: n of the partner element's bits (booked as 'addon'). */
  function addon(el, n, x, y, o = {}) {
    if (el && n > 0) bits(el, ADDON[el].piece, n, x, y, { size: S.addon, speed: 1.6, life: T.addon, spin: 6, book: 'addon', ...o });
  }

  /** The foes struck this frame within r of (x, y): the latest first (an attack's own hits come just before it), one each, at most `max`. */
  function struckNear(x, y, r, max) {
    const out = [];
    for (let i = hits.length - 1; i >= 0 && out.length < max; i--) {
      const h = hits[i];
      if (Math.hypot(h.x - x, h.y - y) <= r && !out.some((o) => o.id === h.id)) out.push(h);
    }
    return out;
  }

  // --- Ember Breath ------------------------------------------------------------------------
  /** A flame tongue rolling from the mouth to the end of the cone (it holds mid-cone under Reduce motion). */
  function lick(x, y0, dir, reach, w, h, tint, delay, book) {
    const travel = Math.max(0, reach - w * 0.5);
    const seed = rand(0, 6.3);
    trails.piece(vfx('fire', 'tongue'), x, still() ? y0 + dir * travel * 0.5 : y0, {
      w,
      h,
      fit: true,
      rot: dir > 0 ? -Math.PI / 2 : Math.PI / 2, // the tongue points right; up the lane is up the screen
      ax: 0.25, // its round base trails toward the mouth
      delay,
      life: T.tongue,
      grow: [0.5, G.tongue], // it widens with the cone
      fadeIn: 0.05,
      fadeOut: 0.55,
      tint,
      book,
      follow: (p, k) => {
        p.y = y0 + dir * travel * easeOut(k);
        p.x = x + Math.sin(k * 14 + seed) * 0.05;
      },
    });
  }

  function breath(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    const { step, cls, g } = p;
    const dir = e.dir >= 0 ? 1 : -1;
    const y0 = e.y + dir * 0.6; // the mouth: the front edge of the tile (or the pet)
    const half = (GRID.cell / 2) * (2 + (e.lanes ?? 0)); // the cone's half-width at its tip (defense.js inCone)
    const m = move();
    const n = allowed(step.embers, got.embers);
    for (let i = 0; i < n; i++) {
      const across = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
      const a = Math.atan2(dir * e.reach, across * half * 0.8);
      const sp = (e.reach / T.ember) * rand(0.8, 1.05);
      fx.particle(vfx('fire', 'ember'), e.x + rand(-0.15, 0.15), y0, { vx: Math.cos(a) * sp * m, vy: Math.sin(a) * sp * m, life: T.ember * rand(LIFE_JITTER, 1), size: S.ember * g * rand(0.9, 1.15), grow: -S.ember * 0.35, drag: 1.4, spin: rand(-5, 5) * m, rot: rand(0, 6.3), book: 'embers' });
    }
    if (got.tongue) {
      const k = Math.sqrt(got.tongue);
      lick(e.x, y0, dir, e.reach, S.tongue[0] * g * k, S.tongue[1] * g * k, cls.tint, 0, 'tongue');
    }
    if (got.echo) {
      const k = Math.sqrt(got.echo) * 0.9;
      lick(e.x + rand(-0.2, 0.2), y0, dir, e.reach * 0.9, S.tongue[0] * g * k, S.tongue[1] * g * k, cls.apexTint, T.lick, 'echo');
    }
    if (got.scorch) {
      const x = e.x + rand(-0.25, 0.25);
      const y = y0 + dir * e.reach * 0.6;
      trails.decal(vfx('fire', 'scorch'), x, y, { ...box(S.scorch * g * Math.sqrt(got.scorch)), rot: rand(0, Math.PI * 2), book: 'scorch' });
      bits('fire', 'smoke', allowed(step.smoke, got.smoke), x, y, { vy: 0.7, speed: 0.25, size: S.smoke, grow: 0.2, life: T.smoke, alpha: 0.85, drag: 0.6, spin: 1, jitter: 0.3, book: 'smoke' });
    }
    if (got.addon) addon(cls.partner, allowed(step.addon, got.addon), e.x, y0 + dir * e.reach * 0.3, { vy: ((dir * e.reach) / T.tongue) * 0.45, speed: 1.4 });
  }

  // --- Wing Gust ---------------------------------------------------------------------------
  /** A ribbon racing up a lane from y0 (a swirl at its head); under Reduce motion it fades in place (and is booked). */
  function windRibbon(x, y0, len, width, tint, { side = false, echo = false, alpha = 1 } = {}) {
    if (width <= 0) return;
    const key = `gust${++serial}`;
    const r = trails.ribbon(key, 'wind', tint, { width, taper: 0.35, speed: -4, alpha, book: still() ? 'ribbonFade' : 'moves' });
    if (!r) return;
    const tail = Math.min(len, 3.2);
    const life = T.ribbon + 0.14;
    const swirl = !side && !echo && !still() ? trails.piece(vfx('wind', 'swirl'), x, y0, { ...box(S.swirl), rot: -Math.PI / 2, life, tint, fadeOut: 0.8, book: 'moves' }) : null;
    const swirlKey = swirl?.key;
    const phase = echo ? Math.PI : rand(0, 6.3);
    let t = 0;
    anims.push((dt) => {
      if (r.key !== key) return true; // its ribbon went to a newer gust
      t += dt;
      const k = Math.min(1, t / T.ribbon);
      const hy = still() ? y0 + len : y0 + len * easeOut(k);
      const ty = Math.max(y0, hy - (still() ? len : tail));
      for (let i = 0; i < RIBBON_POINTS; i++) {
        const y = hy + (ty - hy) * (i / (RIBBON_POINTS - 1)); // the head first
        r.xs[i] = x + Math.sin(phase + y * 1.7 + t * 9) * (echo ? 0.24 : 0.06);
        r.ys[i] = y;
      }
      r.n = RIBBON_POINTS;
      r.alpha = alpha * (still() ? 1 - k : t < T.ribbon ? 1 : Math.max(0, 1 - (t - T.ribbon) / 0.14));
      if (swirl && swirl.key === swirlKey) {
        swirl.x = r.xs[0];
        swirl.y = hy;
      }
      if (t < life) return false;
      trails.releaseRibbon(key);
      return true;
    });
  }

  function gust(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    const { step, cls } = p;
    const y0 = e.y + 0.6;
    const len = gustLength(e);
    const fade = still() ? got.ribbonFade ?? 0 : 1; // in place it books: thinner when the budget is short
    for (const l of lanesOf(e.lane, e.lanes)) {
      const side = l !== e.lane;
      if (side && !has(step, 'side')) continue;
      const w = S.ribbon * (side ? 0.45 : 1) * fade;
      windRibbon(laneX(l), y0, len, w, cls.tint, { side, alpha: side ? 0.85 : 1 });
      if (!side && has(step, 'echo')) windRibbon(laneX(l), y0, len, w * 0.55, cls.apexTint, { echo: true });
    }
    const up = (len / T.ribbon) * 0.45;
    bits('wind', 'feather', allowed(step.feathers, got.feathers), laneX(e.lane), y0 + 0.4, { vy: up, speed: 0.8, size: S.feather, life: T.feather, drag: 0.9, spin: 7, jitter: 0.35, book: 'feathers' });
    if (got.addon) addon(cls.partner, allowed(step.addon, got.addon), laneX(e.lane), y0 + 0.6, { vy: up * 0.9, speed: 0.8 });
  }

  /** A foe knocked back: a streak under its slide (wind, from 32), or dust (earth). */
  function pushed(e) {
    const got = bookPlan(fx, plan(e));
    if (got.streak) {
      const dx = e.x - e.from.x;
      const dy = e.y - e.from.y;
      const L = Math.hypot(dx, dy);
      const k = Math.sqrt(got.streak);
      if (L > 0.05) trails.decal(vfx('wind', 'streak'), (e.x + e.from.x) / 2, (e.y + e.from.y) / 2 - 0.2, { w: (L + 0.4) * k, h: S.streak * k, fit: true, rot: Math.atan2(-dy, dx), alpha: 0.6, book: 'streak' });
    }
    if (got.dust) bits('earth', 'dust', allowed(2, got.dust), e.x, e.y - 0.2, { speed: 0.6, size: 0.4, life: T.dust, grow: 0.15, drag: 2, book: 'dust' });
  }

  // --- Bramble Shell -----------------------------------------------------------------------
  /** A bramble arc (a quarter ring) sweeping once round (x, y) at radius r; turn ±1 sets the way. */
  function sweep(x, y, r, tint, turn, k, book) {
    trails.piece(vfx('nature', 'arc'), x, y, { ax: 1, ay: 1, ...box((r / ARC_MID) * k), rot: rand(0, Math.PI * 2), spin: (turn * Math.PI * 2) / T.arc, life: T.arc, tint, fadeIn: 0.06, fadeOut: 0.65, book });
  }

  function pulse(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    const { step, cls } = p;
    const r = e.radius;
    if (got.arc) sweep(e.x, e.y, r, cls.tint, 1, Math.sqrt(got.arc), 'arc');
    if (got.echo) sweep(e.x, e.y, r, cls.apexTint, -1, Math.sqrt(got.echo), 'echo');
    const foes = struckNear(e.x, e.y, r + 0.8, Math.min(PULSE_FOES, e.hits ?? PULSE_FOES)); // the foes it struck, as many as it booked for
    const np = allowed(step.pricks * foes.length, got.pricks);
    for (let i = 0; i < np; i++) {
      const f = foes[i % foes.length];
      const a = Math.atan2(f.y - e.y, f.x - e.x); // thorns fly off away from the shell
      bits('nature', 'leaf', 1, f.x, f.y + 0.3, { dir: a, spread: 0.8, speed: 2.4, size: S.leaf, life: T.prick, spin: 8, jitter: 0.1, book: 'pricks' });
    }
    if (got.tendrils) {
      // whole tendrils, fewer when the budget is short; each reaches its foe with its own shape
      const nt = allowed(Math.min(step.tendrils, foes.length), got.tendrils);
      for (let i = 0; i < nt; i++) {
        const f = foes[i];
        const dx = f.x - e.x;
        const dy = f.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.8) continue;
        const L = d - 0.7; // at most r + 0.1, as booked
        trails.piece(vfx('nature', 'tendril'), e.x + (dx / d) * 0.7, e.y + (dy / d) * 0.7, { ax: 0, w: L, h: L * VFX_ASPECT.tendril, fit: true, rot: Math.atan2(-dy, dx), life: T.tendril, grow: [0.15, 1], fadeOut: 0.7, book: 'tendrils' });
      }
    }
    if (got.blossoms) {
      const a0 = rand(0, Math.PI * 2);
      const nb = allowed(step.blossoms, got.blossoms);
      const na = got.addon ? allowed(step.addon, got.addon) : 0;
      for (let i = 0; i < nb; i++) {
        const a = a0 + (i * Math.PI * 2) / nb;
        const bx = e.x + Math.cos(a) * r;
        const by = e.y + Math.sin(a) * r;
        const delay = still() ? 0 : (T.arc * i) / step.blossoms; // they open as the arc passes (booked to the last)
        trails.piece(vfx('nature', 'blossom'), bx, by, { ...box(S.blossom), grow: [0.2, G.blossom], life: T.blossom, delay, spin: 1.2, fadeOut: 0.7, book: 'blossoms' });
        if (i < na) trails.piece(vfx(cls.partner, ADDON[cls.partner].piece), bx + 0.22, by + 0.22, { ...box(S.addon), grow: [0.3, 1], life: T.blossom, delay, spin: 2, fadeOut: 0.7, book: 'addon' });
      }
    }
  }

  // --- Quake Stomp --------------------------------------------------------------------------
  /** A dust wave rolling up and down a lane from the stomp (pieces, so a later wave can wait its turn). */
  function wave(x, y, reach, n, tint, delay, book) {
    for (let i = 0; i < n; i++) {
      const way = i % 2 ? -0.6 : 1; // most of it rolls up the lane, toward the foes
      trails.piece(vfx('earth', 'dust'), x + rand(-0.35, 0.35), y + 0.6 * way, { ...box(S.dust), vy: (way * reach * 0.9) / T.dust, drag: 1.1, delay, life: T.dust, grow: [0.6, G.dust], tint, fadeOut: 0.5, spin: rand(-1, 1), book });
    }
  }

  function quake(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    const { step, cls, g } = p;
    const crack = crackLength(e, g) * Math.sqrt(got.cracks ?? 0);
    const dust = cls.kind === 'single' ? 0xffffff : mixColor(0xffffff, cls.tint, 0.45); // a fusion's dust takes its colour
    for (const l of lanesOf(e.lane, e.lanes)) {
      const x = laneX(l);
      if (got.cracks) trails.decal(vfx('earth', 'crack'), x + rand(-0.15, 0.15), e.y + 0.9 + crack * 0.5, { w: crack, h: crack * VFX_ASPECT.crack, fit: true, rot: Math.PI / 2 + rand(-0.12, 0.12), book: 'cracks' });
      wave(x, e.y, e.reach, allowed(step.dust, got.dust), dust, 0, 'dust');
      if (got.wave2) wave(x, e.y, e.reach, allowed(step.dust, got.wave2), dust, T.wave2, 'wave2');
      if (got.echo) wave(x, e.y, e.reach, allowed(step.dust, got.echo), mixColor(0xffffff, cls.apexTint, 0.55), T.wave2 * 2, 'echo');
      if (got.pebbles) bits('earth', 'pebble', allowed(step.pebbles, got.pebbles), x, e.y + 1, { vy: 4.5, speed: 1.2, gravity: -14, size: S.pebble, life: T.pebble, drag: 0.3, spin: 8, jitter: 0.4, book: 'pebbles' });
    }
    if (got.addon) addon(cls.partner, allowed(step.addon, got.addon), laneX(e.lane), e.y + 1.2, { vy: 1.5, speed: 1.4 });
    stage.shake(4);
  }

  // --- Pride Pounce -------------------------------------------------------------------------
  function pounce(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    const { step, cls, g } = p;
    const delay = still() ? 0 : T.leap; // the cub lands, then claws (the plan books from then)
    const x = e.to.x;
    const y = e.to.y + 0.3;
    const tilt = rand(-0.3, 0.3);
    if (got.slash) trails.piece(vfx('metal', 'slash'), x, y, { ...box(S.slash * g * Math.sqrt(got.slash)), rot: tilt, tint: cls.tint, delay, life: T.slash, grow: [0.6, G.slash], fadeOut: 0.5, book: 'slash' });
    if (got.echo) trails.piece(vfx('metal', 'slash'), x, y, { ...box(S.slash * g * Math.sqrt(got.echo)), rot: -tilt, flip: true, tint: cls.apexTint, delay: delay + 0.06, life: T.slash, grow: [0.6, G.slash], fadeOut: 0.5, book: 'echo' });
    if (got.glint) trails.piece(vfx('metal', 'glint'), x + 0.35, y + 0.45, { ...box(S.glint), spin: 4, delay: delay + 0.05, life: T.glint, grow: [0.3, G.glint], fadeOut: 0.6, book: 'glint' });
    const na = allowed(step.addon, got.addon);
    for (let i = 0; i < na; i++) trails.piece(vfx(cls.partner, ADDON[cls.partner].piece), x, y, { ...box(S.addon), vx: rand(-2, 2), vy: rand(1, 3), gravity: -8, spin: rand(-6, 6), delay, life: T.addon, book: 'addon' });
  }

  // --- Echo Harpoon's ping --------------------------------------------------------------------
  function ping(e) {
    const p = plan(e);
    const got = bookPlan(fx, p);
    if (!got.ping) return;
    trails.piece(tx.pingTex(), e.x, e.y + 0.3, { ...box(2 * S.ping * Math.sqrt(got.ping)), life: T.ping, grow: still() ? [0.55, 0.55] : [1, 0.22], tint: p.cls.tint, fadeIn: 0.05, fadeOut: 0.7, book: 'ping' });
  }

  // --- chains: Horn Arc, a fusion's jumps, sky strikes ------------------------------------------
  /** One strand of bolt links along pts, `off` to the side: the link tinted with the element, a cream core inside it. */
  function strand(pts, off, tint, width, life, book) {
    if (width <= 0) return;
    const tex = vfx('lightning', 'link');
    const core = tx.linkCoreTex(); // the code-drawn link's core (a generated link's own tones carry it)
    for (let j = 1; j < pts.length; j++) {
      const p = pts[j - 1];
      const q = pts[j];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const L = Math.hypot(dx, dy);
      if (L < 0.05) continue;
      const nx = (-dy / L) * off;
      const ny = (dx / L) * off;
      const n = Math.max(1, Math.round(L / S.link[0]));
      const rot = Math.atan2(-dy, dx);
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const x = p.x + dx * f + nx;
        const y = p.y + dy * f + ny;
        const flip = (i + j) % 2 === 1;
        trails.piece(tex, x, y, { w: (L / n) * LINK_OVERLAP, h: width, rot, life, fadeIn: 0.02, fadeOut: 0.45, flip, essential: true, tint, book });
        if (core) trails.piece(core, x, y, { w: (L / n) * LINK_OVERLAP, h: width, rot, life, fadeIn: 0.02, fadeOut: 0.45, flip, essential: true, book }); // the same box: it lies inside the link
      }
    }
  }

  /** The links along a chain's points (shots.js impact), staged for Horn Arc: sparks, twins, an apex strand. */
  function chain(pts, p, got) {
    if (!got.links || pts.length < 2) return;
    const { step, cls } = p;
    const arc = p.el === 'lightning' && step;
    const strands = arc && has(step, 'twin') ? 2 : 1;
    const width = S.link[1] * (strands > 1 ? 0.8 : 1) * got.links; // a line: thinner when the budget is short
    for (let s = 0; s < strands; s++) strand(pts, (s - (strands - 1) / 2) * 0.13, cls.tint, width, T.link, 'links');
    if (got.echo) strand(pts, 0.2, cls.apexTint, S.link[1] * 0.7 * got.echo, T.link, 'echo');
    if (!arc) return;
    const struck = pts.length - 1; // the points after the first
    const ns = allowed(step.sparks * struck, got.sparks);
    for (let i = 0; i < ns; i++) {
      const q = pts[1 + (i % struck)];
      trails.piece(vfx('lightning', 'spark'), q.x + rand(-0.35, 0.35), q.y + rand(0, 0.7), { ...box(S.spark), spin: rand(-6, 6), life: T.spark, grow: [G.spark, 0.6], fadeOut: 0.6, book: 'sparks' });
    }
    const na = allowed(step.addon * struck, got.addon);
    for (let i = 0; i < na; i++) {
      const q = pts[1 + (i % struck)];
      addon(cls.partner, 1, q.x, q.y + 0.3, { speed: 1.2 });
    }
  }

  /** Tempest: a bolt of links from the gates down onto a foe (inside STRIKE's bends, as booked), a spark star where it lands. */
  function strike(e) {
    const got = bookPlan(fx, plan(e));
    const top = { x: e.x + rand(-1, 1) * STRIKE.spread, y: SKY };
    const pts = [top];
    for (let i = 1; i < STRIKE.segments; i++) {
      const f = i / STRIKE.segments;
      pts.push({ x: top.x + (e.x - top.x) * f + rand(-1, 1) * STRIKE.bend, y: top.y + (e.y - top.y) * f });
    }
    pts.push({ x: e.x, y: e.y });
    if (got.links) strand(pts, 0, 0xffe14d, S.link[1] * got.links, T.link + 0.06, 'links');
    if (got.burst) trails.piece(vfx('lightning', 'burst'), e.x, e.y + 0.2, { ...box(S.star * Math.sqrt(got.burst)), grow: [0.5, G.burst], life: T.burst, fadeOut: 0.5, book: 'burst' });
    bits('lightning', 'spark', allowed(2, got.sparks), e.x, e.y + 0.3, { speed: 1.5, size: S.spark, life: T.spark, book: 'sparks' });
  }

  // --- the rest of the war --------------------------------------------------------------------
  /** A defeated foe: a puff of lobes sized to it, a few bits (no ring, nothing additive). */
  function kill(e) {
    const got = bookPlan(fx, plan(e));
    const def = e.enemy?.def ?? {};
    const color = hex(def.color ?? '#c9b08a');
    const size = S.poof * foeDrawSize({ ...def, boss: e.boss }); // the foe as drawn (src/render/foes.js), as the plan books it
    if (got.poof) trails.piece(tx.poofTex(), e.x, e.y + 0.2, { ...box(size * Math.sqrt(got.poof)), grow: [0.45, G.poof], life: T.poof, tint: mixColor(0xffffff, color, 0.35), fadeOut: 0.45, spin: rand(-1.5, 1.5), book: 'poof' });
    const n = allowed(e.boss ? 18 : 6, got.bits);
    const m = move();
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2, e.boss ? 7 : 4.5) * m;
      fx.particle(i % 2 ? tx.sparkTex() : tx.softDot(), e.x, e.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 1.5 * m, gravity: -8 * m, drag: 2, life: 0.5, size: (e.boss ? 0.34 : 0.24) * rand(0.85, 1.15), color: i % 3 ? color : 0xfffaf2, book: 'bits' });
    }
  }

  function stun(e) {
    const got = bookPlan(fx, plan(e));
    if (got.stars) trails.piece(vfx('earth', 'stars'), e.x, e.y + 0.75, { w: S.stars[0], h: S.stars[1], fit: true, spin: 5, life: T.stars, grow: [0.7, 1], fadeOut: 0.7, book: 'stars' });
  }

  function freeze(e) {
    const got = bookPlan(fx, plan(e));
    if (got.block) trails.piece(vfx('ice', 'block'), e.x, e.y + 0.25, { ...box(S.block * Math.sqrt(got.block)), grow: [G.block, 1], life: T.block, alpha: 0.85, fadeOut: 0.55, book: 'block' });
    if (got.frost) trails.decal(vfx('ice', 'frost'), e.x, e.y - 0.2, { ...box(S.frost * Math.sqrt(got.frost)), rot: rand(0, Math.PI * 2), book: 'frost' });
  }

  /** A killing bite: a big gold slash crossed by a second, and glints. */
  function bite(e) {
    const got = bookPlan(fx, plan(e));
    const w = S.slash * 1.4;
    if (got.slash) trails.piece(vfx('metal', 'slash'), e.x, e.y + 0.3, { ...box(w * Math.sqrt(got.slash)), tint: 0xffd34a, life: T.slash, grow: [0.6, G.slash], fadeOut: 0.5, book: 'slash' });
    if (got.cross) trails.piece(vfx('metal', 'slash'), e.x, e.y + 0.3, { ...box(w * Math.sqrt(got.cross)), flip: true, tint: 0xffb347, delay: still() ? 0 : 0.06, life: T.slash, grow: [0.6, G.slash], fadeOut: 0.5, book: 'cross' });
    bits('metal', 'glint', allowed(2, got.glints), e.x, e.y + 0.5, { speed: 1.6, size: S.glint, life: T.glint, book: 'glints' });
  }

  /** Full poison stacks: venom drips off the weakened foe. */
  function weaken(e) {
    const got = bookPlan(fx, plan(e));
    bits('poison', 'drip', allowed(3, got.drips), e.x, e.y + 0.4, { dir: -Math.PI / 2, spread: 0.6, speed: 0.8, gravity: -6, size: S.drip, life: T.drip + 0.2, spin: 0, book: 'drips' });
  }

  /** Plague: a sagging drip rope from a poisoned foe to its neighbour, fading. */
  function spread(e) {
    const got = bookPlan(fx, plan(e));
    if (!got.rope) return;
    const key = `rope${++serial}`;
    const r = trails.ribbon(key, 'poison', 0xb46cff, { width: S.rope * got.rope, taper: 0.8, speed: -1.5, book: 'rope' });
    if (!r) return;
    for (let i = 0; i < RIBBON_POINTS; i++) {
      const f = i / (RIBBON_POINTS - 1);
      r.xs[i] = e.from.x + (e.to.x - e.from.x) * f;
      r.ys[i] = e.from.y + (e.to.y - e.from.y) * f - Math.sin(f * Math.PI) * ROPE_SAG; // it sags
    }
    r.n = RIBBON_POINTS;
    let t = 0;
    anims.push((dt) => {
      if (r.key !== key) return true;
      t += dt;
      r.alpha = Math.max(0, 1 - t / T.rope);
      if (t < T.rope) return false;
      trails.releaseRibbon(key);
      return true;
    });
  }

  /**
   * Meteor: the streak falls for T.meteor s trailing smoke, and where it lands a crater (three
   * cracks) stays about 4 s, with dust and pebbles. All of it is laid now, the landing with its
   * delay, so it shows exactly when its plan booked it; onLand (a shake) runs as it lands.
   */
  function meteor(e, onLand) {
    const got = bookPlan(fx, plan(e));
    const x0 = e.x - 4;
    const y0 = e.y + 9;
    const fall = T.meteor;
    trails.piece(tx.projTex('meteor'), x0, y0, { w: 1.6, life: fall, tint: 0xffb27a, essential: true, fadeIn: 0.01, fadeOut: 0.95, rot: Math.atan2(-(e.y - y0), e.x - x0), vx: (e.x - x0) / fall, vy: (e.y - y0) / fall, book: 'moves' });
    const ns = allowed(METEOR.smoke, got.smoke);
    for (let i = 0; i < ns; i++) {
      const d = i * METEOR.gap; // a puff where the meteor is then
      const k = Math.min(1, d / fall);
      bits('fire', 'smoke', 1, x0 + (e.x - x0) * k, y0 + (e.y - y0) * k, { speed: 0.3, size: 0.4, grow: 0.25, life: METEOR.smokeLife, alpha: 0.8, drag: 1, delay: d, book: 'smoke' });
    }
    const crack = e.radius * 1.1 * Math.sqrt(got.crater ?? 0);
    if (got.crater) for (let i = 0; i < 3; i++) trails.decal(vfx('earth', 'crack'), e.x, e.y, { w: crack, h: crack * VFX_ASPECT.crack, fit: true, rot: (i * Math.PI) / 3 + rand(-0.2, 0.2), hold: 3.4, delay: fall, book: 'crater' });
    bits('earth', 'dust', allowed(8, got.dust), e.x, e.y, { speed: 3, size: S.dust, grow: 0.3, life: METEOR.land, drag: 2, delay: fall, book: 'dust' });
    bits('earth', 'pebble', allowed(6, got.pebbles), e.x, e.y, { vy: 3, speed: 3, gravity: -12, size: S.pebble, life: METEOR.land, spin: 8, delay: fall, book: 'pebbles' });
    let t = 0;
    anims.push((dt) => {
      t += dt;
      if (t < fall) return false;
      onLand?.();
      return true;
    });
  }

  function onEvent(e) {
    switch (e.type) {
      case 'hit':
        hits.push({ id: e.id, x: e.x, y: e.y });
        break;
      case 'breath':
        return breath(e);
      case 'gust':
        return gust(e);
      case 'pulse':
        return pulse(e);
      case 'quake':
        return quake(e);
      case 'pounce':
        return pounce(e);
      case 'ping':
        return ping(e);
      case 'pushed':
        return pushed(e);
      case 'strike':
        return strike(e);
      case 'spread':
        return spread(e);
      case 'stun':
        return stun(e);
      case 'freeze':
        return freeze(e);
      case 'bite':
        return bite(e);
      case 'weaken':
        return weaken(e);
      default:
        break;
    }
  }

  function update(dt) {
    trails.setReduced(stage.reduced);
    for (let i = anims.length - 1; i >= 0; i--) if (anims[i](dt)) anims.splice(i, 1);
    hits.length = 0;
    trails.update(dt);
  }

  function reset() {
    anims.length = 0;
    hits.length = 0;
    trails.reset();
  }

  return { onEvent, kill, meteor, chain, addon, update, reset };
}
