// Block classes. A block gains a class stage at three thresholds (BALL x PIT style):
//   16   (tier 4)  → one element, with an attack that fits it
//   256  (tier 8)  → a fusion: its element + a second one, carrying BOTH effects, upgraded
//   4096 (tier 12) → an ultimate: the fusion + a third "apex" element with a rule-breaking signature
// Elements are "dice" in the player's deck. Blocks below 16 are plain and don't
// shoot. A block reaching 16 rolls a random element from the deck and starts
// shooting. When two elemental blocks merge, the one that slides in keeps its
// element (its class overrides the one it slid into). At 256 the block fuses:
// the stayer's element (or a rolled one if they match) joins it and the pair
// becomes a unique fusion element (Fire + Ice = Frostnova: burn and slow at once),
// with its own name and colour. 4096 adds a third element: the ultimate.
// Pure data + functions; no rendering.

import { DEFENSE } from '../config.js';

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
    name: 'Fire',
    attack: 'Ember Breath',
    color: '#f2662d',
    desc: 'Breathes a short cone of fire up its lane that hits every foe in it. Burns: damage over time that stacks.',
    rate: 1.0,
    dmg: 0.23, // to every foe in the cone
    shoot: { pattern: 'cone', reach: 4, lanes: 0, target: 'front' }, // 2 cells, widening to half a lane each side
    kind: 'fire',
    burn: { dpsPct: 0.45, dur: 3, max: 3 }, // of a hit per second per stack (tuned down so Fire doesn't out-hit Ice on bosses)
    grow: (s) => ({ shoot: { reach: 4 + (2 * s) / 3 } }), // the breath grows; the burn cap stays at 3
  },
  ice: {
    name: 'Ice',
    attack: 'Echo Harpoon',
    color: '#9be7f5',
    desc: 'A sonar ping finds the toughest foe up to 5 cells along its lane and an ice harpoon follows. Slows; every 4th hit on the same foe freezes it.',
    rate: 0.6,
    dmg: 0.91, // the Hunter leads on single tough foes
    shoot: { pattern: 'lance', speed: 0.75, reach: 10, lanes: 0, target: 'strongest' },
    kind: 'ice',
    chill: { slow: 0.35, dur: 2 },
    freeze: { every: 4, dur: 1.0 },
    grow: (s) => ({ chill: { slow: 0.35 + s / 30 }, freeze: { every: s >= 3 ? 3 : 4 }, shoot: { lanes: s >= 2 ? 1 : 0 } }),
  },
  lightning: {
    name: 'Lightning',
    attack: 'Horn Arc',
    color: '#3d8bff',
    desc: 'An instant bolt from the horn to the nearest foe that leaps to more foes close by, across lanes. Each jump hits a little less and may stun.',
    rate: 0.85,
    dmg: 0.37,
    shoot: { pattern: 'chain', radius: 7, target: 'nearest' }, // 3.5 cells
    kind: 'lightning',
    chain: { jumps: 2, range: 2.6, falloff: 0.85 }, // 3 foes, jumps of 1.3 cells
    stun: { chance: 0.15, dur: 0.4 },
    grow: (s) => ({ chain: { jumps: 2 + s } }), // 3 → 6 foes
  },
  poison: {
    name: 'Poison',
    attack: 'Venom Spit',
    color: '#a35cf0',
    desc: 'Spits a venom glob that leaves a puddle on the path. Foes in it gain poison stacks; at full stacks they are weakened and hit blocks 30% softer.',
    rate: 0.9,
    dmg: 0.16,
    shoot: { pattern: 'spit', flight: 0.6, radius: 6, target: 'front' }, // 3 cells
    kind: 'poison',
    poison: { dpsPct: 0.34, dur: 3, max: 6, weaken: 0.3 }, // of a hit per second per stack (≈0.05 D/s)
    puddle: { radius: 2, dur: 3, every: 0.5 },
    grow: (s) => ({ puddle: { dur: 3 + (2 * s) / 3, radius: 2 + s / 3 } }),
  },
  earth: {
    name: 'Earth',
    attack: 'Quake Stomp',
    color: '#9c8268',
    desc: 'Stomps a shockwave across its lane and both neighbours: a heavy hit that knocks foes back and stuns them.',
    rate: 0.45,
    dmg: 0.82,
    shoot: { pattern: 'quake', reach: 3, lanes: 1, target: 'front' }, // 1.5 cells deep, 3 lanes wide
    kind: 'physical',
    knockback: 1, // half a cell
    stun: { chance: 1, dur: 0.3 },
    grow: (s) => ({ shoot: { reach: 3 + (2 * s) / 3 }, stun: { dur: 0.3 + 0.1 * s } }),
  },
  wind: {
    name: 'Wind',
    attack: 'Wing Gust',
    color: '#56b8a8',
    desc: 'A wingbeat sends a gust 5 cells up its lane: every foe in it is hit and pushed back.',
    rate: 0.8,
    dmg: 0.27,
    shoot: { pattern: 'gust', reach: 10, lanes: 0, target: 'front' },
    kind: 'physical',
    knockback: 1, // half a cell (bosses less)
    grow: (s) => ({ knockback: 1 + s / 3, shoot: { lanes: s >= 3 ? 1 : 0 } }),
  },
  metal: {
    name: 'Metal',
    attack: 'Pride Pounce',
    color: '#f7be1e',
    desc: 'The cub leaps onto the weakest foe nearby. A killing bite on wounded foes, and its prey drops bonus coins.',
    rate: 1.0,
    dmg: 0.45,
    shoot: { pattern: 'pounce', radius: 6, target: 'weakest' }, // 3 cells
    kind: 'physical',
    bite: { chance: 0.25, below: 0.5, mult: 2 },
    loot: { pct: 0.6, dur: 3 },
    grow: (s) => ({ bite: { chance: 0.25 + 0.05 * s }, loot: { pct: 0.6 + (0.4 * s) / 3 } }),
  },
  nature: {
    name: 'Nature',
    attack: 'Bramble Shell',
    color: '#7cd15a',
    desc: 'A thorny ring pulses around the block: it roots foes, hurts anything that bites the block, and regrows the block and its neighbours.',
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
export const ELEMENT_KEYS = Object.keys(ELEMENTS);

/** Growth stage of a class: 0 at 16 … 3 at 128; fusions and ultimates are fully grown. */
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
 * Range of a class: the first element's shape at its growth stage (cone, lane line, ring,
 * circle, 3-lane wave). A fusion keeps that shape; a lane attack takes the widest lane
 * cover of its elements.
 */
