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
