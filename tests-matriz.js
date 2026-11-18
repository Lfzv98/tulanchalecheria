// Matriz de precios del panel: carga el cuadro de Eduardo (18 nov), publica y revisa que la web cobre esos precios.
// Uso: node tests-vivo-servidor.js dist api/live.js 8766 &  →  node tests-matriz.js
const { chromium } = require('playwright'); const cr = require('crypto');
const BASE = 'http://127.0.0.1:8766/';
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  await fetch(BASE + '__reset');
  const salt = cr.randomBytes(16).toString('hex'), iter = 1000;
  await fetch(BASE + 'fake-redis/pipeline', { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify([['SET', 'adm:cred', JSON.stringify({ user: 'prueba', salt, iter, hash: cr.pbkdf2Sync('Clave-Prueba-1', salt, iter, 32, 'sha256').toString('hex') })]]) });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '#capitan'); await p.waitForSelector('#lg'); await p.fill('#lg-u', 'prueba'); await p.fill('#lg-p', 'Clave-Prueba-1'); await p.click('#lg-go'); await p.waitForSelector('.ad-tabs');
  await p.evaluate(() => localStorage.setItem('tll:adm-welcome', 'true')); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('[data-adtab="precios"]'); await p.waitForTimeout(300);
  await p.click('[data-px-edu]'); await p.waitForTimeout(400);
  ok(/actualizadas/.test(await p.textContent('.ad-px-rep')), 'Carga el cuadro del 18 nov');
  ok(await p.evaluate(() => [...document.querySelectorAll('.ad-px thead th')].filter(x => /Rumbo [1-6]/.test(x.textContent)).length >= 6), 'Columnas de los rumbos 1 a 6');
  // editar una celda: escribir "–" quita el rumbo, "?" lo deja por confirmar
  const cell = await p.$('[data-px="0.r2"]'); await cell.fill('?'); await cell.dispatchEvent('input');
  await p.click('.ad-save .btn-sun'); await p.waitForTimeout(1500);
  const cat = await (await fetch(BASE + 'api/admin?a=cat')).json();
  const g = cat.boats.find(x => /guaripitei/i.test(x.name));
  ok(g && g.hidden && g.price === 400 && g.rp.r5 === 605 && g.rp.r6 === 720 && g.rpH.r5 === 666, 'Guaripitei agregada oculta con rumbos 5 y 6 ($605 y $720)');
  ok(cat.routes.find(r => r.id === 'r5').nm === 38 && cat.routes.find(r => r.id === 'r6').nm === 41, 'Millas del rumbo completo: 38 y 41 MN');
  ok(cat.boats[0].rp.r2 === true, 'Celda con "?" = por confirmar');
  ok(!errs.length, 'Sin errores en el panel ' + errs.join('|'));
  await b.close(); console.log(f ? `\n${f} FALLAS` : '\nTODO OK'); process.exit(f ? 1 : 0);
})();
