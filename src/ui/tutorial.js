// Tutorial view: draws what the coach (src/ux/coach.js) says. The coach owns the
// guided opening on the first run, the one-time contextual tips and their timing;
// this file owns the DOM: the bubble next to its target, the ring, the swipe hand,
// and the "How to play" sheet behind the "?" button (with Replay tutorial).
// Principles (mobile onboarding research): teach by doing, one mechanic at a
// time, minimal text that points at the thing it talks about, never pile up
// information the player doesn't need yet, let experienced players skip, and
// let anyone replay it.
// Progress is kept in localStorage; `?tutorial` in the URL resets it.
import { FIELD, GRID_TOP, laneX } from '../config.js';
import { createCoach, loadStore, saveStore, HELP } from '../ux/coach.js';

export function createTutorial(root, { stage, getRun, onPause, onReplay, onLog }) {
  const store = loadStore({ reset: new URLSearchParams(location.search).has('tutorial') });
  const coach = createCoach({ getRun, store, save: saveStore, onLog });

  const el = document.createElement('div');
  el.className = 'coach';
  el.innerHTML = `
    <div class="coach-ring"></div>
    <div class="coach-hand"><i></i></div>
    <div class="coach-bubble">
      <p class="coach-text"></p>
      <div class="coach-actions">
        <button class="coach-skip" type="button">Skip tutorial</button>
        <button class="coach-ok" type="button">Got it</button>
      </div>
      <i class="coach-arrow"></i>
    </div>`;
  root.appendChild(el);
  const ring = el.querySelector('.coach-ring');
  const hand = el.querySelector('.coach-hand');
  const bubble = el.querySelector('.coach-bubble');
  const text = el.querySelector('.coach-text');
  const okBtn = el.querySelector('.coach-ok');
  const skipBtn = el.querySelector('.coach-skip');
  const arrow = el.querySelector('.coach-arrow');
  const actions = el.querySelector('.coach-actions');

  // "How to play" sheet behind a "?" button next to restart / sound
  const helpBtn = document.createElement('button');
  helpBtn.className = 'icon-btn help-btn';
  helpBtn.setAttribute('aria-label', 'How to play');
  helpBtn.textContent = '?';
  root.querySelector('.icons')?.appendChild(helpBtn);
  const help = document.createElement('div');
  help.className = 'scrim help-scrim';
  help.setAttribute('role', 'dialog');
  help.setAttribute('aria-label', 'How to play');
  help.inert = true;
  help.innerHTML = `
    <div class="card help-card">
      <h2>How to play</h2>
      <dl>${HELP.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <div class="help-actions">
        <button class="help-replay" type="button">Replay tutorial</button>
        <button class="primary help-close" type="button">Back to the game</button>
      </div>
    </div>`;
  root.appendChild(help);

  const run = () => getRun();
  const domRect = (sel) => root.querySelector(sel)?.getBoundingClientRect() ?? null;
  const worldRect = (x0, y0, x1, y1) => {
    const a = stage.toClient(x0, y0);
    const b = stage.toClient(x1, y1);
    return { left: Math.min(a.x, b.x), top: Math.min(a.y, b.y), right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) };
  };
  const tileRect = (id) => {
    const t = run().tiles.find((x) => x.id === id);
    return t ? worldRect(t.x - 0.95, t.y + 0.95, t.x + 0.95, t.y - 0.95) : null;
  };
  function targetRect(target) {
    if (!target) return null;
    if (target === 'board') return worldRect(-4.3, GRID_TOP + 0.3, 4.3, -0.3);
    if (target === 'coins') return domRect('.coinbar');
    if (target === 'blocks') return domRect('.statusbar .castle');
    if (target === 'wave') {
      const r = domRect('.fight');
      return r && r.width ? r : null;
    }
    if (target === 'deck') return worldRect(-3.6, -0.55, 3.6, -1.55);
    if (target.tile != null) return tileRect(target.tile);
    if (target.lane != null) return worldRect(laneX(target.lane) - 0.9, FIELD.spawnY + 1.2, laneX(target.lane) + 0.9, FIELD.spawnY - 0.4);
    return null;
  }

  let current = null; // the target of the bubble on screen
  let shown = null; // key of the coach view on screen

  function show(v) {
    el.classList.add('on');
    text.textContent = v.text;
    okBtn.style.display = v.ok ? '' : 'none';
    skipBtn.style.display = v.skip ? '' : 'none';
    actions.style.display = v.ok || v.skip ? '' : 'none';
    hand.style.display = v.hand ? '' : 'none';
    el.dataset.target = typeof v.target === 'string' ? v.target : v.target ? 'point' : 'none';
    current = v.target;
    place();
  }
  function hide() {
    el.classList.remove('on');
    current = null;
  }

  // bubble next to its target (below it in the upper half of the screen, above it otherwise), arrow pointing at it
  function place() {
    const r = targetRect(current);
    const vw = innerWidth;
    const vh = innerHeight;
    const bw = Math.min(300, vw - 24);
    bubble.style.width = `${bw}px`;
    const bh = bubble.offsetHeight || 80;
    if (!r) {
      ring.style.display = 'none';
      arrow.style.display = 'none';
      bubble.style.left = `${(vw - bw) / 2}px`;
      bubble.style.top = `${vh * 0.3}px`;
      return;
    }
    ring.style.display = '';
    arrow.style.display = '';
    const pad = 6;
    ring.style.left = `${r.left - pad}px`;
    ring.style.top = `${r.top - pad}px`;
    ring.style.width = `${r.right - r.left + pad * 2}px`;
    ring.style.height = `${r.bottom - r.top + pad * 2}px`;
    const cx = (r.left + r.right) / 2;
    const below = (r.top + r.bottom) / 2 < vh * 0.5;
    let top = below ? r.bottom + 16 : r.top - bh - 16;
    top = Math.max(8, Math.min(vh - bh - 8, top));
    // a target taller than the room left (the board): sit the bubble inside its top edge instead
    if (below && r.bottom - r.top > vh * 0.3) top = Math.max(8, r.top + 12);
    const left = Math.max(12, Math.min(vw - bw - 12, cx - bw / 2));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    const inside = below && r.bottom - r.top > vh * 0.3;
    arrow.style.display = inside ? 'none' : '';
    arrow.className = `coach-arrow ${below ? 'up' : 'down'}`;
    arrow.style.left = `${Math.max(16, Math.min(bw - 16, cx - left))}px`;
    hand.style.left = `${cx}px`;
    hand.style.top = `${(r.top + r.bottom) / 2}px`;
  }

  /** Mirror the coach's view: show a new bubble, hide a finished one, follow a moving target. */
  function render() {
    const v = coach.view;
    const key = v ? v.key : null;
    if (key !== shown) {
      shown = key;
      if (v) show(v);
      else hide();
    } else if (v) place();
  }

  okBtn.addEventListener('click', () => {
    okBtn.blur();
    coach.ok();
    render();
  });
  skipBtn.addEventListener('click', () => {
    skipBtn.blur();
    coach.skipAll();
    render();
  });
  for (const b of [okBtn, skipBtn, helpBtn]) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  function openHelp(open) {
    help.classList.toggle('open', open);
    help.inert = !open;
    el.style.visibility = open ? 'hidden' : ''; // tips wait behind the sheet
    onPause?.(open);
    onLog?.(open ? 'help' : 'helpClose', {});
  }
  helpBtn.addEventListener('click', () => {
    helpBtn.blur();
    openHelp(true);
  });
  help.querySelector('.help-close').addEventListener('click', () => openHelp(false));
  help.querySelector('.help-replay').addEventListener('click', () => {
    coach.reset();
    openHelp(false);
    onReplay?.();
  });

  return {
    /** A new run: guide it if the player hasn't finished the opening yet. */
    start(r) {
      coach.start(r);
      render();
    },
    /** Feed every run event. */
    onEvent(e) {
      coach.onEvent(e);
    },
    /** A swipe that moved the board. */
    onSwipe() {
      coach.onSwipe();
      render();
    },
    /** Per frame: count tips down, keep the bubble on its (moving) target. */
    update(dt) {
      coach.update(dt);
      render();
    },
    /** A one-off tip (the retry hint, the return-visit goal). */
    note(text, target = null) {
      coach.note(text, target);
    },
    get active() {
      return coach.active;
    },
    /** Autoplay: step aside (no bubbles, no countdown hold); resume the opening when it stops. */
    setMuted(v) {
      coach.setMuted(v);
      render();
    },
  };
}
