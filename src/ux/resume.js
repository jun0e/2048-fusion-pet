// Run resume. A run is its seed (whether its pets roam, and its keepsake) plus the inputs that changed
// it, each with the sim step it came at. The sim is deterministic, so replaying the inputs rebuilds
// the run exactly. The game saves this log; after a reload it replays the log and
// shows the pause menu, so the player continues or restarts.
// A save carries a version and a fingerprint of the run. A save from another
// version, a log that does not parse, a replay that throws, or a replay that does
// not match its fingerprint (a newer build changed the sim) is dropped, and a new
// run starts. Storage can be blocked (a sandboxed frame, private browsing): then
// nothing is saved, and nothing throws.

/** Also in index.html: New run on the failure screen removes this key itself (it must work without main.js). */
export const RESUME_KEY = 'siege:run';
/** Bump when a change makes old logs replay differently (renamed inputs, sim rules). */
export const SAVE_VERSION = 5; // 2: the basic attacks and sell / break (art fork merge); 3: roaming pets are sim state; 4: spawn levels and keepsakes; 5: fusion picks from a block's material
/** Run methods that change the sim from outside (debug helpers are not saved). */
export const RESUME_INPUTS = ['move', 'nextWave', 'choose', 'setHold', 'setGuidedWave', 'discard', 'castSkill', 'buyXp'];

/** localStorage, or null where reading it throws. */
function local() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Record a run's inputs: wraps its step and its input methods (an input that
 * changes nothing, e.g. a swipe that moves no block or a refused sell, is not recorded).
 * `log` continues an earlier log after a resume.
 */
export function recordRun(run, log = { seed: run.seed, roaming: !!run.roaming, keepsake: run.keepsake ?? null, steps: 0, inputs: [] }) {
  const step = run.step;
  run.step = () => {
    step();
    log.steps += 1;
  };
  for (const name of RESUME_INPUTS) {
    const call = run[name];
    run[name] = (...args) => {
      const res = call(...args);
      if (res !== false && res?.ok !== false) log.inputs.push([log.steps, name, ...args]);
      return res;
    };
  }
  return log;
}

/** Rebuild a run from its log. `onEvents` gets the events the replay makes (for counters). */
export function replayRun(createRun, log, { onEvents = () => {} } = {}) {
  const run = createRun({ seed: log.seed, roaming: !!log.roaming, keepsake: log.keepsake ?? null });
  let i = 0;
  for (let s = 0; s <= log.steps; s++) {
    while (i < log.inputs.length && log.inputs[i][0] === s) {
      const [, name, ...args] = log.inputs[i++];
      run[name](...args);
    }
    if (s < log.steps) run.step();
    onEvents(run.drainEvents());
  }
  return run;
}

/** What must match after a replay: the board (with classes, health and roaming pets), the economy, the deck, the spawn level. */
export const fingerprint = (run) =>
  [
    run.waveNo,
    run.phase,
    run.score,
    run.coins,
    run.swipeCost,
    run.kills,
    run.owned.join('+'),
    `${run.keepsake ?? ''}L${run.level ?? 1}:${run.xp ?? 0}`,
    run.tiles.map((t) => `${t.id}:${t.tier}:${t.cls.element ?? ''}${t.cls.fusion ?? ''}${t.cls.ultimate ?? ''}/${(t.mats ?? []).join('')}:${Math.round(t.hp)}${t.roam ? `@${t.roam.x.toFixed(2)},${t.roam.y.toFixed(2)}` : ''}`).join(','),
  ].join('|');

/**
 * Rebuild the saved run, or null when it cannot be: the replay throws (a newer
 * build) or ends somewhere else than the fingerprint says, or the run was over.
 */
export function restoreRun(createRun, saved, { onEvents } = {}) {
  try {
    const run = replayRun(createRun, saved.log, { onEvents });
    return !run.over && fingerprint(run) === saved.fp ? run : null;
  } catch (err) {
    console.warn('Saved run not restored:', err);
    return null;
  }
}

/** A log this build can replay: known inputs, at integer steps in order, within its length. */
function validLog(log) {
  if (!log || !Number.isInteger(log.seed) || !Number.isInteger(log.steps) || log.steps < 0 || log.steps > 4e6 || !Array.isArray(log.inputs)) return false;
  if (log.roaming !== undefined && typeof log.roaming !== 'boolean') return false;
  if (log.keepsake != null && typeof log.keepsake !== 'string') return false;
  let last = 0;
  for (const input of log.inputs) {
    if (!Array.isArray(input) || !RESUME_INPUTS.includes(input[1])) return false;
    const step = input[0];
    if (!Number.isInteger(step) || step < last || step > log.steps) return false;
    last = step;
  }
  return true;
}

/** Read the saved run (null when there is none, it does not parse, or it is from another version). */
export function loadSaved(storage = local()) {
  try {
    const v = JSON.parse(storage?.getItem(RESUME_KEY) || 'null');
    return v && v.v === SAVE_VERSION && typeof v.fp === 'string' && validLog(v.log) ? v : null;
  } catch {
    return null;
  }
}

export function saveRun(run, log, storage = local()) {
  try {
    storage?.setItem(RESUME_KEY, JSON.stringify({ v: SAVE_VERSION, log, fp: fingerprint(run) }));
  } catch {}
}

export function clearSaved(storage = local()) {
  try {
    storage?.removeItem(RESUME_KEY);
  } catch {}
}

/** A language switch reloads the page (main.js); this flag lives for that one reload. */
export const RELANG_KEY = 'siege:relang';

/** sessionStorage, or null where reading it throws. */
function session() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Before a language switch's reload: `step` is the opening's step on screen (null when it is not guiding). */
export function markRelang(step, storage = session()) {
  try {
    storage?.setItem(RELANG_KEY, JSON.stringify({ step: step ?? null }));
  } catch {}
}

/** After a reload: { step } if the reload was a language switch, else null. Read once: the flag goes either way. */
export function takeRelang(storage = session()) {
  let raw = null;
  try {
    raw = storage?.getItem(RELANG_KEY) ?? null;
    storage?.removeItem(RELANG_KEY);
  } catch {}
  try {
    const v = JSON.parse(raw || 'null');
    return v && typeof v === 'object' && (v.step == null || typeof v.step === 'string') ? { step: v.step ?? null } : null;
  } catch {
    return null;
  }
}

/**
 * Whether a saved run may come back after a reload: never in the showcase or a debug run (canSave),
 * nor under ?tutorial (a fresh opening). A first run's only once its opening is done, so a reload
 * mid-opening starts the opening again; but a language switch brings it back mid-opening too.
 */
export const mayRestore = ({ canSave, tutorial = false, guided = false, relang = null }) => !!canSave && !tutorial && (!!guided || !!relang);
