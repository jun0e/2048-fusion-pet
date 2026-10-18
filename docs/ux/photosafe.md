# Photosafe effects

Some players have photosensitive epilepsy, and flashing light can trigger a seizure. The game must not show such flashes. This page gives the rules that every visual effect must obey, how they are applied, and the measured result (2026-10-15; the sprite attacks 2026-10-16).

## The rules

The rules come from WCAG 2.3.1 ("Three flashes or below threshold") and ITU-R BT.1702 (the Harding test).

- **Flash:** a pair of opposing changes in relative luminance of 10% or more.
- **Red flash:** a change to or from a saturated red, where R / (R + G + B) ≥ 0.8 in linear light, and the red value (R − G − B) × 320 changes by 20 or more.
- **Large:** the flashes going on at the same moment cover a quarter of any 10° of vision.
  - On a phone held at 25 cm, that is about 11 world units²; at a typical 30 cm it is about 16.
  - The lane field is about one 10° patch, so all effects on screen count together.
- **Limit:** at most 3 large flashes in any one second.

## How the game applies them

The rules live in `src/ux/photosafe.js`.

1. **A full-screen wash stays below both thresholds.**
   - The washes are the legendary signatures (Sun, Timestop, Plague, Vortex, Midas, Lifebloom) and the pets' skills.
   - The alpha of a wash is at most 0.08, so it changes luminance by less than 0.08 over any background.
   - A saturated red wash (Sun's orange is one) is at most 0.04.
   - A wash fades in over 0.12 s and out over 0.5 s; it never switches on or off.
2. **Washes and large flashes each come at most once a second of real time.**
   - Washes have one budget.
   - The large flashes above the thresholds have another:
     - the red edge pulse when a block falls;
     - a pet skill's cut-in panel, about 6 × 3 cm on a phone;
     - the big milestone number (a new top block), which waits for the budget, a second at most.
   - Together that is at most 2 in any second; the limit is 3.
   - Two budgets, not one: a Plague wash every second would otherwise block the cut-in of the skill the player just tapped.
   - The budgets run on frame time, so x2 and x4 speed give no extra flashes.
   - A refused effect plays without its flash; its other parts (shake, sound, and whatever the light budget allows) remain. A refused cut-in leaves the card's own "fire" bounce.
3. **The red edge pulse shows only in danger, and is rare.**
   - It shows only when 3 or fewer blocks are left in a wave. Only then does it take the flash budget, so a pulse nobody sees never holds back a cut-in.
   - Its alpha is 0.35 and it lasts 0.6 s, which is less than the 1 s gap.
4. **Local effects share a light budget.**
   - The local effects are rings, explosions, beams, particle bursts, the sprite attacks (see 8), enemies' hit flashes, damage numbers, coins, status embers (fire, poison, frost), and the text popups and combo pill drawn over the canvas.
   - Together they may light at most 10 units² to 10% or more at any moment. A large flash is about 11 at 25 cm and 16 at 30 cm, so 10 stays under both.
   - Each effect books its light over its life:
     - a ring grows until it fades;
     - an explosion holds its brightest frame;
     - every other effect holds its first moment.
   - The budget keeps one slot for each frame (1/60 s) of the next 2 s. Each slot holds the most the booked effects light within it. A new effect fits if every slot it touches stays under the cap, so a check costs well under a microsecond however busy the screen is.
   - An effect that shows later books from then: a claw slash once the cub lands, a crater where the meteor hits.
   - When the budget is short, the new effect is drawn smaller, thinner, with fewer particles or coins, or not at all. A text popup is drawn smaller, down to 60% of its font size, or not at all. An enemy's hit flash, a damage number, an ember and the combo pill are drawn whole or not at all.
   - A text popup lights about 0.42 × its characters × its font size² (px², measured with its 5 px outline), converted at the stage's px per world unit. It books 1.25 × that, because its float-up pops to 1.1×.
   - An enemy under steady fire keeps its hit flash on; it is booked again every 0.12 s of real time and goes out when the budget refuses. The audit books it the same way.
   - Caps by design:
     - a ring at most 2 world units (radius);
     - an explosion at most 3.2 across;
     - a beam's glow 0.35 wide.
   - Measured shares of a texture lit to 10% or more: ring 19%, the brightest explosion frame (fire) 28%, soft dot 65%, spark 15%.
   - An enemy's hit flash is a white silhouette of its sprite at 75% in normal blend (built once per sprite; nothing additive). Measured 2026-10-16 on the 17 generated foes as drawn (the sprite fills its square, `foeDrawSize`), over every ground and status tint: it lights 21–46% of that square (the Horned Owl the most), so it books 47% (`FOE_FLASH.share`, the most plus 1% for a crawler's squash). Before, the additive copy booked 25% of a smaller square, while the new sprites lit up to 35%. The audit's flash counts are unchanged; under heavy fire the flash shows less often (light kept 56% at x1, 19% at x4).
   - The old flash dot at each impact is gone; the explosion carries the hit.
   - Outside the budget: projectiles in flight and what rides with them, ribbons and afterimages (they move rather than flash), a legendary pet's rare single sparkle, and banners and announcement pills. A banner stays at least 1.8 s and a pill 2.1 s, so each changes at most once in a second. When news is waiting, a banner gives way to the next with one quick dip, at most once every 1.8 s.
