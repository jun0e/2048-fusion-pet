// The deck: the dice (elements) new blocks can spawn in, as a row of small die-shaped badges on the
// timber rail under the board (src/render/frame.js draws the rail and the "at 256" slot for the next
// die; both place themselves from deckRow). A newly unlocked die pops in.
// The rail carries no "DECK" word: at 12 px it would not fit beside four dice and the slot on a
// 360 px phone, and the dice with the next die's slot read as the deck without it.
import { Container, Graphics, Sprite } from 'pixi.js';
import { ELEMENTS } from '../sim/classes.js';
import { FRAME_GEOM, deckRow, nextDieAt } from '../art/frame-kit.js';
import { iconTex, generatedTex } from './textures.js';

const { die: SIZE, gap: GAP, y: Y } = FRAME_GEOM.deck; // world units
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

export function createDeck(stage) {
  const layer = new Container();
  stage.layers.board.addChild(layer);
  let views = [];
  let key = '';
  let drawnU = 0; // the die bodies are drawn for this U (redrawn on a resize only)

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
      drawnU = 0;
    }
    const s = SIZE * U;
    if (U !== drawnU) {
      drawnU = U;
      for (const v of views) {
        v.body.clear();
        if (v.badge) {
          const t = v.icon.texture;
          v.icon.scale.set((s * 1.1) / Math.max(t.width, t.height, 1));
          continue;
        }
        v.body
          .roundRect(-s / 2, -s / 2 + 0.05 * U, s, s, s * 0.24)
          .fill({ color: 0x0f1430, alpha: 0.5 })
          .roundRect(-s / 2, -s / 2, s, s, s * 0.24)
          .fill({ color: hex(ELEMENTS[v.element].color) })
          .stroke({ width: 0.05 * U, color: 0xffffff, alpha: 0.9 });
        v.icon.width = v.icon.height = s * 0.72;
      }
    }
    const { x0 } = deckRow(views.length, nextDieAt(run.maxTier) != null);
    views.forEach((v, i) => {
      v.pop = Math.max(0, v.pop - dt * 1.5);
      v.c.position.set(stage.sx(x0 + i * (SIZE + GAP)), stage.sy(Y));
      v.c.scale.set(1 + Math.sin(v.pop * Math.PI) * 0.5);
    });
  }

  return { sync };
}
