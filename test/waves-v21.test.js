import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { countFor, generateWave, resistShares, v2CountFor } from '../src/sim/enemies.js';
import { createRng } from '../src/sim/rng.js';
import { PHYSICS, V2_1, WAVES } from '../src/config.js';

test('waves keep growing in count (no cap), more on a bigger board, and a kill pays its share of v2’s wave coins', () => {
  for (let w = 1; w < 60; w++) assert.ok(countFor(w + 1) >= countFor(w), `wave ${w + 1}`);
  assert.ok(countFor(40) > 30, 'past v2’s cap of 30');
  assert.equal(countFor(20, 1.5), Math.round(countFor(20) * 1.5));
  const small = generateWave(30, createRng(5), { lanes: 4 });
  const big = generateWave(30, createRng(5), { lanes: 6, countMult: 1.5 });
  assert.ok(big.count > small.count);
  assert.ok(big.spawns.every((s) => s.lane < 6) && big.lanes.length === 6, 'all six lanes by wave 30');
  // its regular foes pay about v2's, shared by their bigger count (wave 30 is a boss wave: the boss pays its own)
  assert.ok(big.boss);
  assert.ok(Math.abs(big.coinScale * (big.count - 1) - Math.round(v2CountFor(30) * 0.6)) < 0.01, 'the regular foes pay about v2’s coins');
  const plainWave = generateWave(31, createRng(5), { lanes: 6, countMult: 1.5 });
  assert.ok(!plainWave.boss && Math.abs(plainWave.coinScale * plainWave.count - v2CountFor(31)) < 0.01);
});

test('resistances: none before wave 10, then a growing share against the top element (and the second from 20)', () => {
  assert.deepEqual(resistShares(9), { top: 0, second: 0, boss: false });
  assert.ok(resistShares(10).top > 0);
  assert.ok(resistShares(20).top > resistShares(12).top);
  assert.equal(resistShares(19).second, 0);
  assert.ok(resistShares(20).second > 0);
  assert.equal(resistShares(80).top, WAVES.resist.topMax);
  assert.equal(resistShares(15).boss, true);
  const plain = generateWave(25, createRng(3), {});
  assert.ok(plain.spawns.every((s) => s.resist === null), 'nothing to resist yet: no plan');
  const w = generateWave(25, createRng(3), { resist: { top: 'fire', second: 'ice' } });
  const share = w.spawns.filter((s) => !s.boss && s.resist?.fire).length / w.spawns.filter((s) => !s.boss).length;
  assert.ok(share > 0.1 && share < 0.9, `about ${resistShares(25).top} resist fire (${share})`);
  assert.ok(w.spawns.some((s) => s.resist?.ice), 'some resist the second');
  assert.ok(w.spawns.every((s) => !s.resist || Object.values(s.resist).every((v) => v === WAVES.resist.amount)));
  // the rest of the wave is the same with or without resistances
  assert.deepEqual(w.spawns.map((s) => [s.t, s.type, s.lane]), plain.spawns.map((s) => [s.t, s.type, s.lane]));
});

test('a resisting foe takes less from that element, says so, and the run tallies damage per element', () => {
  const r = createRun({ seed: 9, empty: true });
  const foe = r.defense.spawn('pixie', { hpScale: 1000, resist: { fire: 0.5 } });
  r.drainEvents();
  const hp = foe.hp;
  const dealt = r.defense.damage(foe, 100, ['fire'], { element: 'fire' });
  assert.equal(dealt, 50);
  assert.equal(foe.hp, hp - 50);
  assert.equal(r.defense.damage(foe, 100, ['ice'], { element: 'ice' }), 100, 'other elements in full');
  assert.equal(r.defense.damage(foe, 100, ['physical']), 100, 'a pebble is never resisted');
  assert.deepEqual(r.defense.dealtBy, { fire: 50, ice: 100 });
  r.step();
  assert.ok(r.drainEvents().some((e) => e.type === 'resisted' && e.element === 'fire' && e.id === foe.id));
});

test('the ramp: steep from 8 minutes, matching the board’s damage from 10, said once each', () => {
  const r = createRun({ seed: 2, empty: true, levels: false });
  r.spawnDebug(9, 0, 0);
  assert.equal(r.ramp.phase, 'curve');
  const seen = [];
  for (let i = 0; i < (10.2 * 60) / PHYSICS.dt; i++) {
    for (const e of r.enemies) if (!e.dead) r.defense.damage(e, 1e12, ['fire']); // the board holds: only the clock matters
    r.step();
    for (const e of r.drainEvents()) if (e.type === 'ramp') seen.push([e.phase, Math.round((r.time / 60) * 10) / 10]);
  }
  assert.deepEqual(seen, [
    ['steep', V2_1.ramp.steepAt],
    ['dps', V2_1.ramp.dpsAt],
  ]);
  assert.equal(r.ramp.phase, 'dps');
  assert.ok(r.dps > 0, 'the board’s firepower');
});

test('overtime: from 8 minutes, a wave that holds out does not hold back the next (no stalemate outlasts the ramp)', () => {
  const r = createRun({ seed: 2, empty: true, levels: false });
  r.spawnDebug(9, 0, 0);
  // the board holds until 8 minutes, then its foes can neither die nor bite
  for (let i = 0; i < (8 * 60) / PHYSICS.dt; i++) {
    for (const e of r.enemies) if (!e.dead) r.defense.damage(e, 1e12, ['fire']);
    r.step();
  }
  r.drainEvents();
  const wave = r.waveNo;
  const seen = [];
  for (let i = 0; i < (3 * 60) / PHYSICS.dt; i++) {
    for (const e of r.enemies) if (!e.dead) Object.assign(e, { hp: 1e15, maxHp: 1e15, atk: 0 });
    r.step();
    for (const e of r.drainEvents()) if (e.type === 'overtime' || (e.type === 'waveStart' && e.overtime)) seen.push(e.type);
  }
  assert.ok(r.waveNo > wave, `the next waves came anyway (wave ${wave} → ${r.waveNo})`);
  assert.equal(r.phase, 'wave', 'no break between them');
  assert.ok(seen.includes('overtime') && seen.includes('waveStart'));
  assert.ok(r.enemies.filter((e) => !e.dead).length > 0, 'the foes still out stay');
});
