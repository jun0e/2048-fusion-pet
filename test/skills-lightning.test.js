// v2 fusion skills, lightning's group (src/sim/skills/lightning.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { FIELD, GRID, PHYSICS, SIEGE, laneX } from '../src/config.js';
import { skillHarness } from './helpers/skill-harness.js';

const HIT = 100;
const CELL = GRID.cell;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
/** The skill's own hits on one foe (the harness blocks do not shoot). */
const blowsOn = (h, key) => (e) => h.events('hit').filter((x) => x.skill === key && x.id === e.id);
/** Stunned for `sec`, give or take the steps since (a stun set this step has already ticked once). */
const freshStun = (e, sec) => e.stunT > sec - 2 * PHYSICS.dt && e.stunT <= sec;

test('Toxic Circuit: each beat it poisons `spits` foes, then a current hits and stuns every poisoned foe on the field', () => {
  const p = P['lightning+poison'];
  const h = skillHarness('lightning+poison', { hit: HIT });
  const clean = [h.foe(0, 4), h.foe(1, 4), h.foe(2, 4), h.foe(3, 4), h.foe(1, 6)];
  const old = h.foe(3, 1); // poisoned by something else, far up the field
  old.poison = { stacks: 1, dps: 1, t: 30 };
  const zaps = blowsOn(h, 'lightning+poison');
  h.act();
  let lit = clean.filter((e) => e.poison.stacks > 0);
  assert.equal(lit.length, p.spits, `it spits on ${p.spits} foes`);
  for (const e of [...lit, old]) {
    assert.equal(zaps(e).length, 1, 'the current runs through every poisoned foe once');
    assert.ok(near(zaps(e)[0].amount, HIT * p.hitPct), `${zaps(e)[0].amount}`);
    assert.ok(h.events('stun').some((x) => x.id === e.id) && freshStun(e, p.stunS), `and stuns it for ${p.stunS} s (${e.stunT})`);
  }
  for (const e of clean.filter((f) => !lit.includes(f))) assert.equal(zaps(e).length, 0, 'a clean foe is spared');
  assert.equal(h.fx('bolt').length, lit.length + 1, 'a bolt to each foe on the circuit');
  const first = new Set([...lit, old]);
  h.run(p.periodS);
  lit = clean.filter((e) => e.poison.stacks > 0);
  assert.equal(lit.length, 2 * p.spits, 'the next beat poisons fresh foes');
  for (const e of [...lit, old]) assert.equal(zaps(e).length, first.has(e) ? 2 : 1, 'and the current runs through them all');
  assert.equal(h.fx('bolt').length, p.spits + 1 + 2 * p.spits + 1);
});

test('Thunder Charge: it charges up the busiest lane `charges` times; each foe in the way is hit, knocked back and stunned once a run', () => {
  const p = P['lightning+earth'];
  const h = skillHarness('lightning+earth', { hit: HIT });
  const lane2 = [h.foe(2, 3), h.foe(2, 5), h.foe(2, 7)];
  const aside = h.foe(0, 3);
  const s0 = lane2.map((e) => e.s);
  const blows = blowsOn(h, 'lightning+earth');
  h.act();
  assert.ok(freshStun(lane2[2], p.stunS), `the foe at the foot of the lane is stunned for ${p.stunS} s at once (${lane2[2].stunT})`);
  h.run(1.2); // the first run is over
  for (const [i, e] of lane2.entries()) {
    assert.equal(blows(e).length, 1, 'hit once in the run, though the push throws it ahead of the pet');
    assert.ok(near(blows(e)[0].amount, HIT * p.hitPct));
    assert.ok(e.s < s0[i], 'knocked back up its lane');
    assert.ok(h.events('stun').some((x) => x.id === e.id), 'and stunned');
  }
  assert.ok(near(lane2[1].s, s0[1] - p.pushCells * CELL), `pushed ${p.pushCells} cells (s ${lane2[1].s})`);
  assert.equal(blows(aside).length, 0, 'a foe in another lane is not in the way');
  assert.ok(near(h.pet.summon.x, laneX(2)), 'it ran lane 2');
  assert.equal(h.fx('beam').length, 1, 'one charge so far');
  // the next run takes the lane that is busiest by then
  const fresh = [h.foe(3, 7), h.foe(3, 7.5)];
  h.run(2.5);
  for (const e of fresh) assert.equal(blows(e).length, 1, 'the second run went up lane 3');
  assert.equal(h.fx('beam').length, 2);
  h.run(h.pet.summon.dur);
  assert.equal(h.fx('beam').length, p.charges, `${p.charges} runs in all`);
  for (const e of [...lane2, ...fresh]) assert.ok(blows(e).length <= p.charges);
});

