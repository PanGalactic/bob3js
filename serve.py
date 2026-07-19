#!/usr/bin/env python3
"""Dev server for Bob 3D.

Serves the static app with no-store headers, and proxies the voice stack on garage so the
browser talks same-origin (no CORS):

  POST /api/stt   multipart wav   -> garage:8765/transcribe       (Whisper large-v3-turbo, MLX)
  POST /api/tts   {text, voice}   -> garage:8093/v1/audio/speech   (Chatterbox, cloned guides)
  POST /api/chat  {messages}      -> garage:11434/api/chat         (ollama, persona replies)
"""
import http.server, os, socketserver, json, subprocess, urllib.request, urllib.error

# host running the (optional) voice stack — Whisper STT, TTS, ollama.
# Everything degrades gracefully if it isn't there; the house works without voice.
GARAGE = os.environ.get('BOB_VOICE_HOST', 'garage.wg')
STT = f'http://{GARAGE}:8765/transcribe'
TTS = f'http://{GARAGE}:8093/v1/audio/speech'
CHAT = f'http://{GARAGE}:11434/api/chat'
CHAT_MODEL = 'qwen3.5:2b'
GEMMA = f'http://{GARAGE}:8003/v1/chat/completions'   # gemma-4-26b MoE (fast) for object gen

SVG_SYS = (
    "You draw ONE object as a flat, front-on SVG icon. Output ONLY the SVG markup, nothing else. "
    "Rules: a single <svg> with a viewBox (e.g. 0 0 200 200); build the shape from CLOSED "
    "<path>, <rect>, <circle>, <polygon> elements only; every shape has a solid fill=\"#rrggbb\"; "
    "the FIRST shape must be the large body silhouette; add a dark outline via stroke on shapes; "
    "NO gradients, NO <text>, NO <filter>, NO <style>, NO <clipPath>, NO images. Chunky, bold, "
    "warm, low-detail — like a 1995 cartoon icon."
)
OBJ_SYS = (
    "You output ONLY a JSON object: {\"parts\":[ ... ]} describing a small 3D object built from "
    "primitives. Each part: {\"shape\":\"box|cylinder|cone|sphere|torus\", \"x\",\"y\",\"z\": centre "
    "in metres (object ~1m tall, sitting on the ground at y=0, centred at x=z=0), plus sizes: box uses "
    "w,h,d; cylinder uses rt,rb,h; cone uses r,h; sphere uses r; torus uses r,tube; optional rotations "
    "rx,ry,rz in RADIANS; and color:\"#rrggbb\". Use 4-12 parts to make a RECOGNISABLE, solid, "
    "volumetric object. Warm saturated colours. Output ONLY the JSON, no prose, no markdown."
)


# real Mac apps the house can open — STRICT whitelist: the request carries an id,
# never an app name, so nothing user-controlled ever reaches `open`.
LAUNCH_APPS = {
    'vlc': 'VLC',
    'calculator': 'Calculator',
    'quicktime': 'QuickTime Player',
    'chrome': 'Google Chrome',
    'safari': 'Safari',
    'mail': 'Mail',
    'music': 'Music',
    'photos': 'Photos',
    'terminal': 'Terminal',
    'maps': 'Maps',
    'messages': 'Messages',
    'facetime': 'FaceTime',
    'notes': 'Notes',
    'settings': 'System Settings',
}


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def _send(self, code, body, ctype='application/json'):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(n)
        try:
            if self.path == '/api/launch':
                d = json.loads(raw)
                app = LAUNCH_APPS.get(d.get('app'))
                if not app:
                    return self._send(400, json.dumps({'error': 'unknown app id'}).encode())
                subprocess.Popen(['open', '-a', app])
                return self._send(200, json.dumps({'ok': True, 'app': app}).encode())

            if self.path == '/api/stt':
                req = urllib.request.Request(
                    STT, data=raw, headers={'Content-Type': self.headers.get('Content-Type')})
                with urllib.request.urlopen(req, timeout=90) as r:
                    return self._send(200, r.read())

            if self.path == '/api/tts':
                d = json.loads(raw)
                payload = json.dumps({
                    'input': d.get('text', ''),
                    'voice': d.get('voice', 'rover'),
                    'response_format': 'wav',
                    'speed': d.get('speed', 1.0),
                }).encode()
                req = urllib.request.Request(TTS, data=payload,
                                             headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=180) as r:
                    return self._send(200, r.read(), 'audio/wav')

            if self.path == '/api/plan':
                # agentic planner — route to the stronger gemma-26b for reliable tool selection
                d = json.loads(raw)
                payload = json.dumps({
                    'model': 'mlx-community/gemma-4-26b-a4b-it-4bit',
                    'messages': d['messages'],
                    'temperature': 0.1,
                    'max_tokens': 260,
                }).encode()
                req = urllib.request.Request(GEMMA, data=payload,
                                             headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    out = json.loads(r.read())
                txt = out.get('choices', [{}])[0].get('message', {}).get('content', '')
                return self._send(200, json.dumps({'text': txt}).encode())

            if self.path in ('/api/svggen', '/api/objgen'):
                d = json.loads(raw)
                sys = SVG_SYS if self.path == '/api/svggen' else OBJ_SYS
                payload = json.dumps({
                    'model': d.get('model', 'mlx-community/gemma-4-26b-a4b-it-4bit'),
                    'messages': [{'role': 'system', 'content': sys},
                                 {'role': 'user', 'content': d.get('prompt', '')}],
                    'temperature': d.get('temperature', 0.5),
                    'max_tokens': 1400,
                }).encode()
                req = urllib.request.Request(GEMMA, data=payload,
                                             headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=120) as r:
                    out = json.loads(r.read())
                txt = out.get('choices', [{}])[0].get('message', {}).get('content', '')
                return self._send(200, json.dumps({'text': txt}).encode())

            if self.path == '/api/chat':
                d = json.loads(raw)
                payload = json.dumps({
                    'model': d.get('model', CHAT_MODEL),
                    'messages': d['messages'],
                    'stream': False,
                    'think': False,
                    'options': {'temperature': 0.85, 'num_predict': 110},
                }).encode()
                req = urllib.request.Request(CHAT, data=payload,
                                             headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=120) as r:
                    out = json.loads(r.read())
                txt = out.get('message', {}).get('content', '')
                return self._send(200, json.dumps({'text': txt}).encode())

        except urllib.error.HTTPError as e:
            return self._send(e.code, json.dumps(
                {'error': e.read()[:400].decode('utf8', 'replace')}).encode())
        except Exception as e:
            return self._send(502, json.dumps({'error': str(e)}).encode())

        self._send(404, b'{"error":"no such endpoint"}')


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('', 8477), H) as httpd:
    print('bob3d dev server on :8477 (voice proxied to garage)')
    httpd.serve_forever()
