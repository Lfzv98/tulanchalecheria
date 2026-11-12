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
    <div style="text-align:center;display:grid;gap:4px"><h2 style="font-size:1.4rem">Panel de control</h2><span class="rating">Acceso exclusivo para la administración de Tu Lancha</span></div>
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
      TOK = { t: j.token, exp: j.expires }; saveTok(TOK, $('#lg-rem').checked);
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
    home: { hero: '', cards: {}, ...(c.home && typeof c.home === 'object' ? c.home : {}) },
    beachPhotos: c.beachPhotos || {},
    tr: c.tr || []
  };
  // campos que el editor necesita, listos desde el inicio para que abrir algo no cuente como cambio
  o.boats.forEach(b => { ['photos', 'opt', 'pick', 'rp', 'qty', 'docs'].forEach(k => { if (!b[k] || typeof b[k] !== 'object') b[k] = {}; }); ['inc', 'amen'].forEach(k => { if (!Array.isArray(b[k])) b[k] = []; }); });
  o.docks.forEach(d => { if (d.pickup && !d.cost) d.cost = {}; });
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
function setPath(o, p, v) { const ks = p.split('.'), last = ks.pop(); const t = ks.reduce((x, k) => x[k], o); if (v === undefined) delete t[last]; else t[last] = v; }
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
const TABS = [['inicio', 'Resumen'], ['reservas', 'Reservas'], ['flota', 'Embarcaciones'], ['rumbos', 'Rumbos y playas'], ['muelles', 'Muelles'], ['pagos', 'Pagos'], ['aliados', 'Servicio a bordo'], ['portada', 'Portada y tienda'], ['ajustes', 'Ajustes']];
function render() {
  bump(); adm.hidden = false; lockScroll(true);
  const nNew = BK.filter(b => b.status === 'nueva').length;
  const sc = adm.scrollTop;
  adm.innerHTML = `<div class="ad">
    <header class="adm-bar"><div class="wrap"><img src="${$('.brand img').src}" alt="" width="34" height="34" class="ad-logo"><b>Panel de control</b>
      <div class="sp"><a class="btn btn-ghost on-sea btn-sm" href="./" target="_blank" rel="noopener">Ver la web</a><button class="btn btn-ghost on-sea btn-sm" type="button" data-help="bienvenida">Ayuda</button><button class="btn btn-sun btn-sm" type="button" id="a-out">Salir</button></div></div>
      <nav class="ad-tabs wrap" aria-label="Secciones del panel">${TABS.map(([k, l]) => `<button type="button" data-adtab="${k}" aria-current="${k === tab ? 'page' : 'false'}">${l}${k === 'reservas' && nNew ? ` <i>${nNew}</i>` : ''}</button>`).join('')}</nav></header>
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
    ${b.route ? `<p class="rating">${esc(b.route)}</p>` : ''}${T.okPin(b.pin) ? `<button type="button" class="ad-pin" data-bka="map"><span class="ad-pin-ic" aria-hidden="true">${T.PIN_SVG}</span><span><b>Muelle escogido por el cliente</b><small>${b.pin.ref ? esc(b.pin.ref) + ' · ' : ''}<span class="mono">${T.pinTxt(b.pin)}</span></small></span><span class="ad-pin-go">Ver mapa</span></button>` : ''}${b.note ? `<p class="rating">📝 ${esc(b.note)}</p>` : ''}
    <div class="ad-bk-m"><span>Total <b>${money(+b.total || 0)}</b></span><span>Pagado <b>${money(+b.paid || 0)}</b></span><span class="${due ? 'due' : 'ok'}">${due ? 'Falta ' + money(due) : 'Pagado ✓'}</span></div>
    <div class="adm-tools">${b.status !== 'confirmada' && b.status !== 'cancelada' ? '<button class="icon-btn pri" type="button" data-bka="ok">Confirmar</button>' : ''}${due ? `<button class="icon-btn" type="button" data-bka="half">Abono 50%</button><button class="icon-btn" type="button" data-bka="paid">Marcar pagado</button>` : ''}${b.phone ? '<button class="icon-btn" type="button" data-bka="wa">WhatsApp</button>' : ''}${ownerOf(b) ? '<button class="icon-btn" type="button" data-bka="owner">Enviar al propietario</button>' : ''}<button class="icon-btn" type="button" data-bka="edit">Editar</button>${b.status !== 'cancelada' ? '<button class="icon-btn" type="button" data-bka="cancel">Cancelar</button>' : '<button class="icon-btn" type="button" data-bka="del">Borrar</button>'}</div></article>`;
}
// propietario de la embarcación reservada (su WhatsApp se carga en Embarcaciones → Editar)
const ownerOf = b => { const x = W && W.boats.find(y => y.name === b.boat); const n = x && String(x.ownerWa || '').replace(/\D/g, ''); return n && n.length >= 10 ? n : ''; };
const ownerMsg = b => `⚓ Reserva ${b.code} · Tu Lancha Lechería\n🚤 ${b.boat || ''}\n📅 ${fmtD(dOf(b))}${b.hours ? ' · ' + b.hours : ''}\n🧭 ${b.route || '—'}\n📍 ${b.dock || '—'}${T.okPin(b.pin) ? ' · ' + T.gmapsUrl(b.pin) : ''}\n👥 ${b.pax || '—'} pers.${+b.kids ? ` + ${b.kids} niños` : ''}\n👤 ${b.name || ''}${b.note ? '\n📝 ' + b.note : ''}\nEstado: ${ST[b.status || 'nueva'][1]}`;
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
VIEW.flota = () => `<div class="ad-head"><div><h2>Embarcaciones</h2><p class="rating">${W.boats.length} en total · ${W.boats.filter(b => !b.hidden).length} visibles en la web. La primera de la lista es la que destacas como “Recomendación de la casa”.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-boat-new>+ Agregar embarcación</button>${helpBtn('flota')}</div></div>
  <div class="ad-boats">${W.boats.map((b, i) => `<article class="ad-boat${b.hidden ? ' off' : ''}" data-i="${i}"><div class="ad-boat-ph">${thumb(b)}${b.own ? '<span class="badge own-badge">De la casa</span>' : ''}${b.hidden ? '<span class="badge">Oculta</span>' : ''}</div>
    <div class="ad-boat-b"><h4>${esc(b.name)}</h4><p class="rating">${esc(b.type)} · ${b.ft} pies · ${b.pax} pers.</p><p><b>${money(+b.price || 0)}</b> <span class="rating">por día</span></p>
    <p class="rating">${T.viewsOf(b).filter(([k]) => b.photos && b.photos[k]).length} de ${T.viewsOf(b).length} fotos${b.hidden ? '' : ' · las que falten no se muestran'}</p>
    <div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-boat-edit="${i}">Editar</button><button class="icon-btn" type="button" data-boat-up="${i}" aria-label="Subir en la lista" ${i ? '' : 'disabled'}>↑</button><button class="icon-btn" type="button" data-boat-down="${i}" aria-label="Bajar en la lista" ${i < W.boats.length - 1 ? '' : 'disabled'}>↓</button></div></div></article>`).join('')}</div>`;
