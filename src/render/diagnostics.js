// Renderer diagnostics (the visual overhaul's performance evidence, proposal 8.3 item 7):
// frame-time percentiles from the ticker, a scene walk that counts what is drawn, and the
// texture memory the loaded sources hold. `?dev` shows the numbers in a corner overlay;
// `window.__mb.diag()` returns them for scripted probes. Reading only: it never changes the scene.
import { Graphics, Mesh, Sprite, Text, BitmapText } from 'pixi.js';

const FRAMES = 240; // about 4 s of frame times at 60 fps

/** Percentile of a numeric array (nearest rank). */
export function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

/** Count visible display objects by kind and the distinct texture sources they draw from. */
export function walkScene(root) {
  const counts = { sprites: 0, graphics: 0, meshes: 0, text: 0, containers: 0 };
  const sources = new Set();
  const visit = (o) => {
    if (!o.visible || o.alpha === 0) return;
    if (o instanceof Sprite) {
      counts.sprites++;
      if (o.texture?.source) sources.add(o.texture.source);
    } else if (o instanceof Graphics) counts.graphics++;
    else if (o instanceof Mesh) {
      counts.meshes++;
      if (o.texture?.source) sources.add(o.texture.source);
    } else if (o instanceof Text || o instanceof BitmapText) counts.text++;
    else counts.containers++;
    for (const c of o.children ?? []) visit(c);
  };
  visit(root);
  let bytes = 0;
  for (const s of sources) bytes += (s.pixelWidth ?? s.width ?? 0) * (s.pixelHeight ?? s.height ?? 0) * 4;
  return { ...counts, textures: sources.size, textureMB: +(bytes / 1048576).toFixed(1) };
}

export function createDiagnostics(app, { show = new URLSearchParams(globalThis.location?.search ?? '').has('dev') } = {}) {
  const times = new Float32Array(FRAMES);
  let n = 0;
  app.ticker.add((t) => {
    times[n % FRAMES] = t.deltaMS;
    n++;
  });

  function read() {
    const ms = Array.from(times.subarray(0, Math.min(n, FRAMES)));
    const p50 = percentile(ms, 50);
    return { frames: n, fps: p50 ? Math.round(1000 / p50) : 0, p50: +p50.toFixed(1), p95: +percentile(ms, 95).toFixed(1), ...walkScene(app.stage) };
  }

  if (show && globalThis.document) {
    const el = document.createElement('pre');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;left:4px;bottom:4px;z-index:9999;margin:0;padding:4px 6px;font:11px/1.3 ui-monospace,monospace;' +
      'color:#fffaf2;background:rgba(27,20,38,.82);border-radius:6px;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
    setInterval(() => {
      const d = read();
      el.textContent = `${d.fps} fps  p50 ${d.p50} ms  p95 ${d.p95} ms\nsprites ${d.sprites}  gfx ${d.graphics}  mesh ${d.meshes}  text ${d.text}\ntextures ${d.textures}  ≈${d.textureMB} MB`;
    }, 500);
  }
  return { read };
}
