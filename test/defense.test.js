import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefense } from '../src/sim/defense.js';
import { generateWave, ENEMY_TYPES, isBossDay } from '../src/sim/enemies.js';
import { createRng } from '../src/sim/rng.js';
import { profileFor as profileOf } from '../src/sim/classes.js';
import { DEFENSE, FIELD, LANE_LENGTH, SIEGE, cellY, laneX } from '../src/config.js';

const DT = 1 / 60;
const run = (d, blocks, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) d.step(DT, blocks);
};
// a block in board column `col` (its lane); row 0 is the bottom row, next to the wall
const block = (col, tier, cls = {}, id = 1, row = 0) => ({ id, x: laneX(col), y: cellY(row), r: 0.6, tier, cls: { ...cls } });
// lane position measured like an 8-long lane ending at the wall: at(6) is 2 units from the wall
const at = (s) => s + LANE_LENGTH - 8;
// lane position of a height on the field
const sAtY = (y) => FIELD.spawnY - y;

const sturdy = (b, hp = 5000) => Object.assign(b, { hp, maxHp: hp });

test('an enemy that reaches the board stops at the first block in its column and attacks it', () => {
  const d = createDefense({ rng: createRng(1) });
  const top = sturdy(block(1, 1, {}, 1, 3));
  const below = sturdy(block(1, 1, {}, 2, 1));
  const e = d.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.5) });
  run(d, [top, below], 3);
  assert.ok(e.attacking, 'it stopped to attack');
  assert.ok(top.hp < top.maxHp, 'the front block takes the damage');
  assert.equal(below.hp, below.maxHp, 'the block behind it is safe for now');
  assert.ok(Math.hypot(e.x - top.x, e.y - top.y) <= SIEGE.contact + 1e-6);
  assert.ok(d.drainEvents().some((x) => x.type === 'tileHit' && x.id === top.id));
});

test('with its own column empty, an enemy crosses the board to the nearest block', () => {
  const d = createDefense({ rng: createRng(1) });
  const far = sturdy(block(3, 1, {}, 1, 0));
  const e = d.spawn('pixie', { lane: 0, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.5) });
  run(d, [far], 12);
  assert.ok(far.hp < far.maxHp);
  assert.equal(e.lane, Math.round((e.x - laneX(0)) / 2), 'its lane follows where it is on the board');
});

test('a block whose health runs out is reported down once', () => {
  const d = createDefense({ rng: createRng(1) });
  const weak = sturdy(block(1, 1, {}, 1, 3), 5);
  d.spawn('hoodedFlier', { lane: 1, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.2) });
  run(d, [weak], 4);
  assert.ok(weak.hp <= 0);
  assert.equal(d.drainEvents().filter((x) => x.type === 'tileDown').length, 1);
});

test('enemies hit harder in later waves', () => {
  const d = createDefense({ rng: createRng(1) });
  const early = d.spawn('pixie', { lane: 0, atkScale: 1 });
  const late = d.spawn('pixie', { lane: 0, atkScale: SIEGE.attackGrowth ** 9 });
  assert.ok(late.atk > early.atk * 2);
  assert.equal(early.atk, ENEMY_TYPES.pixie.castle * SIEGE.attackPerCastle);
});

test('a block only shoots enemies in its own lane', () => {
  const d = createDefense({ rng: createRng(1) });
  const mine = d.spawn('pixie', { lane: 1, hpScale: 30, s: at(2) });
  const other = d.spawn('pixie', { lane: 3, hpScale: 30, s: at(2) });
  run(d, [block(1, 4)], 2);
  assert.ok(mine.dead, 'enemy in its lane dies');
  assert.equal(other.hp, other.maxHp, 'enemy in another lane is untouched');
});

test('front-most first, and fire spreads instead of overkilling', () => {
  const d = createDefense({ rng: createRng(1) });
  const back = d.spawn('pixie', { lane: 1, hpScale: 30, s: at(4) });
  const front = d.spawn('pixie', { lane: 1, hpScale: 30, s: at(6) });
  back.speed = front.speed = 0;
  d.step(DT, [block(1, 4, {}, 1)]);
  assert.equal(d.shots[0].targetId, front.id);
  d.step(DT, [block(1, 4, {}, 1), block(1, 4, {}, 2)]);
  assert.equal(d.shots.at(-1).targetId, back.id, 'the front one is already doomed');
  run(d, [], 2);
  assert.ok(front.dead && back.dead);
});

