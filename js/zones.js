// zones.js — the zone framework. Generalises "rooms" into data-driven ZONES.
//
// A zone is data: { id, name, kind:'room'|'outdoor', style, size, shell, fixtures,
//   placed[], doors[], cam, icon }. Legacy hand-built rooms are wrapped via a `legacy`
// builder fn and coexist unchanged. New zones are built generically from the spec +
// the catalogue, and every mutation (style, placed items, doors, new zones) persists in
// BobOS.fs under home/zones/<id>/… so the whole estate rebuilds from data on reload.

import * as THREE from 'three';
import { box, cyl, sph, plane, group, canvasTexture } from './util.js';
import { getStyle, styleColor, sMat } from './styles.js';
import * as catalog from './catalog.js';
import { BobOS } from './os.js';
import {
  buildPorch, familyFixtures, studyFixtures, kitchenFixtures, atticFixtures, ROOM_SPACING,
} from './rooms.js';

export { ROOM_SPACING };

// ── fs paths ────────────────────────────────────────────────────
const P = {
  index: 'home/zones/index',
  style: (id) => `home/zones/${id}/style`,
  placed: (id) => `home/zones/${id}/placed`,
  doors: (id) => `home/zones/${id}/doors`,
  spec: (id) => `home/zones/${id}/spec`,
};
let _uid = 1;
const nextUid = () => `p${Date.now().toString(36)}_${_uid++}`;

// ── built-in ZONE SPECS ─────────────────────────────────────────
// Legacy rooms keep their bespoke builders (parity anchors). Estate zones are data.
// only the porch remains bespoke — it's the sign-in door + the street outside,
// not a furnishable room. Every other original room is now a data zone below.
const LEGACY = {
  porch: { kind: 'porch', legacy: buildPorch, icon: '🚪', style: 'bob' },
};

// registry of ALL data-zone specs (estate zones registered from estate.js)
const SPECS = new Map();
export function registerZone(spec) { SPECS.set(spec.id, spec); return spec; }
export function zoneSpec(id) { return SPECS.get(id); }

// ── the FAMILY ROOM is a data zone: bespoke fixtures + furniture as records.
// Default actions (app: …) come from the catalogue items; any record could
// override or add its own — actions are orthogonal to what an object is.
registerZone({
  id: 'family', name: "The Family Room", kind: 'room', style: 'bob', icon: '🛋️',
  shell: 'none',                      // familyFixtures builds the 1995 panelled shell itself
  size: { w: 10.6, h: 4.5, d: 7.2 },
  cam: { pos: [0, 1.95, 5.6], look: [0, 1.35, -1.5] },
  fixtures: familyFixtures,
  doors: [
    { x: -5.24, z: 0.8, ry: Math.PI / 2, target: 'study', label: 'Door to the Study' },
    { x: 5.24, z: 0.8, ry: -Math.PI / 2, target: 'kitchen', label: 'Door to the Kitchen' },
    { x: -3.2, z: 3.5, ry: Math.PI, target: 'hallway', label: 'Door to the Hallway' },
  ],
  placed: [
    { cat: 'sofa', x: -2.15, z: -0.7, ry: 0.52, color: 0x5b6bb0 },
    { cat: 'post-tray', x: -1.64, y: 0.74, z: -0.34, ry: 0.32 },
    { cat: 'armchair', x: 2.5, z: -0.9, ry: -0.55, color: 0xc08a30 },
    { cat: 'floor-lamp', x: -4.55, z: -1.5 },
    { cat: 'side-table', x: -4.35, z: -0.1 },
    { cat: 'mail-stack', x: -4.3, y: 0.76, z: 0.2 },
    { cat: 'address-book', x: -4.53, y: 0.76, z: -0.05, ry: 0.4 },
    { cat: 'vase-flowers', x: -1.35, z: -2.55 },
    { cat: 'coffee-table', x: 0.35, z: 1.15, color: 0x3f8a5c },
    { cat: 'letter-set', x: 0.37, y: 0.55, z: 1.43, ry: 0.2 },
    { cat: 'checkbook', x: 0.8, y: 0.55, z: 0.93, ry: -0.25 },
    { cat: 'blue-binder', x: 0.9, y: 0.55, z: 1.45, ry: -0.15 },
    { cat: 'scatter-papers', x: 0.7, y: 0.552, z: 1.25 },
    { cat: 'geosafari-deck', x: -0.28, y: 0.545, z: 1.28, ry: 0.38 },
    { cat: 'camera-90s', x: 1.32, y: 0.545, z: 1.35, ry: -0.5 },
    { cat: 'cabinet', x: 1.98, z: -3.1, color: 0xc07c2c },
    { cat: 'money-box', x: 1.98, y: 0.9, z: -3.1 },
    // VLC is literally the cone
    { cat: 'traffic-cone', x: -4.5, z: 1.2 },
  ],
});

