// v2 cards (docs/v2/SPEC.md section 7): the markup of the three choices (a new element, a fusion's main
// element, the fusion pet to keep), the card that shows the skill a new fusion gained, and the pieces the
// tile card (src/ui/inspect.js) shares with them: a fusion's skill in the shape of a League of Legends
// tooltip, the element chips. Pure: HTML strings built from the SPEC's shapes and the skill data
// (src/sim/skills/data.js), so a test renders every card in Node from mock choices. The words come from
// the language's table (src/i18n) through src/sim/describe.js, and every text is escaped. `img(id)` finds a
// generated picture (src/render/textures.js generatedUrl; a test passes its own); without one a card
// shows the element's badge or colour instead.
import { TIER_COLORS, V2, tierValue } from '../config.js';
import { ELEMENTS, FUSIONS, fusionKey } from '../sim/classes.js';
import { PURE_AT, SUMMON_AT, anyMainPassive, buffLine, buffList, buffStat, elAttack, elLine, elName, fusionName, gainTag, mergesTo, pureAura, pureName, skillHead, skillWords as wordsOf } from '../sim/describe.js';
import { petName } from '../art/tokens.js';
import { portraitId, spriteId } from '../art/sprite-ids.js';
import { generatedUrl } from '../render/textures.js';
import { tr } from '../i18n/index.js';

export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The elements in the game's order (buffs and lists read in it). */
const KEYS = Object.keys(ELEMENTS);
const elColor = (e) => ELEMENTS[e]?.color ?? '#c9b08a';
export const fusionColor = (a, b) => FUSIONS[fusionKey(a, b)]?.color ?? elColor(a);
export { fusionName };
/** A fusion's skill in words (src/sim/describe.js skillWords), with its pet's name. */
export const skillWords = (cls) => wordsOf(cls, petName(cls.element, cls.fusion));

// --- pictures ---------------------------------------------------------------------------------------

const pic = (url, cls = '') => (url ? `<img${cls ? ` class="${cls}"` : ''} alt="" src="${esc(url)}" />` : '');
/** A pet at a block's tier: its egg below 16, else its baby (16 … 128, the 128 one above). */
export const petPicId = (element, tier) => (tier < 4 ? spriteId({ kind: 'egg', tier: Math.max(1, Math.min(3, tier)) }) : spriteId({ kind: 'baby', el: element, stage: Math.max(0, Math.min(3, tier - 4)) }));
/** A fusion pet's picture: its namecard portrait, else its sticker. */
export const fusionPic = (cls, img) => img(portraitId(cls)) ?? img(spriteId({ kind: 'fusion', a: cls.element, b: cls.fusion }));
const badge = (element, img) => pic(img(`badge.${element}`));

const LOCK_ICON = '<svg class="tip-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>';
const FEED_ICON = '<svg class="perk-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v9M7.5 12h9" /></svg>';
const PURE_ICON = '<svg class="perk-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" /></svg>';

/** A block's value on its tier colour (the dialogs' head chip). */
export const tierChip = (tier) => `<div class="chip" style="--c:${TIER_COLORS[tier] ?? '#c39bff'}">${tierValue(tier)}</div>`;
/** The spawn level on a gold disc: "Lv 3". */
const levelChip = (level) => `<div class="chip level-chip" style="--c:#e0a92e"><small>${esc(tr('lv.disc'))}</small>${esc(level)}</div>`;

function choiceHead({ chip = '', title, sub }) {
  return `<div class="choice-head"><div class="choice-chip">${chip}</div><div><h2 class="choice-title">${esc(title)}</h2><p class="choice-sub">${esc(sub)}</p></div></div>`;
}

// --- the skill tooltip ------------------------------------------------------------------------------

/**
 * A fusion's skill as a League of Legends tooltip: its name and header line, ACTIVE (the summon, and
 * what the pet does out on the field), PASSIVE (how the fusion attacks from its tile), then `foot`
 * (markup: the lock, or the tile card's live charge line). `passive`: true (this main element's),
 * 'any' (the fusion choice: the main element is still to pick, the buttons below say each attack) or
 * false; `unlock` keeps the value it unlocks at in the header when no foot says it.
 */
