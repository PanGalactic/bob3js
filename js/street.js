// street.js — the world outside the front door: the house with its garage and
// driveway, a path down to the pavement, the road with passing cars, neighbours,
// streetlamps — all lit by the real time of day. Mounted by buildPorch(); the
// signature door close-up is unchanged and the street reveals itself on zoom-out.
import * as THREE from 'three';
import { mat, box, cyl, sph, plane, group, canvasTexture } from './util.js';

// ── time of day ─────────────────────────────────────────────────
export function phaseForHour(h) {
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 18) return 'day';
  if (h < 21) return 'dusk';
  return 'night';
}

// sun/moon, sky-light and lamp levels per phase
const PHASES = {
  day:   { sun: { color: 0xfff3d8, i: 2.4, pos: [18, 30, 22] },  hemi: { sky: 0xbfe0ff, gnd: 0x6aa04a, i: 1.0 },  amb: { color: 0xffffff, i: 0.4 },  lamps: 0, glow: 0 },
  dawn:  { sun: { color: 0xffc890, i: 1.3, pos: [-30, 8, 25] },  hemi: { sky: 0xc9d8ff, gnd: 0x7a8a5a, i: 0.7 },  amb: { color: 0xffe0d0, i: 0.5 },  lamps: 0.5, glow: 0.4 },
  dusk:  { sun: { color: 0xff9a50, i: 1.1, pos: [30, 6, 25] },   hemi: { sky: 0x9a86b8, gnd: 0x5a5040, i: 0.65 }, amb: { color: 0xffc9a0, i: 0.55 }, lamps: 1, glow: 0.8 },
  night: { sun: { color: 0xaec4ff, i: 0.7, pos: [-20, 25, 20] }, hemi: { sky: 0x2a3550, gnd: 0x1a2010, i: 0.5 },  amb: { color: 0x6a6480, i: 1.6 },  lamps: 1, glow: 1 },
};

// ── texture painters ────────────────────────────────────────────
function brickTex(base = '#5c2018', mortar = '#3a120c', repeat = [4, 3]) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = mortar; g.lineWidth = 4;
    for (let y = 0; y <= 256; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      const off = (y / 32) % 2 ? 32 : 0;
      for (let x = off; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
  }, { repeat });
}
function grassTex(repeat) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#4e8a34'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) { g.fillStyle = ['#447c2e', '#578f3c', '#4a8232'][i % 3]; g.fillRect((i * 61) % 256, (i * 97) % 256, 3, 6); }
  }, { repeat });
}
function asphaltTex(repeat) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#37393e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { g.fillStyle = i % 2 ? '#3d4046' : '#303236'; g.fillRect((i * 53) % 256, (i * 89) % 256, 4, 4); }
    g.fillStyle = '#d8d4c0';                        // dashed centre line runs along u
    for (let x = 0; x < 256; x += 64) g.fillRect(x, 124, 34, 8);
  }, { repeat });
}
function pavingTex(repeat) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#b0aa9c'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#948e80'; g.lineWidth = 5;
    for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  }, { repeat });
}
function concreteTex(repeat) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#9a9488'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 200; i++) { g.fillStyle = i % 2 ? '#928c80' : '#a29c90'; g.fillRect((i * 71) % 256, (i * 101) % 256, 5, 3); }
    g.strokeStyle = '#7e7870'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
  }, { repeat });
}
function garageDoorTex() {
  return canvasTexture(256, 160, (g) => {
    g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = '#b8b2a2'; g.lineWidth = 5;
    for (let y = 32; y < 160; y += 32) { g.beginPath(); g.moveTo(6, y); g.lineTo(250, y); g.stroke(); }
    g.strokeStyle = '#8a8478'; g.lineWidth = 3; g.strokeRect(4, 4, 248, 152);
  });
}

