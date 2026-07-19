// estate.js — data-driven ZONE SPECS for the whole estate (Phase C).
// Each spec: { id, name, kind, style, size:{w,h,d}, ground?, cam?, fixtures?, placed[], doors[], tick? }
// Fixtures are bespoke built-in structure (non-movable); placed[] are catalogue items
// (default furnishing — movable/restyleable). Filled out incrementally — see PROGRESS.md.

import * as THREE from 'three';
import { box, cyl, sph, plane, group, canvasTexture } from './util.js';
import { sMat, styleColor } from './styles.js';
import './catalog_estate.js';   // registers the estate-specific catalogue items

// ── shared fixture helpers ──────────────────────────────────────
// a boundary fence ring around an outdoor zone (non-movable structure)
function fenceRing(root, w, d, style, opts = {}) {
  const m = sMat(style, 'light'); const gap = opts.gate ?? 0; // gate gap centred on +z front edge
  const post = (x, z) => { root.add(box(0.12, 1.05, 0.12, sMat(style, 'woodDark'), x, 0.52, z)); root.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4), sMat(style, 'woodDark')).translateY(1.12).translateX(x).translateZ(z)); };
  const rail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1); const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2; const ry = Math.atan2(x2 - x1, z2 - z1);
    [0.35, 0.72].forEach(y => root.add(box(0.05, 0.07, len, m, cx, y, cz, { ry })));
    const n = Math.round(len / 0.24);
    for (let i = 0; i <= n; i++) { const t = i / n; root.add(box(0.07, 0.9, 0.04, m, x1 + (x2 - x1) * t, 0.5, z1 + (z2 - z1) * t, { ry })); }
  };
  const hw = w / 2, hd = d / 2;
  rail(-hw, -hd, hw, -hd);            // back
  rail(-hw, -hd, -hw, hd);           // left
  rail(hw, -hd, hw, hd);             // right
  // front with a gate gap
  if (gap) { rail(-hw, hd, -gap / 2, hd); rail(gap / 2, hd, hw, hd); }
  else rail(-hw, hd, hw, hd);
  [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]].forEach(([x, z]) => post(x, z));
}

// a house facade behind a back-door so an outdoor zone reads as "attached to the house"
function houseFacade(root, z, style) {
  const brick = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#b06a44'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#8a4e30'; g.lineWidth = 4;
    for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); const off = (y / 32) % 2 ? 32 : 0; for (let x = off; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  }, { repeat: [6, 3] });
  root.add(plane(24, 8, new THREE.MeshStandardMaterial({ map: brick, roughness: 1 }), 0, 4, z - 0.15));
  // gable roof line
  const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 3, 4), sMat(style, 'accent'));
  roof.rotation.y = Math.PI / 4; roof.position.set(0, 9, z - 0.2); roof.scale.set(1, 1, 0.15); root.add(roof);
}

function stonePath(root, x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1); const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2; const ry = Math.atan2(x2 - x1, z2 - z1);
  const tex = canvasTexture(128, 256, (g) => {
    g.fillStyle = '#a89c86'; g.fillRect(0, 0, 128, 256);
    g.strokeStyle = '#877c68'; g.lineWidth = 5;
    for (let y = 0; y < 256; y += 42) { g.beginPath(); g.moveTo(0, y + (y / 42 % 2) * 20); g.lineTo(128, y + (y / 42 % 2) * 20); g.stroke(); }
  }, { repeat: [1, Math.round(len / 1.5)] });
  root.add(plane(1.4, len, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), cx, 0.02, cz, { rx: -Math.PI / 2, rz: ry }));
}

function shed(root, x, z, style) {
  const g = group(root, x, 0, z); g.rotation.y = -0.4;
  const wall = sMat(style, 'woodDark');
  g.add(box(2.4, 2.0, 2.0, wall, 0, 1.0, 0));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 3), sMat(style, 'accent'));
  roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.set(0, 2.3, 0); roof.scale.set(1, 1, 0.9); g.add(roof);
  g.add(box(0.8, 1.5, 0.06, sMat(style, 'wood'), -0.5, 0.75, 1.01));
  g.add(plane(0.6, 0.6, new THREE.MeshBasicMaterial({ color: 0x9ac0d0 }), 0.6, 1.2, 1.02));
  return g;
}

