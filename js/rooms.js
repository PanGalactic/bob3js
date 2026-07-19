// rooms.js — the house: porch (login door) + Family Room, Study, Kitchen, Castle Attic
// Layouts, palettes and furnishings are modeled on the original 1995 screenshots.
import * as THREE from 'three';
import {
  mat, box, cyl, sph, plane, group, canvasTexture,
  sunsetTexture, cityTexture, calendarPageTexture, bookRowTexture,
} from './util.js';
import { buildStreet } from './street.js';

export const ROOM_SPACING = 80;

// ── small shared builders ───────────────────────────────────────

function makeShell(parent, W, H, D, wallM, floorM, ceilM) {
  const g = group(parent);
  const floor = plane(W, D, floorM, 0, 0, 0, { rx: -Math.PI / 2 });
  floor.receiveShadow = true;
  g.add(floor);
  g.add(plane(W, D, ceilM, 0, H, 0, { rx: Math.PI / 2 }));
  g.add(plane(W, H, wallM, 0, H / 2, -D / 2));                    // back
  g.add(plane(D, H, wallM, -W / 2, H / 2, 0, { ry: Math.PI / 2 })); // left
  g.add(plane(D, H, wallM, W / 2, H / 2, 0, { ry: -Math.PI / 2 })); // right
  g.add(plane(W, H, wallM, 0, H / 2, D / 2, { ry: Math.PI }));      // front (behind camera)
  return g;
}

function makeWindow(parent, x, y, z, w, h, tex, opts = {}) {
  const g = group(parent, x, y, z);
  if (opts.ry) g.rotation.y = opts.ry;
  const frameM = mat(opts.frame ?? 0xc97f2f);
  const glow = plane(w, h, new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0);
  glow.material.toneMapped = true;
  g.add(glow);
  const t = 0.1;
  g.add(box(w + 0.24, t * 1.6, 0.14, frameM, 0, h / 2 + t * 0.8, 0.02));
  g.add(box(w + 0.24, t * 2.2, 0.2, frameM, 0, -h / 2 - t, 0.06)); // sill
  g.add(box(t * 1.6, h + 0.2, 0.14, frameM, -w / 2 - t * 0.8, 0, 0.02));
  g.add(box(t * 1.6, h + 0.2, 0.14, frameM, w / 2 + t * 0.8, 0, 0.02));
  g.add(box(0.07, h, 0.1, frameM, 0, 0, 0.03));           // muntins
  g.add(box(w, 0.07, 0.1, frameM, 0, 0, 0.03));
  // soft light spilling in
  const l = new THREE.PointLight(opts.lightColor ?? 0xffb070, opts.lightPower ?? 6, 7, 1.8);
  l.position.set(0, 0, 0.8);
  g.add(l);
  if (opts.life) addWindowLife(g, opts.life, w, h);
  return g;
}

// subtle things happening outside: drifting boats, twinkling city lights, shooting stars
function addWindowLife(g, kind, w, h) {
  const zf = 0.045;   // just in front of the glass, behind the muntins
  const anims = [];
  if (kind === 'sunset') {
    // a sailboat that drifts slowly across the harbour, low in the frame
    const boat = new THREE.Group();
    const silh = mat(0x241130);
    boat.add(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0x241130 })));
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.14), new THREE.MeshBasicMaterial({ color: 0x2c1638 }));
    sail.position.set(0.01, 0.09, 0.001); boat.add(sail);
    boat.position.z = zf; g.add(boat);
    anims.push((t) => { const p = ((t * 0.012) % 1); boat.position.set((-0.5 + p) * w * 0.8, -h * 0.12 + Math.sin(t * 0.7) * 0.006, zf); boat.scale.setScalar(0.9 + Math.sin(t) * 0.03); });
    // a gull that arcs across occasionally
    const gull = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x2a1640, transparent: true }));
    gull.position.z = zf; g.add(gull);
    anims.push((t) => { const c = (t * 0.05) % 4; const p = c < 1 ? c : -1; gull.visible = c < 1; if (c < 1) gull.position.set((-0.5 + p) * w, h * 0.28 - Math.sin(p * Math.PI) * 0.06, zf); });
  } else if (kind === 'city') {
    // twinkling lit windows
    const lights = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.045), new THREE.MeshBasicMaterial({ color: 0xffd66e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set((((i * 37) % 100) / 100 - 0.5) * w * 0.85, (((i * 53) % 60) / 60 - 0.35) * h * 0.6, zf);
      m.userData = { ph: i * 1.3, base: 0.4 + (i % 4) * 0.15 };
      g.add(m); lights.push(m);
    }
    anims.push((t) => lights.forEach(m => { m.material.opacity = m.userData.base + Math.max(0, Math.sin(t * (0.4 + m.userData.ph % 1) + m.userData.ph)) * 0.5 * (Math.sin(t * 3 + m.userData.ph) > 0.7 ? 0.3 : 1); }));
    // an occasional shooting star streaking across the night sky
    const star = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.008), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    star.rotation.z = -0.5; star.position.z = zf + 0.001; g.add(star);
    anims.push((t) => { const c = (t * 0.07) % 6; const p = c; star.visible = c < 1; if (c < 1) { star.position.set((-0.5 + p) * w, h * 0.34 - p * h * 0.15, zf + 0.001); star.material.opacity = Math.sin(p * Math.PI); } });
    // a slow-blinking aircraft light
    const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    plane2.position.z = zf; g.add(plane2);
    anims.push((t) => { const p = (t * 0.02) % 1; plane2.position.set((-0.5 + p) * w, h * 0.4, zf); plane2.material.opacity = (Math.sin(t * 4) > 0 ? 1 : 0.1); });
  }
  g.userData.tick = (t) => anims.forEach(a => a(t));
}

