/**
 * Technical Indicators Utility
 * 
 * Calculates common technical analysis indicators:
 * - Moving Averages (SMA, EMA)
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 */

export interface PriceData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface IndicatorPoint {
    time: string;
    value: number;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: PriceData[], period: number): IndicatorPoint[] {
    const result: IndicatorPoint[] = [];

    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
        result.push({
            time: data[i].time,
            value: parseFloat((sum / period).toFixed(2))
        });
    }

    return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: PriceData[], period: number): IndicatorPoint[] {
    const result: IndicatorPoint[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first EMA value
    let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;

    for (let i = period - 1; i < data.length; i++) {
        if (i === period - 1) {
            // First value is SMA
            result.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
        } else {
            ema = (data[i].close - ema) * multiplier + ema;
            result.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
        }
    }

    return result;
}

/**
 * RSI (Relative Strength Index)
 */
export function calculateRSI(data: PriceData[], period: number = 14): IndicatorPoint[] {
    const result: IndicatorPoint[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // First RSI value
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < data.length; i++) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        result.push({
            time: data[i].time,
            value: parseFloat(rsi.toFixed(2))
        });

        // Update averages
        avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    }

    return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
    data: PriceData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): {
    macd: IndicatorPoint[];
    signal: IndicatorPoint[];
    histogram: IndicatorPoint[];
} {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // MACD Line = Fast EMA - Slow EMA
    const macdLine: IndicatorPoint[] = [];
    const offset = slowPeriod - fastPeriod;

    for (let i = 0; i < slowEMA.length; i++) {
        const fastValue = fastEMA[i + offset]?.value;
        const slowValue = slowEMA[i]?.value;

        if (fastValue !== undefined && slowValue !== undefined) {
            macdLine.push({
                time: slowEMA[i].time,
                value: parseFloat((fastValue - slowValue).toFixed(4))
            });
        }
    }

    // Signal Line = EMA of MACD Line
    const signalData = macdLine.map(d => ({
        time: d.time,
        open: d.value,
        high: d.value,
        low: d.value,
        close: d.value,
        volume: 0
    }));

    const signalLine = calculateEMA(signalData, signalPeriod);

    // Histogram = MACD - Signal
    const histogram: IndicatorPoint[] = [];
    const signalOffset = signalPeriod - 1;

    for (let i = signalOffset; i < macdLine.length; i++) {
        const macdValue = macdLine[i].value;
        const signalValue = signalLine[i - signalOffset]?.value;

        if (signalValue !== undefined) {
            histogram.push({
                time: macdLine[i].time,
                value: parseFloat((macdValue - signalValue).toFixed(4))
            });
        }
    }

    return {
        macd: macdLine,
        signal: signalLine,
        histogram
    };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
    data: PriceData[],
    period: number = 20,
    stdDev: number = 2
): {
    upper: IndicatorPoint[];
    middle: IndicatorPoint[];
    lower: IndicatorPoint[];
} {
    const middle = calculateSMA(data, period);
    const upper: IndicatorPoint[] = [];
    const lower: IndicatorPoint[] = [];

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
        const avg = slice.reduce((a, b) => a + b, 0) / period;

        const variance = slice.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / period;
        const std = Math.sqrt(variance);

        upper.push({
            time: data[i].time,
            value: parseFloat((avg + std * stdDev).toFixed(2))
        });

        lower.push({
            time: data[i].time,
            value: parseFloat((avg - std * stdDev).toFixed(2))
        });
    }

    return { upper, middle, lower };
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(data: PriceData[]): IndicatorPoint[] {
    const result: IndicatorPoint[] = [];
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const d of data) {
        const typicalPrice = (d.high + d.low + d.close) / 3;
        cumulativeTPV += typicalPrice * d.volume;
        cumulativeVolume += d.volume;

        const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
        result.push({
            time: d.time,
            value: parseFloat(vwap.toFixed(2))
        });
    }

    return result;
}
