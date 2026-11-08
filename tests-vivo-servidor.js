// Servidor local para probar el seguimiento en vivo y el panel: sirve dist/ y ejecuta api/live.js y api/admin.js de verdad,
// con un Redis falso en memoria que imita la API REST de Upstash (/pipeline).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2], API = process.argv[3], PORT = +(process.argv[4] || 8766);
const db = new Map();
process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/fake-redis`; process.env.KV_REST_API_TOKEN = 'test-token';
if (process.env.NOCFG) { delete process.env.KV_REST_API_URL; }
const handler = require(require('path').resolve(API));
const adminHandler = require(path.resolve(__dirname, 'api/admin.js'));
const run = c => { const [cmd, k, ...a] = c; const now = Date.now(); const get = () => { const v = db.get(k); if (v && v.exp && v.exp < now) { db.delete(k); return undefined; } return v; };
  switch (cmd) {
    case 'GET': return get()?.v ?? null;
    case 'SET': { const i = a.indexOf('EX'); db.set(k, { v: a[0], exp: i >= 0 ? now + a[i + 1] * 1000 : 0 }); return 'OK'; }
    case 'RPUSH': { const v = get() || { v: [], exp: 0 }; v.v.push(...a); db.set(k, v); return v.v.length; }
    case 'LTRIM': { const v = get(); if (v) { const n = v.v.length; let s = +a[0], e = +a[1]; if (s < 0) s = Math.max(0, n + s); if (e < 0) e = n + e; v.v = v.v.slice(s, e + 1); } return 'OK'; }
    case 'LRANGE': { const v = get(); if (!v) return []; const n = v.v.length; let st = +a[0], e = +a[1]; if (st < 0) st = Math.max(0, n + st); if (e < 0) e = n + e; return v.v.slice(st, e + 1); }
    case 'LPUSH': { const v = get() || { v: [], exp: 0 }; a.forEach(x => v.v.unshift(x)); db.set(k, v); return v.v.length; }
    case 'DEL': return db.delete(k) ? 1 : 0;
    case 'INCR': { const v = get() || { v: '0', exp: 0 }; v.v = String(+v.v + 1); db.set(k, v); return +v.v; }
    case 'HSETNX': { const v = get() || { v: {}, exp: 0 }; if (a[0] in v.v) return 0; v.v[a[0]] = a[1]; db.set(k, v); return 1; }
    case 'HSET': { const v = get() || { v: {}, exp: 0 }; v.v[a[0]] = a[1]; db.set(k, v); return 1; }
    case 'HGET': return get()?.v[a[0]] ?? null;
    case 'HDEL': { const v = get(); if (v && a[0] in v.v) { delete v.v[a[0]]; return 1; } return 0; }
    case 'HGETALL': { const v = get(); return v ? Object.entries(v.v).flat() : []; }
    case 'EXPIRE': { const v = get(); if (v) v.exp = now + a[0] * 1000; return v ? 1 : 0; }
  } return null; };
const TYPES = { '.svg': 'image/svg+xml', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/fake-redis/pipeline') {
    if (req.headers.authorization !== 'Bearer test-token') { res.statusCode = 401; return res.end(); }
    let b = ''; for await (const c of req) b += c; const out = JSON.parse(b).map(c => ({ result: run(c) }));
    res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(out));
  }
  if (u.pathname === '/api/live') return handler(req, res);
  if (u.pathname === '/api/admin') return adminHandler(req, res);
  if (u.pathname === '/__reset') { db.clear(); return res.end('ok'); }
  let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('nf'); } res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.end(d); });
}).listen(PORT, '127.0.0.1', () => console.log('live server on', PORT));