// ── the STUDY, same treatment. Note the action overrides: a plain post-tray
// carries app:'email', and a recoloured address-book acts as the Household
// Manager — the record decides what an object does, not its catalogue entry.
registerZone({
  id: 'study', name: "The Study", kind: 'room', style: 'bob', icon: '📚',
  shell: 'none',
  size: { w: 9.6, h: 4.4, d: 6.8 },
  cam: { pos: [0, 1.8, 4.6], look: [0, 1.5, -1.4] },
  fixtures: studyFixtures,
  doors: [
    { x: 4.74, z: 1.9, ry: -Math.PI / 2, target: 'family', label: 'Door to the Family Room' },
  ],
  placed: [
    { cat: 'writing-desk', x: 0.4, z: -1.4 },
    { cat: 'letter-set', x: 0.25, y: 0.845, z: -1.3, ry: 0.15 },
    { cat: 'banker-lamp', x: 1.25, y: 0.845, z: -1.65 },
    { cat: 'checkbook', x: 0.75, y: 0.845, z: -1.1, ry: -0.3 },
    { cat: 'post-tray', x: -0.45, y: 0.845, z: -1.68, app: 'email', label: 'Bob E-Mail' },
    { cat: 'leather-chair', x: 0.4, z: -2.6 },
    { cat: 'spinning-globe', x: 2.9, z: -1.6 },
    { cat: 'bob-safe', x: -3.6, z: -2.6 },
    { cat: 'grandfather-clock', x: 3.9, z: -2.9 },
    { cat: 'address-book', x: 4.3, y: 1.72, z: -0.1, ry: -1.42, color: 0x2d8a3c, app: 'household', label: 'Bob Household Manager' },
    { cat: 'address-book', x: 4.32, y: 0.55, z: 1.25, ry: -1.77 },
    // real Mac apps on the desk: Calculator and the Safari compass by the globe
    { cat: 'calculator', x: -0.35, y: 0.845, z: -1.75, ry: -0.2 },
    { cat: 'compass', x: 1.05, y: 0.845, z: -1.05, ry: 0.4 },
  ],
});

// ── the POSTMODERN KITCHEN
registerZone({
  id: 'kitchen', name: "The Postmodern Kitchen", kind: 'room', style: 'postmodern', icon: '🍳',
  shell: 'none',
  size: { w: 9.8, h: 4.5, d: 6.8 },
  cam: { pos: [0, 1.8, 4.6], look: [0, 1.5, -1.4] },
  fixtures: kitchenFixtures,
  doors: [
    { x: -4.84, z: 1.3, ry: Math.PI / 2, target: 'family', label: 'Door to the Family Room', color: 0x7a6fa8 },
    { x: 4.84, z: 0.9, ry: -Math.PI / 2, target: 'attic', label: 'Door to the Attic', color: 0xd97e2f },
    { x: 3.7, z: -3.28, ry: 0, target: 'garden', label: 'Back door to the Garden', color: 0x3f9a4c },
  ],
  placed: [
    { cat: 'fridge', x: -3.9, z: -2.6, color: 0xf5f5f0 },
    { cat: 'calendar-page', x: -3.88, y: 1.9, z: -2.16 },
    { cat: 'stove', x: 1.4, z: -2.92 },
    { cat: 'blue-binder', x: 1.9, y: 1.02, z: -2.85, ry: -0.4 },
    { cat: 'house-clock', x: -2.35, y: 1.02, z: -3.0 },
    { cat: 'checkbook', x: 2.65, y: 1.02, z: -0.68, ry: 0.65 },
    { cat: 'mail-stack', x: 3.55, y: 1.02, z: -1.12, ry: 0.55 },
    { cat: 'pet-bowl', x: 1.9, z: 0.6 },
    { cat: 'hanging-plant', x: 3.6, y: 3.8, z: -2.4 },
  ],
});

