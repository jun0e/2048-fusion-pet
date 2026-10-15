// Job specs for the asset pipeline (tools/pipeline.mjs): one job per catalog asset
// that is generated with Gemini. A job = prompt + references (other assets, or the
// approved images in reports/kv/approved/) + model + aspect + background + post-process.
// The design decisions live here: the element animals, simple smooth babies that grow
// one feature per stage, the palette hard limit, fusions = parent A's body + one part of
// parent B's animal, soft-vinyl portraits, apex halo kits, original foes.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ELEMENTS, FUSIONS, APEX } from '../src/sim/classes.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { ELEMENT_PALETTES, UNIVERSAL } from '../src/art/palettes.js';
import { petName } from '../src/art/tokens.js';
import { ASSETS as ENEMY_ASSETS } from './assets.config.mjs';

export const MODEL_FAST = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-nano-banana-2.1';
// portraits, boss banners and the background: the same model by default, so one pass of the
// whole set stays inside the $10/month AI Pro credit (~$3.93 on Nano Banana 2.1, ~$7.84 on
// Nano Banana 2 via Vertex); GEMINI_BEST_MODEL=gemini-3-pro-image for Pro portraits.
// tools/pipeline.mjs passes the backend's models to plan(); these are the fallbacks.
export const MODEL_BEST = process.env.GEMINI_BEST_MODEL ?? MODEL_FAST;

const hexes = (el) => ELEMENT_PALETTES[el].colors.map((c) => c.hex);
const UNI = UNIVERSAL.map((c) => c.hex);
const list = (a) => a.join(', ');

const STICKER =
  'Polished mobile-game character art, sticker style: simple big clean rounded shapes with very few small details, a thick even dark plum outline (#2B1D2E) ' +
  'around every form, a thin cream-white sticker rim (#FFFAF2) outside the outline, flat colour fills with one crisp cel-shade tone and one small highlight, ' +
  'light from the upper left, big expressive eyes. Original design. No text, no logo, no watermark, no frame, no ground, no cast shadow.';
const VINYL =
  'Stylized 3D render of a collectible soft-vinyl designer toy: smooth matte materials, large soft colour gradients, gentle ambient occlusion, warm key light from the upper left, ' +
  'a strong rim light in the creature’s own element colour from behind right, no fur strands or texture noise. Original design. No text, no logo, no watermark.';
const FOE =
  'Polished mobile-game enemy art, chibi proportions (big head, small body), simple clean shapes with few small details, a thick dark plum outline (#2B1D2E) and NO cream rim, ' +
  'flat colours with one cel-shade tone, slightly muted colours so the heroes read as foes. Original design that does not copy any existing game. No text, no logo, no watermark, no ground, no cast shadow.';
const bgLine = (bg) =>
  `Background: the entire background is a perfectly flat, uniform solid ${bg === 'magenta' ? 'magenta #FF00FF' : 'pure green #00FF00'}, no gradient, texture, vignette or shadow. One subject only, centred, whole body visible with margin.`;

// green screen unless the palette itself has greens (then magenta)
export const BG_FOR = { fire: 'green', wind: 'magenta', nature: 'magenta', ice: 'green', poison: 'magenta', lightning: 'green', metal: 'green', earth: 'green' };

export const ANIMALS = {
  fire: { baby: 'baby dragon: a smooth round little lizard on four stubby legs, tiny wing nubs, two tiny soft horn nubs, a short plain tail (no flame on the tail)', order: 1 },
  wind: { baby: 'baby bird: a round fluffball with tiny wings and one crest feather', order: 2 },
  nature: { baby: 'baby turtle: a smooth dome shell with a single sprout leaf on top', order: 3 },
  ice: { baby: 'baby orca: a chubby round black-and-white orca calf with a small dorsal fin, floating', order: 4 },
  poison: { baby: 'baby snake: a short round coil with a big head and a plain belly stripe', order: 5 },
  lightning: { baby: 'baby unicorn foal: a tiny nub horn and a small tuft of mane', order: 6 },
  metal: { baby: 'baby lion cub: a small simple mane tuft shaped like a round gold coin with a diamond-shaped hole', order: 7 },
  earth: { baby: 'baby ox calf: a smooth round body with two tiny horn nubs', order: 8 },
};

