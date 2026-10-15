// Photosensitivity safety: no effect may flash the screen in a way known to trigger seizures.
// The rules (WCAG 2.3.1 "Three flashes or below threshold"; ITU-R BT.1702, the Harding test):
// a flash is a pair of opposing changes in relative luminance of 10% or more over a large
// area, and a red flash is a change to or from a saturated red. Large means: the flashes going
// on at the same moment cover a quarter of any 10° of vision. On a phone held at 25 cm that is
// about 11 world units² (16 at a typical 30 cm), and the whole lane field is about one 10° patch.
// Large flashes may come at most 3 times in any second. So:
// - a full-screen wash stays below both thresholds (its alpha is capped by its colour), and comes
//   at most once a second of real time, at any game speed;
// - large flashes above the thresholds (the red edge pulse when a block falls, a pet skill's
//   cut-in panel) share their own budget, also one a second. Washes and flashes together: at
//   most 2 in any second, so effects never stack into a flicker;
// - local effects (rings, explosions, lines, particle bursts, enemies' hit flashes) share a light
//   budget: what they change by 10% or more at the same moment stays under POINT.cap, below a
//   large flash; when it is short, they are drawn smaller, thinner, fewer or not at all;
// - frequent tile glows (a turret's muzzle flash, a heal's green) stay below the thresholds;
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
 * Local effects. A ring grows to at most ringMax (radius) and an explosion is at most boomMax
 * across. Together with lines, bursts and enemies' hit flashes they may light at most `cap`
 * world units² to 10% or more at any moment. A large flash is `large`: a quarter of 10° of
 * vision on a phone held at 25 cm (at a typical 30 cm it is 16). Measured texture shares
 * (pixels lit to 10% or more): the ring 0.19, the brightest explosion frame (fire) 0.28.
 */
export const POINT = { cap: 10, large: 11, ringMax: 2, boomMax: 3.2, minBoom: 1, minRing: 0.5, ringShare: 0.19, boomShare: 0.28 };

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
 * The light budget of local effects, on a clock of real seconds (frame time). Time is cut into
 * frame-long slots (1/60 s) for the next `horizon` seconds; each slot holds the most the booked
 * effects light within it. An effect books its light over its life: a number for one that
 * holds (most), or `lit(s)` (s from 0 to 1, the most at `peak`) for a ring that grows. fit gives
 * the largest share (0–1) of a new effect that keeps every slot it touches under the cap, so
 * the light on screen never passes the cap. A check costs one pass over the effect's slots,
 * however many effects are on screen.
 */
