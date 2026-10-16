// Pooled attack trails and pieces (the visual overhaul, proposal sections 5 and 8.3 item 1):
//   ribbons      a MeshRope per trail with its element's 64×16 band (textures.js ribbonTex):
//                RIBBON_POINTS points, head first, tapering toward the tail, the band scrolling
//   afterimages  2–3 ghosts of a moving body at 60/30/15% alpha, 80 ms apart (createAfterimage)
//   shot slots   what rides with a projectile: its afterimage, its tether back to the shooter
//                (a thin plum line under a coloured one), escorts and an add-on rider
//   decals       ground sprites under the foes (stage.layers.path) that fade over seconds
//   pieces       tweened sprites for the attacks' shapes and impacts (tongue, ring, links …)
// Caps: 24 live shots, 16 ribbons, 48 decals. Normal blend only, all from shared textures, so it
// batches. Moving bodies, ribbons and ghosts are outside the light budget (they move rather than
// flash); pieces and decals are booked by their callers (src/art/attack-vfx.js attackLight).
import { Container, MeshRope, Point, Sprite, Texture } from 'pixi.js';
import { DECAL } from '../ux/photosafe.js';
import { RIBBON_PX, ribbonTex } from './textures.js';

export const TRAIL_CAPS = { shots: 24, ribbons: 16, decals: 48, pieces: 240 };
export const RIBBON_POINTS = 10;
/** Afterimage ghosts: `gap` seconds apart, at these alphas (the first is the newest). */
export const GHOST = { gap: 0.08, alphas: [0.6, 0.3, 0.15] };

const easeOut = (k) => 1 - (1 - k) * (1 - k);

/**
 * A sprite's size in world units: `w` wide and `h` tall (h from the texture's aspect when not
 * given); with `fit`, w × h is a box the sprite fits inside keeping its own aspect (a generated
 * sprite never outgrows the box its light was booked for).
 */
export function sizeOf(texture, o) {
  const tw = texture.width || 1;
  const th = texture.height || 1;
  const w = o.w ?? 1;
  const h = o.h ?? (w * th) / tw;
  if (!o.fit) return [w, h];
  const k = Math.min(w / tw, h / th);
  return [tw * k, th * k];
}

/**
 * A fixed pool of at most `cap` slots handed out by key (`make(i)` builds slot i once). When
 * every slot is live, `take(key, { steal: true })` recycles the oldest; otherwise it gives null.
 */
export function createSlots(cap, make) {
  const all = [];
  const free = [];
  const live = new Map(); // key → slot, oldest first
  let stamp = 0;
  function release(key) {
    const s = live.get(key);
    if (!s) return;
    live.delete(key);
    s.key = null;
    s.onRelease?.(s);
    free.push(s);
  }
  return {
    get size() {
      return live.size;
    },
    get built() {
      return all.length;
    },
    get: (key) => live.get(key) ?? null,
    take(key, { steal = false } = {}) {
      if (live.has(key)) return live.get(key);
      let s = free.pop();
      if (!s && all.length < cap) {
        s = make(all.length);
        all.push(s);
      }
      if (!s && steal && live.size) {
        release(live.keys().next().value); // Map order: the oldest first
        s = free.pop();
      }
      if (!s) return null;
      s.key = key;
      s.stamp = ++stamp;
      live.set(key, s);
      return s;
    },
    release,
    forEach(fn) {
      for (const s of live.values()) fn(s);
    },
    clear() {
      for (const k of [...live.keys()]) release(k);
    },
  };
}

/**
 * Ghosts of a moving body: push where it is drawn each frame (in `layer`'s coordinates, px),
 * draw up to `max` copies GHOST.gap seconds apart behind it. Used for harpoons and for pets
 * leaping on a pounce (src/render/blocks.js, src/kv/roam.js).
 */
