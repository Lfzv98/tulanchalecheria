const { chromium, devices } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/3fa885c8-0f9b-52c7-9e02-20ad3b09982d/scratchpad/';
const URL = 'http://127.0.0.1:8765/index.html';
const PASS = process.env.TLL_PASS; if (!PASS) { console.error('Define TLL_PASS con la contraseña del panel para correr las pruebas.'); process.exit(1); }
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const DEV = [
    ['iPhone 15 Pro', devices['iPhone 15 Pro']], ['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['Galaxy S9+', devices['Galaxy S9+']],
    ['iPad Pro 11', devices['iPad Pro 11']], ['iPad Mini apaisado', devices['iPad Mini landscape']], ['Galaxy Tab S4', devices['Galaxy Tab S4']],
    ['Laptop 1366', { viewport: { width: 1366, height: 768 } }], ['Escritorio 1920', { viewport: { width: 1920, height: 1080 } }]
  ];
  console.log('== Carga en dispositivos ==');
  for (const [n, d] of DEV) {
    const ctx = await b.newContext({ ...d, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(700);
    const sw = await p.evaluate(w => Math.max(document.documentElement.scrollWidth, innerWidth) - w, (d.viewport||{}).width);
    const wide = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !(e instanceof SVGElement && e.ownerSVGElement) && !e.closest('.tbl-wrap,.days,.links,.minibar,.tabbar,dialog,.adm,.layers,.hero'); }).slice(0, 3).map(e => e.tagName + '.' + e.className));
    const tab = await p.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display);
    ok(!errs.length && sw <= 0 && !wide.length, `${n}: sin errores (${errs.join('|') || '0'}), sin desborde horizontal (${sw}px ${wide.join(',')}), barra inferior ${tab}`);
    await p.screenshot({ path: OUT + 'dev-' + n.replace(/\W+/g, '_') + '.png' });
    await ctx.close();
  }

  console.log('== Video y parallax con movimiento normal ==');
  for (const [n, d] of [['iPhone', devices['iPhone 13']], ['Escritorio', { viewport: { width: 1920, height: 1080 } }]]) {
    const cm = await b.newContext({ ...d, deviceScaleFactor: 1 }); const m = await cm.newPage();
    await m.goto(URL); await m.waitForTimeout(800);
    const src = await m.evaluate(() => document.querySelector('#hero-video').currentSrc.split('/').pop());
    const a0 = await m.evaluate(() => document.querySelector('#hero-video').currentTime); await m.waitForTimeout(1500); const a1 = await m.evaluate(() => document.querySelector('#hero-video').currentTime);
    ok(a1 > a0, `${n}: video reproduciéndose (${src}, ${a0.toFixed(2)}s → ${a1.toFixed(2)}s)`);
    await m.evaluate(() => scrollTo(0, 400)); await m.waitForTimeout(400);
    const tr = await m.evaluate(() => ['.hero-media', '.hero-copy'].map(x => document.querySelector(x).style.transform));
    ok(tr.every(t => /translate3d\(0px, -?[1-9]/.test(t)) && tr[0] !== tr[1], `${n}: parallax con capas a distinta velocidad (${tr.join(' / ')})`);
    await cm.close();
  }

  console.log('== Flujo cliente en móvil (iPhone) ==');
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const popups = [];
  await ctx.route(/wa\.me|instagram|youtube|open-meteo/, r => r.fulfill({ status: 200, body: 'ok' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('popup', async pg => { popups.push(pg.url()); await pg.close().catch(() => {}); });
  await p.goto(URL); await p.waitForTimeout(500);
  const tap = async sel => { const h = typeof sel === 'string' ? await p.waitForSelector(sel) : sel; await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); await h.tap(); };
  const go = async v => { await p.evaluate(v => { location.hash = v; }, v); await p.waitForTimeout(450); };
  // inicio: video, parallax, menú
  ok(await p.evaluate(() => { const v = document.querySelector('#hero-video'); return v.autoplay && v.muted && v.loop && v.hasAttribute('playsinline') && !!v.poster; }), 'Video del hero: autoplay, silencio, bucle, playsinline y póster');
  ok(await p.evaluate(() => document.querySelector('#hero-video').paused), 'Movimiento reducido: el video queda en pausa (se ve el póster)');
  await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(300);
  ok(!/translate3d\(0px, [1-9]/.test(await p.evaluate(() => document.querySelector('.hero-media').style.transform)), 'Movimiento reducido: parallax desactivado');
  await p.evaluate(() => scrollTo(0, 0));
  await tap('#menu-open-2'); ok(await p.isVisible('#sheet'), 'Menú "Más" se abre'); await tap('#sheet a[href="#playas"]'); await p.waitForTimeout(400); ok(await p.isVisible('#beaches') && await p.isHidden('#sheet'), 'Menú lleva a Playas y se cierra');
  await go('flota');
  // filtros
  await tap('.pill[data-type="Yate"]'); ok((await p.textContent('#f-count')).startsWith('2 de'), 'Filtro Yates muestra 2');
  await tap('.pill[data-type="all"]'); await p.selectOption('#f-pax', '20'); ok((await p.$$('#boats .boat')).length === 2, 'Filtro 20+ personas');
  await p.selectOption('#f-pax', '0');
  // fotos tabs
  await tap('#boats .boat:first-child [data-v="interior"]'); ok(await p.getAttribute('#boats .boat:first-child [data-v="interior"]', 'aria-pressed') === 'true', 'Cambiar foto a Interior');
  // modal
  await tap('[data-open="b2"]'); await p.waitForSelector('#dlg[open]');
  const free = await p.$('#m-cal .cal-g button:not([disabled]):not(.busy)'); await tap(free);
  ok(await p.isVisible('#m-book'), 'Detalle: botón "Reservar esta embarcación" dentro de la app');
  const dlgScroll = await p.evaluate(() => { const d = document.querySelector('#dlg'); return d.scrollHeight > d.clientHeight ? getComputedStyle(d).overflowY : 'fits'; }); ok(dlgScroll === 'auto' || dlgScroll === 'fits', 'Detalle se puede desplazar en móvil (' + dlgScroll + ')');
  await tap('#m-build'); await p.waitForTimeout(500); ok(await p.getAttribute('[data-boat="b2"]', 'aria-pressed') === 'true', 'Pasar del detalle al cotizador con la embarcación elegida');
  ok(await p.isVisible('[data-step="2"]'), 'Llega directo al paso Destino y fecha');
  await tap('#st-back'); await tap('#st-back'); ok(await p.isVisible('[data-step="0"]'), 'Botón Atrás vuelve al paso 1');
  await tap('#st-next'); ok(await p.isVisible('[data-step="1"]'), 'Botón Siguiente avanza al paso 2');
  await tap('#stepper [data-go="3"]');
  // cotizador
  await tap('[data-extra="e1"]'); const t1 = await p.textContent('#ticket .total'); ok(/Total\$[\d.]+/.test(t1.replace(/\s/g, '')), 'Extra suma al total: ' + t1.trim());
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#minibar').classList.contains('show')), 'Barra de total fija visible en el móvil mientras armas el día');
  const refc = await p.evaluate(() => TLL.refCode('Ana'));
  await p.fill('#q-code', refc.toLowerCase()); await tap('#code-form button'); await p.waitForTimeout(200);
  ok(await p.isVisible('#ticket .code-ok'), 'Código de referido válido aplica 5% (' + refc + ')');
  await p.fill('#q-code', 'TLLG-B4XK'); await tap('#code-form button'); await p.waitForTimeout(200);
  ok((await p.textContent('#ticket')).includes('Tarjeta de regalo'), 'Código de tarjeta de regalo se descuenta');
  await p.fill('#q-code', 'XXXX'); await tap('#code-form button'); await p.waitForTimeout(200);
  ok(await p.isVisible('#ticket .code-bad'), 'Código inválido muestra mensaje claro');
  await tap('#cur-ves'); ok((await p.textContent('#ticket .total')).includes('Bs'), 'Cambio a bolívares');
  await tap('#cur-usd');
  // reserva dentro de la app
  await tap('#t-book'); await p.waitForSelector('#bk-form');
  ok(await p.isVisible('#bk-form'), 'Reservar ahora abre la confirmación dentro de la app');
  await tap('#bk-go'); ok(await p.isVisible('#bk-form'), 'Sin nombre no deja confirmar');
  await p.fill('#bk-name', 'Familia Pérez'); await p.fill('#bk-phone', '0414 555 1234'); await tap('#bk-go'); await p.waitForSelector('#bk-code');
  const bcode = (await p.textContent('#bk-code')).trim(); ok(/^TLL-\d{4}$/.test(bcode), 'Reserva registrada con código ' + bcode);
  await tap('#bk-send'); await p.waitForTimeout(500);
  ok(popups.some(u => decodeURIComponent(u).includes(bcode) && decodeURIComponent(u).includes('Familia Pérez')), 'Un toque avisa a Tu Lancha por WhatsApp con el código y los datos');
  await tap('#bk-trip'); await p.waitForTimeout(600);
  ok(await p.isVisible('#my-trips') && (await p.textContent('#my-trips')).includes(bcode) && (await p.textContent('#my-trips')).includes('Enviada'), 'Mi viaje muestra la reserva y su estado');
  ok(await p.inputValue('#code-live') === bcode, 'Mi viaje usa el código de la reserva');
  await go('flota'); await tap('[data-book="b3"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#reservar' && await p.getAttribute('[data-boat="b3"]', 'aria-pressed') === 'true', 'Botón Reservar de la flota lleva al asistente con esa embarcación');
  await go('reservar');
  await go('playas');
  // playas → cotizador
  await tap('[data-goroute="r6"]'); await p.waitForTimeout(300); ok(await p.getAttribute('[data-route="r6"]', 'aria-pressed') === 'true', 'Playa → "Ir aquí" la elige en el cotizador');
  await go('regalos');
  // regalos
  await tap('#g-occ .pill:first-child'); await p.fill('#g-to', 'Carla'); await p.waitForTimeout(100);
  ok((await p.textContent('#g-card')).includes('Carla') && (await p.textContent('#g-card')).includes('Cumpleaños'), 'Vista previa de la tarjeta de regalo se actualiza');
  await p.selectOption('#g-exp', 'M'); ok(await p.isVisible('#g-amt'), 'Monto libre muestra campo de monto');
  const gcode = await p.evaluate(() => document.querySelector('#g-card').textContent.match(/TLLG-[A-Z0-9-]+/)[0]);
  ok(await p.evaluate(c => !!TLL.codeInfo(c).kind, gcode), 'El código de la tarjeta (' + gcode + ') es canjeable en el cotizador');
  await tap('#gift-form button[type=submit]'); await p.waitForTimeout(400); ok(popups.some(u => u.includes('wa.me') && decodeURIComponent(u).includes('tarjeta de regalo')), 'Comprar tarjeta abre WhatsApp con el pedido');
  // referidos
  await p.fill('#ref-name', 'José'); await tap('#ref-form button'); ok(/^JOSE-[A-Z0-9]{3}$/.test(await p.textContent('#ref-code')), 'Crear código de referido: ' + await p.textContent('#ref-code'));
  ok((await p.getAttribute('#ref-share', 'href')).startsWith('https://wa.me/?text='), 'Compartir código abre WhatsApp para elegir contacto');
  await go('mi-viaje');
  // mi viaje: en vivo
  await p.fill('#code-live', 'abc'); await tap('form[data-go="viaje"] button'); ok(!(await p.isVisible('#dlg[open]')), 'Código de viaje inválido no abre');
  await p.fill('#code-live', 'tll-1105'); await tap('form[data-go="viaje"] button'); await p.waitForSelector('#dlg[open] #lv-map');
  const pos1 = await p.getAttribute('#boat', 'transform'); await p.waitForTimeout(1200); const pos2 = await p.getAttribute('#boat', 'transform');
  ok(pos1 && pos2 && pos1 !== pos2, 'Ubicación en vivo: la lancha se mueve en el mapa');
  const sos = await p.$('#lv-sos'); const bx = await sos.boundingBox();
  await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  ok(!(await p.isVisible('#sos-panel')), 'Emergencia: un toque corto no dispara la alerta');
  await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(1700); await p.mouse.up();
  ok(await p.isVisible('#sos-panel') && (await p.getAttribute('#sos-wa', 'href')).includes('EMERGENCIA'), 'Emergencia: mantener presionado muestra alerta con posición');
  await p.screenshot({ path: OUT + 'f-live.png' });
  await tap('#dlg .m-close');
  // álbum
  await tap('form[data-go="album"] button'); await p.waitForSelector('#dlg[open] .album');
  ok((await p.$$('.album button')).length === 12, 'Álbum muestra 12 fotos y videos');
  await tap('.album button:nth-child(2)'); ok(await p.isVisible('.lightbox'), 'Foto se abre en grande'); await tap('.lightbox'); ok(!(await p.isVisible('.lightbox')), 'Cerrar foto');
  await p.screenshot({ path: OUT + 'f-album.png' });
  await tap('#dlg .m-close');
  await go('propietarios');
  // pool
  await p.fill('#p-name', 'Pedro'); await p.fill('#p-phone', '04141234567'); await p.fill('#p-boat', 'Fountain 38');
  await tap('#pool-form button[type=submit]'); await p.waitForTimeout(300); ok(popups.some(u => decodeURIComponent(u).includes('Fountain 38')), 'Postulación al pool abre WhatsApp');
  // portal propietario
  const k0 = await p.textContent('#k-res'); const day = await p.$('#o-cal .cal-g button:not(.past)'); await tap(day); const k1 = await p.textContent('#k-res');
  ok(k0 !== k1, `Portal propietario: marcar día cambia reservas (${k0}→${k1})`);
  await go('nosotros'); ok(await p.getAttribute('a[href^="tel:"]', 'href') === 'tel:+584143083864', 'Teléfono con enlace para llamar'); ok((await p.getAttribute('.visit a[href*="google.com/maps/dir"]', 'href')).includes('destination='), 'Ubicación abre indicaciones de Google Maps');
  ok(!errs.length, 'Sin errores de JavaScript en el flujo del cliente ' + errs.join('|'));
  await p.goto(URL + '#viaje'); await p.waitForTimeout(400); ok(await p.isVisible('#dlg[open] #lv-map'), 'Enlace directo #viaje abre la ubicación en vivo');
  await ctx.close();

  console.log('== Panel de Eduardo ==');
  for (const [n, d] of [['Laptop', { viewport: { width: 1366, height: 800 } }], ['Android', devices['Pixel 7']]]) {
    const c2 = await b.newContext({ ...d, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
    await q.goto(URL); await q.waitForTimeout(300);
    ok(await q.isHidden('#adm'), n + ': panel oculto por defecto');
    for (let i = 0; i < 5; i++) await q.click('#foot-logo');
    ok(await q.isVisible('#lg'), n + ': 5 toques al logo del pie abren el acceso');
    await q.fill('#lg-u', 'eduardo'); await q.fill('#lg-p', 'incorrecta'); await q.click('#lg-go'); await q.waitForTimeout(1500);
    ok((await q.textContent('#lg-err')).includes('incorrectos'), n + ': contraseña incorrecta rechazada');
    await q.fill('#lg-u', 'Eduardo'); await q.fill('#lg-p', PASS); await q.click('#lg-go'); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
    ok(true, n + ': entra con usuario y contraseña');
    const stored = await q.evaluate(() => localStorage.getItem('tll:ledger'));
    ok(stored && !stored.includes('Arapo') && stored.includes('"ct"'), n + ': datos guardados cifrados (no se leen sin contraseña)');
    await q.click('[data-p="12m"]'); ok((await q.textContent('.akpi b')).startsWith('$'), n + ': cambiar período a 12 meses');
    await q.screenshot({ path: OUT + 'adm-' + n + '.png', fullPage: false });
    await q.hover('#mchart g:nth-of-type(12) .hit').catch(() => {});
    if (n === 'Laptop') {
      await q.click('#a-clear'); await q.click('#a-clear'); await q.waitForTimeout(300);
      ok((await q.textContent('.adm-kpis')).includes('$0'), 'Borrar ejemplos deja el panel vacío');
      await q.click('#a-new'); await q.fill('#f-client', 'Familia Pérez'); await q.fill('#f-total', '450'); await q.fill('#f-paid', '200'); await q.click('#a-form button[type=submit]'); await q.waitForTimeout(400);
      ok((await q.textContent('.adm-main')).includes('Familia Pérez') && (await q.textContent('.adm-kpis')).includes('$450'), 'Registrar chárter actualiza ingresos y tabla');
      await q.click('[data-act="pay"]'); await q.waitForTimeout(300); ok((await q.textContent('.tbl:not([style]) tbody')).includes('Pagado'), 'Marcar pagado');
      await q.fill('#pw-old', PASS); await q.fill('#pw-new', 'NuevaClave-2026'); await q.fill('#pw-new2', 'NuevaClave-2026'); await q.click('#pw-form button'); await q.waitForTimeout(1500);
      await q.click('#a-out'); ok(await q.isHidden('#adm'), 'Salir cierra el panel');
      await q.goto(URL + '#capitan'); await q.waitForSelector('#lg');
      await q.fill('#lg-u', 'eduardo'); await q.fill('#lg-p', 'NuevaClave-2026'); await q.click('#lg-go'); await q.waitForSelector('.adm-kpis', { timeout: 8000 });
      ok((await q.textContent('.adm-main')).includes('Familia Pérez'), 'Con la contraseña nueva entra y conserva sus datos');
    }
    ok(!e2.length, n + ': sin errores de JavaScript ' + e2.join('|'));
    const sw = await q.evaluate(w => Math.max(innerWidth, document.querySelector('#adm').scrollWidth) - w, (d.viewport||{}).width); ok(sw <= 0, n + ': panel sin desborde horizontal (' + sw + 'px)');
    await c2.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
})();
