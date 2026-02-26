/**
 * SQLite Data Service
 * EXTREME OPTIMIZATION: Prepared Statement Caching, Aggressive WAL, MMAP Tuning
 * Performance Peak: Cache-size tuned for 64MB, Synchronization Off, MMAP 512MB
 */

import type BetterDatabase from 'better-sqlite3';

export interface Stock {
    symbol: string;
    name: string;
    market: string;
}

export interface StockWithPrice extends Stock {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
    pe: number;
    pb: number;
    yield: number;
}

let serverDb: BetterDatabase | null = null;
const stmtCache = new Map<string, BetterDatabase.Statement>();

async function getServerDb() {
    if (serverDb) return serverDb;
    try {
        const path = await import('path');
        const dbPath = path.join(process.cwd(), 'public/data/stocks.db');
        const Database = (await import('better-sqlite3')).default;

        serverDb = new Database(dbPath, { readonly: true });

        // Tuned for Read-Mostly Heavy Workloads
        serverDb.pragma('journal_mode = WAL');
        serverDb.pragma('synchronous = OFF');
        serverDb.pragma('cache_size = -64000'); // 64MB Cache
        serverDb.pragma('mmap_size = 536870912'); // 512MB Memory Mapping
        serverDb.pragma('temp_store = MEMORY');

        return serverDb;
    } catch (e) {
        console.error('[SQLite] Error loading DB:', e);
        return null;
    }
}

async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const db = await getServerDb();
    if (!db) return [];

    let stmt = stmtCache.get(sql);
    if (!stmt) {
        stmt = db.prepare(sql);
        stmtCache.set(sql, stmt);
    }
    return stmt.all(...params) as T[];
}

async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await query<T>(sql, params);
    return res[0] || null;
}

// ═══ PUBLIC API ═══

/**
 * Getting all stocks with prices (Optimized JOIN)
 */
export async function getAllStocksWithPrices(): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(`
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s LEFT JOIN latest_prices p ON s.symbol = p.symbol
        ORDER BY s.symbol
    `);
}

export async function getStock(symbol: string): Promise<StockWithPrice | null> {
    return queryOne<StockWithPrice>(
        `
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s LEFT JOIN latest_prices p ON s.symbol = p.symbol
        WHERE s.symbol = ?
    `,
        [symbol]
    );
}

export async function getTopGainers(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s JOIN latest_prices p ON s.symbol = p.symbol
        WHERE p.change_pct > 0 ORDER BY p.change_pct DESC LIMIT ?
    `,
        [limit]
    );
}

export async function getTopLosers(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s JOIN latest_prices p ON s.symbol = p.symbol
        WHERE p.change_pct < 0 ORDER BY p.change_pct ASC LIMIT ?
    `,
        [limit]
    );
}

export async function getTopByVolume(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s JOIN latest_prices p ON s.symbol = p.symbol
        ORDER BY p.volume DESC LIMIT ?
    `,
        [limit]
    );
}

export async function searchStocks(keyword: string, limit: number = 50): Promise<StockWithPrice[]> {
    const pattern = `%${keyword}%`;
    return query<StockWithPrice>(
        `
        SELECT s.symbol, s.name, s.market, p.date, p.open, p.high, p.low, p.close, p.volume, p.change, p.change_pct as changePct, p.pe, p.pb, p.yield
        FROM stocks s LEFT JOIN latest_prices p ON s.symbol = p.symbol
        WHERE s.symbol LIKE ? OR s.name LIKE ?
        ORDER BY s.symbol LIMIT ?
    `,
        [pattern, pattern, limit]
    );
}

export async function screenStocks(criteria: any): Promise<StockWithPrice[]> {
    // Basic implementation for safety - in real usage api/screener uses specialized executor
    return getAllStocksWithPrices();
}

export async function getDbStats() {
    // Parallelize pre-fetching
    const results = await Promise.all([
        queryOne<{ count: number }>('SELECT COUNT(*) as count FROM stocks'),
        queryOne<{ count: number }>('SELECT COUNT(*) as count FROM price_history'),
        queryOne<{ date: string }>('SELECT MAX(date) as date FROM latest_prices'),
    ]);
    return {
        stockCount: results[0]?.count || 0,
        historyRecordCount: results[1]?.count || 0,
        lastUpdateDate: results[2]?.date || 'N/A',
    };
}

export function isServer() {
    return typeof window === 'undefined';
}
