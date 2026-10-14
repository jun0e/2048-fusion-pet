# 2048 Siege: full asset list

This is every asset needed for the recommended art direction. Map tiles and roaming fusions use the sticker style; namecard portraits use the soft-vinyl 3D style. The list covers creatures, enemies, effects, tiles, UI, environment and store art. Each row says how the asset gets made, what it references, its priority and an estimated generation cost.

- **Full table:** one row per asset, with IDs matching the code keys: [asset-list.csv](asset-list.csv). There are 251 rows covering 285 assets; `node tools/asset-list.mjs` regenerates it from the game data.
- **Proportion guide:** [kv/proportion-guide.png](kv/proportion-guide.png), live at `kv-guide.html`. The numbers are repeated in section 2 below.
- **Visual references:**
  - [kv/key-visual.png](kv/key-visual.png): the live demo, sticker and pixel side by side.
  - [kv/art-sheet.png](kv/art-sheet.png): every stand-in creature.
- **Priorities:**
  - **P0** is the vertical slice: one creature line end to end.
  - **P1** is the launch set.
  - **P2** is polish.
  - **P3** is store and marketing.

## 1. Summary

| Group | Assets | How they're made | Gemini images | Est. attempts | Est. cost* |
|---|---|---|---|---|---|
| Eggs (2, 4, 8) | 3 | 1 generation + 2 edits | 3 | 8 | $0.27 |
| Babies, 8 elements × 4 stages (16, 32, 64, 128) | 32 | 8 generations + 24 stage edits (one motif piece per stage) | 32 | 112 | $3.76 |
| Fusion creatures (roaming) | 28 | Generated with both parents as character references | 28 | 140 | $4.70 |
| Namecard portraits (vinyl) | 28 | Generated with the fusion sprite as character reference; plate painted in | 28 | 112 | $3.76 |
| Apex halo kits (legendary) | 8 | Generated; composited over any fusion in code | 8 | 24 | $0.81 |
| Enemies | 17 | Generated after an originality pass (they currently come from Slime Legion footage) | 17 | 68 | $2.28 |
| **P0 + P1 core** (the rows above + the background) | **117** | | **117** | **~468** | **~$15.60** |
| P2: baby scared/blink edits, ascended portraits, boss portraits | 47 | Edits of approved art | 47 | ~97 | ~$3.40 |
| Projectiles, explosions, particles, status icons | 31 | Code-drawn (already in the game) or hand SVG | 0 | 0 | $0 |
| Tiles, glyphs, namecard UI, HUD, environment | 79 | Code-composited from tokens, hand SVG, CSS; only the background is generated (counted in the core row) | 1 | 4 | $0.13 |
| Store and marketing | 12 | Composed from game art, finished by hand | 0 | 0 | $0 |

\*At Nano Banana 2.1 standard pricing ($0.0336 per 1K image); Batch halves it, and hard fusions on Pro cost 4×. Every generation goes through the weekly budget guard, which stops at 80%.

There are no separate legendary creatures. In the code, 4096 is "any fusion plus a third apex element", so a legend is the fusion sprite plus its halo kit, glide motion and gold trim. That avoids 168 extra combinations.

## 2. Proportion spec (key visual guideline)

These are the numbers every creature must hit, in all three layers. The demo's stand-ins are drawn to them, and the guide draws them over the actual art. Units are the 100-unit construction box; "cell" means one board tile.

### Babies (16 → 128), map tiles

| Measure | Value |
|---|---|
| Body | One round "bean" shared by all elements, 64 wide (x 18–82) × 59 tall (y 34–93); arms to x 13–87; feet y 93–97 |
| Head share | The baby is all head, 1 head tall |
| Eyes | Eye line y 59, each eye about 15 units across, centres 25 apart (each about 24% of body width), round with a big highlight |
| Mouth and blush | Mouth y 70; blush y 69, 22.5 out from the centre |
| Motif zone | Above the head (y 13–34); 1 piece at 16, 2 at 32, 3 at 64, 4 at 128 |
| Tile crop | The top 76% of the box shows; the creature sits on the tile's bottom sill (93% of tile height) |
| Size in tile | Visible crop 0.78 / 0.84 / 0.90 / 0.96 cell tall at 16 / 32 / 64 / 128, so the head is 39 / 42 / 45 / 48% of the tile |
| Expression | Round eyes at 16 and 32, faint brow at 64, slightly almond at 128; one "uncool" softener per element |

