// guides.js — the twelve Friends of Bob, rebuilt as low-poly 3D critters.
// Roster and personalities from the original v1.00: Blythe, Chaos, Hopper, Java,
// Orby, Rover, Ruby, Scuzz, Shelly, Digger, Speaker, and the Invisible guide.
// Each guide swaps its own descriptive word into dialogs, like the original
// ("scrumptious" is genuinely Rover's word).
import * as THREE from 'three';
import { mat, box, cyl, sph, group, canvasTexture } from './util.js';

// Each guide has a personality, a signature word it slots into dialogs (just like
// the original), and a specialty — the programs it knows best and will offer to open.
export const GUIDES = {
  rover:   { name: 'Rover',   emoji: '🐕', word: 'scrumptious', species: 'the family dog',
             specialty: 'a bit of everything', fav: ['letter', 'calendar', 'checkbook'],
             hello: "It's me, Rover! I know my way around the whole house. What shall we do?" },
  blythe:  { name: 'Blythe',  emoji: '🐞', word: 'delightful', species: 'a well-read ladybug',
             specialty: 'letters and contacts', fav: ['letter', 'address'],
             hello: 'Blythe here. I keep your words and your friends in delightful order.' },
  chaos:   { name: 'Chaos',   emoji: '🐈', word: 'chaotic', species: 'a fluffy cat',
             specialty: 'the household', fav: ['household', 'calendar'],
             hello: 'Chaos, at your service. I knock things off shelves, then help you organise them.' },
  hopper:  { name: 'Hopper',  emoji: '🐇', word: 'bouncy', species: 'a blue rabbit',
             specialty: 'the calendar', fav: ['calendar', 'household'],
             hello: "Hopper here! I hop from date to date — the calendar is my burrow!" },
  java:    { name: 'Java',    emoji: '🐉', word: 'toasty', species: 'a small dragon',
             specialty: 'money (dragons love a hoard)', fav: ['financial', 'checkbook'],
             hello: 'Java the dragon. I guard the gold — let me show you the Financial Guide.' },
  orby:    { name: 'Orby',    emoji: '🌍', word: 'worldly', species: 'a small planet',
             specialty: 'geography', fav: ['geosafari', 'calendar'],
             hello: 'Orby here — I bring a worldly perspective. Fancy a spin of GeoSafari?' },
  ruby:    { name: 'Ruby',    emoji: '🦜', word: 'squawking', species: 'a parrot',
             specialty: 'messages', fav: ['email', 'letter'],
             hello: "RAWK! Ruby's the name, repeating messages is my game! Check your mail! RAWK!" },
  scuzz:   { name: 'Scuzz',   emoji: '🐀', word: 'grungy', species: 'a rat with attitude',
             specialty: 'the checkbook (follow the money)', fav: ['checkbook', 'financial'],
             hello: "Scuzz here. I live in the wall and I count every penny. Let's balance that checkbook." },
  shelly:  { name: 'Shelly',  emoji: '🐢', word: 'steady', species: 'a travelling turtle',
             specialty: 'trips and geography', fav: ['geosafari', 'address'],
             hello: 'Shelly here. Slow and steady, and very well travelled. GeoSafari is my favourite.' },
  digger:  { name: 'Digger',  emoji: '🪱', word: 'earthy', species: 'an earthworm',
             specialty: 'home & garden upkeep', fav: ['household', 'calendar'],
             hello: "Digger, reporting from ground level. Home maintenance is where I dig in." },
  speaker: { name: 'Speaker', emoji: '🔊', word: 'plain', species: 'just a speaker',
             specialty: 'the clock, no nonsense', fav: ['clock', 'checkbook'],
             hello: 'SPEAKER. NO NONSENSE. I KEEP TIME. THE CLOCK IS THROUGH HERE.' },
  invisible: { name: 'The Invisible Guide', emoji: '👻', word: 'unseen', species: '[unavailable for comment — ed.]',
             specialty: 'being unseen', fav: ['letter'],
             hello: '[This balloon appears to be talking by itself. It gestures, unseen, toward the writing desk.]' },
};

// dedicated in-app guides, exactly like the originals: the Checkbook had its own
// ledger-faced helper, and GeoSafari had Hank the elephant.
export const APP_GUIDES = {
  checkbook: 'ledger',
  geosafari: 'hank',
};

