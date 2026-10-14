// Sprite list and prompts for tools/gen-assets.mjs.
// Each sprite is generated on a flat chroma background (green or magenta,
// whichever the subject does not use), keyed out, trimmed and resized.

export const STYLE =
  // no franchise names: they anchor the model toward existing IP (art-style report, Table 9)
  'cute chibi sprite for a casual mobile tower-defense game, original design: ' +
  'bold clean dark outline, flat cel shading with soft highlights, vibrant saturated colours, simple readable silhouette, ' +
  'centred, the whole subject fully visible with margin around it, no text, no ground, no cast shadow, no border, no frame';

const enemy = (key, subject, bg = 'green') => ({
  key: `enemy.${key}`,
  file: `enemy-${key}.png`,
  size: 256,
  bg,
  prompt: `A single ${subject}. Front three-quarter view, facing the viewer. ${STYLE}.`,
});

const proj = (key, subject, bg = 'magenta') => ({
  key: `proj.${key}`,
  file: `proj-${key}.png`,
  size: 192,
  bg,
  prompt: `A single game projectile VFX sprite: ${subject}, flying horizontally to the RIGHT (its head on the right, its trail on the left), glowing. ${STYLE}.`,
});

export const ASSETS = [
  // Chapter 1 — Eternal Forest
  enemy('pixie', 'pink forest pixie fairy with a flower crown and light blue butterfly wings', 'green'),
  enemy('griffinChick', 'fluffy white baby griffin chick with tiny wings and a little red crest', 'green'),
  enemy('leafSprite', 'small green leaf-hooded forest sprite with tiny translucent wings', 'magenta'),
  enemy('axolotlFairy', 'pink axolotl fairy with frilly gills and small wings', 'green'),
  enemy('hoodedFlier', 'golden-winged hooded elf scout holding a small spear', 'green'),
  enemy('flameSprite', 'orange flame-flower sprite, a small living flower made of fire', 'green'),
  // Chapter 2 — Fareast Kingdom
  enemy('ninja', 'small ninja warrior in a dark blue outfit with a red headband', 'green'),
  enemy('armoredSoldier', 'chubby armoured knight soldier in blue steel armour holding a round shield', 'green'),
  enemy('ringMonk', 'floating hooded monk in brown robes holding golden ring cymbals', 'green'),
  enemy('kiteMinion', 'tiny red ninja minion riding a yellow paper kite', 'green'),
  // Chapter 3 — Dragon Peaks
  enemy('villager', 'angry medieval villager with a pitchfork and a red bandana', 'green'),
  enemy('wyvern', 'teal baby wyvern dragon with bat wings', 'magenta'),
  enemy('phoenix', 'small fiery phoenix bird with red and orange flame feathers', 'green'),
  enemy('redDragon', 'chubby red dragon with cream horns and big wings', 'green'),
  // Bosses
  enemy('elfRuler', 'regal elf queen boss with large light blue butterfly wings, a pink gown and a golden crown', 'green'),
  enemy('kiteNinja', 'purple ninja boss tied to a giant red kite, menacing but cute', 'green'),
  enemy('dragonRider', 'armoured champion knight in a winged helmet riding a black dragon, fire aura', 'green'),
  // Projectiles (used untinted for single-element blocks; fusions tint the procedural shapes)
  proj('fire', 'a blazing fireball with a flame trail'),
  proj('ice', 'a sharp crystal-blue ice shard with frosty sparkles'),
  proj('poison', 'a bubbling toxic violet poison orb with dripping trail', 'green'),
  proj('earth', 'a rough brown boulder with small rock debris'),
  proj('wind', 'a pale mint crescent wind blade slash'),
  proj('metal', 'a spinning four-pointed silver steel throwing star'),
  proj('nature', 'a glowing green leaf-shaped thorn seed', 'magenta'),
  proj('meteor', 'a flaming meteor rock with a long fire trail'),
  proj('pebble', 'a small round grey pebble with a white motion streak'),
];
