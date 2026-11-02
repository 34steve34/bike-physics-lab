const CACHE='bike-physics-lab-__BUILD__';
const ASSETS=['./','./index.html','./style.css','./app.js?v=0.1.3','./input.js','./presentation.js','./bike-drawing.js?v=0.1.3','./core.mjs?v=0.1.3','./core.wasm?v=0.1.3','./manifest.webmanifest','./icon.svg','./LICENSE.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bike-physics-lab-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(e.request);if(cached)return cached;
    return fetch(e.request);
  }));
});
