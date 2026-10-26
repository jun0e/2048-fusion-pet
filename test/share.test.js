// Share from the game-over card (src/ux/share.js): the share sheet where the page may open it; in a
// frame that refuses it (the artifact viewer on the phone link) the copy comes first, inside the tap;
// and when nothing can copy, the line is shown to copy by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canShareSheet, inFrame, shareLine, shareRun } from '../src/ux/share.js';

const RUN = { wave: 7, score: 12345 };
const LINE = shareLine(RUN, { origin: 'https://example.com', pathname: '/siege/', protocol: 'https:' });

/** A stand-in browser: records what was asked, in order; `share` and `copy` say how each answers. */
function browser({ share = 'ok', copy = 'ok', command = false, policy } = {}) {
  const calls = [];
  const answer = (how) => {
    if (how === 'ok') return Promise.resolve();
    const err = new Error(how);
    err.name = how;
    return Promise.reject(err);
  };
  const nav = {
    share: share && ((data) => (calls.push(['share', data]), answer(share))),
    clipboard: copy && { writeText: (t) => (calls.push(['copy', t]), answer(copy)) },
  };
  const area = { style: {}, select() {}, setSelectionRange() {}, remove() {} };
  const doc = {
    featurePolicy: policy,
    createElement: () => area,
    body: { appendChild: () => {} },
    execCommand: () => (calls.push(['command']), command),
  };
  return { nav, doc, calls };
}

test('the line: the score in words, and the address only where a friend can open it', () => {
  assert.equal(LINE.text, 'I held the siege to wave 7 in 2048 Fusion Pet (12,345 points). Can you beat it?', 'the game in English, as outside a browser');
  assert.equal(LINE.url, 'https://example.com/siege/');
  assert.equal(LINE.line, `${LINE.text} https://example.com/siege/`);
  // the viewer's sandbox and a file on disk are no link to send
  assert.equal(shareLine(RUN, { origin: 'https://x.sandbox', pathname: '/', protocol: 'https:', framed: true }).url, '');
  assert.equal(shareLine(RUN, { origin: 'null', pathname: '/siege.html', protocol: 'file:' }).line, LINE.text);
});

test('a page of its own opens the share sheet, and nothing else', async () => {
  const b = browser();
  assert.equal(await shareRun(LINE, { ...b, framed: false }), 'shared');
  assert.deepEqual(b.calls, [['share', { title: '2048 Fusion Pet', text: LINE.text, url: LINE.url }]]);
});

test('closing the sheet is an answer: no copy after it', async () => {
  const b = browser({ share: 'AbortError' });
  assert.equal(await shareRun(LINE, { ...b, framed: false }), 'closed');
  assert.deepEqual(b.calls.map((c) => c[0]), ['share']);
});

test('a refused sheet falls back to the copy', async () => {
  const b = browser({ share: 'NotAllowedError' });
  assert.equal(await shareRun(LINE, { ...b, framed: false }), 'copied');
  assert.deepEqual(b.calls.map((c) => c[0]), ['share', 'copy']);
});

test('in a frame (the artifact viewer) the copy is asked for at once, inside the tap, and the sheet never', async () => {
  const b = browser();
  const done = shareRun(LINE, { ...b, framed: true });
  // before anything is awaited: still inside the tap's handler
  assert.deepEqual(b.calls, [['copy', LINE.line]]);
  assert.equal(await done, 'copied');
});

test('a frame that allows the share sheet (Chrome says so) gets it', async () => {
  const b = browser({ policy: { allowsFeature: (f) => f === 'web-share' } });
  assert.equal(await shareRun(LINE, { ...b, framed: true }), 'shared');
  assert.equal(canShareSheet({ share: () => {}, framed: true, policy: { allowsFeature: () => false } }), false);
  assert.equal(canShareSheet({ share: undefined, framed: false }), false);
});

test('no Clipboard API: the old copy command; nothing that copies: the line is shown', async () => {
  const old = browser({ share: null, copy: null, command: true });
  assert.equal(await shareRun(LINE, { ...old, framed: false }), 'copied');
  assert.deepEqual(old.calls.map((c) => c[0]), ['command']);
  const none = browser({ copy: 'NotAllowedError', command: false });
  assert.equal(await shareRun(LINE, { ...none, framed: true }), 'shown');
  assert.deepEqual(none.calls.map((c) => c[0]), ['copy', 'command']);
});

test('inFrame: a page is framed when its top window is another one', () => {
  const self = {};
  assert.equal(inFrame({ top: self, self }), false);
  assert.equal(inFrame({ top: {}, self }), true);
  const guarded = {
    self,
    get top() {
      throw new Error('blocked');
    },
  };
  assert.equal(inFrame(guarded), true);
});

test('the line shown to copy by hand can be selected and copied: the page turns both off for the game', () => {
  const css = readFileSync(new URL('../src/ui/hud.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.share-line {'), css.indexOf('}', css.indexOf('.share-line {')));
  for (const d of ['-webkit-user-select: text', 'user-select: text', '-webkit-touch-callout: default']) assert.ok(rule.includes(d), d);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /contextmenu', \(e\) => e\.target\.closest\?\.\('\.share-line'\)/, 'its long-press menu is let through');
});
