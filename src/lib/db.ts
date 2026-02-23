import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'public/data/stocks.db');

let db: any = null;

export function getDb() {
    if (!db) {
        db = new Database(DB_PATH, {
            readonly: true
        });
        db.pragma('journal_mode = WAL');
    }
    return db;
}

export interface StockSummary {
    symbol: string;
    name: string;
    market: string;
    price: number;
    change: number;
    change_pct: number;
    volume: number;
    pe: number;
    pb: number;
    yield: number;
    roe: number;
    eps: number;
}

export interface FundamentalData {
    symbol: string;
    eps: number;
    gross_margin: number;
    operating_margin: number;
    net_margin: number;
    revenue_yoy: number;
}

export interface ChipData {
    symbol: string;
    date: string;
    foreign_inv: number;
    invest_trust: number;
    dealer: number;
}