### Fusions (256+), roaming

| Measure | Value |
|---|---|
| Height | Head top y 17 to feet y 95; about 2.9 heads tall |
| Head | 35% of standing height (target 30–35%); drawn in a 41-unit box, scaled ×0.68 about the neck (y 44) |
| Legs | 37% of height (target 35–40%); hips at y 66 |
| Eyes | Almond, outer corners tilted up 13°, short angled brows (≤20°), smirk with one fang |
| Slots | Body and silhouette from parent A; head crest and tail tip from parent B; fusion colour dominant (60% fusion / 30% motif parent / 10% accent) |
| View | Three-quarter facing left; the sprite flips to face its walk |
| On the field | Canvas 1.42 cells tall, so the creature is about 1.05 cell, about twice a foe (0.5 cell); element ground ring 1.24 × 0.4 cell |

### Legendary (4096)

| Measure | Value |
|---|---|
| Body | Same fusion sprite plus gold chest emblem; serene arched brows, calm mouth |
| Size | Canvas 1.62 cells: creature about 1.2 cell, plus halo for about 1.5 cell total |
| Halo kit | Gold ring carrying 6 apex motif pieces, 1.05 cell wide, rotating slowly; glow added in code |
| Motion | Floats 0.3 cell over a detached, smaller shadow; no squash; 2.5–4 s float cycle |

### Tile layout (map)

| Zone | Value (of tile height) |
|---|---|
| Plate inset | 5% |
| Number | Centre at 33%; number zone ends at 55%; numeral height 39% (1–2 digits), 31% (3), 26% (4) |
| Number style | Baloo 2 ExtraBold, plum fill `#2b1d2e` with a cream `#fffaf2` outer stroke at 26% of the font size; 4.95–13.4:1 contrast on every plate |
| Creature | Eyes at about 80%, never under the number; sits on 93% |
| Glyph badge | Bottom-right, radius 10.6%; dens carry both parents' badges, legends add the apex badge top-centre |
| Den (256+) | Number centred at 50%; fusion-colour plate with a corner wedge in the motif parent's colour |

### Namecard portrait (vinyl)

| Measure | Value |
|---|---|
| Crop | Head-and-shoulders bust, 3/4 facing the field; crest may touch the top edge |
| Head | Fills about 60% of the height; eye line at about 45%; chin at about 72%; shoulders at the bottom edge |
| Light | Warm key light from upper-left; rim light from back-right in the creature's own element colour (its aura, so it has a source) |
| Plate | Radial gradient in the fusion colour painted into the image (no keying); soft rays behind the head |
| Display | 56–64 pt at rest beside the board, 132 pt in the cut-in |
| Legend | Lower camera, backlight halo in the apex colour, gold frame (not holographic foil) |

### Lines and colour

| Rule | Value |
|---|---|
| Outer outline | Plum `#2b1d2e`, 3 units (about 1.5–2 pt on screen) |
| Sticker rim | Cream `#fffaf2`, 2.2 units outside the outline (about 1–1.5 pt); tiles and roaming only |
| Inner lines | Plum, 2.3 units; one hard cel tone, light from upper-left |
| Palette | 4–5 colours plus outline per creature; each stage adds motif pieces, not new hues; legends add one gold |
| Foes | Dark outline, no cream rim, red-tinted shadow, so friend and foe differ by shape and value, not only hue |

## 3. Creatures

### 3.1 Eggs and babies (map tiles)

| ID pattern | Assets | Notes |
|---|---|---|
| `egg.2`, `egg.4`, `egg.8` | 3 | Neutral cream egg; 4 adds a crack; 8 opens with two eyes peeking. Tinted per die colour in code |
| `pet.<element>.<16/32/64/128>` | 32 | Elements: fire, ice, lightning, poison, earth, wind, metal, nature. Canonical full body, tile crop taken automatically |
| `pet.<element>.scared`, `.blink` | 16 (P2) | Expression edits for the danger state and the idle blink |

Element signatures, one motif that grows from 1 to 4 pieces:

