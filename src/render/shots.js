// Projectile views. The basic attacks that fly are Echo Harpoon's ice harpoon and Venom Spit's
// lobbed glob (plus plain pebbles); the instant ones (breath, gust, pulse, quake, pounce, chains)
// are src/render/attacks.js. A shot is its first element's body sprite (textures.js vfxTex,
// cream-white, tinted with the element's or the fusion's colour), a ground shadow and what its
// ladder stage adds (src/art/attack-vfx.js LADDER): the harpoon's tether, then its afterimage,
// then two shard escorts; the glob's drips; a fusion's add-on riding it; an apex ribbon. Lobbed
// globs rise and fall over their shadow. Nothing is additive. Impacts: the element's burst sprite
// scaled and faded over about 0.25 s, and a decal (frost, splat, scorch, crack). Venom Spit leaves
// a faint stain where its puddle acts (photosafe.js PUDDLE).
import { Container, Sprite, Texture } from 'pixi.js';
import { ADDON, IMPACT_DECAL, IMPACT_PIECE, LADDER, SHED, VFX_ASPECT, VFX_GROW as G, VFX_PIECES, VFX_SIZE as S, VFX_TIME as T, attackClass, attackLight, growOf, harpoonFlight, has, ladderStage, pieceLit } from '../art/attack-vfx.js';
import { CHAPTER_SKINS, laneTones } from '../art/frame-kit.js';
import { TRAIL_CAPS, RIBBON_POINTS } from './trails.js';
import { allowed, bookPlan } from './attacks.js';
import { PUDDLE_TEXELS, puddleTex, shadowTex, vfxTex } from './textures.js';
import { PUDDLE, puddleAlpha } from '../ux/photosafe.js';

/** The textures the shots draw with (tests pass stand-ins). */
export const SHOT_TEXTURES = { vfxTex, puddleTex, shadowTex };

const LOB_HEIGHT = 1.1; // world units at the top of the arc (plus growth: it comes toward the camera)
const HOVER = 0.35; // a straight shot flies this high over its shadow
const BUBBLE = S.bubble + 0.06; // a bubble's size when it pops
const hex = (c) => parseInt(String(c).replace('#', ''), 16);
/**
 * Every ground a puddle can lie on: the chapters' lane tones and hedges (the walls, the parapet
 * and the keep are drawn over the path layer, so a puddle never shows on them).
 */
export const PUDDLE_GROUNDS = [...new Set(Object.values(CHAPTER_SKINS).flatMap((s) => [...Object.values(laneTones(s)), s.hedge]).filter((c) => typeof c === 'string').map(hex))];
const peaks = new Map(); // tint → its puddle alpha
/** A puddle's alpha for its tint: under PUDDLE.step over every ground (photosafe.js puddleAlpha). */
export const puddlePeak = (tint) => {
  if (!peaks.has(tint)) peaks.set(tint, puddleAlpha(tint, PUDDLE_TEXELS, PUDDLE_GROUNDS));
  return peaks.get(tint);
};

/**
 * How much of its alpha a puddle shows, `age` s (real time) after it appeared: up over
 * PUDDLE.rise, held until PUDDLE.rise + PUDDLE.hold at least, then down with `wet` (the sim's: 1
 * until its puddle's last third, then to 0; 0 once it is gone), but never faster than 1 / PUDDLE.fall
 * a second. `level` is last frame's. → the new level (0: done)
 */
export function puddleLevel(level, age, wet, dt) {
  if (age < PUDDLE.rise) return Math.min(1, age / PUDDLE.rise);
  if (age < PUDDLE.rise + PUDDLE.hold) return 1;
  return Math.max(Math.min(level, wet), level - dt / PUDDLE.fall);
}

const rand = (a, b) => a + Math.random() * (b - a);

