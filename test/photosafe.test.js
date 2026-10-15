import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS } from '../src/sim/classes.js';
import { FLASH, FLASH_DOT, HIT_TINT, HURT_PULSE, SIGNATURE_TINT, createFlashGuard, isSaturatedRed, linear, luminance, washAlpha, washLevel } from '../src/ux/photosafe.js';
import { audit } from '../tools/flash-audit.mjs';

const hex = (c) => parseInt(String(c).replace('#', ''), 16);
// what a wash can lie over: black and white, the game's navy field and cream lanes, grey. The game has
// no large saturated-red area under a wash: the red edge pulse shares its budget (tested below).
const BACKGROUNDS = [0x000000, 0xffffff, 0x1c2547, 0xf3e3c3, 0x808080];
// every colour a wash takes: the signatures', and the pets' skills (their element colours)
const WASHES = [...Object.values(SIGNATURE_TINT), ...Object.values(ELEMENTS).map((e) => hex(e.color))];

/** The colour a wash of `color` at `alpha` makes over `bg`, in linear light. */
function mix(bg, color, alpha) {
  const b = linear(bg);
  const c = linear(color);
  return { r: b.r + (c.r - b.r) * alpha, g: b.g + (c.g - b.g) * alpha, b: b.b + (c.b - b.b) * alpha };
}
const lum = ({ r, g, b }) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const redValue = ({ r, g, b }) => (r - g - b) * 320;
const saturatedRed = ({ r, g, b }) => r + g + b > 0 && r / (r + g + b) >= 0.8;

test('saturated reds are told apart (ITU-R BT.1702: R / (R + G + B) ≥ 0.8 in linear light)', () => {
  assert.equal(isSaturatedRed(0xff0000), true);
  assert.equal(isSaturatedRed(SIGNATURE_TINT.globalBurn), true, "Sun's orange counts as red");
  assert.equal(isSaturatedRed(HURT_PULSE.color), true);
  assert.equal(isSaturatedRed(SIGNATURE_TINT.contagion), false);
  assert.equal(isSaturatedRed(0xffffff), false);
  assert.ok(Math.abs(luminance(0xffffff) - 1) < 1e-9 && luminance(0x000000) === 0);
});

test('every full-screen wash stays below the flash thresholds, over the game\'s backgrounds', () => {
  for (const color of WASHES) {
    const a = washAlpha(color);
    assert.ok(a <= FLASH.wash, `${color.toString(16)}: alpha ${a}`);
    for (const bg of BACKGROUNDS) {
      const before = linear(bg);
      const after = mix(bg, color, a);
      // a general flash: a luminance step of 0.1 or more
      assert.ok(Math.abs(lum(after) - lum(before)) < 0.1, `luminance step of ${color.toString(16)} over ${bg.toString(16)}`);
      // a red flash: a step to or from a saturated red with a red value step of 20 or more
      if (saturatedRed(before) || saturatedRed(after)) assert.ok(Math.abs(redValue(after) - redValue(before)) < 20, `red step of ${color.toString(16)} over ${bg.toString(16)}`);
    }
  }
});

test('a budget gives one a second of real time, however often it is asked', () => {
  const guard = createFlashGuard();
  const granted = [];
  for (let frame = 0; frame < 600; frame++) {
    const now = frame / 60;
    for (let k = 0; k < 3; k++) if (guard.take(now)) granted.push(now); // three effects ask every frame
  }
  assert.equal(granted.length, 10);
  for (let i = 1; i < granted.length; i++) assert.ok(granted[i] - granted[i - 1] >= FLASH.gap - 1e-9);
});

test('a wash fades in and out (no on/off step) and is over before the next may start', () => {
  const peak = FLASH.wash;
  let prev = 0;
  let top = 0;
  for (let t = 0; t <= FLASH.rise + FLASH.fall + 0.05; t += 1 / 60) {
    const a = washLevel(peak, t);
    assert.ok(Math.abs(a - prev) <= peak * 0.15, `step at ${t.toFixed(2)} s`);
    top = Math.max(top, a);
    prev = a;
  }
  assert.ok(top <= peak && top > peak * 0.9);
  assert.equal(washLevel(peak, FLASH.rise + FLASH.fall), 0);
  assert.ok(FLASH.rise + FLASH.fall < FLASH.gap, 'no two washes overlap');
  assert.ok(HURT_PULSE.seconds <= FLASH.gap, 'a wash never starts on top of the red edge pulse');
  assert.ok(FLASH_DOT.maxSize < 3 && HIT_TINT.hold > 0);
});

test('the real event stream at x4: one flash and one wash a second at most, washes below threshold, no blinking blocks', () => {
  const rows = audit({ seeds: 2, minutes: 6, stressSeconds: 60, speeds: [4] });
  const before = rows.find((r) => r.policy === 'before');
  const safe = rows.find((r) => r.policy === 'photosafe');
  assert.ok(before.large.perSecond > 3, `the old effects flashed ${before.large.perSecond} times in a second`);
  assert.ok(safe.above.flashPerSecond <= 1, `photosafe: ${safe.above.flashPerSecond} flashes above the thresholds in a second`);
  assert.ok(safe.large.perSecond <= 2, `photosafe: ${safe.large.perSecond} washes and flashes in a second (the limit is 3)`);
  assert.ok(safe.wash <= FLASH.wash && safe.pulse <= HURT_PULSE.alpha);
  assert.ok(safe.hit.hitPerSecond <= 3, `a block blinked ${safe.hit.hitPerSecond} times in a second`);
});
