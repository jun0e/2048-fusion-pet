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
 * date (a legacy asset).
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
 * them, directly or not (a portrait, a halo edit, a later stage, a chapter's foes). Each follows its
 * reference; one whose raw still answers its ask once the reference is made is only re-posted.
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
 * What a run draws, for its plan: `sure`, the generated jobs whose raw does not answer them
 * (`reusable`), and those made from an output that changes in the run (a new drawing, a stale output
 * made again (`stale`), anything made from either); `maybe`, the other generated jobs made from a job
 * in the run (re-posted from a missing output, which may come back as it was).
 */
export function drawPlan(todo, { reusable, stale }) {
  const inRun = new Set(todo.map((j) => j.id));
  const draws = (j) => !isPostOnly(j) && !reusable(j);
  const changed = new Set(todo.filter((j) => draws(j) || stale(j)).map((j) => j.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const j of todo) {
      if (!changed.has(j.id) && j.deps.some((d) => changed.has(d))) {
        changed.add(j.id);
        grew = true;
      }
    }
  }
  const sure = todo.filter((j) => !isPostOnly(j) && (draws(j) || j.deps.some((d) => changed.has(d))));
  const maybe = todo.filter((j) => !isPostOnly(j) && !sure.includes(j) && j.deps.some((d) => inRun.has(d)));
  return { sure, maybe };
}

/** How far a raw with no record may be from the output stamped after it: the pipeline writes a raw seconds before it records the output. */
export const SOURCE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Whether a cached raw is the drawing a shipped output was made from (`meta`, the output's manifest
 * entry): a raw with a record when it records the output's ask; one with none (an older pipeline's)
 * when the output records no ask either and was stamped within SOURCE_WINDOW_MS of it (another
 * checkout's cache holds older drawings). `raw` = { at (ISO: its record's time, else its file's), record }.
 */
export function isSourceOf(raw, meta) {
  if (raw.record) return !!meta?.ask && raw.record.ask === meta.ask;
  if (meta?.ask) return false;
  return !meta?.at || Math.abs(Date.parse(meta.at) - Date.parse(raw.at)) <= SOURCE_WINDOW_MS;
}

/**
 * Why a cached raw may not stand for a generated job today (be re-posted instead of drawn again), or
 * null when it may. A raw with a record answers the ask it was drawn for (`hash`: today's). A raw
 * with none (an older pipeline's) answers nothing known, so it is taken only for a job with no recipe
 * date whose output records no ask either, when it is the drawing that shipped (isSourceOf) and no
 * reference was drawn after it (`refsAt`: when each dependency's shipped drawing was made).
 */
export function rawRefusal(job, raw, meta, hash, refsAt = []) {
  if (raw.record) return raw.record.ask === hash ? null : 'its raw was drawn for another ask';
  if (job.since) return 'its raw has no record, and its recipe dates its drawings';
  if (meta?.ask) return 'its raw has no record, and its output records what it answers';
  if (!isSourceOf(raw, meta)) return `its raw is not the drawing that shipped (drawn ${raw.at.slice(0, 10)}, the shipped one ${meta.at.slice(0, 10)})`;
  if (refsAt.some((at) => at > raw.at)) return 'a reference was drawn again after it';
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