// a single upward flame-tongue (pointed top, wide base) rather than a round blob
function flameTexture(core = '255,248,205', mid = '255,168,48', edge = '224,64,16') {
  return canvasTexture(128, 160, (g) => {
    for (let i = 0; i < 128; i++) {
      const yy = i / 160;                       // 0 top .. 1 bottom
      const width = Math.sin((1 - yy) * Math.PI * 0.62) * 60;   // tongue profile
      const cx = 64;
      const grad = g.createLinearGradient(cx - width, 0, cx + width, 0);
      const a = Math.min(1, (1 - Math.abs(yy - 0.62)) * 1.3);
      grad.addColorStop(0, `rgba(${edge},0)`);
      grad.addColorStop(0.5, `rgba(${yy < 0.35 ? core : mid},${a})`);
      grad.addColorStop(1, `rgba(${edge},0)`);
      g.fillStyle = grad; g.fillRect(cx - width, i, width * 2, 2);
    }
    // hot core
    const r = g.createRadialGradient(64, 110, 3, 64, 110, 34);
    r.addColorStop(0, `rgba(${core},0.95)`); r.addColorStop(1, `rgba(${core},0)`);
    g.fillStyle = r; g.beginPath(); g.arc(64, 108, 34, 0, 7); g.fill();
  });
}
const FLAME_TEX = { hot: null, warm: null, ember: null };

function makeFire(parent, x, y, z, scale = 1) {
  FLAME_TEX.hot = FLAME_TEX.hot || flameTexture('255,250,210', '255,180,60', '230,70,18');
  FLAME_TEX.warm = FLAME_TEX.warm || flameTexture('255,210,120', '245,120,30', '190,40,10');
  FLAME_TEX.ember = FLAME_TEX.ember || canvasTexture(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 1, 16, 16, 15);
    r.addColorStop(0, 'rgba(255,220,140,1)'); r.addColorStop(0.5, 'rgba(255,140,40,0.8)'); r.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  });
  const g = group(parent, x, y, z);
  const flameMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });

  // glowing coal bed
  const coals = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const c = sph(0.05 * scale, mat(0x3a1206, { emissive: 0xff5a10, emissiveIntensity: 1.6 }),
      Math.cos(a) * 0.22 * scale, 0.03 * scale, 0.02 + Math.sin(a) * 0.1 * scale, 8, 6);
    g.add(c); coals.push(c);
  }
  // logs across the bed
  const logM = mat(0x3a2410, { roughness: 1 });
  g.add(cyl(0.06 * scale, 0.06 * scale, 0.66 * scale, logM, 0, 0.06 * scale, 0.04, 10, { rz: Math.PI / 2 }));
  g.add(cyl(0.055 * scale, 0.055 * scale, 0.58 * scale, logM, 0.02, 0.15 * scale, -0.04, 10, { rz: Math.PI / 2.25 }));

  // layered flame tongues (back = warm/wide, front = hot/narrow)
  const flames = [];
  const defs = [
    [0.62, 0.95, FLAME_TEX.warm, -0.14], [0.5, 0.8, FLAME_TEX.warm, 0.16],
    [0.55, 0.9, FLAME_TEX.hot, 0.0], [0.4, 0.66, FLAME_TEX.hot, -0.06], [0.34, 0.56, FLAME_TEX.hot, 0.08],
  ];
  defs.forEach(([w, h, tex, dx], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * scale, h * scale), flameMat(tex));
    m.position.set(dx * scale, h * 0.42 * scale, 0.02 + i * 0.015);
    m.userData = { baseY: m.position.y, baseH: h, i };
    g.add(m); flames.push(m);
  });

  // rising embers (recycled additive sprites)
  const embers = [];
  for (let i = 0; i < 14; i++) {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.03 * scale, 0.03 * scale), flameMat(FLAME_TEX.ember));
    e.userData = { seed: i * 0.7, sp: 0.25 + (i % 5) * 0.06 };
    g.add(e); embers.push(e);
  }

  const light = new THREE.PointLight(0xff8420, 16 * scale, 7, 1.9);
  light.position.set(0, 0.5 * scale, 0.36);
  light.castShadow = true; light.shadow.mapSize.set(512, 512);
  g.add(light);
  const fill = new THREE.PointLight(0xffb060, 6 * scale, 3, 2); fill.position.set(0, 0.2 * scale, 0.5); g.add(fill);

  g.userData.tick = (t) => {
    flames.forEach((f, i) => {
      const n = Math.sin(t * (8 + i * 2.3) + i * 9) * 0.5 + Math.sin(t * 15.7 + i * 4) * 0.35 + Math.sin(t * 27 + i) * 0.15;
      f.scale.set(1 + n * 0.16, 1 + n * 0.3, 1);
      f.position.y = f.userData.baseY + n * 0.04 * scale;
      f.rotation.z = n * 0.09;
      f.material.opacity = 0.4 + Math.abs(n) * 0.22;
    });
    embers.forEach((e) => {
      const p = ((t * e.userData.sp + e.userData.seed) % 1);
      e.position.set(Math.sin((e.userData.seed + p * 6) * 3) * 0.16 * scale, (0.1 + p * 0.9) * scale, 0.06 + Math.cos(e.userData.seed * 5) * 0.04);
      e.material.opacity = Math.sin(p * Math.PI) * 0.9;
      const s = (1 - p * 0.6);
      e.scale.set(s, s, 1);
    });
    coals.forEach((c, i) => { c.material.emissiveIntensity = 1.2 + Math.sin(t * 3 + i * 1.7) * 0.6 + Math.sin(t * 9 + i) * 0.3; });
    // lively light with occasional crackle-pops
    const pop = (Math.sin(t * 40) > 0.985) ? 6 : 0;
    light.intensity = (14 + Math.sin(t * 11) * 2.5 + Math.sin(t * 23.7) * 1.8 + Math.sin(t * 3.1) * 1.2 + pop) * scale;
    fill.intensity = (5 + Math.sin(t * 13) * 1.5) * scale;
  };
  return g;
}