// ══════════════════════════ GARDEN ══════════════════════════
export const GARDEN = {
  id: 'garden', name: 'The Garden', kind: 'outdoor', style: 'bob',
  size: { w: 22, h: 8, d: 20 }, ground: 'grass',
  cam: { pos: [0, 3.6, 8.5], look: [0, 1.0, -2] },
  fixtures(root, { style, addObstacle }) {
    houseFacade(root, -9.9, style);
    fenceRing(root, 22, 20, style, { gate: 2.2 });
    stonePath(root, 0, -9, 0, 9.5);
    stonePath(root, 0, -1, 8, -1);
    shed(root, -8, -6, style);
    addObstacle(-8, -6, 1.8);   // the shed
  },
  placed: [
    { cat: 'tree', x: -7.5, z: -3, scale: 1.3 },
    { cat: 'tree', x: 7.5, z: -5, scale: 1.1, variant: 1 },
    { cat: 'tree', x: 6, z: 4, scale: 0.9 },
    { cat: 'hedge', x: -9.4, z: 4, ry: Math.PI / 2 },
    { cat: 'hedge', x: 9.4, z: 4, ry: Math.PI / 2 },
    { cat: 'flowerbed', x: -3.5, z: 6.5 },
    { cat: 'flowerbed', x: 3.5, z: 6.5 },
    { cat: 'flowerbed', x: -6, z: -8, ry: 0.2 },
    { cat: 'garden-bench', x: 4.5, z: -1, ry: -Math.PI / 2 },
    { cat: 'bird-bath', x: -3, z: -3 },
    { cat: 'potted-plant', x: 1.6, z: 8.5 },
    { cat: 'potted-plant', x: -1.6, z: 8.5 },
  ],
  doors: [
    { target: 'kitchen', label: 'Back inside (Kitchen)', x: 0, z: -9.6, ry: 0, color: 0x3f9a4c },
    { target: 'pool', label: 'Gate to the Pool', x: 10.6, z: 0, ry: -Math.PI / 2, color: 0x2aa0d0 },
    { target: 'tennis', label: 'Gate to the Tennis Court', x: -10.6, z: 0, ry: Math.PI / 2, color: 0x3a7a4c },
    { target: 'bbq', label: 'Gate to the BBQ Patio', x: 0, z: 9.6, ry: Math.PI, color: 0xc8502c },
  ],
};

