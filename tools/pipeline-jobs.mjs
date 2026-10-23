// Job specs for the asset pipeline (tools/pipeline.mjs): one job per catalog asset
// that is generated with Gemini. A job = prompt + references (other assets, or the
// approved images in reports/kv/approved/) + model + aspect + background + post-process.
// The design decisions live here: the element animals, simple smooth babies that grow
// one feature per stage, the palette hard limit, fusions = one animal each (src/art/fusion-roster.js)
// drawn as a baby in the babies' own style, 2D namecard portraits (the fusion's own sticker on a flat
// plate), apex halo kits, original foes.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ELEMENTS, ELEMENT_KEYS, FUSIONS, APEX } from '../src/sim/classes.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { ELEMENT_PALETTES, UNIVERSAL } from '../src/art/palettes.js';
import { FOE_ROSTER, CHAPTER_GOLDEN, foeChapters } from '../src/art/foe-roster.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { VFX_PIECES } from '../src/art/attack-vfx.js';
import { FRAME_ASSETS, CHAPTER_GROUNDS } from '../src/art/frame-kit.js';

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
// Foes (the visual overhaul, proposal 7.3): each fills its own silhouette contract (image 1) in a
// view the renderer can flip, with a dark mass and a cream zone so it reads on a light road and a
// dark hedge. Three candidates each; tools/silhouette-check.py scores them and tools/pick.mjs keeps
// the best inside the gates (the contract, no twin among the foes it marches with, no hero look,
// readable on every ground of its chapters); a strict round (tools/pick.mjs strictText) follows
// only when none is inside them.
const FOE =
  'Polished mobile-game enemy creature art in the same sticker style as the heroes but as a foe: simple big clean rounded shapes with few small details, ' +
  'a thick even dark plum outline (#2B1D2E) around every form and NO cream rim, flat colour fills with one crisp cel-shade tone and one small highlight, ' +
  'light from the upper left, slightly muted colours with one bright accent on the eyes or a weak point, a small mischievous face. ' +
  'Original design that does not copy any existing game or franchise character. No text, no logo, no watermark, no frame, no ground, no cast shadow.';
const FOE_SIL =
  'Image 1 is the exact silhouette this creature must fill: keep its proportions, pose and outline exactly, and design the creature’s surface inside it; ' +
  'do not add limbs, wings, props or accessories that would change the silhouette. ';
const FOE_VIEW = {
  profile: 'VIEW RULE: a strict side view (profile) facing left, the camera level with the creature, no three-quarter turn, no perspective, no foreshortening. ',
  front: 'VIEW RULE: a straight front view, symmetrical, the camera level with the creature, no three-quarter turn, no perspective. ',
  spread: 'VIEW RULE: both wings fully and symmetrically spread like a pinned specimen, no three-quarter turn, no perspective. ',
};
const FOE_RENDER = 'Image 2 shows the required rendering (outline weight, cel shading, eye style): match it, but not its species or pose. ';
const FOE_VALUES =
  'VALUE RULE: the main body mass is dark and at least a third of the creature is a clearly lighter cream zone (belly, chest, face or wing field), so it reads on both a light road and a dark hedge. ';
// the forest golden's rendering reference: a frozen copy of the first foe set's ninja raw
const FOE_RENDER_REF = 'tools/refs/foes/render-ref.png';
const foeSil = (type) => `tools/refs/foes/sil-${FOE_ROSTER[type].animal}.png`;
/** A foe's chapters, its own first: every chapter it marches in (foe-roster.js foeChapters). */
const chaptersOf = (type) => [FOE_ROSTER[type].chapter, ...foeChapters(type).filter((c) => c !== FOE_ROSTER[type].chapter)];
/** The grounds of those chapters: its own chapter's by name, another chapter's only where it differs ('fareast.hedge'). */
function groundsOf(chapters) {
  const out = { ...CHAPTER_GROUNDS[chapters[0]] };
  for (const c of chapters.slice(1))
    for (const [name, hex] of Object.entries(CHAPTER_GROUNDS[c])) if (!Object.values(out).includes(hex)) out[`${c}.${name}`] = hex;
  return out;
}
const bgLine = (bg) =>
  `Background: the entire background is a perfectly flat, uniform solid ${bg === 'magenta' ? 'magenta #FF00FF' : 'pure green #00FF00'}, no gradient, texture, vignette or shadow. One subject only, centred, whole body visible with margin.`;