function makeLampLight(parent, x, y, z, color = 0xffd9a0, power = 10) {
  const l = new THREE.PointLight(color, power, 6, 1.8);
  l.position.set(x, y, z);
  l.castShadow = true;
  l.shadow.mapSize.set(512, 512);
  parent.add(l);
  return l;
}

function clockFaceTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#fdf8e2'; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fill();
    g.strokeStyle = '#3a2c08'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 117, 0, 7); g.stroke();
    g.fillStyle = '#3a2c08'; g.font = 'bold 34px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('12', 128, 40); g.fillText('3', 216, 128); g.fillText('6', 128, 216); g.fillText('9', 40, 128);
    const now = new Date();
    const hr = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const mn = now.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
    g.strokeStyle = '#20180a'; g.lineCap = 'round';
    g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 52 * Math.cos(hr), 128 + 52 * Math.sin(hr)); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 84 * Math.cos(mn), 128 + 84 * Math.sin(mn)); g.stroke();
    g.fillStyle = '#b01212'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill();
  });
}

function makeBook(parent, x, y, z, w, h, d, color, ry = 0) {
  const g = group(parent, x, y, z);
  g.rotation.y = ry;
  g.add(box(w, h, d, mat(color), 0, h / 2, 0));
  g.add(box(w * 0.94, h + 0.006, d * 0.9, mat(0xf5eed8), 0, h / 2, -0.004));
  return g;
}

