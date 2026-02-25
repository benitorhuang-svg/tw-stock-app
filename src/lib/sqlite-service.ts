/**
 * SQLite Data Service
 *
 * 統一的資料存取層，支援：
 * - Server-side: 使用 better-sqlite3 (同步、高效能)
 * - Client-side: 使用 sql.js (WASM、離線支援)
 *
 * 自動判斷執行環境並使用適合的引擎
 */

import type BetterDatabase from 'better-sqlite3';
import type { Database as SqlJsDatabase } from 'sql.js';
import type { QueryParam } from '../types/stock';

// ============================================================================
// Types
// ============================================================================

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

export interface PriceRecord {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
}

export interface ScreenerCriteria {
    peMin?: number;
    peMax?: number;
    pbMin?: number;
    pbMax?: number;
    yieldMin?: number;
    yieldMax?: number;
    priceMin?: number;
    priceMax?: number;
    volumeMin?: number;
    changePctMin?: number;
    changePctMax?: number;
}

// ============================================================================
// Server-side SQLite (better-sqlite3)
// ============================================================================

let serverDb: BetterDatabase | null = null;
let serverDbAttempted = false;

async function getServerDb() {
    // 如果已經嘗試過且失敗，直接返回 null
    if (serverDbAttempted && !serverDb) return null;
    if (serverDb) return serverDb;

    serverDbAttempted = true;

    try {
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.join(process.cwd(), 'public/data/stocks.db');

        // 檢查資料庫檔案是否存在
        if (!fs.existsSync(dbPath)) {
            console.warn('[SQLite] Database not found. Run: npm run build:db');
            return null;
        }

        const Database = (await import('better-sqlite3')).default;
        serverDb = new Database(dbPath, { readonly: true });
        serverDb.pragma('cache_size = 10000');
        console.log('[SQLite] Server database loaded successfully');

        return serverDb;
    } catch (e) {
        console.error('[SQLite] Failed to load server database:', e);
        return null;
    }
}

// ============================================================================
// Client-side SQLite (sql.js WASM)
// ============================================================================

let clientDb: SqlJsDatabase | null = null;
let clientDbPromise: Promise<SqlJsDatabase | null> | null = null;

async function getClientDb() {
    if (clientDb) return clientDb;
    if (clientDbPromise) return clientDbPromise;

    clientDbPromise = (async () => {
        try {
            const initSqlJs = (await import('sql.js')).default;

            const SQL = await initSqlJs({
                // 使用 CDN 或本地 WASM
                locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
            });

            // 嘗試從 IndexedDB 載入快取的資料庫
            const cachedDb = await loadDbFromIndexedDB();
            if (cachedDb) {
                clientDb = new SQL.Database(cachedDb);
                console.log('[SQLite] Loaded from IndexedDB cache');
                return clientDb;
            }

            // 從 server 下載資料庫
            const response = await fetch('/data/stocks.db');
            if (!response.ok) throw new Error('Failed to fetch database');

            const buffer = await response.arrayBuffer();
            clientDb = new SQL.Database(new Uint8Array(buffer));

            // 快取到 IndexedDB
            await saveDbToIndexedDB(buffer);
            console.log('[SQLite] Downloaded and cached to IndexedDB');

            return clientDb;
        } catch (e) {
            console.error('Failed to load client SQLite:', e);
            clientDbPromise = null;
            return null;
        }
    })();

    return clientDbPromise;
}

// ============================================================================
// IndexedDB Cache for Client-side
// ============================================================================

const IDB_NAME = 'tw-stock-cache';
const IDB_STORE = 'databases';
const IDB_KEY = 'stocks.db';

async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise(resolve => {
        try {
            const request = indexedDB.open(IDB_NAME, 1);

            request.onerror = () => resolve(null);

            request.onupgradeneeded = event => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };

            request.onsuccess = event => {
                const db = (event.target as IDBOpenDBRequest).result;
                const tx = db.transaction(IDB_STORE, 'readonly');
                const store = tx.objectStore(IDB_STORE);
                const getRequest = store.get(IDB_KEY);

                getRequest.onsuccess = () => {
                    const data = getRequest.result;
                    resolve(data ? new Uint8Array(data) : null);
                };

                getRequest.onerror = () => resolve(null);
            };
        } catch (e) {
            resolve(null);
        }
    });
}

async function saveDbToIndexedDB(buffer: ArrayBuffer): Promise<void> {
    return new Promise(resolve => {
        try {
            const request = indexedDB.open(IDB_NAME, 1);

            request.onerror = () => resolve();

            request.onupgradeneeded = event => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };

            request.onsuccess = event => {
                const db = (event.target as IDBOpenDBRequest).result;
                const tx = db.transaction(IDB_STORE, 'readwrite');
                const store = tx.objectStore(IDB_STORE);
                store.put(buffer, IDB_KEY);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            };
        } catch (e) {
            resolve();
        }
    });
}

