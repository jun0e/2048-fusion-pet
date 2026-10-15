// Projectile views. The basic attacks that fly are Echo Harpoon's ice lance and
// Venom Spit's lobbed glob (plus plain pebbles); the instant ones (breath, gust,
// pulse, quake, pounce, arc) are drawn from their events in main.js. Each shot uses its
// class's first element's shape (fusions tint it in the newest element's colour).
// Every shot has a bold outline, a glow, a ground shadow and a trail; lobbed
// boulders rise and fall over their shadow. Impacts play an element-specific
// 8-frame explosion at the point of contact.
import { Container, Graphics, Sprite } from 'pixi.js';
import { projTex, softDot, shadowTex, hasGenerated } from './textures.js';

const hex = (c) => parseInt(String(c).replace('#', ''), 16);
const SHAPE = { fire: 'fire', ice: 'ice', poison: 'poison', earth: 'earth', wind: 'wind', metal: 'metal', nature: 'nature' };
const SIZE = { lance: 1.45, lob: 1.35, spit: 1.1, sniper: 0.95, spread: 0.9, blade: 1.6, burst: 0.95, homing: 1, single: 1 };
const LOB_HEIGHT = 1.1; // world units at the top of the arc (plus growth: it comes toward the camera)

function lookFor(prof) {
  const element = prof.element;
  const colors = prof.colors;
  if (!element) {
    // plain / dormant: a pebble in the die's colour
    const c = colors[0] ? hex(colors[0]) : 0xfff3d6;
    return { shape: 'pebble', tint: 0xffffff, glow: c, colors: [c, 0xfff6e0] };
  }
  const single = colors.length === 1;
  const useGenerated = single && hasGenerated(`proj.${element}`);
  return {
    shape: SHAPE[element] ?? 'pebble',
    tint: useGenerated ? 0xffffff : hex(colors.at(-1)),
    glow: hex(colors.at(-1)),
    colors: colors.map(hex),
  };
}

