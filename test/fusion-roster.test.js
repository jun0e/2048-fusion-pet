// The fusion roster (src/art/fusion-roster.js, the fusion silhouette pass): 28 hero pets, each one
// animal with its own silhouette contract, names the namecards use, and palettes the pipeline's
// colour rule and ground gate can rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FUSIONS, ELEMENT_KEYS } from '../src/sim/classes.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { FOE_ROSTER } from '../src/art/foe-roster.js';
import { petName } from '../src/art/tokens.js';
import { ANIMALS, PET_GROUNDS } from '../tools/pipeline-jobs.mjs';
import { HEDGE_LSTAR, OUT, entrySource, rosterSource } from '../reports/art/fusion-matrix/tools/gen-roster.mjs';

/** CIE L* of a #RRGGBB colour. */
function lstar(hex) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const f = y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116;
  return 116 * f - 16;
}
const LANE = lstar('#D9C7A3');

test('one roster entry per fusion, each a different animal from the other fusions, the foes and the base pets', () => {
  assert.deepEqual(Object.keys(FUSION_ROSTER).sort(), Object.keys(FUSIONS).sort());
  const animals = Object.values(FUSION_ROSTER).map((r) => r.animal);
  assert.equal(new Set(animals).size, 28, 'twenty-eight different animals');
  const foes = new Set(Object.values(FOE_ROSTER).map((r) => r.animal));
  // the base pets' species: dragon, bird, turtle, orca, snake, unicorn, lion, ox
  const babies = Object.values(ANIMALS).map((a) => a.baby.split(':')[0].replace(/^baby /, '').split(' ')[0]);
  assert.equal(babies.length, 8);
  const species = (a) => a.replace(/\(.*\)/, '').trim().split(' ').pop();
  for (const a of animals) {
    assert.ok(!foes.has(a), `${a} is not a foe`);
    assert.ok(!babies.includes(species(a)), `${a} is not a base pet`);
  }
});

test('names: unique, and the namecards use them (the six renames included)', () => {
  const names = Object.values(FUSION_ROSTER).map((r) => r.name);
  assert.equal(new Set(names).size, 28);
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    const [a, b] = FUSIONS[k].parts;
    assert.equal(petName(a, b), r.name, k);
    assert.equal(petName(b, a), r.name, `${k}, merged the other way round`);
  }
  assert.deepEqual(
    ['fire+poison', 'fire+metal', 'fire+nature', 'ice+poison', 'poison+metal', 'earth+nature'].map((k) => FUSION_ROSTER[k].name),
    ['Embertoad', 'Anviljaw', 'Emberhopper', 'Frostjelly', 'Rustclaw', 'Mossbara'],
  );
});

test('entries are complete: a flippable view, a move, a contract, both parents in words, six colours with the cel tone among them', () => {
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    const [a, b] = FUSIONS[k].parts;
    assert.ok(['profile', 'front', 'spread'].includes(r.view), `${k}: view`);
    assert.ok(['walk', 'crawl', 'leap', 'hover', 'swim', 'float'].includes(r.move), `${k}: move`);
    assert.ok(['green', 'magenta'].includes(r.bg), `${k}: key colour`);
    assert.ok(existsSync(new URL(`../tools/refs/fusions/sil-${k}.png`, import.meta.url)), `${k}: silhouette contract`);
    assert.deepEqual(Object.keys(r.from).sort(), [a, b].sort(), `${k}: a feature from each parent`);
    assert.ok(r.desc.length > 40 && r.pose.length > 30, `${k}: a description and a pose in words`);
    assert.equal(r.pal.length, 6, `${k}: six colours`);
    for (const h of r.pal) assert.match(h, /^#[0-9a-fA-F]{6}$/, `${k}: ${h}`);
    assert.equal(r.pal[0].toLowerCase(), FUSIONS[k].color.toLowerCase(), `${k}: the dominant is the fusion's colour`);
    assert.ok(r.pal.includes(r.cel), `${k}: the cel tone is a palette colour`);
    if (r.lift) assert.ok(r.pal.includes(r.lift), `${k}: the light zone is a palette colour`);
    // the prompt says no ground: a prop its contract includes (a molehill, a branch) is named, and only then
    const words = `${r.desc} ${r.pose} ${r.from[a]} ${r.from[b]}`;
    assert.ok(!/puddle|pedestal|platform/.test(words), `${k}: nothing to stand on`);
    if (/\b(molehill|mound|branch)\b/.test(words)) assert.match(r.prop ?? '', /molehill|branch/, `${k}: its prop is declared`);
  }
  assert.deepEqual(Object.keys(FUSION_ROSTER).filter((k) => FUSION_ROSTER[k].prop), ['fire+earth', 'poison+nature']);
});

test('the roster is the approved record: src/art/fusion-roster.js is what the matrix generator writes', () => {
  assert.equal(readFileSync(OUT, 'utf8'), rosterSource(), 'run node reports/art/fusion-matrix/tools/gen-roster.mjs after editing fusion-roster.json');
  for (const [k, r] of Object.entries(FUSION_ROSTER)) assert.equal(!!r.liftAt, !!r.lift, `${k}: a light zone says where it goes`);
});

