// Generated VFX sprites for the basic attacks (the visual overhaul, proposal sections 5 and 6):
// one image per piece, made by tools/pipeline.mjs as `vfx.<element>.<piece>` and used by the
// renderer (src/render/shots.js, attacks.js, trails.js). Pure data, plus the attack ladder below.
//
//   tint  true: drawn cream-white with a light grey cel tone, so the renderer tints it with the
//         element's colour (or a fusion's): the "first element's shape in the fusion colour" rule.
//         false: full colour, used as drawn.
//   kind  body (moves: a projectile or an attack's travelling shape), bit (small particle or
//         add-on), burst (an impact shape, scaled and faded in code), decal (lies on the ground,
//         seen from directly above)
//   desc  the subject, oriented so code can rotate it: directional pieces point to the right
//   pal   colours for a full-colour piece when the element palette lacks them (smoke greys)
//   aspect  a wide canvas ('21:9') for a long thin piece, so the model keeps it long (crack, tendril)
//   bg    the key colour, when the element's own (tools/pipeline-jobs.mjs BG_FOR) is in the piece:
//         the pink blossom keys on green, not on nature's magenta

import { DEFENSE, FIELD } from '../config.js';
import { ELEMENTS, FUSIONS, grownElement, growthOf } from '../sim/classes.js';
import { DECAL, LINE, VFX_MARGIN, spriteLit } from '../ux/photosafe.js';
import { foeDrawSize } from './foe-roster.js';

export const VFX_PIECES = {
  fire: {
    tongue: { kind: 'body', tint: true, desc: 'a single flame tongue lying on its side: a wide teardrop of fire whose round base is at the left and whose three wavy tips lick to the right' },
    ember: { kind: 'bit', desc: 'one small rounded ember: a glowing coal drop, orange with a yellow core' },
    smoke: { kind: 'bit', pal: ['#5A5052', '#8A8082', '#B5ADAE'], desc: 'one soft round puff of dark grey smoke made of three overlapping round lobes' },
    burst: { kind: 'burst', desc: 'a flame burst: a star of five rounded fire petals, red-orange outside and yellow inside' },
    scorch: { kind: 'decal', desc: 'a scorch mark: an irregular dark brown-black burnt patch with a few small orange embers on its rim' },
  },
  ice: {
    harpoon: { kind: 'body', tint: true, desc: 'a narrow crystal harpoon pointing to the right: a long sharp faceted ice spearhead on a short crystal shaft' },
    shard: { kind: 'bit', desc: 'one small sharp ice crystal shard, light blue with white facets' },
    block: { kind: 'bit', desc: 'one cube of clear ice seen slightly from the front: pale blue faces, white highlight edges, a few frosty cracks' },
    burst: { kind: 'burst', desc: 'a crystal shatter: a star of sharp ice shards flying outward from the centre, light blue and white' },
    frost: { kind: 'decal', desc: 'a frost patch: a pale blue icy splotch with small snowflake crystals' },
  },
  lightning: {
    link: { kind: 'body', tint: true, desc: 'one chunky zigzag lightning bolt segment lying horizontally from left to right, with three sharp zigzags and blunt ends' },
    spark: { kind: 'bit', desc: 'one four-pointed electric spark star, yellow with a white core' },
    burst: { kind: 'burst', desc: 'an electric burst: a ring of short zigzag sparks around an empty centre, yellow and white' },
  },
  poison: {
    glob: { kind: 'body', tint: true, desc: 'a round wobbly blob of venom flying to the right, with a short drip tail trailing behind it to the left' },
    drip: { kind: 'bit', desc: 'one small drop of acid-green venom' },
    bubble: { kind: 'bit', desc: 'one round venom bubble, acid green with a white highlight' },
    splat: { kind: 'decal', desc: 'a venom splat: an acid-green splash puddle with a ring of droplets around it' },
  },
  earth: {
    pebble: { kind: 'bit', desc: 'one small round pebble rock, warm brown with a lighter top' },
    dust: { kind: 'bit', desc: 'one puff of sandy dust cloud, beige, made of three overlapping round lobes' },
    stars: { kind: 'bit', desc: 'three small bone-cream stars in a little ring: the dizzy stars of a stunned cartoon character' },
    crack: { kind: 'decal', aspect: '21:9', desc: 'a ground crack: ONE long thin jagged dark crack line lying horizontally, about five times as long as it is wide, splitting into two small forks at the right end, a few tiny pebbles along it; no patch of rubble around it' },
  },
  wind: {
    swirl: { kind: 'body', tint: true, desc: 'a curling wind gust: a thick spiral swirl at the right with a long tapering tail streaming to the left' },
    feather: { kind: 'bit', desc: 'one soft feather lying diagonally, mint green and white' },
    streak: { kind: 'decal', desc: 'a wind streak lying horizontally: a long pale mint smear with three speed lines' },
  },
  metal: {
    slash: { kind: 'body', tint: true, desc: 'a claw slash: three parallel curved slash strokes like a big cat’s scratch, running diagonally from the upper left to the lower right' },
    glint: { kind: 'bit', desc: 'one gold glint: a four-pointed gold sparkle star' },
  },
  nature: {
    arc: { kind: 'body', tint: true, desc: 'a quarter circle of thorny bramble vine: a thick curved vine with sharp thorns and two small leaves, bending through a 90-degree arc from the bottom left to the top right' },
    tendril: { kind: 'bit', aspect: '21:9', desc: 'one long thin green vine tendril lying horizontally from left to right, about five times as long as it is tall, gently wavy, with one small curl at the right tip and a single leaf near the middle' },
    leaf: { kind: 'bit', desc: 'one small green leaf' },
    blossom: { kind: 'bit', bg: 'green', desc: 'one small five-petal blossom, pink and white with a cream centre' },
  },
};

