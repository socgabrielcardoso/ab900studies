/* Offline-first shell. Does not intercept external URLs or non-GET requests. */
const CACHE="ab900-quest-shell-v1";
const CORE=["/","/index.html","/src/styles.css","/src/content.js","/src/app.js","/icon.svg","/manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(response=>{if(response.ok&&CORE.includes(new URL(req.url).pathname)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{})}return response}).catch(()=>caches.match(req).then(cached=>cached||caches.match("/index.html"))));
});