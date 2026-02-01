import { describe, it, expect } from 'vitest';
import {
    correlation,
    calculateBeta,
    standardDeviation,
    annualizedVolatility,
    sharpeRatio,
    maxDrawdown,
    calculateReturns,
    analyzeRisk
} from './analysis';

describe('Analysis Functions', () => {
    describe('correlation', () => {
        it('完全正相關應返回 1', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10];
            expect(correlation(x, y)).toBeCloseTo(1, 5);
        });

        it('完全負相關應返回 -1', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [10, 8, 6, 4, 2];
            expect(correlation(x, y)).toBeCloseTo(-1, 5);
        });

        it('無相關應接近 0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [5, 3, 4, 2, 5];
            expect(Math.abs(correlation(x, y))).toBeLessThan(0.5);
        });
    });

    describe('calculateBeta', () => {
        it('與市場完全同步時 Beta 應為 1', () => {
            const stock = [1, 2, 1.5, 2.5, 2];
            const market = [1, 2, 1.5, 2.5, 2];
            expect(calculateBeta(stock, market)).toBeCloseTo(1, 1);
        });

        it('波動較大時 Beta > 1', () => {
            const stock = [2, 4, 3, 5, 4];
            const market = [1, 2, 1.5, 2.5, 2];
            expect(calculateBeta(stock, market)).toBeGreaterThan(1);
        });
    });

    describe('standardDeviation', () => {
        it('應正確計算標準差', () => {
            const data = [2, 4, 4, 4, 5, 5, 7, 9];
            // 標準差約 2.14
            expect(standardDeviation(data)).toBeCloseTo(2.14, 1);
        });

        it('所有值相同時標準差為 0', () => {
            const data = [5, 5, 5, 5, 5];
            expect(standardDeviation(data)).toBe(0);
        });
    });

    describe('annualizedVolatility', () => {
        it('應將日波動率年化', () => {
            const dailyReturns = [1, -0.5, 0.8, -0.3, 0.5];
            const result = annualizedVolatility(dailyReturns);
            // 應該乘以 sqrt(252)
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('sharpeRatio', () => {
        it('正報酬低波動應有較高夏普', () => {
            const goodReturns = [0.5, 0.6, 0.4, 0.5, 0.5];
            const result = sharpeRatio(goodReturns, 1.5);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('maxDrawdown', () => {
        it('應計算最大回撤', () => {
            const prices = [100, 110, 105, 120, 90, 95, 100];
            const result = maxDrawdown(prices);

            // 從 120 跌到 90，回撤 25%
            expect(result.maxDrawdown).toBeCloseTo(25, 0);
            expect(result.peak).toBe(120);
            expect(result.trough).toBe(90);
        });

        it('持續上漲時回撤為 0', () => {
            const prices = [100, 110, 120, 130, 140];
            const result = maxDrawdown(prices);
            expect(result.maxDrawdown).toBe(0);
        });
    });

    describe('calculateReturns', () => {
        it('應計算每日報酬率', () => {
            const prices = [100, 110, 105];
            const returns = calculateReturns(prices);

            expect(returns).toHaveLength(2);
            expect(returns[0]).toBeCloseTo(10, 1); // (110-100)/100 * 100
            expect(returns[1]).toBeCloseTo(-4.55, 1); // (105-110)/110 * 100
        });
    });

    describe('analyzeRisk', () => {
        it('應返回完整風險分析', () => {
            const stockPrices = [100, 105, 102, 108, 104, 110];
            const marketPrices = [1000, 1020, 1010, 1030, 1015, 1035];

            const result = analyzeRisk(stockPrices, marketPrices);

            expect(result).toHaveProperty('beta');
            expect(result).toHaveProperty('volatility');
            expect(result).toHaveProperty('sharpe');
            expect(result).toHaveProperty('maxDrawdown');
            expect(result).toHaveProperty('correlation');
        });
    });
});
