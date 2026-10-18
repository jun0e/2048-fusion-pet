import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { roams } from '../src/sim/roam.js';
import { bestDir } from '../src/autoplay.js';
import { PHYSICS } from '../src/config.js';
import { recordRun, replayRun, fingerprint, loadSaved, SAVE_VERSION, RESUME_KEY } from '../src/ux/resume.js';

/**
 * A recorded bot run until a fusion's pet roams, then `after` more seconds; 3 s after the
 * pet hops out, the bot casts its skill (a namecard tap). Seed 7 has its first fusion at wave 7
 * (with the spawn levels; seed 2 had it at wave 6 before them).
 */
function playToRoam({ seed = 7, roaming = true, after = 30 } = {}) {
  const run = createRun({ seed, roaming });
  const log = recordRun(run);
  let t = 0;
  let next = 0;
  let fusionAt = null;
  let cast = false;
  for (let i = 0; i < 600 / PHYSICS.dt && !run.over; i++) {
    t += PHYSICS.dt;
    if (run.pendingChoice) run.choose(0);
    run.step();
    run.drainEvents();
    const fusion = run.tiles.find(roams);
    if (fusion && fusionAt == null) fusionAt = t;
    if (fusionAt != null && !cast && t > fusionAt + 3 && fusion) {
      run.castSkill(fusion.id, { radius: 2.8, mult: 5 });
      cast = true;
    }
    if (fusionAt != null && t > fusionAt + after) break;
    if (t >= next && run.coins >= run.swipeCost && !run.pendingChoice) {
      const d = bestDir(run);
      if (d) run.move(d);
      next = t + 0.5;
    }
    if ((run.phase === 'break' || run.phase === 'prep') && (run.coins < run.swipeCost || run.locked)) run.nextWave();
  }
  return { run, log, fusionAt, cast };
}

/** Everything a player can see, the pets' spots included. */
const state = (r) => ({
  fp: fingerprint(r),
  tiles: r.tiles.map((t) => [t.id, t.tier, Math.round(t.hp), JSON.stringify(t.cls), t.roam && [t.roam.x, t.roam.y, t.roam.hatch]]),
  enemies: r.enemies.filter((e) => !e.dead).map((e) => [e.type, e.lane, e.y.toFixed(4), Math.round(e.hp)]),
  coins: r.coins,
  kills: r.kills,
  time: r.time.toFixed(6),
});

test('pets roam only in a run made with roaming (tools and tests keep blocks in place)', { todo: 'v2 integration: rewrite for summons (v1 roaming is gone)' }, () => {
  const { run, fusionAt } = playToRoam({ roaming: false, after: 10 });
  assert.ok(fusionAt != null, 'the run reaches a fusion');
  assert.ok(run.tiles.some(roams) && !run.tiles.some((t) => t.roam), 'a fusion, and no pet out of its den');
});

test('a fusion run with roaming pets replays exactly, skill casts too', { todo: 'v2 integration: a run with summons replays exactly' }, () => {
  const { run, log, fusionAt, cast } = playToRoam();
  assert.ok(fusionAt != null && cast, 'a fusion roamed and cast its skill');
  assert.equal(log.roaming, true);
  assert.equal(log.inputs.filter((x) => x[1] === 'castSkill').length, 1, 'the cast is an input');
  const pet = run.tiles.find((t) => t.roam);
  assert.ok(pet && pet.roam.hatch === 1 && Math.hypot(pet.roam.x - pet.x, pet.roam.y - pet.y) > 1, 'the pet left its den');
  const copy = replayRun(createRun, JSON.parse(JSON.stringify(log)));
  assert.deepEqual(state(copy), state(run));
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