function boatEditor(i) {
  const b = W.boats[i]; if (!b) return; const p = 'boats.' + i;
  b.photos ??= {}; b.inc ??= []; b.opt ??= {}; b.amen ??= []; b.pick ??= {}; b.rp ??= {}; b.qty ??= {}; b.docs ??= {};
  const pickups = W.docks.filter(d => d.pickup && !d.off), lancha = b.type === 'Lancha';
  const accRow = ([k, name]) => { const st = b.inc.includes(k) ? 'inc' : k in b.opt ? 'opt' : 'no';
    return `<div class="ad-acc"><span>${esc(name)}</span><select data-acc="${k}" aria-label="${esc(name)}"><option value="no"${st === 'no' ? ' selected' : ''}>No tiene</option><option value="inc"${st === 'inc' ? ' selected' : ''}>Incluido</option><option value="opt"${st === 'opt' ? ' selected' : ''}>Con costo</option></select><input type="number" min="0" inputmode="decimal" data-accp="${k}" value="${st === 'opt' ? +b.opt[k] || 0 : ''}" placeholder="$" aria-label="Precio de ${esc(name)}" ${st === 'opt' ? '' : 'hidden'}></div>`; };
  // precio por rumbo: según el rumbo (tarifa base), un precio propio, por confirmar o no lo hace
  const rpRow = r => { const v = b.rp[r.id], st = v === null || v === false ? 'no' : v === true ? 'tbd' : typeof v === 'number' ? 'num' : 'def';
    const defTxt = r.open === false ? 'No lo hace (rumbo bajo pedido)' : typeof r.add === 'number' ? `Tarifa base${r.add ? ` + $${r.add}` : ''}` : 'Tarifa base · por confirmar';
    return `<div class="ad-acc"><span>${esc(r.name)}<small class="rating"> ${esc(r.zone || '')}</small></span><select data-rp="${esc(r.id)}" aria-label="Precio en ${esc(r.name)}"><option value="def"${st === 'def' ? ' selected' : ''}>${defTxt}</option><option value="num"${st === 'num' ? ' selected' : ''}>Precio propio</option><option value="tbd"${st === 'tbd' ? ' selected' : ''}>Lo hace · precio por confirmar</option><option value="no"${st === 'no' ? ' selected' : ''}>No lo hace</option></select><input type="number" min="0" inputmode="decimal" data-rpp="${esc(r.id)}" value="${st === 'num' ? v : ''}" placeholder="$" aria-label="Precio en ${esc(r.name)}" ${st === 'num' ? '' : 'hidden'}></div>`; };
  const okDocks = W.docks.filter(d => !d.off && !d.custom), allow = Array.isArray(b.docks) && b.docks.length ? b.docks : null;
  sheet(`<div class="ad-sheet-h"><h3>${esc(b.name || 'Nueva embarcación')}</h3>${helpBtn('barco', 'Ayuda')}</div>
    <section><h4>Fotos ${helpBtn('fotos', 'Qué fotos subir')}</h4><div class="ad-photos">${T.viewsOf(b).map(([k, l]) => photoSlot(`${p}.photos.${k}`, 'boat', l)).join('')}</div><p class="hint">La primera que tenga foto es la principal. Los espacios sin foto no se muestran en la web; si no hay ninguna, sale una ilustración. ${lancha ? 'Habitación, baño y accesorios aparecen al elegir mini yate, barco o yate.' : ''}</p></section>
    <section><h4>Datos</h4><div class="adm-form">${inp(p + '.name', 'Nombre')}${inp(p + '.type', 'Tipo', { sel: TYPES.map(t => [t, t]) })}${inp(p + '.ft', 'Pies', { t: 'num' })}${inp(p + '.size', 'Tamaño (para muelles y recogidas)', { sel: SIZE_L })}${inp(p + '.pax', 'Capacidad (puestos de la licencia)', { t: 'num', min: 1 })}${inp(p + '.kx', 'Niños de 7 años o menos además de esos puestos', { t: 'num', hint: '0 = los niños ocupan puesto. El filtro de la reserva usa los dos números.' })}${lancha ? '' : inp(p + '.kts', 'Velocidad de navegación (nudos)', { t: 'num', ph: '20' })}${inp(p + '.trips', 'Viajes realizados', { t: 'num', hint: 'Se muestra como “+N viajes”.' })}${inp(p + '.ownerWa', 'WhatsApp del propietario', { ph: '58414xxxxxxx', hint: 'Para enviarle cada reserva con un toque desde Reservas. No se muestra en la web.' })}${inp(p + '.promo', 'Promoción (opcional)', { ph: 'Ej. 10% de descuento entre semana', cls: 'ad-wide' })}</div>
      <div class="ad-checks">${inp(p + '.cabin', 'Tiene camarote', { t: 'bool' })}<label class="ad-check"><input type="checkbox" data-own="${i}"${b.own ? ' checked' : ''}> Es la lancha de la casa (sale destacada)</label>${inp(p + '.hidden', 'Ocultar de la web (no se puede reservar)', { t: 'bool' })}</div></section>
    <section><h4>Precio y horario</h4><div class="adm-form">${inp(p + '.price', 'Tarifa base por día (USD)', { t: 'num' })}${inp(p + '.wk', 'Recargo fin de semana (%)', { t: 'num', ph: '10', hint: 'Se suma sábados y domingos. Vacío = 10%.' })}${inp(p + '.late', 'Hora extra', { sel: LATE, t: 'int', def: 0 })}${inp(p + '.hx', 'Costo de cada hora extra (USD)', { t: 'num', hint: 'Se paga en efectivo a bordo.' })}</div></section>
    <section><h4>Precio por rumbo ${helpBtn('precios', 'Ayuda')}</h4><div class="ad-accs">${W.routes.map(rpRow).join('')}</div><div class="adm-form" style="margin-top:10px">${inp(p + '.maxBeaches', 'Playas por salida', { sel: [[1, '1 playa'], [2, '2 playas'], [3, '3 playas'], [4, '4 playas']], t: 'int', def: lancha ? 3 : 2 })}</div></section>
    <section><h4>Muelles</h4><div class="adm-form">${inp(p + '.dock', 'Muelle base (no se muestra en la web)', { sel: W.docks.map((d, j) => [j, d.name]).filter(([j]) => !W.docks[j].pickup && !W.docks[j].off), t: 'int', hint: 'Si el muelle no cobra a las embarcaciones que tienen ahí su base (Marina Américo Vespucio), el cliente no paga servicio de muelle.' })}</div>
      <h5>Desde dónde puede salir</h5><div class="ad-checks">${okDocks.map(d => `<label class="ad-check"><input type="checkbox" data-dockok="${esc(d.id)}"${!allow || allow.includes(d.id) ? ' checked' : ''}> ${esc(d.name)}</label>`).join('')}</div><p class="hint">Todas marcadas = puede salir de cualquiera.</p>
      ${pickups.length ? `<h5>Excepciones de recogida</h5><div class="ad-picks">${pickups.map(d => { const v = b.pick[d.id]; const st = v === null ? 'no' : v === 0 ? 'free' : 'std';
        return `<div class="ad-acc"><span>${esc(d.name)}</span><select data-pick="${esc(d.id)}" aria-label="${esc(d.name)}"><option value="std"${st === 'std' ? ' selected' : ''}>Costo normal según tamaño</option><option value="free"${st === 'free' ? ' selected' : ''}>Sin costo</option><option value="no"${st === 'no' ? ' selected' : ''}>No llega (calado)</option></select></div>`; }).join('')}</div>` : ''}</section>
    <section><h4>Accesorios ${helpBtn('accesorios', 'Ayuda')}</h4><div class="ad-accs">${Object.entries(ACC).map(accRow).join('')}</div>
      <div class="adm-form" style="margin-top:10px">${inp(p + '.qty.snorkel', 'Cantidad de caretas de buceo', { t: 'num', hint: 'Se muestra como “Caretas de buceo (4)”.' })}${inp(p + '.amen', 'Lo que la distingue (separado por comas)', { t: 'list', ph: 'Toldo, Baño, Aire acondicionado', cls: 'ad-wide' })}</div></section>
    <section><h4>Documentos <small class="rating">solo los ves tú</small></h4><div class="adm-form">${DOCS.map(([k, l]) => inp(`${p}.docs.${k}`, `${l} · vence`, { type: 'date' })).join('')}</div><p class="hint">Te avisamos en el Resumen 30 días antes de que venzan.</p></section>
    <section><h4>Descripción ${helpBtn('textos', 'Idiomas')}</h4><div class="adm-form">${inp(p + '.desc', 'En español', { area: 1, cls: 'ad-wide' })}${inp(p + '.desc_en', 'En inglés (opcional)', { area: 1, cls: 'ad-wide' })}</div></section>
    <div class="ad-sheet-f"><button class="btn btn-sun" type="button" data-close>Listo</button><button class="btn btn-ghost btn-sm" type="button" data-boat-dup="${i}">Duplicar</button><button class="btn btn-ghost btn-sm ad-danger" type="button" data-boat-del="${i}">Eliminar</button></div>`, 'boat');
}

