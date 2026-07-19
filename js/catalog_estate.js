// catalog_estate.js — the second wave of catalogue items: the characterful, room-defining
// furniture for the whole estate (games, cinema, music, gym, bath, kitchen, outdoor).
// Imported by estate.js so registration runs before the zones build.

import * as THREE from 'three';
import { box, cyl, sph, plane, group, canvasTexture } from './util.js';
import { sMat, styleColor, getStyle } from './styles.js';
import { register } from './catalog.js';

const S = (style, slot, ov) => (ov != null ? ov : styleColor(style, slot));
const screenTex = (lines, bg1, bg2) => canvasTexture(256, 160, (c) => {
  const gr = c.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, bg1); gr.addColorStop(1, bg2);
  c.fillStyle = gr; c.fillRect(0, 0, 256, 160);
  c.fillStyle = 'rgba(255,255,255,.55)'; lines.forEach((w, i) => c.fillRect(28, 34 + i * 30, w, 9));
});

// ════════════ APPLIANCES / KITCHEN ════════════
register({ id: 'fridge', name: 'Fridge', category: 'Appliances', icon: '🧊', snap: 'wall', footprint: { w: 1.2, d: 0.9 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'light', { roughness: 0.4 }); if (color) m.color.setHex(color);
    g.add(box(1.15, 2.35, 0.85, m, 0, 1.18, 0)); g.add(box(1.16, 0.03, 0.86, sMat(style, 'metalDark', { metal: 1 }), 0, 1.55, 0));
    g.add(box(0.05, 0.5, 0.06, sMat(style, 'metal', { metal: 1 }), 0.48, 1.85, 0.44)); g.add(box(0.05, 0.7, 0.06, sMat(style, 'metal', { metal: 1 }), 0.48, 0.95, 0.44)); return g; } });
register({ id: 'stove', name: 'Stove', category: 'Appliances', icon: '🍳', snap: 'wall', footprint: { w: 1.1, d: 0.8 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'light', { roughness: 0.4 }); if (color) m.color.setHex(color);
    g.add(box(1.1, 0.92, 0.78, m, 0, 0.46, 0)); g.add(box(1.1, 0.05, 0.78, sMat(style, 'dark', { roughness: 0.35 }), 0, 0.95, 0));
    [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.2], [0.28, 0.2]].forEach(([bx, bz]) => g.add(cyl(0.13, 0.13, 0.015, sMat(style, 'dark'), bx, 0.985, bz, 18)));
    g.add(box(0.7, 0.4, 0.03, sMat(style, 'dark'), 0, 0.45, 0.4)); g.add(box(0.8, 0.05, 0.06, sMat(style, 'metal', { metal: 1 }), 0, 0.72, 0.42)); return g; } });
register({ id: 'kitchen-counter', name: 'Counter', category: 'Kitchen', icon: '🔪', snap: 'wall', footprint: { w: 2.4, d: 0.75 },
  build({ style, color }) { const g = new THREE.Group(); const cab = sMat(style, 'wood', { roughness: 0.75 }); if (color) cab.color.setHex(color);
    g.add(box(2.4, 0.92, 0.75, cab, 0, 0.46, 0)); g.add(box(2.5, 0.1, 0.85, sMat(style, 'light', { roughness: 0.5 }), 0, 0.97, 0));
    [-0.8, 0, 0.8].forEach(dx => { g.add(box(0.7, 0.72, 0.04, sMat(style, 'woodDark'), dx, 0.45, 0.38)); g.add(box(0.22, 0.04, 0.04, sMat(style, 'metal', { metal: 1 }), dx, 0.62, 0.42)); }); return g; } });
