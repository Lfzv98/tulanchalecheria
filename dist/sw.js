const C='tll-11adff9e',A=['./','index.html','styles.css?v=11adff9e','app.js?v=11adff9e','manifest.webmanifest','favicon.png','icons/icon-192.png','icons/logo-128.png','media/poster.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/media/hero'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(n=>{caches.open(C).then(c=>c.put('./',n.clone()));return n}).catch(()=>caches.match('./')));return}
 e.respondWith(caches.match(r).then(h=>{const f=fetch(r).then(n=>{if(n.ok)caches.open(C).then(c=>c.put(r,n.clone()));return n}).catch(()=>h);return h||f}))});
