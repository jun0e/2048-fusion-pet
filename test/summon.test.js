// v2 summons and the skill kit (docs/v2/SPEC.md sections 5 and 6): the charge, the pet's trip out and
// home, what a skill can do to foes and blocks, and that everything it left goes with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { V2, PHYSICS, FIELD } from '../src/config.js';
import { SKILL_IMPL } from '../src/sim/skills/index.js';
import { skillHarness, fakeBlock } from './helpers/skill-harness.js';

// a skill made for these tests: it records what the defense calls, and does what each test asks
const calls = [];
let script = {};
SKILL_IMPL['test+probe'] = {
  start: (ctx) => {
    calls.push('start');
    script.start?.(ctx);
  },
  tick: (ctx, dt) => script.tick?.(ctx, dt),
  end: (ctx) => {
    calls.push('end');
    script.end?.(ctx);
  },
};
const fresh = (s = {}) => {
  calls.length = 0;
  script = s;
  return skillHarness('test+probe');
};

test('a summon charges only while foes are on the field, and only a full charge sends the pet', () => {
  const h = fresh();
  h.run(3);
  assert.equal(h.d.skillCharge(h.pet.id), 0, 'no foes: no charge');
  assert.equal(h.d.summon(h.pet), false);
  h.foe(1, 2);
  h.run(V2.summon.chargeS / 2);
  assert.ok(Math.abs(h.d.skillCharge(h.pet.id) - 0.5) < 0.01, 'half way');
  assert.equal(h.d.summon(h.pet), false, 'not before it is full');
  h.run(V2.summon.chargeS / 2 + 0.05);
  assert.equal(h.d.skillCharge(h.pet.id), 1);
  assert.equal(h.d.summon(h.pet), true);
  assert.equal(h.d.skillCharge(h.pet.id), 0, 'spent');
  assert.equal(h.d.summon(h.pet), false, 'not twice');
  const block = fakeBlock(2, { summon: null });
  assert.equal(h.d.summon(block, { force: true }), false, 'a block with no summon has nothing to send');
});

test('the pet hops out, acts for its time, and hops home; the events say so', () => {
  const h = fresh();
  h.foe(2, 4);
  assert.equal(h.go(), true);
  const s = h.pet.summon;
  assert.equal(s.phase, 'out');
  h.run(PHYSICS.dt);
  assert.equal(h.events('petOut').length, 1);
  assert.equal(h.events('petOut')[0].durS, V2.summon.durS);
  h.run(s.hop);
  assert.equal(s.phase, 'act');
  assert.deepEqual(calls, ['start']);
  assert.ok(s.y > FIELD.gateY + 8, 'it stands out on the field, above the board');
  assert.equal(s.lane, 2, 'on the lane the foe walks');
  h.run(s.dur);
  assert.equal(s.phase, 'back');
  assert.deepEqual(calls, ['start', 'end']);
  h.run(s.hop + PHYSICS.dt);
  assert.equal(h.pet.summon, undefined, 'home');
  assert.equal(h.events('petHome').length, 1);
  assert.equal(h.events('petHome')[0].gone, false);
  assert.ok(h.d.skillCharge(h.pet.id) < 0.01, 'it charges again from empty, once home');
});

test('a pet whose tile leaves the board ends at once, and takes its pieces and hooks with it', () => {
  const h = fresh({
    start: (ctx) => {
      ctx.zone({ kind: 'field', x: 0, y: 12, r: 2, dur: 30 });
      ctx.wall({ lanes: [0], y: 11, dur: 30 });
      ctx.onKill(() => ({ coinMult: 3 }));
    },
  });
  h.foe(0, 3);
  h.act();
  assert.equal(h.d.zones.length, 1);
  assert.equal(h.d.walls.length, 1);
  h.blocks.splice(0, 1); // merged away
  h.run(PHYSICS.dt);
  assert.equal(h.events('petHome').at(-1).gone, true);
  assert.deepEqual(calls, ['start', 'end']);
  assert.equal(h.d.zones.length + h.d.walls.length, 0, 'its zone and wall are gone');
  const e = h.foe(1, 3, { hp: 1 });
  h.d.damage(e, 5, ['physical']);
  assert.equal(h.d.drainEvents().find((x) => x.type === 'kill').coinMult, undefined, 'and its kill hook');
});

test('a merged block keeps the most charge its parts had built', () => {
  const h = fresh();
  h.foe(1, 2);
  h.run(V2.summon.chargeS * 0.6);
  const child = fakeBlock(9, { summon: 'test+probe' });
  child.mergedFrom = [{ id: h.pet.id }, { id: 77 }];
  h.blocks.splice(0, 1, child);
  h.run(PHYSICS.dt);
  assert.ok(h.d.skillCharge(9) > 0.59, `the child starts at its parent's charge (${h.d.skillCharge(9)})`);
});

