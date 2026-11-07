const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
for (const [n, d] of [['iPhone 13', devices['iPhone 13']], ['Galaxy Fold 280', { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true }], ['Pixel 7 apaisado', devices['Pixel 7 landscape']], ['iPad Mini', devices['iPad Mini']], ['Escritorio', { viewport: { width: 1440, height: 900 } }]]) {
  const c = await b.newContext({ ...d, deviceScaleFactor: 1 }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const reqs = []; p.on('request', r => { if (r.url().includes('/media/v/') && r.url().endsWith('.mp4')) reqs.push(r.url()); });
  const act = async h => { await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); d.hasTouch ? await h.tap() : await h.click(); };
  await p.goto('http://127.0.0.1:8765/index.html#playas'); await p.waitForTimeout(800);
  ok(reqs.length === 0, `${n}: los videos no se descargan hasta tocarlos`);
  const imgs = await p.evaluate(() => [...document.querySelectorAll('#beaches .vcard img')].map(i => i.getAttribute('src')));
  ok(imgs.length === 4, `${n}: Playas tiene video general y de los rumbos 1 a 3 (${imgs.length})`);
  for (const k of ['playas', 'rumbo2']) {
    await act(await p.$(`#beaches [data-vid="${k}"]`));
    await p.waitForSelector('#vdlg[open] video'); await p.waitForTimeout(1800);
    const st = await p.evaluate(() => { const v = document.querySelector('#vdlg video'), r = document.querySelector('#vdlg').getBoundingClientRect(); return { t: v.currentTime, w: v.videoWidth, err: v.error && v.error.code, fit: r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.top >= -1 }; });
    ok(st.w > 0 && !st.err, `${n}: video ${k} carga (${st.w}px, avanzó ${st.t.toFixed(1)}s)`);
    ok(st.fit, `${n}: video ${k} cabe en la pantalla`);
    await act(await p.$('#vdlg .m-close')); await p.waitForTimeout(200);
    ok(!(await p.evaluate(() => document.querySelector('#vdlg').open)) && await p.$('#vdlg video') === null, `${n}: cerrar detiene el video`);
  }
  await p.evaluate(() => { location.hash = 'reservar'; }); await p.waitForTimeout(400); await p.evaluate(() => TLL.goStep(2)); await p.waitForTimeout(200);
  const vids = await p.evaluate(() => [...document.querySelectorAll('[data-step="2"] [data-vid]')].map(e => e.dataset.vid));
  ok(vids.includes('muelles') && vids.includes('horario') && vids.some(v => v.startsWith('rumbo')), `${n}: paso 3 con videos de rumbo, muelles y horario (${vids})`);
  await p.evaluate(() => TLL.goStep(3)); await p.waitForTimeout(200);
  const v4 = await p.evaluate(() => [...document.querySelectorAll('[data-step="3"] [data-vid]')].map(e => e.dataset.vid));
  ok(v4.includes('accesorios') && v4.includes('comidas') && v4.includes('mercadillo'), `${n}: paso 4 con accesorios, comidas y Mercadillo (${v4})`);
  await act(await p.$('[data-step="3"] [data-vid="mercadillo"]')); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => document.querySelector('#vdlg video').videoWidth > 0), `${n}: video Mercadillo desde la reserva`); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(await p.isVisible('[data-step="3"]'), `${n}: al cerrar el video sigues en tu reserva`);
  await p.evaluate(() => { location.hash = 'embarcaciones'; }); await p.waitForTimeout(400); await act(await p.$('[data-open="b2"]')); await p.waitForSelector('#dlg[open]');
  await act(await p.$('#dlg [data-vid="accesorios"]')); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.querySelector('#vdlg').open && document.querySelector('#dlg').open), `${n}: video de accesorios desde el detalle sin cerrar el detalle`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelector('#dlg').open), `${n}: al cerrar el video sigue abierto el detalle`); await p.keyboard.press('Escape');
  await p.evaluate(() => { location.hash = 'aliados'; }); await p.waitForTimeout(400); ok((await p.$$('#ally-videos .vcard')).length === 3, `${n}: Aliados con videos`);
  await p.evaluate(() => { location.hash = 'nosotros'; }); await p.waitForTimeout(400); ok((await p.$$('#nosotros [data-vid]')).length === 2, `${n}: Nosotros con videos de horario y muelles`);
  for (const v of ['playas', 'reservar', 'aliados', 'nosotros']) { await p.evaluate(v => { location.hash = v; }, v); await p.waitForTimeout(300); const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(sw <= 0, `${n} · ${v}: sin desborde horizontal`); }
  ok(!errs.length, `${n}: sin errores ${errs.join('|')}`);
  await c.close();
}
console.log(f ? f + ' FALLAS' : 'TODO OK'); await b.close(); })();
