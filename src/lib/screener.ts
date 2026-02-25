/**
 * 股票篩選器
 * 實作基本面與技術面選股策略
 */

import { SMA, RSI, MACD } from './indicators';

// ================== 型別定義 ==================

export interface Stock {
    symbol: string;
    name: string;
    industry?: string;
    market?: string;
}

export interface FundamentalData {
    symbol: string;
    pe?: number; // 本益比
    pb?: number; // 股價淨值比
    dividendYield?: number; // 殖利率 (%)
    roe?: number; // 股東權益報酬率 (%)
    eps?: number; // 每股盈餘
}

export interface ScreenerCriteria {
    // 基本面
    pe?: { min?: number; max?: number };
    pb?: { min?: number; max?: number };
    dividendYield?: { min?: number; max?: number };
    roe?: { min?: number; max?: number };
    // 技術面
    goldenCross?: boolean;
    rsiOversold?: boolean;
    macdBullish?: boolean;
}

export interface ScreenerResult {
    symbol: string;
    name: string;
    matchedStrategies: string[];
    fundamentals?: FundamentalData;
}

// ================== 基本面篩選 ==================

/**
 * 本益比篩選 (P/E Ratio)
 * @param data 基本面資料
 * @param min 最小值
 * @param max 最大值
 */
export function filterByPE(data: FundamentalData[], min?: number, max?: number): FundamentalData[] {
    return data.filter(d => {
        if (d.pe === undefined || d.pe === null) return false;
        if (d.pe <= 0) return false; // 排除虧損公司
        if (min !== undefined && d.pe < min) return false;
        if (max !== undefined && d.pe > max) return false;
        return true;
    });
}

/**
 * 股價淨值比篩選 (P/B Ratio)
 */
export function filterByPB(data: FundamentalData[], min?: number, max?: number): FundamentalData[] {
    return data.filter(d => {
        if (d.pb === undefined || d.pb === null) return false;
        if (min !== undefined && d.pb < min) return false;
        if (max !== undefined && d.pb > max) return false;
        return true;
    });
}

/**
 * 殖利率篩選
 */
export function filterByDividendYield(
    data: FundamentalData[],
    min?: number,
    max?: number
): FundamentalData[] {
    return data.filter(d => {
        if (d.dividendYield === undefined || d.dividendYield === null) return false;
        if (min !== undefined && d.dividendYield < min) return false;
        if (max !== undefined && d.dividendYield > max) return false;
        return true;
    });
}

/**
 * ROE 篩選
 */
export function filterByROE(
    data: FundamentalData[],
    min?: number,
    max?: number
): FundamentalData[] {
    return data.filter(d => {
        if (d.roe === undefined || d.roe === null) return false;
        if (min !== undefined && d.roe < min) return false;
        if (max !== undefined && d.roe > max) return false;
        return true;
    });
}

// ================== 技術面篩選 ==================

/**
 * 黃金交叉偵測 (MA5 上穿 MA20)
 * @param prices 收盤價陣列（時間由舊到新）
 * @returns 是否發生黃金交叉
 */
export function detectGoldenCross(prices: number[]): boolean {
    if (prices.length < 21) return false;

    const ma5 = SMA(prices, 5);
    const ma20 = SMA(prices, 20);

    const lastIdx = prices.length - 1;
    const prevIdx = lastIdx - 1;

    // 昨天 MA5 <= MA20，今天 MA5 > MA20
    const prev5 = ma5[prevIdx];
    const prev20 = ma20[prevIdx];
    const curr5 = ma5[lastIdx];
    const curr20 = ma20[lastIdx];

    if (prev5 === null || prev20 === null || curr5 === null || curr20 === null) {
        return false;
    }

    return prev5 <= prev20 && curr5 > curr20;
}

/**
 * RSI 超賣反彈偵測
 * @param prices 收盤價陣列
 * @param oversoldThreshold RSI 超賣閾值 (預設 30)
 * @param recoveryThreshold RSI 回升閾值 (預設 35)
 */