test('fire burns over time; fire enemies are immune to burn', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('leafSprite', { lane: 2, hpScale: 400, s: at(5) });
  e.speed = 0;
  const blocks = [block(2, 4, { element: 'fire' })];
  run(d, blocks, 1);
  assert.ok(e.burn.stacks > 0);
  const hp = e.hp;
  run(d, [], 1);
  assert.ok(e.hp < hp, 'burn keeps ticking');
  assert.ok(e.dot.burn > 0, 'burn damage is tracked for display');

  const d2 = createDefense({ rng: createRng(1) });
  const f = d2.spawn('flameSprite', { lane: 2, hpScale: 400, s: at(5) });
  f.speed = 0;
  run(d2, blocks, 1.5);
  assert.ok(f.hp < f.maxHp);
  assert.equal(f.burn.stacks, 0);
});

test('poison stacks up to its cap', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 0, hpScale: 5000, s: at(3) });
  e.speed = 0;
  run(d, [block(0, 4, { element: 'poison' })], 9);
  assert.equal(e.poison.stacks, 6);
});

test('ice slows, then freezes every 4th hit; frozen foes take +25% damage', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(1) });
  const blocks = [block(1, 4, { element: 'ice' })];
  e.speed = 0;
  run(d, blocks, 1.6);
  assert.ok(e.chillT > 0 && e.chillSlow > 0);
  run(d, blocks, 5.5);
  assert.ok(e.iceHits >= 4);
  e.freezeT = 1;
  const s = e.s;
  run(d, [], 0.5);
  assert.equal(e.s, s, 'frozen enemies do not move');
  const before = e.hp;
  d.damage(e, 100, ['physical']);
  assert.ok(Math.abs(before - e.hp - 125) < 1e-6);
});

test('lightning chains across lanes, earth splashes and knocks back, wind pierces the lane', () => {
  const zap = createDefense({ rng: createRng(1) });
  const z = [1, 2, 3].map((lane) => zap.spawn('hoodedFlier', { lane, hpScale: 5000, s: at(4) }));
  run(zap, [block(1, 4, { element: 'lightning' })], 0.05);
  assert.ok(z.every((e) => e.hp < e.maxHp), 'one spark arcs into the next lanes');

  const quake = createDefense({ rng: createRng(1) });
  const q1 = quake.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(5) });
  const q2 = quake.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(4.2) });
  const q3 = quake.spawn('hoodedFlier', { lane: 3, hpScale: 5000, s: at(5) });
  for (const e of [q1, q2, q3]) e.speed = 0;
  run(quake, [block(1, 4, { element: 'earth' })], 1);
  assert.ok(q1.hp < q1.maxHp && q2.hp < q2.maxHp, 'neighbour takes splash');
  assert.equal(q3.hp, q3.maxHp);
  assert.ok(q1.s < at(5), 'knocked back up the lane');

  const gale = createDefense({ rng: createRng(1) });
  const g1 = gale.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(6) });
  const g2 = gale.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(3) });
  const g3 = gale.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: at(6) });
  for (const e of [g1, g2, g3]) e.speed = 0;
  run(gale, [block(1, 4, { element: 'wind' })], 1);
  assert.ok(g1.hp < g1.maxHp && g2.hp < g2.maxHp, 'gale hits the lane');
  assert.equal(g3.hp, g3.maxHp, 'other lanes untouched');
});

test('physical resistance reduces physical hits only; ice hurts fire foes more', () => {
  const d = createDefense({ rng: createRng(1) });
  const armored = d.spawn('armoredSoldier', { hpScale: 1000 });
  d.damage(armored, 100, ['physical']);
  assert.ok(Math.abs(armored.maxHp - armored.hp - 70) < 1e-6);
  const hp = armored.hp;
  d.damage(armored, 100, ['fire']);
  assert.ok(Math.abs(hp - armored.hp - 100) < 1e-6);
  const flame = d.spawn('flameSprite', { hpScale: 1000 });
  d.damage(flame, 100, ['ice']);
  assert.ok(Math.abs(flame.maxHp - flame.hp - 150) < 1e-6);
});

