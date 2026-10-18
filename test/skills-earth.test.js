// v2 fusion skills, earth's group (src/sim/skills/earth.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { GRID, PHYSICS, SIEGE, laneX } from '../src/config.js';
import { skillHarness, fakeBlock } from './helpers/skill-harness.js';

const HIT = 100;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
/** A foe's lane distance (s) that puts it on the board, biting the top-row block of its column. */
const BITING = 8.75;

test('Blinding Sandstorm: a storm over the busiest lanes blinds and slows the foes in them, and wears them down every second', () => {
  const p = P['earth+wind'];
  const block = fakeBlock(2, { col: 2, row: 3, hp: 1e6 });
  const h = skillHarness('earth+wind', { hit: HIT, blocks: [block] });
  const biter = h.foe(2, BITING); // the busiest lane: it is at the blocks
  const walker = h.foe(3, 5, { speed: 1 }); // the next busiest
  const calm = h.foe(0, 2); // far up a quieter lane
  h.act();
  const storm = h.d.zones.find((z) => z.kind === 'sand');
  assert.ok(storm, 'a sandstorm');
  assert.equal(storm.r, Infinity);
  assert.deepEqual([...storm.lanes].sort((a, b) => a - b), [2, 3], `the ${p.lanes} busiest lanes`);
  for (const e of [biter, walker]) assert.ok(e.blindT > 0 && e.blindMiss === p.missPct, 'blinded');
  const s0 = walker.s;
  h.run(2.5);
  assert.ok(near(walker.s - s0, 2.5 * (1 - p.slowPct), 0.03), `slowed: it moved ${walker.s - s0}`);
  const sand = h.events('hit').filter((x) => x.skill === 'earth+wind' && x.id === walker.id);
  assert.equal(sand.length, 3, 'as the storm rises, then every second');
  for (const x of sand) assert.ok(near(x.amount, HIT * p.dpsPct), `${x.amount} a second`);
  assert.ok(calm.blindT === 0 && calm.chillT === 0, 'a foe on another lane is not touched');
  assert.equal(h.events('hit').filter((x) => x.skill === 'earth+wind' && x.id === calm.id).length, 0);
  h.run(h.pet.summon.dur);
  assert.ok(h.fx('text').some((f) => f.key === 'fx.miss'), 'blinded bites miss');
  assert.ok(h.events('tileHit').length > 0, 'some still land');
});

test('Iron Taunt: it guards the front of the blocks; foes near it stop and bite it for reflectPct; it stomps at the end', () => {
  const p = P['earth+metal'];
  const h = skillHarness('earth+metal', { hit: HIT });
  const a = h.foe(2, 6.5, { speed: 1 }); // lane 2 is the busiest
  const far = h.foe(0, 0, { speed: 1 });
  h.act();
  assert.ok(a.tauntT > 0 && a.tauntBy === h.pet.id, 'taunted');
  assert.equal(a.tauntReflect, HIT * p.reflectPct);
  assert.equal(far.tauntT, 0, 'out of reach');
  h.run(1);
  assert.ok(near(h.pet.summon.x, laneX(2), 0.05), 'on the busiest lane');
  assert.ok(h.pet.summon.y < SIEGE.boardTop + GRID.cell, `in front of the blocks (y ${h.pet.summon.y})`);
  const s0 = a.s;
  h.run(3);
  assert.equal(a.s, s0, 'it holds and bites the pet');
  const bites = h.events('hit').filter((x) => x.id === a.id && x.thorns);
  assert.ok(bites.length >= 3, `${bites.length} bites`);
  for (const b of bites) assert.ok(near(b.amount, HIT * p.reflectPct), `each bite costs it ${b.amount}`);
  const late = h.foe(3, 7); // walks into reach
  h.run(0.1);
  assert.ok(late.tauntT > 0, 'a foe that comes near later is taunted too');
  while (h.pet.summon.phase === 'act') h.run(PHYSICS.dt);
  const stomp = h.events('hit').filter((x) => x.skill === 'earth+metal' && x.id === a.id);
  assert.equal(stomp.length, 1, 'one stomp, at the end');
  assert.ok(near(stomp[0].amount, HIT * p.hitPct), `${stomp[0].amount} damage`);
  assert.ok(near(a.stunT, p.stunS, 2 * PHYSICS.dt), `stunned for ${p.stunS} s (stunT ${a.stunT})`);
  assert.equal(h.fx('slam').length, 1);
  assert.equal(a.tauntT, 0, 'free once the pet heads home');
});

