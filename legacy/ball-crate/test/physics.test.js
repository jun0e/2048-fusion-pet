import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../sim/physics.js';
import { BOARD, PHYSICS } from '../../../src/config.js';

const makeWorld = () => createWorld({ halfWidth: BOARD.halfWidth, height: BOARD.height, ...PHYSICS });
const run = (world, seconds) => {
  for (let i = 0; i < Math.round(seconds / PHYSICS.dt); i++) world.step(PHYSICS.dt);
};
// real motion: how far the body moved during the last fixed step
const speed = (b) => Math.hypot(b.x - b.sx, b.y - b.sy) / PHYSICS.dt;

test('a dropped ball falls and rests on the floor', () => {
  const w = makeWorld();
  const b = w.add({ x: 0, y: 8, r: 0.5, mass: 0.25 });
  run(w, 3);
  assert.ok(Math.abs(b.y - 0.5) < 0.02, `expected y≈0.5, got ${b.y}`);
  assert.ok(speed(b) < 0.05, `ball should be at rest, speed ${speed(b)}`);
});

test('balls never leave the container', () => {
  const w = makeWorld();
  for (let i = 0; i < 40; i++) {
    w.add({ x: -3 + (i % 7), y: 4 + Math.floor(i / 7) * 1.1, r: 0.45, mass: 0.2, vx: (i % 3) - 1, vy: 0 });
  }
  run(w, 4);
  for (const b of w.bodies) {
    assert.ok(b.x - b.r >= -BOARD.halfWidth - 1e-3, `left wall breached by ${b.id}`);
    assert.ok(b.x + b.r <= BOARD.halfWidth + 1e-3, `right wall breached by ${b.id}`);
    assert.ok(b.y - b.r >= -1e-3, `floor breached by ${b.id}`);
  }
});

test('stacked balls settle without significant overlap', () => {
  const w = makeWorld();
  for (let i = 0; i < 30; i++) w.add({ x: ((i * 37) % 60) / 10 - 3, y: 1 + i * 0.6, r: 0.5, mass: 0.25 });
  run(w, 6);
  let worst = 0;
  for (let i = 0; i < w.bodies.length; i++) {
    for (let j = i + 1; j < w.bodies.length; j++) {
      const a = w.bodies[i];
      const b = w.bodies[j];
      worst = Math.max(worst, a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  assert.ok(worst < 0.03, `worst overlap ${worst.toFixed(4)}`);
  const maxSpeed = Math.max(...w.bodies.map(speed));
  assert.ok(maxSpeed < 0.02, `pile should be nearly still, max speed ${maxSpeed.toFixed(3)}`);
});

test('removing a body drops it from the world', () => {
  const w = makeWorld();
  const a = w.add({ x: 0, y: 1, r: 0.5, mass: 0.25 });
  w.add({ x: 1.5, y: 1, r: 0.5, mass: 0.25 });
  w.remove(a);
  assert.equal(w.bodies.length, 1);
  assert.ok(!w.bodies.includes(a));
});