export function createLightBudget({ cap = POINT.cap, fps = 60, horizon = 2 } = {}) {
  const n = Math.ceil(horizon * fps) + 2;
  const slots = new Float64Array(n); // a ring buffer: slot c lives at c % n
  let now = 0;
  let base = 0; // the slot `now` is in
  const at = (c) => c % n;
  /** The most `lit` (a number, or a function of s) lights in slot c, for an effect starting now. */
  function most(lit, life, peak, c) {
    if (typeof lit === 'number') return lit;
    const s0 = Math.max(0, (c / fps - now) / life);
    const s1 = Math.min(1 - 1e-9, ((c + 1) / fps - now) / life);
    let m = Math.max(lit(s0), lit(s1));
    if (peak > s0 && peak < s1) m = Math.max(m, lit(peak));
    return m;
  }
  /** The slots an effect of `life` seconds starting now touches. */
  const last = (life) => Math.min(base + n - 2, Math.floor((now + life) * fps));
  return {
    tick(dt) {
      now += dt;
      const next = Math.floor(now * fps);
      for (let c = base; c < next && c < base + n; c++) slots[at(c)] = 0; // passed slots are reused for the far future
      base = next;
    },
    /** The most lit in the current slot (world units²). */
    get used() {
      return slots[at(base)];
    },
    fit(lit, life, peak = 0) {
      let share = 1;
      for (let c = base, end = last(life); c <= end; c++) {
        const want = most(lit, life, peak, c);
        if (want > 0) share = Math.min(share, Math.max(0, cap - slots[at(c)]) / want);
      }
      return share;
    },
    /** Book an effect: `lit` a number (it holds) or a function of s (a ring). */
    take(lit, life, peak = 0) {
      for (let c = base, end = last(life); c <= end; c++) slots[at(c)] += most(lit, life, peak, c);
    },
    /** Book an effect that lights `lit` for `life` seconds, as much of it as fits. → the share booked (0–1) */
    book(lit, life, minShare = 0) {
      const share = this.fit(lit, life);
      if (share <= minShare || share <= 0) return 0;
      this.take(lit * share, life);
      return share;
    },
    /** Book it whole, or not at all. → whether it fits */
    bookAll(lit, life) {
      if (this.fit(lit, life) < 1) return false;
      this.take(lit, life);
      return true;
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
  const k = Math.sqrt(budget.fit(boomLit(S), life));
  if (S * k < POINT.minBoom) return 0;
  budget.take(boomLit(S * k), life);
  return S * k;
}

/**
 * Lines light their glow stroke, length × width (world units). Lines are lightning, wind slashes,
 * beams and poison spread. The glows are thin by design: a slash 0.3 wide (a 3-lane gust
 * fits the budget), a beam 0.35, a sky bolt 1.1 × the arc's 0.34. They are drawn thinner when
 * the budget is short, and not at all below minShare.
 */
export const LINE = { minShare: 0.2, slash: 0.3, slashCore: 0.1, beam: 0.35, beamCore: 0.1, bolt: 1.1 };

/**
 * A particle burst: each particle lights about perSize2 × size². Two in three are soft dots
 * (64.7% of the texture lit to 10% or more), one in three sparks (15.1%), and sizes spread
 * 0.6–1.4×. A lone spark lights spark × size². Fewer particles when the budget is short.
 */
export const BURST = { perSize2: 0.51, spark: 0.151 };

/** A soft dot (an ember, a meteor trail) lights `share` of its square at alpha 1, and `trail` at the trail's 0.75 (measured). */
export const DOT = { share: 0.647, trail: 0.6 };

/** A damage number lights about `lit` as it pops in at its usual scale (0.36), for `life` seconds; skipped when the budget is short. */
export const NUMBER = { lit: 0.12, scale: 0.36, life: 0.75 };

/** A coin flying to the counter lights about `lit`; n coins fly for life(n) seconds (they leave 0.05 s apart). Fewer fly when the budget is short. */
export const COIN = { lit: 0.15, life: (n) => 0.28 + 0.05 * Math.max(0, n - 1) + 0.45 };

/**
 * Text drawn over the canvas (src/ui/hud.js). A popup lights about `perChar` × its characters ×
 * its font size² in px² (measured with its 5 px outline: 0.31–0.42) for `life` seconds, and books
 * into the light budget: smaller (down to minScale of its font size) when the screen is already
 * lit up, and skipped below that. The combo pill books its box. The big milestone number (rare)
 * takes the flash budget instead.
 */
export const TEXT = { perChar: 0.42, life: 0.9, minScale: 0.6, comboPx: 2600, milestonePx: 72, milestoneLife: 1.6 };

/** The font size (px) of a popup for `tier`. */
export const popupFont = (tier) => Math.min(40, 18 + tier * 1.6);

/** What `text` at `fontPx` lights, in world units² on a stage of `U` px per world unit. */
export const textInk = (text, fontPx, U) => (TEXT.perChar * String(text).length * fontPx * fontPx) / (U * U);

/**
 * An enemy's hit flash, an additive copy of its sprite at `alpha`: it lights `share` of the
 * square it is drawn in (measured on the generated foes: 5–22%). Whole or not at all.
 */
export const FOE_FLASH = { share: 0.25, alpha: 0.75, life: 0.12 };

/** Glows on the board's tiles, below the thresholds: a turret's muzzle flash (additive) and a heal's green tint (its strongest mix). */
export const TILE_GLOW = { muzzle: 0.12, heal: 0.4 };

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
