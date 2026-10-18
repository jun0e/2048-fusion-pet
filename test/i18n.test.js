// T14: the game's words come from one plain-text table per language (src/i18n).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { EN } from '../src/i18n/en.js';
import { VI } from '../src/i18n/vi.js';
import { LANGS, LANG_NAMES, getLang, num, ordinal, pickLang, setLang, tr } from '../src/i18n/index.js';

const atLoad = getLang();
const placeholders = (v) => [...new Set([...JSON.stringify(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
// the plural forms Intl.PluralRules can name
const FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

test('outside a browser the game speaks English, whatever the shell’s locale (the tests, the art pipeline’s prompts)', () => {
  assert.equal(atLoad, 'en');
  const url = new URL('../src/i18n/index.js', import.meta.url).href;
  const env = { ...process.env, LANG: 'vi_VN.UTF-8', LC_ALL: 'vi_VN.UTF-8', LANGUAGE: 'vi' };
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(url)}); process.stdout.write(m.getLang() + ' ' + m.tr('el.fire'))`], { env });
  assert.equal(String(out), 'en Fire');
});

test('the first launch: the player’s choice, else the phone’s first language the game has, else English', () => {
  assert.equal(pickLang(null, ['vi-VN', 'en-US']), 'vi');
  assert.equal(pickLang(null, ['vi']), 'vi');
  assert.equal(pickLang(null, ['en-US', 'vi-VN']), 'en', 'English first on the phone: English');
  assert.equal(pickLang(null, ['fr-FR', 'vi_VN', 'en-US']), 'vi', 'the first language the game has');
  assert.equal(pickLang(null, ['en-GB']), 'en');
  assert.equal(pickLang(null, []), 'en');
  assert.equal(pickLang('en', ['vi-VN']), 'en', 'the player’s choice wins');
  assert.equal(pickLang('xx', ['vi-VN']), 'vi', 'an unknown saved language is ignored');
  assert.equal(pickLang('constructor', []), 'en', 'not a table');
  assert.equal(pickLang(null, ['view']), 'en', 'not a language code');
});

test('tr(): the current language, English where it has no entry, placeholders and plurals filled', () => {
  assert.equal(setLang('vi'), true);
  assert.equal(getLang(), 'vi');
  assert.equal(tr('lang.row'), VI['lang.row']);
  assert.equal(tr('unit.cells', { n: 1 }), '1 ô', 'Vietnamese has one plural form');
  setLang('en');
  assert.equal(tr('lang.row'), 'Language');
  assert.equal(tr('unit.cells', { n: 1 }), '1 cell');
  assert.equal(tr('unit.cells', { n: '1,5', count: 1.5 }), '1,5 cells', 'count picks the form when n is shown formatted');
  assert.equal(tr('no.such.key'), 'no.such.key', 'a missing key shows itself');
  assert.equal(setLang('xx'), false);
  assert.equal(getLang(), 'en', 'an unknown language is not set');
  assert.equal(setLang('vi', true), false, 'no storage here: the choice did not stick, and the game says so');
  setLang('en');
});

test('each table says its name, its locale and how it writes "4th"', () => {
  assert.deepEqual(LANG_NAMES, { en: 'English', vi: 'Tiếng Việt' });
  for (const [lang, table] of Object.entries(LANGS)) {
    assert.ok(Intl.NumberFormat.supportedLocalesOf([table['@locale']]).length, `${lang}: a locale this runtime knows`);
    assert.ok(table['@ordinal'], `${lang}: its ordinal`);
  }
  setLang('en');
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  setLang('vi');
  assert.equal(ordinal(4), '4');
  assert.equal(tr('card.fx.freeze', { nth: ordinal(4), dur: '1 giây' }), VI['card.fx.freeze'].replace('{nth}', '4').replace('{dur}', '1 giây'));
  setLang('en');
});

test('every table is plain text (no HTML: the Nibble copy reads the same tables), key for key with English', () => {
  for (const [lang, table] of Object.entries(LANGS)) {
    for (const [k, v] of Object.entries(table)) {
      if (typeof v === 'object') {
        assert.ok(Object.keys(v).every((f) => FORMS.includes(f)) && 'other' in v, `${lang} ${k}: plural forms Intl.PluralRules names, and 'other'`);
      }
      for (const p of typeof v === 'object' ? Object.values(v) : [v]) {
        assert.equal(typeof p, 'string', `${lang} ${k}: a string, or plural forms that are strings`);
        assert.ok(!/[<>]/.test(p), `${lang} ${k}: no markup in a table ("${p}")`);
        assert.ok(!/^[,;]/.test(p), `${lang} ${k}: whole words, not the tail of another key's sentence ("${p}")`);
      }
    }
  }
  assert.deepEqual(Object.keys(VI).sort(), Object.keys(EN).sort(), 'Vietnamese has every English key, and no other');
  for (const k of Object.keys(EN)) assert.deepEqual(placeholders(VI[k]), placeholders(EN[k]), `${k}: the same placeholders`);
});

test('words the code puts together come in the language’s order', () => {
  setLang('en');
  assert.equal(tr('legend.name', { apex: EN['apex.fire'], fusion: EN['fusion.fire+ice'] }), 'Sun Frostnova');
  setLang('vi');
  assert.equal(tr('legend.name', { apex: VI['apex.fire'], fusion: VI['fusion.fire+ice'] }), 'Nova Băng Mặt Trời', 'the apex after the fusion');
  assert.equal(tr('card.pet.out', { name: 'Mistmaw' }), 'Thú cưng: Mistmaw, đang ở ngoài sân');
  setLang('en');
});

test('numbers as each language writes them', () => {
  setLang('en');
  assert.equal(num(12345), '12,345');
  assert.equal(num(2.5), '2.5');
  assert.equal(num(1, 1), '1.0', 'digits: as many decimals as asked for');
  setLang('vi');
  assert.equal(num(12345), '12.345');
  assert.equal(num(2.5), '2,5');
  assert.equal(num(1.25, 1), '1,3');
  setLang('en');
});

test('the loading screen (index.html) says the tables’ words, in the language the game picks, before the game loads', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const m = html.match(/const BOOT_WORDS = (\{[\s\S]*?\});/);
  assert.ok(m, 'BOOT_WORDS in index.html');
  const words = runInNewContext(`(${m[1]})`);
  assert.deepEqual(Object.keys(words), Object.keys(LANGS), 'a line for every language');
  for (const [lang, table] of Object.entries(LANGS)) assert.deepEqual([...words[lang]], [table['boot.loading'], table['boot.retry'], table['boot.newRun']], lang);
  // and it picks the language as src/i18n/index.js does: the address, the saved choice, the phone's first
  assert.match(html, /#lang-\(\[a-z\]\+\)\$/, 'reads #lang-xx (LANG_HASH)');
  assert.match(html, /localStorage\.getItem\('siege:lang'\)/, 'reads the saved choice (LANG_KEY)');
  assert.match(html, /navigator\.languages/, 'else the phone’s languages');
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
