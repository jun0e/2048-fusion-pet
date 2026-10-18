// v2 fusion skills, poison's group (src/sim/skills/poison.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { GRID, PHYSICS, SIEGE, laneX } from '../src/config.js';
import { skillHarness } from './helpers/skill-harness.js';

const HIT = 100;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('Bog Web: a web ahead of the blocks on the busiest lane slows and poisons foes; one that dies in it hatches spiderlings', () => {
  const p = P['poison+earth'];
  const h = skillHarness('poison+earth', { hit: HIT });
  const walker = h.foe(2, 6.8, { speed: 1 }); // lane 2 is the busiest
  const target = h.foe(2, 6.5); // stands in the web
  const far = h.foe(0, 1);
  h.act();
  const web = h.d.zones.find((z) => z.kind === 'web');
  assert.ok(web, 'a web');
  assert.equal(web.x, laneX(2), 'on the busiest lane');
  assert.equal(web.r, p.radiusCells * GRID.cell);
  assert.ok(web.y > SIEGE.boardTop && web.y - web.r < SIEGE.boardTop, `just ahead of the blocks (y ${web.y})`);
  // slowed by slowPct: a 1 unit/s walker covers 1 − slowPct in a second
  const s0 = walker.s;
  h.run(1.1);
  assert.ok(near(walker.s - s0, 1.1 * (1 - p.slowPct), 0.02), `slowed: it moved ${walker.s - s0}`);
  // a stack as it steps in, then one every half second
  assert.equal(walker.poison.stacks, 3, `poisoned: ${walker.poison.stacks} stacks`);
  assert.ok(far.chillT === 0 && far.poison.stacks === 0, 'a foe out of the web is not touched');
  // a foe that dies in the web hatches spiderlings; each bites the nearest foe once
  const victim = h.foe(2, 6.8, { hp: 1 }); // its first venom tick kills it
  h.run(0.5);
  assert.ok(victim.dead, 'it died in the web');
  assert.equal(h.events('kill').find((x) => x.id === victim.id).coinMult, undefined, 'the web adds no reward');
  const bites = h.events('hit').filter((x) => x.skill === 'poison+earth');
  assert.equal(bites.length, p.spiders, 'one bite a spiderling');
  for (const b of bites) {
    assert.equal(b.id, target.id, 'on the nearest foe');
    assert.ok(near(b.amount, HIT * p.hitPct), `a ${b.amount} bite`);
  }
  assert.equal(h.d.minions.length, 0, 'each bites once');
  // a foe that dies out of the web hatches none
  const outside = h.foe(0, 1.5, { hp: 1 });
  h.d.damage(outside, 5, ['physical']);
  h.run(0.5);
  assert.equal(h.events('hit').filter((x) => x.skill === 'poison+earth').length, p.spiders, 'no spiderlings');
});

test('Panic Cloud: a toxic cloud follows the pet; foes in it are poisoned and run back, each once every cooldownS', () => {
  const p = P['poison+wind'];
  const h = skillHarness('poison+wind', { hit: HIT });
  const e = h.foe(1, 5, { speed: 1 });
  h.act();
  const cloud = h.d.zones.find((z) => z.kind === 'cloud');
  assert.ok(cloud, 'a cloud');
  assert.equal(cloud.r, p.radiusCells * GRID.cell);
  assert.ok(near(e.fearT, p.fearS, 0.05), `it panics for ${p.fearS} s (fearT ${e.fearT})`);
  assert.equal(e.poison.stacks, 1, 'and is poisoned');
  const s0 = e.s;
  const pet0 = { x: h.pet.summon.x, y: h.pet.summon.y };
  h.run(1);
  assert.ok(e.s < s0 - 0.9, `it runs back up its lane (s ${s0} → ${e.s})`);
  const pet = h.pet.summon;
  assert.ok(Math.hypot(pet.x - pet0.x, pet.y - pet0.y) > 0.5, 'the pet drifts after the foes');
  assert.ok(near(cloud.x, pet.x) && near(cloud.y, pet.y), 'and its cloud goes with it');
  // it stays in the cloud, but panics again only once its cooldown is over
  const panics = []; // summon time of each new panic
  let prev = e.fearT;
  while (h.pet.summon?.phase === 'act') {
    h.run(PHYSICS.dt);
    if (e.fearT > prev + 1e-9) panics.push(h.pet.summon.t);
    prev = e.fearT;
  }
  assert.ok(panics.length >= 1, 'it panics again');
  assert.ok(near(panics[0], p.cooldownS, 2 * PHYSICS.dt), `the next panic at ${panics[0]} s, not before ${p.cooldownS} s`);
  for (let i = 1; i < panics.length; i++) assert.ok(panics[i] - panics[i - 1] >= p.cooldownS - 1e-6);
});

