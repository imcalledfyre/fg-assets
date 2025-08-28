// sw.js
const CACHE_NAME = 'fyre-games-cache-v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// On install, skip waiting
self.addEventListener('install', event => {
    self.skipWaiting();
    console.log('[SW] Installed');
});

// On activate, claim clients immediately
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
    console.log('[SW] Activated');
});

// Fetch handler
self.addEventListener('fetch', event => {
    const req = event.request;

    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(req).then(cached => {
                if (cached) {
                    const fetchedTime = cached.headers.get('sw-fetched-time');
                    if (!fetchedTime || (Date.now() - Number(fetchedTime)) < MAX_AGE) {
                        console.log('[SW] Cache hit:', req.url);
                        return cached;
                    }
                }

                return fetch(req).then(resp => {
                    if (resp && resp.status === 200) {
                        try {
                            const respClone = resp.clone();
                            const headers = new Headers(respClone.headers);
                            headers.append('sw-fetched-time', Date.now());
                            const responseWithHeader = new Response(respClone.body, {
                                status: respClone.status,
                                statusText: respClone.statusText,
                                headers: headers
                            });
                            cache.put(req, responseWithHeader);
                        } catch(e) {
                            console.warn('[SW] Could not cache (opaque?):', req.url);
                        }
                    }
                    console.log('[SW] Fetched:', req.url);
                    return resp;
                }).catch(() => cached || new Response('Offline', {status: 503}));
            })
        )
    );
});
