# Game-focused AI asset platforms for batch, style-consistent 2D generation (status: October 2026)

_Research date 2026-10-14. Target: ~117 transparent 2D images for "2048 Siege" (8 creatures x 4 growth stages via image-to-image, 28 two-parent fusions, 28 soft-vinyl namecard portraits, 8 halos, 17 chibi enemies, eggs, 1 background) in thick-outline sticker / flat cel-shaded style. Budget ~$10-30 per pass. No sign-ups, purchases or trials were made. All figures come from public pages. Pages labelled "updated N days ago" are dated relative to 2026-10-14. Search-snippet-only facts (page not fetched in full) are marked "(snippet)"._

## 1. Can we train/define a reusable style and character from our approved images, then generate many consistent variants? (how many images, how long, what cost)

### Takeaway
Scenario has the most explicit, documented training pipeline. It trains style LoRAs (10-30 images) and character LoRAs (5-15 images) on FLUX.2, Qwen Image or Z-Image bases, plus trainable *edit* LoRAs learned from before/after pairs. Training needs at least the $45/mo Pro plan, and the pricing page lists edit-model training under the $75/mo Max plan. Layer and Leonardo also train LoRAs. Layer allows several LoRAs per reference set and quotes the CU cost before each run. Leonardo calls its LoRAs "Elements", trains them on FLUX Dev, and limits training slots by plan. Ludo, God Mode and most sprite tools use reference images instead of training. PixelLab and Retro Diffusion define styles from references, but only for pixel art.

