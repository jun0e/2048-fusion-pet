# Slime Legion lanes meet BALL x PIT fusions

Slime Legion keeps its enemies simple on purpose. Each chapter reskins a faction of three to six types (pixies and leaf sprites, soldiers on flying carpets, Vikings, villagers with pitchforks, wyverns). They spawn from one portal per column, travel straight down one of six columns through the player's 6×6 merge board, and damage only the castle when they reach it. Regular enemies differ mainly in HP, count, speed and an occasional physical-resistance flag. The real mechanics sit on bosses, which telegraph their lane, survive into later days, and come with short ability texts: summon on death, −50% physical resistance, an element, or stunning the units they trample. The battle loop is a sequence of "Days". Each Day is a match-3 planning phase on a move budget, then a few seconds of automatic combat, then a 1-of-3 roguelike card. A stage runs 10 Days in chapter 1 and 40 by stage 15, with a boss every 10 Days, and castle HP sits around 1,000–3,000, so one bad Day costs about a quarter of it. BALL x PIT supplies the template for the class system. It has 21 base balls; each does one thing and only gains bigger numbers from level 1 to 3. A Fusion Reactor then either **evolves** a fixed recipe of level-3 balls into a new named mechanic or **fuses** any other pair into a generic ball that carries both abilities at the higher damage value. There are 55 two-ball recipes, which lock 73 of the 210 possible base pairs, plus 14 top-tier recipes. A recipe pair can never be fused generically, and every ultimate built from two evolved balls joins two evolutions that share exactly one base ingredient. For the prototype, this suggests four rules. Allow cross-element merges only at each stage's cap (128 + 128 → 256, 2048 + 2048 → 4096), the way BALL x PIT allows fusion only at level 3. Hand-design all 15 pairs of a six-element palette; 12 of them already have a BALL x PIT precedent. Name each 4096 ultimate after the element its two parents share. Limit a run to four elements, the same cap both games use. One correction to the brief: fire + ice in BALL x PIT is Frozen Flame, a long burn that makes targets take 25% more damage. The "DoT plus slow" behaviour belongs to Venom (poison + freeze), so a blue flame that both burns and slows combines the two recipes.

## Slime Legion fields reskinned lane-walkers and saves mechanics for bosses

There is no wiki, enemy database or official name list for Slime Legion in English, Chinese, Japanese or Korean. The roster below was rebuilt from timestamped gameplay frames and store screenshots, so the enemy names are descriptions, not in-game labels. The framing is the reverse of what a designer might expect. The original store text casts the invaders as heroes raiding a peaceful monster forest, while current marketing calls the player's own units Heroes and the avatar a Lord ([App Store](https://apps.apple.com/us/app/slime-legion/id1664686966)). The mechanics, however, look the same across builds. Enemies come out of a row of glowing portals above the board, one per column, up to six at once ([7lXXa0iLRV4 @373s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=373s)). Before each combat phase, an incoming-enemies banner tints the columns they will use and drops giant sword icons onto those lanes ([cpxxEqd9jOM @431s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=431s)). The enemies then travel straight down toward the castle gate at the bottom ([jC5UyO56XmM @60s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=60s)). Player-unit descriptions confirm the grid-lane model, because they measure everything in slots, rows and columns. Frost hits its whole column, Blackhat hits enemies entering its row, Iron Fist pushes enemies back one slot, and Laplace teleports castle-bound enemies three slots up ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). A reviewer describes monsters streaming down uncovered side columns and ending the stage ([App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews)). **In every sampled frame, fliers and walkers behaved the same way, and no regular enemy fired projectiles, healed, shielded or summoned.**

### Nine sampled maps show one behaviour in many costumes

