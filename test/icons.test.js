// The stat icons (docs/v2/SPEC-v2.1.md section 6; src/ui/icons.js): one small inline SVG per key, each
// with its word (English and Vietnamese) as its title and aria-label, in one style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_KEYS, icon, iconWord } from '../src/ui/icons.js';
import { REWARD_ICON } from '../src/ui/run-badges.js';
import { TRAIT_KEYS } from '../src/sim/classes.js';
import { ELEMENT_STATS } from '../src/sim/skills/data.js';
import { LEVEL_ROAD } from '../src/sim/levels.js';
import { LANGS, setLang } from '../src/i18n/index.js';

// the keys the contract names (SPEC-v2.1 section 6)
const SPEC_KEYS = ['dmg', 'slow', 'rate', 'poison', 'hp', 'range', 'crit', 'regen', 'far', 'lanes', 'area', 'chain', 'level', 'xp', 'coin', 'summon', 'charge', 'grow', 'resist', 'dps'];

test('every key the contract names has an icon, and so does every stat, strength and level-road reward', () => {
  for (const k of SPEC_KEYS) assert.ok(ICON_KEYS.includes(k), k);
  for (const { stat } of Object.values(ELEMENT_STATS)) assert.ok(ICON_KEYS.includes(stat), `the ${stat} stat`);
  for (const k of TRAIT_KEYS) assert.ok(ICON_KEYS.includes(k), `the ${k} strength`);
  const kinds = new Set(LEVEL_ROAD.flatMap((l) => l.rewards.map((r) => r.kind)));
  for (const kind of kinds) assert.ok(ICON_KEYS.includes(REWARD_ICON[kind]), `the ${kind} reward`);
  assert.equal(new Set(ICON_KEYS).size, ICON_KEYS.length);
});

test('an icon is one inline SVG on the 24-unit grid with the ink outline, named by its word', () => {
  for (const k of ICON_KEYS) {
    const svg = icon(k, { size: 16 });
    assert.match(svg, /^<svg class="ico ico-[a-z]+" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2b1d2e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" focusable="false" role="img" aria-label="[^"]+"><title>[^<]+<\/title>/, k);
    assert.ok(svg.endsWith('</svg>'), k);
    assert.equal((svg.match(/<svg/g) ?? []).length, 1, `${k}: one svg`);
    assert.ok(!/\bid=|url\(#/.test(svg), `${k}: no ids (the same icon shows many times on one page)`);
    assert.ok(/<(path|circle|ellipse|rect)\b/.test(svg), `${k}: drawn`);
    // every coordinate inside the box (the outline may reach a unit past a shape's edge)
    for (const m of svg.matchAll(/\b(?:cx|cy|x|y)="(-?[\d.]+)"/g)) assert.ok(Number(m[1]) >= 0 && Number(m[1]) <= 24, `${k}: ${m[0]}`);
  }
});

test('its word is its title and its aria-label, in English and in Vietnamese', () => {
  for (const lang of Object.keys(LANGS)) {
    setLang(lang);
    try {
      for (const k of ICON_KEYS) {
        const word = iconWord(k);
        assert.ok(word && word !== `icon.${k}`, `${lang} ${k}: a word`);
        assert.equal(word, LANGS[lang][`icon.${k}`]);
        const svg = icon(k);
        assert.ok(svg.includes(`aria-label="${word}"`) && svg.includes(`<title>${word}</title>`), `${lang} ${k}`);
      }
    } finally {
      setLang('en');
    }
  }
  assert.equal(iconWord('dmg'), 'Damage');
  setLang('vi');
  assert.equal(iconWord('dmg'), 'Sát thương');
  setLang('en');
});

test('a decorative icon (its word beside it) is hidden from screen readers; a title of its own is escaped', () => {
  const plain = icon('far', { title: null });
  assert.match(plain, /aria-hidden="true"/);
  assert.ok(!plain.includes('<title>') && !plain.includes('role="img"'));
  const own = icon('dmg', { title: 'Damage <"x"> & more', cls: 'big' });
  assert.match(own, /class="ico ico-dmg big"/);
  assert.match(own, /aria-label="Damage &lt;&quot;x&quot;&gt; &amp; more"/);
  assert.equal(icon('nope'), '', 'an unknown key draws nothing');
  assert.match(icon('coin'), /width="18" height="18"/, '18 px by default');
});

test('one style: every icon has an outlined shape, and colours are the flat fills of a small palette', () => {
  const fills = new Set();
  for (const k of ICON_KEYS) {
    const svg = icon(k);
    for (const m of svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)) fills.add(m[1].toLowerCase());
    assert.ok(!/gradient|filter=|opacity="0\.[0-2]/.test(svg), `${k}: flat`);
    // its outline is the ink: a filled shape that takes the root's stroke, or a coloured line over a wider ink one
    const outlined = /<(path|circle|ellipse|rect) [^>]*fill="#[0-9a-f]{6}"(?![^>]*stroke=)[^>]*\/>/i.test(svg);
    const band = /<path d="([^"]+)" fill="none" stroke-width="[\d.]+"\/><path d="\1" fill="none" stroke="#[0-9a-f]{6}"/i.test(svg);
    assert.ok(outlined || band, `${k}: an ink outline`);
  }
  assert.ok(fills.size <= 48, `a small palette (${fills.size} fills)`);
});
