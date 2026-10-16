// T6: every boss has an intro card: its generated portrait (the "boss approaches" bust), its name and
// a line of what it does (src/ui/boss-intro.js); the card's look holds the phone floors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENEMY_TYPES } from '../src/sim/enemies.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('every boss has a portrait for its intro card, a name and a line of what it does', () => {
  const files = JSON.parse(read('public/assets/manifest.json')).files;
  const bosses = Object.entries(ENEMY_TYPES).filter(([, e]) => e.boss);
  assert.ok(bosses.length >= 3);
  for (const [k, e] of bosses) {
    assert.ok(files[`enemy.${k}.portrait`], `${k}: no portrait (enemy.${k}.portrait)`);
    assert.ok(e.name && e.intro && e.intro.length <= 100, `${k}: name and a short intro`);
  }
});

test('the card never takes a tap, and its large slide waits for the flash budget (photosafe)', () => {
  const css = read('src/ui/hud.css');
  const rule = css.slice(css.indexOf('.boss-intro {'), css.indexOf('}', css.indexOf('.boss-intro {')));
  assert.match(rule, /pointer-events: none/);
  const js = read('src/ui/boss-intro.js');
  assert.match(js, /const slide = !calm && stage\.takeFlash\(\)/, 'slides only with the flash budget and Reduce motion off');
  assert.match(js, /aria-hidden/, 'out of the accessibility tree: the news ribbon speaks it');
});
