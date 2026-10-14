// Classic square 2048 board: swipe to slide every tile, equal neighbours merge
// once per move, a new tile spawns after every move that changed the board.
// Tiles are persistent objects (id, tier, col, row, cls…) so their turret class
// survives sliding. Pure and deterministic for a given seed and move sequence.

import { createRng } from './rng.js';
import { GRID, MAX_TIER, RULES, cellX, cellY, tierValue } from '../config.js';

const DIRS = {
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
  up: { dc: 0, dr: 1 },
  down: { dc: 0, dr: -1 },
};

/**
 * @param spawn      false disables random tile spawns (tests)
 * @param spawnTable [[tier, weight]…] or a function returning one
 * @param onMerge    (child, mover, stayer) hook: `mover` is the tile that slid into `stayer`
 *                   (the one coming from the side the swipe starts from)
 * @param onSpawn    (tile) hook for every new tile (random spawns and debug spawns)
 */
export function createGrid({ seed = (Math.random() * 2 ** 32) >>> 0, spawn = true, spawnTable = null, onMerge = null, onSpawn = null } = {}) {
  const n = GRID.size;
  const rng = createRng(seed);
  const cells = new Array(n * n).fill(null);
  const events = [];
  let nextId = 1;
  const s = { score: 0, maxTier: 0, moves: 0, time: 0 };
  const table = () => (typeof spawnTable === 'function' ? spawnTable() : spawnTable ?? GRID.spawnWeights);

  const idx = (col, row) => row * n + col;
  const at = (col, row) => (col < 0 || row < 0 || col >= n || row >= n ? null : cells[idx(col, row)]);

  function makeTile(tier, col, row) {
    const t = {
      id: nextId++,
      tier,
      col,
      row,
      fromCol: col,
      fromRow: row,
      x: cellX(col),
      y: cellY(row),
      r: GRID.turretR,
      cls: {},
      bornAt: s.moves,
      mergedFrom: null,
    };
    s.maxTier = Math.max(s.maxTier, tier);
    return t;
  }

  function setCell(t, col, row) {
    t.col = col;
    t.row = row;
    t.x = cellX(col);
    t.y = cellY(row);
    cells[idx(col, row)] = t;
  }

  function place(tier, col, row) {
    const t = makeTile(tier, col, row);
    setCell(t, col, row);
    return t;
  }

  function empties() {
    const out = [];
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (!cells[idx(col, row)]) out.push([col, row]);
    return out;
  }

  function spawnRandom() {
    const free = empties();
    if (!free.length) return null;
    const [col, row] = free[Math.floor(rng.next() * free.length)];
    const t = place(rng.weighted(table()), col, row);
    onSpawn?.(t);
    events.push({ type: 'spawn', id: t.id, tier: t.tier, col, row, x: t.x, y: t.y });
    return t;
  }

  // Cells of one line, ordered from the edge tiles slide toward.
  function lines(dir) {
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

  function move(dir) {
    if (!DIRS[dir]) return false;
    for (const t of cells) if (t) {
      t.fromCol = t.col;
      t.fromRow = t.row;
      t.mergedFrom = null;
    }
    let moved = false;
    let combo = 0;
    const merges = [];
    for (const line of lines(dir)) {
      const tiles = line.map(([c, r]) => at(c, r)).filter(Boolean);
      for (const [c, r] of line) cells[idx(c, r)] = null;
      let slot = 0;
      for (let i = 0; i < tiles.length; i++) {
        const [c, r] = line[slot];
        const a = tiles[i];
        const b = tiles[i + 1];
        if (b && a.tier === b.tier && a.tier < MAX_TIER) {
          // `a` is nearer the edge the tiles slide toward; `b` slides into it
          const child = makeTile(a.tier + 1, c, r);
          child.mergedFrom = [
            { id: a.id, col: a.col, row: a.row, tier: a.tier },
            { id: b.id, col: b.col, row: b.row, tier: b.tier },
          ];
          child.fromCol = c;
          child.fromRow = r;
          setCell(child, c, r);
          onMerge?.(child, b, a);
          merges.push(child);
          moved = true;
          i += 1;
        } else {
          if (a.col !== c || a.row !== r) moved = true;
          setCell(a, c, r);
        }
        slot += 1;
      }
    }
    if (!moved) return false;
    s.moves += 1;
    events.push({ type: 'move', dir });
    for (const c of merges) {
      combo += 1;
      const value = tierValue(c.tier);
      s.score += value;
      events.push({ type: 'merge', id: c.id, from: c.mergedFrom.map((m) => m.id), tier: c.tier, value, x: c.x, y: c.y, col: c.col, row: c.row, combo });
      if (c.tier >= RULES.milestoneTier && c.tier === s.maxTier && !events.some((e) => e.type === 'milestone' && e.tier === c.tier)) {
        events.push({ type: 'milestone', tier: c.tier, value });
      }
    }
    if (spawn) spawnRandom();
    return true;
  }

  function canMove() {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const t = at(col, row);
        if (!t) return true;
        const r = at(col + 1, row);
        const u = at(col, row + 1);
        if ((r && r.tier === t.tier) || (u && u.tier === t.tier)) return true;
      }
    }
    return false;
  }

  /** Raise a tile `by` tiers in place (each tier is an x2). */
  function promote(t, by = 1) {
    if (!t || by < 1 || t.tier + by > MAX_TIER || cells[idx(t.col, t.row)] !== t) return false;
    t.tier += by;
    s.maxTier = Math.max(s.maxTier, t.tier);
    events.push({ type: 'promote', id: t.id, tier: t.tier, by, x: t.x, y: t.y });
    return true;
  }

  function spawnDebug(tier, col = null, row = null) {
    let target = col != null && row != null && !at(col, row) ? [col, row] : null;
    if (!target) {
      const free = empties();
      if (!free.length) return null;
      target = free[0];
    }
    const t = place(tier, target[0], target[1]);
    onSpawn?.(t);
    return t;
  }

  function clear() {
    cells.fill(null);
  }

  /** Take a tile off the board: sold, or destroyed by enemies (siege). */
  function remove(t, reason = 'sold') {
    if (!t || cells[idx(t.col, t.row)] !== t) return false;
    cells[idx(t.col, t.row)] = null;
    events.push({ type: 'remove', id: t.id, tier: t.tier, x: t.x, y: t.y, reason, cls: { ...t.cls } });
    return true;
  }

  if (spawn) {
    spawnRandom();
    spawnRandom();
  }

  return {
    move,
    canMove,
    promote,
    place,
    spawnDebug,
    clear,
    remove,
    at,
    step(dt) {
      s.time += dt;
    },
    drainEvents: () => events.splice(0, events.length),
    get tiles() {
      return cells.filter(Boolean);
    },
    get score() {
      return s.score;
    },
    get maxTier() {
      return s.maxTier;
    },
    get moves() {
      return s.moves;
    },
    get time() {
      return s.time;
    },
    get seed() {
      return seed;
    },
  };
}