export function shootFor(cls, active, tier = 4) {
  if (!active || !cls.element) return { ...PLAIN_SHOOT };
  const s = cls.fusion ? 3 : growthOf(tier);
  const shoot = { ...grownElement(cls.element, s).shoot };
  // fusions keep the first element's shape; a lane attack takes the widest lane cover
  if (shoot.lanes != null) {
    for (const k of [cls.fusion, cls.ultimate].filter(Boolean)) {
      const o = grownElement(k, 3).shoot;
      if (o.lanes != null) shoot.lanes = Math.max(shoot.lanes, o.lanes);
    }
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
  'fire+ice': { name: 'Frostnova' },
  'fire+lightning': { name: 'Plasma' },
  'fire+poison': { name: 'Brimstone' },
  'fire+earth': { name: 'Magma' },
  'fire+wind': { name: 'Inferno' },
  'ice+lightning': { name: 'Cryo Arc' },
  'ice+poison': { name: 'Venom' },
  'ice+earth': { name: 'Glacier' },
  'ice+wind': { name: 'Blizzard' },
  'lightning+poison': { name: 'Toxic Shock' },
  'lightning+earth': { name: 'Thunderquake' },
  'lightning+wind': { name: 'Storm' },
  'poison+earth': { name: 'Swamp' },
  'poison+wind': { name: 'Miasma' },
  'earth+wind': { name: 'Sandstorm' },
  'fire+metal': { name: 'Forge' },
  'ice+metal': { name: 'Cold Iron' },
  'lightning+metal': { name: 'Railgun' },
  'poison+metal': { name: 'Corrosion' },
  'earth+metal': { name: 'Ironstone' },
  'wind+metal': { name: 'Bladewind' },
  'fire+nature': { name: 'Wildfire' },
  'ice+nature': { name: 'Frostbloom' },
  'lightning+nature': { name: 'Thunderbloom' },
  'poison+nature': { name: 'Nightshade' },
  'earth+nature': { name: 'Overgrowth' },
  'wind+nature': { name: 'Pollenstorm' },
  'metal+nature': { name: 'Harvest' },
};

// Each fusion is its own element with a colour of its own, picked to stand apart
// from the 8 base elements and from each other.
const FUSION_COLORS = {
  'fire+ice': '#5b8cff', // Frostnova: cobalt
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
  'wind+metal': '#b0e0e6', // Bladewind: powder blue
  'wind+nature': '#fff59d', // Pollenstorm: pollen
  'metal+nature': '#f4a261', // Harvest: amber
};
for (const [key, f] of Object.entries(FUSIONS)) {
  f.color = FUSION_COLORS[key];
  f.parts = key.split('+');
}

/**
 * The 4-piece milestone border: pieces lit toward the next milestone. 16 → 32 → 64
 * → 128 lights 0–3 (256 = fusion), then 512 → 1024 → 2048 lights 0–3 again (4096 =
 * ultimate). -1 = no border (below 16, or an ultimate).
 */
export const milestonePieces = (tier) => (tier >= 4 && tier < 8 ? tier - 4 : tier >= 8 && tier < 12 ? tier - 8 : -1);

/** The unique fusion element of a class (or null). */
export const fusionOf = (cls) => (cls.element && cls.fusion ? FUSIONS[fusionKey(cls.element, cls.fusion)] : null);

// Ultimate signatures, keyed by the apex (third) element. Periodic, field-wide,
// like BALL x PIT's top tier (Sun, Timestop, Storm, Virus …).
export const APEX = {
  fire: { name: 'Sun', effect: 'globalBurn', period: 2, desc: 'Every 2 s, burns every foe on the field.' },
  ice: { name: 'Timestop', effect: 'globalFreeze', period: 10, dur: 2.5, desc: 'Every 10 s, freezes every foe for 2.5 s.' },
  lightning: { name: 'Tempest', effect: 'strikes', period: 1.5, count: 3, pct: 1.2, desc: 'Every 1.5 s, lightning strikes 3 random foes.' },
  poison: { name: 'Plague', effect: 'contagion', period: 1, radius: 1.6, desc: 'Every second, poison jumps to nearby foes.' },
  earth: { name: 'Meteor', effect: 'meteor', period: 5, radius: 2.2, pct: 4, desc: 'Every 5 s, a meteor hits the biggest crowd.' },
  wind: { name: 'Vortex', effect: 'vortex', period: 8, push: 3, desc: 'Every 8 s, blows every non-boss foe 3 steps back up its lane.' },
  metal: { name: 'Midas', effect: 'gild', period: 4, dur: 4, desc: 'Every 4 s, gilds every foe on the field: each drops bonus coins.' },
  nature: { name: 'Lifebloom', effect: 'bloom', period: 6, pct: 0.25, desc: 'Every 6 s, repairs every damaged block by 25%.' },
};

/** Short effect tags per element, for announcements and cards. */
export const TAGS = {
  fire: 'Burn',
  ice: 'Slow + Freeze',
  lightning: 'Chain + Stun',
  poison: 'Poison + Weaken',
  earth: 'Knockback + Stun',
  wind: 'Knockback',
  metal: 'Killing bite + Coins',
  nature: 'Root + Thorns + Regrow',
};

// --- stages -----------------------------------------------------------------

export function stageFor(tier) {
  const [t1, t2, t3] = DEFENSE.classTiers;
  return tier >= t3 ? 3 : tier >= t2 ? 2 : tier >= t1 ? 1 : 0;
}

export function elementsOf(cls) {
  return [cls.element, cls.fusion, cls.ultimate].filter(Boolean);
}

/** Class stages a block has active: 0 while dormant (below 16), up to 3. */
export function activeStages(tile) {
  if (!tile.cls.element || stageFor(tile.tier) < 1) return 0;
  return 1 + (tile.cls.fusion ? 1 : 0) + (tile.cls.ultimate ? 1 : 0);
}

/**
 * Merge rule: `mover` slid into `stayer`. Below 16 blocks are plain. A child
 * reaching 16 rolls a random element (`roll(exclude)` picks from the deck). Above
 * that the child takes the mover's class (the sliding block overrides). A child
 * that reaches 256 / 4096 fills its fusion / ultimate slot with the stayer's
 * element, or a rolled one when the stayer has nothing new to give.
 * Returns the highest stage the child gained over the mover (0 = none).
 */
export function mergeClass(child, mover, stayer, roll = null) {
  const slots = stageFor(child.tier);
  const cls = {};
  if (slots >= 1) {
    cls.element = mover.cls.element ?? stayer.cls.element ?? roll?.([]) ?? undefined;
    if (mover.cls.fusion) cls.fusion = mover.cls.fusion;
    if (mover.cls.ultimate) cls.ultimate = mover.cls.ultimate;
    const donors = elementsOf(stayer.cls).filter((e) => !elementsOf(cls).includes(e));
    const give = () => donors.shift() ?? roll?.(elementsOf(cls)) ?? undefined;
    if (slots >= 2 && cls.element && !cls.fusion) cls.fusion = give();
    if (slots >= 3 && cls.fusion && !cls.ultimate) cls.ultimate = give();
    for (const k of Object.keys(cls)) if (!cls[k]) delete cls[k];
  }
  child.cls = cls;
  child.prof = null;
  const before = activeStages(mover);
  const after = activeStages(child);
  return after > before ? after : 0;
}

/** Elements in any of `lists`, once each, in element order (deterministic). */
export const mergeMaterial = (...lists) => ELEMENT_KEYS.filter((e) => lists.some((l) => l.includes(e)));

/**
 * A block's material: the elements of every elemental block that went into it, in element order,
 * and always its own elements (blocks given a class directly, as the showcase's presets and
 * ?debug do, count those).
 */
export const materialOf = (t) => mergeMaterial(t.mats ?? [], elementsOf(t.cls ?? {}));

/**
 * The fusions a block may become at 256, made only from its material: every pair of its
 * elements, the merge rule's own pick first (the element that slid in, with the one it slid
 * into), then the other pairs with the sliding block's element, then the rest; at most `max`.
 * → [{ element (it attacks like this one), fusion, key, name, color, tags }]
 */
export function fusionOffers(cls, material, max = 4) {
  const out = [];
  const seen = new Set();
  const add = (a, b) => {
    if (!a || !b || a === b || !material.includes(a) || !material.includes(b)) return;
    const key = fusionKey(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ element: a, fusion: b, key, name: FUSIONS[key].name, color: FUSIONS[key].color, tags: `${TAGS[a]} · ${TAGS[b]}` });
  };
  add(cls.element, cls.fusion);
  const order = [cls.element, ...material.filter((e) => e !== cls.element)];
  for (const a of order) for (const b of order) add(a, b);
  return out.slice(0, max);
}

