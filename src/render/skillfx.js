// v2: draws what the fusion skills do (docs/v2/SPEC.md section 6): the instant `skillFx` events, and every
// frame the skills' standing pieces (zones, walls, traps, minions, tethers) and the new foe status marks.
// Stub with the interface main.js wires (U1); U2 fills it in.
export function createSkillFx(/* { stage, fx, art } */) {
  return {
    /** Every sim event passes through here; only `skillFx` (and summon) events draw. */
    onEvent(/* e */) {},
    /** Every frame: the standing pieces from run.defense (zones, walls, traps, minions, tethers). */
    update(/* run, dt */) {},
    reset() {},
  };
}
