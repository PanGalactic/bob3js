// main.js — Microsoft Bob 3D: boot → red door → the house.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tween, updateTweens, easeOut } from './util.js';
import { buildZones, makeZoneApi, resetZone, resetHouse } from './zones.js';
import { ESTATE } from './estate.js';
import { GUIDES, makeGuidePost } from './guides.js';
import * as apps from './apps.js';
import * as voice from './voice.js';
import * as designer from './designer.js';
import * as gen3d from './gen3d.js';
import * as agent from './agent.js';
import * as providers from './providers.js';

// ── sound: tiny WebAudio synth, no assets ───────────────────────
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null;
function sound(name) {
  try {
    ac = ac || new AC();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);
    const tone = (freq, dur, type = 'sine', vol = 0.16, delay = 0) => {
      const o = ac.createOscillator();
      o.type = type; o.frequency.setValueAtTime(freq, t + delay);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(vol, t + delay);
      gg.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(gg); gg.connect(ac.destination);
      o.start(t + delay); o.stop(t + delay + dur + 0.05);
    };
    switch (name) {
      case 'pop': tone(520, 0.09, 'triangle', 0.2); tone(760, 0.06, 'sine', 0.12, 0.02); break;
      case 'open': tone(392, 0.12, 'triangle', 0.14); tone(523, 0.14, 'triangle', 0.14, 0.08); tone(659, 0.2, 'triangle', 0.12, 0.16); break;
      case 'ding': tone(880, 0.4, 'sine', 0.14); tone(1320, 0.3, 'sine', 0.07, 0.02); break;
      case 'page': tone(300, 0.05, 'triangle', 0.1); tone(420, 0.05, 'triangle', 0.08, 0.04); break;
      case 'buzz': tone(140, 0.25, 'sawtooth', 0.12); break;
      case 'knock': tone(120, 0.1, 'sine', 0.4); tone(110, 0.1, 'sine', 0.35, 0.18); break;
      case 'creak': { for (let i = 0; i < 7; i++) tone(180 + i * 28 + Math.random() * 30, 0.1, 'sawtooth', 0.025, i * 0.05); break; }
      case 'squeak': tone(1400, 0.08, 'sine', 0.12); tone(1750, 0.1, 'sine', 0.1, 0.09); break;
      case 'woof': tone(220, 0.08, 'square', 0.08); tone(160, 0.12, 'square', 0.1, 0.07); break;
    }
  } catch { /* audio is a garnish */ }
}

// ── renderer / scene ────────────────────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0812);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.6, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ── OrbitControls: always on — just drag to look around the room ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = true;
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minDistance = 1.2;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.54;   // don't dip below the floor
controls.rotateSpeed = 0.7;
controls.panSpeed = 0.6;
controls.enablePan = true;
let camAnimating = false;   // true while a scripted camera move runs (e.g. the sign-in dolly)
// reset to the room's signature Bob framing
function resetView() {
  if (!current) return;
  camera.position.set(current.x + current.cam.pos[0], current.cam.pos[1], current.cam.pos[2]);
  controls.target.set(camLook.x, camLook.y, camLook.z);
  controls.update();
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

// ── build the whole estate (zones detached until visited) ──────
const { zones: rooms, order: zoneOrder } = buildZones(scene, ESTATE);
Object.values(rooms).forEach(r => scene.remove(r.root));
// runtime zone/designer operations (place items, restyle, add zones)
const zoneApi = makeZoneApi(scene, rooms, zoneOrder,
  (id, def) => { /* onZoneAdded */ },
  (id, def) => { // refreshAfterRebuild — if we're standing in it, re-show + re-place guide
    if (current && current.id === id) {
      scene.remove(current.root); scene.add(def.root); current = def;
      placeGuide(def); refreshLabels();
    }
  });
window.__zoneApi = zoneApi;
window.__designer = designer;
gen3d.loadCreations();   // re-register AI-made objects so they persist + reappear in the catalogue
window.__gen3d = gen3d;

// ── agentic voice tools (the guide as an LLM with tools) ───────
agent.initAgent({
  chat: async (messages) => {
    // your own endpoint / your key first (works on static hosting), else serve.py
    const t = await providers.chatText(messages, { temperature: 0.1 }).catch(() => null);
    if (t != null) return { text: t };
    return fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) }).then(r => r.json());
  },
  say: (t, b) => say(t, b),
  speak: (text, gid) => voice.speak(text, gid),
  gotoZone: (id) => gotoRoom(id),
  openApp: (id) => apps.openApp(id),
  currentZone: () => current,
  zones: () => rooms,
  zoneOrder: () => zoneOrder,
  zoneApi,
  onReskin: (o, f) => { if (selectedObj === o) selectedObj = f; },
  guideRunTo,
  createFromDescription,
});
window.__agent = agent;

// ── Home Designer (catalogue, placement, restyle) ──────────────
designer.initDesigner({
  scene, camera, controls, canvas,
  getCurrent: () => current,
  zoneApi,
  sound, say: (t, b, o) => say(t, b, o), guideWord,
  refreshLabels: () => refreshLabels(),
  createWithAI: () => openCreateAI(),
  onReskin: (oldObj, fresh) => {
    if (selectedObj === oldObj) { selectedObj = fresh; if (selBox) { selBox.parent?.remove(selBox); selBox = new THREE.BoxHelper(fresh, 0xffcf3a); current.root.add(selBox); } }
  },
});

// ── arrangement persistence (Bob let you move/resize everything) ──
const arrangeKey = (id) => 'bob3d.arrange.' + id;
function loadAllArrange(id) { try { return JSON.parse(localStorage.getItem(arrangeKey(id))) || {}; } catch { return {}; } }
function saveArrange(o) {
  o.userData.navRadius = undefined;   // transform changed → recompute its nav footprint
  // catalogue-placed items persist through the zone fs (uid-keyed), not the legacy movIndex store
  if (o.userData.placedUid) { zoneApi.saveItem(o); return; }
  const all = loadAllArrange(o.userData.movRoom);
  all[o.userData.movKey] = { p: [o.position.x, o.position.y, o.position.z], s: o.scale.x, ry: o.rotation.y, v: o.visible };
  localStorage.setItem(arrangeKey(o.userData.movRoom), JSON.stringify(all));
}
// legacy movables are keyed by their stable NAME, not array index — adding or
// reordering M() calls in a room builder must never scramble saved arrangements
Object.values(rooms).forEach(r => {
  const saved = loadAllArrange(r.id);
  const used = new Set();
  (r.movables || []).forEach((o, i) => {
    let k = o.userData.movable || 'obj';
    while (used.has(k)) k += '+';
    used.add(k);
    o.userData.movIndex = i; o.userData.movKey = k; o.userData.movRoom = r.id; o.userData.baseY = o.position.y;
    const s = saved[k];
    if (s) { o.position.set(s.p[0], s.p[1], s.p[2]); o.scale.setScalar(s.s); o.rotation.y = s.ry; o.visible = s.v; }
  });
});

