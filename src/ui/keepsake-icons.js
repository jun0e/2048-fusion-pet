// Keepsake icons (src/sim/keepsakes.js): small clay objects drawn as SVG, in the HUD's ink line
// and palette, so they read at 24–40 px. Built from constants only (safe for innerHTML).
const INK = '#2b1d2e';
const stroke = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

export const KEEPSAKE_ICONS = {
  // a steel fist, knuckles forward, on a leather cuff
  ironFist: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="9" y="25" width="14" height="5" rx="1.5" fill="#a0673d" ${stroke}/>
    <path d="M8 15.5a3 3 0 0 1 6 0V14a3 3 0 0 1 6 0v.5a3 3 0 0 1 6 0V20c0 3.3-2.7 6-6 6h-6.5C10.4 26 8 23.6 8 20.5z" fill="#c9d3e6" ${stroke}/>
    <path d="M14 15.5V19M20 14.5V18" fill="none" ${stroke}/>
    <path d="M8.5 19.5c1.8-1.6 5-1.8 7-.2" fill="none" ${stroke}/>
    <path d="M11 13.6a2.6 2.6 0 0 1 2.4-1.5M17 12.4a2.6 2.6 0 0 1 2.4-1.4M23 12.8a2.6 2.6 0 0 1 2.2-.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
  </svg>`,
  // a tied leather pouch with a gold coin
  coinPurse: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M11 10.5h10l-1.8-4.2c-.4-.9-1.3-1.3-2.2-1.3h-2c-.9 0-1.8.4-2.2 1.3z" fill="#c98a4b" ${stroke}/>
    <path d="M11.5 10.5C7 13 5 17 5.6 21.2 6.3 26 10.6 28 16 28s9.7-2 10.4-6.8c.6-4.2-1.4-8.2-5.9-10.7z" fill="#d99a58" ${stroke}/>
    <path d="M10.5 10.5h11" fill="none" stroke="#7a4a22" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="16" cy="19.5" r="4.6" fill="#ffd34a" ${stroke}/>
    <path d="M16 17.2v4.6" fill="none" stroke="#c47a10" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  // a red collar ring with steel spikes
  spikedCollar: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 2.5l2.2 4.3h-4.4zM29.5 16l-4.3 2.2v-4.4zM16 29.5l-2.2-4.3h4.4zM2.5 16l4.3-2.2v4.4zM25.5 6.5l-1 4.7-3.7-3.7zM25.5 25.5l-4.7-1 3.7-3.7zM6.5 25.5l1-4.7 3.7 3.7zM6.5 6.5l4.7 1-3.7 3.7z" fill="#c9d3e6" ${stroke}/>
    <circle cx="16" cy="16" r="9.2" fill="none" stroke="${INK}" stroke-width="7.6"/>
    <circle cx="16" cy="16" r="9.2" fill="none" stroke="#e05a4f" stroke-width="4.4"/>
    <circle cx="16" cy="25.2" r="2.4" fill="#ffd34a" ${stroke}/>
  </svg>`,
  // a four-leaf clover
  luckyClover: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 18c1 4 3 7.5 6.5 10" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M16 18c1 4 3 7.5 6.5 10" fill="none" stroke="#3f9a4a" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 16c-1.5-5.5-9-6.5-9.5-1.5-.4 4 4.6 4.6 9.5 1.5zM16 16c5.5-1.5 6.5-9 1.5-9.5-4-.4-4.6 4.6-1.5 9.5zM16 16c1.5 5.5 9 6.5 9.5 1.5.4-4-4.6-4.6-9.5-1.5zM16 16c-5.5 1.5-6.5 9-1.5 9.5 4 .4 4.6-4.6 1.5-9.5z" fill="#62c46b" ${stroke}/>
    <circle cx="16" cy="16" r="1.6" fill="#2f7d39"/>
  </svg>`,
  // a phoenix feather: a flame-coloured vane on a quill
  phoenixFeather: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M24.5 4.5C14 6 7.5 13.5 8.2 23.5l2.6-2.4 1.2 3.4 2.4-3 2 2.6 1.6-3.6 3 .8-.8-3.4 3.4-.6-2.2-2.6 3.2-1.4-2.8-2c2-2 2.6-4.4 2.7-6.8z" fill="#ff8a3d" ${stroke}/>
    <path d="M22.5 7.5C16 10 11.6 15 10.8 21.5" fill="none" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M24 5.5L5 28" fill="none" ${stroke}/>
  </svg>`,
  // a heavy boot stamping cracks into the ground
  quakeBoots: `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M3 29.5h7M12.5 29.5l2-2.5M22 29.5h7M18 29.5l-1.5-2.5" fill="none" ${stroke}/>
    <path d="M10 4h8v11.5l7.4 3.6c1.6.8 2.6 2.4 2.6 4.2V25H8.5v-6.5c0-1.6.6-2.6 1.5-3.5z" fill="#8a6a52" ${stroke}/>
    <path d="M8.5 22h19.5" fill="none" ${stroke}/>
    <path d="M10 8.5h8" fill="none" stroke="#c9a582" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 18l3 1.5" fill="none" stroke="#c9a582" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

/** A padlock over a locked keepsake. */
export const LOCK_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" stroke="${INK}" stroke-width="3"/>
  <rect x="7.5" y="13.5" width="17" height="13" rx="3" fill="#c9b8a4" ${stroke}/>
  <circle cx="16" cy="19.5" r="1.8" fill="${INK}"/>
</svg>`;

export const keepsakeIcon = (id) => KEEPSAKE_ICONS[id] ?? '';
