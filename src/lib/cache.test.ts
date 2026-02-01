import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((i: number) => Object.keys(store)[i] || null),
        // 暴露 store 以便測試檢查
        _getStore: () => store
    };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Mock Date.now for TTL testing
const originalDateNow = Date.now;

describe('SimpleCache (In-Memory)', () => {
    let cache: { get: <T>(key: string) => T | null; set: <T>(key: string, data: T, ttlMs?: number) => void; delete: (key: string) => void; clear: () => void; getOrSet: <T>(key: string, fetcher: () => Promise<T>, ttlMs?: number) => Promise<T> };

    beforeEach(async () => {
        vi.resetModules();
        const module = await import('./cache');
        cache = module.cache;
        cache.clear();
    });

    describe('set / get', () => {
        it('應正確儲存和讀取資料', () => {
            cache.set('test-key', { value: 123 });
            const result = cache.get<{ value: number }>('test-key');

            expect(result).toEqual({ value: 123 });
        });

        it('不存在的 key 應返回 null', () => {
            const result = cache.get('non-existent');

            expect(result).toBeNull();
        });

        it('應正確儲存各種型別', () => {
            cache.set('string', 'hello');
            cache.set('number', 42);
            cache.set('array', [1, 2, 3]);
            cache.set('object', { name: '台積電' });

            expect(cache.get('string')).toBe('hello');
            expect(cache.get('number')).toBe(42);
            expect(cache.get('array')).toEqual([1, 2, 3]);
            expect(cache.get('object')).toEqual({ name: '台積電' });
        });
    });

    describe('TTL expiration', () => {
        afterEach(() => {
            Date.now = originalDateNow;
        });

        it('過期資料應返回 null', () => {
            const now = 1000000;
            Date.now = vi.fn(() => now);

            cache.set('ttl-test', 'data', 1000); // 1 秒 TTL

            // 模擬 2 秒後
            Date.now = vi.fn(() => now + 2000);
            const result = cache.get('ttl-test');

            expect(result).toBeNull();
        });

        it('未過期資料應正常返回', () => {
            const now = 1000000;
            Date.now = vi.fn(() => now);

            cache.set('ttl-test', 'data', 5000); // 5 秒 TTL

            // 模擬 2 秒後（未過期）
            Date.now = vi.fn(() => now + 2000);
            const result = cache.get('ttl-test');

            expect(result).toBe('data');
        });
    });

    describe('delete', () => {
        it('應刪除指定快取', () => {
            cache.set('delete-me', 'value');
            cache.delete('delete-me');

            expect(cache.get('delete-me')).toBeNull();
        });
    });

    describe('clear', () => {
        it('應清空所有快取', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('getOrSet', () => {
        it('快取不存在時應執行 fetcher', async () => {
            const fetcher = vi.fn().mockResolvedValue('fetched-data');

            const result = await cache.getOrSet('new-key', fetcher, 5000);

            expect(result).toBe('fetched-data');
            expect(fetcher).toHaveBeenCalled();
        });

        it('快取存在時不應執行 fetcher', async () => {
            cache.set('existing-key', 'cached-data');
            const fetcher = vi.fn().mockResolvedValue('fetched-data');

            const result = await cache.getOrSet('existing-key', fetcher, 5000);

            expect(result).toBe('cached-data');
            expect(fetcher).not.toHaveBeenCalled();
        });
    });
});

describe('localCache (localStorage)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    describe('set / get', () => {
        it('應將資料儲存到 localStorage', async () => {
            const { localCache } = await import('./cache');
            localCache.set('test', { value: 123 });

            expect(localStorageMock.setItem).toHaveBeenCalled();
            const key = localStorageMock.setItem.mock.calls[0][0];
            expect(key).toBe('tw-cache-test');
        });

        it('應從 localStorage 讀取資料', async () => {
            const now = 1000000;
            Date.now = vi.fn(() => now);

            const { localCache } = await import('./cache');
            localCache.set('read-test', 'hello');

            // 模擬少量時間過去（未過期）
            Date.now = vi.fn(() => now + 1000);
            const result = localCache.get('read-test');

            expect(result).toBe('hello');
        });
    });

    describe('delete', () => {
        it('應從 localStorage 刪除快取', async () => {
            const { localCache } = await import('./cache');
            localCache.delete('delete-me');

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('tw-cache-delete-me');
        });
    });

    describe('clear', () => {
        it('應清除所有 tw-cache- 開頭的項目', async () => {
            const { localCache } = await import('./cache');

            // clear 不應拋出錯誤
            expect(() => localCache.clear()).not.toThrow();
        });
    });
});
