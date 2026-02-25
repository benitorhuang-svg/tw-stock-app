/**
 * PWA Service Worker v3 — High-Performance Edition
 *
 * Strategy:
 * - Network-First for HTML/Navigation (prevents stale UI)
 * - Cache-First for static assets (JS/CSS/fonts/images)
 * - Stale-While-Revalidate for data JSON
 * - Aggressive precaching of shell assets
 */

const CACHE_NAME = 'tw-stock-terminal-v4';
const DATA_CACHE = 'tw-stock-data-v1';

// Critical shell assets to precache
const SHELL_ASSETS = ['./', './manifest.json'];

// ── Install: Precache shell ──
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
    );
});

// ── Activate: Clean old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names
                    .filter(n => n !== CACHE_NAME && n !== DATA_CACHE)
                    .map(n => caches.delete(n))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: Strategy router ──
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin
    if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) return;

    // Skip SSE and API POST endpoints
    if (url.pathname.includes('/api/sse/')) return;

    // 1. Navigation (HTML): Network-First with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // 2. Data files (JSON): Stale-While-Revalidate
    if (url.pathname.includes('/data/') || url.pathname.endsWith('.json')) {
        event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
        return;
    }

    // 3. Static assets (JS/CSS/fonts/images): Cache-First
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 4. API GET: Network-First (short TTL)
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Default: Network with cache fallback
    event.respondWith(networkFirst(request));
});

// ── Strategies ──

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || caches.match('/');
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('', { status: 408 });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Revalidate in background regardless
    const fetchPromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    // Return cached immediately if available, else wait for network
    return cached || fetchPromise;
}

function isStaticAsset(pathname) {
    return /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|avif)$/.test(pathname)
        || pathname.includes('/_astro/');
}
