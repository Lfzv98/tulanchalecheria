"""Genera dist/ (sitio para Vercel) y dist/artifact.html (vista previa)."""
import base64, io, json, os, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SITE = 'https://tulanchalecheria.vercel.app'
os.makedirs('dist/icons', exist_ok=True); os.makedirs('dist/media', exist_ok=True)

# ---------- íconos desde el logo oficial ----------
src = Image.open('public/logo-original.png').convert('RGBA')
c = src.crop((20, 40, 940, 960)).convert('RGB')
for s in (192, 512):
    c.resize((s, s), Image.LANCZOS).save(f'dist/icons/icon-{s}.png', optimize=True)
bg = Image.new('RGB', (512, 512), 'white'); bg.paste(c.resize((410, 410), Image.LANCZOS), (51, 51)); bg.save('dist/icons/maskable-512.png', optimize=True)
c.resize((180, 180), Image.LANCZOS).save('dist/icons/apple-touch-icon.png', optimize=True)
c.resize((128, 128), Image.LANCZOS).save('dist/icons/logo-128.png', optimize=True)
c.resize((48, 48), Image.LANCZOS).save('dist/favicon.png', optimize=True)
buf = io.BytesIO(); c.resize((112, 112), Image.LANCZOS).save(buf, 'WEBP', quality=85)
logo_uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---------- video y póster ----------
for f in ('hero-1080.mp4', 'hero-720.mp4', 'hero-1080.webm', 'poster.jpg', 'poster-sm.webp'):
    shutil.copy(f'video/out/{f}', f'dist/media/{f}')

# ---------- imagen para compartir (Open Graph 1200x630) ----------
og = Image.open('video/out/poster.jpg').convert('RGB')
og = og.resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652))
shade = Image.new('L', (1200, 630)); d = ImageDraw.Draw(shade)
for xx in range(1200): d.line([(xx, 0), (xx, 630)], fill=int(210 * max(0, 1 - xx / 760)))
og = Image.composite(Image.new('RGB', (1200, 630), (12, 16, 36)), og, shade)
lg = c.resize((150, 150), Image.LANCZOS); m = Image.new('L', (150, 150), 0); ImageDraw.Draw(m).ellipse((0, 0, 149, 149), fill=255)
og.paste(lg, (70, 70), m)
dr = ImageDraw.Draw(og)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 78)
fr = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
dr.text((70, 270), 'TU LANCHA', font=fb, fill=(255, 255, 255))
dr.text((70, 355), 'LECHERÍA', font=fb, fill=(246, 225, 60))
dr.text((72, 470), 'Lanchas, yates y catamaranes a Mochima', font=fr, fill=(214, 220, 238))
dr.text((72, 512), 'Reserva por WhatsApp · +58 414 308 3864', font=fr, fill=(214, 220, 238))
og.save('dist/og.jpg', quality=86, optimize=True)

# ---------- página ----------
css = open('src/styles.css').read(); body = open('src/body.html').read()
js = '\n'.join(open(f'src/{n}.js').read() for n in ('app', 'features', 'shell', 'admin'))
fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Big+Shoulders+Display:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap">')
title_txt = 'Tu Lancha Lechería · Paseos en lancha y yates a Mochima'
title = f'<title>{title_txt}</title>'
art = f'<title>Tu Lancha Lechería</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n{fonts}\n<style>{css}</style>\n{body.replace("{{LOGO}}", logo_uri)}\n<script>{js}</script>\n'
open('dist/artifact.html', 'w').write(art)

desc = 'Chárters, paseos en lancha, yates y catamaranes con capitán desde Lechería a Mochima y las islas de Anzoátegui. Arma tu salida y reserva por WhatsApp.'
ld = {"@context": "https://schema.org", "@type": "TravelAgency", "name": "Tu Lancha Lechería", "url": SITE + '/', "image": SITE + '/og.jpg', "logo": SITE + '/icons/icon-512.png',
      "telephone": "+584143083864", "areaServed": ["Lechería", "Parque Nacional Mochima", "Anzoátegui"],
      "address": {"@type": "PostalAddress", "addressLocality": "Lechería", "addressRegion": "Anzoátegui", "addressCountry": "VE"},
      "sameAs": ["https://www.instagram.com/tulanchalecheria/", "https://linktr.ee/Tulanchalecheria"]}
head = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}<meta name="description" content="{desc}"><meta name="theme-color" content="#0c1024"><meta name="color-scheme" content="dark">
<link rel="canonical" href="{SITE}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="Tu Lancha Lechería"><meta property="og:title" content="{title_txt}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}/"><meta property="og:image" content="{SITE}/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="es_VE">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title_txt}"><meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="{SITE}/og.jpg">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="favicon.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="preload" as="image" href="media/poster.jpg" fetchpriority="high">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{fonts}<link rel="stylesheet" href="styles.css"></head><body>'''
open('dist/index.html', 'w').write(head + body.replace('{{LOGO}}', 'icons/logo-128.png') + '<script src="app.js" defer></script></body></html>')
open('dist/styles.css', 'w').write(':root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}\n[hidden]{display:none!important}img{max-width:100%}\n' + css)
open('dist/app.js', 'w').write(js)
json.dump({"name": "Tu Lancha Lechería", "short_name": "Tu Lancha", "description": desc, "lang": "es-VE", "start_url": "./", "scope": "./", "display": "standalone",
           "background_color": "#0c1024", "theme_color": "#0c1024",
           "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                     {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
           "shortcuts": [{"name": "Reservar", "url": "./#reservar"}, {"name": "Ver la flota", "url": "./#flota"}, {"name": "Mi viaje", "url": "./#mi-viaje"}]},
          open('dist/manifest.webmanifest', 'w'), ensure_ascii=False, indent=1)
open('dist/sw.js', 'w').write('''const C='tll-v3',A=['./','index.html','styles.css','app.js','manifest.webmanifest','favicon.png','icons/icon-192.png','icons/logo-128.png','media/poster.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/media/hero'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(n=>{caches.open(C).then(c=>c.put('./',n.clone()));return n}).catch(()=>caches.match('./')));return}
 e.respondWith(caches.match(r).then(h=>{const f=fetch(r).then(n=>{if(n.ok)caches.open(C).then(c=>c.put(r,n.clone()));return n}).catch(()=>h);return h||f}))});
''')
open('dist/robots.txt', 'w').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
open('dist/sitemap.xml', 'w').write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{SITE}/</loc><changefreq>weekly</changefreq></url></urlset>\n')
json.dump({"cleanUrls": True, "headers": [
    {"source": "/media/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
    {"source": "/icons/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]},
    {"source": "/(styles.css|app.js)", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]},
    {"source": "/sw.js", "headers": [{"key": "Cache-Control", "value": "no-cache"}]},
    {"source": "/(.*)", "headers": [{"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}, {"key": "X-Frame-Options", "value": "SAMEORIGIN"}]}]},
    open('dist/vercel.json', 'w'), indent=1)
print('artifact', len(art), 'bytes')
