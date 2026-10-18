// Block classes, v2 (docs/v2/SPEC.md sections 1, 3 and 4). `tile.cls`:
//   {}                              a plain block: never gains an element; from 16 it shoots pebbles
//   { element }                     an elemental egg (below 16) or a single pet (16+); one per element
//   { element, fusion, buffs }      a fusion egg or pet: `element` the main one (its attack), `fusion`
//                                   the second; `buffs` { element: count } the singles fed into it
//   … + pure: true                  from V2.pureTier (4096): the pure form of its main element
// Elements are the "dice" of the player's deck. Merging two single pets (or eggs) of different elements
// makes a fusion (the player picks the main element); a single fed into a fusion adds a buff of its
// element; two fusions merged keep one of them (the player picks), which gains the other's elements and
// buffs. Below 16 nothing shoots. Each element stands for one stat (ELEMENT_STATS: buffs and pure
// auras). Pure data + functions; no rendering.

import { tr } from '../i18n/index.js';
import { DEFENSE, V2 } from '../config.js';
import { ELEMENT_STATS, FUSION_HIT, PURE_SELF } from './skills/data.js';

// The basic attacks (redesign, src/art/attack-design.js): each element animal attacks the
// way the animal would, and between them they cover every range and targeting type.
// Distances are world units (1 cell = GRID.cell = 2). `grow(s)` scales an element from
// 16 (s = 0) to 128 (s = 3); fusions use it fully grown. Damage values are the design's
// ×0.42: area attacks and crowd control made the design's numbers twice as strong as the
// old attacks, and at ×0.42 autoplay reaches the same wave as before (median ≈ 19).
// `color` is the element's one identity colour, the `key` of its art palette (src/art/palettes.js):
// tile plates, badges, the die pick, the tile card, namecards and attack tints all use it.
export const ELEMENTS = {
  fire: {
    color: '#f2662d',
    rate: 1.0,
    dmg: 0.23, // to every foe in the cone
    shoot: { pattern: 'cone', reach: 4, lanes: 0, target: 'front' }, // 2 cells, widening to half a lane each side
    kind: 'fire',
    burn: { dpsPct: 0.45, dur: 3, max: 3 }, // of a hit per second per stack (tuned down so Fire doesn't out-hit Ice on bosses)
    grow: (s) => ({ shoot: { reach: 4 + (2 * s) / 3 } }), // the breath grows; the burn cap stays at 3
  },
  ice: {
    color: '#9be7f5',
    rate: 0.6,
    dmg: 0.91, // the Hunter leads on single tough foes
    shoot: { pattern: 'lance', speed: 0.75, reach: 10, lanes: 0, target: 'strongest' },
    kind: 'ice',
    chill: { slow: 0.35, dur: 2 },
    freeze: { every: 4, dur: 1.0 },
    grow: (s) => ({ chill: { slow: 0.35 + s / 30 }, freeze: { every: s >= 3 ? 3 : 4 }, shoot: { lanes: s >= 2 ? 1 : 0 } }),
  },
  lightning: {
    color: '#3d8bff',
    rate: 0.85,
    dmg: 0.37,
    shoot: { pattern: 'chain', radius: 7, target: 'nearest' }, // 3.5 cells
    kind: 'lightning',
    chain: { jumps: 2, range: 2.6, falloff: 0.85 }, // 3 foes, jumps of 1.3 cells
    stun: { chance: 0.15, dur: 0.4 },
    grow: (s) => ({ chain: { jumps: 2 + s } }), // 3 → 6 foes
  },
  poison: {
    color: '#a35cf0',
    rate: 0.9,
    dmg: 0.16,
    shoot: { pattern: 'spit', flight: 0.6, radius: 6, target: 'front' }, // 3 cells
    kind: 'poison',
    poison: { dpsPct: 0.34, dur: 3, max: 6, weaken: 0.3 }, // of a hit per second per stack (≈0.05 D/s)
    puddle: { radius: 2, dur: 3, every: 0.5 },
    grow: (s) => ({ puddle: { dur: 3 + (2 * s) / 3, radius: 2 + s / 3 } }),
  },
  earth: {
    color: '#9c8268',
    rate: 0.45,
    dmg: 0.82,
    shoot: { pattern: 'quake', reach: 3, lanes: 1, target: 'front' }, // 1.5 cells deep, 3 lanes wide
    kind: 'physical',
    knockback: 1, // half a cell
    stun: { chance: 1, dur: 0.3 },
    grow: (s) => ({ shoot: { reach: 3 + (2 * s) / 3 }, stun: { dur: 0.3 + 0.1 * s } }),
  },
  wind: {
    color: '#56b8a8',
    rate: 0.8,
    dmg: 0.27,
    shoot: { pattern: 'gust', reach: 10, lanes: 0, target: 'front' },
    kind: 'physical',
    knockback: 1, // half a cell (bosses less)
    grow: (s) => ({ knockback: 1 + s / 3, shoot: { lanes: s >= 3 ? 1 : 0 } }),
  },
  metal: {
    color: '#f7be1e',
    rate: 1.0,
    dmg: 0.45,
    shoot: { pattern: 'pounce', radius: 6, target: 'weakest' }, // 3 cells
    kind: 'physical',
    bite: { chance: 0.25, below: 0.5, mult: 2 },
    loot: { pct: 0.6, dur: 3 },
    grow: (s) => ({ bite: { chance: 0.25 + 0.05 * s }, loot: { pct: 0.6 + (0.4 * s) / 3 } }),
  },
  nature: {
    color: '#7cd15a',
    rate: 0.5,
    dmg: 0.54,
    shoot: { pattern: 'pulse', radius: 2, target: 'front' }, // 1 cell around the block
    kind: 'nature',
    root: { dur: 0.6 },
    thorns: { pct: 0.25 }, // of a hit, to each foe that bites the block
    regrow: { pct: 0.03 }, // of max health, to the block and its neighbours per pulse that hits
    grow: (s) => ({ shoot: { radius: 2 + s / 3 }, regrow: { pct: 0.03 + 0.01 * s }, thorns: { pct: 0.25 + 0.05 * s } }),
  },
};
// each element's words come from the language's table (src/i18n): its name, its attack's name, what
// the attack does, and the die pick's one line (src/ui/hud.js: it fits a 360 px phone)
for (const [k, e] of Object.entries(ELEMENTS)) Object.assign(e, { name: tr(`el.${k}`), attack: tr(`el.${k}.attack`), desc: tr(`el.${k}.desc`), line: tr(`el.${k}.line`) });
export const ELEMENT_KEYS = Object.keys(ELEMENTS);

