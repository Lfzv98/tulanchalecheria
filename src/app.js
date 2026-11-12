(() => {
'use strict';
let WA = '584143083864';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wa = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('tll:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tll:' + k, JSON.stringify(v)); } catch {} }
};
const currency = 'USD';
const money = usd => '$' + Math.round(usd).toLocaleString(TLL_I18N.loc());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------------- datos ----------------
   Rumbos, muelles, horario, paquete básico y políticas: reales, según Eduardo (nov. 2026).
   Embarcaciones, tarifas y extras con precio: DE EJEMPLO hasta cargar la flota real. */

// Muelles sugeridos (servicio por uso de muelle: lo cobra el establecimiento y se paga en sitio)
// y recogidas en residencias (costo de Tu Lancha según el tamaño de la embarcación: s lancha pequeña, m lancha mediana, my mini yate, y yate o barco)
// baseFree: las embarcaciones que tienen su base en ese muelle no pagan el servicio de muelle.
const DOCKS = [
  { id: 'pm', name: 'C.C. Plaza Mayor', fee: '$30', park: 'Estacionamiento público con vigilancia' },
  { id: 'mm', name: 'Hotel Maremares', fee: '$11,6 a tasa BCV', park: 'Estacionamiento privado con vigilancia' },
  { id: 'av', name: 'Marina Américo Vespucio', fee: '$34 a tasa BCV', park: 'Estacionamiento privado con vigilancia', baseFree: true },
  { id: 'ppa', name: 'Hotel Punta Palma', off: true, why: 'Muelle deshabilitado' },
  { id: 'em', name: 'Cerro El Morro · Eurobuilding', pickup: true, cost: { s: 15, m: 20, my: 30, y: 50 }, back: '5:30 pm' },
  { id: 'rem', name: 'Resto del Complejo Turístico El Morro', pickup: true, cost: { s: 0, m: 0, my: 0, y: 0 } },
  { id: 'pmr', name: 'Puerto Mares y Residencias Cayo de Agua', pickup: true, lanchaOnly: true, cost: { s: 20, m: 20 } },
  { id: 'ppr', name: 'Puerto Príncipe', pickup: true, lanchaOnly: true, cost: { s: 20, m: 20 } },
  { id: 'cal', name: 'La Caleta', pickup: true, off: true, why: 'Bajo calado · no disponible' }
];
const MAIN_DOCKS = DOCKS.filter(d => !d.pickup && !d.off);
const SIZES = { s: 'Lancha pequeña', m: 'Lancha mediana', my: 'Mini yate', y: 'Yate o barco' };
// tamaño de la embarcación para el costo de recogida (Eduardo lo puede fijar a mano en el panel)
const sizeOf = b => b.size && SIZES[b.size] ? b.size : b.type === 'Lancha' ? (b.ft <= 26 ? 's' : 'm') : b.type === 'Mini yate' ? 'my' : 'y';

// Paquete básico: lo incluyen TODAS las embarcaciones
const BASIC = ['Tripulación según el tamaño de la embarcación', 'Capitanes con más de 10 años de experiencia', 'Chalecos salvavidas para todos', 'Ducha de agua dulce', 'Botiquín de primeros auxilios', 'Embarcación con documentación al día', 'Cava con hielo', 'Agua mineral suficiente para todos'];

// Accesorios: cada embarcación dice cuáles trae incluidos (inc) y cuáles cobra aparte (opt)
const ACC = { sonido: 'Sonido (integrado o Bluetooth)', internet: 'Internet a bordo', cargador: 'Cargador de teléfono', mat: 'Alfombra flotante', flot: 'Flotadores básicos', flotlux: 'Flotadores de lujo', snorkel: 'Careta de buceo', paddle: 'Paddle board', kayak: 'Kayak', kids: 'Juguetes para niños', lona: 'Lona lateral', dron: 'Video con dron', cam: 'Cámara subacuática', parrilla: 'Parrillera' };
// la parrillera siempre lleva esta aclaración, para que el cliente sepa qué traer
const PARRILLA_NOTE = 'Incluye utensilios, tabla para picar y bandeja. Tú traes el carbón, la proteína y los condimentos; recomendamos platos y cubiertos desechables.';
// nombre del accesorio con su cantidad (p. ej. caretas de buceo)
const accName = (b, k) => k === 'snorkel' && b && b.qty && +b.qty.snorkel > 0 ? `Caretas de buceo (${+b.qty.snorkel})` : ACC[k] || k;

/* Campos por embarcación:
   own: la lancha de Eduardo (va primero y destacada) · maxBeaches: playas por salida (lancha 3; barco, mini yate y yate 2)
   pax: puestos de la licencia · kx: niños de 7 años o menos que caben además de esos puestos (sin costo extra)
   rp: precio por rumbo {r1: 350, r4: null (no hace ese rumbo), r6: true (lo hace, precio por confirmar)}; si falta, se usa la tarifa base
   late: hasta qué hora puede quedarse (20 = 8:00 pm) · hx: costo de cada hora extra · kts: velocidad de crucero (nudos)
   pick: excepciones de recogida por calado ({pmr: null} = no llega; {em: 0} = sin costo) · docks: muelles desde donde puede salir (vacío = todos)
   photos: proa, popa, social, camarote, habitacion, bano, accesorios (las que falten no se muestran)
   docs: vencimientos de licencia de navegación, radio, patrón del capitán y combustible (solo los ve Eduardo) */
const DEF_BOATS_SRC = [
  { id: 'b0', own: true, name: 'Lancha de la casa', type: 'Lancha', ft: 24, pax: 5, kx: 3, price: 350, hue: 200, dock: 0, cabin: false, rating: 5.0, trips: 500, late: 20, hx: 40, pick: { em: 20 }, rp: { r4: true, r6: true },
    inc: ['sonido', 'internet', 'parrilla', 'snorkel', 'flotlux', 'mat', 'lona'], opt: {}, qty: { snorkel: 4 }, amen: ['Internet a bordo', 'Flotadores de lujo', 'Alfombra en el agua', 'Parrillera', 'Toldo', 'Sonido JL Audio', 'Lona lateral'], desc: 'La embarcación de Tu Lancha, atendida por nuestra propia tripulación. Es la que más eligen nuestros clientes.' },
  { id: 'b1', name: 'Bravo 32', type: 'Lancha', ft: 32, pax: 10, price: 320, hue: 205, dock: 0, cabin: false, rating: 4.9, trips: 214, inc: ['sonido', 'snorkel', 'cargador'], opt: { parrilla: 20, mat: 25 }, amen: ['Toldo', 'Cava'], desc: 'Lancha deportiva rápida y cómoda, ideal para grupos que quieren llegar primero a la playa. Doble motor fuera de borda.' },
  { id: 'b9', name: 'Promar 34', type: 'Lancha', ft: 34, pax: 10, price: 380, hue: 210, dock: 2, cabin: false, rating: 4.8, trips: 132, maxBeaches: 2, rp: { r5: true }, inc: ['sonido', 'snorkel'], opt: { parrilla: 20 }, amen: ['Toldo', 'Escalera'], desc: 'Lancha amplia para recorrer islas y hacer snorkel. Por su tamaño, visita hasta 2 playas por salida.' },
  { id: 'b4', name: 'Morro Sport 27', type: 'Lancha', ft: 27, pax: 8, kx: 2, price: 230, hue: 170, dock: 2, cabin: false, rating: 4.8, trips: 305, pick: { pmr: null }, inc: ['sonido', 'flot'], opt: {}, amen: ['Toldo', 'Escalera de baño'], desc: 'La opción práctica para grupos pequeños. Ágil, económica y siempre puntual.' },
  { id: 'b7', name: 'Plata 30', type: 'Lancha', ft: 30, pax: 10, price: 290, hue: 195, dock: 0, cabin: false, rating: 4.7, trips: 241, late: 20, hx: 40, inc: ['sonido', 'flot'], opt: { parrilla: 20, kayak: 30, flotlux: 15 }, amen: ['Toldo', 'Proa amplia'], desc: 'Bowrider con mucho espacio en proa. Buena relación precio/capacidad para grupos medianos.' },
  { id: 'b5', name: 'Mochima 36', type: 'Mini yate', ft: 36, pax: 12, price: 450, hue: 215, dock: 1, cabin: true, rating: 4.9, trips: 176, kts: 22, rp: { r4: true }, inc: ['sonido', 'snorkel', 'cargador'], opt: { parrilla: 20, paddle: 30 }, amen: ['Camarote de proa', 'Baño'], desc: 'Mini yate con camarote y baño. Muy cómodo para familias y grupos que buscan sombra y privacidad.' },
  { id: 'b2', name: 'Arapo 40', type: 'Barco', ft: 40, pax: 12, price: 950, hue: 190, dock: 1, cabin: true, rating: 5.0, trips: 98, kts: 18, inc: ['sonido', 'parrilla', 'paddle'], opt: { dron: 60 }, amen: ['Malla de proa', '2 baños', 'Camarotes'], desc: 'Barco estable y amplio, perfecto para celebraciones y grupos grandes. Malla de proa para tomar sol sobre el mar.' },
  { id: 'b8', name: 'Caribe 48', type: 'Barco', ft: 48, pax: 30, price: 1400, hue: 185, dock: 1, cabin: true, rating: 4.9, trips: 57, kts: 14, inc: ['sonido', 'kayak', 'kids'], opt: { dron: 60 }, amen: ['Barra', '4 baños', 'Tobogán'], desc: 'Barco de eventos, el más grande. Pensado para fiestas en el mar con DJ y servicio de barra.' },
  { id: 'b3', name: 'Chimana 52', type: 'Yate', ft: 52, pax: 12, price: 1650, hue: 225, dock: 0, cabin: true, rating: 4.9, trips: 61, kts: 26, rp: { r4: true, r5: true, r6: true }, late: 20, hx: 80, inc: ['sonido', 'internet', 'mat', 'snorkel', 'paddle', 'flotlux'], opt: { parrilla: 20, dron: 60, cam: 30 }, amen: ['Flybridge', 'Aire acondicionado', '3 camarotes', 'Generador'], desc: 'Yate con flybridge y salón climatizado. Para salidas premium y eventos corporativos.' },
  { id: 'b6', name: 'Borracha 45', type: 'Yate', ft: 45, pax: 12, price: 1200, hue: 235, dock: 2, cabin: true, rating: 4.8, trips: 83, kts: 24, rp: { r4: true }, inc: ['sonido', 'mat'], opt: { parrilla: 20 }, amen: ['Salón', '2 camarotes', 'Aire acondicionado', 'Plataforma de baño'], desc: 'Yate clásico de crucero con salón amplio y plataforma de baño a nivel del agua.' }
];
const normBoat = b => { b.maxBeaches ??= b.type === 'Lancha' ? 3 : 2; b.opt ??= {}; b.inc ??= []; b.amen ??= []; b.pick ??= {}; b.rp ??= {}; b.qty ??= {}; b.photos ??= {}; b.kx = Math.max(0, +b.kx || 0); b.rating ??= 5; b.trips ??= 0; b.hue ??= 200; b.dock ??= 0; return b; };
const BOATS = JSON.parse(JSON.stringify(DEF_BOATS_SRC)).map(normBoat);
const OWN = BOATS.find(b => b.own) || BOATS[0];

