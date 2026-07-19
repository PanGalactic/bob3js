// portrait.js — a small live 3D render of a guide character, for mounting inside
// the 2D app windows. This is how the Checkbook's ledger-guide and GeoSafari's
// Hank appear: real three.js characters, not flat pictures.
import * as THREE from 'three';
import { BUILDERS } from './guides.js';

export function makeGuidePortrait(id, size = 190) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(size, Math.round(size * 1.2), false);
  canvas.style.width = size + 'px';
  canvas.style.height = Math.round(size * 1.2) + 'px';

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, size / (size * 1.2), 0.1, 20);
  cam.position.set(0, 0.9, 3.1);
  cam.lookAt(0, 0.72, 0);

  scene.add(new THREE.AmbientLight(0xfff2e0, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2, 3.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a0, 0.7);
  rim.position.set(-2, 1, -1.5); scene.add(rim);

  let critter = null;
  function setGuide(gid) {
    if (critter) scene.remove(critter);
    critter = (BUILDERS[gid] || BUILDERS.rover)();
    scene.add(critter);
  }
  setGuide(id);

  const clock = new THREE.Clock();
  let raf = 0, running = true;
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const t = clock.elapsedTime;
    if (critter) {
      critter.userData.animate?.(t);
      critter.rotation.y = Math.sin(t * 0.5) * 0.25;
    }
    renderer.render(scene, cam);
  }
  loop();

  canvas.__setGuide = setGuide;
  canvas.__dispose = () => { running = false; cancelAnimationFrame(raf); renderer.dispose(); };
  return canvas;
}