/* ---------------- rumbos y playas ---------------- */
VIEW.rumbos = () => `<div class="ad-head"><div><h2>Rumbos y playas</h2><p class="rating">Los rumbos nunca se cruzan: el cliente elige uno y sus playas. El precio de cada embarcación por rumbo se pone en Embarcaciones.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-route-new>+ Agregar rumbo</button>${helpBtn('rumbos')}</div></div>
  ${W.routes.map((r, i) => { const p = 'routes.' + i; return `<section class="panel ad-route"><h3>${esc(r.name)} <small>${r.beaches.length} playas</small></h3>
    <div class="adm-form">${inp(p + '.name', 'Nombre')}${inp(p + '.zone', 'Zona')}${inp(p + '.min', 'Minutos de navegación', { t: 'num' })}${inp(p + '.nm', 'Millas náuticas (aprox.)', { t: 'num', step: .5 })}${inp(p + '.add', 'Diferencia sobre la tarifa base (USD)', { t: 'numn', ph: 'Por confirmar', hint: 'Para las embarcaciones sin precio propio en este rumbo. Vacío = precio por confirmar. 0 = tarifa base.' })}<div class="ad-checks ad-wide"><label class="ad-check"><input type="checkbox" data-rclosed="${i}"${r.open === false ? ' checked' : ''}> Solo para embarcaciones que lo hacen (las demás no lo muestran)</label></div>
    ${inp(p + '.tags', 'Etiquetas (separadas por comas)', { t: 'list', cls: 'ad-wide' })}${inp(p + '.desc', 'Descripción', { area: 1, rows: 2, cls: 'ad-wide' })}${inp(p + '.desc_en', 'Descripción en inglés (opcional)', { area: 1, rows: 2, cls: 'ad-wide' })}</div>
    <h4>Playas ${helpBtn('playas', 'Fotos de playas')}</h4>
    <div class="ad-beaches">${r.beaches.map((n, j) => `<div class="ad-beach">${photoSlot('beachPhotos.' + n.replace(/\./g, '·'), 'beach', '', true)}<div class="field"><label for="bn-${i}-${j}">Nombre</label><input id="bn-${i}-${j}" data-beach="${i}.${j}" value="${esc(n)}"></div><button type="button" class="icon-btn ad-danger" data-beach-del="${i}.${j}">Quitar playa</button></div>`).join('')}
      <button type="button" class="ad-add" data-beach-add="${i}">+ Agregar playa</button></div></section>`; }).join('')}
  <section class="panel"><h3>Cotización especial</h3><div class="adm-form">${inp('special', 'Destinos que van por WhatsApp (separados por comas)', { t: 'list', cls: 'ad-wide' })}</div></section>`;

