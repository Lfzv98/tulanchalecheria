(() => {
'use strict';
const WA = '584143083864';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wa = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('tll:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tll:' + k, JSON.stringify(v)); } catch {} }
};
const currency = 'USD';
const money = usd => '$' + Math.round(usd).toLocaleString('es-VE');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------------- datos ----------------
   Rumbos, muelles, horario, paquete básico y políticas: reales, según Eduardo (nov. 2026).
   Embarcaciones, tarifas y extras con precio: DE EJEMPLO hasta cargar la flota real. */

// Muelles sugeridos (toque de muelle lo cobra el establecimiento) y recogidas en residencias (recargo de Tu Lancha)
const DOCKS = [
  { id: 'pm', name: 'C.C. Plaza Mayor', fee: '$30', park: 'Estacionamiento público con vigilancia' },
  { id: 'mm', name: 'Hotel Maremares', fee: '$11,6 a tasa BCV', park: 'Estacionamiento privado con vigilancia' },
  { id: 'av', name: 'Marina Américo Vespucio', fee: '$34 a tasa BCV', park: 'Estacionamiento privado con vigilancia' },
  { id: 'em', name: 'Cerro El Morro · Eurobuilding', pickup: true, lancha: 20, other: 30, back: '5:30 pm' },
  { id: 'pmr', name: 'Puerto Mares', pickup: true, lanchaOnly: true, lancha: 20 },
  { id: 'cda', name: 'Residencias Cayo de Agua', pickup: true, lanchaOnly: true, lancha: 20 },
  { id: 'ppr', name: 'Puerto Príncipe', pickup: true, lanchaOnly: true, lancha: 20 },
  { id: 'ppa', name: 'Hotel Punta Palma', off: true }
];
const MAIN_DOCKS = DOCKS.filter(d => !d.pickup && !d.off);

// Paquete básico: lo incluyen TODAS las embarcaciones
const BASIC = ['Tripulación según el tamaño de la embarcación', 'Capitanes con más de 10 años de experiencia', 'Chalecos salvavidas para todos', 'Ducha de agua dulce', 'Botiquín de primeros auxilios', 'Embarcación con documentación al día', 'Cava con hielo', 'Agua mineral suficiente para todos'];

// Accesorios: cada embarcación dice cuáles trae incluidos (inc) y cuáles cobra aparte (opt)
const ACC = { sonido: 'Sonido (integrado o Bluetooth)', mat: 'Alfombra flotante', paddle: 'Paddle board', kayak: 'Kayak', snorkel: 'Equipo de snorkel', flot: 'Flotadores', kids: 'Juguetes para niños', dron: 'Video con dron', cam: 'Cámara subacuática', parrilla: 'Parrillera' };

/* Campos por embarcación:
   own: la lancha de Eduardo (va primero y destacada) · maxBeaches: playas por salida (lancha 3; barco, mini yate y yate 2)
   r4: hace el Rumbo 4 · late: hasta qué hora puede quedarse (20 = 8:00 pm) · hx: costo de cada hora extra
   pick: excepciones de recogida por calado ({cda: null} = no llega; {em: 0} = sin recargo) */
const BOATS = [
  { id: 'b0', own: true, name: 'Lancha de la casa', type: 'Lancha', ft: 32, pax: 5, kidSeat: .5, kidFee: 15, price: 350, hue: 200, dock: 0, cabin: false, rating: 5.0, trips: 0, r4: true, late: 20, hx: 40, pick: { em: 20 },
    inc: ['sonido', 'parrilla', 'snorkel', 'flot'], opt: { mat: 25, dron: 60 }, amen: ['Corneta Bose S1 Pro', 'Parrillera sin costo', 'Toldo'], desc: 'La embarcación de Tu Lancha, atendida por nuestra propia tripulación. Es la que más eligen nuestros clientes.' },
  { id: 'b1', name: 'Bravo 32', type: 'Lancha', ft: 32, pax: 10, price: 320, hue: 205, dock: 0, cabin: false, rating: 4.9, trips: 214, inc: ['sonido', 'snorkel'], opt: { parrilla: 20, mat: 25 }, amen: ['Toldo', 'Cava'], desc: 'Lancha deportiva rápida y cómoda, ideal para grupos que quieren llegar primero a la playa. Doble motor fuera de borda.' },
  { id: 'b9', name: 'Promar 34', type: 'Lancha', ft: 34, pax: 10, price: 380, hue: 210, dock: 2, cabin: false, rating: 4.8, trips: 132, maxBeaches: 2, inc: ['sonido', 'snorkel'], opt: { parrilla: 20 }, amen: ['Toldo', 'Escalera'], desc: 'Lancha amplia para recorrer islas y hacer snorkel. Por su tamaño, visita hasta 2 playas por salida.' },
  { id: 'b4', name: 'Morro Sport 27', type: 'Lancha', ft: 27, pax: 8, kidSeat: .5, kidFee: 10, price: 230, hue: 170, dock: 2, cabin: false, rating: 4.8, trips: 305, pick: { cda: null }, inc: ['sonido'], opt: {}, amen: ['Toldo', 'Escalera de baño'], desc: 'La opción práctica para grupos pequeños. Ágil, económica y siempre puntual.' },
  { id: 'b7', name: 'Plata 30', type: 'Lancha', ft: 30, pax: 10, price: 290, hue: 195, dock: 0, cabin: false, rating: 4.7, trips: 241, late: 20, hx: 40, inc: ['sonido', 'flot'], opt: { parrilla: 20, kayak: 30 }, amen: ['Toldo', 'Proa amplia'], desc: 'Bowrider con mucho espacio en proa. Buena relación precio/capacidad para grupos medianos.' },
  { id: 'b5', name: 'Mochima 36', type: 'Mini yate', ft: 36, pax: 12, price: 450, hue: 215, dock: 1, cabin: true, rating: 4.9, trips: 176, inc: ['sonido', 'snorkel'], opt: { parrilla: 20, paddle: 30 }, amen: ['Camarote de proa', 'Baño'], desc: 'Mini yate con camarote y baño. Muy cómodo para familias y para quien quiere pernoctar en la bahía.' },
  { id: 'b2', name: 'Arapo 40', type: 'Barco', ft: 40, pax: 12, price: 950, hue: 190, dock: 1, cabin: true, rating: 5.0, trips: 98, inc: ['sonido', 'parrilla', 'paddle'], opt: { dron: 60 }, amen: ['Malla de proa', '2 baños', 'Camarotes'], desc: 'Barco estable y amplio, perfecto para celebraciones y grupos grandes. Malla de proa para tomar sol sobre el mar.' },
  { id: 'b8', name: 'Caribe 48', type: 'Barco', ft: 48, pax: 30, price: 1400, hue: 185, dock: 1, cabin: true, rating: 4.9, trips: 57, inc: ['sonido', 'kayak', 'kids'], opt: { dron: 60 }, amen: ['Barra', '4 baños', 'Tobogán'], desc: 'Barco de eventos, el más grande. Pensado para fiestas en el mar con DJ y servicio de barra.' },
  { id: 'b3', name: 'Chimana 52', type: 'Yate', ft: 52, pax: 12, price: 1650, hue: 225, dock: 0, cabin: true, rating: 4.9, trips: 61, r4: true, late: 20, hx: 80, inc: ['sonido', 'mat', 'snorkel', 'paddle'], opt: { parrilla: 20, dron: 60, cam: 30 }, amen: ['Flybridge', 'Aire acondicionado', '3 camarotes', 'Generador'], desc: 'Yate con flybridge y salón climatizado. Para salidas premium, pernoctas y eventos corporativos.' },
  { id: 'b6', name: 'Borracha 45', type: 'Yate', ft: 45, pax: 12, price: 1200, hue: 235, dock: 2, cabin: true, rating: 4.8, trips: 83, inc: ['sonido', 'mat'], opt: { parrilla: 20 }, amen: ['Salón', '2 camarotes', 'Aire acondicionado', 'Plataforma de baño'], desc: 'Yate clásico de crucero con salón amplio y plataforma de baño a nivel del agua.' }
];
BOATS.forEach(b => { b.pernocta = b.cabin; b.maxBeaches ??= b.type === 'Lancha' ? 3 : 2; b.opt ??= {}; b.inc ??= []; });
const OWN = BOATS.find(b => b.own);

