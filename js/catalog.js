// catalog.js — the placeable-object catalogue (the Home Designer's parts bin).
//
// Each definition: { id, name, category, icon, tags, footprint:{w,d}, snap, build(opts) }
//   build(opts) -> THREE.Group, opts = { style, color, scale, variant }
// Every builder is authored STYLE-FIRST: it reads colours from the active style via
// sMat()/S() so the same object restyles coherently (default style = 'bob').
//
// build(id, opts) is the public constructor used by zones + designer; it stamps
// userData.catalogId/opts so a placed item persists + rebuilds from data.

import * as THREE from 'three';
import { box, cyl, sph, plane, group, canvasTexture } from './util.js';
import { sMat, styleColor, resolveColor, getStyle } from './styles.js';

const CATALOG = new Map();
export const CATEGORIES = ['Seating', 'Tables', 'Beds', 'Storage', 'Lighting', 'Rugs',
  'Windows & Doors', 'Appliances', 'Electronics', 'Kitchen', 'Bathroom', 'Plants',
  'Decor', 'Outdoor', 'Garden', 'Pool', 'Sports & Games', 'Bob Classics', 'Real Apps'];

export function register(def) {
  CATALOG.set(def.id, {
    category: 'Decor', icon: '📦', footprint: { w: 1, d: 1 }, snap: 'floor', tags: [], ...def,
  });
  return def;
}
export function get(id) { return CATALOG.get(id); }
export function list() { return [...CATALOG.values()]; }
export function byCategory(cat) { return list().filter(d => d.category === cat); }
export function categoriesPresent() { return CATEGORIES.filter(c => byCategory(c).length); }

// Build a live object from the catalogue. Stamps identity for persistence.
export function build(id, opts = {}) {
  const def = CATALOG.get(id);
  if (!def) { console.warn('[catalog] no such item', id); return null; }
  const o = { style: 'bob', scale: 1, variant: 0, ...opts };
  const g = def.build(o) || new THREE.Group();
  if (o.scale && o.scale !== 1) g.scale.multiplyScalar(o.scale);
  g.userData.catalogId = id;
  g.userData.catalogOpts = { style: o.style, color: o.color ?? null, scale: o.scale, variant: o.variant };
  g.userData.footprint = def.footprint;
  return g;
}

// ── tiny shared helpers ─────────────────────────────────────────
const S = (style, slot, override) => resolveColor(style, slot, override);
// a faux "reflection" texture so mirrors read as bright silvered glass (no env map needed)
function mirrorTex() {
  return canvasTexture(128, 256, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#eef4f6'); grd.addColorStop(0.42, '#cdd8de'); grd.addColorStop(0.55, '#aebac2'); grd.addColorStop(1, '#c8bfa8');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(20, 0); g.lineTo(70, 0); g.lineTo(30, 256); g.lineTo(-20, 256); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(90, 0); g.lineTo(110, 0); g.lineTo(70, 256); g.lineTo(50, 256); g.closePath(); g.fill();
  });
}
const mirrorMat = () => new THREE.MeshStandardMaterial({ map: mirrorTex(), metalness: 0.6, roughness: 0.12 });
// primary colour = explicit override, else the style's fabric/seat accent
function legs(g, w, d, h, m, inset = 0.08) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
    g.add(box(0.09, h, 0.09, m, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset))));
}
function fabricTex(base, accent, kind = 'plaid') {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#' + accent.toString(16).padStart(6, '0');
    if (kind === 'plaid') {
      g.globalAlpha = 0.5;
      for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 24, 256);
      for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 24);
      g.globalAlpha = 0.85;
      for (let x = 40; x < 256; x += 64) g.fillRect(x, 0, 5, 256);
      for (let y = 40; y < 256; y += 64) g.fillRect(0, y, 256, 5);
    } else if (kind === 'dots') {
      g.globalAlpha = 0.6;
      for (let y = 20; y < 256; y += 40) for (let x = 20; x < 256; x += 40) { g.beginPath(); g.arc(x + (y / 40 % 2) * 20, y, 7, 0, 7); g.fill(); }
    } else if (kind === 'stripe') {
      g.globalAlpha = 0.5; for (let x = 0; x < 256; x += 40) g.fillRect(x, 0, 20, 256);
    }
    g.globalAlpha = 1;
  }, { repeat: [1, 1] });
}

// ════════════════════════ SEATING ════════════════════════
register({
  id: 'sofa', name: 'Sofa', category: 'Seating', icon: '🛋️', snap: 'floor',
  footprint: { w: 2.5, d: 1.1 }, tags: ['couch', 'settee', 'plaid'],
  build({ style, color, variant }) {
    const g = new THREE.Group();
    const st = getStyle(style);
    const base = S(style, 'seat', color);
    const useTex = variant !== 1;
    const m = useTex
      ? new THREE.MeshStandardMaterial({ map: fabricTex(base, S(style, 'seatB'), variant === 2 ? 'stripe' : 'plaid'), roughness: 1 })
      : sMat(style, 'seat', { roughness: 1, ...(color ? { } : {}) });
    if (!useTex && color) m.color.setHex(color);
    g.add(box(2.5, 0.5, 1.05, m, 0, 0.3, 0));
    g.add(box(2.5, 0.85, 0.32, m, 0, 0.85, -0.44));
    g.add(box(0.34, 0.75, 1.05, m, -1.25, 0.63, 0));
    g.add(box(0.34, 0.75, 1.05, m, 1.25, 0.63, 0));
    [[-0.6], [0.6]].forEach(([cx]) => g.add(box(1.06, 0.22, 0.9, m, cx, 0.62, 0.03)));
    g.add(box(0.5, 0.42, 0.18, sMat(style, 'light'), -0.55, 1.0, -0.38, { rz: 0.3 }));
    g.add(box(0.5, 0.42, 0.18, sMat(style, 'accent2'), 0.6, 1.0, -0.38, { rz: -0.25 }));
    return g;
  },
});
register({
  id: 'armchair', name: 'Armchair', category: 'Seating', icon: '💺', snap: 'floor',
  footprint: { w: 1.05, d: 0.95 }, tags: ['chair', 'wicker'],
  build({ style, color }) {
    const g = new THREE.Group();
    const m = sMat(style, 'seat', { roughness: 1 }); if (color) m.color.setHex(color);
    const wood = sMat(style, 'wood');
    g.add(box(1.05, 0.16, 0.95, m, 0, 0.42, 0));
    g.add(box(1.05, 1.05, 0.14, m, 0, 0.95, -0.42));
    g.add(box(0.18, 0.6, 0.9, m, -0.5, 0.72, 0));
    g.add(box(0.18, 0.6, 0.9, m, 0.5, 0.72, 0));
    [[-0.42, -0.35], [0.42, -0.35], [-0.42, 0.35], [0.42, 0.35]].forEach(([lx, lz]) =>
      g.add(cyl(0.05, 0.05, 0.42, wood, lx, 0.21, lz, 10)));
    g.add(box(0.9, 0.16, 0.82, sMat(style, 'accent2'), 0, 0.52, 0.02));
    return g;
  },
});
register({
  id: 'dining-chair', name: 'Dining Chair', category: 'Seating', icon: '🪑', snap: 'floor',
  footprint: { w: 0.5, d: 0.5 }, tags: ['chair'],
  build({ style, color }) {
    const g = new THREE.Group();
    const wood = sMat(style, 'wood'); const seat = sMat(style, 'seat'); if (color) seat.color.setHex(color);
    g.add(box(0.46, 0.07, 0.46, seat, 0, 0.5, 0));
    g.add(box(0.46, 0.6, 0.07, wood, 0, 0.8, -0.2));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      g.add(box(0.06, 0.5, 0.06, wood, sx * 0.19, 0.25, sz * 0.19)));
    return g;
  },
});
register({
  id: 'stool', name: 'Stool', category: 'Seating', icon: '🪑', snap: 'floor',
  footprint: { w: 0.5, d: 0.5 }, tags: ['bar', 'seat'],
  build({ style, color }) {
    const g = new THREE.Group();
    const wood = sMat(style, 'wood'); const seat = sMat(style, 'seat'); if (color) seat.color.setHex(color);
    g.add(cyl(0.22, 0.22, 0.08, seat, 0, 0.66, 0, 18));
    [[0, 0]].forEach(() => g.add(cyl(0.05, 0.06, 0.62, wood, 0, 0.33, 0, 10)));
    g.add(cyl(0.24, 0.24, 0.03, wood, 0, 0.03, 0, 18));
    g.add(cyl(0.18, 0.18, 0.03, wood, 0, 0.28, 0, 16));
    return g;
  },
});
register({
  id: 'bench', name: 'Bench', category: 'Seating', icon: '🛋️', snap: 'floor',
  footprint: { w: 1.6, d: 0.5 }, tags: ['seat'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    g.add(box(1.6, 0.1, 0.44, wood, 0, 0.46, 0));
    legs(g, 1.6, 0.44, 0.46, sMat(style, 'woodDark'), 0.12);
    return g;
  },
});