// ══════════════════════════════════════════════════════════════
//  PORCH — the famous red door with the gold knocker
// ══════════════════════════════════════════════════════════════
export function buildPorch(scene, X) {
  const root = group(scene, X, 0, 0);
  const hot = [];

  // the house shell, garden, road and sky now come from street.js (time-of-day aware)

  // the DOOR — deep red, X-pattern panels like the login screen
  const doorG = group(root, 0, 0, 0);
  doorG.scale.setScalar(0.72);   // house-scale door; the camera sits closer so the close-up reads the same
  const hingeG = group(doorG, -1.35, 0, 0);
  const leaf = group(hingeG, 1.35, 0, 0);
  const redM = mat(0xc41c1c, { roughness: 0.55 });
  const redDeepM = mat(0x9a1414, { roughness: 0.6 });
  leaf.add(box(2.7, 4.6, 0.16, redM, 0, 2.3, 0));
  // raised X pattern (four triangular quadrant panels, like the original)
  [[0, 3.55], [0, 1.05]].forEach(([px, py]) => leaf.add(box(1.9, 0.78, 0.06, redDeepM, px, py, 0.1)));
  [[-0.95, 2.3], [0.95, 2.3]].forEach(([px, py]) => leaf.add(box(0.62, 1.5, 0.06, redDeepM, px, py, 0.1)));
  // ── the Bob door knocker, matched to the original art:
  //    disc finial on a stem · arched "Microsoft" banner · landscape "Bob" oval ·
  //    crescent handle hung from two side balls · bone crossbar · quatrefoil pendant
  const goldM = mat(0xf0bc48, { metalness: 0.95, roughness: 0.18 });
  const goldDeepM = mat(0xc79020, { metalness: 0.9, roughness: 0.3 });
  const knocker = group(leaf, 0, 2.5, 0.16);

  // top: flat elliptical disc on a short stem with a collar
  const disc = sph(0.17, goldM, 0, 0.78, 0.02);
  disc.scale.set(1, 0.32, 0.55); knocker.add(disc);
  knocker.add(cyl(0.035, 0.045, 0.22, goldM, 0, 0.66, 0.02, 12));
  const collar = sph(0.09, goldM, 0, 0.56, 0.02);
  collar.scale.set(1, 0.4, 0.6); knocker.add(collar);

  // arched "Microsoft" banner (transparent canvas: gold band + text on the arc)
  const bannerTex = canvasTexture(512, 256, (g) => {
    const cx = 256, cy = 420, rOut = 330, rIn = 218;      // arc centre far below → gentle arch
    g.beginPath(); g.arc(cx, cy, rOut, -Math.PI * 0.78, -Math.PI * 0.22);
    g.arc(cx, cy, rIn, -Math.PI * 0.22, -Math.PI * 0.78, true); g.closePath();
    const grad = g.createLinearGradient(0, 30, 0, 210);
    grad.addColorStop(0, '#ffe98e'); grad.addColorStop(0.55, '#f0c050'); grad.addColorStop(1, '#c89018');
    g.fillStyle = grad; g.fill();
    g.lineWidth = 7; g.strokeStyle = '#8a5a08'; g.stroke();
    // "Microsoft" following the arch, embossed
    const word = 'Microsoft', rText = (rOut + rIn) / 2 + 6;
    const span = Math.PI * 0.44, a0 = -Math.PI / 2 - span / 2;
    g.textAlign = 'center'; g.font = 'italic bold 58px Georgia';
    for (let i = 0; i < word.length; i++) {
      const a = a0 + span * (i + 0.5) / word.length;
      g.save();
      g.translate(cx + Math.cos(a) * rText, cy + Math.sin(a) * rText);
      g.rotate(a + Math.PI / 2);
      g.fillStyle = '#fff6d0'; g.fillText(word[i], -2, -2);
      g.fillStyle = '#8a5a08'; g.fillText(word[i], 0, 0);
      g.restore();
    }
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.57),
    new THREE.MeshStandardMaterial({ map: bannerTex, transparent: true, alphaTest: 0.1, metalness: 0.5, roughness: 0.3 }));
  banner.position.set(0, 0.44, 0.04); knocker.add(banner);

  // landscape oval cartouche — just "Bob", big and playful, centred
  const crestTex = canvasTexture(400, 250, (g) => {
    const grad = g.createRadialGradient(170, 100, 14, 200, 125, 220);
    grad.addColorStop(0, '#fff0b0'); grad.addColorStop(0.65, '#f2c860'); grad.addColorStop(1, '#d8a428');
    g.fillStyle = grad; g.fillRect(0, 0, 400, 250);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // per-letter placement for the wobbly Bob-logo feel, embossed like the banner
    [['B', 128, 122, -0.09, 150], ['o', 208, 148, 0.05, 118], ['b', 275, 124, -0.03, 138]].forEach(([ch, x, y, rot, size]) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.font = `bold ${size}px "Comic Sans MS", "Marker Felt", cursive`;
      g.fillStyle = '#fff6d0'; g.fillText(ch, -3, -3);
      g.fillStyle = '#c08a10'; g.fillText(ch, 0, 0);
      g.strokeStyle = '#7a5206'; g.lineWidth = 3; g.strokeText(ch, 0, 0);
      g.restore();
    });
  });
  const crestRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 14, 48), goldM);
  crestRim.scale.set(1.38, 0.85, 1); crestRim.position.set(0, 0.02, 0.05); knocker.add(crestRim);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.35, 48),
    new THREE.MeshStandardMaterial({ map: crestTex, metalness: 0.45, roughness: 0.32, color: 0xffe6a0 }));
  crest.scale.set(1.38, 0.85, 1); crest.position.set(0, 0.02, 0.06); knocker.add(crest);

  // side balls the handle hangs from
  [-0.58, 0.58].forEach(x => { knocker.add(sph(0.105, goldM, x, 0.16, 0.06)); knocker.add(sph(0.04, goldDeepM, x, 0.16, 0.15)); });

  // crescent handle: a symmetric smile dipping under the oval, ends at the balls.
  // TorusGeometry arcs start on +x and sweep CCW, so rotate the arc's midpoint
  // to the bottom (-90°): rz = -π/2 - arc/2.
  const handleArc = Math.PI * 1.16;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.055, 16, 56, handleArc), goldM);
  ring.rotation.z = -Math.PI / 2 - handleArc / 2;
  ring.position.set(0, 0.02, 0.12); ring.castShadow = true; knocker.add(ring);

  // bone crossbar between oval and handle (in front of the oval, behind the handle)
  const bone = group(knocker, 0, -0.32, 0.09);
  bone.add(cyl(0.04, 0.04, 0.52, goldM, 0, 0, 0, 10, { rz: Math.PI / 2 }));
  [-0.28, 0.28].forEach(x => { bone.add(sph(0.07, goldM, x, 0, 0)); bone.add(sph(0.055, goldM, x * 1.22, 0.06, 0)); bone.add(sph(0.055, goldM, x * 1.22, -0.06, 0)); });
  bone.add(sph(0.055, goldM, 0, 0.05, 0.01));

  // quatrefoil pendant + drop
  knocker.add(cyl(0.025, 0.035, 0.14, goldM, 0, -0.56, 0.05, 10));
  const quat = group(knocker, 0, -0.68, 0.05);
  [[0.1, 0], [-0.1, 0], [0, 0.07], [0, -0.07]].forEach(([x, y]) => quat.add(sph(0.05, goldM, x, y, 0)));
  quat.add(sph(0.055, goldDeepM, 0, 0, 0.03));
  knocker.add(sph(0.065, goldM, 0, -0.84, 0.05));

  const kHot = group(knocker, 0, -0.1, 0.12);
  hot.push({ obj: knocker, name: 'Knock to sign in', kind: 'app', action: 'signin', anchor: kHot });

  // frame + hinges
  const frameM = mat(0xb8a684, { roughness: 0.85 });
  doorG.add(box(0.3, 5, 0.4, frameM, -1.6, 2.5, 0));
  doorG.add(box(0.3, 5, 0.4, frameM, 1.6, 2.5, 0));
  doorG.add(box(3.5, 0.3, 0.4, frameM, 0, 5.05, 0));
  [1.1, 2.3, 3.5].forEach(y => hingeG.add(box(0.08, 0.3, 0.12, goldM, 0, y, 0.06)));

  // warm glow behind the door (revealed when it opens)
  const glow = plane(2.1, 3.4, new THREE.MeshBasicMaterial({ color: 0xffc978 }), 0, 1.7, -0.3);
  root.add(glow);

  // porch lanterns (dedicated glow material so the time-of-day can dim it)
  const lanternGlowM = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffce70, emissiveIntensity: 4 });
  const lant = group(root, 1.7, 2.4, 0.35);
  lant.add(box(0.05, 0.5, 0.05, mat(0x20180a), 0, 0.4, -0.25));
  lant.add(box(0.26, 0.4, 0.26, mat(0x3a2a12, { emissive: 0xffb84e, emissiveIntensity: 0.5 }), 0, 0, 0));
  lant.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), lanternGlowM));
  const lampA = makeLampLight(root, 1.7, 2.4, 1.0, 0xffca80, 16);
  const lant2 = lant.clone(); lant2.position.x = -1.7; root.add(lant2);
  const lampB = makeLampLight(root, -1.7, 2.4, 1.0, 0xffca80, 16);
  // soft frontal fill so the whole door + dog + brick read after dark
  const porchFill = new THREE.PointLight(0xffd8a0, 8, 12, 1.6);
  porchFill.position.set(0, 3.0, 4.5);
  root.add(porchFill);

  // doormat — white base: a coloured base multiplies the map and crushes the lettering
  const matTex = canvasTexture(512, 256, (g) => {
    g.fillStyle = '#6e4a20'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#3d2808'; g.lineWidth = 12; g.strokeRect(16, 16, 480, 224);
    g.fillStyle = '#efe0b8'; g.textAlign = 'center';
    const VOICE = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive';
    g.font = `bold 92px ${VOICE}`;
    const fit = 420 / g.measureText('WELCOME').width;   // keep clear of the 12px border
    if (fit < 1) g.font = `bold ${Math.floor(92 * fit)}px ${VOICE}`;
    g.fillText('WELCOME', 256, 158);
  });
  root.add(plane(1.9, 0.95, mat(0xffffff, { map: matTex }), 0, 0.055, 1.3, { rx: -Math.PI / 2 }));   // sits on the street.js porch slab

  // the street supplies sky, sun/moon, ambient — and dims our lanterns by day
  const street = buildStreet(root, {
    phaseLights: [{ light: lampA, base: 16 }, { light: lampB, base: 16 }, { light: porchFill, base: 8 }],
    onPhase: (p, P) => { lanternGlowM.emissiveIntensity = 4 * Math.max(P.lamps, 0.08); },
  });
  // the mailbox by the path opens the real Mail app
  hot.push({ obj: street.mailbox, name: 'Apple Mail', kind: 'launch', launch: 'mail' });

  return {
    id: 'porch', title: 'The Front Door', root, hotspots: hot,
    cam: { pos: [0, 1.65, 6.4], look: [0, 1.25, 0.3] },
    orbit: { maxDist: 46, maxPolar: Math.PI * 0.53 },
    doorHinge: hingeG,
    tick: street.tick,
  };
}