register({ id: 'sink-unit', name: 'Sink Unit', category: 'Kitchen', icon: '🚰', snap: 'wall', footprint: { w: 1.2, d: 0.75 },
  build({ style, color }) { const g = new THREE.Group(); const cab = sMat(style, 'wood', { roughness: 0.75 }); if (color) cab.color.setHex(color);
    g.add(box(1.2, 0.92, 0.75, cab, 0, 0.46, 0)); g.add(box(1.25, 0.1, 0.85, sMat(style, 'light', { roughness: 0.5 }), 0, 0.97, 0));
    g.add(box(0.6, 0.08, 0.44, sMat(style, 'metal', { metal: 1, roughness: 0.3 }), 0, 1.0, 0));
    const f = group(g, 0, 1.02, -0.22); f.add(cyl(0.03, 0.03, 0.3, sMat(style, 'metal', { metal: 1 }), 0, 0.15, 0, 10)); f.add(cyl(0.025, 0.025, 0.3, sMat(style, 'metal', { metal: 1 }), 0, 0.3, 0.12, 10, { rx: Math.PI / 2.2 })); return g; } });

// ════════════ BATHROOM ════════════
register({ id: 'bathtub', name: 'Bathtub', category: 'Bathroom', icon: '🛁', snap: 'wall', footprint: { w: 1.9, d: 0.9 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'light', { roughness: 0.3 }); if (color) m.color.setHex(color);
    g.add(box(1.9, 0.6, 0.9, m, 0, 0.3, 0)); g.add(box(1.74, 0.16, 0.74, new THREE.MeshStandardMaterial({ color: 0x9ad0e0, roughness: 0.15, metalness: 0.2 }), 0, 0.5, 0));
    g.add(cyl(0.03, 0.03, 0.22, sMat(style, 'metal', { metal: 1 }), -0.8, 0.72, -0.3, 10)); g.add(cyl(0.025, 0.025, 0.18, sMat(style, 'metal', { metal: 1 }), -0.8, 0.82, -0.2, 10, { rx: 0.7 })); return g; } });
register({ id: 'toilet', name: 'Toilet', category: 'Bathroom', icon: '🚽', snap: 'wall', footprint: { w: 0.7, d: 0.8 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'light', { roughness: 0.25 }); if (color) m.color.setHex(color);
    g.add(box(0.5, 0.7, 0.28, m, 0, 0.75, -0.32)); g.add(cyl(0.28, 0.24, 0.4, m, 0, 0.4, 0.06, 18)); g.add(cyl(0.3, 0.3, 0.06, m, 0, 0.62, 0.06, 20)); g.add(box(0.56, 0.05, 0.34, m, 0, 0.44, -0.28)); return g; } });
register({ id: 'bathroom-sink', name: 'Basin', category: 'Bathroom', icon: '🧼', snap: 'wall', footprint: { w: 0.7, d: 0.55 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'light', { roughness: 0.25 }); if (color) m.color.setHex(color);
    g.add(cyl(0.1, 0.14, 0.7, m, 0, 0.35, 0, 10)); g.add(cyl(0.28, 0.24, 0.16, m, 0, 0.78, 0, 18)); g.add(cyl(0.2, 0.18, 0.06, new THREE.MeshStandardMaterial({ color: 0x9ad0e0, roughness: 0.15 }), 0, 0.82, 0, 18));
    g.add(cyl(0.02, 0.02, 0.2, sMat(style, 'metal', { metal: 1 }), 0, 0.9, -0.1, 8)); return g; } });
register({ id: 'towel-rail', name: 'Towel Rail', category: 'Bathroom', icon: '🧻', snap: 'wall', mountY: 1.1, footprint: { w: 0.8, d: 0.15 },
  build({ style, color }) { const g = new THREE.Group(); const mt = sMat(style, 'metal', { metal: 1 }); g.add(box(0.8, 0.04, 0.06, mt, 0, 0, 0.08)); [-0.38, 0.38].forEach(x => g.add(box(0.04, 0.04, 0.12, mt, x, 0, 0.04)));
    g.add(box(0.5, 0.5, 0.03, new THREE.MeshStandardMaterial({ color: color ?? 0xe8e0f0, roughness: 0.9 }), 0.15, -0.28, 0.1)); return g; } });

// ════════════ ELECTRONICS / CINEMA ════════════
register({ id: 'big-tv', name: 'Big Screen TV', category: 'Electronics', icon: '📺', snap: 'wall', mountY: 1.6, footprint: { w: 2.6, d: 0.2 },
  build({ style }) { const g = new THREE.Group(); g.add(box(2.6, 1.5, 0.12, sMat(style, 'dark'), 0, 0, 0));
    g.add(plane(2.44, 1.34, new THREE.MeshBasicMaterial({ map: screenTex([120, 180, 90, 150], '#1a3a80', '#7a2ca0') }), 0, 0, 0.07)); return g; } });
