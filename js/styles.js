// styles.js — the first-class style/theme system.
//
// A STYLE is a named table of semantic colour slots + material feel. Every catalogue
// builder and every zone shell reads its colours from a style, so one object or a whole
// house restyles instantly by swapping the style name. The DEFAULT is always `bob` — the
// warm, chunky, saturated Microsoft Bob 1995 look the house already ships in.
//
// Slots (all hex ints). Builders pick the semantic slot that fits, never a raw colour:
//   Structure : wall wallB floor floorB ceil trim
//   Wood      : wood woodDark
//   Soft      : seat seatB fabric
//   Metal     : metal metalDark
//   Accent    : accent accent2
//   Neutral   : light dark stone glass
//   Feel      : wallRough metalness ambient ambientI  (mood)
//   Meta      : label swatch[] (theme-picker preview)

import * as THREE from 'three';

export const STYLES = {
  bob: {
    label: 'Bob 1995', swatch: [0xe8a34d, 0xc85030, 0x3f8a5c],
    wall: 0xe8a34d, wallB: 0xd99440, floor: 0xb98a50, floorB: 0x9a6e38, ceil: 0xf2ddb8, trim: 0xc07c2c,
    wood: 0x8a5a20, woodDark: 0x6e4520, seat: 0x5b6bb0, seatB: 0x7a4a9c, fabric: 0xc85030,
    metal: 0xe8b23a, metalDark: 0xc79020, accent: 0xc85030, accent2: 0x3f8a5c,
    light: 0xf2ddb8, dark: 0x201810, stone: 0xb98a50, glass: 0xbfe8f0,
    wallRough: 0.85, metalness: 0.7, ambient: 0xffe0c0, ambientI: 0.7,
  },
  castle: {
    label: 'Castle', swatch: [0x7c7566, 0x6e2018, 0xc8a24a],
    wall: 0x7c7566, wallB: 0x635c50, floor: 0x4a3826, floorB: 0x3a2c1c, ceil: 0x5c5648, trim: 0x5c4a2c,
    wood: 0x4a2c14, woodDark: 0x33200e, seat: 0x6e2018, seatB: 0x4a1810, fabric: 0x7a2828,
    metal: 0xc8a24a, metalDark: 0x8a6a2c, accent: 0xc8a24a, accent2: 0x2e4a5c,
    light: 0xcfc4a8, dark: 0x16120c, stone: 0x8a8474, glass: 0x9ac0d0,
    wallRough: 0.96, metalness: 0.6, ambient: 0x8a86a0, ambientI: 0.65,
  },
  postmodern: {
    label: 'Postmodern', swatch: [0x3f9080, 0x7a6fa8, 0xd97e2f],
    wall: 0x3f9080, wallB: 0x2e6a5e, floor: 0xefe8d0, floorB: 0xcbc0a0, ceil: 0x7a6fa8, trim: 0x7a6fa8,
    wood: 0xd97e2f, woodDark: 0xb9611c, seat: 0x7a6fa8, seatB: 0x5c5280, fabric: 0xc8402c,
    metal: 0xb8bcc0, metalDark: 0x8a8e94, accent: 0xc8402c, accent2: 0xe0b030,
    light: 0xefe8d0, dark: 0x2c2436, stone: 0xa8a090, glass: 0xcfeae4,
    wallRough: 0.88, metalness: 0.6, ambient: 0x9ac8c0, ambientI: 0.55,
  },
  retro: {
    label: 'Retro Atomic', swatch: [0x4fb3a8, 0xe86a50, 0xf0b030],
    wall: 0x4fb3a8, wallB: 0x3a9a90, floor: 0xe8e0d0, floorB: 0x3a3630, ceil: 0xf5eeda, trim: 0xe07050,
    wood: 0xc88a4a, woodDark: 0x9a6a34, seat: 0xe86a50, seatB: 0xc84a38, fabric: 0xf0b030,
    metal: 0xc8ccd0, metalDark: 0x9aa0a6, accent: 0xe86a50, accent2: 0x3fb0c0,
    light: 0xf5eeda, dark: 0x2a2824, stone: 0xbcb4a4, glass: 0xbfe8f0,
    wallRough: 0.7, metalness: 0.75, ambient: 0xd8f0ea, ambientI: 0.7,
  },
  haunted: {
    label: 'Haunted', swatch: [0x4a4658, 0x6a8a4a, 0x7a2828],
    wall: 0x4a4658, wallB: 0x363242, floor: 0x2a2632, floorB: 0x1c1826, ceil: 0x363048, trim: 0x3a3448,
    wood: 0x2e2820, woodDark: 0x1c180f, seat: 0x3a2e42, seatB: 0x281e30, fabric: 0x4a3a2c,
    metal: 0x6a6858, metalDark: 0x44423a, accent: 0x6a8a4a, accent2: 0x7a2828,
    light: 0xb0aec0, dark: 0x0e0c14, stone: 0x565264, glass: 0x6a8a7a,
    wallRough: 0.98, metalness: 0.4, ambient: 0x4a4a66, ambientI: 0.5,
  },
  pastoral: {
    label: 'Pastoral', swatch: [0xcdd6a8, 0xd69aa0, 0xd0563e],
    wall: 0xcdd6a8, wallB: 0xb2c088, floor: 0xc8a870, floorB: 0xa88a54, ceil: 0xf4eed6, trim: 0x9aad78,
    wood: 0xb08a58, woodDark: 0x8a6a40, seat: 0xd69aa0, seatB: 0xc07a82, fabric: 0xd0563e,
    metal: 0xd8c07a, metalDark: 0xa8945a, accent: 0xd0563e, accent2: 0x7a9ad0,
    light: 0xf4eed6, dark: 0x342c1e, stone: 0xc4bc9c, glass: 0xcfeae4,
    wallRough: 0.94, metalness: 0.5, ambient: 0xfff0d0, ambientI: 0.8,
  },
  sketch: {
    label: 'Sketch', swatch: [0xf0ebdd, 0x2a2620, 0x3a4a6a],
    wall: 0xf0ebdd, wallB: 0xe0d8c4, floor: 0xe0d8c4, floorB: 0xccc2a8, ceil: 0xfaf6ea, trim: 0x2a2620,
    wood: 0xcfc4aa, woodDark: 0x9a9078, seat: 0xd8cfb8, seatB: 0xbfb69c, fabric: 0xc8bfa4,
    metal: 0x8a857a, metalDark: 0x5c584e, accent: 0x3a4a6a, accent2: 0xa03828,
    light: 0xfaf6ea, dark: 0x201c16, stone: 0xd0c8b4, glass: 0xdce4e0,
    wallRough: 1.0, metalness: 0.2, ambient: 0xf4efe2, ambientI: 0.85,
  },
  space: {
    label: 'Space Age', swatch: [0x2a3050, 0x34d6e0, 0xd838a0],
    wall: 0x2a3050, wallB: 0x1c2038, floor: 0xd8dbe4, floorB: 0xa8adba, ceil: 0x20263e, trim: 0xaeb4c4,
    wood: 0xc0c6d4, woodDark: 0x8a90a0, seat: 0xe8ecef, seatB: 0xc4c8d0, fabric: 0x34d6e0,
    metal: 0xc0c6d4, metalDark: 0x8a90a0, accent: 0x34d6e0, accent2: 0xd838a0,
    light: 0xeef0f6, dark: 0x0c0f1e, stone: 0x565c74, glass: 0x9ae4ec,
    wallRough: 0.4, metalness: 0.85, ambient: 0x5a6aa0, ambientI: 0.6,
  },
  modern: {
    label: 'Modern', swatch: [0xe6e2da, 0x6a4a30, 0xd4864a],
    wall: 0xe6e2da, wallB: 0xd0ccc2, floor: 0xb89a72, floorB: 0x9a7c54, ceil: 0xf4f1ea, trim: 0xcfc8bc,
    wood: 0x6a4a30, woodDark: 0x4a3220, seat: 0x4a4a48, seatB: 0x35352f, fabric: 0xd4864a,
    metal: 0x8a8a88, metalDark: 0x5c5c58, accent: 0xd4864a, accent2: 0x5a7a6a,
    light: 0xf4f1ea, dark: 0x24221e, stone: 0xc8c2b6, glass: 0xcfe0e4,
    wallRough: 0.8, metalness: 0.6, ambient: 0xf0ece2, ambientI: 0.72,
  },
  cozy: {
    label: 'Cozy', swatch: [0xc88a5a, 0xb0563a, 0xd8a038],
    wall: 0xc88a5a, wallB: 0xac7346, floor: 0x8a5a34, floorB: 0x6e4526, ceil: 0xf0e2c8, trim: 0xa06840,
    wood: 0x7a4a28, woodDark: 0x5c3418, seat: 0xb0563a, seatB: 0x8e4228, fabric: 0xd8a038,
    metal: 0xc07840, metalDark: 0x945a2c, accent: 0xd8a038, accent2: 0x3f6a44,
    light: 0xf0e2c8, dark: 0x2c1e12, stone: 0xba9068, glass: 0xd0e0d4,
    wallRough: 0.92, metalness: 0.5, ambient: 0xffdcae, ambientI: 0.78,
  },
  'art-deco': {
    label: 'Art Deco', swatch: [0x1c5c4a, 0xc8a24a, 0x7a2848],
    wall: 0x1c5c4a, wallB: 0x134239, floor: 0x2a2620, floorB: 0x18150f, ceil: 0x1a4a3c, trim: 0xc8a24a,
    wood: 0x2a2018, woodDark: 0x18120c, seat: 0x7a2848, seatB: 0x561830, fabric: 0xc8a24a,
    metal: 0xd8b048, metalDark: 0xa8842c, accent: 0xe0b845, accent2: 0x0e3a4a,
    light: 0xefe6cc, dark: 0x16130e, stone: 0x7a746a, glass: 0x9ac0b8,
    wallRough: 0.6, metalness: 0.8, ambient: 0x8aa89c, ambientI: 0.62,
  },
  japandi: {
    label: 'Japandi', swatch: [0xe8e0d2, 0xb08a5a, 0x6a7358],
    wall: 0xe8e0d2, wallB: 0xd4ccb8, floor: 0xcbb088, floorB: 0xa8906a, ceil: 0xf2ece0, trim: 0xd8ccb8,
    wood: 0xb08a5a, woodDark: 0x8a6a42, seat: 0x8a8574, seatB: 0x6c685a, fabric: 0x6a7358,
    metal: 0x4a4640, metalDark: 0x2e2c28, accent: 0x6a7358, accent2: 0xb0663c,
    light: 0xf2ece0, dark: 0x2a2622, stone: 0xcac2b2, glass: 0xd4e0da,
    wallRough: 0.9, metalness: 0.35, ambient: 0xf0e8d8, ambientI: 0.74,
  },
};