// helper: a wall window+curtains combo baked as fixtures (keeps it non-movable structure)
function wallWindow(root, x, z, ry, style) {
  const g = group(root, x, 1.9, z); g.rotation.y = ry;
  const sky = canvasTexture(128, 160, (c) => { const gr = c.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#bfe0f5'); gr.addColorStop(1, '#e8f0d0'); c.fillStyle = gr; c.fillRect(0, 0, 128, 160); c.fillStyle = '#fff'; c.beginPath(); c.arc(90, 40, 18, 0, 7); c.arc(108, 46, 13, 0, 7); c.fill(); });
  g.add(plane(1.5, 1.8, new THREE.MeshBasicMaterial({ map: sky }), 0, 0, 0.04));
  const fr = sMat(style, 'trim');
  g.add(box(1.7, 0.12, 0.12, fr, 0, 0.95, 0.06)); g.add(box(1.7, 0.14, 0.14, fr, 0, -0.95, 0.08));
  g.add(box(0.12, 2.0, 0.12, fr, -0.8, 0, 0.06)); g.add(box(0.12, 2.0, 0.12, fr, 0.8, 0, 0.06));
  g.add(box(0.06, 1.8, 0.1, fr, 0, 0, 0.07)); g.add(box(1.5, 0.06, 0.1, fr, 0, 0, 0.07));
  const l = new THREE.PointLight(0xfff0d0, 4, 6, 1.8); l.position.set(0, 0, 0.6); g.add(l);
}

// ══════════ INDOOR ESTATE ZONES ══════════
export const HALLWAY = {
  id: 'hallway', name: 'The Hallway', kind: 'room', style: 'bob', size: { w: 5, h: 4, d: 12 },
  cam: { pos: [0, 1.9, 5.4], look: [0, 1.4, -3] },
  fixtures(root, { style }) {
    // runner + a couple of pendant lights down the hall
    root.add(plane(2.2, 10, sMat(style, 'accent', { roughness: 1 }), 0, 0.02, 0, { rx: -Math.PI / 2 }));
    [-3, 1, 4].forEach(z => { const l = new THREE.PointLight(0xffe0b0, 5, 6, 1.7); l.position.set(0, 3.4, z); root.add(l); });
  },
  placed: [
    { cat: 'console-table', x: -2.35, z: -1, ry: Math.PI / 2 },
    { cat: 'mirror', x: -2.42, y: 1.35, z: -1, ry: Math.PI / 2 },
    { cat: 'coat-rack', x: 2.3, z: -4.5 },
    { cat: 'wall-art', x: 2.42, y: 1.5, z: 2, ry: -Math.PI / 2 },
    { cat: 'wall-art', x: -2.42, y: 1.5, z: 3.5, ry: Math.PI / 2, variant: 1 },
    { cat: 'potted-plant', x: 1.9, z: 5.2 },
    { cat: 'potted-plant', x: -1.9, z: 5.2 },
  ],
  doors: [
    { target: 'family', label: 'Into the Family Room', x: 0, z: -5.9, ry: 0 },
    { target: 'dining', label: 'To the Dining Room', x: -2.4, z: -3.5, ry: Math.PI / 2, color: 0x8a5a20 },
    { target: 'parents-bedroom', label: 'To the Main Bedroom', x: -2.4, z: 0, ry: Math.PI / 2, color: 0x8a5a20 },
    { target: 'gym', label: 'To the Gym', x: -2.4, z: 3.5, ry: Math.PI / 2, color: 0x8a5a20 },
    { target: 'kids-bedroom', label: "To the Kids' Room", x: 2.4, z: -3.5, ry: -Math.PI / 2, color: 0xd8a838 },
    { target: 'bathroom', label: 'To the Bathroom', x: 2.4, z: 0, ry: -Math.PI / 2, color: 0x8a5a20 },
    { target: 'games-room', label: 'To the Games Room', x: 2.4, z: 3.5, ry: -Math.PI / 2, color: 0xc84030 },
  ],
};

export const DINING = {
  id: 'dining', name: 'The Dining Room', kind: 'room', style: 'bob', size: { w: 9, h: 4.2, d: 7 },
  fixtures(root, { style }) { wallWindow(root, 0, -3.4, 0, style); },
  placed: [
    { cat: 'dining-table', x: 0, z: 0 },
    { cat: 'dining-chair', x: -0.9, z: 0.9, ry: Math.PI }, { cat: 'dining-chair', x: 0, z: 0.9, ry: Math.PI }, { cat: 'dining-chair', x: 0.9, z: 0.9, ry: Math.PI },
    { cat: 'dining-chair', x: -0.9, z: -0.9 }, { cat: 'dining-chair', x: 0, z: -0.9 }, { cat: 'dining-chair', x: 0.9, z: -0.9 },
    { cat: 'sideboard', x: 3.4, z: -2.6, ry: -Math.PI / 2 },
    { cat: 'rug', x: 0, z: 0 },
    { cat: 'pendant-lamp', x: 0, y: 3.4, z: 0 },
    { cat: 'wall-art', x: -4.4, y: 1.6, z: 0, ry: Math.PI / 2 },
    { cat: 'potted-plant', x: -3.6, z: 2.6 },
  ],
  doors: [{ target: 'hallway', label: 'Back to the Hallway', x: 4.4, z: 1.6, ry: -Math.PI / 2, color: 0x8a5a20 }],
};

export const PARENTS_BEDROOM = {
  id: 'parents-bedroom', name: 'The Main Bedroom', kind: 'room', style: 'bob', size: { w: 9, h: 4.2, d: 7.5 },
  fixtures(root, { style }) { wallWindow(root, 3, -3.7, 0, style); },
  placed: [
    { cat: 'double-bed', x: 0, z: -2 },
    { cat: 'side-table', x: -1.6, z: -2.6 }, { cat: 'table-lamp', x: -1.6, y: 0.72, z: -2.6 },
    { cat: 'side-table', x: 1.6, z: -2.6 }, { cat: 'table-lamp', x: 1.6, y: 0.72, z: -2.6 },
    { cat: 'wardrobe', x: -3.6, z: -2, ry: Math.PI / 2 },
    { cat: 'dresser', x: 3.3, z: 2, ry: -Math.PI / 2 }, { cat: 'mirror', x: 4.4, y: 1.6, z: 2, ry: -Math.PI / 2 },
    { cat: 'rug', x: 0, z: 1.4 },
    { cat: 'wall-art', x: 0, y: 2.2, z: -3.6, variant: 1 },
    { cat: 'potted-plant', x: -3.6, z: 2.6 },
  ],
  doors: [
    { target: 'hallway', label: 'Back to the Hallway', x: -4.4, z: 2.4, ry: Math.PI / 2, color: 0x8a5a20 },
    { target: 'bathroom', label: 'Ensuite Bathroom', x: 4.4, z: -2.4, ry: -Math.PI / 2, color: 0xdfe0e4 },
  ],
};

export const KIDS_BEDROOM = {
  id: 'kids-bedroom', name: "The Kids' Room", kind: 'room', style: 'retro', size: { w: 8.5, h: 4, d: 7 },
  fixtures(root, { style }) { wallWindow(root, 2.6, -3.4, 0, style); },
  placed: [
    { cat: 'bunk-bed', x: -2.6, z: -1.6, ry: Math.PI / 2 },
    { cat: 'toybox', x: 2.6, z: 2 },
    { cat: 'desk', x: 2.4, z: -2.2, ry: -Math.PI / 2 }, { cat: 'dining-chair', x: 1.6, z: -2.2, ry: Math.PI / 2 },
    { cat: 'round-rug', x: 0, z: 1 },
    { cat: 'poster', x: 0, y: 2.0, z: -3.4 }, { cat: 'poster', x: 2.2, y: 2.0, z: -3.4, variant: 1, color: 0x3fb0c0 },
    { cat: 'potted-plant', x: -3.4, z: 2.6 },
    { cat: 'pendant-lamp', x: 0, y: 3.2, z: 0, color: 0xf0b030 },
  ],
  doors: [{ target: 'hallway', label: 'Back to the Hallway', x: 4.2, z: 2.2, ry: -Math.PI / 2, color: 0xe86a50 }],
};

export const BATHROOM = {
  id: 'bathroom', name: 'The Bathroom', kind: 'room', style: 'modern', size: { w: 7, h: 4, d: 6 },
  fixtures(root, { style }) {
    // tiled wainscot band
    root.add(box(7, 1.4, 0.06, sMat(style, 'glass'), 0, 0.7, -2.97, { cast: false }));
    wallWindow(root, 2, -2.9, 0, style);
  },
  placed: [
    { cat: 'bathtub', x: -1.8, z: -2, ry: 0 },
    { cat: 'toilet', x: 2.4, z: -2, ry: 0 },
    { cat: 'bathroom-sink', x: 2.6, z: 1.4, ry: -Math.PI / 2 }, { cat: 'mirror', x: 3.4, y: 1.5, z: 1.4, ry: -Math.PI / 2 },
    { cat: 'towel-rail', x: -3.4, y: 1.1, z: 0.5, ry: Math.PI / 2 },
    { cat: 'round-rug', x: 0, z: 1.4, scale: 0.7, color: 0x5a7a6a },
    { cat: 'potted-plant', x: -2.8, z: 2.2, scale: 0.8 },
  ],
  doors: [
    { target: 'hallway', label: 'Back to the Hallway', x: -3.4, z: 2, ry: Math.PI / 2, color: 0xcfc8bc },
    { target: 'parents-bedroom', label: 'To the Main Bedroom', x: 3.4, z: -0.5, ry: -Math.PI / 2, color: 0xcfc8bc },
  ],
};

export const GAMES_ROOM = {
  id: 'games-room', name: 'The Games Room', kind: 'room', style: 'bob', size: { w: 10, h: 4.4, d: 8 },
  fixtures(root, { style }) {
    // neon accent strips
    [[-4.9, 0x34d6e0], [4.9, 0xd838a0]].forEach(([x, c]) => { const s = box(0.1, 0.1, 6, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4 }), x, 3.4, 0); root.add(s); const l = new THREE.PointLight(c, 3, 8, 2); l.position.set(x, 3.2, 0); root.add(l); });
  },
  placed: [
    { cat: 'pool-table', x: -1, z: 0.5 },
    { cat: 'arcade-cabinet', x: -4.2, z: -2.6, ry: Math.PI / 2 },
    { cat: 'arcade-cabinet', x: -4.2, z: -1, ry: Math.PI / 2, color: 0x2634a8 },
    { cat: 'foosball', x: 3, z: 1.6, ry: 0.3 },
    { cat: 'sofa', x: 3, z: -2.6, ry: Math.PI }, { cat: 'big-tv', x: 0, y: 1.7, z: -3.9 },
    { cat: 'bookshelf', x: 4.9, y: 0, z: 2.6, ry: -Math.PI / 2 },
    { cat: 'rug', x: -1, z: 0.5, color: 0x2a2340 },
  ],
  doors: [
    { target: 'hallway', label: 'Back to the Hallway', x: -4.9, z: 3, ry: Math.PI / 2, color: 0xc84030 },
    { target: 'cinema-room', label: 'To the Cinema', x: 4.9, z: -2.8, ry: -Math.PI / 2, color: 0x2a2622 },
  ],
};