// ── the CASTLE ATTIC
registerZone({
  id: 'attic', name: "The Castle Attic", kind: 'room', style: 'castle', icon: '🏰',
  shell: 'none',
  size: { w: 9.4, h: 4.7, d: 6.8 },
  cam: { pos: [0, 1.8, 4.6], look: [0, 1.6, -1.4] },
  fixtures: atticFixtures,
  doors: [
    { x: 4.64, z: 1.3, ry: -Math.PI / 2, target: 'kitchen', label: 'Door to the Kitchen', color: 0xd97e2f },
  ],
  placed: [
    { cat: 'coffee-table', x: 0.6, z: -0.6, color: 0x7abf6e },
    { cat: 'hourglass', x: 0.2, y: 0.545, z: -0.6 },
    { cat: 'candle', x: 1.15, y: 0.545, z: -0.45 },
    { cat: 'old-chest', x: 2.9, z: -2.3, ry: -0.4 },
    { cat: 'dressmaker-dummy', x: -1.8, z: -2.6 },
    { cat: 'address-book', x: -3.28, y: 1.81, z: -1.57, ry: 0.8 },
  ],
});

// ── shells ──────────────────────────────────────────────────────
function makeRoomShell(root, spec, style) {
  const { w, h, d } = spec.size;
  const st = getStyle(style);
  const wallM = sMat(style, 'wall');
  const floorTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#' + styleColor(style, 'floor').toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 3;
    for (let y = 0; y <= 256; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  }, { repeat: [Math.round(w / 2), Math.round(d / 2)] });
  const floorM = sMat(style, 'floor', { map: floorTex, roughness: 0.9 });
  const ceilM = sMat(style, 'ceil');
  root.add(plane(w, d, floorM, 0, 0, 0, { rx: -Math.PI / 2 }));
  root.add(plane(w, d, ceilM, 0, h, 0, { rx: Math.PI / 2 }));
  root.add(plane(w, h, wallM, 0, h / 2, -d / 2));
  root.add(plane(d, h, wallM, -w / 2, h / 2, 0, { ry: Math.PI / 2 }));
  root.add(plane(d, h, wallM, w / 2, h / 2, 0, { ry: -Math.PI / 2 }));
  root.add(plane(w, h, wallM, 0, h / 2, d / 2, { ry: Math.PI }));
  // lighting: warm key + ambient from the style mood
  const key = new THREE.SpotLight(0xffe6c8, 34, Math.max(w, d) + 6, 1.0, 0.6, 1.3);
  key.position.set(0, h - 0.3, d * 0.3); key.target.position.set(0, 0.6, -d * 0.15);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  root.add(key, key.target);
  const fill = new THREE.PointLight(styleColor(style, 'ambient', 0xffe0b8), 8, Math.max(w, d) + 4, 1.6);
  fill.position.set(0, h * 0.7, -d * 0.15); root.add(fill);
  root.add(new THREE.AmbientLight(st.ambient, st.ambientI));
}