export function createAfterimage(layer, max = 3) {
  const ghosts = [];
  for (let i = 0; i < max; i++) {
    const sp = new Sprite(Texture.EMPTY);
    sp.visible = false;
    layer.addChild(sp);
    ghosts.push(sp);
  }
  const N = 32; // ring buffer of samples: t, x, y, sx, sy, rot
  const buf = new Float64Array(N * 6);
  let head = -1;
  let count = 0;
  let now = 0;
  /** Interpolated sample at time `t` into out (false when the history is too short). */
  const sampleAt = (t, out) => {
    for (let k = 0; k < count - 1; k++) {
      const i = ((head - k) % N + N) % N;
      const j = ((head - k - 1) % N + N) % N;
      const ti = buf[i * 6];
      const tj = buf[j * 6];
      if (tj <= t && t <= ti) {
        const f = ti > tj ? (t - tj) / (ti - tj) : 0;
        for (let c = 1; c < 6; c++) out[c] = buf[j * 6 + c] + (buf[i * 6 + c] - buf[j * 6 + c]) * f;
        return true;
      }
    }
    return false;
  };
  const tmp = new Float64Array(6);
  return {
    /** Record where the body is drawn now, `dt` seconds after the last push. */
    push(dt, x, y, sx, sy, rot) {
      now += dt;
      head = (head + 1) % N;
      count = Math.min(N, count + 1);
      const o = head * 6;
      buf[o] = now;
      buf[o + 1] = x;
      buf[o + 2] = y;
      buf[o + 3] = sx;
      buf[o + 4] = sy;
      buf[o + 5] = rot;
    },
    /** Draw `n` ghosts behind it (0: none) with the body's texture, tint and anchor. */
    draw(n, texture, tint = 0xffffff, ax = 0.5, ay = 0.5, alpha = 1) {
      for (let k = 0; k < ghosts.length; k++) {
        const g = ghosts[k];
        if (k >= n || !sampleAt(now - GHOST.gap * (k + 1), tmp)) {
          g.visible = false;
          continue;
        }
        g.visible = true;
        g.texture = texture;
        g.tint = tint;
        g.anchor.set(ax, ay);
        g.position.set(tmp[1], tmp[2]);
        g.scale.set(tmp[3], tmp[4]);
        g.rotation = tmp[5];
        g.alpha = GHOST.alphas[k] * alpha;
      }
    },
    clear() {
      count = 0;
      head = -1;
      for (const g of ghosts) g.visible = false;
    },
    destroy() {
      for (const g of ghosts) g.destroy();
      ghosts.length = 0;
    },
  };
}

