# The siege frame and the HUD

This page says how the run screen is laid out after the visual overhaul (phase P-E of `reports/art/visual-overhaul/build-plan.md`). The design is section 4 of `reports/art/visual-overhaul/proposal.md` and the wireframe `hud-layout.svg`.

## The rules

- No HUD element stays over a lane. The HUD lives in a head band above the field, a bottom bar under the board, and the towers at the sides. Some DOM sits over the field for a moment, or because the player asked for it:
  - the block info card (`src/ui/inspect.js`) opens short: the block's picture, name and value, with Sell / Break and Details. It sits over the board, under or over the tapped block (`src/ui/short-card.js`), so it never covers the lanes, in a wave or between waves. Where the board has no room for it, it covers the coin bar and Wave now: rows 1 and 2 on phones up to about 360 × 640. Beside a namecard rail that runs past the parapet (four pets on a small phone) it narrows to the rail, with Details as an icon and a tighter row, so the skill buttons stay in reach on phones from 360 × 560 and on a 320 × 568 one at any price. On a 320 × 480 phone with its toolbars showing, the rail sits beside the keep and the card has 216 px. That is enough only for a one-digit Sell, so there the card covers a skill card. Details opens the full card, which covers the lanes while the player reads it, because they asked for it. The full card sits between the towers, never over the namecard rail. Either one closes with a tap anywhere;
  - the floating popups ("Block lost!", a signature's name) float up from the keep for under a second;
  - the pet skill cut-in (0.9 s), the coach's bubbles and the dialogs on their scrim;
  - the boss intro card (T6, `src/ui/boss-intro.js`). As a boss wave starts, the boss's portrait, its name and what it does sit halfway between the gates and the board for 2.6 s of play, then fade:
    - it sits between the towers, never over the namecard rail;
    - it stays under the dialogs, and waits, hidden, behind a die card; its time stops while the game is paused;
    - the boss itself stays in view at its gate, and the card never takes a tap;
    - the news ribbon still says "… approaches!", because the ribbon is the HUD's spoken line.
- Three materials only:
  - clay: the cream plates (score, coins, the news ribbon, the cards, the dialogs);
  - stone: the lintel, the round buttons, Wave now;
  - timber: the deck rail.

  The proposal (4.3) also gave timber to the dialog headers. They were left out on purpose: a dialog stays one clay sheet with its title in ink (the proposal's own rule for dialogs), and the dialogs keep the heights they were tuned to on a 360 × 640 phone.
- Corner radii are 12 px for chips, 18 px for plates and 24 px for dialogs.
- Text is ink on clay and cream on stone. Numerals are Baloo 2 ExtraBold in tabular, fixed-width slots, buttons included. Body text is Nunito. Text follows the phone floors (`docs/ux/phone-readability.md`): labels and body text 14 px at weight 700 or more, secondary text 13 px, and the numbers that matter (score, coins, wave, countdown, the lintel's counts) 20 px or more, in the DOM and in the canvas (the gate chips' counts and the deck slot's "at 512" are 14 px or more).
- The HUD's button rule is `:where(#hud) button`, as light as a bare element, so each button's own class styles it without `!important`. Wave now and Speed get their ExtraBold tabular numerals from it; every other button keeps the look it has always had.
- Touch targets are 48 px or more, drawn and hit (the block card's × is a 40 px disc with a 48 px target).
- Nothing is additive, and nothing new flashes. A brazier books its flame in the light budget each time it lights, also when it lights again while its last flame still fades; the gate chips and the iris fade in and out.

## The zones

From the top of a 390 × 844 phone:

| Zone | What it holds |
|---|---|
| Top bar | Pause and Speed as 48 px stone discs; the score plate with the best score; the top-block chip. Nothing else. Sound is in the pause menu's settings. |
| Chapter lintel | One stone bar: the chapter crest, "Wave N", the record to beat ("best 12"), the chapter name; the foes meter; the keep grid. Its numbers are 20 px; its words, the record and the chapter name are smaller (13–15 px). |
| News ribbon | One 28 px line in the sky above the gates. |
| Field | The gate wall, the lanes and hedges, the parapet, and the towers at the sides. The namecard rail hangs on the right tower. |
| Keep | The board, framed in stone, with corner towers. |
| Deck | The dice on a timber rail, and a dashed slot for the next die. |
| Bottom bar | The coin plate in two rows (the coins, then the swipe's price with its step tick); Wave now. |

The stage measures the head band (the lintel and the ribbon, `.statusbar`) and the bottom bar from the DOM, and fits the world between them (`fitU` in `src/render/stage.js`). It also keeps the right tower wide enough for the narrowest rail (44 px cards, the floor; 47–52 px where the tower has the room), so a card can never cover lane 4. The world is sized first, and the cards then take the width the tower has: a phone whose cards fit gets the full height's scale.

The best wave is the main record (`docs/ux/meta-and-hud.md`, item 7), so the lintel keeps "best N" at every size, except while the boss's face is in the meter (the boss's break and its wave) on a phone 380 px wide or less: there the record gives its room to the boss bar. The chapter name goes first: beside a record on any phone (it would be cut short), and always on one 400 px wide or less or on a screen 700 px tall or less. With no record yet, a phone wider than 400 px shows it; so does a tablet or a desktop, whose HUD keeps a phone's width with room for both. The crest still names the chapter.

The lintel sits above the ribbon, so the ribbon slides out from under it and never covers the keep grid, even while it slides in. On a screen 700 px tall or less, the ribbon tucks 5 px under the lintel's bottom edge; it is 26 px tall there, so its text stays clear of the lintel's border and drop.

The bottom bar fits its worst case on a 360 px phone: coins with five digits, a 2-digit swipe price with its step tick, and a 2-digit countdown on Wave now, with a 50 px gap between the two plates. On a phone 400 px wide or less, Wave now drops the wave's number ("Wave now ▶ 12", the coach's own words; the lintel shows the number). On one 380 px wide or less, Wave now also packs tighter.

## The lintel

- **The meter.** During a wave it shows the foes still to come or alive, and it empties as they fall. Before a wave it waits full and hatched, with the countdown beside it.
- **The boss bar.** On a boss wave the meter becomes the boss's health bar, with the boss's portrait chip (its `enemy.<key>` sprite). The chip also shows during the break before the boss.
- **The keep grid.** A 4 × 4 glyph: one lit cell for each block alive, from the bottom row up. It turns red when 3 blocks or fewer are left in a wave.
- **For a screen reader.** The meter is an image with a text description: its state with the countdown, the foes left, or the boss's health. It is not a live region, so it is read when the player gets to it, never every second. The phase changes (a wave starts, a wave is cleared, a boss comes) are spoken by the news ribbon, which is one. The description follows the boss's health: the lintel's key holds it (`statusKey` in `src/ui/hud.js`).

## The news ribbon

Banners and class announcements share one queue (`src/ux/banners.js`), with the same timing as before: at least 1.8 s each, and longer for longer text.

- A banner whose title and line do not fit on one line turns pages: the title first, then the line in as few pages as it needs. The words are shared out evenly between those pages, so no page is a lone word. Every page gets an equal share of the banner's reading time (1.1 s or more), so the game's long banners show every page before the next banner takes the ribbon (`test/banners.test.js`).
- An announcement ("Fusion: Fire + Ice → Blue Flame") that is too long for the line first drops its two parts, then its stage word (the ribbon's tone still shows the stage). The new name stays whole; only a name too long for the line on its own ends in an ellipsis. The test is on the line's text box, the part that shrinks.
- The ribbon slides in over 0.32 s. Under Reduce motion it fades in place.
- The queue waits while the game is paused or a die card is open.

## The frame

The frame is drawn in code (`src/render/frame.js`, one step per part), in the sticker style: a plum ink outline, flat fills and one cel tone. Its colours come only from the chapter skin (`CHAPTER_SKINS` in `src/art/frame-kit.js`). It has three depth layers:

- **Far:** the chapter's painted backdrop, softened so that only its largest shapes and its colour mood are left (`FAR` in `src/art/frame-kit.js`). Without one it uses `env.background`, and without that the sky's gradient.
- **Mid:** a ridge strip along the top of the field, in one flat tone. When the screen shakes, it moves a fifth as much as the field, and the far layer stays still.
- **Foreground:** the frame itself.

What has no part in the fight is kept quiet, so that it never competes with a foe:

- **The backdrop** is drawn once per chapter at 1/8 of its size and blurred once (`farTex` in `src/render/frame-art.js`); the linear filter draws it back up soft. It is then desaturated by 60%, pulled halfway to the chapter's sky gradient and dimmed by 30%. It keeps at most 35% of the painting's contrast, and it is always at least 25 L* darker than a lane. This is a small canvas made once; no filter runs on the stage.
- **The ridge strip** is one flat tone, halfway between the ridge's tone and the sky's middle, and its silhouette is also drawn from 1/8 of its size (`ridgeTex`).
- **The stonework** (the towers, the gate wall, the parapet and the keep's walls) is a few large stones with faint joints (ink at 22%). On the towers, a course is 1 world unit tall and a stone 1.6 long; the parapet has a joint between each pair of columns.
- **The hedges, the cobble bands and the chapter decor** are quiet too (see the lanes and the hedges below).

What the fight reads stays crisp: the lanes and their ticks, the gates with the iris and the chips, the braziers and the boss's banners, the keep and its pits, and the range.

The pieces of the frame:

- **Towers.** Stone towers at both sides, with crenellated tops and a slit window.
- **Gates.** One stone arch per lane, with a dark opening.
  - A closed gate has its portcullis down.
  - An open gate (its lane is in the wave) rolls the portcullis up and shows the iris, which fits inside the arch.
  - During a break, an open gate shows the next wave's chip: a foe on a cream token, with how many come down that lane.
  - The boss's gate wears two red banners.
- **Lanes.** Light sand (L* 78–86). The middle 60% is calm (patches within 4 L* of the lane). Large setts fill the outer 20% bands, within 5 L* of their grout and with no outline. There is a tick at each cell line, because reach is counted in cells; the ticks are the strongest marks on a lane.
- **Hedges.** Flat dark strips between the lanes: the ground a foe reads on. Each has one scalloped edge on its left, lit from the upper left, in a cel tone about 4 L* lighter. The chapter decor is placed by hash: one prop on each outer hedge, beside a tower and never between two lanes. It is 0.3 world units across, so it stays inside its hedge, and it is drawn at half alpha in the hedge's tint. The props are moss and mushrooms in the forest, lanterns in the far east, and ember cracks in the peaks.
- **Parapet.** A crenellated wall where the lanes meet the keep, with one merlon and one brazier per column. A brazier has three states:
  - cold: unlit;
  - warning: lit while foes are alive in its lane or still due out of its gate this wave (`dueByLane`), and during a break when the next wave comes down its lane. The flame breathes on a slow 2 s scale; it never flickers;
  - pressure: lit, with a thin dark smoke column, when 3 or more foes are in the lane or the boss is in it.

  A brazier keeps its level for 1.5 s after its lane calms down (`holdBrazier`), so it does not go dark when a wave starts, nor blink with each kill and spawn. The braziers replace the old red lane and column washes and the chevrons. Under Reduce motion they hold steady.
- **Keep.** A stone frame with four corner towers around a dark floor (L* ≈ 27). The 16 slots are sunken flagstone pits with a 1 px ink groove.
- **Deck rail.** A timber rail behind the dice. A dashed slot shows the block that brings the next die ("at 512", 14 px or more: the slot is 2.1 units wide for it on a 360 px phone). The dice and the slot are centred together (`deckRow`). The rail has no "DECK" word: at the text floor it does not fit beside four dice and the slot on a 360 px phone, and the dice with their slot read as the deck.
- **Range.** A selected block's range is drawn as an outline only (a cream line on an ink line, so it reads on the lanes and on the keep). The ticks of the cells it covers light up. It is drawn once per selection; only the cream line's alpha breathes, and it holds steady under Reduce motion.

The static parts are rebuilt only when the screen is resized or the chapter changes. The sky's gradient, the softened backdrop and the flat ridge are made once per chapter. In each frame, only the gates, the braziers and the parallax offset change.

Each generated sprite in `FRAME_ASSETS` has a drawn stand-in in `src/render/frame-art.js`: the brazier, the flame, the banner, the lantern, the moss, the mushrooms, the ember crack and the three ridge strips. The pipeline's sprite replaces its stand-in when it exists (`generatedTex`). A backdrop falls back to `env.background`, then to the sky's gradient.

## The namecard rail

The cards hang on the right tower, centred on it, from the gate wall down to the parapet. They take the width the tower has: 48 px on a phone up to 400 px wide where the tower has the room (47 px on the 412 phone), 52 px on a wider one, and never less than 44 px. READY is 14 px. On a phone the tower ends at or near the screen's right edge, so the rail centres between the tower's inner edge and whichever comes first. On a tablet or a desktop it stays on the tower; the valley beyond it is open.

- **Charging:** the portrait is dimmed, and a fill bar under it fills in the element's colour.
- **Ready:** the portrait has a rim in the element's colour, and the bar turns into an inverted READY pill. A tap casts; so do Enter and Space on a card that has the focus.

On a short phone, four cards do not fit between the gates and the parapet. There, the rail runs on beside the keep, down to the deck row.

Every fusion gets a card (T18), but the rail has four slots. From a fifth fusion on, the three highest fusions keep a slot each, and the rest share the fourth slot as a stack (`src/kv/namecards.js` `railSlots`):

- **The face:** only the stack's top card shows, and it is the one to tap. A "+N" pill in its portrait's corner counts the cards waiting behind it.
- **Charging:** every card keeps charging behind the stack.
- **Ready:** the face stays while it is ready. When it is not, the first ready card behind it comes up, so every fusion's skill can be cast. After a cast the face holds its place for 0.6 s, so a quick second tap nudges it instead of casting the next card's skill. Then the next ready card comes up. While no card is ready, the face holds still.
- **Order:** the rail is ordered by tier, and between equals by age, older first. A swipe that moves the blocks never reshuffles the cards, and Tab reads them top to bottom.
- **Screen readers:** the face's name says how many pets wait behind it.

## Other details

- Wave now leaves the tab order while it is hidden (during a wave).
- The Speed button's gold "x2" is a lighter gold than its ring (`--gold-text`), at 4.6:1 or more on every chapter's stone.
- The top-block chip is a disc up to two digits (20 px). From three digits it stretches into a pill (18 px), so the number fits inside its ring.
- Under the number, the chip says what it is: "Top", at 13 px (T22), as the score plate says "Best". Its spoken name stays "Top block 4096". The block counter beside it needs no word: its icon is a 4 × 4 map of the board.

## Checked

- `test/hud-frame.test.js` checks:
  - the meter, the keep grid, the price step and the ribbon's pages;
  - the gate chips, the braziers, the lane ticks and the deck slot;
  - the braziers through a real wave: a lane with foes alive or still due is never cold, and a brazier holds 1.5 s after its lane calms down;
  - that every skin has every role, and that the value plan holds in L*: light lanes, a calm centre within 4 L*, setts within 5 L* of their grout, dark hedges with a scallop at most 6 L* lighter, a keep floor near 27, and cream on stone at 4.5:1 or more;
  - that the far layer, from the busiest painting there is, keeps at most 35% of its contrast in any row and under a quarter of a saturated colour's chroma, and stays 25 L* darker than a lane; and that the ridge's flat tone is within 5 L* of the sky's middle;
  - that the hedge decor is one or two small props, placed the same every build, inside the outer hedges;
  - that every generated frame sprite has a drawn stand-in;
  - that the rail fits right of lane 4 at the five phone sizes; that `fitU` reaches the height's scale whenever 44 px cards fit (with the HUD bands the phone pass measured); and that on a tablet or a desktop the rail hangs on the tower;
  - that the deck row (the dice and the slot, centred) clears the keep's corner towers, and that the slot holds "at 512" at 14 px on a 360 px phone.
- `test/hud.test.js` checks the ribbon's even pages (no lone word), the lintel's key with the boss's health, and Wave now's label. `test/banners.test.js` checks that every page of a long banner shows before the next banner.
- Phone captures at 360 × 640, 375 × 667, 390 × 844, 412 × 915 and 430 × 932 found no DOM box over a lane, other than the block info card.
- The quieter frame was measured on 2026-10-16 at 390 × 844 (DPR 2), in the forest: a fight, the boss wave and a break. The measures are the proposal's (Sobel edge density over 64 and 16-level colour entropy, at CSS px), before → after:
  - the sky band above the HUD: edge density 1.0% → 0%, entropy 2.2 → 0 bits;
  - the towers: 45% → 17%, 3.0 → 1.0 bits;
  - the lane field without the foes, pets and puddles: 31–35% → 14–16%, 4.2–4.3 → 3.4–3.5 bits;
  - the whole field as seen: 49–51% → 32–34%, 6.1–6.4 → 5.4–5.6 bits.

  What the fight reads held. The gate arches went from 58% to 57% (the wall between them lost a course line), and the braziers and the keep did not change. The lanes stay about 45 L* lighter than the hedges, and the cell ticks stand out more against their bands: 2.4 times the band's own variation, where they were 2.0.