register({ id: 'cinema-screen', name: 'Cinema Screen', category: 'Electronics', icon: '🎬', snap: 'wall', mountY: 1.8, footprint: { w: 5.0, d: 0.2 },
  build({ style }) { const g = new THREE.Group(); g.add(box(5.2, 2.9, 0.16, sMat(style, 'dark'), 0, 0, 0));
    g.add(plane(5.0, 2.7, new THREE.MeshBasicMaterial({ map: canvasTexture(320, 180, (c) => { const gr = c.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#20304a'); gr.addColorStop(1, '#402038'); c.fillStyle = gr; c.fillRect(0, 0, 320, 180); c.fillStyle = '#e8c060'; c.beginPath(); c.moveTo(120, 60); c.lineTo(120, 130); c.lineTo(190, 95); c.fill(); }) }), 0, 0, 0.09)); return g; } });
register({ id: 'cinema-seat', name: 'Recliner Seat', category: 'Seating', icon: '🎟️', snap: 'floor', footprint: { w: 0.9, d: 1.0 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'seat', { roughness: 0.9 }); if (color) m.color.setHex(color); const c2 = sMat(style, 'fabric', color ? {} : {});
    g.add(box(0.86, 0.4, 0.9, m, 0, 0.45, 0)); g.add(box(0.86, 1.0, 0.2, m, 0, 0.95, -0.4)); [[-0.48], [0.48]].forEach(([x]) => g.add(box(0.14, 0.5, 0.9, m, x, 0.6, 0)));
    g.add(box(0.7, 0.14, 0.8, c2, 0, 0.66, 0.02)); return g; } });
register({ id: 'popcorn-machine', name: 'Popcorn Machine', category: 'Decor', icon: '🍿', snap: 'floor', footprint: { w: 0.7, d: 0.6 },
  build({ style }) { const g = new THREE.Group(); const red = new THREE.MeshStandardMaterial({ color: 0xc41c1c, roughness: 0.6 });
    g.add(box(0.6, 0.8, 0.5, red, 0, 1.0, 0)); g.add(box(0.66, 0.66, 0.5, new THREE.MeshStandardMaterial({ color: 0xffe0a0, roughness: 0.2, transparent: true, opacity: 0.5 }), 0, 1.5, 0));
    for (let i = 0; i < 14; i++) g.add(sph(0.05, sMat(style, 'light'), -0.22 + (i % 5) * 0.11, 1.35 + (i % 3) * 0.09, -0.15 + Math.floor(i / 5) * 0.14, 6, 5));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.2, 4), red).translateY(1.9)); g.add(cyl(0.1, 0.12, 0.5, red, 0, 0.5, 0, 10)); return g; } });
register({ id: 'projector', name: 'Projector', category: 'Electronics', icon: '📽️', snap: 'ceiling', footprint: { w: 0.4, d: 0.4 },
  build({ style }) { const g = new THREE.Group(); g.add(box(0.4, 0.22, 0.5, sMat(style, 'dark'), 0, -0.2, 0)); g.add(cyl(0.08, 0.08, 0.08, sMat(style, 'metal', { metal: 1 }), 0, -0.2, 0.28, 12, { rx: Math.PI / 2 }));
    g.add(cyl(0.005, 0.005, 0.2, sMat(style, 'metalDark'), 0, -0.08, 0, 6)); return g; } });

// ════════════ SPORTS & GAMES ════════════
register({ id: 'pool-table', name: 'Pool Table', category: 'Sports & Games', icon: '🎱', snap: 'floor', footprint: { w: 2.6, d: 1.5 },
  build({ style, color }) { const g = new THREE.Group(); const felt = new THREE.MeshStandardMaterial({ color: color ?? 0x1c7a3c, roughness: 1 }); const wood = sMat(style, 'woodDark');
    g.add(box(2.6, 0.2, 1.5, wood, 0, 0.78, 0)); g.add(box(2.4, 0.06, 1.3, felt, 0, 0.9, 0)); [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(() => { });
    [[-1.2, -0.65], [1.2, -0.65], [-1.2, 0.65], [1.2, 0.65]].forEach(([x, z]) => g.add(box(0.16, 0.78, 0.16, wood, x, 0.39, z)));
    g.add(box(2.5, 0.14, 0.08, wood, 0, 0.94, -0.71)); g.add(box(2.5, 0.14, 0.08, wood, 0, 0.94, 0.71));
    [[0, 0, 0xf5f0e0], [-0.5, 0.2, 0xf0c000], [-0.4, -0.1, 0xd02020], [0.5, 0.1, 0x2040c0]].forEach(([x, z, c]) => g.add(sph(0.05, new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }), x, 0.96, z, 10, 8))); return g; } });
register({ id: 'arcade-cabinet', name: 'Arcade Cabinet', category: 'Sports & Games', icon: '🕹️', snap: 'wall', footprint: { w: 0.8, d: 0.8 },
  build({ style, color }) { const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: color ?? getStyle(style).accent, roughness: 0.6 });
    g.add(box(0.8, 1.9, 0.7, body, 0, 0.95, 0)); g.add(box(0.72, 0.6, 0.1, sMat(style, 'dark'), 0, 1.5, 0.32, { rx: -0.2 }));
    g.add(plane(0.6, 0.46, new THREE.MeshBasicMaterial({ map: screenTex([80, 120, 60], '#101030', '#3020a0') }), 0, 1.5, 0.38, { rx: -0.2 }));
    g.add(box(0.76, 0.3, 0.4, sMat(style, 'dark'), 0, 1.05, 0.34, { rx: 0.5 })); g.add(cyl(0.03, 0.03, 0.12, sMat(style, 'metal', { metal: 1 }), -0.15, 1.14, 0.42, 8)); g.add(sph(0.05, new THREE.MeshStandardMaterial({ color: 0xd02020 }), -0.15, 1.2, 0.42));
    [0.1, 0.22].forEach((x, i) => g.add(cyl(0.03, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: [0xf0c000, 0x20c040][i] }), x, 1.1, 0.42, 8, { rx: Math.PI / 2 })));
    g.add(box(0.84, 0.3, 0.2, body, 0, 1.82, 0.2)); return g; } });
