// What the fusion skills draw (src/render/skillfx.js; docs/v2/SPEC.md section 6): every skillFx kind
// (ring, burst, beam, bolt, slam, sweep, text) books its light before it draws and is skipped when the
// budget refuses it; the standing pieces (zones by kind, walls, flower traps, minions, tethers) follow
// run.defense, rise, hold and fall without flashing, stand among the foes by depth, and burst as they
// end; Reduce motion holds them still; everything is capped. On stand-ins: Node has no canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { AIR, CAPS, CLIP, FIELD_AREA, LANE_HALF, PIECE, SKILL_FX, WALL, ZONE, boltPoints, createSkillFx, fxWord, pieceAlpha, zoneArea } from '../src/render/skillfx.js';
import { FUSIONS } from '../src/sim/classes.js';
import { FIELD, laneX } from '../src/config.js';

const U = 30;
const DT = 1 / 60;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });
const KINDS = ['lava', 'web', 'cloud', 'sand', 'snow', 'twister', 'field'];

function scene({ reduced = false, grant = 1 } = {}) {
  const layers = Object.fromEntries(['path', 'tiles', 'shots', 'fx', 'numbers', 'enemies'].map((k) => [k, new Container()]));
  layers.tiles.addChild(new Container()); // the blocks' layers, there first
  const shakes = [];
  const stage = { layers, reduced, view: { U, ox: 300, oy: 900 }, sx: (x) => 300 + x * U, sy: (y) => 900 - y * U, shake: (px) => shakes.push(px) };
  const fx = {
    shares: [],
    alls: [],
    bursts: [],
    parts: [],
    flashShare(lit, life, min = 0) {
      // as the real budget (src/ux/photosafe.js book): a share at or under its least is refused
      this.shares.push({ lit, life, min });
      return grant > min && grant > 0 ? grant : 0;
    },
    flashAll(lit, life) {
      this.alls.push({ lit, life });
      return grant >= 1;
    },
    burst(x, y, colors, n) {
      this.bursts.push({ x, y, colors, n });
    },
    particle(t, x, y, o) {
      this.parts.push({ x, y, o });
      return {};
    },
  };
  const tx = { softDot: () => tex(64, 64), text: (word) => Object.assign(new Container(), { text: word, anchor: { set() {} }, tint: 0xffffff }) };
  const s = createSkillFx({ stage, fx, art: null, tx });
  const run = { time: 0, tiles: [], enemies: [], defense: { zones: [], walls: [], traps: [], minions: [], tethers: [] } };
  const step = (seconds = DT, sim = true) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) {
      if (sim) run.time += DT;
      s.update(run, DT);
    }
  };
  const ground = layers.tiles.children[0];
  /** The zones' containers on the ground (its clip mask aside). */
  const groundZones = () => ground.children.filter((c) => c !== ground.mask);
  return { s, stage, fx, run, step, layers, shakes, ground, groundZones };
}

// --- the instant effects ----------------------------------------------------------------------------

