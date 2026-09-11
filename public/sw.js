// Aaj Kya Bane service worker — offline shell, network-first so deploys update.
const CACHE = 'akb-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // never intercept writes
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // only our own assets
  if (url.pathname.startsWith('/api')) return;          // API always hits the network

  // stale-while-revalidate: show the cached shell instantly (fast even on a cold
  // start), and refresh the cache in the background for next time.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); return res; })
        .catch(() => cached || caches.match('/index.html'));
      return cached || network;
    })
  );
});