function skyTex(phase) {
  return canvasTexture(1024, 512, (g) => {
    const grad = g.createLinearGradient(0, 40, 0, 300);
    if (phase === 'day') { grad.addColorStop(0, '#3f7fd0'); grad.addColorStop(0.7, '#7fb0e0'); grad.addColorStop(1, '#cfe6f2'); }
    else if (phase === 'dawn') { grad.addColorStop(0, '#4a5a9a'); grad.addColorStop(0.55, '#c97a9a'); grad.addColorStop(1, '#ffcf8a'); }
    else if (phase === 'dusk') { grad.addColorStop(0, '#2c2a58'); grad.addColorStop(0.5, '#8a4a78'); grad.addColorStop(1, '#ff9a50'); }
    else { grad.addColorStop(0, '#05070f'); grad.addColorStop(0.8, '#0c1226'); grad.addColorStop(1, '#141c34'); }
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    if (phase === 'day') {                              // puffy clouds
      g.fillStyle = 'rgba(255,255,255,0.85)';
      [[140, 90, 60], [420, 130, 44], [700, 80, 70], [900, 150, 40], [560, 60, 34]].forEach(([x, y, r]) => {
        g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 10, r * 0.7, 0, 7); g.arc(x - r, y + 12, r * 0.6, 0, 7); g.fill();
      });
    }
    if (phase === 'dawn' || phase === 'dusk') {         // low sun + tinted streaks
      const sx = phase === 'dawn' ? 260 : 760;
      const sun = g.createRadialGradient(sx, 268, 8, sx, 268, 80);
      sun.addColorStop(0, '#fff2c8'); sun.addColorStop(0.5, '#ffc878'); sun.addColorStop(1, 'rgba(255,180,110,0)');
      g.fillStyle = sun; g.beginPath(); g.arc(sx, 268, 80, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,190,140,0.35)';
      [[0, 200, 1024, 8], [80, 228, 800, 6], [200, 250, 824, 5]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
    }
    if (phase === 'night') {                            // stars + moon
      for (let i = 0; i < 140; i++) {
        g.fillStyle = i % 5 ? '#cdd6ff' : '#fff6d8';
        g.fillRect((i * 137.3) % 1024, (i * 71.9) % 260, i % 3 ? 2 : 3, i % 3 ? 2 : 3);
      }
      g.fillStyle = '#f2edd8'; g.beginPath(); g.arc(780, 110, 34, 0, 7); g.fill();
      g.fillStyle = '#0c1226'; g.beginPath(); g.arc(766, 100, 30, 0, 7); g.fill();  // crescent bite
    }
  });
}

// ── little builders ─────────────────────────────────────────────
function makeWindow(parent, w, h, x, y, z, glassMats, opts = {}) {
  const frame = mat(0xf0ead8, { roughness: 0.7 });
  const win = group(parent, x, y, z);
  if (opts.ry) win.rotation.y = opts.ry;
  win.add(box(w + 0.16, h + 0.16, 0.08, frame, 0, 0, 0));
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3644, roughness: 0.2, metalness: 0.5, emissive: 0xffc36a, emissiveIntensity: 0 });
  glassMats.push(glass);
  win.add(plane(w, h, glass, 0, 0, 0.05));
  win.add(box(0.05, h, 0.03, frame, 0, 0, 0.06));               // glazing bars
  win.add(box(w, 0.05, 0.03, frame, 0, 0, 0.06));
  return win;
}

function makeTree(parent, x, z, s = 1) {
  const t = group(parent, x, 0, z);
  t.add(cyl(0.14 * s, 0.2 * s, 1.6 * s, mat(0x5a3c1c, { roughness: 1 }), 0, 0.8 * s, 0, 10));
  const leaf = mat(0x3e7a30, { roughness: 1 });
  t.add(sph(0.95 * s, leaf, 0, 2.1 * s, 0, 12, 9));
  t.add(sph(0.65 * s, leaf, 0.55 * s, 1.7 * s, 0.1, 10, 8));
  t.add(sph(0.6 * s, leaf, -0.5 * s, 1.8 * s, -0.1, 10, 8));
  return t;
}

