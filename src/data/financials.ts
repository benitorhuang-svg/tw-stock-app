/**
 * 財報數據 — 讀取 public/data/ 下的真實 JSON 資料
 */
import fs from 'node:fs';
import path from 'node:path';

export interface QuarterlyReport {
    symbol: string;
    year: number;
    quarter: number;
    revenue: number;
    revenueYoY: number;
    grossProfit: number;
    grossMargin: number;
    operatingIncome: number;
    operatingMargin: number;
    netIncome: number;
    netMargin: number;
    eps: number;
}

export interface MonthlyRevenue {
    symbol: string;
    year: number;
    month: number;
    revenue: number;
    revenueYoY: number;
    revenueMoM: number;
    accumulated: number;
    accumulatedYoY: number;
}

// ── Raw JSON types from fetchers ──
interface RawFinancial {
    symbol: string;
    name?: string;
    year: string;
    quarter: string;
    eps: number;
    grossProfit: number;
    operatingIncome: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    netIncome: number;
}

interface RawRevenue {
    symbol: string;
    name?: string;
    month: string; // e.g. "11501" = 民國115年1月
    revenue: number;
    lastMonthRevenue: number;
    lastYearRevenue: number;
    revenueYoY: number;
    cumulativeRevenue: number;
    cumulativeYoY: number;
    note?: string;
}

// ── Lazy-loaded caches ──
let _financials: Map<string, QuarterlyReport[]> | null = null;
let _revenue: Map<string, MonthlyRevenue[]> | null = null;

function loadFinancials(): Map<string, QuarterlyReport[]> {
    if (_financials) return _financials;
    _financials = new Map();
    try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'financials.json');
        const raw: RawFinancial[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const r of raw) {
            const rocYear = parseInt(r.year, 10);
            const report: QuarterlyReport = {
                symbol: r.symbol,
                year: rocYear + 1911,
                quarter: parseInt(r.quarter, 10),
                revenue: 0,
                revenueYoY: 0,
                grossProfit: r.grossProfit,
                grossMargin: r.grossMargin,
                operatingIncome: r.operatingIncome,
                operatingMargin: r.operatingMargin,
                netIncome: r.netIncome,
                netMargin: r.netMargin,
                eps: r.eps,
            };
            const list = _financials.get(r.symbol) || [];
            list.push(report);
            _financials.set(r.symbol, list);
        }
        // Sort each symbol's reports descending by year+quarter
        for (const [, list] of _financials) {
            list.sort((a, b) => b.year * 10 + b.quarter - (a.year * 10 + a.quarter));
        }
    } catch {
        // graceful fallback: empty map
    }
    return _financials;
}

function loadRevenue(): Map<string, MonthlyRevenue[]> {
    if (_revenue) return _revenue;
    _revenue = new Map();
    try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'revenue.json');
        const raw: RawRevenue[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const r of raw) {
            // "month" field: "11501" = 民國115年01月
            const monthStr = r.month;
            const rocYear = parseInt(monthStr.slice(0, -2), 10);
            const monthNum = parseInt(monthStr.slice(-2), 10);
            const entry: MonthlyRevenue = {
                symbol: r.symbol,
                year: rocYear + 1911,
                month: monthNum,
                revenue: r.revenue,
                revenueYoY: r.revenueYoY,
                revenueMoM:
                    r.lastMonthRevenue > 0
                        ? ((r.revenue - r.lastMonthRevenue) / r.lastMonthRevenue) * 100
                        : 0,
                accumulated: r.cumulativeRevenue,
                accumulatedYoY: r.cumulativeYoY,
            };
            const list = _revenue.get(r.symbol) || [];
            list.push(entry);
            _revenue.set(r.symbol, list);
        }
        // Sort descending by year+month
        for (const [, list] of _revenue) {
            list.sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
        }
    } catch {
        // graceful fallback: empty map
    }
    return _revenue;
}

export function getQuarterlyReports(symbol: string): QuarterlyReport[] {
    return loadFinancials().get(symbol) || [];
}

export function getMonthlyRevenue(symbol: string): MonthlyRevenue[] {
    return loadRevenue().get(symbol) || [];
}

export function getLatestQuarter(symbol: string): QuarterlyReport | null {
    const reports = getQuarterlyReports(symbol);
    return reports[0] || null;
}

export function getEPSGrowth(symbol: string): number | null {
    const reports = getQuarterlyReports(symbol);
    if (reports.length < 2) return null;

    const latest = reports[0].eps;
    const previous = reports[1].eps;

    if (previous === 0) return null;
    return ((latest - previous) / Math.abs(previous)) * 100;
}