// one new feature per merge (16 → 32 → 64 → 128): babies stay smooth; spikes come with evolution
export const STAGES = {
  fire: ['the two horn nubs grow into small soft rounded horns', 'a row of three soft rounded bumps appears along its back', 'the back bumps become small blunt spikes and the wing nubs grow into little wings'],
  wind: ['a second crest feather grows', 'its wings grow longer with neat feather tips', 'a three-plume crest and a small fan of tail feathers'],
  nature: ['the sprout grows a second leaf', 'a small round bush of leaves grows on the shell', 'a flower bud opens on top of the bush'],
  ice: ['a small frost crystal forms on the tip of its fin', 'two frost crystals on the fin', 'a little crown of frost crystals along the whole fin'],
  poison: ['a few round acid-green spots appear on its back', 'a tiny hood frill begins to grow behind its head', 'the hood frill opens and the coil grows longer'],
  lightning: ['the horn grows longer and pointed', 'the mane grows into a zigzag lightning-shaped mane', 'a bolt-shaped tail grows and the horn tip glows softly'],
  metal: ['the coin mane grows fuller around the face', 'small coin-shaped plates appear around the mane', 'a full ring of coin-shaped gold plates with diamond holes frames the face'],
  earth: ['the horn nubs grow into small horns', 'a rocky patch grows on its back', 'the horns curve upward and rock plates cover its hump'],
};

// grown forms (fusions): parent A's adult body + one signature part from parent B's animal
const ADULT = {
  fire: 'a young dragon: strong lizard body on four legs, small wings, a row of sharp spikes down its back, curved horns, fierce and cool',
  wind: 'a sleek bird of prey: wide feathered wings, a three-plume crest, a fan tail, proud pose',
  nature: 'a sturdy turtle with a high domed shell grown with leaves and a small flowering bush, calm and strong',
  ice: 'an orca: powerful streamlined body, tall dorsal fin rimmed with frost crystals, floating, confident',
  poison: 'a long coiled snake with an open hood frill and fangs, sly and dangerous',
  lightning: 'a unicorn: tall slender horse body, long spiral horn, zigzag lightning mane and a bolt-shaped tail, noble',
  metal: 'a lion: muscular body, a big mane made of coin-shaped gold plates with diamond holes, tufted tail, regal',
  earth: 'an ox: massive shoulders, big curved horns, rocky plates on its hump, unstoppable',
};
const PART = {
  fire: 'a row of dragon spikes and small dragon wings',
  wind: 'a pair of feathered bird wings',
  nature: 'a leafy shell on its back',
  ice: 'an orca dorsal fin rimmed with frost crystals',
  poison: 'a long serpent tail with acid-green diamond markings',
  lightning: 'a single spiral unicorn horn',
  metal: 'a mane of coin-shaped gold plates with diamond holes',
  earth: 'big curved ox horns and rock plates',
};
const APEX_MOTIF = {
  fire: 'small sun rays and flames',
  ice: 'ice crystals, with clock-face ticks around the ring',
  lightning: 'small thunder bolts',
  poison: 'floating miasma bubbles',
  earth: 'orbiting meteor stones',
  wind: 'spiral wind wisps',
  metal: 'gold coins with diamond-shaped holes',
  nature: 'small flowers and leaves',
};

const BADGE_SYMBOL = {
  fire: 'a flame, red-orange outside and yellow inside',
  wind: 'three curling wind swirls',
  nature: 'a single leaf with a curled stem',
  ice: 'a six-pointed snowflake',
  poison: 'a venom droplet with a small bubble',
  lightning: 'a zigzag lightning bolt in neon blue and white',
  metal: 'a round bright gold coin with a diamond-shaped hole in the middle',
  earth: 'a chunky faceted rock',
};

const APPROVED = 'reports/kv/approved';