const eyeM = () => mat(0x181410, { roughness: 0.35 });
const whiteM = () => mat(0xf5f2e8, { roughness: 0.5 });

function addEyes(head, r, y, z, spread = 0.4) {
  const s = r * 0.22;
  [-1, 1].forEach(sd => {
    head.add(sph(s * 1.5, whiteM(), sd * r * spread, y, z, 10, 8));
    head.add(sph(s, eyeM(), sd * r * spread, y, z + s * 1.1, 8, 6));
  });
}

// ── individual critter builders (all sit on a pedestal, ~1u tall) ──

function buildRover() {
  const g = new THREE.Group();
  const fur = mat(0xf2c422, { roughness: 0.8 });
  const earM = mat(0xc4901a, { roughness: 0.85 });
  // seated body: a flatter, tucked rump at the base tapering up to a taller chest
  const rump = sph(0.27, fur, 0, 0.24, -0.12, 18, 14);
  rump.scale.set(0.95, 0.78, 1.0); g.add(rump);
  const torso = sph(0.22, fur, 0, 0.5, 0.08, 16, 14);
  torso.scale.set(0.9, 1.35, 0.98); g.add(torso);      // upright chest
  const chest = sph(0.17, fur, 0, 0.42, 0.2, 14, 12);
  chest.scale.set(0.95, 1.1, 0.95); g.add(chest);
  // front legs down to paws
  [-0.11, 0.11].forEach(x => {
    g.add(cyl(0.05, 0.06, 0.42, fur, x, 0.24, 0.24, 10));
    g.add(sph(0.07, fur, x, 0.05, 0.29, 8, 6));
  });
  // back legs: haunches bulging at the sides of the rump, paws poking forward beside the front ones
  [-1, 1].forEach(sd => {
    const haunch = sph(0.15, fur, sd * 0.2, 0.2, -0.06, 12, 10);
    haunch.scale.set(0.75, 1.0, 1.25); g.add(haunch);
    const paw = sph(0.07, fur, sd * 0.19, 0.05, 0.14, 8, 6);
    paw.scale.set(1, 0.75, 1.5); g.add(paw);
  });
  // head
  const head = group(g, 0, 0.95, 0.16);
  head.add(sph(0.24, fur, 0, 0, 0, 18, 14));
  const muzzle = sph(0.13, fur, 0, -0.07, 0.18, 12, 10);
  muzzle.scale.set(1.15, 0.8, 1); head.add(muzzle);
  head.add(sph(0.055, eyeM(), 0, -0.03, 0.3, 8, 6)); // nose
  addEyes(head, 0.24, 0.08, 0.18, 0.38);
  // floppy ears (animated)
  const ears = [];
  [-1, 1].forEach(sd => {
    const e = group(head, sd * 0.2, 0.16, 0);
    const flap = box(0.1, 0.3, 0.05, earM, 0, -0.12, 0);
    flap.rotation.z = sd * 0.35;
    e.add(flap); ears.push(e);
  });
  // collar + tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 20), mat(0xc41c1c, { roughness: 0.5 }));
  collar.position.set(0, 0.72, 0.14); collar.rotation.x = Math.PI / 2.3;
  g.add(collar);
  g.add(sph(0.05, mat(0xe8b23a, { metalness: 0.8, roughness: 0.25 }), 0, 0.66, 0.3, 8, 8));
  // tail (animated)
  const tail = group(g, 0, 0.34, -0.36);
  tail.add(cyl(0.03, 0.05, 0.34, fur, 0, 0.14, 0, 8, { rx: -0.7 }));
  g.userData.animate = (t) => {
    tail.rotation.z = Math.sin(t * 7) * 0.5;
    ears.forEach((e, i) => { e.rotation.z = Math.sin(t * 3 + i * 2) * 0.12; });
    head.rotation.z = Math.sin(t * 0.8) * 0.06;
    head.position.y = 0.95 + Math.sin(t * 2.2) * 0.015;
  };
  return g;
}

