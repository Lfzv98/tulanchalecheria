/* Seguimiento en vivo de Tu Lancha Lechería (función de Vercel).
   El teléfono a bordo publica su posición; quien abre el enlace la lee cada pocos segundos.
   Guarda los datos en Upstash Redis (plan gratis) por 24 horas y luego se borran solos.

   Variables de entorno (las crea Vercel al conectar Upstash desde Storage › Marketplace):
     KV_REST_API_URL y KV_REST_API_TOKEN   (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN)

   POST /api/live  { id, key, boat?, pts: [{ t, lat, lng, acc?, spd?, hdg? }, ...] }
     - id: identificador del viaje (aleatorio, 20 caracteres). No es el código de reserva.
     - key: clave secreta del teléfono que comparte. La primera escritura la fija; después solo ese teléfono puede escribir.
     - pts: puede traer varias posiciones juntas (las que se guardaron mientras no hubo señal).
   GET  /api/live?id=...&after=<ms>  devuelve las posiciones posteriores a "after" y la última conocida.
   DELETE /api/live { id, key }  termina el seguimiento. */
const crypto = require('crypto');

const TTL = 24 * 3600;           // segundos que se guarda un viaje
const MAX_PTS = 3000;            // tope de posiciones por viaje (unas 4 h a una cada 5 s)
const MAX_BATCH = 400;           // tope de posiciones por envío
const ID_RE = /^[a-z2-9]{20}$/;  // id aleatorio en base32 sin caracteres ambiguos
const KEY_RE = /^[A-Za-z0-9_-]{24,64}$/;

// Acepta los nombres que crea la integración de Vercel, también con prefijo personalizado
// (p. ej. STORAGE_KV_REST_API_URL), y como último recurso REDIS_URL / KV_URL de Upstash (rediss://default:TOKEN@host).
function env() {
  const E = process.env, keys = Object.keys(E);
  for (const [u, t] of [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']]) {
    if (E[u] && E[t]) return { url: E[u], token: E[t] };
    for (const k of keys) if (k.endsWith('_' + u)) { const tk = k.slice(0, -u.length) + t; if (E[k] && E[tk]) return { url: E[k], token: E[tk] }; }
  }
  for (const k of keys) if (/(^|_)(REDIS_URL|KV_URL)$/.test(k) && E[k]) {
    try { const x = new URL(E[k]); if (/upstash\.io$/.test(x.hostname) && x.password) return { url: 'https://' + x.hostname, token: decodeURIComponent(x.password) }; } catch {}
  }
  return {};
}
// solo los nombres (nunca los valores) de variables relacionadas, para diagnosticar la conexión
const seenVars = () => Object.keys(process.env).filter(k => /KV|REDIS|UPSTASH/.test(k)).sort();
async function redis(cmds) {
  const { url, token } = env();
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis ' + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function cleanPt(p) {
  if (!p || !num(p.lat, -90, 90) || !num(p.lng, -180, 180) || !num(p.t, 1.6e12, Date.now() + 120e3)) return null;
  const o = { t: Math.round(p.t), lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) };
  if (num(p.acc, 0, 1e5)) o.acc = Math.round(p.acc);
  if (num(p.spd, 0, 200)) o.spd = +p.spd.toFixed(2);   // m/s
  if (num(p.hdg, 0, 360)) o.hdg = Math.round(p.hdg);
  return o;
}
function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 200000) return null; }
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}

async function handler(req, res) {
  const { url, token } = env();
  if (!url || !token) return send(res, 503, { error: 'not_configured', variables: seenVars() });
  try {
    if (req.method === 'GET') {
      const q = new URL(req.url, 'http://x').searchParams, id = q.get('id') || '', after = +q.get('after') || 0;
      if (!ID_RE.test(id)) return send(res, 400, { error: 'bad_id' });
      const [meta, list] = await redis([['GET', `lt:${id}:m`], ['LRANGE', `lt:${id}:p`, 0, -1]]);
      if (!meta) return send(res, 404, { error: 'not_found' });
      const m = JSON.parse(meta), all = (list || []).map(s => JSON.parse(s)).sort((a, b) => a.t - b.t);
      return send(res, 200, { boat: m.boat || '', started: m.started, ended: m.ended || 0, now: Date.now(), last: all[all.length - 1] || null, pts: all.filter(p => p.t > after) });
    }
    const b = await readBody(req);
    if (!b || !ID_RE.test(b.id || '') || !KEY_RE.test(b.key || '')) return send(res, 400, { error: 'bad_request' });
    const [meta] = await redis([['GET', `lt:${b.id}:m`]]);
    const m = meta ? JSON.parse(meta) : null;
    if (m && m.k !== sha(b.key)) return send(res, 403, { error: 'forbidden' });
    if (req.method === 'DELETE') {
      if (!m) return send(res, 404, { error: 'not_found' });
      await redis([['SET', `lt:${b.id}:m`, JSON.stringify({ ...m, ended: Date.now() }), 'EX', TTL]]);
      return send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const pts = (Array.isArray(b.pts) ? b.pts.slice(-MAX_BATCH) : []).map(cleanPt).filter(Boolean);
    const nm = m || { k: sha(b.key), boat: String(b.boat || '').slice(0, 60), started: Date.now() };
    if (m && m.ended) delete nm.ended;   // si vuelve a publicar, el viaje sigue activo
    const cmds = [['SET', `lt:${b.id}:m`, JSON.stringify(nm), 'EX', TTL]];
    if (pts.length) cmds.push(['RPUSH', `lt:${b.id}:p`, ...pts.map(p => JSON.stringify(p))], ['LTRIM', `lt:${b.id}:p`, -MAX_PTS, -1], ['EXPIRE', `lt:${b.id}:p`, TTL]);
    await redis(cmds);
    return send(res, 200, { ok: true, saved: pts.length, upTo: pts.length ? Math.max(...pts.map(p => p.t)) : 0 });
  } catch (e) {
    return send(res, 502, { error: 'storage' });
  }
}
module.exports = handler;
module.exports.default = handler;