/** What a block just became, for the announcement: the parts that combined and the result. */
export function describeStage(cls, stage, tier) {
  const el = (k) => ({ key: k, name: ELEMENTS[k].name, color: ELEMENTS[k].color });
  if (stage === 1) {
    const e = ELEMENTS[cls.element];
    return { stage, parts: [{ name: String(2 ** tier), color: null }, el(cls.element)], name: e.attack, colors: [e.color], desc: e.desc, tags: TAGS[cls.element] };
  }
  const fu = FUSIONS[fusionKey(cls.element, cls.fusion)];
  const fusion = fu.name;
  if (stage === 2) {
    return {
      stage,
      parts: [el(cls.element), el(cls.fusion)],
      name: fusion,
      colors: [fu.color],
      desc: `${TAGS[cls.element]} · ${TAGS[cls.fusion]}, both stronger.`,
      tags: `${TAGS[cls.element]} · ${TAGS[cls.fusion]}`,
    };
  }
  const apex = APEX[cls.ultimate];
  return {
    stage,
    parts: [{ name: fusion, color: fu.color }, el(cls.ultimate)],
    name: apex.name,
    colors: [fu.color, ELEMENTS[cls.ultimate].color],
    desc: apex.desc,
    tags: `${TAGS[cls.element]} · ${TAGS[cls.fusion]} · ${TAGS[cls.ultimate]}`,
  };
}

