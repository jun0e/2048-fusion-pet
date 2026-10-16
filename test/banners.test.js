import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBannerQueue, bannerTimes, BANNER } from '../src/ux/banners.js';
import { pageBanner, pageSeconds } from '../src/ui/hud.js';

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


test('the ribbon turns every page of a long banner before the next news takes its place', () => {
  // the HUD's ribbon (src/ui/hud.js): a banner's pages share its reading time; the queue gives way to
  // the next banner after that time. Played out at a 360 px phone's line (282 px).
  const measure = (text, part) => text.length * (part === 'title' ? 9 : 7);
  const news = [
    { title: 'Board locked!', sub: 'No swipe can move a block until one is destroyed or boss x2s make a pair.' },
    { title: 'New die: Lightning', sub: 'Added to your deck: blocks reaching 16 can now roll it.' },
    { title: 'Elf Ruler defeated!', sub: 'Your blocks got 8 x2s. Merge the new pairs!' },
  ];
  for (const long of news) {
    let on = null; // { item, pages, per, t }
    const q = createBannerQueue({
      show: (b) => {
        const pages = pageBanner(b.title, b.sub, 282, measure);
        on = { item: b, pages, per: pageSeconds(b, pages.length), t: 0 };
      },
    });
    q.push(long);
    q.push({ title: 'Wave 4', sub: 'Eternal Forest · 9 foes' });
    const seen = new Map(); // page → seconds on screen
    for (let i = 0; i < 200 && on?.item.title !== 'Wave 4'; i++) {
      q.update(0.05);
      if (on.item.title === 'Wave 4') break;
      const at = Math.min(on.pages.length - 1, Math.floor(on.t / on.per));
      seen.set(at, (seen.get(at) ?? 0) + 0.05);
      on.t += 0.05;
    }
    assert.ok(on.pages, 'it paged');
    const pages = pageBanner(long.title, long.sub, 282, measure);
    assert.ok(pages.length >= 2, `"${long.title}" needs pages at 282 px`);
    for (let k = 0; k < pages.length; k++) assert.ok((seen.get(k) ?? 0) >= 1, `"${long.title}" page ${k + 1}/${pages.length} showed ${(seen.get(k) ?? 0).toFixed(2)} s`);
    assert.ok(pageSeconds(long, pages.length) * pages.length <= bannerTimes(long).min, 'all its pages fit its reading time');
  }
});
