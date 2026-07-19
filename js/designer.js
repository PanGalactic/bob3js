// designer.js — the Home Designer: catalogue panel, place→snap→drop→persist,
// per-object recolor/restyle, and per-zone / whole-house theme pickers.
//
// initDesigner(ctx) wires it to the shell. ctx = { scene, camera, controls, canvas,
//   getCurrent, zoneApi, sound, say, guideWord, refreshLabels }.
// main.js defers pointer/click to isPlacing()/handleClick during placement.

import * as THREE from 'three';
import * as catalog from './catalog.js';
import { STYLES, STYLE_ORDER, getStyle } from './styles.js';

let ctx = null;
export function initDesigner(c) { ctx = c; }

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);

// ════════════════════ thumbnail renderer ════════════════════
// One reusable offscreen renderer snapshots each catalogue item to a data URL.
let TR = null;
function thumbRenderer() {
  if (TR) return TR;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(150, 150, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xfff2e0, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a0, 0.8); rim.position.set(-3, 2, -2); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  TR = { renderer, scene, cam };
  return TR;
}
const thumbCache = new Map();
function thumbURL(id, style) {
  const k = id + ':' + style;
  if (thumbCache.has(k)) return thumbCache.get(k);
  const { renderer, scene, cam } = thumbRenderer();
  const obj = catalog.build(id, { style });
  if (!obj) return '';
  scene.add(obj);
  const bbox = new THREE.Box3().setFromObject(obj);
  const c = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) || 1;
  const dist = r * 1.7 + 0.6;
  cam.position.set(c.x + dist * 0.8, c.y + dist * 0.55, c.z + dist);
  cam.lookAt(c);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(obj);
  obj.traverse(o => o.geometry?.dispose?.());
  thumbCache.set(k, url);
  return url;
}

// ════════════════════ catalogue panel ════════════════════
let panel = null;
export function isPanelOpen() { return !!panel; }

