(() => {
'use strict';
const { $, $$, wa, art, rnd, money, toast, Q, renderBuilder, ROUTES, refCode, AL } = window.TLL;

/* ---------------- utilidades ---------------- */
async function copy(text, input) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { if (input) { input.focus(); input.select(); } toast('Mantén presionado el texto para copiarlo'); }
}
function openWa(text) { const a = document.createElement('a'); a.href = wa(text); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
const validTrip = c => /^TLL-\d{4}$/.test((c || '').trim().toUpperCase());

/* ---------------- mapa de la ruta (Lechería → islas) ---------------- */
// Coordenadas esquemáticas sobre un lienzo 800×460 (no es cartografía náutica).
const PLACES = {
  morro: [118, 330, 'El Morro · Lechería'], plata: [612, 250, 'Isla de Plata'], chimana: [430, 300, 'Chimana Grande'],
  borracha: [372, 150, 'La Borracha'], arapo: [690, 190, 'Isla de Arapo'], puinare: [360, 345, 'Puinare'],
  maritas: [520, 330, 'Las Maritas'], colorada: [740, 300, 'Playa Colorada'], mochima: [770, 240, 'Mochima']
};
const ROUTE_PLACE = { r1: 'plata', r2: 'chimana', r3: 'maritas', r4: 'arapo', r5: 'colorada', r6: 'mochima', r7: 'borracha', r8: 'puinare' };
function mapSvg(dest, withBoat = true) {
  const [tx, ty] = PLACES[dest];
  const isl = (x, y, rx, ry, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#e8dcae" stroke="#cdbb7d" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${rx * .7}" ry="${ry * .6}" transform="rotate(${rot} ${x} ${y})" fill="#7fa86a"/>`;
  return `<svg viewBox="0 0 800 460" role="img" aria-label="Mapa de la ruta desde El Morro hasta ${PLACES[dest][2]}">
  <defs><pattern id="mgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#a9d3e2" stroke-width="1"/></pattern></defs>
  <rect width="800" height="460" fill="#bfe3ef"/><rect width="800" height="460" fill="url(#mgrid)"/>
  <path d="M0 360 Q60 340 110 345 Q150 352 170 380 Q240 420 330 400 Q420 385 470 410 L470 460 L0 460Z" fill="#efe4bf" stroke="#cdbb7d" stroke-width="2"/>
  <path d="M0 375 Q60 360 105 365 Q140 372 160 395 Q240 440 330 425 Q420 410 470 430 L470 460 L0 460Z" fill="#9cc08a"/>
  <path d="M560 460 Q600 360 700 330 Q760 300 800 290 L800 460Z" fill="#9cc08a" stroke="#cdbb7d" stroke-width="2"/>
  ${isl(612, 250, 34, 20, -10)}${isl(430, 300, 40, 22, 15)}${isl(372, 150, 46, 30, -20)}${isl(690, 190, 22, 14)}${isl(360, 345, 18, 10)}${isl(520, 330, 24, 12)}${isl(250, 220, 26, 16, 10)}
  <path id="route" d="M118 330 C ${(118 + tx) / 2} ${Math.min(330, ty) - 70}, ${tx - 60} ${ty + 40}, ${tx} ${ty}" fill="none" stroke="#232843" stroke-width="3" stroke-dasharray="8 7"/>
  <circle cx="118" cy="330" r="8" fill="#232843"/><circle cx="${tx}" cy="${ty}" r="9" fill="#f6e13c" stroke="#232843" stroke-width="3"/>
  ${Object.entries(PLACES).map(([k, [x, y, n]]) => `<text x="${x}" y="${y + (k === 'morro' ? 26 : -16)}" text-anchor="middle" font-family="Figtree, sans-serif" font-size="${k === dest || k === 'morro' ? 15 : 12}" font-weight="${k === dest || k === 'morro' ? 700 : 500}" fill="#232843">${n}</text>`).join('')}
  <g font-family="JetBrains Mono, monospace" font-size="11" fill="#3b6f86"><text x="16" y="24">10°15′N</text><text x="16" y="440">64°40′O</text></g>
  <g transform="translate(750 60)"><circle r="22" fill="#fff" opacity=".7"/><path d="M0 -16 L6 0 L0 16 L-6 0Z" fill="#232843"/><text y="-26" text-anchor="middle" font-family="Figtree" font-weight="700" font-size="13" fill="#232843">N</text></g>
  ${withBoat ? '<g id="boat"><circle r="16" fill="#86cde4" opacity=".45"><animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite"/></circle><circle r="9" fill="#232843" stroke="#fff" stroke-width="3"/></g>' : ''}
  </svg>`;
}
$('#trip-map-thumb').innerHTML = mapSvg('plata', false).replace('<svg', '<svg preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"');
$('#trip-album-thumb').innerHTML = art('exterior', 195, 'album-thumb');

/* ---------------- vista: ubicación en vivo ---------------- */
let liveTimer;
function openLive(code) {
  const dlg = $('#dlg'); dlg.className = 'full';
  const r = rnd(code), route = ROUTES[Math.floor(r() * 3)], dest = ROUTE_PLACE[route.id];
  const start = Date.now() - 9 * 60e3, dur = route.min * 60e3;
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view">
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow"><span class="live-dot" aria-hidden="true"></span>&nbsp;En vivo · Reserva ${code}</span><h2 id="m-title" style="font-size:1.6rem">Rumbo a ${route.name}</h2></div>
    <span class="ex">simulación de ejemplo</span></div>
    <div class="live-grid">
      <div class="map" id="lv-map">${mapSvg(dest)}</div>
      <div class="live-side">
        <div class="specs" style="grid-template-columns:1fr 1fr"><div class="spec"><span>Llega aprox.</span><b id="lv-eta">--:--</b></div><div class="spec"><span>Velocidad</span><b id="lv-spd">-- kn</b></div><div class="spec"><span>Recorrido</span><b id="lv-pct">0%</b></div><div class="spec"><span>Actualizado</span><b id="lv-upd">ahora</b></div></div>
        <div class="field"><label>Embarcación y capitán</label><div style="font-size:.95rem"><b>Bravo 32</b> · Capitán Luis R. · 9 a bordo</div></div>
        <button class="btn btn-ghost" type="button" id="lv-share">Compartir con mi familia</button>
        <button class="sos" type="button" id="lv-sos"><i></i><span>Mantén presionado para emergencia</span></button>
        <div class="sos-panel" id="sos-panel" hidden>
          <b>Alerta de emergencia</b>
          <p style="font-size:.9rem;color:var(--muted)">Avisa a Tu Lancha con tu ubicación. Si es grave, llama también a los números de abajo.</p>
          <a class="btn btn-wa" id="sos-wa" target="_blank" rel="noopener">Enviar alerta por WhatsApp</a>
          <div style="display:grid;gap:4px;font-size:.9rem"><span>Emergencias Venezuela: <span class="num">911</span></span><span>Tu Lancha (24 h): <span class="num">+58 414 308 3864</span></span><span>Posición: <span class="num" id="sos-pos"></span></span></div>
        </div>
      </div>
    </div></div>`;
  const path = $('#route', dlg), boat = $('#boat', dlg), L = path.getTotalLength();
  const tick = () => {
    const p = Math.min(1, (Date.now() - start) / dur), pt = path.getPointAtLength(L * p);
    boat.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    const eta = new Date(start + dur);
    $('#lv-eta', dlg).textContent = p >= 1 ? 'Llegó' : eta.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    $('#lv-spd', dlg).textContent = p >= 1 ? '0 kn' : (17 + Math.round(Math.sin(Date.now() / 4000) * 3)) + ' kn';
    $('#lv-pct', dlg).textContent = Math.round(p * 100) + '%';
    const lat = (10.205 + p * .07).toFixed(4), lon = (64.69 - p * .12).toFixed(4);
    $('#sos-pos', dlg).textContent = `${lat}° N, ${lon}° O`;
    $('#sos-wa', dlg).href = wa(`🆘 EMERGENCIA · Reserva ${code}\nNecesitamos ayuda a bordo.\nPosición: ${lat}° N, ${lon}° O\nhttps://maps.google.com/?q=${lat},-${lon}`);
  };
  tick(); clearInterval(liveTimer); liveTimer = setInterval(tick, 1000);
  $('#lv-share', dlg).onclick = () => openWa(`Sigue nuestra lancha en vivo 🚤 Reserva ${code}: ${location.href.split('#')[0]}#mi-viaje (código ${code})`);
  // mantener presionado 1,5 s para evitar toques accidentales
  const sos = $('#lv-sos', dlg), bar = $('i', sos); let t0, raf;
  const reset = () => { cancelAnimationFrame(raf); bar.style.width = '0'; };
  const step = () => { const p = Math.min(1, (performance.now() - t0) / 1500); bar.style.width = p * 100 + '%'; if (p < 1) raf = requestAnimationFrame(step); else { reset(); $('#sos-panel', dlg).hidden = false; $('span', sos).textContent = 'Alerta lista: elige cómo avisar'; navigator.vibrate?.(200); } };
  sos.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); step(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => sos.addEventListener(ev, reset));
  sos.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#sos-panel', dlg).hidden = false; } });
  dlg.onclick = e => { if (e.target === dlg || e.target.closest('.m-close')) dlg.close(); };
  dlg.onchange = null;
  dlg.showModal();
}

/* ---------------- vista: álbum del día ---------------- */
function openAlbum(code) {
  const dlg = $('#dlg'); dlg.className = 'full';
  const kinds = ['drone', 'exterior', 'drone', 'interior', 'exterior', 'drone', 'camarote', 'exterior', 'drone', 'exterior', 'drone', 'exterior'];
  const items = kinds.map((k, i) => ({ k, hue: 175 + (i * 13) % 60, seed: code + i, vid: i % 5 === 2 }));
  const caption = `Un día perfecto en el mar con @tulanchalecheria 🚤☀️\n#TuLanchaLecheria #Lecheria #Mochima #Anzoategui`;
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view">
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow">Álbum privado · Reserva ${code}</span><h2 id="m-title" style="font-size:1.6rem">Isla de Plata · sábado</h2><span class="rating">${items.length} fotos y ${items.filter(x => x.vid).length} videos de dron · disponible por 30 días</span></div><span class="ex">fotos de ejemplo</span></div>
    <div class="album">${items.map((x, i) => `<button type="button" data-i="${i}" class="${x.vid ? 'vid' : ''}" aria-label="${x.vid ? 'Video' : 'Foto'} ${i + 1}">${art(x.k, x.hue, x.seed)}</button>`).join('')}</div>
    <div class="share-box"><b>Compártelo en redes</b><label for="al-cap" class="rating">Copia este texto para tu publicación o historia:</label><textarea id="al-cap" rows="3">${caption}</textarea>
      <div class="adm-tools"><button class="btn btn-sun btn-sm" type="button" id="al-copy">Copiar texto</button><a class="btn btn-ghost btn-sm" href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Abrir Instagram</a><button class="btn btn-ghost btn-sm" type="button" id="al-review">Dejar mi reseña</button></div></div>
  </div>`;
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    const b = e.target.closest('[data-i]');
    if (b) { const x = items[+b.dataset.i]; const lb = document.createElement('div'); lb.className = 'lightbox'; lb.tabIndex = -1; lb.innerHTML = art(x.k, x.hue, x.seed) + '<button class="m-close" type="button" aria-label="Cerrar foto">×</button>'; lb.onclick = () => lb.remove(); lb.onkeydown = ev => ev.key === 'Escape' && (ev.stopPropagation(), ev.preventDefault(), lb.remove()); dlg.appendChild(lb); lb.focus(); }
    if (e.target.closest('#al-copy')) copy($('#al-cap', dlg).value, $('#al-cap', dlg));
    if (e.target.closest('#al-review')) openWa(`Hola Tu Lancha 👋 Les dejo mi reseña del paseo (reserva ${code}): ⭐⭐⭐⭐⭐ `);
  };
  dlg.onchange = null;
  dlg.showModal();
}
$('#dlg').addEventListener('close', () => { clearInterval(liveTimer); $('#dlg').className = ''; if (['#viaje', '#album'].includes(location.hash)) history.replaceState(null, '', '#mi-viaje'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
$$('.trip-code').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault(); const c = $('input', f).value.trim().toUpperCase();
  if (!validTrip(c)) { toast('Escribe el código que te enviamos, por ejemplo TLL-1105'); return; }
  f.dataset.go === 'viaje' ? openLive(c) : openAlbum(c);
}));
function route() { if (location.hash === '#viaje') openLive('TLL-1105'); if (location.hash === '#album') openAlbum('TLL-1105'); }
addEventListener('hashchange', route); route();

/* ---------------- tarjetas de regalo ---------------- */
const OCC = ['Cumpleaños', 'Aniversario', 'Día de las Madres', 'Día del Padre', 'Graduación', 'Porque sí'];
const GEXP = [['A', 'Atardecer en El Morro · 2 horas', 180], ['B', 'Día de playa en lancha · hasta 10 personas', 320], ['C', 'Catamarán para celebrar · hasta 24 personas', 950], ['D', 'Yate premium · día completo', 1650], ['M', 'Monto libre', 0]];
let gOcc = 'Día de las Madres';
$('#g-occ').innerHTML = OCC.map(o => `<button type="button" class="pill" aria-pressed="${o === gOcc}">${o}</button>`).join('');
$('#g-exp').innerHTML = GEXP.map(g => `<option value="${g[0]}">${g[1]}${g[2] ? ' · ' + money(g[2]) : ''}</option>`).join('');
$('#g-exp').value = 'B';
function giftCode() {
  const t = $('#g-exp').value, r = rnd($('#g-to').value + $('#g-from').value + gOcc + t + $('#g-amt').value);
  const s = [0, 0, 0].map(() => AL[Math.floor(r() * AL.length)]).join('');
  return t === 'M' ? `TLLG-M${Math.max(50, +$('#g-amt').value || 0)}-${s}` : `TLLG-${t}${s}`;
}
function renderGift() {
  const t = $('#g-exp').value, g = GEXP.find(x => x[0] === t);
  $('#g-amt-f').hidden = t !== 'M';
  const amt = t === 'M' ? Math.max(50, +$('#g-amt').value || 0) : g[2];
  const esc = v => v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#g-card').innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><span class="occ">${esc(gOcc)}</span><span class="occ" style="color:#fff">TU LANCHA LECHERÍA</span></div>
    <div style="display:grid;gap:6px"><span class="to">Para ${esc($('#g-to').value || '…')}</span><span class="msg">${esc($('#g-msg').value)}</span></div>
    <div class="bot"><span>${t === 'M' ? 'Saldo para tu paseo' : esc(g[1])}<br>De: ${esc($('#g-from').value || '…')} · ${giftCode()}</span><span class="amt">${money(amt)}</span></div>`;
  return { amt, g };
}
$('#g-occ').addEventListener('click', e => { const b = e.target.closest('.pill'); if (!b) return; gOcc = b.textContent; $$('.pill', $('#g-occ')).forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderGift(); });
$('#gift-form').addEventListener('input', renderGift);
$('#gift-form').addEventListener('submit', e => {
  e.preventDefault(); const { amt, g } = renderGift();
  openWa(`Hola Tu Lancha 👋 Quiero comprar una tarjeta de regalo 🎁\n🎉 Ocasión: ${gOcc}\n🚤 ${g[0] === 'M' ? 'Monto libre' : g[1]}\n💵 ${money(amt)}\n👤 Para: ${$('#g-to').value}\n✍️ De: ${$('#g-from').value}\n💬 "${$('#g-msg').value}"\n🔖 Código: ${giftCode()}\n¿Cómo hago el pago?`);
  toast('Abrimos WhatsApp con tu tarjeta lista para enviar');
});
renderGift();

/* ---------------- referidos ---------------- */
$('#ref-form').addEventListener('submit', e => {
  e.preventDefault(); const n = $('#ref-name').value.trim();
  if (n.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 2) { toast('Escribe tu nombre para crear el código'); $('#ref-name').focus(); return; }
  const c = refCode(n); $('#ref-code').textContent = c; $('#ref-out').hidden = false;
  $('#ref-share').href = wa(`¡Vamos a la playa! 🚤 Reserva con Tu Lancha Lechería usando mi código ${c} y ambos recibimos un beneficio en la salida. ${location.href.split('#')[0]}#reservar`).replace(`wa.me/${'584143083864'}`, 'wa.me/');
  try { window.TLL.store.set('myref', c); } catch {}
});
$('#ref-copy').onclick = () => copy($('#ref-code').textContent);
})();
