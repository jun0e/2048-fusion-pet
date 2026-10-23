// The phone floors (docs/ux/phone-readability.md): text and buttons that read at arm's length.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meterLabelHtml, meterState, popupPx, POPUP_MIN_PX } from '../src/ui/hud.js';
import { NUMBER, TEXT, numberLight, numberLit, numberScale, numberText, popupFont } from '../src/ux/photosafe.js';
import { cardWidth, railLayout } from '../src/kv/namecards.js';
import { numberTint, tabularDigits } from '../src/render/fx.js';
import { FOE_TEXT_MIN_PX, NUMBER_HALF, foeLabels } from '../src/render/foes.js';
import { ELEMENTS, ELEMENT_KEYS, fusionOf } from '../src/sim/classes.js';
import { POINT } from '../src/ux/photosafe.js';
import { audit } from '../tools/flash-audit.mjs';
import { TIER_COLORS } from '../src/config.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const SHEETS = ['src/ui/hud.css', 'src/ui/inspect.css', 'src/kv/kv.css'];

/** Every rule as { sel: [selectors], decls, body } (comments dropped; the rules inside @media too). */
function rules(text) {
  const out = [];
  for (const m of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    // split a selector list at its own commas, not those inside :is(…) or :where(…)
    out.push({ sel: m[1].split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, ' ')), decls, body: m[2] });
  }
  return out;
}
const ALL = SHEETS.flatMap((f) => rules(read(f)).map((r) => ({ ...r, file: f })));
const fontPx = (decls) => {
  const v = decls['font-size'] ?? decls.font;
  const m = v?.match(/(\d+(?:\.\d+)?)px/);
  return m ? Number(m[1]) : null;
};
/** Every font size set for a selector, in any rule that lists it (grouped selectors and media queries included). */
const sizesOf = (sel) => ALL.filter((r) => r.sel.includes(sel)).map((r) => fontPx(r.decls)).filter((px) => px != null);
const declOf = (sel, prop) => ALL.filter((r) => r.sel.includes(sel) && r.decls[prop] != null).map((r) => r.decls[prop]);

// what may stay smaller: the developer's Autoplay toggle (?dev) and the key-visual demo's switcher (?kv)
const EXEMPT = /auto-btn|kv-style/;

/** Hold every size a selector is ever given to a floor; the selector must set one somewhere. */
function floor(selectors, px, what) {
  for (const sel of selectors) {
    const sizes = sizesOf(sel);
    assert.ok(sizes.length, `${sel}: no font size set (${what})`);
    for (const s of sizes) assert.ok(s >= px, `${sel}: ${s} px in one of its rules, under the ${px} px ${what} floor`);
  }
}

test('no text on the run screen is set under 13 px, in any rule or media query', () => {
  const small = ALL.filter((r) => !r.sel.some((s) => EXEMPT.test(s)) && fontPx(r.decls) != null && fontPx(r.decls) < 13);
  assert.deepEqual(small.map((r) => `${r.file} ${r.sel.join(', ')}: ${fontPx(r.decls)} px`), []);
});

test('the primary numbers are 20 px or more in every rule, in Baloo 2 ExtraBold', () => {
  floor(['.score-card .score', '.coins', '.day-num', '.meter-num', '.castle-hp', '.fight-t', '.speed-btn'], 20, 'primary');
  assert.deepEqual(declOf('.coins', 'font-weight'), ['800'], 'the coins in ExtraBold, not the bold a <b> would give');
  assert.deepEqual(declOf('.coins', 'font-family'), ['var(--font-display)']);
  // the old pattern this guards against: a narrow-phone override that sets the lintel's numbers small
  const old = rules('@media (width <= 380px) { .meter-label, .castle-hp, .day-n { font-size: 13px; } }');
  assert.ok(old[0].sel.includes('.castle-hp') && fontPx(old[0].decls) === 13, 'a grouped override is read per selector');
});

test('labels and body text are 14 px or more, secondary text 13 px, button labels 16 px', () => {
  floor(['.boss-intro-kicker', '.boss-intro-line', '.cost', '.banner-sub', '.meter-label', '.day-n', '.announce .part', '.announce i', '.announce b', '.choice-head p', '.new-best', '.go-extra', '.help-card dl', '.coach-text', '.kv-card.ready .kv-bar b', '.kv-cutin-text span', '.rotate-card span', '.trait-line'], 14, 'label');
  // v2.1: a stat chip's number beside its icon, a strength's word under its icon
  floor(['.score-card .best', '.best-wave', '.chapter', '.stat .label', '.combo small', '.announce-kicker', '.top-chip small', '.stat-chip', '.trait small'], 13, 'secondary');
  floor(['.coach-ok', '.coach-skip', '.switch', '.primary', '.soft', '.danger', '.fight', '.banner-title'], 16, 'button label');
});