test('every skillFx kind draws, and books its light first: ring, beam, bolt, slam and sweep as lines, burst as particles, text as a word', () => {
  const sc = scene();
  const events = [
    { fx: 'ring', x: 0, y: 12, r: 4, color: '#456ac2' },
    { fx: 'beam', x: -3, y: 9, x1: -3, y1: 16, w: 0.6, color: '#00d2ff' },
    { fx: 'bolt', x: 1, y: 11, x1: 3, y1: 14, color: '#9fa8ff' },
    { fx: 'slam', x: 1, y: 12, r: 2.4, color: '#ff9f1c' },
    { fx: 'sweep', y: 12, w: 0.7, color: '#86aaaf' },
  ];
  for (const e of events) {
    const before = sc.fx.shares.length;
    sc.s.onEvent({ type: 'skillFx', ...e });
    assert.ok(sc.fx.shares.length > before, `${e.fx} books its light`);
    assert.ok(sc.fx.shares.at(-1).lit > 0 && sc.fx.shares.at(-1).min > 0, `${e.fx}: a line drawn thinner when short, never below its least share`);
  }
  assert.equal(sc.s.drawn.lines, 5, 'five lines on screen');
  sc.s.onEvent({ type: 'skillFx', fx: 'burst', x: 2, y: 13, n: 14, color: '#c6ff00' });
  assert.equal(sc.fx.bursts.at(-1).n, 14, 'a burst through fx (it books its own particles)');
  const alls = sc.fx.alls.length;
  sc.s.onEvent({ type: 'skillFx', fx: 'text', x: 0, y: 12, key: 'shatter', color: '#ffffff' });
  assert.deepEqual(sc.s.drawn.texts.map((t) => t.word), ['Shatter']);
  assert.ok(sc.fx.alls.length === alls + 1 && sc.fx.alls.at(-1).lit > 0, 'a word books its ink whole, or is skipped');
  assert.ok(sc.layers.fx.children.length >= 1 && sc.layers.numbers.children.length >= 1);
  // a slam shakes the screen a little (not under Reduce motion)
  assert.deepEqual(sc.shakes, [3]);
  // each ends after its life
  sc.step(1.2, false);
  assert.equal(sc.s.drawn.lines, 0);
  assert.equal(sc.s.drawn.texts.length, 0);
  // refused by the light budget: nothing drawn
  const none = scene({ grant: 0 });
  for (const e of events) none.s.onEvent({ type: 'skillFx', ...e });
  none.s.onEvent({ type: 'skillFx', fx: 'text', x: 0, y: 12, key: 'miss', color: '#ffffff' });
  assert.equal(none.s.drawn.lines, 0);
  assert.equal(none.s.drawn.texts.length, 0);
  // other events pass by
  none.s.onEvent({ type: 'hit', x: 0, y: 0 });
  none.s.onEvent({ type: 'skillFx', fx: 'unknown', x: 0, y: 0 });
});

test('the lines and words are capped, and a word floats up and fades (in place under Reduce motion)', () => {
  const sc = scene();
  for (let i = 0; i < CAPS.lines + 10; i++) sc.s.onEvent({ type: 'skillFx', fx: 'ring', x: 0, y: 12, r: 1, color: '#ffffff' });
  assert.equal(sc.s.drawn.lines, CAPS.lines);
  for (let i = 0; i < CAPS.texts + 3; i++) sc.s.onEvent({ type: 'skillFx', fx: 'text', x: 0, y: 12, key: 'fx.sleep', color: '#7a3fa8' });
  assert.equal(sc.s.drawn.texts.length, CAPS.texts);
  const words = () => sc.layers.numbers.children[0].children.filter((c) => c.visible);
  sc.step(DT, false);
  const w0 = words().at(-1);
  const y0 = w0.position.y;
  sc.step(SKILL_FX.text.life * 0.5, false);
  assert.ok(w0.position.y < y0 - 0.3 * U, 'it floats up the screen');
  assert.ok(w0.alpha === 1, 'whole until late in its life');
  sc.step(SKILL_FX.text.life * 0.3, false);
  assert.ok(w0.alpha < 1, 'then it fades');
  const still = scene({ reduced: true });
  still.s.onEvent({ type: 'skillFx', fx: 'text', x: 0, y: 12, key: 'sleep', color: '#ffffff' });
  still.step(DT, false);
  const w = still.layers.numbers.children[0].children[0];
  const p0 = w.position.y;
  still.step(SKILL_FX.text.life * 0.7, false);
  assert.equal(w.position.y, p0, 'Reduce motion: it fades where it is');
  assert.ok(w.alpha < 1);
});

test('a skill word comes from the tables (fx.<key>), else from its own key', () => {
  assert.equal(fxWord('shatter'), 'Shatter');
  assert.equal(fxWord('fx.panic'), 'Panic');
  assert.equal(fxWord('wakeUp'), 'Wake up');
  assert.equal(fxWord(''), '');
});

