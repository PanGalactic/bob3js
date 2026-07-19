// os.js — BobOS kernel: the foundation you build apps upon.
//
//   BobOS.fs      a virtual filesystem (namespaced, JSON, localStorage-backed)
//   BobOS.apps    an app registry — register a manifest, launch by id
//   BobOS.bus     a pub/sub event bus so apps and the shell talk
//   BobOS.notify  route a message to the on-screen guide
//   BobOS.version / boot info
//
// An app is just a manifest: { id, name, icon, room?, launch(ctx) }.
// Register it with BobOS.apps.register(manifest) and it shows up in the
// program finder, can be launched by id, and gets the shared services.

const LS = window.localStorage;

// ── Virtual filesystem ──────────────────────────────────────────
// Paths look like "calendar/events/2026-07-16". Everything is JSON.
// Backed by localStorage under the "bobfs:" prefix; swap this class to move
// to IndexedDB or a server without touching a single app.
class VFS {
  constructor(prefix = 'bob3d.') { this.prefix = prefix; }
  _k(path) { return this.prefix + path.replace(/^\/+/, ''); }
  read(path, fallback = null) {
    try { const v = LS.getItem(this._k(path)); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  write(path, value) {
    LS.setItem(this._k(path), JSON.stringify(value));
    BobOS.bus.emit('fs:write', { path, value });
    return value;
  }
  // read-modify-write helper
  update(path, fn, fallback = null) { return this.write(path, fn(this.read(path, fallback))); }
  remove(path) { LS.removeItem(this._k(path)); BobOS.bus.emit('fs:remove', { path }); }
  exists(path) { return LS.getItem(this._k(path)) != null; }
  // list child paths under a dir prefix, e.g. list("calendar/events/")
  list(dir = '') {
    const full = this.prefix + dir.replace(/^\/+/, '');
    const out = [];
    for (let i = 0; i < LS.length; i++) {
      const k = LS.key(i);
      if (k.startsWith(full)) out.push(k.slice(this.prefix.length));
    }
    return out.sort();
  }
  // wipe an app's whole directory
  removeDir(dir) { this.list(dir).forEach(p => this.remove(p)); }
}

// ── Event bus ───────────────────────────────────────────────────
class Bus {
  constructor() { this.map = new Map(); }
  on(type, fn) { (this.map.get(type) || this.map.set(type, new Set()).get(type)).add(fn); return () => this.off(type, fn); }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  once(type, fn) { const off = this.on(type, (d) => { off(); fn(d); }); return off; }
  emit(type, detail) { this.map.get(type)?.forEach(fn => { try { fn(detail); } catch (e) { console.error('[bus]', type, e); } });
    this.map.get('*')?.forEach(fn => { try { fn(type, detail); } catch {} }); }
}

// ── App registry ────────────────────────────────────────────────
class AppRegistry {
  constructor() { this.apps = new Map(); }
  register(manifest) {
    if (!manifest?.id || typeof manifest.launch !== 'function')
      throw new Error('BobOS.apps.register needs { id, launch(ctx) }');
    this.apps.set(manifest.id, { icon: '📦', name: manifest.id, ...manifest });
    BobOS.bus.emit('apps:register', manifest);
    return manifest;
  }
  get(id) { return this.apps.get(id); }
  list() { return [...this.apps.values()]; }
  launch(id, opts) {
    const a = this.apps.get(id);
    if (!a) { console.warn('[BobOS] no such app:', id); return false; }
    BobOS.bus.emit('apps:launch', { id, opts });
    a.launch(BobOS.ctx, opts);
    return true;
  }
}

// ── The kernel object ───────────────────────────────────────────
export const BobOS = {
  version: '1.0',
  fs: new VFS(),
  bus: new Bus(),
  apps: new AppRegistry(),
  ctx: null,            // the shell context (say/sound/user/…), set by main via boot()
  user() { return BobOS.ctx?.user?.() ?? 'Friend'; },
  notify(title, body, opts) { BobOS.ctx?.say?.(title, body, opts); BobOS.bus.emit('notify', { title, body }); },
  boot(ctx) { BobOS.ctx = ctx; BobOS.bus.emit('boot', { version: BobOS.version }); return BobOS; },
};

// handy alias for apps: BobOS-scoped store, drop-in for the old `store` helper
export const fs = BobOS.fs;
window.BobOS = BobOS;   // expose for debugging + third-party apps
