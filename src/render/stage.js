// Pixi application, world→screen layout and render layers.
// World units: x right, y up (the sim's coordinates). Screen: pixels, y down.
// U = pixels per world unit, recomputed on resize so the deck row, the board, the
// castle wall and the four lanes below it fit between the DOM HUD bars (their
// heights come from setInsets, measured from the HUD).
import { Application, Container, Graphics } from 'pixi.js';

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

  // screen shake + full-screen flash (both off when the player reduces motion)
  let reduced = false;
  const shake = { amp: 0, t: 0 };
  const flashG = new Graphics();
  layers.overlay.addChild(flashG);
  const flash = { a: 0, color: 0xffffff };

  function update(dt) {
    if (shake.amp > 0.2) {
      shake.t += dt * 60;
      shake.amp *= Math.exp(-dt * 10);
      root.position.set(Math.sin(shake.t * 1.9) * shake.amp, Math.cos(shake.t * 2.3) * shake.amp * 0.7);
    } else if (shake.amp) {
      shake.amp = 0;
      root.position.set(0, 0);
    }
    if (flash.a > 0.01) {
      flash.a *= Math.exp(-dt * 5);
      flashG.clear().rect(-50, -50, view.w + 100, view.h + 100).fill({ color: flash.color, alpha: flash.a });
    } else if (flash.a) {
      flash.a = 0;
      flashG.clear();
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
    /** The Reduce motion setting: no screen shake, no full-screen flash. */
    setReducedMotion(v) {
      reduced = !!v;
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
    flash(color, alpha = 0.35) {
      if (reduced) return;
      flash.color = color;
      flash.a = Math.max(flash.a, alpha);
    },
    update,
  };
}
