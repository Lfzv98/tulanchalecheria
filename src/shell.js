(() => {
'use strict';
const { $, $$, Q, renderBuilder, BOATS } = window.TLL;
const VIEWS = $$('.page').map(v => v.dataset.view);
const ALIAS = { flota: 'embarcaciones', lanchas: 'embarcaciones', canales: 'experiencias', cotizar: 'reservar', pool: 'propietarios', club: 'regalos', referidos: 'regalos', preguntas: 'nosotros', mar: 'inicio', 'inicio-mas': 'inicio' };
// Regalos y Club está oculto por ahora (pedido de Eduardo, 18 nov): sus enlaces llevan al inicio
const OFF = window.TLL.OFF || {};
if (OFF.regalos) { ALIAS.club = ALIAS.referidos = ALIAS.regalos = 'inicio'; }
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// en pantallas táctiles el cambio de sección es directo: la transición de vista fotografiaba la página entera y se sentía lenta
const touchUI = matchMedia('(hover: none), (max-width: 900px)');
const topbar = $('#topbar');
let current = null;

/* ---------- enrutador por vistas ---------- */
function target() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (VIEWS.includes(h) && !OFF[h]) return [h, null];
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
    document.title = name === 'inicio' ? TLL_I18N.tr('Tu Lancha Lechería · Paseos en lancha y yates a Mochima') : `${$(`[data-view="${name}"] h1`)?.textContent.trim() || ''} · Tu Lancha Lechería`;
    const ogT = document.querySelector('meta[property="og:title"]'), ogU = document.querySelector('meta[property="og:url"]');
    if (ogT) ogT.setAttribute('content', document.title);
    if (ogU) ogU.setAttribute('content', location.origin + location.pathname + (name === 'inicio' ? '' : '#' + name));
    if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
    else if (current !== name) scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    current = name;
    if (name === 'reservar') { renderBuilder(); goStep(step); }
    syncMinibar(); syncVideo(); parallax();
  };
  if (current && current !== name && document.startViewTransition && !reduce.matches && !touchUI.matches) { const vt = document.startViewTransition(swap); [vt.ready, vt.finished, vt.updateCallbackDone].forEach(x => x && x.catch(() => {})); } else swap();
}
function route() { const [v, a] = target(); closeSheet(); if (v !== current || a) show(v, a); }
addEventListener('hashchange', route);

