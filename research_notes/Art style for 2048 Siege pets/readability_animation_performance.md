# Readability, accessibility, code-driven animation and web performance of candidate 2D art styles for small phone sprites ("2048 Siege")

Scope: chibi "sticker" style with thick outlines, soft 3D toy/clay pre-rendered sprites, flat vector, pixel art, plus cel-shaded 2D and hand-painted. Target: PixiJS 8 (WebGL), portrait phone, blocks ~55–60 pt, enemies ~30 pt, projectiles 25–35 pt, heavy VFX, 8 base + 28 fusion elements, shipped as a single ~715 KB HTML file. Research date: 2026-10-14. Source quality notes are inline: official guidelines/docs (Xbox, Game Accessibility Guidelines, PixiJS, Google, MDN, Riot) are high-authority; tutorial or blog sites (bugnet.io, abratabia.com, rocketbrush.com, wayline.io) are lower-authority and flagged.

---

## 1. What makes sprites readable at 32–60 px on a phone, and how does each candidate style fare?

### Takeaway
At this size, readability comes from a few things: a distinctive solid silhouette, a strong light/dark (value) difference between the sprite and whatever is behind it (an outline is the most reliable way to guarantee that), few large interior shapes rather than evenly spread detail, and a small palette. Thick-outline chibi/sticker art and cel-shaded art meet all of these by construction. Soft 3D/clay and hand-painted art rely on gradients and texture that disappear at 30–60 px, and they lack an edge that separates them from busy VFX. Pixel art reads well, but only at integer scales (see Q4).

