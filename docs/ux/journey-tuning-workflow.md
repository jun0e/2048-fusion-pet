# User journey tuning workflow (2048 Siege)

This workflow tunes the player journey: the first run, the tutorial, the first wave, the first loss, the retry and the return visit. The game-skills-kit has no dedicated onboarding skill. This workflow combines the parts of the kit that cover player flow, and adapts them to a PixiJS web game.

## Sources in the kit

| Phase | Kit source (in `factory-game-zps-plugins` and `qstack`) |
|---|---|
| Phases and gates | `threejs-game-director` and its `references/phase-playbook.md` |
| Design brief, first minute, fun tests | `threejs-gameplay-systems/references/game-design-level-design.md` and its checklists |
| Tuning loop, first 30 seconds | `threejs-gameplay-systems/references/gameplay-workflows.md` |
| Bot playtest, playtest QA | `threejs-qa-release/references/playtest-bot.md` and its checklists |
| UI states, HUD, mobile input | `threejs-game-ui-designer/references/ui-patterns.md` and its checklists |
| Teaching rules | `godot-genre-puzzle` (non-verbal tutorial; teach, confirm, twist) |
| Scope rule | `qstack/principle-experience-first` |
| Process rules | `rules/app.instruction.md` (worktree per session, declared write paths), `rules/writing.instruction.md` (ASD-STE100 style) |

## Journey stages

| Stage | What the player sees | Current code |
|---|---|---|
| S0 Load | Fonts, canvas, HUD | `main.js` start |
| S1 First screen | Board with two 8s; the opening countdown waits | `run.js` opening, `tutorial.js` hold |
| S2 Guided opening | Swipe, swipe cost, defend, start the wave | `tutorial.js` GUIDED |
| S3 First wave | Lanes, first enemy, first hit on a block, first kill coins | `tutorial.js` TIPS |
| S4 First break | Swipe to grow, Wave now | TIPS `break` |
| S5 Growth beats | Awaken at 16, new die at 64, fusion at 256, boss at wave 5 | TIPS and announcements |
| S6 First loss | Block lost, game over | `hud.showGameOver` |
| S7 Retry | Restart, second run | `main.js` restart |
| S8 Return visit | Tutorial done, best score | localStorage `siege:tutorial`, `mb:best` |

## Phase 0: Isolate the work

1. Work in one git worktree for this fork: `.worktrees/ux-journey`.
2. Declare the write paths before work starts. Do not write to paths that another fork owns.
3. Re-read a shared file immediately before an edit. Keep shared edits small.
4. Write all docs, comments and reports in ASD-STE100 style.

## Phase 1: Write the journey contract

Write a short first-session brief before any change.

1. State the player promise for the first session in one sentence.
2. State the target feeling for each stage (S0 to S8).
3. Write the core loop contract: "The player does [verb] to get [objective] while [pressure]. Success gives [reward]. Failure costs [cost], then [retry]."
4. Write the first-minute plan: first input, first decision, first reward, first threat, first recovery beat.
5. Write the teaching map. Give each concept one stage and one trigger. Introduce one concept at a time. Teach it, then confirm it, then twist it.
6. List the non-goals for this pass.

Exit evidence: the brief, the loop contract, the first-minute plan and the teaching map exist in `docs/ux/`.

## Phase 2: Instrument the journey

1. Add a journey log. Record the time of each milestone event: first input, first swipe, first merge, first 16, first wave start, first kill, first block hit, first block lost, game over, retry.
2. Record the tutorial events: step shown, step done, step skipped, tip shown, help opened.
3. Record the text load: the words shown to the player before the first swipe and before the first wave.
4. Expose the log on `window.__mb.journey` for browser checks. Keep it out of the player UI.
5. Keep all randomness on the seeded RNG, so that each run can be repeated.

Exit evidence: one clean first run produces a complete journey log.

## Phase 3: Measure a baseline

1. Run a journey bot on the sim in Node. Use two skill levels: a skilled bot and a novice bot (slow reaction, worse swipe choice).
2. Run a reckless bot. It must reach the fail state, and the retry must restore play.
3. Record the journey metrics for each bot and each seed. Use at least 8 seeds.
4. Do a manual first run in the browser at phone size, with cleared storage. Play for at least 2 minutes.
5. Capture a screenshot of each journey stage.
6. Read the console. It must have no errors.

Do not add Playwright or e2e suites. Use the Node sim bot and the built-in browser.

Exit evidence: `reports/ux/journey-baseline.md` with the metrics table, the screenshots and the friction list.

## Phase 4: Find the friction

Apply the kit tests to each stage. Mark each test pass or fail, with evidence.

1. The player can interact within 5 seconds of load.
2. The first 30 seconds contain a real decision.
3. The objective is clear without the help sheet.
4. The player cannot ignore the main mechanic and still progress.
5. Each failure shows the player why it happened.
6. Early failures are recoverable.
7. The retry is fast enough to invite another attempt.
8. Text points at the thing it explains. The text does not explain an obvious control.
9. No tip covers a threat, a block or the next decision.
10. No softlock occurs (locked board, no coins and no enemies).

Sort the failures by journey stage and by impact.

## Phase 5: Tune in small passes

1. Change one axis in each pass: opening board, guided steps, tip timing, first-wave pressure, first-session economy, game-over screen, retry, return visit.
2. Put each tuned value in a named constant.
3. Run the journey bot before and after each pass.
4. Record each change and its metric delta in the report.
5. If a pass makes the metrics or the feel worse, revert it. Do not add a second change to compensate.
6. Prefer teaching through play over text. Remove text before you add text.

Exit evidence: the before and after metrics for each pass.

## Phase 6: Check the UI states

1. Inventory the journey UI states: first screen, guided bubble, tip, help sheet, pause, wave banner, new die card, game over, retry, return visit.
2. Check each state against `game-ui-quality`, `hud-readability`, `responsive-ui-fit` and `mobile-input` checklists.
3. Check text fit at phone and desktop sizes. Check touch targets and safe areas.
4. Check that each important change has two feedback channels (for example motion and text).

Exit evidence: a phone screenshot and a desktop screenshot of each changed state.

## Phase 7: Verify

1. Run `npm test`. All tests must pass.
2. Run the journey bot. Compare the results with the baseline.
3. Do a clean first run in the browser at phone size.
4. Do a return visit with a saved state.
5. Rebuild the single-file HTML with `npm run pack`.

## Phase 8: Report

Write `reports/ux/journey-tuning.md`. Include:

- the journey contract and the teaching map;
- the metrics table, before and after;
- the fun-test results for each stage;
- the tuned constants and their values;
- the screenshots of each journey state;
- the remaining risks and the open questions.

## Starting targets

These targets are first estimates. Measure them, then adjust them.

| Metric | Starting target |
|---|---|
| Time from load to first input | 5 s or less |
| Words shown before the first swipe | 20 or fewer |
| Time to the first merge | 10 s or less |
| Time to the first turret (a block of 16) | 60 s or less |
| Time to the first wave | 90 s or less |
| First loss for the novice bot | not before wave 3 |
| Time from game over to play again | 3 s or less |
| Tips | one at a time, 20 s or more apart |
| Softlocks | none |