function skyTexture(style) {
  return canvasTexture(512, 256, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3f7fd0'); grad.addColorStop(0.42, '#7fb0e0'); grad.addColorStop(0.52, '#cfe6f2');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    // soft clouds up high
    g.fillStyle = 'rgba(255,255,255,0.85)';
    [[80, 40, 34], [230, 60, 26], [400, 34, 40], [330, 80, 22]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 6, r * 0.7, 0, 7); g.arc(x - r, y + 8, r * 0.6, 0, 7); g.fill(); });
    // distant tree-line hugging the horizon (v≈0.52), wrapping all around the dome
    g.fillStyle = '#3a6a3e';
    for (let x = 0; x < 512; x += 6) { const h = 12 + Math.abs(Math.sin(x * 0.08) + Math.sin(x * 0.031)) * 14; g.fillRect(x, 133 - h, 7, h + 8); }
    g.fillStyle = '#2e5c34';
    for (let x = 3; x < 512; x += 9) { const h = 8 + Math.abs(Math.cos(x * 0.05)) * 10; g.fillRect(x, 133 - h, 6, h + 8); }
  });
}
function makeOutdoorShell(root, spec, style) {
  const area = spec.size?.w || 24;
  const dep = spec.size?.d || 24;
  // ground
  const groundTex = canvasTexture(256, 256, (g) => {
    const grass = spec.ground || 'grass';
    if (grass === 'paving') {
      g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#9a9082'; g.lineWidth = 4;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    } else {
      g.fillStyle = '#5aa03c'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 400; i++) { g.fillStyle = ['#4f9636', '#63ab44', '#569c3a'][i % 3]; g.fillRect((i * 61) % 256, (i * 97) % 256, 3, 6); }
    }
  }, { repeat: [Math.round(area / 3), Math.round(dep / 3)] });
  root.add(plane(area, dep, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }), 0, 0, 0, { rx: -Math.PI / 2 }));
  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(Math.max(area, dep) * 1.3, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(style), side: THREE.BackSide, fog: false }));
  sky.position.y = 0; root.add(sky);
  // sun + sky light
  const sun = new THREE.DirectionalLight(0xfff3d8, 2.4);
  sun.position.set(area * 0.3, 18, dep * 0.2); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -area / 2; sun.shadow.camera.right = area / 2;
  sun.shadow.camera.top = dep / 2; sun.shadow.camera.bottom = -dep / 2; sun.shadow.camera.far = 60;
  root.add(sun, sun.target);
  root.add(new THREE.HemisphereLight(0xbfe0ff, 0x6aa04a, 1.1));
  root.add(new THREE.AmbientLight(0xffffff, 0.35));
  // (distant greenery is painted into the sky dome's horizon, so it wraps 360° and never
  //  clashes with a house facade)
}

// ── door builder for data zones ─────────────────────────────────
function makeZoneDoor(root, door, style) {
  const g = group(root, door.x || 0, 0, door.z || 0);
  g.rotation.y = door.ry || 0;
  const frameM = sMat(style, 'trim');
  const leafM = sMat(style, 'wood', door.color ? {} : {});
  if (door.color) leafM.color.setHex(door.color);
  g.add(box(0.16, 2.5, 0.22, frameM, -0.62, 1.25, 0));
  g.add(box(0.16, 2.5, 0.22, frameM, 0.62, 1.25, 0));
  g.add(box(1.4, 0.16, 0.22, frameM, 0, 2.55, 0));
  const hinge = group(g, -0.55, 0, 0.02);
  const leaf = box(1.1, 2.42, 0.09, leafM, 0.55, 1.21, 0);
  hinge.add(leaf);
  const panelM = sMat(style, 'woodDark');
  [[0.32, 1.75], [0.78, 1.75], [0.32, 0.68], [0.78, 0.68]].forEach(([px, py]) =>
    hinge.add(box(0.34, 0.86, 0.03, panelM, px, py, 0.05)));
  hinge.add(sph(0.05, sMat(style, 'metal', { metal: 1 }), 0.98, 1.18, 0.08));
  g.userData.hinge = hinge;
  return g;
}

// ── place a catalogue item into a zone root (movable + persistable) ──
function spawnPlaced(root, rec, style) {
  const o = catalog.build(rec.cat, { style: rec.style || style, color: rec.color ?? undefined, scale: rec.scale ?? 1, variant: rec.variant ?? 0 });
  if (!o) return null;
  o.position.set(rec.x || 0, rec.y || 0, rec.z || 0);
  o.rotation.y = rec.ry || 0;
  if (rec.visible === false) o.visible = false;
  o.userData.placedUid = rec.uid;
  o.userData.movable = catalog.get(rec.cat)?.name || rec.cat;
  root.add(o);
  return o;
}