// Rumbos: nunca se cruzan. extra: null = recargo que se confirma por WhatsApp
const ROUTES = [
  { id: 'r1', name: 'Rumbo 1', zone: 'Chimanas y Puinare', nm: 7, min: 20, hue: 190, extra: 0, beaches: ['El Saco', 'Puinare', 'Puinarito', 'Ensenada · Bahía del Silencio', 'Playa El Faro (Chimana Grande)', 'Chimana Segunda'], tags: ['Aguas calmas', 'Ideal para niños'], desc: 'Las islas más cercanas, con aguas tranquilas.' },
  { id: 'r2', name: 'Rumbo 2', zone: 'Isla de Plata y Punta La Cruz', nm: 9, min: 25, hue: 185, extra: 0, beaches: ['Isla de Plata', 'Punta La Cruz', 'Playa El Faro', 'Playa Varadero'], tags: ['Aguas cristalinas', 'Restaurante en la playa'], desc: 'Aguas cristalinas y comida en El Rincón Marino, en Punta La Cruz.' },
  { id: 'r3', name: 'Rumbo 3', zone: 'Islas Arapo · estado Sucre', nm: 19, min: 45, hue: 175, extra: null, plus: 'r2', beaches: ['Islas Arapo', 'La Piscina', 'Playa Ñacleta'], tags: ['Más probabilidad de delfines', '+10 millas'], desc: 'Unas 10 millas náuticas más lejos, con recargo en todas las embarcaciones. Puedes sumar playas del Rumbo 2.' },
  { id: 'r4', name: 'Rumbo 4', zone: 'Manare y Playa Blanca', nm: 24, min: 60, hue: 180, extra: null, early: true, beaches: ['Playa Manare', 'Playa Blanca'], tags: ['Solo con buen mar', '9:00 am a 5:00 pm'], desc: 'Solo algunas embarcaciones y solo en temporada de buen mar.' }
];
const SPECIAL = ['Isletas de Píritu', 'Isla La Tortuga', 'Islas Caracas', 'Margarita'];