/** Growth stage of a class: 0 at 16 … 3 at 128; fusions are fully grown. */
export const growthOf = (tier) => Math.max(0, Math.min(3, tier - 4));

/** An element at a growth stage: its data with the stage's overrides merged in. */
export function grownElement(key, s = 0) {
  const e = ELEMENTS[key];
  if (!e.grow || s <= 0) return e;
  const over = e.grow(s);
  const out = { ...e };
  for (const [k, v] of Object.entries(over)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...e[k], ...v } : v;
  return out;
}

/** How a dormant block (below 16) shoots: a single plain pebble. */
export const PLAIN_SHOOT = { pattern: 'single', reach: 5, lanes: 0, target: 'front' };

/**
 * Range of a class: the main element's shape at its growth stage (cone, lane line, ring,
 * circle, 3-lane wave). A fusion keeps that shape, fully grown; a lane attack takes the
 * widest lane cover of its two elements.
 */
export function shootFor(cls, active, tier = 4) {
  if (!active || !cls.element) return { ...PLAIN_SHOOT };
  const s = cls.fusion ? 3 : growthOf(tier);
  const shoot = { ...grownElement(cls.element, s).shoot };
  if (shoot.lanes != null && cls.fusion) {
    const o = grownElement(cls.fusion, 3).shoot;
    if (o.lanes != null) shoot.lanes = Math.max(shoot.lanes, o.lanes);
  }
  return shoot;
}