function buildChaos() {
  const g = new THREE.Group();
  const fur = mat(0xe8a040, { roughness: 0.95 });
  const body = sph(0.32, fur, 0, 0.36, 0, 16, 12); body.scale.y = 1.15; g.add(body);
  // fluff
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(sph(0.11, fur, Math.cos(a) * 0.26, 0.36 + Math.sin(a * 2) * 0.14, Math.sin(a) * 0.2, 8, 6));
  }
  const head = group(g, 0, 0.82, 0.1);
  head.add(sph(0.22, fur, 0, 0, 0, 16, 12));
  addEyes(head, 0.22, 0.05, 0.17);
  [-1, 1].forEach(sd => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), fur);
    ear.position.set(sd * 0.13, 0.2, 0); ear.rotation.z = sd * -0.3; ear.castShadow = true;
    head.add(ear);
  });
  const tail = group(g, 0.18, 0.3, -0.28);
  tail.add(cyl(0.045, 0.06, 0.5, fur, 0, 0.22, 0, 8, { rx: -0.5, rz: 0.3 }));
  g.userData.animate = (t) => {
    tail.rotation.x = Math.sin(t * 1.7) * 0.3;
    head.rotation.z = Math.sin(t * 0.5) * 0.1;
  };
  return g;
}

function buildHopper() {
  const g = new THREE.Group();
  const fur = mat(0x8ac8e8, { roughness: 0.9 });
  const body = sph(0.28, fur, 0, 0.34, 0, 16, 12); body.scale.y = 1.2; g.add(body);
  g.add(sph(0.09, whiteM(), 0, 0.2, -0.26, 8, 6)); // tail puff
  const head = group(g, 0, 0.78, 0.06);
  head.add(sph(0.2, fur, 0, 0, 0, 16, 12));
  addEyes(head, 0.2, 0.05, 0.15);
  head.add(sph(0.04, mat(0xe87898), 0, -0.04, 0.19, 8, 6));
  const ears = [];
  [-1, 1].forEach(sd => {
    const e = group(head, sd * 0.09, 0.16, 0);
    const lobe = sph(0.07, fur, 0, 0.2, 0, 8, 10); lobe.scale.set(0.6, 2.6, 0.5);
    e.add(lobe); e.rotation.z = sd * 0.18; ears.push(e);
  });
  [-0.1, 0.1].forEach(x => g.add(sph(0.1, fur, x, 0.08, 0.16, 8, 6)));
  let hop = 0;
  g.userData.animate = (t) => {
    hop = Math.max(0, Math.sin(t * 3.2));
    g.position.y = hop * 0.09;
    ears.forEach((e, i) => e.rotation.x = -hop * 0.35 + Math.sin(t * 2 + i) * 0.06);
  };
  return g;
}

function buildJava() {
  const g = new THREE.Group();
  const scale = mat(0x3fae62, { roughness: 0.8 });
  const belly = mat(0xf2d24e, { roughness: 0.85 });
  const spine = mat(0x9a4ab0, { roughness: 0.8 });
  const body = sph(0.3, scale, 0, 0.4, 0, 16, 12); body.scale.set(0.9, 1.3, 0.9); g.add(body);
  g.add(sph(0.2, belly, 0, 0.36, 0.14, 12, 10));
  const head = group(g, 0, 0.92, 0.08);
  head.add(sph(0.2, scale, 0, 0, 0, 16, 12));
  const snout = sph(0.12, scale, 0, -0.04, 0.17, 10, 8); snout.scale.set(0.9, 0.7, 1.3); head.add(snout);
  addEyes(head, 0.2, 0.08, 0.14);
  // spikes
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), spine);
    s.position.set(0, 0.95 - i * 0.17, -0.16 - i * 0.045);
    s.rotation.x = -0.5; s.castShadow = true;
    g.add(s);
  }
  const tail = group(g, 0, 0.2, -0.3);
  tail.add(cyl(0.03, 0.09, 0.5, scale, 0, 0.1, -0.12, 8, { rx: 1.2 }));
  // little smoke puff (breath)
  g.userData.animate = (t) => {
    tail.rotation.y = Math.sin(t * 2.1) * 0.4;
    head.rotation.x = Math.sin(t * 1.3) * 0.08;
  };
  return g;
}

function buildOrby() {
  const g = new THREE.Group();
  const sea = mat(0x2f6ea8, { roughness: 0.6 });
  const globe = sph(0.42, sea, 0, 0.55, 0, 24, 18);
  g.add(globe);
  const land = mat(0x3f9a4c, { roughness: 0.7 });
  [[0.2, 0.75, 0.28], [-0.3, 0.62, 0.22], [0.05, 0.32, -0.35], [-0.2, 0.7, -0.25], [0.33, 0.5, -0.1]].forEach(([x, y, z]) => {
    const c = sph(0.14, land, x, y, z, 8, 6); c.scale.set(1, 0.75, 0.5);
    c.lookAt(0, 0.55, 0); g.add(c);
  });
  addEyes(globe, 0.42, 0.12, 0.36, 0.3);
  const smileM = mat(0x181410);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 14, Math.PI * 0.8), smileM);
  smile.position.set(0, -0.06, 0.4); smile.rotation.z = Math.PI + 0.35;
  globe.add(smile);
  g.userData.animate = (t) => {
    g.rotation.y = Math.sin(t * 0.7) * 0.5;
    g.position.y = Math.sin(t * 1.4) * 0.04;
  };
  return g;
}

