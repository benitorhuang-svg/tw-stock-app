import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database module
vi.mock('./database', () => ({
    query: vi.fn(),
    execute: vi.fn(),
    batchInsert: vi.fn(),
    saveDatabase: vi.fn(),
}));

import { query, execute, batchInsert } from './database';

// 取得 mock 函式參考
const mockQuery = query as ReturnType<typeof vi.fn>;
const mockExecute = execute as ReturnType<typeof vi.fn>;
const mockBatchInsert = batchInsert as ReturnType<typeof vi.fn>;

describe('Stock Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ================== 股票基本資料 ==================
    describe('getStocks', () => {
        it('應返回所有股票列表', async () => {
            const mockStocks = [
                { symbol: '2330', name: '台積電', industry: '半導體' },
                { symbol: '2317', name: '鴻海', industry: '電腦及週邊設備' },
            ];
            mockQuery.mockResolvedValue(mockStocks);

            const { getStocks } = await import('./stock-service');
            const result = await getStocks();

            expect(result).toEqual(mockStocks);
            expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stocks ORDER BY symbol');
        });

        it('無股票時應返回空陣列', async () => {
            mockQuery.mockResolvedValue([]);

            const { getStocks } = await import('./stock-service');
            const result = await getStocks();

            expect(result).toEqual([]);
        });
    });

    describe('getStock', () => {
        it('應返回指定股票', async () => {
            const mockStock = { symbol: '2330', name: '台積電' };
            mockQuery.mockResolvedValue([mockStock]);

            const { getStock } = await import('./stock-service');
            const result = await getStock('2330');

            expect(result).toEqual(mockStock);
        });

        it('找不到股票時應返回 null', async () => {
            mockQuery.mockResolvedValue([]);

            const { getStock } = await import('./stock-service');
            const result = await getStock('9999');

            expect(result).toBeNull();
        });
    });

    describe('saveStock', () => {
        it('應儲存股票資料', async () => {
            mockExecute.mockResolvedValue(1);

            const { saveStock } = await import('./stock-service');
            await saveStock({ symbol: '2330', name: '台積電', industry: '半導體' });

            expect(mockExecute).toHaveBeenCalled();
            const callArgs = mockExecute.mock.calls[0];
            expect(callArgs[0]).toContain('INSERT OR REPLACE');
        });
    });

    // ================== 每日行情 ==================
    describe('getDailyPrices', () => {
        it('應返回股票歷史行情', async () => {
            const mockPrices = [
                { symbol: '2330', date: '2025-01-01', close: 600 },
                { symbol: '2330', date: '2025-01-02', close: 605 },
            ];
            mockQuery.mockResolvedValue(mockPrices);

            const { getDailyPrices } = await import('./stock-service');
            const result = await getDailyPrices('2330', 10);

            expect(result).toEqual(mockPrices);
            expect(mockQuery).toHaveBeenCalled();
        });
    });

    describe('getLatestPrice', () => {
        it('應返回最新價格', async () => {
            const mockPrice = { symbol: '2330', date: '2025-01-15', close: 610 };
            mockQuery.mockResolvedValue([mockPrice]);

            const { getLatestPrice } = await import('./stock-service');
            const result = await getLatestPrice('2330');

            expect(result).toEqual(mockPrice);
        });

        it('無資料時返回 null', async () => {
            mockQuery.mockResolvedValue([]);

            const { getLatestPrice } = await import('./stock-service');
            const result = await getLatestPrice('2330');

            expect(result).toBeNull();
        });
    });

    describe('saveDailyPrices', () => {
        it('應批次儲存行情資料', async () => {
            mockBatchInsert.mockResolvedValue(undefined);

            const { saveDailyPrices } = await import('./stock-service');
            await saveDailyPrices([
                {
                    symbol: '2330',
                    date: '2025-01-01',
                    open: 600,
                    high: 605,
                    low: 598,
                    close: 602,
                    volume: 10000,
                },
            ]);

            expect(mockBatchInsert).toHaveBeenCalled();
        });
    });

    // ================== 投資組合 ==================
    describe('getPortfolio', () => {
        it('應返回投資組合', async () => {
            const mockPortfolio = [{ id: 1, symbol: '2330', shares: 100, avg_cost: 500 }];
            mockQuery.mockResolvedValue(mockPortfolio);

            const { getPortfolio } = await import('./stock-service');
            const result = await getPortfolio();

            expect(result).toEqual(mockPortfolio);
        });
    });

    describe('addToPortfolio', () => {
        it('應新增持股並返回 ID', async () => {
            mockExecute.mockResolvedValue(1);

            const { addToPortfolio } = await import('./stock-service');
            const result = await addToPortfolio({
                symbol: '2330',
                shares: 100,
                avg_cost: 500,
            });

            expect(result).toBe(1);
            expect(mockExecute).toHaveBeenCalled();
        });
    });

    describe('removeFromPortfolio', () => {
        it('應刪除持股', async () => {
            mockExecute.mockResolvedValue(1);

            const { removeFromPortfolio } = await import('./stock-service');
            await removeFromPortfolio(1);

            expect(mockExecute).toHaveBeenCalled();
            const callArgs = mockExecute.mock.calls[0];
            expect(callArgs[0]).toContain('DELETE FROM portfolio');
        });
    });

    // ================== 搜尋與篩選 ==================
    describe('searchStocks', () => {
        it('應搜尋股票代號或名稱', async () => {
            const mockResults = [{ symbol: '2330', name: '台積電' }];
            mockQuery.mockResolvedValue(mockResults);

            const { searchStocks } = await import('./stock-service');
            const result = await searchStocks('台積');

            expect(result).toEqual(mockResults);
            expect(mockQuery).toHaveBeenCalled();
        });

        it('空關鍵字應返回空陣列', async () => {
            mockQuery.mockResolvedValue([]);

            const { searchStocks } = await import('./stock-service');
            const result = await searchStocks('');

            expect(result).toEqual([]);
        });
    });

    // ================== 交易紀錄 ==================
    describe('addTransaction', () => {
        it('應新增交易紀錄', async () => {
            mockExecute.mockResolvedValue(1);

            const { addTransaction } = await import('./stock-service');
            const result = await addTransaction({
                symbol: '2330',
                type: 'buy',
                shares: 100,
                price: 500,
                date: '2025-01-15',
            });

            expect(result).toBe(1);
        });
    });

    describe('getTransactions', () => {
        it('應返回所有交易紀錄', async () => {
            const mockTx = [{ id: 1, symbol: '2330', type: 'buy', shares: 100, price: 500 }];
            mockQuery.mockResolvedValue(mockTx);

            const { getTransactions } = await import('./stock-service');
            const result = await getTransactions();

            expect(result).toEqual(mockTx);
        });

        it('可篩選特定股票的交易', async () => {
            mockQuery.mockResolvedValue([]);

            const { getTransactions } = await import('./stock-service');
            await getTransactions('2330');

            const callArgs = mockQuery.mock.calls[0];
            expect(callArgs[0]).toContain('WHERE symbol = ?');
            expect(callArgs[1]).toContain('2330');
        });
    });
});