// ============================================================================
// Unified Query Interface
// ============================================================================

function isServer(): boolean {
    return typeof window === 'undefined';
}

async function query<T>(sql: string, params: QueryParam[] = []): Promise<T[]> {
    if (isServer()) {
        const db = await getServerDb();
        if (!db) return [];

        try {
            const stmt = db.prepare(sql);
            return stmt.all(...params) as T[];
        } catch (e) {
            console.error('[SQLite Server] Query error:', e);
            return [];
        }
    } else {
        const db = await getClientDb();
        if (!db) return [];

        try {
            const result = db.exec(sql, params);
            if (!result.length) return [];

            // 將 sql.js 結果轉換為物件陣列
            const columns = result[0].columns;
            return result[0].values.map((row: (number | string | Uint8Array | null)[]) => {
                const obj: Record<string, unknown> = {};
                columns.forEach((col: string, i: number) => {
                    obj[col] = row[i];
                });
                return obj as T;
            });
        } catch (e) {
            console.error('[SQLite Client] Query error:', e);
            return [];
        }
    }
}

async function queryOne<T>(sql: string, params: QueryParam[] = []): Promise<T | null> {
    const results = await query<T>(sql, params);
    return results[0] || null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 取得所有股票清單
 */
export async function getAllStocks(): Promise<Stock[]> {
    return query<Stock>('SELECT symbol, name, market FROM stocks ORDER BY symbol');
}

/**
 * 取得所有股票含最新價格
 */
export async function getAllStocksWithPrices(): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(`
        SELECT 
            s.symbol, s.name, s.market,
            COALESCE(p.date, '') as date,
            COALESCE(p.open, 0) as open,
            COALESCE(p.high, 0) as high,
            COALESCE(p.low, 0) as low,
            COALESCE(p.close, 0) as close,
            COALESCE(p.volume, 0) as volume,
            COALESCE(p.change, 0) as change,
            COALESCE(p.change_pct, 0) as changePct,
            COALESCE(p.pe, 0) as pe,
            COALESCE(p.pb, 0) as pb,
            COALESCE(p.yield, 0) as yield
        FROM stocks s
        LEFT JOIN latest_prices p ON s.symbol = p.symbol
        ORDER BY s.symbol
    `);
}

/**
 * 取得單一股票資訊
 */
export async function getStock(symbol: string): Promise<StockWithPrice | null> {
    return queryOne<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            COALESCE(p.date, '') as date,
            COALESCE(p.open, 0) as open,
            COALESCE(p.high, 0) as high,
            COALESCE(p.low, 0) as low,
            COALESCE(p.close, 0) as close,
            COALESCE(p.volume, 0) as volume,
            COALESCE(p.change, 0) as change,
            COALESCE(p.change_pct, 0) as changePct,
            COALESCE(p.pe, 0) as pe,
            COALESCE(p.pb, 0) as pb,
            COALESCE(p.yield, 0) as yield
        FROM stocks s
        LEFT JOIN latest_prices p ON s.symbol = p.symbol
        WHERE s.symbol = ?
    `,
        [symbol]
    );
}

/**
 * 取得股票歷史價格
 */
export async function getStockHistory(symbol: string, limit: number = 365): Promise<PriceRecord[]> {
    return query<PriceRecord>(
        `
        SELECT 
            date, open, high, low, close, volume, 
            change, change_pct as changePct
        FROM price_history
        WHERE symbol = ?
        ORDER BY date DESC
        LIMIT ?
    `,
        [symbol, limit]
    );
}

/**
 * 取得漲幅排行
 */
export async function getTopGainers(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            p.date, p.open, p.high, p.low, p.close, p.volume,
            p.change, p.change_pct as changePct,
            p.pe, p.pb, p.yield
        FROM stocks s
        JOIN latest_prices p ON s.symbol = p.symbol
        WHERE p.change_pct > 0
        ORDER BY p.change_pct DESC
        LIMIT ?
    `,
        [limit]
    );
}

/**
 * 取得跌幅排行
 */
