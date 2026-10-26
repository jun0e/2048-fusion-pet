# 2048 Fusion Pet (prototype fork)

A fork of [2048 Defense](../merge-ball-td) without a castle. **The blocks are what you defend.** There is no wall and no castle health bar: enemies march down the four lanes onto the board and attack the blocks themselves. Every block has hidden health that refills at the start of each wave; a block whose health runs out is destroyed for good, and **you lose when your last block falls**.

Everything else is the same game: real-time 2048 swiping that costs coins, dice colours where the sliding block sets the colour, element / fusion / ultimate classes, per-element shooting patterns, waves, bosses and the coin economy.

### Siege rules

| | |
|---|---|
| Block health | 50 × tier^1.5: grows with the tier, not the value, so blocks stay fragile (a 2 has 50, a 16 has 400, a 256 has 1,131, a 2048 has 1,824). Never shown; hits flash the block red and make it shudder |
| Refill | Every block is back to full health at the start of each wave |
| Merging | The merged block keeps the damage its parents had taken (their health adds up, up to its new maximum), so merging doesn't heal for free |
| Enemies | Walk down their lane; once on the board, each heads for the nearest block below it in its own column (else the nearest block anywhere), stops next to it and attacks |
| Enemy attacks | One hit per second (the first 0.4 s after reaching a block). Damage per hit = its old castle damage × 0.45 × 1.13^(wave − 1); bosses hit at 0.35× of that |
| Destroyed blocks | Gone for good (a blast and a "Block lost!" pop-up); the status bar counts the blocks you have left and turns red at 3 or fewer |
| Losing | No blocks left |
| Selling | Not in this version: a locked board opens up when enemies destroy a block or a boss kill promotes one |
| Nature | Its heal now repairs the most damaged block by 12% of its health (20% chance per volley); Lifebloom repairs every damaged block by 25% every 6 s |
| Knockback | Earth and Vortex shove enemies off the block they are attacking, back up the board |

