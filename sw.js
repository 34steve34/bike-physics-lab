const CACHE='bike-physics-lab-c4a3cf12d2fcd057c559fd8041ed58b9e8b483ef';
const ASSETS=['./','./index.html','./style.css','./app.js?v=0.1.5','./input.js','./presentation.js','./bike-drawing.js?v=0.1.5','./core.mjs?v=0.1.5','./core.wasm?v=0.1.5','./manifest.webmanifest','./icon.svg','./LICENSE.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bike-physics-lab-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(e.request);if(cached)return cached;
    return fetch(e.request);
  }));
});
