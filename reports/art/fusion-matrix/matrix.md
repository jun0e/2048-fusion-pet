# The fusion matrix: 28 fusion pets as 28 animals

2026-10-16 · art direction (the AAA graphics-builder method, translated to 2D sticker art) · **a proposal for the user's check; no images were generated and the pipeline was not run.**

Open the matrix at `http://localhost:5177/reports/art/fusion-matrix/matrix.html` (the dev server on 5177 serves this worktree). It is self-contained: the silhouettes, the base pets' sprites, today's fusion sprites and the foe contracts are embedded, with no external files or libraries.

## 1. What this is

The 28 fusions ship today as "parent A's adult body plus one part of parent B": every fire fusion is a dragon with an add-on, every ice fusion an orca, and the closest-twin silhouette overlap at 40 px has a median of **0.79** (max 0.82; the table in the appendix). The build plan's P-F finding showed why body plans cannot fix that: the 12 plans in `src/art/bodyplans.js` leave 44–61 pairs above 0.65, because fusions that share a plan sit at about 0.9. So each fusion needs its own animal and its own silhouette, the way the 17 foes got theirs.

This matrix does for the pets what proposal section 7 did for the foes: one real species (or one folklore creature that is not a franchise lookalike) per fusion, chosen so it reads as the union of both elements; one solid-black silhouette contract per fusion in a flip-safe view; a palette built from the fusion's own colour plus both parents' accents; and the twin test, measured, against the other fusions, the 17 foe contracts and the 8 base pets. Pets keep the hero cue (the plum outline, the cream sticker rim, bright colours); the foes stay muted and rimless.

Rules I held to:

- **Unique animal type.** No animal repeats a foe (moth, dormouse, beetle, axolotl, owl, salamander, hive-queen bee, fox, pangolin, macaque, carp kite, crab, ibex, wyvern, bat, snail, wyrm) or a base pet (dragon, bird of prey, turtle, orca, snake, unicorn, lion, ox), and no two fusions share one. Insects, fish and mammals are mixed so the 28 do not become 28 quadrupeds.
- **The union of both elements**, with a one-line "why" that a player would accept (the narwhal is the unicorn of the sea; the platypus senses electricity and carries venom; the kamaitachi is the sickle weasel that rides whirlwinds).
- **Silhouette first.** Each contract is a different body plan: an upright stander, a boxer, a splat, a molehill pop-up, a cross, a bell, a star, a spiked ball, a stilt-legged cloud, a branch clinger, a spy-hop, a diagonal dive, a crescent leap, a square sail, and so on. The twin test, not taste, decided when a shape had to change (section 4).
- **Flip-safe views only**: a strict profile facing left, or a symmetric front or spread view, because the renderer mirrors a pet by its direction (the ghost triangle of the matrix shows every silhouette mirrored).
- **Names.** 22 pet names stay. Six are proposed because the old name names the wrong animal (`Smogpup` and `Anvilpup` are dogs, `Rustgrub` a larva, `Mossbun` a rabbit, `Frostfang` and `Embersprout` fit less well); the old names are listed beside them and can stay.

## 2. Files

| File | What |
|---|---|
| `matrix.html` | The 8×8 matrix. Rows are element A, columns element B, in `ELEMENT_KEYS` order. The upper triangle holds each fusion (silhouette tinted in its dominant colour, pet name, animal, the six palette swatches, its pass flag); the lower triangle ghosts it mirrored; the diagonal shows the eight base animals with their current `pet.<el>.128` sprites. Click or tap a cell for the brief: why, body plan and pose, the prompt's creature line, what each parent gives, the palette with hexes, the figure-ground table, the twin cards (closest fusion, closest foe contract, closest base pet, each pictured), the IP note, the fallback animal, and today's sprite beside the new silhouette. The toolbar tints the silhouettes in colour or ink, puts the grid on the cream, the lane or the keep floor, shrinks the silhouettes to 40 px (the on-screen size), mirrors them, and hides the names. Below the grid: the 40 px line-up with the base pets on the lane and on the keep, and the 28×28 overlap heat map. |
| `silhouettes.svg` | The 28 symbols (`sil-<a>-<b>`, a 120 px box, ground at y = 104, facing left) laid out as a sheet with a 40 px copy of each, drawn with the same primitive subset as the foe sheet (circle, ellipse, polygon, M/L/C/Z paths, stroked paths) so the foe rasteriser makes the contracts. |
| `contracts/sil-<a>+<b>.png` | The 28 black-on-white contracts, 512 px, the foe contracts' format; they move to `tools/refs/fusions/` after approval. |
| `fusion-roster.json` | Per fusion: key, skill name, pet name (today's and the note), animal, species, kind, body plan, view, move, pose in words, description (the prompt's creature line), why, the parents' features, the palette (dominant, shade, light, accent A, accent B, extra), the IP note and the fallback animal; plus the universal colours. |
| `twin-test.json`, `palette-check.json` | The numbers behind sections 4 and 5. |
| `tools/make-contracts.py`, `tools/twin-test.py`, `tools/palette-check.py`, `tools/build-matrix.py`, `tools/fill-tables.py` | The chain that makes everything above from the SVG and the JSON: `/usr/bin/python3 tools/make-contracts.py && /usr/bin/python3 tools/twin-test.py && /usr/bin/python3 tools/palette-check.py && /usr/bin/python3 tools/build-matrix.py && /usr/bin/python3 tools/fill-tables.py`. |
| `pipeline-plan.md` | What to run after approval: jobs, references, the contract, the gates, the portraits, the image count and the list price. |

