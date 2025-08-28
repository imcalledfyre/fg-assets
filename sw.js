// sw.js
const CACHE_NAME = 'fyre-games-cache-v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;

    e.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(req).then(cached => {
                if (cached) {
                    // Only use MAX_AGE for same-origin stuff
                    if (req.url.startsWith(self.location.origin)) {
                        const fetchedTime = cached.headers.get('sw-fetched-time');
                        if (!fetchedTime || (Date.now() - Number(fetchedTime)) < MAX_AGE) {
                            console.log('[SW] Cache hit:', req.url);
                            return cached;
                        }
                    } else {
                        console.log('[SW] Cross-origin cache hit:', req.url);
                        return cached; // jsDelivr hits
                    }
                }

                return fetch(req).then(resp => {
                    if (!resp || resp.status !== 200) return resp;

                    if (resp.type === 'basic') {
                        // Same-origin: add sw-fetched-time
                        const respClone = resp.clone();
                        const headers = new Headers(respClone.headers);
                        headers.append('sw-fetched-time', Date.now());
                        const responseWithHeader = new Response(respClone.body, {
                            status: respClone.status,
                            statusText: respClone.statusText,
                            headers
                        });
                        cache.put(req, responseWithHeader);
                    } else {
                        // Opaque / cross-origin (jsDelivr)
                        cache.put(req, resp.clone());
                    }

                    console.log('[SW] Fetched & cached:', req.url);
                    return resp;
                }).catch(() => cached || new Response('Offline', {status: 503}));
            })
        )
    );
});
