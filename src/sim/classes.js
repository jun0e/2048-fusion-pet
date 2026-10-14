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

export const ELEMENTS = {
  fire: {
    name: 'Fire',
    attack: 'Flame Burst',
    color: '#ff7a3d',
    desc: 'A burst of 3 fireballs at close range. Burns: damage over time that stacks.',
    rate: 0.9, // bursts per second
    dmg: 0.4, // per fireball
    shoot: { pattern: 'burst', count: 3, gap: 0.1, reach: 4, lanes: 0, target: 'front' },
    kind: 'fire',
    burn: { dpsPct: 0.32, dur: 3, max: 3 },
  },
  ice: {
    name: 'Ice',
    attack: 'Frost Lance',
    color: '#7fd4ff',
    desc: 'A heavy lance at the toughest foe, from far away. Slows; every 4th hit freezes.',
    rate: 0.6,
    dmg: 1.5,
    shoot: { pattern: 'lance', speed: 0.75, reach: 7, lanes: 0, target: 'strongest' },
    kind: 'ice',
    chill: { slow: 0.35, dur: 2 },
    freeze: { every: 4, dur: 1.0 },
  },
  lightning: {
    name: 'Lightning',
    attack: 'Chain Spark',
    color: '#ffe14d',
    desc: 'Instant bolt that arcs to 2 more foes, across neighbouring lanes.',
    rate: 0.85,
    dmg: 0.85,
    shoot: { pattern: 'chain', reach: 5.5, lanes: 1, target: 'front' },
    kind: 'lightning',
    chain: { jumps: 2, range: 2.6, falloff: 0.8 },
  },
  poison: {
    name: 'Poison',
    attack: 'Seeker Dart',
    color: '#b46cff',
    desc: 'Homing darts that seek unpoisoned foes in 3 lanes. Poison stacks up to 6.',
    rate: 1.1,
    dmg: 0.7,
    shoot: { pattern: 'homing', speed: 0.85, reach: 6.5, lanes: 1, target: 'unpoisoned' },
    kind: 'poison',
    poison: { dpsPct: 0.18, dur: 5, max: 6 },
  },
  earth: {
    name: 'Earth',
    attack: 'Boulder Mortar',
    color: '#c79a62',
    desc: 'Lobs a boulder into the biggest crowd near the wall: heavy splash, knockback.',
    rate: 0.6,
    dmg: 1.8,
    shoot: { pattern: 'lob', flight: 0.75, reach: 4.5, lanes: 0, target: 'crowd' },
    kind: 'physical',
    splash: { radius: 1.3, pct: 0.6 },
    knockback: 0.5,
  },
  wind: {
    name: 'Wind',
    attack: 'Gale Blade',
    color: '#bff7e6',
    desc: 'A blade that flies the whole lane, hitting every foe it passes, and slows.',
    rate: 0.8,
    dmg: 0.85,
    shoot: { pattern: 'blade', speed: 1.1, reach: 8, lanes: 0, target: 'front' },
    kind: 'physical',
    pierce: { len: 1.6 },
    chill: { slow: 0.2, dur: 1.5 },
  },
  metal: {
    name: 'Metal',
    attack: 'Coin Sniper',
    color: '#c9d3df',
    desc: 'A very fast shot at the weakest foe in the lane. Marked foes drop +60% coins.',
    rate: 0.9,
    dmg: 1.1,
    shoot: { pattern: 'sniper', speed: 3, reach: 8, lanes: 0, target: 'weakest' },
    kind: 'physical',
    loot: { pct: 0.6, dur: 3 },
  },
  nature: {
    name: 'Nature',
    attack: 'Seed Spread',
    color: '#4cd964',
    desc: '3 seeds at foes in a big circle around the block; 20% chance to repair the most damaged block by 12%.',
    rate: 1.0,
    dmg: 0.5, // per seed
    shoot: { pattern: 'spread', count: 3, radius: 6.5, target: 'front' }, // a circle around the block
    kind: 'nature',
    heal: { chance: 0.2, pct: 0.12 }, // repairs the most damaged block
  },
};
export const ELEMENT_KEYS = Object.keys(ELEMENTS);

/** How a dormant block (below 16) shoots: a single plain pebble. */
export const PLAIN_SHOOT = { pattern: 'single', reach: 5, lanes: 0, target: 'front' };

/**
 * Range of a class: the first (sliding) element's shape. Lane ranges reach
 * `reach` up and down the lane from the block, across `lanes` neighbouring lanes
 * each side; a circle range (`radius`) is measured from the block.
 * Fusions take the longer reach and the wider lane cover of the two elements.
 */
export function shootFor(cls, active) {
  if (!active || !cls.element) return { ...PLAIN_SHOOT };
  const a = ELEMENTS[cls.element].shoot;
  const shoot = { ...a };
  if (a.radius == null) {
    for (const k of [cls.fusion, cls.ultimate].filter(Boolean)) {
      const o = ELEMENTS[k].shoot;
      if (o.reach != null) shoot.reach = Math.max(shoot.reach, o.reach);
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
  lightning: 'Chain',
  poison: 'Poison',
  earth: 'Splash + Knockback',
  wind: 'Pierce + Slow',
  metal: 'Bonus coins',
  nature: 'Block repair',
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
    const e = ELEMENTS[c.element];
    addComponents(p, e, 1);
    p.name = e.attack;
    p.colors = [e.color];
    p.rate = e.rate;
    p.dmgMult = e.dmg;
  } else {
    p.active = true;
    const a = ELEMENTS[c.element];
    const b = ELEMENTS[c.fusion];
    addComponents(p, a, 1.5);
    addComponents(p, b, 1.5);
    p.name = FUSIONS[fusionKey(c.element, c.fusion)].name;
    p.colors = [FUSIONS[fusionKey(c.element, c.fusion)].color]; // one unique element colour
    // the first element's firing rhythm, hitting harder
    p.rate = a.rate;
    p.dmgMult = a.dmg * 1.25;
    if (c.ultimate) {
      const x = ELEMENTS[c.ultimate];
      addComponents(p, x, 2);
      p.signature = APEX[c.ultimate];
      p.name = `${APEX[c.ultimate].name} ${p.name}`;
      p.colors.push(x.color);
      p.dmgMult *= 1.6;
    }
  }
  p.element = p.active ? c.element : null;
  p.shoot = shootFor(c, p.active);
  p.damage = turretDamage(ball.tier) * p.dmgMult;
  ball.prof = p;
  return p;
}
