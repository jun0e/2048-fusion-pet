import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrid } from '../src/sim/grid.js';
import { GRID, tierValue } from '../src/config.js';

// Board helper: rows given top-to-bottom as arrays of values (0 = empty).
function setBoard(g, rowsTopDown) {
  g.clear();
  const n = GRID.size;
  rowsTopDown.forEach((rowVals, i) => {
    const row = n - 1 - i;
    rowVals.forEach((v, col) => {
      if (v) g.place(Math.log2(v), col, row);
    });
  });
}
function board(g) {
  const n = GRID.size;
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = n - 1 - i;
    const line = [];
    for (let col = 0; col < n; col++) {
      const t = g.at(col, row);
      line.push(t ? tierValue(t.tier) : 0);
    }
    out.push(line);
  }
  return out;
}

test('a new game starts with two tiles', () => {
  const g = createGrid({ seed: 1 });
  assert.equal(g.tiles.length, 2);
});

test('slide left merges pairs once per move, classic 2048 rules', () => {
  const g = createGrid({ seed: 1, spawn: false });
  setBoard(g, [
    [2, 2, 2, 2],
    [4, 2, 2, 0],
    [2, 0, 2, 4],
    [4, 4, 8, 0],
  ]);
  assert.equal(g.move('left'), true);
  assert.deepEqual(board(g), [
    [4, 4, 0, 0],
    [4, 4, 0, 0],
    [4, 4, 0, 0],
    [8, 8, 0, 0],
  ]);
  assert.equal(g.score, 4 + 4 + 4 + 4 + 8);
});

test('slide in each direction', () => {
  const g = createGrid({ seed: 1, spawn: false });
  setBoard(g, [
    [0, 0, 0, 2],
    [0, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  g.move('down');
  assert.deepEqual(board(g)[3], [0, 0, 0, 4]);
  g.move('left');
  assert.deepEqual(board(g)[3], [4, 0, 0, 0]);
  g.move('up');
  assert.deepEqual(board(g)[0], [4, 0, 0, 0]);
  g.move('right');
  assert.deepEqual(board(g)[0], [0, 0, 0, 4]);
});

test('a move that changes nothing is refused and spawns nothing', () => {
  const g = createGrid({ seed: 1 });
  setBoard(g, [
    [2, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.equal(g.move('left'), false);
  assert.equal(g.tiles.length, 2);
  assert.equal(g.move('right'), true);
  assert.equal(g.tiles.length, 3, 'a valid move spawns one tile');
});

test('merges report combo order and tell onMerge which tile slid into which', () => {
  const calls = [];
  // swiping left, the tile on the right slides into the one on the left
  const g = createGrid({ seed: 1, spawn: false, onMerge: (c, mover, stayer) => calls.push([c.tier, mover.col > stayer.col]) });
  setBoard(g, [
    [2, 2, 4, 4],
    [8, 8, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  g.drainEvents();
  g.move('left');
  const merges = g.drainEvents().filter((e) => e.type === 'merge');
  assert.deepEqual(merges.map((m) => m.combo), [1, 2, 3]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([, fromTheRight]) => fromTheRight));
});

test('tiles keep their identity while sliding (turret state survives)', () => {
  const g = createGrid({ seed: 1, spawn: false });
  setBoard(g, [
    [0, 0, 0, 0],
    [0, 0, 16, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const t = g.tiles[0];
  t.cls.element = 'fire';
  g.move('left');
  assert.equal(g.tiles[0], t);
  assert.equal(t.col, 0);
  assert.equal(t.cls.element, 'fire');
});

test('stuck when the board is full with no equal neighbours', () => {
  const g = createGrid({ seed: 1, spawn: false });
  setBoard(g, [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  assert.equal(g.canMove(), false);
  setBoard(g, [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 4],
  ]);
  assert.equal(g.canMove(), true);
});

test('promote raises a tile one tier in place', () => {
  const g = createGrid({ seed: 1, spawn: false });
  setBoard(g, [
    [0, 0, 0, 0],
    [0, 64, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const t = g.tiles[0];
  assert.equal(g.promote(t), true);
  assert.equal(t.tier, 7);
});

test('same seed and moves replay the same board', () => {
  const play = () => {
    const g = createGrid({ seed: 9 });
    const dirs = ['left', 'down', 'right', 'down', 'up', 'left'];
    for (let i = 0; i < 60; i++) g.move(dirs[i % dirs.length]);
    return JSON.stringify({ b: board(g), s: g.score });
  };
  assert.equal(play(), play());
});