/* ---------------- muelles ---------------- */
const COST_L = [['s', 'Lancha pequeña'], ['m', 'Lancha mediana'], ['my', 'Mini yate'], ['y', 'Yate o barco']];
VIEW.muelles = () => `<div class="ad-head"><div><h2>Muelles y recogidas</h2><p class="rating">Los muelles sugeridos (servicio por uso de muelle, lo cobra cada establecimiento) y las residencias donde buscas al cliente.</p></div><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" data-dock-new>+ Agregar</button>${helpBtn('muelles')}</div></div>
  <div class="ad-docks">${W.docks.map((d, i) => { const p = 'docks.' + i; return `<section class="panel${d.off ? ' off' : ''}"><h3>${esc(d.name)} <small>${d.pickup ? 'Recogida en residencia' : 'Muelle sugerido'}${d.off ? ' · no disponible' : ''}</small></h3>
    <div class="adm-form">${inp(p + '.name', 'Nombre')}
    ${d.pickup ? `${COST_L.filter(([z]) => !d.lanchaOnly || z === 's' || z === 'm').map(([z, l]) => inp(`${p}.cost.${z}`, `${l} (USD)`, { t: 'numn', ph: 'No llega', hint: z === 's' ? 'Vacío = ese tamaño no llega. 0 = sin costo.' : '' })).join('')}${inp(p + '.back', 'Regreso máximo', { ph: '5:30 pm', hint: 'Vacío = horario normal.' })}` : `${inp(p + '.fee', 'Servicio por uso de muelle', { ph: '$30', hint: 'Lo cobra el establecimiento y se paga en sitio.' })}${inp(p + '.park', 'Estacionamiento', { cls: 'ad-wide' })}`}
    ${d.off ? inp(p + '.why', 'Por qué no está disponible', { ph: 'Muelle deshabilitado', cls: 'ad-wide' }) : ''}</div>
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
VIEW.aliados = () => `<div class="ad-head"><div><h2>Servicio a bordo</h2><p class="rating">Aliados VIP que recomiendas. Salen en Servicio a bordo y en el cintillo del pie de página. Las categorías marcadas “para propietarios” salen en la página de Propietarios.</p></div><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" data-cat-new>+ Nueva categoría</button>${helpBtn('aliados')}</div></div>
  ${W.allies.map((c, i) => `<section class="panel"><div class="adm-form">${inp(`allies.${i}.cat`, 'Categoría')}</div><div class="ad-checks">${inp(`allies.${i}.owners`, 'Para propietarios de embarcaciones (sale en Propietarios)', { t: 'bool' })}</div>
    <div class="ad-allies">${c.items.map((it, j) => { const p = `allies.${i}.items.${j}`; return `<div class="ad-ally">${photoSlot(p + '.4', 'logo', 'Logo', true)}${photoSlot(p + '.5', 'cover', 'Portada', true)}<div class="adm-form">${inp(p + '.0', 'Nombre')}${inp(p + '.1', 'Descripción', { cls: 'ad-wide' })}${inp(p + '.2', 'Enlace (web o Instagram)', { ph: 'https://…', cls: 'ad-wide', hint: 'Vacío = abre WhatsApp para pedirlo.' })}<div class="field"><label>Color si no hay logo</label><input type="color" data-k="${p}.3" value="${esc(it[3] || '#232843')}"></div></div><button type="button" class="icon-btn ad-danger" data-ally-del="${i}.${j}">Quitar</button></div>`; }).join('')}</div>
    <div class="adm-tools"><button type="button" class="ad-add" data-ally-add="${i}">+ Agregar aliado</button>${c.items.length ? '' : `<button type="button" class="icon-btn ad-danger" data-cat-del="${i}">Quitar categoría</button>`}</div></section>`).join('')}`;

