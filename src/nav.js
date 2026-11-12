/* ---------------- navegación: menú giratorio de pantallas flotantes y búsqueda del encabezado ----------------
   La portada queda compacta: header, hero, lancha de la casa y este menú. Cada sección se abre desde
   las pantallas que giran (o desde la búsqueda y el menú lateral).
   Las pantallas muestran por ahora imágenes de relleno difuminadas; Eduardo puede subir la imagen de
   cada pantalla desde el panel (Portada) y entonces se ve nítida. */
(() => {
'use strict';
const T = window.TLL, { $, $$, esc, art, beachArt, BOATS, ROUTES, ALLIES, OWN, CAT } = T;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- pantallas por sección (2 por sección) ---------- */
const SECS = [
  ['embarcaciones', 'Embarcaciones', [['c-premium', 'Lancha prémium', 'La recomendación de la casa', '#embarcaciones', 'drone', 200], ['c-flota', 'Lanchas, mini yates y yates', 'Toda la flota con capitán', '#embarcaciones', 'exterior', 215]]],
  ['playas', 'Playas', [['c-rumbos', 'Seis rumbos', 'Por el Parque Nacional Mochima', '#playas', 'beach', 185], ['c-plata', 'Isla de Plata', 'Aguas cristalinas', '#playas', 'beach', 175]]],
  ['experiencias', 'Experiencias', [['c-canales', 'Canales de El Morro', 'Al caer la tarde', '#experiencias', 'hero', 25], ['c-celebra', 'Celebraciones a bordo', 'Cumpleaños, pedidas y corporativos', '#experiencias', 'interior', 330]]],
  ['regalos', 'Regalos y Club', [['c-regalo', 'Regala un día en el mar', 'Tarjetas de regalo', '#regalos', 'hero', 340], ['c-club', 'Club Tu Lancha', 'Invita y ganan los dos', '#club', 'exterior', 160]]],
  ['aliados', 'Servicio a bordo', [['c-comida', 'Comida y bebidas', 'Te lo llevan al muelle', '#aliados', 'interior', 30], ['c-vip', 'DJ, estilo y estadía', 'Aliados VIP', '#aliados', 'hero', 280]]],
  ['mi-viaje', 'Mi viaje', [['c-vivo', 'Seguimiento en vivo', 'Tu familia te sigue desde tierra', '#mi-viaje', 'drone', 190], ['c-sos', 'Modo a bordo y SOS', 'GPS y botón de emergencia', '#mi-viaje', 'exterior', 230]]],
  ['nosotros', 'Nosotros', [['c-somos', 'Quiénes somos', 'Gente de mar de Lechería', '#nosotros', 'hero', 200], ['c-muelles', 'Muelles y horario', 'Dónde y a qué hora salimos', '#nosotros', 'exterior', 195]]],
  ['reservar', 'Reservar', [['c-arma', 'Arma tu salida', 'Cuatro pasos y listo', '#reservar', 'drone', 210], ['c-cotiza', 'Tu total al instante', 'Sin pagar nada ahora', '#reservar', 'beach', 190], ['c-wa', 'Reserva por WhatsApp', 'Te respondemos al instante', '#reservar', 'hero', 170]]],
  ['propietarios', 'Propietarios', [['c-pool', 'Únete al pool', 'Pon tu embarcación a trabajar', '#propietarios', 'exterior', 220], ['c-servi', 'Servicios para propietarios', 'Capitán, inflables y más', '#propietarios', 'interior', 205]]]
];
const CARDS = SECS.flatMap(([sec, name, cards], si) => cards.map(c => ({ sec, si, secName: name, id: c[0], t: c[1], s: c[2], href: c[3], kind: c[4], hue: c[5] })));
T.NAV_CARDS = CARDS;   // el panel las lista en Portada para subir la imagen de cada pantalla
// imagen de relleno: ilustración generada y difuminada (cuando Eduardo suba la real, se ve nítida)
function fill(c) {
  const u = CAT.home && CAT.home.cards && CAT.home.cards[c.id];
  if (u) return `<img class="orb-img" src="${esc(u)}" alt="" loading="lazy" decoding="async">`;
  return `<span class="orb-img orb-soft" data-soft="${esc(c.id)}" style="background-color:hsl(${c.hue} 45% 55%)"></span>`;
}
/* Relleno difuminado sin filtros CSS (blur en 19 tarjetas 3D es lo que trababa el giro en el celular):
   la ilustración se dibuja una vez en un lienzo diminuto y se muestra ampliada, que se ve suave como un desenfoque
   y no cuesta nada al girar. Se guarda en memoria para no repetirlo. */
const SOFT = {};
function softSrc(c) {
  if (SOFT[c.id]) return SOFT[c.id];
  return SOFT[c.id] = new Promise(res => {
    let svg = c.kind === 'beach' ? beachArt({ id: c.id, hue: c.hue }) : art(c.kind, c.hue, c.id);
    svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" ');
    const im = new Image();
    im.onload = () => {
      try {
        const W = 120, H = 172, cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return [c, x]; };
        const [a, x] = cv(W, H), sc = Math.max(W / im.width, H / im.height) * 1.12, w = im.width * sc, h = im.height * sc;
        if ('filter' in x) {   // desenfoque real, dibujado una sola vez
          x.filter = 'blur(7px) saturate(1.3)'; x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        } else {               // navegadores sin filtro de lienzo: reducir y volver a ampliar en pasos suaves
          x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
          let src = a; for (const f of [2, 4, 8, 4, 2, 1]) { const [c, y] = cv(Math.round(W / f), Math.round(H / f)); y.drawImage(src, 0, 0, c.width, c.height); src = c; }
          x.clearRect(0, 0, W, H); x.drawImage(src, 0, 0);
        }
        res(a.toDataURL('image/jpeg', .82));
      } catch { res(''); }
    };
    im.onerror = () => res('');
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function soften(root) {
  $$('[data-soft]', root).forEach(el => { const c = CARDS.find(k => k.id === el.dataset.soft); if (!c) return; softSrc(c).then(u => { if (u && el.isConnected) { el.style.backgroundImage = `url(${u})`; el.removeAttribute('data-soft'); } }); });
}

function mount(host) {
  const small = host.classList.contains('sm');
  host.innerHTML = `<div class="orb-stage" tabindex="-1"><div class="orb-ring">${CARDS.map((c, i) => `<a class="orb-card" href="${c.href}" data-i="${i}" data-sec="${c.sec}" aria-label="${esc(c.t)}: ${esc(c.s)}">${fill(c)}<span class="orb-sheen" aria-hidden="true"></span><span class="orb-dim" aria-hidden="true"></span><span class="orb-tx"><small>${esc(SECS[c.si][1])}</small><b>${esc(c.t)}</b><span>${esc(c.s)}</span></span></a>`).join('')}</div></div>
    <div class="orb-tabs" role="tablist" aria-label="Secciones">${SECS.map(([k, n], i) => `<button type="button" role="tab" data-sec="${k}" data-si="${i}" aria-selected="false">${esc(n)}<i class="orb-bar" aria-hidden="true"></i></button>`).join('')}<span class="orb-ink" aria-hidden="true"></span></div>`;
  const stage = $('.orb-stage', host), ring = $('.orb-ring', host), cards = $$('.orb-card', host), tabs = $$('.orb-tabs [data-si]', host), ink = $('.orb-ink', host), tabRow = $('.orb-tabs', host);
  const N = cards.length, STEP = 360 / N;
  let rot = 0, vel = 0, target = null, drag = null, hover = false, seen = false, last = 0, active = -1, raf = 0, idleUntil = 0;
  /* Un cilindro de verdad, como en el video: las pantallas del frente se ven grandes, giran hacia atrás y por
     detrás siguen visibles (más pequeñas y al revés) entre los huecos de las de adelante. El número de
     pantallas es impar para que las de atrás no queden escondidas justo detrás de las del frente.
     La pantalla del frente queda en z = 0 (escala 1, texto nítido); el centro del cilindro está en z = -R. */
  const geo = () => {
    const w = stage.clientWidth, phone = w < 600;
    const cw = Math.round(phone ? Math.max(112, Math.min(170, w * .33)) : Math.max(170, Math.min(small ? 200 : 250, w * .19)));
    const R = N * cw * 1.28 / (2 * Math.PI);
    return { cw, ch: Math.round(cw * (phone ? 1.5 : 1.42)), R, P: R * 2, w };
  };
  let G = geo();
  const SEC_START = SECS.map((_, si) => CARDS.findIndex(c => c.si === si)), SEC_LEN = SECS.map(x => x[2].length);
  const bars = tabs.map(t => $('.orb-bar', t));
  let sized = '', frontCard = -1, lastP = -1;
  /* Rendimiento: por cuadro solo se cambia el transform de cada tarjeta (lo hace la tarjeta gráfica).
     Tamaños, perspectiva y estados se tocan solo cuando cambian, nunca variables CSS por cuadro. */
  function size() {
    const k = G.cw + '|' + G.ch + '|' + G.R.toFixed(1);
    if (k === sized) return; sized = k;
    host.style.setProperty('--cw', G.cw + 'px'); host.style.setProperty('--ch', G.ch + 'px');
    stage.style.perspective = G.P.toFixed(0) + 'px';
    const Rz = G.R.toFixed(1);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${(i * STEP).toFixed(3)}deg) translateZ(${Rz}px)`; });   // fijas en el cilindro
  }
  function place() {
    size();
    // un solo transform por cuadro: gira el cilindro entero, no las 19 tarjetas una por una
    ring.style.transform = `translateZ(${(-G.R).toFixed(1)}px) rotateY(${(-rot).toFixed(3)}deg)`;
    for (let i = 0; i < N; i++) {
      const a = ((i * STEP - rot) % 360 + 540) % 360 - 180;           // ángulo respecto al frente, -180..180
      const c = cards[i], back = Math.abs(a) > 90;
      if (back !== (c.dataset.back === '1')) { c.dataset.back = back ? '1' : ''; c.tabIndex = back ? -1 : 0; c.setAttribute('aria-hidden', String(back)); }
    }
    // sección al frente y cuánto lleva recorrido (la raya de la pestaña se llena mientras gira)
    const f = (((rot / STEP) % N) + N + .5) % N, front = Math.floor(f) % N, si = CARDS[front].si;
    if (front !== frontCard) { if (cards[frontCard]) cards[frontCard].classList.remove('is-front'); cards[front].classList.add('is-front'); frontCard = front; }
    if (si !== active) { active = si; lastP = -1; tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === si)); if (j !== si) bars[j].style.transform = 'scaleX(0)'; }); moveInk(); }
    const p = Math.round(Math.max(0, Math.min(1, (f - SEC_START[si]) / SEC_LEN[si])) * 200) / 200;
    if (p !== lastP) { lastP = p; bars[si].style.transform = `scaleX(${p})`; }
  }
  function moveInk() {
    const t = tabs[active]; if (!t) return;
    ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft}px)`;
    if (tabRow.scrollWidth > tabRow.clientWidth + 2 && !drag) { const want = t.offsetLeft - (tabRow.clientWidth - t.offsetWidth) / 2; if (Math.abs(tabRow.scrollLeft - want) > 4) tabRow.scrollTo({ left: want, behavior: reduce.matches ? 'auto' : 'smooth' }); }
  }
  const nearest = to => { const d = ((to - rot) % 360 + 540) % 360 - 180; return rot + d; };
  function goSec(si) { const i = CARDS.findIndex(c => c.si === si); target = nearest(i * STEP + STEP / 2); idleUntil = performance.now() + 6000; kick(); }
  function tick(t) {
    raf = 0; const dt = Math.min(48, t - (last || t)); last = t;
    if (!drag) {
      if (target != null) { const d = target - rot; rot += d * Math.min(1, dt / 140); if (Math.abs(d) < .05) { rot = target; target = null; } vel = 0; }
      else if (Math.abs(vel) > .01) { rot += vel * dt; vel *= Math.pow(.94, dt / 16); }
      else if (!hover && !reduce.matches && t > idleUntil) rot += dt * .0065;   // giro continuo y pausado para poder leer (una pantalla cada ~3 s)
      else if (t <= idleUntil || hover) { const s = nearest(Math.round(rot / STEP) * STEP); if (Math.abs(s - rot) > .05 && t > idleUntil - 5000) rot += (s - rot) * Math.min(1, dt / 220); }
    }
    place();
    if (seen && !document.hidden && host.offsetParent) raf = requestAnimationFrame(tick); else last = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  // arrastrar con el dedo o el mouse
  stage.addEventListener('pointerdown', e => { if (e.button > 0) return; drag = { x: e.clientX, r: rot, t: performance.now(), moved: false, id: e.pointerId, vx: 0 }; target = null; vel = 0; kick(); });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x; if (Math.abs(dx) > 6 && !drag.moved) { drag.moved = true; try { stage.setPointerCapture(e.pointerId); } catch {} }
    if (!drag.moved) return;
    const now = performance.now(), nr = drag.r - dx * (STEP / (G.cw * 1.28));
    drag.vx = (nr - rot) / Math.max(1, now - (drag.lt || now - 16)); drag.lt = now; rot = nr;
  }, { passive: true });
  const end = e => { if (!drag || (e && e.pointerId !== drag.id)) return; if (drag.moved) { vel = Math.max(-.6, Math.min(.6, drag.vx || 0)); stage.dataset.dragged = Date.now(); } drag = null; idleUntil = performance.now() + 5000; kick(); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  // un arrastre no debe abrir la pantalla que quedó debajo del dedo
  host.addEventListener('click', e => {
    const tab = e.target.closest('[data-si]'); if (tab) { goSec(+tab.dataset.si); return; }
    const c = e.target.closest('.orb-card'); if (!c) return;
    if (c.dataset.back === '1') { e.preventDefault(); return; }
    if (Date.now() - (+stage.dataset.dragged || 0) < 250) { e.preventDefault(); return; }
    if (c.getAttribute('href') === '#embarcaciones' && CARDS[+c.dataset.i].id === 'c-premium' && OWN) { e.preventDefault(); location.hash = 'embarcaciones'; setTimeout(() => T.openBoat(OWN.id), 60); }
  });
  host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; idleUntil = performance.now() + 400; } });
  host.addEventListener('pointerleave', () => { hover = false; kick(); });
  host.addEventListener('focusin', e => { const c = e.target.closest('.orb-card'); if (c) { target = nearest(+c.dataset.i * STEP); idleUntil = performance.now() + 8000; kick(); } });
  host.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const n = (active + (e.key === 'ArrowRight' ? 1 : -1) + SECS.length) % SECS.length; goSec(n);
    const t = tabs[n]; if (t && e.target.closest('.orb-tabs')) t.focus();
  });
  new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) kick(); }).observe(host);
  addEventListener('resize', () => { G = geo(); place(); moveInk(); });
  document.addEventListener('visibilitychange', kick);
  addEventListener('hashchange', () => setTimeout(() => { G = geo(); kick(); moveInk(); }, 60));
  host.orbit = { goSec, refresh: () => { cards.forEach((c, i) => { const im = $('.orb-img', c); im.outerHTML = fill(CARDS[i]); }); soften(host); }, kick: () => { G = geo(); kick(); } };
  soften(host); rot = 0; place(); requestAnimationFrame(() => { G = geo(); place(); moveInk(); });
}
const hosts = $$('[data-orbit]'); hosts.forEach(mount);
addEventListener('tll:cat', () => hosts.forEach(h => h.orbit && h.orbit.refresh()));