test('a bolt runs jagged from its start to its end, bending a little to the side at each step', () => {
  const pts = boltPoints(0, 10, 0, 16, 7);
  assert.deepEqual([pts[0].x, pts[0].y], [0, 10]);
  assert.deepEqual([pts.at(-1).x, pts.at(-1).y], [0, 16]);
  assert.equal(pts.length, Math.round(6 / SKILL_FX.bolt.step) + 1);
  assert.ok(pts.every((p) => Math.abs(p.x) <= SKILL_FX.bolt.jag + 1e-9), 'within its jag of the line');
  assert.ok(pts.some((p) => Math.abs(p.x) > 0.05), 'and it does bend');
  assert.deepEqual(boltPoints(0, 10, 0, 16, 7), pts, 'seeded: the same bolt for the same seed');
});

// --- the standing pieces --------------------------------------------------------------------------------

test('zones: every kind is drawn, on the ground or in the air; it rises, holds at least its least time, then falls and is gone', () => {
  assert.deepEqual([...AIR].sort(), ['snow', 'twister']);
  const sc = scene();
  sc.run.defense.zones = KINDS.map((kind, i) => ({ id: i + 1, kind, x: -3 + (i % 4) * 2, y: 10 + Math.floor(i / 4) * 3, r: 1.5, color: '#ff9f1c', t: 3, dur: 3 }));
  sc.step();
  const drawn = sc.s.drawn.zones;
  assert.deepEqual(drawn.map((z) => z.kind), KINDS);
  for (const z of drawn) assert.equal(z.layer, AIR.has(z.kind) ? 'air' : 'ground', z.kind);
  assert.ok(drawn.every((z) => z.alpha > 0 && z.alpha < 0.2), 'they rise, never pop');
  sc.step(PIECE.rise);
  const full = sc.s.drawn.zones;
  assert.ok(Math.abs(full.find((z) => z.kind === 'lava').alpha - ZONE.lava) < 1e-9, 'lava at its alpha');
  assert.ok(Math.abs(full.find((z) => z.kind === 'field').alpha - ZONE.field) < 1e-9);
  // dropped early (0.5 s in): it holds until its least time is up, then falls over PIECE.fall
  const quick = scene();
  quick.run.defense.zones = [{ id: 9, kind: 'lava', x: 0, y: 12, r: 1, color: '#ff9f1c' }];
  quick.step(0.5);
  quick.run.defense.zones = [];
  quick.step(PIECE.rise + PIECE.hold - 0.5 - 0.1);
  assert.ok(Math.abs(quick.s.drawn.zones[0].alpha - ZONE.lava) < 1e-9, 'still holding');
  quick.step(PIECE.fall / 2 + 0.1);
  const a = quick.s.drawn.zones[0].alpha;
  assert.ok(a > 0.2 * ZONE.lava && a < 0.8 * ZONE.lava, `falling (${a.toFixed(2)})`);
  quick.step(PIECE.fall);
  assert.equal(quick.s.drawn.zones.length, 0, 'gone');
  assert.equal(quick.groundZones().length, 0, 'its view destroyed');
  // the rise and the fall are more than a second apart, at any game speed (real time)
  assert.ok(PIECE.rise + PIECE.hold > 1);
  assert.equal(pieceAlpha(0), 0);
  assert.equal(pieceAlpha(PIECE.rise), 1);
  assert.equal(pieceAlpha(10, PIECE.fall), 0);
});

test('a zone follows the sim (a twister wanders), an unknown kind is drawn as a field, and no more than CAPS.zones are drawn', () => {
  const sc = scene();
  const tw = { id: 1, kind: 'twister', x: 1, y: 10, r: 1.5, color: '#f24c00' };
  sc.run.defense.zones = [tw, { id: 2, kind: 'mystery', x: -1, y: 12, r: 1, color: '#ffffff' }];
  sc.step();
  const x0 = sc.s.drawn.zones[0].x;
  tw.y = 13;
  tw.x = -1;
  sc.step();
  assert.ok(sc.s.drawn.zones[0].x < x0 && sc.s.drawn.zones[0].y < 900 - 12 * U, 'it moved with the sim');
  assert.equal(sc.s.drawn.zones[1].layer, 'ground');
  const many = scene();
  many.run.defense.zones = Array.from({ length: CAPS.zones + 5 }, (_, i) => ({ id: i, kind: 'field', x: 0, y: 12, r: 1, color: '#ffffff' }));
  many.step();
  assert.equal(many.s.drawn.zones.length, CAPS.zones);
  // the run's own arrays work too (docs/v2/SPEC.md: also exposed as run.zones)
  const flat = scene();
  flat.run.defense = {};
  flat.run.zones = [{ id: 1, kind: 'web', x: 0, y: 12, r: 1.5, color: '#6b8e23' }];
  flat.step();
  assert.equal(flat.s.drawn.zones.length, 1);
});

