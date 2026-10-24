// The asset pipeline end to end, in mock mode (labelled placeholder images, no API key) on a temp copy
// of what it needs: which jobs a run makes and draws, which follow, which go stale, what --repost and
// --adopt take, which file a model is sent. tools/pipeline-state.mjs holds the rules; this checks
// tools/pipeline.mjs applies them, to the jobs under the baby recipe and to the older (legacy) ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const hasPil = spawnSync('python3', ['-c', 'import PIL, numpy']).status === 0;
const skip = hasPil ? false : 'needs python3 with Pillow and NumPy';

/** A temp copy of the pipeline and what its jobs read; mock mode writes inside it only. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'pipeline-mock-'));
  cpSync(join(repo, 'package.json'), join(dir, 'package.json'));
  cpSync(join(repo, 'src'), join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'tools'), { recursive: true });
  for (const f of ['pipeline.mjs', 'pipeline-jobs.mjs', 'pipeline-state.mjs', 'pick.mjs', 'gemini-budget.mjs', 'gemini-errors.mjs', 'curl-post.mjs', 'post.py', 'mock_raw.py', 'silhouette-check.py', 'gemini-budget.json']) cpSync(join(repo, 'tools', f), join(dir, 'tools', f));
  cpSync(join(repo, 'tools', 'refs'), join(dir, 'tools', 'refs'), { recursive: true });
  mkdirSync(join(dir, 'tools', '.cache'), { recursive: true });
  writeFileSync(join(dir, 'tools', '.cache', 'gemini-usage.json'), '[]');
  return dir;
}

/** Run the pipeline in mock mode in `dir` → { out (stdout + stderr), code, drawn (images asked for, from the run's log), sent (each drawn job's reference files) }. */
function run(dir, args, salt = 'a') {
  const logFile = join(dir, 'tools/.cache/pipeline/mock-log.jsonl');
  const before = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).length : 0;
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, MOCK_SALT: salt }; // no API keys: mock needs none
  const r = spawnSync(process.execPath, ['tools/pipeline.mjs', '--mock', '--priority=P0,P1,P2', ...args], { cwd: dir, env, encoding: 'utf8' });
  const lines = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).slice(before).map((l) => JSON.parse(l)) : [];
  const sent = Object.fromEntries(lines.filter((l) => l.sent).map((l) => [l.id, l.sent]));
  return { out: `${r.stdout}${r.stderr}`, code: r.status, drawn: lines.filter((l) => l.sent).length, sent };
}
const manifestFile = (dir) => join(dir, 'public/assets/_mock/manifest.json');
const manifest = (dir) => JSON.parse(readFileSync(manifestFile(dir), 'utf8'));
/** Change manifest entries in place: `edit(meta)` for each id. */
function editMeta(dir, ids, edit) {
  const m = manifest(dir);
  for (const id of ids) edit(m.meta[id]);
  writeFileSync(manifestFile(dir), JSON.stringify(m));
}
const rawFile = (dir, id) => join(dir, `tools/.cache/pipeline/mock-raw/${id}.png`);
const outFile = (dir, id) => join(dir, `public/assets/_mock/gen/${id}.png`);
/** Rewrite a sandbox file: `from` must be in it. */
function edit(dir, rel, from, to) {
  const file = join(dir, rel);
  const src = readFileSync(file, 'utf8');
  assert.ok(src.includes(from), `${rel} has ${from}`);
  writeFileSync(file, src.replace(from, to));
}
const FUSION_POST = "post: { fit: 'trim', size: 320, palette: [...r.pal, ...UNI], snap: true }";
const made = (out) => Number(/(\d+) made[,\n]/.exec(out)?.[1]);
const kept = (out) => Number(/(\d+) kept \(/.exec(out)?.[1] ?? 0);
const toMake = (out) => Number(/(\d+) to make/.exec(out)?.[1]);
const PET = ['fusion.fire+ice', 'portrait.fire+ice', 'portrait.fire+ice.ascended'];
const only = (ids) => `--only=${ids.join(',')}`;

test('pipeline (mock): a pet, its portrait and its halo edit: made, current, re-posted after a post change, redrawn after a new ask', { skip }, () => {
  const dir = sandbox();
  try {
    const first = run(dir, [only([...PET, 'fusion.ice+lightning', 'portrait.ice+lightning'])]);
    assert.equal(made(first.out), 5, first.out);
    assert.equal(first.drawn, 2, 'the pet and its halo edit; the narwhal is an approved file, the portraits no image');
    const m = manifest(dir);
    for (const id of [...PET, 'fusion.ice+lightning', 'portrait.ice+lightning']) assert.ok(m.meta[id].ask, `${id}: records its ask`);
    assert.equal(m.meta['portrait.fire+ice'].model, null, 'a portrait is no image');
    assert.equal(m.meta['fusion.ice+lightning'].model, null, 'the approved narwhal is no image');
    assert.ok(m.meta['fusion.fire+ice'].post, 'a generated output records its post-processing');
    const rec = JSON.parse(readFileSync(`${rawFile(dir, 'fusion.fire+ice')}.ask.json`, 'utf8'));
    assert.equal(rec.ask, m.meta['fusion.fire+ice'].ask, 'the output records the ask its raw was drawn for');
    assert.equal(rec.at, m.meta['fusion.fire+ice'].at, 'and when it was drawn');
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'nothing left');
    // the pet's output lost: re-posted from its raw, it comes back as it was, so its portrait and its
    // halo edit (stale while it is missing) are kept; the plan says it may draw the halo edit, no more
    unlinkSync(outFile(dir, 'fusion.fire+ice'));
    const lost = run(dir, [only(PET)]);
    assert.match(lost.out, /1 to make \(up to 3\): 0 images, ~\$0\.00 for one pass; up to 1 images/, lost.out);
    assert.equal(made(lost.out), 1, lost.out);
    assert.equal(kept(lost.out), 2, lost.out);
    assert.equal(lost.drawn, 0);
    // the halo edit's own prompt changed while the pet is lost: its ask cannot be judged (the pet hashes
    // as missing), but its own part can, so the plan counts its image for sure
    edit(dir, 'tools/pipeline-jobs.mjs', 'a proud, brave little smile', 'a proud, happy little smile');
    unlinkSync(outFile(dir, 'fusion.fire+ice'));
    const own = run(dir, [only(PET)]);
    assert.match(own.out, /: 1 images, ~\$[\d.]+ for one pass/, own.out);
    assert.equal(own.drawn, 1, own.out);
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'nothing left');
    // a real post change (the pet's sprite size): the pet is re-posted from its raw (no image), its
    // portrait follows, and its halo edit, made from the old pixels, is drawn again; the plan says so
    edit(dir, 'tools/pipeline-jobs.mjs', FUSION_POST, FUSION_POST.replace('320', '300'));
    const resized = run(dir, [only(PET)], 'b');
    assert.match(resized.out, /3 to make: 1 images/, resized.out);
    assert.equal(made(resized.out), 3, resized.out);
    assert.equal(resized.drawn, 1, 'only the halo edit is drawn');
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'nothing left');
    // a new ask for the pet (its recipe changed: the output and its raw answer an older one): the pet
    // is drawn again, its portrait follows, and its halo edit is drawn again after it
    editMeta(dir, ['fusion.fire+ice'], (e) => (e.ask = 'an older ask'));
    const recFile = `${rawFile(dir, 'fusion.fire+ice')}.ask.json`;
    writeFileSync(recFile, JSON.stringify({ ...JSON.parse(readFileSync(recFile, 'utf8')), ask: 'an older ask' }));
    const redraw = run(dir, [only(PET)], 'c');
    assert.match(redraw.out, /3 to make: 2 images/, redraw.out);
    assert.equal(made(redraw.out), 3, redraw.out);
    assert.equal(redraw.drawn, 2);
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'nothing left');
    // the recipe date moved past every drawing (prompts unchanged): one run draws the pet and its halo
    // edit again and dates its portrait, then all is current
    edit(dir, 'tools/pipeline-jobs.mjs', "export const BABY_SINCE = '2026-10-23T00:00:00.000Z';", `export const BABY_SINCE = '${new Date().toISOString()}';`);
    const moved = run(dir, [only(PET)], 'd');
    assert.match(moved.out, /3 to make: 2 images/, moved.out);
    assert.equal(moved.drawn, 2, moved.out);
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'current under the new date');
    // the pet's re-post fails (its raw is broken): the pet keeps what shipped, so its portrait and its
    // halo edit, made from that, are kept, not left as work; the run exits 1
    edit(dir, 'tools/pipeline-jobs.mjs', FUSION_POST.replace('320', '300'), FUSION_POST.replace('320', '280'));
    writeFileSync(rawFile(dir, 'fusion.fire+ice'), 'not a png');
    const broken = run(dir, [only(PET)]);
    assert.equal(broken.code, 1, broken.out);
    assert.match(broken.out, /0 made, 2 kept \(current once what they are made from was made\), 1 failed, 1 not done/, broken.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a pet redrawn alone brings its portrait and names its halo edit as stale', { skip }, () => {
  const dir = sandbox();
  try {
    run(dir, [only(PET)]);
    const alone = run(dir, ['--only=fusion.fire+ice', '--force'], 'b');
    assert.match(alone.out, /also making portrait\.fire\+ice: made from a job in this run/);
    assert.match(alone.out, /stale now \(a reference changed\): portrait\.fire\+ice\.ascended; run --priority=P0,P1,P2 --only=portrait\.fire\+ice\.ascended/);
    const halo = run(dir, ['--only=portrait.fire+ice.ascended'], 'b');
    assert.equal(made(halo.out), 1, halo.out);
    assert.equal(halo.drawn, 1);
    assert.doesNotMatch(run(dir, ['--only=fusion.fire+ice', '--dry']).out, /also making/, 'nothing to make: no follower named');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): --repost re-posts from sources and records what they answer; --adopt takes ids, never a raw from before the recipe', { skip }, () => {
  const dir = sandbox();
  try {
    run(dir, [only(PET)]);
    // a pet and its portrait re-posted: no image, and nothing is left stale (the portrait's ask is taken after its pet's re-post)
    const re = run(dir, ['--repost', only(PET.slice(0, 2))]);
    assert.match(re.out, /plan: 2 assets \(P0\+P1\+P2\), each re-posted from its source: no images/);
    assert.match(re.out, /re-post-processed 2 sources/);
    assert.equal(toMake(run(dir, [only(PET), '--dry']).out), 0, 'nothing left');
    // --adopt: only with --repost and --only naming each id
    for (const bad of [['--repost', '--adopt'], ['--repost', '--adopt', '--only=fusion.*'], ['--adopt', '--only=fusion.fire+ice']]) {
      const r = run(dir, bad);
      assert.equal(r.code, 1, bad.join(' '));
      assert.match(r.out, /only with --repost and --only naming each id/);
    }
    // a raw from before the baby recipe (a grown sprite left in a cache), with no record
    const raw = rawFile(dir, 'fusion.fire+ice');
    const record = readFileSync(`${raw}.ask.json`, 'utf8');
    unlinkSync(`${raw}.ask.json`);
    const old = new Date('2026-10-16T05:00:00Z');
    utimesSync(raw, old, old);
    assert.match(run(dir, ['--repost', '--adopt', '--only=fusion.fire+ice']).out, /fusion\.fire\+ice: its raw is from before the recipe \(2026-10-16\): not re-posted/);
    assert.match(run(dir, ['--repost', '--only=fusion.fire+ice']).out, /fusion\.fire\+ice: its raw has no record, and its recipe dates its drawings: not re-posted/, 'a plain --repost does not take it either');
    // a copied cache: the file is new, its record says it was drawn before the recipe
    utimesSync(raw, new Date(), new Date());
    writeFileSync(`${raw}.ask.json`, JSON.stringify({ ...JSON.parse(record), at: '2026-10-16T05:00:00.000Z' }));
    assert.match(run(dir, ['--repost', '--adopt', '--only=fusion.fire+ice']).out, /its raw is from before the recipe \(2026-10-16\): not re-posted/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): older assets (raws with no record, outputs with no ask) are re-posted as before, never labelled with an ask they were not drawn for', { skip }, () => {
  const dir = sandbox();
  const PETS = ['pet.fire.16', 'pet.fire.32'];
  /** As an older pipeline left them: no raw record, no ask or post in the manifest. */
  const legacy = (ids) => {
    for (const id of ids) rmSync(`${rawFile(dir, id)}.ask.json`, { force: true });
    editMeta(dir, ids, (e) => {
      delete e.ask;
      delete e.post;
    });
  };
  try {
    run(dir, [only(PETS)]);
    legacy(PETS);
    // a plain --repost takes them (each raw is the drawing that shipped, written seconds before it)
    const re = run(dir, ['--repost', only(PETS)]);
    assert.match(re.out, /re-post-processed 2 sources/, re.out);
    assert.doesNotMatch(re.out, /not re-posted/);
    assert.ok(!manifest(dir).meta['pet.fire.32'].ask, 'a re-post records no ask for a raw with no record');
    // its output lost: a plain run re-posts its raw (no image), and still records no ask
    unlinkSync(outFile(dir, 'pet.fire.32'));
    const back = run(dir, [only(PETS)]);
    assert.equal(made(back.out), 1, back.out);
    assert.equal(back.drawn, 0, 're-posted, not drawn');
    assert.ok(!manifest(dir).meta['pet.fire.32'].ask, 'no ask it was not drawn for');
    // an output that records its ask, its recipe since changed, and a raw with no record: drawn again
    editMeta(dir, ['pet.fire.32'], (e) => (e.ask = 'an older ask'));
    const edited = run(dir, [only(PETS)]);
    assert.match(edited.out, /1 to make: 1 images/, edited.out);
    assert.equal(edited.drawn, 1);
    const m = manifest(dir);
    assert.equal(m.meta['pet.fire.32'].ask, JSON.parse(readFileSync(`${rawFile(dir, 'pet.fire.32')}.ask.json`, 'utf8')).ask, 'it records the ask its new raw was drawn for');
    // the baby redrawn alone: an older later stage (no ask) is kept, and named with the command that redraws it
    legacy(['pet.fire.32']);
    const kept1 = /drawn before their reference was last drawn, and kept \(they record no ask\): pet\.fire\.32; to draw them again: --priority=P0,P1,P2 --force --only=pet\.fire\.32/;
    const baby = run(dir, ['--only=pet.fire.16', '--force'], 'b');
    assert.match(baby.out, kept1, baby.out);
    assert.equal(toMake(run(dir, [only(PETS), '--dry']).out), 0, 'kept: nothing says it is stale');
    // its output lost: restored from its raw (what shipped), not drawn, and named again
    unlinkSync(outFile(dir, 'pet.fire.32'));
    const restored = run(dir, [only(PETS)]);
    assert.equal(restored.drawn, 0, restored.out);
    assert.match(restored.out, kept1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a legacy output made from a pet in the run (a halo kit drawn before the pet) is kept, re-posted, never drawn unasked', { skip }, () => {
  const dir = sandbox();
  const KIT = ['fusion.fire+ice', 'halo.fire'];
  try {
    run(dir, [only(KIT)]);
    // the kit as an older pipeline left it, drawn before the pet: no record, no ask, an older date
    const old = '2026-10-14T05:00:00.000Z';
    rmSync(`${rawFile(dir, 'halo.fire')}.ask.json`);
    utimesSync(rawFile(dir, 'halo.fire'), new Date(old), new Date(old));
    editMeta(dir, ['halo.fire'], (e) => {
      delete e.ask;
      delete e.post;
      e.at = old;
    });
    // the pet's output lost and restored as it was: its portrait and the kit are kept, and nothing is drawn
    unlinkSync(outFile(dir, 'fusion.fire+ice'));
    const lost = run(dir, [only(KIT)]);
    assert.match(lost.out, /1 to make \(up to 2\), 1 more kept if still current: 0 images, ~\$0\.00 for one pass;(?! up to)/, lost.out);
    assert.equal(lost.drawn, 0);
    assert.equal(made(lost.out), 1, lost.out);
    assert.equal(kept(lost.out), 2, lost.out);
    // the pet re-posted with new pixels: the kit is still kept, and named
    edit(dir, 'tools/pipeline-jobs.mjs', FUSION_POST, FUSION_POST.replace('320', '300'));
    const resized = run(dir, [only(KIT)]);
    assert.equal(resized.drawn, 0, resized.out);
    assert.match(resized.out, /drawn before their reference was last drawn, and kept \(they record no ask\): halo\.fire/);
    // and --repost takes its raw (it is what shipped)
    assert.match(run(dir, ['--repost', '--only=halo.fire']).out, /re-post-processed 1 sources/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a model is sent a reference’s raw only when it is the drawing that shipped, else its output', { skip }, () => {
  const dir = sandbox();
  try {
    run(dir, [only(['pet.fire.16', 'pet.fire.32'])]);
    const shipped = 'public/assets/_mock/gen/pet.fire.16.png';
    const cached = 'tools/.cache/pipeline/mock-raw/pet.fire.16.png';
    assert.deepEqual(run(dir, ['--only=pet.fire.32', '--force']).sent['pet.fire.32'], [cached], 'its raw is the drawing that shipped');
    // the baby's raw a later drawing for the same ask, which never shipped (a redraw whose post failed)
    const recFile = `${rawFile(dir, 'pet.fire.16')}.ask.json`;
    const rec = JSON.parse(readFileSync(recFile, 'utf8'));
    writeFileSync(recFile, JSON.stringify({ ...rec, at: new Date(Date.parse(rec.at) + 1000).toISOString() }));
    assert.deepEqual(run(dir, ['--only=pet.fire.32', '--force']).sent['pet.fire.32'], [shipped]);
    // drawn for another ask (another checkout's cache)
    writeFileSync(recFile, JSON.stringify({ ...rec, ask: 'another ask' }));
    assert.deepEqual(run(dir, ['--only=pet.fire.32', '--force']).sent['pet.fire.32'], [shipped]);
    // the baby with no raw here (current, made in another checkout) and the stage lost with its raw:
    // the stage is drawn from the baby's output, and the run does not stall
    unlinkSync(rawFile(dir, 'pet.fire.16'));
    unlinkSync(outFile(dir, 'pet.fire.32'));
    unlinkSync(rawFile(dir, 'pet.fire.32'));
    const r = run(dir, [only(['pet.fire.16', 'pet.fire.32'])]);
    assert.equal(r.code, 0, r.out);
    assert.equal(made(r.out), 1, r.out);
    assert.deepEqual(r.sent['pet.fire.32'], [shipped]);
    // the baby on disk neither as an output nor as a raw: the stage is never ready, said so, exit 1
    unlinkSync(outFile(dir, 'pet.fire.16'));
    const stalled = run(dir, ['--only=pet.fire.32', '--force']);
    assert.equal(stalled.code, 1, stalled.out);
    assert.match(stalled.out, /never ready: pet\.fire\.32 \(a reference is missing: pet\.fire\.16\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a gated foe records the ask of its pick, and an older pick with no record is drawn again once its output records an ask', { skip }, () => {
  const dir = sandbox();
  try {
    const first = run(dir, ['--only=enemy.pixie']);
    assert.equal(made(first.out), 1, first.out);
    const side = JSON.parse(readFileSync(join(dir, 'tools/.cache/pipeline/mock-cand/enemy.pixie.gate.json'), 'utf8'));
    assert.equal(manifest(dir).meta['enemy.pixie'].ask, side.base, 'the output records the ask its pick answers');
    assert.equal(toMake(run(dir, ['--only=enemy.pixie', '--dry']).out), 0);
    // a pick from before records (no raw record, no sidecar), its output lost: re-posted and scored again, no ask recorded
    unlinkSync(`${rawFile(dir, 'enemy.pixie')}.ask.json`);
    rmSync(join(dir, 'tools/.cache/pipeline/mock-cand/enemy.pixie.gate.json'));
    editMeta(dir, ['enemy.pixie'], (e) => delete e.ask);
    unlinkSync(outFile(dir, 'enemy.pixie'));
    const back = run(dir, ['--only=enemy.pixie']);
    assert.equal(made(back.out), 1, back.out);
    assert.equal(back.drawn, 0, 're-posted, not drawn');
    assert.ok(!manifest(dir).meta['enemy.pixie'].ask);
    // its roster changed since (its output records an older ask): the unrecorded pick is not taken for it
    editMeta(dir, ['enemy.pixie'], (e) => (e.ask = 'an older ask'));
    const edited = run(dir, ['--only=enemy.pixie']);
    assert.match(edited.out, /1 to make: 3 images, ~\$[\d.]+ for one pass \([^)]*counting the candidates of 1 gated jobs\); up to 6 images/, edited.out);
    assert.ok(edited.drawn >= 3 && edited.drawn <= 6, `three candidates, and three more when none is inside the gates (${edited.drawn})`);
    assert.equal(manifest(dir).meta['enemy.pixie'].ask, JSON.parse(readFileSync(join(dir, 'tools/.cache/pipeline/mock-cand/enemy.pixie.gate.json'), 'utf8')).base);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline (mock): a chapter’s lead foe redrawn keeps an older foe drawn from it (no ask), and names it', { skip }, () => {
  const dir = sandbox();
  const FOES = ['enemy.pixie', 'enemy.griffinChick'];
  const cand = (id) => join(dir, `tools/.cache/pipeline/mock-cand/${id}.gate.json`);
  try {
    run(dir, [only(FOES)]);
    // the follower as an older pipeline left it: no raw record, no pick record, no ask, an older date
    const old = '2026-10-14T05:00:00.000Z';
    rmSync(`${rawFile(dir, 'enemy.griffinChick')}.ask.json`);
    rmSync(cand('enemy.griffinChick'));
    utimesSync(rawFile(dir, 'enemy.griffinChick'), new Date(old), new Date(old));
    editMeta(dir, ['enemy.griffinChick'], (e) => {
      delete e.ask;
      delete e.own;
      delete e.post;
      e.at = old;
    });
    // the lead's roster changed: the lead is drawn again (new candidates), the follower is kept, and
    // named with the command that redraws it
    edit(dir, 'src/art/foe-roster.js', 'two long tail streamers', 'two long curling tail streamers');
    const lead = run(dir, [only(FOES)], 'b');
    assert.match(lead.out, /1 to make, 1 more kept if still current: 3 images/, lead.out);
    assert.equal(made(lead.out), 1, lead.out);
    assert.equal(kept(lead.out), 1, lead.out);
    assert.deepEqual(Object.keys(lead.sent), ['enemy.pixie'], 'only the lead is drawn');
    assert.match(lead.out, /drawn before their reference was last drawn, and kept \(they record no ask\): enemy\.griffinChick/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
