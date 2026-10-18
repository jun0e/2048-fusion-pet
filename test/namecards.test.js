// T18: every fusion gets a namecard (src/kv/namecards.js railSlots). The rail has four slots; from a
// fifth fusion on, the fourth is a stack whose face is the card to tap: a ready skill always comes
// to the front, and the face holds still while nothing changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railSlots } from '../src/kv/namecards.js';

const none = new Set();

test('up to four fusions: a slot each, no stack', () => {
  assert.deepEqual(railSlots([1, 2, 3, 4], none, null), { shown: [1, 2, 3, 4], stack: [], face: null });
  assert.deepEqual(railSlots([7], none, 3), { shown: [7], stack: [], face: null });
});

test('from a fifth on: three slots of their own, the rest stacked on the fourth', () => {
  const s = railSlots([1, 2, 3, 4, 5, 6], none, null);
  assert.deepEqual(s.shown, [1, 2, 3]);
  assert.deepEqual(s.stack, [4, 5, 6]);
  assert.equal(s.face, 4, 'nothing ready: the first');
});

test('a ready skill comes to the front of the stack, so every fusion can be cast', () => {
  const ids = [1, 2, 3, 4, 5, 6];
  assert.equal(railSlots(ids, new Set([6]), 4).face, 6, 'the first ready one');
  assert.deepEqual(railSlots(ids, new Set([6]), 4).stack, [6, 4, 5]);
  // the face while it is ready stays, even when another gets ready
  assert.equal(railSlots(ids, new Set([5, 6]), 5).face, 5);
  // cast (no longer ready): the next ready one comes up
  assert.equal(railSlots(ids, new Set([6]), 5).face, 6);
  // none ready: the face holds still (no flicker between charging cards)
  assert.equal(railSlots(ids, none, 5).face, 5);
  // a face that left the stack (merged away, or moved up to a slot of its own): the first
  assert.equal(railSlots(ids, none, 2).face, 4);
  assert.equal(railSlots(ids, none, 99).face, 4);
});

test('every fusion is on the rail: on a slot, or in the stack, exactly once', () => {
  for (let n = 0; n <= 12; n++) {
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    const s = railSlots(ids, new Set(ids.filter((i) => i % 3 === 0)), 5);
    assert.deepEqual([...s.shown, ...s.stack].sort((a, b) => a - b), ids, `${n} fusions`);
    assert.ok(s.shown.length <= 4 && (s.stack.length === 0 || s.shown.length === 3), `${n} fusions: at most four slots`);
  }
});

test('the rail’s order: the biggest first, the older between equals, so a swipe never reshuffles it', async () => {
  const { railOrder } = await import('../src/kv/namecards.js');
  const at = (id, tier) => ({ id, tier });
  // board order (where the blocks sit) changes with every swipe; the rail's does not
  const a = railOrder([at(9, 8), at(4, 8), at(7, 10), at(2, 8)]).map((t) => t.id);
  const b = railOrder([at(2, 8), at(7, 10), at(9, 8), at(4, 8)]).map((t) => t.id);
  assert.deepEqual(a, [7, 2, 4, 9]);
  assert.deepEqual(b, a);
});

test('a just-cast face holds the stack, so a quick second tap cannot cast the next card', async () => {
  const { railSlots } = await import('../src/kv/namecards.js');
  const ids = [1, 2, 3, 4, 5, 6];
  assert.equal(railSlots(ids, new Set([6]), 4, true).face, 4, 'held: the cast face stays');
  assert.equal(railSlots(ids, new Set([6]), 4, false).face, 6, 'then the ready one comes up');
});

test('the stack’s slide-in is a one-off animation, never a class rule that would hold off the ready bob, nudge and fall', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/kv/kv.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /stack-face/.test(m[1]));
  for (const m of rules) assert.ok(!/animation/.test(m[2]), `${m[1].trim()}: no animation on the face's class`);
  const js = readFileSync(new URL('../src/kv/namecards.js', import.meta.url), 'utf8');
  assert.match(js, /card\.el\.animate\?\.\(/);
});

test('a reorder moves the fewest cards: those outside the longest run already in order stay put', async () => {
  const { longestRun } = await import('../src/kv/namecards.js');
  // the rail wants [N, S1, S2, X, S3, Y]; the DOM holds [S1, S2, S3, X, Y, N] (DOM places 5, 0, 1, 3, 2, 4)
  const keep = longestRun([5, 0, 1, 3, 2, 4]);
  assert.equal(keep.size, 4, 'S1, S2, X (or S3), Y stay');
  assert.ok(keep.has(1) && keep.has(2) && keep.has(5), 'S1, S2 and Y never move');
  assert.ok(!keep.has(0), 'the new card N moves to the top');
  assert.deepEqual([...longestRun([0, 1, 2, 3])].sort(), [0, 1, 2, 3], 'in order: nothing moves');
  assert.equal(longestRun([]).size, 0);
});

