// v2 fusion skills whose first element is metal (docs/v2/SPEC.md section 5; the numbers are in ./data.js,
// the words in src/i18n/skills-*.js). Each entry: SKILLS[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) },
// written only against the kit (./kit.js). See ./fire.js for worked examples.
const GOLD = '#ffd36b';
const LOG = ['physical', 'nature'];

export const SKILLS = {
  // Bumper Harvest (Sproutgear): while it is out, felled foes pay more; every beat a log rolls down the busiest lane
  'metal+nature': {
    start(ctx) {
      const { p } = ctx;
      ctx.onKill((e) => {
        ctx.fx('burst', { x: e.x, y: e.y, n: 10, color: GOLD }); // a shower of coins where it fell
        return { coinMult: p.coinMult, xp: p.xp };
      });
      ctx.prime('log', p.periodS);
    },
    tick(ctx, dt) {
      const { p, pet } = ctx;
      for (let n = ctx.every('log', p.periodS, dt); n > 0; n--) {
        const lane = ctx.busiestLane();
        const hit = ctx.inLane(lane);
        if (!hit.length) {
          ctx.prime('log', p.periodS); // an empty field: the next log rolls as soon as a foe comes
          break;
        }
        const x = ctx.laneX(lane);
        const low = Math.min(ctx.boardTop, ...hit.map((e) => e.y));
        ctx.moveTo(x, pet.y, 3); // it rolls each log from the lane it sends it down
        for (const e of hit) {
          ctx.strike(e, p.hitPct, { kinds: LOG });
          ctx.push(e, p.pushCells);
        }
        ctx.fx('beam', { x, y: low, x1: x, y1: ctx.portalY, w: 0.6 }); // the whole lane, from below its last foe up to the portal
      }
    },
  },
};