// ════════════════════════ TABLES ════════════════════════
register({
  id: 'coffee-table', name: 'Coffee Table', category: 'Tables', icon: '🪵', snap: 'floor',
  footprint: { w: 2.1, d: 1.05 }, tags: ['table'],
  build({ style, color }) {
    const g = new THREE.Group(); const top = sMat(style, 'accent2'); if (color) top.color.setHex(color);
    g.add(box(2.1, 0.09, 1.05, top, 0, 0.5, 0));
    legs(g, 2.1, 1.05, 0.5, sMat(style, 'woodDark'), 0.12);
    return g;
  },
});
register({
  id: 'dining-table', name: 'Dining Table', category: 'Tables', icon: '🍽️', snap: 'floor',
  footprint: { w: 2.4, d: 1.2 }, tags: ['table'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    g.add(box(2.4, 0.12, 1.2, wood, 0, 0.78, 0));
    legs(g, 2.4, 1.2, 0.78, sMat(style, 'woodDark'), 0.16);
    return g;
  },
});
register({
  id: 'side-table', name: 'Side Table', category: 'Tables', icon: '🪵', snap: 'floor',
  footprint: { w: 0.9, d: 0.9 }, tags: ['table', 'round'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    g.add(cyl(0.42, 0.46, 0.08, wood, 0, 0.72, 0, 20));
    g.add(cyl(0.07, 0.09, 0.72, sMat(style, 'woodDark'), 0, 0.36, 0, 12));
    g.add(cyl(0.28, 0.28, 0.03, sMat(style, 'woodDark'), 0, 0.02, 0, 16));
    return g;
  },
});
register({
  id: 'desk', name: 'Desk', category: 'Tables', icon: '🗄️', snap: 'floor',
  footprint: { w: 2.0, d: 1.0 }, tags: ['table', 'work'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    const dk = sMat(style, 'woodDark');
    g.add(box(2.0, 0.1, 1.0, wood, 0, 0.78, 0));
    g.add(box(0.6, 0.72, 0.9, dk, -0.65, 0.36, 0));
    g.add(box(0.6, 0.72, 0.9, dk, 0.65, 0.36, 0));
    [0.2, 0.45].forEach(y => g.add(box(0.5, 0.02, 0.02, sMat(style, 'metal', { metal: 1 }), 0.65, y, 0.46)));
    g.add(plane(0.8, 0.55, sMat(style, 'accent2'), 0, 0.845, 0, { rx: -Math.PI / 2 }));
    return g;
  },
});
register({
  id: 'coffee-table-round', name: 'Round Table', category: 'Tables', icon: '⚪', snap: 'floor',
  footprint: { w: 1.2, d: 1.2 }, tags: ['table', 'round'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    g.add(cyl(0.6, 0.6, 0.08, wood, 0, 0.52, 0, 24));
    g.add(cyl(0.09, 0.11, 0.5, sMat(style, 'woodDark'), 0, 0.26, 0, 14));
    g.add(cyl(0.34, 0.34, 0.04, sMat(style, 'woodDark'), 0, 0.03, 0, 18));
    return g;
  },
});

// ════════════════════════ BEDS ════════════════════════
register({
  id: 'double-bed', name: 'Double Bed', category: 'Beds', icon: '🛏️', snap: 'wall',
  footprint: { w: 2.2, d: 2.4 }, tags: ['bed'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood');
    const duvet = sMat(style, 'fabric'); if (color) duvet.color.setHex(color);
    g.add(box(2.2, 0.4, 2.4, wood, 0, 0.3, 0));                 // base
    g.add(box(2.2, 0.9, 0.16, wood, 0, 0.75, -1.2));           // headboard
    g.add(box(2.08, 0.22, 2.3, duvet, 0, 0.6, 0.05));          // duvet
    g.add(box(2.08, 0.16, 0.5, sMat(style, 'light'), 0, 0.66, -0.9)); // folded top sheet
    [[-0.5], [0.5]].forEach(([px]) => g.add(box(0.7, 0.18, 0.42, sMat(style, 'light'), px, 0.7, -0.85)));
    return g;
  },
});
register({
  id: 'bunk-bed', name: 'Bunk Bed', category: 'Beds', icon: '🛏️', snap: 'wall',
  footprint: { w: 1.2, d: 2.2 }, tags: ['bed', 'kids'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood');
    const d1 = sMat(style, 'accent'), d2 = sMat(style, 'accent2'); if (color) d1.color.setHex(color);
    [[0.4], [1.5]].forEach(([y], i) => {
      g.add(box(1.15, 0.16, 2.15, wood, 0, y, 0));
      g.add(box(1.05, 0.16, 2.0, i ? d2 : d1, 0, y + 0.14, 0.03));
      g.add(box(0.55, 0.14, 0.4, sMat(style, 'light'), 0, y + 0.2, -0.78));
    });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      g.add(box(0.1, 2.0, 0.1, sMat(style, 'woodDark'), sx * 0.55, 1.0, sz * 1.0)));
    g.add(box(0.08, 1.1, 0.08, sMat(style, 'woodDark'), 0.5, 0.95, 0.6, { rz: 0.5 })); // ladder rail
    return g;
  },
});
register({
  id: 'single-bed', name: 'Single Bed', category: 'Beds', icon: '🛏️', snap: 'wall',
  footprint: { w: 1.1, d: 2.2 }, tags: ['bed'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood');
    const duvet = sMat(style, 'fabric'); if (color) duvet.color.setHex(color);
    g.add(box(1.1, 0.36, 2.2, wood, 0, 0.28, 0));
    g.add(box(1.1, 0.7, 0.14, wood, 0, 0.62, -1.1));
    g.add(box(1.0, 0.2, 2.1, duvet, 0, 0.52, 0.04));
    g.add(box(0.6, 0.16, 0.4, sMat(style, 'light'), 0, 0.6, -0.8));
    return g;
  },
});

// ════════════════════════ STORAGE ════════════════════════
register({
  id: 'bookshelf', name: 'Bookshelf', category: 'Storage', icon: '📚', snap: 'wall',
  footprint: { w: 1.5, d: 0.42 }, tags: ['shelf', 'books'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    const dk = sMat(style, 'woodDark');
    g.add(box(1.5, 2.4, 0.06, dk, 0, 1.2, -0.19));
    g.add(box(0.08, 2.4, 0.42, wood, -0.73, 1.2, 0));
    g.add(box(0.08, 2.4, 0.42, wood, 0.73, 1.2, 0));
    const cols = [0xd84a3a, 0xe0662c, 0x5a7ac0, 0x3f9a5c, 0xd8a838, 0xb83030, 0x8a5ac0];
    for (let s = 0; s < 4; s++) {
      const y = 0.35 + s * 0.62;
      g.add(box(1.42, 0.06, 0.42, wood, 0, y, 0));
      let x = -0.62;
      let i = s * 3;
      while (x < 0.6) {
        const bw = 0.06 + (i % 4) * 0.02, bh = 0.34 + (i % 3) * 0.08;
        g.add(box(bw, bh, 0.28, sMat(style, 'wood', { }), x, y + 0.03 + bh / 2, 0.03));
        g.children[g.children.length - 1].material = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.7 });
        x += bw + 0.015; i++;
      }
    }
    g.add(box(1.5, 0.08, 0.44, wood, 0, 2.42, 0));
    return g;
  },
});
register({
  id: 'wardrobe', name: 'Wardrobe', category: 'Storage', icon: '🚪', snap: 'wall',
  footprint: { w: 1.6, d: 0.65 }, tags: ['closet'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    const dk = sMat(style, 'woodDark'); const metal = sMat(style, 'metal', { metal: 1 });
    g.add(box(1.6, 2.4, 0.65, wood, 0, 1.2, 0));
    [[-0.4], [0.4]].forEach(([dx]) => {
      g.add(box(0.72, 2.2, 0.04, dk, dx, 1.2, 0.33));
      g.add(sph(0.05, metal, dx + (dx > 0 ? -0.28 : 0.28), 1.2, 0.38));
    });
    g.add(box(1.66, 0.14, 0.72, dk, 0, 2.42, 0));
    return g;
  },
});
register({
  id: 'dresser', name: 'Dresser', category: 'Storage', icon: '🗄️', snap: 'wall',
  footprint: { w: 1.4, d: 0.55 }, tags: ['drawers'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    const metal = sMat(style, 'metal', { metal: 1 });
    g.add(box(1.4, 1.1, 0.55, wood, 0, 0.55, 0));
    for (let r = 0; r < 3; r++) {
      g.add(box(1.28, 0.28, 0.04, sMat(style, 'woodDark'), 0, 0.28 + r * 0.34, 0.28));
      [-0.3, 0.3].forEach(dx => g.add(cyl(0.03, 0.03, 0.14, metal, dx, 0.28 + r * 0.34, 0.32, 8, { rz: Math.PI / 2 })));
    }
    g.add(box(1.44, 0.06, 0.6, sMat(style, 'woodDark'), 0, 1.13, 0));
    return g;
  },
});
register({
  id: 'cabinet', name: 'Cabinet', category: 'Storage', icon: '🗃️', snap: 'floor',
  footprint: { w: 1.1, d: 0.55 }, tags: ['cupboard'],
  build({ style, color }) {
    const g = new THREE.Group(); const wood = sMat(style, 'wood'); if (color) wood.color.setHex(color);
    g.add(box(1.1, 0.9, 0.55, wood, 0, 0.45, 0));
    [[-0.27], [0.27]].forEach(([dx]) => { g.add(box(0.5, 0.78, 0.04, sMat(style, 'woodDark'), dx, 0.45, 0.28)); g.add(sph(0.04, sMat(style, 'metal', { metal: 1 }), dx + (dx > 0 ? -0.18 : 0.18), 0.45, 0.32)); });
    return g;
  },
});
register({
  id: 'toybox', name: 'Toy Box', category: 'Storage', icon: '🧸', snap: 'floor',
  footprint: { w: 1.0, d: 0.6 }, tags: ['kids'],
  build({ style, color }) {
    const g = new THREE.Group(); const m = sMat(style, 'accent'); if (color) m.color.setHex(color);
    g.add(box(1.0, 0.6, 0.6, m, 0, 0.3, 0));
    g.add(box(1.04, 0.1, 0.64, sMat(style, 'accent2'), 0, 0.62, 0));
    g.add(box(0.5, 0.3, 0.02, sMat(style, 'light'), 0, 0.32, 0.31)); // painted panel
    return g;
  },
});