const guidePost = makeGuidePost();
let guideId = localStorage.getItem('bob3d.guide')?.replace(/"/g, '') || 'rover';
guidePost.userData.setGuide(guideId);

// fade veil
const fade = document.createElement('div');
fade.style.cssText = 'position:fixed;inset:0;background:#000;z-index:70;transition:opacity .45s ease;pointer-events:none;opacity:1';
document.body.appendChild(fade);

// hover tag
const hoverTag = document.createElement('div');
hoverTag.id = 'hoverTag';
hoverTag.className = 'hidden';
document.getElementById('overlay').appendChild(hoverTag);

// ── state ───────────────────────────────────────────────────────
let current = null;          // current room def
let userName = 'Friend';
let labelsOn = false;
const camBase = new THREE.Vector3();
const camLook = new THREE.Vector3();
const pointer = { x: 0, y: 0 };

function guideWord() { return GUIDES[guideId].word; }
function guideName() { return GUIDES[guideId].name; }

const APP_LABEL = {
  letter: 'the Letter Writer', calendar: 'the Calendar', checkbook: 'the Checkbook',
  address: 'the Address Book', household: 'the Household Manager', financial: 'the Financial Guide',
  email: 'E-Mail', geosafari: 'GeoSafari', clock: 'the Clock',
};
// a guide's greeting, with buttons offering the programs it knows best
function guideGreeting(id = guideId) {
  const g = GUIDES[id];
  const favBtns = (g.fav || []).slice(0, 2).map(a => [`Open ${APP_LABEL[a]}`, () => apps.openApp(a)]);
  return { title: `${g.name} — ${g.species}`, body: g.hello, opts: [...favBtns, ['Other options', () => apps.openOptions()]] };
}

// the dog says goodbye and hands you over — just like the original
function handoverGuide(newId) {
  if (newId === guideId) { const gg = guideGreeting(newId); say(gg.title, gg.body, gg.opts); return; }
  const oldG = GUIDES[guideId], nextG = GUIDES[newId];
  sound('woof');
  say('Goodbye for now!', `${oldG.name} here — it's been ${oldG.word}. I'll hand you over to <b>${nextG.name}</b>, who's best with <b>${nextG.specialty}</b>. Be good! 👋`);
  // a little farewell hop, then the new guide takes over
  guidePost.userData.wave?.();
  setTimeout(() => {
    guideId = newId;
    localStorage.setItem('bob3d.guide', newId);
    guidePost.userData.setGuide(newId);
    sound('ding');
    const gg = guideGreeting(newId);
    say(gg.title, gg.body, gg.opts);
  }, 2100);
}

// ── speech balloon ──────────────────────────────────────────────
const balloonEl = document.getElementById('balloon');
let balloonTimer = null;
function say(title, body, options) {
  clearTimeout(balloonTimer);
  document.getElementById('balloonTitle').innerHTML = title ?? '';
  document.getElementById('balloonBody').innerHTML = body ?? '';
  const optBox = document.getElementById('balloonOptions');
  optBox.innerHTML = '';
  if (options) {
    options.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = `<span class="ring"></span>${label}`;
      b.addEventListener('click', () => { sound('pop'); fn(); });
      optBox.appendChild(b);
    });
  }
  balloonEl.classList.remove('hidden');
  positionBalloon();
  // shorter and less naggy: plain remarks fade fast, ones with buttons wait for you
  balloonTimer = setTimeout(() => balloonEl.classList.add('hidden'), options ? 22000 : 6000);
}
document.getElementById('balloonClose')?.addEventListener('click', () => {
  balloonEl.classList.add('hidden'); sound('pop');
});

// keep the balloon pinned to the guide's head so it reads as coming from them
const _bv = new THREE.Vector3();
function positionBalloon() {
  if (balloonEl.classList.contains('hidden') || !current) return;
  guidePost.getWorldPosition(_bv);
  _bv.y += 1.25 * GUIDE_SCALE;              // their head
  _bv.project(camera);
  if (_bv.z > 1) { balloonEl.style.opacity = '0'; return; }   // guide behind camera
  balloonEl.style.opacity = '1';
  const x = (_bv.x * 0.5 + 0.5) * innerWidth;
  const y = (-_bv.y * 0.5 + 0.5) * innerHeight;
  // clamp so it never runs off-screen
  balloonEl.style.setProperty('--bx', `${Math.min(Math.max(x + 26, 260), innerWidth - 12)}px`);
  balloonEl.style.setProperty('--by', `${Math.min(Math.max(y - 8, 150), innerHeight - 30)}px`);
}

const RAMBLINGS = [
  'In 1995 this whole house ran in 8 megabytes of RAM. This tribute spends more than that on the fireplace.',
  'Press <b>F1</b> — every clickable thing in the room puts on a name tag. It\'s very {word}.',
  'The red door isn\'t just decoration: the original Bob box was literally a big red door with a brass knocker.',
  'Comic Sans was drawn for Bob\'s speech balloons — it missed the release, then conquered the earth anyway.',
  'Try the GeoSafari. Hank the elephant has been waiting thirty years for a rematch.',
  'Everything in the original was resizable vector art. Everything here is honest polygons and one {word} bloom pass.',
  'There were twelve of us guides in version 1.00. The Invisible Guide sends his regards. Probably. Hard to tell.',
  'Bob sold about 58,000 copies. You are now part of a very exclusive club.',
];
function rambling() {
  const r = RAMBLINGS[Math.floor(Math.random() * RAMBLINGS.length)].replace('{word}', guideWord());
  say(`${GUIDES[guideId].name}'s Ramblings`, r);
}