// Rumbos: nunca se cruzan. nm: millas náuticas aproximadas desde Lechería.
// add: diferencia sobre la tarifa base cuando la embarcación no tiene precio propio para ese rumbo (vacío = precio por confirmar).
// open: false = solo lo hacen las embarcaciones que lo tienen marcado en su precio por rumbo.
const ROUTES = [
  { id: 'r1', name: 'Rumbo 1', zone: 'Chimanas y Puinare', nm: 7, min: 20, hue: 190, add: 0, beaches: ['El Saco', 'Puinare', 'Puinarito', 'Ensenada · Bahía del Silencio', 'Playa El Faro (Chimana Grande)', 'Chimana Segunda'], tags: ['Aguas calmas', 'Ideal para niños'], desc: 'Las islas más cercanas, con aguas tranquilas.' },
  { id: 'r2', name: 'Rumbo 2', zone: 'Isla de Plata y Punta La Cruz', nm: 9, min: 25, hue: 185, add: 0, beaches: ['Isla de Plata', 'Punta La Cruz', 'Playa El Faro', 'Playa Varadero'], tags: ['Aguas cristalinas', 'Restaurante en la playa'], desc: 'Aguas cristalinas y comida en El Rincón Marino, en Punta La Cruz.' },
  { id: 'r3', name: 'Rumbo 3', zone: 'Islas Arapo · estado Sucre', nm: 19, min: 45, hue: 175, add: null, plus: 'r2', beaches: ['Islas Arapo', 'La Piscina', 'Playa Ñacleta'], tags: ['Más probabilidad de delfines'], desc: 'Unas 10 millas náuticas más lejos que el Rumbo 2. Puedes sumar playas del Rumbo 2.' },
  { id: 'r4', name: 'Rumbo 4', zone: 'Isla La Borracha y Puinare', nm: 12, min: 35, hue: 200, add: null, open: false, beaches: ['Isla La Borracha'], tags: ['Solo algunas embarcaciones'], desc: 'Rumbo hacia Isla La Borracha. Solo lo hacen algunas embarcaciones.' },
  { id: 'r5', name: 'Rumbo 5', zone: 'Isletas de Píritu', nm: 22, min: 55, hue: 170, add: null, open: false, early: true, beaches: ['Isletas de Píritu'], tags: ['9:00 am a 5:00 pm', 'Solo con buen mar'], desc: 'Islotes de arena frente a Píritu. Solo algunas embarcaciones y con buen mar.' },
  { id: 'r6', name: 'Rumbo 6', zone: 'Manare y Playa Blanca', nm: 24, min: 60, hue: 180, add: null, open: false, early: true, beaches: ['Playa Manare', 'Playa Blanca'], tags: ['Solo con buen mar', '9:00 am a 5:00 pm'], desc: 'Solo algunas embarcaciones y solo en temporada de buen mar.' }
];
const SPECIAL = ['Isla La Tortuga', 'Islas Caracas', 'Margarita'];

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
  { cat: 'Estadía', items: [['Posada Mochima', 'Alojamiento frente a la bahía', '', '#2b8a4b']] },
  // owners: se muestra en la página de Propietarios (beneficios para dueños de embarcaciones)
  { cat: 'Para propietarios', owners: true, items: [['Servicio de capitán', 'Capitán y marinero para tu embarcación, con accesorios si los necesitas', '', '#16759b'], ['Alquiler de inflables y accesorios', 'Flotadores, inflables, antena de internet y más para tu salida', '', '#1e9b8f']] }
];
const EXPS = [
  ['Pedida de mano', 'Decoración, fotógrafo escondido y brindis en el mar.', '<path d="M12 21s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/>'],
  ['Cumpleaños en el mar', 'Torta, decoración y música a bordo.', '<path d="M4 21h16M5 21v-7h14v7M12 14V9M12 6v.01M8 14v-2M16 14v-2"/>'],
  ['Corporativo', 'Integraciones de equipo y atención a clientes con factura.', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>']
];
const EXTRAS = Object.entries(ACC).map(([id, name]) => ({ id, name }));

/* ---------------- catálogo editable desde el panel de Eduardo ----------------
   El panel publica en /api/admin?a=cat los datos reales (embarcaciones, fotos, rumbos, muelles, pagos, aliados).
   Aquí se aplican sobre los datos de arriba, que quedan como respaldo. Se guarda una copia en el teléfono
   para que la app abra al instante y luego se actualiza sola. */
const clone = o => JSON.parse(JSON.stringify(o));
/* cuentas para el abono: el cliente ve solo la Zelle marcada como principal (zelleOn); Eduardo la cambia desde el panel */
const DEF_PAY = {
  zelles: [
    { name: 'Avantek Solutions LLC', email: 'administracion@avanteksolutions.com' },
    { name: 'Eduardo Restrepo', email: 'eduardo.escobar@avanteksolutions.com' },
    { name: 'Diana de Escobar', email: 'rrhh@avanteksolutions.com' },
    { name: 'Hilda Salazar', email: 'lacati83@hotmail.com' }
  ],
  zelleOn: 0,
  binance: '23928727', binanceUser: 'tradersince2016', binanceMail: 'eduardo.escobar@avanteksolutions.com',
  binanceLink: 'https://app.binance.com/uni-qr/HvBFHrx1', binanceQR: 'icons/binance-qr.png',
  paypal: '', paypalFee: 4.5   // PayPal: correo o enlace; la comisión se suma al abono
};
/* Tienda a bordo: accesorios que Tu Lancha tiene en stock y se pueden sumar a cualquier salida.
   Sin precio no se muestran: Eduardo los activa desde el panel cuando los tenga. */
const DEF_SHOP = [
  { id: 'toalla', name: 'Toalla de playa', price: 0 }, { id: 'termo', name: 'Termo', price: 0 },
  { id: 'antena', name: 'Antena de internet con cargador', price: 0 }, { id: 'flor', name: 'Inflable gigante de flor', price: 0 },
  { id: 'balsa', name: 'Balsa con remo', price: 0 }
];
// portada: foto principal y las imágenes de las pantallas flotantes (vacías = imagen difuminada de relleno)
const DEF_HOME = { hero: '', cards: {} };
const DEF = { boats: clone(DEF_BOATS_SRC), routes: clone(ROUTES), docks: clone(DOCKS), allies: clone(ALLIES), basic: clone(BASIC), special: clone(SPECIAL), wa: WA, pay: clone(DEF_PAY), shop: clone(DEF_SHOP), home: clone(DEF_HOME) };
/* Catálogos publicados antes del 12 nov: se pasan al formato nuevo sin perder lo que Eduardo ya cargó
   (fotos, precios, playas, aliados). Lo usan la web y el panel; al publicar desde el panel queda guardado. */
const CAT_V = 2;
function migrateCat(c) {
  c = c && typeof c === 'object' ? clone(c) : {};
  if ((c.v || 1) >= CAT_V) return c;
  const PH = { drone: 'proa', exterior: 'popa', interior: 'social' };
  if (Array.isArray(c.boats)) c.boats.forEach(b => {
    const P = b.photos || {}; Object.entries(PH).forEach(([o, n]) => { if (P[o] && !P[n]) P[n] = P[o]; delete P[o]; }); b.photos = P;
    b.rp = b.rp || {}; if (b.r4 && !('r6' in b.rp)) b.rp.r6 = true; delete b.r4;
    if (b.kidSeat && b.kx == null) b.kx = b.own ? 3 : 2; delete b.kidSeat; delete b.kidFee;
    b.pick = b.pick || {}; if ('cda' in b.pick) { if (!('pmr' in b.pick)) b.pick.pmr = b.pick.cda; delete b.pick.cda; }
    if (b.own) {
      b.inc = (b.inc || []).filter(k => k !== 'flot' && k !== 'dron'); ['internet', 'flotlux', 'lona'].forEach(k => { if (!b.inc.includes(k)) b.inc.push(k); });
      if (b.opt) { delete b.opt.dron; delete b.opt.flot; }
      b.amen = (b.amen || []).map(a => /^dron$/i.test(a) ? 'Lona lateral' : a);
      if (!b.trips) b.trips = 500;
    }
  });
  if (Array.isArray(c.routes)) {
    const r4 = c.routes.find(r => r.id === 'r4');
    if (r4 && /manare|blanca/i.test(r4.zone + r4.beaches) && !c.routes.some(r => r.id === 'r6')) {
      Object.assign(r4, { id: 'r6', name: 'Rumbo 6', open: false });
      const D = DEF.routes; c.routes.splice(c.routes.indexOf(r4), 0, clone(D.find(r => r.id === 'r4')), clone(D.find(r => r.id === 'r5')));
    }
    c.routes.forEach(r => { const d = DEF.routes.find(x => x.id === r.id) || {}; if (r.nm == null) r.nm = d.nm; if (!('add' in r)) r.add = 'extra' in r ? r.extra : d.add ?? 0; delete r.extra; if (d.open === false && r.open == null) r.open = false; if (r.tags) r.tags = r.tags.filter(t => !/millas/.test(t)); });
  }
  if (Array.isArray(c.docks)) {
    const ids = c.docks.map(d => d.id);
    c.docks.forEach(d => {
      if (d.pickup && !d.cost) { d.cost = d.lanchaOnly ? { s: +d.lancha || 0, m: +d.lancha || 0 } : { s: +d.lancha || 0, m: +d.lancha || 0, my: +d.other || 0, y: +d.other || 0 }; delete d.lancha; delete d.other; }
      if (d.id === 'em' && d.cost && d.cost.s === 20 && d.cost.my === 30) d.cost = { s: 15, m: 20, my: 30, y: 50 };
      if (d.id === 'av' && d.baseFree == null) d.baseFree = true;
      if (d.id === 'ppa' && d.off && !d.why) d.why = 'Muelle deshabilitado';
      if (d.id === 'pmr' && ids.includes('cda') && !/cayo/i.test(d.name)) d.name = d.name + ' y Residencias Cayo de Agua';
    });
    c.docks = c.docks.filter(d => d.id !== 'cda');
    const at = c.docks.findIndex(d => d.id === 'em') + 1 || c.docks.length;
    if (!ids.includes('rem')) c.docks.splice(at, 0, clone(DEF.docks.find(d => d.id === 'rem')));
    if (!ids.includes('cal')) c.docks.push(clone(DEF.docks.find(d => d.id === 'cal')));
  }
  if (Array.isArray(c.special)) c.special = c.special.filter(x => !/p[ií]ritu/i.test(x));
  if (Array.isArray(c.allies) && !c.allies.some(x => x.owners)) c.allies.push(clone(DEF.allies.find(x => x.owners)));
  c.v = CAT_V;
  return c;
}
const normPay = p => { p = p && typeof p === 'object' ? clone(p) : {}; const o = { ...clone(DEF_PAY), ...p };
  if (!Array.isArray(p.zelles)) { o.zelles = clone(DEF_PAY.zelles); if (p.zelle) { o.zelles.unshift({ name: p.zelleName || '', email: p.zelle }); o.zelleOn = 0; } }
  o.zelles = o.zelles.filter(z => z && z.email); if (!(o.zelleOn >= 0 && o.zelleOn < o.zelles.length)) o.zelleOn = 0;
  const z = o.zelles[o.zelleOn] || {}; o.zelle = z.email || ''; o.zelleName = z.name || ''; return o; };
const CAT = { pay: {}, beachPhotos: {}, ig: 'tulanchalecheria', home: { hero: '', cards: {} } };
const SHOP = [];
const shopOn = () => SHOP.filter(x => x && x.name && +x.price > 0);
const PICK_NOTE = 'Te buscamos siempre que tu residencia tenga muelle o escalera de acceso al agua y profundidad suficiente para la embarcación.';
const fill = (arr, items) => { arr.splice(0, arr.length, ...items); };
function applyCat(c) {
  c = migrateCat(c);
  const boats = (Array.isArray(c.boats) && c.boats.length ? clone(c.boats) : clone(DEF.boats)).filter(b => !b.hidden).map(normBoat);
  if (!boats.length) boats.push(...clone(DEF.boats).map(normBoat));
  const own = boats.find(b => b.own) || boats[0];
  Object.keys(OWN).forEach(k => delete OWN[k]); Object.assign(OWN, own, { own: true });
  fill(BOATS, boats.map(b => b === own ? OWN : b));
  fill(ROUTES, Array.isArray(c.routes) && c.routes.length ? clone(c.routes) : clone(DEF.routes));
  fill(DOCKS, Array.isArray(c.docks) && c.docks.length ? clone(c.docks) : clone(DEF.docks));
  fill(MAIN_DOCKS, DOCKS.filter(d => !d.pickup && !d.off));
  fill(ALLIES, Array.isArray(c.allies) && c.allies.length ? clone(c.allies) : clone(DEF.allies));
  fill(BASIC, Array.isArray(c.basic) && c.basic.length ? c.basic.slice() : DEF.basic.slice());
  fill(SPECIAL, Array.isArray(c.special) && c.special.length ? c.special.slice() : DEF.special.slice());
  BOATS.forEach(b => { if (!DOCKS[b.dock] || DOCKS[b.dock].pickup) b.dock = 0; });
  WA = /^\d{10,15}$/.test(c.wa || '') ? c.wa : DEF.wa;
  CAT.pay = normPay(c.pay);
  CAT.beachPhotos = c.beachPhotos && typeof c.beachPhotos === 'object' ? c.beachPhotos : {};
  CAT.ig = c.ig || 'tulanchalecheria';
  fill(SHOP, (Array.isArray(c.shop) ? clone(c.shop) : clone(DEF.shop)).filter(x => x && x.name));
  CAT.home = { ...clone(DEF.home), ...(c.home && typeof c.home === 'object' ? clone(c.home) : {}) }; CAT.home.cards ||= {};
  // foto principal subida desde el panel (si no hay, queda la de Mochima)
  const hi = document.querySelector('#hero-reel img');
  if (hi) { hi.dataset.def ||= hi.getAttribute('src'); const so = hi.parentNode.querySelector('source'); if (so) so.dataset.def ||= so.getAttribute('srcset');
    hi.src = CAT.home.hero || hi.dataset.def; if (so) so.srcset = CAT.home.hero || so.dataset.def; }
  // textos nuevos escritos por Eduardo con su versión en inglés
  const tr = [];
  [...BOATS, ...ROUTES].forEach(x => { if (x.desc && x.desc_en) tr.push([x.desc, x.desc_en]); });
  if (Array.isArray(c.tr)) c.tr.forEach(r => Array.isArray(r) && r[0] && tr.push(r));
  if (window.TLL_I18N && TLL_I18N.add) TLL_I18N.add(tr);
}
applyCat(store.get('cat', null));
const ph = (u, alt = '') => `<img class="ph" src="${esc(u)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
/* Fotos de cada embarcación. Solo se muestran las que Eduardo subió: un espacio sin foto no aparece en la web.
   Las tres últimas solo aplican a mini yates, barcos y yates. Si no hay ninguna, queda una sola ilustración de portada. */
const VIEWS = [['proa', 'Proa'], ['popa', 'Popa'], ['social', 'Área social'], ['camarote', 'Camarote'], ['habitacion', 'Habitación', 1], ['bano', 'Baño', 1], ['accesorios', 'Accesorios', 1]];
const viewsOf = b => VIEWS.filter(v => !v[2] || b.type !== 'Lancha');
const photosOf = b => viewsOf(b).filter(([k]) => b.photos && b.photos[k]).map(([k, l]) => ({ k, l, u: b.photos[k] }));
function pic(b, kind) {
  const l = photosOf(b), f = l.find(x => x.k === kind) || l[0];
  return f ? ph(f.u, b.name) : art('drone', b.hue, b.id);
}
// galería: pasa sola cada 5 s (auto) y también con flechas, puntos o deslizando el dedo
function gallery(b, o = {}) {
  const l = photosOf(b);
  if (l.length < 2) return `<div class="gal one">${pic(b)}${l[0] && o.label ? `<span class="gal-l">${l[0].l}</span>` : ''}${o.badge || ''}</div>`;
  return `<div class="gal" data-gal${o.auto ? ' data-auto' : ''} data-i="0" role="region" aria-roledescription="carrusel" aria-label="Fotos de ${esc(b.name)}">
    ${l.map((x, i) => `<figure class="gal-s${i ? '' : ' on'}" data-k="${x.k}" aria-hidden="${i ? 'true' : 'false'}">${ph(x.u, `${b.name} · ${x.l}`)}${o.label ? `<figcaption class="gal-l">${x.l}</figcaption>` : ''}</figure>`).join('')}
    ${o.badge || ''}<button type="button" class="gal-a prev" data-gal-go="-1" aria-label="Foto anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="gal-a next" data-gal-go="1" aria-label="Foto siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    <div class="gal-dots">${l.map((x, i) => `<button type="button" data-gal-to="${i}" aria-label="${x.l}" aria-pressed="${!i}"></button>`).join('')}</div></div>`;
}
function galGo(g, to) {
  const s = $$('.gal-s', g), n = s.length; if (n < 2) return;
  const i = ((to % n) + n) % n; g.dataset.i = i;
  s.forEach((x, j) => { x.classList.toggle('on', j === i); x.setAttribute('aria-hidden', String(j !== i)); });
  $$('[data-gal-to]', g).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
  const th = g.closest('.m-media'); if (th) $$('[data-mv]', th).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-gal-go],[data-gal-to]'); if (!a) return;
  const g = a.closest('[data-gal]') || (a.closest('.m-media') && $('[data-gal]', a.closest('.m-media'))); if (!g) return;
  e.preventDefault(); e.stopPropagation(); g.dataset.hold = Date.now();
  galGo(g, a.dataset.galTo != null ? +a.dataset.galTo : +g.dataset.i + +a.dataset.galGo);
}, true);
let galX = null;
document.addEventListener('pointerdown', e => { const g = e.target.closest('[data-gal]'); galX = g ? [g, e.clientX, e.clientY] : null; }, { passive: true });
document.addEventListener('pointerup', e => { if (!galX) return; const [g, x, y] = galX, dx = e.clientX - x; galX = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - y)) { g.dataset.hold = Date.now(); galGo(g, +g.dataset.i + (dx < 0 ? 1 : -1)); } }, { passive: true });
const galReduce = matchMedia('(prefers-reduced-motion: reduce)');
setInterval(() => {
  if (galReduce.matches || document.hidden) return;
  $$('[data-gal][data-auto]').forEach(g => { if (!g.offsetParent || Date.now() - (+g.dataset.hold || 0) < 9000 || g.matches(':hover')) return; galGo(g, +g.dataset.i + 1); });
}, 5000);
const beachPhoto = n => CAT.beachPhotos[String(n).replace(/\./g, '·')] || '';
const beachPic = (n, hue) => { const u = beachPhoto(n); return u ? ph(u, n) : beachArt({ id: n, hue }); };
// viajes realizados en vez de estrellas (pedido de Eduardo)
const tripsTxt = b => +b.trips > 0 ? `+${(+b.trips).toLocaleString(TLL_I18N.loc())} viajes` : '';
const speedTxt = b => b.type !== 'Lancha' && +b.kts > 0 ? `${+b.kts} nudos` : '';
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
const wday = (d, f = 'short') => { const s = d.toLocaleDateString(TLL_I18N.loc(), { weekday: f }).replace(/\.$/, ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const today = new Date(); today.setHours(0, 0, 0, 0);

/* ---------------- disponibilidad (propietarios) ---------------- */
const owner = store.get('owner', {}); // {boatId: {rate, wk, busy:{'2026-11-20':true}}}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function busyDefault(b, d) { const r = rnd(b.id + iso(d)); return r() < .22; }
function isBusy(b, d) { const o = owner[b.id]?.busy; const k = iso(d); return o && k in o ? o[k] : busyDefault(b, d); }
function rateOf(b) { return owner[b.id]?.rate ?? b.price; }
function wkOf(b) { return owner[b.id]?.wk ?? b.wk ?? 10; }
function priceOn(b, d, r) { const wkend = d && (d.getDay() === 0 || d.getDay() === 6); const base = r ? routePrice(b, r).price : rateOf(b); return base * (wkend ? 1 + wkOf(b) / 100 : 1); }
function nextFree(b) { for (let i = 1; i < 60; i++) { const d = new Date(today.getTime() + i * 864e5); if (!isBusy(b, d)) return d; } }
const fmtDay = d => d.toLocaleDateString(TLL_I18N.loc(), { weekday: 'short', day: 'numeric', month: 'short' });

function calendar(el, b, opts) {
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const draw = () => {
    const y = view.getFullYear(), m = view.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    let cells = [0, 1, 2, 3, 4, 5, 6].map(i => `<span class="w" translate="no">${wday(new Date(2024, 0, 1 + i), 'narrow')}</span>`).join('') + '<span></span>'.repeat(first);
    for (let i = 1; i <= n; i++) {
      const d = new Date(y, m, i), past = d < today, busy = isBusy(b, d), sel = opts.selected && iso(opts.selected) === iso(d);
      const wk = d.getDay() === 0 || d.getDay() === 6;
      cells += `<button type="button" data-d="${iso(d)}" class="${past ? 'past' : ''} ${busy ? 'busy' : ''} ${sel ? 'sel' : ''} ${wk && !busy && !past ? 'promo' : ''}" ${past || (busy && !opts.owner) ? 'disabled' : ''} aria-label="${fmtDay(d)}${busy ? ', ocupado' : ', libre'}">${i}</button>`;
    }
    el.innerHTML = `<div class="cal-h"><button type="button" data-nav="-1" aria-label="Mes anterior">‹</button><span>${view.toLocaleDateString(TLL_I18N.loc(), { month: 'long', year: 'numeric' })}</span><button type="button" data-nav="1" aria-label="Mes siguiente">›</button></div><div class="cal-g">${cells}</div>
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
/* Muelle escogido por el cliente: marca el punto exacto en un mapa satelital (Leaflet + Esri, sin llave)
   y la ubicación viaja en el WhatsApp de la reserva y al panel de Eduardo. */
const PIN_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z" fill="#ea4335"/><circle cx="12" cy="9" r="2.6" fill="#7a1a12"/></svg>';
const PIN_DOCK = { id: 'pin', name: 'Muelle escogido por ti', custom: true };
const okPin = p => !!p && isFinite(p.lat) && isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const pinTxt = p => `${(+p.lat).toFixed(6)}, ${(+p.lng).toFixed(6)}`;
const gmapsUrl = p => `https://www.google.com/maps/search/?api=1&query=${(+p.lat).toFixed(6)},${(+p.lng).toFixed(6)}`;
const dockById = id => id === 'pin' ? PIN_DOCK : DOCKS.find(d => d.id === id) || DOCKS[0];
// ¿Puede esta embarcación salir de / recoger en este punto? Devuelve {ok, cost, fee, why}
// cost: lo cobra Tu Lancha (recogida). fee: servicio por uso de muelle, lo cobra el establecimiento y se paga en sitio.
function dockFor(b, d) {
  if (d.custom) return okPin(Q.pin) ? { ok: true, cost: 0, tbd: true } : { ok: false, why: 'Marca tu muelle en el mapa' };
  if (d.off) return { ok: false, why: d.why || 'Muelle deshabilitado' };
  if (Array.isArray(b.docks) && b.docks.length && !b.docks.includes(d.id)) return { ok: false, why: d.pickup ? `${b.name} no hace recogidas ahí` : `${b.name} no sale de ${d.name}` };
  if (!d.pickup) { const home = DOCKS[b.dock] && DOCKS[b.dock].id === d.id; return { ok: true, cost: 0, fee: d.baseFree && home ? '' : d.fee || '', free: !!(d.baseFree && home && d.fee) }; }
  if (b.pick && d.id in b.pick) return b.pick[d.id] === null ? { ok: false, why: `${b.name} no llega hasta ahí por su calado` } : { ok: true, cost: +b.pick[d.id] || 0 };
  const z = sizeOf(b), c = d.cost || {};
  if ((d.lanchaOnly && b.type !== 'Lancha') || c[z] == null) return { ok: false, why: 'Solo lanchas; barcos y yates salen de los muelles sugeridos' };
  return { ok: true, cost: +c[z] || 0 };
}
/* Precio por rumbo: cada embarcación tiene su tarifa para cada rumbo (no es un recargo).
   Devuelve {ok, price, tbd}: tbd = el precio de ese rumbo se confirma por WhatsApp. */
function routePrice(b, r) {
  const base = rateOf(b);
  if (!r) return { ok: true, price: base };
  const v = b.rp ? b.rp[r.id] : undefined;
  if (v === null || v === false) return { ok: false };
  if (typeof v === 'number' && v > 0) return { ok: true, price: v };
  if (v === undefined && r.open === false) return { ok: false };
  if (typeof r.add === 'number') return { ok: true, price: base + r.add };
  return { ok: true, price: base, tbd: true };
}
const routeOk = (b, r) => !r || !r.id || routePrice(b, r).ok;
const hh = h => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}`;
function hoursFor(b, r, d) {
  const start = r.early ? 9 : 10, end = r.early ? 17 : 18;
  let maxX = 0, why = '';
  if (d.back) why = `Regreso al ${d.name} máximo a las ${d.back}.`;
  else if (r.early) why = `El ${r.name} sale a las 9:00 am y regresa a las 5:00 pm.`;
  else if (b.late) maxX = b.late - end;
  else why = `${b.name} regresa a las 6:00 pm.`;
  return { start, end, maxX, why };
}
function beachLimitText(b) { return `Puedes elegir hasta ${b.maxBeaches} playa${b.maxBeaches > 1 ? 's' : ''}`; }

/* ---------------- embarcaciones ---------------- */
let filt = { type: 'all', pax: 0 };
const OWN_BADGE = 'Recomendación de la casa';
const ownBadge = b => b.own ? `<span class="badge own-badge">${OWN_BADGE}</span>` : '';
const hasPics = b => photosOf(b).length > 0;
function boatCard(b) {
  const nf = nextFree(b), tr = tripsTxt(b), sp = speedTxt(b);
  return `<article class="boat${b.own ? ' own' : ''}${hasPics(b) ? '' : ' nopic'}" data-id="${b.id}">
    ${hasPics(b) ? `<div class="shot">${gallery(b, { auto: b.own, label: true, badge: ownBadge(b) })}</div>` : ''}
    <div class="body">
      ${!hasPics(b) && b.own ? ownBadge(b) : ''}<div class="row"><h3>${esc(b.name)}</h3>${tr ? `<span class="trips">${tr}</span>` : ''}</div>
      <div class="meta"><span class="tag">${b.type}</span><span class="tag">${b.ft} pies</span>${b.own ? '' : `<span class="tag">Hasta ${b.pax} pers.</span>`}${sp ? `<span class="tag">${sp}</span>` : ''}</div>
      <div class="rating">Hasta ${b.maxBeaches} playas por salida · libre ${nf ? fmtDay(nf) : '—'}</div>
      <div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-open="${b.id}">Ver detalles</button><button class="btn btn-sun btn-sm" type="button" data-book="${b.id}">Reservar</button></div>
    </div></article>`;
}
function renderBoats() {
  const list = BOATS.filter(b => (filt.type === 'all' || b.type === filt.type) && b.pax >= filt.pax)
    .sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0));
  const own = list.filter(b => b.own), rest = list.filter(b => !b.own);
  $('#boats').innerHTML = (own.map(boatCard).join('') + (rest.length && own.length ? '<h3 class="grid-h">Otras opciones disponibles</h3>' : '') + rest.map(boatCard).join('')) || '<p class="rating">No hay embarcaciones con esos filtros. Prueba con otro tipo o tamaño de grupo.</p>';
  $('#f-count').textContent = `${list.length} de ${BOATS.length} embarcaciones`;
}
function renderOwnFeature() {
  const el = $('#own-feature'); if (!el || !OWN) return;
  const nf = nextFree(OWN), tr = tripsTxt(OWN);
  el.innerHTML = `<div class="own-card glass-card${hasPics(OWN) ? '' : ' nopic'}">
    ${hasPics(OWN) ? `<div class="own-shot">${gallery(OWN, { auto: true, label: true, badge: ownBadge(OWN) })}</div>` : ''}
    <div class="own-in">${hasPics(OWN) ? '' : ownBadge(OWN)}<span class="eyebrow">${tr ? `${tr} exitosos` : 'La más elegida'} · ${(+OWN.rating || 5).toFixed(1)} ★</span><h2>${esc(OWN.name)}</h2><p>${esc(OWN.desc)}</p>
      <div class="meta"><span class="tag">${OWN.type} · ${OWN.ft} pies</span>${OWN.amen.map(a => `<span class="tag">${esc(a)}</span>`).join('')}</div>
      ${OWN.promo ? `<p class="own-promo">${esc(OWN.promo)}</p>` : ''}
      <p class="rating">Próxima fecha libre: <b>${nf ? fmtDay(nf) : 'consúltanos'}</b></p>
      <div class="row2"><button class="btn btn-sun" type="button" data-open="${OWN.id}">Ver disponibilidad</button><button class="btn btn-ghost" type="button" data-book="${OWN.id}">Reservar</button></div></div></div>`;
}
function renderDockOpts() {
  const pd = $('#p-dock'); if (pd) pd.innerHTML = MAIN_DOCKS.map(d => `<option>${esc(d.name)}</option>`).join('') + '<option>Otro</option>';
}
renderDockOpts();
$('#filters').addEventListener('click', e => { const p = e.target.closest('.pill'); if (!p) return; $$('.pill', $('#filters')).forEach(x => x.setAttribute('aria-pressed', x === p)); filt.type = p.dataset.type; renderBoats(); });
$('#f-pax').onchange = e => { filt.pax = +e.target.value; renderBoats(); };
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (!o || o.closest('dialog')) return; e.preventDefault(); openBoat(o.dataset.open); });

const parNote = k => k === 'parrilla' ? `<small class="acc-note">${PARRILLA_NOTE}</small>` : '';
function accHtml(b) {
  const inc = b.inc.filter(k => ACC[k]).map(k => `<li>${accName(b, k)}${k === 'parrilla' ? ' <b>sin costo</b>' : ''}${parNote(k)}</li>`).join('');
  const opt = Object.entries(b.opt).filter(([k]) => ACC[k]).map(([k, p]) => `<li>${accName(b, k)} <b>+${money(p)}</b>${parNote(k)}</li>`).join('');
  return `${inc ? `<div><h4>Incluido en esta embarcación</h4><ul class="chk">${inc}</ul></div>` : ''}${opt ? `<div><h4>Extras con costo</h4><ul class="chk plus">${opt}</ul></div>` : ''}`;
}
const basicHtml = () => `<ul class="chk">${BASIC.map(x => `<li>${x}</li>`).join('')}</ul>`;

/* ---------------- detalle de embarcación ---------------- */
function openBoat(id) {
  const b = BOATS.find(x => x.id === id), dlg = $('#dlg'); if (!b) return;
  if (dlg.open) dlg.close();
  dlg.className = hasPics(b) ? '' : 'nopic';
  let pick = nextFree(b);
  const l = photosOf(b), hr = hoursFor(b, ROUTES[0], DOCKS[0]), tr = tripsTxt(b), sp = speedTxt(b);
  const extra = ROUTES.filter(r => r.open === false && routeOk(b, r));
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="m-grid">
    ${l.length ? `<div class="m-media"><div class="shot" id="m-shot">${gallery(b, { label: true, badge: ownBadge(b) })}</div>
      ${l.length > 1 ? `<div class="thumbs">${l.map((x, i) => `<button type="button" data-mv="${x.k}" data-gal-to="${i}" aria-pressed="${i === 0}" aria-label="${x.l}">${ph(x.u, x.l)}</button>`).join('')}</div>` : ''}
      <div class="links-v"><a class="btn btn-ghost on-sea btn-sm" href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Más fotos en Instagram</a></div></div>` : ''}
    <div class="m-body">
      <div style="display:grid;gap:6px"><span class="eyebrow">${b.type}${tr ? ' · ' + tr : ''}</span><h2 id="m-title" style="font-size:1.8rem">${esc(b.name)}</h2><p style="color:var(--muted)">${esc(b.desc)}</p></div>
      <div class="specs"><div class="spec"><span>Eslora</span><b>${b.ft} ft</b></div>${b.own ? (b.inc.includes('internet') ? '<div class="spec"><span>Internet</span><b>a bordo</b></div>' : '') : `<div class="spec"><span>Personas</span><b>${b.pax}</b></div>`}${sp ? `<div class="spec"><span>Velocidad</span><b>${sp}</b></div>` : ''}<div class="spec"><span>Playas</span><b>hasta ${b.maxBeaches}</b></div></div>
      <div class="amen">${b.amen.map(a => `<span class="tag">${esc(a)}</span>`).join('')}</div>
      ${b.promo ? `<p class="own-promo">${esc(b.promo)}</p>` : ''}
      <details class="pk" open><summary>Equipamiento básico incluido</summary>${basicHtml()}</details>
      <div class="acc">${accHtml(b)}</div>${vlink('accesorios', 'Ver video: accesorios y facilidades')}
      <p class="rating hr-note">Horario: 10:00 am a 6:00 pm. ${b.late ? `Puede quedarse hasta las ${hh(b.late)} con hora extra (${money(b.hx)} c/u, en efectivo a bordo).` : hr.why} ${CAPT_NOTE}${extra.length ? ` También hace ${extra.map(r => `el ${r.name} (${r.zone})`).join(', ')}.` : ''}</p>
      <div class="cal" id="m-cal"></div>
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="rating" id="m-when"></div><button class="btn btn-sun" type="button" id="m-book">Reservar esta embarcación</button></div>
    </div></div>`;
  const upd = () => { $('#m-when', dlg).textContent = pick ? `Fecha elegida: ${fmtDay(pick)}` : 'Elige una fecha'; };
  calendar($('#m-cal', dlg), b, { get selected() { return pick; }, onPick: d => { pick = d; upd(); } });
  dlg.onchange = null;
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    if (e.target.closest('#m-book')) { Q.boat = b.id; if (pick) Q.date = iso(pick); fitTo(b); dlg.close(); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(2), 0); }
  };
  upd(); dlg.showModal();
}
const CAPT_NOTE = 'La hora final de regreso puede variar según la recomendación del capitán, el grupo y el estado del mar.';

