// Pruebas del panel de control de punta a punta, contra el servidor local con la API real (api/admin.js)
// y un Redis falso en memoria:
//   node tests-vivo-servidor.js dist api/live.js 8766 &
//   TLL_USER=... TLL_PASS=... node tests-panel.js [carpeta-para-capturas]
const { chromium, devices } = require('playwright');
const OUT = (process.argv[2] || '/tmp') + '/';
const BASE = 'http://127.0.0.1:8766/';
const USER = process.env.TLL_USER, PASS = process.env.TLL_PASS, PASS2 = 'Prueba-Nueva-2026';
if (!USER || !PASS) { console.error('Define TLL_USER y TLL_PASS con el acceso del panel para correr las pruebas.'); process.exit(1); }
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// imagen de prueba dibujada en el navegador
async function makeImg(page, w, h) {
  const b64 = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1e78aa'); g.addColorStop(1, '#86cde4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.fillRect(w * .3, h * .4, w * .4, h * .2); x.fillStyle = '#f6e13c'; x.beginPath(); x.arc(w * .15, h * .2, h * .12, 0, 7); x.fill();
    return c.toDataURL('image/jpeg', .9).split(',')[1]; }, [w, h]);
  return { name: `foto-${w}x${h}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') };
}
async function login(q, user = USER, pass = PASS) { await q.fill('#lg-u', user); await q.fill('#lg-p', pass); await q.click('#lg-go'); }
const noOverflow = q => q.evaluate(() => { const a = document.querySelector('#adm'); return Math.max(a.scrollWidth, document.documentElement.scrollWidth) - innerWidth; });

(async () => {
  await fetch(BASE + '__reset');
  const b = await chromium.launch();

  console.log('== Acceso oculto y seguridad ==');
  {
    const c = await b.newContext({ locale: 'es-VE', viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const q = await c.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
    await q.goto(BASE); await q.waitForTimeout(400);
    ok(await q.isHidden('#adm'), 'El panel no se ve en la web');
    await q.click('#foot-logo'); await q.waitForTimeout(200); ok(await q.evaluate(() => scrollY > 0 && location.hash === ''), 'Un toque al logo del pie no hace nada (no sube ni cambia de sección)');
    for (let i = 0; i < 4; i++) await q.click('#foot-logo'); ok(await q.isHidden('#adm'), '5 toques todavía no abren nada');
    await q.click('#foot-logo');
    ok(await q.isVisible('#lg'), '6 toques al logo del pie abren el acceso');
    await login(q, USER, 'incorrecta'); await q.waitForFunction(() => document.querySelector('#lg-err').textContent.length > 0);
    ok((await q.textContent('#lg-err')).includes('incorrectos'), 'Contraseña incorrecta rechazada');
    await q.evaluate(() => document.querySelector('#lg-err').textContent = '');
    await login(q, 'otro', PASS); await q.waitForFunction(() => /incorrectos/.test(document.querySelector('#lg-err').textContent));
    ok(true, 'Usuario incorrecto rechazado');
    await login(q, USER.toUpperCase() + ' ', PASS); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
    ok(true, 'Entra con el usuario y la contraseña (el usuario sin importar mayúsculas)');
    ok(await q.isVisible('.ad-sheet.k-help'), 'La primera vez muestra la bienvenida con instrucciones');
    await q.screenshot({ path: OUT + 'panel-bienvenida.png' });
    await q.click('.ad-sheet.k-help [data-close]');
    ok(!(await q.$('.ad-ov')), 'Entendido cierra la ventana');
    const tok = await q.evaluate(() => sessionStorage.getItem('tll:adm-s')); ok(tok && !tok.includes(PASS), 'La sesión guarda un token, nunca la contraseña');
    const r = await q.evaluate(() => fetch('/api/admin?a=books').then(r => r.status)); ok(r === 401, 'Sin token la API de reservas responde 401');
    ok(!errs.length, 'Sin errores de JavaScript ' + errs.join('|'));
    await c.close();
  }

  console.log('== Editar, subir fotos y publicar (escritorio) ==');
  let name;
  {
    const c = await b.newContext({ locale: 'es-VE', viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const q = await c.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
    q.on('dialog', d => d.accept());
    await q.goto(BASE); await q.evaluate(() => localStorage.setItem('tll:adm-welcome', 'true'));
    await q.goto(BASE + '#capitan'); await q.waitForSelector('#lg'); await login(q); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
    if (await q.$('.ad-sheet.k-help')) await q.click('.ad-sheet.k-help [data-close]');
    await q.click('#a-demo'); ok((await q.textContent('.ad-head')).includes('datos de ejemplo'), 'Datos de ejemplo para conocer las gráficas');
    await q.click('[data-p="12m"]'); await q.screenshot({ path: OUT + 'panel-resumen.png' }); await q.click('#a-demo');
    for (const t of ['inicio', 'reservas', 'flota', 'rumbos', 'muelles', 'pagos', 'aliados', 'ajustes']) {
      await q.click(`[data-adtab="${t}"]`); await q.click('.ad-head [data-help]'); const h = await q.textContent('.ad-sheet.k-help h3'); await q.keyboard.press('Escape');
      ok(h && !(await q.$('.ad-ov')), `Pestaña ${t}: la ayuda “${h}” se abre y se cierra`);
    }
    // embarcación
    await q.click('[data-adtab="flota"]'); await q.click('[data-boat-edit="1"]'); await q.waitForSelector('.ad-sheet.k-boat');
    name = await q.inputValue('#i-boats-1-name');
    await q.fill('#i-boats-1-price', '999');
    ok(await q.isVisible('.ad-save'), 'Al editar aparece la barra “Publicar cambios”');
    await q.click('.ad-sheet.k-boat h4 [data-help="fotos"]'); ok((await q.textContent('.ad-sheet.k-help')).includes('1600 × 1000'), 'La ayuda de fotos dice formato, medida y resolución');
    ok(await q.isVisible('.ad-sheet.k-boat'), 'La ayuda se abre encima del editor sin cerrarlo'); await q.click('.ad-sheet.k-help [data-close]');
    ok(await q.isVisible('.ad-sheet.k-boat'), 'Al cerrar la ayuda sigue el editor');
    let fc = q.waitForEvent('filechooser'); await q.click('.ad-sheet.k-boat [data-up$=".photos.drone"]'); await (await fc).setFiles(await makeImg(q, 2000, 1300));
    await q.waitForSelector('.ad-sheet.k-crop canvas'); const cw = await q.evaluate(() => [document.querySelector('#crop-c').width, document.querySelector('#crop-c').height]);
    ok(cw[0] === 1600 && cw[1] === 1000, `Recorta la foto a 1600 × 1000 (${cw.join('×')})`);
    ok(await q.isVisible('#crop-r'), 'Permite mover el encuadre');
    await q.fill('#crop-r', '20'); await q.screenshot({ path: OUT + 'panel-recorte.png' });
    await q.click('#crop-ok'); await q.waitForFunction(() => !document.querySelector('.ad-sheet.k-crop') && document.querySelector('.ad-sheet.k-boat .ad-photo img'), null, { timeout: 8000 });
    const src = await q.getAttribute('.ad-sheet.k-boat .ad-photo img', 'src'); ok(/\/api\/admin\?a=img&id=[a-f0-9]{24}/.test(src), 'Foto subida y puesta en la embarcación');
    const img = await q.evaluate(u => fetch(u).then(async r => [r.status, r.headers.get('content-type'), (await r.arrayBuffer()).byteLength]), src);
    ok(img[0] === 200 && /image\/(webp|jpeg)/.test(img[1]) && img[2] < 650000, `La foto se sirve optimizada (${img[1]}, ${Math.round(img[2] / 1024)} KB)`);
    fc = q.waitForEvent('filechooser'); await q.click('.ad-sheet.k-boat [data-up$=".photos.interior"]'); await (await fc).setFiles(await makeImg(q, 600, 900));
    await q.waitForSelector('.ad-sheet.k-crop'); const warn = await q.textContent('.ad-sheet.k-crop');
    ok(warn.includes('pequeña') && warn.includes('vertical'), 'Avisa si la foto es pequeña o vertical'); await q.click('.ad-sheet.k-crop [data-close]');
    ok(await q.isVisible('.ad-sheet.k-boat'), 'Cancelar el recorte vuelve al editor');
    await q.selectOption('.ad-sheet [data-acc="dron"]', 'opt'); await q.fill('.ad-sheet [data-accp="dron"]', '55');
    await q.screenshot({ path: OUT + 'panel-editor.png' });
    await q.click('.ad-sheet.k-boat .ad-sheet-f [data-close]');
    ok((await q.textContent('.ad-boat[data-i="1"]')).includes('$999'), 'La lista muestra el precio nuevo');
    await q.click('[data-adtab="pagos"]');
    ok((await q.textContent('.ad-preview')).includes('administracion@avanteksolutions.com') && (await q.textContent('.ad-preview')).includes('ID 23928727'), 'Vienen cargadas las cuentas de Eduardo (Avantek principal y Binance)');
    ok((await q.$$('.ad-zelle')).length === 4, 'Las 4 cuentas Zelle están guardadas');
    await q.check('[data-zon="2"]'); ok((await q.textContent('.ad-preview')).includes('rrhh@avanteksolutions.com') && (await q.textContent('.ad-zelle.on')).includes('Principal'), 'Cambiar la Zelle principal');
    await q.screenshot({ path: OUT + "panel-pagos.png" });
    await q.click('[data-adtab="rumbos"]'); await q.click('[data-beach-add="0"]'); await q.keyboard.type('Playa Prueba');
    await q.click('[data-adtab="aliados"]'); fc = q.waitForEvent('filechooser'); await q.click('[data-up="allies.0.items.0.4"]'); await (await fc).setFiles(await makeImg(q, 800, 500));
    await q.waitForSelector('.ad-sheet.k-crop canvas'); const lw = await q.evaluate(() => [document.querySelector('#crop-c').width, document.querySelector('#crop-c').height]);
    ok(lw[0] === 512 && lw[1] === 512, 'El logo se ajusta a 512 × 512 sin recortarlo'); await q.click('#crop-ok'); await q.waitForFunction(() => !document.querySelector('.ad-sheet.k-crop'), null, { timeout: 8000 });
    await q.click('#a-pub'); await q.waitForFunction(() => document.querySelector('.ad-save').hidden, null, { timeout: 8000 });
    ok(true, 'Publicar guarda y oculta la barra');
    // la web de un cliente nuevo
    const c2 = await b.newContext({ locale: 'es-VE', viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 }); const w = await c2.newPage(); const e3 = []; w.on('pageerror', e => e3.push(e.message));
    await w.goto(BASE); await w.waitForFunction(n => { const x = window.TLL.BOATS.find(b => b.name === n); return x && x.price === 999; }, name, { timeout: 8000 });
    const bt = await w.evaluate(n => { const x = window.TLL.BOATS.find(b => b.name === n); return { photo: x.photos && x.photos.drone, dron: x.opt.dron }; }, name);
    ok(bt.photo && bt.dron === 55, `El cliente ve el precio, la foto y el accesorio nuevos de ${name}`);
    ok(await w.evaluate(() => !!document.querySelector('img.ph')), 'La foto real aparece en la web');
    ok(await w.evaluate(() => !!document.querySelector('#allies .av.logo img')), 'El logo del aliado aparece en la web');
    ok(await w.evaluate(() => window.TLL.ROUTES[0].beaches.includes('Playa Prueba')), 'La playa nueva aparece en el rumbo');
    ok(await w.evaluate(() => window.TLL.CAT.pay.zelle === 'rrhh@avanteksolutions.com' && window.TLL.CAT.pay.binance === '23928727'), 'La web muestra solo la Zelle principal elegida');
    await w.reload(); await w.waitForTimeout(300); ok(await w.evaluate(n => window.TLL.BOATS.find(b => b.name === n).price === 999, name), 'Al recargar se aplica de inmediato (copia guardada en el teléfono)');
    await w.screenshot({ path: OUT + 'web-con-cambios.png' });
    const rb = await w.evaluate(() => fetch('/api/admin?a=book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'TLL-4321', iso: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), boat: 'Bravo 32', route: 'Rumbo 1', pax: 6, total: 400, paid: 400, name: 'Ana Prueba', phone: '+58 414 000 0000', lang: 'en', status: 'confirmada' }) }).then(r => r.json()));
    ok(rb.ok && rb.added, 'La app registra una reserva en el servidor');
    ok(!e3.length, 'La web del cliente sin errores ' + e3.join('|'));
    await c2.close();
    // reservas
    await q.reload(); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
    ok((await q.textContent('.ad-tabs [data-adtab="reservas"]')).includes('1'), 'La pestaña Reservas avisa que hay 1 nueva');
    await q.click('[data-adtab="reservas"]'); const card = await q.textContent('.ad-bk[data-code="TLL-4321"]');
    ok(card.includes('Ana Prueba') && card.includes('Nueva') && card.includes('Falta $400'), 'La reserva llega como Nueva y sin pago marcado');
    await q.click('.ad-bk[data-code="TLL-4321"] [data-bka="ok"]'); await q.waitForSelector('.ad-bk[data-code="TLL-4321"] .st.ok');
    await q.click('.ad-bk[data-code="TLL-4321"] [data-bka="half"]'); await q.waitForFunction(() => document.querySelector('.ad-bk[data-code="TLL-4321"]').textContent.includes('Falta $200'));
    ok(true, 'Confirmar y registrar abono del 50%');
    await q.click('[data-bk-new]'); await q.fill('#bf-name', 'Familia Pérez'); await q.fill('#bf-total', '450'); await q.fill('#bf-paid', '450'); await q.click('#bk-f button[type=submit]');
    await q.waitForFunction(() => document.querySelector('.ad-bks') && document.querySelector('.ad-bks').textContent.includes('Familia Pérez'));
    ok(true, 'Registrar a mano una reserva de WhatsApp');
    await q.screenshot({ path: OUT + 'panel-reservas.png' });
    await q.click('[data-adtab="inicio"]'); await q.click('[data-p="12m"]'); ok((await q.textContent('.adm-kpis')).includes('$850'), 'El resumen suma las reservas reales ($850)');
    // versiones
    await q.click('[data-adtab="ajustes"]'); await q.click('#hist-load'); await q.waitForSelector('[data-undo]');
    ok(true, 'Muestra las versiones anteriores'); await q.click('[data-undo="0"]'); await q.waitForTimeout(800);
    const back = await q.evaluate(n => window.TLL.BOATS.find(b => b.name === n).price, name); ok(back !== 999, `Restaurar vuelve a la versión anterior (precio ${back})`);
    // contraseña
    await q.fill('#pw-old', 'mala'); await q.fill('#pw-new', PASS2); await q.fill('#pw-new2', PASS2); await q.click('#pw-form button'); await q.waitForFunction(() => document.querySelector('#pw-err').textContent);
    ok((await q.textContent('#pw-err')).includes('no es correcta'), 'Pide la contraseña actual para cambiarla');
    await q.fill('#pw-old', PASS); await q.click('#pw-form button'); await q.waitForTimeout(1500);
    await q.click('#a-out'); await q.waitForFunction(() => document.querySelector('#adm').hidden, null, { timeout: 5000 }).catch(() => {}); ok(await q.isHidden('#adm'), 'Salir cierra el panel');
    await q.goto(BASE + '#capitan'); await q.waitForSelector('#lg'); await login(q); await q.waitForFunction(() => document.querySelector('#lg-err').textContent);
    ok(true, 'La contraseña vieja ya no sirve');
    await login(q, USER, PASS2); await q.waitForSelector('.ad-tabs', { timeout: 8000 }); ok(true, 'Entra con la contraseña nueva');
    ok(!errs.length, 'Panel sin errores de JavaScript ' + errs.join('|'));
    await c.close();
  }

  console.log('== Teléfono ==');
  for (const [n, d] of [['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']]]) {
    const c = await b.newContext({ locale: 'es-VE', ...d, reducedMotion: 'reduce' }); const q = await c.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
    await q.goto(BASE + '#capitan'); await q.waitForSelector('#lg'); await login(q, USER, PASS2); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
    if (n === 'Pixel 7') await q.screenshot({ path: OUT + 'panel-movil-bienvenida.png' });
    if (await q.$('.ad-sheet.k-help')) await q.click('.ad-sheet.k-help [data-close]');
    for (const t of ['inicio', 'reservas', 'flota', 'rumbos', 'muelles', 'pagos', 'aliados', 'ajustes']) {
      await q.click(`[data-adtab="${t}"]`); await q.waitForTimeout(80); const o = await noOverflow(q);
      ok(o <= 0, `${n} · ${t}: sin desborde horizontal (${o}px)`);
      if (n === 'Pixel 7') await q.screenshot({ path: OUT + `panel-movil-${t}.png` });
    }
    await q.click('[data-adtab="flota"]'); await q.click('[data-boat-edit="0"]'); await q.waitForSelector('.ad-sheet.k-boat');
    const sh = await q.evaluate(() => { const s = document.querySelector('.ad-sheet.k-boat').getBoundingClientRect(); return [Math.round(s.left), Math.round(s.right), innerWidth]; });
    ok(sh[0] >= 0 && sh[1] <= sh[2], `${n}: el editor cabe en la pantalla (${sh.join(',')})`);
    if (n === 'Pixel 7') await q.screenshot({ path: OUT + 'panel-movil-editor.png' });
    ok(!errs.length, n + ': sin errores ' + errs.join('|'));
    await c.close();
  }

  console.log('== Bloqueo por intentos ==');
  {
    const c = await b.newContext({ locale: 'es-VE', viewport: { width: 1000, height: 800 } }); const q = await c.newPage();
    await q.goto(BASE + '#capitan'); await q.waitForSelector('#lg');
    for (let i = 0; i < 8; i++) { await login(q, USER, 'mala' + i); await q.waitForFunction(() => !document.querySelector('#lg-go').disabled); }
    await login(q, USER, PASS2); await q.waitForFunction(() => !document.querySelector('#lg-go').disabled);
    ok((await q.textContent('#lg-err')).includes('15 minutos'), 'Tras 8 intentos fallidos bloquea 15 minutos, aunque luego pongan la clave correcta');
    await c.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
