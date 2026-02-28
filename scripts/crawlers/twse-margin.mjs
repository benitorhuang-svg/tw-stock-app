/**
 * twse-margin.mjs — TWSE Margin Trading & Short Selling Crawler
 * Fetches daily margin balance and short selling data.
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

async function crawl(dateStr) {
    console.log(`\n🌐 正在抓取 TWSE 融資融券日報（${dateStr}）...`);
    // Example date: 20260225
    const url = `https://www.twse.com.tw/exchangeReport/MI_MARGN?response=json&date=${dateStr}&selectType=ALL`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const data = await response.json();
        console.log(`📡 API 回應狀態：${data.stat}`);

        let rows = data.data; // Traditional format
        if (!rows && data.tables) {
            console.log('📡 發現資料表：', data.tables.map(t => t.title).join(' | '));
            const stockTable = data.tables.find(t => t.title.includes('融資融券'));
            if (stockTable) rows = stockTable.data;
        }

        if (!rows) {
            console.warn(`⚠️ 查無 ${dateStr} 明細資料，API 回應狀態：${data.stat}`);
            return;
        }

        const dbDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

        // Ensure table exists (as a fallback)
        db.exec(`
            CREATE TABLE IF NOT EXISTS margin_short (
                symbol TEXT NOT NULL,
                date TEXT NOT NULL,
                margin_bal INTEGER,
                margin_net INTEGER,
                short_bal INTEGER,
                short_net INTEGER,
                PRIMARY KEY (symbol, date)
            )
        `);

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO margin_short (symbol, date, margin_bal, margin_net, short_bal, short_net)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        console.log(`📊 正在處理 ${rows.length} 筆融資融券紀錄...`);

        const marginData = [];
        const tx = db.transaction(data => {
            for (const row of data) {
                const symbol = row[0].trim();
                const marginBal = parseInt(row[6].replace(/,/g, '')) || 0;
                const marginPrev = parseInt(row[5].replace(/,/g, '')) || 0;
                const marginNet = marginBal - marginPrev;

                const shortBal = parseInt(row[12].replace(/,/g, '')) || 0;
                const shortPrev = parseInt(row[11].replace(/,/g, '')) || 0;
                const shortNet = shortBal - shortPrev;

                stmt.run(symbol, dbDate, marginBal, marginNet, shortBal, shortNet);

                marginData.push({
                    symbol,
                    date: dbDate,
                    margin_bal: marginBal,
                    margin_net: marginNet,
                    short_bal: shortBal,
                    short_net: shortNet,
                });
            }
        });

        tx(rows);

        // Save to JSON for forensic persistence
        if (!fs.existsSync(FORENSIC_DIR)) fs.mkdirSync(FORENSIC_DIR, { recursive: true });
        const marginPath = path.join(FORENSIC_DIR, 'margin_short.json');

        // Load existing or start new
        let existing = [];
        if (fs.existsSync(marginPath)) {
            existing = JSON.parse(fs.readFileSync(marginPath, 'utf8'));
        }

        // Merge with new data (simplistic approach: filter out same date)
        const filtered = existing.filter(r => r.date !== dbDate);
        const merged = [...filtered, ...marginData].slice(-5000); // Keep reasonable size

        fs.writeFileSync(marginPath, JSON.stringify(merged, null, 2));

        console.log(`✅ ${dbDate} 融資融券資料同步完成。`);
    } catch (err) {
        console.error(`❌ 融資融券抓取失敗：${err.message}`);
    }
}

const targetDate = process.argv[2] || new Date().toISOString().split('T')[0].replace(/-/g, '');
crawl(targetDate).then(() => db.close());
