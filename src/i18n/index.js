// The game's words (T14): one plain-text table per language (src/i18n/en.js, vi.js), so another
// language is one more table, and the Nibble copy of the game reads the same tables. No HTML in a
// table: each screen builds its markup around the words. tr(key, vars) fills {name} placeholders; a
// plural is { one, other }, picked by vars.count (else vars.n); a key missing from a language falls
// back to English.
import { EN } from './en.js';
import { VI } from './vi.js';

export const LANGS = { en: EN, vi: VI };
/** Each language's name, in itself (the Language row in Settings). */
export const LANG_NAMES = { en: 'English', vi: 'Tiếng Việt' };
export const LANG_KEY = 'siege:lang';

/** The saved choice, if any (a private window or blocked storage has none). */
function saved() {
  try {
    return globalThis.window?.localStorage.getItem(LANG_KEY) ?? null; // window: Node has a storage of its own
  } catch {
    return null;
  }
}

/** The language to start in: the player's saved choice, else Vietnamese on a Vietnamese phone, else English. */
export function pickLang(saved, languages = []) {
  if (saved && LANGS[saved]) return saved;
  return languages.some((l) => /^vi(\b|-|_)/i.test(String(l))) ? 'vi' : 'en';
}

// the language is settled as this module loads, before any screen or table asks for a word: every
// module may call tr() at its own load. A change in Settings saves the choice and reloads the page
// (main.js), and the run restores itself (src/ux/resume.js).
let current = pickLang(saved(), globalThis.navigator?.languages ?? [globalThis.navigator?.language].filter(Boolean));
globalThis.document?.documentElement?.setAttribute('lang', current);

/** Set the language now (tests, and the moment before a reload); `keep` saves it as the player's choice. */
export function setLang(lang, keep = false) {
  if (!LANGS[lang]) return;
  current = lang;
  globalThis.document?.documentElement?.setAttribute('lang', lang);
  if (keep)
    try {
      globalThis.window?.localStorage.setItem(LANG_KEY, lang);
    } catch {}
}

export const getLang = () => current;

/** The words for `key` in the current language, with `vars` filled in. */
export function tr(key, vars = {}) {
  let v = LANGS[current][key] ?? EN[key];
  if (v == null) return key; // a missing key shows itself (test/i18n.test.js catches it)
  if (typeof v === 'object') v = Number(vars.count ?? vars.n) === 1 ? v.one : v.other; // count: when n is shown formatted
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

/** Whether the tables have `key` (optional words, such as a boss's intro line). */
export const has = (key) => key in EN;

/** A number as the language writes it: 1,234.5 in English, 1.234,5 in Vietnamese (up to 3 decimals). */
export const num = (n) => Number(n).toLocaleString(current === 'vi' ? 'vi-VN' : 'en-US');

/** "4th" in English; "4" in Vietnamese, whose sentence puts "thứ" before it. */
export const ordinal = (n) => (current === 'vi' ? String(n) : `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`);

/** "A, B or C" in the language's words. */
export const orList = (items) => (items.length > 1 ? tr('list.or', { head: items.slice(0, -1).join(', '), last: items.at(-1) }) : (items[0] ?? ''));
