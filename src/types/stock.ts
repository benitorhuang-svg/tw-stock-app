import type { Stock } from './database';
export type { Stock };

export interface StockBasicInfo {
    symbol: string;
    name: string;
    market: string;
}

export interface LatestPriceData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
    pe?: number;
    pb?: number;
    yield?: number;
    revenueYoY?: number;
    eps?: number;
    grossMargin?: number;
    operatingMargin?: number;
    netMargin?: number;
    foreignStreak?: number;
    trustStreak?: number;
    dealerStreak?: number;
}

export interface StockWithDetails extends Stock {
    price: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
    pe: number;
    pb: number;
    yield: number;
    roe: number;
    eps: number;
    revenueYoY: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    foreignStreak: number;
    trustStreak: number;
    dealerStreak: number;
    sector: string;
    lastUpdated?: string;
    date?: string;
}

export type StockFullData = StockWithDetails;

export type QueryParam = string | number | boolean | null;

export interface ScreenerCriteria {
    pe: number;
    pb: number;
    yield: number;
    rev: number;
    margin: number;
    eps: number;
    foreign: number;
    trust: number;
    [key: string]: number;
}

export type StrategyCategory = 'fundamental' | 'technical' | 'sentiment' | 'momentum' | 'custom';

export interface ScreenerFilterPayload {
    page?: number;
    limit?: number;
    strategyId?: string;
    pe?: { max?: number; min?: number };
    pb?: { max?: number; min?: number };
    dividendYield?: { max?: number; min?: number };
    revenueYoY?: { max?: number; min?: number };
    operatingMargin?: { max?: number; min?: number };
    eps?: { max?: number; min?: number };
    foreign?: { min?: number };
    trust?: { min?: number };
    [key: string]: string | number | boolean | object | undefined | null;
}

export interface PriceHistoryRecord {
    Date: string;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume: number;
    Turnover?: number;
    Change?: number;
    ChangePct?: number;
}

export interface ScreenerResult {
    symbol: string;
    name: string;
    sector: string | null;
    fundamentals: {
        pe: number;
        pb: number;
        dividendYield: number;
        revenueYoY: number;
        grossMargin: number;
        operatingMargin: number;
        netMargin: number;
        eps: number;
    };
    price: number;
    changePercent: number;
    volume: number;
    chips: {
        foreign: number;
        trust: number;
        dealer: number;
    };
    matchedStrategies?: string[];
}

export interface AiReportSection {
    title: string;
    content: string;
}

export interface SuggestedAlert {
    icon: string;
    insight: string;
    rule: string;
    action: string;
}

export interface Strategy {
    id: string;
    name: string;
    category: StrategyCategory;
    description: string;
    conditions: string[];
    icon: string;
    sql?: string;
}

export interface TwseStockSnapshot {
    Code: string;
    Name: string;
    TradeVolume: string;
    TradeValue: string;
    OpeningPrice: string;
    HighestPrice: string;
    LowestPrice: string;
    ClosingPrice: string;
    Change: string;
    Transaction: string;
}

export interface AiReportData {
    symbol: string;
    sentimentScore: number;
    reportSections: AiReportSection[];
    suggestedAlerts: SuggestedAlert[];
}

export interface MarginRecord {
    year: number;
    quarter: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
}

export interface HealthBadge {
    label: string;
    value: string;
    status: 'good' | 'warn' | 'normal';
}

export interface ValuationHistoryRecord {
    date: string;
    pe: number;
    pb: number;
    close: number;
    eps_proxy: number;
}

export interface SectorPerformance {
    name: string;
    change_pct: number;
    leader?: string;
}

export interface InstitutionalEntity {
    name: string;
    en: string;
    net: number;
    days: number;
    color: 'accent' | 'bullish' | 'warning';
    trend: number[];
}

export interface CandleData {
    o: number;
    c: number;
    h: number;
    l: number;
    vol: number;
    bull: boolean;
    date: string;
}
