// The asset pipeline's bookkeeping rules (tools/pipeline.mjs), pure so they can be tested: which jobs
// make no image, which file a job is made from, when a shipped output is stale, when a job may start.
import { join } from 'node:path';

/** A job that makes no image: an approved design (a file in the repo), or one made from another job's raw (a portrait). */
export const isPostOnly = (job) => !!(job.approved || job.from);

/**
 * The image a job is post-processed from: an approved design's committed file (never the raw cache,
 * which may hold an older drawing), the source of the job it is made from, or its own raw.
 * `byId` holds every planned job; `rawOf(id)` is the raw cache's path for an id.
 */
export function sourceOf(job, { byId, root, rawOf }) {
  if (job.approved) return join(root, job.approved);
  if (job.from) {
    const src = byId.get(job.from);
    return src ? sourceOf(src, { byId, root, rawOf }) : rawOf(job.from);
  }
  return rawOf(job.id);
}

/**
 * Whether a shipped output no longer answers its job: it was made for another ask (`meta.ask`, the
 * hash of what was asked and, for a post-only job, of its source and post-processing), or before the
 * job's recipe began (`job.since`: a grown sprite or a 3D portrait under the baby recipes). An output
 * with no record at all counts as current only when its job has no recipe date.
 */
export function isStale(job, meta, hash) {
  if (meta?.ask && meta.ask !== hash) return true;
  if (job.since && !(meta?.at >= job.since)) return true;
  return false;
}

/**
 * Whether a job may start: each dependency is done in this run, or is not in this run and its source
 * already exists (`sourceExists(id)`, e.g. an approved design or a cached raw).
 */
export const isReady = (job, state, sourceExists) => job.deps.every((d) => state.get(d) === 'done' || (!state.has(d) && sourceExists(d)));

/** The post-only jobs to add to a run: those made from a job in it (they are free, and must follow their source). */
export const followers = (jobs, planned) => {
  const inRun = new Set(jobs.map((j) => j.id));
  return planned.filter((j) => j.from && inRun.has(j.from) && !inRun.has(j.id));
};
