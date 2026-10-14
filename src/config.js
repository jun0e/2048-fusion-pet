// All tunable numbers live here. Sim and render both read from this file;
// nothing in src/sim imports three.js, so the rules run headless in tests.

// World units: the container interior spans x ∈ [-HALF_W, HALF_W], y ∈ [0, HEIGHT].
export const BOARD = {
  halfWidth: 3.6,
  height: 11,
  dangerY: 9.2, // a settled ball whose top stays above this line too long ends the run
  dropY: 10.2, // centre height of the ball waiting to be dropped
};

export const PHYSICS = {
  dt: 1 / 60, // fixed simulation step (seconds)
  substeps: 8,
  gravity: -32,
  airDamping: 0.9995, // per substep, applied to verlet velocity
  restitution: 0.18, // bounce off walls/floor
  wallFriction: 0.12, // tangential velocity removed on wall/floor contact
  ballFriction: 0.04, // tangential velocity removed on ball-ball contact
  growSeconds: 0.14, // a merged ball grows to full size over this time
  maxBalls: 120,
};

export const RULES = {
  dropCooldown: 0.42, // seconds between drops
  freshSeconds: 1.2, // a dropped ball ignores the danger line until it lands or this elapses
  dangerSeconds: 2.2, // time above the danger line before game over
  comboWindow: 1.1, // merges closer together than this chain into a combo
  spawnWeights: [
    // [tier, weight] — tier 1 = "2", tier 2 = "4", …
    [1, 40],
    [2, 30],
    [3, 20],
    [4, 10],
  ],
  milestoneTier: 11, // 2048
};

// Tier t has value 2^t. Radius grows ~14% per tier and is capped so very
// large balls still fit the container.
export const MAX_TIER = 16;
export const tierValue = (t) => 2 ** t;
export const tierRadius = (t) => Math.min(0.42 * 1.14 ** (t - 1), 2.7);
export const tierMass = (t) => tierRadius(t) ** 2; // area-proportional

// Cozy pastel palette, one hue per tier. Index 0 is unused.
export const TIER_COLORS = [
  null,
  '#8ecae6', // 2
  '#95d5b2', // 4
  '#ffd166', // 8
  '#f4a261', // 16
  '#ef6f8b', // 32
  '#c39bff', // 64
  '#5fd0f0', // 128
  '#7fdc8f', // 256
  '#ffae94', // 512
  '#f25c9c', // 1024
  '#ffc93c', // 2048
  '#6a5acd', // 4096
  '#2ec4b6', // 8192
  '#ff7a59', // 16384
  '#9b5de5', // 32768
  '#00bbf9', // 65536
];

// Tiers at or above this get an emissive glow (bloom picks them up).
export const GLOW_FROM_TIER = 11;

// --- square 2048 board ---------------------------------------------------------

// Classic 4×4 sliding board, centred on x = 0. Row 0 is the bottom row.
export const GRID = {
  size: 4,
  cell: 2, // world units per cell (board spans x ∈ [-4, 4], y ∈ [0, 8])
  turretR: 0.6, // kept for range-limited classes; blocks currently target globally
  spawnWeights: [
    // classic 2048: 90% "2", 10% "4"
    [1, 90],
    [2, 10],
  ],
};
export const cellX = (col) => -(GRID.size * GRID.cell) / 2 + GRID.cell * (col + 0.5);
export const cellY = (row) => GRID.cell * (row + 0.5);
export const GRID_TOP = GRID.size * GRID.cell;

// --- tower defense layer -----------------------------------------------------

// Slime Legion lanes: one per board column. Enemies leave a portal at the top of
// their lane, walk down the field above the board, keep going straight through
// their board column (over the blocks) and hit the castle wall UNDER the board.
export const FIELD = {
  lanes: GRID.size,
  spawnY: GRID_TOP + 0.9 + 8, // portals, 8 units of field above the board
  gateY: -0.3, // the board's bottom edge (siege: enemies hunt blocks once they reach the board)
};
export const LANE_LENGTH = FIELD.spawnY - FIELD.gateY;
export const laneX = (lane) => cellX(lane);
/** Point at distance s along a lane (s = 0 at the portal, LANE_LENGTH at the wall). */
export function laneAt(lane, s) {
  const d = Math.max(0, Math.min(LANE_LENGTH, s));
  return { x: laneX(lane), y: FIELD.spawnY - d, dx: 0, dy: -1 };
}

