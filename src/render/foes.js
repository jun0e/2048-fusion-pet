// Monster views: the foe's animal sprite moving its own way (walk, crawl, hover, swim, float;
// from src/art/foe-roster.js), facing its direction, shadow, HP bar (+ HP number on bosses),
// status badges with stack counts (burn, poison, chill, freeze), status visuals (embers,
// bubbles, frost tint, ice block), damage-over-time numbers, hit flash and a death pop.
import { BitmapText, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { DOT, FOE_FLASH, FOE_PATCH } from '../ux/photosafe.js';
import { FOE_ROSTER, FOE_SIZE_FLOOR, foeDrawSize } from '../art/foe-roster.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { enemyTex, shadowTex, softDot, statusTex, ENEMY_PX, hasGenerated } from './textures.js';

const STATUS_ORDER = ['freeze', 'burn', 'poison', 'chill', 'loot'];
const GEN_FILL = 1; // a trimmed generated foe fills its box (the overhaul's sizes: 37–54 px, bosses 86–95)
const MOTION_SIZE = foeDrawSize({ size: FOE_SIZE_FLOOR }); // world units: the size the lifts and drifts below are set for; a bigger foe moves in proportion
const SETTLE = 8; // 1/s: how fast the motion eases in and out, so a freeze or a thaw settles instead of snapping
/** The most each way of moving lifts a foe at MOTION_SIZE (world units): a hover or float with its bob on top, a swim, a walker's bob. */
const LIFT_AT = { hover: 0.46, float: 0.4, swim: 0.3, crawl: 0, walk: 0.12 };
/** However big the foe, it lifts at most MAX_LIFT (a flyer, a swimmer) and bobs at most MAX_BOB (a walker), world units: big foes stay readable and inside the field. */
const MAX_LIFT = 0.45;
const MAX_BOB = 0.15;
/** The smallest the boss's health number and a status badge's count are drawn (CSS px, font size): a phone's scale alone would draw them at 7–13 px. */
export const FOE_TEXT_MIN_PX = { hp: 16, badge: 14 };
/** A bitmap number's half-height drawn, as a share of its font size (the 'Dmg' glyph quads measure 1.055 em). */
export const NUMBER_HALF = 0.53;

/**
 * Where a foe's numbers go, from the sizes drawn (CSS px). The boss's health number and the status
 * counts are held at their px floors on a phone, so the badge row sits 2 px above what is drawn
 * under it (the health number on a boss, else the bar), never at an offset scaled by U alone, and a
 * badge's icon is never smaller than its count. barY, barH: the bar's centre and its fill's height.
 * → { hpPx, badgePx, bs (the icon's size), y (the badge row's centre) }
 */
export function foeLabels({ U, boss = false, barY, barH }) {
  const hpPx = Math.max(0.36 * U, FOE_TEXT_MIN_PX.hp);
  const badgePx = Math.max(0.28 * U, FOE_TEXT_MIN_PX.badge);
  const bs = Math.max(0.42 * U, badgePx + 2);
  const under = boss ? Math.max(hpPx * NUMBER_HALF, (barH + 0.06 * U) / 2) : (barH + 0.06 * U) / 2;
  return { hpPx, badgePx, bs, y: barY - under - Math.max(bs / 2, badgePx * NUMBER_HALF) - 2 };
}

const whites = new WeakMap(); // texture → its white silhouette (or null when it cannot be read back)
const WHITE_PX = 256; // a silhouette's longest side: a flash is drawn at most ~340 device px wide, for 0.12 s
/**
 * The hit flash: a white silhouette of a foe's texture (its alpha, filled white), built once per
 * texture at first use and drawn over the body in normal blend, at FOE_FLASH.alpha. Nothing on the
 * field is additive (docs/ux/photosafe.md); photosafe.js FOE_FLASH.share is measured on this.
 */
function whiteOf(tex) {
  if (whites.has(tex)) return whites.get(tex);
  let out = null;
  try {
    const src = tex.source.resource;
    const r = tex.source.resolution ?? 1;
    const f = tex.frame;
    const k = Math.min(1, WHITE_PX / Math.max(f.width * r, f.height * r, 1));
    const w = Math.max(1, Math.round(f.width * r * k));
    const h = Math.max(1, Math.round(f.height * r * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.drawImage(src, f.x * r, f.y * r, f.width * r, f.height * r, 0, 0, w, h);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    out = Texture.from(c);
  } catch {
    out = null; // an image the page may not read back: no flash rather than an additive one
  }
  whites.set(tex, out);
  return out;
}

export function createFoes(stage, fx) {
  const layer = stage.layers.enemies;
  const views = new Map();
  let time = 0;

  function make(e) {
    const c = new Container();
    const shadow = new Sprite(shadowTex());
    shadow.anchor.set(0.5);
    const patch = new Sprite(softDot()); // on the dark keep: a pale contact patch instead of the shadow (FOE_PATCH)
    patch.anchor.set(0.5);
    patch.tint = FOE_PATCH.color;
    patch.alpha = 0;
    const body = new Sprite(enemyTex(e.type));
    body.anchor.set(0.5, 0.62);
    const white = whiteOf(body.texture);
    const flash = new Sprite(white ?? Texture.EMPTY); // normal blend: a white silhouette over the body
    flash.anchor.set(0.5, 0.62);
    flash.alpha = 0;
    const ice = new Graphics();
    const barBg = new Sprite(Texture.WHITE);
    const barFg = new Sprite(Texture.WHITE);
    barBg.tint = 0x1b1426;
    barBg.anchor.set(0, 0.5);
    barFg.anchor.set(0, 0.5);
    const hpText = new BitmapText({ text: '', style: { fontFamily: 'Dmg', fontSize: 44 } });
    hpText.anchor.set(0.5);
    hpText.visible = !!e.boss;
    const badges = new Container();
    const badgeViews = STATUS_ORDER.map((k) => {
      const b = new Container();
      const icon = new Sprite(statusTex(k));
      icon.anchor.set(0.5);
      const n = new BitmapText({ text: '', style: { fontFamily: 'Dmg', fontSize: 44 } });
      n.anchor.set(0, 0.5);
      b.addChild(icon, n);
      badges.addChild(b);
      return { k, b, icon, n };
    });
    c.addChild(shadow, patch, body, flash, ice, barBg, barFg, hpText, badges);
    layer.addChild(c);
    const r = FOE_ROSTER[e.type];
    return {
      c, shadow, patch, keep: null, body, flash, ice, barBg, barFg, hpText, badges, badgeViews,
      gen: hasGenerated(`enemy.${e.type}`), move: r?.move ?? 'walk', view: r?.view ?? 'front', face: 1,
      white, // the silhouette's scale to the body's, per axis (it is drawn smaller than the body's texture)
      flashKx: white ? body.texture.width / Math.max(1, white.width) : 1,
      flashKy: white ? body.texture.height / Math.max(1, white.height) : 1,
      motion: null, // 0–1: how much of its motion the foe shows (eases to 0 while frozen, back to 1 after)
      seed: Math.random() * 10, dotT: 0, emitT: 0, seenBurn: e.dot.burn, seenPoison: e.dot.poison,
    };
  }

  function sync(enemies, dt) {
    time += dt;
    const U = stage.view.U;
    const live = new Set();
    for (const e of enemies) {
      live.add(e.id);
      let v = views.get(e.id);
      if (!v) {
        v = make(e);
        views.set(e.id, v);
        fx.burst(e.x, e.y, [0x9d7bff, 0xffffff], 8, { speed: 2.5, size: 0.2, life: 0.4, gravity: 0 });
      }
      const def = e.def;
      const size = foeDrawSize(def); // world units across (src/art/foe-roster.js: what the flash audit books too)
      const frozen = e.freezeT > 0;
      const sx = stage.sx(e.x);
      const sy = stage.sy(e.y);
      v.c.position.set(sx, sy);

      // each animal moves its own way: walkers waddle, crawlers stretch, flyers hover over a
      // detached shadow, the newt swims an S, the macaque floats; wings seen from above beat by
      // narrowing their span. Units: lift (base: its resting height, without the bob) and dx in
      // MOTION_SIZE world units, scaled to the foe's size; sway in radians. A freeze eases it all
      // out (the flyer settles to the ground) and a thaw eases it back in.
      const t = time + v.seed;
      let base = 0;
      let lift = 0;
      let dx = 0;
      let sway = 0;
      let wide = 1;
      let tall = 1;
      if (v.move === 'hover') {
        base = 0.38;
        lift = base + Math.sin(t * 2.6) * 0.08;
        sway = Math.sin(t * 1.3) * 0.05;
      } else if (v.move === 'float') {
        base = 0.3;
        lift = base + Math.sin(t * 2) * 0.1;
      } else if (v.move === 'swim') {
        base = lift = 0.3;
        dx = Math.sin(t * 2.4) * 0.15;
        sway = Math.cos(t * 2.4) * 0.12;
      } else if (v.move === 'crawl') {
        const c = Math.sin(t * 5);
        wide = 1 + c * 0.05;
        tall = 1 - c * 0.04;
      } else {
        lift = Math.abs(Math.sin(t * 7)) * 0.12;
        tall = 1 + Math.sin(t * 14) * 0.04;
        wide = 2 - tall;
        sway = Math.sin(t * 7) * 0.06;
      }
      if (v.view === 'spread') wide *= 1 - 0.14 * Math.abs(Math.sin(t * 8));
      const want = frozen ? 0 : 1;
      v.motion = v.motion == null ? want : v.motion + (want - v.motion) * (1 - Math.exp(-SETTLE * dt));
      const m = v.motion;
      // a bigger foe hovers higher and drifts further, in proportion, up to MAX_LIFT (MAX_BOB for a walker's bob)
      const reach = (LIFT_AT[v.move] ?? LIFT_AT.walk) * (size / MOTION_SIZE);
      const cap = v.move === 'hover' || v.move === 'float' || v.move === 'swim' ? MAX_LIFT : MAX_BOB;
      const k = (size / MOTION_SIZE) * (reach > cap ? cap / reach : 1);
      const ground = Math.max(0.55, 1 - lift * m * 0.6); // a shadow left on the ground shrinks under a flyer
      base *= m * k;
      lift *= m * k;
      dx *= m * k;
      sway *= m;
      wide = 1 + (wide - 1) * m;
      tall = 1 + (tall - 1) * m;
      v.shadow.width = v.patch.width = size * U * 0.8 * ground;
      v.shadow.height = v.patch.height = size * U * 0.3 * ground;
      v.shadow.position.set(0, size * U * 0.32);
      v.patch.position.copyFrom(v.shadow.position);
      // on the dark keep (its feet below the parapet) a foe stands on a pale patch, not a dark
      // shadow, so a dark foe still reads: the two cross-fade over FOE_PATCH.fade s (never a flash)
      const onKeep = e.y - size * 0.32 < FRAME_GEOM.parapet.base ? 1 : 0;
      v.keep = v.keep == null ? onKeep : onKeep > v.keep ? Math.min(1, v.keep + dt / FOE_PATCH.fade) : Math.max(0, v.keep - dt / FOE_PATCH.fade);
      v.patch.alpha = FOE_PATCH.alpha * v.keep;
      v.patch.visible = v.keep > 0;
      v.shadow.alpha = 1 - v.keep;

      // generated sprites are trimmed to the critter; procedural ones sit on a padded ENEMY_PX canvas
      const px = v.gen ? (size * U * GEN_FILL) / Math.max(v.body.texture.width, v.body.texture.height, 1) : (size * U) / ENEMY_PX;
      // a profile faces left (the roster's view rule): flip it while moving right, and keep the
      // last facing while moving straight up or down so a foe never flickers between the two.
      // Front and spread art is never flipped, so its light stays from the upper left.
      if (v.view === 'profile') {
        if (e.dirX > 0.1) v.face = -1;
        else if (e.dirX < -0.1) v.face = 1;
      }
      v.body.scale.set(px * v.face * wide, px * tall);
      v.body.position.set(dx * U, -lift * U);
      if (e.attacking) {
        // siege: lunge at the block it is attacking
        const lunge = Math.max(0, Math.sin(time * 12 + v.seed)) * 0.18 * U;
        v.body.position.x += (e.dirX ?? 0) * lunge;
        v.body.position.y -= (e.dirY ?? 0) * lunge;
      }
      v.body.rotation = sway;
      // statuses read on the body: frozen, stunned (Lightning, Earth), rooted (Nature), chilled, poisoned
      v.body.tint = frozen ? 0xb9ecff : e.stunT > 0 ? 0xfff0a0 : e.rootT > 0 ? 0xc9f2b4 : e.chillT > 0 ? 0xa8d8ff : e.poison.stacks > 0 ? 0xe2c8ff : 0xffffff;
      if (e.stunT > 0) v.body.rotation = Math.sin(time * 40 + v.seed) * 0.08; // dazed shake
      v.flash.scale.set(v.body.scale.x * v.flashKx, v.body.scale.y * v.flashKy);
      v.flash.position.copyFrom(v.body.position);
      v.flash.rotation = v.body.rotation;
      // photosafe: a hit flash shows only while the light budget has room for this foe's whole
      // silhouette (FOE_FLASH.share of its size² square); a foe under steady fire keeps it on,
      // booked again every FOE_FLASH.life
      if (e.flash > 0 && v.white && (!v.flashing || time >= v.flashUntil)) {
        v.flashing = fx.flashAll(FOE_FLASH.share * size * size, FOE_FLASH.life) ? 1 : -1;
        v.flashUntil = time + FOE_FLASH.life;
      } else if (e.flash <= 0) v.flashing = 0;
      v.flash.alpha = v.flashing === 1 ? FOE_FLASH.alpha : 0;

      // frozen: ice block overlay
      v.ice.clear();
      if (frozen) {
        const w = size * U * 0.78;
        v.ice
          .roundRect(-w / 2, -w * 0.72, w, w * 0.95, w * 0.16)
          .fill({ color: 0xbfeaff, alpha: 0.42 })
          .stroke({ width: 0.05 * U, color: 0xffffff, alpha: 0.9 });
        v.ice.moveTo(-w * 0.3, -w * 0.55).lineTo(-w * 0.12, -w * 0.66).stroke({ width: 0.05 * U, color: 0xffffff, alpha: 0.9 });
      }

      // HP bar (+ number for bosses): over the foe's resting height, so it holds still while the foe bobs
      const ratio = Math.max(0, e.hp / e.maxHp);
      const barW = (e.boss ? 2.2 : 1.05) * U;
      const barH = (e.boss ? 0.2 : 0.13) * U;
      const barY = -size * U * 0.62 - base * U;
      v.barBg.position.set(-barW / 2, barY);
      v.barBg.width = barW;
      v.barBg.height = barH + 0.06 * U;
      v.barFg.position.set(-barW / 2 + 0.03 * U, barY);
      v.barFg.width = Math.max(0, (barW - 0.06 * U) * ratio);
      v.barFg.height = barH;
      v.barFg.tint = ratio > 0.5 ? 0x7be36a : ratio > 0.25 ? 0xf2c14e : 0xef5a5a;
      const lab = foeLabels({ U, boss: e.boss, barY, barH });
      if (e.boss) {
        v.hpText.text = Math.ceil(e.hp).toLocaleString('en-US');
        v.hpText.scale.set(lab.hpPx / 44);
        v.hpText.position.set(0, barY);
      }

      // status badges with stack counts
      const statuses = {
        freeze: frozen ? Math.ceil(e.freezeT * 10) / 10 : 0,
        burn: e.burn.stacks,
        poison: e.poison.stacks,
        chill: !frozen && e.chillT > 0 ? Math.round(e.chillSlow * 100) : 0,
        loot: e.lootT > 0 ? Math.round(e.lootPct * 100) : 0, // Metal's mark: +% coins on death
      };
      let bx = 0;
      const bs = lab.bs;
      for (const bv of v.badgeViews) {
        const val = statuses[bv.k];
        bv.b.visible = !!val;
        if (!val) continue;
        bv.icon.width = bv.icon.height = bs;
        bv.n.text = bv.k === 'freeze' ? `${val.toFixed(1)}` : bv.k === 'chill' ? `-${val}` : bv.k === 'loot' ? `+${val}` : `×${val}`;
        bv.n.scale.set(lab.badgePx / 44);
        bv.n.position.set(bs * 0.42, 0);
        bv.b.position.set(bx, 0);
        bx += bs + bv.n.width + 0.06 * U;
      }
      v.badges.position.set(-bx / 2 + bs / 2, lab.y);

      // status visuals over time
      v.emitT -= dt;
      if (v.emitT <= 0) {
        v.emitT = 0.09;
        // embers, bubbles and frost take from the light budget (a field of burning foes adds up)
        const ember = 0.22 + e.burn.stacks * 0.03;
        if (e.burn.stacks > 0 && fx.flashAll(DOT.share * ember * ember, 0.45)) {
          fx.particle(softDot(), e.x + (Math.random() - 0.5) * size * 0.4, e.y + size * 0.1, {
            vy: 1.6 + Math.random(),
            vx: (Math.random() - 0.5) * 0.6,
            life: 0.45,
            size: ember,
            grow: -0.15,
            color: Math.random() < 0.5 ? 0xff7a3d : 0xffd36b,
          });
        }
        if (e.poison.stacks > 0 && Math.random() < 0.6 && fx.flashAll(DOT.share * 0.22 * 0.22, 0.6)) {
          fx.particle(softDot(), e.x + (Math.random() - 0.5) * size * 0.5, e.y - size * 0.1, {
            vy: 0.9,
            life: 0.6,
            size: 0.12,
            grow: 0.1,
            color: 0xb46cff,
            alpha: 0.85,
          });
        }
        if (e.chillT > 0 && !frozen && Math.random() < 0.4 && fx.flashAll(DOT.share * 0.1 * 0.1, 0.5)) {
          fx.particle(softDot(), e.x + (Math.random() - 0.5) * size * 0.6, e.y + (Math.random() - 0.3) * size * 0.4, { vy: -0.3, life: 0.5, size: 0.1, color: 0xcff0ff });
        }
      }

      // damage-over-time numbers: exact burn / poison totals from the sim, shown twice a second
      v.dotT += dt;
      if (v.dotT >= 0.5) {
        v.dotT = 0;
        const burn = e.dot.burn - (v.seenBurn ?? 0);
        const poison = e.dot.poison - (v.seenPoison ?? 0);
        v.seenBurn = e.dot.burn;
        v.seenPoison = e.dot.poison;
        if (burn >= 1) fx.number(e.x - size * 0.45, e.y - size * 0.15, burn, { color: 0xff9a4d, small: true });
        if (poison >= 1) fx.number(e.x + size * 0.45, e.y - size * 0.15, poison, { color: 0xc99bff, small: true });
      }
    }

    for (const [id, v] of views) {
      if (!live.has(id)) {
        v.c.destroy({ children: true });
        views.delete(id);
      }
    }
  }

  function reset() {
    for (const v of views.values()) v.c.destroy({ children: true });
    views.clear();
  }

  return { sync, reset };
}
