import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependent modules
vi.mock('./database', () => ({
    getDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('./stock-service', () => ({
    filterStocks: vi.fn().mockResolvedValue([]),
    getStocks: vi.fn().mockResolvedValue([]),
}));

import { screenStocksLocal, getLocalStockCount, clearScreenerCache } from './screener-local';
import { filterStocks, getStocks } from './stock-service';

const mockFilterStocks = filterStocks as ReturnType<typeof vi.fn>;
const mockGetStocks = getStocks as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

beforeEach(() => {
    clearScreenerCache();
    mockFilterStocks.mockReset().mockResolvedValue([]);
    mockGetStocks.mockReset().mockResolvedValue([]);
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
});

describe('Screener Local', () => {

    describe('screenStocksLocal', () => {
        it('本地有資料應直接回傳', async () => {
            mockFilterStocks.mockResolvedValueOnce([
                { symbol: '2330', name: '台積電', pe: 25, pb: 5, dividend_yield: 3, roe: 30 },
            ]);

            const results = await screenStocksLocal({
                pe: { max: 30 },
                dividendYield: { min: 2 }
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].symbol).toBe('2330');
        });

        it('應回傳匹配的策略標籤', async () => {
            mockFilterStocks.mockResolvedValueOnce([
                { symbol: '2330', name: '台積電', pe: 10, pb: 1.2, dividend_yield: 5, roe: 25 },
            ]);

            const results = await screenStocksLocal({
                pe: { max: 15 },
                dividendYield: { min: 3 },
                roe: { min: 20 }
            });

            expect(results[0].matchedStrategies).toContain('低本益比');
            expect(results[0].matchedStrategies).toContain('高殖利率');
            expect(results[0].matchedStrategies).toContain('高ROE');
        });

        it('無匹配策略的股票應被過濾掉', async () => {
            mockFilterStocks.mockResolvedValueOnce([
                { symbol: '2330', name: '台積電', pe: 50, pb: 8, dividend_yield: 0, roe: 5 },
            ]);

            const results = await screenStocksLocal({
                pe: { max: 15 },
                dividendYield: { min: 3 }
            });

            expect(results).toHaveLength(0);
        });

        it('應使用快取避免重複查詢', async () => {
            mockFilterStocks.mockResolvedValue([
                { symbol: '2330', name: '台積電', pe: 10, pb: 1.5, dividend_yield: 5, roe: 25 },
            ]);

            const criteria = { pe: { max: 20 } };

            await screenStocksLocal(criteria);
            await screenStocksLocal(criteria);

            // filterStocks should only be called once (second call uses cache)
            expect(mockFilterStocks).toHaveBeenCalledTimes(1);
        });

        it('clearScreenerCache 後應重新查詢', async () => {
            mockFilterStocks.mockResolvedValue([
                { symbol: '2330', name: '台積電', pe: 10, pb: 1.5, dividend_yield: 5, roe: 25 },
            ]);

            const criteria = { pe: { max: 20 } };
            await screenStocksLocal(criteria);

            clearScreenerCache();
            await screenStocksLocal(criteria);

            expect(mockFilterStocks).toHaveBeenCalledTimes(2);
        });

        it('本地無資料時應 fallback 到 API', async () => {
            mockFilterStocks.mockResolvedValueOnce([]);
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    results: [
                        { symbol: '2330', name: '台積電', matchedStrategies: ['低本益比'] }
                    ]
                })
            });

            const results = await screenStocksLocal({ pe: { max: 15 } });

            expect(results).toHaveLength(1);
            expect(results[0].symbol).toBe('2330');
        });

        it('本地和 API 都失敗應回傳空陣列', async () => {
            mockFilterStocks.mockResolvedValueOnce([]);
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const results = await screenStocksLocal({ pe: { max: 15 } });

            expect(results).toEqual([]);
        });
    });

    describe('getLocalStockCount', () => {
        it('應回傳股票數量', async () => {
            mockGetStocks.mockResolvedValueOnce([
                { symbol: '2330' },
                { symbol: '2317' },
                { symbol: '2454' }
            ]);

            const count = await getLocalStockCount();
            expect(count).toBe(3);
        });

        it('失敗時應回傳 0', async () => {
            mockGetStocks.mockRejectedValueOnce(new Error('error'));

            const count = await getLocalStockCount();
            expect(count).toBe(0);
        });
    });

    describe('clearScreenerCache', () => {
        it('應不報錯', () => {
            expect(() => clearScreenerCache()).not.toThrow();
        });
    });
});
