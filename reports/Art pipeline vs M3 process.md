# 2048 Siege art pipeline vs the M3 art style process

**Compared:**
- **2048 Siege proposal**: the pipeline in [Art style for 2048 Siege pets.md](Art%20style%20for%202048%20Siege%20pets.md). It recommends sticker tiles, sticker roaming fusions and a vinyl 3D portrait, then gives a style brief and a production recipe built around Gemini.
- **M3 process**: the third-party *M3-Art-Style-Process.md*, a style decision process plus downstream rules for a Godot 4 match-3, adapted from the `game-skills-kit` Godot pack.

## Bottom line

The two documents answer different questions:
- **M3 is a governance shell.** It explains how to decide on a style fairly and how to keep every later process faithful to it. It never says which style to pick.
- **The 2048 Siege proposal is the filled-in answer for one game.** It names the style per layer, explains why with cited evidence, and gives exact specs: hex tokens, contrast maths, a growth arc, prompt skeletons, generation order and repo fixes.

Each is strong where the other is thin:
- **The 2048 Siege proposal wins on content.** It covers identity across three layers, the cute-to-majestic arc, the mechanics of AI generation, IP evidence and file size.
- **M3 wins on validation and governance.** It has pass/fail gates, real gameplay frames, a fresh-eyes reviewer, player tests, an Art Bible with shared tokens, ledgers, QA cadence and change control.

The proposal skipped M3's steps 4 (target gameplay frame), 6 (fresh-eyes scoring) and 7 (player tests). Until those run, its rankings are well-argued hypotheses, not verified decisions.

**Recommendation:** treat the proposal's winners and runners-up as M3's "2–3 candidate directions". Run them through a light version of M3 Gates G1–G7, using the vertical slice the report already plans, before generating the full ~100 assets. Then lock an Art Bible and adopt M3's ledgers and change control. A merged sequence is at the end.

## At a glance

| | 2048 Siege proposal | M3 process |
|---|---|---|
| Question answered | Which style fits this game, and how do we produce it? | How should any team choose and enforce a style? |
| Scope | One game, three art layers (tile, roaming, portrait) | Whole game, all surfaces (pieces, blockers, UI, VFX, store, live-ops) |
| Platform | PixiJS 8 web, single HTML file, phone portrait | Godot 4 native mobile (Mobile/Compatibility renderer) |
| Genre | 2048 merge + lane tower defense with evolving pets | Match-3 with blockers, boosters, meta and live-ops |
| Output | Ranked styles, style brief, prompts, asset budget, repo fixes | Inputs list, gates, scorecard, decision record, 15 downstream rules, checklists |
| Evidence | Desk research across 7 note files with cited sources, code audit, synthetic size benchmark | In-engine gameplay frames, gate tests, fresh-eyes scores, player tests |
| Decision method | Weighted 1–5 scores over 11 criteria, normalised to 100 per layer | Pass/fail gates G1–G7, then a 10-category 0–3 scorecard with thresholds |
| AI stance | AI-first (Gemini), human pass on the 8 base pets | Tool-agnostic. AI allowed by written policy and checked for "AI default" tells |
| Status | Decision drafted; vertical slice is the next step | Template; needs to be filled in per project |
| Effort to run | Low (already done) | High: candidate frames built in-engine, player tests, reviewer |

## Comparison matrix

Ratings are my judgement: ● strong, ◐ partial, ○ missing. "Edge" says which document is stronger on that row. "Merge action" says what to do in the combined pipeline.

### 1. Decide (how the style is chosen)

