#!/usr/bin/env python3
"""Trim Bob-guide takes to 10s, upload to the garage Chatterbox worker, set canonical stem,
and verify by synthesising a line cloned from each voice.

Convention (hero-assets): canonical <key>.wav on garage = take-1 trimmed to 10s
= 480078 bytes (10s x 24kHz x 2 bytes + 78 byte header).
"""
import json, os, subprocess, sys, wave, urllib.request, time

HERE = os.path.dirname(os.path.abspath(__file__))
GARAGE = 'garage.wg'
REMOTE = 'pannyflow/data/voices'          # home-relative (scp ~ won't expand)
WORKER = 'http://garage.wg:8093'
RATE, SECS = 24000, 10
EXPECT = SECS * RATE * 2 + 78

roster = json.load(open(os.path.join(HERE, 'roster.json')))['characters']
want = sys.argv[1:] or [c['key'] for c in roster]

def trim(src, dst):
    with wave.open(src, 'rb') as w:
        n = min(w.getnframes(), RATE * SECS)
        frames = w.readframes(n)
    with wave.open(dst, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(frames)
    return os.path.getsize(dst)

def wait_worker(timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            with urllib.request.urlopen(WORKER + '/health', timeout=5) as r:
                if json.loads(r.read()).get('loaded'):
                    return True
        except Exception:
            pass
        time.sleep(3)
    return False

os.makedirs(os.path.join(HERE, 'trimmed'), exist_ok=True)
os.makedirs(os.path.join(HERE, 'cloned'), exist_ok=True)
uploads = []
for c in roster:
    key = c['key']
    if key not in want:
        continue
    for i in (1, 2, 3):
        src = os.path.join(HERE, f'{key}-{i}.wav')
        if not os.path.exists(src):
            continue
        dst = os.path.join(HERE, 'trimmed', f'{key}-{i}.wav')
        sz = trim(src, dst)
        uploads.append(dst)
        print(f'{key}-{i}: trimmed -> {sz} B')
    # canonical = take-1 trimmed
    t1 = os.path.join(HERE, 'trimmed', f'{key}-1.wav')
    if os.path.exists(t1):
        canon = os.path.join(HERE, 'trimmed', f'{key}.wav')
        import shutil; shutil.copyfile(t1, canon)
        uploads.append(canon)
        print(f'{key}: canonical {os.path.getsize(canon)} B (expect ~{EXPECT})')

if uploads:
    print(f'\nuploading {len(uploads)} files to {GARAGE}:{REMOTE}/ …')
    subprocess.run(['scp', '-q', *uploads, f'{GARAGE}:{REMOTE}/'], check=True)
    print('uploaded.')

# verify: worker sees the voices and can synth with them
wait_worker()
try:
    with urllib.request.urlopen(WORKER + '/voices', timeout=10) as r:
        have = {v['id'] for v in json.loads(r.read())['voices']}
    for key in want:
        print(f'  {key}: registered={key in have}')
except Exception as e:
    print('voices check failed:', e)
