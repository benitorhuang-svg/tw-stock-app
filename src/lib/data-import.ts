/**
 * 歷史資料匯入
 * 支援 CSV 格式匯入股價資料
 */

import { batchInsert, saveDatabase } from './database';

export interface ImportResult {
    success: boolean;
    imported: number;
    errors: string[];
}

/**
 * 匯入股價 CSV
 * 支援格式：日期,開盤,最高,最低,收盤,成交量
 */
export async function importPriceCSV(file: File, symbol: string): Promise<ImportResult> {
    const result: ImportResult = {
        success: false,
        imported: 0,
        errors: [],
    };

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
            result.errors.push('檔案內容不足');
            return result;
        }

        // 解析標題
        const headers = lines[0]
            .toLowerCase()
            .split(',')
            .map(h => h.trim());
        const dateIdx = findColumnIndex(headers, ['date', '日期', 'time']);
        const openIdx = findColumnIndex(headers, ['open', '開盤', '開盤價']);
        const highIdx = findColumnIndex(headers, ['high', '最高', '最高價']);
        const lowIdx = findColumnIndex(headers, ['low', '最低', '最低價']);
        const closeIdx = findColumnIndex(headers, ['close', '收盤', '收盤價']);
        const volumeIdx = findColumnIndex(headers, ['volume', '成交量', '成交股數']);

        if (dateIdx === -1 || closeIdx === -1) {
            result.errors.push('找不到必要欄位（日期、收盤）');
            return result;
        }

        // 解析資料
        const rows: any[][] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;

            try {
                const date = parseDate(values[dateIdx]);
                const close = parseNumber(values[closeIdx]);

                if (!date || isNaN(close)) {
                    result.errors.push(`第 ${i + 1} 行：格式錯誤`);
                    continue;
                }

                rows.push([
                    symbol,
                    date,
                    openIdx >= 0 ? parseNumber(values[openIdx]) : close,
                    highIdx >= 0 ? parseNumber(values[highIdx]) : close,
                    lowIdx >= 0 ? parseNumber(values[lowIdx]) : close,
                    close,
                    volumeIdx >= 0 ? parseNumber(values[volumeIdx]) : 0,
                    0, // turnover
                ]);
            } catch (e) {
                result.errors.push(`第 ${i + 1} 行：${e}`);
            }
        }

        if (rows.length === 0) {
            result.errors.push('沒有有效資料');
            return result;
        }

        // 寫入資料庫
        await batchInsert(
            'daily_prices',
            ['symbol', 'date', 'open', 'high', 'low', 'close', 'volume', 'turnover'],
            rows
        );

        result.success = true;
        result.imported = rows.length;
    } catch (e) {
        result.errors.push(`匯入失敗：${e}`);
    }

    return result;
}

/**
 * 匯入股利 CSV
 */
export async function importDividendCSV(file: File, symbol: string): Promise<ImportResult> {
    const result: ImportResult = {
        success: false,
        imported: 0,
        errors: [],
    };

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
            result.errors.push('檔案內容不足');
            return result;
        }

        const headers = lines[0]
            .toLowerCase()
            .split(',')
            .map(h => h.trim());
        const yearIdx = findColumnIndex(headers, ['year', '年度', '年份']);
        const cashIdx = findColumnIndex(headers, ['cash', '現金股利', '現金']);
        const stockIdx = findColumnIndex(headers, ['stock', '股票股利', '股票']);

        if (yearIdx === -1 || cashIdx === -1) {
            result.errors.push('找不到必要欄位（年度、現金股利）');
            return result;
        }

        const rows: any[][] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;

            const year = parseInt(values[yearIdx]);
            const cash = parseNumber(values[cashIdx]);
            const stock = stockIdx >= 0 ? parseNumber(values[stockIdx]) : 0;

            if (isNaN(year) || isNaN(cash)) {
                result.errors.push(`第 ${i + 1} 行：格式錯誤`);
                continue;
            }

            rows.push([symbol, year, cash, stock, cash + stock]);
        }

        if (rows.length === 0) {
            result.errors.push('沒有有效資料');
            return result;
        }

        await batchInsert(
            'dividends',
            ['symbol', 'year', 'cash_dividend', 'stock_dividend', 'total_dividend'],
            rows
        );

        result.success = true;
        result.imported = rows.length;
    } catch (e) {
        result.errors.push(`匯入失敗：${e}`);
    }

    return result;
}

// === 輔助函式 ===

function findColumnIndex(headers: string[], names: string[]): number {
    for (const name of names) {
        const idx = headers.findIndex(h => h.includes(name));
        if (idx >= 0) return idx;
    }
    return -1;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseNumber(value: string): number {
    return parseFloat(value.replace(/,/g, ''));
}

function parseDate(value: string): string | null {
    // 支援多種格式
    const formats = [
        /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // 2024/01/15
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // 01/15/2024
    ];

    for (const regex of formats) {
        const match = value.match(regex);
        if (match) {
            const year = match[1].length === 4 ? match[1] : match[3];
            const month = match[1].length === 4 ? match[2] : match[1];
            const day = match[1].length === 4 ? match[3] : match[2];
            return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
        }
    }
    return null;
}