## 3. The roster

Body plan is the silhouette family; view is the flip-safe drawing (profile = side view facing left; front = symmetric, facing the camera; spread = seen from above, symmetric). Bold names are the proposed renames.

<!-- roster-table -->
| # | Key | Pet (today) | Skill | Animal | Body plan | View | Why |
|---|---|---|---|---|---|---|---|
| 1 | `fire+ice` | Novakit | Frostnova | red panda | upright stander | profile | The red panda is a flame-coloured animal that lives in Himalayan snow: fire and ice in one body. The ember tail rings are the burn, the frost mask and snow-dusted ears are the chill. |
| 2 | `fire+lightning` | Zapcinder | Plasma | peacock mantis shrimp | boxer | profile | Its punch is so fast the water boils into a flash of light and heat, a real spark of plasma, and the peacock mantis shrimp is the hottest-pink animal alive: fire's heat and lightning's flash in one strike. |
| 3 | `fire+poison` | **Embertoad** (today Smogpup) | Brimstone | fire-bellied toad | splat | front | The fire-bellied toad flashes a flame-red belly to warn that its skin is toxic: fire and poison are one display. The burn is the belly, the poison is the warts. |
| 4 | `fire+earth` | Magmole | Magma | mole | molehill pop-up | front | A mole digs through the earth; this one digs through magma. The rock crust on its back is the earth, the lava seams between the plates and the glowing claw tips are the fire. |
| 5 | `fire+wind` | Flarewhirl | Inferno | flame skimmer dragonfly | thin-bodied four-wing flier | spread | The flame skimmer is a real dragonfly named for its fire colour, and a dragonfly is wind itself: a darter that rides gusts and makes them. The ember wing tips are the burn, the mist-white wing fields are the gust. |
| 6 | `fire+metal` | **Anviljaw** (today Anvilpup) | Forge | crocodile | long low jaws | profile | A crocodile's armour is forge work: bronze scutes baked hot in the sun and jaws that close like an anvil. The plates are the metal, the heat and the glow between the jaws are the fire. |
| 7 | `fire+nature` | **Emberhopper** (today Embersprout) | Wildfire | locust | chevron-legged hopper | profile | A locust swarm crosses a field the way wildfire does, and it is lime-and-ember like a grassfire: nature's field and the fire that races over it. The ember hind legs are the burn, the leaf-green body the thorns and regrowth. |
| 8 | `ice+lightning` | Sparkfrost | Cryo Arc | narwhal | spy-hop | front | The unicorn of the sea: an arctic whale whose spiral tusk is a unicorn horn. The whale is the ice, the tusk is the lightning rod that the Horn Arc leaps from. |
| 9 | `ice+poison` | **Frostjelly** (today Frostfang) | Venom | lion's mane jellyfish | bell with a fringe | front | The lion's mane jelly is the biggest jellyfish and lives in cold arctic water; its sting is the venom. A frost cloud with a poison fringe that drifts over the field. |
| 10 | `ice+earth` | Tundrock | Glacier | woolly mammoth | domed heavy quadruped with tusks | profile | The mammoth is the ice age itself: a shaggy mountain with tusks of frozen ivory. Earth's heavy stomp in an ice animal; the stone plates on its hump are the quake, the frost tusks the chill. |
| 11 | `ice+wind` | Flurrin | Blizzard | snow lamb | cloud on stilts | profile | A lamb's fleece is a cloud, and in winter wool it is a snow cloud: a blizzard on four legs. The cloud is the wind, the wool is the snow. |
| 12 | `ice+metal` | Rimeplate | Cold Iron | walrus | hauled-out blob with tusks | profile | A walrus hauled out on the ice: its tusks are cold ivory, the game's iron, and its blubber is armour plate. The ice plates on its back are the chill, the gold-tipped tusks the killing bite. |
| 13 | `ice+nature` | Frostpetal | Frostbloom | reindeer fawn | stilt-legged with antlers | profile | The reindeer is the forest's winter animal, and antlers are the branches that grow and shed like a plant; here they bloom with frost flowers. The antlers are the brambles and the regrowth, the frost is the freeze. |
| 14 | `lightning+poison` | Fizzlebolt | Toxic Shock | platypus | diagonal dive | profile | The platypus senses electricity with its bill and carries a venom spur: the one animal that is lightning and poison at once. The bill is the chain, the spur is the puddle. |
| 15 | `lightning+earth` | Rumblebolt | Thunderquake | wild boar | wedge charger with a crest | profile | A boar's charge is an earthquake and its bristle ridge is a bolt; it roots up the earth with lightning tusks. The crest is the chain, the stomp and the mud are the quake. |
| 16 | `lightning+wind` | Gustbolt | Storm | jackrabbit | stretched leaper | profile | The jackrabbit bolts across the plain: lightning speed, its ears cutting the wind, kicking up gusts behind it. The zigzag ear edges are the chain, the leap is the gust that pushes foes back. |
| 17 | `lightning+metal` | Voltgild | Railgun | chameleon | coil-tailed sniper | profile | A chameleon's tongue fires in a hundredth of a second: a bolt from a railgun. Its skin shifts to a gilded metal sheen. The tongue is the chain to the nearest foe, the gold is the coin bite. |
| 18 | `lightning+nature` | Zaplily | Thunderbloom | orchid mantis | upright stick insect | profile | The orchid mantis is an insect disguised as a flower (a bloom) whose strike is the fastest thing in the garden (the lightning). The strike is the bolt, the petals are the brambles. |
| 19 | `poison+earth` | Bogling | Swamp | bog spider | eight-legged star | front | A trapdoor spider digs its burrow into the bog and bites with venom: the earth's ground and the poison's puddle. The mud bands on the legs are the quake, the fangs the weakening venom. |
| 20 | `poison+wind` | Mistmaw | Miasma | pufferfish | spiked ball | profile | A puffer gulps air to puff up (the wind) and its body is a toxin (the poison): a floating cloud of miasma with a maw. The puff is the gust that pushes, the spikes carry the venom. |
| 21 | `poison+metal` | **Rustclaw** (today Rustgrub) | Corrosion | scorpion | pincers front, tail over the back | profile | A scorpion's shell is forged armour and its pincers are tongs; its sting is an acid that eats through anything: corrosion. The gold plates are the metal, the venom drop is the poison. |
| 22 | `poison+nature` | Nightling | Nightshade | slow loris | branch clinger | profile | The slow loris is the only venomous primate: it licks a toxin gland on its elbow and bites, and it comes out at night in the trees. The elbow glands are the poison, the branch and the leaf are the brambles. |
| 23 | `earth+wind` | Dunepuff | Sandstorm | Bactrian camel | tall two-humped walker | profile | A camel walks through sandstorms with its nostrils shut: its humps are dunes and its fur is sand blown into tufts. The humps are the quake's weight, the wind tufts are the gust. |
| 24 | `earth+metal` | Ironclod | Ironstone | rhinoceros | barrel with a nose horn | profile | A rhino is a walking boulder in iron plates with a horn of stone: earth's weight and metal's armour. The plates are the coin bite's armour, the stomp is the quake. |
| 25 | `earth+nature` | **Mossbara** (today Mossbun) | Overgrowth | capybara | blunt-headed barrel | profile | The capybara sits in the mud and lets anything grow on it: a mossy hillside that walks. The mud and the stone-still calm are the earth, the overgrowth on its back is the nature. |
| 26 | `wind+metal` | Whirlblade | Bladewind | kamaitachi (sickle weasel) | arched leaper with sickles | profile | The kamaitachi of Japanese folklore is a weasel that rides whirlwinds and cuts with sickle claws: wind and blade in one creature, and a folk animal rather than a franchise design. The whirl is the gust, the sickles are the killing bite. |
| 27 | `wind+nature` | Pollenpuff | Pollenstorm | sugar glider | square-sailed glider | spread | A sugar glider sails between blossoms on a skin sail and carries pollen in its fur: a flying pollinator. The sail is the gust, the pollen dust is the bloom's regrowth. |
| 28 | `metal+nature` | Sproutgear | Harvest | beaver | round sitter with a paddle | profile | The beaver is nature's engineer: it harvests timber with chisel teeth and builds with wood and mud. The gold teeth and the amber coat are the coin bite, the sprout and the timber are the regrowth. |
<!-- /roster-table -->

