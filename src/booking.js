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
const waText = r => `Hola Tu Lancha 👋 Hice una reserva en la app.\n🔖 Código: ${r.code}\n👤 ${r.name}${r.phone ? ' · ' + r.phone : ''}\n👥 ${r.pax} personas\n⛵ ${r.boat}\n📅 ${r.date}\n🏝️ ${r.route}\n⚓ ${r.dock}\n${r.lines.slice(1).map(l => (l[1] < 0 ? '🎁 ' : '➕ ') + l[0]).join('\n')}${r.lines.length > 1 ? '\n' : ''}💵 Total estimado: ${money(r.total)}${r.note ? '\n📝 ' + r.note : ''}\n¿Me confirman disponibilidad y el abono?`;
const closeOn = dlg => { dlg.onchange = null; dlg.onclick = e => { if (e.target === dlg || e.target.closest('.m-close')) dlg.close(); }; };

function openBooking() {
  const q = window.TLL_LAST; if (!q) { toast('Para grupos tan grandes, escríbenos y armamos una flotilla.'); return; }
  const dlg = $('#dlg'); if (dlg.open) dlg.close();
  const p = me();
  dlg.className = 'sheetish';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><form class="view book" id="bk-form" novalidate>
    <span class="eyebrow">Último paso</span><h2 id="m-title">Confirma tu reserva</h2>
    <div class="bk-sum"><div><b>${esc(q.boat)}</b><span>${esc(q.date)} · ${q.pax} personas</span><span>${esc(q.route)} · ${esc(q.dock)}</span></div><strong>${money(q.total)}</strong></div>
    ${q.busy ? `<p class="bk-warn">Esa embarcación aparece ocupada ese día. Puedes reservar igual y te proponemos otra fecha o una embarcación similar.</p>` : ''}
    <label class="field"><span class="lbl">Tu nombre</span><input id="bk-name" autocomplete="name" required value="${esc(p.name || '')}" placeholder="Nombre y apellido"></label>
    <label class="field"><span class="lbl">Tu WhatsApp</span><input id="bk-phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.phone || '')}" placeholder="0414 000 0000"></label>
    <label class="field"><span class="lbl">Algo que debamos saber (opcional)</span><input id="bk-note" placeholder="Cumpleaños, niños a bordo, hora preferida…"></label>
    <button class="btn btn-sun btn-lg" type="submit" id="bk-go">Confirmar reserva</button>
    <p class="bk-fine">No pagas nada ahora. Tu Lancha confirma la disponibilidad y te indica el abono (50%) para apartar la fecha.</p>
  </form>`;
  closeOn(dlg);
  $('#bk-form', dlg).onsubmit = e => {
    e.preventDefault();
    const name = $('#bk-name', dlg).value.trim(), phone = $('#bk-phone', dlg).value.trim();
    if (name.length < 2) { $('#bk-name', dlg).focus(); toast('Escribe tu nombre para la reserva'); return; }
    store.set('me', { name, phone });
    const r = { ...q, code: newCode(), name, phone, note: $('#bk-note', dlg).value.trim(), created: Date.now(), sent: false };
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
    <div class="bk-sum"><div><b>${esc(r.boat)}</b><span>${esc(r.date)} · ${r.pax} personas</span><span>${esc(r.route)}</span></div><strong>${money(r.total)}</strong></div>
    <ol class="bk-next"><li class="ok">Reserva guardada en tu app</li><li id="bk-li-send" class="${r.sent ? 'ok' : 'now'}">Avisar a Tu Lancha con un toque</li><li>Te confirmamos disponibilidad y abono</li></ol>
    <a class="btn btn-wa btn-lg" id="bk-send" target="_blank" rel="noopener" href="${wa(waText(r))}">${r.sent ? 'Volver a enviar a Tu Lancha' : 'Enviar a Tu Lancha'}</a>
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