| Map / faction (build) | Enemy (described; no official names exist) | Movement | Group size and traits observed | Source |
|---|---|---|---|---|
| Ch1 Eternal Forest (2026) | Pink pixie with flower crown and blue butterfly wings | Flies down a column | First enemy in the game; 4 on tutorial Day 1 | [jC5UyO56XmM @57s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=57s) |
| Ch1 Eternal Forest (2026) | White griffin-chick with red antenna | Flies | Swarm of about 15 on tutorial Day 2 | [jC5UyO56XmM @155s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=155s) |
| Ch1 Eternal Forest (2023 and 2026) | Green leaf-hooded sprite with small wings | Flies | Groups of 10–12 mixed with pixies | [cpxxEqd9jOM @433s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=433s); [7lXXa0iLRV4 @322s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=322s) |
| Ch1 Eternal Forest (2026) | Pink axolotl-like fairy | Down a column | In mixed swarms | [7lXXa0iLRV4 @322s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=322s) |
| Ch1 Eternal Forest (2026) | Golden-winged hooded figure with dagger or spear | Flies | Six abreast (one per portal) in several rows on Day 8 | [7lXXa0iLRV4 @375s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=375s) |
| Ch1 Eternal Forest (2026) | Orange flame-flower sprite | Down a column | Seen once, Day 9 | [7lXXa0iLRV4 @425s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=425s) |
| Desert (2023) | Helmeted little soldiers on flying red carpets | Flies | Groups of 10–14 | [Fr4vmW7E_6A @1206s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=1206s) |
| Desert (2023) | Red/orange phoenix-like bird | Flies | — | [Fr4vmW7E_6A @2429s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=2429s) |
| Pink crystal canyon (2023) | White eagle-chick with red wings | Flies | Mixed swarms of 15–20 | [Fr4vmW7E_6A @6009s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=6009s) |
| Pink crystal canyon, also a desert map (2023) | Gold-winged, horned-helmet "angel" knight | Flies | Mixed swarms of 15–20 | [Fr4vmW7E_6A @7226s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=7226s); [@9060s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=9060s) |
| Mushroom plateau (2023) | Blue-armoured soldier | Walks | Hits show shield-icon numbers, which points to physical resistance | [Fr4vmW7E_6A @12006s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=12006s) |
| Mushroom plateau (2023) | Hooded robed monk holding golden ring-cymbals | Floats | Best candidate for a support role, but did nothing except walk down | [Fr4vmW7E_6A @12009s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=12009s) |
| Snow, "Frost Strike" chapter (2023) | Horned-helmet Viking with axe or hammer | Walks | Human "heroes" faction | [Fr4vmW7E_6A @15002s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=15002s) |
| Snow (2023) | Orange-haired axe berserker | Walks | — | [Fr4vmW7E_6A @15002s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=15002s) |
| Snow (2023) | Red-haired warrior woman | Walks | — | [Fr4vmW7E_6A @15002s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=15002s) |
| Pink fairy-tale castle (2023) | Teal wyvern / bat-dragon | Flies | Also on the sea map | [Fr4vmW7E_6A @16202s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=16202s) |
| Pink fairy-tale castle (2023) | Hooded monk | Floats | — | [Fr4vmW7E_6A @19522s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=19522s) |
| Pink fairy-tale castle (2023) | Villager mob: bandana-and-pitchfork villagers, a white-bearded old man, brown bats | Walk / fly | Red skull map-pins float over many of them (cause unknown, possibly a player debuff) | [Fr4vmW7E_6A @27002s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=27002s) |
| Viking longship / sea (2023) | Red dragon, alongside teal wyverns and monks | Flies | — | [Fr4vmW7E_6A @21006s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=21006s) |
| Egyptian temple (2023) | Dark-skinned soldier in headdress | Walks | Groups of about 8 | [Fr4vmW7E_6A @39602s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=39602s) |
| Store screenshots (current) | Winged lion-griffin in gold helmet, pink boar with leaves, dark-purple dragon, ornate purple-green beast, blue bat-eared yeti, orange dragon, leaf-crowned eagle, blue bird in a witch hat on a broomstick | Not observed in motion | Skeleton bones as the death effect; new map themes include Mayan temple, Chinese palace, purple Arabian palace | [Screenshot "Heavy Fighting"](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fd/f9/71/fdf971d2-cfb3-93a0-714f-39d9c0e8f434/_U4e94_U56fe3-1242x2688-_U82f1_U6587.png/1242x2688bb.jpg); [Screenshot "Daily Challenge"](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/46/ef/58/46ef5856-94c6-6dbe-081a-0d215b4eaecb/_U4e94_U56fe5-1242x2688-_U82f1_U6587.png/1242x2688bb.jpg); [App Store](https://apps.apple.com/us/app/slime-legion/id1664686966) |

So the threat is HP × count × speed, plus whether a column is left uncovered. In chapter 1, enemies die to hits of roughly 46–308, within one to three hits ([7lXXa0iLRV4 @373s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=373s)). Mid-2023 chapters show hits of 98–457, the Viking map 322–926, and a Champion boss run reaches 334.01M total damage ([Fr4vmW7E_6A @12006s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=12006s); [@15003s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=15003s); [acMftC7F7L4 @601s](https://www.youtube.com/watch?v=acMftC7F7L4&t=601s)). Wave size grows from **4 pixies on tutorial Day 1** to about 15 griffin-chicks on Day 2, 12 or more in six-wide rows by chapter 1 Day 8, and **15–20 mixed fliers per wave** on mid-2023 maps ([jC5UyO56XmM @57s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=57s); [@155s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=155s); [Fr4vmW7E_6A @6009s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=6009s)). The only defensive trait seen on regular enemies is a damage-type resistance. Hits on blue-armoured soldiers show the same shield-icon numbers that mark the kite-ninja boss's physical resistance ([9rhkC1kh2Dg @604s](https://www.youtube.com/watch?v=9rhkC1kh2Dg&t=604s)). Enemies can *suffer* far more than they *do*. The player roster applies slow, freeze, root, stun, fear, burn, poison, bleed, corruption, vulnerability, petrify, charm, a one-slot knockback, a three-slot teleport backward, and a weakness that halves the damage an enemy does to the castle on impact ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). One caveat: combat phases last only seconds, and the frames cover about ten maps out of 270 story chapters, so rare enemy abilities could have been missed.

### Bosses telegraph a lane, outlive their day and carry resistances

Boss days carry a skull on the day bar. In the current chapter 1 the skulls fall on Day 5 and Day 10, and a 2026 reviewer reports a boss every 10 days in later stages ([jC5UyO56XmM @63s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=63s); [App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews)). During planning, a red skull BOSS marker hovers over a tinted band one or two columns wide; when combat starts, swords slam onto that lane ([cpxxEqd9jOM @455s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=455s); [7lXXa0iLRV4 @446s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=446s)). The boss walks that lane with a large HP bar topped by status icons and a speech-bubble taunt ([jC5UyO56XmM @546s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=546s)). **A boss that survives the day's combat stays on the board.** In one run its marker was still over its lane in the next planning phase after Day 5, and another frame shows it frozen in ice at the top of its lane ([jC5UyO56XmM @555s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=555s); [@712s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=712s)). Intro cards describe abilities in a line or two, and nearly all of the enemy side's mechanical variety lives there. No separate elite tier and no multi-phase boss appeared. Bosses are explicitly immune to Cannibal Flower's devour, and the tier list recommends castle-damage reduction and single-target stuns as boss tools ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)).

| Boss | Where seen | Intro card / abilities | Observed behaviour | Source |
|---|---|---|---|---|
| Elf ruler (pink, large blue butterfly wings) | Ch1 Eternal Forest; Day 5 and Day 10 in 2026, also in the 2023 build | Introduced as the ancient ruler of the elves; taunts the player as a monster | Walks a telegraphed lane; survived Day 5 and stayed on the board; seen encased in ice | [cpxxEqd9jOM @461s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=461s); [7lXXa0iLRV4 @214s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=214s); [@503s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=503s); [jC5UyO56XmM @555s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=555s) |
| Kite ninja | Fareast Kingdom chapter (2023) | Ninja tied to a kite; summons minions on death; physical resistance, shown with a −50% icon | Hits on it show shield-icon damage numbers | [9rhkC1kh2Dg @604s](https://www.youtube.com/watch?v=9rhkC1kh2Dg&t=604s) |
| Earth Dragon Rider (winged-helmet knight on a black dragon) | "Here Comes The Champion" boss mode (Mar 2026) | Stuns the monsters it crushes; card lists fire as its resistance; uploader calls it the fire-attribute boss | Two copies in two boss lanes; lane moved from column 2 to column 5; beaten by a Nemo (water) and Totem lineup | [acMftC7F7L4 @0s](https://www.youtube.com/watch?v=acMftC7F7L4&t=0s); [@578s](https://www.youtube.com/watch?v=acMftC7F7L4&t=578s); [@140s](https://www.youtube.com/watch?v=acMftC7F7L4&t=140s); [video description](https://www.youtube.com/watch?v=acMftC7F7L4) |
| Unidentified double boss | Daily Challenge, Day 30 (Jan 2026) | — | Two BOSS columns telegraphed at once | [4UooJPegibo @262s](https://www.youtube.com/watch?v=4UooJPegibo&t=262s) |

Elements in Slime Legion work mostly as buff tags on the player side, not as a counter chart. Unit cards carry element icons, and a rotating daily blessing boosts one element (earth attack +18% in a store screenshot) ([App Store](https://apps.apple.com/us/app/slime-legion/id1664686966)). Fire, water, earth and light units exist. Drogon is powered up by other fire allies, and one upgrade lets attacks apply effects based on the attacker's type ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). Bosses carry an element, but no full advantage table, no element on regular enemies, and no magic-resistance counterpart to physical resistance could be confirmed. Per-boss castle damage, and whether bosses attack units beyond the crush-stun, are also unknown.

## Each Day is a move-budgeted merge puzzle followed by seconds of auto-combat

The defining design choice is that **the merge board is the battlefield**. From top to bottom, the portrait screen holds the HUD, the enemy approach area, the merge grid, the castle wall with the player's Lord standing on it, and the castle HP bar ([4UooJPegibo @6s](https://www.youtube.com/watch?v=4UooJPegibo&t=6s); [App Store](https://apps.apple.com/us/app/slime-legion/id1664686966)). The grid is 6 columns by 6 rows in both 2023 and 2026 footage ([dz8KispwIB0](https://www.youtube.com/watch?v=dz8KispwIB0)). One Champion-mode frame was read as 7 wide, and one skill card adds a row ([acMftC7F7L4 @200s](https://www.youtube.com/watch?v=acMftC7F7L4&t=200s); [Fr4vmW7E_6A @32400s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=32400s)). The six columns are the only lanes. Monster tiles never move during combat. Four side pedestals hold support units, and the victory screen separates a 4-monster main lineup from a 2-monster support lineup ([4UooJPegibo @280s](https://www.youtube.com/watch?v=4UooJPegibo&t=280s)). Range is measured in slots: Undine hits anything within two slots, Chubby reaches 1.5 slots, and Death sweeps its row. **A unit's row and column therefore decide what it can hit** ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). The only evidence of enemies touching units is the Earth Dragon Rider's crush-stun, which means bosses walk over tiles ([acMftC7F7L4 @0s](https://www.youtube.com/watch?v=acMftC7F7L4&t=0s)).

Units are never bought or placed. The board starts full and refills with item tiles for the four lineup monsters (bats become Dracula, sticks become Totems, scythes become a skeleton) plus coins. Swapping two adjacent tiles costs one move. **Three or more identical tiles in a straight line merge into one tile of the next tier**: three items make a level-1 monster, and three matching monsters make the next tier ([4UooJPegibo @55s](https://www.youtube.com/watch?v=4UooJPegibo&t=55s); [@170s](https://www.youtube.com/watch?v=4UooJPegibo&t=170s); [Appliv](https://app-liv.jp/5346467/)). Items do nothing in combat; only monster tiles lit up and attacked ([4UooJPegibo @103s](https://www.youtube.com/watch?v=4UooJPegibo&t=103s)). That gives the player a reason to merge before each wave. Merges award +1 to +3 bonus moves, one card makes a match-5 add an extra level, and sliding a tile off the board discards it ([acMftC7F7L4 @27s](https://www.youtube.com/watch?v=acMftC7F7L4&t=27s); [4UooJPegibo @25s](https://www.youtube.com/watch?v=4UooJPegibo&t=25s); [dz8KispwIB0 @2s](https://www.youtube.com/watch?v=dz8KispwIB0&t=2s)). Players also pre-stack next-tier tiles so that one merge chains into the next ([App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews)).

Each Day opens with a move budget, typically 10–15 at the start and stacking up to 44 when unspent. Combat begins when moves hit zero or the player taps an early-start button ([4UooJPegibo @1s](https://www.youtube.com/watch?v=4UooJPegibo&t=1s); [@200s](https://www.youtube.com/watch?v=4UooJPegibo&t=200s); [jC5UyO56XmM @50s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=50s)). The fight then plays out automatically. In chapter 1 each wave lasts **about 3–12 seconds** at ×1 to ×3 speed ([7lXXa0iLRV4](https://www.youtube.com/watch?v=7lXXa0iLRV4); [4UooJPegibo](https://www.youtube.com/watch?v=4UooJPegibo)). There is no gold per kill and no summoning mana; moves are the economy. A second meter, Lord energy (0–100), rises about one point per move and fills during combat. It pays for the Lord's active skills, which cost 50 or 100 ([4UooJPegibo @6s](https://www.youtube.com/watch?v=4UooJPegibo&t=6s)).

Roguelike picks are three-card offers. They come out of chests, which a three-coin match creates, and also appear between and during Days. A reroll costs 30 gems or an ad ([4UooJPegibo @23s](https://www.youtube.com/watch?v=4UooJPegibo&t=23s); [acMftC7F7L4 @14s](https://www.youtube.com/watch?v=acMftC7F7L4&t=14s)). The cards fall into five families:

| Card family | Examples |
|---|---|
| Global stats | Damage +4% to +17%, attack speed +10%, enemy speed −15% to −20% |
| Per-monster upgrades | Nemo's homing water weapons, Dracula's guardian bats |
| Economy | +2 to +8 moves |
| Castle | +200 max HP; each Totem restores 5 HP at the end of a day |
| Board rewrites | Turn every bat on the field into Dracula (×11 in one offer); turn every stick into a Totem |

Sources for the card examples: [4UooJPegibo @1s](https://www.youtube.com/watch?v=4UooJPegibo&t=1s); [@105s](https://www.youtube.com/watch?v=4UooJPegibo&t=105s); [7lXXa0iLRV4 @10s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=10s); [cpxxEqd9jOM @400s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=400s); [jC5UyO56XmM @556s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=556s). The board-rewrite cards are the most distinctive. Each card carries a red sword or blue shield badge counting "x/6", and only the picked category's count goes up. That most likely means a cap of six picks per category ([acMftC7F7L4 @101s](https://www.youtube.com/watch?v=acMftC7F7L4&t=101s)).

| Context | Days per stage | Boss cadence | Starting castle HP | Enemies per wave | Source |
|---|---|---|---|---|---|
| Ch1 Eternal Forest, current build | 10 | Skull on Day 5, flag on Day 10; elf ruler appears on both | 1,000 (tutorial); 1,200 in a ch1 run | 4 → ~15 → 12+ | [jC5UyO56XmM @63s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=63s); [7lXXa0iLRV4 @320s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=320s) |
| Early chapters, 2023 build | 20; some stages run to Day 30 (a "Stage 14 Day 29-30" video) | Skull days on the bar | About 1,200–1,340 | ~15–20 | [cpxxEqd9jOM @700s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=700s); [cpxxEqd9jOM @463s](https://www.youtube.com/watch?v=cpxxEqd9jOM&t=463s); [V5b_5n4gqaU](https://www.youtube.com/watch?v=V5b_5n4gqaU) |
| Daily Challenge, Jan 2026 | 30 | Two boss columns on Day 30 | 2,219 (2,619 after a card) | — | [4UooJPegibo @262s](https://www.youtube.com/watch?v=4UooJPegibo&t=262s); [@280s](https://www.youtube.com/watch?v=4UooJPegibo&t=280s) |
| Stage 15, current build (player review) | 40 | Every 10 days | — | — | [App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews) |
| "Here Comes The Champion", Mar 2026 | Damage race on a 3:00 combat timer; Days 14–18 all boss days | Two simultaneous boss lanes | 3,039 | Boss-focused; 334.01M total damage | [acMftC7F7L4 @5s](https://www.youtube.com/watch?v=acMftC7F7L4&t=5s); [@520s](https://www.youtube.com/watch?v=acMftC7F7L4&t=520s); [@601s](https://www.youtube.com/watch?v=acMftC7F7L4&t=601s) |

Castle HP is the only loss condition, and it carries over between Days. In the tutorial it fell 1,000 → 360 → 200. In a 2026 chapter-1 run it went from 1,200 to 880 by Day 7 and 560 by Day 8 ([jC5UyO56XmM @120s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=120s); [7lXXa0iLRV4 @374s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=374s)). That is **about 320 HP, or 27%, per leaky Day**, so three or four bad Days end a stage. Healing comes only from units and cards (Totems, and the Totem card that restores HP each day). Mitigation comes from Protector's castle shields and from Siren's and Amy's weakness, which halves impact damage ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). Story content now runs to level 270 and Otherworld to 60, alongside PvP, a guild mode and the Daily Challenge ([App Store](https://apps.apple.com/us/app/slime-legion/id1664686966)). The loudest complaints are late stages that drag and difficulty walls such as chapter 14 ([App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews)).

## BALL x PIT gives each base ball one verb and grows only its numbers

This section covers BALL x PIT up to the Naturalist Update of 6 August 2026. The paid Risen Ballbylon expansion (12 November 2026, 24 new balls) is not covered ([Steam: Risen Ballbylon](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1844115010499209)). There are **21 base balls**: 18 at launch, counting Horizontal and Vertical Laser separately, plus Stone (Regal), Time (Shadow) and Flesh (Naturalist). Every character starts the run with an assigned base ball, and any special ball can reach level 3 within a run ([Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls)). Plain white baby balls have no ability; spawner fusions can make baby balls that inherit abilities. The wiki lists the same on-hit multiplier, Strength ×3.5–6.5, for every base ball at every level. That contradicts a stub Damage page claiming +33% per level, so neither figure is confirmed ([Wiki: Damage](https://ballxpit.wiki.gg/wiki/Damage)). No source mentions a ball called "Voltron".

| Ball | Added | Archetype | Effect at Lv1 / Lv2 / Lv3 |
|---|---|---|---|
| [Bleed](https://ballxpit.wiki.gg/wiki/Bleed) | Launch | Amplifier | 2/4/4 bleed stacks per hit; every later ball hit deals +1 damage per stack; cap 8/11/14 |
| [Brood Mother](https://ballxpit.wiki.gg/wiki/Brood_Mother) | Launch | Spawner | 25/35/45% chance per hit to spawn a baby ball |
| [Burn](https://ballxpit.wiki.gg/wiki/Burn) | Launch | DoT (short, hard) | 1 stack per hit lasting 3/3/5 s, cap 3/3/5; 4–8 / 7–11 / 7–11 damage per stack per second |
| [Cell](https://ballxpit.wiki.gg/wiki/Cell) | Launch | Spawner | Splits into a clone on hit, 2/3/4 times |
| [Charm](https://ballxpit.wiki.gg/wiki/Charm) | Launch | Proc control | 4/4/5% chance to charm for 5/7/7 s; charmed enemies walk back up the board and attack other enemies |
| [Dark](https://ballxpit.wiki.gg/wiki/Dark) | Launch | Burst, self-destruct | 3.0/4.0/5.0× damage, destroyed on hit, 3 s cooldown |
| [Earthquake](https://ballxpit.wiki.gg/wiki/Earthquake) | Launch | Area square | 5–13 / 9–17 / 9–17 to units in a 3×3 / 3×3 / 4×4 tile square |
| [Egg Sac](https://ballxpit.wiki.gg/wiki/Egg_Sac) | Launch | Spawner, self-destruct | Bursts into 2–4 / 2–5 / 3–5 baby balls on hit; 3 s cooldown |
| [Flesh](https://ballxpit.wiki.gg/wiki/Flesh) | Naturalist (2026-08-06) | Movement | +25/35/40% speed per bounce; starts at half damage per the developer |
| [Freeze](https://ballxpit.wiki.gg/wiki/Freeze) | Launch | Proc control + amplifier | 4/7/7% chance to freeze for 5/5/8 s; frozen enemies take +25% damage |
| [Ghost](https://ballxpit.wiki.gg/wiki/Ghost) | Launch | Movement | Passes through enemies |
| [Iron](https://ballxpit.wiki.gg/wiki/Iron) | Launch | Movement | Double damage, moves 40/40/30% slower |
| [Laser (Horizontal)](https://ballxpit.wiki.gg/wiki/Laser_%28Horizontal%29) | Launch | Line attack | 9–18 / 11–26 / 13–34 to every enemy in the same row |
| [Laser (Vertical)](https://ballxpit.wiki.gg/wiki/Laser_%28Vertical%29) | Launch | Line attack | 9–18 / 11–26 / 13–34 to every enemy in the same column |
| [Light](https://ballxpit.wiki.gg/wiki/Light) | Launch | Always-on control | Blinds for 3/5/7 s; blinded enemies miss 50% of attacks |
| [Lightning](https://ballxpit.wiki.gg/wiki/Lightning) | Launch | Chain | 1–20 / 1–30 / 1–30 to up to 3/3/5 nearby enemies |
| [Poison](https://ballxpit.wiki.gg/wiki/Poison) | Launch | DoT (long, stacking) | 1 stack per hit, cap 5/5/8, lasting 6/6/9 s; 1–4 / 2–5 / 2–5 per stack per second |
| [Stone](https://ballxpit.wiki.gg/wiki/Stone) | Regal (2026-01-26) | Decaying hit | Starts at 300/350/400% damage, loses 40/35/30% per hit, floor 50% |
| [Time](https://ballxpit.wiki.gg/wiki/Time) | Shadow (2026-04-27) | Zone, self-destruct | Bursts into a snare lasting 2.0/2.5/3.0 s that freezes enemies inside (the overview page's "20 s" is likely a typo) |
| [Vampire](https://ballxpit.wiki.gg/wiki/Vampire) | Launch | Sustain | 4.5/6/6% chance per hit to heal 1/1/2 |
| [Wind](https://ballxpit.wiki.gg/wiki/Wind) | Launch | Always-on control + pierce | Passes through enemies; slows by 30/30/45% for 5/8/8 s; deals 25% less damage |

Levels almost never add a mechanic. They push one or two numbers: Burn's cap and duration rise from 3 to 5, Freeze's chance from 4% to 7% and its duration from 5 s to 8 s. A building, the Evolution Chamber, makes new balls start at level 2 ([Wiki: Evolution Chamber](https://ballxpit.wiki.gg/wiki/Evolution_Chamber_%28Building%29)). Several base procs are **deliberately weak alone**, such as a 4% freeze or a 4.5% heal, which leaves room for evolution to make them reliable. Only about half the roster describes a payload, meaning what happens to the enemy. The rest are movement rules (Ghost, Iron, Stone, Flesh, Dark) or spawners (Cell, Egg Sac, Brood Mother). That distinction matters for a turret game, where the turret doesn't move.

Statuses combine through four mechanisms:

| Mechanism | How it works | Examples |
|---|---|---|
| Separate stacking DoTs | Each status has its own cap and duration | Burn, Poison, Frostburn, Venom, Disease |
| Amplifiers | Raise all damage the target takes from every other ball | Freeze, Frostburn, Radiation |
| Stack-and-cash-out | Stacks build visibly, then pay out in a burst | Hemorrhage, Vampire Lord, Curse, Overgrowth |
| Spread | Copies a status onto more enemies | Contagion, AoE that applies a fused partner's status, spawned balls that inherit abilities |

Statuses cannot trigger other abilities. AoE triggers on damage, so Nuclear Bomb's radiation can apply a fused partner's status, and a November 2025 patch made AoE apply Lightning Rod in fusions ([Wiki: Fusion Mechanics](https://ballxpit.wiki.gg/wiki/Fusion_Mechanics); [Steam: November patch](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1815580768233693)). Cash-outs consume stacks, so Hemorrhage and Vampire Lord compete for the same bleed, a deliberate anti-synergy. How amplifiers combine with each other (additively or multiplicatively), and whether they apply to DoT ticks, is undocumented.

| Status | Applied by | Rule and numbers (Lv1 / Lv2 / Lv3) |
|---|---|---|
| Burn | Burn; Inferno, Sun, Magma, Fireworks, Brimstone, Satan, Elemental | Each source sets its own cap: the Burn ball allows 3–5 stacks lasting 3–5 s; Sun cap 5 at 6–12 rising to 9–15; Satan cap 5 at 10–20 rising to 15–30 per stack per second |
| Frostburn | Frozen Flame | 1 stack per hit, 20/20/30 s, cap 4/4/5, 8–12 / 10–16 / 10–16 per stack per second, **+25% damage taken** |
| Darkflame | Banished Flame | 1 stack per hit, 2 s, cap 6/6/8, 1–30 / 1–35 / 1–35 per stack per second; 1–100 burst when it expires |
| Poison | Poison; Noxious, Swamp, Brimstone | Poison ball: cap 5/5/8, 6/6/9 s; Noxious applies 3 stacks in a 2-tile radius; Swamp cap 8 |
| Venom | Venom | Cap 8/8/12, 3–6 / 4–7 / 4–7 per stack per second, slows |
| Disease | Virus | Cap 8, 6 s, 3–6 / 5–9 / 5–9 per second; each second, 15/15/25% chance to jump to undiseased neighbours |
| Bleed | Bleed; Hemorrhage, Leech, Sacrifice, Vampire Lord | +1 damage per stack on every ball hit; caps 8–14 (Bleed), 15–20 (Sacrifice), 24–48 (Leech) |
| Bleed cash-out | Hemorrhage; Vampire Lord | Hemorrhage: at 12+ stacks, consumes all for 20/20/30% of current HP. Vampire Lord: at 10/10/9+ stacks, consumes all to heal 1 |
| Freeze | Freeze; Blizzard, Glacier, Wraith, Freeze Ray, Timestop, Time | **+25% damage taken.** Freeze ball 4–7% chance; Wraith freezes everything it passes; Blizzard 2-tile radius; Timestop freezes the whole field for 5–6 s on a 30/20/20 s cooldown |
| Slow | Wind; Swamp, Venom, Elemental | Wind −30/30/45% for 5/8/8 s; Swamp −50% for 7 s |
| Blind | Light; Sun, Flash, Laser Beam, Sandstorm | 3/5/7 s (Light ball); 50% miss chance |
| Radiation | Radiation Beam, Nuclear Bomb, X Ray | **+10% damage taken per stack**, cap 5; lasts 15 s from Radiation Beam, indefinitely from Nuclear Bomb (15% per stack at Lv3) |
| Curse | Phantom, Incubus, Sacrifice, Banshee | Delayed burst after 5 hits (6 for Banshee): Phantom 100–200 rising to 200–300; Banshee 150–300 rising to 250–400 |
| Overgrowth | Overgrowth | At 3/3/2 stacks, deals 150–200 / 180–250 / 180–250 to a 3×3 area |
| Charm / Berserk / Lovestruck | Charm, Incubus, Succubus / Berserk, Satan / Lovestruck | Charmed enemies fight other enemies; Berserk 30/30/40% chance, 15–24 rising to 23–32 per second to adjacent enemies; Lovestruck enemies have a 50% chance to heal you 5/8/8 when they attack |
| Execute | Black Hole, Reaper, Tumor | Black Hole kills the first non-boss it hits; Reaper 10/15/15% kill chance on impact; Tumor kills non-bosses after 40/35/30 s |

Sources: individual ball pages linked in the recipe tables below and [Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls).

## Recipes override fusion, and every ultimate shares a parent

### The Fusion Reactor offers three choices, and recipes win ties

Both upgrade paths go through the **Fusion Reactor**, an item enemies sometimes drop ([Wiki: Fusion Reactor](https://ballxpit.wiki.gg/wiki/Fusion_Reactor)). Picking it up offers up to three options:

| Option | Requirement | Result |
|---|---|---|
| **Fission** | Always available | Random level-ups; gold once everything is level 3 |
| **Fusion** | Two *unfused* level-3 balls | One "A X B" ball with both abilities at the higher damage value of the two; frees a slot |
| **Evolution** | Every level-3 ingredient of a specific recipe | A new named ball with its own mechanic; frees a slot |

Sources: [Wiki: Fusion Reactor](https://ballxpit.wiki.gg/wiki/Fusion_Reactor); [Wiki: Fusion Mechanics](https://ballxpit.wiki.gg/wiki/Fusion_Mechanics); [Wiki: Damage](https://ballxpit.wiki.gg/wiki/Damage). The rule that decides between them is the important one: **if two balls share an evolution recipe, they can only be evolved, never fused.** The exception is pairs whose only shared recipe needs three or more balls, such as Nosferatu and Elemental ([Wiki: Fusion Mechanics](https://ballxpit.wiki.gg/wiki/Fusion_Mechanics)). By my count from the recipe table, **73 of the 210 possible base-ball pairs are locked to a recipe**. The wiki counts 7,836–7,921 functionally distinct generic fusions across 90 special balls. A fused ball's name follows the order in which the balls were acquired, but order never changes its stats; one guide claims the first ball sets the firing behaviour, which contradicts the wiki. Evolved balls can still be fused or evolved again, so a late run can field a "Nosferatu X Holy Laser", effectively a fourth layer. No source confirms whether a fused ball can be an evolution ingredient ([Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls)). A player normally holds at most four balls ([Wiki: Module:BallData](https://ballxpit.wiki.gg/wiki/Module:BallData)). Two Naturalist characters change that: one doubles the ball slots to eight, the other cuts them to two in exchange for more passives ([Steam: Naturalist Update](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1840310314342323)). Patches through Naturalist only added balls and alternative recipes; none removed a recipe ([Wiki: Game Updates](https://ballxpit.wiki.gg/wiki/Game_Updates)). Passives use the same system. Two or four level-3 passives evolve into one, and Deadeye's Impaler is itself an evolution of evolved passives, so the three-depth structure applies beyond balls ([Wiki: Passives](https://ballxpit.wiki.gg/wiki/Passives)).

### Fifty-five two-ball evolutions turn a payload into a delivery system

The 55 base-plus-base evolutions follow a consistent grammar: **the element decides what the effect does; the partner decides how it is delivered.** Burn shows this clearly:

| Burn + partner | Evolution | Delivery |
|---|---|---|
| Iron | Bomb | Explosion |
| Wind | Inferno | 2-tile aura |
| Light | Sun | Screen-wide blind and burn |
| Earthquake | Magma | Lava pools |
| Egg Sac | Fireworks | Homing projectiles |
| Freeze | Frozen Flame | Long burn that also raises damage taken |
| Dark | Banished Flame | Burn with a burst when it expires |
| Poison or Stone | Brimstone | Dual-DoT aura |

Evolution also turns unreliable procs into reliable ones. Freeze's 4–7% chance becomes Wraith's guaranteed pass-through freeze, Blizzard's 2-tile freeze and Timestop's whole-field freeze. Charm's 4% becomes Berserk's 30–40%.

Raw damage moves far less. Going by the wiki's infobox multipliers, **40 of the 55 sit at Strength ×3.6–6.8**, only about 4% above the base 3.5–6.5 at the midpoint. Another 13 sit at 4.2–8.0, Lovestruck at 4.8–9.2 and Radiation Beam at 5.4–10.4. That spread matches recipe count exactly. Every single-recipe evolution is 3.6–6.8, every two-recipe one is 4.2–8.0, Lovestruck has three recipes, and Radiation Beam has four ingredient combinations. The wiki numbers may therefore be generated rather than hand-tuned. Combined with the stub Damage page's unverified claim of +233% per evolution, the multipliers are weak evidence. The safer reading is that **an evolution's power comes mainly from its new mechanic**.

| Evolution | Recipe (order irrelevant) | Added | Multiplier | Effect at Lv1 / Lv2 / Lv3 |
|---|---|---|---|---|
| [Assassin](https://ballxpit.wiki.gg/wiki/Assassin) | Iron + Ghost, or Iron + Dark | Launch | 4.2–8.0 | Passes through an enemy's front but not its back; backstabs +30/40/50% |
| [Banished Flame](https://ballxpit.wiki.gg/wiki/Banished_Flame) | Dark + Burn | Regal | 3.6–6.8 | Darkflame: 1 stack per hit for 2 s, cap 6/6/8, 1–30 / 1–35 / 1–35 per stack per second; 1–100 burst on expiry |
| [Berserk](https://ballxpit.wiki.gg/wiki/Berserk) | Charm + Bleed, or Charm + Burn | Launch | 4.2–8.0 | 30/30/40% chance per hit to berserk for 6/9/9 s; berserk enemies deal 15–24 / 19–28 / 23–32 per second to adjacent enemies |
| [Blizzard](https://ballxpit.wiki.gg/wiki/Blizzard) | Freeze + Wind, or Freeze + Lightning | Launch | 4.2–8.0 | Freezes everything within 2 tiles for 0.8/1.3/1.3 s, dealing 1–50 / 1–50 / 1–70 |
| [Bomb](https://ballxpit.wiki.gg/wiki/Bomb) | Burn + Iron | Launch | 3.6–6.8 | Self-destructs on hit for 150–300 / 200–400 / 200–400 area damage; 3 s cooldown |
| [Brimstone](https://ballxpit.wiki.gg/wiki/Brimstone) | Burn + Poison, or Burn + Stone | Regal | 4.2–8.0 | Every second, 1 burn and 1 poison stack to everything within 2 tiles (cap 4); burn 1–4 / 1–7 / 1–7, poison 2–3 / 2–3 / 3–5 per stack per second |
| [Catapult](https://ballxpit.wiki.gg/wiki/Catapult) | Stone + Egg Sac | Regal | 3.6–6.8 | Fires 3–5 / 3–6 / 4–6 single-use stone baby balls every 1.5 s |
| [Drill](https://ballxpit.wiki.gg/wiki/Drill) | Earthquake + Iron | Naturalist | 3.6–6.8 | Pierces with +50/75/100% damage until it reaches the back of the field |
| [Erosion](https://ballxpit.wiki.gg/wiki/Erosion) | Time + Wind | Shadow | 3.6–6.8 | Pierces; adds 3/4/5% of the enemy's current HP as bonus damage |
| [Fireworks](https://ballxpit.wiki.gg/wiki/Fireworks) | Burn + Egg Sac | Regal | 3.6–6.8 | Bursts into 3–6 / 3–6 / 4–8 homing fireworks dealing 20–30 plus a burn stack (7–11 / 10–14 / 10–14 per stack per second) |
| [Flash](https://ballxpit.wiki.gg/wiki/Flash) | Lightning + Light | Launch | 3.6–6.8 | On hit, 1–3 / 1–3 / 2–4 to every enemy on screen and blind for 2/3/3 s |
| [Flesh Mound](https://ballxpit.wiki.gg/wiki/Flesh_Mound) | Brood Mother + Flesh | Naturalist | 3.6–6.8 | Emits a fleshy baby ball in a random direction every 1.0/0.8/0.6 s |
| [Flicker](https://ballxpit.wiki.gg/wiki/Flicker) | Light + Dark | Launch | 3.6–6.8 | 1–7 / 2–10 / 2–10 to every enemy on screen every 1.4/1.4/1.2 s |
| [Freeze Ray](https://ballxpit.wiki.gg/wiki/Freeze_Ray) | Freeze + either Laser | Launch | 4.2–8.0 | Ray on hit dealing 20–50 / 25–65 / 25–65 along its path, 10% chance to freeze for 10/10/13 s |
| [Frozen Flame](https://ballxpit.wiki.gg/wiki/Frozen_Flame) | Burn + Freeze | Launch | 3.6–6.8 | Frostburn: 1 stack per hit for 20/20/30 s, cap 4/4/5, 8–12 / 10–16 / 10–16 per stack per second, +25% damage taken |
| [Glacier](https://ballxpit.wiki.gg/wiki/Glacier) | Freeze + Earthquake, or Freeze + Stone | Launch (Stone variant Regal) | 4.2–8.0 | Spikes over time deal 15–30 / 25–40 / 25–40 and freeze for 2/2/3 s; ball and spikes deal 6–12 to nearby units |
| [Heart Swallower](https://ballxpit.wiki.gg/wiki/Heart_Swallower) | Bleed + Ghost | Shadow | 3.6–6.8 | 40/55/70% chance to steal 1 HP (once per enemy) and cut enemy attack by 20/30/40% |
| [Hemorrhage](https://ballxpit.wiki.gg/wiki/Hemorrhage) | Bleed + Iron, or Bleed + Flesh | Launch (Flesh variant Naturalist) | 4.2–8.0 | 3/4/4 bleed stacks per hit; at 12+ stacks consumes all for 20/20/30% of current HP |
| [Holy Laser](https://ballxpit.wiki.gg/wiki/Holy_Laser) | Laser (Horizontal) + Laser (Vertical) | Launch | 3.6–6.8 | 24–36 / 27–48 / 30–60 to every enemy in the same row and column |
| [Incubus](https://ballxpit.wiki.gg/wiki/Incubus) | Charm + Dark | Launch | 3.6–6.8 | 4/4/5% chance to charm for 9 s; charmed enemies curse neighbours (100–200 / 150–250 / 150–250 after 5 hits) |
| [Inferno](https://ballxpit.wiki.gg/wiki/Inferno) | Burn + Wind, or Burn + Time | Launch (Time variant Shadow) | 4.2–8.0 | Every second, 1 burn stack to everything within 2 tiles; burn lasts 6/10/10 s at 3–7 / 3–7 / 6–10 per stack per second |
| [Landslide](https://ballxpit.wiki.gg/wiki/Landslide) | Stone + Earthquake | Regal | 3.6–6.8 | Self-destructs into a 5 s landslide dealing 20–30 / 25–35 / 30–40 per second within 2 tiles |
| [Laser Beam](https://ballxpit.wiki.gg/wiki/Laser_Beam) | Light + either Laser | Launch | 4.2–8.0 | Beam on hit dealing 30–42 / 38–54 / 46–66 and blinding for 8 s |
| [Leech](https://ballxpit.wiki.gg/wiki/Leech) | Brood Mother + Bleed | Launch | 3.6–6.8 | Attaches a leech that adds 2/3/3 bleed stacks per second (cap 24/36/48) |
| [Lightning Bug](https://ballxpit.wiki.gg/wiki/Lightning_Bug) | Lightning + Brood Mother | Naturalist | 3.6–6.8 | Spawns a bug per hit; each bug deals 1–80 / 1–80 / 1–100 to up to 3/4/4 enemies |
| [Lightning Rod](https://ballxpit.wiki.gg/wiki/Lightning_Rod) | Lightning + Iron | Launch | 3.6–6.8 | Plants a rod in the enemy; struck every 3.0/3.0/2.5 s for 1–30 / 1–40 / 1–40 to up to 8 nearby |
| [Lovestruck](https://ballxpit.wiki.gg/wiki/Lovestruck) | Charm + Light, Lightning or Time | Launch (Time variant Shadow) | 4.8–9.2 | Lovestruck for 20/20/30 s; 50% chance to heal you 5/8/8 when they attack |
| [Maggot](https://ballxpit.wiki.gg/wiki/Maggot) | Brood Mother + Cell | Launch | 3.6–6.8 | Infests on hit; infested enemies burst into 1–2 / 1–3 / 2–3 baby balls on death |
| [Magma](https://ballxpit.wiki.gg/wiki/Magma) | Burn + Earthquake | Launch | 3.6–6.8 | Lava blobs over time deal 15–30 / 15–30 / 20–35 and burn (cap 3, 3 s, 3–8 / 5–10 / 5–10); ball and blobs deal 6–12 nearby |
| [Mosquito King](https://ballxpit.wiki.gg/wiki/Mosquito_King) | Vampire + Brood Mother | Launch | 3.6–6.8 | A mosquito per hit dealing 80–120 / 100–150 / 100–150; mosquito kills steal 1/1/2 HP |
| [Mosquito Swarm](https://ballxpit.wiki.gg/wiki/Mosquito_Swarm) | Vampire + Egg Sac | Launch | 3.6–6.8 | Bursts into 3–6 / 3–6 / 4–8 mosquitoes with the same damage; kills steal 1 HP |
| [Noxious](https://ballxpit.wiki.gg/wiki/Noxious) | Wind + Poison, or Wind + Dark | Launch | 4.2–8.0 | Pierces; 3 poison stacks to everything within 2 tiles, 4/4/6 s, 1–3 / 2–5 / 2–5 per stack per second |
| [Offspring](https://ballxpit.wiki.gg/wiki/Offspring) | Cell + Flesh | Naturalist | 3.6–6.8 | Splits into a clone on hit 4/5/6 times |
| [Overgrowth](https://ballxpit.wiki.gg/wiki/Overgrowth) | Earthquake + Cell | Launch | 3.6–6.8 | Overgrowth stacks; at 3/3/2, deals 150–200 / 180–250 / 180–250 to a 3×3 square |
| [Petrify](https://ballxpit.wiki.gg/wiki/Petrify) | Stone + Flesh | Naturalist | 3.6–6.8 | On launch, petrifies everything in its sightline for 1.5/2.0/2.0 s, dealing 50–120 / 50–120 / 80–180 |
| [Phantom](https://ballxpit.wiki.gg/wiki/Phantom) | Dark + Ghost | Launch | 3.6–6.8 | Curses on hit: 100–200 / 150–250 / 200–300 after 5 hits |
| [Radiation Beam](https://ballxpit.wiki.gg/wiki/Radiation_Beam) | Either Laser + Poison or Cell | Launch | 5.4–10.4 | Beam on hit dealing 24–48 / 30–60 / 36–72 plus 1 radiation stack (cap 5, 15 s, +10% damage taken per stack) |
| [Sacrifice](https://ballxpit.wiki.gg/wiki/Sacrifice) | Bleed + Dark | Launch | 3.6–6.8 | 4/6/6 bleed stacks (cap 15/15/20) plus a curse (50–100 / 75–125 / 75–125 after 5 hits) |
| [Sandstorm](https://ballxpit.wiki.gg/wiki/Sandstorm) | Wind + Earthquake, or Wind + Stone | Launch (Stone variant Regal) | 4.2–8.0 | Pierces inside a storm dealing 10–20 / 15–30 / 15–30 per second and blinding nearby enemies for 3/3/4 s |
| [Shotgun](https://ballxpit.wiki.gg/wiki/Shotgun) | Iron + Egg Sac | Launch | 3.6–6.8 | After hitting a wall, fires 3–7 / 4–8 / 5–9 single-use iron baby balls at 200% speed |
| [Soul Sucker](https://ballxpit.wiki.gg/wiki/Soul_Sucker) | Vampire + Ghost | Launch | 3.6–6.8 | Pierces; 30/40/50% chance to steal 1 HP (once per enemy) and cut enemy attack by 20/30/40% |
| [Spider Queen](https://ballxpit.wiki.gg/wiki/Spider_Queen) | Brood Mother + Egg Sac | Launch | 3.6–6.8 | 25/35/45% chance per hit to spawn an Egg Sac |
| [Steel](https://ballxpit.wiki.gg/wiki/Steel) | Iron + Stone | Regal | 3.6–6.8 | Double damage, 50% slower; +10/15/15% damage per hit (max 300/300/400%) |
| [Storm](https://ballxpit.wiki.gg/wiki/Storm) | Lightning + Wind | Launch | 3.6–6.8 | Strikes nearby enemies every second for 1–40 / 1–60 / 1–80 |
| [Succubus](https://ballxpit.wiki.gg/wiki/Succubus) | Charm + Vampire | Launch | 3.6–6.8 | 4/4/5% chance to charm for 9/12/12 s; heals 1 on hitting a charmed enemy |
| [Sun](https://ballxpit.wiki.gg/wiki/Sun) | Burn + Light | Launch | 3.6–6.8 | Blinds every enemy in view and adds 1 burn stack per second (cap 5, 6/8/8 s, 6–12 / 6–12 / 9–15 per stack per second) |
| [Swamp](https://ballxpit.wiki.gg/wiki/Swamp) | Poison + Earthquake | Launch | 3.6–6.8 | Tar blobs deal 15–30 / 15–30 / 25–40, slow by 50% for 7 s and poison (cap 8, 1–3 / 2–4 / 2–4); ball and blobs deal 6–12 nearby |
| [Timestop](https://ballxpit.wiki.gg/wiki/Timestop) | Time + Freeze | Shadow | 3.6–6.8 | Freezes the whole field for 5/5/6 s; self-destructs; 30/20/20 s cooldown |
| [Vampire Lord](https://ballxpit.wiki.gg/wiki/Vampire_Lord) | Vampire + Bleed, or Vampire + Dark | Launch | 4.2–8.0 | 3 bleed stacks per hit; at 10/10/9+ stacks, consumes all to heal 1 |
| [Venom](https://ballxpit.wiki.gg/wiki/Venom) | Poison + Freeze | Shadow | 3.6–6.8 | Venom: 1 stack per hit, cap 8/8/12, 3–6 / 4–7 / 4–7 per stack per second, and slows |
| [Virus](https://ballxpit.wiki.gg/wiki/Virus) | Poison + Ghost, or Poison + Cell (Poison + Bleed disputed) | Launch | 4.2–8.0 | Disease: cap 8, 6 s, 3–6 / 5–9 / 5–9 per second; 15/15/25% chance per second to spread |
| [Voluptuous Egg Sac](https://ballxpit.wiki.gg/wiki/Voluptuous_Egg_Sac) | Egg Sac + Cell | Launch | 3.6–6.8 | Bursts into 2–3 / 2–4 / 3–4 Egg Sacs; 3 s cooldown |
| [Warp](https://ballxpit.wiki.gg/wiki/Warp) | Time + Light | Shadow | 3.6–6.8 | Teleports to a random spot after each hit and speeds up by 5/8/10% |
| [Wraith](https://ballxpit.wiki.gg/wiki/Wraith) | Freeze + Ghost | Launch | 3.6–6.8 | Freezes every enemy it passes through for 0.8/1.3/1.8 s |
| [Zombie](https://ballxpit.wiki.gg/wiki/Zombie) | Vampire + Flesh | Naturalist | 3.6–6.8 | Infected enemies have a 40/50/60% chance to rise as friendly zombies on death |

The Virus recipe is the one live dispute. The Virus, Poison and Bleed pages give Poison + (Ghost or Cell). The wiki's overview table and launch-era guides also list Bleed ([Wiki: Virus](https://ballxpit.wiki.gg/wiki/Virus); [Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls); [CommonSenseGamer](https://commonsensegamer.com/?p=40307)). Several SEO guides also swap partners: they credit Bleed + Dark with Vampire Lord, which is actually Sacrifice, and Dark + Ghost with Assassin, which is actually Phantom. Treat the wiki infobox as authoritative.

### Fourteen top-tier balls scale a shared theme to the whole screen

The 14 top-tier evolutions come in three shapes. Seven join two evolutions, and **each of those seven pairs shares exactly one base ingredient**:

| Ultimate | Parent evolutions | Shared base |
|---|---|---|
| Armageddon | Inferno + Storm | Wind |
| Satan | Incubus + Succubus | Charm |
| Banshee | Phantom + Wraith | Ghost |
| Reaper | Soul Sucker + Heart Swallower | Ghost |
| X Ray | Holy Laser + Laser Beam | A Laser |
| Sniper | Shotgun + Assassin | Iron |
| Mosquito Kingdom | Mosquito King + Mosquito Swarm | Vampire |

Five more join an evolution with a new base: Black Hole, Nuclear Bomb, Time Bomb, Laser Cutter and Tumor. Two are outliers. Nosferatu needs three evolutions and spawns bats that turn into one of its own ingredients, Vampire Lord. Elemental needs four bases (Burn, Wind, Freeze, Earthquake) and simply applies a random burn, slow or freeze, at the lowest multiplier tier. The payoff is almost always **scope rather than a new verb**. Satan burns and berserks every enemy every second. Banshee curses every enemy at launch. Black Hole, Reaper and Tumor execute, with Black Hole and Tumor exempting bosses. Nosferatu and Mosquito Kingdom multiply the number of attackers. Six top-tier balls sit at 4.8–9.2 and three at 5.4–10.4, while Reaper and Elemental stay at 3.6–6.8.

| Ultimate | Recipe | Shape | Shared base ingredient | Added | Multiplier | Effect at Lv1 / Lv2 / Lv3 |
|---|---|---|---|---|---|---|
| [Armageddon](https://ballxpit.wiki.gg/wiki/Armageddon) | Inferno + Storm | Evolved + evolved | Wind | Naturalist | 4.8–9.2 | Self-destructs into a 5 s meteor shower dealing 30–50 / 40–60 / 50–70 per second within 3 tiles |
| [Banshee](https://ballxpit.wiki.gg/wiki/Banshee) | Phantom + Wraith | Evolved + evolved | Ghost | Shadow | 4.8–9.2 | Curses every enemy on the field at launch; 150–300 / 200–350 / 250–400 after 6 hits |
| [Black Hole](https://ballxpit.wiki.gg/wiki/Black_Hole) | Sun + Dark, or Sun + Time | Evolved + base | — | Launch (Time variant Shadow) | 5.4–10.4 | Kills the first non-boss enemy it hits, then self-destructs; 7/6/5 s cooldown |
| [Elemental](https://ballxpit.wiki.gg/wiki/Elemental) | Burn + Wind + Freeze + Earthquake | Four bases | — | Naturalist | 3.6–6.8 | Applies a random burn, slow or freeze to nearby enemies on hit |
| [Laser Cutter](https://ballxpit.wiki.gg/wiki/Laser_Cutter) | Either Laser + Steel | Evolved + base | — | Regal | 5.4–10.4 | Constant forward laser dealing 100–150 / 120–180 / 140–210 per second |
| [Mosquito Kingdom](https://ballxpit.wiki.gg/wiki/Mosquito_Kingdom) | Mosquito King + Mosquito Swarm | Evolved + evolved | Vampire | Naturalist | 4.8–9.2 | 1–2 / 1–3 / 2–3 mosquitoes per hit, 100–150 each; kills steal 2 HP |
| [Nosferatu](https://ballxpit.wiki.gg/wiki/Nosferatu) | Vampire Lord + Spider Queen + Mosquito King | Three evolved | Vampire and Brood Mother (Mosquito King bridges the other two) | Launch | 5.4–10.4 | A vampire bat per bounce dealing 132–176 / 156–224 / 180–272; bats become Vampire Lords on hit |
| [Nuclear Bomb](https://ballxpit.wiki.gg/wiki/Nuclear_Bomb) | Bomb + Poison | Evolved + base | — | Launch | 4.2–8.0 | Self-destructs for 300–500 / 400–700 / 400–700 and gives everyone present a permanent radiation stack (cap 5, +10/10/15% each); 3 s cooldown |
| [Reaper](https://ballxpit.wiki.gg/wiki/Reaper) | Soul Sucker + Heart Swallower | Evolved + evolved | Ghost | Shadow | 3.6–6.8 | 10/15/15% chance to kill on impact, healing 5/5/7 |
| [Satan](https://ballxpit.wiki.gg/wiki/Satan) | Incubus + Succubus | Evolved + evolved | Charm | Launch | 4.8–9.2 | While active, every enemy gains a burn stack per second (cap 5, 10–20 / 10–20 / 15–30) and goes berserk (15–24 / 21–30 / 21–30 to adjacent enemies) |
| [Sniper](https://ballxpit.wiki.gg/wiki/Sniper) | Shotgun + Assassin | Evolved + evolved | Iron | Shadow | 4.8–9.2 | Pierces; after hitting a wall, fires 3–7 / 4–8 / 5–9 piercing baby balls |
| [Time Bomb](https://ballxpit.wiki.gg/wiki/Time_Bomb) | Bomb + Time | Evolved + base | — | Shadow | 4.2–8.0 | Throws a delayed bomb every few seconds: 80–120 / 110–180 / 140–240 |
| [Tumor](https://ballxpit.wiki.gg/wiki/Tumor) | Radiation Beam + Flesh | Evolved + base | — | Naturalist | 4.2–8.0 | Tumoured non-bosses die after 40/35/30 s |
| [X Ray](https://ballxpit.wiki.gg/wiki/X_Ray) | Holy Laser + Laser Beam | Evolved + evolved | Laser | Shadow | 4.8–9.2 | X-shaped beam dealing 50–75 / 55–85 / 60–95 plus a radiation stack (cap 5, +10% each) |

The two community tier lists in the research agree on only two picks. PCGamesN's launch-era list (Nov 2025) rates Holy Laser, Maggot, Mosquito King, Sun and Black Hole as S ([PCGamesN](https://www.pcgamesn.com/ball-x-pit/evolutions-tier-list)). Dexerto's post-Regal list (Jan 2026) rates Magma, Sandstorm, Holy Laser, Black Hole, Flicker, Landslide and Laser Cutter as S ([Dexerto](https://www.dexerto.com/gaming/ball-x-pit-evolution-tier-list-3270546/)). **Holy Laser and Black Hole are S on both.** Holy Laser wins because it covers a full row and column without aiming and carries any fused on-hit effect. Black Hole is a repeatable execute on anything but a boss. The favourite fusions pair a spawner with an on-hit powerhouse. Maggot's baby balls inherit fused abilities, so Maggot X Holy Laser and Maggot X Nuclear Bomb are the standouts ([Deltia's Gaming](https://deltiasgaming.com/?p=386277)), and the wiki calls Spawn arguably the best ability to fuse ([Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls)). After the Naturalist Update, Armageddon became the end-game payoff of a Wind-based Inferno-plus-Storm build ([Dexerto: Hoary Hoarder build](https://www.dexerto.com/wikis/ball-x-pit/best-hoary-hoarder-build/)). No tier list yet covers the Shadow and Naturalist ultimates.

### Fire plus ice already exists in BALL x PIT, and it does not slow

BALL x PIT already has a fire + ice recipe, and how it works matters for the brief. **Frozen Flame (Burn + Freeze)** keeps Freeze's +25% damage-taken amplifier, drops crowd control entirely, and stretches each burn stack to 20–30 seconds ([Wiki: Frozen Flame](https://ballxpit.wiki.gg/wiki/Frozen_Flame)). **Venom (Poison + Freeze)** is the recipe that pairs a stacking DoT with a slow ([Wiki: Venom](https://ballxpit.wiki.gg/wiki/Venom)). The developer's preview even says Venom builds up to paralysis, which the wiki omits ([Steam: Shadow preview](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1830163047266499)). **No BALL x PIT recipe carries both of ice's traits; each result keeps one.** The table below covers the nine base balls that work as elements: 18 of their 36 pairs have a recipe. The designers also reused results instead of inventing a unique ball for every pair. Ice + Lightning and Ice + Wind both make Blizzard, and Wind + Poison and Wind + Dark both make Noxious. Pairs marked *fusion* have no recipe and fall back to a generic "A X B" ball.

| | Freeze | Poison | Lightning | Wind | Earthquake | Light | Dark | Bleed |
|---|---|---|---|---|---|---|---|---|
| **Burn** | Frozen Flame | Brimstone | *fusion* | Inferno | Magma | Sun | Banished Flame | *fusion* |
| **Freeze** | | Venom | Blizzard | Blizzard | Glacier | *fusion* | *fusion* | *fusion* |
| **Poison** | | | *fusion* | Noxious | Swamp | *fusion* | *fusion* | Virus (disputed) |
| **Lightning** | | | | Storm | *fusion* | Flash | *fusion* | *fusion* |
| **Wind** | | | | | Sandstorm | *fusion* | Noxious | *fusion* |
| **Earthquake** | | | | | | *fusion* | *fusion* | *fusion* |
| **Light** | | | | | | | Flicker | *fusion* |
| **Dark** | | | | | | | | Sacrifice |

## A 16 / 256 / 4096 ladder built from both games

### Gate cross-element merges at each stage's cap

Under 2048 rules, each stage spans four values: 16/32/64/128, then 256/512/1024/2048. These map onto BALL x PIT's in-run levels, which only push numbers, with the stage's last value playing the role of level 3. BALL x PIT allows fusion and evolution only between level-3 balls, and fusion only between unfused balls ([Wiki: Fusion Reactor](https://ballxpit.wiki.gg/wiki/Fusion_Reactor)). The direct translation is that **same-class balls merge freely, and different classes merge only at the cap**: 128 Fire + 128 Ice → 256 Blue Flame, and two different 2048 fusions → a 4096. Values 2, 4 and 8 stay neutral, like Slime Legion's inert item tier and BALL x PIT's ability-less baby balls ([4UooJPegibo @103s](https://www.youtube.com/watch?v=4UooJPegibo&t=103s); [Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls)).

The arithmetic is steep. A 16 costs eight 2s. A 256 fusion needs eight 16s of each parent element. **A 4096 needs 256 sixteens, or 2,048 twos.** Slime Legion's budget is 10–15 moves a day over 10–40 days. Even at 15 drops a day for 40 days, drops of value 2 add up to only 1,200 total value, well short of 4096. A prototype that wants ultimates inside a run therefore needs three things: higher-value drops as the run goes on, bonus drops for multi-merges (Slime Legion's +1–3 moves), and board-rewrite cards such as "every 16 becomes a 32", the equivalent of turning every bat into Dracula.

Both games cap a run at four active types: Slime Legion's four-monster lineup and BALL x PIT's four ball slots ([4UooJPegibo @280s](https://www.youtube.com/watch?v=4UooJPegibo&t=280s); [Wiki: Module:BallData](https://ballxpit.wiki.gg/wiki/Module:BallData)). Four elements per run also limits how many unmergeable colours pile up in a physics pit. Slime Legion's slide-off discard is the pressure valve that design needs ([dz8KispwIB0 @2s](https://www.youtube.com/watch?v=dz8KispwIB0&t=2s)).

### Six elements give 15 fusions, 12 with a ready-made precedent

The elements should come from the base balls that describe a payload, not a projectile rule. Ghost, Iron, Stone, Flesh and Dark change how a bouncing ball travels, and Cell, Egg Sac and Brood Mother spawn more balls. In a turret game these work better as shot modifiers or roguelike cards. A "split shot" card, for instance, plays the role of BALL x PIT's spawn-inheritance multiplier for any class ([Wiki: Balls](https://ballxpit.wiki.gg/wiki/Balls)). The remaining payload balls line up closely with Slime Legion's attack shapes. The Lasers hit a row or column, like Frost, Mummy, Death and Blackhat. Lightning chains, like Prophet and Oliver. Earthquake's square matches Undine's and Smelly Flower's slot radius ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)). Physics placement is less precise than Slime Legion's grid, so tier-16 attacks should use forgiving shapes (a column band, a radius, a chain) rather than exact-slot adjacency. This gives the following tier-16 palette:

| Element (tier 16) | BALL x PIT source and numbers | Slime Legion analogue | Suggested turret attack | Built-in weakness |
|---|---|---|---|---|
| Fire | Burn: 1 stack per hit, 3–5 s, cap 3–5, 4–11 per stack per second | Witch and Bella fire units; burn DoT | Fast single-target bolts that stack short burns | Stack cap; needs spreading |
| Ice | Freeze: 4–7% freeze, frozen take +25%; Wind's 30–45% slow as the chill | Frost hits its whole column and slows | Column beam that chills (slows) and sometimes freezes; frozen enemies take +25% | Low direct damage |
| Poison | Poison: cap 5–8, 6–9 s, 1–5 per stack per second | Smelly Flower poisons everything within one slot | Short-radius aura that stacks long poison | Slow to kill |
| Lightning | Lightning: 1–30 to 3–5 targets | Prophet and Oliver chain lightning | Chain to three enemies, with high damage variance | Random rolls |
| Wind | Wind: pierce, 30–45% slow, −25% damage | Naga and Iron Fist knockback | Piercing gust along a row with a one-slot knockback | −25% damage |
| Earth | Earthquake: 3×3 to 4×4 square; Stone: 300–400% first hit | Crack Rock's sandstorm; earth element | Periodic ground slam around the ball | Short reach |

Ice and Wind both slow in BALL x PIT. This palette separates them by giving Ice the amplifier role and Wind the pierce-and-push role, following BALL x PIT's evidence that one damage-taken debuff improves every other ball. Six elements produce 15 pairs. Twelve have a BALL x PIT recipe to borrow from; the other three would be generic both-effects fusions in BALL x PIT. That fallback is acceptable, but at this small scale all 15 can be hand-designed.

| Fusion (tier 256) | BALL x PIT precedent | What the precedent does | Suggested combined class |
|---|---|---|---|
| Fire + Ice | Frozen Flame (and Venom for the slow) | Long burn + 25% vulnerability; poison + slow | **Blue Flame**: long-lasting burn stacks that slow. It keeps Ice's chill and drops the freeze proc and vulnerability so it doesn't outclass both parents |
| Fire + Poison | Brimstone | Burn + poison every second in a 2-tile aura | Dual-DoT aura |
| Fire + Lightning | None (generic fusion) | — | Chain bolt that ignites every target it jumps to |
| Fire + Wind | Inferno | Burn aura every second within 2 tiles | Burning gust that pierces a row and burns everything it passes |
| Fire + Earth | Magma | Lava blobs that burn whoever walks in | Slam leaves lava patches in the lane |
| Ice + Poison | Venom | Stacking DoT that slows | Poison stacks that also chill |
| Ice + Lightning | Blizzard | 2-tile freeze burst | Freeze nova at each chain target |
| Ice + Wind | Blizzard (alternative recipe); Wraith for pass-through freeze | 2-tile freeze; freeze on pass-through | Piercing frost gust that freezes what it passes |
| Ice + Earth | Glacier | Spikes that freeze on touch | Ice spikes in the lane that freeze walkers |
| Poison + Lightning | None (generic fusion); Virus is the closest spread mechanic | — | Arc that poisons each jump and spreads |
| Poison + Wind | Noxious | Pierce + 3 poison stacks within 2 tiles | Toxic gust |
| Poison + Earth | Swamp | Tar: −50% speed, poison | Tar patches that slow and poison |
| Lightning + Wind | Storm | Strikes nearby enemies every second | Storm aura |
| Lightning + Earth | None (generic fusion); Lightning Rod (Lightning + Iron) is closest | Rod strikes up to 8 enemies every 2.5–3 s | Slammed enemies become lightning rods |
| Wind + Earth | Sandstorm | Piercing storm: damage + blind | Damage aura plus blind, reworked as reduced castle damage, which matches Slime Legion's weakness effect |

### Key 4096 ultimates to the element both parents share

BALL x PIT's evolved-plus-evolved ultimates all share one base ingredient, which gives a clean rule for two 2048 fusions touching. With six elements, every possible contact falls into one of three cases:

| Two 2048 parents | Contact combinations (6-element palette) | BALL x PIT precedent | Proposed 4096 |
|---|---|---|---|
| Same fusion (Blue Flame + Blue Flame) | 15 | None. BALL x PIT forbids fusing a ball with itself, and its levels only push numbers | A perfected version of that fusion: the same payload extended to the whole lane or screen |
| Share one element (Blue Flame + Inferno share Fire) | 60 contact combinations covering 20 element triples | All seven evolved-plus-evolved ultimates (Armageddon, Satan, Banshee, Reaper, X Ray, Sniper, Mosquito Kingdom) | One hand-made ultimate per shared element (six in total), flavoured by the two outer elements |
| Share nothing (Blue Flame + Storm) | 45 | Elemental: four bases, random burn, slow or freeze | One "prism" ultimate that applies random statuses from all four elements |

With four elements per run, the numbers shrink to 6 fusions, 12 shared-element contacts and 3 disjoint ones, which is manageable to tune. The six shared-element ultimates each have a precedent in BALL x PIT's top tier:

| Shared element | Precedent | Ultimate behaviour |
|---|---|---|
| Fire | Satan, Sun | Burn on every enemy |
| Ice | Timestop | Field-wide freeze on a long cooldown |
| Poison | Virus, Nuclear Bomb | Contagion plus permanent radiation |
| Lightning | Lightning Rod, Flash | Planted rods that strike up to eight enemies every few seconds, or a full-screen hit |
| Wind | Armageddon (literally the Wind-shared ultimate), Erosion | A meteor shower, or a percent-of-current-HP pierce |
| Earth | Landslide, Overgrowth | Landslide zones, or a 3×3 cash-out burst |

Ultimates should keep or deepen a drawback, as Timestop's 20–30 s cooldown and Black Hole's 5–7 s cooldown do ([Wiki: Timestop](https://ballxpit.wiki.gg/wiki/Timestop); [Wiki: Black Hole](https://ballxpit.wiki.gg/wiki/Black_Hole)). Any execute should exempt bosses, as Black Hole, Tumor and Slime Legion's Cannibal Flower all do ([Pro Game Guides](https://progameguides.com/slime-legion/slime-legion-tier-list/)).

### Scale mechanics rather than face value, and build enemies that test them

If damage tracks face value, a 4096 hits 256 times harder than a 16. BALL x PIT's evidence points the other way. Most evolutions sit barely above base, most ultimates sit about 40–58% higher at the midpoint (Reaper and Elemental do not), and the real gain comes from coverage and reliability. A workable rule is a modest per-value step within a stage, borrowing the Damage page's unverified figure of roughly 33% per level, plus a step change in mechanics at 16, 256 and 4096. Slime Legion shows where the rest of the scaling goes: enemy HP and count, with hit sizes rising from hundreds in chapter 1 to millions in the boss mode ([7lXXa0iLRV4 @373s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=373s); [acMftC7F7L4 @601s](https://www.youtube.com/watch?v=acMftC7F7L4&t=601s)). Its roster also shows that enemies only need enough variety to stress each class:

| Enemy archetype | Slime Legion evidence | Classes it stresses |
|---|---|---|
| Swarm of light fliers | About 15 griffin-chicks on tutorial Day 2; 15–20 mixed swarms ([jC5UyO56XmM @155s](https://www.youtube.com/watch?v=jC5UyO56XmM&t=155s); [Fr4vmW7E_6A @6009s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=6009s)) | Lightning chains, Poison auras and contagion, Wind pierce |
| Formation rows | Six abreast, one per portal, in several rows on ch1 Day 8 ([7lXXa0iLRV4 @375s](https://www.youtube.com/watch?v=7lXXa0iLRV4&t=375s)) | Row gusts and beams (Wind, Fire + Wind) |
| Armoured walker | Blue-armoured soldiers with shield-icon damage ([Fr4vmW7E_6A @12006s](https://www.youtube.com/watch?v=Fr4vmW7E_6A&t=12006s)) | DoTs and percent-HP effects against a physical-resistance flag |
| Uncovered-column runner | Monsters stream down uncovered side columns ([App Store reviews](https://apps.apple.com/us/app/slime-legion/id1664686966?see-all=reviews)) | Column coverage, so where a ball is dropped matters |
| Boss | Telegraphed 1–2 columns, persists between days, summon on death, −50% physical, elemental resistance, stuns units it crushes ([9rhkC1kh2Dg @604s](https://www.youtube.com/watch?v=9rhkC1kh2Dg&t=604s); [acMftC7F7L4 @0s](https://www.youtube.com/watch?v=acMftC7F7L4&t=0s)) | Single-target damage, freeze and slow (a frozen boss was observed), boss-exempt executes, element counters |

Slime Legion's pacing carries over almost unchanged. Use drops per wave as the currency in place of moves per Day. Telegraph the active columns before each wave. Put a boss on every tenth wave, with an early tutorial boss. Let a surviving boss persist. Carry castle HP between waves so that a leaky wave costs about a quarter of it. Cap stage length, since overlong late stages are the most consistent player complaint.

## Conclusion

Slime Legion shows that enemy complexity is close to optional when the player's board is the puzzle. Reskinned column-walkers, a physical-resistance flag and a few lines of boss ability text have carried it through 270 chapters. A prototype can therefore spend its design effort on the class ladder and treat enemies as stress tests for it: swarms for chains, rows for beams, armour for DoTs, bosses for executes. BALL x PIT's useful lessons are structural rather than numeric. Fusion is gated at the cap level, designed recipes override a generic both-effects fallback, the partner decides how an effect is delivered, and ultimates join two fusions that share an element and scale the effect up. Its damage multipliers appear to follow recipe count and are a poor guide to tuning.

The biggest risk to the 16 / 256 / 4096 plan is economic, not combinatorial. A 4096 represents 2,048 twos, so without escalating drops and board-rewrite cards the ultimate tier is out of reach in a Slime Legion-length stage. Several open questions need an in-game check before numbers are locked: whether Slime Legion's elements have a counter chart, whether BALL x PIT's fused balls can feed evolutions, how stacked amplifiers such as Freeze (+25%), Frostburn (+25%) and Radiation (+10–15% per stack, up to five stacks) combine, and what Risen Ballbylon's 24 new balls add after 12 November 2026.
