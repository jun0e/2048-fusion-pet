// Summoned pets (docs/v2/SPEC.md sections 5 and 7). A fusion pet's skill (from 1024) summons it to
// the front for a while: it hops out of its tile (phase 'out'), acts at the front ('act': it uses its
// skill, src/render/skillfx.js draws what the skill does; the sim may walk it, or jump it, and it walks,
// crawls, hops or glides its own way), and hops back onto its tile ('back'). The tile keeps shooting
// from the board and shows its empty den meanwhile (src/render/blocks.js). Where the pet is and when it
// goes are sim state (tile.summon: x, y and its hop's height z, t into the phase, hop, home, moving,
// facing), so a replay plays out the same; this layer only draws it, and near home on its tile's sill
// where the tile draws it. A summon without a hop of its own (no z) is hopped by the renderer on the
// sim's clock (run.time): a paused game holds the hop. A summon that starts acting still hops out, and
// one that ends before its 'back' landed (petHome) pops the pet home in a puff.
// Each generated fusion moves its own way (its roster `move`, gaitAt): walkers step, crawlers stretch
// along the ground, leapers hop, hoverers and floaters ride over a detached shadow, the swimmer drifts
// in an S; only a side view (`view` profile) is flipped to face where it goes. A pure form wears its
// main element's halo over its head and a soft glow. When its skill acts (a skillFx event from the pet,
// or at it), the pet throws itself into it: a squash and a little hop. Reduce motion: no arc, no
// squash and no hop: the pet fades out of its tile and in at its spot, and back.
//
// Pets never hide the fight (proposal W4): a fusion stands about 1.0 cell tall and a pure form 1.15
// under its halo (src/art/index.js roamerFit), smaller than the bosses, and pets and foes share the
// enemies layer, drawn by where they stand: a foe lower on screen is drawn over a pet, a pet lower
// down over a foe; a pet over a foe fades so the foe shows through.
import { Container, Graphics, Sprite } from 'pixi.js';
import { GRID, V2 } from '../config.js';
import { ELEMENTS, fusionOf } from '../sim/classes.js';
import { shadowTex, softDot } from '../render/textures.js';
import { BRACKET_CORNERS, drawBracket } from '../render/brackets.js';
import { PLAQUE, bracketOffset } from '../art/plaque.js';
import { createRng } from '../sim/rng.js';
import { foeDrawSize } from '../art/foe-roster.js';

const hex = (c) => parseInt(c.replace('#', ''), 16);
/**
 * A foe's container sits at its sim position, about this far (world units) above its feet (its
 * shadow, src/render/foes.js), so a pet's feet compare with a foe's at this offset in the depth sort.
 */
const FOE_FEET = 0.34;
/**
 * The pets' ground marks, in cells: a shadow and a ring sized to a 1.0-cell fusion (a pure form's
 * shadow under its glow); a pure form's halo, `halo` wide behind it at `haloAt` of its height,
 * turning `haloTurn` a second (as on its tile: src/art/plaque.js PLAQUE.halo), and its glow.
 */
const MARK = { shadow: 0.76, shadowH: 0.22, pureShadow: 0.62, pureShadowH: 0.18, ring: 0.27, ringH: 0.085, halo: 0.95, haloAt: 0.62, haloTurn: 0.05, glow: 1.9 };

/**
 * The hop between a tile and the field: its arc's height (world units, plus `reach` of the distance),
 * where it stands on its tile (`sill` cells below the tile's centre, where the creature on the tile
 * stands: src/render/blocks.js) and its size there (a share of its field size: about the creature on
 * its tile), a skill's cast (`cast` s: a squash and a `castLift` cells hop), and a jump in the sim's
 * position during its act (further than `leap` world units in one frame) drawn as a hop of `leapS` s.
 */
export const HOP = { height: 1.1, reach: 0.18, sill: 0.43, tile: 0.6, cast: 0.32, castLift: 0.18, leap: 1.2, leapS: 0.26 };

/** Where a pet stands on its tile (world units): on the sill, below the tile's centre. */
export const homeOf = (t) => ({ x: t.x, y: t.y - HOP.sill * GRID.cell });

