# Visual overhaul: build plan and log

**Mandate:** the user said, on 2026-10-16, "default all till all i ask for is updated in game". So:
- Every open decision takes its default.
- Work continues until the four asks are in the game:
  - the UI, HUD, border and layout;
  - projectiles with real sprites and trails;
  - an attack progression the player can see;
  - every monster as its own animal with its own silhouette.

The design is `proposal.md`, Revision 2. This file is the execution plan and the progress log. Update it after every step.

**Defaults taken:**
- **Ownership:** this session (the UX fork, branch `ux-journey`) builds everything. The art, Core and TODO sessions are not running.
- **Foe size:** the size boost is render-only, in `foes.js`: `GEN_FILL` becomes 1.0, and size is raised to at least 0.42. The sim is unchanged.
- **Sim:** only read-only getters and extra events. No rule changes, so the fingerprints and journey metrics stay the same. Display names change in `enemies.js`.
- **Pipeline:** it runs from this worktree.
  - `.env.local` and the ledger are symlinks to the root's files (both gitignored), and the raws are cloned from the root cache.
  - The key goes to curl on stdin (`tools/curl-post.mjs`).
  - The budget caps are null, as the user asked.
- **Model and attempts:** `gemini-3-pro-image` for every hero surface, 3 candidates per foe chosen by the gates, concurrency 1.
- **Commits:** commit on `ux-journey` after each phase passes its tests and a review of 9.5 or more. Fast-forward `main` at milestones, after checking the root's dirty files. Never push.

## Phases

### P-A Housekeeping
- [x] Key off disk: `tools/curl-post.mjs` plus a test. Delete the 3 leftover temp key files.
- [x] The worktree can run the pipeline (symlinks, raws, caps off).
- [x] Commit the key fix and the caps change, after the review.

### P-B Monster roster (W1): pipeline
- [x] `src/art/foe-roster.js`: the 17 keys, each with animal, display name, chapter, view, pose, description, palette, accent, bg, silhouette and size class.
- [x] `tools/refs/foes/`: the silhouette contract images (`sil-*.png`) and a frozen render reference (the old ninja raw).
- [x] `tools/silhouette-check.py`: the gates (contract IoU, twin, ally, figure-ground, two-value) and a candidate score.
- [x] `tools/pipeline-jobs.mjs`: the enemy branch on the Rev 2 contract, with chapter goldens and candidates 3. Boss portraits depend on the new sprites.
- [x] `tools/pipeline.mjs`: the candidates picker. It makes N candidates, post-processes each, scores them, picks one, and makes one strict retry if none passes.
- [x] Tests (`test/pipeline.test.js`).
- [x] Run: the 17 foes, then the 3 boss portraits.

### P-C Monster rendering
- [x] `foes.js`:
  - the new art, `GEN_FILL` 1.0 and the S floor;
  - the plum contact shadow at 30%;
  - correct facing for left-facing art;
  - hover with a detached shadow for flyers;
  - walk bob and squash per body type;
  - the hit flash kept inside the light budget;
  - a death puff and fall.
- [ ] Generated state frames (wing or leg cycle, attack telegraph, hit, death) as edits of the 1024 px raws, with code-driven frame swaps.
- [x] Display names in `enemies.js`; tests.

### P-D Projectiles, trails, impacts, ladder (W2)
- [x] 8 VFX sheets (pipeline jobs `vfx.<el>`, pro model, 2 candidates), sliced into an atlas and JSON (`tools/slice-sheet.py`).
- [x] `src/art/attack-vfx.js`: the ladder table (element × stage gives core, count, trail, add-on, impact, lit).
- [x] `src/render/trails.js`: ribbons (MeshRope), afterimages, tethers, decals; pooled and capped.
- [x] `shots.js` and `fx.js`:
  - per-element forms (tongue, harpoon, bolt links, glob, cracks, gust ribbon, pounce, thorn arc);
  - no additive glow;
  - photosafe booking (`spriteLit`).
- [x] Sim getter `defense.cooldownLeft(id)` and a `pushed` event, both read-only; pet wind-up by stage.
- [x] `flash-audit.mjs` covers the new kinds; the audit shows no regression.

### P-E Frame kit, HUD, layout (W3, W6)
- [x] Generated chapter kits:
  - towers, gate arch, parapet merlon and brazier, hedge, keep frame;
  - calm-centre lane tiles;
  - treeline strips;
  - 3 painted backdrops.
