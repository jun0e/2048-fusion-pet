// The foe roster of the visual overhaul (reports/art/visual-overhaul/proposal.md, section 7):
// every sim enemy key keeps its rules and becomes one animal with its own silhouette.
// Shared by the asset pipeline (prompts, silhouette contracts, gates) and the renderer (motion,
// shadow, size class). Pure data, plus the small rules both sides share (foeDrawSize, foeChapters).
// The grounds a foe must read on come from the chapter skins (src/art/frame-kit.js CHAPTER_GROUNDS).
//
//   view   how the sprite is drawn, so the renderer's horizontal flip stays correct:
//          profile = strict side view facing left; front = symmetric, facing the camera;
//          spread = seen from above or the front with both wings symmetrically spread
//   move   walk | crawl | hover (a detached shadow) | swim (an S drift) | float (lotus bob)
//   pal    four body colours (the mass is dark: L* <= 40; the light zone is cream: L* >= 75)
//   accent the one bright accent (eyes or a weak point)
//   gateAccepted  a reviewed sprite that ships a hair outside its gates (tools/silhouette-check.py):
//          each gate it misses with the margin seen in review, and why it is kept. The pipeline still
//          reports it but does not fail the run for that miss; a miss of any other gate, or a worse
//          one, does (exit 2)
import { CHAPTERS, ENEMY_TYPES } from '../sim/enemies.js';