What the matrix is for, cell by cell: the rows and columns are the eight elements, so the first glance checks that every fire fusion is no longer a dragon (a red panda, a mantis shrimp, a toad, a mole, a dragonfly, a crocodile, a locust) and every ice fusion no longer an orca (a narwhal, a jellyfish, a mammoth, a lamb, a walrus, a reindeer); the second glance, down a column, checks that the element B motif repeats across animals (every `+nature` pet carries a sprout, a leaf, a petal or moss; every `+metal` pet carries gold plates, teeth, sickles or a horn; every `+wind` pet a sail, a cloud or a puff).

## 4. Silhouette distinctness, measured

Method (the same as the foes', `tools/silhouette-check.py` and the proposal's Appendix B): each contract is trimmed to its bounding box, fitted into a 40 px square and compared by IoU with every other fusion contract, with the 17 foe contracts in `tools/refs/foes/sil-*.png` and with the 8 base pets' 128-stage sprites (`public/assets/gen/pet.<el>.128.png`, alpha masks), either way round (flip allowed). Targets: closest fusion ≤ 0.60, closest foe ≤ 0.65, closest base pet ≤ 0.65. `tools/twin-test.py` prints the table and writes `twin-test.json`; the page's heat map is the full 28×28 matrix.

<!-- twin-table -->
| Key | Animal | Closest fusion | Closest foe contract | Closest base pet | Pass |
|---|---|---|---|---|---|
| `fire+ice` | red panda | 0.49 Frostjelly | 0.49 snail | 0.59 earth | yes |
| `fire+lightning` | peacock mantis shrimp | 0.42 Sproutgear | 0.48 axolotl | 0.33 earth | yes |
| `fire+poison` | fire-bellied toad | 0.48 Magmole | 0.53 pangolin | 0.43 fire | yes |
| `fire+earth` | mole | 0.58 Rumblebolt | 0.62 snail | 0.60 fire | yes |
| `fire+wind` | flame skimmer dragonfly | 0.43 Frostjelly | 0.32 moth | 0.35 metal | yes |
| `fire+metal` | crocodile | 0.49 Emberhopper | 0.53 kitecarp | 0.30 lightning | yes |
| `fire+nature` | locust | 0.49 Anviljaw | 0.52 fox | 0.35 fire | yes |
| `ice+lightning` | narwhal | 0.40 Bogling | 0.41 macaque | 0.37 lightning | yes |
| `ice+poison` | lion's mane jellyfish | 0.49 Novakit | 0.39 ibex | 0.62 metal | yes |
| `ice+earth` | woolly mammoth | 0.56 Dunepuff | 0.51 snail | 0.61 fire | yes |
| `ice+wind` | snow lamb | 0.53 Tundrock | 0.52 moth | 0.60 nature | yes |
| `ice+metal` | walrus | 0.56 Ironclod | 0.64 dormouse | 0.54 fire | yes |
| `ice+nature` | reindeer fawn | 0.38 Zaplily | 0.30 ibex | 0.32 lightning | yes |
| `lightning+poison` | platypus | 0.47 Ironclod | 0.46 pangolin | 0.33 earth | yes |
| `lightning+earth` | wild boar | 0.58 Magmole | 0.60 hivequeen | 0.60 ice | yes |
| `lightning+wind` | jackrabbit | 0.47 Rumblebolt | 0.54 pangolin | 0.40 ice | yes |
| `lightning+metal` | chameleon | 0.43 Anviljaw | 0.44 pangolin | 0.32 fire | yes |
| `lightning+nature` | orchid mantis | 0.41 Dunepuff | 0.43 dormouse | 0.45 lightning | yes |
| `poison+earth` | bog spider | 0.51 Mistmaw | 0.49 pangolin | 0.42 fire | yes |
| `poison+wind` | pufferfish | 0.55 Ironclod | 0.60 pangolin | 0.53 fire | yes |
| `poison+metal` | scorpion | 0.44 Rimeplate | 0.46 salamander | 0.35 fire | yes |
| `poison+nature` | slow loris | 0.42 Pollenpuff | 0.47 dormouse | 0.48 lightning | yes |
| `earth+wind` | Bactrian camel | 0.56 Tundrock | 0.53 hivequeen | 0.51 earth | yes |
| `earth+metal` | rhinoceros | 0.56 Rumblebolt | 0.57 pangolin | 0.50 fire | yes |
| `earth+nature` | capybara | 0.52 Pollenpuff | 0.55 hivequeen | 0.62 fire | yes |
| `wind+metal` | kamaitachi (sickle weasel) | 0.29 Flurrin | 0.24 snail | 0.26 fire | yes |
| `wind+nature` | sugar glider | 0.54 Rumblebolt | 0.60 moth | 0.63 lightning | yes |
| `metal+nature` | beaver | 0.43 Mossbara | 0.48 wyrm | 0.47 poison | yes |
| **max / median** | | **0.58 / 0.49** | **0.64 / 0.50** | **0.63 / 0.46** | **28/28** |
<!-- /twin-table -->

