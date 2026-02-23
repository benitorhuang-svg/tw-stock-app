/**
 * 財報數據（模擬）
 */

export interface QuarterlyReport {
    symbol: string;
    year: number;
    quarter: number; // 1, 2, 3, 4
    revenue: number; // 營收（百萬）
    revenueYoY: number; // 營收年增率%
    grossProfit: number; // 毛利（百萬）
    grossMargin: number; // 毛利率%
    operatingIncome: number; // 營業利益（百萬）
    operatingMargin: number; // 營業利益率%
    netIncome: number; // 淨利（百萬）
    netMargin: number; // 淨利率%
    eps: number; // 每股盈餘
}

export interface MonthlyRevenue {
    symbol: string;
    year: number;
    month: number;
    revenue: number; // 當月營收（百萬）
    revenueYoY: number; // 年增率%
    revenueMoM: number; // 月增率%
    accumulated: number; // 累計營收（百萬）
    accumulatedYoY: number; // 累計年增率%
}

// 模擬季報資料
export const mockQuarterlyReports: Record<string, QuarterlyReport[]> = {
    '2330': [
        {
            symbol: '2330',
            year: 2024,
            quarter: 4,
            revenue: 868700,
            revenueYoY: 38.8,
            grossProfit: 521220,
            grossMargin: 60.0,
            operatingIncome: 434350,
            operatingMargin: 50.0,
            netIncome: 387650,
            netMargin: 44.6,
            eps: 14.95,
        },
        {
            symbol: '2330',
            year: 2024,
            quarter: 3,
            revenue: 759690,
            revenueYoY: 39.0,
            grossProfit: 448620,
            grossMargin: 59.1,
            operatingIncome: 372250,
            operatingMargin: 49.0,
            netIncome: 325260,
            netMargin: 42.8,
            eps: 12.54,
        },
        {
            symbol: '2330',
            year: 2024,
            quarter: 2,
            revenue: 673510,
            revenueYoY: 40.1,
            grossProfit: 379000,
            grossMargin: 56.3,
            operatingIncome: 303080,
            operatingMargin: 45.0,
            netIncome: 247850,
            netMargin: 36.8,
            eps: 9.56,
        },
        {
            symbol: '2330',
            year: 2024,
            quarter: 1,
            revenue: 592640,
            revenueYoY: 16.5,
            grossProfit: 322820,
            grossMargin: 54.5,
            operatingIncome: 254430,
            operatingMargin: 42.9,
            netIncome: 225490,
            netMargin: 38.0,
            eps: 8.7,
        },
    ],
    '2317': [
        {
            symbol: '2317',
            year: 2024,
            quarter: 4,
            revenue: 1820000,
            revenueYoY: 12.5,
            grossProfit: 127400,
            grossMargin: 7.0,
            operatingIncome: 72800,
            operatingMargin: 4.0,
            netIncome: 54600,
            netMargin: 3.0,
            eps: 3.94,
        },
        {
            symbol: '2317',
            year: 2024,
            quarter: 3,
            revenue: 1690000,
            revenueYoY: 8.2,
            grossProfit: 118300,
            grossMargin: 7.0,
            operatingIncome: 67600,
            operatingMargin: 4.0,
            netIncome: 50700,
            netMargin: 3.0,
            eps: 3.66,
        },
    ],
};

// 模擬月營收
export const mockMonthlyRevenue: Record<string, MonthlyRevenue[]> = {
    '2330': [
        {
            symbol: '2330',
            year: 2025,
            month: 1,
            revenue: 293320,
            revenueYoY: 35.8,
            revenueMoM: 1.2,
            accumulated: 293320,
            accumulatedYoY: 35.8,
        },
        {
            symbol: '2330',
            year: 2024,
            month: 12,
            revenue: 289770,
            revenueYoY: 38.8,
            revenueMoM: 2.5,
            accumulated: 2894300,
            accumulatedYoY: 33.9,
        },
        {
            symbol: '2330',
            year: 2024,
            month: 11,
            revenue: 282710,
            revenueYoY: 34.0,
            revenueMoM: -2.1,
            accumulated: 2604530,
            accumulatedYoY: 33.6,
        },
    ],
};

export function getQuarterlyReports(symbol: string): QuarterlyReport[] {
    return mockQuarterlyReports[symbol] || [];
}

export function getMonthlyRevenue(symbol: string): MonthlyRevenue[] {
    return mockMonthlyRevenue[symbol] || [];
}

export function getLatestQuarter(symbol: string): QuarterlyReport | null {
    const reports = mockQuarterlyReports[symbol];
    return reports?.[0] || null;
}

// 計算 EPS 成長率
export function getEPSGrowth(symbol: string): number | null {
    const reports = getQuarterlyReports(symbol);
    if (reports.length < 2) return null;

    const latest = reports[0].eps;
    const previous = reports[1].eps;

    if (previous === 0) return null;
    return ((latest - previous) / Math.abs(previous)) * 100;
}
