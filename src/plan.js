/* ---------------- tu día en el mar: modo a bordo y álbum programados con la reserva ----------------
   Al confirmar, el cliente programa el modo a bordo (GPS, SOS, ubicación en vivo) y el álbum del día
   para la fecha del paseo. La app guarda el plan en el teléfono y:
   · antes del paseo muestra una cuenta regresiva,
   · el día del paseo pone el modo a bordo al frente (tarjeta en Mi viaje + aviso flotante),
   · al volver abre el álbum del día.
   Avisos: notificación del navegador si lo permite, y el paseo en el calendario (.ics o Google) con
   recordatorios el día antes y 2 horas antes, que funcionan aunque la app esté cerrada. */
(() => {
const { $, $$, store, toast, esc } = window.TLL;
const SITE = 'https://tulanchalecheria.vercel.app';
const DAY = 864e5, VET = '-04:00';
const mine = () => store.get('mine', []);
const saveMine = l => store.set('mine', l);
const pad = n => String(n).padStart(2, '0');

/* "9:00 am a 5:00 pm" → [9, 17] */
function hoursOf(r) {
  const m = [...String(r.hours || '').matchAll(/(\d{1,2}):(\d{2})\s*(am|pm)/gi)].map(x => { let h = +x[1] % 12; if (x[3].toLowerCase() === 'pm') h += 12; return h + +x[2] / 60; });
  return [m[0] ?? 9, m[1] ?? (m[0] ?? 9) + 8];
}
const at = (iso, h) => new Date(`${iso}T${pad(Math.floor(h))}:${pad(Math.round(h % 1 * 60))}:00${VET}`);
function times(r) {
  if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(r.iso || '')) return null;
  const [a, b] = hoursOf(r);
  return { day: at(r.iso, 0), start: at(r.iso, a), end: at(r.iso, b), next: new Date(at(r.iso, 0).getTime() + DAY) };
}
/* soon: antes del día · today: el día del paseo hasta el regreso · album: hasta 30 días después · past */
function stateOf(r, now = Date.now()) {
  const t = times(r); if (!t) return 'none';
  if (now < t.day.getTime()) return 'soon';
  if (now < t.end.getTime()) return 'today';
  if (now < t.end.getTime() + 30 * DAY) return 'album';
  return 'past';
}
/* el paseo que importa ahora: hoy, el próximo, o el último con álbum */
function featured() {
  const l = mine().filter(r => times(r));
  const by = s => l.filter(r => stateOf(r) === s).sort((a, b) => times(a).start - times(b).start);
  return by('today')[0] || by('soon')[0] || by('album').pop() || null;
}
const fmtLong = d => d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Caracas' });
const fmtHour = d => d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' }).replace(/\s?([ap])\.?\s?m\.?/i, (_, x) => ' ' + x.toLowerCase() + 'm');
function left(ms) { ms = Math.max(0, ms); return { d: Math.floor(ms / DAY), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 }; }
const cdHtml = ms => { const x = left(ms); return [['d', x.d, x.d === 1 ? 'día' : 'días'], ['h', x.h, 'horas'], ['m', x.m, 'min'], ['s', x.s, 'seg']].map(([k, v, l]) => `<span class="cd-u"><b data-cd="${k}">${pad(v)}</b><small>${l}</small></span>`).join('<i aria-hidden="true">:</i>'); };
function tickCd(root, ms) { const x = left(ms); $$('[data-cd]', root).forEach(b => { const v = pad(x[b.dataset.cd]); if (b.textContent !== v) b.textContent = v; }); }

/* ---------- íconos ---------- */
const IC = {
  gps: '<path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  album: '<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-8 8"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',
  ok: '<path d="M6 12.5l4 4 8-9"/>',
  sos: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.01"/>'
};
const ic = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;

/* ---------- calendario ---------- */
const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
const links = r => ({ abordo: `${SITE}/#a-bordo/${r.code}`, album: `${SITE}/#album/${r.code}` });
function calText(r) {
  const L = links(r);
  return `Reserva ${r.code} · ${r.boat}\nRumbo: ${r.route}\nMuelle: ${r.dock}${r.hours ? ' · ' + r.hours : ''}\n\nModo a bordo (GPS, SOS y ubicación en vivo): ${L.abordo}\nÁlbum del día (al volver): ${L.album}\n\nWhatsApp Tu Lancha: +58 414 308 3864`;
}
function ics(r) {
  const t = times(r), L = links(r);
  const ev = ['BEGIN:VEVENT', `UID:${r.code}-${r.iso}@tulanchalecheria`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(t.start)}`, `DTEND:${utc(t.end)}`,
    `SUMMARY:${icsEsc(`⛵ Paseo Tu Lancha · ${r.boat}`)}`, `LOCATION:${icsEsc(r.dock + ', Lechería, Anzoátegui')}`, `DESCRIPTION:${icsEsc(calText(r))}`, `URL:${L.abordo}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Mañana zarpas con Tu Lancha. Revisa tu muelle y lleva protector solar.')}`, 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Zarpas en 2 horas. Abre el modo a bordo: ' + L.abordo)}`, 'TRIGGER:-PT2H', 'END:VALARM', 'END:VEVENT'];
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tu Lancha Lecheria//Reservas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR']
    .map(l => { const out = []; while (l.length > 74) { out.push(l.slice(0, 74)); l = ' ' + l.slice(74); } out.push(l); return out.join('\r\n'); }).join('\r\n');
}
function addToCalendar(r) {
  const blob = new Blob([ics(r)], { type: 'text/calendar;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = `Tu-Lancha-${r.code}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
  setPlan(r.code, { cal: true }); toast('Abre el archivo para guardarlo en tu calendario');
}
const gcal = r => { const t = times(r); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('⛵ Paseo Tu Lancha · ' + r.boat)}&dates=${utc(t.start)}/${utc(t.end)}&details=${encodeURIComponent(calText(r))}&location=${encodeURIComponent(r.dock + ', Lechería, Anzoátegui')}`; };

/* ---------- avisos del navegador ---------- */
const canNotify = () => 'Notification' in window;
async function show(title, body, tag, hash) {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  const o = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: './' + hash } };
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) { await reg.showNotification(title, o); return true; } } catch {}
  try { new Notification(title, o); return true; } catch { return false; }
}
// Donde exista (Chrome con Notification Triggers), los avisos quedan programados aunque la app esté cerrada
async function scheduleTriggers(r) {
  if (!('TimestampTrigger' in window) || !canNotify() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return; const t = times(r), now = Date.now();
    const plan = [[t.start.getTime() - 2 * 36e5, 'Zarpas en 2 horas ⛵', 'Abre el modo a bordo: GPS, SOS y ubicación en vivo para tu familia.', `#a-bordo/${r.code}`, 'abordo'],
      [t.end.getTime() + 36e5, 'Tu álbum del día 📸', 'Las fotos y videos de tu paseo te esperan en la app.', `#album/${r.code}`, 'album']];
    for (const [when, title, body, hash, k] of plan) if (when > now) await reg.showNotification(title, { body, tag: `tll-${r.code}-${k}`, icon: 'icons/icon-192.png', data: { url: './' + hash }, showTrigger: new window.TimestampTrigger(when) });
  } catch {}
}
/* Web Push: el aviso llega al teléfono aunque la app esté cerrada (lo envía /api/push en la fecha del paseo) */
const VAPID = 'BET47N4sj6vo2yQg3xzRNTBfE9GpS-uRJQ1b2qk6IFsNPIdWTLaOsHGJi6jVlb-vuHI1LHojChRJn2ipmXjPRJc';
const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && canNotify();
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const keyBytes = k => { const b = atob(k.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushSub(r, confirm) {
  if (!canPush() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) });
    const t = times(r), p = r.plan || {};
    const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm, sub: sub.toJSON(),
      trip: { code: r.code, iso: r.iso, start: t.start.getTime(), boat: r.boat, dock: r.dock, abordo: p.abordo !== false, album: p.album !== false } }) });
    if (!res.ok) return false;
    setPlan(r.code, { push: true }); return true;
  } catch { return false; }
}
async function askNotify(r) {
  if (!canNotify()) return 'na';
  let p = Notification.permission;
  if (p === 'default') { try { p = await Notification.requestPermission(); } catch { p = 'denied'; } }
  if (p === 'granted') { setPlan(r.code, { notify: true }); scheduleTriggers(r); await pushSub(byCode(r.code), true); }
  return p;
}
// mientras la app está abierta (o al abrirla) avisamos una sola vez por etapa
function notifyDue() {
  const sent = store.get('plan-sent', {}), now = Date.now();
  mine().forEach(r => {
    if (!r.plan) return; const t = times(r); if (!t) return; const s = stateOf(r, now);
    const due = [];
    if (s === 'soon' && t.start - now < 30 * 36e5 && r.plan.abordo) due.push(['eve', `Mañana zarpas ⛵`, `${r.boat} · ${fmtHour(t.start)} desde ${r.dock}. Tu modo a bordo se activa mañana.`, '#mi-viaje']);
    if (s === 'today' && r.plan.abordo) due.push(['today', 'Hoy zarpas ⛵', `Abre el modo a bordo antes de salir: GPS, SOS y ubicación en vivo para tu familia.`, `#a-bordo/${r.code}`]);
    if (s === 'album' && r.plan.album) due.push(['album', 'Tu álbum del día 📸', 'Las fotos y videos de tu paseo te esperan en Mi viaje.', `#album/${r.code}`]);
    due.forEach(([k, title, body, hash]) => { const key = `${r.code}:${k}`; if (sent[key]) return; sent[key] = now; show(title, body, `tll-${key}`, hash); });
  });
  store.set('plan-sent', sent);
}

