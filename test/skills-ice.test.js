// v2 fusion skills, ice's group (src/sim/skills/ice.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { DEFENSE, GRID, PHYSICS, SIEGE, laneX } from '../src/config.js';
import { skillHarness, fakeBlock } from './helpers/skill-harness.js';

const HIT = 100;
const CELL = GRID.cell;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const lost = (e) => e.maxHp - e.hp;
/** The pieces of this pet's skill on the field (zones, walls, traps, tethers). */
const mine = (h, list) => h.d[list].filter((x) => x.owner === h.pet.id);

test('Cryo Lance: every period a frozen bolt runs down the busiest lane: its share of the hit to every foe in it, and a freeze', () => {
  const p = P['ice+lightning'];
  const h = skillHarness('ice+lightning', { hit: HIT });
  const lane = [h.foe(2, 4), h.foe(2, 6), h.foe(2, 7.5)]; // the busiest lane
  const aside = h.foe(0, 3);
  h.act();
  for (const e of lane) {
    assert.ok(near(lost(e), HIT * p.hitPct), `the bolt dealt ${lost(e)}`);
    assert.ok(near(e.freezeT, p.freezeS, PHYSICS.dt + 1e-9), `frozen for ${e.freezeT}`);
  }
  assert.ok(lost(aside) === 0 && aside.freezeT === 0, 'a foe in another lane is left alone');
  const bolts = h.fx('beam');
  assert.equal(bolts.length, 1);
  const [b] = bolts;
  assert.ok(b.x === laneX(2) && b.x1 === laneX(2), 'along lane 2');
  for (const e of lane) assert.ok(e.y >= Math.min(b.y, b.y1) && e.y <= Math.max(b.y, b.y1), 'the bolt spans every foe it hit');
  h.run(p.periodS);
  assert.equal(h.fx('beam').length, 2, 'one bolt a period');
  const again = HIT * p.hitPct * (p.freezeS < p.periodS ? 1 : 1 + DEFENSE.frozenVuln); // thawed by then, or not
  for (const e of lane) assert.ok(near(lost(e), HIT * p.hitPct + again), `hit again: ${lost(e)}`);
});

test('Venom Tendrils: tendrils on the toughest foes in reach slow them and drain their max health; a dead one’s tendril grabs another', () => {
  const p = P['ice+poison'];
  const h = skillHarness('ice+poison', { hit: HIT });
  // one more foe in reach than it has tendrils (at rangeCells 5 the reach covers most of the field)
  const extra = Array.from({ length: Math.max(0, p.count - 4) }, (_, i) => h.foe(3, 5.5 + i * 0.3, { hp: 600 - i * 50 }));
  const a = h.foe(2, 6, { hp: 1000 });
  const b = h.foe(2, 7, { hp: 2000 });
  const c = h.foe(1, 6.5, { hp: 3000 });
  const d = h.foe(2, 5, { hp: 4000 });
  const boss = h.foe(1, 5.5, { hp: 5000, boss: true });
  h.act();
  const pet = h.pet.summon;
  const reach = p.rangeCells * CELL;
  const inReach = [boss, d, c, b, a, ...extra]; // toughest first
  for (const e of inReach) assert.ok(Math.hypot(e.x - pet.x, e.y - pet.y) <= reach, 'set-up: all in reach');
  assert.ok(p.count < inReach.length, 'set-up: one foe in reach is left over');
  const held = () => new Set(mine(h, 'tethers').filter((t) => !t.dead).map((t) => t.enemyId));
  const toughest = inReach.slice(0, p.count);
  assert.deepEqual(held(), new Set(toughest.map((e) => e.id)), `the ${p.count} toughest in reach`);
  for (const t of mine(h, 'tethers')) assert.deepEqual([t.slowPct, t.drainPct, t.bossDrainPct], [p.slowPct, p.drainPct, p.bossDrainPct]);
  const hp0 = new Map(inReach.map((e) => [e.id, e.hp]));
  h.run(1);
  for (const e of toughest) {
    const pct = e.boss ? p.bossDrainPct : p.drainPct;
    assert.ok(near(hp0.get(e.id) - e.hp, e.maxHp * pct, 0.01), `drained ${hp0.get(e.id) - e.hp} of ${e.maxHp} in a second`);
    assert.ok(near(e.chillSlow, e.boss ? p.slowPct / 2 : p.slowPct), `slowed by ${e.chillSlow}`);
  }
  const spare = inReach[p.count];
  assert.equal(spare.hp, hp0.get(spare.id), 'a foe with no tendril is left alone');
  // one of them dies: its tendril grabs the next toughest in reach
  h.d.damage(c, 1e9, ['physical']);
  h.run(PHYSICS.dt);
  assert.deepEqual(held(), new Set([...toughest.filter((e) => e !== c), spare].map((e) => e.id)));
});