// ══════════════════════════════════════════════════════════════
//  FAMILY ROOM — warm wood, fireplace, sunset & city windows
// ══════════════════════════════════════════════════════════════
// familyFixtures — the family room's bespoke non-movable structure: shell,
// fireplace, windows, bookshelves, calendar/clock hotspots, mouse hole, light.
// Every piece of FURNITURE lives in the zone spec's placed[] records (zones.js),
// so the room itself is data and fully arrangeable.
export function familyFixtures(root, { H2, addBox }) {
  const W = 10.6, H = 4.5, D = 7.2;

  const panelTex = canvasTexture(256, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#e2a04c'); grad.addColorStop(0.5, '#eab35e'); grad.addColorStop(1, '#d99440');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = '#c07c2c'; g.lineWidth = 5;
    g.strokeRect(14, 14, 228, 484);
    g.strokeStyle = 'rgba(160,95,25,0.35)'; g.lineWidth = 2;
    for (let x = 0; x < 256; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  }, { repeat: [6, 1] });
  const wallM = mat(0xe8a34d, { map: panelTex, roughness: 0.8 });
  const floorTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#b98a50'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#9a6e38'; g.lineWidth = 3;
    for (let y = 0; y <= 256; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  }, { repeat: [5, 5] });
  makeShell(root, W, H, D, wallM, mat(0xb98a50, { map: floorTex }), mat(0xf2ddb8));

  // rug
  root.add(plane(5.6, 3.8, mat(0xc85030, { roughness: 1 }), 0, 0.012, 0.4, { rx: -Math.PI / 2 }));
  root.add(plane(5.0, 3.2, mat(0xe0b070, { roughness: 1 }), 0, 0.02, 0.4, { rx: -Math.PI / 2 }));

  // ── fireplace ──
  const brickM = mat(0xc97f2f, { roughness: 0.9 });
  const fp = group(root, 0, 0, -D / 2 + 0.3);
  fp.add(box(3.0, 2.1, 0.6, brickM, 0, 1.05, 0));
  fp.add(box(2.2, H - 2.1, 0.42, wallM, 0, 2.1 + (H - 2.1) / 2, 0));       // chimney breast
  fp.add(box(3.3, 0.16, 0.75, mat(0x8a5a20), 0, 2.12, 0.06));              // mantel
  fp.add(box(1.5, 1.25, 0.5, mat(0x140c06), 0, 0.62, 0.08));               // firebox
  const screenM = mat(0x2c2416, { metalness: 0.6, roughness: 0.5 });
  fp.add(box(1.55, 0.05, 0.05, screenM, 0, 1.28, 0.36));
  makeFire(fp, 0, 0.1, 0.3, 1);   // sit the flames in the opening, in front of the dark firebox
  // brass fender
  fp.add(box(1.9, 0.07, 0.07, mat(0xe8b23a, { metalness: 0.8, roughness: 0.3 }), 0, 0.04, 0.55));

  // calendar above the mantel — Bob Calendar
  const calPage = plane(0.78, 0.98, mat(0xfdfbf0, { map: calendarPageTexture() }), 0, 2.95, -D / 2 + 0.53);
  root.add(calPage);
  H2(calPage, 'Bob Calendar', 'app', { app: 'calendar' });

  // windows
  const winL = makeWindow(root, -3.55, 2.25, -D / 2 + 0.02, 2.15, 2.7, sunsetTexture(), { lightColor: 0xff9c50, lightPower: 9, life: 'sunset' });
  const winR = makeWindow(root, 3.55, 2.25, -D / 2 + 0.02, 2.15, 2.7, cityTexture(), { lightColor: 0x8a7cd8, lightPower: 5, life: 'city' });
  root.add(winL, winR);

  // bookshelves flanking the chimney — recessed lit cases with book rows
  [-1.95, 1.95].forEach((sx, i) => {
    const sh = group(root, sx, 0, -D / 2 + 0.18);
    // case: back + sides + top/bottom, in warm wood
    sh.add(box(1.35, 1.75, 0.1, mat(0x9a6a2c), 0, 3.15, -0.16));      // back panel
    sh.add(box(0.1, 1.75, 0.42, mat(0xc07c2c), -0.66, 3.15, 0));      // left side
    sh.add(box(0.1, 1.75, 0.42, mat(0xc07c2c), 0.66, 3.15, 0));       // right side
    sh.add(box(1.42, 0.1, 0.46, mat(0xc07c2c), 0, 4.05, 0));          // top
    for (let s = 0; s < 3; s++) {
      const y = 2.42 + s * 0.62;
      sh.add(box(1.28, 0.07, 0.4, mat(0xb37628), 0, y, 0));           // shelf plank
      // book row sitting on the plank, facing the room
      sh.add(plane(1.2, 0.5, mat(0x4a2c14, { map: bookRowTexture(3 + s * 4 + i * 7), roughness: 0.7 }), 0, y + 0.29, 0.14));
    }
    // a little brass picture light over each case
    const gl = new THREE.PointLight(0xffe0b0, 5, 3.5, 1.6);
    gl.position.set(sx, 4.2, -D / 2 + 0.7);
    root.add(gl);
  });

  // wall clock (right of chimney) — Bob Clock
  const clock = group(root, 1.5, 2.62, -D / 2 + 0.28);
  clock.add(box(0.5, 0.5, 0.07, mat(0x6e4a20), 0, 0, 0));
  clock.add(plane(0.4, 0.4, new THREE.MeshBasicMaterial({ map: clockFaceTexture() }), 0, 0, 0.045));
  H2(clock, 'Bob Clock', 'app', { app: 'clock' });

  // mouse hole — a Bob classic
  const hole = group(root, 4.6, 0, -D / 2 + 0.02);
  const holeTex = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#100a04'; g.beginPath(); g.arc(32, 64, 30, Math.PI, 0); g.fill();
  });
  hole.add(plane(0.36, 0.36, new THREE.MeshBasicMaterial({ map: holeTex, transparent: true }), 0, 0.18, 0.03));
  H2(hole, 'Door to the Mouse Hole', 'fun', { action: 'mousehole' });

  // room lighting
  const key = new THREE.SpotLight(0xffe6c0, 30, 15, 1.0, 0.6, 1.4);
  key.position.set(0, H - 0.25, 2.2); key.target.position.set(0, 0.6, -1);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  root.add(key, key.target);
  // fill light for the back wall / bookshelves
  const fill = new THREE.PointLight(0xffe0b8, 9, 12, 1.6);
  fill.position.set(0, 3.2, -1.2);
  root.add(fill);
  root.add(new THREE.AmbientLight(0xffe0c0, 0.7));

  addBox?.(0, -3.3, 1.7, 0.7);   // the hearth is solid — Rover walks around it
}

