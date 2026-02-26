import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'public/data/stocks.db');
const db = new Database(DB_PATH);

const queries = [
    {
        name: 'shareholder_distribution',
        sql: `INSERT OR REPLACE INTO shareholder_distribution (symbol, date, total_shareholders, large_holder_400_ratio, large_holder_1000_ratio, small_holder_under_10_ratio, avg_shares_per_holder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    },
    {
        name: 'government_chips',
        sql: `INSERT OR REPLACE INTO government_chips (symbol, date, net_buy_shares, net_buy_amount) VALUES (?, ?, ?, ?)`,
    },
    {
        name: 'major_broker_chips',
        sql: `INSERT OR REPLACE INTO major_broker_chips (symbol, date, buy_top5_shares, sell_top5_shares, net_main_player_shares, concentration_ratio) VALUES (?, ?, ?, ?, ?, ?)`,
    },
];

for (const q of queries) {
    try {
        db.prepare(q.sql);
        console.log(`✅ OK: ${q.name}`);
    } catch (e) {
        console.error(`❌ FAIL: ${q.name} - ${e.message}`);
    }
}

db.close();