test('Kite Ninja summons minions in nearby lanes; Elf Ruler heals allies', () => {
  const d = createDefense({ rng: createRng(1) });
  const ninja = d.spawn('kiteNinja', { lane: 2, hpScale: 10, s: at(4) });
  d.damage(ninja, 1e9, ['fire']);
  run(d, [], DT);
  const minions = d.enemies.filter((e) => e.type === 'kiteMinion');
  assert.equal(minions.length, ENEMY_TYPES.kiteNinja.summonOnDeath.count);
  assert.ok(minions.every((m) => Math.abs(m.lane - 2) <= 1 && m.lane < FIELD.lanes));

  const h = createDefense({ rng: createRng(1) });
  const ruler = h.spawn('elfRuler', { lane: 1, hpScale: 10, s: at(3) });
  const pal = h.spawn('pixie', { lane: 1, hpScale: 100, s: at(4) });
  ruler.speed = pal.speed = 0;
  pal.hp = pal.maxHp / 2;
  run(h, [], 3.2);
  assert.ok(pal.hp > pal.maxHp / 2);
});

test('ultimates reach every lane: Sun burns all, Timestop freezes all', () => {
  const sun = createDefense({ rng: createRng(1) });
  const foes = [0, 2, 3].map((lane) => sun.spawn('hoodedFlier', { lane, hpScale: 5000, s: at(1) }));
  run(sun, [block(0, 12, { element: 'earth', fusion: 'wind', ultimate: 'fire' })], 2.2);
  assert.ok(foes.every((e) => e.burn.stacks > 0));

  const ts = createDefense({ rng: createRng(1) });
  const fs = [0, 1, 3].map((lane) => ts.spawn('hoodedFlier', { lane, hpScale: 5000, s: at(1) }));
  for (const e of fs) e.speed = 0;
  run(ts, [block(0, 12, { element: 'earth', fusion: 'wind', ultimate: 'ice' })], 10.2);
  assert.ok(fs.every((e) => e.freezeT > 0));
});

test('waves: deterministic, telegraphed lanes, boss every 5 waves, growing', () => {
  const w1 = generateWave(3, createRng(77));
  assert.deepEqual(w1, generateWave(3, createRng(77)));
  assert.ok(w1.spawns.every((s) => w1.lanes.includes(s.lane)));
  assert.equal(isBossDay(5), true);
  const b = generateWave(5, createRng(1));
  assert.equal(b.boss, 'elfRuler');
  assert.ok(b.spawns.some((s) => s.type === 'elfRuler' && s.lane === b.bossLane));
  assert.equal(generateWave(15, createRng(1)).boss, 'kiteNinja');
  assert.equal(generateWave(25, createRng(1)).boss, 'dragonRider');
  assert.ok(generateWave(12, createRng(1)).spawns.length > generateWave(2, createRng(1)).spawns.length);
  assert.ok(generateWave(12, createRng(1)).lanes.length > generateWave(1, createRng(1)).lanes.length);
});

test('Metal marks foes so they drop bonus coins; Midas gilds the whole field', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(3) });
  e.speed = 0;
  run(d, [block(1, 4, { element: 'metal' })], 1.2);
  assert.ok(e.lootT > 0 && e.lootPct === 0.6, 'marked');
  d.drainEvents();
  d.damage(e, 1e9, ['fire']);
  assert.equal(d.drainEvents().find((x) => x.type === 'kill').loot, 0.6);

  const k = createDefense({ rng: createRng(1) });
  const weak = k.spawn('pixie', { lane: 1, hpScale: 1, s: at(3) });
  weak.speed = 0;
  run(k, [block(1, 4, { element: 'metal' })], 1.5);
  assert.ok(weak.dead);
  assert.equal(k.drainEvents().find((x) => x.type === 'kill').loot, 0.6, 'a Metal killing blow pays the bonus too');

  const g = createDefense({ rng: createRng(1) });
  const foes = [0, 2, 3].map((lane) => g.spawn('hoodedFlier', { lane, hpScale: 5000, s: at(1) }));
  for (const f of foes) f.speed = 0;
  run(g, [block(0, 12, { element: 'earth', fusion: 'wind', ultimate: 'metal' })], 4.2);
  assert.ok(foes.every((f) => f.lootT > 0), 'every lane gilded');
});

