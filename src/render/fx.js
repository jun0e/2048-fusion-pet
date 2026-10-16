// Pooled visual effects in world space: particles (soft dots, sparks and the attacks' bits),
// expanding rings, explosions, damage numbers (bitmap font), beams and coin drops, all in normal
// blend (nothing on the field is additive). The attacks' own shapes are src/render/attacks.js.
// Every local effect books its light here (src/ux/photosafe.js).
import { BitmapFont, BitmapText, Container, Graphics, Sprite } from 'pixi.js';
import { softDot, ringTex, sparkTex, coinTex, boomFrames } from './textures.js';
import { BURST, COIN, LINE, NUMBER, createLightBudget, fitBoom, fitRing } from '../ux/photosafe.js';

const MAX_PARTS = 900;
const MAX_NUMS = 90;

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${Math.max(1, Math.round(n))}`);
const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));

export function createFx(stage) {
  const { layers } = stage;
  BitmapFont.install({
    name: 'Dmg',
    chars: [['0', '9'], '.', 'k', 'M', '+', '-', '!', '×', ' '],
    resolution: 2,
    padding: 6,
    style: {
      fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif',
      fontWeight: '800',
      fontSize: 44,
      fill: 0xffffff,
      stroke: { color: 0x2b1d2a, width: 7, join: 'round' },
    },
  });

  // --- particles -------------------------------------------------------------
  const partLayer = new Container();
  layers.fx.addChild(partLayer);
  const parts = [];
  // photosafe: rings, explosions, lines, bursts, the attacks' sprites and enemies' hit flashes share a
  // light budget (src/ux/photosafe.js POINT), so what they light at the same moment never adds up to a large flash
  let light = createLightBudget();
  const free = [];

  /**
   * One pooled particle: `size` is its long edge in world units (a texture keeps its aspect); it
   * shows `delay` s from now (a meteor's dust where it lands) for `life` s. Not booked: callers book.
   */
  function particle(tex, x, y, { vx = 0, vy = 0, life = 0.5, size = 0.2, grow = 0, color = 0xffffff, alpha = 1, gravity = 0, drag = 0, spin = 0, rot = 0, delay = 0 } = {}) {
    let p = free.pop();
    if (!p) {
      if (parts.length >= MAX_PARTS) return null;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5);
      p = { sp };
      partLayer.addChild(sp);
    }
    p.sp.texture = tex;
    p.sp.visible = delay <= 0;
    p.sp.tint = hex(color);
    p.sp.rotation = rot;
    Object.assign(p, { x, y, vx, vy, life, max: life, size, grow, alpha, gravity, drag, spin, delay });
    parts.push(p);
    return p;
  }

  function burst(x, y, color, n = 12, { speed = 4, size = 0.18, life = 0.5, gravity = -6, spread = Math.PI * 2, dir = 0 } = {}) {
    const cols = Array.isArray(color) ? color : [color];
    // fewer particles when the light budget is short (each lights about BURST.perSize2 × size²)
    n = Math.round(n * light.book(n * BURST.perSize2 * size * size, life * 1.2));
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      particle(i % 3 ? softDot() : sparkTex(), x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.6 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        color: cols[i % cols.length],
        gravity,
        drag: 2,
        spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  /** A ring growing from r0 to r1: at most POINT.ringMax, smaller (or none) when the light budget is short. */
  function ring(x, y, color, r0, r1, life = 0.35) {
    const r = fitRing(light, r0, r1, life);
    if (!r) return null;
    return particle(ringTex(), x, y, { life, size: r.r0 * 2, grow: (r.r1 - r.r0) * 2, color, alpha: 0.9 });
  }

  // --- damage numbers ---------------------------------------------------------
  const nums = [];
  const freeNums = [];
  function number(x, y, amount, { color = 0xffffff, crit = false, small = false, prefix = '' } = {}) {
    if (amount < 0.5) return;
    const scale = crit ? 0.52 : small ? 0.3 : 0.36;
    if (!light.bookAll(NUMBER.lit * (scale / NUMBER.scale) ** 2, NUMBER.life)) return; // skipped when the light budget is short
    let n = freeNums.pop();
    if (!n) {
      if (nums.length >= MAX_NUMS) {
        n = nums.shift(); // recycle the oldest
      } else {
        const t = new BitmapText({ text: '0', style: { fontFamily: 'Dmg', fontSize: 44 } });
        t.anchor.set(0.5);
        layers.numbers.addChild(t);
        n = { t };
      }
    }
    n.t.text = prefix + fmt(amount) + (crit ? '!' : '');
    n.t.tint = hex(color);
    n.t.visible = true;
    Object.assign(n, { x: x + (Math.random() - 0.5) * 0.4, y: y + 0.4, vy: 2.6, life: NUMBER.life, max: NUMBER.life, scale });
    nums.push(n);
  }

  // --- beams (Graphics redrawn while alive; rare: a heal's beam, a namecard's ribbon) ----------
  const lineLayer = new Container();
  layers.fx.addChild(lineLayer);
  const lines = []; // { g, x0, y0, x1, y1, color, life, max, scale }

  /** A beam from (x0, y0) to (x1, y1): a heal reaching its block, a namecard reaching its pet. */
  function beam(x0, y0, x1, y1, color) {
    const k = light.book(Math.hypot(x1 - x0, y1 - y0) * LINE.beam, 0.4, LINE.minShare); // LINE.beam wide at most
    if (!k) return;
    const g = new Graphics();
    lineLayer.addChild(g);
    lines.push({ g, x0, y0, x1, y1, color: hex(color), life: 0.4, max: 0.4, scale: k });
  }

  // --- update -------------------------------------------------------------------
  // --- explosions: an 8-frame animation at the point of contact ----------------
  const boomLayer = new Container();
  layers.fx.addChild(boomLayer);
  const booms = [];
  /** `kind` = element (or 'plain'); `size` in world units. */
  function explode(x, y, kind, size = 1.6, { dur = 0.36 } = {}) {
    size = fitBoom(light, size, dur); // photosafe: at most POINT.boomMax, smaller (or none) when the light budget is short
    if (!size) return;
    if (booms.length > 60) booms.shift().sp.destroy();
    const frames = boomFrames(kind);
    const sp = new Sprite(frames[0]);
    sp.anchor.set(0.5);
    boomLayer.addChild(sp);
    booms.push({ sp, frames, x, y, size, t: 0, dur });
  }

  function updateBooms(dt) {
    const U = stage.view.U;
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      b.t += dt;
      if (b.t >= b.dur) {
        b.sp.destroy();
        booms.splice(i, 1);
        continue;
      }
      b.sp.texture = b.frames[Math.min(b.frames.length - 1, Math.floor((b.t / b.dur) * b.frames.length))];
      b.sp.position.set(stage.sx(b.x), stage.sy(b.y));
      b.sp.width = b.sp.height = b.size * U;
    }
  }

  // --- coins: pop out of a kill, then fly to the HUD coin counter ---------------
  const coinLayer = new Container();
  layers.numbers.addChild(coinLayer);
  const coins = [];
  /** `target()` returns the counter's world position (it follows resizes). */
  function coinDrop(x, y, n, target, onArrive) {
    // fewer coins fly when the light budget is short (the counter still pulses once)
    const m = Math.round(n * light.book(n * COIN.lit, COIN.life(n)));
    if (!m && n > 0) onArrive?.();
    n = m;
    for (let i = 0; i < n && coins.length < 80; i++) {
      const sp = new Sprite(coinTex());
      sp.anchor.set(0.5);
      coinLayer.addChild(sp);
      const a = Math.random() * Math.PI * 2;
      const v = 1.6 + Math.random() * 1.8;
      coins.push({ sp, x, y, vx: Math.cos(a) * v, vy: 2.5 + Math.random() * 2, t: 0, hang: 0.28 + i * 0.05, fly: 0.45, target, onArrive, sx: 0, sy: 0 });
    }
  }

  function updateCoins(dt) {
    const U = stage.view.U;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt;
      let x;
      let y;
      if (c.t < c.hang) {
        // pop up and spread, with a bit of gravity
        c.vy -= 12 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        x = c.x;
        y = c.y;
        c.sx = x;
        c.sy = y;
      } else {
        const k = Math.min(1, (c.t - c.hang) / c.fly);
        const e = k * k * (3 - 2 * k);
        const tg = c.target();
        x = c.sx + (tg.x - c.sx) * e;
        y = c.sy + (tg.y - c.sy) * e + Math.sin(k * Math.PI) * 0.8;
        if (k >= 1) {
          c.sp.destroy();
          coins.splice(i, 1);
          c.onArrive?.();
          continue;
        }
      }
      c.sp.position.set(stage.sx(x), stage.sy(y));
      const s = 0.42 * U * (1 + 0.1 * Math.sin(c.t * 20));
      c.sp.height = s;
      c.sp.width = s * Math.abs(Math.cos(c.t * 9)) * 0.7 + s * 0.3; // spinning
    }
  }

  function update(dt) {
    light.tick(dt);
    updateCoins(dt);
    updateBooms(dt);
    const U = stage.view.U;
    const sx = stage.sx;
    const sy = stage.sy;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      let step = dt;
      if (p.delay > 0) {
        // waiting to show: its life starts when its delay runs out
        if (p.delay >= dt) {
          p.delay -= dt;
          continue;
        }
        step = dt - p.delay;
        p.delay = 0;
        p.sp.visible = true;
      }
      p.life -= step;
      if (p.life <= 0) {
        p.sp.visible = false;
        parts.splice(i, 1);
        free.push(p);
        continue;
      }
      p.vy += p.gravity * step;
      const k = Math.exp(-p.drag * step);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.size = Math.max(0, p.size + p.grow * step / p.max);
      const f = p.life / p.max;
      p.sp.position.set(sx(p.x), sy(p.y));
      p.sp.scale.set((p.size * U) / Math.max(p.sp.texture.width, p.sp.texture.height, 1)); // the long edge is `size`
      p.sp.alpha = p.alpha * Math.min(1, f * 1.6);
      p.sp.rotation += p.spin * dt;
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.life -= dt;
      if (n.life <= 0) {
        n.t.visible = false;
        nums.splice(i, 1);
        freeNums.push(n);
        continue;
      }
      n.vy *= Math.exp(-dt * 4);
      n.y += n.vy * dt;
      const f = n.life / n.max;
      const pop = f > 0.85 ? 1 + (f - 0.85) * 3 : 1;
      n.t.position.set(sx(n.x), sy(n.y));
      n.t.scale.set((n.scale * pop * U) / 44);
      n.t.alpha = Math.min(1, f * 2.2);
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.life -= dt;
      if (l.life <= 0) {
        l.g.destroy();
        lines.splice(i, 1);
        continue;
      }
      const f = l.life / l.max;
      l.g.clear();
      const k = 1 - f; // the head races ahead, the tail follows
      const hx = l.x0 + (l.x1 - l.x0) * Math.min(1, k * 2.2);
      const hy = l.y0 + (l.y1 - l.y0) * Math.min(1, k * 2.2);
      l.g.moveTo(sx(l.x0), sy(l.y0)).lineTo(sx(hx), sy(hy)).stroke({ width: LINE.beam * U * f * l.scale, color: l.color, alpha: 0.55 * f, cap: 'round' });
      l.g.moveTo(sx(l.x0), sy(l.y0)).lineTo(sx(hx), sy(hy)).stroke({ width: LINE.beamCore * U * f * l.scale, color: 0xfffaf2, alpha: f, cap: 'round' });
    }
  }

  function reset() {
    light = createLightBudget();
    for (const c of coins) c.sp.destroy();
    coins.length = 0;
    for (const b of booms) b.sp.destroy();
    booms.length = 0;
    for (const p of parts) p.sp.visible = false;
    free.push(...parts.splice(0));
    for (const n of nums) n.t.visible = false;
    freeNums.push(...nums.splice(0));
    for (const l of lines) l.g.destroy();
    lines.length = 0;
  }

  return {
    particle,
    burst,
    ring,
    number,
    beam,
    coinDrop,
    explode,
    update,
    reset,
    /** Book a flash that lights `lit` for `life` seconds (from `delay` s on) into the light budget, whole or not at all (an enemy's hit flash). */
    flashAll: (lit, life, delay = 0) => light.bookAll(lit, life, delay),
    /** Book as much of it as fits (0 below minShare): → the share booked, to draw it at (a text popup's size). */
    flashShare: (lit, life, minShare = 0, delay = 0) => light.book(lit, life, minShare, delay),
    /** What the local effects light now (world units², to 10% or more), for checks. */
    get lit() {
      return light.used;
    },
  };
}
