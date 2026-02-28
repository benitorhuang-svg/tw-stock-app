/**
 * market.ts — Centralized definitions for Live Market Data
 */

export interface ProcessedStock {
    code: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    vol: number; // In K (thousand) shares
    open: number;
    high: number;
    low: number;
    ma5: number;
    ma20: number;
    rsi: number;
    avgVol: number;
    isStarred: boolean;
    sector?: string;
    _market?: string;
    // For visual feedback
    lastUpdate?: number;
    priceStatus?: 'up' | 'down' | 'flat';
}

export interface MarketBreadth {
    up: number;
    down: number;
    flat: number;
    total: number;
}

export interface InstitutionalData {
    symbol: string;
    name: string;
    foreignStreak: number;
    investStreak: number;
    dealerStreak: number;
    changePct: number;
    volume: number;
    turnover: number;
    chipsIntensity: number;
    latest: Record<string, number>;
    // Forensic Expansion
    shareholderDist?: {
        total: number;
        large1000: number; // 1000+ shares ratio (%)
        small10: number; // <10 shares ratio (%)
    };
    government?: {
        netBuy: number; // Shares
        netAmount: number; // K
    };
    brokerChip?: {
        concentration: number; // %
        netNet: number; // (Top5 Buy - Top5 Sell)
    };
    director?: {
        ratio: number;
        pawn: number;
        change: number;
    };
    lending?: {
        balance: number;
        shorting: number;
    };
    dealerDet?: {
        prop: number;
        hedge: number;
    };
}

export interface InstitutionalSummary {
    foreign: number;
    invest: number;
    dealer: number;
    total: number;
    // Forensic Summary
    govTotalAmount?: number; // Total Gov Banks Net Amount
    avgConcentration?: number;
}

export interface MarketStoreState {
    stocks: ProcessedStock[];
    institutional: {
        foreign: InstitutionalData[];
        invest: InstitutionalData[];
        dealer: InstitutionalData[];
        summary: InstitutionalSummary;
        trend: { date: string; f: number; i: number; d: number; avgChg: number }[];
        date?: string;
        forensicAlpha?: {
            highConcentration: InstitutionalData[];
            govSupport: InstitutionalData[];
            mainAccumulation: InstitutionalData[];
            insider: InstitutionalData[];
            shorting: InstitutionalData[];
        };
        forensicSignals?: Record<string, unknown>[];
    };
    breadth: MarketBreadth;
    lastUpdateTime: string;
    isLoading: boolean;
    isInstLoading: boolean;
    error: string | null;
}
