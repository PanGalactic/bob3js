// providers.js — route voice + brains to YOUR endpoints, YOUR key, or the local
// serve.py proxy. Entirely browser-side, so it works from static hosting too;
// URLs and keys live in BobOS.fs (this browser only) and are sent to nothing
// except the provider you configured.
//
// Resolution order for each capability:
//   1. your own OpenAI-compatible endpoint URL (Chatterbox / Whisper / ollama…)
//   2. your OpenAI API key (voices steered per-guide with the SAME persona
//      prompts that designed the cloned cast — voices/roster.json)
//   3. null → caller falls back to same-origin /api/* (serve.py), then to the
//      browser's built-in speech.
import { BobOS } from './os.js';

const get = () => BobOS.fs.read('settings/providers', {});
export const providers = {
  get,
  set(patch) { return BobOS.fs.write('settings/providers', { ...get(), ...patch }); },
  clear() { BobOS.fs.remove('settings/providers'); },
};

// per-guide steering for OpenAI: reuse the roster persona prompts
let _roster = null;
async function rosterPrompt(key) {
  if (!_roster) {
    try { _roster = (await (await fetch('voices/roster.json')).json()).characters || []; }
    catch { _roster = []; }
  }
  return _roster.find(c => c.key === key)?.prompt || '';
}
// nearest preset for each guide; the instructions do the real characterisation
const OPENAI_VOICE = {
  rover: 'echo', blythe: 'sage', chaos: 'onyx', hopper: 'shimmer', java: 'ballad',
  orby: 'alloy', ruby: 'coral', scuzz: 'ash', shelly: 'fable', digger: 'verse',
  speaker: 'alloy', invisible: 'ash', hank: 'ballad', ledger: 'verse',
};

// surface the provider's own error message (e.g. OpenAI's quota explanation)
async function fail(r, label) {
  let msg = label + ' ' + r.status;
  try { const j = await r.json(); const m = j.error?.message || j.error || ''; if (m) msg += ' — ' + String(m).slice(0, 160); } catch {}
  throw new Error(msg);
}

// ── TTS: returns an audio Blob, or null when no provider is configured ──
export async function ttsBlob(text, guideKey) {
  const p = get();
  if (p.ttsUrl) {
    const r = await fetch(p.ttsUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: p.ttsModel || 'tts-1', input: text, voice: guideKey, response_format: 'wav' }),
    });
    if (!r.ok) await fail(r, 'tts endpoint');
    return r.blob();
  }
  if (p.openaiKey) {
    const instructions = await rosterPrompt(guideKey);
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + p.openaiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: p.ttsModel || 'gpt-4o-mini-tts', input: text,
        voice: OPENAI_VOICE[guideKey] || 'alloy',
        ...(instructions ? { instructions } : {}), response_format: 'wav',
      }),
    });
    if (!r.ok) await fail(r, 'OpenAI tts');
    return r.blob();
  }
  return null;
}

// ── STT: wav Blob in, transcript out (null = no provider configured) ──
export async function sttText(wavBlob) {
  const p = get();
  const url = p.sttUrl || (p.openaiKey ? 'https://api.openai.com/v1/audio/transcriptions' : null);
  if (!url) return null;
  const fd = new FormData();
  fd.append('file', wavBlob, 'speech.wav');
  fd.append('model', p.sttModel || (p.sttUrl ? 'whisper-1' : 'gpt-4o-mini-transcribe'));   // OpenAI: half the price of whisper-1
  const r = await fetch(url, {
    method: 'POST',
    headers: p.sttUrl ? {} : { Authorization: 'Bearer ' + p.openaiKey },
    body: fd,
  });
  if (!r.ok) await fail(r, 'stt');
  return (await r.json()).text || '';
}

// ── chat: OpenAI-compatible completions (your ollama/vllm URL, or OpenAI) ──
export async function chatText(messages, opts = {}) {
  const p = get();
  const url = p.chatUrl || (p.openaiKey ? 'https://api.openai.com/v1/chat/completions' : null);
  if (!url) return null;
  const body = { model: p.chatModel || (p.chatUrl ? 'default' : 'gpt-5.6-luna'), messages };
  if (p.chatUrl) {
    // OpenAI-compatible self-hosted servers (ollama, vLLM…) use the classic params
    body.temperature = opts.temperature ?? 0.8;
    body.max_tokens = opts.maxTokens ?? 300;
  } else {
    // modern OpenAI models reject max_tokens (and some reject temperature) —
    // use max_completion_tokens and leave temperature at its default
    body.max_completion_tokens = opts.maxTokens ?? 300;
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(p.chatUrl ? {} : { Authorization: 'Bearer ' + p.openaiKey }) },
    body: JSON.stringify(body),
  });
  if (!r.ok) await fail(r, 'chat');
  const out = await r.json();
  return out.choices?.[0]?.message?.content ?? out.message?.content ?? '';
}

export const hasOwnVoice = () => { const p = get(); return !!(p.ttsUrl || p.openaiKey); };
