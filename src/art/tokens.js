// Art tokens for the creature layer (the style brief in reports/Art style for 2048
// Siege pets.md): one outline colour, one cream sticker rim, and creature body
// colours per element with a value plan, so fire/earth and ice/metal also differ
// by lightness, not only by hue. Gameplay colours in classes.js stay untouched.
import { ELEMENTS, FUSIONS, fusionKey } from '../sim/classes.js';
import { FUSION_ROSTER } from './fusion-roster.js';

export const INK = '#2b1d2e'; // warm dark plum outline (sits better beside the cream UI than black)
export const CREAM = '#fffaf2'; // sticker rim, number stroke, frames
export const GOLD = '#ffcf4a';
export const BLUSH = '#ff8fa3';

// base = body, shade = the one hard cel tone, light = belly/highlight, accent = motif detail
export const BODY = {
  fire: { base: '#ff7a3d', shade: '#dd4f26', light: '#ffd3ae', accent: '#ffd23f' },
  ice: { base: '#93deff', shade: '#58b3e8', light: '#eefaff', accent: '#ffffff' },
  lightning: { base: '#ffe14d', shade: '#efb31c', light: '#fff7c9', accent: '#ff9f1c' },
  poison: { base: '#9a5ae4', shade: '#7036bf', light: '#e0c8ff', accent: '#c8ff5a' },
  earth: { base: '#a8744a', shade: '#7c5233', light: '#e6c9a2', accent: '#7f9a4f' },
  wind: { base: '#c4f6e6', shade: '#86d8bf', light: '#ffffff', accent: '#7fd6ff' },
  metal: { base: '#8a98ae', shade: '#606d84', light: '#dfe5ee', accent: '#ffcf4a' },
  nature: { base: '#43bd5c', shade: '#2b9145', light: '#cbf5b4', accent: '#ff8fb1' },
};

export const ELEMENT_ORDER = Object.keys(BODY);

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Mix a colour toward white (amt > 0) or black (amt < 0). */
export function tone(hex, amt) {
  const [r, g, b] = toRgb(hex);
  const f = (v) => (amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  return toHex(f(r), f(g), f(b));
}

export function mix(a, b, k) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(...A.map((v, i) => v + (B[i] - v) * k));
}

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Palette for a fusion: its gameplay colour is the dominant body colour. */
export function fusionPalette(a, b) {
  const f = FUSIONS[fusionKey(a, b)];
  const base = f.color;
  const dark = luminance(base) < 0.25;
  return {
    base,
    shade: tone(base, dark ? -0.32 : -0.24),
    light: tone(base, 0.62),
    accent: BODY[a].base,
  };
}

export const elementColor = (el) => ELEMENTS[el].color;

// Pet names for the namecards. A fusion's gameplay name reads as a phenomenon
// ("Plasma"), so it becomes the skill; the pet gets a name of its own, from its animal
// (src/art/fusion-roster.js).
const PET_NAMES = Object.fromEntries(Object.entries(FUSION_ROSTER).map(([k, r]) => [k, r.name]));
export function petName(a, b) {
  const k = fusionKey(a, b);
  return PET_NAMES[k] ?? FUSIONS[k].name.split(' ')[0] + 'ling';
}