// ════════════════════════ LIGHTING ════════════════════════
function shadeMat(style) {
  const st = getStyle(style);
  return new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: st.accent, emissiveIntensity: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
}
register({
  id: 'floor-lamp', name: 'Floor Lamp', category: 'Lighting', icon: '💡', snap: 'floor',
  footprint: { w: 0.5, d: 0.5 }, tags: ['lamp', 'light'],
  build({ style, color }) {
    const g = new THREE.Group(); const metal = sMat(style, 'metal', { metal: 1 });
    g.add(cyl(0.2, 0.24, 0.05, metal, 0, 0.03, 0, 18));
    g.add(cyl(0.025, 0.025, 1.5, metal, 0, 0.77, 0, 10));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.36, 20, 1, true), shadeMat(style));
    if (color) shade.material.emissive.setHex(color);
    shade.position.y = 1.55; g.add(shade);
    const l = new THREE.PointLight(0xffd9a0, 7, 6, 1.8); l.position.set(0, 1.5, 0); g.add(l);
    return g;
  },
});
register({
  id: 'table-lamp', name: 'Table Lamp', category: 'Lighting', icon: '🛋️', snap: 'surface',
  footprint: { w: 0.4, d: 0.4 }, tags: ['lamp', 'light'],
  build({ style, color }) {
    const g = new THREE.Group(); const metal = sMat(style, 'metal', { metal: 1 });
    g.add(cyl(0.05, 0.16, 0.1, metal, 0, 0.05, 0, 16));
    g.add(cyl(0.025, 0.025, 0.4, metal, 0, 0.3, 0, 10));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.3, 20, 1, true), shadeMat(style));
    if (color) shade.material.emissive.setHex(color);
    shade.position.y = 0.58; g.add(shade);
    const l = new THREE.PointLight(0xffd9a0, 6, 5, 1.8); l.position.set(0, 0.6, 0); g.add(l);
    return g;
  },
});
register({
  id: 'pendant-lamp', name: 'Pendant Light', category: 'Lighting', icon: '💡', snap: 'ceiling',
  footprint: { w: 0.5, d: 0.5 }, tags: ['lamp', 'hanging'],
  build({ style, color }) {
    const g = new THREE.Group(); const metal = sMat(style, 'metal', { metal: 1 });
    g.add(cyl(0.01, 0.01, 0.7, metal, 0, -0.35, 0, 6));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12, 0, 7, 0, Math.PI / 2), metal);
    dome.position.y = -0.7; g.add(dome);
    const bulb = sph(0.08, new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: color ?? 0xffce70, emissiveIntensity: 4 }), 0, -0.78, 0);
    g.add(bulb);
    const l = new THREE.PointLight(0xffe0b0, 8, 7, 1.6); l.position.set(0, -0.85, 0); g.add(l);
    return g;
  },
});
register({
  id: 'sconce', mountY: 1.6,  name: 'Wall Sconce', category: 'Lighting', icon: '🕯️', snap: 'wall',
  footprint: { w: 0.3, d: 0.2 }, tags: ['light'],
  build({ style, color }) {
    const g = new THREE.Group(); const metal = sMat(style, 'metal', { metal: 1 });
    g.add(box(0.12, 0.24, 0.06, metal, 0, 0, 0));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.18, 14, 1, true), shadeMat(style));
    if (color) cup.material.emissive.setHex(color);
    cup.position.set(0, 0.12, 0.08); g.add(cup);
    const l = new THREE.PointLight(0xffcf90, 4, 4, 1.8); l.position.set(0, 0.16, 0.2); g.add(l);
    return g;
  },
});

// ════════════════════════ RUGS ════════════════════════
register({
  id: 'rug', name: 'Rug', category: 'Rugs', icon: '🟥', snap: 'rug',
  footprint: { w: 3.4, d: 2.4 }, tags: ['carpet'],
  build({ style, color, variant }) {
    const g = new THREE.Group();
    const base = S(style, 'fabric', color), border = S(style, 'accent2');
    g.add(plane(3.4, 2.4, sMat(style, 'accent', color ? { } : {}), 0, 0.012, 0, { rx: -Math.PI / 2 }));
    if (color) g.children[0].material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    g.add(plane(2.9, 1.9, new THREE.MeshStandardMaterial({ color: border, roughness: 1 }), 0, 0.02, 0, { rx: -Math.PI / 2 }));
    return g;
  },
});
register({
  id: 'round-rug', name: 'Round Rug', category: 'Rugs', icon: '⭕', snap: 'rug',
  footprint: { w: 2.4, d: 2.4 }, tags: ['carpet', 'round'],
  build({ style, color }) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: S(style, 'accent', color), roughness: 1 });
    const c = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), m); c.rotation.x = -Math.PI / 2; c.position.y = 0.012; g.add(c);
    const c2 = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshStandardMaterial({ color: S(style, 'light'), roughness: 1 }));
    c2.rotation.x = -Math.PI / 2; c2.position.y = 0.02; g.add(c2);
    return g;
  },
});