export const CINEMA_ROOM = {
  id: 'cinema-room', name: 'The Cinema Room', kind: 'room', style: 'haunted', size: { w: 9, h: 4.2, d: 9 },
  fixtures(root, { style }) {
    // ambient down-glow only; the screen is the light source
    root.add(plane(9, 9, sMat(style, 'floor', { roughness: 1 }), 0, 0.03, 0, { rx: -Math.PI / 2 }));
  },
  placed: [
    { cat: 'cinema-screen', x: 0, y: 2.2, z: -4.3 },
    { cat: 'cinema-seat', x: -1.6, z: 0 }, { cat: 'cinema-seat', x: 0, z: 0 }, { cat: 'cinema-seat', x: 1.6, z: 0 },
    { cat: 'cinema-seat', x: -1.6, z: 1.8 }, { cat: 'cinema-seat', x: 0, z: 1.8 }, { cat: 'cinema-seat', x: 1.6, z: 1.8 },
    { cat: 'popcorn-machine', x: -3.6, z: 2.6 },
    { cat: 'projector', x: 0, y: 3.9, z: 2 },
    { cat: 'curtains', x: -4.3, y: 1.2, z: -2, ry: Math.PI / 2, color: 0x5a1820 },
    { cat: 'curtains', x: 4.3, y: 1.2, z: -2, ry: -Math.PI / 2, color: 0x5a1820 },
    { cat: 'sconce', x: -4.4, y: 2.2, z: 2, ry: Math.PI / 2, color: 0xd86020 }, { cat: 'sconce', x: 4.4, y: 2.2, z: 2, ry: -Math.PI / 2, color: 0xd86020 },
  ],
  doors: [
    { target: 'games-room', label: 'Back to the Games Room', x: -4.4, z: 3.2, ry: Math.PI / 2, color: 0x2a2622 },
    { target: 'music-room', label: 'To the Music Room', x: 4.4, z: 3.2, ry: -Math.PI / 2, color: 0x7a4a28 },
  ],
};

