// The renderer keeps to its light plan (src/art/attack-vfx.js attackLight). Every attack event, at
// every ladder stage, with the light budget granting all, half or a third and with Reduce motion,
// is drawn by the real src/render/attacks.js and shots.js into recording stand-ins for the trails
// and the particle pool. Each draw names the plan item that pays for it (`book`); it must show
// inside that item's booked window (from its delay, for its life) and, with the rest of its item,
// light no more than the item booked: its box at its biggest × its piece's share, its count, its
// lines' length × width. Moving bodies ('moves') are exempt, as docs/ux/photosafe.md rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { createAttacks } from '../src/render/attacks.js';
import { createShots } from '../src/render/shots.js';
import { RIBBON_POINTS, sizeOf } from '../src/render/trails.js';
import { VFX_FALLBACK } from '../src/render/vfx-fallback.js';
import { ATTACK_EVENT, LADDER, STAGES, VFX_ASPECT, VFX_SIZE as S, attackLight, harpoonFlight, pieceLit } from '../src/art/attack-vfx.js';
import { DECAL } from '../src/ux/photosafe.js';
import { ELEMENTS, ELEMENT_KEYS, profileFor } from '../src/sim/classes.js';
import { FIELD, cellY, laneX } from '../src/config.js';

const EPS = 1e-6;
const DT = 1 / 120;
const LADDER_PRICKS = Object.fromEntries(STAGES.map((st) => [st, LADDER.nature[st].pricks]));

// --- stand-in textures: each piece's code-drawn size (or a generated sprite's), with its share ---
const shareOf = new Map(); // texture → the share of its box it lights
const idOf = new Map();
function texture(id, w, h, share) {
  const t = new Texture({ source: new TextureSource({ width: w, height: h }) });
  shareOf.set(t, share);
  idOf.set(t, id);
  return t;
}
/** The textures the renderer draws with; `sizes` overrides a piece's size (a generated sprite: { 'nature.tendril': [w, h] }). */
function textures(sizes = {}) {
  const vfx = new Map();
  const support = {
    core: texture('linkcore', 128, 40, 0), // it lies inside its link's box: it lights nothing more
    ping: texture('ping', 128, 128, pieceLit('ping')),
    poof: texture('poof', 128, 128, pieceLit('poof')),
    meteor: texture('meteor', 112, 112, 1),
    dot: texture('dot', 64, 64, pieceLit('dot')),
    spark: texture('spark', 64, 64, pieceLit('dot')),
    puddle: texture('puddle', 256, 256, 0),
    shadow: texture('shadow', 128, 48, 0),
  };
  return {
    vfxTex(el, piece) {
      const id = `${el}.${piece}`;
      if (!vfx.has(id)) {
        const [w, h] = sizes[id] ?? VFX_FALLBACK[`vfx.${id}`];
        vfx.set(id, texture(id, w, h, pieceLit(id)));
      }
      return vfx.get(id);
    },
    linkCoreTex: () => support.core,
    pingTex: () => support.ping,
    poofTex: () => support.poof,
    projTex: () => support.meteor,
    softDot: () => support.dot,
    sparkTex: () => support.spark,
    puddleTex: () => support.puddle,
    shadowTex: () => support.shadow,
  };
}

/** A ribbon's area: its polyline, tapering from `width` at the head to width × taper at the tail. */
function ribbonArea(r) {
  const n = Math.min(r.n, RIBBON_POINTS);
  let area = 0;
  for (let i = 1; i < n; i++) {
    const w0 = r.width * (1 - (1 - r.taper) * ((i - 1) / (n - 1)));
    const w1 = r.width * (1 - (1 - r.taper) * (i / (n - 1)));
    area += Math.hypot(r.xs[i] - r.xs[i - 1], r.ys[i] - r.ys[i - 1]) * ((w0 + w1) / 2);
  }
  return area;
}

/**
 * The renderer with recording stand-ins: the light budget grants `grant` of each share item (and
 * every whole item only when 1), and every draw is recorded with what it lights and when.
 */
