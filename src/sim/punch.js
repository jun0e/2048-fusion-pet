// Iron Fist (src/sim/keepsakes.js): the blocks that move in a swipe punch the
// monsters in their way. slidePaths() says where every block goes, with the
// board's own slide rules (src/sim/grid.js move) but without moving anything, so
// the run (the punches after a swipe), the tutorial (which swipe would punch) and
// tests all agree. punchTargets() says which monsters each path hits. Pure.
import { GRID, MAX_TIER, cellX, cellY } from '../config.js';

const DIRS = { left: [-1, 0], right: [1, 0], up: [0, 1], down: [0, -1] };

// Cells of one line, ordered from the edge the blocks slide toward (as grid.js does).
function lines(dir, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const line = [];
    for (let j = 0; j < n; j++) {
      if (dir === 'left') line.push([j, k]);
      else if (dir === 'right') line.push([n - 1 - j, k]);
      else if (dir === 'down') line.push([k, j]);
      else line.push([k, n - 1 - j]);
    }
    out.push(line);
  }
  return out;
}

/**
 * Where each block goes in a swipe: [{ id, tier, from: { col, row }, to: { col, row }, merged }]
 * for the blocks that move (a merging pair both end in the pair's cell). Empty when the
 * swipe moves nothing.
 */
export function slidePaths(tiles, dir, n = GRID.size) {
  if (!DIRS[dir]) return [];
  const at = new Map(tiles.map((t) => [t.row * n + t.col, t]));
  const out = [];
  const go = (t, col, row, merged) => {
    if (t.col !== col || t.row !== row) out.push({ id: t.id, tier: t.tier, from: { col: t.col, row: t.row }, to: { col, row }, merged });
  };
  for (const line of lines(dir, n)) {
    const list = line.map(([c, r]) => at.get(r * n + c)).filter(Boolean);
    let slot = 0;
    for (let i = 0; i < list.length; i++) {
      const [c, r] = line[slot];
      const a = list[i];
      const b = list[i + 1];
      if (b && a.tier === b.tier && a.tier < MAX_TIER) {
        go(a, c, r, true);
        go(b, c, r, true);
        i += 1;
      } else go(a, c, r, false);
      slot += 1;
    }
  }
  return out;
}

/**
 * The monsters the moving blocks hit: each one once, by the biggest block that hits it.
 * A path hits a monster ahead of the block's start (not beside or behind it), up to
 * `reach` past its new cell, within `width` of its line. → [{ foe, path }]
 */
export function punchTargets(paths, foes, dir, { reach = 1.25, width = 0.9 } = {}) {
  const d = DIRS[dir];
  if (!d) return [];
  const [ux, uy] = d;
  const best = new Map();
  for (const p of paths) {
    const fx = cellX(p.from.col);
    const fy = cellY(p.from.row);
    const len = Math.abs(cellX(p.to.col) - fx) + Math.abs(cellY(p.to.row) - fy);
    for (const e of foes) {
      if (e.dead || e.gone) continue;
      const along = (e.x - fx) * ux + (e.y - fy) * uy;
      const side = Math.abs((e.x - fx) * uy - (e.y - fy) * ux);
      if (along <= 0.2 || along > len + reach || side > width) continue;
      const cur = best.get(e.id);
      if (!cur || p.tier > cur.path.tier) best.set(e.id, { foe: e, path: p });
    }
  }
  return [...best.values()];
}

/** The swipes that would punch something now: { dir: monsters hit } for each direction that hits (the tutorial's hint). */
export function punchingSwipes(tiles, foes, opts) {
  const out = {};
  for (const dir of Object.keys(DIRS)) {
    const n = punchTargets(slidePaths(tiles, dir), foes, dir, opts).length;
    if (n) out[dir] = n;
  }
  return out;
}