**All 28 pass.** Against each other the worst pair is the mole and the boar at 0.58 (two low diggers; still under 0.60), against the foes the walrus and the dormouse at 0.64 (both a ball-headed blob low on the ground; under 0.65), against the base pets the sugar glider and the unicorn foal at 0.63 (a square sail against a chubby 3/4 foal; under 0.65). Today's sprites sit at 0.79 median among themselves and 0.77 against the base pets (they are the base pets with add-ons); the new set is 0.49 and 0.46.

How the shapes got there (three rounds; the first sketch of each animal is what a naive drawing gives, and the test is what moved them):

1. Round 1 (12 misses): the loaf family twinned: the rhino, the boar, the mole, the walrus, the mantis shrimp, the toad, the lamb, the puffer, the mammoth and the capybara were all "a low blob with a head bump at the left", so the 40 px fit made them one shape; the platypus and the glider were both a top-view oval with four limbs.
2. Round 2 (6 misses): the mole became a **molehill pop-up** (a wide mound, a round head, two spade paws spread); the mantis shrimp **rears into a boxer stance** (fan tail on the ground, body rising, clubs cocked high); the platypus went to a **profile**; the lamb's cloud is carried **high on stilts** (mass in the top half, the legs a pixel wide); the boar grew a **tall mane**; the rhino got a **long low body and a huge horn**; the mammoth **longer legs and a bigger tusk** (gaps under the belly and in front); the puffer **longer spikes** (a star beats a ball); the toad went **taller**.
3. Round 3 (1 miss): the narwhal **spy-hops** (vertical, the tusk pointing straight up: the lightning rod); the platypus **dives diagonally down-left** (the axolotl foe swims up-left, and a horizontal flip never turns an up diagonal into a down one); the toad tried a **throat sac** and then the **splat stance** (hind legs out sideways in a Z), which separates it from the round baby bird; the capybara stands **taller**; the boar's mane grew again; the puffer's spikes too.

Reading the remaining neighbours: the mole/boar pair (0.58) and the rhino/boar pair (0.56) are the three diggers of the earth column, all low with a feature on the head; they are apart on screen by the mound, the mane and the horn, but if the generated sprites drift toward each other the pick gate will say so, and the fallback is to raise the rhino's horn further or give the boar a rearing charge.

## 5. Palettes and figure-ground

Each fusion's palette is its gameplay colour `FUSIONS[k].color` as the **dominant** body colour, the **shade** and **light** tones `tokens.js` derives from it (`fusionPalette`), one accent from each parent's `ELEMENT_PALETTES` (**accent A**, **accent B**) and one **extra** accent (a second parent colour, usually the dark one), plus the universal plum outline `#2B1D2E` and the cream sticker rim `#FFFAF2` with black-and-white eyes. Five to seven colours per pet, as the brief asked; the sprites keep the rim.

`tools/palette-check.py` measures the dominant colour against the two grounds the pets roam over, the dark keep floor `#3E3C58` (L* 27) and the light lane `#D9C7A3` (L* 81): the WCAG contrast ratio, the L* difference, and, since the pipeline's figure-ground rule counts a body pixel as separated at ΔL* ≥ 20, which of the six palette colours separate on each ground and which one separates most (the **carrier**).