// ── actions are ORTHOGONAL to catalogue category — any placed object may carry
// one. The record wins over any default the catalogue item declares:
//   app: open a Bob program · zone: travel there · launch: open a real Mac app
//   (via /api/launch) · action: a custom fun action (e.g. 'mousehole')
function wireAction(o, rec, hotspots) {
  const item = catalog.get(rec.cat) || {};
  const name = rec.label ?? item.hotLabel ?? item.name ?? rec.cat;
  const app = rec.app ?? item.app, zone = rec.zone ?? item.zone;
  const launch = rec.launch ?? item.launch, action = rec.action ?? item.action;
  if (app) hotspots.push({ obj: o, name, kind: 'app', app });
  else if (zone) hotspots.push({ obj: o, name, kind: 'door', target: zone });
  else if (launch) hotspots.push({ obj: o, name, kind: 'launch', launch });
  else if (action) hotspots.push({ obj: o, name, kind: 'fun', action });
}

// ── build a single data zone from spec + persisted state ────────
function buildDataZone(scene, spec, X) {
  const root = group(scene, X, 0, 0);
  const hot = [];
  const mov = [];
  const style = BobOS.fs.read(P.style(spec.id), spec.style || 'bob');
  const H2 = (obj, name, kind, extra = {}) => hot.push({ obj, name, kind, ...extra });
  const M = (obj, name) => { obj.userData.movable = name; mov.push(obj); return obj; };

  if (spec.kind === 'outdoor') makeOutdoorShell(root, spec, style);
  else if (spec.shell !== 'none') makeRoomShell(root, spec, style);   // 'none' → fixtures build a bespoke shell

  // fixtures: bespoke built-in structure (non-movable)
  const fixtureTicks = [];
  const fixtureObstacles = [];   // {x,z,r} zones can mark so the guide walks around them
  spec.fixtures?.(root, {
    style, H2, M, THREE, catalog,
    addTick: (fn) => fixtureTicks.push(fn),
    addObstacle: (x, z, r) => fixtureObstacles.push({ x, z, r }),
    addBox: (x, z, hw, hd) => fixtureObstacles.push({ x, z, hw, hd, box: true }),
  });

  // doors — from spec + persisted extras (reciprocal doors added at runtime)
  const doors = [...(spec.doors || []), ...BobOS.fs.read(P.doors(spec.id), [])];
  doors.forEach((door) => {
    const dg = makeZoneDoor(root, door, style);
    H2(dg, door.label || `Go to ${door.target}`, 'door', { target: door.target });
  });

  // placed catalogue items — seed fs from spec on first visit, then fs is authoritative
  let placed = BobOS.fs.read(P.placed(spec.id), null);
  if (placed == null) {
    placed = (spec.placed || []).map(r => ({ uid: nextUid(), ...r }));
    BobOS.fs.write(P.placed(spec.id), placed);
  }
  placed.forEach(rec => { const o = spawnPlaced(root, rec, style); if (o) { mov.push(o); wireAction(o, rec, hot); } });

  const { w, h, d } = spec.size;
  const bounds = spec.kind === 'outdoor'
    ? [-w / 2 + 1, w / 2 - 1, -d / 2 + 1, d / 2 - 1]
    : [-w / 2 + 0.6, w / 2 - 0.6, -d / 2 + 0.6, d / 2 - 0.6];

  const def = {
    id: spec.id, title: spec.name, root, hotspots: hot, movables: mov,
    kind: spec.kind, style, icon: spec.icon,
    cam: spec.cam || (spec.kind === 'outdoor'
      ? { pos: [0, 3.2, d * 0.42], look: [0, 1.2, -d * 0.1] }
      : { pos: [0, 1.85, d * 0.68], look: [0, 1.4, -d * 0.2] }),
    bounds, navObstacles: fixtureObstacles,
    orbit: spec.kind === 'outdoor' ? { maxDist: Math.max(w, d), maxPolar: Math.PI * 0.52 } : { maxDist: 14, maxPolar: Math.PI * 0.54 },
    tick: (t) => { fixtureTicks.forEach(fn => fn(t)); spec.tick?.(t, root); },
    isData: true, spec,
  };
  return def;
}

