import { describe, it, expect } from 'vitest';
import { toCSV } from './csv-export';
import type { ScreenerResult } from './screener';

describe('CSV Export', () => {
    describe('toCSV', () => {
        it('應產生正確的 CSV 標題行', () => {
            const results: ScreenerResult[] = [];
            const csv = toCSV(results);

            expect(csv).toContain('股票代號');
            expect(csv).toContain('股票名稱');
            expect(csv).toContain('符合策略');
            expect(csv).toContain('本益比');
            expect(csv).toContain('股價淨值比');
            expect(csv).toContain('殖利率');
            expect(csv).toContain('ROE');
        });

        it('應正確轉換結果為 CSV 格式', () => {
            const results: ScreenerResult[] = [
                {
                    symbol: '2330',
                    name: '台積電',
                    matchedStrategies: ['低本益比', '高ROE'],
                    fundamentals: { pe: 15.5, pb: 4.2, dividendYield: 2.5, roe: 25 },
                },
                {
                    symbol: '2317',
                    name: '鴻海',
                    matchedStrategies: ['高殖利率'],
                    fundamentals: { pe: 12, pb: 1.2, dividendYield: 6.0, roe: 18 },
                },
            ];

            const csv = toCSV(results);
            const lines = csv.split('\n');

            expect(lines.length).toBe(3); // header + 2 rows
            expect(lines[1]).toContain('2330');
            expect(lines[1]).toContain('台積電');
            expect(lines[1]).toContain('低本益比; 高ROE');
            expect(lines[2]).toContain('2317');
        });

        it('應處理空的 fundamentals', () => {
            const results: ScreenerResult[] = [
                {
                    symbol: '1234',
                    name: '測試股',
                    matchedStrategies: [],
                    fundamentals: undefined,
                },
            ];

            const csv = toCSV(results);
            expect(csv).toContain('1234');
            expect(csv).toContain('測試股');
        });

        it('應處理空結果陣列', () => {
            const csv = toCSV([]);
            const lines = csv.split('\n');

            expect(lines.length).toBe(1); // 只有標題行
        });

        it('應正確格式化數值', () => {
            const results: ScreenerResult[] = [
                {
                    symbol: '2330',
                    name: '台積電',
                    matchedStrategies: [],
                    fundamentals: { pe: 15.123, pb: 4.567, dividendYield: 2.89, roe: 25.5 },
                },
            ];

            const csv = toCSV(results);

            expect(csv).toContain('15.12'); // 2 decimals
            expect(csv).toContain('4.57');
            expect(csv).toContain('2.89');
            expect(csv).toContain('25.50');
        });

        it('應使用逗號分隔欄位', () => {
            const results: ScreenerResult[] = [
                {
                    symbol: '2330',
                    name: '台積電',
                    matchedStrategies: ['低本益比'],
                    fundamentals: { pe: 15, pb: 4, dividendYield: 2, roe: 25 },
                },
            ];

            const csv = toCSV(results);
            const dataLine = csv.split('\n')[1];

            // 每個欄位應被引號包圍
            expect(dataLine).toMatch(/"[^"]*","[^"]*","[^"]*"/);
        });
    });
});
