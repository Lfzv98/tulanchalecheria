// Pedido de Eduardo (14 nov): temporada alta, precio según niños, recogida de Eurobuilding que no se guardaba,
// fechas día/mes y el menú de arriba sin búsqueda. Correr con el servidor estático en 8765 (python3 -m http.server 8765 desde dist).
const { chromium, devices } = require('playwright');
const URL = process.env.TLL_URL || 'http://127.0.0.1:8765/index.html';
(async () => {
  const b = await chromium.launch(); let f = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const c = await b.newContext({ locale: 'es-VE', ...devices['iPhone 13'] });
  await c.route(/open-meteo|wa\.me|whatsapp\.com/, r => r.fulfill({ status: 200, body: '{}' }));
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(600);

  // 1) Eurobuilding: un catálogo publicado (el servidor lo guardaba como v1) ya no vuelve a la tarifa vieja
  const em = await p.evaluate(() => {
    const base = JSON.parse(JSON.stringify(TLL.DEF)); const d = base.docks.find(x => x.id === 'em'); d.cost = { s: 20, m: 20, my: 30, y: 50 };
    const out = [];
    for (const cat of [{ ...base, v: 1, t: Date.now() }, { ...base, v: 3 }]) { TLL.applyCat(cat); out.push(TLL.DOCKS.find(x => x.id === 'em').cost.s); }
    return out;
  });
  ok(em[0] === 20 && em[1] === 20, `Recogida en Cerro El Morro · Eurobuilding: el cambio del panel se respeta al recargar (${em.join(', ')})`);
  const old = await p.evaluate(() => { const base = JSON.parse(JSON.stringify(TLL.DEF)); base.docks = base.docks.filter(x => x.id !== 'rem'); base.docks.find(x => x.id === 'em').cost = { s: 20, m: 20, my: 30, y: 30 }; return TLL.migrateCat({ ...base, v: 1 }).docks.find(x => x.id === 'em').cost.s; });
  ok(old === 15, 'Un catálogo de antes del 12 nov sí se sigue convirtiendo una vez');

  // 2) temporada alta y precio según niños
  const r = await p.evaluate(() => {
    const D = TLL.iso, t0 = TLL.today, day = k => new Date(t0.getTime() + k * 864e5);
    // un martes dentro y uno fuera de la temporada (sin recargo de fin de semana)
    let k = 10; while (day(k).getDay() !== 2) k++;
    const cat = JSON.parse(JSON.stringify(TLL.DEF)); cat.v = 3;
    cat.seasons = [{ name: 'Prueba', from: D(day(k)), to: D(day(k + 2)) }]; cat.hiPct = 20;
    const b1 = cat.boats.find(x => x.id === 'b1'); b1.rp = { r1: 300, r2: 340 }; b1.rpH = { r1: 450 };
    const b0 = cat.boats.find(x => x.own); b0.kx = 3; b0.rp = { r1: 350 }; b0.kp = { r1: { 1: 380, 2: 410 } }; b0.kpH = { r1: { 1: 500 } };
    TLL.applyCat(cat);
    const B = id => TLL.BOATS.find(x => x.id === id), R = id => TLL.ROUTES.find(x => x.id === id);
    const hi = day(k), lo = day(k + 7);
    return {
      isHi: TLL.isHigh(hi), isLo: TLL.isHigh(lo),
      b1hi: TLL.priceOn(B('b1'), hi, R('r1'), 0), b1lo: TLL.priceOn(B('b1'), lo, R('r1'), 0), b1pct: TLL.priceOn(B('b1'), hi, R('r2'), 0),
      k0: TLL.priceOn(B('b0'), lo, R('r1'), 0), k1: TLL.priceOn(B('b0'), lo, R('r1'), 1), k2: TLL.priceOn(B('b0'), lo, R('r1'), 2), k3: TLL.priceOn(B('b0'), lo, R('r1'), 3),
      k1hi: TLL.priceOn(B('b0'), hi, R('r1'), 1), k2hi: TLL.priceOn(B('b0'), hi, R('r1'), 2), hiIso: D(hi)
    };
  });
  ok(r.isHi && !r.isLo, 'Las fechas marcadas cuentan como temporada alta y las demás no');
  ok(r.b1hi === 450 && r.b1lo === 300, `Temporada alta usa la tarifa propia de la embarcación ($${r.b1hi} vs $${r.b1lo})`);
  ok(r.b1pct === 408, `Sin tarifa de temporada alta: la normal + el % general ($340 + 20% = $${r.b1pct})`);
  ok(r.k0 === 350 && r.k1 === 380 && r.k2 === 410 && r.k3 === 350, `Lancha de la casa: el precio cambia con 1 y 2 niños ($${r.k0} → $${r.k1} → $${r.k2}; sin dato = normal)`);
  ok(r.k1hi === 500 && r.k2hi === 492, `Niños en temporada alta: tabla propia o la normal + % ($${r.k1hi}, $${r.k2hi})`);

  // 3) la reserva en temporada alta lo dice y pide el 100%
  await p.evaluate(iso => { const q = TLL.Q; q.date = iso; q.boat = 'b1'; q.route = 'r1'; q.pax = 4; q.kids = 0; location.hash = 'reservar'; }, r.hiIso); await p.waitForTimeout(400);
  await p.evaluate(() => TLL.renderBuilder()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => TLL_LAST.hi && TLL_LAST.lines[0][0].includes('temporada alta') && TLL_LAST.lines[0][1] === 450), 'La cotización marca "temporada alta" y cobra su tarifa');
  await p.evaluate(() => TLL.openBooking()); await p.waitForSelector('#dlg[open] #bk-form');
  ok((await p.textContent('#bk-form .bk-review')).includes('se aparta con el 100%') && (await p.textContent('#bk-payinfo')).includes('100% · temporada alta'), 'En temporada alta se aparta con el 100% (como dicen las condiciones)');
  await p.evaluate(() => document.querySelector('#dlg').close());

  // 4) fechas día/mes/año
  await p.evaluate(() => { location.hash = 'reservar'; TLL.goStep(0); }); await p.waitForTimeout(300);
  const shown = await p.evaluate(() => { const i = document.querySelector('#b-date'); return { v: i.value, t: i.parentNode.querySelector('.dfield-v').textContent }; });
  const [yy, mm, dd] = shown.v.split('-');
  ok(shown.t.endsWith(`${dd}/${mm}/${yy}`), `La fecha de la reserva se ve día/mes/año (${shown.t})`);
  await p.evaluate(() => { const i = document.querySelector('#b-date'); i.value = '2027-01-05'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.querySelector('#b-date').parentNode.querySelector('.dfield-v').textContent)).endsWith('05/01/2027'), 'Al cambiar la fecha se actualiza en formato día/mes/año (05/01/2027)');
  ok(!errs.length, 'Sin errores ' + errs.join(' | '));
  await c.close();

  // 5) menú de arriba como antes, sin búsqueda, sin desbordar
  for (const [name, vp] of [['Escritorio 1440', { width: 1440, height: 900 }], ['Escritorio 1280', { width: 1280, height: 800 }], ['Laptop 1100', { width: 1100, height: 800 }], ['iPhone SE', devices['iPhone SE']]]) {
    const c2 = await b.newContext(vp.width ? { viewport: vp, locale: 'es-VE' } : { ...vp, locale: 'es-VE' }); const q = await c2.newPage();
    await q.goto(URL); await q.waitForTimeout(500);
    const h = await q.evaluate(() => { const nav = document.querySelector('.mainnav'), vis = nav && getComputedStyle(nav).display !== 'none'; const links = vis ? [...nav.querySelectorAll('a')].filter(a => a.offsetParent).map(a => a.textContent) : [];
      const items = [...document.querySelectorAll('#topbar .brand, #topbar .mainnav a, #topbar .top-actions > *')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
      const overlap = items.some((a, i) => items.some((b, j) => j > i && a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top && b.bottom > a.top));
      return { search: !!document.querySelector('#tsearch'), vis, links, overlap, sw: document.documentElement.scrollWidth - innerWidth, menu: !!document.querySelector('#menu-open').offsetParent }; });
    ok(!h.search && h.menu && !h.overlap && h.sw <= 0, `${name}: sin búsqueda, botón del menú visible, nada se encima ni desborda`);
    if (vp.width >= 1100) ok(h.vis && h.links.includes('Embarcaciones') && h.links.includes('Playas'), `${name}: vuelve el menú de arriba (${h.links.join(' · ')})`);
    await c2.close();
  }
  await b.close(); console.log(f ? `\n${f} FALLAS de ${n}` : `\nTODO OK · ${n} comprobaciones`); process.exit(f ? 1 : 0);
})();
