# Phone polish plan (2048 Siege)

Goal: a build that a player can pick up on a phone and play with no friction. It opens fast, fits every portrait phone, every control is easy to tap, it never loses a run by accident, and the end of a run is clear. The work is on the branch `ux-journey`. All decisions are defaults (the user asked for "default everything"); each one is written down so it can be changed.

## Findings (phone audit, 2026-10-14)

Measured in the browser at 360×640, 390×844, 430×932 and 844×390.

1. **The board is small on short phones.** The world is about 1 : 2.1 (width : height), and the stage keeps fixed bands of 136 px (top) and 76 px (bottom) for the HUD. At 360×640 the board is 173 px wide (tiles about 40 px), half the screen width. At 390×844 it is 254 px.
2. **Landscape on a phone is unplayable.** At 844×390 the board is about 50 px wide.
3. **The top-left icons wrap into two rows** (Pause and Sound, then "?") at 390 px and below.
4. **Small text and small targets.** Several labels are 9 to 11 px. The tutorial "Got it" button is about 28 px tall, and "Skip tutorial" is a text link.
5. **The help sheet does not fit a short phone.** Its title touches the top edge, and the close buttons are below the fold.
6. **No long-press guard.** A long press on the canvas can open the iOS callout or the Android context menu.
7. **No loading state.** The page is blank until the fonts and textures load.
8. **The end of a run is thin.** The game-over card has a score, a wave and the top block. There is no summary and no share.
9. **No install support.** There is no web app manifest and no home-screen icon, so the game cannot run full screen from the home screen.
10. **A reload loses the run.** Mobile browsers reload background tabs often.
11. **No speed control, and no way to inspect a block.**

## Phases

Each phase ends with: `npm test` green, a browser check at phone sizes, and a commit. A code review (target 9.5 or more) follows phase 4 and the last phase.

### Phase 1: Fit the screen

- 1.1 The stage takes its top and bottom bands from the real HUD (the bottom edge of the status bar, the top edge of the bottom bar), measured on each resize, not fixed numbers.
- 1.2 Compact HUD on touch screens and on windows 720 px tall or less: 44 px icon buttons, a smaller score card and Top chip (no labels), a higher status bar, lower bottom bars.
- 1.3 One row of icons at the top left: Pause and Sound. "How to play" moves into the pause menu only.
- 1.4 Portrait only: on a phone in landscape (coarse pointer, landscape, height under 500 px), a "Turn your phone upright" screen covers the game and the game pauses.
- Acceptance: at 360×640 the board is 15% wider or more than now; no HUD element overlaps the lanes or the board at 360×640, 375×667, 390×844, 412×915 and 430×932.
- Result: board width 172 → 197 px at 360×640 (+14%), 183 → 208 px at 375×667 (+13%), 255 → 279 px at 390×844 (+10%). No overlap at any of the five sizes. The rest of the height goes to the lanes, which the sim fixes, so +15% at 360×640 needs a shorter lane field (a gameplay change, not done).

### Phase 2: Touch and system

- 2.1 Block the long-press callout and the context menu on the game.
- 2.2 Buttons do not zoom on a double tap (`touch-action: manipulation`), and every button shows a pressed state.
- 2.3 Haptics on Android (the Vibration API): a light tick on a merge, a stronger pulse when a block is lost, a pattern for a boss kill. On by default; a setting turns them off. iOS Safari has no Vibration API, so nothing happens there.
- 2.4 Sound starts on the first touch (the audio context resumes inside a user gesture).
- 2.5 Install support: a web app manifest (`display: standalone`, `orientation: portrait`), icons of 192 and 512 px (plus a maskable one), an Apple touch icon, and the Apple web-app meta tags.

### Phase 3: Readable and easy to tap

- 3.1 No text under 12 px on the run screen and in the dialogs.
- 3.2 Every button is 44 px tall or more: the tutorial buttons, the help sheet, the pause menu and the dialogs.
- 3.3 The status bar shows the best wave ("Wave 3 · best 7"). The best wave becomes the main record.
- 3.4 A larger Top chip.

### Phase 4: Dialogs on a phone

