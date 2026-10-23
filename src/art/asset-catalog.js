// The full production asset catalog, built from the game's own data (elements, 28
// fusions, apex kits, enemies) so names and colours never drift. Pure: used by the
// browser asset page (assets.html) and by tools/asset-list.mjs (CSV).
import { ELEMENTS, ELEMENT_KEYS, FUSIONS } from '../sim/classes.js';
import { ENEMY_TYPES, CHAPTERS } from '../sim/enemies.js';
import { petName } from './tokens.js';
import { FUSION_ROSTER } from './fusion-roster.js';
import { VFX_PIECES } from './attack-vfx.js';
import { FRAME_ASSETS } from './frame-kit.js';

/** Every asset as a row; `price` is the USD cost of one image attempt. */
export function buildAssetRows(price = 0.0336) {
  const P = price;
  const rows = [];
  // gens: expected attempts (generation or edit) to land one approved image
  function add(r) {
    const gens = r.gens ?? 0;
    rows.push({ count: 1, refs: '', notes: '', ...r, gens, cost: +(gens * P).toFixed(2) });
  }
  const STAGES = [16, 32, 64, 128];
  const CH = Object.fromEntries(CHAPTERS.flatMap((c) => [...c.pool.map((k) => [k, c.name]), [c.boss, `${c.name} (boss)`]]));

  // --- creatures --------------------------------------------------------------------
  add({ id: 'egg.2', cat: 'Creature', layer: 'Map tile', name: 'Egg', desc: 'Neutral cream egg, speckled; tinted per die colour in code', style: 'Sticker', src: '280×280', display: '0.64 cell tall', method: 'Gemini generate', priority: 'P0', gens: 4 });
  add({ id: 'egg.4', cat: 'Creature', layer: 'Map tile', name: 'Egg, cracked', desc: 'Same egg, one zigzag crack', style: 'Sticker', src: '280×280', display: '0.64 cell tall', method: 'Gemini edit of egg.2', refs: 'egg.2', priority: 'P0', gens: 2 });
  add({ id: 'egg.8', cat: 'Creature', layer: 'Map tile', name: 'Egg, hatching', desc: 'Crack opens; two eyes peek out', style: 'Sticker', src: '280×280', display: '0.64 cell tall', method: 'Gemini edit of egg.4', refs: 'egg.4', priority: 'P0', gens: 2 });
  for (const el of ELEMENT_KEYS) {
    STAGES.forEach((v, s) => {
      add({
        id: `pet.${el}.${v}`,
        cat: 'Creature',
        layer: 'Map tile',
        name: `${ELEMENTS[el].name} baby ${v}`,
        desc: `Round bean body, ${s + 1} motif piece${s ? 's' : ''}; canonical full body, tile crop = top 76%`,
        style: 'Sticker',
        src: '280×280 (crop 280×213)',
        display: `crop ${[0.74, 0.78, 0.82, 0.86][s]} cell tall`,
        method: s === 0 ? 'Gemini generate' : `Gemini edit of pet.${el}.${STAGES[s - 1]}`,
        refs: s === 0 ? 'golden babies (2 approved)' : `pet.${el}.${STAGES[s - 1]}`,
        priority: el === 'fire' ? 'P0' : 'P1',
        gens: s === 0 ? 5 : 3,
      });
    });
  }
  for (const el of ELEMENT_KEYS) {
    add({ id: `pet.${el}.scared`, cat: 'Creature', layer: 'Map tile', name: `${ELEMENTS[el].name} baby, scared`, desc: 'Expression edit of the 16 stage: worried eyes before a block is lost', style: 'Sticker', src: '280×280', display: 'as pet', method: `Gemini edit of pet.${el}.16`, refs: `pet.${el}.16`, priority: 'P2', gens: 2 });
    add({ id: `pet.${el}.blink`, cat: 'Creature', layer: 'Map tile', name: `${ELEMENTS[el].name} baby, blink`, desc: 'Eyes-closed edit for the idle blink', style: 'Sticker', src: '280×280', display: 'as pet', method: `Gemini edit of pet.${el}.16`, refs: `pet.${el}.16`, priority: 'P2', gens: 2 });
  }
  for (const [key, f] of Object.entries(FUSIONS)) {
    const [a, b] = f.parts;
    const hero = key === 'fire+ice';
    const r = FUSION_ROSTER[key];
    add({
      id: `fusion.${key}`,
      cat: 'Creature',
      layer: 'Roaming',
      name: `${petName(a, b)} (${f.name})`,
      desc: `A baby ${r.animal} in the babies' own style (huge head, tiny chubby body; ${r.view === 'profile' ? 'three-quarter side view facing left' : r.view === 'front' ? 'front view' : 'front view, wings spread'}); ${ELEMENTS[a].name} and ${ELEMENTS[b].name} in its markings; dominant colour ${f.color}`,
      style: 'Sticker, baby proportions, one cel tone + cream rim',
      src: '320×320',
      display: '1.0 cell tall, up to 1.6 cells wide; its own namecard portrait',
      method: 'Gemini generate (the babies line-up + its grown sprite as refs), or an approved design',
      refs: `tools/refs/babies-line.png, tools/refs/fusions/grown/${key}.png`,
      priority: hero ? 'P0' : 'P1',
      gens: 1,
      notes: 'Pro model; Sparkfrost ships Trailer C’s approved narwhal (tools/refs/fusions/approved/)',
    });
  }
  for (const [key, f] of Object.entries(FUSIONS)) {
    const [a, b] = f.parts;
    add({
      id: `portrait.${key}`,
      cat: 'Creature',
      layer: 'Namecard',
      name: `${petName(a, b)} portrait`,
      desc: `Its own fusion sticker on a flat 2D plate: ${f.color} lightened, a lighter disc behind the pet`,
      style: 'Sticker on a flat plate (2D)',
      src: '512×512',
      display: '56–64 pt card, 132 pt cut-in, pick cards',
      method: `Post: fusion.${key}'s raw on its plate (tools/post.py --fit plate)`,
      refs: `fusion.${key}`,
      priority: key === 'fire+ice' ? 'P0' : 'P1',
      gens: 0,
      notes: 'no new image: the tile, the roaming pet and the card are one drawing',
    });
  }
  for (const el of ELEMENT_KEYS) {
    // v2: worn by a pure form (4096) of its element, behind it on its tile and on the field
    add({ id: `halo.${el}`, cat: 'Creature', layer: 'Map tile + field', name: `${ELEMENTS[el].name} halo kit`, desc: `Gold ring carrying 6 ${ELEMENTS[el].name} motif pieces; worn by a pure form (4096) of ${ELEMENTS[el].name}, glow added in code`, style: 'Sticker', src: '300×300', display: '0.9 cell, turns', method: 'Gemini generate', refs: 'golden fusion', priority: el === 'ice' ? 'P0' : 'P1', gens: 3 });
  }
  for (const [key, f] of Object.entries(FUSIONS)) {
    const [a, b] = f.parts;
    add({ id: `portrait.${key}.ascended`, cat: 'Creature', layer: 'Namecard', name: `${petName(a, b)} ascended portrait`, desc: 'Edit of its sticker: a gold halo, sparkles and a proud smile, on a gold plate with flat rays', style: 'Sticker on a flat plate (2D)', src: '512×512', display: 'pure form card', method: `Gemini edit of fusion.${key}`, refs: `fusion.${key}`, priority: 'P2', gens: 1 });
  }

  // --- enemies --------------------------------------------------------------------------
  for (const [k, e] of Object.entries(ENEMY_TYPES)) {
    add({ id: `enemy.${k}`, cat: 'Enemy', layer: 'Map field', name: e.name, desc: `Chibi fantasy hero, ${CH[k] ?? ''}; dark outline, no cream rim, red-tinted shadow (foe cues)`, style: 'Sticker (foe variant)', src: '256×256', display: e.boss ? '1.6 cell' : '0.5 cell', method: 'Gemini generate', refs: 'enemy golden + originality pass', priority: e.boss ? 'P1' : 'P1', gens: 4, notes: 'redesign away from Slime Legion references' });
  }
  for (const [k, e] of Object.entries(ENEMY_TYPES).filter(([, e]) => e.boss)) {
    add({ id: `enemy.${k}.portrait`, cat: 'Enemy', layer: 'UI', name: `${e.name} banner portrait`, desc: 'Boss-approaches banner bust', style: 'Vinyl 3D render', src: '512×512', display: 'banner', method: `Gemini generate (enemy.${k} as ref)`, refs: `enemy.${k}`, priority: 'P2', gens: 3 });
  }

  // --- projectiles & effects ------------------------------------------------------------------
  for (const s of [...ELEMENT_KEYS, 'meteor', 'pebble']) {
    add({ id: `proj.${s}`, cat: 'Effect', layer: 'Map field', name: `${s[0].toUpperCase() + s.slice(1)} projectile`, desc: 'Solid white-based shape (tinted per fusion in code); no glow in the art', style: 'Sticker', src: '192×192', display: '0.8 cell', method: 'Code-drawn (current) or Gemini', priority: 'P2', gens: 0, notes: 'fusion shots = first element shape in fusion colour' });
  }
  for (const k of [...ELEMENT_KEYS, 'plain']) {
    add({ id: `boom.${k}`, cat: 'Effect', layer: 'Map field', name: `${k} explosion`, desc: '8-frame burst', style: 'Sticker', src: '8 × 128²', display: '1.4–2.6 cell', method: 'Code-drawn (current)', priority: 'P2', gens: 0 });
  }
  // the overhaul's generated attack sprites (src/art/attack-vfx.js): bodies tinted per element in code
  for (const [el, pieces] of Object.entries(VFX_PIECES))
    for (const [p, v] of Object.entries(pieces))
      add({ id: `vfx.${el}.${p}`, cat: 'Effect', layer: 'Map field', name: `${ELEMENTS[el].name} ${p}`, desc: v.desc, style: 'Sticker (no glow)', src: v.kind === 'decal' || v.kind === 'burst' ? '256×256' : '192×192', display: '0.3–1.6 u', method: 'Gemini generate', priority: 'P1', gens: 1, notes: v.tint ? 'cream-white, tinted per element in code' : '' });
  for (const k of ['burn', 'poison', 'chill', 'freeze', 'loot']) {
    add({ id: `status.${k}`, cat: 'Effect', layer: 'Map field', name: `${k} status icon`, desc: 'Badge over a foe with stack count', style: 'Flat glyph', src: '64×64', display: '0.35 cell', method: 'Hand SVG', priority: 'P1', gens: 0 });
  }
  for (const [id, name, desc] of [
    ['fx.shadow', 'Blob shadow', 'Soft ellipse under creatures and foes'],
    ['fx.ring.ground', 'Ground ring', 'Element-coloured ring under a roaming pet (ally cue)'],
    ['fx.spark', 'Muzzle spark', 'Fire flash'],
    ['fx.softdot', 'Soft dot', 'Additive glow sprite'],
    ['fx.coin', 'Coin', 'Dropped coin that flies to the HUD'],
    ['fx.skill', 'Skill burst', 'Ring + burst when a namecard fires'],
    ['fx.hitflash', 'White silhouette flash', 'Pre-built white copy per creature for hit flashes (no filters)'],
  ]) add({ id, cat: 'Effect', layer: 'Map field', name, desc, style: 'Code', src: 'procedural', display: '-', method: 'Code-drawn', priority: 'P1', gens: 0 });

  // --- tiles, namecards, glyphs -------------------------------------------------------------------
  for (const el of ELEMENT_KEYS)
    add({ id: `badge.${el}`, cat: 'UI', layer: 'Map tile', name: `${ELEMENTS[el].name} badge`, desc: 'The element icon: a chunky squircle badge split into a dark and a light half of the element colour, with a bold symbol (the first Gemini icon set)', style: 'Sticker badge', src: '192×192', display: '0.2 cell badge, namecards, deck, tile card', method: 'Gemini generate', priority: 'P1', gens: 2 });
  for (const el of ELEMENT_KEYS) add({ id: `glyph.${el}`, cat: 'UI', layer: 'Map tile', name: `${ELEMENTS[el].name} glyph`, desc: 'One-colour shape signature (flame, hex snowflake, bolt, droplet, square rock, swirl, gear, leaf)', style: 'Flat glyph', src: 'vector', display: '0.2 cell badge', method: 'Hand SVG', priority: 'P0', gens: 0 });
  add({ id: 'plate.egg', cat: 'UI', layer: 'Map tile', name: 'Egg plate', desc: 'Warm sand plate, plum border, flat bevel', style: 'Sticker', src: '160×160', display: '1 cell', method: 'Code-composited from tokens', priority: 'P0', gens: 0 });
  for (const el of ELEMENT_KEYS) add({ id: `plate.${el}`, cat: 'UI', layer: 'Map tile', name: `${ELEMENTS[el].name} plate`, desc: `Tinted ${ELEMENTS[el].color}, plum border, flat two-tone bevel`, style: 'Sticker', src: '160×160', display: '1 cell', method: 'Code-composited from tokens', priority: 'P0', gens: 0 });
  add({ id: 'plate.den', cat: 'UI', layer: 'Map tile', name: 'Den plate (×28)', count: 28, desc: 'Fusion colour with a corner wedge in the motif parent colour, nest shadow, two glyph badges', style: 'Sticker', src: '160×160', display: '1 cell', method: 'Code-composited from tokens', priority: 'P0', gens: 0 });
  add({ id: 'plate.legend', cat: 'UI', layer: 'Map tile', name: 'Legendary frame', desc: 'Gold border + apex badge', style: 'Sticker', src: '160×160', display: '1 cell', method: 'Code-composited', priority: 'P1', gens: 0 });
  add({ id: 'tile.number', cat: 'UI', layer: 'Map tile', name: 'Tile numerals', desc: 'Baloo 2 ExtraBold, plum fill + cream outer stroke (4.95–13.4:1 on every plate)', style: 'Font', src: 'font (OFL)', display: '20–28 pt', method: 'Font', priority: 'P0', gens: 0 });
  add({ id: 'tile.milestone', cat: 'UI', layer: 'Map tile', name: '4-piece milestone border', desc: 'Gold toward 256, pink toward 4096', style: 'Code', src: 'procedural', display: '1 cell', method: 'Code-drawn', priority: 'P0', gens: 0 });
  for (const [id, name, desc] of [
    ['card.frame', 'Namecard frame', 'Cream rounded frame + plum line; fusion split colour'],
    ['card.frame.legend', 'Legendary namecard frame', 'Gold frame (not holographic foil: G4 tell)'],
    ['card.socket', 'Empty card socket', 'Cream clay socket with embossed "?"'],
    ['card.fill', 'Charge fill', 'Element-colour fill rising from the bottom'],
    ['card.shine', 'Ready shine', 'Diagonal sweep'],
    ['card.namepill', 'Name pill', 'Cream pill, plum text; inverts when ready'],
    ['card.cutin', 'Cut-in panel', 'Skewed panel: portrait + pet name + skill name'],
  ]) add({ id, cat: 'UI', layer: 'Namecard', name, desc, style: 'CSS / code', src: '-', display: '-', method: 'CSS/code', priority: 'P0', gens: 0 });

  // --- environment & HUD --------------------------------------------------------------------
  for (const [id, name, desc, method, pri] of [
    ['env.background', 'Background', 'Night-sky siege backdrop (gives the blue gradient a world reason)', 'Gemini generate or hand', 'P1'],
    ['env.field', 'Lane field panel', 'Meadow panel holding the 4 lanes', 'Code-drawn', 'P1'],
    ['env.lane', 'Lane path (tiling)', 'Sand path with chevrons', 'Code-drawn', 'P1'],
    ['env.portal', 'Enemy portal', 'Idle + active states', 'Code-drawn', 'P1'],
    ['env.board', 'Board panel', 'Dark plum tray under the 4×4 grid', 'Code-drawn', 'P1'],
  ]) add({ id, cat: 'Environment', layer: 'Map field', name, desc, style: 'Sticker', src: '-', display: '-', method, priority: pri, gens: method.startsWith('Gemini') ? 4 : 0 });
  // the overhaul's siege frame: drawn in code, plus these generated pieces (src/art/frame-kit.js)
  for (const [id, f] of Object.entries(FRAME_ASSETS))
    add({ id, cat: 'Environment', layer: 'Map field', name: id.slice(4), desc: f.desc, style: f.kind === 'backdrop' ? 'Painted' : 'Sticker', src: f.kind === 'backdrop' ? '1600 px tall' : f.kind === 'strip' ? '1024 px wide' : '256×256', display: '-', method: 'Gemini generate', priority: 'P1', gens: 1 });
  for (const el of ELEMENT_KEYS) add({ id: `die.${el}`, cat: 'UI', layer: 'HUD', name: `${ELEMENTS[el].name} die`, desc: 'Deck row die face with glyph', style: 'Sticker', src: '96×96', display: '0.72 unit', method: 'Code-drawn', priority: 'P1', gens: 0 });
  for (const k of ['restart', 'sound', 'mute', 'auto', 'pause', 'help', 'coin', 'blocks']) add({ id: `icon.${k}`, cat: 'UI', layer: 'HUD', name: `${k} icon`, desc: 'Redraw in the creature ink style (chunky, plum) instead of stock stroke icons (G4 tell)', style: 'Flat glyph', src: 'vector', display: '22 pt', method: 'Hand SVG', priority: 'P2', gens: 0 });
  for (const [id, name, desc] of [
    ['ui.diecard', 'New-die card', 'Offer card when a die unlocks'],
    ['ui.gameover', 'Game-over panel', 'Score, wave, best + a memorial row of lost pets'],
    ['ui.tutorial.hand', 'Tutorial finger', 'Swipe hint hand'],
  ]) add({ id, cat: 'UI', layer: 'HUD', name, desc, style: 'Clay UI', src: '-', display: '-', method: 'CSS/code', priority: 'P2', gens: 0 });

  // --- store & marketing -------------------------------------------------------------------------
  for (const [id, name, desc, n, src] of [
    ['store.icon', 'App icon', 'Novakit head on cobalt, readable at 48 px', 1, '1024×1024'],
    ['store.keyart', 'Key art', 'Board + roaming pets + cut-in, same DNA as gameplay', 1, '2732×2048'],
    ['store.screens', 'Store screenshots', 'Real gameplay frames with captions', 6, '1290×2796'],
    ['store.feature', 'Feature graphic', 'Google Play banner', 1, '1024×500'],
    ['ads.stills', 'Ad creative stills', 'Hatch, fusion, skill cut-in moments', 3, '1080×1920'],
  ]) add({ id, cat: 'Marketing', layer: 'Store', name, desc, count: n, style: 'Mixed (vinyl + gameplay)', src, display: '-', method: 'Compose from game art + human finish', priority: 'P3', gens: n * 3 });

  return rows;
}
