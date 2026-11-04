(() => {
'use strict';
/* Panel privado de Eduardo.
   - Acceso oculto: dirección #capitan, o tocar 5 veces el logo del pie de página.
   - La contraseña nunca se guarda: se verifica con PBKDF2-SHA256 (600.000 iteraciones).
   - Los datos del negocio se guardan cifrados (AES-GCM 256) con una llave que sale de la contraseña.
     Sin la contraseña no se pueden leer, ni siquiera mirando el código o el almacenamiento del navegador. */
const { $, $$, wa, money, store, toast, BOATS, ROUTES, rnd, iso, today } = window.TLL;
const DEFAULT_CRED = { user: 'eduardo', verifier: '481cf7fbcace05941ef51f98b1c651a6a00a2b17709e2a8551264242993b3f68', iter: 600000 };
const SALT = 'tll-panel-v1:';
const IDLE_MS = 15 * 60e3;
const CHANNELS = ['Instagram', 'WhatsApp directo', 'Web · cotizador', 'Referido', 'Tarjeta de regalo', 'Cliente recurrente'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const adm = $('#adm');
let KEY = null, DB = null, idleT, period = 'mes';

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function derive(user, pass, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT + user.toLowerCase()), iterations: iter }, base, 512);
  const keyBytes = bits.slice(0, 32), check = bits.slice(32);
  const verifier = hex(await crypto.subtle.digest('SHA-256', check));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { key, verifier };
}
async function seal(obj, key = KEY) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))); return { v: 1, iv: b64(iv), ct: b64(ct) }; }
async function open(box, key = KEY) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)); return JSON.parse(dec.decode(pt)); }
async function save() { store.set('ledger', await seal(DB)); }

/* ---------------- datos de ejemplo (marcados) ---------------- */
function sampleData() {
  const r = rnd('ledger-demo'), list = [];
  const season = [1.4, 1.3, 1.0, 1.3, .8, .8, 1.3, 1.4, .8, .8, .9, 1.6];
  const names = ['María G.', 'José P.', 'Andreína M.', 'Carlos R.', 'Daniela V.', 'Luis A.', 'Gabriela S.', 'Pedro C.', 'Valentina H.', 'Ricardo T.', 'Empresa Andina', 'Mariana L.'];
  for (let m = -13; m <= 1; m++) {
    const first = new Date(today.getFullYear(), today.getMonth() + m, 1), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const n = Math.round((7 + r() * 5) * season[first.getMonth()] * (m === 1 ? .35 : 1));
    for (let i = 0; i < n; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + Math.floor(r() * days));
      const b = BOATS[Math.floor(Math.pow(r(), 1.4) * BOATS.length)], rt = ROUTES[Math.floor(r() * ROUTES.length)];
      const wk = d.getDay() === 0 || d.getDay() === 6;
      const extras = r() < .55 ? Math.round(40 + r() * 220) : 0;
      const total = Math.round(b.price * (wk ? 1.1 : 1) + rt.extra + extras);
      const future = d > today;
      const paid = future ? (r() < .6 ? Math.round(total / 2) : 0) : total;
      list.push({ id: 'd' + list.length, date: iso(d), boat: b.name, route: rt.name, pax: Math.max(2, Math.round(b.pax * (.5 + r() * .5))), total, paid, channel: CHANNELS[Math.floor(r() * CHANNELS.length)], client: names[Math.floor(r() * names.length)], phone: '', demo: true });
    }
  }
  return { v: 1, comm: 20, demo: true, bookings: list.sort((a, b) => a.date < b.date ? 1 : -1) };
}

