const CACHE='dachwerk-v20261011';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./dachwerk-logo.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

// PROTOTYP6 cache refresh marker: 2026-10-08-2016

// PROTOTYP7 cache refresh marker: 2026-10-08-2125
