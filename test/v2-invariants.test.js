import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, maxHpFor } from '../src/sim/run.js';
import { profileFor } from '../src/sim/classes.js';
import { ELEMENT_STATS } from '../src/sim/skills/data.js';
import { autoCast, bestDir } from '../src/autoplay.js';
import { PHYSICS, V2 } from '../src/config.js';

/** What must hold after every step of any run (no keepsake): the v2 rules' invariants. */
function checkBoard(r, where) {
  const singles = {};
  const pures = r.tiles.filter((t) => t.cls.pure);
  for (const t of r.tiles) {
    const c = t.cls;
    if (c.element && !c.fusion) {
      singles[c.element] = (singles[c.element] ?? 0) + 1;
      assert.equal(singles[c.element], 1, `${where}: one single ${c.element}`);
    }
    if (c.fusion) {
      assert.ok(c.element && c.element !== c.fusion, `${where}: a fusion has two elements`);
      assert.equal(typeof c.buffs, 'object', `${where}: a fusion has buffs`);
    }
    assert.equal(!!c.pure, !!c.element && t.tier >= V2.pureTier, `${where}: pure exactly from ${2 ** V2.pureTier} (tile ${t.id})`);
    const aura = {};
    for (const p of pures) if (p !== t) aura[p.cls.element] = (aura[p.cls.element] ?? 0) + ELEMENT_STATS[p.cls.element].pure;
    assert.deepEqual(t.aura ?? {}, aura, `${where}: tile ${t.id} has every other pure pet's aura`);
    assert.equal(t.maxHp, Math.round(maxHpFor(t.tier) * profileFor(t).hpMult), `${where}: max health follows hpMult`);
    assert.ok(t.hp > 0 && t.hp <= t.maxHp + 1e-9, `${where}: 0 < hp ${t.hp} <= ${t.maxHp}`);
  }
}

/** A bot game (the probe's way: a swipe every 0.5 s, Wave now when broke), checked after every step. */
function soak(r, minutes) {
  let next = 0;
  let checks = 0;
  const seen = { fusions: 0, buffs: 0, keeps: 0 };
  for (let i = 0; i < (minutes * 60) / PHYSICS.dt && !r.over; i++) {
    r.step();
    for (const e of r.drainEvents()) {
      if (e.type === 'classed' && e.stage === 2) seen.fusions += 1;
      if (e.type === 'buffed') seen.buffs += 1;
      if (e.type === 'choice' && e.kind === 'keep') seen.keeps += 1;
    }
    checkBoard(r, `seed ${r.seed} step ${i}`);
    checks += 1;
    if (r.time >= next && !r.pendingChoice) {
      const d = r.coins >= r.swipeCost ? bestDir(r) : null;
      if (d && r.move(d)) checkBoard(r, `seed ${r.seed} swipe at ${i}`);
      next = r.time + 0.5;
    }
    autoCast(r);
    if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
  }
  return { checks, ...seen };
}

test('bot games keep the v2 invariants at every step: one single per element, buffs, pure from 4096, auras, health', () => {
  const saved = V2.eggChance;
  V2.eggChance = 0.35; // plenty of eggs: fusions, buffs and keeps every few swipes (restored below)
  try {
    const totals = { checks: 0, fusions: 0, buffs: 0, keeps: 0 };
    for (const seed of [3, 17]) {
      const s = soak(createRun({ seed, autoChoose: true }), 5);
      for (const k of Object.keys(totals)) totals[k] += s[k];
    }
    // a pure nature pet from the start: auras, regen and max health through real waves
    const r = createRun({ seed: 29, autoChoose: true });
    const pure = r.spawnDebug(12, 0, 3);
    pure.cls = { element: 'nature', pure: true };
    r.step();
    const s = soak(r, 3);
    for (const k of Object.keys(totals)) totals[k] += s[k];
    assert.ok(totals.checks > 30000, `${totals.checks} steps checked`);
    assert.ok(totals.fusions >= 5 && totals.buffs >= 5 && totals.keeps >= 2, JSON.stringify(totals));
  } finally {
    V2.eggChance = saved;
  }
});