/** The ways a fusion moves (src/art/fusion-roster.js `move`); anything else walks. */
export const GAITS = ['walk', 'crawl', 'leap', 'hover', 'swim', 'float'];
/** 1/s: how fast a pet eases into and out of its stride, so starting and stopping never pop. */
const SETTLE = 8;

/**
 * A pet drawn over a foe fades so the foe shows through (T38): to `alpha` while it covers `over` or
 * more of a foe drawn under it, easing at `rate` per second. Its box is `core` of its sprite's, the
 * body of the silhouette (a trimmed sprite's corners are empty).
 */
export const PET_FADE = { alpha: 0.55, over: 0.2, rate: 12, core: 0.8 };

/** The share (0–1) of box `b` that box `a` covers. Boxes: { x0, x1, y0, y1 }. */
export function coverShare(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  const area = (b.x1 - b.x0) * (b.y1 - b.y0);
  return w > 0 && h > 0 && area > 0 ? (w * h) / area : 0;
}

/** The alpha a pet { box, z } eases to: PET_FADE.alpha while it covers a foe { box, z } drawn under it (smaller z), else 1. */
export function petFadeTarget(pet, foes) {
  for (const f of foes) if (f.z < pet.z && coverShare(pet.box, f.box) >= PET_FADE.over) return PET_FADE.alpha;
  return 1;
}

/**
 * A fusion's idle and walking motion by its roster `move` (src/art/fusion-roster.js), at time `t`
 * (its own phase added), as the foes move (src/render/foes.js): `go` is how far into its stride it
 * is (0 standing, 1 on the move; eased by the caller, a boolean works). → `lift` (U, up), `dx`
 * (U), `sway` (radians), `squash` (+ = wider and shorter, never past 5 %: the style brief) and
 * `wide` (a span seen from above beats by narrowing). Under Reduce motion a leaper walks.
 */
export function gaitAt(move, t, go, view) {
  const k = Math.max(0, Math.min(1, +go || 0));
  const breathe = 0.02 * Math.sin(t * 4.2);
  let lift = 0;
  let dx = 0;
  let sway = 0;
  let squash = breathe;
  let wide = 1;
  if (move === 'hover') {
    lift = 0.36 + Math.sin(t * 2.6) * 0.06;
    sway = Math.sin(t * 1.3) * 0.05;
    squash = view === 'front' ? 0.03 * Math.sin(t * 3) : 0; // a bell pulses
  } else if (move === 'float') {
    lift = 0.28 + Math.sin(t * 2) * 0.08;
    squash = 0;
  } else if (move === 'swim') {
    lift = 0.24;
    dx = Math.sin(t * 2.4) * 0.12;
    sway = Math.cos(t * 2.4) * 0.1;
    squash = 0;
  } else if (move === 'crawl') {
    squash = breathe * (1 - k) + 0.05 * Math.sin(t * 6) * k; // stretches along the ground, never lifts
  } else if (move === 'leap') {
    const h = Math.abs(Math.sin(t * 5));
    lift = h * 0.32 * k;
    squash = breathe * (1 - k) + (0.05 * (1 - h) - 0.03 * h) * k; // squat on landing, stretched at the top
    sway = Math.sin(t * 5) * 0.04 * k;
  } else {
    const step = Math.abs(Math.sin(t * 9));
    lift = step * 0.12 * k;
    squash = breathe * (1 - k) + 0.05 * (1 - step) * k;
    sway = Math.sin(t * 9) * 0.05 * k;
  }
  if (view === 'spread' && move === 'hover') wide = 1 - 0.12 * Math.abs(Math.sin(t * 8)); // wings beat
  return { lift, dx, sway, squash, wide };
}

/**
 * Where a hopping pet is, `k` (0–1) of the way from (x0, y0) to (x1, y1): its ground point (the shadow
 * stays on the ground) and its lift (world units) over it, an arc HOP.height + HOP.reach × the
 * distance high. → { x, y, lift } (`out` is filled and returned)
 */