test('Thunder Charge: the busiest lane it can reach, not one whose foes are all deep on the board below its run', () => {
  const p = P['lightning+earth'];
  const h = skillHarness('lightning+earth', { hit: HIT });
  const deep = [h.foe(2, 14), h.foe(2, 14.5), h.foe(2, 15)]; // biting blocks low in column 2
  const walker = h.foe(1, 5);
  const blows = blowsOn(h, 'lightning+earth');
  h.act();
  h.run(1.2);
  assert.equal(blows(walker).length, 1, 'it ran up lane 1');
  assert.ok(near(blows(walker)[0].amount, HIT * p.hitPct));
  for (const e of deep) assert.equal(blows(e).length, 0);
});

test('Storm Hop: every beat it hops to a foe it has not struck lately, hits it and splashes the foes around it', () => {
  const p = P['lightning+wind'];
  const h = skillHarness('lightning+wind', { hit: HIT });
  const R = p.splashCells * CELL;
  const a = h.foe(0, 4);
  const b = h.foe(0, 4 + 0.9 * R); // just inside a's splash, straight down its lane
  const d = h.foe(1, 4 - Math.sqrt((1.1 * R) ** 2 - CELL ** 2)); // just outside a's splash, one lane over
  const c = h.foe(3, 2); // alone
  const zaps = () => h.events('hit').filter((x) => x.skill === 'lightning+wind');
  h.act();
  h.run(3 * p.periodS);
  const struck = zaps().filter((x) => near(x.amount, HIT * p.hitPct)).map((x) => x.id);
  assert.equal(struck.length, 4, 'four hops');
  assert.deepEqual([...struck].sort(), [a.id, b.id, c.id, d.id].sort(), 'each to another foe');
  const splash = zaps().filter((x) => near(x.amount, HIT * p.splashPct));
  assert.deepEqual(splash.map((x) => x.id).sort(), [a.id, b.id].sort(), `a and b splash each other; d is just over ${p.splashCells} cells off`);
  assert.equal(zaps().length, 6, 'nothing else is hit');
  assert.ok(near(h.pet.summon.x, laneX(3)), 'the pet stands on its last mark');
  assert.equal(h.fx('bolt').length, 4, 'a bolt each hop');
  h.run(p.periodS);
  const next = zaps().filter((x) => near(x.amount, HIT * p.hitPct)).at(-1);
  assert.equal(next.id, struck[0], 'then back to the one struck longest ago');
});

test("Railgun: unseen, it charges; then a rail hits every foe down the toughest foe's lane; it fires `shots` times", () => {
  const p = P['lightning+metal'];
  const h = skillHarness('lightning+metal', { hit: HIT });
  const tough = h.foe(2, 3, { hp: 1e7 });
  const mate = h.foe(2, 6);
  const low = h.foe(2, 9.5); // on the board, in the same column
  const other = h.foe(0, 5);
  const rails = blowsOn(h, 'lightning+metal');
  h.act();
  assert.equal(h.pet.summon.hidden, true, 'it turns invisible');
  h.run(p.chargeS - 0.1);
  assert.equal(h.fx('beam').length, 0, 'still charging');
  assert.equal(h.events('hit').length, 0);
  h.run(0.2);
  assert.equal(h.fx('beam').length, 1, 'it fired');
  assert.equal(h.pet.summon.hidden, false, 'seen as it fires');
  for (const e of [tough, mate, low]) {
    assert.equal(rails(e).length, 1, 'every foe in the lane');
    assert.ok(near(rails(e)[0].amount, HIT * p.hitPct));
  }
  assert.equal(rails(other).length, 0, 'another lane is not in its path');
  const beam = h.fx('beam')[0];
  assert.ok(near(beam.x, laneX(2)) && near(beam.x1, laneX(2)), 'straight down lane 2');
  assert.ok(beam.w > 0.3 && beam.w < 0.8);
  h.run(0.6);
  assert.equal(h.pet.summon.hidden, true, 'gone again to charge the next');
  // the next rail takes the lane of whoever is toughest by then
  other.hp = other.maxHp = 1e8;
  h.run(p.chargeS);
  assert.equal(h.fx('beam').length, 2);
  assert.equal(rails(other).length, 1, 'down lane 0 this time');
  assert.equal(rails(tough).length, 1);
  h.run(h.pet.summon.dur - h.pet.summon.t + 0.1); // to the end of its time out
  assert.equal(h.fx('beam').length, p.shots, `${p.shots} shots in all`);
  assert.equal(h.pet.summon.phase, 'back');
  assert.equal(h.pet.summon.hidden, false, 'seen on its way home');
});

