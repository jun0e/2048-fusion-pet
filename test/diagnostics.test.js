import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { percentile, walkScene } from '../src/render/diagnostics.js';

test('percentile takes the nearest rank', () => {
  const ms = [16, 17, 16, 33, 16, 18, 16, 16, 50, 16];
  assert.equal(percentile(ms, 50), 16);
  assert.equal(percentile(ms, 95), 50);
  assert.equal(percentile([], 95), 0);
});

test('the scene walk counts what is drawn, skips hidden branches and sums texture sources once', () => {
  const root = new Container();
  const tex = Texture.WHITE;
  const a = new Sprite(tex);
  const b = new Sprite(tex); // same source: counted once
  const hidden = new Container();
  hidden.visible = false;
  hidden.addChild(new Sprite(tex), new Graphics());
  root.addChild(a, b, new Graphics(), hidden);
  const d = walkScene(root);
  assert.equal(d.sprites, 2);
  assert.equal(d.graphics, 1);
  assert.equal(d.textures, 1);
  assert.equal(d.containers, 1, 'the root itself');
});
