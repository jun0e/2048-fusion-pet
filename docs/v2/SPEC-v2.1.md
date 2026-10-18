# v2.1: rebalance, the level road, bigger boards

The contract for v2.1 (branch `v2.1`, from v2 at tag `v2.0`). It adds to `docs/v2/SPEC.md`; where they
differ, this file wins. The player-facing plan is the "v2.1 plan" tab of the upgrade doc.

What the user asked for (2026-10-19):

1. One strong pet must not carry a run.
2. Levels come easier, and there are more of them, on a timeline of rewards (the level road).
3. The board grows to 5×5 at about 8 minutes and to 6×6 at about 15 (by level).
4. Every pet's attack has a weakness: it cannot reach far, hit other lanes, hit an area and chain all at once.
5. Icons for the stats, used instead of the stat words.
6. After 20 minutes, the waves scale with the player's damage per second.
7. Waves bring more foes as the run goes on, not only tougher ones.
8. While the player picks which fusion pet to keep, the board stays visible and the pet's tile is highlighted.
9. Foes can resist elements, more of them as waves rise, against the elements the player deals the most damage with.
10. After 15 minutes, the difficulty curve gets steeper and steeper.
11. No main-element pick when two pets fuse: a fusion pet's attack and skill are fixed to the pet (its picture).
12. New blocks can spawn as 16 and 32 at high levels, and 2, 4 and 8 can stop spawning.
13. Balance: after about 8 minutes the waves beat anyone who does not play well, and nobody lasts past
    about 12 minutes. The user chose to fit everything into those 12 minutes (2026-10-19): the board
    grows to 5×5 at about 4 minutes and to 6×6 at about 7, the waves steepen from 8 and match the
    player's damage from 10, and the 20 levels arrive by about 10.
14. The level card shows no spawn odds: only the XP still needed and the next level's reward. Buy XP is gone.

## 1. A board that grows

- The board keeps its footprint: x ∈ [-4, 4], y ∈ [0, 8] (`BOARD_SPAN` 8, `BOARD_HALF` 4, `GRID_TOP` 8). It
  starts 4×4 and grows to 5×5 and 6×6; its cells shrink (`GRID.cell` = 8 / size: 2, 1.6, 1.33).
- `GRID.size`, `GRID.cell` and `FIELD.lanes` are read at use time. Never cache them at import, and never use
  `GRID.size` as a world coordinate (use `BOARD_HALF`). One lane per column: `FIELD.lanes === GRID.size`,
  `laneX(l) === cellX(l)`.
- `DESIGN_CELL` (2) is the unit the game's distances were designed in: attack reaches, skill radii (`…Cells`),
  speeds. They stay in world units as the board grows. The views may scale foes, pets and marks to the lane
  width, but the sim's distances do not change.
- The run owns its size (`run.size`) and sets it on every call into it (`setBoardSize`), so the views read the
  displayed run's board. `run.growBoard(size)` grows it (tests and the demo; the level road does it in play).
- Event `{ type: 'grow', size, from }`: the grid has grown. Every tile kept its `col` / `row`; its `x` / `y`
  are already the new board's. The new column is on the right (col = size − 1), the new row on top.
  It happens in a break or before wave 1, never with foes on the field.
- Views on `grow`: rebuild everything sized by the board (the keep frame, the cell plaques, the lanes, the
  portals, the lane pressure marks, tile textures), and play a short "the keep grows" moment (photosafe).

## 2. Fusions: no main-element pick

- Two single pets merging make the fusion at once: its main element is fixed per pair, `FUSION_MAIN[key]`
  (src/sim/classes.js), chosen to fit the pet's animal and skill. `classed` stage 2 is emitted and the
  skill card follows, as before. The choice kind `fusion` is gone: choices are `die` and `keep`.
- The pet's name, picture, colour, skill and attack all come from the pair.

| main | fusions (key: pet) |
|---|---|
| fire | fire+ice Novakit · fire+lightning Zapcinder · fire+wind Flarewhirl · fire+nature Emberhopper |
| ice | ice+lightning Sparkfrost · ice+poison Frostjelly · ice+metal Rimeplate |
| lightning | lightning+poison Fizzlebolt · lightning+earth Rumblebolt · lightning+wind Gustbolt |
| poison | fire+poison Embertoad · poison+earth Bogling · poison+wind Mistmaw |
| earth | fire+earth Magmole · ice+earth Tundrock · earth+metal Ironclod |
| wind | ice+wind Flurrin · earth+wind Dunepuff · wind+metal Whirlblade · wind+nature Pollenpuff |
| metal | fire+metal Anviljaw · lightning+metal Voltgild · poison+metal Rustclaw · metal+nature Sproutgear |
| nature | ice+nature Frostpetal · lightning+nature Zaplily · poison+nature Nightling · earth+nature Mossbara |

## 3. Attack strengths (every pet has a weakness)

- Four strengths, `TRAIT_KEYS = ['far', 'lanes', 'area', 'chain']`: **far** reaches deep into the field,
  **lanes** hits lanes other than its own column's, **area** hits several foes at once, **chain** jumps from
  foe to foe. Every pet has **at most two**.
- `profileFor(tile).traits` → `{ far, lanes, area, chain }` (booleans). A plain block: none.
- The main element sets the shape: fire area · ice far + lanes (lanes from 64) · lightning lanes + chain ·
  poison lanes + area · earth lanes + area · wind far + area · metal lanes · nature lanes + area.
