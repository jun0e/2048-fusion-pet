// v2 fusion skills, the registry: SKILL_IMPL[fusionKey] = { start(ctx), tick(ctx, dt), end(ctx) }, run by the
// defense while a fusion's pet is summoned (docs/v2/SPEC.md section 5). Each group of skills lives in a file of
// its own, named for the first element of its fusions (fire+ice is in fire.js); the numbers are in ./data.js.
import { SKILLS as FIRE } from './fire.js';
import { SKILLS as ICE } from './ice.js';
import { SKILLS as LIGHTNING } from './lightning.js';
import { SKILLS as POISON } from './poison.js';
import { SKILLS as EARTH } from './earth.js';
import { SKILLS as WIND } from './wind.js';
import { SKILLS as METAL } from './metal.js';

export const SKILL_IMPL = { ...FIRE, ...ICE, ...LIGHTNING, ...POISON, ...EARTH, ...WIND, ...METAL };