function harness({ grant = 1, reduced = false, sizes } = {}) {
  const tx = textures(sizes);
  const rec = { now: 0, books: [], draws: [], ribbons: [] };
  const fx = {
    flashShare(lit, life, min = 0, delay = 0) {
      const got = grant > min ? grant : 0;
      rec.books.push({ lit, life, delay, at: rec.now, got });
      return got;
    },
    flashAll(lit, life, delay = 0) {
      const got = grant >= 1 ? 1 : 0;
      rec.books.push({ lit, life, delay, at: rec.now, got, all: true });
      return got === 1;
    },
    particle(t, x, y, o = {}) {
      const size = (o.size ?? 0.2) + Math.max(0, o.grow ?? 0); // its long edge at its biggest
      const start = rec.now + (o.delay ?? 0);
      rec.draws.push({ kind: 'bit', key: o.book, id: idOf.get(t), start, end: start + (o.life ?? 0.5), light: size * size * shareOf.get(t) });
      return {};
    },
  };
  const sprite = () => ({ visible: false, texture: tx.vfxTex('ice', 'shard'), rotation: 0, position: { set() {} }, scale: { x: 1, y: 1, set() {} } });
  const trails = {
    piece(t, x, y, o = {}) {
      const [w, h] = sizeOf(t, o);
      const g = Math.max(o.grow?.[0] ?? 1, o.grow?.[1] ?? 1);
      const start = rec.now + (o.delay ?? 0);
      rec.draws.push({ kind: 'piece', key: o.book, id: idOf.get(t), start, end: start + (o.life ?? 0.3), light: w * h * g * g * shareOf.get(t), w, h, asked: o.w, tex: t });
      return { key: rec.draws.length, x, y };
    },
    decal(t, x, y, o = {}) {
      const [w, h] = sizeOf(t, o);
      const g = o.grow ?? 1;
      const start = rec.now + (o.delay ?? 0);
      rec.draws.push({ kind: 'decal', key: o.book, id: idOf.get(t), start, end: start + DECAL.rise, light: w * h * g * g * shareOf.get(t), w, h, asked: o.w, tex: t });
      return {};
    },
    ribbon(key, el, tint, o = {}) {
      const r = { key, xs: new Float32Array(RIBBON_POINTS), ys: new Float32Array(RIBBON_POINTS), n: 0, alpha: o.alpha ?? 1, width: o.width ?? 0.35, taper: o.taper ?? 0.3, book: o.book, start: rec.now, end: rec.now, light: 0, released: false };
      rec.ribbons.push(r);
      return r;
    },
    releaseRibbon(key) {
      for (const r of rec.ribbons) if (r.key === key) r.released = true;
    },
    attach: () => ({ ghosts: { push() {}, draw() {} }, escorts: [sprite(), sprite()], rider: sprite(), tether: sprite(), tetherInk: sprite(), ribbon: null, ribbonKey: null }),
    detach() {},
    shotRibbon(slot, key, el, tint, o) {
      slot.ribbon = trails.ribbon(key, el, tint, { ...o, book: 'moves' });
      slot.ribbonKey = key;
      return slot.ribbon;
    },
    tether(slot, x0, y0, x1, y1, color, U, alpha, k) {
      rec.draws.push({ kind: 'line', key: 'tether', id: 'tether', start: rec.now, end: rec.now, light: Math.hypot(x1 - x0, y1 - y0) * S.tether * k * pieceLit('tether') });
    },
    setReduced() {},
    update() {},
    reset() {},
  };
  const stage = { reduced, shake() {}, layers: { path: new Container(), shots: new Container(), fx: new Container() }, sx: (x) => x * 35, sy: (y) => 600 - y * 35, view: { U: 35 } };
  const attacks = createAttacks(stage, fx, trails, tx);
  const shots = createShots(stage, fx, trails, attacks, tx);
  /** Run the clock on (the attacks' animations: ribbons racing or fading, ropes, the meteor), noting each live ribbon. */
  rec.run = (seconds) => {
    for (let t = 0; t < seconds; t += DT) {
      rec.now += DT;
      attacks.update(DT);
      for (const r of rec.ribbons) {
        if (r.released || !(r.alpha > 0) || r.n < 2) continue;
        r.end = rec.now;
        r.light = Math.max(r.light, ribbonArea(r));
      }
    }
  };
  return { rec, attacks, shots, tx };
}

