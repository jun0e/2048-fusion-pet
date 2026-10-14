# User journey tuning (2048 Siege)

This report is phase 8 of `docs/ux/journey-tuning-workflow.md`. It covers the first run, the tutorial, the first wave, the first loss, the retry and the return visit. The work is on the git branch `ux-journey` (worktree `.worktrees/ux-journey`). The baseline is in `journey-baseline.md`.

## Result

- **Shorter opening:** a new player sees 6 words before the first swipe (was 15) and 26 words before the first wave (was 52). No bubble needs a tap.
- **Faster first turret:** it arrives at 2.8 s for a novice (was 5.8 s) and 1.5 s for a skilled player (was 3.3 s).
- **No early losses:** no novice run lost by wave 3 (baseline: 3 of 24 lost on wave 1). The first wave of a first run now comes down the column of the player's first turret, so the turret visibly wins.
- **Spaced tips:** ordinary tips are 16 s apart. Urgent tips (a block hit, out of coins) still come 2 s after the last one. The shortest gap went from 0.6 s to 7.8 s for a novice.
- **Lessons stay readable:** the rule that blocks break for good is on screen for 1 s or more in every run with a block hit (24 of 24, skilled and novice). A tip follows its block when the block merges. A tip cut within 1 s comes back once.
- **Less idle time:** a novice waits 17.5 s in countdowns in the first 5 minutes (was 46.5 s). A break shrinks to 4 s when no swipe is possible.
- **Loss and retry:** the game-over card says what broke the last block. The next run opens with one lesson.
- **Return visit:** a returning player sees their best wave as a goal.
- **Boss reward:** a boss kill now gives x2s to the other blocks, aimed to make pairs (see "Boss reward" below). All numbers in this report use it.
- **Tests:** all pass (118 tests; 79 before this work).

## Journey contract (phase 1)

**Player promise (first session):** "Merge blocks into turrets, and hold the siege a little longer each run."

**Core loop:** The player swipes to merge blocks into turrets while enemies come down the lanes and break blocks. Kills and cleared waves give coins for more swipes. When the last block falls, the run ends, and the retry starts with one lesson.

**First-minute plan:**

| Beat | What happens | Time (novice) |
|---|---|---|
| First input | Swipe the two 8s together | 2.8 s |
| First reward | The 16 becomes a turret at once | 2.8 s |
| First decision | Grow the board; the lit lane follows your biggest block | 3 to 16 s |
| First threat | Wave 1: 4 foes down your turret's lane | 16.8 s |
| First success | Your turret kills them | 21.7 s |
| First recovery | Break: swipe to grow, or tap Wave now | after wave 1 |

**Teaching map:** one concept at a time; teach by doing first, then a short text.

| Concept | When | How |
|---|---|---|
| Swipe and merge | First screen | Hand animation, 6 words; the swipe is the lesson |
| 16 = turret | First merge | The 16 appears; 7 words point at it |
| Swipes cost coins | While growing | 6 words point at the coin bar; the coins drop as the player swipes |
| Start the wave | After 3 more swipes | The Wave now button rings; the countdown runs again |
| Turrets shoot their column | Wave 1 (first run) | Seen: the foes come down the turret's lane and die |
| Lanes | Wave 1 start | Tip above the field: "Enemies come down the lit lanes." |
| Blocks break for good; losing all = game over | First block hit | Urgent tip (one tip says both) |
| Kills pay coins | First kill | Tip on the coin bar |
| Out of coins | First failed swipe | Urgent tip; the break also shrinks and Wave now pulses |
| Elements, unlocks, fusion | Later waves | Depth tips wait for their wave (colour waits for wave 3) |
| Why I lost | Game over | Cause line on the card |
| What to try next | Retry | One lesson as the first tip of the next run |
| A goal | Return visit | "Your best is wave N. Beat it!" |

## Changes, pass by pass

| Pass | Change | Evidence (novice, median) |
|---|---|---|
| 1 Opening | 4 short steps. They advance on the first 16, a swipe, a swipe count or a timer. No taps. The defend rule moved to the first hit. Wave now at any step ends the opening. Out of coins during the opening goes to the Wave now step. | Words before the first wave 52 → 26; first turret 5.8 → 2.8 s; required taps 1 → 0 |
| 2 Tips | Tips of 12 words or fewer, shown for their reading time. They use a priority queue (urgent, core, depth), sit 16 s apart, and depth tips wait for their wave. "Attacked" and "lost" merged into one tip. A tip that points at a block follows it when it merges. When the block breaks, the defend tip points at the block count, and a tip about that block alone goes with it. The break tip comes only when a swipe is possible, goes when its break ends, and does not start in the last 3 s of a break. The boss tip lasts until its boss wave is over. A tip that was up for less than 1 s, was dropped from a full queue, or was still waiting at a game over can come again (once for a flash). Depth tips are not offered before their wave. | Shortest gap 0.6 → 7.8 s; losses by wave 3: 3 of 24 → 0 of 24; tips up under 1 s: 1 → 0 |
| 3 First wave | First run only: wave 1 comes down the biggest block's column with 4 foes. The lit lane follows the block during the opening. A player who skips the tutorial gets the normal wave 1. | First block lost 33.5 → 46.8 s |
| 4 Game over | Cause line ("A Griffin Chick broke your last block on wave 2."). The retry opens with one hint. A bubble no longer stays over the card. | Card +2 words |
| 5 Return visit | The best wave is saved, and a returning player sees it as a goal | – |
| 6 Idle breaks | A break shrinks to 4 s when no swipe is possible (no coins or a locked board), and Wave now pulses. The opening countdown is never cut. | Idle countdown time 46.5 → 17.5 s |
| UI | Lane tips sit above the field. Block tips go beside the block, or under the board when there is room above the coin bar and Wave now. No bubble goes over the bottom bar. A hidden bubble takes no taps. The legacy hint bar starts hidden. While the opening holds the countdown, the pill reads "First wave: when ready", not a frozen "15s". | `shots/05-guided-wave-lanes-tip.jpg`, `shots/02-turret-step.jpg` |

