/**
 * Multi-Layer Cache Management
 * Priority: Memory (fast) → IndexedDB (persistent) → Network (fallback)
 * Implements smart caching strategy for optimal performance
 *
 * @module cache-manager
 * @version 2.0.0 (P0 Multi-layer optimization)
 * @see https://docs.astro.build/en/getting-started/
 */

export interface CacheEntry<T> {
    key: string;
    data: T;
    timestamp: number;
    expiresAt: number;
    metadata?: Record<string, any>;
    level?: 'memory' | 'indexeddb';
}

export interface CacheConfig {
    dbName: string;
    storeName: string;
    version: number;
    ttl?: number; // IndexedDB TTL
    memoryTTL?: number; // Memory cache TTL (default 5 min)
    enableMemory?: boolean; // Enable memory layer (default true)
}

const DEFAULT_CONFIG: CacheConfig = {
    dbName: 'tw-stock-app-cache',
    storeName: 'cache-store',
    version: 1,
    ttl: 7 * 24 * 60 * 60 * 1000, // IndexedDB: 7 days
    memoryTTL: 5 * 60 * 1000, // Memory: 5 minutes (P0 optimization)
    enableMemory: true,
};

// P0 Optimization: In-memory cache layer (fastest)
const memoryCache = new Map<string, CacheEntry<any>>();
let memorySize = 0;
const MAX_MEMORY_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Initialize IndexedDB cache
 */
export async function initCache(config: Partial<CacheConfig> = {}): Promise<IDBDatabase> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(finalConfig.dbName, finalConfig.version);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            console.log('[IndexedDB] Cache initialized:', finalConfig.dbName);
            resolve(db);
        };

        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(finalConfig.storeName)) {
                const store = db.createObjectStore(finalConfig.storeName, { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('expiresAt', 'expiresAt', { unique: false });
                console.log('[IndexedDB] Object store created:', finalConfig.storeName);
            }
        };
    });
}

/**
 * Save data to cache
 */
/**
 * P0 Optimization: Set to both memory and IndexedDB layers
 */
export async function setCache<T>(
    key: string,
    data: T,
    ttl: number = DEFAULT_CONFIG.ttl!,
    config: Partial<CacheConfig> = {}
): Promise<void> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // 1. Set to memory layer (P0: fast write)
    if (finalConfig.enableMemory && finalConfig.memoryTTL) {
        setToMemory(key, data, finalConfig.memoryTTL, config);
    }

    // 2. Set to IndexedDB (P0: persistent backup)
    const db = await initCache(finalConfig);

    return new Promise(resolve => {
        const transaction = db.transaction([finalConfig.storeName], 'readwrite');
        const store = transaction.objectStore(finalConfig.storeName);

        const entry: CacheEntry<T> = {
            key,
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            level: 'indexeddb',
        };

        const request = store.put(entry);

        request.onerror = () => resolve();
        request.onsuccess = () => {
            console.log(`[Cache] Write (Memory + IndexedDB): ${key}`);
            resolve();
        };
    });
}

/**
 * P0 Optimization: Get from memory cache first (fastest)
 */
function getFromMemory<T>(key: string, config: Partial<CacheConfig> = {}): T | null {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    if (!finalConfig.enableMemory) return null;

    const entry = memoryCache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        memorySize -= JSON.stringify(entry.data).length;
        return null;
    }

    return entry.data as T;
}

/**
 * P0 Optimization: Set to memory cache
 */
function setToMemory<T>(
    key: string,
    data: T,
    ttl: number,
    config: Partial<CacheConfig> = {}
): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    if (!finalConfig.enableMemory) return;

    const size = JSON.stringify(data).length;

    // Evict if needed
    if (memorySize + size > MAX_MEMORY_SIZE) {
        memoryCache.clear();
        memorySize = 0;
    }

    const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        level: 'memory',
    };

    memoryCache.set(key, entry);
    memorySize += size;
}

/**
 * P0 Optimization: Retrieve data with memory → IndexedDB fallback
 */
export async function getCache<T>(
    key: string,
    config: Partial<CacheConfig> = {}
): Promise<T | null> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // 1. Try memory first (P0 optimization: fastest)
    const memResult = getFromMemory<T>(key, config);
    if (memResult !== null) {
        return memResult;
    }
    const db = await initCache(finalConfig);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readonly');
        const store = transaction.objectStore(finalConfig.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const entry = request.result as CacheEntry<T> | undefined;

            if (!entry) {
                resolve(null);
                return;
            }

            // Check if expired
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                // Delete expired entry
                deleteCache(key, config).catch(console.error);
                resolve(null);
                return;
            }

            console.log(`[IndexedDB] Retrieved: ${key}`);
            resolve(entry.data);
        };
    });
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string, config: Partial<CacheConfig> = {}): Promise<void> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const db = await initCache(finalConfig);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readwrite');
        const store = transaction.objectStore(finalConfig.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            console.log(`[IndexedDB] Deleted: ${key}`);
            resolve();
        };
    });
}