- The second element always adds its effects (burn, chill, freeze, poison, stun, push, bite, loot, root,
  thorns, regrow). It adds a strength only while the shape has fewer than two: the first one it lacks of
  fire [area] · ice [far, lanes] · lightning [chain, lanes] · poison [area, lanes] · earth [lanes, area] ·
  wind [far, area] · metal [lanes] · nature [area, lanes]. So every fusion has exactly two.
- A shape without `lanes` keeps every part of its attack in its own lane (a cone does not widen past it,
  chain jumps stay in the lane, a puddle does not spill over). Without `far`, a range buff or aura cannot
  stretch the reach past `FAR_REACH` (8 world units); without `area`, no splash; without `chain`, no jumps.

## 4. The level road

- 20 levels (`LEVELS.max`). XP comes from kills and cleared waves (Buy XP is gone: no `buyXp` input, no
  `buyXpPrice`); there is no level cap from the top block any more. Each level makes new blocks a little
  bigger; some levels also unlock something. The minutes are set by the balance target (item 13): the
  road's `minute` field says where each level falls, so views never hard-code minutes.
- `LEVEL_ROAD` (src/sim/levels.js): one entry per level, `{ level, minute, rewards }`. `minute` is when an
  average run reaches it (the bot's median): a level about every 30 s, the 5×5 board at level 11 (about
  4:00), the 6×6 at level 17 (about 7:00), the top level 20 at about 10:00. Rewards:

| kind | fields | what it does |
|---|---|---|
| `odds` | `adds: [tier]`, `drops: [tier]` | the spawn odds move up; `adds` lists values that start spawning (e.g. 16), `drops` values that stop |
| `element` | | a pick of a new element (the `die` choice, 2 offers) |
| `grow` | `size` | the board grows to `size` × `size` (at the next break) |
| `charge` | `s` | summons charge `s` seconds faster |
| `top` | | the top level |

- `levelUp` event: `{ type: 'levelUp', level, reason, odds, rewards }` (rewards: that level's entries).
- `run.level`, `run.xp`, `run.xpNeed` as before. `run.road` → `LEVEL_ROAD` (for the road card).

## 5. Waves, resistances and the ramp

- Waves keep growing in count all run (no 30-foe cap); per-foe health grows more slowly to make room. Coins
  per kill shrink as counts grow, so a wave pays about what it did.
- **Resistances.** A foe may resist an element: `e.resist` → `{ [element]: share }` (share of damage it
  ignores, e.g. 0.5), or `null`. An element here is a pet's main element (fire … nature); a hit counts as its
  pet's main element; burn ticks count as fire, poison ticks as poison, bleed as metal, thorns as nature;
  pebbles from plain blocks are never resisted. The run tracks the damage dealt per element and, from wave
  10, gives a share of each wave's foes a resistance to the player's top element (from wave 20 also the
  second), growing with the wave. Bosses resist the top element from wave 15. `spawn` events carry `resist`.
  Event `{ type: 'resisted', id, x, y, element }` when a resisted hit lands (views: a small shield blink,
  at most a few a second).
- **The ramp.** `run.ramp` → `{ phase, dps, needS }`: `phase` is `'curve'` before 8:00, `'steep'` from
  8:00 (toughness grows faster each minute), `'dps'` from 10:00 (each wave needs at least `needS` seconds
  of the board's whole firepower, `dps`, to clear; `needS` rises every minute, so nobody lasts past about
  12:00). Events `{ type: 'ramp', phase }` when a phase starts (the HUD says so). The minutes live in
  `V2_1.ramp` (src/config.js); views never hard-code them.
- **Overtime.** From 8:00, a wave whose foes hold out `V2_1.overtimeS` (60) seconds after its last foe came
  does not hold back the next one: `{ type: 'overtime', wave }`, then the next wave's `waveStart` with
  `overtime: true` (no break, no clear bonus, no refill; the foes still out stay). No stalemate outlasts
  the ramp: in 288 bot runs the longest lasted 10.7 minutes.
- **Coins.** A wave's regular foes share about v2's kill coins (`wave.coinScale`); a boss pays its own.

## 6. Screens

- **Icons** (src/ui/icons.js): one small inline SVG per key: the element stats `dmg slow rate poison hp range
  crit regen`, the strengths `far lanes area chain`, and `level xp coin summon charge grow resist dps`. They
  replace stat words wherever a stat is shown (the die card's buff line, the keep card's gains, the tile card,
  the buff banner, namecards), each with its word as `title` / `aria-label`. The tile card shows the four
  strengths, lit or dim.
- **Keep card**: docked at the top of the field, the board visible under it; the merged pet's tile is
  highlighted on the board (`blocks.highlight(tileId | null)`, src/render/blocks.js) while the card is open.
- **The level card**: tapping the level badge shows only the XP still needed for the next level (a bar and
  "12 XP to level 8") and that level's reward (icon and words, e.g. "Board grows to 5×5"). No spawn odds
  anywhere (not on the card, not in level-up news), and no Buy XP button.
- **HUD**: the keep grid shows `size × size` cells; a banner on `grow`, on `ramp`, and for a level's rewards.
- **Foes** wear a small shield in the colour of the element they resist.

## 7. Who owns what

| Worker | Owns |
|---|---|
| Coordinator (sim, balance) | `src/sim/*`, `src/autoplay.js`, `src/config.js`, `docs/v2/*`, `tools/*`, sim tests |
| R: board views | `src/render/*`, `src/art/*`, `src/kv/*`, render tests; in `src/main.js` only the `grow` and highlight wiring |
| U: screens | `src/ui/*`, `src/ux/*`, `src/i18n/en.js`, `src/i18n/vi.js`, `src/sim/describe.js`, `index.html`, CSS outside `src/kv`, UI tests; the rest of `src/main.js` |
