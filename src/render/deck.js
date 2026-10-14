// The deck: the dice (elements) new blocks can spawn in, as a row of small
// die-shaped badges above the board. A newly unlocked die pops in.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ELEMENTS } from '../sim/classes.js';
import { iconTex, generatedTex } from './textures.js';

const SIZE = 0.72; // die size, world units
const GAP = 0.2;
const Y = -1.05; // under the board
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

export function createDeck(stage) {
  const layer = new Container();
  stage.layers.board.addChild(layer);
  const label = new Text({ text: 'DECK', style: { fontFamily: 'Nunito', fontWeight: '800', fill: 0xbfc8ff, fontSize: 24, letterSpacing: 2 } });
  label.anchor.set(1, 0.5);
  label.alpha = 0.7;
  layer.addChild(label);
  let views = [];
  let key = '';

  function sync(run, dt) {
    const U = stage.view.U;
    const owned = run.owned;
    const k = owned.join(',');
    if (k !== key) {
      const fresh = owned.filter((e) => !views.some((v) => v.element === e));
      for (const v of views) v.c.destroy({ children: true });
      views = owned.map((element) => {
        const c = new Container();
        const body = new Graphics();
        const badge = generatedTex(`badge.${element}`); // the generated badge is a whole die face
        const icon = new Sprite(badge ?? iconTex(element));
        icon.anchor.set(0.5);
        c.addChild(body, icon);
        layer.addChild(c);
        return { c, body, icon, badge: !!badge, element, pop: key && fresh.includes(element) ? 1 : 0 };
      });
      key = k;
    }
    const w = views.length * SIZE + (views.length - 1) * GAP;
    views.forEach((v, i) => {
      v.pop = Math.max(0, v.pop - dt * 1.5);
      const x = -w / 2 + SIZE / 2 + i * (SIZE + GAP);
      v.c.position.set(stage.sx(x), stage.sy(Y));
      v.c.scale.set(1 + Math.sin(v.pop * Math.PI) * 0.5);
      const s = SIZE * U;
      if (v.badge) {
        v.body.clear();
        const t = v.icon.texture;
        v.icon.scale.set((s * 1.1) / Math.max(t.width, t.height, 1));
        return;
      }
      v.body
        .clear()
        .roundRect(-s / 2, -s / 2 + 0.05 * U, s, s, s * 0.24)
        .fill({ color: 0x0f1430, alpha: 0.5 })
        .roundRect(-s / 2, -s / 2, s, s, s * 0.24)
        .fill({ color: hex(ELEMENTS[v.element].color) })
        .stroke({ width: 0.05 * U, color: 0xffffff, alpha: 0.9 });
      v.icon.width = v.icon.height = s * 0.72;
    });
    label.position.set(stage.sx(-w / 2 - 0.25), stage.sy(Y));
    label.scale.set((0.26 * U) / 24);
  }

  return { sync };
}