test('Bramble Shell regrows the block and its neighbours when its ring bites; Lifebloom repairs them all', () => {
  const d = createDefense({ rng: createRng(5) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 50000, s: sAtY(2) }); // inside the ring
  e.speed = 0;
  e.atk = 0; // a dummy: it stands in the ring without biting back
  const healer = Object.assign(block(1, 4, { element: 'nature' }, 1), { hp: 500, maxHp: 1000 });
  const next = Object.assign(block(2, 4, {}, 2), { hp: 500, maxHp: 1000 }); // its neighbour
  const far = Object.assign(block(3, 4, {}, 3), { hp: 500, maxHp: 1000 }); // two cells away
  run(d, [healer, next, far], 4.1);
  assert.ok(healer.hp > 500 && next.hp > 500, 'the block and its neighbour regrow');
  assert.equal(far.hp, 500, 'a block two cells away does not');
  assert.ok(e.hp < e.maxHp, 'the ring hurt the foe in it');
  assert.ok(next.hp <= next.maxHp);

  const bloom = createDefense({ rng: createRng(5) });
  const b = bloom.spawn('hoodedFlier', { lane: 0, hpScale: 50000, s: at(1) });
  b.speed = 0;
  const a1 = Object.assign(block(1, 4, {}, 2), { hp: 100, maxHp: 1000 });
  const a2 = Object.assign(block(2, 4, {}, 3), { hp: 200, maxHp: 1000 });
  run(bloom, [sturdy(block(3, 12, { element: 'earth', fusion: 'wind', ultimate: 'nature' }, 1)), a1, a2], 6.2);
  assert.ok(a1.hp >= 350 && a2.hp >= 450, 'Lifebloom repaired every damaged block');
});

test('lane ranges reach up and down from the block: top-row Fire meets foes entering the board', () => {
  const foeAt = (d, y) => {
    const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(y) });
    e.speed = 0;
    return e;
  };
  const top = createDefense({ rng: createRng(1) });
  const entering = foeAt(top, 9.5); // just above the board
  run(top, [block(1, 4, { element: 'fire' }, 1, 3)], 1);
  assert.ok(entering.hp < entering.maxHp, 'reach 4 from the top row covers the board entrance');
  const bottom = createDefense({ rng: createRng(1) });
  const far = foeAt(bottom, 9.5);
  run(bottom, [block(1, 4, { element: 'fire' }, 1, 0)], 1);
  assert.equal(far.hp, far.maxHp, 'from the bottom row it is out of range');
  far.s = sAtY(3);
  run(bottom, [block(1, 4, { element: 'fire' }, 1, 0)], 1);
  assert.ok(far.hp < far.maxHp, 'until it walks down through the board');
});

test('Poison and Lightning cover the neighbouring lanes; single-lane classes do not', () => {
  const p = createDefense({ rng: createRng(1) });
  const side = p.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: at(5) });
  side.speed = 0;
  run(p, [block(1, 4, { element: 'poison' })], 1.5);
  assert.ok(side.poison.stacks > 0, 'poison darts reach the next lane');
  const i = createDefense({ rng: createRng(1) });
  const other = i.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: at(5) });
  other.speed = 0;
  run(i, [block(1, 4, { element: 'ice' })], 1.5);
  assert.equal(other.hp, other.maxHp);
});

test('Bramble Shell only reaches one cell around the block, and roots what it hits', () => {
  const d = createDefense({ rng: createRng(1) });
  const close = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(2.5) }); // 1.5 units away
  const far = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(4.5) }); // 3.5 units away
  close.speed = far.speed = 0;
  d.step(DT, [block(1, 4, { element: 'nature' })]);
  assert.ok(close.hp < close.maxHp && close.rootT > 0, 'hit and rooted');
  assert.equal(far.hp, far.maxHp, 'outside the ring');
  assert.equal(d.shots.length, 0, 'a pulse, not a projectile');
});