// ══════════════════════════════════════════════════════════════
//  STUDY — deep green walls, big desk, globe, safe
// ══════════════════════════════════════════════════════════════
// studyFixtures — the study's non-movable structure; furniture is placed[] data.
export function studyFixtures(root, { H2, addBox }) {
  const W = 9.6, H = 4.4, D = 6.8;
  const wallM = mat(0x2e5c48, { roughness: 0.92 });
  const floorTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#7a5226'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#5c3c18'; g.lineWidth = 4;
    for (let y = 0; y <= 256; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  }, { repeat: [5, 5] });
  makeShell(root, W, H, D, wallM, mat(0x7a5226, { map: floorTex }), mat(0xe8dcc0));
  // wainscot
  root.add(box(W, 1.25, 0.08, mat(0x8a5a20), 0, 0.62, -D / 2 + 0.04, { cast: false }));
  root.add(box(0.08, 1.25, D, mat(0x8a5a20), -W / 2 + 0.04, 0.62, 0, { cast: false }));
  root.add(box(0.08, 1.25, D, mat(0x8a5a20), W / 2 - 0.04, 0.62, 0, { cast: false }));
  // rug
  root.add(plane(4.6, 3.2, mat(0x7a2020, { roughness: 1 }), 0, 0.015, 0.3, { rx: -Math.PI / 2 }));
  root.add(plane(4.0, 2.6, mat(0xa84838, { roughness: 1 }), 0, 0.022, 0.3, { rx: -Math.PI / 2 }));

  // moonlit window
  root.add(makeWindow(root, -2.9, 2.4, -D / 2 + 0.02, 1.9, 2.3, cityTexture(), { frame: 0x8a5a20, lightColor: 0x9a8ce0, lightPower: 6, life: 'city' }));

  // bookshelf wall (right)
  const bookM = mat(0x2a1608, { map: bookRowTexture(7) });
  const shelf = group(root, W / 2 - 0.22, 0, 0.6);
  shelf.rotation.y = -Math.PI / 2;
  shelf.add(box(2.4, 3.4, 0.36, mat(0x6e4520), 0, 1.7, 0));
  for (let y = 0.55; y <= 3.0; y += 0.62) shelf.add(plane(2.2, 0.5, bookM, 0, y + 0.05, 0.19));
  // calendar on wall left
  const calS = plane(0.7, 0.9, mat(0xfdfbf0, { map: calendarPageTexture() }), -1.4, 2.5, -D / 2 + 0.05);
  root.add(calS);
  H2(calS, 'Bob Calendar', 'app', { app: 'calendar' });

  const key = new THREE.SpotLight(0xffe0b8, 45, 13, 0.95, 0.55, 1.7);
  key.position.set(0, H - 0.3, 1.8); key.target.position.set(0, 0.4, -1.2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  root.add(key, key.target);
  root.add(new THREE.AmbientLight(0xb0c8b8, 0.5));

  addBox?.(4.58, 0.6, 0.4, 1.3);   // bookshelf wall is solid
}

