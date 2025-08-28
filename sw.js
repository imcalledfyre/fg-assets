const CACHE_NAME = 'skibidi67';
const HTML_MAX_AGE = 1 * 24 * 60 * 60 * 1000;     // 1 day in ms
const ASSET_MAX_AGE = 30 * 24 * 60 * 60 * 1000;   // 30 days in ms

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();

    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();

    for (const request of keys) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      if (!dateHeader) continue;

      const age = now - new Date(dateHeader).getTime();
      const isHTML = request.url.endsWith('.html');

      if ((isHTML && age > HTML_MAX_AGE) || (!isHTML && age > ASSET_MAX_AGE)) {
        await cache.delete(request);
      }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      try {
        const networkRes = await fetch(event.request);
        if (networkRes && networkRes.status === 200) {
          cache.put(event.request, networkRes.clone());
        }
        return networkRes;
      } catch (err) {
        return cached || Response.error();
      }
    })
  );
});
