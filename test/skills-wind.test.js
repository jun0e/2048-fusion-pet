// v2 fusion skills, wind's group (src/sim/skills/wind.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { GRID, PHYSICS } from '../src/config.js';
import { skillHarness, fakeBlock } from './helpers/skill-harness.js';

const HIT = 100;
const CELL = GRID.cell;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('Sickle Sweep: every beat a sickle crosses all 4 lanes at the thickest height; each foe it crosses is cut and bleeds', () => {
  const p = P['wind+metal'];
  const h = skillHarness('wind+metal', { hit: HIT });
  const band = [h.foe(0, 5), h.foe(1, 5), h.foe(2, 5.6), h.foe(3, 5)]; // one height, all four lanes
  const above = h.foe(2, 1);
  const below = h.foe(0, 8);
  const cuts = (e) => h.events('hit').filter((x) => x.skill === 'wind+metal' && x.id === e.id);
  h.act();
  const sweeps = h.fx('sweep');
  assert.equal(sweeps.length, 1, 'it sweeps at once');
  for (const e of band) {
    assert.ok(Math.abs(e.y - sweeps[0].y) <= CELL / 2, 'the sweep runs at the band');
    assert.equal(cuts(e).length, 1, 'every foe it crosses');
    assert.ok(near(cuts(e)[0].amount, HIT * p.hitPct));
    assert.ok(near(e.bleedPer, HIT * p.bleedPct), `bleeds ${e.bleedPer} a cell`);
    assert.ok(e.bleedT > p.bleedS - 0.1 && e.bleedT <= p.bleedS);
  }
  for (const e of [above, below]) assert.ok(cuts(e).length === 0 && e.bleedT === 0, 'a foe off its line is untouched');
  // a cut foe that walks a cell bleeds for it
  const walker = band[0];
  walker.speed = CELL;
  const hp = walker.hp;
  h.run(1);
  assert.ok(Math.abs(hp - walker.hp - HIT * p.bleedPct) < 0.5, `bled ${hp - walker.hp} over a cell`);
  h.run(p.periodS - 1);
  assert.equal(h.fx('sweep').length, 2, `again after ${p.periodS} s`);
});

test('Pollen Rain: every block fires faster for the time out; each second each foe may sneeze itself into a stun', () => {
  const p = P['wind+nature'];
  const other = fakeBlock(2, { col: 2, row: 3 });
  const h = skillHarness('wind+nature', { hit: HIT, blocks: [other] });
  const foes = [];
  for (let i = 0; i < 40; i++) foes.push(h.foe(i % 4, 1 + Math.floor(i / 4) * 0.5));
  const sneezes = () => h.fx('text').filter((f) => f.key === 'fx.sneeze');
  h.act();
  const dur = h.pet.summon.dur;
  for (const t of h.blocks) {
    assert.equal(t.boostPct, p.ratePct, `block ${t.id} fires ${p.ratePct * 100}% faster`);
    assert.ok(t.boostT > dur - 0.1, 'for the time out');
  }
  h.run(0.85);
  assert.equal(sneezes().length, 0, 'no sneeze before the first second');
  h.run(0.2);
  const first = sneezes().length;
  assert.ok(first > 0, 'at a second some foes sneeze');
  assert.equal(h.events('stun').length, first, 'each sneeze is a stun');
  for (const s of h.events('stun')) {
    const e = foes.find((f) => f.id === s.id);
    assert.ok(e.stunT > 0 && e.stunT <= p.stunS);
    assert.ok(h.fx('burst').some((f) => near(f.x, e.x) && near(f.y, e.y)), 'with a burst of pollen');
  }
  // a block that joins the board mid-way is showered too
  const late = fakeBlock(3, { col: 3, row: 2 });
  h.blocks.push(late);
  h.run(3);
  assert.equal(late.boostPct, p.ratePct);
  const rolls = foes.length * 4;
  const n = sneezes().length;
  assert.ok(n > rolls * p.sneezePct * 0.5 && n < rolls * p.sneezePct * 1.5, `${n} sneezes in ${rolls} rolls`);
  // the boost ends with the time out
  h.run(dur - h.pet.summon.t + 0.1);
  assert.equal(h.pet.summon.phase, 'back');
  for (const t of h.blocks) assert.ok(t.boostT === 0 && t.boostPct === 0, 'no longer once the pet heads home');
});

test("Pollen Rain: the boost goes with the pet when its tile leaves the board before its time out ends", () => {
  const p = P['wind+nature'];
  const other = fakeBlock(2, { col: 2, row: 3 });
  const h = skillHarness('wind+nature', { hit: HIT, blocks: [other] });
  h.foe(1, 3);
  h.act();
  h.run(1);
  assert.equal(other.boostPct, p.ratePct);
  h.blocks.splice(0, 1); // the pet's tile merges away while the pet is out
  h.run(PHYSICS.dt);
  assert.equal(h.events('petHome').at(-1)?.gone, true);
  assert.ok(other.boostT === 0 && other.boostPct === 0, `the other blocks stop firing faster (${other.boostT} s left)`);
});
