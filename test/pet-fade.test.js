// T38 (2): a pet drawn over a foe fades so the foe shows through (src/kv/roam.js). Boxes are
// screen px { x0, x1, y0, y1 }; z is the depth the shared layer sorts by (bigger is drawn later).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PET_FADE, coverShare, petFadeTarget } from '../src/kv/roam.js';

const box = (cx, cy, w, h) => ({ x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 });

test('coverShare: how much of a foe a pet hides', () => {
  assert.equal(coverShare(box(0, 0, 100, 100), box(0, 0, 20, 20)), 1, 'all of it');
  assert.equal(coverShare(box(0, 0, 100, 100), box(200, 0, 20, 20)), 0, 'none of it');
  assert.ok(Math.abs(coverShare(box(0, 0, 20, 20), box(10, 0, 20, 20)) - 0.5) < 1e-9, 'half of it');
});

test('a pet fades over a foe it is drawn on top of, the pounce leap included; never over one in front of it', () => {
  const pet = { box: box(100, 100, 80, 80), z: 140 };
  const behind = { box: box(110, 90, 30, 30), z: 120 }; // drawn first: the pet covers it
  const front = { box: box(110, 90, 30, 30), z: 160 }; // lower on screen: drawn over the pet
  const far = { box: box(400, 90, 30, 30), z: 120 };
  const grazed = { box: box(100 + 40 + 15 - 4, 100, 30, 30), z: 120 }; // 4 of its 30 px under the pet's edge
  assert.equal(petFadeTarget(pet, [behind]), PET_FADE.alpha);
  assert.equal(petFadeTarget(pet, [front]), 1);
  assert.equal(petFadeTarget(pet, [far]), 1);
  assert.equal(petFadeTarget(pet, [grazed]), 1, 'a graze does not fade it');
  assert.equal(petFadeTarget(pet, [far, front, behind]), PET_FADE.alpha, 'any foe it covers');
  // mid-pounce the body is over its prey, whatever the depth of its feet says about the rest
  const leaping = { box: box(110, 60, 80, 80), z: 140 };
  assert.equal(petFadeTarget(leaping, [{ box: box(110, 50, 30, 30), z: 100 }]), PET_FADE.alpha);
  assert.ok(PET_FADE.alpha >= 0.5 && PET_FADE.alpha <= 0.6, 'about 55%');
});