test('Ember Breath hits every foe in its cone at once and burns them; nothing outside it', () => {
  const d = createDefense({ rng: createRng(1) });
  const near = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(2) });
  const mid = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(4) });
  const beyond = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(7) }); // 3 cells up: past the tip
  const aside = d.spawn('hoodedFlier', { lane: 3, hpScale: 5000, s: sAtY(4) }); // two lanes over
  for (const e of [near, mid, beyond, aside]) e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'fire' })]); // row 0, y = 1: the cone reaches y = 5
  assert.equal(d.shots.length, 0, 'breath is instant');
  assert.ok(near.hp < near.maxHp && mid.hp < mid.maxHp, 'both foes in the cone are hit');
  assert.ok(near.burn.stacks > 0 && mid.burn.stacks > 0, 'and burning');
  assert.equal(beyond.hp, beyond.maxHp);
  assert.equal(aside.hp, aside.maxHp);
  assert.ok(d.drainEvents().some((x) => x.type === 'breath' && x.dir === 1));
});

test('Wing Gust hits every foe in the lane and pushes them back up it', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: sAtY(12) }); // up in the field
  e.speed = 0;
  const s0 = e.s;
  d.step(DT, [block(2, 4, { element: 'wind' }, 1, 3)]); // top row: the gust covers the field
  assert.ok(e.hp < e.maxHp);
  assert.ok(e.s < s0 - 0.9, 'pushed back half a cell');
});

test('Horn Arc chains to 3 foes at 16 and 6 at 128, nearest first; Lightning may stun', () => {
  const chainOf = (tier) => {
    const d = createDefense({ rng: createRng(2) });
    const foes = [2, 4, 6, 8, 10, 12, 14].map((y) => d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(y) }));
    for (const f of foes) f.speed = 0;
    d.step(DT, [block(1, tier, { element: 'lightning' })]);
    return foes.filter((f) => f.hp < f.maxHp).length;
  };
  assert.equal(chainOf(4), 3);
  assert.equal(chainOf(7), 6);
  const s = createDefense({ rng: { next: () => 0 } }); // every roll succeeds
  const f = s.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(3) });
  f.speed = 0;
  s.step(DT, [block(1, 4, { element: 'lightning' })]);
  assert.ok(f.stunT > 0, 'stunned');
});

test('Venom Spit leaves a puddle: foes in it stack poison, and at full stacks they bite softer', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 1e6, s: sAtY(3) });
  e.speed = 0;
  run(d, [block(1, 4, { element: 'poison' })], 1.2);
  assert.ok(d.puddles.length >= 1, 'a puddle on the path');
  run(d, [block(1, 4, { element: 'poison' })], 3);
  assert.equal(e.poison.stacks, 6, 'stacks build up while it stands in the venom');
  assert.ok(e.weakT > 0 && e.weakPct === 0.3, 'weakened at 6 stacks');

  // a weakened foe bites a block for 30% less
  const w = createDefense({ rng: createRng(1) });
  const t = sturdy(block(1, 1, {}, 1, 3));
  const biter = w.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.5) });
  run(w, [t], 3);
  biter.weakT = 99;
  biter.weakPct = 0.3;
  w.drainEvents();
  run(w, [t], 2);
  const bites = w.drainEvents().filter((x) => x.type === 'tileHit');
  assert.ok(bites.length && bites.every((b) => Math.abs(b.amount - biter.atk * 0.7) < 1e-9));
});

test('Pride Pounce: a killing bite hits a wounded foe twice as hard', () => {
  const pounce = (hpFrac, rng) => {
    const d = createDefense({ rng });
    const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(3) });
    e.speed = 0;
    e.hp = e.maxHp * hpFrac;
    const before = e.hp;
    const b = block(1, 4, { element: 'metal' });
    d.step(DT, [b]);
    return { lost: before - e.hp, dmg: profileOf(b).damage, bite: d.drainEvents().some((x) => x.type === 'bite') };
  };
  const always = { next: () => 0 };
  const wounded = pounce(0.4, always);
  assert.ok(wounded.bite && Math.abs(wounded.lost - wounded.dmg * 2) < 1e-6, 'double damage below half health');
  const healthy = pounce(0.9, always);
  assert.ok(!healthy.bite && Math.abs(healthy.lost - healthy.dmg) < 1e-6, 'a normal hit above half health');
});

