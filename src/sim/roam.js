// Roaming fusions, the sim side. At 256 a fusion's pet hops out of its tile (the tile stays on
// the board as its den) and roams the field: it walks to the lane under the most pressure,
// idles, and fights from where it stands (defense.js reads tile.roam). It moves with the sim's
// fixed step and the run's own random stream, so a replay or a resumed run plays out the same;
// src/kv/roam.js only draws it. Only a run made with { roaming: true } has it (the game turns
// it on when it draws the pets; tools and tests keep the blocks in place).
import { GRID, GRID_TOP, FIELD, cellX } from '../config.js';

const Y_MIN = GRID_TOP + 1.1;
const Y_MAX = FIELD.spawnY - 2.4;
const X_MAX = GRID.cell * 1.8;
const HATCH = 0.7; // seconds: the hop out of the den
const GAP = 2.3; // pets keep this much room between them

/** Does this block's pet roam? Fusions (256 and up). */
export const roams = (t) => t.tier >= 8 && !!t.cls?.fusion;

/**
 * tile.roam = { x, y, tx, ty, hatch, x0, y0, idle, think, facing, home, moving }:
 * where the pet stands and where it goes; hatch 0 → 1 is the hop out of the den.
 */
export function createRoam(rng) {
  const rand = () => rng.next();

  /** Where to go next: under the most pressed lane, a little above the leading foe. */
  function pickSpot(r, enemies, pets) {
    let lane = null;
    if (enemies) {
      const press = [0, 0, 0, 0];
      for (const e of enemies) {
        if (e.dead || e.gone) continue;
        press[e.lane] += 1 / Math.max(1, e.y - GRID_TOP);
      }
      // spread out: a lane another pet already covers counts for less
      const taken = [0, 0, 0, 0];
      for (const o of pets) if (o !== r) taken[Math.max(0, Math.min(3, Math.round((o.tx - cellX(0)) / GRID.cell)))] += 1;
      const score = press.map((p, i) => p - taken[i] * 1.5 + (i === r.home ? 0.08 : 0));
      if (press.some((p) => p > 0)) lane = score.indexOf(Math.max(...score));
    }
    if (lane != null) {
      const ahead = enemies.filter((e) => !e.dead && e.lane === lane).reduce((m, e) => (!m || e.y < m.y ? e : m), null);
      r.tx = cellX(lane) + (rand() - 0.5) * 1.1;
      r.ty = Math.max(Y_MIN, Math.min(Y_MAX, (ahead?.y ?? Y_MIN + 3) - 2.6 - rand() * 1.2));
    } else {
      // nothing to fight: amble around its home lane
      r.tx = Math.max(-X_MAX, Math.min(X_MAX, cellX(r.home) + (rand() - 0.5) * 1.6));
      r.ty = Y_MIN + rand() * 3.2;
    }
    r.think = 2.6 + rand() * 1.8;
  }

  /** One sim step: hatch, walk and part the pets. A block that is no fusion (any more) has none. */
  function step(tiles, enemies, dt) {
    const pets = [];
    for (const t of tiles) {
      if (roams(t)) {
        if (t.roam) pets.push(t.roam);
      } else if (t.roam) delete t.roam;
    }
    for (const t of tiles) {
      if (!roams(t) || t.roam) continue;
      const r = { x: t.x, y: t.y, x0: t.x, y0: t.y, tx: t.x, ty: Y_MIN + 1, hatch: 0, idle: 0, think: 0, facing: -1, home: pets.length % 4, moving: false };
      pickSpot(r, null, pets);
      t.roam = r;
      pets.push(r);
    }
    for (const t of tiles) {
      const r = t.roam;
      if (!r) continue;
      r.moving = false;
      if (r.hatch < 1) {
        // the hop out of the den: an arc up to its first spot
        r.hatch = Math.min(1, r.hatch + dt / HATCH);
        const k = r.hatch;
        r.x = r.x0 + (r.tx - r.x0) * k;
        r.y = r.y0 + (r.ty - r.y0) * k + Math.sin(k * Math.PI) * 2.2;
        continue;
      }
      r.think -= dt;
      const dx = r.tx - r.x;
      const dy = r.ty - r.y;
      const d = Math.hypot(dx, dy);
      if (r.idle > 0) r.idle -= dt;
      else if (d > 0.08) {
        const sp = (t.cls.ultimate ? 1.15 : 1.7) * dt; // legendaries glide, slower
        r.x += (dx / d) * Math.min(sp, d);
        r.y += (dy / d) * Math.min(sp, d);
        r.moving = true;
        if (Math.abs(dx) > 0.05) r.facing = dx > 0 ? 1 : -1;
      } else r.idle = 0.8 + rand() * 1.4;
      if (r.think <= 0 && r.idle <= 0) pickSpot(r, enemies, pets);
      // keep a little room between pets
      for (const o of pets) {
        if (o === r) continue;
        const ox = r.x - o.x;
        const oy = r.y - o.y;
        const od = Math.hypot(ox, oy);
        if (od > 0 && od < GAP) {
          r.x += (ox / od) * (GAP - od) * dt * 2.5;
          r.y += (oy / od) * (GAP - od) * dt * 2.5;
        }
      }
      r.x = Math.max(-X_MAX, Math.min(X_MAX, r.x));
      r.y = Math.max(Y_MIN, Math.min(Y_MAX, r.y));
    }
  }

  return { step };
}
