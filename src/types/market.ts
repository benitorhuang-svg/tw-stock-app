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
}

export interface MarketStoreState {
    stocks: ProcessedStock[];
    institutional: {
        foreign: InstitutionalData[];
        invest: InstitutionalData[];
        dealer: InstitutionalData[];
    };
    breadth: MarketBreadth;
    lastUpdateTime: string;
    isLoading: boolean;
    isInstLoading: boolean;
    error: string | null;
}
