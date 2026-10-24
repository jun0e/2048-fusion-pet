// The asset pipeline's bookkeeping rules (tools/pipeline.mjs), pure so they can be tested: which jobs
// make no image, which file a job is made from, when a shipped output is stale, which jobs a run
// makes and draws, when a cached raw may stand for a job. Whether an output is current is decided
// from committed files only (the shipped outputs, the manifest, the files in tools/refs): the raw
// cache is gitignored and differs in every checkout. The cache only decides whether a raw already
// paid for may be re-posted instead of drawn again, and which file a model is sent.
import { join } from 'node:path';

/** A job that makes no image: an approved design (a file in the repo), or one made from another job's output (a portrait). */
export const isPostOnly = (job) => !!(job.approved || job.from);

/**
 * The image a post-only job is made from, or a generated job's raw: an approved design's committed
 * file; for a job made from another, that job's shipped output (a portrait from its fusion's
 * sprite, so it is the drawing the field shows); else its own raw.
 * `byId` holds every planned job; `rawOf(id)` and `outOf(id)` are the raw cache's and the shipped file's paths.
 */
export function sourceOf(job, { byId, root, rawOf, outOf }) {
  if (job.approved) return join(root, job.approved);
  if (job.from) {
    const src = byId.get(job.from);
    return src?.approved ? join(root, src.approved) : outOf(job.from);
  }
  return rawOf(job.id);
}

/**
 * Whether a shipped output no longer answers its job: it was made for another ask (`meta.ask`, the
 * hash of what was asked, or for a post-only job of its source and post-processing); a generated
 * job's output was post-processed otherwise (`meta.post` against `post`: its raw may still answer,
 * and it is only re-posted); or its job has a recipe date (`job.since`) and the output was made
 * before it (a grown sprite, a 3D portrait) or carries no ask (so nothing ties it to what it was
 * made from). An output with no record at all counts as current only when its job has no recipe
 * date (a legacy asset). A shipped file that is not the one its entry records is not stale (it may
 * be newer art a merge brought): it is kept and named (`differs`).
 */
export function isStale(job, meta, hash, post = null) {
  if (meta?.ask && meta.ask !== hash) return true;
  if (post && meta?.post && meta.post !== post) return true;
  if (job.since && (!(meta?.at >= job.since) || !meta?.ask)) return true;
  return false;
}

/**
 * Whether a job may start: each dependency is done (in this run, or found current at its start) or not
 * in this run, and what the job needs of it exists (`has(id)`: its shipped output, an approved file or
 * a raw that is the drawing that shipped).
 */
export const isReady = (job, state, has) => job.deps.every((d) => (state.get(d) === 'done' || !state.has(d)) && has(d));

/** The post-only jobs made from a job in `jobs` and not in it, whatever their priority (`all`): they are free, and must follow their source. */
export const followers = (jobs, all) => {
  const inRun = new Set(jobs.map((j) => j.id));
  return all.filter((j) => j.from && inRun.has(j.from) && !inRun.has(j.id));
};

/**
 * The jobs to make: the stale or missing ones (`needed`), and every job in the run made from one of
 * them, directly or not (a portrait, a halo edit, a later stage, a chapter's foes), so it waits for
 * them. The run asks again at each job's turn: one current once its references are made (they came
 * back as they were, or it is a legacy output, which is kept) is not made.
 */
export function toMake(jobs, needed) {
  const todo = new Set(jobs.filter(needed).map((j) => j.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const j of jobs) {
      if (!todo.has(j.id) && j.deps.some((d) => todo.has(d))) {
        todo.add(j.id);
        grew = true;
      }
    }
  }
  return jobs.filter((j) => todo.has(j.id));
}

/**
 * What a run makes and draws, for its plan, as the run decides it: a job in `todo` (toMake) is made
 * when it is stale or missing at its turn, after the jobs it is made from. Each job's output is
 * 'redrawn', 'changed' (re-posted with new pixels), 'maybe' (re-posted, perhaps as it was) or 'same'
 * (kept), and:
 * - a job whose references stay as they are draws when it is `needed` and its raw does not answer it (`reusable`);
 * - a job that records what it answers (`tracked`: an ask, or a recipe date) draws for sure once a
 *   reference's pixels change (its ask changes), or when its own part of the ask changed (stale with
 *   every reference on disk, or `ownChanged` while a reference is lost), and may draw when a
 *   reference may change;
 * - a legacy output (no ask, no recipe date) is made only when it is needed (lost), and is otherwise
 *   kept, whatever its references do;
 * - a post-only output draws nothing, and changes with its source.
 * - a held output (its shipped file is not the one its entry records) is kept as it ships.
 * `stale(job)`: its output exists and is needed (it comes back with new pixels).
 * → { sure, maybe } (the generated jobs that draw, and that may) and `fates` by id: { make ('yes' |
 * 'maybe' | 'no': kept), draw ('sure' | 'maybe' | 'no'), out }
 */
