// The level road (v2.1, docs/v2/SPEC-v2.1.md section 4): 20 levels in a 12-minute run, about one every
// 30 seconds. XP comes from kills and cleared waves (Buy XP is gone). Every level moves the odds of the
// block a swipe adds toward bigger values (2 → 4 → 8 → 16 → 32, as the player level of Teamfight Tactics
// moves its shop's odds); some levels also add an element pick, grow the board, or charge summons faster.
// After the run's first 512, 2s stop spawning. Pure data and functions: the run (src/sim/run.js) keeps
// the state.
import { tierValue } from '../config.js';

export const LEVELS = {
  max: 20,
  // XP from level L to L + 1 (index L − 1), set so the bot (tools/v21-probe.mjs) reaches each level about
  // when LEVEL_ROAD says: kills grow wave by wave, so the bar grows too
  xpToNext: [3, 12, 16, 17, 18, 20, 22, 24, 24, 25, 27, 28, 29, 30, 32, 34, 48, 60, 90],
  // weights of the new block's value at each level: [2, 4, 8, 16, 32]. A value comes in small and grows;
  // 2s stop at level 12, 4s at 16 and 8s at 20 (the road says so)
  odds: [
    [90, 10, 0, 0, 0],
    [86, 14, 0, 0, 0],
    [80, 18, 2, 0, 0],
    [74, 22, 4, 0, 0],
    [67, 26, 7, 0, 0],
    [60, 30, 10, 0, 0],
    [52, 33, 13, 2, 0],
    [45, 35, 16, 4, 0],
    [38, 36, 20, 6, 0],
    [31, 37, 23, 9, 0],
    [24, 38, 26, 12, 0],
    [0, 44, 34, 19, 3],
    [0, 40, 36, 20, 4],
    [0, 35, 38, 22, 5],
    [0, 30, 40, 24, 6],
    [0, 0, 52, 38, 10],
    [0, 0, 48, 40, 12],
    [0, 0, 44, 42, 14],
    [0, 0, 40, 44, 16],
    [0, 0, 0, 72, 28],
  ],
  // XP: one a kill (a boss more), and a little for each cleared wave
  xp: { kill: 1, boss: 10, waveClear: 3, merge: 0 },
  no2Tier: 9, // the run's first 512: 2s stop spawning
  // v2 kept the level under the run's top block; v2.1 has no cap (null): levels are the run's clock
  capBelowTop: null,
  // Buy XP is gone (v2.1); kept as data only so a view that still reads it does not break
  buy: { xp: 0, swipes: 0 },
};

/**
 * The level road: one entry per level, { level, minute, rewards }. `minute` is when an average run
 * reaches the level (the bot's median, tools/v21-probe.mjs with 96 games; level 20 is for strong play:
 * 6% of the bot's runs get there). Rewards:
 *   { kind: 'odds', adds: [tier], drops: [tier] }  new blocks get bigger; values that start / stop
 *   { kind: 'element' }                              a pick of a new element (the die card)
 *   { kind: 'grow', size }                           the board grows (at the next break)
 *   { kind: 'charge', s }                            summons charge s seconds faster
 *   { kind: 'top' }                                  the top level
 */
export const LEVEL_ROAD = [
  { level: 1, minute: 0, rewards: [] },
  { level: 2, minute: 0.3, rewards: [{ kind: 'element' }] },
  { level: 3, minute: 0.6, rewards: [{ kind: 'odds', adds: [3], drops: [] }] },
  { level: 4, minute: 0.9, rewards: [{ kind: 'element' }] },
  { level: 5, minute: 1.3, rewards: [{ kind: 'odds', adds: [], drops: [] }] },
  { level: 6, minute: 1.9, rewards: [{ kind: 'element' }] },
  { level: 7, minute: 2.3, rewards: [{ kind: 'odds', adds: [4], drops: [] }] },
  { level: 8, minute: 2.7, rewards: [{ kind: 'element' }] },
  { level: 9, minute: 3.1, rewards: [{ kind: 'odds', adds: [], drops: [] }] },
  { level: 10, minute: 3.7, rewards: [{ kind: 'element' }] },
  { level: 11, minute: 4.2, rewards: [{ kind: 'grow', size: 5 }] },
  { level: 12, minute: 4.8, rewards: [{ kind: 'odds', adds: [5], drops: [1] }] },
  { level: 13, minute: 5.2, rewards: [{ kind: 'element' }] },
  { level: 14, minute: 5.7, rewards: [{ kind: 'odds', adds: [], drops: [] }] },
  { level: 15, minute: 6.2, rewards: [{ kind: 'charge', s: 2 }] },
  { level: 16, minute: 6.7, rewards: [{ kind: 'odds', adds: [], drops: [2] }] },
  { level: 17, minute: 7.2, rewards: [{ kind: 'grow', size: 6 }] },
  { level: 18, minute: 7.8, rewards: [{ kind: 'odds', adds: [], drops: [] }] },
  { level: 19, minute: 8.6, rewards: [{ kind: 'charge', s: 2 }] },
  { level: 20, minute: 9.2, rewards: [{ kind: 'odds', adds: [], drops: [3] }, { kind: 'top' }] },
];

/** The rewards a level brings (an empty list for level 1 or a level off the road). */
export const rewardsAt = (level) => LEVEL_ROAD[level - 1]?.rewards ?? [];

const clampLevel = (level) => Math.max(1, Math.min(LEVELS.max, Math.floor(level) || 1));

/** The highest level a run whose top block is `maxTier` can reach (v2.1: no cap, the top level). */
export const levelCap = (maxTier) => (LEVELS.capBelowTop == null ? LEVELS.max : Math.max(1, Math.min(LEVELS.max, maxTier - LEVELS.capBelowTop)));

/** XP needed to leave `level` (Infinity at the top level). */
export const xpNeeded = (level) => (clampLevel(level) >= LEVELS.max ? Infinity : LEVELS.xpToNext[clampLevel(level) - 1]);

/** The spawn table at a level: [[tier, weight]…] without empty weights, and without 2s once the run has made a 512. */
export function spawnTable(level, maxTier = 0) {
  const no2 = maxTier >= LEVELS.no2Tier;
  const table = LEVELS.odds[clampLevel(level) - 1].map((w, i) => [i + 1, w]).filter(([tier, w]) => w > 0 && !(no2 && tier === 1));
  return table.length ? table : [[2, 1]];
}

/** The odds at a level in whole percent: [{ tier, value, pct }] (tools and tests; the screens show no odds). */
export function spawnOdds(level, maxTier = 0) {
  const table = spawnTable(level, maxTier);
  const total = table.reduce((s, [, w]) => s + w, 0);
  return table.map(([tier, w]) => ({ tier, value: tierValue(tier), pct: Math.round((w / total) * 100) }));
}

/** Buy XP is gone (v2.1): nothing to buy. */
export const buyXpPrice = () => null;
