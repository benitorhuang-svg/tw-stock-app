/**
 * twse-chips.mjs — Real TWSE Institutional Data Crawler
 * Fetches daily institutional trading data for all stocks.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const DB_PATH = path.join(DATA_DIR, 'stocks.db');
const CHIPS_DIR = path.join(DATA_DIR, 'chips');

const db = new Database(DB_PATH);

async function crawl(dateStr) {
    console.log(`\n🌐 Fetching TWSE Institutional Trading for ${dateStr}...`);
    const url = `https://www.twse.com.tw/fund/T86?response=json&date=${dateStr}&selectType=ALL`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const data = await response.json();

        if (!data || !data.data) {
            console.warn(`⚠️ No data found for ${dateStr}. Market might be closed.`);
            return;
        }

        const dbDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        const rows = data.data;

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO chips (symbol, date, foreign_inv, invest_trust, dealer)
            VALUES (?, ?, ?, ?, ?)
        `);

        console.log(`📊 Processing ${rows.length} stocks...`);

        const tx = db.transaction(data => {
            for (const row of data) {
                const symbol = row[0].trim();
                const foreign = parseInt(row[4].replace(/,/g, '')) || 0;
                const invest = parseInt(row[10].replace(/,/g, '')) || 0;
                const dealer = parseInt(row[11].replace(/,/g, '')) || 0;
                stmt.run(symbol, dbDate, foreign, invest, dealer);
            }
        });

        tx(rows);

        // Also save to JSON for manual rebuild persistence
        const chipsData = rows.map(r => ({
            symbol: r[0].trim(),
            foreign_inv: parseInt(r[4].replace(/,/g, '')) || 0,
            invest_trust: parseInt(r[10].replace(/,/g, '')) || 0,
            dealer: parseInt(r[11].replace(/,/g, '')) || 0,
        }));

        if (!fs.existsSync(CHIPS_DIR)) fs.mkdirSync(CHIPS_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(CHIPS_DIR, `${dbDate}.json`),
            JSON.stringify(chipsData, null, 2)
        );

        console.log(`✅ Synchronization complete for ${dbDate} (DB & JSON).`);
    } catch (err) {
        console.error(`❌ Fetch failed: ${err.message}`);
    }
}

const targetDate = process.argv[2] || new Date().toISOString().split('T')[0].replace(/-/g, '');
crawl(targetDate).then(() => db.close());
