(() => {
'use strict';
/* ================= Panel de control de Eduardo =================
   Acceso oculto: dirección #capitan, o tocar 6 veces seguidas el logo del pie de página.
   Usuario y contraseña se verifican en el servidor (api/admin.js); la sesión dura 12 horas.
   Desde aquí Eduardo edita lo que ve el cliente (embarcaciones, fotos, precios, rumbos, playas, muelles,
   pagos y aliados), sigue las reservas que llegan de la app y ve sus números.
   Los cambios se preparan en borrador y se publican con un botón; se guardan las últimas 15 versiones. */
const T = window.TLL;
const { $, $$, money, store, toast, iso, today, ACC, DEF, art } = T;
const API = '/api/admin';
const adm = $('#adm');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const TYPES = ['Lancha', 'Barco', 'Mini yate', 'Yate'];
const CHANNELS = ['WhatsApp directo', 'Instagram', 'Web · app', 'Referido', 'Tarjeta de regalo', 'Cliente recurrente', 'Aliado'];
const LANG_N = { es: 'Español', en: 'Inglés', pt: 'Portugués' };   // pt: reservas viejas
const ST = { nueva: ['nue', 'Nueva'], confirmada: ['ok', 'Confirmada'], cancelada: ['can', 'Cancelada'] };
const LATE = [[0, 'No permite hora extra'], [19, 'Hasta las 7:00 pm'], [20, 'Hasta las 8:00 pm'], [21, 'Hasta las 9:00 pm'], [22, 'Hasta las 10:00 pm']];
/* medidas de cada tipo de foto: se recortan y comprimen solas en el teléfono antes de subirlas */
const IMG = {
  boat: { w: 1600, h: 1000, min: 1000, fit: 'cover', label: 'horizontal 16:10', size: '1600 × 1000 px' },
  beach: { w: 1200, h: 1200, min: 800, fit: 'cover', label: 'cuadrada 1:1', size: '1200 × 1200 px' },
  logo: { w: 512, h: 512, min: 200, fit: 'contain', label: 'cuadrada, logo completo', size: '512 × 512 px' },
  qr: { w: 600, h: 600, min: 250, fit: 'contain', label: 'cuadrada, QR completo', size: '600 × 600 px', png: true },   // PNG sin pérdida para que el QR se pueda escanear
  hero: { w: 1920, h: 1080, min: 1200, fit: 'cover', label: 'horizontal 16:9', size: '1920 × 1080 px' },
  card: { w: 900, h: 1200, min: 600, fit: 'cover', label: 'vertical 3:4', size: '900 × 1200 px' },
  cover: { w: 1200, h: 800, min: 800, fit: 'cover', label: 'horizontal 3:2', size: '1200 × 800 px' }
};
const DOCS = [['lic', 'Licencia de navegación'], ['radio', 'Licencia de radio'], ['patron', 'Patrón del capitán'], ['fuel', 'Permiso de combustible']];
const SIZE_L = [['', 'Automático (según tipo y pies)'], ['s', 'Lancha pequeña'], ['m', 'Lancha mediana'], ['my', 'Mini yate'], ['y', 'Yate o barco']];
// documentos que vencen en los próximos 30 días (o ya vencidos)
const docAlerts = () => { const t = iso(today), lim = iso(new Date(today.getTime() + 30 * 864e5)), out = [];
  W.boats.forEach(b => DOCS.forEach(([k, l]) => { const v = b.docs && b.docs[k]; if (v && v <= lim) out.push({ b: b.name, l, v, gone: v < t }); }));
  return out.sort((a, b) => a.v < b.v ? -1 : 1); };

let TOK = null, W = null, PUB = '', BK = [], tab = 'inicio', period = 'mes', demo = false, idleT, bkFilter = 'proximas', bkQuery = '';

/* ---------------- sesión ---------------- */
const SKEY = 'tll:adm-s';
function loadTok() { try { const s = JSON.parse(sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch { return null; } }
function saveTok(s, remember) { try { (remember ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify(s)); } catch {} }
function dropTok() { try { sessionStorage.removeItem(SKEY); localStorage.removeItem(SKEY); } catch {} TOK = null; }
async function api(a, body, get) {
  const opt = { method: get ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
  if (TOK) opt.headers.Authorization = 'Bearer ' + TOK.t;
  if (!get) opt.body = JSON.stringify(body || {});
  let r;
  try { r = await fetch(`${API}?a=${a}${get ? '&_=' + Date.now() : ''}`, opt); } catch { throw Object.assign(new Error('net'), { code: 'net' }); }
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 && j.error === 'session') { dropTok(); showLogin('Tu sesión terminó. Entra de nuevo.'); throw Object.assign(new Error('session'), { code: 'session' }); }
  if (!r.ok) throw Object.assign(new Error(j.error || 'http'), { code: j.error || 'http', status: r.status, data: j });
  return j;
}
const errMsg = e => ({ net: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.', not_configured: 'El servidor aún no tiene la base de datos conectada (Upstash en Vercel).', storage: 'El servidor no pudo guardar. Intenta de nuevo en un momento.', too_big: 'El archivo es demasiado grande.' }[e.code] || 'Algo salió mal. Intenta de nuevo.');

/* ---------------- login ---------------- */
function lockScroll(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }
function showLogin(msg = '') {
  const d = $('#dlg'); if (d && d.open) d.close();
  adm.hidden = false; lockScroll(true);
  adm.innerHTML = `<div class="adm-login"><form id="lg" autocomplete="on">
    <img src="${$('.brand img').src}" alt="" width="72" height="72">
    <div style="text-align:center;display:grid;gap:4px"><h2 style="font-size:1.4rem">Panel de control</h2><span class="rating">Acceso exclusivo para la administración de Tu Lancha Lechería</span></div>
    <div class="field"><label for="lg-u">Usuario</label><input id="lg-u" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
    <div class="field"><label for="lg-p">Contraseña</label><div style="display:flex;gap:6px"><input id="lg-p" name="password" type="password" autocomplete="current-password" required style="flex:1;min-width:0"><button type="button" class="icon-btn" id="lg-eye" aria-label="Mostrar contraseña">Ver</button></div></div>
    <label class="ad-check"><input type="checkbox" id="lg-rem"> Mantener la sesión abierta en este dispositivo</label>
    <p class="err" id="lg-err" role="alert">${esc(msg)}</p>
    <button class="btn btn-sun" type="submit" id="lg-go">Entrar</button>
    <button class="btn btn-ghost btn-sm" type="button" id="lg-x">Volver a la web</button></form></div>`;
  $('#lg-eye').onclick = () => { const p = $('#lg-p'); p.type = p.type === 'password' ? 'text' : 'password'; $('#lg-eye').textContent = p.type === 'password' ? 'Ver' : 'Ocultar'; };
  $('#lg-x').onclick = closeAdm;
  $('#lg').onsubmit = async e => {
    e.preventDefault();
    const go = $('#lg-go'); go.disabled = true; go.textContent = 'Verificando…'; $('#lg-err').textContent = '';
    try {
      const j = await api('login', { user: $('#lg-u').value.trim(), pass: $('#lg-p').value });
      TOK = { t: j.token, exp: j.expires, role: j.role || 'owner' }; saveTok(TOK, $('#lg-rem').checked);
      await boot();
    } catch (err) {
      $('#lg-err').textContent = err.code === 'bad_login' ? `Usuario o contraseña incorrectos.${err.data && err.data.left <= 3 ? ` Te quedan ${err.data.left} intentos antes de un bloqueo de 15 minutos.` : ''}`
        : err.code === 'locked' ? 'Demasiados intentos. Por seguridad, espera 15 minutos antes de intentar de nuevo.' : errMsg(err);
      go.disabled = false; go.textContent = 'Entrar'; $('#lg-p').select();
    }
  };
  setTimeout(() => $('#lg-u').focus(), 50);
}
function closeAdm() {
  if (dirty() && !confirm('Tienes cambios sin publicar. ¿Salir de todas formas? Los cambios se pierden.')) return;
  adm.hidden = true; adm.innerHTML = ''; lockScroll(false); W = null;
  if (location.hash === '#capitan') history.replaceState(null, '', location.pathname + location.search);
}
async function logout() { try { await api('logout'); } catch {} dropTok(); W = null; adm.hidden = true; adm.innerHTML = ''; lockScroll(false); toast('Sesión cerrada'); if (location.hash === '#capitan') history.replaceState(null, '', location.pathname); }
function bump() { clearTimeout(idleT); idleT = setTimeout(() => { if (TOK && !dirty()) { dropTok(); showLogin('Sesión cerrada por inactividad.'); } }, 30 * 60e3); }
['pointerdown', 'keydown'].forEach(ev => adm.addEventListener(ev, bump, { passive: true }));

/* ---------------- datos de trabajo ---------------- */
function fromCat(c) {
  c = T.migrateCat(c);   // catálogos viejos pasan al formato nuevo (fotos, precios por rumbo, muelles)
  const o = {
    v: T.CAT_V,
    boats: Array.isArray(c.boats) && c.boats.length ? c.boats : clone(DEF.boats),
    routes: Array.isArray(c.routes) && c.routes.length ? c.routes : clone(DEF.routes),
    docks: Array.isArray(c.docks) && c.docks.length ? c.docks : clone(DEF.docks),
    allies: Array.isArray(c.allies) && c.allies.length ? c.allies : clone(DEF.allies),
    basic: Array.isArray(c.basic) && c.basic.length ? c.basic : clone(DEF.basic),
    special: Array.isArray(c.special) && c.special.length ? c.special : clone(DEF.special),
    pay: T.normPay(c.pay),
    shop: Array.isArray(c.shop) ? c.shop : clone(DEF.shop),
    food: Array.isArray(c.food) ? c.food : clone(DEF.food),
    rent: Array.isArray(c.rent) ? c.rent : clone(DEF.rent),
    maxDays: +c.maxDays > 0 ? +c.maxDays : DEF.maxDays,
    home: { hero: '', cards: {}, exp: {}, expTxt: {}, ...(c.home && typeof c.home === 'object' ? c.home : {}) },
    beachPhotos: c.beachPhotos || {},
    seasons: Array.isArray(c.seasons) ? c.seasons : [],
    hiPct: +c.hiPct || 0,
    tr: c.tr || [],
    tx: c.tx && typeof c.tx === 'object' && !Array.isArray(c.tx) ? c.tx : {},
    vid: c.vid && typeof c.vid === 'object' && !Array.isArray(c.vid) ? c.vid : {},
    lock: Array.isArray(c.lock) ? c.lock : [],
    press: Array.isArray(c.press) ? c.press : []
  };
  // campos que el editor necesita, listos desde el inicio para que abrir algo no cuente como cambio
  o.boats.forEach(b => { ['photos', 'opt', 'pick', 'rp', 'qty', 'docs'].forEach(k => { if (!b[k] || typeof b[k] !== 'object') b[k] = {}; }); ['inc', 'amen'].forEach(k => { if (!Array.isArray(b[k])) b[k] = []; }); });
  o.docks.forEach(d => { if (d.pickup && !d.cost) d.cost = {}; });
  o.home.exp ||= {}; o.home.expTxt ||= {};
  o.shop.forEach(x => { if (!x.kind) x.kind = T.shopKind(x); });
  return o;
}
const snap = () => JSON.stringify(W);
const dirty = () => !!W && snap() !== PUB;
async function boot() {
  adm.innerHTML = '<div class="adm-login"><p class="rating" style="color:#fff">Cargando tu panel…</p></div>';
  try {
    const [c, b] = await Promise.all([api('cat', null, true), api('books', null, true)]);
    W = fromCat(c); PUB = snap(); BK = b.list || [];
  } catch (e) { if (e.code !== 'session') showLogin(errMsg(e)); return; }
  render();
  if (!store.get('adm-welcome', false)) help('bienvenida');
}

/* ---------------- utilidades de interfaz ---------------- */
const getPath = (o, p) => p.split('.').reduce((x, k) => x == null ? x : x[k], o);
function setPath(o, p, v) { const ks = p.split('.'), last = ks.pop(); const t = ks.reduce((x, k) => x[k] == null || typeof x[k] !== 'object' ? (x[k] = {}) : x[k], o); if (v === undefined || (v === null && /\.(rpH|kp|kpH)\./.test(p))) delete t[last]; else t[last] = v; }
const inp = (k, label, o = {}) => { const v = getPath(W, k); const id = 'i-' + k.replace(/\./g, '-');
  if (o.area) return `<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${label}</label><textarea id="${id}" data-k="${k}" rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(v ?? '')}</textarea>${o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
  if (o.sel) return `<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${label}</label><select id="${id}" data-k="${k}" data-t="${o.t || ''}">${o.sel.map(([val, l]) => `<option value="${esc(val)}"${String(val) === String(v ?? o.def ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
  if (o.t === 'bool') return `<label class="ad-check${o.cls ? ' ' + o.cls : ''}"><input type="checkbox" data-k="${k}" data-t="bool"${v ? ' checked' : ''}> ${label}</label>`;
  const val = o.t === 'list' ? (v || []).join(', ') : v ?? '';
  return `<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${label}</label><input id="${id}" data-k="${k}" data-t="${o.t || ''}" value="${esc(val)}"${o.t === 'num' || o.t === 'numn' ? ` type="number" inputmode="decimal" min="${o.min ?? 0}" step="${o.step ?? 1}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.type ? ` type="${o.type}"` : ''}>${o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
};
function readVal(el) {
  const t = el.dataset.t;
  if (t === 'bool') return el.checked || undefined;
  if (t === 'num') return el.value === '' ? 0 : +el.value;
  if (t === 'numn') return el.value === '' ? null : +el.value;    // vacío = se confirma por WhatsApp
  if (t === 'list') return el.value.split(',').map(x => x.trim()).filter(Boolean);
  if (t === 'int') return +el.value;
  return el.value;
}
const helpBtn = (k, txt = 'Cómo funciona') => `<button type="button" class="ad-help" data-help="${k}"><span aria-hidden="true">?</span>${txt}</button>`;
const specText = kind => { const s = IMG[kind]; return s ? `${s.size} · ${s.label}${s.min ? ` · mín. ${s.min} px` : ''}${s.png ? ' · PNG' : ''}` : ''; };
const photoSlot = (path, kind, label, small) => { const u = getPath(W, path); const spec = specText(kind);
  return `<div class="ad-photo k-${kind}${small ? ' sm' : ''}"><div class="ad-ph-img">${u ? `<img src="${esc(u)}" alt="">` : `<span class="ad-ph-empty">Sin foto</span>`}</div>
    <div class="ad-ph-b">${label ? `<b>${label}</b>` : ''}${spec ? `<small class="ad-ph-spec" title="Tamaño recomendado para que se vea nítida, sin recortes ni pixeleo">📐 ${spec}</small>` : ''}<div class="adm-tools"><button type="button" class="icon-btn" data-up="${path}" data-kind="${kind}">${u ? 'Cambiar' : 'Subir foto'}</button>${u ? `<button type="button" class="icon-btn" data-rmph="${path}">Quitar</button>` : ''}</div></div></div>`; };

/* ---------------- estructura del panel ---------------- */
const TABS = [['inicio', 'Resumen'], ['reservas', 'Reservas'], ['flota', 'Embarcaciones'], ['precios', 'Precios'], ['rumbos', 'Rumbos y playas'], ['muelles', 'Muelles'], ['pagos', 'Pagos'], ['aliados', 'Servicio a bordo'], ['propietarios', 'Propietarios'], ['portada', 'Portada y tienda'], ['contenido', 'Textos y videos'], ['ajustes', 'Ajustes'], ['mant', 'Mantenimiento']];
function render() {
  bump(); adm.hidden = false; lockScroll(true);
  if ((tab === 'mant' && !isDev()) || lockedTab(tab)) tab = 'inicio';
  const nNew = BK.filter(b => b.status === 'nueva').length;
  const sc = adm.scrollTop;
  adm.innerHTML = `<div class="ad">
    <header class="adm-bar"><div class="wrap"><img src="${$('.brand img').src}" alt="" width="34" height="34" class="ad-logo"><b>Panel de control</b>
      <div class="sp"><a class="btn btn-ghost on-sea btn-sm" href="./" target="_blank" rel="noopener">Ver la web</a><button class="btn btn-ghost on-sea btn-sm" type="button" data-help="bienvenida">Ayuda</button><button class="btn btn-sun btn-sm" type="button" id="a-out">Salir</button></div></div>
      <nav class="ad-tabs wrap" aria-label="Secciones del panel">${TABS.filter(([k]) => (k !== 'mant' || isDev()) && !lockedTab(k)).map(([k, l]) => `<button type="button" data-adtab="${k}" aria-current="${k === tab ? 'page' : 'false'}">${l}${k === 'reservas' && nNew ? ` <i>${nNew}</i>` : ''}</button>`).join('')}</nav></header>
    <main class="wrap adm-main ad-body" id="ad-main">${VIEW[tab]()}</main>
    <div class="ad-save" ${dirty() ? '' : 'hidden'}><div class="wrap"><span><b>Tienes cambios sin publicar.</b> Los clientes verán los cambios cuando los publiques.</span><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" id="a-discard">Descartar</button><button class="btn btn-sun btn-sm" type="button" id="a-pub">Publicar cambios</button></div></div></div>
  </div>`;
  adm.scrollTop = sc;
  if (tab === 'inicio') wireChart();
}
function refreshSaveBar() { const s = $('.ad-save', adm); if (s) s.hidden = !dirty(); }

/* ---------------- resumen ---------------- */
function sample() {
  const r = T.rnd('adm-demo'), list = [], names = ['María G.', 'José P.', 'Andreína M.', 'Carlos R.', 'Daniela V.', 'Luis A.', 'Gabriela S.', 'Pedro C.', 'Valentina H.', 'Ricardo T.'];
  const boats = W.boats.filter(b => !b.hidden), season = [1.4, 1.3, 1, 1.3, .8, .8, 1.3, 1.4, .8, .8, .9, 1.6];
  for (let m = -11; m <= 1; m++) {
    const f = new Date(today.getFullYear(), today.getMonth() + m, 1), days = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
    const n = Math.round((7 + r() * 5) * season[f.getMonth()] * (m === 1 ? .35 : 1));
    for (let i = 0; i < n; i++) {
      const d = new Date(f.getFullYear(), f.getMonth(), 1 + Math.floor(r() * days)), b = boats[Math.floor(Math.pow(r(), 1.4) * boats.length)], rt = W.routes[Math.floor(r() * W.routes.length)];
      const total = Math.round(b.price * (d.getDay() % 6 ? 1 : 1.1) + (r() < .5 ? 40 + r() * 180 : 0)), fut = d > today;
      list.push({ code: 'D-' + i + m, iso: iso(d), boat: b.name, route: rt.name, pax: Math.max(2, Math.round(b.pax * (.5 + r() * .5))), total, paid: fut ? (r() < .6 ? Math.round(total / 2) : 0) : total, channel: CHANNELS[Math.floor(r() * CHANNELS.length)], name: names[Math.floor(r() * names.length)], lang: r() < .75 ? 'es' : 'en', status: fut ? (r() < .5 ? 'nueva' : 'confirmada') : 'confirmada' });
    }
  }
  return list;
}
const BKS = () => (demo ? sample() : BK).filter(b => b.status !== 'cancelada');
function range(p) {
  const y = today.getFullYear(), m = today.getMonth();
  if (p === 'mes') return [new Date(y, m, 1), new Date(y, m + 1, 1), new Date(y, m - 1, 1)];
  if (p === '3m') return [new Date(y, m - 2, 1), new Date(y, m + 1, 1), new Date(y, m - 5, 1)];
  return [new Date(y, m - 11, 1), new Date(y, m + 1, 1), new Date(y, m - 23, 1)];
}
const dOf = b => b.iso || (b.created ? iso(new Date(b.created)) : '');
const inR = (b, a, z) => { const d = dOf(b); return d >= iso(a) && d < iso(z); };
const comm = () => store.get('adm-comm', 20);
function stats(l) { const rev = l.reduce((s, b) => s + (+b.total || 0), 0), paid = l.reduce((s, b) => s + Math.min(+b.paid || 0, +b.total || 0), 0); return { n: l.length, rev, paid, due: rev - paid, avg: l.length ? rev / l.length : 0, pax: l.reduce((s, b) => s + (+b.pax || 0), 0) }; }
function delta(a, b) { if (!b) return ''; const d = (a - b) / b * 100; return `<small class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% vs. período anterior</small>`; }
function group(l, f, val = b => +b.total || 0) { const m = {}; l.forEach(b => { const k = f(b) || '—'; m[k] = (m[k] || 0) + val(b); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
function hbars(rows, fmt = money) { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<div class="hbars">${rows.slice(0, 7).map(([k, v]) => `<div class="hb"><span class="lbl">${esc(k)}</span><span class="tr"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><b>${fmt(v)}</b></div>`).join('')}</div>` : '<p class="rating">Sin datos en este período.</p>'; }
function monthChart(all) {
  const y = today.getFullYear(), m = today.getMonth(), months = [];
  for (let i = 11; i >= 0; i--) { const a = new Date(y, m - i, 1), z = new Date(y, m - i + 1, 1), l = all.filter(b => inR(b, a, z)); months.push({ lbl: MES[a.getMonth()], full: a.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }), v: l.reduce((s, b) => s + (+b.total || 0), 0), n: l.length }); }
  const W_ = 640, H = 220, pl = 48, pb = 24, pt = 10, max = Math.max(100, ...months.map(x => x.v));
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1), top = Math.ceil(max / step) * step, ys = v => pt + (H - pt - pb) * (1 - v / top), bw = (W_ - pl) / 12;
  let g = ''; for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${pl}" x2="${W_}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 8}" y="${ys(v) + 4}" text-anchor="end">${v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + v}</text>`;
  const bars = months.map((x, i) => { const x0 = pl + i * bw + bw * .2, w = bw * .6, y0 = ys(x.v), h = Math.max(0, H - pb - y0), r = Math.min(4, w / 2, h);
    return `<g data-tip="${esc(x.full)}: ${money(x.v)} · ${x.n} reservas"><rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}"/><path class="bar ${i === 11 ? 'hi' : ''}" d="M${x0} ${H - pb} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + w - r} Q${x0 + w} ${y0} ${x0 + w} ${y0 + r} V${H - pb}Z"/><text x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${x.lbl}</text></g>`; }).join('');
  return `<div class="chart" id="mchart"><svg viewBox="0 0 ${W_} ${H}" role="img" aria-label="Ingresos por mes, últimos 12 meses">${g}${bars}</svg><div class="tip" id="mtip"></div></div>`;
}
function wireChart() {
  const ch = $('#mchart', adm), tip = $('#mtip', adm); if (!ch) return;
  const show = g => { const r = g.getBoundingClientRect(), cr = ch.getBoundingClientRect(); tip.textContent = g.dataset.tip; const hw = tip.offsetWidth / 2 + 4; tip.style.left = Math.min(cr.width - hw, Math.max(hw, r.left - cr.left + r.width / 2)) + 'px'; tip.classList.add('on'); };
  ch.addEventListener('pointerover', e => { const g = e.target.closest('[data-tip]'); if (g) show(g); });
  ch.addEventListener('pointerdown', e => { const g = e.target.closest('[data-tip]'); if (g) show(g); });
  ch.addEventListener('pointerleave', () => tip.classList.remove('on'));
}
const VIEW = {};
VIEW.inicio = () => {
  const all = BKS(), [a, z, pa] = range(period), cur = all.filter(b => inR(b, a, z)), prev = all.filter(b => inR(b, pa, a)), S = stats(cur), P = stats(prev);
  const up = all.filter(b => dOf(b) >= iso(today)).sort((x, y) => dOf(x) < dOf(y) ? -1 : 1);
  const plbl = { mes: 'Este mes', '3m': 'Últimos 3 meses', '12m': 'Últimos 12 meses' }[period], c = comm();
  const nNew = BK.filter(b => b.status === 'nueva').length;
  return `<div class="ad-head"><div><h2>Hola, Eduardo 👋</h2><p class="rating">${demo ? 'Estás viendo <b>datos de ejemplo</b> para conocer el panel.' : BK.length ? `Tienes ${BK.length} reservas registradas${nNew ? ` y <b>${nNew} nuevas por revisar</b>` : ''}.` : 'Aún no hay reservas registradas. Las que hagan tus clientes en la app aparecerán aquí solas.'}</p></div>
    <div class="adm-tools"><div class="seg light" role="group" aria-label="Período">${[['mes', 'Mes'], ['3m', '3 meses'], ['12m', '12 meses']].map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${k === period}">${l}</button>`).join('')}</div>${helpBtn('inicio')}</div></div>
    ${!BK.length || demo ? `<div class="panel ad-note"><b>${demo ? 'Datos de ejemplo activados' : '¿Quieres ver cómo se verá con datos?'}</b><span class="rating">${demo ? 'Nada de esto es real ni se guarda. Desactívalo para ver tus números.' : 'Activa los datos de ejemplo para conocer las gráficas. No se guardan ni afectan nada.'}</span><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" id="a-demo">${demo ? 'Ver mis datos reales' : 'Ver con datos de ejemplo'}</button></div></div>` : ''}
    ${(() => { const L = W.boats.filter(b => !b.hidden && b.type !== 'Lancha' && !(+b.kts > 0)); return L.length ? `<div class="panel ad-alert"><b>Falta la velocidad de navegación</b><span>${L.map(b => esc(b.name)).join(' · ')}</span><span class="rating">Agrégala en Embarcaciones → Editar → Datos (nudos) para que se vea en la web.</span></div>` : ''; })()}
    ${(() => { const A = docAlerts(); return A.length ? `<div class="panel ad-alert ad-docs"><b>Documentos por vencer</b>${A.map(x => `<span>${esc(x.b)} · ${esc(x.l)}: <b>${x.gone ? 'venció' : 'vence'} el ${esc(fmtD(x.v))}</b></span>`).join('')}<span class="rating">Actualiza la fecha en Embarcaciones → Editar → Documentos.</span></div>` : ''; })()}
    ${nNew && !demo ? `<button type="button" class="panel ad-alert" data-adtab="reservas"><b>${nNew} reserva${nNew > 1 ? 's' : ''} nueva${nNew > 1 ? 's' : ''} por confirmar</b><span>Revísalas y confírmalas en Reservas →</span></button>` : ''}
    <div class="adm-kpis">
      <div class="akpi"><span>Ventas · ${plbl}</span><b>${money(S.rev)}</b>${delta(S.rev, P.rev)}</div>
      <div class="akpi"><span>Cobrado</span><b>${money(S.paid)}</b><small>${S.rev ? Math.round(S.paid / S.rev * 100) : 0}% de las ventas</small></div>
      <div class="akpi"><span>Por cobrar</span><b>${money(S.due)}</b><small>${cur.filter(b => (+b.paid || 0) < (+b.total || 0)).length} reservas con saldo</small></div>
      <div class="akpi"><span>Reservas</span><b>${S.n}</b>${delta(S.n, P.n)}</div>
      <div class="akpi"><span>Ticket promedio</span><b>${money(S.avg)}</b>${delta(S.avg, P.avg)}</div>
      <div class="akpi"><span>Tu comisión (${c}%)</span><b>${money(S.rev * c / 100)}</b><small>${S.pax} pasajeros</small></div>
    </div>
    <div class="panel"><h3>Ventas por mes <small>últimos 12 meses · toca una barra</small></h3>${monthChart(all)}</div>
    <div class="adm-3">
      <div class="panel"><h3>Por embarcación <small>${plbl}</small></h3>${hbars(group(cur, b => b.boat))}</div>
      <div class="panel"><h3>Rumbos más pedidos <small>${plbl}</small></h3>${hbars(group(cur, b => String(b.route || '').split(':')[0].split(' · ')[0]))}</div>
      <div class="panel"><h3>Cómo llegan <small>${plbl}</small></h3>${hbars(group(cur, b => b.channel), v => v ? money(v) : '$0')}</div>
    </div>
    <div class="adm-2">
      <div class="panel"><h3>Próximas salidas <small>${up.length} agendadas</small></h3>${up.length ? `<div class="ad-list">${up.slice(0, 7).map(b => `<div class="ad-li"><span class="mono">${esc(fmtD(dOf(b)))}</span><span><b>${esc(b.name)}</b><small>${esc(b.boat)} · ${b.pax} pers.</small></span><span class="st ${ST[b.status || 'nueva'][0]}">${ST[b.status || 'nueva'][1]}</span></div>`).join('')}</div>` : '<p class="rating">No hay salidas agendadas.</p>'}</div>
      <div class="panel"><h3>Idioma de tus clientes <small>${plbl}</small></h3>${hbars(group(cur, b => LANG_N[b.lang || 'es'], () => 1), v => v + (v === 1 ? ' reserva' : ' reservas'))}<p class="rating">La web abre en español; el cliente puede cambiarla a inglés con el botón EN. Te escribe por WhatsApp en ese idioma.</p></div>
    </div>`;
};
const fmtD = s => { if (!s) return '—'; const d = new Date(s + 'T12:00'); return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' }); };

/* ---------------- reservas ---------------- */
VIEW.reservas = () => {
  const t = iso(today), q = bkQuery.toLowerCase();
  const F = { proximas: b => dOf(b) >= t && b.status !== 'cancelada', nuevas: b => b.status === 'nueva', pasadas: b => dOf(b) < t, todas: () => true, canceladas: b => b.status === 'cancelada' };
  const l = BK.filter(F[bkFilter]).filter(b => !q || [b.name, b.code, b.phone, b.boat].join(' ').toLowerCase().includes(q)).sort((a, b) => bkFilter === 'pasadas' || bkFilter === 'todas' ? (dOf(a) < dOf(b) ? 1 : -1) : (dOf(a) < dOf(b) ? -1 : 1));
  return `<div class="ad-head"><div><h2>Reservas</h2><p class="rating">Las reservas hechas en la app llegan aquí solas. Las de WhatsApp las puedes registrar tú.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-bk-new>+ Registrar reserva</button>${helpBtn('reservas')}</div></div>
    <div class="ad-filters"><div class="seg light">${[['proximas', 'Próximas'], ['nuevas', 'Nuevas'], ['pasadas', 'Pasadas'], ['canceladas', 'Canceladas'], ['todas', 'Todas']].map(([k, l2]) => `<button type="button" data-bkf="${k}" aria-pressed="${k === bkFilter}">${l2}</button>`).join('')}</div>
      <input type="search" id="bk-q" placeholder="Buscar por nombre, código o teléfono" value="${esc(bkQuery)}" aria-label="Buscar reservas"></div>
    ${l.length ? `<div class="ad-bks">${l.map(bkCard).join('')}</div>` : `<div class="panel"><p class="rating">${BK.length ? 'No hay reservas con este filtro.' : 'Todavía no hay reservas. Cuando un cliente confirme en la app, aparecerá aquí con su código, sus datos y el total.'}</p></div>`}
    <div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" id="bk-csv">Descargar reservas (Excel)</button></div>`;
};
function bkCard(b) {
  const s = ST[b.status || 'nueva'], due = Math.max(0, (+b.total || 0) - (+b.paid || 0));
  return `<article class="ad-bk" data-code="${esc(b.code)}"><div class="ad-bk-h"><span class="mono">${esc(b.code)}</span><span class="st ${s[0]}">${s[1]}</span>${b.src === 'web' ? '<span class="tag">App</span>' : '<span class="tag">Manual</span>'}${b.lang && b.lang !== 'es' ? `<span class="tag">${LANG_N[b.lang]}</span>` : ''}</div>
    <h4>${esc(b.name || 'Sin nombre')}</h4>
    <p>${esc(fmtD(dOf(b)))}${b.hours ? ' · ' + esc(b.hours) : ''}</p>
    <p class="rating">${esc(b.boat)} · ${b.pax || '—'} pers.${b.dock ? ' · ' + esc(b.dock) : ''}</p>
    ${b.route ? `<p class="rating">${esc(b.route)}</p>` : ''}${T.okPin(b.pin) ? `<button type="button" class="ad-pin" data-bka="map"><span class="ad-pin-ic" aria-hidden="true">${T.PIN_SVG}</span><span><b>Muelle escogido por el cliente</b><small>${b.pin.ref ? esc(b.pin.ref) + ' · ' : ''}<span class="mono">${T.pinTxt(b.pin)}</span></small></span><span class="ad-pin-go">Ver mapa</span></button>` : ''}${b.note ? `<p class="rating">📝 ${esc(b.note)}</p>` : ''}${b.det ? `<p class="rating ad-det">${esc(b.det).replace(/\n/g, '<br>')}</p>` : ''}${b.survey ? `<p class="ad-sv"><b>${'★'.repeat(b.survey.stars)}${'☆'.repeat(5 - b.survey.stars)}</b> Encuesta del cliente${b.survey.rec === 1 ? ' · nos recomienda' : b.survey.rec === 0 ? ' · no nos recomienda' : ''}${b.survey.good ? `<br><small>👍 ${esc(b.survey.good)}</small>` : ''}${b.survey.better ? `<br><small>🛠 ${esc(b.survey.better)}</small>` : ''}</p>` : ''}
    <div class="ad-bk-m"><span>Total <b>${money(+b.total || 0)}</b></span><span>Pagado <b>${money(+b.paid || 0)}</b></span><span class="${due ? 'due' : 'ok'}">${due ? 'Falta ' + money(due) : 'Pagado ✓'}</span></div>
    <div class="adm-tools">${b.status !== 'confirmada' && b.status !== 'cancelada' ? '<button class="icon-btn pri" type="button" data-bka="ok">Confirmar</button>' : ''}${due ? `<button class="icon-btn" type="button" data-bka="half">Abono 50%</button><button class="icon-btn" type="button" data-bka="paid">Marcar pagado</button>` : ''}${b.phone ? '<button class="icon-btn" type="button" data-bka="wa">WhatsApp</button>' : ''}${ownerOf(b) ? '<button class="icon-btn" type="button" data-bka="owner">Enviar al propietario</button>' : ''}<button class="icon-btn" type="button" data-bka="edit">Editar</button>${b.status !== 'cancelada' ? '<button class="icon-btn" type="button" data-bka="cancel">Cancelar</button>' : '<button class="icon-btn" type="button" data-bka="del">Borrar</button>'}</div></article>`;
}
// propietario de la embarcación reservada (su WhatsApp se carga en Embarcaciones → Editar)
const ownerOf = b => { const x = W && W.boats.find(y => y.name === b.boat); const n = x && String(x.ownerWa || '').replace(/\D/g, ''); return n && n.length >= 10 ? n : ''; };
const ownerMsg = b => `⚓ Reserva ${b.code} · Tu Lancha Lechería\n🚤 ${b.boat || ''}\n📅 ${fmtD(dOf(b))}${b.hours ? ' · ' + b.hours : ''}\n🧭 ${b.route || '—'}\n📍 ${b.dock || '—'}${T.okPin(b.pin) ? ' · ' + T.gmapsUrl(b.pin) : ''}\n👥 ${b.pax || '—'} pers.${+b.kids ? ` + ${b.kids} niños` : ''}\n👤 ${b.name || ''}${b.det ? '\n\nExtras y detalle:\n' + b.det : ''}${b.note ? '\n\n📝 Observaciones: ' + b.note : ''}\n\nEstado: ${ST[b.status || 'nueva'][1]}`;
const ownerUrl = b => `https://wa.me/${ownerOf(b)}?text=${encodeURIComponent(ownerMsg(b))}`;
async function saveBk(x) { const j = await api('bk', { booking: x }); const i = BK.findIndex(b => b.code === j.booking.code); if (i >= 0) BK[i] = j.booking; else BK.push(j.booking); return j.booking; }
function bkForm(b) {
  b = b || { iso: iso(new Date(today.getTime() + 864e5)), pax: 6, total: 0, paid: 0, channel: 'WhatsApp directo', status: 'confirmada', boat: (W.boats.find(x => x.own) || W.boats[0]).name, route: W.routes[0].name, dock: W.docks[0].name };
  sheet(`<h3>${b.code ? 'Editar reserva ' + esc(b.code) : 'Registrar reserva'}</h3><form class="adm-form" id="bk-f">
    <div class="field"><label for="bf-name">Cliente</label><input id="bf-name" required value="${esc(b.name || '')}"></div>
    <div class="field"><label for="bf-phone">WhatsApp</label><input id="bf-phone" inputmode="tel" placeholder="+58 4xx xxx xxxx" value="${esc(b.phone || '')}"></div>
    <div class="field"><label for="bf-iso">Fecha del paseo</label><input id="bf-iso" type="date" required value="${esc(b.iso || '')}"></div>
    <div class="field"><label for="bf-boat">Embarcación</label><select id="bf-boat">${[...new Set([...W.boats.map(x => x.name), b.boat])].map(n => `<option${n === b.boat ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="field"><label for="bf-route">Rumbo</label><select id="bf-route">${[...new Set([...W.routes.map(x => x.name), b.route].filter(Boolean))].map(n => `<option${n === b.route ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="field"><label for="bf-dock">Muelle</label><select id="bf-dock">${[...new Set([...W.docks.map(x => x.name), b.dock].filter(Boolean))].map(n => `<option${n === b.dock ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="field"><label for="bf-pax">Personas</label><input id="bf-pax" type="number" min="1" inputmode="numeric" value="${+b.pax || 1}"></div>
    <div class="field"><label for="bf-total">Total (USD)</label><input id="bf-total" type="number" min="0" inputmode="decimal" value="${+b.total || 0}"></div>
    <div class="field"><label for="bf-paid">Pagado (USD)</label><input id="bf-paid" type="number" min="0" inputmode="decimal" value="${+b.paid || 0}"></div>
    <div class="field"><label for="bf-ch">Cómo llegó</label><select id="bf-ch">${[...new Set([...CHANNELS, b.channel].filter(Boolean))].map(c => `<option${c === b.channel ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label for="bf-st">Estado</label><select id="bf-st">${Object.entries(ST).map(([k, v]) => `<option value="${k}"${k === (b.status || 'nueva') ? ' selected' : ''}>${v[1]}</option>`).join('')}</select></div>
    <div class="field ad-wide"><label for="bf-note">Nota</label><input id="bf-note" value="${esc(b.note || '')}"></div>
    <div class="adm-tools ad-wide"><button class="btn btn-sun btn-sm" type="submit">Guardar</button><button class="btn btn-ghost btn-sm" type="button" data-close>Cancelar</button></div></form>`);
  $('#bk-f').onsubmit = async e => {
    e.preventDefault(); const v = id => $('#' + id).value;
    const x = { ...(b.code ? { code: b.code } : {}), name: v('bf-name').trim(), phone: v('bf-phone').trim(), iso: v('bf-iso'), boat: v('bf-boat'), route: v('bf-route'), dock: v('bf-dock'), pax: +v('bf-pax'), total: +v('bf-total'), paid: Math.min(+v('bf-paid'), +v('bf-total')), channel: v('bf-ch'), status: v('bf-st'), note: v('bf-note').trim() };
    try { await saveBk(x); closeSheet(); toast('Reserva guardada'); render(); } catch (err) { toast(errMsg(err)); }
  };
}

/* muelle que el cliente marcó en el mapa: vista satelital, Google Maps y envío al capitán */
function pinSheet(b) {
  const p = b.pin, g = T.gmapsUrl(p);
  const cap = `⚓ Muelle de la reserva ${b.code}${b.name ? ' · ' + b.name : ''}\n📅 ${fmtD(dOf(b))}${b.hours ? ' · ' + b.hours : ''}\n👥 ${b.pax || '—'} pers. · ${b.boat || ''}${p.ref ? '\n📝 ' + p.ref : ''}\n📍 ${g}`;
  sheet(`<h3>Muelle de ${esc(b.name || b.code)}</h3><p class="rating">${p.ref ? esc(p.ref) + ' · ' : ''}<span class="mono">${T.pinTxt(p)}</span></p>
    <div class="pin-map-w"><div class="ad-pinmap" id="ad-pinmap"><p class="rating">Cargando mapa satelital…</p></div><div class="pin-layers" role="group" aria-label="Tipo de mapa"><button type="button" data-pl="sat" aria-pressed="true">Satélite</button><button type="button" data-pl="street" aria-pressed="false">Mapa</button></div></div>
    <div class="adm-tools"><a class="btn btn-sun btn-sm" href="${g}" target="_blank" rel="noopener">Abrir en Google Maps</a><a class="btn btn-ghost btn-sm" href="https://wa.me/?text=${encodeURIComponent(cap)}" target="_blank" rel="noopener">Enviar al capitán</a><button class="btn btn-ghost btn-sm" type="button" id="ad-pin-copy">Copiar coordenadas</button></div>`);
  $('#ad-pin-copy').onclick = async () => { try { await navigator.clipboard.writeText(T.pinTxt(p)); toast('Coordenadas copiadas'); } catch { toast(T.pinTxt(p)); } };
  T.loadLeaflet().then(L => {
    const el = $('#ad-pinmap'); if (!el) return; el.innerHTML = '';
    const m = L.map(el, { zoomControl: true }).setView([p.lat, p.lng], 17);
    const ly = T.baseLayers(L); ly.sat.addTo(m);
    $$('[data-pl]', adm).forEach(x => x.onclick = () => { Object.entries(ly).forEach(([n, l]) => n === x.dataset.pl ? l.addTo(m) : m.removeLayer(l)); $$('[data-pl]', adm).forEach(y => y.setAttribute('aria-pressed', y === x)); });
    m.attributionControl.setPrefix(false);
    L.marker([p.lat, p.lng], { icon: T.pinIcon(L), title: 'Muelle del cliente' }).addTo(m);
    setTimeout(() => m.invalidateSize(), 150);
  }).catch(() => { const el = $('#ad-pinmap'); if (el) el.innerHTML = '<p class="rating">No se pudo cargar el mapa. Usa “Abrir en Google Maps”.</p>'; });
}

/* ---------------- embarcaciones ---------------- */
const thumb = b => { const P = b.photos || {}, u = P.proa || P.popa || P.social || Object.values(P).find(Boolean); return u ? `<img src="${esc(u)}" alt="">` : art('drone', b.hue || 200, b.id); };
VIEW.flota = () => `<div class="ad-head"><div><h2>Embarcaciones</h2><p class="rating">${W.boats.length} en total · ${W.boats.filter(b => !b.hidden).length} visibles en la web. La primera de la lista es la que destacas como “La más solicitada”.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-boat-new>+ Agregar embarcación</button>${helpBtn('flota')}</div></div>
  ${seasonPanel()}
  <div class="ad-boats">${W.boats.map((b, i) => `<article class="ad-boat${b.hidden ? ' off' : ''}" data-i="${i}"><div class="ad-boat-ph">${thumb(b)}${b.own ? '<span class="badge own-badge">De la casa</span>' : ''}${b.hidden ? '<span class="badge">Oculta</span>' : ''}</div>
    <div class="ad-boat-b"><h4>${esc(b.name)}</h4><p class="rating">${esc(b.type)} · ${b.ft} pies · ${b.pax} pers.</p><p><b>${money(+b.price || 0)}</b> <span class="rating">por día</span></p>
    <p class="rating">${T.viewsOf(b).filter(([k]) => b.photos && b.photos[k]).length} de ${T.viewsOf(b).length} fotos${b.hidden ? '' : ' · las que falten no se muestran'}</p>
    <div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-boat-edit="${i}">Editar</button><button class="icon-btn" type="button" data-boat-up="${i}" aria-label="Subir en la lista" ${i ? '' : 'disabled'}>↑</button><button class="icon-btn" type="button" data-boat-down="${i}" aria-label="Bajar en la lista" ${i < W.boats.length - 1 ? '' : 'disabled'}>↓</button></div></div></article>`).join('')}</div>`;
/* Temporada alta: rangos de fechas (desde, hasta). En esas fechas la web usa la tarifa de temporada alta de cada
   embarcación; si una no la tiene, usa la normal más el % de abajo. El cliente paga 100% para apartar. */
function seasonPanel() {
  return `<section class="panel ad-season"><h3>Temporada alta <small>${W.seasons.length ? W.seasons.length + (W.seasons.length === 1 ? ' rango de fechas' : ' rangos de fechas') : 'sin fechas marcadas'}</small></h3>
    <p class="rating">Marca las fechas de temporada alta (Navidad, Carnaval, Semana Santa, agosto…). Para un solo día, deja “Hasta” igual que “Desde”. En esas fechas la web cobra la tarifa de temporada alta que pones en cada embarcación (Editar → Precio) y pide el 100% para apartar.</p>
    <div class="ad-seasons">${W.seasons.map((x, i) => `<div class="ad-srow">${inp(`seasons.${i}.name`, 'Nombre', { ph: 'Navidad y Año Nuevo' })}${inp(`seasons.${i}.from`, 'Desde', { type: 'date' })}${inp(`seasons.${i}.to`, 'Hasta', { type: 'date' })}<button type="button" class="icon-btn ad-danger" data-season-del="${i}" aria-label="Quitar este rango">Quitar</button></div>`).join('')}</div>
    <div class="adm-form" style="margin-top:10px"><div class="field"><button type="button" class="btn btn-ghost btn-sm" data-season-add>+ Agregar fechas de temporada alta</button></div>${inp('hiPct', 'Sin tarifa de temporada alta: % sobre la normal', { t: 'num', ph: '0', hint: 'Para las embarcaciones que no tengan su tarifa de temporada alta. 0 = cobran lo mismo.' })}</div></section>`;
}
function boatEditor(i) {
  const b = W.boats[i]; if (!b) return; const p = 'boats.' + i;
  b.photos ??= {}; b.inc ??= []; b.opt ??= {}; b.amen ??= []; b.pick ??= {}; b.rp ??= {}; b.qty ??= {}; b.docs ??= {};
  const pickups = W.docks.filter(d => d.pickup && !d.off), lancha = b.type === 'Lancha';
  const accRow = ([k, name]) => { const st = b.inc.includes(k) ? 'inc' : k in b.opt ? 'opt' : 'no';
    return `<div class="ad-acc"><span>${esc(name)}</span><select data-acc="${k}" aria-label="${esc(name)}"><option value="no"${st === 'no' ? ' selected' : ''}>No tiene</option><option value="inc"${st === 'inc' ? ' selected' : ''}>Incluido</option><option value="opt"${st === 'opt' ? ' selected' : ''}>Con costo</option></select><input type="number" min="0" inputmode="decimal" data-accp="${k}" value="${st === 'opt' ? +b.opt[k] || 0 : ''}" placeholder="$" aria-label="Precio de ${esc(name)}" ${st === 'opt' ? '' : 'hidden'}></div>`; };
  // precio por rumbo: según el rumbo (tarifa base), un precio propio, por confirmar o no lo hace
  const rpRow = r => { const v = b.rp[r.id], st = v === null || v === false ? 'no' : v === true ? 'tbd' : typeof v === 'number' ? 'num' : 'def';
    const defTxt = r.open === false ? 'No lo hace (rumbo bajo pedido)' : typeof r.add === 'number' ? `Tarifa base${r.add ? ` + $${r.add}` : ''}` : 'Tarifa base · por confirmar';
    return `<div class="ad-acc"><span>${esc(r.name)}<small class="rating"> ${esc(r.zone || '')}</small></span><select data-rp="${esc(r.id)}" aria-label="Precio en ${esc(r.name)}"><option value="def"${st === 'def' ? ' selected' : ''}>${defTxt}</option><option value="num"${st === 'num' ? ' selected' : ''}>Precio propio</option><option value="tbd"${st === 'tbd' ? ' selected' : ''}>Lo hace · precio por confirmar</option><option value="no"${st === 'no' ? ' selected' : ''}>No lo hace</option></select><input type="number" min="0" inputmode="decimal" data-rpp="${esc(r.id)}" value="${st === 'num' ? v : ''}" placeholder="$" aria-label="Precio en ${esc(r.name)}" ${st === 'num' ? '' : 'hidden'}><input type="number" min="0" inputmode="decimal" class="ad-hi" data-k="${p}.rpH.${esc(r.id)}" data-t="numn" data-rph="${esc(r.id)}" value="${b.rpH && b.rpH[r.id] > 0 ? b.rpH[r.id] : ''}" placeholder="Temp. alta $" title="Precio en temporada alta (vacío = normal${W.hiPct ? ' + ' + W.hiPct + '%' : ''})" aria-label="Precio en ${esc(r.name)} en temporada alta" ${st === 'num' ? '' : 'hidden'}></div>`; };
  // precio según niños (solo si lleva niños además de los puestos): kp[rumbo][n] = precio total con n niños
  const kx = Math.max(0, +b.kx || 0), kRoutes = W.routes.filter(r => b.rp[r.id] !== null && b.rp[r.id] !== false && !(b.rp[r.id] === undefined && r.open === false));
  const kidCell = (k, rid, n) => { const v = b[k] && b[k][rid] ? b[k][rid][n] : ''; return `<td><input type="number" min="0" inputmode="decimal" data-k="${p}.${k}.${rid}.${n}" data-t="numn" value="${v > 0 ? v : ''}" placeholder="$" aria-label="${k === 'kpH' ? 'Temporada alta, ' : ''}${n} ${n === 1 ? 'niño' : 'niños'}"></td>`; };
  const kidTable = k => `<div class="ad-ktable-w"><table class="ad-ktable"><thead><tr><th>Rumbo</th>${Array.from({ length: kx }, (_, j) => `<th>+${j + 1} ${j ? 'niños' : 'niño'}</th>`).join('')}</tr></thead><tbody>${kRoutes.map(r => `<tr><th>${esc(r.name)}</th>${Array.from({ length: kx }, (_, j) => kidCell(k, r.id, j + 1)).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kidSec = kx ? `<section><h4>Precio según niños <small class="rating">opcional</small></h4><p class="hint">Si el precio cambia cuando el grupo suma niños, escribe el precio total del paseo con esa cantidad de niños. Vacío = el niño no cambia el precio.</p><h5>Temporada normal</h5>${kidTable('kp')}<h5>Temporada alta</h5>${kidTable('kpH')}<p class="hint">Vacío en temporada alta = el precio normal con niños${W.hiPct ? ` + ${W.hiPct}%` : ''}.</p></section>` : '';
  const okDocks = W.docks.filter(d => !d.off && !d.custom), allow = Array.isArray(b.docks) && b.docks.length ? b.docks : null;
  sheet(`<div class="ad-sheet-h"><h3>${esc(b.name || 'Nueva embarcación')}</h3>${helpBtn('barco', 'Ayuda')}</div>
    <section><h4>Fotos ${helpBtn('fotos', 'Qué fotos subir')}</h4><div class="ad-photos">${T.viewsOf(b).map(([k, l]) => photoSlot(`${p}.photos.${k}`, 'boat', l)).join('')}</div><p class="hint">La primera que tenga foto es la principal. Los espacios sin foto no se muestran en la web; si no hay ninguna, sale una ilustración. ${lancha ? 'Habitación, baño y accesorios aparecen al elegir mini yate, barco o yate.' : ''}</p></section>
    <section><h4>Datos</h4><div class="adm-form">${inp(p + '.name', 'Nombre')}${inp(p + '.type', 'Tipo', { sel: TYPES.map(t => [t, t]) })}${inp(p + '.ft', 'Pies', { t: 'num' })}${inp(p + '.size', 'Tamaño (para muelles y recogidas)', { sel: SIZE_L })}${inp(p + '.pax', 'Capacidad (puestos de la licencia)', { t: 'num', min: 1 })}${inp(p + '.kx', 'Niños de 7 años o menos además de esos puestos', { t: 'num', hint: '0 = los niños ocupan puesto. El filtro de la reserva usa los dos números.' })}${lancha ? '' : inp(p + '.kts', 'Velocidad de navegación (nudos)', { t: 'num', ph: '20', hint: 'Se muestra en la tarjeta, el detalle y la reserva de mini yates, barcos y yates.' })}${inp(p + '.trips', 'Viajes realizados', { t: 'num', hint: 'Se muestra como “+N viajes”.' })}${inp(p + '.ownerWa', 'WhatsApp del propietario', { ph: '58414xxxxxxx', hint: 'Para enviarle cada reserva con un toque desde Reservas. No se muestra en la web.' })}${inp(p + '.promo', 'Promoción (opcional)', { ph: 'Ej. 10% de descuento entre semana', cls: 'ad-wide' })}</div>
      <div class="ad-checks">${inp(p + '.cabin', 'Tiene camarote', { t: 'bool' })}<label class="ad-check"><input type="checkbox" data-own="${i}"${b.own ? ' checked' : ''}> Es la más solicitada (sale destacada)</label>${inp(p + '.isNew', 'Resaltar como NEW (embarcación nueva)', { t: 'bool' })}${inp(p + '.hidden', 'Ocultar de la web (no se puede reservar)', { t: 'bool' })}</div></section>
    <section><h4>Precio y horario</h4><div class="adm-form">${inp(p + '.price', 'Tarifa base por día (USD)', { t: 'num' })}${inp(p + '.priceH', 'Tarifa base en temporada alta (USD)', { t: 'numn', ph: W.hiPct ? `Normal + ${W.hiPct}%` : 'Igual que la normal', hint: 'Se usa en las fechas de temporada alta (Embarcaciones → Temporada alta).' })}${inp(p + '.wk', 'Recargo fin de semana (%)', { t: 'num', ph: '10', hint: 'Se suma sábados y domingos en temporada normal. Vacío = 10%.' })}${inp(p + '.late', 'Hora extra', { sel: LATE, t: 'int', def: 0 })}${inp(p + '.hx', 'Costo de cada hora extra (USD)', { t: 'num', hint: 'Se paga en efectivo a bordo.' })}</div></section>
    <section><h4>Precio por rumbo ${helpBtn('precios', 'Ayuda')}</h4><div class="ad-accs">${W.routes.map(rpRow).join('')}</div><div class="adm-form" style="margin-top:10px">${inp(p + '.maxBeaches', 'Playas por salida', { sel: [[1, '1 playa'], [2, '2 playas'], [3, '3 playas'], [4, '4 playas']], t: 'int', def: lancha ? 3 : 2 })}</div></section>
    ${kidSec}
    <section><h4>Muelles</h4><div class="adm-form">${inp(p + '.dock', 'Muelle base (no se muestra en la web)', { sel: W.docks.map((d, j) => [j, d.name]).filter(([j]) => !W.docks[j].pickup && !W.docks[j].off), t: 'int', hint: 'Si el muelle no cobra a las embarcaciones que tienen ahí su base (Marina Américo Vespucio), el cliente no paga servicio de muelle.' })}</div>
      <h5>Desde dónde puede salir</h5><div class="ad-checks">${okDocks.map(d => `<label class="ad-check"><input type="checkbox" data-dockok="${esc(d.id)}"${!allow || allow.includes(d.id) ? ' checked' : ''}> ${esc(d.name)}</label>`).join('')}</div><p class="hint">Todas marcadas = puede salir de cualquiera.</p>
      ${pickups.length ? `<h5>Excepciones de recogida</h5><div class="ad-picks">${pickups.map(d => { const v = b.pick[d.id]; const st = v === null ? 'no' : v === 0 ? 'free' : typeof v === 'number' ? 'own' : 'std';
        return `<div class="ad-acc"><span>${esc(d.name)}</span><select data-pick="${esc(d.id)}" aria-label="${esc(d.name)}"><option value="std"${st === 'std' ? ' selected' : ''}>Costo normal del muelle</option><option value="own"${st === 'own' ? ' selected' : ''}>Costo propio de esta embarcación</option><option value="free"${st === 'free' ? ' selected' : ''}>Sin costo</option><option value="no"${st === 'no' ? ' selected' : ''}>No llega (calado)</option></select><input type="number" min="0" inputmode="decimal" data-pickp="${esc(d.id)}" value="${st === 'own' ? v : ''}" placeholder="$" aria-label="Costo propio en ${esc(d.name)}" ${st === 'own' ? '' : 'hidden'}></div>`; }).join('')}</div><p class="hint">“Costo normal” es el de Muelles y recogidas. “Costo propio” lo reemplaza solo para esta embarcación.</p>` : ''}</section>
    <section><h4>Accesorios ${helpBtn('accesorios', 'Ayuda')}</h4><div class="ad-accs">${Object.entries(ACC).map(accRow).join('')}</div>
      <div class="adm-form" style="margin-top:10px">${inp(p + '.qty.snorkel', 'Cantidad de caretas de buceo', { t: 'num', hint: 'Se muestra como “Caretas de buceo (4)”.' })}${inp(p + '.amen', 'Lo que la distingue (separado por comas)', { t: 'list', ph: 'Toldo, Baño, Aire acondicionado', cls: 'ad-wide' })}</div></section>
    <section><h4>Documentos <small class="rating">solo los ves tú</small></h4><div class="adm-form">${DOCS.map(([k, l]) => inp(`${p}.docs.${k}`, `${l} · vence`, { type: 'date' })).join('')}</div><p class="hint">Te avisamos en el Resumen 30 días antes de que venzan.</p></section>
    <section><h4>Descripción ${helpBtn('textos', 'Idiomas')}</h4><div class="adm-form">${inp(p + '.desc', 'En español', { area: 1, cls: 'ad-wide' })}${inp(p + '.desc_en', 'En inglés (opcional)', { area: 1, cls: 'ad-wide' })}</div></section>
    <div class="ad-sheet-f"><button class="btn btn-sun" type="button" data-close>Listo</button><button class="btn btn-ghost btn-sm" type="button" data-boat-dup="${i}">Duplicar</button><button class="btn btn-ghost btn-sm ad-danger" type="button" data-boat-del="${i}">Eliminar</button></div>`, 'boat');
}

/* ---------------- rumbos y playas ---------------- */
/* ---------------- Precios: matriz embarcación × rumbo (pedido de Eduardo, 18 nov) ----------------
   Una fila por embarcación y una columna por rumbo, en temporada regular o alta. En cada celda:
   número = tarifa · ? = por confirmar · – = no lo hace · vacío = lo normal (Rumbo 1: tarifa base; alta: base + %).
   Abajo, el costo por muelle de recogida de cada embarcación. Se puede pegar desde el Excel de Eduardo
   (mismas columnas que su libro: nombre, pies, rumbos 1 a 6 regular/alta, Puerto Príncipe, Cayo de Agua, El Morro,
   Posadas de Mochima y Playa Pescadores — estas dos como precio total del Rumbo 3 desde ahí). */
const EDU_18NOV = "WET DREAMS (HASTA 4P )\t24\t290\t320\t310\t340\t350\t385\t330\t363\t550\t605\t650\t715\t15\t15\t15\t380\t400\nWET DREAMS (HASTA 5P )\t24\t290\t320\t310\t340\t350\t385\t330\t363\tNO\tNO\tNO COTIZADA\tNO\t15\t15\t15\t380\t400\nWET DREAMS (HASTA 5P +1NIÑO)\t24\t290\t320\t310\t340\t350\t385\t330\t363\tNO\tNO\tNO\tNO\tNO\t15\t15\t400\t420\nWET DREAMS (HASTA 5P +2NIÑO)\t24\t320\t350\t350\t385\t390\t429\t370\t407\tNO\tNO\tNO\tNO\tNO\t15\t20\tNO\tNO COTIZADA\nWET DREAMS (HASTA 5P+ 3NIÑO)\t24\t340\t375\t370\t405\t420\t462\t390\t429\tNO\tNO\tNO\tNO\tNO\t15\t20\tNO\tNO COTIZADA\nBIANY (HASTA 5+1NIÑO)\t26\t300\t330\t320\t352\t350\t385\tNO\tNO\tNO\tNO\tNO\tNO\t15\t15\t15\t400\t420\nCENTURY (HASTA 7+1NIÑO)\t24\t340\t374\t360\t396\t390\t429\t380\t418\t\t0\t\t\t15\t0\t15\t440\t440\nPIRRI (HASTA 8+1NIÑO)\t30\t380\t418\t400\t440\t430\t473\tNO\tNO\tNO\tNO\tNO\tNO\tNO\tNO\t0\t490\tNO\nBUCKY (8+1NIÑO)\t32.5\t420\t462\t440\t484\t470\t517\t460\t506\tNO\tNO\tNO\tNO\tNO\t15\t15\t590\tNO\nRELAXING (8+1NIÑO)\t33\t460\t506\t490\t539\t530\t583\tNO\tNO\tNO\tNO\tNO\tNO\tNO\tNO\t15\tNO\tNO\nPICASSO 8\t38\t450\t495\t470\t517\t530\t583\t490\t539\tNO\tNO\tNO\tNO\tNO\t20\t15\tNO\tNO\nHMD (8+2NIÑOS)\t34\t550\t605\t590\t649\t640\t704\tNO\tNO\tNO\tNO\tNO\tNO\tNO\tNO\t0\tNO\tNO\nGUARIPITEI (10)\t32.5\t400\t440\t420\t462\t450\t495\t440\t484\t605\t665.5\t720\t792\tNO\t20\t20\t570\t600\nODIN (HASTA 10+1NIÑO)\t32\t550\t605\t590\t649\t700\t770\tNO\tNO\tNO\tNO\tNO\tNO\tNO\t30\t30\tNO\tNO\nAPOLLO ONE (10+2NIÑOS)\t41\t790\t869\t820\t902\t900\t990\t860\t946\tNO\tNO\tNO\tNO\tNO\tNO\t30\tNO\tNO\nAVALON (10+1)\t42\t890\t979\t920\t1012\t1000\t1100\t960\t1056\tNO\tNO\tNO\tNO\tNO\tNO\t30\tNO\tNO\nDMARES (HASTA 12+2NIÑOS)\t48\t1050\t1160\t1050\t1160\t1250\t1370\t1100\t1200\tNO\tNO\tNO\tNO\tNO\tNO\t50\tNO\tNO\nEMELYN (HASTA 12)\t42\t1200\t1320\t1300\t1430\t1400\t1540\tNO\tNO\tNO\tNO\tNO\tNO\tNO\tNO\t50\tNO\tNO\nGRAND CREW (HASTA 12+2NIÑOS)\t53\t1200\t1320\t1300\t1430\t1400\t1540\t1360\t1496\tNO\tNO\tNO\tNO\tNO\tNO\t50\tNO\tNO\nDAMA 11 (HASTA 12+2NIÑOS)\t62\t1450\t1595\t1490\t1639\t1590\t1749\t1560\t1716\tNO\tNO\tNO\tNO\tNO\tNO\t50\tNO\tNO";
const EDU_NM = { r1: 19, r2: 20, r3: 27, r4: 21, r5: 38, r6: 41 };
const PX_DOCKS = [['ppr', 'Puerto Príncipe'], ['pmr', 'Cayo de Agua / Puerto Mares'], ['em', 'El Morro · Eurobuilding'], ['pip', 'Posada Isla Piscina'], ['mlo', 'Mochima Lodge'], ['ppe', 'Playa Pescadores']];
let pxSeason = 'reg', pxReport = '';
const pxKey = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z]/gi, '').toLowerCase();
const pxCell = v => v === null || v === false ? '–' : v === true ? '?' : v == null || v === '' ? '' : String(v);
function pxRead(t) {
  t = String(t).trim().replace(/,/g, '.');
  if (!t) return undefined;
  if (/^(–|-|—|no)$/i.test(t)) return null;
  if (/^\?$|cotiz|confirm/i.test(t)) return true;
  const n = parseFloat(t.replace(/[^\d.]/g, '')); return isFinite(n) && n > 0 ? Math.round(n) : undefined;
}
function pxGet(b, rid, hi) {
  if (rid === 'r1') return hi ? b.priceH : b.price;
  return hi ? (b.rpH || {})[rid] : (b.rp || {})[rid];
}
function pxSet(b, rid, hi, v) {
  if (rid === 'r1') { if (hi) { if (typeof v === 'number') b.priceH = v; else delete b.priceH; } else if (typeof v === 'number') b.price = v; return; }
  const k = hi ? 'rpH' : 'rp'; b[k] = b[k] || {};
  if (hi) { if (typeof v === 'number') b.rpH[rid] = v; else delete b.rpH[rid]; return; }
  if (v === undefined) delete b.rp[rid]; else b.rp[rid] = v;
}
VIEW.precios = () => {
  const hi = pxSeason === 'hi', R = W.routes, up = x => Math.round(x * (1 + (+W.hiPct || 0) / 100));
  const ph = (b, r) => { if (!hi) return r.id === 'r1' ? '' : 'base'; const v = pxGet(b, r.id, false); const base = typeof v === 'number' ? v : r.id === 'r1' || v === undefined ? +b.price : null; return base ? String(up(base)) : ''; };
  const docks = PX_DOCKS.filter(([id]) => W.docks.some(d => d.id === id && !d.off));
  return `<div class="ad-head"><div><h2>Precios</h2><p class="rating">Todas las embarcaciones y rumbos en una sola tabla, como en tu Excel. Escribe el número, <b>?</b> si es por confirmar o <b>–</b> si no lo hace. Vacío = la tarifa base${hi ? ' más el ' + (+W.hiPct || 0) + '% de temporada alta (el número gris)' : ''}.</p></div>
    <div class="adm-tools"><div class="seg" role="group" aria-label="Temporada"><button type="button" class="chip${hi ? '' : ' on'}" data-px-season="reg">Temporada regular</button><button type="button" class="chip${hi ? ' on' : ''}" data-px-season="hi">Temporada alta</button></div></div></div>
    <section class="panel ad-px-load"><h3>Cargar desde el Excel</h3>
      <p class="rating">Copia las filas de tu libro (desde el nombre hasta Playa Pescadores) y pégalas aquí, o carga el cuadro que enviaste el 18 de noviembre. Las embarcaciones se reconocen por el nombre; las que no estén en la flota se agregan ocultas para que les pongas fotos.</p>
      <div class="adm-tools"><button type="button" class="btn btn-sun btn-sm" data-px-edu>Cargar el cuadro del 18 nov</button><button type="button" class="btn btn-ghost btn-sm" data-px-paste-open>Pegar filas del Excel</button></div>
      <div class="field" data-px-paste hidden><label for="px-ta">Filas copiadas del Excel</label><textarea id="px-ta" rows="5" placeholder="WET DREAMS (HASTA 5P)	24	290	320	310	340 …"></textarea><button type="button" class="btn btn-sun btn-sm" data-px-apply>Aplicar</button></div>
      ${pxReport ? `<div class="ad-px-rep">${pxReport}</div>` : ''}
    </section>
    <div class="ad-px-wrap"><table class="ad-px"><thead><tr><th scope="col">Embarcación</th>${R.map(r => `<th scope="col">${esc(r.name)}<small>${esc(r.zone || '')}${r.nm ? ` · ${r.nm} MN` : ''}</small></th>`).join('')}</tr></thead>
      <tbody>${W.boats.map((b, i) => `<tr${b.hidden ? ' class="off"' : ''}><th scope="row">${esc(b.name)}<small>${b.ft || ''} pies · ${b.pax || ''}${+b.kx ? '+' + b.kx : ''} pers.${b.hidden ? ' · oculta' : ''}</small></th>${R.map(r => hi && r.id !== 'r1' && pxGet(b, r.id, false) === null ? `<td><input value="–" disabled title="No hace este rumbo"></td>` : `<td><input data-px="${i}.${r.id}" value="${esc(pxCell(pxGet(b, r.id, hi)))}" placeholder="${ph(b, r)}" inputmode="decimal" aria-label="${esc(b.name)} · ${esc(r.name)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${docks.length ? `<h3 class="ad-px-h">Recogida en muelles <small>costo extra por embarcación · vacío = el costo general del muelle</small></h3>
    <div class="ad-px-wrap"><table class="ad-px"><thead><tr><th scope="col">Embarcación</th>${docks.map(([id, n]) => `<th scope="col">${esc((W.docks.find(d => d.id === id) || {}).name || n)}${/^(pip|mlo|ppe)$/.test(id) ? '<small>solo Rumbo 3</small>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${W.boats.map((b, i) => `<tr${b.hidden ? ' class="off"' : ''}><th scope="row">${esc(b.name)}</th>${docks.map(([id]) => `<td><input data-pxd="${i}.${id}" value="${esc(pxCell((b.pick || {})[id]))}" inputmode="decimal" aria-label="${esc(b.name)} · ${id}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}`;
};
/* Lee filas con las columnas del Excel de Eduardo y las aplica a la flota (W). Devuelve un resumen. */
function pxImport(text) {
  const rows = String(text).split(/\r?\n/).map(l => l.split('\t').map(x => x.trim())).filter(c => c[0] && c.length >= 6 && !/^nombre$/i.test(c[0]));
  const RID = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
  const groups = new Map();
  rows.forEach(c => { const k = pxKey(c[0]); if (!k) return; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); });
  const done = [], added = [];
  // si el Excel trae precios de rumbos que aún no están en la web (5 y 6), se agregan con su descripción de siempre
  RID.forEach((rid, n) => { if (W.routes.some(r => r.id === rid)) return; if (!rows.some(c => pxRead(c[2 + n * 2] ?? '') !== undefined)) return; const d = (DEF.routes || []).find(r => r.id === rid); if (d) W.routes.push(JSON.parse(JSON.stringify(d))); });
  W.routes.sort((a, b) => (RID.indexOf(a.id) + 1 || 99) - (RID.indexOf(b.id) + 1 || 99));
  groups.forEach((list, key) => {
    const info = c => { const m = c[0].match(/(\d+)\s*(?:p\b|\+|\))/i) || c[0].match(/\((\d+)/), k = c[0].match(/\+\s*(\d+)\s*NI/i); return { pax: m ? +m[1] : 0, kids: k ? +k[1] : 0 }; };
    const withI = list.map(c => ({ c, ...info(c) }));
    const maxPax = Math.max(...withI.map(x => x.pax));
    const baseRow = withI.filter(x => x.pax === maxPax).sort((a, b) => a.kids - b.kids)[0];
    const c = baseRow.c, raw = c[0].replace(/\s*\(.*$/, '').trim();
    let b = W.boats.find(x => pxKey(x.name) === key);
    if (!b) {
      const ft = parseFloat(String(c[1]).replace(',', '.')) || 30;
      b = { id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: raw.toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()), type: ft <= 34 ? 'Lancha' : ft <= 42 ? 'Mini yate' : 'Yate', ft, pax: maxPax || 8, price: 0, hue: 200, dock: 0, cabin: ft > 34, rating: 5, trips: 0, inc: [], opt: {}, amen: [], desc: '', photos: {}, pick: {}, rp: {}, qty: {}, docs: {}, kx: 0, hidden: true };
      W.boats.push(b); added.push(b.name);
    }
    const v = j => pxRead(c[j] ?? '');
    RID.forEach((rid, n) => {
      const reg = v(2 + n * 2), hi = v(3 + n * 2);
      if (reg === undefined && hi === undefined) return;
      if (rid === 'r1') { if (typeof reg === 'number') b.price = reg; if (typeof hi === 'number') b.priceH = hi; else delete b.priceH; return; }
      pxSet(b, rid, false, reg === undefined ? (hi === null ? null : hi === true ? true : undefined) : reg);
      pxSet(b, rid, true, typeof hi === 'number' && typeof reg === 'number' ? hi : undefined);
    });
    // muelles: Puerto Príncipe, Cayo de Agua / Puerto Mares, El Morro = costo extra; Mochima y Pescadores = precio total del Rumbo 3 desde ahí
    b.pick = b.pick || {};
    const r3 = typeof b.rp.r3 === 'number' ? b.rp.r3 : null;
    [['ppr', 14], ['pmr', 15], ['em', 16]].forEach(([id, j]) => { const x = v(j); if (/^0+$/.test(c[j] || '')) b.pick[id] = 0; else if (x === null) b.pick[id] = null; else if (typeof x === 'number') b.pick[id] = x; });
    [[['pip', 'mlo'], 17], [['ppe'], 18]].forEach(([ids, j]) => { const x = v(j); if (x === undefined) return; ids.forEach(id => { if (x === null || x === true) b.pick[id] = null; else if (r3 != null) b.pick[id] = Math.max(0, x - r3); }); });
    // tarifas con niños (p. ej. Wet Dreams 5 + 2 o 3 niños)
    withI.filter(x => x.pax === maxPax && x.kids > 1 && x !== baseRow).forEach(x => {
      b.kx = Math.max(+b.kx || 0, x.kids); b.kp = b.kp || {}; b.kpH = b.kpH || {};
      RID.forEach((rid, n) => { const reg = pxRead(x.c[2 + n * 2] ?? ''), hi = pxRead(x.c[3 + n * 2] ?? ''); if (typeof reg !== 'number') return; const base = pxGet(b, rid, false), bv = rid === 'r1' ? b.price : base; if (reg === bv) return; (b.kp[rid] = b.kp[rid] || {})[x.kids] = reg; if (typeof hi === 'number') (b.kpH[rid] = b.kpH[rid] || {})[x.kids] = hi; });
    });
    const kd = Math.max(0, ...withI.filter(x => x.pax === maxPax).map(x => x.kids));
    if (kd && !(+b.kx >= kd)) b.kx = kd;
    if (maxPax && !added.includes(b.name) && !b.pax) b.pax = maxPax;
    done.push(b.name);
  });
  return { done, added };
}
VIEW.rumbos = () => `<div class="ad-head"><div><h2>Rumbos y playas</h2><p class="rating">Los rumbos nunca se cruzan: el cliente elige uno y sus playas. El precio de cada embarcación por rumbo se pone en Embarcaciones.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-route-new>+ Agregar rumbo</button>${helpBtn('rumbos')}</div></div>
  ${W.routes.map((r, i) => { const p = 'routes.' + i; return `<section class="panel ad-route"><h3>${esc(r.name)} <small>${r.beaches.length} playas</small></h3>
    <div class="adm-form">${inp(p + '.name', 'Nombre')}${inp(p + '.zone', 'Zona')}${inp(p + '.min', 'Minutos de navegación', { t: 'num' })}${inp(p + '.nm', 'Millas náuticas del rumbo completo', { t: 'num', step: .5 })}${inp(p + '.add', 'Diferencia sobre la tarifa base (USD)', { t: 'numn', ph: 'Por confirmar', hint: 'Para las embarcaciones sin precio propio en este rumbo. Vacío = precio por confirmar. 0 = tarifa base.' })}<div class="ad-checks ad-wide"><label class="ad-check"><input type="checkbox" data-rclosed="${i}"${r.open === false ? ' checked' : ''}> Solo para embarcaciones que lo hacen (las demás no lo muestran)</label></div>
    ${inp(p + '.tags', 'Etiquetas (separadas por comas)', { t: 'list', cls: 'ad-wide' })}${inp(p + '.desc', 'Descripción', { area: 1, rows: 2, cls: 'ad-wide' })}${inp(p + '.desc_en', 'Descripción en inglés (opcional)', { area: 1, rows: 2, cls: 'ad-wide' })}</div>
    <h4>Playas ${helpBtn('playas', 'Fotos de playas')}</h4>
    <div class="ad-beaches">${r.beaches.map((n, j) => `<div class="ad-beach">${photoSlot('beachPhotos.' + n.replace(/\./g, '·'), 'beach', '', true)}<div class="field"><label for="bn-${i}-${j}">Nombre</label><input id="bn-${i}-${j}" data-beach="${i}.${j}" value="${esc(n)}"></div><button type="button" class="icon-btn ad-danger" data-beach-del="${i}.${j}">Quitar playa</button></div>`).join('')}
      <button type="button" class="ad-add" data-beach-add="${i}">+ Agregar playa</button></div></section>`; }).join('')}
  <section class="panel"><h3>Cotización especial</h3><div class="adm-form">${inp('special', 'Destinos que van por WhatsApp (separados por comas)', { t: 'list', cls: 'ad-wide' })}</div></section>`;

/* ---------------- muelles ---------------- */
const COST_L = [['s', 'Lancha pequeña'], ['m', 'Lancha mediana'], ['my', 'Mini yate'], ['y', 'Yate o barco']];
VIEW.muelles = () => `<div class="ad-head"><div><h2>Muelles y recogidas</h2><p class="rating">Los muelles sugeridos (servicio por uso de muelle, lo cobra cada establecimiento) y las residencias donde buscas al cliente.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-dock-new>+ Agregar</button>${helpBtn('muelles')}</div></div>
  <div class="ad-docks">${W.docks.map((d, i) => { const p = 'docks.' + i; return `<section class="panel${d.off ? ' off' : ''}"><h3>${esc(d.name)} <small>${d.far ? 'Salida desde Mochima' : d.pickup ? 'Recogida en residencia' : 'Muelle sugerido'}${d.off ? ' · no disponible' : ''}</small></h3>${d.far ? '<p class="hint">Si dejas los costos vacíos, se cobra sola la diferencia del Rumbo 3 (La Piscina) sobre el Rumbo 1 de cada embarcación. Escribe un costo por tamaño solo si quieres fijarlo tú.</p>' : ''}
    <div class="adm-form">${inp(p + '.name', 'Nombre')}
    ${d.pickup ? `${COST_L.filter(([z]) => !d.lanchaOnly || z === 's' || z === 'm').map(([z, l]) => inp(`${p}.cost.${z}`, `${l} (USD)`, { t: 'numn', ph: d.far ? 'Dif. Rumbo 3' : 'No llega', hint: z === 's' ? (d.far ? 'Vacío = diferencia del Rumbo 3.' : 'Vacío = ese tamaño no llega. 0 = sin costo.') : '' })).join('')}${inp(p + '.back', 'Regreso máximo', { ph: '5:30 pm', hint: 'Vacío = horario normal.' })}` : `${inp(p + '.fee', 'Servicio por uso de muelle', { ph: '$30', hint: 'Lo cobra el establecimiento y se paga en sitio.' })}${inp(p + '.park', 'Estacionamiento', { cls: 'ad-wide' })}`}
    ${inp(p + '.note', 'Nota para el cliente', { ph: 'Se hace en temporada de mar bueno…', cls: 'ad-wide', hint: 'Sale debajo del muelle al elegirlo en la reserva. Opcional.' })}
    ${d.off ? inp(p + '.why', 'Por qué no está disponible', { ph: 'Muelle deshabilitado', cls: 'ad-wide' }) : ''}</div>
    ${d.pickup ? (() => { const ex = W.boats.filter(b => b.pick && d.id in b.pick); return ex.length ? `<p class="hint ad-pickex"><b>Excepciones:</b> ${ex.map(b => `${esc(b.name)} ${b.pick[d.id] === null ? 'no llega' : b.pick[d.id] === 0 ? 'sin costo' : `cobra $${b.pick[d.id]} (costo propio)`}`).join(' · ')}. Se cambian en Embarcaciones → Editar → Muelles.</p>` : ''; })() : ''}
    <div class="ad-checks">${d.pickup ? inp(p + '.lanchaOnly', 'Solo lanchas (por baja profundidad)', { t: 'bool' }) : inp(p + '.baseFree', 'Sin costo para las embarcaciones que tienen aquí su base', { t: 'bool' })}${inp(p + '.off', 'No disponible por ahora (se muestra deshabilitado)', { t: 'bool' })}</div></section>`; }).join('')}</div>`;

/* ---------------- pagos ---------------- */
VIEW.pagos = () => { const P = W.pay; return `<div class="ad-head"><div><h2>Pagos</h2><p class="rating">Lo que ve el cliente al confirmar, para pagar el abono del 50%.</p></div><div class="adm-tools">${helpBtn('pagos')}</div></div>
  <section class="panel"><h3>Zelle <small>el cliente ve solo la principal</small></h3>
    <div class="ad-zelles">${P.zelles.map((z, i) => `<div class="ad-zelle${i === P.zelleOn ? ' on' : ''}"><label class="ad-zon"><input type="radio" name="z-on" data-zon="${i}"${i === P.zelleOn ? ' checked' : ''}> <span>${i === P.zelleOn ? '<b>Principal</b> · la ve el cliente' : 'Usar como principal'}</span></label>
      <div class="adm-form">${inp(`pay.zelles.${i}.name`, 'Titular', { ph: 'Como aparece en Zelle' })}${inp(`pay.zelles.${i}.email`, 'Correo o teléfono', { ph: 'pagos@ejemplo.com' })}</div>
      <button type="button" class="icon-btn ad-danger" data-zdel="${i}">Quitar</button></div>`).join('')}
    <button type="button" class="ad-add" data-zadd>+ Agregar cuenta Zelle</button></div></section>
  <section class="panel"><h3>Binance Pay</h3><div class="ad-ally">${photoSlot('pay.binanceQR', 'qr', 'Código QR', true)}<div class="adm-form">${inp('pay.binance', 'ID de Binance Pay', { ph: '123456789' })}${inp('pay.binanceUser', 'Usuario', { ph: 'tu_usuario' })}${inp('pay.binanceMail', 'Correo de Binance', { cls: 'ad-wide' })}${inp('pay.binanceLink', 'Enlace de pago (el del QR)', { ph: 'https://app.binance.com/…', cls: 'ad-wide', hint: 'En el teléfono el cliente toca “Abrir en Binance” y paga directo.' })}</div></div></section>
  <section class="panel"><h3>PayPal</h3><div class="adm-form">${inp('pay.paypal', 'Correo o enlace de PayPal', { ph: 'paypal.me/tulancha o pagos@ejemplo.com', cls: 'ad-wide', hint: 'Vacío = la app dice que se lo envías por WhatsApp.' })}${inp('pay.paypalFee', 'Comisión que se suma (%)', { t: 'num', step: .1, hint: 'Se suma al abono cuando el cliente elige PayPal.' })}</div></section>
  <section class="panel"><h3>Así lo verá el cliente</h3><div class="ad-preview">${payPreview()}</div><p class="hint">El efectivo siempre se acuerda por WhatsApp.</p></section>`; };
const payPreview = () => { const P = W.pay, z = P.zelles[P.zelleOn] || {};
  const box = (title, how, acct, extra) => `<div class="pay-info"><div class="pay-amt"><span>${title} · abono para apartar</span><b>$175</b><small>50% · el resto en el muelle antes de zarpar</small></div><p>${acct ? how : 'Sin datos: la app le dice que se los envías por WhatsApp.'}</p>${acct ? `<p class="pay-acct mono">${esc(acct)}</p>${extra}` : ''}</div>`;
  return box('Zelle', 'Paga el abono a este Zelle y mándanos la captura por WhatsApp.', z.email, z.name ? `<p class="rating">Titular: <b>${esc(z.name)}</b></p>` : '')
    + box('Binance Pay', 'Paga el abono en USDT a este ID de Binance Pay y mándanos la captura por WhatsApp.', P.binance ? 'ID ' + P.binance : '', `${P.binanceUser ? `<p class="rating">Usuario: <b>${esc(P.binanceUser)}</b></p>` : ''}${P.binanceQR || P.binanceLink ? `<div class="pay-qr">${P.binanceQR ? `<img src="${esc(P.binanceQR)}" alt="" width="120" height="120">` : ''}${P.binanceLink ? '<span class="btn btn-sun btn-sm">Abrir en Binance</span>' : ''}</div>` : ''}`); };

/* ---------------- aliados ---------------- */
/* enlace directo que Eduardo puede mandar o mostrar en un video: abre el chat de ventas del aliado con el mensaje ya escrito */
const allyShare = it => { const num = T.phoneNum(it[6]); return num.length >= 10 ? `https://wa.me/${num}?text=${encodeURIComponent(T.allyMsg(it[7]))}` : it[2] || ''; };
const allyCat = (c, i) => `<section class="panel"><div class="adm-form">${inp(`allies.${i}.cat`, 'Categoría')}</div><div class="ad-checks">${inp(`allies.${i}.owners`, 'Para propietarios de embarcaciones (sale en Propietarios)', { t: 'bool' })}</div>
    <div class="ad-allies">${c.items.map((it, j) => { const p = `allies.${i}.items.${j}`; return `<div class="ad-ally">${photoSlot(p + '.4', 'logo', 'Logo', true)}${photoSlot(p + '.5', 'cover', 'Portada', true)}<div class="adm-form">${inp(p + '.0', 'Nombre')}${inp(p + '.1', 'Descripción', { cls: 'ad-wide' })}${inp(p + '.6', 'WhatsApp de ventas del aliado', { ph: '0414 123 4567', hint: 'Con número, al tocar su foto se abre el chat de ventas del aliado.' })}${inp(p + '.7', 'Mensaje que le llega', { cls: 'ad-wide', ph: 'Requiero una batería…', hint: `Empieza solo con “Hola, soy cliente de Tu Lancha Lechería 👋”. Vacío = “Quisiera información.”` })}${inp(p + '.2', 'Enlace (web o Instagram)', { ph: 'https://…', cls: 'ad-wide', hint: 'Se usa si no hay WhatsApp. Vacío = abre el WhatsApp de Tu Lancha Lechería.' })}<div class="field ad-wide ad-link"><span class="ad-link-t">Enlace para compartir</span><code>${esc(allyShare(it)) || "Escribe el WhatsApp de ventas para generar el enlace."}</code><button type="button" class="btn btn-ghost btn-sm" data-ally-copy="${i}.${j}">Copiar enlace</button></div><div class="field"><label>Color si no hay logo</label><input type="color" data-k="${p}.3" value="${esc(it[3] || '#232843')}"></div></div><button type="button" class="icon-btn ad-danger" data-ally-del="${i}.${j}">Quitar</button></div>`; }).join('')}</div>
    <div class="adm-tools"><button type="button" class="ad-add" data-ally-add="${i}">+ Agregar aliado</button>${c.items.length ? '' : `<button type="button" class="icon-btn ad-danger" data-cat-del="${i}">Quitar categoría</button>`}</div></section>`;
VIEW.aliados = () => `<div class="ad-head"><div><h2>Servicio a bordo</h2><p class="rating">Aliados VIP que recomiendas. Salen en Servicio a bordo y en el cintillo del pie de página. Toca la foto de un aliado en la web y se abre su chat de ventas con el mensaje ya escrito. Los proveedores para propietarios están en su propia pestaña.</p></div><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" data-cat-new>+ Nueva categoría</button>${helpBtn('aliados')}</div></div>
  ${W.allies.map((c, i) => c.owners ? '' : allyCat(c, i)).join('')}`;

/* ---------------- propietarios (19 nov): proveedores con foto, descripción y WhatsApp de ventas + alquiler ---------------- */
const RENT_SEC = () => `<section class="panel"><h3>Alquiler para propietarios <small>en la página Propietarios</small></h3><p class="rating">El propietario elige cantidades, ve su resumen con el depósito de garantía y lo envía por WhatsApp. Precio por día y depósito por unidad.</p>
    <div class="ad-items">${W.rent.map((x, i) => `<div class="ad-item">${photoSlot(`rent.${i}.photo`, 'logo', 'Foto', true)}<div class="adm-form">${inp(`rent.${i}.name`, 'Artículo')}${inp(`rent.${i}.desc`, 'Descripción')}${inp(`rent.${i}.price`, 'Precio por día (USD)', { t: 'num' })}${inp(`rent.${i}.dep`, 'Depósito de garantía por unidad (USD)', { t: 'num' })}<div class="ad-checks">${inp(`rent.${i}.off`, 'Oculto por ahora', { t: 'bool' })}</div></div><button type="button" class="icon-btn ad-danger" data-list-del="rent.${i}">Quitar</button></div>`).join('')}</div>
    <button type="button" class="ad-add" data-list-add="rent">+ Agregar artículo</button></section>`;
VIEW.propietarios = () => `<div class="ad-head"><div><h2>Propietarios</h2><p class="rating">Lo que sale en la página Propietarios: tus proveedores (Ferrenautic, Seadek, Positive…) y el alquiler de equipos. Al tocar la foto de un proveedor, el cliente abre su chat de ventas con “Hola, soy cliente de Tu Lancha Lechería 👋” y tu mensaje. Usa “Copiar enlace” para mandarlo o mostrarlo en un video.</p></div><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" data-cat-new="owners">+ Nueva categoría</button></div></div>
  ${W.allies.map((c, i) => c.owners ? allyCat(c, i) : '').join('')}
  ${RENT_SEC()}`;

/* ---------------- portada y tienda ---------------- */
VIEW.portada = () => { const C = T.NAV_CARDS || []; return `<div class="ad-head"><div><h2>Portada y tienda</h2><p class="rating">La foto principal de la web, las pantallas del menú giratorio y los accesorios que vendes.</p></div><div class="adm-tools">${helpBtn('portada')}</div></div>
  <section class="panel"><h3>Foto principal <small>la portada muestra el video del dron; esta foto se ve solo si el video no se puede reproducir (ahorro de datos o “reducir movimiento”). Vacía = primer cuadro del video</small></h3><div class="ad-photos">${photoSlot('home.hero', 'hero', 'Portada (Isla de Plata, por ejemplo)')}</div></section>
  <section class="panel"><h3>Menú giratorio <small>${C.filter(c => W.home.cards[c.id]).length} de ${C.length} con foto · las vacías se ven difuminadas</small></h3>
    <p class="rating">La portada de cada pantalla del menú giratorio, agrupadas por sección. Sube cada imagen en <b>${IMG.card.size}</b> (${IMG.card.label}, mínimo ${IMG.card.min} px de ancho) para que se vea nítida, sin recortes ni pixeleo. El panel la ajusta sola a ese tamaño.</p>
    ${[...new Map(C.map(c => [c.secName || '', c])).keys()].map(sec => `<div class="ad-cardsec"><h4>${esc(sec)}</h4><div class="ad-photos ad-cards">${C.filter(c => (c.secName || '') === sec).map(c => photoSlot('home.cards.' + c.id, 'card', esc(c.t), true)).join('')}</div></div>`).join('')}</section>
  <section class="panel"><h3>Experiencias <small>imagen de cada experiencia en la sección Experiencias</small></h3>
    <div class="ad-photos">${[['canales', 'Paseo por los canales'], ['pesca', 'Pesca de altura'], ['senderismo', 'Senderismo en La Borracha (pronto)']].map(([k, l]) => photoSlot('home.exp.' + k, 'cover', l)).join('')}</div>
    <div class="adm-form">${inp('home.expTxt.pesca', 'Texto de la pesca de altura', { area: true, rows: 3, cls: 'ad-wide', ph: 'Vive una jornada completa de pesca deportiva…', hint: 'Vacío = el texto que mandó Eduardo el 18 nov.' })}</div></section>
  <section class="panel"><h3>Accesorios: venta y alquiler <small>en el paso Extras de la reserva, con cantidad</small></h3><p class="rating">Venta: toallas, termos… Alquiler: inflables, bombas… El cliente elige la cantidad y el total se calcula solo. Solo se muestran los que tengan precio.</p>
    <div class="ad-items">${W.shop.map((x, i) => `<div class="ad-item">${photoSlot(`shop.${i}.photo`, 'logo', 'Foto o logo', true)}<div class="adm-form">${inp(`shop.${i}.name`, 'Artículo')}${inp(`shop.${i}.kind`, 'Tipo', { sel: [['venta', 'Venta'], ['alquiler', 'Alquiler']] })}${inp(`shop.${i}.price`, 'Precio (USD)', { t: 'num' })}${inp(`shop.${i}.desc`, 'Detalle (opcional)', { ph: 'Por día, incluye…' })}</div><button type="button" class="icon-btn ad-danger" data-shop-del="${i}">Quitar</button></div>`).join('')}</div>
    <button type="button" class="ad-add" data-shop-add>+ Agregar artículo</button></section>
  <section class="panel"><h3>Comidas y bebidas <small>“Esenciales favoritos para zarpar” en el paso Extras</small></h3><p class="rating">Cada artículo con el logo del aliado, el producto y su precio. Sin precio sale como “precio por confirmar”. Desmarca “Visible” para ocultarlo sin borrarlo.</p>
    <div class="ad-items">${W.food.map((x, i) => `<div class="ad-item">${photoSlot(`food.${i}.logo`, 'logo', 'Logo', true)}<div class="adm-form">${inp(`food.${i}.brand`, 'Aliado', { ph: 'La Cava' })}${inp(`food.${i}.name`, 'Producto')}${inp(`food.${i}.price`, 'Precio (USD)', { t: 'num' })}${inp(`food.${i}.note`, 'Nota (opcional)', { ph: 'Recomendado para lancha' })}<div class="ad-checks">${inp(`food.${i}.off`, 'Oculto por ahora', { t: 'bool' })}</div></div><button type="button" class="icon-btn ad-danger" data-list-del="food.${i}">Quitar</button></div>`).join('')}</div>
    <button type="button" class="ad-add" data-list-add="food">+ Agregar producto</button></section>
`; };

/* ---------------- textos, frases y videos (19 nov) ----------------
   Eduardo cambia los títulos y frases de cada página, los videos (por enlace) y agrega reportajes a la portada.
   Vacío = el texto o video original. El inglés es opcional: si no lo escribe, en inglés se ve el texto original traducido. */
let txSec = 'Portada';
const VID_LBL = k => (T.VID[k] || [k])[0];
VIEW.contenido = () => {
  const S = T.TXT_SLOTS || [], secs = [...new Set(S.map(x => x[1]))];
  if (!secs.includes(txSec)) txSec = secs[0];
  const cur = k => (W.tx[k] || {});
  const orig = sel => { try { const m = sel.match(/^(prev|next):(.+)$/); let e = m ? document.querySelector(m[2]) : document.querySelector(sel); if (m && e) e = m[1] === 'prev' ? e.previousElementSibling : e.nextElementSibling; if (!e) return ''; return (e.__tx0 != null ? (() => { const d = document.createElement('div'); d.innerHTML = e.__tx0; return d.innerText || d.textContent; })() : e.innerText || e.textContent).trim(); } catch { return ''; } };
  const origAfter = sel => { const e = document.querySelector(sel); const n = e && e.nextSibling; return n ? String(n.__tx0 ?? n.nodeValue ?? '').trim() : ''; };
  return `<div class="ad-head"><div><h2>Textos y videos</h2><p class="rating">Cambia los títulos y frases de la web, los videos y los reportajes de la portada. Si dejas un campo vacío, queda el texto original (lo ves en gris). El inglés es opcional.</p></div></div>
  <section class="panel"><h3>Textos y frases</h3>
    <div class="seg ad-txsec" role="group" aria-label="Página">${secs.map(x => `<button type="button" class="chip${x === txSec ? ' on' : ''}" data-txsec="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="ad-tx">${S.filter(x => x[1] === txSec).map(([k, , label, sel, kind]) => { const o = kind === 'after' ? origAfter(sel) : orig(sel), area = kind === 'hero' || o.length > 70; return `<div class="ad-txi"><div class="adm-form">${inp(`tx.${k}.es`, label, { area, rows: kind === 'hero' ? 2 : 3, ph: o, cls: 'ad-wide', hint: kind === 'hero' ? 'Escribe 2 líneas: la segunda sale resaltada.' : '' })}${inp(`tx.${k}.en`, 'En inglés (opcional)', { area, rows: 2, ph: 'English version', cls: 'ad-wide' })}</div>${cur(k).es ? `<button type="button" class="btn btn-ghost btn-sm" data-tx-reset="${k}">Volver al original</button>` : ''}</div>`; }).join('')}</div>
  </section>
  <section class="panel"><h3>Videos de la web <small>pega el enlace de YouTube, Vimeo, Google Drive o un archivo .mp4</small></h3>
    <p class="rating">Para subir un video nuevo: súbelo a YouTube (puede ser “no listado”) o a Google Drive (compartido con “cualquier persona con el enlace”) y pega aquí el enlace. Vacío = el video que ya trae la web.</p>
    <div class="ad-vids">${Object.keys(T.VID).filter(k => k[0] !== '_').map(k => { const u = W.vid[k] || '', v = u ? T.vidSrc(u) : null; return `<div class="ad-vid"><img src="${esc(v && v.poster ? v.poster : 'media/v/' + k + '.jpg')}" alt="" loading="lazy"><div class="adm-form">${inp('vid.' + k, esc(VID_LBL(k)), { ph: 'https://youtu.be/…', cls: 'ad-wide', hint: u && !v ? '⚠️ El enlace debe empezar con https://' : u && v.kind === 'link' ? 'Este enlace se abrirá en otra pestaña (no se puede ver dentro de la web).' : '' })}</div><button type="button" class="btn btn-ghost btn-sm" data-vid-test="${k}">Ver</button></div>`; }).join('')}</div>
  </section>
  <section class="panel"><h3>Reportajes y videos en la portada <small>se agregan a “Nos han reseñado”</small></h3>
    <div class="ad-items">${(W.press = W.press || []).map((x, i) => `<div class="ad-item"><div class="adm-form">${inp(`press.${i}.t`, 'Nombre', { ph: 'Venevisión · Mochima' })}${inp(`press.${i}.url`, 'Enlace', { ph: 'https://youtu.be/…', cls: 'ad-wide' })}</div><button type="button" class="icon-btn ad-danger" data-press-del="${i}">Quitar</button></div>`).join('')}</div>
    <button type="button" class="ad-add" data-press-add>+ Agregar reportaje o video</button>
  </section>`;
};

/* ---------------- mantenimiento (solo el acceso de Luis) ----------------
   Respaldo y restauración del catálogo, volver secciones a como vienen en la app y bloquear lo que Eduardo no debe tocar. */
const LOCK_L = [['boats', 'Embarcaciones y precios', ['flota', 'precios']], ['routes', 'Rumbos y playas', ['rumbos']], ['docks', 'Muelles', ['muelles']], ['pay', 'Pagos y WhatsApp principal', ['pagos']], ['allies', 'Servicio a bordo y proveedores', ['aliados', 'propietarios']], ['home', 'Portada y tienda', ['portada']], ['tx', 'Textos y videos', ['contenido']], ['set', 'Ajustes de reservas', []]];
const isDev = () => TOK && TOK.role === 'dev';
const lockedTab = k => !isDev() && (W.lock || []).some(l => (LOCK_L.find(x => x[0] === l) || [, , []])[2].includes(k));
const RESET_L = [['boats', 'Embarcaciones'], ['routes', 'Rumbos'], ['docks', 'Muelles'], ['allies', 'Servicio a bordo y proveedores'], ['shop', 'Accesorios (tienda)'], ['food', 'Comidas y bebidas'], ['rent', 'Alquiler para propietarios'], ['basic', 'Incluido en todas'], ['tx', 'Textos editados'], ['vid', 'Videos cambiados']];
VIEW.mant = () => isDev() ? `<div class="ad-head"><div><h2>Mantenimiento</h2><p class="rating">Solo lo ves con tu acceso. Eduardo no ve esta pestaña.</p></div></div>
  <section class="panel"><h3>Lo que Eduardo puede editar</h3><p class="rating">Marca lo que quieres bloquear. Eduardo deja de ver esas pestañas y, aunque intente cambiarlas, el servidor conserva lo publicado. Toca <b>Publicar</b> para aplicarlo.</p>
    <div class="ad-checks ad-locks">${LOCK_L.map(([k, l]) => `<label class="chk"><input type="checkbox" data-lock="${k}"${(W.lock || []).includes(k) ? ' checked' : ''}> 🔒 ${esc(l)}</label>`).join('')}</div></section>
  <section class="panel"><h3>Respaldo</h3><p class="rating">Descarga todo el catálogo (embarcaciones, precios, textos, fotos enlazadas) en un archivo. Para restaurarlo, cárgalo aquí, revisa y publica.</p>
    <div class="adm-tools"><button type="button" class="btn btn-sun btn-sm" data-bk-dl>Descargar respaldo</button><label class="btn btn-ghost btn-sm ad-file">Cargar respaldo<input type="file" accept="application/json,.json" data-bk-up hidden></label></div></section>
  <section class="panel"><h3>Volver a como viene en la app</h3><p class="rating">Reemplaza una sección por la versión original de la app. Se aplica al publicar; las versiones anteriores quedan en Ajustes → Versiones publicadas.</p>
    <div class="adm-tools ad-wrap">${RESET_L.map(([k, l]) => `<button type="button" class="btn btn-ghost btn-sm" data-reset-sec="${k}">${esc(l)}</button>`).join('')}</div></section>` : `<div class="ad-head"><h2>Mantenimiento</h2></div><p class="rating">Esta sección es solo para el acceso de mantenimiento.</p>`;

/* ---------------- ajustes ---------------- */
VIEW.ajustes = () => `<div class="ad-head"><div><h2>Ajustes</h2></div><div class="adm-tools">${helpBtn('ajustes')}</div></div>
  <section class="panel"><h3>Anticipación de las reservas</h3><div class="adm-form">${inp('maxDays', 'Se puede reservar con hasta (días)', { t: 'num', min: 1, hint: 'Las fechas más lejanas quedan deshabilitadas en la web. Hoy: 45 días.' })}</div></section>
  <section class="panel"><h3>Incluido en todas las embarcaciones</h3><p class="rating">Una línea por cada cosa. Se muestra en el detalle de cada embarcación.</p><div class="field"><textarea id="basic-ta" rows="8" aria-label="Incluido en todas">${esc(W.basic.join('\n'))}</textarea></div></section>
  <section class="panel"><h3>Versiones publicadas</h3><p class="rating">Si algo salió mal, vuelve a una versión anterior. Se guardan las últimas 15.</p><div id="hist"><button class="btn btn-ghost btn-sm" type="button" id="hist-load">Ver versiones</button></div></section>
  <section class="panel"><h3>Comisión</h3><div class="adm-form"><div class="field"><label for="s-comm">Tu comisión por reserva (%)</label><input id="s-comm" type="number" min="0" max="100" value="${comm()}"><small class="hint">Solo para calcular tu ganancia en el Resumen. Se guarda en este dispositivo.</small></div></div></section>
  <section class="panel"><h3>Usuario y contraseña</h3><form class="adm-form" id="pw-form"><div class="field"><label for="pw-u">Usuario</label><input id="pw-u" autocomplete="username" value="tulanchalecheria" autocapitalize="none"></div><div class="field"><label for="pw-old">Contraseña actual</label><input id="pw-old" type="password" autocomplete="current-password" required></div><div class="field"><label for="pw-new">Nueva contraseña</label><input id="pw-new" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="pw-new2">Repite la nueva</label><input id="pw-new2" type="password" autocomplete="new-password" required></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="submit">Cambiar</button></div></form><p class="err" id="pw-err" role="alert"></p></section>
  <section class="panel"><h3>Respaldo</h3><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" id="bk-json">Descargar respaldo del catálogo</button><button class="btn btn-ghost btn-sm" type="button" id="bk-csv">Descargar reservas (Excel)</button></div></section>`;

/* ---------------- ventanas emergentes ---------------- */
/* las ventanas se apilan: la ayuda o el recorte de una foto se abren encima del editor sin cerrarlo */
function sheet(html, kind = '') {
  const o = document.createElement('div'); o.className = 'ad-ov';
  o.innerHTML = `<div class="ad-sheet${kind ? ' k-' + kind : ''}" role="dialog" aria-modal="true"><button type="button" class="m-close" data-close aria-label="Cerrar">×</button>${html}</div>`;
  adm.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  const f = $('input,select,textarea,button:not(.m-close)', o); if (f && kind !== 'help') setTimeout(() => f.focus({ preventScroll: true }), 60);
}
function closeSheet() { const l = $$('.ad-ov', adm); if (l.length) l[l.length - 1].remove(); }
function closeTop() { closeSheet(); if (!$('.ad-ov', adm) && editing != null) { editing = null; render(); } }
const HELP = {
  bienvenida: ['Bienvenido a tu panel', `<p>Desde aquí controlas tu app. Todo lo que cambies se guarda primero como <b>borrador</b> y los clientes lo ven cuando tocas <b>Publicar cambios</b> (la barra amarilla de abajo).</p>
    <ol class="ad-steps"><li><b>Resumen:</b> tus ventas, lo cobrado, lo que falta por cobrar y las próximas salidas.</li><li><b>Reservas:</b> llegan solas desde la app. Confírmalas, marca los pagos y escribe al cliente.</li><li><b>Embarcaciones:</b> fotos, precios, capacidad, accesorios, hora extra y recogidas de cada una.</li><li><b>Rumbos y playas:</b> playas de cada rumbo, recargos y fotos.</li><li><b>Muelles:</b> toques de muelle y recargos de recogida.</li><li><b>Pagos:</b> tu Zelle y Binance para que el cliente pague el abono.</li><li><b>Aliados:</b> marcas que recomiendas, con su logo y enlace.</li><li><b>Ajustes:</b> contraseña, versiones anteriores y respaldo.</li></ol>
    <p class="hint">En cada sección hay un botón <b>?</b> con instrucciones. Si te equivocas, en Ajustes puedes volver a una versión anterior.</p>`],
  inicio: ['El resumen', `<p>Muestra tus números con las reservas registradas (las canceladas no cuentan).</p><ul><li><b>Ventas:</b> suma del total de las reservas del período.</li><li><b>Cobrado:</b> lo que marcaste como pagado.</li><li><b>Por cobrar:</b> la diferencia.</li><li><b>Tu comisión:</b> se calcula con el % que pones en Ajustes.</li></ul><p>Cambia el período arriba (mes, 3 meses o 12 meses). Las flechas comparan con el período anterior.</p>`],
  reservas: ['Las reservas', `<p>Cuando un cliente confirma en la app, la reserva llega aquí con estado <b>Nueva</b>, y a ti te escribe por WhatsApp con el mismo código.</p><p>Si el cliente escogió su propio muelle, la reserva muestra <b>📍 Muelle escogido por el cliente</b>: tócalo para verlo en el mapa satelital, abrirlo en Google Maps o enviárselo al capitán por WhatsApp.</p><ol class="ad-steps"><li>Verifica la disponibilidad y el pago del abono.</li><li>Toca <b>Confirmar</b> y luego <b>Abono 50%</b> o <b>Marcar pagado</b>.</li><li>Si no se da, toca <b>Cancelar</b>: deja de contar en tus números.</li></ol><p>Las reservas que cierras por WhatsApp o Instagram regístralas con <b>+ Registrar reserva</b> para que tus números estén completos.</p>`],
  flota: ['Tus embarcaciones', `<ul><li>Toca <b>Editar</b> para cambiar fotos, precio, capacidad, accesorios, horario y recogidas.</li><li>Con las flechas <b>↑ ↓</b> cambias el orden en que aparecen en la web.</li><li>La marcada como <b>De la casa</b> sale destacada en la portada y primero en la reserva.</li><li>Si una embarcación no está disponible por un tiempo, márcala como <b>Ocultar de la web</b> en vez de eliminarla.</li></ul><p class="hint">Recuerda tocar Publicar cambios al terminar.</p>`],
  barco: ['Editar una embarcación', `<p>Cada cambio queda en el borrador al momento. Toca <b>Listo</b> para volver y luego <b>Publicar cambios</b>.</p><ul><li><b>Tarifa por día:</b> el precio base en dólares. El recargo de fin de semana se suma solo.</li><li><b>Hora extra:</b> hasta qué hora puede quedarse y cuánto cuesta cada hora. Si no permite, el cliente no la puede pedir.</li><li><b>Playas por salida:</b> cuántas playas puede elegir el cliente.</li><li><b>Recogidas:</b> si por su calado no llega a una residencia, elige “No llega”; si la tienes cerca y no cobras, “Sin recargo”.</li></ul>`],
  fotos: ['Qué fotos subir', `<p>Puedes subirlas directo desde la galería del teléfono. El panel las recorta y las optimiza solo para que la app cargue rápido.</p><ul><li><b>Formato:</b> JPG, PNG o WebP. En iPhone también sirven las fotos normales de la cámara.</li><li><b>Orientación:</b> horizontal (acostada).</li><li><b>Medida ideal:</b> ${IMG.boat.size} (proporción 16:10). Mínimo ${IMG.boat.min} px de ancho para que no se vea borrosa.</li><li><b>Peso:</b> no importa, el panel la reduce a unos 200 a 400 KB.</li></ul><ol class="ad-steps"><li><b>Dron:</b> la principal. La embarcación completa desde arriba, en el agua.</li><li><b>Exterior:</b> de lado, navegando o fondeada.</li><li><b>Interior:</b> la cubierta o el salón, con buena luz.</li><li><b>Camarote:</b> solo si tiene.</li></ol><p class="hint">Consejos: luz de día, sin textos ni marcas de agua, la embarcación centrada. Al subirla verás una vista previa y podrás mover el encuadre.</p>`],
  playas: ['Fotos de las playas', `<ul><li><b>Medida ideal:</b> ${IMG.beach.size}, cuadrada. Mínimo ${IMG.beach.min} px.</li><li>Una captura nítida del video de dron sirve perfecto.</li><li>Lo importante al centro: el texto de la tarjeta va abajo.</li></ul><p>Si cambias el nombre de una playa, vuelve a subir su foto.</p>`],
  accesorios: ['Accesorios', `<p>Para cada accesorio elige:</p><ul><li><b>No tiene.</b></li><li><b>Incluido:</b> va en el precio.</li><li><b>Con costo:</b> escribe el precio. El cliente lo puede sumar en la reserva y se agrega al total (por ejemplo, parrillera +$20).</li></ul><p>Lo que es igual en todas (tripulación, chalecos, ducha, botiquín) se edita en Ajustes.</p>`],
  textos: ['Texto en inglés', `<p>La web abre siempre en español y tiene un botón para verla en inglés. Los textos que ya existen están traducidos. Si escribes una descripción nueva, agrega su versión en inglés para que los turistas la lean en su idioma. Si la dejas vacía, verán el texto en español.</p>`],
  precios: ['Precio por rumbo', `<p>Cada embarcación puede tener un precio distinto en cada rumbo. No es un recargo: es la tarifa de ese rumbo.</p><ul><li><b>Tarifa base:</b> usa la tarifa por día (más la diferencia del rumbo, si la pusiste en Rumbos).</li><li><b>Precio propio:</b> el precio de esta embarcación en ese rumbo.</li><li><b>Por confirmar:</b> la hace, y el precio se confirma por WhatsApp.</li><li><b>No lo hace:</b> el cliente no ve ese rumbo con esta embarcación.</li></ul>`],
  portada: ['Portada y tienda', `<ul><li><b>Foto principal:</b> ${IMG.hero.size}, horizontal. Lo importante al centro.</li><li><b>Menú giratorio:</b> ${IMG.card.size}, vertical. Mientras no subas una, se ve una imagen difuminada de relleno.</li><li><b>Tienda:</b> accesorios que tienes en stock (toallas, termos, inflables…). El cliente los suma en el paso de extras. Sin precio no se muestran.</li></ul>`],
  rumbos: ['Rumbos y playas', `<ul><li><b>Diferencia sobre la tarifa base:</b> solo para las embarcaciones que no tienen precio propio en ese rumbo. Vacío = precio por confirmar.</li><li><b>Millas náuticas:</b> distancia aproximada que ve el cliente.</li><li><b>Solo para embarcaciones que lo hacen:</b> el rumbo solo aparece con las embarcaciones que tienen precio o “por confirmar” en ese rumbo.</li><li><b>Playas:</b> agrega, quita o cambia nombres. El cliente elige entre las playas del rumbo, según el límite de cada embarcación.</li><li><b>Cotización especial:</b> destinos que no se reservan en la app (Píritu, La Tortuga…).</li></ul>`],
  muelles: ['Muelles y recogidas', `<ul><li><b>Muelle sugerido:</b> el servicio por uso de muelle lo cobra el establecimiento y se paga en sitio; escríbelo como quieres que se vea (ej. “$11,6 a tasa BCV”).</li><li><b>Recogida en residencia:</b> costo de Tu Lancha Lechería por buscar al cliente, según el tamaño de la embarcación (vacío = ese tamaño no llega).</li><li><b>Solo lanchas:</b> los yates no pueden llegar por la profundidad.</li><li><b>No habilitado:</b> aparece como no disponible.</li></ul><p class="hint">Por embarcación puedes decir que no llega o que no cobra recargo (en Embarcaciones › Editar).</p>`],
  pagos: ['Datos de pago', `<p>Cuando el cliente confirma su reserva y elige Zelle o Binance, la app le muestra estos datos para pagar el abono del 50% y le pide mandarte la captura por WhatsApp.</p><ul><li><b>Zelle:</b> puedes tener varias cuentas guardadas, pero el cliente ve <b>solo la principal</b>. Para cambiarla, marca otra como principal y toca Publicar cambios.</li><li><b>Binance:</b> el cliente ve tu ID, tu usuario, el código QR y un botón para abrir Binance desde el teléfono.</li><li><b>Código QR:</b> sube la imagen del QR que te da Binance (una captura de pantalla sirve). Se guarda en PNG para que se pueda escanear.</li></ul><p class="hint">Si dejas los datos vacíos, la app le dice al cliente que se los envías por WhatsApp.</p>`],
  aliados: ['Aliados', `<ul><li><b>Logo:</b> cuadrado, ${IMG.logo.size}, en PNG con fondo blanco o transparente.</li><li><b>Enlace:</b> su web, Instagram o menú. Si lo dejas vacío, el botón abre tu WhatsApp para pedir ese servicio.</li></ul>`],
  ajustes: ['Ajustes', `<ul><li><b>Versiones:</b> cada vez que publicas se guarda la versión anterior. Puedes volver a cualquiera de las últimas 15.</li><li><b>Contraseña:</b> cámbiala la primera vez que entres y no la compartas.</li><li><b>Respaldo:</b> descarga una copia del catálogo y de tus reservas cuando quieras.</li></ul>`]
};
function help(k) { const h = HELP[k]; if (!h) return; sheet(`<h3>${h[0]}</h3><div class="ad-help-b">${h[1]}</div><div class="ad-sheet-f"><button class="btn btn-sun" type="button" data-close>Entendido</button></div>`, 'help'); if (k === 'bienvenida') store.set('adm-welcome', true); }

/* ---------------- fotos: recorte, compresión y subida ---------------- */
function loadImg(file) { return new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => ok({ im, u }); im.onerror = () => { URL.revokeObjectURL(u); no(new Error('decode')); }; im.src = u; }); }
function drawTo(im, spec, pos) {
  const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; const x = c.getContext('2d');
  const iw = im.naturalWidth, ih = im.naturalHeight;
  if (spec.fit === 'contain') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, spec.w, spec.h); const s = Math.min(spec.w / iw, spec.h / ih) * .9, w = iw * s, h = ih * s; x.drawImage(im, (spec.w - w) / 2, (spec.h - h) / 2, w, h); return c; }
  const s = Math.max(spec.w / iw, spec.h / ih), w = spec.w / s, h = spec.h / s;
  const sx = (iw - w) * pos, sy = (ih - h) * pos;
  x.imageSmoothingQuality = 'high'; x.drawImage(im, iw > w ? sx : 0, ih > h ? sy : 0, w, h, 0, 0, spec.w, spec.h); return c;
}
const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
async function encode(c, spec = {}) {
  if (spec.png) return toBlob(c, 'image/png');
  let q = .82, b = await toBlob(c, 'image/webp', q);
  if (!b || b.type !== 'image/webp') { q = .85; b = await toBlob(c, 'image/jpeg', q); }
  while (b && b.size > 650000 && q > .5) { q -= .1; b = await toBlob(c, b.type, q); }
  return b;
}
const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
function pickPhoto(path, kind) {
  const spec = IMG[kind], f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = async () => {
    const file = f.files && f.files[0]; if (!file) return;
    let L; try { L = await loadImg(file); } catch { toast('No se pudo abrir esa imagen. Prueba con una foto JPG o PNG.'); return; }
    const { im } = L, small = Math.max(im.naturalWidth, im.naturalHeight) < spec.min;
    const wide = im.naturalWidth / im.naturalHeight, target = spec.w / spec.h, axis = wide > target ? 'horizontal' : 'vertical';
    let pos = .5;
    sheet(`<h3>Vista previa</h3><p class="rating">Así se verá en la app (${spec.label}). ${spec.fit === 'cover' ? `Mueve el encuadre si hace falta.` : ''}</p>
      <div class="ad-crop k-${kind}"><canvas id="crop-c"></canvas></div>
      ${spec.fit === 'cover' && Math.abs(wide - target) > .02 ? `<div class="field"><label for="crop-r">Encuadre ${axis === 'horizontal' ? '(izquierda ↔ derecha)' : '(arriba ↕ abajo)'}</label><input type="range" id="crop-r" min="0" max="100" value="50"></div>` : ''}
      ${small ? `<p class="ad-warn">⚠️ Esta foto es pequeña (${im.naturalWidth} × ${im.naturalHeight} px) y puede verse borrosa. Lo ideal es ${spec.size}.</p>` : ''}
      ${kind === 'boat' && wide < 1 ? '<p class="ad-warn">⚠️ La foto está vertical. Se ve mejor una foto horizontal.</p>' : ''}
      <div class="ad-sheet-f"><button class="btn btn-sun" type="button" id="crop-ok">Usar esta foto</button><button class="btn btn-ghost btn-sm" type="button" data-close>Cancelar</button></div>`, 'crop');
    const cv = $('#crop-c'), paint = () => { const c = drawTo(im, spec, pos); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); };
    paint();
    const rg = $('#crop-r'); if (rg) rg.oninput = () => { pos = rg.value / 100; paint(); };
    $('#crop-ok').onclick = async () => {
      const btn = $('#crop-ok'); btn.disabled = true; btn.textContent = 'Subiendo…';
      try {
        const blob = await encode(drawTo(im, spec, pos), spec);
        const j = await api('upload', { mime: blob.type, data: await b64(blob) });
        setPath(W, path, j.url); URL.revokeObjectURL(L.u);
        toast('Foto lista. Publica los cambios para que la vean tus clientes.');
        reopen();
      } catch (e) { btn.disabled = false; btn.textContent = 'Usar esta foto'; toast(errMsg(e)); }
    };
  };
  f.click();
}
let editing = null;   // embarcación abierta en el editor, para volver a ella después de subir una foto
function reopen() { const s = $('.ad-sheet.k-boat', adm), st = s ? s.scrollTop : 0; render(); if (editing != null) { boatEditor(editing); const n = $('.ad-sheet.k-boat', adm); if (n) n.scrollTop = st; } }

/* ---------------- eventos ---------------- */
adm.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'bk-q') { bkQuery = el.value; const pos = el.selectionStart; render(); const n = $('#bk-q', adm); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (el.dataset.k && W) { setPath(W, el.dataset.k, readVal(el)); refreshSaveBar(); if (el.dataset.k.startsWith('pay.')) { const pv = $('.ad-preview', adm); if (pv) pv.innerHTML = payPreview(); } if (el.dataset.k.endsWith('.name')) { const h = el.closest('.ad-sheet,.panel'); const t = h && $('h3', h); if (t && el.closest('.ad-sheet')) t.textContent = el.value; } return; }
  if (el.dataset.beach) { const [i, j] = el.dataset.beach.split('.').map(Number), r = W.routes[i], old = r.beaches[j], nw = el.value; r.beaches[j] = nw; const ko = old.replace(/\./g, '·'), kn = nw.replace(/\./g, '·'); if (W.beachPhotos[ko] && ko !== kn) { W.beachPhotos[kn] = W.beachPhotos[ko]; delete W.beachPhotos[ko]; } refreshSaveBar(); return; }
  if (el.dataset.px) { const [i, rid] = el.dataset.px.split('.'), b = W.boats[+i]; pxSet(b, rid, pxSeason === 'hi', pxRead(el.value)); refreshSaveBar(); return; }
  if (el.dataset.pxd) { const [i, id] = el.dataset.pxd.split('.'), b = W.boats[+i], x = pxRead(el.value); b.pick = b.pick || {}; if (x === undefined) { if (/^0$/.test(el.value.trim())) b.pick[id] = 0; else delete b.pick[id]; } else b.pick[id] = x === true ? 0 : x; refreshSaveBar(); return; }
  if (el.dataset.rpp) { W.boats[editing].rp[el.dataset.rpp] = +el.value || 0; refreshSaveBar(); return; }
  if (el.dataset.pickp) { W.boats[editing].pick[el.dataset.pickp] = +el.value || 0; refreshSaveBar(); return; }
  if (el.dataset.accp) { const b = W.boats[editing]; b.opt[el.dataset.accp] = +el.value || 0; refreshSaveBar(); return; }
  if (el.id === 'basic-ta') { W.basic = el.value.split('\n').map(x => x.trim()).filter(Boolean); refreshSaveBar(); return; }
  if (el.id === 's-comm') { store.set('adm-comm', Math.min(100, Math.max(0, +el.value || 0))); }
});
adm.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.lock && isDev()) { const k = el.dataset.lock; W.lock = (W.lock || []).filter(x => x !== k); if (el.checked) W.lock.push(k); refreshSaveBar(); return; }
  if (el.dataset.bkUp != null && isDev() && el.files && el.files[0]) { const f = el.files[0]; f.text().then(t => { let c; try { c = JSON.parse(t); } catch { toast('Ese archivo no es un respaldo válido'); return; } if (!c || !Array.isArray(c.boats)) { toast('Ese archivo no es un respaldo del catálogo'); return; } if (!confirm('¿Cargar este respaldo? Reemplaza lo que ves en el panel; se publica cuando toques Publicar.')) return; const lock = W.lock; W = fromCat(c); if (!Array.isArray(c.lock)) W.lock = lock; refreshSaveBar(); render(); toast('Respaldo cargado: revisa y publica'); }); el.value = ''; return; }
  if (el.dataset.k && W && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color')) { setPath(W, el.dataset.k, readVal(el)); refreshSaveBar(); if (el.closest('.ad-sheet') && /\.(hidden|type)$/.test(el.dataset.k)) { const sc = $('.ad-sheet.k-boat', adm), st = sc ? sc.scrollTop : 0; render(); boatEditor(editing); const n = $('.ad-sheet.k-boat', adm); if (n) n.scrollTop = st; } return; }
  if (el.dataset.acc) { const b = W.boats[editing], k = el.dataset.acc, v = el.value; b.inc = b.inc.filter(x => x !== k); delete b.opt[k]; if (v === 'inc') b.inc.push(k); if (v === 'opt') b.opt[k] = 0; const p = $(`[data-accp="${k}"]`, adm); p.hidden = v !== 'opt'; if (v === 'opt') p.focus(); refreshSaveBar(); return; }
  if (el.dataset.zon != null) { W.pay.zelleOn = +el.dataset.zon; refreshSaveBar(); render(); return; }
  if (el.dataset.rp) { const b = W.boats[editing], k = el.dataset.rp, v = el.value, inpP = $(`[data-rpp="${k}"]`, adm); if (v === 'def') delete b.rp[k]; else b.rp[k] = v === 'no' ? null : v === 'tbd' ? true : +inpP.value || +b.price || 0; inpP.hidden = v !== 'num'; const ph = $(`[data-rph="${k}"]`, adm); if (ph) ph.hidden = v !== 'num'; if (v === 'num') { inpP.value = b.rp[k]; inpP.focus(); } refreshSaveBar(); return; }
  if (el.dataset.dockok) { const b = W.boats[editing], all = W.docks.filter(d => !d.off && !d.custom).map(d => d.id); const on = $$('[data-dockok]', adm).filter(x => x.checked).map(x => x.dataset.dockok); if (!on.length) { el.checked = true; return toast('Debe poder salir de al menos un muelle'); } if (on.length === all.length) delete b.docks; else b.docks = on; refreshSaveBar(); return; }
  if (el.dataset.rclosed != null) { const r = W.routes[+el.dataset.rclosed]; if (el.checked) r.open = false; else delete r.open; refreshSaveBar(); return; }
  if (el.dataset.pick) { const b = W.boats[editing], k = el.dataset.pick, ip = $(`[data-pickp="${k}"]`, adm); if (el.value === 'std') delete b.pick[k]; else b.pick[k] = el.value === 'no' ? null : el.value === 'own' ? +ip.value || 0 : 0; ip.hidden = el.value !== 'own'; if (el.value === 'own') ip.focus(); refreshSaveBar(); return; }
  if (el.dataset.own != null) { W.boats.forEach((b, j) => { if (el.checked ? j !== +el.dataset.own : false) delete b.own; }); if (el.checked) { W.boats[+el.dataset.own].own = true; const [b] = W.boats.splice(+el.dataset.own, 1); W.boats.unshift(b); editing = 0; } else delete W.boats[+el.dataset.own].own; refreshSaveBar(); render(); boatEditor(editing); }
});
adm.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-adtab]'); if (!t) { if (e.target.classList.contains('ad-ov')) closeTop(); return; }
  const d = t.dataset;
  if (d.close != null) { closeTop(); return; }
  if (d.adtab) { tab = d.adtab; editing = null; render(); adm.scrollTop = 0; return; }
  if (d.help) return help(d.help);
  if (d.p) { period = d.p; render(); return; }
  if (t.id === 'a-out') { if (dirty() && !confirm('Tienes cambios sin publicar. ¿Salir de todas formas?')) return; return logout(); }
  if (t.id === 'a-demo') { demo = !demo; render(); return; }
  if (t.id === 'a-discard') { if (!confirm('¿Descartar todos los cambios sin publicar?')) return; W = fromCat(JSON.parse(PUB)); render(); toast('Cambios descartados'); return; }
  if (t.id === 'a-pub') {
    t.disabled = true; t.textContent = 'Publicando…';
    try { await api('save', { cat: W, note: 'Publicado desde el panel' }); PUB = snap(); store.set('cat', JSON.parse(PUB)); T.refreshCatalog(JSON.parse(PUB)); toast('¡Publicado! Tus clientes ya ven los cambios.'); render(); }
    catch (err) { t.disabled = false; t.textContent = 'Publicar cambios'; toast(errMsg(err)); }
    return;
  }
  if (d.up) return pickPhoto(d.up, d.kind);
  if (d.rmph) { setPath(W, d.rmph, /^(allies|pay)\./.test(d.rmph) ? '' : undefined); refreshSaveBar(); reopen(); return; }
  // reservas
  if (d.bkf) { bkFilter = d.bkf; render(); return; }
  if (d.bkNew != null) return bkForm();
  if (d.bka) {
    const code = t.closest('[data-code]').dataset.code, b = BK.find(x => x.code === code); if (!b) return;
    if (d.bka === 'edit') return bkForm(b);
    if (d.bka === 'map') return pinSheet(b);
    if (d.bka === 'owner') { window.open(ownerUrl(b), '_blank', 'noopener'); return; }
    /* Al confirmar, la reserva se le envía al propietario por WhatsApp con todo el detalle (pedido de Eduardo, 18 nov).
       La ventana se abre en el mismo toque para que el teléfono no la bloquee; si no se pudo guardar, se cierra. */
    if (d.bka === 'ok' && ownerOf(b)) {
      const w = window.open('', '_blank');
      try { const nb = await saveBk({ code, status: 'confirmada' }); if (w) w.location.href = ownerUrl(nb); else window.open(ownerUrl(nb), '_blank', 'noopener'); toast('Reserva confirmada · enviada al propietario por WhatsApp'); render(); }
      catch (err) { if (w) w.close(); toast(errMsg(err)); }
      return;
    }
    if (d.bka === 'wa') { const n = String(b.phone).replace(/\D/g, '').replace(/^0/, '58'); window.open(`https://wa.me/${n}?text=${encodeURIComponent(`¡Hola ${b.name}! Te escribo de Tu Lancha Lechería por tu reserva ${b.code}.`)}`, '_blank', 'noopener'); return; }
    if (d.bka === 'del') { if (!confirm(`¿Borrar la reserva ${code}? No se puede deshacer.`)) return; try { await api('bk', { del: code }); BK = BK.filter(x => x !== b); toast('Reserva borrada'); render(); } catch (err) { toast(errMsg(err)); } return; }
    if (d.bka === 'cancel' && !confirm(`¿Cancelar la reserva ${code}?`)) return;
    const patch = { ok: { status: 'confirmada' }, half: { paid: Math.round((+b.total || 0) / 2) }, paid: { paid: +b.total || 0, status: b.status === 'cancelada' ? b.status : 'confirmada' }, cancel: { status: 'cancelada' } }[d.bka];
    try { await saveBk({ code, ...patch }); toast({ ok: 'Reserva confirmada', half: 'Abono registrado', paid: 'Marcada como pagada', cancel: 'Reserva cancelada' }[d.bka]); render(); } catch (err) { toast(errMsg(err)); }
    return;
  }
  if (t.id === 'bk-csv') {
    const rows = [['codigo', 'fecha', 'cliente', 'telefono', 'embarcacion', 'rumbo', 'muelle', 'ubicacion', 'personas', 'total', 'pagado', 'estado', 'canal', 'idioma', 'nota']].concat(BK.map(b => [b.code, dOf(b), b.name, b.phone, b.boat, b.route, b.dock, T.okPin(b.pin) ? T.gmapsUrl(b.pin) : '', b.pax, b.total, b.paid, b.status, b.channel, b.lang, b.note]));
    dl(`tulancha-reservas-${iso(today)}.csv`, '﻿' + rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv'); return;
  }
  if (t.id === 'bk-json') { dl(`tulancha-catalogo-${iso(today)}.json`, JSON.stringify(W, null, 1), 'application/json'); return; }
  // embarcaciones
  if (d.boatEdit != null) { editing = +d.boatEdit; return boatEditor(editing); }
  if (d.pxSeason) { pxSeason = d.pxSeason; render(); return; }
  if (d.pxPasteOpen != null) { const f = $('[data-px-paste]', adm); f.hidden = !f.hidden; if (!f.hidden) $('#px-ta', adm).focus(); return; }
  if (d.pxEdu != null || d.pxApply != null) {
    const txt = d.pxEdu != null ? EDU_18NOV : $('#px-ta', adm).value;
    const r = pxImport(txt);
    if (d.pxEdu != null) W.routes.forEach(x => { if (EDU_NM[x.id]) x.nm = EDU_NM[x.id]; });
    if (d.pxEdu != null && !(+W.hiPct > 0)) W.hiPct = 10;   // en su cuadro la temporada alta es la regular + 10%
    if (!r.done.length) { toast('No encontré filas con precios. Copia desde el nombre hasta Playa Pescadores.'); return; }
    pxReport = `<b>${r.done.length} embarcaciones actualizadas.</b>${r.added.length ? ` Agregadas ocultas (ponles fotos en Embarcaciones y muéstralas): ${r.added.map(esc).join(', ')}.` : ''}${d.pxEdu != null ? ' Millas de los 6 rumbos actualizadas (rumbo completo).' : ''} Revisa la tabla y toca <b>Publicar</b>.`;
    refreshSaveBar(); render(); toast('Precios cargados: revisa y publica'); return;
  }
  if (d.boatNew != null) { W.boats.push({ id: 'b' + Date.now().toString(36), name: 'Nueva embarcación', type: 'Lancha', ft: 30, pax: 8, price: 300, hue: 200, dock: 0, cabin: false, rating: 5, trips: 0, inc: [], opt: {}, amen: [], desc: '', photos: {}, pick: {}, rp: {}, qty: {}, docs: {}, kx: 0, hidden: true }); editing = W.boats.length - 1; refreshSaveBar(); render(); boatEditor(editing); toast('Queda oculta hasta que desmarques “Ocultar de la web”.'); return; }
  if (d.boatUp != null || d.boatDown != null) { const i = +(d.boatUp ?? d.boatDown), j = d.boatUp != null ? i - 1 : i + 1; if (j < 0 || j >= W.boats.length) return; [W.boats[i], W.boats[j]] = [W.boats[j], W.boats[i]]; render(); return; }
  if (d.boatDup != null) { const b = clone(W.boats[+d.boatDup]); b.id = 'b' + Date.now().toString(36); b.name += ' (copia)'; delete b.own; b.hidden = true; W.boats.splice(+d.boatDup + 1, 0, b); editing = +d.boatDup + 1; render(); boatEditor(editing); toast('Copia creada (oculta)'); return; }
  if (d.boatDel != null) { const b = W.boats[+d.boatDel]; if (W.boats.length < 2) return toast('Debe quedar al menos una embarcación'); if (!confirm(`¿Eliminar ${b.name}? Si solo no está disponible por un tiempo, mejor ocúltala.`)) return; W.boats.splice(+d.boatDel, 1); if (b.own) W.boats[0].own = true; editing = null; closeSheet(); render(); return; }
  // temporada alta
  if (d.seasonAdd != null) { const y = new Date().getFullYear(); W.seasons.push({ name: '', from: `${y}-12-15`, to: `${y + 1}-01-15` }); refreshSaveBar(); render(); return; }
  if (d.seasonDel != null) { W.seasons.splice(+d.seasonDel, 1); refreshSaveBar(); render(); return; }
  // rumbos
  if (d.beachAdd != null) { W.routes[+d.beachAdd].beaches.push('Nueva playa'); render(); const ins = $$(`[data-beach^="${d.beachAdd}."]`, adm); const l = ins[ins.length - 1]; if (l) { l.focus(); l.select(); } return; }
  if (d.beachDel != null) { const [i, j] = d.beachDel.split('.').map(Number), r = W.routes[i]; if (r.beaches.length < 2) return toast('Cada rumbo necesita al menos una playa'); if (!confirm(`¿Quitar ${r.beaches[j]} del ${r.name}?`)) return; r.beaches.splice(j, 1); render(); return; }
  // muelles
  if (d.dockNew != null) {
    sheet(`<h3>Agregar</h3><p class="rating">¿Qué quieres agregar?</p><div class="ad-sheet-f"><button class="btn btn-sun" type="button" data-dock-add="m">Muelle sugerido</button><button class="btn btn-ghost" type="button" data-dock-add="p">Recogida en residencia</button></div>`, 'help'); return;
  }
  if (d.dockAdd) { closeSheet(); W.docks.push(d.dockAdd === 'm' ? { id: 'd' + Date.now().toString(36), name: 'Nuevo muelle', fee: '', park: '' } : { id: 'd' + Date.now().toString(36), name: 'Nueva residencia', pickup: true, cost: { s: 20, m: 20, my: 30, y: 30 } }); closeSheet(); render(); const ins = $$('[data-k$=".name"]', adm); ins[ins.length - 1].focus(); return; }
  if (d.routeNew != null) { let n = W.routes.length + 1; while (W.routes.some(r => r.id === 'r' + n)) n++; W.routes.push({ id: 'r' + n, name: 'Rumbo ' + n, zone: '', min: 60, nm: 0, add: null, open: false, tags: [], desc: '', beaches: ['Nueva playa'] }); refreshSaveBar(); render(); const ins = $$('[data-k$=".name"]', adm); const l = ins[ins.length - 1]; if (l) { l.focus(); l.select(); } return; }
  // portada y tienda
  if (d.listAdd) { const k = d.listAdd; W[k].push(k === 'food' ? { id: 'f' + Date.now().toString(36), brand: '', name: '', price: 0 } : { id: 'r' + Date.now().toString(36), name: '', desc: '', price: 0, dep: 0 }); render(); const ins = $$(`[data-k^="${k}."][data-k$=".name"]`, adm); const l = ins[ins.length - 1]; if (l) l.focus(); return; }
  if (d.listDel) { const [k, i] = d.listDel.split('.'), x = W[k][+i]; if (x && x.name && !confirm(`¿Quitar ${x.name}?`)) return; W[k].splice(+i, 1); render(); return; }
  if (d.shopAdd != null) { W.shop.push({ id: 's' + Date.now().toString(36), name: '', price: 0, kind: 'venta' }); render(); const ins = $$('[data-k^="shop."][data-k$=".name"]', adm); const l = ins[ins.length - 1]; if (l) l.focus(); return; }
  if (d.shopDel != null) { const x = W.shop[+d.shopDel]; if (x.name && !confirm(`¿Quitar ${x.name} de la tienda?`)) return; W.shop.splice(+d.shopDel, 1); render(); return; }
  // pagos
  if (d.zadd != null) { W.pay.zelles.push({ name: '', email: '' }); render(); const ins = $$('[data-k$=".name"]', adm); const l = ins[ins.length - 1]; if (l) l.focus(); return; }
  if (d.zdel != null) { const i = +d.zdel, z = W.pay.zelles[i]; if (!confirm(`¿Quitar la cuenta Zelle${z.name ? ' de ' + z.name : ''}?`)) return; W.pay.zelles.splice(i, 1); if (W.pay.zelleOn > i) W.pay.zelleOn--; if (W.pay.zelleOn >= W.pay.zelles.length) W.pay.zelleOn = 0; render(); return; }
  // aliados
  if (d.txsec) { txSec = d.txsec; render(); return; }
  if (d.txReset) { delete W.tx[d.txReset]; refreshSaveBar(); render(); return; }
  if (d.vidTest) { const u = W.vid[d.vidTest]; const v = u ? T.vidSrc(u) : null; if (u && !v) { toast('El enlace debe empezar con https://'); return; } if (v && v.kind === 'link') { window.open(v.src, '_blank', 'noopener'); return; } window.TLL_PREVIEW_VID ? window.TLL_PREVIEW_VID(d.vidTest, u) : window.open(u || `media/v/${d.vidTest}.mp4`, '_blank', 'noopener'); return; }
  if (d.pressAdd != null) { (W.press = W.press || []).push({ t: '', url: '' }); refreshSaveBar(); render(); return; }
  if (d.pressDel != null) { W.press.splice(+d.pressDel, 1); refreshSaveBar(); render(); return; }
  if (d.bkDl != null) { const b = new Blob([JSON.stringify(W, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `tulanchalecheria-respaldo-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return; }
  if (d.resetSec) { if (!isDev()) return; const k = d.resetSec; if (!confirm(`¿Volver “${(RESET_L.find(x => x[0] === k) || [, k])[1]}” a como viene en la app? Se aplica al publicar.`)) return; W[k] = k === 'tx' || k === 'vid' ? {} : clone(DEF[k]); refreshSaveBar(); render(); toast('Listo: revisa y publica'); return; }
  if (d.allyCopy != null) { const [i, j] = d.allyCopy.split('.').map(Number), it = W.allies[i].items[j]; const link = allyShare(it); try { await navigator.clipboard.writeText(link); toast('Enlace copiado: pégalo donde quieras'); } catch { prompt('Copia este enlace:', link); } return; }
  if (d.allyAdd != null) { W.allies[+d.allyAdd].items.push(['Nuevo aliado', '', '', '#232843', '', '']); render(); return; }
  if (d.allyDel != null) { const [i, j] = d.allyDel.split('.').map(Number); if (!confirm(`¿Quitar ${W.allies[i].items[j][0]}?`)) return; W.allies[i].items.splice(j, 1); render(); return; }
  if (d.catNew != null) { W.allies.push({ cat: d.catNew === 'owners' ? 'Para propietarios' : 'Nueva categoría', owners: d.catNew === 'owners', items: [['Nuevo aliado', '', '', '#232843', '', '']] }); render(); return; }
  if (d.catDel != null) { W.allies.splice(+d.catDel, 1); render(); return; }
  // ajustes
  if (t.id === 'hist-load') {
    try { const j = await api('hist', null, true); $('#hist', adm).innerHTML = j.list.length ? `<div class="ad-list">${j.list.map(h => `<div class="ad-li"><span class="mono">${new Date(h.t).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span><span>${esc(h.note || 'Versión anterior')}</span><button class="icon-btn" type="button" data-undo="${h.i}">Restaurar</button></div>`).join('')}</div>` : '<p class="rating">Todavía no hay versiones anteriores.</p>'; } catch (err) { toast(errMsg(err)); }
    return;
  }
  if (d.undo != null) { if (!confirm('¿Volver a esta versión? Se publica de inmediato para tus clientes.')) return; try { const j = await api('undo', { i: +d.undo }); W = fromCat(j.cat); PUB = snap(); store.set('cat', j.cat); T.refreshCatalog(j.cat); toast('Versión restaurada y publicada'); render(); } catch (err) { toast(errMsg(err)); } return; }
});
adm.addEventListener('submit', async e => {
  if (e.target.id !== 'pw-form') return;
  e.preventDefault(); const err = $('#pw-err', adm); err.textContent = '';
  const u = $('#pw-u', adm).value.trim(), o = $('#pw-old', adm).value, n1 = $('#pw-new', adm).value, n2 = $('#pw-new2', adm).value;
  if (n1 !== n2) { err.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
  if (n1.length < 8) { err.textContent = 'Usa al menos 8 caracteres.'; return; }
  try { await api('pw', { user: u, old: o, new: n1 }); e.target.reset(); $('#pw-u', adm).value = u; toast('Listo: usuario y contraseña actualizados'); }
  catch (x) { err.textContent = x.code === 'bad_password' ? 'La contraseña actual no es correcta.' : errMsg(x); }
});
function dl(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
addEventListener('beforeunload', e => { if (!adm.hidden && dirty()) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- acceso oculto ---------------- */
async function enter() {
  if (!adm.hidden) return;
  TOK = loadTok();
  if (!TOK) return showLogin();
  try { const me = await api('me', null, true); if (TOK && me && me.role) TOK.role = me.role; await boot(); } catch (e) { if (e.code !== 'session') showLogin(e.code === 'net' ? errMsg(e) : ''); }
}
function maybeOpen() { if (location.hash === '#capitan') enter(); }
addEventListener('hashchange', maybeOpen); maybeOpen();
let taps = 0, tapT;
$('#foot-logo').addEventListener('click', e => { e.preventDefault(); taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1500); if (taps >= 6) { taps = 0; enter(); } });
addEventListener('keydown', e => { if (e.key !== 'Escape' || adm.hidden) return; if ($('.ad-ov', adm)) closeTop(); else if (!W) closeAdm(); });
})();