/* ---------- guardar el plan ---------- */
function setPlan(code, patch) {
  saveMine(mine().map(x => x.code === code ? { ...x, plan: { abordo: true, album: true, at: Date.now(), ...(x.plan || {}), ...patch } } : x));
  render();
}
const byCode = c => mine().find(x => x.code === c);

/* ---------- bloque en la pantalla de reserva confirmada ---------- */
function planBlock(r) {
  const t = times(r); if (!t) return '';
  const p = r.plan;
  return `<section class="pl-box${p ? ' on' : ''}" data-plan="${r.code}" aria-labelledby="pl-t-${r.code}">
    <div class="pl-h"><span class="eyebrow">Tu día en el mar</span><b id="pl-t-${r.code}">${p ? 'Listo: tu paseo está programado' : 'Programa tu paseo en la app'}</b>
      <p>${p ? `El ${fmtLong(t.start)} la app te abre el modo a bordo y, al volver, tu álbum del día.` : `Lo dejamos listo para el ${fmtLong(t.start)}: ese día la app te pone todo a un toque.`}</p></div>
    <div class="pl-opts">
      <label class="pl-opt"><input type="checkbox" data-pl="abordo"${!p || p.abordo ? ' checked' : ''}><span class="pl-ic sos">${ic('gps')}</span><span class="pl-tx"><b>Modo a bordo</b><small>GPS, botón SOS y ubicación en vivo para tu familia. Se activa el día del paseo.</small></span><span class="pl-sw" aria-hidden="true"></span></label>
      <label class="pl-opt"><input type="checkbox" data-pl="album"${!p || p.album ? ' checked' : ''}><span class="pl-ic al">${ic('album')}</span><span class="pl-tx"><b>Álbum del día</b><small>Fotos y videos de dron de tu paseo, en un enlace privado al volver.</small></span><span class="pl-sw" aria-hidden="true"></span></label>
    </div>
    <div class="pl-cd" aria-label="Cuenta regresiva"><span class="pl-cd-l">Zarpas en</span><div class="cd">${cdHtml(t.start - Date.now())}</div></div>
    <div class="pl-acts">
      <button class="btn btn-sun btn-lg pl-go" type="button" data-pl-go>${p ? `${ic('ok')} Programado para el ${esc(r.date)}` : `Programar para el ${esc(r.date)}`}</button>
      <div class="pl-cal"><button class="btn btn-ghost btn-sm" type="button" data-pl-ics>${ic('cal')} Añadir al calendario</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${gcal(r)}" data-pl-g>Google Calendar</a></div>
      <p class="pl-note" data-pl-note>${noteTxt(r)}</p>
    </div>
  </section>`;
}
function noteTxt(r) {
  const p = r.plan;
  if (!p) return 'Te recordamos el día antes y 2 horas antes de zarpar.';
  if (isIOS() && !standalone()) return `${ic('bell')} Para recibir avisos en tu iPhone, agrega Tu Lancha a tu pantalla de inicio (Compartir › Agregar a inicio) y ábrela desde ahí. Mientras tanto, añádelo a tu calendario.`;
  if (!canNotify()) return 'Guárdalo en tu calendario y te recordamos el día antes y 2 horas antes.';
  if (Notification.permission === 'granted') return `${ic('bell')} ${p.push ? 'Te avisaremos en este teléfono el día antes y la mañana del paseo, aunque no abras la app.' : 'Avisos activados en este teléfono.'}${p.cal ? '' : ' El calendario es tu respaldo.'}`;
  if (Notification.permission === 'denied') return 'Los avisos están bloqueados en este navegador: añádelo a tu calendario para el recordatorio.';
  return 'Añádelo a tu calendario para recibir el recordatorio el día antes y 2 horas antes.';
}
function wirePlan(root) {
  const box = $('[data-plan]', root); if (!box) return; const code = box.dataset.plan;
  const r0 = byCode(code); const t = times(r0);
  const tick = setInterval(() => { if (!box.isConnected) return clearInterval(tick); tickCd(box, t.start - Date.now()); }, 1000);
  box.addEventListener('change', e => { const k = e.target.dataset.pl; if (!k) return; if (byCode(code).plan) { setPlan(code, { [k]: e.target.checked }); if (byCode(code).plan.push) pushSub(byCode(code), false); toast(e.target.checked ? 'Activado para tu paseo' : 'Lo quitamos de tu paseo'); } });
  box.addEventListener('click', async e => {
    if (e.target.closest('[data-pl-ics]')) { const r = byCode(code); if (!r.plan) setPlan(code, picks(box)); addToCalendar(byCode(code)); refresh(box); return; }
    if (e.target.closest('[data-pl-g]')) { const r = byCode(code); if (!r.plan) setPlan(code, picks(box)); setPlan(code, { cal: true }); refresh(box); return; }
    if (!e.target.closest('[data-pl-go]')) return;
    const fresh = !byCode(code).plan;
    setPlan(code, picks(box));
    box.classList.add('on', 'pop'); setTimeout(() => box.classList.remove('pop'), 900);
    refresh(box);
    if (fresh) toast('¡Listo! Tu paseo quedó programado');
    const p = await askNotify(byCode(code));
    if (p === 'granted') toast('Te avisaremos en este teléfono');
    refresh(box);
  });
}
const picks = box => ({ abordo: $('[data-pl="abordo"]', box).checked, album: $('[data-pl="album"]', box).checked });
function refresh(box) {
  const r = byCode(box.dataset.plan); if (!r) return; const p = r.plan;
  box.classList.toggle('on', !!p);
  $('[data-pl-go]', box).innerHTML = p ? `${ic('ok')} Programado para el ${esc(r.date)}` : `Programar para el ${esc(r.date)}`;
  $('.pl-h b', box).textContent = p ? 'Listo: tu paseo está programado' : 'Programa tu paseo en la app';
  if (p) $('.pl-h p', box).textContent = `El ${fmtLong(times(r).start)} la app te abre el modo a bordo y, al volver, tu álbum del día.`;
  $('[data-pl-note]', box).innerHTML = noteTxt(r);
}