| # | Dimension | 2048 Siege proposal | M3 process | Edge | Merge action |
|---|---|---|---|---|---|
| 1 | Inputs collected | ◐ 11 scoring criteria; no audience profile, live-ops cadence, localization or store/ads input | ● 12 explicit inputs: audience, market, IP/theme, readability load, devices, production capacity, live-ops, store, localization, accessibility, originality, animation method | M3 | Fill the 4 missing inputs on a one-page brief |
| 2 | Market and competitor data | ● Revenue and download figures (Rush Royale, Random Dice, Archero, merge-2), 2024 style-trend split, Slime Legion overlap risk | ◐ Asks the question (input 2) but gives no data or method | Siege | Keep as is |
| 3 | Candidate definition | ◐ 8 generic style families scored per layer; only the winner is fully specified | ● 2–3 directions, each in "renderable terms": shape, motifs, palette roles, technique, outline, light, fonts, icon grid, motion, VFX | M3 | Specify the runner-up per layer to the winner's depth (flat-vector tiles, cel-shaded roaming, clay portrait) |
| 4 | Evidence base | ◐ Broad, cited desk research and code audit, but no in-game frames | ● A real gameplay frame per candidate at phone resolution, judged as the player sees it | M3 | Build a PixiJS target frame per candidate from the vertical-slice assets |
| 5 | Decision mechanism | ◐ Weighted scores with per-layer weights and one sensitivity check | ● Gates first (a single failure ends a candidate), then a scorecard with Premium/Showcase thresholds and automatic fails | M3 | Put pass/fail gates in front of the weighted table, so a high average cannot hide a fatal flaw |
| 6 | Bias control | ○ Scores from a single author, labelled as inference | ● Fresh-eyes reviewer who sees only frames and the rubric; keep the lower score; review the full capture set | M3 | Have a reviewer with no history (a teammate or an isolated agent) score the frames |
| 7 | Player and market validation | ◐ Planned device, greyscale, colourblind and Pokémon-silhouette tests | ● 5-second recognition test, preference A/B, ad-creative CTR test | M3 | Add a 5-second test ("which element? which stage?") and A/B tests on tiles and portraits |
| 8 | Decision record | ◐ Rejected styles with reasons and a conflicts table; no owner, date or revisit trigger | ● A5 template: gates, scorecards, risks, revisit trigger | M3 | Fill in A5 after the gates |

### 2. Specify (what the style is)

| # | Dimension | 2048 Siege proposal | M3 process | Edge | Merge action |
|---|---|---|---|---|---|
| 9 | One character across several surfaces | ● One canonical design per creature exported at 3 detail levels; 4 anchors (colour, eyes, motif, parent slots) | ◐ Store-to-game bridge and a palette shared by UI and art; no concept of one character drawn in several styles | Siege | Keep; M3 could adopt it for meta characters |
| 10 | Progression and emotional arc | ● Stage table from egg through 16–128, 256 and 4096: head share, eye shape, motif count, frame, motion; cute-funny to majestic | ○ Tone comes from the audience only; match-3 pieces don't evolve | Siege | Keep |
| 11 | Palette and tokens | ◐ Concrete hex values, outline `#2B1D2E` with a cream rim, 60/30/10 fusion split, value plan; spread across the report, `hud.css` and `classes.js` | ● One palette resource with roles (neutral, danger, reward, interactable, UI emphasis, disabled), read by both the UI theme and the game art | M3 (structure) | Make one tokens module the single source for `hud.css` variables, PixiJS and prompt templates |
| 12 | Readability and accessibility | ● Computed contrast (dark numeral 4.95–13.4:1 vs cream 1.1–3.1:1), greyscale collisions (fire/earth, ice/metal), shape plus glyph per element, colour remap | ● G1: identifiable in ~2 s at real size, greyscale, colourblind simulation, full board mid-cascade; B13 reduced-motion option | Tie | Add the reduced-motion option and the "mid-cascade" (mid-wave) worst-case frame |
| 13 | Shape language and element identity | ● 8 element signatures with motif growth, glyphs, shapes to avoid for IP, apex kits | ◐ One shape grammar, silhouette first, states shown by shape rather than tint | Siege | Keep |
| 14 | Typography and localization | ◐ Numeral spec (BitmapText, dark fill, cream stroke, 20–28 pt); the fonts themselves (Baloo 2 / Nunito) were not reviewed | ● One font pairing, Vietnamese stacked diacritics, fallback fonts, text-expansion tests, a dedicated numeral style | M3 | Check Baloo 2 and Nunito for Vietnamese diacritics if Vietnam is a target |
| 15 | Motion | ● Numeric table per stage (bob period, squash %, anticipation, gags) | ◐ Motion feel follows the style; shared presets and tween hygiene, but no values | Siege | Keep; adopt M3's tween rules (kill the previous tween, never let two tweens drive one property) |
| 16 | VFX language | ◐ Glow added in code, an additive layer, white-silhouette hit flash | ● Event-driven effects only, accent-colour rules, a cap on screen coverage, the board never hidden | M3 | Add a list of events that get effects and a coverage cap |
| 17 | "AI default" check | ○ None | ● G4: fewer than 3 "default" tells unless the world gives a reason | M3 | Run G4 now; the proposal trips 2–4 tells (see below) |

### 3. Produce (how assets get made)

