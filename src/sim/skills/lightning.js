// v2 fusion skills whose first element is lightning (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
import { FIELD } from '../../config.js';
import { CELL } from './kit.js';

const VENOM = '#8fe53a';
const BOLT = ['lightning'];
const RUN = 5; // Thunder Charge: the charge up the lane, cells/s …
const TROT = 2.5; // … and the trot back down to the board for the next one
const REACH = CELL * 0.5; // how far ahead (and behind) of the boar a foe counts as in its way
const RECOIL = 0.5; // Railgun: seconds it stays in sight after a shot, before it vanishes to charge the next

export const SKILLS = {
  // Toxic Circuit (Fizzlebolt): each beat, venom on fresh foes, then a current through every poisoned foe on the field
  'lightning+poison': {
    start(ctx) {
      ctx.prime('circuit', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      for (let n = ctx.every('circuit', p.periodS, dt); n > 0; n--) {
        // it spits on `spits` foes, the ones not poisoned yet first
        const fresh = ctx.foes().filter((e) => e.poison.stacks <= 0);
        const rest = ctx.foes().filter((e) => e.poison.stacks > 0);
        for (let i = 0; i < p.spits; i++) {
          const pool = fresh.length ? fresh : rest;
          const e = ctx.pick(pool);
          if (!e) break;
          pool.splice(pool.indexOf(e), 1);
          ctx.poison(e);
          ctx.fx('beam', { x: pet.x, y: pet.y, x1: e.x, y1: e.y, w: 0.25, color: VENOM });
        }
        // the current: from the pet to the nearest poisoned foe, then on to the next nearest, through them all
        const lit = ctx.foes().filter((e) => e.poison.stacks > 0);
        let from = pet;
        while (lit.length) {
          const e = ctx.nearest(from.x, from.y, lit);
          lit.splice(lit.indexOf(e), 1);
          ctx.fx('bolt', { x: from.x, y: from.y, x1: e.x, y1: e.y });
          ctx.strike(e, p.hitPct, { kinds: BOLT });
          ctx.stun(e, p.stunS);
          from = e;
        }
      }
    },
  },

  // Thunder Charge (Rumblebolt): runs from the board up the busiest lane to the gate, bowling back every foe in the way
  'lightning+earth': {
    start(ctx) {
      ctx.state.runs = 0;
      ctx.prime('run', ctx.s.dur / ctx.p.charges);
    },
    tick(ctx, dt) {
      const { p, pet, state: st } = ctx;
      const low = ctx.boardTop + 0.5;
      const high = ctx.portalY - 1;
      // the runs are spread over its time out; each takes the lane that is busiest when it starts
      for (let n = ctx.every('run', ctx.s.dur / p.charges, dt); n > 0 && st.runs < p.charges; n--) {
        st.runs += 1;
        st.lane = ctx.busiestLane();
        st.hit = new Set(); // once a run per foe, though the push throws it ahead of the boar
        st.charging = true;
        const x = ctx.laneX(st.lane);
        ctx.jumpTo(x, low);
        ctx.moveTo(x, high, RUN);
        ctx.fx('beam', { x, y: low, x1: x, y1: high, w: 0.8 });
      }
      if (!st.charging) return;
      for (const e of ctx.inLane(st.lane)) {
        if (st.hit.has(e.id) || Math.abs(e.y - pet.y) > REACH) continue;
        st.hit.add(e.id);
        ctx.fx('slam', { x: e.x, y: e.y, r: 0.6 });
        ctx.strike(e, p.hitPct, { kinds: ['lightning', 'earth'] });
        ctx.push(e, p.pushCells);
        ctx.stun(e, p.stunS);
      }
      if (pet.y >= high - 0.05) {
        st.charging = false; // at the gate: back down to the board for the next run
        ctx.moveTo(pet.x, low, TROT);
      }
    },
  },

  // Storm Hop (Gustbolt): every beat it hops onto the foe it struck longest ago and calls lightning down on it
  'lightning+wind': {
    start(ctx) {
      ctx.state.struck = new Map(); // foe id → when it was last struck
      ctx.prime('hop', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet, state: st } = ctx;
      for (let n = ctx.every('hop', p.periodS, dt); n > 0; n--) {
        const foes = ctx.foes();
        if (!foes.length) continue;
        // another foe: one never struck, else the one struck longest ago; the nearest of those
        const when = (e) => st.struck.get(e.id) ?? -Infinity;
        const oldest = Math.min(...foes.map(when));
        const e = ctx.nearest(pet.x, pet.y, foes.filter((f) => when(f) === oldest));
        st.struck.set(e.id, ctx.t);
        ctx.fx('bolt', { x: pet.x, y: pet.y, x1: e.x, y1: e.y });
        ctx.jumpTo(e.x, e.y + 0.6);
        ctx.strike(e, p.hitPct, { kinds: BOLT });
        for (const o of ctx.near(e.x, e.y, p.splashCells)) if (o !== e) ctx.strike(o, p.splashPct, { kinds: BOLT });
        ctx.fx('ring', { x: e.x, y: e.y, r: p.splashCells });
      }
    },
  },

  // Railgun (Voltgild): unseen, it charges at the top of the toughest foe's lane, then a rail runs the whole lane
  'lightning+metal': {
    start(ctx) {
      ctx.state.fired = 0;
      ctx.state.next = ctx.p.chargeS; // when the shot it is charging is ready
      ctx.s.hidden = true; // the renderer fades the pet while this is set
    },
    tick(ctx) {
      const { p, state: st } = ctx;
      const target = st.fired < p.shots ? ctx.toughest() : null;
      if (target) {
        const x = ctx.laneX(target.lane);
        const top = ctx.portalY - 1;
        if (ctx.t >= st.next - 1e-9) {
          ctx.jumpTo(x, top);
          for (const e of ctx.inLane(target.lane)) ctx.strike(e, p.hitPct, { kinds: ['lightning', 'metal'] });
          ctx.fx('beam', { x, y: ctx.portalY, x1: x, y1: FIELD.gateY, w: 0.5 });
          st.fired += 1;
          st.next = ctx.t + RECOIL + p.chargeS;
        } else if (ctx.s.hidden) ctx.moveTo(x, top, 4); // unseen, it creeps to the lane it will fire down
      }
      // charging (and so unseen) from RECOIL after a shot until the next one; in sight once the last is out
      ctx.s.hidden = st.fired < p.shots && ctx.t >= st.next - p.chargeS - 1e-9;
    },
    end(ctx) {
      ctx.s.hidden = false;
    },
  },

  // Bloom Ambush (Zaplily): a flower in front of the blocks that snatches the first foe in reach and arcs lightning on
  'lightning+nature': {
    start(ctx) {
      ctx.state.cd = 0;
      ctx.moveTo(ctx.laneX(ctx.busiestLane()), ctx.boardTop + CELL, 4);
    },
    tick(ctx, dt) {
      const { p, pet, state: st } = ctx;
      st.cd = Math.max(0, st.cd - dt);
      if (st.cd > 0) return;
      const prey = ctx.nearest(pet.x, pet.y, ctx.near(pet.x, pet.y, p.radiusCells));
      if (!prey) return;
      st.cd = p.cooldownS;
      ctx.fx('bolt', { x: pet.x, y: pet.y, x1: prey.x, y1: prey.y });
      ctx.fx('text', { x: prey.x, y: prey.y + 0.8, key: 'fx.snap' });
      ctx.strike(prey, p.hitPct, { kinds: ['lightning', 'nature'] });
      // the lightning jumps from the prey to the foes nearest it
      const rest = ctx.foes().filter((e) => e !== prey);
      for (let i = 0; i < p.jumps && rest.length; i++) {
        const e = ctx.nearest(prey.x, prey.y, rest);
        rest.splice(rest.indexOf(e), 1);
        ctx.fx('bolt', { x: prey.x, y: prey.y, x1: e.x, y1: e.y });
        ctx.strike(e, p.jumpPct, { kinds: BOLT });
      }
    },
  },
};
