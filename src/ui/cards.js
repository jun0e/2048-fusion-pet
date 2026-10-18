// v2 cards (docs/v2/SPEC.md section 7, docs/v2/SPEC-v2.1.md section 6): the markup of the two choices (a
// new element, the fusion pet to keep), the card that shows the skill a new fusion gained (two single pets
// fuse at once in v2.1: their pair fixes the pet's main element, so there is no pick), and the pieces the
// tile card (src/ui/inspect.js) shares with them: a fusion's skill in the shape of a League of Legends
// tooltip, the element chips, the stat chips (a stat's icon and its number, src/ui/icons.js, in place of
// its words) and the attack's strengths. Pure: HTML strings built from the SPEC's shapes and the skill
// data (src/sim/skills/data.js), so a test renders every card in Node from mock choices. The words come
// from the language's table (src/i18n) through src/sim/describe.js, and every text is escaped. `img(id)`
// finds a generated picture (src/render/textures.js generatedUrl; a test passes its own); without one a
// card shows the element's badge or colour instead.
import { TIER_COLORS, V2, tierValue } from '../config.js';
import { ELEMENTS, FUSIONS, fusionKey } from '../sim/classes.js';
import { PURE_AT, SUMMON_AT, buffChip, buffChips, elAttack, elLine, elName, fusionName, mergesTo, pureChip, pureName, skillWords as wordsOf } from '../sim/describe.js';
import { summonHead } from '../sim/skills/data.js';
import { petName } from '../art/tokens.js';
import { portraitId, spriteId } from '../art/sprite-ids.js';
import { generatedUrl } from '../render/textures.js';
import { icon, iconWord } from './icons.js';
import { num, tr } from '../i18n/index.js';

export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The elements in the game's order (buffs and lists read in it). */
const KEYS = Object.keys(ELEMENTS);
const elColor = (e) => ELEMENTS[e]?.color ?? '#c9b08a';
export const fusionColor = (a, b) => FUSIONS[fusionKey(a, b)]?.color ?? elColor(a);
export { fusionName };
/** A fusion's skill in words (src/sim/describe.js skillWords), with its pet's name. */
export const skillWords = (cls) => wordsOf(cls, petName(cls.element, cls.fusion));

/**
 * tr() with some of its values as markup: the words are escaped, then each {name} of `html` goes in as
 * it is (a stat chip in the middle of a sentence, wherever the language puts it).
 */
export function trMarkup(key, vars = {}, html = {}) {
  const names = Object.keys(html);
  const marks = Object.fromEntries(names.map((k, i) => [k, `\u0001${i}\u0002`]));
  return esc(tr(key, { ...vars, ...marks })).replace(/\u0001(\d+)\u0002/g, (m, i) => html[names[i]]);
}

// --- stat chips and strengths ------------------------------------------------------------------------

/**
 * A stat chip (src/sim/describe.js statChip, buffChip, boostChips): the stat's icon and its number
 * ("[sword] +20%"). The icon says the stat's word to a screen reader; `title` (the stat in words by
 * default) shows on a hover. `edge`: the element's colour on its left edge (a buff's element).
 */
export function chipHtml(chip, { title = chip?.words, edge = null, cls = '' } = {}) {
  if (!chip) return '';
  const style = edge ? ` style="--e:${edge}"` : '';
  return `<span class="stat-chip${edge ? ' edged' : ''}${cls ? ` ${cls}` : ''}"${style}${title ? ` title="${esc(title)}"` : ''}>${icon(chip.stat, { size: 16 })}<b>${esc(chip.value)}</b></span>`;
}

/**
 * An attack's strengths (src/sim/describe.js strengthsOf): the four icons, lit where the pet has the
 * strength and dim where it is a weakness, each with its word, and the line that says it. The row is
 * for the eye; the line says the same to a screen reader.
 */
