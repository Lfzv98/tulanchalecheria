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