test('a glacier wall stands across its lanes among the foes, rises from the ground, cracks as it nears its end, and bursts', () => {
  const sc = scene();
  sc.run.defense.walls = [{ id: 1, lanes: [2, 1], y: 9.4, t: 6, dur: 6, color: '#9fc5e8' }];
  sc.step();
  const wall = () => sc.layers.enemies.children.find((c) => c.skillDepth && c.children.length === 2);
  assert.ok(wall(), 'among the foes');
  assert.equal(wall().position.x, sc.stage.sx((laneX(1) + laneX(2)) / 2), 'centred on its lanes');
  assert.equal(sc.s.drawn.walls[0].z, sc.stage.sy(9.4 - WALL.sink), 'drawn by its base line');
  assert.ok(sc.s.drawn.walls[0].scaleY < 0.3, 'it rises from the ground');
  sc.step(0.4);
  assert.ok(Math.abs(sc.s.drawn.walls[0].scaleY - 1) < 0.07);
  assert.equal(sc.s.drawn.walls[0].cracks, 0, 'whole while it is fresh');
  sc.step(6 * 0.95 - 0.4);
  assert.ok(sc.s.drawn.walls[0].cracks > 0.5, 'cracking near its end');
  sc.run.defense.walls = [];
  sc.step();
  assert.equal(sc.fx.bursts.length, 2, 'it bursts: shards where each block stood');
  sc.step(PIECE.fall + 0.05);
  assert.equal(sc.s.drawn.walls.length, 0);
  // a paused game does not crack it (sim time)
  const p = scene();
  p.run.defense.walls = [{ id: 1, lanes: [0], y: 9, dur: 2, color: '#9fc5e8' }];
  p.step(3, false);
  assert.equal(p.s.drawn.walls[0].cracks, 0);
});

test('flower traps pop up among the foes, sway, and burst at once when they go off; minions face where they go and puff away', () => {
  const sc = scene();
  sc.run.defense.traps = [{ id: 1, x: -1, y: 10.5, r: 0.8, color: '#7fffd4', kind: 'flower' }];
  const loc = { id: 3, kind: 'locust', x: 1, y: 11, color: '#d4e157' };
  sc.run.defense.minions = [loc, { id: 4, kind: 'spider', x: 2, y: 10, color: '#6b8e23' }];
  sc.step(0.5);
  assert.equal(sc.s.drawn.traps.length, 1);
  assert.equal(sc.s.drawn.traps[0].z, sc.stage.sy(10.5));
  assert.deepEqual(sc.s.drawn.minions.map((m) => m.kind), ['locust', 'spider']);
  loc.x -= 0.5;
  sc.step();
  assert.equal(sc.s.drawn.minions[0].face, -1, 'it faces where it goes');
  loc.x += 1;
  sc.step();
  assert.equal(sc.s.drawn.minions[0].face, 1);
  const n = sc.fx.bursts.length;
  sc.run.defense.traps = [];
  sc.run.defense.minions = [];
  sc.step();
  assert.equal(sc.fx.bursts.length, n + 3, 'the bloom and the two puffs, at once');
  sc.step(PIECE.fall + 0.05);
  assert.equal(sc.s.drawn.traps.length + sc.s.drawn.minions.length, 0);
});