function makeStreetlamp(parent, x, z, lampLights, glowMats) {
  const g = group(parent, x, 0, z);
  const iron = mat(0x2a3428, { metalness: 0.4, roughness: 0.6 });
  g.add(cyl(0.06, 0.09, 4.6, iron, 0, 2.3, 0, 10));
  g.add(cyl(0.05, 0.05, 1.0, iron, 0, 4.55, 0.45, 8, { rx: Math.PI / 2 }));   // arm toward road
  const bulb = new THREE.MeshStandardMaterial({ color: 0xfff4cf, emissive: 0xffd98a, emissiveIntensity: 0 });
  glowMats.push(bulb);
  const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 9), bulb);
  bulbMesh.position.set(0, 4.42, 0.95);
  g.add(bulbMesh);
  const l = new THREE.PointLight(0xffd9a0, 0, 11, 1.7);
  l.position.set(0, 4.3, 0.95);
  g.add(l);
  lampLights.push({ light: l, base: 26 });
  return g;
}

function makeCar(parent, color, headMats) {
  const g = group(parent, 0, 0, 0);
  const body = mat(color, { roughness: 0.35, metalness: 0.4 });
  g.add(box(3.6, 0.52, 1.6, body, 0, 0.5, 0));
  g.add(box(1.9, 0.5, 1.4, body, -0.1, 0.98, 0));
  g.add(box(1.7, 0.36, 1.3, new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.15, metalness: 0.6 }), -0.1, 1.02, 0));
  const tyre = mat(0x181818, { roughness: 0.9 });
  [[-1.15, 0.72], [-1.15, -0.72], [1.15, 0.72], [1.15, -0.72]].forEach(([x, z]) =>
    g.add(cyl(0.3, 0.3, 0.22, tyre, x, 0.3, z, 14, { rx: Math.PI / 2 })));
  const head = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffeab0, emissiveIntensity: 0 });
  headMats.push(head);
  const tail = new THREE.MeshStandardMaterial({ color: 0x701010, emissive: 0xff2020, emissiveIntensity: 0 });
  headMats.push(tail);
  [0.55, -0.55].forEach(z => {
    g.add(sph(0.09, head, 1.78, 0.55, z, 8, 6));
    g.add(box(0.06, 0.1, 0.24, tail, -1.8, 0.55, z));
  });
  return g;
}