// ════════════════════════ PLANTS & DECOR ════════════════════════
register({
  id: 'potted-plant', name: 'Potted Plant', category: 'Plants', icon: '🪴', snap: 'floor',
  footprint: { w: 0.6, d: 0.6 }, tags: ['plant', 'greenery'],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(cyl(0.22, 0.16, 0.34, sMat(style, 'accent', color), 0, 0.17, 0, 16));
    g.add(cyl(0.02, 0.02, 0.5, sMat(style, 'woodDark'), 0, 0.5, 0, 6));
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3f9a4c, roughness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = 0.14 + (i % 3) * 0.06;
      g.add(sph(0.12, leaf, Math.cos(a) * r, 0.66 + (i % 4) * 0.1, Math.sin(a) * r, 8, 6));
    }
    return g;
  },
});
register({
  id: 'tall-plant', name: 'Tall Plant', category: 'Plants', icon: '🌿', snap: 'floor',
  footprint: { w: 0.7, d: 0.7 }, tags: ['plant', 'palm'],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(cyl(0.24, 0.2, 0.4, sMat(style, 'stone', color), 0, 0.2, 0, 16));
    g.add(cyl(0.04, 0.05, 1.3, sMat(style, 'woodDark'), 0, 0.9, 0, 8));
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3f9a4c, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.9), leaf);
      bl.position.set(Math.cos(a) * 0.18, 1.5, Math.sin(a) * 0.18);
      bl.rotation.set(0.8 * Math.cos(a), -a, 0.8 * Math.sin(a));
      g.add(bl);
    }
    return g;
  },
});
register({
  id: 'vase-flowers', name: 'Vase of Flowers', category: 'Decor', icon: '💐', snap: 'surface',
  footprint: { w: 0.5, d: 0.5 }, tags: ['flowers'],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(cyl(0.16, 0.22, 0.46, sMat(style, 'glass', color), 0, 0.23, 0, 16));
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      g.add(cyl(0.012, 0.012, 0.5, new THREE.MeshStandardMaterial({ color: 0x2f7a33 }), Math.cos(a) * 0.1, 0.6, Math.sin(a) * 0.1, 6, { rz: Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 }));
      g.add(sph(0.055, new THREE.MeshStandardMaterial({ color: i % 3 ? (color ?? 0xd82c2c) : 0xf5f0e0 }), Math.cos(a) * 0.19, 0.88 + (i % 3) * 0.06, Math.sin(a) * 0.19, 10, 8));
    }
    return g;
  },
});
register({
  id: 'wall-art', mountY: 1.5,  name: 'Wall Art', category: 'Decor', icon: '🖼️', snap: 'wall',
  footprint: { w: 0.9, d: 0.1 }, tags: ['painting', 'picture'],
  build({ style, color, variant }) {
    const g = new THREE.Group(); const frame = sMat(style, 'metal', { metal: 1 });
    g.add(box(0.94, 0.74, 0.05, frame, 0, 0, 0));
    const tex = canvasTexture(200, 160, (c) => {
      const st = getStyle(style);
      c.fillStyle = '#' + (color ?? st.light).toString(16).padStart(6, '0'); c.fillRect(0, 0, 200, 160);
      const cols = [st.accent, st.accent2, st.seat, st.wood].map(h => '#' + h.toString(16).padStart(6, '0'));
      if ((variant ?? 0) % 2 === 0) { // abstract blocks
        for (let i = 0; i < 6; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(20 + (i * 33 % 150), 20 + (i * 47 % 100), 40, 40); }
      } else { // landscape
        c.fillStyle = cols[1]; c.fillRect(0, 0, 200, 90);
        c.fillStyle = cols[3]; c.beginPath(); c.moveTo(0, 110); c.lineTo(70, 60); c.lineTo(140, 110); c.fill();
        c.fillStyle = cols[0]; c.fillRect(0, 100, 200, 60);
      }
    });
    g.add(plane(0.82, 0.62, new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0.03));
    return g;
  },
});
register({
  id: 'mirror', mountY: 1.35,  name: 'Mirror', category: 'Decor', icon: '🪞', snap: 'wall',
  footprint: { w: 0.8, d: 0.1 }, tags: [],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(box(0.84, 1.44, 0.06, sMat(style, 'metal', { metal: 1 }, color ? {} : {}), 0, 0, 0));
    g.add(plane(0.72, 1.32, mirrorMat(), 0, 0, 0.035));
    return g;
  },
});
register({
  id: 'wall-clock', mountY: 1.7,  name: 'Wall Clock', category: 'Decor', icon: '🕰️', snap: 'wall',
  footprint: { w: 0.5, d: 0.1 }, tags: ['time'],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(cyl(0.28, 0.28, 0.06, sMat(style, 'wood', color), 0, 0, 0, 24, { rx: Math.PI / 2 }));
    const face = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#fdf8e2'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
      c.strokeStyle = '#20180a'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.stroke();
      c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 28); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(92, 64); c.stroke();
    });
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshBasicMaterial({ map: face })).translateZ(0.035));
    return g;
  },
});
register({
  id: 'tv-stand', name: 'TV', category: 'Electronics', icon: '📺', snap: 'floor',
  footprint: { w: 1.8, d: 0.5 }, tags: ['television', 'screen'],
  build({ style, color }) {
    const g = new THREE.Group(); const dark = sMat(style, 'dark');
    g.add(box(1.6, 0.4, 0.4, sMat(style, 'wood', color), 0, 0.2, 0));  // stand
    g.add(box(1.7, 1.0, 0.08, dark, 0, 1.0, 0));                        // bezel
    const scr = canvasTexture(256, 160, (c) => {
      const grd = c.createLinearGradient(0, 0, 256, 160); grd.addColorStop(0, '#2a6ad0'); grd.addColorStop(1, '#7a3ca0');
      c.fillStyle = grd; c.fillRect(0, 0, 256, 160);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(30, 40, 80, 8); c.fillRect(30, 70, 140, 8); c.fillRect(30, 100, 100, 8);
    });
    g.add(plane(1.52, 0.86, new THREE.MeshBasicMaterial({ map: scr }), 0, 1.0, 0.05));
    return g;
  },
});
register({
  id: 'floor-mirror-wall', mountY: 0,  name: 'Mirror Wall', category: 'Decor', icon: '🪞', snap: 'wall',
  footprint: { w: 3.0, d: 0.1 }, tags: ['gym', 'yoga'],
  build({ style }) {
    const g = new THREE.Group();
    g.add(box(3.0, 2.4, 0.05, sMat(style, 'metal', { metal: 1 }), 0, 1.2, 0));
    g.add(plane(2.9, 2.3, mirrorMat(), 0, 1.2, 0.03));
    return g;
  },
});

// ════════════════════════ OUTDOOR / GARDEN ════════════════════════
register({
  id: 'tree', name: 'Tree', category: 'Garden', icon: '🌳', snap: 'ground',
  footprint: { w: 1.6, d: 1.6 }, tags: ['plant', 'outdoor'],
  build({ style, color, variant }) {
    const g = new THREE.Group();
    g.add(cyl(0.16, 0.24, 1.4, sMat(style, 'woodDark'), 0, 0.7, 0, 10));
    const leaf = new THREE.MeshStandardMaterial({ color: color ?? (variant === 1 ? 0x4a8a3c : 0x3f9a4c), roughness: 0.9 });
    [[0, 1.7, 0, 0.9], [-0.5, 1.5, 0.3, 0.6], [0.5, 1.55, -0.2, 0.62], [0.1, 2.1, 0.1, 0.55]].forEach(([x, y, z, r]) =>
      g.add(sph(r, leaf, x, y, z, 12, 10)));
    return g;
  },
});
register({
  id: 'hedge', name: 'Hedge', category: 'Garden', icon: '🌳', snap: 'ground',
  footprint: { w: 2.0, d: 0.6 }, tags: ['outdoor', 'boundary'],
  build({ style, color }) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: color ?? 0x3a7a34, roughness: 1 });
    g.add(box(2.0, 0.9, 0.6, m, 0, 0.45, 0));
    for (let i = 0; i < 8; i++) g.add(sph(0.22, m, -0.9 + i * 0.26, 0.9, (i % 2 ? 0.15 : -0.15), 8, 6));
    return g;
  },
});
register({
  id: 'flowerbed', name: 'Flower Bed', category: 'Garden', icon: '🌷', snap: 'ground',
  footprint: { w: 1.6, d: 0.8 }, tags: ['outdoor', 'flowers'],
  build({ style, color }) {
    const g = new THREE.Group();
    g.add(box(1.6, 0.24, 0.8, sMat(style, 'woodDark'), 0, 0.12, 0));
    g.add(box(1.5, 0.2, 0.7, new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 1 }), 0, 0.2, 0));
    const cols = [0xd82c2c, 0xf0b030, 0xd838a0, 0xf5f0e0, color ?? 0x7a4ac0];
    for (let i = 0; i < 16; i++) {
      const x = -0.7 + (i % 8) * 0.2, z = -0.2 + Math.floor(i / 8) * 0.4;
      g.add(cyl(0.01, 0.01, 0.2, new THREE.MeshStandardMaterial({ color: 0x2f7a33 }), x, 0.32, z, 5));
      g.add(sph(0.05, new THREE.MeshStandardMaterial({ color: cols[i % cols.length] }), x, 0.44, z, 8, 6));
    }
    return g;
  },
});
register({
  id: 'fence', name: 'Fence', category: 'Garden', icon: '🚧', snap: 'ground',
  footprint: { w: 2.0, d: 0.15 }, tags: ['outdoor', 'boundary'],
  build({ style, color }) {
    const g = new THREE.Group(); const m = sMat(style, 'light', color); if (color) m.color?.setHex?.(color);
    g.add(box(2.0, 0.08, 0.06, m, 0, 0.7, 0));
    g.add(box(2.0, 0.08, 0.06, m, 0, 0.35, 0));
    for (let i = 0; i < 9; i++) {
      const x = -0.9 + i * 0.225;
      const p = box(0.09, 1.0, 0.05, m, x, 0.5, 0);
      g.add(p);
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), m).translateY(1.06).translateX(x));
    }
    return g;
  },
});
register({
  id: 'garden-bench', name: 'Garden Bench', category: 'Outdoor', icon: '🪑', snap: 'ground',
  footprint: { w: 1.6, d: 0.6 }, tags: ['outdoor', 'seat'],
  build({ style, color }) {
    const g = new THREE.Group(); const m = sMat(style, 'wood', color); const mt = sMat(style, 'metal', { metal: 1 });
    for (let i = 0; i < 4; i++) g.add(box(1.6, 0.08, 0.1, m, 0, 0.45 + (i > 1 ? 0 : 0), i < 3 ? -0.18 + i * 0.16 : 0));
    for (let i = 0; i < 3; i++) g.add(box(1.6, 0.1, 0.08, m, 0, 0.7 + i * 0.16, -0.24, { rx: -0.15 }));
    [[-0.7], [0.7]].forEach(([x]) => { g.add(box(0.08, 0.45, 0.5, mt, x, 0.22, 0)); g.add(box(0.08, 0.5, 0.1, mt, x, 0.8, -0.22)); });
    return g;
  },
});
register({
  id: 'parasol', name: 'Parasol', category: 'Outdoor', icon: '⛱️', snap: 'ground',
  footprint: { w: 2.0, d: 2.0 }, tags: ['outdoor', 'umbrella'],
  build({ style, color }) {
    const g = new THREE.Group(); const pole = sMat(style, 'woodDark');
    g.add(cyl(0.3, 0.34, 0.1, sMat(style, 'stone'), 0, 0.05, 0, 16));
    g.add(cyl(0.04, 0.04, 2.4, pole, 0, 1.2, 0, 10));
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), new THREE.MeshStandardMaterial({ color: color ?? getStyle(style).accent, roughness: 0.9, side: THREE.DoubleSide }));
    canopy.position.y = 2.4; g.add(canopy);
    return g;
  },
});
register({
  id: 'lounger', name: 'Sun Lounger', category: 'Pool', icon: '🏖️', snap: 'ground',
  footprint: { w: 0.7, d: 1.9 }, tags: ['outdoor', 'pool', 'seat'],
  build({ style, color }) {
    const g = new THREE.Group(); const frame = sMat(style, 'metal', { metal: 1 });
    const pad = sMat(style, 'fabric', color);
    g.add(box(0.64, 0.1, 1.5, pad, 0, 0.42, 0.1));
    g.add(box(0.64, 0.1, 0.6, pad, 0, 0.62, -0.72, { rx: -0.7 }));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.03, 0.03, 0.36, frame, sx * 0.28, 0.18, sz * 0.6, 8)));
    return g;
  },
});
register({
  id: 'bird-bath', name: 'Bird Bath', category: 'Garden', icon: '🐦', snap: 'ground',
  footprint: { w: 0.7, d: 0.7 }, tags: ['outdoor'],
  build({ style }) {
    const g = new THREE.Group(); const stone = sMat(style, 'stone');
    g.add(cyl(0.28, 0.34, 0.1, stone, 0, 0.05, 0, 18));
    g.add(cyl(0.08, 0.1, 0.7, stone, 0, 0.4, 0, 12));
    g.add(cyl(0.34, 0.28, 0.1, stone, 0, 0.78, 0, 18));
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshStandardMaterial({ color: 0x6ab0d0, roughness: 0.2, metalness: 0.3 })).rotateX(-Math.PI / 2).translateZ(-0.82).translateY(0)); // water (rotated)
    g.children[g.children.length - 1].position.set(0, 0.83, 0);
    return g;
  },
});

