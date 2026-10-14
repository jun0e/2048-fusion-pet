# User journey baseline (2048 Siege, before tuning)

This report records the first-run journey as it shipped (commit `afb684c`). It is phase 3 and phase 4 of `docs/ux/journey-tuning-workflow.md`. The final numbers after tuning are in `journey-tuning.md`.

These numbers use the shipped boss reward (the biggest block goes up a tier). `journey-tuning.md` uses the later x2 boss reward for both columns, so its baseline numbers differ a little after wave 5.

## How it was measured

- `tools/journey-probe.mjs` plays the real sim and the real tutorial coach without a browser. Run it with `node tools/journey-probe.mjs --profile=baseline --seeds=24`.
- Three bot players read bubbles at a set speed and act in game time:
  - **Skilled:** reads 5 words/s, swipes every 0.5 s with the autoplay strategy, presses Wave now.
  - **Novice:** reads 3 words/s, stops to read every tip, swipes every 1.2 s, makes 45% random swipes, waits for countdowns.
  - **Reckless:** skips the tutorial, swipes at random, retries after the game over.
- Each player runs 24 seeds. Tables show the median and the 10th to 90th percentile.
- A clean first run was also played in the browser at phone size (390×844). Screenshots are in `shots/`.

## Baseline numbers (median)

| Metric | Skilled | Novice | Reckless |
|---|---|---|---|
| Words before the first swipe | 15 | 15 | 15 |
| Time to the first swipe | 3.3 s | 5.8 s | 0.2 s |
| Words before the first wave | 52 | 52 | 15 |
| Reading time before the first wave | 11.6 s | 20.5 s | 0 s |
| Time to the first wave | 14.6 s | 23.8 s | 6.5 s |
| Required tutorial taps | 1 | 1 | 1 |
| Tips in the first 5 minutes | 10 | 9 | 0 |
| Shortest gap between two tips | 0.6 s | 0.6 s | – |
| Idle countdown time in the first 5 minutes | 0.2 s | 43.3 s | 0.2 s |
| Time to the first block lost | 41.7 s | 33.5 s | 27.0 s |
| Wave of the first loss | 16 | 14 (p10: wave 1) | 17 |

## Friction found

Each item names the failed test from the workflow (phase 4) and the evidence.

1. **Novices lose the whole game on wave 1** (test 5: each failure shows why; test 6: early failures are recoverable). 3 of 24 novice runs lost on wave 1, about 45 s into the session. With tips ignored, 0 of 24 lost by wave 3. Cause: wave 1 starts several tips in a row, the reader stops to read them, and the enemies destroy the blocks.
2. **Tips arrive in bursts** (test 9). The shortest gap between two tips was 0.6 s. Players saw 9 to 10 tips in the first 5 minutes.
3. **Too much text before play** (test 8). The opening showed 52 words in 4 bubbles before wave 1. Two bubbles needed a "Got it" tap. The defend rule was taught before any enemy existed.
4. **The first wave is a coin flip.** Wave 1 sends 6 foes down 2 random lanes. A new player has one turret, so the lanes often have no defence (test 5).
5. **Idle breaks** (test 3: a real decision every 30 s). A novice with no coins, or with a locked board, waited out full break countdowns: 43 s of the first 5 minutes.
6. **A second text block on load.** The HUD hint bar (27 words) showed with the first bubble until the first frame hid it (`shots/00-before-first-screen-hint-bar.jpg`).
7. **Tips cover the action.** The lanes tip sat over the lit lane (`shots/05-before-lanes-tip-over-lane.jpg`). The attacked tip covered the top rows of the board (`shots/06-before-attacked-tip-over-board.jpg`).
8. **A tutorial bubble stayed on top of the game-over card** when the run ended during the opening (`shots/07-before-bubble-over-game-over.jpg`).
9. **The game-over card did not say why**, and nothing helped the next run. The card said only "Your last block fell on wave N."
10. **A returning player had no goal.** There was no best wave and no target for the next run.

## Tests that passed

- The player can interact within 5 seconds (test 1). Skilled 3.3 s, novice 5.8 s (just over).
- The objective is visible without the help sheet (test 3).
- The main mechanic cannot be ignored: blocks under 16 do not shoot (test 4).
- No softlock: a locked board reopens when a block is destroyed (test 10).
