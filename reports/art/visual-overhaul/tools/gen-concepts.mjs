#!/usr/bin/env node
// Concept images for the visual-overhaul proposal (Revision 2): the skill's external-asset
// sourcing gate, run for real. Standalone; it mirrors tools/pipeline.mjs's Vertex AI express
// backend (the same curl call, tools/curl-post.mjs) but writes ONLY to <overhaul>/concepts/
// and never touches public/assets, the manifest or the catalog.
//
//   node gen-concepts.mjs                      # every concept job (resumable: finished ids are skipped)
//   node gen-concepts.mjs --only=foe-moth-a    # some ids
//   node gen-concepts.mjs --dry                # list the plan, call nothing
//   node gen-concepts.mjs --model=fast         # force gemini-3.1-flash-image
//   node gen-concepts.mjs --force              # regenerate even if the raw exists
//
// The key: VERTEX_API_KEY, last occurrence in /Users/lap14657/merge-ball-td-siege/.env.local. It is
// read into memory and handed to curl on its stdin for each call. It is never written to disk,
// printed, logged or passed on a command line.
// The ledger: every image is logged with appendLedger / costOf (tools/gemini-budget.mjs) into
// tools/.cache/gemini-usage.json, as the pipeline does. No budget check: the limits are off.
// Models: gemini-3-pro-image first (probed by the first job that asks for it); a 404 switches
// every later job to gemini-3.1-flash-image and the manifest records it.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { costOf, appendLedger } from '/Users/lap14657/merge-ball-td-siege/tools/gemini-budget.mjs';
import { classify429 } from '/Users/lap14657/merge-ball-td-siege/tools/gemini-errors.mjs';
import { postJson } from '../../../../tools/curl-post.mjs'; // this worktree's copy: the key goes to curl on stdin

