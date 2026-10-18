import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSpeed } from '../src/ux/speed.js';
import { createPause } from '../src/ux/pause.js';
import { fightLabel, meterState, pageBanner, statusKey } from '../src/ui/hud.js';

// a stand-in for the ribbon's fonts: Baloo titles, Nunito lines
const measure = (text, part) => text.length * (part === 'title' ? 9 : 7);

test('speed cycles x1, x2 (and x4 once unlocked)', () => {
  assert.equal(nextSpeed(1, 2), 2);
  assert.equal(nextSpeed(2, 2), 1);
  assert.equal(nextSpeed(2, 4), 4);
  assert.equal(nextSpeed(4, 4), 1);
  assert.equal(nextSpeed(4, 2), 1, 'a speed no longer allowed goes back to x1');
});

test('pause menu: pages, one step back at a time', () => {
  const seen = [];
  const p = createPause({ onChange: (s) => seen.push(`${s.menu}:${s.paused}`) });
  assert.equal(p.paused, false);
  p.back(); // Escape with the menu closed opens it
  assert.equal(p.menu, 'main');
  p.show('confirm'); // Restart run?
  p.back(); // Escape steps back to the menu, it does not resume
  assert.equal(p.menu, 'main');
  p.show('settings');
  p.back();
  p.show('help'); // How to play over the menu
  assert.equal(p.paused, true, 'still paused while reading the rules');
  p.back();
  assert.equal(p.menu, 'main');
  p.back();
  assert.equal(p.menu, 'closed');
  assert.equal(p.paused, false);
  assert.deepEqual(seen, ['main:true', 'confirm:true', 'main:true', 'settings:true', 'main:true', 'help:true', 'main:true', 'closed:false']);
});

test('pause reasons add up: a sideways phone keeps the game paused after the menu closes', () => {
  const p = createPause();
  p.hold('rotate', true);
  p.show('main');
  p.show('closed');
  assert.equal(p.paused, true);
  p.hold('rotate', false);
  assert.equal(p.paused, false);
  p.show('nope');
  assert.equal(p.menu, 'closed', 'unknown pages are ignored');
});


test('the news ribbon shares a long line evenly between its pages: no lone-word page', () => {
  const lines = [
    'Added to your deck: blocks reaching 16 can now roll it.',
    'No swipe can move a block until one is destroyed or boss x2s make a pair.',
    'Your blocks got 8 x2s. Merge the new pairs!',
  ];
  for (const sub of lines) {
    const words = sub.split(' ');
    for (let width = 120; width <= 420; width += 7) {
      const pages = pageBanner('Title', sub, width, measure);
      if (pages.length === 1) continue;
      assert.deepEqual(pages[0], { title: 'Title', sub: '' }, 'the title has its own page');
      const subs = pages.slice(1).map((p) => p.sub);
      assert.equal(subs.join(' '), sub, `${width}: no word lost`);
      for (const line of subs) assert.ok(measure(line, 'sub') <= width, `${width}: "${line}" fits`);
      // as few pages as the greedy fill would make, with the words shared out
      let greedy = 1;
      let line = '';
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (line && measure(next, 'sub') > width) {
          greedy += 1;
          line = w;
        } else line = next;
      }
      assert.equal(subs.length, greedy, `${width}: no extra page`);
      if (words.length >= 2 * subs.length) for (const line of subs) assert.ok(line.split(' ').length >= 2, `${width}: "${line}" is not a lone word`);
      const widths = subs.map((l) => measure(l, 'sub'));
      assert.ok(Math.min(...widths) >= Math.max(...widths) * 0.4, `${width}: pages are balanced (${widths.join(', ')})`);
    }
  }
  // the review's case: "roll it." no longer ends the banner alone
  const pages = pageBanner('New die: Lightning', lines[0], 340, measure);
  assert.deepEqual(
    pages.map((p) => p.sub),
    ['', 'Added to your deck: blocks', 'reaching 16 can now roll it.'],
  );
});

test("the lintel's key changes with the boss's health, so its description never goes stale", () => {
  const base = { wave: 10, phase: 'wave', timer: 0, left: 7, blocks: 9, boss: 'elfRuler', bestWave: 12 };
  const at = (bossHp) => statusKey(base, meterState({ ...base, total: 9, bossHp }));
  assert.notEqual(at(0.6), at(0.59), 'a hit on the boss (no foe count change) re-renders the meter');
  assert.equal(at(0.6), at(0.6001), 'the same whole percent: nothing to write');
  assert.match(meterState({ ...base, total: 9, bossHp: 0.59 }).say, /59% health/);
  // the countdown changes the key once a second, not every frame
  const brk = { wave: 3, phase: 'break', left: 9, blocks: 5 };
  assert.equal(statusKey({ ...brk, timer: 11.9 }, meterState({ ...brk, timer: 11.9 })), statusKey({ ...brk, timer: 11.2 }, meterState({ ...brk, timer: 11.2 })));
  assert.notEqual(statusKey({ ...brk, timer: 11.9 }, meterState({ ...brk, timer: 11.9 })), statusKey({ ...brk, timer: 10.9 }, meterState({ ...brk, timer: 10.9 })));
});

test("Wave now's label: the wave's number and the countdown in their own spans, none while held", () => {
  assert.equal(fightLabel({ wave: 7, timer: 11.2 }), 'Wave <span class="fight-n">7</span> now ▶<span class="fight-t"> 12</span>');
  assert.equal(fightLabel({ wave: 5, boss: 'elfRuler', timer: 3 }), 'Boss now ▶<span class="fight-t"> 3</span>');
  assert.equal(fightLabel({ wave: 1, timer: 15, holding: true }), 'Wave <span class="fight-n">1</span> now ▶', 'the held opening shows no frozen number');
  // what a narrow phone shows once the number's span is hidden: the coach's own words, "Wave now"
  // (the spaces either side of the hidden number collapse into one, as the browser lays text out)
  const narrow = fightLabel({ wave: 23, timer: 20 }).replace(/<span class="fight-n">[^<]*<\/span>/, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  assert.equal(narrow, 'Wave now ▶ 20');
});
