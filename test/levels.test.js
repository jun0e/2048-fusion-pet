import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { LEVELS, LEVEL_ROAD, levelCap, rewardsAt, spawnOdds, spawnTable, xpNeeded } from '../src/sim/levels.js';
import { ECONOMY, PHYSICS, V2 } from '../src/config.js';
import { ELEMENT_KEYS } from '../src/sim/classes.js';

const stepUntil = (run, cond, maxSeconds = 120) => {
  for (let i = 0; i < maxSeconds / PHYSICS.dt && !cond(); i++) run.step();
  return cond();
};
/** Clear the wave at once: start it, then kill every foe as it comes (an element card is taken at once). */
function clearWave(r) {
  r.nextWave();
  return stepUntil(r, () => {
    while (r.pendingChoice) r.choose(0);
    for (const e of r.enemies) if (!e.dead) r.defense.damage(e, 1e9, ['fire']);
    return r.phase === 'break';
  });
}
/** Climb to `level` with debug XP, taking offer 0 of every card on the way. */
function climb(r, level) {
  for (let guard = 0; r.level < level && guard < 500; guard++) {
    while (r.pendingChoice) r.choose(0);
    r.addXp(r.xpNeed - r.xp);
  }
  while (r.pendingChoice) r.choose(0);
}

test('the road: 20 levels, about one every 30 s, with the rewards the plan lists (v2.1)', () => {
  assert.equal(LEVELS.max, 20);
  assert.equal(LEVEL_ROAD.length, 20);
  assert.equal(LEVELS.xpToNext.length, 19);
  LEVEL_ROAD.forEach((r, i) => assert.equal(r.level, i + 1));
  for (let i = 1; i < 20; i++) assert.ok(LEVEL_ROAD[i].minute > LEVEL_ROAD[i - 1].minute, `level ${i + 1} comes later`);
  assert.ok(LEVEL_ROAD[19].minute <= 10.5, 'the top level by about 10 minutes');
  const at = (kind) => LEVEL_ROAD.filter((r) => r.rewards.some((w) => w.kind === kind)).map((r) => r.level);
  assert.deepEqual(at('element'), [2, 4, 6, 8, 10, 13], 'six picks: the whole deck of 8 by level 13');
  assert.deepEqual(at('grow'), [11, 17]);
  assert.deepEqual(LEVEL_ROAD.flatMap((r) => r.rewards.filter((w) => w.kind === 'grow').map((w) => w.size)), [5, 6]);
  assert.ok(Math.abs(LEVEL_ROAD[10].minute - 4) < 0.5, '5×5 at about 4 minutes');
  assert.ok(Math.abs(LEVEL_ROAD[16].minute - 7) < 0.5, '6×6 at about 7 minutes');
  assert.deepEqual(at('charge'), [15, 19]);
  assert.deepEqual(at('top'), [20]);
  assert.deepEqual(rewardsAt(1), []);
  for (let l = 2; l <= 20; l++) assert.ok(rewardsAt(l).length, `level ${l} brings something`);
  for (let l = 1; l < 19; l++) assert.ok(xpNeeded(l + 1) >= xpNeeded(l), 'XP costs grow');
  assert.equal(xpNeeded(20), Infinity);
  assert.equal(levelCap(4), 20, 'v2.1: no cap from the top block');
});

