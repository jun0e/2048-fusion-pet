// T14: the game's words come from one plain-text table per language (src/i18n).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN } from '../src/i18n/en.js';
import { VI } from '../src/i18n/vi.js';
import { LANGS, getLang, num, pickLang, setLang, tr } from '../src/i18n/index.js';

const placeholders = (v) => [...JSON.stringify(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('the first launch: a saved choice, else Vietnamese on a Vietnamese phone, else English', () => {
  assert.equal(pickLang(null, ['vi-VN', 'en-US']), 'vi');
  assert.equal(pickLang(null, ['vi']), 'vi');
  assert.equal(pickLang(null, ['en-US', 'vi-VN']), 'vi', 'Vietnamese anywhere in the phone’s list');
  assert.equal(pickLang(null, ['en-GB']), 'en');
  assert.equal(pickLang(null, []), 'en');
  assert.equal(pickLang('en', ['vi-VN']), 'en', 'the player’s choice wins');
  assert.equal(pickLang('xx', ['vi-VN']), 'vi', 'an unknown saved language is ignored');
  assert.equal(pickLang(null, ['view']), 'en', 'not a language code');
});

test('tr(): the current language, English where it has no entry, placeholders and plurals filled', () => {
  setLang('vi');
  assert.equal(getLang(), 'vi');
  assert.equal(tr('lang.row'), VI['lang.row']);
  setLang('en');
  assert.equal(tr('lang.row'), 'Language');
  assert.equal(tr('no.such.key'), 'no.such.key', 'a missing key shows itself');
  setLang('xx');
  assert.equal(getLang(), 'en', 'an unknown language is not set');
});

test('every table is plain text (no HTML: the Nibble copy reads the same tables), key for key with English', () => {
  for (const [lang, table] of Object.entries(LANGS)) {
    for (const [k, v] of Object.entries(table)) {
      const parts = typeof v === 'object' ? [v.one, v.other] : [v];
      for (const p of parts) {
        assert.equal(typeof p, 'string', `${lang} ${k}: a string, or { one, other } strings`);
        assert.ok(!/[<>]/.test(p), `${lang} ${k}: no markup in a table ("${p}")`);
      }
    }
  }
  assert.deepEqual(Object.keys(VI).sort(), Object.keys(EN).sort(), 'Vietnamese has every English key, and no other');
  for (const k of Object.keys(EN)) assert.deepEqual(placeholders(VI[k]), placeholders(EN[k]), `${k}: the same placeholders`);
});

test('numbers as each language writes them', () => {
  setLang('en');
  assert.equal(num(12345), '12,345');
  setLang('vi');
  assert.equal(num(12345), '12.345');
  setLang('en');
});

test('Vietnamese fits where the space is tight (checked at 360 px: docs/ux/vietnamese.md)', () => {
  const len = (k) => VI[k].length;
  // the die pick's one line per die: one line on a 360 px phone, as the English (≤ 28)
  for (const k of Object.keys(VI).filter((k) => /^el\.[a-z]+\.line$/.test(k))) assert.ok(len(k) <= 30, `${k}: "${VI[k]}"`);
  // the namecard's READY pill is 42 px wide at 14 px
  assert.ok(len('nc.pill') <= 4, VI['nc.pill']);
  // Sell / Break and the armed label share one fixed-width button beside Details (the narrow card too)
  for (const k of ['act.sell', 'act.break', 'act.armed', 'act.lastBlock', 'act.need']) assert.ok(len(k) <= 10, `${k}: "${VI[k]}"`);
  assert.ok(len('act.armed') <= EN['act.armed'].length, 'the armed label no wider than the English, which the narrow card is sized for');
  // the top-block chip's caption, inside a 48 px disc for one or two digits
  assert.ok(len('hud.topChip') <= 4, VI['hud.topChip']);
  // the element chips: one word each
  for (const el of ['fire', 'ice', 'lightning', 'poison', 'earth', 'wind', 'metal', 'nature']) assert.ok(!VI[`el.${el}`].includes(' '), `el.${el}`);
});