/* ---------- tarjeta "Tu próximo paseo" en Mi viaje ---------- */
let cdTimer = null;
function renderCard() {
  const box = $('#trip-plan'); if (!box) return;
  const r = featured(); clearInterval(cdTimer);
  if (!r) { box.hidden = true; box.innerHTML = ''; return; }
  const t = times(r), s = stateOf(r), p = r.plan || null, now = Date.now(), started = now >= t.start;
  const head = { soon: ['Tu próximo paseo', 'Faltan'], today: [started ? 'Estás en el mar' : 'Hoy zarpas', started ? 'Regreso a las ' + fmtHour(t.end) : 'Zarpas en'], album: ['Tu álbum del día', ''] }[s];
  const step = (k, title, txt, on, done) => `<li class="${done ? 'done' : on ? 'now' : ''}"><span class="tp-dot">${done ? ic('ok') : ic(k)}</span><div><b>${title}</b><small>${txt}</small></div></li>`;
  let main = '';
  if (s === 'soon') main = `<div class="cd big">${cdHtml(t.start - now)}</div>`;
  if (s === 'today') main = started ? `<p class="tp-live"><span class="live-dot" aria-hidden="true"></span> Buen viaje. Deja el modo a bordo abierto durante el paseo.</p>` : `<div class="cd big">${cdHtml(t.start - now)}</div>`;
  if (s === 'album') main = `<p class="tp-live">Las fotos y videos de dron de tu paseo están en tu álbum privado por 30 días.</p>`;
  const acts = s === 'today' ? `<button class="btn btn-sos btn-lg" type="button" data-tp-abordo>${ic('sos')} Abrir modo a bordo</button><button class="btn btn-ghost-l btn-sm" type="button" data-tp-live>Ver en vivo</button>`
    : s === 'album' ? `<button class="btn btn-sun btn-lg" type="button" data-tp-album>${ic('album')} Abrir mi álbum</button>`
    : p ? `<button class="btn btn-ghost-l btn-sm" type="button" data-tp-ics>${ic('cal')} Añadir al calendario</button><button class="btn btn-ghost-l btn-sm" type="button" data-tp-abordo>Probar el modo a bordo</button>`
    : `<button class="btn btn-sun btn-lg" type="button" data-tp-plan>Programar a bordo y álbum</button>`;
  box.hidden = false;
  box.className = `trip-plan tp-${s}`;
  box.innerHTML = `<div class="tp-card">
    <div class="tp-top"><div><span class="eyebrow">${head[0]}</span><h2>${esc(r.boat)}</h2><span class="tp-meta">${esc(fmtLong(t.start))} · ${esc(fmtHour(t.start))} · ${esc(r.dock)}</span></div><span class="mono tp-code">${r.code}</span></div>
    ${head[1] ? `<span class="tp-cd-l">${head[1]}</span>` : ''}${main}
    <ol class="tp-steps">
      ${step('cal', 'Reserva', r.sent ? 'Enviada a Tu Lancha' : 'Falta avisar por WhatsApp', !r.sent, !!r.sent)}
      ${step('gps', 'Modo a bordo', p && p.abordo === false ? 'No programado' : s === 'soon' ? `Se activa el ${esc(r.date)}` : s === 'today' ? 'Activo hoy' : 'Completado', s === 'today', s === 'album')}
      ${step('album', 'Álbum del día', p && p.album === false ? 'No programado' : s === 'album' ? 'Listo para ver' : 'Al volver del paseo', s === 'album', false)}
    </ol>
    <div class="tp-acts">${acts}</div>
  </div>`;
  if ($('.cd', box)) cdTimer = setInterval(() => { const ms = t.start - Date.now(); if (ms <= 0 || stateOf(r) !== s) return render(); tickCd(box, ms); }, 1000);
}
$('#trip-plan')?.addEventListener('click', e => {
  const r = featured(); if (!r) return;
  if (e.target.closest('[data-tp-abordo]')) window.TLL.openAbordo(r.code);
  if (e.target.closest('[data-tp-album]')) window.TLL.openAlbum(r.code);
  if (e.target.closest('[data-tp-ics]')) addToCalendar(r);
  if (e.target.closest('[data-tp-live]')) { const i = $('#code-live'); if (i) { i.value = r.code; i.form.requestSubmit(); } }
  if (e.target.closest('[data-tp-plan]')) { const d = $('#dlg'); if (d.open) d.close(); openPlanSheet(r.code); }
});
function openPlanSheet(code) {
  const r = byCode(code); if (!r) return; const dlg = $('#dlg');
  dlg.className = 'sheetish';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view book done">${planBlock(r)}</div>`;
  dlg.onchange = null; dlg.onclick = e => { if (e.target === dlg || e.target.closest('.m-close')) dlg.close(); };
  wirePlan(dlg); dlg.showModal();
}