export async function getTopLosers(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            p.date, p.open, p.high, p.low, p.close, p.volume,
            p.change, p.change_pct as changePct,
            p.pe, p.pb, p.yield
        FROM stocks s
        JOIN latest_prices p ON s.symbol = p.symbol
        WHERE p.change_pct < 0
        ORDER BY p.change_pct ASC
        LIMIT ?
    `,
        [limit]
    );
}

/**
 * 取得成交量排行
 */
export async function getTopByVolume(limit: number = 10): Promise<StockWithPrice[]> {
    return query<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            p.date, p.open, p.high, p.low, p.close, p.volume,
            p.change, p.change_pct as changePct,
            p.pe, p.pb, p.yield
        FROM stocks s
        JOIN latest_prices p ON s.symbol = p.symbol
        WHERE p.volume > 0
        ORDER BY p.volume DESC
        LIMIT ?
    `,
        [limit]
    );
}

/**
 * 搜尋股票
 */
export async function searchStocks(keyword: string, limit: number = 50): Promise<StockWithPrice[]> {
    const pattern = `%${keyword}%`;
    return query<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            COALESCE(p.date, '') as date,
            COALESCE(p.open, 0) as open,
            COALESCE(p.high, 0) as high,
            COALESCE(p.low, 0) as low,
            COALESCE(p.close, 0) as close,
            COALESCE(p.volume, 0) as volume,
            COALESCE(p.change, 0) as change,
            COALESCE(p.change_pct, 0) as changePct,
            COALESCE(p.pe, 0) as pe,
            COALESCE(p.pb, 0) as pb,
            COALESCE(p.yield, 0) as yield
        FROM stocks s
        LEFT JOIN latest_prices p ON s.symbol = p.symbol
        WHERE s.symbol LIKE ? OR s.name LIKE ?
        ORDER BY s.symbol
        LIMIT ?
    `,
        [pattern, pattern, limit]
    );
}

/**
 * 條件篩選股票 (選股器)
 */
export async function screenStocks(criteria: ScreenerCriteria): Promise<StockWithPrice[]> {
    const conditions: string[] = [];
    const params: QueryParam[] = [];

    if (criteria.peMin !== undefined) {
        conditions.push('p.pe >= ?');
        params.push(criteria.peMin);
    }
    if (criteria.peMax !== undefined) {
        conditions.push('p.pe <= ? AND p.pe > 0');
        params.push(criteria.peMax);
    }
    if (criteria.pbMin !== undefined) {
        conditions.push('p.pb >= ?');
        params.push(criteria.pbMin);
    }
    if (criteria.pbMax !== undefined) {
        conditions.push('p.pb <= ? AND p.pb > 0');
        params.push(criteria.pbMax);
    }
    if (criteria.yieldMin !== undefined) {
        conditions.push('p.yield >= ?');
        params.push(criteria.yieldMin);
    }
    if (criteria.yieldMax !== undefined) {
        conditions.push('p.yield <= ?');
        params.push(criteria.yieldMax);
    }
    if (criteria.priceMin !== undefined) {
        conditions.push('p.close >= ?');
        params.push(criteria.priceMin);
    }
    if (criteria.priceMax !== undefined) {
        conditions.push('p.close <= ?');
        params.push(criteria.priceMax);
    }
    if (criteria.volumeMin !== undefined) {
        conditions.push('p.volume >= ?');
        params.push(criteria.volumeMin);
    }
    if (criteria.changePctMin !== undefined) {
        conditions.push('p.change_pct >= ?');
        params.push(criteria.changePctMin);
    }
    if (criteria.changePctMax !== undefined) {
        conditions.push('p.change_pct <= ?');
        params.push(criteria.changePctMax);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return query<StockWithPrice>(
        `
        SELECT 
            s.symbol, s.name, s.market,
            p.date, p.open, p.high, p.low, p.close, p.volume,
            p.change, p.change_pct as changePct,
            p.pe, p.pb, p.yield
        FROM stocks s
        JOIN latest_prices p ON s.symbol = p.symbol
        ${whereClause}
        ORDER BY s.symbol
    `,
        params
    );
}

/**
 * 取得資料庫統計資訊
 */
export async function getDbStats(): Promise<{
    stockCount: number;
    historyRecordCount: number;
    lastUpdateDate: string;
}> {
    const stockCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM stocks');
    const historyCount = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM price_history'
    );
    const lastDate = await queryOne<{ date: string }>(
        'SELECT MAX(date) as date FROM latest_prices'
    );

    return {
        stockCount: stockCount?.count || 0,
        historyRecordCount: historyCount?.count || 0,
        lastUpdateDate: lastDate?.date || 'N/A',
    };
}

/**
 * 清除 Client 端 IndexedDB 快取
 */
export async function clearClientCache(): Promise<void> {
    if (isServer()) return;

    return new Promise(resolve => {
        const request = indexedDB.deleteDatabase(IDB_NAME);
        request.onsuccess = () => {
            clientDb = null;
            clientDbPromise = null;
            resolve();
        };
        request.onerror = () => resolve();
    });
}
