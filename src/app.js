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
      <div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-open="${b.id}">Ver detalles</button><button class="btn btn-sun btn-sm" type="button" data-book="${b.id}">Reservar</button></div>
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
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><div class="rating" id="m-when"></div><div class="price" id="m-total"></div></div><button class="btn btn-sun" type="button" id="m-book">Reservar esta embarcación</button></div>
      <button class="btn btn-ghost btn-sm" type="button" id="m-build" style="justify-self:start">Agregar extras en el cotizador</button>
    </div></div>`;
  const upd = () => {
    const r = ROUTES.find(x => x.id === $('#m-route', dlg).value), dock = DOCKS[$('#m-dock', dlg).value];
    const total = priceOn(b, pick) + r.extra;
    $('#m-when', dlg).textContent = pick ? `${fmtDay(pick)} · ${r.name}` : 'Elige una fecha';
    $('#m-total', dlg).textContent = money(total);
    void total;
  };
  calendar($('#m-cal', dlg), b, { get selected() { return pick; }, onPick: d => { pick = d; upd(); } });
  dlg.onchange = upd;
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    const mv = e.target.closest('[data-mv]'); if (mv) { $('#m-shot', dlg).innerHTML = art(mv.dataset.mv, b.hue, b.id); $$('[data-mv]', dlg).forEach(x => x.setAttribute('aria-pressed', x === mv)); }
    if (e.target.closest('#m-book')) { Q.boat = b.id; Q.route = $('#m-route', dlg).value; Q.dock = +$('#m-dock', dlg).value; if (pick) Q.date = iso(pick); Q.pax = Math.min(Q.pax, b.pax); dlg.close(); renderBuilder(); location.hash = 'reservar'; setTimeout(() => { window.TLL.goStep && window.TLL.goStep(3); window.TLL.openBooking(); }, 60); return; }
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
  if (!b) { window.TLL_LAST = null; $('#ticket').innerHTML = '<h3>Tu cotización</h3><p class="empty">Para grupos de más de 35 personas armamos una flotilla a la medida. Escríbenos.</p>'; return; }
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
    <button class="btn btn-sun btn-lg" type="button" id="t-book">Reservar ahora</button>
    <p class="note">${currency === 'VES' ? `Calculado con tasa de referencia de ejemplo: ${RATE_VES} Bs/USD. ` : ''}No pagas nada ahora: te confirmamos disponibilidad y abono. Fines de semana +${wkOf(b)}%.</p>`;
  $('#mb-total').textContent = money(total);
  window.TLL_LAST = { boat: b.name, type: b.type, route: r.name, dock: DOCKS[Q.dock], date: fmtDay(d), iso: Q.date, pax: Q.pax, lines, total, busy, promo: code.kind ? code.code : '' };
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
document.addEventListener('click', e => { const k = e.target.closest('[data-book]'); if (!k) return; const b = BOATS.find(x => x.id === k.dataset.book); if (!b) return; Q.boat = b.id; Q.pax = Math.min(Q.pax, b.pax); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); });
})();

