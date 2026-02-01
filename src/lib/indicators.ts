/**
 * 技術指標計算函式庫
 * 
 * 包含：MA、RSI、MACD、KD 等常用技術指標
 */

export interface OHLCV {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * 簡單移動平均線 (SMA)
 * @param data 收盤價陣列
 * @param period 週期 (預設 5)
 */
export function SMA(data: number[], period: number = 5): (number | null)[] {
    const result: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(Math.round((sum / period) * 100) / 100);
        }
    }

    return result;
}

/**
 * 指數移動平均線 (EMA)
 * @param data 收盤價陣列
 * @param period 週期 (預設 12)
 */
export function EMA(data: number[], period: number = 12): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [];

    // 第一個 EMA 使用 SMA
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(0);
        } else if (i === period - 1) {
            result.push(Math.round(ema * 100) / 100);
        } else {
            ema = data[i] * k + ema * (1 - k);
            result.push(Math.round(ema * 100) / 100);
        }
    }

    return result;
}

/**
 * 相對強弱指標 (RSI)
 * @param data 收盤價陣列
 * @param period 週期 (預設 14)
 */
export function RSI(data: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // 計算漲跌幅
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // 計算 RSI
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            result.push(null);
        } else {
            const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

            if (avgLoss === 0) {
                result.push(100);
            } else {
                const rs = avgGain / avgLoss;
                const rsi = 100 - (100 / (1 + rs));
                result.push(Math.round(rsi * 100) / 100);
            }
        }
    }

    return result;
}

/**
 * MACD (指數平滑異同移動平均線)
 * @param data 收盤價陣列
 * @param fastPeriod 快線週期 (預設 12)
 * @param slowPeriod 慢線週期 (預設 26)
 * @param signalPeriod 訊號線週期 (預設 9)
 */
export function MACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
    const emaFast = EMA(data, fastPeriod);
    const emaSlow = EMA(data, slowPeriod);

    // DIF = EMA12 - EMA26
    const macd = emaFast.map((fast, i) => {
        if (i < slowPeriod - 1) return 0;
        return Math.round((fast - emaSlow[i]) * 100) / 100;
    });

    // Signal = EMA(DIF, 9)
    const signal = EMA(macd, signalPeriod);

    // Histogram = DIF - Signal
    const histogram = macd.map((m, i) => {
        return Math.round((m - signal[i]) * 100) / 100;
    });

    return { macd, signal, histogram };
}

/**
 * KD 指標 (隨機指標)
 * @param ohlcv OHLCV 資料
 * @param period K值週期 (預設 9)
 * @param kSmooth K值平滑 (預設 3)
 * @param dSmooth D值平滑 (預設 3)
 */
export function KD(
    ohlcv: OHLCV[],
    period: number = 9,
    kSmooth: number = 3,
    dSmooth: number = 3
): { k: (number | null)[]; d: (number | null)[] } {
    const rsv: (number | null)[] = [];

    // 計算 RSV
    for (let i = 0; i < ohlcv.length; i++) {
        if (i < period - 1) {
            rsv.push(null);
        } else {
            const slice = ohlcv.slice(i - period + 1, i + 1);
            const highestHigh = Math.max(...slice.map(d => d.high));
            const lowestLow = Math.min(...slice.map(d => d.low));
            const close = ohlcv[i].close;

            if (highestHigh === lowestLow) {
                rsv.push(50);
            } else {
                const value = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
                rsv.push(Math.round(value * 100) / 100);
            }
        }
    }

    // 計算 K 值 (RSV 的 SMA)
    const k: (number | null)[] = [];
    let prevK = 50;

    for (let i = 0; i < rsv.length; i++) {
        if (rsv[i] === null) {
            k.push(null);
        } else {
            const newK = (prevK * (kSmooth - 1) + rsv[i]!) / kSmooth;
            k.push(Math.round(newK * 100) / 100);
            prevK = newK;
        }
    }

    // 計算 D 值 (K 的 SMA)
    const d: (number | null)[] = [];
    let prevD = 50;

    for (let i = 0; i < k.length; i++) {
        if (k[i] === null) {
            d.push(null);
        } else {
            const newD = (prevD * (dSmooth - 1) + k[i]!) / dSmooth;
            d.push(Math.round(newD * 100) / 100);
            prevD = newD;
        }
    }

    return { k, d };
}

/**
 * 布林通道 (Bollinger Bands)
 * @param data 收盤價陣列
 * @param period 週期 (預設 20)
 * @param multiplier 標準差倍數 (預設 2)
 */
export function BollingerBands(
    data: number[],
    period: number = 20,
    multiplier: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const middle = SMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            upper.push(null);
            lower.push(null);
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            const avg = middle[i]!;
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
            const stdDev = Math.sqrt(variance);

            upper.push(Math.round((avg + multiplier * stdDev) * 100) / 100);
            lower.push(Math.round((avg - multiplier * stdDev) * 100) / 100);
        }
    }

    return { upper, middle, lower };
}

/**
 * 計算所有主要技術指標
 * @param ohlcv OHLCV 資料
 */
export function calculateAllIndicators(ohlcv: OHLCV[]) {
    const closes = ohlcv.map(d => d.close);

    return {
        ma5: SMA(closes, 5),
        ma10: SMA(closes, 10),
        ma20: SMA(closes, 20),
        ma60: SMA(closes, 60),
        rsi: RSI(closes),
        macd: MACD(closes),
        kd: KD(ohlcv),
        bollinger: BollingerBands(closes)
    };
}
