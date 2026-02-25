/**
 * Database Table Interfaces & General Models
 */

export interface Stock {
    symbol: string;
    name: string;
    industry?: string | null;
    market?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DailyPrice {
    id?: number;
    symbol: string;
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
    turnover?: number | null;
    change_rate?: number | null;
}

export interface Fundamental {
    id?: number;
    symbol: string;
    date: string;
    pe: number | null;
    pb: number | null;
    dividend_yield: number | null;
    eps: number | null;
    roe: number | null;
}

export interface Dividend {
    id?: number;
    symbol: string;
    year: number;
    cash_dividend: number;
    stock_dividend: number;
    total_dividend: number;
}

export interface PortfolioItem {
    id?: number;
    symbol: string;
    shares: number;
    avg_cost: number;
    buy_date?: string | null;
    notes?: string | null;
    created_at?: string;
}

export interface Transaction {
    id?: number;
    symbol: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    fee?: number;
    tax?: number;
    date: string;
    notes?: string | null;
    created_at?: string;
}
