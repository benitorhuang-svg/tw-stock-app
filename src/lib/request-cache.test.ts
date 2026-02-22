import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    withRequestCache,
    clearRequestCache,
    clearCacheByKey,
    getCacheSize
} from './request-cache';

beforeEach(() => {
    clearRequestCache();
    vi.useFakeTimers();
});

describe('Request Cache', () => {

    describe('withRequestCache', () => {
        it('首次呼叫應執行 fetcher', async () => {
            const fetcher = vi.fn().mockResolvedValue('data');

            const result = await withRequestCache('key1', fetcher);

            expect(fetcher).toHaveBeenCalledOnce();
            expect(result).toBe('data');
        });

        it('相同 key 應回傳相同 Promise（去重）', async () => {
            let callCount = 0;
            const fetcher = vi.fn(() => {
                callCount++;
                return Promise.resolve(`call-${callCount}`);
            });

            const p1 = withRequestCache('key1', fetcher);
            const p2 = withRequestCache('key1', fetcher);

            expect(fetcher).toHaveBeenCalledOnce();
            expect(await p1).toBe(await p2);
        });

        it('不同 key 應各自執行', async () => {
            const fetcher1 = vi.fn().mockResolvedValue('a');
            const fetcher2 = vi.fn().mockResolvedValue('b');

            const r1 = await withRequestCache('k1', fetcher1);
            const r2 = await withRequestCache('k2', fetcher2);

            expect(r1).toBe('a');
            expect(r2).toBe('b');
            expect(fetcher1).toHaveBeenCalledOnce();
            expect(fetcher2).toHaveBeenCalledOnce();
        });

        it('TTL 過期後應重新執行', async () => {
            const fetcher = vi.fn()
                .mockResolvedValueOnce('first')
                .mockResolvedValueOnce('second');

            const r1 = await withRequestCache('key1', fetcher, 1000);
            expect(r1).toBe('first');

            // 快進超過 TTL
            vi.advanceTimersByTime(1500);

            const r2 = await withRequestCache('key1', fetcher, 1000);
            expect(r2).toBe('second');
            expect(fetcher).toHaveBeenCalledTimes(2);
        });

        it('TTL 內不應重新執行', async () => {
            const fetcher = vi.fn().mockResolvedValue('cached');

            await withRequestCache('key1', fetcher, 5000);
            vi.advanceTimersByTime(2000);  // 未過期
            await withRequestCache('key1', fetcher, 5000);

            expect(fetcher).toHaveBeenCalledOnce();
        });
    });

    describe('clearRequestCache', () => {
        it('應清空所有快取', async () => {
            await withRequestCache('a', () => Promise.resolve(1));
            await withRequestCache('b', () => Promise.resolve(2));

            expect(getCacheSize()).toBe(2);

            clearRequestCache();

            expect(getCacheSize()).toBe(0);
        });
    });

    describe('clearCacheByKey', () => {
        it('應只清除指定 key', async () => {
            await withRequestCache('a', () => Promise.resolve(1));
            await withRequestCache('b', () => Promise.resolve(2));

            clearCacheByKey('a');

            expect(getCacheSize()).toBe(1);
        });
    });

    describe('getCacheSize', () => {
        it('初始應為 0', () => {
            expect(getCacheSize()).toBe(0);
        });

        it('新增後應正確回報', async () => {
            await withRequestCache('x', () => Promise.resolve(1));
            expect(getCacheSize()).toBe(1);
        });
    });
});
