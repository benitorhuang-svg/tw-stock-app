/**
 * PWA Service Worker
 * 
 * Provides offline support and asset caching.
 */

const CACHE_NAME = 'tw-stock-terminal-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/stocks/',
    '/watchlist/',
    '/portfolio/',
    '/settings/',
    '/manifest.json',
    '/data/stocks.json',
    '/data/latest_prices.json',
    '/data/price_index.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // Cache data files dynamically
                if (event.request.url.includes('/data/') || event.request.url.includes('.png')) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                }
                return fetchResponse;
            });
        }).catch(() => {
            // Offline fallback
            if (event.request.mode === 'navigate') {
                return caches.match('/');
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
