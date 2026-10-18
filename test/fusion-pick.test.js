import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { FUSIONS } from '../src/sim/classes.js';
import { recordRun, replayRun, fingerprint } from '../src/ux/resume.js';

const DECK = ['fire', 'ice', 'lightning', 'metal'];
const run = (opts = {}) => createRun({ seed: 1, empty: true, levels: false, dice: DECK, ...opts });
/** A block with a class, at (col, row). */
function block(r, tier, col, row, cls = {}) {
  const t = r.spawnDebug(tier, col, row);
  t.cls = structuredClone(cls);
  return t;
}
const fusion = (element, second, buffs = {}) => ({ element, fusion: second, buffs });
/** Only `keep` stays on the board (the swipe's random new block goes). */
const clearBut = (r, keep) => {
  for (const t of r.tiles) if (t !== keep) r.grid.remove(t);
  r.drainEvents();
};

test('two single pets of different elements: a fusion choice; the block holds offer 0 (the mover main) until the pick', () => {
  const r = run();
  block(r, 5, 0, 0, { element: 'fire' });
  block(r, 5, 1, 0, { element: 'ice' });
  r.drainEvents();
  assert.ok(r.move('left')); // the ice pet slides into the fire pet
  const ev = r.drainEvents();
  const c = r.pendingChoice;
  assert.equal(c.kind, 'fusion');
  assert.equal(c.tier, 6);
  assert.deepEqual(c.parts, [
    { element: 'ice', tier: 5 },
    { element: 'fire', tier: 5 },
  ]);
  assert.deepEqual(
    c.offers.map((o) => [o.element, o.fusion, o.name]),
    [
      ['ice', 'fire', FUSIONS['fire+ice'].name],
      ['fire', 'ice', FUSIONS['fire+ice'].name],
    ],
  );
  assert.ok(ev.some((e) => e.type === 'choice' && e.kind === 'fusion' && e.tileId === c.tileId));
  assert.ok(!ev.some((e) => e.type === 'classed'), 'announced once picked');
  const t = r.tiles.find((x) => x.id === c.tileId);
  assert.deepEqual(t.cls, fusion('ice', 'fire'));
  assert.equal(r.move('right'), false, 'the game waits for the pick');
  const time = r.time;
  r.step();
  assert.equal(r.time, time, 'paused');

  assert.ok(r.choose(1));
  assert.deepEqual(t.cls, fusion('fire', 'ice'));
  const classed = r.drainEvents().filter((e) => e.type === 'classed');
  assert.equal(classed.length, 1);
  assert.deepEqual([classed[0].stage, classed[0].chosen, classed[0].tileId, classed[0].info.name], [2, true, t.id, 'Frostnova']);
  assert.equal(r.pendingChoice, null);
});

test('a single fed into a fusion (either way): one buff of its element, a buffed event, no choice', () => {
  const r = run();
  block(r, 6, 0, 0, fusion('fire', 'ice', { metal: 1 }));
  block(r, 6, 1, 0, { element: 'metal' });
  r.drainEvents();
  assert.ok(r.move('left'));
  assert.equal(r.pendingChoice, null);
  const t = r.grid.at(0, 0);
  assert.deepEqual(t.cls, fusion('fire', 'ice', { metal: 2 }));
  const b = r.drainEvents().find((e) => e.type === 'buffed');
  assert.deepEqual(b, { type: 'buffed', tileId: t.id, gain: { metal: 1 }, buffs: { metal: 2 }, x: t.x, y: t.y, tier: 7 });

  const other = run();
  block(other, 6, 0, 0, { element: 'lightning' });
  block(other, 6, 1, 0, fusion('fire', 'ice'));
  assert.ok(other.move('left')); // the fusion slides into the single
  assert.deepEqual(other.grid.at(0, 0).cls, fusion('fire', 'ice', { lightning: 1 }));
});

test('two fusions: a keep choice; the kept one gains the other’s two elements and all its buffs (buffed once chosen)', () => {
  const r = run();
  block(r, 8, 0, 0, fusion('fire', 'ice', { metal: 1 }));
  block(r, 8, 1, 0, fusion('lightning', 'metal'));
  r.drainEvents();
  assert.ok(r.move('left')); // Railgun slides into Frostnova
  const c = r.pendingChoice;
  assert.equal(c.kind, 'keep');
  assert.deepEqual(
    c.offers.map((o) => [o.cls.element, o.cls.fusion]),
    [
      ['lightning', 'metal'],
      ['fire', 'ice'],
    ],
  );
  assert.deepEqual(c.parts.map((p) => p.cls), [fusion('lightning', 'metal'), fusion('fire', 'ice', { metal: 1 })]);
  const t = r.tiles.find((x) => x.id === c.tileId);
  assert.deepEqual(t.cls, c.offers[0].cls, 'it holds the mover’s until the pick');
  assert.ok(!r.drainEvents().some((e) => e.type === 'buffed' || e.type === 'classed'));
  assert.ok(r.choose(1));
  assert.deepEqual(t.cls, fusion('fire', 'ice', { metal: 2, lightning: 1 }));
  const b = r.drainEvents().find((e) => e.type === 'buffed');
  assert.deepEqual([b.tileId, b.gain, b.buffs], [t.id, { lightning: 1, metal: 1 }, { metal: 2, lightning: 1 }]);
});

