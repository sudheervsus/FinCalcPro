const CACHE_NAME = 'fincalcpro-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css'
];

// Install Event - Precache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network First for HTML, Cache First for CDNs and Assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Don't cache AdSense or Google Analytics
    if (url.hostname.includes('google') || url.hostname.includes('doubleclick')) {
        return;
    }

    // Cache CDNs (Tailwind, Chart.js, Icons) using Cache-First strategy
    if (url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('jsdelivr.net')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Default strategy: Stale-While-Revalidate for own assets
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => {
                // Ignore network errors on offline
            });
            return cachedResponse || fetchPromise;
        })
    );
});
