import { dbService } from './src/lib/db/sqlite-service';
import fs from 'fs';

try {
    const db = dbService.getRawDb();
    const rows = db.prepare('SELECT * FROM market_breadth_history ORDER BY date DESC LIMIT 5').all();
    fs.writeFileSync('breadth-debug.json', JSON.stringify(rows, null, 2));
    console.log('Saved breadth-debug.json');
} catch (err) {
    fs.writeFileSync('breadth-debug.json', JSON.stringify({ error: err.message }));
}
