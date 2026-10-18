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

// A square sliding board, centred on x = 0. Row 0 is the bottom row. It starts 4×4 and grows to 5×5
// and 6×6 on the level road (v2.1, docs/v2/SPEC-v2.1.md section 1) in one footprint: x ∈ [-4, 4],
// y ∈ [0, 8], so its cells shrink as it grows. Each column guards its own lane.
export const BOARD_SPAN = 8; // the board's width and height (world units)
export const BOARD_HALF = BOARD_SPAN / 2;
/**
 * The 4×4 board's cell (world units): the unit the game's distances were designed in. Attack reaches,
 * skill radii (…Cells in src/sim/skills/data.js) and speeds keep it as the board grows; a board cell
 * (GRID.cell) is this or smaller.
 */
export const DESIGN_CELL = 2;
let boardSize = 4;
/**
 * The board size the sim and the views use now. A run sets its own on every call into it
 * (src/sim/run.js), so two runs in one process each see their own board.
 */
export function setBoardSize(n) {
  boardSize = n;
}
export const GRID = {
  /** The board's side, in cells: 4, 5 or 6 (setBoardSize). */
  get size() {
    return boardSize;
  },
  set size(n) {
    boardSize = n;
  },
  /** World units per cell: the footprint shared by the cells (2 at 4×4, 1.6 at 5×5, 1.33 at 6×6). */
  get cell() {
    return BOARD_SPAN / boardSize;
  },
  turretR: 0.6, // kept for range-limited classes; blocks currently target globally
  spawnWeights: [
    // classic 2048: 90% "2", 10% "4"
    [1, 90],
    [2, 10],
  ],
};
export const cellX = (col) => -BOARD_HALF + GRID.cell * (col + 0.5);
export const cellY = (row) => GRID.cell * (row + 0.5);
export const GRID_TOP = BOARD_SPAN;

// --- tower defense layer -----------------------------------------------------

// Slime Legion lanes: one per board column. Enemies leave a portal at the top of
// their lane, walk down the field above the board, keep going straight through
// their board column (over the blocks) and hit the castle wall UNDER the board.
export const FIELD = {
  /** One lane per board column (4, 5 or 6). */
  get lanes() {
    return boardSize;
  },
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
    /** A block covers its own column's lane only (half a board cell, and a little). */
    get laneReach() {
      return GRID.cell * 0.5 + 0.25;
    },
    projectileSpeed: 12, // slow enough to read in flight (Random Dice-like)
  },
  frozenVuln: 0.25, // frozen enemies take +25% damage (BALL x PIT Freeze)
  spawnInterval: 0.8, // seconds between enemies of a wave
  enemyBaseHp: 36,
  enemyHpGrowth: 1.17, // per wave (v2.1: the board grows and spawns 16s and 32s, so the waves keep up; v2 was 1.125)
  enemyBaseSpeed: 1.6, // units per second (≈11 s from the portal, through the board, to the wall)
  // a boss gets used to pushback (the user's steps): after 20 / 50 / 100 pushes each push is 25 / 50 / 75%
  // shorter (on top of its half push and the brace), so Wind and Earth stall a boss but cannot hold it for good.
  // tools/boss-push-probe.mjs, Wind + Earth deck: boss waves 10 / 15 / 20 cleared 79 / 73 / 90% (86 / 82 / 99%
  // without it); steps at 50 / 100 / 200 would cost only 2–4 points. The user picks.
  bossPushResist: [
    { after: 20, resist: 0.25 },
    { after: 50, resist: 0.5 },
    { after: 100, resist: 0.75 },
  ],
};

// v2.1 (docs/v2/SPEC-v2.1.md section 5): waves grow in count all run, foes resist the player's top
// elements, and after 8 minutes the waves steepen; from 10 they match the board's damage per second, so
// nobody lasts past about 12. Tuned with tools/v21-probe.mjs.
export const WAVES = {
  perWave: 1.5, // foes a wave adds: 4 + 1.5 × wave, with no cap (v2 stopped at 30)
  sizeCount: 1, // a bigger board brings more foes: × (size / 4) ^ sizeCount
  gapPerWave: 0.012, // a wave's foes come this much faster each wave …
  gapMin: 0.5, // … down to half v2's gap
  // resistances: from wave `from`, a share of each wave (topStep a wave, up to topMax) resists the player's
  // top element; from `secondFrom` also the second; bosses resist the top from `bossFrom`; `amount` of a hit
  resist: { from: 10, topStep: 0.05, topMax: 0.5, secondFrom: 20, secondStep: 0.04, secondMax: 0.35, bossFrom: 15, amount: 0.5 },
};
export const V2_1 = {
  // the ramp, in minutes of run time: from steepAt the waves' health is × e^(steepK · (m − steepAt)²);
  // from dpsAt a wave also needs at least needS seconds of the board's whole firepower, needS starting at
  // the run's own ratio then (at least needMin) and × needGrowth each minute
  // tools/v21-probe.mjs, 96 bot games: 4% dead by 8 min, the median at about 9.5, the longest about 10.6
  ramp: { steepAt: 8, dpsAt: 10, steepK: 2, needGrowth: 4, needMin: 10, biteExp: 0.5 }, // bites grow with the steep part ^ biteExp
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
  brokeBreak: 4, // a break shrinks to this when no swipe is possible (no coins or a locked board): nothing to do but wait
};

// The first wave of a player's first run (journey tuning): it comes down the
// column of the player's biggest block, with fewer foes, so the first turret is
// seen to work before the siege gets real.
export const GUIDED_WAVE = { count: 4 };

// Dice: the elements in the player's deck. You start with 2; spawn levels add more (V2.unlockLevels).
export const DICE = {
  start: 2,
  // retired in v2 (new elements come from spawn levels): the run no longer reads it; kept only while
  // src/art/frame-kit.js nextDieAt still does
  unlockTiers: [6, 8, 9],
};

// v2 (docs/v2/SPEC.md): elemental eggs, one single pet per element, fusions by merging two single pets,
// element buffs fed into fusions, a summon skill at 1024, a pure form at 4096, element unlocks by level.
export const V2 = {
  // a new block is an elemental egg this often, when the deck has an element with no single egg or pet
  // on the board (one single per element at a time; fusions do not count). The run's main power knob:
  // tools/v2-probe.mjs (96 bot games, before summons do anything) puts the median final wave at 11 / 23 /
  // 25 / 26 / 30 / 40 for 0 / 0.08 / 0.1 / 0.12 / 0.22 / 0.35; v1's was 24
  eggChance: 0.1,
  summonTier: 10, // 1024: a fusion's summon skill unlocks (its namecard)
  pureTier: 12, // 4096: a pet becomes the pure form of its main element (an aura for every other pet)
  // the summon: charges over this much wave time (only while foes are on the field), then the pet is out
  // on the field this long using its skill (src/sim/skills/data.js FUSION_SKILLS)
  summon: { chargeS: 15, durS: 8, hopS: 0.6 },
  // the player's spawn levels that each offer a new element: a pick of `offers` (docs/v2/SPEC.md)
  unlockLevels: [2, 3, 4, 5, 6, 7],
  offers: 2,
};
