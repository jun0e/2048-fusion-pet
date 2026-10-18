// v2 fusion skills, metal's group (src/sim/skills/metal.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { GRID, PHYSICS, laneX } from '../src/config.js';
import { skillHarness } from './helpers/skill-harness.js';

const HIT = 100;
const CELL = GRID.cell;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const lost = (e) => e.maxHp - e.hp;

test('Bumper Harvest: kills pay more while it is out; every period a log rolls down the busiest lane, hitting and knocking back its foes', () => {
  const p = P['metal+nature'];
  const h = skillHarness('metal+nature', { hit: HIT });
  const lane = [h.foe(1, 5), h.foe(1, 6.5)]; // the busiest lane
  const aside = h.foe(3, 2);
  const s0 = lane.map((e) => e.s);
  h.act();
  lane.forEach((e, i) => {
    assert.ok(near(lost(e), HIT * p.hitPct), `the log dealt ${lost(e)}`);
    assert.ok(near(s0[i] - e.s, p.pushCells * CELL), `and knocked it back ${(s0[i] - e.s).toFixed(2)}`);
  });
  assert.ok(lost(aside) === 0 && aside.s === 2, 'a foe in another lane is left alone');
  const logs = h.fx('beam');
  assert.equal(logs.length, 1);
  assert.ok(logs[0].x === laneX(1) && logs[0].x1 === laneX(1), 'it rolls along lane 1');
  // a kill while it is out pays more, whatever made it
  const prey = h.foe(2, 3, { hp: 10 });
  h.d.damage(prey, 50, ['physical']);
  h.run(PHYSICS.dt);
  const kill = h.events('kill').find((k) => k.id === prey.id);
  assert.equal(kill.coinMult, p.coinMult);
  assert.equal(kill.xp, p.xp);
  assert.ok(h.fx('burst').some((x) => near(x.x, prey.x) && near(x.y, prey.y)), 'a shower of coins where it fell');
  h.run(p.periodS);
  assert.equal(h.fx('beam').length, 2, 'one log a period');
  for (const e of lane) assert.ok(near(lost(e), 2 * HIT * p.hitPct), `hit again: ${lost(e)}`);
  // home: kills pay as usual again
  h.run(h.pet.summon.left + 0.1);
  assert.equal(h.pet.summon, undefined);
  const later = h.foe(2, 3, { hp: 10 });
  h.d.damage(later, 50, ['physical']);
  h.run(PHYSICS.dt);
  const plain = h.events('kill').find((k) => k.id === later.id);
  assert.ok(plain && plain.coinMult == null && plain.xp == null, 'no bonus once the pet is home');
});
