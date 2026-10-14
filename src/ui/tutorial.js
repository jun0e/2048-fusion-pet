// Tutorial: a short guided opening on the first run, then one-time contextual
// tips at the moment each mechanic first shows up, plus a "How to play" sheet.
// Principles (mobile onboarding research): teach by doing, one mechanic at a
// time, minimal text that points at the thing it talks about, never pile up
// information the player doesn't need yet, let experienced players skip, and
// let anyone replay it.
//
// - Guided opening (first run only; the opening countdown waits): swipe (with a
//   finger animation over the board) → swipe cost → blocks are your defense →
//   start the wave.
// - Tips (once each, non-blocking, auto-dismiss): first merge, lanes, a block
//   attacked, a block lost, kill coins, out of coins, the break, colour override,
//   awakening (upgrade), new die (unlock), fusion, ultimate, boss, 2048 milestone.
// - "?" button: How to play (pauses the game) with Replay tutorial.
// Progress is kept in localStorage; `?tutorial` in the URL resets it.
import { FIELD, GRID_TOP, laneX } from '../config.js';

const KEY = 'siege:tutorial';
const TIP_SECONDS = 5.5;

const GUIDED = [
  { id: 'swipe', text: 'Swipe to slide every block. Equal blocks merge. At 16 a block becomes a turret.', target: 'board', hand: true, skip: true, doneOn: 'swipe' },
  { id: 'cost', text: 'Each swipe costs coins and adds a new block.', target: 'coins', ok: true, doneOn: 'swipe' },
  { id: 'defend', text: 'Enemies attack your blocks, and you lose when they are all gone. Only blocks of 16+ shoot back.', target: 'blocks', ok: true },
  { id: 'start', text: 'Make a few more merges, then start the first wave.', target: 'wave', doneOn: 'waveStart', release: true },
];

const TIPS = {
  merge: 'Merged! A bigger block is a stronger turret.',
  lanes: 'Enemies come down the glowing lanes. Each block shoots along its own column.',
  attacked: 'Enemies on the board attack your blocks. Their hidden health refills every wave.',
  lost: 'A destroyed block is gone for good. Keep spares on the board.',
  coins: 'Kills drop coins. Spend them on swipes.',
  broke: 'Out of coins! Kill enemies to earn more.',
  break: 'Break time: swipe to grow, then press Wave now.',
  colour: 'When two elemental blocks merge, the one that slides in keeps its element.',
  awaken: '16! The block rolled a random element from your deck and starts shooting. Its border fills with each merge: full means fusion at 256.',
  unlock: 'New die: blocks reaching 16 can now roll it.',
  fusion: 'Fusion! Two elements became one unique element with both effects. The border now counts to 4096.',
  ultimate: 'Ultimate! A signature attack that reaches the whole field.',
  boss: 'Boss next, from the red portal. Kill it to promote your biggest block.',
  milestone: '2048! Keep going: 4096 makes an ultimate.',
};

const HELP = [
  ['Swipe', 'Every block slides; equal neighbours merge. Each swipe costs coins and adds a block.'],
  ['Turrets', 'Blocks of 16 or more shoot enemies along their column; smaller ones only soak up hits. Tap a block to see its range.'],
  ['Siege', 'Enemies on the board attack your blocks. Hidden health refills each wave; destroyed blocks are gone. No blocks left = game over.'],
  ['Elements', 'A block reaching 16 rolls a random element from your deck. When two elemental blocks merge, the one that slides in keeps its element.'],
  ['Upgrades', 'The 4-piece border fills one piece per merge. Full at 256: fusion, a unique element with both effects (Fire + Ice = Frostnova). Full again at 4096: ultimate.'],
  ['Unlocks', 'You start with 2 dice. Your first 64, 256 and 512 each add a new die to the deck.'],
  ['Coins', 'Kills and cleared waves pay coins. Three merges in one swipe refund it.'],
  ['Bosses', 'Every 5th wave, from the red portal. Killing one promotes your biggest block.'],
];

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { guided: !!v.guided, seen: new Set(v.seen ?? []) };
  } catch {
    return { guided: false, seen: new Set() };
  }
}

