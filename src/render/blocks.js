// 2048 block views: slide animation between cells, merge (both parents slide into the target cell,
// then the new block pops), class glow, a legend's signature charge, recoil + muzzle flash when
// firing. The creature on the tile sells its attack's stage (src/art/attack-vfx.js petPose): a
// wind-up before each shot (WIND_UP s of real time at any speed: 16 hops, 32–64 crouch, 128
// crouches and recoils), and a Pride Pounce cub leaps onto its prey and back, with an afterimage
// from 32.
// The sticker tile is a clay plaque seated in its flagstone pit (reports/art/tiles/tile-spec.md; the
// geometry and motion rules are src/art/plaque.js). Its shadow is cast inside the pit. A new block
// drops into its pit with two sand puffs; a picked block lifts on a longer shadow inside cream corner
// brackets, red and dashed while its Sell / Break is armed (the plaque wobbles: about to go); a
// refused swipe nudges every plaque that way and back. A hit tints the plaque (not the creature) and
// shudders it; a 16 shows its scared face, 32–128 a sweat drop, an egg wobbles harder. A repair drops
// leaves. A sold block lifts out of its pit; a destroyed one cracks from the bite, drops into the pit
// and crumbles, leaving rubble for a while; a broken one crumbles in sand. An egg hatches out of its
// shell; a boss x2 flips the numeral like a card; the meter's new segment gets a cream wipe; a 16
// blinks now and then. A den's altar rises as its pet hops out, and the pet's paw prints lead off
// it while it roams; the den does not recoil when its pet fires (the pet does).
// Nothing is additive: the class glow is a tinted soft dot under the tile and the muzzle flash a
// white silhouette of the plaque, both in normal blend below the flash thresholds (photosafe.js
// TILE_GLOW); the small bits (puffs, chips, leaves, shells, the wipe, the cracks) book their light
// with fx first. Reduce motion: no shudder, no drop-in (a fade), no wobble, no nudge, no poses, no
// leaves; the brackets hold still and a departure fades in place.
// The classic and pixel styles keep their own plates, and the 4-piece border for their progress.
import { Container, Graphics, GraphicsContext, Sprite, Texture } from 'pixi.js';
import { GRID, cellX, cellY } from '../config.js';
import { ELEMENTS, fusionOf, milestonePieces } from '../sim/classes.js';
import { LADDER, createSimRate, has, ladderStage, leapAt, petPose, windUpAt } from '../art/attack-vfx.js';
import { blockTex, softDot, sparkTex, vfxTex, BLOCK_PX } from './textures.js';
import { createAfterimage } from './trails.js';
import { BRACKET_CORNERS, drawBracket } from './brackets.js';
import { BURST, DOT, HIT_TINT, TILE_GLOW, spriteLit } from '../ux/photosafe.js';
import { tileDecor } from '../art/index.js';
import { chapterKeyFor, skinFor } from '../art/frame-kit.js';
import { tone } from '../art/tokens.js';
import { BLINK, CRACKS, DEPART_TIME, PAW_MIN_PX, PLAQUE, TILE_COLORS, appearPose, blinkGap, bracketOffset, departPose, isDen, meterOf, meterSegments, nudgeAt, numberFit, plateColor, seatShadow, shudderAt, walkRoundRect, wobbleAt } from '../art/plaque.js';

const METER = meterSegments(); // the growth meter's segments (cells)

const SLIDE = 0.11;
const FOLLOW = 0.22; // seconds of follow-through after a shot
const HATCH = 0.25; // seconds: the hatchling pops up from the sill
const FLIP = 0.3; // seconds: a boss x2 flips the numeral
const WIPE = 0.2; // seconds: the meter's new segment lights with a cream wipe
const SWAP = 0.3; // seconds: a colour override slides the loser's badge out
const RUBBLE = { rise: DEPART_TIME, hold: 4, fall: 1, alpha: 0.7 };
const CHARGE_STEPS = 64; // a legend's charge stroke grows in this many steps round its frame
const SHELL_LIFE = 0.45; // seconds: an egg's shell halves fly
const SHELL_LIT = 2 * spriteLit(0.32, 0.32, 0.9); // what they light (world units²: two 0.32 sprites)
const ease = (t) => 1 - (1 - t) ** 3;
const smooth = (t) => t * t * (3 - 2 * t);
const hex = (c) => parseInt(c.replace('#', ''), 16);
const INK = hex(TILE_COLORS.ink);
const CREAM = hex(TILE_COLORS.cream);
/** A refused swipe's direction on screen (y down). */
const DIRS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

const mixColor = (a, b, k) => {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
};

const whites = new WeakMap(); // texture → its white silhouette (null when it cannot be read back)
/** A white silhouette of a tile's texture (its alpha, filled white), built once: the muzzle flash, in normal blend. */
function whiteOf(tex) {
  if (!tex || tex === Texture.EMPTY) return null;
  if (whites.has(tex)) return whites.get(tex);
  let out = null;
  try {
    const r = tex.source.resolution ?? 1;
    const f = tex.frame;
    const c = document.createElement('canvas'); // the tile's size, so the flash scales with the tile
    c.width = Math.max(1, Math.round(f.width));
    c.height = Math.max(1, Math.round(f.height));
    const g = c.getContext('2d');
    g.drawImage(tex.source.resource, f.x * r, f.y * r, f.width * r, f.height * r, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    out = Texture.from(c);
  } catch {
    out = null; // no flash rather than an additive one
  }
  whites.set(tex, out);
  return out;
}

/** The classic and pixel tiles' progress: a 4-piece border, one piece per merge toward the next milestone. */
function drawMilestone(g, tier, U) {
  g.clear();
  const lit = milestonePieces(tier);
  if (lit < 0) return; // below 16 (no class yet) or an ultimate (nothing left to reach)
  const half = GRID.cell * U * 0.43;
  const inset = GRID.cell * U * 0.13;
  const w = 0.12 * U;
  // top, right, bottom, left: each piece runs along the middle of one edge
  const sides = [
    [-half + inset, -half, half - inset, -half],
    [half, -half + inset, half, half - inset],
    [half - inset, half, -half + inset, half],
    [-half, half - inset, -half, -half + inset],
  ];
  const goal = tier < 8 ? 0xffe27a : 0xffb3ff; // gold toward fusion, pink toward the ultimate
  sides.forEach(([x0, y0, x1, y1], i) => {
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w + 0.07 * U, color: 0x2a1c22, alpha: 0.85, cap: 'round' });
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: w, color: i < lit ? goal : 0xffffff, alpha: i < lit ? 1 : 0.22, cap: 'round' });
  });
}

