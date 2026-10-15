# Photosafe effects

Some players have photosensitive epilepsy, and flashing light can trigger a seizure. The game must not show such flashes. This page gives the rules that every visual effect must obey, how they are applied, and the measured result (2026-10-15).

## The rules

The rules come from WCAG 2.3.1 ("Three flashes or below threshold") and ITU-R BT.1702 (the Harding test).

- **Flash:** a pair of opposing changes in relative luminance of 10% or more over a large area. On a phone, a large area is about a palm-sized patch: a quarter of the central 10° of vision.
- **Red flash:** a change to or from a saturated red, where R / (R + G + B) ≥ 0.8 in linear light, and the red value (R − G − B) × 320 changes by 20 or more.
- **Limit:** at most 3 large flashes in any one second.

## How the game applies them

The rules live in `src/ux/photosafe.js`.

1. **A full-screen wash stays below both thresholds.** The washes are the legendary signatures (Sun, Timestop, Plague, Vortex, Midas, Lifebloom) and the pets' skills. The alpha of a wash is at most 0.08, so it changes luminance by less than 0.08 over any background. A saturated red wash (Sun's orange is one) is at most 0.04. A wash fades in over 0.12 s and out over 0.5 s; it never switches on or off.
2. **Washes and large flashes each come at most once a second of real time.**
   - Washes have one budget.
   - The large flashes above the thresholds have another:
     - the red edge pulse when a block falls;
     - a pet skill's cut-in panel, about 6 × 3 cm on a phone.
   - Together that is at most 2 in any second; the limit is 3.
   - Two budgets, not one: a Plague wash every second would otherwise block the cut-in of the skill the player just tapped.
   - The budgets run on frame time, so x2 and x4 speed give no extra flashes.
   - A refused effect plays without its flash; its rings, particles, shake and sound remain. A refused cut-in leaves the card's own "fire" bounce.
3. **The red edge pulse is visible but rare.** Its alpha is 0.35 and it lasts 0.6 s, which is less than the 1 s gap. Quick taps on several pet cards show one cut-in, not a blinking panel.
4. **An impact's flash dot is small.** Its size is at most 2.4 world units across and its alpha 0.6, and it fades over 0.24 s. Many dots never add up to a large flash.
5. **A block under attack holds its red.** The tint holds while hits keep coming (one within 0.4 s), then fades. Before, the block blinked with every hit. The shudder for each hit stays.
6. **The lanes' warning glow breathes slowly** (once every 2 s) and gently, so it is no red flash.
7. **Reduce motion (in-game setting) turns them all off:** washes, flash dots, the edge pulse, the skill cut-in, shakes.

**For new effects:**

- Do not draw a full-screen or large-area flash yourself. Use `stage.flash(color)` for a wash: it applies the cap and the budget.
- For any other large flash (a panel, a big glow), ask `stage.takeFlash()` first, and skip the flash when it says no.
- Keep impact flashes within `FLASH_DOT`.

## Measured

`node tools/flash-audit.mjs` plays 12 bot games on the real sim: up to 15 minutes each, pets roaming, and namecards tapped as soon as they are ready. When several cards are ready together, the taps come 0.2 s apart. It also plays a stress board of 4 legendaries. The tool counts what the screen would show per second of real time.

| Effects | Speed | Washes and flashes in any 1 s | Of them above the thresholds | Of them red | Wash peak alpha | Edge pulse alpha | Red pulses of one block in any 1 s |
|---|---|---|---|---|---|---|---|
| Before | x1 | 7 | 7 | 4 | 0.28 | 0.53 | 4 |
| Before | x2 | 8 | 8 | 4 | 0.28 | 0.53 | 5 |
| Before | x4 | 9 | 9 | 7 | 0.28 | 0.53 | 5 |
| Photosafe | x1 | 2 | 1 | 1 | 0.08 | 0.35 | 2 |
| Photosafe | x2 | 2 | 1 | 1 | 0.08 | 0.35 | 2 |
| Photosafe | x4 | 2 | 1 | 1 | 0.08 | 0.35 | 2 |

What the "before" effects were:

- **Large dots:** lob explosions had flash dots up to 6 world units across.
- **Plague:** washed the whole screen purple every second of game time, 4 times a second at x4.
- **Sun:** washed it orange (a saturated red) every 2 s.
- **Pet cut-in:** each quick tap on another ready card restarted the panel, so it blinked.

I also checked the renderer in the browser. Four legendaries (Plague, Sun, Midas, Lifebloom) fought at x4 for 40 s of frames. That gave 28 washes, never two within 1.00 s, with a peak alpha of 0.078 and at most 0.011 of change in one frame.

`test/photosafe.test.js` holds these rules:

- every wash colour stays below both thresholds over the game's backgrounds;
- a budget gives one a second;
- a wash fades in and out;
- a short audit of the real event stream at x4 stays at one flash above the thresholds and two in all per second.
