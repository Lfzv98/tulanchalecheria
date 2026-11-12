const { chromium, devices } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/3fa885c8-0f9b-52c7-9e02-20ad3b09982d/scratchpad/';
const URL = 'http://127.0.0.1:8765/index.html';
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
    const ctx = await b.newContext({ locale: 'es-VE', ...d, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(700);
    const sw = await p.evaluate(w => Math.max(document.documentElement.scrollWidth, innerWidth) - w, (d.viewport||{}).width);
    const wide = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !(e instanceof SVGElement && e.ownerSVGElement) && !e.closest('.tbl-wrap,.days,.links,.minibar,.tabbar,dialog,.adm,.layers,.hero,.orb-stage,.orb-tabs,.ribbon-track'); }).slice(0, 3).map(e => e.tagName + '.' + e.className));
    const tab = await p.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display);
    ok(!errs.length && sw <= 0 && !wide.length, `${n}: sin errores (${errs.join('|') || '0'}), sin desborde horizontal (${sw}px ${wide.join(',')}), barra inferior ${tab}`);
    await p.screenshot({ path: OUT + 'dev-' + n.replace(/\W+/g, '_') + '.png' });
    await ctx.close();
  }

  console.log('== Carrusel del hero y parallax con movimiento normal ==');
  for (const [n, d] of [['iPhone', devices['iPhone 13']], ['Escritorio', { viewport: { width: 1920, height: 1080 } }]]) {
    const cm = await b.newContext({ locale: 'es-VE', ...d, deviceScaleFactor: 1 }); const m = await cm.newPage();
    await m.goto(URL); await m.waitForTimeout(800);
    const src = await m.evaluate(() => document.querySelector('#hero-reel .slide.on img').currentSrc.split('/').pop());
    const hi = await m.evaluate(() => { const i = document.querySelector('#hero-reel .slide.on img'); return i.naturalWidth; });
    ok(src.startsWith('hero2') && hi > 500, `${n}: primer cuadro del video cargado con su recorte (${src}, ${hi}px)`);
    await m.waitForTimeout(1500);
    const vid = await m.evaluate(() => { const v = document.querySelector('#hero-vid'); return { has: !!v, auto: v && v.autoplay, loop: v && v.loop, muted: v && v.muted, inline: v && v.playsInline, playing: v && !v.paused && v.currentTime > 0 }; });
    ok(vid.has && vid.auto && vid.loop && vid.muted && vid.inline && vid.playing, `${n}: el video del dron rueda en bucle en el hero`);
    await m.evaluate(() => scrollTo(0, 400)); await m.waitForTimeout(400);
    const tr = await m.evaluate(() => ['.hero-media', '.hero-copy'].map(x => document.querySelector(x).style.transform));
    ok(tr.every(t => /translate3d\(0px, -?[1-9]/.test(t)) && tr[0] !== tr[1], `${n}: parallax con capas a distinta velocidad (${tr.join(' / ')})`);
    await cm.close();
  }

  console.log('== Flujo cliente en móvil (iPhone) ==');
  const ctx = await b.newContext({ locale: 'es-VE', ...devices['iPhone 13'], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const popups = [];
  await ctx.route(/wa\.me|instagram|youtube|open-meteo/, r => r.fulfill({ status: 200, body: 'ok' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('popup', async pg => { popups.push(pg.url()); await pg.close().catch(() => {}); });
  await p.goto(URL); await p.waitForTimeout(500);
  const tap = async sel => { const h = typeof sel === 'string' ? await p.waitForSelector(sel) : sel; await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); await h.tap(); };
  const go = async v => { await p.evaluate(v => { location.hash = v; }, v); await p.waitForTimeout(450); };
  // inicio: video, parallax, menú
  ok(await p.evaluate(() => document.querySelectorAll('#hero-reel .slide.on').length === 1 && document.querySelector('#hero-reel img').getAttribute('src').includes('hero2')), 'Portada con la foto real de Mochima');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('#hero-reel img')).animationName === 'none'), 'Movimiento reducido: la foto queda quieta');
  await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(300);
  ok(!/translate3d\(0px, [1-9]/.test(await p.evaluate(() => document.querySelector('.hero-media').style.transform)), 'Movimiento reducido: parallax desactivado');
  await p.evaluate(() => scrollTo(0, 0));
  await tap('#menu-open-2'); ok(await p.isVisible('#sheet'), 'Menú "Más" se abre'); await tap('#sheet a[href="#playas"]'); await p.waitForTimeout(400); ok(await p.isVisible('#beaches') && await p.isHidden('#sheet'), 'Menú lleva a Playas y se cierra');
  // portada: nombres nuevos, sin Bs ni Propietarios ni Linktree
  ok(await p.$('#cur-ves') === null, 'Sin selector de bolívares');
  ok((await p.textContent('.press-strip')).includes('Viajando con BIVI') && (await p.textContent('.press-strip')).includes('Canal Viajero'), 'Prensa: Viajando con BIVI y Canal Viajero');
  ok(await p.$('#sheet .side-nav a[href="#propietarios"]') !== null && await p.$('#sheet .side-nav a[href="#aliados"]') !== null, 'Menú lateral con todas las secciones (Servicio a bordo y Propietarios incluidos)');
  ok(await p.evaluate(() => !document.querySelector('.mainnav') && document.querySelectorAll('.orbit-band .orb-card').length === 19), 'Portada sin menú de texto en el header: las secciones van en el menú giratorio');
  ok(await p.evaluate(() => ['.steps3', '.tiles', '#layers', '.cta-band'].every(s => !document.querySelector('[data-view="inicio"] ' + s))), 'Portada compacta: header, hero, lancha de la casa, menú giratorio y footer');
  ok((await p.textContent('#own-feature')).includes('+500 viajes exitosos'), 'Portada destaca la lancha de la casa con +500 viajes exitosos');
  await go('flota'); ok(await p.evaluate(() => location.hash) === '#flota' && await p.isVisible('#boats'), 'Enlace viejo #flota abre Embarcaciones');
  ok(await p.getAttribute('#boats .boat:first-of-type', 'data-id') === 'b0' && (await p.textContent('#boats .boat:first-of-type')).includes('Recomendación de la casa'), 'La lancha de la casa va primero con su insignia');
  ok((await p.textContent('#boats')).includes('Otras opciones disponibles'), 'El resto aparece como "Otras opciones disponibles"');
  ok(!(await p.textContent('#boats')).includes('/ día'), 'El catálogo no muestra precios (solo al reservar)');
  // filtros
  await tap('.pill[data-type="Yate"]'); ok((await p.textContent('#f-count')).startsWith('2 de'), 'Filtro Yates muestra 2');
  await tap('.pill[data-type="Barco"]'); ok((await p.textContent('#f-count')).startsWith('2 de'), 'Filtro Barcos muestra 2');
  await tap('.pill[data-type="Mini yate"]'); ok((await p.textContent('#f-count')).startsWith('1 de'), 'Filtro Mini yates muestra 1');
  await tap('.pill[data-type="all"]'); await p.selectOption('#f-pax', '20'); ok((await p.$$('#boats .boat')).length === 1, 'Filtro grupos grandes: solo el barco de eventos de 30');
  await p.selectOption('#f-pax', '0');
  // fotos: un espacio sin foto no aparece; con fotos, galería con flechas y puntos solo de las que hay
  ok(await p.evaluate(() => { const c = document.querySelector('#boats .boat.nopic'); return !!c && !c.querySelector('img.ph,[data-gal]'); }), 'Embarcación sin fotos: no muestra espacios de imagen vacíos');
  ok(await p.evaluate(() => { const h = TLL.gallery({ id: 'x', name: 'X', type: 'Yate', photos: { proa: 'a.jpg', social: 'b.jpg' } }, {}); const d = document.createElement('div'); d.innerHTML = h; return d.querySelectorAll('img').length === 2 && !/Habitación|Baño|Popa/.test(d.textContent); }), 'Con 2 fotos de 7 espacios, la galería muestra solo 2');
  ok(!(await p.textContent('#boats')).includes('★') && (await p.textContent('#boats')).includes('viajes'), 'Catálogo sin calificación, con "+N viajes"');
  // detalle
  await tap('[data-open="b2"]'); await p.waitForSelector('#dlg[open]');
  ok((await p.textContent('#dlg')).includes('Equipamiento básico incluido') && (await p.textContent('#dlg')).includes('Agua mineral'), 'Detalle muestra el equipamiento básico incluido');
  ok((await p.textContent('#dlg')).includes('Parrillera'), 'Detalle muestra los extras de la embarcación');
  const free = await p.$('#m-cal .cal-g button:not([disabled]):not(.busy)'); await tap(free);
  const dlgScroll = await p.evaluate(() => { const d = document.querySelector('#dlg'); return d.scrollHeight > d.clientHeight ? getComputedStyle(d).overflowY : 'fits'; }); ok(dlgScroll === 'auto' || dlgScroll === 'fits', 'Detalle se puede desplazar en móvil (' + dlgScroll + ')');
  await tap('#m-book'); await p.waitForTimeout(500); ok(await p.getAttribute('[data-boat="b2"]', 'aria-pressed') === 'true', 'Del detalle al asistente con la embarcación elegida');
  ok(await p.isVisible('[data-step="2"]'), 'Llega directo al paso Rumbo y muelle');
  // rumbos y playas (Arapo 40 es barco: hasta 2 playas, no hace Rumbo 4)
  ok((await p.textContent('#b-beaches')).includes('Puedes elegir hasta 2'), 'Barco: "Puedes elegir hasta 2 playas"');
  ok(await p.isDisabled('[data-route="r4"]'), 'Rumbo 4 bloqueado en embarcaciones que no lo hacen');
  await tap('[data-route="r1"]'); await tap('[data-beach="Puinare"]'); await tap('[data-beach="Chimana Segunda"]'); await p.waitForTimeout(200);
  ok((await p.$$('#b-beaches .bchip[aria-pressed="true"]')).length === 2, 'No deja pasar del límite de playas');
  await tap('[data-route="r3"]'); ok((await p.textContent('#b-beaches')).includes('Puedes sumar playas del Rumbo 2') && !(await p.textContent('#b-beaches')).includes('Puinare'), 'Rumbo 3 suma playas del Rumbo 2 y no cruza con el Rumbo 1');
  ok((await p.textContent('#ticket')).includes('por confirmar') && !(await p.textContent('#ticket')).toLowerCase().includes('recargo'), 'Tarifa del Rumbo 3 se marca por confirmar (sin la palabra recargo)');
  ok((await p.textContent('#b-routes')).includes('millas náuticas'), 'Rumbos con millas náuticas aproximadas');
  // muelles
  ok(await p.evaluate(() => [...document.querySelectorAll('#b-dock option')].find(o => o.value === 'pmr').disabled), 'Barco no puede recoger en Cayo de Agua (solo lanchas)');
  ok(await p.evaluate(() => [...document.querySelectorAll('#b-dock option')].find(o => o.value === 'ppa').disabled) && (await p.textContent('#b-dock')).includes('muelle deshabilitado') && (await p.textContent('#b-dock')).includes('Resto del Complejo Turístico El Morro'), 'Punta Palma deshabilitado y Resto del Complejo El Morro disponible');
  ok(await p.evaluate(() => [...document.querySelectorAll('#b-dock optgroup')].some(g => g.label === 'Muelles sugeridos (servicio por uso de muelle)') && !/toque/i.test(document.querySelector('#b-dock').textContent + document.querySelector('#b-dockinfo').textContent)), 'Muelles sugeridos (servicio por uso de muelle), sin la palabra toque');
  await p.selectOption('#b-dock', 'em'); await p.waitForTimeout(200);
  ok((await p.textContent('#b-dockinfo')).includes('5:30 pm') && (await p.textContent('#ticket')).includes('Recogida en Cerro El Morro'), 'El Morro: costo según tamaño y regreso máximo 5:30 pm');
  ok((await p.textContent('#ticket')).includes('$50'), 'Recogida en El Morro para un barco: $50');
  await p.selectOption('#b-dock', 'pm'); await p.waitForTimeout(200);
  ok((await p.textContent('#b-dockinfo')).includes('$30') && (await p.textContent('#b-dockinfo')).includes('video'), 'Plaza Mayor: servicio de muelle $30 y aviso de ubicación y video');
  ok((await p.textContent('#ticket')).includes('se paga en sitio'), 'Ticket: el servicio de muelle aparte, se paga en sitio');
  ok((await p.textContent('#b-hours')).includes('10:00 am a 6:00 pm') && await p.$('#hx-p') === null, 'Horario 10 a 6 y sin hora extra si la embarcación no la permite');
  await tap('#st-back'); await tap('#st-back'); ok(await p.isVisible('[data-step="0"]'), 'Botón Atrás vuelve al paso 1');
  // niños de 7 años o menos y grupos de más de 12
  const keep = await p.evaluate(() => ({ pax: TLL.Q.pax, kids: TLL.Q.kids, boat: TLL.Q.boat }));
  await p.evaluate(() => { TLL.Q.pax = 4; TLL.Q.kids = 0; TLL.Q.boat = 'b0'; TLL.renderBuilder(); });
  ok(await p.isVisible('#kids') && (await p.textContent('#kids')).trim() === '0', 'Paso 1: contador de niños de 7 años o menos');
  await tap('#kid-p'); await tap('#kid-p');
  ok(await p.evaluate(() => TLL.Q.boat === 'b0'), '4 adultos + 2 niños caben en la lancha de la casa (5 puestos + 3 niños)');
  ok((await p.textContent('#ticket')).includes('4 adultos + 2 niños'), 'El ticket muestra adultos y niños');
  ok(await p.evaluate(() => TLL_LAST.paxTxt.includes('2 niños') && TLL_LAST.pax === 6), 'El mensaje de WhatsApp incluye adultos y niños');
  await p.evaluate(() => { TLL.Q.pax = 5; TLL.Q.kids = 4; TLL.renderBuilder(); });
  ok(await p.evaluate(() => TLL.Q.boat !== 'b0'), '5 adultos + 4 niños ya no caben en la lancha de la casa (los niños cuentan en el filtro)');
  ok(await p.isVisible('.s1-tip-p') && await p.isVisible('.s1-tip-d') && (await p.textContent('.s1-tips')).includes('hasta 7 kg'), 'Paso 1: avisos de contextura y mascotas con ícono');
  await p.evaluate(() => { TLL.Q.pax = 12; TLL.Q.kids = 0; TLL.renderBuilder(); }); ok(!(await p.textContent('#big-group')).trim(), '12 adultos: sin aviso de grupo grande');
  await tap('#pax-p'); const big = await p.textContent('#big-group');
  ok(big.includes('Nuestros yates tienen una capacidad máxima de 12 personas y lanchas para 10p') && big.includes('quedo atento a la opción que les gustaría'), 'Más de 12 adultos: aparece el mensaje de Eduardo');
  await tap('#bg-event'); ok(await p.evaluate(() => TLL.Q.boat === 'b8') && await p.isVisible('[data-step="1"]'), 'Botón barco de eventos lleva al paso 2 con el barco de 30');
  await p.evaluate(k => { Object.assign(TLL.Q, k); TLL.renderBuilder(); TLL.goStep(0); }, keep);
  await tap('#st-next'); ok(await p.isVisible('[data-step="1"]'), 'Botón Siguiente avanza al paso 2');
  ok(await p.$('#b-boats .own-row [data-boat="b0"]') !== null || (await p.textContent('#b-boats')).includes('Lancha de la casa'), 'Paso 2: la lancha de la casa primero o aviso si no está libre');
  await tap('[data-boat="b0"]').catch(() => {}); await p.waitForTimeout(300);
  await tap('#stepper [data-go="2"]'); await tap('[data-route="r1"]');
  ok((await p.textContent('#b-beaches')).includes('Puedes elegir hasta 3'), 'Lancha: hasta 3 playas');
  await tap('#hx-p'); ok((await p.textContent('#ticket')).includes('h extra'), 'Hora extra solo en embarcaciones que la permiten y suma al total');
  await tap('#stepper [data-go="3"]');
  // extras
  ok((await p.textContent('#b-extras')).includes('El Mercadillo') && (await p.textContent('#b-extras')).includes('Hielo y agua'), 'Paso de extras: hielo y agua incluidos y El Mercadillo');
  ok((await p.textContent('#b-extras')).includes('Caretas de buceo (4)') && (await p.textContent('#b-extras')).includes('carbón'), 'Extras: caretas con cantidad y nota de la parrillera');
  await p.evaluate(() => { TLL.Q.boat = 'b7'; TLL.renderBuilder(); }); await p.waitForTimeout(150);
  await tap('[data-acc="kayak"]'); const t1 = await p.textContent('#ticket .total'); ok((await p.textContent('#ticket')).includes('Kayak') && /Total\$[\d.]+/.test(t1.replace(/\s/g, '')), 'Extra con costo suma al total: ' + t1.trim());
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#minibar').classList.contains('show')), 'Barra de total fija visible en el móvil mientras armas el día');
  const refc = await p.evaluate(() => TLL.refCode('Ana'));
  await p.fill('#q-code', refc.toLowerCase()); await tap('#code-form button'); await p.waitForTimeout(200);
  ok(await p.isVisible('#ticket .code-ok'), 'Código de referido válido aplica 5% (' + refc + ')');
  await p.fill('#q-code', 'TLLG-B4XK'); await tap('#code-form button'); await p.waitForTimeout(200);
  ok((await p.textContent('#ticket')).includes('Tarjeta de regalo'), 'Código de tarjeta de regalo se descuenta');
  await p.fill('#q-code', 'XXXX'); await tap('#code-form button'); await p.waitForTimeout(200);
  ok(await p.isVisible('#ticket .code-bad'), 'Código inválido muestra mensaje claro');
  // reserva dentro de la app, con condiciones
  await tap('#t-book'); await p.waitForSelector('#bk-form');
  ok(await p.isVisible('#bk-form'), 'Reservar ahora abre la confirmación dentro de la app');
  ok((await p.textContent('#bk-form')).includes('Condiciones principales') && await p.$('#bk-form .bk-policy') !== null, 'Confirmación muestra el resumen de condiciones y el texto completo');
  ok((await p.$$('#bk-form .pay-opt')).length === 4 && (await p.textContent('#bk-form .pay')).includes('Zelle') && (await p.textContent('#bk-form .pay')).includes('Binance Pay') && (await p.textContent('#bk-form .pay')).includes('PayPal') && (await p.textContent('#bk-form .pay')).includes('Efectivo'), 'Pago: Zelle, Binance Pay, PayPal o efectivo');
  ok(await p.isChecked('input[name="bk-pay"][value="zelle"]'), 'Pago: Zelle elegido por defecto');
  await tap('.pay-opt[data-pay="paypal"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const t = document.querySelector('#bk-payinfo').textContent, tot = TLL_LAST.total; return t.includes('4,5% de comisión de PayPal') && t.includes(TLL.money(Math.round(tot / 2 * 1.045 * 100) / 100)); }), 'PayPal: el abono suma el 4,5% de comisión');
  await tap('.pay-opt[data-pay="binance"]'); await p.waitForTimeout(150);
  ok(await p.isChecked('input[name="bk-pay"][value="binance"]') && (await p.textContent('#bk-payinfo')).includes('Binance Pay') && (await p.textContent('#bk-payinfo')).includes('Abono para apartar'), 'Pago: al elegir Binance cambian las instrucciones y el abono');
  await tap('#bk-go'); ok(await p.isVisible('#bk-form'), 'Sin nombre no deja confirmar');
  await p.fill('#bk-name', 'Familia Pérez'); await p.fill('#bk-phone', '0414 555 1234'); await tap('#bk-go'); await p.waitForTimeout(200);
  ok(await p.isVisible('#bk-form') && await p.$('#bk-code') === null, 'Sin aceptar las condiciones no deja confirmar');
  await tap('#bk-ok'); await tap('#bk-go'); await p.waitForSelector('#bk-code');
  const bcode = (await p.textContent('#bk-code')).trim(); ok(/^TLL-\d{4}$/.test(bcode), 'Reserva registrada con código ' + bcode);
  await tap('#bk-send'); await p.waitForTimeout(500);
  ok(popups.some(u => { const d = decodeURIComponent(u); return d.includes(bcode) && d.includes('comprobante') && !d.includes('Familia Pérez'); }), 'Sin hoja de compartir: abre el chat de Tu Lancha con un mensaje corto (los datos van en el PDF)');
  ok(await p.$('#bk-send') === null && await p.isVisible('#bk-home') && await p.isVisible('#bk-trip'), 'Tras enviar: "Volver al inicio" y "Ver mi viaje" toman el lugar del botón verde');
  ok(await p.evaluate(() => { const a = document.querySelector('#bk-home').getBoundingClientRect(), b = document.querySelector('#bk-trip').getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && a.right <= b.left; }), '"Volver al inicio" y "Ver mi viaje" van lado a lado');
  await tap('#bk-home'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => location.hash) === '#inicio' && !(await p.evaluate(() => document.querySelector('#dlg').open)), '"Volver al inicio" cierra y lleva a la portada');
  await go('mi-viaje'); await p.waitForTimeout(400);
  ok(await p.isVisible('#my-trips') && (await p.textContent('#my-trips')).includes(bcode) && (await p.textContent('#my-trips')).includes('Enviada'), 'Mi viaje muestra la reserva y su estado');
  await tap('#my-trips [data-mt-open]'); await p.waitForSelector('#dlg[open] #bk-code');
  ok((await p.textContent('#bk-code')).trim() === bcode && await p.isVisible('#bk-trip'), 'Mi viaje: "Comprobante" vuelve a mostrar la reserva registrada');
  await p.evaluate(() => document.querySelector('#dlg').close()); await p.waitForTimeout(200);
  await go('mi-viaje'); await p.waitForTimeout(300);
  ok(await p.inputValue('#code-live') === bcode, 'Mi viaje usa el código de la reserva');
  await go('embarcaciones'); await tap('[data-book="b3"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#reservar' && await p.getAttribute('[data-boat="b3"]', 'aria-pressed') === 'true', 'Botón Reservar de Embarcaciones lleva al asistente con esa embarcación');
  await go('experiencias');
  ok((await p.textContent('#canales')).includes('canales de El Morro') && (await p.textContent('#canales')).includes('Pesca deportiva'), 'Experiencias: canales de El Morro y pesca aparte');
  await tap('[data-copt="y"]'); ok((await p.textContent('#c-total')).includes('220'), 'Canales en yate: mínimo 10 personas × $22');
  await tap('#canal-form button[type=submit]'); await p.waitForTimeout(400); ok(popups.some(u => decodeURIComponent(u).includes('canales de El Morro')), 'Solicitar paseo por los canales abre WhatsApp');
  await go('aliados'); ok((await p.textContent('#allies')).includes('Cervecería Regional') && !(await p.textContent('#allies')).includes('Coco Beach') && (await p.textContent('[data-view="aliados"] h1')).includes('Servicio a bordo'), 'Servicio a bordo: aliados en cuadros, entra Cervecería Regional');
  ok(await p.evaluate(() => document.querySelectorAll('#ribbon-in .rb-i').length > 4 && !document.querySelector('#ribbon').hidden), 'Cintillo de aliados en el pie de página');
  await go('playas');
  ok((await p.textContent('#beaches')).includes('Rumbo 6') && (await p.textContent('#beaches')).includes('Isla La Borracha') && (await p.textContent('#beaches')).includes('Playa Ñacleta'), 'Playas agrupadas en 6 rumbos (Rumbo 4: La Borracha)');
  // playas → cotizador
  await tap('[data-goroute="r2"][data-gobeach="Isla de Plata"]'); await p.waitForTimeout(300); ok(await p.getAttribute('[data-route="r2"]', 'aria-pressed') === 'true' && await p.getAttribute('[data-beach="Isla de Plata"]', 'aria-pressed') === 'true', 'Playa → "Ir aquí" elige rumbo y playa en el asistente');
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
  const sos = await p.$('#dlg [data-sos]'); await sos.scrollIntoViewIfNeeded(); const bx = await sos.boundingBox();
  await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  ok(!(await p.isVisible('#dlg [data-sos-panel]')), 'Emergencia: un toque corto no dispara la alerta');
  await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(3300); await p.mouse.up();
  ok(await p.isVisible('#dlg [data-sos-panel]') && (await p.getAttribute('#dlg [data-sos-wa]', 'href')).includes('SOS'), 'Emergencia: mantener presionado 3 s muestra la alerta SOS');
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
  ok(await p.isVisible('#owners-sv') && (await p.textContent('#owner-allies')).includes('Servicio de capitán'), 'Propietarios: servicios que recomendamos (capitán, inflables)');
  await go('nosotros'); ok(await p.getAttribute('a[href^="tel:"]', 'href') === 'tel:+584143083864', 'Teléfono con enlace para llamar'); ok((await p.getAttribute('.visit a[href*="google.com/maps/dir"]', 'href')).includes('destination='), 'Ubicación abre indicaciones de Google Maps');
  ok(!errs.length, 'Sin errores de JavaScript en el flujo del cliente ' + errs.join('|'));
  await p.goto(URL + '#viaje'); await p.waitForTimeout(400); ok(await p.isVisible('#dlg[open] #lv-map'), 'Enlace directo #viaje abre la ubicación en vivo');
  await ctx.close();

  // El panel de control se prueba en tests-panel.js (necesita el servidor local con la API).
  await b.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
})();