/* ---------------- portada y tienda ---------------- */
VIEW.portada = () => { const C = T.NAV_CARDS || []; return `<div class="ad-head"><div><h2>Portada y tienda</h2><p class="rating">La foto principal de la web, las pantallas del menú giratorio y los accesorios que vendes.</p></div><div class="adm-tools">${helpBtn('portada')}</div></div>
  <section class="panel"><h3>Foto principal <small>la portada muestra el video del dron; esta foto se ve solo si el video no se puede reproducir (ahorro de datos o “reducir movimiento”). Vacía = primer cuadro del video</small></h3><div class="ad-photos">${photoSlot('home.hero', 'hero', 'Portada (Isla de Plata, por ejemplo)')}</div></section>
  <section class="panel"><h3>Menú giratorio <small>${C.filter(c => W.home.cards[c.id]).length} de ${C.length} con foto · las vacías se ven difuminadas</small></h3>
    <p class="rating">La portada de cada pantalla del menú giratorio, agrupadas por sección. Sube cada imagen en <b>${IMG.card.size}</b> (${IMG.card.label}, mínimo ${IMG.card.min} px de ancho) para que se vea nítida, sin recortes ni pixeleo. El panel la ajusta sola a ese tamaño.</p>
    ${[...new Map(C.map(c => [c.secName || '', c])).keys()].map(sec => `<div class="ad-cardsec"><h4>${esc(sec)}</h4><div class="ad-photos ad-cards">${C.filter(c => (c.secName || '') === sec).map(c => photoSlot('home.cards.' + c.id, 'card', esc(c.t), true)).join('')}</div></div>`).join('')}</section>
  <section class="panel"><h3>Tienda Tu Lancha <small>accesorios en stock que el cliente suma a su salida</small></h3><p class="rating">Solo se muestran los que tengan precio.</p>
    <div class="ad-accs">${W.shop.map((x, i) => `<div class="ad-acc ad-shop">${inp(`shop.${i}.name`, 'Artículo')}${inp(`shop.${i}.price`, 'Precio (USD)', { t: 'num' })}<button type="button" class="icon-btn ad-danger" data-shop-del="${i}">Quitar</button></div>`).join('')}</div>
    <button type="button" class="ad-add" data-shop-add>+ Agregar artículo</button></section>`; };

