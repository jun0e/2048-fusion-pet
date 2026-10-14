# Dual Art Style: simple in-game sprites + "3D-look" namecard portraits for 2048 Siege fusion creatures

Scope note: this pass used 16 research tool calls. Sources are strongest for Supercell's hi-res pipeline, the Gemini model line-up, Gemini's 2D-to-3D-figure use case, Pokémon TCG's 3D-CG card art, and the Clash Royale and AFK Journey ability UIs. Many named precedents (Brawl Stars, Rush Royale, Random Dice, Pokémon Unite cut-ins, Cookie Run: Kingdom, Summoners War, Octopath, Monster Legends, Hearthstone, Marvel Snap) were **not** verified in this pass. They are listed under Gaps as unverified leads, not as facts. Model facts that overlap with the sibling file `ai_pipeline_and_licensing.md` are cross-referenced, not repeated in full.

## Q1. Precedents for dual styles (simple in-game sprite + rich portrait/card art) and how identity carries across them

### Takeaway
Shipped games commonly use two fidelity tiers for the same character. Supercell runs a dedicated "Creature Shop" that makes hi-res renders for Clash Royale's UI and marketing alongside the in-game assets. Pokémon TCG gives 3D-CG art (studio PLANETA) to many premium "rule-box" cards while the games use other renderings of the same Pokémon. Across tiers, identity holds through the parts that survive scale changes: silhouette, palette, and one focal feature (face). Micro-detail does not carry over.

