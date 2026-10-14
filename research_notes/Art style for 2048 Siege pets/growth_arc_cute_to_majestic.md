# Growth Arc: From Cute-Funny Babies to Cool, Majestic, Magical Finals (2048 Siege pets)

Scope note:
- Sibling file `creature_design_language.md` already covers baby-schema psychology, Sugimori's "final form first" process (Haxorus/Seismitoad), Pikachu/Gorochu, Cassette Beasts fusion and Onsager fusion slots. Those points are only cross-referenced here.
- These notes focus on what changes *between* stages and by how much.
- They include a small original dataset pulled from PokeAPI (27 starter lines, 81 species) to put numbers on size, posture and colour changes.
- Retrieval date for all sources: 2026-10-14. "[snippet]" means the claim comes from a search-result summary, not a fetched page.

---

## 1. How Pokémon and other creature-collector teams handle the cute→cool shift across evolutions

### Takeaway
Game Freak deliberately keeps first stages weak-looking and cute, and lets power show up only after evolution. Several mechanisms support this:
- Lines are often designed final-first.
- Babies get "softening" additions (cute hands, freckles, a funny nose flame) that partly survive into the final as a small vestige.
- Each line has a fixed personality ("funny", "cool", "serious").

Dragonite is the textbook failure case. Its final form broke silhouette, posture and colour continuity and regressed toward cute, and critics have called it out for 15+ years.

### Cited Findings

**Game Freak on starters (Nintendo Dream Vol. 201, January 2011: Ken Sugimori, Takao Unno, Yusuke Ohmura)**
- Sugimori: starters "are the first ones that young children…take with them to begin their adventures. That's why these Pokémon shouldn't look too strong from the very beginning — once they evolve, that's when they start to look powerful." — [Nintendo Dream 2011, trans. Dr. Lava](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]
- Snivy: the team chose a snake motif but added "cute hands and legs" so it wouldn't frighten children. The line gradually becomes "more like a snake," and Serperior keeps small hands folded behind its back as a vestige. — [same source](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]
- The three Gen 5 starters were given distinct personalities that carry through their final designs: Tepig "the funny one" (a pig that breathes fire from its nose, called "cute" and approved instantly), Snivy "the cool one," Oshawott "the serious one." — [same source](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]
- Ohmura's sea-lion-show visit inspired the powerful Samurott design. It was conceived *before* Oshawott's look was finalized (final-first again). — [same source](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]

