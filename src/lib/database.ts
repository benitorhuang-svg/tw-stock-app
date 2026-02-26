/**
 * SQLite 資料庫管理器
 * 使用 sql.js (SQLite WASM) + IndexedDB 持久化
 */

import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';

// 資料庫單例
let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

const DB_NAME = 'tw-stock-db';
const DB_STORE = 'sqlitedb';

export type SqlValue = string | number | boolean | null | Uint8Array;

/**
 * 初始化 SQL.js
 */
async function initSQL(): Promise<SqlJsStatic> {
    if (SQL) return SQL;

    SQL = await initSqlJs({
        // 載入 WASM 檔案
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    return SQL;
}

/**
 * 從 IndexedDB 載入資料庫
 */
async function loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(DB_STORE, 'readonly');
            const store = transaction.objectStore(DB_STORE);
            const getRequest = store.get('database');

            getRequest.onsuccess = () => {
                resolve(getRequest.result || null);
            };
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

/**
 * 儲存資料庫到 IndexedDB
 */
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(DB_STORE, 'readwrite');
            const store = transaction.objectStore(DB_STORE);
            const putRequest = store.put(data, 'database');

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };
    });
}

/**
 * 建立資料表 schema
 */
function createSchema(database: Database): void {
    // 股票基本資料
    database.run(`
        CREATE TABLE IF NOT EXISTS stocks (
            symbol TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            industry TEXT,
            market TEXT DEFAULT 'TSE',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 每日行情
    database.run(`
        CREATE TABLE IF NOT EXISTS daily_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            turnover INTEGER,
            UNIQUE(symbol, date),
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        )
    `);

    // 本益比/殖利率
    database.run(`
        CREATE TABLE IF NOT EXISTS fundamentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            pe REAL,
            pb REAL,
            dividend_yield REAL,
            eps REAL,
            roe REAL,
            UNIQUE(symbol, date),
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        )
    `);

    // 股利歷史
    database.run(`
        CREATE TABLE IF NOT EXISTS dividends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            year INTEGER NOT NULL,
            cash_dividend REAL DEFAULT 0,
            stock_dividend REAL DEFAULT 0,
            total_dividend REAL DEFAULT 0,
            UNIQUE(symbol, year),
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        )
    `);

    // 投資組合
    database.run(`
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            shares INTEGER NOT NULL,
            avg_cost REAL NOT NULL,
            buy_date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        )
    `);

    // 交易紀錄
    database.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
            shares INTEGER NOT NULL,
            price REAL NOT NULL,
            fee REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        )
    `);

    // 建立索引
    database.run(`CREATE INDEX IF NOT EXISTS idx_daily_prices_symbol ON daily_prices(symbol)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices(date)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON fundamentals(symbol)`);

    console.log('[DB] Schema created');
}

/**
 * 取得資料庫實例
 */
export async function getDatabase(): Promise<Database> {
    if (db) return db;

    const sql = await initSQL();

    // 嘗試從 IndexedDB 載入
    const savedData = await loadFromIndexedDB();

    if (savedData) {
        db = new sql.Database(savedData);
        console.log('[DB] Loaded from IndexedDB');
    } else {
        db = new sql.Database();
        createSchema(db);
        console.log('[DB] Created new database');
    }

    return db;
}

/**
 * 儲存資料庫
 */
export async function saveDatabase(): Promise<void> {
    if (!db) return;

    const data = db.export();
    await saveToIndexedDB(data);
    console.log('[DB] Saved to IndexedDB');
}

/**
 * 匯出資料庫為檔案
 */
export async function exportDatabase(): Promise<Blob> {
    const database = await getDatabase();
    const data = database.export();
    return new Blob([new Uint8Array(data)], { type: 'application/x-sqlite3' });
}

/**
 * 匯入資料庫檔案
 */
export async function importDatabase(file: File): Promise<void> {
    const sql = await initSQL();
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // 關閉現有資料庫
    if (db) {
        db.close();
    }

    db = new sql.Database(data);
    await saveDatabase();
    console.log('[DB] Imported from file');
}

/**
 * 執行 SQL 查詢
 */
export async function query<T = Record<string, SqlValue>>(
    sql: string,
    params: SqlValue[] = []
): Promise<T[]> {
    const database = await getDatabase();
    const result = database.exec(sql, params);

    if (result.length === 0) return [];

    const { columns, values } = result[0];
    return values.map(row => {
        const obj: Record<string, SqlValue> = {};
        columns.forEach((col, i) => {
            obj[col] = row[i] as SqlValue;
        });
        return obj as T;
    });
}

/**
 * 執行 SQL 命令（INSERT/UPDATE/DELETE）
 */
export async function execute(sql: string, params: SqlValue[] = []): Promise<number> {
    const database = await getDatabase();
    database.run(sql, params);

    // 自動儲存
    await saveDatabase();

    return database.getRowsModified();
}

/**
 * 批次插入
 */
export async function batchInsert(
    table: string,
    columns: string[],
    rows: SqlValue[][]
): Promise<void> {
    const database = await getDatabase();
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    const stmt = database.prepare(sql);

    for (const row of rows) {
        stmt.run(row);
    }

    stmt.free();
    await saveDatabase();

    console.log(`[DB] Inserted ${rows.length} rows into ${table}`);
}

/**
 * 清空資料庫
 */
export async function clearDatabase(): Promise<void> {
    if (db) {
        db.close();
        db = null;
    }

    // 刪除 IndexedDB
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 自動儲存（每 30 秒）
if (typeof window !== 'undefined') {
    setInterval(() => {
        if (db) {
            saveDatabase().catch(console.error);
        }
    }, 30000);

    // 頁面關閉前儲存
    window.addEventListener('beforeunload', () => {
        if (db) {
            try {
                saveDatabase().catch(() => {});
            } catch (e) {
                console.warn('[DB] Failed to save on unload');
            }
        }
    });
}