/**
 * Build the job for one catalog row, or null if it is not a generated asset.
 * `models.fast` makes sprites; `models.best` makes portraits, boss banners and the background.
 */
export function jobFor(row, root, models = { fast: MODEL_FAST, best: MODEL_BEST }) {
  const id = row.id;
  const approved = (f) => (existsSync(join(root, APPROVED, f)) ? `${APPROVED}/${f}` : null);
  let m;
  const base = { id, model: models.fast, aspect: '1:1', refs: [], post: { fit: 'trim', size: 320 }, priority: row.priority };

  if ((m = id.match(/^egg\.(\d+)$/))) {
    const v = +m[1];
    const palette = ['#FFF0DA', '#E8CDA6', '#E6B98A', '#FFFFFF', ...UNI];
    const lineup = approved('babies-line.png');
    if (v === 2)
      return { ...base, bg: 'green', refs: lineup ? [lineup] : [], post: { ...base.post, palette, snap: true },
        prompt: `${lineup ? 'Image 1 shows the approved style of the game’s creatures; match its rendering. ' : ''}A single plain creature egg with no face, no eyes and no mouth: cream #FFF0DA with a few soft tan speckles (#E6B98A), smooth oval. ${STICKER} ${bgLine('green')}` };
    const prev = v === 4 ? 'egg.2' : 'egg.4';
    return { ...base, bg: 'green', refs: [prev], deps: [prev], post: { ...base.post, palette, snap: true },
      prompt: `Same egg as the input image: same shape, colours, outline and framing. Change only: ${v === 4 ? 'add one small zigzag crack near the top (still no face)' : 'the crack opens across the middle and two big cute eyes peek out of the dark gap'}. ${bgLine('green')}` };
  }

  if ((m = id.match(/^pet\.([a-z]+)\.(\d+)$/))) {
    const [, el, vs] = m;
    const v = +vs;
    const a = ANIMALS[el];
    const palette = [...hexes(el), ...UNI];
    const bg = BG_FOR[el];
    const colours = `HARD COLOUR RULE: use only these colours: ${list(hexes(el))}, plus the outline ${UNI[0]}, the cream rim ${UNI[1]} and black/white for the eyes.`;
    if (v === 16) {
      const special = el === 'metal' ? approved('metal-lion-cub.png') : null;
      const lineup = approved('babies-line.png');
      const refs = special ? [special] : lineup ? [lineup] : [];
      const lead = special
        ? 'Image 1 is the approved design of this baby lion cub: keep it exactly (shape, face, pose), but make the mane tuft a round gold coin with a diamond-shaped hole. '
        : lineup
          ? `Image 1 is the approved line-up of eight baby creatures. Draw ONLY the ${a.baby.split(':')[0]} (number ${a.order} from the left) exactly as designed there, alone. `
          : '';
      return { ...base, bg, refs, post: { ...base.post, palette, snap: true },
        prompt: `${lead}A ${a.baby}. Chubby baby proportions: huge head, tiny body, cute and funny. ${colours} ${STICKER} ${bgLine(bg)}` };
    }
    const step = { 32: 0, 64: 1, 128: 2 }[v];
    const prev = `pet.${el}.${[16, 32, 64][step]}`;
    // later stages also see the original baby, so the face and colours can't drift down the chain
    const anchor = `pet.${el}.16`;
    const refs = step === 0 ? [prev] : [prev, anchor];
    return { ...base, bg, refs, deps: refs, post: { ...base.post, palette, snap: true },
      prompt:
        step === 0
          ? `Same creature as the input image: same pose, face, outline, colours and framing, just a little more grown. Change only: ${STAGES[el][step]}. ${colours} ${bgLine(bg)}`
          : `Image 1 is this creature's current stage and image 2 is its original baby design. Keep the face, eyes, mouth, markings and colours of image 2 exactly, keep the pose, outline and framing of image 1, and make it just a little more grown. Change only: ${STAGES[el][step]}. ${colours} ${bgLine(bg)}` };
  }

  if ((m = id.match(/^pet\.([a-z]+)\.(scared|blink)$/))) {
    const [, el, mood] = m;
    const prev = `pet.${el}.16`;
    return { ...base, bg: BG_FOR[el], refs: [prev], deps: [prev], post: { ...base.post, palette: [...hexes(el), ...UNI], snap: true },
      prompt: `Same creature as the input image, identical in every way except the expression: ${mood === 'scared' ? 'worried, scared eyes with a small sweat drop' : 'both eyes closed in a calm blink'}. ${bgLine(BG_FOR[el])}` };
  }

  if ((m = id.match(/^fusion\.([a-z]+)\+([a-z]+)$/))) {
    const [, a, b] = m;
    const golden = 'fusion.fire+ice';
    const refs = [`pet.${a}.128`, `pet.${b}.128`, ...(id === golden ? [] : [golden])];
    const palette = [...hexes(a), ...hexes(b), ...UNI];
    const bg = BG_FOR[a] === 'magenta' || BG_FOR[b] === 'magenta' ? 'magenta' : 'green';
    return { ...base, bg, refs, deps: refs, post: { ...base.post, palette, snap: true },
      prompt:
        `Image 1 is a baby ${ELEMENTS[a].name.toLowerCase()} creature and image 2 a baby ${ELEMENTS[b].name.toLowerCase()} creature from the same game. ` +
        `${id === golden ? '' : 'Image 3 shows the required rendering for grown creatures: match its outline weight, shading and proportions. '}` +
        `Create ONE new grown-up creature named ${petName(a, b)}: the body of ${ADULT[a]}, plus ${PART[b]} taken from the second creature. ` +
        `It keeps the eyes and the main colour of image 1 but looks cool, powerful and a bit majestic, about three heads tall, full body, three-quarter view facing left. ` +
        `HARD COLOUR RULE: body colours only from ${list(hexes(a))}; at most two accent colours from ${list(hexes(b))}; outline ${UNI[0]}, cream rim ${UNI[1]}. ${STICKER} ${bgLine(bg)}` };
  }

  if ((m = id.match(/^portrait\.([a-z]+)\+([a-z]+)(\.ascended)?$/))) {
    const [, a, b, asc] = m;
    const sprite = `fusion.${a}+${b}`;
    // no golden portrait as a reference: given one, the model drew the golden's dragon on every
    // card. Each portrait sees only its own fusion sprite, and the text names the creature.
    const refs = asc ? [`portrait.${a}+${b}`] : [sprite];
    const keyA = ELEMENT_PALETTES[a].key;
    const keyB = ELEMENT_PALETTES[b].key;
    return { ...base, model: models.best, bg: 'none', refs, deps: refs, post: { fit: 'cover', size: 512 },
      prompt: asc
        ? `Same portrait as the input image, same creature and framing, now ascended to legendary: lower camera, chin up, a glowing halo of backlight, gold trim, magical sparkles. Keep the face identical. Square.`
        : `${VINYL} A portrait of the creature in image 1 (${petName(a, b)}: ${ADULT[a]}, with ${PART[b]}), keeping its exact silhouette, colours, markings and face. Draw this creature only, not any other animal. ` +
          `Head-and-shoulders bust, three-quarter view facing left, eye-level camera, the face about 60% of the frame height. Rim light colour ${keyB}. ` +
          `Background: a simple radial gradient plate in ${keyA} with soft light rays behind the head, no scenery. Square 1:1.` };
  }

  if ((m = id.match(/^badge\.([a-z]+)$/))) {
    // the element icons in the style of the first Gemini icon set the user picked: a squircle
    // badge split into a dark and a light half, a bold symbol, plum outline, cream rim
    const el = m[1];
    const pal = hexes(el);
    const bg = BG_FOR[el];
    return { ...base, bg, post: { fit: 'trim', size: 192 },
      prompt:
        `A single polished mobile-game element badge icon for ${ELEMENTS[el].name}: a chunky rounded squircle badge whose face is split vertically down the middle into two flat halves, ` +
        `the left half a deep ${pal[1]} and the right half a light ${pal[3]}, with a bold, simple, highly readable symbol in the centre: ${BADGE_SYMBOL[el]}. ` +
        `A thick even dark plum outline (#2B1D2E) around the badge and the symbol, a thin cream-white outer rim (#FFFAF2), one soft glossy highlight at the top. ` +
        `Front view, the badge fills most of the frame. Original design. No text, no letters, no watermark. ${bgLine(bg)}` };
  }

  if ((m = id.match(/^halo\.([a-z]+)$/))) {
    const el = m[1];
    const refs = ['fusion.fire+ice'];
    return { ...base, bg: 'green', refs, deps: refs, post: { ...base.post, palette: ['#9C6410', '#D99A16', '#F7BE1E', '#FFD84A', '#FFEC94', ...hexes(el), ...UNI], snap: true },
      prompt: `Image 1 shows the game’s art style; match its outline and shading. A flat decorative halo ring for a legendary creature (${APEX[el].name}): a gold ring carrying six small ${APEX_MOTIF[el]} evenly spaced around it, seen from the front, empty in the middle. No creature. ${STICKER} ${bgLine('green')}` };
  }

  if ((m = id.match(/^enemy\.([a-zA-Z]+)(\.portrait)?$/))) {
    const [, type, portrait] = m;
    const cfg = ENEMY_ASSETS.find((x) => x.key === `enemy.${type}`);
    const subject = cfg ? cfg.prompt.replace(/^A single /, '').split('. Front')[0] : ENEMY_TYPES[type].name;
    const golden = 'enemy.pixie';
    if (portrait)
      return { ...base, model: models.best, bg: 'none', refs: [`enemy.${type}`], deps: [`enemy.${type}`], post: { fit: 'cover', size: 512 },
        prompt: `${VINYL} A dramatic head-and-shoulders portrait of the boss in image 1 (keep its design), for a "boss approaches" banner: low camera, menacing but cute. Dark stormy plate behind. Square.` };
    const refs = type === 'pixie' ? [] : [golden];
    const bg = cfg?.bg ?? 'green';
    return { ...base, bg, refs, deps: refs, post: { ...base.post, size: ENEMY_TYPES[type].boss ? 384 : 256 },
      prompt: `${refs.length ? 'Image 1 shows the required style for every enemy; match its rendering and proportions exactly. ' : ''}A ${subject}, one of the invading heroes of a cute mobile defense game, front three-quarter view, walking pose. ${FOE} ${bgLine(bg)}` };
  }

  if (id === 'env.background')
    return { ...base, model: models.best, aspect: '9:16', bg: 'none', post: { fit: 'cover', size: 1600 },
      prompt:
        'Vertical mobile game background, 9:16: a calm night sky over a fantasy forest valley seen from above, deep blue (#2f4a8a at the top to #1a2552 at the bottom), soft stars, faint glowing paths. ' +
        'Low contrast and quiet so cute characters and a puzzle board stay readable on top; leave the middle and lower two thirds mostly empty and dark. Flat painterly style matching cute sticker art. No characters, no text, no UI.' };

  return null; // compose / code-drawn / hand-drawn assets are not generated here
}

/**
 * Jobs for the requested priorities, plus every asset they reference (transitively),
 * whatever its own priority: the Frostnova fusion needs both parents' 128 sprites.
 */
export function plan(rows, root, priorities, models) {
  const all = new Map();
  const skipped = [];
  for (const r of rows) {
    if (!r.method.startsWith('Gemini')) continue;
    const j = jobFor(r, root, models);
    if (j) all.set(j.id, { deps: [], ...j });
    else if (priorities.includes(r.priority)) skipped.push(r.id);
  }
  const want = new Set();
  const add = (id) => {
    if (want.has(id) || !all.has(id)) return;
    want.add(id);
    for (const d of all.get(id).deps) add(d);
  };
  for (const j of all.values()) if (priorities.includes(j.priority)) add(j.id);
  const jobs = [...all.values()].filter((j) => want.has(j.id));
  for (const j of jobs) j.deps = j.deps.filter((d) => want.has(d));
  return { jobs, skipped, all };
}

export { FUSIONS };
