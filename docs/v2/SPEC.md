# 2048 Siege v2 — build spec

The shared contract for the sessions building v2 in parallel. Branch `v2` (worktree `.worktrees/v2`) is the
integration branch; v1 is backed up as tag `v1-backup` / branch `backup/v1`. Each stream works on its own
branch cut from `v2` and touches **only the files it owns** (section 9). Numbers and words of the skills
live in one place: `src/sim/skills/data.js` + `src/i18n/skills-en.js` / `skills-vi.js` (never copy a number
elsewhere; read it from there). The user-facing matrix (Vietnamese) is generated from that data by
`node tools/skill-matrix.mjs vi`.

The user's request, in short: unique skills per fusion (not two elements' effects with bigger numbers);
a fusion tile keeps shooting normally, and its active skill summons the pet to the front for a while,
where it uses that skill; elemental eggs instead of every 16 getting an element; one single pet or egg per
element; fusing two single pets makes a fusion pet; feeding a single into a fusion, or merging two
fusions, only adds element buffs to the pet the player keeps; the summon unlocks at 1024; at 4096 a pet
becomes the pure form of its element and buffs every other pet; elements unlock by level with a pick of
2 (not 3); clear UI for what is being merged, the choices, the skills, and the skill gained.

## 1. Blocks and classes