- 4.1 Help sheet: space for the safe area at the top, an inner scroll, and the buttons always visible at the bottom.
- 4.2 Die card and game-over card: they fit at 360×640, and they scroll inside if a screen is too short.
- 4.3 Run summary on the game-over card: waves, time, kills, bosses killed, blocks lost, best combo and fusions made, plus "New best wave!". Buttons: Play again (main) and Share. Share uses the Web Share API, or copies a line of text when the API is missing. Inside another page's frame (the phone link's artifact viewer, which refuses the share sheet) it copies the line straight away, inside the tap, without the frame's own address. If even that is refused, the line shows under the buttons, selected, to copy by hand (T43, `src/ux/share.js`). The artifact publisher warns that the page "offers a file through a download link": that is PixiJS's own `extract.download()`, bundled and never called. The game offers no file, so it needs no `downloads` capability.
- 4.4 Settings page in the pause card: Sound, Vibration (hidden where the Vibration API is missing), Reduce motion. Replay tutorial stays in the help sheet.
- 4.5 Found on the way: under the system's reduced-motion setting, banners and popups had a 0.01 s animation, so they vanished at once. Reduce motion is now a setting (it starts from the system preference) that fades news in place for its full time and stops shakes, flashes and pulses (canvas included).

### Phase 5: Play controls

- 5.1 Speed button (x1, x2), at the top right next to the Top chip (a third icon on the left would wrap the top bar on a 360 px phone). x4 unlocks after the first boss kill. The speed goes back to x1 when a boss wave starts and for each new run. The sim stays deterministic, because speed only adds fixed steps to each frame.
- 5.2 Inspect card: a tap on a block shows its range (now) and a small card with its element, attack, stage and fusion progress. At the merge with the art fork, the art fork's richer card (`src/ui/inspect.js`: picture, stats, effects, next stage, sell / break) replaced it.

### Phase 6: Loading and resume

- 6.1 A loading screen in `index.html` (the game title on the game background, with a progress pulse). It fades out when the first frame is ready. If loading fails, it shows an error and a Retry button.
- 6.2 Run resume: the game saves the seed and the list of inputs (swipes, Wave now, die picks, and the tutorial hold and guided-wave switches, each with its sim step). After a reload it replays the inputs, which is exact because the sim is deterministic, and opens the pause menu titled "Welcome back" (Resume, or Restart run). A save from another save version, a log this build cannot replay, or a replay that ends somewhere else than its fingerprint is dropped, and a new run starts. Blocked storage means no save, never an error.

### Phase 7: Device check and delivery

- 7.1 A screenshot matrix (360×640, 375×667, 390×844, 412×915, 430×932): the first screen, a wave, a break with a die card, pause, help, settings, the run summary and the rotate screen.
- 7.2 Tests green, a code review of 9.5 or more, `npm run pack`, and docs updated (`meta-and-hud.md` statuses, this plan).
- 7.3 Delivery for a phone playtest: the packed single-file build as a private claude.ai Artifact (a link to open on the phone), and the LAN address of the dev server (`npm run dev` already uses `--host`).

## Code review fixes (between phase 5 and phase 6)

The review of the boss reward and the P0 HUD fixes scored 8/10 (nothing critical or high). Fixed:

- Banners stay long enough to read (see `meta-and-hud.md`, Part D, item 1), and stop while paused or behind a die card.
- The pause logic is a tested state machine (`src/ux/pause.js`): Escape steps back one level (the restart confirm and settings go back to the menu, How to play goes back to the menu), and focus stays in the pause dialog (the rest of the HUD is inert while it is open).
- The boss reward plans over live blocks only (a block broken in the same step no longer takes an x2). The planner only re-counts the links that a move changes: the same speed on typical boards (about 0.1 ms), 2.5 times faster in the worst case (0.4 ms instead of 0.9 ms), and the same plans as before on 20,000 test boards.
- "Merge the new pairs!" shows only when the x2s made a pair.
- A game-over card still on its way no longer covers a restarted run; Cmd/Ctrl/Alt + a key is the browser's; the dev helper `__mb.advance()` steps while paused; `tools/boss-value.mjs` measures the economy model's boss value.

## Final review fixes (7.5/10 → fixed)

