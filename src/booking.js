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
// cuentas que Eduardo carga en su panel (correo Zelle, titular, ID de Binance Pay)
const acctOf = k => { const P = (window.TLL.CAT && window.TLL.CAT.pay) || {}; return k === 'zelle' ? [P.zelle, P.zelleName] : k === 'binance' ? [P.binance, P.binanceUser] : ['', '']; };
const HOW_ACCT = { zelle: 'Paga el abono a este Zelle y mándanos la captura por WhatsApp.', binance: 'Paga el abono en USDT a este ID de Binance Pay y mándanos la captura por WhatsApp.' };
const payInfo = (k, total) => { const m = PAY[k], [ac, holder] = acctOf(k), P = (window.TLL.CAT && window.TLL.CAT.pay) || {};
  const bn = k === 'binance' && ac;
  return `<div class="pay-info"><div class="pay-amt"><span>Abono para apartar</span><b>${money(total / 2)}</b><small>50% · el resto en el muelle antes de zarpar</small></div><p>${ac ? HOW_ACCT[k] : m.how}</p>${ac ? `<p class="pay-acct mono" translate="no">${bn ? "ID " : ""}${esc(ac).replace("@", "@<wbr>")}</p>${holder ? `<p class="rating">${bn ? 'Usuario:' : 'Titular:'} <b translate="no">${esc(holder)}</b></p>` : ''}` : ''}
  ${bn && (P.binanceQR || P.binanceLink) ? `<div class="pay-qr">${P.binanceQR ? `<img src="${esc(P.binanceQR)}" alt="QR de Binance Pay" width="120" height="120" loading="lazy">` : ''}${P.binanceLink ? `<a class="btn btn-sun btn-sm" href="${esc(P.binanceLink)}" target="_blank" rel="noopener">Abrir en Binance</a>` : ''}</div>` : ''}</div>`; };

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
/* Revisión antes de pagar: lo que el cliente pidió, punto por punto, con el total */
const reviewHtml = q => {
  const extras = (q.lines || []).slice(1).filter(l => l[1] >= 0).map(l => l[0]);
  const ck = [['Embarcación', `${q.boat}${q.type ? ' · ' + q.type : ''}`], ['Grupo', q.paxTxt || q.pax + ' personas'], ['Fecha y horario', `${q.date}${q.hours ? ' · ' + q.hours : ''}`],
    ['Rumbo', q.route], ['Muelle', `${q.dock}${q.dockFee ? ' · toque de muelle aparte' : ''}`], ['Extras', extras.length ? extras.join(', ') : 'Sin extras'], ['Incluido', 'Tripulación, chalecos, hielo y agua']];
  return `<section class="bk-review" aria-labelledby="bk-rv-t"><div class="bk-rv-h"><span class="eyebrow">Revisa tu pedido</span><b id="bk-rv-t">Todo lo que pediste</b></div>
    <ul class="bk-checks">${ck.map(([k, v]) => `<li><span class="bk-ck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg></span><span class="bk-k">${k}</span><span class="bk-v">${esc(v)}</span></li>`).join('')}</ul>
    <dl class="bk-lines">${(q.lines || []).map(l => `<div><dt>${esc(l[0])}</dt><dd>${l[2] === 'tbd' ? 'por confirmar' : money(l[1])}</dd></div>`).join('')}</dl>
    <div class="bk-total"><span>Total de tu pedido</span><strong id="bk-total">${money(q.total)}</strong></div>
    <div class="bk-split"><div><span>Abono para apartar (50%)</span><b>${money(q.total / 2)}</b></div><div><span>Resto, en el muelle</span><b>${money(q.total - q.total / 2)}</b></div></div>
  </section>`;
};
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
    ${reviewHtml(q)}
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
    // aviso al panel de Eduardo (si no hay conexión, no pasa nada: la reserva sigue en el teléfono y en WhatsApp)
    try { fetch('/api/admin?a=book', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: r.code, created: r.created, iso: r.iso, date: r.date, boat: r.boat, route: r.route, dock: r.dock, hours: r.hours, pax: r.pax, kids: r.kids, total: r.total, pay: r.pay, name: r.name, phone: r.phone, note: r.note, lang: (window.TLL_I18N && TLL_I18N.lang) || 'es' }) }).catch(() => {}); } catch {}
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
    <div class="bk-pdf" id="bk-pdf"><div class="bk-pdf-doc" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h7M9 17h5"/></svg></div>
      <div class="bk-pdf-t"><b>Comprobante de reserva</b><span id="bk-pdf-st">Preparando tu PDF…</span></div>
      <div class="bk-pdf-acts">${canShareFiles() ? '<button class="btn btn-wa btn-sm" type="button" id="bk-pdf-share">Enviar PDF por WhatsApp</button>' : ''}<button class="btn btn-ghost btn-sm" type="button" id="bk-pdf-dl">Descargar PDF</button></div></div>
    ${window.TLL.planBlock ? window.TLL.planBlock(r) : ''}
    <a class="btn btn-ghost" href="#mi-viaje" id="bk-trip">Ver en Mi viaje</a>
  </div>`;
  closeOn(dlg);
  window.TLL.wirePlan && window.TLL.wirePlan(dlg);
  $('#bk-send', dlg).addEventListener('click', () => { markSent(r.code); $('#bk-li-send', dlg).className = 'ok'; $('#bk-send', dlg).textContent = 'Volver a enviar a Tu Lancha'; });
  $('#bk-trip', dlg).addEventListener('click', () => dlg.close());
  // el PDF se prepara apenas se abre esta pantalla, así el toque de "Enviar" conserva el gesto del usuario
  const st = $('#bk-pdf-st', dlg); let blob = null;
  pdfFor(r).then(b => { blob = b; st.textContent = `${pdfName(r)} · ${Math.max(1, Math.round(b.size / 1024))} KB`; $('#bk-pdf', dlg).classList.add('ready'); })
    .catch(() => { st.textContent = 'No se pudo preparar el PDF. Intenta de nuevo.'; });
  const getBlob = async () => blob || (blob = await pdfFor(r));
  $('#bk-pdf-dl', dlg).addEventListener('click', async () => { try { saveBlob(await getBlob(), pdfName(r)); toast('Comprobante descargado'); } catch { toast('No se pudo crear el PDF'); } });
  const sh = $('#bk-pdf-share', dlg);
  if (sh) sh.addEventListener('click', async () => {
    try {
      const file = new File([await getBlob()], pdfName(r), { type: 'application/pdf' });
      await navigator.share({ files: [file], title: TLL_I18N.tr(`Comprobante ${r.code}`), text: TLL_I18N.tr(`Reserva ${r.code} · Tu Lancha Lechería. Elige WhatsApp y envíalo a Tu Lancha (+58 414 308 3864).`) });
      markSent(r.code); $('#bk-li-send', dlg).className = 'ok';
    } catch (e) { if (e && e.name === 'AbortError') return; saveBlob(await getBlob(), pdfName(r)); toast('Descargamos el PDF: adjúntalo en el chat de WhatsApp'); }
  });
  if (!dlg.open) dlg.showModal();
}
function markSent(code) { saveMine(mine().map(x => x.code === code ? { ...x, sent: true } : x)); renderMine(); }