// ── room navigation ─────────────────────────────────────────────
// where the guide likes to stand in each room's local coords, and its floor bounds
const GUIDE_HOME = {
  porch: { at: [0.85, 2.15], bounds: [-2, 2, 1, 3.6] },
  family: { at: [2.0, 0.5], bounds: [-4.6, 4.6, -2.8, 2.6] },
  study: { at: [-2.0, 0.6], bounds: [-4.2, 4.2, -2.8, 2.4] },
  kitchen: { at: [1.6, 0.7], bounds: [-4.2, 4.2, -2.6, 2.4] },
  attic: { at: [-1.0, 0.8], bounds: [-4.0, 4.0, -2.6, 2.2] },
};
let guideTarget = null;   // THREE.Vector3 in room-local coords
let guideArriveCb = null; // called once when the guide reaches guideTarget (embodied act)
let guideWalking = false;
let guideIdleFacing = -0.6;
const GUIDE_SCALE = 0.66;

function placeGuide(room) {
  room.root.add(guidePost);
  const home = GUIDE_HOME[room.id] ?? { at: room.bounds ? [Math.min(1.4, room.bounds[1] * 0.4), room.bounds[3] * 0.45] : [1.8, 0.5] };
  guidePost.position.set(home.at[0], 0, home.at[1]);
  guidePost.rotation.y = -0.6;
  guidePost.scale.setScalar(GUIDE_SCALE);
  guideTarget = null; guideWalking = false;
  if (!room.hotspots.some(h => h.obj === guidePost)) {
    room.hotspots.push({ obj: guidePost, name: `${GUIDES[guideId].name} (click to change guide)`, kind: 'fun', action: 'guide' });
  }
}

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _floorHit = new THREE.Vector3();
function walkGuideTo(clientX, clientY) {
  if (!current) return false;   // walks on the porch too, same as inside
  mouse.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  if (!ray.ray.intersectPlane(groundPlane, _floorHit)) return false;
  const b = (GUIDE_HOME[current.id] ?? {}).bounds ?? current.bounds ?? [-4, 4, -2.6, 2.4];
  const lx = THREE.MathUtils.clamp(_floorHit.x - current.x, b[0], b[1]);
  const lz = THREE.MathUtils.clamp(_floorHit.z, b[2], b[3]);
  guideTarget = new THREE.Vector3(lx, 0, lz);
  guideArriveCb = null;
  guideWalking = true;
  resetGuideNav();
  guidePost.userData.poke?.();   // they stop playing when you call them
  sound('squeak');
  return true;
}

// ── guide navigation: steer AROUND furniture (no walking through it) ──
const GUIDE_RADIUS = 0.34;
const _navBox = new THREE.Box3(), _navSize = new THREE.Vector3();
// nav radius of an obstacle's floor footprint; 0 = non-blocking (rugs/mats/flat things)
function navRadius(o) {
  if (o.userData.navRadius != null) return o.userData.navRadius;
  _navBox.setFromObject(o); _navBox.getSize(_navSize);
  o.userData.navRadius = (_navSize.y < 0.35) ? 0 : Math.max(_navSize.x, _navSize.z) * 0.42;
  return o.userData.navRadius;
}
let guideLastDist = Infinity, guideStuckT = 0;
// smoothed steering state — the low-pass is what stops tight-space jitter
const guideVel = { x: 0, z: 1 };
let guideBlockKey = null, guideSlideSide = 1;
function resetGuideNav() { guideLastDist = Infinity; guideStuckT = 0; guideBlockKey = null; }
// all blocking obstacles in the current zone: furniture footprints (circles) + fixture
// obstacles which may be circles {x,z,r} or rectangles {x,z,hw,hd,box}
function navObstacleCircles() {
  const out = [];
  for (const o of (current?.movables || [])) {
    if (o === guidePost || o.visible === false) continue;
    const r = navRadius(o); if (r > 0) out.push({ x: o.position.x, z: o.position.z, r });
  }
  for (const f of (current?.navObstacles || [])) out.push(f);
  return out;
}
// signed distance from a point to an obstacle surface (<0 = inside), outward normal, and a
// bounding radius used for path-blocking waypoints. Handles both circles and boxes.
function obstInfo(o, px, pz) {
  if (o.box) {
    const cx = Math.max(o.x - o.hw, Math.min(px, o.x + o.hw));
    const cz = Math.max(o.z - o.hd, Math.min(pz, o.z + o.hd));
    let nx = px - cx, nz = pz - cz; const d = Math.hypot(nx, nz);
    if (d < 1e-4) {                                   // inside → push to nearest edge
      const dl = px - (o.x - o.hw), dr = (o.x + o.hw) - px, db = pz - (o.z - o.hd), dt = (o.z + o.hd) - pz;
      const m = Math.min(dl, dr, db, dt);
      if (m === dl) return { d: -m, nx: -1, nz: 0, br: Math.hypot(o.hw, o.hd) };
      if (m === dr) return { d: -m, nx: 1, nz: 0, br: Math.hypot(o.hw, o.hd) };
      if (m === db) return { d: -m, nx: 0, nz: -1, br: Math.hypot(o.hw, o.hd) };
      return { d: -m, nx: 0, nz: 1, br: Math.hypot(o.hw, o.hd) };
    }
    return { d, nx: nx / d, nz: nz / d, br: Math.hypot(o.hw, o.hd) };
  }
  const ox = px - o.x, oz = pz - o.z, dd = Math.hypot(ox, oz) || 1e-4;
  return { d: dd - o.r, nx: ox / dd, nz: oz / dd, br: o.r };
}

// send the guide to a point in the current zone, then run a callback (embodied voice actions)
function guideRunTo(localX, localZ, onArrive) {
  if (!current) { onArrive?.(); return; }
  const b = (GUIDE_HOME[current.id]?.bounds) ?? current.bounds ?? [-4, 4, -2.6, 2.4];
  guideTarget = new THREE.Vector3(THREE.MathUtils.clamp(localX, b[0], b[1]), 0, THREE.MathUtils.clamp(localZ, b[2], b[3]));
  guideArriveCb = onArrive || null;
  resetGuideNav();
  guidePost.userData.poke?.();
  sound('squeak');
}

// AI-create an object headlessly (voice: "make me a red arcade cabinet") and hand to placement
async function createFromDescription(desc) {
  say('Creating…', `Let me make you a <b>${desc}</b>, ${userName}…`);
  const res = await gen3d.generate(desc, { onStatus: (s) => say('Creating…', s) });
  if (!res) { say('Hmm', `I couldn't quite make a ${desc} — try describing it differently?`); return; }
  const id = gen3d.saveCreation(desc, res.source);
  sound('ding');
  say('Made it!', `Here's your <b>${desc}</b>. Move your mouse to place it — it's saved in your catalogue.`);
  designer.place(id, { style: current?.style || 'bob' });
}

