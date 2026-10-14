import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefense } from '../src/sim/defense.js';
import { generateWave, ENEMY_TYPES, isBossDay } from '../src/sim/enemies.js';
import { createRng } from '../src/sim/rng.js';
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

test('Nature repairs the most damaged block; Lifebloom repairs them all', () => {
  const d = createDefense({ rng: createRng(5) });
  const e = d.spawn('hoodedFlier', { lane: 2, hpScale: 50000, s: at(5) });
  e.speed = 0;
  const healer = sturdy(block(2, 4, { element: 'nature' }, 1));
  const hurt = Object.assign(block(0, 4, {}, 2), { hp: 100, maxHp: 1000 });
  const scratched = Object.assign(block(3, 4, {}, 3), { hp: 900, maxHp: 1000 });
  run(d, [healer, hurt, scratched], 20);
  const heals = d.drainEvents().filter((x) => x.type === 'tileHeal');
  assert.ok(heals.length >= 1, 'roughly one volley in five repairs');
  assert.ok(heals.every((h) => h.id === hurt.id || hurt.hp / hurt.maxHp > scratched.hp / scratched.maxHp), 'the worst-off block first');
  assert.ok(hurt.hp > 100);
  assert.ok(hurt.hp <= hurt.maxHp, 'never above max');

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

test('Nature reaches a big circle around the block, so its row matters', () => {
  const high = createDefense({ rng: createRng(1) });
  const e = high.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: sAtY(12) });
  e.speed = 0;
  run(high, [block(0, 4, { element: 'nature' }, 1, 3)], 1.5);
  assert.ok(e.hp < e.maxHp, 'a top-row Nature block reaches another lane up in the field');
  const low = createDefense({ rng: createRng(1) });
  const f = low.spawn('hoodedFlier', { lane: 2, hpScale: 5000, s: sAtY(12) });
  f.speed = 0;
  run(low, [block(0, 4, { element: 'nature' }, 1, 0)], 1.5);
  assert.equal(f.hp, f.maxHp, 'from the bottom row the circle does not reach the field');
});

test('Fire fires a 3-shot burst; Nature spreads 3 seeds over different foes', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(6) });
  e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'fire' })]);
  assert.equal(d.shots.length, 3);
  assert.deepEqual(d.shots.map((s) => s.delay > 0), [false, true, true], 'staggered');

  const n = createDefense({ rng: createRng(1) });
  const foes = [0, 1, 2].map((lane) => n.spawn('hoodedFlier', { lane, hpScale: 5000, s: sAtY(3) }));
  for (const f of foes) f.speed = 0;
  n.step(DT, [block(1, 4, { element: 'nature' })]);
  assert.equal(new Set(n.shots.map((s) => s.targetId)).size, 3);
});

test('Ice targets the toughest foe, Metal the weakest', () => {
  const pick = (element) => {
    const d = createDefense({ rng: createRng(1) });
    const weak = d.spawn('pixie', { lane: 1, hpScale: 100, s: at(4) });
    const tough = d.spawn('hoodedFlier', { lane: 1, hpScale: 100, s: at(3) });
    weak.speed = tough.speed = 0;
    d.step(DT, [block(1, 4, { element })]);
    return d.shots[0].targetId === weak.id ? 'weak' : 'tough';
  };
  assert.equal(pick('ice'), 'tough');
  assert.equal(pick('metal'), 'weak');
});

test('Earth lobs its boulder into the biggest crowd and splashes it', () => {
  const d = createDefense({ rng: createRng(1) });
  const lone = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(7) });
  const crowd = [5, 5.3, 5.6].map((s) => d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: at(s) }));
  for (const e of [lone, ...crowd]) e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'earth' })]);
  const sh = d.shots[0];
  assert.equal(sh.kind, 'lob');
  assert.ok(crowd.some((e) => e.id === sh.targetId), 'aims at the crowd, not the front-most foe');
  run(d, [], 1);
  assert.ok(crowd.every((e) => e.hp < e.maxHp), 'everyone in the crowd takes splash');
});

test('Wind’s blade sweeps its lane from the block and hits every foe once', () => {
  const d = createDefense({ rng: createRng(1) });
  const foes = [2.5, 5, 8].map((y) => d.spawn('hoodedFlier', { lane: 2, hpScale: 50000, s: sAtY(y) }));
  for (const e of foes) e.speed = 0;
  d.step(DT, [block(2, 4, { element: 'wind' })]);
  run(d, [], 2);
  const lost = foes.map((e) => Math.round(e.maxHp - e.hp));
  assert.ok(lost.every((x) => x > 0), 'all three hit');
  assert.ok(lost.every((x) => x === lost[0]), 'each exactly once');
});

test('Poison darts leave at an angle and curve into their target', () => {
  const d = createDefense({ rng: createRng(1) });
  const e = d.spawn('hoodedFlier', { lane: 1, hpScale: 5000, s: sAtY(4.5) });
  e.speed = 0;
  d.step(DT, [block(1, 4, { element: 'poison' })]);
  const sh = d.shots[0];
  const toTarget = Math.atan2(e.y - sh.y, e.x - sh.x);
  assert.ok(Math.abs(Math.atan2(sh.vy, sh.vx) - toTarget) > 0.5, 'not straight at it');
  run(d, [], 2);
  assert.ok(e.poison.stacks > 0, 'but it arrives');
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
