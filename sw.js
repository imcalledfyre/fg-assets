// sw.js
const CACHE_NAME = 'fyre-games-cache-v2';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const isCrossOrigin = !req.url.startsWith(self.location.origin);

    e.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(req).then(cached => {
                if (cached) {
                    // Same-origin: respect MAX_AGE
                    if (!isCrossOrigin) {
                        const fetchedTime = cached.headers.get('sw-fetched-time');
                        if (fetchedTime && (Date.now() - Number(fetchedTime)) < MAX_AGE) {
                            console.log('[SW] Cache hit (same-origin, fresh):', req.url);
                            return cached;
                        }
                    } else {
                        // Cross-origin: always serve cached
                        console.log('[SW] Cross-origin cache hit:', req.url);
                        return cached;
                    }
                }

                // Not cached / stale → fetch
                return fetch(req).then(resp => {
                    if (!resp || resp.status !== 200) return resp;

                    if (!isCrossOrigin && resp.type === 'basic') {
                        // Same-origin: store with timestamp
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
                        // Cross-origin: opaque / CDN → cache aggressively
                        try { cache.put(req, resp.clone()); } 
                        catch(e) { console.warn('[SW] Could not cache (opaque?):', req.url); }
                    }

                    console.log('[SW] Fetched & cached:', req.url);
                    return resp;
                }).catch(() => cached || new Response('Offline', {status: 503}));
            })
        )
    );
});
