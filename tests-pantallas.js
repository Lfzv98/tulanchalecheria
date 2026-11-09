// Matriz: todos los flujos en todos los tamaños de pantalla (Android, iOS, tablets, escritorio)
const { chromium, devices } = require('playwright');
const URL = 'http://127.0.0.1:8765/index.html';
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('  ✗ ' + m); } };
const DEV = [
  ['Galaxy Fold cerrado 280', { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true, userAgent: devices['Galaxy S9+'].userAgent }],
  ['Galaxy S8 360', devices['Galaxy S8']], ['Galaxy S9+', devices['Galaxy S9+']], ['Pixel 5', devices['Pixel 5']], ['Pixel 7', devices['Pixel 7']],
  ['Galaxy A51/71', devices['Galaxy A55'] || devices['Galaxy S24'] || devices['Pixel 7']],
  ['iPhone SE', devices['iPhone SE']], ['iPhone 12 mini', devices['iPhone 12 Mini']], ['iPhone 13', devices['iPhone 13']], ['iPhone 15 Pro Max', devices['iPhone 15 Pro Max']],
  ['iPhone 13 apaisado', devices['iPhone 13 landscape']], ['Pixel 7 apaisado', devices['Pixel 7 landscape']],
  ['iPad Mini', devices['iPad Mini']], ['iPad Pro 11 apaisado', devices['iPad Pro 11 landscape']], ['Galaxy Tab S4', devices['Galaxy Tab S4']],
  ['Laptop 1280', { viewport: { width: 1280, height: 720 } }], ['Escritorio 1920', { viewport: { width: 1920, height: 1080 } }]
];
const VIEWS = ['inicio', 'embarcaciones', 'reservar', 'playas', 'experiencias', 'regalos', 'aliados', 'mi-viaje', 'nosotros', 'propietarios'];
(async () => {
  const b = await chromium.launch();
  for (const [name, d] of DEV) {
    const ctx = await b.newContext({ locale: 'es-VE', ...d, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.route(/wa\.me|open-meteo|youtu|instagram|mercadillo/, r => r.fulfill({ status: 200, body: 'ok' }));
    const p = await ctx.newPage(); const errs = []; const pops = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('popup', async x => { pops.push(decodeURIComponent(x.url())); await x.close().catch(() => {}); });
    const touch = !!d.hasTouch;
    const act = async s => { const h = typeof s === 'string' ? await p.waitForSelector(s, { state: 'visible', timeout: 5000 }) : s; await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40); touch ? await h.tap() : await h.click(); };
    const over = async where => {
      const r = await p.evaluate(() => {
        const W = document.documentElement.clientWidth, sw = Math.max(document.documentElement.scrollWidth, innerWidth) - W;
        const bad = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); if (s.position === 'fixed' || e.closest('svg') && e.tagName !== 'svg' || e.closest('.days,.tbl-wrap,.layers,.hero,.tabs,.filters,.thumbs,.skip')) return false; const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1) && s.visibility !== 'hidden' && !e.closest('[hidden]'); });
        return { sw, bad: bad.slice(0, 3).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className) + '#' + e.id) };
      });
      ok(r.sw <= 0 && !r.bad.length, `${name} · ${where}: sin desborde (${r.sw}px ${r.bad.join(', ')})`);
    };
    const dlgOver = async where => {
      const r = await p.evaluate(() => { const d = document.querySelector('#dlg'); const W = d.clientWidth; const bad = [...d.querySelectorAll('*')].filter(e => { if (e.closest('svg') && e.tagName !== 'svg' || e.closest('.thumbs')) return false; const r = e.getBoundingClientRect(), dr = d.getBoundingClientRect(); return r.width && (r.right > dr.right + 1 || r.left < dr.left - 1); }); return { fits: d.getBoundingClientRect().right <= innerWidth + 1, bad: bad.slice(0, 3).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)) , scroll: getComputedStyle(d).overflowY, W }; });
      ok(r.fits && !r.bad.length && ['auto', 'scroll'].includes(r.scroll), `${name} · ${where}: ventana cabe y se desplaza (${r.bad.join(', ')} ${r.scroll})`);
    };
    await p.goto(URL); await p.waitForTimeout(600);
    for (const v of VIEWS) { await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(350); await over(v); ok(await p.isVisible(`[data-view="${v}"] h1`) || v === 'inicio', `${name} · ${v} visible`); }
    // navegación: tabbar en móvil o menú
    const tab = await p.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display !== 'none');
    if (tab) { await p.evaluate(() => location.hash = 'inicio'); await p.waitForTimeout(300); await act('.tabbar [data-tab="embarcaciones"]'); await p.waitForTimeout(300); ok(await p.isVisible('#boats'), `${name}: barra inferior → Embarcaciones`); await act('#menu-open-2'); ok(await p.isVisible('#sheet'), `${name}: menú Más`); await act('#sheet a[href="#aliados"]'); await p.waitForTimeout(300); ok(await p.isVisible('#allies'), `${name}: menú → Aliados`); }
    else { await act('.mainnav a[data-nav="embarcaciones"]'); await p.waitForTimeout(300); ok(await p.isVisible('#boats'), `${name}: menú superior → Embarcaciones`); }
    // inicio → lancha de la casa
    await p.evaluate(() => location.hash = 'inicio'); await p.waitForTimeout(300);
    await act('#own-feature [data-open="b0"]'); await p.waitForSelector('#dlg[open]'); await p.waitForTimeout(250); await dlgOver('detalle lancha de la casa');
    ok((await p.textContent('#dlg')).includes('Equipamiento básico'), `${name}: detalle con equipamiento básico`);
    await act('#dlg .m-close'); ok(!(await p.evaluate(() => document.querySelector('#dlg').open)), `${name}: cerrar detalle`);
    // reserva completa
    await p.evaluate(() => { localStorage.removeItem('tll:quote2'); location.hash = 'reservar'; }); await p.reload(); await p.waitForTimeout(500);
    await act('#pax-p'); await act('#pax-p'); ok((await p.textContent('#pax')).trim() === '6', `${name}: cambiar personas`);
    await act('#kid-p'); ok((await p.textContent('#kids')).trim() === '1', `${name}: contador de niños`);
    await p.fill('#b-date', await p.evaluate(() => TLL.iso(new Date(TLL.today.getTime() + 12 * 864e5))));
    await p.dispatchEvent('#b-date', 'change'); await over('reserva paso 1');
    await act('#st-next'); await p.waitForTimeout(250); await over('reserva paso 2');
    const first = await p.$('#b-boats .opt'); await act(first); await p.waitForTimeout(300);
    if (!(await p.isVisible('[data-step="2"]'))) await act('#st-next');
    await p.waitForTimeout(250); await over('reserva paso 3');
    await act('[data-route="r2"]'); await act('[data-beach="Punta La Cruz"]'); await p.waitForTimeout(150);
    ok((await p.$$('#b-beaches .bchip[aria-pressed="true"]')).length === 2, `${name}: elegir 2 playas del Rumbo 2`);
    await p.selectOption('#b-dock', 'av'); await p.waitForTimeout(150); ok((await p.textContent('#b-dockinfo')).includes('Américo Vespucio'), `${name}: muelle Américo Vespucio`);
    await act('#st-next'); await p.waitForTimeout(250); await over('reserva paso 4');
    ok((await p.textContent('#b-extras')).includes('Rincón Marino'), `${name}: Rumbo 2 recomienda El Rincón Marino`);
    const acc = await p.$('[data-acc]'); if (acc) { const k = await acc.getAttribute('data-acc'); await act(acc); ok(await p.getAttribute(`[data-acc="${k}"]`, 'aria-pressed') === 'true' && (await p.textContent('#ticket')).includes(await p.evaluate(k => TLL.ACC[k], k)), `${name}: agregar extra suma al total`); }
    await act('#st-next'); await p.waitForSelector('#bk-form'); await p.waitForTimeout(300); await dlgOver('confirmar reserva');
    await act('#bk-form .bk-policy summary'); await p.waitForTimeout(150); ok(await p.isVisible('#bk-form .bk-policy h4'), `${name}: abrir condiciones completas`); await dlgOver('condiciones abiertas');
    await p.fill('#bk-name', 'Ana Prueba'); await act('#bk-go'); await p.waitForTimeout(150); ok(await p.$('#bk-code') === null, `${name}: sin casilla no confirma`);
    const box = await p.$('#bk-ok'); const bb = await box.boundingBox(); ok(bb.width >= 20 && bb.height >= 20, `${name}: casilla con tamaño tocable (${Math.round(bb.width)}px)`);
    await act('#bk-ok'); await act('#bk-go'); await p.waitForSelector('#bk-code', { timeout: 4000 }).catch(() => {});
    const code = (await p.textContent('#bk-code').catch(() => '')).trim(); ok(/^TLL-\d{4}$/.test(code), `${name}: reserva con código ${code}`);
    await dlgOver('reserva registrada');
    await act('#bk-send'); await p.waitForTimeout(400);
    const shared = await p.evaluate(() => window.__shared || null);
    ok(pops.some(u => u.includes(code)) || (shared && shared.text && shared.text.includes(code)), `${name}: el comprobante sale a WhatsApp con el código`);
    await dlgOver('reserva enviada');
    await act('#bk-trip'); await p.waitForTimeout(500); await over('mi viaje con reserva');
    ok((await p.textContent('#my-trips')).includes(code), `${name}: Mi viaje lista la reserva`);
    // canales
    await p.evaluate(() => location.hash = 'experiencias'); await p.waitForTimeout(350);
    await act('[data-copt="b"]'); ok((await p.textContent('#c-total')).includes('500'), `${name}: canales barco de eventos $500`);
    await act('[data-cex="dron"]'); ok((await p.textContent('#c-total')).includes('530'), `${name}: canales + dron = $530`);
    await act('#canal-form button[type=submit]'); await p.waitForTimeout(300); ok(pops.some(u => u.includes('canales')), `${name}: canales abre WhatsApp`);
    // playas → reserva
    await p.evaluate(() => location.hash = 'playas'); await p.waitForTimeout(350);
    await act('[data-gobeach="Playa Ñacleta"]'); await p.waitForTimeout(300);
    ok(await p.getAttribute('[data-route="r3"]', 'aria-pressed') === 'true' || await p.isDisabled('[data-route="r3"]'), `${name}: Ir aquí (Ñacleta) elige Rumbo 3`);
    // detalle de un barco con calendario
    await p.evaluate(() => location.hash = 'embarcaciones'); await p.waitForTimeout(350);
    await act('[data-open="b3"]'); await p.waitForSelector('#dlg[open]'); await p.waitForTimeout(200); await dlgOver('detalle yate');
    const fr = await p.$('#m-cal .cal-g button:not([disabled]):not(.busy)'); await act(fr); await act('#m-book'); await p.waitForTimeout(400);
    ok(await p.isVisible('[data-step="2"]') && await p.getAttribute('[data-boat="b3"]', 'aria-pressed') === 'true', `${name}: detalle → reservar este yate`);
    ok(!errs.length, `${name}: sin errores de JavaScript (${errs.join(' | ')})`);
    await ctx.close();
  }
  // datos viejos en el teléfono (versión anterior) no rompen la app
  const c2 = await b.newContext({ locale: 'es-VE', ...devices['Pixel 7'] }); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.goto(URL); await q.evaluate(() => { localStorage.setItem('tll:quote', JSON.stringify({ pax: 30, boat: 'b8', route: 'r6', dock: 3, extras: { e1: true } })); localStorage.setItem('tll:cur', '"VES"'); localStorage.setItem('tll:quote2', JSON.stringify({ pax: 99, boat: 'zz', route: 'r9', dock: 'xx', beaches: ['Nada'], acc: { foo: 1 }, date: '2020-01-01', hx: 9 })); });
  await q.reload(); await q.waitForTimeout(500); await q.evaluate(() => location.hash = 'reservar'); await q.waitForTimeout(400);
  ok(!e2.length, `Datos viejos o dañados en el teléfono no rompen la app (${e2.join('|')})`);
  ok(!(await q.textContent('#ticket')).includes('Bs'), 'Datos viejos: ya no muestra bolívares');
  // sin almacenamiento (modo privado estricto)
  const c3 = await b.newContext({ locale: 'es-VE', ...devices['iPhone 13'] }); await c3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  const r = await c3.newPage(); const e3 = []; r.on('pageerror', e => e3.push(e.message)); await r.goto(URL); await r.waitForTimeout(500);
  ok(!e3.length && (await r.textContent('#own-feature')).includes('Lancha de la casa'), `Sin almacenamiento (navegación privada) la app carga (${e3.join('|')})`);
  await b.close();
  console.log(fails ? `\n${fails} FALLAS de ${n}` : `\nTODO OK · ${n} comprobaciones en ${DEV.length} pantallas`);
})();