- Storage that is blocked (a sandboxed frame, private browsing) no longer throws in the resume helpers; a save from another version, a log with unknown inputs or steps out of order, and a replay that throws are refused, and a new run starts.
- Escape from How to play no longer leaves the closed sheet reachable by keyboard: the help sheet opens or closes before the pause view decides what is inert, and closed dialogs and a hidden tutorial bubble are `visibility: hidden`.
- "Restoring your run…" now shows before the replay; the stage re-measures when a bar changes size; a broken frame shows the failure screen with "Try again"; turning the phone upright opens the pause menu; Reduce motion also stops the red edge flash, the coin bar shake, the coin pulse and the announcement bounce; the inspect card sets its width before it measures its height; the pause dialog is named by its title; Share can copy on a plain-http address; the boss banner comes before "x4 speed unlocked".

## Device check (phase 7.1)

Screenshots in `reports/ux/shots/phone/` (390×844 unless named): first screen, a wave, the die card, pause, settings, How to play, the run summary, the first screen at 360×640, and the rotate screen at 740×360. Found and fixed on the way:

- At 360 and 375 px the three status pills overlapped ("First wave: when ready" is the longest text). On screens 380 px wide or less the status text is a step smaller, and the block count shows as the icon and the number.
- `?tutorial` replays the opening; it now starts a fresh run instead of resuming a saved one.

## Merge with the art fork (2026-10-15)

The art fork's work (commit `192ea15` on main) was merged into this branch, and main was fast-forwarded to the result. Changes the merge needed:

- **One inspect card.** Both forks had built one, with the same class names. The art fork's card stays (more information, and it sells or breaks a block); this branch's card, `src/ux/inspect.js` and its test are gone.
- **The art card on a phone.** It opens below the top bars, so the pause button stays in reach. Its close button has a 44 px target, and the sell / break button is 44 px tall. It hides while the game is paused, so it never covers the menu, and the in-game Reduce motion setting stops its pop.
- **Resume.** Sell / break (`run.discard`) is an input in the saved-run log; a refused one is not recorded. `SAVE_VERSION` is 2, because the art fork's basic attacks replay old logs differently.
- **The single-file build.** It carries the art fork's sprites in `window.__GEN__`; main.js loads them (before, the single-file flag skipped all sprite loading). `npm run pack` caches each sprite's WebP by content, so a pack takes seconds instead of over half an hour.
- **Haptics.** No vibration before the player's first tap: the browser refuses it and logs an error for each call.
- **Roaming pets are sim state.** The art fork's pets layer moved the fusions' pets on frame time and its own random numbers, and the sim aimed from where they stood. So the sim depended on the screen, and a resumed run with a fusion did not match its save and was dropped. The walking now runs inside the sim step (`src/sim/roam.js`: fixed step, the run's own random stream), and `src/kv/roam.js` only draws it. A run has it only when made with `{ roaming: true }`; the game sets it when it draws the pets, and the save records it. A skill cast from a namecard (`castSkill`) is a saved input.
- **Namecards.** Skills charge on sim time (not while paused; faster at x2 and x4, as the wave is), and the strip hides during a die pick, so no cast happens in the pick.
- **The card and the coach.** No card during the guided opening (its Break could remove one of the 8s the first lesson merges), and a new tip closes an open card. The card's buttons act on click, so Enter and Space work.
- **Reduce motion** (the in-game setting) also stops the namecards' shine, bob and nudge, and the skill cut-in fades in place.
- **Economy model.** On the merged game, a boss's x2s add 0.68 of the top block (`tools/boss-value.mjs`, which now plays with roaming pets); `tools/economy.mjs` uses that.

## Out of scope (next)

Codex, ranking, daily seed, missions, a home screen and other meta features (Part A of `meta-and-hud.md`). The plan leaves room for them: the pause menu and the settings sheet are where Codex and Home will go.

## Progress

| Phase | Status |
|---|---|
| P0 HUD fixes (banner queue, pause menu, restart confirm, Auto behind `?dev`) | Done (`1dfaa35`) |
| 1 Fit the screen | Done |
| 2 Touch and system | Done |
| 3 Readable and easy to tap | Done |
| 4 Dialogs on a phone | Done |
| 5 Play controls | Done |
| 6 Loading and resume | Done |
| 7 Device check and delivery | Done (private artifact; merged into main with the art fork's work) |