const ROOT = '/Users/lap14657/merge-ball-td-siege'; // the main checkout: .env.local (read) and the ledger (append) only
const HERE = dirname(fileURLToPath(import.meta.url));
const OVERHAUL = join(HERE, '..');
const WORKTREE = join(OVERHAUL, '..', '..', '..');
const OUT = join(OVERHAUL, 'concepts');
const REFS = join(OUT, 'refs');
const GEN = join(WORKTREE, 'public', 'assets', 'gen'); // read-only references (existing sprites)
const INPUTS = join(OVERHAUL, 'inputs');
const LEDGER = join(ROOT, 'tools', '.cache', 'gemini-usage.json');
const POST = join(WORKTREE, 'tools', 'post.py'); // run, never edited
const PY = '/usr/bin/python3'; // the interpreter with Pillow + NumPy
const MODELS = { best: 'gemini-3-pro-image', fast: 'gemini-3.1-flash-image' };
const urlFor = (model) => `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;
const manifestFile = join(OUT, 'manifest.json');
const logFile = join(OUT, 'log.jsonl');

const args = process.argv.slice(2);
const arg = (k, d = '') => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const dry = args.includes('--dry');
const force = args.includes('--force');
const only = arg('only').split(',').filter(Boolean);
const forced = arg('model'); // best | fast | ''
const CONCURRENCY = Number(arg('concurrency', '2')) || 2;
mkdirSync(OUT, { recursive: true });
mkdirSync(REFS, { recursive: true });
const log = (o) => appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');

/** Last VERTEX_API_KEY= line of .env.local; kept in memory only. */
function apiKey() {
  const f = join(ROOT, '.env.local');
  if (!existsSync(f)) throw new Error('no .env.local in the main checkout');
  const all = [...readFileSync(f, 'utf8').matchAll(/^VERTEX_API_KEY=(.+)$/gm)];
  if (!all.length) throw new Error('no VERTEX_API_KEY in .env.local');
  return all[all.length - 1][1].trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Stop extends Error {}
class Unavailable extends Error {}
// 429 backoff in seconds, then the item is skipped and noted; --backoff=30,90,180,300 for a patient run
const BACKOFF = (arg('backoff', '20,60,120').split(',').map(Number).filter((n) => n > 0)).map((s) => s * 1000);

/** One image. Returns a Buffer, or null when a 429 outlasted the backoff (the item is skipped). */
async function callGemini(job, key, model, notes) {
  const parts = [];
  for (const ref of job.refs) {
    if (!existsSync(ref)) throw new Error(`missing reference ${ref}`);
    parts.push({ inlineData: { mimeType: /\.jpe?g$/i.test(ref) ? 'image/jpeg' : 'image/png', data: readFileSync(ref).toString('base64') } });
  }
  parts.push({ text: job.prompt });
  let withConfig = true;
  let modalities = ['IMAGE'];
  let limited = 0;
  let fives = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    const generationConfig = { responseModalities: modalities, ...(withConfig ? { imageConfig: { aspectRatio: job.aspect } } : {}) };
    const { status, json } = await postJson(urlFor(model), key, { contents: [{ role: 'user', parts }], generationConfig });
    const msg = json.error?.message ?? '';
    if (status === 429) {
      const q = classify429(json);
      if (q.kind === 'noaccess') throw new Stop(`${model}: 429, this key has no image quota (${msg.slice(0, 120)})`);
      if (q.kind === 'daily') throw new Stop(`${model}: 429, the daily quota is used up (${msg.slice(0, 120)})`);
      if (limited >= BACKOFF.length) {
        notes.push(`${job.id}: skipped after 429 × ${limited} (${msg.slice(0, 100)})`);
        log({ id: job.id, skipped429: true, msg: msg.slice(0, 200) });
        return null;
      }
      const wait = BACKOFF[limited++];
      console.log(`  ${job.id}: 429, waiting ${wait / 1000} s`);
      log({ id: job.id, rateLimited: true, waitS: wait / 1000 });
      await sleep(wait);
      continue;
    }
    if (status >= 500 && fives < 3) {
      fives += 1;
      await sleep(5000 * fives);
      continue;
    }
    if (status === 400 && withConfig && /imageConfig|aspect/i.test(msg)) {
      withConfig = false;
      continue;
    }
    if (status === 400 && modalities.length === 1 && /modalit/i.test(msg)) {
      modalities = ['TEXT', 'IMAGE'];
      continue;
    }
    if (status === 404) throw new Unavailable(`${model}: HTTP 404 (${msg.slice(0, 120)})`);
    if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|API keys are not supported/i.test(msg)) throw new Stop(`${model}: HTTP ${status} ${msg.slice(0, 160)}`);
    if (!(status >= 200 && status < 300)) throw new Error(`HTTP ${status} ${msg.slice(0, 200)}`);
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error(`no image (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? 'unknown'})`);
    appendLedger(LEDGER, { t: Date.now(), model, usd: costOf(model), key: `concept.${job.id}`, backend: 'vertex' });
    return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new Error('gave up after retries');
}

/** Key a foe/sprite concept with the pipeline's post.py (read-only use), into concepts/. */
function keyOut(job) {
  const out = join(OUT, `${job.id}.keyed.png`);
  const a = [POST, join(OUT, `${job.id}.png`), out, '--bg', job.bg, '--size', String(job.post?.size ?? 512), '--fit', job.post?.fit ?? 'trim'];
  const s = execFileSync(PY, a, { encoding: 'utf8' });
  return { file: out, qa: JSON.parse(s.trim().split('\n').pop()) };
}

// --- prompts ---------------------------------------------------------------------------
const bgLine = (bg) => (bg === 'none' ? '' : `Background: the entire background is a perfectly flat, uniform solid ${bg === 'magenta' ? 'magenta #FF00FF' : 'pure green #00FF00'}, no gradient, texture, vignette or shadow. One subject only, centred, whole body visible with margin.`);
const STICKER =
  'Polished mobile-game character art, sticker style: simple big clean rounded shapes with very few small details, a thick even dark plum outline (#2B1D2E) ' +
  'around every form, a thin cream-white sticker rim (#FFFAF2) outside the outline, flat colour fills with one crisp cel-shade tone and one small highlight, ' +
  'light from the upper left, big expressive eyes. Original design. No text, no logo, no watermark, no frame, no ground, no cast shadow.';
const FOE =
  'Polished mobile-game enemy creature art in the same sticker style as the heroes but as a foe: simple big clean rounded shapes with few small details, ' +
  'a thick even dark plum outline (#2B1D2E) around every form and NO cream rim, flat colour fills with one crisp cel-shade tone and one small highlight, ' +
  'light from the upper left, slightly muted colours with one bright accent on the eyes or a weak point, a small mischievous face. ' +
  'Original design that does not copy any existing game or franchise character. No text, no logo, no watermark, no frame, no ground, no cast shadow.';
const SIL = 'Image 1 is the exact silhouette this creature must fill: keep its proportions, pose and outline exactly, facing left, and design the creature’s surface inside it; do not add limbs, wings, props or accessories that would change the silhouette. ';
// The facing rule (src/render/foes.js flips a foe horizontally by the sign of its dirX): walkers and swimmers are a strict
// side profile facing left; flyers with a symmetric wingspan are a top-down spread. Both flip safely; a 3/4 view does not.
const VIEW = {
  profile: 'VIEW RULE: a strict side view (profile) facing left, the camera level with the creature, no three-quarter turn, no perspective, no foreshortening. ',
  topdown: 'VIEW RULE: seen from directly above with both wings fully and symmetrically spread like a pinned specimen, the body vertical in the middle, the head at the top and the tail at the bottom; no three-quarter turn, no perspective. ',
};
const RENDER = 'Image 2 shows the required rendering (outline weight, cel shading, eye style): match it. ';
const colourRule = (pal, accent) => `HARD COLOUR RULE: use only these colours: ${pal.join(', ')}, with ${accent} as the single bright accent, plus the outline #2B1D2E and black/white for the eyes. `;