### Cited Findings
- **Supercell Creature Shop (Clash Royale / Clash of Clans):** a small team at Supercell Helsinki ("couple of generalists, one technical artist/rigger, and an art producer/outsourcing manager") supports the live game teams. It produces "splash screens, character models, buildings, and props for in-game UI, marketing, and animations." For Clash Royale it helps produce the **hi-res assets used in marketing and in-game UI**. Article dated Nov 22, 2019 — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- The same article says the hi-res pipeline makes **separate low-poly and high-poly exports** ("_low"/"_high" suffixes) and bakes between them. In-game and hi-res versions are the same base design at two detail levels, not separate designs — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- Supercell places subtle detail so that it "directs viewer focus toward character faces through color and value gradients." The face is the deliberate focal and identity anchor in the hi-res renders — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- Julio López Cruz is Art Lead on Clash Royale (15+ years in the industry). A search snippet credits the game's visual evolution to moving "from simple card icons to current high-fidelity 3D models" (snippet only; page not fetched) — [VIEW Conference: Small Teams, Big Dreams](https://www.viewconference.it/article/1035/small-teams-big-dreams-the-impact-of-supercell-art?amphtml=1)
- Squeeze Studio announced that it worked with Supercell on Clash Royale's "Champions" launch. Champions got a separate cinematic marketing tier (title only; details not fetched) — [Squeeze Studio news](https://www.squeezestudio.com/en/news/supercell-and-squeeze-are-back-introducing-the-new-clash-royale-champions)
- **Pokémon TCG / TCG Pocket 3D-CG art:** PLANETA is a Japanese studio focused on 3D computer-generated imagery. It has illustrated Pokémon TCG cards since the *Flashfire* expansion, with individual artists credited from *Forbidden Light*, and it also contributes to Pokémon TCG Pocket — [Bulbapedia: PLANETA](https://bulbapedia.bulbagarden.net/wiki/PLANETA); [Dittobase: PLANETA CG Works (TCG Pocket)](https://www.dittobase.com/tcg-pocket/artists/planeta-cg-works)
- PLANETA Mochizuki (now freelance as "Ultimateinudog", left PLANETA July 31, 2024) is described as a 3D-focused illustrator known for **rule-box Pokémon and full-art cards**. PLANETA Igarashi's 3D work "includes many GX, V and ex Pokémon", the premium, more powerful card classes — [pkmncollectors: PLANETA Mochizuki](https://www.pkmncollectors.com/artists/planeta-mochizuki); [pkmncollectors: PLANETA Igarashi](https://www.pkmncollectors.com/artists/planeta-igarashi)
- **Fire Emblem (GBA era)** used separate formats at different scales: small map sprites and larger in-battle sprites, with community-cited size limits around 32×32 and 64×64 px (search-summary level; low confidence on exact numbers). Portraits are a third, larger tier — [FEUniverse: FE7 map sprite overhaul](https://feuniverse.us/t/fe7-map-sprite-overhaul-feedback-wanted/29317); [TCRF: Fire Emblem Awakening prerelease](https://tcrf.net/Prerelease:Fire_Emblem_Awakening)

### Inferences
- The Supercell model (one base design, a "_low" tier and a "_high" tier) is the closest analogue to what 2048 Siege needs: one canonical design per fusion, with the sprite and the portrait as two renderings of it. The portrait should not be a re-imagining.
- Identity anchors that survive between a ~55–60 px tile/sprite and a ~90–140 px portrait, in priority order. These are inferred from the Supercell face-focus finding plus general readability practice:
  1. **Silhouette of the head/upper body.** Ear, horn, fin, crest and tail shapes must be the same and exaggerated similarly in both.
  2. **Palette.** Use the same 2–3 dominant hues and the same element accent color. Lock hex values per creature.
  3. **One signature feature,** such as a flame tail tip, a gem on the forehead or a lightning-shaped ear, rendered at the same proportional size.
  4. **Eye design.** Keep shape and highlight style, since the face is the focal point Supercell steers value contrast toward.
- The size ratio matters. A 90–140 px portrait is only ~1.5–2.5× the linear size of a 55–60 px tile. If the portrait is a **bust crop** (head + shoulders) while the sprite is full-body, the face can be ~3–5× larger in the portrait. That is where the "higher fidelity" budget goes. Extra body detail does not need to.
- The Pokémon TCG precedent supports reserving the richest 3D-CG treatment for "premium/powerful" forms. 2048 Siege can make the portrait style itself a reward that first appears at fusion (256), with a further step-up at Legendary (4096).

### Gaps
- No primary art-direction source (interview or GDC talk) was found that explicitly covers how studios keep a character recognizable between map sprites and portraits (e.g., Intelligent Systems on Fire Emblem, Square Enix on Octopath HD-2D, Supercell on troop vs. card art). The silhouette/palette/signature-feature rule above is a synthesis, not a quoted guideline.
- Unverified leads (author background knowledge, not sourced in this pass; verify before citing):
  - Clash Royale card portraits are rendered from the same 3D models as the in-arena troops.
  - Brawl Stars uses 3D-rendered brawler portraits/pins alongside in-match 3D models.
  - Rush Royale and Random Dice pair small board units/dice with larger hero art.
  - Cookie Run: Kingdom pairs chibi battle sprites with large illustrated (Spine-animated) art and skill cut-ins.
  - AFK Arena/AFK Journey and Summoners War pair painted or 3D portraits with battle models.
  - Octopath Traveler uses HD-2D pixel sprites plus painted character portraits.
  - Monster Legends shows creature card art.
  - Hearthstone and Marvel Snap frame painted or 3D-look card art.
- Several search hits on Fire Emblem "silhouette readability" came from SEO spam domains and were excluded.

## Q2. The "3D-style 2D" look: what it is, how it is produced, and readability at ~100 px

### Takeaway
The look ships in two main ways. One is a **true 3D render**: sculpt, texture, light and render, then use the result as a 2D image. Supercell does this in Maya + Arnold with deliberately "broken" PBR to get readable color gradients. The other is a **3D base with a 2D paint-over or NPR compositing**, as in Blender renders with Photoshop paint-over, Kuwahara filters or Freestyle lines. For a ~100 px namecard, what reads is strong value structure, simplified rough materials and a lit face. Fine texture detail does not.

### Cited Findings
- **Supercell's pipeline:** base models from freelancers or in-house character artists, refined in ZBrush (metal parts) → bake low/high in Substance Painter (raised anti-aliasing, "match by mesh name") → texture in Substance Painter from a smart-material library → render in **Maya + Arnold 5**, with **lighting and posing done by dedicated artists** (Kustaa Vuori is named). Outsourcing partner: Airborn Studios (Germany) — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- **Supercell stylization rules:** "We use the PBR workflow but break the PBR in many ways." Materials are made **rougher than real-world equivalents to enhance color gradients**. Albedo is kept simple with a "couple of color variations" while roughness maps carry the look. Props and buildings are "boxy" — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- **Paint-over hybrid:** one artist (happeh) built a scene in Blender and **painted over it in Photoshop**, using camera depth of field and a **Kuwahara node in compositing** for a painterly look (search-snippet level) — [80.lv: 2D-like still life made in Blender](https://80.lv/articles/2d-like-still-life-illustration-made-in-blender/)
- **Painterly 3D:** Helen Stifler (Senior Character Artist) sculpted in ZBrush and painted in Blender to get a painterly aesthetic on a stylized 3D character (snippet level) — [80.lv: painterly 3D Aurora](https://80.lv/articles/painterly-style-3d-take-on-league-of-legends-aurora-in-blender)
- **Line-based NPR:** Russ Draws made cartoon-style renders with Blender's Freestyle edge-line engine — [80.lv: Blender cartoon renders](https://80.lv/articles/a-collection-of-blender-made-cartoon-style-renders)
- A painterly Blender render of a cute Pokémon (Rowlet) is a fan precedent for a soft 3D treatment of cute creatures — [80.lv: Rowlet painterly Blender render](https://80.lv/articles/cute-pok-mon-rowlet-relaxing-in-painterly-blender-render/)
- **Commercial 3D-CG card art at card size:** PLANETA's 3D-CG Pokémon cards are a long-running commercial precedent (since *Flashfire*) for 3D-rendered creature art read at small physical and in-app card sizes — [Bulbapedia: PLANETA](https://bulbapedia.bulbagarden.net/wiki/PLANETA)

### Inferences
- Three named sub-styles fit the brief "2D image that looks 3D". Ordered from most to least compatible with the cream-clay UI and a Gemini pipeline (inference):
  1. **"Stylized 3D render / designer-toy / soft vinyl"**: Supercell-like broken PBR, rough materials, big readable gradients. This best matches the existing cream "clay" pill UI.
  2. **"Clay / plasticine render"**: hand-made fingerprint texture. Charming for babies, harder to make "majestic" at Legendary tier.
  3. **"Painterly 3D" (render + paint-over)**: most premium-looking, but noisy at ~100 px and the hardest style to keep consistent across 28 AI generations.
- Readability rules for a 90–140 px portrait, inferred from Supercell's "rough materials → readable gradients" and "value gradients toward the face":
  - Use one key light (upper-left, warm) plus a strong **rim light** in the element color. The rim separates the silhouette from the panel background at small size.
  - Avoid specular noise, fur strands and small texture. Prefer big soft gradients.
  - Make the face the highest-contrast zone.
  - Keep the background a flat or simple radial element-colored plate, so the character, not the scene, carries the detail.
- Blender-based production (render the sprite's 3D proxy, then paint over) is the "proper" pipeline. With an AI-first pipeline the realistic equivalent is to prompt for "stylized 3D render" directly, using the sprite as a character reference (see Q4).

### Gaps
- No source measured readability of 3D-render vs. flat-painted portraits at ~100 px on phones; the rules above are inferences.
- No recent (2023–2026) Supercell interview specifically on Clash Royale card art (vs. 2019 Creature Shop) was fetched. The VIEW Conference article was seen only as a snippet.

## Q3. Skill/ultimate activation UI conventions and portrait framing

### Takeaway
Mobile conventions converge on a **tappable portrait or circular button that shows a charge state** (energy bar or meter fill) and **"shines" when ready**, with manual activation of the one signature move while everything else is automatic. Clash Royale puts the champion ability in a circular button at bottom-right above the hand, priced in elixir. Since August 2026 it is single-use per deployment, turning it from a "rate resource" into a "timing resource". Cinematic presentation (dynamic camera, cut-ins) marks the activation moment.

### Cited Findings
- **Clash Royale Champion/Hero ability button:** accessed "from the bottom rightmost side of the screen, just above the player's 'hand'", activated by tapping "the circle button on the bottom right", and **costs elixir** — [Sportskeeda: Champion cards ranked](https://www.sportskeeda.com/mobile-games/all-champion-cards-clash-royale-ranked); [Clash Royale Wiki: Champion cards](https://clashroyale.fandom.com/wiki/Category:Champion_Cards); [HighGround Gaming: best champion](https://www.highgroundgaming.com/best-champion-clash-royale/)
- Before the change, abilities went on cooldown after their duration, e.g. Golden Knight 8 s and Little Prince 30 s — [Sportskeeda: Little Prince](https://www.sportskeeda.com/esports/little-prince-clash-royale-ability-stats-strategies); [Clash Royale Wiki: Heroes](https://clashroyale.fandom.com/wiki/Heroes)
- **August 2026 change:** "every Hero and Champion ability except Boss Bandit's became single-use", giving "exactly one activation per deployment". Elixir costs were unchanged. Trophy Coach (Aug 29, 2026) frames this as converting abilities "from a rate resource into a timing resource: the question changed from 'how often can I cycle this?' to 'is this the moment?'". Date conflict: the search snippet says the Aug 3, 2026 balance update; the fetched guide summary says Aug 4, 2026 — [Trophy Coach: single-use abilities explained](https://trophycoach.com/guides/single-use-abilities-explained)
- **AFK Journey:** players can "only trigger their ultimate abilities". Each character has a **yellow Energy bar** that "will shine" when full, signaling the ultimate is ready. Other skills and basic attacks run automatically. Ultimates use dynamic camera work. Example: Rowan's ultimate needs 400 initial energy — [Gfinity: AFK Journey Rowan](https://www.gfinityesports.com/guides/afk-journey-rowan-abilities); [BlueStacks: AFK Journey beginner's guide](https://www.bluestacks.com/blog/game-guides/afk-2-journey/afkj-beginners-guide-en.html)
- **Pokémon UNITE:** each Pokémon has one exclusive Unite Move. It unlocks at level 7–9 and **requires a full Unite meter** — [WikiDex: Movimiento Unite](https://www.wikidex.net/wiki/Movimiento_Unite)

### Inferences
- Recommended namecard behavior for 2048 Siege, synthesized from the CR + AFK Journey + UNITE patterns. Timings are suggestions, not sourced:
  - **Layout:** the side panel holds a rounded-rect portrait (bust crop) on an element-colored plate. A cream clay name pill sits below or over the bottom edge. The skill button is either the portrait itself or a circular clay button overlapping the portrait's corner (CR-style circle, which reads as "tap me").
  - **Charging state:** portrait desaturated or dimmed, with a radial or bottom-up fill in the element color. This mirrors AFK Journey's energy bar and UNITE's meter.
  - **Ready state:** full color plus a "shine" sweep and a soft pulsing glow on the frame (AFK Journey's "will shine" cue). A small bob or blink on the portrait is enough to fake life, given PixiJS code animation.
  - **Activation:** a short cut-in of ~0.5–1.0 s. The portrait scales up or slides toward the playfield with a speed-line or element burst and the skill name in a banner, then the effect plays on the roaming sprite, which ties the two styles together at the moment of use. Keep it short and non-blocking in a real-time TD.
  - **Cost model:** CR's "timing resource" framing suggests one charge per wave or per fusion lifetime, which would make the portrait tap a decision. A pure cooldown ring that players spam would not.
- Frame tiers: element background plate (fire, water, …) plus a rarity frame (Fusion vs. Legendary). Legendary could get an animated or foil frame, echoing the "premium = richer art" pattern in Pokémon TCG's 3D-CG rule-box cards (Q1).

### Gaps
- Pokémon UNITE's Unite-Move cut-in presentation could not be verified (Bulbapedia returned HTTP 403, and searches returned only mechanics). Genshin/Honkai burst cut-ins, AFK Arena ultimate portraits, Rush Royale hero abilities and Cookie Run: Kingdom skill cut-ins were not researched in this pass. Their exact durations, framing and layouts are unverified.
- No Game UI Database entries were fetched, so there are no verified pixel sizes for portrait buttons in shipped games.

## Q4. Producing 3D-style portraits with Gemini image models: capabilities, sprite-as-reference workflow, drift, prompt structure

### Takeaway
Turning a 2D character into a **3D collectible-figure render while keeping identity** is the single most heavily exercised Gemini image use case. The 2025 "Nano Banana figurine" trend produced 200M images in two weeks. That makes "sprite as character reference → stylized 3D render portrait" a well-trodden path. Current models (Oct 2026) take several character/object reference images and support multi-turn targeted edits. Consistency claims above ~90% come only from SEO blogs with no methodology. Expect detail invention from low-detail sprites and lighting drift across 28 creatures, and design the pipeline to constrain both.

### Cited Findings
- **Model line-up (Oct 2026), from Google's docs:** `gemini-nano-banana-2.1`, `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image` (Nano Banana Pro) and legacy `gemini-2.5-flash-image`. Outputs at 1K (default), 2K and 4K; 3.1 Flash Image adds 512 px. "Thinking" is on by default and "cannot be disabled in the API". All outputs carry a **SynthID watermark**. Multi-turn conversational editing is supported — [Gemini API: image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- **Reference-image slots:** Nano Banana 2.1 and 3.1 Flash Image allow "up to 10 images of objects" plus "up to 4 images of characters to maintain character consistency". 3.1 Flash Lite allows up to 14 object images, with no character-consistency slot. **Conflict on Pro and style refs:** this pass's fetch summary said Gemini 3 Pro Image supports "up to 6 images of objects" and "up to 3 images to be used as style references". The sibling notes, from the same page, record Pro as 6 object + 5 character refs with **no** listed style-ref slot, and attribute the ≤3 style refs to Nano Banana 2.1/3.1 Flash. Verify on the live page before writing the spec — [Gemini API: image generation](https://ai.google.dev/gemini-api/docs/image-generation); see sibling `ai_pipeline_and_licensing.md` Q-table
- Google's docs also cover **style transfer** ("Transform the provided photograph of [subject] into the artistic style of [art style]. Preserve the original composition…") and targeted edits that change one element and keep the rest (as recorded in sibling notes) — [Gemini API: image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- **2D→3D figure precedent (Gemini 2.5 Flash Image, Aug–Sep 2025):** the viral prompt was "Create a 1/7 scale commercialized figurine of the character in the picture, in a realistic style, in a real environment… round transparent acrylic base… a toy packaging box… printed with original artwork." Within two weeks of launch, users generated 200M+ images and Gemini gained 10M new users. Article dated Sep 11, 2025 — [Decrypt](https://decrypt.co/338994/how-use-google-nano-banana-ai-transform-selfies-digital-figurines?amp=1)
- Practitioner tips from the same article: name materials ("PVC figure", "polished resin") to steer the 3D look. Dynamic poses work better than static standing ones. Add "The face is exactly the same" to preserve identity. Chain prompts for complex iterations. The model "won't degrade your face too much after many iterations". Caveat: overly realistic faces lose the doll-like look — [Decrypt](https://decrypt.co/338994/how-use-google-nano-banana-ai-transform-selfies-digital-figurines?amp=1)
- Trend coverage describes the output as "Bandai-style" figurines — [Storyboard18](https://www.storyboard18.com/digital/explained-the-nano-banana-trend-driving-viral-3d-figurines-across-social-media-80860.htm); [Jang](https://jang.com.pk/en/47372-gemini-nano-banana-viral-trend-try-these-prompts-to-create-3d-figurine-models-news)
- Nano Banana Pro "can hold the likeness of up to 5 people using as many as 14 reference images in a single prompt". It interprets "keep the same person, change only the background" as an edit instead of regenerating from scratch (search snippet; article dated 2026-06-29; full page could not be extracted) — [ud.hk: Why AI image tools keep changing your character's face](https://ud.hk/en/blogs/insight/article/2026-06-29-nano-banana-consistent-characters)
- Reference-set advice (third-party, human-face oriented): use about 6 refs at ≥1024×1024 covering front, 3/4-left and 3/4-right. Optimal fidelity holds "with 6 or fewer references" despite the 14-image maximum (search snippet) — [laozhang.ai face consistency guide](https://blog.laozhang.ai/en/posts/nano-banana-pro-face-consistency-guide)
- **Unreliable stats:** "95% character consistency with up to 14 reference images" and "topping 2026 benchmarks per DeepMind reports" appear on dev.to and SEO blogs with no methodology. Treat them as marketing — [DEV Community](https://dev.to/aigame/gemini-3-pro-image-is-here-and-it-changes-everything-i-thought-i-knew-about-ai-art-tools-3ng4); [selfielabstudio](https://selfielabstudio.com/blog/nano-banana-pro-ultimate-character-consistency-guide-20260217)
- Cross-reference from sibling notes (not re-verified here): Gemini outputs **no alpha channel**. Soft-edged 3D/clay renders are harder to chroma-key than outlined cartoons, and no source tested consistency of soft 3D renders across a set. Triangulation matting (render on white, then on black, solve alpha) is one documented workaround — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/); [Replicate: nano-banana-2-transparent](https://replicate.com/jide/nano-banana-2-transparent/readme)

### Inferences
- **Direction of generation.** Since sprites already exist and drive gameplay, go **sprite → portrait**. Pass the approved sprite as a *character* reference and 1–3 already-approved portraits as *style* references (on whichever model actually has style slots; see the conflict above). Use the figurine trend's phrasing ("the character in the picture… exactly the same") as the identity lock. The reverse direction (portrait first, then simplify to sprite) is how Supercell's low/high model works. It is only worth doing for creatures not yet drawn, since simplifying a rich render back to a tile sprite tends to lose the silhouette clarity the tile needs.
- **Main risk: detail invention.** A 55–60 px sprite carries little information, so the model will invent ears, textures and markings, and they will differ between attempts. Mitigation: a per-creature **identity spec** pasted into every prompt, with 3–5 signature features, 2–3 locked palette hexes, silhouette notes and the element. Generate N≈4 and pick the closest. Once a baby's portrait is approved, use it as an extra character ref for that line's later forms (adult, Legendary).
- **Avoid keying by design.** A namecard portrait can be a **rectangular or rounded-rect crop with its own painted element background**. That sidesteps the soft-edge chroma-key problem entirely: mask to the frame shape in PixiJS. Request a flat or simple radial background in the creature's element color, not green screen, for portraits.
- **Lighting drift across 28 creatures** is the biggest risk to a "set" feeling (inferred from the absence of any lighting-consistency evidence). Fix one lighting rig in words and reuse it verbatim. Fix one camera. Always include the same 1–2 approved "golden" portraits as style refs.
- **Draft prompt skeleton** (untested; for the report writer to adapt):
  > "Stylized 3D render portrait of the creature in reference image 1, keeping its exact silhouette, colors and markings: [identity spec: e.g., round fox-like head, two flame-shaped ears, ember-orange #FF7A2F body, cream #FFF3D6 belly, glowing yellow forehead gem]. Designer-toy / soft vinyl look, smooth matte rough materials, big soft color gradients, no fine fur or texture noise. Bust crop, head and shoulders, 3/4 view facing left, [camera angle per tier]. Lighting: warm key light from upper left, soft fill, strong [element color] rim light from behind right, gentle ambient occlusion. Background: simple radial gradient of [element color], no scenery, no text. Match the rendering style of reference images 2–3 exactly. Square 1:1, character fills 80% of frame."
- Model choice: follow the sibling notes (Nano Banana 2.1 as the default, cheaper, with style refs; Pro for hard fusions), since 28 creatures × ~4 attempts × ~3 forms is only a few hundred images.

### Gaps
- No source tests how consistently Gemini (any version) holds a *set* of 20–30 different creatures in one "stylized 3D render" style. Also untested: whether a tiny low-detail sprite works as a reliable character reference compared with a hi-res drawing.
- No independent comparison was found of Gemini vs. peers (GPT Image 2.x, FLUX, Midjourney) specifically for Pixar/clay/designer-toy creature portraits. See the sibling notes for general arena rankings.
- No primary Google doc text for a "3D render" or "clay" prompt template was fetched; the figurine prompt is community-originated.

## Q5. Conveying the cute → majestic arc in portrait art (brief)

### Takeaway
Few sources speak directly to this. The closest evidence is that premium/powerful forms get richer rendering (PLANETA 3D-CG on rule-box/GX/V/ex Pokémon cards) and that ultimates get cinematic camera work (AFK Journey). The arc can be specified as a portrait "ladder" that varies camera angle, lighting drama, pose and frame per tier while keeping the identity anchors fixed.

### Cited Findings
- 3D-CG treatment in Pokémon TCG clusters on rule-box, full-art and GX/V/ex cards, the stronger and rarer forms — [pkmncollectors: PLANETA Mochizuki](https://www.pkmncollectors.com/artists/planeta-mochizuki); [pkmncollectors: PLANETA Igarashi](https://www.pkmncollectors.com/artists/planeta-igarashi)
- AFK Journey ultimates use dynamic camera work to mark the power moment — [BlueStacks: AFK Journey beginner's guide](https://www.bluestacks.com/blog/game-guides/afk-2-journey/afkj-beginners-guide-en.html)
- Supercell steers the eye to the face with value gradients, a lever that can be tuned per tier — [Adobe Substance 3D Magazine](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale.html)
- The figurine-trend tips note that dynamic poses beat static ones, and that over-realism kills the toy charm. Keep babies toy-like and push realism and drama only at higher tiers — [Decrypt](https://decrypt.co/338994/how-use-google-nano-banana-ai-transform-selfies-digital-figurines?amp=1)

### Inferences
- Suggested portrait ladder (inference; untested):
  - **Baby / tile pets** (if they get portraits at all): eye-level or slightly high camera (looking down = small, cute), front-facing, big eyes, soft even lighting with low contrast, pastel element plate, round clay frame, playful expression (tongue out, head tilt).
  - **Fusion (256):** eye-level 3/4 view, confident expression, warm key plus a clear element rim light, a few element particles behind, an element-colored frame with a gem.
  - **Legendary (4096):** low camera angle (looking up = powerful), heroic 3/4 pose with chin up, dramatic backlight or halo glow in the element color, magical particles, an ornate gold or animated foil frame. Keep the same silhouette anchors and palette so the baby is still recognizable inside the adult.
- Keep the rendering style constant across tiers (same designer-toy 3D look) and escalate only lighting, camera and frame. This prevents the style drift that would break recognizability, and the vertical arc then comes from staging rather than a change of medium.

### Gaps
- No art-direction source was found that explicitly describes how Pokémon or other monster-collecting games stage evolutions in portraits (camera angle and lighting by stage). The ladder above is a design inference.