// Siege: no castle. Every block has hidden health (value × hpPerValue) that
// refills at the start of each wave; enemies that reach the board stop at the
// nearest block and attack it; a block at 0 is destroyed for good, and the run
// is lost when the last block falls.
export const SIEGE = {
  // block health = hpPerTier × tier^hpExp: grows with the tier, not the value, so big
  // blocks stay fragile (a 2 has 50 HP, a 16 has 400, a 256 1,131, a 2048 1,824)
  hpPerTier: 50,
  hpExp: 1.5,
  attackPerCastle: 0.45, // enemy damage per hit = its old castle damage × this …
  attackGrowth: 1.13, // … × attackGrowth^(wave − 1)
  bossAttack: 0.35, // bosses' castle damage was built for a 1,000 HP castle: scale their bite down
  contact: 1.15, // an enemy this close (centre to centre) to a block attacks it
  biteEvery: 1, // seconds between an enemy's hits (the first lands firstBite s after it arrives)
  firstBite: 0.4,
  boardTop: GRID_TOP + 0.6, // past this line an enemy leaves its lane and hunts blocks
  incomePerSec: 3, // coins trickle in during a wave, so lost blocks can always be swiped back in
};

export const DEFENSE = {
  castleHp: 1000,
  bossEvery: 5, // every 5th wave is a boss wave
  classTiers: [4, 8, 12], // 16, 256, 4096
  turret: {
    baseDamage: 8,
    damageGrowth: 1.62, // per tier
    laneReach: GRID.cell * 0.5 + 0.25, // a block covers its own column's lane only
    projectileSpeed: 12, // slow enough to read in flight (Random Dice-like)
  },
  frozenVuln: 0.25, // frozen enemies take +25% damage (BALL x PIT Freeze)
  spawnInterval: 0.8, // seconds between enemies of a wave
  enemyBaseHp: 36,
  enemyHpGrowth: 1.125, // per wave
  enemyBaseSpeed: 1.6, // units per second (≈11 s from the portal, through the board, to the wall)
};

// Random Dice-style economy: kills drop coins, every swipe costs coins (and
// spawns a block). Tuned with tools/economy.mjs (npm run economy) so a player
// spends each wave's coins in the following break instead of banking them:
// about 12 swipes a wave early, rising to about 20 by wave 15, with no carry-over.
export const ECONOMY = {
  startCoins: 100, // siege: room to build the first turrets
  swipeBase: 5,
  swipeStep: 1, // cost +1 …
  swipeStepEvery: 12, // … every 12 swipes
  killBase: 4, // coins per kill = killBase + killPerWave × wave (bosses × bossMult)
  killPerWave: 1,
  bossMult: 6,
  waveClearBase: 15, // bonus when a wave is cleared: waveClearBase + waveClearPerWave × wave
  waveClearPerWave: 3,
  comboAt: 3, // 3+ merges in one swipe refund that swipe
  sellSwipes: 1, // selling a turret (16+) pays the price of one swipe …
  breakSwipes: 3, // … breaking a dormant block (below 16) costs three swipes
  prepSeconds: 15, // before the first wave (Wave now skips it)
  breakBase: 10, // break before wave W: min(breakMax, breakBase + breakPerWave × W) seconds
  breakPerWave: 2, // … so 14 s before wave 2, growing to …
  breakMax: 30, // … a 30 s cap from wave 10 (Wave now skips it)
};

// Dice: every new block spawns in the colour (element) of a random die from the
// deck. When blocks merge, the one that slides in sets the colour. You start
// with 2 dice and add one more the first time your top block reaches each tier below.
export const DICE = {
  start: 2,
  unlockTiers: [6, 8, 9], // 64, 256, 512 (the projection puts them around waves 4, 10 and 15)
};
