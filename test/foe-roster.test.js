import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ENEMY_TYPES, CHAPTERS } from '../src/sim/enemies.js';
import { FOE_ROSTER, CHAPTER_GOLDEN, FOE_SIZE_FLOOR, foeChapters, foeDrawSize } from '../src/art/foe-roster.js';
import { CHAPTER_GROUNDS, CHAPTER_SKINS } from '../src/art/frame-kit.js';
import { EN } from '../src/i18n/en.js';

/** CIE L* of a #RRGGBB colour. */
function lstar(hex) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const f = y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116;
  return 116 * f - 16;
}

test('every enemy is one roster animal with the same name, and no animal repeats', () => {
  assert.deepEqual(Object.keys(FOE_ROSTER).sort(), Object.keys(ENEMY_TYPES).sort());
  for (const [k, r] of Object.entries(FOE_ROSTER)) {
    assert.equal(r.name, EN[`foe.${k}`], `${k}: the art names it as the game does in English (its prompts are English)`);
    assert.equal(!!r.boss, !!ENEMY_TYPES[k].boss, `${k}: boss flags agree`);
  }
  assert.equal(new Set(Object.values(FOE_ROSTER).map((r) => r.animal)).size, Object.keys(FOE_ROSTER).length);
});

test('roster entries are complete: a flippable view, a motion, a silhouette contract, two values and one accent', () => {
  for (const [k, r] of Object.entries(FOE_ROSTER)) {
    assert.ok(['profile', 'front', 'spread'].includes(r.view), `${k}: view`);
    assert.ok(['walk', 'crawl', 'hover', 'swim', 'float'].includes(r.move), `${k}: move`);
    assert.ok(['green', 'magenta'].includes(r.bg), `${k}: key colour`);
    assert.ok(existsSync(new URL(`../tools/refs/foes/sil-${r.animal}.png`, import.meta.url)), `${k}: silhouette contract`);
    assert.equal(r.pal.length, 4, `${k}: four body colours`);
    for (const h of r.pal) assert.match(h, /^#[0-9A-F]{6}$/, `${k}: ${h}`);
    // the two values (proposal 7.3): a dark mass at L* <= 40 and a cream zone at L* >= 75
    const ls = r.pal.map(lstar);
    assert.ok(ls.some((l) => l <= 40), `${k}: a dark mass colour (L* ${ls.map((l) => l.toFixed(0)).join(', ')})`);
    assert.ok(ls.some((l) => l >= 75), `${k}: a cream colour (L* ${ls.map((l) => l.toFixed(0)).join(', ')})`);
    assert.match(r.accent, /#[0-9A-F]{6}/, `${k}: the accent names its colour`);
    assert.ok(r.desc.length > 40 && r.pose.length > 30, `${k}: a description and a pose in words`);
  }
});

test('each chapter has its golden foe and its grounds, taken from its skin', () => {
  for (const c of CHAPTERS) {
    const golden = CHAPTER_GOLDEN[c.key];
    assert.equal(FOE_ROSTER[golden].chapter, c.key, `${c.key}: its golden belongs to it`);
    const s = CHAPTER_SKINS[c.key];
    assert.deepEqual(CHAPTER_GROUNDS[c.key], { lane: s.lane, hedge: s.hedge, keep: s.floor }, `${c.key}: the grounds are the skin's lane, hedge and keep floor`);
    for (const k of [...c.pool, c.boss]) assert.ok(FOE_ROSTER[k], `${c.key}: ${k} has an animal`);
  }
});

test('every foe marches in its own chapter; the moth also in the far east, the kite carps with the crab that drops them', () => {
  for (const [k, r] of Object.entries(FOE_ROSTER)) assert.ok(foeChapters(k).includes(r.chapter), `${k} marches in ${r.chapter}`);
  assert.deepEqual(foeChapters('pixie'), ['forest', 'fareast']);
  assert.deepEqual(foeChapters('kiteMinion'), ['fareast'], 'summoned by the Pagoda Crab');
  assert.deepEqual(foeChapters('dragonRider'), ['peaks']);
});

test('foeDrawSize: the floor for small foes, x2.5; bosses keep their size, x2.6', () => {
  assert.equal(FOE_SIZE_FLOOR, 0.42);
  assert.equal(foeDrawSize(ENEMY_TYPES.kiteMinion), 0.42 * 2.5, 'size 0.32 is drawn at the floor');
  assert.equal(foeDrawSize(ENEMY_TYPES.redDragon), 0.62 * 2.5);
  assert.equal(foeDrawSize(ENEMY_TYPES.dragonRider), 1.05 * 2.6);
  assert.equal(foeDrawSize({ size: 0.3, boss: true }), 0.3 * 2.6, 'no floor for a boss');
  assert.equal(foeDrawSize(), FOE_SIZE_FLOOR * 2.5, 'an unknown foe is drawn at the floor');
  for (const d of Object.values(ENEMY_TYPES)) assert.ok(foeDrawSize(d) >= FOE_SIZE_FLOOR * 2.5);
});