const MERCADILLO = 'https://mercadillo.lovable.app/';
// Videos de Eduardo (comprimidos a 480p; se cargan solo al tocar "play")
const VID = {
  playas: ['Conoce nuestras playas', 'v'], rumbo1: ['Rumbo 1', 'h'], rumbo2: ['Rumbo 2', 'h'], rumbo3: ['Rumbo 3', 'h'],
  muelles: ['Muelles sugeridos', 'v'], horario: ['Horario de los paseos', 'v'], accesorios: ['Accesorios y facilidades', 'v'],
  comidas: ['Comidas y bebidas', 'v'], mercadillo: ['Cómo pedir en El Mercadillo', 'v'], rincon: ['Restaurante El Rincón Marino', 'v']
};
const vcard = (k, label) => VID[k] ? `<button type="button" class="vcard ${VID[k][1]}" data-vid="${k}" aria-label="Ver video: ${label || VID[k][0]}"><img src="media/v/${k}.jpg" alt="" loading="lazy" decoding="async"><span class="vplay" aria-hidden="true"></span><span class="vlbl">${label || VID[k][0]}</span></button>` : '';
const vlink = (k, label) => VID[k] ? `<button type="button" class="vlink" data-vid="${k}"><span class="vdot" aria-hidden="true"></span>${label || 'Ver video: ' + VID[k][0]}</button>` : '';
function openVideo(k) {
  const d = $('#vdlg'); if (!d || !VID[k]) return;
  d.className = VID[k][1];
  d.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar video">×</button><video controls autoplay playsinline preload="metadata" poster="media/v/${k}.jpg" src="media/v/${k}.mp4"></video><p class="vcap">${VID[k][0]}</p>`;
  d.onclick = e => { if (e.target === d || e.target.closest('.m-close')) d.close(); };
  d.onclose = () => { const v = $('video', d); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } d.innerHTML = ''; };
  d.showModal();
  const v = $('video', d); const p = v.play(); if (p && p.catch) p.catch(() => {});
}
document.addEventListener('click', e => { const v = e.target.closest('[data-vid]'); if (v) { e.preventDefault(); openVideo(v.dataset.vid); } });
const CANALES = {
  video: 'https://youtu.be/jVBf_uwYNwc',
  opts: [
    { id: 'l', name: 'Lancha', pp: 15, min: 6, max: 10 },
    { id: 'y', name: 'Yate', pp: 22, min: 10, max: 15 },
    { id: 'b', name: 'Barco de eventos', flat: 500, min: 1, max: 30 }
  ],
  extras: [['dron', 'Video con dron', 30], ['hora', 'Hora extra fondeados', 80]],
  docks: ['C.C. Plaza Mayor', 'Muelle Aquavic', 'Hotel Maremares', 'Mi residencia']
};
const ALLIES = [
  { cat: 'Comida y bebidas', items: [['El Mercadillo', 'Haz tu pedido y te lo llevan al muelle antes de zarpar', MERCADILLO, '#1e7fb8'], ['El Rincón Marino', 'Restaurante en Playa Punta La Cruz (Rumbos 2 y 3)', '', '#d35b2f'], ['Cervecería Regional', 'Aliado oficial de cerveza', '', '#b0161e']] },
  { cat: 'Estilo', items: [['Arena Swim', 'Trajes de baño y salidas de playa', '', '#1e9b8f'], ['Brisa Deco', 'Decoración para celebraciones', '', '#8a5cd6']] },
  { cat: 'Entretenimiento', items: [['DJ Oleaje', 'Música en vivo en el mar', '', '#232843'], ['Foto Proa', 'Fotografía y dron', '', '#5b6b7a']] },
  { cat: 'Estadía', items: [['Posada Mochima', 'Alojamiento frente a la bahía', '', '#2b8a4b']] }
];
const EXPS = [
  ['Pedida de mano', 'Decoración, fotógrafo escondido y brindis en el mar.', '<path d="M12 21s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/>'],
  ['Cumpleaños en el mar', 'Torta, decoración y música a bordo.', '<path d="M4 21h16M5 21v-7h14v7M12 14V9M12 6v.01M8 14v-2M16 14v-2"/>'],
  ['Pernocta en Mochima', 'Duerme anclado en la bahía y amanece en el parque.', '<path d="M20 14A8 8 0 1110 4a6 6 0 0010 10z"/>'],
  ['Corporativo', 'Integraciones de equipo y atención a clientes con factura.', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>']
];
const EXTRAS = Object.entries(ACC).map(([id, name]) => ({ id, name }));
const REVIEWS = [];
const NEWS = [];
void REVIEWS; void NEWS;

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
  const r = rnd(b.id), W = 400, H = 300, id = 'bg' + String(b.id).normalize('NFD').replace(/[^A-Za-z0-9]/g, '');
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

/* ---------------- reglas de rumbo, muelle y horario ---------------- */
const dockById = id => DOCKS.find(d => d.id === id) || DOCKS[0];
// ¿Puede esta embarcación salir de / recoger en este punto? Devuelve {ok, cost, why}
function dockFor(b, d) {
  if (d.off) return { ok: false, why: 'Muelle no habilitado por ahora' };
  if (!d.pickup) return { ok: true, cost: 0 };
  if (b.pick && d.id in b.pick) return b.pick[d.id] === null ? { ok: false, why: `${b.name} no llega hasta ahí por su calado` } : { ok: true, cost: b.pick[d.id] };
  if (d.lanchaOnly && b.type !== 'Lancha') return { ok: false, why: 'Solo lanchas; barcos y yates salen de los muelles sugeridos' };
  return { ok: true, cost: b.type === 'Lancha' ? d.lancha : d.other };
}
const routeOk = (b, r) => !r.id || r.id !== 'r4' || !!b.r4;
const hh = h => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}`;
function hoursFor(b, r, d) {
  const start = r.early ? 9 : 10, end = r.early ? 17 : 18;
  let maxX = 0, why = '';
  if (d.back) why = `Regreso al ${d.name} máximo a las ${d.back}.`;
  else if (r.early) why = `${r.name} sale a las 9:00 am y regresa a las 5:00 pm.`;
  else if (b.late) maxX = b.late - end;
  else why = `${b.name} regresa a las 6:00 pm.`;
  return { start, end, maxX, why };
}
function beachLimitText(b) { return `Puedes elegir hasta ${b.maxBeaches} playa${b.maxBeaches > 1 ? 's' : ''}`; }

/* ---------------- embarcaciones ---------------- */
const VIEWS = [['drone', 'Dron'], ['exterior', 'Exterior'], ['interior', 'Interior'], ['camarote', 'Camarote']];
let filt = { type: 'all', pax: 0, dock: '' };
const OWN_BADGE = 'Recomendación de la casa';
function boatCard(b) {
  const nf = nextFree(b);
  return `<article class="boat${b.own ? ' own' : ''}" data-id="${b.id}">
    <div class="shot"><span class="pic">${art('drone', b.hue, b.id)}</span>${b.own ? `<span class="badge own-badge">${OWN_BADGE}</span>` : ''}
      <div class="tabs">${VIEWS.filter(v => v[0] !== 'camarote' || b.cabin).map((v, i) => `<button type="button" data-v="${v[0]}" aria-pressed="${i === 0}">${v[1]}</button>`).join('')}</div></div>
    <div class="body">
      <div class="row"><h3>${b.name}</h3><span class="rating">${b.own ? '<b>La más vendida</b>' : `<b>${b.rating.toFixed(1)}</b> ★`}</span></div>
      <div class="meta"><span class="tag">${b.type}</span><span class="tag">${b.ft} pies</span><span class="tag">Hasta ${b.pax} pers.</span>${b.cabin ? '<span class="tag">Pernocta</span>' : ''}</div>
      <div class="rating">Hasta ${b.maxBeaches} playas por salida${b.r4 ? ' · hace el Rumbo 4' : ''}</div>
      <div class="rating">Sale de ${DOCKS[b.dock].name} · libre ${nf ? fmtDay(nf) : '—'}</div>
      <div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-open="${b.id}">Ver detalles</button><button class="btn btn-sun btn-sm" type="button" data-book="${b.id}">Reservar</button></div>
    </div></article>`;
}
function renderBoats() {
  const list = BOATS.filter(b => (filt.type === 'all' || (filt.type === 'Pernocta' ? b.cabin : b.type === filt.type)) && b.pax >= filt.pax && (filt.dock === '' || b.dock === +filt.dock))
    .sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0));
  const own = list.filter(b => b.own), rest = list.filter(b => !b.own);
  $('#boats').innerHTML = (own.map(boatCard).join('') + (rest.length && own.length ? '<h3 class="grid-h">Otras opciones disponibles</h3>' : '') + rest.map(boatCard).join('')) || '<p class="rating">No hay embarcaciones con esos filtros. Prueba con otro muelle o tamaño de grupo.</p>';
  $('#f-count').textContent = `${list.length} de ${BOATS.length} embarcaciones`;
}
function renderOwnFeature() {
  const el = $('#own-feature'); if (!el || !OWN) return;
  const nf = nextFree(OWN);
  el.innerHTML = `<div class="own-card glass-card">
    <div class="own-shot">${art('exterior', OWN.hue, OWN.id)}<span class="badge own-badge">${OWN_BADGE}</span></div>
    <div class="own-in"><span class="eyebrow">La más vendida</span><h2>${OWN.name}</h2><p>${OWN.desc}</p>
      <div class="meta"><span class="tag">${OWN.type} · ${OWN.ft} pies</span><span class="tag">Hasta ${OWN.pax} pasajeros + capitán</span>${OWN.amen.map(a => `<span class="tag">${a}</span>`).join('')}</div>
      <p class="rating">Próxima fecha libre: <b>${nf ? fmtDay(nf) : 'consúltanos'}</b></p>
      <div class="row2"><button class="btn btn-sun" type="button" data-open="${OWN.id}">Ver disponibilidad</button><button class="btn btn-ghost" type="button" data-book="${OWN.id}">Reservar</button></div></div></div>`;
}
$('#f-dock').innerHTML += MAIN_DOCKS.map((d, i) => `<option value="${i}">${d.name}</option>`).join('');
$('#filters').addEventListener('click', e => { const p = e.target.closest('.pill'); if (!p) return; $$('.pill', $('#filters')).forEach(x => x.setAttribute('aria-pressed', x === p)); filt.type = p.dataset.type; renderBoats(); });
$('#f-pax').onchange = e => { filt.pax = +e.target.value; renderBoats(); };
$('#f-dock').onchange = e => { filt.dock = e.target.value; renderBoats(); };
$('#boats').addEventListener('click', e => {
  const v = e.target.closest('[data-v]');
  if (v) { const card = v.closest('.boat'), b = BOATS.find(x => x.id === card.dataset.id); $('.pic', card).innerHTML = art(v.dataset.v, b.hue, b.id); $$('[data-v]', card).forEach(x => x.setAttribute('aria-pressed', x === v)); }
});
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (!o || o.closest('dialog')) return; e.preventDefault(); openBoat(o.dataset.open); });

function accHtml(b) {
  const inc = b.inc.map(k => `<li>${ACC[k]}${k === 'parrilla' ? ' <b>sin costo</b>' : ''}</li>`).join('');
  const opt = Object.entries(b.opt).map(([k, p]) => `<li>${ACC[k]} <b>+${money(p)}</b></li>`).join('');
  return `${inc ? `<div><h4>Incluido en esta embarcación</h4><ul class="chk">${inc}</ul></div>` : ''}${opt ? `<div><h4>Extras con costo</h4><ul class="chk plus">${opt}</ul></div>` : ''}`;
}
const basicHtml = () => `<ul class="chk">${BASIC.map(x => `<li>${x}</li>`).join('')}</ul>`;

/* ---------------- detalle de embarcación ---------------- */
function openBoat(id) {
  const b = BOATS.find(x => x.id === id), dlg = $('#dlg'); if (!b) return;
  if (dlg.open) dlg.close();
  dlg.className = '';
  let pick = nextFree(b);
  const views = VIEWS.filter(v => v[0] !== 'camarote' || b.cabin);
  const hr = hoursFor(b, ROUTES[0], DOCKS[0]);
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="m-grid">
    <div class="m-media"><div class="shot" id="m-shot">${art('drone', b.hue, b.id)}${b.own ? `<span class="badge own-badge">${OWN_BADGE}</span>` : ''}</div>
      <div class="thumbs">${views.map((v, i) => `<button type="button" data-mv="${v[0]}" aria-pressed="${i === 0}" aria-label="${v[1]}">${art(v[0], b.hue, b.id)}</button>`).join('')}</div>
      <div class="links-v"><a class="btn btn-ghost on-sea btn-sm" href="https://www.youtube.com/results?search_query=tu+lancha+lecheria" target="_blank" rel="noopener">Ver video</a><a class="btn btn-ghost on-sea btn-sm" href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Fotos en Instagram</a></div></div>
    <div class="m-body">
      <div style="display:grid;gap:6px"><span class="eyebrow">${b.type}${b.own ? ' · La más vendida' : ` · ${b.rating.toFixed(1)} ★`}</span><h2 id="m-title" style="font-size:1.8rem">${b.name}</h2><p style="color:var(--muted)">${b.desc}</p></div>
      <div class="specs"><div class="spec"><span>Eslora</span><b>${b.ft} ft</b></div><div class="spec"><span>Personas</span><b>${b.pax}</b></div><div class="spec"><span>Playas</span><b>hasta ${b.maxBeaches}</b></div></div>
      <div class="amen">${b.amen.map(a => `<span class="tag">${a}</span>`).join('')}</div>
      <details class="pk" open><summary>Equipamiento básico incluido</summary>${basicHtml()}</details>
      <div class="acc">${accHtml(b)}</div>${vlink('accesorios', 'Ver video: accesorios y facilidades')}
      <p class="rating hr-note">Horario: 10:00 am a 6:00 pm. ${b.late ? `Puede quedarse hasta las ${hh(b.late)} con hora extra (${money(b.hx)} c/u, en efectivo a bordo).` : hr.why} ${b.r4 ? 'Hace el Rumbo 4 (Manare y Playa Blanca) en temporada de buen mar.' : ''}</p>
      <div class="cal" id="m-cal"></div>
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="rating" id="m-when"></div><button class="btn btn-sun" type="button" id="m-book">Reservar esta embarcación</button></div>
    </div></div>`;
  const upd = () => { $('#m-when', dlg).textContent = pick ? `Fecha elegida: ${fmtDay(pick)}` : 'Elige una fecha'; };
  calendar($('#m-cal', dlg), b, { get selected() { return pick; }, onPick: d => { pick = d; upd(); } });
  dlg.onchange = null;
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    const mv = e.target.closest('[data-mv]'); if (mv) { $('#m-shot', dlg).innerHTML = art(mv.dataset.mv, b.hue, b.id) + (b.own ? `<span class="badge own-badge">${OWN_BADGE}</span>` : ''); $$('[data-mv]', dlg).forEach(x => x.setAttribute('aria-pressed', x === mv)); }
    if (e.target.closest('#m-book')) { Q.boat = b.id; if (pick) Q.date = iso(pick); fitTo(b); dlg.close(); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); }
  };
  upd(); dlg.showModal();
}