register({ id: 'foosball', name: 'Foosball Table', category: 'Sports & Games', icon: '⚽', snap: 'floor', footprint: { w: 1.6, d: 1.1 },
  build({ style, color }) { const g = new THREE.Group(); const wood = sMat(style, 'wood', color ? {} : {}); if (color) wood.color?.setHex?.(color);
    g.add(box(1.6, 0.16, 1.1, wood, 0, 0.85, 0)); g.add(box(1.44, 0.06, 0.94, new THREE.MeshStandardMaterial({ color: 0x2c8a44, roughness: 1 }), 0, 0.94, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.12, 0.85, 0.12, sMat(style, 'woodDark'), sx * 0.7, 0.42, sz * 0.5)));
    [-0.5, -0.15, 0.2, 0.55].forEach(x => g.add(cyl(0.02, 0.02, 1.3, sMat(style, 'metal', { metal: 1 }), x, 1.0, 0, 8, { rx: Math.PI / 2 }))); return g; } });
register({ id: 'treadmill', name: 'Treadmill', category: 'Sports & Games', icon: '🏃', snap: 'floor', footprint: { w: 0.9, d: 1.8 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'dark'); const belt = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
    g.add(box(0.8, 0.16, 1.6, m, 0, 0.15, 0)); g.add(box(0.66, 0.05, 1.4, belt, 0, 0.24, 0.05));
    [[-1], [1]].forEach(([sx]) => g.add(cyl(0.03, 0.03, 1.1, m, sx * 0.36, 0.7, -0.6, 8, { rx: -0.3 })));
    g.add(box(0.7, 0.5, 0.08, sMat(style, 'metal', { metal: 1 }), 0, 1.2, -0.66, { rx: -0.3 }));
    g.add(plane(0.5, 0.3, new THREE.MeshBasicMaterial({ map: screenTex([60, 90], '#103020', '#206040') }), 0, 1.22, -0.62, { rx: -0.3 })); return g; } });