export const FOE_ROSTER = {
  // Forest: the Wild Hunt
  pixie: {
    animal: 'moth', name: 'Moonmoth', chapter: 'forest', view: 'spread', move: 'hover', bg: 'magenta',
    desc: 'a luna moth: broad wings whose fields are dusty dark teal with a pale mint edge band and two cream eye-spots on each wing, a plump cream furry body, feathery antennae, two long tail streamers',
    pose: 'seen from directly above, both wings fully and symmetrically spread like a pinned specimen, the body vertical in the middle, the head and antennae at the top and the two tail streamers at the bottom',
    pal: ['#3F6B63', '#2F524C', '#A9D9C8', '#F3EADC'], accent: 'rose pink #E58AA6 on the eye-spot centres',
  },
  griffinChick: {
    animal: 'dormouse', name: 'Dormouse', chapter: 'forest', view: 'profile', move: 'walk', bg: 'green',
    desc: 'a dormouse: a round dark hazel-brown body, a round head with two big round ears, a large cream belly, chest and muzzle, a long thin tail',
    pose: 'crouched low on the ground, the head at the left, the long thin tail curling up and over its back at the right',
    pal: ['#5E4230', '#45301F', '#B48A62', '#F3EADC'], accent: 'pink #E58AA6 on the nose and inner ears',
  },
  leafSprite: {
    animal: 'beetle', name: 'Shield Beetle', chapter: 'forest', view: 'profile', move: 'walk', bg: 'magenta',
    gateAccepted: { margins: { twinChapter: -0.048 }, why: 'twin with the owl at 0.60 in the forest (limit 0.55): a side-view beetle against a front-view owl, distinct on screen (2026-10-16)' },
    desc: 'a shield beetle: a low domed body of dark moss-green armour, its two wing cases lifted apart, a pale cream underside and leg joints, a small head with mandibles and one curled antenna',
    pose: 'the two wing cases lifted up and apart into a V above its back, the head and mandibles at the left, six thin legs standing on the ground',
    pal: ['#3E5A3A', '#2C4229', '#7E9A62', '#EADFC4'], accent: 'amber #FFB52E on the eyes',
  },
  axolotlFairy: {
    animal: 'axolotl', name: 'Gillnewt', chapter: 'forest', view: 'profile', move: 'swim', bg: 'green',
    desc: 'an axolotl: a long dark mauve body with a cream belly and face, a crown of three feathery gill fronds on each side of the head, a paddle tail, small legs',
    pose: 'swimming diagonally up and to the left, the head and gill fronds at the upper left, the paddle tail at the lower right',
    pal: ['#6B4A5E', '#4E3445', '#B98AA0', '#F3EADC'], accent: 'coral #FF7F6E on the gill fronds',
  },
  hoodedFlier: {
    animal: 'owl', name: 'Horned Owl', chapter: 'forest', view: 'front', move: 'hover', bg: 'green',
    gateAccepted: { margins: { twin: -0.005, twinChapter: -0.055, ally: -0.006 }, why: 'twin with the beetle at 0.60 and a pet at 0.66: the only front-view owl, distinct on screen (2026-10-16)' },
    desc: 'a horned owl: a tall egg-shaped body of dark bark-brown feathers, a big cream facial disc and a cream chest, two pointed ear tufts, wings, talons',
    pose: 'front view, upright and symmetrical, the wings half spread at both sides, the talons at the bottom',
    pal: ['#5A4130', '#3F2D21', '#9C7A5A', '#F3EADC'], accent: 'amber #FFB52E on the eyes',
  },
  flameSprite: {
    animal: 'salamander', name: 'Ember Salamander', chapter: 'forest', view: 'profile', move: 'crawl', bg: 'green',
    desc: 'a fire salamander: a low charcoal body with a pale ash-cream throat, belly and leg undersides, four splayed legs, a long tail ending in a flame-shaped tip',
    pose: 'a low S-curved crawl, the head at the left, the tail curling up at the right into the flame-shaped tip',
    pal: ['#3A3436', '#262123', '#6E6466', '#E6D9C4'], accent: 'ember orange #FF7A2E on the round spots and the tail tip',
  },
  elfRuler: {
    animal: 'hivequeen', name: 'Hive Queen', chapter: 'forest', view: 'profile', move: 'hover', bg: 'green', boss: true,
    gateAccepted: { margins: { twin: -0.034, twinChapter: -0.046, ally: -0.035 }, why: 'the boss: twin 0.63 with the pangolin (another chapter), 0.60 with the owl, a pet at 0.69; crowned, with its HP bar (2026-10-16)' },
    desc: 'a hive queen bee, the boss: a low head with a small crown, a round thorax, a big abdomen with dark bands, two long narrow pale cream wings, a stinger',
    pose: 'the crowned head at the left, the big banded abdomen hanging behind at the right with the stinger at its tip, the two long narrow wings swept up and back',
    pal: ['#D99A16', '#3A2A20', '#A66F10', '#F3EADC'], accent: 'bright gold #FFD84A on the crown',
  },
  // Fareast: the Paper Court
  ninja: {
    animal: 'fox', name: 'Nightfox', chapter: 'fareast', view: 'profile', move: 'walk', bg: 'green',
    gateAccepted: { margins: { ground: -0.082 }, why: 'reads weakly on the dark keep floor (0.25): the renderer lays a pale patch under foes on the keep (2026-10-16)' },
    desc: 'a shadow fox: a sleek ink-navy body with a large cream chest, belly, muzzle and tail tip, upright pointed ears, a big brush tail, a small red scarf',
    pose: 'a low running dash, the body level, the legs stretched fore and aft, the ears upright at the left, the big brush tail raised up behind at an angle',
    pal: ['#3C3D5C', '#2A2B42', '#5A5C82', '#F3EADC'], accent: 'red #C04848 on the scarf and the eyes',
  },
  armoredSoldier: {
    animal: 'pangolin', name: 'Pangolin Guard', chapter: 'fareast', view: 'profile', move: 'walk', bg: 'magenta',
    gateAccepted: { margins: { twin: -0.034 }, why: 'twin with the hive queen at 0.63, but they never march in the same chapter (2026-10-16)' },
    desc: 'a pangolin: a wedge-shaped armoured body of overlapping dark lacquer-brown scales with wide pale tan scale edges, a small low head, a pale cream face, belly and inner tail, short legs',
    pose: 'the small head low at the left near the ground, short legs, a thick tail hooking up over its rump at the right',
    pal: ['#5E3F26', '#3F2A19', '#D9BE96', '#F3EADC'], accent: 'jade green #5F9A7A on the scale tips',
  },
  ringMonk: {
    animal: 'macaque', name: 'Cymbal Macaque', chapter: 'fareast', view: 'front', move: 'float', bg: 'green',
    desc: 'a snow macaque monk: a round body of slate-grey fur with a large cream belly and chin, a round head with small ears, two brass ring cymbals',
    pose: 'front view, floating in a lotus pose, both arms raised straight up, each holding a round brass cymbal above its head, symmetrical',
    pal: ['#5E5A56', '#45413E', '#D99A16', '#F3EADC'], accent: 'red #C04848 on the face',
  },
  kiteMinion: {
    animal: 'kitecarp', name: 'Kite Carp', chapter: 'fareast', view: 'profile', move: 'hover', bg: 'green',
    gateAccepted: { margins: { ground: -0.038 }, why: 'reads weakly on the dark keep floor (0.29): the renderer lays a pale patch under foes on the keep (2026-10-16)' },
    desc: 'a paper carp streamer kite: a tube body with a dark ink-navy back and a cream paper belly, a round open mouth, a fan tail, small fins',
    pose: 'the round open mouth at the left, the tube body level, the fan tail at the right, small fins on top and below',
    pal: ['#3C3D5C', '#2A2B42', '#E6D3B3', '#F3EADC'], accent: 'red #C04848 on the fins and the mouth ring',
  },
  kiteNinja: {
    animal: 'pagodacrab', name: 'Pagoda Crab', chapter: 'fareast', view: 'front', move: 'walk', bg: 'green', boss: true,
    desc: 'a pagoda crab, the boss: a wide flat dark lacquer-red crab body, a stepped two-tier pagoda shell with cream paper walls on its back, two big claws, ink-dark legs',
    pose: 'front view, symmetrical, the two big claws raised straight up at the sides like towers, four legs on each side, the pagoda shell on top in the middle',
    pal: ['#7A2E2A', '#B2574E', '#3A2A30', '#F3EADC'], accent: 'bright gold #FFD84A on the pagoda eaves',
  },
  // Peaks: the Ember Peaks
  villager: {
    animal: 'ibex', name: 'Crag Ibex', chapter: 'peaks', view: 'profile', move: 'walk', bg: 'green',
    desc: 'a mountain ibex: a compact dark slate body on four straight legs, a cream belly, muzzle and beard, two big bone-cream horns',
    pose: 'the head lowered at the left in a charge, the two big horns curving back over its body, standing square on four straight legs',
    pal: ['#4E4E5A', '#36363F', '#E6D3B3', '#F3EADC'], accent: 'amber #FFB52E on the eyes',
  },
  // The wyvern's contract (tools/refs/foes/sil-wyvern.png) is the approved sprite's own outline
  // (2026-10-16): the first sketch was a symmetric wing bar, not the side glide this entry asks
  // for, so the side-view glide that shipped, distinct from every other foe, became the contract.
  wyvern: {
    animal: 'wyvern', name: 'Crag Wyvern', chapter: 'peaks', view: 'profile', move: 'hover', bg: 'green',
    desc: 'a pterosaur-like wyvern: a dark basalt body and head with a long crest, wide thin wings of pale ash membrane, no forelegs, a whip tail',
    pose: 'gliding, the long crested head at the left, one wide thin wing raised up and back, the whip tail curving down behind at the right',
    pal: ['#45454F', '#2F2F37', '#A6A2A0', '#E9E4D8'], accent: 'ember orange #FF7A2E on the crest',
  },
  phoenix: {
    animal: 'bat', name: 'Cinder Bat', chapter: 'peaks', view: 'spread', move: 'hover', bg: 'green',
    desc: 'a cinder bat: a small charcoal body with big pointed ears, wide scalloped wings of pale ash membrane on charcoal arms',
    pose: 'seen from the front with both wings fully and symmetrically spread, the big ears at the top, the small body hanging between the wings',
    pal: ['#3A3436', '#262123', '#D6CFC6', '#EFE9E0'], accent: 'ember orange #FF7A2E on the eyes and the wing veins',
  },
  redDragon: {
    animal: 'snail', name: 'Magma Snail', chapter: 'peaks', view: 'profile', move: 'crawl', bg: 'green',
    desc: 'a magma snail: a big round dark basalt rock shell with glowing lava seams, a long low pale peach-cream foot, two eye stalks',
    pose: 'the two eye stalks up at the left, the long low foot stretched along the ground, the big round shell on its back at the right',
    pal: ['#4A4A52', '#2F2F37', '#F0C9A0', '#E9E4D8'], accent: 'lava orange #FF7A2E on the shell seams',
  },
  dragonRider: {
    animal: 'wyrm', name: 'Lava Wyrm', chapter: 'peaks', view: 'profile', move: 'crawl', bg: 'green', boss: true,
    desc: 'a lava wyrm, the boss: a long body of round obsidian segments with cream belly plates, a crested head, a row of bone-cream dorsal spikes, no wings, no legs',
    pose: 'the body rising from the lower right to the crested head raised at the upper left, the dorsal spikes along its back',
    pal: ['#2F2A33', '#4A4450', '#E6D3B3', '#F3EADC'], accent: 'lava orange #FF7A2E in the seams between the segments',
  },
};