/** Every generated VFX sprite id, e.g. vfx.fire.tongue. */
export const VFX_IDS = Object.entries(VFX_PIECES).flatMap(([el, pieces]) => Object.keys(pieces).map((p) => `vfx.${el}.${p}`));

// --- the attack ladder (proposal section 6) ---------------------------------------------------
//
// Every stage adds exactly one visible thing to an attack (a piece, a trail layer or a second
// motion), the way a pet adds one motif piece per stage; reach, counts and size also grow with
// the sim (classes.js grow(s), +6% a tier). Stages are keyed by the tile's value: 16, 64 (32 and
// 64), 128, 256 (a fusion: v2 fusions use it at any value) and 4096 (the apex: v2's pure form poses as it). A block's tier is log2 of
// its value (config.js tierValue): 16 is tier 4, 128 tier 7, 256 tier 8, 4096 tier 12.
// Fusion rule: the first element's shape in the fusion colour, plus the partner element's add-on
// layer (ADDON). Apex: the attack echoes once in the apex element's colour.

export const STAGES = ['16', '64', '128', '256', '4096'];
export const STAGE_NAMES = { 16: '16', 64: '32–64', 128: '128', 256: '256 fusion', 4096: '4096 apex' };

/** The partner's add-on in a fusion's attack: one layer of its bits riding the first element's shape. */
export const ADDON = {
  fire: { piece: 'ember', says: 'embers' },
  ice: { piece: 'shard', says: 'frost shards' },
  lightning: { piece: 'spark', says: 'a spark crackle' },
  poison: { piece: 'drip', says: 'drips' },
  earth: { piece: 'pebble', says: 'pebbles' },
  wind: { piece: 'feather', says: 'feathers' },
  metal: { piece: 'glint', says: 'blade glints' },
  nature: { piece: 'leaf', says: 'leaves' },
};

/** How the pet's body sells the stage (blocks.js, kv/roam.js): its wind-up before a shot, from defense.cooldownLeft. */
export const PET_POSE = { 16: 'hop', 64: 'crouch', 128: 'recoil', 256: 'lunge', 4096: 'dial' };
/** Seconds of wind-up before a shot: sim time at x1, and real time at any speed (windUpAt). */
export const WIND_UP = 0.12;

/**
 * How far into its wind-up a pet is (0–1), from the sim's cooldown left (sim seconds). The wind-up
 * lasts WIND_UP s of real time at any game speed (`rate`: sim seconds per real second, so at x4 it
 * starts 0.48 s of sim time before the shot), but at most half the shot's `period` (sim seconds),
 * so a fast turret still shows its shot between two wind-ups.
 */
export function windUpAt(left, rate = 1, period = Infinity) {
  const span = Math.min(WIND_UP * Math.max(1, rate), 0.5 * period);
  return left > 0 && left <= span ? 1 - left / span : 0;
}

/**
 * The game speed as the renderer sees it: sim seconds per real second, from the sim clock each
 * frame, smoothed over about 0.25 s (it falls toward 0 while paused).
 */
export function createSimRate() {
  let last = null;
  let rate = 1;
  return {
    update(simTime, dt) {
      if (last != null && dt > 0) rate += (Math.max(0, simTime - last) / dt - rate) * Math.min(1, dt / 0.25);
      last = simTime;
      return rate;
    },
    get rate() {
      return rate;
    },
  };
}

// stage by stage: `adds` (the one new thing; the 16 lists its base set), what the player sees,
// and the counts that stage uses (they carry up the ladder)
const STEPS = {
  fire: [
    { adds: ['embers'], says: '3 embers fly up the 2-cell cone', embers: 3 },
    { adds: 'tongue', says: 'a flame tongue rolls up the cone', embers: 4 },
    { adds: 'scorch', says: 'the lick leaves a smoking scorch mark on the lane', embers: 6, smoke: 2 },
    { adds: 'addon', says: 'the tongue takes the fusion colour and the partner’s add-on rides its edge', addon: 3 },
    { adds: 'echo', says: 'a second lick follows in the apex colour' },
  ],
  ice: [
    { adds: ['ping', 'harpoon', 'tether', 'shatter'], says: 'a ping ring closes on the toughest foe; a harpoon on a tether follows and shatters on it' },
    { adds: 'ghosts', says: 'the harpoon leaves an afterimage (2 ghosts)', ghosts: 2 },
    { adds: 'escorts', says: 'two ice shards escort the harpoon', escorts: 2 },
    { adds: 'addon', says: 'the harpoon in the fusion colour carries the partner’s add-on at its tip', addon: 3 },
    { adds: 'echo', says: 'a ribbon in the apex colour streams behind the harpoon' },
  ],
  lightning: [
    { adds: ['links'], says: 'one chain of bolt links jumps to 3 foes', sparks: 0 },
    { adds: 'sparks', says: 'sparks cling to every struck foe', sparks: 2 },
    { adds: 'twin', says: 'the chain runs twin links side by side' },
    { adds: 'addon', says: 'fusion-coloured links with the partner’s add-on at each strike', addon: 1 },
    { adds: 'echo', says: 'a third strand of links in the apex colour' },
  ],
  poison: [
    { adds: ['glob', 'splat', 'puddle'], says: 'a venom glob arcs over, splats and leaves a puddle' },
    { adds: 'drips', says: 'the glob drips as it flies', drips: 6 },
    { adds: 'split', says: 'the glob splits in two as it lands' },
    { adds: 'addon', says: 'a fusion-coloured glob and puddle with the partner’s add-on', addon: 2 },
    { adds: 'echo', says: 'a ribbon in the apex colour streams behind the glob' },
  ],
  earth: [
    { adds: ['cracks', 'dust'], says: 'the stomp cracks each lane it covers and sends a dust wave up them', dust: 2 },
    { adds: 'pebbles', says: 'pebbles hop out of the cracks', pebbles: 2 },
    { adds: 'wave2', says: 'a second dust wave follows the first' },
    { adds: 'addon', says: 'fusion-coloured cracks with the partner’s add-on in the dust', addon: 3 },
    { adds: 'echo', says: 'a third wave rolls in the apex colour' },
  ],
  wind: [
    { adds: ['ribbon', 'feathers'], says: 'a gust ribbon races up the lane with a feather in it', feathers: 1 },
    { adds: 'streak', says: 'pushed foes slide back over a wind streak', feathers: 3 },
    { adds: 'side', says: 'the gust fans out: the neighbouring lanes get ribbons at 45% width', feathers: 5 },
    { adds: 'addon', says: 'the ribbon in the fusion colour carries the partner’s add-on', addon: 3 },
    { adds: 'echo', says: 'a second ribbon in the apex colour spirals around the first' },
  ],
  metal: [
    { adds: ['leap', 'slash'], says: 'the cub leaps onto its prey and claws it' },
    { adds: 'ghosts', says: 'the leap leaves an afterimage (3 ghosts)', ghosts: 3 },
    { adds: 'glint', says: 'a gold glint marks the prey' },
    { adds: 'addon', says: 'a fusion-coloured slash with the partner’s add-on', addon: 2 },
    { adds: 'echo', says: 'a second slash crosses the first in the apex colour' },
  ],
  nature: [
    { adds: ['arc', 'pricks'], says: 'a bramble arc sweeps once around the tile; thorns prick what it roots', pricks: 2 },
    { adds: 'tendrils', says: 'vine tendrils reach the rooted foes', tendrils: 3 },
    { adds: 'blossoms', says: 'three blossoms open on the ring', blossoms: 3 },
    { adds: 'addon', says: 'the ring in the fusion colour with the partner’s add-on on the blossoms', addon: 3 },
    { adds: 'echo', says: 'a second arc sweeps the other way in the apex colour' },
  ],
};