5. **A block under attack holds its red.** The tint holds while hits keep coming (one within 0.4 s), then fades. Before, the block blinked with every hit. The shudder for each hit stays.
   - The tiles' glows stay below the flash threshold, so the whole board can glow at once without a flash. All are in normal blend:
     - a turret's muzzle flash is a white silhouette of its tile at alpha 0.12, which changes any colour's luminance by 6% at most;
     - a heal's green tint is at most a 40% mix;
     - a class glow is a soft dot in the element's colour under the tile, at alpha 0.22 at most (0.08–0.18 with the sticker art). That changes the keep's floor by under 9%, even for the palest fusion colour (#e0f7ff in the classic style, 8.4%), and a legend's three colours take turns within 7%.
   - The muzzle spark takes from the light budget.
6. **The lanes' warning glow breathes slowly** (once every 2 s) and gently, so it is no red flash.
7. **Reduce motion (in-game setting) turns off** washes, the edge pulse, the skill cut-in and shakes. The rare milestone number still shows, fading in and out in place over 1.6 s. The attacks hold still:
   - a gust's ribbon fades in place instead of racing up the lane (and then books its light);
   - the pieces and bits stay where they appear;
   - a pet does no wind-up, lunge or leap, and a legend's halo does not swell;
   - there are no afterimages.
8. **The sprite attacks are solid shapes, and nothing on the field is additive.**
   - The attacks are drawn with sticker sprites in normal blend: a fire tongue, a ping ring, bolt links, a claw slash, a bramble arc, bursts, ground decals and small bits. Fusions take their colour; nothing glows.
   - `src/art/attack-vfx.js` `attackLight` plans what each attack event books. `src/render/attacks.js` and `shots.js` draw from that plan, so the audit counts exactly what is drawn.
     - Each draw names the plan item that pays for it.
     - `test/attack-render.test.js` draws every attack at every stage and holds each draw to its item: no earlier, no later and no bigger than booked, and no more of them.
   - Each piece books the box it is drawn in at its biggest: its size after it swells, and a particle's size jitter.
     - A generated sprite is fitted inside its box, so it can never outgrow its booking.
     - A bit lives 85–100% of its booked life, never longer.
   - Long pieces are drawn to their length with their own shape: a quake's cracks, a meteor's crater, a pulse's tendrils.
     - Each fits a box that long and at most 0.36 (crack) or 0.2 (tendril) as tall; the box is what it books.
     - The generated crack is 0.24 as tall as it is long and the tendril 0.17, so both reach their full length.
     - A fatter sprite would be drawn shorter, never squashed or stretched.
   - A piece lights its opaque share of that box, trimmed to its shape: the larger of the code-drawn sprite and the generated one (`PIECE_LIT`). The shares were measured on 2026-10-16, after the crack and the tendril were redrawn long and thin.
   - Each books 1.2 × that share, rounded up to 5% (`VFX_MARGIN`), in case a newer generated sprite is fuller:
     - bodies: tongue 100%, glob, link and harpoon 90%, swirl 70%, slash 65%, bramble arc 45%;
     - bits: block, bubble, ember, smoke and pebble 100%, dust and leaf 95%, ice shard and blossom 90%, drip 85%, feather 80%, stars 65%, tendril 60%, spark 50%, glint 45%;
     - bursts: fire 80%, ice 75%, lightning 65%;
     - decals: frost 100%, streak 95%, scorch 90%, splat 75%, crack 65%;
     - the ping ring 40%, a defeat puff 85%, a soft particle 80%, a ribbon and a tether 100%.
   - At startup, before any fight, the game makes every generated sprite ready and measures it again (`textures.js` `readyVfx`). A fuller one books more, from the first attack, and no frame in combat stops to read pixels back.
     - A piece that should point along its motion but was drawn at a slant is turned level (the first harpoon came diagonal).
     - `test/vfx-lit.test.js` measures the sprites on disk the same way, so a re-made sprite fuller than its share fails the tests.
   - When the budget is short:
     - a sprite is drawn smaller, a line (a link, a tether) thinner, and bits and tendrils fewer;
     - a glint and a stun's stars are drawn whole or not at all.
   - Ground decals (scorch, frost, splat, crack, wind streak, a meteor's crater) fade in over 0.25 s, hold at least 1.1 s, then fade out over 0.9 s.
     - Their rise and their fall are more than a second apart, so a decal never makes a flash pair on its own.
     - A decal books its area for its rise. A meteor's crater rises where the meteor lands, 0.28 s after the strike, and books from then.
   - A venom puddle is a faint, splat-edged stain in its class colour, no wider than the sim's puddle (its droplets reach that radius). It books nothing, so it must stay under the threshold on its own:
     - Its alpha (0.095–0.16 by tint) keeps every colour of it under a 9% change in luminance over every ground it can lie on: each chapter's lane tones and hedges. The walls and the keep are drawn over it.
     - The change is reckoned as the screen blends it, in gamma space, not in linear light, which would under-count a dark tint on the light lane by about 1.4×.
     - It seeps in over 0.4 s, then holds at least 1.2 s of real time, then dries with the sim's puddle, but over 0.6 s at least. At x4 the stain outlives the sim's puddle a little, and its rise and fall are always more than a second apart.
   - On the keep, a foe stands on a pale patch instead of its dark shadow, so a dark foe (the Nightfox, the Kite Carp) still reads on the dark floor.
     - The patch is the lane's sand at alpha 0.28, which changes the floor and the pits by under 9%.
     - It cross-fades with the shadow over 0.3 s as a foe steps onto or off the keep, and moves with the foe.
   - The things that move are outside the budget, as projectiles always were: the harpoon and the glob, the escorts and the add-on riding them, ribbons (a gust racing up its lane, an apex's ribbon behind a shot) and afterimages.
     - A harpoon's tether is booked as a line, for the flight it was thrown for. If a pushed foe makes the chase longer, the tether ends on time and is never drawn longer than booked.

**For new effects:**

- Draw rings, explosions, beams, bursts, numbers and coins with `fx` (`ring`, `explode`, `beam`, `burst`, `number`, `coinDrop`): they are booked in the light budget. Show a floating text with main.js's `popup`, not `hud.popup`.
- For an attack's sprites:
  - Add its items to `attackLight` in `src/art/attack-vfx.js`, each with its own key and its `delay` if it shows later.
  - Draw them with `bookPlan` and the trails' `piece` and `decal`, inside the box each item books (`fit`), naming the item they draw for (`book`).
  - `fx.particle` does not book: book the bits first.
- Never use an additive blend.
- For any other local flash, ask `fx.flashAll(lit, life, delay)` first; that is how an enemy's hit flash does it.
- Do not draw any other large glow or flash yourself.
- Use `stage.flash(color)` for a full-screen wash.
- For another large flash (a panel, a big glow), ask `stage.takeFlash()` first, and skip the flash when it says no.

## Measured

`node tools/flash-audit.mjs` plays 12 bot games on the real sim: up to 15 minutes each, pets roaming, and namecards tapped as soon as they are ready. When several cards are ready together, the taps come 0.2 s apart. It also plays a stress board of 4 legendaries. The tool counts what the screen would show per second of real time. For local effects it adds up what they light at each moment: the old ones at full size, the new ones as the light budget draws them. The photosafe rows draw today's effects: since 2026-10-16 the attacks are the sprite attacks, booked as `attackLight` plans them.

| Effects | Speed | Large flashes in any 1 s | Above the thresholds | From local effects | Red | Wash peak alpha | Most lit by local effects at once (units²) | Red pulses of one block in any 1 s |
|---|---|---|---|---|---|---|---|---|
| Before | x1 | 5 | 5 | 5 | 4 | 0.28 | 212 | 4 |
| Before | x2 | 6 | 6 | 6 | 5 | 0.28 | 286 | 5 |
| Before | x4 | 7 | 7 | 5 | 7 | 0.28 | 403 | 5 |
| Photosafe (2026-10-15) | x1 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Photosafe (2026-10-15) | x2 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Photosafe (2026-10-15) | x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Sprite attacks (2026-10-16) | x1 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Sprite attacks (2026-10-16) | x2 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Sprite attacks (2026-10-16) | x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Booked as drawn (2026-10-16, review fixes) | x1 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Booked as drawn (2026-10-16, review fixes) | x2 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Booked as drawn (2026-10-16, review fixes) | x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Readability floors (2026-10-16), U 32 | x1, x2, x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Readability floors (2026-10-16), U 23.78 (a 360 × 640 phone) | x1, x2, x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |

The sprite attacks change nothing in these counts: every flash column is the same as before them, and the local effects still never make a large flash.

The "booked as drawn" rows come from the review of the sprite attacks. Every flash column is unchanged; what changed is that the audit now books what the game draws:

- A late piece books from when it shows, where before it was counted from the event:
  - a meteor's crater, dust and pebbles, where it lands;
  - a pounce's glint, after the leap;
  - a pulse's blossoms, as the arc passes.
- The shares are re-measured on the current generated sprites. The crack, the arc and the slash are fuller than the code-drawn ones were.
- An enemy's hit flash is booked again every 0.12 s while it stays hit, as `foes.js` does it, not once per run of hits.
- A sky strike books its bolt's bends, and a drip rope its sag.

The most lit at once is now measured over every frame booked, not only at the events. The before rows moved a little (x2 289, x4 413): an input to the hit flashes changed while this pass was running.

The audit also plays 40 ladder boards: one sturdy block of each element at each attack stage (16, 64, 128, a 256 fusion and a 4096 apex), 60 s each, so every attack is measured at every stage. Every element's attack came at every stage, at least 22 times. Measured on their own:

| Effects | Speed | Large flashes in any 1 s | Above the thresholds | From local effects | Red | Wash peak alpha | Most lit by local effects at once (units²) | Red pulses of one block in any 1 s |
|---|---|---|---|---|---|---|---|---|
| Before | x4 | 6 | 6 | 5 | 4 | 0.28 | 193 | 5 |
| Sprite attacks | x1 | 2 | 1 | 0 | 2 | 0.08 | 10.0 | 2 |
| Sprite attacks | x4 | 2 | 1 | 0 | 2 | 0.08 | 10.0 | 2 |

The 2 red flashes in a second on a ladder board are a Sun legendary's orange wash and its own skill panel (also orange, a saturated red) within the same second. Each comes from its own one-a-second budget, as rule 2 allows; WCAG allows 3. The local effects add none.

What the "before" effects were:

- **Rings:** a legendary's skill drew two rings up to 7 units in radius; one of them alone lit 34 units², three times a large flash.
- **Gust:** a 3-lane Wing Gust drew a slash up each lane, lighting 22 units² at once.
- **Large dots:** lob explosions had flash dots up to 6 world units across.
- **Plague:** washed the whole screen purple every second of game time, 4 times a second at x4.
- **Sun:** washed it orange (a saturated red) every 2 s.
- **Pet cut-in:** each quick tap on another ready card restarted the panel, so it blinked.

**The cost.** In busy moments the light budget draws some local effects smaller, thinner, with fewer particles, or not at all. Light kept on average in the bot games:

| Speed | Rings | Explosions | Bursts | Lines | Enemy hit flashes | Damage numbers | Text popups | Coins | Embers |
|---|---|---|---|---|---|---|---|---|---|
| x1 | 79% | 73% | 65% | 57% | 54% | 79% | 61% | 70% | 83% |
| x4 | 48% | 34% | 34% | 29% | 21% | 48% | 29% | 35% | 51% |

With the sprite attacks (2026-10-16), fewer effects are cut: 19% of local effects at x1 (26% before them) and 50% at x4 (58% before). Light kept on average:

| Speed | Attack sprites | Attack bits | Decals | Links | Pings | Rings | Explosions | Bursts | Enemy hit flashes | Damage numbers | Text popups | Coins | Embers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| x1 | 80% | 70% | 77% | 82% | 89% | 80% | 89% | 72% | 63% | 83% | 64% | 69% | 92% |
| x4 | 46% | 37% | 42% | 49% | 61% | 57% | 55% | 41% | 25% | 50% | 30% | 27% | 68% |

Booked as drawn (the review fixes), a little more is cut: 22% at x1 and 53% at x4. Light kept on average:

| Speed | Attack sprites | Attack bits | Decals | Links | Pings | Rings | Explosions | Bursts | Enemy hit flashes | Damage numbers | Text popups | Coins | Embers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| x1 | 79% | 67% | 75% | 80% | 87% | 78% | 88% | 70% | 55% | 81% | 62% | 65% | 90% |
| x4 | 48% | 37% | 39% | 46% | 58% | 54% | 53% | 38% | 19% | 47% | 29% | 21% | 64% |

**The readability floors** (2026-10-16, `docs/ux/phone-readability.md`) make the canvas numbers bigger on a phone, and every number now books what it draws:

- A damage number is never drawn under 15 px (a hit) or 14 px (a damage-over-time or coin tick): `numberScale(kind, U)` in `src/ux/photosafe.js`. On a 360 × 640 phone (U 23.78) a hit is 0.63 world units, not 0.36: 3.1 times the light.
- A number books the light of every glyph in its text (`numberLit(scale, text)`), not one digit's. Before, every number booked one digit (0.12 units² at 0.36), whatever its length, and 88% of numbers have 2 or 3 characters. The glyphs' light was measured on the bitmap font with its 0.2 em ink stroke, as it pops in (1.45×), the pixels at alpha 10% or more (`NUMBER.glyphLit`):
  - every digit books the widest digit's, 0.143 units² ("1" lights 0.095), so the booking does not depend on which digits show;
  - "." 0.037, "k" 0.14, "+" 0.094, "M" 0.184.
  
  The sum is never under what the glyphs light together: they overlap at their strokes, by 0–8% on 20 numbers from "1" to "+8.8k".
- `fx.js` formats the text before it books (`numberText`), so it books exactly what it then draws.
- A number books its light over time (`numberLight`): the pop's peak for the first 15% of its life, then its settled size, 1.45² smaller. Before, it booked the peak for its whole life.
- A popup is never drawn under 14 px (`TEXT.minPx`). It asks the budget for at least the share that keeps it there, or books nothing.
- The audit:
  - runs at any U (`--u=`, 32 by default);
  - books the real texts: the hit's amount, "+" and the coins of a kill, and the burn and poison a foe took since its last numbers (from `f.dot`, twice a second, as `foes.js` does);
  - books the combo pill whole or not at all (`bookAll`), as `main.js` does. Before, the audit asked `book` for a share of 1 and never got it, so the pill never counted.

**The light, booked and real.** The flash columns are unchanged at both U, on the bot games and on the 40 ladder boards: no large flash from local effects, and never more than 10.0 units² booked at once. `test/phone-readability.test.js` runs a short audit at U 23.78 to hold it.

Booking one digit per number had hidden real light above the cap. A second, uncapped tally adds each number's real light to every booking (`ro/fa/real.mjs` in the session's scratchpad, after the review's own script). It counts the real light two ways: by the glyphs, and by the review's measured light per length (0.142, 0.213, 0.342, 0.361 units² for 1 to 4 characters).

| | Real peak (units², cap 10) | Frames over 11 (a large flash) | Large flashes in any 1 s |
|---|---|---|---|
| Before the readability pass: one digit per number, U 32 (the review's tally) | 12.13 | 347 | 6 |
| The floors, one digit per number, U 32 (the review's tally) | 13.99 | 1,520 | 5 |
| The floors, one digit per number, U 23.78 (the review's tally) | 15.7 | 3,515 | 6 |
| Now (by glyph, over time), U 32 | 10.0 | 0 | 0 |
| Now, U 23.78 | 10.0 | 0 | 0 |

Both ways of counting the real light give the same result now: 10.0, no frame over 11 and no large flash, at both U, over 12 bot games, the stress board and the 40 ladder boards at x1, x2 and x4.

**The cost.** Busy moments trim more. In the table below:

- "before" is the old booking: one digit per number, no floors;
- "by text" books every glyph, but without the floors;
- "now" has both.

| U | Speed | Local effects drawn smaller or not at all: before / by text / now | Damage numbers' light kept | Enemy hit flashes' light kept |
|---|---|---|---|---|
| 32 | x1 | 21.7% / 23.2% / 26.0% | 81% / 78% / 72% | 55% / 51% / 45% |
| 32 | x4 | 52.7% / 53.1% / 55.7% | 47% / 43% / 36% | 19% / 16% / 13% |
| 23.78 | x1 | 22.7% / 24.0% / 30.8% | 80% / 77% / 63% | 54% / 50% / 37% |
| 23.78 | x4 | 53.1% / 53.5% / 59.2% | 47% / 43% / 27% | 18% / 16% / 9% |

On a small phone, then, a busy x1 moment shows fewer numbers and fewer hit flashes, never smaller numbers.

The combo pill books 1.25 × 2600 px² / U² whole (5.7 units² at U 23.78). It comes with a multi-merge swipe, when the merges' bursts, rings and popups already hold the budget. At U 32 it fits 292 times of 2,046 (14%). On a 360 × 640 phone it never fits (0 of 2,046), so the pill never shows there. A smaller pill or a lighter book would let it show; this pass leaves it.

Light kept on average now:

| U | Speed | Attack sprites | Attack bits | Decals | Links | Pings | Rings | Explosions | Bursts | Enemy hit flashes | Damage numbers | Text popups | Combo pill | Coins | Embers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 32 | x1 | 75% | 63% | 68% | 76% | 87% | 79% | 87% | 69% | 45% | 72% | 64% | 27% | 59% | 90% |
| 32 | x4 | 44% | 34% | 31% | 41% | 57% | 55% | 54% | 38% | 13% | 36% | 32% | 3% | 17% | 67% |
| 23.78 | x1 | 70% | 57% | 61% | 72% | 85% | 77% | 84% | 66% | 37% | 63% | 57% | 0% | 53% | 88% |
| 23.78 | x4 | 42% | 31% | 28% | 39% | 56% | 53% | 52% | 36% | 9% | 27% | 26% | 0% | 15% | 65% |

I also checked the renderer in the browser:

- **Washes:** four legendaries (Plague, Sun, Midas, Lifebloom) fought at x4 for 40 s of frames. That gave 28 washes, never two within 1.00 s, with a peak alpha of 0.078 and at most 0.011 of change in one frame.
- **Cut-in:** four ready pet cards tapped 0.2 s apart cast 4 skills but showed 1 cut-in and 1 wash.
- **A long fight:** a board of legendaries and fusions fought through wave 7 with no errors, and the rings and explosions still read. The thin gust slashes and bolts still read too.

`test/photosafe.test.js` holds these rules:

- every wash colour stays below both thresholds over the game's backgrounds;
- a budget gives one a second;
- a wash fades in and out;
- hundreds of big local effects in a second (rings, explosions, lines, bursts, hit flashes) never light more than the cap at once;
- a short audit of the real event stream at x4 has these limits:
  - at most one flash above the thresholds and two in all per second;
  - no large flash from local effects.

`test/photosafe.test.js` also holds that an effect booked with a delay leaves the frames before it free, and that the audit books a hit flash as the game does.

`test/attack-ladder.test.js` holds the sprite attacks to them:

- every attack at every stage plans its light, and a higher stage never books less than the one below it;
- a frantic second of sprite attacks never lights more than the cap at once;
- the audit, with the ladder boards: every element's attack at every stage, at most 2 large flashes and 1 above the thresholds in any second, none from local effects, and never more than the cap lit at once;
- a pet's wind-up lasts the same real time at x1, x2 and x4.

`test/attack-render.test.js` draws every attack, impact and status through the real renderer. It runs each one with the budget granting all, half or a third, and with Reduce motion. Every draw must show inside its plan item's window and light no more than the item booked. The cases include:

- a pulse among foes struck by other attacks;
- tendrils and cracks of any shape;
- a meteor that lands later;
- a harpoon chasing a foe twice as far as it was thrown for.

`test/vfx-lit.test.js` measures the generated sprites on disk against the shares they book, and checks that the long pieces stay long.

`test/puddles.test.js` checks the puddles:

- the gamma-space step over every ground, for every tint;
- the splat inside the sim's radius;
- the hold of over a second at x1, x2 and x4, in the real renderer.
