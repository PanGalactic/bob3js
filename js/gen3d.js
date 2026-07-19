// gen3d.js — AI object generation. Classify → generate → sanitise → build → validate+retry →
// register as a catalogue item → persist the SOURCE in BobOS.fs (home/creations/<id>) so it
// rebuilds on reload and is placeable/restyleable like any curated item.
//
// Two validated pipelines (see BUILD_PLAN §4):
//   flat-fronted  → gemma → SVG → sanitise → SVGLoader + ExtrudeGeometry
//   round/sculpt  → gemma → JSON primitives → deterministic build

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import * as catalog from './catalog.js';
import { BobOS } from './os.js';

const post = async (path, body) => {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
};

// ── classify: flat-fronted panel vs round/sculptural ────────────
export async function classify(desc) {
  try {
    const { text } = await post('/api/chat', { messages: [
      { role: 'system', content: 'Reply with exactly ONE word: "flat" if the object is a flat-fronted panel/box/signage thing (TV, cabinet, arcade, radio, painting, appliance, poster), or "round" if it is rounded/sculptural (vase, lamp, teapot, ball, bottle, bust, plant). No other words.' },
      { role: 'user', content: desc },
    ] });
    return /round|sculpt|vase|lamp|ball|pot/i.test(text) ? 'round' : 'flat';
  } catch { return 'flat'; }
}

