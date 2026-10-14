# Market, Art-Style Landscape and IP Risk for "2048 Siege" Creature Pets

Research date: 2026-10-14. Figures from market-intelligence vendors (Sensor Tower, AppMagic, AppGoblin, etc.) are third-party estimates, not audited company numbers. Each one is labelled with its date and source.

## Q1. What art styles do comparable games use, and how are they described?

### Takeaway
The commercially proven comparables split into three visual groups:
- **Cartoon/stylized 2D** (Kingdom Rush, Cookie Run, Slime Legion-type Chinese casual TD).
- **3D-modelled assets shown as 2D or 2.5D** (Merge Mansion, Rush Royale, Pokémon's modern 3D).
- **Pixel art**, used mainly by indie creature collectors (Coromon, Cassette Beasts) that lean on GBA-era Pokémon nostalgia.

Slime Legion, the direct reference for 2048 Siege's enemies, is a merge plus roguelike tower-defense game where monsters defend a forest against invading "heroes". That is the same role inversion 2048 Siege uses.

### Cited Findings
**Slime Legion (direct reference)**
- Developer/publisher is Perfeggs Technology Co., Limited. The App Store lists it as a roguelike tower defense where "brutal heroes" invade a peaceful monster forest. The player merges monsters, builds lineups, protects a castle and picks roguelike skills. US store rating is 4.8/5 (5,000+ ratings). Version 4.6.0 shipped on Sept 29, 2024. Units carry elemental attributes (fire, water, earth, light, dark), and hero/lord names draw on folklore (Circe, Rhea, Tamamo, Wukong). — [App Store: Slime Legion](https://apps.apple.com/us/app/slime-legion/id1664686966)

**Tower defense comparables**
- Kingdom Rush (Ironhide, est. 2010): co-founder Gonzalo Sande's art design "focused on creating a detailed, cartoony style". Press describes it as "vivid, hand-drawn". Later entries keep "the classic cartoonish style" but add more detail and animation. — [Wikipedia: Kingdom Rush](https://en.wikipedia.org/wiki/Kingdom_Rush); [Pocket Gamer: Kingdom Rush 5/6 dev interview](https://www.pocketgamer.com/kingdom-rush-6-genesis/dev-interview/)
- Rush Royale: coverage calls its art "colorful, stylized" and "character-driven", which sets it apart from traditional TD. This is a weak secondary source (interview page summary). — [Pocket Tactics: Rush Royale x Pac-Man interview](https://www.pockettactics.com/rush-royale/pacman-interview)
- Random Dice (111%): launched August 2019. It combines tower defense, random summoning, merging dice with the same pips, and real-time PvP. — [DianDian news](https://www.diandian.com/en/news/K62Fr6rLzfihMzH8EAp2)

**Merge games**
- Merge Mansion (Metacore):
  - Pipeline: artists build 3D models in Blender, take them "as finished as possible" before texturing, then animate in Unity or Spine 2D.
  - Item art goal: "the optimal angle that would not only fill the square space in the grid but also look good and be easily identifiable."
  - The team tested a fantasy theme first. The heroine went from "a fantasy princess with pink hair" to "a cartoonish girl with blue hair" before becoming the final red-haired Maddie.
  - Article dated June 3, 2021. — [Metacore: How Merge Mansion's art evolves](https://metacoregames.com/news/in-a-nutshell-how-merge-mansions-game-art-evolves-from-first-sketches-to-final-assets/)
- Suika Game derives from the Chinese browser game "Merge Big Watermelon" (January 2021). Players drop fruit into a container and merge identical fruit into the next fruit in a cycle. — [Wikipedia: Suika Game](https://en.wikipedia.org/wiki/Suika_Game)

**Creature collectors**
- Cassette Beasts (Bytten Studio), co-founder and artist Jay Baylis:
  - On sprites: "a lot of the Pokémon have never looked better than they did as sprites". Those designs "were designed to be sprites", whereas "the jump to 3D hasn't been as inspiring".
  - The team aimed to "look like a modern version of stuff you might remember" rather than pure retro.
  - Differentiators are mechanical: monsters are recorded onto cassette tapes instead of caught in balls, the player transforms into monsters, and "every monster can fuse and is animated on-screen". — [Digital Trends interview](https://www.digitaltrends.com/?p=3320192)
- Coromon: reviewers describe "brilliant pixel-art" with "excellent animation of the creatures" and a "modern pixel art style". It is repeatedly compared to Pokémon from before the 3D switch, "most closely" to Pokémon Ruby. — [Twinfinite review](https://twinfinite.net/reviews/coromon-review/); [Digitally Downloaded review](https://www.digitallydownloaded.net/2022/08/review-coromon-nintendo-switch.html)
- Temtem uses 3D, and some players say they prefer Coromon's 2D pixel look because of that. This is anecdotal forum and review commentary. — [Dexerto: Pokémon vs Temtem](https://www.dexerto.com/gaming/pokemon-vs-temtem-differences-which-is-better-1938549/); [Steam discussion](https://steamcommunity.com/app/1218210/discussions/0/3272436223681890997)
- Palworld: internet users compared its in-game 3D models with Pokémon and pointed to "nearly identical proportions". One Pal's face was said to be nearly identical to Galarian Meowth's. — [Insider Gaming: Did Palworld really plagiarize Pokémon?](https://insider-gaming.com/did-palworld-really-plagiarize-pokemon/); [Hitmarker](https://hitmarker.net/news/the-pokemon-company-is-currently-investigating-palworld-675763)
- One commentator cited "Anubis looks like Lucario" as an example. Claims of stolen 3D assets stayed unproven; only a "similar geometrical structure of the models" was shown. — [GamerBraves newsletter, Feb 8, 2024](https://gamerbraves.substack.com/p/gamerbraves-newsletter-vol-117-palworld)

**Pet-adjacent casual**
- Capybara Go! (Habby) rode capybara viral trends at launch. It comes from Gorilla Games, the studio behind Archero and Survivor!.io. — [GameRefinery June 2025 review](https://www.gamerefinery.com/mobile-game-market-review-june-2025/); [TechNode](https://technode.com/2024/12/19/capybara-go-takes-40-million-in-overseas-revenue-within-two-months-of-launch/)
- Cookie Run: Kingdom: a third-party blog title suggests the franchise is moving toward 3D ("CookieRun Kingdom goes 3D"). Not verified beyond the headline. — [FoxData blog](https://foxdata.com/en/blogs/cookierun-kingdom-goes-3d-sweet-treat-or-overhyped-sugar-rush)

### Inferences
- **Slime Legion overlap.** 2048 Siege copies Slime Legion's hero-enemy style and its monsters-defend-against-heroes premise. Slime Legion's monster units are also merge-evolved and elemental. If the pets share Slime Legion's rendering (2D chibi, outlined), the game will read as "Slime Legion with a 2048 board". If the pets use a different render treatment from the hero enemies, the two factions separate visually and the game gains its own identity.
- **3D-to-2D pipelines suit PixiJS.** Merge Mansion builds items in 3D (Blender) and renders them to 2D sprites. That shows the "soft 3D toy" look does not need a 3D runtime: pre-rendered sprites or Spine are enough.
- **Readability in a grid is the main constraint for merge art.** Metacore's "fill the square… easily identifiable" principle applies directly to 4×4 tiles that must also act as turrets.
- **Pixel art carries a "Pokémon-like" signal.** In the creature-collector niche, press frames pixel art mainly through its resemblance to GBA-era Pokémon (Coromon gets compared to "Pokémon Ruby"). For a creature-pet game, pixel art may increase the Pokémon association.
- **Fusion is a competitor's headline.** Cassette Beasts markets fusion ("every monster can fuse") as its differentiator. 2048 Siege's 28 fusion pets are a known hook, not a novel one, so the visual treatment of fusions has to carry the distinctiveness.

### Gaps
- I found no first-party art-direction interviews for Rush Royale, Random Dice, Archero, Bloons TD 6, Plants vs. Zombies, My Singing Monsters, Monster Legends, Neko Atsume, Tamagotchi apps, Pokémon Café Mix/Unite, Temtem or Merge Dragons within the tool budget. Descriptions of those styles would come from general knowledge, not verified sources.
- Slime Legion's developer has no press or art-director commentary. The style description above comes only from the store listing; screenshots were not visually analysed.

## Q2. Which comparables are commercially strong, and does any style perform better in ads or store pages?

### Takeaway
Merge-TD and creature games with cartoon or stylized art earn hundreds of millions of dollars:
- Rush Royale: $500M lifetime.
- Random Dice: about $240M.
- Archero: about $263M.

The Pokémon IP is in a different league (Pokémon GO above $9B lifetime; TCG Pocket above $1.6B in 1.5 years). There is no rigorous public A/B evidence that one specific art style (chibi vs 3D vs pixel vs flat) wins in ads. The evidence available is directional: casual-looking art acquires users more cheaply, cartoon dominates casual top-grossing, full-3D ad creatives became a casual-game trend in 2024–25, and icon changes alone can move store conversion by 10–25%.

### Cited Findings
**Tower defense and roguelite**
- Rush Royale (MY.GAMES): passed $500M lifetime revenue and 105M+ downloads (announced June 23, 2026; launched 2020). — [MY.GAMES press release](https://about.my.games/news/567); [Game Developer](https://www.gamedeveloper.com/press-release/rush-royale-achieves-500-million-in-lifetime-revenue)
- Random Dice (111%): 21.56M downloads and about $240M lifetime revenue as of end of June 2026. Random Dice 2 launched Aug 13, 2026 with no gacha: about 130K downloads and about $170K revenue in its first three days. — [DianDian](https://www.diandian.com/en/news/K62Fr6rLzfihMzH8EAp2); [Inven Global](https://www.invenglobal.com/articles/24703/111-officially-launches-new-title-random-dice-2)
- Archero (Habby, 2019): lifetime net revenue estimated at over $263M with nearly 96M downloads. Survivor.io is at $464.5M (estimates as of January 2025). — [PocketGamer.biz](https://www.pocketgamer.biz/habbys-archero-2-makes-6-6m-in-first-week-over-10-of-archeros-lifetime-earnings)
- Archero 2 made $32.8M in its first 30 days. — [PocketGamer.biz](https://www.pocketgamer.biz/archero-2-makes-328m-in-first-30-days-from-player-spending)
- Capybara Go! (cute-animal roguelite):
  - Passed $100M gross player spending on Feb 2, 2025, under three months after the full worldwide rollout. — [PocketGamer.biz](https://www.pocketgamer.biz/habbys-capybara-go-surpasses-100m-in-gross-player-spending)
  - Reached $40M overseas revenue by Dec 11, 2024. — [TechNode](https://technode.com/2024/12/19/capybara-go-takes-40-million-in-overseas-revenue-within-two-months-of-launch/)
  - Revenue and downloads were "on a downhill trajectory by mid-2025". — [GameRefinery June 2025](https://www.gamerefinery.com/mobile-game-market-review-june-2025/)

**Merge**
- The Merge-2 ("merge with meta") genre grew revenue +94% YoY to $685M in H1 2025 (AppMagic). — [GameDevReports: AppMagic casual H1'25](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125)
- Gossip Harbor reportedly earned about $550M, over 33% of genre revenue, and held the #1 revenue spot in H1'25. The time window for the $550M figure is unclear in the summary. — [Games Alchemy](https://gamesalchemy.substack.com/p/the-next-billion-dollar-merge-games)
- Merge Mansion's revenue had reverted to early-2024 levels despite tripled event frequency. — [GameDevReports: AppMagic casual H1'25](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125)
- 80% of merge genre revenue sits with the top 10 titles, and LiveOps events are the core monetization driver. — [GameDevReports: AppMagic casual H1'25](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125)
- Suika Game passed 10M downloads, about 11M as of September 2024. The paid iOS version grossed almost $2M in its first three months (early 2024). — [Siliconera](https://www.siliconera.com/suika-game-surpassed-10-million-downloads/); [Wikipedia](https://en.wikipedia.org/wiki/Suika_Game)

**Chibi / cute IP**
- Cookie Run: Kingdom: about $498M all-time revenue and 47.5M downloads "as of 2026" (Udonis aggregator). The same source also says $500M by January 2024. That is internally inconsistent; treat the game as roughly $0.5B lifetime. — [Udonis](https://www.blog.udonis.co/statistics/cookie-run-kingdom)
- The CookieRun franchise reached 300M players and over $1B lifetime revenue. — [GamesBeat](https://gamesbeat.com/cookierun-new-world-unveiled-as-franchise-hits-300m-players-and-more-than-1b-in-lifetime-revenue/)

**Creature games**
- Pokémon GO: over $1B in 2025 alone and over $9B lifetime by July 2026 (Sensor Tower). — [MobileGamer.biz](https://mobilegamer.biz/data-digest-pokemon-go-hits-9bn-gameloft-profits-rise-gungho-sells-179m-stake-fresh-market-statsmore/); [WN Hub](https://wnhub.io/news/analytics/item-51864)
- Pokémon TCG Pocket: $1.3B in its first year from October 2024 (AppMagic), more than Pokémon GO's first year. Over $1.6B after 1.5 years. — [WN Hub](https://wnhub.io/news/analytics/item-49183); [PocketGamer.biz](https://www.pocketgamer.biz/pokemon-tcg-pocket-makes-16bn-in-15-years/)
- Palworld (PC/console, used as a market-signal reference):
  - 32M players by Feb 19, 2025. — [Game World Observer](https://gameworldobserver.com/2025/02/19/palworld-32-million-players-first-year-indie-games)
  - Sales above 30M copies and nearly 1M concurrent Steam players around the 1.0 launch (July 2026). — [Notebookcheck](https://www.notebookcheck.net/Palworld-1-0-surges-to-nearly-1-million-concurrent-Steam-players-as-sales-top-30-million-copies.1352374.0.html)
- "Palmon: Survival", a mobile Palworld-like, rose from about $7.7K to over $140K weekly revenue in US Android during Q2 2025 (Sensor Tower). — [Sensor Tower Q2 2025 US Android "Pokémon collector" games](https://sensortower.com/blog/2025-q2-android-top-5-pokemon%20collector%20games-revenue-us-6089902328293296048c7c1b)
- My Singing Monsters: AppGoblin estimates about 76.7M installs and about $200K+/month. Monster Legends (Socialpoint): about 33.2M installs and about $100K+/month. These are low-confidence model estimates, and the ad-share splits they report look implausible. — [AppGoblin MSM](https://appgoblin.info/apps/521671873); [AppGoblin Monster Legends](https://appgoblin.info/apps/653508448)
- Cats & Soup in Q2 2025 (US, unified): weekly revenue about $23K–70K and about 525K active users at quarter end. — [Sensor Tower](https://sensortower.com/blog/2025-q2-unified-top-5-cat%20games-revenue-us-608810b928293296047965a0)

**Ad and store-page style evidence**
- Kongregate's art-testing guide (2017) says "the more casual the game looks the cheaper it is to acquire users for", with wide variance inside each category. It recommends testing theme, art style (3D, pixel, low poly, cartoon) and palette one variable at a time. CTR tests need large samples: 1.82% vs 2.18% needs about 96,200 impressions. No numeric style results are published. — [Game Developer / Kongregate](https://gamedeveloper.com/business/mobile-art-testing-guide)
- SplitMetrics case: MyTona's Seekers Notes icon with a smiling pumpkin head converted 9.3% better than a human character in a mask. MyTona credited replacing the human face with an "animated" inanimate object. — [SplitMetrics: MyTona](https://splitmetrics.com/customers/mytona-app-icons-halloween-update/)
- SplitMetrics' 2023 Mobile Growth Report says icon changes can shift conversion 10–25% either way (per search summary; the report itself was not fetched). — [SplitMetrics](https://splitmetrics.com/customers/mytona-app-icons-halloween-update/)
- SocialPeta/Reforged Labs (data January 2024–October 2025, 1.6B creatives):
  - Advertisers ran an average of 123 active creatives per month in 2025 (+19.4% YoY).
  - More than 90% of advertisers used AI to create creatives in 2025.
  - "Mini-games remain the most clickable creative format".
  - The report has no art-style breakdown. — [GameDevReports: SocialPeta & Reforged Labs](https://gamedevreports.substack.com/p/socialpeta-and-reforged-labs-mobile)

### Inferences
- **Revenue benchmark.** A realistic ceiling for a non-IP merge-TD game is the Rush Royale and Random Dice tier ($240M–$500M lifetime). Neither depends on high-fidelity art. Random Dice's simple dice units show that readability and the mechanic can carry a game, while Rush Royale's character-driven stylized units support a collection and gacha appetite. 28 fusion pets plus legendaries is a collection-driven design, which favours rich, characterful pet art over minimal flat icons.
- **Production volume.** Ad production in 2025 means 120+ creatives a month and more than 90% AI usage. A style that is cheap to re-pose and re-render (3D models rendered to 2D, or a vector/sticker system with modular parts) scales better for user acquisition than labour-intensive hand-painted or per-frame pixel art.
- **Icon tests.** The MyTona result hints that non-human "creature or object" faces can beat human faces on icons. Expressive pet faces on the icon are worth testing against hero-character icons. This is a single case, so treat it as weak evidence.

### Gaps
- I found no public, methodologically sound study comparing CTR, IPM or CPI across chibi 2D, 3D toy, flat vector and pixel art for casual or midcore games. Vendor blogs (Melior Games, iLogos, Pixune) assert style effects without data.
- No reliable revenue figures for Bloons TD 6, Kingdom Rush, Merge Dragons, Temtem, Coromon, Cassette Beasts, Neko Atsume, Tamagotchi apps, Pokémon Café Mix or Pokémon Unite were collected within budget.
- Slime Legion revenue and download figures were not found.

## Q3. Mobile art-style trends 2023–2026: where is the market saturated and where can a game stand out?

### Takeaway
"Stylized" (non-realistic) art overwhelmingly dominates new mobile hits:
- In the top 100 new games of 2024, 75 were stylized vs 9 realistic.
- 3D and 2D are roughly at parity.
- Cartoon dominates casual in the US (77% of top-grossing casual in GameRefinery's 2021 data).
- Full-3D ad creatives became a "proven" casual direction from 2024–2025.
- In the wider culture, kawaii and designer-toy (blind-box) aesthetics are booming.

So generic 2D cartoon or chibi is the saturated default. A soft 3D toy or vinyl look sits on a rising trend without yet being the TD/merge default, and pixel art is a niche or indie signal.

### Cited Findings
- Top 100 new mobile games of 2024 (to Dec 8, 2024, selected by downloads and rank jumps): Stylized 75, 3D 49, 2D 41, Realism 9, Abstract 5. Within the top 4 genres: stylized 57, 3D 37, 2D 34. The categorization method is not disclosed. — [Segwise](https://segwise.ai/blog/analyzing-trends-in-the-top-100-new-mobile-games-in-2024-cm4i3q2zd000f10m89woph23e)
- GameRefinery, top-200 grossing (2021 vs 2019):
  - US: about 50% realistic, about 50% cartoon. Japan: manga 54%, with realistic and cartoon about 23% each; cartoon gained on manga.
  - Casual: cartoon dominates the US at 77%, while manga and cartoon dominate Asia.
  - "Cartoon has replaced Realistic as the most popular art style in the Fantasy art genre."
  - The US Fantasy art genre dropped about a third from 2019 to 2021. — [GameRefinery](https://www.gamerefinery.com/popularity-mobile-game-art-styles-genres/)
- GeekLab (Aug 11, 2022, US top-200 grossing iPhone): "cartoon and realism are the most popular art styles". Cartoon is "the only one present through all the genres". Pixel, manga/chibi and flat are smaller segments, and manga is most popular in Japan. — [GeekLab](https://geeklab.app/posts/art-styles-an-analysis-of-the-top-200-grossing-iphone-games-part-1/)
- Full 3D ads are a "proven creative direction for casual games", a trend that started in 2024 and became "solid by 2025". — [Appodeal: the ads everyone will be watching in 2026](https://appodeal.com/blog/the-ads-everyone-will-be-watching-in-2026/)
- Cute-animal themes can drive breakout launches (Capybara Go! capitalising on capybara virality) but decay without depth (downhill by mid-2025). — [GameRefinery June 2025](https://www.gamerefinery.com/mobile-game-market-review-june-2025/)
- Designer-toy and blind-box culture:
  - One source estimates the designer-toy market at about $7.8B in 2025, projected to about $15.5B by 2032, and calls kawaii the "#1 subculture for women globally". It cites Pop Mart (Space Molly, Nyota) aesthetics: soft palettes, matte, resin and flocked finishes. This is a low-authority student/press piece and the market figure is unverified. — [The Blind Box Craze (May 1, 2026)](https://bsmknighterrant.org/2026/05/01/the-blind-box-craze/)
- Utopic, founded by a former TikTok executive, is building a live-service mobile game alongside collectible toys to "popularize a new generation of cute characters". Source is a job listing. — [UW careers: Utopic Toy Designer](https://careers.uw.edu/jobs/utopic-toy-designer-contract-internship/)
- Pixel art's current creature-collector successes (Coromon, Cassette Beasts) are premium PC/console/indie titles marketed on nostalgia ("modern version of stuff you might remember"). — [Digital Trends](https://www.digitaltrends.com/?p=3320192); [Twinfinite](https://twinfinite.net/reviews/coromon-review/)

### Inferences
- **Saturated:**
  - 2D chibi/cartoon with thick outlines in casual merge, idle and TD games. This is the default look of Slime Legion-type and Legend of Slime-type Chinese casual games, which 2048 Siege's enemies already borrow.
  - Generic "fantasy cartoon" in midcore.
  - In creature collecting specifically, GBA-style pixel monsters as an indie trope.
- **Rising and differentiating:**
  - Soft 3D "vinyl/clay toy" renders with matte materials, rim light and pastel palettes. This matches the 2024–25 full-3D ad trend and the designer-toy zeitgeist.
  - It also fits the game's existing cream clay UI, so UI and pets would cohere.
  - It can be produced as pre-rendered sprites for PixiJS (Merge Mansion precedent).
  - Risk: modern 3D Pokémon (Scarlet/Violet, Unite) also renders smooth, toy-like creatures. Designs must avoid Pokémon archetypes for this look to stay distinct.
- **Flat vector:** cheap and very readable at small tile sizes. It is under-represented in top-grossing (GeekLab "smaller segment"), so it is distinctive but may lower perceived collectible value for a game whose monetization rests on 28 fusions and legendaries. Neko Atsume-style minimalism suits idle or cozy games, not combat TD.
- **Region:** if Japan or Korea are targets, manga/chibi-leaning designs fit (Japan manga 54%). If the US is the focus, cartoon is the safe default and 3D-toy is the "fresh" variant.
- **Other strong candidates:**
  - "Object/food-creature" mascots like Cookie Run, a $0.5B game and a $1B+ franchise built on anthropomorphised cookies.
  - Elemental "spirit" or golem creatures built from materials, such as a lava teapot or a crystal moth.
  - Both move the silhouettes away from animal-based Pokémon archetypes and fit "toy" rendering well.

### Gaps
- No 2025–2026 vendor dataset (GameRefinery, Sensor Tower, AppMagic) breaking down art style shares was found. The most recent quantified style data is Segwise 2024 and GameRefinery 2021.
- No data on how designer-toy aesthetics perform specifically in mobile game ads.
- The claim that Cookie Run is "going 3D" was not verified.

## Q4. IP risk: what makes creature designs read as too close to Pokémon? Cases and practical guidance

### Takeaway
Nintendo and The Pokémon Company have pursued two different routes:
- **Copyright on designs**, against games that "extensively used design elements" of Pokémon. A Chinese court awarded about $15M in 2024, followed by a settlement and public apology in 2025.
- **Patents on mechanics** against Palworld, not copyright. The patent route is weakening: one US patent was revoked in April 2026 after a director-ordered reexamination, the Japanese damages claim was cut to ¥5M in August 2026, and the case now targets only old Palworld versions.

Pokémon-likeness was publicly judged by silhouettes, proportions and faces matching specific Pokémon (Galarian Meowth, Lucario). Nintendo also files DMCA takedowns against literal Pokémon assets (the Palworld Pokémon mods).

### Cited Findings
**Copyright: Pokémon Company v. Chinese copycats**
- The suit was filed in December 2021 against six companies behind "Pocket Monster Reissue" (2015), a turn-based mobile RPG accused of plagiarising Pokémon character and creature designs. The game reportedly made about $42M in a single year. The Pokémon Company sought about $72M plus public apologies.
- In September 2024 the Shenzhen Intermediate People's Court awarded 107M yuan (about $15M). Three defendants appealed. — [Automaton](https://automaton-media.com/en/news/the-pokemon-company-wins-15-million-copyright-infringement-lawsuit-against-china-based-game-developers/); [Nintendo Life](https://nintendolife.com/news/2024/09/pokemon-wins-usd15-million-copyright-lawsuit-against-chinese-mobile-game-developers)
- In 2025, defendants Guangzhou Maichi Network Technology and Khorgos Fangchi Network Technology settled through mediation. They paid a substantial sum and published apologies admitting the app "extensively used design elements of the well-known Pokémon Video Game Series". The app was removed from the market. Reports call the game "Pocket Monster: Remake", apparently the same title as "Reissue" under a different translation. — [WN Hub legal](https://wnhub.io/news/legal/item-47199)
- Nintendo Life reported in February 2025 that The Pokémon Company "catches a win in lawsuit against another rip-off app". The page returned 403, so details are unverified. — [Nintendo Life (Feb 2025)](https://www.nintendolife.com/news/2025/02/the-pokemon-company-catches-a-win-in-lawsuit-against-another-rip-off-app)

**Palworld: design accusations (no copyright suit filed)**
- In January 2024 The Pokémon Company said it was investigating IP infringement after design comparisons spread online. — [Hitmarker](https://hitmarker.net/news/the-pokemon-company-is-currently-investigating-palworld-675763)
- Pocketpair CEO Takuro Mizobe said the game "passed legal reviews" and that "we have absolutely no intention of infringing upon the intellectual property of other companies". — [Automaton, Jan 22, 2024](https://automaton-media.com/en/news/20240122-25873/)
- Legal commentary:
  - "Copyright does not protect an idea or concept, it protects the established expressions of them."
  - Infringement requires substantial similarity.
  - Japan has no US-style fair-use doctrine.
  - Riot's suit against Moonton over Mobile Legends' resemblance to League of Legends was dismissed, which suggests a high similarity bar. — [GamerBraves, Feb 8, 2024](https://gamerbraves.substack.com/p/gamerbraves-newsletter-vol-117-palworld)

**Palworld: patent suit (the actual litigation)**
- Filed Sept 19, 2024 at Tokyo District Court on JP7545191, JP7493117 and JP7528390. These cover capture by throwing a ball-like item, a capture mechanic, and switching mounts/gliding. Damages originally sought: ¥10M.
- On April 20, 2025, Pocketpair submitted 20+ prior-art games.
- Pocketpair removed Pal Sphere summoning animations (Patch 0.3.11) and planned to remove gliding (Patch 0.5.5).
- On June 12, 2026, Nintendo narrowed the suit to older game versions.
- On Aug 12, 2026, damages were reduced to ¥5M (about €27K).
- A hearing was set for Oct 1, 2026, with a court view expected Nov 9, 2026. — [Mein-MMO, Aug 12, 2026](https://mein-mmo.de/en/almost-two-years-ago-nintendo-sued-the-creators-of-palworld-what-the-hell-was-going-on,1582112/)
- No injunction has been issued and Palworld 1.0 (July 9/10, 2026) remains on sale. Analyst Florian Mueller put potential damages at about $62K combined. — [Patent Arcade](https://www.patentarcade.com/?p=7128)
- In November 2024 Pocketpair replaced orb-summoning with Pals spawning next to the player and admitted the changes were due to the dispute. — [Galaxus](https://www.galaxus.fr/en/page/nintendo-klage-hat-erfolg-palworld-muss-spielmechanik-anpassen-37883)

**US patents**
- In November 2025, USPTO Director John Squires ordered reexamination of Nintendo's US patent 12,403,397 ("summoning a subcharacter" that fights in one of two battle modes). Cited prior art includes a 2002 Konami patent and Nintendo's own 2020 patent. Reports call it the first director-ordered reexamination since 2012. — [VGC](https://www.videogameschronicle.com/news/us-patent-office-director-orders-re-examination-of-nintendos-patent-on-summoning-characters-to-make-them-battle/); [Shacknews](https://www.shacknews.com/article/146667/nintendo-summon-subcharacter-patent-examination-john-squires); [Steptoe IP blog](https://www.steptoe.com/en/news-publications/step-into-ip-blog/prior-art-going-beyond-the-pokedex-trends-to-watch-as-the-uspto-reexamines-nintendos-397-patent.html)
- The USPTO later rejected all claims and revoked the patent (April 2026 per Mein-MMO). — [Gfinity](https://www.gfinityesports.com/article/uspto-revokes-nintendo-summon-and-battle-patent-in-palworld-conflict); [Mein-MMO](https://mein-mmo.de/en/almost-two-years-ago-nintendo-sued-the-creators-of-palworld-what-the-hell-was-going-on,1582112/)
- Conflict: the search summary of VGC dated the patent grant to "September 2024", while Mein-MMO puts '397 in September 2025.

**DMCA takedowns of literal Pokémon assets**
- A YouTube teaser for a mod replacing all Palworld Pals with Pokémon (and the player with Ash) was removed by DMCA within a day, apparently by Nintendo. The Nexus mod site proactively removed Pokémon-mod pages. — [Windows Central](https://windowscentral.com/gaming/palworld-pokemon-mod-creator-delays-release-after-dmca-takedown); [Insider Gaming](https://insider-gaming.com/palworld-pokemon-dmca-takedowns)

**Differentiation precedent**
- Cassette Beasts avoided ball capture and send-out battles. It uses cassette recording and player transformation and headlines fusion. — [Digital Trends](https://www.digitaltrends.com/?p=3320192)

### Inferences
**Risk factors for 2048 Siege**
- **The element list maps almost one-to-one onto Pokémon types.** Fire/Ice/Lightning/Poison/Earth/Wind/Metal/Nature correspond to Pokémon's Fire/Ice/Electric/Poison/Ground/Flying/Steel/Grass. Type systems are game ideas and not copyrightable (idea/expression principle). Combined with cute creature designs, multi-stage evolution and "legendary" forms, the overall impression reads as Pokémon-like to players and press, even if it is legally safe.
  - Mitigation: frame the elements through a distinct cosmology. "Metal" and "Nature/Wood" already evoke the Chinese Wu Xing. Alternatives are an alchemy or weather theme, or material-based creatures. Avoid Pokémon-style type icons and colour coding.
- **Highest-risk design choices**, inferred from the Galarian Meowth, Lucario and "nearly identical proportions" comparisons:
  - (a) Iconic Pokémon archetypes: yellow electric rodent with red cheeks, orange fire lizard with tail flame, blue water turtle, pink round singer, bipedal jackal-aura fighter.
  - (b) Matching head-to-body proportions and facial layout of a specific Pokémon.
  - (c) Red-and-white capture spheres or Poké Ball-like UI motifs.
  - (d) Using Pokémon names, puns or silhouettes.
  - (e) Any reuse of ripped models or assets, which brings DMCA exposure and is the most clear-cut infringement.
- **Mechanics risk is low.** Pets spawn from merged tiles rather than being captured by thrown items or summoned from spheres. The patented mechanics were throw-to-capture, capture indicator, mount and glide, and summon-subcharacter battle. The US summon patent was revoked and the Japanese case has been narrowed.
- **Style-specific IP notes:**
  - Pixel art raises the "GBA Pokémon" association: reviews explicitly benchmark Coromon against Pokémon Ruby.
  - Soft 3D toy rendering resembles modern 3D Pokémon only if the shapes resemble Pokémon. Palworld's controversy was about 3D proportions.
  - Chibi sticker with thick outlines is the norm for many Chinese casual games. The risk there is resembling Slime Legion or other casual games' specific units, not Pokémon. Avoid copying Slime Legion hero designs directly, since 2048 Siege's enemies are explicitly "in the style of" it.
  - Flat vector has the lowest likeness risk because its abstraction reduces specific-expression overlap.
- **Practical guidance** (synthesised; not legal advice):
  - Run a "silhouette test": fill each pet black and check whether testers name a Pokémon.
  - Build creatures from non-animal or hybrid sources (objects, materials, folklore outside Pokémon's common pool, element-machines).
  - Give the line a signature body plan, such as a consistent base shape each element mutates.
  - Avoid the 3-stage starter trio pattern in marketing.
  - Keep a design log of references for each pet to document independent creation.
  - Have a final legal or brand review before soft launch. Even Palworld's "passed legal reviews" did not stop a public investigation and a patent suit.

### Gaps
- No primary court documents (Shenzhen judgment, Tokyo District Court filings) were retrieved. Details rely on press summaries.
- The Feb 2025 Nintendo Life "another rip-off app" case is unverified (403).
- I found no authoritative law-firm or academic guidance specifically on avoiding Pokémon-likeness in creature design. The practical guidance above is inferred from the cases.
- The outcome of the Oct 1, 2026 Palworld hearing and the Nov 9, 2026 court opinion was not found; both may have happened or be pending at the research date.
