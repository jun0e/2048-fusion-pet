// A small stage for testing v2 summons and fusion skills (docs/v2/SPEC.md section 5): a defense with a
// fusion block whose profile is given by hand (its hit, its summon), plus foes placed on the lanes. The
// block does not shoot, so whatever happens to the foes is the skill's doing.
//   const h = skillHarness('fire+ice', { hit: 100 });
//   const e = h.foe(1, 5);         // a foe on lane 1, 5 units down from the portal, standing still
//   h.act();                        // summon (forced: no charge) and run past the hop: the skill started
//   h.run(1);                       // one more second
import { createDefense } from '../../src/sim/defense.js';
import { createRng } from '../../src/sim/rng.js';
import { PHYSICS, cellX, cellY } from '../../src/config.js';

const QUIET = { shoots: false, damage: 0, kinds: ['physical'], colors: ['#ffffff'], rate: 1, dmgMult: 1 };

/** A block whose attack profile is `prof` (it does not shoot unless prof.shoots), at (col, row). */
export function fakeBlock(id, { col = 1, row = 3, tier = 10, hp = 1000, cls = {}, ...prof } = {}) {
  return { id, tier, col, row, x: cellX(col), y: cellY(row), hp, maxHp: hp, cls, fakeProf: { ...QUIET, key: `fake${id}`, ...prof } };
}

/**
 * key: the fusion whose skill the pet uses. hit: the pet's hit (a skill's "pct" is a share of it).
 * blocks: more blocks (fakeBlock) on the board. prof: more of the pet's profile (critChance, burn …).
 */
export function skillHarness(key, { hit = 100, blocks = [], seed = 7, col = 1, row = 3, prof = {} } = {}) {
  const pet = fakeBlock(1, { col, row, summon: key, damage: hit, ...prof });
  const board = [pet, ...blocks];
  const d = createDefense({ rng: createRng(seed), profile: (t) => t.fakeProf ?? QUIET });
  const seen = [];
  const h = {
    d,
    pet,
    blocks: board,
    /**
     * A foe on `lane`, `s` world units down its lane from the portal (the board's top edge is at
     * s ≈ 8.9). Standing still unless `speed` (units/s) is given; `hp` its health; `boss`.
     */
    foe(lane, s, { type = 'villager', hp = 1e6, speed = 0, boss = false } = {}) {
      const e = d.spawn(type, { lane, s });
      e.hp = e.maxHp = hp;
      e.speed = speed;
      if (boss) e.boss = true;
      return e;
    },
    /** Send the pet out now (no charge needed). → whether it went. */
    go: () => d.summon(pet, { force: true }),
    /** Run the defense for `sec` seconds. */
    run(sec) {
      const n = Math.max(1, Math.round(sec / PHYSICS.dt));
      for (let i = 0; i < n; i++) {
        d.step(PHYSICS.dt, board);
        seen.push(...d.drainEvents());
      }
    },
    /** Summon and run past the hop out: the skill has just started. */
    act() {
      h.go();
      h.run(pet.summon.hop + PHYSICS.dt);
    },
    /** Every event so far (or of one type). */
    events: (type = null) => (type ? seen.filter((e) => e.type === type) : seen),
    /** The skill's fx events so far (or of one fx kind). */
    fx: (kind = null) => seen.filter((e) => e.type === 'skillFx' && (!kind || e.fx === kind)),
  };
  return h;
}
