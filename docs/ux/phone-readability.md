# Phone readability (2048 Siege)

The user found the text and the buttons hard to see on a phone. This pass sets floors for a phone held at arm's length, measures every text and button against them at five phone sizes, and raises what fell short. The floors are defaults; each one is written here so it can be changed.

## The floors

| What | Floor |
|---|---|
| Primary numbers: the score, the coins, the wave, the countdown, and the lintel's foes and blocks counts | 20 px, Baloo 2 ExtraBold (800), tabular |
| Labels and body text | 14 px, weight 700 or more |
| Secondary text: the best score, the record to beat, the chapter name, captions ("Damage", "Top block"), notes | 13 px, weight 700 or more |
| Button labels | 16 px, bold |
| Icon glyphs on buttons | 24 px |
| Buttons | 48 × 48 px drawn, with a 48 px hit area |
| Contrast | 4.5:1, or 3:1 for bold text of 18.7 px or more |
| Numbers drawn in the canvas | 14 px or more, with an ink outline, in tabular digits, and 4.5:1 or more against their own outline whatever their colour. A hit is 15 px, a damage-over-time or coin tick 14 px, the boss's health 16 px and a status count 14 px. (A crit would be 21 px; none is drawn: every hit passes `crit: false`.) |

There are three exceptions, on purpose:

- The block card's × is a 40 px disc with a 48 px target. A 48 px disc would crowd the title on the narrowest card (240 px).
- "Skip tutorial" stays a text link, with a 48 px tall target. It is the quiet choice beside "Got it".
- A namecard is as wide as its tower allows: 48 px on a phone up to 400 px wide, 52 px on a wider one, and never under 44 px. On a 412 × 915 phone the tower allows 47 px. With a browser's toolbars showing (360 × 560, 375 × 548) the field is smaller and the tower narrower, and the cards keep 44 px; 48 px is for the phone's full height.

Where a word and its number share a line, only the number is primary: "Wave **12**", "In **14**s", "**12** left". The word stays a label (14–15 px).

## How it was measured

Headless Chromium at DPR 3, driving the dev server. The tool is `audit.mjs` in the session's scratchpad (`ro/`), built on the phone capture tool `cap.mjs`.

- **Sizes:** 360 × 640, 375 × 667, 390 × 844 (safe areas 47 / 34), 412 × 915, 430 × 932 (safe areas 59 / 34).
- **States:** the loading screen and its failure; prep; wave 1; its break; the break before the boss; the boss wave; the die pick; pause, settings, the restart confirm and How to play; game over; the block card; a coach tip; the first-run guided step; and the transient text (the combo tally, popups and a class announcement), held still. Two more poses hold the widest numbers: a 5-digit score, coins and top block; a 2-digit price, wave, record and countdown; and the boss's face in the lintel.
- **Text:** every element holding text. The rendered size is the computed font size times every transform scale above it. The tool also records the weight, the family that loaded, and whether the text is cut sideways or its ink band is cut.
- **Contrast:** sampled from the capture. A second capture of the same frame has every DOM glyph transparent. The glyph pixels are those that change between the two, and the background is the second capture under them. The text's colour, times its opacity, is laid over each background pixel; the figure is the 10th percentile, the worse end of a gradient. Text with an ink stroke is read fill against stroke. Text that hiding does not change is covered (it scrolls under the block card's Sell row) and is not scored.
- **Buttons:** the box as drawn, and the hit area: every point within 24 px of the box that `elementFromPoint` gives back to the button. The figures are ±1 px.
- **Canvas text:** every Pixi text in the scene: its font size times its world scale (the canvas is in CSS px), and its ink stroke.
- **Layout:** DOM over the lanes (as in `cap.mjs`), the plates that must not overlap, and the gap between the coin plate and Wave now.

The before and after runs served two snapshots of the same tree, one with this pass's files and one without, so the field work going on at the same time does not change the comparison.

## Before: the worst offenders

Sizes in CSS px, the smallest over the five phones and all states; the 360 px phone is the worst case unless noted.