<!-- palette-table -->
| Key | Dominant | L* | Keep: ratio · ΔL* · carrier | Lane: ratio · ΔL* · carrier | Separating colours (keep / lane, of 6) |
|---|---|---|---|---|---|
| `fire+ice` | `#5B8CFF` | 60 | 3.33 · +33 · accentB `#DDF7FC` (+69) | 1.90 · -21 · shade `#456AC2` (-35) | 5 / 2 |
| `fire+lightning` | `#FF4FB8` | 62 | 3.55 · +35 · accentB `#FFE14D` (+63) | 1.79 · -19 · shade `#C23C8C` (-33) | 6 / 2 |
| `fire+poison` | `#D6452F` | 50 | 2.39 · +24 · accentB `#8FE53A` (+56) | 2.66 · -30 · shade `#922F20` (-46) | 5 / 2 |
| `fire+earth` | `#FF9F1C` | 74 | 5.13 · +47 · light `#FFDBA9` (+63) | 1.24 · -7 · accentB `#6B5848` (-42) | 5 / 2 |
| `fire+wind` | `#F24C00` | 56 | 2.92 · +30 · accentB `#D8FAF0` (+69) | 2.18 · -25 · shade `#A53400` (-42) | 5 / 2 |
| `fire+metal` | `#CD7F32` | 60 | 3.35 · +34 · accentB `#FFD84A` (+61) | 1.89 · -21 · shade `#9C6126` (-34) | 6 / 3 |
| `fire+nature` | `#D4E157` | 86 | 7.38 · +60 · light `#EFF4BF` (+68) | 1.16 · +5 · accentB `#3E9B47` (-24) | 6 / **1** |
| `ice+lightning` | `#00D2FF` | 78 | 5.85 · +51 · accentA `#DDF7FC` (+69) | 1.08 · -3 · extra `#3B3FE0` (-43) | 5 / 2 |
| `ice+poison` | `#7B61FF` | 52 | 2.51 · +25 · accentA `#9BE7F5` (+61) | 2.53 · -29 · shade `#5442AD` (-45) | 5 / 2 |
| `ice+earth` | `#9FC5E8` | 78 | 5.84 · +51 · light `#DBE9F6` (+65) | 1.09 · -3 · accentB `#9C8268` (-25) | 6 / 2 |
| `ice+wind` | `#E0F7FF` | 96 | 9.50 · +69 · light `#F3FCFF` (+72) | 1.50 · +15 · extra `#2F7A78` (-34) | 6 / **1** |
| `ice+metal` | `#7F9CB8` | 63 | 3.69 · +36 · accentA `#DDF7FC` (+69) | 1.72 · -18 · shade `#61778C` (-32) | 6 / **1** |
| `ice+nature` | `#7FFFD4` | 92 | 8.61 · +65 · light `#CEFFEF` (+70) | 1.36 · +11 · extra `#3E9B47` (-24) | 6 / **1** |
| `lightning+poison` | `#C6FF00` | 93 | 8.89 · +67 · light `#E9FF9E` (+70) | 1.40 · +12 · extra `#3A1660` (-64) | 5 / 2 |
| `lightning+earth` | `#B8860B` | 59 | 3.24 · +33 · accentA `#FFE14D` (+63) | 1.96 · -22 · extra `#3B3029` (-60) | 4 / 4 |
| `lightning+wind` | `#9FA8FF` | 71 | 4.78 · +45 · accentB `#D8FAF0` (+69) | 1.33 · -10 · extra `#2F7A78` (-34) | 6 / 2 |
| `lightning+metal` | `#FFD700` | 87 | 7.52 · +60 · extra `#FFF7D1` (+70) | 1.18 · +6 · accentB `#9C6410` (-34) | 6 / 2 |
| `lightning+nature` | `#A8E063` | 83 | 6.78 · +57 · light `#DEF3C4` (+67) | 1.07 · +2 · extra `#1F5A2E` (-47) | 5 / **1** |
| `poison+earth` | `#6B8E23` | 55 | 2.77 · +28 · extra `#8FE53A` (+56) | 2.29 · -26 · shade `#496118` (-43) | 5 / 4 |
| `poison+wind` | `#C39BD3` | 69 | 4.49 · +43 · accentB `#D8FAF0` (+69) | 1.41 · -12 · extra `#6E2DB5` (-46) | 5 / 2 |
| `poison+metal` | `#8E7CC3` | 56 | 2.92 · +30 · light `#D4CDE8` (+57) | 2.17 · -25 · extra `#3A1660` (-64) | 4 / 3 |
| `poison+nature` | `#7A3FA8` | 39 | 1.56 · +12 · extra `#CDEFA2` (+64) | 4.07 · -42 · shade `#532B72` (-55) | 3 / 3 |
| `earth+wind` | `#E6C88A` | 82 | 6.52 · +55 · accentB `#FFFFFF` (+73) | 1.03 · +1 · accentA `#B8652F` (-29) | 6 / **1** |
| `earth+metal` | `#8D6E63` | 49 | 2.28 · +22 · light `#D4C8C4` (+55) | 2.78 · -32 · extra `#3B3029` (-60) | 3 / 4 |
| `earth+nature` | `#2E8B57` | 52 | 2.48 · +25 · accentB `#CDEFA2` (+64) | 2.56 · -29 · shade `#1F5F3B` (-45) | 4 / 3 |
| `wind+metal` | `#B0E0E6` | 86 | 7.35 · +60 · accentA `#D8FAF0` (+69) | 1.16 · +5 · extra `#2F7A78` (-34) | 6 / **1** |
| `wind+nature` | `#FFF59D` | 96 | 9.44 · +69 · accentA `#FFFFFF` (+73) | 1.49 · +15 · extra `#8A5A33` (-38) | 5 / **1** |
| `metal+nature` | `#F4A261` | 74 | 5.11 · +47 · light `#FBDCC3` (+63) | 1.24 · -7 · accentB `#8A5A33` (-38) | 5 / 2 |
<!-- /palette-table -->

