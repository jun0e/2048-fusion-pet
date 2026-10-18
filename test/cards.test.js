// The cards (docs/v2/SPEC.md section 7, docs/v2/SPEC-v2.1.md sections 2 and 6; src/ui/cards.js), rendered
// as HTML strings in Node from mock choices in the SPEC's shapes: a new element (2 offers), the fusion pet
// to keep (docked over the field), and the skill a new fusion gained (two singles fuse at once in v2.1:
// no main-element pick). Stats show as icons and numbers. A stand-in picture finder names every picture by
// its sprite id, so the tests see which pet each card shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as cards from '../src/ui/cards.js';
import { chipHtml, choiceDocks, choiceHtml, choiceKey, choiceLabel, dieChoiceHtml, esc, keepChoiceHtml, lockFootHtml, resultCardHtml, skillTipHtml, strengthsHtml, trMarkup } from '../src/ui/cards.js';
import { ELEMENTS, fusionClass, traitsOf } from '../src/sim/classes.js';
import { buffChip, strengthsOf } from '../src/sim/describe.js';
import { DEMO_DECK, mockChoice } from '../src/ui/v2demo.js';
import { setLang, tr } from '../src/i18n/index.js';

const img = (id) => `/gen/${id}.png`;
const none = () => null;
const count = (html, re) => (html.match(re) ?? []).length;
/** The text a player reads: an icon as its [word], the markup's words, tags dropped and entities read back. */
const text = (html) =>
  html
    .replace(/<svg[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g, ' [$1] ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const offer = (e) => ({ element: e, name: ELEMENTS[e].name, attack: ELEMENTS[e].attack, colors: [ELEMENTS[e].color], desc: ELEMENTS[e].desc, line: ELEMENTS[e].line });

/** No word left unfilled, and no key shown in place of its words. */
function wordsFilled(html, what) {
  const t = text(html);
  assert.ok(!/[{}]/.test(t), `${what}: a placeholder left in "${t.match(/.{0,30}[{}].{0,30}/)?.[0]}"`);
  assert.ok(!/\b(skill|buff|stat|pure|die|fuse|keep|result|card|chip|trait|icon|reward)\.[a-z]/.test(t), `${what}: a key shown as words`);
  assert.ok(!/[\u0001\u0002]/.test(html), `${what}: a markup mark left`);
}

test('a stat chip is its icon and its number, never its word; a buff wears its element’s colour on its edge', () => {
  const c = buffChip('fire');
  const html = chipHtml(c);
  assert.equal(text(html), '[Damage] +20%');
  assert.match(html, /^<span class="stat-chip" title="\+20% damage"><svg class="ico ico-dmg"/);
  const edged = chipHtml(buffChip('poison', 2), { edge: '#a35cf0', title: null, cls: 'gain' });
  assert.match(edged, /class="stat-chip edged gain" style="--e:#a35cf0">/);
  assert.equal(text(edged), '[Poison stacks] +1.6', 'two copies of a buff give less than twice one (classes.js buffWorth)');
  assert.equal(chipHtml(null), '');
});

test('words with a chip inside: escaped words, the chip wherever the language puts it', () => {
  const chip = '<b>chip</b>';
  assert.equal(trMarkup('buff.line', {}, { stat: chip }), `Fed to a fusion: ${chip}`);
  assert.equal(trMarkup('card.aura', { name: 'A <b> & C' }, { stat: chip }), `A &lt;b&gt; &amp; C: ${chip}`);
  setLang('vi');
  try {
    assert.equal(trMarkup('buff.line', {}, { stat: chip }), `Ghép vào pet dung hợp: ${chip}`);
  } finally {
    setLang('en');
  }
});

test('a new element: two upgrade cards, each the baby pet, its attack, what it gives a fusion and its pure aura as stat chips, and its fusions with the deck', () => {
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
  // the stats as icons and numbers, not words
  assert.ok(t.includes('Fed to a fusion: [Range] +15%'), 'wind fed to a fusion');
  assert.ok(t.includes('Pure Wind at 4096 Every other pet: [Range] +20%'), 'its pure aura');
  assert.ok(t.includes('Fed to a fusion: [Poison stacks] +1'));
  assert.ok(!/\+\d+% range|poison stack per hit/.test(t), 'no stat words');
  // the fusions with the deck: each fusion pet's portrait (the partner's badge on it) and its skill
  for (const [a, b, skill] of [
    ['wind', 'fire', 'Fire Twister'],
    ['wind', 'ice', 'Whiteout'],
    ['poison', 'fire', 'Brimstone Blast'],
    ['poison', 'ice', 'Venom Tendrils'],
  ]) {
    assert.ok(html.includes(`/gen/portrait.${[a, b].sort((x, y) => Object.keys(ELEMENTS).indexOf(x) - Object.keys(ELEMENTS).indexOf(y)).join('+')}.png`), `${a} + ${b}: its portrait`);
    assert.ok(t.includes(skill), `${a} + ${b}: ${skill}`);
  }
  assert.equal(count(html, /class="fuse-chip"/g), 4);
  // health and regen auras reach every block
  assert.ok(text(dieChoiceHtml({ kind: 'die', level: 2, offers: [offer('earth')] }, { img })).includes('Every block: [Health] +30%'));
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

test('no fusion pick (v2.1): the cards module has no fusion card, and a choice is a new element or a pet to keep', () => {
  assert.equal(cards.fusionChoiceHtml, undefined);
  assert.equal(choiceLabel(mockChoice('die')), 'Choose a new element');
  assert.equal(choiceLabel(mockChoice('keep')), 'Choose the pet to keep');
  assert.ok(choiceDocks(mockChoice('keep')), 'the pet to keep docks over the field: the board stays in view');
  assert.ok(!choiceDocks(mockChoice('die')) && !choiceDocks(null));
  assert.match(choiceHtml(mockChoice('keep'), { img }), /keep-card/);
  assert.match(choiceHtml(mockChoice('die'), { img, deck: DEMO_DECK }), /die-card/);
});

test('the fusion pet to keep: compact, both side by side, each its portrait and elements, its skill, and its buffs after the merge, the gained ones first in gold', () => {
  const choice = mockChoice('keep', DEMO_DECK, { tileId: 42 }); // a heavy merge: buffs on both sides
  assert.equal(choice.tileId, 42, 'the block the board highlights');
  const html = keepChoiceHtml(choice, { img });
  wordsFilled(html, 'keep');
  const t = text(html);
  assert.equal(count(html, /class="v2-card keep-card"/g), 2);
  assert.ok(html.includes('/gen/portrait.fire+ice.png') && html.includes('/gen/portrait.earth+metal.png'));
  assert.ok(!html.includes('class="choice-chip"><div'), 'no tier chip: the board shows the block');
  assert.match(t, /^Keep one pet It gains the other’s elements: the gold buffs\./);
  // keep the mover's (Novakit): it gains the other's two elements and all its buffs (gold, first), and keeps its own
  assert.match(t, /Novakit Frostfire Waltz \[Poison stacks\] \+1\.6 \[Health\] \+25% \[Range\] \+24% \[Crit chance\] \+10% \[Regen\] \+1%\/s \[Attack speed\] \+20% Keep Novakit 1/);
  assert.match(t, /Ironclod Iron Taunt \[Damage\] \+20% \[Slow\] \+10% \[Attack speed\] \+20% \[Range\] \+24% \[Poison stacks\] \+1\.6 \[Regen\] \+1%\/s Keep Ironclod 2/);
  assert.equal(count(html, /stat-chip edged gain/g), 9, 'one gold chip per element gained');
  assert.equal(count(html, /stat-chip edged"/g), 3, 'and the buffs it keeps as they are');
  assert.match(html, /title="\+Wind ×2: \+24% range"/, 'each chip says its element and what it gives');
  for (const e of ['fire', 'ice', 'earth', 'metal']) assert.ok(html.includes(`/gen/badge.${e}.png`), `${e}: its badge on the portrait`);
});

test('the skill a new fusion gained: its pet, its strengths, the skill in full (ACTIVE and PASSIVE), when it unlocks, and OK', () => {
  const cls = fusionClass('ice', 'fire'); // v2.1: Novakit's main element is fixed (fire)
  assert.equal(cls.element, 'fire');
  const strengths = strengthsOf(traitsOf(cls, true, 5));
  const html = resultCardHtml(cls, { img, tier: 5, strengths });
  wordsFilled(html, 'result');
  const t = text(html);
  assert.ok(html.includes('/gen/portrait.fire+ice.png'));
  assert.match(t, /^New fusion pet Novakit Frostnova: Fire \+ Ice Far reach Other lanes Area hits Chain hits Good at reaching far and hitting crowds\. Weak at hitting other lanes and chaining foe to foe\. Frostfire Waltz \[Summon charge\] 15 s · \[Summon\] 8 s ACTIVE Summons Novakit/);
  assert.match(t, /PASSIVE Attacks like Ember Breath, 25% harder, with the effects of Ice \(Slow \+ Freeze\)\./, 'its fixed main element');
  assert.match(t, /Unlocks at 1024 \(5 more merges\) OK$/);
  assert.match(html, /data-act="result-ok"/);
  assert.match(html, /id="result-pet"/, 'the dialog is named by its pet');
  assert.equal(count(html, /class="trait on"/g), 2, 'a fusion has exactly two strengths, lit');
  assert.equal(count(html, /class="trait"/g), 2, 'and two weaknesses, dim');
  assert.match(text(resultCardHtml(cls, { img })), /Unlocks at 1024 OK$/, 'no tier: just the value it unlocks at');
  assert.ok(!resultCardHtml(cls, { img }).includes('traits'), 'no strengths given: none shown');
  assert.match(text(lockFootHtml(11)), /^Unlocked: its namecard charges during waves\.$/, 'already 1024 or more');
});

test('the skill tooltip: its head is the charge and the time out as icons and seconds, the unlock only where no foot says it', () => {
  const cls = { element: 'earth', fusion: 'metal' };
  assert.match(text(skillTipHtml(cls)), /^Iron Taunt \[Summon charge\] 15 s · \[Summon\] 8 s · Unlocks at 1024 ACTIVE .* PASSIVE /);
  assert.match(text(skillTipHtml(cls, { foot: lockFootHtml(9) })), /^Iron Taunt \[Summon charge\] 15 s · \[Summon\] 8 s ACTIVE .* Unlocks at 1024 \(1 more merge\)$/);
  assert.match(text(skillTipHtml(cls, { chargeS: 11 })), /\[Summon charge\] 11 s/, 'the run’s charge time, once the level road shortens it');
  assert.ok(!text(skillTipHtml(cls, { passive: false })).includes('PASSIVE'));
});

test('strengths: four icons, lit or dim, with their words, and a line a screen reader reads', () => {
  const html = strengthsHtml(strengthsOf({ far: true, lanes: false, area: true, chain: false }));
  assert.match(html, /<h4>Strengths<\/h4>/);
  assert.match(html, /class="trait-row" aria-hidden="true"/, 'the row is for the eye');
  assert.deepEqual([...html.matchAll(/class="trait( on)?"/g)].map((m) => !!m[1]), [true, false, true, false]);
  assert.match(text(html), /Far reach Other lanes Area hits Chain hits Good at reaching far and hitting crowds\. Weak at hitting other lanes and chaining foe to foe\.$/);
  assert.equal(strengthsHtml(null), '');
  assert.ok(!strengthsHtml(strengthsOf({}), { title: false }).includes('<h4>'));
});

test('without generated art a card still says everything, with no broken pictures', () => {
  for (const kind of ['die', 'keep']) {
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
  assert.notEqual(choiceKey(mockChoice('keep')), choiceKey(mockChoice('keep', DEMO_DECK, { tileId: 7 })));
  assert.equal(choiceKey(null), null);
});

test('every card reads in Vietnamese too, with every number filled in', () => {
  setLang('vi');
  try {
    const die = choiceHtml(mockChoice('die'), { img, deck: DEMO_DECK });
    wordsFilled(die, 'die (vi)');
    assert.ok(text(die).includes('Hệ mới!') && text(die).includes('Ghép vào pet dung hợp: [Tầng độc] +1'));
    const keep = choiceHtml(mockChoice('keep'), { img });
    wordsFilled(keep, 'keep (vi)');
    assert.match(text(keep), /^Giữ một thú cưng Nó nhận hệ của con kia: tăng cường màu vàng\./);
    const cls = fusionClass('fire', 'ice');
    const result = resultCardHtml(cls, { img, tier: 5, strengths: strengthsOf(traitsOf(cls, true, 5)) });
    wordsFilled(result, 'result (vi)');
    assert.match(text(result), /Hồi chiêu\] 15 giây · \[Triệu hồi\] 8 giây KÍCH HOẠT Triệu hồi Novakit ra tiền tuyến\./);
    assert.match(text(result), /NỘI TẠI Bắn như Hơi Thở Than Hồng, mạnh hơn 25%, kèm hiệu ứng của Băng \(Chậm \+ Đóng băng\)\./);
    assert.match(text(result), /Giỏi bắn xa và đánh cả đám\. Yếu khi đánh sang làn khác và nảy từ quái này sang quái khác\./);
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
const ruleFor = (sel) => rules.filter((r) => r.sel.split(/,\s*/).includes(sel));

test('the cards set no text under 13 px; the names, the skill and the buttons’ labels are bigger', () => {
  const small = rules.filter((r) => fontPx(r.body) != null && fontPx(r.body) < 13).map((r) => `${r.sel}: ${fontPx(r.body)} px`);
  assert.deepEqual(small, []);
  const size = (sel) => ruleFor(sel).map((r) => fontPx(r.body)).find((v) => v != null);
  assert.ok(size('.dc-name') >= 20 && size('.tip-name') >= 18 && size('.kc-pet') >= 16, 'names');
  assert.ok(size('.dc-line') >= 14 && size('.dc-perk') >= 14 && size('.skill-tip') >= 14, 'body text at 14 px');
  assert.ok(size('.v2-pick') >= 16, 'the pick’s label: a button label');
});

test('the cards’ targets are 44 px or more', () => {
  const min = (sel) => ruleFor(sel).map((r) => px(r.body, 'min-height')).find((v) => v != null);
  assert.ok(min('.v2demo button') >= 44, 'the demo’s buttons');
  // a card is one button: its foot plate alone is 38 px, the whole card far more
  assert.ok(min('.v2-pick') >= 38 && min('.keep-card .v2-pick') >= 38);
});

test('the docked card has no scrim over the board and keeps above it', () => {
  const docked = ruleFor('.choice-scrim.docked')[0]?.body ?? '';
  assert.match(docked, /background: none/);
  assert.match(docked, /backdrop-filter: none/);
  assert.match(docked, /pointer-events: none/, 'the board under it is not covered by a hidden layer that eats taps… it only waits');
  assert.match(ruleFor('.choice-scrim.docked .choice')[0]?.body ?? '', /max-height: calc\(var\(--board-top[^)]*\) - var\(--dock-top[^)]*\) - 4px\)/, 'it ends above the board');
});