export function createShots(stage, fx) {
  const shadowLayer = new Container();
  const layer = new Container();
  stage.layers.shots.addChild(shadowLayer, layer);
  const views = new Map();
  const puddleLayer = new Graphics(); // Venom Spit puddles, on the ground under the foes
  stage.layers.path.addChild(puddleLayer);
  let frame = 0;

  /** Venom puddles: a glossy pool that fades as it dries, with a bubble now and then. */
  function drawPuddles(puddles, U) {
    puddleLayer.clear();
    for (const p of puddles ?? []) {
      const life = Math.max(0, Math.min(1, p.t / p.max));
      const fade = Math.min(1, life * 3); // dries away over its last third
      const x = stage.sx(p.x);
      const y = stage.sy(p.y);
      const r = p.r * U;
      const c = hex(p.prof.colors.at(-1));
      puddleLayer.circle(x, y, r).fill({ color: c, alpha: 0.32 * fade }).stroke({ width: 0.08 * U, color: 0xd8ff7a, alpha: 0.55 * fade });
      puddleLayer.circle(x - r * 0.3, y - r * 0.25, r * 0.35).fill({ color: 0xffffff, alpha: 0.12 * fade });
      if (Math.random() < 0.08 * fade) fx.burst(p.x + (Math.random() - 0.5) * p.r, p.y + (Math.random() - 0.5) * p.r, [0xd8ff7a, c], 1, { speed: 0.6, size: 0.16, life: 0.6, gravity: 1.5 });
    }
  }

  function sync(shots, dt, puddles) {
    frame += 1;
    const U = stage.view.U;
    drawPuddles(puddles, U);
    const live = new Set();
    for (const s of shots) {
      live.add(s.id);
      let v = views.get(s.id);
      if (!v) {
        const look = lookFor(s.prof);
        const glow = new Sprite(softDot());
        glow.anchor.set(0.5);
        glow.blendMode = 'add';
        glow.tint = look.glow;
        const body = new Sprite(projTex(look.shape));
        body.anchor.set(0.5);
        body.tint = look.tint;
        const c = new Container();
        c.addChild(glow, body);
        layer.addChild(c);
        const shadow = new Sprite(shadowTex());
        shadow.anchor.set(0.5);
        shadowLayer.addChild(shadow);
        v = { c, glow, body, shadow, look, px: s.x, py: s.y, spin: 0 };
        views.set(s.id, v);
      }
      // burst shots wait their turn inside the block
      const waiting = s.delay > 0;
      v.c.visible = v.shadow.visible = !waiting;
      if (waiting) continue;

      const dx = s.x - v.px;
      const dy = s.y - v.py;
      if (dx || dy) v.angle = Math.atan2(-dy, dx); // screen y is flipped
      v.px = s.x;
      v.py = s.y;
      const size = (1.15 + Math.min(14, s.tier) * 0.07) * (SIZE[s.pattern] ?? 1) * (s.prof.signature ? 1.2 : 1);
      const lift = s.kind === 'lob' ? (s.h ?? 0) * LOB_HEIGHT : 0.35;
      v.c.position.set(stage.sx(s.x), stage.sy(s.y + lift));
      v.shadow.position.set(stage.sx(s.x), stage.sy(s.y - 0.1));
      const sh = s.kind === 'lob' ? 1 - (s.h ?? 0) * 0.5 : 0.75;
      v.shadow.width = size * U * 0.9 * sh;
      v.shadow.height = size * U * 0.35 * sh;
      v.shadow.alpha = 0.55 * sh;

      const shape = v.look.shape;
      v.spin += dt * (shape === 'earth' ? 7 : shape === 'metal' ? 22 : shape === 'pebble' ? 9 : 0);
      const spins = shape === 'earth' || shape === 'metal' || shape === 'pebble';
      v.body.rotation = spins ? v.spin : (v.angle ?? 0);
      const grow = s.kind === 'lob' ? 1 + (s.h ?? 0) * 0.7 : 1;
      v.body.width = v.body.height = size * U * grow;
      if (s.pattern === 'sniper') v.body.scale.x *= 1.15; // a little stretched: it's fast
      if (shape === 'wind') v.body.scale.y *= 1 + Math.sin(frame * 0.6) * 0.1;
      v.glow.width = v.glow.height = size * U * (s.kind === 'blade' ? 1.4 : 1.8) * grow;
      v.glow.alpha = 0.55 + 0.2 * Math.sin(frame * 0.5 + s.id);
      // trail: alternate the class colours (long and thin for the sniper round)
      const col = v.look.colors[frame % v.look.colors.length];
      const trailSize = size * (shape === 'fire' ? 0.75 : s.pattern === 'sniper' ? 0.4 : 0.55);
      fx.trail(s.x, s.y + lift, col, trailSize);
      if (s.pattern === 'sniper') fx.trail(s.x - (s.vx ?? 0) * 0.01, s.y + lift - (s.vy ?? 0) * 0.01, col, trailSize * 0.8);
    }
    for (const [id, v] of views) {
      if (!live.has(id)) {
        v.c.destroy({ children: true });
        v.shadow.destroy();
        views.delete(id);
      }
    }
  }

  /** Element-specific explosion at the contact point (the sim already applied the damage). */
  function impact(e) {
    const cols = e.colors.map(hex);
    const main = cols.at(-1);
    const kind = e.element ?? 'plain';
    const tierScale = 1 + Math.min(14, e.tier ?? 1) * 0.06;
    const size = (e.pattern === 'lob' ? 2.6 : e.pattern === 'lance' ? 2.2 : e.pattern === 'blade' ? 1.4 : e.kind === 'zap' ? 1.6 : 1.8) * tierScale * (e.miss ? 0.7 : 1);
    fx.explode(e.x, e.y, kind, size);
    // fusions: a ring in the second element's colour
    if (cols.length > 1) fx.ring(e.x, e.y, main, 0.3, size * 0.9, 0.3);
    if (e.chain) fx.lightning(e.chain, cols.includes(0xffe14d) ? 0xffe14d : main, 0.22);
    if (e.pierce) fx.slash(e.pierce.lane, e.pierce.s, e.pierce.len, main);
    if (e.splash && !e.miss) fx.ring(e.x, e.y, main, 0.2, e.splash * 2, 0.35);
  }

  function reset() {
    puddleLayer.clear();
    for (const v of views.values()) {
      v.c.destroy({ children: true });
      v.shadow.destroy();
    }
    views.clear();
  }

  return { sync, impact, reset };
}