function buildRuby() {
  const g = new THREE.Group();
  const feathers = mat(0x3f9a4c, { roughness: 0.85 });
  const wing = mat(0xd82c2c, { roughness: 0.85 });
  const body = sph(0.26, feathers, 0, 0.42, 0, 14, 12); body.scale.y = 1.35; g.add(body);
  const head = group(g, 0, 0.85, 0.05);
  head.add(sph(0.18, feathers, 0, 0, 0, 14, 12));
  addEyes(head, 0.18, 0.06, 0.13, 0.45);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), mat(0xf2c422));
  beak.position.set(0, -0.02, 0.2); beak.rotation.x = Math.PI / 2; beak.castShadow = true;
  head.add(beak);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), wing);
  crest.position.set(0, 0.2, 0); crest.rotation.x = -0.4;
  head.add(crest);
  const wings = [];
  [-1, 1].forEach(sd => {
    const w = group(g, sd * 0.22, 0.5, 0);
    const f = sph(0.14, wing, 0, -0.08, 0, 8, 6); f.scale.set(0.5, 1.5, 0.9);
    w.add(f); w.rotation.z = sd * 0.5; wings.push(w);
  });
  [-0.07, 0.07].forEach(x => g.add(cyl(0.02, 0.02, 0.16, mat(0xf2c422), x, 0.1, 0.04, 6)));
  g.userData.animate = (t) => {
    wings.forEach((w, i) => { const s = i ? 1 : -1; w.rotation.z = s * (0.5 + Math.max(0, Math.sin(t * 5)) * 0.5); });
    head.rotation.y = Math.sin(t * 0.9) * 0.5;
  };
  return g;
}

function buildScuzz() {
  const g = new THREE.Group();
  const fur = mat(0x9a9aa4, { roughness: 0.95 });
  const body = sph(0.24, fur, 0, 0.32, 0, 14, 12); body.scale.set(0.85, 1.35, 0.85); g.add(body);
  g.add(sph(0.16, mat(0xd8d0e0), 0, 0.3, 0.12, 10, 8));
  const head = group(g, 0, 0.72, 0.06);
  head.add(sph(0.16, fur, 0, 0, 0, 14, 12));
  const snout = sph(0.09, fur, 0, -0.03, 0.14, 8, 6); snout.scale.set(0.8, 0.7, 1.5); head.add(snout);
  head.add(sph(0.035, mat(0xe87898), 0, -0.04, 0.25, 6, 6));
  addEyes(head, 0.16, 0.06, 0.12, 0.5);
  [-1, 1].forEach(sd => {
    const ear = sph(0.08, mat(0xc8a8b8), sd * 0.11, 0.14, 0, 10, 8); ear.scale.z = 0.4;
    head.add(ear);
  });
  // sneakers — Scuzz wears them in the original art
  [-0.09, 0.09].forEach(x => {
    g.add(box(0.11, 0.06, 0.18, mat(0xd82c2c, { roughness: 0.6 }), x, 0.03, 0.08));
    g.add(box(0.11, 0.02, 0.19, whiteM(), x, 0.01, 0.09));
  });
  const tail = group(g, 0, 0.14, -0.2);
  tail.add(cyl(0.015, 0.03, 0.5, mat(0xc8a8b8), 0, 0.05, -0.2, 6, { rx: 1.35 }));
  g.userData.animate = (t) => {
    tail.rotation.y = Math.sin(t * 3.3) * 0.5;
    head.rotation.z = Math.sin(t * 1.1) * 0.1;
  };
  return g;
}

