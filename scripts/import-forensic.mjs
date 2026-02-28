/**
 * import-forensic.mjs — Pro Forensic Data Importer
 * Imports all forensic datasets into SQLite.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'public', 'data', 'stocks.db');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data', 'chips');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

async function main() {
    console.log(`🚀 正在匯入多源鑑識資料至 ${DB_PATH}...`);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dbDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

    const importers = [
        {
            name: 'Shareholder Distribution (New JSON Array)',
            path: path.join(
                ROOT_DIR,
                'public',
                'data',
                'forensic',
                'shareholder_distribution.json'
            ),
            sql: `INSERT OR REPLACE INTO shareholder_distribution (symbol, date, total_shareholders, large_holder_400_ratio, large_holder_1000_ratio) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [
                i.symbol,
                i.date,
                i.total_shareholders,
                i.large_holder_400_ratio,
                i.large_holder_1000_ratio,
            ],
            isArray: true,
        },
        {
            name: 'Margin Short (New JSON Array)',
            path: path.join(ROOT_DIR, 'public', 'data', 'forensic', 'margin_short.json'),
            sql: `INSERT OR REPLACE INTO margin_short (symbol, date, margin_bal, margin_net, short_bal, short_net) VALUES (?, ?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, i.date, i.margin_bal, i.margin_net, i.short_bal, i.short_net],
            isArray: true,
        },
        {
            name: 'Shareholder Distribution',
            path: path.join(DATA_DIR, 'distribution', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO shareholder_distribution (symbol, date, total_shareholders, large_holder_400_ratio, large_holder_1000_ratio, small_holder_under_10_ratio, avg_shares_per_holder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            mapper: i => [
                i.symbol,
                dbDate,
                i.total_shareholders,
                i.large_holder_400_ratio,
                i.large_holder_1000_ratio,
                i.small_holder_under_10_ratio,
                i.avg_shares_per_holder,
            ],
        },
        {
            name: 'Government Chips',
            path: path.join(DATA_DIR, 'government', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO government_chips (symbol, date, net_buy_shares, net_buy_amount) VALUES (?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.net_buy_shares, i.net_buy_amount],
        },
        {
            name: 'Major Broker Chips',
            path: path.join(DATA_DIR, 'brokers', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO major_broker_chips (symbol, date, buy_top5_shares, sell_top5_shares, net_main_player_shares, concentration_ratio) VALUES (?, ?, ?, ?, ?, ?)`,
            mapper: i => [
                i.symbol,
                dbDate,
                i.buy_top5_shares,
                i.sell_top5_shares,
                i.net_main_player_shares,
                i.concentration_ratio,
            ],
        },
        {
            name: 'Security Lending',
            path: path.join(DATA_DIR, 'lending', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO security_lending (symbol, date, lending_balance, short_selling_balance, short_selling_limit) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.lending_balance, i.shorting_balance, i.limit],
        },
        {
            name: 'Director Holdings',
            path: path.join(DATA_DIR, 'director', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO director_holdings (symbol, date, director_holding_ratio, pawn_ratio, insider_net_change) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.ratio, i.pawn, i.change],
        },
        {
            name: 'Dealer Details',
            path: path.join(DATA_DIR, 'dealer_details', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO dealer_details (symbol, date, prop_buy, hedge_buy) VALUES (?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.prop, i.hedge],
        },
    ];

    for (const importer of importers) {
        if (fs.existsSync(importer.path)) {
            console.log(`📊 正在匯入 ${importer.name}（${dbDate}）...`);
            const data = JSON.parse(fs.readFileSync(importer.path, 'utf8'));
            const stmt = db.prepare(importer.sql);
            const batch = db.transaction(items => {
                const targetArray = importer.isArray
                    ? items
                    : Array.isArray(items)
                      ? items
                      : [items];
                for (const item of targetArray) {
                    try {
                        // Skip if mapper throws (e.g. data structure changed)
                        const args = importer.mapper(item);
                        stmt.run(...args);
                    } catch (e) {}
                }
            });
            batch(data);
            console.log(`✅ 已處理 ${Array.isArray(data) ? data.length : 1} 筆紀錄。`);
        } else {
            console.warn(`⚠️ 已跳過 ${importer.name}：檔案不存在。`);
        }
    }

    db.close();
    console.log('\n✨ 所有鑑識資料集已同步完成。');
}

main().catch(err => {
    console.error('❌ 匯入失敗：', err.message);
    process.exit(1);
});
