// Pruebas del comprobante de reserva: revisión antes de pagar, PDF descargable y envío con la hoja de compartir
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.env.TLL_URL || 'http://127.0.0.1:8765/index.html';
const SHOTS = process.env.TLL_SHOTS || '';
(async () => {
  const b = await chromium.launch(); let f = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const DEV = [['iPhone 13', devices['iPhone 13'], true], ['Pixel 7', devices['Pixel 7'], true], ['Galaxy Fold 280', { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true }, true], ['Escritorio', { viewport: { width: 1440, height: 900 } }, false]];
  for (const [name, d, share] of DEV) {
    const c = await b.newContext({ ...d, deviceScaleFactor: 1, acceptDownloads: true });
    await c.route(/open-meteo/, r => r.fulfill({ status: 200, body: '{}' }));
    if (share) await c.addInitScript(() => { window.__shared = null; navigator.canShare = o => !!(o && o.files); navigator.share = async o => { window.__shared = { n: o.files.length, name: o.files[0].name, type: o.files[0].type, size: o.files[0].size, text: o.text }; }; });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '#reservar'); await p.waitForTimeout(600);
    await p.evaluate(() => window.TLL.openBooking());
    await p.waitForSelector('#dlg[open] #bk-form');
    // revisión antes de pagar
    const rv = await p.$eval('#bk-form', f => { const r = f.querySelector('.bk-review'), pay = f.querySelector('fieldset.pay'); return { has: !!r, before: r && pay && (r.compareDocumentPosition(pay) & Node.DOCUMENT_POSITION_FOLLOWING) > 0, checks: r ? r.querySelectorAll('.bk-checks li').length : 0, txt: r ? r.textContent : '' }; });
    ok(rv.has && rv.before, `${name}: la revisión del pedido aparece antes del pago`);
    ok(rv.checks >= 6 && rv.txt.includes('Rumbo') && rv.txt.includes('Muelle') && rv.txt.includes('Extras'), `${name}: checklist con embarcación, grupo, fecha, rumbo, muelle y extras`);
    const tot = await p.evaluate(() => window.TLL.money(window.TLL_LAST.total));
    ok((await p.textContent('#bk-total')) === tot && rv.txt.includes('Abono para apartar'), `${name}: muestra el total del pedido (${tot}) y el abono`);
    const fit = await p.evaluate(() => { const r = document.querySelector('.bk-review').getBoundingClientRect(); return r.right <= innerWidth + 1 && [...document.querySelectorAll('.bk-review *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1); });
    ok(fit, `${name}: la revisión cabe sin desborde`);
    if (SHOTS) { await p.$eval('.bk-review', e => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(150); await p.screenshot({ path: `${SHOTS}/review-${name.replace(/\W+/g, '')}.png` }); }
    await p.fill('#bk-name', 'María Pérez'); await p.fill('#bk-phone', '0414 555 1234'); await p.fill('#bk-note', 'Cumpleaños 🎂 de mi mamá');
    await p.check('#bk-ok'); await p.click('#bk-go');
    await p.waitForSelector('#dlg[open] #bk-pdf');
    await p.waitForSelector('#bk-pdf.ready', { timeout: 15000 }).catch(() => {});
    ok(await p.$('#bk-pdf.ready') !== null, `${name}: el PDF se prepara al abrir la pantalla final (${(await p.textContent('#bk-pdf-st')).trim()})`);
    ok((await p.$('#bk-pdf-share') !== null) === share, `${name}: ${share ? 'muestra' : 'oculta'} "Enviar PDF por WhatsApp" según el equipo`);
    const code = await p.textContent('#bk-code');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-pdf-dl')]);
    const file = await dl.path(); const buf = fs.readFileSync(file);
    ok(dl.suggestedFilename() === `Tu-Lancha-${code}.pdf`, `${name}: descarga con nombre ${dl.suggestedFilename()}`);
    ok(buf.slice(0, 5).toString() === '%PDF-' && buf.length > 30000 && buf.length < 1500000, `${name}: es un PDF válido de ${Math.round(buf.length / 1024)} KB`);
    if (SHOTS && name === 'Escritorio') fs.copyFileSync(file, `${SHOTS}/comprobante.pdf`);
    if (share) {
      await p.click('#bk-pdf-share'); await p.waitForTimeout(300);
      const sh = await p.evaluate(() => window.__shared);
      ok(sh && sh.n === 1 && sh.type === 'application/pdf' && sh.name === `Tu-Lancha-${code}.pdf` && sh.size > 30000, `${name}: comparte el PDF como archivo (WhatsApp desde la hoja de compartir)`);
      ok(await p.$eval('#bk-li-send', e => e.className === 'ok'), `${name}: al compartir marca la reserva como enviada`);
    }
    ok(await p.$eval('#bk-send', a => a.href.includes('wa.me')), `${name}: sigue el mensaje de WhatsApp con el resumen`);
    const fit2 = await p.evaluate(() => [...document.querySelectorAll('#bk-pdf *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1));
    ok(fit2, `${name}: el bloque del PDF cabe sin desborde`);
    if (SHOTS) { await p.$eval('#bk-pdf', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); await p.screenshot({ path: `${SHOTS}/done-${name.replace(/\W+/g, '')}.png` }); }
    // desde Mis reservas también se puede volver a bajar
    await p.keyboard.press('Escape'); await p.evaluate(() => { location.hash = 'mi-viaje'; }); await p.waitForTimeout(300);
    await p.click(`[data-mt-open="${code}"]`); await p.waitForSelector('#dlg[open] #bk-pdf.ready', { timeout: 15000 }).catch(() => {});
    ok(await p.$('#bk-pdf.ready') !== null, `${name}: Mis reservas permite volver a bajar el comprobante`);
    ok(!errs.length, `${name}: sin errores de JavaScript ${errs.join(' | ')}`);
    await c.close();
  }
  console.log(f ? `\n${f} FALLAS de ${n}` : `\nTODO OK · ${n} comprobaciones`); await b.close(); process.exit(f ? 1 : 0);
})();