// ── the street ──────────────────────────────────────────────────
// Layout (porch-local): door at origin; lawn out to the pavement at z≈14,
// road z 16–22.5, neighbours opposite at z≈29. Everything fits within ±40 x.
export function buildStreet(root, opts = {}) {
  const S = group(root, 0, 0, 0);
  const lampLights = [];      // {light, base} — scaled by phase lamp level
  const glowMats = [];        // emissive mats that come on after dark (bulbs)
  const windowMats = [];      // house/neighbour windows — warm glow at night
  const headMats = [];        // car head/tail lights
  if (opts.phaseLights) lampLights.push(...opts.phaseLights);

  // ground planes (layered slightly above each other to avoid z-fighting)
  S.add(plane(80, 24, new THREE.MeshStandardMaterial({ map: grassTex([26, 8]), roughness: 1 }), 0, 0, 4, { rx: -Math.PI / 2 }));
  S.add(plane(80, 12, new THREE.MeshStandardMaterial({ map: grassTex([26, 4]), roughness: 1 }), 0, 0, 30.5, { rx: -Math.PI / 2 }));
  S.add(box(6.4, 0.08, 3.6, mat(0xa8a094, { roughness: 0.95 }), 0, 0.001, 1.55));                                     // porch slab
  S.add(plane(1.5, 11, new THREE.MeshStandardMaterial({ map: pavingTex([1, 5]), roughness: 1 }), 0, 0.012, 8.6, { rx: -Math.PI / 2 }));   // front path
  S.add(plane(4.4, 16.4, new THREE.MeshStandardMaterial({ map: concreteTex([1, 5]), roughness: 1 }), 8.8, 0.012, 7.35, { rx: -Math.PI / 2 })); // driveway
  S.add(plane(80, 2, new THREE.MeshStandardMaterial({ map: pavingTex([28, 1]), roughness: 1 }), 0, 0.014, 15, { rx: -Math.PI / 2 }));     // our pavement
  S.add(box(80, 0.14, 0.22, mat(0x8a8478, { roughness: 0.9 }), 0, 0.07, 16.1));                                       // kerb
  S.add(plane(80, 6.5, new THREE.MeshStandardMaterial({ map: asphaltTex([12, 1]), roughness: 0.95 }), 0, 0.008, 19.35, { rx: -Math.PI / 2 })); // road
  S.add(box(80, 0.14, 0.22, mat(0x8a8478, { roughness: 0.9 }), 0, 0.07, 22.6));
  S.add(plane(80, 2, new THREE.MeshStandardMaterial({ map: pavingTex([28, 1]), roughness: 1 }), 0, 0.014, 23.7, { rx: -Math.PI / 2 }));   // far pavement

  // ── our house: brick block behind the existing door, gable roof, windows ──
  const wallM = new THREE.MeshStandardMaterial({ map: brickTex('#5c2018', '#3a120c', [6, 3]), color: 0xb08068, roughness: 0.9 });
  // our house gets its own material instances so the orbit-behind ghosting
  // (see tick) can fade them without touching the neighbours that share wallM/roofM
  const ourWallM = wallM.clone();
  const house = group(S, 0, 0, 0);
  house.add(box(14, 7.0, 7, ourWallM, 0, 3.5, -4.1));
  // gable roof: ridge along x at (z=-4.1, y=9.25), eaves overhang the walls
  const ridge = { z: -4.1, y: 9.25 }, eave = { z: 0.35, y: 6.39 };
  const run = eave.z - ridge.z, drop = ridge.y - eave.y;
  const roofM = new THREE.MeshStandardMaterial({ color: 0x40444e, roughness: 0.85, side: THREE.DoubleSide });
  const ourRoofM = roofM.clone();
  const ang = Math.atan2(run, drop), len = Math.hypot(run, drop), midY = (ridge.y + eave.y) / 2;
  house.add(plane(15.2, len, ourRoofM, 0, midY, (ridge.z + eave.z) / 2, { rx: -ang }));
  house.add(plane(15.2, len, ourRoofM, 0, midY, ridge.z - run / 2, { rx: ang }));
  wallM.side = THREE.DoubleSide;
  ourWallM.side = THREE.DoubleSide;
  // gable ends: shape drawn in (z, y), the -90° y-rotation maps shape-x onto world z
  const gableShape = new THREE.Shape([new THREE.Vector2(-0.6, 7.0), new THREE.Vector2(-7.6, 7.0), new THREE.Vector2(ridge.z, ridge.y)]);
  [-7, 7].forEach(x => {
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), ourWallM);
    gable.rotation.y = -Math.PI / 2;
    gable.position.x = x;
    house.add(gable);
  });
  house.add(box(0.9, 1.6, 0.9, ourWallM, 4.2, 9.2, -4.1));                    // chimney
  house.add(box(1.1, 0.14, 1.1, mat(0x8a8478), 4.2, 10.0, -4.1));
  // windows: two flanking the door, three upstairs (clear of the door frame)
  [[-4.6, 2.0], [4.6, 2.0], [-4.6, 5.35], [0, 5.35], [4.6, 5.35]].forEach(([x, y]) =>
    makeWindow(house, 1.5, 1.7, x, y, -0.52, windowMats));

  // ── garage wing + driveway door ──
  const garage = group(S, 0, 0, 0);
  garage.add(box(5.6, 3.4, 6, ourWallM, 9.4, 1.7, -3.6));
  garage.add(box(6.2, 0.3, 6.8, ourRoofM, 9.4, 3.5, -3.6));
  garage.add(plane(4.4, 2.7, new THREE.MeshStandardMaterial({ map: garageDoorTex(), roughness: 0.6 }), 9.4, 1.4, -0.58));

  // orbit-behind ghosting: when the camera swings past the front-wall plane the
  // house shell would block the porch, so its materials fade to a faint x-ray.
  // Every material here is ours alone (see ourWallM/ourRoofM above); window mats
  // stay in windowMats so the night glow keeps driving them while ghosted.
  const shellMats = new Set();
  [house, garage].forEach(g => g.traverse(o => { if (o.isMesh) shellMats.add(o.material); }));
  let shellFade = 1, lastT = 0;
  const camLocal = new THREE.Vector3();

  // ── garden dressing: hedges at the property line, trees, mailbox ──
  const hedge = mat(0x2e5c2a, { roughness: 1 });
  [-13, 13.8].forEach(x => S.add(box(0.9, 1.1, 13, hedge, x, 0.55, 7.4)));
  makeTree(S, -9.5, 9.5, 1.15); makeTree(S, -17, 5, 0.9); makeTree(S, 17.5, 8, 1.0);
  makeTree(S, -26, 27, 1.1); makeTree(S, 12, 27.5, 0.95); makeTree(S, 30, 26.6, 1.05);
  const mailbox = group(S, 1.35, 0, 13.2);
  mailbox.add(cyl(0.05, 0.05, 1.0, mat(0x4a3420), 0, 0.5, 0, 8));
  mailbox.add(box(0.42, 0.3, 0.26, mat(0xc23030, { roughness: 0.5 }), 0, 1.1, 0));
  mailbox.add(box(0.04, 0.16, 0.03, mat(0xe8b23a, { metalness: 0.6 }), 0.24, 1.22, 0, { rz: -0.4 }));   // little flag

  // ── neighbours: our side, set back like us ──
  const nWall1 = new THREE.MeshStandardMaterial({ map: brickTex('#6a5a48', '#4a3e30', [5, 3]), color: 0xc8b8a0, roughness: 0.9 });
  const nWall2 = new THREE.MeshStandardMaterial({ map: brickTex('#4a5668', '#323c4c', [5, 3]), color: 0xa8b8c8, roughness: 0.9 });
  [[-27, nWall1], [28, nWall2]].forEach(([x, m]) => {
    const n = group(S, x, 0, -2);
    n.add(box(11, 5.6, 6, m, 0, 2.8, -3));
    n.add(box(12, 0.3, 7, roofM, 0, 5.85, -3));
    n.add(box(1.6, 2.6, 0.14, mat(0x5a3020, { roughness: 0.6 }), 0, 1.3, 0.02));
    [[-3.4, 1.9], [3.4, 1.9], [-3.4, 4.3], [3.4, 4.3]].forEach(([wx, wy]) => makeWindow(n, 1.3, 1.5, wx, wy, 0.06, windowMats));
  });
  // opposite side of the road — a row of house fronts facing back at us
  const oppMats = [nWall2, nWall1, wallM, nWall1];
  [-30, -11, 7, 26].forEach((x, i) => {
    const n = group(S, x, 0, 31);
    n.rotation.y = Math.PI;
    n.add(box(12, 5.8, 5, oppMats[i], 0, 2.9, -2.5));
    n.add(box(13, 0.3, 6, roofM, 0, 6.05, -2.5));
    n.add(box(1.6, 2.6, 0.14, mat([0x7a1818, 0x2a4a28, 0x24365a, 0x5a3020][i], { roughness: 0.55 }), 1.8, 1.3, 0.02));
    [[-3.6, 1.9], [-1.2, 1.9], [-3.6, 4.2], [1.6, 4.2], [3.8, 1.9]].forEach(([wx, wy]) => makeWindow(n, 1.25, 1.45, wx, wy, 0.06, windowMats));
  });

  // ── streetlamps along our pavement + one opposite ──
  makeStreetlamp(S, -22, 15.5, lampLights, glowMats);
  makeStreetlamp(S, -6, 15.5, lampLights, glowMats);
  makeStreetlamp(S, 14, 15.5, lampLights, glowMats);
  const far = makeStreetlamp(S, 2, 23.2, lampLights, glowMats); far.rotation.y = Math.PI;
  makeStreetlamp(S, 32, 15.5, lampLights, glowMats);

  // ── cars: one on the drive, one at the kerb, two driving (UK: left side) ──
  const parked = makeCar(S, 0x2a5a9a, headMats);
  parked.position.set(8.8, 0, 5.6); parked.rotation.y = Math.PI / 2;
  const kerbCar = makeCar(S, 0x8a2a24, headMats);
  kerbCar.position.set(-15, 0, 17.3);
  const moverA = makeCar(S, 0xd8d4c8, headMats); moverA.rotation.y = Math.PI;   // near lane → -x
  const moverB = makeCar(S, 0x2a6a3a, headMats);                                // far lane → +x
  const movers = [
    // near lane passes the kerb-parked car — avoid makes it pull out around it
    { g: moverA, z: 17.8, speed: 7.5, dir: -1, off: 12, avoid: { x: kerbCar.position.x, dz: 1.8, w: 5.5 } },
    { g: moverB, z: 20.9, speed: 6.2, dir: 1, off: 47 },
  ];

  // ── sky + phase lighting ──
  const skyM = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(78, 28, 18), skyM);
  S.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.far = 110;
  S.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1);
  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  S.add(hemi, amb);

  let phase = null;
  function setPhase(p) {
    if (p === phase || !PHASES[p]) return;
    phase = p;
    const P = PHASES[p];
    skyM.map?.dispose(); skyM.map = skyTex(p); skyM.needsUpdate = true;
    sun.color.set(P.sun.color); sun.intensity = P.sun.i; sun.position.set(...P.sun.pos);
    hemi.color.set(P.hemi.sky); hemi.groundColor.set(P.hemi.gnd); hemi.intensity = P.hemi.i;
    amb.color.set(P.amb.color); amb.intensity = P.amb.i;
    lampLights.forEach(({ light, base }) => { light.intensity = base * P.lamps; });
    glowMats.forEach(m => { m.emissiveIntensity = 3.5 * P.lamps; });
    headMats.forEach((m, i) => { m.emissiveIntensity = (i % 2 ? 1.4 : 2.6) * P.lamps; });
    windowMats.forEach((m, i) => { m.emissiveIntensity = (0.9 + (i % 5) * 0.28) * P.glow; });
    opts.onPhase?.(p, P);
  }
  setPhase(phaseForHour(new Date().getHours()));

  let nextCheck = 0;
  function tick(t, camera) {
    if (t > nextCheck) { nextCheck = t + 30; setPhase(phaseForHour(new Date().getHours())); }
    for (const m of movers) {
      const x = ((t * m.speed + m.off) % 88) - 44;
      const px = m.dir > 0 ? x : -x;
      // pull out around a parked car: a smooth bulge toward the road centre
      let dz = 0, yaw = 0;
      if (m.avoid) {
        const bump = (p) => m.avoid.dz * Math.exp(-(((p - m.avoid.x) / m.avoid.w) ** 2));
        dz = bump(px);
        yaw = -Math.atan2(bump(px + m.dir * 0.6) - dz, 0.6) * m.dir;
      }
      m.g.position.set(px, 0, m.z + dz);
      m.g.rotation.y = (m.dir > 0 ? 0 : Math.PI) + yaw;
    }
    // ghost the house shell while the camera is behind the front-wall plane
    if (camera) {
      const dt = Math.min(Math.max(t - lastT, 0), 0.05); lastT = t;
      S.worldToLocal(camLocal.copy(camera.position));
      const target = camLocal.z < -0.55 ? 0.12 : 1;
      shellFade += (target - shellFade) * Math.min(1, dt * 7);
      if (Math.abs(target - shellFade) < 0.005) shellFade = target;
      const ghosted = shellFade < 0.999;
      for (const m of shellMats) {
        m.transparent = ghosted;
        m.opacity = shellFade;
        m.depthWrite = !ghosted;
      }
    }
  }

  const api = { tick, setPhase, phase: () => phase, mailbox };
  window.__street = api;   // debug handle, same spirit as window.__bob
  return api;
}
