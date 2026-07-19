#!/usr/bin/env python3
"""Generate Bob-guide seed voices with ElevenLabs Voice Design.

Follows the hero-assets convention:
  - one Voice Design call per character -> 3 previews
  - saved as <key>-{1,2,3}.wav (mono 24 kHz PCM)
  - <key>.wav (canonical) = take 1
  - records voices.json

Then clone_takes.py trims to 10s, uploads to garage, and sets the canonical stem.
Key comes from $ELEVENLABS_API_KEY (env only; never argv/git).
"""
import base64, json, os, sys, wave, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.elevenlabs.io/v1/text-to-voice/design'
KEY = os.environ.get('ELEVENLABS_API_KEY')
if not KEY:
    sys.exit('ELEVENLABS_API_KEY not set (source ~/.zshrc)')

roster = json.load(open(os.path.join(HERE, 'roster.json')))['characters']
want = sys.argv[1:] or [c['key'] for c in roster]

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())

def write_wav(path, pcm_bytes, rate=24000):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(pcm_bytes)

manifest_path = os.path.join(HERE, 'voices.json')
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

for c in roster:
    if c['key'] not in want:
        continue
    key = c['key']
    print(f'== {key} ({c["name"]}) …', flush=True)
    try:
        res = post(API, {
            'voice_description': c['prompt'],
            'text': c['line'],
            'model_id': 'eleven_ttv_v3',
            'output_format': 'pcm_24000',
        })
    except urllib.error.HTTPError as e:
        print(f'   HTTP {e.code}: {e.read()[:400].decode(errors="replace")}')
        continue
    previews = res.get('previews') or []
    if not previews:
        print('   no previews returned:', str(res)[:200]); continue
    ids = []
    for i, p in enumerate(previews[:3], 1):
        pcm = base64.b64decode(p['audio_base_64'])
        out = os.path.join(HERE, f'{key}-{i}.wav')
        write_wav(out, pcm)
        ids.append(p.get('generated_voice_id'))
        print(f'   take {i}: {out} ({len(pcm)} B pcm)')
    # canonical = take 1
    import shutil
    shutil.copyfile(os.path.join(HERE, f'{key}-1.wav'), os.path.join(HERE, f'{key}.wav'))
    manifest[key] = {'name': c['name'], 'takes': len(ids), 'generated_voice_ids': ids}
    json.dump(manifest, open(manifest_path, 'w'), indent=2)
    print(f'   canonical -> {key}.wav')

print('\ndone. manifest:', manifest_path)