test('buttons are 48 px, their icons 24 px', () => {
  assert.deepEqual(declOf('.icon-btn', 'width'), ['48px']);
  assert.deepEqual(declOf('.icon-btn', 'height'), ['48px']);
  assert.deepEqual(declOf('.icon-btn svg', 'width'), ['24px']);
  assert.deepEqual(declOf('.fight', 'height'), ['48px']);
  for (const sel of ['.soft', '.danger', '.primary', '.coach-ok', '.coach-skip', '.help-replay', '.switch']) assert.deepEqual(declOf(sel, 'min-height'), ['48px'], sel);
  // the block card's Sell / Break and Details: 48 px tall, 16 px labels
  for (const sel of ['.inspect-sell', '.inspect-more']) {
    assert.deepEqual(declOf(sel, 'min-height'), ['48px'], sel);
    floor([sel], 16, 'button label');
  }
});

test("the lintel's countdown and foes count: the numbers in their own spans, the words as they were", () => {
  assert.equal(meterLabelHtml('In 14s'), 'In <b class="meter-num">14</b>s');
  assert.equal(meterLabelHtml(meterState({ phase: 'wave', left: 12, total: 20 }).label), '<b class="meter-num">12</b> left');
  assert.equal(meterLabelHtml(meterState({ phase: 'prep', timer: 3, holding: true }).label), 'Ready?');
  assert.equal(meterLabelHtml('Defeat'), 'Defeat');
});

