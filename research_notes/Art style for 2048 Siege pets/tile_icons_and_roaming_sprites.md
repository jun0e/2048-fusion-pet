# Tile icons (creature inside a numbered square) and free-roaming creature sprites: precedents, layout rules, art styles for 2048 Siege

Research date: 2026-10-14. Scope: (1) the "map tile" art for 2048 Siege blocks of value 16+ (creature + square frame + big number, ~55-60 pt tile on a 375 pt phone); (2) fusion creatures (256+) roaming the playfield as ~40-60 px sprites. About 19 research calls; several primary sources were blocked (403) or had little content, and those are listed under Gaps.

Source quality legend: "(fetched)" = full page read; "(search snippet)" = taken from a search-result summary only, because the page was not fetched or could not be fetched. Treat snippet-only claims as weaker.

---

## Q1. Precedents: how games split a small tile between character art, number and frame

### Takeaway
The closest precedent is Threes! (2014). Its team tested about two dozen picture themes and dropped them because testers were confused. They kept the number as the main element and added a small, simple face whose detail grows as the value grows. The original 2048's mobile tile is 58 px, almost exactly 2048 Siege's tile size. Its numbers fill 26-60% of the tile height, so any creature art has to take space from the number, and the number should stay the dominant layer.

### Cited Findings
**Threes! (Sirvo: designer Asher Vollmer, illustrator Greg Wohlwend, composer Jimmy Hinson; iOS release 6 Feb 2014)**
- Team and release date: Threes is by Sirvo (Vollmer, Wohlwend, Hinson) and launched 6 Feb 2014 on iOS. 2048, a browser clone, followed in March 2014 — [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched)
- Themes tried and dropped: sushi tiles pairing fish and rice, chess pieces, animals, "broccoli and cheese soup", military insignia, hydrogen atoms and textile patterns. Testers were confused by the close to two dozen themes, Vollmer said they made the game feel "unwieldy and unnatural", and "in the end, they ended up where they started, with numbers" — [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched); [Engadget, 30 Jan 2014](https://www.engadget.com/2014-01-30-addictive-ios-puzzling-comes-in-threes.html) (search snippet)
- Wohlwend said the game "always wanted to be simple" — [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched)
- Art evolved from "lurid yet simplistic rectangles", to "a rough approximation of tribal folk art", to "cards of little monsters with googly eyes", to the final clean look. The team said the game "just wanted to be tiny all along, so making tiny little characters was the natural step", and that they don't think "Threes would be Threes without the characters" — [PocketGamer.biz, "Fighting the monsters: the making of Threes"](https://www.pocketgamer.biz/feature/58813/fighting-the-monsters-the-making-of-threes/) (search snippet; the fetch returned 403)
- Numbers vs. art, from the team's published development emails. Wohlwend: "Still going back and forth on whether or not the non-argyle tiles should have numbers on them. It's more visually pure without them, of course, but I sort of like the mathy context that the numbers give." The numbers stayed — [Sirvo, "Threemails" (570 development emails)](http://asherv.com/threes/threemails/) (fetched)
- Tile structure: 2 colored tiles (1 = blue, 2 = red) and 12 "threes" tiles from 3 to 6,144. The faces express emotions when tiles are paired. Higher tiles get stronger characters, for example the 384 tile has "a pirate personality with a large tooth and a pirate eyepatch". "The number tiles grow in character with their size" — [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched)
- Each number tile has its own face and personality and says short phrases as you move it. Larger numbers have names and bios — [Wikipedia/Sirvo mirror](https://wikipedia.com/wiki/Sirvo); [TidBITS, 21 Feb 2014](https://tidbits.com/2014/02/21/funbits-threes-is-good-company-for-iphone-and-ipad/) (search snippet)

**Original 2048 (Gabriele Cirulli, 2014): a size benchmark for 2048 Siege**
- Desktop tile is 107 × 107 px. Font sizes: 55 px for 1-2 digits, 45 px for 128/256/512, 35 px for 1024/2048, 30 px for "super" tiles. Font is bold "Clear Sans", "Helvetica Neue", Arial. Border-radius 3 px, gap 15 px — [gabrielecirulli/2048 main.css](https://raw.githubusercontent.com/gabrielecirulli/2048/master/style/main.css) (fetched)
- Mobile (max-width 520 px) tile is 58 × 58 px with a 10 px gap. Font sizes: 35 px for 1-2 digits, 25 px for 128-512, 15 px for 1024/2048, 10 px for super tiles. That is about 60%, 43%, 26% and 17% of tile height — [gabrielecirulli/2048 main.css](https://raw.githubusercontent.com/gabrielecirulli/2048/master/style/main.css) (fetched)
- Text color: dark text on the light 2 and 4 tiles (#eee4da background), light #f9f6f2 text on 8+ tiles — [same CSS](https://raw.githubusercontent.com/gabrielecirulli/2048/master/style/main.css) (fetched)

**Pokémon puzzle games (Genius Sonority: Pokémon Trozei, Battle Trozei, Shuffle, Café Mix/ReMix)**
- Pokémon Shuffle uses cute chibi-style icons. Players match 3+ identical Pokémon icons on a 6×6 puzzle area. The game has "headshot portraits for each Pokémon" — [Bulbapedia: Pokémon Shuffle](https://bulbapedia.bulbagarden.net/wiki/Pokémon_Shuffle); [Siliconera review](https://www.siliconera.com/pokemon-shuffle-not-the-puzzle-game-of-your-dreams/) (search snippets)
- "Genius Sonority's Pokemon puzzle games have relied on exaggerated depictions of characters' faces for quite some time." The style started in the original Trozei and "really came into fashion" with Battle Trozei and Shuffle (said in the context of Pokémon Café Mix) — [Siliconera](https://siliconera.com/?p=842642) (search snippet; the fetch returned 403)

**Square monster-collection icons (Summoners War, Puzzle & Dragons)**
- Summoners War: monsters are summoned at 1-star to 5-star grade, with 4- and 5-star the rarest. Each monster shows an attribute icon (e.g., a yellowish swirl means Wind). A toggle switches between base and awakened art. Light and Dark monsters are rarer than Wind, Fire and Water — [SummonersWarSkyArena.info](https://summonerswarskyarena.info/?p=16908) (search snippet)
- Puzzle & Dragons uses five attributes (Fire, Water, Wood, Light, Dark) — [JoJo Wiki: Puzzle & Dragons](https://jojowiki.com/Puzzle_and_Dragons) (search snippet). I found no sourced description of P&D's icon frame layout (see Gaps).

### Inferences
- The 2048 CSS shows a 2-digit number alone already takes about 60% of a 58 px tile's height. Once a creature is added, 2048 Siege's on-grid creature values (16, 32, 64, 128) need smaller numbers. A reasonable range is about 22-28 pt for 2 digits and 18-22 pt for 3 digits. That is still larger than 2048's own 15 px for 4-digit tiles, so it falls inside the readability range players already accept.
- Threes! is the strongest evidence for "number first, character second". Picture-only themes confused testers, and the version that worked kept the number large and centered with a small face added. 2048 Siege should do the same: the creature decorates and rewards, and the number carries the gameplay.
- On the board, only 16-128 need creature art inside a tile. At 256 the creature leaves the grid, so 4-digit values never need to share a tile with a creature. That lets the tile layout be tuned for 2-3 digits.
- Monster-collection icons (Summoners War, Pokémon Shuffle) show the creature's head or bust large and push meta-information (stars, attribute) into small icons along the edges or corners. That suits icons whose main job is identifying the creature, but in 2048 Siege the main job is reading the value, so the priority flips.

### Gaps
- Not found or not verified (my recollection, check before stating as fact): P&D monster icons put the creature's bust inside a frame colored by main attribute, with the sub-attribute as a small corner wedge and level/+ values as small outlined text in the corners. FGO and Summoners War icons put rarity stars along the bottom edge and an element/class badge in a corner. Random Dice uses pip count (1-7) to show merge rank on a dice face colored by dice type. Suika Game fruits have simple faces. Merge Dragons/Merge Mansion items sit on tiles with no number, and the item art itself shows the tier. Candy Crush uses no faces on its candies. I found no sources for any of these in this pass.
- The Threes "notes" page (threesgame.com/notes) was not found. The PocketGamer.biz making-of article returned 403.
- I found no designer statement on how Threes faces are placed relative to the number (e.g., face below the number). AV Club (Q3) describes low tiles as two "eyes" and a flat "mouth", but gives no layout measurements.

---

## Q2. Design rules for tiny framed icons: crop, number placement, contrast, frame coding, growth inside a fixed frame

### Takeaway
Published icon guidance agrees on a few rules. Use one simple, distinct silhouette or face rather than a scene. Use chunky shapes and thick outlines with no hairline detail. Use high contrast and saturated colors. Shape and value must carry identity, with color as a backup for colorblind players. Threes! showed how to express growth inside a fixed frame: keep the same base design and add features one at a time (an eye, a mouth, a second eye, horns, props), rather than changing species at each step.

### Cited Findings
- Game Developer, "Icon design rules you should know" (Iuliana U, 10 Mar 2020). Avoid similar shapes across icons, because icons with similar shapes "look like they belong together/do similar things". Minimize elements, because each extra element reduces contrast and slows identification. Keep one consistent style. Don't rely on text. Design for small scale, since beautiful details become "a jumbled mess" when scaled down. Make shape primary and don't use color to compensate for weak design, because color-only coding fails colorblind users — [Game Developer](https://www.gamedeveloper.com/design/icon-design-rules-you-should-know) (fetched)
- Game icon guidance: avoid thin lines because hairline details vanish at small sizes, and use chunky shapes and bold outlines. "A character face, a single iconic object, or a strong symbol beats a busy scene." Use high-contrast, saturated palettes. Outlines should be thick enough to stay clear at small sizes — [MadeGoodDesigns: Game Icon Design](https://madegooddesigns.com/?p=5494); [GamineAI: game icon design principles](https://gamineai.com/blog/creating-game-icons-and-logos-design-principles-game-branding) (search snippets)
- Icons should stay identifiable "as small as 40 x 40 pixels in some contexts" — [Meta/Facebook Instant Games asset design guidelines](https://developers.facebook.com/documentation/games/launch/reviews/asset-design-guidelines) (search snippet; attribution not confirmed by a fetch)
- Readability heuristic called the "Three-Read Rule": first the silhouette at icon scale, then color blocking at squint distance, then optional detail only if it strengthens the first two reads. Also: "Every enemy type, pickup, and hazard should be distinguishable as a filled shape" — [Bugnet blog, "Readable game art: why clarity beats detail"](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail) (search snippet; the fetch returned only the blog index, so the text is unverified)
- Shape language: a strong silhouette makes a character recognizable instantly, even at a distance — [RocketBrush blog](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent) (search snippet)
- Growth inside a fixed frame (Threes emails). Wohlwend: "early on it's easy to see how you're 'building the argoyle' by adding an eyeball, a mouth, then two eyes etc." He wanted the creatures to look "cut from the same cloth as opposed to separate species", leading to a "King Argoyle" at the top. He tried horns, stacked features and expressions to show numeric progression. Vollmer worried about "visual noise" — [Sirvo, Threemails](http://asherv.com/threes/threemails/) (fetched)
- Two-axis coding in Threes prototypes: "genus = purple, green, white, orange" (color) and "species = dot, polka, stripe, etc." (pattern), so color and pattern carried separate information — [Sirvo, Threemails](http://asherv.com/threes/threemails/) (fetched)
- 2048's number contrast rule: dark text on light low tiles, light text on saturated high tiles — [2048 main.css](https://raw.githubusercontent.com/gabrielecirulli/2048/master/style/main.css) (fetched)

### Inferences
Concrete layout proposal for a 56-60 pt tile with a ~3 pt, 4-piece progress border (about 50 × 50 pt inner area):
- **Recommended layout, "number on top, creature peeking":** the number sits centered in the upper ~55% of the tile. Use the same heavy rounded sans for every value, with a 2-3 pt dark stroke or a soft dark plate behind it so it reads over art. Size about 24-28 pt for 16/32/64 and 20-22 pt for 128. The creature shows head and shoulders only, anchored to the bottom inner edge and cropped by the frame, as if peeking over a windowsill. It takes the lower ~45%, so the head is about 22-28 pt tall and the eyes cover at least 8-10 pt across. The number may overlap the top of the head, but never the eyes.
- **Alternative, "creature fills the tile, number badge":** the creature fills about 75% of the inner area and the number goes on a pill-shaped plate at the bottom or top-left corner at 14-18 pt. It looks more like a collectible, but it breaks the Threes and 2048 lesson that the number is the gameplay, so it is not recommended for the merge board. It suits collection or bestiary screens better.
- **Crop:** use a head or head-and-shoulders crop on tiles, not the full body. A full body at about 25 pt tall leaves a face only about 8-10 pt wide, while a head crop doubles face size inside the same box (consistent with the face-over-scene guidance). Shoot every creature from the same front or slight 3/4 angle so tiles look consistent.
- **Element coding (8 elements):** give each element a frame or tile color and also a unique shape cue, because color-only coding fails colorblind players (Game Developer rule 8). Shape cues can be a corner glyph (flame, snowflake, bolt, droplet/skull, rock, swirl, gear, leaf), a frame edge pattern, or a background pattern (Threes "genus color + species pattern"). Eight hues on a small board include risky pairs: nature/poison (two greens), fire/earth (orange/brown), ice/wind (pale cyan/pale green), metal/lightning (grey/yellow at low saturation). Separate each pair by value (light vs dark) as well as hue.
- **Showing growth within the fixed frame (16 → 32 → 64 → 128):** follow Threes' additive approach. Keep the same base creature and add one signature feature per merge: bigger eyes or pupils, then a crest or horn, then an element accessory, then a glow or aura. Optionally let the head grow from about 40% to 55% of the tile so it "fills the window". Frame ornaments can step up too: plain → corner studs → small wings or crown on the frame. The background inside the tile can move from flat element color, to a radial gradient, to a sparkle at 128, signaling "about to leave the grid".
- **Contrast stack, back to front:** tile background (mid value, element hue), then creature (outlined, lighter or more saturated), then number (lightest or darkest value on the tile, with a stroke). The number must win the squint test, the creature's eyes come second.

### Gaps
- Apple HIG and Material icon pages were not fetched in this pass, so there are no cited platform rules for minimum stroke weight or optical grid.
- I found no published measurements (percent of tile area) for P&D, Summoners War, FGO, Pokémon Shuffle or Random Dice icons.

---

## Q3. How personality, cuteness and humor survive at tiny size

### Takeaway
Threes! shows that a flat line for a mouth plus two dots for eyes is enough personality for low values. Personality should grow with value through bolder features and props (the 384 pirate with a tooth and eyepatch) and through animation and voice, not static detail. The Genius Sonority Pokémon puzzle games rely on exaggerated faces for the same reason.

### Cited Findings
- AV Club, "The iPhone hit Threes gives you cuteness where you least expect it" (John Teti, 20 Feb 2014). Low numbers have just "a flat 'mouth' and two 'eyes'". "The bigger numbers have bolder, more fully formed personas than the little ones." Tiles "grumble, sigh, and playfully heckle you". A merge moment: "The sixes gaze into each other's eyes in anticipation of their mathematical destiny" — [AV Club](https://www.avclub.com/the-iphone-hit-threes-gives-you-cuteness-where-you-leas-1798266309) (fetched)
- Threes 384 tile: "a pirate personality with a large tooth and a pirate eyepatch". Tiles "express emotions when paired" — [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched)
- Threes characters were built by adding single facial features, one at a time (eyeball → mouth → two eyes) — [Sirvo, Threemails](http://asherv.com/threes/threemails/) (fetched)
- Genius Sonority Pokémon puzzle games rely on "exaggerated depictions of characters' faces" — [Siliconera](https://siliconera.com/?p=842642) (search snippet)
- For small game icons, an exaggerated expression with a thick outline is the recommended way to keep a face readable — [Carat prompt gallery, Brawl Stars style profile icon](https://carat.im/en/prompt-gallery/brawl-stars-style-profile-icon) (search snippet; low-authority source, an AI-prompt gallery)

### Inferences
- Per creature, budget at most three readable elements on a tile: (1) eyes, the biggest and highest-contrast feature, with a white highlight dot; (2) one signature feature in silhouette, such as a flame tuft, ice horn, bolt-shaped ears, mushroom cap or leaf sprout; (3) element color. Everything else is noise at about 25 pt.
- Put humor in expression changes and motion, not in drawn detail. Threes' biggest emotional effect came from paired tiles reacting to each other and from voices. In PixiJS, cheap swaps do this well: blink, look toward a matching neighbor before a merge, squash on landing, a grumpy face when stuck. Each is a small set of eye/mouth frames over a static body.
- For a cute-to-majestic arc while still on the grid (16-128), stay in the cute register: big eyes, small or no mouth, round silhouette. Save the shift to "cool" for the roaming fusion form (256+), where the larger full-body sprite has room for sharper silhouettes and narrower eyes.

### Gaps
- No emoji design guideline (Apple, Google Noto, Twemoji) was fetched, so there is no citation for minimum eye/mouth sizes in tiny faces.
- I found no source quantifying expression legibility thresholds in pixels.

---

## Q4. Free-roaming small creature sprites on a busy playfield (readability, separation from enemies and effects, idle/wander behavior)

### Takeaway
The cited evidence here is thin but consistent. Readability on a small top-down mobile screen depends on distinct silhouettes, strong value contrast between gameplay layers (background vs. units vs. effects), and saturated character colors against a calmer ground. Clash Royale's green arena with vibrant units is a cited example. Specific conventions for friendly roaming creatures (ground shadows, allegiance rings, wander loops) were not found in primary sources in this pass. The items below about those conventions are inferences.

### Cited Findings
- Players "rely on silhouettes, motion, and quick visual cues rather than analyzing detail" and parse scenes "in glances measured in milliseconds". Art should use "distinct silhouettes, strong value contrast between gameplay layers, and clear focal points" — [Bugnet blog](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail) (search snippet; unverified)
- "If two threats share a silhouette, players will conflate them at the worst moment" — [Bugnet blog](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail) (search snippet)
- Readability matters on mobile "because players need to get an immediate read on the game, especially from a top-down RTS camera angle" (Blizzard on Warcraft Arclight Rumble) — [PocketGamer.biz](https://www.pocketgamer.biz/news/78734/translating-the-warcraft-aesthetic-to-mobile-arclight-rumble/) (search snippet)
- In Clash Royale, the green arena contrasts with vibrant character and object colors so each element is easy to recognize — [Platzi course, "Análisis de legibilidad de videojuegos"](https://platzi.com/cursos/animacion-videojuegos/analisis-de-legibilidad-de-videojuegos/) (search snippet)
- Supercell (Kalle Väisänen, Nov 2019): Clash characters are stylized with a "boxy look" and "simpler color gradients". "Keeping things simple is easy to say but hard to master" — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html) (fetched)
- Bright red/blue highlights separate friend from foe in chaotic fights, and strong silhouettes matter on small mobile screens — [OpenSkillIndex, game-art-director](https://openskillindex.com/skills/alterlab-ieu-alterlab-gameforge-game-art-director) (search snippet; low-authority AI-skill page, weak support)
- Kingdom Rush (Ironhide) uses a "detailed, cartoony style", and its maps "read clearly at a glance without sacrificing visual charm" — [Wikipedia: Kingdom Rush](https://en.wikipedia.org/wiki/Kingdom_Rush); [WN Hub interview](https://wnhub.io/news/other/item-14983) (search snippets)

### Inferences
These are proposed conventions for 2048 Siege's 40-60 px roaming fusion creatures. They follow from the cited principles plus common genre practice, and none were verified against a specific game in this pass.
- **Separating allies from enemies:** enemies walk down 4 lanes, so give allies an always-on cue that enemies never get. Options: a soft element-colored ground ring or ellipse under the feet (also tells the player which element it is), or a 1.5-2 px light rim or outline in a warm white. Enemies get a dark or desaturated outline and a red-tinted ground shadow. That gives allegiance a shape and value channel, not just a hue channel (Game Developer rule 8).
- **Grounding:** add a dark, 30-40% opacity blob-shadow ellipse under each creature, so it reads as standing on the playfield, not floating over UI. Flying creatures get a smaller, offset shadow to show height.
- **Layer value plan:** keep the background and board mid-value and low-saturation. Creatures are the most saturated layer. VFX (projectiles, explosions) use the brightest values but are short-lived and additive. Keep enemies a step below allies in saturation so allies win the glance (the Clash Royale green-ground contrast logic).
- **Silhouette distinctness:** with 28 fusion creatures and many enemy types sharing a small screen, each fusion creature needs a silhouette distinct from every enemy at about 40 px. Test with black filled shapes (the Bugnet "filled shape" test).
- **Wander/idle behavior:** a common, cheap pattern is a loop. Pick a random target inside an allowed zone (e.g., margins beside the lanes or the board's side gutters), walk with a small bob, pause 1-3 s for an idle animation (blink, look around, element flourish), then repeat. When an enemy enters range, snap to it, attack, then return to wandering. Keep roaming paths out of the merge board's touch area, so creatures never hide tiles or numbers. Add soft separation between creatures so they don't stack. A short delight beat (hop, cheer) on fusion and on kills keeps the "pet" feeling.
- **How roaming sprites differ from tile icons:** roaming sprites show the full body in a consistent 3/4 top-down view. Silhouette, motion and the allegiance cue carry identity, so the face is relatively less important than on tiles. Tile icons are head crops where the face carries identity. Both should share the same palette, outline weight and signature feature, so a player recognizes "my 128 pup" became "that 256 fusion".

### Gaps
- No primary sources were found in this pass for Slime Legion, Rush Royale, Bloons TD 6, Plants vs. Zombies, Pikmin, Neko Atsume or virtual-pet wander behavior.
- No primary source was found for Clash Royale's red/blue team color convention, its health-bar or level badges, or its ground shadows (well known, but not cited here).
- No GDC talk on Clash Royale or Supercell troop readability was found. The 2017 GDC talk "Balancing Cards in Clash Royale" (Stefan Engblom) is about balance, not art.
- The specific claims attributed to Bugnet could not be verified, because the fetch returned only the blog index.

---

## Q5. Which art styles work best for icons-in-tiles vs. roaming sprites, and why

### Takeaway
For icons-in-tiles, successful precedents use flat or near-flat styles with exaggerated, chibi faces and clean shapes: Threes' clean vector-like characters, Pokémon Shuffle's chibi headshots. Icon guidance favors thick outlines, chunky shapes and saturated colors at small sizes. For roaming units on small screens, the precedents are stylized 3D or pre-rendered characters with chunky proportions and simple gradients (Supercell's Clash) and detailed cartoony 2D with clear outlines (Kingdom Rush). In every case, simplicity and silhouette matter more than rendering detail.

### Cited Findings
- Threes' final style was a "polished and clean look". The team rejected busier themes and the "tribal folk art" phase in favor of tiny, simple characters — [PocketGamer.biz](https://www.pocketgamer.biz/feature/58813/fighting-the-monsters-the-making-of-threes/) (search snippet); [Wikipedia: Threes](https://en.wikipedia.org/wiki/Threes) (fetched)
- Pokémon Shuffle uses chibi-style icons and headshot portraits — [Siliconera review](https://www.siliconera.com/pokemon-shuffle-not-the-puzzle-game-of-your-dreams/); [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pokémon_Shuffle) (search snippets). Genius Sonority's puzzle games rely on exaggerated faces — [Siliconera](https://siliconera.com/?p=842642) (search snippet)
- Small-icon guidance: thick, bold outlines and chunky shapes, no thin lines, saturated high-contrast palettes, and a single face rather than a scene — [MadeGoodDesigns](https://madegooddesigns.com/?p=5494) (search snippet); and design for small scale with minimal elements — [Game Developer, 10 Mar 2020](https://www.gamedeveloper.com/design/icon-design-rules-you-should-know) (fetched)
- Supercell's Clash style: stylized, "boxy look", "simpler color gradients", made with 3D texturing tools (Substance Painter) — [Adobe Substance 3D Magazine, Nov 2019](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html) (fetched)
- Kingdom Rush: a detailed, cartoony 2D style that still reads at a glance — [Wikipedia: Kingdom Rush](https://en.wikipedia.org/wiki/Kingdom_Rush) (search snippet)

### Inferences
Recommended style split for 2048 Siege (PixiJS, phone portrait):
- **Tile icons (16-128):** "chibi sticker" style. Flat color fills with at most one cel-shade tone and one highlight, a thick dark outline (about 2 pt at tile scale, around 6 px at 3× DPR), very large eyes (head-to-eye ratio as in Pokémon Shuffle headshots), no texture, no soft gradients inside the creature. Why: it survives at 25 pt, sits cleanly on a flat element-colored tile next to a bold number, matches Threes' clean look, and is cheap to recolor or vary across 8 elements.
- **Roaming fusion creatures (256-2048) and legendaries (4096):** the same outline weight and palette as the tiles for continuity, but full body, cel-shaded with 2 shade tones plus rim light, and more angular silhouettes as rank rises. Add a short idle loop (bob, breathe, element particles). Soft 3D or pre-rendered art, Clash-style, is a valid alternative for "majestic", but in a 2D PixiJS pipeline, mixing pre-rendered 3D sprites with flat-sticker tile icons risks style clash. Keep them in one family: outlined cel 2D for both, adding glow and particle layers for majesty instead of switching render style.
- **Pixel art:** not recommended. At 55-60 pt on high-DPR phones, pixel art needs integer scaling and a chunky pixel size to read. It also fights the bold vector 2048 number and is harder to keep crisp next to smooth UI. No source in this pass addresses this directly, so it is a judgment call.
- **Flat vector with no outline (Threes-like):** works on tiles but tends to lose separation from busy backgrounds as a roaming sprite. If used, add the allegiance ring and rim light from Q4.
- **Emotional arc mapping (cute → cool → majestic):** baby tiles (16-32) are round, with about a 1:1 head-to-body ratio and giant eyes. Older tiles (64-128) add a signature element feature and confident eyes. Fusion (256+) is full-body, about 1:2 to 1:2.5, with sharper silhouette accents. Legendary (4096) is about 1:3, with wings, crest or aura, plus a halo or particle trail. These ratios are general chibi-to-heroic conventions and are not sourced here.

### Gaps
- No interview or postmortem was found that directly compares sticker, flat, cel, 3D and pixel styles for tile icons or roaming units in mobile games.
- No source on Random Dice, Rush Royale, Merge Dragons or Suika Game art style rationale was retrieved.
- Head-to-body ratio conventions for chibi vs. heroic proportions are commonly cited in art education but were not sourced in this pass.
