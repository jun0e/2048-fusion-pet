# 2048 Siege: visual overhaul proposal

Art-direction proposal for the `ux-journey` build of 2026-10-15, written against the AAA graphics-builder skill (its scorecard, technical-art brief, model and render recipes, translated from Three.js to PixiJS 8 2D). It covers the four things the user asked for: UI / HUD / border / layout; projectiles with real sprites and trails; an attack progression the player can watch; and a monster roster where every enemy is its own animal with its own silhouette. It builds on the prior art work (the sticker/vinyl style brief, the asset list, the element basic attacks, the key-visual guides) and does not restart it.

Companion sketches in this folder (hand-authored SVG, theme-neutral):

- `silhouettes.svg`: the proposed roster as solid black shapes, with the 40 px on-screen copy of each.
- `hud-layout.svg`: the phone wireframe (390×844) with zones and rules.
- `attack-ladder.svg`: the progression strip for Fire, Ice and Wind, 16 → 4096.

Everything measured below was measured on the five input screenshots (`inputs/01..05`), the eight frames of the 2026-10-15 UI audit, and the 172 generated sprites in `public/assets/gen/`. Where a number is an estimate it says so.

---

## Revision 2 (no budget limits), 2026-10-16

The Gemini budget caps were removed (every limit in `tools/gemini-budget.json` is null; the ledger still logs spend). This revision re-checks every decision the budget had shaped, quality first with cost as information only, and runs the skill's external-asset sourcing gate for real: concept images were generated with `gemini-3-pro-image` on the Vertex express backend through a standalone script (`tools/gen-concepts.mjs`; the key is read from `.env.local` and handed to curl on stdin, never written to disk (`tools/curl-post.mjs`, shared with the pipeline); every image is logged with `appendLedger`/`costOf`), written only to `concepts/`. The photosafety rules, the 60 fps and readability targets, the 16 MB single-file limit, accessibility and the fork ownership are unchanged.

### R2.1 What changed and why

| Decision (Rev 1, budget-shaped) | Revision 2 (quality first) | Evidence |
|---|---|---|
| Rig parts cut by hand from one base sprite; no per-state art | One base sprite **plus generated state poses** per foe (attack telegraph, hit/flinch, death; 3 edits) and per pet stage (wind-up, follow-through), made as edits of the **1024 px raws**, not the shipped sprites; the code rig still animates cycles (flap, scissor, wag) with hand-cut parts because an edit does not isolate a wing or a tail reliably | `pose-fire-windup`: identity held, pose followed. `pose-ice-tailslap`: identity held, pose half-followed, and posterised because the input was the 320 px sprite |
| Fusion attacks = shape + add-on only | Shape + add-on stays the in-flight system (12–21 px cannot show more), and the two moments that are visible get unique art: **28 fusion impact decals** (the splat/scorch left on the lane) and **28 skill cut-in illustrations** for the namecard cast | the fusion sheets prove flat decals generate well; cut-ins are the portrait's natural companion |
| Nano Banana 2.1 ("fast"), 4 attempts | **`gemini-3-pro-image` for every hero surface** (foes, pets, fusions, portraits, VFX sheets, frame kits, backdrops); 3 candidates per hero asset, the twin and figure-ground tests pick, one retry on failure | all 24 concepts came from the pro model in 18–109 s each; quality is clearly a tier above the existing flash-image sprites |
| VFX cores and add-ons hand-drawn as SVG; impact sheets code-drawn | **Generated VFX sheets per element, auto-sliced** (`tools/slice-sheet.py`): tongues, embers, smoke, decals, ribbon segments, halo add-ons and 8-frame impacts come out as solid outlined shapes; hand SVG only for glyphs and HUD icons | `vfx-fire-sheet` → 22 sprites, `vfx-ice-sheet` → 20 sprites in one pass; one over-merge (two concentric ping rings) fixed by asking for clearer gaps |
| One painted backdrop, frame kit mostly code-drawn | **Three painted chapter backdrops, three frame-kit skins** (gates, parapet, towers, keep corners, hedge strips, road tiles), generated at 2048 and downscaled | `frame-kit-sheet`: usable pieces (8 slices), but isometric, with cream rims and a colour drift between pieces → the kit prompt must say "front elevation, flat, no rim" and carry the stone palette hard limit |
| Foes 256 px (bosses 384), pets 320 | Foes **512** (bosses 768), babies 384, fusions 512, portraits 512 in the build (1024 only for the codex/store) | sprites are drawn at 28–95 px; the headroom is for the inspect card and the bestiary |
| Per-stage pet poses deferred (P2) | **64 baby poses + 28 fusion attack poses in P1** | `pose-fire-windup` |
| W5 fusion silhouette pass in P2 | **In P1**, 3 candidates each, body plans assigned **roster-wide** with the IoU matrix, not per fusion | `fusion-smogpup-coil`: the coil silhouette was filled (0.66–0.73 against the seven fire fusions, down from 0.82) but it now overlaps the poison serpents (0.79 vs poison+nature) |
| Roster line-up sheet first, then crops (a call saver) | Direct per-foe generation from the **silhouette contract** (the sketch rasterised as a reference image) with 3 candidates | contract adherence 0.97 (hive queen), 0.65–0.71 (pangolin), 0.61–0.80 (macaque); low where the model "knows" another pose (fox trotting with its tail up 0.42–0.47; moth in 3/4 view 0.56–0.58) → the contract now also states the **view** and describes the **pose in words** |
| P0–P3 ordered by cost | P0 = the silhouette bible for all 17 foes and all 8 VFX sheets (the cheap, decisive assets), P1 = everything playable, P2 = codex art and polish | see R2.3 |
| Cut to save calls: boss banner portraits, bestiary portraits, ascended portraits, chapter props, death-part sheets | All back in: 3 boss banner portraits, 17 bestiary portraits, 28 ascended portraits (exist), 12 chapter props, 17 death-part sheets | — |

Two rules the concept round added to the contract (both measured, neither is about cost):

