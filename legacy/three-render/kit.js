// Primitive kit: merge simple three.js shapes into ONE BufferGeometry with
// baked per-vertex colours (and an optional bottom-darkening gradient).
// One merged mesh per object keeps draw calls low and needs no textures.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class Kit {
  parts = [];

  /**
   * @param geo   any BufferGeometry (consumed: cloned, transformed, coloured)
   * @param color hex string or THREE.Color
   * @param t     {x,y,z, rx,ry,rz, s | sx,sy,sz}
   * @param shade 0..1 how much darker the bottom of this part is than its top
   */
  add(geo, color, t = {}, shade = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const s = t.s ?? 1;
    _m.compose(
      _p.set(t.x ?? 0, t.y ?? 0, t.z ?? 0),
      _q.setFromEuler(_e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0)),
      _s.set((t.sx ?? 1) * s, (t.sy ?? 1) * s, (t.sz ?? 1) * s),
    );
    g.applyMatrix4(_m);

    const pos = g.attributes.position;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      minY = Math.min(minY, pos.getY(i));
      maxY = Math.max(maxY, pos.getY(i));
    }
    _c.set(color);
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = shade > 0 && maxY > minY ? 1 - shade * (1 - (pos.getY(i) - minY) / (maxY - minY)) : 1;
      col[i * 3] = _c.r * k;
      col[i * 3 + 1] = _c.g * k;
      col[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  box(w, h, d, color, t, shade) {
    return this.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), color, t, shade);
  }

  cyl(rTop, rBottom, h, seg, color, t, shade) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(0, h / 2, 0), color, t, shade);
  }

  cone(r, h, seg, color, t, shade) {
    return this.add(new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0), color, t, shade);
  }

  sphere(r, ws, hs, color, t, shade) {
    return this.add(new THREE.SphereGeometry(r, ws, hs), color, t, shade);
  }

  ico(r, detail, color, t, shade) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, t, shade);
  }

  build() {
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }
}

// Deterministic hash → [0,1) for scattering decoration.
export function hash01(a, b = 0, c = 0) {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 1, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
