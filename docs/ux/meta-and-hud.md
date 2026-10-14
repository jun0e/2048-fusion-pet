# Meta features and HUD sitemap (2048 Siege)

This document has four parts:

- **Part A** lists meta features that fit the game.
- **Part B** is a sitemap. It gives every flow and every screen, with the information and the buttons that each screen must show.
- **Part C** is an audit of what is missing.
- **Part D** lists the HUD updates in priority order.

The audit checks the `ux-journey` build of 2026-10-14 (the tuned first run and the x2 boss reward).

**Status tags** in Part B:

| Tag | Meaning |
|---|---|
| [have] | In the build now. |
| [part] | In the build, but incomplete or weak. |
| [miss] | Needed, but not in the build. |
| [new] | Part of a proposed meta feature (Part A). |
| [dev] | A developer tool that players can see now. |

## Part A: Meta features

### In-run controls

1. **Speed x1 / x2 / x4.** The sim steps on a fixed clock (`PHYSICS.dt`), so a faster speed is only more steps in each frame, and runs stay deterministic. Swipes stay at human speed, so x4 makes a wave harder. Unlock x4 after the first boss. Go back to x1 when a boss appears, or when 3 blocks or fewer remain.
2. **Pause menu.** Resume, Codex, Settings, Restart (with a confirm), Quit to home. Today, one tap on the restart icon ends the run.
3. **Codex during a run.** It opens from the pause menu, from the help sheet, or with a long press on a block, an enemy or a die. It pauses the run. Tabs: Elements, Fusions (28: every pair of the 8 elements), Legendaries, Bestiary (enemies and bosses), Rules.
4. **Inspect cards.** Today, a tap on a block shows only its range. Add a small card: element, attack, fusion progress, kills. A tap on an enemy shows its name, HP and ability.
5. **Undo one swipe per wave.** The classic 2048 safety net. It restores only the board (the enemies keep their positions), so players cannot abuse it.
6. **Damage meter.** Damage by block and by element: live in the pause menu, and in the run summary. Players learn which fusions carry a run.
7. **Resume an unfinished run.** A run is a seed and a list of inputs. The game can save the list and replay it when it loads. Today, a closed tab loses the run.

### Collection and knowledge

8. **Fusion album.** A Pokédex for the 28 fusion pets and the legendaries. An unknown fusion shows a silhouette and a recipe hint ("Fire + Ice = ?"). The first discovery gives a reward. The album is the home for the cute-to-majestic evolution art.
9. **Bestiary.** Enemies and bosses unlock when the player first meets them. Each entry gives the target rule, the abilities and the boss reward.
10. **Achievements.** For example: "Make Frostnova", "Reach 4096", "Beat a boss with 3 blocks left". Each one also points to a codex entry.

### Progression between runs

11. **Starting deck.** The player chooses the 2 dice to start with, as in Random Dice or Rush Royale. The in-run deck and the die cards exist; this adds a choice before the run.
12. **Element unlocks by account level.** Players start with 4 of the 8 elements. Runs give XP that unlocks the others. This adds variety, not raw power.
13. **Ascension levels.** Wave 20 unlocks Ascension 1 (enemies have 10% more HP), and so on, as in Slay the Spire. An endless run needs a ladder to climb.
14. **Chapter map.** Waves already belong to chapters ("Eternal Forest"). Show the chapters on a map, with star goals for each chapter.
15. **Run boons.** At the start of a run, the player picks 1 of 3 small modifiers: the first 5 swipes are free, the run starts with a 16, or bosses give one more x2. More boons unlock over time.

### Competition and sharing

16. **Ranking.** Personal records first (the build already saves the best wave). Then boards for friends and for all players, then weekly leagues.
17. **Daily seed challenge.** Each day, all players get the same seed, deck and modifier. The sim is deterministic, so a server can replay a submitted input list and check the score.
18. **Replays and ghosts.** A replay is a seed and a few KB of inputs. Players can watch the top run of the day, or race the wave curve of a friend.
19. **Share card.** An image at the end of a run: the board, the top pet, the wave and a seed code ("Beat my wave 23 on this seed").

### Retention and events

20. **Daily and weekly missions.** Small goals that push variety: "Win with only Fire and Wind", "Fuse 3 times in one run".
21. **Event modes.** Boss Rush (a boss every 3 waves), Speed Siege (always x2), Big Board (5×5), One Element.
22. **Season pass.** Cosmetics only: pet skins, board and lane themes, block frames, coin effects.

### Monetization (optional)

23. **Revive once.** When the last block falls, the 3 best blocks come back (for an ad or for currency). Losing all blocks is the only way to lose, so this moment has high value.
24. **Rewarded ads.** Reroll a die card, double the run XP, or get one more undo.

