// The v2 cards (docs/v2/SPEC.md section 7; src/ui/cards.js), rendered as HTML strings in Node from mock
// choices in the SPEC's shapes: a new element (2 offers), a fusion's main element, the fusion pet to keep,
// and the skill a new fusion gained. A stand-in picture finder names every picture by its sprite id, so
// the tests see which pet each card shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { choiceHtml, choiceKey, choiceLabel, dieChoiceHtml, esc, fusionChoiceHtml, keepChoiceHtml, lockFootHtml, resultCardHtml, skillTipHtml } from '../src/ui/cards.js';
import { ELEMENTS, FUSIONS, fusionKey } from '../src/sim/classes.js';
import { DEMO_DECK, mockChoice } from '../src/ui/v2demo.js';
import { setLang, tr } from '../src/i18n/index.js';

const img = (id) => `/gen/${id}.png`;
const none = () => null;
const count = (html, re) => (html.match(re) ?? []).length;
/** The text a player reads: the markup's words, tags dropped and entities read back. */
const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const offer = (e) => ({ element: e, name: ELEMENTS[e].name, attack: ELEMENTS[e].attack, colors: [ELEMENTS[e].color], desc: ELEMENTS[e].desc, line: ELEMENTS[e].line });
const fusionOffer = (a, b) => {
  const key = fusionKey(a, b);
  return { element: a, fusion: b, key, name: FUSIONS[key].name, color: FUSIONS[key].color };
};

/** No word left unfilled, and no key shown in place of its words. */
function wordsFilled(html, what) {
  const t = text(html);
  assert.ok(!/[{}]/.test(t), `${what}: a placeholder left in "${t.match(/.{0,30}[{}].{0,30}/)?.[0]}"`);
  assert.ok(!/\b(skill|buff|stat|pure|die|fuse|keep|result|card)\.[a-z]/.test(t), `${what}: a key shown as words`);
}

test('a new element: two upgrade cards, each the baby pet, its attack, what it gives a fusion, its pure aura, and its fusions with the deck', () => {
  const choice = { kind: 'die', level: 3, offers: [offer('wind'), offer('poison')] };
  const html = dieChoiceHtml(choice, { img, deck: ['fire', 'ice'] });
  wordsFilled(html, 'die');
  assert.equal(count(html, /data-act="pick"/g), 2, 'one card to pick per offer');
  assert.match(html, /data-i="0"[\s\S]*data-i="1"/);
  assert.match(html, /data-n="2"/);
  const t = text(html);
  assert.match(t, /^Lv 3 New element! Pick one: its eggs start to spawn\./, 'the head: the level and what a pick does');
  for (const e of ['wind', 'poison']) {
    assert.ok(html.includes(`/gen/pet.${e}.16.png`), `${e}: its baby pet`);
    assert.ok(html.includes(`/gen/badge.${e}.png`), `${e}: its badge`);
    assert.ok(t.includes(`${ELEMENTS[e].name} ${ELEMENTS[e].attack} ${ELEMENTS[e].line}`), `${e}: its name, attack and what it does`);
    assert.ok(t.includes(`Pick ${ELEMENTS[e].name}`));
  }
  assert.ok(t.includes('Fed to a fusion: +15% range'), 'wind fed to a fusion');
  assert.ok(t.includes('Pure Wind at 4096 Every other pet: +20% range.'), 'its pure aura');
  assert.ok(t.includes('Fed to a fusion: +1 poison stack per hit'));
  // the fusions with the deck: each fusion pet's portrait (the partner's badge on it) and its skill
  for (const [a, b, skill] of [
    ['wind', 'fire', 'Fire Twister'],
    ['wind', 'ice', 'Whiteout'],
    ['poison', 'fire', 'Brimstone Blast'],
    ['poison', 'ice', 'Venom Tendrils'],
  ]) {
    assert.ok(html.includes(`/gen/portrait.${fusionKey(a, b)}.png`), `${a} + ${b}: its portrait`);
    assert.ok(t.includes(skill), `${a} + ${b}: ${skill}`);
  }
  assert.equal(count(html, /class="fuse-chip"/g), 4);
});

