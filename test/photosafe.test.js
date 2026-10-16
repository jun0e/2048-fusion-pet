import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS } from '../src/sim/classes.js';
import { FLASH, HIT_TINT, HURT_PULSE, POINT, SIGNATURE_TINT, createFlashGuard, createLightBudget, fitBoom, fitRing, isSaturatedRed, linear, luminance, ringLit, washAlpha, washLevel } from '../src/ux/photosafe.js';
import { createRng } from '../src/sim/rng.js';
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
  assert.ok(HIT_TINT.hold > 0);
});

test('local effects share a light budget: hundreds in a second never light a large area at once', () => {
  assert.ok(ringLit(0.4, 7.2) > POINT.large, "an old pet skill's ring alone was a large flash");
  const budget = createLightBudget();
  const rng = createRng(11);
  let peak = 0;
  let drawn = 0;
  for (let ms = 0; ms < 3000; ms++) {
    budget.tick(0.001);
    if (ms % 16 === 0 && ms < 2000) {
      for (let k = 0; k < 5; k++) {
        // a frame of a busy fight at x4: big rings and explosions, all asking at once
        const r = fitRing(budget, rng.next() * 0.8, 1 + rng.next() * 6, 0.2 + rng.next() * 0.4);
        if (r) assert.ok(r.r1 <= POINT.ringMax + 1e-9);
        const size = fitBoom(budget, 1 + rng.next() * 4, 0.36);
        assert.ok(size <= POINT.boomMax + 1e-9);
        // a lightning line, a particle burst and an enemy's hit flash, as fx.js books them
        const line = budget.book((2 + rng.next() * 10) * 0.34, 0.28, 0.2);
        const burst = budget.book(30 * 0.51 * 0.3 * 0.3, 0.6 * 1.2);
        const hit = budget.bookAll(0.25 * 1.5 * 1.5, 0.12);
        drawn += (r ? 1 : 0) + (size ? 1 : 0) + (line ? 1 : 0) + (burst ? 1 : 0) + (hit ? 1 : 0);
      }
    }
    peak = Math.max(peak, budget.used);
  }
  assert.ok(peak <= POINT.cap + 1e-3, `lit ${peak.toFixed(4)} at once (cap ${POINT.cap}; 0.001 for rounding)`);
  assert.ok(POINT.cap < POINT.large);
  assert.ok(drawn >= 20, `effects still drawn: ${drawn} of 3125 big asks`);
  assert.equal(budget.used, 0, 'the light comes back when the effects are over');
});

test('the real event stream at x4: one flash and one wash a second at most, washes below threshold, no blinking blocks', () => {
  const rows = audit({ seeds: 2, minutes: 6, stressSeconds: 60, speeds: [4] });
  const before = rows.find((r) => r.policy === 'before');
  const safe = rows.find((r) => r.policy === 'photosafe');
  assert.ok(before.large.perSecond > 3, `the old effects flashed ${before.large.perSecond} times in a second`);
  assert.ok(safe.above.flashPerSecond <= 1, `photosafe: ${safe.above.flashPerSecond} flashes above the thresholds in a second`);
  assert.ok(safe.large.perSecond <= 2, `photosafe: ${safe.large.perSecond} washes and flashes in a second (the limit is 3)`);
  assert.ok(safe.wash <= FLASH.wash);
  assert.ok(before.pointPeak > POINT.large, `the old rings and dots lit ${before.pointPeak.toFixed(0)} units² at once`);
  assert.equal(safe.point.pointPerSecond, 0, 'no large flash from rings and explosions');
  assert.ok(safe.pointPeak <= POINT.cap + 1e-3, `rings and explosions lit ${safe.pointPeak.toFixed(4)} units² at once`);
  assert.ok(safe.hit.hitPerSecond <= 3, `a block blinked ${safe.hit.hitPerSecond} times in a second`);
});

test('an effect that shows later books from then: the frames before its delay stay free, the ones after it fill', () => {
  const b = createLightBudget({ cap: POINT.cap });
  assert.equal(b.book(6, 0.25, 0, 0.3), 1, 'a crater laid where a meteor lands, 0.3 s from now');
  assert.equal(b.used, 0, 'nothing lit now');
  assert.equal(b.fit(9, 0.25), 1, 'the next 0.25 s are still free');
  assert.ok(b.fit(9, 0.25, 0, 0.3) < 0.5, 'its window is not');
  for (let t = 0; t < 0.31; t += 1 / 60) b.tick(1 / 60);
  assert.ok(Math.abs(b.used - 6) < 1e-9, 'it lights from its delay on');
  for (let t = 0; t < 0.3; t += 1 / 60) b.tick(1 / 60);
  assert.equal(b.used, 0, 'for its life only');
  assert.ok(Math.abs(b.peak - 6) < 1e-9, 'the most any frame held');
  // whole or not at all, from its delay
  const c = createLightBudget({ cap: POINT.cap });
  assert.equal(c.bookAll(8, 0.2, 0.5), true);
  assert.equal(c.bookAll(3, 0.2, 0.6), false, 'it would pass the cap where the two overlap');
  assert.equal(c.bookAll(3, 0.2, 0.75), true, 'after the first is over it fits');
  assert.ok(c.peak <= POINT.cap);
});

test('the audit books a hit flash as the game does: when a run of hits starts, then every FOE_FLASH.life of real time', async () => {
  const { createFoeFlashes } = await import('../tools/flash-audit.mjs');
  const { FOE_FLASH } = await import('../src/ux/photosafe.js');
  // a foe hit without pause for 0.5 s of sim time, then a pause, then hit again (sim steps of 1/60 s)
  const steps = (speed) => {
    const book = createFoeFlashes();
    const at = [];
    for (let i = 0; i <= 60; i++) {
      const sim = i / 60;
      const on = sim < 0.5 || sim >= 0.7;
      const p = book({ ids: on ? [1] : [], lits: on ? [0.9] : [] }, sim / speed);
      if (p) at.push(+(sim / speed).toFixed(4));
    }
    return at;
  };
  for (const speed of [1, 2, 4]) {
    const at = steps(speed);
    const step = 1 / 60 / speed; // a sim step in real time
    const run = at.filter((w) => w < 0.5 / speed);
    assert.equal(run[0], 0, `x${speed}: at once`);
    for (let i = 1; i < run.length; i++) {
      const gap = run[i] - run[i - 1];
      assert.ok(gap >= FOE_FLASH.life - 1e-3 && gap < FOE_FLASH.life + step + 1e-3, `x${speed}: booked again as the last runs out (${gap.toFixed(3)} s)`);
    }
    assert.ok(run.at(-1) + FOE_FLASH.life + step >= 0.5 / speed - 1e-3, `x${speed}: booked for the whole run of hits`);
    assert.ok(at.includes(+(0.7 / speed).toFixed(4)), `x${speed}: a new run of hits books at once`);
  }
  assert.ok(steps(1).filter((w) => w < 0.5).length > steps(4).filter((w) => w < 0.5 / 4).length, 'on real time: fewer at x4');
});
