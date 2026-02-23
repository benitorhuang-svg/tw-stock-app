/**
 * 取得上市公司月報 (P/E, 殖利率, 股淨比)
 *
 * 來源: TWSE (index04 數據)
 * 輸出: public/data/monthly_stats.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'monthly_stats.json');

const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            clearTimeout(timeout);
            if (res.ok) return await res.json();
            console.warn(`   ⚠️ HTTP ${res.status}, 重試 ${i + 1}/${retries}`);
        } catch (e) {
            clearTimeout(timeout);
            console.warn(`   ⚠️ Error: ${e.message}, 重試 ${i + 1}/${retries}`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return null;
}

async function main() {
    const now = new Date();
    // 獲取最近一個工作日的資料 (通常是昨天)
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    console.log(`📥 開始抓取 ${dateStr} 上市公司月報統計 (P/E, Yield)...`);

    const url = `https://www.twse.com.tw/exchangeReport/BWIBBU_ALL?response=json&date=${dateStr}`;
    const data = await fetchWithRetry(url);

    if (!data || data.stat !== 'OK' || !data.data) {
        console.error('   ❌ 無資料或非交易日');
        return;
    }

    // 格式: 股票代號, 股票名稱, 本益比, 殖利率(%), 股價淨值比
    const stats = data.data.map(row => ({
        symbol: row[0],
        name: row[1],
        peRatio: parseFloat(row[2]) || 0,
        dividendYield: parseFloat(row[3]) || 0,
        pbRatio: parseFloat(row[4]) || 0,
    }));

    if (!fs.existsSync(path.dirname(OUTPUT_FILE)))
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2), 'utf-8');

    console.log(`\n✅ 已儲存 ${stats.length} 檔股票統計至 monthly_stats.json`);
}

main().catch(console.error);
