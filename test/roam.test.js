import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { roams } from '../src/sim/roam.js';
import { PHYSICS } from '../src/config.js';
import { loadSaved, SAVE_VERSION, RESUME_KEY, RESUME_INPUTS } from '../src/ux/resume.js';

// v2: a pet leaves its tile only on a summon (docs/v2/SPEC.md section 5). These need the v2 run (its
// skillReady); until the rules land on this branch they wait.
const V2_RUN = typeof createRun({ seed: 1, empty: true }).skillReady === 'function';

/** A scripted v2 run: a 1024 fusion and two plain blocks, waves on, the summon cast whenever it is ready. */
function summonRun(seed) {
  const run = createRun({ seed, autoChoose: true, empty: true });
  const f = run.spawnDebug(10, 1, 3);
  f.cls = { element: 'fire', fusion: 'ice', buffs: {} };
  f.prof = null;
  run.spawnDebug(6, 0, 3);
  run.spawnDebug(6, 2, 3);
  run.nextWave();
  let casts = 0;
  let out = 0;
  for (let i = 0; i < 45 / PHYSICS.dt && !run.over; i++) {
    run.step();
    for (const e of run.drainEvents()) if (e.type === 'petOut') out += 1;
    if (run.skillReady(f.id) && run.castSkill(f.id)) casts += 1;
    if (run.phase === 'break' || run.phase === 'prep') run.nextWave();
  }
  return { run, casts, out, f };
}

const summonState = (r) => ({
  tiles: r.tiles.map((t) => [t.id, t.tier, Math.round(t.hp), JSON.stringify(t.cls), t.summon && [t.summon.phase, t.summon.x.toFixed(4), t.summon.y.toFixed(4)]]),
  enemies: r.enemies.filter((e) => !e.dead).map((e) => [e.type, e.lane, e.y.toFixed(4), Math.round(e.hp)]),
  coins: r.coins,
  kills: r.kills,
  time: r.time.toFixed(6),
});

test('v2: a pet leaves its tile only when its summon is cast', { skip: !V2_RUN && 'the v2 run is not on this branch yet' }, () => {
  const run = createRun({ seed: 3, autoChoose: true, empty: true });
  const f = run.spawnDebug(10, 1, 3);
  f.cls = { element: 'ice', fusion: 'earth', buffs: {} };
  run.nextWave();
  for (let i = 0; i < 20 / PHYSICS.dt; i++) {
    run.step();
    run.drainEvents();
    assert.ok(!run.tiles.some(roams), 'nobody out without a cast');
    if (run.phase !== 'wave') run.nextWave();
  }
  assert.ok(run.skillReady(f.id), 'charged after its time of waves');
  assert.equal(run.castSkill(f.id), true);
  run.step();
  assert.ok(roams(f), 'out once cast');
});

test('v2: a run with summons plays the same every time (resume replays its inputs; castSkill is one)', { skip: !V2_RUN && 'the v2 run is not on this branch yet' }, () => {
  assert.ok(RESUME_INPUTS.includes('castSkill'), 'a cast is a recorded input');
  const a = summonRun(11);
  const b = summonRun(11);
  assert.ok(a.casts >= 1 && a.out === a.casts, `${a.casts} summons`);
  assert.deepEqual(summonState(a.run), summonState(b.run));
});

test('a save keeps whether its run roams; a bad flag is refused', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const log = { seed: 5, roaming: true, steps: 10, inputs: [] };
  storage.setItem(RESUME_KEY, JSON.stringify({ v: SAVE_VERSION, log, fp: 'x' }));
  assert.equal(loadSaved(storage).log.roaming, true);
  storage.setItem(RESUME_KEY, JSON.stringify({ v: SAVE_VERSION, log: { ...log, roaming: 'yes' }, fp: 'x' }));
  assert.equal(loadSaved(storage), null);
});
