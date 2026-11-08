/* Avisos al teléfono de quien reservó (Web Push estándar, sin servicios de pago).
   El cliente acepta los avisos al programar su paseo; su teléfono entrega una "suscripción" que guardamos
   en Upstash Redis junto con la fecha del paseo. Dos tareas programadas de Vercel (vercel.json › crons) envían:
     · 7:00 pm del día antes   → "Mañana zarpas"
     · 6:00 am del día del paseo → "Hoy zarpas: abre el modo a bordo"
     · 7:00 pm del día del paseo → "Tu álbum del día"
   Funciona con la app cerrada en Android, computadoras y iPhone (iOS 16.4+ con la app agregada a la pantalla de inicio).

   Variables de entorno:
     VAPID_PRIVATE_KEY   clave privada de los avisos (la pareja de VAPID_PUBLIC de abajo). Obligatoria.
     KV_REST_API_URL / KV_REST_API_TOKEN (o equivalentes de Upstash): las mismas del seguimiento en vivo.
     CRON_SECRET          opcional: si existe, solo Vercel puede disparar los envíos programados.

   GET    /api/push                       estado { ready }
   GET    /api/push?cron=am|pm            envíos programados (lo llama Vercel)
   POST   /api/push { sub, trip }         guarda la suscripción para ese paseo y manda un aviso de confirmación
   DELETE /api/push { endpoint, code, iso } quita la suscripción de ese paseo */
const crypto = require('crypto');

const VAPID_PUBLIC = 'BET47N4sj6vo2yQg3xzRNTBfE9GpS-uRJQ1b2qk6IFsNPIdWTLaOsHGJi6jVlb-vuHI1LHojChRJn2ipmXjPRJc';
const SUBJECT = 'https://tulanchalecheria.vercel.app';
const KEEP = 40 * 24 * 3600;
const CODE_RE = /^TLL-\d{4}$/, ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUSH_HOSTS = /(^|\.)(googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com|windows\.com|mozaws\.net)$/;

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
  return (await r.json()).map(x => { if (x.error) throw new Error(x.error); return x.result; });
}

/* ---------- Web Push: firma VAPID (RFC 8292) y cifrado aes128gcm (RFC 8291) ---------- */
const b64u = b => Buffer.from(b).toString('base64url');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
function vapidKey(priv) {
  const pub = Buffer.from(VAPID_PUBLIC, 'base64url');
  return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: priv, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
}
function vapidAuth(endpoint, priv) {
  const aud = new URL(endpoint).origin;
  const data = `${b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT }))}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: vapidKey(priv), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${data}.${b64u(sig)}, k=${VAPID_PUBLIC}`;
}
function encrypt(payload, p256dh, auth) {
  const ua = Buffer.from(p256dh, 'base64url'), secret = Buffer.from(auth, 'base64url');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const as = ecdh.getPublicKey(), shared = ecdh.computeSecret(ua), salt = crypto.randomBytes(16);
  const ikm = hmac(hmac(secret, shared), Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])])).subarray(0, 32);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([as.length]), as, body]);
}
async function push(sub, msg, priv) {
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: vapidAuth(sub.endpoint, priv), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'high' },
    body: encrypt(JSON.stringify(msg), sub.keys.p256dh, sub.keys.auth) });
  return r.status;
}

/* ---------- utilidades ---------- */
function send(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) return null; }
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}
const txt = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 24);
function cleanSub(s) {
  if (!s || typeof s.endpoint !== 'string' || !s.keys || typeof s.keys.p256dh !== 'string' || typeof s.keys.auth !== 'string') return null;
  let u; try { u = new URL(s.endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname) || s.endpoint.length > 1000) return null;
  if (Buffer.from(s.keys.p256dh, 'base64url').length !== 65 || Buffer.from(s.keys.auth, 'base64url').length !== 16) return null;
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}
// fecha de hoy en Venezuela (UTC-4, sin horario de verano)
const vetIso = (offsetDays = 0) => new Date(Date.now() - 4 * 36e5 + offsetDays * 864e5).toISOString().slice(0, 10);
const hourTxt = ms => new Date(ms).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' });