function renderMine() {
  const box = $('#my-trips'); if (!box) return;
  const l = mine();
  box.hidden = !l.length;
  if (!l.length) { box.innerHTML = ''; window.TLL.renderPlan && window.TLL.renderPlan(); return; }
  ['#code-live', '#code-album'].forEach(s => { const i = $(s); if (i) i.value = l[0].code; });
  box.innerHTML = `<div class="head"><h2>Mis reservas</h2></div><div class="mytrips">${l.map(r => `<article class="mytrip glass-card">
    <div class="mt-top"><span class="mono mt-code">${r.code}</span><span class="mt-st ${r.sent ? 'ok' : 'warn'}">${r.sent ? 'Enviada a Tu Lancha' : 'Falta avisar'}</span></div>
    <b>${esc(r.boat)}</b><span>${esc(r.date)} · ${r.pax} personas · ${esc(r.route)}</span><strong>${money(r.total)}</strong>
    <div class="row2"><button class="btn btn-sm ${r.sent ? 'btn-ghost' : 'btn-wa'}" type="button" data-mt-open="${r.code}">${r.sent ? 'Ver comprobante' : 'Avisar a Tu Lancha'}</button><button class="btn btn-ghost btn-sm" type="button" data-mt-live="${r.code}">Ver en vivo</button></div>
  </article>`).join('')}</div>`;
  window.TLL.renderPlan && window.TLL.renderPlan();
}
document.addEventListener('click', e => {
  if (e.target.closest('#t-book,#mb-book')) { e.preventDefault(); openBooking(); return; }
  const o = e.target.closest('[data-mt-open]');
  if (o) { const r = mine().find(x => x.code === o.dataset.mtOpen); if (r) { const d = $('#dlg'); if (d.open) d.close(); showDone(r); } return; }
  const lv = e.target.closest('[data-mt-live]');
  if (lv) { $('#code-live').value = lv.dataset.mtLive; $('#code-live').form.requestSubmit(); }
});

