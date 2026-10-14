// Monster views: walking sprite (waddle, faces its direction), shadow, HP bar
// (+ HP number on bosses), status badges with stack counts (burn, poison,
// chill, freeze), status visuals (embers, bubbles, frost tint, ice block),
// damage-over-time numbers, hit flash and a death pop.
import { BitmapText, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { enemyTex, shadowTex, softDot, statusTex, ENEMY_PX } from './textures.js';

const STATUS_ORDER = ['freeze', 'burn', 'poison', 'chill', 'loot'];

export function createFoes(stage, fx) {
  const layer = stage.layers.enemies;
  const views = new Map();
  let time = 0;

  function make(e) {
    const c = new Container();
    const shadow = new Sprite(shadowTex());
    shadow.anchor.set(0.5);
    const body = new Sprite(enemyTex(e.type));
    body.anchor.set(0.5, 0.62);
    const flash = new Sprite(body.texture);
    flash.anchor.set(0.5, 0.62);
    flash.blendMode = 'add';
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
    c.addChild(shadow, body, flash, ice, barBg, barFg, hpText, badges);
    layer.addChild(c);
    return { c, shadow, body, flash, ice, barBg, barFg, hpText, badges, badgeViews, seed: Math.random() * 10, dotT: 0, emitT: 0, seenBurn: e.dot.burn, seenPoison: e.dot.poison };
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
      const size = def.size * (e.boss ? 2.6 : 2.5); // world units across
      const frozen = e.freezeT > 0;
      const bob = frozen ? 0 : Math.abs(Math.sin(time * 7 + v.seed)) * 0.12;
      const sx = stage.sx(e.x);
      const sy = stage.sy(e.y);
      v.c.position.set(sx, sy);
      v.shadow.width = size * U * 0.8;
      v.shadow.height = size * U * 0.3;
      v.shadow.position.set(0, size * U * 0.32);

      const px = (size * U) / ENEMY_PX;
      const face = e.dirX < -0.1 ? -1 : 1;
      const squash = frozen ? 1 : 1 + Math.sin(time * 14 + v.seed) * 0.04;
      v.body.scale.set(px * face * (2 - squash), px * squash);
      v.body.position.set(0, -bob * U);
      if (e.attacking) {
        // siege: lunge at the block it is attacking
        const lunge = Math.max(0, Math.sin(time * 12 + v.seed)) * 0.18 * U;
        v.body.position.x += (e.dirX ?? 0) * lunge;
        v.body.position.y -= (e.dirY ?? 0) * lunge;
      }
      v.body.rotation = frozen ? 0 : Math.sin(time * 7 + v.seed) * 0.06;
      v.flash.scale.copyFrom(v.body.scale);
      v.flash.position.copyFrom(v.body.position);
      v.flash.rotation = v.body.rotation;
      v.flash.alpha = e.flash > 0 ? 0.75 : 0;
      v.body.tint = frozen ? 0xb9ecff : e.chillT > 0 ? 0xa8d8ff : e.poison.stacks > 0 ? 0xe2c8ff : 0xffffff;

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

      // HP bar (+ number for bosses)
      const ratio = Math.max(0, e.hp / e.maxHp);
      const barW = (e.boss ? 2.2 : 1.05) * U;
      const barH = (e.boss ? 0.2 : 0.13) * U;
      const barY = -size * U * 0.62;
      v.barBg.position.set(-barW / 2, barY);
      v.barBg.width = barW;
      v.barBg.height = barH + 0.06 * U;
      v.barFg.position.set(-barW / 2 + 0.03 * U, barY);
      v.barFg.width = Math.max(0, (barW - 0.06 * U) * ratio);
      v.barFg.height = barH;
      v.barFg.tint = ratio > 0.5 ? 0x7be36a : ratio > 0.25 ? 0xf2c14e : 0xef5a5a;
      if (e.boss) {
        v.hpText.text = Math.ceil(e.hp).toLocaleString('en-US');
        v.hpText.scale.set((0.36 * U) / 44);
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
      const bs = 0.42 * U;
      for (const bv of v.badgeViews) {
        const val = statuses[bv.k];
        bv.b.visible = !!val;
        if (!val) continue;
        bv.icon.width = bv.icon.height = bs;
        bv.n.text = bv.k === 'freeze' ? `${val.toFixed(1)}` : bv.k === 'chill' ? `-${val}` : bv.k === 'loot' ? `+${val}` : `×${val}`;
        bv.n.scale.set((0.28 * U) / 44);
        bv.n.position.set(bs * 0.42, 0);
        bv.b.position.set(bx, 0);
        bx += bs + bv.n.width + 0.06 * U;
      }
      v.badges.position.set(-bx / 2 + bs / 2, barY - 0.36 * U);

      // status visuals over time
      v.emitT -= dt;
      if (v.emitT <= 0) {
        v.emitT = 0.09;
        if (e.burn.stacks > 0) {
          fx.particle(softDot(), e.x + (Math.random() - 0.5) * size * 0.4, e.y + size * 0.1, {
            vy: 1.6 + Math.random(),
            vx: (Math.random() - 0.5) * 0.6,
            life: 0.45,
            size: 0.22 + e.burn.stacks * 0.03,
            grow: -0.15,
            color: Math.random() < 0.5 ? 0xff7a3d : 0xffd36b,
          });
        }
        if (e.poison.stacks > 0 && Math.random() < 0.6) {
          fx.particle(softDot(), e.x + (Math.random() - 0.5) * size * 0.5, e.y - size * 0.1, {
            vy: 0.9,
            life: 0.6,
            size: 0.12,
            grow: 0.1,
            color: 0xb46cff,
            add: false,
            alpha: 0.85,
          });
        }
        if (e.chillT > 0 && !frozen && Math.random() < 0.4) {
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