test('Quake Stomp hits its lane and both neighbours, 1.5 cells deep, knocking back and stunning', () => {
  const d = createDefense({ rng: createRng(1) });
  const hitBy = [0, 1, 2].map((lane) => d.spawn('hoodedFlier', { lane, hpScale: 5000, s: sAtY(2.5) }));
  const tooWide = d.spawn('hoodedFlier', { lane: 3, hpScale: 5000, s: sAtY(2.5) });
  const tooDeep = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(5) });
  for (const e of [...hitBy, tooWide, tooDeep]) e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'earth' })]);
  assert.ok(hitBy.every((e) => e.hp < e.maxHp && e.stunT > 0), 'three lanes shaken and stunned');
  assert.equal(tooWide.hp, tooWide.maxHp);
  assert.equal(tooDeep.hp, tooDeep.maxHp);
});

test('Bramble thorns hurt a foe that bites the block', () => {
  const d = createDefense({ rng: createRng(1) });
  const t = sturdy(block(1, 4, { element: 'nature' }, 1, 3));
  d.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.5) });
  run(d, [t], 4);
  assert.ok(d.drainEvents().some((x) => x.type === 'hit' && x.thorns));
});

test('Echo Harpoon targets the toughest foe, Pride Pounce the weakest', () => {
  const pick = (element) => {
    const d = createDefense({ rng: createRng(1) });
    const weak = d.spawn('pixie', { lane: 1, hpScale: 100, s: at(4) });
    const tough = d.spawn('hoodedFlier', { lane: 1, hpScale: 100, s: at(3) });
    weak.speed = tough.speed = 0;
    d.step(DT, [block(1, 4, { element })]);
    if (d.shots.length) return d.shots[0].targetId === weak.id ? 'weak' : 'tough'; // the harpoon flies
    return weak.hp < weak.maxHp ? 'weak' : 'tough'; // the pounce lands at once
  };
  assert.equal(pick('ice'), 'tough');
  assert.equal(pick('metal'), 'weak');
});

test('Wing Gust hits every foe in its lane the same amount', () => {
  const d = createDefense({ rng: createRng(1) });
  const foes = [2.5, 5, 8].map((y) => d.spawn('hoodedFlier', { lane: 2, hpScale: 50000, s: sAtY(y) }));
  for (const e of foes) e.speed = 0;
  d.step(DT, [block(2, 4, { element: 'wind' })]);
  run(d, [], 2);
  const lost = foes.map((e) => Math.round(e.maxHp - e.hp));
  assert.ok(lost.every((x) => x > 0), 'all three hit');
  assert.ok(lost.every((x) => x === lost[0]), 'each exactly once');
});

test('Venom Spit lobs its glob and poisons the foe it lands on', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(4.5) });
  e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'poison' })]);
  const sh = d.shots[0];
  assert.equal(sh.kind, 'lob');
  assert.ok(sh.spit, 'a venom glob');
  run(d, [], 2);
  assert.ok(e.poison.stacks > 0, 'it lands and poisons');
});

test('a roaming fusion (key-visual demo) shoots from where it stands, not from its den', () => {
  const d = createDefense({ rng: createRng(3) });
  // the den sits in column 0; its creature roams up the field in lane 3
  const den = sturdy(block(0, 8, { element: 'fire', fusion: 'ice' }, 1, 0));
  den.roam = { x: laneX(3), y: 12 };
  const e = d.spawn('pixie', { lane: 3, hpScale: 1e6, s: sAtY(14) });
  run(d, [den], 1.5);
  const fire = d.drainEvents().filter((x) => x.type === 'fire');
  assert.ok(fire.length > 0, 'it fires at a foe its den could never reach');
  assert.ok(fire.every((f) => f.x === laneX(3) && f.y === 12), 'every shot leaves from the creature');
  assert.ok(e.hp < e.maxHp);
});