function setCamera(room) {
  const [px, py, pz] = room.cam.pos;
  const [lx, ly, lz] = room.cam.look;
  camBase.set(room.x + px, py, pz);
  camLook.set(room.x + lx, ly, lz);
}

function gotoRoom(id, opts = {}) {
  const room = rooms[id];
  if (!room || room === current) return;
  apps.closeApp();
  fade.style.opacity = '1';
  if (!opts.silent) sound('creak');
  setTimeout(() => {
    if (current) scene.remove(current.root);
    scene.add(room.root);
    current = room;
    placeGuide(room);   // Rover greets at the door too, like the original
    setCamera(room);
    camera.position.set(room.x + room.cam.pos[0], room.cam.pos[1], room.cam.pos[2]);
    controls.enabled = true;            // every scene (porch included) is drag-to-look
    // per-zone orbit envelope — outdoor zones open up (wider zoom, look-down allowed)
    controls.maxDistance = room.orbit?.maxDist ?? 14;
    controls.maxPolarAngle = room.orbit?.maxPolar ?? Math.PI * 0.54;
    controls.target.set(camLook.x, camLook.y, camLook.z);
    controls.update();
    camAnimating = false;
    refreshLabels();
    fade.style.opacity = '0';
    document.getElementById('exitSign').classList.toggle('hidden', id === 'porch');
    document.getElementById('hintBar').classList.toggle('hidden', id === 'porch');
    document.getElementById('micBtn')?.classList.toggle('hidden', id === 'porch');
    designBtn.classList.toggle('hidden', id === 'porch');
    if (id === 'porch') designer.closeCatalog();
    if (!opts.silent && id !== 'porch') {
      const g = GUIDES[guideId];
      const favBtns = (g.fav || []).slice(0, 2).map(a => [`Open ${APP_LABEL[a]}`, () => apps.openApp(a)]);
      setTimeout(() => say(room.title, `${userName}, to start a program just click on it, or press <b>F1</b> to see them all. I'm best with <b>${g.specialty}</b> — shall I open something?`,
        [...favBtns, ['Other options', () => apps.openOptions()]]), 500);
    }
    opts.then?.();
  }, 480);
}

// ── sign-in at the red door ─────────────────────────────────────
let signedIn = false;
function signIn() {
  sound('knock');
  apps.showSignIn((name) => {
    userName = name;
    signedIn = true;
    sound('creak');
    const hinge = rooms.porch.doorHinge;
    camAnimating = true;   // take the camera off OrbitControls for the scripted fly-in
    tween(0, -1.75, 1.6, v => { hinge.rotation.y = v; }, easeOut, () => {
      // dolly through the door into the light
      tween(camera.position.z, 1.1, 1.2, v => { camera.position.z = v; }, easeOut);
      setTimeout(() => gotoRoom('family', {
        then: () => setTimeout(() => { const gg = guideGreeting(); say(`Welcome home, ${userName}!`, gg.body, gg.opts); }, 600),
      }), 900);
    });
  });
}

function exitHome() {
  say('Goodbye!', 'See you next time…');
  balloonEl.classList.add('hidden');
  gotoRoom('porch', { silent: true });
  rooms.porch.doorHinge.rotation.y = 0;
  signedIn = false;
  setTimeout(() => say('Good evening.', 'Click on the door to sign in…'), 900);
}

// ── tour ────────────────────────────────────────────────────────
function startTour() {
  const stops = [
    ['family', 'The Family Room — fireplace, plaid sofa, and every program within reach. The heart of the house.'],
    ['study', 'The Study — for serious letters, serious money, and a globe that has opinions.'],
    ['kitchen', 'The Postmodern Kitchen — teal, purple and orange were a choice, and 1995 stands by it.'],
    ['attic', 'The Castle Attic — moose antlers, an hourglass, and one suspiciously organized chest.'],
    ['family', 'And back to the Family Room. Tour complete! Click anything that looks clickable.'],
  ];
  let i = 0;
  const next = () => {
    if (i >= stops.length) return;
    const [id, text] = stops[i++];
    gotoRoom(id, { silent: i > 1, then: () => { say(`Tour stop ${i} of ${stops.length}`, text); setTimeout(next, 5200); } });
    if (i === 1) { say(`Tour stop 1 of ${stops.length}`, stops[0][1]); setTimeout(next, 5200); }
  };
  gotoRoom(stops[0][0], { silent: true, then: () => { say('Tour stop 1 of 5', stops[0][1]); i = 1; setTimeout(next, 5200); } });
}

// ── labels (F1) ─────────────────────────────────────────────────
const labelsBox = document.getElementById('labels');
let labelEls = [];
function refreshLabels() {
  labelsBox.innerHTML = '';
  labelEls = [];
  if (!labelsOn || !current || current.id === 'porch') return;
  const title = document.createElement('div');
  title.className = 'chip room';
  title.textContent = current.title;
  labelsBox.appendChild(title);
  labelEls.push({ el: title, fixed: [0.5, 0.06] });
  current.hotspots.forEach(h => {
    if (h.kind === 'fun' && h.action === 'moose') return;
    const el = document.createElement('div');
    el.className = `chip ${h.kind === 'door' ? 'door' : h.kind === 'launch' ? 'launch' : 'app'}`;
    el.textContent = h.name;
    labelsBox.appendChild(el);
    labelEls.push({ el, obj: h.anchor ?? h.obj });
  });
}
function toggleLabels() {
  labelsOn = !labelsOn;
  refreshLabels();
  sound('pop');
}
const _v = new THREE.Vector3();
function updateLabels() {
  if (!labelsOn) return;
  labelEls.forEach(({ el, obj, fixed }) => {
    if (fixed) {
      el.style.left = `${fixed[0] * 100}%`;
      el.style.top = `${fixed[1] * 100}%`;
      return;
    }
    obj.getWorldPosition(_v);
    _v.y += 0.25;
    _v.project(camera);
    el.style.left = `${(_v.x * 0.5 + 0.5) * 100}%`;
    el.style.top = `${(-_v.y * 0.5 + 0.5) * 100}%`;
    el.style.display = _v.z < 1 ? '' : 'none';
  });
}

