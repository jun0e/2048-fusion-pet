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
// - local effects (rings, explosions, lines, particle bursts, the sprite attacks, enemies' hit
//   flashes) share a light budget: what they change by 10% or more at the same moment stays under
//   POINT.cap, below a large flash; when it is short, they are drawn smaller, thinner, fewer or
//   not at all. Nothing on the field is additive;
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
 * however many effects are on screen. An effect that shows `delay` seconds from now (a slash
 * after the leap, a crater where the meteor lands) books from then, for its life.
 */
export function createLightBudget({ cap = POINT.cap, fps = 60, horizon = 2 } = {}) {
  const n = Math.ceil(horizon * fps) + 2;
  const slots = new Float64Array(n); // a ring buffer: slot c lives at c % n
  let now = 0;
  let base = 0; // the slot `now` is in
  let peak = 0; // the most any slot has held
  const at = (c) => c % n;
  /** The most `lit` (a number, or a function of s) lights in slot c, for an effect starting `delay` s from now. */
  function most(lit, life, peak, c, delay) {
    if (typeof lit === 'number') return lit;
    const t0 = now + delay;
    const s0 = Math.max(0, (c / fps - t0) / life);
    const s1 = Math.min(1 - 1e-9, ((c + 1) / fps - t0) / life);
    let m = Math.max(lit(s0), lit(s1));
    if (peak > s0 && peak < s1) m = Math.max(m, lit(peak));
    return m;
  }
  /** The slots an effect of `life` seconds starting `delay` s from now touches: first … last. */
  const first = (delay) => Math.max(base, Math.floor((now + delay) * fps));
  const last = (life, delay) => Math.min(base + n - 2, Math.floor((now + delay + life) * fps));
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
    fit(lit, life, peak = 0, delay = 0) {
      let share = 1;
      for (let c = first(delay), end = last(life, delay); c <= end; c++) {
        const want = most(lit, life, peak, c, delay);
        if (want > 0) share = Math.min(share, Math.max(0, cap - slots[at(c)]) / want);
      }
      return share;
    },
    /** Book an effect: `lit` a number (it holds) or a function of s (a ring), from `delay` s on. */
    take(lit, life, top = 0, delay = 0) {
      for (let c = first(delay), end = last(life, delay); c <= end; c++) {
        slots[at(c)] += most(lit, life, top, c, delay);
        peak = Math.max(peak, slots[at(c)]);
      }
    },
    /** The most any frame has been booked to light so far (world units²): never above the cap. */
    get peak() {
      return peak;
    },
    /** Book an effect that lights `lit` for `life` seconds (from `delay` s on), as much of it as fits. → the share booked (0–1) */
    book(lit, life, minShare = 0, delay = 0) {
      const share = this.fit(lit, life, 0, delay);
      if (share <= minShare || share <= 0) return 0;
      this.take(lit * share, life, 0, delay);
      return share;
    },
    /** Book it whole, or not at all. → whether it fits */
    bookAll(lit, life, delay = 0) {
      if (this.fit(lit, life, 0, delay) < 1) return false;
      this.take(lit, life, 0, delay);
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
 * Lines light their stroke, length × width (world units): a beam (a heal reaching its block, a
 * namecard reaching its pet) 0.35 wide at most. They are drawn thinner when the budget is short,
 * and not at all below minShare (the sprite attacks' links and tethers too). slash and bolt are
 * the old wind slash and sky bolt, which tools/flash-audit.mjs still draws for its 'before' rows.
 */
export const LINE = { minShare: 0.2, slash: 0.3, slashCore: 0.1, beam: 0.35, beamCore: 0.1, bolt: 1.1 };

/**
 * A particle burst: each particle lights about perSize2 × size². Two in three are soft dots
 * (64.7% of the texture lit to 10% or more), one in three sparks (15.1%), and sizes spread
 * 0.6–1.4×. A lone spark lights spark × size². Fewer particles when the budget is short.
 */
export const BURST = { perSize2: 0.51, spark: 0.151 };

/** A soft dot (a status ember or bubble) lights `share` of its square at alpha 1 (measured). */
export const DOT = { share: 0.647 };

/** A damage number lights about `lit` as it pops in at its usual scale (0.36), for `life` seconds; skipped when the budget is short. */
export const NUMBER = { lit: 0.12, scale: 0.36, life: 0.75 };

/** A coin flying to the counter lights about `lit`; n coins fly for life(n) seconds (they leave 0.05 s apart). Fewer fly when the budget is short. */
export const COIN = { lit: 0.15, life: (n) => 0.28 + 0.05 * Math.max(0, n - 1) + 0.45 };

/**
 * The sprite attacks (src/art/attack-vfx.js plans them; src/render/attacks.js, shots.js and
 * trails.js draw them): solid sticker shapes in normal blend, none additive. An appearing sprite
 * lights a share of its box (w × h world units) to 10% or more: its opaque share, measured per
 * piece on the code-drawn fallbacks trimmed to their shape (attack-vfx.js PIECE_LIT), times this
 * margin for a generated sprite drawn fuller than its fallback. A line (a lightning link, a
 * harpoon's tether, a drip rope) lights its length × width × its share. Outside the budget,
 * because they move rather than flash: projectiles and what rides with them, ribbons and
 * afterimages. Under Reduce motion a ribbon fades in place instead, and books.
 */
export const VFX_MARGIN = 1.2;

/** What an appearing sprite w × h (world units) lights to 10% or more, at `share` of its box. */
export const spriteLit = (w, h, share) => Math.max(0, w) * Math.max(0, h) * share;

/**
 * Ground decals (scorch, frost, splat, crack, streak, crater): each fades in over `rise`, holds
 * `hold` and fades out over `fall`, at `alpha`. Its rise and its fall are more than a second
 * apart, so a decal never makes a flash pair on its own: it books its area for its rise.
 */
export const DECAL = { rise: 0.25, hold: 1.1, fall: 0.9, alpha: 0.85 };

/**
 * Text drawn over the canvas (src/ui/hud.js). A popup lights about `perChar` × its characters ×
 * its font size² in px² (measured with its 5 px outline: 0.31–0.42) for `life` seconds, and books
 * into the light budget: smaller (down to minScale of its font size) when the screen is already
 * lit up, and skipped below that. They book `peak` × their ink: the float-up pops to 1.1× (the
 * combo pill to 1.12×). The combo pill books its box. The big milestone number (rare) takes the
 * flash budget instead.
 */
export const TEXT = { perChar: 0.42, life: 0.9, peak: 1.25, minScale: 0.6, comboPx: 2600, milestonePx: 72, milestoneLife: 1.6 };

/** The font size (px) of a popup for `tier`. */
export const popupFont = (tier) => Math.min(40, 18 + tier * 1.6);

/** What `text` at `fontPx` lights, in world units² on a stage of `U` px per world unit. */
export const textInk = (text, fontPx, U) => (TEXT.peak * TEXT.perChar * String(text).length * fontPx * fontPx) / (U * U);

/**
 * An enemy's hit flash: a white silhouette of its sprite over it at `alpha`, in normal blend
 * (src/render/foes.js). It lights `share` of the square it is drawn in (foe-roster.js foeDrawSize,
 * squared): measured 2026-10-16 on the 17 generated foes at GEN_FILL 1, over every ground and body
 * tint, 21–46% (the Horned Owl the most); booked at the most, plus 1% for the crawl's squash.
 * Whole or not at all.
 */
export const FOE_FLASH = { share: 0.47, alpha: 0.75, life: 0.12 };

/**
 * A foe on the keep stands on a pale contact patch instead of its dark shadow (src/render/foes.js),
 * so a dark foe still reads on the dark floor: the lane's sand at `alpha` changes the keep's floor
 * and pits by under 9% (gamma space), so the patch's fade in and out over `fade` s is never a
 * flash. It moves with its foe.
 */
export const FOE_PATCH = { color: 0xd9c7a3, alpha: 0.28, fade: 0.3 };

/**
 * Glows on the board's tiles, below the thresholds, all in normal blend: a turret's muzzle flash
 * (a white silhouette of its tile, changing any colour's luminance by at most 6%), a heal's green
 * tint (its strongest mix) and a class glow (a soft dot in the element colour under the tile, at
 * most `glow`: under 9% over the keep's floor even for the palest fusion colour, #e0f7ff in the
 * classic style, and a legend's colours take turns within 7%).
 */
export const TILE_GLOW = { muzzle: 0.12, heal: 0.4, glow: 0.22 };

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

/**
 * How much an overlay of `color` at `alpha` in normal blend changes the luminance of `ground`
 * (0xRRGGBB both). WebGL blends the stored sRGB values (gamma space), not linear light, so a
 * dark overlay on a light ground changes it more than its alpha suggests. → |ΔY| (0–1)
 */
export function overlayStep(ground, color, alpha) {
  const ch = (sh) => toLinear((((ground >> sh) & 255) * (1 - alpha) + ((color >> sh) & 255) * alpha) / 255);
  return Math.abs(0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0) - luminance(ground));
}

/** A tinted texel (0xRRGGBB): the texture's colour times the tint, as the renderer multiplies them (sRGB). */
export const tinted = (texel, tint) => [16, 8, 0].reduce((c, sh) => c | (Math.round((((texel >> sh) & 255) * ((tint >> sh) & 255)) / 255) << sh), 0);

/**
 * Venom puddles (src/render/shots.js) book nothing, so they stay below the threshold: over every
 * ground a puddle can lie on (the chapters' lane tones and hedges; the walls and the keep are drawn
 * over it), none of its tinted texels changes the luminance by `step` or more at any alpha up to
 * its own, which is at most `alpha` (a stain, not a haze). It fades in over `rise` s of real time,
 * holds at least `hold` s, then dries over at least `fall` s, so its rise and its fall are more
 * than a second apart at any game speed.
 */
export const PUDDLE = { step: 0.09, alpha: 0.16, rise: 0.4, hold: 1.2, fall: 0.6 };

/** The alpha a puddle of `tint` may have: the largest (to 0.005) that keeps every texel over every ground under PUDDLE.step. */
export function puddleAlpha(tint, texels, grounds) {
  const colors = texels.map((x) => tinted(x, tint));
  let ok = 0;
  for (let a = 0.005; a <= PUDDLE.alpha + 1e-9; a += 0.005) {
    for (const g of grounds) for (const c of colors) if (overlayStep(g, c, a) >= PUDDLE.step) return ok;
    ok = Math.round(a * 1000) / 1000;
  }
  return ok;
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
