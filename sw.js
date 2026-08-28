const CACHE_NAME="smkdhab-pwa-v59";
const APP_SHELL=["/","/index.html","/teacher.html","/admin.html","/admin-dashboard.html","/admin-participants.html","/admin-athlete.html","/admin-houses.html","/admin-events.html","/admin-results.html","/admin-reports.html","/admin-import.html","/admin-championship.html","/admin-command-center.html","/style.css","/manifest.webmanifest","/assets/pwa-icon-192.svg","/assets/pwa-icon-512.svg","/assets/pwa-maskable.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=="GET"||url.pathname.startsWith("/api/"))return;
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return r}).catch(()=>caches.match(req).then(c=>c||caches.match("/index.html"))));
    return;
  }
  event.respondWith(caches.match(req).then(c=>c||fetch(req).then(r=>{if(r.ok&&url.origin===self.location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy))}return r})));
});