### Settings and accessibility

25. **Settings.** Music and effects volume, haptics, default speed, reduced motion, tips on or off, replay tutorial, language.
26. **Colour-blind support.** An icon or a pattern for each element on blocks, dice and cards, not only a colour.

### Where to start

No server is necessary for: speed buttons, the pause menu, the codex with the fusion album, personal records with a local daily seed, run resume, and the run summary with a share card. Then add the starting deck and ascension. Rankings, replays and leagues need a server; because the sim is deterministic, the server can check each score cheaply.

## Part B: Sitemap

Text only. Each screen gives what it must show (**Info**) and what the player can press (**Buttons**). Feedback that shows for a short time is under **Moments**.

### Flow 1: Launch

**1.1 Boot and loading** [miss]

- Info: game logo [miss]; loading progress [miss]; a tip or a pet picture [miss]; an error message when loading fails [miss].
- Buttons: Retry, on an error only [miss].
- Today: the canvas shows with no loading state, and fonts and textures pop in.

**1.2 First launch: the run starts at once** [have]

- There is no home screen on the first launch. The guided opening must get the first swipe in less than 5 s.

**1.3 Later launches: Home** [miss] (see Flow 6)

### Flow 2: Run

**2.1 Run screen (always visible)**

- Top bar
  - Info: score [have]; best score [have]; top block chip [have]; wave number and chapter [have]; phase pill (countdown, foes left, boss) [have]; blocks left, with a low warning at 3 [have]; best wave marker ("Wave 7 · best 12") [miss]; current speed [new].
  - Records: the card shows the best score, but the return goal uses the best wave. Two different records [part].
  - Buttons: Pause [miss]; Speed x1/x2/x4 [new]. Today: Restart [have, no confirm], Sound [have], Auto [dev], Help "?" [have, it pauses the run].
- Field (lanes)
  - Info: 4 lanes with portals [have]; lit lanes for the next wave [have]; boss lane in red [have]; enemies with HP bars, a boss HP number and status badges [have]; damage numbers [have]; boss HP bar in the HUD [miss].
  - Buttons: tap an enemy to inspect it [miss].
- Board
  - Info: blocks with value, element icon, 4-piece fusion border and class glow [have]; range of the selected block [have]; the board column under each attacked lane lights up [have]; damage state of a block (its health is hidden) [miss, design decision].
  - Buttons: swipe [have]; tap a block to show its range [have] and an inspect card [miss].
- Deck row (under the board)
  - Info: dice in the deck [have]; the next unlock goal ("next die at 256") [miss].
  - Buttons: tap a die to see its attack [miss].
- Bottom bar
  - Info: coins [have]; price of the next swipe [have]; "too poor" state and a shake when a swipe is refused [have]; when the price goes up next [miss]; the combo refund rule, shown only as a "Free swipe!" popup [part].
  - Buttons: Wave now, with the countdown, in prep and breaks [have]; it pulses when no swipe is possible [have].
- Fusion skills (namecard strip) [new; only in the `?kv` showcase today]
  - Info: one card for each fusion pet: portrait, charge, ready state.
  - Buttons: tap a ready card to cast its skill.
- Tutorial coach [have]
  - Info: one bubble at a time, which points at its target; a hand for the first swipe.
  - Buttons: Skip tutorial (first step) [have]; Got it (tips) [have].

**2.2 Prep (before wave 1)**

- Info: "First wave: when ready" while the tutorial holds the countdown [have]; then "First wave in N s" [have]; the lit lane of wave 1 [have]; the return goal for a returning player [have]; a tag for a special run (Daily, Ascension) [new].
- Buttons: Wave 1 now [have].

**2.3 Wave**

- Info: foes left [have]; wave banner (wave, chapter, number of foes) [have]; enemy types in this wave [miss]; lane danger [have]; danger vignette at 3 blocks or fewer [have].
- Moments: merge value popups, combo, milestone, Awakened / Fusion / Ultimate announcements, element override popups, "Block lost!", hit numbers [have].

**2.4 Break**

- Info: "Wave N cleared! +bonus" and the next wave (foes, lanes) [have]; break countdown [have]; enemy types of the next wave [part, the boss name only]; coins earned in the last wave [part, the bonus only].
- Buttons: Wave now [have].
- Moments: when no swipe is possible, the break shrinks to 4 s and Wave now pulses [have].

**2.5 Boss break and boss wave**

- Info: "Boss in N s!" [have]; "Boss next: name. Line up your blocks under the red lane." [have]; boss intro banner [have]; boss HP on the boss [have]; boss HP bar in the HUD [miss]; what the kill gives ("x2s for your blocks") [part, in one tip only].
- Moments: "Boss defeated! N x2s" banner [part, lost in most boss kills, see Part C, item 1]; "x2", "x4" popups on blocks [have].