function buildShelly() {
  const g = new THREE.Group();
  const skin = mat(0x6ab04c, { roughness: 0.85 });
  const shell = mat(0x3f7a2c, { roughness: 0.7 });
  const sh = sph(0.3, shell, 0, 0.34, -0.05, 16, 12); sh.scale.set(1, 0.85, 1.1); g.add(sh);
  g.add(sph(0.26, mat(0xd8c060), 0, 0.28, 0.02, 14, 10));
  // shell pattern bumps
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    g.add(sph(0.07, mat(0x2f5c20), Math.cos(a) * 0.2, 0.48 + Math.sin(a) * 0.06, -0.05 + Math.sin(a) * 0.16, 6, 5));
  }
  const head = group(g, 0, 0.6, 0.3);
  head.add(sph(0.13, skin, 0, 0, 0, 12, 10));
  addEyes(head, 0.13, 0.05, 0.1, 0.45);
  // red explorer hat (from the original art)
  head.add(cyl(0.12, 0.14, 0.05, mat(0xd82c2c), 0, 0.11, 0, 12));
  head.add(cyl(0.06, 0.09, 0.08, mat(0xd82c2c), 0, 0.16, 0, 12));
  // legs
  [[-0.2, 0.14], [0.2, 0.14], [-0.2, -0.2], [0.2, -0.2]].forEach(([x, z]) =>
    g.add(sph(0.07, skin, x, 0.08, z, 8, 6)));
  // tiny backpack
  g.add(box(0.16, 0.2, 0.08, mat(0xb96820), 0, 0.42, -0.36));
  g.userData.animate = (t) => {
    head.position.z = 0.3 + Math.sin(t * 0.9) * 0.04;
    head.rotation.y = Math.sin(t * 0.6) * 0.3;
  };
  return g;
}

function buildBlythe() {
  const g = new THREE.Group();
  const shellM = mat(0xf2d24e, { roughness: 0.7 });
  const skin = mat(0x5a7ae0, { roughness: 0.8 });
  const body = sph(0.28, shellM, 0, 0.36, 0, 16, 12); body.scale.set(0.95, 1.1, 0.8); g.add(body);
  // wing casings
  [-1, 1].forEach(sd => {
    const w = sph(0.2, mat(0xd8e8f0, { roughness: 0.4 }), sd * 0.16, 0.42, -0.14, 10, 8);
    w.scale.set(0.5, 1.1, 0.9); w.rotation.z = sd * 0.4;
    g.add(w);
  });
  const head = group(g, 0, 0.78, 0.05);
  head.add(sph(0.17, skin, 0, 0, 0, 14, 12));
  addEyes(head, 0.17, 0.06, 0.13, 0.42);
  // antennae
  [-1, 1].forEach(sd => {
    head.add(cyl(0.012, 0.012, 0.22, skin, sd * 0.07, 0.2, 0, 6, { rz: sd * -0.4 }));
    head.add(sph(0.03, skin, sd * 0.15, 0.3, 0, 6, 6));
  });
  [[-0.14], [0.14]].forEach(([x]) => g.add(sph(0.07, skin, x, 0.08, 0.1, 8, 6)));
  g.userData.animate = (t) => {
    g.position.y = Math.sin(t * 2.6) * 0.03;
    head.rotation.z = Math.sin(t * 1.4) * 0.08;
  };
  return g;
}

function buildDigger() {
  const g = new THREE.Group();
  const skin = mat(0x7ac860, { roughness: 0.85 });
  // grass mound
  const mound = sph(0.34, mat(0x4a8a3c, { roughness: 1 }), 0, 0.02, 0, 14, 10); mound.scale.y = 0.4;
  g.add(mound);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.add(cyl(0.008, 0.02, 0.2 + (i % 3) * 0.08, mat(0x5aa04c), Math.cos(a) * 0.26, 0.16, Math.sin(a) * 0.26, 5, { rz: Math.cos(a) * 0.3 }));
  }
  // worm body: chain of spheres arcing out of the ground
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const s = sph(0.11 - i * 0.008, skin, 0, 0, 0, 10, 8);
    g.add(s); segs.push(s);
  }
  const head = group(g, 0, 0, 0);
  head.add(sph(0.13, skin, 0, 0, 0, 12, 10));
  addEyes(head, 0.13, 0.06, 0.1, 0.42);
  head.add(sph(0.035, mat(0xd85858), 0, -0.05, 0.11, 6, 6));
  g.userData.animate = (t) => {
    for (let i = 0; i < 5; i++) {
      const p = i / 4;
      segs[i].position.set(Math.sin(p * 2.4 + t * 0.8) * 0.12, 0.12 + p * 0.4 + Math.sin(t * 1.6 + p * 3) * 0.03, p * 0.1);
    }
    head.position.set(Math.sin(2.4 + t * 0.8) * 0.12, 0.62 + Math.sin(t * 1.6 + 3) * 0.04, 0.14);
  };
  return g;
}

