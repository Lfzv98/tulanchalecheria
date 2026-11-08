/* ---------------- idiomas (español e inglés de EE. UU.) ----------------
   La web abre siempre en español. El botón del encabezado cambia a inglés y vuelve a español;
   la elección se recuerda en ese teléfono. No se detecta el idioma del teléfono.
   El español es el texto original del sitio. Las traducciones viven en i18n-dict.js como
   pares exactos y patrones (para frases con números, nombres o fechas).
   Este archivo traduce el DOM en vivo (también lo que la app pinta después) y ofrece
   tr() para lo que no es DOM: mensajes de WhatsApp, SMS, comprobante PDF, títulos.
   Para agregar otro idioma: añadirlo a LANGS y una columna más en i18n-dict.js. */
(() => {
'use strict';
const LANGS = {
  es: { name: 'Español', short: 'ES', loc: 'es-VE', og: 'es_VE' },
  en: { name: 'English', short: 'EN', loc: 'en-US', og: 'en_US' }
};
const CODES = Object.keys(LANGS);
const KEY = 'tll:lang';
function detect() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (CODES.includes(s)) return s; } catch {}
  const q = new URLSearchParams(location.search).get('lang'); if (CODES.includes(q)) return q;
  return 'es';
}
let lang = detect();

/* ---------- diccionario ---------- */
const RAW = window.TLL_DICT || { exact: [], pat: [] };
const COL = { en: 1 };
const norm = s => s.replace(/\s+/g, ' ').trim();
const EX = {}, PAT = {};
for (const c of CODES) {
  if (c === 'es') continue;
  const i = COL[c];
  EX[c] = new Map(RAW.exact.filter(r => r[i] != null).map(r => [norm(r[0]), r[i]]));
  PAT[c] = RAW.pat.filter(r => r[i] != null).map(r => ({ re: r[0], out: r[i] }));
}
const KEEP = new Set(RAW.keep || []);
const MISS = window.__I18N_MISS || null; // solo en pruebas: frases sin traducir

const fill = (out, m, c) => typeof out === 'function' ? out(m, s => trLine(s, c)) : out.replace(/\{(t?)(\d)\}/g, (_, t, n) => { const v = m[+n] ?? ''; return t ? trLine(v, c) : v; });
let CTX = ''; // contexto opcional (data-i18n-ctx) para palabras que cambian según dónde estén
function trCore(s, c) {
  if (!s) return s;
  if (CTX) { const cx = EX[c].get(CTX + '|' + s); if (cx != null) return cx; }
  const ex = EX[c].get(s); if (ex != null) return ex;
  for (const p of PAT[c]) { const m = s.match(p.re); if (m) return fill(p.out, m, c); }
  return null;
}
// prefijo de emoji/espacios y sufijo de espacios se conservan tal cual
const EDGE = /^([\s\p{Extended_Pictographic}\uFE0F\u200D•·*_–—\-→←↑↓✓✔➕]*)([\s\S]*?)(\s*)$/u;
function trLine(s, c) {
  const m = s.match(EDGE); const pre = m[1], core = norm(m[2]), post = m[3];
  if (!core || !/\p{L}/u.test(core)) return s;
  let out = trCore(core, c);
  if (out == null) { // sin la puntuación final
    const p = core.match(/^([\s\S]*?)([:.,;]+)$/); if (p) { const o = trCore(p[1], c); if (o != null) out = o + p[2]; }
  }
  if (out == null) { // enlace al final (p. ej. "…en tiempo real: https://…")
    const u = core.match(/^(.*\S)\s+(https?:\/\/\S+)$/); if (u) { const o = trLine(u[1], c); if (o !== u[1]) out = o + ' ' + u[2]; }
  }
  if (out == null) { // varias oraciones seguidas
    const ss = core.split(/(?<=[a-záéíóúñ0-9)%"][.!?:])\s+(?=[¿¡A-ZÁÉÍÓÚÑ"(])/u);
    if (ss.length > 1) { const ts = ss.map(x => trLine(x, c)); if (ts.some((x, i) => x !== ss[i])) out = ts.join(' '); }
  }
  if (out == null && core.includes(' · ')) { // partes separadas por punto medio
    const parts = core.split(' · '), tp = parts.map(x => { const o = trLine(x, c); return o; });
    if (tp.some((x, i) => x !== parts[i])) out = tp.join(' · ');
  }
  if (out == null) { if (MISS && !KEEP.has(core) && /[a-záéíóúñ]{2}/i.test(core)) MISS.add(core); return s; }
  return pre + out + post;
}
function tr(s, c = lang) {
  if (c === 'es' || s == null) return s;
  s = String(s);
  if (s.includes('\n')) return s.split('\n').map(l => trLine(l, c)).join('\n');
  return trLine(s, c);
}