register({ id: 'weight-rack', name: 'Weight Rack', category: 'Sports & Games', icon: '🏋️', snap: 'wall', footprint: { w: 1.6, d: 0.5 },
  build({ style }) { const g = new THREE.Group(); const m = sMat(style, 'metalDark', { metal: 1 });
    g.add(box(1.6, 0.1, 0.5, m, 0, 0.9, 0)); g.add(box(1.6, 0.1, 0.5, m, 0, 0.5, 0.06)); [[-0.8], [0.8]].forEach(([x]) => g.add(box(0.08, 1.0, 0.5, m, x, 0.5, 0)));
    const dumbbell = (x, y, c) => { g.add(cyl(0.03, 0.03, 0.34, sMat(style, 'metal', { metal: 1 }), x, y, 0.06, 8, { rz: Math.PI / 2 })); [-0.16, 0.16].forEach(o => g.add(cyl(0.09, 0.09, 0.08, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), x + o, y, 0.06, 12, { rz: Math.PI / 2 }))); };
    [[-0.5, 0.92, 0xc02020], [0, 0.92, 0x2060c0], [0.5, 0.92, 0x20a040], [-0.4, 0.52, 0xd0a020], [0.4, 0.52, 0x8040c0]].forEach(([x, y, c]) => dumbbell(x, y, c)); return g; } });
register({ id: 'exercise-bike', name: 'Exercise Bike', category: 'Sports & Games', icon: '🚴', snap: 'floor', footprint: { w: 0.7, d: 1.2 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'metalDark', { metal: 1 }); const acc = new THREE.MeshStandardMaterial({ color: color ?? getStyle(style).accent, roughness: 0.5 });
    g.add(box(0.14, 0.1, 1.1, m, 0, 0.1, 0)); g.add(cyl(0.24, 0.24, 0.06, m, 0, 0.5, -0.45, 20, { rz: Math.PI / 2 })); g.add(box(0.08, 0.9, 0.08, m, 0, 0.5, -0.45, { rz: -0.3 }));
    g.add(box(0.34, 0.12, 0.24, acc, 0, 0.95, 0.3)); g.add(box(0.1, 0.6, 0.08, m, 0, 0.6, 0.4)); g.add(box(0.4, 0.06, 0.1, m, 0, 0.9, 0.42)); return g; } });
register({ id: 'water-cooler', name: 'Water Cooler', category: 'Appliances', icon: '💧', snap: 'wall', footprint: { w: 0.5, d: 0.5 },
  build({ style }) { const g = new THREE.Group(); g.add(box(0.4, 1.1, 0.4, sMat(style, 'light', { roughness: 0.4 }), 0, 0.55, 0));
    g.add(cyl(0.16, 0.2, 0.4, new THREE.MeshStandardMaterial({ color: 0x9ad0e8, roughness: 0.2, transparent: true, opacity: 0.7 }), 0, 1.3, 0, 14)); g.add(box(0.1, 0.08, 0.06, sMat(style, 'accent'), 0, 0.7, 0.22)); return g; } });

// ════════════ MUSIC ════════════
register({ id: 'piano', name: 'Upright Piano', category: 'Decor', icon: '🎹', snap: 'wall', footprint: { w: 1.6, d: 0.7 },
  build({ style, color }) { const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: color ?? 0x1a1410, roughness: 0.4, metalness: 0.1 });
    g.add(box(1.6, 1.3, 0.6, body, 0, 0.65, 0)); g.add(box(1.6, 0.2, 0.7, body, 0, 1.3, 0)); g.add(box(1.5, 0.16, 0.36, sMat(style, 'light'), 0, 0.86, 0.28));
    for (let i = 0; i < 24; i++) g.add(box(0.05, 0.02, 0.3, i % 7 === 2 || i % 7 === 6 ? body : new THREE.MeshStandardMaterial({ color: 0xf8f4ea }), -0.72 + i * 0.06, 0.95, 0.3));
    [[-1], [1]].forEach(([sx]) => g.add(box(0.14, 0.5, 0.6, body, sx * 0.72, 0.25, 0))); return g; } });