export function openCatalog() {
  if (panel) { closeCatalog(); return; }
  const cur = ctx.getCurrent();
  const style = cur?.style || 'bob';
  const cats = catalog.categoriesPresent();
  let activeCat = cats[0];
  let query = '';

  panel = document.createElement('div');
  panel.id = 'designerPanel';
  panel.innerHTML = `
    <div class="dz-head">
      <span class="dz-title">🛠️ Home Designer</span>
      <button class="dz-x" title="Close">✕</button>
    </div>
    <input class="dz-search" placeholder="Search furniture…">
    <div class="dz-cats"></div>
    <div class="dz-grid"></div>
    <div class="dz-foot">
      <button class="dz-btn" data-act="theme">🎨 Restyle the room</button>
      <button class="dz-btn" data-act="ai">✨ Create with AI</button>
    </div>`;
  document.getElementById('overlay').appendChild(panel);

  const catBox = panel.querySelector('.dz-cats');
  const grid = panel.querySelector('.dz-grid');
  const renderCats = () => {
    catBox.innerHTML = cats.map(c => `<button class="dz-cat ${c === activeCat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
  };
  const renderGrid = () => {
    let items = query
      ? catalog.list().filter(d => (d.name + ' ' + d.tags.join(' ') + ' ' + d.category).toLowerCase().includes(query))
      : catalog.byCategory(activeCat);
    grid.innerHTML = items.map(d =>
      `<button class="dz-item" data-id="${d.id}" title="${d.name}">
        <img class="dz-thumb" alt="${d.name}">
        <span class="dz-name">${d.name}</span></button>`).join('') || '<div class="dz-empty">No matches.</div>';
    // fill thumbnails lazily (next frame so the panel paints first)
    requestAnimationFrame(() => {
      grid.querySelectorAll('.dz-item').forEach(btn => {
        const img = btn.querySelector('.dz-thumb');
        img.src = thumbURL(btn.dataset.id, style);
      });
    });
  };
  renderCats(); renderGrid();

  catBox.addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]'); if (!c) return;
    activeCat = c.dataset.c; query = ''; panel.querySelector('.dz-search').value = '';
    renderCats(); renderGrid();
  });
  grid.addEventListener('click', (e) => {
    const it = e.target.closest('[data-id]'); if (!it) return;
    startPlacing(it.dataset.id, { style });
  });
  panel.querySelector('.dz-search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderGrid(); });
  panel.querySelector('.dz-x').addEventListener('click', closeCatalog);
  panel.querySelector('[data-act="theme"]').addEventListener('click', () => openThemePicker());
  panel.querySelector('[data-act="ai"]').addEventListener('click', () => ctx.createWithAI?.());
  ctx.sound('open');
}
export function closeCatalog() { if (panel) { panel.remove(); panel = null; ctx.sound('pop'); } }

// ════════════════════ placement ════════════════════
let placing = null;   // { id, ghost, def, opts }
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPt = new THREE.Vector3();

export function isPlacing() { return !!placing; }

// public entry so other modules (AI create, voice) can start placement of a catalogue id
export function place(id, opts = {}) {
  const cur = ctx.getCurrent();
  startPlacing(id, { style: cur?.style || 'bob', ...opts });
}

function ghostify(obj) {
  obj.traverse(o => {
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      o.material = mats.map(m => { const c = m.clone(); c.transparent = true; c.opacity = 0.6; c.depthWrite = false; return c; });
      if (!Array.isArray(obj.material)) { /* keep */ }
    }
  });
}

function startPlacing(id, opts) {
  cancelPlacing();
  const def = catalog.get(id); if (!def) return;
  const cur = ctx.getCurrent(); if (!cur) return;
  const ghost = catalog.build(id, opts);
  ghostify(ghost);
  cur.root.add(ghost);
  placing = { id, ghost, def, opts };
  ctx.canvas.style.cursor = 'copy';
  ctx.say('Place it', `Move your mouse to position the <b>${def.name}</b>, then click to set it down. Press <b>Esc</b> to cancel. It's ${ctx.guideWord()}.`);
  ctx.sound('squeak');
  if (panel) panel.classList.add('placing');
}

function snapTo(cur, x, z) {
  const def = placing.def;
  const b = cur.bounds || [-4.4, 4.4, -2.8, 2.6];
  const out = { x: THREE.MathUtils.clamp(x, b[0], b[1]), y: 0, z: THREE.MathUtils.clamp(z, b[2], b[3]), ry: placing.ghost.rotation.y };
  if (def.snap === 'wall' || def.snap === 'ceiling') {
    if (def.snap === 'ceiling') { out.y = (cur.spec?.size?.h || 4.4) - 0.05; return out; }
    // nearest of the 4 walls
    const [x0, x1, z0, z1] = b;
    const dl = out.x - x0, dr = x1 - out.x, db = out.z - z0, df = z1 - out.z;
    const m = Math.min(dl, dr, db, df);
    if (m === db) { out.z = z0 + 0.06; out.ry = 0; }
    else if (m === df) { out.z = z1 - 0.06; out.ry = Math.PI; }
    else if (m === dl) { out.x = x0 + 0.06; out.ry = Math.PI / 2; }
    else { out.x = x1 - 0.06; out.ry = -Math.PI / 2; }
    out.y = def.mountY ?? 0;
  }
  return out;
}

export function handlePointerMove(clientX, clientY) {
  if (!placing) return;
  const cur = ctx.getCurrent(); if (!cur) return;
  mouse.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, ctx.camera);
  if (!ray.ray.intersectPlane(groundPlane, hitPt)) return;
  const s = snapTo(cur, hitPt.x - cur.x, hitPt.z);
  placing.ghost.position.set(s.x, s.y, s.z);
  placing.ghost.rotation.y = s.ry;
}

export function rotatePlacing() { if (placing) placing.ghost.rotation.y += Math.PI / 8; }

export function handleClick() {
  if (!placing) return false;
  const cur = ctx.getCurrent();
  const g = placing.ghost;
  // placed items INHERIT the zone style (rec.style=null) so a room-restyle recolours them too;
  // a per-object override is only set later via openObjectStyle → reskinItem.
  const rec = { x: g.position.x, y: g.position.y, z: g.position.z, ry: g.rotation.y,
    color: placing.opts.color ?? undefined, variant: placing.opts.variant ?? 0, style: placing.opts.overrideStyle ?? null };
  cur.root.remove(g); g.traverse(o => o.geometry?.dispose?.());
  const obj = ctx.zoneApi.placeItem(cur.id, placing.id, rec);
  ctx.sound('pop');
  ctx.say('There we go', `The <b>${placing.def.name}</b> is in place. Keep decorating, or press <b>Esc</b>.`);
  const id = placing.id, opts = placing.opts;
  placing = null;
  ctx.canvas.style.cursor = '';
  if (panel) panel.classList.remove('placing');
  ctx.refreshLabels?.();
  // stay in placing-flow for the same item? no — single drop. (rapid re-place via panel click)
  return true;
}

export function cancelPlacing() {
  if (!placing) return;
  const cur = ctx.getCurrent();
  cur?.root.remove(placing.ghost);
  placing.ghost.traverse(o => o.geometry?.dispose?.());
  placing = null;
  ctx.canvas.style.cursor = '';
  if (panel) panel.classList.remove('placing');
}

// ════════════════════ theme picker ════════════════════
export function openThemePicker() {
  closeDialogs();
  const cur = ctx.getCurrent();
  const curStyle = cur?.style || 'bob';
  const canRoom = !!cur?.isData;   // legacy rooms keep their signature look
  const d = document.createElement('div');
  d.className = 'dialog-scrim';
  d.innerHTML = `<div class="dialog dz-theme">
    <h3>Restyle</h3>
    <p style="font-size:12.5px;margin:2px 0 10px">Pick a look. Apply it to ${canRoom ? 'this room' : 'the whole house'} or to every restyleable zone. The default is <b>Bob 1995</b>.</p>
    <div class="dz-themes">
      ${STYLE_ORDER.map(s => { const st = STYLES[s]; return `<button class="dz-theme-card ${s === curStyle ? 'on' : ''}" data-s="${s}">
        <span class="dz-sw">${st.swatch.map(c => `<i style="background:${hex(c)}"></i>`).join('')}</span>
        <span class="dz-tn">${st.label}</span></button>`; }).join('')}
    </div>
    <div class="btn-row">
      ${canRoom ? '<button class="bob-btn" data-scope="room">Apply to this room</button>' : ''}
      <button class="bob-btn" data-scope="house">Apply to whole house</button>
      <button class="bob-btn no" data-scope="cancel">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(d);
  let pick = curStyle;
  d.querySelector('.dz-themes').addEventListener('click', (e) => {
    const c = e.target.closest('[data-s]'); if (!c) return;
    pick = c.dataset.s;
    d.querySelectorAll('.dz-theme-card').forEach(x => x.classList.toggle('on', x === c));
  });
  d.addEventListener('click', (e) => {
    const scope = e.target.closest('[data-scope]')?.dataset.scope;
    if (!scope) { if (e.target === d) d.remove(); return; }
    if (scope === 'cancel') { d.remove(); return; }
    d.remove();
    ctx.sound('ding');
    if (scope === 'room' && cur?.isData) ctx.zoneApi.setZoneStyle(cur.id, pick);
    else ctx.zoneApi.setHouseStyle(pick);
    thumbCache.clear();
    ctx.say('Restyled!', `${scope === 'room' ? 'This room' : 'The whole house'} is now <b>${STYLES[pick].label}</b>. ${cur && !cur.isData ? "(The four original rooms keep their classic look.) " : ''}Very ${ctx.guideWord()}.`);
    if (panel) { closeCatalog(); }
  });
}

// ════════════════════ per-object recolor / restyle ════════════════════
export function openObjectStyle(obj) {
  if (!obj?.userData.placedUid) {
    ctx.say('Original furniture', "This is one of the house's classic pieces — move, resize or copy it, or place a fresh catalogue item to recolour.");
    return;
  }
  closeDialogs();
  const op = obj.userData.catalogOpts || {};
  const swatches = [0xc85030, 0xd97e2f, 0xe0b030, 0x3f9a5c, 0x3fb0c0, 0x2634a8, 0x7a4ac0, 0xd838a0, 0x5b6bb0, 0x8a5a20, 0xf2ddb8, 0x2a2622];
  const d = document.createElement('div');
  d.className = 'dialog-scrim';
  d.innerHTML = `<div class="dialog">
    <h3>Change the ${obj.userData.movable}</h3>
    <p style="font-size:12.5px;margin:2px 0 8px">Pick a colour, or restyle it to match another look.</p>
    <div class="dz-swatches">${swatches.map(c => `<button class="dz-swatch" data-col="${c}" style="background:${hex(c)}"></button>`).join('')}
      <button class="dz-swatch dz-reset" data-col="reset" title="Style default">↺</button></div>
    <div class="dz-obj-styles">${STYLE_ORDER.map(s => `<button class="opt2 ${(op.style || 'bob') === s ? 'on' : ''}" data-os="${s}">${STYLES[s].label}</button>`).join('')}</div>
    <div class="btn-row"><button class="bob-btn no">Done</button></div>
  </div>`;
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    const col = e.target.closest('[data-col]')?.dataset.col;
    const os = e.target.closest('[data-os]')?.dataset.os;
    if (col != null) {
      const patch = col === 'reset' ? { color: null } : { color: parseInt(col, 10) };
      const fresh = ctx.zoneApi.reskinItem(obj, patch); if (fresh) { fresh.userData.movable = obj.userData.movable; ctx.onReskin?.(obj, fresh); obj = fresh; }
      ctx.sound('pop');
    } else if (os) {
      const fresh = ctx.zoneApi.reskinItem(obj, { style: os }); if (fresh) { fresh.userData.movable = obj.userData.movable; ctx.onReskin?.(obj, fresh); obj = fresh; }
      d.querySelectorAll('[data-os]').forEach(x => x.classList.toggle('on', x.dataset.os === os));
      ctx.sound('pop');
    } else if (e.target.closest('.bob-btn') || e.target === d) d.remove();
  });
}

function closeDialogs() { document.querySelectorAll('.dialog-scrim').forEach(x => x.remove()); }