export function drawPlan(todo, { needed, reusable, stale, tracked, ownChanged = () => false, held = () => false }) {
  const byId = new Map(todo.map((j) => [j.id, j]));
  const fates = new Map();
  const fate = (j) => {
    if (!fates.has(j.id) && held(j)) fates.set(j.id, { make: 'no', draw: 'no', out: 'same' });
    if (!fates.has(j.id)) {
      const ups = j.deps.filter((d) => byId.has(d)).map((d) => fate(byId.get(d)).out);
      const changes = ups.includes('redrawn') || ups.includes('changed');
      const might = ups.includes('maybe');
      // a job's own staleness is judged with its references as they are now: for one that records an
      // ask (or a post-only one) only when none of them may change; a legacy output's never depends on them
      const own = needed(j);
      const need = (tracked(j) || isPostOnly(j)) && (changes || might) ? false : own;
      const out = (draw) => (draw === 'sure' ? 'redrawn' : draw === 'maybe' ? 'maybe' : need ? (stale(j) ? 'changed' : 'maybe') : 'same');
      if (isPostOnly(j)) fates.set(j.id, { make: changes || need ? 'yes' : might ? 'maybe' : 'no', draw: 'no', out: changes ? 'changed' : might ? 'maybe' : out('no') });
      else if (!tracked(j)) {
        const draw = own && !reusable(j) ? 'sure' : 'no';
        fates.set(j.id, { make: own ? 'yes' : 'no', draw, out: out(draw) });
      } else {
        // a lost reference hashes as missing, so its ask cannot be judged now; its own part can
        const blind = j.deps.some((d) => byId.has(d) && needed(byId.get(d)) && !stale(byId.get(d)));
        const ownStale = blind ? ownChanged(j) : own && !reusable(j);
        const draw = changes || ownStale ? 'sure' : might ? 'maybe' : 'no';
        fates.set(j.id, { make: draw === 'sure' || (!blind && own) ? 'yes' : might ? 'maybe' : need ? 'yes' : 'no', draw, out: out(draw) });
      }
    }
    return fates.get(j.id);
  };
  for (const j of todo) fate(j);
  return { sure: todo.filter((j) => fate(j).draw === 'sure'), maybe: todo.filter((j) => fate(j).draw === 'maybe'), fates };
}

/** How far a raw with no record may be from the output stamped after it: the pipeline writes a raw seconds before it records the output. */
export const SOURCE_WINDOW_MS = 60 * 60 * 1000;

/** Whether a shipped file is not the one its entry records (`sha`: the file's hash): changed outside the pipeline, or a merge took one without the other. */
export const differs = (meta, sha) => !!(sha && meta?.sha && meta.sha !== sha);

/**
 * Whether a cached raw is the drawing a shipped output was made from (`meta`, the output's manifest
 * entry; `sha`, the shipped file's hash): never when the file is not the one the entry records; a raw
 * with a record when the output records its ask and its time (a later drawing for the same ask that
 * never shipped is not it); one with none (an older pipeline's) when the output records no ask either
 * and was stamped within SOURCE_WINDOW_MS of it (another checkout's cache holds older drawings).
 * `raw` = { at (ISO: its record's time, else its file's), record }.
 */
export function isSourceOf(raw, meta, sha = null) {
  if (differs(meta, sha)) return false;
  if (raw.record) return !!meta?.ask && raw.record.ask === meta.ask && raw.record.at === meta.at;
  if (meta?.ask) return false;
  return !meta?.at || Math.abs(Date.parse(meta.at) - Date.parse(raw.at)) <= SOURCE_WINDOW_MS;
}

/**
 * Why a cached raw may not stand for a generated job today (be re-posted instead of drawn again), or
 * null when it may. A raw with a record answers the ask it was drawn for (`hash`: today's), when it
 * was drawn on or after the job's recipe date. A raw with none (an older pipeline's) answers nothing
 * known, so it is taken only for a job with no recipe date whose output records no ask either, and
 * only when it is the drawing that shipped (isSourceOf): re-posting it brings back what shipped.
 */
export function rawRefusal(job, raw, meta, hash) {
  if (raw.record) {
    if (job.since && raw.at < job.since) return `its raw was drawn before its recipe (${raw.at.slice(0, 10)})`;
    return raw.record.ask === hash ? null : 'its raw was drawn for another ask';
  }
  if (job.since) return 'its raw has no record, and its recipe dates its drawings';
  if (meta?.ask) return 'its raw has no record, and its output records what it answers';
  if (!isSourceOf(raw, meta)) return `its raw is not the drawing that shipped (drawn ${raw.at.slice(0, 10)}, the shipped one ${meta.at.slice(0, 10)})`;
  return null;
}

/**
 * Why --adopt may not record a raw as drawn for today's ask, or null: never a raw from before its
 * job's recipe, judged by the earlier of its record's time and its file's (a copied cache gets new
 * file times). `raw` = { mtime (ISO), record }.
 */
export function adoptRefusal(job, { mtime, record }) {
  const at = record?.at && record.at < mtime ? record.at : mtime;
  return job.since && at < job.since ? `its raw is from before the recipe (${at.slice(0, 10)})` : null;
}