test('the odds: classic 2048 at level 1; the road adds 8s, 16s and 32s, and drops 2s, 4s and 8s', () => {
  assert.deepEqual(spawnTable(1), [
    [1, 90],
    [2, 10],
  ]);
  const values = (level) => spawnTable(level).map(([tier]) => tier);
  for (const r of LEVEL_ROAD) {
    for (const w of r.rewards.filter((x) => x.kind === 'odds')) {
      for (const t of w.adds) assert.ok(values(r.level).includes(t) && !values(r.level - 1).includes(t), `level ${r.level} adds ${2 ** t}`);
      for (const t of w.drops) assert.ok(!values(r.level).includes(t) && values(r.level - 1).includes(t), `level ${r.level} drops ${2 ** t}`);
    }
  }
  assert.deepEqual(values(20), [4, 5], 'at the top, only 16s and 32s');
  // every level moves weight toward bigger blocks: the mean new value never falls
  const mean = (level) => {
    const t = spawnOdds(level);
    return t.reduce((s, o) => s + o.value * o.pct, 0) / 100;
  };
  for (let l = 2; l <= 20; l++) assert.ok(mean(l) >= mean(l - 1), `level ${l}: ${mean(l)} ≥ ${mean(l - 1)}`);
});

test('after the first 512, 2s stop spawning: the rest of the table shares their weight', () => {
  assert.deepEqual(spawnTable(1, 9), [[2, 10]]);
  assert.deepEqual(spawnOdds(1, 9), [{ tier: 2, value: 4, pct: 100 }]);
  assert.deepEqual(spawnTable(1, 8)[0], [1, 90]);
});

test('kills and cleared waves give XP; Buy XP is gone', () => {
  const r = createRun({ seed: 2, empty: true });
  r.spawnDebug(5, 0, 0);
  assert.equal(r.level, 1);
  assert.equal(r.xp, 0);
  assert.equal(r.buyXpPrice, null);
  assert.equal(r.buyXp(), false);
  assert.ok(clearWave(r));
  const ev = r.drainEvents();
  const kills = ev.filter((e) => e.type === 'kill').length;
  assert.ok(kills > 0);
  // the XP the wave gave: its kills and the clear, carried over the levels it reached
  let total = r.xp;
  for (let l = 1; l < r.level; l++) total += xpNeeded(l);
  assert.equal(total, kills * LEVELS.xp.kill + LEVELS.xp.waveClear);
  assert.ok(ev.some((e) => e.type === 'levelUp' && e.level === 2 && e.rewards.some((w) => w.kind === 'element')), 'level 2 brings a pick');
});

test('the first 512 says so once, and no 2 spawns after it', () => {
  const r = createRun({ seed: 21, empty: true });
  r.spawnDebug(9, 0, 0);
  r.addCoins(1e5);
  r.drainEvents();
  const spawned = [];
  let no2 = 0;
  for (let i = 0; i < 300; i++) {
    while (r.pendingChoice) r.choose(0);
    if (!['down', 'left', 'right', 'up'].some((d) => r.move(d))) break;
    for (const e of r.drainEvents()) {
      if (e.type === 'no2') no2 += 1;
      if (e.type === 'spawn' && e.col != null) spawned.push(e.tier);
    }
  }
  assert.equal(no2, 1);
  assert.equal(r.no2, true);
  assert.ok(spawned.length > 20);
  assert.ok(!spawned.includes(1), 'no 2 after the 512');
});

test('levels off keep the classic spawns (the showcase): nothing levels', () => {
  const r = createRun({ seed: 3, levels: false, autoChoose: true });
  assert.equal(r.levelsOn, false);
  r.addCoins(500);
  for (let i = 0; i < 40; i++) ['down', 'left', 'right', 'up'].some((d) => r.move(d));
  r.addXp(1000);
  assert.equal(r.level, 1);
  assert.equal(r.spawnLevel, 0);
  assert.equal(ECONOMY.startCoins > 0, true);
});

