// Enemy roster and wave generator: an animal army per chapter (the Wild Hunt, the Paper
// Court, the Ember Peaks) that marches straight down the board's columns to hit the castle,
// with a telegraphed boss every few days. Regular enemies differ mostly in HP, speed and
// count; bosses carry the special rules. Keys are stable ids; each one's animal, look and
// motion live in src/art/foe-roster.js, whose names are these in English (the language's table,
// src/i18n: foe.<key>, gives the name the player sees).

import { has, tr } from '../i18n/index.js';
import { DEFENSE, FIELD, WAVES } from '../config.js';

// hp and speed are multipliers on DEFENSE.enemyBaseHp(day) and enemyBaseSpeed.
export const ENEMY_TYPES = {
  // Chapter 1: Eternal Forest
  pixie: { hp: 1.0, speed: 1.0, castle: 40, flying: true, color: '#ff9ccf', size: 0.42 },
  griffinChick: { hp: 0.55, speed: 1.3, castle: 25, flying: true, color: '#fafafa', size: 0.34 },
  leafSprite: { hp: 1.4, speed: 0.9, castle: 40, flying: true, color: '#7fd16b', size: 0.42 },
  axolotlFairy: { hp: 0.9, speed: 1.35, castle: 35, flying: true, color: '#ffb3c7', size: 0.4 },
  hoodedFlier: { hp: 2.4, speed: 1.0, castle: 60, flying: true, color: '#e8c25a', size: 0.5 },
  flameSprite: { hp: 1.6, speed: 1.05, castle: 45, flying: true, element: 'fire', color: '#ff8a3d', size: 0.44 },
  // Chapter 2: Fareast Kingdom
  ninja: { hp: 0.9, speed: 1.6, castle: 40, color: '#4a4a66', size: 0.38 },
  armoredSoldier: { hp: 2.2, speed: 0.8, castle: 60, physRes: 0.3, color: '#6f8fd6', size: 0.5 },
  ringMonk: { hp: 1.8, speed: 0.9, castle: 45, flying: true, color: '#d9a35b', size: 0.46 },
  kiteMinion: { hp: 0.6, speed: 1.4, castle: 25, flying: true, color: '#c04848', size: 0.32 },
  // Chapter 3: Dragon Peaks
  villager: { hp: 0.8, speed: 1.1, castle: 30, color: '#b8875a', size: 0.38 },
  wyvern: { hp: 1.6, speed: 1.4, castle: 50, flying: true, color: '#45b5a8', size: 0.5 },
  phoenix: { hp: 1.5, speed: 1.3, castle: 50, flying: true, element: 'fire', color: '#ff6a3d', size: 0.46 },
  redDragon: { hp: 4.0, speed: 0.75, castle: 90, flying: true, element: 'fire', color: '#d84a3a', size: 0.62 },
  // Bosses (abilities beyond the intro cards are prototype defaults)
  elfRuler: {
    boss: true,
    hp: 28,
    speed: 0.5,
    castle: 300,
    flying: true,
    color: '#ff8fd0',
    size: 0.95,
    heal: { every: 3, radius: 2.6, pct: 0.06 },
  },
  kiteNinja: {
    boss: true,
    hp: 34,
    speed: 0.55,
    castle: 300,
    flying: true,
    physRes: 0.5,
    color: '#8a3ad8',
    size: 0.95,
    summonOnDeath: { type: 'kiteMinion', count: 4 },
  },
  dragonRider: {
    boss: true,
    hp: 46,
    speed: 0.45,
    castle: 400,
    element: 'fire',
    physRes: 0.2,
    color: '#3a3040',
    size: 1.05,
  },
};
// each foe's name, and a boss's intro line, come from the language's table (src/i18n)
for (const [k, f] of Object.entries(ENEMY_TYPES)) {
  f.name = tr(`foe.${k}`);
  if (has(`foe.${k}.intro`)) f.intro = tr(`foe.${k}.intro`);
}

export const CHAPTERS = [
  { key: 'forest', pool: ['pixie', 'griffinChick', 'leafSprite', 'axolotlFairy', 'hoodedFlier', 'flameSprite'], boss: 'elfRuler' },
  { key: 'fareast', pool: ['ninja', 'armoredSoldier', 'ringMonk', 'pixie'], boss: 'kiteNinja' },
  { key: 'peaks', pool: ['villager', 'wyvern', 'phoenix', 'redDragon'], boss: 'dragonRider' },
];
for (const c of CHAPTERS) c.name = tr(`chapter.${c.key}`);
export const DAYS_PER_CHAPTER = 10;

