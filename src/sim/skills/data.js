// v2 skills, the data (docs/v2/SPEC.md). Three kinds:
//   FUSION_SKILLS  one unique skill per fusion pet (28): a fusion that reaches 1024 can summon its pet
//                  onto the field for V2.summon.dur seconds, where it uses this skill (src/sim/skills/*)
//   ELEMENT_STATS  per element: the stat buff a fusion gains when a single pet of that element is fed
//                  into it (`buff`, per stack), and the aura its pure form (4096) gives every other pet
//                  (`pure`)
// Numbers are named by unit, so the words fill in from the same numbers the sim uses (skillVars):
//   …S seconds · …Pct a share shown as a percent (1.5 → 150%) · …Cells board cells (1 cell = GRID.cell
//   world units) · anything else a plain count. A skill's "% damage" is a share of its pet's hit (the
//   tile's profile damage). The words are in the i18n tables (src/i18n/skills-en.js, skills-vi.js):
//   skill.<key>.name / .text, with {placeholders} named as these fields.
import { V2 } from '../../config.js';

export const FUSION_SKILLS = {
  // --- fire ---------------------------------------------------------------------------------
  'fire+ice': { id: 'frostfireWaltz', periodS: 1, radiusCells: 1.3, freezeS: 0.5, hitPct: 0.7, shatterPct: 1.4 },
  'fire+lightning': { id: 'plasmaBarrage', periodS: 0.8, hitPct: 1.2, rampPct: 0.3, finalPct: 6, radiusCells: 2 },
  'fire+poison': { id: 'brimstoneBlast', periodS: 2, stacks: 2, spitCells: 1.5, perStackPct: 0.4, splashCells: 1 },
  'fire+earth': { id: 'magmaBurrow', periodS: 1.8, hitPct: 1.2, radiusCells: 1.2, stunS: 0.6, poolS: 3, poolCells: 1 },
  'fire+wind': { id: 'fireTwister', pullCells: 1.1, dpsPct: 0.35, speedCells: 1.2 },
  'fire+metal': { id: 'moltenJaws', periodS: 1.5, holdS: 1.5, hitPct: 4, vulnPct: 0.5, vulnS: 6 },
  'fire+nature': { id: 'emberSwarm', count: 5, hitPct: 2, max: 12 },
  // --- ice ----------------------------------------------------------------------------------
  'ice+lightning': { id: 'cryoLance', periodS: 1.5, hitPct: 2, freezeS: 1 },
  'ice+poison': { id: 'venomTendrils', count: 6, rangeCells: 5, slowPct: 0.7, drainPct: 0.18, bossDrainPct: 0.04 },
  'ice+earth': { id: 'glacierWall', lanes: 2, wallS: 7, hitPct: 4, freezeS: 2, radiusCells: 1.5 },
  'ice+wind': { id: 'whiteout', slowPct: 0.5, periodS: 2, freezeS: 1.5 },
  'ice+metal': { id: 'rimeArmour', guardPct: 0.6, freezeS: 1.5, cooldownS: 2 },
  'ice+nature': { id: 'frostGarden', count: 5, periodS: 1.5, max: 8, hitPct: 4, freezeS: 2.5, healPct: 0.05 },
  // --- lightning ----------------------------------------------------------------------------
  'lightning+poison': { id: 'toxicCircuit', periodS: 1, spits: 2, hitPct: 0.85, stunS: 0.3 },
  'lightning+earth': { id: 'thunderCharge', charges: 3, hitPct: 2.5, pushCells: 2, stunS: 1 },
  'lightning+wind': { id: 'stormHop', periodS: 0.5, hitPct: 2.4, splashPct: 0.5, splashCells: 1 },
  'lightning+metal': { id: 'railgun', chargeS: 2, shots: 3, hitPct: 12 },
  'lightning+nature': { id: 'bloomAmbush', radiusCells: 2.5, hitPct: 5, jumps: 3, jumpPct: 0.6, cooldownS: 1.2 },
  // --- poison -------------------------------------------------------------------------------
  'poison+earth': { id: 'bogWeb', radiusCells: 1.5, slowPct: 0.5, spiders: 2, hitPct: 1 },
  'poison+wind': { id: 'panicCloud', radiusCells: 2.2, fearS: 1, cooldownS: 4 },
  'poison+metal': { id: 'executionerSting', periodS: 0.6, belowPct: 0.35, bossPct: 0.06, hitPct: 3 },
  'poison+nature': { id: 'toxicLullaby', periodS: 3, radiusCells: 3, sleepS: 2.5, bossSleepS: 1, wakePct: 3 },
  // --- earth --------------------------------------------------------------------------------
  'earth+wind': { id: 'blindingSandstorm', lanes: 2, missPct: 0.6, slowPct: 0.3, dpsPct: 0.4 },
  'earth+metal': { id: 'ironTaunt', radiusCells: 2, reflectPct: 0.4, hitPct: 3, stunS: 1.5 },
  'earth+nature': { id: 'mossSpring', healPct: 0.14, rootS: 2.5, cooldownS: 3, savePct: 0.6 },
  // --- wind / metal -------------------------------------------------------------------------
  'wind+metal': { id: 'sickleSweep', periodS: 2, hitPct: 2.5, bleedPct: 0.3, bleedS: 4 },
  'wind+nature': { id: 'pollenRain', ratePct: 1, sneezePct: 0.35, stunS: 0.5 },
  'metal+nature': { id: 'bumperHarvest', coinMult: 3, xp: 1, periodS: 2, hitPct: 2, pushCells: 1 },
};