- **Facing rule.** `src/render/foes.js` flips a foe horizontally by the sign of its `dirX`, so the sprite contract is a strict **side profile facing left** for walkers and swimmers and a **symmetric top-down spread** for flyers with a wingspan (moth, bat; the production wyvern is a side-view glide, see below); both flip safely, a 3/4 view does not (the Moonmoth candidates a/b drifted to 3/4 and read like today's fairies: 0.68–0.71 against pixie and axolotlFairy). Tested: the moth regenerated with the view line and the two-value palette (`foe-moth-c/d`) filled its contract at 0.70 and **0.88** (from 0.56–0.58), fell to 0.63–0.64 against today's fairies, kept a 0.55–0.57 twin among the generated foes, and passed the lane (separating share 0.59 / 0.48), the hedge and the keep floor where a/b were "outline only" on the lane. The two-value re-dos landed in batch three: the fox with the pose in words (`foe-fox-c`) filled its contract at **0.92** (from 0.42–0.47) and passes the lane (0.73), but its cream chest is 26 % of the body and it stays weak on the hedge and the keep floor (0.27 / 0.32); the macaque (`foe-macaque-c`, slate fur, cream belly) reached **0.87** (from 0.61–0.80), passes the lane (0.65) and drops to 0.64 against its nearest roaming pet (from 0.73). The rule is therefore quantified below.
- **Two-value rule** (from the figure-ground check, `tools/figure-ground.py`, `concepts/figure-ground.png`). Every foe was composited at 48 px on the tones the proposal plans for its chapter (lane cobbles #D9C7A3, hedge #4A5A52, keep floor #3E3C58, lacquer plank, basalt and ash lanes) and scored by the share of its body whose L* differs from the ground by ≥ 20. Single-value foes fail wherever their one value meets its match: the pale moth (body L* 84) and macaque (L* 77) are "outline only" on the lane (separating share 0.11–0.35); the navy fox (L* 38) is outline-only on the hedge and weak on the keep floor (0.15–0.23). The two-value hive queen (black bands + amber) passes every planned ground (0.48–0.64). So: **every foe carries two anchored values: at least 30 % of its body at L* ≤ 40 (the mass) and at least 30 % at L* ≥ 75 (belly, chest, face or wing field)**, so that one of the two steps ≥ 20 L* from any ground; a quarter proved not enough (fox-c at 26 % light is still weak on the keep floor). The grounds obey the mirror rule: **light (L* ≥ 70: lanes) or dark (L* ≤ 40: hedges, keep floor), never mid**. A mid-slate keep floor (L* 51) was tested and rejected: it fails the mid-value foes instead; the lacquer planks (L* 45) stay small accents off the foe path; the Peaks lane must be ash-light rather than basalt-mid. The truth composite (`concepts/truth-composite.png`, generated foes at their real 27–35 px on a PIL-built ground with real tile values, no API) confirms it at scale: the fox is nearly invisible biting a tile on the keep floor, the moth is a pale blob on the lane, the fox, pangolin and macaque read as animals on the cobbles, the boss and the roaming pet read at ≈ 69 and 70 px. It also produced three corrections (review of the first composite): the all-over cobbles were too busy for 27–35 px foes (the mean-value test cannot see clutter, so a clutter metric was added and the lane spec now has a calm centre band, 4.2); the red-tinted foe shadow read as a wound and is replaced by the plum shadow everyone gets; and the foes themselves are too small at today's size (R2.5). The second composite, `truth-composite-sized.png`, shows the proposed sizes (R2.5) on the calm lane.

**Production note (2026-10-16): the wyvern.** All six Crag Wyvern candidates followed the roster text (a side-view glide, one wing raised) instead of its sketch, and the best one reads clearly as a pterosaur-like glider and looks like no other foe (twin 0.47). That sprite was approved, and its own outline became its contract (`tools/refs/foes/sil-wyvern.png`), so its contract gate now scores 1.0 by construction; only the twin, ally and ground gates still judge it. The spread view is for the moth and the bat.

### R2.2 Concept images and what each proves

All in `reports/art/visual-overhaul/concepts/` (model, prompt, references, timing and price per image in `manifest.json`; the contact sheet is `_index.jpg`). Git keeps the keyed cut-outs (`*.keyed.png`), the composites and the JPEG style frames; the raw 1024 px generations stay local (`concepts/.gitignore`). The style frames are **composition only**: their lane foes are model-invented, top-down and at no known scale, and their tile numbers are fake.

| Image | Validates | Disproves or warns |
|---|---|---|
| `style-forest.jpg` (composition only) | The whole composition at once: stone keep with corner towers, parapet with four braziers (one lit), cobbled lanes with hedges, four gate arches (two open), the lintel with wave, foes meter and keep grid, the news ribbon in the sky, cards on the right tower, three different animals in the lanes | concept noise: ribbon drawn above the lintel; human faces on the cards; fake tile numbers; model-invented top-down foes at no known scale; fire tongue on the board with a soft glow |
| `style-fareast.jpg` (composition only) | Chapter skinning works (lacquer planks, lanterns on the hedges, red gate banners); boss HP bar with a portrait chip in the lintel; the pagoda-shelled hermit crab (roster #12) confirmed as a strong boss silhouette at the gate; the wind ribbon with feathers and the fox's dust streak read | concept noise: the pangolin walks on two legs (breaks its own contract); the literal text "News ribbon"; human faces on the cards; fake numbers; saturated element tiles (not the Rev 2 pick); foes with cream rims; the crab far larger than the lane |
| `style-peaks.jpg` (composition only) | Basalt lanes with ember cracks, ibex/bat/snail as distinct animals, a legendary pet with its halo, lightning as a link chain | concept noise: bright white bolts (production: cream links, no additive); plain cream tiles (not the Rev 2 pick); fake numbers; the lane reads as a wall, so the ash-lane alternative is still open; no Peaks foe was generated, so the Peaks figure-ground check is a gap |
| `foe-fox-a/b/c.png` | Species, role and the foe treatment (muted navy, red scarf accent, no rim) at the first try; c, with the pose in words and the cream chest, fills the contract at 0.92 and is the candidate in the composites | a/b: contract 0.42–0.47 (a trotting pose with the tail up); c: the 26 % light zone is still weak on the hedge and keep floor, which set the 30 % rule |
| `foe-pangolin-a/b.png` | The silhouette contract on a compact body (0.65–0.71); scales, hooked tail, jade accent; passes the lane and the keep floor | weak on the hedge and the lacquer plank |
| `foe-macaque-a/b/c.png` | Contract 0.61–0.80 (a/b) and 0.87 (c, slate fur + cream belly); the clashed cymbals read as a telegraph pose; c passes the lane (0.65) and the ally gate (0.64) | a/b: pale fur, weak on the lane (0.29–0.35); b overlaps the poison+metal fusion at 0.73 |
| `foe-hivequeen-a/b.png` | b: contract 0.97, two-value, passes every planned ground; the boss reads at 69 px | a (gold on cream, single value) is weak on the lane: the two candidates are the two-value rule's own A/B |
| `foe-moth-a/b.png` | Palette and eye-spot accent; both are charming | 3/4 view (contract 0.56–0.58), pale on the lane (outline only), and 0.68–0.71 against today's fairies: the one roster entry whose contract had to be rewritten (view + two-value) |
| `vfx-fire-sheet.keyed.png`, `vfx-ice-sheet.keyed.png` | Generated VFX sheets as solid outlined shapes: tongue flicker variants, embers, smoke, scorch decal, ribbon segment, sun-ray add-on, 8-frame splash; harpoon, shards, tether, contracting pings, ice block, frost ring, crack, 8-frame shatter; auto-sliced into 22 and 20 sprites (`concepts/slices/`) | one over-merge (concentric rings): ask for clear gaps; the slicer's grouping gap is a parameter |
| `ladder-fire.jpg`, `ladder-ice.jpg` | The attack ladder is legible left to right in one glance, including the fusion colour + add-on step and the apex halo | the model adds a glow at the fusion panel: production VFX never do |
| `frame-kit-sheet.keyed.png` (+ 8 slices) | The kit pieces exist as a set: keep corner, parapet unlit/lit brazier, hedge, gate closed/open, pillar, road | isometric projection, cream rims, sand-vs-grey drift between pieces: the kit prompt needs "front elevation, flat, no rim" and the stone palette hard limit |
| `frame-road-tile.jpg` | A seamless, tileable cobble texture in the stone palette comes out in one call | far too busy for the lane: L* std 22 and a neighbour step of 11.6 at the planned 128 px repeat against the ≤ 4 gate; usable only in the edge bands or with the grout lightened to within 8 L* of the stones (the calm-centre spec in 4.2) |
| `pose-fire-windup.keyed.png`, `pose-ice-tailslap.keyed.png` | Pose edits keep identity (horns, wings, spikes, frost, rim) | pose compliance varies (the tail-slap became a sonar call); edit from the 1024 px raws, the 320 px source came back posterised |
| `fusion-smogpup-coil.keyed.png` | The silhouette contract works for fusions (coil + raised neck + dragon head filled; 0.66–0.73 vs the fire fusions, from 0.82) | the plan collides with the poison serpents (0.79): assign body plans roster-wide |
| `figure-ground.png`, `truth-composite.png`, `truth-composite-sized.png` | The two-value rule, the dark keep floor, the calm lane centre (clutter metric), the plum shadow, the tile pick; foes at real size read on the planned lane when their main mass is mid-dark; the proposed sizes (37–54 px) fill the lane without crowding it | pale single-value foes do not read; the fox vanishes on the keep floor until it gets its cream chest; at today's 27–35 px the small foes are below this proposal's own 32 px floor |

Rate limit: the pro model answers in ≈ 20 s, but Vertex's shared capacity returned 429s ("resource exhausted") at concurrency 2 and sometimes at 1; 4 of 26 jobs were skipped after 20 + 60 + 120 s of backoff and all 4 were made on a later run with a patient backoff (30/90/180/300 s; one took 671 s). Production runs at concurrency 1 with the pipeline's two-minute cap wait: ≈ 40–100 images an hour.

### R2.3 Phases and counts, Revision 2 (list price for information)

Prices: `gemini-3-pro-image` $0.134 per image (Vertex list, `tools/gemini-budget.mjs`); every hero asset is made as 3 candidates with one retry allowed, so calls ≈ 3.3 × shipped assets.

| Phase | Scope | Approved images | Calls (est.) | List price (est.) |
|---|---|---|---|---|
| **P0 silhouette bible + VFX kit** (≈ 2 weeks) | 17 foe bases from the silhouette contract (3 candidates, twin + figure-ground gates); 8 element VFX sheets (2 candidates each, sliced); Forest and Fareast frame kits + road tiles (2 candidates); the HUD lintel/ribbon/rail in DOM; trails and rig systems | 17 + 8 + 4 + 2 = 31 | ≈ 110 | ≈ $15 |
| **P1 playable set** (≈ 5 weeks) | foe poses 17 × 3; boss banner portraits 3; pet silhouette pass 28 fusions × 3 candidates; fusion attack poses 28; baby regeneration at 384 (35) + 64 baby poses; portraits at 512 (28 exist, 28 ascended exist); apex kits at 512 (8); Peaks frame kit + road tile; 3 painted backdrops; 28 fusion impact decals; 28 skill cut-ins; full HUD; wave preview chips; boss bar | 51 + 3 + 28 + 28 + 99 + 8 + 2 + 3 + 28 + 28 = 278 | ≈ 760 | ≈ $100 |
| **P2 codex and polish** (≈ 3 weeks) | 17 bestiary portraits; 17 death-part sheets; 12 chapter props; parallax strips; reduce-motion variants | 46 | ≈ 150 | ≈ $20 |
| **P3 store** | 12 compositions, human finish | 12 | ≈ 36 | ≈ $5 |
| **Total** | | **≈ 370** | **≈ 1,060** | **≈ $140** |

Concepts made for this revision: **26 images, all `gemini-3-pro-image`, $3.48 at list price**, logged in `tools/.cache/gemini-usage.json` with keys `concept.*` (26 entries, same total).

**The binding constraint is now the single file, not the API.** Shipped at the resolutions above and WebP q88 (the pack script's setting), the set would weigh ≈ 15 MB of sprites plus 1.7 MB of code, over the 16 MB limit. Revision 2 therefore fixes a **shipped-asset budget of ≤ 12 MB**: sprites packed at q80 (≈ −25 %), portraits and cut-ins at 384 px in the build (512/1024 only for the codex and store), death handled by the rig's part scatter instead of death sheets in the build, and `npm run pack` printing the embedded MB as a gate (it already prints it).

| Shipped group (Rev 2) | Count | Est. size in the file |
|---|---|---|
| Foes: 17 bases + 34 poses + parts | ≈ 68 sprites | ≈ 2.4 MB |
| Babies: 35 + 64 poses | 99 | ≈ 1.6 MB |
| Fusions: 28 + 28 poses | 56 | ≈ 2.4 MB |
| Portraits 28 + ascended 28 (384 px) | 56 | ≈ 1.6 MB |
| VFX atlas (8 sliced sheets) + 28 impact decals + 28 cut-ins (384 px) | 1 atlas + 56 | ≈ 1.4 MB |
| Frame kits ×3 + road tiles + backdrops ×3 | ≈ 30 | ≈ 1.8 MB |
| Apex kits, badges, eggs (exist) | 19 | ≈ 0.3 MB |
| **Total** | | **≈ 11.5 MB** (+ 1.7 MB code) |

### R2.4 Scorecard targets, re-checked

With pro-model art on every hero surface, generated VFX kits and painted chapter skins, the P1 bar rises: **P1 ≥ 2.5 average** (Obstacles 3 and World 2.5 become feasible at P1), **P2 ≈ 2.7**, which is the skill's showcase threshold if six categories reach 3 (Art direction, Hero, Obstacles, VFX, UI, Performance evidence are the candidates). Section 8.5 carries the per-category targets. The current score is unchanged (1.50): nothing in the game has changed yet.

### R2.5 Foe size: a proposal to the sim and render owners

Measured in the composite, a regular foe today spans 27–35 CSS px (the sim's `size` 0.38–0.50 × 2.5 world units × `GEN_FILL` 0.8 in `src/render/foes.js` × U ≈ 35 px), under the 32 px floor and the 40 px silhouette target this proposal set for itself. Proposed: **`GEN_FILL` 1.0** (the trimmed sprite fills its box) and **a `size` floor of 0.42 for the S class** (today 0.32–0.38), which gives S/M/L ≈ 37 / 40 / 44–54 px and bosses 86–95 px (`truth-composite-sized.png`). What it touches:

- **Hit-boxes: nothing.** `defense.js` never reads `def.size`; hits use `HIT_RADIUS` 0.35 u, `SIEGE.contact` 1.15 u and lane/cone tests on centres. The change is render-only, but it is the sim owner's call because the sprite will now overhang the point the sim treats as the foe.
- **Lane spacing.** A lane is 1.45 u ≈ 51 px wide; a 37–44 px foe still walks single file. Burst members already spawn 0.4 s apart (0.64 u ≈ 22 px at base speed, less than a foe's height), so bigger sprites overlap more: propose a deterministic lateral jitter of ± 0.25 u for burst members (render-only, from the foe id) or a 0.6 s burst gap (sim).
- **Light budget.** A hit flash books `FOE_FLASH.share` (0.25) × size² where size is the sim box (`size` × 2.5 u), so `GEN_FILL` costs nothing and the S-class floor raises an S foe's booking from ≈ 0.18–0.23 to 0.28 u² (+25 % for that class only); the budget still clamps how many flash at once. Better: make the hit flash a **rim flash** (the outline turns cream for 0.12 s; lit ≈ perimeter × 0.08 u ≈ 0.3 u² for an M foe, flat across sizes) instead of the full additive silhouette; it reads more clearly on the two-value foes too.
- **Pets.** Fusions at 1.0 cell (70 px) and legends at 1.15 keep the ratio pet ≈ 1.7× foe, boss ≈ 2× foe.

---

## 1. Executive summary

The game already has a strong, defensible art direction for its heroes (the sticker babies on tiles, the sticker fusions on the field, the soft-vinyl portraits on the cards) and a cohesive clay HUD. What it does not have is a world and a war that look as authored as the pets: the enemies are one chibi humanoid base with props glued on (every foe's closest twin at 40 px overlaps it by 0.67–0.91, where the project's own fusion study calls 0.70 a near twin), the lane field is four flat cream rectangles on a tray, and combat is drawn with primitive FX (additive soft-dot glows, white rings, thin additive lines, oversized white blobs for projectiles) that neither identify an element at a glance nor change as a block grows from 16 to 4096. The reconciled current score is **1.50 / 3** (builder 1.55, independent fresh-eyes reviewer 1.70) with four automatic failures. The proposal keeps the sticker direction and spends the overhaul on the four surfaces that are still at prototype level, in a way that stays inside the photosafety light budget by design: shape, motion and silhouette carry the information; brightness never does. Target after the launch set (P1): **every category ≥ 2, average ≥ 2.3** (the skill's premium bar); after polish (P2): **≈ 2.5**.

The five biggest changes:

1. **A roster of 17 animals, one primary shape each** (moth, dormouse, beetle, axolotl, owl, salamander, hive queen; fox, pangolin, macaque, kite carp, pagoda crab; ibex, wyvern, bat, snail, wyrm). Measured on the sketches: closest-twin overlap at 40 px falls from 0.67–0.91 (median 0.79) to 0.30–0.59 (median 0.50), and no foe overlaps a roaming pet above 0.65. The silhouette sketch becomes the generation contract (the prompt gets the silhouette as a reference image), and a scripted twin test gates every generated sprite.
2. **A projectile system with authored sprites, per-element trails and a shape-plus-add-on fusion rule.** Eight small cores, eight trail types (ribbon, afterimage, particle, smoke, decal, tether), eight impacts; fusions = the first element's shape in the fusion colour plus the second element's add-on layer, so 28 fusions and 8 apex kits come from ~48 small sprites. Nothing additive; every booked effect declares its lit area.
3. **An attack ladder the player can watch:** every stage adds exactly one visible thing (a count, a trail layer, a secondary motion), mirroring the pets' one-motif-per-stage rule, and the pet's own body sells it (hop → wind-up → wind-up plus follow-through → full-body pose → serene halo dial).
4. **A siege you can see:** the board becomes a stone keep with a crenellated parapet, the lanes become cobbled roads with a tick per cell and hedges between them, the portals become gate arches (which also preview the next wave), and the warning glow becomes braziers. Foreground frame, mid field, far painting: three layers instead of one.
5. **A HUD that stays out of the lanes:** a chapter lintel (wave, foes meter, a 4×4 "keep grid" for blocks left, the boss HP bar when a boss walks), a single-line news ribbon in the sky, the namecard rail hung on the right tower where it can never cover lane 4, and a tile layout that keeps the number first. Plus the gates the skill asks for: renderer diagnostics, a silhouette CI check, the flash audit, and scorecard targets per phase.

---

## 2. Current-state critique

### 2.1 Visual scorecard (before)

Scored on active-play phone captures against the skill's anchors (`scene-1.jpg` ≈ 1, `scene-2.jpg` ≈ 2, `scene-3.jpg` ≈ 2.5–3). Categories are mapped to this 2D game as: hero = tiles and roaming pets; obstacles = lane enemies and bosses; rewards = coins, dice, namecards, inspect card; world = background, field, portals, board frame; materials = the sprite/plate rendering language; lighting = value structure, glows, depth; VFX = projectiles, trails, impacts, rings, popups. The fresh-eyes column is an independent reviewer who saw only the captures, the rubric, the anchors and the metrics (no code, no reports). Reconciled = the lower score, as the rubric requires.

| Category | Builder | Fresh eyes | Reconciled | Evidence (what was seen, where) |
|---|---|---|---|---|
| Art direction | 2 | 2 | **2** | One consistent sticker + clay language across tiles, pets, cards and HUD (`01-gameplay-wave6`, `05-inspect-card`). The foes and the field do not belong to it: the foes copy another game's roster (`README.md` "Enemies (from Slime Legion footage)"), the field is generic. |
| Hero / player | 2 | 2 | **2** | Babies with motif growth, dens with both glyphs, fusion animals with grafted parts, legend halos (`babies-sheet`, `fusions-sheet`, `02`). Weak: four identical ox pets in `02`, pets hide foes (`ui-audit/08`), 256+ dens are plates with no creature (`03`). |
| Obstacles / enemies | 1 | 1.5 | **1** | Six Forest foes are one butterfly-winged chibi (pixie/leafSprite IoU 0.91, axolotlFairy/hoodedFlier 0.80); five Fareast foes are one walking chibi (0.72–0.76); wyvern/redDragon 0.84; bosses are the same silhouettes larger (`enemies-sheet`, `enemies-sil40`, `01`, `ui-audit/05`). |
| Rewards / interactables | 2 | 1.5 | **1.5** | Coins fly to the counter, dice are badges, namecards have charge/ready/cut-in, the inspect card is authored (`05`, `ui-audit/02`). Weak: four duplicate portraits in a strip, plain die-pick swatches, flat coin disc. |
| World / environment | 1 | 1.5 | **1** | Four flat cream rectangles with chevrons on a plum tray, purple soft-dot portals, one dimmed painting behind (`04`, `ui-audit/03`). No frame, no props, no mid layer; the field crop measures the lowest edge density of any region (0.19). |
| Materials / textures | 2 | 2 | **2** | A real material system for creatures and tiles: plum ink, cream rim, one cel tone, bevelled plates, badges (`art-sheet`, `proportion-guide`). The lanes, tray, projectiles and FX sit at 1 (flat fills, white blobs). |
| Lighting / render | 1 | 2 | **1** | A deliberate value plan exists (dark frame, bright lanes, dark board) and the night painting gives depth; but every effect is an additive glow (soft dots at 1.8× the shot, rings, additive slashes) and large translucent discs wash the lanes (`01`, `04`, `ui-audit/04`). Glow is the effects style. |
| VFX / motion | 1.5 | 1.5 | **1.5** | Event-driven (hit numbers, kill bursts, coin drops, merge rings, announcements) but generic: `fx.js` has one soft dot, one ring, one spark and procedural line kinds; the ice "harpoon" is a 72 px white blob with a 130 px glow over a 29 px foe (`01`); Wing Gust is a thin additive line (`03`); nothing changes shape between 16 and 128 except a +7 %/tier size factor (`shots.js`). |
| UI / HUD | 2 | 2 | **2** | Genre-specific states (wave/break/boss pills, foes left, coins and swipe price, Wave now, Awakened/Fusion announcements, pause/settings, inspect card) in one cohesive style, 44 px buttons, 12 px floor (`hud.css`). Failures: banners sit over the lanes (`03`, `ui-audit/04`), the namecard strip sits over lane 4's edge (`02`, `03`), the inspect card overlaps the cards (`ui-audit/06`), the pill row reads as a dashboard. |
| Performance evidence | 1 | 1 | **1** | A real photosafety measurement exists (`tools/flash-audit.mjs`, `docs/ux/photosafe.md`) and 176 headless tests, but no renderer counts, no frame times on a device, no texture-memory numbers; build size is known (7.25 MB single file, 172 PNG sprites = 28 MB on disk). |
| **Average** | **1.55** | **1.70** | **1.50** | |

Adversarial one-liners (the rubric's "strongest case for a 1" before each score) are recorded in the reviewer's report and were used to settle the reconciled column; the two categories where the reviewer was more generous (World, Lighting) were kept at the lower score because the case for 1 ("four flat rectangles", "glow is the style") is what the player sees in every active frame.

### 2.2 Measured evidence

Image metrics with the sibling skill's formulas (16-level colour entropy, Sobel edge density at threshold 64, p95−p5 luminance contrast, dominant-colour share; long edge 512 px):

| Image | entropy bits | edge density | contrast | dominant share |
|---|---|---|---|---|
| anchor scene-1 (≈1) | 1.91 | 0.069 | 92 | 0.634 |
| anchor scene-2 (≈2) | 2.94 | 0.165 | 127 | 0.495 |
| anchor scene-3 (≈2.5–3) | 4.09 | 0.188 | 127 | 0.393 |
| 01-gameplay-wave6 | 6.82 | 0.334 | 230 | 0.077 |
| 02-legendaries-rings-popups | 7.44 | 0.427 | 232 | 0.069 |
| 03-gust-streaks-banner | 6.91 | 0.354 | 230 | 0.084 |
| 04-fusion-roam-namecard | 6.37 | 0.280 | 224 | 0.083 |
| 05-inspect-card | 5.62 | 0.273 | 230 | 0.210 |
| 01, lane field only | 5.85 | 0.186 | 207 | 0.167 |
| 01, board only | 6.57 | 0.304 | 213 | 0.114 |

These formulas were calibrated on dark 3D scenes; a bright outlined 2D game inflates all four by construction, so they prove only that the scene is neither sparse nor primitive-dominant. The one useful signal is relative: the lane field is the flattest region on screen (edge 0.19, one colour at 17 %), and the problem the user describes (sameness of enemies, plainness of FX) is invisible to pixel statistics, so a shape test was added:

**Silhouette twin test (measured).** Each enemy sprite's alpha mask was trimmed, scaled to a 40 px box and compared with every other (intersection over union, horizontal flip allowed). Closest twin per foe: pixie 0.91 (leafSprite), leafSprite 0.91, flameSprite 0.88 (elfRuler), elfRuler 0.88, wyvern 0.84 (redDragon), redDragon 0.84, axolotlFairy 0.80, hoodedFlier 0.80, kiteNinja 0.79, phoenix 0.78, ninja 0.76, villager 0.76, griffinChick 0.75, armoredSoldier 0.73, kiteMinion 0.73, ringMonk 0.72, dragonRider 0.67. Median 0.79. By the thresholds the project's own fusion study used (green < 0.60, amber < 0.70, red = near twin), **every current enemy is a red near twin of another.** The 28 fusion sprites have a median twin of 0.79 as well (same-animal families; the grafted B part is too small to change the mass), a secondary finding addressed in P2.

**On-screen sizes (computed from `stage.js`, `foes.js`, `shots.js`, `roam.js` at 390×844).** U ≈ 35 px per world unit, a cell is 70 px, a lane 51 px wide. A regular foe is 0.84 units ≈ 29 px (boss ≈ 69 px). A roaming fusion is 1.18 cells ≈ 83 px, a legend ≈ 92 px plus halo: **pets are bigger than bosses and 2.9× a foe**, which is why they hide the fight (`ui-audit/08`). An ice lance at tier 4 is 2.07 units ≈ 72 px with a 3.7-unit ≈ 130 px additive glow; its impact is 2.7 units ≈ 95 px (capped at 3.2). Combat reads at the wrong scale: shots are 2.5× the things they hit.

**Automatic failures present (rubric list):** obstacles are one repeated silhouette (`01`, `ui-audit/05`); UI overlaps the play path (banners over lanes in `03` and `ui-audit/04`, cards over lane 4 in `02`/`03`, card over cards in `ui-audit/06`); no renderer diagnostics after graphics work; and, borderline, glow/particles standing in for authored geometry in combat.

### 2.3 What is already right (do not touch)

The number-first tile layout and its contrast math; the plum ink + cream rim + one cel tone rule; the egg → baby → den → roamer arc; the soft-vinyl portraits; the clay HUD tokens; the photosafe light budget with its measured caps; the resume/pause/settings work from the phone polish; the Gemini pipeline's dependency ordering, budget guard and palette hard limit. The overhaul reuses all of it.

---

## 3. Target art direction

**Pillar statement:** *A sticker-book siege: cute pets defend a stone keep against a wild army, and everything that matters reads as a shape before it reads as a colour or a glow.*

The sticker/chibi direction stays. It won the prior style comparison on readability at 55–60 pt, number hierarchy, Gemini consistency, keying and file size, and the babies, fusions and portraits already exist in it. What changes is that the *rest of the frame* is brought up to the same authored level, under four pillars:

1. **Silhouette first.** Every creature, foe, projectile and HUD icon must be recognisable as a solid black shape at its on-screen size (foes 28–40 px, projectiles 12–21 px). Element identity is shape + glyph + colour, in that order (colour-blind rule). Enforced by a scripted test, not taste.
2. **A siege you can see.** The board is the keep; the lanes are roads to its gate; the portals are gates in the enemy's wall; the parapet is where the fight turns. Frame, field and painting form three depth layers. The frame is stone and timber in the clay palette, never a dashboard.
3. **Growth you can watch.** Each stage of a block (16 / 32 / 64 / 128 / 256 / 4096) adds one visible thing to the pet and one to its attack. The ladder is legible from across the room: longer, more numerous, better shaped; never brighter.
4. **Motion over brightness.** Combat reads through moving sprites, trails and impact shapes. No additive glow on the field; every non-moving effect declares its lit area to the light budget (`src/ux/photosafe.js`) and shrinks or yields when the cap is short. Reduce motion turns ribbons into fades and freezes the braziers.

Supporting rule (friend / foe): pets keep the cream rim, element ground ring and bright palette; foes get the dark outline with no rim, −25 % saturation, the two-value palette (7.3) and one bright accent (eyes or weak point) so hit flashes read. Contact shadows are the same plum-dark ellipse at 30 % alpha for everyone (Rev 2: the earlier red-tinted foe shadow is dropped; red is the game's damage colour, and a red pool under a foe read as a wound in the truth composite). The two rosters never share an animal.

Technical-art brief in renderable terms:

| Item | Decision |
|---|---|
| Hero surfaces | Tiles (number + creature), roaming pets, namecards, the 17 foes, the projectile cores. Must look authored at 28–70 px. |
| Support surfaces | Frame kit (towers, gates, lanes, parapet, keep), decals (scorch, splat, cracks, puddle), smoke, dust, status badges. Code-drawn or tiled, instanced through shared textures. |
| Material kit (named roles) | `ink` #2b1d2e (outline, numerals), `cream` #fffaf2 (rim, plates, numeral stroke), `clay` (#f6ead8 / #fffaf2 panels), `stone` (new: #cfcabf base, #a9a295 shade, #e9e4d8 light), `timber` (new: #8a6a43), `hedge` (new: #4a5a52), `foeShadow` (red-tinted, rgba(120,30,40,0.35)), element KEY colours (palette sheet) as signals only, `gold` #ffcf4a for legend trim. One-off colours are not allowed in the frame or HUD. |
| Lighting stack (2D) | Key from upper-left baked into sprites (one cel tone); rim = cream sticker rim (pets) / none (foes); contact = blob shadows (foe: red-tinted; pet: plum); depth = three value bands (painting ≈ 0.15–0.3 luminance, field 0.7–0.9, keep 0.1–0.2); glow only as the halo sprite of legends and the namecard ready state. |
| VFX language | Event-driven: fire (anticipation on the pet), shot (core + trail), impact (element sheet), status (badge + body cue), knockback (slide + dust), freeze (ice box), kill (parts scatter), merge (ring + burst), class (ring + announcement), skill (ring + burst + wash ≤ 0.08). Pooled; every effect names its `lit` and `life`. |
| Render budget (PixiJS, mobile) | ≤ 150 batches/draw calls in the worst wave; ≤ 5 texture atlases ≤ 2048² (pets, foes, vfx, frame, ui) ≈ 80 MB GPU; ≤ 10 per-frame `Graphics` redraws; 0 filters on the canvas during play; DPR cap 2 (already); 60 fps on a mid-range 2021 Android with 30 foes, 16 turrets, 4 pets, 24 live shots; single-file build ≤ 10 MB (limit 16). |
| Asset strategy (Rev 2) | `gemini-3-pro-image` for every hero surface: creatures, foes, poses, portraits, cut-ins, VFX sheets (auto-sliced), frame kits, road tiles, backdrops, impact decals (via `tools/pipeline.mjs` with the silhouette reference and the view/two-value rules); hand SVG only for glyphs and HUD icons; code for trails, rigs, the light-budget booking and the frame's dynamic parts. |
| Mobile fallback order | Drop smoke puffs → halve ribbon points → cap live shots at 16 → drop afterimages → drop parallax strip. Never drop silhouettes or the ladder's counts. |

---

## 4. UI, HUD, border and layout

Wireframe: `hud-layout.svg` (zones A–H, rules, vertical budget, owners). Summary:

### 4.1 Layout zones (390×844; all heights CSS px)

| Zone | y range | Contents | Change from today |
|---|---|---|---|
| A safe area | 0–47 | — | unchanged |
| B top bar | 52–96 | Pause and Speed as 44 px stone discs (left); score plate with best beneath (centre, tabular numerals, fixed width); top-block chip (right) | same elements, stone/clay instead of floating pills; nothing else may enter this bar |
| C chapter lintel | 102–132 | One 30 px stone bar: chapter crest + "Wave 6" · foes-left **meter** (fills down) · **keep grid** (a 4×4 glyph whose lit cells = blocks alive) | replaces three separate pills; on a boss wave the meter becomes the boss HP bar with a portrait chip (audit item 14) |
| D news ribbon | 136–164 | One line, 28 px, in the sky above the gates; wave-cleared and boss banners live here | banners leave the lanes (fixes the `03`/`ui-audit/04` overlap); the queue stays |
| E field frame | 166–470 | Towers left/right, four gate arches at the column centres, cobbled lanes with a tick per cell, hedges between lanes, the parapet at the bottom | authored frame instead of a tray; see 4.2 |
| Namecard rail | x 336–388, y 200–468 | 48–52 px cards hung on the right tower; charge = fill bar under the portrait; READY = inverted name pill + element rim | never over lane 4 (its right edge is x ≈ 325); 44 px cards on 360 px phones |
| Parapet | 446–470 | Crenellations, one merlon per column, a brazier per column | the brazier replaces the red additive column glow and the chevron flow as the attacked-lane cue (steady, small, photosafe by construction) |
| F keep | 470–754 | Stone frame with corner towers; 16 flagstone pits; tiles per the proportion guide | frame instead of a plum tray |
| G deck | 758–788 | Dice badges + a dashed "next die at 256" slot | the unlock rule becomes visible (audit item 17) |
| H bottom bar | 792–836 | Coin plate with price and a step tick; Wave now as a stone button | adds the price-step warning (audit item 15) |

Vertical budget: safe 47 · top 44 · lintel 30 · news 28 · field 304 · keep 284 · deck 30 · bottom 44 · safe 34 = 845. The field keeps its 8 world units above the keep (`FIELD.spawnY`), so `fitStage` continues to measure the bands from the DOM. On phones ≤ 700 px tall the news ribbon overlaps the lintel's bottom edge and the lintel drops the chapter name.

### 4.2 Frame treatment: board, lanes, portals

- **The keep (board).** A stone frame (9-slice sprite, `stone` roles) with four corner towers; slots are sunken flagstone pits with a 1 px `ink` groove, not flat rounded rectangles. The milestone border, den plates, legend gold frame and the number stay as specified in the proportion guide.
- **The parapet.** A crenellated wall where lanes meet the keep. One merlon per column; a brazier on each merlon. States: cold (unlit), warning (lit, steady flame sprite, 2-frame flicker at ≤ 4 Hz is *not* allowed: use a slow 2 s breathing scale), pressure (lit + a thin smoke column). This replaces `scenery.js`'s `dangerG`/`colG` additive fills and the chevron flow.
- **The roads (lanes).** Cobbled sand tiles (one 128×256 tiling texture per chapter, generated and checked for seams), a `hedge` strip between lanes (dark green-grey, 16 px) so a cream or pale foe always has a dark edge behind part of its body, and a tick mark per cell (the attack-range language: reach is counted in cells, so the lane shows cells). Chapter skins: Forest (moss edges, roots), Fareast (paper lanterns on the hedges, red bridge planks), Peaks (basalt or ash with ember cracks; the ash alternative, L* ≈ 63, is kept open until a Peaks foe passes the figure-ground check on basalt). Rev 2 rules from the truth composite: **a calm centre band**: the middle 60 % of the lane's width is low-contrast, low-frequency sand (patches ≤ 4 L* from the lane), and cobble detail lives only in the outer 20 % bands next to the hedges; the clutter metric in `tools/figure-ground.py` (L* standard deviation and mean neighbour step under a 48 px footprint) reads 4.1 / 1.97 for the first composite's all-over cobbles and 1.9 / 0.46 for the calm centre, and the gate is std ≤ 4 under any foe path. The lane's overall value stays light (L* 78–86) and the keep floor stays dark (L* ≈ 27); foes carry the two-value rule (7.3) so they read on both.

**Tile treatment (Rev 2 pick).** One treatment for every tile: a **light element tint on the plate** (what the game does today, `tone(element, 0.42)`; dens `tone(fusion, 0.18)` with the corner wedge; legends the gold frame), the **number on top** in ink with the cream stroke (4.95–13.4:1 on every plate), the **creature over the sill**, the **glyph badge**. Not the saturated element plates of the Fareast style frame (the number would lose its contrast and colour would carry identity alone) and not the plain cream plates of the Peaks frame (the tint is a free third channel beside creature and glyph). The two frames are composition only where they disagree; the truth composites use the pick.
- **The gates (portals).** Stone arches with a dark opening and an iris (the existing portal texture, now inside the arch and capped at the arch's inner radius). An open gate during a break shows the next wave's enemy chips (silhouette + count) in the opening: the next-wave preview the audit asked for, diegetic. The boss gate wears two red banners.
- **The towers.** Left and right stone pillars that frame the field and carry the namecard rail; the lintel rests on them. They are the "foreground" layer; the painted valley is "far"; between them a silhouetted treeline strip at the top of the field (one 390×60 sprite per chapter, 0.2× parallax on shake only) is "mid".
- **Range display.** The selected block's range band keeps its outline but loses the 22 % fill: ticks along the lane light up for the covered cells instead (a tick is 0.08 u² lit; a 5-cell band is 0.4 u², versus ≈ 3 u² for the current fill).

### 4.3 Panels, typography, iconography

- **Panels.** Three materials only: clay (cream plates for numbers and cards), stone (frame, lintel, buttons) and timber (the deck rail, dialog headers). Nested cards are not allowed; a dialog is one clay sheet on a scrim. Corner radii: 12 px (chips), 18 px (plates), 24 px (dialogs).
- **Typography.** Baloo 2 ExtraBold for numerals and titles, Nunito 700/800 for body; floor 12 px (13 px on the lintel at ≤ 380 px wide); all counters `font-variant-numeric: tabular-nums` in fixed-width slots; damage numbers keep the bitmap font. Colour: `ink` on clay, `cream` on stone/ink; element colours only in badges and signal states.
- **Iconography.** Redraw the stock stroke icons (pause, sound, speed, help, coin, blocks, share, settings) in the ink style: chunky, 2.4 px plum, filled where the metaphor needs mass (the asset list's `icon.*` row, P2). Status badges over foes keep their glyphs and gain a stack pip row (1–6 pips) beside the number so stacks read without reading digits. The keep grid glyph, the foes meter and the gate chips are new icons; the element glyphs are the colour-blind channel everywhere (deck, badges, cards, die-pick swatches: audit item 19).
- **Motion.** Count-ups ≤ 0.3 s, meter fills 0.25 s, READY shine once per 1.9 s (as now), ribbon slide 0.32 s. Reduce motion: fades in place (as now), braziers hold steady, no shake, ribbons fade instead of racing.
- **States inventory** (unchanged set, all must exist in the new skin): run HUD, prep, wave, break, boss break/wave, die pick, board locked, out of coins, pause main/settings/confirm, help, game over + summary, loading/failure, rotate, tutorial coach.

### 4.4 Wireframe

See `hud-layout.svg`. The drawing is at 1:1 CSS px for 390×844 and names the owner of each zone (UX fork: B, C, D, G, H, the rail, dialogs; Art fork: the frame kit and the tile layout).

---

## 5. Projectiles and trails

All sizes in world units (1 cell = 2 u; at 390×844, 1 u ≈ 35 px; a foe ≈ 0.84 u). Design rule: a projectile body is 0.3–0.6 u (10–21 px), smaller than the foe it hits; impacts are 0.8–1.6 u; nothing is additive. Trail types: **ribbon** (a `MeshRope` with a scrolling 64×16 texture, 8–12 points of the shot's history), **afterimage** (2–3 ghost copies of the body at 60/30/15 % alpha, 80 ms apart), **particles** (the existing pool, normal blend, element colours), **smoke** (dark soft puffs, normal blend: free in the light budget), **decal** (a ground sprite that fades over seconds), **tether** (a 1 px line from the shooter to the shot).

Light-budget fit, per the measured shares in `photosafe.js` (ring 0.19 × diameter², explosion 0.28 × size², soft particle 0.51 × size², line length × width): moving bodies, ribbons and ghosts are outside the budget (they move rather than flash, as `photosafe.md` already rules); every static or appearing effect below books its `lit` with `fx` and is scaled down or skipped when the 10 u² cap is short. Values are design estimates to be confirmed with `tools/flash-audit.mjs`.

| Element (attack) | Projectile form | Trail | Impact | Sizes (u) | Lit per attack (est.) |
|---|---|---|---|---|---|
| Fire (Ember Breath) | Not a shot: a **flame-tongue sprite** that rolls up the cone from the pet's mouth to the reach, 3 frames flickered by alpha, plus 3–6 **ember** sprites | particles (embers, gravity up) + smoke puffs at 128+ + a scorch **decal** on the lane | foes caught get a 0.6 u ember lick ring | tongue 1.0×0.7 moving; embers 0.18; scorch 0.6 | tongue 0.35 (booked while visible) + embers 0.1 + licks 0.27 ≈ **0.7** |
| Ice (Echo Harpoon) | A narrow **crystal harpoon** 0.6×0.18 with a **tether** line back to the pet that snaps on hit; the **ping** is a ring that contracts onto the target (0.9 → 0.2) | afterimage (2 ghosts); at 128 two **shard escorts** fly beside it | crystal shatter sheet 1.2 u + frost ring 0.8 u; every 3rd/4th hit boxes the foe in an **ice-block sprite** (0.8×0.9, alpha 0.42, held 1 s) | harpoon 0.6×0.18; ping 0.9; shatter 1.2 | ping 0.62 + tether 0.09 + shatter 0.40 + box 0.3 ≈ **1.4** (3-lane ping at 64+: +0.38) |
| Lightning (Horn Arc) | Instant: a chain of **bolt-link sprites** stretched between points (0.14 u wide, cream core, element edge, 3 link variants) | none (instant); **static sparks** (2–4 sprites) cling to each struck foe for 0.3 s | spark star 0.8 u; the horn **charge** sprite on the pet 0.15 s before the bolt (needs `cooldownLeft`, see 6) | link 0.14 wide; chain up to ~10 u at 6 foes | links ≈ 1.4 at 128 (vs ≈ 3.7 for today's glow line) + sparks 0.3 + star 0.18 ≈ **1.9** |
| Poison (Venom Spit) | A wobbling **glob** 0.45 u with a drip tail, lobbed on the existing arc | particles (3–5 drips falling behind) | **splat decal** 1.0 u that grows into the puddle (2–2.5 u) as a normal-blend ground decal at alpha ≤ 0.25 (below a 10 % luminance change on the cream lane: books 0); bubbles pop now and then | glob 0.45; splat 1.0; puddle r 1–1.25 cell | splat 0.28 + drips 0.02 + bubbles 0.05 ≈ **0.35** |
| Earth (Quake Stomp) | Not a shot: three **crack decals** radiate from the pet's lane across the three lanes, and a **dust wave** half-ring (sand on sand: free) travels 1.5–2.5 cells; pebbles hop | particles (pebbles with gravity) + smoke (dust) | foes get stun stars (tiny sprites, not light) and the knockback **slide + dust streak** | cracks 1.5×0.06 each; wave 1.45×0.6; pebbles 0.14 | cracks 0.27 + pebbles 0.06 ≈ **0.35** per lane, ≈ 1.0 for three (vs ≈ 4.2 for today's three rings) |
| Wind (Wing Gust) | Not a shot: a **feather-gust ribbon** races up the lane (0.35 u wide, mint on cream: a 7 % luminance change, below threshold, books 0) with 1–5 **feather** sprites tumbling in it | ribbon + particles (feathers) | pushed foes tilt back and slide with a **dust streak** decal; no burst | ribbon 0.35 × up to 10 u (moving) | ≈ **0.1** (vs ≈ 2.4 per lane for today's slash) |
| Metal (Pride Pounce) | The **pet itself** leaps (arc jump on the sprite, no projectile) | afterimage (3 ghosts of the pet) + dust puffs at launch and landing | gold **claw-slash** sprite 0.8 u on the prey (cream/gold on cream: low delta) + a coin glint; at 128 the **loot mark** glyph stays on the prey | slash 0.8; ghosts = pet size | slash 0.1 + glint 0.05 ≈ **0.2** |
| Nature (Bramble Shell) | Not a shot: a **thorn ring** that grows around the tile as a **sweeping arc** (a 90° bramble segment travels clockwise, so a quarter of the ring is lit at a time), **vine tendrils** reach rooted foes, spores drift up (regrow) | decal (the ring fades over the pulse period) + particles (spores, normal blend) | thorn pricks: a small leaf burst on each foe | ring r 1–1.5 cell, 0.15 u thick; tendril 0.1 wide | sweeping arc ≈ 0.7 + tendrils 0.3 ≈ **1.0** (a full bright ring would be 2.0–2.8) |

Fusion rule (keeps the README's): the first element's **shape** in the fusion colour; new: the second element contributes one **add-on layer** (fire: embers; ice: frost shards; lightning: a spark crackle; poison: a drip; earth: pebbles; wind: feathers; metal: blade glints; nature: leaves). 28 fusions = 8 shapes × 8 add-ons, no new sprites. Apex (4096): the halo kit on the pet pulses with each attack and the signature keeps its existing wash (≤ 0.08 alpha, Sun ≤ 0.04). Dormant blocks (< 16) keep the pebble.

Worst case (estimate): a full board of 16 stage-3 blocks fires ≈ 12 attacks/s (rates 0.45–1.0/s); with 0.1–1.9 u² per attack (mean ≈ 0.7) and lives of 0.2–0.4 s the expected simultaneous lit is ≈ 2.5 u², leaving ≥ 7 u² for impacts, pings and the pets' skills; the budget still clamps the peaks, as it does today. The design simply stops *depending* on booked light for identity.

Sprite inventory (the projectile atlas, one 1024×1024): 8 cores (64²), 16 add-ons (32²), 8 trail textures (64×16), 8 impact sheets (8 × 96²), 24 decals (scorch, splat, cracks, dust streak, puddle, loot mark, ice box, stun stars…; 128² max), 3 bolt links, 1 tether, 1 claw slash. Rev 2: these come from **one generated sheet per element** (`gemini-3-pro-image`, flat magenta, "solid opaque shapes, no glow, clear gaps") auto-sliced by `tools/slice-sheet.py` into the atlas; the fire and ice concept sheets yielded 22 and 20 usable pieces each in one pass (`concepts/slices/`). Cores are still tinted at runtime for fusions (white-ish bodies, plum outline), so the sheets ask for the element colours only as the shade tone. Hand SVG remains for the 8 glyphs and the HUD icons.

---

## 6. Attack progression ladder

Rule: **every stage adds exactly one visible thing** (a count, a trail layer, or a secondary motion), the same way a pet adds one motif piece per stage. The pet's body sells the stage: 16 = a tiny hop on fire; 32/64 = a wind-up (crouch, tail-slap, wingbeat) before the shot; 128 = wind-up + follow-through recoil; 256 = a full-body pose from where the pet stands on the field; 4096 = no squash, the halo is the charge dial. The wind-up needs one sim getter, `defense.cooldownLeft(id)` (the cooldown map exists in `defense.js`), so the renderer can start the anticipation 0.12 s before the shot; `grow(s)` in `classes.js` already carries the numbers each stage changes, and the events (`breath`, `gust`, `pulse`, `quake`, `pounce`, `ping`, `impact`) carry `tier`, so the visual ladder needs no new sim rules beyond that getter and a small `pushed` event for knockback.

Strip for Fire, Ice and Wind: `attack-ladder.svg`. Full table:

| Element | 16 (stage 1) | 32 → 64 (stage 2) | 128 (stage 3) | 256 fusion (pet roams) | 4096 legendary (apex) |
|---|---|---|---|---|---|
| Fire | 3 embers in a 2-cell cone, no trail | tongue sprite rolls up the cone (2.3 → 2.7 cells), 4 embers, scorch mark | tongue 3 cells, ember rain (6), smoke puffs | tongue in the fusion colour + partner add-on riding its edge; pet aims from the field | second lick, halo pulses per breath, Sun wash (≤ 0.04) every 2 s |
| Ice | one ping ring contracts onto the toughest foe; harpoon on a tether | ping covers the neighbour lanes (3 rings); harpoon gains an afterimage trail | two shard escorts (count 1 → 3); every 3rd hit boxes the foe in ice | harpoon in the fusion colour + partner add-on at the tip; thrown from where the pet swims | Timestop clock halo ticks to the freeze; every foe boxes at once; wash ≤ 0.08 |
| Lightning | one bolt chain to 3 foes, links only | horn charge sprite before the bolt; chain to 4–5 foes; sparks cling to the struck | twin links (two parallel chains, 0.1 u apart); chain to 6 | fusion-coloured links + partner add-on at each strike point | Tempest: sky bolts as link chains from the gates (3 strikes / 1.5 s, capped to 2 lanes' worth of lit) |
| Poison | one glob, splat, 1-cell puddle for 3 s | glob leaves drips; puddle 1.25 cells, 4 s, bubbles | glob splits in two on landing; puddle 1.5 cells, 5 s | fusion-coloured glob + partner add-on; the puddle takes the fusion tint | Plague: drip ropes between poisoned foes every second (the `spread` lines become rope sprites) |
| Earth | stomp: one crack decal per lane, 1.5 cells deep, dust wave | pebbles hop (count 4); wave 2 cells; stun 0.4 s stars | second wave 0.15 s behind the first; wave 2.5 cells; 3 lanes keep their own cracks | cracks in the fusion colour + partner add-on in the dust | Meteor: the existing streak, now with a smoke trail and a crater decal that persists 4 s |
| Wind | one ribbon up the lane, one feather, foes tilt | three feathers; push 0.5 → 1 cell with a dust streak | three lanes: centre ribbon full, neighbours at 45 % width; feather flurry | ribbon in the fusion colour + partner add-on in the stream | Vortex: the spiral halo winds up over 8 s; every lane's ribbons curl back toward the gates together |
| Metal | the cub pounces (arc jump), one claw slash | mane afterimage (3 ghosts), dust at launch and landing; bite chance 30 % shows as a bigger slash on bites | loot-mark glyph stays on the prey; double slash (X) on a killing bite | fusion-coloured slash + partner add-on; the pet pounces from the field | Midas: the gild is a gold rim sprite on every foe (not a wash) every 4 s |
| Nature | thorn ring sweeps once around the tile (r 1 cell), one tendril | tendrils to each rooted foe (count 3); spores drift to healed neighbours; r 1.25 | three blossoms open on the ring; r 1.5; thorns 40 % reads as bigger pricks | ring in the fusion colour + partner add-on on the blossoms; the roaming pet carries a smaller ring with it | Lifebloom: petals fall on every repaired block (particles), no wash |

What the sizes do: body and impact sizes grow by the existing +6–7 %/tier only; the ladder's "bigger" is reach (cells), count and layers, which is what the sim already changes.

---

## 7. Monster roster

### 7.1 Mapping

Keys stay (`src/sim/enemies.js`); only `name` strings and sprites change, so waves, HP, speed, `castle` and boss rules are untouched. `flying` is cosmetic in the sim, so it maps to "hovers with a detached shadow" where the animal flies and to a walk where it does not. Size classes today (sim `size` × 2.5 × `GEN_FILL` 0.8 at U ≈ 35): S ≈ 22–27 px, M ≈ 28–33 px, L ≈ 35–44 px, XL (boss) ≈ 70–95 px; Rev 2 proposes raising them (R2.5): S/M/L ≈ 37/40/44–54 px, bosses 86–95. Palettes are the chapter key at −25 % saturation plus one bright accent, in the two-value scheme; all foes share the foe treatment (ink outline, no rim, plum contact shadow at 30 %).

| # | Current (key · name · hp/spd · size) | Proposed animal (display name) | Silhouette shape language | Size | What the shape reads as | Palette (muted base · accent) | Animation set (code-driven parts) |
|---|---|---|---|---|---|---|---|
| 1 | pixie · Pixie · 1.0/1.0 · 0.42 fly | **Moonmoth** (luna moth) | wide delta: two broad wings, small furry body, two tail streamers, feather antennae | M | swarm flyer, average | dusty mint wings · cream body · pink eye-spots | body + 2 wing pairs (flap 6 Hz, 2 frames each), streamers trail (rope), hover bob, hit squash, death = wings scatter |
| 2 | griffinChick · Griffin Chick · 0.55/1.3 · 0.34 | **Dormouse** | ball + head ball + two round ears + a long tail curling over the back | S | fast, fragile, skittering | hazel · cream belly · black bead eyes | body + tail (wag), ear twitch, 10 Hz scurry bounce, hit = tumble, death = puff |
| 3 | leafSprite · Leaf Sprite · 1.4/0.9 · 0.42 fly | **Shield Beetle** | low dome with the elytra lifted in a V, mandibles in front, six legs | M | slow, tough, armoured | moss green · bark · amber eyes | body + 2 elytra (open/close), leg scissor via squash, lands to bite, hit = elytra clamp, death = shell halves fall |
| 4 | axolotlFairy · Axolotl Fairy · 0.9/1.35 · 0.40 fly | **Gillnewt** (axolotl) | diagonal sausage swimming up-left with a crown of 3 gill fronds and a paddle tail | M | fast swimmer, slippery | dusty pink · cream · coral fronds | body + tail (wave) + frond pair (sway), swims in an S, hit = flinch, death = bubbles |
| 5 | hoodedFlier · Hooded Flier · 2.4/1.0 · 0.50 fly | **Horned Owl** | tall egg with two ear tufts and wings half spread at the sides, talons | L | the chapter's tank; heavy flyer | bark brown · cream facial disc · amber eyes | body + 2 wings (slow 2 Hz flap), head swivel on retarget, hit = feathers, death = wings fold and drop |
| 6 | flameSprite · Flame Sprite · 1.6/1.05 · 0.44 fly, fire | **Ember Salamander** | low S-curved crawler, four splayed legs, tail curling up into a flame tip | M | fire crawler; a walker (ground shadow) | charcoal · ember-orange spots (accent) | body + tail (flame wag 4 Hz), leg scissor, ember trickle particles, hit = spot flash, death = ash puff |
| 7 | elfRuler · Elf Ruler (boss, heals) · 28/0.5 · 0.95 fly | **Hive Queen** | low head with a crown, thorax, big hanging abdomen, two long narrow wings streaking up and back, stinger | XL | boss healer: a mother ship | amber · black bands · gold crown | body + abdomen (pump on heal) + 2 wings (blur flap), heal = pollen drift to allies, hit = wing flare, death = crown drops + bees scatter |
| 8 | ninja · Ninja · 0.9/1.6 · 0.38 | **Nightfox** (kitsune) | low running dash with upright ears and a big brush tail | S | runner, fragile, fastest | ink navy · cream tail tip · red scarf (accent) | body + tail (stream) + ear flick, 3-frame run via squash, speed lines, hit = yelp hop, death = smoke poof |
| 9 | armoredSoldier · Armoured Soldier · 2.2/0.8 · 0.50, physRes 0.3 | **Pangolin Guard** | scaled wedge, head low, thick tail hooking up over the rump | L | armour, slow (physRes read as scales) | lacquer brown · jade scale edges · pale belly | body + tail (curl), scale ripple on hit (2-frame), curls into a ball on heavy hits (0.3 s), death = scales fall |
| 10 | ringMonk · Ring Monk · 1.8/0.9 · 0.46 fly | **Cymbal Macaque** | lotus float: ball body, ball head, arms raised with two discs meeting above (a Y on a ball) | M | floater; the clash telegraphs its bite | snow-grey fur · red face (accent) · brass cymbals | body + 2 arms (clash on attack with a ring sprite), hover bob, hit = cymbals drop, death = cymbals roll |
| 11 | kiteMinion · Kite Minion · 0.6/1.4 · 0.32 fly (summoned) | **Kite Carp** (koinobori) | horizontal streamer: round open mouth, tube body, fan tail | S | summoned swarm; flutters | paper cream · red scales (accent) | body + tail fan (flutter 8 Hz), sine drift, hit = crumple, death = paper scraps |
| 12 | kiteNinja · Kite Ninja (boss, physRes 0.5, summons 4) · 34/0.55 · 0.95 fly | **Pagoda Crab** | wide flat base, stepped pagoda shell, two claws raised like side towers (a U) | XL | armoured boss (shell), carries its summons as banners | lacquer red shell · ink legs · gold eaves | body + 2 claws (snap telegraph) + 8 legs (scuttle), banners flutter, death = pagoda collapses and 4 kite carps fly out |
| 13 | villager · Villager · 0.8/1.1 · 0.38 | **Crag Ibex** | compact box body with two big back-curving horns, beard, head-down charge | M | charger, average | slate · bone horns (accent) · cream beard | body + head (lower on charge), 2-frame trot, hit = rear up, death = tumble |
| 14 | wyvern · Wyvern · 1.6/1.4 · 0.50 fly | **Crag Wyvern** (pterosaur-like) | thin wide wing bar, long crested head, no forelegs, whip tail | L | fast glider | basalt · ash wing membrane · ember crest (accent) | body + 2 wings (glide tilt, rare flap) + tail (rope), banks on lane change, hit = stall, death = spiral down |
| 15 | phoenix · Phoenix · 1.5/1.3 · 0.46 fly, fire | **Cinder Bat** | scalloped wings out, big ears, small body hanging between | M | fire flyer; erratic | charcoal · ember eyes and wing veins (accent) | body + 2 wings (6 Hz, 2 frames), zig-zag flight, hit = fold, death = ash |
| 16 | redDragon · Red Dragon · 4.0/0.75 · 0.62 fly, fire | **Magma Snail** | big round rock shell on a long low lava foot, eye stalks up front | L | the heavy: slow, huge HP | basalt shell · lava seams (accent) · dull orange foot | shell + foot (stretch/contract crawl) + 2 eye stalks (sway), lava drip particles, hit = stalks retract, death = shell cracks |
| 17 | dragonRider · Earth Dragon Rider (boss, fire, physRes 0.2) · 46/0.45 · 1.05 | **Lava Wyrm** | long segmented body, rising neck, crested head, dorsal spikes, no wings | XL | armoured fire boss that fills a lane lengthwise | obsidian · lava seams · bone spikes | 6 segments following the head (chain), head rear-up telegraph before the bite, seam glow pulse (≤ 2 Hz), death = segments fall one by one |

Chapter fiction (replaces "invading heroes"): Forest = the Wild Hunt; Fareast = the Paper Court; Peaks = the Ember Peaks. Each chapter's foes share a key palette so a wave reads as one army while its members read as different animals. No foe animal repeats a pet animal (dragon-lizard, bird, turtle, orca, snake, unicorn, lion, ox), which is why Red Dragon, Phoenix and Griffin Chick were recast.

### 7.2 "Solid black at 40 px" distinctness check (measured)

Method: each sketch symbol was rasterised, trimmed, fitted into a 40 px box and compared with every other and with the 28 roaming fusion sprites (IoU, flip allowed); details in Appendix B. The scratch script that produced these numbers is the seed of `tools/silhouette-check.py` (W8).

| Foe | Current closest twin | Proposed closest twin | vs nearest roaming pet |
|---|---|---|---|
| Moonmoth (pixie) | 0.91 leafSprite | 0.59 hive queen | 0.58 |
| Dormouse (griffinChick) | 0.75 flameSprite | 0.56 snail | 0.58 |
| Shield Beetle (leafSprite) | 0.91 pixie | 0.46 owl | 0.45 |
| Gillnewt (axolotlFairy) | 0.80 pixie | 0.50 dormouse | 0.44 |
| Horned Owl (hoodedFlier) | 0.80 leafSprite | 0.58 snail | 0.65 |
| Ember Salamander (flameSprite) | 0.88 elfRuler | 0.44 axolotl | 0.34 |
| Hive Queen (elfRuler) | 0.88 flameSprite | 0.59 pangolin | 0.64 |
| Nightfox (ninja) | 0.76 villager | 0.49 moth | 0.41 |
| Pangolin Guard (armoredSoldier) | 0.73 kiteMinion | 0.59 hive queen | 0.56 |
| Cymbal Macaque (ringMonk) | 0.72 ninja | 0.47 owl | 0.61 |
| Kite Carp (kiteMinion) | 0.73 armoredSoldier | 0.49 pangolin | 0.36 |
| Pagoda Crab (kiteNinja) | 0.79 pixie | 0.53 dormouse | 0.60 |
| Crag Ibex (villager) | 0.76 ninja | 0.53 hive queen | 0.64 |
| Crag Wyvern (wyvern) | 0.84 redDragon | 0.30 pangolin | 0.27 |
| Cinder Bat (phoenix) | 0.78 flameSprite | 0.49 moth | 0.44 |
| Magma Snail (redDragon) | 0.84 wyvern | 0.58 owl | 0.63 |
| Lava Wyrm (dragonRider) | 0.67 elfRuler | 0.48 axolotl | 0.42 |
| **Max / median** | **0.91 / 0.79** | **0.59 / 0.50** | **0.65 / 0.56** |

Gates for production: closest twin ≤ 0.60 for every foe, ≤ 0.55 within a chapter (the foes that share a wave), ≤ 0.65 against any roaming pet; the same test runs on the generated sprites, not only the sketches, and a sprite that fails is regenerated with a stronger silhouette instruction.

### 7.3 Prompt strategy for consistent silhouettes (pipeline), Revision 2

Tested on 5 foes (13 candidates) with `gemini-3-pro-image`; the exact prompts are in `tools/gen-concepts.mjs` and `concepts/manifest.json`.

1. **Silhouette bible first.** The sketch symbols are rasterised as black-on-white references (`tools/make-refs.py`, one per foe). They are the contract, and they go into the prompt as image 1.
2. **The contract says three things, not one:** (a) *shape*: "Image 1 is the exact silhouette to fill: keep its proportions, pose and outline exactly; do not add limbs, wings, props or accessories that would change it"; (b) *view*: walkers and swimmers "a strict side view (profile) facing left, no three-quarter turn, no perspective"; flyers with a wingspan (moth, bat) "seen from directly above with both wings fully and symmetrically spread like a pinned specimen" (the renderer flips by `dirX`, so both views are flip-safe and a 3/4 view is not; the moth's contract adherence went from 0.56–0.58 to 0.70–0.88 with this line); (c) *pose in words* that match the silhouette ("tail held low and straight behind, body level, legs mid-stride"), because the model otherwise draws the pose it knows for the animal (the fox came back trotting with its tail up, contract 0.42–0.47).
3. **Two-value rule in the prompt and the palette:** "the main body mass is dark and at least a third of the creature is a clearly lighter cream zone (belly, chest, face or wing field)", with a hard colour rule of 4 chapter colours + 1 accent + the outline; measured as ≥ 30 % of the body at L* ≤ 40 and ≥ 30 % at L* ≥ 75. The accent is for eyes or a weak point only; it does not count toward separation.
4. **Rendering reference:** image 2 is one approved foe of the chapter (outline weight, cel tone, eye style); the first chapter uses an existing clean enemy render until its first foe is approved.
5. **Three candidates per foe, from the pro model, 512 px (bosses 768), one subject per call, concurrency 1** (a per-minute quota returned 429s at concurrency 2).
6. **QA gates in `tools/post.py` (three, all automatic):** keying as now; **contract** IoU of the keyed sprite against its silhouette reference ≥ 0.6 (≥ 0.75 strong); **twin** closest-other-foe IoU ≤ 0.60 (≤ 0.55 within a chapter) and ≤ 0.65 against any roaming fusion; **figure-ground** separating share ≥ 0.4 on the chapter lane, the hedge and the keep floor (`tools/figure-ground.py`). The best candidate by these numbers goes to a human eye; a foe with no passing candidate retries once with "match the silhouette more exactly" and the failing rule restated, then gets a human paint-over.
7. **Poses as edits of the 1024 px raws** (`tools/.cache/pipeline/raw`), never of the shipped sprites: "same creature, same design and colours; change only the pose: …" for the attack telegraph, the flinch and the death pose; identity held in both concept edits, and the pose must be described physically ("tail raised high above the back") because a vaguer instruction was half-followed.
8. **Parts for the rig** (wings, tail, claws: 2–4 per foe) are still cut by hand from the approved base and recorded in `src/art/foe-rigs.js`; the rig blends the generated poses with its cycles. The **hit flash** stays the pre-built white silhouette per foe.
9. **Fusions follow the same contract** with a body-plan silhouette, but the plans are assigned across all 28 with the IoU matrix first (the coil Smogpup filled its plan and then collided with the poison serpents at 0.79).
10. **Originality:** animals and folklore, not game characters; no yellow rodent with red cheeks, no fire-tipped lizard, no nine-tailed fox; reverse-image-search each approved sprite; keep the raws, prompts and silhouettes together (the paper trail the style report asks for).

---

## 8. Production plan

### 8.1 Workstreams by owner

| Workstream | Owner | Files | Scope |
|---|---|---|---|
| W1 Monster roster | Art fork | `tools/pipeline-jobs.mjs`, `tools/post.py` (QA), `src/art/foe-rigs.js` (new), `src/render/foes.js`, `src/render/textures.js`, `public/assets/gen/enemy.*` | silhouette bible, 17 sprites + parts, rig renderer, foe atlas, hit silhouettes, death scatter |
| W2 Projectiles, trails, impacts | Art fork (proposed; `shots.js`/`fx.js` are unowned today, see risks) | `src/render/shots.js`, new `src/render/trails.js`, `src/render/textures.js` (atlas), new `src/art/attack-vfx.js` (the ladder table as data) | cores, add-ons, trail types, impact sheets, decals, fusion add-on rule, ladder visuals |
| W3 Frame kit | Art fork (proposed) | `src/render/scenery.js`, new `src/art/frame.js`, chapter skins in `public/assets/gen/env.*` | towers, gates with wave chips, lanes, hedges, ticks, parapet and braziers, keep frame, treeline strip |
| W4 Pet scale and anticipation | Art fork | `src/kv/roam.js`, `src/render/blocks.js`, `src/art/index.js` (`roamerFit`) | fusions at 1.0 cell, legends 1.15 cell + halo, pets stand off the lane centreline, wind-up poses by stage |
| W5 Fusion silhouette pass (P2) | Art fork | `tools/pipeline-jobs.mjs`, `src/art/bodyplans.js` | regenerate fusions with the grafted B part as ≥ 20 % of the mass, or adopt the 12 body plans |
| W6 HUD overhaul | UX fork | `src/ui/hud.js`, `src/ui/hud.css`, `src/kv/kv.css` (rail), `src/ui/inspect.css` | lintel (meter, keep grid, boss bar), news ribbon, rail on the tower, deck marker, price tick, icon redraw, die-pick glyphs |
| W7 Light-budget API and audit | UX fork | `src/ux/photosafe.js`, `tools/flash-audit.mjs`, `test/photosafe.test.js` | `spriteLit(w, h, share)` booking for tongues/decals/boxes, exemption rules for moving sprites, audit coverage of the new event kinds |
| W8 Diagnostics and gates | UX fork | new `src/render/diagnostics.js` (`?dev`), new `tools/perf-probe.mjs`, new `tools/silhouette-check.py`, CI | renderer counts, frame-time percentiles on a device, texture memory, silhouette CI, scorecard capture set |
| Shared / sim (needs an owner decision) | — | `src/sim/enemies.js` (names), `src/sim/defense.js` (`cooldownLeft`, `pushed` event), `src/sim/roam.js` (off-centre roaming) | three small, test-covered changes |

### 8.2 Phases and asset counts (Revision 2)

The Revision 1 plan (≈ 78 fast-model images, ≈ $15, hand-drawn VFX) is superseded by R2.3 above: pro-model art on every hero surface, generated VFX sheets, poses, three chapter skins, the fusion silhouette pass in P1, ≈ 370 approved images from ≈ 1,060 calls at ≈ $140 list price, and a **shipped-asset budget of ≤ 12 MB** inside the 16 MB single file (sprites at q80, portraits and cut-ins at 384 px in the build, death by the rig's part scatter). Exit criteria per phase:

| Phase | Exit |
|---|---|
| **P0 silhouette bible + VFX kit** (≈ 2 weeks) | every one of the 17 foes has a candidate passing the contract, twin and figure-ground gates as a generated sprite; 8 VFX sheets sliced into the atlas; Forest and Fareast kits in; the P0 capture set scores ≥ 2 on Obstacles, VFX, World and UI; flash audit unchanged; 60 fps on the reference phone |
| **P1 playable set** (≈ 5 weeks) | every category ≥ 2 and average ≥ 2.5; 28 fusions pass the roster-wide twin gate; poses in; three chapter skins; `npm run pack` ≤ 12 MB of sprites |
| **P2 codex and polish** (≈ 3 weeks) | average ≈ 2.7 with Obstacles, VFX and UI at 3; bestiary art in |
| **P3 store** | the 12 compositions, human finish |

### 8.3 Systems to build

1. **Sprite trail system** (`src/render/trails.js`): pooled `MeshRope` ribbons (8–12 points, per-shot history, one scrolling 64×16 texture per element), ghost afterimages (3 pooled sprites per shot), tether lines (1 px `Graphics` or a stretched 1×4 sprite), decal layer under `layers.path` with timed fades; a cap of 24 live shots and 16 ribbons on mobile; all sprites from the VFX atlas so they batch.
2. **Projectile atlas and data** (`src/art/attack-vfx.js` + `textures.js`): one atlas with cores, add-ons, links, impact frames and decals; a table per element and stage giving core, scale, count, trail type, add-on, impact and `lit`; `shots.js` reads it instead of `SIZE`/`lookFor`.
3. **Animation rig** (`src/render/rig.js`): parts-based sprites (body + pivoted parts), cycles (flap, scissor, wag, crawl, chain-follow), squash/stretch per class (babies rubbery, fusions ≤ 5 %, legends rigid, foes by weight), hit white silhouette, death scatter; shared by `foes.js`, `blocks.js` (tile creatures) and `kv/roam.js`.
4. **Frame kit** (`src/art/frame.js` + `scenery.js`): 9-slice stone panels, lane tiles, gate arches with chip slots, parapet merlons and braziers, corner towers, treeline strip; rebuilt on resize only; chapter skin switch on chapter change.
5. **Light-budget declarations** (`photosafe.js`): `spriteLit(w, h, share)` for appearing sprites (tongue, ice box, decals above threshold), the exemption rule for moving bodies/ribbons/ghosts, and `flash-audit.mjs` coverage of `breath/gust/pulse/quake/pounce/ping` at every stage.
6. **Silhouette and figure-ground QA** (`tools/silhouette-check.py`, seeded by `reports/art/visual-overhaul/tools/twin-test.py` and `figure-ground.py`): the contract, twin/ally and figure-ground tests as a CI gate over `public/assets/gen/enemy.*` and `fusion.*`, with thresholds from 7.2 and 7.3, plus a candidate picker for the pipeline (best of three by the three numbers).
6b. **Sheet slicer** (`tools/slice-sheet.py`, seeded by the concept version): connected-component slicing of generated VFX and frame-kit sheets into atlas pieces with a JSON atlas; the pipeline runs it after keying.
7. **Diagnostics** (`src/render/diagnostics.js`, `tools/perf-probe.mjs`): scene walk counting sprites, graphics, meshes and distinct texture sources; `Assets` cache size and estimated texture memory; frame-time p50/p95 from the ticker over a scripted 30-foe wave (the autoplay bot); numbers printed with `?dev` and written by the probe for the scorecard.

### 8.4 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemini cannot hold 17 distinct animals in one style and drifts toward a generic cute biped | low after the concept round (5 of 5 foes came out as their animal on the pro model) | silhouette reference per foe (the contract), view and pose words, chapter golden, palette hard limit, the three QA gates with one automatic retry, human paint-over for the 3 bosses |
| The pro model's per-minute quota (429s at concurrency 2; 3 of 26 concept jobs skipped after 200 s) slows production | medium | concurrency 1, the pipeline's two-minute cap wait, dependency order so no run blocks on one asset; ≈ 60–100 images an hour is enough |
| The shipped set outgrows the 16 MB single file (q88 would reach ≈ 15 MB of sprites) | high without the budget | the ≤ 12 MB shipped budget in R2.3: q80, 384 px portraits and cut-ins in the build, death by the rig, `npm run pack` size as a gate |
| Keying the generated foes' thin parts (antennae, streamers, tether-thin tails) | medium | keep thin parts for the rig (drawn as code lines/ropes), prompt "no thin lines thinner than the outline"; parts cut by hand |
| Ribbon trails cost fill rate on low-end phones | low–medium | one atlas, ≤ 16 ribbons, 8 points each (≈ 300 triangles total), normal blend; fallback order in 3 |
| The new effects re-introduce flashes | medium | every effect declares `lit`; `flash-audit.mjs` runs on the bot games as a gate (≤ 2 large flashes/s, 0 from local effects, as measured today) |
| HUD space on 360 px phones (rail + lintel) | medium | rail at 44 px, lintel drops the chapter name, news ribbon overlaps the lintel's bottom; verify at the five audited sizes |
| Ownership gaps: `shots.js`, `fx.js`, `scenery.js`, `stage.js`, sim getters | high if unassigned | assign before P0 (proposal: render files to the art fork, `photosafe.js` and audits to the UX fork, sim changes to whoever owns tests); the ladder data file is the hand-off contract |
| Pets still hide foes after resizing | medium | pets at 1.0 cell + off-centreline roaming (sim) + foes drawn above pets when a foe's y is lower (z-sort by y already exists for pets; extend to foes) |
| Scope: 17 animals + 8 families + frame + HUD is a lot for two forks | high | P0 proves the pipeline on 4 foes and 2 families; P1 is parallel (art: W1–W3; UX: W6–W8); P2 is optional polish |
| IP: animals drifting into famous creatures | low | the originality rules in 7.3; silhouette-first prompts anchor on shape, not on a franchise |

### 8.5 Acceptance gates (scorecard targets)

| Category | Now | P0 (bible + kits) | P1 target (Rev 2) | P2 target (Rev 2) | Evidence required |
|---|---|---|---|---|---|
| Art direction | 2 | 2 | 2.5 | 3 | capture set shows frame, foes, FX in one language |
| Hero / player | 2 | 2 | 2.5 | 3 | pets at 1.0 cell, generated poses, fusion silhouette pass, dens keep both glyphs |
| Obstacles / enemies | 1 | 2.5 | 3 | 3 | contract, twin and figure-ground gates on generated sprites; ≥ 4 readable variants per chapter in one wave; generated telegraph poses |
| Rewards / interactables | 1.5 | 1.5 | 2 | 2.5 | gate chips, keep grid, deck marker, die-pick glyphs, skill cut-in illustrations |
| World / environment | 1 | 2 | 2.5 | 2.5 | three layers; three painted chapter skins; field edge density above the board's |
| Materials / textures | 2 | 2 | 2.5 | 2.5 | stone/timber/hedge roles used, no one-off colours (lint), kit prompts with the palette hard limit |
| Lighting / render | 1 | 2 | 2 | 2.5 | no additive FX in play; braziers replace washes; value bands held; figure-ground gate |
| VFX / motion | 1.5 | 2 | 2.5 | 3 | 8 generated families sliced into the atlas; ladder visible in a 10 s clip per element; flash audit ≤ today |
| UI / HUD | 2 | 2 | 2.5 | 3 | zero DOM over lanes at 5 sizes; 12 px / 44 px floors; boss bar; preview chips |
| Performance evidence | 1 | 2 | 2.5 | 3 | diagnostics printed; p95 frame ≤ 16.7 ms on the reference phone in the stress wave; texture memory ≤ 80 MB; sprites ≤ 12 MB in the file |
| **Average** | **1.50** | **2.05** | **≥ 2.5** | **≈ 2.7** | fresh-eyes re-score at P1 and P2 with the complete capture set |

Automatic failures to clear by P1: repeated silhouettes (W1), UI over the play path (W6), missing renderer diagnostics (W8), glow as geometry (W2/W3).

---

## Appendix A. Reference ledger

| Reference | Loaded | Path | Note |
|---|---|---|---|
| threejs-aaa-graphics-builder SKILL.md | yes | `…/threejs-aaa-graphics-builder/SKILL.md` | workflow followed; external-asset gate waived by the brief (no generation) |
| visual-scorecard.md | yes | `…/references/visual-scorecard.md` | scoring, measured evidence, fresh-eyes review done |
| checklists/aaa-visual-scorecard.md | yes | `…/references/checklists/aaa-visual-scorecard.md` | |
| checklists/aaa-game-quality-gate.md | yes | `…/references/checklists/aaa-game-quality-gate.md` | |
| technical-art.md | yes | `…/references/technical-art.md` | brief, material roles, budgets translated to Pixi |
| implementation-blueprint.md | yes | `…/references/implementation-blueprint.md` | ownership/systems list adapted (8.3) |
| model-recipes.md | yes | `…/references/model-recipes.md` | silhouette-first, three-variant minimum, state cues → rig design |
| render-recipes.md | yes | `…/references/render-recipes.md` | lighting stack → 2D value bands; readability checks |
| shader-cookbook.md | yes | `…/references/shader-cookbook.md` | mostly N/A (no custom shaders proposed); contact-shadow and dissolve ideas reused as sprites |
| checklists/procedural-model-quality.md | yes | `…/references/checklists/procedural-model-quality.md` | |
| checklists/material-lighting-quality.md | yes | `…/references/checklists/material-lighting-quality.md` | |
| checklists/performance-safe-visual-detail.md | yes | `…/references/checklists/performance-safe-visual-detail.md` | |
| checklists/technical-art-quality.md | yes | `…/references/checklists/technical-art-quality.md` | |
| prompt-templates.md | no | — | not requested |
| assets/scorecard-anchors scene-1/2/3 | yes | `…/assets/scorecard-anchors/` | viewed and measured |
| godot-aaa-graphics-builder SKILL.md (2D note) | yes | `…/godot/skills/godot-aaa-graphics-builder/SKILL.md` | its screenshot_metrics.py formulas reused |
| threejs-game-ui-designer SKILL.md + ui-patterns.md | yes | `…/threejs-game-ui-designer/` | HUD zones and rules |
| ui checklists: hud-readability, mobile-input, game-ui-quality, responsive-ui-fit | yes | `…/threejs-game-ui-designer/references/checklists/` | |
| Project: Art style report, Asset list (+csv), Element basic attacks, kv guides, photosafe.md/.js, enemies.js, classes.js, defense.js, render/*, kv/*, art/*, ui/hud.*, tools/pipeline*.mjs, assets.config.mjs, README, meta-and-hud.md, phone-polish-plan.md | yes | repo | read-only |

External asset sourcing ledger (Revision 2, run for real with `tools/gen-concepts.mjs`):

| Surface | Source | Evidence |
|---|---|---|
| Foes (17) | `gemini-3-pro-image` from the silhouette contract, 3 candidates, 512 px | `concepts/foe-*.png` (11 candidates for 5 foes), `twin-test.json`, `figure-ground.json` |
| Foe poses, pet poses | pro-model edits of the 1024 px raws | `pose-fire-windup.keyed.png`, `pose-ice-tailslap.keyed.png` |
| Fusions (28), body plans | pro model with a body-plan silhouette + both parents | `fusion-smogpup-coil.keyed.png` |
| Projectile cores, add-ons, trails, impacts, decals | pro-model sheets per element, auto-sliced | `vfx-fire-sheet.keyed.png`, `vfx-ice-sheet.keyed.png`, `slices/` |
| Frame kits, road tiles, backdrops | pro model (front elevation, palette hard limit), 2048 → downscaled | `frame-kit-sheet.keyed.png` (+ slices), `frame-road-tile.jpg` |
| Portraits, cut-ins, bestiary | pro model (existing portrait recipe) | existing `portrait.*` set; cut-ins not yet tested |
| Glyphs, HUD icons, frame dynamics, trails, rigs | hand SVG / code | `hud-layout.svg`, sections 4.3 and 8.3 |

Credential probe: `VERTEX_API_KEY` present in the main checkout's `.env.local` (one line; never printed), `gemini-3-pro-image` available on the Vertex express endpoint (every concept came from it; no fallback to `gemini-3.1-flash-image` was needed). All concept images are logged in `tools/.cache/gemini-usage.json` with keys `concept.*`.

## Appendix B. Measurement method

- Metrics: the godot sibling skill's `screenshot_metrics.py` formulas re-implemented with Pillow/NumPy on `/usr/bin/python3` (16-level RGB entropy, Sobel edge density > 64, p95−p5 luminance, dominant 16-level colour share; long edge 512).
- Silhouette twin test: alpha mask (threshold 96 after trim and fit into a 40 px box), IoU against every other mask with horizontal flip allowed; for the sketches, the SVG symbols were rasterised from their geometry (M/L/C/Z paths, ellipses, circles, polygons, stroked polylines) at 4× and downsampled, so the numbers do not depend on an external renderer.
- On-screen sizes: `U = min(390 / 9.5, (844 − insets) / 19.85)` from `stage.js` with the compact HUD's measured bands; sprite sizes from `foes.js` (`size × 2.5 × 0.8`), `shots.js` (`(1.15 + 0.07·tier) × SIZE[pattern]`), `roam.js`/`art/index.js` (`roamerFit`).
- Fresh-eyes review: one independent agent given only the 13 captures, the rubric, the anchors, the metrics JSON and the enemy IoU data.

## Appendix C. File list

- `reports/art/visual-overhaul/proposal.md` (this file)
- `reports/art/visual-overhaul/silhouettes.svg`, `hud-layout.svg`, `attack-ladder.svg`
- `reports/art/visual-overhaul/inputs/01..05*.jpg` (unchanged inputs)
- `reports/art/visual-overhaul/tools/`: `gen-concepts.mjs` (the Vertex concept generator), `make-refs.py` (silhouette and wireframe references), `twin-test.py`, `figure-ground.py`, `slice-sheet.py`, `truth-composite.py`, `concept-index.py`
- `reports/art/visual-overhaul/concepts/`: the concept images, `*.keyed.png`, `refs/`, `slices/`, `manifest.json` (model, prompt, refs, timing, price per image), `twin-test.json`, `figure-ground.json`, `figure-ground.png`, `truth-composite.png`, `_index.jpg`, `log.jsonl`, `run*.log`