test('a new element with an empty deck shows no fusions; an offer without words takes the element’s', () => {
  const html = dieChoiceHtml({ kind: 'die', level: 2, offers: [{ element: 'metal' }] }, { img, deck: [] });
  wordsFilled(html, 'die, bare');
  assert.equal(count(html, /fuse-chip/g), 0);
  assert.ok(!html.includes(tr('die.fuses')), 'no fusions label');
  assert.ok(text(html).includes(`${ELEMENTS.metal.name} ${ELEMENTS.metal.attack}`));
  assert.match(html, /data-n="1"/);
  // a choice in v1's shape (a tier, no level) still shows its value
  assert.match(dieChoiceHtml({ kind: 'die', tier: 6, offers: [offer('fire')] }, { img }), /class="chip"[^>]*>64</);
});

test('a fusion: the two pets being merged → the fusion pet, its skill in full, then one button per main element', () => {
  const choice = { kind: 'fusion', tileId: 7, tier: 5, parts: [{ element: 'fire', tier: 4 }, { element: 'ice', tier: 4 }], offers: [fusionOffer('fire', 'ice'), fusionOffer('ice', 'fire')] };
  const html = fusionChoiceHtml(choice, { img });
  wordsFilled(html, 'fusion');
  const t = text(html);
  assert.ok(html.includes('/gen/pet.fire.16.png') && html.includes('/gen/pet.ice.16.png'), 'the two pets, as they are on the board');
  assert.ok(html.includes('/gen/portrait.fire+ice.png'), 'the fusion pet');
  assert.match(t, /Fire 16 \+ Ice 16 → Novakit Frostnova/, 'the merge, read in order');
  assert.match(html, /aria-label="Fire and Ice merge into Novakit"/);
  assert.match(t, /Frostfire Waltz Cooldown 15 s · Out for 8 s · Unlocks at 1024 ACTIVE Summons Novakit to the front\. Every 1 s, sends a frost wave/);
  assert.ok(t.includes('PASSIVE Attacks like the main element you pick, 25% harder, with the effects of the other one.'), 'PASSIVE for whichever main element: the buttons say each attack');
  assert.equal(count(html, /data-act="pick"/g), 2);
  assert.match(t, /Ember Breath Fire main: Burns every foe in a cone\. 1 Echo Harpoon Ice main: Slows and freezes big foes\. 2/);
});

test('a fusion of two eggs shows the eggs; a choice without parts shows the elements a tier below', () => {
  const eggs = fusionChoiceHtml({ kind: 'fusion', tileId: 3, tier: 3, parts: [{ element: 'poison', tier: 2 }, { element: 'earth', tier: 2 }], offers: [fusionOffer('poison', 'earth'), fusionOffer('earth', 'poison')] }, { img });
  assert.equal(count(eggs, /\/gen\/egg\.4\.png/g), 2, 'two 4s: two eggs');
  assert.ok(text(eggs).includes('Poison 4 + Earth 4'));
  const bare = fusionChoiceHtml({ kind: 'fusion', tileId: 3, tier: 9, offers: [fusionOffer('metal', 'nature'), fusionOffer('nature', 'metal')] }, { img });
  assert.ok(bare.includes('/gen/pet.metal.128.png') && text(bare).includes('Metal 256 + Nature 256'), 'big singles show their grown-up baby');
});

