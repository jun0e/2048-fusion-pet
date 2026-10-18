// T14: the game's words come from one plain-text table per language (src/i18n).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { EN } from '../src/i18n/en.js';
import { VI } from '../src/i18n/vi.js';
import { LANGS, LANG_NAMES, getLang, letters, num, ordinal, pickLang, setLang, startLang, tr } from '../src/i18n/index.js';

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

// the places a page's language can come from: [address, saved choice, phone languages, storage blocked]
const STARTS = [
  ['', null, ['vi-VN', 'en-US']],
  ['', null, ['en-US', 'vi-VN']],
  ['', null, ['fr-FR', 'vi-VN']],
  ['', null, []],
  ['', 'vi', ['en-US']],
  ['', 'xx', ['vi-VN']],
  ['', 'constructor', []],
  ['#lang-vi', 'en', ['en-US']],
  ['#lang-en', 'vi', ['vi-VN']],
  ['#lang-xx', 'vi', ['en-US']],
  ['#other', null, ['vi']],
  ['#lang-vi', null, ['en-US'], true],
  ['', null, ['vi-VN'], true],
];

test('a page starts in the address’s language, else the saved one, else the phone’s first the game has', () => {
  const at = ([hash, saved, languages]) => startLang({ hash, saved, languages });
  assert.deepEqual(STARTS.map(at), ['vi', 'en', 'vi', 'en', 'vi', 'vi', 'en', 'vi', 'en', 'vi', 'vi', 'vi', 'vi']);
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
  for (const [lang, table] of Object.entries(LANGS)) {
    assert.deepEqual(Object.keys(table).sort(), Object.keys(EN).sort(), `${lang} has every English key, and no other`);
    for (const k of Object.keys(EN)) assert.deepEqual(placeholders(table[k]), placeholders(EN[k]), `${lang} ${k}: the same placeholders`);
  }
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

/** index.html's own scripts (the loading screen), run in order on a page that has `hash`, `saved` and `languages`. */
function bootScreen({ hash = '', saved = null, languages = [], blocked = false, page = {} }) {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const els = {};
  const el = (sel) => (els[sel] ??= { textContent: '', clicks: 0, addEventListener(type, fn) { this.clicks += type === 'click' ? 1 : 0; }, classList: { add() {} } });
  const refuse = () => {
    throw new Error('storage is blocked');
  };
  const doc = { documentElement: { lang: 'en' }, querySelector: el };
  const context = createContext({
    document: doc,
    location: { hash, reload() {} },
    localStorage: blocked ? { getItem: refuse, removeItem: refuse } : { getItem: (k) => (k === 'siege:lang' ? saved : null), removeItem() {} },
    navigator: { languages, language: languages[0] },
    setTimeout: () => 0,
    ...page,
  });
  for (const script of scripts) {
    try {
      runInContext(script, context);
    } catch {} // as a browser does: a script that throws stops only itself
  }
  return { lang: doc.documentElement.lang, words: ['.boot-msg', '.boot-retry', '.boot-new'].map((s) => el(s).textContent), wired: el('.boot-retry').clicks === 1 && el('.boot-new').clicks === 1 };
}

test('the loading screen (index.html) says the tables’ words before the game loads, in the language the game picks', () => {
  for (const [hash, saved, languages, blocked] of STARTS) {
    const lang = startLang({ hash, saved: blocked ? null : saved, languages });
    const screen = bootScreen({ hash, saved, languages, blocked });
    assert.equal(screen.lang, lang, `${JSON.stringify([hash, saved, languages, !!blocked])}: the language src/i18n/index.js starts in`);
    assert.deepEqual(screen.words, [LANGS[lang]['boot.loading'], LANGS[lang]['boot.retry'], LANGS[lang]['boot.newRun']]);
    assert.ok(screen.wired);
  }
  // a browser the language pick trips on (no navigator here): Try again and New run still work
  const old = bootScreen({ page: { navigator: undefined } });
  assert.ok(old.wired, 'the buttons are wired first, in a script of their own');
  assert.deepEqual(old.words, ['', '', ''], 'and the page keeps its own words');
});

/** src/i18n/index.js loaded on a fake page: what it starts in, and what is left in the address and storage. */
function loadOnPage({ hash = '', saved = null, languages = ['en-US'], blocked = false }) {
  const url = new URL('../src/i18n/index.js', import.meta.url).href;
  const page = `
    const store = new Map(${JSON.stringify(saved == null ? [] : [['siege:lang', saved]])});
    const blocked = ${blocked};
    const refuse = () => { throw new Error('storage is blocked'); };
    globalThis.localStorage = blocked ? { getItem: refuse, setItem: refuse } : { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
    globalThis.window = globalThis;
    globalThis.document = { documentElement: { setAttribute() {} } };
    globalThis.location = { href: 'https://example.com/siege/?seed=7${hash}', hash: ${JSON.stringify(hash)} };
    const entries = [];
    globalThis.history = { state: null, replaceState(state, title, to) { entries.push(String(to)); } };
    Object.defineProperty(globalThis, 'navigator', { value: { languages: ${JSON.stringify(languages)}, language: ${JSON.stringify(languages[0] ?? '')} }, configurable: true });
    const m = await import(${JSON.stringify(url)});
    process.stdout.write(JSON.stringify({ lang: m.getLang(), saved: blocked ? null : store.get('siege:lang') ?? null, address: entries }));`;
  return JSON.parse(String(execFileSync(process.execPath, ['--input-type=module', '-e', page])));
}

test('a language chosen while storage was blocked: saved once storage works, and the address let go', () => {
  assert.deepEqual(loadOnPage({ hash: '#lang-vi' }), { lang: 'vi', saved: 'vi', address: ['https://example.com/siege/?seed=7'] });
  assert.deepEqual(loadOnPage({ hash: '#lang-vi', saved: 'en' }), { lang: 'vi', saved: 'vi', address: ['https://example.com/siege/?seed=7'] }, 'the address is the newer choice');
  assert.deepEqual(loadOnPage({ hash: '#lang-vi', blocked: true }), { lang: 'vi', saved: null, address: [] }, 'still blocked: the address keeps it');
  assert.deepEqual(loadOnPage({ hash: '#lang-xx', saved: 'vi' }), { lang: 'vi', saved: 'vi', address: ['https://example.com/siege/?seed=7'] }, 'a language the game does not have is let go');
  assert.deepEqual(loadOnPage({ saved: 'vi' }), { lang: 'vi', saved: 'vi', address: [] }, 'no address: nothing to let go');
  assert.deepEqual(loadOnPage({ languages: ['vi-VN'] }), { lang: 'vi', saved: null, address: [] }, 'the phone’s language is not saved as a choice');
});

test('a font sample: every letter the language’s words use', () => {
  setLang('vi');
  const vi = letters();
  for (const ch of 'ởĐợăươĩũỹ') assert.ok(vi.includes(ch), `Vietnamese: ${ch}`);
  assert.ok(!/\s/.test(vi) && new Set(vi).size === vi.length, 'each letter once, no spaces');
  setLang('en');
  assert.ok(!/[ởĐợăươ]/.test(letters()), 'English: no Vietnamese letters to load');
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