/* ---------------- ajustes ---------------- */
VIEW.ajustes = () => `<div class="ad-head"><div><h2>Ajustes</h2></div><div class="adm-tools">${helpBtn('ajustes')}</div></div>
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
  muelles: ['Muelles y recogidas', `<ul><li><b>Muelle sugerido:</b> el servicio por uso de muelle lo cobra el establecimiento y se paga en sitio; escríbelo como quieres que se vea (ej. “$11,6 a tasa BCV”).</li><li><b>Recogida en residencia:</b> costo de Tu Lancha por buscar al cliente, según el tamaño de la embarcación (vacío = ese tamaño no llega).</li><li><b>Solo lanchas:</b> los yates no pueden llegar por la profundidad.</li><li><b>No habilitado:</b> aparece como no disponible.</li></ul><p class="hint">Por embarcación puedes decir que no llega o que no cobra recargo (en Embarcaciones › Editar).</p>`],
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
  if (el.dataset.rpp) { W.boats[editing].rp[el.dataset.rpp] = +el.value || 0; refreshSaveBar(); return; }
  if (el.dataset.accp) { const b = W.boats[editing]; b.opt[el.dataset.accp] = +el.value || 0; refreshSaveBar(); return; }
  if (el.id === 'basic-ta') { W.basic = el.value.split('\n').map(x => x.trim()).filter(Boolean); refreshSaveBar(); return; }
  if (el.id === 's-comm') { store.set('adm-comm', Math.min(100, Math.max(0, +el.value || 0))); }
});
adm.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.k && W && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color')) { setPath(W, el.dataset.k, readVal(el)); refreshSaveBar(); if (el.closest('.ad-sheet') && /\.(hidden|type)$/.test(el.dataset.k)) { const sc = $('.ad-sheet.k-boat', adm), st = sc ? sc.scrollTop : 0; render(); boatEditor(editing); const n = $('.ad-sheet.k-boat', adm); if (n) n.scrollTop = st; } return; }
  if (el.dataset.acc) { const b = W.boats[editing], k = el.dataset.acc, v = el.value; b.inc = b.inc.filter(x => x !== k); delete b.opt[k]; if (v === 'inc') b.inc.push(k); if (v === 'opt') b.opt[k] = 0; const p = $(`[data-accp="${k}"]`, adm); p.hidden = v !== 'opt'; if (v === 'opt') p.focus(); refreshSaveBar(); return; }
  if (el.dataset.zon != null) { W.pay.zelleOn = +el.dataset.zon; refreshSaveBar(); render(); return; }
  if (el.dataset.rp) { const b = W.boats[editing], k = el.dataset.rp, v = el.value, inpP = $(`[data-rpp="${k}"]`, adm); if (v === 'def') delete b.rp[k]; else b.rp[k] = v === 'no' ? null : v === 'tbd' ? true : +inpP.value || +b.price || 0; inpP.hidden = v !== 'num'; if (v === 'num') { inpP.value = b.rp[k]; inpP.focus(); } refreshSaveBar(); return; }
  if (el.dataset.dockok) { const b = W.boats[editing], all = W.docks.filter(d => !d.off && !d.custom).map(d => d.id); const on = $$('[data-dockok]', adm).filter(x => x.checked).map(x => x.dataset.dockok); if (!on.length) { el.checked = true; return toast('Debe poder salir de al menos un muelle'); } if (on.length === all.length) delete b.docks; else b.docks = on; refreshSaveBar(); return; }
  if (el.dataset.rclosed != null) { const r = W.routes[+el.dataset.rclosed]; if (el.checked) r.open = false; else delete r.open; refreshSaveBar(); return; }
  if (el.dataset.pick) { const b = W.boats[editing], k = el.dataset.pick; if (el.value === 'std') delete b.pick[k]; else b.pick[k] = el.value === 'no' ? null : 0; refreshSaveBar(); return; }
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
    if (d.bka === 'owner') { window.open(`https://wa.me/${ownerOf(b)}?text=${encodeURIComponent(ownerMsg(b))}`, '_blank', 'noopener'); return; }
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
  if (d.boatNew != null) { W.boats.push({ id: 'b' + Date.now().toString(36), name: 'Nueva embarcación', type: 'Lancha', ft: 30, pax: 8, price: 300, hue: 200, dock: 0, cabin: false, rating: 5, trips: 0, inc: [], opt: {}, amen: [], desc: '', photos: {}, pick: {}, rp: {}, qty: {}, docs: {}, kx: 0, hidden: true }); editing = W.boats.length - 1; refreshSaveBar(); render(); boatEditor(editing); toast('Queda oculta hasta que desmarques “Ocultar de la web”.'); return; }
  if (d.boatUp != null || d.boatDown != null) { const i = +(d.boatUp ?? d.boatDown), j = d.boatUp != null ? i - 1 : i + 1; if (j < 0 || j >= W.boats.length) return; [W.boats[i], W.boats[j]] = [W.boats[j], W.boats[i]]; render(); return; }
  if (d.boatDup != null) { const b = clone(W.boats[+d.boatDup]); b.id = 'b' + Date.now().toString(36); b.name += ' (copia)'; delete b.own; b.hidden = true; W.boats.splice(+d.boatDup + 1, 0, b); editing = +d.boatDup + 1; render(); boatEditor(editing); toast('Copia creada (oculta)'); return; }
  if (d.boatDel != null) { const b = W.boats[+d.boatDel]; if (W.boats.length < 2) return toast('Debe quedar al menos una embarcación'); if (!confirm(`¿Eliminar ${b.name}? Si solo no está disponible por un tiempo, mejor ocúltala.`)) return; W.boats.splice(+d.boatDel, 1); if (b.own) W.boats[0].own = true; editing = null; closeSheet(); render(); return; }
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
  if (d.shopAdd != null) { W.shop.push({ id: 's' + Date.now().toString(36), name: '', price: 0 }); render(); const ins = $$('[data-k^="shop."][data-k$=".name"]', adm); const l = ins[ins.length - 1]; if (l) l.focus(); return; }
  if (d.shopDel != null) { const x = W.shop[+d.shopDel]; if (x.name && !confirm(`¿Quitar ${x.name} de la tienda?`)) return; W.shop.splice(+d.shopDel, 1); render(); return; }
  // pagos
  if (d.zadd != null) { W.pay.zelles.push({ name: '', email: '' }); render(); const ins = $$('[data-k$=".name"]', adm); const l = ins[ins.length - 1]; if (l) l.focus(); return; }
  if (d.zdel != null) { const i = +d.zdel, z = W.pay.zelles[i]; if (!confirm(`¿Quitar la cuenta Zelle${z.name ? ' de ' + z.name : ''}?`)) return; W.pay.zelles.splice(i, 1); if (W.pay.zelleOn > i) W.pay.zelleOn--; if (W.pay.zelleOn >= W.pay.zelles.length) W.pay.zelleOn = 0; render(); return; }
  // aliados
  if (d.allyAdd != null) { W.allies[+d.allyAdd].items.push(['Nuevo aliado', '', '', '#232843', '', '']); render(); return; }
  if (d.allyDel != null) { const [i, j] = d.allyDel.split('.').map(Number); if (!confirm(`¿Quitar ${W.allies[i].items[j][0]}?`)) return; W.allies[i].items.splice(j, 1); render(); return; }
  if (d.catNew != null) { W.allies.push({ cat: 'Nueva categoría', items: [['Nuevo aliado', '', '', '#232843', '', '']] }); render(); return; }
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
  try { await api('me', null, true); await boot(); } catch (e) { if (e.code !== 'session') showLogin(e.code === 'net' ? errMsg(e) : ''); }
}
function maybeOpen() { if (location.hash === '#capitan') enter(); }
addEventListener('hashchange', maybeOpen); maybeOpen();
let taps = 0, tapT;
$('#foot-logo').addEventListener('click', e => { e.preventDefault(); taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1500); if (taps >= 6) { taps = 0; enter(); } });
addEventListener('keydown', e => { if (e.key !== 'Escape' || adm.hidden) return; if ($('.ad-ov', adm)) closeTop(); else if (!W) closeAdm(); });
})();