export function detectRSIOversoldRebound(
    prices: number[],
    oversoldThreshold: number = 30,
    recoveryThreshold: number = 35
): boolean {
    if (prices.length < 15) return false;

    const rsi = RSI(prices, 14);

    // 找最近 5 天內是否有 RSI < 30，且目前 RSI > 35
    const recent = rsi.slice(-5);
    const wasOversold = recent.some(v => v !== null && v < oversoldThreshold);
    const currentRSI = rsi[rsi.length - 1];

    return wasOversold && currentRSI !== null && currentRSI > recoveryThreshold;
}

/**
 * MACD 翻多偵測 (DIF 上穿 MACD Signal)
 */
export function detectMACDBullish(prices: number[]): boolean {
    if (prices.length < 35) return false;

    const { macd, signal } = MACD(prices);

    const lastIdx = prices.length - 1;
    const prevIdx = lastIdx - 1;

    const prevMACD = macd[prevIdx];
    const prevSignal = signal[prevIdx];
    const currMACD = macd[lastIdx];
    const currSignal = signal[lastIdx];

    if (prevMACD === null || prevSignal === null || currMACD === null || currSignal === null) {
        return false;
    }

    // 昨天 DIF <= Signal，今天 DIF > Signal
    return prevMACD <= prevSignal && currMACD > currSignal;
}

// ================== 綜合篩選 ==================

/**
 * 執行股票篩選
 * @param stocks 股票列表
 * @param fundamentals 基本面資料
 * @param priceData 股價資料 (symbol -> prices[])
 * @param criteria 篩選條件
 */
export function screenStocks(
    stocks: Stock[],
    fundamentals: FundamentalData[],
    priceData: Map<string, number[]>,
    criteria: ScreenerCriteria
): ScreenerResult[] {
    const results: ScreenerResult[] = [];

    // 建立基本面資料索引
    const fundMap = new Map(fundamentals.map(f => [f.symbol, f]));

    for (const stock of stocks) {
        const matchedStrategies: string[] = [];
        const fund = fundMap.get(stock.symbol);

        // 基本面篩選
        if (fund) {
            if (criteria.pe) {
                const passes = filterByPE([fund], criteria.pe.min, criteria.pe.max);
                if (passes.length > 0) matchedStrategies.push('低本益比');
            }
            if (criteria.pb) {
                const passes = filterByPB([fund], criteria.pb.min, criteria.pb.max);
                if (passes.length > 0) matchedStrategies.push('低股價淨值比');
            }
            if (criteria.dividendYield) {
                const passes = filterByDividendYield(
                    [fund],
                    criteria.dividendYield.min,
                    criteria.dividendYield.max
                );
                if (passes.length > 0) matchedStrategies.push('高殖利率');
            }
            if (criteria.roe) {
                const passes = filterByROE([fund], criteria.roe.min, criteria.roe.max);
                if (passes.length > 0) matchedStrategies.push('高ROE');
            }
        }

        // 技術面篩選
        const prices = priceData.get(stock.symbol);
        if (prices && prices.length > 0) {
            if (criteria.goldenCross && detectGoldenCross(prices)) {
                matchedStrategies.push('黃金交叉');
            }
            if (criteria.rsiOversold && detectRSIOversoldRebound(prices)) {
                matchedStrategies.push('RSI超賣反彈');
            }
            if (criteria.macdBullish && detectMACDBullish(prices)) {
                matchedStrategies.push('MACD翻多');
            }
        }

        // 至少符合一個策略
        if (matchedStrategies.length > 0) {
            results.push({
                symbol: stock.symbol,
                name: stock.name,
                matchedStrategies,
                fundamentals: fund,
            });
        }
    }

    // 按符合策略數量排序
    return results.sort((a, b) => b.matchedStrategies.length - a.matchedStrategies.length);
}
