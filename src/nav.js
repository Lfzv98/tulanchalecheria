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
  ['embarcaciones', 'Embarcaciones', [['c-premium', 'Lancha prémium', 'La más solicitada', '#embarcaciones', 'drone', 200], ['c-flota', 'Lanchas, mini yates y yates', 'Toda la flota con capitán', '#embarcaciones', 'exterior', 215]]],
  ['playas', 'Playas', [['c-rumbos', 'Seis rumbos', 'Por el Parque Nacional Mochima', '#playas', 'beach', 185]]],
  ['experiencias', 'Experiencias', [['c-canales', 'Canales de El Morro', 'Al caer la tarde', '#experiencias', 'hero', 25], ['c-pesca', 'Pesca de altura', 'Más allá de Isla La Borracha', '#experiencias', 'drone', 215]]],
  ['regalos', 'Regalos y Club', [['c-regalo', 'Regala un día en el mar', 'Tarjetas de regalo', '#regalos', 'hero', 340], ['c-club', 'Club Tu Lancha Lechería', 'Invita y ganan los dos', '#club', 'exterior', 160]]],
  ['aliados', 'Servicio a bordo', [['c-comida', 'Comida y bebidas', 'Te lo llevan al muelle', '#aliados', 'interior', 30], ['c-vip', 'Estilo y hospedaje', 'Aliados VIP', '#aliados', 'hero', 280]]],
  ['nosotros', 'Nosotros', [['c-somos', 'Quiénes somos', 'Gente de mar de Lechería', '#nosotros', 'hero', 200]]],
  ['reservar', 'Reservar', [['c-wa', 'Reserva por WhatsApp', 'Te respondemos al instante', '#reservar', 'hero', 170]]],
  ['propietarios', 'Propietarios', [['c-servi', 'Servicios para propietarios', 'Proveedores, alquiler y auxilio', '#propietarios', 'interior', 205]]]
].filter(([sec]) => !(T.OFF || {})[sec]);   // secciones apagadas (Regalos y Club, por ahora) no salen en el menú giratorio
const CARDS = SECS.flatMap(([sec, name, cards], si) => cards.map(c => ({ sec, si, secName: name, id: c[0], t: c[1], s: c[2], href: c[3], kind: c[4], hue: c[5] })));
T.NAV_CARDS = CARDS;   // el panel las lista en Portada para subir la imagen de cada pantalla
// fotos que mandó Eduardo (18 nov) para estas pantallas, mientras no suba otras en Portada y tienda
const DEF_CARD_IMG = { 'c-canales': 'media/exp-canales.webp', 'c-pesca': 'media/exp-pesca.webp' };
// imagen de relleno: ilustración generada y difuminada (cuando Eduardo suba la real, se ve nítida)
function fill(c) {
  const u = (CAT.home && CAT.home.cards && CAT.home.cards[c.id]) || DEF_CARD_IMG[c.id];
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
/* Rendimiento: los rellenos se dibujan de a uno, en los ratos libres del teléfono, para no trabar la carga ni el giro */
const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 1200 }) : f => setTimeout(f, 60);
function soften(root) {
  const q = $$('[data-soft]', root);
  const next = () => { const el = q.shift(); if (!el) return; const c = CARDS.find(k => k.id === el.dataset.soft);
    if (!c) return idle(next);
    softSrc(c).then(u => { if (u && el.isConnected) { el.style.backgroundImage = `url(${u})`; el.removeAttribute('data-soft'); } idle(next); }); };
  idle(next);
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
  /* Giro continuo sin JavaScript por cuadro (fluidez en el celular): mientras nadie lo toca, el cilindro gira con una
     animación CSS que corre en la tarjeta gráfica. Solo cada 250 ms se calcula qué pantalla está al frente (pestañas,
     accesibilidad). Al arrastrar, tocar una pestaña o enfocar, vuelve el control por cuadro y al soltar retoma el giro. */
  /* Ritmo de lectura (pedido de Eduardo, 18 nov): gira solo, continuo y despacio, para leer cada pantalla mientras pasa:
     PER ms por pantalla (vuelta completa = N × PER). La animación CSS corre en la tarjeta gráfica. */
  const PER = 5200, TURN = N * PER, SPEED = STEP / PER;
  let css = null, cssTimer = 0;
  const cssRot = () => css ? css.r0 + ((css.pausedAt || performance.now()) - css.t0) * SPEED : rot;
  function startCss() {
    if (css || reduce.matches) return;
    const r0 = Math.round(rot / STEP) * STEP;   // siempre arranca con una pantalla bien al frente
    css = { r0, t0: performance.now(), pausedAt: 0 }; rot = r0;
    ring.style.setProperty('--tz', (-G.R).toFixed(1) + 'px'); ring.style.setProperty('--r0', (-r0).toFixed(3) + 'deg');
    ring.style.animation = `orbSpin ${TURN}ms linear infinite`;
    if (!seen || document.hidden) { css.pausedAt = performance.now(); ring.style.animationPlayState = 'paused'; }
    status();
    clearInterval(cssTimer); cssTimer = setInterval(() => { if (!css || css.pausedAt) return; rot = cssRot(); status(); }, 250);
  }
  // ángulo real en este instante, leído de la animación (así al tocarlo no salta)
  function liveRot() {
    const est = cssRot(), m = getComputedStyle(ring).transform.match(/matrix3d\(([^)]+)\)/); if (!m) return est;
    const v = m[1].split(',').map(Number), a = Math.atan2(v[2], v[0]) * 180 / Math.PI;   // rotateY(-rot): m11 = cos, m13 = sen
    return a + Math.round((est - a) / 360) * 360;
  }
  function stopCss() {
    if (!css) return;
    rot = liveRot(); css = null; clearInterval(cssTimer);
    ring.style.animation = ''; ring.style.animationPlayState = '';
    ring.style.transform = `translateZ(${(-G.R).toFixed(1)}px) rotateY(${(-rot).toFixed(3)}deg)`;
  }
  // en pausa (fuera de pantalla o con la pestaña oculta), la animación CSS se detiene y el reloj se corre para no saltar
  function pauseCss(on) {
    if (!css) return;
    if (on && ring.style.animationPlayState !== 'paused') { css.pausedAt = performance.now(); ring.style.animationPlayState = 'paused'; }
    if (!on && ring.style.animationPlayState === 'paused') { if (css.pausedAt) css.t0 += performance.now() - css.pausedAt; css.pausedAt = 0; ring.style.animationPlayState = 'running'; }
  }
  function place() {
    size();
    // un solo transform por cuadro: gira el cilindro entero, no las pantallas una por una
    ring.style.transform = `translateZ(${(-G.R).toFixed(1)}px) rotateY(${(-rot).toFixed(3)}deg)`;
    status();
  }
  function status() {
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
  function goSec(si) { const i = CARDS.findIndex(c => c.si === si), n = CARDS.filter(c => c.si === si).length; target = nearest((i + (n - 1) / 2) * STEP); /* secciones de 1 tarjeta: centrada en ella */ idleUntil = performance.now() + 6000; kick(); }
  function tick(t) {
    raf = 0; const dt = Math.min(48, t - (last || t)); last = t;
    if (!drag) {
      if (target != null) { const d = target - rot; rot += d * Math.min(1, dt / 140); if (Math.abs(d) < .05) { rot = target; target = null; } vel = 0; }
      else if (Math.abs(vel) > .01) { rot += vel * dt; vel *= Math.pow(.94, dt / 16); }
      else if (!hover && !reduce.matches && t > idleUntil) { place(); last = 0; startCss(); return; }   // giro continuo: lo hace CSS
      else if (t <= idleUntil || hover) { const s = nearest(Math.round(rot / STEP) * STEP); if (Math.abs(s - rot) > .05 && t > idleUntil - 5000) rot += (s - rot) * Math.min(1, dt / 220); else if (!drag && target == null && t <= idleUntil) { place(); raf = 0; last = 0; clearTimeout(wake); wake = setTimeout(kick, Math.max(50, idleUntil - performance.now() + 20)); return; } else if (hover) { place(); last = 0; return; } }
    }
    place();
    if (seen && !document.hidden && host.offsetParent) raf = requestAnimationFrame(tick); else last = 0;
  }
  let wake = 0;
  const kick = () => { stopCss(); if (!raf) raf = requestAnimationFrame(tick); };
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
  host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; idleUntil = performance.now() + 400; kick(); } });
  host.addEventListener('pointerleave', () => { hover = false; kick(); });
  host.addEventListener('focusin', e => { const c = e.target.closest('.orb-card'); if (c) { target = nearest(+c.dataset.i * STEP); idleUntil = performance.now() + 8000; kick(); } });
  host.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
    const n = (active + (e.key === 'ArrowRight' ? 1 : -1) + SECS.length) % SECS.length; goSec(n);
    const t = tabs[n]; if (t && e.target.closest('.orb-tabs')) t.focus();
  });
  new IntersectionObserver(es => { seen = es[0].isIntersecting; if (css) pauseCss(!seen || document.hidden); else if (seen) kick(); }).observe(host);
  addEventListener('resize', () => { const was = !!css; stopCss(); G = geo(); place(); moveInk(); if (was) kick(); });
  document.addEventListener('visibilitychange', () => { if (css) pauseCss(!seen || document.hidden); else kick(); });
  addEventListener('hashchange', () => setTimeout(() => { G = geo(); kick(); moveInk(); }, 60));
  host.orbit = { goSec, refresh: () => { cards.forEach((c, i) => { const im = $('.orb-img', c); im.outerHTML = fill(CARDS[i]); }); soften(host); }, kick: () => { G = geo(); kick(); } };
  soften(host); rot = 0; place(); requestAnimationFrame(() => { G = geo(); place(); moveInk(); });
}
const hosts = $$('[data-orbit]'); hosts.forEach(mount);
addEventListener('tll:cat', () => hosts.forEach(h => h.orbit && h.orbit.refresh()));

// en el menú lateral se marca la sección actual
const markSide = () => { const h = (location.hash.slice(1) || 'inicio').split('/')[0]; $$('[data-side]').forEach(a => a.toggleAttribute('aria-current', a.dataset.side === h)); };
addEventListener('hashchange', markSide); markSide();
})();
