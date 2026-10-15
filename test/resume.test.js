import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { createRng } from '../src/sim/rng.js';
import { recordRun, replayRun, restoreRun, fingerprint, saveRun, loadSaved, clearSaved, SAVE_VERSION, RESUME_KEY } from '../src/ux/resume.js';

/** Play a recorded run with random inputs for `seconds` of sim time. */
function play(seed, seconds) {
  const run = createRun({ seed });
  const log = recordRun(run);
  run.setHold(true);
  run.setGuidedWave(true);
  const rng = createRng(seed * 7 + 1);
  const dirs = ['left', 'right', 'up', 'down'];
  for (let i = 0; i < seconds * 60 && !run.over; i++) {
    if (i === 120) run.setHold(false);
    if (i % 25 === 0) run.move(dirs[Math.floor(rng.next() * 4)]);
    if (i % 400 === 0) run.nextWave();
    if (run.pendingChoice) run.choose(Math.floor(rng.next() * run.pendingChoice.offers.length));
    run.step();
    run.drainEvents();
  }
  return { run, log };
}

/** Everything a player can see about a run. */
const state = (r) => ({
  fp: fingerprint(r),
  tiles: r.tiles.map((t) => [t.id, t.tier, t.col, t.row, Math.round(t.hp), JSON.stringify(t.cls)]),
  enemies: r.enemies.filter((e) => !e.dead).map((e) => [e.type, e.lane, e.y.toFixed(4), Math.round(e.hp)]),
  coins: r.coins,
  time: r.time.toFixed(6),
  owned: r.owned.join(','),
});

test('a replayed log rebuilds the run exactly', () => {
  for (const seed of [3, 11, 42]) {
    const { run, log } = play(seed, 90);
    assert.ok(log.inputs.length > 50, 'a real run: many inputs');
    const copy = replayRun(createRun, JSON.parse(JSON.stringify(log)));
    assert.deepEqual(state(copy), state(run), `seed ${seed}`);
  }
});

test('a resumed run keeps recording, and a second resume still matches', () => {
  const { run, log } = play(5, 40);
  const again = replayRun(createRun, JSON.parse(JSON.stringify(log)));
  const log2 = recordRun(again, JSON.parse(JSON.stringify(log)));
  for (let i = 0; i < 600 && !again.over; i++) {
    if (i % 30 === 0) again.move(i % 60 ? 'left' : 'up');
    if (i === 300) again.nextWave();
    again.step();
    again.drainEvents();
  }
  const third = replayRun(createRun, JSON.parse(JSON.stringify(log2)));
  assert.deepEqual(state(third), state(again));
  assert.ok(log2.inputs.length > log.inputs.length);
  assert.ok(run, 'the first run stays as it was');
});

test('inputs that change nothing are not recorded; saves round-trip', () => {
  const run = createRun({ seed: 9 });
  const log = recordRun(run);
  run.nextWave(); // starts wave 1
  run.nextWave(); // a wave is on: refused, not recorded
  assert.equal(log.inputs.filter((x) => x[1] === 'nextWave').length, 1);
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  saveRun(run, log, storage);
  const saved = loadSaved(storage);
  assert.equal(saved.fp, fingerprint(run));
  assert.equal(saved.v, SAVE_VERSION);
  clearSaved(storage);
  assert.equal(loadSaved(storage), null);
  storage.setItem('siege:run', '{broken');
  assert.equal(loadSaved(storage), null, 'a broken save is ignored');
});

test('selling and breaking blocks replay exactly; a refused one is not recorded', () => {
  const { run, log } = play(7, 60);
  const discards = () => log.inputs.filter((x) => x[1] === 'discard').length;
  assert.equal(run.discard(-1).ok, false, 'no such block');
  assert.equal(discards(), 0, 'a refused sell is not recorded');
  const turret = run.tiles.find((t) => run.discardPrice(t.id).kind === 'sell');
  const dormant = run.tiles.find((t) => run.discardPrice(t.id).kind === 'break');
  assert.ok(turret && dormant, 'the board has a turret and a dormant block');
  assert.equal(run.discard(turret.id).ok, true);
  const broke = run.discard(dormant.id).ok; // it needs the coins; either way the replay must match
  assert.equal(discards(), broke ? 2 : 1);
  for (let i = 0; i < 300 && !run.over; i++) {
    if (i % 30 === 0) run.move(i % 60 ? 'left' : 'up');
    run.step();
    run.drainEvents();
  }
  const copy = replayRun(createRun, JSON.parse(JSON.stringify(log)));
  assert.deepEqual(state(copy), state(run));
});

/** A storage stand-in. */
function memory() {
  const store = new Map();
  return { store, getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
}

test('blocked storage: nothing is saved, and nothing throws', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError: storage is blocked');
    },
  });
  try {
    const run = createRun({ seed: 2 });
    const log = recordRun(run);
    assert.doesNotThrow(() => saveRun(run, log));
    assert.equal(loadSaved(), null);
    assert.doesNotThrow(() => clearSaved());
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
  }
});

test('a save this build cannot replay is refused, never thrown', (t) => {
  const warn = t.mock.method(console, 'warn', () => {}); // the refused replay below is logged
  const { run, log } = play(8, 20);
  const storage = memory();
  saveRun(run, log, storage);
  const good = JSON.parse(storage.getItem(RESUME_KEY));
  const put = (v) => storage.setItem(RESUME_KEY, JSON.stringify(v));
  put({ ...good, v: SAVE_VERSION + 1 });
  assert.equal(loadSaved(storage), null, 'another version');
  put({ ...good, log: { ...good.log, inputs: [[0, 'teleport']] } });
  assert.equal(loadSaved(storage), null, 'an input this build does not know');
  put({ ...good, log: { ...good.log, inputs: [[5, 'move', 'left'], [2, 'move', 'up']] } });
  assert.equal(loadSaved(storage), null, 'steps out of order');
  put({ ...good, log: { ...good.log, steps: 1e12 } });
  assert.equal(loadSaved(storage), null, 'a log far too long to replay');
  // restore: a replay that throws, or ends elsewhere than its fingerprint, gives no run
  assert.equal(restoreRun(() => { throw new Error('newer sim'); }, good), null);
  assert.equal(warn.mock.callCount(), 1, 'a replay that throws is logged');
  assert.equal(restoreRun(createRun, { ...good, fp: 'something else' }), null);
  assert.deepEqual(state(restoreRun(createRun, good)), state(run), 'a good save restores exactly');
});