export const fusionKey = (a, b) => {
  const [x, y] = ELEMENT_KEYS.indexOf(a) <= ELEMENT_KEYS.indexOf(b) ? [a, b] : [b, a];
  return `${x}+${y}`;
};

// Names follow BALL x PIT where a matching evolution exists (Inferno, Magma, Venom,
// Glacier, Blizzard, Storm, Swamp, Sandstorm, Brimstone); the rest are new.
// Keys are in ELEMENT_KEYS order (see fusionKey).
export const FUSIONS = {
  'fire+ice': {},
  'fire+lightning': {},
  'fire+poison': {},
  'fire+earth': {},
  'fire+wind': {},
  'ice+lightning': {},
  'ice+poison': {},
  'ice+earth': {},
  'ice+wind': {},
  'lightning+poison': {},
  'lightning+earth': {},
  'lightning+wind': {},
  'poison+earth': {},
  'poison+wind': {},
  'earth+wind': {},
  'fire+metal': {},
  'ice+metal': {},
  'lightning+metal': {},
  'poison+metal': {},
  'earth+metal': {},
  'wind+metal': {},
  'fire+nature': {},
  'ice+nature': {},
  'lightning+nature': {},
  'poison+nature': {},
  'earth+nature': {},
  'wind+nature': {},
  'metal+nature': {},
};

// Each fusion is its own element with a colour of its own, picked to stand apart
// from the 8 base elements (CIEDE2000 ≥ 5 from every element but its parents) and
// from each other (≥ 8), and one of its pet's six colours (src/art/fusion-roster.js).
const FUSION_COLORS = {
  'fire+ice': '#456ac2', // Frostnova: deep cobalt, its red panda's shade (#5b8cff was 3.4 from Lightning)
  'fire+lightning': '#ff4fb8', // Plasma: hot pink
  'fire+poison': '#d6452f', // Brimstone: crimson
  'fire+earth': '#ff9f1c', // Magma: lava
  'fire+wind': '#f24c00', // Inferno: flame orange
  'fire+metal': '#cd7f32', // Forge: bronze
  'fire+nature': '#d4e157', // Wildfire: lime
  'ice+lightning': '#00d2ff', // Cryo Arc: electric cyan
  'ice+poison': '#7b61ff', // Venom: indigo
  'ice+earth': '#9fc5e8', // Glacier: pale steel blue
  'ice+wind': '#e0f7ff', // Blizzard: snow
  'ice+metal': '#7f9cb8', // Cold Iron: blue-grey
  'ice+nature': '#7fffd4', // Frostbloom: aquamarine
  'lightning+poison': '#c6ff00', // Toxic Shock: acid green
  'lightning+earth': '#b8860b', // Thunderquake: dark gold
  'lightning+wind': '#9fa8ff', // Storm: storm lilac
  'lightning+metal': '#ffd700', // Railgun: gold
  'lightning+nature': '#a8e063', // Thunderbloom: spring green
  'poison+earth': '#6b8e23', // Swamp: olive
  'poison+wind': '#c39bd3', // Miasma: mauve
  'poison+metal': '#8e7cc3', // Corrosion: dusty purple
  'poison+nature': '#7a3fa8', // Nightshade: deep purple
  'earth+wind': '#e6c88a', // Sandstorm: sand
  'earth+metal': '#8d6e63', // Ironstone: rust brown
  'earth+nature': '#2e8b57', // Overgrowth: sea green
  'wind+metal': '#86aaaf', // Bladewind: steel teal, its weasel's shade (#b0e0e6 was 4.8 from Ice)
  'wind+nature': '#fff59d', // Pollenstorm: pollen
  'metal+nature': '#f4a261', // Harvest: amber
};
for (const [key, f] of Object.entries(FUSIONS)) {
  f.name = tr(`fusion.${key}`); // the skill's name (src/i18n); its pet keeps a name of its own
  f.color = FUSION_COLORS[key];
  f.parts = key.split('+');
}