register({ id: 'guitar-stand', name: 'Guitar', category: 'Decor', icon: '🎸', snap: 'floor', footprint: { w: 0.5, d: 0.5 },
  build({ style, color }) { const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: color ?? 0xc0501c, roughness: 0.4 });
    g.add(cyl(0.24, 0.24, 0.1, body, 0, 0.5, 0, 20, { rx: Math.PI / 2 })); g.add(box(0.08, 1.0, 0.05, sMat(style, 'woodDark'), 0, 1.1, 0)); g.add(box(0.12, 0.16, 0.05, sMat(style, 'dark'), 0, 1.6, 0));
    g.add(cyl(0.02, 0.02, 0.4, sMat(style, 'metalDark', { metal: 1 }), -0.2, 0.2, 0.06, 6, { rz: 0.4 })); g.add(cyl(0.02, 0.02, 0.4, sMat(style, 'metalDark', { metal: 1 }), 0.2, 0.2, 0.06, 6, { rz: -0.4 })); return g; } });
register({ id: 'drum-kit', name: 'Drum Kit', category: 'Decor', icon: '🥁', snap: 'floor', footprint: { w: 1.6, d: 1.4 },
  build({ style, color }) { const g = new THREE.Group(); const shell = new THREE.MeshStandardMaterial({ color: color ?? 0xc41c1c, roughness: 0.4 }); const skin = sMat(style, 'light', { roughness: 0.6 }); const mt = sMat(style, 'metal', { metal: 1 });
    g.add(cyl(0.4, 0.4, 0.5, shell, 0, 0.4, 0.2, 20)); g.add(cyl(0.4, 0.4, 0.02, skin, 0, 0.4, 0.46, 20, { rx: Math.PI / 2 }));  // bass
    g.add(cyl(0.2, 0.2, 0.2, shell, -0.1, 0.85, 0, 16)); g.add(cyl(0.22, 0.22, 0.18, shell, 0.35, 0.7, 0.1, 16)); // toms/snare
    g.add(cyl(0.28, 0.28, 0.02, mt, -0.55, 1.0, 0.1, 18, { rx: 0.3 })); g.add(cyl(0.24, 0.24, 0.02, mt, 0.6, 1.1, -0.1, 18, { rx: -0.2 })); // cymbals
    [[-0.55, 1.0], [0.6, 1.1]].forEach(([x, y]) => g.add(cyl(0.01, 0.01, y, mt, x, y / 2, 0.05, 6))); return g; } });
register({ id: 'amp', name: 'Amplifier', category: 'Decor', icon: '🔊', snap: 'floor', footprint: { w: 0.7, d: 0.5 },
  build({ style, color }) { const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: color ?? 0x2a2622, roughness: 0.8 });
    g.add(box(0.7, 0.6, 0.4, body, 0, 0.4, 0)); g.add(plane(0.56, 0.44, new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 1 }), 0, 0.4, 0.21));
    g.add(box(0.7, 0.08, 0.42, sMat(style, 'metal', { metal: 1 }), 0, 0.72, 0)); return g; } });

// ════════════ YOGA / WELLNESS ════════════
register({ id: 'yoga-mat', name: 'Yoga Mat', category: 'Sports & Games', icon: '🧘', snap: 'rug', footprint: { w: 0.7, d: 1.8 },
  build({ style, color }) { const g = new THREE.Group(); g.add(box(0.68, 0.04, 1.8, new THREE.MeshStandardMaterial({ color: color ?? getStyle(style).accent, roughness: 0.9 }), 0, 0.03, 0)); return g; } });
register({ id: 'yoga-block', name: 'Yoga Blocks', category: 'Sports & Games', icon: '🧱', snap: 'floor', footprint: { w: 0.5, d: 0.4 },
  build({ style, color }) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: color ?? getStyle(style).accent2, roughness: 0.9 });
    g.add(box(0.28, 0.14, 0.2, m, -0.1, 0.07, 0)); g.add(box(0.28, 0.14, 0.2, m, 0.16, 0.21, 0.04)); return g; } });
