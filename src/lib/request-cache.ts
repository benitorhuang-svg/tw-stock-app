/**
 * Request Deduplication & Caching Layer
 * 
 * Prevents duplicate concurrent requests for the same URL
 * Caches responses for a configurable TTL
 */

interface CacheEntry {
    promise: Promise<any>;
    timestamp: number;
    ttl: number;
}

const requestCache = new Map<string, CacheEntry>();

/**
 * Execute a function with request caching
 * If multiple calls are made to the same key, all will share the first promise
 * @param key - Cache key (typically the fetch URL)
 * @param fn - Async function to execute
 * @param ttl - Time to live in milliseconds (default: 30000 = 30 seconds)
 */
export function withRequestCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 30000
): Promise<T> {
    const now = Date.now();
    const cached = requestCache.get(key);

    // Return cached promise if still valid
    if (cached && (now - cached.timestamp) < cached.ttl) {
        return cached.promise;
    }

    // Clear expired entry
    if (cached) {
        requestCache.delete(key);
    }

    // Create new promise and cache it
    const promise = fn();
    
    requestCache.set(key, {
        promise,
        timestamp: now,
        ttl
    });

    // Clean up cache entry after TTL expires
    setTimeout(() => {
        const entry = requestCache.get(key);
        if (entry && (Date.now() - entry.timestamp) >= entry.ttl) {
            requestCache.delete(key);
        }
    }, ttl + 100);

    return promise;
}

/**
 * Clear all cached requests
 */
export function clearRequestCache(): void {
    requestCache.clear();
}

/**
 * Clear cached request by key
 */
export function clearCacheByKey(key: string): void {
    requestCache.delete(key);
}

/**
 * Get cache size for debugging
 */
export function getCacheSize(): number {
    return requestCache.size;
}
