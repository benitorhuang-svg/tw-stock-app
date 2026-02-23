import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    exportToCSV,
    exportToJSON,
    exportBlob,
    exportStocksCSV,
    exportPortfolioCSV,
    exportTransactionsCSV,
    parseCSV,
} from './export';

// Mock DOM APIs
let createdElements: any[] = [];
let appendedChildren: any[] = [];
let removedChildren: any[] = [];
let createdObjectURLs: string[] = [];
let revokedURLs: string[] = [];

beforeEach(() => {
    createdElements = [];
    appendedChildren = [];
    removedChildren = [];
    createdObjectURLs = [];
    revokedURLs = [];

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock document.createElement
    vi.stubGlobal('document', {
        createElement: (tag: string) => {
            const el = { tag, href: '', download: '', click: vi.fn() };
            createdElements.push(el);
            return el;
        },
        body: {
            appendChild: (el: any) => appendedChildren.push(el),
            removeChild: (el: any) => removedChildren.push(el),
        },
    });

    // Mock URL.createObjectURL / revokeObjectURL
    vi.stubGlobal('URL', {
        createObjectURL: (blob: Blob) => {
            const url = `blob:mock-${createdObjectURLs.length}`;
            createdObjectURLs.push(url);
            return url;
        },
        revokeObjectURL: (url: string) => {
            revokedURLs.push(url);
        },
    });

    // Mock Blob (happy-dom should provide this, but just in case)
    if (typeof Blob === 'undefined') {
        vi.stubGlobal(
            'Blob',
            class MockBlob {
                parts: any[];
                options: any;
                constructor(parts: any[], options?: any) {
                    this.parts = parts;
                    this.options = options;
                }
            }
        );
    }
});