const sil = (n) => join(REFS, `sil-${n}.png`);
const renderRef = join(GEN, 'enemy.ninja.png'); // a clean existing foe render: outline weight and shading only
// Two-value rule (from the figure-ground check on the first candidates): a mid-dark main mass that steps from the
// light lane, plus a light zone of at least a quarter of the body (belly, face, wing field) that steps from the hedge
// and the keep floor. The a/b candidates of moth, fox and macaque were made before this rule; c/d test it.
const TWO_VALUE = 'VALUE RULE: the main body mass is mid-dark and at least a quarter of the creature is a clearly lighter cream zone (belly, chest, face or wing field), so it reads on both a light road and a dark hedge. ';
const FOES = {
  moth: { bg: 'magenta', desc: 'a luna moth foe (Moonmoth): broad wings whose fields are dusty dark teal with a pale mint edge band and cream eye-spots, a plump cream furry body, feathery antennae, two long tail streamers', pal: ['#5F8F86', '#3F6B63', '#A9D9C8', '#F3EADC'], accent: 'rose pink #E58AA6 on the eye-spot centres' },
  fox: { bg: 'green', desc: 'a shadow fox foe (Nightfox): a sleek low running fox with upright ears, a big brush tail with a cream tip, a large cream chest and belly, a small red scarf', pal: ['#3C3D5C', '#5A5C82', '#F3EADC', '#8A8A9E'], accent: 'red #C04848 on the scarf and eyes' },
  pangolin: { bg: 'magenta', desc: 'a pangolin guard foe: a wedge-shaped armoured body of overlapping lacquered scales, a small low head, short legs, a thick tail hooking up over its rump, a pale cream belly and face', pal: ['#7A5A3A', '#A67C52', '#E6D3B3', '#4E3A26'], accent: 'jade green #5F9A7A on the scale edges' },
  macaque: { bg: 'green', desc: 'a snow macaque monk foe floating in a lotus pose, arms raised holding two brass ring cymbals clashed above its head, a round body of slate-grey fur with a cream belly and chin, a round head with small ears', pal: ['#8C8680', '#5E5A56', '#F3EADC', '#D99A16'], accent: 'red #C04848 on the face' },
  hivequeen: { bg: 'green', desc: 'a hive queen bee boss: a low crowned head, a round thorax, a big banded abdomen hanging behind, two long narrow wings swept up and back, a stinger', pal: ['#D99A16', '#2B1D2E', '#F3EADC', '#A66F10'], accent: 'bright gold #FFD84A on the crown' },
};
const foeJob = (name, letter, view = null) => {
  const f = FOES[name];
  return {
    id: `foe-${name}-${letter}`,
    group: 'foes',
    model: 'best',
    aspect: '1:1',
    bg: f.bg,
    refs: [sil(name), renderRef],
    post: { size: 512, fit: 'trim' },
    prompt: `${SIL}${view ? VIEW[view] : ''}${RENDER}The creature: ${f.desc}, one of the animal army that besieges the player’s keep. ${view ? TWO_VALUE : ''}${colourRule(f.pal, f.accent)}${FOE} ${bgLine(f.bg)}`,
  };
};