function buildSpeaker() {
  const g = new THREE.Group();
  const body = box(0.5, 0.7, 0.4, mat(0x1c1c20, { roughness: 0.6 }), 0, 0.36, 0);
  g.add(body);
  g.add(cyl(0.16, 0.16, 0.03, mat(0x0c0c0e), 0, 0.48, 0.2, 20, { rx: Math.PI / 2 }));
  g.add(cyl(0.07, 0.07, 0.03, mat(0x0c0c0e), 0, 0.2, 0.2, 16, { rx: Math.PI / 2 }));
  g.add(cyl(0.1, 0.1, 0.02, mat(0x3c3c44, { metalness: 0.5 }), 0, 0.48, 0.21, 20, { rx: Math.PI / 2 }));
  const led = sph(0.02, mat(0x40ff70, { emissive: 0x30e060, emissiveIntensity: 3 }), 0.18, 0.1, 0.21, 6, 6);
  g.add(led);
  g.userData.animate = (t) => {
    const pump = 1 + Math.max(0, Math.sin(t * 6)) * 0.04;
    body.scale.set(pump, 1, pump);
  };
  return g;
}

function buildInvisible() {
  const g = new THREE.Group();
  // nothing here… except a faint shimmer
  const shimmer = sph(0.3, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.1 }), 0, 0.45, 0, 16, 12);
  g.add(shimmer);
  g.userData.animate = (t) => { shimmer.material.opacity = 0.04 + Math.sin(t * 1.2) * 0.03; };
  return g;
}

// ── Ledger: the Checkbook's own guide (purple notepad face with a pencil) ──
function buildLedger() {
  const g = new THREE.Group();
  const cover = mat(0x7a4aa0, { roughness: 0.6 });
  const paper = mat(0xf5eed8, { roughness: 0.5 });
  // notepad body
  const book = box(0.62, 0.82, 0.14, cover, 0, 0.5, 0);
  g.add(book);
  const face = box(0.5, 0.66, 0.04, paper, 0, 0.52, 0.08);
  g.add(face);
  // ruled lines
  for (let i = 0; i < 3; i++) g.add(box(0.4, 0.012, 0.01, mat(0x8a94b8), 0, 0.34 - i * 0.09, 0.11));
  // spiral top
  for (let i = -2; i <= 2; i++) g.add(cyl(0.02, 0.02, 0.08, mat(0xcfc39a, { metalness: 0.5, roughness: 0.4 }), i * 0.11, 0.86, 0.04, 8, { rx: Math.PI / 2 }));
  // big glasses + eyes
  [-1, 1].forEach(s => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 20), mat(0x2c1040));
    rim.position.set(s * 0.13, 0.6, 0.11); g.add(rim);
    g.add(sph(0.055, whiteM(), s * 0.13, 0.6, 0.1, 10, 8));
    g.add(sph(0.03, eyeM(), s * 0.13, 0.6, 0.14, 8, 6));
  });
  g.add(box(0.06, 0.02, 0.02, mat(0x2c1040), 0, 0.6, 0.12));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 16, Math.PI * 0.8), mat(0x2c1040));
  smile.position.set(0, 0.44, 0.11); smile.rotation.z = Math.PI + 0.35; g.add(smile);
  // pencil arm
  const arm = group(g, 0.32, 0.5, 0.08);
  arm.rotation.z = -0.5;
  arm.add(cyl(0.028, 0.028, 0.34, mat(0xf2c422), 0, 0.14, 0, 8));
  arm.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), mat(0xe8a0a0)).translateY(0.34));
  g.userData.animate = (t) => {
    arm.rotation.z = -0.5 + Math.sin(t * 5) * 0.35;   // scribbling
    g.rotation.z = Math.sin(t * 1.3) * 0.05;
  };
  return g;
}

