import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { LEVELS } from '../src/sim/levels.js';
import { bestDir } from '../src/autoplay.js';
import { V2 } from '../src/config.js';

/** Run `fn` with some V2 numbers changed, then put them back. */
function withV2(over, fn) {
  const saved = { ...V2 };
  Object.assign(V2, over);
  try {
    return fn();
  } finally {
    Object.assign(V2, saved);
  }
}

/** Up to `n` bot swipes, stepping between them (autoChoose settles the choices); `look` sees each swipe's events. */
function play(r, n, look = () => {}) {
  for (let i = 0; i < n; i++) {
    const d = bestDir(r);
    if (!d || !r.move(d)) break;
    look(r.drainEvents());
    r.step();
  }
}

const singlesPerElement = (tiles) => {
  const n = {};
  for (const t of tiles) if (t.cls.element && !t.cls.fusion) n[t.cls.element] = (n[t.cls.element] ?? 0) + 1;
  return n;
};

test('new blocks: elemental eggs of deck elements that have no single on the board, never two singles of one element', () => {
  const deck = ['fire', 'ice', 'earth'];
  const r = createRun({ seed: 7, empty: true, levels: false, autoChoose: true, dice: deck });
  r.addCoins(1e5);
  r.spawnDebug(1, 0, 0);
  r.spawnDebug(1, 1, 0);
  let spawns = 0;
  let eggs = 0;
  play(r, 400, (events) => {
    const free = new Set(deck);
    for (const e of events) {
      if (e.type === 'spawn' && e.col != null) spawns += 1;
      if (e.type !== 'egg') continue;
      eggs += 1;
      assert.ok(free.has(e.element), `${e.element} comes from the deck`);
      assert.ok(e.tier < 4, 'an egg is below 16');
      const t = r.tiles.find((x) => x.id === e.tileId);
      assert.deepEqual(t.cls, { element: e.element });
      assert.deepEqual([e.x, e.y], [t.x, t.y]);
    }
    for (const [k, n] of Object.entries(singlesPerElement(r.tiles))) assert.equal(n, 1, `one single ${k} on the board`);
  });
  assert.ok(spawns > 100, `${spawns} spawns`);
  assert.ok(eggs >= 3 && eggs < spawns / 2, `${eggs} eggs in ${spawns} spawns`);
});

test('the egg roll has its own random stream: the new blocks’ values and cells do not change with V2.eggChance', () => {
  const spawnsWith = (eggChance) =>
    withV2({ eggChance }, () => {
      const r = createRun({ seed: 11, empty: true, levels: false, autoChoose: true, dice: ['fire', 'ice'] });
      r.addCoins(1e5);
      r.spawnDebug(2, 0, 0);
      const out = [];
      let eggs = 0;
      play(r, 120, (events) => {
        for (const e of events) {
          if (e.type === 'spawn' && e.col != null) out.push([e.tier, e.col, e.row]);
          if (e.type === 'egg') eggs += 1;
        }
      });
      return { out, eggs };
    });
  const none = spawnsWith(0);
  const all = spawnsWith(1);
  assert.equal(none.eggs, 0);
  assert.ok(all.eggs > 5, 'every chance it gets');
  assert.ok(none.out.length > 60);
  assert.deepEqual(all.out, none.out);
});

test('no eggs while every deck element has a single on the board', () =>
  withV2({ eggChance: 1 }, () => {
    const r = createRun({ seed: 3, empty: true, levels: false, dice: ['fire', 'ice'] });
    r.spawnDebug(5, 0, 0).cls = { element: 'fire' };
    r.spawnDebug(6, 3, 3).cls = { element: 'ice' };
    r.drainEvents();
    assert.ok(r.move('right'));
    const ev = r.drainEvents();
    assert.ok(!ev.some((e) => e.type === 'egg'));
    const spawned = ev.find((e) => e.type === 'spawn');
    assert.deepEqual(r.tiles.find((t) => t.id === spawned.id).cls, {});
  }));

test('a fusion frees both its elements: the same swipe can spawn one of their eggs again', () =>
  withV2({ eggChance: 1 }, () => {
    const r = createRun({ seed: 3, empty: true, levels: false, dice: ['fire', 'ice'] });
    r.spawnDebug(5, 0, 0).cls = { element: 'fire' };
    r.spawnDebug(5, 1, 0).cls = { element: 'ice' };
    r.drainEvents();
    assert.ok(r.move('left'));
    assert.equal(r.pendingChoice?.kind, 'fusion');
    const egg = r.drainEvents().find((e) => e.type === 'egg');
    assert.ok(egg && ['fire', 'ice'].includes(egg.element));
  }));

test('a spawned 16 (top spawn levels) that rolls an element is a single pet at once: classed stage 1, no egg', () =>
  withV2({ eggChance: 1 }, () => {
    const saved = LEVELS.odds[0];
    LEVELS.odds[0] = [0, 0, 0, 100]; // every new block is a 16 (restored below)
    try {
      const r = createRun({ seed: 2, empty: true, dice: ['fire', 'ice'] });
      r.spawnDebug(1, 0, 0);
      r.spawnDebug(2, 3, 3);
      r.drainEvents();
      assert.ok(r.move('right'));
      const ev = r.drainEvents();
      const hatch = ev.find((e) => e.type === 'classed' && e.spawned);
      assert.equal(hatch?.stage, 1);
      const t = r.tiles.find((x) => x.id === hatch.tileId);
      assert.equal(t.tier, 4);
      assert.ok(['fire', 'ice'].includes(t.cls.element));
      assert.ok(!ev.some((e) => e.type === 'egg'));
    } finally {
      LEVELS.odds[0] = saved;
    }
  }));

test('a newly unlocked element spawns as eggs too', () =>
  withV2({ eggChance: 1 }, () => {
    const r = createRun({ seed: 11, empty: true, dice: ['fire'] });
    r.spawnDebug(8, 0, 0); // a 256: the level cap is 5
    r.addCoins(1e4);
    assert.ok(r.buyXp()); // level 2: a new element
    const pick = r.pendingChoice;
    assert.equal(pick?.kind, 'die');
    r.choose(0);
    const gained = pick.offers[0].element;
    assert.deepEqual(r.owned, ['fire', gained]);
    r.spawnDebug(5, 3, 3).cls = { element: 'fire' }; // fire has its single: only the new element is free
    r.drainEvents();
    assert.ok(r.move('left'));
    assert.equal(r.drainEvents().find((e) => e.type === 'egg')?.element, gained);
  }));