test("the boss's lintel on a narrow phone gives the record's room to the boss bar", () => {
  const css = read('src/ui/hud.css');
  const narrow = css.slice(css.lastIndexOf('@media (width <= 380px)'));
  assert.match(narrow.slice(0, narrow.indexOf('\n}\n')), /\.lintel\.face \.best-wave \{\s*display: none;/);
  assert.match(read('src/ui/hud.js'), /lintelEl\.classList\.toggle\('face', !meterFace\.hidden\)/);
});

test('a popup is booked at no less than its 14 px floor, and drawn at what it booked', () => {
  assert.equal(POPUP_MIN_PX, TEXT.minPx);
  for (let tier = 1; tier <= 16; tier++) {
    // the least share main.js asks the light budget for: at or above the floor, or nothing
    const least = Math.max(TEXT.minScale, TEXT.minPx / popupFont(tier)) ** 2;
    assert.ok(popupPx(tier, Math.sqrt(least)) >= POPUP_MIN_PX - 1e-6, `tier ${tier}: a popup booked at its least is drawn`);
    for (const scale of [0.6, 0.7, 0.8, 0.9, 1]) {
      const px = popupPx(tier, scale);
      assert.ok(px === 0 || px >= POPUP_MIN_PX, `tier ${tier} at ${scale}: ${px} px`);
      if (px) assert.equal(px, popupFont(tier) * scale, 'drawn at the size the budget booked');
    }
  }
  assert.equal(popupPx(1, 0.6), 0, 'a "+2" at the budget\'s old smallest scale (11.8 px) is not drawn');
  assert.match(read('src/main.js'), /Math\.max\(TEXT\.minScale, TEXT\.minPx \/ popupFont\(tier\)\) \*\* 2/, 'main.js books a popup it would not draw at nothing');
});

test('a damage number is drawn at its px floor on a phone, and books that size in the light budget', () => {
  for (const U of [19.14, 23.78, 25.14, 29.17, 33, 36.83]) {
    for (const kind of ['hit', 'small', 'crit']) {
      const s = numberScale(kind, U);
      assert.ok(s * U >= NUMBER.minPx[kind] - 1e-9, `${kind} at U ${U}: ${(s * U).toFixed(1)} px`);
      assert.ok(s >= NUMBER.scales[kind], 'never smaller than its world scale');
      assert.ok(Math.abs(numberLit(s, '8') - numberLit(NUMBER.scale, '8') * (s / NUMBER.scale) ** 2) < 1e-12, 'booked at the size drawn');
    }
  }
  // on a 360 × 640 phone a hit is drawn at 15 px (0.63 world units) and books 3.1× the light it would at 0.36
  assert.ok(Math.abs(numberScale('hit', 23.78) * 23.78 - 15) < 1e-9);
  assert.ok(numberLit(numberScale('hit', 23.78), '8') > 3 * numberLit(NUMBER.scale, '8'));
  // a tablet's U draws them at their world scale: the floors bind on phones only
  assert.equal(numberScale('hit', 60), NUMBER.scales.hit);
  assert.ok(NUMBER.minPx.hit >= NUMBER.minPx.small && NUMBER.minPx.small >= 14);
  // fx.js and the flash audit share the one sizing and the one text
  assert.match(read('src/render/fx.js'), /numberScale\(crit \? 'crit' : small \? 'small' : 'hit', stage\.view\.U\)/);
  assert.match(read('src/render/fx.js'), /const text = numberText\(amount, \{ prefix, crit \}\);\s*if \(!light\.bookAll\(numberLight\(scale, text\), NUMBER\.life\)\) return;/);
  assert.match(read('src/render/fx.js'), /n\.t\.text = text;/);
  assert.match(read('tools/flash-audit.mjs'), /budget\.bookAll\(numberLight\(numberScale\(kind, phoneU\), text\), NUMBER\.life\)/);
});

test('a damage number books the light of every glyph in it, popping in then settled', () => {
  const s = NUMBER.scale;
  // a 3-character number books twice a 1-digit one or more (each glyph lights its own ink)
  for (const [three, one] of [['815', '8'], ['+12', '5'], ['1.2k', '7'], ['999', '9'], ['12k', '4']]) {
    assert.ok(numberLit(s, three) >= 2 * numberLit(s, one), `"${three}" ${numberLit(s, three).toFixed(3)} vs "${one}" ${numberLit(s, one).toFixed(3)}`);
  }
  assert.ok(numberLit(s, '888') >= 3 * numberLit(s, '8') - 1e-12);
  // the sum is never under what the glyphs light together (measured: the union is 92–100% of it)
  const union = { 8: 0.1422, 15: 0.2291, 88: 0.2725, 815: 0.3696, 888: 0.403, 8888: 0.5329, '1.2k': 0.3817, '888k': 0.5241, '+888': 0.4878, '+8.8k': 0.5106 };
  for (const [text, lit] of Object.entries(union)) assert.ok(numberLit(s, text) >= lit, `"${text}" books ${numberLit(s, text).toFixed(4)}, lights ${lit}`);
  // its text as fx.js draws it
  assert.equal(numberText(7.4), '7');
  assert.equal(numberText(1234), '1.2k');
  assert.equal(numberText(56789), '57k');
  assert.equal(numberText(12, { prefix: '+' }), '+12');
  // over its life: the pop's peak while it pops in, then a 1.45² smaller settled size
  const light = numberLight(s, '815');
  assert.equal(light(0), numberLit(s, '815'));
  assert.equal(light(NUMBER.popShare - 1e-6), numberLit(s, '815'));
  assert.ok(Math.abs(light(0.5) - numberLit(s, '815') / NUMBER.pop ** 2) < 1e-12);
  // the audit books the texts the game draws: hits (a crit bigger, with "!", as main.js draws it), "+" coins, and the burn and poison dealt
  const audit = read('tools/flash-audit.mjs');
  assert.match(audit, /numbers: \[e\.crit \? \['crit', numberText\(e\.amount, \{ crit: true \}\)\] : \['hit', numberText\(e\.amount\)\]\]/);
  assert.match(read('src/main.js'), /fx\.number\(e\.x, e\.y \+ 0\.35, e\.amount, \{ color: big \? hex\(e\.colors\.at\(-1\)\) : 0xffffff, crit: big \}\)/);
  assert.match(audit, /numbers: \[\['small', numberText\(e\.amount, \{ prefix: '\+' \}\)\]\]/);
  assert.match(audit, /numbers\.push\(\['small', numberText\(burn\)\]\)/);
});

test('with the floors, on a 360 × 640 phone, the local effects still never make a large flash', () => {
  const rows = audit({ seeds: 1, minutes: 4, stressSeconds: 60, speeds: [1, 4], U: 23.78 });
  for (const r of rows.filter((x) => x.policy === 'photosafe')) {
    assert.equal(r.point.pointPerSecond, 0, `x${r.speed}: a large flash from local effects`);
    assert.ok(r.pointPeak <= POINT.cap + 1e-9, `x${r.speed}: ${r.pointPeak.toFixed(2)} units² lit at once`);
    assert.ok(r.trimmed.kinds.number?.asked > 0, 'damage numbers were booked');
  }
});

test("the boss's health number and its status badges never touch, at any phone's U", () => {
  // what is drawn, measured on the bitmap font: a number's box is 1.055 em tall about its anchor
  const half = (px) => px * NUMBER_HALF;
  for (const U of [19.14, 23.78, 25.14, 29.17, 33, 36.83, 50]) {
    for (const boss of [true, false]) {
      const barH = (boss ? 0.2 : 0.13) * U;
      const barY = -40;
      const lab = foeLabels({ U, boss, barY, barH });
      const barTop = barY - (barH + 0.06 * U) / 2;
      const under = boss ? Math.min(barTop, barY - half(lab.hpPx)) : barTop; // the top of what is drawn under the row
      const rowBottom = lab.y + Math.max(lab.bs / 2, half(lab.badgePx));
      assert.ok(rowBottom <= under - 1, `U ${U}${boss ? ' (boss)' : ''}: the badge row ends at ${rowBottom.toFixed(1)}, what is under it starts at ${under.toFixed(1)}`);
      assert.ok(lab.bs >= 2 * half(lab.badgePx), `U ${U}: the badge's icon (${lab.bs.toFixed(1)} px) is as tall as its count`);
      assert.ok(lab.hpPx >= FOE_TEXT_MIN_PX.hp && lab.badgePx >= FOE_TEXT_MIN_PX.badge);
    }
  }
  // the regression this replaces: the row at barY − 0.36·U with 0.42·U icons met the 16 px health
  // number on every phone (7.3 px over it at U 23.78)
  const U = 23.78;
  const oldBottom = -0.36 * U + Math.max(0.21 * U, half(14));
  assert.ok(oldBottom > -half(16), 'the old placement overlapped');
  assert.match(read('src/render/foes.js'), /v\.badges\.position\.set\(-bx \/ 2 \+ bs \/ 2, lab\.y\)/);
});

test('every coloured damage number reads 4.5:1 or more against its own (tinted) stroke', () => {
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = (c) => 0.2126 * lin((c >> 16) & 255) + 0.7152 * lin((c >> 8) & 255) + 0.0722 * lin(c & 255);
  const times = (a, b) => [16, 8, 0].reduce((c, sh) => c | (Math.round((((a >> sh) & 255) * ((b >> sh) & 255)) / 255) << sh), 0);
  const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
  const colors = new Set(['#7a3fa8', '#8d6e63', '#d6452f', '#7b61ff', '#ff9a4d', '#c99bff', '#ffd34a', ...TIER_COLORS.filter(Boolean)]);
  for (const k of ELEMENT_KEYS) colors.add(ELEMENTS[k].color);
  for (const a of ELEMENT_KEYS) for (const b of ELEMENT_KEYS) if (a !== b) colors.add(fusionOf({ element: a, fusion: b })?.color);
  colors.delete(undefined);
  for (const c of colors) {
    const tint = numberTint(c);
    const r = ratio(tint, times(0x2b1d2a, tint)); // the tint colours the glyph and its ink stroke alike
    assert.ok(r >= 4.5, `${c} → #${tint.toString(16)}: ${r.toFixed(2)}:1 against its stroke`);
  }
  assert.equal(numberTint(0xffffff), 0xffffff, 'a plain hit stays white');
  assert.match(read('src/render/fx.js'), /n\.t\.tint = numberTint\(color\)/, 'fx.js tints its numbers so');
});

test('the bitmap digits are tabular: a counting number keeps its width', () => {
  const font = { chars: { '0': { xAdvance: 26.7, xOffset: -7, kerning: {} }, '1': { xAdvance: 17.3, xOffset: -7, kerning: { '1': -1, k: 2, ',': -1.3 } }, '7': { xAdvance: 22, xOffset: -7, kerning: {} }, ',': { xAdvance: 9, xOffset: -7, kerning: { '1': -1.3, k: 1 } }, k: { xAdvance: 24, xOffset: -7, kerning: { '1': -1 } } } };
  tabularDigits(font);
  for (const d of ['0', '1', '7']) assert.equal(font.chars[d].xAdvance, 26.7, `"${d}" as wide as "0"`);
  assert.ok(Math.abs(font.chars['1'].xOffset - (-7 + 4.7)) < 1e-9, 'the narrow glyph is centred in its wider cell');
  assert.equal(font.chars['1'].kerning['1'], undefined, 'no kerning between digits');
  assert.equal(font.chars['1'].kerning[','], undefined, 'nor against a separator ("1,225")');
  assert.equal(font.chars[','].kerning['1'], undefined, 'either way round');
  assert.equal(font.chars['1'].kerning.k, 2, 'kerning against letters stays');
  assert.equal(font.chars[','].kerning.k, 1);
  assert.equal(font.chars.k.xAdvance, 24, 'letters keep their advance');
  assert.match(read('src/render/fx.js'), /chars: \[\['0', '9'\], '\.', ','/, 'the separators are installed with the font, before tabularDigits');
  // a font without its digits is an error, not a quiet no-op: BitmapFont.install returns nothing in Pixi 8
  assert.throws(() => tabularDigits(undefined), /no "0"/);
  assert.throws(() => tabularDigits({ chars: {} }), /no "0"/);
  const fx = read('src/render/fx.js');
  assert.match(fx, /const dmg = BitmapFontManager\.install\(\{/, 'the font comes from BitmapFontManager.install, which returns it');
  assert.match(fx, /tabularDigits\(dmg\);/);
  assert.doesNotMatch(fx, /BitmapFont\.install\(/);
});

test('the ribbon measures its title with tabular digits, on a canvas (no hidden box, no forced layout)', () => {
  assert.match(read('src/ui/hud.js'), /replace\(\/\[0-9\]\/g, '0'\)/);
  assert.doesNotMatch(read('src/ui/hud.js'), /ribbon-probe/);
  assert.doesNotMatch(read('src/ui/hud.css'), /ribbon-probe/);
});

test('a popup has a plain colour where color-mix() is missing', () => {
  const body = ALL.find((r) => r.sel.includes('.popup')).body;
  assert.ok(/color:\s*#fff;/.test(body) && body.indexOf('color: #fff') < body.indexOf('color-mix'), 'color: #fff before the color-mix()');
});

test('the namecards: 48 px where the tower allows, never under 44, and their badges inside the portrait', () => {
  assert.equal(cardWidth(360), 48);
  assert.equal(cardWidth(390), 48);
  assert.equal(cardWidth(430), 52);
  // a 360 × 640 phone (U 23.78): the tower is too short for four cards and the keep leaves no room
  // beside it, so the rail stays on the tower and runs on past the parapet, at 48 px
  const r = railLayout({ vw: 360, towerX: 279.9, towerOut: 337, keepX: 294.6, top: 112.4, parapet: 332.3, floor: 575 });
  assert.equal(r.width, 48);
  assert.ok(r.left >= 279.9 + 2 && r.left + r.width <= 337, `on the tower: ${r.left}..${r.left + r.width}`);
  assert.ok(r.top + 4 * (r.width + 14) + 3 * 6 <= 575, 'four cards above the deck row');
  // a tower narrower than a 48 px card: as wide as it allows, never under the 44 px floor
  assert.equal(railLayout({ vw: 360, towerX: 300, towerOut: 350, keepX: 320, top: 100, parapet: 300, floor: 560 }).width, 46);
  assert.equal(railLayout({ vw: 360, towerX: 310, towerOut: 350, keepX: 320, top: 100, parapet: 300, floor: 560 }).width, 44);
  // the badges fit inside the portrait's 3 px rim on the narrowest card (44 px: 38 px inside)
  const px = (v) => Number(String(v).replace('px', ''));
  const inner = 44 - 2 * 3;
  const gap = (sel) => px(declOf(sel, 'gap').at(-1) ?? 0);
  const left = (sel) => px(declOf(sel, 'left').at(-1) ?? 0);
  const two = px(declOf('.kv-glyphs img', 'width')[0]);
  assert.ok(left('.kv-glyphs') + 2 * two + gap('.kv-glyphs') <= inner, `a fusion's two badges: ${2 * two} px`);
  const legendSel = '.kv-card.legend .kv-glyphs';
  const three = px(declOf(`${legendSel} img`, 'width')[0]);
  assert.ok(left(legendSel) + 3 * three + 2 * gap(legendSel) <= inner, `a legend's three badges: ${3 * three} px in ${inner}`);
});