test('the element levels each offer a new element: a pick of 2 (1 when one is left); the other levels none', () => {
  assert.equal(V2.offers, 2);
  const r = createRun({ seed: 4, empty: true, dice: ['fire', 'ice'] });
  r.drainEvents();
  const seen = [];
  for (let guard = 0; r.level < LEVELS.max && guard < 100; guard++) {
    r.addXp(r.xpNeed - r.xp);
    const c = r.pendingChoice;
    if (!c) continue;
    assert.equal(c.kind, 'die');
    for (const o of c.offers) assert.ok(!r.owned.includes(o.element), `${o.element} is new`);
    seen.push([c.level, c.offers.length]);
    const ev = r.drainEvents();
    assert.ok(ev.some((e) => e.type === 'levelUp' && e.level === c.level));
    const pick = c.offers.at(-1).element;
    r.choose(c.offers.length - 1);
    assert.equal(r.owned.at(-1), pick);
    assert.ok(r.drainEvents().some((e) => e.type === 'dieGained' && e.element === pick && e.level === c.level));
  }
  assert.equal(r.level, LEVELS.max);
  assert.deepEqual(seen, [
    [2, 2],
    [4, 2],
    [6, 2],
    [8, 2],
    [10, 2],
    [13, 1],
  ]);
  assert.deepEqual([...r.owned].sort(), [...ELEMENT_KEYS].sort(), 'the whole deck by level 13');
});

test('a full deck is offered nothing; a run without spawn levels never unlocks an element', () => {
  const full = createRun({ seed: 4, empty: true, dice: ELEMENT_KEYS });
  climb(full, LEVELS.max);
  assert.equal(full.level, LEVELS.max);
  assert.equal(full.pendingChoice, null);

  const classic = createRun({ seed: 4, empty: true, levels: false, dice: ['fire'] });
  classic.spawnDebug(10, 0, 0);
  classic.step();
  assert.equal(classic.pendingChoice, null);
});

test('element picks that queue together never offer an element already owned', () => {
  const r = createRun({ seed: 8, empty: true, dice: ['fire', 'ice'] });
  r.addXp(LEVELS.xpToNext.slice(0, 7).reduce((a, b) => a + b, 0)); // level 1 → 8 at once
  assert.equal(r.level, 8);
  const picked = [];
  while (r.pendingChoice) {
    for (const o of r.pendingChoice.offers) assert.ok(!r.owned.includes(o.element), `${o.element} offered twice`);
    picked.push(r.pendingChoice.level);
    r.choose(0);
  }
  assert.deepEqual(picked, [2, 4, 6, 8]);
  assert.equal(new Set(r.owned).size, 6);
});

test('the board grows at levels 11 and 17: at once in a break, or when the wave is cleared', () => {
  const r = createRun({ seed: 6, empty: true, dice: ELEMENT_KEYS });
  r.spawnDebug(5, 0, 0);
  climb(r, 10);
  assert.equal(r.size, 4);
  r.drainEvents();
  r.addXp(r.xpNeed); // level 11 before wave 1: the board grows at once
  assert.equal(r.level, 11);
  assert.equal(r.size, 5);
  const grow = r.drainEvents().find((e) => e.type === 'grow');
  assert.deepEqual([grow.size, grow.from], [5, 4]);
  assert.deepEqual(r.road, LEVEL_ROAD);

  climb(r, 16);
  r.nextWave();
  r.step();
  assert.equal(r.phase, 'wave');
  r.addXp(r.xpNeed); // level 17 during a wave: it waits for the wave's end
  assert.equal(r.level, 17);
  assert.equal(r.size, 5, 'not with foes on the field');
  assert.ok(stepUntil(r, () => {
    for (const e of r.enemies) if (!e.dead) r.defense.damage(e, 1e9, ['fire']);
    return r.phase === 'break';
  }));
  assert.equal(r.size, 6, 'grown when the wave was cleared');
  assert.ok(r.drainEvents().some((e) => e.type === 'grow' && e.size === 6));
});

test('levels 15 and 19 charge summons 2 s faster each', () => {
  const r = createRun({ seed: 7, empty: true, dice: ELEMENT_KEYS });
  assert.equal(r.defense.chargeS, V2.summon.chargeS);
  climb(r, 15);
  assert.equal(r.defense.chargeS, V2.summon.chargeS - 2);
  climb(r, 19);
  assert.equal(r.defense.chargeS, V2.summon.chargeS - 4);
});