/**
 * Hold what one event drew to what it booked: the plan's items (as attacks.js asks for them, in
 * order) against the bookings the stand-in budget saw, and every draw against its item.
 */
function conforms(rec, plan, label) {
  const items = plan?.items ?? [];
  assert.equal(new Set(items.map((it) => it.key)).size, items.length, `${label}: every item has its own key (bookPlan keys the grants by it)`);
  assert.equal(rec.books.length, items.length, `${label}: one booking per item`);
  const byKey = new Map(items.map((it, i) => [it.key, { it, b: rec.books[i] }]));
  items.forEach((it, i) => {
    const b = rec.books[i];
    assert.ok(Math.abs(b.lit - it.lit) < EPS && Math.abs(b.life - it.life) < EPS && Math.abs(b.delay - (it.delay ?? 0)) < EPS, `${label} ${it.key}: booked as planned`);
  });
  const spans = new Map(); // key → its draws' [start, end] and light
  const draws = [...rec.draws, ...rec.ribbons.map((r) => ({ kind: 'ribbon', key: r.book, id: 'ribbon', start: r.start, end: r.end, light: r.light * pieceLit('ribbon') }))];
  for (const d of draws) {
    assert.ok(d.key, `${label}: a ${d.kind} (${d.id}) names what pays for it`);
    if (d.key === 'moves') continue; // moving bodies are exempt
    const m = byKey.get(d.key);
    assert.ok(m, `${label}: ${d.key} (${d.id}) is in the plan`);
    assert.ok(m.b.got > 0, `${label}: ${d.key} is drawn only when granted`);
    const from = m.b.at + (m.it.delay ?? 0);
    const to = from + m.it.life;
    assert.ok(d.start >= from - EPS, `${label} ${d.key}: shows at ${d.start.toFixed(3)} s, booked from ${from.toFixed(3)}`);
    assert.ok(d.end <= to + EPS, `${label} ${d.key} (${d.id}): shows until ${d.end.toFixed(3)} s, booked until ${to.toFixed(3)}`);
    if (!spans.has(d.key)) spans.set(d.key, []);
    spans.get(d.key).push(d);
  }
  // at any moment, an item's draws together light no more than it booked (a tether is drawn anew each frame)
  for (const [key, list] of spans) {
    const { it, b } = byKey.get(key);
    let most = 0;
    for (const a of list) most = Math.max(most, list.reduce((sum, d) => (d.start <= a.start + EPS && d.end >= a.start - EPS ? sum + d.light : sum), 0));
    assert.ok(most <= it.lit * b.got + 1e-6, `${label} ${key}: lights ${most.toFixed(3)} u² at once, booked ${(it.lit * b.got).toFixed(3)}`);
  }
}

/** A block of an element at a stage, and the colours its attack events carry (classes.js profileFor). */
const blockAt = (el, stage, i = ELEMENT_KEYS.indexOf(el)) => {
  const partner = ELEMENT_KEYS[(i + 1) % 8];
  const apex = ELEMENT_KEYS[(i + 2) % 8];
  const [tier, cls] = { 16: [4, { element: el }], 64: [6, { element: el }], 128: [7, { element: el }], 256: [8, { element: el, fusion: partner }], 4096: [12, { element: el, fusion: partner, ultimate: apex }] }[stage];
  const t = { id: 1, tier, cls, x: laneX(1), y: cellY(3) };
  return { t, prof: profileFor(t) };
};