// ── picking ─────────────────────────────────────────────────────
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;

// ── arrange mode: move / resize / copy / delete furniture & decor ──
let arrangeMode = false;
let selectedObj = null;
let draggingObj = false;
let justDropped = false;
let selBox = null;
const arrangeBar = document.createElement('div');
arrangeBar.id = 'arrangeBar';
arrangeBar.className = 'hidden';
document.getElementById('overlay').appendChild(arrangeBar);
const arrangeHint = document.createElement('div');
arrangeHint.id = 'arrangeHint';
arrangeHint.className = 'hidden';
document.getElementById('overlay').appendChild(arrangeHint);

// Home Designer launcher button (bottom-left)
const designBtn = document.createElement('button');
designBtn.id = 'designBtn';
designBtn.className = 'hidden';
designBtn.innerHTML = '🛠️ Design';
document.getElementById('overlay').appendChild(designBtn);
designBtn.addEventListener('click', () => { if (current && current.id !== 'porch') designer.openCatalog(); });

// Phase D — AI object generation: describe a thing → the house makes it, saves it, places it.
function openCreateAI() {
  document.querySelectorAll('.dialog-scrim').forEach(x => x.remove());
  const d = document.createElement('div');
  d.className = 'dialog-scrim';
  d.innerHTML = `<div class="dialog" style="max-width:440px">
    <h3>✨ Create with AI</h3>
    <p style="font-size:12.5px;margin:2px 0 8px">Describe an object and the house will build it — flat things (a jukebox, a red arcade cabinet) and round things (a blue vase, a teapot) both work. It's saved and placeable like anything else.</p>
    <input class="bob-input" id="aiDesc" placeholder="e.g. a red arcade cabinet" maxlength="80">
    <div id="aiStatus" style="font-size:12px;color:#6a4408;min-height:18px;margin:6px 2px"></div>
    <div class="btn-row"><button class="bob-btn no" data-x="cancel">Cancel</button><button class="bob-btn ok" data-x="go">Create it</button></div>
  </div>`;
  document.body.appendChild(d);
  const input = d.querySelector('#aiDesc');
  const status = d.querySelector('#aiStatus');
  setTimeout(() => input.focus(), 60);
  let busy = false;
  const go = async () => {
    const desc = input.value.trim();
    if (!desc || busy) return;
    busy = true; status.textContent = 'Thinking…'; sound('page');
    const res = await gen3d.generate(desc, { onStatus: (s) => { status.textContent = s; } });
    if (!res) { busy = false; status.innerHTML = '<b>Hmm, that one wouldn\'t come out right.</b> Try describing it a little differently?'; return; }
    const id = gen3d.saveCreation(desc, res.source);
    sound('ding');
    d.remove();
    say('Made it!', `Here's your <b>${desc}</b>, ${userName}. Move your mouse to place it — it's saved in your catalogue under Decor. Very ${guideWord()}.`);
    designer.place(id, { style: current?.style || 'bob' });
  };
  d.addEventListener('click', (e) => { const x = e.target.closest('[data-x]')?.dataset.x; if (x === 'go') go(); else if (x === 'cancel' || e.target === d) { if (!busy) d.remove(); } });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
window.__createAI = openCreateAI;

function findMovable(clientX, clientY) {
  if (!current) return null;
  mouse.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(current.root.children, true);
  for (const hit of hits) {
    let o = hit.object;
    while (o && o !== current.root) {
      if (o.userData.movable) return o;
      o = o.parent;
    }
  }
  return null;
}

function setArrange(on) {
  arrangeMode = on;
  deselectObj();
  arrangeHint.classList.toggle('hidden', !on);
  canvas.style.cursor = on ? 'grab' : '';
  if (on) {
    arrangeHint.innerHTML = '🛠️ <b>Arrange mode</b> — click any piece of furniture or decoration to Move, Resize, Copy or Delete it. Press <b>M</b> or Esc to finish.';
    say('Change something', `Click on a thing you'd like to change, ${userName}. You can move it, resize it, copy it, or make it disappear — just like 1995. It's ${guideWord()}.`);
  } else {
    balloonEl.classList.add('hidden');
  }
}

function deselectObj() {
  selectedObj = null; draggingObj = false;
  arrangeBar.classList.add('hidden');
  if (selBox) { selBox.parent?.remove(selBox); selBox.geometry.dispose(); selBox = null; }
}

function setMoveBtn(dragging) {
  const b = arrangeBar.querySelector('[data-a="move"]');
  if (b) b.innerHTML = dragging ? '✅ Drop here' : '✋ Move';
}

function dropObj() {
  if (!draggingObj || !selectedObj) return;
  draggingObj = false;
  justDropped = true;
  setMoveBtn(false);
  saveArrange(selectedObj);
  sound('pop');
  arrangeHint.innerHTML = `The <b>${selectedObj.userData.movable}</b> is set down. Pick another change, or press <b>Done</b>.`;
}

function selectObj(o) {
  deselectObj();
  selectedObj = o;
  selBox = new THREE.BoxHelper(o, 0xffcf3a);
  current.root.add(selBox);
  showArrangeBar(o);
}

function showArrangeBar(o) {
  const name = o.userData.movable;
  arrangeBar.innerHTML = `<div class="ab-title">How do you want to change the ${name}?</div>
    <div class="ab-btns">
      <button data-a="move">✋ Move</button>
      <button data-a="bigger">➕ Bigger</button>
      <button data-a="smaller">➖ Smaller</button>
      <button data-a="rotate">🔄 Turn</button>
      <button data-a="nearer">⬇ Closer</button>
      <button data-a="farther">⬆ Farther</button>
      <button data-a="copy">⧉ Copy</button>
      <button data-a="restyle">🎨 Restyle</button>
      <button data-a="delete">🗑 Delete</button>
      <button data-a="done" class="ab-done">✓ Done</button>
    </div>`;
  arrangeBar.classList.remove('hidden');
  arrangeBar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => arrangeAction(b.dataset.a)));
}

const B = { x: [-4.6, 4.6], z: [-2.8, 2.7] };
function roomBounds() { return (GUIDE_HOME[current.id]?.bounds) ?? current?.bounds ?? [B.x[0], B.x[1], B.z[0], B.z[1]]; }