// ── Hank: GeoSafari's own guide, a friendly elephant explorer ──
function buildHank() {
  const g = new THREE.Group();
  const hide = mat(0x9a6fb0, { roughness: 0.85 });
  const body = sph(0.34, hide, 0, 0.42, 0, 16, 12); body.scale.set(1, 1.05, 0.9); g.add(body);
  // legs
  [[-0.16, 0.1], [0.16, 0.1], [-0.16, -0.14], [0.16, -0.14]].forEach(([x, z]) =>
    g.add(cyl(0.09, 0.1, 0.24, hide, x, 0.12, z, 10)));
  // head
  const head = group(g, 0, 0.78, 0.16);
  head.add(sph(0.26, hide, 0, 0, 0, 16, 12));
  // ears
  [-1, 1].forEach(s => {
    const ear = sph(0.16, hide, s * 0.26, 0.02, -0.02, 10, 8); ear.scale.set(0.5, 1, 0.7);
    head.add(ear);
  });
  addEyes(head, 0.26, 0.06, 0.2, 0.32);
  // trunk (segmented, curls)
  const trunk = group(head, 0, -0.12, 0.18);
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const s = cyl(0.09 - i * 0.012, 0.08 - i * 0.012, 0.11, hide, 0, -i * 0.1, 0, 10);
    trunk.add(s); segs.push(s);
  }
  // explorer hat (safari pith helmet)
  head.add(cyl(0.28, 0.3, 0.05, mat(0xd8c88a), 0, 0.22, 0, 16));
  head.add(sph(0.2, mat(0xe8dcae), 0, 0.28, 0, 14, 8));
  // little tusks
  [-1, 1].forEach(s => head.add(cyl(0.018, 0.03, 0.14, mat(0xf5f0e0), s * 0.1, -0.14, 0.2, 6, { rx: 0.6, rz: s * 0.2 })));
  g.userData.animate = (t) => {
    segs.forEach((s, i) => { s.rotation.x = Math.sin(t * 2 + i * 0.6) * 0.25; s.position.z = i * 0.02; });
    head.rotation.y = Math.sin(t * 0.7) * 0.25;
  };
  return g;
}

const BUILDERS = {
  rover: buildRover, chaos: buildChaos, hopper: buildHopper, java: buildJava,
  orby: buildOrby, ruby: buildRuby, scuzz: buildScuzz, shelly: buildShelly,
  blythe: buildBlythe, digger: buildDigger, speaker: buildSpeaker, invisible: buildInvisible,
  ledger: buildLedger, hank: buildHank,
};
export { BUILDERS };

// ── idle ACTIVITIES ────────────────────────────────────────────
// In the original, each guide (bar Speaker and the Invisible Guide) performs little
// activities at random when left alone: Rover finds a yellow smiley ball and plays with
// it, Scuzz rummages through a garbage can, and so on.
function smileyBallTexture() {
  return canvasTexture(128, 128, (g) => {
    g.fillStyle = '#ffd41e'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.ellipse(46, 50, 6, 9, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(82, 50, 6, 9, 0, 0, 7); g.fill();
    g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#1a1a1a';
    g.beginPath(); g.arc(64, 66, 30, 0.35, Math.PI - 0.35); g.stroke();
  });
}

const ACTIVITIES = {
  // Rover finds his yellow smiley ball and bats it about
  rover: () => {
    const g = new THREE.Group();
    const ball = sph(0.11, new THREE.MeshStandardMaterial({ map: smileyBallTexture(), roughness: 0.55 }), 0, 0.11, 0, 20, 16);
    g.add(ball);
    return { obj: g, tick: (t, p) => {
      const hop = Math.abs(Math.sin(p * Math.PI * 5));
      g.position.set(0.34 + Math.sin(p * Math.PI * 4) * 0.16, 0, 0.3);
      ball.position.y = 0.11 + hop * 0.22;
      ball.rotation.z = -p * 14; ball.rotation.x = p * 6;
    } };
  },
  // Scuzz drags over a garbage can and rummages in it
  scuzz: () => {
    const g = new THREE.Group();
    const can = cyl(0.15, 0.13, 0.34, mat(0x8a8f96, { metalness: 0.5, roughness: 0.6 }), 0, 0.17, 0, 16);
    g.add(can);
    [0.08, 0.17, 0.26].forEach(y => g.add(new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.012, 6, 18), mat(0x6a7078)).rotateX(Math.PI / 2).translateZ(-y)));
    const lid = cyl(0.16, 0.16, 0.02, mat(0x9aa0a8, { metalness: 0.5 }), 0.22, 0.02, 0.1, 16);
    g.add(lid);
    const trash = [];
    for (let i = 0; i < 4; i++) {
      const t = box(0.05, 0.05, 0.05, mat([0xc2a15a, 0xd8d0b0, 0x7a8a5a, 0xb05a3a][i]), 0, 0.3, 0);
      g.add(t); trash.push(t);
    }
    return { obj: g, tick: (t, p) => {
      g.position.set(0.36, 0, 0.24);
      can.rotation.z = Math.sin(t * 6) * 0.05;
      trash.forEach((o, i) => {   // rubbish flying out of the can
        const q = (p * 2 + i * 0.25) % 1;
        o.visible = q < 0.6;
        o.position.set(Math.sin(i * 2 + q * 3) * 0.2, 0.3 + Math.sin(q * Math.PI) * 0.3, Math.cos(i * 3) * 0.1);
        o.rotation.set(q * 8, q * 6, q * 5);
      });
    } };
  },
  // Chaos bats a ball of yarn around
  chaos: () => {
    const g = new THREE.Group();
    const yarn = sph(0.1, mat(0xc85a8a, { roughness: 1 }), 0, 0.1, 0, 14, 12);
    g.add(yarn);
    return { obj: g, tick: (t, p) => {
      g.position.set(0.3 + Math.sin(p * Math.PI * 2) * 0.3, 0, 0.28);
      yarn.rotation.set(p * 10, p * 7, 0);
    } };
  },
  // Java breathes a little smoke ring
  java: () => {
    const g = new THREE.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xb0a898, transparent: true, opacity: 0.5, depthWrite: false }));
      g.add(r); rings.push(r);
    }
    return { obj: g, tick: (t, p) => {
      rings.forEach((r, i) => {
        const q = (p + i * 0.33) % 1;
        r.position.set(0.1, 0.85 + q * 0.5, 0.3 + q * 0.3);
        r.rotation.x = -Math.PI / 2.2;
        r.scale.setScalar(1 + q * 2.4);
        r.material.opacity = (1 - q) * 0.45;
      });
    } };
  },
};

