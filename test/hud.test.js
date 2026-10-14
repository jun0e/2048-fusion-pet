import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSpeed } from '../src/ux/speed.js';
import { describeBlock } from '../src/ux/inspect.js';
import { createPause } from '../src/ux/pause.js';

test('speed cycles x1, x2 (and x4 once unlocked)', () => {
  assert.equal(nextSpeed(1, 2), 2);
  assert.equal(nextSpeed(2, 2), 1);
  assert.equal(nextSpeed(2, 4), 4);
  assert.equal(nextSpeed(4, 4), 1);
  assert.equal(nextSpeed(4, 2), 1, 'a speed no longer allowed goes back to x1');
});

test('inspect card: a sleeping block, an element, a fusion, an ultimate', () => {
  assert.match(describeBlock({ tier: 3, cls: {} }).text, /up to 16/);
  const fire = describeBlock({ tier: 5, cls: { element: 'fire' } });
  assert.equal(fire.value, 32);
  assert.equal(fire.name, 'Flame Burst');
  assert.equal(fire.kind, 'Fire');
  assert.equal(fire.progress, 'Border 1/4 · fusion at 256');
  const fusion = describeBlock({ tier: 9, cls: { element: 'fire', fusion: 'ice' } });
  assert.equal(fusion.kind, 'Fire + Ice');
  assert.equal(fusion.progress, 'Border 1/4 · ultimate at 4096');
  const ult = describeBlock({ tier: 12, cls: { element: 'fire', fusion: 'ice', ultimate: 'earth' } });
  assert.match(ult.name, /Meteor/);
  assert.equal(ult.progress, null);
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