test('a tether runs from the summoned pet to its foe in the pet’s colour, and keeps its last ends while it fades', () => {
  const sc = scene();
  const tile = { id: 5, x: 1, y: 3, tier: 10, cls: { element: 'ice', fusion: 'poison', buffs: {} }, summon: { phase: 'act', x: 1, y: 11 } };
  const foe = { id: 40, x: -1, y: 14, dead: false };
  sc.run.tiles = [tile];
  sc.run.enemies = [foe];
  sc.run.defense.tethers = [{ id: 1, tileId: 5, enemyId: 40 }];
  sc.step();
  const t = sc.s.drawn.tethers[0];
  assert.deepEqual([t.a.x, t.b.x], [1, -1]);
  assert.ok(t.a.y > 11 && t.b.y > 14, 'from the pet’s body to the foe’s');
  assert.equal(t.color, parseInt(FUSIONS['ice+poison'].color.slice(1), 16));
  foe.x = 0;
  sc.step();
  assert.equal(sc.s.drawn.tethers[0].b.x, 0, 'it follows its foe');
  foe.dead = true;
  sc.run.defense.tethers = [];
  sc.step();
  assert.equal(sc.s.drawn.tethers[0].b.x, 0, 'its foe is gone: it keeps the last end while it fades');
  sc.step(PIECE.fall + 0.05);
  assert.equal(sc.s.drawn.tethers.length, 0);
});

test('Reduce motion: zones hold still, and lines appear whole instead of racing or sweeping', () => {
  const sc = scene({ reduced: true });
  sc.run.defense.zones = [{ id: 1, kind: 'field', x: 0, y: 12, r: 2, color: '#ffffff' }];
  sc.step(0.5);
  const g = sc.groundZones()[0].children[0];
  const r0 = g.rotation;
  sc.step(1);
  assert.equal(g.rotation, r0, 'the field’s dashes do not turn');
  assert.deepEqual(sc.shakes, []);
  sc.s.onEvent({ type: 'skillFx', fx: 'slam', x: 0, y: 12, r: 2, color: '#ff9f1c' });
  assert.deepEqual(sc.shakes, [], 'no shake');
});

test('reset clears every piece, line and word', () => {
  const sc = scene();
  sc.run.defense.zones = [{ id: 1, kind: 'lava', x: 0, y: 12, r: 1, color: '#ff9f1c' }];
  sc.run.defense.walls = [{ id: 1, lanes: [0], y: 9, color: '#9fc5e8' }];
  sc.step();
  sc.s.onEvent({ type: 'skillFx', fx: 'ring', x: 0, y: 12, r: 1, color: '#ffffff' });
  sc.s.onEvent({ type: 'skillFx', fx: 'text', x: 0, y: 12, key: 'x', color: '#ffffff' });
  sc.s.reset();
  const d = sc.s.drawn;
  assert.equal(d.zones.length + d.walls.length + d.lines + d.texts.length, 0);
});

test('an id the sim gives to another kind of zone or minion gets a view of its own kind', () => {
  const sc = scene();
  sc.run.defense.zones = [{ id: 1, kind: 'lava', x: 0, y: 12, r: 1, color: '#ff9f1c' }];
  sc.run.defense.minions = [{ id: 1, kind: 'locust', x: 0, y: 12, color: '#d4e157' }];
  sc.step(0.2);
  sc.run.defense.zones = [{ id: 1, kind: 'web', x: 0, y: 12, r: 1, color: '#6b8e23' }];
  sc.run.defense.minions = [{ id: 1, kind: 'spider', x: 0, y: 12, color: '#6b8e23' }];
  sc.step();
  assert.deepEqual(sc.s.drawn.zones.map((z) => z.kind), ['web']);
  assert.deepEqual(sc.s.drawn.minions.map((m) => m.kind), ['spider']);
});