// ── SVG sanitiser (deterministic JS port of the lxml logic) ─────
export function sanitizeSVG(text) {
  let s = (text || '').trim();
  // pull the svg out of any markdown fence / prose
  const m = s.match(/<svg[\s\S]*<\/svg>/i);
  if (m) s = m[0];
  // strip unsupported elements SVGLoader can't use
  s = s.replace(/<(text|filter|style|clipPath|image|script|defs)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(text|image|use)\b[^>]*\/>/gi, '');
  // fix 5-digit hex (#12345 -> #112345) and stray gradients
  s = s.replace(/fill="url\([^"]*\)"/gi, 'fill="#cccccc"');
  // if no <svg> wrapper (model returned bare shapes), wrap them
  if (!/<svg/i.test(s)) s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${s}</svg>`;
  // ensure a viewBox
  if (!/viewBox=/i.test(s)) s = s.replace(/<svg/i, '<svg viewBox="0 0 200 200"');
  // ensure namespace
  if (!/xmlns=/i.test(s)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return s;
}

function normalize(obj, targetH = 1.15) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  const h = Math.max(size.y, 0.001);
  const s = targetH / h;
  const wrap = new THREE.Group();
  obj.position.set(-ctr.x, -ctr.y, -ctr.z);   // recenter to origin
  wrap.add(obj);
  wrap.scale.setScalar(s);
  // sit the base on the floor
  const box2 = new THREE.Box3().setFromObject(wrap);
  wrap.position.y = -box2.min.y;
  return wrap;
}

// ── build extruded object from SVG ──────────────────────────────
export function buildFromSVG(svgText) {
  const data = new SVGLoader().parse(svgText);
  const obj = new THREE.Group();
  let meshes = 0;
  data.paths.forEach((path, i) => {
    const fill = path.userData?.style?.fill;
    const mat = new THREE.MeshStandardMaterial({
      color: (fill && fill !== 'none') ? new THREE.Color(fill) : new THREE.Color('#c8a860'),
      roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide, flatShading: false,
    });
    SVGLoader.createShapes(path).forEach(shape => {
      const isBody = i === 0;
      const depth = isBody ? 10 : 2.5;
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.6, bevelSegments: 2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = isBody ? 0 : 10 + i * 0.04;
      mesh.castShadow = true; mesh.receiveShadow = true;
      obj.add(mesh); meshes++;
    });
  });
  if (!meshes) return null;
  obj.scale.y = -1;   // SVG Y is down
  return normalize(obj);
}

// ── build primitive object from JSON parts ──────────────────────
const col = (c) => { try { return new THREE.Color(c || '#bbb'); } catch { return new THREE.Color('#bbb'); } };
export function buildFromParts(parts) {
  const obj = new THREE.Group();
  let n = 0;
  (parts || []).forEach(p => {
    let g;
    switch (p.shape) {
      case 'box': g = new THREE.BoxGeometry(p.w || 0.3, p.h || 0.3, p.d || 0.3); break;
      case 'cylinder': g = new THREE.CylinderGeometry(p.rt ?? 0.2, p.rb ?? 0.2, p.h || 0.3, 28); break;
      case 'cone': g = new THREE.ConeGeometry(p.r || 0.3, p.h || 0.4, 28); break;
      case 'sphere': g = new THREE.SphereGeometry(p.r || 0.3, 28, 20); break;
      case 'torus': g = new THREE.TorusGeometry(p.r || 0.3, p.tube || 0.08, 14, 28); break;
      default: return;
    }
    const fix = (v) => (Math.abs(v || 0) > 6.3 ? (v * Math.PI / 180) : (v || 0));  // degrees→radians autofix
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col(p.color), roughness: 0.62, metalness: 0.05, flatShading: true }));
    mesh.position.set(p.x || 0, p.y || 0, p.z || 0);
    mesh.rotation.set(fix(p.rx), fix(p.ry), fix(p.rz));
    mesh.castShadow = mesh.receiveShadow = true;
    obj.add(mesh); n++;
  });
  if (!n) return null;
  return normalize(obj);
}

function parseParts(text) {
  let s = (text || '').trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (m) s = m[0];
  try { const d = JSON.parse(s); return d.parts || d; } catch { return null; }
}

// object is "valid" if it has real geometry with a non-degenerate bounding box
function valid(obj) {
  if (!obj) return false;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  return size.x > 0.02 && size.y > 0.02 && isFinite(size.x) && isFinite(size.y);
}

// ── generate with validate + retry (the "flawless" bar) ─────────
export async function generate(desc, { onStatus } = {}) {
  const kind = await classify(desc);
  onStatus?.(`Sketching a ${kind === 'flat' ? 'flat-fronted' : 'sculpted'} ${desc}…`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const prompt = attempt === 0 ? desc : `${desc} (attempt ${attempt + 1}: make it clearer and well-formed)`;
      if (kind === 'flat') {
        const { text } = await post('/api/svggen', { prompt, temperature: 0.4 + attempt * 0.2 });
        const svg = sanitizeSVG(text);
        const obj = buildFromSVG(svg);
        if (valid(obj)) return { kind, obj, source: { type: 'svg', data: svg }, desc };
      } else {
        const { text } = await post('/api/objgen', { prompt, temperature: 0.5 + attempt * 0.2 });
        const parts = parseParts(text);
        const obj = buildFromParts(parts);
        if (valid(obj)) return { kind, obj, source: { type: 'parts', data: parts }, desc };
      }
    } catch (e) { console.warn('[gen3d] attempt', attempt, e); }
    onStatus?.(`That one came out wrong — trying again (${attempt + 2}/3)…`);
  }
  return null;
}

// rebuild a live object from stored source (used by the catalogue item's build())
export function buildFromSource(source) {
  if (!source) return new THREE.Group();
  return (source.type === 'svg' ? buildFromSVG(source.data) : buildFromParts(source.data)) || new THREE.Group();
}

// ── register a creation as a catalogue item + persist its source ──
let creationSeq = 1;
export function registerCreation(id, name, source, icon = '✨') {
  catalog.register({
    id, name, category: 'Decor', icon, snap: 'floor', tags: ['ai', 'custom'],
    footprint: { w: 1, d: 1 }, ai: true,
    build() { return buildFromSource(source); },
  });
}

export function saveCreation(name, source) {
  const id = 'ai_' + Date.now().toString(36) + '_' + (creationSeq++);
  BobOS.fs.write(`home/creations/${id}`, { id, name, source, created: Date.now() });
  registerCreation(id, name, source);
  return id;
}

// re-register all persisted creations at boot (so they survive reload)
export function loadCreations() {
  BobOS.fs.list('home/creations/').forEach(path => {
    const c = BobOS.fs.read(path.replace(/^bob3d\./, ''));
    if (c && c.source) registerCreation(c.id, c.name, c.source);
  });
}
