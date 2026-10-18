// T21: readable element marks on tiles. One badge per tile in the collar spot, bottom right: an
// element's own, or on a fusion one split badge with both elements' symbols. v2 (docs/v2/SPEC.md
// section 7): an elemental egg wears its element's badge too; a plain block has none (from 16 its
// pebble tag sits in the spot instead: test/tile-looks.test.js). Big enough to read on a 360 px phone.
// The clearances (the numeral, a den's altar and paw prints) are in test/tiles.test.js, which runs over
// the same spots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAQUE, badgeSpots } from '../src/art/plaque.js';

const tile = (tier, cls = {}) => ({ id: 1, tier, cls });
const PHONE_CELL = 2 * 23.78; // px per cell on a 360 × 640 phone (the readability tests' U)
const drawn = (s) => 2.35 * s.r; // the generated badge is drawn 2.35 r wide

test('every tile shows at most one badge: none on a plain block, an element its own (an egg too), a fusion one split badge', () => {
  for (const tier of [1, 3, 4, 11]) assert.deepEqual(badgeSpots(tile(tier)), [], `a plain ${2 ** tier}: none`);
  const egg = badgeSpots(tile(2, { element: 'nature' }));
  assert.equal(egg.length, 1, 'an elemental egg wears its badge');
  assert.deepEqual([egg[0].el, egg[0].el2], ['nature', undefined]);
  const el = badgeSpots(tile(5, { element: 'fire' }));
  assert.equal(el.length, 1);
  assert.equal(el[0].el, 'fire');
  assert.equal(el[0].el2, undefined);
  for (const [tier, more] of [
    [3, {}],
    [4, {}],
    [10, {}],
    [12, { pure: true }],
  ]) {
    const fu = badgeSpots(tile(tier, { element: 'fire', fusion: 'ice', buffs: { lightning: 2 }, ...more }));
    assert.equal(fu.length, 1, `a fusion at ${2 ** tier}: one badge, not two`);
    assert.deepEqual([fu[0].el, fu[0].el2], ['fire', 'ice'], 'split: the element it attacks with first, then its partner');
  }
  const den = badgeSpots({ ...tile(10, { element: 'earth', fusion: 'wind', buffs: {} }), summon: { phase: 'act' } });
  assert.deepEqual([den.length, den[0].el2], [1, 'wind'], 'a den keeps its badge');
});

test('the badge reads on a phone: at least 15 px wide on a 360 px phone, in the same spot on every tile', () => {
  const spots = [badgeSpots(tile(2, { element: 'ice' }))[0], badgeSpots(tile(4, { element: 'ice' }))[0], badgeSpots(tile(9, { element: 'earth', fusion: 'wind' }))[0]];
  for (const s of spots) {
    assert.ok(drawn(s) * PHONE_CELL >= 15, `${(drawn(s) * PHONE_CELL).toFixed(1)} px`);
    assert.ok(drawn(s) * PHONE_CELL > 2.35 * 0.10625 * PHONE_CELL * 1.2, 'at least a fifth bigger than the old 12 px badge');
    assert.ok(Math.abs(s.x - PLAQUE.badgeAt) < 1e-9 && Math.abs(s.y - PLAQUE.badgeAt) < 1e-9, 'the collar spot, bottom right');
    // it may hang over the plaque's rim like a tag, but stays clear of the next tile's pit
    assert.ok(s.x + drawn(s) / 2 < 1 - PLAQUE.pit / 2 - 0.03, 'clear of the next pit');
  }
});