export function skillTipHtml(cls, { passive = true, foot = '', unlock = !foot } = {}) {
  const w = skillWords(cls);
  const row = (kind, words) => `<p class="tip-row"><i class="tip-kick tip-${kind}">${esc(tr(`skill.${kind}`))}</i> ${esc(words)}</p>`;
  return `<section class="skill-tip" style="--c:${fusionColor(cls.element, cls.fusion)}">
    <header class="tip-top"><b class="tip-name">${esc(w.name)}</b><small class="tip-head">${esc(unlock ? skillHead() : w.head)}</small></header>
    ${row('active', `${w.summon} ${w.text}`)}
    ${passive ? row('passive', passive === 'any' ? anyMainPassive() : w.passive) : ''}
    ${foot}
  </section>`;
}

/** The tooltip's foot while the summon is locked: "Unlocks at 1024 (3 more merges)" (just "Unlocks at 1024" without a tier). */
export function lockFootHtml(tier = null) {
  if (tier != null && tier >= V2.summonTier) return `<p class="tip-foot tip-open">${esc(tr('result.unlocked'))}</p>`;
  const words = tier == null ? tr('skill.locked', { unlock: String(SUMMON_AT) }) : tr('card.skill.lockedIn', { unlock: String(SUMMON_AT), merges: mergesTo(tier, V2.summonTier) });
  return `<p class="tip-foot tip-lock">${LOCK_ICON}<span>${esc(words)}</span></p>`;
}

// --- a new element ----------------------------------------------------------------------------------

/** A fusion an element makes with a partner: the fusion pet's portrait (the partner's badge on it) and the skill's name. */
function fuseChipHtml(a, b, img) {
  const cls = { element: a, fusion: b };
  const w = skillWords(cls);
  const face = fusionPic(cls, img);
  return `<span class="fuse-chip" style="--c:${fusionColor(a, b)}" title="${esc(`${w.name}: ${w.pet} (${elName(a)} + ${elName(b)})`)}"><span class="fc-pic">${face ? pic(face) : ''}<span class="fc-badge" style="--c:${elColor(b)}">${badge(b, img)}</span></span><small>${esc(w.name)}</small></span>`;
}

/** One element on offer: a card to pick. */
function dieCardHtml(o, i, { img, deck }) {
  // the offer's own words (the sim's), else the element's from the table
  const name = o.name ?? elName(o.element);
  const desc = o.desc ?? tr(`el.${o.element}.desc`);
  const partners = deck.filter((d) => d !== o.element && ELEMENTS[d]);
  const baby = img(spriteId({ kind: 'baby', el: o.element, stage: 0 }));
  return `
    <button class="v2-card die-card" data-act="pick" data-i="${i}" style="--c:${o.colors?.[0] ?? elColor(o.element)}" title="${esc(desc)}">
      <span class="dc-top">
        <span class="dc-art">${pic(baby)}<span class="dc-seal">${badge(o.element, img)}</span></span>
        <span class="dc-names"><b class="dc-name">${esc(name)}</b><em class="dc-attack">${esc(o.attack ?? elAttack(o.element))}</em><small class="dc-line">${esc(o.line ?? elLine(o.element))}</small></span>
      </span>
      <span class="dc-perk dc-feed">${FEED_ICON}<span>${esc(buffLine(o.element))}</span></span>
      <span class="dc-perk dc-pure">${PURE_ICON}<span><b>${esc(tr('die.pureAt', { name: pureName(o.element), value: PURE_AT }))}</b> ${esc(pureAura(o.element))}</span></span>
      ${partners.length ? `<span class="dc-fuses-label">${esc(tr('die.fuses'))}</span><span class="dc-fuses">${partners.map((d) => fuseChipHtml(o.element, d, img)).join('')}</span>` : ''}
      <span class="v2-pick">${esc(tr('die.pick', { name }))}</span>
      <kbd>${i + 1}</kbd>
    </button>`;
}

/**
 * A new element: { kind: 'die', level, offers: [{ element, name, attack, colors, desc, line }] }. One
 * card per offer, each the element's baby pet with its badge as the seal, its name and attack and what
 * the attack does, what it gives a fusion it is fed into, its pure aura at 4096, and the fusions it
 * makes with the deck's elements (`deck`: run.owned).
 */
export function dieChoiceHtml(choice, { img = generatedUrl, deck = [] } = {}) {
  const offers = choice.offers ?? [];
  const chip = choice.level != null ? levelChip(choice.level) : choice.tier != null ? tierChip(choice.tier) : '';
  return `${choiceHead({ chip, title: tr('die.title'), sub: tr('die.sub') })}<div class="v2-options die-options" data-n="${offers.length}">${offers.map((o, i) => dieCardHtml(o, i, { img, deck })).join('')}</div>`;
}

