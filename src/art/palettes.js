// Element palettes with a hard limit (user rule, 2026-10-14): every creature of an
// element may only use colours from that element's palette, plus the four universal
// colours below. A creature picks at most 4 of its element's 6 colours (base, shade,
// light, accent): that is the room for variety inside one element.
// Fusions: body colours from parent A's palette, at most 2 accent colours from parent B's.
// `key` is the element's single identity colour (flat monotone icons, badges, UI), chosen
// so the eight differ by hue and, where hues are close (ice vs lightning), by lightness.

export const UNIVERSAL = [
  { hex: '#2B1D2E', role: 'outline / ink' },
  { hex: '#FFFAF2', role: 'sticker rim' },
  { hex: '#1A1420', role: 'eye dark' },
  { hex: '#FFFFFF', role: 'eye shine' },
];

export const ELEMENT_PALETTES = {
  fire: {
    key: '#F2662D', // the element's one identity colour: flat icons, badges, UI
    animal: 'Baby dragon',
    mood: 'embers, flame, heat',
    colors: [
      { hex: '#7A1E1A', role: 'deep shade' },
      { hex: '#C8352B', role: 'base red' },
      { hex: '#F2662D', role: 'flame orange' },
      { hex: '#FF9E3D', role: 'ember' },
      { hex: '#FFD24A', role: 'flame yellow' },
      { hex: '#FFE9BF', role: 'belly / glow' },
    ],
  },
  ice: {
    key: '#9BE7F5', // the element's one identity colour: flat icons, badges, UI
    animal: 'Orca',
    mood: 'deep water, glacier, frost',
    colors: [
      { hex: '#16223A', role: 'abyss (orca black)' },
      { hex: '#2B5A86', role: 'deep ice' },
      { hex: '#4FB3D9', role: 'glacier' },
      { hex: '#9BE7F5', role: 'frost cyan' },
      { hex: '#DDF7FC', role: 'snow' },
      { hex: '#F7FDFF', role: 'white patch' },
    ],
  },
  lightning: {
    key: '#3D8BFF', // the element's one identity colour: flat icons, badges, UI
    animal: 'Unicorn foal',
    mood: 'storm, neon spark',
    colors: [
      { hex: '#23185E', role: 'storm violet' },
      { hex: '#3B3FE0', role: 'electric indigo' },
      { hex: '#3D8BFF', role: 'neon blue' },
      { hex: '#8FC8FF', role: 'arc light' },
      { hex: '#FFE14D', role: 'spark yellow' },
      { hex: '#FFF7C2', role: 'flash' },
    ],
  },
  poison: {
    key: '#A35CF0', // the element's one identity colour: flat icons, badges, UI
    animal: 'Snake',
    mood: 'toxin, venom, acid',
    colors: [
      { hex: '#3A1660', role: 'deep venom' },
      { hex: '#6E2DB5', role: 'base purple' },
      { hex: '#A35CF0', role: 'violet' },
      { hex: '#D9B3FF', role: 'orchid light' },
      { hex: '#8FE53A', role: 'toxic green' },
      { hex: '#D8FF7A', role: 'acid glow' },
    ],
  },
  nature: {
    key: '#7CD15A', // the element's one identity colour: flat icons, badges, UI
    animal: 'Turtle',
    mood: 'forest, leaf, bloom',
    colors: [
      { hex: '#1F5A2E', role: 'forest shade' },
      { hex: '#3E9B47', role: 'leaf base' },
      { hex: '#7CD15A', role: 'spring green' },
      { hex: '#CDEFA2', role: 'new leaf' },
      { hex: '#8A5A33', role: 'bark' },
      { hex: '#FF9DB8', role: 'blossom' },
    ],
  },
  earth: {
    key: '#9C8268', // the element's one identity colour: flat icons, badges, UI
    animal: 'Ox calf',
    mood: 'stone, soil, sand',
    colors: [
      { hex: '#3B3029', role: 'deep stone' },
      { hex: '#6B5848', role: 'stone base' },
      { hex: '#9C8268', role: 'clay' },
      { hex: '#C9AF8C', role: 'sandstone' },
      { hex: '#EADBC0', role: 'bone / horn' },
      { hex: '#B8652F', role: 'ochre' },
    ],
  },
  wind: {
    key: '#56B8A8', // the element's one identity colour: flat icons, badges, UI
    animal: 'Bird',
    mood: 'sky, breeze, cloud',
    colors: [
      { hex: '#2F7A78', role: 'gust teal' },
      { hex: '#56B8A8', role: 'breeze' },
      { hex: '#9FE6D2', role: 'mint' },
      { hex: '#D8FAF0', role: 'mist' },
      { hex: '#FFFFFF', role: 'cloud' },
      { hex: '#B9D8F0', role: 'sky haze' },
    ],
  },
  metal: {
    key: '#F7BE1E', // the element's one identity colour: flat icons, badges, UI
    animal: 'Lion cub',
    mood: 'bright gold, polished treasure',
    colors: [
      { hex: '#9C6410', role: 'deep gold' },
      { hex: '#D99A16', role: 'antique gold' },
      { hex: '#F7BE1E', role: 'gold' },
      { hex: '#FFD84A', role: 'bright gold' },
      { hex: '#FFEC94', role: 'pale gold' },
      { hex: '#FFF7D1', role: 'gleam' },
    ],
  },
};

export const PALETTE_ORDER = ['fire', 'wind', 'nature', 'ice', 'poison', 'lightning', 'metal', 'earth'];

/** True when every colour used is inside the element's palette or the universal set. */
export function withinPalette(element, hexes) {
  const allowed = new Set([...ELEMENT_PALETTES[element].colors, ...UNIVERSAL].map((c) => c.hex.toUpperCase()));
  return hexes.every((h) => allowed.has(h.toUpperCase()));
}
