// Pruebas del modo a bordo: GPS real, SOS de 3 segundos, sin datos y permiso negado
const { chromium, devices } = require('playwright');
const URL = process.env.TLL_URL || 'http://127.0.0.1:8765/index.html';
const SHOTS = process.env.TLL_SHOTS || '';
(async () => {
  const b = await chromium.launch(); let f = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const DEV = [['iPhone 13', devices['iPhone 13']], ['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['Galaxy Fold 280', { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true }], ['iPad Mini', devices['iPad Mini']], ['Escritorio', { viewport: { width: 1440, height: 900 } }]];
  for (const [name, d] of DEV) {
    const c = await b.newContext({ ...d, deviceScaleFactor: 1, permissions: ['geolocation'], geolocation: { latitude: 10.2521, longitude: -64.6713, accuracy: 8 } });
    await c.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' }));
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const hold = async ms => { const r = await p.$eval('#dlg [data-sos]', e => { e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }); await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(150); };
    const panelOpen = () => p.$eval('#dlg [data-sos-panel]', e => !e.hidden);
    await p.goto(URL + '#mi-viaje'); await p.waitForTimeout(700);
    ok(await p.isVisible('[data-abordo-open]'), `${name}: Mi viaje muestra "Abrir modo a bordo"`);
    const calledEarly = await p.evaluate(() => localStorage.getItem('tll:lastpos'));
    ok(!calledEarly, `${name}: no pide ubicación antes de que el usuario toque`);
    await p.click('[data-abordo-open]'); await p.waitForSelector('#dlg[open] [data-abordo]'); await p.waitForTimeout(800);
    ok((await p.textContent('#dlg [data-gps]')).includes('GPS activo'), `${name}: GPS activo al abrir el modo a bordo (${(await p.textContent('#dlg [data-gps]')).trim()})`);
    ok((await p.textContent('#dlg [data-coords]')).includes('10.25210° N, 64.67130° O'), `${name}: muestra coordenadas reales del teléfono`);
    ok((await p.textContent('#dlg [data-net]')).includes('Con datos'), `${name}: indicador de datos`);
    await p.fill('#dlg [data-sos-name]', 'María');
    await hold(1200); ok(!(await panelOpen()), `${name}: soltar antes de 3 s cancela el SOS`);
    ok((await p.textContent('#dlg [data-sos-l]')).includes('mantén presionado'), `${name}: el botón vuelve a su estado`);
    // salir del botón con el dedo presionado también cancela
    const r = await p.$eval('#dlg [data-sos]', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, h: b.height }; });
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.move(r.x, r.y + r.h * 3); await p.waitForTimeout(2800); await p.mouse.up();
    ok(!(await panelOpen()), `${name}: deslizar fuera del botón cancela el SOS`);
    await hold(3300); ok(await panelOpen(), `${name}: mantener 3 s activa la alerta`);
    const msg = await p.textContent('#dlg [data-sos-msg]');
    ok(msg.includes('SOS') && msg.includes('10.25210° N, 64.67130° O') && msg.includes('maps.google.com/?q=10.252100,-64.671300') && msg.includes('María'), `${name}: mensaje con coordenadas, enlace de mapa y nombre`);
    const waHref = await p.getAttribute('#dlg [data-sos-wa]', 'href');
    ok(waHref.startsWith('https://wa.me/?text=') && decodeURIComponent(waHref).includes('maps.google.com'), `${name}: WhatsApp a cualquier contacto (sin número fijo)`);
    ok((await p.getAttribute('#dlg [data-sos-sms]', 'href')).startsWith('sms:?&body='), `${name}: SMS a cualquier contacto como respaldo`);
    ok(!/Tu Lancha/.test(await p.textContent('#dlg .sos-acts')), `${name}: ningún botón de la alerta dice "Tu Lancha"`);
    ok(await p.$('#dlg a[href="tel:911"]') !== null && await p.$('#dlg a[href="tel:+584143083864"]') === null, `${name}: llamar al 911, sin botón de llamar a Tu Lancha`);
    ok(await p.getAttribute('#dlg [data-sos-call]', 'href') === 'tel:' && (await p.textContent('#dlg [data-sos-call]')).trim() === 'Llamar', `${name}: "Llamar" abre el marcador para cualquier número`);
    await p.click('#dlg [data-sos-call]'); await p.waitForTimeout(150);
    ok(await p.isVisible('#dlg [data-call-box]') && await p.evaluate(() => document.activeElement.matches('[data-call-num]')), `${name}: sin contacto guardado, "Llamar" pide el número a quien quieras llamar`);
    await p.fill('#dlg [data-call-num]', '0412-765 4321');
    ok(await p.getAttribute('#dlg [data-call-go]', 'href') === 'tel:+584127654321', `${name}: llama al número que escribe la persona`);
    await p.fill('#dlg [data-sos-contact]', '0414 123 4567');
    ok(await p.getAttribute('#dlg [data-sos-call]', 'href') === 'tel:+584141234567' && (await p.getAttribute('#dlg [data-sos-wa]', 'href')).startsWith('https://wa.me/584141234567?text=') && (await p.getAttribute('#dlg [data-sos-sms]', 'href')).startsWith('sms:+584141234567?&body='), `${name}: con contacto de emergencia guardado, llamar, WhatsApp y SMS van a ese contacto`);
    await p.fill('#dlg [data-sos-contact]', '');
    ok(await p.$('#dlg a[href="tel:+582814180257"]') !== null && await p.$('#dlg a[href="tel:+582812683844"]') !== null && await p.$('#dlg a[href="tel:+582812677452"]') !== null && (await p.textContent('#dlg .sos-auth')).includes('0281-2683844'), `${name}: llamar a Guardacostas Guanta y Capitanía de Puerto La Cruz`);
    const fit = await p.evaluate(() => { const d = document.querySelector('#dlg'); return d.scrollWidth <= d.clientWidth + 1 && [...d.querySelectorAll('.sos-acts .btn')].every(x => x.getBoundingClientRect().right <= innerWidth + 1); });
    ok(fit, `${name}: la alerta cabe en la pantalla sin desborde`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/sos-${name.replace(/\W+/g, '')}.png` });
    // SMS: indicación de tocar ENVIAR y confirmación al volver
    await p.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a[href^="sms:"],a[href*="wa.me"]')) e.preventDefault(); }));
    await p.click('#dlg [data-sos-sms]'); await p.waitForTimeout(200);
    ok((await p.textContent('#dlg [data-sos-ack]')).includes('Toca ENVIAR en Mensajes'), `${name}: al tocar SMS indica en grande que falta tocar ENVIAR`);
    await p.waitForTimeout(6300);
    ok(await p.isVisible('#dlg [data-ack-yes]') && await p.isVisible('#dlg [data-ack-no]'), `${name}: al volver pregunta si se envió, con opción de reintentar`);
    await p.click('#dlg [data-ack-no]'); await p.waitForTimeout(150); ok((await p.textContent('#dlg [data-sos-ack]')).includes('Toca ENVIAR'), `${name}: reintentar vuelve a abrir Mensajes`);
    await p.waitForTimeout(6300); await p.click('#dlg [data-ack-yes]');
    ok((await p.textContent('#dlg [data-sos-ack]')).includes('Alerta enviada por SMS'), `${name}: confirma la alerta enviada con la hora`);
    // sin datos
    await c.setOffline(true); await p.evaluate(() => dispatchEvent(new Event('offline'))); await p.waitForTimeout(200);
    ok((await p.textContent('#dlg [data-net]')).includes('Sin datos'), `${name}: sin datos se indica en rojo`);
    ok((await p.textContent('#dlg [data-sos-note]')).includes('SMS'), `${name}: sin datos sugiere SMS y copiar`);
    const first = await p.evaluate(() => { const a = [...document.querySelectorAll('#dlg .sos-acts > .btn')].sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top); return a[0].hasAttribute('data-sos-sms'); });
    ok(first, `${name}: sin datos el SMS pasa primero`);
    await c.setOffline(false); await p.evaluate(() => dispatchEvent(new Event('online')));
    // cerrar apaga el GPS y guarda la última posición
    await p.click('#dlg [data-sos-x]'); ok(!(await panelOpen()), `${name}: cerrar alerta`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !!JSON.parse(localStorage.getItem('tll:lastpos')).lat), `${name}: guarda la última posición para zonas sin señal`);
    // posición guardada cuando el GPS falla
    await c.clearPermissions(); await c.setGeolocation(null).catch(() => {});
    await p.reload(); await p.waitForTimeout(500); await p.click('[data-abordo-open]'); await p.waitForTimeout(1500);
    const st = (await p.textContent('#dlg [data-gps]')).trim();
    ok(/Permiso|débil|Buscando/.test(st) && (await p.textContent('#dlg [data-coords]')).includes('10.25210'), `${name}: sin permiso o sin GPS usa la última posición guardada (${st})`);
    await hold(3300); ok((await p.textContent('#dlg [data-sos-msg]')).includes('guardada'), `${name}: la alerta indica que la posición es guardada`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // vista en vivo usa el mismo SOS real
    await p.evaluate(() => { location.hash = 'mi-viaje'; }); await p.click('form[data-go="viaje"] button'); await p.waitForSelector('#dlg[open] [data-abordo]');
    ok(await p.$('#dlg #lv-sos') === null && await p.$('#dlg [data-sos]') !== null, `${name}: la vista en vivo usa el SOS real`);
    await p.keyboard.press('Escape');
    ok(!errs.length, `${name}: sin errores de JavaScript ${errs.join(' | ')}`);
    await c.close();
  }
  console.log(f ? `\n${f} FALLAS de ${n}` : `\nTODO OK · ${n} comprobaciones`); await b.close(); process.exit(f ? 1 : 0);
})();