| Element | Motif | Body note | Glyph |
|---|---|---|---|
| Fire | Ember flame licks; tail ember at 128 | Teardrop-up bean | Flame |
| Ice | Hex crystal shards; nose icicle | Faceted bean | Hex snowflake |
| Lightning | Forelock bolt, then zigzag ears (not on the tail) | Bean | Bolt |
| Poison | Floating bubbles, droopy goo curl | Drippy hem | Droplet |
| Earth | Flat-top rock plates, moss tuft | Squarish | Square rock |
| Wind | Cloud puffs with a swirl; swoosh tail | Bean | Swirl |
| Metal | Antenna: ball, then bolt head, then gear; rivets | Rounded box | Gear |
| Nature | Sprout leaves, blooms at 128; vine tail | Bean | Leaf |

### 3.2 Fusions (roaming sprite + namecard portrait + optional ascended portrait)

Each row is 3 assets: `fusion.<key>`, `portrait.<key>` and `portrait.<key>.ascended` (P2).

| Pet name | Skill (fusion) | Body from (A) | Crest and tail from (B) | Colour | Priority |
|---|---|---|---|---|---|
| Novakit | Frostnova | Fire | Ice | `#5b8cff` | P0 |
| Zapcinder | Plasma | Fire | Lightning | `#ff4fb8` | P1 |
| Smogpup | Brimstone | Fire | Poison | `#d6452f` | P1 |
| Magmole | Magma | Fire | Earth | `#ff9f1c` | P1 |
| Flarewhirl | Inferno | Fire | Wind | `#f24c00` | P1 |
| Sparkfrost | Cryo Arc | Ice | Lightning | `#00d2ff` | P1 |
| Frostfang | Venom | Ice | Poison | `#7b61ff` | P1 |
| Tundrock | Glacier | Ice | Earth | `#9fc5e8` | P1 |
| Flurrin | Blizzard | Ice | Wind | `#e0f7ff` | P1 |
| Fizzlebolt | Toxic Shock | Lightning | Poison | `#c6ff00` | P1 |
| Rumblebolt | Thunderquake | Lightning | Earth | `#b8860b` | P1 |
| Gustbolt | Storm | Lightning | Wind | `#9fa8ff` | P1 |
| Bogling | Swamp | Poison | Earth | `#6b8e23` | P1 |
| Mistmaw | Miasma | Poison | Wind | `#c39bd3` | P1 |
| Dunepuff | Sandstorm | Earth | Wind | `#e6c88a` | P1 |
| Anvilpup | Forge | Fire | Metal | `#cd7f32` | P1 |
| Rimeplate | Cold Iron | Ice | Metal | `#7f9cb8` | P1 |
| Voltgild | Railgun | Lightning | Metal | `#ffd700` | P1 |
| Rustgrub | Corrosion | Poison | Metal | `#8e7cc3` | P1 |
| Ironclod | Ironstone | Earth | Metal | `#8d6e63` | P1 |
| Whirlblade | Bladewind | Wind | Metal | `#b0e0e6` | P1 |
| Embersprout | Wildfire | Fire | Nature | `#d4e157` | P1 |
| Frostpetal | Frostbloom | Ice | Nature | `#7fffd4` | P1 |
| Zaplily | Thunderbloom | Lightning | Nature | `#a8e063` | P1 |
| Nightling | Nightshade | Poison | Nature | `#7a3fa8` | P1 |
| Mossbun | Overgrowth | Earth | Nature | `#2e8b57` | P1 |
| Pollenpuff | Pollenstorm | Wind | Nature | `#fff59d` | P1 |
| Sproutgear | Harvest | Metal | Nature | `#f4a261` | P1 |

The canonical A/B order is the code's element order, so there is one sprite per pair whichever block slid in. The pet names are new working titles; check them against existing trademarks before launch.

### 3.3 Apex halo kits (legendary, `halo.<element>`)