export function strengthsHtml(st, { title = true } = {}) {
  if (!st) return '';
  const trait = (t) => `<span class="trait${t.on ? ' on' : ''}">${icon(t.key, { size: 22, title: null })}<small>${esc(iconWord(t.key))}</small></span>`;
  return `<div class="traits">${title ? `<h4>${esc(tr('trait.title'))}</h4>` : ''}<div class="trait-row" aria-hidden="true">${st.list.map(trait).join('')}</div><p class="trait-line">${esc(st.line)}</p></div>`;
}

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
 * The summon's numbers as the tooltip's head shows them: its charge and its time out as icons and
 * seconds ("[charge] 15 s · [paw] 8 s"), and with `unlock` the value it unlocks at, in words. `chargeS`:
 * the run's charge time (the level road shortens it), else the summon's own.
 */
function tipHeadHtml(unlock, chargeS = null) {
  const h = summonHead();
  const part = (key, s) => `<span class="tip-stat">${icon(key, { size: 16 })}${esc(tr('unit.s', { n: num(Math.round(s * 10) / 10) }))}</span>`;
  const dot = '<i class="tip-dot" aria-hidden="true">·</i>';
  return `${part('charge', chargeS ?? h.chargeS)}${dot}${part('summon', h.durS)}${unlock ? `${dot}<span>${esc(tr('skill.locked', { unlock: String(h.unlock) }))}</span>` : ''}`;
}

/**
 * A fusion's skill as a League of Legends tooltip: its name and head (the summon's charge and time out),
 * ACTIVE (the summon, and what the pet does out on the field), PASSIVE (how the fusion attacks from its
 * tile), then `foot` (markup: the lock, or the tile card's live charge line). `unlock` keeps the value it
 * unlocks at in the head when no foot says it; `chargeS` is the run's charge time, when there is a run.
 */
