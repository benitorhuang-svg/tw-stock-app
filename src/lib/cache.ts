/**
 * 簡易快取層
 * 用於減少對 TWSE API 的重複請求
 */

interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class SimpleCache {
    private cache: Map<string, CacheItem<any>> = new Map();

    /**
     * 取得快取資料
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key);

        if (!item) return null;

        // 檢查是否過期
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    /**
     * 設定快取資料
     * @param key 快取鍵
     * @param data 資料
     * @param ttlMs 存活時間 (毫秒)，預設 5 分鐘
     */
    set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs
        });
    }

    /**
     * 刪除快取
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * 清空所有快取
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * 取得或設定快取
     * 如果快取存在且未過期，返回快取資料
     * 否則執行 fetcher 並快取結果
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlMs: number = 5 * 60 * 1000
    ): Promise<T> {
        const cached = this.get<T>(key);

        if (cached !== null) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }

        console.log(`[Cache] MISS: ${key}`);
        const data = await fetcher();
        this.set(key, data, ttlMs);
        return data;
    }
}

// 匯出單例
export const cache = new SimpleCache();

// LocalStorage 持久化快取（用於較長期的資料）
export const localCache = {
    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(`tw-cache-${key}`);
            if (!item) return null;

            const parsed = JSON.parse(item) as CacheItem<T>;

            if (Date.now() - parsed.timestamp > parsed.ttl) {
                localStorage.removeItem(`tw-cache-${key}`);
                return null;
            }

            return parsed.data;
        } catch {
            return null;
        }
    },

    set<T>(key: string, data: T, ttlMs: number = 60 * 60 * 1000): void {
        try {
            localStorage.setItem(`tw-cache-${key}`, JSON.stringify({
                data,
                timestamp: Date.now(),
                ttl: ttlMs
            }));
        } catch (e) {
            console.warn('[LocalCache] Storage full, clearing old cache');
            // 清除舊快取
            Object.keys(localStorage)
                .filter(k => k.startsWith('tw-cache-'))
                .forEach(k => localStorage.removeItem(k));
        }
    },

    delete(key: string): void {
        localStorage.removeItem(`tw-cache-${key}`);
    },

    clear(): void {
        Object.keys(localStorage)
            .filter(k => k.startsWith('tw-cache-'))
            .forEach(k => localStorage.removeItem(k));
    }
};
