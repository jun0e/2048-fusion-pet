# Photosafe effects

Some players have photosensitive epilepsy, and flashing light can trigger a seizure. The game must not show such flashes. This page gives the rules that every visual effect must obey, how they are applied, and the measured result (2026-10-15).

## The rules

The rules come from WCAG 2.3.1 ("Three flashes or below threshold") and ITU-R BT.1702 (the Harding test).

- **Flash:** a pair of opposing changes in relative luminance of 10% or more.
- **Red flash:** a change to or from a saturated red, where R / (R + G + B) ≥ 0.8 in linear light, and the red value (R − G − B) × 320 changes by 20 or more.
- **Large:** the flashes going on at the same moment cover a quarter of any 10° of vision.
  - On a phone held at 25 cm, that is about 11 world units².
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
   - A refused effect plays without its flash; its rings, particles, shake and sound remain. A refused cut-in leaves the card's own "fire" bounce.
3. **The red edge pulse shows only in danger, and is rare.**
   - It shows only when 3 or fewer blocks are left in a wave. Only then does it take the flash budget, so a pulse nobody sees never holds back a cut-in.
   - Its alpha is 0.35 and it lasts 0.6 s, which is less than the 1 s gap.
4. **Rings and explosions are capped, and share a light budget.**
   - A ring grows to at most 2 world units (radius); an explosion is at most 3.2 across.
   - Together they may light at most 8 units² to 10% or more at any moment, against about 11 for a large flash.
   - Each effect books its light over its life: a ring grows until it fades, and an explosion holds its brightest frame.
   - A new effect is checked against the effects already on screen at every moment of its life where the total could peak. When the budget is short, the new ring or explosion is drawn smaller, or not at all.
   - The measured texture shares (pixels lit to 10% or more) are: the ring 19%, the brightest explosion frame (fire) 28%.
   - The old flash dot at each impact is gone; the explosion carries the hit.
5. **A block under attack holds its red.** The tint holds while hits keep coming (one within 0.4 s), then fades. Before, the block blinked with every hit. The shudder for each hit stays.
6. **The lanes' warning glow breathes slowly** (once every 2 s) and gently, so it is no red flash.
7. **Reduce motion (in-game setting) turns off** washes, the edge pulse, the skill cut-in and shakes.

**For new effects:**

- Draw rings and explosions with `fx.ring` and `fx.explode`: they are capped and booked in the light budget.
- Do not draw any other large glow or flash yourself.
- Use `stage.flash(color)` for a full-screen wash.
- For another large flash (a panel, a big glow), ask `stage.takeFlash()` first, and skip the flash when it says no.

## Measured

`node tools/flash-audit.mjs` plays 12 bot games on the real sim: up to 15 minutes each, pets roaming, and namecards tapped as soon as they are ready. When several cards are ready together, the taps come 0.2 s apart. It also plays a stress board of 4 legendaries. The tool counts what the screen would show per second of real time. For rings and explosions it adds up what they light at each moment: the old ones at full size, the new ones as the light budget draws them.

| Effects | Speed | Large flashes in any 1 s | Above the thresholds | From rings, explosions and dots | Red | Wash peak alpha | Most lit by rings, explosions and dots at once (units²) | Red pulses of one block in any 1 s |
|---|---|---|---|---|---|---|---|---|
| Before | x1 | 6 | 6 | 4 | 4 | 0.28 | 192 | 4 |
| Before | x2 | 6 | 6 | 4 | 5 | 0.28 | 240 | 5 |
| Before | x4 | 7 | 7 | 4 | 7 | 0.28 | 311 | 5 |
| Photosafe | x1 | 2 | 1 | 0 | 1 | 0.08 | 8.0 | 2 |
| Photosafe | x2 | 2 | 1 | 0 | 1 | 0.08 | 8.0 | 2 |
| Photosafe | x4 | 2 | 1 | 0 | 1 | 0.08 | 8.0 | 2 |

What the "before" effects were:

- **Rings:** a legendary's skill drew two rings up to 7 units in radius; one of them alone lit 34 units², three times a large flash.
- **Large dots:** lob explosions had flash dots up to 6 world units across.
- **Plague:** washed the whole screen purple every second of game time, 4 times a second at x4.
- **Sun:** washed it orange (a saturated red) every 2 s.
- **Pet cut-in:** each quick tap on another ready card restarted the panel, so it blinked.

**The cost:** in busy moments the light budget draws some rings and explosions smaller or not at all: 15% of them at x1, 26% at x2 and 44% at x4.

I also checked the renderer in the browser:

- **Washes:** four legendaries (Plague, Sun, Midas, Lifebloom) fought at x4 for 40 s of frames. That gave 28 washes, never two within 1.00 s, with a peak alpha of 0.078 and at most 0.011 of change in one frame.
- **Cut-in:** four ready pet cards tapped 0.2 s apart cast 4 skills but showed 1 cut-in and 1 wash.
- **A long fight:** a board of legendaries and fusions fought through wave 7 with no errors; the rings and explosions still read.

`test/photosafe.test.js` holds these rules:

- every wash colour stays below both thresholds over the game's backgrounds;
- a budget gives one a second;
- a wash fades in and out;
- hundreds of big rings and explosions in a second never light more than the cap at once;
- a short audit of the real event stream at x4 has these limits:
  - at most one flash above the thresholds and two in all per second;
  - no large flash from rings and explosions.
