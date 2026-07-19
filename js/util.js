// util.js — shared helpers: materials, primitives, canvas textures, tweens
import * as THREE from 'three';

const matCache = new Map();

export function mat(color, opts = {}) {
  // textured materials must never be cache-shared (canvas textures stringify identically)
  if (opts.map) {
    return new THREE.MeshStandardMaterial({
      color, roughness: opts.roughness ?? 0.86, metalness: opts.metalness ?? 0.02,
      emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.side ?? THREE.FrontSide, map: opts.map,
    });
  }
  const key = JSON.stringify([color, opts]);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0.02,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    ...(opts.map ? { map: opts.map } : {}),
  });
  matCache.set(key, m);
  return m;
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  return m;
}

export function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 24, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  return m;
}

export function sph(r, material, x = 0, y = 0, z = 0, ws = 20, hs = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function plane(w, h, material, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.receiveShadow = opts.receive ?? true;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  return m;
}

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

// ── canvas texture helper ──────────────────────────────────────
export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  return t;
}

// sunset harbor — inspired by the original family-room left window
export function sunsetTexture() {
  return canvasTexture(512, 640, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, '#ffd873'); sky.addColorStop(0.45, '#ff9a3d');
    sky.addColorStop(0.78, '#f2603a'); sky.addColorStop(1, '#a03a6e');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 420);
    // sun
    const sun = g.createRadialGradient(256, 330, 10, 256, 330, 90);
    sun.addColorStop(0, '#fff8d0'); sun.addColorStop(0.6, '#ffe08a'); sun.addColorStop(1, 'rgba(255,210,120,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(256, 330, 90, 0, 7); g.fill();
    g.fillStyle = '#fff3bd'; g.beginPath(); g.arc(256, 330, 44, 0, 7); g.fill();
    // sea
    const sea = g.createLinearGradient(0, 420, 0, 640);
    sea.addColorStop(0, '#c25078'); sea.addColorStop(0.5, '#5c2e6e'); sea.addColorStop(1, '#341a52');
    g.fillStyle = sea; g.fillRect(0, 420, 512, 220);
    // sun glitter path
    g.fillStyle = 'rgba(255,224,150,0.75)';
    for (let y = 424; y < 620; y += 10) {
      const w = 60 * (1 - (y - 424) / 240) + 14;
      g.fillRect(256 - w / 2 + (Math.sin(y) * 8), y, w, 4);
    }
    // sailboat silhouettes
    g.fillStyle = '#2c1440';
    const boat = (x, y, s) => {
      g.beginPath(); g.moveTo(x - 22 * s, y); g.lineTo(x + 22 * s, y); g.lineTo(x + 14 * s, y + 9 * s); g.lineTo(x - 14 * s, y + 9 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x, y - 2 * s); g.lineTo(x, y - 40 * s); g.lineTo(x + 18 * s, y - 6 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - 3 * s, y - 4 * s); g.lineTo(x - 16 * s, y - 30 * s); g.lineTo(x - 3 * s, y - 30 * s); g.closePath(); g.fill();
    };
    boat(150, 500, 1.1); boat(360, 468, 0.7); boat(430, 540, 0.9);
    // gulls
    g.strokeStyle = '#3a1c50'; g.lineWidth = 3; g.lineCap = 'round';
    const gull = (x, y) => { g.beginPath(); g.arc(x - 7, y, 8, 3.4, 5.6); g.stroke(); g.beginPath(); g.arc(x + 7, y, 8, 3.8, 6.0); g.stroke(); };
    gull(120, 180); gull(390, 140); gull(330, 220);
  });
}

// night city — inspired by the original right window / kitchen window
export function cityTexture() {
  return canvasTexture(512, 640, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#161042'); sky.addColorStop(0.6, '#26175c'); sky.addColorStop(1, '#3a1a5e');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 640);
    // stars
    g.fillStyle = '#e8e4ff';
    for (let i = 0; i < 90; i++) g.fillRect((i * 137.5) % 512, ((i * 89.7) % 260), 2, 2);
    // moon
    g.fillStyle = '#f5f0d8'; g.beginPath(); g.arc(400, 110, 34, 0, 7); g.fill();
    g.fillStyle = '#26175c'; g.beginPath(); g.arc(414, 100, 30, 0, 7); g.fill();
    // buildings
    const cols = ['#0c0826', '#140c34', '#1c1042'];
    let x = 0; let i = 0;
    while (x < 512) {
      const w = 46 + ((i * 37) % 60);
      const h = 200 + ((i * 83) % 300);
      g.fillStyle = cols[i % 3];
      g.fillRect(x, 640 - h, w, h);
      // lit windows
      for (let wy = 640 - h + 14; wy < 620; wy += 26) {
        for (let wx = x + 8; wx < x + w - 10; wx += 20) {
          if (((wx * 7 + wy * 13) % 17) < 7) {
            g.fillStyle = ((wx + wy) % 5 === 0) ? '#ffd66e' : '#ffb84e';
            g.fillRect(wx, wy, 9, 12);
          }
        }
      }
      x += w + 6; i++;
    }
  });
}