// window + door + curtain as catalogue items (used by designer "Add a door/window")
register({
  id: 'window', mountY: 1.3,  name: 'Window', category: 'Windows & Doors', icon: '🪟', snap: 'wall',
  footprint: { w: 1.6, d: 0.15 }, tags: [],
  build({ style, color }) {
    const g = new THREE.Group(); const frame = sMat(style, 'trim', color);
    const sky = canvasTexture(128, 160, (c) => { const gr = c.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#bfe0f5'); gr.addColorStop(1, '#e8f0d0'); c.fillStyle = gr; c.fillRect(0, 0, 128, 160); c.fillStyle = '#fff'; c.beginPath(); c.arc(90, 40, 20, 0, 7); c.arc(110, 46, 14, 0, 7); c.fill(); });
    g.add(plane(1.4, 1.7, new THREE.MeshBasicMaterial({ map: sky }), 0, 0, 0));
    g.add(box(1.64, 0.12, 0.12, frame, 0, 0.9, 0.02));
    g.add(box(1.64, 0.14, 0.16, frame, 0, -0.9, 0.04));
    g.add(box(0.12, 1.9, 0.12, frame, -0.76, 0, 0.02));
    g.add(box(0.12, 1.9, 0.12, frame, 0.76, 0, 0.02));
    g.add(box(0.06, 1.7, 0.1, frame, 0, 0, 0.03)); g.add(box(1.4, 0.06, 0.1, frame, 0, 0, 0.03));
    const l = new THREE.PointLight(0xfff0d0, 4, 6, 1.8); l.position.set(0, 0, 0.6); g.add(l);
    return g;
  },
});
register({
  id: 'door-interior', name: 'Door', category: 'Windows & Doors', icon: '🚪', snap: 'wall',
  footprint: { w: 1.4, d: 0.25 }, tags: [],
  build({ style, color }) {
    const g = new THREE.Group(); const frame = sMat(style, 'trim'); const leaf = sMat(style, 'wood', color);
    g.add(box(0.16, 2.5, 0.22, frame, -0.62, 1.25, 0));
    g.add(box(0.16, 2.5, 0.22, frame, 0.62, 1.25, 0));
    g.add(box(1.4, 0.16, 0.22, frame, 0, 2.55, 0));
    g.add(box(1.1, 2.42, 0.09, leaf, 0, 1.21, 0));
    g.add(sph(0.05, sMat(style, 'metal', { metal: 1 }), 0.42, 1.18, 0.08));
    return g;
  },
});
register({
  id: 'curtains', mountY: 1.2,  name: 'Curtains', category: 'Windows & Doors', icon: '🪟', snap: 'wall',
  footprint: { w: 1.9, d: 0.2 }, tags: ['drapes'],
  build({ style, color }) {
    const g = new THREE.Group(); const m = sMat(style, 'fabric', color); if (color) m.color.setHex(color);
    g.add(box(2.0, 0.08, 0.12, sMat(style, 'metal', { metal: 1 }), 0, 1.2, 0));
    [[-0.62], [0.62]].forEach(([x], side) => {
      for (let i = 0; i < 5; i++) {
        const px = x + (side ? 1 : -1) * 0 + (i - 2) * 0.11;
        g.add(cyl(0.06, 0.06, 2.3, m, x + (i - 2) * 0.09, 0.05, 0.06 + (i % 2) * 0.04, 8));
      }
    });
    return g;
  },
});

// ════════════════════════ BOB CLASSICS ════════════════════════
// The 1995 family-room artifacts, extracted from the legacy room builder so the
// room can be pure data. Some declare a DEFAULT action (app/hotLabel) — actions
// are orthogonal to category, and any placed record can override or add one.
function bookBuilder(w, h, d, fallback) {
  return ({ color }) => {
    const g = new THREE.Group();
    const c = color ?? fallback;
    g.add(box(w, h, d, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0, h / 2, 0));
    g.add(box(w * 0.94, h + 0.006, d * 0.9, new THREE.MeshStandardMaterial({ color: 0xf5eed8 }), 0, h / 2, -0.004));
    return g;
  };
}
const plain = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.roughness ?? 0.8, metalness: o.metalness ?? 0 });

