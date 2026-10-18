// The game's words (T14): one plain-text table per language (src/i18n/en.js, vi.js), so another
// language is one more table, and the Nibble copy of the game reads the same tables. A table also says
// what the code needs to know about its language: its name in itself ('@name'), its locale ('@locale':
// numbers and plural forms) and how it writes "4th" ('@ordinal'). No HTML in a table: each screen
// builds its markup around the words. tr(key, vars) fills {name} placeholders; a plural is
// { one, other } (or whichever forms Intl.PluralRules names for the language), picked by vars.count,
// else vars.n; a key missing from a language falls back to English.
import { EN } from './en.js';
import { VI } from './vi.js';

export const LANGS = { en: EN, vi: VI };
/** Each language's name, in itself (the Language row in Settings). */
export const LANG_NAMES = Object.fromEntries(Object.entries(LANGS).map(([code, table]) => [code, table['@name']]));
export const LANG_KEY = 'siege:lang';
/** Where the choice goes when storage is blocked: the page's address (#lang-vi), which a reload keeps. */
export const LANG_HASH = /^#lang-([a-z]+)$/;

const CODES = Object.keys(LANGS);
const known = (code) => CODES.includes(code); // (not Object.hasOwn: some phones the game runs on predate it)

/** The language to start in: the player's choice, else the phone's first language the game has, else English. */
export function pickLang(chosen, languages = []) {
  if (known(chosen)) return chosen;
  for (const l of languages) {
    const code = String(l).toLowerCase().split(/[-_]/)[0];
    if (known(code)) return code;
  }
  return 'en';
}

/**
 * The language a page starts in: the address's (#lang-vi, chosen while storage was blocked), else the
 * saved choice, else the phone's first language the game has, else English. index.html's loading
 * screen picks it the same way (test/i18n.test.js runs both on the same cases).
 */
export function startLang({ hash = '', saved = null, languages = [] } = {}) {
  const m = LANG_HASH.exec(hash);
  return pickLang(m && known(m[1]) ? m[1] : saved, languages);
}

/** Save the player's choice; whether it stuck (not where storage is blocked, nor outside a browser). */
function save(lang) {
  try {
    const store = globalThis.window?.localStorage; // window: Node has a storage of its own
    store.setItem(LANG_KEY, lang);
    return store.getItem(LANG_KEY) === lang;
  } catch {
    return false;
  }
}

/** Put the choice in the page's address, or take it out (null), with no new history entry. */
function address(lang) {
  if (!globalThis.history || (!lang && !LANG_HASH.test(location.hash))) return;
  try {
    const url = new URL(location.href);
    url.hash = lang ? `lang-${lang}` : '';
    history.replaceState(history.state, '', url);
  } catch {}
}

/** As a page loads: the language it starts in. */
function startup() {
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch {} // a private window, or blocked storage
  const hash = location.hash;
  const lang = startLang({ hash, saved, languages: navigator.languages?.length ? navigator.languages : [navigator.language] });
  // chosen while storage was blocked, and it works now: saved, and the address let go (it would
  // outrank every later choice); a language the game does not have is let go at once
  const named = LANG_HASH.exec(hash)?.[1];
  if (named && (!known(named) || (named === lang && save(lang)))) address(null);
  return lang;
}

// The language is settled as this module loads, before any screen or table asks for a word: every
// module may call tr() at its own load. A change in Settings saves the choice and reloads the page
// (main.js), and the run restores itself (src/ux/resume.js). Outside a browser (the tests, the art
// pipeline's prompts) it is English: Node's navigator follows the shell's locale.
let current = globalThis.document ? startup() : 'en';
globalThis.document?.documentElement?.setAttribute('lang', current);

/**
 * Set the language now (tests, and the moment before a reload). `keep`: the player's choice, saved;
 * where storage is blocked it goes in the page's address instead (#lang-vi), which a reload keeps.
 * The answer is whether it was saved.
 */
export function setLang(lang, keep = false) {
  if (!known(lang)) return false;
  current = lang;
  globalThis.document?.documentElement?.setAttribute('lang', lang);
  if (!keep) return true;
  const saved = save(lang);
  address(saved ? null : lang); // and a saved choice takes an old one out of the address
  return saved;
}

export const getLang = () => current;

/** Every letter the current language's words use: a font sample that loads each subset they need. */
export const letters = () => [...new Set(Object.values(LANGS[current]).flatMap((v) => (typeof v === 'object' ? Object.values(v) : [v])).join('').replace(/\s/g, ''))].join('');

const locale = () => LANGS[current]['@locale'];
const rules = {};
/** The plural form `n` takes in the current language ('one', 'other', …): cardinal, or 'ordinal' ("4th"). */
const form = (n, type = 'cardinal') => (rules[`${current}:${type}`] ??= new Intl.PluralRules(locale(), { type })).select(Number(n));

/** A table entry: a string, or its plural forms (`other` when the language has no form of its own for n). */
function words(v, vars, type) {
  if (typeof v === 'object') v = v[form(vars.count ?? vars.n, type)] ?? v.other; // count: when n is shown formatted
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

/** The words for `key` in the current language, with `vars` filled in. */
export function tr(key, vars = {}) {
  const v = LANGS[current][key] ?? EN[key];
  return v == null ? key : words(v, vars); // a missing key shows itself (test/i18n.test.js catches it)
}

/** Whether the tables have `key` (optional words, such as a boss's intro line). */
export const has = (key) => key in EN;

const formats = {};
/**
 * A number as the language writes it: 1,234.5 in English, 1.234,5 in Vietnamese (up to 3 decimals;
 * `digits` sets how many). One formatter per language and digits: the field's numbers ask every frame.
 */
export const num = (n, digits) =>
  (formats[`${current}|${digits ?? ''}`] ??= new Intl.NumberFormat(locale(), digits == null ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits })).format(Number(n));

/** "4th" as the language writes it: "4" in Vietnamese, whose sentence puts "thứ" before it. */
export const ordinal = (n) => words(LANGS[current]['@ordinal'] ?? EN['@ordinal'], { n }, 'ordinal');

/** "A, B or C" in the language's words. */
export const orList = (items) => (items.length > 1 ? tr('list.or', { head: items.slice(0, -1).join(', '), last: items.at(-1) }) : (items[0] ?? ''));