/* ---------------- login ---------------- */
function cred() { return store.get('cred', DEFAULT_CRED); }
function lockInfo() { return store.get('lock', { fails: 0, until: 0 }); }
function showLogin(msg = '') {
  const d = $('#dlg'); if (d.open) d.close();
  adm.hidden = false; document.documentElement.style.overflow = 'hidden';
  adm.innerHTML = `<div class="adm-login"><form id="lg" autocomplete="on">
    <img src="${$('.brand img').src}" alt="" width="72" height="72">
    <div style="text-align:center;display:grid;gap:4px"><h2 style="font-size:1.4rem">Panel privado</h2><span class="rating">Acceso exclusivo para la administración</span></div>
    <div class="field"><label for="lg-u">Usuario</label><input id="lg-u" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
    <div class="field"><label for="lg-p">Contraseña</label><div style="display:flex;gap:6px"><input id="lg-p" name="password" type="password" autocomplete="current-password" required style="flex:1;min-width:0"><button type="button" class="icon-btn" id="lg-eye" aria-label="Mostrar contraseña">Ver</button></div></div>
    <p class="err" id="lg-err" role="alert">${esc(msg)}</p>
    <button class="btn btn-sun" type="submit" id="lg-go">Entrar</button>
    <button class="btn btn-ghost btn-sm" type="button" id="lg-x">Volver a la web</button></form></div>`;
  $('#lg-eye').onclick = () => { const p = $('#lg-p'); p.type = p.type === 'password' ? 'text' : 'password'; $('#lg-eye').textContent = p.type === 'password' ? 'Ver' : 'Ocultar'; };
  $('#lg-x').onclick = closeAdm;
  $('#lg').onsubmit = async e => {
    e.preventDefault();
    const L = lockInfo();
    if (Date.now() < L.until) { $('#lg-err').textContent = `Demasiados intentos. Espera ${Math.ceil((L.until - Date.now()) / 1000)} segundos.`; return; }
    $('#lg-go').disabled = true; $('#lg-go').textContent = 'Verificando…';
    const u = $('#lg-u').value.trim().toLowerCase(), p = $('#lg-p').value, c = cred();
    try {
      const { key, verifier } = await derive(u, p, c.iter);
      if (u !== c.user || verifier !== c.verifier) throw new Error('bad');
      store.set('lock', { fails: 0, until: 0 });
      KEY = key;
      const box = store.get('ledger', null);
      DB = box ? await open(box) : sampleData();
      if (!box) await save();
      dashboard();
    } catch (err) {
      const f = L.fails + 1; store.set('lock', { fails: f, until: f >= 5 ? Date.now() + 60e3 * Math.min(30, 2 ** (f - 5)) : 0 });
      $('#lg-err').textContent = f >= 5 ? 'Usuario o contraseña incorrectos. Por seguridad, espera un minuto antes de intentar de nuevo.' : 'Usuario o contraseña incorrectos.';
      $('#lg-go').disabled = false; $('#lg-go').textContent = 'Entrar'; $('#lg-p').select();
    }
  };
  setTimeout(() => $('#lg-u').focus(), 50);
}
function closeAdm() { KEY = null; DB = null; adm.hidden = true; adm.innerHTML = ''; document.documentElement.style.overflow = ''; if (location.hash === '#capitan') history.replaceState(null, '', location.pathname + location.search); }
function bump() { clearTimeout(idleT); idleT = setTimeout(() => { if (KEY) { KEY = null; DB = null; showLogin('Sesión cerrada por inactividad.'); } }, IDLE_MS); }
['pointerdown', 'keydown', 'scroll'].forEach(ev => adm.addEventListener(ev, bump, { passive: true }));

