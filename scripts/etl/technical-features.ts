import { MACD, SMA, RSI, Stochastic } from 'technicalindicators';

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

    /**
     * T011: 計算 RSI
     */
    public calculateRSI(data: number[], period: number = 14) {
        if (data.length < period) return new Array(data.length).fill(null);

        const rsi = RSI.calculate({ period, values: data });
        const padding = new Array(period).fill(null);
        return [...padding, ...rsi];
    }

    /**
     * T012: 計算 KD (Stochastic)
     */
    public calculateKD(
        high: number[],
        low: number[],
        close: number[]
    ): { k: (number | null)[]; d: (number | null)[] } {
        const period = 9;
        const signalPeriod = 3;
        if (close.length < period)
            return {
                k: new Array(close.length).fill(null),
                d: new Array(close.length).fill(null),
            };

        const kd = Stochastic.calculate({
            high,
            low,
            close,
            period,
            signalPeriod,
        });

        const padding = new Array(period - 1).fill(null);
        // kd result is an array of objects { k: number, d: number }
        const kValues = [...padding, ...kd.map((v) => v.k)];
        const dValues = [...padding, ...kd.map((v) => v.d)];

        return { k: kValues, d: dValues };
    }
}

export const technicalETL = new TechnicalETL();