**Sugimori on balancing cool and cute** (*Pokémon Ultra Sun & Ultra Moon Essential Setting Information* book, reported by Siliconera, 27 July 2018)
- "I might try adding something uncool to a Pokémon that is too cool, or I might add something cheerful to a Pokémon that is too serious."
- "My job is to get something that would look cooler if it didn't have this or that on it, then put it in on purpose." Purely cool designs end at "that's cool" and become forgettable.
- Example: Oshawott's freckles. He kept them despite criticism because "it is better to have them" for memorability.
- [Siliconera, 2018](https://www.siliconera.com/pokmon-designer-on-balancing-cool-or-cute-pokmon-by-adding-uncool-or-uncute-features/) [fetched]

**Sugimori on early design** (2018 Satoshi Tajiri biographical manga, translated by Shmupulations; reported by Well-Played, 31 July 2019)
- New designs were chosen partly as "ones we thought would look interesting in an evolved form—or, conversely, ones that we wanted to see the pre-evolved form for."
- He learned "how to give them more interesting expressions, or to make them look dopey, or disgusting."
- [Well-Played, 2019](https://www.well-played.com.au/pokemon-artist-ken-sugimori-talks-design-in-newly-translated-2000-interview/) [fetched]
- Conflict note: the article's headline says "2000 interview," but the body attributes the quotes to a 2018 manga.

**Charmander → Charizard**
- Designed by Atsuko Nishida. "Charizard was designed before Charmander, with Charmander being based on Charizard's design."
- Animal reference escalates by stage: salamander (Charmander) → chameleon (Charmeleon) → winged European dragon (Charizard), shifting from ground-bound to aerial.
- Children say they like Charizard for its "cool looking" appearance and its link to "stubbornness and power."
- [Wikipedia: Charizard](https://en.wikipedia.org/wiki/Charizard) [fetched]
- Mega Charizard X (Wikipedia credits Nishida with Mega X and Tomohiro Kitakaze with Mega Y) has a "black, toned body and hotter blue flames." Its "beyond-final" form darkens the base value and changes accent hue. — [Wikipedia: Charizard](https://en.wikipedia.org/wiki/Charizard) [fetched]

**Froakie → Greninja**
- Greninja is dark blue and wears its tongue wrapped around its neck like a scarf, in place of the bubbles Froakie and Frogadier have. The neck-accessory motif persists but changes material and meaning (bubbles → ninja scarf). — [DBpedia: Greninja (Wikipedia-derived)](https://dbpedia.org/page/Greninja) [snippet]
- Size and posture data are in the PokeAPI dataset below.

**Dratini → Dragonair → Dragonite (counter-example)**
- Designed by Shigeki Morimoto; Sugimori finalized the look.
- Dragonite is orange, bipedal, winged and horned, in sharp contrast to the serpentine blue Dratini and Dragonair. — [Wikipedia: Dragonite](https://en.wikipedia.org/wiki/Dragonite) [fetched]
- Critics, via the same page:
  - Destructoid (Jim Sterling, June 2008) called it a "downgrade from Dragonair," "cute" rather than "fearsome."
  - Nintendo Life (Dec 2021): "there was nothing about Dragonair's design that suggested it would evolve to gain wings or limbs."
  - Dot Esports (July 2022): the designs are "completely different."
  - TheGamer (Nov 2023): the transition "didn't make sense."
  - [Wikipedia: Dragonite](https://en.wikipedia.org/wiki/Dragonite) [fetched]

**Original dataset: 27 starter lines, Gen 1–9** (PokeAPI `pokemon` + `pokemon-species` endpoints, official Pokédex height/weight, shape class and colour class; e.g. [pokeapi.co/api/v2/pokemon/6](https://pokeapi.co/api/v2/pokemon/6), [pokemon-species/6](https://pokeapi.co/api/v2/pokemon-species/6); [docs](https://pokeapi.co/docs/v2); pulled 2026-10-14)
- **Height.** Median height is 0.4 m → 0.9 m → 1.7 m by stage.
  - Median growth per step is ×2.0 (stage 1→2) and ×2.0 (stage 2→3), or ×3.8 overall.
  - Overall range is ×2.0 (Chikorita→Meganium) to ×7.0 (Grookey→Rillaboom).
  - The stage 2→3 jump is larger than stage 1→2 in 16 of 27 lines (59%).
- **Weight.** Median growth stage 1→3 is ×10.6, so finals read as much denser and heavier, not just taller.
- **Posture.**
  - Stage-1 shapes: 12 upright, 10 quadruped, 2 humanoid, 1 legs, 1 fish, 1 wings.
  - Stage-3 shapes: 16 upright, 6 quadruped, 2 humanoid, 1 fish, 1 wings, 1 squiggle.
  - 7 of 10 quadruped babies stand up by the final: Mudkip, Tepig, Fennekin, Froakie, Litten, Sobble, Sprigatito.
  - 4 lines go the other way, toward the concept animal: Snivy → serpentine Serperior, Oshawott → quadruped Samurott, Cyndaquil → quadruped Typhlosion, Fuecoco → quadruped Skeledirge.
- **Colour.** The dominant Pokédex colour class stays the same across all three stages in **25 of 27** lines. Exceptions: Scorbunny white→gray→white; Quaxly white→blue→blue.
- **Examples:**
  - Charmander 0.6 m/8.5 kg → Charizard 1.7 m/90.5 kg (×2.8 height).
  - Froakie 0.3 m → Greninja 1.5 m (×5.0); shape quadruped → humanoid.
  - Snivy 0.6 m → Serperior 3.3 m (×5.5); upright → squiggle.
- **Dragonite breaks every pattern:**
  - Dratini 1.8 m → Dragonair 4.0 m → Dragonite 2.2 m. The final is *shorter* than stage 2.
  - Weight ×63.6.
  - Shape squiggle → squiggle → upright.
  - Colour blue → blue → brown.

**Digimon** uses six stages: Baby I (Fresh), Baby II (In-Training), Child (Rookie), Adult (Champion), Perfect (Ultimate), Ultimate (Mega).
- Baby I: newly hatched, "composition data is unstable," very weak.
- Baby II: still "largely unable to fight."
- Champion: "fully grown."
- Ultimate: wild ones act as "pack leaders."
- [Wikimon: Evolution Stage](https://wikimon.net/Level) [snippet]

### Inferences
- **The 2048 Siege arc maps cleanly onto Game Freak's rule.**
  - 16–128 babies "shouldn't look too strong."
  - 256 fusions are the first stage allowed to look powerful.
  - 4096 legendaries add the divine layer.
  - The Digimon ladder offers a vocabulary: 16 = "Fresh/unstable blob," 32–128 = "In-Training → Rookie," 256 = "Champion/fully grown," 4096 = "leader/Mega."
- **Dragonite shows which identity anchors not to break.** Of the four Dragonite breaks, colour change and silhouette-class change are the two the dataset shows Pokémon almost never makes (colour stable in 25/27 lines). Shrinking and regressing toward cute make up the "downgrade" critics name.
  - Rule for 2048 Siege: never change the dominant hue family; never shrink a stage; never make a later stage rounder or more babyish than the one before.
  - A fusion may change posture class, but only if one parent's silhouette slot carries over (see sibling notes on fusion slots).
- **Use the Snivy pattern for babies.** Add "cute hands and legs" style softeners at 16 (stubby limbs, a freckle, a sprout) and keep one tiny vestige at the final (Serperior's folded hands, Oshawott's freckle logic). That vestige is a lovable callback that ties the majestic form to the baby.
- **Use the Froakie→Greninja pattern for motifs.** The baby's signature feature should *transform*, not vanish. Examples: fire baby's ember cowlick → fusion's flame crest → legendary's flame crown; ice baby's frosty cheek-puffs → fusion's crystal mantle → legendary's ice halo.
- **Give each of the 8 elements a Tepig/Snivy/Oshawott-style persona** to set the comedic register of its baby, e.g. fire = hothead/clown, ice = sleepy, lightning = hyper, poison = mischievous, earth = stubborn, wind = airhead, metal = serious, nature = shy. Fusions blend two personas; legendaries resolve them into a calm, regal register.
- **Size has a target ratio.** Pokémon finals are about ×3.8 the baby's height and about ×10 its weight. The game can't change tile size, so express "×4 height / ×10 mass" through fill percentage in the tile, then off-tile scale in the roaming layer (see Q6).

### Gaps
- No primary design interview found for Froakie/Greninja (designer, intent); only Wikipedia-derived snippets.
- Eevee line not researched within budget. Its "one cute base, many elemental finals" structure is a close analog to 8 elements → 28 fusions, worth a follow-up.
- No primary sources reached for Temtem (Crema), Monster Hunter Stories, Yo-kai Watch or Palworld evolution or growth design. Palworld has no evolution stages as far as known, but this is unverified.
- Bulbapedia returned HTTP 403, so its design-origin and interview archive pages couldn't be used.

---

## 2. Measurable visual levers and the perception research behind "cute" vs "cool/dominant"

### Takeaway
The levers that turn cute into powerful, each with a research or industry anchor:
- **Head-heights.** Chibi is 2–4 heads; standard/heroic is 7–8. The 2-head figure reads most childlike, and 3-head is "cute without looking quite as childlike."
- **Facial width-to-height ratio.** Wider, shorter faces are perceived as more aggressive and dominant.
- **Downward-pointing V shapes.** These are implicitly read as threatening, and they activate threat circuitry.

Size and mass are also strong levers: Pokémon finals average about ×3.8 height and ×10 weight. Dominant colour should stay fixed while value contrast and accents change.

### Cited Findings
- **Head-heights.**
  - Regular characters are about 7–8 heads tall; chibis are 2–4 heads.
  - At 2 heads the distortion is most extreme and most childlike. At 3 heads characters "still have the cute look, without looking quite as childlike."
  - Chibi style collapses age differences: a six-head girl and an eight-head man both become a 2–3-head chibi.
  - [Clip Studio Tips: chibi proportions](https://tips.clip-studio.com/en-us/articles/4953) [snippet]
- **Facial width-to-height ratio (fWHR).**
  - Wider, shorter faces are linked to more self-reported aggression: verbal aggression, physical aggression and anger in men; verbal aggression in women. — [Royal Society news, 2014](https://royalsociety.org/news/2014/wide-short-faces-could-indicate-more-aggression-in-men-and-women) [snippet]
  - fWHR in men correlates positively with perceived formidability (dominance, aggression, threat, masculinity), and it predicts observers' judgments of aggression. — [Summersby, Harris, Denson & White, *Royal Society Open Science* 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9066300) [fetched + snippet]
- **Caveats on fWHR.**
  - In 17,607 passport photos, the fWHR–perceived-aggression link varied with age and sex. For male faces it was strongest at ages 27–33 (mean difference 0.36 on the aggression scale); for female faces, at 34–61.
  - The paper cites a prior meta-analysis finding fWHR sexual dimorphism itself is "very small (d = 0.11)."
  - It does not test cartoon or non-human faces.
  - [Summersby et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9066300) [fetched]
- UK CEOs have higher fWHR than matched controls, and their faces are rated higher in dominance/success; those ratings correlate with fWHR. — [Sussex figshare: Alrajih & Ward](https://sussex.figshare.com/articles/journal_contribution/Increased_facial_width-to-height_ratio_and_perceived_dominance_in_the_faces_of_the_UK_s_leading_business_leaders_/23419463) [snippet]
- **Angular shapes and threat.**
  - In an Implicit Association Test, people categorized downward-pointing triangles as "unpleasant" faster than neutral or pleasant. The effect was specific to downward-pointing shapes with an acute angle; circles were not threatening. — [ScienceDaily, 29 May 2012 (Larson et al., Michigan State/Wisconsin)](https://www.sciencedaily.com/releases/2012/05/120529074617.htm) [snippet]
  - The proposed reason is that the downward "V" resembles an angry brow, and viewing downward-pointing triangles raises amygdala response. — [Frontiers in Psychology 2016](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.00917/full) [snippet]; [The Conversation](https://theconversation.com/v-shaped-facial-features-are-threatening-you-must-be-joking-7373) [snippet]
  - The Conversation piece is skeptical of over-reading the V-shape effect (title: "V-shaped facial features are threatening? You must be joking").
- **Size and mass, posture, colour stability:** see the PokeAPI dataset in Q1.
  - Height ×2 per stage.
  - Weight ×10.6 from baby to final.
  - Quadruped → bipedal in 7/10 quadruped babies.
  - Dominant colour stable in 25/27 lines.
- **Value and darkness as a "beyond-final" lever.** Mega Charizard X moves to a black body with blue flames. — [Wikipedia: Charizard](https://en.wikipedia.org/wiki/Charizard) [fetched]
- **Pointed additions as the planned escalation.** Pikachu's cancelled final "Gorochu" had large fangs and two horns. — see sibling notes; [Siliconera](https://www.siliconera.com/pikachu-originally-second-evolution-called-gorochu-large-fangs-two-horns/) [snippet]

### Inferences

**Proposed lever table** (design targets derived from the above; not industry standards). H = total creature height. "Head share" = head height ÷ total height.

| Lever | Egg (<16) | Baby 16 | 32 | 64 | 128 | Fusion 256 | Legendary 4096 |
|---|---|---|---|---|---|---|---|
| Head share of H | n/a (eyes peek through shell) | 55–60% (≈1.7–2 heads) | ~50% | ~45% | ~40% (≈2.5 heads) | 30–35% (≈3 heads) | 25–30% (≈3.5–4 heads); never heroic 7–8 |
| Eye diameter ÷ head width (each eye) | n/a | 28–32%, perfectly round, big highlight | 26% | 24% | 22%, slight almond | 15–18%, almond, outer corner tilted up 10–15° | 12–15%, almond or glowing slit/solid-light eyes |
| Eye vertical position | n/a | Below head midline (big forehead) | Below | At midline | At midline | Slightly above midline, brow ridge added | Above midline, brow + crest frame |
| Brow | none | none / floating dots | none | faint | faint | short angled brow (mild V, ≤20°) | calm horizontal or upturned brow (serene) |
| Face shape (fWHR proxy) | round | tall-round cranium, tiny jaw | — | — | jaw starts to show | wider cheek/jaw mass, shorter mid-face | wide but symmetrical, serene |
| Limb length ÷ H | 0 | stubs ≤15% | 15% | 20% | 25% | 35–40%, visible joints | long or floating/flowing appendages |
| Silhouette curve vs corner ratio | 100% curves | ≥90% curves, 0–1 point | 1–2 points | 2–3 points | 3–4 points | 5–8 points (spikes, horns, claws), still with soft base | symmetrical points (crown, wing tips) + flowing curves |
| Posture | resting | sitting / blob / quadruped | sitting | upright-ish | upright | upright or dynamic action stance | hovering, upright, symmetrical |
| Palette | muted pastel shell + element speck | element hue, high value, mid saturation, low contrast | same | +contrast | +contrast | element hues (60/30/10 split), darker base value, brighter accents | same hues + gold/white accent, emissive glow, near-black or white base allowed |
| Ornament budget | 0 | 0 (one "softener", e.g. freckle) | 1 tiny motif | motif grows | motif full | 2–3 ornaments (crest, tail, armor) | crown/halo + 1 floating part |
| FX | wobble | none / sweat drop / sparkle-on-happy | — | — | small element puff | element trail/particles | aura ring, glow pulse, orbiting sparkles |

- **Biggest jump goes at 128→256.** Babies change in small increments (about 5% head share per sub-step). The fusion breaks the pattern in one go: head share drops about 8 points, angular points roughly double, and limbs and joints appear. This matches Sugimori's "once they evolve, that's when they start to look powerful" and the 59% of starter lines whose last jump is the biggest.
- **Use the downward V deliberately and sparingly.** It is the strongest "cool/fierce" cue, so put it on fusion brows, claws and wing tips. Keep it off babies entirely. Legendaries should move *past* fierce to serene: Larson's work flags circles as non-threatening, so use halos, rings and upward flames. This helps keep "any Pokémon should be able to become your friend" (sibling notes).
- **Widen the mid-face for power.** Broader cheeks and jaw and a shorter brow-to-mouth distance on fusions borrow the fWHR dominance cue. Treat this as an analogy: the effect is small, age-dependent and human-only.
- **Hold dominant hue constant.** This is Pokémon's 25/27 rule. Change value contrast (darker base, brighter accent), saturation of accents, and add one "prestige" colour (gold/white) only at legendary. The Mega Charizard X darkening is a model for a possible 4096 "shadow/celestial" variant.

### Gaps
- No peer-reviewed study found that directly measures perceived cuteness vs coolness across a creature evolution line. Mapping baby-schema, fWHR and angle research onto creatures is an inference.
- No source found giving head-share or eye-size numbers measured from official Pokémon art. The table values are proposed targets and should be validated by measuring a few official sprites (e.g. Charmander vs Charizard) or by a quick player preference test.
- Research on dominance perception from *body* posture (expansive vs contracted) was not fetched within budget.

---

## 3. Making baby creatures funny and lovable, not just cute

### Takeaway
Game Freak's own toolkit for "funny cute":
- deliberately "uncool" features (freckles)
- "dopey" expressions
- a designated "funny one" per trio, whose element is expressed in a comic way (fire from a pig's nose)

Digimon babies are literally "unstable" and unable to fight, which licenses blobby, limbless, clumsy babies. Slime-style babies earn affection through reactive bouncing and noises. Sources on Kirby, Neko Atsume and Pikmin weren't reached.

### Cited Findings
- Sugimori on learning to make monsters "look dopey" and give "more interesting expressions." — [Well-Played, 2019](https://www.well-played.com.au/pokemon-artist-ken-sugimori-talks-design-in-newly-translated-2000-interview/) [fetched]
- He deliberately adds "something uncool" or "something cheerful." Oshawott's freckles were kept because they make it memorable, even if it's technically "cuter" without them. — [Siliconera, 2018](https://www.siliconera.com/pokmon-designer-on-balancing-cool-or-cute-pokmon-by-adding-uncool-or-uncute-features/) [fetched]
- Tepig was designed as "the funny one." Its fire is breathed from its nose, an element joke, and it was called "cute" and approved immediately. — [Nintendo Dream 2011](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]
- Snivy got "cute hands and legs" specifically so a snake wouldn't frighten young children. — [Nintendo Dream 2011](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) [fetched]
- Digimon Baby I: "composition data is unstable," very weak. Baby II: "largely unable to fight." — [Wikimon](https://wikimon.net/Level) [snippet]
- Slime Rancher slimes (Monomi Park; director Nick Popovich, designer Chris Lum) bounce around when they see movement and make cute noises. Reviewers called the art "the visual ceiling of the cute lane." — [Wikipedia: Slime Rancher](https://en.wikipedia.org/wiki/Slime_Rancher); [Checkpoint Gaming review, 2018](https://checkpointgaming.net/reviews/2018/09/slime-rancher-review-adorable-farm-sim-ever/) [snippet]

### Inferences
- **Funny = cute plus one flaw or one element joke.** Give every baby a single "uncool" detail and one comic way its element misfires:
  - fire baby hiccups embers
  - ice baby's nose has an icicle drip
  - lightning baby's fur sticks up with static
  - poison baby burps a bubble
  - earth baby has a pebble stuck on its head
  - wind baby drifts off its tile edge
  - metal baby has a dented antenna or rust freckle
  - nature baby's sprout wilts and perks back up

  These are code-animatable (particle puff, rotation wobble, offset bob) and readable at 55–60 px as a single extra shape.
- **Use the Digimon framing for clumsiness.** At 16 the creature has just hatched and is "unstable." Idle gags fit cheap code animation:
  - over-squash on landing that overshoots into a wobble
  - random blink plus slow double-blink "derp"
  - head tilt 10–15° when the player taps nearby
  - a 1-in-N idle where the baby falls asleep (eyes become arcs, Z particle)
  - a startled hop when a neighbour merges
- **Reactivity is the cheapest lovability lever.** Slimes react to movement, so tiles should react to swipes: eyes glance toward the swipe direction, a squash anticipation before the slide, a happy "boing" on merge.
- **Expression range should *narrow* as stages rise.** Babies get the widest, most exaggerated expressions (huge open mouth, sweat drops, tears). Fusions get confident ones (smirk, focused eyes). Legendaries get one serene expression. The narrowing itself reads as "grown up."

### Gaps
- No primary sources reached for Kirby (HAL), Neko Atsume (Hit-Point), Pikmin, or Yo-kai Watch (Level-5) comedic design; these were in the brief but not researched within budget.
- No sources on sound design for "funny" babies (squeaks, pitch-shifted vocalizations).

---

## 4. Signals of "magical/majestic" legendary forms, readable at small size and animatable in code

### Takeaway
Majesty comes from:
- **Divinity iconography:** halos, wheels and rings (Arceus).
- **Symmetry and an "icon-like" rather than animal-like body.**
- **A shift from animal reference to mythic reference:** salamander → chameleon → European dragon in Charizard's line.
- **Bigger mass and a raised, airborne posture.**

At small sizes, these signals compress best into a few readable devices: a ring or halo shape, a prestige accent colour (gold/white), and a slow glow, bob or rotation.

### Cited Findings
- **Arceus:**
  - Its golden cross-spoked ring is commonly read as a stylized halo or solar nimbus.
  - Its white body and symmetrical form make it read "less like an animal and more like an icon or celestial entity."
  - Origins cited include Egyptian bovine idols (Apis) and the Dharmachakra/Bhavacakra wheel.
  - [ASTRO: Arceus](https://www.astrosafe.co/article/arceus) [snippet]. **Low-reliability aggregator.** Bulbapedia's origin section, the better source, was blocked (403). Treat these as fan-consensus readings, not designer statements.
- Charizard's line escalates from ground-bound to winged and aerial, with a European-dragon reference at the final. — [Wikipedia: Charizard](https://en.wikipedia.org/wiki/Charizard) [fetched]
- Mega Charizard X (beyond-final): darker body, "hotter blue flames" (accent colour shift). — [Wikipedia: Charizard](https://en.wikipedia.org/wiki/Charizard) [fetched]
- Circles and curvilinear forms are perceived as pleasant and non-threatening; downward-pointing V forms read as threatening. — [ScienceDaily 2012](https://www.sciencedaily.com/releases/2012/05/120529074617.htm) [snippet]
- In Digimon, the top stages are framed as social apex: Ultimates are "pack leaders." — [Wikimon](https://wikimon.net/Level) [snippet]

### Inferences
- **A legendary "majesty kit" of five devices, ordered by readability at about 55–60 px:**
  1. **Ring or halo behind or above the head.** A circle reads at any size, carries divinity (Arceus) and is non-threatening (curvilinear).
  2. **Prestige accent colour.** Gold or white trim on the element palette; rim-light only on legendary.
  3. **Bilateral symmetry.** Babies can be asymmetric (crooked tuft, one ear flopped); legendaries are mirror-symmetric.
  4. **Floating parts:** detached crest shards, orbiting element motes, wings not touching the body.
  5. **Flowing appendages:** long tail or ribbon fins that trail with lag.
- **Fusion (256) vs legendary (4096).** Fusions are "cool/powerful," with points, armor and fierce brows. Legendaries are "majestic/magical," with serene faces, symmetry, rings and glow. Going from fierce to serene keeps legendaries distinct from fusions, not just "a bigger fusion."
- **Code-driven majesty** (cheap transforms; sibling `readability_animation_performance.md` covers performance):
  - Float bob: sine, period 2.5–4 s, amplitude 3–5% of height. Compare a baby's bob of 0.6–0.9 s at 6–10%.
  - No squash/stretch at all on legendaries. Rigid motion reads as heavy and divine.
  - Halo: slow rotation, about 1 revolution per 12–20 s, and/or scale pulse ±4%.
  - Glow: alpha pulse 2–3 s on an additive copy of the silhouette or a radial gradient behind it.
  - Sparkles: 1–3 short-lived star particles at a time, spawning on the halo ring.
  - Shadow: a detached ground shadow that shrinks as the creature rises, which sells hovering.
- **Mythic-reference shift.** Each element's legendary should move from animal to myth, as Charizard did: fire → phoenix/sun-wheel, ice → aurora/snow-spirit, lightning → thunderbird/raijin drum ring, poison → hydra/miasma crown, earth → golem/mountain shrine, wind → sky serpent, metal → automaton/gilded knight, nature → world-tree/forest-deity antlers.

### Gaps
- No designer-primary source on how Game Freak signals "legendary" visually (halos, symmetry, rings); only aggregator readings.
- No research found quantifying how perceptible glow, halos or symmetry are at sub-64 px sizes.
- Not covered: other games' legendary language (e.g. Monster Hunter Stories, Temtem Luma variants, gacha "SSR" frame conventions).

---

## 5. How animation and motion style change with stage

### Takeaway
Animation timing is a personality and mass signal:
- Light, small things move snappily and instantly; heavy, large things start slow and stop slow.
- Snappy anticipation reads lively; slow, drawn-out anticipation reads heavy.
- Slow motion can read as weight, caution or *confidence*.

This maps directly onto bouncy, squashy babies and slow, weighty or floating finals.

### Cited Findings
- "Heavy objects start slow and stop slow, while light objects respond instantly. Larger forms tend to move slower, and smaller ones tend to move faster." Sluggish timing reads as tired or massive; snappy timing reads as alert, nervous or lightweight. Rule of thumb at 60 fps: an elephant walk is 24+ frames per step, a mouse 4–6 frames. — [Playbooks: "timing-principle-mastery" (dylantarre)](https://playbooks.com/skills/dylantarre/animation-principles/timing-principle-mastery) [snippet]. **Low-reliability secondary source** (a prompt/skill page); the underlying principle is standard Disney "timing."
- "Fast movements can feel energetic or aggressive, while slower movements can suggest weight, caution, or confidence." — [Pixune: Anticipation](https://pixune.com/blog/anticipation/) [snippet]
- "Snappy, energetic anticipation communicates a lively personality, while slow and drawn-out anticipation conveys heaviness and lethargy." — [Pixune: Anticipation](https://pixune.com/blog/anticipation/) [snippet]
- Squash and stretch as a principle is covered in sibling `readability_animation_performance.md` (Wikipedia: Squash and stretch).

### Inferences

**Proposed motion parameters per stage** (code-driven; starting values to tune):

| Parameter | Baby 16–32 | Baby 64–128 | Fusion 256 (roaming) | Legendary 4096 |
|---|---|---|---|---|
| Idle bob period | 0.6–0.9 s | 0.9–1.2 s | 1.2–1.6 s (breathing) | 2.5–4 s (float) |
| Idle bob amplitude | 6–10% H | 4–6% H | 2–3% H | 3–5% H, airborne, no ground contact |
| Squash/stretch on land/merge | 20–30% | 12–18% | ≤5% (weight shown by a dust puff instead) | 0% (rigid) |
| Ease | overshoot/elastic (back-out) | back-out, smaller | ease-in-out, slow-in/slow-out | sine, very smooth |
| Anticipation before move | short and exaggerated (2–4 frames, big crouch) | shorter crouch | longer wind-up (6–10 frames), small amplitude | slow raise/glow-up |
| Walk/hop cadence (roaming) | n/a (in tile) | n/a | 8–14 frames per step at 60 fps, heavy footfall + tiny screen shake on large ones | glide; no steps |
| Idle gags | frequent (every 3–6 s): blink, double-take, sneeze-element puff | less frequent | rare: a confident flex/roar | none; only ambient sparkles/halo spin |
| Tint/flash | playful colour flashes | — | element-coloured hit flash | constant soft glow pulse |

- **Merge as a ceremony that scales with stage.** 16–128 merges get a quick squash-pop plus confetti puff. The 128→256 fusion gets a longer beat: a white flash, a brief hold, the silhouette swap, then the creature hopping *out* of the grid. 4096 gets the longest beat: a slow rise, a halo forming, a gold flash.
- **Tie motion to the Pokémon mass ratio.** If the final is about ×10 the baby's mass, step period should be roughly ×2–4 longer and bob amplitude roughly halved, following the elephant-vs-mouse principle.
- **Exception: lightning and wind lines.** Those finals can stay fast (Greninja's "speed and grace" ninja persona) but should switch from bouncy-fast to *precise*-fast: clean sharp dashes with ease-out and no squash. Babies stay squashy.

### Gaps
- No GDC talk or primary game-animation source fetched on stage-dependent motion personality (e.g. Pokémon Home or Pokémon Sleep animation teams, Jonathan Cooper's *Game Anim*); the cited timing sources are secondary or low-reliability.
- Frame and amplitude values in the table are proposed starting points, not measured from shipped games.

---

## 6. Expressing the same arc in three art layers: in-tile creature, roaming sprite, 3D-style portrait

### Takeaway
Each layer should carry a different subset of the levers:
- **Tile (55–60 px):** face, colour and one motif. Change fill percentage, motif size and the tile frame across sub-steps.
- **Roaming sprite:** silhouette, posture and motion.
- **Portrait:** proportions, materials, lighting and ornament detail.

The identity anchors (dominant hue, eye style, signature motif) must be identical across all three.

### Cited Findings
- Pokémon keeps the dominant colour class stable across stages in 25/27 starter lines. Colour is the most reliable cross-layer anchor. — [PokeAPI data, pulled 2026-10-14](https://pokeapi.co/docs/v2)
- Final stages grow a median ×3.8 in height and ×10.6 in weight. — [PokeAPI](https://pokeapi.co/docs/v2)
- 7 of 10 quadruped babies become bipedal finals. Posture is a silhouette-level lever. — [PokeAPI](https://pokeapi.co/docs/v2)
- Chibi 2-head proportions are the most childlike, and chibification flattens age and body differences. A compressed tile layer therefore naturally homogenizes stages, so differences must come from motif and frame, not body. — [Clip Studio Tips](https://tips.clip-studio.com/en-us/articles/4953) [snippet]
- Showing more of a creature (e.g. back views) gives room for "cool pattern" details that small front sprites can't hold. — [Sugimori via Well-Played, 2019](https://www.well-played.com.au/pokemon-artist-ken-sugimori-talks-design-in-newly-translated-2000-interview/) [fetched]

### Inferences

**Layer A: in-tile creature (55–60 px tile, number must stay readable)**
- **Composition.** The creature is a chibi bust or full-body blob of about 1.7–2.5 heads. The face takes most of the area; keep a clear zone for the numeral (sibling readability notes).
- **Growth sub-steps by fill.** Creature height as a share of tile height: 16 ≈ 55%, 32 ≈ 62%, 64 ≈ 70%, 128 ≈ 80%. At 128 the crest or ears may break out of the top edge by 2–4 px, a "can't contain it" cue that foreshadows leaving the grid at 256.
- **Motif growth** across 16→128: 1 → 2 → 3 → 4 motif elements, e.g. flame tuft from 1 to 3 licks plus tail ember.
- **Tile frame/background shifts:** 16 plain → 32 element tint → 64 inner glow → 128 animated rim shimmer.
- **Eyes change, but within the cute range** (28% → 22% of head width). Brows stay absent.
- **Egg (<16):** shell in the element hue with eyes peeking through a crack or a wobble. The crack size can track 2/4/8.

**Layer B: roaming sprite (fusions 256+, legendary 4096)**
- **Size off-grid.** About 1.3–1.6× tile size for fusions and about 2× for legendaries. This is the first time "×4 height" can be expressed in absolute size.
- **Silhouette carries the change.** Posture moves from sitting or quadruped to upright or action stance. Limbs reach 35–40% of H with joints, and there are 5–8 angular points.
- **Fusion slot discipline** (sibling notes): body from parent A, head/crest from parent B, 60/30/10 palette.
- **Motion carries mass and personality** (Q5 table). Element trail particles are the main FX budget.
- **Legendary:** a hover with a detached shadow, plus a halo or ring readable as a single circle at this size.

**Layer C: larger 3D-style portrait (collection screen, unlock moment)**
- **Full lever table applies** (Q2): measured head share, eye shape, brow, fWHR-style face widening, ornaments.
- **Materials as a stage lever:**
  - babies: soft, matte, plush/vinyl-toy feel with big glossy eye highlights
  - fusions: harder materials (crystal, scale, armor, metal), sharper speculars
  - legendaries: emissive parts, gold metal trim, translucent or ethereal elements
- **Lighting:** babies get soft, even, warm key light. Fusions get a stronger rim light in the element colour. Legendaries get backlight/halo glow and a faint particle field.
- **Camera (inference, unsourced):** a slightly high angle looking down for babies (small, approachable) and a low angle looking up for legendaries (towering, majestic).
- **Room for "back pattern"-style detail** (Sugimori), such as runes, constellations and celestial patterns, which can't survive in Layers A/B.

**Cross-layer consistency checklist (identity anchors)**
1. Dominant hue family is identical in all layers and stages.
2. Eye style family stays consistent in highlight shape and colour, even as size and shape mature.
3. One signature motif per element is present in every layer and grows monotonically.
4. One baby "vestige" (freckle, stubby-hand gesture, cowlick) appears in the portrait of the final form.
5. Never shrink, never re-cutify a later stage (the Dragonite lesson).

### Gaps
- No source found documenting how a specific game keeps one creature consistent across tile/icon, field sprite and 3D portrait. Pokémon's menu icon vs battle model vs official art would be the case study, but it wasn't researched within budget.
- No research found on camera angle and perceived dominance or majesty for game portraits.
- The fill percentages and size multipliers are proposals, to be validated in-engine at actual device pixel density.