/** How a shot looks: its body piece, tint and ladder stage (any shot but the harpoon and the glob flies as a plain pebble). */
function lookFor(s, vfx) {
  const el = s.prof.element ?? null; // the first element (null: a plain pebble)
  const cls = attackClass(s.prof.colors, el);
  const stage = ladderStage(s.tier, cls.kind);
  const step = el ? LADDER[el][stage] : null;
  const [bodyEl, piece] = s.pattern === 'lance' ? ['ice', 'harpoon'] : s.pattern === 'spit' ? ['poison', 'glob'] : ['earth', 'pebble'];
  const tinted = !!VFX_PIECES[bodyEl][piece].tint;
  return { el, cls, stage, step, g: growOf(s.tier), tex: vfx(bodyEl, piece), tint: tinted ? cls.tint : 0xffffff, piece, lob: s.kind === 'lob' };
}

/** A body's length along its flight (world units). */
const lengthOf = (look) => (look.piece === 'harpoon' ? S.harpoon[0] : look.piece === 'glob' ? S.glob : 0.3) * look.g;

export function createShots(stage, fx, trails, attacks, tx = SHOT_TEXTURES) {
  const vfx = tx.vfxTex;
  const shadowLayer = new Container();
  const layer = new Container();
  stage.layers.shots.addChild(shadowLayer, layer);
  const puddleLayer = new Container(); // Venom Spit puddles, on the ground under the foes
  stage.layers.path.addChild(puddleLayer);
  const views = new Map();
  const spare = []; // pooled views (a body and a shadow)
  const puddles = new Map(); // puddle id → its view { sp, age, level, wet, peak }
  const sparePuddles = [];
  const livePuddles = new Set(); // reused each frame
  const liveShots = new Set();

  function make(s) {
    const v = spare.pop() ?? (() => {
      const body = new Sprite(Texture.EMPTY);
      body.anchor.set(0.5);
      const shadow = new Sprite(tx.shadowTex());
      shadow.anchor.set(0.5);
      layer.addChild(body);
      shadowLayer.addChild(shadow);
      return { body, shadow };
    })();
    const look = lookFor(s, vfx);
    v.look = look;
    v.body.texture = look.tex;
    v.body.tint = look.tint;
    v.body.visible = v.shadow.visible = false;
    v.wx = null; // where it was drawn last (world)
    v.angle = 0;
    v.spin = 0;
    v.t = 0;
    v.age = 0; // real seconds since it first showed: its plan's clock
    v.booked = false; // it books its throw when it first shows (throwPlan)
    v.tether = v.drips = v.sheds = 0;
    const step = look.step;
    v.partner = step && has(step, 'addon') ? look.cls.partner : null;
    v.partnerTex = v.partner ? vfx(v.partner, ADDON[v.partner].piece) : null;
    // what rides with it needs a trail slot (24 at most: the rest fly bare)
    const rides = s.pattern === 'lance' || (step && (has(step, 'addon') || has(step, 'echo')));
    v.slot = rides ? trails.attach(s.id) : null;
    if (v.slot) {
      const shard = vfx('ice', 'shard');
      for (const e of v.slot.escorts) e.texture = shard;
      if (v.partnerTex) v.slot.rider.texture = v.partnerTex;
      if (step && has(step, 'echo')) trails.shotRibbon(v.slot, `shot${s.id}`, look.el, look.cls.apexTint, { width: 0.2 * look.g, taper: 0.15, speed: -3 });
    }
    return v;
  }

  /**
   * What the throw books as the shot first shows (attackLight 'fire'): the harpoon's tether (drawn
   * no longer and for no longer than booked), the glob's drips and a fusion's add-on, shed on the
   * schedule the plan booked (attack-vfx.js SHED): drips from the throw, then the add-on's bits.
   */
  function throwPlan(v, s) {
    v.booked = true;
    const target = { x: s.tx, y: s.ty };
    const got = bookPlan(fx, attackLight({ type: 'fire', pattern: s.pattern, tier: s.tier, colors: s.prof.colors, x: s.ox, y: s.oy, target }, { reduced: stage.reduced }));
    const step = v.look.step;
    v.tether = s.pattern === 'lance' ? got.tether ?? 0 : 0;
    v.tetherLen = Math.hypot(s.tx - s.ox, s.ty - s.oy);
    v.tetherLife = harpoonFlight(v.tetherLen) + 0.1;
    v.drips = step && has(step, 'drips') ? allowed(step.drips, got.drips) : 0;
    v.sheds = step && has(step, 'addon') ? allowed(step.addon, got.addon) : 0;
    v.shedDrips = v.shedAddons = 0;
    v.addonAt = (step && has(step, 'drips') ? step.drips : 0) * SHED.drip;
  }

  function drop(id, v) {
    if (v.slot) trails.detach(id);
    v.slot = null;
    v.body.visible = v.shadow.visible = false;
    views.delete(id);
    spare.push(v);
  }

  /**
   * Venom puddles: a faint splat-edged stain in the class colour, no wider than the sim's puddle,
   * at an alpha that changes no ground's luminance by PUDDLE.step (puddlePeak); it seeps in, holds
   * and dries as puddleLevel says, a bubble popping now and then while the sim's puddle is there.
   */
  function drawPuddles(list, U, dt) {
    const live = livePuddles;
    live.clear();
    for (const p of list ?? []) {
      live.add(p.id);
      let v = puddles.get(p.id);
      if (!v) {
        v = sparePuddles.pop();
        if (!v) {
          const sp = new Sprite(tx.puddleTex());
          sp.anchor.set(0.5);
          puddleLayer.addChild(sp);
          v = { sp };
        }
        const tint = attackClass(p.prof.colors, 'poison').tint;
        v.sp.tint = tint;
        v.sp.rotation = rand(0, Math.PI * 2);
        v.sp.visible = true;
        v.peak = puddlePeak(tint);
        v.age = 0;
        v.level = 0;
        puddles.set(p.id, v);
      }
      v.x = p.x;
      v.y = p.y;
      v.r = p.r;
      v.wet = Math.min(1, Math.max(0, (p.t / p.max) * 3)); // the sim's: it dries over its last third
      if (Math.random() < 0.06 * v.level && fx.flashAll(pieceLit('poison.bubble') * BUBBLE * BUBBLE, 0.6)) {
        fx.particle(vfx('poison', 'bubble'), p.x + rand(-0.5, 0.5) * p.r, p.y + rand(-0.5, 0.5) * p.r, { vy: 0.4, life: 0.6, size: S.bubble, grow: BUBBLE - S.bubble, book: 'bubble' });
      }
    }
    for (const [id, v] of puddles) {
      if (!live.has(id)) v.wet = 0; // the sim's puddle is gone: the stain dries at its own pace
      v.age += dt;
      v.level = puddleLevel(v.level, v.age, v.wet, dt);
      if (v.level <= 0 && v.age >= PUDDLE.rise) {
        v.sp.visible = false;
        sparePuddles.push(v);
        puddles.delete(id);
        continue;
      }
      v.sp.alpha = v.peak * v.level;
      v.sp.position.set(stage.sx(v.x), stage.sy(v.y));
      v.sp.width = v.sp.height = v.r * 2 * U; // the splat's droplets reach the sim's radius, no further
    }
  }

  function sync(shots, dt, puddleList) {
    const U = stage.view.U;
    const sx = stage.sx;
    const sy = stage.sy;
    drawPuddles(puddleList, U, dt);
    const live = liveShots;
    live.clear();
    for (const s of shots) {
      let v = views.get(s.id);
      if (!v) {
        if (views.size >= TRAIL_CAPS.shots) continue; // 24 in flight at most
        v = make(s);
        views.set(s.id, v);
      }
      live.add(s.id);
      // burst shots wait their turn inside the block
      const waiting = s.delay > 0;
      v.body.visible = v.shadow.visible = !waiting;
      if (waiting) continue;
      if (!v.booked) throwPlan(v, s);
      v.t += dt;
      const look = v.look;
      const h = look.lob ? (s.h ?? 0) : 0;
      const lift = look.lob ? h * LOB_HEIGHT : HOVER;
      const wx = s.x;
      const wy = s.y + lift;
      if (v.wx != null && (wx !== v.wx || wy !== v.wy)) v.angle = Math.atan2(-(wy - v.wy), wx - v.wx); // screen y is flipped
      const moved = v.wx == null ? 0 : Math.hypot(wx - v.wx, wy - v.wy);
      v.wx = wx;
      v.wy = wy;
      const grow = look.lob ? 1 + h * 0.5 : 1; // a lob comes toward the camera at the top of its arc
      const len = lengthOf(look) * grow;
      const bx = sx(wx);
      const by = sy(wy);
      v.body.position.set(bx, by);
      const k = (len * U) / (v.body.texture.width || 1);
      v.body.scale.set(k);
      if (look.piece === 'pebble') {
        v.spin += dt * 9;
        v.body.rotation = v.spin;
      } else v.body.rotation = v.angle + (look.piece === 'glob' ? Math.sin(v.t * 18) * 0.12 : 0); // the glob wobbles

      // the ground shadow (a lob's shrinks as it rises)
      const sh = look.lob ? 1 - h * 0.5 : 0.75;
      v.shadow.position.set(sx(s.x), sy(s.y - 0.1));
      v.shadow.width = len * U * 1.1 * sh;
      v.shadow.height = len * U * 0.4 * sh;
      v.shadow.alpha = 0.5 * sh;

      const step = look.step;
      const slot = v.slot;
      if (slot) {
        // the harpoon's tether back to the shooter (thinner when the budget was short): no longer
        // and for no longer than it booked (a harpoon chasing a foe pushed away goes on without it)
        if (s.pattern === 'lance' && v.tether && v.age < v.tetherLife) {
          const reach = Math.hypot(s.x - s.ox, s.y - s.oy);
          trails.tether(slot, s.ox, s.oy + HOVER, wx, wy, look.tint, U, 0.9, v.tether * Math.min(1, v.tetherLen / Math.max(1e-6, reach)));
        } else slot.tether.visible = slot.tetherInk.visible = false;
        // its afterimage (32+): ghosts 80 ms apart; Reduce motion drops it
        const ghosts = step && has(step, 'ghosts') && !stage.reduced ? step.ghosts : 0;
        slot.ghosts.push(dt, bx, by, v.body.scale.x, v.body.scale.y, v.body.rotation);
        slot.ghosts.draw(ghosts, v.body.texture, look.tint);
        // two shard escorts flank it (128+)
        const escorts = step && has(step, 'escorts') ? step.escorts : 0;
        const c = Math.cos(v.angle);
        const sn = Math.sin(v.angle);
        for (let i = 0; i < slot.escorts.length; i++) {
          const e = slot.escorts[i];
          e.visible = i < escorts;
          if (!e.visible) continue;
          const side = i ? 1 : -1;
          const off = 0.3 * U;
          e.position.set(bx - c * 0.18 * U - sn * off * side, by - sn * 0.18 * U + c * off * side);
          e.rotation = v.t * 9 * side;
          e.scale.set((S.shard * U) / (e.texture.width || 1));
        }
        // a fusion's add-on rides at the tip (or on top of the glob)
        slot.rider.visible = !!v.partner;
        if (v.partner) {
          const tip = look.piece === 'harpoon' ? len * 0.5 * U : 0;
          slot.rider.position.set(bx + c * tip, by + sn * tip - (look.piece === 'glob' ? len * 0.35 * U : 0));
          slot.rider.rotation = v.t * 6;
          slot.rider.scale.set((0.22 * look.g * U) / (slot.rider.texture.width || 1));
        }
        // an apex ribbon streams behind it (while the ribbon is still its own)
        const r = slot.ribbon;
        if (r && r.key === slot.ribbonKey && (moved > 0 || !r.n)) {
          for (let i = RIBBON_POINTS - 1; i > 0; i--) {
            r.xs[i] = r.xs[i - 1];
            r.ys[i] = r.ys[i - 1];
          }
          r.xs[0] = wx;
          r.ys[0] = wy;
          r.n = Math.min(RIBBON_POINTS, r.n + 1);
        }
      }
      // what it sheds as it flies, on the schedule its plan booked (SHED): drips from the throw
      // (Venom Spit 32+), then a fusion's add-on bits. A late one lives that much less.
      const m = stage.reduced ? 0.2 : 1;
      while (v.shedDrips < v.drips && v.age >= v.shedDrips * SHED.drip) {
        const late = v.age - v.shedDrips * SHED.drip;
        v.shedDrips += 1;
        if (late < T.drip) fx.particle(vfx('poison', 'drip'), wx + rand(-0.1, 0.1), wy - 0.15, { vy: -0.8 * m, gravity: -7 * m, life: T.drip - late, size: S.drip, drag: 0.5, book: 'drips' });
      }
      while (v.shedAddons < v.sheds && v.age >= v.addonAt + v.shedAddons * SHED.addon) {
        const late = v.age - v.addonAt - v.shedAddons * SHED.addon;
        v.shedAddons += 1;
        if (late < T.addon) fx.particle(v.partnerTex, wx, wy, { vx: rand(-0.8, 0.8) * m, vy: -0.6 * m, gravity: -3 * m, life: T.addon - late, size: 0.2, spin: rand(-6, 6) * m, book: 'addon' });
      }
      v.age += dt;
    }
    for (const [id, v] of views) if (!live.has(id)) drop(id, v);
  }

  /** Where a shot lands (the sim already applied the damage): the element's burst, a decal, a fusion's add-on, a chain's links. */
  function impact(e) {
    const plan = attackLight(e, { reduced: stage.reduced });
    if (!plan) return;
    const got = bookPlan(fx, plan);
    const { el, cls, step, g } = plan;
    if (e.chain && e.chain.length > 1) attacks.chain(e.chain, plan, got);
    if (e.kind === 'zap' || e.kind === 'pounce') return; // the chain (or the pounce's slash) is the hit
    const miss = e.miss ? 0.7 : 1;
    const y = e.y + 0.3;
    if (el === 'poison') {
      // the glob splats (and splits in two at 128+), flinging drips
      const box = (w) => ({ w, h: w, fit: true, rot: rand(0, Math.PI * 2) });
      if (got.splat) trails.decal(vfx('poison', 'splat'), e.x, e.y, { ...box(S.splat * g * miss * Math.sqrt(got.splat)), grow: G.splat, book: 'splat' });
      if (got.split) {
        const a = rand(0, Math.PI);
        for (const side of [-1, 1]) trails.decal(vfx('poison', 'splat'), e.x + Math.cos(a) * 0.55 * side, e.y + Math.sin(a) * 0.4 * side, { ...box(S.splat * g * 0.6 * Math.sqrt(got.split)), grow: G.split, book: 'split' });
      }
      const nd = allowed(3, got.splash);
      const m = stage.reduced ? 0.2 : 1;
      for (let i = 0; i < nd; i++) fx.particle(vfx('poison', 'drip'), e.x, y, { vx: rand(-2.5, 2.5) * m, vy: rand(1.5, 3) * m, gravity: -10, life: T.drip, size: S.drip, drag: 0.5, book: 'splash' });
    } else if (got.burst) {
      const piece = el ? IMPACT_PIECE[el] : 'dust';
      const owner = el ?? 'earth';
      const size = S.burst * g * miss * (e.kind === 'skill' ? 1.25 : 1) * Math.sqrt(got.burst);
      trails.piece(vfx(owner, piece), e.x, y, { w: size, h: size, fit: true, grow: [0.55, G.burst], life: T.burst, fadeIn: 0.02, fadeOut: 0.45, rot: rand(0, Math.PI * 2), tint: VFX_PIECES[owner][piece].tint ? cls.tint : 0xffffff, book: 'burst' });
    }
    if (got.mark && IMPACT_DECAL[el]) {
      const w = S.frost * g * Math.sqrt(got.mark);
      trails.decal(vfx(el, IMPACT_DECAL[el]), e.x, e.y - 0.1, { w, h: el === 'earth' ? w * VFX_ASPECT.crack : w, fit: true, rot: rand(0, Math.PI * 2), book: 'mark' });
    }
    if (got.hitAddon && step) attacks.addon(cls.partner, allowed(2, got.hitAddon), e.x, y, { book: 'hitAddon' });
  }

  function reset() {
    for (const [id, v] of views) drop(id, v);
    for (const v of puddles.values()) {
      v.sp.visible = false;
      sparePuddles.push(v);
    }
    puddles.clear();
  }

  return { sync, impact, reset };
}