test('Executioner Sting: it stings the weakest foe: under belowPct it dissolves for double coins, a boss loses bossPct, others take hitPct', () => {
  const p = P['poison+metal'];
  const h = skillHarness('poison+metal', { hit: HIT });
  const weak = h.foe(1, 5, { hp: 1000 });
  weak.hp = 200; // 20%: under belowPct
  const healthy = h.foe(2, 5, { hp: 1000 });
  h.act();
  assert.ok(weak.dead, 'it dissolves at once');
  assert.equal(h.events('kill').find((x) => x.id === weak.id).coinMult, 2, 'and drops double coins');
  assert.ok(h.fx('text').some((f) => f.key === 'fx.execute'));
  assert.equal(healthy.hp, healthy.maxHp, 'one sting a beat');
  h.run(p.periodS);
  const sting = h.events('hit').filter((x) => x.skill === 'poison+metal' && x.id === healthy.id);
  assert.equal(sting.length, 1, 'the next beat stings the next weakest');
  assert.ok(near(sting[0].amount, HIT * p.hitPct), `over belowPct: ${sting[0].amount} damage`);
  assert.equal(healthy.poison.stacks, 1, 'and poison');
  assert.ok(!healthy.dead);
  // a boss under belowPct only loses bossPct of its max health
  const boss = h.foe(0, 5, { hp: 10000, boss: true });
  boss.hp = 2000;
  h.run(p.periodS);
  const chunk = h.events('hit').filter((x) => x.skill === 'poison+metal' && x.id === boss.id);
  assert.equal(chunk.length, 1);
  assert.ok(near(chunk[0].amount, boss.maxHp * p.bossPct), `the boss lost ${chunk[0].amount}`);
  assert.ok(!boss.dead && boss.poison.stacks === 0, 'no dissolving, no poison');
  assert.equal(h.fx('text').filter((f) => f.key === 'fx.execute').length, 1, 'the word is for the execution alone');
  // a foe that dies some other way meanwhile pays as usual
  const other = h.foe(3, 5, { hp: 10 });
  h.d.damage(other, 20, ['physical']);
  h.run(PHYSICS.dt);
  assert.equal(h.events('kill').find((x) => x.id === other.id).coinMult, undefined);
});

test('Toxic Lullaby: every periodS, foes near the pet fall asleep (a boss for bossSleepS); the hit that wakes one deals wakePct', () => {
  const p = P['poison+nature'];
  const h = skillHarness('poison+nature', { hit: HIT });
  const a = h.foe(1, 7, { speed: 1 });
  const boss = h.foe(2, 7, { speed: 1, boss: true });
  const far = h.foe(3, 0);
  h.act();
  assert.ok(near(a.sleepT, p.sleepS, 0.05), `asleep for ${p.sleepS} s (sleepT ${a.sleepT})`);
  assert.ok(near(boss.sleepT, p.bossSleepS, 0.05), `the boss for its own ${p.bossSleepS} s (sleepT ${boss.sleepT})`);
  assert.equal(far.sleepT, 0, 'out of earshot');
  assert.equal(h.fx('ring').length, 1, 'one ring a song');
  const s0 = a.s;
  const b0 = boss.s;
  h.run(p.bossSleepS + 0.2);
  assert.equal(a.s, s0, 'asleep: it stands still');
  assert.ok(boss.sleepT === 0 && boss.s > b0, 'the boss is awake and walking');
  const hp = a.hp;
  h.d.damage(a, 10, ['physical']);
  assert.ok(near(hp - a.hp, 10 * p.wakePct), `the waking hit lands ×${p.wakePct}: ${hp - a.hp}`);
  assert.equal(a.sleepT, 0, 'and wakes it');
  h.run(p.periodS - p.bossSleepS);
  assert.ok(a.sleepT > 0 && boss.sleepT > 0, 'the next song puts them back to sleep');
  assert.equal(h.fx('ring').length, 2);
});
