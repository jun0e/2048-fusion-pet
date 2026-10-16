// Spawn level: the player level of Teamfight Tactics, for a 2048 board. In TFT
// each level changes the shop's odds toward stronger units; here each level
// changes the odds of the block a swipe adds toward bigger values (2 → 4 → 8,
// and a ready 16 at the top levels). XP comes from cleared waves and coins (Buy
// XP, as TFT's 4 XP for 4 gold); the run's top block caps the level. After the
// run's first 512, 2s stop spawning. Pure data and functions: the run
// (src/sim/run.js) keeps the state.
import { tierValue } from '../config.js';

export const LEVELS = {
  max: 9,
  // XP from level L to L + 1 (index L − 1). Cleared waves alone give level 2 after wave 1,
  // level 3 near wave 10 and level 4 near wave 19; the rest is bought (TFT: "from level 6 on,
  // bought XP drives levels").
  xpToNext: [2, 12, 20, 28, 40, 52, 64, 72],
  // weights of the new block's value at each level: [2, 4, 8, 16]. Level 1 is classic 2048
  // (90/10). TFT's shape: the cheapest share falls level by level, a new value comes in at 1%
  // (8 at level 3, a ready 16 at level 5), and the most likely value moves up (4 at level 9).
  // Gentler than TFT's own numbers: this game is very sensitive to spawn value (a bot run's
  // mean wave, tools/level-probe.mjs with 192 games: 20.9 without levels; TFT-sized steps
  // 30–33; these 25.1, or 26.2 for a bot that buys XP).
  odds: [
    [90, 10, 0, 0],
    [89, 11, 0, 0],
    [86, 13, 1, 0],
    [80, 17, 3, 0],
    [72, 22, 5, 1],
    [62, 28, 8, 2],
    [50, 34, 12, 4],
    [38, 38, 17, 7],
    [26, 40, 24, 10],
  ],
  // XP as in TFT: a little for each cleared wave (TFT: 2 a round), the rest bought with coins,
  // so a level is a choice between swipes now and better blocks later. Merges give none: free
  // levels made bot runs twice as long (mean wave 21 → 45).
  xp: { merge: 0, waveClear: 2 },
  buy: { xp: 4, swipes: 2 }, // Buy XP: +4 XP for the price of 2 swipes (TFT: 4 XP for 4 gold)
  no2Tier: 9, // the run's first 512: 2s stop spawning
  // the level never runs ahead of the board: its cap is the run's top block tier − capBelowTop
  // (a 64 allows level 3, a 512 level 6, a 4096 level 9); null: no cap
  capBelowTop: 3,
};

const clampLevel = (level) => Math.max(1, Math.min(LEVELS.max, Math.floor(level) || 1));

/** The highest level a run whose top block is `maxTier` can reach. */
export const levelCap = (maxTier) => (LEVELS.capBelowTop == null ? LEVELS.max : Math.max(1, Math.min(LEVELS.max, maxTier - LEVELS.capBelowTop)));

/** XP needed to leave `level` (Infinity at the top level). */
export const xpNeeded = (level) => (clampLevel(level) >= LEVELS.max ? Infinity : LEVELS.xpToNext[clampLevel(level) - 1]);

/** The spawn table at a level: [[tier, weight]…] without empty weights, and without 2s once the run has made a 512. */
export function spawnTable(level, maxTier = 0) {
  const no2 = maxTier >= LEVELS.no2Tier;
  return LEVELS.odds[clampLevel(level) - 1].map((w, i) => [i + 1, w]).filter(([tier, w]) => w > 0 && !(no2 && tier === 1));
}

/** The odds at a level in whole percent: [{ tier, value, pct }] (the level card shows them). */
export function spawnOdds(level, maxTier = 0) {
  const table = spawnTable(level, maxTier);
  const total = table.reduce((s, [, w]) => s + w, 0);
  return table.map(([tier, w]) => ({ tier, value: tierValue(tier), pct: Math.round((w / total) * 100) }));
}

/** The price of Buy XP after `swipes` paid swipes: LEVELS.buy.swipes times the swipe price. */
export const buyXpPrice = (swipeCost) => LEVELS.buy.swipes * swipeCost;