/** The event an element's attack makes at a stage (as defense.js pushes it). */
function attackEvent(el, stage, hits = 3) {
  const { t, prof } = blockAt(el, stage);
  const base = { x: t.x, y: t.y, colors: prof.colors, tier: t.tier };
  const foe = { x: t.x, y: t.y + 3 };
  switch (ATTACK_EVENT[el]) {
    case 'breath':
      return { type: 'breath', ...base, dir: 1, reach: prof.shoot.reach, lanes: prof.shoot.lanes ?? 0, hits };
    case 'gust':
      return { type: 'gust', ...base, lane: 1, lanes: prof.shoot.lanes, reach: prof.shoot.reach, hits };
    case 'pulse':
      return { type: 'pulse', ...base, radius: prof.shoot.radius, hits };
    case 'quake':
      return { type: 'quake', ...base, lane: 1, lanes: prof.shoot.lanes, reach: prof.shoot.reach, hits };
    case 'pounce':
      return { type: 'pounce', from: { x: t.x, y: t.y }, to: foe, colors: prof.colors, tier: t.tier };
    case 'ping':
      return { type: 'ping', id: 9, ...foe, from: { x: t.x, y: t.y }, colors: prof.colors, tier: t.tier };
    default: // impacts: Horn Arc's chain, Venom Spit's landing
      return el === 'lightning'
        ? { type: 'impact', kind: 'zap', element: el, pattern: 'chain', ...base, chain: [{ x: t.x, y: t.y }, foe, { x: foe.x + 1.5, y: foe.y + 1 }, { x: foe.x + 2.5, y: foe.y + 2 }], splash: 0 }
        : { type: 'impact', kind: 'lob', element: el, pattern: 'spit', ...base, ...foe, splash: 2, miss: false };
  }
}

/** Draw one event (as main.js routes it), run its animations out, and hold it to its plan. */
function check(e, opts, label, before = []) {
  const { rec, attacks, shots } = harness(opts);
  for (const h of before) attacks.onEvent(h);
  if (e.type === 'impact') shots.impact(e);
  else if (e.type === 'kill') attacks.kill(e);
  else if (e.type === 'meteor') attacks.meteor(e);
  else attacks.onEvent(e);
  rec.run(2.5);
  conforms(rec, attackLight(e, { reduced: !!opts.reduced }), label);
  return rec;
}

const MODES = [
  { grant: 1, reduced: false },
  { grant: 0.5, reduced: false },
  { grant: 0.3, reduced: false },
  { grant: 1, reduced: true },
];
const tag = (o) => `grant ${o.grant}${o.reduced ? ', reduced' : ''}`;

test('every attack at every stage draws inside what it booked: its window, its box, its count', () => {
  let drawn = 0;
  for (const mode of MODES) {
    for (const el of ELEMENT_KEYS) {
      for (const st of STAGES) {
        const rec = check(attackEvent(el, st), mode, `${el} ${st} (${tag(mode)})`);
        drawn += rec.draws.length + rec.ribbons.length;
      }
    }
  }
  assert.ok(drawn > 1000, `${drawn} draws held to their plans`);
});