/**
 * The 4-piece milestone border: pieces lit toward the next milestone. 16 → 32 → 64
 * → 128 lights 0–3 (256), then 512 → 1024 → 2048 lights 0–3 again (4096 = the pure
 * form). -1 = no border (below 16, or 4096 and up).
 */
export const milestonePieces = (tier) => (tier >= 4 && tier < 8 ? tier - 4 : tier >= 8 && tier < 12 ? tier - 8 : -1);

/** The unique fusion element of a class (or null). */
export const fusionOf = (cls) => (cls.element && cls.fusion ? FUSIONS[fusionKey(cls.element, cls.fusion)] : null);

// v1's ultimate signatures, keyed by the apex (third) element. v2 has no ultimates and the sim no
// longer reads these; they stay as data for the screens and the art catalogue until those move to v2.
export const APEX = {
  fire: { effect: 'globalBurn', period: 2 },
  ice: { effect: 'globalFreeze', period: 10, dur: 2.5 },
  lightning: { effect: 'strikes', period: 1.5, count: 3, pct: 1.2 },
  poison: { effect: 'contagion', period: 1, radius: 1.6 },
  earth: { effect: 'meteor', period: 5, radius: 2.2, pct: 4 },
  wind: { effect: 'vortex', period: 8, push: 3 },
  metal: { effect: 'gild', period: 4, dur: 4 },
  nature: { effect: 'bloom', period: 6, pct: 0.25 },
};
for (const [k, a] of Object.entries(APEX)) Object.assign(a, { name: tr(`apex.${k}`), desc: tr(`apex.${k}.desc`) });

/** Short effect tags per element, for announcements and cards. */
export const TAGS = Object.fromEntries(Object.keys(ELEMENTS).map((k) => [k, tr(`tag.${k}`)]));

// --- stages -----------------------------------------------------------------

const HATCH_TIER = DEFENSE.classTiers[0]; // 16: eggs hatch, blocks start shooting

/** By tier alone: 0 below 16 (nothing shoots), 1 from 16, 2 from 256, 3 from 4096. */
export function stageFor(tier) {
  const [t1, t2, t3] = DEFENSE.classTiers;
  return tier >= t3 ? 3 : tier >= t2 ? 2 : tier >= t1 ? 1 : 0;
}

/** The elements of a class: its main one, then its second one (a fusion). */
export const elementsOf = (cls) => [cls.element, cls.fusion].filter(Boolean);

/** A single egg or pet: one element, no fusion. */
export const isSingle = (cls) => !!cls?.element && !cls.fusion;
/** A fusion egg or pet. */
export const isFusion = (cls) => !!cls?.element && !!cls.fusion;

/** The elements that have a single (egg or pet) on the board; the run keeps it to one per element. */
export function singlesOn(tiles) {
  const out = new Set();
  for (const t of tiles) if (isSingle(t.cls)) out.add(t.cls.element);
  return out;
}

/** A copy of a class with buffs of its own (a fusion always has them, `{}` when none). */
export function copyCls(cls) {
  const out = { ...cls };
  if (out.fusion) out.buffs = { ...(cls.buffs ?? {}) };
  return out;
}

/** Mark a class pure when it has an element and its block has reached V2.pureTier. */
export function withPure(cls, tier) {
  if (cls.element && tier >= V2.pureTier) cls.pure = true;
  return cls;
}

/** Add `gain` ({ element: n }) to `buffs`, in place. */
function addBuffs(buffs, gain) {
  for (const [e, n] of Object.entries(gain)) buffs[e] = (buffs[e] ?? 0) + n;
  return buffs;
}