export function createTutorial(root, { stage, getRun, onPause, onReplay }) {
  let store = load();
  if (new URLSearchParams(location.search).has('tutorial')) store = { guided: false, seen: new Set() };
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ guided: store.guided, seen: [...store.seen] }));
    } catch {}
  };

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

  let guided = -1; // index into GUIDED, -1 when not guiding
  let muted = false; // autoplay is on
  let tip = null; // { id, target, t }
  const queue = [];
  let gap = 0;

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

  function show(msg, target, { ok = false, skip = false, hand: withHand = false } = {}) {
    el.classList.add('on');
    text.textContent = msg;
    okBtn.style.display = ok ? '' : 'none';
    skipBtn.style.display = skip ? '' : 'none';
    actions.style.display = ok || skip ? '' : 'none';
    hand.style.display = withHand ? '' : 'none';
    el.dataset.target = typeof target === 'string' ? target : target ? 'point' : 'none';
    current = target;
    place();
  }
  function hide() {
    el.classList.remove('on');
    current = null;
  }
  let current = null;

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

  function guide(i) {
    guided = i;
    if (i >= GUIDED.length) {
      guided = -1;
      store.guided = true;
      save();
      hide();
      return;
    }
    const g = GUIDED[i];
    if (g.release) run().setHold?.(false);
    show(g.text, g.target, { ok: g.ok, skip: g.skip, hand: g.hand });
  }

  function advance(trigger) {
    if (guided < 0) return;
    const g = GUIDED[guided];
    if (trigger === 'ok' || trigger === g.doneOn) guide(guided + 1);
  }

  /** Queue a tip the first time something happens. */
  function offer(id, target = null) {
    if (store.seen.has(id) || (tip && tip.id === id) || queue.some((q) => q.id === id)) return;
    store.seen.add(id);
    save();
    queue.push({ id, target });
    if (queue.length > 3) queue.shift(); // too many at once: keep the newest
  }

  function skipAll() {
    store.guided = true;
    for (const id of Object.keys(TIPS)) store.seen.add(id);
    save();
    guided = -1;
    tip = null;
    queue.length = 0;
    run().setHold?.(false);
    hide();
  }

  okBtn.addEventListener('click', () => {
    okBtn.blur();
    if (guided >= 0) advance('ok');
    else if (tip) {
      tip = null;
      gap = 0.4;
      hide();
    }
  });
  skipBtn.addEventListener('click', () => {
    skipBtn.blur();
    skipAll();
  });
  for (const b of [okBtn, skipBtn, helpBtn]) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  function openHelp(open) {
    help.classList.toggle('open', open);
    help.inert = !open;
    el.style.visibility = open ? 'hidden' : ''; // tips wait behind the sheet
    onPause?.(open);
  }
  helpBtn.addEventListener('click', () => {
    helpBtn.blur();
    openHelp(true);
  });
  help.querySelector('.help-close').addEventListener('click', () => openHelp(false));
  help.querySelector('.help-replay').addEventListener('click', () => {
    store = { guided: false, seen: new Set() };
    save();
    openHelp(false);
    onReplay?.();
  });

  return {
    /** A new run: guide it if the player hasn't finished the opening yet. */
    start(r) {
      tip = null;
      queue.length = 0;
      hide();
      if (!store.guided) {
        r.setHold?.(true);
        guide(0);
      } else {
        r.setHold?.(false);
        guided = -1;
      }
    },
    /** Feed every run event. */
    onEvent(e) {
      if (guided >= 0 && e.type === 'waveStart') advance('waveStart');
      switch (e.type) {
        case 'merge':
          if (guided < 0) offer('merge', { tile: e.id });
          else if (!store.seen.has('merge')) {
            store.seen.add('merge'); // the guided swipe already taught it
            save();
          }
          break;
        case 'waveStart':
          offer('lanes', { lane: e.lanes?.[0] ?? 0 });
          break;
        case 'tileHit':
          offer('attacked', { tile: e.id });
          break;
        case 'remove':
          if (e.reason === 'destroyed') offer('lost', 'blocks');
          break;
        case 'coins':
          if (e.reason === 'kill') offer('coins', 'coins');
          break;
        case 'noCoins':
          offer('broke', 'coins');
          break;
        case 'waveIncoming':
          if (e.boss) offer('boss', { lane: run().wave.bossLane ?? e.lanes?.[0] ?? 0 });
          offer('break', 'wave');
          break;
        case 'override':
          offer('colour', { tile: e.tileId });
          break;
        case 'classed':
          offer(e.stage === 1 ? 'awaken' : e.stage === 2 ? 'fusion' : 'ultimate', { tile: e.tileId });
          break;
        case 'dieGained':
          offer('unlock', 'deck');
          break;
        case 'milestone':
          offer('milestone', 'board');
          break;
      }
    },
    /** A swipe that moved the board. */
    onSwipe() {
      advance('swipe');
    },
    /** Per frame: keep the bubble on its (moving) target, rotate tips. */
    update(dt) {
      if (muted) return;
      if (guided >= 0) {
        place();
        return;
      }
      if (tip) {
        tip.t -= dt;
        if (tip.t <= 0 || (tip.target?.tile != null && !targetRect(tip.target))) {
          tip = null;
          gap = 0.6;
          hide();
        } else place();
        return;
      }
      gap -= dt;
      if (gap > 0 || !queue.length || run().pendingChoice) return;
      const next = queue.shift();
      tip = { ...next, t: TIP_SECONDS };
      show(TIPS[next.id], next.target, { ok: true });
    },
    get active() {
      return guided >= 0 && !muted;
    },
    /** Autoplay: step aside (no bubbles, no countdown hold); resume the opening when it stops. */
    setMuted(v) {
      muted = v;
      if (muted) {
        hide();
        run().setHold?.(false);
      } else if (guided >= 0) guide(guided);
    },
  };
}
