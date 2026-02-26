import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'public', 'data', 'stocks.db');
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

function inspect(table) {
    console.log(`--- Table: ${table} ---`);
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    console.log('Columns:', JSON.stringify(columns, null, 2));
}

inspect('valuation_history');
db.close();