// Fusions (the fusion silhouette pass, reports/art/fusion-matrix/): each is one animal filling its
// own silhouette contract (image 1), the foes' method with the heroes' cues (the cream rim, a light
// palette). The parents enter in words and in the palette's accents, never as images: given the
// two parent sprites, the model drew every fusion as "dragon plus an orca part". Gated like the
// foes: no twin among the 28, no outline of a foe or a base pet, readable on the lanes and the
// hedges, where pets roam.
const FUSION_RENDER_REF = 'tools/refs/fusions/render-ref.png'; // a frozen copy of the first set's fire+ice raw
const fusionSil = (key) => `tools/refs/fusions/sil-${key}.png`;
const PET_VIEW = {
  ...FOE_VIEW,
  spread: 'VIEW RULE: seen from directly above, symmetrical, the wings or limbs spread out evenly on both sides, no three-quarter turn, no perspective. ',
};
const PET_RENDER =
  'Image 2 shows the required rendering (outline weight, cel shading, eye style, the cream sticker rim): match it, but not its species, colours or pose. ' +
  'An original creature that does not copy any existing game or franchise character. ';
// Baby fusions (2026-10-23, the user: "remove all 3d art for fusion pet, leave all at 2d, and turn all
// into cute art style, similar to the narwhal and babies"): each fusion pet is its roster animal drawn
// again as a baby in the exact style and proportions of the eight base babies (Trailer C's narwhal
// method). Image 1 is the babies' line-up (the style), image 2 the pet's grown sprite (its species,
// markings and colours), frozen in tools/refs/fusions/grown/. An approved design (the trailer's
// narwhal) ships as it is. The silhouette contracts and their gates were the grown pets' and are not
// used: a baby's huge head is not a grown body plan.
export const BABIES_LINE = 'tools/refs/babies-line.png';
const grownRef = (key) => `tools/refs/fusions/grown/${key}.png`;
/** A fusion whose design was approved as drawn (tools/refs/fusions/approved/<key>.png), else null. */
export const approvedFusion = (root, key) => (existsSync(join(root, 'tools', 'refs', 'fusions', 'approved', `${key}.png`)) ? `tools/refs/fusions/approved/${key}.png` : null);
const BABY_STYLE =
  'Image 1 shows the game’s eight baby creatures. Match their rendering exactly: the thick, even dark plum outline (#2B1D2E) around every form, ' +
  'the thin cream-white sticker rim (#FFFAF2) outside the outline, flat colour fills with one crisp cel-shade tone and one small highlight, ' +
  'light from the upper left, big glossy expressive eyes, simple big rounded shapes with very few small details. Flat 2D sticker art, not a 3D render. ';
