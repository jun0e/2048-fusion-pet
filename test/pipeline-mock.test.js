// The asset pipeline end to end, in mock mode (labelled placeholder images, no API key) on a temp copy
// of what it needs: which jobs a run makes, which follow, which go stale, what --repost and --adopt
// take. tools/pipeline-state.mjs holds the rules; this checks tools/pipeline.mjs applies them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const hasPil = spawnSync('python3', ['-c', 'import PIL, numpy']).status === 0;

/** A temp copy of the pipeline and what the fusion pets' jobs read; mock mode writes inside it only. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'pipeline-mock-'));
  cpSync(join(repo, 'package.json'), join(dir, 'package.json'));
  cpSync(join(repo, 'src'), join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'tools', 'refs', 'fusions'), { recursive: true });
  for (const f of ['pipeline.mjs', 'pipeline-jobs.mjs', 'pipeline-state.mjs', 'pick.mjs', 'gemini-budget.mjs', 'gemini-errors.mjs', 'curl-post.mjs', 'post.py', 'mock_raw.py', 'gemini-budget.json']) cpSync(join(repo, 'tools', f), join(dir, 'tools', f));
  for (const f of ['babies-line.png', 'fusions/grown', 'fusions/approved']) cpSync(join(repo, 'tools', 'refs', f), join(dir, 'tools', 'refs', f), { recursive: true });
  mkdirSync(join(dir, 'tools', '.cache'), { recursive: true });
  writeFileSync(join(dir, 'tools', '.cache', 'gemini-usage.json'), '[]');
  return dir;
}

/** Run the pipeline in mock mode in `dir` → { out (stdout + stderr), code }. */
function run(dir, args, salt = 'a') {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, MOCK_SALT: salt }; // no API keys: mock needs none
  const r = spawnSync(process.execPath, ['tools/pipeline.mjs', '--mock', '--priority=P0,P1,P2', ...args], { cwd: dir, env, encoding: 'utf8' });
  return { out: `${r.stdout}${r.stderr}`, code: r.status };
}
const manifest = (dir) => JSON.parse(readFileSync(join(dir, 'public', 'assets', '_mock', 'manifest.json'), 'utf8'));
const made = (out) => Number(/(\d+) made,/.exec(out)?.[1]);
const toMake = (out) => Number(/(\d+) to make/.exec(out)?.[1]);
const PET = ['fusion.fire+ice', 'portrait.fire+ice', 'portrait.fire+ice.ascended'];

test('pipeline (mock): a run makes what is missing, then nothing; a stale pet is re-posted or redrawn, its portrait follows, its halo when the drawing changed', { skip: hasPil ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = sandbox();
  try {
    const first = run(dir, [`--only=${[...PET, 'fusion.ice+lightning', 'portrait.ice+lightning'].join(',')}`]);
    assert.equal(made(first.out), 5, first.out);
    const m = manifest(dir);
    for (const id of [...PET, 'fusion.ice+lightning', 'portrait.ice+lightning']) assert.ok(m.meta[id].ask, `${id}: records its ask`);
    assert.equal(m.meta['portrait.fire+ice'].model, null, 'a portrait is no image');
    assert.equal(m.meta['fusion.ice+lightning'].model, null, 'the approved narwhal is no image');
    assert.ok(JSON.parse(readFileSync(join(dir, 'tools/.cache/pipeline/mock-raw/fusion.fire+ice.png.ask.json'), 'utf8')).ask, 'a raw carries its record');
    // nothing left
    assert.equal(toMake(run(dir, [`--only=${PET.join(',')}`, '--dry']).out), 0);
    const older = (field) => {
      const mm = manifest(dir);
      mm.meta['fusion.fire+ice'][field] = `an older ${field}`;
      writeFileSync(join(dir, 'public/assets/_mock/manifest.json'), JSON.stringify(mm));
    };
    assert.ok(manifest(dir).meta['fusion.fire+ice'].post, 'a generated output records its post-processing');
    // the shipped pet was post-processed otherwise (a new size), and its cached raw answers today's
    // ask: it is re-posted (no image), its portrait follows, and its halo, made from the same drawing,
    // stays current
    older('post');
    const repost = run(dir, [`--only=${PET.join(',')}`], 'b');
    assert.match(repost.out, /2 to make: 0 images, ~\$0\.00 for one pass; 1 re-posted from their cached raws/);
    assert.equal(made(repost.out), 2, repost.out);
    // and when it answers an older ask, and so does its raw, a plain run draws it again, its portrait
    // follows, and its halo, found current at the start, is made in the run once the pet is redrawn
    older('ask');
    const rec = join(dir, 'tools/.cache/pipeline/mock-raw/fusion.fire+ice.png.ask.json');
    writeFileSync(rec, JSON.stringify({ ...JSON.parse(readFileSync(rec, 'utf8')), ask: 'an older ask' }));
    const redraw = run(dir, [`--only=${PET.join(',')}`], 'b');
    assert.match(redraw.out, /2 to make: 1 images/);
    assert.equal(made(redraw.out), 3, redraw.out);
    assert.equal(toMake(run(dir, [`--only=${PET.join(',')}`, '--dry']).out), 0, 'and nothing is left stale');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a pet redrawn alone lists its halo as stale, and a plain run then makes exactly that', { skip: hasPil ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = sandbox();
  try {
    run(dir, [`--only=${PET.join(',')}`]);
    const alone = run(dir, ['--only=fusion.fire+ice', '--force'], 'c');
    assert.match(alone.out, /also making portrait\.fire\+ice/);
    assert.match(alone.out, /stale now \(a reference was remade\): portrait\.fire\+ice\.ascended; run --priority=P0,P1,P2 --only=portrait\.fire\+ice\.ascended/);
    const halo = run(dir, ['--only=portrait.fire+ice.ascended'], 'c');
    assert.equal(made(halo.out), 1, halo.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): --adopt needs --repost and --only, and never takes a raw from before the recipe', { skip: hasPil ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = sandbox();
  try {
    run(dir, [`--only=${PET.join(',')}`]);
    const all = run(dir, ['--repost', '--adopt']);
    assert.equal(all.code, 1);
    assert.match(all.out, /only with --repost and --only/);
    // a raw from before the baby recipe (a grown sprite left in a cache), with no record
    const raw = join(dir, 'tools/.cache/pipeline/mock-raw/fusion.fire+ice.png');
    unlinkSync(`${raw}.ask.json`);
    const old = new Date('2026-10-16T05:00:00Z');
    utimesSync(raw, old, old);
    const adopt = run(dir, ['--repost', '--adopt', '--only=fusion.fire+ice']);
    assert.match(adopt.out, /fusion\.fire\+ice: its raw is from before the recipe \(2026-10-16\): not re-posted/);
    // and a plain --repost (which draws nothing) does not take a record-less raw for a job under the recipe either
    assert.match(run(dir, ['--repost', '--only=fusion.fire+ice']).out, /: 0 images, ~\$0\.00 for one pass; 1 re-posted from their cached raws.*not re-posted/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
