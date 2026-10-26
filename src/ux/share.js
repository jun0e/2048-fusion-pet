// Share the run from the game-over card (main.js): the system share sheet, else copy the line, else
// show it to copy by hand. Inside another page's frame (the artifact viewer on the phone link) the
// share sheet is refused, and asking for it spends the tap, so the copy after it is refused too:
// there the line is copied straight away, inside the tap. Apart from main.js so a test holds the
// order to that.
import { num, tr } from '../i18n/index.js';

/** The line to share, with the game's address when it has one a friend can open. */
export function shareLine({ wave, score }, { origin = '', pathname = '', protocol = '', framed = false } = {}) {
  const text = tr('share.line', { wave, score: num(score) });
  // a frame's own address (the viewer's sandbox) and a file on disk are no link to send
  const url = !framed && /^https?:$/.test(protocol) ? `${origin}${pathname}` : '';
  return { text, url, line: url ? `${text} ${url}` : text };
}

/** True when the game runs inside another page's frame (the artifact viewer). */
export function inFrame(win = globalThis) {
  try {
    return win.top !== win.self;
  } catch {
    return true;
  }
}

/**
 * Whether to open the system share sheet: the browser has one, and the page is not in a frame that
 * refuses it. A frame may allow it (Chrome says so through the permissions policy); WebKit cannot
 * say, so a frame there counts as refusing.
 */
export function canShareSheet({ share, framed, policy }) {
  if (typeof share !== 'function') return false;
  return !framed || policy?.allowsFeature?.('web-share') === true;
}

/** The old copy command, for a page without the Clipboard API (a plain-http address). */
export function copyCommand(line, doc = document) {
  const area = Object.assign(doc.createElement('textarea'), { value: line, readOnly: true });
  // selectable, or WebKit's copy succeeds with nothing in it (the page turns selection off)
  area.style.cssText = 'position:fixed;opacity:0;pointer-events:none;-webkit-user-select:text;user-select:text';
  doc.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, area.value.length); // iOS Safari: select() alone selects nothing
  let copied = false;
  try {
    copied = doc.execCommand('copy');
  } catch {}
  area.remove();
  return copied;
}

/**
 * Share the run ({ text, url, line } from shareLine): 'shared', 'closed' (the player closed the
 * sheet), 'copied', or 'shown' (nothing could copy: the caller shows the line). Where the sheet is
 * skipped, the copy is asked for first thing, while the tap still counts: a browser lets a page
 * write the clipboard only inside a tap.
 */
export async function shareRun({ text, url, line }, { nav = globalThis.navigator, doc = globalThis.document, framed = inFrame() } = {}) {
  if (canShareSheet({ share: nav.share, framed, policy: doc.featurePolicy })) {
    try {
      await nav.share({ title: '2048 Fusion Pet', text, ...(url && { url }) });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'closed';
    }
  }
  try {
    await nav.clipboard.writeText(line);
    return 'copied';
  } catch {
    return copyCommand(line, doc) ? 'copied' : 'shown';
  }
}
