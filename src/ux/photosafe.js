// Photosensitivity safety: no effect may flash the screen in a way known to trigger seizures.
// The rules (WCAG 2.3.1 "Three flashes or below threshold"; ITU-R BT.1702, the Harding test):
// a flash is a pair of opposing changes in relative luminance of 10% or more over a large
// area, and a red flash is a change to or from a saturated red. Large means: the flashes going
// on at the same moment cover a quarter of any 10° of vision. On a phone held at 25 cm that is
// about 11 world units², and the whole lane field is about one 10° patch. Large flashes may come
// at most 3 times in any second. So:
// - a full-screen wash stays below both thresholds (its alpha is capped by its colour), and comes
//   at most once a second of real time, at any game speed;
// - large flashes above the thresholds (the red edge pulse when a block falls, a pet skill's
//   cut-in panel) share their own budget, also one a second. Washes and flashes together: at
//   most 2 in any second, so effects never stack into a flicker;
// - effects drawn at a point (rings, explosions) are capped and share a light budget: what they
//   change by 10% or more at the same moment stays under POINT.cap, below a large flash;
// - a block under attack holds its red instead of blinking.
// The in-game Reduce motion setting turns washes and large flashes off. tools/flash-audit.mjs
// measures the real event stream against these rules.

export const FLASH = {
  gap: 1, // seconds of real time between two washes, and between two large flashes (the limit is 3 in a second)
  wash: 0.08, // full-screen wash alpha: changes luminance by < 0.08 on any background (a flash is 0.10)
  redWash: 0.04, // a saturated-red wash: (R − G − B) × 320 steps by < 14 even over black, where it turns the screen red (a red flash is 20)
  rise: 0.12, // seconds: a wash fades in ...
  fall: 0.5, // ... and out, never on and off
};

/**
 * Effects drawn at a point. A ring grows to at most ringMax (radius) and an explosion is at most
 * boomMax across. Together they may light at most `cap` world units² to 10% or more at any
 * moment; a large flash is `large` (a quarter of 10° of vision on a phone held at 25 cm).
 * Measured texture shares (pixels lit to 10% or more): the ring 0.19, the brightest explosion
 * frame (fire) 0.28.
 */
export const POINT = { cap: 8, large: 11, ringMax: 2, boomMax: 3.2, minBoom: 1, minRing: 0.5, ringShare: 0.19, boomShare: 0.28 };

/** What a ring growing from r0 to r1 (radii) at `alpha` lights to 10% or more, `s` (0–1) into its life. */
export function ringLitAt(r0, r1, s, alpha = 0.9) {
  if (alpha * Math.min(1, 1.6 * (1 - s)) < 0.1) return 0; // a particle keeps its alpha for 37.5% of its life, then fades
  return POINT.ringShare * (2 * (r0 + (r1 - r0) * s)) ** 2;
}

/** When (0–1 of its life) a ring lights the most: the last moment it is still at 10%. */
export const ringPeak = (alpha = 0.9) => Math.min(1, 1 - 0.0625 / alpha) - 1e-6;

/** The most a ring lights to 10% or more. */
export const ringLit = (r0, r1, alpha = 0.9) => (alpha < 0.1 ? 0 : ringLitAt(r0, r1, ringPeak(alpha), alpha));

/** What an explosion `size` across lights to 10% or more (its brightest frame, for its whole life). */
export const boomLit = (size) => POINT.boomShare * size * size;

/**
 * The light budget of effects drawn at a point, on a clock of real seconds (frame time). An
 * effect books its light over its life as `lit(s)`, s from 0 to 1, lighting the most at `peak`.
 * fit(lit, life, peak) gives the largest share (0–1) of an effect that keeps the total under
 * the cap for all of its life. Rings grow until their peak and explosions hold, so the total
 * is highest just before something ends or fades: it is checked at 20 moments of the effect, at
 * its peak and end, and at the peaks and ends of the effects already on screen.
 */
export function createLightBudget({ cap = POINT.cap } = {}) {
  let now = 0;
  const live = []; // { start, life, lit, peak }
  const at = (t) => {
    let sum = 0;
    for (const e of live) if (t >= e.start && t < e.start + e.life) sum += e.lit((t - e.start) / e.life);
    return sum;
  };
  return {
    tick(dt) {
      now += dt;
      for (let i = live.length - 1; i >= 0; i--) if (live[i].start + live[i].life <= now) live.splice(i, 1);
    },
    /** Lit now (world units²). */
    get used() {
      return at(now);
    },
    fit(lit, life, peak = 0) {
      const end = 1 - 1e-6;
      const moments = [peak, end];
      for (let j = 0; j < 20; j++) moments.push(j / 20);
      for (const e of live) {
        for (const t of [e.start + e.life * e.peak, e.start + e.life * end]) {
          const s = (t - now) / life;
          if (s >= 0 && s < 1) moments.push(s);
        }
      }
      let share = 1;
      for (const s of moments) {
        const want = lit(s);
        if (want <= 0) continue;
        share = Math.min(share, Math.max(0, cap - at(now + s * life)) / want);
      }
      return share;
    },
    take(lit, life, peak = 0) {
      live.push({ start: now, life, lit, peak });
    },
  };
}

/** Book a ring in the budget: radius capped, shrunk to fit (null: none). → { r0, r1 } */
export function fitRing(budget, r0, r1, life, alpha = 0.9) {
  const R1 = Math.min(r1, POINT.ringMax);
  const R0 = Math.min(r0, R1);
  const peak = ringPeak(alpha);
  const k = Math.sqrt(budget.fit((s) => ringLitAt(R0, R1, s, alpha), life, peak)); // light grows with the radius squared
  if (R1 * k < POINT.minRing) return null;
  budget.take((s) => ringLitAt(R0 * k, R1 * k, s, alpha), life, peak);
  return { r0: R0 * k, r1: R1 * k };
}

/** Book an explosion in the budget: capped, shrunk to fit (0: none). → its size */
export function fitBoom(budget, size, life) {
  const S = Math.min(size, POINT.boomMax);
  const k = Math.sqrt(budget.fit(() => boomLit(S), life));
  if (S * k < POINT.minBoom) return 0;
  budget.take(() => boomLit(S * k), life);
  return S * k;
}

/** A block under attack: its red tint holds while hits keep coming (one within `hold` s), then fades over 1 / decay s. */
export const HIT_TINT = { hold: 0.4, decay: 1.6 };

/** The red edge pulse when a block falls (hud.css @keyframes hurt): above the thresholds, so it takes the flash budget. */
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
 * A budget for washes or for large flashes, on a clock of real seconds (frame time, not game
 * time). take(now) → true when one may start now; a refused effect plays without it.
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
