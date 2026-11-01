/* Offline-first shell. Does not intercept external URLs or non-GET requests. */
const CACHE="ab900-quest-shell-v2";
const CORE=["/","/index.html","/src/styles.css","/src/content.js","/src/app.js","/icon.svg","/manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const req=event.request;
 const url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(response=>{
  // Cache only canonical shell assets. Query variants must not grow the cache.
  if(response.ok&&CORE.includes(url.pathname)&&!url.search){
   const copy=response.clone();
   caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
  }
  return response;
 }).catch(async()=>{
  const cached=await caches.match(req);
  if(cached)return cached;
  // An HTML fallback is appropriate only for page navigation, never for
  // missing JS, CSS, JSON or images (which would otherwise receive HTML).
  if(req.mode==="navigate")return (await caches.match("/index.html"))||Response.error();
  return Response.error();
 }));
});