/** A fusion choice's offer: `element` the main one (its attack), `fusion` the second. */
export function fusionOffer(element, second) {
  const key = fusionKey(element, second);
  return { element, fusion: second, key, name: FUSIONS[key].name, color: FUSIONS[key].color };
}

/** What a fusion keeps from `other` (a fusion merged into it): its two elements and all its buffs. */
const gainFrom = (other) => addBuffs({ [other.element]: 1, [other.fusion]: 1 }, other.buffs ?? {});
/** The fusion `keep` after `other` merged into it. */
const keptAfter = (keep, other) => {
  const cls = copyCls(keep);
  addBuffs(cls.buffs, gainFrom(other));
  return cls;
};

/**
 * The merge rule (docs/v2/SPEC.md section 3): `mover` slid into `stayer` (the same tier) and made
 * `child`. Sets child.cls (with a choice, its offer 0 until the player picks) and returns
 * { stage, choice, gain }:
 *   stage   1 the child hatched (reached 16 with an element), 3 it became pure (reached V2.pureTier
 *           with an element), else 0. With a choice the run announces it once the choice is made.
 *   choice  null, or { kind: 'fusion', parts, offers }: two singles of different elements (which one is
 *           main; offer 0 the mover's), or { kind: 'keep', parts, offers }: two fusions (which one stays,
 *           gaining the other's elements and buffs; offer 0 the mover's)
 *   gain    null, or { element: 1 }: the buff a fusion gained from a single fed into it
 */
export function mergeClass(child, mover, stayer) {
  const a = mover.cls ?? {};
  const b = stayer.cls ?? {};
  let cls;
  let choice = null;
  let gain = null;
  if (!a.element || !b.element) {
    cls = copyCls(a.element ? a : b); // plain + plain stays plain; plain + X is X
  } else if (isSingle(a) && isSingle(b)) {
    if (a.element === b.element) cls = copyCls(a); // cannot happen in play (one single per element)
    else {
      const offers = [fusionOffer(a.element, b.element), fusionOffer(b.element, a.element)];
      const parts = [
        { element: a.element, tier: mover.tier },
        { element: b.element, tier: stayer.tier },
      ];
      choice = { kind: 'fusion', parts, offers };
      cls = { element: offers[0].element, fusion: offers[0].fusion, buffs: {} };
    }
  } else if (isFusion(a) && isFusion(b)) {
    const offers = [
      { cls: withPure(keptAfter(a, b), child.tier), gain: gainFrom(b) },
      { cls: withPure(keptAfter(b, a), child.tier), gain: gainFrom(a) },
    ];
    const parts = [
      { cls: copyCls(a), tier: mover.tier },
      { cls: copyCls(b), tier: stayer.tier },
    ];
    choice = { kind: 'keep', parts, offers };
    cls = copyCls(offers[0].cls);
  } else {
    // a single fed into a fusion: one buff of its element
    const [f, single] = isFusion(a) ? [a, b] : [b, a];
    gain = { [single.element]: 1 };
    cls = copyCls(f);
    addBuffs(cls.buffs, gain);
  }
  withPure(cls, child.tier);
  child.cls = cls;
  child.prof = null;
  const crossed = (tier) => mover.tier < tier && child.tier >= tier;
  const stage = !cls.element ? 0 : crossed(V2.pureTier) ? 3 : crossed(HATCH_TIER) ? 1 : 0;
  return { stage, choice, gain };
}

// v1's material (the elements merged into a block) and its fusion offers: the sim no longer uses them
// (v2 fusions come from merging two single pets); kept for the tile card until it moves to v2.
/** Elements in any of `lists`, once each, in element order (deterministic). */
export const mergeMaterial = (...lists) => ELEMENT_KEYS.filter((e) => lists.some((l) => l.includes(e)));

