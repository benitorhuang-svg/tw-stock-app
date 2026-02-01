/**
 * PWA Service Worker v2
 * 
 * Optimized strategy: 
 * - Network-First for HTML/Navigation to prevent stale UI
 * - Cache-First for static assets and data
 */

const CACHE_NAME = 'tw-stock-terminal-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
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
        }).then(() => {
            // Take control of all open clients immediately
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Navigation Requests (HTML): Network-First
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Update cache for next time
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(request) || caches.match('/');
                })
        );
        return;
    }

    // 2. Data and Assets: Cache-First
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request).then((fetchResponse) => {
                // Cache data files and images dynamically
                if (url.pathname.includes('/data/') || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, fetchResponse.clone());
                        return fetchResponse;
                    });
                }
                return fetchResponse;
            });
        })
    );
});
