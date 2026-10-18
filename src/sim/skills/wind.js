// v2 fusion skills whose first element is wind (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
import { CELL } from './kit.js';

const BAND = CELL * 0.5; // Sickle Sweep: a foe within half a cell of the sickle's height is crossed by it
const SNEEZE = 1; // Pollen Rain: seconds between a foe's chances to sneeze

/** The height where a sweep across the lanes crosses the most foes (ties: the one nearest the board). */
function thickest(foes) {
  let best = null;
  for (const e of foes) {
    const n = foes.reduce((k, o) => k + (Math.abs(o.y - e.y) <= BAND ? 1 : 0), 0);
    if (!best || n > best.n || (n === best.n && e.y < best.y)) best = { y: e.y, n };
  }
  return best?.y ?? null;
}

export const SKILLS = {
  // Sickle Sweep (Whirlblade): every beat it spins across all 4 lanes at the height of the thickest band of foes
  'wind+metal': {
    start(ctx) {
      ctx.prime('sweep', ctx.p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      for (let n = ctx.every('sweep', p.periodS, dt); n > 0; n--) {
        const y = thickest(ctx.foes());
        if (y == null) continue;
        // the weasel cuts across from the side it is on to the other
        const left = ctx.laneX(0) - CELL * 0.3;
        const right = ctx.laneX(3) + CELL * 0.3;
        const fromLeft = pet.x < (left + right) / 2;
        ctx.jumpTo(fromLeft ? left : right, y);
        ctx.moveTo(fromLeft ? right : left, y, 8);
        ctx.fx('sweep', { y, w: 1 });
        for (const e of ctx.foes()) {
          if (Math.abs(e.y - y) > BAND) continue;
          ctx.strike(e, p.hitPct, { kinds: ['wind', 'metal'] });
          ctx.bleed(e, p.bleedS, p.bleedPct);
        }
      }
    },
  },

  // Pollen Rain (Pollenpuff): pollen on every block (they fire faster) and in every foe's nose (it may sneeze, stunned)
  'wind+nature': {
    start(ctx) {
      for (const t of ctx.blocks()) ctx.fx('burst', { x: t.x, y: t.y, n: 6 });
      ctx.moveTo(0, ctx.boardTop + CELL * 0.5, 2); // it hovers over the board
    },
    tick(ctx, dt) {
      const { p } = ctx;
      // re-showered every tick, so a block that joins the board mid-way fires faster too, till the time out ends
      // (none on its last tick: a boost of 0 s would leave a block's boostPct set with no time on it)
      const left = ctx.s.dur - ctx.t;
      if (left > 0) ctx.boostBlocks(p.ratePct, left);
      for (let n = ctx.every('sneeze', SNEEZE, dt); n > 0; n--) {
        for (const e of ctx.foes()) {
          if (!ctx.roll(p.sneezePct)) continue;
          ctx.stun(e, p.stunS);
          ctx.fx('burst', { x: e.x, y: e.y, n: 6 });
          ctx.fx('text', { x: e.x, y: e.y + 0.8, key: 'fx.sneeze' });
        }
      }
    },
  },
};