test('Moss Spring: blocks heal healPct a second; biters are rooted once every cooldownS; a breaking block is saved once at savePct', () => {
  const p = P['earth+nature'];
  const bitten = fakeBlock(2, { col: 0, row: 3, hp: 1000 });
  const weak = fakeBlock(3, { col: 3, row: 3, hp: 100 });
  const h = skillHarness('earth+nature', { hit: HIT, blocks: [bitten, weak] });
  h.pet.hp = 500; // nothing bites the pet's own tile: it only heals
  weak.hp = 10;
  weak.saved = true; // left from an earlier summon
  const biter = h.foe(0, BITING);
  biter.atk = 10;
  h.act();
  assert.equal(weak.saved, false, 'each summon saves each block once');
  const dur = h.pet.summon.dur;
  const breaker = h.foe(3, BITING);
  breaker.atk = 40;
  const roots = []; // summon time of each new root on the biter
  let prev = biter.rootT;
  let top = 0;
  let breakerTop = 0;
  let savedAt = null;
  let healedBy2 = null; // the heal over the first 2 s (over the whole time out it fills the block)
  while (h.pet.summon?.phase === 'act') {
    h.run(PHYSICS.dt);
    if (healedBy2 == null && h.pet.summon.t >= 2) healedBy2 = h.pet.hp - 500;
    if (biter.rootT > prev + 1e-9) roots.push(h.pet.summon.t);
    prev = biter.rootT;
    top = Math.max(top, biter.rootT);
    breakerTop = Math.max(breakerTop, breaker.rootT);
    if (savedAt == null && weak.saved) savedAt = weak.hp;
  }
  // the heal comes in steps: healPct of max health a second, the whole time out (to full health)
  assert.ok(Math.abs(healedBy2 - 2 * p.healPct * h.pet.maxHp) <= 0.5 * p.healPct * h.pet.maxHp + 1e-6, `healed ${healedBy2} in 2 s`);
  assert.equal(h.pet.hp, Math.min(h.pet.maxHp, 500 + dur * p.healPct * h.pet.maxHp), 'and on to full');
  const heals = h.events('tileHeal').filter((x) => x.id === h.pet.id).length;
  assert.ok(heals >= dur && heals <= 2 * dur + 1, `${heals} heals, not one a frame`);
  // roots: on a bite, then not again until cooldownS has passed
  assert.ok(near(top, p.rootS), `rooted for ${p.rootS} s`);
  assert.equal(roots.length, 3, `rooted at ${roots.map((t) => t.toFixed(2))}`);
  for (let i = 1; i < roots.length; i++) assert.ok(near(roots[i] - roots[i - 1], p.cooldownS, 3 * PHYSICS.dt), 'once every cooldownS');
  assert.ok(near(breakerTop, p.rootS), 'the breaker, rooted first, does not hold back the biter: a cooldown per foe');
  assert.ok(h.events('tileHit').every((x) => x.amount === (x.id === weak.id ? 40 : 10)), 'the bites land in full');
  // the weak block: saved at savePct the first time it breaks, gone the second
  assert.ok(near(savedAt, weak.maxHp * p.savePct), `saved at ${savedAt}`);
  assert.equal(h.fx('text').filter((f) => f.key === 'fx.saved').length, 1, 'once');
  assert.equal(h.events('tileDown').filter((x) => x.id === weak.id).length, 1, 'the next break is for good');
  assert.equal(h.events('tileDown').length, 1);
});
