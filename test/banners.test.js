import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBannerQueue, BANNER } from '../src/ux/banners.js';

/** A queue that records what it shows. */
function queue(opts = {}) {
  const shown = [];
  const q = createBannerQueue({ show: (b) => shown.push(b.title), ...opts });
  const tick = (s) => {
    for (let t = 0; t < s - 1e-9; t += 0.1) q.update(0.1);
  };
  return { q, shown, tick };
}

test('news in the same frame shows one banner after the other, none lost', () => {
  const { q, shown, tick } = queue();
  q.push({ title: 'Elf Ruler defeated!' });
  q.push({ title: 'Wave 10 cleared!' });
  q.update(0.016);
  assert.deepEqual(shown, ['Elf Ruler defeated!']);
  tick(BANNER.minSeconds - 0.2);
  assert.deepEqual(shown, ['Elf Ruler defeated!'], 'on screen long enough to read');
  tick(0.4);
  assert.deepEqual(shown, ['Elf Ruler defeated!', 'Wave 10 cleared!']);
});

test('news that comes later waits for the reading time of the banner on screen', () => {
  const { q, shown, tick } = queue();
  q.push({ title: 'Wave 3' });
  q.update(0.016);
  tick(0.5);
  q.push({ title: 'Board locked!' });
  q.update(0.016);
  assert.deepEqual(shown, ['Wave 3'], 'too soon: it waits');
  tick(BANNER.minSeconds);
  assert.deepEqual(shown, ['Wave 3', 'Board locked!']);
  tick(BANNER.seconds + 0.2);
  assert.equal(q.showing, null, 'alone, a banner plays out its full time, then goes');
});

test('a paused game holds the queue; a long queue keeps the newest news', () => {
  const { q, shown } = queue({ max: 2 });
  for (const title of ['a', 'b', 'c', 'd']) q.push({ title });
  assert.equal(q.waiting, 2);
  for (let i = 0; i < 100; i++) q.update(0); // paused
  assert.deepEqual(shown, ['c']);
  q.clear();
  assert.equal(q.showing, null);
  assert.equal(q.waiting, 0);
});