register({ id: 'water-feature', name: 'Water Feature', category: 'Decor', icon: '⛲', snap: 'floor', footprint: { w: 0.9, d: 0.9 },
  build({ style }) { const g = new THREE.Group(); const stone = sMat(style, 'stone');
    g.add(cyl(0.4, 0.46, 0.3, stone, 0, 0.15, 0, 20)); g.add(cyl(0.34, 0.34, 0.04, new THREE.MeshStandardMaterial({ color: 0x6ab0d0, roughness: 0.15, metalness: 0.3 }), 0, 0.3, 0, 20));
    g.add(cyl(0.06, 0.1, 0.5, stone, 0, 0.5, 0, 12)); g.add(sph(0.12, new THREE.MeshStandardMaterial({ color: 0x8ac8e0, roughness: 0.1, metalness: 0.4 }), 0, 0.72, 0, 12, 10)); return g; } });

// ════════════ OUTDOOR / BBQ / POOL ════════════
register({ id: 'grill', name: 'BBQ Grill', category: 'Outdoor', icon: '🍖', snap: 'ground', footprint: { w: 1.0, d: 0.7 },
  build({ style, color }) { const g = new THREE.Group(); const m = sMat(style, 'dark', { metal: 1, roughness: 0.5 }); if (color) m.color.setHex(color);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12, 0, 7, 0, Math.PI / 1.7), m).translateY(0.9)); g.add(cyl(0.42, 0.42, 0.1, m, 0, 0.9, 0, 18));
    [[-1, -1], [1, -1], [0, 1]].forEach(([sx, sz]) => g.add(cyl(0.03, 0.03, 0.9, m, sx * 0.32, 0.45, sz * 0.28, 6))); g.add(box(0.6, 0.04, 0.4, sMat(style, 'metal', { metal: 1 }), 0, 1.32, 0));
    for (let i = 0; i < 5; i++) g.add(sph(0.05, new THREE.MeshStandardMaterial({ color: 0x3a1206, emissive: 0xff5a10, emissiveIntensity: 1.4 }), -0.2 + i * 0.1, 0.92, 0, 6, 5)); return g; } });
register({ id: 'picnic-table', name: 'Picnic Table', category: 'Outdoor', icon: '🧺', snap: 'ground', footprint: { w: 2.0, d: 1.4 },
  build({ style, color }) { const g = new THREE.Group(); const wood = sMat(style, 'wood', color ? {} : {}); if (color) wood.color?.setHex?.(color); const dk = sMat(style, 'woodDark');
    g.add(box(2.0, 0.1, 0.8, wood, 0, 0.75, 0)); [[-0.6], [0.6]].forEach(([z]) => g.add(box(2.0, 0.08, 0.34, wood, 0, 0.44, z)));
    [[-0.8], [0.8]].forEach(([x]) => { g.add(box(0.1, 0.75, 1.5, dk, x, 0.37, 0, { rz: 0 })); }); return g; } });
register({ id: 'cooler', name: 'Cooler', category: 'Outdoor', icon: '🧊', snap: 'ground', footprint: { w: 0.7, d: 0.5 },
  build({ style, color }) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: color ?? 0xd02020, roughness: 0.6 });
    g.add(box(0.7, 0.4, 0.45, m, 0, 0.2, 0)); g.add(box(0.72, 0.1, 0.47, sMat(style, 'light'), 0, 0.44, 0)); g.add(box(0.4, 0.06, 0.06, sMat(style, 'metalDark', { metal: 1 }), 0, 0.5, 0)); return g; } });
register({ id: 'diving-board', name: 'Diving Board', category: 'Pool', icon: '🤿', snap: 'ground', footprint: { w: 0.6, d: 2.0 },
  build({ style }) { const g = new THREE.Group(); const m = sMat(style, 'metal', { metal: 1 }); g.add(box(0.5, 0.06, 1.8, sMat(style, 'light'), 0, 0.5, 0.4)); g.add(box(0.4, 0.5, 0.3, m, 0, 0.25, -0.5)); return g; } });