test('Glacier Wall: a wall in front of the blocks holds the busiest lanes; when it melts it bursts: a hit and a freeze around it', () => {
  const p = P['ice+earth'];
  const h = skillHarness('ice+earth', { hit: HIT });
  const held = [h.foe(1, 6, { speed: 1 }), h.foe(1, 5, { speed: 1 }), h.foe(2, 6.5, { speed: 1 }), h.foe(2, 5.5, { speed: 1 })];
  const pass = h.foe(3, 3, { speed: 1.6 }); // a quieter lane: no wall there
  const far = h.foe(1, 0.3); // far up a walled lane
  h.act();
  const walls = mine(h, 'walls');
  assert.equal(walls.length, 1);
  const [w] = walls;
  assert.equal(p.lanes, 2, 'set-up: two lanes are busy here');
  assert.deepEqual([...w.lanes].sort((x, y) => x - y), [1, 2], 'across the two busiest lanes');
  assert.ok(w.y > SIEGE.boardTop && w.y < SIEGE.boardTop + CELL, `just above the board (y ${w.y})`);
  assert.equal(w.dur, p.wallS);
  h.run(p.wallS - 0.3);
  for (const e of held) assert.ok(e.mode === 'lane' && e.y > w.y, `held above the wall (y ${e.y.toFixed(2)})`);
  assert.equal(pass.mode, 'hunt', 'a foe on another lane walks on onto the board');
  h.run(0.5);
  assert.equal(mine(h, 'walls').length, 0, 'it melted');
  for (const e of held) {
    assert.ok(near(lost(e), HIT * p.hitPct), `the burst dealt ${lost(e)}`);
    assert.ok(e.freezeT > 0 && e.freezeT <= p.freezeS, `and froze it (${e.freezeT})`);
  }
  assert.ok(lost(far) === 0 && far.freezeT === 0, 'a foe out of the burst is left alone');
  assert.equal(h.fx('ring').length, w.lanes.length, 'a ring at each lane of the wall');
  assert.ok(h.fx('text').some((f) => f.key === 'fx.shatter'));
});

test('Glacier Wall: a pet called home early (its tile merged away) still bursts its wall as it melts', () => {
  const p = P['ice+earth'];
  const h = skillHarness('ice+earth', { hit: HIT });
  const e = h.foe(1, 6, { speed: 1 });
  h.act();
  h.run(1);
  assert.equal(mine(h, 'walls').length, 1);
  h.blocks.splice(0, 1); // merged away
  h.run(PHYSICS.dt);
  assert.equal(h.d.walls.length, 0, 'the wall went with the pet');
  assert.ok(near(lost(e), HIT * p.hitPct) && e.freezeT > 0, 'and burst on its way out');
});

test('Whiteout: a blizzard over the whole field slows every foe for the pet’s time; every period the fastest foe freezes', () => {
  const p = P['ice+wind'];
  const h = skillHarness('ice+wind', { hit: HIT });
  const fast = h.foe(0, 1, { speed: 3 });
  const a = h.foe(1, 2, { speed: 1 });
  const b = h.foe(3, 1.5, { speed: 1.2 });
  const boss = h.foe(2, 1, { speed: 0.7, boss: true });
  h.act();
  const snow = mine(h, 'zones').find((z) => z.kind === 'snow');
  assert.ok(snow && snow.r === Infinity, 'snow over the whole field');
  for (const e of [fast, a, b]) assert.ok(near(e.chillSlow, p.slowPct), `slowed by ${e.chillSlow}`);
  assert.ok(near(boss.chillSlow, p.slowPct / 2), 'a boss by half as much');
  assert.ok(near(fast.freezeT, p.freezeS, PHYSICS.dt + 1e-9), 'the fastest froze at once');
  for (const e of [a, b, boss]) assert.equal(e.freezeT, 0);
  const s0 = a.s;
  h.run(1);
  assert.ok(near(a.s - s0, a.speed * (1 - p.slowPct)), `a walker covered ${(a.s - s0).toFixed(3)} of its ${a.speed}`);
  h.run(p.periodS - 1);
  const second = p.freezeS < p.periodS ? fast : b; // the fastest foe still moving at the next beat
  const freezes = h.events('freeze').filter((x) => x.id === second.id).length;
  assert.ok(second.freezeT > 0 && freezes === (second === fast ? 2 : 1), 'the next beat froze the fastest again');
  h.run(h.pet.summon.left + 0.1);
  assert.equal(h.pet.summon, undefined);
  assert.equal(mine(h, 'zones').length, 0, 'the blizzard ends with the pet');
});