// --- a fusion's main element ------------------------------------------------------------------------

/** One of the two pets being merged: its egg or baby on its colour, its element and value. */
function partHtml(part, img) {
  const url = img(petPicId(part.element, part.tier));
  return `<span class="fe-part" style="--c:${elColor(part.element)}"><span class="fe-pic">${pic(url)}<span class="fe-badge">${badge(part.element, img)}</span></span><small>${esc(tr('fuse.part', { name: elName(part.element), value: tierValue(part.tier) }))}</small></span>`;
}

/** A main element to pick: its badge, its attack's name, and what the attack does. */
function mainButtonHtml(o, i, img) {
  return `
    <button class="option main-option" data-act="pick" data-i="${i}" style="--c:${elColor(o.element)}">
      <span class="mo-badge">${badge(o.element, img)}</span>
      <span class="opt-text"><b>${esc(elAttack(o.element))}</b><small>${esc(tr('fuse.mainLine', { name: elName(o.element), line: elLine(o.element) }))}</small></span>
      <kbd>${i + 1}</kbd>
    </button>`;
}

/**
 * Two single pets (or eggs) of different elements merged: { kind: 'fusion', tileId, tier, parts:
 * [{ element, tier }] (mover, stayer), offers: [{ element, fusion, key, name, color }] (mover-main first) }.
 * The two pets being merged → the fusion pet (portrait, pet name, fusion name); the fusion's skill in
 * full (name, header, ACTIVE, PASSIVE for whichever main element); then one button per main element
 * (its attack and what it does).
 */
export function fusionChoiceHtml(choice, { img = generatedUrl } = {}) {
  const offers = choice.offers ?? [];
  const head = choiceHead({ chip: choice.tier != null ? tierChip(choice.tier) : '', title: tr('fuse.title'), sub: tr('fuse.sub') });
  if (!offers.length) return head; // (never in the SPEC: a frame that throws would stop the game)
  const cls = { element: offers[0].element, fusion: offers[0].fusion };
  const parts = choice.parts ?? [
    { element: cls.element, tier: Math.max(1, choice.tier - 1) },
    { element: cls.fusion, tier: Math.max(1, choice.tier - 1) },
  ];
  const pet = petName(cls.element, cls.fusion);
  const say = tr('fuse.say', { a: elName(parts[0].element), b: elName(parts[1].element), pet });
  const face = fusionPic(cls, img);
  const eq = `<div class="fuse-eq" role="img" aria-label="${esc(say)}">${partHtml(parts[0], img)}<i class="fe-op" aria-hidden="true">+</i>${partHtml(parts[1], img)}<i class="fe-op fe-to" aria-hidden="true">→</i><span class="fe-out" style="--c:${fusionColor(cls.element, cls.fusion)}"><span class="fe-pic">${pic(face)}</span><b class="fe-pet">${esc(pet)}</b><small class="fe-fusion">${esc(fusionName(cls.element, cls.fusion))}</small></span></div>`;
  return `${head}${eq}${skillTipHtml(cls, { passive: 'any' })}<div class="v2-options main-options">${offers.map((o, i) => mainButtonHtml(o, i, img)).join('')}</div>`;
}

// --- the fusion to keep -----------------------------------------------------------------------------

/** An element chip (its badge and name); the main one says so. */
export function elChipHtml(element, { main = false, img = generatedUrl } = {}) {
  return `<span class="el-chip${main ? ' main' : ''}" style="--c:${elColor(element)}">${badge(element, img)}${esc(main ? tr('card.main', { name: elName(element) }) : elName(element))}</span>`;
}

/** The buffs a kept pet had before the merge: its buffs after it, less what it gains. */
const ownBuffs = (buffs = {}, gain = {}) => Object.fromEntries(KEYS.map((k) => [k, (buffs[k] ?? 0) - (gain[k] ?? 0)]).filter(([, n]) => n > 0));