/** A block's material: v1's record of the elements merged into it, and always its own elements. */
export const materialOf = (t) => mergeMaterial(t.mats ?? [], elementsOf(t.cls ?? {}));

/** v1: the fusions a block's material could make, the merge rule's own pick first; at most `max`. */
export function fusionOffers(cls, material, max = 4) {
  const out = [];
  const seen = new Set();
  const add = (a, b) => {
    if (!a || !b || a === b || !material.includes(a) || !material.includes(b)) return;
    const key = fusionKey(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...fusionOffer(a, b), tags: `${TAGS[a]} · ${TAGS[b]}` });
  };
  add(cls.element, cls.fusion);
  const order = [cls.element, ...material.filter((e) => e !== cls.element)];
  for (const a of order) for (const b of order) add(a, b);
  return out.slice(0, max);
}

/**
 * What a block just became, for the announcement: the parts that combined and the result.
 * Stage 1 a hatch (an egg reached 16; a fusion egg hatches as its fusion), 2 a fusion made, 3 the pure
 * form of its main element (`pure`: that element).
 */
export function describeStage(cls, stage, tier) {
  const el = (k) => ({ key: k, name: ELEMENTS[k].name, color: ELEMENTS[k].color });
  const key = cls.fusion ? fusionKey(cls.element, cls.fusion) : null;
  const fu = key ? FUSIONS[key] : null;
  const e = ELEMENTS[cls.element];
  const tags = fu ? `${TAGS[cls.element]} · ${TAGS[cls.fusion]}` : TAGS[cls.element];
  if (stage === 1) {
    const value = { name: String(2 ** tier), color: null };
    if (fu) return { stage, parts: [value, { key, name: fu.name, color: fu.color }], name: fu.name, colors: [fu.color], tags };
    return { stage, parts: [value, el(cls.element)], name: e.attack, colors: [e.color], tags };
  }
  if (stage === 2) return { stage, parts: [el(cls.element), el(cls.fusion)], name: fu.name, colors: [fu.color], tags };
  const was = fu ? { key, name: fu.name, color: fu.color } : { key: cls.element, name: e.attack, color: e.color };
  return { stage, parts: [was, el(cls.element)], name: tr(`pure.${cls.element}.name`), colors: [e.color], tags: TAGS[cls.element], pure: cls.element };
}

/** Up to `n` (V2.offers) elements the deck does not have yet, as card offers. */
export function dieOffers(owned, rng, n = V2.offers) {
  const pool = ELEMENT_KEYS.filter((e) => !owned.includes(e));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((e) => ({ element: e, name: ELEMENTS[e].name, attack: ELEMENTS[e].attack, line: ELEMENTS[e].line, desc: ELEMENTS[e].desc, colors: [ELEMENTS[e].color] }));
}

// --- attack profile -----------------------------------------------------------

export const turretDamage = (tier) => DEFENSE.turret.baseDamage * DEFENSE.turret.damageGrowth ** (tier - 1);