/**
 * Clear all cache
 */
export async function clearCache(config: Partial<CacheConfig> = {}): Promise<void> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const db = await initCache(finalConfig);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readwrite');
        const store = transaction.objectStore(finalConfig.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            console.log('[IndexedDB] Cache cleared');
            resolve();
        };
    });
}

/**
 * Get all cache entries
 */
export async function getAllCacheEntries(
    config: Partial<CacheConfig> = {}
): Promise<Array<{ key: string; timestamp: number; expiresAt: number }>> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const db = await initCache(finalConfig);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readonly');
        const store = transaction.objectStore(finalConfig.storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const entries = request.result as CacheEntry<any>[];
            const summary = entries.map(e => ({
                key: e.key,
                timestamp: e.timestamp,
                expiresAt: e.expiresAt,
            }));

            console.log(`[IndexedDB] Total entries: ${summary.length}`);
            resolve(summary);
        };
    });
}

/**
 * Clean up expired entries
 */
export async function cleanExpiredCache(config: Partial<CacheConfig> = {}): Promise<number> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const db = await initCache(finalConfig);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readwrite');
        const store = transaction.objectStore(finalConfig.storeName);
        const index = store.index('expiresAt');
        const range = IDBKeyRange.upperBound(Date.now());

        const request = index.openCursor(range);

        request.onerror = () => reject(request.error);
        request.onsuccess = event => {
            const cursor = (event.target as IDBRequest).result;

            if (cursor) {
                cursor.delete();
                deletedCount++;
                cursor.continue();
            } else {
                console.log(`[IndexedDB] Cleaned ${deletedCount} expired entries`);
                resolve(deletedCount);
            }
        };
    });
}

/**
 * Get cache size information
 */
export async function getCacheSize(config: Partial<CacheConfig> = {}): Promise<{
    entries: number;
    estimatedSizeBytes: number;
}> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const db = await initCache(finalConfig);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([finalConfig.storeName], 'readonly');
        const store = transaction.objectStore(finalConfig.storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const entries = request.result as CacheEntry<any>[];

            // Estimate size by JSON serialization
            let estimatedSize = 0;
            entries.forEach(entry => {
                try {
                    const jsonStr = JSON.stringify(entry);
                    estimatedSize += jsonStr.length;
                } catch (e) {
                    console.warn('Failed to estimate size for:', entry.key);
                }
            });

            console.log(`[IndexedDB] Size: ${estimatedSize} bytes, Entries: ${entries.length}`);
            resolve({
                entries: entries.length,
                estimatedSizeBytes: estimatedSize,
            });
        };
    });
}

/**
 * Database cache (for SQLite database blob)
 */
const DB_CACHE_KEY = 'stocks.db';
const DB_CACHE_STORE = 'database-store';
const DB_CACHE_CONFIG: CacheConfig = {
    dbName: 'tw-stock-app-db',
    storeName: DB_CACHE_STORE,
    version: 1,
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days for database
};

/**
 * Save SQLite database to IndexedDB
 */
export async function saveDatabaseCache(buffer: ArrayBuffer): Promise<void> {
    const db = await initCache(DB_CACHE_CONFIG);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(DB_CACHE_STORE);

        const entry: CacheEntry<Uint8Array> = {
            key: DB_CACHE_KEY,
            data: new Uint8Array(buffer),
            timestamp: Date.now(),
            expiresAt: Date.now() + DB_CACHE_CONFIG.ttl!,
        };

        const request = store.put(entry);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            console.log('[IndexedDB] Database cache saved');
            resolve();
        };
    });
}

/**
 * Load SQLite database from IndexedDB
 */
export async function loadDatabaseCache(): Promise<Uint8Array | null> {
    const db = await initCache(DB_CACHE_CONFIG);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CACHE_STORE], 'readonly');
        const store = transaction.objectStore(DB_CACHE_STORE);
        const request = store.get(DB_CACHE_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const entry = request.result as CacheEntry<Uint8Array> | undefined;

            if (!entry) {
                resolve(null);
                return;
            }

            // Check if expired
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                deleteCache(DB_CACHE_KEY, DB_CACHE_CONFIG).catch(console.error);
                resolve(null);
                return;
            }

            console.log('[IndexedDB] Database cache loaded');
            resolve(entry.data);
        };
    });
}

/**
 * Clear database cache
 */
export async function clearDatabaseCache(): Promise<void> {
    return deleteCache(DB_CACHE_KEY, DB_CACHE_CONFIG);
}

export default {
    initCache,
    setCache,
    getCache,
    deleteCache,
    clearCache,
    getAllCacheEntries,
    cleanExpiredCache,
    getCacheSize,
    saveDatabaseCache,
    loadDatabaseCache,
    clearDatabaseCache,
};