/**
 * The stat each element stands for. `buff`: what a fusion gains each time a single pet of this element
 * is fed into it (stacks). `pure`: the aura of a pet of this main element at 4096, on every OTHER pet
 * (single or fusion; plain blocks have no element and take none), or on every block for hp / regen.
 * stats: dmg (hit ×(1+v)) · slow (on-hit slow +v) · rate (fire rate ×(1+v)) · poison (+n poison stacks
 * per hit) · hp (block health ×(1+v)) · range (reach / radius ×(1+v)) · crit (crit chance +v, crits deal
 * ×2) · regen (heals v of its health per second)
 */
export const ELEMENT_STATS = {
  fire: { stat: 'dmg', buff: 0.2, pure: 0.25 },
  ice: { stat: 'slow', buff: 0.1, pure: 0.15 },
  lightning: { stat: 'rate', buff: 0.2, pure: 0.25 },
  poison: { stat: 'poison', buff: 1, pure: 1 },
  earth: { stat: 'hp', buff: 0.25, pure: 0.3 },
  wind: { stat: 'range', buff: 0.15, pure: 0.2 },
  metal: { stat: 'crit', buff: 0.1, pure: 0.15 },
  nature: { stat: 'regen', buff: 0.01, pure: 0.015 },
};

/** A pure pet's own hit (×), on top of its attack. */
export const PURE_SELF = 1.6;
/** A fusion's own hit (×) over its main element's, and the share of its second element's effects it carries. */
export const FUSION_HIT = 1.25;

/** The unit a skill field is shown in, from its name. */
export const unitOf = (name) => (name.endsWith('S') ? 's' : name.endsWith('Pct') ? 'pct' : name.endsWith('Cells') ? 'cells' : 'n');

/**
 * A skill's (or a stat's) numbers as the language writes them, for tr(): seconds and cells through the
 * tables' own units, percents as "150%". `fmt` = { num, tr } from src/i18n (passed in: the sim stays free
 * of the i18n module's browser start-up).
 */
export function skillVars(params, { num, tr }) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'number') continue;
    const u = unitOf(k);
    const n = Math.round(v * 100) / 100;
    if (u === 's') out[k] = tr('unit.s', { n: num(n) });
    else if (u === 'cells') out[k] = tr('unit.cells', { n: num(n), count: n === 1 ? 1 : 2 });
    else if (u === 'pct') out[k] = `${num(Math.round(v * 1000) / 10)}%`;
    else out[k] = num(n);
  }
  return out;
}

/** The common header of every summon skill, as numbers: its charge, its time out, the value it unlocks at. */
export const summonHead = () => ({ chargeS: V2.summon.chargeS, durS: V2.summon.durS, unlock: 2 ** V2.summonTier });
