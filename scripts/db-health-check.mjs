import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('public/data/stocks.db');
const db = new Database(dbPath, { readonly: true });

const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();

console.log('--- Database Health Check ---');
for (const t of tables) {
    try {
        const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get().count;
        console.log(`${t.name.padEnd(25)}: ${count} records`);
    } catch (e) {
        console.log(`${t.name.padEnd(25)}: ERROR (${e.message})`);
    }
}
db.close();
