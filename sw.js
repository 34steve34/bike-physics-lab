const CACHE='bike-physics-lab-1f825a05558230191129aa6a4f0b4954d8c68d07';
const ASSETS=['./','./index.html','./style.css?v=0.1.12','./app.js?v=0.1.12','./records.js?v=0.1.12','./input.js','./presentation.js','./bike-drawing.js?v=0.1.12','./core.mjs?v=0.1.12','./core.wasm?v=0.1.12','./manifest.webmanifest','./icon.svg','./LICENSE.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bike-physics-lab-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(e.request);if(cached)return cached;
    return fetch(e.request);
  }));
});
