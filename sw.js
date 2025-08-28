const CACHE_NAME = 'fyrecache-v1';
const HTML_MAX_AGE = 1 * 24 * 60 * 60 * 1000;     // 1 day
const ASSET_MAX_AGE = 30 * 24 * 60 * 60 * 1000;   // 30 days

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
      const url = new URL(request.url);
      const isHTML = url.pathname.startsWith('/html/') && url.pathname.endsWith('.html');
      const isZonesJS = url.pathname.endsWith('/zones.js');
      const isPNG = url.pathname.endsWith('.png');
      const isUnityWeb = /\.(data|wasm|framework\.js|unityweb)$/.test(url.pathname);

      if (
        (isHTML && age > HTML_MAX_AGE) ||
        (isZonesJS && age > HTML_MAX_AGE) ||
        (isPNG && age > ASSET_MAX_AGE) ||
        (isUnityWeb && age > ASSET_MAX_AGE) ||
        (!isHTML && !isZonesJS && !isPNG && !isUnityWeb && age > ASSET_MAX_AGE)
      ) {
        await cache.delete(request);
      }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHTMLPage = url.pathname.startsWith('/html/') && url.pathname.endsWith('.html');
  const isZonesJS = url.pathname.endsWith('/zones.js');
  const isPNG = url.pathname.endsWith('.png');
  const isUnityWeb = /\.(data|wasm|framework\.js|unityweb)$/.test(url.pathname);

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      try {
        const networkRes = await fetch(event.request);
        if (networkRes && networkRes.status === 200) {
          if (isHTMLPage || isZonesJS || isPNG || isUnityWeb || event.request.destination !== 'document') {
            cache.put(event.request, networkRes.clone());
          }
        }
        return networkRes;
      } catch (err) {
        return cached || Response.error();
      }
    })
  );
});