export const has = (step, layer) => step.layers.includes(layer);

/** The ladder stage of a block's attack: from its tier (log2 of its value) and its class. */
export function ladderStage(tier, kind = 'single') {
  if (kind === 'apex') return '4096';
  if (kind === 'fusion') return '256';
  const g = growthOf(tier); // 0 at 16 … 3 at 128 (classes.js)
  return g >= 3 ? '128' : g >= 1 ? '64' : '16';
}

const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const ELEMENT_BY_COLOR = new Map(Object.entries(ELEMENTS).map(([k, e]) => [hex(e.color), k]));
const FUSION_BY_COLOR = new Map(Object.values(FUSIONS).map((f) => [hex(f.color), f]));

/**
 * The class behind an attack, from the colours its events carry (classes.js profileFor: one
 * element colour, one fusion colour, or a fusion colour and the apex colour) and its first
 * element (its shape). → { kind: 'single' | 'fusion' | 'apex' | 'plain', first, partner, apex, tint, apexTint }
 */
export function attackClass(colors = [], first = null) {
  const c0 = colors.length ? hex(colors[0]) : 0xd9d2c5;
  const fu = FUSION_BY_COLOR.get(c0);
  if (fu) {
    const apex = colors.length > 1 ? ELEMENT_BY_COLOR.get(hex(colors[1])) ?? null : null;
    const lead = first && fu.parts.includes(first) ? first : fu.parts[0];
    return { kind: apex ? 'apex' : 'fusion', first: lead, partner: fu.parts.find((p) => p !== lead), apex, tint: c0, apexTint: apex ? hex(colors[1]) : null };
  }
  const el = ELEMENT_BY_COLOR.get(c0);
  if (el) return { kind: 'single', first: el, partner: null, apex: null, tint: c0, apexTint: null };
  return { kind: 'plain', first: null, partner: null, apex: null, tint: c0, apexTint: null };
}

/** Bodies and impacts grow 6% a tier (from 16), as the old shots did. */
export const growOf = (tier) => 1 + 0.06 * (Math.max(4, Math.min(14, tier ?? 4)) - 4);

/**
 * Sizes in world units (1 cell = 2 u; a foe is about 1 u): bodies 0.3–0.6 u, smaller than what
 * they hit; impacts 0.8–1.6 u. [length, width] for pieces that point along their motion: the
 * renderer fits a sprite inside its box, keeping the sprite's own shape.
 */
export const VFX_SIZE = {
  ember: 0.2, smoke: 0.5, tongue: [1.0, 0.62], scorch: 0.85, burst: 1.0,
  harpoon: [0.6, 0.2], shard: 0.24, ping: 0.9, frost: 0.8, block: 0.95, tether: 0.07,
  link: [0.9, 0.2], spark: 0.26, star: 0.8,
  glob: 0.45, drip: 0.16, bubble: 0.16, splat: 1.0, pebble: 0.2,
  dust: 0.5, stars: [0.6, 0.36], crack: 0.36,
  swirl: 0.7, feather: 0.32, ribbon: 0.35, streak: 0.36, rope: 0.16,
  slash: 0.8, glint: 0.34, leaf: 0.22, blossom: 0.34, poof: 1.1, addon: 0.22,
};

