import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database instance - 定義在 vi.mock 之前供 class 內使用
const dbMock = {
    run: vi.fn(),
    exec: vi.fn(() => []),
    export: vi.fn(() => new Uint8Array([1, 2, 3])),
    close: vi.fn(),
    getRowsModified: vi.fn(() => 1),
    prepare: vi.fn(() => ({
        run: vi.fn(),
        free: vi.fn(),
    })),
};

// Mock sql.js with proper class constructor
vi.mock('sql.js', () => {
    return {
        default: vi.fn(() =>
            Promise.resolve({
                Database: class MockDatabase {
                    run = dbMock.run;
                    exec = dbMock.exec;
                    export = dbMock.export;
                    close = dbMock.close;
                    getRowsModified = dbMock.getRowsModified;
                    prepare = dbMock.prepare;
                },
            })
        ),
    };
});

// Mock IndexedDB
const mockIDBStore = {
    get: vi.fn(),
    put: vi.fn(),
};

const mockIDBTransaction = {
    objectStore: vi.fn(() => mockIDBStore),
};

const mockIDBDatabase = {
    transaction: vi.fn(() => mockIDBTransaction),
    objectStoreNames: { contains: vi.fn(() => true) },
    createObjectStore: vi.fn(),
};

const mockIDBRequest = {
    result: mockIDBDatabase,
    error: null,
    onerror: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
    onupgradeneeded: null as ((event: unknown) => void) | null,
};

// IndexedDB mock
const mockIndexedDB = {
    open: vi.fn(() => {
        setTimeout(() => {
            if (mockIDBRequest.onsuccess) {
                mockIDBRequest.onsuccess();
            }
        }, 0);
        return mockIDBRequest;
    }),
    deleteDatabase: vi.fn(() => {
        const req = {
            onsuccess: null as (() => void) | null,
            onerror: null as (() => void) | null,
        };
        setTimeout(() => {
            if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
    }),
};

vi.stubGlobal('indexedDB', mockIndexedDB);
vi.stubGlobal('window', undefined);

describe('Database Module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // 重置 store mock
        mockIDBStore.get.mockImplementation(() => {
            const req = {
                result: null,
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
            };
            setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
        });
        mockIDBStore.put.mockImplementation(() => {
            const req = {
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
            };
            setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getDatabase', () => {
        it('應返回資料庫實例', async () => {
            const { getDatabase } = await import('./database');
            const db = await getDatabase();
            expect(db).toBeDefined();
        });

        it('第二次呼叫應返回同一實例（單例模式）', async () => {
            const { getDatabase } = await import('./database');
            const db1 = await getDatabase();
            const db2 = await getDatabase();
            expect(db1).toBe(db2);
        });
    });

    describe('query', () => {
        it('查詢無結果時應返回空陣列', async () => {
            dbMock.exec.mockReturnValue([
                // @ts-ignore
            ]);

            const { query } = await import('./database');
            const result = await query('SELECT * FROM stocks');

            expect(result).toEqual([]);
        });

        it('應將結果轉換為物件陣列', async () => {
            dbMock.exec.mockReturnValue([
                // @ts-ignore

                {
                    columns: ['symbol', 'name'],
                    values: [
                        ['2330', '台積電'],
                        ['2317', '鴻海'],
                    ],
                },
            ]);

            const { query } = await import('./database');
            const result = await query('SELECT * FROM stocks');

            expect(result).toEqual([
                { symbol: '2330', name: '台積電' },
                { symbol: '2317', name: '鴻海' },
            ]);
        });
    });

    describe('execute', () => {
        it('應執行 SQL 並返回影響的行數', async () => {
            dbMock.getRowsModified.mockReturnValue(1);

            const { execute } = await import('./database');
            const rowsModified = await execute('INSERT INTO stocks (symbol, name) VALUES (?, ?)', [
                '2330',
                '台積電',
            ]);

            expect(rowsModified).toBe(1);
            expect(dbMock.run).toHaveBeenCalled();
        });
    });

    describe('batchInsert', () => {
        it('應批次插入多筆資料', async () => {
            const mockStmt = { run: vi.fn(), free: vi.fn() };
            dbMock.prepare.mockReturnValue(mockStmt);

            const { batchInsert } = await import('./database');
            await batchInsert(
                'stocks',
                ['symbol', 'name'],
                [
                    ['2330', '台積電'],
                    ['2317', '鴻海'],
                ]
            );

            expect(mockStmt.run).toHaveBeenCalledTimes(2);
            expect(mockStmt.free).toHaveBeenCalled();
        });
    });

    describe('exportDatabase', () => {
        it('應匯出資料庫為 Blob', async () => {
            dbMock.export.mockReturnValue(new Uint8Array([1, 2, 3]));

            const { exportDatabase } = await import('./database');
            const blob = await exportDatabase();

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/x-sqlite3');
        });
    });

    describe('clearDatabase', () => {
        it('應關閉資料庫並刪除 IndexedDB', async () => {
            const { clearDatabase } = await import('./database');
            await clearDatabase();

            expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('tw-stock-db');
        });
    });
});

describe('Schema', () => {
    it('應包含 stocks 表格', async () => {
        const { getDatabase } = await import('./database');
        await getDatabase();

        const runCalls = dbMock.run.mock.calls;
        const hasStocksTable = runCalls.some((call: unknown[]) =>
            (call[0] as string)?.includes('CREATE TABLE IF NOT EXISTS stocks')
        );
        expect(hasStocksTable).toBe(true);
    });

    it('應包含 daily_prices 表格', async () => {
        const { getDatabase } = await import('./database');
        await getDatabase();

        const runCalls = dbMock.run.mock.calls;
        const hasDailyPricesTable = runCalls.some((call: unknown[]) =>
            (call[0] as string)?.includes('CREATE TABLE IF NOT EXISTS daily_prices')
        );
        expect(hasDailyPricesTable).toBe(true);
    });

    it('應包含 portfolio 表格', async () => {
        const { getDatabase } = await import('./database');
        await getDatabase();

        const runCalls = dbMock.run.mock.calls;
        const hasPortfolioTable = runCalls.some((call: unknown[]) =>
            (call[0] as string)?.includes('CREATE TABLE IF NOT EXISTS portfolio')
        );
        expect(hasPortfolioTable).toBe(true);
    });
});
