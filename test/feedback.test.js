// The readable feedback (src/render/feedback.js, 2026-10-23): a healed block's green "+" marks and pulse,
// one "+" per hurt block at a wave's refill, a status's word popping over a foe the first time it lands
// (the strongest first, one per foe a while, a few a second over the field), the impact frame (a star
// in the element's colour, its shards, the foe held), every element's hit spark, buff icons, and the
// ice lance's frost trail (src/render/shots.js). What the renderer books in the light budget is what
// feedbackLight says (the flash audit, tools/flash-audit.mjs, models it from that), or less. Also the
// foe view's part (src/render/foes.js): a punch's hold, stun stars, root vines. On stand-ins: Node has
// no canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { BUFF, HEAL, IMPACT, IMPACT_COLOR, LATER, LOW_ROOM, MOTE_LIT, PILL_ASPECT, POP, SPARKS, SPARK_LIMIT, STATUSES, TRAIL, createFeedback, feedbackLight, newStatus, plusCount, plusSize, popKind, popShown, rateLimit, statusesOf } from '../src/render/feedback.js';
import { PILL, STATUS_LOOK, drawPill, pillFit } from '../src/render/feedback-textures.js';
import { PUNCH, STUN_STARS, createFoes, drawVines } from '../src/render/foes.js';
import { TRAIL_EVERY, createShots } from '../src/render/shots.js';
import { FOE_FLASH, POINT, spriteLit } from '../src/ux/photosafe.js';
import { ELEMENTS, ELEMENT_KEYS } from '../src/sim/classes.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { laneX } from '../src/config.js';
import { getLang, setLang, tr } from '../src/i18n/index.js';

