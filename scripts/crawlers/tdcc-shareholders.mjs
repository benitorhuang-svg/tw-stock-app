/**
 * tdcc-shareholders.mjs — Real TDCC Shareholder Distribution Crawler
 * Fetches weekly shareholder distribution data from TDCC Open Data.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const DB_PATH = path.join(DATA_DIR, 'stocks.db');
const FORENSIC_DIR = path.join(DATA_DIR, 'forensic');

const db = new Database(DB_PATH);

async function crawl() {
    console.log(`\n🌐 正在抓取集保週報股權分散表（CSV）...`);
    const csvUrl = `https://opendata.tdcc.com.tw/getOD.ashx?id=1-5`;

    try {
        const response = await fetch(csvUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const csvText = await response.text();
        const lines = csvText.split('\n');

        // Skip header
        const rows = lines.slice(1);
        const latestDate = rows[0].split(',')[0].trim();
        const dbDate = `${latestDate.slice(0, 4)}-${latestDate.slice(4, 6)}-${latestDate.slice(6, 8)}`;

        console.log(`🚀 正在處理 ${rows.length} 筆紀錄（${dbDate}）...`);

        // Group by symbol to calculate 400/1000 ratios
        const stats = new Map();

        for (const line of rows) {
            const cols = line.split(',');
            if (cols.length < 5) continue;

            const symbol = cols[1].trim();
            const level = parseInt(cols[2].trim());
            const count = parseInt(cols[3].trim()) || 0;
            const shares = parseInt(cols[4].trim()) || 0;

            if (!stats.has(symbol)) {
                stats.set(symbol, { totalShares: 0, l400: 0, l1000: 0, shareholders: 0 });
            }

            const s = stats.get(symbol);
            s.totalShares += shares;
            s.shareholders += count;

            if (level >= 10 && level <= 15) s.l400 += shares;
            if (level === 15) s.l1000 += shares;
        }

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO shareholder_distribution (symbol, date, total_shareholders, large_holder_400_ratio, large_holder_1000_ratio)
            VALUES (?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(data => {
            for (const [symbol, s] of data) {
                const r400 = (s.l400 / s.totalShares) * 100 || 0;
                const r1000 = (s.l1000 / s.totalShares) * 100 || 0;
                stmt.run(symbol, dbDate, s.shareholders, r400, r1000);
            }
        });

        tx([...stats.entries()]);

        // Also save to JSON for manual rebuild persistence
        const result = [...stats.entries()].map(([symbol, s]) => ({
            symbol,
            date: dbDate,
            total_shareholders: s.shareholders,
            large_holder_400_ratio: (s.l400 / s.totalShares) * 100 || 0,
            large_holder_1000_ratio: (s.l1000 / s.totalShares) * 100 || 0,
        }));

        if (!fs.existsSync(FORENSIC_DIR)) fs.mkdirSync(FORENSIC_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(FORENSIC_DIR, 'shareholder_distribution.json'),
            JSON.stringify(result, null, 2)
        );

        console.log(`✅ 週報股權分散表同步完成（DB & JSON）。`);
    } catch (err) {
        console.error(`❌ 抓取失敗：${err.message}`);
    }
}

crawl().then(() => db.close());