function arrangeAction(a) {
  const o = selectedObj;
  if (!o) return;
  sound('pop');
  if (a === 'move') {
    if (draggingObj) { dropObj(); return; }
    draggingObj = true;
    setMoveBtn(true);
    arrangeHint.innerHTML = `Moving the <b>${o.userData.movable}</b> — move your mouse and click anywhere to set it down.`;
  } else if (a === 'bigger') { o.scale.multiplyScalar(1.15); selBox.update(); saveArrange(o); }
  else if (a === 'smaller') { o.scale.multiplyScalar(0.87); selBox.update(); saveArrange(o); }
  else if (a === 'rotate') { o.rotation.y += Math.PI / 8; selBox.update(); saveArrange(o); }
  else if (a === 'nearer') { o.position.z = THREE.MathUtils.clamp(o.position.z + 0.4, roomBounds()[2], roomBounds()[3]); selBox.update(); saveArrange(o); }
  else if (a === 'farther') { o.position.z = THREE.MathUtils.clamp(o.position.z - 0.4, roomBounds()[2], roomBounds()[3]); selBox.update(); saveArrange(o); }
  else if (a === 'copy') {
    let clone;
    if (o.userData.placedUid) {
      // a catalogue item → spawn a fresh persistent placed record
      const op = o.userData.catalogOpts || {};
      clone = zoneApi.placeItem(current.id, o.userData.catalogId, {
        x: o.position.x + 0.6, y: o.position.y, z: o.position.z + 0.3, ry: o.rotation.y,
        scale: o.scale.x, color: op.color ?? undefined, variant: op.variant ?? 0, style: op.style ?? null });
    } else {
      clone = o.clone(true);
      clone.position.x += 0.6; clone.position.z += 0.3;
      clone.userData = { ...o.userData };
      clone.userData.movIndex = (current.movables.push(clone) - 1);
      clone.userData.movKey = o.userData.movKey + '*' + clone.userData.movIndex;   // own save slot, never the original's
      current.root.add(clone);
      saveArrange(clone);
    }
    if (clone) { say('Copied!', `There are now two <b>${o.userData.movable}s</b>. A very ${guideWord()} kind of clutter.`); selectObj(clone); }
  } else if (a === 'restyle') {
    designer.openObjectStyle(o);
  } else if (a === 'delete') {
    if (o.userData.placedUid) { zoneApi.removeItem(o); }
    else { o.visible = false; saveArrange(o); }
    say('Poof!', `The <b>${o.userData.movable}</b> is gone. Choose <b>Reset room</b> from Options to bring everything back.`);
    deselectObj();
  } else if (a === 'done') {
    deselectObj();
  }
}

function resetArrangement() {
  if (current) { localStorage.removeItem(arrangeKey(current.id)); if (current.isData) resetZone(current.id); }
  say('Room reset', 'Everything is back where it started. Reload to see the original layout in full.');
  location.reload();
}

function findHot(x, y) {
  if (!current) return null;
  mouse.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(current.root.children, true);
  for (const hit of hits) {
    let o = hit.object;
    while (o && o !== current.root) {
      const h = current.hotspots.find(hs => hs.obj === o);
      if (h) return h;
      o = o.parent;
    }
  }
  return null;
}

// drop a dragged object on any press outside the toolbar
addEventListener('pointerdown', (e) => {
  if (arrangeMode && draggingObj && !e.target.closest('#arrangeBar')) dropObj();
  if (e.target === canvas) { downX = e.clientX; downY = e.clientY; downType = e.pointerType || 'mouse'; }
}, true);
let downX = 0, downY = 0, downType = 'mouse';
// true when the pointer moved far enough since press to count as an orbit-drag, not a click —
// fingers wobble far more than mice, so taps get a much looser budget
function wasDrag(e) { return Math.hypot(e.clientX - downX, e.clientY - downY) > (downType === 'touch' ? 18 : 6); }
// fat-finger pick: a precise ray from a fingertip misses small hotspots (the knocker!),
// so on touch retry a small ring of offsets around the tap before giving up
function findHotAt(x, y) {
  let h = findHot(x, y);
  if (!h && downType === 'touch') {
    for (const [dx, dy] of [[0, -14], [14, 0], [-14, 0], [0, 14], [10, -10], [-10, -10], [10, 10], [-10, 10]]) {
      h = findHot(x + dx, y + dy);
      if (h) break;
    }
  }
  return h;
}

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
  if (designer.isPlacing()) { designer.handlePointerMove(e.clientX, e.clientY); return; }
  if (document.querySelector('.app-win, .dialog-scrim')) { hovered = null; hoverTag.classList.add('hidden'); canvas.style.cursor = ''; return; }
  if (arrangeMode) {
    hoverTag.classList.add('hidden');
    if (draggingObj && selectedObj) {
      mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      if (ray.ray.intersectPlane(groundPlane, _floorHit)) {
        const b = roomBounds();
        selectedObj.position.x = THREE.MathUtils.clamp(_floorHit.x - current.x, b[0], b[1]);
        selectedObj.position.z = THREE.MathUtils.clamp(_floorHit.z, b[2], b[3]);
        selBox?.update();
      }
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = findMovable(e.clientX, e.clientY) ? 'grab' : 'default';
    }
    return;
  }
  hovered = findHot(e.clientX, e.clientY);
  canvas.style.cursor = hovered ? 'pointer' : '';
  if (hovered && !labelsOn) {
    hoverTag.textContent = hovered.name;
    hoverTag.style.left = `${e.clientX + 16}px`;
    hoverTag.style.top = `${e.clientY + 18}px`;
    hoverTag.classList.remove('hidden');
  } else hoverTag.classList.add('hidden');
});