test('the fusion pet to keep: both side by side, each with its skill, elements, what it gains and the buffs it keeps', () => {
  const choice = mockChoice('keep'); // a heavy merge: buffs on both sides
  const html = keepChoiceHtml(choice, { img });
  wordsFilled(html, 'keep');
  const t = text(html);
  assert.equal(count(html, /class="v2-card keep-card"/g), 2);
  assert.ok(html.includes('/gen/portrait.fire+ice.png') && html.includes('/gen/portrait.earth+metal.png'));
  assert.match(t, /Two fusions merge Keep one pet\. It takes the other pet’s elements as buffs\./);
  // keep the mover's (Novakit): it gains the other's two elements and all its buffs, and keeps its own
  assert.match(t, /Novakit Frostfire Waltz Fire \(main\) Ice Gains \+Poison ×2 \+Earth \+Wind \+Metal \+Nature \+2 poison stack per hit, \+25% health, \+15% range, \+10% crit chance \(double damage\), heals 1% health per second Keeps \+Lightning \+Wind Keep Novakit 1/);
  assert.match(t, /Ironclod Iron Taunt Earth \(main\) Metal Gains \+Fire \+Ice \+Lightning \+Wind \+20% damage, \+10% slow, \+20% fire rate, \+15% range Keeps \+Poison ×2 \+Wind \+Nature Keep Ironclod 2/);
  assert.equal(count(html, /class="kc-tag kc-gain"/g), 9, 'one gold tag per element gained');
});

test('the skill a new fusion gained: its pet, the skill in full (ACTIVE and PASSIVE), when it unlocks, and OK', () => {
  const html = resultCardHtml({ element: 'ice', fusion: 'fire' }, { img, tier: 5 });
  wordsFilled(html, 'result');
  const t = text(html);
  assert.ok(html.includes('/gen/portrait.fire+ice.png'));
  assert.match(t, /^New fusion pet Novakit Frostnova: Ice \+ Fire Frostfire Waltz Cooldown 15 s · Out for 8 s ACTIVE Summons Novakit/);
  assert.match(t, /PASSIVE Attacks like Echo Harpoon, 25% harder, with the effects of Fire \(Burn\)\./, 'the main element picked');
  assert.match(t, /Unlocks at 1024 \(5 more merges\) OK$/);
  assert.match(html, /data-act="result-ok"/);
  assert.match(html, /id="result-pet"/, 'the dialog is named by its pet');
  assert.match(text(resultCardHtml({ element: 'ice', fusion: 'fire' }, { img })), /Unlocks at 1024 OK$/, 'no tier: just the value it unlocks at');
  assert.match(text(lockFootHtml(11)), /^Unlocked: its namecard charges during waves\.$/, 'already 1024 or more');
});

test('the skill tooltip: the header keeps the unlock only where no foot says it', () => {
  const cls = { element: 'earth', fusion: 'metal' };
  assert.match(text(skillTipHtml(cls)), /Iron Taunt Cooldown 15 s · Out for 8 s · Unlocks at 1024 ACTIVE .* PASSIVE /);
  assert.match(text(skillTipHtml(cls, { foot: lockFootHtml(9) })), /Iron Taunt Cooldown 15 s · Out for 8 s ACTIVE .* Unlocks at 1024 \(1 more merge\)$/);
  assert.ok(!text(skillTipHtml(cls, { passive: false })).includes('PASSIVE'));
  assert.match(text(skillTipHtml(cls, { passive: 'any' })), /PASSIVE Attacks like the main element you pick/);
});

test('without generated art a card still says everything, with no broken pictures', () => {
  for (const kind of ['die', 'fusion', 'keep']) {
    const html = choiceHtml(mockChoice(kind), { img: none, deck: DEMO_DECK });
    assert.ok(!/<img[^>]*src=""/.test(html) && !html.includes('src="null"'), kind);
    wordsFilled(html, kind);
  }
  assert.ok(!resultCardHtml({ element: 'fire', fusion: 'ice' }, { img: none }).includes('<img'));
});

