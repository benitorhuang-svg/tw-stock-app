import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database module
vi.mock('./database', () => ({
    batchInsert: vi.fn().mockResolvedValue(undefined),
    saveDatabase: vi.fn().mockResolvedValue(undefined),
}));

import { importPriceCSV, importDividendCSV } from './data-import';

function makeFile(content: string, name = 'test.csv'): File {
    return new File([content], name, { type: 'text/csv' });
}

describe('Data Import', () => {

    // ========================================
    // importPriceCSV
    // ========================================

    describe('importPriceCSV', () => {
        it('應正確匯入標準 CSV', async () => {
            const csv = 'Date,Open,High,Low,Close,Volume\n2024/01/15,100,105,98,103,50000\n2024/01/16,103,108,101,106,60000';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
            expect(result.errors).toHaveLength(0);
        });

        it('應支援中文欄位名稱', async () => {
            const csv = '日期,開盤,最高,最低,收盤,成交量\n2024/01/15,100,105,98,103,50000';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);
        });

        it('檔案內容不足應回報錯誤', async () => {
            const csv = 'Date,Close';  // 只有標題，沒有資料行
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.includes('不足'))).toBe(true);
        });

        it('缺少日期欄位應回報錯誤', async () => {
            const csv = 'Open,High,Low,Close\n100,105,98,103';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.includes('必要欄位'))).toBe(true);
        });

        it('缺少收盤價欄位應回報錯誤', async () => {
            const csv = 'Date,Open\n2024/01/15,100';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.includes('必要欄位'))).toBe(true);
        });

        it('僅有日期和收盤也能匯入', async () => {
            const csv = 'Date,Close\n2024/01/15,103\n2024/01/16,106';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
        });

        it('格式錯誤的行應被跳過並記錄', async () => {
            const csv = 'Date,Close\n2024/01/15,103\nbaddate,abc\n2024/01/17,108';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('支援 MM/DD/YYYY 日期格式', async () => {
            const csv = 'Date,Close\n01/15/2024,103';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
        });

        it('支援 YYYY-MM-DD 日期格式', async () => {
            const csv = 'Date,Close\n2024-01-15,103';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
        });

        it('帶千分位逗號的數字應正確解析', async () => {
            const csv = 'Date,Close,Volume\n2024/01/15,"1,050","1,000,000"';
            const file = makeFile(csv);

            const result = await importPriceCSV(file, '2330');

            expect(result.success).toBe(true);
        });
    });

    // ========================================
    // importDividendCSV
    // ========================================

    describe('importDividendCSV', () => {
        it('應正確匯入股利 CSV', async () => {
            const csv = 'Year,Cash,Stock\n2023,5.5,0\n2022,4.8,0.5';
            const file = makeFile(csv);

            const result = await importDividendCSV(file, '2330');

            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
        });

        it('應支援中文欄位', async () => {
            const csv = '年度,現金股利,股票股利\n2023,5.5,0';
            const file = makeFile(csv);

            const result = await importDividendCSV(file, '2330');

            expect(result.success).toBe(true);
        });

        it('缺少必要欄位應回報錯誤', async () => {
            const csv = 'Symbol,Amount\n2330,5.5';
            const file = makeFile(csv);

            const result = await importDividendCSV(file, '2330');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.includes('必要欄位'))).toBe(true);
        });

        it('檔案內容不足應回報錯誤', async () => {
            const csv = 'Year,Cash';  // 只有一行
            const file = makeFile(csv);

            const result = await importDividendCSV(file, '2330');

            expect(result.success).toBe(false);
        });

        it('無股票股利欄位應預設為 0', async () => {
            const csv = 'Year,Cash\n2023,5.5';
            const file = makeFile(csv);

            const result = await importDividendCSV(file, '2330');

            expect(result.success).toBe(true);
        });
    });
});
