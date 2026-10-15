// Pixi application, world→screen layout and render layers.
// World units: x right, y up (the sim's coordinates). Screen: pixels, y down.
// U = pixels per world unit, recomputed on resize so the deck row, the board, the
// castle wall and the four lanes below it fit between the DOM HUD bars (their
// heights come from setInsets, measured from the HUD).
import { Application, Container, Graphics } from 'pixi.js';
// no runtime code generation: the game also runs under a strict Content-Security-Policy
// (no 'unsafe-eval'), e.g. as a claude.ai artifact
import 'pixi.js/unsafe-eval';
import { createFlashGuard, washAlpha, washLevel } from '../ux/photosafe.js';

export const WORLD = { minX: -4.75, maxX: 4.75, minY: -1.7, maxY: 18.15 }; // deck row + board + lanes above (no wall)
const LAYERS = ['bg', 'path', 'board', 'tiles', 'enemies', 'shots', 'fx', 'numbers', 'overlay'];

export async function createStage(el, { insets = { top: 136, bottom: 76 } } = {}) {
  const app = new Application();
  await app.init({
    resizeTo: el,
    background: '#1c2547',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  app.canvas.style.display = 'block';
  app.canvas.style.touchAction = 'none';
  el.appendChild(app.canvas);

  const root = new Container();
  app.stage.addChild(root);
  const layers = {};
  for (const name of LAYERS) {
    layers[name] = new Container();
    root.addChild(layers[name]);
  }
  layers.numbers.eventMode = 'none';

  const view = { U: 40, ox: 0, oy: 0, w: 1, h: 1 };
  const listeners = [];

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const availH = Math.max(100, h - insets.top - insets.bottom);
    view.U = Math.min(w / (WORLD.maxX - WORLD.minX), availH / (WORLD.maxY - WORLD.minY));
    view.ox = w / 2 - ((WORLD.minX + WORLD.maxX) / 2) * view.U;
    view.oy = insets.top + availH / 2 + ((WORLD.minY + WORLD.maxY) / 2) * view.U;
    view.w = w;
    view.h = h;
    for (const fn of listeners) fn(view);
  }

  const sx = (x) => view.ox + x * view.U;
  const sy = (y) => view.oy - y * view.U;

  // screen shake + full-screen wash (both off when the player reduces motion). A wash is
  // photosafe (src/ux/photosafe.js): below the flash thresholds, faded in and out, and one at
  // most per second of real time; the HUD's red edge pulse takes from the same budget.
  let reduced = false;
  const shake = { amp: 0, t: 0 };
  const flashG = new Graphics();
  layers.overlay.addChild(flashG);
  const flash = { peak: 0, t: 0, color: 0xffffff };
  const guard = createFlashGuard();
  let clock = 0; // real seconds (frame time), whatever the game speed

  function update(dt) {
    clock += dt;
    if (shake.amp > 0.2) {
      shake.t += dt * 60;
      shake.amp *= Math.exp(-dt * 10);
      root.position.set(Math.sin(shake.t * 1.9) * shake.amp, Math.cos(shake.t * 2.3) * shake.amp * 0.7);
    } else if (shake.amp) {
      shake.amp = 0;
      root.position.set(0, 0);
    }
    if (flash.peak) {
      flash.t += dt;
      const a = washLevel(flash.peak, flash.t);
      if (a > 0) flashG.clear().rect(-50, -50, view.w + 100, view.h + 100).fill({ color: flash.color, alpha: a });
      else {
        flash.peak = 0;
        flashG.clear();
      }
    }
  }

  app.renderer.on('resize', layout);
  layout();

  return {
    app,
    layers,
    view,
    sx,
    sy,
    /** world point → client (DOM) coordinates, for HUD popups */
    toClient(x, y) {
      const r = app.canvas.getBoundingClientRect();
      return { x: r.left + sx(x), y: r.top + sy(y) };
    },
    /** client (DOM) coordinates → world point */
    toWorld(cx, cy) {
      const r = app.canvas.getBoundingClientRect();
      return { x: (cx - r.left - view.ox) / view.U, y: (view.oy - (cy - r.top)) / view.U };
    },
    /** client coordinates → canvas pixel coordinates */
    canvasRect: () => app.canvas.getBoundingClientRect(),
    /** The Reduce motion setting: no screen shake, no full-screen wash, no flash dots. */
    setReducedMotion(v) {
      reduced = !!v;
      if (reduced) {
        flash.peak = 0;
        flashG.clear();
      }
    },
    get reduced() {
      return reduced;
    },
    /** May a large flash (the HUD's red edge pulse) start now? Takes the shared one-a-second budget. */
    takeFlash() {
      return !reduced && guard.take(clock);
    },
    /** The wash on screen now (0 = none), for checks. */
    get washLevel() {
      return flash.peak ? washLevel(flash.peak, flash.t) : 0;
    },
    /** The HUD bars' bands in px ({ top, bottom }): the world fills the space between them. */
    setInsets(next) {
      if (next.top === insets.top && next.bottom === insets.bottom) return;
      insets = { top: next.top, bottom: next.bottom };
      layout();
    },
    onResize(fn) {
      listeners.push(fn);
      fn(view);
    },
    shake(px) {
      if (reduced) return;
      shake.amp = Math.min(22, shake.amp + px);
    },
    /** A soft full-screen wash: `alpha` is capped below the flash thresholds for its colour; dropped within a second of the last large flash. */
    flash(color, alpha = 1) {
      if (reduced || !guard.take(clock)) return;
      flash.color = color;
      flash.peak = washAlpha(color, alpha);
      flash.t = 0;
    },
    update,
  };
}
