// Video del dron en el hero: arranca solo, en bucle, en celular y escritorio, y no tapa ni rompe lo demás.
// Correr con el servidor estático en 8765 (python3 -m http.server 8765 desde dist).
// Nota: el Chromium de Playwright no trae H.264, así que aquí reproduce el WebM; Safari y Chrome usan el MP4 (primera fuente).
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
for (const [n, d] of [['iPhone 13', devices['iPhone 13']], ['Galaxy S9+', devices['Galaxy S9+']], ['Pixel 7 apaisado', devices['Pixel 7 landscape']], ['Escritorio 1366', { viewport: { width: 1366, height: 800 } }], ['Escritorio 2560', { viewport: { width: 2560, height: 1440 } }], ['Reducir movimiento', { ...devices['iPhone 13'], reducedMotion: 'reduce' }]]) {
  const c = await b.newContext({ locale: 'es-VE', ...d }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(3000);
  const st = await p.evaluate(() => { const v = document.querySelector('#hero-vid'); return { has: !!v, auto: v && v.autoplay, muted: v && v.muted, loop: v && v.loop, inline: v && v.playsInline, src: v && v.currentSrc.split('/').pop(), t: v ? v.currentTime : 0, paused: v && v.paused, w: v ? v.videoWidth : 0, on: document.querySelector('#hero-reel').classList.contains('vid-on'), op: v ? getComputedStyle(v).opacity : '0' }; });
  ok(st.has && st.auto && st.muted && st.loop && st.inline, `${n}: el video está en el hero con autoplay, muted, loop y playsinline`);
  ok(st.src && st.src.startsWith('hero2-1080') && st.w >= 1080, `${n}: usa el video 1080p nítido (${st.src}, ${st.w}px)`);
  ok(!st.paused && st.t > .5 && st.on && +st.op > .9, `${n}: el video rueda y se ve encima del poster (t=${st.t.toFixed(1)}s)`);
  // se pausa al salir de la portada y sigue al volver
  await p.evaluate(() => { location.hash = 'playas'; }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#hero-vid').paused), `${n}: en otra sección el video se pausa`);
  await p.evaluate(() => { location.hash = 'inicio'; }); await p.waitForTimeout(900);
  ok(await p.evaluate(() => !document.querySelector('#hero-vid').paused), `${n}: al volver a la portada sigue rodando`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(sw <= 0, `${n}: el video no provoca desborde horizontal`);
  ok(!errs.length, `${n}: sin errores ${errs.join('|')}`);
  await c.close();
}
await b.close(); console.log(f ? `\n${f} FALLAS` : '\nTODO OK'); process.exit(f ? 1 : 0); })();
