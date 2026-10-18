// The pet layer of the game (used by the real game and by the key-visual demo):
//   - a fusion pet's summon (from 1024) sends it from its tile to the front for a while and back
//     (src/kv/roam.js draws it from tile.summon; the tile shows its den meanwhile)
//   - namecards with their portraits sit beside the board; tap a ready card to cast its pet's skill
//     (src/kv/namecards.js): run.castSkill(id), docs/v2/SPEC.md section 5
// Art comes from the provider in src/art/index.js (Gemini sprites when generated).
import './kv.css';
import { ELEMENTS, fusionOf } from '../sim/classes.js';
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
      const went = run.castSkill(card.id);
      if (went === false) return; // not ready, or already out: the sim said no
      // a ribbon from the namecard to its pet, about to hop out of its tile: the card is the pet's voice
      const tile = run.tiles.find((t) => t.id === card.id);
      const from = cards.cardCenter?.(card.id);
      const to = roam.where(card.id) ?? (tile && { x: tile.x, y: tile.y });
      if (from && to) {
        const w = stage.toWorld(from.x, from.y);
        const cls = tile?.cls ?? card.cls ?? {};
        const color = fusionOf(cls)?.color ?? ELEMENTS[cls.element]?.color ?? '#ffffff';
        fx.beam(w.x, w.y, to.x, to.y + 0.5, parseInt(color.slice(1), 16));
      }
    },
  });

  return {
    roam,
    /** `simDt`: the sim time this frame (0 while paused or picking a card), which charges the skills. */
    update(run, dt, simDt = dt) {
      roam.sync(run, dt);
      cards.sync(run, dt, simDt);
    },
    onEvent(e) {
      roam.onEvent(e);
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