| Where | Text | Before | Problem |
|---|---|---|---|
| Canvas: a status count over a foe | "×9" | 6.8 px (10.4 at most) | size, 0.5 px of ink |
| Canvas: damage numbers | "815" | 7.3–15 px | size on four phones, 0.6 px of ink |
| Canvas: the boss's health | "902" | 8.7–13.4 px | size |
| Block card: stat captions | "DAMAGE" | 10 px, spaced capitals | size |
| Block card: element chips | "Poison" | 11 px | size |
| Popup at the light budget's smallest scale | "+4" | 11.8 px; white on a pale tier outline, 1.8:1 | size, contrast |
| Lintel: the countdown and the foes left | "In 15s", "1 left" | 13 px | a primary number at 13 px |
| Lintel: the blocks left | "4" | 13 px (16 px over 380 px wide) | a primary number |
| Lintel: the wave | "Wave 5" | 15 px (16 px over 380 px) | a primary number |
| Wave now: the countdown | "▶ 19" | 15 px (16 px) | a primary number |
| Top-block chip | "4096" | 12.6 px | size |
| Coin plate: the price's label | "Swipe" | 12 px | size |
| Namecard | "READY" | 12 px | size |
| Score plate | "Best 1,462" | 12 px | size |
| Lintel: the record and the chapter | "best 14", "Eternal Forest" | 12 px at 82% opacity, 4.66:1 | size, thin contrast |
| Die pick | the attack names, the descriptions | 12 px | size |
| Die pick: the head chip | "64" | white on a pale tier colour, 1.38:1 | contrast |
| Game over | the stat captions; the top block | 12 px | size |
| Die pick | the keyboard hints "1 2 3" | 12 px | size (and no use on a phone) |
| Block card | the description, the effects, the notes | 12–13 px, set at weight 600 (drawn with Nunito 700: only 700 and 800 load) | size |
| News ribbon | the line ("Boss next: …") | 13 px | size |
| Coins | "573" | 20–21 px at weight 700 (a `<b>`'s bold) | not ExtraBold |
| Skip tutorial | | set at weight 400 (drawn with Nunito 700, the lightest face loaded) | none drawn; set to 800 now, as its neighbours |
| Gate chips (the next wave's counts) | "×3" | 12 px on three phones | size (`src/render/frame.js`: the field agent raised its floor to 14 px, see below) |

Buttons:

| Button | Before | After |
|---|---|---|
| Pause, Speed | 44 × 44; the pause icon 18 px, "x1" 16 px | 48 × 48; icon 24 px, "x1" 20 px |
| Wave now | 44 tall; label 15 px on a 360 px phone | 48 tall; label 16 px, countdown 20 px |
| Coach: Got it | 44 tall | 48 tall |
| Coach: Skip tutorial | a 45 px target, set at weight 400 | a 49 px target, weight 800 |
| Block card: × | a 30 px disc, a 44 px target, the glyph 13 px | a 40 px disc, a 49 px target, the glyph 24 px |
| Block card: Sell / Break | 44 tall, label 13 px at 600; below the fold on every phone (no hit area without a scroll) | 48 tall, label 16 px at 800; stays at the card's foot while the rest scrolls |
| Dialogs: How to play, Settings, Restart run, Share, Keep playing, Restart, Replay tutorial | 46 tall | 48 tall |
| Namecards | 44 × 58 on the 360, 375 and 412 phones | 48 × 62 (47 × 61 on the 412 phone, as wide as its tower) |

## What changed

**Top bar** (`src/ui/hud.css`, `hud.js`)

- 48 px tall. Pause and Speed are 48 px discs; the pause icon is 24 px and "x1" 20 px.
- The score is 24 px; "Best" is 13 px.
- The top-block chip is a 48 px disc for one or two digits (20 px). From three digits it stretches into a pill, at 18 px; it was a disc up to four digits at 12.6 px.
- The chip is captioned "Top" under its number, at 13 px (T22). It fits the top bar on a 320 px phone even at 65536.

**The lintel**

- The numbers are 20 px: the wave ("Wave" stays 15 px), the countdown and the foes left ("In" and "left" stay 14 px; `hud.js` wraps the digits, `meterLabelHtml`), and the blocks left.
- The record and the chapter name are 13 px in full cream (5.98:1 or more on every chapter's stone; it was 82% opacity).
- The chapter name now gives way on any phone 400 px wide or less (it was 380), so the numbers keep their room. The lintel stays 30 px tall.
- With the boss's face in the meter (its break and its wave), a phone 380 px wide or less drops the record ("best 14") from the lintel, so the boss bar has room: it was at its 30 px least and the meter spilled 2 px out of its track.

**News ribbon**

- The title is 16 px and the line 14 px. A class announcement's parts are 14 px, its name 15 px and its stage word 13 px.
- The ribbon measures its title with its digits as "0": the title's digits are tabular (each as wide as "0"), which the measuring canvas does not draw. With the larger type, a title and line it judged to fit together by a few pixels ended in an ellipsis ("Next: 9 foes in 3 lan…" on a 375 px phone); now the line gets its own page.

**Bottom bar**

- 48 px tall.
- The coin plate has two rows, like the score plate: the coins (22 px, now ExtraBold), and under them the swipe's price ("Swipe" 14 px, the price 17 px) with its step tick. That is what makes room: with 5-digit coins and a 2-digit price beside "Wave now ▶ 18", the gap between the plates on a 360 px phone grew from 7.5 px to 50 px.
- Wave now's label is 16 px on every phone, and its countdown 20 px.

**Dialogs**

- Every button is 48 px tall.
- The die pick's attack names and descriptions are 14 px, and the line under its title is 14 px. The keyboard hints are hidden on a touch screen.
- Each die in the pick (T8) shows:
  - its baby pet (52 px) on the element's colour, with the element's badge in the corner;
  - its name and attack on one line;
  - what it does in one short line (`ELEMENTS[k].line`, 28 characters at most).

  The short line fits one line on a 360 px phone, and wraps to two on a 320 px one. The long description stays on the block's full card (Details).
- The game-over captions are 13 px in sentence case ("Top block" fits a third of a 360 px phone's card; spaced capitals at 13 px did not). The top block is a pill at 16 px. "New best wave!" and the run summary are 14 px.
- How to play is 15 px, its headings 17 px. It scrolls inside, as before.
- The tier chips (the die pick's head, the game-over top block) draw their white number in an ink outline, as the board's blocks do. White on a pale tier colour was 1.4:1.

**Block card** (`src/ui/inspect.css`)

- The body is 14 px at 700. The element chips and the value are 14 px.
- The stat captions are 13 px in sentence case (they were 10 px capitals), and the stats 16 px.
- The notes and the pet's name are 13 px.
- The × is a 40 px disc with a 24 px glyph and a 48 px target.
- Sell / Break is 48 px tall with a 16 px label. Its row stays at the card's foot while the card scrolls. On a 360 × 640 phone the card has room for its head and two lines, so before this the button was always below the fold.
- A tap opens the short card (T19). It has two rows, 114 px in all:
  - a 40 px picture of the tile, the title and value (20 px, on one line), and the ×;
  - Sell / Break and Details, both 48 px tall with 16 px labels.

  It sits over the board, under or over the tapped block. It fits whole on every row of every phone checked, including phones with their browser toolbars showing (360 × 560, 375 × 548, 320 × 568). So the lanes stay in view, and Sell never needs scrolling.
- The short card's button says why it can't act: "Last block", or "Need 15" with the coin. The full card says it in a note beside the button.
- Sell / Break is always as wide as its armed label, "Tap again", so arming never moves it over Details.
- Beside a namecard rail that runs past the parapet, the card narrows and Details becomes a 48 px icon button. Its name stays "Details".
- Details opens the full card above.

**Coach** (`hud.css`): the tip is 16 px; Got it and Skip tutorial are 48 px tall; Skip tutorial is weight 800.

**Floating text**

- Popups fill with their colour, lifted toward white, inside an ink outline: 5:1 or more for every colour they get, on any ground. They were white inside a pale coloured outline.
- A popup is never drawn under 14 px (`TEXT.minPx`). `main.js` asks the light budget for at least the share that keeps it there, so a popup it cannot draw books nothing; `popupPx` holds the floor where it is drawn.
- Its colour is a plain white where `color-mix()` is missing.
- "Combo" is 13 px. The pill keeps its size, so its booked light (`TEXT.comboPx`) still holds.

**Namecards** (`src/kv`)

- 48 px wide on a phone up to 400 px wide (it was 44 on a 360 px phone), where the tower has the room. `railLayout` now honours that width when the rail has to run on past the parapet, never under 44.
- READY is 14 px.
- The element badges are 15 px for a fusion's two. A legend's three are 12 px, 1 px in and side by side (37 px), so they fit inside the portrait's 3 px rim on the narrowest card (44 px: 38 px inside).
- The skill's name on the cut-in is 16 px.

**Canvas numbers** (`src/render/fx.js`, `foes.js`)

- Damage numbers are never drawn under 15 px (a hit) or 14 px (a damage-over-time or coin tick): `numberScale(kind, U)` in `src/ux/photosafe.js` (`NUMBER.minPx`). On a phone the world's scale alone drew them at 7–13 px. The crit floor (21 px) is unused: every hit passes `crit: false`.
- A number books what it draws: the light of every glyph of its text, at the size it is drawn, popping in then settled (`numberText`, `numberLit`, `numberLight` in `src/ux/photosafe.js`). So on a busy screen fewer numbers show, never smaller ones. Before, every number booked one digit, whatever its length, and its real light could pass the cap; `tools/flash-audit.mjs` now books the same texts the same way. The audit, the real-light tally and what it costs are in `docs/ux/photosafe.md` ("The readability floors").
- The bitmap font's ink outline is 0.2 em (it was 0.16), so a 14 px number keeps 1.4 px of ink round its glyphs. Its glyphs' light was measured with that stroke (`NUMBER.glyphLit`).
- Its digits are tabular (`tabularDigits`), so the boss's health keeps its width as it counts down:
  - every digit takes the advance of "0", with no kerning between digits or against "," and ".";
  - the font comes from `BitmapFontManager.install`, which returns it (`BitmapFont.install` returns nothing in Pixi 8);
  - `tabularDigits` throws on a font without its digits, rather than doing nothing.
  
  Measured in the running game: "111", "404" and "888" are each 79.99 px wide at 44 px, and "1,178" and "1,225" are each 117.35 px. Before, the first three were 51.88, 80.52 and 73.92 px.
- A tint colours a glyph and its stroke alike, so a dark tint lost its outline (a crit in #7a3fa8 was 2.9:1). A coloured number is lifted toward white, as the popups are (`numberTint`): 4.5:1 or more against its own outline for every element, fusion and tier colour.
- Left as it is: a hit's number appears at the foe's height and floats up through a boss's bar and its 16 px health number while the boss is under fire. Moving it above needs the hit's foe in `main.js` and the label's height from `foes.js`, so it goes with the crowding of the foes' bars, chips and status rows (T38).
- The boss's health is 16 px or more and a status count 14 px or more (`FOE_TEXT_MIN_PX`). The badge row is placed from what is drawn (`foeLabels`): 2 px above the health number on a boss, or above the bar, and its icons are at least 16 px, as tall as their counts. With the badge row at the old offset (0.36 U over the bar), a boss's "×9" sat 2.5–7.3 px over its health number.

**Loading screen** (`index.html`): the message is 16 px; Try again and New run are 48 px tall.

## After

At all five sizes and in every state:

- No text is under its floor.
- No text is short of contrast.
- The ribbon cuts no line.
- Every button is 48 px or more, drawn and as a target, except the three exceptions above.
- The canvas's damage numbers, the boss's health and the status counts are 14 px or more.

The text, before and after: the smallest over the five phones and all states.

| Text | Before | After |
|---|---|---|
| Score | 23 px | 24 px |
| Best score | 12 px | 13 px |
| Top block | 12.6 px | 18 px (a pill) |
| Lintel: the wave's number | 15 px | 20 px |
| Lintel: the countdown, the foes left | 13 px | 20 px (the number; the words 14 px) |
| Lintel: the blocks left | 13 px | 20 px |
| Lintel: the record, the chapter name | 12 px, 4.66:1 | 13 px, 5.98:1 |
| Ribbon: title, line | 15 px, 13 px | 16 px, 14 px |
| Ribbon: an announcement's stage, parts, name | 12, 13, 14 px | 13, 14, 15 px |
| Coins | 20 px at 700 | 22 px at 800 |
| The swipe's price: word, number | 12 px, 15 px | 14 px, 17 px |
| Wave now: label, countdown | 15 px, 15 px | 16 px, 20 px |
| READY | 12 px | 14 px |
| Combo | 12 px | 13 px |
| Popups | 11.8 px; 1.8:1 against their outline | 14 px or more (none was under it in the captures); 5.1:1 or more for every colour |
| Tier chips (die pick, game over) | 1.38:1 | 11.1:1 or more against their outline (85% ink over the palest tier colour, #ffd166) |
| Die pick: the attack names, the descriptions, the line under the title | 12–13 px | 14 px |
| Game over: captions, top block, summary, "New best wave!" | 12–13 px | 13–16 px |
| How to play: rules, headings | 13 px, 15 px | 15 px, 17 px |
| Coach tip | 14 px | 16 px |
| Block card: captions, stats | 10 px, 14 px | 13 px, 16 px |
| Block card: chips, value | 11–12 px | 14 px |
| Block card: body, notes | 13 px and 12 px, set at 600 (drawn at 700) | 14 px and 13 px, at 700 |
| Loading screen: message | 15 px | 16 px |

The numbers in the canvas, before and after (the smallest seen in the captures, px):

| Number | 360 × 640 | 375 × 667 | 390 × 844 | 412 × 915 | 430 × 932 |
|---|---|---|---|---|---|
| Damage, before | 7.3 | 7.7 | 8.9 | 11.2 | 10.0 |
| Damage, after | 14 | 14 | 14 | 14 | 14 |
| The boss's health, before | 8.7 | 9.2 | 10.7 | 13.4 | 12.0 |
| The boss's health, after | 16 | 16 | 16 | 16 | 16 |
| A status count, before | 6.8 | 7.2 | 8.3 | 10.4 | 9.4 |
| A status count, after | 14 | 14 | 14 | 14 | 14 |
| A gate chip's count, before | 12 | 12 | 12 | 16 | 14 |
| A gate chip's count, after (`frame.js`, the field agent) | 14 | 14 | 14 | 15 | 14 |

The ink outside a damage number's glyphs went from 0.6 px to 1.1 px or more, and a coloured number reads 10.5:1 or more against its outline in the captures (8.1:1 before; 4.5:1 or more for any colour, `numberTint`).

After the review fixes, measured again on the live tree (`ro/after2/`: prep, the block card, the transient text, wave 1, its break, the break before the boss, the boss wave, and the two poses of the widest numbers, at the five sizes):

| | 360 × 640 | 375 × 667 | 390 × 844 | 412 × 915 | 430 × 932 |
|---|---|---|---|---|---|
| The boss's health number and its "×9" badge, overlap before the fix (px) | 7.3 | 6.7 | 5.3 | 2.5 | 3.9 |
| The same, after | none | none | none | none | none |
| The boss bar in the widest lintel (a 2-digit wave and record, the face), px | 80 (the record gives way) | 95 (the record gives way) | 55 | 77 | 95 |
| The meter spilling out of its track (px) | 0 | 0 | 0 | 0 | 0 |
| `#hud` scroll width (px) | 360 | 375 | 390 | 412 | 430 |

No text on the live tree is under its floor. The block card's progress line from the tile overhaul (`.inspect-grow`: the tile's growth marks said in words) is 14 px at 700, the body floor, as it is the card's main progress information.

## Layout

The top bar and the bottom bar each grew 4 px, so the field between them is a little smaller. The stage measures the bands from the DOM, so nothing else had to move.

| Size | U before | U after | Change | DOM over the lanes | Coin plate to Wave now, widest numbers |
|---|---|---|---|---|---|
| 360 × 640 | 24.18 | 23.78 | −1.7% | 0, before and after | 7.5 → 50 px |
| 375 × 667 | 25.54 | 25.14 | −1.6% | 0, before and after | 22.5 → 65 px |
| 390 × 844 | 29.57 | 29.17 | −1.4% | 0, before and after | 41 → 76 px |
| 412 × 915 | 37.23 | 36.83 | −1.1% | 0, before and after | 50 → 75 px |
| 430 × 932 | 33.40 | 33.00 | −1.2% | 0, before and after | 37 → 93 px |

- U is pixels per world unit; the board is 8 units wide.
- The bands are 4 px deeper at the top and 4 px at the bottom:
  - a phone 700 px tall or less: top 106 → 110 px, bottom 54 → 58 px;
  - a taller one: top 120 → 124 px, bottom 56 → 60 px (plus the safe areas).
- No plates overlap at any size. The ribbon still tucks 5 px under the lintel on a short phone, by design.

## The field files

The field agent made the matching changes in its own files:

- `src/render/frame.js`: `MIN_TEXT` is 14 (it was 12), so the gate chips' counts read 14–15 px on every phone.
- `src/art/frame-kit.js`: the deck slot is 2.1 units wide (it was 2), so "at 512" holds 14 px on a 360 × 640 phone without the squeeze (41.4 px plus its 3.4 px stroke).
- `test/hud-frame.test.js`: the slot check at 14 px, and the `PHONES` bands this pass measures (`[360, 640, 110, 58]`, `[375, 667, 110, 58]`, `[390, 844, 124, 60]`, `[390, 844, 171, 94]`, `[412, 915, 124, 60]`, `[430, 932, 183, 94]`). With them the rail test passes at every size: 48 px cards on the 360, 375 and 390 phones, 47 px on the 412 phone and 52 px on the 430 phone.
- `docs/ux/frame-and-hud.md`: the floors, 48 px targets, the 20 px lintel numbers, the chapter name's 400 px rule, the two-row coin plate, the 48 px namecards and READY at 14 px, the top-block pill, and the slot at 14 px.

Two things were measured but needed no change:

- The board's tile numerals (the tile overhaul: ink with a cream stroke, `src/art/plaque.js` `numberFit`) are never under the canvas numbers' 14 px: at its design size a 4-digit numeral would be 12.5 px on a 360 × 640 phone (0.2625 of a 47.6 px cell) and a 5-digit one 10.7 px. At the floor a 5-digit numeral is squeezed across (to 95 %) so it stays inside its plaque.
- The deck's dice carry no text.

## Checked

- `test/phone-readability.test.js`, through the rules as written and through pure helpers:
  - no rule in `hud.css`, `inspect.css` or `kv.css` sets text under 13 px, in any media query, except the developer's Autoplay toggle (`?dev`) and the key-visual demo's switcher (`?kv`);
  - every rule that lists a primary-number selector sets it at 20 px or more (a grouped override such as `.meter-label, .castle-hp, .day-n { font-size: 13px }` fails it), the labels at 14 px, the secondary text at 13 px, the button labels at 16 px;
  - the buttons are 48 px and their icons 24 px;
  - the meter's numbers get their own spans, and the boss's face drops the record on a narrow phone;
  - a popup books no less than its 14 px floor and is drawn at what it booked;
  - a damage number is drawn at its floor at every phone's U and books that size (`numberScale`), and books every glyph of its text, over time (`numberText`, `numberLit`, `numberLight`): a 3-character number books twice a 1-digit one or more, and never less than its glyphs measured together. `fx.js` and the flash audit book the same texts, and a short audit at U 23.78 has no large flash from local effects;
  - the boss's health number and its badges never touch at any phone's U (`foeLabels`), where the old offset did;
  - every coloured number reads 4.5:1 or more against its own outline (`numberTint`), and the bitmap digits are tabular (`tabularDigits`, on the font `BitmapFontManager.install` returns; it throws on a font without digits);
  - the ribbon measures on a canvas with tabular digits; a popup has a plain colour without `color-mix()`;
  - the namecards are 48 px where the tower allows, never under 44, and their badges fit inside the portrait.
- `npm test` and `npm run build` pass.
- The captures: `ro/before/` and `ro/after/` in the session's scratchpad (the snapshot runs), `ro/after2/` (the live tree after the review fixes), and a before-and-after sheet per state in `ro/sheets/` and `ro/sheets2/`.