/** Up to three dice the player doesn't own yet, as card offers. */
export function dieOffers(owned, rng) {
  const pool = ELEMENT_KEYS.filter((e) => !owned.includes(e));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((e) => ({ element: e, name: ELEMENTS[e].name, attack: ELEMENTS[e].attack, desc: ELEMENTS[e].desc, colors: [ELEMENTS[e].color] }));
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

/** Attack profile for a ball (cached on the ball until its class or tier changes). */
export function profileFor(ball) {
  const key = `${ball.tier}:${ball.cls.element ?? ''}:${ball.cls.fusion ?? ''}:${ball.cls.ultimate ?? ''}`;
  if (ball.prof && ball.prof.key === key) return ball.prof;
  const c = ball.cls;
  const p = { key, kinds: [], name: 'Pebble', colors: ['#d9d2c5'], rate: 1, dmgMult: 1, signature: null, active: false, element: null, shoots: true };
  if (stageFor(ball.tier) < 1) {
    // below 16 a block doesn't shoot at all
    p.kinds.push('physical');
    p.shoots = false;
  } else if (!c.element) {
    p.kinds.push('physical'); // an element-less 16+ (debug) shoots plain pebbles
  } else if (!c.fusion) {
    p.active = true;
    const e = grownElement(c.element, growthOf(ball.tier));
    addComponents(p, e, 1);
    p.name = e.attack;
    p.colors = [e.color];
    p.rate = e.rate;
    p.dmgMult = e.dmg;
  } else {
    p.active = true;
    const a = grownElement(c.element, 3);
    const b = grownElement(c.fusion, 3);
    addComponents(p, a, 1.5);
    addComponents(p, b, 1.5);
    p.name = FUSIONS[fusionKey(c.element, c.fusion)].name;
    p.colors = [FUSIONS[fusionKey(c.element, c.fusion)].color]; // one unique element colour
    // the first element's firing rhythm, hitting harder
    p.rate = a.rate;
    p.dmgMult = a.dmg * 1.25;
    if (c.ultimate) {
      const x = grownElement(c.ultimate, 3);
      addComponents(p, x, 2);
      p.signature = APEX[c.ultimate];
      p.name = `${APEX[c.ultimate].name} ${p.name}`;
      p.colors.push(x.color);
      p.dmgMult *= 1.6;
    }
  }
  p.element = p.active ? c.element : null;
  p.shoot = shootFor(c, p.active, ball.tier);
  p.damage = turretDamage(ball.tier) * p.dmgMult;
  ball.prof = p;
  return p;
}
