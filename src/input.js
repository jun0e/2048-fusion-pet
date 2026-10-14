// Swipe (touch or mouse drag), tap and keyboard input for the 2048 board.
// Arrows / WASD swipe; a tap (no drag) picks a block to show its range; 1-3 pick a
// class card; F / Space / Enter send the next wave early.
const SWIPE_PX = 24;

export function createInput(el, { swipe, tap, choose, nextWave }) {
  let start = null;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false };
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!start || start.done || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    start.done = true; // one swipe per gesture, triggered as soon as it is clear
    swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });

  const end = (e, tapped) => {
    if (start && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (tapped && start && !start.done && e.pointerId === start.id) tap?.(e.clientX, e.clientY);
    start = null;
  };
  el.addEventListener('pointerup', (e) => end(e, true));
  el.addEventListener('pointercancel', (e) => end(e, false));

  const KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase?.()];
    if (dir) {
      e.preventDefault();
      swipe(dir);
    } else if (['1', '2', '3'].includes(e.key)) choose(Number(e.key) - 1);
    else if (e.key === 'f' || e.key === 'F' || e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement?.tagName === 'BUTTON') return;
      e.preventDefault();
      nextWave();
    }
  });
}