/* ---------------- búsqueda del encabezado ---------------- */
const box = $('#tsearch'), q = $('#ts-q'), res = $('#ts-res'), form = $('#ts-form');
const SEC_KW = {
  embarcaciones: 'lancha lanchas yate yates mini yate barco barcos flota catalogo boat boats yacht premium capitan',
  reservar: 'reservar reserva cotizar precio precios tarifa book booking quote total abono pagar',
  playas: 'playa playas rumbo rumbos islas isla millas beach beaches mochima parque',
  experiencias: 'experiencias canales morro pesca cumpleanos pedida corporativo celebracion fishing',
  regalos: 'regalo regalos tarjeta club referido codigo gift card',
  aliados: 'servicio a bordo aliados comida bebidas mercadillo dj fotografo estadia posada restaurante partners food',
  'mi-viaje': 'mi viaje gps seguimiento en vivo sos emergencia album fotos dron ubicacion tracking',
  nosotros: 'nosotros quienes somos contacto telefono whatsapp horario ubicacion muelles preguntas faq about',
  propietarios: 'propietarios pool propietario embarcacion postular dueno owners capitan servicios'
};
const SEC_N = { embarcaciones: 'Embarcaciones', reservar: 'Reservar', playas: 'Playas y rumbos', experiencias: 'Experiencias', regalos: 'Regalos y Club', aliados: 'Servicio a bordo', 'mi-viaje': 'Mi viaje', nosotros: 'Nosotros', propietarios: 'Propietarios' };
const IC = {
  sec: '<path d="M4 6h16M4 12h16M4 18h10"/>', boat: '<path d="M3 17l2 3h14l2-3M5 17V9l7-5 7 5v8"/>', beach: '<path d="M2 18c3 0 3-2 6-2s3 2 6 2 3-2 6-2M12 3v9M12 3l6 4M12 3L6 7"/>',
  ally: '<path d="M4 10h16l-1.5 9a2 2 0 01-2 1.7h-9a2 2 0 01-2-1.7zM8 10V7a4 4 0 018 0v3"/>', faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01"/>', exp: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>'
};
const KIND_N = { sec: 'Sección', boat: 'Embarcación', beach: 'Playa', route: 'Rumbo', ally: 'Servicio a bordo', faq: 'Pregunta frecuente', exp: 'Experiencia' };
function index() {
  const L = [];
  Object.keys(SEC_N).forEach(k => L.push({ k: 'sec', t: SEC_N[k], s: '', kw: SEC_KW[k], go: '#' + k }));
  BOATS.forEach(b => L.push({ k: 'boat', t: b.name, s: `${b.type} · ${b.ft} pies${b.own ? ' · recomendación de la casa' : ''}`, kw: `${b.type} ${b.own ? 'premium casa recomendada' : ''} ${(b.amen || []).join(' ')}`, boat: b.id }));
  ROUTES.forEach(r => {
    L.push({ k: 'route', ic: 'beach', t: `${r.name} · ${r.zone}`, s: `${r.nm ? '~' + r.nm + ' millas náuticas · ' : ''}${r.beaches.length} playas`, kw: r.beaches.join(' '), go: '#playas', el: 'rumbo-' + r.id });
    r.beaches.forEach(n => L.push({ k: 'beach', t: n, s: `${r.name} · ${r.zone}`, kw: r.zone, go: '#playas', el: 'rumbo-' + r.id }));
  });
  ALLIES.forEach(c => (c.items || []).forEach(it => L.push({ k: 'ally', t: it[0], s: it[1] || c.cat, kw: c.cat, go: c.owners ? '#propietarios' : '#aliados' })));
  [['Paseo por los canales de El Morro', 'Desde las 5:30 pm'], ['Pesca deportiva', 'Con capitán pescador'], ['Pedida de mano', 'Celebraciones a bordo'], ['Cumpleaños en el mar', 'Celebraciones a bordo'], ['Corporativo', 'Celebraciones a bordo']].forEach(([t, s]) => L.push({ k: 'exp', t, s, kw: '', go: '#experiencias' }));
  $$('#nosotros .faq details').forEach((d, i) => { const sm = $('summary', d); if (sm) L.push({ k: 'faq', t: sm.textContent.trim(), s: ($('p', d) || {}).textContent || '', kw: '', go: '#nosotros', faq: i }); });
  [['Modo a bordo y botón SOS', 'GPS del teléfono durante el paseo', '#mi-viaje', 'sos emergencia gps'], ['Álbum del día', 'Fotos y videos de dron de tu paseo', '#mi-viaje', 'album fotos dron'], ['Escoge tu muelle en el mapa', 'Marca tu punto de salida', '#reservar', 'muelle mapa residencia recogida'], ['Tarjeta de regalo', 'Regala un día en el mar', '#regalos', 'regalo gift'], ['Quiero formar parte del pool', 'Para propietarios', '#propietarios', 'pool propietario']].forEach(([t, s, go, kw]) => L.push({ k: 'sec', ic: 'exp', t, s, go, kw }));
  L.forEach(x => { x.nt = norm(x.t); x.nk = norm(x.kw + ' ' + x.s); });
  return L;
}
let IDX = null, hits = [], sel = -1;
addEventListener('tll:cat', () => { IDX = null; });
function search(term) {
  IDX ||= index();
  const w = norm(term).split(/\s+/).filter(Boolean);
  if (!w.length) return IDX.filter(x => ['Lancha de la casa', 'Isla de Plata', 'Reservar', 'Paseo por los canales de El Morro', 'Modo a bordo y botón SOS'].includes(x.t) || (x.boat && OWN && x.boat === OWN.id)).slice(0, 5);
  return IDX.map(x => {
    let sc = 0;
    for (const t of w) {
      if (x.nt.startsWith(t)) sc += 6; else if (x.nt.includes(' ' + t)) sc += 5; else if (x.nt.includes(t)) sc += 3; else if (x.nk.includes(t)) sc += 1.5; else return null;
    }
    return [sc + (x.k === 'sec' ? .5 : 0), x];
  }).filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 8).map(a => a[1]);
}
// en inglés el nombre se traduce antes de resaltar (si no, el resaltado parte la frase y no se traduce)
const L = t => window.TLL_I18N && TLL_I18N.tr ? TLL_I18N.tr(t) : t;
const hl = (t, term) => { const w = norm(term).split(/\s+/).filter(Boolean)[0]; if (!w) return esc(t); const i = norm(t).indexOf(w); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)); };
function draw() {
  const term = q.value.trim(); hits = search(term); sel = hits.length ? 0 : -1;
  res.innerHTML = (term ? '' : '<p class="ts-h">Sugerencias</p>') + (hits.length ? hits.map((x, i) => `<button type="button" role="option" id="ts-o${i}" class="ts-o" data-o="${i}" aria-selected="${i === sel}"><span class="ts-oi" aria-hidden="true"><svg viewBox="0 0 24 24">${IC[x.ic || (x.k === 'route' ? 'beach' : x.k)] || IC.sec}</svg></span><span class="ts-ot"><b translate="no">${hl(L(x.t), term)}</b>${x.s ? `<small>${esc(x.s.slice(0, 90))}</small>` : ''}</span><span class="ts-ok">${KIND_N[x.k]}</span></button>`).join('') : `<p class="ts-none">No encontramos “${esc(term)}”. Prueba con una playa, una embarcación o escríbenos por WhatsApp.</p>`);
  res.hidden = false; q.setAttribute('aria-expanded', 'true'); q.setAttribute('aria-activedescendant', sel >= 0 ? 'ts-o0' : '');
}
function pickSel() { $$('.ts-o', res).forEach((b, i) => b.setAttribute('aria-selected', String(i === sel))); q.setAttribute('aria-activedescendant', sel >= 0 ? 'ts-o' + sel : ''); const b = $(`#ts-o${sel}`); if (b) b.scrollIntoView({ block: 'nearest' }); }
function closeRes() { res.hidden = true; q.setAttribute('aria-expanded', 'false'); }
function closeBox() { closeRes(); box.classList.remove('open'); document.body.classList.remove('ts-on'); q.blur(); }
function go(x) {
  closeBox(); q.value = '';
  if (x.boat) { location.hash = 'embarcaciones'; setTimeout(() => T.openBoat(x.boat), 80); return; }
  const same = location.hash === x.go;
  location.hash = x.go.slice(1);
  setTimeout(() => {
    if (x.faq != null) { const d = $$('#nosotros .faq details')[x.faq]; if (d) { d.open = true; d.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' }); } }
    else if (x.el && document.getElementById(x.el)) document.getElementById(x.el).scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    else if (same) scrollTo({ top: 0, behavior: 'smooth' });
  }, 120);
}
q.addEventListener('focus', draw);
q.addEventListener('input', draw);
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!hits.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; pickSel(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (hits[sel]) go(hits[sel]); }
  else if (e.key === 'Escape') { e.preventDefault(); closeBox(); }
});
form.addEventListener('submit', e => { e.preventDefault(); if (hits[sel]) go(hits[sel]); });
res.addEventListener('mousedown', e => e.preventDefault());
res.addEventListener('click', e => { const o = e.target.closest('[data-o]'); if (o) go(hits[+o.dataset.o]); });
document.addEventListener('pointerdown', e => { if (!box.contains(e.target) && !e.target.closest('[data-side-search]')) { closeRes(); if (box.classList.contains('open') && !q.value) closeBox(); } });
function openBox() { box.classList.add('open'); document.body.classList.add('ts-on'); setTimeout(() => q.focus(), 30); }
$('#ts-open').addEventListener('click', openBox);
$('#ts-x').addEventListener('click', closeBox);
document.addEventListener('click', e => { if (e.target.closest('[data-side-search]')) { const c = $('#menu-close'); if (c) c.click(); setTimeout(openBox, 60); } });
addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openBox(); } else if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '') && !document.querySelector('dialog[open]')) { e.preventDefault(); openBox(); } });
if (!/Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent)) { const k = $('.ts-kbd'); if (k) k.textContent = 'Ctrl K'; }
// en el menú lateral se marca la sección actual
const markSide = () => { const h = (location.hash.slice(1) || 'inicio').split('/')[0]; $$('[data-side]').forEach(a => a.toggleAttribute('aria-current', a.dataset.side === h)); };
addEventListener('hashchange', markSide); markSide();
})();
