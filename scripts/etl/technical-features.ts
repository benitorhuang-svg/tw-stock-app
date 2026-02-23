import { MACD, SMA } from 'technicalindicators';

/**
 * M1: Technical Features ETL
 */

export interface KLine {
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
    date: string;
}

export class TechnicalETL {
    /**
     * T009: 計算 MACD
     */
    public calculateMACD(data: number[]) {
        if (data.length < 26) return [];

        const macdInput = {
            values: data,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        };

        return MACD.calculate(macdInput);
    }

    /**
     * T010: 計算 MA
     */
    public calculateMA(data: number[], period: number) {
        if (data.length < period) return new Array(data.length).fill(null);

        const sma = SMA.calculate({ period, values: data });
        // 補齊前面的空值，確保長度一致
        const padding = new Array(period - 1).fill(null);
        return [...padding, ...sma];
    }
}

export const technicalETL = new TechnicalETL();