/* ---------- aviso flotante en toda la app ---------- */
function renderChip() {
  const el = $('#trip-chip'); if (!el) return;
  const r = featured(); const s = r ? stateOf(r) : 'none';
  const t = r && times(r), soonish = s === 'soon' && t.start - Date.now() < 3 * DAY;
  const show = r && r.plan && (s === 'today' || s === 'album' || soonish) && store.get('chip-off', '') !== `${r.code}:${s}` && !['#mi-viaje', '#reservar'].includes(location.hash);
  if (!show) { el.hidden = true; document.body.classList.remove('has-chip'); return; }
  const k = s === 'today' ? ['sos', now() >= t.start ? 'Estás a bordo' : 'Hoy zarpas', 'Abrir modo a bordo'] : s === 'album' ? ['album', 'Tu álbum del día', 'Ver fotos'] : ['cal', 'Tu paseo', countTxt(t.start - Date.now())];
  el.className = `trip-chip tc-${s}`; el.hidden = false; document.body.classList.add('has-chip');
  el.innerHTML = `<button type="button" class="tc-go" data-tc-go><span class="tc-ic">${ic(k[0])}</span><span class="tc-tx"><b>${k[1]}</b><small>${esc(k[2])}</small></span></button><button type="button" class="tc-x" data-tc-x aria-label="Ocultar aviso">×</button>`;
}
const now = () => Date.now();
const countTxt = ms => { const x = left(ms); return x.d ? `Faltan ${x.d} ${x.d === 1 ? 'día' : 'días'} y ${x.h} h` : `Faltan ${x.h} h ${x.m} min`; };
$('#trip-chip')?.addEventListener('click', e => {
  const r = featured(); if (!r) return; const s = stateOf(r);
  if (e.target.closest('[data-tc-x]')) { store.set('chip-off', `${r.code}:${s}`); renderChip(); return; }
  if (!e.target.closest('[data-tc-go]')) return;
  if (s === 'today') window.TLL.openAbordo(r.code); else if (s === 'album') window.TLL.openAlbum(r.code); else location.hash = 'mi-viaje';
});