// ── build a legacy zone (bespoke room) ──────────────────────────
function buildLegacyZone(scene, id, X) {
  const cfg = LEGACY[id];
  const def = cfg.legacy(scene, X);
  def.kind = cfg.kind;
  def.icon = cfg.icon;
  def.style = cfg.style;
  def.orbit = def.orbit ?? { maxDist: 14, maxPolar: Math.PI * 0.54 };   // a legacy zone may declare its own (the porch's street needs 46)
  const s = def.size || { w: 10, h: 4.5, d: 7 };
  def.bounds = def.bounds; // legacy uses GUIDE_HOME in main; keep undefined -> main falls back
  return def;
}

// ── PUBLIC: build the whole estate ──────────────────────────────
// Returns { zones, order, layout, api } — api holds runtime designer/zone operations.
export function buildZones(scene, estateSpecs = []) {
  estateSpecs.forEach(registerZone);
  const zones = {};
  const built = [];              // preserve X layout order

  // order: porch, legacy rooms, then estate zones, then any user-created zones from index
  const legacyOrder = ['porch', 'family', 'study', 'kitchen', 'attic'];
  const estateOrder = estateSpecs.map(s => s.id);
  const index = BobOS.fs.read(P.index, null);
  const userOrder = (index || []).filter(e => e.user).map(e => e.id);
  const order = [...legacyOrder, ...estateOrder, ...userOrder];

  const buildOne = (id, X) => {
    let def;
    if (LEGACY[id]) def = buildLegacyZone(scene, id, X);
    else {
      let spec = SPECS.get(id);
      if (!spec) spec = BobOS.fs.read(P.spec(id), null);   // user-created zone
      if (!spec) { console.warn('[zones] no spec for', id); return null; }
      def = buildDataZone(scene, spec, X);
    }
    def.x = X;
    // fold object ticks (fire, window life, animated fixtures) into the zone tick
    const ticks = [];
    def.root.traverse(o => { if (o.userData.tick) ticks.push(o.userData.tick); });
    const zoneTick = def.tick;
    def.tick = (t) => { zoneTick?.(t); for (const fn of ticks) fn(t); };
    return def;
  };

  order.forEach((id, i) => {
    const def = buildOne(id, i * ROOM_SPACING);
    if (def) { def.x = i * ROOM_SPACING; zones[id] = def; built.push(id); }
  });

  // write/refresh the zone index (so reload rebuilds everything, incl. user zones)
  const idxEntries = built.map(id => {
    const z = zones[id];
    return { id, kind: z.kind, name: z.title, icon: z.icon, user: !LEGACY[id] && !SPECS.has(id) };
  });
  BobOS.fs.write(P.index, idxEntries);

  return { zones, order: built, layout: ROOM_SPACING, buildOne };
}