/* ---------------- reserva guiada ---------------- */
const Q = Object.assign({ pax: 4, kids: 0, boat: OWN ? OWN.id : 'b1', route: 'r1', beaches: [], dock: 'pm', hx: 0, date: iso(new Date(today.getTime() + 7 * 864e5)), acc: {} }, store.get('quote2', {}));
// Niños de 7 años o menos: en embarcaciones con excepción (kidSeat), dos niños ocupan un puesto, con recargo (kidFee) por cada niño por encima de la licencia.
const seatsOn = b => Q.pax + (Q.kids || 0) * (b.kidSeat || 1);
const fitsOn = b => seatsOn(b) <= b.pax;
const kidExtra = b => b.kidSeat ? Math.max(0, Math.min(Q.kids || 0, Q.pax + (Q.kids || 0) - b.pax)) : 0;
const people = () => Q.pax + (Q.kids || 0);
const paxTxt = () => `${Q.pax} adulto${Q.pax === 1 ? '' : 's'}${Q.kids ? ` + ${Q.kids} niño${Q.kids === 1 ? '' : 's'} (7 años o menos)` : ''}`;
const capTxt = b => `${b.pax} pers.${b.kidSeat ? ' + niños' : ''}`;
function fitTo(b) { Q.pax = Math.min(Q.pax, b.pax); while (Q.kids && !fitsOn(b)) Q.kids--; }
const BIG_MSG = 'Nuestros yates tienen una capacidad máxima de 12 personas y lanchas para 10p. Para grupos más grandes, la opción ideal es nuestro barco de eventos de 30p o para mayor versatilidad, el alquiler de dos embarcaciones de 8p ó 10p cada una, quedo atento a la opción que les gustaría…';
Q.pax = Math.min(30, Math.max(1, Math.round(+Q.pax) || 4)); Q.kids = Math.min(10, Math.max(0, Math.round(+Q.kids) || 0));
const qDate = () => { const [yy, mm, dd] = Q.date.split('-').map(Number); return new Date(yy, mm - 1, dd); };
function boatOpt(b, d) {
  const busy = isBusy(b, d);
  return `<button type="button" class="opt${b.own ? ' own' : ''}" data-boat="${b.id}" aria-pressed="${b.id === Q.boat}">${b.own ? `<span class="own-tag">${OWN_BADGE}</span>` : ''}<b>${b.name}</b><span>${b.type} · ${capTxt(b)} · hasta ${b.maxBeaches} playas</span>${busy ? '<span class="busy-t">Ocupada ese día</span>' : ''}<span class="p">${money(priceOn(b, d))} / día</span></button>`;
}
function renderBuilder() {
  Q.kids = Q.kids || 0;
  $('#pax').textContent = Q.pax; $('#kids').textContent = Q.kids;
  $('#pax-m').disabled = Q.pax <= 1; $('#pax-p').disabled = Q.pax >= 30; $('#kid-m').disabled = !Q.kids; $('#kid-p').disabled = Q.kids >= 10 || people() >= 30;
  $('#big-group').innerHTML = Q.pax > 12 ? `<div class="biggroup" role="note"><p>${BIG_MSG}</p><div class="bg-ctas"><button type="button" class="btn btn-sun btn-sm" id="bg-event">Ver barco de eventos (30p)</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${wa(`Hola Tu Lancha 👋 Somos ${paxTxt()} y nos interesa alquilar dos embarcaciones de 8p o 10p para el ${fmtDay(qDate())}.`)}">Dos embarcaciones por WhatsApp</a></div></div>` : '';
  const d = qDate();
  const fits = BOATS.filter(fitsOn);
  const ownOk = OWN && fitsOn(OWN) && !isBusy(OWN, d);
  const others = fits.filter(b => !b.own).sort((a, b) => (isBusy(a, d) - isBusy(b, d)) || rateOf(a) - rateOf(b));
  if (!fits.find(b => b.id === Q.boat) || (Q.boat === OWN?.id && !ownOk)) Q.boat = ownOk ? OWN.id : (others.find(b => !isBusy(b, d)) || others[0])?.id;
  const ownMsg = !OWN || ownOk ? '' : `<p class="own-off">${!fitsOn(OWN) ? `La ${OWN.name.toLowerCase()} lleva hasta ${OWN.pax} pasajeros más el capitán (dos niños de 7 años o menos ocupan un puesto).` : `La ${OWN.name.toLowerCase()} ya está reservada el ${fmtDay(d)}.`} Estas embarcaciones de nuestros aliados están disponibles:</p>`;
  $('#b-boats').innerHTML = (ownOk ? `<div class="opts own-row">${boatOpt(OWN, d)}</div><h4 class="opts-h">Otras opciones disponibles</h4>` : ownMsg) + `<div class="opts">${others.map(b => boatOpt(b, d)).join('')}</div>`;
  const b = BOATS.find(x => x.id === Q.boat);
  $('#b-date').value = Q.date; $('#b-date').min = iso(today);
  if (b) renderPlan(b);
  renderTicket(); store.set('quote2', Q);
}
function renderPlan(b) {
  let r = ROUTES.find(x => x.id === Q.route) || ROUTES[0];
  if (!routeOk(b, r)) { r = ROUTES[0]; Q.route = r.id; }
  const plus = r.plus ? ROUTES.find(x => x.id === r.plus) : null;
  const allowed = [...r.beaches, ...(plus ? plus.beaches : [])];
  Q.beaches = (Q.beaches || []).filter(x => allowed.includes(x)).slice(0, b.maxBeaches);
  if (!Q.beaches.length) Q.beaches = [r.beaches[0]];
  $('#b-routes').innerHTML = ROUTES.map(x => { const ok = routeOk(b, x); return `<button type="button" class="opt rumbo" data-route="${x.id}" aria-pressed="${x.id === r.id}" ${ok ? '' : 'disabled'}><b>${x.name} · ${x.zone}</b><span>${x.beaches.join(', ')}</span><span class="p">${ok ? (x.extra === null ? 'Con recargo · te lo confirmamos' : 'Sin recargo') + ` · ~${x.min} min` : 'No disponible en esta embarcación'}</span></button>`; }).join('');
  const chip = n => `<button type="button" class="bchip" data-beach="${esc(n)}" aria-pressed="${Q.beaches.includes(n)}">${esc(n)}</button>`;
  $('#b-beaches').innerHTML = `<div class="bl-h"><b>Elige tus playas</b><span class="lim" id="b-lim">${beachLimitText(b)} · ${Q.beaches.length}/${b.maxBeaches}</span></div>
    <div class="bchips">${r.beaches.map(chip).join('')}</div>
    ${plus ? `<p class="rating">Puedes sumar playas del ${plus.name}:</p><div class="bchips">${plus.beaches.map(chip).join('')}</div>` : ''}
    <p class="rating">${r.desc} No combinamos playas de rumbos distintos.</p>${vlink('rumbo' + r.id.slice(1), 'Ver video del ' + r.name)}
    <p class="special">¿Otro destino? ${SPECIAL.join(', ')}: <a href="${wa(`Hola Tu Lancha 👋 Quiero una cotización especial para ${SPECIAL.join(' / ')} para ${paxTxt()} el ${fmtDay(qDate())}.`)}" target="_blank" rel="noopener">cotización especial por WhatsApp</a></p>`;
  const opt = d => { const c = dockFor(b, d); return `<option value="${d.id}" ${d.id === Q.dock ? 'selected' : ''} ${c.ok ? '' : 'disabled'}>${d.name}${d.fee ? ' · toque ' + d.fee : ''}${c.ok && c.cost ? ' · +' + money(c.cost) : ''}${c.ok ? '' : ' · no disponible'}</option>`; };
  if (!dockFor(b, dockById(Q.dock)).ok) Q.dock = DOCKS[b.dock].id;
  $('#b-dock').innerHTML = `<optgroup label="Muelles sugeridos">${DOCKS.filter(d => !d.pickup).map(opt).join('')}</optgroup><optgroup label="Te buscamos en tu residencia">${DOCKS.filter(d => d.pickup).map(opt).join('')}</optgroup>`;
  const d = dockById(Q.dock), c = dockFor(b, d);
  const blocked = DOCKS.filter(x => x.pickup && !dockFor(b, x).ok).map(x => dockFor(b, x).why);
  $('#b-dockinfo').innerHTML = d.pickup
    ? `<b>Recogida en ${d.name}</b>: +${money(c.cost)}.${d.back ? ` Regreso máximo a las ${d.back}.` : ''} ${blocked.length ? `<br><small>${[...new Set(blocked)].join('. ')}.</small>` : ''}`
    : `<b>${d.name}</b>: toque de muelle ${d.fee} (lo pagas en el muelle) · ${d.park}.`;
  $('#b-dockinfo').innerHTML += `<br>${vlink('muelles', 'Ver video de los muelles sugeridos')}<small>Al confirmar te enviamos la ubicación exacta, un video de cómo llegar y cómo pagar el toque de muelle. ¿Otra residencia? <a href="${wa(`Hola Tu Lancha 👋 ¿Pueden buscarnos en mi residencia? Somos ${paxTxt()}.`)}" target="_blank" rel="noopener">Pregúntanos</a>.</small>`;
  const h = hoursFor(b, r, d);
  Q.hx = Math.max(0, Math.min(Q.hx || 0, h.maxX));
  $('#b-hours').innerHTML = `<div class="bl-h"><b>Horario</b><span class="lim">${hh(h.start)} a ${hh(h.end)}</span></div>
    <p class="rating">La tripulación prepara el regreso ${r.early ? '20 minutos antes' : 'a las 5:40 pm'}. ${h.why}</p>${vlink('horario', 'Ver video del horario')}
    ${h.maxX ? `<div class="hx"><span>Horas extra <small>(${money(b.hx)} c/u, en efectivo a bordo, hasta las ${hh(h.end + h.maxX)})</small></span><div class="qty"><button type="button" id="hx-m" aria-label="Menos horas extra">−</button><output id="hx">${Q.hx}</output><button type="button" id="hx-p" aria-label="Más horas extra">+</button></div></div>` : ''}
    <p class="rating"><small>¿Salir más temprano o regresar de noche? La navegación nocturna tiene costo adicional: <a href="${wa(`Hola Tu Lancha 👋 Quiero un horario especial para el ${fmtDay(qDate())} para ${paxTxt()}.`)}" target="_blank" rel="noopener">consúltalo por WhatsApp</a>.</small></p>`;
  const accOpt = Object.entries(b.opt);
  for (const k of Object.keys(Q.acc)) if (!(k in b.opt)) delete Q.acc[k];
  $('#b-extras').innerHTML = `${vlink('accesorios', 'Ver video: accesorios y facilidades')}<details class="pk"><summary>Equipamiento básico incluido en todas</summary>${basicHtml()}</details>
    ${b.inc.length ? `<div><h4>Ya viene en ${esc(b.name)}</h4><div class="amen">${b.inc.map(k => `<span class="tag">✓ ${ACC[k]}${k === 'parrilla' ? ' sin costo' : ''}</span>`).join('')}</div></div>` : ''}
    ${accOpt.length ? `<div><h4>Agrega a tu salida</h4><div class="opts">${accOpt.map(([k, p]) => `<button type="button" class="opt" data-acc="${k}" aria-pressed="${!!Q.acc[k]}"><b>${ACC[k]}</b><span class="p">+${money(p)}</span></button>`).join('')}</div></div>` : ''}
    <div class="food glass-card"><h4>Comida y bebidas</h4><p>Hielo y agua mineral ya están incluidos. Puedes traer todo lo que quieras, o pedirlo a <b>El Mercadillo</b> y te lo llevan al muelle antes de zarpar.</p>
      <div class="vrow">${vcard('comidas')}${vcard('mercadillo')}${['r2', 'r3'].includes(r.id) ? vcard('rincon') : ''}</div>
      <a class="btn btn-ghost btn-sm" href="${MERCADILLO}" target="_blank" rel="noopener">Pedir en El Mercadillo</a>
      ${['r2', 'r3'].includes(r.id) ? `<p class="rating"><b>Recomendado en tu rumbo:</b> Restaurante El Rincón Marino, en Playa Punta La Cruz. Comes a bordo o en tierra.</p>` : ''}</div>`;
}
function renderTicket() {
  const b = BOATS.find(x => x.id === Q.boat);
  if (!b) { window.TLL_LAST = null; $('#ticket').innerHTML = '<h3>Tu cotización</h3><p class="empty">Para grupos de más de 30 personas armamos una flotilla a la medida. Escríbenos.</p>'; return; }
  const r = ROUTES.find(x => x.id === Q.route) || ROUTES[0], d = qDate(), busy = isBusy(b, d), dk = dockById(Q.dock), dc = dockFor(b, dk);
  const lines = [[`${b.name} · ${fmtDay(d)}`, priceOn(b, d)]];
  if (kidExtra(b)) lines.push([`Excepción de niños (${kidExtra(b)} de 7 años o menos)`, kidExtra(b) * b.kidFee]);
  if (r.extra === null) lines.push([`Recargo ${r.name}`, 0, 'tbd']);
  if (dc.ok && dc.cost) lines.push([`Recogida en ${dk.name}`, dc.cost]);
  if (Q.hx) lines.push([`${Q.hx} h extra (efectivo a bordo)`, Q.hx * b.hx]);
  Object.entries(b.opt).filter(([k]) => Q.acc[k]).forEach(([k, p]) => lines.push([ACC[k], p]));
  const code = codeInfo(Q.code);
  const sub = lines.reduce((s, l) => s + l[1], 0);
  if (code.kind === 'ref') lines.push([`Código ${code.code} (−5%)`, -Math.round(sub * .05)]);
  if (code.kind === 'gift') lines.push([`Tarjeta de regalo ${code.code}`, -Math.min(sub, code.value)]);
  const total = Math.max(0, lines.reduce((s, l) => s + l[1], 0));
  const block = !dc.ok ? dc.why : !routeOk(b, r) ? `${b.name} no hace el ${r.name}` : !Q.beaches.length ? 'Elige al menos una playa' : '';
  const routeTxt = `${r.name} · ${Q.beaches.join(', ')}`;
  const h = hoursFor(b, r, dk);
  $('#ticket').innerHTML = `<h3>Tu cotización</h3>
    ${busy ? `<span class="flag amber"><i></i>${b.name} está ocupada ese día</span>` : `<span class="flag"><i></i>Disponible</span>`}
    <p class="t-pax">${paxTxt()}</p><p class="t-route">${esc(routeTxt)}<br><small>${dk.name} · ${hh(h.start)} a ${hh(h.end + (Q.hx || 0))}</small></p>
    <ul>${lines.map(l => `<li><span>${l[0]}</span><span>${l[2] === 'tbd' ? 'por confirmar' : money(l[1])}</span></li>`).join('')}</ul>
    <div class="total"><span>Total</span><span>${money(total)}</span></div>
    <div class="pp">${money(total / people())} por persona · abono para apartar ${money(total / 2)}${dk.fee ? `<br>Aparte, en el muelle: toque de ${dk.fee}` : ''}</div>
    <form class="code-in" id="code-form"><input id="q-code" placeholder="Código de amigo o de regalo" aria-label="Código de amigo o tarjeta de regalo" value="${esc(Q.code || '')}" autocomplete="off" autocapitalize="characters"><button class="btn btn-ghost on-sea btn-sm" type="submit">Aplicar</button></form>
    ${Q.code ? (code.kind ? `<span class="code-ok">✓ ${code.kind === 'ref' ? 'Descuento de amigo aplicado' : 'Tarjeta de regalo aplicada (' + money(code.value) + ')'}</span>` : `<span class="code-bad">Ese código no es válido. Revisa que esté bien escrito, por ejemplo ANA-7K2 o TLLG-B4XK.</span>`) : ''}
    <button class="btn btn-sun btn-lg" type="button" id="t-book">Reservar ahora</button>
    <p class="note">No pagas nada ahora: te confirmamos disponibilidad y abono. Fines de semana +${wkOf(b)}%.</p>`;
  $('#mb-total').textContent = money(total);
  window.TLL_LAST = { boat: b.name, type: b.type, route: routeTxt, dock: dk.name, dockFee: dk.fee || '', hours: `${hh(h.start)} a ${hh(h.end + (Q.hx || 0))}`, date: fmtDay(d), iso: Q.date, pax: people(), adults: Q.pax, kids: Q.kids, paxTxt: paxTxt(), lines, total, busy, block, promo: code.kind ? code.code : '' };
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
$('#pax-p').onclick = () => { Q.pax = Math.min(30, Q.pax + 1); renderBuilder(); };
$('#kid-m').onclick = () => { Q.kids = Math.max(0, (Q.kids || 0) - 1); renderBuilder(); };
$('#kid-p').onclick = () => { Q.kids = Math.min(10, (Q.kids || 0) + 1); renderBuilder(); };
$('#big-group').addEventListener('click', e => { if (e.target.closest('#bg-event')) { Q.boat = 'b8'; renderBuilder(); window.TLL.goStep && window.TLL.goStep(1); } });
$('#reservar').addEventListener('click', e => {
  if (e.target.closest('#hx-m')) { Q.hx = Math.max(0, Q.hx - 1); return renderBuilder(); }
  if (e.target.closest('#hx-p')) { Q.hx = Q.hx + 1; return renderBuilder(); }
  const bc = e.target.closest('[data-beach]');
  if (bc) {
    const n = bc.dataset.beach, b = BOATS.find(x => x.id === Q.boat);
    if (Q.beaches.includes(n)) { if (Q.beaches.length > 1) Q.beaches = Q.beaches.filter(x => x !== n); }
    else if (Q.beaches.length >= b.maxBeaches) { toast(`${b.name}: ${beachLimitText(b).toLowerCase()} por salida`); return; }
    else Q.beaches = [...Q.beaches, n];
    return renderBuilder();
  }
  const t = e.target.closest('.opt'); if (!t || t.disabled) return;
  if (t.dataset.boat) Q.boat = t.dataset.boat;
  if (t.dataset.route && t.dataset.route !== Q.route) { Q.route = t.dataset.route; Q.beaches = []; }
  if (t.dataset.acc) Q.acc[t.dataset.acc] = !Q.acc[t.dataset.acc];
  renderBuilder();
});
$('#reservar').addEventListener('submit', e => { if (e.target.id !== 'code-form') return; e.preventDefault(); Q.code = $('#q-code').value.trim().toUpperCase(); renderBuilder(); toast(codeInfo(Q.code).kind ? 'Código aplicado' : 'Código no válido'); });
$('#b-date').onchange = e => { if (e.target.value) { Q.date = e.target.value; renderBuilder(); } };
$('#b-dock').onchange = e => { Q.dock = e.target.value; renderBuilder(); };

/* ---------------- playas por rumbo ---------------- */
$('#beaches').innerHTML = `<div class="vintro">${vcard('playas', 'Conoce nuestras playas')}<div><h2>Antes de elegir</h2><p>Mira en un minuto cómo son nuestros rumbos y playas. Cada rumbo tiene su video abajo.</p></div></div>` + ROUTES.map(r => `<section class="rumbo-sec"><div class="rumbo-h"><div><span class="eyebrow">${r.name}</span><h2>${r.zone}</h2><p>${r.desc}</p></div><div class="tags rumbo-tags">${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}<span class="tag">~${r.min} min en lancha</span></div></div>${VID['rumbo' + r.id.slice(1)] ? `<div class="rumbo-v">${vcard('rumbo' + r.id.slice(1), 'Video del ' + r.name)}</div>` : ''}
  <div class="beaches">${r.beaches.map(n => `<article class="beach">${beachArt({ id: n, hue: r.hue })}<div class="in"><span class="km">${r.name.toUpperCase()}</span><h3>${esc(n)}</h3>
  <div class="ln"><a href="https://www.youtube.com/results?search_query=${encodeURIComponent('Tu Lancha Lechería ' + n)}" target="_blank" rel="noopener">Video</a><a href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Fotos</a><button type="button" data-goroute="${r.id}" data-gobeach="${esc(n)}" style="all:unset;cursor:pointer;color:var(--on-sea);font-weight:700">Ir aquí →</button></div></div></article>`).join('')}</div></section>`).join('')
  + `<div class="parks"><b>Cotización especial:</b>${SPECIAL.map(s => `<span class="tag">${s}</span>`).join('')}<a class="btn btn-wa btn-sm" href="${wa(`Hola Tu Lancha 👋 Quiero una cotización especial para ${SPECIAL.join(' / ')}.`)}" target="_blank" rel="noopener">Pedir cotización</a></div>`;
$('#beaches').addEventListener('click', e => { const g = e.target.closest('[data-goroute]'); if (g) { Q.route = g.dataset.goroute; Q.beaches = [g.dataset.gobeach]; renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); } });