test('the generator writes valid JS for any reason a reviewed near-miss gives (quotes, apostrophes, backslashes, line breaks)', async () => {
  const record = JSON.parse(readFileSync(new URL('../reports/art/fusion-matrix/fusion-roster.json', import.meta.url), 'utf8'));
  const checks = JSON.parse(readFileSync(new URL('../reports/art/fusion-matrix/palette-check.json', import.meta.url), 'utf8'));
  const mole = record.fusions.find((f) => f.key === 'fire+earth');
  const why = 'the mole\'s mound, a "pop-up", a back\\slash,\nand a line break';
  const src = entrySource({ ...mole, gateAccepted: { margins: { twin: -0.025, ally: -0.035 }, why } }, checks.fusions['fire+earth']);
  const mod = await import(`data:text/javascript,${encodeURIComponent(`export const R = {\n${src}\n};`)}`);
  assert.deepEqual(mod.R['fire+earth'].gateAccepted, { margins: { twin: -0.025, ally: -0.035 }, why });
});

test('the key colour: magenta exactly where the palette has a green', () => {
  const green = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const d = mx - mn;
    if (!d) return false;
    const s = d / (1 - Math.abs(mx + mn - 1));
    const hue = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    const H = (hue + 360) % 360;
    return H >= 70 && H <= 170 && s > 0.25;
  };
  for (const [k, r] of Object.entries(FUSION_ROSTER)) assert.equal(r.bg, r.pal.some(green) ? 'magenta' : 'green', k);
});

test('every pet can read where it roams: its cel tone steps 20 L* from the sand, its body or light zone from the hedges', () => {
  // pets stand on the field (src/sim/roam.js Y_MIN, above the parapet): the lanes and the hedges, not the keep floor
  const hedges = Object.entries(PET_GROUNDS).filter(([name]) => name.endsWith('hedge')).map(([, h]) => lstar(h));
  assert.equal(hedges.length, 3, 'one hedge per chapter');
  assert.ok(Math.abs(Math.max(...hedges) - HEDGE_LSTAR) < 1e-9);
  assert.ok(!Object.keys(PET_GROUNDS).some((n) => n.includes('keep')));
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    assert.ok(LANE - lstar(r.cel) >= 20, `${k}: cel ${r.cel} on the lane (L* ${lstar(r.cel).toFixed(0)})`);
    const light = r.lift ?? r.pal[0];
    assert.ok(lstar(light) - HEDGE_LSTAR >= 20, `${k}: ${light} on the hedges (L* ${lstar(light).toFixed(0)})`);
    assert.equal(!!r.lift, lstar(r.pal[0]) - HEDGE_LSTAR < 20, `${k}: a light zone exactly when its dominant blends into the hedges`);
    // the cel tone is the shade unless the dominant does not read on the sand
    if (LANE - lstar(r.pal[0]) >= 20) assert.equal(r.cel, r.pal[1], `${k}: a dominant that reads keeps its shade as the cel tone`);
  }
  assert.equal(FUSION_ROSTER['fire+poison'].lift, '#FF9E3D', 'the toad’s light zone is its ember belly');
});

// the contracts' symmetry is what the view promises: a front or top view is drawn symmetric and never
// flipped, a profile is not symmetric (it is flipped to face where it goes)
const probe = spawnSync('python3', ['-c', 'import PIL, numpy'], { encoding: 'utf8' });
test('every contract is drawn as its view says: front and spread contracts mirror themselves, profiles do not', { skip: probe.status === 0 ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = fileURLToPath(new URL('../tools/refs/fusions/', import.meta.url));
  const py = `
import glob, json, sys
import numpy as np
from PIL import Image
out = {}
for p in sorted(glob.glob(sys.argv[1] + 'sil-*.png')):
    m = np.asarray(Image.open(p).convert('L')) < 100
    ys, xs = np.where(m)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out[p.rsplit('sil-', 1)[1][:-4]] = float((m & m[:, ::-1]).sum() / (m | m[:, ::-1]).sum())
print(json.dumps(out))`;
  const mirror = JSON.parse(spawnSync('python3', ['-c', py, dir], { encoding: 'utf8' }).stdout);
  assert.equal(Object.keys(mirror).length, 28);
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    if (r.view === 'profile') assert.ok(mirror[k] < 0.85, `${k}: a profile contract is not symmetric (${mirror[k].toFixed(2)})`);
    else assert.ok(mirror[k] >= 0.9, `${k}: a ${r.view} contract mirrors itself (${mirror[k].toFixed(2)})`);
  }
});

test('every element appears in seven fusions, as A or B', () => {
  for (const el of ELEMENT_KEYS) assert.equal(Object.keys(FUSION_ROSTER).filter((k) => k.split('+').includes(el)).length, 7, el);
});
