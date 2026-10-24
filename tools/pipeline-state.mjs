// The asset pipeline's bookkeeping rules (tools/pipeline.mjs), pure so they can be tested: which jobs
// make no image, which file a job is made from, when a shipped output is stale, when a job may start,
// which jobs follow another. Everything here reads committed files only (the shipped outputs, the
// approved designs, the references in tools/refs): the raw cache is gitignored and differs in every
// checkout, so it never decides what is current.
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
 * a raw; a dependency current at the start may have no raw in this checkout).
 */
export const isReady = (job, state, has) => job.deps.every((d) => (state.get(d) === 'done' || !state.has(d)) && has(d));

/** The post-only jobs made from a job in `jobs` and not in it: they are free, and must follow their source. */
export const followers = (jobs, planned) => {
  const inRun = new Set(jobs.map((j) => j.id));
  return planned.filter((j) => j.from && inRun.has(j.from) && !inRun.has(j.id));
};

/** The jobs to make: the stale or missing ones (`needed`), and every post-only job whose source is made in this run. */
export function toMake(jobs, needed) {
  const todo = new Set(jobs.filter(needed).map((j) => j.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const j of jobs) {
      if (j.from && todo.has(j.from) && !todo.has(j.id)) {
        todo.add(j.id);
        grew = true;
      }
    }
  }
  return jobs.filter((j) => todo.has(j.id));
}

/**
 * Whether a cached raw may be used (reused for a resumed job, re-posted by --repost): it was made for
 * the job's ask today (`rawAsk`, recorded beside the raw when it lands); a raw with no record only
 * for a job with no recipe date (a legacy asset), never one from before the recipe it would ship under.
 */
export const rawCurrent = (job, rawAsk, hash) => (rawAsk ? rawAsk.ask === hash : !job.since);

/**
 * Whether --repost may take a raw for a generated job's output. --adopt (records the raw as made for
 * today's ask; only on raws checked by eye) never takes a raw from before the job's recipe began. A
 * raw with no record is never older than the output it would replace: it cannot be that output's source.
 * `raw` = { mtime (ISO), record }, `meta` the output's manifest entry → null when it may, else why not.
 */
export function repostRefusal(job, { mtime, record }, meta, { adopt = false } = {}) {
  if (adopt && job.since && !(mtime >= job.since)) return `its raw is from before the recipe (${mtime.slice(0, 10)})`;
  if (!adopt && !record && meta?.at && mtime < meta.at) return 'its raw is older than the shipped output, so it is not its source';
  return null;
}
