const CACHE_NAME = 'fyrecache-v1';
const MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // skip caching HTML files
  if (url.pathname.endsWith('.html')) return;

  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            cache.put(e.request, networkRes.clone());
          }
          return networkRes;
        }).catch(() => cached); // fallback to cache if offline
        return cached || fetchPromise;
      })
    )
  );
});

// Optional: clear old cache entries after 14 days
self.addEventListener('activate', async () => {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();
  keys.forEach(async (request) => {
    if (request.url.endsWith('.html')) return; // skip HTML
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    if (dateHeader && now - new Date(dateHeader).getTime() > MAX_AGE) {
      cache.delete(request);
    }
  });
});