export function hopAt(x0, y0, x1, y1, k, out = {}) {
  const e = Math.max(0, Math.min(1, k));
  const s = e * e * (3 - 2 * e); // eased: it pushes off and settles
  out.x = x0 + (x1 - x0) * s;
  out.y = y0 + (y1 - y0) * s;
  out.lift = Math.sin(e * Math.PI) * (HOP.height + HOP.reach * Math.hypot(x1 - x0, y1 - y0));
  return out;
}

/** The textures the pets' marks use (tests pass stand-ins). */
const ROAM_TEXTURES = { shadowTex, softDot };

export function createRoamers(stage, fx, art, { seed = 4096, tx = ROAM_TEXTURES } = {}) {
  // looks only (breathing phase, sparkles): where the pets go is the sim's
  const rng = createRng(seed);
  const rand = () => rng.next();
  // pets join the foes' layer and everything in it is drawn by depth (zIndex: screen y of the feet)
  const layer = stage.layers.enemies;
  layer.sortableChildren = true;
  const views = new Map();
  const pets = new WeakSet(); // the pets' containers in the shared layer (the rest are foes)
  const live = new Set(); // reused each frame
  const foeBoxes = []; // reused each frame: { z, box } of every foe on the field
  const hop = {}; // reused: hopAt
  let time = 0;
  // a tile picked on the board (blocks.select) marks its summoned pet with the pick's cream corner
  // brackets, their gap breathing in position, never in brightness (still under Reduce motion)
  let marked = null;
  let markCell = 0;
  const mark = new Container();
  mark.zIndex = 1e9 - 1;
  mark.visible = false;
  const markCorners = [0, 1, 2, 3].map(() => new Graphics());
  mark.addChild(...markCorners);
  layer.addChild(mark);

  /** A pet's colour: its fusion's (a single's element's). */
  const colorOf = (cls) => hex(fusionOf(cls)?.color ?? ELEMENTS[cls.element]?.color ?? '#ffffff');

  function make(t, now) {
    const c = new Container();
    const shadow = new Sprite(tx.shadowTex());
    shadow.anchor.set(0.5);
    const ring = new Graphics();
    const glow = new Sprite(tx.softDot()); // a soft haze behind a pure form (normal blend: nothing on the field is additive)
    glow.anchor.set(0.5);
    const halo = new Sprite();
    halo.anchor.set(0.5);
    const body = new Sprite();
    body.anchor.set(0.5, 0.89); // re-set per texture from art.roamerFit
    c.addChild(shadow, ring, glow, halo, body);
    layer.addChild(c);
    pets.add(c);
    const v = {
      c,
      shadow,
      ring,
      glow,
      halo,
      body,
      id: t.id,
      x: homeOf(t).x, // the pet's ground point, as drawn (world units)
      y: homeOf(t).y,
      lift: 0, // over it: a hop's arc
      mode: 'out', // 'out' | 'act' | 'back': the phase being drawn
      at: now, // sim time the phase being drawn started
      from: homeOf(t), // where its hop started
      leap: null, // a jump in the sim's position: { x0, y0, x1, y1, at }
      sx: null, // the sim's position as last seen
      sy: null,
      facing: t.summon?.facing ?? 1,
      cast: 0, // a skill's cast: 1 → 0
      still: 0, // seconds since the sim last moved it
      go: 0, // how far into its stride it is (0 standing, 1 on the move), eased
      phase: rand() * 6,
      key: '',
      ringU: 0, // the U its ring was drawn at
      dial: 0, // a pure form's halo turn
      fade: 1, // its alpha: PET_FADE while it covers a foe
      scale: HOP.tile, // its size: HOP.tile on its tile, 1 on the field
      landed: false,
    };
    // it springs off its tile
    const col = colorOf(t.cls);
    fx.burst(t.x, t.y + 0.2, [col, 0xffffff, 0xffe27a], 14, { speed: 3.5, size: 0.24, life: 0.45, gravity: -4 });
    return v;
  }

  /** The pet leaves the field at once (its tile is gone, or the summon ended out of turn): a puff where it stands. */
  function vanish(v, id, home = null) {
    fx.burst(v.x, v.y + 0.6 + v.lift, [0xffffff, 0xffe27a, 0xff9db0], 16, { speed: 3.5, size: 0.24, life: 0.5, gravity: -3 });
    if (home) fx.ring(home.x, home.y, 0xffffff, 0.3, 0.9, 0.3);
    v.c.destroy({ children: true });
    views.delete(id);
  }

  function sync(run, dt) {
    time += dt;
    const now = run.time ?? time;
    const U = stage.view.U;
    const cell = GRID.cell * U;
    const reduced = stage.reduced;
    const hopS = Math.max(0.05, V2.summon?.hopS ?? 0.6);
    live.clear();
    // the foes' boxes on screen, for the pets that stand over them (their sprites stand on their feet, lifted ~0.3 u)
    foeBoxes.length = 0;
    for (const e of run.enemies ?? []) {
      if (e.dead || e.gone) continue;
      const w = foeDrawSize(e.def) * U;
      const fx0 = stage.sx(e.x);
      const fy = stage.sy(e.y) - 0.3 * U;
      foeBoxes.push({ z: stage.sy(e.y), box: { x0: fx0 - w / 2, x1: fx0 + w / 2, y0: fy - 0.62 * w, y1: fy + 0.38 * w } });
    }
    for (const t of run.tiles) {
      const s = t.summon;
      let v = views.get(t.id);
      if (!s && !v) continue;
      live.add(t.id);
      if (!v) {
        v = make(t, now);
        views.set(t.id, v);
      }
      // the phase it is drawn in: a hop out always finishes; 'back' (or the summon's end) starts the hop home
      const want = s ? (s.phase ?? 'act') : 'gone';
      if (want === 'gone') {
        // the summon ended (petHome): home in a puff, unless it has (all but) landed already
        const k = v.mode === 'back' ? (v.simHop ? v.hopK : (now - v.at) / hopS) : 0;
        if (k >= 0.6) {
          v.c.destroy({ children: true });
          views.delete(t.id);
        } else vanish(v, t.id, homeOf(t));
        live.delete(t.id);
        continue;
      }
      // the sim's own hop (docs/v2/SPEC.md: tile.summon.z, t, hop, home), else the renderer draws one
      v.simHop = typeof s.z === 'number';
      const landing = v.mode === 'out' && (v.simHop ? want !== 'out' : now - v.at >= hopS);
      if (landing) {
        v.mode = 'act';
        v.at = now;
        v.landed = true;
        // it lands at its spot: a dust ring, a puff of its colour
        if (!reduced) fx.ring(s.x ?? v.x, s.y ?? v.y, 0xffffff, 0.3, 1.1, 0.3);
        fx.burst(s.x ?? v.x, (s.y ?? v.y) + 0.2, [colorOf(t.cls), 0xffffff], 10, { speed: 2.5, size: 0.22, life: 0.4, gravity: -3 });
      }
      if (want === 'back' && v.mode !== 'back') {
        v.mode = 'back';
        v.at = now;
        v.from = { x: v.x, y: v.y };
        v.leap = null;
      }
      // where it is
      let moving = false;
      if ((v.mode === 'out' || v.mode === 'back') && v.simHop) {
        // the sim moves it along its hop (x, y) and lifts it (z, world units); near home it stands on its
        // tile's sill, where the tile draws it, rather than at the sim's home point (the tile's centre)
        const k = s.hop > 0 ? Math.max(0, Math.min(1, (s.t ?? 0) / s.hop)) : 1;
        const home = homeOf(t);
        const simHome = s.home ?? { x: t.x, y: t.y };
        const near = v.mode === 'out' ? 1 - k : k;
        v.x = s.x + (home.x - simHome.x) * near;
        v.y = s.y + (home.y - simHome.y) * near;
        v.lift = reduced ? 0 : Math.max(0, s.z);
        v.scale = v.mode === 'out' ? HOP.tile + (1 - HOP.tile) * k : 1 - (1 - HOP.tile) * k;
        v.hopK = k;
      } else if (v.mode === 'out' || v.mode === 'back') {
        const k = Math.min(1, (now - v.at) / hopS);
        const home = homeOf(t);
        const to = v.mode === 'out' ? { x: s.x ?? home.x, y: s.y ?? home.y } : home;
        const from = v.mode === 'out' ? home : v.from;
        hopAt(from.x, from.y, to.x, to.y, k, hop);
        v.x = hop.x;
        v.y = hop.y;
        v.lift = reduced ? 0 : hop.lift;
        v.scale = v.mode === 'out' ? HOP.tile + (1 - HOP.tile) * k : 1 - (1 - HOP.tile) * k;
        v.hopK = k;
        if (Math.abs(to.x - from.x) > 0.05) v.facing = to.x > from.x ? 1 : -1;
      } else {
        // acting: it follows the sim (walking when it moves); a jump (jumpTo: a hop to another foe, a
        // charge's start) is drawn as a hop
        const sx = s.x ?? v.x;
        const sy = s.y ?? v.y;
        if (v.sx != null && Math.hypot(sx - v.sx, sy - v.sy) > HOP.leap) v.leap = { x0: v.x, y0: v.y, at: now };
        const shifted = v.sx != null && (sx !== v.sx || sy !== v.sy);
        moving = typeof s.moving === 'boolean' ? s.moving : shifted;
        if (shifted && Math.abs(sx - v.sx) > 0.01) v.facing = sx > v.sx ? 1 : -1;
        v.sx = sx;
        v.sy = sy;
        v.scale = 1;
        v.hopK = 1;
        const L = v.leap ? Math.min(1, (now - v.leap.at) / HOP.leapS) : 1;
        if (L < 1) {
          hopAt(v.leap.x0, v.leap.y0, sx, sy, L, hop);
          v.x = hop.x;
          v.y = hop.y;
          v.lift = reduced ? 0 : hop.lift * 0.5;
        } else {
          v.leap = null;
          v.x = sx;
          v.y = sy;
          v.lift = reduced ? 0 : Math.max(0, s.z ?? 0);
        }
      }
      if (s.facing === 1 || s.facing === -1) v.facing = s.facing;
      v.still = moving ? 0 : v.still + dt;
      v.cast = Math.max(0, v.cast - dt / HOP.cast);
      draw(v, t, s, dt, U, cell, reduced);
    }
    for (const [id, v] of views) {
      if (live.has(id)) continue;
      vanish(v, id); // its tile left the board (merged, sold, destroyed)
    }
    markAt(cell, reduced);
    // the foes stand by depth too: their containers sit at their sim positions (src/render/foes.js)
    for (const c of layer.children) if (c !== mark && !pets.has(c) && c.skillDepth == null) c.zIndex = c.position.y;
  }

  /** Draw a pet where it is: its body by its gait, its shadow and ring on the ground, a pure form's halo and glow; it fades over a foe. */
  function draw(v, t, s, dt, U, cell, reduced) {
    const pure = !!t.cls.pure;
    const key = `${art.style}.${t.cls.element}.${t.cls.fusion}.${pure}`;
    if (key !== v.key) {
      v.key = key;
      v.body.texture = art.roamer(t.cls);
      v.fit = art.roamerFit(t.cls); // code-drawn canvases are padded, generated sprites trimmed
      v.body.anchor.set(0.5, v.fit.feet);
      v.halo.visible = pure;
      if (pure) v.halo.texture = art.halo(t.cls.element);
      v.glow.tint = hex(ELEMENTS[t.cls.element]?.color ?? '#ffe9a8');
      v.ringU = 0;
    }
    if (v.ringU !== U) {
      // the element ring at its feet, sized to the pet (redrawn when the stage resizes)
      v.ringU = U;
      const col = colorOf(t.cls);
      v.ring.clear();
      v.ring.ellipse(0, 0, MARK.ring * cell, MARK.ringH * cell).stroke({ width: 0.08 * U, color: col, alpha: 0.85 });
      v.ring.ellipse(0, 0, MARK.ring * cell, MARK.ringH * cell).stroke({ width: 0.025 * U, color: 0xffffff, alpha: 0.7 });
    }
    const px = art.style === 'pixel';
    const tex = v.body.texture;
    let k = Math.min((cell * v.fit.height) / (tex.height || 1), (cell * v.fit.maxW) / (tex.width || 1)); // the creature itself: 1.0 cell (a pure form 1.15)
    k *= v.scale;
    if (px) k = Math.max(1, Math.round(k * 2) / 2); // half-pixel steps keep pixel art crisp-ish
    const sx = stage.sx(v.x);
    const sy = stage.sy(v.y);
    v.c.position.set(sx, sy);
    v.c.zIndex = stage.sy(v.y + FOE_FEET); // its feet, as a foe's container would stand there
    const moving = v.still < 0.1 && v.mode === 'act';
    v.go += ((moving ? 1 : 0) - v.go) * (1 - Math.exp(-SETTLE * dt)); // eases into and out of its stride
    const g = gaitAt(reduced && v.fit.move === 'leap' ? 'walk' : v.fit.move, time + v.phase, v.go, v.fit.view);
    const hopping = v.mode !== 'act' || v.leap;
    // a hop: pushes off squashed, stretches in the air, lands squashed; a cast: a squash and a little hop
    const air = Math.sin((v.hopK ?? 1) * Math.PI);
    const takeoff = reduced || !hopping ? 0 : 0.06 * (air - 0.5);
    const cast = reduced ? 0 : Math.sin(v.cast * Math.PI);
    const squash = reduced ? 0 : g.squash - takeoff + cast * 0.05;
    const lift = (hopping ? v.lift : g.lift) * U + cast * HOP.castLift * cell;
    // a side view faces where it goes; a front or top view is symmetric and keeps its light from the upper left
    const flip = !v.fit.view || v.fit.view === 'profile' ? -v.facing : 1;
    v.body.position.set(hopping ? 0 : g.dx * U, -lift);
    v.body.scale.set(k * (1 + squash * 0.6) * flip * (hopping ? 1 : g.wide), k * (1 - squash));
    v.body.rotation = hopping ? 0 : g.sway;
    // under Reduce motion the hop is a fade: out of its tile, in at its spot
    const hopFade = reduced && v.mode !== 'act' ? (v.mode === 'out' ? v.hopK : 1 - v.hopK) : 1;
    // Railgun turns invisible while it charges (tile.summon.hidden): a faint shimmer
    const hidden = s.hidden ? 0.22 + 0.08 * Math.sin(time * 9) : 1;
    // over a foe it fades so the foe shows through
    const hw = (Math.abs(v.body.scale.x) * (tex.width || 1) * PET_FADE.core) / 2;
    const bh = Math.abs(v.body.scale.y) * (tex.height || 1);
    const foot = sy + v.body.position.y;
    const mid = foot - bh * (v.fit.feet - 0.5);
    const hh = (bh * PET_FADE.core) / 2;
    const bx = sx + v.body.position.x;
    const want = petFadeTarget({ z: v.c.zIndex, box: { x0: bx - hw, x1: bx + hw, y0: mid - hh, y1: mid + hh } }, foeBoxes);
    v.fade += (want - v.fade) * (1 - Math.exp(-PET_FADE.rate * dt));
    v.c.alpha = v.fade * hopFade * hidden;
    // its shadow and ring stay on the ground, smaller under a pet in the air
    const high = Math.max(0.55, 1 - (lift / cell) * 0.6);
    v.shadow.width = cell * (pure ? MARK.pureShadow : MARK.shadow) * high * v.scale;
    v.shadow.height = cell * (pure ? MARK.pureShadowH : MARK.shadowH) * high * v.scale;
    v.shadow.alpha = pure ? 0.6 : 0.85;
    v.ring.alpha = (0.55 + 0.25 * Math.sin(time * 3 + v.phase)) * (v.mode === 'act' ? 1 : 0.4);
    v.ring.scale.set(v.scale);
    v.glow.visible = pure;
    v.halo.visible = pure;
    if (pure) {
      // its halo behind its head and shoulders, as on its tile, turning slowly (still under Reduce
      // motion), and a soft glow behind it
      if (!reduced) v.dial += dt * MARK.haloTurn * Math.PI * 2;
      const hs = (cell * MARK.halo * v.scale) / Math.max(1, v.halo.texture.width, v.halo.texture.height);
      v.halo.scale.set(px ? Math.max(1, Math.round(hs * 2) / 2) : hs);
      v.halo.position.set(v.body.position.x, v.body.position.y - bh * v.fit.feet * MARK.haloAt);
      v.halo.rotation = v.dial;
      v.glow.position.set(v.body.position.x, -lift - bh * (v.fit.feet - 0.5));
      v.glow.width = v.glow.height = cell * MARK.glow * v.scale;
      v.glow.alpha = 0.16 + (reduced ? 0 : 0.04 * Math.sin(time * 1.9 + v.phase));
      // a soft cream sparkle now and then: serene, not noisy
      if (!reduced && v.mode === 'act' && rand() < dt * 1.5) fx.burst(v.x + (rand() - 0.5) * 1.2, v.y + 1 + rand() * 1.1, [0xfff4c2, 0xffffff], 1, { speed: 0.4, size: 0.16, life: 0.9, gravity: -0.6 });
    }
  }

  /**
   * The marked pet's brackets: round the box its body is drawn in (and a pure form's halo over it),
   * 0.06 cell out, following a hop; their gap breathes in position (still under Reduce motion).
   */
  function markAt(cell, reduced) {
    const v = marked != null ? views.get(marked) : null;
    mark.visible = !!v;
    if (!v) return;
    if (markCell !== cell) {
      markCell = cell;
      markCorners.forEach((g, i) => drawBracket(g, BRACKET_CORNERS[i][0], BRACKET_CORNERS[i][1], cell));
    }
    const tex = v.body.texture;
    const tw = tex.width || 1;
    const th = tex.height || 1;
    const sw = Math.abs(v.body.scale.x);
    const sh = Math.abs(v.body.scale.y);
    const bx = v.body.position.x;
    const by = v.body.position.y;
    let x0 = bx - (tw * sw) / 2;
    let x1 = bx + (tw * sw) / 2;
    let y0 = by - th * sh * v.fit.feet;
    const y1 = by + th * sh * (1 - v.fit.feet);
    if (v.halo.visible) {
      const hw = ((v.halo.texture.width || 1) * Math.abs(v.halo.scale.x)) / 2;
      const hh = ((v.halo.texture.height || 1) * Math.abs(v.halo.scale.y)) / 2;
      x0 = Math.min(x0, v.halo.position.x - hw);
      x1 = Math.max(x1, v.halo.position.x + hw);
      y0 = Math.min(y0, v.halo.position.y - hh);
    }
    const out = (0.06 + bracketOffset(time, reduced) - PLAQUE.bracket.offset) * cell;
    mark.position.copyFrom(v.c.position);
    markCorners[0].position.set(x0 - out, y0 - out);
    markCorners[1].position.set(x1 + out, y0 - out);
    markCorners[2].position.set(x1 + out, y1 + out);
    markCorners[3].position.set(x0 - out, y1 + out);
  }

  function onEvent(e) {
    // a skill acting from the pet (or right at it): it throws itself into it
    if (e.type === 'skillFx') {
      for (const [id, v] of views) {
        if (v.mode !== 'act') continue;
        const at = e.tileId === id || (e.x != null && Math.hypot(e.x - v.x, e.y - v.y) < 0.9);
        if (at) v.cast = 1;
      }
    }
  }

  return {
    sync,
    onEvent,
    /** Mark the summoned pet of the tile picked on the board (its tile id), or none (null). */
    highlight(id) {
      marked = id ?? null;
    },
    /** The mark (for tests and checks): shown, where, its corners. */
    get mark() {
      return { id: marked, visible: mark.visible, x: mark.position.x, y: mark.position.y, z: mark.zIndex, corners: markCorners.map((g) => ({ x: g.position.x, y: g.position.y })) };
    },
    /** World position of a tile's summoned pet (its ground point; for namecard ribbons), or null while it is home. */
    where(id) {
      const v = views.get(id);
      return v ? { x: v.x, y: v.y } : null;
    },
    /** A summoned pet's view (for tests and checks). */
    viewOf: (id) => views.get(id) ?? null,
    refresh() {
      for (const v of views.values()) v.key = '';
    },
    reset() {
      for (const v of views.values()) v.c.destroy({ children: true });
      views.clear();
      marked = null;
      mark.visible = false;
    },
  };
}

/** The summoned pets (v2's name for the layer: createRoamers draws summons, not roamers). */
export const createSummons = createRoamers;
