// v2 skill kit: what a fusion skill can do while its pet is out (docs/v2/SPEC.md sections 5 and 6).
// The defense (src/sim/defense.js) builds one context per summon with `createKit(api).ctxFor(...)`; a
// skill in src/sim/skills/<group>.js is
//   SKILL_IMPL[key] = { start(ctx), tick(ctx, dt), end(ctx) }
// and only talks to the sim through `ctx`. Distances in the skill data are in cells (ctx turns them
// into world units); a "pct" of damage is a share of the pet's hit (ctx.hit, its tile's profile damage).
// Everything a skill leaves on the field (zones, walls, traps, minions, tethers) and every hook it sets
// is owned by its tile and goes when the summon ends (unless made with `bound: false`).
import { GRID, FIELD, SIEGE, laneX } from '../../config.js';
import { FUSIONS } from '../classes.js';
import { FUSION_SKILLS } from './data.js';
import { busiestLane, clampSpot } from '../roam.js';

export const CELL = GRID.cell;
/** Default damage-over-time a skill applies when its pet's own attack has none. */
const BURN = { dpsPct: 0.5, dur: 3, max: 5 };
const POISON = { dpsPct: 0.25, dur: 4, max: 8 };

/**
 * api (from the defense): { events, rng, alive, damage, knock, addBurn, addPoison, place, laneOfX,
 * blocks(), zones, walls, traps, minions, tethers, hooks: { bite, kill, down }, nextId() }
 */
