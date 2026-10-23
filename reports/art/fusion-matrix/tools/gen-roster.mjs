#!/usr/bin/env node
// Writes src/art/fusion-roster.js from this matrix's fusion-roster.json (the approved design record)
// and palette-check.json (the carriers), so the game's roster never drifts from the record:
// test/fusion-roster.test.js compares the file with rosterSource().
//
//   node reports/art/fusion-matrix/tools/gen-roster.mjs
//
// Derived per pet: `bg` (magenta when one of its six colours is a green, hue 70–170) and `cel` (the
// shade, or the lane carrier when the dominant does not read on the sand). Carried over and checked:
// `lift`, required exactly when the dominant does not read on the lightest hedge pets roam over (one
// of its six colours, chosen in the record for its design: the toad's ember belly, the dragonfly's
// wings), and `prop`, the part of the contract that is not the creature (a molehill, a branch).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHAPTER_GROUNDS } from '../../../../src/art/frame-kit.js';

const MATRIX = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(MATRIX, '..', '..', '..');
export const OUT = join(ROOT, 'src', 'art', 'fusion-roster.js');

/** CIE L* of a #rrggbb colour. */
export function lstar(hex) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 116 * (y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116) - 16;
}
/** A colour separates from a ground when their L* differ by this much (tools/silhouette-check.py SEP_DL). */
export const SEP_DL = 20;
/** The lightest hedge a pet roams over: a dominant must clear it by SEP_DL, or the pet gets a light zone. */
export const HEDGE_LSTAR = Math.max(...Object.values(CHAPTER_GROUNDS).map((g) => lstar(g.hedge)));

function hueSat(h) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return { h: 0, s: 0 };
  const s = d / (1 - Math.abs(mx + mn - 1));
  const H = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h: (H + 360) % 360, s };
}
const isGreen = (h) => {
  const { h: H, s } = hueSat(h);
  return H >= 70 && H <= 170 && s > 0.25;
};
/** A single-quoted JS string: backslashes, quotes and line breaks escaped (JSON's escapes are valid JS). */
const q = (s) => `'${JSON.stringify(String(s)).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`;

/** The derived fields of one roster entry. */
export function derive(f, pc) {
  const pal = ['dominant', 'shade', 'light', 'accentA', 'accentB', 'extra'].map((k) => f.palette[k]);
  const cel = pc.lane.dominantSeparates ? pal[1] : pc.lane.carrier.hex;
  const needs = lstar(pal[0]) - HEDGE_LSTAR < SEP_DL; // the dominant blends into the hedges
  const lift = f.lift ?? null;
  if (needs && !lift) throw new Error(`${f.key}: its dominant does not read on the hedges: give it a lift colour in the record`);
  if (!needs && lift) throw new Error(`${f.key}: its dominant reads on the hedges: drop its lift`);
  if (lift && lstar(lift) - HEDGE_LSTAR < SEP_DL) throw new Error(`${f.key}: its lift ${lift} does not read on the hedges either`);
  for (const h of [cel, lift]) if (h && !pal.includes(h)) throw new Error(`${f.key}: ${h} is not one of its colours`);
  return { pal, cel, lift, bg: pal.some(isGreen) ? 'magenta' : 'green' };
}

/** An accepted near-miss as JS: its margins as numbers, its reason as a quoted string. */
const acceptedSource = (g) =>
  `{ margins: { ${Object.entries(g.margins).map(([k, v]) => `${k}: ${Number(v)}`).join(', ')} }, why: ${q(String(g.why))} }`;

