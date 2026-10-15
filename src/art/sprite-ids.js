// Catalog ids of the generated sprites (src/art/asset-catalog.js, tools/pipeline.mjs),
// kept free of Pixi so the mapping is testable in Node.
import { fusionKey } from '../sim/classes.js';

const EGG_VALUE = [2, 4, 8];
const STAGE_VALUE = [16, 32, 64, 128];

/** Id of the generated sprite for a creature spec ({kind: egg|baby|fusion|halo, …}). */
export function spriteId(spec) {
  if (spec.kind === 'egg') return `egg.${EGG_VALUE[spec.tier - 1]}`;
  if (spec.kind === 'baby') return `pet.${spec.el}.${STAGE_VALUE[spec.stage]}`;
  if (spec.kind === 'fusion') return `fusion.${fusionKey(spec.a, spec.b)}`;
  if (spec.kind === 'halo') return `halo.${spec.apex}`;
  return null;
}

/** Id of a fusion's namecard portrait (the ascended edit adds `.ascended`). */
export const portraitId = (cls) => `portrait.${fusionKey(cls.element, cls.fusion)}`;