/* ---------------- cálculos ---------------- */
function range(p) {
  const y = today.getFullYear(), m = today.getMonth();
  if (p === 'mes') return [new Date(y, m, 1), new Date(y, m + 1, 1), new Date(y, m - 1, 1)];
  if (p === '3m') return [new Date(y, m - 2, 1), new Date(y, m + 1, 1), new Date(y, m - 5, 1)];
  return [new Date(y, m - 11, 1), new Date(y, m + 1, 1), new Date(y, m - 23, 1)];
}
const inR = (b, a, z) => { const d = b.date; return d >= iso(a) && d < iso(z); };
function stats(list) {
  const rev = list.reduce((s, b) => s + b.total, 0), paid = list.reduce((s, b) => s + b.paid, 0);
  const counts = {}; list.forEach(b => counts[b.client] = (counts[b.client] || 0) + 1);
  const clients = Object.keys(counts).length, rep = Object.values(counts).filter(n => n > 1).length;
  return { n: list.length, rev, paid, due: rev - paid, avg: list.length ? rev / list.length : 0, comm: rev * DB.comm / 100, pax: list.reduce((s, b) => s + (+b.pax || 0), 0), clients, rep };
}
function delta(a, b) { if (!b) return ''; const d = (a - b) / b * 100; return `<small class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% vs. período anterior</small>`; }
function group(list, key) { const m = {}; list.forEach(b => m[b[key]] = (m[b[key]] || 0) + b.total); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
function hbars(rows, fmt = money) { const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="hbars">${rows.slice(0, 7).map(([k, v]) => `<div class="hb" title="${esc(k)}: ${fmt(v)}"><span class="lbl">${esc(k)}</span><span class="tr"><i style="width:${v / max * 100}%"></i></span><span class="v">${fmt(v)}</span></div>`).join('') || '<p class="rating">Sin datos en este período.</p>'}</div>`; }
function monthChart() {
  const y = today.getFullYear(), m = today.getMonth(), months = [];
  for (let i = 11; i >= 0; i--) { const a = new Date(y, m - i, 1), z = new Date(y, m - i + 1, 1); const l = DB.bookings.filter(b => inR(b, a, z)); months.push({ lbl: MES[a.getMonth()], full: a.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }), v: l.reduce((s, b) => s + b.total, 0), n: l.length }); }
  const W = 640, H = 220, pl = 48, pb = 24, pt = 10, max = Math.max(100, ...months.map(x => x.v));
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const top = Math.ceil(max / step) * step, ys = v => pt + (H - pt - pb) * (1 - v / top), bw = (W - pl) / 12;
  let g = ''; for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${pl}" x2="${W}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${pl - 8}" y="${ys(v) + 4}" text-anchor="end">${v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + v}</text>`;
  const bars = months.map((x, i) => { const x0 = pl + i * bw + bw * .2, w = bw * .6, y0 = ys(x.v), h = Math.max(0, H - pb - y0); const r = Math.min(4, w / 2, h);
    return `<g data-tip="${esc(x.full)}: ${money(x.v)} · ${x.n} chárters"><rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}"/><path class="bar ${i === 11 ? 'hi' : ''}" d="M${x0} ${H - pb} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + w - r} Q${x0 + w} ${y0} ${x0 + w} ${y0 + r} V${H - pb} Z"/><text x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">${x.lbl}</text></g>`; }).join('');
  return `<div class="chart" id="mchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos por mes, últimos 12 meses">${g}${bars}</svg><div class="tip" id="mtip"></div></div>
    <details><summary class="rating" style="cursor:pointer">Ver como tabla</summary><div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Mes</th><th class="n">Chárters</th><th class="n">Ingresos</th></tr></thead><tbody>${months.map(x => `<tr><td>${x.full}</td><td class="n">${x.n}</td><td class="n">${money(x.v)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
const status = b => b.paid >= b.total ? ['pag', 'Pagado'] : b.paid > 0 ? ['abo', 'Abono'] : ['pen', 'Pendiente'];

/* ---------------- panel ---------------- */
function dashboard() {
  bump(); adm.hidden = false; document.documentElement.style.overflow = 'hidden';
  const [a, z, pa] = range(period), cur = DB.bookings.filter(b => inR(b, a, z)), prev = DB.bookings.filter(b => inR(b, pa, a));
  const S = stats(cur), P = stats(prev);
  const upcoming = DB.bookings.filter(b => b.date >= iso(today)).sort((x, y) => x.date < y.date ? -1 : 1);
  const plbl = { mes: 'Este mes', '3m': 'Últimos 3 meses', '12m': 'Últimos 12 meses' }[period];
  adm.innerHTML = `<div class="adm-bar"><div class="wrap"><b>Panel de Eduardo</b>
    <div class="seg" role="group" aria-label="Período">${[['mes', 'Mes'], ['3m', '3 meses'], ['12m', '12 meses']].map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${k === period}">${l}</button>`).join('')}</div>
    <div class="sp"><button class="btn btn-ghost on-sea btn-sm" type="button" id="a-new">+ Registrar chárter</button><button class="btn btn-sun btn-sm" type="button" id="a-out">Salir</button></div></div></div>
  <div class="wrap adm-main">
    ${DB.demo ? `<div class="panel" style="border-color:var(--sun)"><b>Estás viendo datos de ejemplo.</b><span class="rating">Sirven para conocer el panel. Cuando quieras, bórralos y empieza a registrar tus chárters reales.</span><div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" id="a-clear">Borrar ejemplos y empezar</button></div></div>` : ''}
    <div class="adm-kpis">
      <div class="akpi"><span>Ingresos · ${plbl}</span><b>${money(S.rev)}</b>${delta(S.rev, P.rev)}</div>
      <div class="akpi"><span>Tu comisión (${DB.comm}%)</span><b>${money(S.comm)}</b>${delta(S.comm, P.comm)}</div>
      <div class="akpi"><span>Chárters</span><b>${S.n}</b>${delta(S.n, P.n)}</div>
      <div class="akpi"><span>Ticket promedio</span><b>${money(S.avg)}</b>${delta(S.avg, P.avg)}</div>
      <div class="akpi"><span>Por cobrar</span><b>${money(S.due)}</b><small>${cur.filter(b => b.paid < b.total).length} reservas con saldo</small></div>
      <div class="akpi"><span>Pasajeros</span><b>${S.pax}</b><small>${S.clients} clientes · ${S.clients ? Math.round(S.rep / S.clients * 100) : 0}% repiten</small></div>
    </div>
    <div class="panel"><h3>Ingresos por mes <small>últimos 12 meses · toca una barra para ver el detalle</small></h3>${monthChart()}</div>
    <div class="adm-3">
      <div class="panel"><h3>Por embarcación <small>${plbl}</small></h3>${hbars(group(cur, 'boat'))}</div>
      <div class="panel"><h3>Cómo llegan los clientes <small>${plbl}</small></h3>${hbars(group(cur, 'channel'))}</div>
      <div class="panel"><h3>Playas más pedidas <small>${plbl}</small></h3>${hbars(group(cur, 'route'))}</div>
    </div>
    <div class="adm-2">
      <div class="panel"><h3>Próximas salidas <small>${upcoming.length} agendadas</small></h3>${upcoming.length ? `<div class="hbars">${upcoming.slice(0, 6).map(b => `<div class="hb" style="grid-template-columns:auto 1fr auto"><span class="mono">${new Date(b.date + 'T12:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</span><span class="lbl">${esc(b.boat)} · ${esc(b.client)}</span><span class="st ${status(b)[0]}">${status(b)[1]}</span></div>`).join('')}</div>` : '<p class="rating">No hay salidas agendadas.</p>'}</div>
      <div class="panel"><h3>Liquidación a propietarios <small>${plbl}</small></h3><div class="tbl-wrap"><table class="tbl" style="min-width:420px"><thead><tr><th>Embarcación</th><th class="n">Bruto</th><th class="n">Propietario</th><th class="n">Comisión</th></tr></thead><tbody>${group(cur, 'boat').map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${money(v)}</td><td class="n">${money(v * (100 - DB.comm) / 100)}</td><td class="n">${money(v * DB.comm / 100)}</td></tr>`).join('') || '<tr><td colspan="4" class="rating">Sin datos</td></tr>'}</tbody></table></div></div>
    </div>
    <div class="panel" id="a-form-wrap" hidden><h3>Registrar chárter</h3>
      <form class="adm-form" id="a-form">
        <div class="field"><label for="f-date">Fecha</label><input type="date" id="f-date" required value="${iso(today)}"></div>
        <div class="field"><label for="f-boat">Embarcación</label><select id="f-boat">${BOATS.map(b => `<option>${b.name}</option>`).join('')}<option>Otra</option></select></div>
        <div class="field"><label for="f-route">Playa</label><select id="f-route">${ROUTES.map(r => `<option>${r.name}</option>`).join('')}<option>Otra</option></select></div>
        <div class="field"><label for="f-client">Cliente</label><input id="f-client" required placeholder="Nombre"></div>
        <div class="field"><label for="f-phone">WhatsApp del cliente</label><input id="f-phone" inputmode="tel" placeholder="+58 4xx…"></div>
        <div class="field"><label for="f-pax">Personas</label><input id="f-pax" type="number" min="1" value="8" inputmode="numeric"></div>
        <div class="field"><label for="f-total">Total (USD)</label><input id="f-total" type="number" min="0" step="1" required inputmode="decimal"></div>
        <div class="field"><label for="f-paid">Pagado (USD)</label><input id="f-paid" type="number" min="0" step="1" value="0" inputmode="decimal"></div>
        <div class="field"><label for="f-ch">Canal</label><select id="f-ch">${CHANNELS.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="adm-tools"><button class="btn btn-sun btn-sm" type="submit">Guardar</button><button class="btn btn-ghost btn-sm" type="button" id="f-cancel">Cancelar</button></div>
      </form></div>
    <div class="panel"><h3>Reservas del período <small>${cur.length} en total</small></h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Embarcación</th><th>Playa</th><th class="n">Pers.</th><th class="n">Total</th><th class="n">Pagado</th><th>Estado</th><th>Canal</th><th></th></tr></thead>
      <tbody>${cur.slice(0, 60).map(b => `<tr data-id="${b.id}"><td class="mono">${b.date}</td><td>${esc(b.client)}</td><td>${esc(b.boat)}</td><td>${esc(b.route)}</td><td class="n">${b.pax}</td><td class="n">${money(b.total)}</td><td class="n">${money(b.paid)}</td><td><span class="st ${status(b)[0]}">${status(b)[1]}</span></td><td>${esc(b.channel)}</td>
        <td><div class="adm-tools" style="flex-wrap:nowrap">${b.paid < b.total ? '<button class="icon-btn" data-act="pay" type="button">Marcar pagado</button>' : ''}<button class="icon-btn" data-act="album" type="button">Enviar álbum</button><button class="icon-btn" data-act="del" type="button" aria-label="Borrar reserva">Borrar</button></div></td></tr>`).join('') || '<tr><td colspan="10" class="rating">Aún no hay reservas en este período. Usa "Registrar chárter".</td></tr>'}</tbody></table></div></div>
    <div class="panel"><h3>Ajustes y respaldo</h3>
      <div class="adm-form">
        <div class="field"><label for="s-comm">Comisión por chárter (%)</label><input id="s-comm" type="number" min="0" max="100" value="${DB.comm}"></div>
        <div class="adm-tools"><button class="btn btn-ghost btn-sm" type="button" id="s-csv">Copiar datos (CSV)</button><button class="btn btn-ghost btn-sm" type="button" id="s-dl">Descargar respaldo</button></div>
      </div>
      <form class="adm-form" id="pw-form" style="margin-top:8px"><div class="field"><label for="pw-old">Contraseña actual</label><input id="pw-old" type="password" autocomplete="current-password" required></div><div class="field"><label for="pw-new">Nueva contraseña</label><input id="pw-new" type="password" autocomplete="new-password" minlength="10" required></div><div class="field"><label for="pw-new2">Repite la nueva</label><input id="pw-new2" type="password" autocomplete="new-password" minlength="10" required></div><div class="adm-tools"><button class="btn btn-ghost btn-sm" type="submit">Cambiar contraseña</button></div></form>
      <p class="err" id="pw-err" role="alert"></p>
      <p class="rating">Tus datos se guardan cifrados en este dispositivo. Descarga un respaldo cada semana. La versión con servidor los sincroniza entre tu teléfono y tu computadora.</p>
    </div>
  </div>`;
  wire();
}
function wire() {
  $$('[data-p]', adm).forEach(b => b.onclick = () => { period = b.dataset.p; dashboard(); });
  $('#a-out', adm).onclick = () => { closeAdm(); toast('Sesión cerrada'); };
  $('#a-new', adm).onclick = () => { const w = $('#a-form-wrap', adm); w.hidden = false; w.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#f-client', adm).focus(), 300); };
  $('#f-cancel', adm).onclick = () => { $('#a-form-wrap', adm).hidden = true; };
  $('#f-boat', adm).onchange = () => { const b = BOATS.find(x => x.name === $('#f-boat', adm).value); if (b && !$('#f-total', adm).value) $('#f-total', adm).value = b.price; };
  $('#a-form', adm).onsubmit = async e => {
    e.preventDefault(); const v = id => $('#' + id, adm).value;
    const total = Math.max(0, +v('f-total')), paid = Math.min(total, Math.max(0, +v('f-paid')));
    DB.bookings.unshift({ id: 'b' + Date.now(), date: v('f-date'), boat: v('f-boat'), route: v('f-route'), pax: +v('f-pax') || 1, total, paid, channel: v('f-ch'), client: v('f-client').trim(), phone: v('f-phone').trim() });
    DB.bookings.sort((a, b) => a.date < b.date ? 1 : -1); await save(); toast('Chárter guardado'); dashboard();
  };
  const clr = $('#a-clear', adm); if (clr) clr.onclick = async () => {
    if (clr.dataset.sure !== '1') { clr.dataset.sure = '1'; clr.textContent = 'Toca otra vez para confirmar'; return; }
    DB = { v: 1, comm: DB.comm, demo: false, bookings: [] }; await save(); toast('Listo: panel vacío para tus datos reales'); dashboard();
  };
  $('tbody', $('.tbl:not([style])', adm) || adm)?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return; const id = btn.closest('tr').dataset.id, b = DB.bookings.find(x => x.id === id);
    if (btn.dataset.act === 'pay') { b.paid = b.total; await save(); toast('Marcado como pagado'); dashboard(); }
    if (btn.dataset.act === 'del') { if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = '¿Seguro?'; return; } DB.bookings = DB.bookings.filter(x => x !== b); await save(); toast('Reserva borrada'); dashboard(); }
    if (btn.dataset.act === 'album') {
      const num = (b.phone || '').replace(/\D/g, ''), txt = `¡Hola ${b.client}! 📸 Ya está listo el álbum de tu paseo a ${b.route}. Ábrelo aquí con tu código de reserva: ${location.href.split('#')[0]}#mi-viaje\nSi lo compartes en redes, etiquétanos @tulanchalecheria 🚤`;
      const a = document.createElement('a'); a.href = `https://wa.me/${num}?text=${encodeURIComponent(txt)}`; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    }
  });
  $('#s-comm', adm).onchange = async e => { DB.comm = Math.min(100, Math.max(0, +e.target.value || 0)); await save(); dashboard(); };
  const csv = () => ['fecha,cliente,telefono,embarcacion,playa,personas,total,pagado,canal'].concat(DB.bookings.map(b => [b.date, b.client, b.phone, b.boat, b.route, b.pax, b.total, b.paid, b.channel].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
  $('#s-csv', adm).onclick = async () => { try { await navigator.clipboard.writeText(csv()); toast('Datos copiados: pégalos en Excel o Google Sheets'); } catch { toast('No se pudo copiar en este navegador'); } };
  let framed = true; try { framed = window.top !== window.self; } catch {}
  if (framed) $('#s-dl', adm).hidden = true;
  $('#s-dl', adm).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv()], { type: 'text/csv' })); a.download = `tulancha-respaldo-${iso(today)}.csv`; document.body.appendChild(a); a.click(); a.remove(); toast('Respaldo descargado'); };
  $('#pw-form', adm).onsubmit = async e => {
    e.preventDefault(); const err = $('#pw-err', adm); err.textContent = '';
    const c = cred(), o = $('#pw-old', adm).value, n1 = $('#pw-new', adm).value, n2 = $('#pw-new2', adm).value;
    if (n1 !== n2) { err.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
    if (n1.length < 10) { err.textContent = 'Usa al menos 10 caracteres.'; return; }
    const chk = await derive(c.user, o, c.iter); if (chk.verifier !== c.verifier) { err.textContent = 'La contraseña actual no es correcta.'; return; }
    const nk = await derive(c.user, n1, c.iter); KEY = nk.key; store.set('cred', { user: c.user, verifier: nk.verifier, iter: c.iter }); await save();
    e.target.reset(); toast('Contraseña cambiada en este dispositivo');
  };
  const ch = $('#mchart', adm), tip = $('#mtip', adm);
  const showTip = g => { const r = g.getBoundingClientRect(), cr = ch.getBoundingClientRect(); tip.textContent = g.dataset.tip; const hw = tip.offsetWidth / 2 + 4; tip.style.left = Math.min(cr.width - hw, Math.max(hw, r.left - cr.left + r.width / 2)) + 'px'; tip.style.top = (g.querySelector('.bar').getBoundingClientRect().top - cr.top) + 'px'; tip.classList.add('on'); };
  ch.addEventListener('pointerover', e => { const g = e.target.closest('[data-tip]'); if (g) showTip(g); });
  ch.addEventListener('pointerdown', e => { const g = e.target.closest('[data-tip]'); if (g) showTip(g); });
  ch.addEventListener('pointerleave', () => tip.classList.remove('on'));
}

/* ---------------- acceso oculto ---------------- */
function maybeOpen() { if (location.hash === '#capitan' && adm.hidden) showLogin(); }
addEventListener('hashchange', maybeOpen); maybeOpen();
let taps = 0, tapT;
$('#foot-logo').addEventListener('click', e => { taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1500); if (taps >= 5) { e.preventDefault(); taps = 0; showLogin(); } });
addEventListener('keydown', e => { if (e.key === 'Escape' && !adm.hidden && !KEY) closeAdm(); });
})();