// which guides have activities (the original: all but Speaker and the Invisible Guide)
export const HAS_ACTIVITY = Object.keys(ACTIVITIES);
export { ACTIVITIES };

// The guide stands on the floor so it can wander the room, like the original's
// "activities". A soft key light keeps it readable without blowing out.
export function makeGuidePost() {
  const g = new THREE.Group();
  const seat = new THREE.Group();
  seat.position.y = 0;
  g.add(seat);
  const spot = new THREE.SpotLight(0xffe8c8, 6, 4, 0.9, 0.7, 1.6);
  spot.position.set(0.3, 2.2, 1.2);
  const lt = new THREE.Object3D(); lt.position.set(0, 0.7, 0);
  spot.target = lt;
  g.add(spot, lt);
  let current = null, key = null;
  // idle activity state
  let act = null, actT = 0, idleT = 0;
  const clearAct = () => { if (act) { g.remove(act.obj); act = null; } actT = 0; };
  g.userData.setGuide = (id) => {
    if (current) { seat.remove(current); current = null; }
    clearAct(); idleT = 0;
    key = id;
    current = BUILDERS[id]();
    current.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    seat.add(current);
  };
  // any interaction resets the idle timer
  g.userData.poke = () => { idleT = 0; clearAct(); };
  let waveT = 0;
  g.userData.wave = () => { waveT = 1.6; };
  g.userData.animate = (t, dt = 0.016) => {
    if (current?.userData.animate) current.userData.animate(t);
    // after a spell of being ignored, the guide finds something to do (Rover's ball, Scuzz's bin…)
    idleT += dt;
    if (!act && idleT > 14 && ACTIVITIES[key]) {
      act = ACTIVITIES[key]();
      act.obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
      g.add(act.obj);
      actT = 0;
    }
    if (act) {
      actT += dt;
      const p = actT / 9;                    // the bit lasts ~9s
      if (p >= 1) { clearAct(); idleT = 0; }
      else act.tick(t, p);
    }
    if (waveT > 0) {
      waveT = Math.max(0, waveT - 0.016);
      seat.position.y = Math.abs(Math.sin(waveT * 12)) * 0.18;   // farewell hop
      seat.rotation.y = Math.sin(waveT * 20) * 0.15;
    } else if (seat.position.y !== 0) { seat.position.y = 0; seat.rotation.y = 0; }
  };
  g.userData.guideId = () => key;
  return g;
}