export const STYLE_ORDER = ['bob', 'modern', 'cozy', 'castle', 'postmodern', 'retro',
  'pastoral', 'haunted', 'sketch', 'space', 'art-deco', 'japandi'];

export const DEFAULT_STYLE = 'bob';

export function getStyle(name) { return STYLES[name] || STYLES[DEFAULT_STYLE]; }

// resolve a semantic slot to a hex int for a given style (with graceful fallback chain)
export function styleColor(styleName, slot, fallback) {
  const s = getStyle(styleName);
  if (s[slot] != null) return s[slot];
  // sensible fallbacks so a builder can ask for a slot a style doesn't define
  const chain = { wallB: 'wall', floorB: 'floor', seatB: 'seat', woodDark: 'wood',
    metalDark: 'metal', accent2: 'accent', fabric: 'accent', stone: 'wall', glass: 'light' };
  if (chain[slot] && s[chain[slot]] != null) return s[chain[slot]];
  return fallback != null ? fallback : 0xcccccc;
}

// build a MeshStandardMaterial for a style slot.
// IMPORTANT: returns a FRESH material each call (never the shared util.mat cache), because
// catalogue builders routinely recolour the result via `m.color.setHex(color)`. A cached
// material would leak that mutation to every other object sharing the slot colour.
export function sMat(styleName, slot, opts = {}) {
  const s = getStyle(styleName);
  const color = styleColor(styleName, slot);
  const isMetal = slot === 'metal' || slot === 'metalDark' || opts.metal;
  const { metal, ...rest } = opts;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? (slot === 'wall' ? s.wallRough : (isMetal ? 0.32 : 0.82)),
    metalness: opts.metalness ?? (isMetal ? s.metalness : 0.02),
    emissive: opts.emissive ?? 0x000000,
    side: opts.side ?? THREE.FrontSide,
    ...(opts.map ? { map: opts.map } : {}),
  });
}

// a style may recolour: given a per-object explicit colour override, honour it; else style slot.
export function resolveColor(styleName, slot, override) {
  return override != null ? override : styleColor(styleName, slot);
}
