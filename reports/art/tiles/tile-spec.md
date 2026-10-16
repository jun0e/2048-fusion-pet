# 2048 Siege: tile overhaul (review sample)

> **Built (2026-10-16)** in the game's default sticker style, with the section 4 decisions (the altar; every other default "yes"). Geometry, colours and motion rules are in `src/art/plaque.js` (Node-tested, `test/tiles.test.js`); the static textures in `src/art/index.js` (plaque with its meter and nest, a den's altar as its own texture so it can rise, badges, paw prints, the numeral, `composeTileCanvas` / `tileCanvas`); the per-frame rules in `src/render/blocks.js`; the card in `src/ui/inspect.js` + `.css`; the pit radius in `src/render/frame.js`; the coach and How-to-play text say "growth marks" (`src/ux/coach.js`), which fits the meter and the classic/pixel border alike; arming, the refused-swipe nudge and the den's pet mark wired in `src/main.js`; the mark itself as a `highlight(id)` hook in `src/kv/roam.js`; the brackets for both in `src/render/brackets.js`. All 46 states are built except #26 (see below). The classic and pixel styles keep their own plates and the 4-piece border (now only drawn for them); the brackets, lift, nudge, drop-in and departures apply to every style.
>
> Where the build differs from this spec, and why:
> - **2.2, 2.9, 3.2 (scared face, blink):** the P2 edits `pet.<el>.scared` / `.blink` are edits of the 16 stage only (asset catalog), so swapping them onto a 32–128 would drop its stage motif (the metal lion would turn back into the cub for a second). A 16 uses them; a 32–128 keeps its own sprite and gets a code-drawn sweat drop (the edits' own cue) while hurt > 0.3, and does not blink.
> - **2.3, 2.5 (armed brackets):** the dashes are laid out from the corner (the bend itself and one dash at each arm's end, butt caps, dash 0.06 / gap 0.07 so they fill the 0.16 arm), not from the arm's end as in the sheet, where the bend fell in a gap and the round caps closed the gaps.
> - **2.7, 3.1 (the numeral):** a texture per tier drawn at its size on screen (device px per cell in steps of 16), not live `Text`: the same canvas `textBaseline: middle` as the sheet and the card, crisp at any size, and the promote flip and the badge bump still have their own sprites (the badges are sprites, not an overlay).
> - **2.3, 2.7 (the numeral's floor):** never drawn under 14 px, the canvas numbers' floor (`docs/ux/phone-readability.md`). At their design sizes a 4-digit numeral would be 12.5 px on a 360 × 640 phone (0.2625 of a 47.6 px cell) and a 5-digit one 10.7 px. There both are drawn at 14 px, and a 5-digit one is squeezed across (to 95 %) to stay inside the plaque (`numberFit`, `PLAQUE.numberMaxW` 0.8 cell). The paw prints were moved a little so they also clear a numeral at its floor.
> - **3.3 (the card):** the growth row runs the card's full width under the head (in the 72 px picture's column it pushed the stats under the Sell row on a 390 px phone), at 14 px / 700 (the phone-readability floor for the card's main progress line).
> - **Added (the coordinator's T20, "a den shows its pet"):** a den whose pet roams shows three paw prints walking off the altar toward the field (`PAWS`: up and to the right, clear of the numeral, the badges and the altar; hidden while the pet hops out; dropped on a cell under 56 px, where a print is a dot). A picked den's pet wears the pick's cream brackets on the field, round its body and a legend's halo (breathing in position, still under Reduce motion). Its card says the pet is out on the field and, as it opens, sits above or below the pet only when its whole head (the picture, the title, the pet's line) and the Sell row fit there, measured at the card's width: about 200 px, which the field leaves on a 412 × 915 or 430 × 932 phone but never on a 390 × 844 one or smaller, where the card covers the pet and says where it is.
> - **Also:** the coach and How to play say "growth marks", which fits the meter and the classic and pixel styles' 4-piece border alike; in a run whose pets roam, a new den's altar waits for its pet (a die card holds the sim, and with it the pet), then rises with it; the cracks of a destroyed block are turned toward its last bite; a den no longer recoils or flashes when its roaming pet fires (state 38); a refused swipe nudges the plaques whenever the board moved nothing (not only once `locked`), except a swipe refused for coins (it has its own cue); a merged block shows after the slide and pops (the 1.18 peak used to be masked by its scale-in); the spawn puffs, chips, leaves, shell halves, meter wipe and cracks book their light in the game's light budget (`tools/flash-audit.mjs` models events, not these bits; its verdict is unchanged); a legend's charge grows in 64 steps whose paths are shared by every legend.
> - **Not built: #26**, the tutorial ring's radius matched to the pit's: it is `.coach-ring` in `src/ui/hud.css`, owned by other work.

Art-direction spec for the board tiles of the `ux-journey` build (2026-10-16), the step after the siege frame: every state a tile can be in, inventoried from the code; the overhauled tile for the stone keep; the measurements; and the plan for `src/art/index.js`, `src/render/blocks.js` and `src/ui/inspect.js`. No game file was changed: everything here lives under `reports/art/tiles/`.

- `samples.html` + `samples.js`: the sample sheet, served by the dev server at `http://localhost:5177/reports/art/tiles/samples.html`. Every state is drawn twice with the real generated sprites (`public/assets/gen` through `/assets/manifest.json`), at 2× a 390 px phone (cell 140 px): **current** is a 1:1 port of today's `stickerPlate` / `stickerOverlay` (index.js) and the per-frame rules of `blocks.js` (glow, milestone border, selection, hit tint, muzzle flash, pops, `petPose` wind-ups, the leap), drawn sharp at the sheet's resolution instead of blown up from the 160 px texture; **proposed** is the plaque below. A *Play motion* toggle replays the motion states; the PNG shows keyframes.
- `samples.png`: the whole sheet (1440 × 9766 px, DPR 1); `sections/<group>.png`: each group at DPR 2 for close viewing; `contrast.json`: the measured contrast table; `tools/capture.mjs`: the headless-Chromium export (playwright-core from the npx cache, the sheet frozen to images before capture, stitched in slices because the full surface is above swiftshader's capture limit).

Method: the AAA graphics-builder skill (`SKILL.md`, `visual-scorecard.md`, `technical-art.md`, all six checklists) and the game-UI designer skill (`SKILL.md`, `ui-patterns.md`, its four checklists), translated to 2D PixiJS; the proposal's sections 2.3, 3, 4.2 (the Rev 2 tile pick) and 4.3. Reference ledger: loaded as listed; `implementation-blueprint.md`, `model-recipes.md`, `render-recipes.md`, `shader-cookbook.md` and the prompt templates were not loaded (3D material and shader guidance, not asked for by the brief). The external-asset gate: no concept image was generated. Every surface of the tile is already covered by generated sprites (eggs, 8 × 6 pet edits including `blink` and `scared`, 28 fusions, 8 halos, 8 badges, `vfx.nature.leaf`), the plaque is a clay plate like the HUD's (proposal 4.3: three materials, clay / stone / timber), and the code render answered the one material question (seated clay in a stone pit reads at 48 px). Gemini spend for this step: **$0**.

---

## 1. State inventory

Read from `src/render/blocks.js`, `src/art/index.js`, `src/sim/{grid,run,defense,classes,roam}.js`, `src/render/{frame,scenery}.js`, `src/ui/{inspect,tutorial,hud}.js`, `src/ux/{coach,photosafe}.js`, `src/kv/roam.js`, `src/art/{attack-vfx,asset-catalog}.js`. One fact that shapes the list: below 16 a block has no element (`run.js onSpawn: t.cls = {}`, rolled at 16 in `mergeClass`), so the "dormant tiers" are exactly the three eggs; the classic style's "pale die colour" below 16 exists only for debug-spawned tiles (`main.js spawnDebug`). 46 states, numbered as on the sheet:

| # | State | Where it comes from | Today | Proposed |
|---|---|---|---|---|
| 1 | Empty pit | `frame.js drawKeep`: pit #35334E, 1 px ink groove, inner shadow top/left, lit lip, radius 0.07 cell | — | the same pit, radius 0.12 cell (one number: `pitR = L(0.24)`) |
| 2–4 | Egg 2 / 4 / 8 (tiers 1–3) | `EGG_PLATE` cream → sand → apricot; `egg.2/4/8`; 2.4 rad/s wobble, the 8 shakes in bursts (9 rad/s × 0.06 rad) | plate floats on a drop shadow | seated; the egg sits in a straw nest, lifted 0.04 cell; wobble kept |
| 5–12 | 16 of each element | `tone(colour, 0.42)` plate, `pet.<el>.16`, `badge.<el>`, 0 of 4 border pieces; glow ≤ 0.078 α | unlit border pieces read as grey handles on every edge | growth meter 0 / 4 in the top rail; glow unchanged |
| 13–15 | 32 / 64 / 128 (stage motif) | `milestonePieces` 1–3 gold; creature 60 / 64 / 68 % of the cell | pieces on top, right, bottom edges | meter 1 / 2 / 3 of 4 |
| 16 | Class override | `run.js 'override'` (the slider's element wins) | nothing on the tile | the loser's badge slides out of the collar slot and fades (0.3 s) |
| 17–19 | Den 256 / 1024 / 2048 | `tone(fusion, 0.18)` + corner wedge `tone(partner, 0.25)`, both badges, number at 50 %, nest ellipse α 0.22; pieces 0–3 pink | an empty plate with two badges | the altar the pet left (a stone shrine: plinth, a body with the parents' two colour studs, a light slab, a crystal in the fusion's colour), number at 33.5 % like every tile, meter in rose |
| 20 | Dark-fusion den (Nightshade) | `#7a3fa8 → tone 0.18 = #9262b8` | ink on it 3.54 : 1 | den luminance floor Y ≥ 0.25 → `#a279c2`, 4.59 : 1 |
| 21 | Fusion moment (pet hops out) | `'classed'` stage 2 → pop; `sim/roam.js hatch` 0 → 1 over 0.7 s | the den pops; the roamer appears | the altar rises from the floor under the pet as it leaves |
| 22–23 | Legend 4096 | gold 7 px + ink 2.5 px frame, apex badge top centre, glow 1.9 cells cycling three colours, charge arc r = 0.5 cell | the charge arc runs outside the plate's corners, over the badges | the apex badge sits on the altar inside `halo.<apex>` (at the top centre it would cover the number at 33.5 %); the frame's inner edge fills with cream clockwise as the signature charges |
| 24 | Picked | `blocks.select`: gold 0.12 U frame + white line, size breathing 1.3 Hz; `scenery.showRange`; the inspect card | the same gold as the legend frame | cream corner brackets outside the pit (ink under cream), gap breathing ≤ 0.7 Hz, the plaque lifts 0.03 cell on a longer shadow |
| 25 | Sell / break armed | `inspect.js armed` 2.5 s, button #ef6060; nothing on the tile | — | brackets red and dashed, 2° wobble at 3 Hz |
| 26 | Tutorial highlight | `tutorial.js targetRect(tile)` → DOM `.coach-ring` 3 px #ffd34a, 14 px radius, 4 px halo, 1.2 s pulse | — | unchanged; radius matched to the pit's |
| 27 | Locked board | `run.js 'locked'` → banner; `grid.canMove()` false | no tile cue | a refused swipe nudges every plaque 0.04 cell and back (0.18 s) |
| 28–29 | Under attack (`tileHit`) | `body.tint → #ff6a6a`, hold 0.4 s, decay 1/1.6 s; shudder 0.06 U at 90 rad/s | the whole plate goes red | the plaque tinted the same way, the creature untinted and swapped to `pet.<el>.scared` while hurt > 0.3; eggs wobble harder |
| 30 | Repaired (`tileHeal`) | tint toward #8dff9d × 0.4; main.js beam + sparkle | a faint green tint | the same tint plus three `vfx.nature.leaf` falling |
| 31 | Destroyed (`remove · destroyed`) | ghost shrinks over 0.11 s; main.js blast, shake 10, "Block lost!", red edge pulse | shrinks at its centre | cracks from the bite, the plaque drops into the pit and fades, six chips fly, rubble stays 4 s |
| 32 | Sold (`remove · sell`) | ghost shrink + gold burst ×18 | shrinks | lifts out of the pit (−0.3 cell), shrinks a little, fades; gold puff kept |
| 33 | Broken (`remove · break`) | the same ghost | shrinks | crumbles in sand chips, no cracks, no red |
| 34–36 | Wind-up 16 (hop) / 32–64 (crouch) / shot + follow-through 128 (recoil) | `attack-vfx petPose`, `'fire'` → punch 1 (scale 1.07, squash), muzzle = the plate's white silhouette ≤ 0.12 α | — | unchanged; the badge bumps 20 % for 0.1 s on the shot |
| 37 | Pride Pounce leap | `leapAt`, afterimage from 32 | — | unchanged |
| 38 | A den or legend fires | the roamer lunges / the halo dials (`kv/roam.js`) | nothing on the tile | nothing on the tile: the charge frame is the only tile-side cue |
| 39 | Spawn pop | appear 0 → 1 over 0.12 s after SLIDE × 0.9 | scale-up at the centre | drops into the pit from 0.22 cell up, scale 1.06 → 1, two sand puffs |
| 40 | Merge pop | popS = 1 + 0.18 sin(π pop), creature squash 0.22 | kept | kept; the new meter segment lights |
| 41 | Hatch 8 + 8 → 16 | `'classed'` stage 1 → pop | the 16 pops in whole | two shell halves fly off, the hatchling pops up from the sill |
| 42 | Boss x2 (`promote`) | pop | — | the number flips like a card (scale.x cos πk over 0.3 s) |
| 43 | Slide / merge ghosts | SLIDE 0.11 s cubic ease-out | — | unchanged (the plaque slides on the floor, its pit drawn empty) |
| 44 | Idle bob | 8.4 rad/s × 5 % (16–32), 6 rad/s × 3.5 % (64–128) | — | unchanged |
| 45 | Idle blink | `pet.<el>.blink` exists (asset-catalog P2), unused | no blink | 120 ms every 3–6 s |
| 46 | Reduce motion | `stage.reduced`: no poses, leap, shake; the shudder still runs | — | also no shudder, no drop-in (fade), no wobble, no nudge; brackets still |

Not tile states (owned elsewhere, unchanged): the range band and lit ticks (`scenery.js`), the "Awakened / Fusion" announcements and the milestone number (`hud.js`), the roaming pet's own poses (`kv/roam.js`), the red vignette when a block falls (`hud.css`).

---

## 2. The design: clay plaques seated in the flagstone pits

**One sentence.** The tile stops floating over the keep: it is a clay plaque set into its flagstone pit, and everything that was a line on its edge becomes an object on it: a meter, a nest, an altar, a halo, a bracket set.

### 2.1 Kept (proposal 2.3 and the Rev 2 pick, 4.2)

- The number-first layout: Baloo 2 ExtraBold, ink `#2b1d2e` with the cream `#fffaf2` stroke (0.26 em), 39 / 31 / 26 % of the cell for 1–2 / 3 / 4 digits, centred in the top zone; the creature peeking over the sill (anchor 0.43 cell below the centre, feet cropped at 84 %, 56 → 68 % of the cell from 16 to 128); the glyph badge as a collar tag bottom-right (0.25 cell), both badges on a den, the apex badge top centre on a legend.
- The plate tint `tone(colour, 0.42)` for 16–128, `tone(fusion, 0.18)` with the corner wedge for dens, the gold frame for legends, the egg plates cream → sand → apricot.
- Plum ink + cream rim + one cel tone: the plaque keeps the flat lighter top band (white 0.34) and the dark foot lip (ink 0.16) that `stickerPlate` draws today.
- The egg → baby → den → roamer arc, the class glow as a whisper (≤ 0.078 α), the photosafe caps (`TILE_GLOW`, `HIT_TINT`), the `petPose` wind-ups, the leap, the merge pop.

### 2.2 What changes, and why

| Change | Why |
|---|---|
| **Seated, not floating.** The plaque is 0.86 cell in a 0.9 pit: a 0.02-cell groove shows all round; its shadow is cast *inside* the pit (ink α 0.38, offset 0.02 / 0.035 cell, clipped to the pit) instead of a drop shadow under a floating plate; the pit's corner radius matches the plaque's. | The keep is a stone floor with pits (frame.js); a plate that floats above its pit on a shadow contradicts it. Seating is the one cue that says "this tile belongs to this keep", and it costs no light. |
| **The 4-piece border becomes a 4-segment meter in the top rail** (dark track, lit segments gold toward 256 and rose toward 4096, 0.5 × 0.045 of the plaque). | Today's four edge bars outline the plate on every edge; unlit at 22 % white they read as grey handles (sheet, samples 5–12, 17). A meter is the lintel's own language (the foes meter) and the segment *count* is a shape, so progress reads without colour. |
| **Dens get an altar**: a small stone shrine in the keep's stone (plinth, a body carrying the parents' two colours, a light slab) with a crystal in the fusion's colour where the creature stood, number at 33.5 % like every tile. The user chose it over the first proposal, a burrow ("hole is weird, use altar or tower instead"); the tower is drawn in the sheet as the alternative. | A den today is an empty plate with two badges (sample 17): it reads as "nothing here" next to a lively 16. The altar is where the fusion was made, part of the castle (the frame's stone), and a silhouette the eye tells apart from an egg and from a creature at 48 px; it stays in the bottom third, clear of the number and the badges. |
| **Legends: the apex badge sits on the altar inside its halo; the charge fills the gold frame.** | The halo kit exists (`halo.<el>`) and today appears only on the roamer; at the top centre the apex badge would cover the number at 33.5 %. The charge arc at r 0.5 cell runs outside the plate and across the badges (sample 22). A frame that fills with cream is slower and stays on the plaque. |
| **Den plate luminance floor** Y ≥ 0.25 (`denPlateColor`: tone lifted in 0.02 steps). | Nightshade's den plate puts the ink numeral at 3.54 : 1, under the 4.5 : 1 target; the floor lifts it to 4.59 : 1 and touches no other fusion (section 2.8). |
| **Cream brackets for the pick; red dashed brackets when armed.** | Gold belongs to the legend frame; a gold selection frame makes a picked 64 look like a 4096 (sample 24). Brackets sit in the groove between pits (0.045 + 0.16 cell arms) and double-outline (ink under cream) so they read on the dark floor and over bright effects. Arming the sell / break button today changes nothing on the board. |
| **The scared face on a hit, leaves on a heal, blink at idle.** | All three sprites exist (`pet.<el>.scared`, `pet.<el>.blink`, `vfx.nature.leaf`) and are unused on tiles; they add shape cues to states that are colour-only today, at zero light cost. |
| **Arrivals and departures move in and out of the pit**: spawn drops in with sand puffs; sold lifts out; destroyed cracks, drops and crumbles leaving rubble; broken crumbles in sand; hatch throws the shell; promote flips the number. | Today every arrival and departure is a scale at the cell's centre (samples 31–33, 39–42); a plaque in a pit has a physical up and down to use, and loss leaves a mark (the rubble decal, dark: free in the light budget). |
| **Egg nest** (eggs lift 0.04 cell into a straw ring). | The lowest-value tile is the brightest plate on the board; the nest gives it a reason and a shape ("promise") without changing the plate. |
| **Locked board: a refused swipe nudges the plaques.** | The only cue today is the banner; a 0.04-cell nudge is motion, not light, and tells the hand what the eye is told. |

### 2.3 Geometry (cell units; a cell is 2 U; at 390 × 844 a cell is 70 px, on the smallest phone 48 px)

| Part | Size | at 48 px | at 70 px | at 140 px (sheet) |
|---|---|---|---|---|
| Pit | 0.9, radius 0.12 | 43 px, r 5.8 | 63, r 8.4 | 126, r 17 |
| Plaque | 0.86, radius 0.11, ink outline 0.028 | 41, r 5.3, ink 1.3 | 60, r 7.7, ink 2 | 120, r 15, ink 3.9 |
| Groove | 0.02 each side | 1 | 1.4 | 2.8 |
| Cast shadow | offset 0.02 / 0.035, α 0.38 inside the pit; + 0.6 / 0.9 × the lift | | | |
| Top band / foot lip | 0.3 / 0.085 of the plaque | | | |
| Meter | centre 0.075 of the plaque from its top; 0.5 × 0.045 of the plaque; 4 segments, gaps 0.02; track ink α 0.34 | 22 × 1.9 px | 30 × 2.7 | 60 × 5.4 |
| Number centre | 0.335 of the cell from the top (33.5 %; the guide's 33 % moved by half a point to clear the meter) | | | |
| Number size | 0.3875 / 0.3125 / 0.2625 of the cell (1–2 / 3 / 4 digits), stroke 0.26 em | 18.6 / 15 / 12.6 px | 27 / 22 / 18 | 54 / 44 / 37 |
| Creature | as today: height 0.56–0.68 of the cell, width ≤ 0.9, anchored 0.43 below the centre; eggs 0.5–0.6, lifted 0.04 | | | |
| Badge | r 0.135 of the cell (the generated badge drawn 2.35 r wide), centre 0.34 from the centre on every tile: one badge, an element's own or a den's split between its two elements (T21, 2026-10-16; it was r 0.10625 and two badges on a den, 12 px drawn on a 360 px phone) | 13 px | 19 | 38 |
| Altar | of the plaque, below its centre (half-width, top, height): plinth 0.235 / 0.35 / 0.055, body 0.19 / 0.22 / 0.135 (the parents' studs r 0.042 at ± 0.085), slab 0.215 / 0.175 / 0.05; ink 0.02 cell; stone = the chapter skin's stone (base, cel tone on the lower third, light band on the top fifth) | 20 × 13 px | 29 × 19 | 58 × 38 |
| Crystal (den) / apex badge (legend) | the seat 0.075 of the plaque below its centre: crystal 0.17 × 0.21 of the plaque (light fusion colour, its right facet the fusion colour, the lower facets shaded, a cream glint); a legend's apex badge there at r 0.096 of the cell | 7 × 9 px | 10 × 13 | 20 × 25 |
| Halo (legend) | 0.42 of the plaque wide, centred on the seat | 17 px | 25 | 51 |
| Nest | ellipse 0.31 × 0.085 of the plaque at 0.4 below the centre; 4 + 4 straw strokes 0.022 cell wide | | | |
| Gold frame (legend) | 0.045 cell gold + 0.014 ink hairline 0.022 outside | | | |
| Charge | the plaque's own rounded rect, stroke 0.028 cell cream, from the top centre clockwise | | | |
| Brackets | corner 0.045 (± 0.012 breathing) outside the pit, arms 0.16, width 0.04 (+ 0.02 ink under) | 1.9 px | 2.8 | 5.6 |

The tile's silhouette language, at a glance: **egg in a nest / creature over the sill / a stone altar / an altar under a gold halo** for egg, baby, den, legend, before any colour.

### 2.4 Layers, back to front

`frame.js`: floor, pit (static). `blocks.js` glow layer: class glow (soft dot), the cast shadow. The tile container: **plaque** (fill, wedge, top band, foot lip, nest back, ink outline, gold frame, meter, altar, halo and the legend's apex badge: one static texture per tier × class, as `stickerPlate` is today) → hit / heal tint on the plaque only → **creature** (bob, pose, leap, blink / scared) → nest front (eggs) → **overlay** (number, badges: one static texture as `stickerOverlay`) → muzzle flash (the plaque's white silhouette) → charge → brackets → particles (chips, dust, leaves, shell, gold puff).

### 2.5 Materials and colour roles (no one-off colours)

| Role | Value | Use |
|---|---|---|
| `ink` | `#2b1d2e` | outline, numeral, meter track (α 0.34), altar and crystal outlines, bracket under-stroke, cast shadow |
| `cream` | `#fffaf2` | numeral stroke, brackets, meter segment highlight, charge, shell |
| `clay` | the plate tints (above) | the plaque |
| `gold` | `#ffcf4a` | legend frame, meter toward 256, sold puff |
| `rose` | `#ff8fa3` (`BLUSH`) | meter toward 4096 (today's `#ffb3ff`) |
| `straw` | `#d9b86f` / `#e2c47c` | the eggs' nest |
| `stone` | the chapter skin's stone (frame-kit) | the altar: base, cel tone, light band |
| `sand` | `#D9C7A3` (the lane) | spawn dust, broken chips `#e6c88a` |
| `danger` | `#ef6060` (inspect.css armed) | armed brackets |
| `hit` / `heal` tint | `#ff6a6a` / `#8dff9d × 0.4` | unchanged (`blocks.js`, `TILE_GLOW.heal`) |

### 2.6 Identity channels, in order

1. **Shape**: the creature's silhouette (motif growth per stage), egg / creature / altar / altar under a halo per arc stage, the meter's segment count, bracket shape (solid = picked, dashed = armed).
2. **Glyph**: the badge (generated dual-tone badges, one per element; a den shows both, a legend three).
3. **Tint**: the plate's light element tint, the den's fusion tint, the meter's gold / rose.

Nothing is colour-only: progress is a count, the hit has the scared face, the pick has a bracket shape, the den has a hole.

### 2.7 Typography

Baloo 2 ExtraBold (800) for the numeral; sizes and stroke as in 2.3; `textBaseline: middle`; the number is drawn into the overlay texture at TILE_PX (160) like today, or, better, as live text (the brief's recommendation) so a 4-digit den does not pay a texture per tier. Floor: the 4-digit numeral at a 48 px cell is 12.6 px, above the 12 px floor of the HUD.

### 2.8 Contrast, measured (`src/art/tokens.js contrast`, WCAG relative luminance; `contrast.json`, sheet section K)

| | Today | Proposed |
|---|---|---|
| Ink numeral on the 8 element plates | 8.34 (Poison) – 14.36 (Wind) | unchanged |
| Ink numeral on the 3 egg plates | 10.05 – 12.22 | unchanged |
| Ink numeral on the 28 den plates | 3.54 (Nightshade) – 14.60 (Blizzard); 1 of 28 under 4.5 | 4.57 – 14.60; the floor changes only Nightshade (`#9262b8` → `#a279c2`) and, since its deep cobalt (T34, 2026-10-16), Frostnova (`#6685cd` → `#6a88ce`, 4.57 : 1) |
| Cream stroke on the plate | 1.05 – 4.34 | the stroke is the separator between ink and a dark plate or a dark outline, not the carrier: at ≥ 4.6 : 1 for the ink it is never load-bearing |
| Plate on the keep floor `#3E3C58` | 2.34 (Nightshade) – 9.66 | ≥ 3.04 on every plate (figure-ground ≥ 3 : 1 for all 39) |
| Plate on the pit `#35334E` | | ≥ 3.5 |

The ink outline (0.028 cell) and the cream numeral stroke give the number a double outline on every plate, so it also reads over the creature's dark outline and over any effect that crosses the board.

### 2.9 Motion per state

| State | Motion | Duration / easing | Reduce motion |
|---|---|---|---|
| Idle | bob (as today); blink 120 ms every 3–6 s (per-tile hash) | | bob kept (it is the creature's breath); blink kept |
| Egg | wobble as today | | kept |
| Spawn | y −0.22 cell → 0, scale 1.06 → 1, two sand puffs α 0.5 → 0 | 0.12 s cubic ease-out, after SLIDE × 0.9 | fade in place (α 0 → 1, 0.12 s) |
| Merge | pop 1.18 peak, creature squash 0.22; the new segment lights with a 0.2 s cream wipe | pop decays ×4 / s | pop kept (it is a size change, not light); no wipe |
| Hatch | shell halves fly up and out, hatchling y +0.16 → 0 | 0.25 s ease-out | shell halves fade in place |
| Fusion | the altar rises 0.12 of the plaque and fades in (α 0 → 1) under the leaving pet | 0.7 s (roam `hatch`) | fade only |
| Promote | number scale.x cos(πk) | 0.3 s | number cross-fades |
| Fire | punch 1.07 / squash 0.95, muzzle ≤ 0.12 α, badge ×1.2 for 0.1 s, `petPose` wind-up and follow-through | as today | no pose, no badge bump; muzzle kept (below threshold) |
| Hit | tint hold 0.4 s then decay 1 / 1.6 s; shudder 0.03 cell at 90 rad/s decaying ×4 / s; scared face while hurt > 0.3 | as today | tint and face only |
| Heal | tint × 0.4; three leaves fall 0.5 cell | 0.33 s | tint only |
| Destroyed | cracks appear at the bite, plaque y +0.1 cell, α 1 → 0, six chips with gravity, rubble decal α 0 → 0.7 | 0.35 s; rubble holds 4 s then fades 1 s | plaque fades in place, no chips; rubble kept |
| Sold | plaque y −0.3 cell, scale 1 → 0.85, α 1 → 0, gold puff | 0.35 s | fade in place; puff kept (it is small) |
| Broken | as destroyed with sand chips, no cracks | 0.35 s | fade |
| Picked | plaque lifts 0.03 cell (shadow grows), brackets' gap breathes ± 0.012 cell | 0.7 Hz sine | lift kept, brackets still |
| Armed | brackets red + dashed, wobble ± 2° | 3 Hz | no wobble |
| Locked swipe | nudge 0.04 cell in the swipe direction and back | 0.18 s sine | none |
| Legend charge | the cream stroke grows around the frame | the signature's period (1.5–10 s) | kept |

### 2.10 Photosafety notes (`src/ux/photosafe.js` rules)

- Nothing added lights above the thresholds. The muzzle flash stays the plaque's white silhouette at ≤ `TILE_GLOW.muzzle` 0.12 (≤ 6 % luminance change, as measured today). The class glow stays at ≤ 0.078 α. The hit tint keeps its hold-then-fade (one rise, one fall more than 0.4 s apart; `flash-audit.mjs` already covers it); the scared face is a sprite swap. The heal tint stays × 0.4.
- New things that *could* light and how they are bounded: a meter segment lighting is a 0.5 × 0.045 × ¼ plaque area (≈ 0.004 cell², below any threshold); the charge stroke grows over seconds; brackets appear once per tap (a selection, not a flash) and breathe in position, not in brightness; the gold puff is the existing `fx.burst` (booked); chips, shell and leaves are small opaque sprites, normal blend; dust and rubble are dark or sand on dark (under 10 % on the floor): free.
- No brightness pulses anywhere: the breathing cues (brackets, the selected plaque's lift) are position or size changes; the one thing that pulsed in brightness today, the selection's white inner line riding a size pulse at 1.3 Hz, goes.
- Reduce motion is listed per state above; the hit's shudder is turned off under it (it runs today).

### 2.11 Readability at 48–74 px (sheet section J)

The true-size strips at a 70 px and a 48 px cell: the number, the badge, the altar, the gold frame and the halo all read at 48 px. The meter at 48 px is 22 × 1.9 px: the lit count still reads (gold against a dark track), but it is at the limit; the brackets are 1.9 px wide (double-outlined, they hold). Today's four edge bars are wider but ambiguous at every size. Decision for the smallest phones: keep the meter (it is never the only cue: the coach bubble and the inspect card say the count in words) and let the inspect card's growth row carry it at any size.

---

## 3. Implementation plan

### 3.1 `src/art/index.js` (the static textures)

- Replace `stickerPlate` with `plaque(t)`: the plaque body at 0.86 of TILE_PX (the drop shadow goes; the cast shadow moves to blocks.js), the wedge, the top band and foot lip as today, the nest back for eggs, the ink outline / gold frame, **the meter baked in** (it depends on the tier only: `milestonePieces(t.tier)`), the altar for dens (its crystal, or a legend's apex badge on its seat inside `generatedTex('halo.' + apex)` drawn 0.42 of the plaque wide). Pure geometry and colours in a new `src/art/plaque.js` (`PLAQUE` constants, `denPlateColor`, `meterSegments(tier)`, `numberSize(digits)`), testable in Node; the canvas drawing stays in index.js.
- `stickerOverlay`: number centre at 0.335 for every tile (dens included), sizes unchanged; badges unchanged. Optional: the numeral as live `Text` in blocks.js (one `Text` per view, Baloo 2 800, stroke cream) so the overlay texture carries badges only and the promote flip is a `scale.x` on the text.
- `tile(t)` keeps its shape `{ plate, overlay, creature, crop, maxW, egg }` and adds `nestFront` (eggs: a small texture or null) and `face(t, 'blink' | 'scared')` returning the generated edit cropped like the base (same `GEN_BABY_CROP`), or null when the edit is missing (the base is used).
- `composeTileCanvas(t)` (already exported for the guide) gains the generated sprites and the plaque, and becomes the inspect card's picture.
- No new assets are required. Optional P2 Gemini edits, not needed for the overhaul: a drawn straw nest and an altar sprite (2 images) if the code-drawn ones should match the sprites' line weight exactly.

### 3.2 `src/render/blocks.js` (the per-frame rules)

- Drop `drawMilestone` and the `milestone` Graphics (the meter is in the plate); keep `msKey` logic out.
- Add a `seat` Graphics in the glow layer: the cast shadow (ink α 0.38) offset by `(0.02 + lift × 0.6, 0.035 + lift × 0.9)` cells, clipped by the pit rect (draw it as the intersection: a rounded rect inset by the offset is close enough).
- Selection: replace `sel` with the brackets (four polylines, ink under cream; `armed` flag → `#ef6060`, dashed by drawing the arms as short segments; wobble by `c.rotation`); `select(id)` stays; add `arm(id, on)`.
- `lift`: a view field (0 → 0.03 cell while selected or armed) added to `c.position.y`.
- Hit: tint only `body` (already so); swap `creature.texture` to `art.face(t, 'scared')` while `v.hurt > 0.3` (key the swap so it does not re-fetch each frame); shudder off under `stage.reduced`.
- Heal: three `fx.particle(vfxTex('nature', 'leaf'), …)` with gravity, normal blend, on `tileHeal` (booked: three 0.14-cell sprites ≈ 0.06 cell², `spriteLit`).
- Remove: `reason === 'destroyed'`: a `cracks` Graphics drawn from the hit point (polylines, α 1 → 0 over 0.2 s), ghost path y +0.1 cell with α → 0 over 0.35 s (instead of the centre shrink), six chips through `fx.particle` with a small rounded-rect texture in the plate colour, a rubble decal (dark chips, 4 s) in `layers.tiles` under the glow layer; `sell`: y −0.3 cell, scale → 0.85, α → 0, the existing gold burst; `break`: as destroyed with sand chips, no cracks.
- Spawn: `v.appear` drives `y −0.22 cell × (1 − ease)` and `scale 1 + 0.06 (1 − ease)` instead of `scale ease`; two sand puffs via `fx.particle` at the groove; `stage.reduced` → alpha only.
- Hatch (`'classed'` stage 1 on a tile whose previous tier was 3): shell halves = two particles (cream triangles texture), creature `y +0.16 → 0`.
- Fusion (`'classed'` stage 2): the altar rises in with `tile.roam.hatch` (the altar drawn as its own sprite over the plaque, or a mask in the plate colour fading out over 0.7 s).
- Promote: `overlay.scale.x = cos(πk)` over 0.3 s (or the live `Text`), plus the existing pop.
- Fire: on `'fire'`, `badgeBump = 1` decaying ×10 / s → the overlay's badge scale; needs the badge separate from the number (the live-text route gives that for free: overlay = badges only).
- Blink: per view, `nextBlink = 3 + 3 × hash(id)` s; swap `creature.texture` to `art.face(t, 'blink')` for 0.12 s.
- Locked: `nudge(dir)` sets `v.nudge = 1` decaying over 0.18 s → `c.position.x/y += 0.04 cell × sin(π k) × dir`; main.js calls it when a swipe moves nothing (`run.locked`, or the swipe's result).
- Legend charge: replace the arc with a partial rounded-rect stroke on the plaque's inner edge (Pixi 8 Graphics has no dash: build the path from the top centre clockwise with `lineTo` and `arc` up to the charge fraction).
- Tests (`test/`): `plaque.js` pure functions (den floor ≥ 0.25 for all 28 fusions, meter counts per tier, number sizes, bracket geometry inside the 0.1-cell gap), a blocks test that `select` / `arm` / `nudge` set the view fields and that reduce motion zeroes shudder / nudge / wobble.

### 3.3 `src/ui/inspect.js` + `inspect.css`

- The picture: `art.composeTileCanvas(tile)` at 72 × 72 (the pit drawn behind it), replacing the sprite-on-a-disc; `.inspect-pic` 72 px.
- A growth row under the chips: the same 4-segment meter in DOM (`.inspect-meter i.lit`) and the words "n of 4 merges to the fusion at 256" / "to the legend at 4096" (from `describeTile.next`).
- Arming: `createInspect` takes `onArm(id, armed)`; `renderAct` calls it when `armed` flips, and `main.js` wires it to `blocks.arm`.

### 3.4 Asks to other owners

- `src/render/frame.js drawKeep`: pit radius `pitR = L(0.24)` (0.12 cell) so the plaque's corners seat without a dark triangle at each corner.
- `src/ux/coach.js` text: "Its border fills with each merge" → style-neutral "growth marks" (built).
- `src/sim` / `src/ux`: a refused-swipe signal for the locked nudge (either `run.swipe` returning whether anything moved, or the existing `'locked'` state read in `main.js` at swipe time).

### 3.5 Order and effort

1. `plaque.js` + `index.js` plaque, overlay, faces, composeTileCanvas (1 day). 2. `blocks.js` seat, brackets, meter removal, hit face, blink, spawn / remove paths, charge (2 days). 3. `inspect.js` picture, growth row, arming (½ day). 4. Tests, the flash audit (`tools/flash-audit.mjs`) on the new event stream, phone captures at the five audited sizes, the true-size check at 48 px (½ day). The whole step touches no sim rule and no generated asset.

---

## 4. Decisions (2026-10-16: the user chose the altar for 2; the others take the proposal's default, yes, under "default all")

1. **Pit radius 0.12 cell** (frame owner, one number): yes / keep 0.07 (the plaque's radius would then drop to 0.08 to match).
2. **Dens' number at 33.5 % with a den motif** (today 50 % on an empty plate): **decided by the user: an altar** ("hole is weird, use altar or tower instead"; the burrow is dropped, the tower stays in the sheet as the alternative).
3. **Gold reserved for legends**: cream brackets for the pick (and red dashed when armed) instead of the gold frame; the tutorial's gold DOM ring stays.
4. **The meter in the top rail** replacing the four edge bars (the coach line changes one word). Alternative not drawn: a vertical meter on the left rail.
5. **Den plate luminance floor** Y ≥ 0.25: it changes one fusion's plate (Nightshade). Alternative: raise the den tone to 0.24 for every fusion (less saturated dens overall).
6. **The wedge stays** on dens (the Rev 2 pick). Alternative not drawn: a split sill (the bottom rail in the two parents' tints, both badges on it) instead of the corner wedge.
7. **Locked-board nudge**: wanted, and who owns the refused-swipe signal.
8. **Scared face on a hit and the idle blink**: the P2 expression edits are in the build already (16 sprites, ≈ 0.3 MB); using them costs nothing.
9. **Egg nest** (eggs lift 0.04 cell): yes / plain plate.

---

## 5. Hero / player self-check (the tile only)

Scored on the sheet, adversarially: *the strongest case for a 1* is that the proposed tile is still a flat plate with a sprite on it and a meter, and that the pit seating is one shadow. Against it: the plaque now has primary (seat, outline), secondary (band, lip, meter, badge) and tertiary (nest, straw, the altar and its crystal, halo, brackets) detail that reads at 48 px, every state has a shape cue, and loss, arrival and growth are physical motions in the pit. Hero / player: **2 today → 2.5 proposed** (the roamers and the fusion silhouette pass, owned elsewhere, decide the 3). No premium claim is made here; the fresh-eyes re-score belongs to the P1 capture set.