## Fun tests (phase 4), after tuning

| Test | Result |
|---|---|
| 1. Interact within 5 s | Pass: first swipe at 1.5 s (skilled), 2.8 s (novice) |
| 2. A real decision in the first 30 s | Pass: grow the board and pick the lane to defend; the lit lane follows the biggest block |
| 3. Objective clear without help | Pass |
| 4. The main mechanic cannot be skipped | Pass: blocks under 16 do not shoot |
| 5. Each failure shows why | Pass: the cause line on the card; urgent tips at the first hit |
| 6. Early failures are recoverable | Pass: no loss by wave 3 for any bot player in 24 seeds |
| 7. A fast retry | Partly: "Play again" works 0.7 s after the loss. Reading the card and the hint takes a novice 11.5 s (was 7.0 s). |
| 8. Text points at its target; no text for obvious controls | Pass |
| 9. No tip covers a threat or the next decision | Partly: lane tips and edge-column block tips are clear. Middle-column block tips go under the board when there is room above the bottom bar; otherwise they fall back to the centre. |
| 10. No softlock | Pass |

## Full metrics

24 seeds, median (10th to 90th percentile). Source: `journey-metrics.md` and `journey-metrics.json`. Reproduce it with `node tools/journey-probe.mjs --compare --seeds=24`.

| Novice | Baseline | Tuned |
|---|---|---|
| Words before the first swipe | 15 | 6 |
| Time to the first turret | 5.8 s | 2.8 s |
| Words before the first wave | 52 | 26 |
| Reading time before the first wave | 20.5 s | 11.9 s |
| Time to the first wave | 23.8 s | 16.8 s |
| Time to the first kill | 30.6 s | 21.7 s |
| Time to the first block lost | 33.5 s | 46.8 s |
| Tips in the first 5 minutes | 9 | 7 |
| Shortest gap between two tips | 0.6 s | 7.8 s |
| Tips up for under 1 s in the first 5 minutes | 1 | 0 |
| Defend rule on screen for 1 s or more (runs with a block hit) | 24 of 24 | 24 of 24 |
| Idle countdown time in the first 5 minutes | 46.5 s | 17.5 s |
| Wave of the first loss | 14 (p10: 1) | 17 (p10: 10) |
| Game over to the next swipe | 7.0 s | 11.5 s |
| Required tutorial taps | 1 | 0 |

**Pace, not difficulty:** the number of novice runs that last 15 minutes is noisy. In two sets of 24 seeds, the tuned build keeps 6 and 5 runs; the baseline keeps 10 and 15. A split test shows the cause: the shorter idle break. With the old break rule, the tuned build keeps 13 and 17. The break makes the game faster, not harder. Players reach more waves in 15 minutes, so more runs end inside the cap. The median loss wave moves from 13–14 to 17–20, the earliest loss from wave 1 to wave 7 or later, and the latest losses from wave 16 to waves 22–25.

## Tuned values

| Value | Where | Setting |
|---|---|---|
| Opening steps | `src/ux/coach.js` `COACH.guided` | swipe (ends on the first 16); turret (`after: 4`); grow (`swipes: 3`, `after: 12`); start (`release`) |
| Opening exits | `endOnWave`, `brokeStep` | Wave now ends the opening; out of coins goes to the start step |
| Tip text | `COACH.tips` | 12 words or fewer |
| Tip time on screen | `readSeconds` | words / 2.5 + 1.5 s, at least 3 s |
| Gap between tips | `gapAfterTip`, `urgentGap` | 16 s; 2 s for urgent tips |
| Tip queue | `queueMax`, `priority`, `minWave`, `when`, `stale`, `reoffer` | 3; note 4, urgent 3, core 2, depth 1; colour from wave 3, unlock from wave 2; the break tip only when a swipe is possible, only in its own break and not in its last 3 s; the boss tip until its boss wave is over; dropped tips can come again |
| Readable tips | `minSeen` (`FLASH_SECONDS`), `follow`, `fallback` | up under 1 s = not seen (comes back once); tips follow a merging block; when a block breaks, the defend tip points at the block count and other tips about it go |
| Guided first wave | `src/config.js` `GUIDED_WAVE.count` | 4 foes, first run only |
| Idle break | `ECONOMY.brokeBreak` | 4 s when no swipe is possible |
| Game-over delay | `src/ux/journey-tuning.js` `GAME_OVER_DELAY` | 0.7 s (unchanged) |