// ══════════════════════════════════════════════════════════════
//  POSTMODERN KITCHEN — teal + purple + orange, city window
// ══════════════════════════════════════════════════════════════
// kitchenFixtures — counters, sink, frieze, window; appliances + gadgets are data.
export function kitchenFixtures(root, { H2, addBox }) {
  const W = 9.8, H = 4.5, D = 6.8;
  const wallM = mat(0x3f9080, { roughness: 0.9 });
  const tileTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#efe8d0'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#cbc0a0'; g.lineWidth = 4;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
  }, { repeat: [6, 6] });
  makeShell(root, W, H, D, wallM, mat(0xefe8d0, { map: tileTex }), mat(0x7a6fa8));
  // purple upper band + red frieze with circle cutouts (from the screenshot)
  root.add(box(W, 1.0, 0.06, mat(0x7a6fa8), 0, H - 0.9, -D / 2 + 0.03, { cast: false }));
  const friezeTex = canvasTexture(512, 64, (g) => {
    g.fillStyle = '#8a2020'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#c8b078';
    for (let x = 32; x < 512; x += 64) { g.beginPath(); g.arc(x, 32, 18, 0, 7); g.fill(); }
  }, { repeat: [3, 1] });
  root.add(plane(W, 0.5, mat(0x8a2020, { map: friezeTex }), 0, H - 0.28, -D / 2 + 0.04));

  // window over the sink — night city
  root.add(makeWindow(root, -0.6, 2.5, -D / 2 + 0.02, 2.6, 1.7, cityTexture(), { frame: 0x2c2436, lightColor: 0x8a7cd8, lightPower: 7, life: 'city' }));

  // counters + cabinets (orange, like the original)
  const cabM = mat(0xd97e2f, { roughness: 0.75 });
  const cabDoorM = mat(0xb9611c, { roughness: 0.75 });
  const counterM = mat(0xf2f2ea, { roughness: 0.5 });
  const run = group(root, 0, 0, -D / 2 + 0.45);
  run.add(box(5.6, 0.92, 0.75, cabM, -0.2, 0.46, 0));
  run.add(box(5.8, 0.1, 0.85, counterM, -0.2, 0.97, 0));
  [[-2.4], [-1.4], [0.6], [1.6]].forEach(([dx]) => {
    run.add(box(0.82, 0.72, 0.05, cabDoorM, dx, 0.45, 0.4));
    run.add(box(0.26, 0.05, 0.05, mat(0x5c3208), dx, 0.62, 0.44));
  });
  // sink + faucet
  run.add(box(0.9, 0.06, 0.5, mat(0xb8bcc0, { metalness: 0.8, roughness: 0.35 }), -0.55, 1.0, 0));
  const fauc = group(run, -0.55, 1.02, -0.25);
  fauc.add(cyl(0.03, 0.03, 0.3, mat(0xb8bcc0, { metalness: 0.9, roughness: 0.25 }), 0, 0.15, 0, 10));
  fauc.add(cyl(0.025, 0.025, 0.3, mat(0xb8bcc0, { metalness: 0.9, roughness: 0.25 }), 0, 0.3, 0.12, 10, { rx: Math.PI / 2.2 }));
  // side counter right (the peninsula in the screenshot)
  const pen = group(root, 3.1, 0, -0.9);
  pen.rotation.y = 0.35;
  pen.add(box(2.2, 0.92, 0.75, cabM, 0, 0.46, 0));
  pen.add(box(2.35, 0.1, 0.85, counterM, 0, 0.97, 0));

  const key = new THREE.SpotLight(0xf0f4ff, 55, 13, 1.0, 0.5, 1.7);
  key.position.set(0.5, H - 0.3, 1.6); key.target.position.set(0, 0.5, -1.5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  root.add(key, key.target);
  // under-cabinet warm strip
  makeLampLight(root, -0.5, 1.6, -2.5, 0xffe0b0, 6);
  root.add(new THREE.AmbientLight(0x9ac8c0, 0.55));

  addBox?.(-0.2, -2.95, 2.9, 0.5);   // counter run
  addBox?.(3.1, -0.9, 1.2, 0.5);     // peninsula
}