export const MUSIC_ROOM = {
  id: 'music-room', name: 'The Music Room', kind: 'room', style: 'cozy', size: { w: 9, h: 4.2, d: 7.5 },
  fixtures(root, { style }) {
    // acoustic panels on the back wall
    for (let i = 0; i < 5; i++) root.add(box(1.2, 1.6, 0.08, sMat(style, i % 2 ? 'accent2' : 'woodDark'), -3.4 + i * 1.7, 2.6, -3.68));
    wallWindow(root, 3.2, -3.68, 0, style);
  },
  placed: [
    { cat: 'piano', x: -2.6, y: 0, z: -2.6 },
    { cat: 'drum-kit', x: 2.6, z: -1.6 },
    { cat: 'guitar-stand', x: -3.6, z: 1.6 }, { cat: 'guitar-stand', x: -2.6, z: 1.8, color: 0x2634a8 },
    { cat: 'amp', x: 1, z: 2.4, ry: -0.3 },
    { cat: 'stool', x: -2.6, z: -1.7 },
    { cat: 'rug', x: 0, z: 0.8, color: 0x8a3020 },
    { cat: 'pendant-lamp', x: 0, y: 3.4, z: 0 },
  ],
  doors: [{ target: 'cinema-room', label: 'To the Cinema', x: -4.4, z: 2.4, ry: Math.PI / 2, color: 0x7a4a28 }],
};

