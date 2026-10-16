// The combination pop-up's chips (src/ui/hud.css `.announce .part`, T35): ink text on the part's
// colour lifted 30 % toward white, so it reads ≥ 4.5 : 1 on every element and fusion colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ELEMENTS, FUSIONS } from '../src/sim/classes.js';
import { INK, contrast } from '../src/art/tokens.js';

/** color-mix(in srgb, c k%, white): a straight mix of the gamma-encoded channels. */
const mixWhite = (hex, k) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k + 255 * (1 - k)).toString(16).padStart(2, '0')).join('');

test('the combination chips mix their colour 70 % with white, and ink reads ≥ 4.5 : 1 on every part colour', () => {
  const css = readFileSync(new URL('../src/ui/hud.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.announce .part {'), css.indexOf('}', css.indexOf('.announce .part {')));
  assert.match(rule, /background: var\(--c\);/, 'a plain fallback first');
  assert.match(rule, /background: color-mix\(in srgb, var\(--c\) 70%, white\);/);
  assert.match(rule, /color: var\(--ink\)/);
  const colours = [...Object.values(ELEMENTS), ...Object.values(FUSIONS)].map((x) => x.color);
  assert.equal(colours.length, 36);
  for (const c of colours) assert.ok(contrast(INK, mixWhite(c, 0.7)) >= 4.5, `${c}: ${contrast(INK, mixWhite(c, 0.7)).toFixed(2)} : 1`);
  assert.ok(colours.some((c) => contrast(INK, c) < 4.5), 'unmixed, some would not read (why the mix is there)');
});