// ══════════════════════════════════════════════════════════════
//  CASTLE ATTIC — arched beams, moose antlers, hourglass
// ══════════════════════════════════════════════════════════════
// atticFixtures — beams, antlers, arched window, shelf, cobweb; treasures are data.
export function atticFixtures(root, { H2, addBox }) {
  const W = 9.4, H = 4.7, D = 6.8;
  const wallM = mat(0xa64828, { roughness: 0.95 });
  makeShell(root, W, H, D, wallM, mat(0x2a3470, { roughness: 1 }), mat(0x8a3c20));

  // arched beams across the ceiling
  const beamM = mat(0x6e3c14, { roughness: 0.85 });
  // trusses span the WIDTH: run them along z and the middle arch's near end
  // parks itself right in front of the camera as a giant black tube
  [-2.6, 0, 2.6].forEach(bz => {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.16, 10, 28, Math.PI), beamM);
    arch.position.set(0, H - 3.0, bz);
    arch.castShadow = true;
    root.add(arch);
  });
  [-2.6, 0, 2.6].forEach(bx => root.add(box(0.34, H - 1.2, 0.34, beamM, bx, (H - 1.2) / 2, -D / 2 + 0.2)));
  // ridge beam
  root.add(box(W, 0.28, 0.28, beamM, 0, H - 0.15, 0));

  // moose antlers plaque, high on the back wall
  const plq = group(root, 0, 3.4, -D / 2 + 0.12);
  plq.add(box(1.0, 0.7, 0.08, mat(0x5c3c18), 0, 0, 0));
  const antM = mat(0xd8c088, { roughness: 0.8 });
  [-1, 1].forEach(s => {
    const a = group(plq, s * 0.22, 0.1, 0.08);
    a.add(cyl(0.035, 0.05, 0.5, antM, s * 0.18, 0.12, 0, 8, { rz: s * -0.9 }));
    a.add(cyl(0.02, 0.035, 0.34, antM, s * 0.42, 0.34, 0, 8, { rz: s * -0.5 }));
    a.add(cyl(0.015, 0.03, 0.26, antM, s * 0.3, 0.4, 0, 8, { rz: s * -1.3 }));
    a.add(sph(0.09, mat(0x8a6844), s * 0.05, -0.05, 0.02, 10, 8));
  });
  H2(plq, 'Moose (decorative)', 'fun', { action: 'moose' });

  // small arched window — dusk sky
  const winG = group(root, -2.9, 2.3, -D / 2 + 0.05);
  const duskTex = canvasTexture(256, 320, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, '#5a3a86'); sky.addColorStop(0.5, '#c65a8a'); sky.addColorStop(0.8, '#f2934e'); sky.addColorStop(1, '#ffc06a');
    g.fillStyle = sky; g.fillRect(0, 0, 256, 320);
    // glow around the setting sun
    const sun = g.createRadialGradient(180, 150, 6, 180, 150, 80);
    sun.addColorStop(0, '#fff6d8'); sun.addColorStop(0.5, 'rgba(255,220,150,0.7)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(180, 150, 80, 0, 7); g.fill();
    g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(180, 150, 24, 0, 7); g.fill();
    g.fillStyle = '#3a2050';
    [[30, 250, 40], [120, 244, 56], [210, 258, 36]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 30, r, Math.PI, 0); g.fill(); });
    g.fillRect(0, 288, 256, 32);
  });
  const wm = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ map: duskTex }));
  wm.position.set(0, 0.25, 0.06); winG.add(wm);
  winG.add(plane(1.1, 0.9, new THREE.MeshBasicMaterial({ map: duskTex }), 0, -0.2, 0.06));
  const wf = mat(0x6e3c14);
  winG.add(box(1.24, 0.1, 0.12, wf, 0, -0.68, 0.02));
  winG.add(box(0.1, 1.0, 0.12, wf, -0.6, -0.2, 0.02));
  winG.add(box(0.1, 1.0, 0.12, wf, 0.6, -0.2, 0.02));
  makeLampLight(root, -2.9, 2.3, -2.6, 0xd88a9a, 4);

  // purple shelf unit (left)
  const shelfM = mat(0x9b8fd0, { roughness: 0.9 });
  const shelf = group(root, -3.7, 0, -1.4);
  shelf.rotation.y = 0.5;
  shelf.add(box(1.7, 2.6, 0.5, shelfM, 0, 1.3, 0));
  [[0.55], [1.15], [1.75], [2.35]].forEach(([sy]) => shelf.add(box(1.5, 0.06, 0.42, mat(0x7a6fb0), 0, sy, 0.02)));
  shelf.add(makeBook(shelf, -0.4, 1.21, 0.05, 0.26, 0.3, 0.08, 0xc84040, 0));
  shelf.add(makeBook(shelf, -0.1, 1.21, 0.05, 0.2, 0.26, 0.08, 0x3f9a4c, 0));

  // set-dressing boxes
  root.add(box(0.7, 0.5, 0.55, mat(0x8a6834), 3.6, 0.25, -0.4, { ry: 0.3 }));
  root.add(box(0.55, 0.4, 0.45, mat(0x9a7844), 3.5, 0.7, -0.35, { ry: -0.2 }));

  // decorative arch over the kitchen doorway
  const archTop = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.2, 16, 1, false, 0, Math.PI), mat(0x6e3c14));
  archTop.rotation.set(0, 0, Math.PI / 2);
  archTop.position.set(W / 2 - 0.12, 2.62, 1.3);
  root.add(archTop);

  // cobweb
  const webTex = canvasTexture(128, 128, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(128 * Math.cos(i * 0.26), 128 * Math.sin(i * 0.26)); g.stroke(); }
    for (let r = 20; r <= 120; r += 22) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); }
  });
  const web = plane(1.1, 1.1, new THREE.MeshBasicMaterial({ map: webTex, transparent: true }), -W / 2 + 0.58, H - 1.15, -D / 2 + 0.58);
  web.rotation.y = Math.PI / 4;
  root.add(web);

  const key = new THREE.SpotLight(0xffd0a0, 55, 15, 1.05, 0.6, 1.6);
  key.position.set(0.5, H - 0.4, 2.2); key.target.position.set(0, 0.6, -1.2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  root.add(key, key.target);
  // warm dusk glow through the window
  const winGlow = new THREE.PointLight(0xffa86a, 8, 8, 1.6);
  winGlow.position.set(-2.9, 2.3, -2.4);
  root.add(winGlow);
  root.add(new THREE.AmbientLight(0x8a6048, 1.05));

  addBox?.(-3.7, -1.4, 1.0, 0.5);   // purple shelf unit
}

