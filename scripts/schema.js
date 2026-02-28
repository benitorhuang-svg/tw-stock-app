import Database from 'better-sqlite3';
const db = new Database('public/data/stocks.db', { readonly: true });
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
    if (table.sql) {
        console.log(`-- Table: ${table.name} --`);
        console.log(table.sql);
        console.log();
    }
}
