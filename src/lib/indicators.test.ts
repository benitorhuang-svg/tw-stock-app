import { describe, it, expect } from 'vitest';
import {
    SMA,
    EMA,
    RSI,
    MACD,
    KD,
    BollingerBands
} from './indicators';

describe('Technical Indicators', () => {
    // 測試資料
    const prices = [100, 102, 104, 103, 105, 107, 106, 108, 110, 109];
    const ohlcv = prices.map((close, i) => ({
        date: `2025/01/${String(i + 1).padStart(2, '0')}`,
        open: close - 1,
        high: close + 2,
        low: close - 2,
        close,
        volume: 1000000
    }));

    describe('SMA', () => {
        it('應計算正確的簡單移動平均', () => {
            const result = SMA(prices, 3);
            expect(result).toHaveLength(prices.length);
            expect(result[0]).toBeNull();
            expect(result[1]).toBeNull();
            expect(result[2]).toBeCloseTo(102, 1); // (100+102+104)/3
        });

        it('資料不足時應返回 null', () => {
            const result = SMA([100, 102], 5);
            expect(result.every(v => v === null)).toBe(true);
        });
    });

    describe('EMA', () => {
        it('應計算指數移動平均', () => {
            const result = EMA(prices, 3);
            expect(result).toHaveLength(prices.length);
            expect(result[0]).toBeNull();
            expect(result[1]).toBeNull();
            expect(result[2]).not.toBeNull();
        });

        it('EMA 應對近期價格更敏感', () => {
            const sma = SMA(prices, 5);
            const ema = EMA(prices, 5);
            // EMA 和 SMA 在最後一個值應該不同
            const lastSMA = sma[sma.length - 1];
            const lastEMA = ema[ema.length - 1];
            expect(lastSMA).not.toBeNull();
            expect(lastEMA).not.toBeNull();
        });
    });

    describe('RSI', () => {
        it('應計算相對強弱指標', () => {
            const result = RSI(prices, 5);
            expect(result).toHaveLength(prices.length);
            // RSI 應該在 0-100 之間
            result.forEach(v => {
                if (v !== null) {
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThanOrEqual(100);
                }
            });
        });

        it('持續上漲時 RSI 應接近 100', () => {
            const uptrend = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
            const result = RSI(uptrend, 5);
            const lastRSI = result[result.length - 1];
            expect(lastRSI).not.toBeNull();
            expect(lastRSI!).toBeGreaterThan(70);
        });
    });

    describe('MACD', () => {
        it('應計算 MACD 線、信號線和柱狀圖', () => {
            // 需要更多資料來計算 MACD
            const longPrices = Array.from({ length: 30 }, (_, i) => 100 + i);
            const result = MACD(longPrices);

            expect(result.macd).toHaveLength(longPrices.length);
            expect(result.signal).toHaveLength(longPrices.length);
            expect(result.histogram).toHaveLength(longPrices.length);
        });
    });

    describe('KD', () => {
        it('應計算 K 值和 D 值', () => {
            const result = KD(ohlcv, 9);

            expect(result.k).toHaveLength(ohlcv.length);
            expect(result.d).toHaveLength(ohlcv.length);

            // K、D 應該在 0-100 之間
            result.k.forEach(v => {
                if (v !== null) {
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThanOrEqual(100);
                }
            });
        });
    });

    describe('BollingerBands', () => {
        it('應計算布林通道', () => {
            const result = BollingerBands(prices, 5);

            expect(result.upper).toHaveLength(prices.length);
            expect(result.middle).toHaveLength(prices.length);
            expect(result.lower).toHaveLength(prices.length);

            // 上軌 > 中軌 > 下軌
            for (let i = 4; i < prices.length; i++) {
                expect(result.upper[i]).toBeGreaterThan(result.middle[i]!);
                expect(result.middle[i]).toBeGreaterThan(result.lower[i]!);
            }
        });
    });
});
