(() => {
'use strict';
const WA = '584143083864';
const RATE_VES = 230; // tasa de referencia de EJEMPLO (Bs por USD). En producción se lee de la API del BCV.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wa = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('tll:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tll:' + k, JSON.stringify(v)); } catch {} }
};
let currency = store.get('cur', 'USD');
const money = usd => currency === 'USD'
  ? '$' + Math.round(usd).toLocaleString('es-VE')
  : 'Bs ' + Math.round(usd * RATE_VES).toLocaleString('es-VE');

/* ---------------- datos (de ejemplo, se reemplazan por los reales) ---------------- */
const DOCKS = ['Marina El Morro', 'Marina Américo Vespucci', 'C.C. Plaza Mayor', 'Bahía Redonda (Pto. La Cruz)'];
const BOATS = [
  { id: 'b1', name: 'Bravo 32', type: 'Lancha', ft: 32, pax: 10, price: 320, hue: 205, dock: 0, cabin: false, rating: 4.9, trips: 214, amen: ['Toldo', 'Cava', 'Corneta Bluetooth', 'Equipo de snorkel'], desc: 'Lancha deportiva rápida y cómoda, ideal para grupos que quieren llegar primero a la playa. Doble motor fuera de borda.' },
  { id: 'b2', name: 'Arapo 40', type: 'Catamarán', ft: 40, pax: 24, price: 950, hue: 190, dock: 1, cabin: true, rating: 5.0, trips: 98, amen: ['Malla de proa', '2 baños', 'Camarotes', 'Parrillera', 'Paddle board'], desc: 'Catamarán estable y amplio, perfecto para celebraciones y grupos grandes. Malla de proa para tomar sol sobre el mar.' },
  { id: 'b3', name: 'Chimana 52', type: 'Yate', ft: 52, pax: 18, price: 1650, hue: 225, dock: 0, cabin: true, rating: 4.9, trips: 61, amen: ['Flybridge', 'Aire acondicionado', '3 camarotes', 'Generador', 'Tripulación de 3'], desc: 'Yate con flybridge y salón climatizado. Para salidas premium, pernoctas y eventos corporativos.' },
  { id: 'b4', name: 'Morro Sport 27', type: 'Lancha', ft: 27, pax: 8, price: 230, hue: 170, dock: 2, cabin: false, rating: 4.8, trips: 305, amen: ['Toldo', 'Cava', 'Escalera de baño'], desc: 'La opción práctica para grupos pequeños. Ágil, económica y siempre puntual.' },
  { id: 'b5', name: 'Mochima 36', type: 'Lancha', ft: 36, pax: 14, price: 450, hue: 215, dock: 1, cabin: true, rating: 4.9, trips: 176, amen: ['Camarote de proa', 'Baño', 'Ducha de agua dulce', 'Corneta'], desc: 'Walkaround con camarote y baño. Muy cómoda para familias y para quien quiere pernoctar en la bahía.' },
  { id: 'b6', name: 'Borracha 45', type: 'Yate', ft: 45, pax: 16, price: 1200, hue: 235, dock: 3, cabin: true, rating: 4.8, trips: 83, amen: ['Salón', '2 camarotes', 'Aire acondicionado', 'Plataforma de baño'], desc: 'Yate clásico de crucero con salón amplio y plataforma de baño a nivel del agua.' },
  { id: 'b7', name: 'Plata 30', type: 'Lancha', ft: 30, pax: 12, price: 290, hue: 195, dock: 0, cabin: false, rating: 4.7, trips: 241, amen: ['Toldo', 'Cava', 'Corneta Bluetooth'], desc: 'Bowrider con mucho espacio en proa. Buena relación precio/capacidad para grupos medianos.' },
  { id: 'b8', name: 'Caribe 48', type: 'Catamarán', ft: 48, pax: 35, price: 1400, hue: 185, dock: 1, cabin: true, rating: 4.9, trips: 57, amen: ['Barra', 'Sonido profesional', '4 baños', 'Tobogán', 'Kayaks'], desc: 'El más grande de la flota. Pensado para fiestas en el mar con DJ y servicio de barra.' },
  { id: 'b9', name: 'Puinare 34', type: 'Lancha', ft: 34, pax: 12, price: 380, hue: 210, dock: 2, cabin: false, rating: 4.8, trips: 132, amen: ['Toldo', 'Cava', 'Equipo de snorkel', 'Escalera'], desc: 'Lancha central console perfecta para recorrer islas y hacer snorkel en Mochima.' }
];
BOATS.forEach(b => b.pernocta = b.cabin);
const ROUTES = [
  { id: 'r1', name: 'Isla de Plata', nm: 9, min: 25, extra: 0, tags: ['Aguas cristalinas', 'Restaurantes', 'Familias'], hue: 185 },
  { id: 'r2', name: 'Playa El Faro · Chimana Grande', nm: 7, min: 20, extra: 0, tags: ['Snorkel', 'Arena blanca'], hue: 195 },
  { id: 'r3', name: 'Las Maritas', nm: 10, min: 30, extra: 30, tags: ['Tranquila', 'Sombra natural'], hue: 175 },
  { id: 'r4', name: 'Isla de Arapo', nm: 15, min: 40, extra: 60, tags: ['Snorkel', 'Fondo coralino'], hue: 170 },
  { id: 'r5', name: 'Playa Colorada', nm: 20, min: 50, extra: 90, tags: ['Arena rojiza', 'Atardeceres'], hue: 20 },
  { id: 'r6', name: 'Playa Blanca (Mochima)', nm: 24, min: 60, extra: 120, tags: ['Parque Nacional', 'Snorkel', 'Puesto de comida'], hue: 180 },
  { id: 'r7', name: 'La Borracha', nm: 12, min: 35, extra: 40, tags: ['Aventura', 'Acantilados'], hue: 205 },
  { id: 'r8', name: 'Puinare', nm: 8, min: 22, extra: 0, tags: ['Aguas calmas', 'Ideal niños'], hue: 190 }
];
const EXTRAS = [
  { id: 'e1', cat: 'Comida y bebidas', name: 'Parrilla a bordo', unit: 'pp', price: 18, desc: 'Carne, pollo, chorizo y contornos' },
  { id: 'e2', cat: 'Comida y bebidas', name: 'Combo bodegón', unit: 'flat', price: 60, desc: 'Hielo, refrescos, agua, snacks' },
  { id: 'e3', cat: 'Comida y bebidas', name: 'Tabla de carpaccios', unit: 'flat', price: 45, desc: 'Res, salmón y pulpo para compartir' },
  { id: 'e4', cat: 'Entretenimiento', name: 'DJ en el mar', unit: 'flat', price: 150, desc: '4 horas con equipo de sonido' },
  { id: 'e5', cat: 'Entretenimiento', name: 'Fotógrafo y dron', unit: 'flat', price: 120, desc: 'Fotos y video editado del día' },
  { id: 'e6', cat: 'Estilo', name: 'Decoración temática', unit: 'flat', price: 70, desc: 'Cumpleaños, propuesta o despedida' },
  { id: 'e7', cat: 'Estilo', name: 'Kit playero', unit: 'pp', price: 12, desc: 'Toalla, lentes y protector solar' },
  { id: 'e8', cat: 'Estadía', name: 'Hora extra en playa', unit: 'flat', price: 50, desc: 'Regresa al atardecer' }
];
const ALLIES = [
  { cat: 'Comida y bebidas', items: [['Bodegón Navego', 'Pedidos en línea, entrega en muelle', 'https://navego-app.vercel.app/bodegon', '#2f6fdf'], ['Parrillas del Morro', 'Parrillas y pasapalos a bordo', '', '#d35b2f'], ['Dulce Marea', 'Postres y tortas', '', '#c2417a']] },
  { cat: 'Estilo', items: [['Arena Swim', 'Trajes de baño y salidas de playa', '', '#1e9b8f'], ['Brisa Deco', 'Decoración para celebraciones', '', '#8a5cd6']] },
  { cat: 'Entretenimiento', items: [['DJ Oleaje', 'Música en vivo en el mar', '', '#232843'], ['Foto Proa', 'Fotografía y dron', '', '#5b6b7a']] },
  { cat: 'Estadía', items: [['Posada Mochima', 'Alojamiento frente a la bahía', '', '#2b8a4b'], ['Restaurante Isla', 'Mesa reservada en Isla de Plata', '', '#b07c18']] }
];
const EXPS = [
  ['Pedida de mano', 'Decoración, fotógrafo escondido y brindis al atardecer.', '<path d="M12 21s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/>'],
  ['Cumpleaños en el mar', 'Torta, decoración, DJ y parrilla a bordo.', '<path d="M4 21h16M5 21v-7h14v7M12 14V9M12 6v.01M8 14v-2M16 14v-2"/>'],
  ['Atardecer en El Morro', 'Salida de 2 horas con vista a los canales al caer el sol.', '<circle cx="12" cy="14" r="4"/><path d="M2 18h20M12 4v3M4.9 7.9l2 2M19.1 7.9l-2 2"/>'],
  ['Pernocta en Mochima', 'Duerme anclado en la bahía y amanece en el parque.', '<path d="M20 14A8 8 0 1110 4a6 6 0 0010 10z"/>'],
  ['Corporativo', 'Integraciones de equipo y atención a clientes con factura.', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>'],
  ['Pesca deportiva', 'Salida temprano con equipo y capitán pescador.', '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z"/>']
];
const REVIEWS = [
  ['Andreína M.', 'Cumpleaños · Arapo 40', 'Todo impecable desde el muelle. El capitán nos llevó a una playa casi vacía y la parrilla llegó caliente. Repetimos seguro.'],
  ['Carlos R.', 'Corporativo · Chimana 52', 'Organizamos una salida con clientes y fue un éxito. Puntuales, yate limpio y tripulación muy atenta.'],
  ['Valeria & José', 'Pedida de mano · Bravo 32', 'Coordinaron la decoración y el fotógrafo sin que ella sospechara nada. Dijo que sí frente a Isla de Plata.']
];
const NEWS = [
  ['2026-10-28', 'Temporada de diciembre: abrimos reservas', 'Las fechas entre el 20 de diciembre y el 6 de enero se agotan rápido. Aparta con abono y asegura tu embarcación preferida.', 200],
  ['2026-10-15', 'Nuevo catamarán en la flota', 'Llega Caribe 48, con capacidad para 35 personas y barra a bordo.', 185],
  ['2026-09-30', 'Guía rápida para tu primer chárter', 'Qué llevar, a qué hora llegar al muelle y cómo elegir playa según el oleaje.', 210]
];

/* ---------------- ilustraciones generativas (placeholders de fotos) ---------------- */
function rnd(seed) { let s = 2166136261; for (const c of seed) s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0; s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hull(x, y, w, col, deck) {
  const h = w * .17;
  return `<path d="M${x} ${y} L${x + w} ${y - h * .35} Q${x + w * .93} ${y + h * .5} ${x + w * .78} ${y + h * .7} L${x + w * .06} ${y + h * .7} Z" fill="${col}"/>
  <path d="M${x + w * .18} ${y - h * .05} L${x + w * .35} ${y - h * .85} L${x + w * .7} ${y - h * .85} L${x + w * .82} ${y - h * .2} Z" fill="${deck}"/>
  <path d="M${x + w * .38} ${y - h * .7} L${x + w * .66} ${y - h * .7} L${x + w * .72} ${y - h * .3} L${x + w * .33} ${y - h * .3} Z" fill="#232843" opacity=".75"/>
  <path d="M${x + w * .04} ${y + h * .3} L${x + w * .9} ${y + h * .05}" stroke="#86cde4" stroke-width="${w * .012}"/>`;
}
function art(kind, hue, seed = 'x') {
  const r = rnd(seed + kind), id = 'g' + Math.floor(r() * 1e9);
  const W = 400, H = 250;
  if (kind === 'drone') {
    let wake = ''; for (let i = 0; i < 6; i++) wake += `<path d="M${120 - i * 16} ${125} Q${60 - i * 20} ${125 - 30 - i * 8} ${-20} ${110 - i * 14}" stroke="#fff" stroke-opacity="${.5 - i * .07}" stroke-width="3" fill="none"/><path d="M${120 - i * 16} ${125} Q${60 - i * 20} ${125 + 30 + i * 8} ${-20} ${140 + i * 14}" stroke="#fff" stroke-opacity="${.5 - i * .07}" stroke-width="3" fill="none"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="${id}" cx=".7" cy=".3" r="1"><stop offset="0" stop-color="hsl(${hue - 10} 75% 62%)"/><stop offset="1" stop-color="hsl(${hue + 15} 70% 28%)"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>
    <path d="M300 -10 Q360 60 420 40 L420 -10Z" fill="hsl(45 60% 78%)" opacity=".9"/><path d="M330 -10 Q380 40 420 25 L420 -10Z" fill="hsl(130 30% 35%)"/>
    ${wake}<g transform="rotate(-8 200 125)"><path d="M118 125 Q150 100 260 104 Q300 112 310 125 Q300 138 260 146 Q150 150 118 125Z" fill="#fff"/><path d="M160 116 Q200 108 250 112 L250 138 Q200 142 160 134Z" fill="#e6ecf4"/><rect x="185" y="114" width="40" height="22" rx="6" fill="#232843" opacity=".8"/><circle cx="270" cy="125" r="5" fill="#86cde4"/></g></svg>`;
  }
  if (kind === 'exterior' || kind === 'hero') {
    const isl = `<path d="M-10 ${H * .6} Q${60 + r() * 40} ${H * .38} ${150} ${H * .52} Q${210} ${H * .44} ${260 + r() * 30} ${H * .55} L${260} ${H * .62} L-10 ${H * .62}Z" fill="hsl(${hue + 20} 35% 32%)" opacity=".85"/>
      <path d="M220 ${H * .6} Q${300} ${H * .42} ${420} ${H * .5} L420 ${H * .62} L220 ${H * .62}Z" fill="hsl(${hue + 30} 30% 24%)" opacity=".9"/>`;
    const sun = kind === 'hero' ? `<circle cx="${W * .72}" cy="${H * .36}" r="28" fill="#f6e13c" opacity=".95"/>` : `<circle cx="${W * .8}" cy="${H * .2}" r="16" fill="#fff8c4" opacity=".9"/>`;
    const sky = kind === 'hero' ? ['#f5b871', '#c86f7e', '#3a3f66'] : [`hsl(${hue} 70% 82%)`, `hsl(${hue} 60% 66%)`, `hsl(${hue} 55% 55%)`];
    let shim = ''; for (let i = 0; i < 9; i++) shim += `<rect x="${r() * W}" y="${H * .66 + r() * H * .3}" width="${20 + r() * 50}" height="2" rx="1" fill="#fff" opacity="${.2 + r() * .3}"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[2]}"/><stop offset=".45" stop-color="${sky[1]}"/><stop offset=".62" stop-color="${sky[0]}"/></linearGradient><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 45%)"/><stop offset="1" stop-color="hsl(${hue + 15} 70% 20%)"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id})"/>${sun}${isl}<rect y="${H * .62}" width="${W}" height="${H * .38}" fill="url(#${id}w)"/>${shim}
    ${hull(W * .22, H * .72, W * .55, '#fbfcfe', '#e6ecf4')}<path d="M${W * .2} ${H * .8} Q${W * .5} ${H * .76} ${W * .8} ${H * .79}" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/></svg>`;
  }
  if (kind === 'interior') {
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="hsl(35 30% 88%)"/><rect y="${H * .72}" width="${W}" height="${H * .28}" fill="hsl(30 35% 62%)"/>
    ${[0, 1, 2].map(i => `<rect x="${40 + i * 115}" y="40" width="95" height="55" rx="18" fill="hsl(${hue} 60% 70%)"/><rect x="${40 + i * 115}" y="40" width="95" height="55" rx="18" fill="none" stroke="#232843" stroke-width="4"/>`).join('')}
    <rect x="30" y="120" width="230" height="70" rx="16" fill="#fff"/><rect x="30" y="112" width="230" height="22" rx="10" fill="#f3f0ea"/><rect x="280" y="140" width="90" height="12" rx="4" fill="hsl(25 35% 40%)"/><rect x="318" y="152" width="14" height="45" fill="hsl(25 35% 30%)"/>
    <circle cx="80" cy="140" r="9" fill="hsl(${hue} 60% 45%)"/><circle cx="210" cy="140" r="9" fill="#f6e13c"/></svg>`;
  }
  // camarote
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="hsl(${hue} 25% 90%)"/><path d="M0 0 L${W} 0 L${W} 60 Q${W / 2} 90 0 60Z" fill="hsl(30 30% 70%)"/>
  <circle cx="110" cy="70" r="20" fill="hsl(${hue} 70% 65%)" stroke="#9aa3b8" stroke-width="6"/><circle cx="290" cy="70" r="20" fill="hsl(${hue} 70% 65%)" stroke="#9aa3b8" stroke-width="6"/>
  <path d="M40 150 Q200 110 360 150 L360 215 L40 215Z" fill="#fff"/><path d="M40 150 Q200 110 360 150 L360 165 Q200 128 40 165Z" fill="hsl(${hue} 50% 45%)"/>
  <ellipse cx="140" cy="140" rx="40" ry="14" fill="#f4f1ec"/><ellipse cx="260" cy="140" rx="40" ry="14" fill="#f4f1ec"/><rect x="40" y="215" width="320" height="35" fill="hsl(30 35% 55%)"/></svg>`;
}
function beachArt(b) {
  const r = rnd(b.id), W = 400, H = 300, id = 'bg' + b.id;
  let palms = ''; for (let i = 0; i < 3; i++) { const x = 230 + i * 45 + r() * 20, y = 150 + r() * 10; palms += `<path d="M${x} ${y + 40} Q${x + 6} ${y + 10} ${x + 2} ${y - 20}" stroke="#2e4a2a" stroke-width="4" fill="none"/><path d="M${x + 2} ${y - 20} q-25 -2 -32 14 M${x + 2} ${y - 20} q24 -6 34 10 M${x + 2} ${y - 20} q-6 -20 -24 -22 M${x + 2} ${y - 20} q10 -20 28 -18" stroke="#3f6b35" stroke-width="6" fill="none" stroke-linecap="round"/>`; }
  const sand = b.hue < 60 ? 'hsl(15 55% 62%)' : 'hsl(45 55% 82%)';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(205 70% 75%)"/><stop offset=".45" stop-color="hsl(${b.hue < 60 ? 185 : b.hue} 75% 55%)"/><stop offset="1" stop-color="hsl(${b.hue < 60 ? 195 : b.hue + 10} 70% 30%)"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#${id})"/><path d="M-10 110 Q80 ${50 + r() * 30} 180 100 Q260 ${60 + r() * 30} 410 95 L410 120 L-10 120Z" fill="hsl(140 25% 30%)" opacity=".75"/>
  <path d="M180 220 Q260 160 410 170 L410 ${H} L120 ${H}Z" fill="${sand}"/><path d="M175 222 Q260 165 410 176" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>${palms}
  ${hull(40, 200, 120, '#fff', '#e6ecf4')}</svg>`;
}

/* ---------------- hero ---------------- */
/* ---------------- condiciones del mar ---------------- */
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function seaLevel(wave, wind) { return wave > 1.4 || wind > 20 ? 'red' : wave > 0.9 || wind > 14 ? 'amber' : 'ok'; }
function renderSea(days, live) {
  const t = days[0], lv = seaLevel(t.wave, t.wind);
  const txt = { ok: ['Mar en calma', 'Condiciones ideales para todas las rutas, incluida Mochima.'], amber: ['Mar moderado', 'Recomendamos rutas cercanas o salir temprano. Embarcaciones grandes sin problema.'], red: ['Mar picado', 'El capitán puede reprogramar. Te avisamos con tiempo y sin costo.'] }[lv];
  $('#mar-now').innerHTML = `<span class="flag ${lv === 'ok' ? '' : lv}"><i></i>Hoy</span><div class="verdict">${txt[0]}</div><p>${txt[1]}</p><div class="mono" style="font-size:.9rem">Ola ${t.wave.toFixed(1)} m · Viento ${Math.round(t.wind)} nudos</div>`;
  $('#mar-days').innerHTML = days.slice(1, 6).map(d => { const l = seaLevel(d.wave, d.wind); return `<div class="day ${l === 'ok' ? '' : l}"><span class="d">${DIAS[d.date.getDay()]} ${d.date.getDate()}</span><div class="bar"><i style="width:${Math.min(100, d.wave / 1.8 * 100)}%"></i></div><span class="k">${d.wave.toFixed(1)} m · ${Math.round(d.wind)} kn</span></div>`; }).join('');
  $('#mar-src').textContent = live ? 'en vivo · Open-Meteo' : 'datos de ejemplo';
}
const today = new Date(); today.setHours(0, 0, 0, 0);
const sample = [0.6, 0.7, 1.0, 0.8, 0.5, 0.6].map((w, i) => ({ date: new Date(today.getTime() + i * 864e5), wave: w, wind: [9, 11, 15, 12, 8, 10][i] }));
renderSea(sample, false);
Promise.all([
  fetch('https://marine-api.open-meteo.com/v1/marine?latitude=10.3&longitude=-64.6&daily=wave_height_max&timezone=America%2FCaracas&forecast_days=6').then(r => r.json()),
  fetch('https://api.open-meteo.com/v1/forecast?latitude=10.2&longitude=-64.65&daily=wind_speed_10m_max&wind_speed_unit=kn&timezone=America%2FCaracas&forecast_days=6').then(r => r.json())
]).then(([m, f]) => {
  const days = m.daily.time.map((d, i) => ({ date: new Date(d + 'T12:00'), wave: m.daily.wave_height_max[i] ?? 0.6, wind: f.daily.wind_speed_10m_max[i] ?? 10 }));
  if (days.length >= 6) renderSea(days, true);
}).catch(() => {});

/* ---------------- disponibilidad (propietarios) ---------------- */
const owner = store.get('owner', {}); // {boatId: {rate, wk, busy:{'2026-11-20':true}}}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function busyDefault(b, d) { const r = rnd(b.id + iso(d)); return r() < .22; }
function isBusy(b, d) { const o = owner[b.id]?.busy; const k = iso(d); return o && k in o ? o[k] : busyDefault(b, d); }
function rateOf(b) { return owner[b.id]?.rate ?? b.price; }
function wkOf(b) { return owner[b.id]?.wk ?? 10; }
function priceOn(b, d) { const wkend = d && (d.getDay() === 0 || d.getDay() === 6); return rateOf(b) * (wkend ? 1 + wkOf(b) / 100 : 1); }
function nextFree(b) { for (let i = 1; i < 60; i++) { const d = new Date(today.getTime() + i * 864e5); if (!isBusy(b, d)) return d; } }
const fmtDay = d => d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });

function calendar(el, b, opts) {
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const draw = () => {
    const y = view.getFullYear(), m = view.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(w => `<span class="w">${w}</span>`).join('') + '<span></span>'.repeat(first);
    for (let i = 1; i <= n; i++) {
      const d = new Date(y, m, i), past = d < today, busy = isBusy(b, d), sel = opts.selected && iso(opts.selected) === iso(d);
      const wk = d.getDay() === 0 || d.getDay() === 6;
      cells += `<button type="button" data-d="${iso(d)}" class="${past ? 'past' : ''} ${busy ? 'busy' : ''} ${sel ? 'sel' : ''} ${wk && !busy && !past ? 'promo' : ''}" ${past || (busy && !opts.owner) ? 'disabled' : ''} aria-label="${fmtDay(d)}${busy ? ', ocupado' : ', libre'}">${i}</button>`;
    }
    el.innerHTML = `<div class="cal-h"><button type="button" data-nav="-1" aria-label="Mes anterior">‹</button><span>${view.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}</span><button type="button" data-nav="1" aria-label="Mes siguiente">›</button></div><div class="cal-g">${cells}</div>
    <div class="legend"><span><i style="background:var(--card);border:1px solid var(--line)"></i>Libre</span><span><i style="background:repeating-linear-gradient(135deg,var(--muted) 0 2px,transparent 2px 4px)"></i>Ocupado</span><span><i style="background:var(--sun);border-radius:50%"></i>Fin de semana${opts.owner ? '' : ` (+${wkOf(b)}%)`}</span></div>`;
  };
  el.onclick = e => {
    const nav = e.target.closest('[data-nav]'); if (nav) { view = new Date(view.getFullYear(), view.getMonth() + +nav.dataset.nav, 1); return draw(); }
    const btn = e.target.closest('[data-d]'); if (!btn || btn.disabled) return;
    const [yy, mm, dd] = btn.dataset.d.split('-').map(Number); opts.onPick(new Date(yy, mm - 1, dd)); draw();
  };
  draw(); return { draw };
}

/* ---------------- flota ---------------- */
const VIEWS = [['drone', 'Dron'], ['exterior', 'Exterior'], ['interior', 'Interior'], ['camarote', 'Camarote']];
let filt = { type: 'all', pax: 0, dock: '' };
function boatCard(b) {
  const nf = nextFree(b);
  return `<article class="boat" data-id="${b.id}">
    <div class="shot"><span class="pic">${art('drone', b.hue, b.id)}</span>${b.rating >= 4.9 ? '<span class="badge">Favorita</span>' : ''}
      <div class="tabs">${VIEWS.filter(v => v[0] !== 'camarote' || b.cabin).map((v, i) => `<button type="button" data-v="${v[0]}" aria-pressed="${i === 0}">${v[1]}</button>`).join('')}</div></div>
    <div class="body">
      <div class="row"><h3>${b.name}</h3><span class="rating"><b>${b.rating.toFixed(1)}</b> ★ · ${b.trips}</span></div>
      <div class="meta"><span class="tag">${b.type}</span><span class="tag">${b.ft} pies</span><span class="tag">Hasta ${b.pax} pers.</span>${b.cabin ? '<span class="tag">Pernocta</span>' : ''}</div>
      <div class="row"><span class="price">${money(rateOf(b))} <small>/ día</small></span><span class="rating">Libre ${nf ? fmtDay(nf) : '—'}</span></div>
      <div class="rating">Sale de ${DOCKS[b.dock]}</div>
      <div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-open="${b.id}">Ver detalles</button><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${wa(`Hola Tu Lancha 👋 Quiero reservar la ${b.name} (${b.type}, ${b.pax} pers.). ¿Qué fechas tienen libres?`)}">Reservar</a></div>
    </div></article>`;
}
function renderBoats() {
  const list = BOATS.filter(b => (filt.type === 'all' || (filt.type === 'Pernocta' ? b.cabin : b.type === filt.type)) && b.pax >= filt.pax && (filt.dock === '' || b.dock === +filt.dock));
  $('#boats').innerHTML = list.map(boatCard).join('') || '<p class="rating">No hay embarcaciones con esos filtros. Prueba con otro muelle o tamaño de grupo.</p>';
  $('#f-count').textContent = `${list.length} de ${BOATS.length} embarcaciones`;
}
$('#f-dock').innerHTML += DOCKS.map((d, i) => `<option value="${i}">${d}</option>`).join('');
$('#filters').addEventListener('click', e => { const p = e.target.closest('.pill'); if (!p) return; $$('.pill', $('#filters')).forEach(x => x.setAttribute('aria-pressed', x === p)); filt.type = p.dataset.type; renderBoats(); });
$('#f-pax').onchange = e => { filt.pax = +e.target.value; renderBoats(); };
$('#f-dock').onchange = e => { filt.dock = e.target.value; renderBoats(); };
$('#boats').addEventListener('click', e => {
  const v = e.target.closest('[data-v]');
  if (v) { const card = v.closest('.boat'), b = BOATS.find(x => x.id === card.dataset.id); $('.pic', card).innerHTML = art(v.dataset.v, b.hue, b.id); $$('[data-v]', card).forEach(x => x.setAttribute('aria-pressed', x === v)); return; }
  const o = e.target.closest('[data-open]'); if (o) openBoat(o.dataset.open);
});

/* ---------------- detalle de embarcación ---------------- */
function openBoat(id) {
  const b = BOATS.find(x => x.id === id), dlg = $('#dlg');
  let pick = nextFree(b), view = 'drone';
  const views = VIEWS.filter(v => v[0] !== 'camarote' || b.cabin);
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="m-grid">
    <div class="m-media"><div class="shot" id="m-shot">${art(view, b.hue, b.id)}</div>
      <div class="thumbs">${views.map((v, i) => `<button type="button" data-mv="${v[0]}" aria-pressed="${i === 0}" aria-label="${v[1]}">${art(v[0], b.hue, b.id)}</button>`).join('')}</div>
      <div class="links-v"><a class="btn btn-ghost on-sea btn-sm" href="https://www.youtube.com/results?search_query=tu+lancha+lecheria" target="_blank" rel="noopener">Ver video</a><a class="btn btn-ghost on-sea btn-sm" href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Fotos en Instagram</a></div></div>
    <div class="m-body">
      <div style="display:grid;gap:6px"><span class="eyebrow">${b.type} · ${b.rating.toFixed(1)} ★ (${b.trips} salidas)</span><h2 id="m-title" style="font-size:1.8rem">${b.name}</h2><p style="color:var(--muted)">${b.desc}</p></div>
      <div class="specs"><div class="spec"><span>Eslora</span><b>${b.ft} ft</b></div><div class="spec"><span>Personas</span><b>${b.pax}</b></div><div class="spec"><span>Desde</span><b>${money(rateOf(b))}</b></div></div>
      <div class="amen">${b.amen.map(a => `<span class="tag">${a}</span>`).join('')}</div>
      <div class="two"><div class="field"><label for="m-route">Rumbo</label><select id="m-route">${ROUTES.map(r => `<option value="${r.id}">${r.name} · ${r.nm} mn${r.extra ? ' · +' + money(r.extra) : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="m-dock">Muelle</label><select id="m-dock">${DOCKS.map((d, i) => `<option value="${i}" ${i === b.dock ? 'selected' : ''}>${d}</option>`).join('')}</select></div></div>
      <div class="cal" id="m-cal"></div>
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><div class="rating" id="m-when"></div><div class="price" id="m-total"></div></div><a class="btn btn-wa" id="m-wa" target="_blank" rel="noopener">Reservar por WhatsApp</a></div>
      <button class="btn btn-ghost btn-sm" type="button" id="m-build" style="justify-self:start">Agregar extras en el cotizador</button>
    </div></div>`;
  const upd = () => {
    const r = ROUTES.find(x => x.id === $('#m-route', dlg).value), dock = DOCKS[$('#m-dock', dlg).value];
    const total = priceOn(b, pick) + r.extra;
    $('#m-when', dlg).textContent = pick ? `${fmtDay(pick)} · ${r.name}` : 'Elige una fecha';
    $('#m-total', dlg).textContent = money(total);
    $('#m-wa', dlg).href = wa(`Hola Tu Lancha 👋 Quiero reservar:\n⛵ ${b.name} (${b.type}, hasta ${b.pax} pers.)\n📅 ${pick ? fmtDay(pick) : 'fecha por definir'}\n🏝️ ${r.name}\n⚓ Salida: ${dock}\n💵 Total estimado: ${money(total)}`);
  };
  calendar($('#m-cal', dlg), b, { get selected() { return pick; }, onPick: d => { pick = d; upd(); } });
  dlg.onchange = upd;
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    const mv = e.target.closest('[data-mv]'); if (mv) { $('#m-shot', dlg).innerHTML = art(mv.dataset.mv, b.hue, b.id); $$('[data-mv]', dlg).forEach(x => x.setAttribute('aria-pressed', x === mv)); }
    if (e.target.closest('#m-build')) { Q.boat = b.id; Q.route = $('#m-route', dlg).value; Q.dock = +$('#m-dock', dlg).value; if (pick) Q.date = iso(pick); Q.pax = Math.min(Q.pax, b.pax); dlg.close(); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); }
  };
  upd(); dlg.showModal();
}

/* ---------------- cotizador ---------------- */
const Q = Object.assign({ pax: 8, boat: 'b1', route: 'r1', dock: 0, date: iso(new Date(today.getTime() + 7 * 864e5)), extras: {} }, store.get('quote', {}));
function renderBuilder() {
  $('#pax').textContent = Q.pax;
  const fits = BOATS.filter(b => b.pax >= Q.pax).sort((a, b) => rateOf(a) - rateOf(b));
  if (!fits.find(b => b.id === Q.boat)) Q.boat = fits[0]?.id;
  $('#b-boats').innerHTML = fits.map(b => `<button type="button" class="opt" data-boat="${b.id}" aria-pressed="${b.id === Q.boat}"><b>${b.name}</b><span>${b.type} · ${b.pax} pers.</span><span class="p">${money(rateOf(b))} / día</span></button>`).join('');
  $('#b-routes').innerHTML = ROUTES.map(r => `<button type="button" class="opt" data-route="${r.id}" aria-pressed="${r.id === Q.route}"><b>${r.name}</b><span>${r.nm} mn · ~${r.min} min</span><span class="p">${r.extra ? '+' + money(r.extra) + ' combustible' : 'Incluido'}</span></button>`).join('');
  $('#b-extras').innerHTML = EXTRAS.map(x => `<button type="button" class="opt" data-extra="${x.id}" aria-pressed="${!!Q.extras[x.id]}"><b>${x.name}</b><span>${x.desc}</span><span class="p">${money(x.price)}${x.unit === 'pp' ? ' por persona' : ''}</span></button>`).join('');
  $('#b-dock').innerHTML = DOCKS.map((d, i) => `<option value="${i}" ${i === Q.dock ? 'selected' : ''}>${d}</option>`).join('');
  $('#b-date').value = Q.date; $('#b-date').min = iso(today);
  renderTicket(); store.set('quote', Q);
}
function renderTicket() {
  const b = BOATS.find(x => x.id === Q.boat), r = ROUTES.find(x => x.id === Q.route);
  if (!b) { $('#ticket').innerHTML = '<h3>Tu cotización</h3><p class="empty">Para grupos de más de 35 personas armamos una flotilla a la medida. Escríbenos.</p>'; return; }
  const [yy, mm, dd] = Q.date.split('-').map(Number), d = new Date(yy, mm - 1, dd), busy = isBusy(b, d);
  const lines = [[`${b.name} · ${fmtDay(d)}`, priceOn(b, d)]];
  if (r.extra) lines.push([`Combustible a ${r.name}`, r.extra]);
  EXTRAS.filter(x => Q.extras[x.id]).forEach(x => lines.push([x.name + (x.unit === 'pp' ? ` × ${Q.pax}` : ''), x.unit === 'pp' ? x.price * Q.pax : x.price]));
  const code = codeInfo(Q.code);
  const sub = lines.reduce((s, l) => s + l[1], 0);
  if (code.kind === 'ref') lines.push([`Código ${code.code} (−5%)`, -Math.round(sub * .05)]);
  if (code.kind === 'gift') lines.push([`Tarjeta de regalo ${code.code}`, -Math.min(sub, code.value)]);
  const total = Math.max(0, lines.reduce((s, l) => s + l[1], 0));
  const msg = `Hola Tu Lancha 👋 Armé mi día en la web:\n👥 ${Q.pax} personas\n⛵ ${b.name}\n📅 ${fmtDay(d)}\n🏝️ ${r.name}\n⚓ ${DOCKS[Q.dock]}\n${lines.slice(1).map(l => (l[1] < 0 ? '🎁 ' : '➕ ') + l[0]).join('\n')}\n💵 Total estimado: ${money(total)}\n¿Está disponible?`;
  $('#ticket').innerHTML = `<h3>Tu cotización</h3>
    ${busy ? `<span class="flag amber"><i></i>${b.name} está ocupada ese día</span>` : `<span class="flag"><i></i>Disponible</span>`}
    <ul>${lines.map(l => `<li><span>${l[0]}</span><span>${money(l[1])}</span></li>`).join('')}</ul>
    <div class="total"><span>Total</span><span>${money(total)}</span></div>
    <div class="pp">${money(total / Q.pax)} por persona · abono para apartar ${money(total / 2)}</div>
    <form class="code-in" id="code-form"><input id="q-code" placeholder="Código de amigo o de regalo" aria-label="Código de amigo o tarjeta de regalo" value="${Q.code || ''}" autocomplete="off" autocapitalize="characters"><button class="btn btn-ghost on-sea btn-sm" type="submit">Aplicar</button></form>
    ${Q.code ? (code.kind ? `<span class="code-ok">✓ ${code.kind === 'ref' ? 'Descuento de amigo aplicado' : 'Tarjeta de regalo aplicada (' + money(code.value) + ')'}</span>` : `<span class="code-bad">Ese código no es válido. Revisa que esté bien escrito, por ejemplo ANA-7K2 o TLLG-B4XK.</span>`) : ''}
    <a class="btn btn-wa" target="_blank" rel="noopener" href="${wa(msg)}" id="t-wa">Enviar por WhatsApp</a>
    <p class="note">${currency === 'VES' ? `Calculado con tasa de referencia de ejemplo: ${RATE_VES} Bs/USD. ` : ''}Precio estimado; se confirma con disponibilidad. Fines de semana +${wkOf(b)}%.</p>`;
  $('#mb-total').textContent = money(total); $('#mb-wa').href = wa(msg);
}
const GIFT_VALUES = { A: 180, B: 320, C: 950, D: 1650 };
const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function refCode(name) { const clean = name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'AMIGO'; const r = rnd('ref' + clean); return clean + '-' + [0, 0, 0].map(() => AL[Math.floor(r() * AL.length)]).join(''); }
function codeInfo(raw) {
  const c = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!c) return {};
  let m = c.match(/^([A-Z]{2,8})-([A-Z0-9]{3})$/);
  if (m && refCode(m[1]) === c) return { kind: 'ref', code: c };
  m = c.match(/^TLLG-([A-D])([A-Z0-9]{3})$/);
  if (m) return { kind: 'gift', code: c, value: GIFT_VALUES[m[1]] };
  m = c.match(/^TLLG-M(\d{2,4})-([A-Z0-9]{3})$/);
  if (m) return { kind: 'gift', code: c, value: +m[1] };
  return { code: c };
}
$('#pax-m').onclick = () => { Q.pax = Math.max(1, Q.pax - 1); renderBuilder(); };
$('#pax-p').onclick = () => { Q.pax = Math.min(60, Q.pax + 1); renderBuilder(); };
$('#reservar').addEventListener('click', e => {
  const t = e.target.closest('.opt'); if (!t) return;
  if (t.dataset.boat) Q.boat = t.dataset.boat;
  if (t.dataset.route) Q.route = t.dataset.route;
  if (t.dataset.extra) Q.extras[t.dataset.extra] = !Q.extras[t.dataset.extra];
  renderBuilder();
});
$('#reservar').addEventListener('submit', e => { if (e.target.id !== 'code-form') return; e.preventDefault(); Q.code = $('#q-code').value.trim().toUpperCase(); renderBuilder(); toast(codeInfo(Q.code).kind ? 'Código aplicado' : 'Código no válido'); });
$('#b-date').onchange = e => { if (e.target.value) { Q.date = e.target.value; renderBuilder(); } };
$('#b-dock').onchange = e => { Q.dock = +e.target.value; renderBuilder(); };

/* ---------------- playas, experiencias, aliados, reseñas, noticias ---------------- */
$('#beaches').innerHTML = ROUTES.map(r => `<article class="beach">${beachArt(r)}<div class="in"><span class="km">${r.nm} MN · ~${r.min} MIN EN LANCHA</span><h3>${r.name}</h3><div class="tags">${r.tags.map(t => `<span>${t}</span>`).join('')}</div>
  <div class="ln"><a href="https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(r.name)}" target="_blank" rel="noopener">Fotos</a><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(r.name + ' Anzoátegui')}" target="_blank" rel="noopener">Videos</a><button type="button" data-goroute="${r.id}" style="all:unset;cursor:pointer;color:var(--on-sea);font-weight:700">Ir aquí →</button></div></div></article>`).join('');
$('#beaches').addEventListener('click', e => { const g = e.target.closest('[data-goroute]'); if (g) { Q.route = g.dataset.goroute; renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); } });
$('#exps').innerHTML = EXPS.map(x => `<div class="exp"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${x[2]}</svg></span><h3>${x[0]}</h3><p>${x[1]}</p><a href="${wa(`Hola Tu Lancha 👋 Me interesa la experiencia "${x[0]}". ¿Me dan información?`)}" target="_blank" rel="noopener">Pedir propuesta →</a></div>`).join('');
$('#allies').innerHTML = ALLIES.map(c => `<div class="cat"><h3>${c.cat}</h3>${c.items.map(([n, d, u, col]) => `<a class="ally" href="${u || wa(`Hola Tu Lancha 👋 Quiero agregar ${n} a mi salida.`)}" target="_blank" rel="noopener"><span class="av" style="background:${col}">${n.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><div><b>${n}</b><span>${d}</span></div><span class="vip">VIP</span></a>`).join('')}</div>`).join('');

/* ---------------- pool ---------------- */
$('#p-dock').innerHTML = DOCKS.map(d => `<option>${d}</option>`).join('');
$('#pool-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = id => $('#' + id).value.trim();
  const a = document.createElement('a');
  a.href = wa(`Hola Tu Lancha 👋 Quiero formar parte del pool.\n👤 ${v('p-name')} (${v('p-phone')})\n⛵ ${v('p-boat')} · ${v('p-pax') || '?'} pers.\n⚓ ${v('p-dock')} · ${v('p-park')}\n📝 ${v('p-note')}`);
  a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  toast('Abrimos WhatsApp con tu postulación lista para enviar');
});

/* ---------------- portal del propietario (demo local) ---------------- */
let ob = BOATS[0], ocal;
$('#o-boat').innerHTML = BOATS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
function ownerKpis() {
  const y = today.getFullYear(), m = today.getMonth(), n = new Date(y, m + 1, 0).getDate();
  let busy = 0, inc = 0;
  for (let i = 1; i <= n; i++) { const d = new Date(y, m, i); if (isBusy(ob, d)) { busy++; inc += priceOn(ob, d); } }
  $('#k-res').textContent = busy; $('#k-inc').textContent = money(inc * .8); $('#k-occ').textContent = Math.round(busy / n * 100) + '%';
}
function renderOwner() {
  $('#o-rate').value = rateOf(ob); $('#o-wk').value = wkOf(ob);
  ocal = calendar($('#o-cal'), ob, { owner: true, onPick: d => { owner[ob.id] ??= {}; owner[ob.id].busy ??= {}; owner[ob.id].busy[iso(d)] = !isBusy(ob, d); ownerKpis(); } });
  ownerKpis();
}
$('#o-boat').onchange = e => { ob = BOATS.find(b => b.id === e.target.value); renderOwner(); };
$('#o-rate').oninput = e => { const v = +e.target.value; if (v >= 50) { owner[ob.id] ??= {}; owner[ob.id].rate = v; ownerKpis(); } };
$('#o-wk').onchange = e => { owner[ob.id] ??= {}; owner[ob.id].wk = +e.target.value; ownerKpis(); };
$('#o-save').onclick = () => { store.set('owner', owner); renderBoats(); renderBuilder(); toast(`Guardado: ${ob.name} actualizada en el catálogo`); };

/* ---------------- moneda, toast, instalación ---------------- */
function setCur(c) { currency = c; store.set('cur', c); $('#cur-usd').setAttribute('aria-pressed', c === 'USD'); $('#cur-ves').setAttribute('aria-pressed', c === 'VES'); renderBoats(); renderBuilder(); ownerKpis(); }
$('#cur-usd').onclick = () => setCur('USD'); $('#cur-ves').onclick = () => setCur('VES');
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
let deferred; addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#install').hidden = false; });
$('#install').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#install').hidden = true; };
if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai') && !location.hostname.includes('artifact')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

setCur(currency); renderOwner();

window.TLL = { renderBoats, renderTicket, $, $$, wa, art, beachArt, rnd, money, store, toast, Q, renderBuilder, BOATS, ROUTES, DOCKS, EXTRAS, iso, fmtDay, refCode, codeInfo, GIFT_VALUES, AL, today, priceOn, get currency() { return currency; } };
})();

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

(() => {
'use strict';
const { $, $$, Q, renderBuilder, BOATS } = window.TLL;
const VIEWS = $$('.page').map(v => v.dataset.view);
const ALIAS = { cotizar: 'reservar', pool: 'propietarios', club: 'regalos', referidos: 'regalos', preguntas: 'nosotros', mar: 'inicio', 'inicio-mas': 'inicio' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const topbar = $('#topbar');
let current = null;

/* ---------- enrutador por vistas ---------- */
function target() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (VIEWS.includes(h)) return [h, null];
  if (ALIAS[h]) return [ALIAS[h], h];
  if (h === 'viaje' || h === 'album') return ['mi-viaje', null];
  return [current || 'inicio', null];
}
function show(name, anchor) {
  const swap = () => {
    $$('.page').forEach(v => { const on = v.dataset.view === name; v.hidden = !on; v.classList.toggle('enter', on); });
    $$('.mainnav a').forEach(a => { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('.tabbar [data-tab]').forEach(t => t.setAttribute('aria-current', String(t.dataset.tab === name)));
    topbar.classList.toggle('inner', name !== 'inicio');
    document.title = name === 'inicio' ? 'Tu Lancha Lechería · Paseos en lancha y yates a Mochima' : `${$(`[data-view="${name}"] h1`)?.textContent.trim() || ''} · Tu Lancha Lechería`;
    if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
    else if (current !== name) scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    current = name;
    if (name === 'reservar') { renderBuilder(); goStep(step); }
    syncMinibar(); syncVideo(); parallax();
  };
  if (current && current !== name && document.startViewTransition && !reduce.matches) document.startViewTransition(swap); else swap();
}
function route() { const [v, a] = target(); closeSheet(); if (v !== current || a) show(v, a); }
addEventListener('hashchange', route);

/* ---------- reserva paso a paso ---------- */
let step = 0;
const steps = $$('.step'), labels = $$('#stepper [data-go]');
function goStep(n) {
  step = Math.max(0, Math.min(3, n));
  steps.forEach((s, i) => { const on = i === step; if (s.hidden === on) { s.hidden = !on; if (on) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); } } });
  labels.forEach((b, i) => { b.setAttribute('aria-selected', String(i === step)); b.classList.toggle('done', i < step); });
  $('#stepper-fill').style.width = ((step + 1) / 4 * 100) + '%';
  $('#st-back').style.visibility = step === 0 ? 'hidden' : 'visible';
  const nx = $('#st-next');
  if (step === 3) { nx.textContent = 'Ver mi resumen'; } else { nx.textContent = 'Siguiente'; }
}
$('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goStep(+b.dataset.go); });
$('#st-back').onclick = () => { goStep(step - 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); };
$('#st-next').onclick = () => {
  if (step < 3) { goStep(step + 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); }
  else { $('#ticket').scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' }); $('#t-wa')?.focus({ preventScroll: true }); }
};
// al elegir una embarcación o un destino, avanzar solo
$('#reservar').addEventListener('click', e => {
  const o = e.target.closest('.opt');
  if (!o || window.innerWidth > 900) return;
  if (o.dataset.boat && step === 1) setTimeout(() => goStep(2), 220);
});
goStep(0);

/* ---------- barra de total en el móvil ---------- */
const mb = $('#minibar');
let ticketIn = false;
new IntersectionObserver(es => { ticketIn = es[0].isIntersecting; syncMinibar(); }, { threshold: .25 }).observe($('#ticket'));
function syncMinibar() {
  const on = current === 'reservar' && !ticketIn && !!BOATS.find(x => x.id === Q.boat);
  mb.classList.toggle('show', on); mb.setAttribute('aria-hidden', String(!on)); $('#mb-wa').tabIndex = on ? 0 : -1;
}

/* ---------- menú ---------- */
const sheet = $('#sheet');
function openSheet() { sheet.hidden = false; $$('#menu-open,#menu-open-2').forEach(b => b.setAttribute('aria-expanded', 'true')); setTimeout(() => $('#menu-close').focus(), 30); }
function closeSheet() { if (sheet.hidden) return; sheet.hidden = true; $$('#menu-open,#menu-open-2').forEach(b => b.setAttribute('aria-expanded', 'false')); }
$('#menu-open').onclick = openSheet; $('#menu-open-2').onclick = openSheet; $('#menu-close').onclick = closeSheet;
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('a')) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- video del hero ---------- */
const video = $('#hero-video');
const saveData = navigator.connection && navigator.connection.saveData;
function syncVideo() {
  if (!video) return;
  const want = current === 'inicio' && !reduce.matches && !saveData && document.visibilityState === 'visible';
  if (want) { const p = video.play(); if (p && p.catch) p.catch(() => {}); } else video.pause();
}
if (saveData) video.removeAttribute('autoplay');
document.addEventListener('visibilitychange', syncVideo);
reduce.addEventListener?.('change', syncVideo);
new IntersectionObserver(es => { if (!es[0].isIntersecting) video.pause(); else syncVideo(); }).observe(video);

/* ---------- parallax por capas (transform, rAF) ---------- */
const layers = $$('.px');
let ticking = false;
function parallax() {
  ticking = false;
  if (reduce.matches || current !== 'inicio') { layers.forEach(l => l.style.transform = ''); return; }
  const k = innerWidth < 900 ? .55 : 1, vh = innerHeight;
  for (const l of layers) {
    const host = l.closest('.hero, .layers'); const r = host.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) continue;
    const prog = host.classList.contains('hero') ? -r.top : (r.top + r.height / 2 - vh / 2) * -1;
    l.style.transform = `translate3d(0, ${(prog * +l.dataset.speed * k).toFixed(1)}px, 0)`;
  }
  const y = scrollY;
  topbar.classList.toggle('solid', y > 40);
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
addEventListener('resize', parallax);
addEventListener('scroll', () => topbar.classList.toggle('solid', scrollY > 40), { passive: true });

/* enlaces que llevan a otra vista con un destino o embarcación ya elegidos (los maneja app.js) */
route(); if (!current) show('inicio');
window.TLL.goStep = goStep;
})();

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
