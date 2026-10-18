// v2 fusion skills whose first element is earth (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
import { lanePressure } from '../roam.js';

/** How long the sandstorm's blindness and slow outlast a foe's step out of it (s). */
const LINGER = 0.25;
/** How long one taunt lasts (s): Iron Taunt renews it every tick for the foes within reach. */
const TAUNT_HOLD = 0.25;
/** Moss Spring heals in steps this far apart (s), healPct × the step at a time. */
const HEAL_STEP = 0.5;

/**
 * The `n` busiest lanes, the busiest first: ctx.busiestLane()'s pick, then the others by the same lane
 * pressure (src/sim/roam.js), ties to the lanes nearest it. (The kit only names the one busiest lane.)
 */
function busiestLanes(ctx, n) {
  const press = lanePressure(ctx.foes());
  const first = ctx.busiestLane();
  const order = (a, b) => {
    if (a === first || b === first) return a === first ? -1 : 1;
    const dp = press[b] - press[a];
    if (Math.abs(dp) > 1e-9) return dp;
    return Math.abs(a - first) - Math.abs(b - first) || a - b;
  };
  return press
    .map((_, lane) => lane)
    .sort(order)
    .slice(0, n);
}

/** Iron Taunt: every foe within reach of the pet is taunted (again). */
function taunt(ctx) {
  const { p, pet } = ctx;
  for (const e of ctx.near(pet.x, pet.y, p.radiusCells)) ctx.taunt(e, TAUNT_HOLD, p.reflectPct);
}

export const SKILLS = {
  // Blinding Sandstorm (Dunepuff): a sandstorm down the busiest lanes blinds, slows and sandblasts the foes in it
  'earth+wind': {
    start(ctx) {
      const { p, pet } = ctx;
      const lanes = busiestLanes(ctx, p.lanes);
      const x = lanes.reduce((sum, l) => sum + ctx.laneX(l), 0) / lanes.length;
      const due = new Map(); // foe id → seconds until the sand hits it again
      ctx.zone({
        kind: 'sand',
        x,
        y: pet.y,
        r: Infinity,
        lanes, // for the renderer: the storm covers these lanes, from the portals down through the board
        dur: ctx.s.dur,
        onTick(e, dt) {
          if (!lanes.includes(e.lane)) return;
          ctx.blind(e, LINGER, p.missPct);
          ctx.slow(e, p.slowPct, LINGER);
          const left = (due.get(e.id) ?? 0) - dt;
          if (left > 0) return due.set(e.id, left);
          due.set(e.id, left + 1); // dpsPct is a second's worth
          ctx.strike(e, p.dpsPct, { kinds: ['earth', 'wind'] });
        },
      });
      ctx.moveTo(x, pet.y, 2); // into the eye of its storm
      ctx.fx('burst', { x, y: pet.y, n: 24 });
    },
  },

  // Iron Taunt (Ironclod): it guards the front of the blocks; foes near it bite it instead, and pay; it stomps at the end
  'earth+metal': {
    start(ctx) {
      ctx.moveTo(ctx.laneX(ctx.busiestLane()), ctx.boardTop + 0.6, 4);
      taunt(ctx);
      ctx.fx('ring', { x: ctx.pet.x, y: ctx.pet.y, r: ctx.p.radiusCells });
    },
    tick(ctx) {
      taunt(ctx);
    },
    end(ctx) {
      const { p, pet } = ctx;
      for (const e of ctx.area(pet.x, pet.y, p.radiusCells, p.hitPct, { kinds: ['earth', 'metal'] })) ctx.stun(e, p.stunS);
      ctx.fx('slam', { x: pet.x, y: pet.y, r: p.radiusCells });
    },
  },

  // Moss Spring (Mossbara): every block heals; a foe that bites one is rooted; a block about to break is saved, once
  'earth+nature': {
    start(ctx) {
      const { p } = ctx;
      for (const t of ctx.blocks()) t.saved = false; // each summon saves each block once
      const rooted = new Map(); // foe id → summon time it was last rooted
      ctx.onBite((e, block, bite) => {
        if (ctx.t - (rooted.get(e.id) ?? -Infinity) >= p.cooldownS - 1e-9) {
          rooted.set(e.id, ctx.t);
          ctx.root(e, p.rootS);
        }
        return bite;
      });
      ctx.onDown((t) => {
        if (t.saved) return false;
        t.saved = true;
        t.hp = t.maxHp * p.savePct;
        ctx.fx('text', { x: t.x, y: t.y + 0.6, key: 'fx.saved' });
        return true;
      });
    },
    tick(ctx, dt) {
      for (let n = ctx.every('heal', HEAL_STEP, dt); n > 0; n--) ctx.healBlocks(ctx.p.healPct * HEAL_STEP);
    },
  },
};