/* ---------------- reserva guiada ---------------- */
const Q = Object.assign({ pax: 4, kids: 0, boat: OWN ? OWN.id : 'b1', route: 'r1', beaches: [], dock: 'pm', hx: 0, date: iso(new Date(today.getTime() + 7 * 864e5)), acc: {} }, store.get('quote2', {}));
/* Niños de 7 años o menos: cuentan como pasajeros, pero algunas embarcaciones admiten además unos niños pequeños (kx)
   sin costo extra. Ej.: la lancha de la casa lleva 5 adultos y hasta 3 niños pequeños. El precio es el de la embarcación. */
const fitsOn = b => Q.pax <= b.pax && Q.pax + (Q.kids || 0) <= b.pax + (+b.kx || 0);
const people = () => Q.pax + (Q.kids || 0);
const paxTxt = () => `${Q.pax} adulto${Q.pax === 1 ? '' : 's'}${Q.kids ? ` + ${Q.kids} niño${Q.kids === 1 ? '' : 's'} (7 años o menos)` : ''}`;
const capTxt = b => `${b.pax} pers.${+b.kx ? ` + ${+b.kx} niños` : ''}`;
function fitTo(b) { Q.pax = Math.min(Q.pax, b.pax); while (Q.kids && !fitsOn(b)) Q.kids--; }
const BIG_MSG = 'Nuestros yates tienen una capacidad máxima de 12 personas y lanchas para 10p. Para grupos más grandes, la opción ideal es nuestro barco de eventos de 30p o para mayor versatilidad, el alquiler de dos embarcaciones de 8p ó 10p cada una, quedo atento a la opción que les gustaría…';
Q.pax = Math.min(30, Math.max(1, Math.round(+Q.pax) || 4)); Q.kids = Math.min(10, Math.max(0, Math.round(+Q.kids) || 0));
const qDate = () => { const [yy, mm, dd] = Q.date.split('-').map(Number); return new Date(yy, mm - 1, dd); };
const thumbOf = b => hasPics(b) ? `<span class="o-th">${pic(b)}</span>` : '';
function boatOpt(b, d) {
  const busy = isBusy(b, d), r = ROUTES.find(x => x.id === Q.route) || ROUTES[0], rr = routeOk(b, r) ? r : ROUTES[0];
  return `<button type="button" class="opt boat-o${b.own ? ' own' : ''}${hasPics(b) ? ' has-th' : ''}" data-boat="${b.id}" aria-pressed="${b.id === Q.boat}">${thumbOf(b)}<span class="o-tx">${b.own ? `<span class="own-tag">${OWN_BADGE}</span>` : ''}<b>${esc(b.name)}</b><span>${b.type} · ${b.own ? `${b.ft} pies` : capTxt(b)} · hasta ${b.maxBeaches} playas</span>${busy ? '<span class="busy-t">Ocupada ese día</span>' : ''}<span class="p">${routePrice(b, rr).tbd ? 'desde ' : ''}${money(priceOn(b, d, rr))} / día</span></span></button>`;
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
  const ownMsg = !OWN || ownOk ? '' : `<p class="own-off">${!fitsOn(OWN) ? `Para tu grupo te recomendamos estas embarcaciones, donde todos van cómodos.` : `La ${OWN.name.toLowerCase()} ya está reservada el ${fmtDay(d)}.`} Estas embarcaciones de nuestros aliados están disponibles:</p>`;
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
  const dd = qDate();
  $('#b-routes').innerHTML = ROUTES.map(x => { const rp = routePrice(b, x); return `<button type="button" class="opt rumbo" data-route="${x.id}" aria-pressed="${x.id === r.id}" ${rp.ok ? '' : 'disabled'}><b>${x.name} · ${esc(x.zone)}</b><span>${x.beaches.map(esc).join(', ')}</span><span class="r-m">${x.nm ? `~${x.nm} millas náuticas · ` : ''}~${x.min} min</span><span class="p">${rp.ok ? (rp.tbd ? 'Precio por confirmar' : money(priceOn(b, dd, x))) : 'No disponible en esta embarcación'}</span></button>`; }).join('');
  const chip = n => `<button type="button" class="bchip" data-beach="${esc(n)}" aria-pressed="${Q.beaches.includes(n)}">${esc(n)}</button>`;
  $('#b-beaches').innerHTML = `<div class="bl-h"><b>Elige tus playas</b><span class="lim" id="b-lim">${beachLimitText(b)} · ${Q.beaches.length}/${b.maxBeaches}</span></div>
    <div class="bchips">${r.beaches.map(chip).join('')}</div>
    ${plus ? `<p class="rating">Puedes sumar playas del ${plus.name}:</p><div class="bchips">${plus.beaches.map(chip).join('')}</div>` : ''}
    <p class="rating">${r.desc} No combinamos playas de rumbos distintos.</p>${vlink('rumbo' + r.id.slice(1), 'Ver video del ' + r.name)}
    <p class="special">¿Otro destino? ${SPECIAL.join(', ')}: <a href="${wa(`Hola Tu Lancha 👋 Quiero una cotización especial para ${SPECIAL.join(' / ')} para ${paxTxt()} el ${fmtDay(qDate())}.`)}" target="_blank" rel="noopener">cotización especial por WhatsApp</a></p>`;
  const opt = d => { const c = dockFor(b, d); return `<option value="${d.id}" ${d.id === Q.dock ? 'selected' : ''} ${c.ok ? '' : 'disabled'}>${esc(d.name)}${c.ok ? (d.pickup ? (c.cost ? ' · +' + money(c.cost) : ' · gratis') : c.free ? ' · sin costo de muelle' : c.fee ? ' · ' + c.fee : '') : ' · ' + (d.off && d.why ? d.why.toLowerCase() : 'no disponible')}</option>`; };
  const home = (DOCKS[b.dock] && dockFor(b, DOCKS[b.dock]).ok ? DOCKS[b.dock] : DOCKS.find(x => dockFor(b, x).ok) || DOCKS[0]).id;
  if (Q.dock === 'pin' && !okPin(Q.pin)) Q.dock = home;
  if (!dockFor(b, dockById(Q.dock)).ok) Q.dock = home;
  $('#b-dock').innerHTML = `<optgroup label="Muelles sugeridos (servicio por uso de muelle)">${DOCKS.filter(d => !d.pickup).map(opt).join('')}</optgroup><optgroup label="Te buscamos en tu residencia">${DOCKS.filter(d => d.pickup).map(opt).join('')}</optgroup><optgroup label="Otro punto"><option value="pin"${Q.dock === 'pin' ? ' selected' : ''}>📍 Escoge tu muelle en el mapa</option></optgroup>`;
  renderMyPin();
  const d = dockById(Q.dock), c = dockFor(b, d);
  const blocked = DOCKS.filter(x => x.pickup && !dockFor(b, x).ok).map(x => dockFor(b, x).why);
  $('#b-dockinfo').innerHTML = d.custom
    ? `<b>Muelle escogido por ti</b>${Q.pin.ref ? ` · <span translate="no">${esc(Q.pin.ref)}</span>` : ''}<br>Te confirmamos por WhatsApp si la embarcación puede llegar y si hay recargo.`
    : d.pickup
    ? `<b>Recogida en ${esc(d.name)}</b>: ${c.cost ? '+' + money(c.cost) : 'sin costo'}.${d.back ? ` Regreso máximo a las ${d.back}.` : ''} ${blocked.length ? `<br><small>${[...new Set(blocked)].join('. ')}.</small>` : ''}<br><small>${PICK_NOTE}</small>`
    : `<b>${esc(d.name)}</b>: ${c.free ? `las embarcaciones con base aquí no pagan servicio de muelle` : c.fee ? `servicio por uso de muelle ${c.fee}, lo cobra el establecimiento y se paga en sitio` : 'sin servicio de muelle'}${d.park ? ' · ' + esc(d.park) : ''}.`;
  $('#b-dockinfo').innerHTML += `<br>${vlink('muelles', 'Ver video de los muelles sugeridos')}<small>Al confirmar te enviamos la ubicación exacta, un video de cómo llegar y cómo pagar el servicio de muelle. ¿Otra residencia? <a href="${wa(`Hola Tu Lancha 👋 ¿Pueden buscarnos en mi residencia? Somos ${paxTxt()}.`)}" target="_blank" rel="noopener">Pregúntanos</a>.</small>`;
  const h = hoursFor(b, r, d);
  Q.hx = Math.max(0, Math.min(Q.hx || 0, h.maxX));
  $('#b-hours').innerHTML = `<div class="bl-h"><b>Horario</b><span class="lim">${hh(h.start)} a ${hh(h.end)}</span></div>
    <p class="rating">La tripulación prepara el regreso ${r.early ? '20 minutos antes' : 'a las 5:40 pm'}. ${h.why} ${CAPT_NOTE}</p>${vlink('horario', 'Ver video del horario')}
    ${h.maxX ? `<div class="hx"><span>Horas extra <small>(${money(b.hx)} c/u, en efectivo a bordo, hasta las ${hh(h.end + h.maxX)})</small></span><div class="qty"><button type="button" id="hx-m" aria-label="Menos horas extra">−</button><output id="hx">${Q.hx}</output><button type="button" id="hx-p" aria-label="Más horas extra">+</button></div></div>` : ''}
    <p class="rating"><small>¿Salir más temprano o regresar de noche? La navegación nocturna tiene costo adicional: <a href="${wa(`Hola Tu Lancha 👋 Quiero un horario especial para el ${fmtDay(qDate())} para ${paxTxt()}.`)}" target="_blank" rel="noopener">consúltalo por WhatsApp</a>.</small></p>`;
  const accOpt = Object.entries(b.opt);
  for (const k of Object.keys(Q.acc)) if (!(k in b.opt)) delete Q.acc[k];
  Q.shop = Q.shop || {}; for (const k of Object.keys(Q.shop)) if (!shopOn().some(x => x.id === k)) delete Q.shop[k];
  $('#b-extras').innerHTML = `${vlink('accesorios', 'Ver video: accesorios y facilidades')}<details class="pk"><summary>Equipamiento básico incluido en todas</summary>${basicHtml()}</details>
    ${b.inc.length ? `<div><h4>Ya viene en ${esc(b.name)}</h4><div class="amen">${b.inc.filter(k => ACC[k]).map(k => `<span class="tag">✓ ${accName(b, k)}${k === 'parrilla' ? ' sin costo' : ''}</span>`).join('')}</div>${b.inc.includes('parrilla') ? `<p class="acc-note">🔥 Parrillera: ${PARRILLA_NOTE}</p>` : ''}</div>` : ''}
    ${accOpt.length ? `<div><h4>Agrega a tu salida</h4><div class="opts">${accOpt.map(([k, p]) => `<button type="button" class="opt" data-acc="${k}" aria-pressed="${!!Q.acc[k]}"><b>${accName(b, k)}</b>${k === 'parrilla' ? `<span>${PARRILLA_NOTE}</span>` : ''}<span class="p">+${money(p)}</span></button>`).join('')}</div></div>` : ''}
    ${shopOn().length ? `<div><h4>Tienda Tu Lancha <small>lo llevamos a tu embarcación</small></h4><div class="opts">${shopOn().map(x => `<button type="button" class="opt" data-shop="${esc(x.id)}" aria-pressed="${!!(Q.shop && Q.shop[x.id])}"><b>${esc(x.name)}</b><span class="p">+${money(x.price)}</span></button>`).join('')}</div></div>` : ''}
    <div class="food glass-card"><h4>Comida y bebidas</h4><p>Hielo y agua mineral ya están incluidos. Puedes traer todo lo que quieras, o pedirlo a <b>El Mercadillo</b> y te lo llevan al muelle antes de zarpar.</p>
      <div class="vrow">${vcard('comidas')}${vcard('mercadillo')}${['r2', 'r3'].includes(r.id) ? vcard('rincon') : ''}</div>
      <a class="btn btn-ghost btn-sm" href="${MERCADILLO}" target="_blank" rel="noopener">Pedir en El Mercadillo</a>
      ${['r2', 'r3'].includes(r.id) ? `<p class="rating"><b>Recomendado en tu rumbo:</b> Restaurante El Rincón Marino, en Playa Punta La Cruz. Comes a bordo o en tierra.</p>` : ''}</div>`;
}
function renderTicket() {
  const b = BOATS.find(x => x.id === Q.boat);
  if (!b) { window.TLL_LAST = null; $('#ticket').innerHTML = '<h3>Tu cotización</h3><p class="empty">Para grupos de más de 30 personas armamos una flotilla a la medida. Escríbenos.</p>'; return; }
  const r = ROUTES.find(x => x.id === Q.route) || ROUTES[0], d = qDate(), busy = isBusy(b, d), dk = dockById(Q.dock), dc = dockFor(b, dk);
  const rp = routePrice(b, r);
  const lines = [[`${b.name} · ${r.name} · ${fmtDay(d)}`, priceOn(b, d, r)]];
  if (rp.tbd) lines.push([`Tarifa del ${r.name}`, 0, 'tbd']);
  if (dc.ok && dc.cost) lines.push([`Recogida en ${dk.name}`, dc.cost]);
  if (dc.ok && dc.tbd) lines.push(['Recogida en tu muelle', 0, 'tbd']);
  if (Q.hx) lines.push([`${Q.hx} h extra (efectivo a bordo)`, Q.hx * b.hx]);
  Object.entries(b.opt).filter(([k]) => Q.acc[k] && ACC[k]).forEach(([k, p]) => lines.push([accName(b, k), p]));
  shopOn().filter(x => Q.shop && Q.shop[x.id]).forEach(x => lines.push([x.name, x.price]));
  const code = codeInfo(Q.code);
  const sub = lines.reduce((s, l) => s + l[1], 0);
  if (code.kind === 'ref') lines.push([`Código ${code.code} (−5%)`, -Math.round(sub * .05)]);
  if (code.kind === 'gift') lines.push([`Tarjeta de regalo ${code.code}`, -Math.min(sub, code.value)]);
  const total = Math.max(0, lines.reduce((s, l) => s + l[1], 0));
  const block = !dc.ok ? dc.why : !rp.ok ? `${b.name} no hace el ${r.name}` : !Q.beaches.length ? 'Elige al menos una playa' : '';
  const routeTxt = `${r.name} · ${Q.beaches.join(', ')}`;
  const h = hoursFor(b, r, dk);
  $('#ticket').innerHTML = `${hasPics(b) ? `<div class="t-th">${pic(b)}<span>${esc(b.name)}</span></div>` : ''}<h3>Tu cotización</h3>
    ${busy ? `<span class="flag amber"><i></i>${b.name} está ocupada ese día</span>` : `<span class="flag"><i></i>Disponible</span>`}
    <p class="t-pax">${paxTxt()}</p><p class="t-route">${esc(routeTxt)}<br><small>${dk.name} · ${hh(h.start)} a ${hh(h.end + (Q.hx || 0))}</small></p>
    <ul>${lines.map(l => `<li><span>${l[0]}</span><span>${l[2] === 'tbd' ? 'por confirmar' : money(l[1])}</span></li>`).join('')}</ul>
    <div class="total"><span>Total</span><span>${money(total)}</span></div>
    <div class="pp">${money(total / people())} por persona · abono para apartar ${money(total / 2)}</div>
    ${dc.fee ? `<div class="t-dock"><b>Servicio por uso de muelle: ${esc(dc.fee)}</b><span>No es un pago a Tu Lancha: lo cobra ${esc(dk.name)} y se paga en sitio. Si te buscamos en tu residencia, no aplica.</span></div>` : ''}
    <form class="code-in" id="code-form"><input id="q-code" placeholder="Código de amigo o de regalo" aria-label="Código de amigo o tarjeta de regalo" value="${esc(Q.code || '')}" autocomplete="off" autocapitalize="characters"><button class="btn btn-ghost on-sea btn-sm" type="submit">Aplicar</button></form>
    ${Q.code ? (code.kind ? `<span class="code-ok">✓ ${code.kind === 'ref' ? 'Descuento de amigo aplicado' : 'Tarjeta de regalo aplicada (' + money(code.value) + ')'}</span>` : `<span class="code-bad">Ese código no es válido. Revisa que esté bien escrito, por ejemplo ANA-7K2 o TLLG-B4XK.</span>`) : ''}
    <button class="btn btn-sun btn-lg" type="button" id="t-book">Reservar ahora</button>
    <p class="note">No pagas nada ahora: te confirmamos disponibilidad y abono. Fines de semana +${wkOf(b)}%.</p>`;
  $('#mb-total').textContent = money(total);
  window.TLL_LAST = { boat: b.name, type: b.type, route: routeTxt, dock: dk.custom && Q.pin && Q.pin.ref ? `${dk.name} · ${Q.pin.ref}` : dk.name, pin: dk.custom && okPin(Q.pin) ? { lat: +Q.pin.lat, lng: +Q.pin.lng, ref: Q.pin.ref || '' } : null, dockFee: dc.fee || '', hours: `${hh(h.start)} a ${hh(h.end + (Q.hx || 0))}`, date: fmtDay(d), iso: Q.date, pax: people(), adults: Q.pax, kids: Q.kids, paxTxt: paxTxt(), lines, total, busy, block, promo: code.kind ? code.code : '' };
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
  if (t.dataset.shop) { Q.shop = Q.shop || {}; Q.shop[t.dataset.shop] = !Q.shop[t.dataset.shop]; }
  renderBuilder();
});
$('#reservar').addEventListener('submit', e => { if (e.target.id !== 'code-form') return; e.preventDefault(); Q.code = $('#q-code').value.trim().toUpperCase(); renderBuilder(); toast(codeInfo(Q.code).kind ? 'Código aplicado' : 'Código no válido'); });
$('#b-date').onchange = e => { if (e.target.value) { Q.date = e.target.value; renderBuilder(); } };
$('#b-dock').onchange = e => { if (e.target.value === 'pin' && !okPin(Q.pin)) { e.target.value = Q.dock; openPinMap(); return; } Q.dock = e.target.value; renderBuilder(); };
function renderMyPin() {
  const box = $('#b-mypin'); if (!box) return;
  const p = okPin(Q.pin) ? Q.pin : null, on = p && Q.dock === 'pin';
  box.innerHTML = p
    ? `<div class="mypin-card${on ? ' on' : ''}"><span class="mypin-ic" aria-hidden="true">${PIN_SVG}</span><div class="mypin-t"><b>${on ? 'Saldrás de tu muelle' : 'Tu muelle guardado'}</b>${p.ref ? `<span translate="no">${esc(p.ref)}</span>` : ''}<small class="mono" translate="no">${pinTxt(p)}</small></div>
      <div class="mypin-acts">${on ? '' : '<button type="button" class="btn btn-sun btn-sm" data-pin-use>Usar este muelle</button>'}<button type="button" class="btn btn-ghost btn-sm" data-pin-open>Cambiar</button><a class="btn btn-ghost btn-sm" href="${gmapsUrl(p)}" target="_blank" rel="noopener">Ver en Google Maps</a><button type="button" class="linkish" data-pin-del>Quitar</button></div></div>
      <p class="mypin-note">Guarda la dirección, se enviará a TuLanchaLecheria al finalizar tu solicitud.</p>`
    : `<button type="button" class="mypin-btn" data-pin-open><span class="mypin-ic" aria-hidden="true">${PIN_SVG}</span><span><b>Escoge tu muelle</b><small>Marca el punto exacto en el mapa satelital</small></span></button>
      <p class="mypin-note">Guarda la dirección, se enviará a TuLanchaLecheria al finalizar tu solicitud.</p>`;
}
$('#b-mypin').addEventListener('click', e => {
  if (e.target.closest('[data-pin-open]')) return openPinMap();
  if (e.target.closest('[data-pin-use]')) { Q.dock = 'pin'; return renderBuilder(); }
  if (e.target.closest('[data-pin-del]')) { Q.pin = null; if (Q.dock === 'pin') Q.dock = 'pm'; renderBuilder(); toast('Ubicación quitada'); }
});

