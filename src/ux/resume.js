// Run resume. A run is its seed plus the inputs that changed it, each with the
// sim step it came at. The sim is deterministic, so replaying the inputs rebuilds
// the run exactly. The game saves this log; after a reload it replays the log and
// shows the pause menu, so the player continues or restarts.
// A fingerprint of the run (wave, score, coins, blocks) is saved with the log:
// if the replay does not match it (a newer build changed the sim), the save is
// dropped and a new run starts.

export const RESUME_KEY = 'siege:run';
/** Run methods that change the sim from outside (debug helpers are not saved). */
export const RESUME_INPUTS = ['move', 'nextWave', 'choose', 'setHold', 'setGuidedWave'];

/**
 * Record a run's inputs: wraps its step and its input methods (an input that
 * changes nothing, e.g. a swipe that moves no block, is not recorded).
 * `log` continues an earlier log after a resume.
 */
export function recordRun(run, log = { seed: run.seed, steps: 0, inputs: [] }) {
  const step = run.step;
  run.step = () => {
    step();
    log.steps += 1;
  };
  for (const name of RESUME_INPUTS) {
    const call = run[name];
    run[name] = (...args) => {
      const res = call(...args);
      if (res !== false) log.inputs.push([log.steps, name, ...args]);
      return res;
    };
  }
  return log;
}

/** Rebuild a run from its log. `onEvents` gets the events the replay makes (for counters). */
export function replayRun(createRun, log, { onEvents = () => {} } = {}) {
  const run = createRun({ seed: log.seed });
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

/** What must match after a replay. */
export const fingerprint = (run) => [run.waveNo, run.phase, run.score, run.coins, run.tiles.map((t) => `${t.id}:${t.tier}`).join(',')].join('|');

/** Read the saved run (null when there is none, or it does not parse). */
export function loadSaved(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(RESUME_KEY) || 'null');
    return v && v.log && Array.isArray(v.log.inputs) ? v : null;
  } catch {
    return null;
  }
}

export function saveRun(run, log, storage = globalThis.localStorage) {
  try {
    storage?.setItem(RESUME_KEY, JSON.stringify({ log, fp: fingerprint(run), wave: run.waveNo, score: run.score, blocks: run.blocks }));
  } catch {}
}

export function clearSaved(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(RESUME_KEY);
  } catch {}
}
