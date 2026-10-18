// v2 fusion skills whose first element is ice (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
import { CELL } from './kit.js';
import { FIELD } from '../../config.js';

const VENOM = '#8fe53a';
const KIND = { lance: ['ice', 'lightning'], wall: ['ice', 'earth'], bloom: ['ice', 'nature'] };
/** The field's lanes now (one per board column: 4, 5 or 6). */
const lanes = () => Array.from({ length: FIELD.lanes }, (_, l) => l);
const SNOW_HOLD = 0.25; // s the blizzard's slow stays on a foe (renewed every tick while the snow falls)
const WALL_LIFT = 0.4; // the glacier wall stands this far above the board top (world units)
const FLOWER_R = 0.4; // a frost flower goes off within this many cells
const AHEAD = 0.75 * CELL; // a flower is planted this far ahead of its foe (world units) …
const EDGE = 0.3; // … and never nearer the board than this above its top
const ROWS = 4; // rows of flowers a path holds

/** The `n` lanes under the most pressure from `foes` (the nearer the board, the more a foe weighs); ties go to the lanes nearest `home`. */
function busiestLanes(ctx, n, foes, home) {
  const LANES = lanes();
  const press = LANES.map(() => 0);
  for (const e of foes) press[Math.max(0, Math.min(LANES.length - 1, e.lane))] += 1 / Math.max(1, e.y - ctx.boardTop);
  return [...LANES].sort((a, b) => press[b] - press[a] || Math.abs(a - home) - Math.abs(b - home) || a - b).slice(0, n);
}

export const SKILLS = {
  // Cryo Lance (Sparkfrost): every beat its tusk fires a frozen bolt down the busiest lane: every foe in it is hit and frozen
  'ice+lightning': {
    start(ctx) {
      ctx.prime('lance', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      for (let n = ctx.every('lance', p.periodS, dt); n > 0; n--) {
        const lane = ctx.busiestLane();
        const hit = ctx.inLane(lane);
        if (!hit.length) {
          ctx.prime('lance', p.periodS); // an empty field: the next bolt goes as soon as a foe comes
          break;
        }
        const x = ctx.laneX(lane);
        const low = Math.min(ctx.boardTop, ...hit.map((e) => e.y));
        ctx.moveTo(x, pet.y, 4); // it turns to aim down that lane
        for (const e of hit) {
          ctx.strike(e, p.hitPct, { kinds: KIND.lance });
          ctx.freeze(e, p.freezeS);
        }
        ctx.fx('beam', { x, y: ctx.portalY, x1: x, y1: low, w: 0.4 }); // the whole lane, from the portal down past its last foe
      }
    },
  },

  // Venom Tendrils (Frostjelly): tendrils on the toughest foes in reach slow them and drain their health; a freed tendril grabs another
  'ice+poison': {
    start: (ctx) => grab(ctx),
    tick: (ctx) => grab(ctx),
  },

  // Glacier Wall (Tundrock): a wall of ice across the busiest lanes in front of the blocks; when it melts it bursts
  'ice+earth': {
    start(ctx) {
      const { p } = ctx;
      const y = ctx.boardTop + WALL_LIFT;
      // the lanes busiest with foes the wall can still stop: those walking down the field above it
      const walkers = ctx.foes().filter((e) => e.mode === 'lane' && e.y > y);
      const lanes = busiestLanes(ctx, p.lanes, walkers, ctx.laneOf(ctx.pet.x)).sort((a, b) => a - b);
      ctx.wall({ lanes, y, dur: p.wallS, onEnd: (w) => shatter(ctx, w) });
      for (const l of lanes) ctx.fx('slam', { x: ctx.laneX(l), y, r: 0.5 });
    },
    end(ctx) {
      for (const w of ctx.walls()) shatter(ctx, w); // the pet goes before its wall melts: it melts now, and bursts
    },
  },

  // Whiteout (Flurrin): a blizzard over the whole field slows every foe; every beat the fastest one freezes
  'ice+wind': {
    start(ctx) {
      const { p } = ctx;
      const mid = (ctx.boardTop + ctx.portalY) / 2;
      ctx.zone({ kind: 'snow', x: 0, y: mid, r: Infinity, dur: ctx.s.dur, onTick: (e) => ctx.slow(e, p.slowPct, SNOW_HOLD) });
      ctx.prime('freeze', p.periodS);
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('freeze', p.periodS, dt); n > 0; n--) {
        const e = ctx.fastest();
        if (!e) {
          ctx.prime('freeze', p.periodS); // nobody out there: the first foe to come freezes
          break;
        }
        ctx.freeze(e, p.freezeS);
        ctx.fx('burst', { x: e.x, y: e.y, n: 12 });
      }
    },
  },

  // Rime Armour (Rimeplate): rime on every block softens every bite, and the cold bites back: the biter freezes
  'ice+metal': {
    start(ctx) {
      const { p } = ctx;
      const frozeAt = new Map(); // foe id → when (ctx.t) a bite last froze it
      coat(ctx);
      ctx.onBite((e, block, bite) => {
        const last = frozeAt.get(e.id);
        if (last == null || ctx.t - last >= p.cooldownS - 1e-9) {
          frozeAt.set(e.id, ctx.t);
          ctx.freeze(e, p.freezeS);
          ctx.fx('burst', { x: e.x, y: e.y, n: 8 });
        }
        return bite * (1 - p.guardPct);
      });
    },
    tick: (ctx) => coat(ctx), // a block that comes onto the board while the pet is out wears it too
  },

  // Frost Garden (Frostpetal): frost flowers in the foes' path; a foe that steps on one is hit and frozen, and the bloom heals a block
  'ice+nature': {
    start(ctx) {
      for (let i = 0; i < Math.min(ctx.p.count, ctx.p.max); i++) plant(ctx);
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('plant', p.periodS, dt); n > 0; n--) if (ctx.traps().length < p.max) plant(ctx);
    },
  },
};