test('the impacts, the war around the attacks and the statuses draw inside what they booked', () => {
  const fusion = profileFor({ id: 2, tier: 8, cls: { element: 'lightning', fusion: 'fire' } });
  const events = [
    { type: 'strike', x: 0, y: 1 },
    { type: 'strike', x: 1, y: 9 },
    { type: 'strike', x: -2, y: FIELD.spawnY - 0.6 }, // a foe just out of the gate: the bolt's bends are most of it
    { type: 'kill', x: 1, y: 8, boss: false, enemy: { def: { size: 0.5, color: '#4a4a66' } } },
    { type: 'kill', x: 1, y: 12, boss: true, enemy: { def: { size: 1.05, color: '#c04848', boss: true } } },
    { type: 'stun', x: 0, y: 8 },
    { type: 'freeze', x: 0, y: 8 },
    { type: 'bite', x: 0, y: 8 },
    { type: 'weaken', x: 0, y: 8 },
    { type: 'spread', from: { x: 0, y: 8 }, to: { x: 0.4, y: 8.2 } }, // short: its sag is most of it
    { type: 'spread', from: { x: -2, y: 8 }, to: { x: 2, y: 11 } },
    { type: 'meteor', x: 0.5, y: 10, radius: 2.2 },
    { type: 'pushed', by: 'earth', x: 0, y: 10, from: { x: 0, y: 9.4 } },
    ...STAGES.map((st) => ({ type: 'pushed', by: 'wind', x: laneX(1), y: 10, from: { x: laneX(1), y: 9 }, tier: blockAt('wind', st).t.tier, colors: blockAt('wind', st).prof.colors })),
    // projectile impacts of every element at every stage (the harpoon's burst and frost, a chain's jumps, a miss)
    ...ELEMENT_KEYS.flatMap((el) => STAGES.map((st) => ({ type: 'impact', kind: 'shot', element: el, pattern: 'lance', x: 1, y: 9, tier: blockAt(el, st).t.tier, colors: blockAt(el, st).prof.colors, splash: 0 }))),
    { type: 'impact', kind: 'shot', element: 'earth', pattern: 'lance', x: 1, y: 9, tier: 7, colors: [ELEMENTS.earth.color], splash: 0, miss: true },
    { type: 'impact', kind: 'shot', element: null, pattern: 'single', x: 1, y: 9, tier: 2, colors: ['#d9d2c5'], splash: 0 },
    { type: 'impact', kind: 'skill', element: 'fire', pattern: 'cone', x: 1, y: 9, tier: 8, colors: [ELEMENTS.fire.color], splash: 0 },
    { type: 'impact', kind: 'shot', element: 'lightning', pattern: 'chain', x: 1, y: 9, tier: 8, colors: fusion.colors, splash: 0, chain: [{ x: 1, y: 9 }, { x: 2, y: 10 }, { x: 0, y: 11 }] },
  ];
  for (const mode of MODES) for (const e of events) check(e, mode, `${e.type}${e.by ? ' ' + e.by : ''}${e.element !== undefined ? ' ' + e.element : ''} (${tag(mode)})`);
});

test('a pulse pricks and reaches only as many foes as it struck, though other attacks struck more nearby', () => {
  for (const st of ['16', '64', '128', '256', '4096']) {
    for (const mode of MODES) {
      const e = attackEvent('nature', st, 2); // it struck 2 …
      // … but this frame six foes were struck around it, by other attacks too
      const hits = Array.from({ length: 6 }, (_, i) => ({ type: 'hit', id: 100 + i, x: e.x + Math.cos(i) * (e.radius * 0.8), y: e.y + Math.sin(i) * (e.radius * 0.8) }));
      const rec = check(e, mode, `pulse ${st} with 6 hits around (${tag(mode)})`, hits);
      assert.ok(rec.draws.filter((d) => d.key === 'tendrils').length <= 2, 'tendrils to the 2 it struck at most');
      assert.ok(rec.draws.filter((d) => d.key === 'pricks').length <= 2 * (LADDER_PRICKS[st] ?? 2), 'thorns for the 2 it struck at most');
    }
  }
});

