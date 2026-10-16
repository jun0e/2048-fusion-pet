// Venom puddles (src/render/shots.js) book nothing in the light budget, so they must never make a
// flash on their own: a faint, splat-edged stain no wider than the sim's puddle, whose every tinted
// colour changes every ground it can lie on by less than PUDDLE.step (blended as WebGL blends: in
// gamma space), and whose rise and fall are more than a second apart at any game speed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { PUDDLE, linear, luminance, overlayStep, puddleAlpha, tinted } from '../src/ux/photosafe.js';
import { PUDDLE_GROUNDS, createShots, puddleLevel, puddlePeak } from '../src/render/shots.js';
import { PUDDLE_TEXELS, drawPuddle } from '../src/render/vfx-fallback.js';
import { CHAPTER_SKINS } from '../src/art/frame-kit.js';
import { attackClass } from '../src/art/attack-vfx.js';
import { ELEMENTS, FUSIONS } from '../src/sim/classes.js';

const hex = (c) => parseInt(String(c).replace('#', ''), 16);
/** Every tint a puddle can take: Venom Spit's own, every poison fusion's (an apex keeps its fusion's). */
const TINTS = [hex(ELEMENTS.poison.color), ...Object.values(FUSIONS).filter((f) => f.parts.includes('poison')).map((f) => hex(f.color))];

test('a normal-blend overlay changes luminance in gamma space: more than its alpha suggests for a dark tint on a light lane', () => {
  const lane = hex(CHAPTER_SKINS.forest.lane);
  const dark = 0x7a3fa8; // Nightshade
  const a = 0.2;
  const linearBlend = Math.abs(0.2126 * (linear(lane).r * (1 - a) + linear(dark).r * a) + 0.7152 * (linear(lane).g * (1 - a) + linear(dark).g * a) + 0.0722 * (linear(lane).b * (1 - a) + linear(dark).b * a) - luminance(lane));
  assert.ok(overlayStep(lane, dark, a) > linearBlend * 1.2, `gamma ${overlayStep(lane, dark, a).toFixed(3)} vs linear ${linearBlend.toFixed(3)}`);
  assert.equal(overlayStep(lane, dark, 0), 0);
  assert.equal(tinted(0xffffff, 0x7a3fa8), 0x7a3fa8);
  assert.equal(tinted(0x808080, 0xff0000), 0x800000);
});

test('a puddle stays under the threshold on every ground it can lie on, in every tint, at every alpha it fades through', () => {
  for (const s of Object.values(CHAPTER_SKINS)) assert.ok(PUDDLE_GROUNDS.includes(hex(s.lane)) && PUDDLE_GROUNDS.includes(hex(s.hedge)), 'each chapter’s lane and hedge');
  for (const tint of TINTS) {
    const peak = puddlePeak(tint);
    assert.ok(peak >= 0.05 && peak <= PUDDLE.alpha, `${tint.toString(16)}: alpha ${peak} (visible, and a stain, not a haze)`);
    for (let a = 0.005; a <= peak + 1e-9; a += 0.005) {
      for (const g of PUDDLE_GROUNDS) {
        for (const x of PUDDLE_TEXELS) {
          const step = overlayStep(g, tinted(x, tint), a);
          assert.ok(step < PUDDLE.step, `${tint.toString(16)} over ${g.toString(16)} at ${a.toFixed(3)}: ${(step * 100).toFixed(1)}%`);
        }
      }
    }
    assert.equal(puddleAlpha(tint, PUDDLE_TEXELS, PUDDLE_GROUNDS), peak);
  }
  // the class colour a puddle takes is the one shots.js tints it with
  assert.equal(attackClass([ELEMENTS.poison.color], 'poison').tint, TINTS[0]);
});

test('a puddle is no wider than the sim’s: its splat stays inside the radius it is drawn at', () => {
  let far = 0;
  const reach = (x, y, r = 0) => (far = Math.max(far, Math.hypot(x - 64, y - 64) + r));
  const g = new Proxy(
    {},
    {
      get: (o, k) => {
        if (k === 'arc') return (x, y, r) => reach(x, y, r);
        if (k === 'ellipse') return (x, y, rx, ry) => reach(x, y, Math.max(rx, ry));
        if (k === 'moveTo' || k === 'lineTo') return (x, y) => reach(x, y);
        if (k === 'quadraticCurveTo') return (cx, cy, x, y) => (reach(cx, cy), reach(x, y)); // a curve stays inside its control points
        if (k === 'bezierCurveTo') return (a, b, c, d, x, y) => (reach(a, b), reach(c, d), reach(x, y));
        return k in o ? o[k] : () => {};
      },
      set: (o, k, v) => ((o[k] = v), true),
    },
  );
  drawPuddle(g);
  assert.ok(far > 50 && far <= 64, `it reaches ${far.toFixed(1)} of 64`);
});

