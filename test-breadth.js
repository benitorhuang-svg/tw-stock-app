import { dbService } from './src/lib/db/sqlite-service';

try {
    const db = dbService.getRawDb();
    const rows = db.prepare('SELECT count(*) as count FROM market_breadth_history').get();
    console.log('Breadth history count:', rows.count);

    const latest = db.prepare('SELECT * FROM market_breadth_history ORDER BY date DESC LIMIT 1').get();
    console.log('Latest breadth row:', latest);
} catch (err) {
    console.error('Error:', err);
}