export const GYM = {
  id: 'gym', name: 'The Gym', kind: 'room', style: 'modern', size: { w: 9.5, h: 4.2, d: 8 },
  fixtures(root, { style }) {
    // speckled rubber-mat floor (mid grey so the dark equipment reads against it)
    const rub = canvasTexture(128, 128, (g) => { g.fillStyle = '#484c54'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 300; i++) { g.fillStyle = ['#3e424a', '#54585f', '#42464d'][i % 3]; g.fillRect((i * 53) % 128, (i * 89) % 128, 3, 3); } }, { repeat: [4, 4] });
    root.add(plane(9.5, 8, new THREE.MeshStandardMaterial({ map: rub, roughness: 1 }), 0, 0.03, 0, { rx: -Math.PI / 2 }));
    const fill = new THREE.PointLight(0xffffff, 10, 14, 1.5); fill.position.set(0, 3.4, 1.5); root.add(fill);
  },
  placed: [
    { cat: 'treadmill', x: -2.6, z: -1.6 },
    { cat: 'exercise-bike', x: 0.4, z: -1.6 },
    { cat: 'weight-rack', x: 0, y: 0, z: -3.6 },
    { cat: 'bench', x: 2.8, z: 0.5, ry: Math.PI / 2 },
    { cat: 'floor-mirror-wall', x: -4.65, y: 0, z: 0.5, ry: Math.PI / 2 },
    { cat: 'water-cooler', x: 4.4, z: -3, ry: -Math.PI / 2 },
    { cat: 'wall-clock', x: 0, y: 3, z: -3.9 },
  ],
  doors: [
    { target: 'hallway', label: 'Back to the Hallway', x: 4.65, z: 3, ry: -Math.PI / 2, color: 0xcfc8bc },
    { target: 'yoga-room', label: 'To the Yoga Studio', x: 0, z: 3.9, ry: Math.PI, color: 0x6a7358 },
  ],
};

export const YOGA_ROOM = {
  id: 'yoga-room', name: 'The Yoga Studio', kind: 'room', style: 'japandi', size: { w: 8.5, h: 4, d: 7 },
  fixtures(root, { style }) { wallWindow(root, -2.6, -3.4, 0, style); wallWindow(root, 2.6, -3.4, 0, style); },
  placed: [
    { cat: 'yoga-mat', x: -1.6, z: 0.5 }, { cat: 'yoga-mat', x: 0, z: 0.5, color: 0xb0663c }, { cat: 'yoga-mat', x: 1.6, z: 0.5 },
    { cat: 'yoga-block', x: -1.6, z: 2 }, { cat: 'yoga-block', x: 0.2, z: 2 },
    { cat: 'floor-mirror-wall', x: 0, y: 0, z: -3.42 },
    { cat: 'water-feature', x: 3.4, z: 2.2 },
    { cat: 'tall-plant', x: -3.4, z: 2.2 }, { cat: 'tall-plant', x: 3.4, z: -2.4 },
  ],
  doors: [{ target: 'gym', label: 'Back to the Gym', x: -4.2, z: 2.4, ry: Math.PI / 2, color: 0x6a7358 }],
};