/** One roster entry, as JS. */
export function entrySource(f, pc) {
  const { pal, cel, lift, bg } = derive(f, pc);
  if (lift && !f.liftAt) throw new Error(`${f.key}: say where its light zone goes (liftAt)`);
  const { a, b } = f.parents;
  return (
    `  ${q(f.key)}: {\n` +
    `    animal: ${q(f.animal)}, name: ${q(f.name)}, view: ${q(f.view)},${f.contractView ? ` contractView: ${q(f.contractView)},` : ''} move: ${q(f.move)}, bg: ${q(bg)},${f.prop ? ` prop: ${q(f.prop)},` : ''}\n` +
    `${f.approved ? `    approved: ${q(f.approved)},\n` : ''}` +
    `    desc: ${q(f.desc)},\n` +
    `    pose: ${q(f.pose)},\n` +
    `    from: { ${a.element}: ${q(a.feature)}, ${b.element}: ${q(b.feature)} },\n` +
    `    pal: [${pal.map(q).join(', ')}], cel: ${q(cel)},${lift ? ` lift: ${q(lift)}, liftAt: ${q(f.liftAt)},` : ''}\n` +
    `${f.gateAccepted ? `    gateAccepted: ${acceptedSource(f.gateAccepted)},\n` : ''}` +
    `  },`
  );
}

/** The text of src/art/fusion-roster.js for the record as it stands. */
export function rosterSource() {
  const R = JSON.parse(readFileSync(join(MATRIX, 'fusion-roster.json'), 'utf8'));
  const P = JSON.parse(readFileSync(join(MATRIX, 'palette-check.json'), 'utf8'));
  return `${HEAD}${R.fusions.map((f) => entrySource(f, P.fusions[f.key])).join('\n')}\n};\n`;
}

const HEAD = `// The fusion roster (the fusion silhouette pass, reports/art/fusion-matrix/matrix.md): each of the
// 28 fusions (src/sim/classes.js FUSIONS) is a hero pet of its own, one animal with its own
// silhouette contract (tools/refs/fusions/sil-<key>.png), so no two read alike on the field and
// none looks like a foe or a base pet. The parents enter in words and in the palette's accents,
// never as reference images. Shared by the asset pipeline (prompts, contracts, gates) and the
// renderer (the pet's name, how it moves, whether it flips). Since 2026-10-23 the shipped pets are
// these animals redrawn as babies (tools/pipeline-jobs.mjs, the babies' own style): the contracts and
// the grown sprites (tools/refs/fusions/grown/) are the grown pass's record. \`view\` is how the baby
// is drawn; \`contractView\`, where it differs, how its grown contract was; \`approved\`, a design that
// ships as drawn (no generation). Pure data, no imports: src/art/tokens.js
// reads the names from it. Generated by reports/art/fusion-matrix/tools/gen-roster.mjs from the
// matrix's fusion-roster.json: edit the record, then run the script.
//
//   animal  the species: unique among the fusions, the foes (FOE_ROSTER) and the base pets
//   name    the pet's name (namecards, the inspect card: src/art/tokens.js petName)
//   view    how the sprite is drawn, as FOE_ROSTER: profile = strict side view facing left (the
//           renderer flips it to face where it goes); front and spread are symmetric and never flipped
//   move    how it roams (src/kv/roam.js gaitAt): walk | crawl | leap | hover (a detached shadow) |
//           swim (an S drift) | float (a slow bob)
//   bg      the key colour: green unless one of its six colours is a green (hue 70–170), then magenta
//   prop    the part of its silhouette that is not the creature (the mole's molehill): drawn, not a ground
//   from    each parent's feature, in words
//   pal     six colours: the dominant (the sprite's body colour), its shade and light, accent A
//           and B (from the parents' element palettes), one extra; the fusion's game colour
//           (src/sim/classes.js FUSIONS) is one of the six
//   cel     the cel-shade tone the prompt names: the shade, or, where the dominant does not read on
//           the sand (reports/art/fusion-matrix/palette-check.json), the palette colour that steps
//           furthest from it, drawn as large markings
//   lift    only where the dominant does not read on the dark hedges pets roam over: one of its
//           colours, chosen for its design, drawn as a large light zone where liftAt says
//   gateAccepted  as FOE_ROSTER: a reviewed sprite that ships a hair outside its gates, with the
//           margins seen in review and why it is kept
export const FUSION_ROSTER = {
`;

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  writeFileSync(OUT, rosterSource());
  console.log(`wrote ${OUT}`);
}
