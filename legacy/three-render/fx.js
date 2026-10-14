// Merge effects: confetti burst (one InstancedMesh) and expanding rings.
import * as THREE from 'three';
import { TIER_COLORS } from '../config.js';

const MAX_PARTICLES = 420;
const MAX_RINGS = 10;

export function createFx(scene) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const parts = [];
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _c = new THREE.Color();

  const ringGeo = new THREE.RingGeometry(0.86, 1, 48);
  const rings = [];
  for (let i = 0; i < MAX_RINGS; i++) {
    const m = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    m.visible = false;
    m.renderOrder = 3;
    scene.add(m);
    rings.push({ mesh: m, t: 1, r0: 1, r1: 2, life: 0.35 });
  }
  let ringNext = 0;

  function burst(x, y, tier, radius) {
    burstColor(x, y, TIER_COLORS[tier], Math.min(60, 14 + tier * 3), radius, tier);
    ring(x, y, TIER_COLORS[tier], radius * 0.9, radius * 2.1);
  }

  function ring(x, y, color, r0, r1, life = 0.35) {
    const r = rings[ringNext];
    ringNext = (ringNext + 1) % MAX_RINGS;
    r.t = 0;
    r.r0 = r0;
    r.r1 = r1;
    r.life = life;
    r.mesh.position.set(x, y, 0.05);
    r.mesh.material.color.set(color);
    r.mesh.visible = true;
  }

  function burstColor(x, y, color, n, radius, tier = 4) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * (4 + tier * 0.5);
      parts.push({
        x: x + Math.cos(a) * radius * 0.6,
        y: y + Math.sin(a) * radius * 0.6,
        z: (Math.random() - 0.3) * radius,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + 3,
        vz: (Math.random() - 0.2) * 3,
        life: 0,
        max: 0.5 + Math.random() * 0.5,
        size: 0.06 + Math.random() * 0.09 + tier * 0.004,
        spin: Math.random() * 10,
        color: i % 4 === 0 ? '#ffffff' : color,
      });
    }
  }

  function update(dt) {
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        parts.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.vx *= 1 - 2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = 1 - p.life / p.max;
      _m.compose(
        _p.set(p.x, p.y, p.z),
        _q.setFromEuler(_e.set(p.spin * p.life, p.spin * p.life * 0.7, 0)),
        _s.setScalar(p.size * (0.3 + 0.7 * k)),
      );
      mesh.setMatrixAt(n, _m);
      mesh.setColorAt(n, _c.set(p.color).multiplyScalar(3.2 * k + 0.6)); // HDR so sparks bloom
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    for (const r of rings) {
      if (!r.mesh.visible) continue;
      r.t += dt / r.life;
      if (r.t >= 1) {
        r.mesh.visible = false;
        continue;
      }
      const e = 1 - (1 - r.t) ** 3;
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * e);
      r.mesh.material.opacity = 0.8 * (1 - r.t);
    }
  }

  function reset() {
    parts.length = 0;
    for (const r of rings) r.mesh.visible = false;
  }

  return { burst, burstColor, ring, update, reset };
}
