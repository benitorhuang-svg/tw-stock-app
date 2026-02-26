import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public/data/stocks.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

for (const table of tables) {
    console.log(`\n--- Schema for ${table.name} ---`);
    const info = db.prepare(`PRAGMA table_info("${table.name}")`).all();
    console.log(info);
}

db.close();
