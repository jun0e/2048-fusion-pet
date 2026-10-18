// v2 fusion skills whose first element is poison (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
import { CELL } from './kit.js';

/** Seconds between the bog web's venom ticks: a foe in it gains a poison stack this often. */
const WEB_TICK = 0.5;
/** An executed foe's coins (Executioner Sting: "double coins"). */
const DOUBLE = 2;
const STING = ['poison', 'metal'];

/** Take `amount` of a foe's health as one strike of the pet (the matching share of its hit). */
const lose = (ctx, e, amount, opts) => (ctx.hit > 0 ? ctx.strike(e, amount / ctx.hit, opts) : 0);

export const SKILLS = {
  // Bog Web (Bogling): a venom web on the busiest lane, just ahead of the blocks; a foe that dies in it hatches spiderlings
  'poison+earth': {
    start(ctx) {
      const { p } = ctx;
      const x = ctx.laneX(ctx.busiestLane());
      const y = ctx.boardTop + (p.radiusCells * CELL) / 2; // its lower half over the foes stepping onto the board
      const web = ctx.zone({
        kind: 'web',
        x,
        y,
        r: p.radiusCells,
        dur: ctx.s.dur,
        every: WEB_TICK,
        onTick(e) {
          ctx.slow(e, p.slowPct, WEB_TICK * 1.5); // past the next tick: slowed while it stays in
          ctx.poison(e);
        },
      });
      ctx.moveTo(x, y, 3); // the spider sits in its web
      ctx.fx('ring', { x, y, r: p.radiusCells });
      const spiderling = (sx, sy) =>
        ctx.minion({
          kind: 'spider',
          x: sx,
          y: sy,
          speed: 4,
          ttl: ctx.s.dur,
          onReach(e) {
            ctx.strike(e, p.hitPct, { kinds: ['poison'] });
            ctx.fx('burst', { x: e.x, y: e.y, n: 6 });
          },
        });
      ctx.onKill((e) => {
        if (web.t > 0 && Math.hypot(e.x - web.x, e.y - web.y) <= web.r) {
          for (let i = 0; i < p.spiders; i++) spiderling(e.x + (i - (p.spiders - 1) / 2) * 0.3, e.y);
          ctx.fx('burst', { x: e.x, y: e.y, n: 10 });
        }
        return null;
      });
    },
  },

  // Panic Cloud (Mistmaw): a toxic cloud around the pufferfish; a foe in it is poisoned and flees, once a cooldown
  'poison+wind': {
    start(ctx) {
      const { p, pet } = ctx;
      const last = new Map(); // foe id → summon time it last panicked
      ctx.zone({
        kind: 'cloud',
        x: pet.x,
        y: pet.y,
        r: p.radiusCells,
        dur: ctx.s.dur,
        onStep(z) {
          z.x = ctx.pet.x;
          z.y = ctx.pet.y;
        },
        onTick(e) {
          if (ctx.t - (last.get(e.id) ?? -Infinity) < p.cooldownS - 1e-9) return;
          last.set(e.id, ctx.t);
          ctx.poison(e);
          ctx.fear(e, p.fearS);
        },
      });
      ctx.fx('ring', { x: pet.x, y: pet.y, r: p.radiusCells });
    },
    tick(ctx) {
      const c = ctx.crowd(ctx.p.radiusCells);
      if (c) ctx.moveTo(c.x, c.y, 1.5); // it drifts over the thick of them
    },
  },

  // Executioner Sting (Rustclaw): sting the foe with the least health left; a weak enough one dissolves for double coins
  'poison+metal': {
    start(ctx) {
      ctx.prime('sting', ctx.p.periodS);
      ctx.onKill((e) => (e.executed ? { coinMult: DOUBLE } : null));
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('sting', p.periodS, dt); n > 0; n--) {
        const e = ctx.weakest();
        if (!e) continue;
        ctx.jumpTo(e.x, e.y + 0.6);
        if (e.hp / e.maxHp >= p.belowPct) {
          ctx.strike(e, p.hitPct, { kinds: STING });
          ctx.poison(e);
          ctx.fx('burst', { x: e.x, y: e.y, n: 8 });
        } else if (e.boss) {
          lose(ctx, e, e.maxHp * p.bossPct, { kinds: STING }); // a boss does not dissolve
          ctx.fx('burst', { x: e.x, y: e.y, n: 14 });
        } else {
          e.executed = true; // marked before the blow, so the kill hook pays it double
          lose(ctx, e, e.hp, { kinds: STING });
          if (e.dead) ctx.fx('text', { x: e.x, y: e.y + 0.8, key: 'fx.execute' });
          else e.executed = false;
        }
      }
    },
  },

  // Toxic Lullaby (Nightling): every few seconds a lullaby: the foes around the loris fall asleep
  'poison+nature': {
    start(ctx) {
      ctx.prime('song', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      const c = ctx.crowd(p.radiusCells);
      if (c) ctx.moveTo(c.x, c.y, 1.5); // it creeps toward the thick of them
      for (let n = ctx.every('song', p.periodS, dt); n > 0; n--) {
        for (const e of ctx.near(pet.x, pet.y, p.radiusCells)) ctx.sleep(e, p.sleepS, p.wakePct, p.bossSleepS);
        ctx.fx('ring', { x: pet.x, y: pet.y, r: p.radiusCells });
      }
    },
  },
};