/** Venom Tendrils: keep `count` tendrils on the toughest foes within reach (a tendril whose foe died grabs the next). */
function grab(ctx) {
  const { p, pet } = ctx;
  const alive = new Set(ctx.foes().map((e) => e.id));
  const held = new Set(ctx.tethered().filter((tt) => alive.has(tt.enemyId)).map((tt) => tt.enemyId));
  if (held.size >= p.count) return;
  const prey = ctx.near(pet.x, pet.y, p.rangeCells).filter((e) => !held.has(e.id)).sort((a, b) => b.hp - a.hp);
  for (const e of prey.slice(0, p.count - held.size)) {
    ctx.tether(e, { slowPct: p.slowPct, drainPct: p.drainPct, bossDrainPct: p.bossDrainPct });
    ctx.fx('burst', { x: e.x, y: e.y, n: 6, color: VENOM });
  }
}

/** Glacier Wall: it bursts as it melts: every foe within reach of the wall is hit, then frozen. */
function shatter(ctx, w) {
  const { p } = ctx;
  const hit = new Set();
  for (const l of w.lanes) {
    const x = ctx.laneX(l);
    for (const e of ctx.near(x, w.y, p.radiusCells)) hit.add(e);
    ctx.fx('ring', { x, y: w.y, r: p.radiusCells });
  }
  for (const e of hit) {
    ctx.strike(e, p.hitPct, { kinds: KIND.wall });
    ctx.freeze(e, p.freezeS);
  }
  const mid = w.lanes.reduce((sum, l) => sum + ctx.laneX(l), 0) / w.lanes.length;
  ctx.fx('text', { x: mid, y: w.y + 0.8, key: 'fx.shatter' });
}

/** Rime Armour: every block on the board wears the rime until the pet goes home. */
const coat = (ctx) => ctx.guardBlocks(Math.max(0, ctx.s.dur - ctx.t));

/** Frost Garden: one more flower in the foes' path (none when the path has no room left). */
function plant(ctx) {
  const { p } = ctx;
  const at = flowerSpot(ctx);
  if (!at) return;
  ctx.trap({
    x: at.x,
    y: at.y,
    r: FLOWER_R,
    kind: 'flower',
    onTrigger(e, tr) {
      ctx.strike(e, p.hitPct, { kinds: KIND.bloom });
      ctx.freeze(e, p.freezeS);
      // the bloom heals the nearest block that needs it (a block at full health has nothing to gain)
      ctx.healBlock(ctx.nearest(tr.x, tr.y, ctx.blocks().filter((t) => t.hp < t.maxHp)), p.healPct, tr);
      ctx.fx('ring', { x: tr.x, y: tr.y, r: 2 * FLOWER_R });
    },
  });
  ctx.fx('burst', { x: at.x, y: at.y, n: 6 });
}

/**
 * Frost Garden: where the next flower goes. A little ahead of each foe walking down the field, the leading
 * one first; then across the lanes just above the board, the busiest lane first; then a row further on
 * (toward the board ahead of a foe, up the lane above it). Never within a cell of another of its flowers.
 * → { x, y }, or null when there is no room.
 */
function flowerSpot(ctx) {
  const low = ctx.boardTop + EDGE;
  const high = ctx.portalY - CELL;
  const mine = ctx.traps();
  const free = (x, y) => mine.every((tr) => Math.hypot(tr.x - x, tr.y - y) >= CELL);
  const busy = ctx.busiestLane();
  const walkers = ctx.foes().filter((e) => e.mode === 'lane' && e.y - AHEAD >= low).sort((a, b) => b.s - a.s);
  const paths = [
    ...walkers.map((e) => ({ x: ctx.laneX(e.lane), y: e.y - AHEAD, dy: -CELL })),
    ...lanes().sort((a, b) => Math.abs(a - busy) - Math.abs(b - busy) || a - b).map((l) => ({ x: ctx.laneX(l), y: low, dy: CELL })),
  ];
  for (let k = 0; k < ROWS; k++) {
    for (const q of paths) {
      const y = q.y + k * q.dy;
      if (y >= low && y <= high && free(q.x, y)) return { x: q.x, y };
    }
  }
  return null;
}