// wall calendar page (live date) — like the Jan 2 page over the mantel
export function calendarPageTexture() {
  const now = new Date();
  const month = now.toLocaleString('en', { month: 'short' });
  const day = now.getDate();
  return canvasTexture(256, 320, (g) => {
    g.fillStyle = '#fdfbf0'; g.fillRect(0, 0, 256, 320);
    g.strokeStyle = '#20202a'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 314);
    g.fillStyle = '#3a5fc8'; g.fillRect(6, 6, 244, 40);
    g.fillStyle = '#b01212';
    g.font = 'bold 64px Georgia'; g.textAlign = 'center';
    g.fillText(`${month} ${day}`, 128, 130);
    // mini grid
    g.fillStyle = '#20202a';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      const n = r * 7 + c - 2;
      if (n < 1 || n > 31) continue;
      g.font = '16px Verdana'; g.fillStyle = n === day ? '#b01212' : '#20202a';
      g.fillText(String(n), 34 + c * 32, 190 + r * 26);
    }
    // spiral holes
    g.fillStyle = '#888';
    for (let x = 24; x < 256; x += 36) { g.beginPath(); g.arc(x, 14, 5, 0, 7); g.fill(); }
  });
}

// plaid fabric — the family-room sofa
export function plaidTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#5b6bb0'; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.55;
    g.fillStyle = '#7a4a9c';
    for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 26, 256);
    g.fillStyle = '#3a4a8c';
    for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 26);
    g.globalAlpha = 0.8; g.fillStyle = '#d8d4c0';
    for (let x = 52; x < 256; x += 64) g.fillRect(x, 0, 5, 256);
    for (let y = 52; y < 256; y += 64) g.fillRect(0, y, 256, 5);
    g.globalAlpha = 1;
  }, { repeat: [2, 2] });
}

// book spines strip for shelves
export function bookRowTexture(seed = 1) {
  return canvasTexture(512, 128, (g) => {
    g.fillStyle = '#4a2c14'; g.fillRect(0, 0, 512, 128);
    const cols = ['#d84a3a', '#e0662c', '#c85030', '#b83030', '#d86840', '#a83828', '#5a7ac0', '#3f9a5c', '#d8a838'];
    let x = 4;
    let i = seed;
    while (x < 500) {
      const w = 18 + ((i * 29) % 22);
      const h = 96 + ((i * 17) % 26);
      g.fillStyle = cols[i % cols.length];
      g.fillRect(x, 124 - h, w, h);
      g.fillStyle = '#e8b23a';
      g.fillRect(x + 3, 124 - h + 10, w - 6, 4);
      g.fillRect(x + 3, 112, w - 6, 3);
      x += w + 3; i++;
    }
  });
}

export function checkMeadowTexture() {
  return canvasTexture(512, 256, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 140);
    sky.addColorStop(0, '#bfe0f5'); sky.addColorStop(1, '#e8f4fb');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 140);
    g.fillStyle = '#fff'; [[80, 50, 30], [200, 36, 24], [380, 60, 36]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 6, r * .7, 0, 7); g.arc(x - r, y + 8, r * .6, 0, 7); g.fill();
    });
    const grass = g.createLinearGradient(0, 130, 0, 256);
    grass.addColorStop(0, '#bfe0a0'); grass.addColorStop(1, '#7fbf70');
    g.fillStyle = grass; g.fillRect(0, 130, 512, 126);
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      const x = (i * 127.3) % 512, y = 150 + ((i * 61.7) % 96);
      for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + 5 * Math.cos(p * 1.26), y + 5 * Math.sin(p * 1.26), 3.4, 0, 7); g.fill(); }
      g.fillStyle = '#ffd41e'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); g.fillStyle = '#fff';
    }
  });
}

// ── tiny tween engine ───────────────────────────────────────────
const tweens = [];
export function tween(from, to, dur, onUpdate, ease = easeInOut, onDone) {
  tweens.push({ t: 0, from, to, dur, onUpdate, ease, onDone });
}
export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.onUpdate(tw.from + (tw.to - tw.from) * tw.ease(k));
    if (k >= 1) { tweens.splice(i, 1); tw.onDone && tw.onDone(); }
  }
}
export const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
export const easeOut = (t) => 1 - (1 - t) ** 3;