function message(kind, t) {
  if (kind === 'eve') return { title: 'Mañana zarpas ⛵', body: `${t.boat} · ${hourTxt(t.start)} desde ${t.dock}. Protector solar, lentes y traje de baño. ¡Nos vemos en el muelle!`, url: './#mi-viaje', tag: `tll-${t.code}-eve` };
  if (kind === 'today') return { title: 'Hoy zarpas ⛵', body: `Abre el modo a bordo antes de salir: GPS, botón SOS y ubicación en vivo para tu familia. Salida ${hourTxt(t.start)} desde ${t.dock}.`, url: `./#a-bordo/${t.code}`, tag: `tll-${t.code}-today` };
  return { title: 'Tu álbum del día 📸', body: 'Gracias por navegar con Tu Lancha. Las fotos y videos de tu paseo te esperan en la app.', url: `./#album/${t.code}`, tag: `tll-${t.code}-album` };
}

async function runCron(slot, priv) {
  // am: hoy zarpas · pm: mañana zarpas (paseos de mañana) y álbum (paseos de hoy)
  const jobs = slot === 'am' ? [[vetIso(0), 'today']] : [[vetIso(1), 'eve'], [vetIso(0), 'album']];
  let sent = 0, gone = 0;
  for (const [iso, kind] of jobs) {
    const [h] = await redis([['HGETALL', `push:d:${iso}`]]);
    const rows = []; for (let i = 0; i < (h || []).length; i += 2) rows.push([h[i], JSON.parse(h[i + 1])]);
    for (const [field, t] of rows) {
      if ((kind === 'today' || kind === 'eve') && t.abordo === false) continue;
      if (kind === 'album' && t.album === false) continue;
      const [fresh] = await redis([['SET', `push:s:${iso}:${field}:${kind}`, '1', 'NX', 'EX', 3 * 86400]]);
      if (!fresh) continue;   // ya enviado
      try {
        const st = await push(t.sub, message(kind, t), priv);
        if (st === 404 || st === 410) { await redis([['HDEL', `push:d:${iso}`, field]]); gone++; } else if (st < 300) sent++;
      } catch {}
    }
  }
  return { sent, gone };
}

async function handler(req, res) {
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  const { url, token } = env();
  const ready = !!(priv && url && token);
  try {
    if (req.method === 'GET') {
      const q = new URL(req.url, 'http://x').searchParams, slot = q.get('cron');
      if (!slot) return send(res, 200, { ready, key: VAPID_PUBLIC, missing: [!priv && 'VAPID_PRIVATE_KEY', !(url && token) && 'Upstash'].filter(Boolean) });
      if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return send(res, 401, { error: 'unauthorized' });
      if (!ready) return send(res, 503, { error: 'not_configured' });
      return send(res, 200, { ok: true, slot, ...(await runCron(slot === 'am' ? 'am' : 'pm', priv)) });
    }
    if (!ready) return send(res, 503, { error: 'not_configured' });
    const b = await readBody(req); if (!b) return send(res, 400, { error: 'bad_request' });
    if (req.method === 'DELETE') {
      if (!CODE_RE.test(b.code || '') || !ISO_RE.test(b.iso || '') || typeof b.endpoint !== 'string') return send(res, 400, { error: 'bad_request' });
      await redis([['HDEL', `push:d:${b.iso}`, sha(b.endpoint) + ':' + b.code]]);
      return send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const sub = cleanSub(b.sub), t = b.trip || {};
    if (!sub || !CODE_RE.test(t.code || '') || !ISO_RE.test(t.iso || '') || !Number.isFinite(t.start)) return send(res, 400, { error: 'bad_request' });
    const until = Date.parse(t.iso + 'T00:00:00-04:00');
    if (!(until > Date.now() - 2 * 864e5 && until < Date.now() + 400 * 864e5)) return send(res, 400, { error: 'bad_date' });
    const row = { sub, code: t.code, iso: t.iso, start: t.start, boat: txt(t.boat, 60), dock: txt(t.dock, 60), abordo: t.abordo !== false, album: t.album !== false };
    await redis([['HSET', `push:d:${t.iso}`, sha(sub.endpoint) + ':' + t.code, JSON.stringify(row)], ['EXPIRE', `push:d:${t.iso}`, KEEP]]);
    let test = 0;
    if (b.confirm) { const day = new Date(until).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Caracas' });
      try { test = await push(sub, { title: 'Avisos activados ⚓', body: `Te avisaremos el día antes y la mañana de tu paseo (${day}).`, url: './#mi-viaje', tag: `tll-${t.code}-ok` }, priv); } catch {} }
    return send(res, 200, { ok: true, test });
  } catch (e) {
    return send(res, 502, { error: 'push' });
  }
}
module.exports = handler;
module.exports.default = handler;
module.exports._t = { encrypt, vapidAuth, cleanSub, message, VAPID_PUBLIC };