const DT = 1 / 60;
const EPS = 1e-9;
const U = 30;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} vs ${b}`);
const sum = (list) => list.reduce((k, b) => k + b.lit, 0);

/** A recording light budget: whole items granted while `grant`, share items `share` (0 under their floor). */
function budget({ grant = true, share = 1 } = {}) {
  return {
    grant, // a test may change it as it goes
    alls: [],
    shares: [],
    parts: [],
    rings: [],
    flashAll(lit, life, delay = 0) {
      this.alls.push({ lit, life, delay });
      return this.grant;
    },
    flashShare(lit, life, min = 0) {
      const got = share > min ? share : 0;
      this.shares.push({ lit, life, min, got });
      return got;
    },
    particle(t, x, y, o = {}) {
      this.parts.push({ t, x, y, o });
      return {};
    },
    ring(x, y, color, r0, r1, life) {
      this.rings.push({ x, y, color, r0, r1, life });
    },
  };
}

/** The feedback on a stand-in stage: `run` is what each update reads; `step` advances it. */
function scene({ reduced = false, grant = true, share = 1, icons = () => null, viewOf = () => null } = {}) {
  const stage = { reduced, layers: { numbers: new Container() }, view: { U }, sx: (x) => 300 + x * U, sy: (y) => 900 - y * U };
  const fx = budget({ grant, share });
  const T = { plus: tex(64, 64), star: tex(128, 128), shard: tex(32, 64), leaf: tex(48, 32), bubble: tex(32, 32), dot: tex(64, 64), spark: tex(64, 64), ring: tex(64, 64) };
  const pilled = []; // the statuses whose pill was asked for
  const pills = new Map();
  const tx = {
    plus: () => T.plus,
    star: () => T.star,
    shard: () => T.shard,
    leaf: () => T.leaf,
    bubble: () => T.bubble,
    stunStar: () => tex(32, 32),
    pill(kind) {
      pilled.push(kind);
      if (!pills.has(kind)) pills.set(kind, tex(PILL.h * 3, PILL.h)); // a pill 3:1
      return pills.get(kind);
    },
  };
  const punches = [];
  const foes = { punch: (id, o) => (punches.push({ id, ...o }), true), viewOf };
  const fb = createFeedback({ stage, fx, foes, tx, dot: () => T.dot, spark: () => T.spark, ring: () => T.ring, icons });
  const run = { tiles: [], enemies: [] };
  const step = (seconds = DT) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) fb.update(DT, run);
  };
  const sprites = () => stage.layers.numbers.children[0].children;
  return { fb, fx, T, run, step, sprites, pilled, punches, stage };
}

const foe = (id, o = {}) => ({ id, x: 1, y: 8, boss: false, freezeT: 0, chillT: 0, stunT: 0, rootT: 0, burn: { stacks: 0 }, poison: { stacks: 0 }, ...o });

test('pure helpers: "+" counts by heal size, the token bucket, a foe’s statuses and which one pops', () => {
  assert.deepEqual([0.02, 0.059, 0.06, 0.19, 0.2, 1].map(plusCount), [1, 1, 2, 2, 3, 3]);
  assert.ok(plusSize(0) > plusSize(1) && plusSize(1) === plusSize(2), 'the first "+" is the biggest');
  const gate = rateLimit(4);
  assert.deepEqual([0, 0, 0, 0, 0].map((t) => gate.take(t)), [true, true, true, true, false], 'four at once, then none');
  assert.equal(gate.take(0.1), false, 'a tenth of a second refills 0.4');
  assert.equal(gate.take(0.3), true, 'and then there is one');
  assert.equal(gate.take(0.3), false);
  gate.give();
  assert.equal(gate.take(0.3), true, 'a token handed back (a pop the light budget refused)');
  const f = foe(1, { freezeT: 1, chillT: 2, burn: { stacks: 2 } });
  assert.deepEqual([...statusesOf(f)].sort(), ['burn', 'frozen'], 'a frozen foe is not also shown as slowed');
  assert.equal(newStatus(new Set(), statusesOf(f)), 'frozen', 'two at once: the strongest');
  assert.equal(newStatus(new Set(['frozen']), statusesOf(f)), 'burn', 'then the one that is new');
  assert.equal(newStatus(statusesOf(f), statusesOf(f)), null, 'nothing new: no pop');
  assert.equal(newStatus(null, new Set(['slow'])), 'slow');
  assert.deepEqual([...statusesOf(foe(2, { chillT: 1 }))], ['slow']);
  assert.deepEqual([...statusesOf({ id: 3 })], [], 'a foe without timers has none');
  // a foe's pops step by step: a new status waits for its turn (POP.retry s at most), the strongest first
  const rec = { st: new Set(), next: 0, pending: null };
  assert.equal(popKind(rec, new Set(['burn', 'stun']), 1), 'stun');
  popShown(rec, 1);
  rec.st = new Set(['burn', 'stun']);
  assert.equal(popKind(rec, new Set(['burn', 'stun', 'root']), 1.1), null, 'within POP.perFoe it waits');
  rec.st = new Set(['burn', 'stun', 'root']);
  assert.equal(popKind(rec, rec.st, 1 + POP.perFoe), null, 'longer than POP.retry: dropped');
  rec.st = new Set();
  assert.equal(popKind(rec, new Set(['slow']), 3), 'slow');
  assert.equal(popKind(rec, new Set(), 3.1), null, 'over before its turn: dropped');
});

test('every status a pop can name has its look and its word in both languages, on a pill no wider than the audit books (a long word is condensed)', () => {
  const was = getLang();
  try {
    for (const lang of ['en', 'vi']) {
      setLang(lang);
      for (const { kind } of STATUSES) {
        assert.ok(STATUS_LOOK[kind], `${kind}: its colour and icon`);
        const word = tr(`fx.status.${kind}`);
        assert.notEqual(word, `fx.status.${kind}`, `${lang} ${kind}: its word`);
        assert.equal(word, word.toUpperCase(), `${lang} ${kind}: a pop shouts`);
      }
    }
  } finally {
    setLang(was);
  }
  // the pill: its width never over PILL.aspect × its height; a word too long for that is condensed
  const short = pillFit(70);
  assert.equal(short.squeeze, 1);
  assert.ok(short.w / PILL.h < PILL_ASPECT);
  const long = pillFit(159); // ĐÓNG BĂNG in Baloo 2 at 800, 28 px (measured in the browser)
  assert.ok(long.w <= PILL.h * PILL_ASPECT + EPS, `${long.w} px wide`);
  assert.ok(long.squeeze < 1 && long.squeeze > 0.85, `condensed to ${long.squeeze.toFixed(2)}`);
  // drawn as fitted: the word squeezed by that much, the pill's width returned
  const calls = [];
  const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => calls.push([k, ...a])), set: (o, k, v) => ((o[k] = v), true) });
  assert.equal(drawPill(g, 'frozen', 'ĐÓNG BĂNG', () => 159), long.w);
  assert.deepEqual(calls.find((c) => c[0] === 'scale'), ['scale', long.squeeze, 1]);
  calls.length = 0;
  drawPill(g, 'burn', 'BURN', () => 72);
  assert.equal(calls.find((c) => c[0] === 'scale'), undefined, 'a short word as it is');
});

test('a healed block sends up green "+" marks over a soft green pulse: one for a small heal, three for a big one, a block’s heals every HEAL.gap s at most', () => {
  const sc = scene();
  const t = { id: 5, x: 1, y: 2, hp: 50, maxHp: 100 };
  sc.run.tiles.push(t);
  sc.step(); // first sight: nothing
  t.hp += 1; // 1%: under HEAL.minShare
  sc.step();
  assert.equal(sc.fb.floating, 0, 'a heal under HEAL.minShare waits');
  t.hp += 1.5; // 2.5% in all
  sc.step();
  assert.equal(sc.fb.floating, 1, 'one "+" for a small heal');
  assert.deepEqual(sc.fx.rings, [{ x: 1, y: 2, color: 0x52d36b, r0: HEAL.pulse.r0, r1: HEAL.pulse.r1, life: HEAL.pulse.life }], 'over a soft green pulse');
  near(sc.fx.alls[0].lit, spriteLit(plusSize(0) * POP.scale, plusSize(0) * POP.scale, HEAL.plus.lit), 'booked at its pop-in size');
  // a big heal soon after waits out the gap, then shows its whole share at once
  t.hp += 25;
  sc.step();
  assert.equal(sc.fx.alls.length, 1, 'within HEAL.gap it waits');
  sc.step(HEAL.gap);
  const big = sc.fx.alls.slice(1);
  assert.equal(big.length, 3, 'then three "+"');
  big.forEach((b, i) => near(b.delay, i * 0.08, `"+" ${i} one after another`));
  assert.equal(sc.fx.rings.length, 2);
  // the audit's tileHeal books at least what the biggest heal does
  const [item] = feedbackLight({ type: 'tileHeal', id: 5, amount: 25 });
  assert.ok(item.all && item.lit >= sum(big) - EPS, `${item.lit} booked for ${sum(big)}`);
  assert.ok(item.life >= HEAL.plus.life + 0.16 - EPS, 'for as long as the last one lives');
  // the budget full (a Nature pulse's thorns fill it for a moment): the heal waits HEAL.retry s at most for room
  const busy = scene({ grant: false });
  busy.run.tiles.push({ id: 1, x: 0, y: 0, hp: 10, maxHp: 100 });
  busy.step();
  busy.run.tiles[0].hp = 60;
  busy.step(0.3);
  assert.equal(busy.fb.floating, 0, 'no "+" while there is no room (whole or nothing)');
  assert.equal(busy.fx.rings.length, 0, 'nor its pulse');
  busy.fx.grant = true;
  busy.step();
  assert.equal(busy.fb.floating, 3, 'then its "+" rise, for all it healed');
  assert.equal(busy.fx.rings.length, 1);
  const late = scene({ grant: false });
  late.run.tiles.push({ id: 1, x: 0, y: 0, hp: 10, maxHp: 100 });
  late.step();
  late.run.tiles[0].hp = 60;
  late.step(HEAL.retry + 0.1);
  late.fx.grant = true;
  late.step();
  assert.equal(late.fb.floating, 0, 'too late to read as that heal’s: dropped');
  // a block gone from the board is forgotten
  sc.run.tiles.length = 0;
  sc.step();
  sc.run.tiles.push({ ...t, hp: 99 });
  sc.step(1);
  assert.equal(sc.fx.alls.length, 4, 'a block seen again starts from what it has');
});

test('a "+" pops in, rises and fades over its life, then its sprite is reused; under Reduce motion it rises less', () => {
  const rises = [];
  for (const reduced of [false, true]) {
    const sc = scene({ reduced });
    sc.fb.healAt(1, 2, 0.03);
    sc.step();
    const sp = sc.sprites()[0];
    assert.ok(sp.visible);
    assert.equal(sp.position.x, 300 + U * 1, 'over its block');
    const y0 = sp.position.y;
    const h0 = sp.height;
    assert.ok(h0 > plusSize(0) * U, 'it pops in big');
    sc.step(POP.popIn + DT);
    assert.ok(Math.abs(sp.height - plusSize(0) * U) < 1e-6, 'then settles to its size');
    sc.step(0.5);
    rises.push(y0 - sp.position.y);
    assert.ok(sp.alpha > 0.6 && sp.alpha <= 1);
    sc.step(HEAL.plus.life);
    assert.equal(sc.fb.floating, 0, 'gone after its life');
    assert.equal(sp.visible, false);
    sc.fb.healAt(1, 2, 0.03);
    assert.equal(sc.sprites().length, 1, 'its sprite reused');
    sc.fb.reset();
    assert.equal(sc.fb.floating, 0, 'a reset clears them');
  }
  assert.ok(rises[0] > 0 && rises[1] > 0 && rises[1] < rises[0] * 0.5, `it rises ${rises[0].toFixed(1)} px, ${rises[1].toFixed(1)} under Reduce motion`);
});

test('a wave’s refill shows one "+" on each block that had lost health, not a heal burst on every block', () => {
  const sc = scene();
  const hurt = { id: 1, x: 0, y: 1, hp: 40, maxHp: 100 };
  const whole = { id: 2, x: 1, y: 1, hp: 100, maxHp: 100 };
  sc.run.tiles.push(hurt, whole);
  sc.step();
  hurt.hp = 100; // src/sim/run.js: every block back to full, then the event (handled before the views update)
  sc.fb.onEvent({ type: 'tilesRestored', count: 2 });
  sc.step(1);
  assert.equal(sc.fx.alls.length, 1, 'one "+", on the hurt block');
  assert.equal(sc.sprites()[0].position.x, 300, 'over it');
  assert.equal(sc.fx.rings.length, 0, 'and no pulse');
});

test('the first time a status lands on a foe its word pops over it: the strongest first, one per foe a while, a few a second over the field', () => {
  const sc = scene({ viewOf: (id) => (id === 1 ? { fan: 0.4 } : null) });
  const a = foe(1);
  sc.run.enemies.push(a);
  sc.step(); // first sight: what it already has does not pop
  Object.assign(a, { freezeT: 1, chillT: 1, burn: { stacks: 1 } });
  sc.step();
  assert.deepEqual(sc.pilled, ['frozen'], 'two at once: the strongest');
  sc.step();
  const sp = sc.sprites()[0];
  assert.equal(sp.position.x, 300 + (1 + 0.4) * U, 'over the foe, where its crowd fans it');
  assert.ok(sp.width / sp.height > 2.9, 'a pill as wide as its texture');
  near(sc.fx.alls[0].lit, spriteLit(POP.h * 3 * POP.scale, POP.h * POP.scale, POP.lit), 'booked at its own width');
  const [item] = feedbackLight({ type: 'statusPop' });
  assert.ok(item.all && item.lit >= sc.fx.alls[0].lit, 'the audit books its widest');
  a.stunT = 1;
  sc.step();
  assert.deepEqual(sc.pilled, ['frozen'], 'one pop per foe for POP.perFoe s');
  sc.step(POP.perFoe);
  a.rootT = 1;
  sc.step();
  assert.deepEqual(sc.pilled, ['frozen', 'root'], 'then the next new one');
  // a boss's pops sit higher
  const b = scene();
  const boss = foe(9, { boss: true });
  b.run.enemies.push(boss);
  b.step();
  boss.stunT = 1;
  b.step(2 * DT);
  assert.ok(b.sprites()[0].position.y < 900 - (boss.y + 0.85 + POP.above) * U, 'over a boss’s head');
  // over the field: POP.perSecond at once
  const field = scene();
  const many = Array.from({ length: 10 }, (_, i) => foe(i + 1, { x: i * 0.5 }));
  field.run.enemies.push(...many);
  field.step();
  for (const f of many) f.stunT = 1;
  field.step();
  assert.equal(field.pilled.length, POP.perSecond);
  // refused by the light budget (the hit that brought it is lighting up the field): it waits POP.retry s at most
  const late = scene();
  const c = foe(1);
  late.run.enemies.push(c);
  late.step();
  late.fx.grant = false;
  c.chillT = 2;
  late.step(0.2);
  assert.equal(late.fb.floating, 0);
  late.fx.grant = true;
  late.step();
  assert.equal(late.fb.floating, 1, 'it shows once there is room');
  assert.deepEqual(late.pilled.slice(-1), ['slow']);
  const never = scene();
  const d = foe(1);
  never.run.enemies.push(d);
  never.step();
  never.fx.grant = false;
  d.stunT = 5;
  never.step(POP.retry + 0.05);
  never.fx.grant = true;
  never.step();
  assert.equal(never.fb.floating, 0, 'not after POP.retry s: it would be late');
  const gone2 = scene();
  const g2 = foe(1);
  gone2.run.enemies.push(g2);
  gone2.step();
  gone2.fx.grant = false;
  g2.stunT = 1;
  gone2.step();
  g2.stunT = 0;
  gone2.fx.grant = true;
  gone2.step();
  assert.equal(gone2.fb.floating, 0, 'nor once the status is over');
  // the dead pop nothing, and are forgotten
  const gone = scene();
  const g = foe(1);
  gone.run.enemies.push(g);
  gone.step();
  Object.assign(g, { dead: true, burn: { stacks: 3 } });
  gone.step();
  assert.equal(gone.pilled.length, 0);
});

test('an impact frame: a star in the element’s colour behind the hit, its shards, and the struck foe held; the budget short trims it; Reduce motion holds nothing and slows the shards', () => {
  const sc = scene();
  sc.fb.impact(2, 9, 'ice', { foeId: 7 });
  const stars = sc.fx.parts.filter((p) => p.t === sc.T.star);
  const shards = sc.fx.parts.filter((p) => p.t === sc.T.shard);
  assert.equal(stars.length, 1);
  assert.equal(stars[0].o.color, IMPACT_COLOR.ice);
  assert.ok(Math.abs(stars[0].o.size + stars[0].o.grow - IMPACT.star.size) < 1e-9, 'it grows to the full star');
  assert.equal(shards.length, IMPACT.shards.ice);
  assert.ok(shards.every((p) => p.o.color === IMPACT_COLOR.ice));
  assert.deepEqual(sc.punches, [{ id: 7, hold: IMPACT.hold }], 'the foe held for IMPACT.hold');
  // booked as the audit models it (the hold's flash is the foe view's own booking)
  const [star, bits] = feedbackLight({ type: 'impact', pattern: 'lance', x: 2, y: 9 });
  near(sc.fx.alls[0].lit, star.lit, 'the star');
  near(sc.fx.shares[0].lit, bits.lit, 'the shards');
  // other elements: their colour, sparks for shards (only ice, earth and metal break into shards)
  const hot = scene();
  hot.fb.impact(2, 9, 'fire');
  assert.equal(hot.fx.parts.filter((p) => p.t === hot.T.spark).length, IMPACT.shards.other);
  assert.equal(hot.punches.length, 0, 'no foe named: nothing held');
  // the budget short: no star (whole or nothing), fewer shards, none under their floor
  const short = scene({ grant: false, share: 0.5 });
  short.fb.impact(2, 9, 'ice', { foeId: 7 });
  assert.equal(short.fx.parts.filter((p) => p.t === short.T.star).length, 0);
  assert.equal(short.fx.parts.filter((p) => p.t === short.T.shard).length, Math.round(IMPACT.shards.ice * 0.5));
  const starved = scene({ grant: false, share: 0.2 });
  starved.fb.impact(2, 9, 'ice', { foeId: 7 });
  assert.equal(starved.fx.parts.length, 0);
  // Reduce motion: the star and its shards, slow; no hold
  const calm = scene({ reduced: true });
  calm.fb.impact(2, 9, 'ice', { foeId: 7 });
  assert.equal(calm.punches.length, 0);
  const speed = (list) => Math.max(...list.filter((p) => p.t === sc.T.shard || p.t === calm.T.shard).map((p) => Math.hypot(p.o.vx, p.o.vy)));
  assert.ok(speed(calm.fx.parts) < speed(sc.fx.parts) * 0.4, 'its shards barely move');
});

test('the ice lance lands with an impact frame on the foe nearest its landing; a metal bite with one on its foe; a slam with one in its skill’s element, unheld', () => {
  const sc = scene();
  sc.run.enemies.push(foe(3, { x: 1, y: 9 }), foe(4, { x: 3, y: 9 }), foe(5, { x: 1.1, y: 9, dead: true }));
  sc.step();
  sc.fb.lanceHit({ type: 'impact', pattern: 'lance', x: 1.2, y: 9.1 });
  assert.deepEqual(sc.punches, [{ id: 3, hold: IMPACT.hold }], 'the living foe nearest');
  sc.fb.lanceHit({ type: 'impact', pattern: 'lance', x: 9, y: 2 });
  assert.equal(sc.punches.length, 1, 'no foe near: the frame alone');
  assert.equal(sc.fx.parts.filter((p) => p.t === sc.T.star).length, 2);
  sc.fb.onEvent({ type: 'bite', id: 4, x: 3, y: 9 });
  assert.deepEqual(sc.punches.at(-1), { id: 4, hold: IMPACT.hold }, 'a bite holds its foe');
  assert.equal(sc.fx.parts.filter((p) => p.t === sc.T.star).at(-1).o.color, IMPACT_COLOR.metal);
  const bite = feedbackLight({ type: 'bite', id: 4, x: 3, y: 9 });
  assert.equal(bite.length, 3, 'the audit books its star, shards and the hold’s flash');
  for (const el of ELEMENT_KEYS) {
    const s = scene();
    s.fb.onEvent({ type: 'skillFx', fx: 'slam', x: 1, y: 6, r: 1.2, color: ELEMENTS[el].color });
    const star = s.fx.parts.find((p) => p.t === s.T.star);
    assert.equal(star.o.color, IMPACT_COLOR[el], `${el}: a slam in its skill’s colour`);
    assert.equal(s.punches.length, 0, 'unheld');
    const booked = sum(feedbackLight({ type: 'skillFx', fx: 'slam', x: 1, y: 6, r: 1.2 }));
    assert.ok(sum(s.fx.alls) + sum(s.fx.shares) <= booked + EPS, `${el}: drawn within what the audit books`);
  }
});

test('every hit by a pet shows its element’s signature spark (a thorn’s none), as the audit books it, at most one burst per foe every SPARK_LIMIT.perFoe s and SPARK_LIMIT.perSecond over the field', () => {
  for (const el of [...ELEMENT_KEYS, undefined]) {
    const sc = scene();
    const hit = { type: 'hit', id: 1, x: 1, y: 8, amount: 10, element: el };
    sc.fb.onEvent(hit);
    const r = SPARKS[el ?? 'plain'];
    const want = (k) => ({ dot: sc.T.dot, spark: sc.T.spark, ring: sc.T.ring, shard: sc.T.shard, leaf: sc.T.leaf, bubble: sc.T.bubble, star: sc.T.star })[k];
    const mine = sc.fx.parts.filter((p) => p.t === want(r.tex));
    assert.equal(mine.length, r.n + (r.also?.tex === r.tex ? r.also.n : 0), `${el ?? 'plain'}: its ${r.tex}s`);
    assert.ok(sc.fx.parts.every((p) => [...r.colors, ...(r.also?.colors ?? [])].includes(p.o.color)), `${el ?? 'plain'}: in its colours`);
    assert.deepEqual(sc.fx.shares.map((b) => [b.lit, b.life, b.min]), feedbackLight(hit).map((it) => [it.lit, it.life, it.min]), `${el ?? 'plain'}: booked as the audit books it`);
    assert.equal(sc.fx.alls.length, 0, 'sparks book by share');
    assert.ok(feedbackLight(hit).every((it) => it.room === LOW_ROOM), 'the audit knows they yield (LOW_ROOM)');
  }
  const sc = scene();
  sc.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 5, element: 'fire', thorns: true });
  sc.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 0, element: 'fire' });
  assert.equal(sc.fx.parts.length, 0, 'a thorn’s prick and a hit for nothing: none');
  assert.deepEqual(feedbackLight({ type: 'hit', amount: 5, element: 'fire', thorns: true }), []);
  // per foe
  sc.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 5, element: 'fire' });
  sc.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 5, element: 'fire' });
  sc.fb.onEvent({ type: 'hit', id: 2, x: 2, y: 8, amount: 5, element: 'fire' });
  assert.equal(sc.fx.shares.length, 2, 'one burst per foe at a time');
  sc.step(SPARK_LIMIT.perFoe + DT);
  sc.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 5, element: 'fire' });
  assert.equal(sc.fx.shares.length, 3, 'and again after SPARK_LIMIT.perFoe s');
  // over the field
  const field = scene();
  for (let id = 1; id <= 60; id++) field.fb.onEvent({ type: 'hit', id, x: 1, y: 8, amount: 5, element: 'metal' });
  assert.equal(field.fx.shares.length, SPARK_LIMIT.perSecond);
  // a crit adds a smaller impact frame, unheld
  const crit = scene();
  const big = { type: 'hit', id: 1, x: 1, y: 8, amount: 40, element: 'lightning', crit: true };
  crit.fb.onEvent(big);
  const stars = crit.fx.parts.filter((p) => p.t === crit.T.star && p.o.color === IMPACT_COLOR.lightning);
  assert.equal(stars.length, 1, 'a crit’s star');
  assert.ok(Math.abs(stars[0].o.size + stars[0].o.grow - IMPACT.star.size * IMPACT.crit) < 1e-9, 'smaller than a heavy hit’s');
  assert.equal(crit.punches.length, 0, 'crits come often: no hold');
  near(sum(crit.fx.alls) + sum(crit.fx.shares), sum(feedbackLight(big)), 'booked as the audit books it');
});

test('a pet fed a buff sends up the icon of each stat it gained (two at most per element), once the icon has loaded', () => {
  const icon = tex(64, 64);
  const asked = [];
  const sc = scene({ icons: (key) => (asked.push(key), icon) });
  const e = { type: 'buffed', id: 3, x: 1, y: 3, gain: { fire: 1, ice: 3 } };
  sc.fb.onEvent(e);
  assert.deepEqual(asked, ['dmg', 'slow'], 'the cards’ stat icons (ELEMENT_STATS)');
  assert.equal(sc.fb.floating, 3);
  assert.deepEqual(sc.fx.alls.map((b) => b.delay), [0, 0, 0.12]);
  const [item] = feedbackLight(e);
  assert.ok(item.all && item.lit >= sum(sc.fx.alls) - EPS && item.life >= BUFF.life);
  const waiting = scene({ icons: () => null });
  waiting.fb.onEvent(e);
  assert.equal(waiting.fb.floating, 0, 'an icon not loaded yet: nothing');
  // the light budget full at the merge: the icons rise a moment later (LATER.retry s at most)
  const busy = scene({ grant: false, icons: () => icon });
  busy.fb.onEvent(e);
  busy.step(0.2);
  assert.equal(busy.fb.floating, 0);
  busy.fx.grant = true;
  busy.step();
  assert.equal(busy.fb.floating, 3);
  const stale = scene({ grant: false, icons: () => icon });
  stale.fb.onEvent(e);
  stale.step(LATER.retry + 0.1);
  stale.fx.grant = true;
  stale.step();
  assert.equal(stale.fb.floating, 0, 'not after LATER.retry s');
});

test('the lance’s frost: ice-blue motes, every TRAIL.twinkle.every-th an inked twinkle that shrinks away, each booked within what the audit books; Reduce motion keeps them still', () => {
  for (const reduced of [false, true]) {
    const sc = scene({ reduced });
    for (let i = 0; i < 6; i++) sc.fb.frostMote(1, 5 + i * TRAIL.every);
    const twinkles = sc.fx.parts.filter((p) => p.t === sc.T.star);
    const dots = sc.fx.parts.filter((p) => p.t === sc.T.dot);
    assert.equal(twinkles.length, 6 / TRAIL.twinkle.every);
    assert.equal(dots.length, 6 - twinkles.length);
    assert.ok(twinkles.every((p) => p.o.grow < 0 && p.o.color === TRAIL.twinkle.color), 'a twinkle shrinks away');
    assert.ok(dots.every((p) => TRAIL.colors.includes(p.o.color)));
    assert.ok(sc.fx.alls.every((b) => b.lit <= MOTE_LIT + EPS && b.life === TRAIL.life), 'each within MOTE_LIT');
    if (reduced) assert.ok([...dots, ...twinkles].every((p) => !p.o.vx && !p.o.vy && !p.o.spin), 'still under Reduce motion');
  }
  const busy = scene({ grant: false });
  busy.fb.frostMote(1, 5);
  assert.equal(busy.fx.parts.length, 0, 'none when the budget is short');
  // the lowest marks leave the budget's upper half to the rest: no frost, no sparks over LOW_ROOM of its cap
  const full = scene();
  full.fx.lit = POINT.cap * LOW_ROOM + 0.01;
  full.fb.frostMote(1, 5);
  full.fb.onEvent({ type: 'hit', id: 1, x: 1, y: 8, amount: 5, element: 'fire' });
  assert.equal(full.fx.parts.length + full.fx.alls.length + full.fx.shares.length, 0);
  full.fb.impact(1, 8, 'ice', { foeId: 1 });
  assert.equal(full.fx.parts.filter((p) => p.t === full.T.star).length, 1, 'an impact frame still shows');
});

// --- the foe view's part (src/render/foes.js) ---------------------------------------------------------

/** One foe on a stand-in stage; `step` syncs it; fx records what it books. */
function foeScene({ reduced = false, grant = true } = {}) {
  const stage = { reduced, layers: { enemies: new Container() }, view: { U, ox: 300, oy: 900, top: 0 }, sx: (x) => 300 + x * U, sy: (y) => 900 - y * U };
  const fx = { alls: [], burst() {}, particle() {}, number() {}, ring() {}, flashAll(lit, life) {
    this.alls.push({ lit, life });
    return grant;
  } };
  const tx = { enemyTex: () => tex(128, 128), resistTex: () => tex(64, 64), shadowTex: () => tex(64, 32), shieldTex: () => tex(64, 64), softDot: () => tex(64, 64), statusTex: () => tex(64, 64), hasGenerated: () => false, stunStar: () => tex(32, 32) };
  const foes = createFoes(stage, fx, { tx });
  const e = { id: 1, type: 'pixie', def: ENEMY_TYPES.pixie, x: laneX(1), y: 12, lane: 1, hp: 50, maxHp: 100, boss: false, resist: null, burn: { stacks: 0 }, poison: { stacks: 0 }, dot: { burn: 0, poison: 0 }, chillT: 0, freezeT: 0, stunT: 0, rootT: 0, lootT: 0, flash: 0, dirX: 0, dirY: -1 };
  const step = (seconds = DT) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) foes.sync([e], DT);
  };
  step();
  return { foes, fx, e, step, v: foes.viewOf(1) };
}

test('a punch holds a foe’s pose (hit-stop) with a shake and a swell, flashes it white when the budget allows, and ends; none under Reduce motion', () => {
  const sc = foeScene();
  const v = sc.v;
  v.white = tex(64, 64); // its white silhouette (the browser makes it from its texture)
  sc.step(0.3);
  const tall = v.body.scale.y;
  assert.equal(sc.foes.punch(1, { hold: 1 }), true);
  near(v.hold, PUNCH.maxHold, 'a hold no longer than PUNCH.maxHold');
  assert.equal(sc.fx.alls.length, 1, 'its flash booked');
  near(sc.fx.alls[0].lit, FOE_FLASH.share * v.lastSize ** 2, 'at its size');
  sc.step();
  const pose = v.body.rotation;
  assert.ok(v.body.scale.y > tall * 1.05, 'it swells');
  assert.equal(v.flash.alpha, FOE_FLASH.alpha, 'and flashes white');
  sc.step();
  assert.equal(v.body.rotation, pose, 'its pose holds');
  sc.step(PUNCH.maxHold);
  assert.equal(v.hold, 0);
  assert.equal(v.flash.alpha, 0, 'the flash ends with the hold');
  near(v.body.scale.y, tall, 'its size back');
  sc.step(0.2);
  assert.notEqual(v.body.rotation, pose, 'it moves again');
  // the budget short: held, not flashed
  const busy = foeScene({ grant: false });
  busy.v.white = tex(64, 64);
  busy.foes.punch(1);
  busy.step();
  assert.ok(busy.v.hold > 0);
  assert.equal(busy.v.flash.alpha, 0);
  // Reduce motion, or a foe not drawn: nothing
  const calm = foeScene({ reduced: true });
  assert.equal(calm.foes.punch(1), false);
  assert.equal(calm.v.hold, 0);
  assert.equal(sc.foes.punch(99), false);
});

test('a stunned foe has stars circling its head (still under Reduce motion); a rooted one vines round its feet, gone when it is free', () => {
  const sc = foeScene();
  const v = sc.v;
  assert.equal(v.stars.length, STUN_STARS.n);
  assert.ok(v.stars.every((s) => !s.visible));
  sc.e.stunT = 1;
  sc.step();
  assert.ok(v.stars.every((s) => s.visible));
  assert.ok(v.stars.every((s) => s.position.y < v.body.position.y), 'over its head');
  const at = v.stars.map((s) => s.position.x);
  sc.step(0.2);
  assert.ok(v.stars.some((s, i) => Math.abs(s.position.x - at[i]) > 1), 'they circle');
  sc.e.stunT = 0;
  sc.step();
  assert.ok(v.stars.every((s) => !s.visible));
  const calm = foeScene({ reduced: true });
  calm.e.stunT = 1;
  calm.step();
  const still = calm.v.stars.map((s) => s.position.x);
  calm.step(0.2);
  assert.deepEqual(calm.v.stars.map((s) => s.position.x), still, 'they hold still under Reduce motion');
  // vines
  assert.equal(v.vines.context.instructions.length, 0);
  sc.e.rootT = 2;
  sc.step();
  assert.ok(v.vinesAt > 0 && v.vines.context.instructions.length > 0, 'vines drawn');
  const n = v.vines.context.instructions.length;
  sc.step(0.3);
  assert.equal(v.vines.context.instructions.length, n, 'once, not each frame');
  sc.e.rootT = 0;
  sc.step();
  assert.equal(v.vinesAt, 0);
  assert.equal(v.vines.context.instructions.length, 0, 'and cleared');
  // three arcs (ink, then green over it) and two leaves
  const g = drawVines(new (v.vines.constructor)(), 40);
  assert.ok(g.context.instructions.filter((i) => i.action === 'stroke').length >= 6, 'each arc in ink, then green over it');
});

// --- the ice lance's frost (src/render/shots.js) ---------------------------------------------------------

test('the ice lance sheds a frost mote every TRAIL.every world units of flight and lands with an impact frame; other shots shed none, a miss lands none', () => {
  assert.equal(TRAIL_EVERY, TRAIL.every, 'shots.js and feedback.js agree');
  const flights = [];
  for (const pattern of ['lance', 'spit', 'shot']) {
    const motes = [];
    const lands = [];
    const sprite = () => ({ visible: false, texture: tex(64, 64), position: { set() {} }, scale: { x: 1, y: 1, set() {} } });
    const trails = { attach: () => ({ ghosts: { push() {}, draw() {} }, escorts: [sprite(), sprite()], rider: sprite(), tether: sprite(), tetherInk: sprite(), ribbon: null }), detach() {}, shotRibbon() {}, tether() {}, piece: () => ({}), decal: () => ({}), ribbon: () => null, releaseRibbon() {} };
    const fx = { flashShare: () => 1, flashAll: () => true, particle: () => ({}) };
    const stage = { reduced: false, shake() {}, layers: { path: new Container(), shots: new Container(), fx: new Container() }, sx: (x) => x * 35, sy: (y) => 600 - y * 35, view: { U: 35 } };
    const t = tex(64, 64);
    const el = pattern === 'spit' ? 'poison' : pattern === 'lance' ? 'ice' : 'earth';
    const s = { id: 7, pattern, kind: pattern === 'spit' ? 'lob' : 'homing', ox: 1, oy: 2, x: 1, y: 2, tx: 1, ty: 6, h: 0, delay: 0, tier: 6, prof: { element: el, colors: [ELEMENTS[el].color] } };
    const shots = createShots(stage, fx, trails, { onEvent() {} }, { vfxTex: () => t, puddleTex: () => t, shadowTex: () => t }, { frostMote: (x, y) => motes.push({ x, y, head: s.y + 0.35 }), impact: (e) => lands.push(e) }); // head: where its tip is drawn (shots.js HOVER)
    for (let i = 0; i <= 60; i++) {
      s.y = 2 + (4 * i) / 60; // 4 world units in a second
      shots.sync([s], DT, []);
    }
    shots.sync([], DT, []);
    flights.push(motes.length);
    if (pattern === 'lance') {
      assert.equal(motes.length, Math.floor(4 / TRAIL.every + 1e-9), `a mote every ${TRAIL.every} units`);
      assert.ok(motes.every((m, i) => i === 0 || m.y > motes[i - 1].y), 'along its flight');
      assert.ok(motes.every((m) => m.y < m.head - 0.05 && m.y > m.head - 1), 'from its tail, behind its tip');
    }
    shots.impact({ type: 'impact', kind: 'shot', pattern, element: el, x: 1, y: 6, tier: 6, colors: [ELEMENTS[el].color], splash: 0 });
    shots.impact({ type: 'impact', kind: 'shot', pattern, element: el, x: 1, y: 6, tier: 6, colors: [ELEMENTS[el].color], splash: 0, miss: true });
    assert.equal(lands.length, pattern === 'lance' ? 1 : 0, `${pattern}: an impact frame only where the lance lands`);
  }
  assert.deepEqual(flights.slice(1), [0, 0], 'only the lance sheds frost');
  // the audit's model of the motes: about as many as are alive at once, for the flight and a mote's life
  const [item] = feedbackLight({ type: 'fire', pattern: 'lance', x: 1, y: 2, target: { x: 1, y: 6 } });
  const atOnce = Math.min(Math.ceil(4 / TRAIL.every), Math.ceil(TRAIL.life / (TRAIL.every / 9))); // all it sheds, or as many as live at once
  assert.ok(item.lit >= atOnce * MOTE_LIT - EPS && item.life > TRAIL.life);
  assert.equal(item.room, LOW_ROOM, 'and that they yield');
  assert.deepEqual(feedbackLight({ type: 'fire', pattern: 'spit', x: 1, y: 2, target: { x: 1, y: 6 } }), []);
});
