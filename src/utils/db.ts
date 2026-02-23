import Database from 'better-sqlite3';
import path from 'path';

let db: Database | null = null;

export function getDb() {
    if (db) return db;

    const dbPath = path.join(process.cwd(), 'public/data/stocks.db');

    try {
        db = new Database(dbPath, { readonly: true });
        db.pragma('journal_mode = WAL');
        return db;
    } catch (err) {
        console.error('Failed to open database:', err);
        throw err;
    }
}

export function queryStocks(sql: string, params: any[] = []) {
    const database = getDb();
    return database.prepare(sql).all(params);
}

export function getStock(symbol: string) {
    const database = getDb();
    return database.prepare('SELECT * FROM latest_prices WHERE symbol = ?').get(symbol);
}
