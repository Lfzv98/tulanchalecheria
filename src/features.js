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
const ROUTE_PLACE = { r1: 'chimana', r2: 'plata', r3: 'arapo', r4: 'mochima' };
// Carta náutica nocturna (esquemática, no apta para navegación): costas irregulares, bajos turquesa,
// isobatas, sondas, cuadrícula dorada, rosa de los vientos y ruta luminosa.
let mapN = 0;
function mapSvg(dest, withBoat = true) {
  const [tx, ty] = PLACES[dest], u = 'm' + (++mapN);
  const R = rnd('carta-mochima');
  // contorno irregular suavizado (Catmull-Rom → Bézier)
  const blob = (x, y, rx, ry, rot, seed, k = 1, n = 26) => {
    const r = rnd(seed), a0 = rot * Math.PI / 180, noise = Array.from({ length: n }, () => .82 + r() * .32);
    const pts = noise.map((m, i) => { const t = i / n * Math.PI * 2, px = Math.cos(t) * rx * m * k, py = Math.sin(t) * ry * m * k; return [x + px * Math.cos(a0) - py * Math.sin(a0), y + px * Math.sin(a0) + py * Math.cos(a0)]; });
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
    return d + 'Z';
  };
  const ISL = [[612, 250, 34, 20, -10, 'plata'], [430, 300, 40, 22, 15, 'chimana'], [372, 150, 46, 30, -20, 'borracha'], [690, 190, 22, 14, 0, 'arapo'], [360, 345, 18, 10, 0, 'puinare'], [520, 330, 24, 12, 0, 'maritas'], [250, 220, 26, 16, 10, 'otra']];
  const island = ([x, y, rx, ry, rot, s]) => `
    <path d="${blob(x, y, rx, ry, rot, s, 2.5)}" fill="none" stroke="rgba(126,206,232,.10)" stroke-width="1"/>
    <path d="${blob(x, y, rx, ry, rot, s, 1.9)}" fill="none" stroke="rgba(126,206,232,.16)" stroke-width="1" stroke-dasharray="2 4"/>
    <path d="${blob(x, y, rx, ry, rot, s, 1.45)}" fill="url(#${u}sh)" filter="url(#${u}soft)"/>
    <path d="${blob(x, y, rx, ry, rot, s, 1.08)}" fill="#cdb98a" opacity=".9"/>
    <path d="${blob(x, y, rx, ry, rot, s, .96)}" fill="url(#${u}land)"/>
    <path d="${blob(x - rx * .12, y - ry * .18, rx * .5, ry * .45, rot, s + 'h', 1)}" fill="rgba(255,255,255,.07)"/>`;
  // costa continental con ruido
  const coast = (pts, close) => { const r = rnd(close); return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + (r() - .5) * 6).toFixed(1)} ${(y + (r() - .5) * 6).toFixed(1)}`).join('') + close; };
  const west = [[0, 352], [30, 346], [60, 340], [90, 342], [112, 346], [138, 356], [160, 372], [190, 392], [230, 402], [270, 404], [310, 398], [350, 392], [390, 394], [430, 402], [470, 412], [500, 460], [0, 460]];
  const east = [[560, 460], [575, 420], [600, 382], [640, 356], [680, 338], [720, 322], [760, 304], [800, 292], [800, 460]];
  const soundings = Array.from({ length: 26 }, () => { const x = 30 + R() * 740, y = 30 + R() * 300; return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}">${Math.round(8 + R() * 60)}</text>`; }).join('');
  const label = (k, [x, y, n]) => { const on = k === dest || k === 'morro'; return `<text x="${x}" y="${y + (k === 'morro' ? 30 : -18)}" text-anchor="middle" class="${on ? 'on' : ''}">${n.toUpperCase()}</text>`; };
  return `<svg viewBox="0 0 800 460" role="img" aria-label="Carta de la ruta desde El Morro hasta ${PLACES[dest][2]}" class="nchart">
  <defs>
    <radialGradient id="${u}sea" cx="55%" cy="40%" r="75%"><stop offset="0" stop-color="#0f3550"/><stop offset=".55" stop-color="#0a2539"/><stop offset="1" stop-color="#05121f"/></radialGradient>
    <radialGradient id="${u}sh"><stop offset=".55" stop-color="rgba(60,214,214,.55)"/><stop offset="1" stop-color="rgba(40,170,200,0)"/></radialGradient>
    <radialGradient id="${u}land" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#5d7f4f"/><stop offset=".6" stop-color="#3a5a3b"/><stop offset="1" stop-color="#26402c"/></radialGradient>
    <linearGradient id="${u}main" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c6d45"/><stop offset="1" stop-color="#22382a"/></linearGradient>
    <linearGradient id="${u}rt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3d58a"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
    <filter id="${u}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="${u}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="${u}grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="rgba(214,182,110,.13)" stroke-width="1"/><path d="M40 0V80M0 40H80" fill="none" stroke="rgba(214,182,110,.05)" stroke-width="1"/></pattern>
    <radialGradient id="${u}vig" cx="50%" cy="50%" r="70%"><stop offset=".6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,6,14,.55)"/></radialGradient>
  </defs>
  <rect width="800" height="460" fill="url(#${u}sea)"/>
  <rect width="800" height="460" fill="url(#${u}grid)"/>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="rgba(170,215,235,.28)">${soundings}</g>
  <path d="${coast(west.map(([x, y]) => [x, y - 22]), 'Z')}" fill="none" stroke="rgba(126,206,232,.12)" stroke-dasharray="2 4"/>
  <path d="${coast(west.map(([x, y]) => [x, y - 9]), 'Z')}" fill="rgba(60,214,214,.16)" filter="url(#${u}soft)"/>
  <path d="${coast(west, 'Z')}" fill="#cdb98a" opacity=".85"/><path d="${coast(west.map(([x, y]) => [x, y + 7]), 'Z')}" fill="url(#${u}main)"/>
  <path d="${coast(east.map(([x, y]) => [x - 8, y - 14]), 'Z')}" fill="rgba(60,214,214,.16)" filter="url(#${u}soft)"/>
  <path d="${coast(east, 'Z')}" fill="#cdb98a" opacity=".85"/><path d="${coast(east.map(([x, y]) => [x + 6, y + 7]), 'Z')}" fill="url(#${u}main)"/>
  ${ISL.map(island).join('')}
  <path d="M118 330 C ${(118 + tx) / 2} ${Math.min(330, ty) - 70}, ${tx - 60} ${ty + 40}, ${tx} ${ty}" fill="none" stroke="rgba(243,213,138,.25)" stroke-width="9" stroke-linecap="round"/>
  <path id="route" d="M118 330 C ${(118 + tx) / 2} ${Math.min(330, ty) - 70}, ${tx - 60} ${ty + 40}, ${tx} ${ty}" fill="none" stroke="url(#${u}rt)" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round" filter="url(#${u}glow)"/>
  <g transform="translate(118 330)"><circle r="11" fill="none" stroke="rgba(255,255,255,.5)"/><circle r="5" fill="#fff"/></g>
  <g transform="translate(${tx} ${ty})"><circle r="8" fill="none" stroke="#f3d58a" stroke-width="1.5"><animate attributeName="r" values="8;22" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="2.4s" repeatCount="indefinite"/></circle><path d="M0 -9L9 0L0 9L-9 0Z" fill="#f3d58a" stroke="#1b1405" stroke-width="1.5"/></g>
  <g font-family="Figtree, sans-serif" font-size="10.5" font-weight="600" letter-spacing="1.6" fill="rgba(235,242,248,.72)" class="nlab">${Object.entries(PLACES).map(([k, p]) => label(k, p)).join('')}</g>
  <g font-family="JetBrains Mono, monospace" font-size="10" fill="rgba(214,182,110,.75)" letter-spacing="1"><text x="14" y="22">10°15′N</text><text x="14" y="102">10°12′N</text><text x="88" y="448">64°40′O</text><text x="408" y="448">64°32′O</text></g>
  <g transform="translate(742 62)" fill="none" stroke="rgba(214,182,110,.8)">
    <circle r="30" stroke-width="1"/><circle r="24" stroke-width=".6" stroke-dasharray="1.5 3"/>
    <path d="M0 -28L5 0L0 28L-5 0Z" fill="rgba(214,182,110,.18)"/><path d="M0 -28L5 0H-5Z" fill="#d6b66e" stroke="none"/><path d="M-28 0L0 4L28 0L0 -4Z" fill="rgba(214,182,110,.12)"/>
    <text y="-36" text-anchor="middle" font-family="Figtree" font-weight="700" font-size="11" fill="#d6b66e" stroke="none">N</text>
  </g>
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="rgba(214,182,110,.6)" letter-spacing="1"><line x1="610" y1="436" x2="690" y2="436" stroke="rgba(214,182,110,.6)"/><line x1="610" y1="432" x2="610" y2="440" stroke="rgba(214,182,110,.6)"/><line x1="690" y1="432" x2="690" y2="440" stroke="rgba(214,182,110,.6)"/><text x="650" y="428" text-anchor="middle">2 MN</text></g>
  <rect width="800" height="460" fill="url(#${u}vig)" pointer-events="none"/>
  ${withBoat ? `<g id="boat"><circle r="10" fill="none" stroke="#7fe3f0" stroke-width="1.5"><animate attributeName="r" values="10;26" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"/></circle><circle r="13" fill="rgba(127,227,240,.18)"/><g class="hdg"><path d="M0 -11L7 8L0 4L-7 8Z" fill="#fff" stroke="#0b2236" stroke-width="1.5" stroke-linejoin="round"/></g></g>` : ''}
  </svg>`;
}
$('#trip-map-thumb').innerHTML = mapSvg('plata', false).replace('<svg', '<svg preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"');
$('#trip-album-thumb').innerHTML = '<img src="media/hero-mochima-land.webp" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:55% 55%">';

/* ---------------- vista: ubicación en vivo ---------------- */
let liveTimer;
function openLive(code) {
  const dlg = $('#dlg'); dlg.className = 'full';
  const r = rnd(code), route = ROUTES[Math.floor(r() * 3)], dest = ROUTE_PLACE[route.id];
  const start = Date.now() - 9 * 60e3, dur = route.min * 60e3;
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view">
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow"><span class="live-dot" aria-hidden="true"></span>&nbsp;En vivo · Reserva ${code}</span><h2 id="m-title" style="font-size:1.6rem">Rumbo a ${route.beaches[0]}</h2></div>
    <span class="ex">simulación de ejemplo</span></div>
    <div class="live-grid">
      <div class="map" id="lv-map">${mapSvg(dest)}</div>
      <div class="live-side">
        <div class="specs" style="grid-template-columns:1fr 1fr"><div class="spec"><span>Llega aprox.</span><b id="lv-eta">--:--</b></div><div class="spec"><span>Velocidad</span><b id="lv-spd">-- kn</b></div><div class="spec"><span>Recorrido</span><b id="lv-pct">0%</b></div><div class="spec"><span>Actualizado</span><b id="lv-upd">ahora</b></div></div>
        <div class="field"><label>Embarcación y capitán</label><div style="font-size:.95rem"><b>Bravo 32</b> · Capitán Luis R. · 9 a bordo</div></div>
        <button class="btn btn-ghost" type="button" id="lv-share">Compartir mi ubicación real</button>
        ${sosBlock()}
      </div>
    </div></div>`;
  const path = $('#route', dlg), boat = $('#boat', dlg), L = path.getTotalLength();
  const tick = () => {
    const p = Math.min(1, (Date.now() - start) / dur), pt = path.getPointAtLength(L * p);
    const ah = path.getPointAtLength(Math.min(L, L * p + 3)), bh = path.getPointAtLength(Math.max(0, L * p - 3));
    boat.setAttribute('transform', `translate(${pt.x} ${pt.y})`); $('.hdg', boat).setAttribute('transform', `rotate(${(Math.atan2(ah.y - bh.y, ah.x - bh.x) * 180 / Math.PI + 90).toFixed(1)})`);
    const eta = new Date(start + dur);
    $('#lv-eta', dlg).textContent = p >= 1 ? 'Llegó' : eta.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    $('#lv-spd', dlg).textContent = p >= 1 ? '0 kn' : (17 + Math.round(Math.sin(Date.now() / 4000) * 3)) + ' kn';
    $('#lv-pct', dlg).textContent = Math.round(p * 100) + '%';
  };
  tick(); clearInterval(liveTimer); liveTimer = setInterval(tick, 1000);
  $('#lv-share', dlg).onclick = () => { if (LS.s) { lsShareLink(); return; } dlg.close(); openAbordo(code); setTimeout(() => { const b = $('#dlg [data-lshare]'); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('flash'); } }, 250); toast('Toca "Compartir en vivo": usa el GPS de tu teléfono y lo envías a quien quieras'); };
  sosCtl?.abort(); sosCtl = new AbortController();
  wireSos($('[data-abordo]', dlg), { code, boat: 'Bravo 32' }, sosCtl.signal);
  dlg.onclick = e => { if (e.target.closest('.m-close')) dlg.close(); };
  dlg.onchange = null;
  dlg.showModal();
}


