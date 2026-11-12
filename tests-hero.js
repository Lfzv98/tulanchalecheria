// Video del dron en el hero: arranca solo, en bucle, con la versión correcta para cada pantalla y sin trabar el giro.
// Correr con el servidor estático en 8765 (python3 -m http.server 8765 desde dist).
// Safari y Chrome usan el MP4 (H.264); el WebM queda de respaldo para navegadores sin H.264.
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
for (const [n, d, want] of [['iPhone 13', devices['iPhone 13'], 'port'], ['Galaxy S9+', devices['Galaxy S9+'], 'port'], ['Pixel 7 apaisado', devices['Pixel 7 landscape'], '1080'], ['Escritorio 1366', { viewport: { width: 1366, height: 800 } }, '1080'], ['Escritorio 2560', { viewport: { width: 2560, height: 1440 }, screen: { width: 2560, height: 1440 } }, '1440'], ['Reducir movimiento', { ...devices['iPhone 13'], reducedMotion: 'reduce' }, 'port']]) {
  const c = await b.newContext({ locale: 'es-VE', ...d }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => { const v = document.querySelector('#hero-vid'); return { auto: v.autoplay, muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.currentSrc.split('/').pop(), t: v.currentTime, paused: v.paused, on: document.querySelector('#hero-reel').classList.contains('vid-on'), op: getComputedStyle(v).opacity }; });
  ok(st.auto && st.muted && st.loop && st.inline, `${n}: video con autoplay, muted, loop y playsinline`);
  ok(st.src.startsWith('hero2-' + want), `${n}: versión ${want} (${st.src})`);
  ok(!st.paused && st.t > .5 && st.on && +st.op > .9, `${n}: el video rueda y se ve (t=${st.t.toFixed(1)}s)`);
  if (want === '1440') ok(await p.evaluate(() => [...document.querySelectorAll('#hero-vid source')].some(s => s.src.endsWith('hero2-1440.mp4'))), `${n}: pantallas grandes reciben el MP4 de 1440p`);
  // se pausa al salir de la portada y sigue al volver
  await p.evaluate(() => { location.hash = 'playas'; }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#hero-vid').paused), `${n}: en otra sección el video se pausa`);
  await p.evaluate(() => { location.hash = 'inicio'; }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !document.querySelector('#hero-vid').paused), `${n}: al volver a la portada sigue rodando`);
  ok(!errs.length, `${n}: sin errores ${errs.join('|')}`);
  await c.close();
}
await b.close(); console.log(f ? `\n${f} FALLAS` : '\nTODO OK'); process.exit(f ? 1 : 0); })();
