// Pruebas del seguimiento en vivo real: un teléfono comparte su GPS y otro ve la lancha moverse.
// Necesita el servidor de prueba: node tests-vivo-servidor.js dist api/live.js 8766 que ejecuta api/live.js con un Redis en memoria.
const { chromium, devices } = require('playwright');
const BASE = process.env.TLL_LIVE || 'http://127.0.0.1:8766/';
const SHOTS = process.env.TLL_SHOTS || '';
(async () => {
  const b = await chromium.launch(); let f = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const tile = r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
  for (const [name, devA, devB] of [['iPhone → Android', devices['iPhone 13'], devices['Pixel 7']], ['Android → Escritorio', devices['Pixel 7'], { viewport: { width: 1440, height: 900 } }]]) {
    await (await fetch(BASE + '__reset')).text();
    // A: teléfono a bordo que comparte
    const A = await b.newContext({ locale: 'es-VE', ...devA, deviceScaleFactor: 1, permissions: ['geolocation'], geolocation: { latitude: 10.2100, longitude: -64.6800, accuracy: 6 } });
    await A.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' })); await A.route(/tile\.openstreetmap/, tile);
    await A.addInitScript(() => { window.__sh = []; navigator.share = async o => { window.__sh.push(o); }; });
    const a = await A.newPage(); const ea = []; a.on('pageerror', e => ea.push(e.message));
    await a.goto(BASE + 'index.html#mi-viaje'); await a.waitForTimeout(500);
    await a.click('[data-abordo-open]'); await a.waitForSelector('#dlg[open] [data-lshare]'); await a.waitForTimeout(600);
    ok(await a.isVisible('[data-ls-start]'), `${name}: el modo a bordo ofrece "Compartir en vivo"`);
    await a.click('[data-ls-start]'); await a.waitForTimeout(800);
    const sh = await a.evaluate(() => window.__sh[0]);
    ok(sh && /#sigue\/[a-z2-9]{20}$/.test(sh.url) && !/584143083864/.test(sh.url + sh.text), `${name}: comparte un enlace propio a cualquier contacto (hoja de compartir, sin número fijo)`);
    await a.waitForFunction(() => /En vivo/.test(document.querySelector('[data-ls-st]').textContent), null, { timeout: 8000 }).catch(() => {});
    ok(/En vivo/.test(await a.textContent('[data-ls-st]')), `${name}: el teléfono a bordo indica que está transmitiendo (${(await a.textContent('[data-ls-st]')).trim()})`);
    const url = sh.url.replace(/^https?:\/\/[^/]+\//, BASE);
    // B: familiar que abre el enlace
    const B = await b.newContext({ locale: 'es-VE', ...devB, deviceScaleFactor: 1 });
    await B.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' })); await B.route(/tile\.openstreetmap/, tile);
    const v = await B.newPage(); const eb = []; v.on('pageerror', e => eb.push(e.message));
    await v.goto(url); await v.waitForSelector('#dlg[open].follow-dlg');
    await v.waitForFunction(() => document.querySelector('[data-f-pos]').textContent.includes('10.21000'), null, { timeout: 10000 }).catch(() => {});
    ok((await v.textContent('[data-f-pos]')).includes('10.21000° N, 64.68000° O'), `${name}: quien abre el enlace ve la posición real del teléfono`);
    ok(await v.$('.leaflet-container') !== null && await v.$('.f-boat') !== null, `${name}: mapa real con la lancha marcada`);
    ok((await v.textContent('[data-f-badge]')).includes('En vivo'), `${name}: estado "En vivo"`);
    // se mueve
    await A.setGeolocation({ latitude: 10.2200, longitude: -64.6600, accuracy: 6 }); await a.waitForTimeout(300);
    await v.waitForFunction(() => document.querySelector('[data-f-pos]').textContent.includes('10.22000'), null, { timeout: 9000 }).catch(() => {});
    ok((await v.textContent('[data-f-pos]')).includes('10.22000° N, 64.66000° O'), `${name}: la lancha se mueve en el mapa sin recargar`);
    const d1 = await v.textContent('[data-f-dist]');
    ok(d1 !== '0,0 MN', `${name}: suma la distancia recorrida (${d1})`);
    // A pierde datos: las posiciones se guardan en el teléfono
    await A.setOffline(true); await a.evaluate(() => dispatchEvent(new Event('offline')));
    for (const [la, lo] of [[10.245, -64.655], [10.228, -64.625], [10.25, -64.60]]) { await A.setGeolocation({ latitude: la, longitude: lo, accuracy: 6 }); await a.waitForTimeout(4300); }
    const st = await a.textContent('[data-ls-st]');
    ok(/Sin datos · [23] posiciones guardadas/.test(st), `${name}: sin datos guarda el recorrido en el teléfono (${st.trim()})`);
    ok((await v.textContent('[data-f-pos]')).includes('10.22000'), `${name}: mientras no hay señal, quien mira conserva la última posición`);
    // vuelve la señal: se envía todo solo y el mapa salta a la posición actual
    await A.setOffline(false); await a.evaluate(() => dispatchEvent(new Event('online')));
    await v.waitForFunction(() => document.querySelector('[data-f-pos]').textContent.includes('10.25000'), null, { timeout: 9000 }).catch(() => {});
    ok((await v.textContent('[data-f-pos]')).includes('10.25000° N, 64.60000° O'), `${name}: al volver la señal, el mapa salta solo a la posición actual`);
    const segs = await v.evaluate(() => { const p = document.querySelector('.leaflet-overlay-pane path'); return p ? (p.getAttribute('d').match(/L/g) || []).length + 1 : 0; });
    ok(segs >= 4, `${name}: dibuja también el tramo recorrido sin señal (${segs} puntos)`);
    ok(/En vivo/.test(await a.textContent('[data-ls-st]')), `${name}: el teléfono a bordo vuelve a "En vivo" solo`);
    // B pierde y recupera conexión: se pone al día al instante
    await B.setOffline(true); await v.evaluate(() => dispatchEvent(new Event('offline'))); await v.waitForTimeout(1200);
    ok((await v.textContent('[data-f-badge]')).includes('Sin conexión'), `${name}: quien mira ve "Sin conexión" si su teléfono pierde datos`);
    await A.setGeolocation({ latitude: 10.2600, longitude: -64.5900, accuracy: 6 }); await a.waitForTimeout(1500);
    await B.setOffline(false); const t0 = Date.now(); await v.evaluate(() => dispatchEvent(new Event('online')));
    await v.waitForFunction(() => document.querySelector('[data-f-pos]').textContent.includes('10.26000'), null, { timeout: 6000 }).catch(() => {});
    ok((await v.textContent('[data-f-pos]')).includes('10.26000') && Date.now() - t0 < 3000, `${name}: al reconectar, quien mira salta a la posición actual al instante (${Date.now() - t0} ms)`);
    // reanudar tras recargar la app a bordo
    await a.reload(); await a.waitForTimeout(800);
    await A.setGeolocation({ latitude: 10.2700, longitude: -64.5800, accuracy: 6 }); await a.waitForTimeout(500);
    await v.waitForFunction(() => document.querySelector('[data-f-pos]').textContent.includes('10.27000'), null, { timeout: 9000 }).catch(() => {});
    ok((await v.textContent('[data-f-pos]')).includes('10.27000'), `${name}: si se cierra y se vuelve a abrir la app, sigue compartiendo sola`);
    if (SHOTS) { await v.waitForTimeout(400); await v.screenshot({ path: `${SHOTS}/follow-${name.replace(/\W+/g, '')}.png` }); }
    // terminar
    await a.click('[data-abordo-open]'); await a.waitForSelector('#dlg[open] [data-ls-stop]');
    if (SHOTS) { await a.$eval('[data-lshare]', e => e.scrollIntoView({ block: 'center' })); await a.waitForTimeout(200); await a.screenshot({ path: `${SHOTS}/share-${name.replace(/\W+/g, '')}.png` }); }
    await a.click('[data-ls-stop]'); await a.waitForTimeout(400);
    await v.waitForFunction(() => /Terminado/.test(document.querySelector('[data-f-badge]').textContent), null, { timeout: 9000 }).catch(() => {});
    ok((await v.textContent('[data-f-badge]')).includes('Terminado'), `${name}: al dejar de compartir, quien mira ve que el viaje terminó`);
    ok(await a.evaluate(() => !localStorage.getItem('tll:share')), `${name}: dejar de compartir borra el enlace del teléfono`);
    // la vista de ejemplo lleva a compartir la ubicación real
    await a.keyboard.press('Escape'); await a.evaluate(() => { location.hash = 'mi-viaje'; }); await a.click('form[data-go="viaje"] button'); await a.waitForSelector('#dlg[open] #lv-share');
    await a.click('#lv-share'); await a.waitForTimeout(500);
    ok(await a.isVisible('#dlg [data-ls-start]'), `${name}: "Compartir mi ubicación real" abre el modo a bordo para compartir`);
    ok(!ea.length && !eb.length, `${name}: sin errores de JavaScript ${ea.concat(eb).join(' | ')}`);
    await A.close(); await B.close();
  }
  // enlaces inválidos
  const C = await b.newContext({ locale: 'es-VE', viewport: { width: 390, height: 844 } }); await C.route(/tile\.openstreetmap/, tile); await C.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' }));
  const c = await C.newPage(); await c.goto(BASE + 'index.html#sigue/abcdefghijkmnpqrstuv'); await c.waitForTimeout(1500);
  ok((await c.textContent('[data-f-badge]')).includes('Inactivo'), 'Enlace inexistente: avisa que no está activo');
  await C.close();
  console.log(f ? `\n${f} FALLAS de ${n}` : `\nTODO OK · ${n} comprobaciones`); await b.close(); process.exit(f ? 1 : 0);
})();