### Cited Findings
**Scenario**
- Custom model training is on Pro and above. Scenario says it requires "10 to 30 images for a style, or 5 to 15 for a specific character" — [Scenario pricing](https://www.scenario.com/pricing)
- Pro ($45/mo) lists "custom model training". Max ($75/mo) adds "custom editing model training" — [Scenario pricing](https://www.scenario.com/pricing)
- "Pro or higher required for: Canvas, model training, background removal, vectorizing, texture generation" (help article updated ~7 days before 2026-10-14) — [Scenario help: Pricing & Plans](https://help.scenario.com/en/articles/pricing-plans/)
- Trainable LoRA families in the API docs:
  - FLUX.2 Dev (`flux.2-dev-lora`)
  - FLUX.2 Dev Edit (`flux.2-dev-edit-lora`)
  - FLUX.2 Klein (4B/9B, distilled and base)
  - Qwen Image (3 variants, including edit)
  - Z-Image, Z-Image Turbo and Z-Image De-Turbo

  Other training details from the same page:
  - Recommended "5–15 images", maximum 50.
  - Edit models need "a minimum of 2 pairs" of before/after images with instructions.
  - LoRA rank 2–128 (default 64), epochs 1–100.
  - "A LoRA trained on one base model family cannot be used with a different family."

  Source: [Scenario docs: Training models](https://docs.scenario.com/get-started/training/training-models)
- Training cost is only partly published. The docs example estimates "150" CU. The billing article says training "varies widely with the base model, dataset size and number of epochs, from a few hundred to several thousand CUs". No training duration is stated — [Scenario docs: Training](https://docs.scenario.com/get-started/training/training-models); [Scenario help: API usage & CUs](https://help.scenario.com/articles/7934059476-api-usage-and-credits-compute-units)
- Training cost scales with the base family ("compact models (Klein, Turbo) train faster and cost less than full-size Dev variants") and with dataset size and repeats — [Scenario help: Model costs](https://help.scenario.com/articles/8811829644-model-costs-for-asset-generation)
- "Your data and IP never used for training" — [Scenario pricing](https://www.scenario.com/pricing)

**Layer AI**
- Layer's custom training turns your art into LoRAs, with "Auto-train, editable captions, live progress, and up-front pricing". The flow is: build a Reference Set, pick a base model, train. "You can train multiple LoRAs per set." The page claims "Teams at 400+ game studios and entertainment brands use trained styles". It gives no image counts, training time or CU price — [Layer: Custom model training](https://layer.ai/features/custom-model-training.md)
- The Forge API accepts `reference_sets` "each with its own weight", so several trained or reference sets can be mixed in one generation — [Layer docs: Workflows vs Forge](https://layer.ai/docs/workflows-vs-forge.md)
- In Unity, Layer's models are "FLUX foundation models" plus pre-trained LoRAs. Layer also provides custom model training there — [Unity Third-Party AI Terms (dated 28 Jul 2026)](https://unity.com/legal/third-party-ai-terms); [CG Channel, Aug 2025 (snippet)](https://www.cgchannel.com/tag/layer-ai)

**Leonardo.ai**
- LoRA training slots by plan: Essential 1/month, Premium 20, Ultimate 50 (checked 2026-05-22) — [StackSheriff](https://stacksheriff.com/ai-tools/leonardo-ai-pricing/?format=md)
- Elements are trained on Leonardo's FLUX Dev base. A third-party guide says training needs 15–100 images and takes 15–45 minutes. That snippet uses old plan names (Apprentice/Artisan/Maestro), so the data may be from 2024–25 — [Leonardo Element training (snippet)](https://leonardo.ai/element-training/); [HowAIWorks (snippet)](https://howaiworks.ai/ai-tools/leonardo-ai). leonardo.ai pages returned HTTP 403, so this is unverified.
- Leonardo's API docs set a default concurrency limit for "model training" jobs (5), which implies training can be started via the API — [Leonardo docs: Concurrency, queue & rate limits (snippet)](https://docs.leonardo.ai/docs/guide-to-concurrency-queue-and-rate-limit)
- Aggregator and vendor comparisons describe Leonardo's consistency as "selecting one fine-tuned model as the anchor" plus reference images. They call Scenario's LoRA training "the strongest in the category". These are vendor or aggregator views — [eesel.ai (snippet)](https://www.eesel.ai/blog/scenario-ai-alternatives); [Makko blog (vendor)](https://blog.makko.ai/6-best-ai-tools-for-2d-game-art-consistency-in-2026/)

**Reference-only platforms (no training)**
- Ludo "achieves style consistency through reference images rather than training custom models". A style reference makes Ludo match the reference's palette and proportions — [Ludo docs: Image generator (snippet)](https://ludo.ai/docs/image-generator)
- God Mode AI makes "2D game sprites and combat animations from a single image". The site mentions no training — [God Mode AI](https://www.godmodeai.co/)
- AutoSprite offers "custom animation style training" only on Enterprise ($99/mo) — [AlternativeTo (aggregator)](https://alternativeto.net/software/autosprite/about)
- Rosebud PixelVibe uses pre-trained models for tiles, items, portraits and full-body sprites. Bespoke model training is in "closed beta" (likely 2024–25 info) — [Rosebud help: PixelVibe features (snippet)](https://www.rosebud.ai/help-center/pixelvibe-features); [GetApp (snippet)](https://www.getapp.co.uk/software/2244919/pixelvibe)
- Makko AI is a new entrant, and the article is its own blog. It claims a "persistent project-level Collections system, automatic style inheritance" — [Makko blog (vendor, self-ranked #1)](https://blog.makko.ai/6-best-ai-tools-for-2d-game-art-consistency-in-2026/)

**Pixel-art tools (low relevance)**
- Retro Diffusion creates custom user styles (`user__<name>_<id>`) via the API "with exactly one reference image" — [Retro Diffusion API examples (GitHub)](https://github.com/Retro-Diffusion/api-examples)
- PixelLab's `create-image-bitforge` supports "custom art styles using reference images". `create-character-pro` is reference-based, up to 168×168 — [PixelLab API](https://www.pixellab.ai/pixellab-api)

**Unity AI (engine tool)**
- Unity AI Generators use "several first-party (Unity) and Partner Models". Users own all inputs and outputs, and partner models do not train on user data — [Unity AI Models and Partners](https://activation.unity3d.com/es/legal/unityai-models-partners)

### Inferences
- Our existing set of approved images (roughly 20–40) fits Scenario's documented ranges: style 10–30, character 5–15, maximum 50. One style LoRA, plus optional per-creature character LoRAs, is realistic.
- Each training run costs "a few hundred to several thousand CU". One to three runs could therefore use a large share of Pro's 5,000 monthly CU.
- Scenario's trainable edit LoRAs fit the "stage N → stage N+1" growth step unusually well, and possibly "parent pair → fusion" too. They are FLUX.2 Dev Edit or Qwen edit models, learned from 2 or more before/after pairs. The pricing page puts edit-model training on Max ($75/mo), which is over budget.
- Training is not required. Reference-conditioned edit models can use the approved images as references: Gemini/Nano Banana, GPT Image, Seedream and FLUX Kontext. Ludo and God Mode work this way. Scenario Starter ($15) already includes "edit with Kontext or Gemini".
- PixelLab and Retro Diffusion don't suit the sticker style. They only output pixel art on small canvases (see Q3/Q5).

### Gaps
- Neither Scenario nor Layer publishes training wall-clock time. Layer publishes no training CU price; it only shows a quote before each run.
- Leonardo's current (Oct 2026) Element training requirements and costs could not be checked on a primary page (leonardo.ai returned 403).
- It is unclear whether edit-LoRA training is available on Scenario Pro via the API, or only on Max.

## 2. Is there a public API or bulk/batch mode (CSV/prompt lists, workflows) for unattended generation? Rate limits?

### Takeaway
Scenario, Layer, Leonardo, Retro Diffusion and PixelLab all document public REST APIs, and most also offer MCP servers. Layer (Workflows built in its Blueprint editor) and Leonardo (Blueprints) also run multi-step pipelines server-side, triggered via the API. Ludo's API needs a paid Pro plan and allows only 1 concurrent request per endpoint during its beta. Only Leonardo publishes concrete rate limits. No platform documents a CSV-upload batch UI. "Batch" means scripted API calls or workflow runs.

### Cited Findings
**Scenario**
- "API access is available on every paid plan, from Starter up. The Free plan cannot use the API." Plan CUs are shared between the web app and the API. `?dryRun=true` estimates a call's cost without deducting credits, and there is also a Compute Planner tool — [Scenario help: API usage & CUs](https://help.scenario.com/articles/7934059476-api-usage-and-credits-compute-units)
- The API docs cover:
  - text-to-image
  - image-to-image and references
  - background removal
  - "Batch Processing: Process multiple assets generation or modification requests simultaneously"
  - Workflows & Apps
  - an MCP server and an OpenAPI spec

  Source: [Scenario API docs](https://docs.scenario.com/)
- The pricing page markets Scenario as "API-first" — [Scenario pricing](https://www.scenario.com/pricing)
- No rate-limit numbers were found.

**Layer**
- Two API paths share the same async lifecycle and CU billing:
  - **Forge**: `POST /v2/workspaces/{id}/inferences`. Parameters include prompt, dimensions, batch size, guidance files, `reference_sets` and post-processing ("upscale, vectorize, remove background").
  - **Workflows**: `POST /v2/workspaces/{id}/workflows/{workflow_id}/runs`. Workflows are built visually in the Blueprint editor, e.g. "generate an image → upscale → remove background".

  Source: [Layer docs: Workflows vs Forge](https://layer.ai/docs/workflows-vs-forge.md)
- Forge has per-minute generation limits, but "workflow runs are not currently subject to those per-minute generation limits". The limit numbers are not published — same source
- "API access" is included in every tier, with no seat fees — [Layer pricing](https://layer.ai/pricing)

**Leonardo.ai**
- "API plans are distinct from the Leonardo web app plans", and usage is billed in dollars — [Leonardo docs: Getting started](https://docs.leonardo.ai/docs/getting-started)
- Pay-as-you-go (PAYG) API (doc updated 28 Jan 2026):
  - Dollar balance with manual or auto top-up (example: a $10 threshold triggers a $50 charge).
  - "No monthly commitments".
  - "All PAYG users receive the same standardized rate."

  Source: [Leonardo docs: PAYG guide](https://docs.leonardo.ai/docs/payg-guide.md)
- Default limits, raisable on custom plans:
  - Concurrency: 10 image-generation jobs, 10 Blueprint executions, 5 model-training jobs, 10 3D jobs.
  - Rate: 2,000 requests/min across all endpoints. 100/min each for `/v1/generations`, upscale, "no background", texture, Blueprints and 3D.
  - Queue: up to 200 pending image jobs.

  Source: [Leonardo docs: Concurrency, queue & rate limits (snippet)](https://docs.leonardo.ai/docs/guide-to-concurrency-queue-and-rate-limit)
- Blueprints can be executed via the Production API — [Leonardo docs llms.txt](https://docs.leonardo.ai/llms.txt)
- **Conflict:** StackSheriff (May 2026) says "API Access ... only available on the Ultimate plan at $60/month". Leonardo's own docs describe a separate PAYG API — [StackSheriff](https://stacksheriff.com/ai-tools/leonardo-ai-pricing/?format=md) vs [Leonardo PAYG guide](https://docs.leonardo.ai/docs/payg-guide.md)

**Ludo.ai**
- API/MCP access is included on Pro and Studio, not on Indie — [Ludo pricing](https://ludo.ai/pricing)
- "Currently, only 1 simultaneous request is allowed per endpoint" (beta). API and MCP requests consume credits — [Ludo docs: API & MCP](https://ludo.ai/docs/api-mcp)
- The MCP server is at `https://mcp.ludo.ai/mcp`, and the API covers sprites, icons, UI assets, textures, backgrounds and spritesheet animations — [Ludo API & MCP integration (snippet)](https://ludo.ai/api-mcp-integration)

**Retro Diffusion (pixel art)**
- Unattended-run features:
  - REST API v2 (`api.retrodiffusion.ai/v2`).
  - `check_cost: true` runs a free dry run.
  - "Failed generations auto-refund".
  - Idempotency keys and task polling.
  - MCP server with "33 typed tools".
  - Beta "Assistant sessions" with an `auto_approve_budget_usd` cap "for unattended workflows".

  Pixel Fixer is limited to 10 requests/min — [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)

**PixelLab (pixel art)**
- v2 REST API with per-call USD pricing and an MCP server ("Vibe coding (/mcp)"). Docs are at api.pixellab.ai/v2/docs. The page states no rate limits — [PixelLab API](https://www.pixellab.ai/pixellab-api)

**Others**
- God Mode AI links to an API option (/get-api) but publishes no specifics — [God Mode AI](https://www.godmodeai.co/)
- AutoSprite's API is Enterprise-only ($99/mo) — [AlternativeTo](https://alternativeto.net/software/autosprite/about)
- Meshy (otherwise a 3D tool) offers Text-to-Image and Image-to-Image REST endpoints, paid with prepaid API credits — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)
- Unity 6.2 (Aug 2025) replaced Muse/Sentis with in-Editor Unity AI: Assistant, Generators for sprite, texture, material, sound and animation, and the Inference Engine — [KeenGamer (snippet)](https://www.keengamer.com/articles/news/unity-6-2-now-available-introducing-unity-ai-beta/); [Digital Production, Aug 2025 (snippet)](https://digitalproduction.com/2025/08/22/unity-6-2-welcomes-ai-but-pace-caution-user-liability-on-copyright/)
- Rosebud is a browser "vibe coding" game builder. PixelVibe is its asset generator — [Unite.AI (snippet)](https://www.unite.ai/best-ai-game-generators/)
- Roblox's generative tools are 3D/4D. The open-source Cube 3D launched in March 2025, and "4D creation" (interactive objects) is in open beta. It is not a 2D sprite pipeline — [TechCrunch, Mar 2025](https://techcrunch.com/2025/03/17/roblox-releases-its-open-source-model-that-can-create-3d-objects-using-ai/); [Outlook Respawn (snippet)](https://respawn.outlookindia.com/gaming/gaming-news/cube-3d-powers-robloxs-new-4d-interactive-object-tools)

### Inferences
- For an unattended 117-image run, Scenario and Layer are the most turnkey:
  - **Scenario:** API from the $15 Starter plan, free dry-run costing, MCP.
  - **Layer:** server-side generate → remove-background workflows that skip per-minute limits.
- Leonardo's PAYG API (10 concurrent jobs, 100 generation calls/min) easily handles about 350 calls.
- Ludo's 1-concurrent-request limit would still work for about 350 serial calls. However, its API requires Pro, billed annually at $420/yr.
- Unity AI (in-Editor only, no documented external API) and Roblox (3D/4D) don't fit a scripted 2D batch run.

### Gaps
- Rate-limit numbers for Scenario, Layer and PixelLab were not found in public pages.
- No platform documented a no-code CSV/prompt-list bulk uploader. Scenario "Apps" or Layer "Workflows" may fill this role, but that is unverified.
- No 2D image generation was found for Tripo. Rosebud PixelVibe API availability was not found.

## 3. Reference-image conditioning: multiple references per generation (two parents → one fusion)? Image-to-image edits of the previous stage?

### Takeaway
Multi-reference generation now mostly comes from the frontier models these platforms resell:
- GPT Image 2: up to 10 references on Scenario
- Seedream 5.0: 10–14 references
- Nano Banana Pro: up to 14 references
- Minimax Image 01: up to 9 references

Layer adds weighted reference sets and dedicated multi-reference edit models. Scenario's own help article describes only 1–2 reference images per generation for its classic workflow. Every major platform supports image-to-image or instruction editing, which covers deriving each growth stage from the previous one.

### Cited Findings
- **Scenario third-party models** (article updated ~1 month before 2026-10-14):
  - GPT Image 2 "supports up to 10 reference images per generation" and "inpainting via alpha masks".
  - Minimax Image 01 accepts "up to 9 images per request".
  - Ideogram V3 Character uses one reference photo.
  - Also available: Gemini 3.1 and 2.5, Seedream 4.5/4/3, Recraft V4 (including SVG), Qwen Edit Multi-Angle, Retro Diffusion and Z-Image Turbo ControlNet.

  Source: [Scenario help: Third-party image models](https://help.scenario.com/articles/5216194599-third-party-image-models-on-scenario)
- Scenario's classic workflow: "you can upload one or two reference images, each with a different mode and influence ('strength')". This may be legacy; the page returned 404 when fetched — [Scenario help: Reference images (snippet)](https://help.scenario.com/en/articles/use-reference-images-for-enhanced-control)
- Scenario edit tools by plan: Starter includes "edit with Kontext or Gemini". Pro adds GPT editing and Retouch. Starter has "65+ core models", Pro "30+ advanced models" — [Scenario help: Pricing & Plans](https://help.scenario.com/en/articles/pricing-plans/); [Scenario pricing](https://www.scenario.com/pricing)
- **Layer:**
  - Forge supports "guidance files (reference images, masks, poses, depth maps), reference_sets (each with its own weight)" — [Layer docs](https://layer.ai/docs/workflows-vs-forge.md)
  - Multi-reference editing models: "FLUX.3 Image", "Muse Image 1.0" ("precise multi-reference editing") and Qwen Image 2.1. Edit models: FLUX.1 Kontext [dev/pro/max], FLUX.2 [dev] Edit and Qwen-Image Edit 2511 — [Layer models](https://www.layer.ai/models)
  - Reference types include "Style Reference" — [Layer help: Reference types (snippet)](https://help.layer.ai/en/articles/9758846-understanding-different-reference-types)
- **Leonardo:**
  - API recipes cover "Generate Images Using Image Prompts" and "Image Guidance using multiple ControlNets". Model guides exist for Nano Banana, GPT Image 1.5/2/2.5, Seedream 4.0/4.5/5.0 and FLUX — [Leonardo docs llms.txt](https://docs.leonardo.ai/llms.txt)
  - Nano Banana can "merge multiple images – up to eight images at a time" and take "up to 6 reference images". This is a snippet and may not come from Leonardo's own announcement — [Leonardo news: Nano Banana (snippet)](https://www.leonardo.ai/news/nano-banana-gemini-2-5-flash-image)
- **Model-level capacity:**
  - Nano Banana Pro blends up to 14 reference images. Each input reference is billed at ~$0.067 at Google rates — [ThePricer (snippet)](https://www.thepricer.org/how-much-does-nano-banana-cost/)
  - Seedream 5.0 Pro takes up to 10 references, Lite up to 14 — [HackerNoon (snippet)](https://hackernoon.com/a-beginners-guide-to-the-seedream-5-pro-model-by-bytedance-what-you-need-to-know)
- **Ludo:** has reference-image generation modes. A style reference matches the reference's palette and proportions — [Ludo docs: Image generator (snippet)](https://ludo.ai/docs/image-generator)
- **Retro Diffusion:** RD Pro takes "up to 9 reference images". img2img uses `input_image` plus `strength` (0–1) — [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)
- **PixelLab:** `edit-image` handles 16×16 to 400×400, inpaint up to 200×200 and rotate up to 128×128 — [PixelLab API](https://www.pixellab.ai/pixellab-api)
- **Meshy:** Image-to-Image API with nano-banana variants and GPT Image models — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)
- **Scenario edit LoRAs:** trainable from before/after pairs (minimum 2 pairs) — [Scenario docs: Training](https://docs.scenario.com/get-started/training/training-models)

### Inferences
- **Two parents → one fusion** works on Scenario (GPT Image 2, Seedream, Gemini), Layer (multi-reference edit models or weighted reference sets) and Leonardo (Nano Banana, GPT Image, Seedream). Pass parent A, parent B and one style anchor as three or more references. Frontier edit models suit this better than a pure LoRA. On Scenario, GPT editing is listed under Pro, so the 10-reference GPT Image 2 path may require Pro.
- **Stage N from stage N−1** works everywhere (img2img/edit). A Scenario edit LoRA trained on a few approved growth pairs could keep the growth step consistent across all 8 creatures.
- Multi-reference calls cost more. Scenario says reference inputs raise CU cost, and Google bills per input image. The 28 fusions will likely be the most expensive part of the set.

### Gaps
- Maximum reference counts were not confirmed from primary pages for Gemini 3.x on Scenario and Layer, or for Leonardo's own models (Lucid Origin, Phoenix).
- Scenario's current reference limit for its own and custom LoRA models (beyond the 1–2 in an older help article) is unverified.

## 4. Native transparent PNG output or background removal included?

### Takeaway
True native transparent generation is uncommon. Leonardo's "Transparency" feature (2024, SDXL-era models) and Ideogram V3 "Generate Transparent" (available on Scenario) are the clear examples. Most platforms instead bundle cheap background removal as a post-step or workflow node, e.g. Layer at 0.5 CU and Retro Diffusion at $0.01. On Scenario, background removal requires Pro. Sprite-focused tools (Ludo, God Mode, PixelLab) output transparent sprites directly.

### Cited Findings
- **Scenario:**
  - Background removal requires Pro or higher — [Scenario help: Pricing & Plans](https://help.scenario.com/en/articles/pricing-plans/)
  - Background removal is listed as an automated API task — [Scenario API docs](https://docs.scenario.com/)
  - Ideogram V3 Generate Transparent produces a native alpha channel, and Recraft V4 SVG gives vector output — [Scenario help: Third-party image models](https://help.scenario.com/articles/5216194599-third-party-image-models-on-scenario)
- **Layer:**
  - "Pixelcut Background Removal costs 0.5 CUs per generation" — [Layer pricing](https://layer.ai/pricing)
  - The models page lists Ideogram Remove Background, Pixelcut Background Removal, BiRefNet v2 and Image-to-SVG/Recraft V4 Vector. It shows "6 CU" for background removal, which conflicts with the pricing page's 0.5 CU — [Layer models](https://www.layer.ai/models)
  - Remove background is both a Forge post-processing option and a standard workflow step — [Layer docs](https://layer.ai/docs/workflows-vs-forge.md)
- **Leonardo:**
  - "Transparency" is "true native transparent image diffusion" with clean edges. It works best with SDXL-era fine-tunes (Kino XL, Vision XL, AlbedoBase XL). This is March 2024 information — [Leonardo help: Transparency (snippet)](https://intercom.help/leonardo-ai/en/articles/9075772-transparency); [PetaPixel, 20 Mar 2024](https://petapixel.com/2024/03/20/leonardo-ai-can-now-generate-transparent-png-images/)
  - The API has a "Remove bg" endpoint and a migration guide from the remove.bg API — [Leonardo docs llms.txt](https://docs.leonardo.ai/llms.txt)
- **Ludo:** transparent output for the Sprite, VFX Sprite, UI Element, Item Icon and Map Tile image types — [Ludo docs: Image generator (snippet)](https://ludo.ai/docs/image-generator). Sprite sheets export as transparent PNG — [Ludo compare page (snippet)](https://ludo.ai/compare/best-ai-sprite-generators)
- **God Mode AI:** exports "with transparent backgrounds", plus a background-removal tool — [God Mode AI](https://www.godmodeai.co/)
- **Retro Diffusion:** `remove_bg: true` on generation. The standalone `background_remover` costs $0.01 — [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)
- **PixelLab:** transparent backgrounds on multiple endpoints ("additional cost noted") — [PixelLab API](https://www.pixellab.ai/pixellab-api)
- **Unity AI:** image transforms (upscale, remove background, recolor) cost 1–5 credits — [Unity docs: AI credits](https://docs.unity.com/en-us/ai/credits/credits-about)
- **Meshy:** the API pricing page does not mention transparency or background removal for 2D outputs — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)

### Inferences
- Our style (thick dark outline plus cream rim) is easy to cut out cleanly. Generate on a flat contrasting background, then remove it with a matting model.
- Removal cost is tiny on Layer: 0.5 CU ≈ $0.03 at the $0.06/CU marginal rate. A Scenario Starter user would need an external or local remover, since removal is Pro-gated.
- Leonardo's native transparency is documented only for older SDXL fine-tunes. It may not work with the FLUX, Lucid or Nano Banana models that are better at this style.

### Gaps
- It is unconfirmed whether GPT Image's native transparent-background option is exposed through Scenario, Layer or Leonardo.
- The conflicting Layer background-removal CU figures (0.5 vs 6) are unresolved. The pricing page is the more explicit source.

## 5. Pricing: monthly plans, credits per image, realistic cost of ~117 images plus retries; free tiers

### Takeaway
Estimated cheapest credible paths for a full pass (~117 finals, ~350 generations with retries, ~117 background removals):
- **Layer pay-per-use:** ~$0.05/image on FLUX-class models, $10 entry subscription, 300 free CU with a work email. About $10–25.
- **Leonardo PAYG API on its own models:** ~$0.01–0.014/image (estimate), $5 free credit. About $5–30, depending on how many premium-model fusion calls are needed.
- **Scenario Starter:** $15 for 1,500 CU (2–15 CU per image), API included, but no training or background removal.
- **Scenario Pro:** $45/mo, adds training, background removal and unlimited relaxed generations in the web app.

Ludo is cheap per image but sold annually, and API access needs the $420/yr Pro plan. God Mode ($29 for 200 *public* generations) and the pixel-art tools fit poorly.

### Cited Findings
**Scenario (official pages, Oct 2026)**
- Plans:
  - **Starter:** $15/mo, 1,500 CU
  - **Pro:** $45/mo, 5,000 CU, priority queue, "unlimited relaxed generations", custom model training, 500 GB storage
  - **Max:** $75/mo, 10,000 CU, up to 25 users
  - **Enterprise:** custom pricing
  - Annual billing gives a "33%" discount.
  - **Free:** "50 free daily credits · No credit card required"

  Source: [Scenario pricing](https://www.scenario.com/pricing)
- Compute discounts: Pro 10%, Max 20%, Enterprise 30%. Extra Max seats cost $30. Enterprise starts at $125/user/mo. The free plan gives 50 CU/day, resets at 00:00 UTC, has no API, no Relax mode, is "personal use only" and has no rollover — [Scenario help: Pricing & Plans](https://help.scenario.com/en/articles/pricing-plans/)
- Image generation costs "~2-15 CUs per image (varies by model)". Enhancements cost ~5–15 CU — [Scenario help: API usage & CUs](https://help.scenario.com/articles/7934059476-api-usage-and-credits-compute-units)
- Cost rises with resolution (especially 4K), multiple images per call, "reference or control inputs" and pro/max model variants. Scenario publishes only relative costs: "CU rates change ... use a dry run to see the current cost" — [Scenario help: Model costs](https://help.scenario.com/articles/8811829644-model-costs-for-asset-generation)
- **Conflict:** the Makko blog says Scenario is "Paid from $19/month". The official page says $15 — [Makko blog](https://blog.makko.ai/6-best-ai-tools-for-2d-game-art-consistency-in-2026/) vs [Scenario pricing](https://www.scenario.com/pricing)

**Layer AI**
- Official pricing page:
  - "Subscriptions begin at $10/month for 300 Creative Units, increasing by $60 per 1,000 CUs."
  - No seat fees, and "10% of total Creative Units carry over".
  - FLUX.1 [dev] costs 0.6 CU per megapixel (minimum 0.6).
  - Pixelcut background removal costs 0.5 CU.

  Source: [Layer pricing](https://layer.ai/pricing)
- About 0.8 CU per image at $0.06/CU, i.e. ~$0.05 per image (August 2026, based on Layer's calculator) — [Toolradar (snippet, secondary)](https://toolradar.com/tools/layer-ai/pricing). Some aggregators also list "Pro from $20/mo / Team from $60/mo", which is likely legacy — same source
- Free CU: a one-off grant of 50 CU for personal emails or 300 CU for work emails, with no payment method required. New users get 50% off their first one-time pack (300, 500 or 2,000 CU) — [Layer help: Test before paying (snippet)](https://help.layer.ai/en/articles/14094237-how-to-test-layer-before-paying)
- "Units cost less in one-time packages" than in subscriptions, and part of unused units roll over — [Layer help: Subscriptions](https://help.layer.ai/en/articles/12037310-guide-to-layer-s-subscriptions-pricing)
- The models page shows numbers of about 800–1,200 next to each model. They conflict with the 0.6 CU/MP rate and look like quality scores rather than prices, so treat them as unverified — [Layer models](https://www.layer.ai/models)

**Leonardo.ai**
- Web plans (May 2026):
  - **Free:** 150 tokens/day
  - **Essential:** $12/mo ($10 annual), 8,500 tokens
  - **Premium:** $30 ($24 annual), 25,000 tokens
  - **Ultimate:** $60 ($48 annual), 60,000 tokens
  - Rollover on Premium and Ultimate, capped at 3 months' worth.

  Source: [StackSheriff](https://stacksheriff.com/ai-tools/leonardo-ai-pricing/?format=md)
- Paid plans include "unlimited generations on Leonardo's own models" (Phoenix/Lucid/FLUX). Tokens mainly pay for premium third-party models. The estimated cost is ~$0.01–0.014 per image. A separate PAYG Production API comes with a "$5 non-expiring starter credit" (June 2026) — [PricePerToken (secondary)](https://pricepertoken.com/leonardo-ai-pricing)
- There is no flat per-image API rate card. A pricing calculator estimates cost before a batch, and generation responses include a cost breakdown — [APIFrame guide (snippet)](https://apiframe.ai/guides/leonardo-ai-api-guide); [Leonardo docs: Pricing calculator](https://docs.leonardo.ai/v2.0/docs/plan-with-the-pricing-calculator)
- Users switching to PAYG from legacy Basic or Standard API plans save "up to 42%" or "up to 24%" (Jan 2026) — [Leonardo docs: PAYG guide](https://docs.leonardo.ai/docs/payg-guide.md)
- An aggregator lists 8 plans, including "STARTER $72" and "GROWTH $144" (June 2026). These are possibly legacy API tiers and conflict with the PAYG docs — [CostBench (snippet)](https://costbench.com/software/ai-media-apis/leonardo-ai-api/)

**Ludo.ai**
- Plans:
  - **Indie:** $15/mo billed annually ($180/yr), 3,000 credits/yr, $0.06/credit, credit-based image generation, no API
  - **Pro:** $35/mo billed annually ($420/yr), 12,000 credits/yr, "Unlimited" image generation, API/MCP
  - **Studio:** $300/mo
  - No free tier is listed.

  Source: [Ludo pricing](https://ludo.ai/pricing)
- Images cost "0.5 credits" via the API — [Ludo API & MCP integration (snippet)](https://ludo.ai/api-mcp-integration)
- Ludo's own comparison pages say "starts at $20/mo" with a "$50/mo Pro". This is likely monthly billing and is not confirmed on the pricing page — [Ludo compare (snippet)](https://ludo.ai/compare/best-ai-sprite-generators)

**God Mode AI**
- $29/mo "for up to 200 public generations". Credit packs: $32 for 30 credits, $100 for 125. New accounts get 3 free credits — [God Mode AI](https://www.godmodeai.co/). Aggregators list different pricing ("$12 credit packs", "from $19/mo"), which may be older — [The Daily Workflow (snippet)](https://thedailyworkflow.com/service/God%20Mode%20AI)

**Retro Diffusion (pixel art)**
- RD Fast ~$0.03, RD Plus ~$0.06, RD Pro $0.18 per image. Background removal costs $0.01, and failed generations are refunded — [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)
- Prepaid, no subscription, "credits never expire", free starter credits — [mcpservers.org (snippet)](https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp)
- Canvas sizes are 12–512 px; RD Pro is limited to 12–256 px — [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)

**PixelLab (pixel art)**
- API costs $0.006–$0.15 per call (e.g. Pixen 128×128 at "$0.00793") — [PixelLab API](https://www.pixellab.ai/pixellab-api)
- Subscriptions: Pixel Apprentice $12 (2,000 generations), Pixel Artisan $24 (images up to 400×400), Pixel Architect $50 (10,000 generations). Free trial of 40 generations. Web credits run from $5 for 250 to $50 for 3,500 — [Cinevva 2026 guide (snippet)](https://app.cinevva.com/guides/ai-pixel-art-generators)
- PixelLab's own pricing page did not render the plans when fetched — [PixelLab pricing](https://www.pixellab.ai/pricing)

**Meshy (2D via resold models)**
- Text-to-Image credits: nano-banana 3, nano-banana-2 6, nano-banana-2-lite 3, nano-banana-pro 9, GPT Image 9. Image-to-Image is the same except GPT Image at 12. No dollar-per-credit rate is published — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)

**Sorceress (2026 entrant)**
- "$1 = 100 credits", packs from $10 to $100, Sorceress Pro lifetime "$49 one-time". AI generation is billed in credits separately — [Sorceress wiki: Plans & billing](https://sorceress.games/wiki/sorceress/plans-credits-billing)
- Image models: Nano Banana Pro 18 credits, Nano Banana 2 9–17 credits, other models 2–6 credits (snippet; exact page unverified) — [Sorceress blog (snippet)](https://sorceress.games/blog/equip-ai-for-game-developers-indie-toolkit-2026)
- **Conflict:** another Sorceress page lists monthly plans (Indie $15/mo with 100,000 credits ... Scale $100/mo) — [Sorceress blog (snippet)](https://sorceress.games/blog/launch-an-ai-game-maker-free-browser-no-code-2026)

**AutoSprite (sprite-sheet animator)**
- Free plan (15 credits/mo), Starter $12, Pro $29, Enterprise $99 (API and style training on Enterprise only) — [AlternativeTo (aggregator)](https://alternativeto.net/software/autosprite/about)

**Unity AI**
- Credit costs: style-model image 1–2 credits; foundation model (GPT Image, FLUX Pro) 4–6; Gemini 1–5; transforms 1–5. Unity calls these "representative examples only" — [Unity docs: AI credits](https://docs.unity.com/en-us/ai/credits/credits-about)
- Unity Personal: 14-day trial with 1,000 credits, then $10/mo for 1,000 credits (Japanese 2026 article; secondary) — [issoh.co.jp (snippet)](https://www.issoh.co.jp/tech/details/8536/)

**Reference price for a commonly resold model**
- Nano Banana Pro costs $0.134 per image at 1–2K and $0.24 at 4K, plus ~$0.067 per input reference image (Google rates via a third party) — [ThePricer (snippet)](https://www.thepricer.org/how-much-does-nano-banana-cost/)

### Inferences
**Estimated cost of one full pass.** Assumptions:
- 117 final images at ~3 attempts each ≈ 350 generations.
- The 28 fusions × 3 ≈ 84 calls use multi-reference premium models.
- ~117 background removals.
- 0–2 LoRA trainings.

These are estimates built from the cited unit prices, not quotes.

| Platform / path | Est. cost of a pass | Why / caveats |
|---|---|---|
| **Layer**, $10/mo (300 CU) + top-up or discounted one-time pack | **~$10–25** | 350 × ~$0.05 ≈ $17.5, plus 117 removals × 0.5 CU ≈ $3.5. The 300 free CU (work email) offsets part of this. Premium multi-reference model CU rates and training CU are unknown. |
| **Leonardo PAYG API** ($5 free) | **~$5–30** | 350 × ~$0.01–0.014 ≈ $3.5–5 on its own models. If the 84 fusion calls use Nano Banana Pro at Google-like rates (~$0.13 + $0.067/reference), add ~$15–25. Per-model API prices are not published. |
| **Leonardo web Essential** ($12/mo) | **$12** | "Unlimited" generations on its own models plus 1 training per month, but UI only (no API). Paid plans own their outputs. |
| **Scenario Starter** ($15/mo) | **$15** (maybe 2 months) | 1,500 CU ÷ 350 ≈ 4.3 CU per generation, so this fits only cheap models. No training or background removal (Pro-gated). API included. |
| **Scenario Pro** ($45/mo) | **$45** (1 month) | Covers training (150 to several thousand CU) plus ~350 generations at ~10 CU plus background removal within 5,000 CU. Pro is "unlimited relaxed" in the web app. Annual billing ≈ $30/mo but commits $360/yr. |
| **Ludo** Indie annual / Pro annual | $180 / $420 commitment | ~$0.03/image (0.5 credits × $0.06), but annual commitment and API only on Pro. Monthly $20/$50 unconfirmed. |
| **Retro Diffusion / PixelLab** | ~$2–63 | Pixel-art only, ≤256–512 px canvases. Unsuitable for the sticker style. |
| **God Mode AI** | $29+ | 200 *public* generations, focused on animation. Poor fit. |
| **Sorceress** | $49 lifetime + ~$7–60 credits | New, with conflicting pricing pages. Resells Nano Banana and similar models. |
| **Unity AI** | ~$10/mo | 1,000 credits, 1–6 credits per image, but in-Editor only. |

- For free pilots before paying: Scenario's 50 CU/day suits style tests, but is personal use only with no API. Layer gives 300 one-off CU with a work email. Leonardo gives 150 tokens/day, but outputs are public and Leonardo owns the IP (see Q6). Leonardo's API also has a $5 starter credit. Retro Diffusion has free starter credits, PixelLab 40 trial generations, God Mode 3 credits, and AutoSprite 15 credits/mo. Ludo lists no free plan.

### Gaps
- Exact per-model prices for Gemini, GPT Image and Seedream are not public on Scenario, Layer or Leonardo. They only appear via dry runs or calculators behind a login.
- It is unknown whether Scenario Pro's "unlimited relaxed generations" also apply to API calls; if so, retries would be nearly free.
- Ludo's monthly (non-annual) pricing and Leonardo's current API tiers could not be confirmed on primary pages (Leonardo returned 403).

## 6. Commercial rights and ownership, IP indemnity, and underlying models

### Takeaway
The main game platforms grant commercial use and ownership on paid tiers:
- Scenario: "You own what you create".
- Layer: the customer owns "all rights, title and interest".
- Leonardo: IP vests in paid users. On the free plan it vests in Leonardo and outputs are public.

None of the game-focused platforms publicly offers IP indemnity on self-serve plans. Scenario Enterprise adds "IP Detection", and Layer's enterprise FAQ does not mention indemnity. The underlying models are mostly resold frontier models (FLUX, GPT Image, Gemini/Nano Banana, Seedream, Qwen, Ideogram, Recraft) plus vendor or customer LoRAs.

### Cited Findings
- **Scenario rights:** "All paid plans include a full commercial license. You own what you create." "Your data and IP never used for training." Enterprise adds Quality Gate, IP Detection, watermarking, data privacy guarantees, SSO/SAML, SOC 2 and a DPA — [Scenario pricing](https://www.scenario.com/pricing). The free plan excludes commercial use — [Scenario help: Pricing & Plans](https://help.scenario.com/en/articles/pricing-plans/)
- **Scenario models:** Unity's partner listing (28 Jul 2026) says Scenario uses FLUX, GPT-Image, Google Gemini and Seedream plus LoRAs — [Unity Third-Party AI Terms](https://unity.com/legal/third-party-ai-terms). Trainable bases are FLUX.2, Qwen Image and Z-Image — [Scenario docs](https://docs.scenario.com/get-started/training/training-models). Third-party models include GPT Image 1/1.5/2, Gemini 2.5/3.1, Seedream, Ideogram V3, Recraft V4, Minimax, Qwen, Hunyuan, Luma Photon and Retro Diffusion — [Scenario help: Third-party models](https://help.scenario.com/articles/5216194599-third-party-image-models-on-scenario)
- **Layer rights:**
  - "the customer owns all rights, title and interest in the output it generates", for "lawful personal and commercial purposes"
  - Reference sets, workflows and trained models are customer-owned.
  - "Layer shall not train any models...on your content or inputs."
  - Data is stored in the EU, and admins can switch individual models on or off.
  - The FAQ does not address indemnification.

  Source: [Layer help: Enterprise FAQ – IP ownership](https://help.layer.ai/en/articles/13720217-enterprise-faq-ip-ownership-data-privacy-model-governance). Every tier includes a "Commercial license for all users" — [Layer pricing](https://layer.ai/pricing)
- **Layer indemnity:** a snippet says enterprise agreements "typically include indemnification structures, using a shared-risk model". This comes from a vendor blog and is unverified — [Layer blog (snippet)](https://www.layer.ai/blog/ip-consistency-ai-generation-guide-game-studios)
- **Layer models:** FLUX.1/2/3 and Kontext, Gemini 3 Pro Image and 3.1 Flash Image, GPT Image 1.5/2/2.5, Seedream 4.0–5.0, Qwen Image, Ideogram V4/V4.5, Recraft V4/V4.1, Krea 2 and Muse Image 1.0 — [Layer models](https://www.layer.ai/models). Layer markets "300+ frontier AI models" (vendor claim) — [Layer alternatives page (snippet)](https://www.layer.ai/alternatives/scenario-alternatives)
- **Leonardo rights:** for paid plans, IP "will vest in you upon creation". For the free plan, IP "will vest in us" and outputs are public. Leonardo keeps broad rights over public content. Free-tier content is used for training, but paid private content is not used without consent — [terms.law summary (snippet)](https://terms.law/ai-output-rights/leonardo/); [Leonardo help: Commercial usage (snippet)](https://intercom.help/leonardo-ai/en/articles/8044018-commercial-usage)
- **Leonardo models:** Lucid Origin/Realism and Phoenix (its own), FLUX Dev/Schnell/Pro/2 Pro, GPT Image 1.5/2/2.5, Ideogram 3.0/4.5, Nano Banana (multiple versions) and Seedream 4.0/4.5/5.0 — [Leonardo docs llms.txt](https://docs.leonardo.ai/llms.txt)
- **God Mode AI:** "Commercial licensing included" with subscriptions. The $29 plan covers "public generations", and the underlying models are not disclosed — [God Mode AI](https://www.godmodeai.co/)
- **Ludo:** the pricing page states no explicit commercial terms, and the underlying models are not disclosed — [Ludo pricing](https://ludo.ai/pricing)
- **PixelLab / Retro Diffusion:** both use their own pixel models (PixelLab: pixflux, pixen, bitforge; Retro Diffusion: RD Fast/Plus/Pro) — [PixelLab API](https://www.pixellab.ai/pixellab-api); [Retro Diffusion API examples](https://github.com/Retro-Diffusion/api-examples)
- **Meshy:** its 2D API runs Google Nano Banana variants and OpenAI GPT Image — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)
- **Unity AI:** users own inputs and outputs, and partner models don't train on user data — [Unity AI Models and Partners](https://activation.unity3d.com/es/legal/unityai-models-partners). Coverage of Unity 6.2 carries the headline "User Liability on Copyright" — [Digital Production, Aug 2025](https://digitalproduction.com/2025/08/22/unity-6-2-welcomes-ai-but-pace-caution-user-liability-on-copyright/)
- **Indemnity landscape:** Adobe markets contractual IP indemnification for eligible Firefly enterprise offers. OpenAI's Services Agreement includes IP indemnity for enterprise outputs "in certain circumstances" — [arXiv survey 2608.14730 (snippet)](https://arxiv.org/pdf/2608.14730)

### Inferences
- For an indie mobile game, paid-tier ownership on Scenario, Layer or Leonardo is adequate. Avoid Leonardo's free tier (Leonardo owns the IP and outputs are public) and God Mode's public generations if pre-launch secrecy matters.
- No game-focused vendor indemnifies self-serve users. The practical risk is accidental resemblance to existing IP. Conditioning on our own approved art (LoRA or references) reduces it.
- Because most platforms resell the same frontier models, the differences come from the wrappers: training, workflows, background removal, pricing and terms. Raw image quality from the same model should be similar across platforms.

### Gaps
- The full terms of service of Scenario, Layer, Ludo and God Mode were not read for indemnity, warranty or liability-cap clauses. Leonardo's indemnity position was not verified either.
- Ludo, God Mode and AutoSprite don't disclose their underlying models.

## 7. Evidence of quality for cute creature / sticker styles (showcases, studio case studies, user reviews 2025–2026)

### Takeaway
There is solid evidence of production use in casual mobile pipelines:
- Scenario: Nukebox, Mighty Bear Games, InnoGames, Wild Blueberry.
- Layer: 16 published case studies, including Bunch, Cosmic Lounge and Fortune Mine Games.
- Unity picked Scenario and Layer as its partner model providers for sprite generation.

However, no showcase, case study or independent review found here specifically tests thick-outline sticker art or cute creature sets. Most "comparisons" are written by vendors (Ludo, Layer, Makko).

### Cited Findings
- **Scenario / Nukebox** (Food Truck Chef, casual mobile):
  - Custom models trained on studio sketches, with LoRA refinements for pose and costume variants.
  - Gemini is the preferred model, reaching near-final renders in 1–2 attempts versus 5+ with earlier tools.
  - Pre-production went from 3–4 weeks to hours, and ~20 artists became a 4-person core. The case study is undated.

  Source: [Scenario case study: Nukebox](https://www.scenario.com/case-studies/nukebox-live-ops-art-engine)
- **Scenario / Mighty Bear Games** (Singapore mobile studio): "80% workflow efficiency gains and a 90% reduction in tool complexity" — [Scenario case study: Mighty Bear (snippet)](https://www.scenario.com/case-studies/mighty-bear-games)
- **InnoGames** used custom-trained Scenario models for character design and icon creation — [InnoGames tech blog (snippet)](https://blog.innogames.com/innogames-x-scenario-streamlining-our-game-production/)
- **Wild Blueberry Games:** "4x faster production speed", "500+ asset variations", "quality score of 9.2/10" (vendor metric) — [Scenario case study (snippet)](https://www.scenario.com/case-studies/wild-blueberry-games)
- **Layer case studies:**
  - 16 studios: Ace Games, Bunch, Celestial Alpaca Studios, Cosmic Lounge, Fortune Mine Games, Gamegos, Games United, LBC Studios, Live Play Mobile, Lokum Games, NoExit Games, PlayPack, Upland, Wixot, Work Dog.
  - Games United: "240% increase in productivity" on backgrounds and UI.
  - Celestial Alpaca (two-person indie): "over 200 game assets".
  - Fortune Mine Games: level design "72%" faster.

  Source: [CaseStudies.com: Layer (snippet)](https://www.casestudies.com/company/layer-ai)
- **Unity AI** ships Scenario and Layer models and LoRAs for sprite generation inside the Editor — [Unity Third-Party AI Terms](https://unity.com/legal/third-party-ai-terms)
- 2026 roundups name Scenario as best for 2D style consistency ("can be trained on your art bible"). One says that "As of May 2026, Scenario offers the highest-fidelity paid path, while PixelLab provides the broadest paid option" (snippet; the exact page among these roundups is unverified) — [Summer Engine (snippet)](https://www.summerengine.com/es/blog/ai-2d-game-asset-generator); [techsy.io (snippet)](https://techsy.io/da/blog/bedste-ai-spilasset-generatorer-2026)
- Leonardo publishes a tutorial titled "How to generate a full game asset suite with Leonardo.Ai" (not fetched) — [Leonardo news](https://www.leonardo.ai/news/how-to-generate-a-full-game-asset-suite-with-leonardo-ai)
- Vendor-written comparisons: Makko ranks itself "#1 best for consistency" — [Makko blog](https://blog.makko.ai/6-best-ai-tools-for-2d-game-art-consistency-in-2026/). Ludo publishes "X vs Ludo" pages — [Ludo vs Scenario (snippet)](https://ludo.ai/compare/ludo-vs-scenario). Layer publishes "alternatives" pages — [Layer: Scenario alternatives (snippet)](https://www.layer.ai/alternatives/scenario-alternatives)

### Inferences
- Thick outlines, a cream rim and flat cel shading form a simple, high-contrast style. Trained LoRAs and frontier edit models usually reproduce such styles well.
- The likely failure modes over 117 images are palette drift, varying outline weight and lost rim highlights. A trained style LoRA (Scenario or Layer) plus strict per-element palette prompts, and if needed post-hoc palette quantisation, is the most robust setup.
- Given the gaps, the cheapest way to get real quality evidence is a small pilot on free credits: 1 creature × 4 stages, 2 fusions and 1 namecard. Use Scenario (50 CU/day, personal use only, so treat it as a test), Layer (300 one-off CU) and Leonardo ($5 API credit).
- Among the four leading candidates, the overall fit for this brief ranks:
  1. **Scenario:** best training plus API, but training and background removal sit at $45.
  2. **Layer:** cheapest pay-per-use with built-in workflows and background removal.
  3. **Leonardo:** cheapest per image via PAYG, but the strongest consistency features sit in its web plans.
  4. **Ludo:** reference-only and annual billing.

  PixelLab, Retro Diffusion, God Mode, AutoSprite, Rosebud, Meshy and Roblox are low relevance for this static sticker-style set.

### Gaps
- No independent 2025–2026 user reviews (Reddit r/gamedev or r/IndieDev, X, Product Hunt) about cute-creature or sticker output quality were retrieved in this pass.
- No GDC 2025/2026 talk, 80.lv or Game Developer article about these platforms' sticker-style quality was found.
- Case-study dates are mostly missing. The Layer funding news found is from 2023 and was not used.