/** How a baby stands, by the view the field draws it in (src/kv/roam.js flips only the profile ones). */
export const BABY_VIEW = {
  profile: 'A three-quarter side view facing left, like the babies in image 1. ',
  front: 'A straight front view, symmetrical, facing the viewer. ',
  spread: 'A straight front view, symmetrical, its wings spread wide and evenly on both sides. ',
};
/** The ascended portraits' gold: the halo and sparkles on the sticker, and the plate (plate, disc, rays). */
export const ASCENDED_GOLD = ['#FFC93C', '#FFE89A'];
export const ASCENDED_PLATE = ['#FFC93C', '#FFF0B8', '#FFE07A'];
/** `hex` toward white by `t` (0–1): a plate's flat tints. */
export const tint = (hex, t) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
/** A base portrait's flat plate: the fusion's own colour, lightened (the plate, the disc behind the pet). */
export const portraitPlate = (color) => [tint(color, 0.45), tint(color, 0.78)];
/** `hex` toward the outline's plum ink by `t` (0–1): a boss plate's dark flat tints. */
export const toInk = (hex, t) => {
  const ink = [0x2b, 0x1d, 0x2e];
  return `#${[1, 3, 5].map((i, k) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (ink[k] - parseInt(hex.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};
/** A boss bust's flat plate: its colour darkened toward the ink, a disc in its own accent (darkened), flat rays. */
export const bossPlate = (color, accent) => [toInk(color, 0.62), toInk(accent, 0.45), toInk(color, 0.48)];

/**
 * The grounds a roaming pet must read on: every chapter's lanes and the hedges between them (the
 * first chapter's by name, the others where they differ). Pets stand on the field above the parapet
 * (src/sim/roam.js Y_MIN), so the keep floor is behind one only while it hops out of its den; a pet
 * 1.0 cell tall and up to 1.6 wide covers its lane and the hedges beside it.
 */
export const PET_GROUNDS = (() => {
  const out = {};
  for (const [c, g] of Object.entries(CHAPTER_GROUNDS))
    for (const name of ['lane', 'hedge'])
      if (!Object.values(out).includes(g[name])) out[name in out ? `${c}.${name}` : name] = g[name];
  return out;
})();
/** The cream rim plus the outline round a 320 px pet (10–11 px, a share of its longest side): not body, for the ground gate. */
export const PET_BAND = 0.035;
/**
 * A hero's cream sticker rim, as a share of the creature's longest side (17 px of 819 on the render
 * reference): not part of its silhouette, so the gates strip it from a pet, from the pets made so far
 * and from the base pets before comparing outlines (tools/silhouette-check.py `rim`).
 */
export const HERO_RIM = 0.02;
/** Where each zone of a pet is, by how it is drawn. */
const ZONES = {
  profile: { dark: 'the back, the head and the limbs', light: 'the belly, the chest, the face', marks: 'the back, stripes, a saddle or the limbs' },
  front: { dark: 'the head, the sides and the limbs', light: 'the face, the chest and the belly', marks: 'the head, the sides, stripes or the limbs' },
  spread: { dark: 'the body and the limbs', light: 'the wings or the sail, the face', marks: 'the body, stripes, the wing or sail edges' },
};
/**
 * A pet's value rule, so it reads on the pale sand and on the dark hedges: its cel tone over a
 * third of it, drawn as large markings when the cel tone is not the shade (a pale pet); a pet too
 * dark for the hedges (`lift`) gets a light zone of a third, where its record puts it (`liftAt`).
 * The other zones are named for its view.
 */
export function petValues(r) {
  const [dom, shade, light] = r.pal;
  const z = ZONES[r.view] ?? ZONES.profile;
  if (r.lift)
    return `VALUE RULE: ${dom} covers ${z.dark}, with one crisp cel-shade tone in ${shade}${r.lift === light ? '' : ` and a highlight in ${light}`}; a large light zone in ${r.lift} (${r.liftAt ?? z.light}) covers at least a third of the creature, so it reads on dark hedges. `;
  if (r.cel === shade) return `VALUE RULE: ${dom} covers most of the body, with one crisp cel-shade tone in ${shade} over at least a third of it and a highlight in ${light}. `;
  return `VALUE RULE: ${dom} is the main body colour, with ${shade} as its cel-shade tone and a highlight in ${light}; large markings in the darker ${r.cel} (${z.marks}) cover at least a third of the creature, so it reads on pale sand. `;
}
/** The sticker line for a pet: a prop its silhouette includes (the mole's molehill, the loris's branch) is part of the sticker, not a ground. */
export function petSticker(r) {
  if (!r.prop) return STICKER;
  const rule = 'no frame, no ground, no cast shadow.';
  if (!STICKER.endsWith(rule)) throw new Error('petSticker: the sticker line changed');
  return `${STICKER.slice(0, -rule.length)}no frame, no cast shadow, and no ground except ${r.prop}, which is part of the sticker.`;
}

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
    const key = `${a}+${b}`;
    const r = FUSION_ROSTER[key];
    if (!r) return null;
    const approved = approvedFusion(root, key);
    // an approved design ships as drawn: trimmed and sized, its own colours kept
    if (approved) return { ...base, model: null, approved, bg: 'none', refs: [], deps: [], post: { fit: 'trim', size: 320 } };
    return { ...base, model: models.best, bg: r.bg, refs: [BABIES_LINE, grownRef(key)], deps: [],
      post: { fit: 'trim', size: 320, palette: [...r.pal, ...UNI], snap: true }, // keeps the cream rim: the heroes' cue
      prompt:
        `${BABY_STYLE}Image 2 is ${r.name}, a fusion pet born of ${ELEMENTS[a].name.toLowerCase()} and ${ELEMENTS[b].name.toLowerCase()}: ${r.desc}. It is drawn there in an older, grown-up style. ` +
        `Draw ${r.name} again as a baby ${r.animal} in the exact style and proportions of image 1 (a huge head, a tiny chubby body, short stubby limbs, cute and brave), ` +
        `keeping what makes it this species and this pet: ${r.from[a]}; ${r.from[b]}. ${BABY_VIEW[r.view]}` +
        `${petValues(r)}HARD COLOUR RULE: use only these colours: ${list(r.pal)}, plus the outline ${UNI[0]}, the cream rim ${UNI[1]} and black and white for the eyes; most of the body in three or four of them. ` +
        `${petSticker(r)} ${bgLine(r.bg)}` };
  }

  if ((m = id.match(/^portrait\.([a-z]+)\+([a-z]+)(\.ascended)?$/))) {
    const [, a, b, asc] = m;
    const key = `${a}+${b}`;
    const r = FUSION_ROSTER[key];
    if (!r) return null;
    const sprite = `fusion.${key}`;
    const approved = approvedFusion(root, key);
    const bg = approved ? 'none' : r.bg; // an approved sticker comes keyed already
    // 2D namecard portraits: the pet's own sticker on a flat plate (post.py --fit plate), so the tile,
    // the roaming pet and the card are one drawing. The base portrait is made from the fusion's raw, no
    // new image; the ascended one is an edit of that sticker (a gold halo, sparkles) on a gold plate.
    if (!asc)
      return { ...base, model: null, from: sprite, bg, refs: [], deps: [sprite],
        post: { fit: 'plate', size: 512, plate: portraitPlate(FUSIONS[key].color), ...(approved ? {} : { palette: [...r.pal, ...UNI], snap: true }) } };
    const key2 = approved ? 'green' : r.bg; // the edit comes back on a key colour, even for an approved sticker
    // an edit (a halo added): the fast model keeps the design, and its own capacity frees the Pro queue
    return { ...base, model: models.fast, bg: key2, refs: [BABIES_LINE, sprite], deps: [sprite],
      post: { fit: 'plate', size: 512, plate: ASCENDED_PLATE, ...(approved ? {} : { palette: [...r.pal, ...ASCENDED_GOLD, ...UNI], snap: true }) },
      prompt:
        `${BABY_STYLE}Image 2 is ${r.name}, a pet in that style. Draw it again with exactly the same design, face, colours, proportions, pose and view, ` +
        `as its ascended legendary form: a glowing golden halo ring floating just above its head, a few small four-pointed golden sparkles around it, and a proud, brave little smile. ` +
        `HARD COLOUR RULE: the pet keeps exactly its own colours from image 2${approved ? '' : ` (${list(r.pal)}), as light or dark as they are there`}; the halo and the sparkles only in ${list(ASCENDED_GOLD)}; plus the outline ${UNI[0]}, the cream rim ${UNI[1]} and black and white for the eyes. ` +
        `${STICKER} ${bgLine(key2)}` };
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
    const r = FOE_ROSTER[type];
    if (!r) return null;
    // a boss's intro card bust (T6): 2D like every avatar (the user: "check all avatar … leave all at 2d"),
    // a half-body sticker in the foes' own style on a dark flat plate; a casual-game villain, not a scary one
    if (portrait) {
      const accent = r.accent.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? ENEMY_TYPES[type].color;
      return { ...base, model: models.best, bg: r.bg, refs: [`enemy.${type}`], deps: [`enemy.${type}`],
        post: { fit: 'plate', size: 512, plate: bossPlate(ENEMY_TYPES[type].color, accent), stripRim: true }, // a foe has no cream rim
        prompt:
          `Image 1 is ${r.name}, a boss of the animal army that besieges the player’s keep: ${r.desc}. Draw it again as a half-body portrait sticker for its "boss approaches" card, ` +
          'in exactly the same sticker style as image 1: the thick even dark plum outline (#2B1D2E) and no cream rim, flat colour fills with one crisp cel-shade tone and one small highlight, light from the upper left. ' +
          'Flat 2D sticker art, not a 3D render. Its head and upper body only, facing the viewer in a slight three-quarter view, the face large; the bottom of the body closed off with a clean rounded outline, as a half-body sticker is. ' +
          'Keep its design, face, markings, accessories and colours exactly. A casual-game villain: cute but clearly a boss, never scary: a smug, confident grin, one eyebrow raised, chin up. ' +
          `HARD COLOUR RULE: use only these colours: ${list(r.pal)}, with ${r.accent} as the single bright accent, plus the outline ${UNI[0]} and black and white for the eyes. ` +
          `Original design that does not copy any existing game or franchise character. No text, no logo, no watermark, no frame, no ground, no cast shadow. ${bgLine(r.bg)}` };
    }
    // rendering reference: the forest golden starts from the frozen render, each chapter golden
    // follows the forest golden, and every other foe follows its own chapter's golden
    const golden = CHAPTER_GOLDEN[r.chapter];
    const style = type === CHAPTER_GOLDEN.forest ? FOE_RENDER_REF : `enemy.${type === golden ? CHAPTER_GOLDEN.forest : golden}`;
    const refs = [foeSil(type), style];
    const others = Object.keys(FOE_ROSTER)
      .filter((k) => k !== type)
      .map((k) => ({ id: `enemy.${k}`, sil: foeSil(k), chapter: FOE_ROSTER[k].chapter, chapters: chaptersOf(k) }));
    const chapters = chaptersOf(type);
    return { ...base, model: models.best, bg: r.bg, refs, deps: refs.filter((x) => !x.includes('/')),
      post: { fit: 'trim', size: r.boss ? 768 : 512, stripRim: true }, // a foe has no cream rim: that is the heroes' cue
      pick: { n: 3, contract: foeSil(type), view: r.view, chapter: r.chapter, chapters, grounds: groundsOf(chapters), others, allies: 'fusion.', animal: r.animal, pose: r.pose, accepted: r.gateAccepted },
      prompt:
        `${FOE_SIL}${FOE_VIEW[r.view]}${FOE_RENDER}The creature: ${r.desc}, one of the animal army that besieges the player’s keep. Pose: ${r.pose}. ${FOE_VALUES}` +
        `HARD COLOUR RULE: use only these colours: ${list(r.pal)}, with ${r.accent} as the single bright accent, plus the outline ${UNI[0]} and black/white for the eyes. ${FOE} ${bgLine(r.bg)}` };
  }

  if ((m = id.match(/^vfx\.([a-z]+)\.([a-z]+)$/))) {
    // attack sprites: solid sticker shapes, never glows (motion carries combat, not brightness)
    const [, el, piece] = m;
    const v = VFX_PIECES[el]?.[piece];
    if (!v) return null;
    const bg = v.bg ?? BG_FOR[el]; // a piece in its element's key colour keys on the other one (the pink blossom)
    const colours = v.tint
      ? `COLOUR RULE: only cream-white ${UNI[1]}, one light grey cel-shade tone #D9D2C7 and the plum outline ${UNI[0]}; no other colours (the game tints it).`
      : `HARD COLOUR RULE: use only these colours: ${list(v.pal ?? hexes(el))}, plus white and the plum outline ${UNI[0]}.`;
    const flat = v.kind === 'decal' ? 'Seen from directly above, lying flat on the ground, no cast shadow. ' : '';
    // a long thin piece (a crack, a tendril) is drawn on a wide canvas so the model keeps it long
    return { ...base, model: models.best, bg, aspect: v.aspect ?? base.aspect, post: { fit: 'trim', size: v.kind === 'decal' || v.kind === 'burst' || v.aspect ? 256 : 192 },
      prompt:
        `A single game effect sprite for a cute sticker-style mobile tower-defense game: ${v.desc}. ${flat}` +
        `Solid opaque shapes with a thick even dark plum outline (${UNI[0]}), flat colour fills with one crisp cel-shade tone; NO glow, NO soft gradient, NO light rays, NO transparency, NO motion blur. ` +
        `${colours} One object only, centred, with margin. No text, no logo, no watermark. ${bgLine(bg)}` };
  }

  if (FRAME_ASSETS[id]) {
    // the siege frame's generated pieces: chapter paintings, far silhouette strips, props
    const f = FRAME_ASSETS[id];
    if (f.kind === 'backdrop')
      return { ...base, model: models.best, aspect: '9:16', bg: 'none', post: { fit: 'cover', size: 1600 },
        prompt:
          `Vertical mobile game background, 9:16: ${f.desc}. Low contrast and quiet so cute characters, a stone keep and a puzzle board stay readable on top; ` +
          'leave the middle and lower two thirds mostly empty and dark. Flat painterly style matching cute sticker art. No characters, no text, no UI.' };
    const strip = f.kind === 'strip';
    const look = strip
      ? 'Flat silhouette shapes with no outline and no detail inside. '
      : `Solid opaque shapes with a thick even dark plum outline (${UNI[0]}), flat colour fills with one crisp cel-shade tone; NO glow, NO soft gradient, NO light rays. `;
    return { ...base, model: models.best, aspect: strip ? '21:9' : '1:1', bg: f.bg, post: { fit: 'trim', size: strip ? 1024 : 256 },
      prompt: `A single game scenery sprite for a cute sticker-style mobile tower-defense game: ${f.desc}. ${look}No text, no logo, no watermark. ${bgLine(f.bg)}` };
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
 * whatever its own priority: a portrait needs its fusion sprite, an apex halo the hero fusion.
 */
/** A catalog row the pipeline makes: a Gemini image, or one post-processed from another's raw (a portrait). */
export const isPipelineRow = (r) => /^(Gemini|Post)\b/.test(r.method);

export function plan(rows, root, priorities, models) {
  const all = new Map();
  const skipped = [];
  for (const r of rows) {
    if (!isPipelineRow(r)) continue;
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
