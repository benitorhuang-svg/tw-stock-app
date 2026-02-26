import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public/data/stocks.db');
const schemaPath = path.join(process.cwd(), 'scripts/db/schema.sql');

console.log(`Applying schema from ${schemaPath} to ${dbPath}...`);

try {
    const db = new Database(dbPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon to execute one by one (optional, but cleaner for large schemas)
    // Actually better-sqlite3 exec behaves like a script
    db.exec(schema);

    console.log('Schema update successful.');
    db.close();
} catch (err) {
    console.error('Failed to update schema:', err);
    process.exit(1);
}