register({ id: 'pool-ring', name: 'Pool Float', category: 'Pool', icon: '🛟', snap: 'ground', footprint: { w: 0.9, d: 0.9 },
  build({ style, color }) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.14, 12, 24), new THREE.MeshStandardMaterial({ color: color ?? 0xf05030, roughness: 0.5 })).rotateX(Math.PI / 2).translateZ(-0.1)); g.children[0].position.y = 0.12; return g; } });

// ════════════ HALL / DINING extras ════════════
register({ id: 'coat-rack', name: 'Coat Rack', category: 'Storage', icon: '🧥', snap: 'wall', footprint: { w: 0.6, d: 0.6 },
  build({ style, color }) { const g = new THREE.Group(); const wood = sMat(style, 'wood', color ? {} : {}); if (color) wood.color?.setHex?.(color);
    g.add(cyl(0.25, 0.3, 0.06, sMat(style, 'woodDark'), 0, 0.03, 0, 14)); g.add(cyl(0.04, 0.04, 1.8, wood, 0, 0.9, 0, 10));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; g.add(cyl(0.015, 0.02, 0.18, wood, Math.cos(a) * 0.06, 1.7, Math.sin(a) * 0.06, 6, { rz: Math.cos(a) * 0.8, rx: Math.sin(a) * 0.8 })); }
    g.add(box(0.4, 0.5, 0.16, new THREE.MeshStandardMaterial({ color: getStyle(style).accent, roughness: 0.9 }), 0.18, 1.4, 0.06, { rz: 0.1 })); return g; } });
register({ id: 'console-table', name: 'Console Table', category: 'Tables', icon: '🪞', snap: 'wall', footprint: { w: 1.4, d: 0.4 },
  build({ style, color }) { const g = new THREE.Group(); const wood = sMat(style, 'wood', color ? {} : {}); if (color) wood.color?.setHex?.(color);
    g.add(box(1.4, 0.08, 0.4, wood, 0, 0.82, 0)); [[-1, 0], [1, 0]].forEach(([sx]) => g.add(box(0.08, 0.82, 0.34, sMat(style, 'woodDark'), sx * 0.62, 0.41, 0))); g.add(box(1.3, 0.4, 0.06, wood, 0, 0.55, -0.15)); return g; } });
register({ id: 'sideboard', name: 'Sideboard', category: 'Storage', icon: '🗄️', snap: 'wall', footprint: { w: 1.8, d: 0.5 },
  build({ style, color }) { const g = new THREE.Group(); const wood = sMat(style, 'wood', color ? {} : {}); if (color) wood.color?.setHex?.(color);
    g.add(box(1.8, 0.85, 0.5, wood, 0, 0.5, 0)); [-0.6, 0, 0.6].forEach(dx => { g.add(box(0.52, 0.7, 0.04, sMat(style, 'woodDark'), dx, 0.5, 0.26)); g.add(sph(0.04, sMat(style, 'metal', { metal: 1 }), dx, 0.5, 0.3)); });
    [[-1, 0], [1, 0]].forEach(([sx]) => g.add(box(0.1, 0.2, 0.5, sMat(style, 'woodDark'), sx * 0.85, 0.06, 0))); return g; } });
register({ id: 'poster', name: 'Poster', category: 'Decor', icon: '🖼️', snap: 'wall', mountY: 1.6, footprint: { w: 0.7, d: 0.05 },
  build({ style, color, variant }) { const g = new THREE.Group(); const tex = canvasTexture(150, 200, (c) => { const st = getStyle(style); c.fillStyle = '#' + (color ?? st.accent).toString(16).padStart(6, '0'); c.fillRect(0, 0, 150, 200);
    c.fillStyle = '#' + st.light.toString(16).padStart(6, '0'); if ((variant || 0) % 2) { c.beginPath(); c.arc(75, 90, 44, 0, 7); c.fill(); c.fillStyle = '#' + st.accent2.toString(16).padStart(6, '0'); c.fillRect(30, 150, 90, 16); } else { for (let i = 0; i < 5; i++) { c.fillStyle = ['#' + st.light.toString(16), '#' + st.accent2.toString(16)][i % 2]; c.fillRect(20, 20 + i * 34, 110, 22); } } });
    g.add(plane(0.66, 0.9, new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0.01)); return g; } });
