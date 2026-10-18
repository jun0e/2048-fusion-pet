import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, maxHpFor } from '../src/sim/run.js';
import { ELEMENTS, buffWorth } from '../src/sim/classes.js';
import { ELEMENT_STATS } from '../src/sim/skills/data.js';
import { PHYSICS } from '../src/config.js';

const steps = (r, seconds) => {
  for (let i = 0; i < Math.round(seconds / PHYSICS.dt); i++) r.step();
};
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≈ ${b}`);
const run = () => createRun({ seed: 2, empty: true, levels: false, dice: ['fire', 'earth'] });
function block(r, tier, col, row, cls = {}) {
  const t = r.spawnDebug(tier, col, row);
  t.cls = structuredClone(cls);
  return t;
}

test('a pure pet gives every other block its aura (tile.aura); the aura goes with the pet', () => {
  const r = run();
  const pure = block(r, 12, 0, 0, { element: 'fire', pure: true });
  const pet = block(r, 5, 1, 0, { element: 'earth' });
  const plain = block(r, 2, 3, 3);
  r.step();
  assert.deepEqual(pet.aura, { fire: ELEMENT_STATS.fire.pure });
  assert.deepEqual(plain.aura, { fire: ELEMENT_STATS.fire.pure });
  assert.equal(pure.aura, null, 'not on itself');
  near(pet.prof.dmgMult, ELEMENTS.earth.dmg * (1 + ELEMENT_STATS.fire.pure));
  const other = block(r, 12, 2, 2, { element: 'fire', pure: true });
  r.step();
  near(pet.aura.fire, 2 * ELEMENT_STATS.fire.pure); // two pure pets add up
  assert.deepEqual(pure.aura, { fire: ELEMENT_STATS.fire.pure }, 'each takes the other’s');
  assert.ok(r.discard(other.id).ok);
  assert.ok(r.discard(pure.id).ok);
  assert.equal(pet.aura, null);
  assert.equal(plain.aura, null);
});

test('an earth aura raises every block’s max health, plain blocks too; a full block stays full; it lowers again when the aura goes', () => {
  const r = run();
  const earth = block(r, 12, 0, 0, { element: 'earth', pure: true });
  const plain = block(r, 2, 3, 3);
  const hurt = block(r, 4, 3, 2);
  hurt.hp = 100;
  r.step();
  assert.equal(plain.maxHp, Math.round(maxHpFor(2) * (1 + ELEMENT_STATS.earth.pure)));
  assert.equal(plain.hp, plain.maxHp);
  assert.equal(earth.maxHp, maxHpFor(12), 'not its own aura');
  assert.equal(hurt.hp, 100 + (hurt.maxHp - maxHpFor(4)), 'a hurt block gains the extra health, not a heal');
  assert.ok(r.discard(earth.id).ok);
  assert.equal(plain.maxHp, maxHpFor(2));
  assert.equal(plain.hp, plain.maxHp);
});

test('earth buffs raise a fusion’s max health; each wave refills it to the raised max', () => {
  const r = run();
  const f = block(r, 6, 0, 0, { element: 'fire', fusion: 'ice', buffs: { earth: 2 } });
  block(r, 1, 3, 3);
  r.step();
  const max = Math.round(maxHpFor(6) * (1 + buffWorth(2) * ELEMENT_STATS.earth.buff)); // the 2nd copy gives less (v2.1)
  assert.equal(f.maxHp, max);
  f.hp = 10;
  r.nextWave();
  assert.equal(f.hp, max);
});

test('regen heals a share of max health per second during waves (not in breaks); a fallen block stays down', () => {
  const r = run();
  block(r, 12, 0, 0, { element: 'nature', pure: true });
  const t = block(r, 4, 3, 3);
  r.step();
  t.hp = t.maxHp / 2;
  steps(r, 1);
  assert.equal(t.hp, t.maxHp / 2, 'nothing before the wave');
  r.nextWave(); // (refills every block)
  t.hp = t.maxHp / 2;
  const before = t.hp;
  steps(r, 1);
  near(t.hp - before, ELEMENT_STATS.nature.pure * t.maxHp, 1e-3);
  t.hp = 0;
  r.step();
  assert.ok(!r.tiles.includes(t), 'no regen brings a block back from 0');
});