register({
  id: 'geosafari-deck', name: 'GeoSafari', category: 'Bob Classics', icon: '🌎',
  snap: 'surface', footprint: { w: 0.6, d: 0.5 }, tags: ['quiz', 'cyberdeck', 'geography'],
  app: 'geosafari', hotLabel: 'GeoSafari for Bob',
  build() {
    const g = new THREE.Group();
    const dark = plain(0x232830, { roughness: 0.5 });
    g.add(box(0.56, 0.05, 0.42, dark, 0, 0.025, 0));
    for (let r = 0; r < 5; r++) {
      g.add(box(0.05, 0.02, 0.045, plain(0xd84020), -0.235, 0.055, -0.14 + r * 0.07));
      g.add(box(0.05, 0.02, 0.045, plain(0xd84020), 0.235, 0.055, -0.14 + r * 0.07));
    }
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++)
      g.add(box(0.055, 0.018, 0.04, plain(r ? 0xe8b23a : 0x4a90d8), -0.12 + c * 0.06, 0.055, 0.09 + r * 0.07));
    const lid = new THREE.Group();
    lid.position.set(0, 0.05, -0.2); lid.rotation.x = -1.12; g.add(lid);
    lid.add(box(0.56, 0.42, 0.035, dark, 0, 0.21, 0));
    lid.add(plane(0.46, 0.32, new THREE.MeshBasicMaterial({ map: canvasTexture(160, 112, (gg) => {
      gg.fillStyle = '#0c1c3c'; gg.fillRect(0, 0, 160, 112);
      gg.fillStyle = '#1c66c8'; gg.beginPath(); gg.arc(80, 62, 36, 0, 7); gg.fill();
      gg.fillStyle = '#3da048';
      [[62, 44, 15, 9], [92, 56, 18, 12], [70, 78, 12, 8], [98, 84, 9, 6]].forEach(([x, y, w, h]) => {
        gg.beginPath(); gg.ellipse(x, y, w, h, 0.5, 0, 7); gg.fill();
      });
      gg.strokeStyle = '#8fd0ff'; gg.lineWidth = 2; gg.beginPath(); gg.arc(80, 62, 36, 0, 7); gg.stroke();
      gg.fillStyle = '#f0c040'; gg.font = 'italic bold 22px Verdana'; gg.fillText('GeoSafari', 30, 22);
    }) }), 0, 0.22, 0.022));
    return g;
  },
});
register({
  id: 'camera-90s', name: 'Camera', category: 'Bob Classics', icon: '📷',
  snap: 'surface', footprint: { w: 0.3, d: 0.2 }, tags: ['photo'],
  build() {
    const g = new THREE.Group();
    g.add(box(0.3, 0.17, 0.14, plain(0x14161c, { roughness: 0.4 }), 0, 0.085, 0));
    g.add(cyl(0.06, 0.07, 0.09, plain(0x0a0c10, { roughness: 0.3 }), 0.02, 0.085, 0.1, 14, { rx: Math.PI / 2 }));
    g.add(box(0.07, 0.04, 0.05, plain(0x2a2e38), -0.09, 0.19, 0));
    g.add(cyl(0.025, 0.025, 0.03, plain(0xc0c4cc, { metalness: 0.7 }), 0.1, 0.19, 0, 10));
    return g;
  },
});
register({
  id: 'money-box', name: 'Money Box', category: 'Bob Classics', icon: '💰',
  snap: 'surface', footprint: { w: 0.6, d: 0.4 }, tags: ['finance', 'dollar'],
  app: 'financial', hotLabel: 'Bob Financial Guide',
  build() {
    const g = new THREE.Group();
    const tex = canvasTexture(128, 128, (gg) => {
      gg.fillStyle = '#1c6e38'; gg.fillRect(0, 0, 128, 128);
      gg.strokeStyle = '#e8b23a'; gg.lineWidth = 6; gg.strokeRect(10, 10, 108, 108);
      gg.fillStyle = '#e8b23a'; gg.font = 'bold 78px Georgia'; gg.textAlign = 'center'; gg.fillText('$', 64, 92);
    });
    g.add(box(0.56, 0.56, 0.4, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.28, 0));
    return g;
  },
});
register({
  id: 'letter-set', name: 'Letter & Quill', category: 'Bob Classics', icon: '✍️',
  snap: 'surface', footprint: { w: 0.45, d: 0.6 }, tags: ['writing', 'pen'],
  app: 'letter', hotLabel: 'Bob Letter Writer',
  build() {
    const g = new THREE.Group();
    const pageTex = canvasTexture(128, 170, (gg) => {
      gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, 128, 170);
      gg.strokeStyle = '#9aa4c8'; gg.lineWidth = 3;
      for (let y = 30; y < 160; y += 16) { gg.beginPath(); gg.moveTo(14, y); gg.lineTo(114, y); gg.stroke(); }
    });
    g.add(plane(0.42, 0.56, new THREE.MeshStandardMaterial({ map: pageTex }), 0, 0.001, 0, { rx: -Math.PI / 2 }));
    g.add(cyl(0.008, 0.014, 0.4, plain(0xc41c1c), 0.18, 0.03, 0.1, 8, { rz: 1.1, rx: 0.5 }));
    return g;
  },
});
register({
  id: 'checkbook', name: 'Checkbook', category: 'Bob Classics', icon: '🖋️',
  snap: 'surface', footprint: { w: 0.5, d: 0.3 }, tags: ['bank', 'cheque'],
  app: 'checkbook', hotLabel: 'Bob Checkbook',
  build() {
    const g = new THREE.Group();
    g.add(box(0.46, 0.035, 0.26, plain(0x101828), 0, 0.02, 0));
    g.add(box(0.4, 0.012, 0.2, plain(0xdff2f0), 0, 0.045, 0));
    g.add(box(0.46, 0.01, 0.05, plain(0xe8b23a, { metalness: 0.6 }), 0, 0.045, -0.1));
    return g;
  },
});
register({
  id: 'mail-stack', name: 'Stack of Post', category: 'Bob Classics', icon: '✉️',
  snap: 'surface', footprint: { w: 0.4, d: 0.25 }, tags: ['envelopes', 'email'],
  app: 'email', hotLabel: 'Bob E-Mail',
  build() {
    const g = new THREE.Group();
    [0, 1, 2].forEach(i => g.add(box(0.34, 0.015, 0.2, plain(0xf5eed8), i * 0.02, i * 0.018, i * 0.02, { ry: i * 0.25 })));
    g.add(box(0.1, 0.02, 0.1, plain(0xc41c1c), 0.08, 0.055, 0.02));
    return g;
  },
});
register({
  id: 'address-book', name: 'Address Book', category: 'Bob Classics', icon: '📖',
  snap: 'surface', footprint: { w: 0.35, d: 0.45 }, tags: ['contacts', 'book'],
  app: 'address', hotLabel: 'Bob Address Book',
  build: bookBuilder(0.3, 0.07, 0.4, 0x2634a8),
});
register({
  id: 'blue-binder', name: 'Big Binder', category: 'Bob Classics', icon: '📘',
  snap: 'surface', footprint: { w: 0.45, d: 0.6 }, tags: ['household', 'folder'],
  app: 'household', hotLabel: 'Bob Household Manager',
  build: bookBuilder(0.42, 0.1, 0.55, 0x2d3bb4),
});
register({
  id: 'post-tray', name: 'Post Tray', category: 'Bob Classics', icon: '🗂️',
  snap: 'surface', footprint: { w: 0.55, d: 0.4 }, tags: ['tray', 'papers'],
  build() {
    const g = new THREE.Group();
    g.add(box(0.52, 0.05, 0.36, plain(0x8a5a20), 0, 0.025, 0));
    [0, 1, 2].forEach(i => g.add(box(0.34, 0.014, 0.22, plain(0xf5eed8), (i - 1) * 0.03, 0.065 + i * 0.016, (i - 1) * 0.02, { ry: i * 0.2 })));
    return g;
  },
});
register({
  id: 'scatter-papers', name: 'Scattered Papers', category: 'Bob Classics', icon: '📄',
  snap: 'surface', footprint: { w: 0.35, d: 0.45 }, tags: ['paper'],
  build() {
    const g = new THREE.Group();
    g.add(plane(0.3, 0.4, plain(0xf5eed8), 0, 0.002, 0, { rx: -Math.PI / 2, rz: 0.4 }));
    return g;
  },
});