/** The most a piece swells over its life (the renderer's grow), so its plan books its biggest moment. */
export const VFX_GROW = { tongue: 1.15, burst: 1.1, slash: 1.1, poof: 1.15, block: 1.35, blossom: 1.1, glint: 1.2, dust: 1.25, spark: 1.2, splat: 1.25, split: 1.2 };
/** A bit (a pooled particle) is drawn up to this much bigger than asked. */
export const BIT_JITTER = 1.15;
/** The bramble arc's mid radius as a share of its sprite's width (the arc sweeps at the pulse's radius). */
export const ARC_MID = 0.8;
/**
 * Long pieces are drawn to a length with their own shape: the renderer fits the sprite inside a
 * box that long and VFX_ASPECT × that tall, and the plan books the box. A sprite thinner than the
 * box (the generated crack is 0.23 as tall as it is long, the tendril 0.16) reaches the full
 * length; a fatter one is drawn shorter, never squashed or stretched.
 */
export const VFX_ASPECT = { crack: 0.36, tendril: 0.2 };

/**
 * What share of each piece's box is opaque (alpha over 10%, so it may light to 10% or more on any
 * ground), trimmed to its shape: the larger of the code-drawn fallback and the generated sprite,
 * measured as the game makes it ready (levelled when slanted, the arc turned; textures.js
 * readyVfx), rounded up (2026-10-16, after the crack and tendril were made long and thin and every
 * vfx.* sprite was re-posted). ping, poof, ribbon, dot (a soft particle: DOT.share, measured on
 * its luminance) and tether are the code-made support pieces. In the game, textures.js measures
 * every generated sprite again at startup and raises its share here if it is fuller (noteLit);
 * test/vfx-lit.test.js measures the sprites on disk against this table.
 */
export const PIECE_LIT = {
  'fire.tongue': 0.82, 'fire.ember': 0.81, 'fire.smoke': 0.8, 'fire.burst': 0.63, 'fire.scorch': 0.74,
  'ice.harpoon': 0.71, 'ice.shard': 0.75, 'ice.block': 0.97, 'ice.burst': 0.59, 'ice.frost': 0.8,
  'lightning.link': 0.72, 'lightning.spark': 0.38, 'lightning.burst': 0.53,
  'poison.glob': 0.71, 'poison.drip': 0.68, 'poison.bubble': 0.82, 'poison.splat': 0.6,
  'earth.pebble': 0.8, 'earth.dust': 0.77, 'earth.stars': 0.54, 'earth.crack': 0.51,
  'wind.swirl': 0.57, 'wind.feather': 0.64, 'wind.streak': 0.79,
  'metal.slash': 0.51, 'metal.glint': 0.36,
  'nature.arc': 0.36, 'nature.tendril': 0.5, 'nature.leaf': 0.78, 'nature.blossom': 0.71,
  ping: 0.33, poof: 0.67, ribbon: 0.88, dot: 0.65, tether: 1,
};
const measured = new Map(); // id → the opaque share of the generated sprite in this game
/** A generated sprite's opaque share, measured as it loads (textures.js): a fuller one books more. */
export function noteLit(id, share) {
  if (share > 0 && share <= 1) measured.set(id, Math.max(measured.get(id) ?? 0, share));
}
/** The share a piece books: its opaque share × VFX_MARGIN (a generated sprite may be fuller), rounded up to 0.05, at most 1. */
export const pieceLit = (id) => Math.min(1, Math.ceil((Math.max(PIECE_LIT[id] ?? 1, measured.get(id) ?? 0) * VFX_MARGIN - 1e-9) * 20) / 20);

// each element's main piece and its size in world units at 16 (VFX_SIZE: [length, width])
const MAIN = { fire: 'tongue', ice: 'harpoon', lightning: 'link', poison: 'glob', earth: 'crack', wind: 'ribbon', metal: 'slash', nature: 'arc' };
const STAGE_TIER = { 16: 4, 64: 6, 128: 7, 256: 8, 4096: 12 }; // the stage's typical tier (64 also stands for 32)

/** The main piece's size (u) at a stage: bodies grow 6% a tier; the crack, the ribbon and the arc follow the sim's reach. */
function mainSize(el, scale, reach) {
  const S = VFX_SIZE;
  switch (MAIN[el]) {
    case 'crack':
      return [Math.min(reach, 5) * 0.5 * scale, Math.min(reach, 5) * 0.5 * scale * VFX_ASPECT.crack];
    case 'ribbon':
      return [reach, S.ribbon];
    case 'arc':
      return [reach, reach]; // a quarter ring of that radius
    case 'glob':
      return [S.glob * scale, S.glob * scale];
    case 'slash':
      return [S.slash * scale, S.slash * scale];
    default:
      return S[MAIN[el]].map((v) => v * scale);
  }
}

/**
 * Each stage: what it adds, every layer it shows (the stages below plus that one), its counts,
 * its body scale, the sim's reach there (grown: classes.js grow(s); fusions fully grown) and its
 * main piece's size, world units.
 */
function climb(el, steps) {
  const out = {};
  let prev = { layers: [] };
  STAGES.forEach((stage, i) => {
    const { adds, ...rest } = steps[i];
    const added = [].concat(adds);
    const scale = growOf(STAGE_TIER[stage]);
    const shoot = grownElement(el, i >= 3 ? 3 : growthOf(STAGE_TIER[stage])).shoot;
    const reach = shoot.reach ?? shoot.radius;
    prev = Object.freeze({ ...prev, ...rest, stage, adds: added.join(' + '), layers: [...prev.layers, ...added], scale, reach, main: MAIN[el], size: mainSize(el, scale, reach) });
    out[stage] = prev;
  });
  return out;
}
/** LADDER[element][stage]: the attack's look at that stage (layers, counts, sizes, what the player sees). */
export const LADDER = Object.fromEntries(Object.entries(STEPS).map(([el, steps]) => [el, climb(el, steps)]));
/** Lives (seconds) the plan books and the renderer draws. */
export const VFX_TIME = {
  ember: 0.45, tongue: 0.32, lick: 0.1, smoke: 0.9, ping: 0.3, burst: 0.26, link: 0.22, spark: 0.3,
  slash: 0.26, leap: 0.16, glint: 0.45, arc: 0.5, tendril: 0.45, blossom: 0.55, prick: 0.35,
  dust: 0.5, pebble: 0.55, wave2: 0.15, feather: 0.6, ribbon: 0.36, stars: 0.5, block: 0.4,
  poof: 0.3, drip: 0.5, addon: 0.5, rope: 0.45, flight: 0.6, meteor: 0.28,
};

