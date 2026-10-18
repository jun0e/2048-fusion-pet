// The level card (docs/v2/SPEC-v2.1.md sections 4 and 6; src/ui/run-badges.js): only the XP still needed
// for the next level ("12 XP to level 8", with its bar) and what that level brings on the level road, each
// reward as an icon and words. No spawn odds, nothing to buy; the words never name a minute or a level
// the road does not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REWARD_ICON, levelCard, levelCardHtml, rewardWords, rewardsLine } from '../src/ui/run-badges.js';
import { LEVELS, LEVEL_ROAD, rewardsAt } from '../src/sim/levels.js';
import { iconToken } from '../src/ui/hud.js';
import { LANGS, setLang } from '../src/i18n/index.js';

/** The text a player reads: an icon as its [word] (none for a decorative one), tags dropped. */
const text = (html) =>
  html
    .replace(/<svg[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g, ' [$1] ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const road = LEVEL_ROAD;
const levelOf = (kind) => road.find((l) => l.rewards.some((r) => r.kind === kind)).level;

test('the card: the XP still needed for the next level, and the bar', () => {
  const c = levelCard({ level: 7, xp: 10, need: 22, road });
  assert.equal(c.title, 'Level 7');
  assert.equal(c.xpText, '12 XP to level 8');
  assert.equal(c.share, 10 / 22);
  assert.equal(c.top, false);
  assert.equal(c.nextLevel, 8);
  assert.equal(levelCard({ level: 3, xp: 0, need: 1234, road }).xpText, '1,234 XP to level 4', 'numbers as the language writes them');
  assert.equal(levelCard({ level: 3, xp: 40, need: 16, road }).share, 1, 'a full bar never overflows');
});

test('…and what the next level brings, each reward as its icon and words, from the level road', () => {
  for (const entry of road.slice(1)) {
    const c = levelCard({ level: entry.level - 1, xp: 0, need: 10, road });
    assert.deepEqual(
      c.rewards.map((r) => r.kind),
      entry.rewards.map((r) => r.kind),
      `level ${entry.level}`,
    );
    for (const r of c.rewards) {
      assert.equal(r.icon, REWARD_ICON[r.kind]);
      assert.ok(r.text && !r.text.includes('reward.'), `${r.kind}: words`);
    }
  }
  const grow = levelCard({ level: levelOf('grow') - 1, xp: 0, need: 10, road });
  assert.deepEqual(grow.rewards.map((r) => r.text), ['The board grows to 5×5']);
  const element = levelCard({ level: levelOf('element') - 1, xp: 0, need: 10, road });
  assert.deepEqual(element.rewards.map((r) => r.text), ['Pick a new element']);
  const charge = levelCard({ level: levelOf('charge') - 1, xp: 0, need: 10, road });
  assert.deepEqual(charge.rewards.map((r) => r.text), ['Summons charge 2 s faster']);
  assert.deepEqual(rewardWords({ kind: 'odds', adds: [5], drops: [1] }), 'Better new blocks');
  assert.deepEqual(rewardWords({ kind: 'top' }), 'Top level');
  assert.equal(rewardWords({ kind: 'mystery' }), '', 'a reward the screens do not know says nothing');
});

test('the card’s markup: the disc, the bar, the rewards with their icons, and the values new blocks gain or lose', () => {
  const odds = road.find((l) => l.rewards.some((r) => r.kind === 'odds' && r.adds.length && r.drops.length));
  const html = levelCardHtml({ level: odds.level - 1, xp: 6, need: 24, road });
  const t = text(html);
  assert.match(t, new RegExp(`^× Lv ${odds.level - 1} Level ${odds.level - 1} 18 XP to level ${odds.level} Level ${odds.level} brings Better new blocks Can spawn: \\d+ No more: \\d+$`));
  assert.match(html, /class="lv-xpbar" role="progressbar"[^>]*aria-valuenow="25"/);
  assert.match(html, /<svg class="ico ico-odds"/, 'the reward’s icon');
  assert.match(html, /class="lv-value" style="--c:#[0-9a-f]{6}">32</, 'a value that starts spawning, on its tier colour');
  assert.match(html, /class="lv-value" style="--c:#[0-9a-f]{6}">2</, 'and one that stops');
});

test('no spawn odds and nothing to buy: no percentages, no price, no Buy XP, at any level', () => {
  for (let level = 1; level <= LEVELS.max; level++) {
    const html = levelCardHtml({ level, xp: 3, need: level >= LEVELS.max ? Infinity : 30, road });
    assert.ok(!/%|odds|lv-buy|inspect-sell|coin/i.test(text(html)), `level ${level}: ${text(html)}`);
    assert.ok(!/lv-buy|inspect-coin|data-act/.test(html), `level ${level}: no button but ×`);
  }
  for (const [lang, table] of Object.entries(LANGS)) {
    for (const k of Object.keys(table)) assert.ok(!/^lv\.(buy|topOdds|need|raise|sources|newBlocks|atLv|noteCap|noteKs|no2)/.test(k), `${lang}: ${k} is gone`);
    assert.ok(!('pop.xp' in table) && !('ban.level.sub' in table), `${lang}: no Buy XP popup, no odds in the level-up news`);
  }
});

test('the top level: a full bar and no next reward', () => {
  const top = levelCard({ level: LEVELS.max, xp: 0, need: Infinity, road });
  assert.equal(top.top, true);
  assert.equal(top.xpText, 'Top level');
  assert.equal(top.share, 1);
  assert.deepEqual(top.rewards, []);
  assert.match(text(levelCardHtml({ level: LEVELS.max, xp: 0, need: Infinity, road })), /Top level You have every reward on the level road\.$/);
  // the level before it brings the top
  assert.ok(levelCard({ level: LEVELS.max - 1, xp: 0, need: 90, road }).rewards.some((r) => r.kind === 'top'));
});

test('a run without a road (the showcase) shows the XP alone', () => {
  const c = levelCard({ level: 2, xp: 1, need: 12 });
  assert.equal(c.xpText, '11 XP to level 3');
  assert.deepEqual(c.rewards, []);
  assert.ok(!levelCardHtml({ level: 2, xp: 1, need: 12, road: null }).includes('lv-next'));
});

test('the level-up news says what the level brings, with its icons; level 1 brings nothing', () => {
  const at = levelOf('grow');
  assert.equal(rewardsLine(rewardsAt(at), iconToken), `${iconToken('grow')}The board grows to 5×5`);
  assert.equal(rewardsLine(rewardsAt(LEVELS.max), iconToken), `${iconToken('odds')}Better new blocks · ${iconToken('top')}Top level`);
  assert.equal(rewardsLine(rewardsAt(1), iconToken), '');
  assert.equal(rewardsLine(undefined, iconToken), '');
});

test('the card in Vietnamese', () => {
  setLang('vi');
  try {
    const c = levelCard({ level: 10, xp: 5, need: 25, road });
    assert.equal(c.title, 'Cấp 10');
    assert.equal(c.xpText, 'Còn 20 KN lên cấp 11');
    assert.deepEqual(c.rewards.map((r) => r.text), ['Bàn mở rộng thành 5×5']);
    assert.match(text(levelCardHtml({ level: 10, xp: 5, need: 25, road })), /Cấp 11 mang lại Bàn mở rộng thành 5×5$/);
  } finally {
    setLang('en');
  }
});
