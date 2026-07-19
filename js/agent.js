// agent.js — the agentic voice layer. The guide is an LLM with TOOLS, not a chatbot.
//
// A spoken request → build a WORLD MODEL → ask the planner for ONE structured action →
// resolve referents ("the blue sofa", "art deco", "the living room") → execute EMBODIED:
// the guide runs to the target, reacts in character, then acts. Falls back to conversation.

import * as catalog from './catalog.js';
import { STYLE_ORDER, STYLES } from './styles.js';
import { GUIDES } from './guides.js';

let T = null;   // tool surface, provided by main via initAgent
export function initAgent(tools) { T = tools; }

const ZONE_ALIASES = {
  'living room': 'family', 'lounge': 'family', 'family room': 'family', 'sitting room': 'family',
  'office': 'study', 'den': 'study', 'loft': 'attic', 'bedroom': 'parents-bedroom',
  'main bedroom': 'parents-bedroom', 'master': 'parents-bedroom', "kids room": 'kids-bedroom',
  "children's room": 'kids-bedroom', 'toilet': 'bathroom', 'washroom': 'bathroom',
  'games': 'games-room', 'game room': 'games-room', 'cinema': 'cinema-room', 'movie room': 'cinema-room',
  'theatre': 'cinema-room', 'theater': 'cinema-room', 'music': 'music-room', 'studio': 'music-room',
  'yoga': 'yoga-room', 'gym': 'gym', 'workout': 'gym', 'pool': 'pool', 'swimming pool': 'pool',
  'tennis': 'tennis', 'court': 'tennis', 'bbq': 'bbq', 'barbecue': 'bbq', 'patio': 'bbq',
  'garden': 'garden', 'backyard': 'garden', 'yard': 'garden', 'dining': 'dining', 'dining room': 'dining',
  'hall': 'hallway', 'hallway': 'hallway',
};
const COLORS = {
  red: 0xc41c1c, orange: 0xd97e2f, yellow: 0xe0b030, gold: 0xe8b23a, green: 0x3f9a5c,
  teal: 0x3fb0c0, blue: 0x2634a8, navy: 0x1c2a6a, purple: 0x7a4ac0, pink: 0xd838a0,
  brown: 0x8a5a20, black: 0x1c1a16, white: 0xf2ddb8, grey: 0x8a8a88, gray: 0x8a8a88, cream: 0xf2ddb8,
};

function resolveZone(word) {
  if (!word) return null;
  const w = word.toLowerCase().trim();
  if (T.zones()[w]) return w;
  if (ZONE_ALIASES[w]) return ZONE_ALIASES[w];
  for (const k in ZONE_ALIASES) if (w.includes(k)) return ZONE_ALIASES[k];
  return T.zoneOrder().find(id => w.includes(id.replace('-', ' ')) || id.includes(w)) || null;
}
function resolveStyle(word) {
  if (!word) return null;
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  return STYLE_ORDER.find(s => s.replace(/[^a-z]/g, '') === w)
    || STYLE_ORDER.find(s => w.includes(s.replace(/[^a-z]/g, '')) || STYLES[s].label.toLowerCase().replace(/[^a-z]/g, '').includes(w))
    || null;
}
function resolveItem(word) {
  if (!word) return null;
  const w = word.toLowerCase();
  const list = catalog.list();
  if (list.find(d => d.id === w)) return w;
  // exact-ish name / tag match, prefer shorter names
  let best = null, bestScore = 0;
  list.forEach(d => {
    const hay = (d.name + ' ' + d.id + ' ' + d.tags.join(' ')).toLowerCase();
    let score = 0;
    w.split(/\s+/).forEach(tok => { if (tok.length > 2 && hay.includes(tok)) score += tok.length; });
    if (score > bestScore) { bestScore = score; best = d.id; }
  });
  return bestScore > 0 ? best : null;
}
function resolveColor(word) {
  if (!word) return null;
  const w = word.toLowerCase();
  for (const k in COLORS) if (w.includes(k)) return COLORS[k];
  return null;
}
// find a placed/movable object in the current zone by loose name
function resolveObject(word) {
  const cur = T.currentZone(); if (!cur || !word) return null;
  const w = word.toLowerCase();
  const movs = (cur.movables || []).filter(o => o.visible !== false);
  let best = null, bestScore = 0;
  movs.forEach(o => {
    const name = (o.userData.movable || o.userData.catalogId || '').toLowerCase();
    let score = 0; w.split(/\s+/).forEach(tok => { if (tok.length > 2 && name.includes(tok)) score += tok.length; });
    if (score > bestScore) { bestScore = score; best = o; }
  });
  return bestScore > 0 ? best : (movs[0] || null);
}

