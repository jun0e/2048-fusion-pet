# v2 — decisions made without asking (to revisit)

The user asked for v2 to be built end to end without check-ins. These are the calls made along the way.
Each one is a single place to change.

## How the user's words were read

| The ask | How v2 reads it | Where |
|---|---|---|
| "once user do a fusion between 2 single elemental pet, they would gain the fusion pet and the respective elemental" | The fusion pet is made, and its two elements are **freed**: their eggs can spawn again. One single per element counts singles only, never fusions. | SPEC 1, 3 |
| "each monster always have 1 main elemental" | A fusion's main element is the player's pick when it is made: 2 options. It decides the fusion's normal attack (shape and rhythm); its unique skill is the same either way. | SPEC 3, 4 |
| "fusion of 2 fusion pet … only add the elemental buff … to the fusion pet that user choose to keep" | A `keep` pick (2 options). The kept fusion gains the other's two elements as buffs, plus every buff the other had. | SPEC 3 |
| "the tile keep shooting like normal after achieve fusion" | A fusion tile shoots its main element's attack, +25% hit, with its second element's effects at base strength (v1 gave both ×1.5). The pet stays on its tile. | SPEC 4 |
| "the active skill spawn the pet … for a duration" | A summon. It charges over 15 s of wave time (only while foes are out). The pet is out for 8 s plus two 0.6 s hops. The tile keeps shooting meanwhile. | config `V2.summon` |
| "the elemental wont show up every 16 tile spawn, but the elemental egg randomly appear in the new tile that spawn" | 22% of new blocks are elemental eggs, while the deck has an element with no single on the board. All other blocks are plain stone blocks that shoot pebbles from 16 on. | config `V2.eggChance` |
| "at 4096 they turn into pure element that buff every other pet" | Any pet (single or fusion) at 4096 becomes the pure form of its main element. It hits ×1.6 and gives every other pet its element's stat; earth and nature reach every block. | data.js `ELEMENT_STATS.pure`, `PURE_SELF` |
| "the unlock of elemental is due to level … choose from 2 option" | Spawn levels 2, 3, 4, 5, 6 and 7 each offer a new element, 1 of 2. The deck still starts with 2 random elements. | config `V2.unlockLevels`, `V2.offers` |
| Merging two different elemental eggs (below 16) | Same rule as pets: a fusion egg, with the same main-element pick. It hatches into the fusion pet at 16. | SPEC 3 |
| The opening | One of the two opening 8s is an egg of the deck's first element, so the first swipe hatches a pet. | SPEC 2 |

## Numbers (first pass; tuned with the bot probe)

| What | Value | Where |
|---|---|---|
| Egg chance | 22% | `V2.eggChance` |
| Summon charge / time out / hop | 15 s / 8 s / 0.6 s | `V2.summon` |
| Summon unlock | 1024 | `V2.summonTier` |
| Pure form | 4096 | `V2.pureTier` |
| Fusion hit | ×1.25 | `FUSION_HIT` |
| Pure hit | ×1.6 | `PURE_SELF` |
| Element buff per feed | fire +20% damage · ice +10% slow · lightning +20% fire rate · poison +1 stack · earth +25% health · wind +15% range · metal +10% crit · nature 1%/s heal | `ELEMENT_STATS.buff` |
| Pure aura | fire +25% · ice +15% · lightning +25% · poison +1 · earth +30% · wind +20% · metal +15% · nature 1.5%/s | `ELEMENT_STATS.pure` |
| The 28 skills | see the matrix tab "Ma trận kỹ năng v2" | `FUSION_SKILLS` |

## Rules of the summon framework

- A merged block keeps the larger charge of its two parts, so merging a charged fusion up does not waste its charge.
- A pet whose tile leaves the board (merged, sold, destroyed) ends its summon at once, and its pieces go with it. The exception: lava pools are made to outlast the pet.
- Control effects (freeze, stun, root, sleep, fear) last half as long on bosses, unless a skill names its own boss time.
- A taunted foe stops where it is and bites the pet. The pet takes no harm, and each bite costs the foe a share of the pet's hit.
- Skills roll the pet's crit chance (metal buff and aura).
