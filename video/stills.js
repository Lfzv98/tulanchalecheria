// Fotogramas del carrusel de la portada: horizontal 3840x2160 (escritorio) y vertical 2160x3840 (celular)
const { chromium } = require('playwright'); const fs = require('fs');
const SETS = { land: 'w=1920&h=1080&s=2&hz=.5&by=.6&bx=.53&sc=.48', port: 'w=1080&h=1920&s=2&hz=.27&by=.37&bx=.2' };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  fs.mkdirSync(__dirname + '/stills', { recursive: true });
  for (const [set, q] of Object.entries(SETS)) for (const k of ['amanecer', 'mediodia', 'tarde', 'atardecer']) {
    await p.goto('file://' + __dirname + '/scene2.html?' + k + '&' + q); await p.waitForTimeout(200);
    const d = await p.evaluate(() => frame(37, .95));
    fs.writeFileSync(`${__dirname}/stills/${k}-${set}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close(); console.log('ok'); })();
