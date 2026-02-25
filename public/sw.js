/**
 * PWA Service Worker v2
 *
 * Optimized strategy:
 * - Network-First for HTML/Navigation to prevent stale UI
 * - Cache-First for static assets and data
 */

const CACHE_NAME = 'tw-stock-terminal-v3';
const ASSETS_TO_CACHE = ['/', '/manifest.json'];

self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(ASSETS_TO_CACHE);
        })()
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
            // Take control of all open clients immediately
            return self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Navigation Requests (HTML): Network-First
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, response.clone());
                    return response;
                } catch {
                    return (await caches.match(request)) || (await caches.match('/'));
                }
            })()
        );
        return;
    }

    // 2. Data and Assets: Cache-First
    event.respondWith(
        (async () => {
            const response = await caches.match(request);
            if (response) return response;

            const fetchResponse = await fetch(request);
            // Cache data files and images dynamically
            if (
                url.pathname.includes('/data/') ||
                url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)
            ) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
        })()
    );
});