/* ---------- reserva paso a paso ---------- */
let step = 0, mbReady = false;
const steps = $$('.step'), labels = $$('#stepper [data-go]'), LAST = steps.length - 1;   // 5 pasos: Accesorios y Comidas y bebidas van aparte (18 nov)
function goStep(n) {
  step = Math.max(0, Math.min(LAST, n));
  steps.forEach((s, i) => { const on = i === step; if (s.hidden === on) { s.hidden = !on; if (on) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); } } });
  labels.forEach((b, i) => { b.setAttribute('aria-selected', String(i === step)); b.classList.toggle('done', i < step); });
  $('#stepper-fill').style.width = ((step + 1) / steps.length * 100) + '%';
  $('#st-back').style.visibility = step === 0 ? 'hidden' : 'visible';
  const nx = $('#st-next');
  if (step === LAST) { nx.textContent = 'Reservar ahora'; } else { nx.textContent = 'Siguiente'; }
  document.body.classList.toggle('st-last', step === LAST);   // el resumen muestra "Reservar ahora" solo al final (celular)
  if (mbReady) syncMinibar();
}
$('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goStep(+b.dataset.go); });
$('#st-back').onclick = () => { goStep(step - 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); };
$('#st-next').onclick = () => {
  if (step < LAST) { goStep(step + 1); $('#stepper').scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' }); }
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
const mb = $('#minibar'); mbReady = true;
let ticketIn = false;
new IntersectionObserver(es => { ticketIn = es[0].isIntersecting; syncMinibar(); }, { threshold: .25 }).observe($('#ticket'));
function syncMinibar() {
  const on = current === 'reservar' && !ticketIn && !!BOATS.find(x => x.id === Q.boat);
  // el botón de reservar solo aparece en el último paso (pedido de Eduardo); antes se ve solo el total
  const last = step === LAST;
  mb.classList.toggle('show', on); mb.classList.toggle('no-btn', !last); mb.setAttribute('aria-hidden', String(!on)); $('#mb-book').hidden = !last; $('#mb-book').tabIndex = on && last ? 0 : -1;
}

/* ---------- menú ---------- */
const sheet = $('#sheet');
function openSheet() { sheet.hidden = false; $('#menu-open')?.setAttribute('aria-expanded', 'true'); setTimeout(() => $('#menu-close').focus(), 30); }
function closeSheet() { if (sheet.hidden) return; sheet.hidden = true; $('#menu-open')?.setAttribute('aria-expanded', 'false'); }
$('#menu-open').onclick = openSheet; $('#menu-close').onclick = closeSheet;
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('a')) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- carrusel del hero: fundido lento + Ken Burns, como un video ---------- */
const reel = $('#hero-reel'), slides = $$('#hero-reel .slide');
const saveData = navigator.connection && navigator.connection.saveData;
let slideI = 0, reelT = 0, reelSeen = true;
function nextSlide() {
  const a = slides[slideI]; slideI = (slideI + 1) % slides.length; const b = slides[slideI];
  a.classList.add('out'); a.classList.remove('on'); b.classList.remove('out'); b.classList.add('on');
  setTimeout(() => { if (!a.classList.contains('on')) a.classList.remove('out'); }, 2800);
}
/* Video del dron (12 nov): siempre rueda en bucle en el hero (pedido de Luis), también en iPhone.
   Las etiquetas <source> y autoplay van en el HTML, así que arranca solo sin depender de este script.
   Aquí solo se pausa cuando no se ve (otra sección o pestaña oculta) para no gastar batería, y se reintenta
   el play por si el navegador bloqueó el autoplay. Mientras carga se ve su primer cuadro (poster). */
const hv = $('#hero-vid');
const playHero = () => { if (hv && hv.paused) { const p = hv.play(); if (p && p.catch) p.catch(() => {}); } };
if (hv) {
  hv.muted = true;
  // Solo se muestra cuando de verdad está rodando: si iOS bloquea el autoplay (modo de bajo consumo),
  // el video queda invisible y se ve el póster limpio, sin el botón de play nativo encima del título.
  hv.addEventListener('playing', () => reel.classList.add('vid-on'));
  // si el sistema lo detiene por su cuenta (no nosotros), volver al póster en vez de mostrar un video congelado con botón
  hv.addEventListener('pause', () => { if (!hv.__ownPause) reel.classList.remove('vid-on'); hv.__ownPause = false; });
  hv.setAttribute('webkit-playsinline', ''); hv.controls = false;
  playHero();
  // por si el navegador (iPhone en bajo consumo) bloquea el autoplay hasta el primer gesto
  ['touchstart', 'pointerdown', 'scroll', 'click'].forEach(ev => addEventListener(ev, () => { if (current === 'inicio') playHero(); }, { passive: true, once: true }));
}
function syncVideo() {
  if (!reel) return;
  const want = current === 'inicio' && !reduce.matches && !saveData && document.visibilityState === 'visible' && reelSeen;
  reel.classList.toggle('paused', !want);
  const vidWant = current === 'inicio' && document.visibilityState === 'visible' && reelSeen;   // el video rueda siempre que se vea
  if (hv) { if (vidWant) playHero(); else if (!hv.paused) { hv.__ownPause = true; hv.pause(); } }
  if (want && !reelT && slides.length > 1) reelT = setInterval(nextSlide, 3000);
  if (!want && reelT) { clearInterval(reelT); reelT = 0; }
}
document.addEventListener('visibilitychange', syncVideo);
reduce.addEventListener?.('change', syncVideo);
if (reel) new IntersectionObserver(es => { reelSeen = es[0].isIntersecting; syncVideo(); }).observe(reel);

/* ---------- parallax por capas (transform, rAF) ---------- */
const layers = $$('.px');
let ticking = false, pxOn = true;
const noPx = matchMedia('(hover: none), (max-width: 900px)');
function parallax() {
  ticking = false;
  // en el celular y la tableta (pantallas táctiles) no hay parallax: el hero baja con la página, sin trabajo por cada scroll
  if (reduce.matches || current !== 'inicio' || noPx.matches) { if (pxOn) { layers.forEach(l => l.style.transform = ''); pxOn = false; } topbar.classList.toggle('solid', scrollY > 40); return; }
  pxOn = true;
  const k = innerWidth < 900 ? .55 : 1, vh = innerHeight;
  // primero se leen todas las medidas y después se escriben (leer y escribir intercalado forzaba recálculos en cada scroll)
  const plan = layers.map(l => { const host = l.closest('.hero, .layers'); return [l, host, host.getBoundingClientRect()]; });
  for (const [l, host, r] of plan) {
    if (r.bottom < -100 || r.top > vh + 100) continue;
    const prog = host.classList.contains('hero') ? -r.top : (r.top + r.height / 2 - vh / 2) * -1;
    const t = `translate3d(0, ${(prog * +l.dataset.speed * k).toFixed(1)}px, 0)`;
    if (l.style.transform !== t) l.style.transform = t;
  }
  const y = scrollY;
  topbar.classList.toggle('solid', y > 40);
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
addEventListener('resize', parallax);
// (la barra superior se actualiza dentro de parallax(), en el mismo cuadro)

/* enlaces que llevan a otra vista con un destino o embarcación ya elegidos (los maneja app.js) */
route(); if (!current) show('inicio');
/* pie de página: año actual y volver arriba dentro de la misma vista */
{ const y = $('#f-year'); if (y) y.textContent = new Date().getFullYear(); }
$('#f-top')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }));

/* ---------- instalación PWA (Android / Desktop + modal iOS) ---------- */
const installBtn = $('#install'), instDlg = $('#inst-dlg');
const standaloneMQ = matchMedia('(display-mode: standalone)');
const isStandalone = () => standaloneMQ.matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = () => isIOS() || /Android|Mobile/i.test(navigator.userAgent) || touchUI.matches;
let deferredPrompt = null, appInstalled = false;
function syncInstall() {
  if (!installBtn) return;
  if (appInstalled || isStandalone()) { installBtn.hidden = true; return; }
  installBtn.hidden = !(deferredPrompt || isMobile());
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; syncInstall(); });
addEventListener('appinstalled', () => { appInstalled = true; deferredPrompt = null; syncInstall(); });
standaloneMQ.addEventListener?.('change', syncInstall);
touchUI.addEventListener?.('change', syncInstall);
if (installBtn) {
  installBtn.onclick = async () => {
    if (deferredPrompt) {
      const p = deferredPrompt;
      deferredPrompt = null;
      try {
        await p.prompt();
        const res = await p.userChoice;
        if (res && res.outcome === 'accepted') appInstalled = true;
      } catch {}
      syncInstall();
      return;
    }
    if (instDlg && !instDlg.open) instDlg.showModal();
  };
}
if (instDlg) {
  instDlg.addEventListener('click', e => {
    if (e.target === instDlg || e.target.closest('.m-close, #inst-ok')) instDlg.close();
  });
}
syncInstall();

window.TLL.goStep = goStep;
})();