/** The textures the blocks draw with (tests pass stand-ins). */
const TILE_TEXTURES = { softDot, sparkTex, blockTex, vfxTex, decor: tileDecor };

export function createBlocks(stage, fx, { art = null, tx = TILE_TEXTURES } = {}) {
  // under every block: the class glows, then the plaques' shadows in their pits and a lost block's
  // rubble, so they never darken a neighbour; over every block: the pick's brackets
  const glowLayer = new Container();
  const seatLayer = new Container();
  const layer = new Container();
  const pick = new Container(); // the pick: four corner brackets round the picked block's pit
  pick.visible = false;
  const corners = BRACKET_CORNERS.map(() => new Graphics());
  pick.addChild(...corners);
  stage.layers.tiles.addChild(glowLayer, seatLayer, layer, pick);
  const echoLayer = new Container(); // a leaping cub's afterimage, over the field
  stage.layers.shots.addChild(echoLayer);
  const seatCtx = new GraphicsContext(); // one plaque silhouette, shared by every shadow (redrawn per U)
  const views = new Map();
  const ghosts = [];
  const rubble = []; // { c, x, y, t }: a destroyed block's chips, dark in its pit
  const pending = new Map(); // tile id → what an event asked of a view that is not drawn yet (a merged block)
  let frame = 0; // a view drawn this frame carries it (views not stamped are gone from the board)
  const simRate = createSimRate(); // the game speed, so a wind-up lasts WIND_UP s of real time
  let lastMoves = -1;
  let slideT = 1;
  let time = 0;
  let selected = null; // tile id picked to show its range
  let armed = null; // tile id whose Sell / Break is armed (the inspect card)
  let nudgeDir = DIRS.left;
  let seatU = 0;
  let pickU = 0;
  let pickArmed = null;
  let lastEvent = null; // main.js hands tileHit and tileHeal over twice: a bit is made once
  let chapter = null; // the wave's chapter as last seen, and its skin's key
  let skinKey = 'forest';
  const scratch = {}; // reused: appearPose, departPose
  const shadow = {}; // reused: seatShadow
  let chargePen = null; // the context a legend's charge step is being drawn into
  const chargeContexts = new Map(); // step (negative: the classic and pixel frame) → its shared context
  let chargeCell = 0;
  const penLine = (x, y) => chargePen.lineTo(x, y);
  const penArc = (cx, cy, r, a0, a1) => chargePen.arc(cx, cy, r, a0, a1);

  function sprite(ax = 0.5, ay = ax) {
    const s = new Sprite();
    s.anchor.set(ax, ay);
    s.visible = false;
    return s;
  }

  function makeView() {
    const c = new Container(); // at its cell (it slides between cells)
    const p = new Container(); // the plaque and all on it: lift, drop, nudge, shudder, wobble, departures
    c.addChild(p);
    const glow = new Sprite(tx.softDot()); // normal blend: a tinted haze, at most TILE_GLOW.glow
    glow.anchor.set(0.5);
    glowLayer.addChild(glow);
    const seat = new Graphics(seatCtx); // the plaque's shadow in its pit
    seat.visible = false;
    seatLayer.addChild(seat);
    const body = sprite();
    body.visible = true;
    const motif = sprite(); // a den's altar
    const paws = sprite(); // the paw prints of its roaming pet
    const wipe = sprite(0, 0.5); // the meter's cream wipe
    wipe.texture = Texture.WHITE;
    wipe.tint = CREAM;
    const creature = sprite(0.5, 1); // it peeks over the bottom sill
    const sweat = sprite(); // a hit on a 32–128
    const nest = sprite(); // an egg nest's front
    const overlay = sprite(); // the pixel style's numeral and badges
    const badgeA = sprite();
    const badgeB = sprite();
    const loser = sprite(); // a colour override: the loser's badge slides out
    const number = sprite();
    const numberOld = sprite(); // a boss x2 under Reduce motion: the old numeral fades out
    const flash = sprite(); // the muzzle flash: a white silhouette of the plaque, normal blend
    flash.alpha = 0;
    const milestone = new Graphics(); // the classic and pixel tiles' 4-piece border
    const charge = new Graphics(); // a legend's charge (a shared step: chargeContext)
    charge.visible = false;
    p.addChild(body, motif, paws, wipe, creature, sweat, nest, overlay, badgeA, badgeB, loser, number, numberOld, flash, milestone, charge);
    layer.addChild(c);
    // wind: the wind-up (0–1); left/period: the sim's cooldown as last seen and its full length; pose/hop: reused each frame
    return {
      c,
      p,
      glow,
      seat,
      body,
      motif,
      paws,
      wipe,
      creature,
      sweat,
      nest,
      overlay,
      badgeA,
      badgeB,
      loser,
      number,
      numberOld,
      flash,
      milestone,
      charge,
      // what the textures were made for
      kTier: -1,
      kEl: null,
      kFu: null,
      kUlt: null,
      kStyle: null,
      kSkin: null,
      msKey: -1,
      glowTints: [],
      glowTint: -1,
      tint: 0xffffff,
      glowBig: 1.4,
      glowA: 0,
      sticker: false,
      den: false,
      legend: false,
      roams: false,
      baseTex: null,
      faces: null,
      spots: null,
      numTex: null,
      numTier: -1,
      numPx: 0,
      numCell: 0,
      numSqueeze: 1,
      crop: 0,
      maxW: Infinity,
      egg: false,
      // motion
      pop: 0,
      punch: 0,
      appear: 1,
      delay: 0,
      shown: true,
      fresh: false,
      lift: 0,
      nudge: 0,
      hurt: 0,
      hurtHold: 0,
      shudder: 0,
      healed: 0,
      biteX: 0,
      biteY: -1,
      bump: 0,
      flip: 0,
      flipFrom: null,
      wipeK: 0,
      wipeSeg: 0,
      wantWipe: false,
      hatch: -1,
      shells: false,
      loserK: -1,
      denWait: 0,
      pawsA: 0,
      blinkAt: 0,
      blinkN: 0,
      chargeQ: -1,
      chargeU: 0,
      frame: 0,
      wind: 0,
      follow: 0,
      left: 0,
      period: Infinity,
      aim: { x: 0, y: 1 },
      pose: {},
      hop: {},
      leap: null,
      echo: null,
      cracks: null,
    };
  }

  const dropView = (v) => {
    v.c.destroy({ children: true });
    v.glow.destroy();
    v.seat.destroy();
    v.echo?.destroy();
  };
  /** A view whose tile was not drawn this frame has left the board (not by an event: a reset run, a debug clear). */
  const dropStale = (v, id) => {
    if (v.frame === frame) return;
    dropView(v);
    views.delete(id);
  };

  /**
   * The creature's pose for its attack's stage: the wind-up rises before a shot (WIND_UP s of real
   * time at any game speed, from the sim's cooldown: defense.cooldownLeft, read only) and settles
   * if no shot comes; the follow-through falls after a shot. None under Reduce motion. → petPose or null
   */
  function windUp(v, t, run, dt, reduced, rate) {
    if (reduced || !t.cls.element || t.tier < 4) {
      v.wind = v.follow = 0;
      return null;
    }
    const left = run.defense.cooldownLeft?.(t.id) ?? 0;
    if (left > v.left + 1e-6) v.period = left; // a shot just reset it: its full length
    v.left = left;
    const want = windUpAt(left, rate, v.period);
    v.wind = want >= v.wind ? want : Math.max(0, v.wind - dt / 0.1);
    v.follow = Math.max(0, v.follow - dt / FOLLOW);
    return petPose(ladderStage(t.tier), smooth(v.wind), v.follow, v.aim, v.pose);
  }

  /** The tile's textures, when its tier, class, style or chapter skin changed. */
  function look(v, t, useArt, skinKey) {
    const wasDen = v.den;
    v.kTier = t.tier;
    v.kEl = t.cls.element;
    v.kFu = t.cls.fusion;
    v.kUlt = t.cls.ultimate;
    v.kStyle = useArt ? art.style : 'classic';
    v.kSkin = skinKey;
    v.den = isDen(t);
    v.legend = !!t.cls.ultimate;
    v.msKey = -1;
    v.numTier = -1;
    v.wipe.visible = v.loser.visible = v.sweat.visible = false;
    // the class glow: its colours (a fusion's own; a legend's three take turns), size and strength
    const els = t.tier >= 4 ? [t.cls.element, t.cls.fusion, t.cls.ultimate].filter(Boolean) : [];
    const fu = els.length === 2 ? fusionOf(t.cls) : null;
    v.glowTints = els.map((el) => hex(fu ? fu.color : ELEMENTS[el].color));
    v.glowBig = els.length === 3 ? 1.9 : els.length === 2 ? 1.6 : 1.4;
    // with creature art the glow is a whisper: colour and shape carry the class
    // photosafe: at most TILE_GLOW.glow, so a legend's colours taking turns stay below the threshold
    v.glowA = Math.min(TILE_GLOW.glow, (els.length === 3 ? 0.6 : els.length === 2 ? 0.42 : 0.26) * (useArt ? 0.3 : 1));
    if (useArt) {
      const a = art.tile(t);
      v.sticker = !!a.plaque;
      v.body.texture = a.plate;
      v.motif.texture = a.motif ?? Texture.EMPTY;
      v.motif.visible = !!a.motif;
      v.paws.texture = a.motif && art.paws ? art.paws() : Texture.EMPTY;
      v.overlay.texture = a.overlay ?? Texture.EMPTY;
      v.overlay.visible = !!a.overlay;
      v.baseTex = a.creature ?? Texture.EMPTY;
      v.creature.texture = v.baseTex;
      v.creature.visible = !!a.creature;
      v.faces = a.faces ?? null;
      v.nest.texture = a.nestFront ?? Texture.EMPTY;
      v.nest.visible = !!a.nestFront;
      v.crop = a.crop;
      v.maxW = a.maxW ?? Infinity;
      v.egg = a.egg;
      v.spots = a.badges ?? null;
      const [s0, s1] = v.spots ?? [];
      v.badgeA.visible = !!s0;
      v.badgeB.visible = !!s1;
      if (s0) v.badgeA.texture = art.badge(s0.el, s0.el2); // a den's is split between its two elements
      if (s1) v.badgeB.texture = art.badge(s1.el);
      v.number.visible = v.sticker;
    } else {
      v.sticker = false;
      v.body.texture = tx.blockTex(t.tier, t.cls);
      for (const s of [v.motif, v.paws, v.overlay, v.creature, v.nest, v.badgeA, v.badgeB, v.number, v.sweat]) s.visible = false;
      v.faces = null;
      v.spots = null;
    }
    v.flash.texture = whiteOf(v.body.texture) ?? Texture.EMPTY; // the same size as the tile's: it scales with it
    v.seat.visible = v.sticker;
    if (!v.sticker) v.milestone.visible = true;
    else {
      v.milestone.clear();
      v.milestone.visible = false;
    }
    // a block that just became a den in a run without roaming pets: its altar shows after a moment
    if (v.den && !wasDen && !t.roam) v.denWait = 0.4;
  }

  /** Book `lit` world units² for `life` s (from `delay` s on) in the light budget, whole or not at all. */
  const book = (lit, life, delay = 0) => fx.flashAll(lit, life, delay);

  /** Two sand puffs at the groove as a block drops into its pit. */
  function puffs(t) {
    const size = 0.2;
    const grow = 0.25;
    if (!book(2 * (size + grow) ** 2 * DOT.share, 0.3)) return;
    for (const s of [-1, 1]) fx.particle(tx.softDot(), t.x + s * 0.72, t.y - 0.84, { vx: s * 0.9, vy: 0.35, life: 0.3, size, grow, alpha: 0.5, color: hex(TILE_COLORS.sand) });
  }

  /** Six chips fly from a block that breaks: its clay (destroyed) or sand (broken). */
  function chips(x, y, color) {
    if (!book(6 * spriteLit(0.16, 0.16, 1), 0.5)) return;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const sp = 2.4 + 0.8 * ((i * 7) % 3) / 2;
      fx.particle(tx.decor('chip'), x + Math.cos(a) * 0.36, y + Math.sin(a) * 0.25, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 + 2.2, gravity: -11, life: 0.45 + 0.05 * (i % 2), size: 0.16, color, spin: (i % 2 ? 1 : -1) * 7, rot: i });
    }
  }

  /** An egg's two shell halves fly up and out as it hatches (under Reduce motion they fade in place): booked at the hatch (bookShells). */
  function shells(t, reduced) {
    for (const s of [-1, 1]) {
      const o = reduced ? {} : { vx: s * 1.6, vy: 3.2, gravity: -14, spin: s * 5 };
      fx.particle(tx.decor(s < 0 ? 'shellL' : 'shellR'), t.x + s * 0.4, t.y - 0.1, { life: reduced ? 0.35 : SHELL_LIFE, size: 0.32, ...o });
    }
  }

  /** Nature's repair: three leaves fall onto the block. */
  function leaves(e) {
    if (!book(3 * spriteLit(0.28, 0.28, 0.95), 0.5)) return;
    const leaf = tx.vfxTex('nature', 'leaf');
    [
      [-0.56, 1.1, -0.4],
      [0.16, 1.24, 0.5],
      [0.6, 1.0, 0.1],
    ].forEach(([x, y, rot], i) => fx.particle(leaf, e.x + x, e.y + y, { vy: -2, life: 0.5, size: 0.28, rot, spin: i % 2 ? 1.5 : -1.5 }));
  }

  /** A destroyed block's rubble: five dark chips left in its pit (dark on dark: below the flash threshold). */
  function leaveRubble(x, y, seed) {
    let r = rubble.find((o) => !o.c.visible);
    if (!r) {
      const c = new Container();
      for (let i = 0; i < 5; i++) {
        const s = new Sprite(tx.decor('chip'));
        s.anchor.set(0.5);
        c.addChild(s);
      }
      seatLayer.addChild(c);
      r = { c, x: 0, y: 0, t: 0 };
      rubble.push(r);
    }
    Object.assign(r, { x, y, t: 0, seed });
    r.c.visible = true;
    const dark = hex(tone(skinFor(art?.skin ?? 'forest').pit, -0.25));
    r.c.alpha = 0;
    r.c.children.forEach((s, i) => {
      s.tint = dark;
      s.rotation = seed + i * 1.3;
    });
  }

  function updateRubble(dt, cell) {
    for (let k = 0; k < rubble.length; k++) {
      const r = rubble[k];
      if (!r.c.visible) continue;
      r.t += dt;
      const end = RUBBLE.rise + RUBBLE.hold + RUBBLE.fall;
      if (r.t >= end) {
        r.c.visible = false;
        continue;
      }
      r.c.alpha = RUBBLE.alpha * (r.t < RUBBLE.rise ? r.t / RUBBLE.rise : r.t < RUBBLE.rise + RUBBLE.hold ? 1 : 1 - (r.t - RUBBLE.rise - RUBBLE.hold) / RUBBLE.fall);
      r.c.position.set(stage.sx(r.x), stage.sy(r.y));
      for (let i = 0; i < r.c.children.length; i++) {
        const s = r.c.children[i];
        const a = (i / 5) * Math.PI * 2 + 0.9 + r.seed;
        s.position.set(Math.cos(a) * 0.17 * cell, Math.sin(a) * 0.13 * cell + 0.08 * cell);
        s.scale.set((0.08 * cell) / Math.max(1, s.texture.width));
      }
    }
  }

  /** The cracks of a destroyed block, from the side its last bite came from. */
  function crack(v, cell) {
    if (!book(0.1, 0.25)) return null;
    const g = new Graphics();
    const turn = Math.atan2(v.biteY, v.biteX) - Math.atan2(-0.05, -0.1);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    for (const line of CRACKS) {
      line.forEach(([x, y], i) => {
        const px = (x * cos - y * sin) * cell;
        const py = (x * sin + y * cos) * cell;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
    }
    g.stroke({ width: 0.022 * cell, color: INK, cap: 'round', join: 'round' });
    v.p.addChild(g);
    return g;
  }

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const cell = GRID.cell * U;
    const reduced = stage.reduced;
    const grid = run.grid;
    if (grid.moves !== lastMoves) {
      lastMoves = grid.moves;
      slideT = 0;
    }
    slideT = Math.min(1, slideT + dt / SLIDE);
    const e = ease(slideT);
    const rate = simRate.update(run.time ?? 0, dt);
    // a den's altar is in the keep's stone: the chapter's skin
    if (run.wave?.chapter !== chapter) {
      chapter = run.wave?.chapter;
      skinKey = chapterKeyFor(chapter);
    }
    if (art && art.skin !== skinKey) art.setSkin?.(skinKey);
    if (seatU !== U) {
      seatU = U;
      const h = (PLAQUE.size / 2) * cell;
      seatCtx.clear().roundRect(-h, -h, 2 * h, 2 * h, PLAQUE.r * cell).fill({ color: INK });
    }
    // the numeral is drawn for its size on screen (device px per cell, in steps of 16)
    const numPx = Math.max(32, Math.ceil((cell * (stage.app?.renderer?.resolution ?? 1)) / 16) * 16);
    const useArt = !!art && art.style !== 'classic';
    frame += 1;

    const tiles = run.tiles;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let v = views.get(t.id);
      if (!v) {
        v = makeView();
        views.set(t.id, v);
        // new this move: wait for the slide; a spawned block then drops in, a merged one pops
        v.fresh = t.bornAt === grid.moves && lastMoves > 0;
        const merged = !!t.mergedFrom;
        v.appear = v.fresh ? 0 : 1;
        v.delay = v.fresh || merged ? SLIDE * 0.9 : 0;
        v.shown = v.delay <= 0;
        if (merged) v.pop = 1;
        v.wantWipe = merged; // the meter gains its segment (once its look is known, below)
        v.blinkAt = time + blinkGap(t.id, 0);
        const ask = pending.get(t.id);
        if (ask) {
          pending.delete(t.id);
          if (ask.hatch) {
            v.hatch = 0;
            v.shells = ask.shells;
          }
          if (ask.loser) setLoser(v, ask.loser, reduced);
        }
      }
      const style = useArt ? art.style : 'classic';
      const skin = useArt && isDen(t) ? skinKey : '';
      if (t.tier !== v.kTier || t.cls.element !== v.kEl || t.cls.fusion !== v.kFu || t.cls.ultimate !== v.kUlt || style !== v.kStyle || skin !== v.kSkin) look(v, t, useArt, skin);
      if (v.wantWipe) {
        v.wantWipe = false;
        startWipe(v, t.tier, Math.max(0, v.delay));
      }
      v.roams = !!t.roam;
      v.frame = frame;

      // position: slide from the previous cell
      const fx0 = cellX(t.fromCol);
      const fy0 = cellY(t.fromRow);
      v.c.position.set(stage.sx(fx0 + (t.x - fx0) * e), stage.sy(fy0 + (t.y - fy0) * e));
      v.glow.position.copyFrom(v.c.position);

      // timers. Siege: a hit holds its red while hits keep coming and then fades (photosafe: no
      // blinking with every hit); a repair tints green below the flash threshold
      if (v.hurtHold > 0) v.hurtHold -= dt;
      else v.hurt = Math.max(0, v.hurt - dt * HIT_TINT.decay);
      v.shudder = Math.max(0, v.shudder - dt * 4);
      v.healed = Math.max(0, v.healed - dt * 3);
      if (v.delay > 0) {
        v.delay -= dt;
        if (v.delay <= 0) {
          v.shown = true;
          if (v.fresh && !reduced) puffs(t);
        }
      } else v.appear = Math.min(1, v.appear + dt / 0.12);
      if (v.shown) {
        v.pop = Math.max(0, v.pop - dt * 4);
        if (v.hatch >= 0) {
          // an egg hatched (8 + 8 → 16): its shell flies off as the hatchling pops up from the sill
          if (v.hatch === 0 && v.creature.visible && v.shells) shells(t, reduced);
          v.hatch = v.hatch >= 1 ? -1 : Math.max(1e-6, Math.min(1, v.hatch + dt / HATCH));
        }
        v.wipeK = Math.max(0, v.wipeK - dt / WIPE);
        if (v.loserK >= 0) v.loserK = v.loserK >= 1 ? -1 : Math.min(1, v.loserK + dt / SWAP);
      }
      v.punch = Math.max(0, v.punch - dt * 9);
      v.bump = Math.max(0, v.bump - dt * 10);
      v.nudge = Math.max(0, v.nudge - dt / PLAQUE.nudge.time);
      v.flip = Math.max(0, v.flip - dt / FLIP);
      const target = t.id === selected || t.id === armed ? PLAQUE.lift : 0;
      v.lift += (target - v.lift) * Math.min(1, dt * 16);

      // the plaque and all on it: seated, lifted when picked, dropping in when new, nudged by a
      // refused swipe, shuddering when hit, wobbling while armed
      const popS = 1 + Math.sin(v.pop * Math.PI) * 0.18;
      let dy = -v.lift;
      let sc = popS;
      let alpha = v.shown ? 1 : 0;
      let drop = 0;
      if (v.shown && v.appear < 1) {
        appearPose(v.appear, reduced, scratch);
        dy += scratch.dy;
        drop = -scratch.dy;
        sc *= scratch.scale;
        alpha = scratch.alpha;
      }
      const n = nudgeAt(v.nudge, reduced);
      const dx = shudderAt(time, t.id, v.shudder, reduced) + n * nudgeDir.x;
      dy += n * nudgeDir.y;
      v.p.position.set(dx * cell, dy * cell);
      v.p.scale.set(sc);
      v.p.alpha = alpha;
      v.p.rotation = t.id === armed ? wobbleAt(time, reduced) : 0;

      // its shadow, cast inside the pit: longer while the plaque is lifted (picked, or dropping in)
      if (v.sticker) seatAt(v, v.lift + drop, cell, alpha);

      const tint = v.hurt > 0.02 ? mixColor(0xffffff, 0xff6a6a, v.hurt) : v.healed > 0.02 ? mixColor(0xffffff, 0x8dff9d, v.healed * TILE_GLOW.heal) : 0xffffff; // the heal's green stays below the flash threshold
      if (tint !== v.tint) {
        // the plaque, not the creature (set only when it changes: a tint is normalised on every set)
        v.tint = tint;
        v.body.tint = tint;
        v.motif.tint = tint;
      }
      const base = cell / (v.body.texture.width || BLOCK_PX);
      const sx = base * (1 + v.punch * 0.07);
      const sy = sx * (1 - v.punch * 0.05);
      v.body.scale.set(sx, sy);
      v.flash.scale.copyFrom(v.body.scale);
      v.flash.alpha = v.punch * TILE_GLOW.muzzle; // the muzzle flash stays below the flash threshold
      v.flash.visible = v.punch > 0;
      if (v.overlay.visible) v.overlay.scale.copyFrom(v.body.scale);
      if (v.nest.visible) v.nest.scale.copyFrom(v.body.scale);

      if (v.sticker) {
        stickerParts(v, t, cell, numPx, reduced, 1 + v.punch * 0.07, 1 - v.punch * 0.05);
        if (v.den) denParts(v, t, cell, reduced, dt, sx, sy, !!run.roaming);
      } else {
        // the classic and pixel tiles: the 4-piece border, one piece per merge toward the next milestone.
        // 16 → 32 → 64 → 128 → 256 (fusion), then 512 → 1024 → 2048 → 4096 (ultimate)
        const msKey = t.tier * 1e6 + Math.round(U * 10);
        if (msKey !== v.msKey) {
          v.msKey = msKey;
          drawMilestone(v.milestone, t.tier, U);
        }
      }

      if (v.creature.visible) creatureAt(v, t, run, dt, reduced, rate, cell, U);

      // class glow: a soft dot in the class colour under the tile (a legend's colours take turns)
      const tints = v.glowTints;
      if (tints.length) {
        v.glow.visible = v.shown;
        const glowTint = tints[Math.floor(time * 1.5) % tints.length];
        if (glowTint !== v.glowTint) v.glow.tint = v.glowTint = glowTint;
        v.glow.width = v.glow.height = cell * v.glowBig * popS * (1 + 0.06 * Math.sin(time * 4 + t.id));
        v.glow.alpha = v.glowA;
      } else v.glow.visible = false;

      // a legend's signature charge: its frame fills with cream, clockwise from the top
      chargeAt(v, t, run, cell);
    }

    views.forEach(dropStale);

    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      g.t += dt;
      if (g.depart) {
        // a block leaving: sold lifts out of its pit, destroyed and broken drop into it and crumble
        const d = departPose(g.depart, Math.min(1, g.t / DEPART_TIME), reduced, scratch);
        g.v.c.position.set(stage.sx(g.x0), stage.sy(g.y0));
        g.v.p.position.set(0, (d.dy - g.lift) * cell);
        g.v.p.scale.set(d.scale);
        g.v.p.alpha = d.alpha;
        g.v.p.rotation = 0;
        if (g.v.sticker) seatAt(g.v, g.lift, cell, d.alpha);
        if (g.v.cracks) g.v.cracks.alpha = d.cracks;
        if (g.t >= DEPART_TIME) {
          dropView(g.v);
          ghosts.splice(i, 1);
        }
        continue;
      }
      const k = ease(Math.min(1, g.t / SLIDE));
      g.v.c.position.set(stage.sx(g.x0 + (g.x1 - g.x0) * k), stage.sy(g.y0 + (g.y1 - g.y0) * k));
      if (g.v.sticker) seatAt(g.v, 0, cell, 1);
      if (g.t >= SLIDE) {
        dropView(g.v);
        ghosts.splice(i, 1);
      }
    }

    updateRubble(dt, cell);
    pickAt(cell, reduced);
  }

  /**
   * The meter's new segment lights with a cream wipe (not under Reduce motion), `delay` s from now:
   * it books one segment's area (world units²: a cell is GRID.cell wide), whole or not at all.
   */
  function startWipe(v, tier, delay = 0) {
    const lit = meterOf(tier)?.lit ?? 0;
    if (lit < 1 || stage.reduced || !v.sticker) return;
    const seg = METER.segs[lit - 1];
    if (!book((seg.x1 - seg.x0) * (METER.y1 - METER.y0) * GRID.cell * GRID.cell, WIPE, delay)) return;
    v.wipeSeg = lit - 1;
    v.wipeK = 1;
  }

  /** The plaque's shadow in its pit, `lift` cells up (picked, dropping in, lifting out). */
  function seatAt(v, lift, cell, alpha) {
    const sh = seatShadow(lift, shadow);
    v.seat.visible = alpha > 0;
    v.seat.position.set(v.c.position.x + ((sh.x0 + sh.x1) / 2) * cell, v.c.position.y + ((sh.y0 + sh.y1) / 2) * cell);
    v.seat.scale.set((sh.x1 - sh.x0) / PLAQUE.size, (sh.y1 - sh.y0) / PLAQUE.size);
    v.seat.alpha = sh.alpha * alpha;
  }

  /** The sticker tile's numeral, badges and the meter's wipe; `px`, `py`: the shot's punch. */
  function stickerParts(v, t, cell, numPx, reduced, px, py) {
    if (v.numTier !== t.tier || v.numPx !== numPx || v.numCell !== cell) {
      // never under its 14 px floor, squeezed across when the floor makes it too wide (numberFit)
      const fit = numberFit(t.tier, cell);
      v.numTier = t.tier;
      v.numPx = numPx;
      v.numCell = cell;
      v.numSqueeze = fit.squeeze;
      v.numTex = art.number(t.tier, numPx, fit.em);
    }
    const ns = cell / numPx;
    const k = 1 - v.flip; // a boss x2: the numeral flips like a card (under Reduce motion it cross-fades)
    const num = v.number;
    num.position.set(0, (PLAQUE.numberY - 0.5) * cell);
    num.scale.set(ns * px * v.numSqueeze, ns * px * py);
    num.alpha = 1;
    v.numberOld.visible = false;
    if (v.flip > 0 && v.flipFrom) {
      if (reduced) {
        num.texture = v.numTex;
        num.alpha = k;
        v.numberOld.visible = true;
        v.numberOld.texture = v.flipFrom;
        v.numberOld.alpha = 1 - k;
        v.numberOld.position.copyFrom(num.position);
        v.numberOld.scale.copyFrom(num.scale);
      } else {
        num.texture = k < 0.5 ? v.flipFrom : v.numTex;
        num.scale.x *= Math.abs(Math.cos(Math.PI * k));
      }
    } else if (num.texture !== v.numTex) num.texture = v.numTex;

    // the glyph badges: the collar tag bumps on a shot; a colour override slides the loser's out
    const s0 = v.spots?.[0];
    const s1 = v.spots?.[1];
    if (s0) badgeAt(v.badgeA, s0, cell, 1 + 0.2 * v.bump);
    if (s1) badgeAt(v.badgeB, s1, cell, 1);
    v.loser.visible = v.loserK >= 0 && !!s0 && !s1;
    if (v.loser.visible) {
      const kk = ease(v.loserK);
      badgeAt(v.loser, s0, cell, 1);
      if (!reduced) v.loser.position.set((s0.x + 0.16 * kk) * cell, (s0.y - 0.05 * kk) * cell);
      v.loser.alpha = 1 - kk;
    }

    // the meter's new segment lights with a cream wipe
    v.wipe.visible = v.wipeK > 0 && v.shown;
    if (v.wipe.visible) {
      const seg = METER.segs[v.wipeSeg];
      const kk = 1 - v.wipeK;
      v.wipe.position.set(seg.x0 * cell, ((METER.y0 + METER.y1) / 2) * cell);
      v.wipe.width = Math.max(0.001, (seg.x1 - seg.x0) * cell * ease(Math.min(1, kk * 2)));
      v.wipe.height = (METER.y1 - METER.y0) * cell;
      v.wipe.alpha = 0.85 * (1 - kk);
    }
  }

  function badgeAt(s, spot, cell, k) {
    s.position.set(spot.x * cell, spot.y * cell);
    s.scale.set(((2.35 * spot.r * cell) / Math.max(1, s.texture.width, s.texture.height)) * k);
  }

  /**
   * A den: its altar rises as the pet hops out (sim/roam.js hatch), then the pet's paw prints lead
   * off it. In a run whose pets roam, a new den waits for its pet (a die card can hold the sim, and
   * with it the pet, for as long as the player reads it); in one whose pets stay, it shows after a
   * moment.
   */
  function denParts(v, t, cell, reduced, dt, sx, sy, roaming) {
    let k = 1;
    if (t.roam) {
      k = t.roam.hatch;
      v.denWait = 0;
    } else if (roaming) k = 0;
    else if (v.denWait > 0) {
      v.denWait -= dt;
      k = 0;
    }
    v.motif.scale.set(sx, sy);
    v.motif.alpha = k;
    v.motif.position.set(0, reduced ? 0 : (1 - ease(k)) * PLAQUE.altar.rise * PLAQUE.size * cell);
    const out = !!t.roam && t.roam.hatch >= 1 && cell >= PAW_MIN_PX;
    v.pawsA = out ? Math.min(1, v.pawsA + dt * 4) : 0;
    v.paws.visible = v.pawsA > 0;
    if (v.paws.visible) {
      v.paws.scale.set(sx, sy);
      v.paws.alpha = v.pawsA;
    }
  }

  /** The creature: its bob, the attack's wind-up and follow-through, the leap; a hit's face; the blink. */
  function creatureAt(v, t, run, dt, reduced, rate, cell, U) {
    // the face: a 16's scared edit while hurt, its blink edit for 0.12 s every 3–6 s; 32–128 sweat
    let tex = v.baseTex;
    const scared = v.hurt > 0.3;
    if (v.faces) {
      if (time >= v.blinkAt + BLINK) {
        v.blinkN += 1;
        v.blinkAt = time + blinkGap(t.id, v.blinkN);
      }
      if (scared && v.faces.scared) tex = v.faces.scared;
      else if (time >= v.blinkAt && v.faces.blink) tex = v.faces.blink;
    }
    if (v.creature.texture !== tex) v.creature.texture = tex;
    v.sweat.visible = v.sticker && scared && !v.egg && !v.faces?.scared;
    // babies bob fast and squashy, bigger ones slower (motion by stage, style brief)
    const ct = v.baseTex;
    const cs = Math.min((cell * v.crop) / (ct.height || 1), (cell * v.maxW) / (ct.width || 1)); // wide pets (orca, snake) are capped by width
    const stageN = Math.max(0, t.tier - 4);
    const w = v.egg ? 3 : stageN < 2 ? 8.4 : 6;
    const amp = v.egg ? 0 : stageN < 2 ? 0.05 : 0.035;
    const ph = Math.sin(time * w + t.id * 1.7);
    const squash = Math.sin(v.pop * Math.PI) * 0.22 + v.punch * 0.08;
    v.creature.scale.set(cs * (1 - amp * 0.6 * ph + squash * 0.5), cs * (1 + amp * ph - squash));
    let foot = 0.43 - (v.egg && v.sticker ? PLAQUE.eggLift : 0); // an egg sits up in its nest
    if (v.hatch >= 0 && !reduced) foot += 0.16 * (1 - ease(v.hatch)); // the hatchling pops up from the sill
    v.creature.position.set(0, cell * foot);
    if (v.egg) {
      // eggs wobble; the 8 shakes in bursts; a hit makes any egg wobble harder (not under Reduce motion)
      const hard = t.tier >= 3 || (scared && !reduced);
      v.creature.rotation = Math.sin(time * (hard ? 9 : 2.4) + t.id) * (hard ? 0.06 : 0.03) * (scared && !reduced ? 1 : t.tier >= 3 && Math.sin(time * 0.9 + t.id) > 0.4 ? 1 : 0.4);
    } else v.creature.rotation = 0;
    if (v.sweat.visible) {
      if (v.sweat.texture === Texture.EMPTY) v.sweat.texture = tx.decor('sweat');
      v.sweat.position.set(0.27 * cell, (0.43 - v.crop * 0.62) * cell);
      v.sweat.scale.set((0.1 * cell) / Math.max(1, v.sweat.texture.height));
    }
    // the attack's wind-up and follow-through (cells)
    const pose = v.egg ? null : windUp(v, t, run, dt, reduced, rate);
    if (pose) {
      v.creature.scale.x *= pose.sx;
      v.creature.scale.y *= pose.sy;
      v.creature.position.x += pose.x * cell;
      v.creature.position.y -= pose.y * cell;
      v.creature.rotation += pose.rot;
    }
    // Pride Pounce: the cub leaps onto its prey and bounds back; from 32 its afterimage follows
    const L = v.leap ? leapAt(time - v.leap.t0, v.hop) : null;
    if (L) {
      v.creature.position.x += v.leap.dx * L.k * U;
      v.creature.position.y -= (v.leap.dy * L.k + L.lift) * U;
    } else v.leap = null;
    const step = L && t.cls.element === 'metal' ? LADDER.metal[ladderStage(t.tier)] : null;
    const n = step && has(step, 'ghosts') ? step.ghosts : 0;
    if (n || v.echo) {
      v.echo ??= createAfterimage(echoLayer, 3);
      const k = v.p.scale.x;
      v.echo.push(dt, v.c.position.x + v.p.position.x + v.creature.position.x * k, v.c.position.y + v.p.position.y + v.creature.position.y * k, v.creature.scale.x * k, v.creature.scale.y * k, v.creature.rotation);
      v.echo.draw(n, v.creature.texture, 0xffffff, 0.5, 1);
    }
  }

  /**
   * A legend's charge: a cream stroke on its frame from the top centre clockwise, in CHARGE_STEPS
   * steps. Each step is one shared GraphicsContext (built once per cell size and frame shape), so a
   * charging legend swaps a context instead of rebuilding its path every frame.
   */
  function chargeAt(v, t, run, cell) {
    if (!(t.cls.ultimate && t.prof?.signature)) {
      if (v.chargeQ !== -1) {
        v.charge.visible = false;
        v.chargeQ = -1;
      }
      return;
    }
    const q = Math.round(Math.min(1, run.defense.sigCharge(t.id) / t.prof.signature.period) * CHARGE_STEPS);
    if (q === v.chargeQ && cell === v.chargeU) return;
    v.chargeQ = q;
    v.chargeU = cell;
    v.charge.visible = q > 0;
    if (q > 0) v.charge.context = chargeContext(q, cell, v.sticker);
  }

  function chargeContext(q, cell, sticker) {
    if (chargeCell !== cell) {
      chargeContexts.clear(); // a new size (not destroyed: a departing legend may still draw its last step)
      chargeCell = cell;
    }
    const key = sticker ? q : -q;
    let ctx = chargeContexts.get(key);
    if (!ctx) {
      ctx = new GraphicsContext();
      const h = ((sticker ? PLAQUE.size : 0.9) / 2) * cell;
      const r = (sticker ? PLAQUE.r : 0.1625) * cell; // the classic and pixel plates: 0.9 cell, radius 26 / 160
      chargePen = ctx;
      ctx.moveTo(0, -h);
      walkRoundRect(h, r, q / CHARGE_STEPS, penLine, penArc);
      ctx.stroke({ width: PLAQUE.charge * cell, color: CREAM, cap: 'butt', join: 'round' });
      chargePen = null;
      chargeContexts.set(key, ctx);
    }
    return ctx;
  }

  /** The pick's brackets round the picked (or armed) block's pit; their gap breathes, still under Reduce motion. */
  function pickAt(cell, reduced) {
    const id = armed ?? selected;
    const v = id != null ? views.get(id) : null;
    pick.visible = !!v && v.shown;
    if (!pick.visible) return;
    const isArmed = id === armed;
    if (pickU !== cell || pickArmed !== isArmed) {
      pickU = cell;
      pickArmed = isArmed;
      for (let i = 0; i < 4; i++) drawBracket(corners[i], BRACKET_CORNERS[i][0], BRACKET_CORNERS[i][1], cell, isArmed);
    }
    pick.position.copyFrom(v.c.position);
    const c = (PLAQUE.pit / 2 + bracketOffset(time, reduced)) * cell;
    for (let i = 0; i < 4; i++) corners[i].position.set(BRACKET_CORNERS[i][0] * c, BRACKET_CORNERS[i][1] * c);
  }

  /** A colour override: the loser's badge slides out of the collar slot and fades; the winner's bumps. */
  function setLoser(v, el, reduced) {
    if (!art?.badge) return;
    v.loser.texture = art.badge(el);
    v.loserK = 0;
    if (!reduced) v.bump = 1;
  }

  function onEvent(e) {
    if (e === lastEvent) return; // the same event handed over again (main.js: tileHit, tileHeal)
    lastEvent = e;
    const reduced = stage.reduced;
    if (e.type === 'merge') {
      for (const id of e.from) {
        const v = views.get(id);
        if (!v) continue;
        views.delete(id);
        v.glow.visible = false;
        const x0 = (v.c.position.x - stage.view.ox) / stage.view.U;
        const y0 = (stage.view.oy - v.c.position.y) / stage.view.U;
        ghosts.push({ v, x0, y0, x1: e.x, y1: e.y, t: 0 });
      }
    } else if (e.type === 'fire') {
      const v = views.get(e.id);
      if (v && !v.roams) {
        // a den's pet fires from the field: the den itself stays still
        v.punch = 1;
        v.wind = 0;
        v.follow = 1;
        if (!reduced) v.bump = 1;
        if (e.target) {
          const dx = e.target.x - e.x;
          const dy = e.target.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          v.aim.x = dx / d;
          v.aim.y = dy / d;
          if (e.pattern === 'pounce' && v.creature.visible && !v.egg && !reduced) v.leap = { t0: time, dx, dy };
        }
      }
      if (e.target) {
        const dx = e.target.x - e.x;
        const dy = e.target.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        // the muzzle spark takes from the light budget (many turrets fire at once)
        if (fx.flashAll(BURST.spark * 0.36, 0.12)) fx.particle(tx.sparkTex(), e.x + (dx / d) * 0.75, e.y + (dy / d) * 0.75, { life: 0.12, size: 0.6, grow: -0.3, color: e.colors.at(-1) });
      }
    } else if (e.type === 'remove') {
      // sold: the block lifts out of its pit in a puff of gold; destroyed: it cracks from the bite,
      // drops into the pit and crumbles, leaving rubble (main.js adds the blast); broken: it crumbles in sand
      const v = views.get(e.id);
      const cell = GRID.cell * stage.view.U;
      const d = departPose(e.reason, 0, reduced, scratch);
      if (v) {
        views.delete(e.id);
        v.glow.visible = false;
        if (d.kind === 'destroyed') v.cracks = crack(v, cell);
        ghosts.push({ v, x0: e.x, y0: e.y, x1: e.x, y1: e.y, t: 0, depart: e.reason, lift: v.lift });
      }
      if (d.kind === 'sold') fx.burst(e.x, e.y, [0xffd34a, 0xffffff, 0xe89a16], 18, { speed: 4, size: 0.24, life: 0.45, gravity: -6 });
      else {
        if (!reduced) chips(e.x, e.y, hex(d.kind === 'destroyed' ? plateColor(e) : TILE_COLORS.sandChip));
        if (d.kind === 'destroyed') leaveRubble(e.x, e.y, (e.id % 7) * 0.9);
      }
    } else if (e.type === 'tileHit') {
      const v = views.get(e.id);
      if (v) {
        v.hurt = 1;
        v.hurtHold = HIT_TINT.hold;
        v.shudder = reduced ? 0 : 1;
        if (e.from) {
          const bx = e.from.x - e.x;
          const by = e.y - e.from.y; // screen y runs down
          const d = Math.hypot(bx, by) || 1;
          v.biteX = bx / d;
          v.biteY = by / d;
        }
      }
    } else if (e.type === 'tileHeal') {
      const v = views.get(e.id);
      if (v) {
        v.healed = 1;
        if (!reduced) leaves(e);
      }
    } else if (e.type === 'classed') {
      // an egg hatched: its shell's light is booked now, before the announcement's ring and burst
      // (main.js), from when the hatchling shows (a merged block: after the slide)
      const v = views.get(e.tileId);
      const shellsOk = e.stage === 1 && book(SHELL_LIT, SHELL_LIFE + 0.05, v ? 0 : SLIDE * 0.75);
      if (v) {
        v.pop = 1;
        if (e.stage === 1) {
          v.hatch = 0;
          v.shells = shellsOk;
        }
      } else if (e.stage === 1) pending.set(e.tileId, { ...pending.get(e.tileId), hatch: true, shells: shellsOk }); // a merged block, drawn from the next frame
    } else if (e.type === 'promote') {
      const v = views.get(e.id);
      if (v) {
        v.pop = 1;
        if (v.sticker && v.numTex) {
          v.flip = 1;
          v.flipFrom = v.numTex;
        }
        startWipe(v, e.tier);
      }
    } else if (e.type === 'override') {
      const v = views.get(e.tileId);
      if (v) setLoser(v, e.loser, reduced);
      else pending.set(e.tileId, { ...pending.get(e.tileId), loser: e.loser });
    }
  }

  function reset() {
    for (const v of views.values()) dropView(v);
    views.clear();
    for (const g of ghosts) dropView(g.v);
    ghosts.length = 0;
    for (const r of rubble) r.c.visible = false;
    pending.clear();
    lastMoves = -1;
    armed = null;
    pick.visible = false;
  }

  return {
    sync,
    onEvent,
    reset,
    /** Rebuild every block's textures (the art style changed). */
    refresh() {
      for (const v of views.values()) v.kStyle = null;
    },
    /** Highlight one tile (or null) as picked: cream corner brackets round its pit, the plaque lifted. */
    select(id) {
      selected = id;
      if (id == null || armed !== id) armed = null;
    },
    /** The picked tile's Sell / Break is armed (or no longer): its brackets turn red and dashed, the plaque wobbles. */
    arm(id, on) {
      if (on) armed = id;
      else if (armed === id || id == null) armed = null;
    },
    /** A refused swipe: every plaque nudges `dir` ('left' | 'right' | 'up' | 'down') and back. None under Reduce motion. */
    nudge(dir) {
      if (stage.reduced || !DIRS[dir]) return;
      nudgeDir = DIRS[dir];
      for (const v of views.values()) v.nudge = 1;
    },
    /** A tile's view (for tests and checks): its containers and motion state. */
    viewOf: (id) => views.get(id) ?? null,
    /** The pick's brackets (for tests and checks). */
    get pick() {
      return { visible: pick.visible, armed: pickArmed, x: pick.position.x, y: pick.position.y, corners: corners.map((g) => ({ x: g.position.x, y: g.position.y })) };
    },
  };
}