/* ---------- DOM ---------- */
const SKIP = 'script,style,svg,noscript,code,textarea.notranslate,#adm,[translate="no"],.notranslate';
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'value', 'data-label'];
const TXT = new WeakMap(); // nodo de texto → {src, out}
const ATT = new WeakMap(); // elemento → {attr: {src, out}}
let busy = false;
function textNode(n) {
  const p = n.parentElement; if (!p || p.closest(SKIP)) return;
  const rec = TXT.get(n); const src = rec && n.data === rec.out ? rec.src : n.data;
  if (!/\p{L}/u.test(src)) return;
  const cx = p.closest('[data-i18n-ctx]'); CTX = cx ? cx.dataset.i18nCtx : '';
  const out = tr(src); CTX = '';
  if (p.tagName === 'OPTION' && !p.hasAttribute('value') && out !== src) p.setAttribute('value', src.trim());
  TXT.set(n, { src, out });
  if (n.data !== out) n.data = out;
}
function attrs(el) {
  if (el.closest(SKIP)) return;
  let rec = ATT.get(el);
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    if (a === 'value' && !(el.tagName === 'INPUT' && /^(text|button|submit|)$/.test(el.getAttribute('type') || ''))) continue;
    const cur = el.getAttribute(a); const r = rec && rec[a]; const src = r && cur === r.out ? r.src : cur;
    if (!/\p{L}/u.test(src)) continue;
    const out = tr(src);
    if (!rec) { rec = {}; ATT.set(el, rec); }
    rec[a] = { src, out };
    if (cur !== out) { el.setAttribute(a, out); if (a === 'value' && el.value === cur) el.value = out; }
  }
}
function walk(root) {
  if (!root) return;
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1) return;
  if (root.closest && root.closest(SKIP)) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
}
const mo = new MutationObserver(list => {
  if (busy) return;
  busy = true;
  try {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes' && ATTRS.includes(m.attributeName)) attrs(m.target);
    }
  } finally { mo.takeRecords(); busy = false; }
});

/* ---------- selector de idioma ---------- */
const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
// el botón muestra el idioma al que cambia: EN en la web en español, ES en la web en inglés
const UI = { es: 'Ver la web en inglés (English)', en: 'View the site in Spanish (Español)' };
function picker() {
  const host = document.querySelector('.top-actions'); if (!host || document.getElementById('lang')) return;
  const box = document.createElement('div');
  box.className = 'lang'; box.id = 'lang'; box.setAttribute('translate', 'no');
  box.innerHTML = `<button type="button" class="lang-btn" id="lang-btn">${GLOBE}<b></b></button>`;
  host.insertBefore(box, host.firstChild);
  box.querySelector('#lang-btn').onclick = () => setLang(lang === 'es' ? 'en' : 'es');
  sync();
}
function sync() {
  const box = document.getElementById('lang'); if (!box) return;
  const to = lang === 'es' ? 'en' : 'es', b = box.querySelector('#lang-btn');
  b.querySelector('b').textContent = LANGS[to].short;
  b.setAttribute('aria-label', UI[lang]); b.title = UI[lang]; b.setAttribute('lang', to);
}
function meta() {
  document.documentElement.lang = lang;
  const og = document.querySelector('meta[property="og:locale"]'); if (og) og.content = LANGS[lang].og;
}

function setLang(c) {
  if (!CODES.includes(c)) return;
  const changed = c !== lang;
  lang = c;
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  meta(); sync();
  busy = true; try { walk(document.body); } finally { mo.takeRecords(); busy = false; }
  if (changed) window.dispatchEvent(new CustomEvent('tll:lang', { detail: c }));
}

/* ---------- enlaces de WhatsApp: el texto se traduce justo al tocarlos ----------
   La app arma los enlaces en español; así siempre salen en el idioma actual, aunque se haya cambiado después.
   La alerta SOS no pasa por aquí: ya va en español + traducción (ver bi). */
const HREF = new WeakMap();
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
  if (!a || a.closest('[data-sos-wa],[translate="no"]') || a.matches('[data-sos-wa]')) return;
  let u; try { u = new URL(a.href); } catch { return; }
  const cur = u.searchParams.get('text'); if (cur == null) return;
  const r = HREF.get(a); const src = r && cur === r.out ? r.src : cur;
  const out = tr(src); HREF.set(a, { src, out });
  if (out !== cur) { u.searchParams.set('text', out); a.href = u.toString().replace(/\+/g, '%20'); }
}, true);

// comprobante PDF: traduce cada texto que se dibuja (también los títulos en MAYÚSCULAS)
function trUp(s) {
  const t = tr(s); if (t !== s || lang === 'es') return t;
  if (/\p{Lu}{3}/u.test(s) && s === s.toUpperCase()) { const c = s.charAt(0) + s.slice(1).toLowerCase(), t2 = tr(c); if (t2 !== c) return t2.toUpperCase(); }
  return s;
}
function pdf(d) {
  if (lang === 'es') return d;
  const t0 = d.text.bind(d), s0 = d.splitTextToSize.bind(d);
  d.text = (s, ...a) => t0(Array.isArray(s) ? s.map(trUp) : trUp(s), ...a);
  d.splitTextToSize = (s, ...a) => s0(trUp(s), ...a);
  return d;
}

window.TLL_I18N = {
  pdf,
  LANGS, CODES, tr, setLang,
  get lang() { return lang; },
  loc: () => LANGS[lang].loc,
  // texto para números de Venezuela (911, Guardacostas): español primero y traducción debajo
  bi: s => lang === 'es' ? s : `${s}\n\n— ${LANGS[lang].name} —\n${tr(s)}`,
  // textos que Eduardo escribe en el panel, con su traducción al inglés: [[es, en], ...]
  add(rows) { (rows || []).forEach(r => { if (!r || !r[0]) return; if (r[1]) EX.en.set(norm(r[0]), r[1]); }); }
};

function start() {
  meta();
  busy = true; try { walk(document.body); } finally { busy = false; }
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  picker();
  document.documentElement.classList.remove('i18n-wait');
}
if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