test('a zone’s area: a disc; r = Infinity the whole field; a sandstorm with lanes those lanes’ columns, from the parapet to the portals', () => {
  assert.deepEqual(zoneArea({ x: 1, y: 12, r: 3 }), { cx: 1, cy: 12, hx: 3, hy: 3, round: true, lanes: null });
  const field = zoneArea({ kind: 'snow', x: 0, y: 12, r: Infinity });
  assert.deepEqual([field.round, field.cx, field.hx], [false, 0, FIELD_AREA.hx]);
  assert.ok(Math.abs(field.cy - field.hy - FIELD_AREA.y0) < 1e-9 && Math.abs(field.cy + field.hy - FIELD.spawnY) < 1e-9, 'parapet to portals');
  const storm = zoneArea({ kind: 'sand', x: 0, y: 12, r: Infinity, lanes: [2, 1] });
  assert.deepEqual(storm.lanes, [1, 2]);
  assert.ok(Math.abs(storm.cx - (laneX(1) + laneX(2)) / 2) < 1e-9 && Math.abs(storm.hx - (laneX(2) - laneX(1)) / 2 - LANE_HALF) < 1e-9, 'its two columns');
});

test('a whole-field blizzard and a sandstorm over its lanes are drawn where they lie, and the ground zones sit under the blocks, clipped to the field and keep', () => {
  const sc = scene();
  sc.run.defense.zones = [
    { id: 1, kind: 'snow', x: 0, y: 12.6, r: Infinity, color: '#e0f7ff' },
    { id: 2, kind: 'sand', x: 1, y: 12, r: Infinity, lanes: [1, 2], color: '#e6c88a' },
    { id: 3, kind: 'cloud', x: -3, y: 11, r: 5, color: '#c39bd3' },
  ];
  sc.step(PIECE.rise);
  const [snow, sand, cloud] = sc.s.drawn.zones;
  assert.equal(snow.layer, 'air');
  const mid = (FIELD_AREA.y0 + FIELD_AREA.y1) / 2;
  assert.deepEqual([snow.x, snow.y], [sc.stage.sx(0), sc.stage.sy(mid)], 'over the whole field');
  assert.deepEqual([sand.layer, sand.x], ['ground', sc.stage.sx((laneX(1) + laneX(2)) / 2)], 'over its lanes, under the foes');
  assert.equal(cloud.layer, 'ground', 'a cloud too: the foes in it stay readable');
  for (const z of sc.s.drawn.zones) assert.ok(Number.isFinite(z.x) && Number.isFinite(z.y) && z.alpha > 0);
  // the ground is the bottom of the tiles layer (under the blocks), and both containers are clipped
  assert.equal(sc.layers.tiles.children[0], sc.ground);
  assert.ok(sc.ground.mask && sc.layers.shots.children[0].mask, 'clipped');
  const b = sc.ground.mask.getLocalBounds();
  assert.ok(Math.abs(b.minX - sc.stage.sx(-CLIP.hx)) < 1e-6 && Math.abs(b.maxX - sc.stage.sx(CLIP.hx)) < 1e-6, 'tower to tower');
  // the bits of a whole-field zone stay inside it
  const snowC = sc.layers.shots.children[0].children.find((c) => c.children.length > 10);
  for (const bit of snowC.children.slice(1)) {
    assert.ok(Math.abs(bit.position.x) <= FIELD_AREA.hx * U + 1e-6, 'within the field');
    assert.ok(Math.abs(bit.position.y) <= ((FIELD_AREA.y1 - FIELD_AREA.y0) / 2) * U + 1e-6);
  }
});

test('a glacier wall stands on its line: foes stopped just above it show over it', () => {
  const sc = scene();
  sc.run.defense.walls = [{ id: 1, lanes: [0], y: 9, dur: 6, color: '#9fc5e8' }];
  sc.step(0.5);
  const wall = sc.layers.enemies.children.find((c) => c.skillDepth);
  assert.equal(wall.position.y, sc.stage.sy(9 - WALL.sink));
  const top = wall.position.y + wall.getLocalBounds().minY * wall.scale.y;
  assert.ok(top > sc.stage.sy(9 + 0.45 + 0.6), 'its top lies below a stopped foe’s head');
  assert.ok(WALL.h < 1, 'a low barrier');
});
