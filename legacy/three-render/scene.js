// Renderer, camera framing, lights and post-processing.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BOARD, FIELD } from '../config.js';

const FOV = 26;

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStage(container, { touch }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, touch ? 2 : 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft was removed in r186
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = gradientTexture('#bfe3f2', '#fbe7d0');
  scene.fog = new THREE.Fog('#f6e6d6', 60, 140);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);

  const hemi = new THREE.HemisphereLight('#fff7ea', '#b8a6d8', 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0dc', 1.7);
  sun.position.set(-1.8, 13, 22); // mostly frontal: wall shadows fall behind, ball shadows give depth
  sun.target.position.set(0, 9, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  sun.shadow.radius = 3;
  sun.shadow.intensity = 0.5; // softer shadows: they read as depth, not holes
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera;
  sc.left = -9;
  sc.right = 9;
  sc.top = 26;
  sc.bottom = -4;
  sc.near = 1;
  sc.far = 50;
  scene.add(sun, sun.target);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // threshold sits above the brightest sunlit albedo, so only emissives bloom
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.4, 2.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Where the HUD sits, in CSS px, so the board is framed between them.
  const insets = { top: 178, bottom: 84 };
  const base = { cy: 0, dist: 30 };
  const shake = { amp: 0, t: 0 };

  function frame() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    composer.setSize(w, h);
    composer.setPixelRatio(dpr);
    bloom.resolution.set(Math.round(w / 2), Math.round(h / 2));
    camera.aspect = w / h;

    // content box in world units (container walls + drop zone)
    const contentW = BOARD.halfWidth * 2 + 1.6;
    const contentBottom = -1.0;
    const contentTop = FIELD.spawnY + 1.2; // the enemy field and its portals sit above the crate
    const contentH = contentTop - contentBottom;
    const usable = Math.max(0.3, (h - insets.top - insets.bottom) / h);
    const visibleH = Math.max(contentH / usable, contentW / camera.aspect);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    base.dist = visibleH / 2 / tan;
    base.cy = (contentTop + contentBottom) / 2 + (visibleH * (insets.top - insets.bottom)) / (2 * h);
    camera.updateProjectionMatrix();
    placeCamera(0, 0);
  }

  function placeCamera(ox, oy) {
    camera.position.set(ox, base.cy + base.dist * 0.07 + oy, base.dist);
    camera.lookAt(ox * 0.5, base.cy + oy * 0.5, 0);
  }

  function addShake(amount) {
    shake.amp = Math.min(0.6, shake.amp + amount);
  }

  function render(dt) {
    if (shake.amp > 0.001) {
      shake.t += dt * 60;
      shake.amp *= Math.exp(-dt * 9);
      placeCamera(Math.sin(shake.t * 1.7) * shake.amp, Math.cos(shake.t * 2.3) * shake.amp * 0.6);
    } else if (shake.amp !== 0) {
      shake.amp = 0;
      placeCamera(0, 0);
    }
    composer.render(dt);
  }

  // screen (client px) → world point on the z = 0 board plane
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  function screenToBoard(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.y } : null;
  }

  // world → client px (for DOM popups)
  const v = new THREE.Vector3();
  function worldToScreen(x, y, z = 0) {
    v.set(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  window.addEventListener('resize', frame);
  frame();

  return { renderer, scene, camera, insets, frame, render, addShake, screenToBoard, worldToScreen };
}
