// 2D circle physics using verlet integration with substeps.
//
// Contacts are solved in two parts so piles stay calm:
//   1. positional projection — overlap is pushed apart and the previous
//      position moves with it, so the correction itself adds NO velocity
//      (plain verlet would turn every correction into a launch);
//   2. velocity projection — approaching normal velocity is removed (with a
//      little restitution) and some tangential velocity is damped (friction).
//
// Circles never rotate physically; `angle` is a rolling estimate for rendering.
// Pure module: no DOM, no three.js, deterministic for a given call sequence.

export function createWorld(opts) {
  const {
    halfWidth,
    height,
    dt: baseDt = 1 / 60,
    substeps = 8,
    gravity = -30,
    airDamping = 0.9995,
    restitution = 0.2,
    wallFriction = 0.1,
    ballFriction = 0.04,
    maxSpeed = 40, // units/s safety cap
    bounceThreshold = 1.5, // units/s; slower impacts don't bounce (kills resting jitter)
  } = opts;

  const bodies = [];
  let nextId = 1;
  const h = baseDt / substeps; // velocities are stored as displacement per substep
  const vCap = maxSpeed * h;
  const bounceMin = bounceThreshold * h;
  const bounce = (approach) => (approach > bounceMin ? restitution : 0);

  function add({ x, y, r, mass = r * r, vx = 0, vy = 0, data = {} }) {
    const body = {
      id: nextId++,
      x,
      y,
      px: x - vx * h,
      py: y - vy * h,
      r,
      mass,
      angle: 0,
      impact: 0, // strongest approach speed this step (units/s), for squash/sfx
      touching: false,
      sx: x, // position at the start of the last step
      sy: y,
      ...data,
    };
    bodies.push(body);
    return body;
  }

  function remove(body) {
    const i = bodies.indexOf(body);
    if (i >= 0) bodies.splice(i, 1);
  }

  function integrate() {
    const g = gravity * h * h;
    for (const b of bodies) {
      let vx = (b.x - b.px) * airDamping;
      let vy = (b.y - b.py) * airDamping + g;
      const sp = Math.hypot(vx, vy);
      if (sp > vCap) {
        vx *= vCap / sp;
        vy *= vCap / sp;
      }
      b.px = b.x;
      b.py = b.y;
      b.x += vx;
      b.y += vy;
    }
  }

  function noteImpact(b, disp) {
    b.touching = true;
    if (disp > b.impact) b.impact = disp;
  }

  // Shift both current and previous position: moves the body, keeps its velocity.
  function shift(b, dx, dy) {
    b.x += dx;
    b.y += dy;
    b.px += dx;
    b.py += dy;
  }

  // Change velocity by (dvx, dvy) without moving the body this substep.
  function kick(b, dvx, dvy) {
    b.px -= dvx;
    b.py -= dvy;
  }

  function solveContacts() {
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < n; j++) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;

        let d = Math.sqrt(d2);
        let nx = 1;
        let ny = 0;
        if (d > 1e-9) {
          nx = dx / d;
          ny = dy / d;
        } else {
          d = 0;
        }
        const wa = b.mass / (a.mass + b.mass);
        const wb = a.mass / (a.mass + b.mass);

        // 1. positional projection
        const overlap = rr - d;
        shift(a, -nx * overlap * wa, -ny * overlap * wa);
        shift(b, nx * overlap * wb, ny * overlap * wb);

        // 2. velocity projection
        const rvx = b.x - b.px - (a.x - a.px);
        const rvy = b.y - b.py - (a.y - a.py);
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const jn = -(1 + bounce(-vn)) * vn;
          kick(a, -nx * jn * wa, -ny * jn * wa);
          kick(b, nx * jn * wb, ny * jn * wb);
          const tx = -ny;
          const ty = nx;
          const vt = rvx * tx + rvy * ty;
          const jt = -vt * ballFriction;
          kick(a, -tx * jt * wa, -ty * jt * wa);
          kick(b, tx * jt * wb, ty * jt * wb);
        }
        noteImpact(a, Math.max(0, -vn));
        noteImpact(b, Math.max(0, -vn));
      }
    }
  }

  function constrainBounds() {
    for (const b of bodies) {
      const vx = b.x - b.px;
      const vy = b.y - b.py;
      if (b.x - b.r < -halfWidth || b.x + b.r > halfWidth) {
        const left = b.x - b.r < -halfWidth;
        shift(b, (left ? -halfWidth + b.r : halfWidth - b.r) - b.x, 0);
        const into = left ? -vx : vx; // speed toward the wall
        if (into > 0) {
          kick(b, (left ? 1 : -1) * into * (1 + bounce(into)), -vy * wallFriction);
          noteImpact(b, into);
        } else {
          b.touching = true;
        }
      }
      if (b.y - b.r < 0) {
        shift(b, 0, b.r - b.y);
        const into = -(b.y - b.py);
        const vxNow = b.x - b.px;
        if (into > 0) {
          kick(b, -vxNow * wallFriction, into * (1 + bounce(into)));
          noteImpact(b, into);
        } else {
          kick(b, -vxNow * wallFriction * 0.5, 0);
          b.touching = true;
        }
      }
    }
  }

  function step() {
    for (const b of bodies) {
      b.impact = 0;
      b.touching = false;
      b.sx = b.x;
      b.sy = b.y;
    }
    for (let s = 0; s < substeps; s++) {
      integrate();
      solveContacts();
      constrainBounds();
    }
    for (const b of bodies) {
      b.angle -= (b.x - b.sx) / b.r; // rolling estimate (render-only)
      b.impact /= h; // displacement per substep → units per second
    }
  }

  return { bodies, add, remove, step, halfWidth, height };
}