**2.6 Die pick (first 64, 256 and 512)**

- Info: "New die unlocked!", the block that unlocked it, and 3 offers with name, attack and text [have]; the current deck, for comparison [miss].
- Buttons: pick 1 to 3 (tap or number keys) [have]; open a die in the codex [miss].
- The run pauses [have].

**2.7 Board locked**

- Info: "Board locked!" banner, and what opens the board again [have].
- Buttons: Wave now, in a break [have].

**2.8 Out of coins**

- Info: the coin bar shakes, and a "Need N" popup shows [have]; a tip, the first time: "Out of coins. Kills and cleared waves pay more." [have].

**2.9 Pause menu** [miss]

- Info: the run so far (wave, score, time) [miss]; damage meter [new].
- Buttons: Resume [miss]; Codex [new]; Settings [miss]; Restart, with a confirm [miss]; Quit to home, with a confirm, and the run is saved [new].

**2.10 Help sheet "How to play"** [have]

- Info: 8 rules [have].
- Buttons: Replay tutorial [have]; Back to the game [have]; Open the codex [miss].

**2.11 Codex overlay** [new] (see Flow 7)

**2.12 Autoplay** [dev]

- Info: the Auto button shows its state; the tutorial steps aside [have].
- This is a developer tool on the player HUD. Hide it in player builds, or make it a feature with rules.

**2.13 Revive offer** [new, optional]

- Info: "Your last block fell"; what a revive gives; its price.
- Buttons: Revive; No thanks.

### Flow 3: End of run

**3.1 Game-over card** [have]

- Info: "Overrun!" [have]; the cause line ("A Pixie broke your last block on wave 2.") [have]; "New best!" for the score [have]; score, wave and top block [have]; best wave and "new best wave" [miss]; rewards (XP, currency) [new].
- Buttons: Play again [have]; Run summary [miss]; Home [miss]; Share [new].

**3.2 Run summary** [miss]

- Info: waves, time, kills, bosses killed, blocks lost, coins earned and spent, best combo, fusions made (new ones marked), top pet, damage by element, records broken.
- Buttons: Play again; Share card [new]; Watch replay [new]; Home.

**3.3 Retry** [have]

- Info: one lesson from the last run, as the first tip [have].

### Flow 4: Return visit

- **4.1** Launch, then Home [miss]. Today the run starts at once, and a tip shows "Your best is wave N. Beat it!" [have].
- **4.2** Resume an unfinished run [new].

### Flow 5: First-time player

- Flow 2 and the tutorial cover this flow; there are no extra screens.
- Do not show the home screen on the first launch.

### Flow 6: Home [miss]

- Info: player name and level [new]; best wave and best score [part, in the run HUD only]; daily challenge card (modifier, time left, your rank) [new]; mission progress [new]; a badge for new codex entries [new].
- Buttons: Play, or Continue run [miss]; Daily [new]; Deck [new]; Codex [new]; Ranking [new]; Missions [new]; Settings [miss]; Profile [new]; Shop or Pass [new, optional].

### Flow 7: Codex [new]

- **7.1** Tabs: Elements and dice · Fusions · Legendaries · Bestiary · Rules.
- **7.2** Entry:
  - Info: the art (pet stages: 16, 256, 4096); name, attack and numbers; how to make it (recipe); how many times the player made it; the highest block reached.
  - Enemies: HP, speed, target rule, abilities, the first wave where the player met it.
  - Buttons: Back; next and previous entry; "Use in deck" for a die [new].
  - Unknown entries show a silhouette and a hint [new].

### Flow 8: Deck (starting dice) [new]

- Info: the 8 dice, owned or locked (with the unlock goal); the 2 dice picked.
- Buttons: pick or swap a die; inspect a die (codex); Start.

### Flow 9: Ranking [new]

- Tabs: Daily · Weekly league · All time (best wave) · Friends.
- Info: rank, player, wave, score, top pet, date; your own row stays pinned.
- Buttons: change tab; watch a replay [new]; challenge a friend (share the seed) [new].

### Flow 10: Daily challenge [new]

- Info: date, seed name, modifier, starting deck, time left, attempts, your best today and your rank.
- Buttons: Play; Ranking; Back.
- In the run: a "Daily" tag in the top bar.

### Flow 11: Missions and achievements [new]

- Info: the list, progress bars, rewards, time left (daily and weekly).
- Buttons: Claim; Go (opens the codex entry or starts a run).

### Flow 12: Settings [miss]

- Info and buttons: music volume and effects volume (today: one sound toggle [part]); haptics; default speed; reduced motion; colour-blind patterns; tips on or off; Replay tutorial (today in the help sheet [have]); language; credits; reset progress, with a confirm.