test('autoChoose (and the bot) take offer 0: the mover’s', () => {
  const r = run({ autoChoose: true });
  block(r, 5, 0, 0, { element: 'fire' });
  block(r, 5, 1, 0, { element: 'ice' });
  assert.ok(r.move('left'));
  r.step();
  assert.deepEqual(r.grid.at(0, 0).cls, fusion('ice', 'fire'));
  assert.equal(r.pendingChoice, null);
});

test('eggs fuse below 16 with the same choice; a fusion egg hatches at 16 as its fusion', () => {
  const r = run();
  block(r, 2, 0, 0, { element: 'fire' });
  block(r, 2, 1, 0, { element: 'metal' });
  assert.ok(r.move('left'));
  assert.equal(r.pendingChoice?.kind, 'fusion');
  r.choose(0);
  const egg = r.grid.at(0, 0);
  assert.deepEqual([egg.tier, egg.cls], [3, fusion('metal', 'fire')]);
  clearBut(r, egg);
  block(r, 3, 1, 0);
  assert.ok(r.move('left'));
  const hatch = r.drainEvents().filter((e) => e.type === 'classed');
  assert.deepEqual(
    hatch.map((e) => [e.stage, e.info.name]),
    [[1, FUSIONS['fire+metal'].name]],
  );

  // two 8-eggs: one choice, then the fusion news only (it hatched as a fusion pet)
  const two = run();
  block(two, 3, 0, 0, { element: 'ice' });
  block(two, 3, 1, 0, { element: 'lightning' });
  assert.ok(two.move('left'));
  two.drainEvents();
  two.choose(0);
  assert.deepEqual(
    two.drainEvents().filter((e) => e.type === 'classed').map((e) => e.stage),
    [2],
  );
});

test('a merge that reaches 4096 announces the pure form: at once, or after its choice', () => {
  const r = run();
  block(r, 11, 0, 0, { element: 'fire' });
  block(r, 11, 1, 0, { element: 'ice' });
  assert.ok(r.move('left'));
  r.drainEvents();
  r.choose(1); // fire main
  const t = r.grid.at(0, 0);
  assert.deepEqual(t.cls, { ...fusion('fire', 'ice'), pure: true });
  assert.deepEqual(
    r.drainEvents().filter((e) => e.type === 'classed').map((e) => [e.stage, e.info.name]),
    [
      [2, 'Frostnova'],
      [3, 'Pure Fire'],
    ],
  );

  const kept = run();
  block(kept, 11, 0, 0, fusion('fire', 'ice'));
  block(kept, 11, 1, 0, fusion('lightning', 'metal'));
  assert.ok(kept.move('left'));
  kept.drainEvents();
  kept.choose(0);
  assert.deepEqual(
    kept.drainEvents().filter((e) => ['buffed', 'classed'].includes(e.type)).map((e) => e.type + (e.stage ?? '')),
    ['buffed', 'classed3'],
  );
  assert.equal(kept.grid.at(0, 0).cls.pure, true);

  const single = run();
  block(single, 11, 0, 0, { element: 'nature' });
  block(single, 11, 1, 0);
  assert.ok(single.move('left'));
  const ev = single.drainEvents().find((e) => e.type === 'classed');
  assert.deepEqual([ev.stage, ev.info.name], [3, 'Pure Nature']);
  assert.equal(single.pendingChoice, null);
});

test('a run with fusion and keep choices saves and replays exactly', () => {
  const setup = (r) => {
    r.addCoins(1e4);
    block(r, 5, 0, 0, { element: 'fire' });
    block(r, 5, 1, 0, { element: 'ice' });
    block(r, 6, 2, 3, fusion('lightning', 'metal'));
    return r;
  };
  const r = setup(run());
  const log = recordRun(r);
  assert.ok(r.move('left'));
  r.choose(1);
  let chosen = 1;
  for (let i = 0; i < 60; i++) {
    ['down', 'left', 'right', 'up'].some((d) => r.move(d));
    while (r.pendingChoice) {
      r.choose(1);
      chosen += 1;
    }
    r.step();
  }
  assert.ok(chosen >= 1);
  const copy = replayRun((opts) => setup(createRun({ ...opts, empty: true, levels: false, dice: DECK })), JSON.parse(JSON.stringify(log)));
  assert.equal(fingerprint(copy), fingerprint(r));
  assert.deepEqual(
    copy.tiles.map((t) => t.cls),
    r.tiles.map((t) => t.cls),
  );
});
