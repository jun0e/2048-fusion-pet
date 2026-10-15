// Pooled visual effects in world space: additive particles, expanding rings,
// damage numbers (bitmap font), lightning arcs, wind slashes, sky bolts,
// meteors and poison contagion lines.
import { BitmapFont, BitmapText, Container, Graphics, Sprite } from 'pixi.js';
import { laneAt } from '../config.js';
import { softDot, ringTex, sparkTex, projTex, coinTex, boomFrames } from './textures.js';
import { FLASH_DOT } from '../ux/photosafe.js';

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
  const free = [];

  function particle(tex, x, y, { vx = 0, vy = 0, life = 0.5, size = 0.2, grow = 0, color = 0xffffff, alpha = 1, gravity = 0, drag = 0, spin = 0, add = true, rot = 0 } = {}) {
    let p = free.pop();
    if (!p) {
      if (parts.length >= MAX_PARTS) return null;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5);
      p = { sp };
      partLayer.addChild(sp);
    }
    p.sp.texture = tex;
    p.sp.visible = true;
    p.sp.blendMode = add ? 'add' : 'normal';
    p.sp.tint = hex(color);
    p.sp.rotation = rot;
    Object.assign(p, { x, y, vx, vy, life, max: life, size, grow, alpha, gravity, drag, spin });
    parts.push(p);
    return p;
  }

  function burst(x, y, color, n = 12, { speed = 4, size = 0.18, life = 0.5, gravity = -6, spread = Math.PI * 2, dir = 0 } = {}) {
    const cols = Array.isArray(color) ? color : [color];
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

  function ring(x, y, color, r0, r1, life = 0.35, width = 1) {
    const p = particle(ringTex(), x, y, { life, size: r0 * 2, grow: (r1 - r0) * 2, color, alpha: 0.9 });
    if (p) p.width = width;
    return p;
  }

  function trail(x, y, color, size = 0.22) {
    particle(softDot(), x, y, { life: 0.22, size, grow: -size * 0.6, color, alpha: 0.75 });
  }

  // --- damage numbers ---------------------------------------------------------
  const nums = [];
  const freeNums = [];
  function number(x, y, amount, { color = 0xffffff, crit = false, small = false, prefix = '' } = {}) {
    if (amount < 0.5) return;
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
    Object.assign(n, { x: x + (Math.random() - 0.5) * 0.4, y: y + 0.4, vy: 2.6, life: 0.75, max: 0.75, scale: crit ? 0.52 : small ? 0.3 : 0.36 });
    nums.push(n);
  }

  // --- arcs, slashes, bolts, meteors (Graphics redrawn while alive) ----------------
  const lineLayer = new Container();
  layers.fx.addChild(lineLayer);
  const lines = []; // { g, kind, pts, color, life, max, ... }

  function lightning(points, color = 0xffe14d, life = 0.2, width = 1) {
    const g = new Graphics();
    g.blendMode = 'add';
    lineLayer.addChild(g);
    lines.push({ g, kind: 'arc', pts: points, color: hex(color), life, max: life, width, seed: Math.random() * 100 });
    for (const p of points.slice(1)) burst(p.x, p.y, [color, 0xffffff], 5, { speed: 3, size: 0.14, life: 0.25, gravity: 0 });
  }

  /** A glowing beam from a side die into the block it just classed. */
  function beam(x0, y0, x1, y1, color) {
    const g = new Graphics();
    g.blendMode = 'add';
    lineLayer.addChild(g);
    lines.push({ g, kind: 'beam', x0, y0, x1, y1, color: hex(color), life: 0.4, max: 0.4 });
  }

  function slash(lane, s, len, color) {
    const g = new Graphics();
    g.blendMode = 'add';
    lineLayer.addChild(g);
    lines.push({ g, kind: 'slash', lane, s, len, color: hex(color), life: 0.28, max: 0.28 });
  }

  function bolt(x, y, color = 0xffe14d) {
    const top = { x: x + (Math.random() - 0.5) * 2, y: 13 };
    const pts = [top];
    for (let i = 1; i < 6; i++) pts.push({ x: top.x + (x - top.x) * (i / 6) + (Math.random() - 0.5) * 0.8, y: top.y + (y - top.y) * (i / 6) });
    pts.push({ x, y });
    lightning(pts, color, 0.28, 1.6);
    ring(x, y, color, 0.2, 1.2, 0.3);
  }

  const meteors = [];
  function meteor(x, y, radius, onLand) {
    const sp = new Sprite(projTex('meteor'));
    sp.anchor.set(0.5);
    sp.tint = 0xffb27a;
    lineLayer.addChild(sp);
    meteors.push({ sp, x0: x - 4, y0: y + 9, x, y, t: 0, dur: 0.28, radius, onLand });
  }

  function spread(from, to) {
    const g = new Graphics();
    g.blendMode = 'add';
    lineLayer.addChild(g);
    lines.push({ g, kind: 'spread', pts: [from, to], color: 0xb46cff, life: 0.4, max: 0.4 });
  }

  // --- update -------------------------------------------------------------------
  // --- explosions: an 8-frame animation at the point of contact ----------------
  const boomLayer = new Container();
  layers.fx.addChild(boomLayer);
  const booms = [];
  /** `kind` = element (or 'plain'); `size` in world units. */
  function explode(x, y, kind, size = 1.6, { dur = 0.36, flash = null } = {}) {
    if (booms.length > 60) booms.shift().sp.destroy();
    const frames = boomFrames(kind);
    const sp = new Sprite(frames[0]);
    sp.anchor.set(0.5);
    boomLayer.addChild(sp);
    booms.push({ sp, frames, x, y, size, t: 0, dur });
    // the flash dot stays small and soft (photosafe: many of them never add up to a large flash)
    if (flash != null && !stage.reduced) particle(softDot(), x, y, { life: FLASH_DOT.life, size: Math.min(size * 1.3, FLASH_DOT.maxSize), grow: 0.6, color: flash, alpha: FLASH_DOT.alpha });
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
    updateCoins(dt);
    updateBooms(dt);
    const U = stage.view.U;
    const sx = stage.sx;
    const sy = stage.sy;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sp.visible = false;
        parts.splice(i, 1);
        free.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0, p.size + p.grow * dt / p.max);
      const f = p.life / p.max;
      p.sp.position.set(sx(p.x), sy(p.y));
      p.sp.width = p.sp.height = p.size * U;
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
      if (l.kind === 'arc' || l.kind === 'spread') {
        const jag = l.kind === 'arc' ? 0.28 : 0;
        const draw = (w, a, col) => {
          l.g.moveTo(sx(l.pts[0].x), sy(l.pts[0].y));
          for (let j = 1; j < l.pts.length; j++) {
            const p = l.pts[j - 1];
            const q = l.pts[j];
            for (let s = 1; s <= 3; s++) {
              const t = s / 3;
              const jx = s < 3 ? (Math.random() - 0.5) * jag : 0;
              const jy = s < 3 ? (Math.random() - 0.5) * jag : 0;
              l.g.lineTo(sx(p.x + (q.x - p.x) * t + jx), sy(p.y + (q.y - p.y) * t + jy));
            }
          }
          l.g.stroke({ width: w * U, color: col, alpha: a * f, cap: 'round', join: 'round' });
        };
        draw(0.34 * (l.width ?? 1), 0.35, l.color);
        draw(0.12 * (l.width ?? 1), 1, 0xffffff);
      } else if (l.kind === 'beam') {
        const k = 1 - f; // the head races ahead, the tail follows
        const hx = l.x0 + (l.x1 - l.x0) * Math.min(1, k * 2.2);
        const hy = l.y0 + (l.y1 - l.y0) * Math.min(1, k * 2.2);
        l.g.moveTo(sx(l.x0), sy(l.y0)).lineTo(sx(hx), sy(hy)).stroke({ width: 0.5 * U * f, color: l.color, alpha: 0.55 * f, cap: 'round' });
        l.g.moveTo(sx(l.x0), sy(l.y0)).lineTo(sx(hx), sy(hy)).stroke({ width: 0.14 * U * f, color: 0xffffff, alpha: f, cap: 'round' });
      } else if (l.kind === 'slash') {
        const a = laneAt(l.lane, l.s - l.len);
        const b = laneAt(l.lane, l.s + l.len * 0.3);
        l.g.moveTo(sx(a.x), sy(a.y)).lineTo(sx(b.x), sy(b.y)).stroke({ width: 0.55 * U * f, color: l.color, alpha: 0.5 * f, cap: 'round' });
        l.g.moveTo(sx(a.x), sy(a.y)).lineTo(sx(b.x), sy(b.y)).stroke({ width: 0.16 * U * f, color: 0xffffff, alpha: f, cap: 'round' });
      }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.t += dt;
      const t = Math.min(1, m.t / m.dur);
      const x = m.x0 + (m.x - m.x0) * t;
      const y = m.y0 + (m.y - m.y0) * t;
      m.sp.position.set(sx(x), sy(y));
      m.sp.width = m.sp.height = 1.6 * U;
      m.sp.rotation = Math.atan2(-(m.y - m.y0), m.x - m.x0);
      trail(x, y, 0xff8a3d, 0.9);
      if (t >= 1) {
        m.sp.destroy();
        meteors.splice(i, 1);
        ring(m.x, m.y, 0xffb27a, 0.3, m.radius * 2, 0.5);
        burst(m.x, m.y, [0xff8a3d, 0xffd36b, 0x7a5a3a], 36, { speed: 8, size: 0.32, life: 0.7, gravity: -10 });
        m.onLand?.();
      }
    }
  }

  function reset() {
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
    for (const m of meteors) m.sp.destroy();
    meteors.length = 0;
  }

  return { particle, burst, ring, trail, number, lightning, slash, beam, bolt, meteor, spread, coinDrop, explode, update, reset };
}