export function createKit(api) {
  const { events, rng } = api;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function ctxFor(tile, s, prof) {
    const key = s.key;
    const p = FUSION_SKILLS[key] ?? {};
    const color = FUSIONS[key]?.color ?? '#ffffff';
    const owner = tile.id;
    const control = (e, sec) => sec * (e.boss ? 0.5 : 1);
    const own = (piece, bound = true) => Object.assign(piece, { id: api.nextId(), owner, bound });

    const ctx = {
      key,
      p,
      tile,
      s,
      prof,
      color,
      state: s.state,
      /** The pet's hit: every "pct" in the skill data is a share of it. */
      get hit() {
        return prof.damage;
      },
      /** The pet, where it stands on the field: { x, y }. */
      get pet() {
        return s;
      },
      /** Seconds since the skill started (the 'act' phase). */
      get t() {
        return s.t;
      },
      /** Make the named clock come round on the next tick (a skill that acts at once, then every period). */
      prime(name, period) {
        s.state[`@${name}`] = period;
      },
      /** How many times `period` seconds came round this tick (a named clock in ctx.state). */
      every(name, period, dt) {
        const k = `@${name}`;
        s.state[k] = (s.state[k] ?? 0) + dt;
        let n = 0;
        while (s.state[k] >= period - 1e-9) {
          s.state[k] -= period;
          n += 1;
        }
        return n;
      },

      // --- who --------------------------------------------------------------------------------
      foes: () => api.alive(),
      /** Foes within `cells` of (x, y). */
      near: (x, y, cells) => api.alive().filter((e) => Math.hypot(e.x - x, e.y - y) <= cells * CELL),
      inLane: (lane) => api.alive().filter((e) => e.lane === lane),
      busiestLane: () => busiestLane(api.alive(), api.laneOfX(s.x)),
      /** The densest spot: the foe with the most others within `cells` → { x, y, n, e } (null on an empty field). */
      crowd(cells, list = api.alive()) {
        let best = null;
        for (const e of list) {
          const n = list.reduce((k, o) => k + (dist(o, e) <= cells * CELL ? 1 : 0), 0);
          if (!best || n > best.n || (n === best.n && e.s > best.e.s)) best = { x: e.x, y: e.y, n, e };
        }
        return best;
      },
      toughest: (list = api.alive()) => list.reduce((m, e) => (!m || e.hp > m.hp ? e : m), null),
      weakest: (list = api.alive()) => list.reduce((m, e) => (!m || e.hp / e.maxHp < m.hp / m.maxHp ? e : m), null),
      nearest: (x, y, list = api.alive()) => list.reduce((m, e) => (!m || Math.hypot(e.x - x, e.y - y) < Math.hypot(m.x - x, m.y - y) ? e : m), null),
      /** The foe closest to the board (furthest along its lane). */
      leading: (list = api.alive()) => list.reduce((m, e) => (!m || e.s > m.s ? e : m), null),
      fastest: (list = api.alive()) => list.reduce((m, e) => (!m || speedOf(e) > speedOf(m) ? e : m), null),
      pick: (list) => (list.length ? list[Math.floor(rng.next() * list.length)] : null),
      /** True `p` of the time (the defense's own random stream: replays stay exact). */
      roll: (p) => rng.next() < p,
      laneX: (lane) => laneX(lane),
      laneOf: (x) => api.laneOfX(x),
      /** Where foes stop walking lanes and step onto the board (world y). */
      boardTop: SIEGE.boardTop,
      portalY: FIELD.spawnY,

      // --- hits ---------------------------------------------------------------------------------
      /** `pct` of the pet's hit to one foe (its crit chance rolls); a `hit` event. → damage dealt. */
      strike(e, pct, { kinds = ['physical'], color: c = color } = {}) {
        if (!e || e.dead || e.gone) return 0;
        let d = prof.damage * pct;
        const crit = !!prof.critChance && rng.next() < prof.critChance;
        if (crit) d *= prof.critMult ?? 2;
        const dealt = api.damage(e, d, kinds);
        events.push({ type: 'hit', id: e.id, x: e.x, y: e.y, amount: dealt, colors: [c], crit, skill: key });
        return dealt;
      },
      /** `pct` to every foe within `cells` of (x, y). → the foes hit. */
      area(x, y, cells, pct, opts = {}) {
        const hit = ctx.near(x, y, cells);
        for (const e of hit) ctx.strike(e, pct, opts);
        return hit;
      },

      // --- statuses (holds are halved on bosses) ------------------------------------------------
      freeze(e, sec) {
        if (e.dead) return;
        if (e.freezeT <= 0) events.push({ type: 'freeze', id: e.id, x: e.x, y: e.y });
        e.freezeT = Math.max(e.freezeT, control(e, sec));
      },
      stun(e, sec) {
        if (e.dead) return;
        if (e.stunT <= 0) events.push({ type: 'stun', id: e.id, x: e.x, y: e.y });
        e.stunT = Math.max(e.stunT, control(e, sec));
      },
      root(e, sec) {
        if (!e.dead) e.rootT = Math.max(e.rootT, control(e, sec));
      },
      slow(e, pct, sec) {
        if (e.dead) return;
        const v = e.boss ? pct * 0.5 : pct;
        e.chillSlow = e.chillT > 0 ? Math.max(e.chillSlow, v) : v;
        e.chillT = Math.max(e.chillT, sec);
      },
      burn(e) {
        if (!e.dead) api.addBurn(e, prof.burn ?? BURN, prof.damage);
      },
      poison(e, stacks = 1) {
        for (let i = 0; i < stacks && !e.dead; i++) api.addPoison(e, prof.poison ?? POISON, prof.damage);
      },
      push(e, cells) {
        if (!e.dead) api.knock(e, cells * CELL, { by: 'skill', tier: tile.tier, colors: [color] });
      },
      /** It takes `pct` more damage from everything for `sec`. */
      vuln(e, pct, sec) {
        if (e.dead) return;
        e.vulnPct = e.vulnT > 0 ? Math.max(e.vulnPct, pct) : pct;
        e.vulnT = Math.max(e.vulnT, sec);
      },
      /** It turns and runs back toward the gate. */
      fear(e, sec) {
        if (!e.dead) e.fearT = Math.max(e.fearT, control(e, sec));
      },
      /**
       * Asleep: stands still and does not bite; the first hit wakes it for `wakeMult` × damage. A boss
       * sleeps half as long, or `bossSec` when the skill names its own.
       */
      sleep(e, sec, wakeMult = 1, bossSec = null) {
        if (e.dead) return;
        e.sleepT = Math.max(e.sleepT, e.boss && bossSec != null ? bossSec : control(e, sec));
        e.sleepWake = Math.max(e.sleepT > 0 ? e.sleepWake : 1, wakeMult);
      },
      /** Its bites miss `missPct` of the time. */
      blind(e, sec, missPct) {
        if (e.dead) return;
        e.blindMiss = e.blindT > 0 ? Math.max(e.blindMiss, missPct) : missPct;
        e.blindT = Math.max(e.blindT, sec);
      },
      /** It loses `pct` of the pet's hit for every cell it moves. */
      bleed(e, sec, pct) {
        if (e.dead) return;
        e.bleedPer = Math.max(e.bleedT > 0 ? e.bleedPer : 0, prof.damage * pct);
        e.bleedT = Math.max(e.bleedT, sec);
      },
      /** It stops and bites the pet instead of the blocks; each bite costs it `reflectPct` of the pet's hit. */
      taunt(e, sec, reflectPct) {
        if (e.dead) return;
        e.tauntT = Math.max(e.tauntT, sec);
        e.tauntBy = owner;
        e.tauntReflect = prof.damage * reflectPct;
      },

      // --- blocks -------------------------------------------------------------------------------
      blocks: () => api.blocks().filter((t) => t.hp > 0),
      /** Every block heals `pct` of its max health. */
      healBlocks(pct, from = s) {
        for (const t of ctx.blocks()) {
          if (t.hp >= t.maxHp) continue;
          const before = t.hp;
          t.hp = Math.min(t.maxHp, t.hp + t.maxHp * pct);
          events.push({ type: 'tileHeal', id: t.id, x: t.x, y: t.y, amount: t.hp - before, from: { x: from.x, y: from.y } });
        }
      },
      healBlock(t, pct, from = s) {
        if (!t || t.hp <= 0 || t.hp >= t.maxHp) return;
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + t.maxHp * pct);
        events.push({ type: 'tileHeal', id: t.id, x: t.x, y: t.y, amount: t.hp - before, from: { x: from.x, y: from.y } });
      },
      /** Every block fires `pct` faster for `sec`. */
      boostBlocks(pct, sec) {
        for (const t of ctx.blocks()) {
          t.boostPct = t.boostT > 0 ? Math.max(t.boostPct, pct) : pct;
          t.boostT = Math.max(t.boostT ?? 0, sec);
        }
      },
      /** Every block shows the rime-armour mark for `sec` (the damage cut itself is a bite hook). */
      guardBlocks(sec) {
        for (const t of ctx.blocks()) t.guardT = Math.max(t.guardT ?? 0, sec);
      },

      // --- standing pieces (SPEC 6) -------------------------------------------------------------
      /**
       * An area that acts on the foes inside it: { kind, x, y, r (cells), dur, onTick(e, dt, z), onStep(z, dt)
       * (moves it), every, bound }. r = Infinity covers the field. With `every` (s), onTick runs for a foe
       * when it steps in and then once per `every` while it stays (a burn, a stack); without, every tick.
       */
      zone({ kind, x, y, r, dur, onTick = null, onStep = null, every = 0, bound = true, ...rest }) {
        let tick = onTick;
        if (onTick && every > 0) {
          const due = new Map(); // foe id → seconds until it is due again
          tick = (e, dt, z) => {
            const left = (due.get(e.id) ?? 0) - dt;
            if (left > 0) return due.set(e.id, left);
            due.set(e.id, left + every);
            onTick(e, dt, z);
          };
        }
        const z = own({ kind, x, y, r: r * CELL, t: dur, dur, color, onTick: tick, onStep, ...rest }, bound);
        api.zones.push(z);
        return z;
      },
      /** A barrier across `lanes` at height y: foes walking those lanes stop there. onEnd(w) when it goes. */
      wall({ lanes, y, dur, onEnd = null, bound = true }) {
        const w = own({ lanes, y, t: dur, dur, color, onEnd }, bound);
        api.walls.push(w);
        return w;
      },
      /** A one-shot trap: the first foe within r (cells) sets it off: onTrigger(e, trap). */
      trap({ x, y, r, kind = 'flower', onTrigger, bound = true }) {
        const tr = own({ x, y, r: r * CELL, kind, color, onTrigger }, bound);
        api.traps.push(tr);
        return tr;
      },
      /**
       * A little helper that hunts `target` (else the nearest foe) at `speed` cells/s; onReach(e, m) when it
       * gets there, and it is gone unless onReach returns `true` (then it picks the next nearest foe).
       */
      minion({ kind, x, y, speed, ttl, onReach, target = null, bound = true }) {
        const m = own({ kind, x, y, speed: speed * CELL, t: ttl, color, onReach, targetId: target?.id ?? null }, bound);
        api.minions.push(m);
        return m;
      },
      /** A tendril from the pet to a foe: { slowPct, drainPct (max health per s), bossDrainPct }. */
      tether(e, { slowPct = 0, drainPct = 0, bossDrainPct = drainPct } = {}) {
        const tt = own({ tileId: owner, enemyId: e.id, slowPct, drainPct, bossDrainPct }, true);
        api.tethers.push(tt);
        return tt;
      },
      tethered: () => api.tethers.filter((tt) => tt.owner === owner),
      /** This pet's pieces on the field. */
      zones: () => api.zones.filter((z) => z.owner === owner),
      walls: () => api.walls.filter((w) => w.owner === owner),
      traps: () => api.traps.filter((tr) => tr.owner === owner),
      minions: () => api.minions.filter((m) => m.owner === owner && !m.done && m.t > 0),
      /**
       * Drag a foe toward (x, y) at `speed` cells/s: along its lane while it walks one (it keeps its lane),
       * freely on the board. Bosses half as fast.
       */
      pull(e, x, y, speed, dt) {
        if (e.dead) return;
        const step = speed * CELL * dt * (e.boss ? 0.5 : 1);
        if (e.mode === 'lane') {
          const want = FIELD.spawnY - y; // where (x, y) is along the lane
          const d = want - e.s;
          e.s = Math.max(0, e.s + Math.sign(d) * Math.min(Math.abs(d), step));
          api.place(e);
        } else {
          const dx = x - e.x;
          const dy = y - e.y;
          const d = Math.hypot(dx, dy);
          if (d < 1e-6) return;
          e.x += (dx / d) * Math.min(step, d);
          e.y += (dy / d) * Math.min(step, d);
        }
      },

      // --- hooks, live while the pet is out -----------------------------------------------------
      /** fn(e, block, bite) → the bite that lands (0: none). */
      onBite: (fn) => api.hooks.bite.push({ owner, fn }),
      /** fn(e) → extra fields for the kill: { coinMult, xp } (the run pays them). */
      onKill: (fn) => api.hooks.kill.push({ owner, fn }),
      /** fn(block) → true when it saved the block (and set its health). */
      onDown: (fn) => api.hooks.down.push({ owner, fn }),

      // --- the pet ------------------------------------------------------------------------------
      /** Walk the pet toward (x, y) at `speed` cells/s. */
      moveTo(x, y, speed = 2) {
        const c = clampSpot(x, y);
        s.tx = c.x;
        s.ty = c.y;
        s.speed = speed;
      },
      /** Put the pet at (x, y) at once (a leap, a burrow). */
      jumpTo(x, y) {
        const c = clampSpot(x, y);
        s.x = s.tx = c.x;
        s.y = s.ty = c.y;
        s.speed = 0;
      },
      /** An instant effect for the renderer (SPEC 6): ring, burst, beam, bolt, slam, sweep, text. */
      fx(fx, fields = {}) {
        events.push({ type: 'skillFx', fx, color, tileId: owner, skill: key, ...fields });
      },
    };
    return ctx;
  }

  const speedOf = (e) => (e.freezeT > 0 || e.stunT > 0 ? 0 : e.speed * (1 - (e.chillT > 0 ? e.chillSlow : 0)));

  return { ctxFor };
}