// Copy one element's components into a profile, scaled by `boost` (1 = base).
function addComponents(p, el, boost) {
  if (el.burn) {
    p.burn = {
      dpsPct: Math.max(p.burn?.dpsPct ?? 0, el.burn.dpsPct * boost),
      dur: Math.max(p.burn?.dur ?? 0, el.burn.dur),
      max: Math.max(p.burn?.max ?? 0, Math.round(el.burn.max + (boost - 1) * 4)),
    };
  }
  if (el.poison) {
    p.poison = {
      dpsPct: Math.max(p.poison?.dpsPct ?? 0, el.poison.dpsPct * boost),
      dur: Math.max(p.poison?.dur ?? 0, el.poison.dur),
      max: Math.max(p.poison?.max ?? 0, Math.round(el.poison.max * boost)),
      weaken: Math.max(p.poison?.weaken ?? 0, el.poison.weaken ?? 0),
    };
  }
  if (el.chill) {
    p.chill = {
      slow: Math.min(0.65, Math.max(p.chill?.slow ?? 0, el.chill.slow + (boost - 1) * 0.2)),
      dur: Math.max(p.chill?.dur ?? 0, el.chill.dur),
    };
  }
  if (el.freeze) {
    p.freeze = {
      every: Math.max(2, el.freeze.every - Math.round((boost - 1) * 2)),
      dur: el.freeze.dur * boost,
    };
  }
  if (el.chain) {
    p.chain = {
      jumps: Math.max(p.chain?.jumps ?? 0, el.chain.jumps + Math.round((boost - 1) * 4)),
      range: el.chain.range + (boost - 1),
      falloff: el.chain.falloff,
    };
  }
  if (el.stun) p.stun = { chance: Math.min(1, Math.max(p.stun?.chance ?? 0, el.stun.chance * boost)), dur: Math.max(p.stun?.dur ?? 0, el.stun.dur * Math.sqrt(boost)) };
  if (el.root) p.root = { dur: Math.max(p.root?.dur ?? 0, el.root.dur * boost) };
  if (el.thorns) p.thorns = { pct: Math.min(0.8, Math.max(p.thorns?.pct ?? 0, el.thorns.pct * boost)) };
  if (el.regrow) p.regrow = { pct: Math.min(0.12, Math.max(p.regrow?.pct ?? 0, el.regrow.pct * boost)) };
  if (el.bite) p.bite = { chance: Math.min(0.8, Math.max(p.bite?.chance ?? 0, el.bite.chance * boost)), below: el.bite.below, mult: el.bite.mult };
  if (el.puddle) p.puddle = { radius: el.puddle.radius * Math.sqrt(boost), dur: el.puddle.dur * boost, every: el.puddle.every };
  if (el.splash) {
    p.splash = { radius: el.splash.radius + (boost - 1) * 0.8, pct: Math.min(1, el.splash.pct * boost) };
  }
  if (el.pierce) p.pierce = { len: el.pierce.len + (boost - 1) * 0.8 };
  if (el.knockback) p.knockback = Math.max(p.knockback ?? 0, el.knockback * boost);
  if (el.loot) p.loot = { pct: Math.max(p.loot?.pct ?? 0, el.loot.pct * boost), dur: Math.max(p.loot?.dur ?? 0, el.loot.dur) };
  if (el.heal) p.heal = { chance: Math.min(0.6, Math.max(p.heal?.chance ?? 0, el.heal.chance * boost)), pct: Math.max(p.heal?.pct ?? 0, el.heal.pct * boost) };
  if (!p.kinds.includes(el.kind)) p.kinds.push(el.kind);
}

/**
 * A block's element stats (ELEMENT_STATS): a fusion's buffs (count × buff) and the aura of the other
 * pure pets (`tile.aura`, { element: v }, set by the run). hp and regen from an aura reach every block;
 * the other stats only blocks with an element. → { stat: v } (only the stats it has).
 */
export function statsOf(tile) {
  const out = {};
  const add = (e, v) => {
    const stat = ELEMENT_STATS[e]?.stat;
    if (stat && v) out[stat] = (out[stat] ?? 0) + v;
  };
  const c = tile.cls ?? {};
  if (c.fusion && c.buffs) for (const e of ELEMENT_KEYS) add(e, (c.buffs[e] ?? 0) * ELEMENT_STATS[e].buff);
  if (tile.aura) for (const e of ELEMENT_KEYS) if (c.element || ['hp', 'regen'].includes(ELEMENT_STATS[e].stat)) add(e, tile.aura[e] ?? 0);
  return out;
}

