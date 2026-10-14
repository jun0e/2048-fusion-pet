import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../sim/game.js';
import { BOARD, RULES, PHYSICS, tierRadius, tierValue } from '../../../src/config.js';

const steps = (game, seconds) => {
  for (let i = 0; i < Math.round(seconds / PHYSICS.dt); i++) game.step();
};
const dropAt = (game, x) => {
  game.setAim(x);
  assert.equal(game.drop(), true, 'drop should be accepted');
  steps(game, RULES.dropCooldown + 0.05);
};
const tiers = (game) => game.balls.map((b) => b.tier).sort((a, b) => a - b);

test('two equal balls merge into the next tier and score its value', () => {
  const g = createGame({ seed: 1, queue: [1, 1, 3, 3, 3] });
  dropAt(g, 0);
  dropAt(g, 0);
  steps(g, 2);
  assert.deepEqual(tiers(g), [2]);
  assert.equal(g.score, tierValue(2));
  const merges = g.drainEvents().filter((e) => e.type === 'merge');
  assert.equal(merges.length, 1);
  assert.equal(merges[0].tier, 2);
});

test('different tiers do not merge', () => {
  const g = createGame({ seed: 1, queue: [1, 2, 3, 3, 3] });
  dropAt(g, 0);
  dropAt(g, 0);
  steps(g, 2);
  assert.deepEqual(tiers(g), [1, 2]);
  assert.equal(g.score, 0);
});

test('merges chain: 2+2 makes 4, which merges with a resting 4 into 8', () => {
  const g = createGame({ seed: 1, queue: [2, 1, 1, 4, 4, 4] });
  dropAt(g, 0);
  steps(g, 1);
  dropAt(g, 0);
  dropAt(g, 0);
  steps(g, 3);
  assert.deepEqual(tiers(g), [3]);
  assert.equal(g.score, tierValue(2) + tierValue(3));
  const merges = g.drainEvents().filter((e) => e.type === 'merge');
  assert.equal(merges.at(-1).combo, 2, 'second merge inside the combo window counts as combo 2');
});

test('drop cooldown blocks an immediate second drop', () => {
  const g = createGame({ seed: 2 });
  assert.equal(g.drop(), true);
  assert.equal(g.drop(), false);
  steps(g, RULES.dropCooldown + 0.05);
  assert.equal(g.drop(), true);
});

test('aim is clamped so the waiting ball stays inside the walls', () => {
  const g = createGame({ seed: 3, queue: [4, 1, 1] });
  g.setAim(100);
  assert.ok(Math.abs(g.aimX - (BOARD.halfWidth - tierRadius(4))) < 1e-9);
  g.setAim(-100);
  assert.ok(Math.abs(g.aimX - (-BOARD.halfWidth + tierRadius(4))) < 1e-9);
});

test('upcoming tiers follow the spawn table and are deterministic per seed', () => {
  const a = createGame({ seed: 42 });
  const b = createGame({ seed: 42 });
  const allowed = new Set(RULES.spawnWeights.map(([t]) => t));
  for (let i = 0; i < 30; i++) {
    assert.ok(allowed.has(a.current));
    assert.equal(a.current, b.current);
    assert.equal(a.next, b.next);
    a.drop();
    b.drop();
    steps(a, RULES.dropCooldown + 0.05);
    steps(b, RULES.dropCooldown + 0.05);
  }
});

test('same seed and same inputs give identical simulations', () => {
  const play = () => {
    const g = createGame({ seed: 7 });
    for (let i = 0; i < 25; i++) {
      g.setAim(Math.sin(i * 1.7) * 3);
      g.drop();
      steps(g, 0.5);
    }
    return JSON.stringify({ score: g.score, balls: g.balls.map((b) => [b.tier, b.x.toFixed(6), b.y.toFixed(6)]) });
  };
  assert.equal(play(), play());
});

test('a stack held above the danger line ends the game', () => {
  const g = createGame({ seed: 5, queue: Array(80).fill(0).map((_, i) => 6 + (i % 4)) });
  let over = false;
  for (let i = 0; i < 80 && !over; i++) {
    g.setAim(((i * 1.3) % 6) - 3);
    g.drop();
    steps(g, 0.5);
    over = g.over;
  }
  assert.equal(over, true, 'game should end once the container overflows');
  assert.equal(g.drop(), false, 'no drops after game over');
  assert.ok(g.drainEvents().some((e) => e.type === 'gameover'));
});
