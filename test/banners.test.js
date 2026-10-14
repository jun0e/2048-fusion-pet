import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBannerQueue, bannerTimes, BANNER } from '../src/ux/banners.js';

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
  tick(bannerTimes({ title: 'Board locked!' }).full + 0.3);
  assert.equal(q.showing, null, 'alone, a banner plays out its full time, then goes');
});

test('a long banner stays long enough to read (4 words a second)', () => {
  const long = { title: 'Elf Ruler defeated!', sub: 'Your blocks got 8 x2s. Merge the new pairs!' };
  const t = bannerTimes(long);
  assert.equal(t.min, 0.4 + 12 / BANNER.wps);
  assert.ok(t.full > t.min);
  assert.deepEqual(bannerTimes({ title: 'Wave 3' }), { min: BANNER.minSeconds, full: Math.max(BANNER.seconds, BANNER.minSeconds + 0.6) });
  const shown = [];
  const q = createBannerQueue({ show: (b) => shown.push([b.title, b.seconds]) });
  q.push(long);
  q.push({ title: 'Wave 5 cleared!' });
  q.update(0.016);
  assert.equal(shown[0][1], t.full, 'the HUD gets the time for the animation');
  for (let i = 0; i < 30; i++) q.update(0.1); // 3 s: still reading
  assert.equal(shown.length, 1);
  for (let i = 0; i < 6; i++) q.update(0.1);
  assert.equal(shown.length, 2);
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
