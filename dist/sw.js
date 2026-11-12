const C='tll-a673661a',A=['./','index.html','styles.css?v=a673661a','app.js?v=a673661a','manifest.webmanifest','favicon.png','icons/icon-192.png','icons/logo-128.png','media/poster.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/api/')||u.pathname.includes('/media/hero')||u.pathname.includes('/media/v/'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(n=>{caches.open(C).then(c=>c.put('./',n.clone()));return n}).catch(()=>caches.match('./')));return}
 e.respondWith(caches.match(r).then(h=>{const f=fetch(r).then(n=>{if(n.ok)caches.open(C).then(c=>c.put(r,n.clone()));return n}).catch(()=>h);return h||f}))});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch{d={title:'Tu Lancha Lechería',body:e.data?e.data.text():''}}
 e.waitUntil(self.registration.showNotification(d.title||'Tu Lancha Lechería',{body:d.body||'',tag:d.tag,icon:'icons/icon-192.png',badge:'icons/icon-192.png',data:{url:d.url||'./'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const w of l){if('focus' in w)return w.navigate(u).then(x=>(x||w).focus()).catch(()=>w.focus())}return clients.openWindow(u)}))});