/* ---------------- experiencias: canales y pesca ---------------- */
const CQ = { opt: 'l', pax: 6, ex: {} };
function canalPrice() { const o = CANALES.opts.find(x => x.id === CQ.opt); const base = o.flat ?? o.pp * Math.max(CQ.pax, o.min); return base + CANALES.extras.filter(x => CQ.ex[x[0]]).reduce((s, x) => s + x[2], 0); }
function renderCanales() {
  const el = $('#canales'); if (!el) return;
  const o = CANALES.opts.find(x => x.id === CQ.opt);
  CQ.pax = Math.max(1, Math.min(CQ.pax, o.max));
  el.innerHTML = `<article class="canal glass-card">
    <div class="canal-in"><span class="eyebrow">Experiencia aparte · cupos limitados</span><h2>Paseo por los canales de El Morro</h2>
      <p>Recorre los canales del Complejo Turístico El Morro al caer la tarde. Todos los días desde las 5:30 pm, con reserva previa. Duración: 1 h 30 min.</p>
      <ul class="chk"><li>Sale de C.C. Plaza Mayor, Muelle Aquavic, Hotel Maremares o tu residencia (toque de muelle aparte)</li><li>No incluye bebidas, hielo ni pasapalos; puedes traer tu cava</li><li>Fines de semana con disponibilidad limitada: las embarcaciones prefieren salir a las islas</li></ul>
      <a class="btn btn-ghost btn-sm" href="${CANALES.video}" target="_blank" rel="noopener">Ver el video del paseo</a></div>
    <form class="canal-f" id="canal-form">
      <div class="opts">${CANALES.opts.map(x => `<button type="button" class="opt" data-copt="${x.id}" aria-pressed="${x.id === CQ.opt}"><b>${x.name}</b><span>${x.flat ? `Hasta ${x.max} personas` : `Mín. ${x.min}, máx. ${x.max}`}</span><span class="p">${x.flat ? money(x.flat) : money(x.pp) + ' por persona'}</span></button>`).join('')}</div>
      <div class="two"><div class="field"><label for="c-pax">Personas</label><input id="c-pax" type="number" min="1" max="${o.max}" value="${CQ.pax}" inputmode="numeric"></div><div class="field"><label for="c-date">Fecha</label><input id="c-date" type="date" min="${iso(today)}" value="${CQ.date || iso(new Date(today.getTime() + 3 * 864e5))}"></div></div>
      <div class="field"><label for="c-dock">Salida</label><select id="c-dock">${CANALES.docks.map(d => `<option ${d === CQ.dock ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div class="amen">${CANALES.extras.map(x => `<button type="button" class="pill" data-cex="${x[0]}" aria-pressed="${!!CQ.ex[x[0]]}">${x[1]} +${money(x[2])}</button>`).join('')}</div>
      <div class="total"><span>Total estimado</span><b id="c-total">${money(canalPrice())}</b></div>
      ${!o.flat && CQ.pax < o.min ? `<p class="rating">Se cobra el mínimo de ${o.min} personas.</p>` : ''}
      <button class="btn btn-wa" type="submit">Solicitar este paseo</button>
    </form></article>
    <article class="canal canal-sm glass-card"><div class="canal-in"><span class="eyebrow">Experiencia aparte · cupos limitados</span><h2>Pesca deportiva</h2><p>Salida con capitán pescador y equipo. Disponibilidad limitada, sobre todo los fines de semana: escríbenos con tu fecha y armamos la salida.</p>
      <a class="btn btn-wa btn-sm" href="${wa('Hola Tu Lancha 👋 Me interesa un chárter de pesca. ¿Qué fechas tienen?')}" target="_blank" rel="noopener">Consultar disponibilidad</a></div></article>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copt]'); if (c) { CQ.opt = c.dataset.copt; const o = CANALES.opts.find(x => x.id === CQ.opt); CQ.pax = Math.max(o.min, Math.min(CQ.pax, o.max)); return renderCanales(); }
  const x = e.target.closest('[data-cex]'); if (x) { CQ.ex[x.dataset.cex] = !CQ.ex[x.dataset.cex]; renderCanales(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'c-pax') { CQ.pax = +e.target.value || 1; renderCanales(); }
  if (e.target.id === 'c-date') CQ.date = e.target.value;
  if (e.target.id === 'c-dock') CQ.dock = e.target.value;
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'canal-form') return; e.preventDefault();
  const o = CANALES.opts.find(x => x.id === CQ.opt), dt = $('#c-date').value;
  const [yy, mm, dd] = (dt || iso(today)).split('-').map(Number);
  const ex = CANALES.extras.filter(x => CQ.ex[x[0]]).map(x => '➕ ' + x[1]).join('\n');
  const a = document.createElement('a');
  a.href = wa(`Hola Tu Lancha 👋 Quiero el paseo por los canales de El Morro.\n⛵ ${o.name}\n👥 ${CQ.pax} personas\n📅 ${fmtDay(new Date(yy, mm - 1, dd))} desde las 5:30 pm\n⚓ ${$('#c-dock').value}\n${ex ? ex + '\n' : ''}💵 Total estimado: ${money(canalPrice())}\n¿Tienen cupo?`);
  a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
});
renderCanales();
$('#exps').innerHTML = EXPS.map(x => `<div class="exp"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${x[2]}</svg></span><h3>${x[0]}</h3><p>${x[1]}</p><a href="${wa(`Hola Tu Lancha 👋 Me interesa la experiencia "${x[0]}". ¿Me dan información?`)}" target="_blank" rel="noopener">Pedir propuesta →</a></div>`).join('');
$('#ally-videos') && ($('#ally-videos').innerHTML = vcard('mercadillo') + vcard('rincon') + vcard('comidas'));
$('#allies').innerHTML = ALLIES.map(c => `<div class="cat"><h3>${c.cat}</h3>${c.items.map(([n, d, u, col]) => `<a class="ally" href="${u || wa(`Hola Tu Lancha 👋 Quiero agregar ${n} a mi salida.`)}" target="_blank" rel="noopener"><span class="av" style="background:${col}">${n.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><div><b>${n}</b><span>${d}</span></div><span class="vip">VIP</span></a>`).join('')}</div>`).join('');

/* ---------------- pool ---------------- */
$('#p-dock').innerHTML = MAIN_DOCKS.map(d => `<option>${d.name}</option>`).join('') + '<option>Otro</option>';
$('#pool-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = id => $('#' + id).value.trim();
  const a = document.createElement('a');
  a.href = wa(`Hola Tu Lancha 👋 Quiero formar parte del pool.\n👤 ${v('p-name')} (${v('p-phone')})\n⛵ ${v('p-boat')} · ${v('p-pax') || '?'} pers.\n⚓ ${v('p-dock')} · ${v('p-park')}\n📝 ${v('p-note')}`);
  a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  toast('Abrimos WhatsApp con tu postulación lista para enviar');
});

