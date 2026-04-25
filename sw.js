// Service worker: network-first strategy
// Always tries the network for fresh content, falls back to cache when offline

const CACHE_NAME = 'dwhf-v2';
const ASSETS = [
  './',
  './index.html',
  './icon.png',
  './icon-152.png',
  './icon-167.png',
  './icon-1024.png',
  './apple-touch-icon.png',
  './manifest.json'
];

// Pre-cache core assets on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Clean up old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: always try fresh, cache the response, fall back to cache if offline
self.addEventListener('fetch', e => {
  // Only handle same-origin requests (skip Firebase, fonts, CORS proxy, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Cache the fresh response for offline use
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