test('a namecard skill hits every foe around the creature with its element effects', () => {
  const d = createDefense({ rng: createRng(4) });
  const den = sturdy(block(1, 9, { element: 'fire', fusion: 'ice' }, 1, 0));
  den.roam = { x: laneX(1), y: 12 };
  const near = d.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(13) });
  const side = d.spawn('pixie', { lane: 2, hpScale: 1e6, s: sAtY(12.5) });
  const far = d.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(16.5) });
  const caught = d.cast(den, { radius: 2.8, mult: 5 });
  assert.equal(caught, 2);
  assert.ok(near.hp < near.maxHp && side.hp < side.maxHp, 'foes in the circle are hit');
  assert.equal(far.hp, far.maxHp, 'a foe outside the circle is not');
  assert.ok(near.dot.burn > 0 || near.burn?.stacks > 0 || near.chillT > 0, 'Frostnova burns and chills');
  const ev = d.drainEvents().find((x) => x.type === 'skill');
  assert.equal(ev.hits, 2);
  assert.equal(d.cast(block(0, 2, {}, 9), {}), 0, 'blocks below 16 have no skill');
});

test('fusions keep every effect whatever their first shape: bite on a cone, chain and regrow on a glob', () => {
  const always = { next: () => 0 };
  // Forge (fire + metal) breathes a cone; its metal half still gives the killing bite
  const f = createDefense({ rng: always });
  const prey = f.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(3) });
  prey.speed = 0;
  prey.hp = prey.maxHp * 0.3;
  f.step(DT, [block(1, 8, { element: 'fire', fusion: 'metal' })]);
  assert.ok(f.drainEvents().some((x) => x.type === 'bite'), 'Forge bites');

  // Toxic Shock (poison + lightning) spits; the glob chains on landing
  const p = createDefense({ rng: createRng(1) });
  const foes = [3, 4.5, 6].map((y) => p.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(y) }));
  for (const e of foes) e.speed = 0;
  run(p, [block(1, 8, { element: 'poison', fusion: 'lightning' })], 1);
  assert.ok(p.drainEvents().some((x) => x.type === 'impact' && x.chain), 'the glob arcs on');

  // Nightshade (poison + nature) regrows its den when the glob lands on a foe
  const n = createDefense({ rng: createRng(1) });
  const e = n.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(3) });
  e.speed = 0;
  e.atk = 0;
  const den = Object.assign(block(1, 8, { element: 'poison', fusion: 'nature' }, 1), { hp: 500, maxHp: 1000 });
  run(n, [den], 1.5);
  assert.ok(den.hp > 500, 'regrown');
});

test('overlapping venom puddles still add one stack per half second', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 1e6, s: sAtY(3) });
  e.speed = 0;
  const prof = { damage: 10, poison: { dpsPct: 0.34, dur: 3, max: 6, weaken: 0.3 }, colors: ['#b46cff'] };
  for (let i = 0; i < 3; i++) d.puddles.push({ id: i, x: e.x, y: e.y, r: 2, t: 5, max: 5, every: 0.5, prof, tier: 4 });
  run(d, [], 0.51);
  assert.equal(e.poison.stacks, 1, 'three puddles, one stack');
});

test('a foe stunned while biting resumes its bite timer instead of restarting it', () => {
  const d = createDefense({ rng: createRng(1) });
  const t = sturdy(block(1, 1, {}, 1, 3));
  const e = d.spawn('pixie', { lane: 1, hpScale: 1e6, s: sAtY(SIEGE.boardTop + 0.5) });
  let time = 0;
  const bites = [];
  for (let i = 0; i < 60 * 8; i++) {
    if (Math.abs(time - 3.05) < DT / 2) e.stunT = 0.3; // right after a bite, mid-cycle
    d.step(DT, [t]);
    time += DT;
    for (const x of d.drainEvents()) if (x.type === 'tileHit') bites.push(time);
  }
  const gaps = bites.slice(1).map((b, i) => b - bites[i]);
  assert.ok(gaps.every((g) => g >= SIEGE.biteEvery - 1e-6), `no bite comes early (${gaps.map((g) => g.toFixed(2)).join(', ')})`);
});

