/* ---------------- reserva dentro de la app ----------------
   El cliente confirma en la app, recibe su código TLL-#### y su comprobante.
   Eduardo recibe el aviso con un toque por WhatsApp (sin servidor). */
(() => {
const { $, $$, wa, money, store, toast } = window.TLL;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mine = () => store.get('mine', []);
const saveMine = l => store.set('mine', l);
const me = () => store.get('me', {});
function newCode() { const used = new Set(mine().map(x => x.code)); let c; do { c = 'TLL-' + String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(c) || c === 'TLL-1105'); return c; }

/* Métodos de pago de Eduardo. Los datos de cuenta (correo Zelle, ID de Binance Pay) los pasa Eduardo:
   mientras estén vacíos, la app no inventa nada y dice que se envían por WhatsApp al confirmar. */
const PAY = {
  zelle: { name: 'Zelle', tag: 'USD · al instante', acct: '', how: 'Te enviamos el correo de Zelle por WhatsApp. Pagas el abono y nos mandas la captura.',
    ic: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>' },
  binance: { name: 'Binance Pay', tag: 'USDT · sin comisión', acct: '', how: 'Te enviamos nuestro ID de Binance Pay por WhatsApp. Pagas en USDT y nos mandas la captura.',
    ic: '<path d="M12 2l3 3-3 3-3-3 3-3zM5 9l3 3-3 3-3-3 3-3zm14 0l3 3-3 3-3-3 3-3zm-7 7l3 3-3 3-3-3 3-3zm0-7l3 3-3 3-3-3 3-3z"/>' },
  efectivo: { name: 'Efectivo', tag: 'USD · se acuerda', acct: '', how: 'Acordamos contigo por WhatsApp cómo y dónde entregar el abono en efectivo.',
    ic: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>' }
};
const payCard = (k, sel, total) => { const m = PAY[k]; return `<label class="pay-opt" data-pay="${k}"><input type="radio" name="bk-pay" value="${k}"${k === sel ? ' checked' : ''}>
  <span class="pay-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${m.ic}</svg></span><span class="pay-txt"><b>${m.name}</b><small>${m.tag}</small></span><span class="pay-chk" aria-hidden="true"></span></label>`; };
const payInfo = (k, total) => { const m = PAY[k]; return `<div class="pay-info"><div class="pay-amt"><span>Abono para apartar</span><b>${money(total / 2)}</b><small>50% · el resto en el muelle antes de zarpar</small></div><p>${m.how}</p>${m.acct ? `<p class="pay-acct mono">${esc(m.acct)}</p>` : ''}</div>`; };

const waText = r => `Hola Tu Lancha 👋 Hice una reserva en la app.\n🔖 Código: ${r.code}\n👤 ${r.name}${r.phone ? ' · ' + r.phone : ''}\n👥 ${r.paxTxt || r.pax + ' personas'}\n⛵ ${r.boat}\n📅 ${r.date}${r.hours ? ' · ' + r.hours : ''}\n🏝️ ${r.route}\n⚓ ${r.dock}\n${r.lines.slice(1).map(l => (l[1] < 0 ? '🎁 ' : '➕ ') + l[0] + (l[2] === 'tbd' ? ' (por confirmar)' : '')).join('\n')}${r.lines.length > 1 ? '\n' : ''}💵 Total estimado: ${money(r.total)}${r.pay && PAY[r.pay] ? `\n💳 Pago: ${PAY[r.pay].name} · abono ${money(r.total / 2)}` : ''}${r.note ? '\n📝 ' + r.note : ''}${r.accepted ? '\n✅ Acepté las condiciones de alquiler (' + POLICY_REV + ')' : ''}\n¿Me confirman disponibilidad y el abono?`;
/* Condiciones y Política de Alquiler (Rev. 01 · sep. 2026). No se publica en la web:
   solo se muestra al confirmar una reserva, con casilla obligatoria. */
const POLICY_REV = 'Rev. 01 · sep. 2026';
const POLICY_SHORT = [
  'Apartas con 50% en temporada baja o 100% en temporada alta. En temporada alta y fines de semana la embarcación es de quien pague primero.',
  'El resto se paga y se verifica en el muelle antes de encender motores. Las horas extra se pagan en efectivo a bordo.',
  'Capacidad estricta: los niños cuentan como pasajeros. Debe ir al menos un mayor de 18 años.',
  'Cancelas con 24 h (lanchas) o 48 h (barcos y yates) de anticipación: reembolso con 20% de retención o 100% en crédito por 30 días.',
  'Por clima solo se reprograma si Capitanía cierra el puerto o el capitán declara condiciones extremas.'
];
const POLICY_FULL = [
  ['Reserva y pago', ['Se reserva con 50% en temporada baja o 100% en temporada alta. En temporada alta y fines de semana no se aparta una embarcación más de 30 minutos: es del primero que pague.', 'El 50% restante se paga y se verifica antes de encender motores, después de revisar la embarcación en el muelle.', 'Las horas extra se pagan en efectivo a bordo. Las reservas de varios días se liquidan cada día.', 'Los reembolsos por Zelle tardan de 24 a 72 horas.']],
  ['Normas a bordo', ['Uso exclusivo para tu grupo, con al menos una persona mayor de 18 años.', 'La capacidad es estricta y los niños cuentan como pasajeros. Excederla tiene una penalidad de $50 (lanchas) o $100 (yates) y se suspende la salida.', 'Solo perros pequeños, con aprobación previa.', 'Prohibidos la cachimba (hookah) y los vapers (Gaceta Oficial 42.682) y las drogas: el capitán puede terminar el paseo sin reembolso.', 'Se suman las tasas portuarias que apliquen.']],
  ['Cancelaciones', ['Todo reembolso tiene una retención del 20%.', 'Si cancelas con 24 h (lanchas) o 48 h (barcos y yates) de anticipación: reembolso menos 20%, o 100% en crédito para usar en 30 días.', 'Si cancelas después: reembolso menos 20% solo si la embarcación se vuelve a alquilar; si no, no hay reembolso.']],
  ['Fallas', ['Si la embarcación falla, te damos otra de condiciones similares (unas 1,5 h de espera, que se compensan al final del día). Si la nueva cuesta más de $70 por encima de la original, pagas la diferencia; si no hay opción, reembolso del 100%. En feriados casi no hay reemplazos.', 'Falla de motor ya en la playa: reembolso proporcional.', 'Falla de planta o aire acondicionado en yates: compensación de $70 si el paseo continúa.', 'Embarcaciones grandes (25 a 30 personas): no hay reemplazo inmediato, se reprograma la fecha. Los proveedores externos no están cubiertos.']],
  ['Muelles y accesorios', ['Un solo punto de embarque para todo el grupo. El toque de muelle y la seguridad del vehículo dependen de cada establecimiento.', 'Cerro El Morro y Eurobuilding: regreso máximo a las 5:30 pm.', 'Los daños a accesorios se cobran a precio de mercado.', 'No alquilamos motos de agua ni inflables externos; si los contratas, se abordan desde la orilla.', 'No respondemos por objetos que caigan al agua.']],
  ['Seguridad', ['Recomendamos pastillas para el mareo (por ejemplo, Viajesan).', 'Ante síntomas graves, la embarcación regresa de inmediato.', 'Eventos grandes (más de 20 personas): traslado con embarcaciones de apoyo, por cuenta del cliente.']],
  ['Clima', ['Las nubes o la lluvia pasajera no son motivo de cancelación.', 'Solo el cierre oficial del puerto (INEA o Capitanía) o condiciones extremas declaradas por el capitán permiten reprogramar al 100%, o reembolso si no puedes reprogramar.', 'Si decides no ir con el puerto abierto, cuenta como cancelación tardía.']]
];
const policyHtml = () => `<details class="bk-policy"><summary>Leer las condiciones completas</summary><p class="bk-rev">Condiciones y Política de Alquiler · ${POLICY_REV}</p>${POLICY_FULL.map(([h, l]) => `<h4>${h}</h4><ul>${l.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}<p>Antes de tu salida, revisa también las historias destacadas de @tulanchalecheria.</p></details>`;
const closeOn = dlg => { dlg.onchange = null; dlg.onclick = e => { if (e.target === dlg || e.target.closest('.m-close')) dlg.close(); }; };

function openBooking() {
  const q = window.TLL_LAST; if (!q) { toast('Para grupos tan grandes, escríbenos y armamos una flotilla.'); return; }
  if (q.block) { toast(q.block); return; }
  const dlg = $('#dlg'); if (dlg.open) dlg.close();
  const p = me();
  dlg.className = 'sheetish';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><form class="view book" id="bk-form" novalidate>
    <span class="eyebrow">Último paso</span><h2 id="m-title">Confirma tu reserva</h2>
    <div class="bk-sum"><div><b>${esc(q.boat)}</b><span>${esc(q.date)} · ${esc(q.paxTxt || q.pax + ' personas')}</span><span>${esc(q.route)}</span><span>${esc(q.dock)} · ${esc(q.hours || '')}</span></div><strong>${money(q.total)}</strong></div>
    ${q.busy ? `<p class="bk-warn">Esa embarcación aparece ocupada ese día. Puedes reservar igual y te proponemos otra fecha o una embarcación similar.</p>` : ''}
    <label class="field"><span class="lbl">Tu nombre</span><input id="bk-name" autocomplete="name" required value="${esc(p.name || '')}" placeholder="Nombre y apellido"></label>
    <label class="field"><span class="lbl">Tu WhatsApp</span><input id="bk-phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.phone || '')}" placeholder="0414 000 0000"></label>
    <label class="field"><span class="lbl">Algo que debamos saber (opcional)</span><input id="bk-note" placeholder="Cumpleaños, niños a bordo, hora preferida…"></label>
    <fieldset class="pay"><legend><span class="eyebrow">Pago</span><b>¿Cómo prefieres pagar el abono?</b></legend>
      <div class="pay-opts" role="radiogroup">${Object.keys(PAY).map(k => payCard(k, p.pay || 'zelle', q.total)).join('')}</div>
      <div id="bk-payinfo">${payInfo(p.pay || 'zelle', q.total)}</div>
      <p class="pay-secure"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>No pagas nada en la app. Confirmamos disponibilidad por WhatsApp y ahí acordamos el pago con Eduardo.</p>
    </fieldset>
    <div class="bk-terms"><h4>Condiciones principales</h4><ul>${POLICY_SHORT.map(x => `<li>${x}</li>`).join('')}</ul>${policyHtml()}
      <label class="bk-ok"><input type="checkbox" id="bk-ok" required> <span>Leí y acepto las condiciones de alquiler</span></label></div>
    <button class="btn btn-sun btn-lg" type="submit" id="bk-go">Confirmar reserva</button>
  </form>`;
  closeOn(dlg);
  const payNow = () => ($('input[name="bk-pay"]:checked', dlg) || {}).value || 'zelle';
  dlg.onchange = e => { if (e.target.name === 'bk-pay') $('#bk-payinfo', dlg).innerHTML = payInfo(payNow(), q.total); };
  $('#bk-form', dlg).onsubmit = e => {
    e.preventDefault();
    const name = $('#bk-name', dlg).value.trim(), phone = $('#bk-phone', dlg).value.trim();
    if (name.length < 2) { $('#bk-name', dlg).focus(); toast('Escribe tu nombre para la reserva'); return; }
    if (!$('#bk-ok', dlg).checked) { $('#bk-ok', dlg).focus(); toast('Para reservar, acepta las condiciones de alquiler'); return; }
    store.set('me', { name, phone, pay: payNow() });
    const r = { ...q, code: newCode(), name, phone, pay: payNow(), note: $('#bk-note', dlg).value.trim(), created: Date.now(), accepted: Date.now(), sent: false };
    saveMine([r, ...mine()].slice(0, 20));
    showDone(r); renderMine();
  };
  dlg.showModal();
}

function showDone(r) {
  const dlg = $('#dlg');
  dlg.className = 'sheetish';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view book done">
    <div class="bk-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
    <h2 id="m-title">¡Reserva registrada!</h2>
    <p class="bk-code-l">Tu código de reserva</p><p class="bk-code mono" id="bk-code">${r.code}</p>
    <div class="bk-sum"><div><b>${esc(r.boat)}</b><span>${esc(r.date)} · ${esc(r.paxTxt || r.pax + ' personas')}</span><span>${esc(r.route)}</span></div><strong>${money(r.total)}</strong></div>
    ${r.pay && PAY[r.pay] ? `<div class="pay-done"><span class="pay-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${PAY[r.pay].ic}</svg></span><div><span>Pagarás con</span><b>${PAY[r.pay].name}</b></div><strong>${money(r.total / 2)}<small>abono</small></strong></div>` : ''}
    <ol class="bk-next"><li class="ok">Reserva guardada en tu app</li><li id="bk-li-send" class="${r.sent ? 'ok' : 'now'}">Enviar la reserva a Tu Lancha por WhatsApp</li><li>Eduardo confirma la disponibilidad y te pasa ${r.pay === 'efectivo' ? 'cómo entregar el abono en efectivo' : 'los datos para el abono'}</li><li>Te enviamos la ubicación del muelle, un video de cómo llegar y cómo pagar el toque de muelle</li></ol>
    <a class="btn btn-wa btn-lg" id="bk-send" target="_blank" rel="noopener" href="${wa(waText(r))}">${r.sent ? 'Volver a enviar a Tu Lancha' : 'Enviar y acordar el pago por WhatsApp'}</a>
    <a class="btn btn-ghost" href="#mi-viaje" id="bk-trip">Ver en Mi viaje</a>
  </div>`;
  closeOn(dlg);
  $('#bk-send', dlg).addEventListener('click', () => { markSent(r.code); $('#bk-li-send', dlg).className = 'ok'; $('#bk-send', dlg).textContent = 'Volver a enviar a Tu Lancha'; });
  $('#bk-trip', dlg).addEventListener('click', () => dlg.close());
  if (!dlg.open) dlg.showModal();
}
function markSent(code) { saveMine(mine().map(x => x.code === code ? { ...x, sent: true } : x)); renderMine(); }

function renderMine() {
  const box = $('#my-trips'); if (!box) return;
  const l = mine();
  box.hidden = !l.length;
  if (!l.length) { box.innerHTML = ''; return; }
  ['#code-live', '#code-album'].forEach(s => { const i = $(s); if (i) i.value = l[0].code; });
  box.innerHTML = `<div class="head"><h2>Mis reservas</h2></div><div class="mytrips">${l.map(r => `<article class="mytrip glass-card">
    <div class="mt-top"><span class="mono mt-code">${r.code}</span><span class="mt-st ${r.sent ? 'ok' : 'warn'}">${r.sent ? 'Enviada a Tu Lancha' : 'Falta avisar'}</span></div>
    <b>${esc(r.boat)}</b><span>${esc(r.date)} · ${r.pax} personas · ${esc(r.route)}</span><strong>${money(r.total)}</strong>
    <div class="row2"><button class="btn btn-sm ${r.sent ? 'btn-ghost' : 'btn-wa'}" type="button" data-mt-open="${r.code}">${r.sent ? 'Ver comprobante' : 'Avisar a Tu Lancha'}</button><button class="btn btn-ghost btn-sm" type="button" data-mt-live="${r.code}">Ver en vivo</button></div>
  </article>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('#t-book,#mb-book')) { e.preventDefault(); openBooking(); return; }
  const o = e.target.closest('[data-mt-open]');
  if (o) { const r = mine().find(x => x.code === o.dataset.mtOpen); if (r) { const d = $('#dlg'); if (d.open) d.close(); showDone(r); } return; }
  const lv = e.target.closest('[data-mt-live]');
  if (lv) { $('#code-live').value = lv.dataset.mtLive; $('#code-live').form.requestSubmit(); }
});
renderMine();
Object.assign(window.TLL, { openBooking, renderMine });
})();