// ── world model ─────────────────────────────────────────────────
function worldModel() {
  const cur = T.currentZone();
  const here = cur ? (cur.movables || []).filter(o => o.visible !== false).map(o => o.userData.movable).filter(Boolean) : [];
  const conn = cur ? (cur.hotspots || []).filter(h => h.kind === 'door').map(h => h.target) : [];
  return {
    current: cur?.id, currentName: cur?.title, style: cur?.style,
    here: [...new Set(here)].slice(0, 14),
    connected: conn,
    zones: T.zoneOrder().filter(z => z !== 'porch'),
    apps: ['letter', 'calendar', 'checkbook', 'address', 'household', 'financial', 'email', 'geosafari', 'clock'],
    itemsSample: ['sofa', 'armchair', 'table-lamp', 'floor-lamp', 'bookshelf', 'bed', 'rug', 'potted-plant', 'wall-art', 'tv-stand'],
    styles: STYLE_ORDER,
  };
}

const PLANNER_SYS = `You control a friendly guide inside a virtual house. Read the user's spoken request and the WORLD json, then output ONLY ONE JSON object for the single best action. Shapes:
{"action":"goto","zone":"<zoneId>"}                         go to / show me a room
{"action":"open","app":"<appId>"}                            open a program
{"action":"place","item":"<word>","near":"<word or empty>"}  put/add a furniture item
{"action":"recolor","target":"<word>","color":"<colour>"}    change an object's colour
{"action":"restyle","zone":"<zoneId or 'here'>","style":"<style>"}  restyle a room/house look
{"action":"create","description":"<what to make>"}           make a brand-new object with AI
{"action":"chat"}                                            anything else / just talking
Also add "speech": one short in-character sentence to say while doing it (no emoji, no markdown).
Prefer a concrete action over "chat" whenever the request asks to move somewhere, add/place/put a
thing, change a colour or look, make/create something, or open a program. Only use "chat" for
greetings, questions, or small talk. Output ONLY the JSON.
Examples:
REQUEST="put a lamp on the bedside table" => {"action":"place","item":"lamp","near":"bedside table","speech":"One cosy lamp, coming up."}
REQUEST="give me a garden" => {"action":"goto","zone":"garden","speech":"Let's step outside!"}
REQUEST="take me to the kitchen" => {"action":"goto","zone":"kitchen","speech":"This way to the kitchen."}
REQUEST="add a sofa" => {"action":"place","item":"sofa","near":"","speech":"A comfy sofa, here you go."}
REQUEST="make the living room art deco" => {"action":"restyle","zone":"family","style":"art-deco","speech":"Ooh, going glamorous!"}
REQUEST="paint the sofa red" => {"action":"recolor","target":"sofa","color":"red","speech":"A splash of red!"}
REQUEST="open the calendar" => {"action":"open","app":"calendar","speech":"Here's your calendar."}
REQUEST="make me a red arcade cabinet" => {"action":"create","description":"a red arcade cabinet","speech":"Let me build that for you."}
REQUEST="how are you today" => {"action":"chat"}`;