register({
  id: 'writing-desk', name: 'Writing Desk', category: 'Bob Classics', icon: '🗄️',
  snap: 'floor', footprint: { w: 2.6, d: 1.2 }, tags: ['desk', 'study'],
  build() {
    const g = new THREE.Group();
    const deskM = plain(0x6e4520, { roughness: 0.7 });
    g.add(box(2.6, 0.12, 1.2, deskM, 0, 0.78, 0));
    g.add(box(0.7, 0.72, 1.1, deskM, -0.9, 0.36, 0));
    g.add(box(0.7, 0.72, 1.1, deskM, 0.9, 0.36, 0));
    [0.14, 0.38, 0.62].forEach(y => {
      g.add(box(0.6, 0.02, 0.02, plain(0xe8b23a, { metalness: 0.7 }), -0.9, y + 0.1, 0.56));
      g.add(box(0.6, 0.02, 0.02, plain(0xe8b23a, { metalness: 0.7 }), 0.9, y + 0.1, 0.56));
    });
    g.add(plane(0.9, 0.6, plain(0x2c5c34), 0, 0.845, 0, { rx: -Math.PI / 2 }));
    return g;
  },
});
register({
  id: 'banker-lamp', name: 'Banker Lamp', category: 'Bob Classics', icon: '🟢',
  snap: 'surface', footprint: { w: 0.3, d: 0.3 }, tags: ['lamp', 'green'],
  build() {
    const g = new THREE.Group();
    const brassM = plain(0xe8b23a, { metalness: 0.8, roughness: 0.3 });
    g.add(cyl(0.09, 0.12, 0.04, brassM, 0, 0.02, 0));
    g.add(cyl(0.02, 0.02, 0.34, brassM, 0, 0.2, 0, 8));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1c6e38, emissive: 0x2fa050, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
    shade.position.y = 0.4; g.add(shade);
    const l = new THREE.PointLight(0xd8ffe0, 5, 4, 1.8); l.position.set(0, 0.45, 0); g.add(l);
    return g;
  },
});
register({
  id: 'leather-chair', name: 'Leather Chair', category: 'Bob Classics', icon: '🪑',
  snap: 'floor', footprint: { w: 0.9, d: 0.85 }, tags: ['chair', 'study'],
  build({ color }) {
    const g = new THREE.Group();
    const leathM = plain(color ?? 0x6e2018, { roughness: 0.6 });
    g.add(box(0.85, 0.16, 0.8, leathM, 0, 0.5, 0));
    g.add(box(0.85, 1.0, 0.18, leathM, 0, 1.05, -0.35));
    g.add(cyl(0.06, 0.06, 0.5, plain(0x201408), 0, 0.25, 0, 10));
    return g;
  },
});
register({
  id: 'spinning-globe', name: 'Globe', category: 'Bob Classics', icon: '🌍',
  snap: 'floor', footprint: { w: 0.85, d: 0.85 }, tags: ['world', 'geography'],
  app: 'geosafari', hotLabel: 'GeoSafari for Bob',
  build() {
    const g = new THREE.Group();
    const woodM = plain(0x6e4520);
    g.add(cyl(0.3, 0.4, 0.06, woodM, 0, 0.03, 0, 18));
    g.add(cyl(0.04, 0.05, 0.85, woodM, 0, 0.45, 0, 10));
    const globeTex = canvasTexture(256, 128, (gg) => {
      gg.fillStyle = '#2f6ea8'; gg.fillRect(0, 0, 256, 128);
      gg.fillStyle = '#3f9a4c';
      [[20, 30, 60, 40], [120, 20, 50, 34], [90, 70, 44, 30], [190, 60, 46, 36], [10, 84, 34, 26]].forEach(([x, y, w, h]) => {
        gg.beginPath(); gg.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.4, 0, 7); gg.fill();
      });
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.65 }));
    ball.position.y = 1.3; ball.rotation.z = 0.4; ball.castShadow = true;
    g.add(ball);
    g.userData.tick = (t) => { ball.rotation.y = t * 0.25; };
    return g;
  },
});
register({
  id: 'bob-safe', name: 'Safe', category: 'Bob Classics', icon: '🔐',
  snap: 'floor', footprint: { w: 1.0, d: 0.9 }, tags: ['vault', 'money'],
  app: 'financial', hotLabel: 'Bob Financial Guide',
  build() {
    const g = new THREE.Group();
    g.add(box(1.0, 1.35, 0.9, plain(0x24402c, { metalness: 0.4, roughness: 0.45 }), 0, 0.68, 0));
    g.add(cyl(0.12, 0.12, 0.06, plain(0xe8b23a, { metalness: 0.8, roughness: 0.25 }), 0.15, 0.85, 0.47, 16, { rx: Math.PI / 2 }));
    g.add(box(0.2, 0.05, 0.05, plain(0xe8b23a, { metalness: 0.8 }), -0.25, 0.7, 0.47));
    const safeTex = canvasTexture(128, 64, (gg) => {
      gg.fillStyle = '#e8b23a'; gg.font = 'italic bold 26px Georgia'; gg.textAlign = 'center'; gg.fillText('Bob & Co.', 64, 40);
    });
    g.add(plane(0.6, 0.3, new THREE.MeshBasicMaterial({ map: safeTex, transparent: true }), 0, 1.15, 0.46));
    return g;
  },
});
register({
  id: 'grandfather-clock', name: 'Grandfather Clock', category: 'Bob Classics', icon: '🕰️',
  snap: 'floor', footprint: { w: 0.7, d: 0.5 }, tags: ['clock', 'pendulum'],
  app: 'clock', hotLabel: 'Bob Clock',
  build() {
    const g = new THREE.Group();
    g.add(box(0.66, 2.6, 0.5, plain(0x5c3c18), 0, 1.3, 0));
    const faceTex = canvasTexture(128, 128, (gg) => {
      gg.fillStyle = '#fdf6d8'; gg.beginPath(); gg.arc(64, 64, 60, 0, 7); gg.fill();
      gg.strokeStyle = '#2b210c'; gg.lineWidth = 5; gg.beginPath(); gg.arc(64, 64, 58, 0, 7); gg.stroke();
      gg.strokeStyle = '#2b210c'; gg.lineWidth = 4;
      const h = new Date().getHours() % 12 + new Date().getMinutes() / 60, m = new Date().getMinutes();
      gg.beginPath(); gg.moveTo(64, 64); gg.lineTo(64 + Math.sin(h / 12 * 6.283) * 30, 64 - Math.cos(h / 12 * 6.283) * 30); gg.stroke();
      gg.beginPath(); gg.moveTo(64, 64); gg.lineTo(64 + Math.sin(m / 60 * 6.283) * 44, 64 - Math.cos(m / 60 * 6.283) * 44); gg.stroke();
      gg.fillStyle = '#2b210c'; gg.font = 'bold 16px Georgia'; gg.textAlign = 'center';
      gg.fillText('12', 64, 24); gg.fillText('6', 64, 114); gg.fillText('3', 106, 70); gg.fillText('9', 22, 70);
    });
    g.add(plane(0.42, 0.42, new THREE.MeshBasicMaterial({ map: faceTex }), 0, 2.25, 0.26));
    g.add(box(0.4, 1.1, 0.02, plain(0x241505), 0, 1.1, 0.26));
    const pend = cyl(0.09, 0.09, 0.02, plain(0xe8b23a, { metalness: 0.85, roughness: 0.2 }), 0, 0.75, 0.27, 14, { rx: Math.PI / 2 });
    g.add(pend);
    g.userData.tick = (t) => { pend.position.x = Math.sin(t * 2.4) * 0.1; };
    return g;
  },
});

register({
  id: 'calendar-page', name: 'Wall Calendar', category: 'Bob Classics', icon: '📅',
  snap: 'wall', mountY: 1.9, footprint: { w: 0.5, d: 0.1 }, tags: ['date', 'month'],
  app: 'calendar', hotLabel: 'Bob Calendar',
  build() {
    const g = new THREE.Group();
    const tex = canvasTexture(128, 160, (gg) => {
      const now = new Date();
      gg.fillStyle = '#fdfbf0'; gg.fillRect(0, 0, 128, 160);
      gg.fillStyle = '#3a5ac8'; gg.fillRect(0, 0, 128, 26);
      gg.fillStyle = '#c84a2c'; gg.font = 'bold 30px Georgia'; gg.textAlign = 'center';
      gg.fillText(now.toLocaleString('en', { month: 'short' }) + ' ' + now.getDate(), 64, 62);
      gg.fillStyle = '#555'; gg.font = '9px Verdana';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
        const d = r * 7 + c - 2;
        if (d > 0 && d <= 31) gg.fillText(String(d), 14 + c * 17, 90 + r * 14);
      }
    });
    g.add(plane(0.5, 0.62, new THREE.MeshStandardMaterial({ map: tex }), 0, 0, 0.01));
    return g;
  },
});
register({
  id: 'house-clock', name: 'House Clock', category: 'Bob Classics', icon: '🏠',
  snap: 'surface', footprint: { w: 0.35, d: 0.2 }, tags: ['clock', 'red'],
  app: 'clock', hotLabel: 'Bob Clock',
  build() {
    const g = new THREE.Group();
    g.add(box(0.34, 0.4, 0.16, plain(0xc41c1c), 0, 0.2, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 4), plain(0x8a1212));
    roof.position.y = 0.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
    g.add(roof);
    const faceTex = canvasTexture(64, 64, (gg) => {
      gg.fillStyle = '#fdf6d8'; gg.beginPath(); gg.arc(32, 32, 30, 0, 7); gg.fill();
      gg.strokeStyle = '#2b210c'; gg.lineWidth = 3;
      const m = new Date().getMinutes(), h = new Date().getHours() % 12 + m / 60;
      gg.beginPath(); gg.moveTo(32, 32); gg.lineTo(32 + Math.sin(h / 12 * 6.283) * 14, 32 - Math.cos(h / 12 * 6.283) * 14); gg.stroke();
      gg.beginPath(); gg.moveTo(32, 32); gg.lineTo(32 + Math.sin(m / 60 * 6.283) * 22, 32 - Math.cos(m / 60 * 6.283) * 22); gg.stroke();
    });
    g.add(plane(0.22, 0.22, new THREE.MeshBasicMaterial({ map: faceTex }), 0, 0.22, 0.09));
    return g;
  },
});
register({
  id: 'pet-bowl', name: "Pet Bowl", category: 'Bob Classics', icon: '🐕',
  snap: 'floor', footprint: { w: 0.45, d: 0.45 }, tags: ['rover', 'dog'],
  action: 'bowl', hotLabel: "Rover's Bowl",
  build({ color }) {
    const g = new THREE.Group();
    g.add(cyl(0.22, 0.16, 0.12, plain(color ?? 0xd82c2c, { roughness: 0.5 }), 0, 0.06, 0, 18));
    g.add(cyl(0.16, 0.14, 0.03, plain(0x8a5a20), 0, 0.12, 0, 16));
    return g;
  },
});
register({
  id: 'hanging-plant', name: 'Hanging Plant', category: 'Bob Classics', icon: '🪴',
  snap: 'floor', footprint: { w: 0.5, d: 0.5 }, tags: ['plant', 'ceiling'],
  build() {
    const g = new THREE.Group();
    g.add(cyl(0.22, 0.15, 0.24, plain(0xb9611c), 0, -0.1, 0, 14));
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      g.add(sph(0.1, plain(0x3f9a4c), Math.cos(a) * 0.2, 0.05 - (i % 3) * 0.14, Math.sin(a) * 0.2, 8, 6));
    }
    g.add(cyl(0.01, 0.01, 0.7, plain(0x604818), 0, 0.35, 0, 6));
    return g;
  },
});
register({
  id: 'hourglass', name: 'Hourglass', category: 'Bob Classics', icon: '⏳',
  snap: 'surface', footprint: { w: 0.4, d: 0.4 }, tags: ['time', 'sand'],
  app: 'clock', hotLabel: 'Bob Clock',
  build() {
    const g = new THREE.Group();
    const woodM = plain(0x6e3c14);
    g.add(cyl(0.2, 0.2, 0.04, woodM, 0, 0.02, 0, 16));
    g.add(cyl(0.2, 0.2, 0.04, woodM, 0, 0.58, 0, 16));
    [[-0.16], [0.16]].forEach(([hx]) => g.add(cyl(0.02, 0.02, 0.56, woodM, hx, 0.3, 0, 8)));
    const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe8f0, transparent: true, opacity: 0.35, roughness: 0.15 });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 16), glassM);
    cone1.position.y = 0.17; cone1.rotation.x = Math.PI;
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 16), glassM);
    cone2.position.y = 0.43;
    g.add(cone1, cone2);
    const sand = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 14), plain(0xe8cc7a));
    sand.position.y = 0.12; g.add(sand);
    return g;
  },
});
register({
  id: 'old-chest', name: 'Old Chest', category: 'Bob Classics', icon: '🧳',
  snap: 'floor', footprint: { w: 1.3, d: 0.8 }, tags: ['trunk', 'scrapbook'],
  app: 'household', hotLabel: 'Bob Household Manager',
  build() {
    const g = new THREE.Group();
    g.add(box(1.3, 0.6, 0.75, plain(0x6e4520, { roughness: 0.85 }), 0, 0.3, 0));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.3, 14, 1, false, 0, Math.PI), plain(0x5c3c18));
    lid.rotation.z = Math.PI / 2; lid.position.y = 0.6; lid.castShadow = true;
    g.add(lid);
    [[-0.4], [0.4]].forEach(([bx]) => g.add(box(0.1, 0.66, 0.8, plain(0xe8b23a, { metalness: 0.6, roughness: 0.4 }), bx, 0.32, 0)));
    return g;
  },
});
register({
  id: 'dressmaker-dummy', name: 'Dressmaker Dummy', category: 'Bob Classics', icon: '🧵',
  snap: 'floor', footprint: { w: 0.6, d: 0.6 }, tags: ['tailor', 'attic'],
  build() {
    const g = new THREE.Group();
    g.add(cyl(0.3, 0.4, 0.04, plain(0x3c2c14), 0, 0.02, 0, 14));
    g.add(cyl(0.02, 0.02, 0.6, plain(0x3c2c14), 0, 0.32, 0, 8));
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 6, 14), plain(0xc8b8a0, { roughness: 1 }));
    torso.position.y = 1.05; torso.castShadow = true;
    g.add(torso);
    return g;
  },
});
register({
  id: 'candle', name: 'Candle', category: 'Bob Classics', icon: '🕯️',
  snap: 'surface', footprint: { w: 0.15, d: 0.15 }, tags: ['flame', 'light'],
  build() {
    const g = new THREE.Group();
    g.add(cyl(0.05, 0.06, 0.26, plain(0xf5eed8, { roughness: 0.6 }), 0, 0.13, 0, 12));
    g.add(sph(0.035, new THREE.MeshStandardMaterial({ color: 0xffd070, emissive: 0xffa030, emissiveIntensity: 4 }), 0, 0.3, 0, 8, 8));
    const l = new THREE.PointLight(0xffb060, 6, 5, 1.8);
    l.position.set(0, 0.42, 0); g.add(l);
    g.userData.tick = (t) => { l.intensity = 5 + Math.sin(t * 9) * 1.2 + Math.sin(t * 17.3) * 0.8; };
    return g;
  },
});

