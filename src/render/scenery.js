// Scenery (siege): background, the four lanes above the board (one per column)
// with a portal at the top of each, and the board tray with its 16 sunken slots.
// There is no wall: enemies walk down their lane onto the board and attack the
// blocks themselves. Static parts are rebuilt on resize; per frame the attacked
// lanes glow, their portals open, warning chevrons flow down them, the board
// column each lane runs into lights up, and a selected block shows its range.
import { Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import { FIELD, GRID, cellX, cellY, laneX } from '../config.js';
import { portalTex, softDot, generatedTex } from './textures.js';

const LANE_W = 1.45; // world units
const HALF = (GRID.size * GRID.cell) / 2;
const BOARD_TOP = GRID.size * GRID.cell;
const PAD = 0.28;
const FIELD_TOP = FIELD.spawnY + 1.05;
const PORTAL_Y = FIELD.spawnY + 0.35;
const LANE_BOTTOM = BOARD_TOP + PAD; // the lanes run from the portals down into the board

function hash01(i, j = 0) {
  let h = Math.imul(i + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(j + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
}

export function createScenery(stage) {
  const { layers } = stage;
  const bg = new Graphics();
  const bgArt = new Sprite(); // the generated night-valley background, when tools/pipeline.mjs has made it
  bgArt.anchor.set(0.5);
  const bgDim = new Graphics(); // keeps the painted background quiet behind the board
  layers.bg.addChild(bg, bgArt, bgDim);
  const fieldG = new Graphics();
  const dangerG = new Graphics(); // lane + column highlights, redrawn per frame
  dangerG.blendMode = 'add';
  const chevG = new Graphics();
  const rangeG = new Graphics(); // the selected block's range
  layers.path.addChild(fieldG, dangerG, chevG);
  const boardG = new Graphics();
  const colG = new Graphics();
  colG.blendMode = 'add';
  layers.board.addChild(boardG, colG);
  layers.fx.addChild(rangeG);

  const portals = [];
  const portalLayer = new Container();
  layers.path.addChild(portalLayer);
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const glow = new Sprite(softDot());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    const ring = new Sprite(portalTex());
    ring.anchor.set(0.5);
    portalLayer.addChild(glow, ring);
    portals.push({ glow, ring, open: 0 });
  }

  let range = null; // { x, y, shoot } of the selected block
  let time = 0;

  function chevron(g, x, y, color, width, U, alpha = 1) {
    // points down the lane, toward the board and the wall under it
    const sx = stage.sx;
    const sy = stage.sy;
    const s = 0.24;
    g.moveTo(sx(x - s), sy(y + s * 0.8))
      .lineTo(sx(x), sy(y))
      .lineTo(sx(x + s), sy(y + s * 0.8))
      .stroke({ width: width * U, color, alpha, cap: 'round', join: 'round' });
  }

  function build(view) {
    const { U, w, h } = view;
    const sx = stage.sx;
    const sy = stage.sy;

    // background: deep blue gradient + soft dots
    bg.clear();
    const grad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: '#2f4a8a' },
        { offset: 0.55, color: '#253a72' },
        { offset: 1, color: '#1a2552' },
      ],
    });
    bg.rect(0, 0, w, h).fill(grad);
    for (let i = 0; i < 70; i++) {
      bg.circle(hash01(i, 1) * w, hash01(i, 2) * h, 2 + hash01(i, 3) * 5).fill({ color: 0xffffff, alpha: 0.04 + hash01(i, 4) * 0.05 });
    }
    bg.ellipse(sx(0), sy(4), 7.5 * U, 7 * U).fill({ color: 0x6fa8ff, alpha: 0.08 });
    const art = generatedTex('env.background');
    bgArt.visible = bgDim.visible = !!art;
    if (art) {
      bgArt.texture = art;
      bgArt.scale.set(Math.max(w / art.width, h / art.height)); // cover the screen
      bgArt.position.set(w / 2, h / 2);
      bgDim.clear().rect(0, 0, w, h).fill({ color: 0x141c3f, alpha: 0.28 });
    }

    // field: a darker meadow panel holding the four lanes
    fieldG.clear();
    const fx0 = sx(-HALF - PAD);
    const fw = (HALF + PAD) * 2 * U;
    fieldG.roundRect(fx0, sy(FIELD_TOP), fw, (FIELD_TOP - LANE_BOTTOM + 0.6) * U, 0.5 * U).fill({ color: 0x1c2c58 }).stroke({ width: 0.08 * U, color: 0x131c3d });
    for (let i = 0; i < 60; i++) {
      const x = -HALF + hash01(i, 9) * HALF * 2;
      const y = LANE_BOTTOM + 0.3 + hash01(i, 10) * (FIELD_TOP - LANE_BOTTOM - 0.6);
      fieldG.circle(sx(x), sy(y), (0.04 + hash01(i, 11) * 0.06) * U).fill({ color: 0x5f8f6a, alpha: 0.35 });
    }
    for (let lane = 0; lane < FIELD.lanes; lane++) {
      const x = laneX(lane);
      const top = sy(FIELD.spawnY + 0.4);
      const bottom = sy(LANE_BOTTOM - 0.4); // tucks under the board tray
      const lw = LANE_W * U;
      fieldG.roundRect(sx(x) - lw / 2 - 0.08 * U, top, lw + 0.16 * U, bottom - top, 0.3 * U).fill({ color: 0x151a36 });
      fieldG.roundRect(sx(x) - lw / 2, top, lw, bottom - top, 0.26 * U).fill({ color: 0xd9c7a3 });
      fieldG.roundRect(sx(x) - lw * 0.36, top, lw * 0.72, bottom - top, 0.2 * U).fill({ color: 0xe9dcc0 });
      for (let i = 0; i < 18; i++) {
        const py = LANE_BOTTOM + hash01(lane, 20 + i) * (FIELD.spawnY - LANE_BOTTOM);
        const px = x + (hash01(lane, 40 + i) - 0.5) * LANE_W * 0.8;
        fieldG.circle(sx(px), sy(py), (0.03 + hash01(lane, 60 + i) * 0.05) * U).fill({ color: 0xb59f7c, alpha: 0.7 });
      }
      for (let y = FIELD.spawnY - 1.2; y > LANE_BOTTOM + 0.5; y -= 1.6) chevron(fieldG, x, y, 0xb8a37f, 0.07, U);
    }

    // board tray with sunken slots
    boardG.clear();
    boardG
      .roundRect(sx(-HALF - PAD), sy(BOARD_TOP + PAD) + 0.12 * U, (HALF + PAD) * 2 * U, (BOARD_TOP + PAD * 2) * U, 0.5 * U)
      .fill({ color: 0x0f1430, alpha: 0.55 });
    boardG
      .roundRect(sx(-HALF - PAD), sy(BOARD_TOP + PAD), (HALF + PAD) * 2 * U, (BOARD_TOP + PAD * 2) * U, 0.5 * U)
      .fill({ color: 0x3a3266 })
      .stroke({ width: 0.08 * U, color: 0x1a1638 });
    const slot = GRID.cell * 0.9;
    for (let r = 0; r < GRID.size; r++) {
      for (let c = 0; c < GRID.size; c++) {
        boardG
          .roundRect(sx(cellX(c) - slot / 2), sy(cellY(r) + slot / 2), slot * U, slot * U, 0.28 * U)
          .fill({ color: 0x2a2450 })
          .stroke({ width: 0.04 * U, color: 0x4b4385 });
      }
    }

    for (let lane = 0; lane < FIELD.lanes; lane++) {
      const p = portals[lane];
      p.ring.position.set(sx(laneX(lane)), sy(PORTAL_Y));
      p.glow.position.copyFrom(p.ring.position);
    }
  }

  stage.onResize(build);

  function drawRange(U) {
    rangeG.clear();
    if (!range) return;
    const sx = stage.sx;
    const sy = stage.sy;
    const { shoot } = range;
    const pulse = 0.75 + 0.25 * Math.sin(time * 5);
    if (shoot.radius != null) {
      rangeG.circle(sx(range.x), sy(range.y), shoot.radius * U).fill({ color: 0xffffff, alpha: 0.08 * pulse }).stroke({ width: 0.06 * U, color: 0xffffff, alpha: 0.7 * pulse });
      return;
    }
    // a band up and down the block's lane(s), `reach` each way from the block
    const lane = Math.max(0, Math.min(FIELD.lanes - 1, Math.round((range.x - laneX(0)) / GRID.cell)));
    const y0 = Math.min(FIELD.spawnY, range.y + shoot.reach);
    const y1 = Math.max(FIELD.gateY, range.y - shoot.reach);
    for (let l = Math.max(0, lane - shoot.lanes); l <= Math.min(FIELD.lanes - 1, lane + shoot.lanes); l++) {
      // light lanes need a dark outline for the band to read
      const x = laneX(l);
      const w = LANE_W + 0.12;
      rangeG
        .roundRect(sx(x) - (w / 2) * U, sy(y0), w * U, (y0 - y1) * U, 0.22 * U)
        .fill({ color: 0x6fa8ff, alpha: 0.22 * pulse })
        .stroke({ width: 0.09 * U, color: 0x1b2a55, alpha: 0.9 });
      for (const yy of [y0, y1]) {
        rangeG.moveTo(sx(x) - (w / 2) * U, sy(yy)).lineTo(sx(x) + (w / 2) * U, sy(yy)).stroke({ width: 0.16 * U, color: 0x1b2a55, alpha: 0.9 });
        rangeG.moveTo(sx(x) - (w / 2) * U, sy(yy)).lineTo(sx(x) + (w / 2) * U, sy(yy)).stroke({ width: 0.07 * U, color: 0xffffff, alpha: pulse });
      }
    }
  }

  /**
   * @param state { lanes, bossLane, phase, perLane: enemies alive per lane }
   */
  function update(dt, state = null) {
    time += dt;
    const U = stage.view.U;
    const sx = stage.sx;
    const sy = stage.sy;
    const lanes = state?.lanes ?? [];
    const warn = state && (state.phase === 'prep' || state.phase === 'break');
    // a slow, gentle breath (photosafe: its red step stays under the red-flash threshold)
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);

    dangerG.clear();
    colG.clear();
    chevG.clear();
    for (let lane = 0; lane < FIELD.lanes; lane++) {
      const active = lanes.includes(lane);
      const boss = state?.bossLane === lane;
      const busy = state?.perLane?.[lane] ?? 0;
      const p = portals[lane];
      p.open += ((active ? 1 : 0) - p.open) * Math.min(1, dt * 6);
      const size = (1.15 + 0.45 * p.open + (boss ? 0.35 : 0)) * U;
      p.ring.width = p.ring.height = size;
      p.ring.rotation = time * (0.5 + 1.6 * p.open) * (lane % 2 ? -1 : 1);
      p.ring.alpha = 0.3 + 0.7 * p.open;
      p.ring.tint = boss ? 0xff7a7a : 0xffffff;
      p.glow.tint = boss ? 0xff4d4d : 0x9d7bff;
      p.glow.width = p.glow.height = size * 2;
      p.glow.alpha = p.open * (0.45 + 0.25 * Math.sin(time * 3 + lane));

      const x = laneX(lane);
      const color = boss ? 0xff4d4d : 0xff8a5c;
      const heat = warn && active ? 0.1 + 0.04 * pulse : busy ? Math.min(0.14, 0.05 + busy * 0.025) : 0;
      if (heat > 0) {
        dangerG.roundRect(sx(x) - (LANE_W / 2) * U, sy(FIELD.spawnY + 0.4), LANE_W * U, (FIELD.spawnY + 0.4 - LANE_BOTTOM) * U, 0.26 * U).fill({ color, alpha: heat });
        colG.roundRect(sx(x - GRID.cell * 0.48), sy(BOARD_TOP + 0.1), GRID.cell * 0.96 * U, (BOARD_TOP + 0.2) * U, 0.32 * U).fill({ color, alpha: heat * 0.7 });
      }
      if (warn && active) {
        // chevrons flowing down the lane toward the board
        const flow = (time * 2.2) % 1.1;
        for (let y = FIELD.spawnY - 0.6 - flow; y > LANE_BOTTOM + 0.3; y -= 1.1) {
          const a = 0.35 + 0.65 * ((FIELD.spawnY - y) / (FIELD.spawnY - LANE_BOTTOM));
          chevron(chevG, x, y, color, 0.12, U, a);
        }
      }
    }

    drawRange(U);
  }

  return {
    update,
    /** Show a block's range (null hides it): { x, y, shoot } in world units. */
    showRange(r) {
      range = r;
    },
    boardBottom: -PAD,
  };
}