test('a venom glob never releases damage a harpoon reserved', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 1e6, s: sAtY(9) });
  e.speed = 0;
  e.incoming = 25; // a harpoon in flight
  d.shots.push({ id: 99, kind: 'lob', spit: true, x: 0, y: 0, ox: e.x, oy: e.y - 4, x1: e.x, y1: e.y, t: 0, T: 0.01, targetId: e.id, prof: { damage: 5, kinds: ['poison'], colors: ['#b46cff'], puddle: { radius: 2, dur: 3, every: 0.5 }, poison: { dpsPct: 0.3, dur: 3, max: 6 } }, damage: 5, tier: 4, delay: 0, age: 0 });
  run(d, [], 0.1);
  assert.equal(e.incoming, 25);
});

test('knockback and holds brace: a foe pushed or held again soon slides and stays held less', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 1e6, s: sAtY(12) });
  e.speed = 0;
  const s0 = e.s;
  const b = block(1, 4, { element: 'wind' }, 1, 3);
  d.step(DT, [b]);
  const first = s0 - e.s;
  run(d, [b], 1.3); // the next gust lands inside the 1.5 s brace
  const second = s0 - first - e.s;
  assert.ok(Math.abs(first - 1) < 1e-6 && Math.abs(second - 0.4) < 1e-6, `pushed 1 then 0.4 (${first}, ${second})`);
  const boss = d.spawn('elfRuler', { lane: 2, hpScale: 1e6, s: sAtY(12) });
  boss.speed = 0;
  const bs = boss.s;
  d.step(DT, [block(2, 4, { element: 'wind' }, 2, 3)]);
  assert.ok(Math.abs(bs - boss.s - 0.5) < 1e-6, 'a boss slides half as far');

  // a fast Nature fusion can no longer hold a walking foe still
  const h = createDefense({ rng: createRng(1) });
  const walker = h.spawn('hoodedFlier', { lane: 1, hpScale: 1e9, s: sAtY(4.5) });
  walker.atk = 0;
  let held = 0;
  for (let i = 0; i < 600; i++) {
    h.step(DT, [block(1, 8, { element: 'fire', fusion: 'nature' }, 1, 1)]);
    if (walker.rootT > 0 || walker.stunT > 0) held += DT;
  }
  assert.ok(held / 10 < 0.6, `held ${(held * 10).toFixed(0)}% of the time`);
});

test('bosses resist pushback after many pushes (DEFENSE.bossPushResist), normal foes never do', () => {
  const steps = DEFENSE.bossPushResist; // after 20 / 50 / 100 pushes: 25 / 50 / 75% shorter
  const d = createDefense({ rng: createRng(1) });
  const boss = d.spawn('elfRuler', { lane: 2, hpScale: 1e12, s: sAtY(12) });
  const grunt = d.spawn('hoodedFlier', { lane: 2, hpScale: 1e12, s: sAtY(12.2) });
  const wind = block(2, 4, { element: 'wind' }, 1, 3); // Wing Gust at 16: pushes 1 unit, a boss 0.5
  wind.y = 9; // close enough that both foes are inside the skill's radius
  const slides = [];
  const gruntSlides = [];
  for (let i = 1; i <= steps.at(-1).after + 1; i++) {
    for (const e of [boss, grunt]) Object.assign(e, { braceT: 0, s: sAtY(10.5), y: 10.5 }); // unbraced, same spot every time
    d.cast(wind, { radius: 3, mult: 0 }); // one push each, no damage
    slides.push(sAtY(10.5) - boss.s);
    gruntSlides.push(sAtY(10.5) - grunt.s);
  }
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  assert.ok(slides.slice(0, steps[0].after).every((x) => near(x, 0.5)), `pushes 1–${steps[0].after}: half as far, like any boss`);
  steps.forEach((r, k) => {
    const last = steps[k + 1]?.after ?? r.after + 1; // the pushes after this step (and before the next)
    for (const n of [r.after, last - 1]) assert.ok(near(slides[n], 0.5 * (1 - r.resist)), `push ${n + 1}: ${r.resist * 100}% shorter (${slides[n]})`);
  });
  assert.ok(gruntSlides.every((x) => near(x, 1)), 'a normal foe never resists');
  const marks = d.drainEvents().filter((e) => e.type === 'resist');
  assert.deepEqual(marks.map((e) => [e.id, e.level]), [[boss.id, 1], [boss.id, 2], [boss.id, 3]], 'one popup at each step');
  assert.equal(marks[0].name, ENEMY_TYPES.elfRuler.name);
});
