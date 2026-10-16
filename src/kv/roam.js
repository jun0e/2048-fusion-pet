// Roaming fusions: at 256 a fusion hops out of its tile, which stays on the board as
// its den (number, split plate, both glyphs), and roams the field. It walks to the lane
// under the most pressure, idles, and shoots from where it stands. Where it goes is sim
// state (src/sim/roam.js, tile.roam), so a replay plays out the same; this layer only
// draws it. Legendaries glide instead of stepping, hover over a detached shadow and carry
// their apex halo. Motion by stage follows the style brief: fusions ≤5% squash with a
// weighty step, legendaries none. Before each shot the pet sells its stage
// (src/art/attack-vfx.js petPose, from the sim's cooldown): a fusion leans back and throws
// its whole body at the target; a legendary never squashes, its halo swells and turns
// faster as a charge dial. A Pride Pounce pet leaps onto its prey with an afterimage.
// Reduce motion: no wind-up, no lunge, no leap and no halo swell.
// Each generated fusion roams its own way (its roster `move`, gaitAt): walkers step, crawlers
// stretch along the ground, leapers hop, hoverers and floaters ride over a detached shadow, the
// swimmer drifts in an S; only a side view (`view` profile) is flipped to face where it goes.
//
// Pets never hide the fight (proposal W4): a fusion stands about 1.0 cell tall and a
// legend 1.15 under its halo (src/art/index.js roamerFit), smaller than the bosses, and
// pets and foes share the enemies layer, drawn by where they stand: a foe lower on screen
// is drawn over a pet, a pet lower down over a foe.
import { Container, Graphics, Sprite } from 'pixi.js';
import { GRID } from '../config.js';
import { fusionOf } from '../sim/classes.js';
import { LADDER, createSimRate, has, leapAt, petPose, windUpAt } from '../art/attack-vfx.js';
import { shadowTex, softDot } from '../render/textures.js';
import { createAfterimage } from '../render/trails.js';
import { BRACKET_CORNERS, drawBracket } from '../render/brackets.js';
import { PLAQUE, bracketOffset } from '../art/plaque.js';
import { createRng } from '../sim/rng.js';

const hex = (c) => parseInt(c.replace('#', ''), 16);
/**
 * A foe's container sits at its sim position, about this far (world units) above its feet (its
 * shadow, src/render/foes.js), so a pet's feet compare with a foe's at this offset in the depth sort.
 */
const FOE_FEET = 0.34;
/** The pets' ground marks, in cells: a shadow and a ring sized to a 1.0-cell fusion, a halo over a 1.15-cell legend. */
const MARK = { shadow: 0.76, shadowH: 0.22, legendShadow: 0.54, legendShadowH: 0.16, ring: 0.27, ringH: 0.085, halo: 0.95, haloY: 1.15, glow: 1.9, glowY: 0.78 };

/** The ways a fusion roams (src/art/fusion-roster.js `move`); anything else walks. */
export const GAITS = ['walk', 'crawl', 'leap', 'hover', 'swim', 'float'];
/** 1/s: how fast a pet eases into and out of its stride, so starting and stopping never pop. */
const SETTLE = 8;

/**
 * A fusion's idle and walking motion by its roster `move` (src/art/fusion-roster.js), at time `t`
 * (its own phase added), as the foes move (src/render/foes.js): `go` is how far into its stride it
 * is (0 standing, 1 on the move; eased by the caller, a boolean works). → `lift` (U, up), `dx`
 * (U), `sway` (radians), `squash` (+ = wider and shorter, never past 5 %: the style brief) and
 * `wide` (a span seen from above beats by narrowing). A legend glides instead (sync); under Reduce
 * motion a leaper walks.
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

/** The textures the pets' marks use (tests pass stand-ins). */
const ROAM_TEXTURES = { shadowTex, softDot };