/** `bandTex(el)`: a ribbon's band (textures.js ribbonTex; tests pass a plain texture). */
export function createTrails(stage, { bandTex = ribbonTex } = {}) {
  const { layers } = stage;
  const decalLayer = new Container(); // on the ground, under the foes
  layers.path.addChild(decalLayer);
  const trailLayer = new Container(); // ribbons, tethers and ghosts, under the shots' bodies
  layers.shots.addChild(trailLayer);
  const pieceLayer = new Container(); // the attacks' shapes and impacts
  layers.fx.addChild(pieceLayer);
  const sx = stage.sx;
  const sy = stage.sy;
  let reduced = false;

  // --- ribbons ---------------------------------------------------------------------------
  const ribbons = createSlots(TRAIL_CAPS.ribbons, () => {
    const pts = Array.from({ length: RIBBON_POINTS }, (_, i) => new Point(i, 0));
    const rope = new MeshRope({ texture: bandTex('wind'), points: pts, textureScale: 1 }); // > 0: the band repeats
    rope.autoUpdate = false; // trails.update writes the vertices: tapered, the band scrolling
    rope.onRender = null; // nor may Pixi rebuild them (it does when a band's height changes)
    rope.visible = false;
    trailLayer.addChild(rope);
    return {
      rope,
      xs: new Float32Array(RIBBON_POINTS), // world points, the head first
      ys: new Float32Array(RIBBON_POINTS),
      n: 0, // points in use
      width: 0.35, // world units at the head
      taper: 0.3, // the tail's share of the head's width
      scroll: 0, // band offset (in bands)
      speed: 0, // bands per second
      alpha: 1,
      onRelease: (s) => (s.rope.visible = false),
    };
  });

  /** A ribbon (null when 16 are out and `steal` is off): set its points, width and look, then it draws each frame. */
  function ribbon(key, el, tint, { width = 0.35, taper = 0.3, speed = -2.5, alpha = 1, steal = true } = {}) {
    const r = ribbons.take(key, { steal });
    if (!r) return null;
    const t = bandTex(el);
    if (r.rope.texture !== t) r.rope.texture = t;
    Object.assign(r, { width, taper, speed, alpha, n: 0, scroll: Math.random() });
    r.rope.tint = tint;
    r.rope.visible = true;
    return r;
  }

  /** Write a ribbon's vertices: its points to screen, half-widths tapering to the tail, the band along it. */
  function drawRibbon(r, U, dt) {
    const g = r.rope.geometry;
    const posBuf = g.getBuffer('aPosition');
    const uvBuf = g.getBuffer('aUV');
    const pos = posBuf.data;
    const uv = uvBuf.data;
    const n = Math.max(1, Math.min(RIBBON_POINTS, r.n));
    const head = (r.width * U) / 2;
    const band = (RIBBON_PX.w / RIBBON_PX.h) * r.width * U; // one repeat keeps the band's aspect
    r.scroll += r.speed * dt;
    let along = 0;
    let px = sx(r.xs[0]);
    let py = sy(r.ys[0]);
    for (let i = 0; i < RIBBON_POINTS; i++) {
      const j = Math.min(i, n - 1);
      const x = sx(r.xs[j]);
      const y = sy(r.ys[j]);
      const a = Math.max(0, j - 1);
      const b = Math.min(n - 1, j + 1);
      const tx = sx(r.xs[b]) - sx(r.xs[a]);
      const ty = sy(r.ys[b]) - sy(r.ys[a]);
      const tl = Math.hypot(tx, ty) || 1;
      const half = i < n && n > 1 ? head * (1 - (1 - r.taper) * (j / (n - 1))) : 0;
      const nx = (-ty / tl) * half;
      const ny = (tx / tl) * half;
      pos[i * 4] = x + nx;
      pos[i * 4 + 1] = y + ny;
      pos[i * 4 + 2] = x - nx;
      pos[i * 4 + 3] = y - ny;
      along += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      const u = along / band + r.scroll;
      uv[i * 4] = u;
      uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = u;
      uv[i * 4 + 3] = 1;
    }
    posBuf.update();
    uvBuf.update();
    r.rope.alpha = r.alpha;
  }

  // --- shot slots: what rides with a projectile ------------------------------------------------
  const line = () => {
    const sp = new Sprite(Texture.WHITE);
    sp.anchor.set(0, 0.5);
    sp.visible = false;
    trailLayer.addChild(sp);
    return sp;
  };
  const body = () => {
    const sp = new Sprite(Texture.EMPTY);
    sp.anchor.set(0.5);
    sp.visible = false;
    trailLayer.addChild(sp);
    return sp;
  };
  const shotSlots = createSlots(TRAIL_CAPS.shots, () => {
    const slot = {
      ghosts: createAfterimage(trailLayer, GHOST.alphas.length),
      tetherInk: line(),
      tether: line(),
      escorts: [body(), body()],
      rider: body(),
      ribbon: null, // the apex echo: a ribbon taken with `ribbonKey` (ribbon() steals the oldest, so it may go to another owner)
      ribbonKey: null,
      onRelease: (s) => {
        s.ghosts.clear();
        s.tetherInk.visible = s.tether.visible = s.rider.visible = false;
        for (const e of s.escorts) e.visible = false;
        if (s.ribbonKey != null) ribbons.release(s.ribbonKey); // its own only: a stolen one is no longer under that key
        s.ribbon = s.ribbonKey = null;
      },
    };
    return slot;
  });

  /** A shot's apex ribbon (null when 16 ribbons are out: a shot never steals one), released with its slot. */
  function shotRibbon(slot, key, el, tint, o) {
    slot.ribbon = ribbon(key, el, tint, { ...o, steal: false });
    slot.ribbonKey = slot.ribbon ? key : null;
    return slot.ribbon;
  }

  /** Lay a shot's tether from (x0, y0) to (x1, y1) (world units): a plum line under a coloured one, `k` of its width. */
  function tether(slot, x0, y0, x1, y1, color, U, alpha = 1, k = 1) {
    const ax = sx(x0);
    const ay = sy(y0);
    const len = Math.hypot(sx(x1) - ax, sy(y1) - ay);
    const rot = Math.atan2(sy(y1) - ay, sx(x1) - ax);
    layLine(slot.tetherInk, ax, ay, len, rot, Math.max(1, 0.07 * U * k), 0x2b1d2e, alpha);
    layLine(slot.tether, ax, ay, len, rot, Math.max(1, 0.035 * U * k), color, alpha);
  }
  function layLine(sp, x, y, len, rot, height, tint, alpha) {
    sp.visible = len > 1;
    sp.position.set(x, y);
    sp.rotation = rot;
    sp.width = len;
    sp.height = height;
    sp.tint = tint;
    sp.alpha = alpha;
  }

  // --- decals --------------------------------------------------------------------------------
  const decals = createSlots(TRAIL_CAPS.decals, () => {
    const sp = new Sprite(Texture.EMPTY);
    sp.anchor.set(0.5);
    sp.visible = false;
    decalLayer.addChild(sp);
    return { sp, onRelease: (s) => (s.sp.visible = false) };
  });
  let decalId = 0;
  /**
   * A ground decal at (x, y), sized as sizeOf (w, h, fit), `delay` s from now (a crater where the
   * meteor lands), growing to `grow` as it fades in over DECAL.rise, then holding and fading out.
   * The caller books its rise (attackLight).
   */
  function decal(texture, x, y, o = {}) {
    const d = decals.take(++decalId, { steal: true });
    const [w, h] = sizeOf(texture, o);
    d.sp.texture = texture;
    d.sp.tint = o.tint ?? 0xffffff;
    d.sp.rotation = o.rot ?? 0;
    d.sp.visible = false;
    d.sp.alpha = 0;
    Object.assign(d, { x, y, w, h, a: o.alpha ?? DECAL.alpha, hold: o.hold ?? DECAL.hold, fall: o.fall ?? DECAL.fall, grow: o.grow ?? 1, t: -(o.delay ?? 0) });
    return d;
  }

  // --- pieces: tweened sprites ---------------------------------------------------------------
  const pieces = createSlots(TRAIL_CAPS.pieces, () => {
    const sp = new Sprite(Texture.EMPTY);
    sp.visible = false;
    pieceLayer.addChild(sp);
    return { sp, onRelease: (s) => (s.sp.visible = false) };
  });
  let pieceId = 0;
  /**
   * A tweened sprite at (x, y), world units, sized as sizeOf (w, h, fit), `life` seconds after
   * `delay`; it moves (vx, vy, gravity, drag), spins, scales from grow[0] to grow[1] (eased out)
   * and fades in over `fadeIn` s and out from `fadeOut` (share of its life). `follow(p, k, dt)`
   * may steer it each frame (k: 0–1 of its life). Under Reduce motion it holds its place unless
   * `essential`.
   */
  function piece(texture, x, y, o = {}) {
    const p = pieces.take(++pieceId, { steal: true });
    const sp = p.sp;
    const [w, h] = sizeOf(texture, o);
    sp.texture = texture;
    sp.anchor.set(o.ax ?? 0.5, o.ay ?? 0.5);
    sp.tint = o.tint ?? 0xffffff;
    sp.visible = false;
    const still = reduced && !o.essential;
    Object.assign(p, {
      x,
      y,
      vx: still ? 0 : (o.vx ?? 0),
      vy: still ? 0 : (o.vy ?? 0),
      gravity: still ? 0 : (o.gravity ?? 0),
      drag: o.drag ?? 0,
      w,
      h,
      rot: o.rot ?? 0,
      spin: still ? 0 : (o.spin ?? 0),
      flip: o.flip ? -1 : 1,
      life: o.life ?? 0.3,
      t: -(o.delay ?? 0),
      g0: still ? (o.grow?.[1] ?? 1) : (o.grow?.[0] ?? 1),
      g1: o.grow?.[1] ?? 1,
      alpha: o.alpha ?? 1,
      fadeIn: o.fadeIn ?? 0.04,
      fadeOut: o.fadeOut ?? 0.6,
      follow: still ? null : (o.follow ?? null),
    });
    return p;
  }

  // --- update ------------------------------------------------------------------------------
  const doneDecals = [];
  const donePieces = [];
  function update(dt) {
    const U = stage.view.U;
    ribbons.forEach((r) => {
      if (r.rope.visible) drawRibbon(r, U, dt);
    });
    decals.forEach((d) => {
      d.t += dt;
      if (d.t < 0) return; // not yet: it waits its delay
      const end = DECAL.rise + d.hold + d.fall;
      if (d.t >= end) return doneDecals.push(d.key);
      d.sp.visible = true;
      const a = d.t < DECAL.rise ? d.t / DECAL.rise : d.t < DECAL.rise + d.hold ? 1 : 1 - (d.t - DECAL.rise - d.hold) / d.fall;
      const s = 1 + (d.grow - 1) * easeOut(Math.min(1, d.t / DECAL.rise));
      d.sp.alpha = d.a * a;
      d.sp.position.set(sx(d.x), sy(d.y));
      d.sp.width = d.w * U * s;
      d.sp.height = d.h * U * s;
    });
    pieces.forEach((p) => {
      p.t += dt;
      if (p.t < 0) return;
      const k = p.t / p.life;
      if (k >= 1) return donePieces.push(p.key);
      if (p.follow) p.follow(p, k, dt);
      else {
        p.vy += p.gravity * dt;
        if (p.drag) {
          const f = Math.exp(-p.drag * dt);
          p.vx *= f;
          p.vy *= f;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.rot += p.spin * dt;
      const s = p.g0 + (p.g1 - p.g0) * easeOut(k);
      const sp = p.sp;
      const tw = sp.texture.width || 1;
      const th = sp.texture.height || 1;
      sp.visible = true;
      sp.position.set(sx(p.x), sy(p.y));
      sp.rotation = p.rot;
      sp.scale.set((p.w * U * s) / tw, (p.flip * p.h * U * s) / th);
      sp.alpha = p.alpha * Math.min(1, p.t / p.fadeIn) * (k > p.fadeOut ? (1 - k) / (1 - p.fadeOut) : 1);
    });
    for (const key of doneDecals) decals.release(key);
    for (const key of donePieces) pieces.release(key);
    doneDecals.length = donePieces.length = 0;
  }

  function reset() {
    ribbons.clear();
    shotSlots.clear();
    decals.clear();
    pieces.clear();
  }

  return {
    ribbon,
    releaseRibbon: (key) => ribbons.release(key),
    /** The trail slot riding with shot `id` (null when 24 shots already have one). */
    attach: (id) => shotSlots.take(id),
    detach: (id) => shotSlots.release(id),
    shotRibbon,
    tether,
    decal,
    piece,
    update,
    reset,
    /** Reduce motion: pieces hold their place (unless essential), ribbons fade in place (callers ask). */
    setReduced(v) {
      reduced = !!v;
    },
    get reduced() {
      return reduced;
    },
    /** Live counts, for checks: shots, ribbons, decals, pieces. */
    get counts() {
      return { shots: shotSlots.size, ribbons: ribbons.size, decals: decals.size, pieces: pieces.size };
    },
    layers: { decal: decalLayer, trail: trailLayer, piece: pieceLayer },
  };
}