test('long pieces are drawn to their length with their own shape, inside their box, whatever the sprite', () => {
  // the generated sprites as the game trims them, a fatter one, and a compact spiral (the first tendril)
  const variants = [
    { 'nature.tendril': [246, 42], 'earth.crack': [246, 60] },
    { 'nature.tendril': [200, 60], 'earth.crack': [180, 90] },
    { 'nature.tendril': [120, 120], 'earth.crack': [120, 110] },
  ];
  let reached = 0;
  for (const sizes of variants) {
    for (const mode of MODES) {
      const recs = [
        check(attackEvent('nature', '128', 3), { ...mode, sizes }, `tendrils ${JSON.stringify(sizes)} (${tag(mode)})`, [1, 2, 3].map((i) => ({ type: 'hit', id: i, x: laneX(1) + i * 0.7, y: cellY(3) + 1.5 }))),
        check(attackEvent('earth', '256', 3), { ...mode, sizes }, `cracks ${JSON.stringify(sizes)} (${tag(mode)})`),
        check({ type: 'meteor', x: 0, y: 9, radius: 2.4 }, { ...mode, sizes }, `crater ${JSON.stringify(sizes)} (${tag(mode)})`),
      ];
      for (const d of recs.flatMap((r) => r.draws)) {
        if (d.id !== 'nature.tendril' && d.id !== 'earth.crack') continue;
        // never squashed or stretched: the sprite's own shape, and its full length when it is thin enough
        assert.ok(Math.abs(d.w / d.h - d.tex.width / d.tex.height) < 1e-6, `${d.id} ${JSON.stringify(sizes)}: drawn ${d.w.toFixed(2)} × ${d.h.toFixed(2)}, its sprite ${d.tex.width} × ${d.tex.height}`);
        const thin = d.tex.height / d.tex.width <= (d.id === 'nature.tendril' ? VFX_ASPECT.tendril : VFX_ASPECT.crack) + 1e-9;
        if (thin) {
          assert.ok(Math.abs(d.w - d.asked) < 1e-6, `${d.id}: a thin sprite reaches its length`);
          reached += 1;
        }
      }
    }
  }
  assert.ok(reached > 20, `${reached} thin long pieces drawn to their full length`);
});

test('the meteor books its crater, dust and pebbles from where it lands, and draws them there and then', () => {
  const { rec, attacks } = harness();
  let landed = null;
  attacks.meteor({ type: 'meteor', x: 0, y: 9, radius: 2.2 }, () => (landed = rec.now));
  rec.run(1.5);
  const plan = attackLight({ type: 'meteor', x: 0, y: 9, radius: 2.2 });
  const crater = plan.items.find((it) => it.key === 'crater');
  assert.ok(crater.delay > 0.2, 'the crater books from the landing');
  assert.ok(Math.abs(landed - crater.delay) <= DT + EPS, `it lands at ${landed?.toFixed(3)} s, as booked (${crater.delay})`);
  for (const d of rec.draws.filter((x) => x.key === 'crater' || x.key === 'dust' || x.key === 'pebbles')) assert.ok(d.start >= crater.delay - EPS);
  conforms(rec, plan, 'meteor');
});

test('a thrown harpoon or glob: its tether, drips and add-on stay inside the throw’s booking, even on a long chase', () => {
  for (const st of STAGES) {
    for (const mode of MODES) {
      for (const [pattern, el] of [['lance', 'ice'], ['spit', 'poison']]) {
        const { t, prof } = blockAt(el, st);
        const { rec, shots } = harness(mode);
        const s = { id: 7, pattern, kind: pattern === 'spit' ? 'lob' : 'homing', ox: t.x, oy: t.y, x: t.x, y: t.y, tx: t.x + 0.5, ty: t.y + 5, h: 0, delay: 0, tier: t.tier, prof: { element: el, colors: prof.colors } };
        const throwEvent = { type: 'fire', pattern, tier: t.tier, colors: prof.colors, x: s.ox, y: s.oy, target: { x: s.tx, y: s.ty } };
        // the foe runs away: the harpoon flies twice as long as booked; the glob lands after 0.6 s
        const flight = pattern === 'spit' ? 0.6 : 2 * harpoonFlight(Math.hypot(s.tx - s.ox, s.ty - s.oy));
        for (let time = 0; time < flight; time += 1 / 60) {
          const u = time / flight;
          if (pattern === 'spit') {
            s.x = s.ox + (s.tx - s.ox) * u;
            s.y = s.oy + (s.ty - s.oy) * u;
            s.h = 4 * u * (1 - u);
          } else {
            s.x = s.ox + (s.tx - s.ox) * u * 2;
            s.y = s.oy + (s.ty - s.oy) * u * 2; // chasing it twice as far
          }
          shots.sync([s], 1 / 60, []);
          rec.now += 1 / 60;
        }
        shots.sync([], 1 / 60, []);
        conforms(rec, attackLight(throwEvent, { reduced: mode.reduced }), `${pattern} ${st} (${tag(mode)})`);
      }
    }
  }
});