export function createRoamers(stage, fx, art, { seed = 4096, tx = ROAM_TEXTURES } = {}) {
  // looks only (breathing phase, sparkles): the walking is the sim's
  const rng = createRng(seed);
  const rand = () => rng.next();
  // pets join the foes' layer and everything in it is drawn by depth (zIndex: screen y of the feet)
  const layer = stage.layers.enemies;
  layer.sortableChildren = true;
  const views = new Map();
  const pets = new WeakSet(); // the pets' containers in the shared layer (the rest are foes)
  const live = new Set(); // reused each frame
  const list = [];
  const simRate = createSimRate(); // the game speed, so a wind-up lasts WIND_UP s of real time
  let time = 0;
  const echoLayer = new Container(); // a leaping pet's afterimage, over them all
  echoLayer.zIndex = 1e9;
  layer.addChild(echoLayer);
  // a den picked on the board (blocks.select) marks its pet with the pick's cream corner brackets,
  // their gap breathing in position, never in brightness (still under Reduce motion)
  let marked = null;
  let markCell = 0;
  const mark = new Container();
  mark.zIndex = 1e9 - 1;
  mark.visible = false;
  const markCorners = [0, 1, 2, 3].map(() => new Graphics());
  mark.addChild(...markCorners);
  layer.addChild(mark);

  function make(t) {
    const c = new Container();
    const shadow = new Sprite(tx.shadowTex());
    shadow.anchor.set(0.5);
    const ring = new Graphics();
    const glow = new Sprite(tx.softDot()); // a soft haze behind the halo (normal blend: nothing on the field is additive)
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
      x: t.roam.x,
      y: t.roam.y,
      facing: t.roam.facing,
      walkFacing: t.roam.facing, // the sim's facing as last seen: a turn there overrides a punch's
      punch: 0,
      still: 0, // seconds since the sim last moved it
      go: 0, // how far into its stride it is (0 standing, 1 on the move), eased
      phase: rand() * 6,
      key: '',
      ringU: 0, // the U its ring was drawn at
      wind: 0, // the wind-up before a shot (0–1)
      follow: 0, // the follow-through after it (1 → 0)
      left: 0, // the sim's cooldown as last seen …
      period: Infinity, // … and its full length
      aim: { x: 0, y: 1 },
      pose: {}, // reused each frame
      hop: {},
      dial: 0, // the halo's turn
      leap: null,
      echo: null,
    };
    fx.burst(t.x, t.y, [hex(fusionOf(t.cls).color), 0xffffff, 0xffe27a], 26, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
    fx.ring(t.x, t.y, 0xffffff, 0.4, 2.2, 0.4);
    return v;
  }

  function sync(run, dt) {
    time += dt;
    const U = stage.view.U;
    const cell = GRID.cell * U;
    const rate = simRate.update(run.time ?? 0, dt);
    const reduced = stage.reduced;
    live.clear();
    list.length = 0;
    for (const t of run.tiles) {
      if (!t.roam) continue; // the sim adds it to a fusion (createRun({ roaming: true }))
      live.add(t.id);
      let v = views.get(t.id);
      if (!v) {
        v = make(t);
        views.set(t.id, v);
      }
      list.push(t, v);
    }
    for (let i = 0; i < list.length; i += 2) {
      const t = list[i];
      const v = list[i + 1];
      const legend = !!t.cls.ultimate;
      const fu = fusionOf(t.cls);
      const key = `${art.style}.${t.cls.element}.${t.cls.fusion}.${t.cls.ultimate ?? ''}`;
      if (key !== v.key) {
        v.key = key;
        v.body.texture = art.roamer(t.cls);
        v.fit = art.roamerFit(t.cls); // code-drawn canvases are padded, generated sprites trimmed
        v.body.anchor.set(0.5, v.fit.feet);
        v.halo.visible = legend;
        if (legend) v.halo.texture = art.halo(t.cls.ultimate);
        v.glow.tint = hex(legend ? '#ffe9a8' : fu.color);
        v.ringU = 0;
      }
      if (v.ringU !== U) {
        // the element ring at its feet, sized to the pet (redrawn when the stage resizes)
        v.ringU = U;
        v.ring.clear();
        v.ring.ellipse(0, 0, MARK.ring * cell, MARK.ringH * cell).stroke({ width: 0.08 * U, color: hex(fu.color), alpha: 0.85 });
        v.ring.ellipse(0, 0, MARK.ring * cell, MARK.ringH * cell).stroke({ width: 0.025 * U, color: 0xffffff, alpha: 0.7 });
      }
      v.punch = Math.max(0, v.punch - dt * 7);
      // where the sim has it; a paused game holds it still (no walking in place)
      const r = t.roam;
      v.still = r.x === v.x && r.y === v.y ? v.still + dt : 0;
      const moving = r.moving && r.hatch >= 1 && v.still < 0.1;
      v.x = r.x;
      v.y = r.y;
      if (r.facing !== v.walkFacing) v.facing = v.walkFacing = r.facing;

      // view
      const px = art.style === 'pixel';
      const tex = v.body.texture;
      let s = Math.min((cell * v.fit.height) / (tex.height || 1), (cell * v.fit.maxW) / (tex.width || 1)); // the creature itself: 1.0 cell (a legend 1.15)
      if (px) s = Math.max(1, Math.round(s * 2) / 2); // half-pixel steps keep pixel art crisp-ish
      const sx = stage.sx(v.x);
      const sy = stage.sy(v.y);
      v.c.position.set(sx, sy);
      v.c.zIndex = stage.sy(v.y + FOE_FEET); // its feet, as a foe's container would stand there
      const breathe = Math.sin(time * 1.9 + v.phase);
      v.go += ((moving ? 1 : 0) - v.go) * (1 - Math.exp(-SETTLE * dt)); // eases into and out of its stride
      const g = legend ? null : gaitAt(reduced && v.fit.move === 'leap' ? 'walk' : v.fit.move, time + v.phase, v.go, v.fit.view);
      const hover = legend ? (0.32 + 0.1 * breathe) * U : g.lift * U;
      const squash = legend ? 0 : g.squash + v.punch * 0.06;
      // a side view faces where it goes; a front or top view is symmetric and keeps its light from the upper left
      const flip = !v.fit.view || v.fit.view === 'profile' ? -v.facing : 1;
      v.body.position.set(legend ? 0 : g.dx * U, -hover);
      v.body.scale.set(s * (1 + squash * 0.6) * flip * (legend ? 1 : g.wide), s * (1 - squash));
      v.body.rotation = legend ? 0 : g.sway;
      // the attack's wind-up (WIND_UP s of real time before a shot, from the sim's cooldown, read
      // only) and follow-through; none under Reduce motion: no lunge, no halo swell
      if (!reduced) {
        const left = run.defense.cooldownLeft?.(t.id) ?? 0;
        if (left > v.left + 1e-6) v.period = left; // a shot just reset it: its full length
        v.left = left;
        const want = windUpAt(left, rate, v.period);
        v.wind = want >= v.wind ? want : Math.max(0, v.wind - dt / 0.1);
        v.follow = Math.max(0, v.follow - dt / 0.3);
      } else v.wind = v.follow = 0;
      const w = v.wind * v.wind * (3 - 2 * v.wind);
      const st = legend ? '4096' : '256';
      const pose = petPose(st, w, v.follow, v.aim, v.pose);
      v.body.position.x += pose.x * cell;
      v.body.position.y -= pose.y * cell;
      v.body.scale.x *= pose.sx;
      v.body.scale.y *= pose.sy;
      v.body.rotation += pose.rot;
      // Pride Pounce: it leaps onto its prey and bounds back, its afterimage behind it
      const L = v.leap ? leapAt(time - v.leap.t0, v.hop) : null;
      if (L) {
        v.body.position.x += v.leap.dx * L.k * U;
        v.body.position.y -= (v.leap.dy * L.k + L.lift) * U;
      } else v.leap = null;
      const n = L && t.cls.element === 'metal' && has(LADDER.metal[st], 'ghosts') ? LADDER.metal[st].ghosts : 0;
      if (n || v.echo) {
        v.echo ??= createAfterimage(echoLayer, 3);
        v.echo.push(dt, sx + v.body.position.x, sy + v.body.position.y, v.body.scale.x, v.body.scale.y, v.body.rotation);
        v.echo.draw(n, v.body.texture, 0xffffff, 0.5, v.fit.feet);
      }
      const air = legend ? 1 : Math.max(0.6, 1 - g.lift * 0.8); // a shadow left on the ground shrinks under a hovering pet
      v.shadow.width = cell * (legend ? MARK.legendShadow : MARK.shadow) * air;
      v.shadow.height = cell * (legend ? MARK.legendShadowH : MARK.shadowH) * air;
      v.shadow.alpha = legend ? 0.55 : 0.85;
      v.ring.alpha = 0.55 + 0.25 * Math.sin(time * 3 + v.phase);
      v.glow.visible = legend;
      if (legend) {
        v.glow.position.set(0, -cell * MARK.glowY - hover);
        v.glow.width = v.glow.height = cell * MARK.glow;
        v.glow.alpha = (0.16 + 0.05 * breathe) * pose.halo;
        // the halo is the charge dial: it swells and turns faster as the next shot nears
        v.dial += dt * (0.4 + 2.6 * w);
        v.halo.position.set(0, -cell * MARK.haloY - hover);
        const hs = ((cell * MARK.halo) / (v.halo.texture.height || 1)) * pose.halo;
        v.halo.scale.set(px ? Math.max(1, Math.round(hs * 2) / 2) : hs);
        v.halo.rotation = v.dial;
      }
      // a soft cream sparkle now and then on legends: majestic, not noisy
      if (legend && rand() < dt * 1.5) fx.burst(v.x + (rand() - 0.5) * 1.4, v.y + 1.4 + rand() * 1.1, [0xfff4c2, 0xffffff], 1, { speed: 0.4, size: 0.16, life: 0.9, gravity: -0.6 });
    }
    for (const [id, v] of views) {
      if (live.has(id)) continue;
      fx.burst(v.x, v.y + 0.8, [0xffffff, 0xffe27a, 0xff9db0], 24, { speed: 4, size: 0.26, life: 0.6, gravity: -3 });
      v.c.destroy({ children: true });
      v.echo?.destroy();
      views.delete(id);
    }
    markAt(cell, reduced);
    // the foes stand by depth too: their containers sit at their sim positions (src/render/foes.js)
    for (const c of layer.children) if (c !== echoLayer && c !== mark && !pets.has(c)) c.zIndex = c.position.y;
  }

  /**
   * The marked pet's brackets: round the box its body is drawn in (and a legend's halo over it),
   * 0.06 cell out, following a leap or a hover; their gap breathes in position (still under Reduce
   * motion).
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
    const s = Math.min((cell * v.fit.height) / th, (cell * v.fit.maxW) / tw);
    const bx = v.body.position.x;
    const by = v.body.position.y;
    let x0 = bx - (tw * s) / 2;
    let x1 = bx + (tw * s) / 2;
    let y0 = by - th * s * v.fit.feet;
    const y1 = by + th * s * (1 - v.fit.feet);
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
    if (e.type === 'fire') {
      const v = views.get(e.id);
      if (v) {
        v.punch = 1;
        v.wind = 0;
        v.follow = stage.reduced ? 0 : 1; // Reduce motion: no lunge
        if (e.target) {
          v.facing = e.target.x > v.x ? 1 : -1;
          const dx = e.target.x - v.x;
          const dy = e.target.y - v.y;
          const d = Math.hypot(dx, dy) || 1;
          v.aim.x = dx / d;
          v.aim.y = dy / d;
          if (e.pattern === 'pounce' && !stage.reduced) v.leap = { t0: time, dx, dy };
        }
      }
    }
  }

  return {
    sync,
    onEvent,
    /** Mark the pet of the den picked on the board (its tile id), or none (null). */
    highlight(id) {
      marked = id ?? null;
    },
    /** The mark (for tests and checks): shown, where, its corners. */
    get mark() {
      return { id: marked, visible: mark.visible, x: mark.position.x, y: mark.position.y, z: mark.zIndex, corners: markCorners.map((g) => ({ x: g.position.x, y: g.position.y })) };
    },
    /** Screen position of a tile's roaming creature (for namecard ribbons). */
    where(id) {
      const v = views.get(id);
      return v ? { x: v.x, y: v.y } : null;
    },
    refresh() {
      for (const v of views.values()) v.key = '';
    },
    reset() {
      for (const v of views.values()) {
        v.c.destroy({ children: true });
        v.echo?.destroy();
      }
      views.clear();
      marked = null;
      mark.visible = false;
    },
  };
}