const JOBS = [
  // style frames: the proposed look on a phone (layout and mood, not production art)
  {
    id: 'style-forest',
    group: 'style',
    model: 'best',
    aspect: '9:16',
    bg: 'none',
    refs: [join(INPUTS, '01-gameplay-wave6.jpg'), join(REFS, 'wireframe-phone.png')],
    prompt:
      'Image 1 is the current screen of the phone game 2048 Siege; image 2 is the wireframe of its visual redesign. Paint the redesigned screen as a finished game screenshot with the same phone proportions and the same structure: a 4x4 grid of numbered creature tiles at the bottom, four lanes above it, a HUD at the top. ' +
      'Art direction: a cute sticker-style tower-defense game, flat cel shading, thick dark plum outlines, no glow effects. The 4x4 board is a grey stone keep with round corner towers; where the lanes meet it runs a crenellated parapet with four iron braziers, one lit. The four lanes are cobbled sand roads with dark green hedges between them and a thin tick line per cell. At the top of the lanes stand four stone gate arches, two of them open with a purple swirl inside. Above the gates a stone lintel bar shows a wave number, a foes-left meter and a small 4x4 grid icon, and above the lintel a single cream news ribbon. Stone towers frame the lanes on both sides; four small cream portrait cards hang on the right tower. ' +
      'Foes walking down the lanes (muted colours, dark outlines, no cream rim, each a different animal): a pale luna moth, a brown dormouse, a green shield beetle with its wing cases raised. On the board, a baby fire dragon tile breathes a short flame tongue with embers up its lane, and a small crystal harpoon on a thin tether flies up another lane from an orca tile. Tiles are cream plates with big dark numbers at the top and chibi creatures peeking over the bottom edge, with a cream sticker rim. Behind everything a painted night-blue forest valley. No text other than the numbers. Portrait 9:16.',
  },
  {
    id: 'style-fareast',
    group: 'style',
    model: 'best',
    aspect: '9:16',
    bg: 'none',
    refs: [join(INPUTS, '01-gameplay-wave6.jpg'), join(REFS, 'wireframe-phone.png')],
    prompt:
      'Image 1 is the current screen of the phone game 2048 Siege; image 2 is the wireframe of its visual redesign. Paint the redesigned screen as a finished game screenshot with the same phone proportions and structure (4x4 numbered creature tiles at the bottom inside a stone keep, four lanes above, a HUD at the top), in the Fareast Kingdom chapter: cobbled roads with red lacquered bridge planks, paper lanterns hanging on the dark hedges between the lanes, stone gate arches at the top with red banners on one of them, a stone lintel bar at the top showing a boss health bar with a small crab portrait, a single cream news ribbon above the gates, stone towers on both sides with four portrait cards hanging on the right tower. ' +
      'Foes (muted colours, dark plum outlines, no cream rim, each a different animal): a giant hermit crab boss carrying a pagoda-shaped shell with two raised claws coming out of a gate, a sleek navy shadow fox running, a brown pangolin guard with lacquered scales, a small paper kite carp fluttering. A cute bird pet stands on the field beside a lane and sends a pale mint feather-gust ribbon with tumbling feathers up the lane, pushing the fox back with a small dust streak. Cute sticker-style art, flat cel shading, thick outlines, no glow. No text other than the numbers. Portrait 9:16.',
  },
  {
    id: 'style-peaks',
    group: 'style',
    model: 'best',
    aspect: '9:16',
    bg: 'none',
    refs: [join(INPUTS, '01-gameplay-wave6.jpg'), join(REFS, 'wireframe-phone.png')],
    prompt:
      'Image 1 is the current screen of the phone game 2048 Siege; image 2 is the wireframe of its visual redesign. Paint the redesigned screen as a finished game screenshot with the same phone proportions and structure (4x4 numbered creature tiles at the bottom inside a stone keep, four lanes above, a HUD at the top), in the Dragon Peaks chapter: basalt-grey cobbled roads with thin ember cracks, dark hedges of scorched thorns between the lanes, stone gate arches at the top, a stone lintel bar with a wave number and a foes meter, and a cream news ribbon above the gates reading as a short banner. ' +
      'Foes (muted colours, dark plum outlines, no cream rim, each a different animal): a slate mountain ibex charging head-down with big curved horns, a charcoal cinder bat with ember eyes, a huge magma snail with a rock shell and a lava foot at a gate. A legendary unicorn pet with a golden halo of small lightning bolts glides above the field and a chain of cream lightning links jumps between three foes. On the board, tiles are cream plates with big dark numbers and chibi creatures peeking over the bottom edge; one tile wears a gold frame. Cute sticker-style art, flat cel shading, thick outlines, no glow. No text other than the numbers. Portrait 9:16.',
  },
  // hero foes from the silhouette contract, two candidates each
  ...['moth', 'fox', 'pangolin', 'macaque', 'hivequeen'].flatMap((n) => [foeJob(n, 'a'), foeJob(n, 'b')]),
  // the facing rule + the two-value rule, tested on the foes that drifted (moth: 3/4 view) or failed figure-ground
  // (moth, macaque: pale on the light lane; fox: dark on the hedge and keep)
  foeJob('moth', 'c', 'topdown'),
  foeJob('moth', 'd', 'topdown'),
  foeJob('macaque', 'c', 'profile'),
  foeJob('fox', 'c', 'profile'),
  // projectile + trail sheets
  {
    id: 'vfx-fire-sheet',
    group: 'vfx',
    model: 'best',
    aspect: '16:9',
    bg: 'magenta',
    refs: [],
    prompt:
      'A game VFX sprite sheet for the FIRE element of a cute sticker-style mobile game, items arranged in neat rows with clear gaps on a flat magenta background, no labels, no text, no frame. Row 1: a flame tongue (a rolling fire-breath shape pointing right) in three flicker variants. Row 2: six small ember shapes and three dark smoke puffs. Row 3: a dark flat scorch-mark decal, a horizontal ribbon trail segment that could tile end to end, a ring of small sun rays (a halo add-on). Row 4: an eight-frame ember-splash impact animation left to right, small to big to fading. ' +
      'Every item is a solid opaque flat shape with a thick dark plum outline (#2B1D2E) and one cel-shade tone, in warm fire colours (#C8352B, #F2662D, #FF9E3D, #FFD24A, #FFE9BF). No glow, no transparency, no gradients, no soft edges, no sparkles outside the shapes.',
  },
  {
    id: 'vfx-ice-sheet',
    group: 'vfx',
    model: 'best',
    aspect: '16:9',
    bg: 'magenta',
    refs: [],
    prompt:
      'A game VFX sprite sheet for the ICE element of a cute sticker-style mobile game, items arranged in neat rows with clear gaps on a flat magenta background, no labels, no text, no frame. Row 1: a narrow crystal harpoon pointing right, two small crystal shard escorts, a short thin tether rope segment. Row 2: a sonar ping ring in four sizes from large to small (contracting). Row 3: an ice-block cage (a rounded cube of ice with cracks), a frost ring decal seen from above, a frost-crack add-on piece. Row 4: an eight-frame crystal-shatter impact animation left to right. ' +
      'Every item is a solid opaque flat shape with a thick dark plum outline (#2B1D2E) and one cel-shade tone, in cold colours (#2B5A86, #4FB3D9, #9BE7F5, #DDF7FC, #F7FDFF). No glow, no transparency, no gradients, no soft edges.',
  },
  // the ladder, as a strip, for two elements
  {
    id: 'ladder-fire',
    group: 'ladder',
    model: 'best',
    aspect: '16:9',
    bg: 'none',
    refs: [join(GEN, 'pet.fire.128.png'), join(GEN, 'fusion.fire+ice.png')],
    prompt:
      'A concept strip for a cute sticker-style mobile tower-defense game: five equal panels side by side, each panel the same vertical cobbled sand lane seen from above with dark hedges, small cute enemy animals walking down from the top, and the fire creature at the bottom (image 1 is the baby fire dragon; image 2 is its grown form). The panels show how its fire-breath attack grows: panel 1: the baby breathes three tiny embers; panel 2: a short flame tongue with four embers and a small scorch mark; panel 3: a long flame tongue three cells long with ember rain and dark smoke puffs; panel 4: the grown dragon stands beside the lane and breathes a blue flame tongue with frost crystal shards along its edge; panel 5: the grown dragon wears a golden sun halo and breathes two flame licks with small gold rays. ' +
      'Flat cel shading, thick dark plum outlines, cream sticker rims on the creatures, no glow effects, no text. Landscape 16:9.',
  },
  {
    id: 'ladder-ice',
    group: 'ladder',
    model: 'best',
    aspect: '16:9',
    bg: 'none',
    refs: [join(GEN, 'pet.ice.128.png'), join(GEN, 'fusion.ice+lightning.png')],
    prompt:
      'A concept strip for a cute sticker-style mobile tower-defense game: five equal panels side by side, each panel the same vertical cobbled sand lane seen from above with dark hedges, small cute enemy animals walking down from the top, and the ice creature at the bottom (image 1 is the baby orca; image 2 is its grown form). The panels show how its harpoon attack grows: panel 1: a dashed sonar ring contracts onto one enemy and a small crystal harpoon flies up on a thin tether line; panel 2: three sonar rings over three lanes and the harpoon leaves two faint ghost afterimages; panel 3: the harpoon flies with two shard escorts and the struck enemy is boxed inside a rounded ice block; panel 4: the grown orca swims beside the lane and throws a cyan harpoon with a small lightning spark on its tip; panel 5: the grown orca wears a golden clock-face halo and every enemy on the lane is boxed in ice. ' +
      'Flat cel shading, thick dark plum outlines, cream sticker rims on the creatures, no glow effects, no text. Landscape 16:9.',
  },
  // frame kit
  {
    id: 'frame-kit-sheet',
    group: 'frame',
    model: 'best',
    aspect: '16:9',
    bg: 'magenta',
    refs: [],
    prompt:
      'A game environment kit sheet for a cute sticker-style tower-defense game, items arranged with clear gaps on a flat magenta background, no labels, no text: a stone castle keep corner with a short round corner tower; a straight segment of crenellated stone parapet with one merlon carrying an iron brazier, unlit; the same brazier lit with a small steady flame; a stone gate arch with a dark closed opening; the same arch open with a purple swirl inside; a straight stone tower pillar segment; a strip of dark green hedge; a short cobbled sand road segment with a thin tick line across it. ' +
      'Clay-toned palette (#CFCABF stone, #A9A295 stone shade, #E9E4D8 stone light, #8A6A43 timber, #4A5A52 hedge, #E9DCC0 sand), a thick dark plum outline (#2B1D2E), flat cel shading with one shade tone, no glow, no gradients.',
  },
  {
    id: 'frame-road-tile',
    group: 'frame',
    model: 'best',
    aspect: '1:1',
    bg: 'none',
    refs: [],
    prompt:
      'A seamless tileable top-down texture of a cobbled sand road for a cute sticker-style game: rounded cobbles in warm sand tones (#E9DCC0, #D9C7A3, #B59F7C) with thin dark plum (#2B1D2E) outlines between the stones, flat cel shading, low contrast so characters stay readable on top of it, no text, no objects; the pattern must continue across all four edges so the image tiles without a seam. Square.',
  },
  // per-stage pet poses as edits of the existing sprites
  {
    id: 'pose-fire-windup',
    group: 'poses',
    model: 'best',
    aspect: '1:1',
    bg: 'green',
    refs: [join(GEN, 'pet.fire.128.png')],
    post: { size: 320, fit: 'trim' },
    prompt: `Same creature as the input image: same design, colours, markings, outline, cream sticker rim and framing. Change only the pose: it crouches low in a wind-up, chest puffed and cheeks full, eyes narrowed with effort, about to breathe fire; no fire yet. Facing left. ${bgLine('green')}`,
  },
  {
    id: 'pose-ice-tailslap',
    group: 'poses',
    model: 'best',
    aspect: '1:1',
    bg: 'green',
    refs: [join(GEN, 'pet.ice.128.png')],
    post: { size: 320, fit: 'trim' },
    prompt: `Same creature as the input image: same design, colours, markings, outline, cream sticker rim and framing. Change only the pose: its tail is raised high mid tail-slap, body arched, mouth open in a sonar call. Facing left. ${bgLine('green')}`,
  },
  // a fusion with a body-plan silhouette (W5)
  {
    id: 'fusion-smogpup-coil',
    group: 'fusion',
    model: 'best',
    aspect: '1:1',
    bg: 'magenta',
    refs: [sil('smogpup'), join(GEN, 'pet.fire.128.png'), join(GEN, 'pet.poison.128.png')],
    post: { size: 320, fit: 'trim' },
    prompt:
      'Image 1 is the exact silhouette to fill: keep its proportions and pose exactly, facing left. Image 2 is a baby fire creature and image 3 a baby poison creature from the same game. Create ONE grown-up creature named Smogpup inside the silhouette: a long serpent-coiled body taken from the poison creature, the dragon head with small horns and a row of back spikes from the fire creature, its eyes and face from image 2, cool and powerful. ' +
      `HARD COLOUR RULE: body colours only from #C8352B, #F2662D, #FF9E3D, #FFD24A, #FFE9BF; at most two accents from #A35CF0 and #8FE53A; outline #2B1D2E, cream rim #FFFAF2. ${STICKER} ${bgLine('magenta')}`,
  },
];