addEventListener('click', (e) => {
  if (e.target !== canvas) return;
  if (wasDrag(e)) return;    // that was an orbit drag, not a click — ignore
  if (designer.isPlacing()) { designer.handleClick(); return; }   // drop a catalogue item
  if (arrangeMode) {
    if (draggingObj) return;   // dropping is handled on pointerdown
    if (justDropped) { justDropped = false; return; }  // swallow the click that ended a drag
    const m = findMovable(e.clientX, e.clientY);
    if (m) { sound('pop'); selectObj(m); }
    else deselectObj();
    return;
  }
  const h = findHotAt(e.clientX, e.clientY);
  if (!h) { walkGuideTo(e.clientX, e.clientY); return; }  // empty floor → send the guide there
  sound('pop');
  if (h.action === 'signin') { signIn(); }
  else if (h.kind === 'app') { apps.openApp(h.app); }
  else if (h.kind === 'launch') {
    fetch('/api/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: h.launch }) })
      .then(r => r.json())
      .then(r => say(h.name, r.ok ? `Opening <b>${r.app}</b> on the real computer. The house is full of doors.` : `Hmm — I couldn't open that: ${r.error}`))
      .catch(() => say(h.name, 'The launcher endpoint is not answering. Is serve.py running?'));
  }
  else if (h.kind === 'door') {
    const hinge = h.obj.userData.hinge;
    if (hinge) { sound('creak'); tween(0, -1.4, 0.7, v => { hinge.rotation.y = v; }, easeOut, () => { setTimeout(() => hinge.rotation.y = 0, 700); }); }
    setTimeout(() => gotoRoom(h.target), 350);
  } else if (h.action === 'mousehole') {
    sound('squeak');
    say('The Mouse Hole', guideId === 'scuzz' ? 'Yeah, that\'s my place. Don\'t track mud in.' : 'Somebody small lives in there. Scuzz says the rent is very reasonable.');
  } else if (h.action === 'bowl') {
    sound('woof');
    say("Rover's Bowl", guideId === 'rover' ? 'Oh! Is it dinner time?? It\'s ALWAYS dinner time. Scrumptious!' : `That's Rover's bowl. He'll be along shortly — he always is.`);
  } else if (h.action === 'moose') {
    say('The Moose', 'He is decorative, he is majestic, and he has seen everything that happens in this attic.');
  } else if (h.action === 'guide') {
    apps.openGuidePicker(GUIDES, guideId);
  }
});

addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); toggleLabels(); }
  else if (e.key === 'Escape') { if (designer.isPlacing()) { designer.cancelPlacing(); say('Cancelled', 'No worries — nothing placed.'); } else if (draggingObj) dropObj(); else if (arrangeMode) setArrange(false); else if (designer.isPanelOpen()) designer.closeCatalog(); else apps.closeApp(); }
  else if (designer.isPlacing()) { if (e.key === 't' || e.key === 'T') designer.rotatePlacing(); }
  else if (!signedIn) return;
  else if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  else if (e.key === 'g' || e.key === 'G') apps.openGuidePicker(GUIDES, guideId);
  else if (e.key === 'o' || e.key === 'O') apps.openOptions();
  else if (e.key === 'm' || e.key === 'M') setArrange(!arrangeMode);
  else if (e.key === 'c' || e.key === 'C') { if (current && current.id !== 'porch') designer.openCatalog(); }
  else if (e.key === 'r' || e.key === 'R') resetView();   // snap back to the Bob framing
});

document.getElementById('exitSign').addEventListener('click', () => apps.showExitDialog());

// ── wire the app layer ──────────────────────────────────────────
apps.initApps({
  say, sound, guideWord, guideName,
  user: () => userName,
  gotoRoom,
  roomList: () => zoneOrder.filter(id => id !== 'porch').map(id => rooms[id]),
  toggleLabels, startTour, rambling,
  arrange: () => setArrange(true),
  openDesigner: () => designer.openCatalog(),
  restyle: () => designer.openThemePicker(),
  resetRoom: resetArrangement,
  openGuides: () => apps.openGuidePicker(GUIDES, guideId),
  setGuide: (id) => handoverGuide(id),
  exit: exitHome,
});

// ── boot sequence ───────────────────────────────────────────────
const splash = document.getElementById('splash');
setTimeout(() => { const sl = document.getElementById('splashLoading'); if (sl) sl.textContent = 'Click anywhere to open the house…'; }, 900);
splash.addEventListener('click', () => {
  splash.classList.add('fading');
  setTimeout(() => splash.remove(), 1200);
  sound('open');
  gotoRoom('porch', { silent: true });
  setTimeout(() => say('Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening') + '.', 'Click on the door knocker to sign in…'), 1300);
}, { once: true });

// ── voice: hold the mic button (or SPACE) and talk to your guide ──
const micBtn = document.getElementById('micBtn');
voice.initVoice({
  say, user: () => userName,
  guideId: () => guideId,
  onHeard: (t) => say('You said…', `“${t}”`),
  setVoiceState: (s) => {
    if (!micBtn) return;
    micBtn.dataset.state = s;
    micBtn.textContent = { idle: '🎤 Hold to talk', listening: '🔴 Listening…', thinking: '💭 Thinking…', speaking: '🔊 Speaking…' }[s] || '🎤 Hold to talk';
  },
});
if (micBtn) {
  const down = (e) => { e.preventDefault(); if (signedIn) voice.startListening(); };
  const up = (e) => { e.preventDefault(); voice.stopListening(); };
  micBtn.addEventListener('pointerdown', down);
  addEventListener('pointerup', up);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && signedIn && !e.repeat && !e.target.closest?.('input, textarea, [contenteditable]')) { e.preventDefault(); voice.startListening(); }
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); voice.stopListening(); } });
}

// ── alarm checker (Bob Clock alarms ring house-wide) ────────────
setInterval(() => {
  if (!signedIn) return;
  let alarms;
  try { alarms = JSON.parse(localStorage.getItem('bob3d.alarms') || '[]'); } catch { return; }
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toDateString();
  let changed = false;
  alarms.forEach(a => {
    if (a.t === hhmm && a.fired !== today) {
      a.fired = today; changed = true;
      sound('ding'); setTimeout(() => sound('ding'), 500); setTimeout(() => sound('ding'), 1000);
      say('⏰ ' + a.t, `${guideName()} here — <b>ALARM!</b> ${a.msg || 'Time to wake the whole house!'}`);
    }
  });
  if (changed) localStorage.setItem('bob3d.alarms', JSON.stringify(alarms));
}, 15000);

