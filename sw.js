const CACHE='bike-physics-lab-ca64cd149c3ab1922a7bd57c0ddec0f351239f4e';
const ASSETS=['./','./index.html','./style.css?v=0.1.14','./app.js?v=0.1.14','./records.js?v=0.1.14','./input.js','./presentation.js','./bike-drawing.js?v=0.1.14','./core.mjs?v=0.1.14','./core.wasm?v=0.1.14','./manifest.webmanifest','./icon.svg','./LICENSE.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bike-physics-lab-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(e.request);if(cached)return cached;
    return fetch(e.request);
  }));
});
