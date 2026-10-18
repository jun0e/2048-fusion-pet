// v2 summons, the pet's moves (docs/v2/SPEC.md section 5). A fusion's pet lives on its tile; its
// summon skill sends it out to the front for a while: it hops from its tile to a spot on the field
// above the board ('out'), acts there with its skill ('act': a skill may walk it, or jump it, through
// the kit), and hops home ('back'). Deterministic: it reads only the sim's state and step. The
// renderer (src/kv/roam.js) draws `tile.summon`.
import { DESIGN_CELL, GRID, GRID_TOP, FIELD, cellX } from '../config.js';

export const Y_MIN = GRID_TOP + 1.1; // just above the gates
export const Y_MAX = FIELD.spawnY - 2.4; // short of the portals
export const X_MAX = DESIGN_CELL * 1.8; // world units: the board's footprint stays as it grows
const ARC = 2.2; // the hop's height (world units)

/** Is this block's pet out on the field? (v1: fusions roamed for good; v2: only while summoned.) */
export const roams = (t) => !!t.summon;

/**
 * Lane pressure: foes count more the closer they are to the board (as v1's roamers chose).
 * → [one number per lane].
 */
export function lanePressure(enemies) {
  const press = new Array(FIELD.lanes).fill(0);
  for (const e of enemies) {
    if (e.dead || e.gone) continue;
    press[Math.max(0, Math.min(FIELD.lanes - 1, e.lane))] += 1 / Math.max(1, e.y - GRID_TOP);
  }
  return press;
}

/** The lane under the most pressure (ties: the one nearest `home`), or `home` when the field is empty. */
export function busiestLane(enemies, home = 0) {
  const press = lanePressure(enemies);
  if (!press.some((p) => p > 0)) return home;
  let best = home;
  for (let l = 0; l < press.length; l++) if (press[l] > press[best] + 1e-9 || (Math.abs(press[l] - press[best]) <= 1e-9 && Math.abs(l - home) < Math.abs(best - home))) best = l;
  return best;
}

/** Where a summoned pet goes first: on the busiest lane, a little in front of its leading foe. */
export function frontSpot(tile, enemies) {
  const home = Math.max(0, Math.min(FIELD.lanes - 1, Math.round((tile.x - cellX(0)) / GRID.cell)));
  const lane = busiestLane(enemies, home);
  const lead = enemies.filter((e) => !e.dead && !e.gone && e.lane === lane).reduce((m, e) => (!m || e.y < m.y ? e : m), null);
  const y = Math.max(Y_MIN, Math.min(Y_MAX, (lead?.y ?? Y_MIN + 2) - 2.2));
  return { x: cellX(lane), y, lane };
}

/** Keep a spot on the field. */
export const clampSpot = (x, y) => ({ x: Math.max(-X_MAX - DESIGN_CELL * 0.2, Math.min(X_MAX + DESIGN_CELL * 0.2, x)), y: Math.max(Y_MIN, Math.min(FIELD.spawnY - 0.6, y)) });

/**
 * One step of a summoned pet's moves. `s` = tile.summon: { phase, t, hop, x, y, x0, y0, tx, ty, speed?,
 * home: { x, y } }. 'out' / 'back' are hops along an arc (s.z, 0..1, is the height for the renderer);
 * in 'act' the pet walks toward (tx, ty) at `speed` (cells per second; 0 = it stays), or stands.
 */
export function moveSummon(s, dt) {
  if (s.phase === 'out' || s.phase === 'back') {
    const k = Math.min(1, s.t / s.hop);
    const tx = s.phase === 'out' ? s.tx : s.home.x;
    const ty = s.phase === 'out' ? s.ty : s.home.y;
    s.x = s.x0 + (tx - s.x0) * k;
    s.y = s.y0 + (ty - s.y0) * k;
    s.z = Math.sin(k * Math.PI) * ARC;
    if (Math.abs(tx - s.x0) > 0.05) s.facing = tx > s.x0 ? 1 : -1;
    return;
  }
  s.z = 0;
  s.moving = false;
  const sp = (s.speed ?? 0) * DESIGN_CELL * dt; // design cells a second
  if (sp <= 0) return;
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.02) return;
  s.x += (dx / d) * Math.min(sp, d);
  s.y += (dy / d) * Math.min(sp, d);
  s.moving = true;
  if (Math.abs(dx) > 0.05) s.facing = dx > 0 ? 1 : -1;
}

/** v1's roaming, retired: kept so an old caller still runs (it moves nothing). */
export function createRoam() {
  return { step() {} };
}
