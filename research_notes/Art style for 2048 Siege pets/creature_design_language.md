# Creature Design Language for 2048 Siege Pets: Cuteness, Evolution Lines, Fusion Readability, Elemental Shape Language, Tiny-Sprite Survival

Scope note: research done 2026-10-14. Web pages fetched in full are marked [fetched]. Claims taken only from search-result summaries (page not opened) are marked [snippet]; treat them as lower confidence. Everything under "Inferences" is my reasoning applied to 2048 Siege, not sourced fact.

## 1. Psychology of cuteness, attachment to virtual pets, and loss

### Takeaway
Baby-schema features (round face, high forehead, big eyes, small nose/mouth) reliably raise rated cuteness and the stated wish to take care of something. They engage reward circuitry, they work on animal faces as well as human ones, and children already respond to them. Cute images also make people more careful and narrow their focus. Children bond with simulated pets and treat them as real animals. Tamagotchi-style "death" causes real distress. All of this backs a design where pets are strongly baby-schema'd, so that losing one hurts, and it also warns that the hurt can tip into frustration (see section 5).

### Cited Findings
- Glocker et al. (2009) used a quantitative method to vary baby schema in infant photos. "High" versions had a rounder face and higher forehead; "low" versions had a narrower face and lower forehead. 122 undergraduates rated the high-schema faces as cuter and said they were more motivated to care for them than with the unmodified or low-schema faces. The paper describes this as the first experimental proof of baby-schema effects in real infant faces. — [Penn repository, Glocker et al. 2009](https://repository.upenn.edu/cog_neuro_pubs/11) [snippet]
- In a companion fMRI study (PNAS, 2009), the same group found that baby schema activates the nucleus accumbens, a key reward and appetitive-motivation structure, in nulliparous women (women who have never given birth). — [Glocker et al., PNAS 2009 (PDF)](https://www.cceb.upenn.edu/csa/assets/user-content/documents/PNAS-2009-Glocker.pdf) [snippet]
- Kringelbach et al., "On Cuteness: Unlocking the Parental Brain and Beyond," *Trends in Cognitive Sciences*, May 2016:
  - Cuteness is a strong protective mechanism for completely dependent infants.
  - It triggers "fast privileged neural activity," followed by slower processing in large brain networks that also handle play, empathy and possibly higher-order moral emotions.
  - It draws out caregiving, described as "slow, careful, deliberate, and long-lasting prosocial behaviours" that engage basic brain pleasure systems.
  - The authors extend cuteness beyond looks to infant sounds and smells.
  - [Kringelbach et al. 2016, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4956347) [snippet]
- Borgi et al. (2014, *Frontiers in Psychology*) varied baby schema in images of humans, dogs and cats. Children aged 3–6 rated puppies, kittens and babies as cuter than adult versions. Baby schema also changed where they looked, both at infantile images and at specific facial features. The effect is "not simply limited to human faces." The paper defines baby schema as "a round face, high forehead, big eyes and a small nose and mouth." — [Borgi et al. 2014, Frontiers (PDF)](https://www.frontiersin.org/articles/10.3389/fpsyg.2014.00411/pdf) [snippet]
- Nittono et al. (2012, *PLoS ONE*), "The Power of Kawaii":
  - Fine-motor dexterity improved 43.9% after viewing baby-animal images, versus 11.9% after adult-animal images.
  - Visual search improved 15.7% versus 1.4%.
  - Cute images weakened the global-precedence effect, meaning attention narrowed toward detail.
  - In short, cuteness encourages careful behaviour.
  - [Nittono et al. 2012, PLoS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0046362) [snippet]; [Hiroshima Univ. repository](https://ir.lib.hiroshima-u.ac.jp/00033560)
- Simon Fraser University study of 51 children in Grades 4–5 who cared for a virtual pet dog for three weeks:
  - Empathy and humane-attitude scores rose significantly.
  - Children with stronger bonds to the pet had higher empathy scores.
  - The longer they played, the higher their humane-attitude scores.
  - Most said they formed an emotional bond and regarded the virtual dog "as a real pet with its own emotions, needs and interests." The researchers called this bond formation an unexpected finding.
  - [SFU research project page](https://sfu.ca/education/research/research-projects/computer-simulated-animals-empathy.html); [SFU Summit thesis record](https://summit.sfu.ca/item/9146) [snippet]
- "Tamagotchi effect" is the general term for emotional attachment to machines and software agents. An original Tamagotchi left alone would "die" within about half a day, which caused emotional distress and forced a device reset. — [Wikipedia: Tamagotchi effect](https://en.wikipedia.org/wiki/Tamagotchi_effect) (secondary/tertiary source)

### Inferences
- The baby-schema features that tested cuter are the same ones a "pet" brief should push to the maximum on babies (16) and keep through growth stages: round face/body, high forehead (large cranium relative to features), big eyes, small mouth and nose. Borgi shows the effect carries over to animal faces, which supports non-human creatures. Children's responses suggest it is fairly universal across a broad mobile audience.
- Nittono's "careful behaviour" result fits a game where players protect fragile things: cute pets may nudge players toward cautious, protective play, which is exactly the "caring" mood wanted.
- Kringelbach names sound as a cuteness channel. Cute vocal cues (squeaks, coos on merge or hatch) are likely a cheap boost to attachment on top of visuals. This is not tested for games here.
- The Tamagotchi precedent shows the downside of permanent loss: distress, then disengagement (the "reset"). Tuning pets for maximum cuteness strengthens attachment and also raises the frustration risk when a pet is destroyed. Pair it with the mitigations in section 5.

### Gaps
- No peer-reviewed studies found specifically on Neko Atsume or Pokémon GO buddy attachment within this tool budget.
- No game-specific study found applying Kahneman–Tversky loss aversion to losing a creature. The general loss-aversion principle is well known but was not re-sourced here.
- No empirical study found that compares art styles (2D chibi vs 3D toy vs pixel) on measured attachment or caretaking motivation. Any style ranking is inference.

## 2. How professional designers build evolution lines and fusions that stay readable

### Takeaway
Game Freak often designs the final form first and then "reverse-engineers" the earlier stages. Each line has one defining feature (e.g., fangs) that grows across stages, with the biggest jump at the last evolution. The design brief also requires every creature to stay befriendable. Fusion systems that read well use a strict, consistent split: Onsager's Pokémon Fusion takes body/shape from parent A and face and colors from parent B. Cassette Beasts cuts every monster into modular animated parts and swaps them procedurally, mixing types, stats and moves as well.

### Cited Findings
- Ken Sugimori, Nintendo Dream (2011), on the Black/White designs:
  - "Haxorus' pre-evolutions were reverse-engineered from Haxorus' design." The defining feature, its fangs, guided the process, and the most dramatic change happens between Fraxure and Haxorus.
  - Seismitoad's line was built the same way: designers started from Seismitoad's head and "worked backward from there to come up with the pre-evolutions."
  - [Nintendo Dream 2011 interview, trans. Dr. Lava](https://lavacutcontent.com/ken-sugimori-nintendo-dream-6/) [fetched]
- Same interview: Sugimori says "any Pokemon should be able to become your friend." Creatures based on scary ideas are therefore kept appealing; Yamask's "blank facial expression is its most charming feature." Lines carry a story motif across stages (Vullaby nests in bones; Mandibuzz's pose forms "an upside-down skull"). Some lines started from type/concept briefs: Klink had to be "something inorganic," and Pawniard had to be "Steel/Dark type" and "urban." — [Nintendo Dream 2011, trans.](https://lavacutcontent.com/ken-sugimori-nintendo-dream-6/) [fetched]
- Pikachu's silhouette was originally very round. Game Freak changed it to be easier to animate and more expressive by lengthening the back and defining the neck. — [GoNintendo summary of Game Freak on Pikachu's creation](https://gonintendo.com/stories/310443-game-freak-goes-into-great-detail-on-the-creation-of-pikachu); [Siliconera](https://www.siliconera.com/?p=703222) [snippet]
- Pikachu was originally planned to have a second evolution, "Gorochu," with large fangs and two horns. In other words, the planned final stage escalated by adding pointed features. — [Siliconera](https://www.siliconera.com/pikachu-originally-second-evolution-called-gorochu-large-fangs-two-horns/) [snippet; headline-level detail]
- Cassette Beasts (Bytten Studio). Jay Baylis (artist, writer, co-founder), interviewed by Aaron Potter, 22 Aug 2022:
  - "Every monster is designed twice. Once as a still sprite…"
  - Animator Michael Azzi "animates them as if it's a single monster, and then I take them apart and design them in pieces and then assemble them in the engine. The fusion system then combines the two assembled ones by mixing their parts up."
  - "It's all procedural… I'm not able to animate a unique fusion for everything… you make a LEGO version and then the fusion swaps those two parts and combines them."
  - "We've got 120 monsters… the fusion system number puts things up to 14,000. Obviously, a lot of those will look similar…"
  - On art style: "a weird timeline where they stayed pixel art and went more HD."
  - [Film Stories / Wireframe interview](https://filmstories.co.uk/gaming/creature-collecting-gets-an-analogue-upgrade-in-cassette-beasts/) [fetched]
- Cassette Beasts fusion combines the two forms' elemental types and stats, and gives access to both move sets. Any two of the 120 forms can fuse, giving 14,000+ combinations. — [Gematsu, June 2022 Fusion trailer](https://www.gematsu.com/2022/06/cassette-beasts-fusion-trailer) [snippet]
- Fusion is directional: Pombomb (dominant) + Bansheep gives "Pomsheep," and the reverse gives "Banbomb," a different-looking monster. The names are portmanteaus that signal both parents. — [Cassette Beasts official site](https://www.cassettebeasts.com/cassette-beasts/) [snippet; exact page for this claim not confirmed]
- The fusion mechanic is reportedly inspired more by Steven Universe than by Pokémon fandom: fusions are temporary and tied to the relationship system. — [PC Gamer](https://www.pcgamer.com/uk/pokemon-fusion-style-rpg-revealed-by-former-stardew-valley-devs/) [snippet; attribution to this exact page not confirmed]
- Alex Onsager's Pokémon Fusion generator (August 2010):
  - It takes "the body and overall shape" of the first Pokémon and splices on "the face and color scheme of the second."
  - Technically it resizes and places the head on the new body, then recolors the body to match the new head.
  - Onsager hand-cut 151 heads. The site covered 11,325 combinations and went viral again in 2019.
  - [Inverse, 2019](https://www.inverse.com/article/57026-pokemon-fusion-website-twitter); [Kotaku](https://kotaku.com/how-the-website-that-lets-you-create-frankenstein-pokem-510517336) [snippet]

### Inferences
- **Continuity anchors.** Across 16→32→…→128 growth, keep three things fixed:
  - (a) eye style and face layout
  - (b) the element palette
  - (c) one signature element motif that only grows (flame tuft gets taller, ice crystals multiply)

  This mirrors Sugimori's "defining characteristic grows, biggest change at the final stage." Babies at 16 should be the most baby-schema'd. Later stages can lengthen limbs and necks the way Pikachu's back and neck were lengthened, but keep a large head.
- **Design the 256 fusions and the 4096 legendaries first,** then derive the babies backward, as Game Freak did with Haxorus and Seismitoad. The 8 baby designs then have to carry exactly the motifs the 28 fusions will recombine.
- **Readable fusion rule (the Onsager/Cassette Beasts split).** Each fusion gets:
  - its body silhouette and base shape from one parent
  - its face/head motif from the other
  - a split palette, e.g. ~60% primary parent color, ~30% secondary, plus a small accent

  Chaos comes from blending everything 50/50. Clarity comes from assigning each parent fixed "slots."
- **Hand-design, but keep the slot discipline.** With only 28 fusions (C(8,2)), hand-designing each is practical, unlike Cassette Beasts' 14,000. Hand design can fix the "a lot of those will look similar" problem Baylis admits to. Fixed slots still keep fusions instantly decodable. Example: Frostnova (fire+ice) = ice-crystal body silhouette + flame crest/tail + split orange/cyan palette.
- **Cassette Beasts proves modular parts can be animated procedurally.** That fits 2048 Siege's code-driven squash/stretch, bobbing and tint: parts can be layered sprites (body, crest, tail, eyes) moved separately in code.
- **Legendary (4096).** Escalate by adding a crown, halo or aura, a larger silhouette (possibly breaking out of the block frame) and more pointed accents, as Gorochu's fangs and horns did. Keep the face cute so the "friend" contract holds.
- **Names.** Portmanteau naming (Pomsheep-style) helps players decode both parents; "Frostnova" already fits this pattern.

### Gaps
- No primary sources reached on Temtem (Crema), Palworld, Digimon, Monster Hunter or Spore within the tool budget.
- No Bytten statement found on how fusions pick palette or color inheritance, or which parts come from the dominant vs secondary monster.

## 3. Shape language: encoding element through shape, not just color

### Takeaway
Lab evidence shows people prefer curved contours and react to sharp angles as mild threats; the amygdala responds more to sharp objects. Character-design practice turns this into the circle (friendly/safe), square (sturdy/reliable) and triangle (dangerous/dynamic) vocabulary. Game Freak briefs creature lines by type and concept ("inorganic," "Steel/Dark, urban"), which shows type can drive form, not just palette.

### Cited Findings
- Bar & Neta: people prefer objects with curved contours over sharp-angled ones. The proposed reason is that sharp contour transitions signal threat and trigger a negative bias. In the 2006 study, 140 object pairs (real and abstract) were rated, and curved versions were liked more. A 2007 fMRI follow-up found the amygdala more active for sharp everyday objects than for curved versions. — [Bar & Neta 2007, Neuropsychologia (PDF)](https://canlab.unl.edu/sites/unl.edu.cas.psychology.cognitive-and-affective-neuroscience/files/media/file/BarNetaNeuropsych2007.pdf); [Moshe Bar lab PDF](https://moshebar.org/_files/ugd/a77db7_5598c791a95a4436960eb2fe671ca1e5.pdf) [snippet]
- Practitioner shape-language vocabulary:
  - Circles: safety, friendliness, innocence; used for protagonists, children and sidekicks.
  - Squares: stability, strength, reliability, stubbornness; used for strongmen, protectors and immovable obstacles.
  - Triangles: danger, energy, aggression, speed, cunning; used for villains, tricksters and fast heroes.
  - [Pixune, "Shape Language Technique"](https://pixune.com/blog/shape-language-technique/) (studio blog, secondary); [21-Draw](https://www.21-draw.com/pl/why-is-shape-language-so-important/) [snippet]
- Game Freak creature briefs specify type and material: Klink "something inorganic," Pawniard "Steel/Dark type… urban." — [Nintendo Dream 2011, trans.](https://lavacutcontent.com/ken-sugimori-nintendo-dream-6/) [fetched]

### Inferences
- **Body vs motif rule.** Keep every pet body circle-based, because pets must read as safe and lovable per Bar & Neta and baby schema. Put each element's shape identity in a motif attached to that body: ears/crest, tail, back or cheeks.
  - Pikachu is the canonical precedent: a round body with pointed ears and a zigzag tail encodes "electric" mostly through tail shape. This is from general knowledge, not fetched.
  - Triangles and spikes are then reserved for small motifs on fire and lightning pets, and for the enemy heroes. Enemies can use more angular silhouettes so friend and foe separate by shape as well as color.
- **Proposed element shape lexicon** (one base glyph + motif slot per element; each glyph must read in a single-color silhouette):
  - Fire: upward teardrop/flame tuft on head, flicker tail; teardrop body tapering up.
  - Ice: hexagonal/faceted crystal shards on back or ears; a slightly faceted (low-poly) body edge; snowflake cheek mark.
  - Lightning: zigzag/chevron tail or ears; jagged forelock; asymmetric bolt mark.
  - Poison: drippy bottom edge, bubbles, one droopy blob tendril; a goo body that "melts" at the base.
  - Earth: squarish/boulder body (square = sturdy), flat-top rock plates, stubby legs.
  - Wind: spiral/curl motifs, crescent "swoosh" tail, wispy cloud puffs; asymmetric flowing line.
  - Metal: rectangular plates, rivets, a gear or bolt motif, hard straight highlight edges (Game Freak's "inorganic" brief precedent).
  - Nature: leaf ears or sprout on head, rounded petal shapes, vine tail.
- **Fusions.** Each fusion should show two glyphs at once, one per slot: primary parent drives body base shape, secondary parent drives head or tail motif. That way element identity survives for colorblind players and under code-driven tint, where the color channel is temporarily overridden (hit flash, slow tint, burn tint).
- **Overlapping colors.** Some elements naturally share palettes (nature green vs poison green/purple; ice cyan vs wind pale blue/white; metal grey vs earth brown-grey). Shape glyphs are what separate these pairs.

### Gaps
- Bar & Neta studied objects, not characters. The circle/square/triangle mapping for characters comes from practitioner writing, not controlled studies.
- No GDC talk or designer interview found within budget that explicitly documents element-to-shape mapping for a creature roster (e.g., Temtem types).

## 4. Tiny sprites (32–60 px): which features survive and which art styles preserve them

### Takeaway
At small sizes, sprites read through silhouette first, then high-contrast eyes, then a few large color blocks. Fine detail and many colors become noise. Chibi exaggeration of head and eyes is the standard fix. Cassette Beasts shows that pixel art can carry modular fusions. No study directly ranks art styles for tiny creature sprites, so the style comparison below is inference.

### Cited Findings
- Readable small pixel art relies on strong silhouettes, limited palettes and clear contrast between gameplay elements and background, not on detail. "If you can't tell what an object is without a black border, your silhouette is the problem." — [Bugnet, "How to make pixel art that reads clearly"](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly) (practitioner blog) [snippet]
- Chibi treatment greatly exaggerates head and eyes so they are easier to make out at small size. At 16×16, eyes are often 1–2 px and must be high-contrast. More than ~5–6 colors in a 16 px sprite tends to turn muddy. Recommended check: fill the sprite with one color and see if it is still identifiable. — [Sprite-AI 16×16 guide](https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art) (low-authority tool vendor guide; consistent with Bugnet) [snippet]
- Pikachu's very round original silhouette was reworked (longer back, clearer neck) to be more expressive and easier to animate. Pure circles can be too featureless for animation and expression. — [GoNintendo](https://gonintendo.com/stories/310443-game-freak-goes-into-great-detail-on-the-creation-of-pikachu) [snippet]
- Cassette Beasts ships modular, procedurally recombined fusions as "HD" pixel art. — [Film Stories interview, Aug 2022](https://filmstories.co.uk/gaming/creature-collecting-gets-an-analogue-upgrade-in-cassette-beasts/) [fetched]

### Inferences
- **Feature survival at 55–60 px on-screen (about 16–24 px of "readable" detail).** In order:
  1. Silhouette, including one protruding element motif (ear/crest/tail).
  2. Eyes: large, dark, with a white highlight dot. This is the main cuteness and emotion channel and must be at least ~10–15% of sprite width each.
  3. 2–3 flat color blocks: body, belly/face mask, motif accent.
  4. A dark outline separating the pet from the colored block tile behind it.

  Lost at this size: fur or scale texture, small limbs, fine patterns, subtle gradients, mouth detail beyond a simple glyph.
- **Chibi "sticker" with thick outline.** Best fit overall.
  - Thick outlines guarantee silhouette separation from the 2048 tile color and busy TD effects.
  - Flat fills survive code tinting predictably.
  - Big head and eyes encode baby schema directly.
  - Squash/stretch on a vector or high-res raster looks clean.
  - Supports the motif-slot system (parts as separate layers).
  - Risk: generic look. Mitigate with a strong per-element glyph lexicon.
- **Soft 3D toy/clay render.** Highest "huggable" tactile cuteness at large sizes (round volume, specular eyes).
  - At 55 px, soft shading lowers edge contrast and blurs silhouettes. Tint multiplies with baked shading and gets muddy. Element glyphs like ice facets or poison drips may dissolve into gradients.
  - Workable only with a rim light or outline added, a reduced shading range and oversized motifs.
  - Good choice for the 4096 legendary or collection-screen portraits, where size is larger.
- **Flat vector.** Very readable and scalable, cheap to tint, and easy to modularize.
  - Weaker on "alive" and attachment cues unless eyes get highlights and there is some cel-shading.
  - Can feel sterile or "icon-like," which risks reading as a game piece rather than a pet.
- **Pixel art.** Proven for creature collectors and modular fusions (Cassette Beasts), and charming.
  - But 2048 Siege animates by code (squash/stretch, bobbing). Non-integer scaling of pixel art causes shimmer and mixed pixel sizes unless rendered with nearest-neighbor at integer steps, which conflicts with smooth squash/stretch.
  - At ~24–32 px native, eyes become 1–2 px and lose expression range, which hurts the "caring" goal.
- **Cross-style rules:**
  - Keep the head about 50–60% of total sprite height for babies, about 40–50% for later stages.
  - Eyes are the highest-contrast element on the sprite.
  - Motif must break the round silhouette in one consistent direction per element.
  - Max ~4–5 colors per pet plus outline.
  - Test every pet as a single-color silhouette at 55 px and in grayscale. Element should be guessable from shape alone.

### Gaps
- No authoritative source (GDC talk or paper) found with measured minimum feature sizes for mobile sprites, or comparing styles' readability at a given pixel size.
- No source checked on how code-driven squash/stretch interacts with pixel-art scaling. The point above is technical inference.

## 5. Making creature loss emotionally meaningful without frustrating players

### Takeaway
Permanent creature loss creates strong attachment and tension, but designers and researchers both note it scares players off unless it feels meaningful and the player has some control over it. Fire Emblem: Awakening's optional Casual mode widened the audience without removing Classic permadeath. Research on permadeath points to "meaningfulness" and framing as what turns loss into renewed motivation rather than quitting.

### Cited Findings
- Fire Emblem: Awakening (2012/2013):
  - Project manager Masahiro Higuchi and director Genki Yokota both initially opposed Casual mode (no permadeath). Higuchi's argument: since fallen units can't be resurrected, players must think about the value of lives, which makes victories more exhilarating.
  - Higuchi admitted permadeath kept people from trying the game. Many were intimidated by permanent party death, and offering a choice was meant to widen appeal.
  - Yokota himself switched to Casual because he likes the characters and doesn't want them to die.
  - [Engadget, 3 Apr 2013](https://www.engadget.com/2013-04-03-intelligent-systems-divided-over-fire-emblem-awakenings-casual.html); [Nintendo Life, Apr 2013](https://www.nintendolife.com/news/2013/04/talking_point_fire_emblem_awakening_the_big_casual_mode_debate) [snippet]
- A study grounded in Player–Avatar Relationship theory (Don't Starve Together, 65 participants) found that framing death as meaningful could turn negative emotions into renewed motivation to keep playing. — [NCCU thesis record](https://nccur.lib.nccu.edu.tw/handle/140.119/159388) [snippet]
- A Deakin University doctoral thesis argues that meaningfulness is a critical requirement for positive permadeath experiences. — [Deakin, "On the Nature of Permadeath Experiences in Video Games"](https://dro.deakin.edu.au/articles/thesis/On_the_Nature_of_Permadeath_Experiences_in_Video_Games/21282843) [snippet]. See also ["Fear, loss and meaningful play: Permadeath in DayZ," Journal of Gaming & Virtual Worlds 9(2)](https://www.doi.org/10.1386/jgvw.9.2.143_1) [title only from search; contents and authors not checked]
- XCOM: Enemy Unknown lead designer Jake Solomon is widely quoted saying permadeath evokes "dread and a real sense of loss in players, because it's something that they don't want and they can't undo." Losing a high-rank soldier is both emotional and a tactical setback because of resources invested. — reported in secondary permadeath essays surfaced by search ([GameBanshee, "Gone Forever"](https://gamebanshee.com/du3)) [snippet; UNVERIFIED. The Game Informer original of "Gone Forever" (16 Oct 2012), fetched, contains no Solomon quote; primary interview not located]
- Fire Emblem characters have individual personalities and stats, so a death "feels heavier after getting to know them." — [Game Informer, "Gone Forever," 16 Oct 2012](https://gameinformer.com/b/features/archive/2012/10/16/gone-forever-how-and-why-permadeath-affects-us) [search summary; the fetched page discusses attachment via narrative thematically without designer quotes]
- Original Tamagotchi death after about half a day of neglect led to distress and resets. — [Wikipedia: Tamagotchi effect](https://en.wikipedia.org/wiki/Tamagotchi_effect)

### Inferences
- In 2048 Siege the pet is both the player's resource (merge value) and the object of care. That is the XCOM double hit: emotional plus strategic. It strongly drives tension and also strongly drives rage-quits.
- Mitigations consistent with the sources:
  - (a) Player agency and warning. Pets show a scared or cracked face and a pulsing outline before death. Cuteness cues also make danger more legible: a frightened big-eyed face is read faster than an HP bar.
  - (b) Meaningful framing (DST study). A brief farewell animation, a memorial/"constellation" or graveyard collection page listing named pets and their highest tier, and a small residual (egg shard, essence that boosts the next hatch of that element) so loss feeds forward rather than to zero.
  - (c) Optional softer mode (Fire Emblem precedent), or a rare revive consumable, without removing permanent loss for players who want it.
  - (d) Naming or auto-naming pets to deepen attachment, which works because attachment grows with time and interaction (SFU finding).
- Art-direction implications:
  - Keep pets maximally cute and enemies more angular/triangular so threat is visible.
  - Give pets an expressive "hurt" and "afraid" eye state, since eyes survive at 55 px.
  - Make death animations gentle (fade/poof into sparkles) rather than gory. Gentle death keeps the emotional point (loss) without punishing the player visually. This last point is a design opinion, not sourced.

### Gaps
- No primary interview with Jake Solomon located. Treat the quote as unverified.
- No sourced example found of a merge or puzzle game with permanent loss of cute pets, nor any retention or quit-rate data on permadeath of collectible creatures in mobile games.
- No academic source found on memorial or graveyard features (e.g., XCOM's memorial wall) and their effect on frustration. Mentioned only as a design idea.