// ══════════ OUTDOOR ESTATE ZONES ══════════
function poolBasin(root, w, d, style) {
  const tile = new THREE.MeshStandardMaterial({ color: 0x2aa0d0, roughness: 0.3 });
  const coping = sMat(style, 'light', { roughness: 0.7 });
  const hw = w / 2, hd = d / 2, rim = 0.28;
  // coping frame
  [[0, -hd, w + rim * 2, rim * 2], [0, hd, w + rim * 2, rim * 2], [-hw, 0, rim * 2, d], [hw, 0, rim * 2, d]]
    .forEach(([x, z, bw, bd]) => root.add(box(bw, 0.3, bd, coping, x, 0.15, z)));
  // inner tiled walls (shallow depth illusion)
  [[0, -hd + 0.1, w, 0.06], [0, hd - 0.1, w, 0.06], [-hw + 0.1, 0, 0.06, d], [hw - 0.1, 0, 0.06, d]]
    .forEach(([x, z, bw, bd]) => root.add(box(bw, 0.5, bd, tile, x, -0.1, z)));
  root.add(box(w, 0.06, d, tile, 0, -0.28, 0)); // basin floor
  // animated water
  const causticTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#2fb0e0'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 30; i++) { g.beginPath(); const x = (i * 61) % 256, y = (i * 97) % 256; g.arc(x, y, 8 + (i % 4) * 6, 0, Math.PI * 1.3); g.stroke(); }
  }, { repeat: [3, 3] });
  const water = plane(w - 0.1, d - 0.1, new THREE.MeshStandardMaterial({ map: causticTex, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.2, color: 0x4ac0e8 }), 0, 0.16, 0, { rx: -Math.PI / 2 });
  root.add(water);
  return { water, causticTex };
}

export const POOL = {
  id: 'pool', name: 'The Swimming Pool', kind: 'outdoor', style: 'bob', size: { w: 22, h: 8, d: 18 }, ground: 'paving',
  cam: { pos: [0, 4.2, 9], look: [0, 0.5, -1] },
  fixtures(root, { style, addTick, addBox }) {
    const { water } = poolBasin(root, 9, 6, style);
    addTick((t) => { water.material.map.offset.set(t * 0.03, t * 0.02); water.material.opacity = 0.8 + Math.sin(t * 1.5) * 0.06; });
    // diving board platform end
    root.add(box(0.4, 1.0, 0.4, sMat(style, 'metal', { metal: 1 }), 0, 0.5, -3.6));
    addBox(0, 0, 4.8, 3.3);   // the pool + coping (rectangular — don't stroll across it)
  },
  placed: [
    { cat: 'diving-board', x: 0, z: -3.4 },
    { cat: 'lounger', x: -5, z: 3, ry: 0.2 }, { cat: 'lounger', x: -3.2, z: 3, ry: 0.1 },
    { cat: 'lounger', x: 5, z: 3, ry: -0.2 },
    { cat: 'parasol', x: -4, z: 4.6 },
    { cat: 'pool-ring', x: 2, z: 0.5 },
    { cat: 'potted-plant', x: 6, z: -3 }, { cat: 'potted-plant', x: -6, z: -3 },
    { cat: 'hedge', x: 9.4, z: 5, ry: Math.PI / 2 }, { cat: 'hedge', x: -9.4, z: 5, ry: Math.PI / 2 },
  ],
  doors: [{ target: 'garden', label: 'Back to the Garden', x: 0, z: 8.6, ry: Math.PI, color: 0x3f9a4c }],
};