| Kit | Apex element | Ultimate effect (gameplay) |
|---|---|---|
| Sun | Fire | Every 2 s, burns every foe on the field |
| Timestop (P0) | Ice | Every 10 s, freezes every foe for 2.5 s |
| Tempest | Lightning | Every 1.5 s, lightning strikes 3 random foes |
| Plague | Poison | Every second, poison jumps to nearby foes |
| Meteor | Earth | Every 5 s, a meteor hits the biggest crowd |
| Vortex | Wind | Every 8 s, blows every non-boss foe 3 steps back |
| Midas | Metal | Every 4 s, gilds every foe: bonus coins |
| Lifebloom | Nature | Every 6 s, repairs every damaged block by 25% |

## 4. Enemies (`enemy.<type>`, P1)

There are 17 sprites at 256 px, displayed at 0.5 cell (bosses 1.6). Each uses the foe treatment: dark outline, no cream rim, red-tinted shadow. They all need an originality pass because the current roster is based on Slime Legion footage.

| Chapter | Enemies |
|---|---|
| Eternal Forest | Pixie, Griffin Chick, Leaf Sprite (generate the wings opaque), Axolotl Fairy, Hooded Flier, Flame Sprite; boss: Elf Ruler |
| Fareast Kingdom | Ninja, Armoured Soldier, Ring Monk, Kite Minion; boss: Kite Ninja |
| Dragon Peaks | Villager, Wyvern, Phoenix, Red Dragon; boss: Earth Dragon Rider |
| Boss banner portraits (P2) | Elf Ruler, Kite Ninja, Earth Dragon Rider, in vinyl |

## 5. Effects (code-drawn today)

| ID pattern | Assets | Notes |
|---|---|---|
| `proj.<element>`, `proj.meteor`, `proj.pebble` | 10 | Solid white-based shapes, tinted per fusion (first element's shape in the fusion colour); no glow in the art |
| `boom.<element>`, `boom.plain` | 9 sheets × 8 frames | Explosions |
| `status.burn/poison/chill/freeze/loot` | 5 | Badge over a foe with its stack count |
| `fx.shadow`, `fx.ring.ground`, `fx.spark`, `fx.softdot`, `fx.coin`, `fx.skill`, `fx.hitflash` | 7 | The hit flash is a pre-built white silhouette per creature, never a filter |

## 6. Tiles, namecards and UI

| ID pattern | Assets | Method |
|---|---|---|
| `glyph.<element>` | 8 | Hand SVG (P0): the colourblind-safe second channel |
| `plate.egg`, `plate.<element>`, `plate.den` (×28), `plate.legend` | 38 | Composited from tokens in code |
| `tile.number`, `tile.milestone` | 2 | Font (Baloo 2, OFL) and code |
| `card.frame`, `.frame.legend`, `.socket`, `.fill`, `.shine`, `.namepill`, `.cutin` | 7 | CSS/code: charging, ready (colour + ring + shine), cut-in, lost |
| `die.<element>` | 8 | Deck row dice (code) |
| `icon.restart/sound/mute/auto/pause/help/coin/blocks` | 8 (P2) | Redraw in the creature ink style |
| `ui.diecard`, `ui.gameover` (with a lost-pets memorial row), `ui.tutorial.hand` | 3 (P2) | CSS/code |
| `env.background`, `env.field`, `env.lane`, `env.portal`, `env.board` | 5 | Background as a night sky over the siege (gives the blue gradient a reason); the rest code |

## 7. Store and marketing (P3)

App icon (1024², Novakit's head on cobalt, readable at 48 px); key art (2732×2048, board + roaming pets + cut-in); 6 store screenshots from real gameplay; Google Play feature graphic (1024×500); 3 ad stills (hatch, fusion, skill cut-in).

## 8. Production order

1. **P0 slice (10 images, about $1):** eggs, the fire line from 16 to 128, Novakit (Frostnova) with its portrait, and the Timestop halo. Approve them in the running game against the proportion guide, in greyscale and through a colourblind simulator.
2. **Golden references:** pick 2 approved babies, 2 fusions and 2 portraits. Every later call passes them as style references.
3. **P1 creatures:** the remaining 7 baby lines (generate the 16, then edit each later stage), then the 27 fusions with both parents as references, then the 27 portraits, then the 7 halo kits.
4. **Enemies:** after the originality pass.
5. **P2 edits and P3 store art.**

Keep every raw image and prompt (there is no seed to regenerate from), and give the 8 base babies a human paint-over, since all 28 fusions inherit from them.