/** Which piece an element's impact shows (the burst sprite where the element has one). */
export const IMPACT_PIECE = { fire: 'burst', ice: 'burst', lightning: 'burst', poison: 'splat', earth: 'dust', wind: 'swirl', metal: 'slash', nature: 'blossom' };
/** Which decal an element's hit leaves (none for the others). */
export const IMPACT_DECAL = { fire: 'scorch', ice: 'frost', poison: 'splat', earth: 'crack' };
/** The event that carries each element's attack (impact: Horn Arc's chain, Venom Spit's landing). */
export const ATTACK_EVENT = { fire: 'breath', ice: 'ping', lightning: 'impact', poison: 'impact', earth: 'quake', wind: 'gust', metal: 'pounce', nature: 'pulse' };
const EVENT_ELEMENT = { breath: 'fire', ping: 'ice', quake: 'earth', gust: 'wind', pounce: 'metal', pulse: 'nature' };

const S = VFX_SIZE;
const T = VFX_TIME;
const G = VFX_GROW;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const polyline = (pts) => pts.slice(1).reduce((sum, q, i) => sum + dist(pts[i], q), 0);
// The items the renderer books (and tools/flash-audit.mjs counts), each the box it draws at its
// biggest: n bits (fewer when the budget is short), n whole pieces (fewer), a sprite (smaller), a
// small sprite (whole or not at all), a decal's rise (smaller), a line (thinner). `id` names the
// piece for its share. `delay`: the item shows that long after the event (a slash once the cub
// lands, a crater where the meteor hits), so it books from then, for its life.
const bits = (key, id, n, size, life, delay = 0) => ({ key, kind: 'bits', n, lit: n * pieceLit(id) * (size * BIT_JITTER) ** 2, life, delay });
const pieces = (key, id, n, w, h, life, delay = 0) => ({ key, kind: 'bits', n, lit: n * spriteLit(w, h, pieceLit(id)), life, delay });
const sprite = (key, id, w, h, life, grow = 1, delay = 0) => ({ key, kind: 'sprite', lit: spriteLit(w * grow, h * grow, pieceLit(id)), life, min: 0.25, delay });
const whole = (key, id, w, h, life, grow = 1, delay = 0) => ({ key, kind: 'sprite', lit: spriteLit(w * grow, h * grow, pieceLit(id)), life, all: true, delay });
const decal = (key, id, w, h, grow = 1, n = 1, delay = 0) => ({ key, kind: 'decal', lit: n * spriteLit(w * grow, h * grow, pieceLit(id)), life: DECAL.rise, min: 0.25, delay });
const line = (key, id, len, width, life, delay = 0) => ({ key, kind: 'line', lit: len * width * pieceLit(id), life, min: LINE.minShare, delay });
const addonId = (el) => `${el}.${ADDON[el].piece}`;
const addonBits = (partner, n, life = T.addon, size = S.addon, delay = 0, key = 'addon') => bits(key, addonId(partner), n, size, life, delay);
/** A bit (a pooled particle) lives between LIFE_JITTER and 1 × the life its plan books: never longer. */
export const LIFE_JITTER = 0.85;
/** A thrown glob sheds its drips (32+) `drip` s apart from its throw, then its fusion add-on bits `addon` s apart (real time). */
export const SHED = { drip: 0.08, addon: 0.14 };
/**
 * Tempest's sky strike: a bolt from the gates (`top` below the spawn line, up to `spread` to
 * either side of the foe) down onto it in `segments`, each bend up to `bend` off the straight line.
 */
export const STRIKE = { top: 0.3, spread: 1, bend: 0.4, segments: 4 };
/** The longest a strike's bolt can be (world units, before the links' overlap): every bend at its widest. */
export function strikeLength(e) {
  const dy = Math.abs(FIELD.spawnY - STRIKE.top - e.y) / STRIKE.segments;
  let sum = 0;
  for (let i = 0; i < STRIKE.segments; i++) {
    const bends = (i > 0 ? 1 : 0) + (i < STRIKE.segments - 1 ? 1 : 0); // the two ends do not bend
    sum += Math.hypot(dy, STRIKE.spread / STRIKE.segments + bends * STRIKE.bend);
  }
  return sum;
}
/** A pulse's thorns and tendrils go to at most this many of the foes it struck. */
export const PULSE_FOES = 4;
/** Plague's drip rope sags this far (world units) at its middle: it is at most 2 × ROPE_SAG longer than the gap it spans. */
export const ROPE_SAG = 0.35;
/** The Meteor signature: it falls for VFX_TIME.meteor s trailing `smoke` puffs `gap` s apart (each `smokeLife` s), then its crater, dust and pebbles (`land` s). */
export const METEOR = { smoke: 6, gap: 0.045, smokeLife: 0.9, land: 0.7 };
/** Lanes a lane attack covers (its own and up to `lanes` each side, on the field). */
export const lanesOf = (lane, lanes = 0) => {
  const out = [];
  for (let l = lane - lanes; l <= lane + lanes; l++) if (l >= 0 && l < FIELD.lanes) out.push(l);
  return out;
};
/** How long a harpoon takes to reach a foe `d` away (sim: projectileSpeed × Echo Harpoon's speed). */
export const harpoonFlight = (d) => d / (DEFENSE.turret.projectileSpeed * (ELEMENTS.ice.shoot.speed ?? 1));
/** Links overlap a little where they meet (the renderer draws each 8% longer). */
export const LINK_OVERLAP = 1.08;
/** How long a gust's ribbon is, from its block's front edge (y0) up to the gates. */
export const gustLength = (e) => Math.max(0.6, Math.min(e.reach, FIELD.spawnY - 0.2 - (e.y + 0.6)));
/** How long a quake's cracks are (each lane's crack, world units at tier growth g). */
export const crackLength = (e, g) => Math.min(e.reach, 5) * 0.5 * g;

