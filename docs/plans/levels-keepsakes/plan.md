---
title: Spawn level bar and keepsakes
status: completed (review 8.5/10, no critical issues; not merged)
branch: keepsakes (.worktrees/keepsakes, dev server siege-keepsakes on port 5186)
requested: 2026-10-16
---

# Spawn level bar and keepsakes

## Request

1. A level bar. Each level raises the odds of bigger new tiles, like the shop odds of a Teamfight Tactics level. After the player makes a 512 in a run, 2s stop spawning.
2. Keepsakes. The player brings one keepsake into each run. The highest tile ever made unlocks them. There are 6 for now.
3. Keepsake 1 is Iron Fist: tiles that move in a swipe damage the monsters they hit. The first run equips it automatically, with a tutorial.

## Baseline (before the change)

`node tools/level-probe.mjs --levels=off`, 48 bot games:

- Wave reached: median 24 (quartiles 10–35).
- Top block: median 512. 128 in 90% of games, 256 in 73%, 512 in 54%, 1024 in 38%, 2048 in 10%.
- Merges per wave: about 16.

## Phases

### Phase 1: Spawn level (sim)

- [x] `src/sim/levels.js`: 9 levels, the odds table per level (2, 4, 8, 16), the XP needed per level, and `spawnTable(level, maxTier)`. A table drops the 2 when the run has made a 512, and the run says so once (a `no2` event). The odds are gentler than TFT's own table: TFT-sized steps made bot runs about 50% longer.
- [x] The run counts XP: +2 for each cleared wave, and +4 bought for the price of 2 swipes (`run.buyXp()`). Merges give none: XP from merges doubled bot runs. The level is capped at the run's top tier − 3 (`levelCap()`). At the cap the bar fills and waits, and Buy XP is off. A `levelUp` event fires at each new level.
- [x] A spawned 16 rolls its element from the deck, the same as a merged 16.
- [x] Save and resume: `buyXp` is a recorded input, the save version goes up to 4, and the fingerprint includes the keepsake, the level and the XP.

### Phase 2: Keepsakes (sim and storage)

- [x] `src/sim/keepsakes.js`: 6 keepsakes with their unlock tiers. Each one changes a rule of the run through `createRun({ keepsake })`:
  - Iron Fist (the starter): blocks punch the foes they slide into.
  - Coin Purse (a 128): +60 coins at the start, and kills pay 20% more.
  - Spiked Collar (a 256): blocks have 30% more health.
  - Lucky Clover (a 512): new blocks use the odds of 2 levels higher.
  - Phoenix Feather (a 1024): once a run, the last block revives as the biggest block lost that run, at full health. The foes on the board go back to the gates (`defense.blastBoard()`), and the player gets 4 swipes of coins.
  - Quake Boots (a 2048): a swipe with 2+ merges stuns and damages every foe on the board (`defense.stunBoard()`). The damage is the top block's base hit. The stun lasts 1.5 s (bosses half as long).
- [x] Iron Fist (`src/sim/punch.js`): `slidePaths()` predicts where every tile goes in a swipe. Foes in a moving tile's path take a punch after the swipe, as hard as the tile's base hit. Each foe takes 1 punch per swipe at most, from the biggest tile.
- [x] `src/ux/meta.js`: the best tile ever made, the equipped keepsake, the keepsakes the picker has shown and a run count, in localStorage (`siege:meta`). A count of 0 means the first run.
- [x] The save log keeps the keepsake, so a resumed run keeps it.

### Phase 3: HUD and tutorial

- [x] Level badge at the bottom left, above the coin plate: the level number and an XP ring. Tapping it opens a card with the odds for this level and the next, and Buy XP. The first level up brings a coach tip that points at it.
- [x] Keepsake badge at the bottom right, above Wave now. Tapping it opens a card that tells what it does and what unlocks next.
- [x] Keepsake picker before each run after the first, but only once the opening tutorial is done. It shows locked keepsakes with their unlock tile. New ones wear a NEW tag, and the last keepsake is picked already.
- [x] First run: Iron Fist equipped with no picker. The opening introduces it with a guided step on the keepsake badge. The first time a foe bites a block, the game slows to quarter speed for up to 8 s, and the coach shows the swipe that punches it. The punch ends the tip, and a "Punch!" tip follows.
- [x] Banners: level up (with the new odds), "No more 2s!", keepsake unlocked and Phoenix Feather. The game-over card lists new keepsakes and the run's punches.

### Phase 4: Balance and verification

- [x] `tools/level-probe.mjs`: compare the wave reached with and without levels, with each keepsake, and with a bot that buys XP. Tuned toward the baseline with gentler odds, no XP from merges and the level cap. Levels still add about 4 waves to the bot's mean (see Results).
- [x] Tests for levels, keepsakes, punches, storage, resume and the coach tip (`test/levels.test.js`, `test/keepsakes.test.js`).
- [x] Single-file build (`npm run pack`).
- [x] Phone-size check in the browser (375×740, dev server on port 5186): the discs clear the board and the dice row, the opening's keepsake step, the slow-motion punch tip with its finger, a punch, the level card with Buy XP, the keepsake card, the picker (NEW tags, locked keepsakes), the game-over card's new keepsake, Play again into the picker, and `?kv` without discs or picker. Wide screens keep the discs in the HUD column.

## Follow-up: fusion pick (2026-10-16)

Request: "when create a fusion, give user decision to choose what fusion animal it become, but still only choose from the element of material block".

- [x] A block keeps its material: the elements of every elemental block merged into it (`t.mats`; `materialOf`, `mergeMaterial` in `src/sim/classes.js`).
- [x] At 256 the run offers each fusion its material can make (`fusionOffers`, up to 4; the merge rule's pick first, so autoplay and `autoChoose` play as before) on a card like the die pick (`choose` is the same input). One pair fuses at once; one element rolls a die as before. A boss x2 that stops at 256 offers the pick too.
- [x] The card shows each fusion's generated pet portrait, name, the two elements and what it does (`src/ui/hud.js`); keys 1–4. The namecard follows the pick. The block card lists the options; How to play explains it.
- [x] Save version 5 (the fingerprint holds the material). Tests: `test/fusion-pick.test.js` (9).

## Defaults chosen (to revisit)

In README "Prototype defaults to revisit" (its first five bullets):

- Spawn odds are gentler than TFT's, with XP from waves and coins only and a level cap.
- Buy XP is in the level card (two taps), not a button on the bar.
- Five of the six keepsakes are new ideas. Only Iron Fist came from the request.
- Iron Fist's punch: 1.25 past the block's new cell, 0.9 to each side, the block's base hit.
- Keepsakes can't be swapped mid-run.

## Results

- `npm test`: 298 tests pass.
- Bot balance (`node tools/level-probe.mjs --seeds=192`, 192 games each, mean wave): 20.9 without levels; 25.1 with levels; 26.2 for a bot that buys XP.
- Mean wave per keepsake: Iron Fist 28.6, Coin Purse 29.0, Spiked Collar 30.3, Lucky Clover 32.8, Phoenix Feather 26.3, Quake Boots 28.0.
- The single-file build `2048-siege.html` was rebuilt.
