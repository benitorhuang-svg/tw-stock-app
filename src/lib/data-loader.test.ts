import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    loadStockPrices,
    getAvailableStocks,
    getRecentPrices,
    getPricesInRange,
    calculateReturn,
} from './data-loader';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

const sampleCSV = `Date,Open,High,Low,Close,Volume
2024/01/15,100,105,98,103,50000
2024/01/16,103,108,101,106,60000
2024/01/17,106,110,105,109,55000
2024/01/18,109,112,107,111,65000
2024/01/19,111,114,109,113,70000`;

describe('Data Loader', () => {
    describe('loadStockPrices', () => {
        it('應正確解析 CSV 為價格陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await loadStockPrices('2330');

            expect(result).toHaveLength(5);
            expect(result[0].date).toBe('2024/01/15');
            expect(result[0].open).toBe(100);
            expect(result[0].close).toBe(103);
            expect(result[0].volume).toBe(50000);
        });

        it('404 應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

            const result = await loadStockPrices('9999');

            expect(result).toEqual([]);
        });

        it('fetch 失敗應回傳空陣列', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await loadStockPrices('2330');

            expect(result).toEqual([]);
        });

        it('空 CSV 應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => 'Date,Open,High,Low,Close,Volume',
            });

            const result = await loadStockPrices('2330');
            expect(result).toEqual([]);
        });

        it('應過濾掉 close 為 NaN 的行', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () =>
                    'Date,Open,High,Low,Close,Volume\n2024/01/15,100,105,98,103,50000\n2024/01/16,bad,bad,bad,bad,bad',
            });

            const result = await loadStockPrices('2330');
            expect(result).toHaveLength(1);
        });
    });

    describe('getAvailableStocks', () => {
        it('成功時應回傳 symbol 陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { symbol: '2330', name: '台積電' },
                    { symbol: '2317', name: '鴻海' },
                ],
            });

            const result = await getAvailableStocks();
            expect(result).toEqual(['2330', '2317']);
        });

        it('失敗應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false });

            const result = await getAvailableStocks();
            expect(result).toEqual([]);
        });

        it('fetch 拋出應回傳空陣列', async () => {
            mockFetch.mockRejectedValueOnce(new Error('error'));

            const result = await getAvailableStocks();
            expect(result).toEqual([]);
        });
    });

    describe('getRecentPrices', () => {
        it('應取得最後 N 天', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await getRecentPrices('2330', 3);

            expect(result).toHaveLength(3);
            expect(result[0].date).toBe('2024/01/17'); // 倒數第3筆
            expect(result[2].date).toBe('2024/01/19'); // 最後一筆
        });

        it('預設應取 60 天（但不超過資料量）', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await getRecentPrices('2330');
            expect(result).toHaveLength(5); // 只有 5 筆
        });
    });

    describe('getPricesInRange', () => {
        it('應篩選日期範圍', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await getPricesInRange('2330', '2024/01/16', '2024/01/18');

            expect(result).toHaveLength(3);
            expect(result[0].date).toBe('2024/01/16');
            expect(result[2].date).toBe('2024/01/18');
        });

        it('範圍外無資料應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await getPricesInRange('2330', '2025/01/01', '2025/12/31');
            expect(result).toEqual([]);
        });
    });

    describe('calculateReturn', () => {
        it('應計算期間報酬率', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => sampleCSV,
            });

            const result = await calculateReturn('2330', 5);

            // first close = 103, last close = 113
            // return = (113 - 103) / 103 * 100 ≈ 9.71%
            expect(result).toBeCloseTo(9.71, 1);
        });

        it('資料不足應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () =>
                    'Date,Open,High,Low,Close,Volume\n2024/01/15,100,105,98,103,50000',
            });

            const result = await calculateReturn('2330', 60);
            expect(result).toBeNull();
        });

        it('無資料應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false });

            const result = await calculateReturn('2330', 60);
            expect(result).toBeNull();
        });
    });
});