`tile.cls` (replaces v1's `{ element, fusion, ultimate }`; `ultimate` is gone):

| Block | `cls` | tier |
|---|---|---|
| plain block | `{}` (never gains an element) | any |
| elemental egg | `{ element }` | < 4 (below 16) |
| single pet | `{ element }` | ≥ 4 |
| fusion egg | `{ element, fusion, buffs }` | < 4 |
| fusion pet | `{ element, fusion, buffs }` | ≥ 4 |
| pure form | the above + `pure: true` | ≥ `V2.pureTier` (4096) |

- `element` is the **main** element (the attack it shoots with); `fusion` the second element.
- `buffs`: `{ [element]: count }`, the elements fed into the fusion (section 3). Always present on a fusion (`{}` when none).
- `pure` is set by the sim whenever a block with an element reaches `V2.pureTier` (merge or boss ×2).
- Fusion keys stay `fusionKey(a, b)` (sorted pair): the 28 fusions, their art and names are unchanged.
- Below 16 nothing shoots (as v1). Plain blocks at 16+ shoot plain pebbles (v1's element-less shot).
- `tile.mats` (v1 material) is no longer used for fusions; S may drop it.

**One single per element.** At any time, an element has at most one single (egg or pet) on the board.
Fusion pets do not count. `singlesOn(tiles)` (classes.js) → Set of elements that have a single on the
board.

## 2. Spawns

- The deck (`run.owned`) starts with `DICE.start` (2) random elements, as v1.
- Each random new block (`grid` `onSpawn` with `info.random`) is an **elemental egg** with probability
  `V2.eggChance`, if the deck has an element not in `singlesOn(tiles)`; the element is a uniform pick
  among those free elements. The roll uses its own rng stream (`seed ^ 0x2545f491`) so other rolls stay put.
  A spawned 16 (top spawn levels) that rolls an element is a single pet at once (emit `classed` stage 1).
- The opening: the two 8s side by side; the first is an elemental egg of the deck's first element (so the
  first swipe hatches a pet), the second is plain.
- Event `{ type: 'egg', tileId, element, tier, x, y }` for every elemental egg spawned.

## 3. Merges (mover slides into stayer, both the same tier)

`mergeClass(child, mover, stayer)` → `{ stage, choice? }` (S defines the exact signature; run.js uses it):

| mover + stayer | result |
|---|---|
| plain + plain | plain |
| plain + X, X + plain | X's cls, buffs kept |
| single A + single A | cannot happen (one single per element); keep A |
| single A + single B | **fusion** of A and B; choice `fusion` (which is main) |
| single + fusion (either order) | the fusion, `buffs[single.element] += 1`; no choice; event `buffed` |
| fusion + fusion | choice `keep`: the kept fusion gains the other's two elements and all its buffs |

- A fusion frees both elements (they are no longer singles), so their eggs can spawn again.
- Eggs follow the same rules below 16 (two different elemental eggs make a fusion egg, with the same choice).
- Hatching: a block with an element that reaches tier 4 (16) emits v1's `classed` stage 1 event (with `info`).
- A fusion made (after its choice) emits `classed` stage 2 (`chosen: true`). Reaching `V2.pureTier`
  emits `classed` stage 3 (the pure form). `describeStage(cls, stage, tier)` keeps giving `info` for the
  announcement ribbon; stage 3 now describes the pure form.

### Choices (`run.pendingChoice`, same queue and pause as v1; `run.choose(i)`)

```js
// a new element (spawn level reached one of V2.unlockLevels): pick 1 of V2.offers (2)
{ kind: 'die', level, offers: [{ element, name, attack, colors, desc, line }] }
// two single pets (or eggs) of different elements merged: which element is the main one
{ kind: 'fusion', tileId, tier,
  parts: [{ element, tier }, { element, tier }],            // mover, stayer: what is being merged
  offers: [{ element, fusion, key, name, color }] }          // 2 offers: mover-main first (the default)
// two fusions merged: which one to keep
{ kind: 'keep', tileId, tier,
  offers: [{ cls, gain }] }                                  // 2 offers: keep the mover's (default), keep the stayer's;
                                                             // cls = the kept fusion after the merge, gain = { element: n } it gains
```

- Until the choice, the merged block holds offer 0. `choose(i)` applies offer i and emits the result
  (`classed` stage 2 for `fusion`; `buffed` for `keep`). `autoChoose` takes offer 0.
- `die` choices come from **levels**, not tiers: when `levelUp` reaches a level in `V2.unlockLevels`, push
  one `die` choice with `V2.offers` offers (fewer if the deck is nearly full; none when it is full).
  `DICE.unlockTiers` is no longer used.
- Event `{ type: 'buffed', tileId, gain: { element: n }, buffs, x, y, tier }`.

## 4. Profiles (`profileFor(tile)`, classes.js)

| Block | attack |
|---|---|
| plain 16+ | `PLAIN_SHOOT` pebble, `dmgMult` 1, physical |
| single pet | v1 element stage: `grownElement(e, growthOf(tier))` (as v1) |
| fusion pet | the **main** element's attack at growth 3, `dmgMult = main.dmg × FUSION_HIT`, plus the second element's on-hit components at boost 1 (v1 used 1.5 for both: gone) |
| pure | as above, `dmgMult × PURE_SELF` (1.6), `p.pure = element` |

Then the element stats (`ELEMENT_STATS`, data.js) from **buffs** (each count × `buff`) and from **aura**
(`tile.aura`, set by the run: the sum of every OTHER pure pet's `pure` value) are applied:

| stat | effect in the profile |
|---|---|
| dmg | `dmgMult × (1 + v)` |
| slow | adds/raises `chill` (`slow + v`, cap 0.65, dur ≥ 1.5) |
| rate | `rate × (1 + v)` |
| poison | adds/raises `poison` (+v stacks per hit: `max ≥ 2 + v`, `dpsPct ≥ 0.1·v`, dur ≥ 3) |
| hp | `p.hpMult = 1 + v` (the run applies it to the block's max health) |
| range | `shoot.reach` / `shoot.radius` × (1 + v) |
| crit | `p.critChance = v` (cap 0.75), `p.critMult = 2` (defense applies it per hit) |
| regen | `p.regen = v` (share of max health per second; the run heals during waves) |

- `hp` and `regen` from an aura apply to **every** block (plain too); the other stats only to pets
  (blocks with an element). Buffs apply to the fusion that holds them.
- `p.summon = key` when the block is a fusion pet at tier ≥ `V2.summonTier` (1024).
- The profile cache key must include tier, cls (with buffs, pure) and `tile.aura`.

## 5. Summon and skills (sim)

- Only fusion pets at `V2.summonTier`+ have a summon (`p.summon`).
- **Charge** lives in the sim (deterministic, replayable): `defense.skillCharge(id)` → 0..1. It fills over
  `V2.summon.chargeS` seconds while foes are alive and the pet is home; it starts empty when the block
  first qualifies. `run.skillCharge(id)`, `run.skillReady(id)` read it.
- `run.castSkill(id)` → `defense.summon(tile)` → true when it starts (ready, not already out).
- While out: `tile.summon = { key, t, dur, phase: 'out'|'act'|'back', x, y, facing, lane }` — x, y the
  pet's world position. It hops out (`V2.summon.hopS`), acts for the rest of `durS`, hops back. The tile
  stays on the board and **keeps shooting from the tile** the whole time (v1's permanent roaming is gone:
  `tile.roam` no longer exists).
- The skill runs from `SKILL_IMPL[key]` (src/sim/skills/index.js): `{ start(ctx), tick(ctx, dt), end(ctx) }`
  through the kit (src/sim/skills/kit.js). Numbers from `FUSION_SKILLS[key]`; damage from the tile's
  profile damage (`ctx.hit`).
- Events: `{ type: 'petOut', tileId, key, x, y, durS }`, `{ type: 'petHome', tileId, gone }` (`gone`: its
  tile left the board while the pet was out). Not `summon`: that name is v1's enemy split event.
  `tile.summon.left` = seconds until the pet is home (for the namecard),
  `{ type: 'skillFx', … }` (section 6), plus the usual `hit` / `kill` / `stun` events.
- Kill rewards a skill can change: `kill` events may carry `coinMult` and `xp` (Bumper Harvest; the run
  pays them) and `loot` as v1.

## 6. What the renderer reads (sim → render contract)

State, read every frame (arrays on `run.defense`, also exposed as `run.zones` etc.):

```js
defense.zones   // [{ id, kind, x, y, r, color, t, dur }]  kind: lava | web | cloud | sand | snow | twister | field
defense.walls   // [{ id, lanes: [l…], y, t, dur, color }]   a barrier across lanes at height y
defense.traps   // [{ id, x, y, r, color, kind: 'flower' }]
defense.minions // [{ id, kind: 'locust' | 'spider', x, y, color }]
defense.tethers // [{ id, tileId, enemyId }]                 from the pet (tile.summon x, y) to a foe
```

Foe status timers (seconds left; 0 = none), in addition to v1's freeze / stun / chill / burn / poison /
root: `vulnT` (takes more damage), `fearT` (runs back), `sleepT` (asleep), `blindT` (bites miss),
`bleedT` (bleeds as it moves), `tauntT` (bites the taunting pet). Block timers: `tile.guardT` (rime
armour), `tile.boostT` (pollen: fires faster), `tile.saved` (Moss Spring used).

Instant effects, events `{ type: 'skillFx', fx, color, … }`:

| fx | fields | look |
|---|---|---|
| ring | x, y, r | an expanding ring |
| burst | x, y, n | a particle burst |
| beam | x, y, x1, y1, w | a straight beam (lance, rail, log, charge) |
| bolt | x, y, x1, y1 | a lightning bolt |
| slam | x, y, r | a ground hit (burrow, stomp) |
| sweep | y, w | a horizontal sweep across all lanes (sickle) |
| text | x, y, key | a short floating word, `key` an i18n key under `fx.*` (U1 adds the words) |

## 7. UI (render and HUD)

**Board (U2).** Plain blocks look like plain stone number blocks (no egg art below 16). Elemental eggs
use the egg art tinted in their element's colour with its badge; a fusion egg shows both colours. Single
pets and fusion pets stay **on their tiles** (no den while home). A summoned pet hops out of its tile to
`tile.summon.{x, y}` and back; the tile shows its empty den while the pet is out. A pure form wears its main
element's halo (v1's halo art) and a soft aura ring. Draw zones, walls, traps, minions, tethers and the new
foe status marks, and every `skillFx` (section 6) through `src/render/skillfx.js`.

**Cards and HUD (U1).**
- `die` choice (2 options): each shows the element's baby pet, name, attack, its buff line ("Fed to a
  fusion: +20% damage"), its pure aura, and the fusions it makes with the deck's elements (portraits +
  skill names).
- `fusion` choice: shows **the two pets being merged** → the fusion pet (portrait, name, pet name), the
  fusion's skill in full (name, header, ACTIVE text), and one button per main element (its attack name and
  line). After choosing, a **result card** shows the skill gained in full detail (LoL-style: name, head
  line, ACTIVE, PASSIVE, unlock at 1024).