/* ---------------- portal del propietario (demo local) ---------------- */
let ob = BOATS[0];
$('#o-boat').innerHTML = BOATS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
function ownerKpis() {
  const y = today.getFullYear(), m = today.getMonth(), n = new Date(y, m + 1, 0).getDate();
  let busy = 0, inc = 0;
  for (let i = 1; i <= n; i++) { const d = new Date(y, m, i); if (isBusy(ob, d)) { busy++; inc += priceOn(ob, d); } }
  $('#k-res').textContent = busy; $('#k-inc').textContent = money(inc * .8); $('#k-occ').textContent = Math.round(busy / n * 100) + '%';
}
function renderOwner() {
  $('#o-rate').value = rateOf(ob); $('#o-wk').value = wkOf(ob);
  calendar($('#o-cal'), ob, { owner: true, onPick: d => { owner[ob.id] ??= {}; owner[ob.id].busy ??= {}; owner[ob.id].busy[iso(d)] = !isBusy(ob, d); ownerKpis(); } });
  ownerKpis();
}
$('#o-boat').onchange = e => { ob = BOATS.find(b => b.id === e.target.value); renderOwner(); };
$('#o-rate').oninput = e => { const v = +e.target.value; if (v >= 50) { owner[ob.id] ??= {}; owner[ob.id].rate = v; ownerKpis(); } };
$('#o-wk').onchange = e => { owner[ob.id] ??= {}; owner[ob.id].wk = +e.target.value; ownerKpis(); };
$('#o-save').onclick = () => { store.set('owner', owner); renderBoats(); renderBuilder(); renderOwnFeature(); toast(`Guardado: ${ob.name} actualizada en el catálogo`); };

