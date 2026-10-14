// Projectiles (one InstancedMesh), lightning arcs and strikes (pooled line
// segments that fade), coloured by the firing ball's class.
import * as THREE from 'three';

const MAX_SHOTS = 300;
const MAX_ARCS = 24;

export function createShotView(scene) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_SHOTS);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SHOTS * 3), 3);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  const _m = new THREE.Matrix4();
  const _c = new THREE.Color();
  const pebble = new THREE.Color('#fff6e0');

  // arcs: each a small polyline (up to 8 points) drawn as LineSegments
  const arcs = [];
  for (let i = 0; i < MAX_ARCS; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3 * 2), 3));
    const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ transparent: true, toneMapped: false }));
    line.visible = false;
    line.frustumCulled = false;
    line.renderOrder = 6;
    scene.add(line);
    arcs.push({ line, t: 1, life: 0.18 });
  }
  let arcNext = 0;

  function arc(points, color, life = 0.18) {
    const a = arcs[arcNext];
    arcNext = (arcNext + 1) % MAX_ARCS;
    const pos = a.line.geometry.attributes.position;
    let n = 0;
    for (let i = 0; i + 1 < points.length && n < 15; i++) {
      // jagged: insert a jittered midpoint between each pair
      const p = points[i];
      const q = points[i + 1];
      const mx = (p.x + q.x) / 2 + (Math.random() - 0.5) * 0.5;
      const my = (p.y + q.y) / 2 + (Math.random() - 0.5) * 0.5;
      pos.setXYZ(n * 2, p.x, p.y, 0.6);
      pos.setXYZ(n * 2 + 1, mx, my, 0.6);
      n++;
      pos.setXYZ(n * 2, mx, my, 0.6);
      pos.setXYZ(n * 2 + 1, q.x, q.y, 0.6);
      n++;
    }
    a.line.geometry.setDrawRange(0, n * 2);
    pos.needsUpdate = true;
    a.line.material.color.set(color).multiplyScalar(2.2);
    a.line.visible = true;
    a.t = 0;
    a.life = life;
  }

  function sync(shots, dt) {
    let n = 0;
    for (const s of shots) {
      if (n >= MAX_SHOTS) break;
      const size = 0.1 + Math.min(0.18, s.tier * 0.012);
      _m.makeScale(size, size, size).setPosition(s.x, s.y, 0.5);
      mesh.setMatrixAt(n, _m);
      const cols = s.prof.colors;
      if (s.prof.kinds.length === 1 && s.prof.kinds[0] === 'physical' && !s.prof.splash && !s.prof.pierce) _c.copy(pebble);
      else _c.set(cols[(s.id + Math.floor(performance.now() / 90)) % cols.length]);
      mesh.setColorAt(n, _c.multiplyScalar(2.4));
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    for (const a of arcs) {
      if (!a.line.visible) continue;
      a.t += dt / a.life;
      if (a.t >= 1) a.line.visible = false;
      else a.line.material.opacity = 1 - a.t;
    }
  }

  function reset() {
    for (const a of arcs) a.line.visible = false;
  }

  return { sync, arc, reset };
}