- `keep` choice: both fusion pets side by side with their skill and buffs; each option says what the kept
  pet gains.
- `buffed`: a short banner ("Novakit +Fire: +20% damage").
- Tile card (inspect): main element, buffs, the summon skill (locked until 1024, else ready / charging),
  the pure aura, and for a single pet the fusions it can make with the singles on the board.
- Namecards: one per fusion pet at 1024+, charge from `run.skillCharge(id)`; tap → `run.castSkill(id)`;
  while out, the card shows the time left.
- All words in `src/i18n/en.js` and `vi.js` (skill words are already in skills-*.js). Bump
  `SAVE_VERSION` in src/ux/resume.js (v1 saves cannot replay in v2).

## 8. Bot and balance

- `autoChoose` takes offer 0. The bot (`src/autoplay.js`) also casts a summon when `run.skillReady(id)`.
- The balance target for this first pass: bot runs last about as long as v1's (median wave about 24 over
  96 seeds). Tune `V2.eggChance`, `FUSION_HIT` and skill numbers, not enemy health growth (T28 is the
  user's call).

## 9. Who owns what

| Stream | Branch | Owns (only these files) |
|---|---|---|
| Foundation + K (coordinator) | `v2` | `docs/v2/*`, `src/sim/skills/*` (data, kit, index), `src/sim/defense.js`, `src/sim/roam.js`, `src/i18n/index.js`, `src/i18n/skills-*.js`, `tools/skill-matrix.mjs`, tests for those |
| S: rules | `v2-rules` | `src/sim/classes.js`, `src/sim/run.js`, `src/sim/levels.js`, `src/sim/boss-reward.js`, `src/sim/keepsakes.js`, `src/autoplay.js`, `src/config.js` (V2 values may be tuned), their tests |
| U1: cards and HUD | `v2-ui` | `src/ui/*`, `src/main.js`, `src/kv/namecards.js`, `src/ux/*`, `src/i18n/en.js`, `src/i18n/vi.js`, `src/sim/describe.js`, `index.html`, CSS outside `src/kv`, their tests |
| U2: board and pets | `v2-board` | `src/render/*`, `src/art/*`, `src/kv/roam.js`, `src/kv/pets.js`, `src/kv/index.js`, `src/kv/kv.css`, their tests |
| K-skills (later) | `v2-skills-*` | one `src/sim/skills/<group>.js` each, and its test |

Rules for every stream:
- Never edit a file you do not own. If you need a change there, write it down in your report (or message
  the coordinator); stub against this spec meanwhile.
- `npm test` green for your own tests before you report; say which other tests you expect to break and why
  (v1 tests of another stream's files will break until that stream lands).
- Commit on your branch with clear messages. Do not merge into `v2` or `main`; the coordinator integrates.
- Do not touch `main`, other worktrees, PLAN.md, or the Nibble repo. No pushes.