test('skill statuses: melted armour, sleep, fear, blindness, bleeding, taunts', () => {
  let ctxRef = null;
  const h = fresh({ start: (ctx) => (ctxRef = ctx) });
  const a = h.foe(0, 4);
  const b = h.foe(1, 4, { speed: 1 });
  const c = h.foe(2, 5, { speed: 1 });
  h.act();
  const ctx = ctxRef;
  // vulnerability
  ctx.vuln(a, 0.5, 2);
  const hp0 = a.hp;
  h.d.damage(a, 100, ['physical']);
  assert.ok(Math.abs(hp0 - a.hp - 150) < 1e-6, 'takes 50% more');
  // sleep: no walking; the first hit wakes it at ×3
  ctx.sleep(b, 2, 3);
  const s0 = b.s;
  h.run(0.5);
  assert.equal(b.s, s0, 'asleep: it does not walk');
  const hp1 = b.hp;
  h.d.damage(b, 10, ['physical']);
  assert.ok(Math.abs(hp1 - b.hp - 30) < 1e-6, 'the waking hit lands ×3');
  assert.equal(b.sleepT, 0);
  // fear: it walks back toward the portal
  ctx.fear(c, 1);
  const s1 = c.s;
  h.run(0.5);
  assert.ok(c.s < s1, 'afraid: it runs back up its lane');
  // bleeding: it loses health as it moves
  const d = h.foe(3, 2, { speed: 2 });
  ctx.bleed(d, 3, 0.5);
  const hp2 = d.hp;
  h.run(1);
  assert.ok(hp2 - d.hp > 40, `bled ${hp2 - d.hp} over about one cell`);
  // a boss is held half as long
  const boss = h.foe(0, 1, { boss: true });
  ctx.stun(boss, 2);
  assert.equal(boss.stunT, 1);
});

test('blinded bites miss; a bite hook and a block-saving hook change what lands', () => {
  const block = fakeBlock(2, { col: 0, row: 3, hp: 40 });
  const h = skillHarness('test+probe', { blocks: [block] });
  calls.length = 0;
  let ctxRef = null;
  script = { start: (ctx) => (ctxRef = ctx) };
  const e = h.foe(0, 7.6, { speed: 1.6 }); // a cell short of the board, above the block
  e.atk = 30;
  h.act(); // (it is still walking when the skill starts)
  ctxRef.blind(e, 30, 1); // always misses
  h.run(4);
  assert.equal(block.hp, 40, 'every bite missed');
  assert.ok(h.fx('text').some((f) => f.key === 'fx.miss'));
  e.blindT = 0;
  e.blindMiss = 0;
  ctxRef.onBite((foe, t, bite) => bite * 0.5);
  ctxRef.onDown((t) => {
    t.hp = t.maxHp * 0.3;
    return true;
  });
  h.run(2);
  assert.ok(block.hp < 40, 'bites land again');
  assert.ok(h.events('tileHit').every((x) => Math.abs(x.amount - 15) < 1e-6), 'halved by the hook');
  h.run(1.5); // still out: the hooks live as long as the pet is out
  assert.equal(h.events('tileDown').length, 0, 'the down hook saved it');
  assert.ok(Math.abs(block.hp - 12) < 1e-6, `saved at 30% (${block.hp})`);
});

test('a taunted foe stops and bites the pet, paying for each bite; the taunt ends with the summon', () => {
  let ctxRef = null;
  const h = fresh({ start: (ctx) => (ctxRef = ctx) });
  const e = h.foe(1, 5, { speed: 1 });
  h.act();
  ctxRef.taunt(e, 30, 0.5); // each bite costs it 50 (half the pet's hit)
  const s0 = e.s;
  const hp0 = e.hp;
  h.run(3.1);
  assert.equal(e.s, s0, 'it holds where it is');
  assert.ok(hp0 - e.hp >= 100, `it paid ${hp0 - e.hp} for its bites`);
  h.run(h.pet.summon.dur);
  assert.equal(e.tauntT, 0, 'free once the pet goes home');
});

