# Photosafe effects

Some players have photosensitive epilepsy, and flashing light can trigger a seizure. The game must not show such flashes. This page gives the rules that every visual effect must obey, how they are applied, and the measured result (2026-10-15).

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
     - a pet skill's cut-in panel, about 6 × 3 cm on a phone.
   - Together that is at most 2 in any second; the limit is 3.
   - Two budgets, not one: a Plague wash every second would otherwise block the cut-in of the skill the player just tapped.
   - The budgets run on frame time, so x2 and x4 speed give no extra flashes.
   - A refused effect plays without its flash; its other parts (shake, sound, and whatever the light budget allows) remain. A refused cut-in leaves the card's own "fire" bounce.
3. **The red edge pulse shows only in danger, and is rare.**
   - It shows only when 3 or fewer blocks are left in a wave. Only then does it take the flash budget, so a pulse nobody sees never holds back a cut-in.
   - Its alpha is 0.35 and it lasts 0.6 s, which is less than the 1 s gap.
4. **Local effects share a light budget.**
   - The local effects are rings, explosions, lines (lightning, wind slashes, beams, poison spread), particle bursts and enemies' hit flashes.
   - Together they may light at most 10 units² to 10% or more at any moment. A large flash is about 11 at 25 cm and 16 at 30 cm, so 10 stays under both.
   - Each effect books its light over its life:
     - a ring grows until it fades;
     - an explosion holds its brightest frame;
     - a line, a burst or a hit flash holds its first moment.
   - A new effect is checked against the effects already on screen at every moment of its life where the total could peak. When the budget is short, the new effect is drawn smaller, thinner, with fewer particles, or not at all. An enemy's hit flash is drawn whole or not at all.
   - Caps by design:
     - a ring at most 2 world units (radius);
     - an explosion at most 3.2 across;
     - thin line glows: a slash 0.3 wide, a beam 0.35, a sky bolt 1.1 × the arc's 0.34.
   - Measured shares of a texture lit to 10% or more: ring 19%, the brightest explosion frame (fire) 28%, soft dot 65%, spark 15%, the generated foes at hit-flash strength 5–22%.
   - The old flash dot at each impact is gone; the explosion carries the hit.
   - Tiny effects stay outside the budget: enemies' status embers and frost (under 0.03 units² each), damage numbers, coins.
5. **A block under attack holds its red.** The tint holds while hits keep coming (one within 0.4 s), then fades. Before, the block blinked with every hit. The shudder for each hit stays.
   - A turret's muzzle flash (alpha 0.12) and a heal's green tint (at most a 40% mix) stay below the flash threshold, so the whole board can glow at once without a flash. The muzzle spark takes from the light budget.
6. **The lanes' warning glow breathes slowly** (once every 2 s) and gently, so it is no red flash.
7. **Reduce motion (in-game setting) turns off** washes, the edge pulse, the skill cut-in and shakes.

**For new effects:**

- Draw rings, explosions, lines and bursts with `fx` (`ring`, `explode`, `lightning`, `bolt`, `slash`, `beam`, `spread`, `burst`, `trail`): they are booked in the light budget.
- For any other local flash, ask `fx.flashAll(lit, life)` first; that is how an enemy's hit flash does it.
- Do not draw any other large glow or flash yourself.
- Use `stage.flash(color)` for a full-screen wash.
- For another large flash (a panel, a big glow), ask `stage.takeFlash()` first, and skip the flash when it says no.

## Measured

`node tools/flash-audit.mjs` plays 12 bot games on the real sim: up to 15 minutes each, pets roaming, and namecards tapped as soon as they are ready. When several cards are ready together, the taps come 0.2 s apart. It also plays a stress board of 4 legendaries. The tool counts what the screen would show per second of real time. For local effects it adds up what they light at each moment: the old ones at full size, the new ones as the light budget draws them.

| Effects | Speed | Large flashes in any 1 s | Above the thresholds | From local effects | Red | Wash peak alpha | Most lit by local effects at once (units²) | Red pulses of one block in any 1 s |
|---|---|---|---|---|---|---|---|---|
| Before | x1 | 6 | 6 | 4 | 4 | 0.28 | 205 | 4 |
| Before | x2 | 6 | 6 | 5 | 5 | 0.28 | 276 | 5 |
| Before | x4 | 7 | 7 | 5 | 7 | 0.28 | 372 | 5 |
| Photosafe | x1 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Photosafe | x2 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |
| Photosafe | x4 | 2 | 1 | 0 | 1 | 0.08 | 10.0 | 2 |

What the "before" effects were:

- **Rings:** a legendary's skill drew two rings up to 7 units in radius; one of them alone lit 34 units², three times a large flash.
- **Gust:** a 3-lane Wing Gust drew a slash up each lane, lighting 22 units² at once.
- **Large dots:** lob explosions had flash dots up to 6 world units across.
- **Plague:** washed the whole screen purple every second of game time, 4 times a second at x4.
- **Sun:** washed it orange (a saturated red) every 2 s.
- **Pet cut-in:** each quick tap on another ready card restarted the panel, so it blinked.

**The cost.** In busy moments the light budget draws some local effects smaller, thinner or with fewer particles. Light kept on average in the bot games:

| Speed | Rings | Explosions | Bursts | Lines | Enemy hit flashes |
|---|---|---|---|---|---|
| x1 | 85% | 81% | 73% | 65% | 63% |
| x4 | 55% | 41% | 42% | 39% | 30% |

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