function keepCardHtml(o, i, img) {
  const cls = o.cls;
  const w = skillWords(cls);
  const face = fusionPic(cls, img);
  const own = buffList(ownBuffs(cls.buffs, o.gain));
  const gains = buffList(o.gain);
  return `
    <button class="v2-card keep-card" data-act="pick" data-i="${i}" style="--c:${fusionColor(cls.element, cls.fusion)}">
      <span class="kc-pic">${pic(face)}</span>
      <b class="kc-pet">${esc(w.pet)}</b>
      <small class="kc-skill">${esc(w.name)}</small>
      <span class="kc-els">${elChipHtml(cls.element, { main: true, img })}${elChipHtml(cls.fusion, { img })}</span>
      <span class="kc-label kc-gain-label">${esc(tr('keep.gains'))}</span>
      <span class="kc-tags kc-gains">${gains.map((g) => `<span class="kc-tag kc-gain" style="--c:${elColor(g.element)}">${esc(gainTag(g.element, g.n))}</span>`).join('')}</span>
      <small class="kc-gain-stats">${esc(gains.map((g) => buffStat(g.element, g.n)).join(', '))}</small>
      ${own.length ? `<span class="kc-label">${esc(tr('keep.has'))}</span><span class="kc-tags">${own.map((b) => `<span class="kc-tag">${esc(gainTag(b.element, b.n))}</span>`).join('')}</span>` : ''}
      <span class="v2-pick">${esc(tr('keep.pick', { pet: w.pet }))}</span>
      <kbd>${i + 1}</kbd>
    </button>`;
}

/**
 * Two fusions merged: { kind: 'keep', tileId, tier, offers: [{ cls, gain }] } (keep the mover's, keep the
 * stayer's; cls = the kept fusion after the merge, gain = the buffs it gains). Both pets side by side,
 * each with its skill, its elements, what it gains (the elements as tags, then what they give, in one
 * line: a long list never runs a phone's card off its screen) and the buffs it already had.
 */
export function keepChoiceHtml(choice, { img = generatedUrl } = {}) {
  const offers = choice.offers ?? [];
  return `${choiceHead({ chip: choice.tier != null ? tierChip(choice.tier) : '', title: tr('keep.title'), sub: tr('keep.sub') })}<div class="v2-options keep-options">${offers.map((o, i) => keepCardHtml(o, i, img)).join('')}</div>`;
}

// --- a choice, as the HUD shows it -----------------------------------------------------------------

/** The dialog's markup for a pending choice (run.pendingChoice); ctx = { img, deck }. */
export function choiceHtml(choice, ctx = {}) {
  if (choice.kind === 'fusion') return fusionChoiceHtml(choice, ctx);
  if (choice.kind === 'keep') return keepChoiceHtml(choice, ctx);
  return dieChoiceHtml(choice, ctx);
}

/** The dialog's name for a screen reader. */
export const choiceLabel = (choice) => tr(choice.kind === 'fusion' ? 'fuse.name' : choice.kind === 'keep' ? 'keep.name' : 'die.name');

/** A choice as one key: a new key is a new card (two die choices in a row share no tier, so the level and the offers count). */
export const choiceKey = (choice) =>
  choice ? [choice.kind, choice.tileId ?? '', choice.level ?? '', choice.tier ?? '', ...(choice.offers ?? []).map((o) => `${o.element ?? o.cls?.element ?? ''}:${o.fusion ?? o.cls?.fusion ?? ''}`)].join('|') : null;

// --- the skill gained ------------------------------------------------------------------------------

/**
 * The card after a fusion is made (its choice taken, or none): the fusion pet's portrait, its name, the
 * fusion and its two elements, the skill it gained in full (name, header, ACTIVE, PASSIVE), when its
 * summon unlocks (`tier`: the block's, for the merges still to go), and OK.
 */
export function resultCardHtml(cls, { img = generatedUrl, tier = null } = {}) {
  const w = skillWords(cls);
  const face = fusionPic(cls, img);
  return `
    <span class="rc-kicker">${esc(tr('result.kicker'))}</span>
    <span class="rc-pic">${pic(face)}</span>
    <h2 class="rc-pet" id="result-pet">${esc(w.pet)}</h2>
    <p class="rc-sub">${esc(tr('result.sub', { fusion: fusionName(cls.element, cls.fusion), a: elName(cls.element), b: elName(cls.fusion) }))}</p>
    ${skillTipHtml(cls, { passive: true, foot: lockFootHtml(tier) })}
    <button class="primary rc-ok" data-act="result-ok">${esc(tr('result.ok'))}</button>`;
}
