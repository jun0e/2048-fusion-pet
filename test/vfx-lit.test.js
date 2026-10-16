// The generated attack sprites on disk against the light table the audit counts with
// (src/art/attack-vfx.js PIECE_LIT): each sprite is measured as the game makes it ready
// (src/render/textures.js readyGenerated: levelled when slanted, trimmed, its pixels over 10%
// alpha counted), so a re-made sprite that is fuller than its booking fails here instead of
// under-booking in the game. Long pieces must also fit their box (VFX_ASPECT). Skipped when the
// generated sprites are not on disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PIECE_LIT, VFX_ASPECT, VFX_IDS } from '../src/art/attack-vfx.js';
import { POINTS_RIGHT } from '../src/render/textures.js';

const ROOT = new URL('../public/assets/', import.meta.url);

/** An RGBA 8-bit, non-interlaced PNG (what tools/post.py writes) → { w, h, data }. */
function decodePng(buf) {
  assert.equal(buf.readUInt32BE(0), 0x89504e47, 'a PNG');
  let off = 8;
  let w = 0;
  let h = 0;
  let form = '';
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const kind = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      form = `${data[8]}/${data[9]}/${data[12]}`; // bit depth / colour type / interlace
    } else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    off += 12 + len;
  }
  assert.equal(form, '8/6/0', 'RGBA, 8 bits, not interlaced');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, data: out };
}

/** A sprite as readyGenerated makes it: levelled when it should point right but slants, then trimmed. → { share, w, h } */
function measure(piece, { w, h, data }) {
  let alpha = (x, y) => data[(y * w + x) * 4 + 3];
  let W = w;
  let H = h;
  if (POINTS_RIGHT.has(piece)) {
    let n = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha(x, y) > 25) (n += 1), (sx += x), (sy += y), (sxx += x * x), (syy += y * y), (sxy += x * y);
    const mx = sx / n;
    const my = sy / n;
    const cxx = sxx / n - mx * mx;
    const cyy = syy / n - my * my;
    const cxy = sxy / n - mx * my;
    const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const spread = Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy);
    if (Math.abs(th) > 0.2 && ((cxx + cyy) / 2 + spread) / Math.max(1e-6, (cxx + cyy) / 2 - spread) > 2) {
      // turned level about its centre, sampled as a canvas draws it (bilinear)
      W = Math.ceil(Math.abs(w * Math.cos(th)) + Math.abs(h * Math.sin(th)));
      H = Math.ceil(Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th)));
      const src = alpha;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src(x, y));
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      alpha = (X, Y) => {
        const dx = X + 0.5 - W / 2;
        const dy = Y + 0.5 - H / 2;
        const px = cos * dx - sin * dy + w / 2 - 0.5;
        const py = sin * dx + cos * dy + h / 2 - 0.5;
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const fx = px - x0;
        const fy = py - y0;
        return at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
      };
    }
  }
  let on = 0;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(x, y) <= 25) continue;
      on += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { share: on / ((x1 - x0 + 1) * (y1 - y0 + 1)), w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const manifest = existsSync(new URL('manifest.json', ROOT)) ? JSON.parse(readFileSync(new URL('manifest.json', ROOT), 'utf8')).files ?? {} : {};
const onDisk = VFX_IDS.filter((id) => manifest[id] && existsSync(new URL(manifest[id], ROOT)));

test('every generated attack sprite lights no more of its box than the light table books', { skip: onDisk.length ? false : 'no generated vfx.* sprites on disk' }, () => {
  const over = [];
  for (const id of onDisk) {
    const piece = id.slice(4);
    const m = measure(piece, decodePng(readFileSync(new URL(manifest[id], ROOT))));
    assert.ok(m.share > 0.05 && m.share <= 1, `${id}: a shape (${m.share})`);
    // the table holds the measured share rounded up to 0.01; 0.005 more allows for how a canvas samples a turned sprite
    if (m.share > PIECE_LIT[piece] + 0.005) over.push(`${piece} measures ${m.share.toFixed(3)} > PIECE_LIT ${PIECE_LIT[piece]}`);
  }
  assert.deepEqual(over, [], 'update PIECE_LIT (src/art/attack-vfx.js) from the sprites, re-run node tools/flash-audit.mjs and update docs/ux/photosafe.md');
});

test('the long pieces are long and thin enough to reach their length inside their box', { skip: onDisk.length ? false : 'no generated vfx.* sprites on disk' }, () => {
  for (const [piece, cap] of [['earth.crack', VFX_ASPECT.crack], ['nature.tendril', VFX_ASPECT.tendril]]) {
    const id = `vfx.${piece}`;
    if (!onDisk.includes(id)) continue;
    const m = measure(piece, decodePng(readFileSync(new URL(manifest[id], ROOT))));
    const aspect = (m.h + 4) / (m.w + 4); // trimmed, with the 2 px the game pads it by
    assert.ok(aspect <= cap, `${piece}: ${m.w} × ${m.h} (${aspect.toFixed(3)} tall for its length; the box allows ${cap})`);
    assert.ok(m.w / m.h >= 3, `${piece} is a long piece (${(m.w / m.h).toFixed(1)}:1)`);
  }
});