### Cited Findings
- Riot's definition of clarity (Mar 12, 2021) is the player's ability to understand what is happening and respond to it. Its silhouette rules: each character keeps one primary, unique feature that skins never remove; size signals role (bigger reads as tank or fighter); facing direction must be clear; animation is only a secondary differentiator. — [Riot, "Clarity in League" (2021-03-12)](https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/)
- A Riot 3D character artist (Tommy Gunardi Teguh, Apr 26, 2018) argues that detail spread evenly over a character does about as much as no detail at all. Detail should cluster in focal areas, with simpler "rest" areas between them. Big broad shapes are blocked in first while zoomed out, and in fast games extra detail turns into visual noise. — [80.lv, "Character Design: Shape Language and Readability" (2018-04-26)](https://80.lv/articles/character-design-shape-language-and-readability/)
- Shape language: round shapes read as friendly or safe, square ones as stable or heavy, triangles as dangerous. The same blog claims about 70% of a design's impact comes from its silhouette and 30% from detail (an unsourced rule of thumb, lower-authority blog). — [RocketBrush blog, shape language](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent)
- Players read a game scene in glances of milliseconds. The player, threats and interactables should sit in a clearly different brightness band from the background, and most readability failures are value failures (lower-authority blog). — [bugnet.io, "Readable game art: why clarity beats detail"](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail)
- Small-sprite practice from pixel-art tutorials (lower authority; these points come from search snippets that span the cited pages): draw the silhouette as a solid shape and confirm it reads with no interior detail, add the largest interior shapes next, then add only details that survive at 1x. A sprite that can't be identified at actual size has failed. For tiny sprites the outline options are a full 1 px dark outline (most readable on any background), a selective outline, or no outline (relies on color contrast), and a 2 px all-round outline is recommended so small sprites pop against any background. A suggested palette is one main color, one accent, one shadow family and one effect color. — [Wayline, Pixel Art for Games lesson](https://www.wayline.io/learn/pixel-art/4); [sprite-ai 16x16 guide](https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art)
- Supercell's Clash stylization (Nov 22, 2019): props and buildings have a "boxy" simplified look, albedo is kept to a couple of color variations, and materials are rougher than real life to get smoother value gradients. Note: this article covers high-res marketing/UI renders, not in-game sprite readability. — [Adobe Substance 3D Magazine, Supercell Helsinki (2019-11-22)](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- Riot's TFT "Chibi Champions" (introduced patch 11.22) are chibi versions of League champions shown small under a top-down camera. A TFT creature designer's portfolio describes the goals as clear silhouettes, readable shapes, and colors/shapes that stand out without becoming noisy (portfolio text, seen at search-snippet level). — [TFT "Introducing Chibi Champions"](https://teamfighttactics.leagueoflegends.com/en-gb/news/game-updates/introducing-chibi-champions); [ArtStation portfolio (walirea)](https://walirea.artstation.com/projects/AZDqWq)
- Xbox XAG 102 lists outlining characters and key gameplay elements as a way to raise their contrast against the background. Examples: Eagle Island's optional white "outline characters/platforms" plus a backdrop-dimming slider; For Honor icons with a black outline and then a white outline, so they read on both dark and light backgrounds. — [Xbox Accessibility Guideline 102: Contrast (ms.date 2023-06-08, updated 2026-06-17)](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)

### Inferences
- Physical pixel budget: a 60 pt block on a 375 pt-wide phone is 120 px at DPR 2 and 180 px at DPR 3. An enemy at 30 pt is 60–90 px, and a projectile at 25–35 pt is 50–105 px. Art detail has to read at roughly 1/6 to 1/12 of a typical 1024 px concept sketch, so only 3–5 large shapes per sprite will survive.
- Style-by-style readability at 32–60 px (for scoring):
  - **Chibi sticker with thick outline**: best. Big heads and simple bodies give a strong silhouette, and the dark outline guarantees value separation on any background. A white "sticker" rim adds a second contrast edge, which is the For Honor double-outline principle in XAG 102. Low detail density by design.
  - **Cel-shaded 2D (flat fill + 1 hard shadow tone + outline)**: about the same as sticker. The hard shadow adds a readable form cue at almost no cost.
  - **Flat vector without outline**: good silhouette, but the edge depends on hue/value contrast with the background. Readability drops when it sits over same-value VFX. Adding an outline turns it into the sticker or cel style.
  - **Soft 3D toy/clay (pre-rendered)**: weaker. Its appeal is in soft gradients, specular highlights, AO and surface texture, and at 30–60 px those turn into a mid-value blob. With no outline, edge contrast falls to the darkest shading only. In this researcher's local preview (see Q5), unoutlined shaded sprites on a mid-value background visibly melted into it while the outlined ones did not. It can be rescued by rendering with an ink/rim outline (a "toon" pass).
  - **Hand-painted/painterly**: weakest at this size. Brush texture is high-frequency detail that reads as noise (per the 80.lv principle) and costs file size (Q5).
  - **Pixel art**: silhouette and palette discipline are excellent and standard practice. Readability is good at integer scale, but see Q4 for the conflict with free scaling/rotation and mixed DPRs.

### Gaps
- No primary Supercell/Blizzard source found that gives numeric rules (minimum outline px, max color count) for mobile unit sprites. The PocketGamer.biz article on Warcraft Arclight Rumble's mobile aesthetic (likely relevant) returned HTTP 403: https://www.pocketgamer.biz/news/78734/translating-the-warcraft-aesthetic-to-mobile-arclight-rumble/
- No controlled study found that compares recognition speed of outlined vs. unoutlined or 3D vs. flat sprites at phone sizes. The evidence is practitioner guidance only.

---

## 2. How do games keep gameplay information (numbers, health, borders) readable on top of art, and leave headroom for VFX?

### Takeaway
Use explicit hierarchy: the most important gameplay information gets the most contrast and attention, VFX intensity scales with gameplay importance, and anything that must be read (numbers, borders) needs a guaranteed contrast plate or outline rather than relying on the art behind it. Xbox's contrast guideline gives testable numbers: 4.5:1 for standard-size text, 3:1 for large text and visual elements, measured against the lowest-contrast part of a non-solid background, and 7:1 in a high-contrast mode. Art styles with a narrow value range inside the sprite (flat, sticker, cel) leave the most headroom for numbers and bright VFX on top.

### Cited Findings
- Riot (2021): visual hierarchy means the most important thing at any moment (such as a major ultimate or crowd control) should draw the most attention. Visual noise adds up quickly and hurts reaction in big fights. Hitboxes must match visuals exactly, and skins must keep clarity parity with the base visuals. — [Riot, "Clarity in League" (2021-03-12)](https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/)
- Riot's VFX style guide (originally Oct 2017; the URL now 301-redirects to the League homepage, so this comes from search-result summaries) sets four VFX goals: visual clarity for gameplay, minimal clutter, promoting the character's theme, and surprise and delight. These are achieved through gameplay, value, color, shape and timing. Visual impact should match gameplay impact: a basic attack should not look as big as another champion's ultimate. — [Riot VFX style guide (2017, original URL)](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/); [Riot dev blog on clarity](https://riotgames.com/en/news/dev-clarity-in-league)
- Riot VFX dev blog (Riot Phoenix, June 22, 2015): VFX must show an ability's size and direction without being either distracting or too subtle, and ideally no visual should take away from gameplay clarity. — [Surrender@20 repost of Riot VFX dev blog (2015-06-22)](https://www.surrenderat20.net/2015/06/red-post-collection-dev-blog-on-vfx.html)
- XAG 102 contrast numbers: standard-size text and visual elements that carry gameplay information need at least **4.5:1**. Large text and large visual elements need **3:1**. A high-contrast mode should reach **7:1** for all UI elements. Text over a non-solid background is measured against its *lowest-contrast* area. On mobile, "large" text is defined as 36 px at 100 DPI, 72 px at 200 DPI and 144 px at 400 DPI, scaling linearly (i.e. about 0.36 inch tall). — [XAG 102 (updated 2026-06-17)](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- XAG 102 techniques when the game background is in constant visual flux: an optional solid or adjustable-opacity plate behind text, player-selectable text/element colors, a high-contrast mode, and borders around text and elements. Examples: The Outer Worlds puts white outlines around red/purple meters, and Forza Horizon 4 map icons use a solid yellow fill under a black outline. Images shouldn't contain baked-in text (text should be its own UI element so its contrast can be adjusted). — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- XAG 102/103 list "players on small, distant, glare-affected or low-contrast displays" among those affected. That describes phones outdoors. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102); [XAG 103](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/103)
- Value layering: gameplay-relevant objects should sit in a clearly different brightness band from backgrounds (lower-authority blog). — [bugnet.io](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail)

### Inferences
- Applying XAG 102 to 2048 Siege: a ~0.36 inch "large" threshold is about 55 iOS pt on a ~460 ppi, DPR-3 phone (0.36 in × ~153 pt/in). A whole 55–60 pt block is therefore "large", but the **2048 number glyph inside it (probably 18–30 pt) counts as standard-size text and needs 4.5:1 against the lowest-contrast pixel of the art behind it**. In practice that rules out drawing numbers directly over a full-value-range painted or 3D render. It argues for (a) a dark stroke plus a light fill on the numbers (the double-outline principle), (b) a semi-opaque plate or badge behind the number, or (c) art whose value range under the number area is deliberately compressed. Flat, sticker and cel art make (c) easy. With 3D or painterly art you need (a) or (b).
- Render numbers as live text (BitmapText; see Q5), not baked into sprites. XAG 102 recommends against text in images, and BitmapText is also the PixiJS performance recommendation for changing text.
- VFX headroom: if block and pet art sits in mid values with moderate saturation (sticker/cel/flat), explosions, flashes and additive-blend projectiles can use the top value band (near-white cores) and stay distinct. Bright, glossy 3D renders with near-white specular highlights take up the same value band as VFX cores. Highlights and explosions then compete, which goes against Riot's "visual impact = gameplay impact" hierarchy. Painterly texture adds noise under VFX.
- The 4-piece progress border should use the same rule: a dark outer line plus a light inner line, at ≥3:1 against both the art and the board background.

### Gaps
- No published value-range numbers found (e.g., "characters within L* 30–70, VFX above 85") from Riot, Blizzard or Supercell. The rule is qualitative in every source found.
- Riot's 2017 VFX style guide original text could not be retrieved (dead URL), so its specifics on value and timing come only from search-snippet summaries.

---

## 3. Colorblind accessibility for an 8-base / 28-fusion element system

### Takeaway
Every major guideline says no cue should rely on color alone. Each element needs at least one non-color channel (shape, icon, pattern, text), and players may optionally pick colors. With 36 categories, hue alone is not viable even for people with typical color vision. The art style should support a per-element **shape signature** (silhouette feature plus icon glyph) that survives at 30–60 px. Outlined flat, sticker and cel styles carry glyphs and silhouette motifs most clearly. Soft 3D and painterly styles blur them.

### Cited Findings
- Game Accessibility Guidelines (basic level): 8–10% of males have red-green color blindness. Other conditions include tritanopia, achromatopsia, cataracts and acquired changes. EA Tiburon estimated over 500,000 Madden NFL users are colorblind. Use color only as reinforcement, alongside text, symbols, patterns or shapes and light-vs-dark contrast. Optional fixes: preset colorblind modes, free color choice for key elements, testing with simulators. A safe pairing is orange vs. blue with a value difference. Avoid full-screen colorblind filters: they change unnecessary elements, hurt aesthetics, miss edge cases, and colorblind players dislike them. — [Game Accessibility Guidelines, "Ensure no essential information is conveyed by a fixed colour alone"](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)
- XAG 103: critical information must use **at least two** channels out of text, symbols, color, on-screen elements, spatial audio, distinct sounds, haptics and narration. Content conveyed by color must also be expressed through shape, pattern, icon or text label. Disabled/grayed states need another indicator (such as a lock icon). Recommends player-configurable colors for information carriers. Pairing fast-recognition icons with labels helps readers and non-readers. — [Xbox Accessibility Guideline 103](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/103)
- XAG 102 warns specifically about red/green targeting icons. Battlefield 2042's custom colorblind option lets players pick HUD icon colors and previews them in dark, midtone and bright environments. — [XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
- Candy Crush pairs each of its six candy colors with a distinct shape (red jelly bean, orange lozenge, yellow lemon drop, green square, blue lollipop head, purple cluster). — [Candy Crush Wiki, "Candy"](https://candycrush.fandom.com/wiki/Candy). A colorblind player said Candy Crush's shapes help but are "not great" when pieces are packed together. — [r/ColorBlind thread (Apr 2024)](https://reddit.rtrace.io/r/ColorBlind/comments/1c77g8h/help_needed_for_our_game_how_do_you_see_these_4/l05yeub/?context=3)
- Healey's color-selection research (IEEE Visualization '96, 38 observers) found that how many colors can be rapidly searched depends on three factors: color distance, linear separation and color category (naming). Colors have to be chosen systematically to stay distinguishable. — [Healey, "Choosing Effective Colours for Data Visualization" (1996)](https://cs.ubc.ca/labs/imager/contributions/healey/imager-tr/healey.viz.96.html)

### Inferences
- With 36 element identities, a scheme that leans on color fails twice: for colorblind players (8–10% of males) and for everyone at 30 px under VFX. Recommended structure for the art brief:
  1. **8 base elements → 8 strongly different shape signatures**, e.g., flame-tip ears (fire), crystal facets (ice), zig-zag spikes (lightning), drips/bubbles (poison), blocky square body (earth), swirl tail (wind), riveted plates (metal), leaf sprout (nature). Use shape language: triangles for aggressive elements, squares for heavy ones, circles and swirls for soft ones.
  2. **A distinct monochrome glyph per base element** in a fixed corner badge (white glyph, dark outline). This is the "icon + color" pairing XAG 103 asks for.
  3. **Fusions = composition of two base signatures/glyphs** (e.g., split badge with two glyphs, or the primary silhouette plus the secondary's accent motif), so 28 fusions are learnable from 8 primitives rather than 28 new hues.
  4. Optionally, a pattern channel (stripes, dots, hatching) on the progress border or badge for the most confusable pairs (fire/nature/poison under deuteranopia, ice/wind under tritanopia).
  5. Optional player color remapping for element colors instead of a full-screen filter (GAG says players dislike full-screen filters).
- Style fit: outlined flat, sticker and cel styles keep crisp glyphs and silhouette motifs at 30–60 px, and icon badges are native to them. Pixel art can carry glyphs, but at 30 px it has only ~8–12 pixels for a glyph. Soft 3D/clay and painterly styles soften motifs and glyph edges, and their shading varies brightness across the sprite, which weakens the light/dark cue GAG recommends as a non-hue channel.
- Value as a channel: give base elements deliberately spread luminance (e.g., ice and lightning light, earth and metal mid, poison and nature mid-dark) so the grayscale view still splits them into 2–3 groups. Flat palettes make that control easy.

### Gaps
- Healey's exact maximum number of rapidly distinguishable colors (often quoted as ~7) could not be confirmed from the abstract page fetched, so no number is given here.
- No primary source found that documents how a game with many elements (e.g., Pokémon's 18 types, Genshin's 7 elements) handles colorblind distinction specifically. Their icon-plus-color type badges are visible practice but were not sourced here.
- No source found with game-specific colorblind simulation data for 8+ hue categories.

---

## 4. Which styles hold up under cheap code-driven animation (squash/stretch, rotation, tint flashes, scaling, idle bob)?

### Takeaway
Code-driven "juice" (tweened scale, squash/stretch, rotation, flashes) is a well-established technique. It works best on art that (a) has no baked directional lighting to contradict rotation, (b) has an outline that survives non-uniform scaling, and (c) is authored at or above its display resolution with smooth (bilinear) filtering. Thick-outline flat, sticker and cel art meets all three. Pixel art conflicts with continuous non-integer scaling and rotation (shimmer, jaggies). Pre-rendered 3D works for scale and bob but its baked light rotates with the sprite. One PixiJS detail matters: `tint` is multiplicative, so a white "hit flash" needs a filter (expensive), a shader, or a pre-made white silhouette sprite.

### Cited Findings
- "Juice it or lose it" (Martin Jonasson & Petri Purho, Nordic Game Jam May 2012 and GDC Europe 2012) made a simple game feel satisfying live on stage by layering small touches: wobble, bounce, squirt, little sounds. — [Game Developer, "Video: Is your game juicy enough?"](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-); [Game Developer, GDC Europe 2012 top sessions (2012-08-08)](https://www.gamedeveloper.com/business/gdc-europe-2012-details-the-top-sessions-for-next-week-s-show)
- Squash and stretch is one of the 12 basic animation principles from *The Illusion of Life*: squash flattens an object under pressure, and stretch emphasizes speed and contrasts with the squash. — [Wikipedia, "Squash and stretch"](https://en.wikipedia.org/wiki/Squash_and_stretch)
- Pixel art: subpixel shimmer comes from fractional camera positions, non-integer render scales and smoothing filters. Non-integer scaling makes source pixels cover unequal numbers of screen pixels. Fixes are integer scaling, snapping to whole pixels, point sampling, and render-to-integer-scale targets (lower-authority blog). — [bugnet.io, debugging pixel-perfect rendering](https://bugnet.io/blog/how-to-debug-pixel-perfect-2d-rendering-issues)
- Excalibur.js docs: basic nearest-neighbor pixel art gets jaggies when rotated and shimmer or inconsistent line widths when scaled by non-integer amounts. Their fix (v0.29+) is a dedicated "pixelArt" mode with a sub-pixel shader plus MSAA, i.e. extra rendering work. — [Excalibur.js docs, Pixel Art](https://excaliburjs.com/docs/pixel-art)
- Python Arcade docs: with rotation it is very hard to keep pixels aligned and edge artifacts are common. "Nearest" filtering reduces edge artifacts. — [Arcade docs, Edge Artifacts](https://api.arcade.academy/en/2.6.17/development/edge_artifacts/index.html)
- PixiJS tint is multiplicative, so it can only darken or recolor, not brighten to white. Whitening needs a ColorMatrixFilter with offsets or a custom shader (forum thread, Dec 2014, older PixiJS, though tint is still multiplicative). — [html5gamedevs, "Sprite whitening"](https://html5gamedevs.com/topic/11122-sprite-whitening). A damage flash can be done by applying a ColorMatrixFilter for 2–3 frames (tutorial site, lower authority). — [abratabia PixiJS filters](https://abratabia.com/pixijs/filters-and-shaders.php)
- PixiJS v8 performance guide: filters are expensive and many of them cause slowdowns, and mask cost ranks rectangle < Graphics < sprite masks (slowest). — [PixiJS 8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- SVG-as-Graphics in PixiJS keeps vector crispness at any zoom and lets you change colors and strokes after rendering. It does not support SVG text, filters or patterns, and parsing complex SVGs adds startup delay. — [PixiJS 8 SVG guide](https://pixijs.com/8.x/guides/components/assets/svg)
- Skeletal (Spine) animation is far more efficient than frame-by-frame sheets for characters with many animations, because it stores bones and meshes rather than every frame (tutorial site). — [abratabia, animation performance](https://www.abratabia.com/game-animation/animation-performance.php). Spine skeleton data files are small, though with many animations and bones they can reach a few MB of RAM, and textures are far more likely to cause memory issues on mobile. — [Esoteric Software (Spine) forum, memory management](https://de.esotericsoftware.com/forum/d/2844-memory-management-when-using-spine)

### Inferences
- **Chibi sticker / cel / outlined flat**: best fit for code-only animation.
  - Squash/stretch and scale-pop: an outlined shape stays readable under ±20–30% non-uniform scale. The outline thins proportionally (a 4 px outline at 0.75× becomes 3 px) but stays present.
  - Rotation and wobble: no baked light direction, so it looks correct at any angle.
  - Tint: multiplicative tint keeps a black outline black while recoloring the fill. Element-colored flashes and poison/freeze status tints work with plain `sprite.tint`, at no cost and batch-friendly.
  - White hit flash: overlay a pre-generated white silhouette (built at load time from the sprite's alpha, or included in the atlas) and fade its alpha. That stays a plain batched sprite, unlike a per-sprite ColorMatrixFilter, which matters with ~30 enemies flashing.
  - Recolor trick: authoring a fill as light grayscale and tinting it per element can let one base sprite serve several elements (a file-size saver). It works only with flat or near-flat shading.
- **Soft 3D/clay pre-rendered**:
  - Scale-pop and idle bob are fine.
  - Rotation moves the baked key light and specular highlight with the sprite (light from top-left becomes bottom-right at 180°). Small wobbles of about ±10° are tolerable, but spins look wrong.
  - Squash/stretch distorts baked highlights and AO into visibly smeared ellipses.
  - Multiplicative tint also tints the highlights, which flattens the 3D read. White-flash overlays work the same as for flat art.
  - The "toy" charm partly comes from turntable or frame-rendered motion, and code animation can't reproduce that without frames.
- **Pixel art**:
  - Squash/stretch, scale tweens and rotation are continuous, non-integer transforms, which is exactly what produces shimmer and jaggies per Excalibur, Arcade and bugnet. The fixes (pixel-art shader, MSAA, integer render target) add GPU work or break the look.
  - Mixed DPRs (2, 2.625, 3) and a 375 pt layout also make integer scaling of a 30 px sprite hard. Pixel art is the worst fit for a "no frame-by-frame, code-driven juice" constraint.
- **Hand-painted**: like 3D, painted lighting rotates with the sprite. Texture survives scaling, but tint flattens painted color variation.
- **Live vector (PixiJS Graphics/SVG)**: resolution-independent squash and scale. PixiJS says Graphics are fastest when not modified every frame, so animate by container transform, not by redrawing paths. No SVG filters, patterns or text.
- **Spine/skeletal vs single image**: for one idle bob, squash and flash per pet, single-image tweening is enough and avoids a runtime dependency plus extra JSON or atlas data in a single-file build. Spine pays off only for multi-part articulated motion (blinking eyes, ear flaps). A middle ground is a 2–4 part rig (body, eyes, ears/accessory) as separate atlas frames tweened in code, without a Spine runtime.

### Gaps
- No primary source quantifies how far a pre-rendered 3D sprite can rotate before baked lighting reads as wrong. The ±10° figure above is this researcher's estimate.
- No benchmark found for PixiJS v8 ColorMatrixFilter cost per sprite on mobile. Only the qualitative "filters are expensive" from the docs.
- No source found on Spine runtime size or licensing for pixi-spine in a single-file build. Not researched further.

---

## 5. Web performance and file size: atlases, image formats, vector cost, mobile budgets, and how style affects compression

### Takeaway
GPU memory depends on atlas pixel dimensions, not on style (RGBA = 4 bytes/px, so a 2048² atlas is 16 MB). Download and HTML size depend strongly on style. In a local synthetic benchmark, a flat outlined sticker atlas compressed about 4.4× smaller than a textured clay atlas and about 6× smaller than a painterly one in lossless WebP. Lossy WebP/AVIF narrows the gap to about 1.3–1.8×. Pixel art is smallest by far. Base64 inlining in a single HTML file adds about 33%. For PixiJS: pack into 1–2 atlases (≤1024² or 2048² on mobile), keep blend modes grouped, use BitmapText for numbers, avoid per-sprite filters, and prefer textures over complex live vector Graphics.

### Cited Findings
- PixiJS v8: use spritesheets to minimize the number of textures. Sprites batch with up to 16 different textures (hardware-dependent). Different blend modes break batches, so alternating blend modes multiplies draw calls; group like with like. Small Graphics (≤100 points) perform comparably to sprites, and Graphics are fastest when not modified often. Convert many complex Graphics to textures. Use BitmapText for frequently changing text, and avoid changing Text every frame. Filters are expensive. Mask cost: rectangle < Graphics < sprite. Culling is off by default. For older devices, ship lower-resolution `@0.5x` textures. — [PixiJS 8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- PixiJS v8 SVG: SVG-as-texture renders as a single quad (fast) but pixelates when scaled, with a maximum texture size of 4096×4096 and a `resolution` option for fidelity. SVG-as-Graphics stays crisp and editable but has parse overhead (reuse a `GraphicsContext`) and is slower for complex SVGs. Large intricate SVGs cause significant startup delay. — [PixiJS 8 SVG guide](https://pixijs.com/8.x/guides/components/assets/svg)
- WebP lossless (Google study, Aug 1, 2017, 12,000 random translucent web PNGs): 23% smaller than ZopfliPNG and 42% smaller than libpng defaults, better on over 99% of images. Lossy WebP with alpha on a graphical test image: 0.51 bpp vs 1.05 (ZopfliPNG) and 1.36 (optimized PNG). Decode time is comparable or faster (3 ms vs 5 ms ZopfliPNG on the web corpus), and decode memory is lower (7 MiB vs 10 MiB). — [Google, WebP Lossless and Alpha Study (2017-08-01)](https://developers.google.com/speed/webp/docs/webp_lossless_alpha_study)
- AVIF vs WebP lossy on 600 photos at equal DSSIM: AVIF median 50.3% smaller than JPEG vs 31.5% for WebP. The study gives no lossless or alpha data. — [ctrl.blog, WebP vs AVIF (2020-07-12, updated 2026-08-23)](https://www.ctrl.blog/entry/webp-avif-comparison.md). Secondary sources claim WebP beats AVIF in lossless mode (vendor blog, lower authority). — [ShortPixel, AVIF vs WebP](https://shortpixel.com/blog/avif-vs-webp)
- pngquant (palette quantization to ≤256 colors with alpha) often cuts PNG size by as much as 70%. Its example goes from 75,628 to 19,996 bytes (−73%). — [pngquant.org](https://pngquant.org/)
- Base64 output is roughly one-third larger than its source (3 bytes become 4 characters). This applies to images inlined as `data:` URLs in a single HTML file. — [MDN, Base64 glossary](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- iOS Safari memory (lower-authority tutorial sites, treat as rough guidance): tabs above roughly 300–400 MB on older iPhones (iPhone 8, SE 2nd gen) are often killed. Crashes or corruption appear above about 256 MB of GPU memory on older devices. A 2048×2048 RGBA texture uses 16 MB of GPU memory regardless of file size. Keep mobile atlases at 1024×1024 or less (page updated June 2026). — [abratabia, iOS Safari gotchas](https://abratabia.com/mobile-web-games/ios-safari-gotchas.php). Another tutorial suggests sheets under 2048×2048 for mobile and claims a batched WebGL renderer handles about 100–300 animated sprites at 60 fps on mid-range phones (unverified). — [abratabia, animation performance](https://www.abratabia.com/game-animation/animation-performance.php)

### Inferences

**Local synthetic benchmark (run by this researcher, 2026-10-14; cwebp 1.6.0, avifenc 1.4.2/aom 3.15.2, Pillow 11.3).** Sixteen 128×128 "pet" sprites (body, ears and face, 16 hues) were rendered in each style into a 512×512 RGBA atlas. Smooth edges come from 4× supersampling with box-filter downsampling. Sizes in bytes:

| Style (512² atlas, 16 sprites @128 px) | PNG-32 (zlib 9) | PNG-8 quantized (256 col) | WebP lossless | WebP q85 | AVIF q70 | AVIF lossless |
|---|---|---|---|---|---|---|
| Flat + thick outline (sticker/cel) | 60,179 | 26,263 | 28,864 | 27,276 | 17,815 | 66,464 |
| Soft 3D/clay, smooth gradients | 117,804 | 26,307 | 74,198 | 24,880 | 17,529 | 87,002 |
| Soft 3D/clay + surface texture noise | 215,044 | 47,343 | 127,354 | 34,070 | 28,595 | 158,862 |
| Painterly (brush noise + hue jitter) | 281,274 | 61,733 | 174,112 | 48,554 | 46,782 | 225,039 |
| Pixel art, native 32 px cells (128² atlas) | 3,288 | 2,814 | 1,436 | 5,962 | 3,144 | 3,738 |
| Pixel art, 32 px cells upscaled 4× (512²) | 5,934 | 4,453 | 1,596 | 9,516 | 4,207 | 3,959 |

Script: `/private/tmp/claude-501/-Users-lap14657-Library-Application-Support-Claude-scratch-workspaces-429d5d35-a3a0-4ea5-8dd7-8f9c812d66bb-051798fe-123d-4080-b2b4-c6d44aca5d79-scratch-2026-10-11-281721/4cc06ad0-1eed-4522-9178-14dcd5747707/scratchpad/bench/bench.py`.

Caveats: the art is procedural and synthetic, and the painterly noise is exaggerated. Treat the ratios as directional, not absolute. Unique colors: flat 1,638, smooth clay 31,637, painterly 94,223. The PNG-8 rows used no dithering, so gradient styles would show banding at 256 colors; their small PNG-8 size is not lossless-equivalent. Lossy WebP/AVIF on hard-outlined flat art can ring around outlines, and lossy WebP made pixel art *larger* than lossless.

- **What this means for the ~715 KB single file.** Scaling the 16-sprite results to 36 element pets at 128 px (×2.25) and adding the 33% base64 overhead:
  - Flat/sticker ≈ 65 KB lossless WebP (≈ 87 KB base64), about +12% on the HTML.
  - Textured clay ≈ 287 KB lossless (≈ 380 KB base64, about +53%) or ≈ 77 KB lossy WebP (≈ 100 KB base64).
  - Painterly ≈ 390 KB lossless (≈ 520 KB base64, about +73%) or ≈ 110 KB lossy.
  - Pixel art at native resolution ≈ 3–4 KB, negligible.
  - Rough extrapolation: real art and extra states (hit-flash silhouettes, expressions, fusion overlays) will change these numbers.
- **Format choice for a single-file build.** WebP lossless is the safest default for flat, outlined or pixel art: lossless, small, broadly supported, and decoded natively by browser image decoding, which PixiJS uses. AVIF q~70 was smallest for flat and smooth-gradient art but is lossy, and its edge-ringing on outlines should be checked visually. For gradient-heavy 3D or painterly art, lossy WebP or AVIF is close to mandatory to keep size down.
- **GPU memory is style-neutral.**
  - One 1024² RGBA atlas = 4 MB and one 2048² = 16 MB.
  - 36 pets at 128 px fit in one 1024² atlas (64 cells), about 4 MB of GPU.
  - At 192 px (crisp at DPR 3 for 60 pt blocks), 25 fit per 1024², so 36 need 2048×1024 (8 MB). Still far under the ~256 MB older-iOS GPU budget.
  - Keep pets, enemies, projectiles and the 8-frame explosion in ≤2 atlases to stay within PixiJS's 16-texture batch limit.
- **Draw-call hygiene for heavy VFX.** Additive-blend explosions and projectiles interleaved with normal-blend sprites break batches (PixiJS docs). Put all additive VFX in their own container layer above units.
  - Numbers on 16 blocks change on merges, so use BitmapText (PixiJS recommendation) rather than Text.
  - White hit-flashes are best done as atlas silhouette sprites rather than per-sprite filters.
  - The projected sprite count (16 blocks × several layers + 30 enemies + projectiles + explosions, roughly 150–250 sprites) is in the range tutorial sources claim mid-range phones handle when batched. This is unverified, so profile on a real low-end Android/iPhone.
- **Vector (SVG/Graphics) as the shipping format.** Flat-vector art could ship as SVG strings (text, compresses well, no base64 needed) and be rasterized once at load time to textures at the device's DPR. That gives crisp art at any DPR with sprite-speed rendering, per the PixiJS SVG guide. Rendering 36 complex SVGs as live Graphics every frame is the slow path (parse cost, geometry), and SVG filters, patterns and text are unsupported. This option exists only for the flat, sticker and cel styles. 3D, painterly and pixel art must ship as bitmaps.
- **Per-style performance and size ranking (for scoring)**:
  1. Pixel art (tiny files, but see the animation and DPR issues in Q4).
  2. Flat vector / sticker / cel (small bitmaps, or vector-at-load option; recolor by tint).
  3. Soft 3D clay, smooth (moderate lossless, small lossy).
  4. Soft 3D clay, textured.
  5. Hand-painted (largest; needs lossy compression).

### Gaps
- No authoritative (Apple/WebKit) published number found for iOS Safari per-tab or GPU memory limits. The 256 MB / 300–400 MB figures come from tutorial sites and should be treated as rough.
- No primary benchmark found for AVIF vs WebP *lossless with alpha* on game sprites. The local benchmark here is synthetic.
- No measured PixiJS v8 sprite-count-at-60 fps figures for specific phones were found from PixiJS maintainers.