/** The first foe made in each chapter: the rendering reference for the rest of its chapter. */
export const CHAPTER_GOLDEN = { forest: 'pixie', fareast: 'ninja', peaks: 'villager' };

/**
 * Every chapter a foe marches in (src/sim/enemies.js): a chapter's pool, its boss, and what its
 * boss releases (the Kite Carps come out of the Pagoda Crab). The Moonmoth marches in the forest
 * and in the far east. The silhouette gates hold a foe apart from every foe it shares a wave with.
 */
export function foeChapters(type) {
  return CHAPTERS.filter((c) => c.pool.includes(type) || c.boss === type || ENEMY_TYPES[c.boss]?.summonOnDeath?.type === type).map((c) => c.key);
}

/** Render only: the smallest a foe is drawn, in sim size units, so it still reads at a phone's 32 px floor (the sim's size is untouched). */
export const FOE_SIZE_FLOOR = 0.42;

/**
 * How wide a foe is drawn, in world units: its sim size raised to FOE_SIZE_FLOOR (a boss keeps
 * its own), × 2.5 (a boss × 2.6). The renderer (src/render/foes.js), the death puff
 * (src/render/attacks.js) and the flash audit (tools/flash-audit.mjs) all size a foe from this,
 * so the light a hit flash books is the light it draws.
 */
export const foeDrawSize = (def = {}) => (def.boss ? (def.size ?? FOE_SIZE_FLOOR) * 2.6 : Math.max(def.size ?? FOE_SIZE_FLOOR, FOE_SIZE_FLOOR) * 2.5);