// ── runtime API factory (needs scene + live zones dict from main) ──
export function makeZoneApi(scene, zones, order, onZoneAdded, refreshAfterRebuild) {
  const api = {
    listZones() { return order.map(id => ({ id, ...zones[id] })); },
    zone(id) { return zones[id]; },
    styleOf(id) { return zones[id]?.style || 'bob'; },

    // place a catalogue item, persist it, return the live object
    placeItem(zoneId, cat, opts = {}) {
      const z = zones[zoneId]; if (!z) return null;
      const rec = { uid: nextUid(), cat, x: opts.x || 0, y: opts.y || 0, z: opts.z || 0,
        ry: opts.ry || 0, scale: opts.scale || 1, color: opts.color ?? null, variant: opts.variant ?? 0, style: opts.style ?? null };
      // actions can ride on any placement, whatever the item's category
      ['app', 'zone', 'launch', 'action', 'label'].forEach(k => { if (opts[k] != null) rec[k] = opts[k]; });
      const placed = BobOS.fs.read(P.placed(zoneId), []);
      placed.push(rec); BobOS.fs.write(P.placed(zoneId), placed);
      const o = spawnPlaced(z.root, rec, z.style);
      if (o) { z.movables.push(o); wireAction(o, rec, z.hotspots); }
      return o;
    },
    // update a placed item's transform/props from its live object
    saveItem(obj) {
      const uid = obj.userData.placedUid; if (!uid) return false;
      const zoneId = obj.userData.zoneId || currentZoneOf(obj, zones);
      if (!zoneId) return false;
      const placed = BobOS.fs.read(P.placed(zoneId), []);
      const rec = placed.find(r => r.uid === uid); if (!rec) return false;
      rec.x = obj.position.x; rec.y = obj.position.y; rec.z = obj.position.z;
      rec.ry = obj.rotation.y; rec.scale = obj.scale.x;
      rec.visible = obj.visible;
      BobOS.fs.write(P.placed(zoneId), placed);
      return true;
    },
    removeItem(obj) {
      const uid = obj.userData.placedUid; if (!uid) return false;
      const zoneId = currentZoneOf(obj, zones); if (!zoneId) return false;
      const placed = BobOS.fs.read(P.placed(zoneId), []).filter(r => r.uid !== uid);
      BobOS.fs.write(P.placed(zoneId), placed);
      const z = zones[zoneId];
      if (z) for (let i = z.hotspots.length - 1; i >= 0; i--) if (z.hotspots[i].obj === obj) z.hotspots.splice(i, 1);
      obj.parent?.remove(obj);
      return true;
    },
    // recolor / restyle a single placed item (rebuild in place)
    reskinItem(obj, patch) {
      const uid = obj.userData.placedUid; if (!uid) return null;
      const zoneId = currentZoneOf(obj, zones); if (!zoneId) return null;
      const placed = BobOS.fs.read(P.placed(zoneId), []);
      const rec = placed.find(r => r.uid === uid); if (!rec) return null;
      Object.assign(rec, patch);
      BobOS.fs.write(P.placed(zoneId), placed);
      const z = zones[zoneId];
      const fresh = spawnPlaced(z.root, rec, z.style);
      if (fresh) {
        fresh.userData.movable = obj.userData.movable;
        const mi = z.movables.indexOf(obj); if (mi >= 0) z.movables[mi] = fresh;
        z.hotspots.forEach(h => { if (h.obj === obj) h.obj = fresh; });   // action follows the rebuilt object
      }
      obj.parent?.remove(obj);
      return fresh;
    },

    // set a whole-zone style (persist + rebuild data zones; tint-overlay legacy rooms)
    setZoneStyle(zoneId, style) {
      BobOS.fs.write(P.style(zoneId), style);
      const z = zones[zoneId];
      if (z && !z.isData) { applyLegacyOverlay(z, style); z.style = style; return z; }
      return this.rebuildZone(zoneId);
    },
    // set whole-house style — data zones rebuild, the 4 original rooms get a palette tint
    setHouseStyle(style) {
      order.forEach(id => { BobOS.fs.write(P.style(id), style); });
      order.forEach(id => {
        const z = zones[id];
        if (!z) return;
        if (z.isData) this.rebuildZone(id);
        else if (id !== 'porch') { applyLegacyOverlay(z, style); z.style = style; }
      });
    },

    // rebuild a data zone in place (after style/structural change)
    rebuildZone(zoneId) {
      const old = zones[zoneId]; if (!old || !old.isData) return old;
      const X = old.x;
      const wasCurrent = old.__current;
      scene.remove(old.root);
      old.root.traverse(o => { o.geometry?.dispose?.(); });
      const spec = old.spec || SPECS.get(zoneId) || BobOS.fs.read(P.spec(zoneId), null);
      const def = buildDataZone(scene, spec, X);
      def.x = X;
      const ticks = [];
      def.root.traverse(o => { if (o.userData.tick) ticks.push(o.userData.tick); });
      const zt = def.tick; def.tick = (t) => { zt?.(t); for (const fn of ticks) fn(t); };
      zones[zoneId] = def;
      refreshAfterRebuild?.(zoneId, def);
      return def;
    },

    // add a brand-new zone at runtime, connect it with reciprocal doors, persist
    addZone(spec, fromZoneId) {
      if (zones[spec.id]) return zones[spec.id];
      const X = order.length * ROOM_SPACING;
      BobOS.fs.write(P.spec(spec.id), spec);
      registerZone(spec);
      const def = buildDataZone(scene, spec, X);
      def.x = X;
      const ticks = [];
      def.root.traverse(o => { if (o.userData.tick) ticks.push(o.userData.tick); });
      const zt = def.tick; def.tick = (t) => { zt?.(t); for (const fn of ticks) fn(t); };
      zones[spec.id] = def; order.push(spec.id);
      // reciprocal doors: from -> new, new -> from
      if (fromZoneId && zones[fromZoneId]) {
        const fz = zones[fromZoneId];
        addDoor(fromZoneId, { target: spec.id, label: `Go to ${spec.name}`, x: doorSlot(fz), z: -((fz.spec?.size?.d || 6) / 2) + 0.2 });
        // return door on the NEW zone's back wall (away from the entry camera), like the house rooms
        addDoorRec(spec.id, { target: fromZoneId, label: `Back to ${fz.title}`,
          x: -((spec.size?.w || 8) / 2) + 1.3, z: -((spec.size?.d || 8) / 2) + 0.2, ry: 0 });
        api.rebuildZone(spec.id);
      }
      // refresh the index
      const idx = BobOS.fs.read(P.index, []);
      idx.push({ id: spec.id, kind: spec.kind, name: spec.name, icon: spec.icon, user: true });
      BobOS.fs.write(P.index, idx);
      onZoneAdded?.(spec.id, def);
      return def;
    },
  };

  // add a door to a live zone (persist + rebuild so it appears)
  function addDoor(zoneId, door) { addDoorRec(zoneId, door); api.rebuildZone(zoneId); }
  function addDoorRec(zoneId, door) {
    const doors = BobOS.fs.read(P.doors(zoneId), []);
    doors.push(door); BobOS.fs.write(P.doors(zoneId), doors);
  }
  function doorSlot(z) { return ((z.spec?.size?.w || 8) / 2) - 1.2; }

  return api;
}