/* ---------------- a bordo: GPS real del teléfono + botón SOS ----------------
   - El GPS se enciende solo cuando el usuario toca (iOS exige un gesto para pedir el permiso).
   - La última posición se guarda en el teléfono para usarla en zonas sin cobertura (Mochima).
   - El SOS se activa manteniendo presionado 3 s; se cancela al soltar, al salir del botón o si el sistema cancela el toque.
   - Con datos: WhatsApp a cualquier contacto. Sin datos: SMS (usa la red celular, no internet) y copiar el mensaje. */
const SOS_HOLD = 3000;
const SOS_TEL = { casa: '+584143083864', emergencias: '911' };
// Autoridades de la zona norte de Anzoátegui (Lechería, Puerto La Cruz, Guanta y Mochima), datos enviados por Luis
const SOS_AUTH = [
  ['Guardacostas Guanta', 'Búsqueda y salvamento', ['+582814180257', '+582812683844', '+582812682188']],
  ['Capitanía de Puerto La Cruz', 'Tráfico acuático y zarpes', ['+582812677452', '+582812677932']]
];
const telTxt = n => n.replace(/^\+58(\d{3})(\d{7})$/, '0$1-$2');
const GPS = { watch: null, pos: null, live: false, msg: 'GPS apagado', subs: new Set() };
try { GPS.pos = JSON.parse(localStorage.getItem('tll:lastpos') || 'null'); } catch { GPS.pos = null; }
const gpsNotify = () => GPS.subs.forEach(f => f());
function gpsStart() {
  if (GPS.watch !== null) return;
  if (!('geolocation' in navigator)) { GPS.msg = 'Este teléfono no tiene GPS disponible para la app'; gpsNotify(); return; }
  GPS.msg = 'Buscando satélites…'; gpsNotify();
  GPS.watch = navigator.geolocation.watchPosition(p => {
    const { latitude: lat, longitude: lng, accuracy: acc, speed, heading } = p.coords;
    GPS.pos = { lat, lng, acc, t: p.timestamp || Date.now() }; GPS.live = true;
    if (typeof speed === 'number' && speed >= 0) GPS.pos.spd = speed;
    if (typeof heading === 'number' && !Number.isNaN(heading)) GPS.pos.hdg = heading;
    GPS.msg = `GPS activo · precisión ${Math.round(acc)} m`;
    try { localStorage.setItem('tll:lastpos', JSON.stringify(GPS.pos)); } catch {}
    gpsNotify();
  }, err => {
    GPS.live = false;
    if (err.code === 1) { GPS.msg = 'Permiso de ubicación negado. Actívalo en Ajustes › Privacidad › Ubicación'; if (GPS.watch !== null) navigator.geolocation.clearWatch(GPS.watch); GPS.watch = null; }
    else GPS.msg = GPS.pos ? 'Señal GPS débil · usamos tu última posición' : 'Señal GPS débil · sigue buscando';
    gpsNotify();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
function gpsStop() { if (GPS.watch !== null) navigator.geolocation.clearWatch(GPS.watch); GPS.watch = null; GPS.live = false; if (GPS.pos) GPS.msg = 'GPS en pausa'; }
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'hace segundos' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`; };
const fmtPos = p => `${Math.abs(p.lat).toFixed(5)}° ${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lng).toFixed(5)}° ${p.lng >= 0 ? 'E' : 'O'}`;
function sosText(ctx) {
  const p = GPS.pos, who = (localStorage.getItem('tll:sosname') || '').trim();
  return ['🆘 SOS · EMERGENCIA EN EL MAR', ctx.code ? `Reserva: ${ctx.code}` : '', ctx.boat ? `Embarcación: ${ctx.boat}` : '', who ? `Quien avisa: ${who}` : '',
    p ? `📍 ${fmtPos(p)} (±${Math.round(p.acc)} m)` : '📍 Ubicación no disponible: activa el GPS',
    p ? `🗺️ https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : '',
    p ? `🕒 Posición ${GPS.live ? 'en vivo' : 'guardada ' + ago(p.t)} · ${new Date(p.t).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}` : `🕒 ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`,
    'Necesitamos ayuda.'].filter(Boolean).join('\n');
}
const smsHref = (num, text) => `sms:${num}?&body=${encodeURIComponent(text)}`;
function sosBlock() {
  return `<div class="abordo" data-abordo>
    <div class="ab-top"><span class="net" data-net></span></div>
    <button class="sos" type="button" data-sos aria-describedby="sos-help"><i></i><span data-sos-l>SOS · mantén presionado 3 segundos</span></button>
    <p class="rating" id="sos-help">Suelta antes de 3 segundos para cancelar. Funciona también sin datos: te damos SMS y el mensaje para copiar.</p>
    <div class="ab-pos"><span class="ab-gps" data-gps role="status" aria-live="polite"></span><b class="mono" data-coords>Sin posición todavía</b><small data-age></small></div>
    <button class="btn btn-ghost btn-sm" type="button" data-gps-on>Activar mi GPS</button>
    <label class="ab-name"><span>Tu nombre (va en la alerta)</span><input data-sos-name autocomplete="name" placeholder="Opcional"></label>
    <label class="ab-name"><span>Contacto de emergencia (a quien quieras llamar)</span><input data-sos-contact type="tel" inputmode="tel" autocomplete="tel" placeholder="Opcional · ej. 0414 123 4567"></label>
    <div class="sos-panel" data-sos-panel hidden role="alertdialog" aria-label="Alerta SOS lista">
      <b class="sos-t">🆘 Alerta SOS lista</b>
      <p class="rating" data-sos-note></p>
      <pre class="sos-msg" data-sos-msg></pre>
      <div class="sos-acts">
        <a class="btn btn-wa" data-sos-wa target="_blank" rel="noopener">Enviar por WhatsApp</a>
        <a class="btn btn-sun" data-sos-sms>Enviar SMS (sin datos)</a>
        <button class="btn btn-ghost" type="button" data-sos-copy>Copiar mensaje</button>
        <div class="sos-calls"><a class="btn btn-sos btn-sm" href="tel:${SOS_TEL.emergencias}">Llamar al 911</a><a class="btn btn-ghost btn-sm" data-sos-call href="tel:">Llamar</a></div>
        <div class="sos-dial" data-call-box hidden><label><span>¿A quién llamas? Escribe el número</span><input data-call-num type="tel" inputmode="tel" autocomplete="tel" placeholder="Ej. 0414 123 4567"></label><a class="btn btn-sos" data-call-go href="tel:">Llamar</a></div>
        <div class="sos-auth">${SOS_AUTH.map(([n, d, t]) => `<div class="sa"><a class="btn btn-sos btn-sm" href="tel:${t[0]}">Llamar a ${n}</a><span>${d} · otros: ${t.slice(1).map(x => `<a href="tel:${x}">${telTxt(x)}</a>`).join(' · ')}</span></div>`).join('')}</div>
      </div>
      <div class="sos-ack" data-sos-ack hidden role="status" aria-live="assertive"></div>
      <p class="rating">Capitán: socorro por radio VHF, canal 16 (156.8 MHz), escuchado por Guardacostas y Capitanía.</p>
      <button class="btn btn-ghost btn-sm" type="button" data-sos-x>Cerrar alerta</button>
    </div>
  </div>`;
}
function wireSos(root, ctx, signal) {
  const q = s => root.querySelector(s), btn = q('[data-sos]'), bar = q('[data-sos] i'), lbl = q('[data-sos-l]'), panel = q('[data-sos-panel]'), name = q('[data-sos-name]');
  name.value = localStorage.getItem('tll:sosname') || '';
  name.addEventListener('input', () => { try { localStorage.setItem('tll:sosname', name.value); } catch {} }, { signal });
  // llamar a cualquier persona: el contacto guardado, o el marcador del teléfono vacío para escribir el número
  const ct = q('[data-sos-contact]'), call = q('[data-sos-call]');
  const telOf = v => { const d = String(v || '').replace(/[^\d+]/g, ''); if (!d) return ''; if (d.startsWith('+')) return d; if (d.startsWith('00')) return '+' + d.slice(2); if (/^0\d{10}$/.test(d)) return '+58' + d.slice(1); return d; };
  const syncCall = () => { const t = telOf(ct.value); call.href = 'tel:' + t; call.textContent = 'Llamar'; if (!panel.hidden) fill(); };
  // "Llamar": con contacto de emergencia guardado, marca directo. Si no, en Android abre la agenda (Contact Picker)
  // y en iPhone (que no deja abrir el marcador vacío desde la web) muestra un campo para escribir el número.
  const box = q('[data-call-box]'), num = q('[data-call-num]'), go = q('[data-call-go]');
  const dialTo = v => { const t = telOf(v); go.href = 'tel:' + t; go.classList.toggle('off', !t); return t; };
  num.addEventListener('input', () => dialTo(num.value), { signal });
  go.addEventListener('click', e => { if (!dialTo(num.value)) { e.preventDefault(); num.focus(); toast('Escribe el número al que quieres llamar'); } }, { signal });
  call.addEventListener('click', async e => {
    if (telOf(ct.value)) return;
    e.preventDefault();
    if ('contacts' in navigator && navigator.contacts.select) {
      try { const [c] = await navigator.contacts.select(['tel', 'name'], { multiple: false }); const t = c && c.tel && telOf(c.tel[0]); if (t) { location.href = 'tel:' + t; return; } } catch {}
    }
    box.hidden = false; dialTo(num.value); num.focus();
  }, { signal });
  ct.value = localStorage.getItem('tll:sosc') || ''; syncCall();
  ct.addEventListener('input', () => { try { localStorage.setItem('tll:sosc', ct.value); } catch {} syncCall(); }, { signal });
  const paint = () => {
    const on = navigator.onLine;
    q('[data-net]').className = 'net ' + (on ? 'on' : 'off'); q('[data-net]').textContent = on ? 'Con datos' : 'Sin datos';
    q('[data-gps]').textContent = GPS.msg;
    q('[data-coords]').textContent = GPS.pos ? fmtPos(GPS.pos) : 'Sin posición todavía';
    q('[data-age]').textContent = GPS.pos ? `±${Math.round(GPS.pos.acc)} m · ${GPS.live ? 'en vivo' : 'guardada ' + ago(GPS.pos.t)}` : '';
    const g = q('[data-gps-on]'); g.disabled = GPS.watch !== null; g.textContent = GPS.watch !== null ? 'GPS encendido' : 'Activar mi GPS'; // sin ocultarlo: nada se mueve bajo el dedo
    root.classList.toggle('offline', !on);
    if (!panel.hidden) fill();
  };
  const fill = () => {
    const t = sosText(ctx), on = navigator.onLine;
    q('[data-sos-msg]').textContent = t;
    // a cualquier contacto: el de emergencia guardado, o el que elijas en WhatsApp o Mensajes
    const to = telOf(ct.value);
    q('[data-sos-wa]').href = `https://wa.me/${to.replace(/\D/g, '')}?text=${encodeURIComponent(t)}`; q('[data-sos-sms]').href = smsHref(to, t);
    q('[data-sos-note]').textContent = on ? 'Envíala por WhatsApp a quien elijas. Si es grave, llama también a Guardacostas o al 911.' : 'Estás sin datos: envía el SMS (usa la señal celular) o copia el mensaje. Si es grave, llama a Guardacostas o al 911.';
  };
  GPS.subs.add(paint); signal.addEventListener('abort', () => GPS.subs.delete(paint));
  addEventListener('online', paint, { signal }); addEventListener('offline', paint, { signal });
  q('[data-gps-on]').addEventListener('click', gpsStart, { signal });
  let t0 = 0, raf = 0, holding = false;
  const reset = () => { holding = false; cancelAnimationFrame(raf); bar.style.width = '0'; btn.classList.remove('holding'); if (panel.hidden) lbl.textContent = 'SOS · mantén presionado 3 segundos'; };
  const fire = () => {
    reset(); fill(); panel.hidden = false; lbl.textContent = 'Alerta lista · elige cómo avisar';
    navigator.vibrate?.([500, 250, 500, 250, 500]);
    if (!navigator.onLine) navigator.clipboard?.writeText(sosText(ctx)).then(() => toast('Mensaje copiado'), () => {});
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    q(navigator.onLine ? '[data-sos-wa]' : '[data-sos-sms]').focus({ preventScroll: true });
  };
  const step = () => {
    if (!holding) return;
    const p = Math.min(1, (performance.now() - t0) / SOS_HOLD);
    bar.style.width = p * 100 + '%'; lbl.textContent = `Suelta para cancelar · ${Math.ceil((1 - p) * SOS_HOLD / 1000)} s`;
    if (p < 1) raf = requestAnimationFrame(step); else fire();
  };
  const start = () => { if (holding) return; holding = true; gpsStart(); t0 = performance.now(); btn.classList.add('holding'); navigator.vibrate?.(30); step(); };
  btn.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); start(); }, { signal });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, () => { if (holding) reset(); }, { signal }));
  btn.addEventListener('contextmenu', e => e.preventDefault(), { signal });
  btn.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } }, { signal });
  btn.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') reset(); }, { signal });
  q('[data-sos-copy]').addEventListener('click', () => copy(sosText(ctx)), { signal });
  // Confirmación de envío: el SMS o WhatsApp se abren con el texto listo, pero el usuario debe tocar ENVIAR.
  const ack = q('[data-sos-ack]'); let pending = null, askT = 0;
  const hhmm = () => new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  const app = k => k === 'sms' ? 'Mensajes' : 'WhatsApp';
  const showGo = k => { ack.hidden = false; ack.className = 'sos-ack go'; ack.innerHTML = `<b class="ack-big">Toca ENVIAR en ${app(k)} <span aria-hidden="true">↗</span></b><span>Tu alerta ya está escrita${k === 'sms' ? ' con el número de Tu Lancha' : ''}. Solo falta tocar el botón de enviar (la flecha) para que salga.</span>`; ack.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const showAsk = k => { ack.hidden = false; ack.className = 'sos-ack ask'; ack.innerHTML = `<b>¿Se envió tu alerta por ${k === 'sms' ? 'SMS' : 'WhatsApp'}?</b><div class="ack-row"><button class="btn btn-sun btn-sm" type="button" data-ack-yes>Sí, se envió</button><button class="btn btn-sos btn-sm" type="button" data-ack-no>No, intentar de nuevo</button></div><span>Si no sale, copia el mensaje o llama a Guardacostas.</span>`; ack.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const launch = (k, el) => { pending = k; showGo(k); clearTimeout(askT); askT = setTimeout(() => { if (pending && document.visibilityState === 'visible') showAsk(pending); }, 6000); };
  q('[data-sos-sms]').addEventListener('click', e => launch('sms', e.currentTarget), { signal });
  q('[data-sos-wa]').addEventListener('click', e => launch('wa', e.currentTarget), { signal });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && pending) { clearTimeout(askT); showAsk(pending); } }, { signal });
  ack.addEventListener('click', e => {
    if (e.target.closest('[data-ack-yes]')) { const k = pending; pending = null; ack.className = 'sos-ack ok'; ack.innerHTML = `<b>✓ Alerta enviada por ${k === 'sms' ? 'SMS' : 'WhatsApp'} a las ${hhmm()}</b><span>Mantén el teléfono contigo. Si en 5 minutos no te responden, llama a Guardacostas o al 911.</span>`; navigator.vibrate?.(80); }
    if (e.target.closest('[data-ack-no]')) { const k = pending || 'sms'; const a = q(k === 'sms' ? '[data-sos-sms]' : '[data-sos-wa]'); a.click(); }
  }, { signal });
  q('[data-sos-x]').addEventListener('click', () => { panel.hidden = true; ack.hidden = true; pending = null; clearTimeout(askT); reset(); }, { signal });
  paint();
}
let wakeLock = null;
async function keepAwake(on) { try { if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch {} }
let sosCtl = null;
function openAbordo(code) {
  const dlg = $('#dlg'); dlg.className = 'full abordo-dlg';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view">
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow">Modo a bordo${code ? ' · Reserva ' + code : ''}</span><h2 id="m-title" style="font-size:1.6rem">Tu GPS y botón SOS</h2></div></div>
    ${sosBlock()}
    ${lsBlock()}
    <p class="rating ab-tip">Deja esta pantalla abierta durante el paseo: guardamos tu última posición por si se pierde la señal en Mochima.</p></div>`;
  sosCtl?.abort(); sosCtl = new AbortController();
  wireSos($('[data-abordo]', dlg), { code }, sosCtl.signal);
  wireShare($('[data-lshare]', dlg), { code }, sosCtl.signal);
  // solo se cierra con la X: un toque fuera durante una emergencia no debe cerrar la pantalla
  dlg.onclick = e => { if (e.target.closest('.m-close')) dlg.close(); };
  dlg.showModal(); gpsStart(); keepAwake(true);
}
$('#dlg').addEventListener('close', () => { followCtl?.abort(); followCtl = null; if (sosCtl) { sosCtl.abort(); sosCtl = null; if (!LS.s) { gpsStop(); keepAwake(false); } } });
/* ---------------- seguimiento en vivo REAL ----------------
   El teléfono a bordo publica su GPS en /api/live; quien abre el enlace #sigue/<id> ve la lancha moverse.
   - El enlace usa un id aleatorio por viaje (no el código de reserva) y una clave que solo tiene ese teléfono.
   - Sin datos, las posiciones se guardan en el teléfono y se envían todas al volver la señal (se dibuja el tramo).
   - Al reconectar (evento online, volver a la app o reintentos), se envía al instante y el mapa salta a la posición actual. */
const LIVE_API = 'api/live';
const LS = { s: null, q: [], busy: false, state: 'off', sentAt: 0, backoff: 4000, retry: null, subs: new Set(), lastQ: null };
try { const s = JSON.parse(localStorage.getItem('tll:share') || 'null'); if (s && Date.now() - s.started < 24 * 3600e3) LS.s = s; LS.q = LS.s ? JSON.parse(localStorage.getItem('tll:shareq') || '[]') : []; } catch { LS.s = null; LS.q = []; }
const lsNotify = () => LS.subs.forEach(f => f());
const lsSave = () => { try { if (LS.s) { localStorage.setItem('tll:share', JSON.stringify(LS.s)); localStorage.setItem('tll:shareq', JSON.stringify(LS.q.slice(-3000))); } else { localStorage.removeItem('tll:share'); localStorage.removeItem('tll:shareq'); } } catch {} };
const rid = n => { const A = 'abcdefghijkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => A[x % 32]).join(''); };
const rkey = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const followUrl = id => `${location.origin}${location.pathname}#sigue/${id}`;
const distM = (a, b) => { const R = 6371e3, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lng - a.lng) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
// cada nueva posición del GPS entra a la cola (como mucho una cada 4 s, o antes si se movió 25 m)
GPS.subs.add(() => {
  if (!LS.s || !GPS.live || !GPS.pos) return;
  const p = GPS.pos, l = LS.lastQ;
  if (l && (p.t - l.t < 4000 && distM(l, p) < 25 || p.t <= l.t)) return;
  const pt = { t: p.t, lat: p.lat, lng: p.lng, acc: p.acc }; if (typeof p.spd === 'number') pt.spd = p.spd; if (typeof p.hdg === 'number' && !Number.isNaN(p.hdg)) pt.hdg = p.hdg;
  LS.lastQ = pt; LS.q.push(pt); if (LS.q.length > 3000) LS.q.splice(0, LS.q.length - 3000); lsSave(); lsFlush();
});
async function lsFlush() {
  if (!LS.s || LS.busy) return;
  clearTimeout(LS.retry); LS.retry = null;
  if (!navigator.onLine) { LS.state = 'offline'; lsNotify(); return; }
  if (!LS.q.length && LS.sentAt) { if (LS.state !== 'ok') { LS.state = 'ok'; lsNotify(); } return; }
  LS.busy = true; const batch = LS.q.slice(0, 400);
  try {
    const r = await fetch(LIVE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: LS.s.id, key: LS.s.key, boat: LS.s.boat || '', pts: batch }), cache: 'no-store' });
    if (r.status === 503) { LS.state = 'nocfg'; return; }
    if (r.status === 403 || r.status === 400) { LS.state = 'error'; return; }
    if (!r.ok) throw new Error(r.status);
    LS.q.splice(0, batch.length); lsSave(); LS.sentAt = Date.now(); LS.state = 'ok'; LS.backoff = 4000;
  } catch { LS.state = navigator.onLine ? 'retry' : 'offline'; LS.retry = setTimeout(lsFlush, LS.backoff); LS.backoff = Math.min(LS.backoff * 2, 60000); }
  finally { LS.busy = false; lsNotify(); }
  if (LS.state === 'ok' && LS.q.length) lsFlush();
}
// reanudar solo: al volver la señal, al volver a la app y cada 15 s por si acaso
addEventListener('online', () => { LS.backoff = 4000; lsFlush(); });
addEventListener('offline', () => { if (LS.s) { LS.state = 'offline'; lsNotify(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && LS.s) { gpsStart(); keepAwake(true); lsFlush(); } });
setInterval(() => { if (LS.s && (LS.q.length || LS.state !== 'ok')) lsFlush(); }, 15000);
async function lsShareLink() {
  if (!LS.s) return;
  const url = followUrl(LS.s.id), text = `Sigue nuestra lancha en vivo 🚤${LS.s.boat ? ' (' + LS.s.boat + ')' : ''}. Toca el enlace y verás dónde vamos en el mapa, en tiempo real:`;
  if (navigator.share) { try { await navigator.share({ title: 'Tu Lancha en vivo', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
}
function lsStart(ctx) {
  if (!LS.s) { LS.s = { id: rid(20), key: rkey(), boat: ctx.boat || '', code: ctx.code || '', started: Date.now() }; LS.q = []; LS.lastQ = null; LS.sentAt = 0; LS.state = 'wait'; }
  gpsStart(); keepAwake(true);
  if (GPS.live && GPS.pos) { const p = GPS.pos; LS.lastQ = { t: p.t, lat: p.lat, lng: p.lng, acc: p.acc }; LS.q.push(LS.lastQ); }
  lsSave(); lsNotify(); lsFlush(); return lsShareLink();
}
function lsStop() {
  if (!LS.s) return;
  const s = LS.s; LS.s = null; LS.q = []; LS.state = 'off'; LS.sentAt = 0; clearTimeout(LS.retry); lsSave(); lsNotify();
  try { fetch(LIVE_API, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, key: s.key }), keepalive: true }).catch(() => {}); } catch {}
  if (!$('#dlg').open || !sosCtl) { gpsStop(); keepAwake(false); }
  toast('Dejaste de compartir tu ubicación');
}
if (LS.s) { LS.state = 'wait'; gpsStart(); setTimeout(lsFlush, 500); }

const lsBlock = () => `<section class="lshare" data-lshare aria-labelledby="ls-t">
  <div class="ls-h"><span class="live-dot" aria-hidden="true"></span><b id="ls-t">Compartir mi ubicación en vivo</b></div>
  <p class="rating">Quien abra el enlace ve la lancha moverse en el mapa en tiempo real. Lo envías a quien quieras: familia, amigos o Tu Lancha.</p>
  <div class="ls-st" data-ls-st role="status" aria-live="polite"></div>
  <button class="btn btn-wa" type="button" data-ls-start>Compartir en vivo</button>
  <div class="ls-on" data-ls-on hidden>
    <button class="btn btn-wa" type="button" data-ls-send>Enviar el enlace a alguien</button>
    <div class="ls-row"><button class="btn btn-ghost btn-sm" type="button" data-ls-copy>Copiar enlace</button><button class="btn btn-ghost btn-sm" type="button" data-ls-stop>Dejar de compartir</button></div>
  </div>
  <p class="rating ls-fine">Deja esta pantalla abierta y el teléfono desbloqueado: en iPhone el navegador pausa el GPS si bloqueas la pantalla o cambias de app. Si no hay datos, guardamos el recorrido y lo enviamos solo cuando vuelva la señal.</p>
</section>`;
function wireShare(root, ctx, signal) {
  const q = s => root.querySelector(s), st = q('[data-ls-st]');
  const render = () => {
    if (!root.isConnected) return;
    const on = !!LS.s; q('[data-ls-start]').hidden = on; q('[data-ls-on]').hidden = !on;
    const n = LS.q.length, since = LS.sentAt ? Math.round((Date.now() - LS.sentAt) / 1000) : null;
    const [cls, txt] = !on ? ['', ''] :
      LS.state === 'nocfg' ? ['bad', 'El servidor de seguimiento aún no está activado. Mientras tanto, comparte tu posición desde el SOS o por WhatsApp.'] :
      LS.state === 'error' ? ['bad', 'No se pudo publicar. Toca "Dejar de compartir" y vuelve a empezar.'] :
      LS.state === 'offline' ? ['warn', `Sin datos · ${n} posici${n === 1 ? 'ón guardada' : 'ones guardadas'}. Se envían solas al volver la señal.`] :
      LS.state === 'retry' ? ['warn', `Reconectando… ${n ? n + ' posiciones en espera' : ''}`] :
      !GPS.live ? ['warn', GPS.msg] :
      LS.state === 'ok' ? ['ok', `En vivo · enviado ${since < 5 ? 'ahora' : `hace ${since < 60 ? since + ' s' : Math.round(since / 60) + ' min'}`}`] : ['warn', 'Conectando…'];
    st.className = 'ls-st ' + cls; st.textContent = txt; st.hidden = !on;
  };
  LS.subs.add(render); GPS.subs.add(render); const iv = setInterval(render, 2000);
  signal.addEventListener('abort', () => { LS.subs.delete(render); GPS.subs.delete(render); clearInterval(iv); });
  root.addEventListener('click', e => {
    if (e.target.closest('[data-ls-start]')) lsStart(ctx);
    else if (e.target.closest('[data-ls-send]')) lsShareLink();
    else if (e.target.closest('[data-ls-copy]') && LS.s) copy(followUrl(LS.s.id));
    else if (e.target.closest('[data-ls-stop]')) lsStop();
  }, { signal });
  render();
}

/* ---- vista de quien sigue el enlace ---- */
let lfP = null;
const loadLeaflet = () => lfP || (lfP = new Promise((ok, no) => {
  if (window.L) return ok(window.L);
  const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'vendor/leaflet.css'; document.head.appendChild(c);
  const s = document.createElement('script'); s.src = 'vendor/leaflet.js'; s.onload = () => ok(window.L); s.onerror = () => { lfP = null; no(new Error('leaflet')); }; document.head.appendChild(s);
}));
let followCtl = null;
function openFollow(id) {
  const dlg = $('#dlg'); if (dlg.open) dlg.close();
  dlg.className = 'full follow-dlg';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view">
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow"><span class="live-dot" aria-hidden="true"></span>&nbsp;En vivo · GPS real</span><h2 id="m-title" style="font-size:1.6rem" data-f-title>Sigue la lancha</h2></div><span class="f-badge" data-f-badge>Conectando…</span></div>
    <div class="live-grid"><div class="map fmap" data-f-map><div class="f-wait">Buscando la lancha…</div></div>
      <div class="live-side">
        <div class="specs" style="grid-template-columns:1fr 1fr"><div class="spec"><span>Velocidad</span><b data-f-spd>-- kn</b></div><div class="spec"><span>Actualizado</span><b data-f-age>--</b></div><div class="spec"><span>Recorrido</span><b data-f-dist>0,0 MN</b></div><div class="spec"><span>Precisión</span><b data-f-acc>--</b></div></div>
        <p class="f-note" data-f-note role="status" aria-live="polite">Conectando con el teléfono a bordo…</p>
        <div class="f-pos"><span>Posición</span><b class="mono" data-f-pos>--</b></div>
        <button class="btn btn-sun" type="button" data-f-center>Centrar en la lancha</button>
        <a class="btn btn-ghost" data-f-gmaps target="_blank" rel="noopener" hidden>Abrir en Google Maps</a>
        <p class="rating">La posición llega directo del GPS del teléfono que comparte. Si se queda sin señal en el mar, verás su última posición y la hora; al volver la señal, el mapa salta solo a donde está.</p>
      </div></div></div>`;
  followCtl?.abort(); followCtl = new AbortController(); const sig = followCtl.signal;
  const q = s => dlg.querySelector(s);
  let map = null, line = null, boat = null, pts = [], lastT = 0, follow = true, timer = null, data = null, skew = 0, dist = 0;
  const icon = hdg => window.L.divIcon({ className: 'f-boat', iconSize: [44, 44], iconAnchor: [22, 22], html: `<span class="f-pulse"></span><svg viewBox="-22 -22 44 44" style="transform:rotate(${hdg || 0}deg)"><circle r="14" fill="rgba(127,227,240,.22)"/><path d="M0 -12L8 9L0 4.5L-8 9Z" fill="#fff" stroke="#0b2236" stroke-width="1.6" stroke-linejoin="round"/></svg>` });
  const bearing = (a, b) => { const r = Math.PI / 180, y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r), x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r); return (Math.atan2(y, x) / r + 360) % 360; };
  const hm = t => new Date(t).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  const setNote = (cls, txt, badge) => { const n = q('[data-f-note]'); n.className = 'f-note ' + cls; n.textContent = txt; const b = q('[data-f-badge]'); b.className = 'f-badge ' + cls; b.textContent = badge; };
  const paint = () => {
    if (!data || !data.last) return;
    const L = data.last, age = Math.max(0, Date.now() + skew - L.t), s = Math.round(age / 1000);
    q('[data-f-age]').textContent = s < 5 ? 'ahora' : s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : hm(L.t);
    if (data.ended) setNote('', `El viaje terminó. Última posición a las ${hm(L.t)}.`, 'Terminado');
    else if (!navigator.onLine) setNote('warn', 'Tu teléfono está sin conexión. El mapa se actualiza solo cuando vuelvas a tener datos.', 'Sin conexión');
    else if (age > 90e3) setNote('warn', `Sin señal desde las ${hm(L.t)}. Es normal en algunas zonas de Mochima: cuando vuelva la señal, el mapa salta solo a la posición actual.`, 'Sin señal');
    else setNote('ok', 'Recibiendo la posición en tiempo real.', 'En vivo');
  };
  const apply = d => {
    data = d; skew = d.now - Date.now();
    if (d.boat) q('[data-f-title]').textContent = `Sigue a ${d.boat}`;
    const add = (d.pts || []).filter(p => p.t > lastT);
    if (add.length) {
      add.forEach(p => { if (pts.length) dist += distM(pts[pts.length - 1], p); pts.push(p); });
      lastT = pts[pts.length - 1].t;
      const L = pts[pts.length - 1], prev = pts.length > 1 ? pts[pts.length - 2] : null, hdg = typeof L.hdg === 'number' ? L.hdg : prev ? bearing(prev, L) : 0;
      if (map) {
        const ll = pts.map(p => [p.lat, p.lng]); line.setLatLngs(ll); boat.setLatLng([L.lat, L.lng]).setIcon(icon(hdg));
        if (!map.hasLayer(boat)) boat.addTo(map);
        if (follow) map.setView([L.lat, L.lng], Math.max(map.getZoom(), 14), { animate: true });
      }
      q('[data-f-spd]').textContent = typeof L.spd === 'number' ? `${(L.spd * 1.94384).toFixed(1).replace('.', ',')} kn` : prev && L.t > prev.t && distM(prev, L) / ((L.t - prev.t) / 1000) < 35 ? `${(distM(prev, L) / ((L.t - prev.t) / 1000) * 1.94384).toFixed(1).replace('.', ',')} kn` : '-- kn';
      q('[data-f-dist]').textContent = `${(dist / 1852).toFixed(1).replace('.', ',')} MN`;
      q('[data-f-acc]').textContent = typeof L.acc === 'number' ? `±${L.acc} m` : '--';
      q('[data-f-pos]').textContent = fmtPos(L);
      const g = q('[data-f-gmaps]'); g.href = `https://maps.google.com/?q=${L.lat.toFixed(6)},${L.lng.toFixed(6)}`; g.hidden = false;
      const w = q('.f-wait'); if (w) w.remove();
    } else if (!d.last) { setNote('warn', 'El enlace está activo, pero el teléfono a bordo todavía no envía su primera posición.', 'Esperando GPS'); return; }
    paint();
  };
  const poll = async () => {
    clearTimeout(timer); if (sig.aborted) return;
    if (!navigator.onLine) { paint(); if (!data) setNote('warn', 'Sin conexión. Cuando vuelvas a tener datos, el mapa carga solo.', 'Sin conexión'); return; }
    try {
      const r = await fetch(`${LIVE_API}?id=${id}&after=${lastT}`, { cache: 'no-store', signal: sig });
      if (r.status === 404) { setNote('bad', 'Este enlace ya no está activo: el viaje terminó hace más de 24 horas o el enlace está incompleto.', 'Inactivo'); return; }
      if (r.status === 503) { setNote('bad', 'El seguimiento en vivo aún no está activado en el servidor de Tu Lancha.', 'No disponible'); return; }
      if (!r.ok) throw new Error(r.status);
      apply(await r.json());
      timer = setTimeout(poll, data && data.ended ? 60000 : 4000);
    } catch (e) { if (sig.aborted) return; paint(); if (!data) setNote('warn', 'Reconectando…', 'Reconectando'); timer = setTimeout(poll, 8000); }
  };
  addEventListener('online', () => { poll(); }, { signal: sig });
  addEventListener('offline', () => paint(), { signal: sig });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); }, { signal: sig });
  const tickIv = setInterval(paint, 1000); sig.addEventListener('abort', () => { clearInterval(tickIv); clearTimeout(timer); if (map) map.remove(); });
  q('[data-f-center]').addEventListener('click', () => { follow = true; const L = pts[pts.length - 1]; if (map && L) map.setView([L.lat, L.lng], Math.max(map.getZoom(), 14)); });
  dlg.onclick = e => { if (e.target.closest('.m-close')) dlg.close(); };
  dlg.onchange = null;
  dlg.showModal();
  loadLeaflet().then(L => {
    if (sig.aborted) return;
    const el = q('[data-f-map]');
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView([10.24, -64.62], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    line = L.polyline([], { color: '#f3d58a', weight: 3, opacity: .9, dashArray: '2 8', lineCap: 'round' }).addTo(map);
    boat = L.marker([10.24, -64.62], { icon: icon(0), keyboard: false, zIndexOffset: 1000 });
    map.on('dragstart', () => { follow = false; });
    if (pts.length) { const Lp = pts[pts.length - 1]; line.setLatLngs(pts.map(p => [p.lat, p.lng])); boat.setLatLng([Lp.lat, Lp.lng]).addTo(map); map.setView([Lp.lat, Lp.lng], 14); }
    setTimeout(() => map && map.invalidateSize(), 200);
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => map && map.invalidateSize()); ro.observe(el); sig.addEventListener('abort', () => ro.disconnect()); }
  }).catch(() => { const w = q('.f-wait'); if (w) w.textContent = 'No se pudo cargar el mapa. La posición y el enlace a Google Maps siguen funcionando.'; });
  poll();
}

document.addEventListener('click', e => { const b = e.target.closest('[data-abordo-open]'); if (!b) return; const c = ($('#code-live')?.value || '').trim().toUpperCase(); openAbordo(validTrip(c) ? c : ''); });

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
$('#dlg').addEventListener('close', () => { clearInterval(liveTimer); $('#dlg').className = ''; if (['#viaje', '#album', '#a-bordo'].includes(location.hash) || location.hash.startsWith('#sigue/')) history.replaceState(null, '', '#mi-viaje'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
$$('.trip-code').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault(); const c = $('input', f).value.trim().toUpperCase();
  if (!validTrip(c)) { toast('Escribe el código que te enviamos, por ejemplo TLL-1105'); return; }
  f.dataset.go === 'viaje' ? openLive(c) : openAlbum(c);
}));
function route() { if (location.hash === '#viaje') openLive('TLL-1105'); if (location.hash === '#album') openAlbum('TLL-1105'); if (location.hash === '#a-bordo' && !$('#dlg').open) openAbordo(''); const f = location.hash.match(/^#sigue\/([a-z2-9]{20})$/); if (f && !$('#dlg.follow-dlg[open]')) openFollow(f[1]); }
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
