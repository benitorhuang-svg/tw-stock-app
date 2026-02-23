/**
 * 分析工具
 * 相關性分析、風險指標計算
 */

/**
 * 計算兩組資料的相關係數 (Pearson)
 */
export function correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

/**
 * 計算 Beta 值
 * Beta = Cov(stock, market) / Var(market)
 */
export function calculateBeta(stockReturns: number[], marketReturns: number[]): number {
    if (stockReturns.length !== marketReturns.length || stockReturns.length < 2) return 1;

    const n = stockReturns.length;
    const meanStock = stockReturns.reduce((a, b) => a + b, 0) / n;
    const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / n;

    let covariance = 0;
    let variance = 0;

    for (let i = 0; i < n; i++) {
        const stockDiff = stockReturns[i] - meanStock;
        const marketDiff = marketReturns[i] - meanMarket;
        covariance += stockDiff * marketDiff;
        variance += marketDiff * marketDiff;
    }

    if (variance === 0) return 1;
    return covariance / variance;
}

/**
 * 計算標準差
 */
export function standardDeviation(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);

    return Math.sqrt(variance);
}

/**
 * 計算年化波動率
 * @param dailyReturns 日報酬率陣列 (百分比)
 */
export function annualizedVolatility(dailyReturns: number[]): number {
    const stdDev = standardDeviation(dailyReturns);
    return stdDev * Math.sqrt(252); // 252 交易日
}

/**
 * 計算夏普比率
 * Sharpe = (Rp - Rf) / σp
 * @param returns 報酬率陣列
 * @param riskFreeRate 無風險利率 (年化)
 */
export function sharpeRatio(returns: number[], riskFreeRate: number = 1.5): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 252;
    const volatility = annualizedVolatility(returns);

    if (volatility === 0) return 0;
    return (annualizedReturn - riskFreeRate) / volatility;
}

/**
 * 計算最大回撤
 */
export function maxDrawdown(prices: number[]): {
    maxDrawdown: number;
    peak: number;
    trough: number;
} {
    if (prices.length < 2) return { maxDrawdown: 0, peak: 0, trough: 0 };

    let peak = prices[0];
    let maxDD = 0;
    let peakValue = peak;
    let troughValue = peak;

    for (const price of prices) {
        if (price > peak) {
            peak = price;
        }
        const drawdown = (peak - price) / peak;
        if (drawdown > maxDD) {
            maxDD = drawdown;
            peakValue = peak;
            troughValue = price;
        }
    }

    return {
        maxDrawdown: maxDD * 100,
        peak: peakValue,
        trough: troughValue,
    };
}

/**
 * 計算報酬率
 */
export function calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        const ret = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
        returns.push(ret);
    }
    return returns;
}

/**
 * 風險分析摘要
 */
export interface RiskAnalysis {
    beta: number;
    volatility: number;
    sharpe: number;
    maxDrawdown: number;
    correlation: number;
}

export function analyzeRisk(stockPrices: number[], marketPrices: number[]): RiskAnalysis {
    const stockReturns = calculateReturns(stockPrices);
    const marketReturns = calculateReturns(marketPrices);

    return {
        beta: Math.round(calculateBeta(stockReturns, marketReturns) * 100) / 100,
        volatility: Math.round(annualizedVolatility(stockReturns) * 100) / 100,
        sharpe: Math.round(sharpeRatio(stockReturns) * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown(stockPrices).maxDrawdown * 100) / 100,
        correlation: Math.round(correlation(stockReturns, marketReturns) * 100) / 100,
    };
}