test('Railgun: a shot held while the field is empty still goes, and the rest still fit in its time out', () => {
  const p = P['lightning+metal'];
  const h = skillHarness('lightning+metal', { hit: HIT });
  const first = h.foe(1, 3, { hp: 1 });
  h.go();
  h.d.damage(first, 5, ['physical']); // the field empties as the pet goes out
  h.run(h.pet.summon.hop + 3.5);
  assert.equal(h.fx('beam').length, 0, 'nothing to shoot: it holds its charge');
  assert.equal(h.pet.summon.hidden, true, 'unseen while it waits');
  h.foe(2, 4);
  h.run(0.1);
  assert.equal(h.fx('beam').length, 1, 'the first foe to show up is shot at once');
  h.run(h.pet.summon.dur - h.pet.summon.t + 0.1);
  assert.equal(h.fx('beam').length, p.shots, `still ${p.shots} shots`);
});

test('Bloom Ambush: planted before the blocks, it snatches a foe in reach and lightning jumps to the nearest others; then it waits its cooldown', () => {
  const p = P['lightning+nature'];
  const h = skillHarness('lightning+nature', { hit: HIT });
  const prey = h.foe(1, 2, { speed: 1.5 }); // walks down lane 1 into the flower's reach
  const others = [h.foe(0, 1), h.foe(2, 1), h.foe(1, 0.5)]; // they stay up the field: the nearest ones to the prey
  const fourth = h.foe(2, 0); // near the prey too, but further than those three
  const blows = blowsOn(h, 'lightning+nature');
  h.act();
  assert.equal(blows(prey).length, 1, 'snatched');
  assert.ok(near(blows(prey)[0].amount, HIT * p.hitPct));
  for (const e of others) {
    assert.equal(blows(e).length, 1, 'lightning jumps to it');
    assert.ok(near(blows(e)[0].amount, HIT * p.jumpPct));
  }
  assert.equal(blows(fourth).length, 0, `${p.jumps} jumps, no more`);
  assert.equal(h.fx('bolt').length, 1 + p.jumps, 'a bolt to the prey, one for each jump');
  h.run(p.cooldownS - 0.1);
  assert.equal(blows(prey).length, 1, 'it waits its cooldown');
  h.run(0.2);
  assert.equal(blows(prey).length, 2, 'then strikes again');
  h.run(3);
  for (const e of [...others, fourth]) assert.ok(blows(e).every((x) => near(x.amount, HIT * p.jumpPct)), 'a foe out of reach is never snatched');
  const s = h.pet.summon;
  assert.ok(near(s.x, laneX(1)), 'on the busiest lane');
  assert.ok(s.y > SIEGE.boardTop && s.y < SIEGE.boardTop + 1.5 * CELL, `just in front of the blocks (y ${s.y.toFixed(2)})`);
});

test("Bloom Ambush's reach: it snatches only within radiusCells, and its lightning jumps no further than that from the prey", () => {
  const p = P['lightning+nature'];
  const R = p.radiusCells * CELL;
  const h = skillHarness('lightning+nature', { hit: HIT });
  h.act();
  h.run(1); // planted, with nothing to snatch yet
  const { x, y } = h.pet.summon;
  const sAt = (wy) => FIELD.spawnY - wy; // where along a lane a foe stands at world height wy
  const inner = h.foe(1, sAt(y + 0.9 * R), { hp: HIT * p.hitPct * 0.8 }); // in reach: snatched, and felled by it
  const outer = h.foe(1, sAt(y + 1.1 * R)); // just out of reach of the flower; right by the prey
  const beyond = h.foe(3, sAt(y + 0.9 * R + Math.sqrt((1.1 * R) ** 2 - (laneX(3) - x) ** 2))); // 1.1 × reach from the prey
  const blows = blowsOn(h, 'lightning+nature');
  h.run(0.1);
  assert.ok(inner.dead && near(blows(inner)[0].amount, HIT * p.hitPct), 'the foe in reach is snatched');
  assert.equal(blows(outer).length, 1, 'lightning jumps to the foe beside it');
  assert.ok(near(blows(outer)[0].amount, HIT * p.jumpPct));
  assert.equal(blows(beyond).length, 0, `not to one ${p.radiusCells} cells and more from the prey`);
  h.run(3);
  assert.equal(blows(outer).length, 1, 'a foe just out of reach is never snatched');
  assert.equal(blows(beyond).length, 0);
});