- [x] `scenery.js` and `src/art/frame.js`:
  - towers, gates (portal inside, next-wave chips);
  - lanes with ticks and hedges;
  - parapet and braziers, which replace the danger glow;
  - the keep frame with flagstone pits.
- [x] HUD:
  - lintel (crest and wave, foes meter, keep grid, boss bar);
  - news ribbon in the sky;
  - namecard rail on the right tower;
  - deck "next die at 256" slot;
  - coin price tick;
  - stone buttons.
- [x] Layout bands, checked at 5 phone sizes; nothing over the lanes.

### P-F Pets (W4, W5)
- [x] Fusions at 1.0 cell and legends at 1.15; z-sort so foes are drawn above pets.
- [x] Fusion silhouette pass (2026-10-16, PvZ item T27): body plans could not separate the 28 fusions, so each became its own animal with its own silhouette contract (`reports/art/fusion-matrix/`, approved by the user with six renames and a 1.6-cell width cap; `src/art/fusion-roster.js`). Generated with the pro model, three gated candidates each (gate version 3: the heroes' cream rim stripped, lanes and hedges as grounds), seven redone with clearer words: 17 pass, 4 within 0.03, 7 reviewed near-misses (`gateAccepted`). Closest pet pair 0.65 (median 0.56), closest foe or base pet 0.69 (median 0.58). All 56 portraits regenerated from the new sprites. Pets roam by their animal (`gaitAt`: walk, crawl, leap, hover, swim, float; only side views flip).

### P-G Ship
- [ ] Flash audit, all tests, diagnostics (`?dev`) and the perf probe.
- [ ] Pack at 16 MB or less (12 MB or less of sprites).
- [ ] Phone captures at 5 sizes; republish the artifact.
- [ ] Docs; commit; fast-forward `main`.

## Log
- 2026-10-16: the mandate was received. P-A is mostly done (key fix tested 179/179 with mutation-checked tests; leftover key files deleted; worktree pipeline set up and checked that Vite serves `.env.local` as 403).
- 2026-10-16: P-A is committed.
  - `e83ad15`: key off disk, reviewed 9.5 after two rounds. It has `-q`, the env scrub, the timeout, and 4 tests that catch mutants.
  - `66f113b`: no budget caps.
- 2026-10-16: P-B code is in.
  - `src/art/foe-roster.js`, `tools/refs/foes/` (17 silhouettes and `render-ref.png`), `tools/silhouette-check.py`.
  - The enemy jobs and the picker in `pipeline.mjs` (mock-tested end to end).
  - The Vertex best model is `gemini-3-pro-image`.
  - Display names in `enemies.js` and `test/foe-roster.test.js`.
- 2026-10-16: the run for all 17 foes is going (`tools/.cache/pipeline/run-foes-1.log`; the picks are in `log.jsonl` as `"picked"`). The Moonmoth (pixie) was picked at #2 (c40 0.64, worst −0.02).
- 2026-10-16: P-C step 1 is in `foes.js`: `GEN_FILL` 1, the S floor at 0.42, sticky facing for left-facing art, and motion per roster `move` (walk, crawl, hover, swim, float) with a span beat for spread views.
- 2026-10-16: the P-D assets are defined: `src/art/attack-vfx.js` has `VFX_PIECES` (30 sprites, one job each). Bodies are cream-white and tinted in code; there are catalog rows and pipeline jobs. Test count: 184.
- 2026-10-16: the P-E assets are defined: `src/art/frame-kit.js` has `CHAPTER_SKINS` and `FRAME_ASSETS` (13 `env.*` jobs: brazier, flame, banner, lantern, moss, mushroom, ember, 3 ridge strips, 3 backdrops). The frame geometry is drawn in code in the sticker style.
- 2026-10-16: two engineers (subagents) are running in this worktree.
  - P-D owns `shots.js`, `fx.js`, `trails.js`, `attacks.js`, `attack-vfx.js` LADDER, the anticipation in `blocks.js` and `roam.js`, `defense.cooldownLeft`, `photosafe.js`, the audit, and the attack cases in `main.js`.
  - P-E owns `scenery.js`, `frame.js`, `stage.js`, `ui/*`, `namecards` and `kv.css`. It makes no `main.js` edits; it reports a wiring list instead.
- 2026-10-16, P-F finding: body plans cannot separate the 28 fusions.
  - All 336 fusion × plan outlines were rendered (`renderPlan`) and assignments optimised for the twin test.
  - Fusions that share a plan stay at about 0.9 IoU, so every assignment leaves 44–61 pairs above 0.65.
  - Distinct fusions need 28 per-fusion silhouette contracts, which is a full pet redesign.
  - **Decision:** P-F waits until P-B to P-E are in the game. The user asked for unique silhouettes for the *monsters*; the fusion pass is secondary (proposal 2.2).
- 2026-10-16, foe rim: some picks come back with the heroes' cream sticker rim. The Dormouse's edge has a median L* of 100, while the moth and beetle edges sit at about 12.
  - `post.py --strip-rim` peels light edge rings down to the outline, capped at 2.5 % of the size.
  - Enemy jobs set `post.stripRim`.
  - **TODO after the foe run:** re-post every `enemy.*` from its raw with `--strip-rim`. Call `post.py` directly so the running VFX/env pipeline's manifest is not raced.
- 2026-10-16, W8: `src/render/diagnostics.js` added (`?dev` overlay: fps, p50/p95, scene counts, texture MB; `__mb.diag`) with `test/diagnostics.test.js`. It is wired into `main.js` after the agents finish.
- 2026-10-16, P-D code is in (uncommitted, for review).
  - `src/art/attack-vfx.js`: `LADDER` (8 elements × 5 stages, each stage adds exactly one layer), `ladderStage`, `attackClass` (the class from an event's colours), `petPose`, and `attackLight`, the per-event light plan that the renderer draws from and the audit counts.
  - New `src/render/trails.js` (ribbons as tapered `MeshRope`s, afterimages, tethers, decals, tweened pieces; caps 24 shots, 16 ribbons, 48 decals, 240 pieces) and `src/render/attacks.js` (breath, gust, pulse, quake, pounce, ping, chains, strikes, meteors, kills, statuses).
  - `shots.js` rewritten (vfx bodies, ladder trails, sprite impacts, puddles as sprites); `fx.js` all normal blend, the old line kinds gone; `textures.js` has a code-drawn fallback for all 30 `vfx.*` ids.
  - Wind-ups in `blocks.js` and `kv/roam.js` from `defense.cooldownLeft`. The sim is unchanged: identical fingerprints and event hashes over 5 bot games, with the getter probed every step.
  - The flash audit adds 40 ladder boards (every element at every stage). Bot games and the stress board: the same flash counts as before (2 / 1 / 0 / 1 / 0.08 / 10.0 / 2), with fewer effects cut.
  - Tests: 16 new (`test/attack-ladder.test.js` 11, `test/trails.test.js` 5); 216 in all with the other forks' new tests.
  - Generated `vfx.*` sprites (18 so far) are levelled when slanted (the first harpoon came diagonal) and re-measured for the light budget as they load.
  - Additive blends left, outside P-D: the foes' hit flash (`foes.js`, P-C) and the tiles' class glow and muzzle copy (`blocks.js`).
- 2026-10-16, P-E code is in (uncommitted, for review).
  - New `src/render/frame.js`: towers, gates with chips and banners, calm lanes with ticks, hedges with decor, a parapet with braziers in three states, the keep and pits.
  - `scenery.js` and `stage.js`.
  - HUD: a lintel with a meter, keep grid and boss bar; the news ribbon; a stone top bar; the deck slot; a price tick.
  - The namecard rail on the right tower; `docs/ux/frame-and-hud.md`.
  - No DOM over the lanes at 5 sizes (21 captures). U is 29.6 at 390×844.
  - The coordinator applied the 5 `main.js` wiring edits and wired in diagnostics. The suite has 216 tests.
- 2026-10-16: all 17 foes were made (78 images, about $10.45 at list price). Strip-rim was applied to every one afterwards.
  - The first review of P-B/P-C scored 6.5.
  - A fixer agent is on the findings: the stale `meta.gate`, warnings when gates fail, the wyvern contract, gate-aware selection with a targeted strict text, `foeDrawSize`, the re-measured `FOE_FLASH`, a normal-blend white silhouette, the manifest merge, and tests.
  - The P-D and P-E reviews are running in parallel.
- 2026-10-16: all 30 `vfx.*` sprites have been generated. The 13 `env.*` sprites are in progress.
- 2026-10-16: integrated captures at 390×844 ×2 (`scratchpad/cap-integrated`) show the whole look working. Fix list from the visuals:
  - **V1:** the venom puddles wash the lanes pink. Make them subtle (alpha ≤ 0.18, splat-edged).
  - **V2:** the roaming pets are still oversized. Proposal W4: fusions at 1.0 cell, legends at 1.15.
- 2026-10-16: all 13 `env.*` sprites were made, so the run made 43 of 43. The fixer for P-B/P-C is done: 231 tests, flash audit safety columns identical.
  - `meta.gate` v2 holds the re-scored sprites, failed gates now warn and set exit 2, and the wyvern's contract is its approved outline.
  - `tools/pick.mjs` does gate-aware ranking and builds the strict text from the gates that failed.
  - `foeDrawSize` is shared; `FOE_FLASH.share` was re-measured at 0.47; the hit flash is a white silhouette drawn in normal blend.
  - The manifest is merged on write. Strip-rim is now a flood fill. `trim()` no longer squares alpha.
  - The ground gate is 1/3, matching the prompt.
- **Decision (2026-10-16):** six foes sit slightly outside tolerance (beetle/owl twin 0.60, owl ally 0.66, pangolin/queen twin 0.63 across chapters, hive queen ally 0.69, fox and kite carp at about 0.25–0.29 on the dark keep). They are **kept**: they are visually distinct, re-picks would buy margins of 0.03–0.08, and the dark-keep readability is fixed in rendering (V3: a pale contact patch on the keep).
- 2026-10-16: regenerating `vfx.earth.crack` and `vfx.nature.tendril` as long, thin 21:9 pieces, and the 3 boss portraits (they showed the old designs). Then a `--repost` of `vfx.*` and `env.*` for the trim fix. Log: `run-fix-1.log`.
- 2026-10-16: the P-D review scored 7.5. A fixer is on it, covering:
  - the meteor booking;
  - gamma-correct puddles held for at least 1.2 s of real time (with V1, subtle puddles);
  - `PIECE_LIT` measured at startup;
  - tendril and crack drawn with fit;
  - reduce motion for pet lunges;
  - minors 6–10;
  - a renderer conformance test;
  - no additive blends in `blocks.js`;
  - V2: pets at 1.0 cell, legends at 1.15, foes z-sorted over pets;
  - V3: the keep patch.

  The P-B/P-C re-review and the P-E review are running.
- 2026-10-16: the P-B/P-C re-review scored 8.5. The coordinator fixed its points:
  - `strip_rim`'s neck guard (an opening scaled to the outline width, body regions of 0.2 % or more kept, notch rim removed). Tested on the reviewer's leak sprites; the 17 shipped foes are pixel-identical.
  - The ally strict line is now about shape.
  - `FOE_FLASH.share` is tested over every shipped foe and ground.
  - A manifest lock (`withLock`) and a sweep of temp files.
  - `gateAccepted` reasons for the 6 kept foes (still reported, exit 0); a new miss still exits 2.
  - Wyvern notes in the proposal, and a real-path `main()` guard. The test count is 235.

  The booking cadence and the size-capped lift went to the P-D fixer. The final re-review is running.
- 2026-10-16: regenerated `vfx.earth.crack` (256×70) and `vfx.nature.tendril` (256×52) as long thin 21:9 pieces, and the 3 boss portraits in the new designs. All 44 `vfx.*`/`env.*` sprites were re-posted with the trim fix.
- 2026-10-16: the P-E review scored 7. A fixer is on it:
  - ribbon truncation, the best-wave record, the bottom bar at 360, braziers lit through pending spawns, the keep grid on short phones, and the copy for the removed cues;
  - U at 412, the rail on wide screens, 12 px canvas text, tabular buttons, accessibility, the texture leak, docs, the range redraw;
  - splitting `frame.js`, plus tests.
- 2026-10-16: P-B/P-C reviewed at **9.6**, passing the 9.5 gate once the full suite is green.
  - Round 3: `strip_rim` has a thickness check (`RIM_THICK`: a band holding a disc 6 % of the side wide is a body part, so it is peeled and QA fails), and acceptances are pinned per gate (`gateAccepted: { margins, why }`, `acceptedMiss`).
  - Round 4 nits: a repost whose QA fails keeps the shipped file and exits 1; the lock takeover checks the inode; acceptances compare each gate's own margin.
  - Commit P-B/P-C once the P-D and P-E fixers finish and `npm test` is green.
- 2026-10-16: the P-D fixer is done (271 tests).
  - The meteor books with a `delay`; puddles use gamma-correct alpha (0.095–0.16) and are held for at least 1.2 s of real time; `readyVfx()` measures at startup with a `vfx-lit` test.
  - Tendril and crack are fitted; reduce motion for pets; renderer conformance test; nothing additive anywhere in `src`.
  - V1 (puddle splats), V2 (pets at 1.0/1.15 cell, y-sorted in the enemies layer), V3 (sand patch for foes on the keep), and lift caps.
  - **P-D re-review: 9.5.** The class-glow cap was lowered from 0.26 to 0.22 as asked (8.4 % on the palest fusion).
  - Open minors, for later: the puddle stain outlives its effect at x4; no test pins the patch and glow numbers; the kv pixel filter now also pixelates pets; gust wiggle under reduce motion; the meteor's plan is over the cap on its own.
- 2026-10-16: commit `7a3f105` holds the report folder (proposal, build plan, concept record: keyed PNGs, JPEG frames; raws ignored). The code commit for P-B..P-E comes after the P-E re-review.
- 2026-10-16: all phases P-B to P-E reviewed at 9.5 or more (P-B/P-C 9.6, P-D 9.5, P-E 9.5 after two rounds each).
  - 271 tests and the build pass.
  - The single file packs at 8.2 MB (215 sprites, 7.1 MB as WebP), under the 16 MB limit and the 12 MB sprite budget.
  - Committed as one code-and-art commit; the phases share files, so there are no per-phase commits.
  - Deviations from the proposal, all defaults recorded above:
    - VFX are 30 per-piece sprites, not 8 sliced sheets, and there is no atlas yet.
    - The frame is drawn in code with generated props, backdrops and ridges, not generated kit sheets.
    - Foe state frames (poses) are not generated: the code drives the motion per roster `move`.
    - The fusion silhouette pass (P-F) is deferred (see the P-F finding).

## Round 2 (2026-10-16, after shipping)

The user's next requests, refined:

1. **Calm the field.** Drop detail from everything with no gameplay function: the backdrop, ridges, decor props, stonework, cobbles. Keep the functional cues crisp: lanes, gates and chips, braziers, hedges, keep and pits. This goes straight into the game.
2. **Tile overhaul.** A state inventory and a sample tile in every state (`reports/art/tiles/`) for the user's review **before** any game change.
3. **Fusion rework.** An 8×8 element matrix: a unique animal per fusion, a body plan, a silhouette contract and a palette (`reports/art/fusion-matrix/`). The user checks it **first**; then the pipeline runs (3 candidates and gates, plus portraits).
4. **Mood board.** All assets new and old (old from git `8c50a1e`) at `reports/art/moodboard/index.html`, opened in the browser.
5. **Phone readability.** Text sizes, fonts, contrast and buttons, measured and fixed at 5 sizes, then checked after.

Agents running in parallel:
- mood board (`reports/art/moodboard`);
- field calm (`frame`, `frame-art`, `frame-kit`, `scenery`);
- tile study (reports only, Fable);
- fusion matrix (reports only, Fable);
- readability (`ui/*`, `kv` `namecards`, `fx`/`foes` text sizes, `deck.js`; field-file changes are reported for the coordinator).

Round 2 results (2026-10-16; PvZ items in brackets):
- **Field calm [T31]:** the backdrop downsampled and desaturated, a flat ridge, two props, larger stones, quieter cobbles; the towers' detail from 45 % to 17 % of their area, the lane field's from 35 % to 15 %.
- **Tiles [T29, T20]:** the user chose an altar for the den ("hole is weird, use altar or tower instead"); built in the game from `reports/art/tiles/tile-spec.md`: plaques seated in their pits, a 4-segment meter, egg nests, altar dens with paw prints while the pet roams, the legend's apex badge on its altar inside its halo, cream brackets for the pick and red dashed ones when armed, physical arrivals and departures, the scared face and blink on the 16s, a refused-swipe nudge, a picked den highlighting its pet.
- **Fusion pets [T27]:** see P-F.
- **Phone readability [T30]:** labels ≥ 14 px, key numbers ≥ 20 px, buttons 48 px, contrast ≥ 4.5:1, canvas number floors with tabular digits, the boss's badge row clear of its health number; the bigger numbers are booked in the light budget by their real text (real peak 10.0, no large flash at U 32 and 23.78), so a busy moment on a small phone shows fewer numbers, never smaller ones (`docs/ux/phone-readability.md`, `docs/ux/photosafe.md`).
- **Mood board:** `reports/art/moodboard/index.html`.
