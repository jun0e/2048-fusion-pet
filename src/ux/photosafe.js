// Photosensitivity safety: no effect may flash the screen in a way known to trigger seizures.
// The rules (WCAG 2.3.1 "Three flashes or below threshold"; ITU-R BT.1702, the Harding test):
// a flash is a pair of opposing changes in relative luminance of 10% or more over a large
// area (about a quarter of the central 10° of vision: on a phone, a palm-sized patch), and a
// red flash is a change to or from a saturated red. Large flashes may come at most 3 times in
// any second. So:
// - a full-screen wash stays below both thresholds (its alpha is capped by its colour);
// - large flashes (washes, the red edge pulse when a block falls) share one budget, one per
//   second of real time at any game speed, so effects never stack into a flicker;
// - an impact's flash dot stays small; a block under attack holds its red instead of blinking.
// The in-game Reduce motion setting turns all of them off. tools/flash-audit.mjs measures
// the real event stream against these rules.

export const FLASH = {
  gap: 1, // seconds of real time between large flashes (the limit is 3 in a second)
  wash: 0.08, // full-screen wash alpha: changes luminance by < 0.08 on any background (a flash is 0.10)
  redWash: 0.04, // a saturated-red wash: (R − G − B) × 320 steps by < 14 even over black, where it turns the screen red (a red flash is 20)
  rise: 0.12, // seconds: a wash fades in ...
  fall: 0.5, // ... and out, never on and off
};

/** An impact's flash dot: small, softer and a little longer, so many of them never add up to a large flash. */
export const FLASH_DOT = { maxSize: 2.4, alpha: 0.6, life: 0.24 };

/** A block under attack: its red tint holds while hits keep coming (one within `hold` s), then fades over 1 / decay s. */
export const HIT_TINT = { hold: 0.4, decay: 1.6 };

/** The red edge pulse when a block falls (hud.css @keyframes hurt): above the thresholds, so it takes the budget. */
export const HURT_PULSE = { color: 0xff3b3b, alpha: 0.35, seconds: 0.6 };

/** Full-screen washes of the legendary signatures (by effect); the others have none. */
export const SIGNATURE_TINT = { globalBurn: 0xff7a3d, globalFreeze: 0x7fd4ff, vortex: 0xbff7e6, contagion: 0xb46cff, gild: 0xffd34a, bloom: 0x4cd964 };

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** Linear-light channels (0–1) of a 0xRRGGBB colour. */
export function linear(color) {
  return { r: toLinear(((color >> 16) & 255) / 255), g: toLinear(((color >> 8) & 255) / 255), b: toLinear((color & 255) / 255) };
}

/** Relative luminance (0–1). */
export function luminance(color) {
  const { r, g, b } = linear(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A saturated red (ITU-R BT.1702): R / (R + G + B) ≥ 0.8 in linear light. */
export function isSaturatedRed(color) {
  const { r, g, b } = linear(color);
  return r + g + b > 0 && r / (r + g + b) >= 0.8;
}

/** The alpha a full-screen wash of `color` may have (the request, capped below the flash thresholds). */
export const washAlpha = (color, want = 1) => Math.min(want, isSaturatedRed(color) ? FLASH.redWash : FLASH.wash);

/**
 * The shared budget for large flashes, on a clock of real seconds (frame time, not game time).
 * take(now) → true when a large flash may start now; a refused effect plays without its flash.
 */
export function createFlashGuard({ gap = FLASH.gap } = {}) {
  let last = -Infinity;
  return {
    take(now) {
      if (now - last < gap) return false;
      last = now;
      return true;
    },
  };
}

/** A wash's alpha `t` seconds after it started: up over FLASH.rise, down over FLASH.fall. */
export function washLevel(peak, t) {
  if (t < 0) return 0;
  if (t < FLASH.rise) return peak * (t / FLASH.rise);
  const k = (t - FLASH.rise) / FLASH.fall;
  return k >= 1 ? 0 : peak * (1 - k) * (1 - k);
}