/* ---------------- comprobante de reserva en PDF (se genera en el teléfono) ----------------
   No es una factura fiscal: es el comprobante de lo que el cliente pidió. jsPDF se carga solo cuando hace falta. */
const pdfName = r => `Tu-Lancha-${r.code}.pdf`;
let jspdfP = null;
const loadJsPdf = () => jspdfP || (jspdfP = new Promise((ok, no) => { if (window.jspdf) return ok(window.jspdf); const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = () => ok(window.jspdf); s.onerror = () => { jspdfP = null; no(new Error('jsPDF')); }; document.head.appendChild(s); }));
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
// Cabecera: foto real de Mochima con degradado azul noche y el logo, compuesta en un canvas
async function headerImage() {
  const W = 1240, H = 420, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#0d1b2e'; x.fillRect(0, 0, W, H);
  try { const ph = await loadImg('media/hero-mochima-land.webp'); const s = Math.max(W / ph.width, H / ph.height), w = ph.width * s, h = ph.height * s; x.drawImage(ph, (W - w) * .55, (H - h) * .55, w, h); } catch {}
  let g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(9,18,33,.94)'); g.addColorStop(.55, 'rgba(9,18,33,.72)'); g.addColorStop(1, 'rgba(9,18,33,.25)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createLinearGradient(0, H * .6, 0, H); g.addColorStop(0, 'rgba(9,18,33,0)'); g.addColorStop(1, 'rgba(9,18,33,.6)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  try { const lg = await loadImg('icons/logo-128.png'); x.save(); x.beginPath(); x.arc(102, 104, 46, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.clip(); x.drawImage(lg, 58, 60, 88, 88); x.restore(); x.strokeStyle = 'rgba(214,182,110,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(102, 104, 48, 0, Math.PI * 2); x.stroke(); } catch {}
  return c.toDataURL('image/jpeg', .86);
}
// Ilustración de la embarcación (la misma de la app), rasterizada para el PDF
async function boatImage(r) {
  const b = (window.TLL.BOATS || []).find(x => x.name === r.boat);
  try { const svg = window.TLL.art('exterior', b ? b.hue : 200, 'pdf' + r.code).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"'); const i = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); const c = document.createElement('canvas'); c.width = 640; c.height = 400; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 640, 400); return c.toDataURL('image/jpeg', .88); } catch { return null; }
}
const clean = s => String(s ?? '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
async function makePdf(r) {
  const [{ jsPDF }, head, boatPic] = await Promise.all([loadJsPdf(), headerImage(), boatImage(r)]);
  const d = new jsPDF({ unit: 'mm', format: 'a4', compress: true }), W = 210, M = 16; TLL_I18N.pdf(d);
  const NAVY = [13, 27, 46], INK = [21, 26, 51], MUT = [104, 112, 133], GOLD = [196, 160, 82], LINE = [226, 230, 238], SOFT = [245, 247, 251];
  const col = c => d.setTextColor(...c), fill = c => d.setFillColor(...c), draw = c => d.setDrawColor(...c);
  d.setProperties({ title: TLL_I18N.tr(`Comprobante de reserva ${r.code}`), author: 'Tu Lancha Lechería', subject: TLL_I18N.tr('Comprobante de reserva'), creator: 'Tu Lancha Lechería' });
  // cabecera
  d.addImage(head, 'JPEG', 0, 0, W, 70);
  col(GOLD); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setCharSpace(1.2); d.text('COMPROBANTE DE RESERVA', 44, 20); d.setCharSpace(0);
  col([255, 255, 255]); d.setFontSize(22); d.text('Tu Lancha Lechería', 44, 30);
  d.setFont('helvetica', 'normal'); d.setFontSize(9.5); col([220, 226, 236]); d.text('Chárters y paseos a Mochima y las islas · Lechería, Anzoátegui', 44, 37);
  fill([255, 255, 255]); d.roundedRect(W - M - 52, 48, 52, 15, 3, 3, 'F'); col(MUT); d.setFontSize(7); d.text('CÓDIGO DE RESERVA', W - M - 26, 53.5, { align: 'center' }); col(NAVY); d.setFont('courier', 'bold'); d.setFontSize(13); d.text(r.code, W - M - 26, 60, { align: 'center' });
  d.setFont('helvetica', 'normal'); d.setFontSize(8.5); col([210, 216, 228]); d.text(`Emitido: ${new Date(r.created || Date.now()).toLocaleString(TLL_I18N.loc(), { dateStyle: 'long', timeStyle: 'short' })}`, M, 62);
  let y = 82;
  // cliente y viaje
  const kv = (k, v, x0, yy, w) => { col(MUT); d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.text(k.toUpperCase(), x0, yy); col(INK); d.setFont('helvetica', 'bold'); d.setFontSize(10.5); const lines = d.splitTextToSize(clean(v) || '-', w); d.text(lines, x0, yy + 5); return 5 + lines.length * 4.6; };
  const cw = 58, rows = [[['Cliente', r.name], ['WhatsApp', r.phone || '-']], [['Embarcación', `${r.boat}${r.type ? ' · ' + r.type : ''}`], ['Grupo', r.paxTxt || r.pax + ' personas']], [['Fecha', r.date], ['Horario', r.hours || '-']]];
  d.setFont('helvetica', 'bold'); d.setFontSize(10.5);
  const rowH = rows.map(([a, b]) => 5 + Math.max(d.splitTextToSize(clean(a[1]) || '-', cw - 4).length, d.splitTextToSize(clean(b[1]) || '-', 50).length) * 4.6);
  const cardH = Math.max(rowH.reduce((t, h) => t + h + 3, 0) - 3, 34) + 10;
  fill(SOFT); d.roundedRect(M, y - 6, W - 2 * M, cardH, 4, 4, 'F');
  if (boatPic) { const ih = Math.min(33.75, cardH - 8); d.addImage(boatPic, 'JPEG', W - M - 4 - ih * 1.6, y - 6 + (cardH - ih) / 2, ih * 1.6, ih); }
  rows.forEach(([a, b], i) => { kv(a[0], a[1], M + 6, y, cw - 4); kv(b[0], b[1], M + 6 + cw, y, 50); y += rowH[i] + 3; });
  y = 82 - 6 + cardH + 8;
  // salto de página si hace falta (el pie va en todas las páginas)
  const need = h => { if (y + h > 274) { d.addPage(); y = 22; } };
  // checklist
  col(GOLD); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setCharSpace(1); d.text('TU PASEO, PUNTO POR PUNTO', M, y); d.setCharSpace(0); y += 6;
  const extras = (r.lines || []).slice(1).filter(l => l[1] >= 0).map(l => clean(l[0]));
  const checks = [['Rumbo y playas', r.route], ['Muelle de salida', `${r.dock}${r.dockFee ? ' · toque de muelle aparte: ' + r.dockFee : ''}`], ['Extras', extras.length ? extras.join(', ') : 'Sin extras'],
    ['Incluido', 'Tripulación, chalecos salvavidas, hielo y agua'], ['Condiciones', `Aceptadas (${POLICY_REV})`]];
  checks.forEach(([k, v]) => {
    need(8); fill(GOLD); d.circle(M + 2.6, y - 1.2, 2.6, 'F'); draw([255, 255, 255]); d.setLineWidth(.6); d.lines([[1, 1], [1.9, -2.1]], M + 1.3, y - 1.2);
    col(INK); d.setFont('helvetica', 'bold'); d.setFontSize(9.5); d.text(k, M + 8, y);
    d.setFont('helvetica', 'normal'); col([60, 66, 88]); const t = d.splitTextToSize(clean(v), W - 2 * M - 52); d.text(t, M + 50, y); y += Math.max(1, t.length) * 4.4 + 2;
  });
  // detalle y total
  y += 2; col(GOLD); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setCharSpace(1); d.text('DETALLE DEL PEDIDO', M, y); d.setCharSpace(0); y += 3;
  draw(LINE); d.setLineWidth(.3);
  (r.lines || []).forEach(l => { need(9); y += 7; col(INK); d.setFont('helvetica', 'normal'); d.setFontSize(10); d.text(d.splitTextToSize(clean(l[0]), W - 2 * M - 40)[0], M, y); d.setFont('helvetica', 'bold'); d.text(l[2] === 'tbd' ? 'por confirmar' : money(l[1]), W - M, y, { align: 'right' }); d.line(M, y + 2.6, W - M, y + 2.6); });
  y += 7; need(16); fill(NAVY); d.roundedRect(M, y, W - 2 * M, 16, 3, 3, 'F'); col([255, 255, 255]); d.setFont('helvetica', 'bold'); d.setFontSize(11); d.text('TOTAL ESTIMADO', M + 6, y + 10.2);
  col([243, 213, 138]); d.setFontSize(18); d.text(money(r.total), W - M - 6, y + 11, { align: 'right' }); y += 21; need(24);
  const pm = r.pay && PAY[r.pay] ? PAY[r.pay].name : 'Por acordar';
  fill([253, 248, 236]); draw([236, 220, 180]); d.roundedRect(M, y, W - 2 * M, 22, 3, 3, 'FD');
  col(MUT); d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.text('MÉTODO DE PAGO', M + 6, y + 6.5); d.text('ABONO PARA APARTAR (50%)', M + 70, y + 6.5); d.text('RESTO, EN EL MUELLE', M + 132, y + 6.5);
  col(INK); d.setFont('helvetica', 'bold'); d.setFontSize(12); d.text(pm, M + 6, y + 14); d.text(money(r.total / 2), M + 70, y + 14); d.text(money(r.total - r.total / 2), M + 132, y + 14);
  col(MUT); d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.text(r.pay === 'efectivo' ? 'La entrega del abono en efectivo se acuerda por WhatsApp.' : 'Los datos para el abono te los envía Tu Lancha por WhatsApp.', M + 6, y + 19.2); y += 26;
  if (r.note) { need(14); col(MUT); d.setFontSize(7.5); d.text('NOTA DEL CLIENTE', M, y); col(INK); d.setFontSize(9.5); const t = d.splitTextToSize(clean(r.note), W - 2 * M); d.text(t, M, y + 5); y += 7 + t.length * 4.4; }
  // condiciones resumidas
  need(12); col(GOLD); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setCharSpace(1); d.text('CONDICIONES PRINCIPALES', M, y); d.setCharSpace(0); y += 5;
  d.setFont('helvetica', 'normal'); d.setFontSize(7.6); col([84, 90, 110]);
  POLICY_SHORT.forEach(p => { const t = d.splitTextToSize(p, W - 2 * M - 5); need(t.length * 3.4 + 2); d.setFont('helvetica', 'normal'); d.setFontSize(7.6); col([84, 90, 110]); fill(GOLD); d.circle(M + 1, y - 1, .7, 'F'); d.text(t, M + 4, y); y += t.length * 3.4 + 1.4; });
  // pie en cada página
  const pages = d.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    d.setPage(i);
    fill(NAVY); d.rect(0, 277, W, 20, 'F'); draw(GOLD); d.setLineWidth(.4); d.line(0, 277, W, 277);
    col([255, 255, 255]); d.setFont('helvetica', 'bold'); d.setFontSize(9.5); d.text('Tu Lancha Lechería', M, 285);
    d.setFont('helvetica', 'normal'); d.setFontSize(8); col([200, 208, 222]); d.text('WhatsApp +58 414 308 3864  ·  @tulanchalecheria  ·  tulanchalecheria.vercel.app', M, 290.5);
    col([243, 213, 138]); d.setFontSize(7); d.text('Comprobante de reserva. No es una factura fiscal.', W - M, 285, { align: 'right' });
    if (pages > 1) { col([200, 208, 222]); d.text(`${r.code} · página ${i} de ${pages}`, W - M, 290.5, { align: 'right' }); }
  }
  return d.output('blob');
}
const pdfCache = new Map();
const pdfFor = r => { if (!pdfCache.has(r.code)) pdfCache.set(r.code, makePdf(r).catch(e => { pdfCache.delete(r.code); throw e; })); return pdfCache.get(r.code); };
function saveBlob(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] })); } catch { return false; } };

renderMine();
Object.assign(window.TLL, { openBooking, renderMine, pdfFor });
})();