/** The element stats in a profile (docs/v2/SPEC.md section 4). */
function applyStats(p, st) {
  if (st.dmg) p.dmgMult *= 1 + st.dmg;
  if (st.slow) p.chill = { slow: Math.min(0.65, (p.chill?.slow ?? 0) + st.slow), dur: Math.max(p.chill?.dur ?? 0, 1.5) };
  if (st.rate) p.rate *= 1 + st.rate;
  if (st.poison) {
    // +v poison stacks per hit (a block that poisons already adds its own one)
    const had = p.poison;
    p.poison = { ...had, dpsPct: Math.max(had?.dpsPct ?? 0, 0.1 * st.poison), dur: Math.max(had?.dur ?? 0, 3), max: Math.max(had?.max ?? 0, 2 + st.poison), perHit: (had ? (had.perHit ?? 1) : 0) + st.poison };
  }
  if (st.hp) p.hpMult = 1 + st.hp;
  if (st.range) {
    p.shoot = { ...p.shoot };
    if (p.shoot.reach != null) p.shoot.reach *= 1 + st.range;
    if (p.shoot.radius != null) p.shoot.radius *= 1 + st.range;
  }
  if (st.crit) p.critChance = Math.min(0.75, st.crit);
  if (st.regen) p.regen = st.regen;
}

/** { element: n } as a short cache-key string (key order only costs a cache miss, never a wrong profile). */
function tally(o) {
  let s = '';
  if (o) for (const k in o) if (o[k]) s += k + o[k];
  return s;
}

/**
 * Attack profile of a block (docs/v2/SPEC.md section 4), cached on it until its tier, class (buffs,
 * pure) or aura changes. Plain blocks shoot pebbles from 16; a single pet its element's attack at its
 * growth stage; a fusion pet its main element's attack fully grown, × FUSION_HIT, with the second
 * element's effects; the pure form × PURE_SELF. Then the element stats (statsOf). Also
 * `hpMult` and `regen` (the run applies them), `critChance` / `critMult` (the defense rolls them per
 * hit), `pure` (the element of a pure pet) and `summon` (a fusion pet's skill key from V2.summonTier).
 */
export function profileFor(tile) {
  const c = tile.cls ?? {};
  const key = `${tile.tier}:${c.element ?? ''}:${c.fusion ?? ''}:${tally(c.buffs)}:${c.pure ? 'pure' : ''}:${tally(tile.aura)}`;
  if (tile.prof && tile.prof.key === key) return tile.prof;
  const p = { key, kinds: [], name: 'Pebble', colors: ['#d9d2c5'], rate: 1, dmgMult: 1, signature: null, active: false, element: null, shoots: true, pure: null, summon: null, hpMult: 1, regen: 0, critChance: 0, critMult: 2 };
  if (tile.tier < HATCH_TIER) {
    // below 16 a block doesn't shoot at all
    p.kinds.push('physical');
    p.shoots = false;
  } else if (!c.element) {
    p.kinds.push('physical'); // a plain block shoots pebbles
  } else if (!c.fusion) {
    p.active = true;
    const e = grownElement(c.element, growthOf(tile.tier));
    addComponents(p, e, 1);
    p.name = e.attack;
    p.colors = [e.color];
    p.rate = e.rate;
    p.dmgMult = e.dmg;
  } else {
    p.active = true;
    const a = grownElement(c.element, 3);
    addComponents(p, a, 1);
    addComponents(p, grownElement(c.fusion, 3), 1);
    const fk = fusionKey(c.element, c.fusion);
    p.name = FUSIONS[fk].name;
    p.colors = [FUSIONS[fk].color]; // one unique element colour
    // the main element's firing rhythm, hitting harder
    p.rate = a.rate;
    p.dmgMult = a.dmg * FUSION_HIT;
    if (tile.tier >= V2.summonTier) p.summon = fk;
  }
  if (c.element && c.pure) {
    p.dmgMult *= PURE_SELF;
    p.pure = c.element;
  }
  p.element = p.active ? c.element : null;
  p.shoot = shootFor(c, p.active, tile.tier);
  applyStats(p, statsOf(tile));
  p.damage = turretDamage(tile.tier) * p.dmgMult;
  tile.prof = p;
  return p;
}