/**
 * What an attack event looks like and lights: its element, class, ladder stage and the items
 * it books in the light budget (src/ux/photosafe.js), in the order the renderer asks for them.
 * src/render/attacks.js and shots.js draw from this; tools/flash-audit.mjs counts the same.
 * `reduced` (Reduce motion): ribbons fade in place instead of racing, so they book; a pounce's
 * slash and a bite's second slash do not wait for the leap, and the blossoms open together.
 * → { el, cls, stage, step, g, items } or null (nothing drawn)
 */
export function attackLight(e, { reduced = false } = {}) {
  const late = (d) => (reduced ? 0 : d);
  const ctx = (el, colors, tier) => {
    const cls = attackClass(colors, el);
    const stage = ladderStage(tier ?? 4, cls.kind);
    return { el, cls, stage, step: LADDER[el]?.[stage] ?? null, g: growOf(tier), items: [] };
  };
  switch (e.type) {
    case 'breath': {
      const p = ctx('fire', e.colors, e.tier);
      const { step, g, cls } = p;
      p.items.push(bits('embers', 'fire.ember', step.embers, S.ember * g, T.ember));
      if (has(step, 'tongue')) p.items.push(sprite('tongue', 'fire.tongue', S.tongue[0] * g, S.tongue[1] * g, T.tongue, G.tongue));
      if (has(step, 'scorch')) p.items.push(decal('scorch', 'fire.scorch', S.scorch * g, S.scorch * g), bits('smoke', 'fire.smoke', step.smoke, S.smoke + 0.2, T.smoke));
      if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon));
      if (has(step, 'echo')) p.items.push(sprite('echo', 'fire.tongue', S.tongue[0] * g * 0.9, S.tongue[1] * g * 0.9, T.tongue, G.tongue, T.lick));
      return p;
    }
    case 'ping': {
      // the ring closes on the prey: its biggest moment is the first, booked for its life
      const p = ctx('ice', e.colors, e.tier);
      p.items.push({ key: 'ping', kind: 'ring', lit: spriteLit(2 * S.ping, 2 * S.ping, pieceLit('ping')), life: T.ping, min: 0.2 });
      return p;
    }
    case 'fire': {
      // a thrown shot: the harpoon's tether, what it sheds on its way (the bodies move: not booked)
      if (e.pattern !== 'spit' && e.pattern !== 'lance') return null;
      const p = ctx(e.pattern === 'spit' ? 'poison' : 'ice', e.colors, e.tier);
      const d = e.target ? dist(e, e.target) : 0;
      if (e.pattern === 'lance') p.items.push(line('tether', 'tether', d, S.tether, harpoonFlight(d) + 0.1));
      // what it sheds on the way, on the SHED schedule: drips from the throw, then the add-on's bits
      const drips = has(p.step, 'drips') ? p.step.drips : 0;
      if (drips) p.items.push(bits('drips', 'poison.drip', drips, S.drip, (drips - 1) * SHED.drip + T.drip));
      if (has(p.step, 'addon')) p.items.push(addonBits(p.cls.partner, p.step.addon, (p.step.addon - 1) * SHED.addon + T.addon, 0.2, drips * SHED.drip));
      return p;
    }
    case 'impact': {
      if (e.area) return null; // area attacks draw their own shape (the cases here)
      const el = e.element ?? null;
      const p = ctx(el, e.colors, e.tier);
      const { step, g, cls } = p;
      if (e.chain && e.chain.length > 1) {
        // a chain: links between the struck foes (Horn Arc's whole look, a fusion's jumps)
        const strands = el === 'lightning' && step && has(step, 'twin') ? 2 : 1;
        const len = polyline(e.chain) * LINK_OVERLAP;
        p.items.push(line('links', 'lightning.link', len * strands, S.link[1] * (strands > 1 ? 0.8 : 1), T.link));
        if (el === 'lightning' && step) {
          const struck = e.chain.length - 1;
          if (has(step, 'sparks')) p.items.push(bits('sparks', 'lightning.spark', step.sparks * struck, S.spark * G.spark, T.spark));
          if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon * struck));
          if (has(step, 'echo')) p.items.push(line('echo', 'lightning.link', len, S.link[1] * 0.7, T.link));
        }
      }
      if (e.kind === 'zap' || e.kind === 'pounce') return p; // the chain and the pounce's slash are the hit
      const miss = e.miss ? 0.7 : 1;
      if (el === 'poison') {
        const w = S.splat * g * miss;
        p.items.push(decal('splat', 'poison.splat', w, w, G.splat), bits('splash', 'poison.drip', 3, S.drip, T.drip));
        if (step && has(step, 'split') && !e.miss) p.items.push(decal('split', 'poison.splat', S.splat * g * 0.6, S.splat * g * 0.6, G.split, 2));
      } else {
        const size = S.burst * g * miss * (e.kind === 'skill' ? 1.25 : 1);
        p.items.push(sprite('burst', el ? `${el}.${IMPACT_PIECE[el]}` : 'earth.dust', size, size, T.burst, G.burst));
      }
      if (el && IMPACT_DECAL[el] && el !== 'poison' && !e.miss) {
        const w = S.frost * g;
        p.items.push(decal('mark', `${el}.${IMPACT_DECAL[el]}`, w, el === 'earth' ? w * VFX_ASPECT.crack : w));
      }
      if (step && has(step, 'addon') && !e.miss) p.items.push(addonBits(cls.partner, 2, T.addon, S.addon, 0, 'hitAddon')); // its own key: a chain above may book 'addon'
      return p;
    }
    case 'gust': {
      const p = ctx('wind', e.colors, e.tier);
      const { step, cls } = p;
      p.items.push(bits('feathers', 'wind.feather', step.feathers, S.feather, T.feather));
      if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon));
      if (reduced) {
        // Reduce motion: the ribbons hold still and fade, so they book (racing ones move: exempt)
        const lanes = lanesOf(e.lane, e.lanes).filter((l) => l === e.lane || has(step, 'side'));
        const width = lanes.reduce((w, l) => w + (l === e.lane ? 1 : 0.45), 0) * S.ribbon * (has(step, 'echo') ? 1.55 : 1);
        p.items.push(sprite('ribbonFade', 'ribbon', gustLength(e), width, T.ribbon));
      }
      return p;
    }
    case 'pulse': {
      const p = ctx('nature', e.colors, e.tier);
      const { step, cls } = p;
      const box = e.radius / ARC_MID;
      const foes = Math.min(PULSE_FOES, e.hits ?? PULSE_FOES); // thorns and tendrils go to the foes this pulse struck
      p.items.push(sprite('arc', 'nature.arc', box, box, T.arc), bits('pricks', 'nature.leaf', step.pricks * foes, S.leaf, T.prick));
      if (has(step, 'tendrils')) {
        // each tendril reaches from 0.7 out to a foe at most r + 0.8 away, drawn to its length with its own shape
        const L = e.radius + 0.1;
        p.items.push(pieces('tendrils', 'nature.tendril', Math.min(step.tendrils, foes), L, L * VFX_ASPECT.tendril, T.tendril));
      }
      // the blossoms open one after another as the arc passes (together under Reduce motion)
      const open = has(step, 'blossoms') ? late((T.arc * (step.blossoms - 1)) / step.blossoms) : 0;
      if (has(step, 'blossoms')) p.items.push(bits('blossoms', 'nature.blossom', step.blossoms, S.blossom * G.blossom, open + T.blossom));
      if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon, open + T.blossom));
      if (has(step, 'echo')) p.items.push(sprite('echo', 'nature.arc', box, box, T.arc));
      return p;
    }
    case 'quake': {
      const p = ctx('earth', e.colors, e.tier);
      const { step, g, cls } = p;
      const n = lanesOf(e.lane, e.lanes).length;
      const crack = crackLength(e, g);
      const wave = (key, delay) => bits(key, 'earth.dust', step.dust * n, S.dust * G.dust, T.dust, delay);
      p.items.push(decal('cracks', 'earth.crack', crack, crack * VFX_ASPECT.crack, 1, n), wave('dust', 0));
      if (has(step, 'pebbles')) p.items.push(bits('pebbles', 'earth.pebble', step.pebbles * n, S.pebble, T.pebble));
      if (has(step, 'wave2')) p.items.push(wave('wave2', T.wave2));
      if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon));
      if (has(step, 'echo')) p.items.push(wave('echo', 2 * T.wave2));
      return p;
    }
    case 'pounce': {
      const p = ctx('metal', e.colors, e.tier);
      const { step, g, cls } = p;
      const w = S.slash * g;
      const land = late(T.leap); // the cub lands, then claws
      p.items.push(sprite('slash', 'metal.slash', w, w, T.slash, G.slash, land));
      if (has(step, 'glint')) p.items.push(whole('glint', 'metal.glint', S.glint, S.glint, T.glint, G.glint, land + 0.05));
      if (has(step, 'addon')) p.items.push(addonBits(cls.partner, step.addon, T.addon, S.addon, land));
      if (has(step, 'echo')) p.items.push(sprite('echo', 'metal.slash', w, w, T.slash, G.slash, land + 0.06));
      return p;
    }
    // statuses and the rest of the war: drawn the same at every stage
    case 'strike': {
      const p = ctx('lightning', ['#ffe14d'], 12);
      p.items.push(line('links', 'lightning.link', strikeLength(e) * LINK_OVERLAP, S.link[1], T.link + 0.06), sprite('burst', 'lightning.burst', S.star, S.star, T.burst, G.burst), bits('sparks', 'lightning.spark', 2, S.spark, T.spark));
      return p;
    }
    case 'kill': {
      const size = S.poof * foeDrawSize({ ...e.enemy?.def, boss: e.boss }); // the foe as drawn: what attacks.js puffs
      return { el: null, cls: null, stage: null, step: null, g: 1, items: [sprite('poof', 'poof', size, size, T.poof, G.poof), bits('bits', 'dot', e.boss ? 18 : 6, e.boss ? 0.34 : 0.24, 0.5)] };
    }
    case 'stun':
      return { el: 'earth', items: [whole('stars', 'earth.stars', S.stars[0], S.stars[1], T.stars)] };
    case 'freeze':
      return { el: 'ice', items: [sprite('block', 'ice.block', S.block, S.block, T.block, G.block), decal('frost', 'ice.frost', S.frost, S.frost)] };
    case 'bite': {
      const w = S.slash * 1.4;
      return { el: 'metal', items: [sprite('slash', 'metal.slash', w, w, T.slash, G.slash), sprite('cross', 'metal.slash', w, w, T.slash, G.slash, late(0.06)), bits('glints', 'metal.glint', 2, S.glint, T.glint)] };
    }
    case 'weaken':
      return { el: 'poison', items: [bits('drips', 'poison.drip', 3, S.drip, T.drip + 0.2)] };
    case 'spread':
      return { el: 'poison', items: [line('rope', 'ribbon', dist(e.from, e.to) + 2 * ROPE_SAG, S.rope, T.rope)] };
    case 'meteor': {
      // its smoke trail on the way down; where it lands, T.meteor later: a crater (three cracks), dust, pebbles
      const crack = e.radius * 1.1;
      const fall = T.meteor;
      return {
        el: 'earth',
        items: [
          bits('smoke', 'fire.smoke', METEOR.smoke, 0.4 + 0.25, (METEOR.smoke - 1) * METEOR.gap + METEOR.smokeLife),
          decal('crater', 'earth.crack', crack, crack * VFX_ASPECT.crack, 1, 3, fall),
          bits('dust', 'earth.dust', 8, S.dust + 0.3, METEOR.land, fall),
          bits('pebbles', 'earth.pebble', 6, S.pebble, METEOR.land, fall),
        ],
      };
    }
    case 'pushed': {
      if (e.by === 'earth') return { el: 'earth', items: [bits('dust', 'earth.dust', 2, 0.4 + 0.15, T.dust)] };
      const p = ctx('wind', e.colors ?? [ELEMENTS.wind.color], e.tier ?? 12);
      if (e.by === 'wind' && !has(p.step, 'streak')) return p; // the streak starts at 32
      p.items.push(decal('streak', 'wind.streak', dist(e.from, e) + 0.4, S.streak));
      return p;
    }
    default:
      return null;
  }
}