| Shooting | Only blocks of 16 or more shoot. Smaller blocks are plain (no element) and just soak up hits |
| Elements | A block reaching 16 rolls a random element from your deck. When two elemental blocks merge, the one that slides in keeps its element |
| Milestone border | Blocks of 16+ wear a 4-piece border: one piece lights per merge (32, 64, 128), full at 256 = fusion; it then counts again to 4096 = ultimate |
| Fusion | Always at 256: the pair becomes a unique element with its own name, colour, pet and both effects (Fire + Ice = Frostnova: burn and slow). **You pick it:** a block remembers its material, the elements of every elemental block merged into it, and at 256 a card offers each fusion that material can make (up to 4, the merge rule's own pick first). One possible pair fuses at once; a block of one element fuses with a rolled die, as before. A boss x2 that lifts a block to 256 offers the pick too. Tap a block to see its options |
| Dice | You start with 2 (the main game starts with 4); the first 64, 256 and 512 each add one |
| Opening | Every run starts with two 8s side by side: the first sideways swipe makes a turret. 100 starting coins |
| Income | 3 coins per second during a wave, so destroyed blocks can always be swiped back in |
| Autoplay | The Auto button lets a bot play (swipes about twice a second, picks the first die, presses Wave now when broke) |
| Boss promotion | If it lifts a block into 256 or 4096, the open fusion / ultimate slot takes a random die from your deck (there is no partner block to borrow from) |

Balance (the autoplay bot, 8 seeds): fast play ends around wave 20 on average (10–30), human pace around wave 16 (11–25); no early collapses and no runs past wave 40. Milestones: element awakens at wave 1, first unlock ~wave 5, fusion and the second unlock ~wave 10–11, third unlock ~wave 11–15. Tuning knobs live in `SIEGE` in `src/config.js`.

### Tutorial

- **Guided opening** (first run): the opening countdown waits while a finger shows the swipe, then pointers explain swipe cost, that your blocks are your only defense, the keepsake you bring (Iron Fist, pointing at its disc), and starting the wave. Skippable.
- **One-time tips** the first time each thing happens, pointing at it: first merge, the lanes, a block attacked, a block lost, kill coins, out of coins, the break, colour override, awakening (upgrade), new die (unlock), fusion, ultimate, boss, 2048, the first level up, and with Iron Fist the first bite (the slow-motion punch tip, then "Punch!" after the first punch).
- **"?" How to play** sheet (pauses the game) with **Replay tutorial**. Progress lives in localStorage; `?tutorial` in the URL resets it.

Run it next to the main game: `npm run dev -- --port 5176`.

### The level road (the Lv disc)

v2.1 (`src/sim/levels.js`): 20 levels in a run of about 12 minutes, about one every 30 seconds. XP comes from kills (1 each, 10 a boss) and cleared waves (3); there is no Buy XP and no level cap. Every level moves the odds of the block each swipe adds toward bigger values, as a player's level in Teamfight Tactics moves its shop's odds, and some levels bring more. The **Lv** disc sits above the coin plate, with an XP ring. Tap it for the XP still needed and the next level's reward; no odds are shown.

| Level | About (the bot's median) | Reward |
|---|---|---|
| 2, 4, 6, 8, 10, 13 | 0:18 … 5:12 | Pick a new element (1 of 2): the whole deck of 8 by level 13 |
| 3, 7, 12 | 0:36, 2:18, 4:48 | New blocks can be 8s, then 16s, then 32s (2s stop at 12) |
| 11 | 4:12 | The board grows to 5×5 (5 lanes) |
| 15, 19 | 6:12, 8:36 | Summons charge 2 s faster |
| 16, 20 | 6:42, 9:12 | 4s stop, then 8s (level 20 is for strong runs) |
| 17 | 7:12 | The board grows to 6×6 (6 lanes) |

- **The board grows** at the first break after its level: a new column on the right and a new row on top, in the same footprint on screen, so the cells shrink. Each column guards its own lane.
- **After the run's first 512, no more 2s:** the other values share the 2s' weight.
- **A spawned 16 or 32** hatches like a merged one: it rolls an element from the deck.

### Keepsakes (the disc above Wave now)

You bring one keepsake into each run (`src/sim/keepsakes.js`). The biggest block you have ever made unlocks the next ones; the record is `siege:meta` in localStorage (`src/ux/meta.js`). Once the opening tutorial is done, every run after the first opens with a picker (never in `?kv`). The last keepsake is preselected, so Start run is one tap. Tap the disc in a run to read what yours does.

| Keepsake | Unlocked by | Effect |
|---|---|---|
| Iron Fist | (the starter) | A block that moves in a swipe punches every monster in its way, as hard as its base hit (once per monster per swipe, from the biggest block) |
| Coin Purse | a 128 | +60 coins at the start; kills pay 20% more |
| Spiked Collar | a 256 | Blocks have 30% more health |
| Lucky Clover | a 512 | New blocks use the odds of 2 levels above yours, up to the top level |
| Phoenix Feather | a 1024 | Once a run, your last block rises as the biggest block you lost this run, at full health; the monsters on the board are thrown back to the gates; +4 swipes of coins |
| Quake Boots | a 2048 | A swipe with 2+ merges stomps: every monster on the board takes your top block's base hit and is stunned for 1.5 s (bosses half as long) |

**First run:** Iron Fist is equipped with no picker. The opening names it ("Your keepsake: Iron Fist. Blocks punch monsters."). The first time a monster bites a block, the game slows to quarter speed and the coach shows the swipe that punches it ("Iron Fist: swipe up to punch the monster!"), with the finger on the block that would land it. The punch ends the tip (it waits 8 s at most).

**Balance** (`node tools/level-probe.mjs --seeds=192`, 192 bot games each; mean wave reached): 20.9 before levels; 25.1 with levels (26.2 for a bot that buys XP), about 2 of that from the no-2 rule. With a keepsake: Iron Fist 28.6 (the bot doesn't aim punches), Coin Purse 29.0, Spiked Collar 30.3, Lucky Clover 32.8, Phoenix Feather 26.3, Quake Boots 28.0.


## Run

```bash
npm install
npm run dev        # then open the printed URL
npm test           # 307 headless tests: 2048 rules, dice and classes, lane combat, economy, wave loop, spawn levels and keepsakes, photosafety, art gates
npm run build      # production bundle in dist/
```

URL flags: `?seed=123` replays a run; `?debug` starts with an awakened 16, a fused 256 and an ultimate 4096 in your deck's colours.

Controls: swipe (touch or mouse drag) or arrow keys / WASD. Tap a block to see its range (tap again to put it down). `1`/`2`/`3` pick a card when a new die unlocks. `F`, Space or the **Wave now** button skip the countdown to the next wave.

## How a run plays

1. **Prep.** 15 seconds and 80 coins before the first wave (or press **Wave now**). The next wave's lanes are telegraphed: their gates open and show the foes coming, and the brazier over each lane lights up.
2. **Waves.** Enemies spawn at the gates at the top, walk down their lane, through their board column and into the wall under the board. Each block fires by its class's range, target rule and pattern (see **Shooting** below), skipping enemies already doomed by shots in flight. Ultimates reach every lane. Enemies that reach the wall damage the castle (1,000 HP).
3. **Breaks.** Clearing a wave pays a bonus and starts a break to spend it: 14 s before wave 2, 2 s longer each wave, capped at 30 s from wave 10. **Wave now** skips it. A boss comes every 5th wave, through the gate with red banners; killing it promotes your biggest block one tier.

You lose when the castle falls.

### Economy

| | Coins |
|---|---|
| Start | 80 |
| Swipe | 5, +1 every 12 swipes. Only swipes that move something are charged |
| Kill | 4 + 1 × wave; bosses × 6 |
| Wave cleared | 15 + 3 × wave |
| 3 merges in one swipe | the swipe is refunded |
| Kill marked by Metal | +60% (+90% fusion, +120% as an ultimate's third element) |

Coins fly from each kill into the counter. When you can't afford a swipe the price tag turns red and the swipe is refused.

### Projection (`npm run economy`)

`tools/economy.mjs` projects the economy wave by wave: foes and HP, coins earned (every foe killed, bosses, clear bonus), what those coins buy at the rising swipe price, coins left unspent, the board that many swipes builds (top block, including boss promotions) and a pressure figure (wave HP ÷ board damage per second × time on the field). Options: `--pace` (swipes per second the player manages, default 0.6), `--metal` (share of kills marked by Metal), `--set '{"ECONOMY":{...}}'` to try values without editing the config.

The economy is tuned so a player spends each wave's coins in the following break instead of banking them:

| Wave | Income | Swipe price | Swipes that wave | Left after the break | Top block |
|---|---|---|---|---|---|
| 1 | 48 | 6 | 15 | 35 | 16 |
| 5 (boss) | 147 | 10 | 13 | 1 | 64 |
| 10 (boss) | 283 | 17 | 17 | 3 | 256 |
| 15 (boss) | 554 | 25 | 22 | 13 | 512 |
| 20 (boss) | 747 | 35 | 22 | 3 | 512 |
| 25 (boss) | 786 | 44 | 20 | 25 | 1024 |

The old values (kill 5 + 2 × wave, bosses × 12, clear 20 + 5 × wave, +1 per 15 swipes) paid about twice as much: 32,000 coins by wave 30 against 17,000 now. At 0.6 swipes/s, 250 coins sat unspent by wave 10 and nearly 1,000 by wave 20, because income outgrew the swipe price. Cutting income meant a smaller board, so enemy HP was eased to match (base 45 → 36, growth 15% → 12.5% per wave). In bot runs the castle still falls around wave 21–22, whether the bot swipes twice a second or once every 1.5 s.

Because most blocks cover only their own column's lane, the classic 2048 corner strategy stacks your firepower in one lane. Left and right swipes shift blocks between lanes, so you trade growth swipes against positioning swipes. Ranges also care about rows: a block's reach is measured from the block, so top-row blocks meet enemies as they enter the board and bottom-row blocks guard the wall.

## v2: eggs, pets, fusions and their skills

v2 (branch `v2`; v1 is kept as tag `v1-backup`) reworks the upgrade path. The contract is [docs/v2/SPEC.md](docs/v2/SPEC.md), and every call made without asking is in [docs/v2/DECISIONS.md](docs/v2/DECISIONS.md).

| Step | What happens |
|---|---|
| Elemental eggs | Some new blocks are **eggs of an element in your deck**, never more than one single egg or pet per element on the board. Every other block is a plain stone block that shoots pebbles from 16 on. |
| Hatching (16) | An egg hatches into its element's pet, which shoots its element's attack and grows to 128. |
| Fusion | Merge **two pets of different elements**: they become that pair's fusion pet at once. Its main element (its attack) is fixed per pet, so its picture, attack and skill always go together (v2.1). Both elements are freed, so their eggs can come again. |
| Feeding | A pet merged into a fusion, or two fusions merged (you keep one), adds **element buffs** to the fusion you keep: one stat per element (fire damage, ice slow, lightning fire rate, poison stacks, earth health, wind range, metal crits, nature healing). Each more copy of one buff gives 60% of the one before (v2.1). |
| Summon (1024) | A fusion at 1024 gets a namecard. When it is charged, tap it: the pet **hops out to the front for a few seconds and uses its own skill**, one of 28 (Frostfire Waltz, Railgun, Bog Web …). The tile keeps shooting meanwhile. |
| Pure form (4096) | A pet at 4096 becomes the **pure form of its main element**: it hits harder and gives every other pet its element's stat. |
| New elements | Levels 2, 4, 6, 8, 10 and 13 each offer a new element: pick 1 of 2. |

### v2.1: every pet has a weakness, and the siege ramps up

v2.1 (branch `v2.1`; v2 is kept as tag `v2.0`) is a rebalance; its contract is [docs/v2/SPEC-v2.1.md](docs/v2/SPEC-v2.1.md).

- **Four strengths, two at most:** an attack can reach **far**, hit other **lanes**, hit an **area**, or **chain**. The main element sets the shape (fire area; ice far and lanes; lightning lanes and chain; poison, earth and nature lanes and area; wind far and area; metal lanes); the second element adds its effects, and a strength only while the shape has room, so every fusion has exactly two. The tile card shows them as icons, lit or dim.
- **Waves keep growing** in count all run, on every lane of a bigger board. From wave 10 a growing share of foes **resists the element that has dealt the most damage lately** (from wave 20 also the second; bosses from 15), and wears a shield in its colour.
- **The ramp:** from 8 minutes foes get tougher every second (health × e^(2·(m−8)²), bites more), and from 10 minutes each wave also needs a set number of seconds of the board's whole firepower, ×4 a minute. Runs end between 8 and 12 minutes (`tools/v21-probe.mjs`: median 9.5).
- **Stat icons** (`src/ui/icons.js`) replace the stat words on the cards, the tile card and the banners.

The skills' numbers live in `src/sim/skills/data.js`, their words (English and Vietnamese, in the shape of a League of Legends tooltip) in `src/i18n/skills-*.js`, and their code in `src/sim/skills/<first element>.js` through the kit (`src/sim/skills/kit.js`). Useful tools:

- `node tools/skill-matrix.mjs vi` prints the skill matrix in Vietnamese (`en` for English).
- `node tools/skill-gauntlet.mjs` scores every skill against one standard wave (damage, kills, holds, blocks saved), to keep them even.

## Dice and classes (v1, kept for reference)

Elements are dice. **Every new block spawns in the colour of a random die from your deck.** When two blocks merge, **the block that slides in sets the colour**: its class overrides the one it slid into. Swipe left and the right block slides into the left one, so the right block's colour wins; swipe the other way and the other colour wins.

| Stage | When | What the merged block gets | Effect |
|---|---|---|---|
| — | below 16 | The sliding block's colour | Dormant: a pale block firing plain shots in its colour |
| 1 | 16 | The sliding block's element awakens | The element's attack and status; full colour and a glow |
| 2 | 256 | The sliding block's element **+ the element of the block it slid into** | A named fusion with **both** effects, each ×1.5; damage = the higher of the two ×1.25; the block splits into both colours (e.g. Fire sliding into Ice = Blue Flame) |
| 3 | 4096 | The sliding block's fusion + one more element from the block it slid into | An ultimate: the third element's effects ×2, damage ×1.6, plus a periodic field-wide signature; gold border and a charge ring |

Same colours don't fuse: a Fire 128 sliding into a Fire 128 makes a single-element Fire 256, and its fusion slot fills on a later merge with a different colour. A block whose slots are full simply overrides the block it slides into. A boss promotion that lifts a block to 16 awakens it; fusion slots only fill through merges. Each new class is announced with a pop-up naming what combined and what it became.

**Unlocking dice.** You start with 4 random dice of the 8, shown as the deck row under the board. The first time your top block reaches **64**, **256** and **512**, you pick one of up to three dice you don't own (the run pauses for the card), and new blocks can spawn in its colour from then on.

### Elements

| Die | Attack | Damage per shot | Fire rate | Effect |
|---|---|---|---|---|
| Fire | Flame Burst | ×0.4 per fireball | 0.9 bursts/s | Burn: 32% of the hit per second per stack, up to 3 stacks, 3 s |
| Ice | Frost Lance | ×1.5 | 0.6 | Slows 35% for 2 s; every 4th hit freezes 1 s; frozen foes take +25% |
| Lightning | Chain Spark | ×0.85 | 0.85 | Instant; arcs to 2 more foes (−20% per jump), crossing into neighbouring lanes |
| Poison | Seeker Dart | ×0.7 | 1.1 | Poison: 18% of the hit per second per stack, up to 6 stacks, 5 s |
| Earth | Boulder Mortar | ×1.8 | 0.6 | Splash (radius 1.3) for 60%; knocks foes back toward the portal |
| Wind | Gale Blade | ×0.85 per foe | 0.8 | Hits every foe the blade passes; slows 20% |
| Metal | Coin Sniper | ×1.1 | 0.9 | Marks foes for 3 s: a marked foe drops +60% coins when it dies (its own killing blows count) |
| Nature | Seed Spread | ×0.5 per seed | 1.0 | 15% chance per volley to heal the castle by 5 |

### Shooting

Reach is measured up and down the lane from the block itself. The lane is about 17 units long: 8 of field above the board, then the board, then the wall. Nature's range is instead a circle around the block, so only blocks in the top rows reach up into the field.

| Die | Reach | Lanes | Targets | Pattern |
|---|---|---|---|---|
| Fire | 4 | own | front-most | 3 fireballs, 0.1 s apart |
| Ice | 7 | own | strongest (most HP) | one heavy, slower lance |
| Lightning | 5.5 | own + both neighbours | front-most | instant bolt, then 2 chain jumps |
| Poison | 6.5 | own + both neighbours | unpoisoned first | homing dart that leaves at an angle and curves in |
| Earth | 4.5 | own | biggest crowd | mortar: a boulder lobbed (0.75 s) to where the foe will be, splashing on landing |
| Wind | 8 | own | front-most | a blade launched from the block that sweeps its lane toward the target, hitting each foe once |
| Metal | 8 | own | weakest (finishes kills) | a very fast round (3× speed) |
| Nature | circle, radius 6.5 | any | front-most | 3 seeds at different foes |
| Plain (below 16) | 5 | own | front-most | one pebble in the die's colour |

Fusions use the first (sliding) element's pattern, target rule and fire rate, take the longer reach and wider lane cover of the two, carry both elements' effects, and hit ×1.25 harder per shot (ultimates ×1.6 more).

Metal and Earth, Wind and unclassed blocks deal physical damage (reduced by armour). Fire foes can't burn and take +50% from Ice.

### Fusions (28)

|  | Ice | Lightning | Poison | Earth | Wind | Metal | Nature |
|---|---|---|---|---|---|---|---|
| **Fire** | Blue Flame | Plasma | Brimstone | Magma | Inferno | Forge | Wildfire |
| **Ice** |  | Cryo Arc | Venom | Glacier | Blizzard | Cold Iron | Frostbloom |
| **Lightning** |  |  | Toxic Shock | Thunderquake | Storm | Railgun | Thunderbloom |
| **Poison** |  |  |  | Swamp | Miasma | Corrosion | Nightshade |
| **Earth** |  |  |  |  | Sandstorm | Ironstone | Overgrowth |
| **Wind** |  |  |  |  |  | Bladewind | Pollenstorm |
| **Metal** |  |  |  |  |  |  | Harvest |

A fusion carries both elements' effects. The projectile takes the first element's shape in the second element's colour (Fire then Ice fires blue fireballs).

Each fusion is also a hero pet of its own: one animal with its own silhouette, the two parents shown in its markings and colours, not in its body (`src/art/fusion-roster.js`, designed in `reports/art/fusion-matrix/`). The pet's name is on its namecard; the fusion's name above is its skill.

|  | Ice | Lightning | Poison | Earth | Wind | Metal | Nature |
|---|---|---|---|---|---|---|---|
| **Fire** | Novakit, red panda | Zapcinder, mantis shrimp | Embertoad, fire-bellied toad | Magmole, mole | Flarewhirl, dragonfly | Anviljaw, crocodile | Emberhopper, locust |
| **Ice** |  | Sparkfrost, narwhal | Frostjelly, jellyfish | Tundrock, mammoth | Flurrin, snow lamb | Rimeplate, walrus | Frostpetal, reindeer fawn |
| **Lightning** |  |  | Fizzlebolt, platypus | Rumblebolt, wild boar | Gustbolt, jackrabbit | Voltgild, chameleon | Zaplily, orchid mantis |
| **Poison** |  |  |  | Bogling, bog spider | Mistmaw, pufferfish | Rustclaw, scorpion | Nightling, slow loris |
| **Earth** |  |  |  |  | Dunepuff, camel | Ironclod, rhinoceros | Mossbara, capybara |
| **Wind** |  |  |  |  |  | Whirlblade, sickle weasel | Pollenpuff, sugar glider |
| **Metal** |  |  |  |  |  |  | Sproutgear, beaver |

### Ultimates (by third element; v1 only, v2 has the pure forms)

| Third die | Ultimate | Signature |
|---|---|---|
| Fire | Sun | Every 2 s, burns every foe on the field |
| Ice | Timestop | Every 10 s, freezes every foe for 2.5 s |
| Lightning | Tempest | Every 1.5 s, strikes 3 random foes for 120% |
| Poison | Plague | Every second, poison jumps to nearby foes |
| Earth | Meteor | Every 5 s, a meteor hits the biggest crowd for 400% |
| Wind | Vortex | Every 8 s, blows every non-boss foe 3 units back up its lane |
| Metal | Midas | Every 4 s, gilds every foe on the field (each drops bonus coins) |
| Nature | Lifebloom | Every 6 s, heals the castle by 40 |

## Enemies: an animal army

Every enemy is one animal with its own silhouette (`src/art/foe-roster.js`). The pipeline generates each one inside its silhouette contract and gates it against look-alikes (`tools/silhouette-check.py`; see `reports/art/visual-overhaul/proposal.md`, section 7). The 28 fusion pets are made the same way, with the heroes' cream rim, and gated against each other, every foe and the base pets (`reports/art/fusion-matrix/pipeline-plan.md`).

| Chapter (10 waves each, then loop) | Enemies | Boss |
|---|---|---|
| Eternal Forest (the Wild Hunt) | Moonmoth, Dormouse, Shield Beetle, Gillnewt, Horned Owl, Ember Salamander (fire) | Hive Queen: heals nearby allies |
| Fareast Kingdom (the Paper Court) | Nightfox, Pangolin Guard (30% physical RES), Cymbal Macaque, Moonmoth | Pagoda Crab: 50% physical RES, releases kite carps when it falls |
| Dragon Peaks (the Ember Peaks) | Crag Ibex, Crag Wyvern, Cinder Bat (fire), Magma Snail (fire) | Lava Wyrm: fire, 20% physical RES |

## What you see

- Blocks are bevelled, coloured by tier (plain) or element (classed), with element icons, a glow for classes, recoil and a muzzle spark on every shot.
- The field is a siege: a stone keep around the board, towers left and right, a gate arch at the top of each lane (an open gate shows the next wave's foes), cobbled lanes with a tick per cell, hedges between them, and a parapet whose braziers light over the lanes under attack. Each chapter has its own skin and painted backdrop (`src/render/frame.js`).
- Attacks are generated sticker sprites with trails (`src/art/attack-vfx.js`): Ember Breath's flame tongue, the ice harpoon on its tether, bolt-link chains, venom globs that leave a puddle, quake cracks, gust ribbons, claw slashes and bramble arcs, with element impacts and ground marks. Each block size adds one visible thing to its attack (16, 32–64, 128, a 256 fusion, a 4096 legend), and the pet winds up before it fires. Fusions take the first element's shape in the fusion colour plus the second element's add-on.
- Tap a block to see its range: outlined bands over the lanes it covers, from its reach above the block to its reach below, or Nature's circle.
- Monsters show an HP bar (bosses also show the number) and status badges with stacks: burn ×n, poison ×n, chill −%, freeze seconds. Burning monsters shed embers, poisoned ones bubble, chilled ones turn blue, frozen ones sit in an ice block. Burn and poison ticks print their own orange and green numbers.
- Hits print damage numbers. Nothing on the field is additive, and every flash stays photosafe (`docs/ux/photosafe.md`).
- Kills print a gold `+N` and drop spinning coins that fly into the coin counter. A leak flashes that lane's section of the wall red and shakes it.
- Dormant blocks (below 16) are a pale version of their die colour; awakened blocks are full colour with a glow. A merge that awakens, fuses or ascends a block announces the combination; when an awakened block overrides a different colour, a small `Fire over Ice` pop-up shows which colour won. Metal-marked foes carry a coin badge (`+60`); Nature heals print a green `+N` on the wall.

## Key visual demo (`?kv`)

The art direction from `reports/Art style for 2048 Siege pets.md`, running in the real game:

- `http://localhost:5176/?kv` (sticker map, recommended), `?kv&style=pixel` (pixel map for comparison), `?kv&style=classic`; the switcher on the left changes it live.
- `kv-compare.html`: both maps side by side, same seed, so the board and waves match frame for frame.
- `art.html`: every creature in every style (the art sheet).
- `2048-siege-kv.html` (from `npm run pack`): the demo as one file you can send.

Three art layers, one design per creature: **map tiles** (16 to 128: the number on top, the baby peeking over the bottom edge, one motif piece per merge; 2/4/8 are eggs that crack), **roaming fusions** (at 256 the fusion hops out and roams the field its own way, walking, crawling, hopping, hovering, swimming or floating, and shoots from where it stands; its tile stays as a den with a split plate and both glyphs), and **namecards** (the fusion's own baby sticker on a flat 2D plate, so the card and the pet are one drawing; tap a ready card to cast its skill: an area hit with all its element effects). Legendaries glide, wear gold and carry their apex halo. The showcase board holds every element at a different stage; blocks don't die and the next wave starts 2 s after a clear.

All creatures are drawn in code (`src/art/creatures.js`) from the style brief, as stand-ins until generated art replaces them through the same layers (`src/art/index.js`). Code: `src/art/` (tokens, glyphs, creatures, texture provider), `src/kv/` (roaming, namecards, mode setup), plus small hooks in `blocks.js`, `defense.js` (`tile.roam`, `cast`) and `run.js` (`castSkill`).

## Art: Gemini sprite generation

```bash
npm run assets                      # generate missing sprites
node tools/gen-assets.mjs --force   # regenerate all
node tools/gen-assets.mjs --only=enemy.pixie,proj.fire
npm run gemini:status               # this week's spend against the budget
npm run gemini:probe                # one tiny image: does the key have paid image access?
```

The script reads `GEMINI_API_KEY` from the environment or `.env.local` (git-ignored), generates each sprite in `tools/assets.config.mjs` on a flat chroma background with `gemini-nano-banana-2.1` (set `GEMINI_IMAGE_MODEL` for another, e.g. `gemini-3-pro-image`), removes the background (`tools/chroma.py`, needs Python with Pillow and numpy), and writes `public/assets/*.png` plus `public/assets/manifest.json`. The game loads the manifest at startup and uses a generated sprite wherever one exists (enemies, single-element projectiles), keeping procedural art elsewhere. Raw images are cached in `tools/.cache/raw` so `--rekey` can redo background removal without new API calls.

**Budget guard.** Every generated image is logged with its estimated cost (`tools/.cache/gemini-usage.json`). Generation warns and stops once the rolling 7-day spend reaches 80% of the weekly limit in `tools/gemini-budget.json` (default $58.33/week: the Tier 1 $250 billing cap spread over a month; an image-count limit can be set too). A 429 (quota, spend cap or free-tier key) stops the run rather than switching models mid-set. A stop writes `tools/.cache/GEMINI-BUDGET-STOP.txt`. As of 2026-10-14 the key in use is still on the free tier (image quota 0): enable billing on its AI Studio project, then create a new key.

## Structure

| Path | Role |
|---|---|
| `src/config.js` | All tunables: grid, lanes, castle, enemy HP and speed, turret damage, projectile speed, and the `ECONOMY` block (coins, swipe price, rewards, timers) |
| `src/sim/grid.js` | Classic 2048 board: slide, merge once per move, spawn, lock detection, promote, remove |
| `src/sim/classes.js` | Dice (elements), fusions, ultimates, the merge rule (mover overrides, stage slots fill from the stayer), new-die offers, attack profiles |
| `src/sim/enemies.js` | Enemy roster, chapters, deterministic waves with their lanes |
| `src/sim/defense.js` | Lane movement, statuses, per-lane targeting, projectiles, chain/splash/pierce, signatures, castle |
| `src/sim/run.js` | Real-time loop (prep, waves, breaks) tying board and defense; coins, swipe price; the deck (spawn colours) and unlocks; boss rewards; lock warning; spawn XP and levels; the keepsake's rules |
| `src/sim/levels.js` | The level road: 20 levels, their rewards and minutes, the odds per level, XP costs, the no-2 rule |
| `src/sim/keepsakes.js`, `src/sim/punch.js` | The six keepsakes and their numbers; Iron Fist's slide paths and punch targets |
| `src/ux/meta.js` | The record across runs (`siege:meta`): biggest block ever, keepsake to bring, run count |
| `src/render/*` | PixiJS: stage/layout, scenery (lanes, portals, wall, tray), the deck row (`deck.js`), blocks, monsters (`foes.js`), projectiles (`shots.js`), effects incl. flying coins (`fx.js`), procedural art and generated-sprite loading (`textures.js`) |
| `src/ui/*` | DOM HUD: score, top block, wave/countdown/castle, coin bar with swipe price, Wave now button, new-die cards, class announcements, banners, game over; the Lv and keepsake discs with their cards (`run-badges.js`) and the keepsake picker (`keepsake-picker.js`) |
| `src/main.js` | Wiring, fixed-step loop, event-driven effects, tap a block to see its range; `window.__mb` exposes `run`, `restart()`, `advance(s)`, `spawn(tier, col, row)`, `coins(n)` |
| `tools/*` | Gemini sprite pipeline; `economy.mjs` economy projection (`npm run economy`); `level-probe.mjs` bot balance for spawn levels and keepsakes |
| `test/*` | Headless tests for every sim module |
| `legacy/*` | Earlier prototypes: the physics ball crate and the three.js 3D renderer (`npm run test:legacy`) |

Everything in `src/sim` is pure and deterministic: a seed plus the same inputs replays the same run.

## Prototype defaults to revisit

- **The level road's minutes are the bot's.** `LEVEL_ROAD` holds when the autoplay bot reaches each level (its median over 96 games); a human who swipes slower levels later. XP costs and the ramp are in `LEVELS.xpToNext` and `V2_1.ramp`; re-run `node tools/v21-probe.mjs` after changing them.
- **Five of the six keepsakes are mine;** only Iron Fist came from the brief. Unlocks follow the bot's top-block rates (128 in 90% of games, 2048 in 10%), so a new player gets a second keepsake in the first run or two.
- **Iron Fist's punch** reaches 1.25 past the block's new cell (a biting monster stands 1.15 from the block) and 0.9 to each side (the next column is safe); it uses the block's base hit (`turretDamage`), and physical resistance applies.
- **Keepsakes can't be swapped mid-run** (Hades allows it between regions with an upgrade).

- **Lane cover:** Fire, Ice, Earth, Wind, Metal and plain blocks hit only their own column's lane; Lightning and Poison also reach the neighbouring lanes; Nature reaches a circle around the block (radius 6.5); ultimates reach everything.
- **Short reach** (Fire 4, Earth 4.5) only fires at foes near the block: put it in the top row to meet them early, or the bottom row to guard the wall.
- **Waves wait for the field to clear** before the break starts, rather than arriving on a fixed clock.
- **No selling** (siege): a locked board waits for a block to be destroyed or promoted; a locked board is not a loss.
- **Balance** was tuned in two steps: `npm run economy` for the coin curve (no carry-over between waves, about 12 swipes per wave early and about 20 late), then a headless bot for difficulty. The bot swipes when it can afford to, prefers boards with firepower under the telegraphed lanes, sells its smallest block when locked, takes the first die offered and presses Wave now once broke. Castles fall around waves 15–26, averaging 21–22 at both fast and human pace. Nature was cut from 20%/10 HP to 15%/5 HP after one run out-healed every leak.
- **The starting deck is random** (4 of the 8 dice), and spawned blocks pick a deck colour at random with equal odds.
- **Below 16 a block's colour is dormant:** it shows its die colour and fires plain shots in it; the element's attack starts at 16.
- **The bot ignores colours**, so its fusions come late (around waves 10–20); a player steering colours should do a little better than its average of wave 20.
- **Classes never block merges**; the older block's class wins.
- **Boss abilities** beyond Slime Legion's intro cards (heal, resistances) are invented.