| # | Dimension | 2048 Siege proposal | M3 process | Edge | Merge action |
|---|---|---|---|---|---|
| 18 | AI generation mechanics | ● Model choice (Nano Banana 2.1), cost (~$7–54 per set), ≤5 references per call, generation order, prompt skeletons, one character per call, raws kept because there is no seed | ◐ Policy only: allowed uses, prompts templated from tokens, review for construction errors, no API keys in runtime, legal provenance | Siege | Keep; template the prompts from the tokens module (M3 B10) |
| 19 | Asset strategy ledger | ◐ Table 8 gives a method per asset group (generated, edited, glow in code, hand-drawn SVG glyphs) | ● A ledger row per surface, plus an in-engine approval screenshot for every shipped asset | M3 | Turn Table 8 into a ledger with an approval screenshot per asset |
| 20 | Background removal and post-processing | ● Chroma-key rules, white buffer outline, HSV keying, cream rim from alpha dilation, palette snap | ○ Not covered (engine-agnostic) | Siege | Keep |
| 21 | Review stages | ◐ Approve golden references, then derive variants from them | ● Sketch, then values (greyscale), then colour, then in-engine; approval happens only in-engine | M3 | Approve in the running game, not in an image viewer |
| 22 | Performance budget | ◐ Download size (~715 KB to ~1.2–1.4 MB), WebP/AVIF, ~16 MB atlas memory, PixiJS batching rules | ● Draw calls ≤200, VRAM ≤512 MB, ≤40 textures, ≤2,000 particles, frame time, a probe on a low-end device | M3 (runtime) | Add frame-time and draw-call budgets, measured in Chrome on a low-end Android phone |
| 23 | IP and originality | ● Court cases, a study where models reproduced characters 48% of the time, franchise names stripped, shared bean body, silhouette test, reverse image search, design log, legal review | ◐ G5 side-by-side with competitors, no franchise silhouette-plus-palette match, no copying a living artist, a borrow ledger | Siege (depth) | Adopt M3's borrow ledger: write down the single trait taken from each reference |
| 24 | Pipeline code readiness | ● 10 confirmed repo fixes (franchise names in the prompt, glow assets, silent model fallback, no reference images, billing) | ○ Not applicable; the doc warns the kit's scripts are buggy | Siege | Fix the pipeline before generating anything |

### 4. Validate and govern (keeping the style true over time)

| # | Dimension | 2048 Siege proposal | M3 process | Edge | Merge action |
|---|---|---|---|---|---|
| 25 | Producibility pilot | ◐ Vertical slice: fire line 16–128, Frostnova with portrait, one apex kit | ● G6: produce one asset end to end, time it, then have a second artist repeat it to compare | M3 | Run the slice twice, in fresh sessions on different days, and measure drift (the AI version of a "second artist") |
| 26 | Visual QA cadence | ○ A one-off test list | ● Capture from the running game at reference resolutions, score before and after each art pass, check drift, report each milestone | M3 | Adopt once production starts |
| 27 | Live-ops and reskins | ○ None | ● Palette overlay behind a date gate, gameplay colours frozen, gates re-run | M3 | Adopt when events are planned; freeze the 8 element colours now |
| 28 | Store, ads and marketing | ◐ Market data; the portrait style was chosen partly for ad appeal | ● Key art shares DNA with gameplay frames, real-gameplay screenshots, ad tests feed the decision log | M3 | Adopt before soft launch |
| 29 | Change control | ◐ Raws, goldens and prompts are versioned so assets can be regenerated | ● Versioned Bible, impact list, gates re-run, one style owner | M3 | Name an owner and version the brief as Art Bible v1 |

### Coverage score

Equal weights, ● = 2, ◐ = 1, ○ = 0. This measures how much ground each document covers, not how deep it goes where it does cover.

| Stage | Rows | 2048 Siege proposal | M3 process |
|---|---|---|---|
| Decide | 1–8 | 8 / 16 | 15 / 16 |
| Specify | 9–17 | 13 / 18 | 13 / 18 |
| Produce | 18–24 | 11 / 14 | 8 / 14 |
| Validate and govern | 25–29 | 3 / 10 | 10 / 10 |
| **Total** | 29 | **35 / 58 (60%)** | **46 / 58 (79%)** |

The pattern is clear:
- **They tie on specification.** M3 sets the rules a spec must follow; the proposal is the spec.
- **The proposal leads on production.** It is AI-specific and grounded in the actual repo.
- **M3 leads on deciding and governing.** These are exactly the steps the proposal has not run yet.

## Gate G4 ("not an AI default") run on the proposal

M3 fails a candidate with 3 or more default tells that have no reason in the game world. Checked against the current game and the proposal:

| M3 tell | Present? | Evidence | Fix |
|---|---|---|---|
| Purple or indigo gradient branding | **Borderline** | The background is a deep blue-indigo vertical gradient, `#2f4a8a` to `#1a2552` (`src/render/scenery.js`) | Give it a reason in the world (a night sky over the siege) or flatten it into a scene |
| Neon glow as hierarchy | **Risk** | The namecard "ready" state and the legendary idle both rely on a glow pulse | Keep glow secondary: ready = full colour plus a shine sweep; glow only decorates |
| Cream plus terracotta plus italic serif | No | Cream with peach and butter, but rounded sans fonts (Baloo 2 / Nunito) and no terracotta | None |
| Frosted glass over play | No | The `blur(3px)` scrim appears only on the game-over screen, not during play | None |
| Holographic blobs | **Risk** | The proposal's "animated foil frame" for legendaries | Use gold metal and the apex emblem, not iridescent foil |
| Over-smooth key art with sourceless rim light | **Yes, as specified** | The vinyl portrait gets an element-coloured rim light from behind, with no source in the scene | Make the rim light the creature's own element aura, the same light the roaming sprite's rim shows, so it has a source |
| Generic outline icons in rounded shapes | **Borderline** | HUD icons are stock stroke glyphs in cream circles (`.icon-btn`) | Redraw the HUD icons in the creature outline style (plum ink, chunky shapes) |
| Every panel equally loud | Untested | Needs a full-screen capture | Check in the target frame |

That is 1 tell present as specified, 2 borderline and 2 risks: as written, the proposal would probably **fail G4**. All five have cheap fixes, and two of them (the rim-light source and gold instead of foil) belong in the style brief now. This is the clearest example of something M3 catches that the research missed.

## What each document should borrow from the other

**Into the 2048 Siege pipeline from M3**, in priority order:
1. **Gates G1–G7 before scores.** G4 as above; G5 as the Pokémon silhouette test plus reverse image search; G2 adapted to PixiJS (frame time, draw calls, single-file size).
2. **A target gameplay frame per candidate.** A real mid-wave frame at 390×844 with effects running, not a sprite sheet.
3. **A fresh-eyes reviewer, keeping the lower score.**
4. **Player tests.** A 5-second recognition test for element and stage, an A/B on sticker vs flat-vector tiles and on vinyl vs clay portraits, and later an ad CTR test.
5. **An Art Bible v1 with one tokens module** feeding `hud.css`, PixiJS and the prompt templates.
6. **A borrow ledger and an asset strategy ledger**, with an in-engine approval screenshot for every asset.
7. **Runtime performance budgets** measured on a low-end phone.
8. **Decision record, change control and a style owner.** Add live-ops, localization and store rules once those matter.

**Into M3 from the 2048 Siege pipeline**, since M3 currently leaves these open:
1. **Concrete AI production mechanics:** model choice, reference-image strategy, generation order, keying rules, and versioned raws because there is no seed. M3 B10 is policy only.
2. **Quantified accessibility:** compute the contrast of numbers and pieces against every plate colour, and check greyscale collisions with L* values, rather than only "check contrast".
3. **One character across several styles:** canonical design, detail levels and identity anchors. This is useful if M3's meta layer has characters, portraits or key art.
4. **IP evidence for AI art:** model reproduction rates, recent rulings, and stripping franchise names from prompts.
5. **Market data with figures** to answer M3 input 2, rather than leaving it as a question.
6. **An audit of the asset pipeline code**, as a G6 producibility step.

## Merged pipeline (recommended)

1. **Brief:** the M3 A1 inputs, with the proposal's 11 criteria as the scoring lens. Add audience, live-ops, localization and store/ads.
2. **Borrow ledger:** one trait per reference. Examples: Threes' "add one feature per stage", Supercell's low/high export, Pokémon TCG's 3D-as-premium tier, Candy Crush's shape-per-colour pairing.
3. **Candidates:** the winner plus the runner-up per layer, each written in M3's renderable terms.
4. **Fix the pipeline:** the report's Table 9, then generate the vertical slice for each candidate on Nano Banana 2.1.
5. **Target frames:** a mid-wave PixiJS capture per candidate, at 390×844 and on one tablet size.
6. **Gates G1–G7**, adapted as above.
7. **Scoring:** the proposal's weighted table to choose, M3's 0–3 scorecard to clear the Premium bar (every category 2 or more, average 2.3 or more), and a fresh-eyes reviewer.
8. **Player tests:** a 5-second recognition test, A/B tests, and a look-alike test.
9. **Lock:** the A5 decision record, Art Bible v1 with a tokens module, and prompt templates generated from the tokens.
10. **Produce:** the full ~100 assets, with ledger rows, in-engine approvals and a human pass on the 8 base pets.
11. **Govern:** a scorecard each milestone, a versioned Bible, an owner, and live-ops and store rules when they start to matter.

## Caveats

- The ratings and coverage scores are my judgement from reading both documents. They are not measured.
- M3's own scorecard is adapted from a 3D-first kit, and its budget numbers are Godot starting points. Treat them as defaults to re-measure in PixiJS.
- The G4 check is based on the current code and the written proposal. A rendered target frame could raise or lower the count.