### Flow 13: Profile [new]

- Info: level and XP; records (best wave, best score, highest block, fusions found, bosses killed); play time.

## Part C: Audit of what is missing

Items are in order of impact. The numbers come from 40 autoplay games of up to 20 minutes each.

| # | Gap | Why it matters | Priority |
|---|---|---|---|
| 1 | **Banners replace each other.** The run screen has one banner slot, and a new banner replaces the old one at once. In 82 of 121 boss kills, "Boss defeated! N x2s" was replaced in the same frame by "Wave N cleared!", because the boss was the last foe. In 57 cases, "Board locked!" met a wave-start banner in the same frame (the bot taps Wave now when the board locks). | Players miss the boss reward and other important news. | P0 |
| 2 | **Restart is one tap with no confirm**, next to the Sound button. | One wrong tap ends a long run. | P0 |
| 3 | **No pause button.** Only the help sheet pauses the run. | A phone call or a notification costs the run. A mobile game must have one. | P0 |
| 4 | **The Auto button is on the player HUD.** | It is a developer tool that plays the game for the player. | P0 (hide it in player builds) |
| 5 | **No loading state.** | The first frame is blank or half drawn on a slow network. | P1 |
| 6 | **No run resume.** | A closed tab or a reload loses the run, and mobile browsers close tabs often. | P1 |
| 7 | **Two different records.** The score card and "New best!" use the best score; the return goal (and a ranking later) uses the best wave. | The goal is not clear. Make the best wave the main record, and show the best score in the summary. | P1 |
| 8 | **No home screen for returning players.** | The daily challenge, codex, ranking and settings need a home. | P1 (with the meta layer) |
| 9 | **No information on demand.** A block shows only its range. Dice and enemies cannot be inspected. The help sheet is text only. | Players cannot learn the elements, fusions or enemies, so the 28 fusions stay unseen. | P1 (codex) |
| 10 | **Settings are one sound toggle.** | Players need volume, haptics, reduced motion and colour-blind options. | P1 |
| 11 | **The game-over card has no Home, no summary and no share.** | The end of a run is the best moment to teach and to share. | P1 |
| 12 | **No speed control.** | Late waves are slow for a strong board. | P1 |
| 13 | **The next-wave preview is a count and lit lanes only.** | Players cannot plan for enemy types. Show enemy icons for each lane. | P2 |
| 14 | **No boss HP bar in the HUD**, and the boss reward is explained only once, in a tip. | Boss fights are the peak moments of a run. | P2 |
| 15 | **The swipe price goes up with no warning.** | A sudden price jump feels unfair. Show "price goes up in N swipes" or a small step mark. | P2 |
| 16 | **Hidden block health has no visible state.** | Players cannot protect a weak block. Design decision: show cracks below 50%? | P2 (design) |
| 17 | **The deck row does not show the next unlock goal.** | The rule "your first 64, 256 and 512 each add a die" is not visible. | P2 |
| 18 | **Fusion skills (namecards) are only in the showcase.** | If they ship, the run screen needs space for them on a phone. | P2 (layout) |
| 19 | **Some element surfaces use only colour** (die-pick swatches, the deck row). | Colour-blind players cannot tell the elements apart. | P2 |
| 20 | **A hidden hint bar** (27 words) is still in the markup. | Unused UI. Remove it. | P3 |

## Part D: HUD update list

P0 items can ship now. P1 items prepare the meta layer.

**P0**

1. Banner queue: show banners one after the other, each for 1.5 s or more. Merge the boss pair into one banner: "Elf Ruler defeated! 8 x2s · Wave 10 cleared +60".
2. Put a Pause button in the top bar in place of Restart. Move Restart into the pause menu, behind a confirm.
3. Pause menu: Resume, Codex (later), Settings, Restart, Quit.
4. Hide the Auto button in player builds. Keep it behind a developer flag, as for `?kv`.

**P1**

5. Speed button (x1, x2, x4) next to Pause. Unlock x4 after the first boss. Go back to x1 when a boss appears.
6. Best wave in the status bar ("Wave 7 · best 12"), and a "new best wave" moment during the run. Make the best wave the main record.
7. Inspect cards: a block (element, attack, fusion progress), a die (attack), an enemy (HP, ability).
8. Game-over card: add Home and Summary. Then add the run summary screen.
9. Loading screen and run resume.
10. Settings sheet.

**P2**

11. Next-wave preview with enemy icons for each lane; a boss HP bar; the boss reward in the boss-break pill ("Boss in 8 s · x2s if you win").
12. A price step mark on the coin bar; the next die goal in the deck row.
13. A damage state for blocks (after the design decision).
14. Colour-blind icons on all element surfaces.
15. A layout for the namecard strip (if fusion skills ship).
