// Scenery (siege): the frame around the fight (src/render/frame.js: the painted valley far away, a
// ridge strip, and in front the towers, the gate wall with an arch per lane, the cobbled lanes with a
// tick per cell and hedges between them, the parapet with a brazier per column, and the keep with
// a flagstone pit per cell: 16, 25 or 36 as the board grows), plus the selected block's range. There
// is no wall: enemies walk down their lane onto the board and attack the blocks themselves.
// Per frame: the attacked lanes' gates open (the portcullis rolls up, the iris turns), the braziers
// warn of the lanes under attack (lit while a lane has foes alive or still due; smoking under
// pressure), and a selected block's range breathes. During a break the open gates show the next
// wave's chips. Nothing here is additive: the old red lane and column washes and the chevron flow are gone.
import { Graphics } from 'pixi.js';
import { FIELD, GRID, laneX } from '../config.js';
import { FRAME_GEOM, chapterKeyFor, dueByLane, laneOf, litTicks, nextDieAt, previewChips } from '../art/frame-kit.js';
import { createFrame } from './frame.js';

const PAD = FRAME_GEOM.keep.pad;
const INK = 0x2b1d2e;
const CREAM = 0xfffaf2;

/**
 * The selected block's range, drawn into two Graphics: the ink lines (`ink`) and the cream lines over
 * them (`cream`, whose alpha breathes). A cream line on an ink line reads on the light lanes and on
 * the dark keep alike. range = { x, y, shoot } in world units; U, sx, sy: the stage's layout.
 */
function drawRange(ink, cream, range, U, sx, sy) {
  const { shoot } = range;
  const laneW = FRAME_GEOM.laneW; // the board's lane width (world units), now
  // a path twice: wide in ink (`alpha`), then narrow in cream
  const line = (draw, inkW, creamW, alpha, extra = {}) => {
    draw(ink).stroke({ width: inkW * U, color: INK, alpha, ...extra });
    draw(cream).stroke({ width: creamW * U, color: CREAM, ...extra });
  };
  if (shoot.radius != null) {
    line((g) => g.circle(sx(range.x), sy(range.y), shoot.radius * U), 0.14, 0.06, 0.9);
  } else {
    // the band up and down the block's lane(s), `reach` each way from the block: an outline only
    const lane = laneOf(range.x);
    const y0 = Math.min(FIELD.spawnY, range.y + shoot.reach);
    const y1 = Math.max(FIELD.gateY, range.y - shoot.reach);
    const w = laneW + 0.12;
    const n = shoot.lanes ?? 0;
    for (let l = Math.max(0, lane - n); l <= Math.min(FIELD.lanes - 1, lane + n); l++) {
      const x = sx(laneX(l));
      line((g) => g.roundRect(x - (w / 2) * U, sy(y0), w * U, (y0 - y1) * U, 0.22 * U), 0.12, 0.045, 0.85);
      for (const yy of [y0, y1]) line((g) => g.moveTo(x - (w / 2) * U, sy(yy)).lineTo(x + (w / 2) * U, sy(yy)), 0.16, 0.07, 0.9);
    }
  }
  // the covered cells' ticks light up across the lane (≈ 0.08 u² each)
  const half = (laneW / 2 - 0.06) * U;
  for (const t of litTicks(range)) {
    const x = sx(laneX(t.lane));
    const y = sy(t.y);
    line((g) => g.moveTo(x - half, y).lineTo(x + half, y), 0.15, 0.07, 0.85, { cap: 'round' });
  }
}

/** Foes alive per lane, one count for each of the board's lanes (a foe off the lanes counts on the nearest). */
export function perLaneOf(enemies) {
  const out = new Array(FIELD.lanes).fill(0);
  for (const e of enemies ?? []) if (!e.dead && !e.gone) out[Math.max(0, Math.min(out.length - 1, e.lane ?? 0))] += 1;
  return out;
}

/**
 * @param stage  the stage (src/render/stage.js)
 * @param fx     optional: the effects module (a brazier books its flame in the light budget each time it lights)
 * @param tx     optional: the frame's textures and text (tests pass stand-ins)
 */
export function createScenery(stage, fx = null, { tx } = {}) {
  const frame = createFrame(stage, { fx, ...(tx && { tx }) });
  // the selected block's range: drawn once per selection (and per resize); per frame only the cream breathes
  const rangeInk = new Graphics();
  const rangeCream = new Graphics();
  stage.layers.fx.addChild(rangeInk, rangeCream);

  let range = null; // { x, y, shoot } of the selected block
  let rangeKey = '';
  let time = 0;
  let waveSeen = null; // the run's wave object the chips were made from
  let phaseSeen = '';

  function showRange(U) {
    const { ox, oy } = stage.view;
    const key = range ? `${range.x}|${range.y}|${JSON.stringify(range.shoot)}|${U}|${ox}|${oy}|${GRID.size}` : '';
    if (key !== rangeKey) {
      rangeKey = key;
      rangeInk.clear();
      rangeCream.clear();
      if (range) drawRange(rangeInk, rangeCream, range, U, stage.sx, stage.sy);
    }
    // a slow, gentle breath on the cream: a selection, not a flash; Reduce motion holds it steady
    if (range) rangeCream.alpha = stage.reduced ? 1 : 0.85 + 0.15 * Math.sin(time * Math.PI);
  }

  /** The chapter, the gates' chips and the deck slot, from the run (called by update when state.run is given). */
  function syncRun(run) {
    frame.setChapter(chapterKeyFor(run.wave?.chapter));
    const waiting = run.phase === 'prep' || run.phase === 'break';
    if (run.wave !== waveSeen || run.phase !== phaseSeen) {
      waveSeen = run.wave;
      phaseSeen = run.phase;
      frame.setPreview(waiting ? previewChips(run.wave) : null);
    }
    frame.setDeck({ dice: run.owned?.length ?? 0, nextAt: nextDieAt(run.maxTier) });
  }

  /**
   * @param state { lanes, bossLane, phase, perLane: enemies alive per lane, run? } — with `run`, the
   *        chapter skin, the gate chips and the deck slot follow it (else use the setters below), a
   *        lane's brazier stays lit while foes are still due out of its gate (dueByLane), and the foes
   *        per lane are counted from it, one count per lane of the board's (4, 5 or 6)
   */
  function update(dt, state = null) {
    time += dt;
    if (state?.run) {
      syncRun(state.run);
      state = { ...state, due: dueByLane(state.run), perLane: perLaneOf(state.run.enemies) };
    }
    frame.update(dt, state);
    showRange(stage.view.U);
  }

  return {
    update,
    /** The board grew ({ type: 'grow', size, from }): the frame rebuilds at its new size and eases there (frame.grow). */
    grow(e) {
      frame.grow(e);
    },
    /** The frame (for tests and checks: its layout as drawn now). */
    frame,
    /** Show a block's range (null hides it): { x, y, shoot } in world units. */
    showRange(r) {
      range = r;
    },
    /** The chapter skin: 'forest' | 'fareast' | 'peaks' (or a chapter's name). */
    setChapter(key) {
      frame.setChapter(chapterKeyFor(key));
    },
    /** The next wave's chips in the open gates: previewChips(run.wave) during prep and break, null otherwise. */
    setPreview(list) {
      frame.setPreview(list);
    },
    /** The deck rail: { dice: how many, nextAt: the block value that brings the next die (nextDieAt), or null }. */
    setDeck(info) {
      frame.setDeck(info);
    },
    boardBottom: -PAD,
  };
}