test('Rime Armour: rime on every block while the pet is out: bites land softer, and a biter freezes, at most once per cooldown', () => {
  const p = P['ice+metal'];
  const block = fakeBlock(2, { col: 0, row: 3, hp: 1000 });
  const h = skillHarness('ice+metal', { hit: HIT, blocks: [block] });
  const e = h.foe(0, 7.6, { speed: 1.6 }); // a cell short of the board, above the block
  e.atk = 30;
  h.act();
  const dur = h.pet.summon.dur;
  for (const t of h.blocks) assert.ok(t.guardT > dur - 0.1 && t.guardT <= dur, `block ${t.id} in rime (${t.guardT})`);
  const frozeAt = [];
  for (let i = 1; i <= Math.round(6 / PHYSICS.dt); i++) {
    const n = h.events('freeze').length;
    h.run(PHYSICS.dt);
    if (h.events('freeze').length > n) frozeAt.push(i * PHYSICS.dt);
  }
  const bites = h.events('tileHit').filter((x) => x.id === block.id);
  assert.ok(bites.length >= 3, `${bites.length} bites`);
  for (const x of bites) assert.ok(near(x.amount, e.atk * (1 - p.guardPct)), `a bite of ${x.amount}`);
  assert.ok(frozeAt.length >= 2, `froze ${frozeAt.length} times`);
  for (let i = 1; i < frozeAt.length; i++) {
    assert.ok(frozeAt[i] - frozeAt[i - 1] >= p.cooldownS - 1e-6, `never twice within ${p.cooldownS} (${frozeAt})`);
  }
  // home: the rime is gone and bites land in full
  h.run(h.pet.summon.left + 0.1);
  assert.equal(h.pet.summon, undefined);
  assert.equal(block.guardT, 0);
  const n = h.events('tileHit').length;
  h.run(2);
  const after = h.events('tileHit').slice(n);
  assert.ok(after.length >= 1 && after.every((x) => near(x.amount, e.atk)), 'full bites again');
});

test('Frost Garden: flowers ahead of the foes, one more a period up to the cap; a foe on one is hit and frozen, the bloom heals a hurt block', () => {
  const p = P['ice+nature'];
  const nearBlock = fakeBlock(2, { col: 2, row: 3, hp: 1000 });
  const farBlock = fakeBlock(3, { col: 0, row: 0, hp: 1000 });
  const h = skillHarness('ice+nature', { hit: HIT, blocks: [nearBlock, farBlock] });
  nearBlock.hp = farBlock.hp = 500;
  const walkers = [h.foe(2, 5), h.foe(1, 4), h.foe(0, 3), h.foe(3, 2)]; // leading first, standing for now
  h.act();
  const flowers = () => mine(h, 'traps').filter((t) => t.kind === 'flower');
  assert.equal(flowers().length, p.count, `${p.count} at once`);
  for (const e of walkers.slice(0, p.count)) {
    const f = flowers().find((t) => t.x === e.x);
    assert.ok(f && f.y < e.y && e.y - f.y <= CELL, `a flower a little ahead of the foe on lane ${e.lane}`);
  }
  h.run(p.periodS);
  assert.equal(flowers().length, p.count + 1, 'one more a period');
  // a long stay: the garden grows to its cap and no further
  h.pet.summon.dur = 60;
  let most = 0;
  for (let i = 0; i < Math.round(((p.max - p.count) * p.periodS) / PHYSICS.dt); i++) {
    h.run(PHYSICS.dt);
    most = Math.max(most, flowers().length);
  }
  assert.equal(flowers().length, p.max);
  assert.equal(most, p.max, `never more than ${p.max}`);
  // the leading foe walks onto its flower
  const [lead] = walkers;
  const f = flowers().find((t) => t.x === lead.x && t.y < lead.y);
  lead.speed = 1.6;
  h.run(1);
  lead.speed = 0;
  assert.ok(!flowers().includes(f), 'it went off');
  assert.ok(near(lost(lead), HIT * p.hitPct), `the flower dealt ${lost(lead)}`);
  assert.ok(lead.freezeT > 0 && lead.freezeT <= p.freezeS, 'and froze it');
  assert.ok(near(nearBlock.hp, 500 + nearBlock.maxHp * p.healPct), `the bloom healed the nearest hurt block to ${nearBlock.hp}`);
  assert.equal(farBlock.hp, 500, 'and only that one');
  assert.ok(h.fx('ring').some((x) => near(x.x, f.x) && near(x.y, f.y)), 'it blooms');
  h.run(p.periodS);
  assert.equal(flowers().length, p.max, 'a new flower takes its place');
});