test('a choice is one card on screen: its key changes with the choice, never with a frame', () => {
  const a = mockChoice('die');
  assert.equal(choiceKey(a), choiceKey(mockChoice('die')), 'the same choice: the same key');
  assert.notEqual(choiceKey(a), choiceKey({ ...a, level: 4 }), 'the next level’s pick is a new card');
  assert.notEqual(choiceKey(a), choiceKey({ ...a, offers: a.offers.slice().reverse() }));
  assert.notEqual(choiceKey(mockChoice('keep')), choiceKey(mockChoice('fusion')));
  assert.equal(choiceKey(null), null);
  assert.equal(choiceLabel(mockChoice('die')), 'Choose a new element');
  assert.equal(choiceLabel(mockChoice('fusion')), 'Choose the main element');
  assert.equal(choiceLabel(mockChoice('keep')), 'Choose the pet to keep');
});

test('every card reads in Vietnamese too, with every number filled in', () => {
  setLang('vi');
  try {
    const die = choiceHtml(mockChoice('die'), { img, deck: DEMO_DECK });
    wordsFilled(die, 'die (vi)');
    assert.ok(text(die).includes('Hệ mới!') && text(die).includes('Ghép vào pet dung hợp: +1 tầng độc mỗi đòn'));
    const fusion = choiceHtml(mockChoice('fusion'), { img });
    wordsFilled(fusion, 'fusion (vi)');
    assert.match(text(fusion), /Hồi chiêu 15 giây · Ra trận 8 giây · Mở khóa: 1024 KÍCH HOẠT Triệu hồi Novakit ra tiền tuyến\./);
    wordsFilled(choiceHtml(mockChoice('keep'), { img }), 'keep (vi)');
    const result = resultCardHtml({ element: 'fire', fusion: 'ice' }, { img, tier: 5 });
    wordsFilled(result, 'result (vi)');
    assert.match(text(result), /NỘI TẠI Bắn như Hơi Thở Than Hồng, mạnh hơn 25%, kèm hiệu ứng của Băng \(Chậm \+ Đóng băng\)\./);
    assert.match(text(result), /Mở khóa ở 1024 \(thêm 5 lần gộp\)/);
  } finally {
    setLang('en');
  }
});

test('every text is escaped', () => {
  assert.equal(esc('<b>"A & B"</b>'), '&lt;b&gt;&quot;A &amp; B&quot;&lt;/b&gt;');
  assert.equal(esc(null), '');
});

// --- the stylesheet: the phone floors (docs/ux/phone-readability.md) --------------------------------
const css = readFileSync(new URL('../src/ui/cards.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const px = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`));
  return m ? Number(m[1].match(/(\d+(?:\.\d+)?)px/)?.[1]) : null;
};
const fontPx = (body) => px(body, 'font-size') ?? px(body, 'font');

test('the cards set no text under 13 px; the names, the skill and the buttons’ labels are bigger', () => {
  const small = rules.filter((r) => fontPx(r.body) != null && fontPx(r.body) < 13).map((r) => `${r.sel}: ${fontPx(r.body)} px`);
  assert.deepEqual(small, []);
  const size = (sel) => rules.filter((r) => r.sel.split(/,\s*/).includes(sel)).map((r) => fontPx(r.body)).find((v) => v != null);
  assert.ok(size('.dc-name') >= 20 && size('.tip-name') >= 18 && size('.fe-pet') >= 16, 'names');
  assert.ok(size('.dc-line') >= 14 && size('.dc-perk') >= 14 && size('.skill-tip') >= 14, 'body text at 14 px');
  assert.ok(size('.v2-pick') >= 16, 'the pick’s label: a button label');
});

test('the cards’ targets are 44 px or more', () => {
  const min = (sel) => rules.filter((r) => r.sel.split(/,\s*/).includes(sel)).map((r) => px(r.body, 'min-height')).find((v) => v != null);
  assert.ok(min('.main-option') >= 48, 'a main element’s button');
  assert.ok(min('.v2demo button') >= 44, 'the demo’s buttons');
  // a card is one button: its foot plate alone is 40 px, the whole card far more
  assert.ok(min('.v2-pick') >= 40);
});