// ── main loop ───────────────────────────────────────────────────
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateTweens(dt);
  if (current) {
    current.tick?.(t, camera);
    guidePost.userData.animate(t, dt);
    // guide walking — steer AROUND furniture instead of through it (potential field)
    if (guideTarget) {
      const gp = guidePost.position;
      const dx = guideTarget.x - gp.x, dz = guideTarget.z - gp.z;
      const dist = Math.hypot(dx, dz);
      const arrive = () => { gp.y = 0; guideTarget = null; guideWalking = false; if (guideArriveCb) { const cb = guideArriveCb; guideArriveCb = null; cb(); } };
      if (dist > 0.1) {
        // gather obstacle circles: furniture footprints + zone fixtures (pool, shed…)
        const circles = navObstacleCircles();
        // find the obstacle blocking the straight path to the target (nearest along the path)
        let block = null, blockT = Infinity;
        for (const o of circles) {
          const info = obstInfo(o, gp.x, gp.z);
          const ab2 = dx * dx + dz * dz || 1;
          let tt = ((o.x - gp.x) * dx + (o.z - gp.z) * dz) / ab2; tt = Math.max(0, Math.min(1, tt));
          const cx = gp.x + dx * tt, cz = gp.z + dz * tt;
          const dCtr = Math.hypot(cx - o.x, cz - o.z);
          if (dCtr < info.br + GUIDE_RADIUS + 0.15 && tt < blockT) { blockT = tt; block = o; }
        }
        let mvx, mvz;
        if (block) {
          // SLIDE around it: perpendicular with a little forward bias. The side is STICKY
          // per obstacle — re-deciding it every frame is what made tight gaps jitter.
          const key = block.x.toFixed(2) + ',' + block.z.toFixed(2);
          const tox = block.x - gp.x, toz = block.z - gp.z;
          let px = -toz, pz = tox; const pl = Math.hypot(px, pz) || 1; px /= pl; pz /= pl;
          if (key !== guideBlockKey) { guideSlideSide = (px * dx + pz * dz) >= 0 ? 1 : -1; guideBlockKey = key; }
          mvx = px * guideSlideSide + (dx / dist) * 0.35;
          mvz = pz * guideSlideSide + (dz / dist) * 0.35;
        } else {
          guideBlockKey = null;
          mvx = dx / dist; mvz = dz / dist;
        }
        // gentle repulsion, fading on final approach so the guide can actually settle
        const settle = Math.min(1, dist / 0.6);
        for (const o of circles) {
          const info = obstInfo(o, gp.x, gp.z), margin = GUIDE_RADIUS + 0.25;
          if (info.d < margin) { const s = Math.min(1.4, (margin - info.d) / margin + (info.d < 0 ? 1 : 0)); mvx += info.nx * s * 1.2 * settle; mvz += info.nz * s * 1.2 * settle; }
        }
        // low-pass the steering: competing pushes can't flip the direction frame-to-frame
        const ml = Math.hypot(mvx, mvz) || 1; mvx /= ml; mvz /= ml;
        const k = Math.min(1, dt * 7);
        guideVel.x += (mvx - guideVel.x) * k;
        guideVel.z += (mvz - guideVel.z) * k;
        const vl = Math.hypot(guideVel.x, guideVel.z) || 1;
        const svx = guideVel.x / vl, svz = guideVel.z / vl;
        // ease into the target instead of overshooting and orbiting it
        const speed = 2.6 * Math.min(1, dist / 0.5 + 0.25);
        const step = Math.min(dist, dt * speed);
        const b = roomBounds();
        gp.x = THREE.MathUtils.clamp(gp.x + svx * step, b[0], b[1]);
        gp.z = THREE.MathUtils.clamp(gp.z + svz * step, b[2], b[3]);
        // heading with proper angle wrapping (no long-way-round spins)
        let dAng = Math.atan2(svx, svz) - guidePost.rotation.y;
        dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng));
        guidePost.rotation.y += dAng * Math.min(1, dt * 7);
        gp.y = Math.abs(Math.sin(t * 12)) * 0.05 * Math.min(1, step / (dt * 1.3) || 0);   // waddle scales with real speed
        guideWalking = true;
        // stuck detector — target sits next to/behind furniture: settle once we can't beat our
        // closest approach for a bit (tracks best distance, so it doesn't fidget forever)
        if (dist < guideLastDist - 0.015) { guideLastDist = dist; guideStuckT = 0; }
        else { guideStuckT += dt; if (guideStuckT > 1.1) arrive(); }
      } else {
        arrive();
      }
    } else {
      // ease back to facing the camera when idle
      guidePost.rotation.y += (guideIdleFacing - guidePost.rotation.y) * 0.04;
    }
    if (!camAnimating) controls.update();
  }
  updateLabels();
  positionBalloon();
  composer.render();
}
loop();

// debug / automation hooks
window.__bob = {
  signInAs: (name) => { userName = name || 'Friend'; signedIn = true; localStorage.setItem('bob3d.user', JSON.stringify(userName)); document.getElementById('splash')?.remove(); gotoRoom('family', { silent: true }); },
  goto: (id) => gotoRoom(id),
  open: (id) => apps.openApp(id),
  close: () => apps.closeApp(),
  guides: () => apps.openGuidePicker(GUIDES, guideId),
  setGuide: (id) => { guideId = id; guidePost.userData.setGuide(id); },
  hideBalloon: () => balloonEl.classList.add('hidden'),
  options: () => apps.openOptions(),
  arrange: () => setArrange(true),
  theme: () => designer.openThemePicker(),
  catalog: () => designer.openCatalog(),
  finder: () => apps.openProgramFinder(),
  signinDialog: () => apps.showSignIn(() => {}),
  createAI: () => openCreateAI(),
  selectFirstMovable: () => { if (current?.movables?.length) { const o = current.movables.find(m => m.visible !== false); if (o) { setArrange(true); selectObj(o); } } },
  runGuide: (x, z) => guideRunTo(x, z),
  guideNav: () => ({
    gx: +guidePost.position.x.toFixed(3), gz: +guidePost.position.z.toFixed(3), walking: !!guideTarget,
    obs: (current?.movables || []).filter(o => o.visible !== false).map(o => ({ x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2), r: +navRadius(o).toFixed(2) })).filter(o => o.r > 0),
    fx: current?.navObstacles || [],
  }),
  cam: () => ({ pos: camera.position.toArray().map(n => +n.toFixed(2)), enabled: controls.enabled, target: controls.target.toArray().map(n => +n.toFixed(2)), room: current?.id, maxDist: controls.maxDistance }),
  providers,
  sayAloud: (text) => voice.speak(text, guideId),
  setCam: (pos, target) => { camera.position.set(...pos); if (target) controls.target.set(...target); controls.update(); },
  guideScreen() {
    const v = new THREE.Vector3();
    guidePost.getWorldPosition(v); v.y += 1.2; v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z, inScene: !!guidePost.parent, guide: guidePost.userData.guideId() };
  },
};