Findings:

- Every pet reads on the **keep floor** through its dominant colour or its light tone; the one weak dominant there is Nightling's deep purple (ΔL* +12), carried by its new-leaf belly and toxic-green eye shine (the loris's cream face is the natural place for the light zone).
- Seventeen dominants are **weak on the lane** (ΔL* within 20), because most fusion colours are pale by design (snow, pollen, aquamarine, acid green, gold, lime, powder blue, sand, sky lilac, pale steel). For eight of them (bold in the last column) only **one** palette colour separates on the lane: that colour must be the sprite's cel-shade tone or a large accent, not a dot. The pipeline plan writes this into the prompt as a per-pet value rule ("the cel-shade tone is `<carrier>`"), and the ground gate (≥ 1/3 of the body separated on the lane and on the keep) checks it on every candidate, as it did for the foes. The outline and the cream rim help on both grounds but are not counted.
- No fusion colour was changed; the gameplay colours in `classes.js` stay the identity of each fusion in the HUD and the shots.

## 6. IP notes

Every animal is a real species except the kamaitachi (Japanese folklore, a weasel). The roster carries a note per pet; the ones to keep an eye on when the sprites come back: the orchid mantis (Lurantis is a pink-and-white orchid mantis; ours is spring-green with small pink flares and real folded forearms), the snow lamb (Wooloo is a horned ball sheep; ours has no horns, longer legs, a grey face), the walrus (Walrein; ours lies flat, blue-grey with a moustache and gold tusk tips), the scorpion (Skorupi and Drapion are purple; ours lets the gold armour dominate the back), the pufferfish (Qwilfish; ours is mauve with a snow belly and short spikes), the sugar glider (Emolga; ours is pollen-yellow with a bark stripe and no cheeks), the beaver (Bidoof; ours sits up amber with a sprout) and the rhino (Rhyhorn; ours is a rust-brown calf with skin folds). The hedgehog was rejected for earth+nature because a green hedgehog with a flower is Shaymin. The proposal's originality rule stands: reverse-image-search each approved sprite.

## 7. Decisions needed from the user

1. **The 28 animals**: approve, or swap any (each cell lists a fallback animal; the ones I would swap first if asked are the mantis shrimp for a firefly squid, the crocodile for a bulldog pup if the "pup" names matter, and the chameleon for a hammerhead shark).
2. **The six proposed names**: Embertoad (Smogpup), Anviljaw (Anvilpup), Emberhopper (Embersprout), Frostjelly (Frostfang), Rustclaw (Rustgrub), Mossbara (Mossbun). Keeping the old names costs nothing; they are only less apt.
3. **The vertical narwhal**: a spy-hop with the tusk pointing up is the one unusual pose in the set (a horizontal narwhal twinned the platypus at 0.70). It reads as a narwhal at 40 px and is the strongest "lightning rod" image, but it is the pose most likely to surprise.
4. **Pets' figure-ground rule**: adopt the carrier cel-tone rule for the eight pale pets (section 5), or lower the ground gate for pets, who also carry the cream rim.
5. **The pipeline plan** (`pipeline-plan.md`): 140 images on `gemini-3-pro-image` at $0.134 list = **$18.76**, with reserves to a ceiling of 176 images = $23.58. Run after 1–4.
6. **A renderer follow-up** before the new sprites ship: `roamerFit` fits a generated fusion to 1.0 cell tall with a width cap of 1.25 cells, which will shrink the long-low pets (crocodile, platypus, jackrabbit, scorpion, walrus, mantis shrimp); fit the longest side instead, as the foes do.

## 7b. Corrections after approval (2026-10-16, before the run resumed)

The silhouette contracts are what the twin test measured and what the user approved, but rounds 2 and 3 (section 4) reshaped eleven of them without updating their words in `fusion-roster.json`, so the first run's prompts pulled two ways (the mole: a profile loaf in the text, a front-view molehill pop-up in image 1; its three candidates followed the text and missed the contract and the gates). The words now describe the contracts; no contract changed:

- **View changed:** the mole (front, popping out of its molehill), the narwhal (front, spy-hopping, the tusk straight up), the platypus (profile, diving down-left on a diagonal).
- **Pose reworded:** the mantis shrimp (rearing, the fan tail on the ground), the toad (the splat stance), the lamb (the fleece carried high on stilt legs), the capybara (legs long enough to show daylight under the belly), the boar (a huge crest of tall spikes), the rhino (a long low body and a huge horn), the mammoth (long pillar legs, the trunk curving in front), the pufferfish (long spikes, a big fan tail).

The mole was regenerated; the red panda and the mantis shrimp had already passed their gates with the old words and were kept.

A review of the run's gates (the same day) corrected two measurements, and every made pet was scored again:

- **The cream rim is not the silhouette.** The sprites keep the heroes' sticker rim (about 2 % of the longest side), the contracts do not, so a perfect fill scored 0.67–0.71 against the thin-limbed contracts and rim-to-rim pairs looked more alike than they are. The gates now strip the rim (`rim`: 0.02) from a pet, from the pets made so far and from the base pets before comparing outlines. With it, the red panda's contract fit went from 0.84 to 0.89 and the mole came inside the gates.
- **Pets roam over the lanes and the hedges, not the keep floor.** Their feet stay above the parapet (`src/sim/roam.js` Y_MIN 9.1, the wall top 8.8), and a pet 1.0 cell tall and up to 1.6 wide covers its lane and the hedges beside it. The hedges (L* 31.7–36.7) are lighter than the keep floor (26.6), so eight mid-dark pets now carry a light zone of a third (`lift`, chosen per pet in `fusion-roster.json`: the toad's ember belly, the dragonfly's mist-white wings, the jellyfish's frost-cyan highlights, the spider's pale fuzz, the scorpion's lilac underside, the loris's new-leaf belly, the rhino's pale stone, the capybara's sandstone belly). The toad, made under the keep rule, blended into the hedges and was regenerated.
- The roster is now generated from `fusion-roster.json` by `tools/gen-roster.mjs`, and `test/fusion-roster.test.js` fails if `src/art/fusion-roster.js` drifts from the record or a contract's symmetry contradicts its view.

