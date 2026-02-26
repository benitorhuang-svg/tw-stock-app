const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'public', 'data', 'stocks.db');
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map(t => t.name);
console.log(JSON.stringify(tables, null, 2));
db.close();