export const chapterFor = (day) => CHAPTERS[Math.floor((day - 1) / DAYS_PER_CHAPTER) % CHAPTERS.length];
export const hpScaleFor = (day) => DEFENSE.enemyBaseHp * DEFENSE.enemyHpGrowth ** (day - 1);
export const isBossDay = (day) => day % DEFENSE.bossEvery === 0;

// Types unlock gradually inside a chapter so early days stay simple.
function poolFor(day, chapter) {
  const dayInChapter = ((day - 1) % DAYS_PER_CHAPTER) + 1;
  const n = Math.min(chapter.pool.length, 2 + Math.floor(dayInChapter / 2));
  return chapter.pool.slice(0, n);
}

/** v2's foe count: 4 + 1.5 a wave, at most 30 (the coins a wave pays were tuned to it). */
export const v2CountFor = (wave) => Math.min(30, 4 + Math.round(wave * 1.5));

/**
 * How many foes a wave brings (v2.1: the count keeps growing all run, no cap; a bigger board brings more,
 * `countMult`), before a boss wave's cut.
 */
export const countFor = (wave, countMult = 1) => Math.round((4 + wave * WAVES.perWave) * countMult);

/**
 * The share of a wave's foes that resist the player's top element, and its second (v2.1, SPEC-v2.1
 * section 5): none before WAVES.resist.from, then growing a little each wave.
 */
export function resistShares(wave) {
  const r = WAVES.resist;
  return {
    top: wave >= r.from ? Math.min(r.topMax, r.topStep * (wave - r.from + 1)) : 0,
    second: wave >= r.secondFrom ? Math.min(r.secondMax, r.secondStep * (wave - r.secondFrom + 1)) : 0,
    boss: wave >= r.bossFrom,
  };
}

/**
 * Deterministic wave: which lanes are attacked (shown at the portals), and a spawn list of
 * { t, type, lane, resist } in small bursts; boss waves add the boss in the middle attacked lane.
 * Options (v2.1, the run gives them): `lanes` the field's lanes now (the board's size), `countMult` more
 * foes on a bigger board, `hpMult` the ramp's extra toughness, `resist` { top, second } the elements the
 * player deals the most damage with (null: none yet). A wave's coins stay about v2's: `coinScale` is what
 * each kill pays of v2's kill coins.
 */
export function generateWave(wave, rng, { lanes: laneTotal = FIELD.lanes, countMult = 1, hpMult = 1, resist = null } = {}) {
  const chapter = chapterFor(wave);
  const hpScale = hpScaleFor(wave) * hpMult;
  const laneCount = Math.min(laneTotal, 2 + Math.floor(wave / 3));
  const order = [...Array(laneTotal).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const lanes = order.slice(0, laneCount).sort((a, b) => a - b);
  const pool = poolFor(wave, chapter);
  const boss = isBossDay(wave) ? chapter.boss : null;
  let count = countFor(wave, countMult);
  const v2Count = v2CountFor(wave);
  if (boss) count = Math.round(count * 0.6);
  // bigger waves come a little faster, so a wave does not drag on
  const gap = DEFENSE.spawnInterval * Math.max(WAVES.gapMin, 1 - WAVES.gapPerWave * wave);

  const spawns = [];
  let t = 0;
  let left = count;
  while (left > 0) {
    const burst = Math.min(left, 1 + Math.floor(rng.next() * 3));
    const type = pool[Math.floor(rng.next() * pool.length)];
    for (let i = 0; i < burst; i++) {
      spawns.push({ t, type, lane: lanes[Math.floor(rng.next() * lanes.length)], resist: null });
      t += gap * 0.5;
    }
    left -= burst;
    t += gap;
  }
  const bossLane = boss ? lanes[Math.floor(lanes.length / 2)] : null;
  if (boss) spawns.push({ t: Math.min(t, DEFENSE.spawnInterval * 4), type: boss, lane: bossLane, resist: null, boss: true });
  spawns.sort((a, b) => a.t - b.t);
  // resistances, rolled last so the rest of the wave stays as it was without them
  if (resist?.top) {
    const share = resistShares(wave);
    for (const sp of spawns) {
      const res = {};
      if (sp.boss ? share.boss : rng.next() < share.top) res[resist.top] = WAVES.resist.amount;
      if (resist.second && !sp.boss && rng.next() < share.second) res[resist.second] = WAVES.resist.amount;
      sp.resist = Object.keys(res).length ? res : null;
    }
  }
  const coinScale = Math.min(1, (boss ? Math.round(v2Count * 0.6) : v2Count) / Math.max(1, count - (boss ? 1 : 0)));
  return { wave, day: wave, chapter, hpScale, lanes, boss, bossLane, spawns, count: spawns.length, coinScale };
}