function loadManifest() {
  try {
    return JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch {
    return { images: {}, notes: [] };
  }
}

async function main() {
  const jobs = only.length ? JOBS.filter((j) => only.includes(j.id)) : JOBS;
  const manifest = loadManifest();
  manifest.images ??= {};
  manifest.notes ??= [];
  const todo = jobs.filter((j) => force || !existsSync(join(OUT, `${j.id}.png`)));
  const price = (m) => costOf(m);
  console.log(`plan: ${jobs.length} concepts, ${todo.length} to make; list price if all on ${MODELS.best}: $${(todo.length * price(MODELS.best)).toFixed(2)} (on ${MODELS.fast}: $${(todo.length * price(MODELS.fast)).toFixed(2)})`);
  if (dry) {
    for (const j of todo) console.log(`  ${j.id} [${j.group}] ${j.aspect} refs=${j.refs.map((r) => r.split('/').pop()).join(',') || '-'}`);
    return;
  }
  const key = apiKey();
  let best = forced === 'fast' ? MODELS.fast : MODELS.best; // probed by the first 'best' job
  const notes = manifest.notes;
  let made = 0;
  let failed = 0;

  async function run(job) {
    const t = Date.now();
    for (let attempt = 1; attempt <= 2; attempt++) {
      const model = job.model === 'best' ? best : MODELS.fast;
      try {
        const buf = await callGemini(job, key, model, notes);
        if (!buf) {
          failed += 1;
          return;
        }
        writeFileSync(join(OUT, `${job.id}.png`), buf);
        const entry = { group: job.group, model, aspect: job.aspect, bg: job.bg, refs: job.refs.map((r) => r.replace(WORKTREE + '/', '')), prompt: job.prompt, at: new Date().toISOString(), secs: Math.round((Date.now() - t) / 1000), usd: costOf(model) };
        if (job.bg !== 'none') {
          try {
            const k = keyOut(job);
            entry.keyed = k.file.replace(OVERHAUL + '/', '');
            entry.qa = k.qa;
          } catch (e) {
            entry.postError = e.message.split('\n')[0];
          }
        }
        manifest.images[job.id] = entry;
        writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
        made += 1;
        console.log(`✓ ${job.id} (${model}, ${entry.secs} s)`);
        log({ id: job.id, model, secs: entry.secs, qa: entry.qa ?? null });
        return;
      } catch (e) {
        if (e instanceof Unavailable) {
          if (model === MODELS.best && best === MODELS.best) {
            best = MODELS.fast;
            const n = `${MODELS.best} not available on Vertex express (${e.message}); using ${MODELS.fast} from ${job.id} on`;
            notes.push(n);
            console.log(`  ${n}`);
            attempt -= 1; // retry the same job on the fast model without losing an attempt
            continue;
          }
          throw e;
        }
        if (e instanceof Stop) throw e;
        log({ id: job.id, attempt, error: e.message });
        console.log(`  ${job.id}: ${e.message}${attempt < 2 ? ', retrying' : ''}`);
      }
    }
    failed += 1;
    notes.push(`${job.id}: failed twice`);
  }

  let stopped = null;
  const queue = [...todo];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length && !stopped) {
      const j = queue.shift();
      try {
        await run(j);
      } catch (e) {
        stopped = e.message;
      }
    }
  });
  await Promise.all(workers);
  manifest.notes = notes;
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  const spent = Object.values(manifest.images).reduce((s, e) => s + (e.usd ?? 0), 0);
  console.log(`\n${made} made, ${failed} failed or skipped; concepts in ${OUT}; list-price total of all concepts so far $${spent.toFixed(2)}`);
  if (stopped) {
    console.log(`\nSTOPPED: ${stopped}`);
    process.exitCode = 3;
  } else if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 2;
});
