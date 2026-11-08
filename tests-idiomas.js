// Pruebas del selector de idiomas (español, inglés, portugués) en celulares, tablet y escritorio
const { chromium, devices } = require('playwright');
const URL = process.env.TLL_URL || 'http://127.0.0.1:8765/index.html';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const DEV = [
  ['Galaxy Fold 280', { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true, userAgent: devices['Galaxy S9+'].userAgent }],
  ['iPhone SE', devices['iPhone SE']], ['iPhone 13', devices['iPhone 13']], ['Pixel 7', devices['Pixel 7']],
  ['iPad Mini', devices['iPad Mini']], ['Laptop 1280', { viewport: { width: 1280, height: 720 } }], ['Escritorio 1920', { viewport: { width: 1920, height: 1080 } }]
];
// palabras que no deben quedar en pantalla en inglés (de la portada y la reserva)
const ES_LEFT = ['Reservar mi salida', 'Embarcaciones y tarifas', 'Arma tu salida', 'Siguiente', 'Tu cotización', 'por persona', 'Preguntas frecuentes', 'Quiénes somos', 'Elige tu'];
(async () => {
  const b = await chromium.launch();
  // 1) detección del idioma del navegador la primera vez
  for (const [loc, want] of [['es-VE', 'es'], ['en-US', 'en'], ['pt-BR', 'pt'], ['pt-PT', 'pt'], ['fr-FR', 'es']]) {
    const c = await b.newContext({ locale: loc }); await c.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' }));
    const p = await c.newPage(); await p.goto(URL); await p.waitForTimeout(400);
    const got = await p.evaluate(() => [TLL_I18N.lang, document.documentElement.lang, document.querySelector('#lang-btn b').textContent]);
    ok(got[0] === want && got[2] === want.toUpperCase(), `navegador ${loc} → ${want} (${got.join(' ')})`);
    await c.close();
  }
  for (const [name, d] of DEV) {
    const c = await b.newContext({ ...d, locale: 'es-VE', deviceScaleFactor: 1, acceptDownloads: true });
    await c.route(/open-meteo|youtu|instagram|wa\.me/, r => r.fulfill({ status: 200, body: 'ok' }));
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const pops = []; p.on('popup', async x => { pops.push(decodeURIComponent(x.url())); await x.close().catch(() => {}); });
    await p.goto(URL); await p.waitForTimeout(600);
    const tap = async s => { const h = await p.waitForSelector(s, { state: 'visible', timeout: 4000 }); d.hasTouch ? await h.tap() : await h.click(); await p.waitForTimeout(200); };
    // 2) el botón está en la barra superior, visible y sin desbordar
    const box = await p.evaluate(() => { const r = document.querySelector('#lang-btn').getBoundingClientRect(), t = document.querySelector('#topbar').getBoundingClientRect(); return { inBar: r.top >= t.top && r.bottom <= t.bottom, right: r.right, W: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, overlap: (() => { const b = document.querySelector('.topbar .brand').getBoundingClientRect(); return b.right > r.left; })() }; });
    ok(box.inBar && box.right <= box.W && box.sw <= box.W && !box.overlap, `${name}: botón de idioma en la barra superior, sin tapar el logo ni desbordar`);
    // 3) abrir el menú y elegir inglés
    await tap('#lang-btn'); ok(await p.isVisible('#lang-menu'), `${name}: se abre el menú de idiomas`);
    const mb = await p.evaluate(() => { const r = document.querySelector('#lang-menu').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
    ok(mb, `${name}: el menú cabe en la pantalla`);
    await tap('[data-lang="en"]'); await p.waitForTimeout(300);
    ok(!(await p.isVisible('#lang-menu')), `${name}: el menú se cierra al elegir`);
    const home = await p.evaluate(() => ({ h1: document.querySelector('.hero h1').textContent, lang: document.documentElement.lang, cta: document.querySelector('.hero .ctas a').textContent }));
    ok(home.h1.includes('Your day at sea') && home.cta === 'Book my trip' && home.lang === 'en', `${name}: portada en inglés (${home.h1})`);
    // 4) recorrido por las vistas sin restos en español
    for (const v of ['embarcaciones', 'reservar', 'playas', 'experiencias', 'regalos', 'aliados', 'mi-viaje', 'nosotros', 'propietarios']) {
      await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(250);
      const t = await p.evaluate(v => document.querySelector(`[data-view="${v}"]`).innerText, v);
      const left = ES_LEFT.filter(w => t.includes(w));
      ok(!left.length, `${name}: ${v} sin textos en español (${left.join(', ')})`);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(sw <= 0, `${name}: ${v} sin desborde horizontal en inglés (${sw}px)`);
    }
    // 5) fechas y montos con formato del idioma
    await p.evaluate(() => location.hash = 'reservar'); await p.waitForTimeout(300);
    const tk = await p.textContent('#ticket');
    ok(/Your quote/.test(tk) && /per person/.test(tk) && !/(lun|mar|mié|jue|vie|sáb|dom)\.?,? \d/.test(tk), `${name}: cotización en inglés con fecha en inglés`);
    // 6) WhatsApp sale en el idioma elegido
    if (name === 'iPhone 13' || name === 'Laptop 1280') {
      await p.evaluate(() => location.hash = 'inicio'); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('.cta-band .btn-wa').click()); await p.waitForTimeout(500);
      ok(pops.some(u => u.includes("Hi Tu Lancha, I'd like information about a charter")), `${name}: WhatsApp en inglés (${pops.slice(-1)})`);
      // reserva completa → comprobante y mensaje
      await p.evaluate(() => location.hash = 'reservar'); await p.waitForTimeout(300);
      await p.evaluate(() => TLL.openBooking()); await p.waitForSelector('#dlg[open] #bk-form');
      const bk = await p.textContent('#bk-form');
      ok(bk.includes('Confirm your booking') && bk.includes('How would you like to pay the deposit?') && bk.includes('Main terms'), `${name}: confirmación y pago en inglés`);
      await p.fill('#bk-name', 'Ana Test'); await p.check('#bk-ok'); await p.click('#bk-go'); await p.waitForSelector('#dlg[open] #bk-code');
      ok((await p.textContent('#dlg')).includes('Booking registered!'), `${name}: pantalla final en inglés`);
      await p.evaluate(() => document.querySelector('#bk-send').click()); await p.waitForTimeout(500);
      const msg = pops.find(u => u.includes('I made a booking'));
      ok(!!msg && msg.includes('Code: TLL-') && msg.includes('Estimated total') && msg.includes('Can you confirm availability'), `${name}: mensaje de la reserva en inglés`);
      const pdf = await p.evaluate(async () => { const r = JSON.parse(localStorage.getItem('tll:mine'))[0]; const bl = await TLL.pdfFor(r); return bl.size; });
      ok(pdf > 20000, `${name}: comprobante PDF generado en inglés (${Math.round(pdf / 1024)} KB)`);
      await p.keyboard.press('Escape');
      // SOS: español primero (para 911 y Guardacostas) y luego el idioma elegido
      await p.evaluate(() => location.hash = 'mi-viaje'); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('[data-abordo-open]').click()); await p.waitForSelector('#dlg[open] [data-abordo]');
      ok((await p.textContent('#dlg')).includes('press and hold for 3 seconds'), `${name}: modo a bordo en inglés`);
      await p.evaluate(() => { const b = document.querySelector('#dlg [data-sos]'); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
      await p.waitForTimeout(3300);
      const sos = await p.textContent('#dlg [data-sos-msg]');
      ok(sos.startsWith('🆘 SOS · EMERGENCIA EN EL MAR') && sos.includes('— English —') && sos.includes('EMERGENCY AT SEA') && sos.includes('Necesitamos ayuda.') && sos.includes('We need help.'), `${name}: alerta SOS bilingüe (español + inglés)`);
      const sms = await p.getAttribute('#dlg [data-sos-sms]', 'href');
      ok(decodeURIComponent(sms).includes('EMERGENCIA EN EL MAR') && decodeURIComponent(sms).includes('EMERGENCY AT SEA'), `${name}: SMS del SOS bilingüe`);
      await p.evaluate(() => document.querySelector('#dlg').close());
    }
    // 7) portugués y vuelta al español sin recargar
    await tap('#lang-btn'); await tap('[data-lang="pt"]');
    ok((await p.textContent('.hero h1')).includes('Seu dia no mar'), `${name}: portada en portugués`);
    await p.evaluate(() => location.hash = 'reservar'); await p.waitForTimeout(250);
    ok((await p.textContent('#ticket')).includes('Seu orçamento'), `${name}: cotización en portugués`);
    await tap('#lang-btn'); await tap('[data-lang="es"]');
    ok((await p.textContent('#ticket')).includes('Tu cotización') && (await p.textContent('.hero h1')).includes('Tu día en el mar'), `${name}: vuelve al español`);
    // 8) se recuerda la elección
    await tap('#lang-btn'); await tap('[data-lang="en"]'); await p.reload(); await p.waitForTimeout(500);
    ok(await p.evaluate(() => TLL_I18N.lang === 'en' && document.querySelector('.hero h1').textContent.includes('Your day at sea')), `${name}: recuerda el inglés al volver a abrir`);
    // teclado: Esc cierra el menú
    if (!d.hasTouch) { await p.click('#lang-btn'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Escape'); ok(!(await p.isVisible('#lang-menu')), `${name}: Esc cierra el menú`); }
    ok(!errs.length, `${name}: sin errores de JavaScript (${errs.join(' | ')})`);
    await c.close();
  }
  await b.close();
  console.log(`\n${n - fails}/${n} verificaciones OK`);
  process.exit(fails ? 1 : 0);
})();