## Boss reward (x2s)

Requested on 2026-10-14. It replaces "a boss kill promotes your biggest block".

- **Rule:** a boss kill gives one x2 for each doubling in the biggest block (256 = eight x2s), so all the x2s multiply up to the biggest block. They go to the other blocks only. No new block appears. One block can take several x2s. The biggest block gets none, and no block grows past it.
- **Where they go:** each x2 goes where it makes the most new merge pairs for the x2s it costs; ties are random (seeded). A pair is two equal blocks in a row or a column with no block between them. When no pair can be made, the x2 goes at random to a block outside every pair, or to a pair that grows together (a pair first when the blocks outside pairs lack the room for the x2s left). Only when nothing else is left does an x2 break the fewest pairs.
- **A block can grow to equal the biggest** and pair with it; one swipe then doubles the biggest block. The variant that keeps blocks one step below the biggest made the game clearly harder, so it was not used:

| Boss reward (tuned journey, 48 seeds) | Skilled | Novice | Reckless |
|---|---|---|---|
| Before: the biggest block goes up a tier | 19 | 16 | 18 |
| x2s, blocks may equal the biggest (shipped) | 17 | 19 | 20 |
| x2s, blocks stay one step below the biggest | 15 | 16 | 15 |

Values are the median wave of the first loss.

- **Economy model** (`npm run economy`): the x2s add 0.86 of the biggest block's value to the board (median over 121 boss kills in 40 autoplay games; the old reward added exactly 1.0). Projection: first 256 at wave 10 and first 512 at wave 15 (as before), first 1024 at wave 25 (was 22). Foes start to leak at wave 30 (as before).
- **Limit:** on a board that already has a pair on every block, the last x2s must go somewhere, and they can break a pair (the fewest possible).
- **Code:** `src/sim/boss-reward.js` (the plan, pure), `src/sim/run.js` (applies it: health, element slots, a `bossReward` event), `src/main.js` (the "x2", "x4" popups and the banner). Tests: `test/boss-reward.test.js` and `test/run.test.js`.

## Screenshots (phone, 390×844)

| Stage | File |
|---|---|
| First screen | `shots/01-first-screen.jpg` |
| Turret step (under the board, beside the 16) | `shots/02-turret-step.jpg` |
| Grow step (coin bar) | `shots/03-grow-step.jpg` |
| Start step (Wave now) | `shots/04-start-step.jpg` |
| Guided first wave and lanes tip | `shots/05-guided-wave-lanes-tip.jpg` |
| Game over with the cause | `shots/08-game-over-cause.jpg` |
| Retry hint | `shots/09-retry-hint.jpg` |
| Return-visit goal | `shots/10-return-goal.jpg` |
| Desktop first screen | `shots/11-desktop-first-screen.jpg` |
| Before: hint bar, tip over a lane, tip over the board, bubble over the card | `shots/00-*`, `05-before-*`, `06-before-*`, `07-before-*` |

## New tools

- `src/ux/coach.js`: the tutorial logic without the DOM. `COACH_BASELINE` keeps the old opening, for comparison.
- `src/ux/placement.js`: the bubble placement rules without the DOM.
- `src/ux/journey.js`: the milestone log, with each bubble's time on screen. In the browser, read `window.__mb.journey`.
- `tools/journey-probe.mjs`: the journey bot. Use `--compare` for baseline against tuned.
- `test/journey.test.js`: 30 tests for the coach (opening, tips, queue, stale tips, flashes, tips that follow a block, autoplay, game over, replay), the log, the guided wave, the idle break, the bubble placement, the copy and a probe smoke run.

## Risks and open questions

1. **Bot players are a model, not people.** The reading speeds and mistake rates are estimates. Confirm with 3 to 5 real first-time players: a 5-second test of the first screen, and a watch of the first 2 minutes.
2. **The retry is slower for readers** (7.0 to 11.5 s), because the hint gives them something to read. The "Play again" button itself is not slower.
3. **Skilled players are short of coins** for about half of the first 5 minutes. This is economy pacing, outside this pass.
4. **Players who never read tips can see a flash.** If a player taps Wave now the moment the break tip appears, the tip goes within 1 s. It comes back once, at a later break. In 24 fifteen-minute runs with this build, neither bot saw one. Earlier builds showed up to 7 for the skilled bot, which reads no tips.
5. **Merge risk:** `src/main.js` and `src/sim/run.js` are shared with the art fork. The edits here are small hooks. Merge this branch before the art fork changes those files again, or rebase on its work first.