describe('Export Module', () => {
    // ========================================
    // exportToCSV
    // ========================================

    describe('exportToCSV', () => {
        it('應生成正確的 CSV 並觸發下載', () => {
            const data = [
                { symbol: '2330', name: '台積電', price: 600 },
                { symbol: '2317', name: '鴻海', price: 120 },
            ];
            const columns = [
                { key: 'symbol', label: '代號' },
                { key: 'name', label: '名稱' },
                { key: 'price', label: '股價' },
            ];

            exportToCSV(data, columns, 'test.csv');

            // 應建立 <a> 元素並觸發 click
            expect(createdElements).toHaveLength(1);
            expect(createdElements[0].tag).toBe('a');
            expect(createdElements[0].download).toBe('test.csv');
            expect(createdElements[0].click).toHaveBeenCalled();

            // 應清理 ObjectURL
            expect(revokedURLs).toHaveLength(1);
        });

        it('空資料應不觸發下載', () => {
            exportToCSV([], [{ key: 'a', label: 'A' }]);

            expect(createdElements).toHaveLength(0);
            expect(console.warn).toHaveBeenCalledWith('No data to export');
        });

        it('包含逗號的值應用引號包裹', () => {
            const data = [{ note: 'Hello, World' }];
            const columns = [{ key: 'note', label: 'Note' }];

            exportToCSV(data, columns, 'test.csv');

            expect(createdElements).toHaveLength(1);
        });

        it('包含引號的值應正確跳脫', () => {
            const data = [{ note: 'She said "hello"' }];
            const columns = [{ key: 'note', label: 'Note' }];

            exportToCSV(data, columns, 'test.csv');

            expect(createdElements).toHaveLength(1);
        });

        it('null/undefined 值應輸出為空字串', () => {
            const data = [{ a: null, b: undefined, c: 0 }];
            const columns = [
                { key: 'a', label: 'A' },
                { key: 'b', label: 'B' },
                { key: 'c', label: 'C' },
            ];

            exportToCSV(data, columns, 'test.csv');
            expect(createdElements).toHaveLength(1);
        });

        it('預設檔名應為 export.csv', () => {
            const data = [{ x: 1 }];
            const columns = [{ key: 'x', label: 'X' }];

            exportToCSV(data, columns);

            expect(createdElements[0].download).toBe('export.csv');
        });
    });

    // ========================================
    // exportToJSON
    // ========================================

    describe('exportToJSON', () => {
        it('應生成 JSON 並觸發下載', () => {
            const data = [{ symbol: '2330', price: 600 }];

            exportToJSON(data, 'stock.json');

            expect(createdElements).toHaveLength(1);
            expect(createdElements[0].download).toBe('stock.json');
            expect(createdElements[0].click).toHaveBeenCalled();
        });

        it('預設檔名應為 export.json', () => {
            exportToJSON([]);
            expect(createdElements[0].download).toBe('export.json');
        });
    });

    // ========================================
    // exportBlob
    // ========================================

    describe('exportBlob', () => {
        it('應接受 Blob 並觸發下載', () => {
            const blob = new Blob(['test content'], { type: 'text/plain' });

            exportBlob(blob, 'file.txt');

            expect(createdElements).toHaveLength(1);
            expect(createdElements[0].download).toBe('file.txt');
            expect(createdElements[0].click).toHaveBeenCalled();
            expect(revokedURLs).toHaveLength(1);
        });
    });

    // ========================================
    // exportStocksCSV / exportPortfolioCSV / exportTransactionsCSV
    // ========================================

    describe('exportStocksCSV', () => {
        it('應使用預定義的欄位匯出股票資料', () => {
            const stocks = [
                {
                    symbol: '2330',
                    name: '台積電',
                    price: 600,
                    change: 5,
                    changePercent: 0.8,
                    pe: 28,
                    pb: 6,
                    yield: 3.5,
                    roe: 30,
                    eps: 22,
                    volume: 30000,
                },
            ];

            exportStocksCSV(stocks);

            expect(createdElements).toHaveLength(1);
            const filename = createdElements[0].download as string;
            expect(filename).toMatch(/^stocks_\d{8}\.csv$/);
        });
    });

    describe('exportPortfolioCSV', () => {
        it('應使用預定義的欄位匯出投資組合', () => {
            const portfolio = [
                {
                    symbol: '2330',
                    stock_name: '台積電',
                    shares: 1000,
                    avg_cost: 580,
                    currentPrice: 600,
                    cost: 580000,
                    value: 600000,
                    pl: 20000,
                    plPercent: 3.4,
                },
            ];

            exportPortfolioCSV(portfolio);

            expect(createdElements).toHaveLength(1);
            const filename = createdElements[0].download as string;
            expect(filename).toMatch(/^portfolio_\d{8}\.csv$/);
        });
    });

    describe('exportTransactionsCSV', () => {
        it('應使用預定義的欄位匯出交易紀錄', () => {
            const transactions = [
                {
                    date: '2025-01-15',
                    symbol: '2330',
                    type: 'buy',
                    shares: 1000,
                    price: 580,
                    fee: 826,
                    tax: 0,
                    notes: '逢低買入',
                },
            ];

            exportTransactionsCSV(transactions);

            expect(createdElements).toHaveLength(1);
            const filename = createdElements[0].download as string;
            expect(filename).toMatch(/^transactions_\d{8}\.csv$/);
        });
    });

    // ========================================
    // parseCSV
    // ========================================

    describe('parseCSV (import)', () => {
        function createMockFile(content: string): File {
            return new File([content], 'test.csv', { type: 'text/csv' });
        }

        it('應正確解析簡單 CSV', async () => {
            const file = createMockFile('代號,名稱,股價\n2330,台積電,600\n2317,鴻海,120');

            const result = await parseCSV(file);

            expect(result.headers).toEqual(['代號', '名稱', '股價']);
            expect(result.rows).toHaveLength(2);
            expect(result.rows[0]).toEqual(['2330', '台積電', '600']);
            expect(result.rows[1]).toEqual(['2317', '鴻海', '120']);
        });

        it('應處理帶引號的欄位', async () => {
            const file = createMockFile(
                'Name,Note\nTSMC,"Hello, World"\nHon Hai,"She said ""hi"""'
            );

            const result = await parseCSV(file);

            expect(result.rows[0][1]).toBe('Hello, World');
            expect(result.rows[1][1]).toBe('She said "hi"');
        });

        it('應忽略空行', async () => {
            const file = createMockFile('A,B\n1,2\n\n3,4\n');

            const result = await parseCSV(file);

            expect(result.rows).toHaveLength(2);
        });

        it('空檔案應拋出錯誤', async () => {
            const file = createMockFile('');

            await expect(parseCSV(file)).rejects.toThrow('Empty file');
        });
    });
});