/** The element whose shape an event draws (null for the rest). */
export const eventElement = (e) => EVENT_ELEMENT[e.type] ?? (e.type === 'impact' ? e.element ?? null : null);

/**
 * An element's own attack in an event (ATTACK_EVENT: Horn Arc's chain and Venom Spit's landing
 * are impacts), with its ladder stage; null for every other event. tools/flash-audit.mjs counts
 * these to show every element is covered at every stage.
 */
export function attackOf(e) {
  let el = EVENT_ELEMENT[e.type] ?? null;
  if (e.type === 'impact') el = e.element === 'lightning' && e.pattern === 'chain' ? 'lightning' : e.element === 'poison' && e.pattern === 'spit' ? 'poison' : null;
  if (!el || !e.colors) return null;
  return { el, stage: ladderStage(e.tier ?? 4, attackClass(e.colors, el).kind) };
}

/**
 * The pet's pose by stage (src/render/blocks.js, src/kv/roam.js), in cells: `w` the wind-up
 * (0 → 1 over the WIND_UP before a shot), `f` the follow-through (1 at the shot, falling to 0),
 * `aim` the unit direction to the target (world). 16 hops, 32–64 crouch, 128 crouch and recoil,
 * 256 lunge from the field; 4096 never squashes: its halo swells as a charge dial. `out` (an
 * object the caller keeps) is filled and returned instead of a new one, so a frame allocates nothing.
 * → { x, y (up), sx, sy, rot, halo }
 */
