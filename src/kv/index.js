// Key-visual demo mode (index.html?kv): the recommended art direction running in
// the real game. ?style=sticker|pixel|classic picks the map style (the namecard
// portraits stay soft-vinyl 3D in every style); ?embed hides the switcher (the
// side-by-side compare page uses it).
//   - Board: every element at a different growth stage, eggs, and dens
//   - Field: three fusions and one legendary roam and fight from where they stand
//   - Side strip: namecards with portraits; tap a ready card to cast its skill
import './kv.css';
import { PixelateFilter } from 'pixi-filters';
import { ELEMENT_KEYS } from '../sim/classes.js';
import { GRID, FIELD } from '../config.js';
import { setupPets } from './pets.js';

export const KV_DICE = [...ELEMENT_KEYS];
const STYLES = [
  ['sticker', 'Sticker'],
  ['pixel', 'Pixel'],
  ['classic', 'Classic'],
];

/** The showcase board (row 0 is the bottom row). */
const PRESET = [
  // [tier, col, row, cls]
  [1, 0, 3, {}],
  [4, 1, 3, { element: 'fire' }],
  [5, 2, 3, { element: 'ice' }],
  [6, 0, 2, { element: 'lightning' }],
  [7, 1, 2, { element: 'nature' }],
  [4, 2, 2, { element: 'poison' }],
  [3, 3, 2, {}],
  [5, 0, 1, { element: 'earth' }],
  [8, 1, 1, { element: 'fire', fusion: 'ice' }],
  [6, 2, 1, { element: 'wind' }],
  [2, 3, 1, {}],
  [12, 0, 0, { element: 'lightning', fusion: 'metal', ultimate: 'ice' }],
  [9, 1, 0, { element: 'fire', fusion: 'lightning' }],
  [10, 2, 0, { element: 'earth', fusion: 'nature' }],
  [4, 3, 0, { element: 'metal' }],
];

export function setupKv({ stage, fx, blocks, art, hudEl, getRun, params }) {
  const pets = setupPets({ stage, fx, art, hudEl, getRun });
  const roam = pets.roam;
  document.body.classList.add('kv');

  // pixel map: enemies, shots and effects get a matching pixel grid
  const pixelate = new PixelateFilter(2);
  const pixelLayers = [stage.layers.enemies, stage.layers.shots, stage.layers.fx];
  function applyStyle() {
    const px = art.style === 'pixel';
    for (const l of pixelLayers) l.filters = px ? [pixelate] : null;
    pixelate.size = Math.max(2, Math.round((stage.view.U * 2) / 36));
    blocks.refresh();
    roam.refresh();
    for (const b of switcher.querySelectorAll('button')) b.classList.toggle('on', b.dataset.style === art.style);
  }

  const switcher = document.createElement('div');
  switcher.className = 'kv-style';
  switcher.innerHTML = STYLES.map(([k, label]) => `<button data-style="${k}">${label}</button>`).join('');
  switcher.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.stopPropagation();
    art.setStyle(b.dataset.style);
    const u = new URL(location.href);
    u.searchParams.set('style', art.style);
    history.replaceState(null, '', u);
    applyStyle();
  });

  function placeSwitcher() {
    // the empty strip left of the board, level with the top of the field
    const left = stage.toClient(-GRID.cell * 2 - 0.1, 0).x;
    const w = Math.max(50, Math.min(64, left - 12));
    switcher.style.width = `${w}px`;
    switcher.style.left = `${Math.max(6, left - w - 6)}px`;
    switcher.style.top = `${stage.toClient(0, FIELD.spawnY - 1.4).y}px`;
  }
  stage.onResize(() => {
    applyStyle();
    placeSwitcher();
  });
  placeSwitcher();
  applyStyle();

  let lull = 0;
  return {
    roam,
    preset(run) {
      for (const [tier, col, row, cls] of PRESET) {
        const t = run.spawnDebug(tier, col, row);
        t.cls = { ...cls };
        t.prof = null;
      }
      run.addCoins(999);
      run.nextWave();
      return run;
    },
    update(run, dt) {
      // keep the showcase busy: the next wave comes 2 s after a clear
      if (run.phase !== 'wave' && !run.over && !run.pendingChoice) {
        lull += dt;
        if (lull > 2) {
          lull = 0;
          run.nextWave();
        }
      } else lull = 0;
      if (!params.has('embed') && !switcher.isConnected) hudEl.appendChild(switcher);
      // the showcase never loses: blocks still flash when hit, but hold their health
      for (const t of run.tiles) t.hp = t.maxHp;
      pets.update(run, dt);
    },
    onEvent(e) {
      pets.onEvent(e);
    },
    reset() {
      pets.reset();
    },
  };
}
