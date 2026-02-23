/**
 * CSV 匯出工具
 */

import type { ScreenerResult } from './screener';

/**
 * 將篩選結果轉為 CSV 字串
 */
export function toCSV(results: ScreenerResult[]): string {
    const headers = ['股票代號', '股票名稱', '符合策略', '本益比', '股價淨值比', '殖利率', 'ROE'];

    const rows = results.map(r => [
        r.symbol,
        r.name,
        r.matchedStrategies.join('; '),
        r.fundamentals?.pe?.toFixed(2) ?? '',
        r.fundamentals?.pb?.toFixed(2) ?? '',
        r.fundamentals?.dividendYield?.toFixed(2) ?? '',
        r.fundamentals?.roe?.toFixed(2) ?? '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
}

/**
 * 觸發 CSV 下載
 */
export function downloadCSV(content: string, filename: string = 'screener-results.csv'): void {
    // 加上 BOM 以支援 Excel 中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 匯出篩選結果為 CSV
 */
export function exportToCSV(results: ScreenerResult[], filename?: string): void {
    const csv = toCSV(results);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, filename ?? `選股結果_${date}.csv`);
}