/* ---------------- toast, instalación ---------------- */
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
let deferred; addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#install').hidden = false; });
$('#install').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#install').hidden = true; };
if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai') && !location.hostname.includes('artifact')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

renderBoats(); renderBuilder(); renderOwnFeature(); renderOwner();

window.TLL = { renderBoats, renderTicket, $, $$, wa, art, beachArt, rnd, money, store, toast, esc, Q, renderBuilder, BOATS, ROUTES, DOCKS, EXTRAS, ACC, BASIC, OWN, iso, fmtDay, refCode, codeInfo, GIFT_VALUES, AL, today, priceOn, openBoat, openVideo, VID, currency };
document.addEventListener('click', e => { const k = e.target.closest('[data-book]'); if (!k) return; const b = BOATS.find(x => x.id === k.dataset.book); if (!b) return; Q.boat = b.id; fitTo(b); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(0), 0); });
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
const ROUTE_PLACE = { r1: 'chimana', r2: 'plata', r3: 'arapo', r4: 'mochima' };
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
    <div class="view-h"><div style="display:grid;gap:4px"><span class="eyebrow"><span class="live-dot" aria-hidden="true"></span>&nbsp;En vivo · Reserva ${code}</span><h2 id="m-title" style="font-size:1.6rem">Rumbo a ${route.beaches[0]}</h2></div>
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
const waText = r => `Hola Tu Lancha 👋 Hice una reserva en la app.\n🔖 Código: ${r.code}\n👤 ${r.name}${r.phone ? ' · ' + r.phone : ''}\n👥 ${r.paxTxt || r.pax + ' personas'}\n⛵ ${r.boat}\n📅 ${r.date}${r.hours ? ' · ' + r.hours : ''}\n🏝️ ${r.route}\n⚓ ${r.dock}\n${r.lines.slice(1).map(l => (l[1] < 0 ? '🎁 ' : '➕ ') + l[0] + (l[2] === 'tbd' ? ' (por confirmar)' : '')).join('\n')}${r.lines.length > 1 ? '\n' : ''}💵 Total estimado: ${money(r.total)}${r.note ? '\n📝 ' + r.note : ''}${r.accepted ? '\n✅ Acepté las condiciones de alquiler (' + POLICY_REV + ')' : ''}\n¿Me confirman disponibilidad y el abono?`;
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
    <div class="bk-terms"><h4>Condiciones principales</h4><ul>${POLICY_SHORT.map(x => `<li>${x}</li>`).join('')}</ul>${policyHtml()}
      <label class="bk-ok"><input type="checkbox" id="bk-ok" required> <span>Leí y acepto las condiciones de alquiler</span></label></div>
    <button class="btn btn-sun btn-lg" type="submit" id="bk-go">Confirmar reserva</button>
    <p class="bk-fine">No pagas nada ahora. Tu Lancha confirma la disponibilidad y te indica el abono (50%) para apartar la fecha.</p>
  </form>`;
  closeOn(dlg);
  $('#bk-form', dlg).onsubmit = e => {
    e.preventDefault();
    const name = $('#bk-name', dlg).value.trim(), phone = $('#bk-phone', dlg).value.trim();
    if (name.length < 2) { $('#bk-name', dlg).focus(); toast('Escribe tu nombre para la reserva'); return; }
    if (!$('#bk-ok', dlg).checked) { $('#bk-ok', dlg).focus(); toast('Para reservar, acepta las condiciones de alquiler'); return; }
    store.set('me', { name, phone });
    const r = { ...q, code: newCode(), name, phone, note: $('#bk-note', dlg).value.trim(), created: Date.now(), accepted: Date.now(), sent: false };
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
    <ol class="bk-next"><li class="ok">Reserva guardada en tu app</li><li id="bk-li-send" class="${r.sent ? 'ok' : 'now'}">Avisar a Tu Lancha con un toque</li><li>Te confirmamos disponibilidad y abono, y te enviamos la ubicación del muelle, un video de cómo llegar y cómo pagar el toque de muelle</li></ol>
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

(() => {
'use strict';
const { $, $$, Q, renderBuilder, BOATS } = window.TLL;
const VIEWS = $$('.page').map(v => v.dataset.view);
const ALIAS = { flota: 'embarcaciones', lanchas: 'embarcaciones', canales: 'experiencias', cotizar: 'reservar', pool: 'propietarios', club: 'regalos', referidos: 'regalos', preguntas: 'nosotros', mar: 'inicio', 'inicio-mas': 'inicio' };
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
  if (current && current !== name && document.startViewTransition && !reduce.matches) { const vt = document.startViewTransition(swap); [vt.ready, vt.finished, vt.updateCallbackDone].forEach(x => x && x.catch(() => {})); } else swap();
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
  if (step === 3) { nx.textContent = 'Reservar ahora'; } else { nx.textContent = 'Siguiente'; }
}
$('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goStep(+b.dataset.go); });
$('#st-back').onclick = () => { goStep(step - 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); };
$('#st-next').onclick = () => {
  if (step < 3) { goStep(step + 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); }
  else window.TLL.openBooking();
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
  mb.classList.toggle('show', on); mb.setAttribute('aria-hidden', String(!on)); $('#mb-book').tabIndex = on ? 0 : -1;
}

/* ---------- menú ---------- */
const sheet = $('#sheet');
function openSheet() { sheet.hidden = false; $$('#menu-open,#menu-open-2').forEach(b => b.setAttribute('aria-expanded', 'true')); setTimeout(() => $('#menu-close').focus(), 30); }
function closeSheet() { if (sheet.hidden) return; sheet.hidden = true; $$('#menu-open,#menu-open-2').forEach(b => b.setAttribute('aria-expanded', 'false')); }
$('#menu-open').onclick = openSheet; $('#menu-open-2').onclick = openSheet; $('#menu-close').onclick = closeSheet;
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('a')) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- carrusel del hero: fundido lento + Ken Burns, como un video ---------- */
const reel = $('#hero-reel'), slides = $$('#hero-reel .slide');
const saveData = navigator.connection && navigator.connection.saveData;
let slideI = 0, reelT = 0, reelSeen = true;
function nextSlide() {
  const a = slides[slideI]; slideI = (slideI + 1) % slides.length; const b = slides[slideI];
  a.classList.add('out'); a.classList.remove('on'); b.classList.remove('out'); b.classList.add('on');
  setTimeout(() => { if (!a.classList.contains('on')) a.classList.remove('out'); }, 3200);
}
function syncVideo() {
  if (!reel) return;
  const want = current === 'inicio' && !reduce.matches && !saveData && document.visibilityState === 'visible' && reelSeen;
  reel.classList.toggle('paused', !want);
  if (want && !reelT) reelT = setInterval(nextSlide, 7000);
  if (!want && reelT) { clearInterval(reelT); reelT = 0; }
}
document.addEventListener('visibilitychange', syncVideo);
reduce.addEventListener?.('change', syncVideo);
if (reel) new IntersectionObserver(es => { reelSeen = es[0].isIntersecting; syncVideo(); }).observe(reel);

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
