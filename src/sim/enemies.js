// Enemy roster and wave generator: an animal army per chapter (the Wild Hunt, the Paper
// Court, the Ember Peaks) that marches straight down the board's columns to hit the castle,
// with a telegraphed boss every few days. Regular enemies differ mostly in HP, speed and
// count; bosses carry the special rules. Keys are stable ids; each one's animal, look and
// motion live in src/art/foe-roster.js, whose names must match these.

import { DEFENSE, FIELD } from '../config.js';

// hp and speed are multipliers on DEFENSE.enemyBaseHp(day) and enemyBaseSpeed.
export const ENEMY_TYPES = {
  // Chapter 1: Eternal Forest
  pixie: { name: 'Moonmoth', hp: 1.0, speed: 1.0, castle: 40, flying: true, color: '#ff9ccf', size: 0.42 },
  griffinChick: { name: 'Dormouse', hp: 0.55, speed: 1.3, castle: 25, flying: true, color: '#fafafa', size: 0.34 },
  leafSprite: { name: 'Shield Beetle', hp: 1.4, speed: 0.9, castle: 40, flying: true, color: '#7fd16b', size: 0.42 },
  axolotlFairy: { name: 'Gillnewt', hp: 0.9, speed: 1.35, castle: 35, flying: true, color: '#ffb3c7', size: 0.4 },
  hoodedFlier: { name: 'Horned Owl', hp: 2.4, speed: 1.0, castle: 60, flying: true, color: '#e8c25a', size: 0.5 },
  flameSprite: { name: 'Ember Salamander', hp: 1.6, speed: 1.05, castle: 45, flying: true, element: 'fire', color: '#ff8a3d', size: 0.44 },
  // Chapter 2: Fareast Kingdom
  ninja: { name: 'Nightfox', hp: 0.9, speed: 1.6, castle: 40, color: '#4a4a66', size: 0.38 },
  armoredSoldier: { name: 'Pangolin Guard', hp: 2.2, speed: 0.8, castle: 60, physRes: 0.3, color: '#6f8fd6', size: 0.5 },
  ringMonk: { name: 'Cymbal Macaque', hp: 1.8, speed: 0.9, castle: 45, flying: true, color: '#d9a35b', size: 0.46 },
  kiteMinion: { name: 'Kite Carp', hp: 0.6, speed: 1.4, castle: 25, flying: true, color: '#c04848', size: 0.32 },
  // Chapter 3: Dragon Peaks
  villager: { name: 'Crag Ibex', hp: 0.8, speed: 1.1, castle: 30, color: '#b8875a', size: 0.38 },
  wyvern: { name: 'Crag Wyvern', hp: 1.6, speed: 1.4, castle: 50, flying: true, color: '#45b5a8', size: 0.5 },
  phoenix: { name: 'Cinder Bat', hp: 1.5, speed: 1.3, castle: 50, flying: true, element: 'fire', color: '#ff6a3d', size: 0.46 },
  redDragon: { name: 'Magma Snail', hp: 4.0, speed: 0.75, castle: 90, flying: true, element: 'fire', color: '#d84a3a', size: 0.62 },
  // Bosses (abilities beyond the intro cards are prototype defaults)
  elfRuler: {
    name: 'Hive Queen',
    boss: true,
    hp: 28,
    speed: 0.5,
    castle: 300,
    flying: true,
    color: '#ff8fd0',
    size: 0.95,
    heal: { every: 3, radius: 2.6, pct: 0.06 },
    intro: 'The mother of the Wild Hunt’s hive. Heals nearby allies.',
  },
  kiteNinja: {
    name: 'Pagoda Crab',
    boss: true,
    hp: 34,
    speed: 0.55,
    castle: 300,
    flying: true,
    physRes: 0.5,
    color: '#8a3ad8',
    size: 0.95,
    summonOnDeath: { type: 'kiteMinion', count: 4 },
    intro: 'A crab that carries a pagoda. Releases kite carps when it falls. Its shell has physical RES.',
  },
  dragonRider: {
    name: 'Lava Wyrm',
    boss: true,
    hp: 46,
    speed: 0.45,
    castle: 400,
    element: 'fire',
    physRes: 0.2,
    color: '#3a3040',
    size: 1.05,
    intro: 'A wyrm of cooling lava. Fire element: immune to burn, weak to ice.',
  },
};

export const CHAPTERS = [
  { key: 'forest', name: 'Eternal Forest', pool: ['pixie', 'griffinChick', 'leafSprite', 'axolotlFairy', 'hoodedFlier', 'flameSprite'], boss: 'elfRuler' },
  { key: 'fareast', name: 'Fareast Kingdom', pool: ['ninja', 'armoredSoldier', 'ringMonk', 'pixie'], boss: 'kiteNinja' },
  { key: 'peaks', name: 'Dragon Peaks', pool: ['villager', 'wyvern', 'phoenix', 'redDragon'], boss: 'dragonRider' },
];
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

/**
 * Deterministic wave: which lanes are attacked (shown at the portals), and a
 * spawn list of { t, type, lane } in small bursts; boss waves add the boss in
 * the middle attacked lane.
 */
export function generateWave(wave, rng) {
  const chapter = chapterFor(wave);
  const hpScale = hpScaleFor(wave);
  const laneCount = Math.min(FIELD.lanes, 2 + Math.floor(wave / 3));
  const order = [...Array(FIELD.lanes).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const lanes = order.slice(0, laneCount).sort((a, b) => a - b);
  const pool = poolFor(wave, chapter);
  const boss = isBossDay(wave) ? chapter.boss : null;
  let count = Math.min(30, 4 + Math.round(wave * 1.5));
  if (boss) count = Math.round(count * 0.6);

  const spawns = [];
  let t = 0;
  let left = count;
  while (left > 0) {
    const burst = Math.min(left, 1 + Math.floor(rng.next() * 3));
    const type = pool[Math.floor(rng.next() * pool.length)];
    for (let i = 0; i < burst; i++) {
      spawns.push({ t, type, lane: lanes[Math.floor(rng.next() * lanes.length)] });
      t += DEFENSE.spawnInterval * 0.5;
    }
    left -= burst;
    t += DEFENSE.spawnInterval;
  }
  const bossLane = boss ? lanes[Math.floor(lanes.length / 2)] : null;
  if (boss) spawns.push({ t: Math.min(t, DEFENSE.spawnInterval * 4), type: boss, lane: bossLane });
  spawns.sort((a, b) => a.t - b.t);
  return { wave, day: wave, chapter, hpScale, lanes, boss, bossLane, spawns, count: spawns.length };
}
