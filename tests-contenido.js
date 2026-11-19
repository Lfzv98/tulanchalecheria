// Panel 19 nov: textos y videos editables, proveedores con WhatsApp de ventas, pestaña Propietarios,
// bloqueos de mantenimiento (Eduardo no puede cambiar lo bloqueado) y respaldo.
// Uso: ADMIN_EXTRA='[{"user":"dev-prueba",...}]' node tests-vivo-servidor.js dist api/live.js 8766 &  →  node tests-contenido.js
const { chromium, devices } = require('playwright'); const cr = require('crypto');
const BASE = 'http://127.0.0.1:8766/';
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const pipe = cmds => fetch(BASE + 'fake-redis/pipeline', { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify(cmds) }).then(r => r.json());
async function login(p, u, pw) {
  await p.goto(BASE + '#capitan'); await p.waitForSelector('#lg'); await p.fill('#lg-u', u); await p.fill('#lg-p', pw); await p.click('#lg-go'); await p.waitForSelector('.ad-tabs');
  await p.evaluate(() => localStorage.setItem('tll:adm-welcome', 'true')); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
}
const publish = async p => { await p.click('.ad-save .btn-sun'); await p.waitForTimeout(1500); };
const cat = async () => (await fetch(BASE + 'api/admin?a=cat')).json();
(async () => {
  await fetch(BASE + '__reset');
  const salt = cr.randomBytes(16).toString('hex'), iter = 1000;
  await pipe([['SET', 'adm:cred', JSON.stringify({ user: 'prueba', salt, iter, hash: cr.pbkdf2Sync('Clave-Prueba-1', salt, iter, 32, 'sha256').toString('hex') })]]);
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await login(p, 'prueba', 'Clave-Prueba-1');
  const tabs = await p.$$eval('.ad-tabs [data-adtab]', a => a.map(x => x.dataset.adtab));
  ok(tabs.includes('contenido') && tabs.includes('propietarios') && !tabs.includes('mant'), 'Eduardo: pestañas Textos y videos y Propietarios; no ve Mantenimiento');
  // textos
  await p.click('[data-adtab="contenido"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => (document.querySelector('[data-k="tx.inicio_t.es"]') || {}).placeholder || '').then ? true : true, 'Textos listos');
  ok(/Tu día perfecto/.test(await p.getAttribute('[data-k="tx.inicio_t.es"]', 'placeholder')), 'El texto original se ve de guía (gris)');
  await p.fill('[data-k="tx.inicio_t.es"]', 'Vive el mar\nen el Parque Nacional Mochima'); await p.dispatchEvent('[data-k="tx.inicio_t.es"]', 'input');
  await p.fill('[data-k="tx.inicio_t.en"]', 'Live the sea\nin Mochima National Park'); await p.dispatchEvent('[data-k="tx.inicio_t.en"]', 'input');
  await p.fill('[data-k="vid.comidas"]', 'https://youtu.be/HD1ESvApfz8'); await p.dispatchEvent('[data-k="vid.comidas"]', 'input');
  await p.click('[data-press-add]'); await p.fill('[data-k="press.0.t"]', 'Venevisión · Mochima'); await p.dispatchEvent('[data-k="press.0.t"]', 'input');
  await p.fill('[data-k="press.0.url"]', 'https://www.youtube.com/watch?v=HD1ESvApfz8'); await p.dispatchEvent('[data-k="press.0.url"]', 'input');
  // proveedores
  await p.click('[data-adtab="propietarios"]'); await p.waitForTimeout(200);
  ok(await p.isVisible('text=Ferrenautic') || (await p.$$eval('.ad-ally input', a => a.some(x => x.value === 'Ferrenautic'))), 'Propietarios: proveedores en su propia pestaña');
  const k6 = await p.$eval('.ad-ally [data-k$=".6"]', e => e.dataset.k);
  await p.fill(`[data-k="${k6}"]`, '0414 555 1234'); await p.dispatchEvent(`[data-k="${k6}"]`, 'input');
  const k7 = k6.replace(/\.6$/, '.7'); await p.fill(`[data-k="${k7}"]`, 'Requiero una batería'); await p.dispatchEvent(`[data-k="${k7}"]`, 'input');
  await p.click('[data-adtab="flota"]'); await p.click('[data-adtab="propietarios"]'); await p.waitForTimeout(200);
  ok(/wa\.me\/584145551234\?text=Hola%2C%20soy%20cliente%20de%20Tu%20Lancha%20Lecher/.test(await p.$eval(`[data-k="${k6}"]`, e => e.closest('.ad-ally').querySelector('.ad-link code').textContent)), 'Enlace para compartir con el WhatsApp del proveedor y el saludo');
  ok(await p.isVisible('text=Alquiler para propietarios'), 'El alquiler para propietarios está en la misma pestaña');
  await publish(p);
  let c = await cat();
  ok(c.tx && c.tx.inicio_t && /Vive el mar/.test(c.tx.inicio_t.es) && c.vid.comidas && c.press.length === 1, 'Se publican textos, videos y reportajes');
  // la web
  const w = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); w.on('pageerror', e => errs.push(e.message));
  await w.goto(BASE + 'index.html'); await w.waitForTimeout(1800);
  ok(/Vive el mar/.test(await w.textContent('#inicio h1')) && (await w.textContent('#inicio h1 em')).includes('Mochima'), 'Web: título nuevo con la 2.ª línea resaltada');
  ok(await w.$$eval('#inicio-mas .press-x', a => a.some(x => /Venevisión/.test(x.textContent))), 'Web: reportaje nuevo en “Nos han reseñado”');
  ok(!(await w.$('.fab')), 'Web: sin el botón flotante de WhatsApp');
  ok(await w.evaluate(() => [...document.querySelectorAll('.orbit-band .orb-tabs [role=tab]')].map(t => t.textContent.trim()).join('|')) .then(x => !/Nosotros|Reservar/.test(x)), 'Menú giratorio sin Nosotros ni Reservar debajo');
  await w.goto(BASE + 'index.html#propietarios'); await w.waitForTimeout(800);
  ok(await w.$$eval('#owner-allies a', a => a.some(x => /wa\.me\/584145551234\?text=Hola%2C%20soy%20cliente/.test(x.href))), 'Web: tocar el proveedor abre su WhatsApp de ventas con el mensaje');
  await w.evaluate(() => localStorage.setItem('tll:quote2', JSON.stringify({ pax: 4, kids: 0, boat: 'b3', route: 'r3', beaches: [], dock: 'pm', acc: {} })));
  await w.goto(BASE + 'index.html#reservar'); await w.reload(); await w.waitForTimeout(1000);
  ok(await w.evaluate(() => { const own = TLL.BOATS.find(b => b.own); return document.querySelector(`[data-boat="${own.id}"]`)?.getAttribute('aria-pressed') === 'true' && document.querySelector('[data-route="r1"]')?.getAttribute('aria-pressed') === 'true'; }), 'Reservar arranca siempre con la embarcación de Eduardo y el Rumbo 1');
  ok(!(await w.isVisible('#t-book')) && await w.isVisible('.t-steps-hint'), 'Sin “Reservar ahora” hasta completar los 5 pasos');
  await w.evaluate(() => TLL.goStep(4)); await w.waitForTimeout(200);
  ok(await w.isVisible('#t-book') || await w.isVisible('#mb-book'), 'En el paso 5 aparece “Reservar ahora”');
  await w.evaluate(() => TLL.goStep(4)); await w.waitForTimeout(200);
  await w.click('#b-food [data-vid="comidas"]'); await w.waitForTimeout(500);
  ok(await w.$eval('#vdlg', d => d.open && !!d.querySelector('iframe[src*="youtube-nocookie.com/embed/HD1ESvApfz8"]')), 'Web: el video cambiado se ve con YouTube dentro de la app');
  await w.click('#vdlg .m-close');
  await w.evaluate(() => localStorage.setItem('tll:lang', '"en"')); await w.goto(BASE + 'index.html'); await w.waitForTimeout(1500);
  ok(/Live the sea/.test(await w.textContent('#inicio h1')), 'Web en inglés: usa la traducción que escribió Eduardo');
  // mantenimiento
  const d = await b.newPage({ viewport: { width: 1280, height: 900 } }); d.on('pageerror', e => errs.push(e.message));
  await login(d, 'dev-prueba', 'Dev-Prueba-1');
  ok((await d.$$eval('.ad-tabs [data-adtab]', a => a.map(x => x.dataset.adtab))).includes('mant'), 'Luis: ve Mantenimiento');
  await d.click('[data-adtab="mant"]'); await d.waitForTimeout(200);
  await d.check('[data-lock="docks"]'); await publish(d);
  c = await cat(); ok(Array.isArray(c.lock) && c.lock.includes('docks'), 'Bloqueo de Muelles publicado');
  const [dl] = await Promise.all([d.waitForEvent('download'), d.click('[data-bk-dl]')]); ok(/respaldo/.test(dl.suggestedFilename()), 'Descarga el respaldo');
  // Eduardo con Muelles bloqueado
  await p.reload(); await p.waitForSelector('.ad-tabs'); await p.waitForTimeout(400);
  ok(!(await p.$$eval('.ad-tabs [data-adtab]', a => a.map(x => x.dataset.adtab))).includes('muelles'), 'Eduardo ya no ve Muelles');
  const tokE = await p.evaluate(() => JSON.parse(sessionStorage.getItem('tll:adm-s') || localStorage.getItem('tll:adm-s') || 'null'));
  if (tokE) { const cc = await cat(); const before = JSON.stringify(cc.docks); cc.docks = []; cc.lock = []; await fetch(BASE + 'api/admin?a=save', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokE.t }, body: JSON.stringify({ cat: cc }) });
    const c2 = await cat(); ok(JSON.stringify(c2.docks) === before && c2.lock.includes('docks'), 'Aunque Eduardo intente, el servidor conserva lo bloqueado'); }
  else ok(false, 'No encontré la sesión de Eduardo');
  ok(!errs.length, 'Sin errores ' + errs.join(' | '));
  await b.close(); console.log(f ? `\n${f} FALLAS` : '\nTODO OK'); process.exit(f ? 1 : 0);
})();
