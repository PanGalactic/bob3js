// voice.js — talk to the guides out loud.
//
//   mic  -> 16 kHz WAV -> /api/stt   (Whisper large-v3-turbo on garage)
//        -> /api/chat  (ollama, in-character persona)
//        -> /api/tts   (Chatterbox on garage, the guide's own cloned voice)
//
// Each guide's voice was designed in ElevenLabs and cloned onto the garage Chatterbox
// worker; the `voice` id is just the guide key (rover, scuzz, hank…).
import { GUIDES } from './guides.js';
import * as agent from './agent.js';
import * as providers from './providers.js';

let ctx = null;
let media = null, recorder = null, chunks = [];
let listening = false, busy = false;
const history = new Map();          // guideId -> [{role,content}]

export function initVoice(c) { ctx = c; }

// ── audio helpers ───────────────────────────────────────────────
// Whisper wants a real 16 kHz mono PCM wav; decode whatever the recorder gave us and re-encode.
async function toWav16k(blob) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer());
  const src = buf.getChannelData(0);
  const ratio = buf.sampleRate / 16000;
  const n = Math.floor(src.length / ratio);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const s = src[Math.floor(i * ratio)];
    pcm[i] = Math.max(-1, Math.min(1, s)) * 32767;
  }
  ac.close();
  const b = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(b);
  const put = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  put(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); put(8, 'WAVE');
  put(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  put(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(b, 44).set(pcm);
  return new Blob([b], { type: 'audio/wav' });
}

function personaFor(id) {
  const g = GUIDES[id] || GUIDES.rover;
  return `You are ${g.name}, ${g.species}, a guide inside Microsoft Bob — a friendly house-shaped computer interface from 1995. `
    + `Your speciality is ${g.specialty}. Your signature word is "${g.word}" — use it naturally, not every time. `
    + `The house has a Family Room, Study, Kitchen and Attic, and these programs: Letter Writer, Calendar, Checkbook, `
    + `Address Book, Household Manager, Financial Guide, E-Mail, GeoSafari and a Clock. `
    + `You are talking out loud to ${ctx.user()}. Stay completely in character. Reply in ONE or TWO short spoken `
    + `sentences — no lists, no markdown, no stage directions, no emoji. Be warm and useful.`;
}

async function api(path, body, asBlob = false) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return asBlob ? r.blob() : r.json();
}

// one balloon per session explaining WHY the configured provider fell back
let warnedProvider = false;
let lastProviderErr = null;   // kept so the final error balloon can quote the real reason
function providerTrouble(e) {
  console.warn('[voice] provider', e);
  lastProviderErr = String(e?.message || e);
  if (warnedProvider) return;
  warnedProvider = true;
  const s = String(e?.message || e);
  const hint = /429/.test(s)
    ? 'That\'s OpenAI saying the account is <b>out of quota</b> — add billing credit at platform.openai.com and it\'ll work on the next press.'
    : /401/.test(s)
      ? 'The API key was <b>rejected</b> — re-paste it in Options → Voice &amp; brains setup.'
      : 'Check the URLs/key in Options → Voice &amp; brains setup.';
  ctx.say('Voice provider trouble', `Your configured provider failed — <b>${s}</b>. ${hint} Using the local fallback meanwhile.`);
}

// ── speak: your endpoint → your OpenAI key → serve.py proxy → browser voice ──
let current = null;
export async function speak(text, guideId) {
  stopSpeaking();
  try {
    const wav = (await providers.ttsBlob(text, guideId).catch(e => { providerTrouble(e); return null; }))
      ?? await api('/api/tts', { text, voice: guideId }, true);
    const url = URL.createObjectURL(wav);
    current = new Audio(url);
    current.onended = () => URL.revokeObjectURL(url);
    await current.play();
  } catch (e) {
    console.warn('[voice] tts failed, using browser speech', e);
    // last resort: the browser's own voices (on Windows these are literally Microsoft's)
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02; u.pitch = guideId === 'hopper' ? 1.6 : guideId === 'java' || guideId === 'scuzz' ? 0.7 : 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }
}
export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
  try { speechSynthesis.cancel(); } catch {}
}

// ── the loop: record -> transcribe -> reply -> speak ─────────────
let wantListening = false;   // survives the async mic-open; cleared by release
export async function startListening() {
  if (listening || busy) return;
  wantListening = true;
  try {
    media = media || await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    ctx.say('No microphone', 'I can\'t hear you — the browser blocked microphone access. Allow it and try again.');
    return;
  }
  // released while the mic was still opening (first ever use) — don't start,
  // or push-to-talk turns into a stuck toggle
  if (!wantListening) return;
  stopSpeaking();
  chunks = [];
  recorder = new MediaRecorder(media);
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
  listening = true;
  ctx.setVoiceState('listening');
}

export async function stopListening() {
  wantListening = false;
  if (!listening || !recorder) return;
  listening = false;
  busy = true;
  ctx.setVoiceState('thinking');
  const done = new Promise(res => recorder.onstop = res);
  recorder.stop();
  await done;
  const guideId = ctx.guideId();
  try {
    const wav = await toWav16k(new Blob(chunks, { type: recorder.mimeType }));
    if (wav.size < 3000) { ctx.setVoiceState('idle'); busy = false; return; }   // too short / silence

    // 1. Whisper — your endpoint / your key first, else the serve.py proxy
    let text = await providers.sttText(wav).catch(e => { providerTrouble(e); return null; });
    if (text == null) {
      const fd = new FormData();
      fd.append('file', wav, 'speech.wav');
      const sr = await fetch('/api/stt', { method: 'POST', body: fd });
      text = (await sr.json()).text;
    }
    const heard = (text || '').trim();
    if (!heard) { ctx.say('Sorry?', 'I didn\'t catch that — try again.'); ctx.setVoiceState('idle'); busy = false; return; }
    ctx.onHeard(heard);

    // 2. AGENTIC: try to act on the request (goto/open/place/recolor/restyle/create).
    //    The guide runs to the target, reacts in character, then acts. Falls through to chat.
    try {
      const act = await agent.handle(heard, guideId);
      if (act.handled) { ctx.setVoiceState('idle'); busy = false; return; }
    } catch (e) { console.warn('[voice] agent', e); }

    // 3. persona reply (conversation)
    const h = history.get(guideId) || [];
    const messages = [{ role: 'system', content: personaFor(guideId) }, ...h.slice(-6), { role: 'user', content: heard }];
    const replyRaw = (await providers.chatText(messages).catch(e => { providerTrouble(e); return null; }))
      ?? (await api('/api/chat', { messages })).text;
    const reply = (replyRaw || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/[*_`#]/g, '').trim()
      || 'Hmm, I have no words for that one.';
    history.set(guideId, [...h.slice(-6), { role: 'user', content: heard }, { role: 'assistant', content: reply }]);

    // 3. say it, in their own cloned voice
    ctx.say(`${GUIDES[guideId].name} says…`, reply);
    ctx.setVoiceState('speaking');
    await speak(reply, guideId);
  } catch (e) {
    console.warn('[voice]', e);
    ctx.say('Voice trouble', lastProviderErr
      ? `Your configured provider failed — <b>${lastProviderErr}</b>. If that mentions a model, open Options → Voice &amp; brains setup, press “List available models” and pick one your key actually has.`
      : 'Something went wrong talking to the voice service. Check Options → Voice & brains setup.');
  }
  ctx.setVoiceState('idle');
  busy = false;
}

export function toggleListening() { listening ? stopListening() : startListening(); }
export const isListening = () => listening;
