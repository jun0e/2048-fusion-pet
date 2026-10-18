// v2 fusion skills whose first element is fire (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). These are the worked examples the other groups follow:
// ctx.p holds the skill's numbers (cells, seconds, shares of the pet's hit), ctx.every / ctx.prime its
// clocks, ctx.strike / ctx.area its hits, and ctx.fx tells the renderer what to draw.
import { CELL } from './kit.js';

const ICE = '#7fd8ff';
const FIRE = '#ff8a3d';
const KIND = { fire: ['fire'], blast: ['fire', 'physical'] };

export const SKILLS = {
  // Frostfire Waltz (Novakit): each beat a frost wave, half a beat later a fire wave that shatters the frozen
  'fire+ice': {
    start(ctx) {
      ctx.prime('frost', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      const c = ctx.crowd(p.radiusCells);
      if (c) ctx.moveTo(c.x, c.y + 0.4, 2.5); // it dances into the thick of them
      for (let n = ctx.every('frost', p.periodS, dt); n > 0; n--) {
        for (const e of ctx.near(pet.x, pet.y, p.radiusCells)) ctx.freeze(e, p.freezeS);
        ctx.fx('ring', { x: pet.x, y: pet.y, r: p.radiusCells, color: ICE });
        ctx.state.fireIn = p.periodS / 2;
      }
      if (ctx.state.fireIn > 0) {
        ctx.state.fireIn -= dt;
        if (ctx.state.fireIn <= 0) {
          for (const e of ctx.near(pet.x, pet.y, p.radiusCells)) {
            ctx.strike(e, e.freezeT > 0 ? p.shatterPct : p.hitPct, { kinds: KIND.fire, color: FIRE });
            ctx.burn(e);
          }
          ctx.fx('ring', { x: pet.x, y: pet.y, r: p.radiusCells, color: FIRE });
        }
      }
    },
  },

  // Plasma Barrage (Zapcinder): punch after punch at the nearest foe, each harder; the last bursts into plasma
  'fire+lightning': {
    start(ctx) {
      ctx.state.punches = 0;
      ctx.prime('punch', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      const e = ctx.nearest(pet.x, pet.y);
      if (!e) return;
      ctx.moveTo(e.x, e.y + 0.7, 4); // it boxes up close
      for (let n = ctx.every('punch', p.periodS, dt); n > 0; n--) {
        ctx.strike(e, p.hitPct + p.rampPct * ctx.state.punches, { kinds: ['fire', 'lightning'] });
        ctx.state.punches += 1;
        ctx.fx('burst', { x: e.x, y: e.y, n: 8 + ctx.state.punches });
      }
    },
    end(ctx) {
      const { p, pet } = ctx;
      ctx.area(pet.x, pet.y, p.radiusCells, p.finalPct, { kinds: ['fire', 'lightning'] });
      ctx.fx('ring', { x: pet.x, y: pet.y, r: p.radiusCells });
      ctx.fx('burst', { x: pet.x, y: pet.y, n: 30 });
    },
  },

  // Brimstone Blast (Embertoad): spit venom on the biggest crowd, then set off every poisoned foe on the field
  'fire+poison': {
    start(ctx) {
      ctx.prime('blast', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('blast', p.periodS, dt); n > 0; n--) {
        const c = ctx.crowd(p.spitCells);
        if (c) {
          for (const e of ctx.near(c.x, c.y, p.spitCells)) ctx.poison(e, p.stacks);
          ctx.fx('beam', { x: ctx.pet.x, y: ctx.pet.y, x1: c.x, y1: c.y, w: 0.3, color: '#8fe53a' });
        }
        // every poisoned foe goes off: each stack hits it and its neighbours, then it burns
        const lit = ctx.foes().filter((e) => e.poison.stacks > 0);
        for (const e of lit) {
          const stacks = e.poison.stacks;
          e.poison = { stacks: 0, dps: 0, t: 0 };
          ctx.area(e.x, e.y, p.splashCells, p.perStackPct * stacks, { kinds: KIND.blast });
          ctx.burn(e);
          ctx.fx('ring', { x: e.x, y: e.y, r: p.splashCells, color: FIRE });
        }
      }
    },
  },

  // Magma Burrow (Magmole): dig down, erupt under the biggest crowd, leave lava behind
  'fire+earth': {
    start(ctx) {
      ctx.prime('erupt', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('erupt', p.periodS, dt); n > 0; n--) {
        const c = ctx.crowd(p.radiusCells);
        if (!c) continue;
        ctx.jumpTo(c.x, c.y);
        for (const e of ctx.area(c.x, c.y, p.radiusCells, p.hitPct, { kinds: ['fire', 'earth'] })) ctx.stun(e, p.stunS);
        ctx.fx('slam', { x: c.x, y: c.y, r: p.radiusCells });
        // the lava stays after the mole has gone home
        ctx.zone({ kind: 'lava', x: c.x, y: c.y, r: p.poolCells, dur: p.poolS, every: 0.5, bound: false, onTick: (e) => ctx.burn(e) });
      }
    },
  },

  // Fire Twister (Flarewhirl): a twister runs up the busiest lane to the gate and back, dragging foes into it
  'fire+wind': {
    start(ctx) {
      const { p } = ctx;
      const lane = ctx.busiestLane();
      const x = ctx.laneX(lane);
      const low = ctx.boardTop + 0.6;
      const high = ctx.portalY - 1;
      ctx.moveTo(x, low + 0.4, 3);
      const due = new Map(); // foe id → seconds until its next burn tick
      ctx.zone({
        kind: 'twister',
        x,
        y: low,
        r: p.pullCells,
        dur: ctx.s.dur,
        dir: 1,
        onStep(z, dt) {
          z.y += z.dir * p.speedCells * CELL * dt;
          if (z.y >= high) z.dir = -1;
          if (z.y <= low) z.dir = 1;
          z.y = Math.max(low, Math.min(high, z.y));
        },
        onTick(e, dt, z) {
          ctx.pull(e, z.x, z.y, 2.5, dt);
          const left = (due.get(e.id) ?? 0) - dt;
          if (left > 0) return due.set(e.id, left);
          due.set(e.id, left + 1);
          ctx.strike(e, p.dpsPct, { kinds: ['fire', 'wind'] });
          ctx.burn(e);
        },
      });
    },
  },

  // Molten Jaws (Anviljaw): clamp the toughest foe, hold it, and melt its armour so everything hits it harder
  'fire+metal': {
    start(ctx) {
      ctx.prime('bite', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p } = ctx;
      for (let n = ctx.every('bite', p.periodS, dt); n > 0; n--) {
        const e = ctx.toughest();
        if (!e) continue;
        ctx.jumpTo(e.x, e.y + 0.6);
        ctx.stun(e, p.holdS);
        ctx.strike(e, p.hitPct, { kinds: KIND.blast });
        ctx.vuln(e, p.vulnPct, p.vulnS);
        ctx.fx('slam', { x: e.x, y: e.y, r: 0.6 });
        ctx.fx('text', { x: e.x, y: e.y + 0.8, key: 'fx.melt' });
      }
    },
  },

  // Ember Swarm (Emberhopper): locusts that hunt and burst; a foe that burns to death hatches another
  'fire+nature': {
    start(ctx) {
      const { p, pet } = ctx;
      // each locust goes for a foe of its own, the small fry nearest first (a swarm, not a pile on the boss)
      const prey = (x, y) => {
        const taken = new Set(ctx.minions().map((m) => m.targetId));
        const free = ctx.foes().filter((e) => !taken.has(e.id));
        return ctx.nearest(x, y, free.filter((e) => !e.boss)) ?? ctx.nearest(x, y, free);
      };
      const locust = (x, y) =>
        ctx.minion({
          kind: 'locust',
          x,
          y,
          speed: 4,
          ttl: ctx.s.dur,
          target: prey(x, y),
          onReach(e) {
            ctx.burn(e); // set alight first: a foe the burst kills dies burning, and hatches the next locust
            ctx.strike(e, p.hitPct, { kinds: KIND.fire });
            ctx.fx('burst', { x: e.x, y: e.y, n: 10 });
          },
        });
      for (let i = 0; i < p.count; i++) locust(pet.x + (i - (p.count - 1) / 2) * 0.4, pet.y);
      ctx.onKill((e) => {
        if (e.burn.stacks > 0 && ctx.minions().length < p.max) locust(e.x, e.y);
        return null;
      });
    },
  },
};