test('zones act on foes inside, walls stop walkers, traps spring once, minions hunt, tethers drain', () => {
  let ctxRef = null;
  const h = fresh({ start: (ctx) => (ctxRef = ctx) });
  const inside = h.foe(1, 4);
  const outside = h.foe(3, 1);
  h.act();
  const ctx = ctxRef;
  const ticks = new Map();
  ctx.zone({ kind: 'field', x: inside.x, y: inside.y, r: 1, dur: 1, onTick: (e, dt) => ticks.set(e.id, (ticks.get(e.id) ?? 0) + dt) });
  h.run(0.5);
  assert.ok(ticks.get(inside.id) > 0.45 && !ticks.has(outside.id));
  h.run(0.6);
  assert.equal(h.d.zones.length, 0, 'it runs out');
  // a wall across lane 2 stops a walker short of it
  const w = h.foe(2, 2, { speed: 3 });
  let ended = 0;
  ctx.wall({ lanes: [2], y: 12, dur: 2, onEnd: () => (ended += 1) });
  h.run(1.9);
  assert.ok(w.y > 12, `held above the wall (y ${w.y.toFixed(2)})`);
  h.run(0.2);
  assert.equal(ended, 1, 'it says when it goes');
  // a trap springs on the first foe that comes near, once
  const hits = [];
  ctx.trap({ x: ctx.laneX(0), y: 13, r: 0.5, onTrigger: (e) => hits.push(e.id) });
  const t1 = h.foe(0, 2, { speed: 2 });
  h.run(1.5);
  assert.deepEqual(hits, [t1.id]);
  assert.equal(h.d.traps.length, 0);
  // a minion runs to the nearest foe
  const reached = [];
  ctx.minion({ kind: 'locust', x: 0, y: 9.5, speed: 4, ttl: 5, onReach: (e) => reached.push(e.id) });
  h.run(2);
  assert.equal(reached.length, 1);
  assert.equal(h.d.minions.length, 0);
  // a tether slows and drains a share of max health per second
  const big = h.foe(1, 2, { hp: 1000, speed: 1 });
  ctx.tether(big, { slowPct: 0.6, drainPct: 0.03 });
  h.run(1);
  assert.ok(Math.abs(1000 - big.hp - 30) < 1.5, `drained ${1000 - big.hp}`);
  assert.ok(big.chillSlow >= 0.6 - 1e-9);
});

test('a kill hook raises the coins and adds XP on the kill event', () => {
  let ctxRef = null;
  const h = fresh({ start: (ctx) => (ctxRef = ctx) });
  const e = h.foe(1, 3, { hp: 10 });
  h.act();
  ctxRef.onKill(() => ({ coinMult: 3, xp: 1 }));
  ctxRef.onKill(() => ({ coinMult: 2, xp: 1 }));
  ctxRef.strike(e, 1);
  const kill = h.d.drainEvents().find((x) => x.type === 'kill');
  assert.equal(kill.coinMult, 3, 'the biggest multiplier');
  assert.equal(kill.xp, 2, 'every XP');
});

test('ctx.every counts whole periods; strike rolls the pet crit', () => {
  const h = skillHarness('test+probe', { prof: { critChance: 1, critMult: 2 } });
  calls.length = 0;
  let ctxRef = null;
  script = { start: (ctx) => (ctxRef = ctx) };
  const e = h.foe(1, 3);
  h.act();
  let n = 0;
  for (let i = 0; i < 60; i++) n += ctxRef.every('beat', 0.25, PHYSICS.dt);
  assert.equal(n, 4, 'four beats in a second');
  const hp0 = e.hp;
  ctxRef.strike(e, 1.5);
  assert.equal(hp0 - e.hp, 300, '150% of a 100 hit, a sure crit ×2');
});

test('a buff fed in while the pet is out counts at once: the skill reads the profile the defense keeps current', () => {
  let ctxRef = null;
  const h = fresh({ start: (ctx) => (ctxRef = ctx) });
  const e = h.foe(1, 3);
  h.act();
  const hp0 = e.hp;
  ctxRef.strike(e, 1);
  assert.equal(hp0 - e.hp, 100, 'the hit it started with');
  h.pet.fakeProf = { ...h.pet.fakeProf, damage: 300 }; // a fire buff fed into the fusion mid-summon
  h.run(PHYSICS.dt);
  const hp1 = e.hp;
  ctxRef.strike(e, 1);
  assert.equal(hp1 - e.hp, 300, 'the new hit, at once');
  assert.equal(ctxRef.hit, 300);
});

test("a hit poisons with the profile's stacks per hit (the poison buff), a puddle's tick with one", () => {
  const POISON = { dpsPct: 0.1, dur: 3, max: 9, perHit: 3 };
  const shooter = fakeBlock(5, { col: 1, row: 3, shoots: true, shoot: { pattern: 'single', reach: 10, lanes: 0, target: 'front' }, rate: 1, damage: 1, poison: POISON });
  const h = skillHarness('test+probe', { blocks: [shooter] });
  const e = h.foe(1, 6);
  for (let i = 0; i < 120 && e.poison.stacks === 0; i++) h.run(PHYSICS.dt);
  assert.equal(e.poison.stacks, 3, 'one hit, three stacks');
});