test('a puddle seeps in, holds over a second, then dries: never a flash pair, at x1, x2 or x4', () => {
  for (const speed of [1, 2, 4]) {
    for (const dur of [3, 5]) {
      // the sim's puddle lives `dur` sim seconds; the stain follows it on real time
      let t = dur;
      let level = 0;
      let age = 0;
      let full = null;
      let falling = null;
      let gone = null;
      let simGone = null;
      for (let frame = 0; frame < 60 * 12 && gone == null; frame++) {
        const dt = 1 / 60;
        t -= dt * speed;
        if (t <= 0 && simGone == null) simGone = age;
        const wet = t > 0 ? Math.min(1, (t / dur) * 3) : 0;
        age += dt;
        const was = level;
        level = puddleLevel(level, age, wet, dt);
        if (level >= 1 && full == null) full = age;
        if (full != null && falling == null && level < was) falling = age;
        if (level <= 0 && age >= PUDDLE.rise) gone = age;
      }
      assert.ok(full <= PUDDLE.rise + 1 / 60 + 1e-9, `x${speed} ${dur} s: seeps in over ${full?.toFixed(2)} s`);
      assert.ok(falling - full >= PUDDLE.hold - 1e-9, `x${speed} ${dur} s: holds ${(falling - full).toFixed(2)} s between its rise and its fall`);
      assert.ok(gone - falling >= PUDDLE.fall - 1 / 60 - 1e-9, `x${speed} ${dur} s: dries over ${(gone - falling).toFixed(2)} s`);
      if (speed === 1) assert.ok(gone >= simGone - 1 / 60 - 1e-9, 'at x1 it stays as long as the sim’s puddle acts');
    }
  }
});

test('the renderer draws puddles that way: faint, held, at the sim’s radius', () => {
  const stage = { reduced: false, layers: { path: new Container(), shots: new Container(), fx: new Container() }, sx: (x) => x * 35, sy: (y) => 600 - y * 35, view: { U: 35 } };
  const fx = { particle() {}, flashAll: () => false, flashShare: () => 0 };
  const tex = () => new Texture({ source: new TextureSource({ width: 256, height: 256 }) });
  const shots = createShots(stage, fx, { attach: () => null }, {}, { vfxTex: tex, puddleTex: tex, shadowTex: tex });
  const sprite = () => stage.layers.path.children.flatMap((c) => c.children)[0];
  for (const colors of [[ELEMENTS.poison.color], [Object.values(FUSIONS).find((f) => f.parts.includes('poison')).color]]) {
    const p = { id: 1 + Math.random(), x: 1, y: 9, r: 2.5, t: 3, max: 3, prof: { colors } };
    const tint = attackClass(colors, 'poison').tint;
    let most = 0;
    let rose = null;
    let fell = null;
    let gone = null;
    for (let frame = 0, now = 0; frame < 60 * 8 && gone == null; frame++, now += 1 / 60) {
      p.t -= 4 / 60; // at x4
      shots.sync([], 1 / 60, p.t > 0 ? [p] : []);
      const sp = sprite();
      if (!sp?.visible) {
        if (rose != null) gone = now;
        continue;
      }
      assert.equal(sp.width, 2 * p.r * 35, 'drawn at the sim’s radius');
      assert.equal(sp.tint, tint);
      most = Math.max(most, sp.alpha);
      if (rose == null && sp.alpha >= puddlePeak(tint) - 1e-9) rose = now;
      if (rose != null && fell == null && sp.alpha < puddlePeak(tint) - 1e-9) fell = now;
    }
    assert.ok(Math.abs(most - puddlePeak(tint)) < 1e-9, `at most its alpha ${puddlePeak(tint)}`);
    assert.ok(fell - rose >= PUDDLE.hold - 2 / 60, `x4: held ${(fell - rose).toFixed(2)} s though the sim's puddle lasted 0.75 s`);
    assert.ok(gone > fell, 'then it dries away');
    shots.reset();
  }
});