- **T34 (after merging T17's element colours):** two fusion game colours clashed with an element they are not made of (CIEDE2000 3.4 and 4.8), so each took its own pet's shade: Frostnova `#5b8cff` → `#456ac2` (the red panda's deep cobalt), Bladewind `#b0e0e6` → `#86aaaf` (the weasel's steel teal). The sprites keep their body colours; `test/fusion-roster.test.js` holds every fusion colour ≥ 5 from the elements but its parents and ≥ 8 from each other, and one of its pet's six colours.

## 8. Caveats

- The contracts are sketches: the numbers above are the contracts' numbers, and the generated sprites will land ±0.1 from them (the foe run did). That is what the per-candidate gates in the plan are for; a fusion whose three candidates all miss gets the strict round, then a hand paint-over, as the foes did.
- The twin test is bounding-box-normalised, so it ignores size: on screen every fusion is 1.0 cell tall and the foes 37–54 px wide, so size does not help apart anyway.
- The foe contracts include the wyvern's, which is the approved sprite's own outline; the other 16 are sketches. The base pets are compared as sprites (alpha masks), not sketches.

## 9. The sprites as shipped (2026-10-16)

Generated with `gemini-3-pro-image`, three candidates each plus a strict round where none was inside the gates, scored by `tools/silhouette-check.py` (gate version 3: rims stripped, lanes and hedges as grounds), and seven redone with clearer words (one, the snow lamb, scored worse and kept its first sprite). **17 pass, 4 are within the 0.03 tolerance, 7 are reviewed near-misses** recorded with their margins and reasons as `gateAccepted` in `fusion-roster.json` (the foes' rule). Closest other pet: max 0.65, median 0.56; closest foe or base pet: max 0.69, median 0.58 (at 40 px, rims stripped, flip allowed; the old sprites were 0.82 / 0.79 among themselves with rims).

| Key | Pet | Animal | Contract fit | Closest pet | Closest foe / base pet | Weakest ground | Verdict |
|---|---|---|---|---|---|---|---|
| `fire+ice` | Novakit | red panda | 0.90 | 0.55 poison+wind | 0.59 pet.earth.128 | 0.67 lane | pass |
| `fire+lightning` | Zapcinder | peacock mantis shrimp | 0.94 | 0.45 metal+nature | 0.52 enemy.axolotlFairy | 0.35 lane | pass |
| `fire+poison` | Embertoad | fire-bellied toad | 0.96 | 0.52 fire+earth | 0.56 enemy.armoredSoldier | 0.50 lane | pass |
| `fire+earth` | Magmole | mole | 0.94 | 0.63 lightning+earth | 0.67 enemy.elfRuler | 0.38 lane | within 0.03 |
| `fire+wind` | Flarewhirl | flame skimmer dragonfly | 0.88 | 0.48 ice+poison | 0.42 enemy.pixie | 0.39 lane | pass |
| `fire+metal` | Anviljaw | crocodile | 0.81 | 0.57 fire+nature | 0.58 enemy.kiteMinion | 0.64 peaks.hedge | pass |
| `fire+nature` | Emberhopper | locust | 0.74 | 0.57 fire+metal | 0.54 enemy.ninja | 0.40 lane | pass |
| `ice+lightning` | Sparkfrost | narwhal | 0.76 | 0.48 poison+nature | 0.47 pet.lightning.128 | 0.43 lane | pass |
| `ice+poison` | Frostjelly | lion's mane jellyfish | 0.59 | 0.63 ice+wind | 0.69 pet.metal.128 | 0.51 lane | accepted near-miss |
| `ice+earth` | Tundrock | woolly mammoth | 0.82 | 0.65 ice+wind | 0.68 pet.nature.128 | 0.49 lane | accepted near-miss |
| `ice+wind` | Flurrin | snow lamb | 0.83 | 0.65 ice+earth | 0.69 pet.fire.128 | 0.30 lane | accepted near-miss |
| `ice+metal` | Rimeplate | walrus | 0.87 | 0.61 earth+metal | 0.67 enemy.armoredSoldier | 0.29 lane | accepted near-miss |
| `ice+nature` | Frostpetal | reindeer fawn | 0.75 | 0.43 lightning+nature | 0.43 pet.lightning.128 | 0.38 lane | pass |
| `lightning+poison` | Fizzlebolt | platypus | 0.71 | 0.58 earth+metal | 0.62 enemy.armoredSoldier | 0.48 lane | pass |
| `lightning+earth` | Rumblebolt | wild boar | 0.96 | 0.63 fire+earth | 0.65 enemy.elfRuler | 0.68 peaks.hedge | within 0.03 |
| `lightning+wind` | Gustbolt | jackrabbit | 0.65 | 0.56 fire+earth | 0.58 enemy.elfRuler | 0.38 lane | pass |
| `lightning+metal` | Voltgild | chameleon | 0.80 | 0.55 lightning+poison | 0.53 enemy.armoredSoldier | 0.36 lane | pass |
| `lightning+nature` | Zaplily | orchid mantis | 0.87 | 0.45 fire+earth | 0.50 pet.lightning.128 | 0.49 peaks.hedge | pass |
| `poison+earth` | Bogling | bog spider | 0.81 | 0.56 poison+wind | 0.55 enemy.armoredSoldier | 0.54 hedge | pass |
| `poison+wind` | Mistmaw | pufferfish | 0.73 | 0.64 ice+wind | 0.69 pet.fire.128 | 0.39 lane | accepted near-miss |
| `poison+metal` | Rustclaw | scorpion | 0.81 | 0.49 ice+metal | 0.53 enemy.flameSprite | 0.57 lane | pass |
| `poison+nature` | Nightling | slow loris | 0.94 | 0.48 ice+lightning | 0.52 pet.lightning.128 | 0.33 peaks.hedge | pass |
| `earth+wind` | Dunepuff | Bactrian camel | 0.58 | 0.58 ice+earth | 0.62 pet.earth.128 | 0.31 lane | within 0.03 |
| `earth+metal` | Ironclod | rhinoceros | 0.94 | 0.61 ice+metal | 0.60 enemy.elfRuler | 0.35 peaks.hedge | within 0.03 |
| `earth+nature` | Mossbara | capybara | 0.93 | 0.57 ice+earth | 0.63 pet.nature.128 | 0.27 peaks.hedge | accepted near-miss |
| `wind+metal` | Whirlblade | kamaitachi (sickle weasel) | 0.72 | 0.36 poison+wind | 0.34 pet.nature.128 | 0.38 lane | pass |
| `wind+nature` | Pollenpuff | sugar glider | 0.98 | 0.64 poison+wind | 0.63 pet.lightning.128 | 0.39 lane | accepted near-miss |
| `metal+nature` | Sproutgear | beaver | 0.95 | 0.46 ice+metal | 0.49 pet.poison.128 | 0.55 lane | pass |

## Appendix: today's sprites under the same test

<!-- today-table -->
| Key | Today's sprite: closest fusion | Closest foe contract | Closest base pet |
|---|---|---|---|
| `fire+ice` | 0.81 fire+lightning | 0.57 owl | 0.81 ice |
| `fire+lightning` | 0.81 fire+ice | 0.57 owl | 0.74 nature |
| `fire+poison` | 0.82 fire+metal | 0.56 snail | 0.77 nature |
| `fire+earth` | 0.80 fire+lightning | 0.56 snail | 0.72 nature |
| `fire+wind` | 0.80 fire+ice | 0.56 owl | 0.77 poison |
| `fire+metal` | 0.82 fire+poison | 0.59 owl | 0.79 nature |
| `fire+nature` | 0.81 fire+ice | 0.58 owl | 0.74 poison |
| `ice+lightning` | 0.79 ice+earth | 0.59 ibex | 0.77 ice |
| `ice+poison` | 0.74 ice+nature | 0.56 owl | 0.71 nature |
| `ice+earth` | 0.79 ice+lightning | 0.65 hivequeen | 0.73 ice |
| `ice+wind` | 0.77 earth+wind | 0.60 pagodacrab | 0.76 fire |
| `ice+metal` | 0.78 ice+lightning | 0.63 owl | 0.79 ice |
| `ice+nature` | 0.75 ice+metal | 0.64 owl | 0.78 ice |
| `lightning+poison` | 0.69 poison+metal | 0.55 owl | 0.67 wind |
| `lightning+earth` | 0.75 lightning+metal | 0.57 dormouse | 0.69 lightning |
| `lightning+wind` | 0.77 lightning+metal | 0.61 macaque | 0.72 earth |
| `lightning+metal` | 0.81 lightning+nature | 0.61 owl | 0.73 lightning |
| `lightning+nature` | 0.81 lightning+metal | 0.62 owl | 0.78 lightning |
| `poison+earth` | 0.79 poison+metal | 0.64 owl | 0.78 wind |
| `poison+wind` | 0.80 fire+wind | 0.55 owl | 0.81 poison |
| `poison+metal` | 0.80 poison+nature | 0.59 owl | 0.83 poison |
| `poison+nature` | 0.80 poison+metal | 0.60 owl | 0.90 poison |
| `earth+wind` | 0.77 ice+wind | 0.59 pagodacrab | 0.73 nature |
| `earth+metal` | 0.77 fire+earth | 0.59 owl | 0.77 nature |
| `earth+nature` | 0.76 earth+metal | 0.63 ibex | 0.82 nature |
| `wind+metal` | 0.82 wind+nature | 0.56 pagodacrab | 0.68 poison |
| `wind+nature` | 0.82 wind+metal | 0.57 moth | 0.65 poison |
| `metal+nature` | 0.76 ice+wind | 0.58 moth | 0.78 fire |
| **max / median** | **0.82 / 0.79** | **0.65 / 0.59** | **0.90 / 0.77** |
<!-- /today-table -->