async function plan(utterance, guideId) {
  const world = worldModel();
  const g = GUIDES[guideId] || GUIDES.rover;
  try {
    const { text } = await T.chat([
      { role: 'system', content: PLANNER_SYS + `\nYou are ${g.name}. Signature word: "${g.word}".` },
      { role: 'user', content: `WORLD=${JSON.stringify(world)}\nREQUEST="${utterance}"` },
    ]);
    const m = (text || '').match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (e) { console.warn('[agent] plan failed', e); }
  return { action: 'chat' };
}

// ── embodied execution ──────────────────────────────────────────
// guide runs to a spot in the current zone, reacts (in-voice line), then runs `act`.
function runReactAct(localPos, reactLine, guideId, act) {
  T.say(`${(GUIDES[guideId] || GUIDES.rover).name}`, reactLine);
  if (localPos && T.guideRunTo) {
    T.guideRunTo(localPos[0], localPos[1], () => { T.speak(reactLine, guideId); setTimeout(act, 350); });
  } else {
    T.speak(reactLine, guideId); setTimeout(act, 300);
  }
}

// returns { handled:true, speech } if an action ran, else { handled:false }
export async function handle(utterance, guideId) {
  const p = await plan(utterance, guideId);
  if (typeof window !== 'undefined') window.__lastPlan = p;
  const speech = p.speech || 'On it.';
  const cur = T.currentZone();

  switch (p.action) {
    case 'goto': {
      let z = resolveZone(p.zone);
      if (!z) return { handled: false };
      T.say((GUIDES[guideId] || GUIDES.rover).name, speech); T.speak(speech, guideId);
      setTimeout(() => T.gotoZone(z), 500);
      return { handled: true, speech };
    }
    case 'open': {
      const app = (p.app || '').toLowerCase();
      const valid = worldModel().apps.includes(app) ? app : null;
      if (!valid) return { handled: false };
      const obj = resolveObject(valid) || resolveObject('');
      const pos = obj ? [obj.position.x, obj.position.z] : null;
      runReactAct(pos, speech, guideId, () => T.openApp(valid));
      return { handled: true, speech };
    }
    case 'place': {
      if (!cur) return { handled: false };
      const item = resolveItem(p.item);
      if (!item) return { handled: false };
      const near = p.near ? resolveObject(p.near) : null;
      const nx = near ? near.position.x + 0.6 : (Math.random() - 0.5) * 2;
      const nz = near ? near.position.z + 0.4 : (cur.bounds ? cur.bounds[3] * 0.4 : 0);
      const y = near && /lamp|vase|book|plant/.test(item) ? (near.position.y + 0.75) : 0;
      runReactAct([nx, nz], speech, guideId, () => T.zoneApi.placeItem(cur.id, item, { x: nx, y, z: nz }));
      return { handled: true, speech };
    }
    case 'recolor': {
      const obj = resolveObject(p.target);
      const color = resolveColor(p.color);
      if (!obj || color == null) return { handled: false };
      runReactAct([obj.position.x, obj.position.z], speech, guideId, () => {
        if (obj.userData.placedUid) { const fresh = T.zoneApi.reskinItem(obj, { color }); T.onReskin?.(obj, fresh); }
        else obj.traverse(o => { if (o.material?.color) o.material.color.setHex(color); });
      });
      return { handled: true, speech };
    }
    case 'restyle': {
      const style = resolveStyle(p.style);
      if (!style) return { handled: false };
      const scope = (!p.zone || p.zone === 'here' || p.zone === cur?.id);
      T.say((GUIDES[guideId] || GUIDES.rover).name, speech); T.speak(speech, guideId);
      setTimeout(() => {
        if (scope && cur?.isData) T.zoneApi.setZoneStyle(cur.id, style);
        else { const z = resolveZone(p.zone); if (z && T.zones()[z]?.isData) T.zoneApi.setZoneStyle(z, style); else T.zoneApi.setHouseStyle(style); }
      }, 500);
      return { handled: true, speech };
    }
    case 'create': {
      if (!p.description) return { handled: false };
      T.say((GUIDES[guideId] || GUIDES.rover).name, speech); T.speak(speech, guideId);
      T.createFromDescription?.(p.description);
      return { handled: true, speech };
    }
    default:
      return { handled: false };
  }
}
