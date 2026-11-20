// Busca textos y botones que se pisan, se salen de la pantalla o quedan cortados, en el panel y en la web,
// en laptop, ventana, tablet, celular y Fold. Uso: node tests-vivo-servidor.js dist api/live.js 8766 &  →  node tests-detalles.js panel | web
// (TLL_CAT=ruta/catalogo.json para probar con un catálogo real)
const { chromium, devices } = require('playwright'); const cr = require('crypto'); const fs = require('fs');
const BASE = 'http://127.0.0.1:8766/';
const pipe = cmds => fetch(BASE + 'fake-redis/pipeline', { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify(cmds) });
const CHECK = (root) => {
  const sel = 'em, .ad-hint, .field > span, button, input, select, textarea, label, a, p, h1, h2, h3, h4, small, .hint, img, span.tag, .chip, b, strong';
  const els = [...document.querySelectorAll(sel.split(',').map(x => root + ' ' + x.trim()).join(','))].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !e.closest('[hidden],dialog:not([open])') && !e.closest('.ribbon,.orbit-band,.hero-media,.gal,.t-gal,.orb-card'); });
  const R = els.map(e => e.getBoundingClientRect()); const out = [];
  const W = document.documentElement.clientWidth;
  els.forEach((e, i) => { if (R[i].right > W + 1 && !e.closest('.ad-px-wrap,.tbl-wrap,[style*="overflow"]')) { let p = e.parentElement, scr = false; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { scr = true; break; } p = p.parentElement; } if (!scr) out.push('SALE DE PANTALLA: ' + desc(e)); } });
  function desc(e) { return e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' «' + (e.innerText || e.value || e.placeholder || e.alt || '').trim().slice(0, 40) + '»'; }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    const x = R[i], y = R[j];
    const ix = Math.min(x.right, y.right) - Math.max(x.left, y.left), iy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
    if (ix > 4 && iy > 4) {
      // ignora cosas puestas encima a propósito (insignias, botones sobre fotos)
      const top = document.querySelector(root); const abs = el => { let p = el; while (p && p !== document.body && p !== top) { const ps = getComputedStyle(p).position; if (ps === 'absolute' || ps === 'fixed' || ps === 'sticky') return true; p = p.parentElement; } return false; };
      if (abs(a) || abs(b)) continue;
      if (a.tagName === 'LABEL' && (a.control === b || a.htmlFor === b.id)) continue;
      if (a.getClientRects().length > 1 || b.getClientRects().length > 1) continue;
      if (!(a.innerText || a.value || a.tagName === 'IMG' || a.tagName === 'INPUT') || !(b.innerText || b.value || b.tagName === 'IMG' || b.tagName === 'INPUT')) continue;
      out.push('SE PISAN: ' + desc(a) + '  ×  ' + desc(b));
    }
  }
  [...document.querySelectorAll(sel.split(',').map(x => root + ' ' + x.trim()).join(','))].forEach(e => { const cs = getComputedStyle(e); if (!e.offsetParent || e.classList.contains('sr-only') || e.closest('[hidden],.ribbon,.orb-card,.ad-px-wrap')) return; if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 3 && e.children.length === 0 && (e.innerText || '').trim()) out.push('TEXTO CORTADO: ' + desc(e)); });
  return [...new Set(out)].slice(0, 25);
};
(async () => {
  await fetch(BASE + '__reset');
  const salt = cr.randomBytes(16).toString('hex'), iter = 1000;
  await pipe([['SET', 'adm:cred', JSON.stringify({ user: 'prueba', salt, iter, hash: cr.pbkdf2Sync('Clave-Prueba-1', salt, iter, 32, 'sha256').toString('hex') })], ...(fs.existsSync(process.env.TLL_CAT || '') ? [['SET', 'adm:cat', fs.readFileSync(process.env.TLL_CAT, 'utf8')]] : [])]);
  for (const [i, x] of [['TLL-4101', { boat: 'Wet dreams 24', name: 'María Fernanda Rodríguez de los Ángeles', phone: '+58 414 555 1234', iso: '2026-12-05', route: 'Rumbo 3 · Islas Arapo · estado Sucre', dock: 'Cerro El Morro · Hotel Eurobuilding', pax: 6, kids: 2, total: 420, det: 'Accesorios: Inflable de flor ×2\nComidas: Six pack de cervezas ×3\nObservaciones: celebramos un cumpleaños, llevamos torta' }], ['TLL-4102', { boat: 'Pirri 30', name: 'Ana', phone: '04145550000', iso: '2026-11-28', route: 'Rumbo 1', dock: 'C.C. Plaza Mayor', pax: 4, total: 380 }], ['TLL-4103', { boat: 'Apollo one 40', name: 'Carlos Alberto Pérez Mendoza', phone: '+1 305 555 0101', iso: '2026-11-18', route: 'Rumbo 2 · Bahía de Guanta', dock: 'Puerto Príncipe', pax: 12, total: 950 }]].entries()) {
    await fetch(BASE + 'api/admin?a=book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: x[0], ...x[1] }) });
  }
  await pipe([['HSET', 'adm:sv', 'TLL-4103', JSON.stringify({ stars: 4, good: 'La tripulación fue excelente y muy atenta con los niños', better: 'Más sombra en la proa', rec: 1, at: Date.now() })]]);
  const b = await chromium.launch();
  const sizes = [['laptop', { viewport: { width: 1440, height: 900 } }], ['laptop13', { viewport: { width: 1210, height: 760 } }], ['ventana', { viewport: { width: 1024, height: 760 } }], ['tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true }], ['celular', { ...devices['iPhone 13'] }], ['fold', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]];
  const only = process.argv[2];
  for (const [n, o] of sizes) {
    const p = await (await b.newContext(o)).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '#capitan'); await p.waitForSelector('#lg'); await p.fill('#lg-u', 'prueba'); await p.fill('#lg-p', 'Clave-Prueba-1'); await p.click('#lg-go'); await p.waitForSelector('.ad-tabs');
    await p.evaluate(() => localStorage.setItem('tll:adm-welcome', 'true')); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const tabs = await p.$$eval('.ad-tabs [data-adtab]', a => a.map(x => x.dataset.adtab));
    if (only === 'web') tabs.length = 0;
    for (const t of tabs) { if (only && only !== 'panel') break;
      await p.evaluate(k => document.querySelector(`.ad-tabs [data-adtab="${k}"]`).click(), t); await p.waitForTimeout(350);
      const r = await p.evaluate(CHECK, '#adm'); if (t === tabs[0]) console.log(n, 'elementos', await p.evaluate(() => document.querySelectorAll('#adm *').length)); if (r.length) console.log(`[panel ${n} · ${t}]\n  ` + r.join('\n  '));
    }
    if (only === 'web') {
      const W = await (await b.newContext(o)).newPage(); W.on('pageerror', e => errs.push(e.message));
      const go = async h => { await W.goto(BASE + 'index.html#' + h); await W.waitForTimeout(900); };
      const look = async k => { await W.waitForTimeout(300); const r = await W.evaluate(CHECK, 'body'); if (r.length) console.log(`[web ${n} · ${k}]\n  ` + r.join('\n  ')); };
      await W.goto(BASE + 'index.html'); await W.waitForTimeout(1500);
      for (const h of ['inicio', 'embarcaciones', 'playas', 'experiencias', 'aliados', 'nosotros', 'propietarios', 'mi-viaje']) { await go(h); await W.evaluate(() => window.scrollTo(0, 0)); await look(h); }
      await go('reservar'); for (let st = 0; st < 5; st++) { await W.evaluate(s => TLL.goStep(s), st); await look('reservar paso ' + (st + 1)); }
      const bk = await W.$('#t-book:visible, #mb-book:visible'); if (bk) { await bk.click(); await W.waitForTimeout(500); await look('confirmar reserva'); }
      await W.keyboard.press('Escape');
      await go('embarcaciones'); const det = await W.evaluate(() => { const d = [...document.querySelectorAll('[data-open]')].find(x => x.offsetParent); if (d) d.click(); return !!d; }); if (det) { await W.waitForTimeout(600); await look('detalle embarcación'); }
      await W.close(); continue;
    }
    // estados extra: datos de ejemplo, editores y hojas
    const STATES = [
      ['demo', async () => { await p.evaluate(() => document.querySelector('.ad-tabs [data-adtab="inicio"]').click()); await p.waitForTimeout(250); const d = await p.$('#a-demo'); if (d) { await d.click(); await p.waitForTimeout(400); } }],
      ['demo-reservas', async () => { await p.evaluate(() => document.querySelector('.ad-tabs [data-adtab="reservas"]').click()); await p.waitForTimeout(400); }],
      ['reserva-detalle', async () => { const r = await p.$('#adm [data-bka="edit"]'); if (r) { await r.click().catch(() => {}); await p.waitForTimeout(400); } }],
      ['registrar', async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.evaluate(() => { document.querySelectorAll('.ad-ov').forEach(o => o.remove()); document.querySelector('.ad-tabs [data-adtab="reservas"]').click(); }); await p.waitForTimeout(250); const r = await p.$('#adm .ad-head .btn-sun'); if (r) { await r.click(); await p.waitForTimeout(400); } }],
      ['editar-embarcacion', async () => { await p.evaluate(() => { document.querySelectorAll('.ad-ov').forEach(o => o.remove()); document.querySelector('.ad-tabs [data-adtab="flota"]').click(); }); await p.waitForTimeout(300); await p.click('[data-boat-edit="0"]'); await p.waitForTimeout(500); }],
      ['ayuda', async () => { await p.evaluate(() => document.querySelectorAll('.ad-ov').forEach(o => o.remove())); const h = await p.$('#adm [data-help]'); if (h) { await h.click(); await p.waitForTimeout(400); } }],
    ];
    if (!only || only === 'panel') for (const [k, fn] of STATES) { try { await fn(); } catch (e) { console.log(n, k, 'no se pudo', e.message.slice(0, 80)); continue; }
      const root = await p.$('.ad-ov.on .ad-sheet') ? '.ad-ov.on .ad-sheet' : '#adm';
      const r = await p.evaluate(CHECK, root); if (r.length) console.log(`[panel ${n} · ${k}]\n  ` + r.join('\n  ')); }
    if (errs.length) console.log(n, 'errores', errs);
  }
  await b.close();
})();
