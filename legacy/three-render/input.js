// Pointer + keyboard input. Mouse: hover aims, click drops. Touch: drag aims,
// release drops. Keyboard: ←/→ (or A/D) aim, Space/Enter drop.
export function createInput(canvas, stage, { aim, drop, nudge }) {
  let pressed = false;

  const toBoard = (e) => stage.screenToBoard(e.clientX, e.clientY);

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pressed = true;
    canvas.setPointerCapture(e.pointerId);
    const p = toBoard(e);
    if (p) aim(p.x);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pressed && e.pointerType !== 'mouse') return;
    const p = toBoard(e);
    if (p) aim(p.x);
  });

  const release = (e, doDrop) => {
    if (!pressed) return;
    pressed = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (doDrop) drop();
  };
  canvas.addEventListener('pointerup', (e) => release(e, true));
  canvas.addEventListener('pointercancel', (e) => release(e, false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') nudge(-0.3);
    else if (e.key === 'ArrowRight' || e.key === 'd') nudge(0.3);
    else if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement?.tagName === 'BUTTON') return;
      e.preventDefault();
      drop();
    }
  });
}
