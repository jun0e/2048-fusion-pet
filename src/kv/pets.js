// The pet layer of the game (used by the real game and by the key-visual demo):
//   - fusions (256+) hop out of their tile, which stays as their den, and roam the field
//   - namecards with their portraits sit beside the board; tap a ready card to cast its skill
// Art comes from the provider in src/art/index.js (Gemini sprites when generated).
import './kv.css';
import { createRoamers } from './roam.js';
import { createNamecards } from './namecards.js';

export function setupPets({ stage, fx, art, hudEl, getRun }) {
  const roam = createRoamers(stage, fx, art);
  const cards = createNamecards(hudEl, {
    art,
    stage,
    getRun,
    onCast: (card) => {
      const run = getRun();
      const legend = card.legend;
      run.castSkill(card.id, { radius: legend ? 3.6 : 2.8, mult: legend ? 7 : 5 });
      // a ribbon from the namecard to its creature: the card is the pet's voice
      const from = cards.cardCenter(card.id);
      const to = roam.where(card.id);
      if (from && to) {
        const w = stage.toWorld(from.x, from.y);
        fx.beam(w.x, w.y, to.x, to.y + 0.8, parseInt(card.el.style.getPropertyValue('--c').slice(1), 16));
      }
    },
  });

  return {
    roam,
    /** `simDt`: the sim time this frame (0 while paused or picking a die), which charges the skills. */
    update(run, dt, simDt = dt) {
      roam.sync(run, dt);
      cards.sync(run, dt, simDt);
    },
    onEvent(e) {
      roam.onEvent(e);
      if (e.type === 'skill') {
        const col = parseInt(e.colors.at(-1).slice(1), 16);
        fx.ring(e.x, e.y + 0.6, col, 0.4, e.radius * 2, 0.5, 2);
        fx.ring(e.x, e.y + 0.6, 0xffffff, 0.3, e.radius * 1.6, 0.4);
        fx.burst(e.x, e.y + 0.6, [col, 0xffffff, 0xffe27a], 46, { speed: 7, size: 0.32, life: 0.7, gravity: 0 });
        stage.flash(col, 0.22);
        stage.shake(8);
      }
    },
    refresh() {
      roam.refresh();
    },
    reset() {
      roam.reset();
      cards.reset();
    },
  };
}