// Legacy rooms keep their hand-built furniture but their SHELL (walls/floor/ceiling) is
// re-tinted to the chosen style, so "restyle the whole house" visibly reaches them too.
// Restoring 'bob' clears the overlay back to the originals.
function applyLegacyOverlay(z, style) {
  if (!z.__origMats) {
    z.__origMats = new Map();
    z.root.traverse(o => { if (o.geometry?.type?.includes('Plane') && o.material) z.__origMats.set(o, o.material); });
  }
  const tmp = new THREE.Vector3();
  z.__origMats.forEach((orig, o) => {
    const p = o.geometry.parameters || {};
    const area = (p.width || 0) * (p.height || 0);
    if (area < 18) return;   // skip rugs, art, windows — only the big shell planes
    if (style === 'bob' || style === z.style && false) { o.material = orig; return; }
    const horiz = Math.abs(Math.abs(o.rotation.x) - Math.PI / 2) < 0.4;
    o.getWorldPosition(tmp);
    const slot = horiz ? (tmp.y < 1.2 ? 'floor' : 'ceil') : 'wall';
    const m = orig.clone();
    m.color.setHex(styleColor(style, slot));
    o.material = m;
  });
  if (style === 'bob') { z.__origMats.forEach((orig, o) => { o.material = orig; }); }
}

function currentZoneOf(obj, zones) {
  let o = obj;
  while (o) { for (const id in zones) if (zones[id].root === o) return id; o = o.parent; }
  return null;
}

// reset helpers (Options → reset)
export function resetZone(id) {
  BobOS.fs.remove(P.placed(id)); BobOS.fs.remove(P.style(id)); BobOS.fs.remove(P.doors(id));
}
export function resetHouse() { BobOS.fs.removeDir('home/zones/'); }
