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
/** Where the choice goes when storage is blocked: the page's address (#lang-vi), which survives the reload. */
export const LANG_HASH = /^#lang-([a-z]+)$/;

const known = (code) => typeof code === 'string' && Object.hasOwn(LANGS, code);

/** The language to start in: the player's choice, else the phone's first language the game has, else English. */
export function pickLang(chosen, languages = []) {
  if (known(chosen)) return chosen;
  for (const l of languages) {
    const code = String(l).toLowerCase().split(/[-_]/)[0];
    if (known(code)) return code;
  }
  return 'en';
}

/** The player's choice: in the address when storage was blocked as they made it, else saved. */
function chosen() {
  const m = LANG_HASH.exec(location.hash);
  if (m && known(m[1])) return m[1];
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null; // a private window or blocked storage
  }
}

// The language is settled as this module loads, before any screen or table asks for a word: every
// module may call tr() at its own load. A change in Settings saves the choice and reloads the page
// (main.js), and the run restores itself (src/ux/resume.js). Outside a browser (the tests, the art
// pipeline's prompts) it is English: Node's navigator follows the shell's locale.
let current = globalThis.document ? pickLang(chosen(), navigator.languages?.length ? navigator.languages : [navigator.language]) : 'en';
globalThis.document?.documentElement?.setAttribute('lang', current);

/**
 * Set the language now (tests, and the moment before a reload). `keep` also saves it as the player's
 * choice; the answer is whether that stuck (false where storage is blocked).
 */
export function setLang(lang, keep = false) {
  if (!known(lang)) return false;
  current = lang;
  globalThis.document?.documentElement?.setAttribute('lang', lang);
  if (!keep) return true;
  try {
    const store = globalThis.window?.localStorage; // window: Node has a storage of its own
    store.setItem(LANG_KEY, lang);
    return store.getItem(LANG_KEY) === lang;
  } catch {
    return false;
  }
}

export const getLang = () => current;

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

/** A number as the language writes it: 1,234.5 in English, 1.234,5 in Vietnamese (up to 3 decimals; `digits` sets how many). */
export const num = (n, digits) => Number(n).toLocaleString(locale(), digits == null ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "4th" as the language writes it: "4" in Vietnamese, whose sentence puts "thứ" before it. */
export const ordinal = (n) => words(LANGS[current]['@ordinal'] ?? EN['@ordinal'], { n }, 'ordinal');

/** "A, B or C" in the language's words. */
export const orList = (items) => (items.length > 1 ? tr('list.or', { head: items.slice(0, -1).join(', '), last: items.at(-1) }) : (items[0] ?? ''));
