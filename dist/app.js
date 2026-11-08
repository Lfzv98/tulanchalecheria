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
$('#dlg').addEventListener('close', () => { clearInterval(liveTimer); $('#dlg').className = ''; if (['#viaje', '#album', '#a-bordo'].includes(location.hash) || /^#(sigue|a-bordo|album)\//.test(location.hash)) history.replaceState(null, '', '#mi-viaje'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
$$('.trip-code').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault(); const c = $('input', f).value.trim().toUpperCase();
  if (!validTrip(c)) { toast('Escribe el código que te enviamos, por ejemplo TLL-1105'); return; }
  f.dataset.go === 'viaje' ? openLive(c) : openAlbum(c);
}));
function route() { if (location.hash === '#viaje') openLive('TLL-1105'); if (location.hash === '#album') openAlbum('TLL-1105'); if (location.hash === '#a-bordo' && !$('#dlg').open) openAbordo(''); const f = location.hash.match(/^#sigue\/([a-z2-9]{20})$/); if (f && !$('#dlg.follow-dlg[open]')) openFollow(f[1]); }
addEventListener('hashchange', route); route();
Object.assign(window.TLL, { openAbordo, openAlbum });

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
      await navigator.share({ files: [file], title: `Comprobante ${r.code}`, text: `Reserva ${r.code} · Tu Lancha Lechería. Elige WhatsApp y envíalo a Tu Lancha (+58 414 308 3864).` });
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
  const d = new jsPDF({ unit: 'mm', format: 'a4', compress: true }), W = 210, M = 16;
  const NAVY = [13, 27, 46], INK = [21, 26, 51], MUT = [104, 112, 133], GOLD = [196, 160, 82], LINE = [226, 230, 238], SOFT = [245, 247, 251];
  const col = c => d.setTextColor(...c), fill = c => d.setFillColor(...c), draw = c => d.setDrawColor(...c);
  d.setProperties({ title: `Comprobante de reserva ${r.code}`, author: 'Tu Lancha Lechería', subject: 'Comprobante de reserva', creator: 'Tu Lancha Lechería' });
  // cabecera
  d.addImage(head, 'JPEG', 0, 0, W, 70);
  col(GOLD); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setCharSpace(1.2); d.text('COMPROBANTE DE RESERVA', 44, 20); d.setCharSpace(0);
  col([255, 255, 255]); d.setFontSize(22); d.text('Tu Lancha Lechería', 44, 30);
  d.setFont('helvetica', 'normal'); d.setFontSize(9.5); col([220, 226, 236]); d.text('Chárters y paseos a Mochima y las islas · Lechería, Anzoátegui', 44, 37);
  fill([255, 255, 255]); d.roundedRect(W - M - 52, 48, 52, 15, 3, 3, 'F'); col(MUT); d.setFontSize(7); d.text('CÓDIGO DE RESERVA', W - M - 26, 53.5, { align: 'center' }); col(NAVY); d.setFont('courier', 'bold'); d.setFontSize(13); d.text(r.code, W - M - 26, 60, { align: 'center' });
  d.setFont('helvetica', 'normal'); d.setFontSize(8.5); col([210, 216, 228]); d.text(`Emitido: ${new Date(r.created || Date.now()).toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' })}`, M, 62);
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
  if (h === 'viaje' || h === 'album' || h.startsWith('sigue/')) return ['mi-viaje', null];
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
  if (want && !reelT && slides.length > 1) reelT = setInterval(nextSlide, 7000);
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
