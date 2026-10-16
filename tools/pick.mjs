// How tools/pipeline.mjs chooses among a gated job's candidates (the foes): small pure rules,
// unit-tested in test/pick.test.js. tools/silhouette-check.py scores each candidate; a candidate
// whose worst gate margin is at least GATE_TOLERANCE is inside the gates, give or take a hair.
//
//   rankCandidates  inside the gates first, then by score
//   needsStrict     a strict round only when no candidate is inside the gates
//   strictText      the strict round's lead, built from the gates the candidates failed
//   gateBrief       what the manifest and the run log keep of a candidate's scores

/** The rules' version, as tools/silhouette-check.py stamps it (2: outline by distance, flips fitted, marching chapters). */
export const GATE_VERSION = 2;
/** A candidate inside every gate but for a hair (each margin >= this) counts as inside. */
export const GATE_TOLERANCE = -0.03;

/** Whether a scored candidate (or a stored gate) is inside the gates, give or take GATE_TOLERANCE. */
export const insideTolerance = (c) => c != null && Number.isFinite(c.worst) && c.worst >= GATE_TOLERANCE;

/** Candidates inside the gates first, then by score (higher first); equal ones keep their order. */
export function rankCandidates(cands) {
  return cands
    .map((c, i) => ({ c, i }))
    .sort((a, b) => Number(insideTolerance(b.c)) - Number(insideTolerance(a.c)) || (b.c.score ?? -Infinity) - (a.c.score ?? -Infinity) || a.i - b.i)
    .map(({ c }) => c);
}

/** One strict round, only when no candidate so far is inside the gates. */
export const needsStrict = (cands) => !cands.some(insideTolerance);

/** How much worse than its reviewed worst margin an accepted miss may get (re-scoring noise). */
export const ACCEPT_SLACK = 0.01;

/**
 * Whether a stored gate's miss is the reviewed one (src/art/foe-roster.js gateAccepted): every gate it
 * misses is one the review accepted, each by no more than the review saw for that gate (+ ACCEPT_SLACK).
 */
export function acceptedMiss(gate, accepted) {
  if (!accepted?.margins || !gate?.margins) return false;
  const missed = failingGates(gate.margins);
  return missed.length > 0 && missed.every((g) => g in accepted.margins && gate.margins[g] >= accepted.margins[g] - ACCEPT_SLACK);
}

/** The images a job costs: a gated job makes pick.n candidates, then up to pick.n more in its strict round. → { first, most } */
export const imagesFor = (job) => (job.pick ? { first: job.pick.n, most: 2 * job.pick.n } : { first: 1, most: 1 });

/** The gates a candidate misses (negative margins), worst first. */
export function failingGates(margins = {}) {
  return Object.entries(margins)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);
}

/** The pets' animals (src/sim/classes.js elements): a foe's outline must not read as one of them. */
const PET_ANIMALS = 'a dragon, a bird, a turtle, an orca, a snake, a unicorn, a lion or an ox';

/** The strict round's instructions, one per kind of miss. */
export const STRICT = {
  contract: 'STRICT: earlier attempts drifted from the contract. Fill the silhouette of image 1 exactly: the same outline, pose and view, nothing added or removed. ',
  values:
    'STRICT VALUES: earlier attempts blended into the ground. Make the cream zone bigger (belly, chest, face or wing field, at least two fifths of the creature) and the dark mass darker: two clear values, a dark body and a big cream zone, few mid tones. ',
  twin: (animal = 'creature', features = '') =>
    `STRICT SHAPE: earlier attempts looked too much like another foe of the army. Exaggerate this ${animal}’s own distinctive features${features ? ` (${features})` : ''} inside the silhouette, so the outline reads as a ${animal} at a glance. `,
  // the ally gate compares outlines with the roaming pets, so its answer is a shape too
  ally: (animal = 'creature', features = '') =>
    `STRICT SHAPE: earlier attempts had the outline of one of the player’s pets (${PET_ANIMALS}). Exaggerate this ${animal}’s own distinctive features${features ? ` (${features})` : ''} inside the silhouette, so the outline cannot be mistaken for any of them. `,
  allyToo: `Its outline must not look like any of the player’s pets either (${PET_ANIMALS}). `,
};

/**
 * The strict round's lead text, from the gates the scored candidates missed (all of them, so the
 * round answers every way the first one failed): the contract → fill the silhouette exactly; a
 * ground (lane, hedge or keep) → a bigger cream zone and a darker mass; a twin (any foe, or one of
 * its chapters) → exaggerate its own features; an ally (a pet's outline) → the same, away from the
 * pets' animals; both twin and ally → one shape line plus the pets. With nothing
 * scored, or nothing named, the contract line. `job` gives the foe's animal and pose (its features).
 */
export function strictText(cands, job = {}) {
  const missed = new Set(cands.flatMap((c) => failingGates(c.margins)));
  const twin = missed.has('twin') || missed.has('twinChapter');
  const parts = [];
  if (missed.has('contract') || !(missed.has('ground') || twin || missed.has('ally'))) parts.push(STRICT.contract);
  if (missed.has('ground')) parts.push(STRICT.values);
  if (twin) parts.push(STRICT.twin(job.animal, job.pose));
  if (missed.has('ally')) parts.push(twin ? STRICT.allyToo : STRICT.ally(job.animal, job.pose));
  return parts.join('');
}

/** What the manifest (meta.gate) and the run log keep of a scored candidate, with its version and verdicts. */
export function gateBrief(c) {
  const { n, score, worst, margins, contract40, contract120, mirror, twin, twinChapter, ally, ground, light, dark } = c;
  return {
    gateVersion: c.gateVersion ?? GATE_VERSION,
    n,
    pass: c.pass ?? (margins ? failingGates(margins).length === 0 : false),
    inside: insideTolerance(c),
    score,
    worst,
    margins,
    contract40,
    contract120,
    mirror,
    twin,
    twinChapter,
    ally,
    ground,
    light,
    dark,
  };
}