const UP = Object.freeze({ x: 0, y: 1 });
export function petPose(stage, w = 0, f = 0, aim = UP, out = {}) {
  const pose = out;
  pose.x = pose.y = pose.rot = 0;
  pose.sx = pose.sy = pose.halo = 1;
  const hop = Math.sin(Math.PI * w);
  switch (PET_POSE[stage]) {
    case 'hop':
      pose.y = 0.07 * hop;
      pose.sy = 1 + 0.06 * hop - 0.08 * f;
      pose.sx = 1 - 0.04 * hop + 0.06 * f;
      break;
    case 'crouch':
    case 'recoil': {
      pose.sy = 1 - 0.14 * w + 0.08 * f;
      pose.sx = 1 + 0.1 * w - 0.05 * f;
      pose.y = -0.02 * w;
      if (PET_POSE[stage] === 'recoil') {
        const k = f * f; // the kick back away from the shot, settling fast
        pose.x = -aim.x * 0.14 * k;
        pose.y -= aim.y * 0.14 * k;
        pose.rot = -aim.x * 0.16 * k;
      }
      break;
    }
    case 'lunge': {
      // lean back as it winds up, then throw the whole body at the target (fusions squash ≤ 5%)
      const k = f * f;
      pose.x = -aim.x * 0.1 * w + aim.x * 0.3 * k;
      pose.y = -aim.y * 0.1 * w + aim.y * 0.3 * k;
      pose.rot = -aim.x * 0.12 * w + aim.x * 0.1 * k;
      pose.sy = 1 - 0.04 * w + 0.03 * k;
      pose.sx = 1 + 0.03 * w - 0.02 * k;
      break;
    }
    case 'dial':
      pose.halo = 1 + 0.16 * w + 0.12 * f;
      break;
    default:
      break;
  }
  return pose;
}

/**
 * The pounce's leap (src/render/blocks.js, src/kv/roam.js): out over VFX_TIME.leap s, back over
 * 0.22 s, filling `into` (an object the caller keeps). → { k (0 home … 1 on the prey), lift (u) } or null when over
 */
export function leapAt(t, into = {}) {
  const out = VFX_TIME.leap;
  const back = 0.22;
  if (t < 0 || t >= out + back) return null;
  const k = t < out ? t / out : 1 - (t - out) / back;
  into.k = k * k * (3 - 2 * k);
  into.lift = Math.sin(Math.min(1, k) * Math.PI) * 0.7;
  return into;
}