export const TENNIS = {
  id: 'tennis', name: 'The Tennis Court', kind: 'outdoor', style: 'bob', size: { w: 22, h: 8, d: 22 }, ground: 'grass',
  cam: { pos: [0, 4.6, 11], look: [0, 0.6, -2] },
  fixtures(root, { style, THREE: T }) {
    // court surface + line markings
    const courtTex = canvasTexture(256, 512, (g) => {
      g.fillStyle = '#3a7a4c'; g.fillRect(0, 0, 256, 512);
      g.strokeStyle = '#f5f5f0'; g.lineWidth = 6;
      g.strokeRect(20, 20, 216, 472);
      g.beginPath(); g.moveTo(20, 256); g.lineTo(236, 256); g.stroke();       // net line
      g.strokeRect(48, 120, 160, 272);                                        // service boxes outer
      g.beginPath(); g.moveTo(128, 120); g.lineTo(128, 392); g.stroke();
      g.beginPath(); g.moveTo(48, 120); g.lineTo(208, 120); g.stroke(); g.beginPath(); g.moveTo(48, 392); g.lineTo(208, 392); g.stroke();
    });
    root.add(plane(11, 20, new THREE.MeshStandardMaterial({ map: courtTex, roughness: 1 }), 0, 0.02, 0, { rx: -Math.PI / 2 }));
    // net
    const netTex = canvasTexture(128, 32, (g) => { g.clearRect(0, 0, 128, 32); g.strokeStyle = 'rgba(240,240,240,0.8)'; g.lineWidth = 1; for (let x = 0; x < 128; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 32); g.stroke(); } for (let y = 0; y < 32; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } }, { repeat: [8, 1] });
    root.add(plane(11, 1.0, new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide }), 0, 0.5, 0));
    root.add(box(11, 0.06, 0.06, sMat(style, 'light'), 0, 1.0, 0));
    [[-5.5], [5.5]].forEach(([x]) => root.add(cyl(0.06, 0.06, 1.1, sMat(style, 'metalDark', { metal: 1 }), x, 0.55, 0, 8)));
    // perimeter cage fence (tall, dark mesh look via posts + rails)
    const post = sMat(style, 'metalDark', { metal: 1 });
    for (let z = -10; z <= 10; z += 2.5) { [[-10.5], [10.5]].forEach(([x]) => root.add(box(0.1, 3.2, 0.1, post, x, 1.6, z))); }
    for (let x = -10; x <= 10; x += 2.5) { [[-10.5], [10.5]].forEach(([z]) => root.add(box(0.1, 3.2, 0.1, post, x, 1.6, z))); }
  },
  placed: [
    { cat: 'garden-bench', x: 6.5, z: 4, ry: -Math.PI / 2 },
    { cat: 'garden-bench', x: -6.5, z: 4, ry: Math.PI / 2 },
    { cat: 'tree', x: 8.5, z: -7, scale: 1.2 }, { cat: 'tree', x: -8.5, z: -8 },
  ],
  doors: [{ target: 'garden', label: 'Back to the Garden', x: 0, z: 10.6, ry: Math.PI, color: 0x3f9a4c }],
};

export const BBQ = {
  id: 'bbq', name: 'The BBQ Patio', kind: 'outdoor', style: 'bob', size: { w: 18, h: 8, d: 16 }, ground: 'paving',
  cam: { pos: [0, 3.6, 8], look: [0, 0.8, -1] },
  fixtures(root, { style, addTick }) {
    // string lights overhead
    const bulbs = [];
    for (let i = 0; i <= 12; i++) { const x = -6 + i, y = 3 + Math.sin(i * 0.5) * 0.3; const b = sph(0.08, new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffcf70, emissiveIntensity: 3 }), x, y, -2, 6, 5); root.add(b); bulbs.push(b); }
    root.add(box(0.06, 3, 0.06, sMat(style, 'woodDark'), -6.5, 1.5, -2)); root.add(box(0.06, 3, 0.06, sMat(style, 'woodDark'), 6.5, 1.5, -2));
    const l = new THREE.PointLight(0xffd890, 8, 14, 1.6); l.position.set(0, 3, 0); root.add(l);
    addTick((t) => bulbs.forEach((b, i) => { b.material.emissiveIntensity = 2.4 + Math.sin(t * 2 + i) * 0.6; }));
  },
  placed: [
    { cat: 'grill', x: -1, z: -3 },
    { cat: 'picnic-table', x: 2, z: 1 },
    { cat: 'cooler', x: -3.5, z: -2.5 },
    { cat: 'parasol', x: 2, z: 1 },
    { cat: 'garden-bench', x: -4.5, z: 2, ry: Math.PI / 4 },
    { cat: 'potted-plant', x: 5, z: -3 }, { cat: 'potted-plant', x: -5, z: 3 },
    { cat: 'flowerbed', x: 5, z: 4 },
  ],
  doors: [{ target: 'garden', label: 'Back to the Garden', x: 0, z: 7.6, ry: Math.PI, color: 0x3f9a4c }],
};

export const ESTATE = [
  HALLWAY, DINING, PARENTS_BEDROOM, KIDS_BEDROOM, BATHROOM,
  GAMES_ROOM, CINEMA_ROOM, MUSIC_ROOM, GYM, YOGA_ROOM,
  GARDEN, POOL, TENNIS, BBQ,
];
