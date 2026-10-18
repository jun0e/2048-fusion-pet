# Vietnamese (T14)

The game's words live in one plain-text table per language: `src/i18n/en.js` and `src/i18n/vi.js`. They are read through `tr(key, vars)` in `src/i18n/index.js`. The name is `tr`, not `t`, because `t` is the code's usual name for a tile, a time and an interpolation.

- **Another language** is one more table. Its `@` keys tell the code about the language, and are not words to translate:
  - `@name`: its name in itself, for the Language row;
  - `@locale`: how it writes numbers, and its plural forms;
  - `@ordinal`: how it writes "4th", as plural forms picked by `Intl.PluralRules`' ordinal rules (`{ other: '{n}' }` in Vietnamese).
- **No HTML in a table:** the Nibble copy of the game reads the same tables, so each screen builds its markup around the words.
- **Whole sentences:** a key is never the tail of another key's sentence. Where a screen puts markup inside a sentence (the pet's name in bold, Wave now's number), the table has a placeholder there, and the screen fills it.
- **Placeholders and plurals:** `{name}` is filled in by `tr()`. A plural is `{ one, other }`, or whichever forms `Intl.PluralRules` names for the language. It is picked by `vars.count`, else `vars.n`.
- **A missing key** falls back to English. `test/i18n.test.js` holds Vietnamese to every English key, with the same placeholders.

- **Which language a page starts in** (`startLang`):
  1. the one in the page's address (`#lang-vi`), set while storage was blocked;
  2. else the player's saved choice;
  3. else the first language in the phone's list that the game has: with Vietnamese above English, Vietnamese;
  4. else English.
- **Outside a browser** (the tests, the art pipeline's prompts) the game is always English. Node's `navigator` follows the shell's locale, so it is not read there.
- **Changing it:** the Language row in Settings shows the language in its own words (English, Tiếng Việt). A tap moves to the next one and keeps the choice (`siege:lang`).
  - The loading screen shows at once, in the new language. It answers the tap, and a second tap cannot switch straight back.
  - Where storage is blocked, the choice goes in the page's address instead (`#lang-vi`), with no new history entry. The language survives the reload, but the run does not: nothing could be saved. Once storage works again, the choice is saved and the address let go.
- **Why a reload:** the page reloads in the new language. The language is settled as `src/i18n/index.js` loads, so every screen and table is built in it, with no screen left half-switched.
  - The run restores itself (`src/ux/resume.js`), even during the first run's opening. The opening picks up at the step it was on, and the player is back in Settings.
  - That one reload is flagged in `sessionStorage` (`siege:relang`); any other reload during the opening still starts it again.
- **The loading screen** speaks the language before the game has loaded. `index.html` holds its three lines (`BOOT_WORDS`) and picks the language the same way. `test/i18n.test.js` runs that script on every case above, against `startLang` and the tables. It runs after Try again and New run are wired, so an older browser it trips on keeps a working failure screen.
- **Pet names stay as they are.** Fusion pets (Mistmaw, Frostjelly …) keep their names in both languages. A legend's skill puts its apex where the language does: "Sun Frostnova" in English, "Nova Băng Mặt Trời" in Vietnamese (`legend.name`).

## Glossary

One word for each thing, everywhere.

| English | Tiếng Việt | Notes |
| --- | --- | --- |
| 2048 Siege | 2048 Siege | The game's name stays. |
| run | ván | "Chơi lại ván", "Bắt đầu ván". |
| Wave now | Vào đợt | The button: "Vào đợt ▶ 12"; on a boss, "Đánh trùm ▶". |
| best | kỷ lục | "Kỷ lục 161", "Đợt kỷ lục mới!". |
| turret | tháp bắn | A block of 16 or more. |
| Sell, Break | Bán, Đập | "Tap again" is "Chạm lại", shorter than the English, which the narrow card is sized for. |
| Details | Chi tiết | |
| wave | đợt | "Đợt 5", "Qua đợt 4!" |
| block | khối | A numbered block on the board. |
| board | bàn | |
| merge | gộp | |
| swipe | vuốt | "Vuốt 5" on the coin bar: the price of a swipe. Counted as "lần vuốt". |
| coins | xu | |
| foe | quái | Short, and what players say. |
| boss | trùm | |
| lane | làn | |
| gate | cổng | |
| keep | thành | |
| pet | thú cưng | |
| fusion | dung hợp | The 256 step: two elements in one pet. |
| legend | huyền thoại | The 4096 step. |
| element | hệ | "hệ Lửa", as in creature games. |
| die, dice | xúc xắc | A die adds an element to the deck. |
| deck | bộ xúc xắc | |
| keepsake | bảo vật | |
| level | cấp | The spawn level. The disc's "Lv" is "Cấp". |
| XP | KN | kinh nghiệm |
| skill | kỹ năng | |
| ready (a skill) | đầy | The namecard pill (42 px at 14 px): "ĐẦY", a full charge; its label, "Đã sạc đầy". "SẴN" alone reads as a clipped "SẴN SÀNG". |
| stacks | tầng | Burn and poison: "cộng dồn tối đa 5 tầng". Never "chồng", which also means husband. |
| growth marks | vạch tiến hóa | The four marks a merge lights. "Vạch lớn" reads as "big marks". |
| seconds | giây | The cards say "2,5 giây". The wave meter's countdown says "12s nữa", as a stopwatch would. |
| top block | khối đỉnh | The chip says "Đỉnh". |
| Overrun! | Thất thủ! | The game-over title. |

### The elements

| English | Tiếng Việt |
| --- | --- |
| Fire | Lửa |
| Ice | Băng |
| Lightning | Sét |
| Poison | Độc |
| Earth | Đất |
| Wind | Gió |
| Metal | Kim |
| Nature | Mộc |

Kim and Mộc are the five-element words (Kim, Mộc, Thủy, Hỏa, Thổ). Both are one syllable, so all eight elements fit a chip.

## Style

- **Address the player as "bạn".** Keep it friendly and short, as the English is. Use no honorifics.
- **Buttons say what they do:** Bán, Đập, Chi tiết, Chơi lại, Chia sẻ, Tiếp tục, Xong.
- **Numbers:** Vietnamese writes 1.234 for one thousand two hundred and thirty-four, and 2,5 for two and a half (`num()` in `src/i18n/index.js`). The numbers drawn on the field follow it too: a boss's health, the damage numbers ("1,2k") and the freeze badge.
- **Length:** Vietnamese is about a quarter longer than English. Every screen was checked at 360 × 640 (the die pick, both tile cards, pause, settings, How to play, the level and keepsake cards, game over).
- **Tight spaces:** `test/i18n.test.js` holds the words in tight spaces to their room:
  - each die's one line, 30 characters;
  - the READY pill, 4;
  - Sell / Break and its labels, 10;
  - the top-block chip's caption, 4;
  - one word per element.
- **Fonts:** Baloo 2 and Nunito both have the Vietnamese letters, and Google Fonts serves that subset by itself.
  - The game waits for that subset before its first frame. Its sample is every letter the language's words use (`letters()`), because the canvas draws its words once (the deck slot's "ở"). Vietnamese letters span two of Google's subsets.
  - A font that arrives later still (past the 1.5 s wait) redraws the deck text.
  - Offline, the single-file game falls back to the phone's system font, which has them too.