test('the move list: the fewest cards, falling ones left where they hang', async () => {
  const { railMoves } = await import('../src/kv/namecards.js');
  const apply = (dom, order) => {
    const out = [...dom];
    for (const i of railMoves(dom.filter((x) => !x.startsWith('lost')), order)) {
      out.splice(out.indexOf(order[i]), 1);
      const next = order[i + 1];
      out.splice(next ? out.indexOf(next) : out.length, 0, order[i]);
    }
    return out;
  };
  // card 12 falls while a new fusion 20 comes in: 20 goes to the top, 12 is not moved mid-fall
  const after = apply(['11', 'lost12', '13', '20'], ['20', '11', '13']);
  assert.deepEqual(after.filter((x) => !x.startsWith('lost')), ['20', '11', '13']);
  assert.equal(railMoves(['11', '13', '20'], ['20', '11', '13']).length, 1, 'one move: the new card');
  assert.deepEqual(railMoves(['a', 'b', 'c'], ['a', 'b', 'c']), [], 'in order: nothing moves');
});

// --- v2 (docs/v2/SPEC.md section 7): a card per fusion pet at 1024+, its charge from the sim ---------

test('v2: a namecard for every fusion pet at 1024 and up, none for singles, plain blocks or a younger fusion', async () => {
  const { summoners } = await import('../src/kv/namecards.js');
  const t = (id, tier, cls) => ({ id, tier, cls });
  const tiles = [t(1, 12, { element: 'fire', fusion: 'ice', buffs: {}, pure: true }), t(2, 9, { element: 'ice', fusion: 'earth', buffs: {} }), t(3, 10, { element: 'metal', fusion: 'nature', buffs: {} }), t(4, 11, { element: 'wind' }), t(5, 11, {})];
  assert.deepEqual(
    summoners(tiles).map((x) => x.id),
    [1, 3],
    'the 4096 and the 1024 fusion, biggest first',
  );
});

test('v2: a card reads its state from the sim: charging, ready, then out with the time it has left', async () => {
  const { cardState, leftText } = await import('../src/kv/namecards.js');
  const tile = { id: 7, tier: 10, cls: { element: 'fire', fusion: 'ice', buffs: {} } };
  const run = (charge, ready) => ({ skillCharge: () => charge, skillReady: () => ready });
  assert.deepEqual(cardState(tile, run(0.25, false)), { state: 'charging', f: 0.25, left: 0 });
  assert.deepEqual(cardState(tile, run(1, true)), { state: 'ready', f: 1, left: 0 });
  assert.deepEqual(cardState(tile, {}), { state: 'charging', f: 0, left: 0 }, 'a run without summons yet charges nothing');
  const out = cardState({ ...tile, summon: { key: 'fire+ice', t: 6, dur: 8, phase: 'act', x: 0, y: 9 } }, run(0, false));
  assert.equal(out.state, 'out');
  assert.equal(out.left, 2);
  assert.equal(out.f, 0.25, 'the bar drains as its time runs out');
  assert.equal(leftText(2), '2s');
  assert.equal(leftText(1.2), '2s', 'whole seconds, rounded up');
  assert.equal(leftText(0.01), '1s', 'never 0 while the pet is still out');
});

test('v2: a tap casts only when the card is ready, as drawn and in the sim now; else it nudges', async () => {
  const { pressAction } = await import('../src/kv/namecards.js');
  const run = (ready) => ({ skillReady: () => ready });
  assert.equal(pressAction({ id: 3, state: 'ready', lost: false }, run(true)), 'cast');
  assert.equal(pressAction({ id: 3, state: 'charging', lost: false }, run(true)), 'nudge', 'drawn charging: no cast');
  assert.equal(pressAction({ id: 3, state: 'ready', lost: false }, run(false)), 'nudge', 'the sim moved on (already out, or a choice opened)');
  assert.equal(pressAction({ id: 3, state: 'out', lost: false }, run(false)), 'nudge');
  assert.equal(pressAction({ id: 3, state: 'ready', lost: true }, run(true)), 'nudge', 'a falling card');
  assert.equal(pressAction({ id: 3, state: 'ready', lost: false }, {}), 'cast', 'a run without skillReady: as drawn');
});

test('v2: one caster: the card hands the cast to its creator (src/kv/pets.js calls run.castSkill)', async () => {
  const { readFileSync } = await import('node:fs');
  const js = readFileSync(new URL('../src/kv/namecards.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); // the code, not its comments
  assert.match(js, /if \(pressAction\(card, getRun\(\)\) === 'nudge'\) return nudge\(\);[\s\S]{0,160}onCast\(card\);/, 'a ready tap calls onCast');
  assert.doesNotMatch(js, /castSkill\(/, 'a second castSkill would find the pet out, and pets.js would skip its beam');
  assert.doesNotMatch(js, /CHARGE|ultimate|APEX/, 'no charge of its own, no v1 legends');
});