/* ---------------- mapa satelital (Leaflet, sin llave) ---------------- */
let lfP = null;
const loadLeaflet = () => lfP || (lfP = new Promise((ok, no) => {
  if (window.L) return ok(window.L);
  const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'vendor/leaflet.css'; document.head.appendChild(c);
  const s = document.createElement('script'); s.src = 'vendor/leaflet.js'; s.onload = () => ok(window.L); s.onerror = () => { lfP = null; no(new Error('leaflet')); }; document.head.appendChild(s);
}));
// capas: satélite (Esri World Imagery + nombres) y mapa de calles (OpenStreetMap)
function baseLayers(L) {
  const E = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const sat = L.layerGroup([
    L.tileLayer(E + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' }),
    L.tileLayer(E + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18 })
  ]);
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' });
  return { sat, street };
}
const pinIcon = L => L.divIcon({ className: 'gpin', iconSize: [36, 46], iconAnchor: [18, 44], html: PIN_SVG });
const LECHERIA = [10.1935, -64.6935];
function openPinMap() {
  const dlg = $('#dlg'); if (dlg.open) dlg.close();
  const p0 = okPin(Q.pin) ? Q.pin : null;
  dlg.className = 'full pin-dlg';
  dlg.innerHTML = `<button class="m-close" type="button" aria-label="Cerrar">×</button><div class="view pin-view">
    <div class="pin-h"><span class="eyebrow">Tu punto de salida</span><h2 id="m-title">Escoge tu muelle</h2><p>Toca el mapa o arrastra el pin hasta el lugar exacto donde te buscamos. Guarda la dirección, se enviará a TuLanchaLecheria al finalizar tu solicitud.</p></div>
    <form class="pin-search" data-pin-q><input type="search" placeholder="Busca un lugar, residencia o marina" aria-label="Buscar un lugar" autocomplete="off"><button class="btn btn-ghost btn-sm" type="submit">Buscar</button></form>
    <div class="pin-results" data-pin-res hidden></div>
    <div class="pin-map-w"><div class="pin-map" data-pin-map><div class="f-wait">Cargando mapa satelital…</div></div>
      <div class="pin-layers" role="group" aria-label="Tipo de mapa"><button type="button" data-pin-layer="sat" aria-pressed="true">Satélite</button><button type="button" data-pin-layer="street" aria-pressed="false">Mapa</button></div>
      <button type="button" class="pin-me" data-pin-me aria-label="Usar mi ubicación actual"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5" fill="none"/></svg></button></div>
    <p class="pin-coords" data-pin-xy>${p0 ? `Ubicación: <b class="mono" translate="no">${pinTxt(p0)}</b>` : 'Toca el mapa para marcar tu muelle.'}</p>
    <label class="field"><span class="lbl">Referencia (opcional)</span><input data-pin-ref translate="no" maxlength="120" placeholder="Ej.: muelle del edificio, puesto 12, portón azul" value="${esc(p0 ? p0.ref || '' : '')}"></label>
    <div class="pin-acts"><button class="btn btn-sun btn-lg" type="button" data-pin-save ${p0 ? '' : 'disabled'}>Guardar ubicación</button><a class="btn btn-ghost" data-pin-g target="_blank" rel="noopener" ${p0 ? `href="${gmapsUrl(p0)}"` : 'hidden'}>Ver en Google Maps</a></div>
  </div>`;
  const q = s => dlg.querySelector(s);
  let pt = p0 ? { lat: +p0.lat, lng: +p0.lng } : null, map = null, mk = null, layers = null;
  const show = () => {
    q('[data-pin-xy]').innerHTML = pt ? `Ubicación: <b class="mono" translate="no">${pinTxt(pt)}</b>` : 'Toca el mapa para marcar tu muelle.';
    q('[data-pin-save]').disabled = !pt; const g = q('[data-pin-g]'); g.hidden = !pt; if (pt) g.href = gmapsUrl(pt);
  };
  const place = (ll, zoom) => {
    pt = { lat: ll.lat, lng: ll.lng };
    if (map) { if (!mk) { mk = window.L.marker(ll, { icon: pinIcon(window.L), draggable: true, autoPan: true, keyboard: true, title: 'Tu muelle' }).addTo(map); mk.on('dragend', () => { const x = mk.getLatLng(); pt = { lat: x.lat, lng: x.lng }; show(); }); } else mk.setLatLng(ll); if (zoom) map.setView(ll, zoom); }
    show();
  };
  dlg.onclick = e => {
    if (e.target === dlg || e.target.closest('.m-close')) return dlg.close();
    const ly = e.target.closest('[data-pin-layer]');
    if (ly && map) { const k = ly.dataset.pinLayer; Object.entries(layers).forEach(([n, l]) => n === k ? l.addTo(map) : map.removeLayer(l)); dlg.querySelectorAll('[data-pin-layer]').forEach(x => x.setAttribute('aria-pressed', x === ly)); return; }
    if (e.target.closest('[data-pin-me]')) {
      if (!navigator.geolocation) return toast('Tu teléfono no comparte la ubicación');
      toast('Buscando tu ubicación…');
      navigator.geolocation.getCurrentPosition(g => place({ lat: g.coords.latitude, lng: g.coords.longitude }, 18), () => toast('No pudimos leer tu ubicación. Marca el punto en el mapa.'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      return;
    }
    const r = e.target.closest('[data-pin-hit]');
    if (r) { place({ lat: +r.dataset.lat, lng: +r.dataset.lng }, 17); const ref = q('[data-pin-ref]'); if (!ref.value) ref.value = r.dataset.name.slice(0, 120); q('[data-pin-res]').hidden = true; return; }
    if (e.target.closest('[data-pin-save]') && pt) {
      Q.pin = { lat: +pt.lat.toFixed(6), lng: +pt.lng.toFixed(6), ref: q('[data-pin-ref]').value.trim().slice(0, 120) };
      Q.dock = 'pin'; dlg.close(); renderBuilder(); toast('Ubicación guardada. Se enviará a Tu Lancha al finalizar tu solicitud.');
    }
  };
  q('[data-pin-q]').onsubmit = async e => {
    e.preventDefault(); const t = e.target.querySelector('input').value.trim(); if (t.length < 3) return;
    const res = q('[data-pin-res]'); res.hidden = false; res.innerHTML = '<p class="rating">Buscando…</p>';
    try {
      const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ve&viewbox=-65.2,10.6,-63.9,9.9&q=${encodeURIComponent(t)}`;
      const l = await (await fetch(u, { headers: { 'Accept-Language': (window.TLL_I18N && TLL_I18N.lang) || 'es' } })).json();
      res.innerHTML = l.length ? l.map(x => `<button type="button" data-pin-hit data-lat="${esc(x.lat)}" data-lng="${esc(x.lon)}" data-name="${esc(x.name || x.display_name.split(',')[0])}"><b translate="no">${esc(x.name || x.display_name.split(',')[0])}</b><small translate="no">${esc(x.display_name)}</small></button>`).join('') : '<p class="rating">No encontramos ese lugar. Mueve el mapa y toca el punto exacto.</p>';
    } catch { res.innerHTML = '<p class="rating">Sin conexión para buscar. Mueve el mapa y toca el punto exacto.</p>'; }
  };
  dlg.addEventListener('close', () => { if (map) { map.remove(); map = null; } }, { once: true });
  dlg.showModal();
  loadLeaflet().then(L => {
    if (!dlg.open || !q('[data-pin-map]')) return;
    const el = q('[data-pin-map]'); el.innerHTML = '';
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView(pt || LECHERIA, pt ? 18 : 14);
    layers = baseLayers(L); layers.sat.addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    map.on('click', e => place(e.latlng));
    if (pt) place(pt);
    setTimeout(() => map && map.invalidateSize(), 120);
  }).catch(() => { const el = q('[data-pin-map]'); if (el) el.innerHTML = '<div class="f-wait">No se pudo cargar el mapa. Revisa tu conexión e inténtalo de nuevo.</div>'; });
}

/* ---------------- playas por rumbo ---------------- */
function renderBeaches() {
$('#beaches').innerHTML = `<div class="vintro">${vcard('playas', 'Conoce nuestras playas')}<div><h2>Antes de elegir</h2><p>Mira en un minuto cómo son nuestros rumbos y playas. Cada rumbo tiene su video abajo.</p></div></div>` + ROUTES.map(r => `<section class="rumbo-sec" id="rumbo-${r.id}"><div class="rumbo-h"><div><span class="eyebrow">${r.name}</span><h2>${r.zone}</h2><p>${r.desc}</p></div><div class="tags rumbo-tags">${r.nm ? `<span class="tag tag-nm">~${r.nm} millas náuticas</span>` : ''}${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}<span class="tag">~${r.min} min en lancha</span></div></div>${VID['rumbo' + r.id.slice(1)] ? `<div class="rumbo-v">${vcard('rumbo' + r.id.slice(1), 'Video del ' + r.name)}</div>` : ''}
  <div class="beaches">${r.beaches.map(n => `<article class="beach${beachPhoto(n) ? '' : ' nopic'}">${beachPhoto(n) ? ph(beachPhoto(n), n) : ''}<div class="in"><span class="km">${r.name.toUpperCase()}</span><h3>${esc(n)}</h3>
  <div class="ln"><a href="https://www.youtube.com/results?search_query=${encodeURIComponent('Tu Lancha Lechería ' + n)}" target="_blank" rel="noopener">Video</a><a href="https://www.instagram.com/tulanchalecheria/" target="_blank" rel="noopener">Fotos</a><button type="button" data-goroute="${r.id}" data-gobeach="${esc(n)}" style="all:unset;cursor:pointer;color:var(--on-sea);font-weight:700">Ir aquí →</button></div></div></article>`).join('')}</div></section>`).join('')
  + `<div class="parks"><b>Cotización especial:</b>${SPECIAL.map(s => `<span class="tag">${s}</span>`).join('')}<a class="btn btn-wa btn-sm" href="${wa(`Hola Tu Lancha 👋 Quiero una cotización especial para ${SPECIAL.join(' / ')}.`)}" target="_blank" rel="noopener">Pedir cotización</a></div>`;
}
renderBeaches();
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
      <ul class="chk"><li>Sale de C.C. Plaza Mayor, Muelle Aquavic, Hotel Maremares o tu residencia (servicio de muelle aparte, se paga en sitio)</li><li>No incluye bebidas, hielo ni pasapalos; puedes traer tu cava</li><li>Fines de semana con disponibilidad limitada: las embarcaciones prefieren salir a las islas</li></ul>
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
$('#ally-videos') && ($('#ally-videos').innerHTML = ['mercadillo', 'rincon', 'comidas'].map(k => vcard(k)).join(''));
const allyLink = (n, u) => esc(u || wa(`Hola Tu Lancha 👋 Quiero agregar ${n} a mi salida.`));
const initials = n => esc(String(n).split(' ').map(w => w[0]).slice(0, 2).join(''));
// tarjeta tipo cuadro: con portada si Eduardo subió una foto; si no, solo logo o iniciales (sin espacio de imagen vacío)
const allyCard = ([n, d, u, col, logo, cover]) => `<a class="ally-t${cover ? ' has-cover' : ''}" href="${allyLink(n, u)}" target="_blank" rel="noopener">
  ${cover ? `<span class="ally-cv">${ph(cover, n)}</span>` : ''}<span class="ally-b"><span class="av${logo ? ' logo' : ''}" translate="no" style="background:${esc(logo ? '#fff' : col || '#232843')}">${logo ? ph(logo, n) : initials(n)}</span><span class="ally-tx"><b>${esc(n)}</b><span>${esc(d)}</span></span><span class="vip">VIP</span></span></a>`;
function renderAllies() {
  $('#allies').innerHTML = ALLIES.filter(c => !c.owners && c.items.length).map(c => `<div class="cat"><h3>${esc(c.cat)}</h3><div class="ally-grid">${c.items.map(allyCard).join('')}</div></div>`).join('');
  const ow = ALLIES.filter(c => c.owners && c.items.length), box = $('#owners-sv');
  if (box) { box.hidden = !ow.length; $('#owner-allies').innerHTML = ow.map(c => `<div class="cat">${ow.length > 1 ? `<h3>${esc(c.cat)}</h3>` : ''}<div class="ally-grid">${c.items.map(allyCard).join('')}</div></div>`).join(''); }
  // cintillo de aliados en el pie: logos en un mismo tono (blanco), sin carnaval de colores
  const all = ALLIES.filter(c => !c.owners).flatMap(c => c.items), rb = $('#ribbon');
  if (rb) {
    rb.hidden = !all.length;
    const one = all.map(([n, , u, , logo]) => `<a class="rb-i" href="${allyLink(n, u)}" target="_blank" rel="noopener" title="${esc(n)}">${logo ? `<img src="${esc(logo)}" alt="${esc(n)}" loading="lazy" decoding="async">` : `<span>${esc(n)}</span>`}</a>`).join('');
    $('#ribbon-in').innerHTML = one + `<span class="rb-dup" aria-hidden="true">${one.replace(/<a /g, '<a tabindex="-1" ')}</span>`;
  }
}
renderAllies();

/* ---------------- pool ---------------- */
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
const renderOwnerOpts = () => { $('#o-boat').innerHTML = BOATS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join(''); };
renderOwnerOpts();
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
// catálogo publicado desde el panel: si cambió, se aplica y se vuelve a pintar todo
function refreshCatalog(c) {
  applyCat(c);
  if (!BOATS.some(b => b.id === Q.boat)) Q.boat = OWN.id;
  if (!ROUTES.some(r => r.id === Q.route)) { Q.route = ROUTES[0].id; Q.beaches = []; }
  if (!DOCKS.some(d => d.id === Q.dock)) Q.dock = DOCKS[0].id;
  if (!BOATS.includes(ob)) ob = BOATS[0];
  renderDockOpts(); renderOwnerOpts(); renderBeaches(); renderAllies();
  renderBoats(); renderBuilder(); renderOwnFeature(); renderOwner();
  dispatchEvent(new CustomEvent('tll:cat'));
}
function loadCatalog() {
  if (!/^https?:$/.test(location.protocol)) return;
  fetch('/api/admin?a=cat', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(c => {
    if (!c || typeof c !== 'object') return;
    const s = JSON.stringify(c), old = JSON.stringify(store.get('cat', null) || {});
    if (s === old) return;
    store.set('cat', c); refreshCatalog(c);
  }).catch(() => {});
}
loadCatalog();
// al cambiar de idioma: volver a pintar lo que lleva fechas, días y montos con formato local
addEventListener('tll:lang', () => { renderBoats(); renderBuilder(); renderOwnFeature(); renderOwner(); window.TLL.renderMine && window.TLL.renderMine(); });

window.TLL = { routePrice, photosOf, hasPics, VIEWS, viewsOf, migrateCat, SHOP, DEF_SHOP, SIZES, sizeOf, accName, PARRILLA_NOTE, CAT_V, gallery, dockFor, tripsTxt, loadLeaflet, baseLayers, pinIcon, gmapsUrl, pinTxt, okPin, PIN_SVG, openPinMap, CAT, applyCat, refreshCatalog, DEF, normBoat, normPay, pic, ph, MAIN_DOCKS, ALLIES, ROUTES_DEF: DEF.routes, waNum: () => WA, renderBoats, renderTicket, $, $$, wa, art, beachArt, rnd, money, store, toast, esc, Q, renderBuilder, BOATS, ROUTES, DOCKS, EXTRAS, ACC, BASIC, OWN, iso, fmtDay, refCode, codeInfo, GIFT_VALUES, AL, today, priceOn, openBoat, openVideo, VID, currency };
document.addEventListener('click', e => { const k = e.target.closest('[data-book]'); if (!k) return; const b = BOATS.find(x => x.id === k.dataset.book); if (!b) return; Q.boat = b.id; fitTo(b); renderBuilder(); location.hash = 'reservar'; setTimeout(() => window.TLL.goStep && window.TLL.goStep(0), 0); });
})();
