/**
 * src/utils/technical-indicators.ts
 * Core algorithms for calculating technical analysis indicators.
 */

export interface Candle {
    o: number;
    c: number;
    h: number;
    l: number;
    vol: number;
    bull: boolean;
    date: string;
}

export interface Point {
    x: number;
    y: number;
}

/**
 * Calculate Moving Average (MA) as an SVG Path
 */
export function calcMAPath(
    candles: Candle[],
    days: number,
    gap: number,
    pToY: (p: number) => number
): string {
    const points = candles
        .map((_, i) => {
            if (i < days - 1) return null;
            const avg = candles.slice(i - (days - 1), i + 1).reduce((s, c) => s + c.c, 0) / days;
            return { x: i * gap + gap / 2, y: pToY(avg) };
        })
        .filter(Boolean) as Point[];
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export interface BBandResult {
    x: number;
    upper: number;
    lower: number;
    mid: number;
}

/**
 * Calculate Bollinger Bands (BBands) for charting
 */
export function calcBollingerBands(
    candles: Candle[],
    gap: number,
    pToY: (p: number) => number,
    period = 20,
    stdDev = 2
): BBandResult[] {
    return candles
        .map((_, i) => {
            if (i < period - 1) return null;
            const slice = candles.slice(i - (period - 1), i + 1).map(c => c.c);
            const ma = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((s, c) => s + Math.pow(c - ma, 2), 0) / period;
            const std = Math.sqrt(variance);
            return {
                x: i * gap + gap / 2,
                upper: pToY(ma + std * stdDev),
                lower: pToY(ma - std * stdDev),
                mid: pToY(ma),
            };
        })
        .filter((b): b is BBandResult => b !== null);
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calcRSI(candles: Candle[], period = 14): number[] {
    let gains = 0,
        losses = 0;
    return candles.map((c, i) => {
        if (i === 0) return 50;
        const diff = c.c - candles[i - 1].c;
        const g = Math.max(diff, 0);
        const l = Math.max(-diff, 0);
        if (i <= period) {
            gains += g;
            losses += l;
            return 50;
        }
        gains = (gains * (period - 1) + g) / period;
        losses = (losses * (period - 1) + l) / period;
        const rs = losses === 0 ? 100 : gains / losses;
        return 100 - 100 / (1 + rs);
    });
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calcEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

export interface MACDResult {
    difValues: number[];
    deaValues: number[];
    macdHist: number[];
    macdMax: number;
}

/**
 * Calculate MACD components (DIF, DEA, Histogram)
 */
export function calcMACD(closes: number[], short = 12, long = 26, signal = 9): MACDResult {
    const emaShort = calcEMA(closes, short);
    const emaLong = calcEMA(closes, long);
    const difValues = emaShort.map((e, i) => e - emaLong[i]);
    const deaValues = calcEMA(difValues, signal);
    const macdHist = difValues.map((d, i) => d - deaValues[i]);

    const maxVal = Math.max(
        ...difValues.map(Math.abs),
        ...deaValues.map(Math.abs),
        ...macdHist.map(Math.abs),
        0.1
    );

    return { difValues, deaValues, macdHist, macdMax: maxVal };
}