export function skillTipHtml(cls, { passive = true, foot = '', unlock = !foot, chargeS = null } = {}) {
  const w = skillWords(cls);
  const row = (kind, words) => `<p class="tip-row"><i class="tip-kick tip-${kind}">${esc(tr(`skill.${kind}`))}</i> ${esc(words)}</p>`;
  return `<section class="skill-tip" style="--c:${fusionColor(cls.element, cls.fusion)}">
    <header class="tip-top"><b class="tip-name">${esc(w.name)}</b><small class="tip-head">${tipHeadHtml(unlock, chargeS)}</small></header>
    ${row('active', `${w.summon} ${w.text}`)}
    ${passive ? row('passive', w.passive) : ''}
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

/** What an element gives a fusion it is fed into, its stat as a chip: "Fed to a fusion: [sword] +20%". */
export const feedLineHtml = (element) => trMarkup('buff.line', {}, { stat: chipHtml(buffChip(element)) });
/** A pure pet's aura, its stat as a chip: "Every other pet: [sword] +25%" (`chip`: pureChip's, else the element's). */
export function pureAuraHtml(element, chip = pureChip(element)) {
  return trMarkup(chip.scope === 'blocks' ? 'chip.blocks' : 'chip.others', {}, { stat: chipHtml(chip) });
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
      <span class="dc-perk dc-feed">${FEED_ICON}<span>${feedLineHtml(o.element)}</span></span>
      <span class="dc-perk dc-pure">${PURE_ICON}<span><b>${esc(tr('die.pureAt', { name: pureName(o.element), value: PURE_AT }))}</b> ${pureAuraHtml(o.element)}</span></span>
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

// --- the fusion to keep -----------------------------------------------------------------------------

/** An element chip (its badge and name); the main one says so. */
export function elChipHtml(element, { main = false, img = generatedUrl } = {}) {
  return `<span class="el-chip${main ? ' main' : ''}" style="--c:${elColor(element)}">${badge(element, img)}${esc(main ? tr('card.main', { name: elName(element) }) : elName(element))}</span>`;
}

/** A buff as a chip on its element's edge, titled with its element and what it gives ("+Poison ×2: +1.6 poison stacks per hit"). */
const buffChipHtml = (c, cls = '') => chipHtml(c, { title: `${c.tag}: ${c.words}`, edge: elColor(c.element), cls });

function keepCardHtml(o, i, img) {
  const cls = o.cls;
  const w = skillWords(cls);
  const face = fusionPic(cls, img);
  // its buffs after the merge, in one flow: what the merge gives it first (gold), then the ones it keeps as they are
  const gained = (c) => (o.gain?.[c.element] ?? 0) > 0;
  const after = buffChips(cls.buffs);
  const buffs = [...after.filter(gained), ...after.filter((c) => !gained(c))];
  return `
    <button class="v2-card keep-card" data-act="pick" data-i="${i}" style="--c:${fusionColor(cls.element, cls.fusion)}">
      <span class="kc-top">
        <span class="kc-pic">${pic(face)}<span class="kc-badges">${[cls.element, cls.fusion].map((e) => `<span class="kc-badge" style="--c:${elColor(e)}" title="${esc(elName(e))}">${badge(e, img)}</span>`).join('')}</span></span>
        <span class="kc-names"><b class="kc-pet">${esc(w.pet)}</b><small class="kc-skill">${esc(w.name)}</small></span>
      </span>
      <span class="kc-buffs">${buffs.map((c) => buffChipHtml(c, gained(c) ? 'gain' : '')).join('')}</span>
      <span class="v2-pick">${esc(tr('keep.pick', { pet: w.pet }))}</span>
      <kbd>${i + 1}</kbd>
    </button>`;
}

/**
 * Two fusions merged: { kind: 'keep', tileId, tier, offers: [{ cls, gain }] } (keep the mover's, keep the
 * stayer's; cls = the kept fusion after the merge, gain = the buffs it gains). A compact card docked at
 * the top of the field, so the board stays in view under it (the merged block is highlighted there):
 * both pets side by side, each with its portrait (its two elements' badges on it), its skill, and its
 * buffs after the merge as stat chips, what the merge gives it first and in gold.
 */
export function keepChoiceHtml(choice, { img = generatedUrl } = {}) {
  const offers = choice.offers ?? [];
  return `${choiceHead({ title: tr('keep.title'), sub: tr('keep.sub') })}<div class="v2-options keep-options">${offers.map((o, i) => keepCardHtml(o, i, img)).join('')}</div>`;
}

// --- a choice, as the HUD shows it -----------------------------------------------------------------

/** The dialog's markup for a pending choice (run.pendingChoice); ctx = { img, deck }. */
export function choiceHtml(choice, ctx = {}) {
  if (choice.kind === 'keep') return keepChoiceHtml(choice, ctx);
  return dieChoiceHtml(choice, ctx);
}

/** The dialog's name for a screen reader. */
export const choiceLabel = (choice) => tr(choice.kind === 'keep' ? 'keep.name' : 'die.name');

/** Whether a choice docks at the top of the field (the board stays in view) rather than opening over the screen. */
export const choiceDocks = (choice) => choice?.kind === 'keep';

/** A choice as one key: a new key is a new card (two die choices in a row share no tier, so the level and the offers count). */
export const choiceKey = (choice) =>
  choice ? [choice.kind, choice.tileId ?? '', choice.level ?? '', choice.tier ?? '', ...(choice.offers ?? []).map((o) => `${o.element ?? o.cls?.element ?? ''}:${o.fusion ?? o.cls?.fusion ?? ''}`)].join('|') : null;

// --- the skill gained ------------------------------------------------------------------------------

/**
 * The card after two single pets fuse: the fusion pet's portrait, its name, the fusion and its two
 * elements, its attack's strengths (`traits`: the block's profileFor(tile).traits, when the sim gives
 * them), the skill it gained in full (name, head, ACTIVE, PASSIVE), when its summon unlocks (`tier`:
 * the block's, for the merges still to go), and OK.
 */
export function resultCardHtml(cls, { img = generatedUrl, tier = null, strengths = null, chargeS = null } = {}) {
  const w = skillWords(cls);
  const face = fusionPic(cls, img);
  return `
    <span class="rc-kicker">${esc(tr('result.kicker'))}</span>
    <span class="rc-pic">${pic(face)}</span>
    <h2 class="rc-pet" id="result-pet">${esc(w.pet)}</h2>
    <p class="rc-sub">${esc(tr('result.sub', { fusion: fusionName(cls.element, cls.fusion), a: elName(cls.element), b: elName(cls.fusion) }))}</p>
    ${strengthsHtml(strengths, { title: false })}
    ${skillTipHtml(cls, { passive: true, foot: lockFootHtml(tier), chargeS })}
    <button class="primary rc-ok" data-act="result-ok">${esc(tr('result.ok'))}</button>`;
}