// ════════════════════════ REAL APPS ════════════════════════
// Objects that open actual Mac applications via POST /api/launch (whitelisted
// in serve.py). The launch default lives on the item; like every action it's
// orthogonal — any record can override it or put a launch on any other object.
register({
  id: 'traffic-cone', name: 'Traffic Cone', category: 'Real Apps', icon: '🔶',
  snap: 'floor', footprint: { w: 0.5, d: 0.5 }, tags: ['vlc', 'cone', 'video'],
  launch: 'vlc', hotLabel: 'VLC Media Player',
  build() {
    const g = new THREE.Group();
    const orange = plain(0xf07818, { roughness: 0.55 });
    g.add(box(0.5, 0.05, 0.5, orange, 0, 0.025, 0));
    g.add(cyl(0.05, 0.21, 0.62, orange, 0, 0.36, 0, 18));
    const band = cyl(0.115, 0.15, 0.14, plain(0xf5f0e6, { roughness: 0.4 }), 0, 0.42, 0, 18);
    g.add(band);
    return g;
  },
});
register({
  id: 'calculator', name: 'Calculator', category: 'Real Apps', icon: '🧮',
  snap: 'surface', footprint: { w: 0.3, d: 0.42 }, tags: ['maths', 'numbers'],
  launch: 'calculator', hotLabel: 'Calculator',
  build() {
    const g = new THREE.Group();
    g.add(box(0.3, 0.05, 0.44, plain(0x3a3d44, { roughness: 0.5 }), 0, 0.025, 0));
    const screenTex = canvasTexture(96, 40, (gg) => {
      gg.fillStyle = '#9fb08a'; gg.fillRect(0, 0, 96, 40);
      gg.fillStyle = '#1c2418'; gg.font = 'bold 26px "Courier New", monospace'; gg.textAlign = 'right';
      gg.fillText('1995', 88, 30);
    });
    g.add(plane(0.24, 0.1, new THREE.MeshBasicMaterial({ map: screenTex }), 0, 0.052, -0.14, { rx: -Math.PI / 2 }));
    const cols = [0xf5f0e6, 0xf5f0e6, 0xf5f0e6, 0xf0a028];   // orange operator column
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
      g.add(box(0.055, 0.025, 0.05, plain(cols[c], { roughness: 0.45 }), -0.1 + c * 0.066, 0.06, -0.04 + r * 0.075));
    return g;
  },
});
register({
  id: 'compass', name: 'Compass', category: 'Real Apps', icon: '🧭',
  snap: 'surface', footprint: { w: 0.25, d: 0.25 }, tags: ['navigate', 'browser', 'safari'],
  launch: 'safari', hotLabel: 'Safari',
  build() {
    const g = new THREE.Group();
    const brassM = plain(0xd8a838, { metalness: 0.8, roughness: 0.3 });
    g.add(cyl(0.11, 0.12, 0.05, brassM, 0, 0.025, 0, 22));
    const faceTex = canvasTexture(128, 128, (gg) => {
      gg.fillStyle = '#f2ecd8'; gg.beginPath(); gg.arc(64, 64, 60, 0, 7); gg.fill();
      gg.fillStyle = '#2b210c'; gg.font = 'bold 20px Georgia'; gg.textAlign = 'center';
      gg.fillText('N', 64, 26); gg.fillText('S', 64, 118); gg.fillText('E', 110, 70); gg.fillText('W', 18, 70);
      gg.save(); gg.translate(64, 64); gg.rotate(0.6);
      gg.fillStyle = '#c8281c'; gg.beginPath(); gg.moveTo(0, -46); gg.lineTo(8, 0); gg.lineTo(-8, 0); gg.fill();
      gg.fillStyle = '#4a5464'; gg.beginPath(); gg.moveTo(0, 46); gg.lineTo(8, 0); gg.lineTo(-8, 0); gg.fill();
      gg.restore();
      gg.fillStyle = '#d8a838'; gg.beginPath(); gg.arc(64, 64, 6, 0, 7); gg.fill();
    });
    g.add(plane(0.2, 0.2, new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.35 }), 0, 0.052, 0, { rx: -Math.PI / 2 }));
    return g;
  },
});
register({
  id: 'beach-ball', name: 'Beach Ball', category: 'Real Apps', icon: '🏖️',
  snap: 'floor', footprint: { w: 0.5, d: 0.5 }, tags: ['chrome', 'browser', 'pool'],
  launch: 'chrome', hotLabel: 'Google Chrome',
  build() {
    const g = new THREE.Group();
    const tex = canvasTexture(256, 128, (gg) => {
      const cols = ['#e84436', '#f2b32c', '#3aa757', '#4a90e2'];
      for (let i = 0; i < 8; i++) { gg.fillStyle = cols[i % 4]; gg.fillRect(i * 32, 0, 32, 128); }
      gg.fillStyle = '#f5f0e6'; gg.fillRect(0, 0, 256, 14);
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
    ball.position.y = 0.24; ball.castShadow = true;
    g.add(ball);
    return g;
  },
});

// re-export the fabricTex-style helper name expected by zones for wall/floor swatches
export { CATALOG };