/* ---------- Mi viaje solo aparece cuando hay una reserva ---------- */
function render() {
  document.body.classList.toggle('has-trip', mine().length > 0);
  renderCard(); renderChip();
  $$('[data-plan]').forEach(refresh);
}

/* ---------- enlaces directos: #a-bordo/TLL-1234 y #album/TLL-1234 (vienen del calendario y los avisos) ---------- */
function route() {
  const m = location.hash.match(/^#(a-bordo|album)\/(TLL-\d{4})$/i); if (!m) return;
  const code = m[2].toUpperCase(), d = $('#dlg'); if (d.open) return;
  history.replaceState(null, '', '#mi-viaje'); window.dispatchEvent(new HashChangeEvent('hashchange'));
  setTimeout(() => m[1].toLowerCase() === 'album' ? window.TLL.openAlbum(code) : window.TLL.openAbordo(code), 0);
}
addEventListener('hashchange', () => { route(); renderChip(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); notifyDue(); } });
setInterval(() => { renderChip(); notifyDue(); }, 60000);
render(); notifyDue(); route();
mine().forEach(r => { if (!r.plan || !r.plan.notify) return; scheduleTriggers(r); if (r.plan.push && stateOf(r) === 'soon') pushSub(r, false); });
Object.assign(window.TLL, { planBlock, wirePlan, renderPlan: render, tripState: stateOf, tripTimes: times, tripIcs: ics });
})();
